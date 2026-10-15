-- StageFlow 초기 스키마
-- 설계: README 2장(행사 진행 단계), 5장(참가 신청과 수정 PIN), 7장(데이터 모델)
--
-- 원칙
--   - 참가자(anon)는 공개 데이터 읽기만 한다. 쓰기는 모두 서버(service_role)가 아래 PIN 함수로 한다.
--   - 관리자는 admins 테이블에 등록된 Supabase Auth 사용자다. RLS로 쓰기를 허용한다.
--   - PIN 해시는 submission_secrets에만 있고, anon · authenticated는 이 테이블에 접근할 수 없다.

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- 타입
-- ─────────────────────────────────────────────────────────────

create type public.event_status as enum (
  'DRAFT',      -- 준비 (링크 공유 전)
  'OPEN',       -- 모집 중
  'CLOSED',     -- 모집 마감 (편성 중)
  'PUBLISHED',  -- 순서 공개
  'LIVE',       -- 공연 중
  'ENCORE',     -- 앵콜
  'ENDED'       -- 종료
);

create type public.entry_status as enum (
  'SUBMITTED',  -- 제출됨, 순서 미편성
  'SCHEDULED',  -- 순서에 배치됨, 대기 중
  'PERFORMING', -- 현재 공연 중
  'COMPLETED',  -- 공연 완료
  'CANCELLED'   -- 참가 취소
);

-- ─────────────────────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────────────────────

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 100),
  event_date  date not null,
  venue       text check (venue is null or char_length(venue) <= 100),
  public_code text not null unique
              default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
              check (public_code ~ '^[A-Za-z0-9_-]{4,32}$'),
  status      public.event_status not null default 'DRAFT',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 한 번에 낸 신청 묶음. 공연자와 PIN의 단위.
create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  performer_names text[] not null
                  check (cardinality(performer_names) between 1 and 10),
  is_encore       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- performance_entries가 행사 · 앵콜 여부까지 함께 참조하도록
  unique (id, event_id, is_encore)
);

create index submissions_event_id_idx on public.submissions (event_id);

-- 신청 안의 곡 하나 = 공연 순서의 한 칸.
-- event_id · is_encore는 submissions와 같은 값이어야 하며, 복합 FK로 보장한다.
create table public.performance_entries (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null,
  submission_id uuid not null,
  is_encore     boolean not null default false,
  artist        text not null check (char_length(btrim(artist)) between 1 and 100),
  song_title    text not null check (char_length(btrim(song_title)) between 1 and 100),
  order_index   integer check (order_index > 0),
  status        public.entry_status not null default 'SUBMITTED',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (submission_id, event_id, is_encore)
    references public.submissions (id, event_id, is_encore) on delete cascade,
  -- 본 공연과 앵콜은 각각 01부터 번호를 매긴다. 재정렬 중 잠깐 겹칠 수 있도록 지연 가능.
  constraint performance_entries_order_unique
    unique (event_id, is_encore, order_index) deferrable initially immediate
);

create index performance_entries_event_id_idx on public.performance_entries (event_id);
create index performance_entries_submission_id_idx on public.performance_entries (submission_id);

-- 한 행사에서 동시에 공연 중인 곡은 하나뿐
create unique index performance_entries_one_performing
  on public.performance_entries (event_id) where status = 'PERFORMING';

-- PIN 해시 전용. RLS 정책을 두지 않아 anon · authenticated는 읽을 수 없다.
-- 관리자가 직접 추가한 신청은 PIN이 없으므로 행이 없을 수 있다.
create table public.submission_secrets (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  edit_pin_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- updated_at
-- ─────────────────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger submissions_set_updated_at before update on public.submissions
  for each row execute function public.set_updated_at();
create trigger performance_entries_set_updated_at before update on public.performance_entries
  for each row execute function public.set_updated_at();
create trigger submission_secrets_set_updated_at before update on public.submission_secrets
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 행사 단계 규칙: 앵콜은 본 공연이 모두 끝나야 열 수 있다
-- ─────────────────────────────────────────────────────────────

create function public.check_event_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'ENCORE' and old.status is distinct from 'ENCORE' then
    if exists (
      select 1 from public.performance_entries e
      where e.event_id = new.id
        and not e.is_encore
        and e.status not in ('COMPLETED', 'CANCELLED')
    ) then
      raise exception 'MAIN_SET_NOT_FINISHED' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger events_check_status_change before update of status on public.events
  for each row execute function public.check_event_status_change();

-- ─────────────────────────────────────────────────────────────
-- 관리자 판별
-- ─────────────────────────────────────────────────────────────

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table public.admins enable row level security;
alter table public.events enable row level security;
alter table public.submissions enable row level security;
alter table public.performance_entries enable row level security;
alter table public.submission_secrets enable row level security;

-- admins: 로그인한 사용자는 자기가 관리자인지만 확인할 수 있다
create policy "admins: read own row" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- events: 준비(DRAFT) 단계가 아니면 누구나 읽기, 쓰기는 관리자
create policy "events: public read" on public.events
  for select to anon, authenticated
  using (status <> 'DRAFT' or public.is_admin());

create policy "events: admin write" on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- submissions: 공개된 행사의 신청은 누구나 읽기, 쓰기는 관리자
create policy "submissions: public read" on public.submissions
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.events ev where ev.id = event_id and ev.status <> 'DRAFT')
  );

create policy "submissions: admin write" on public.submissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- performance_entries: 공개된 행사의 엔트리는 누구나 읽기, 쓰기는 관리자
create policy "performance_entries: public read" on public.performance_entries
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.events ev where ev.id = event_id and ev.status <> 'DRAFT')
  );

create policy "performance_entries: admin write" on public.performance_entries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- submission_secrets: 정책 없음 + 권한 회수 → service_role(서버)만 접근
revoke all on public.submission_secrets from anon, authenticated;

-- 참가자는 테이블에 직접 쓰지 않는다
revoke insert, update, delete on public.events, public.submissions, public.performance_entries
  from anon;

-- ─────────────────────────────────────────────────────────────
-- Realtime: 참가자 화면이 구독하는 테이블
-- ─────────────────────────────────────────────────────────────

alter publication supabase_realtime
  add table public.events, public.submissions, public.performance_entries;

-- ─────────────────────────────────────────────────────────────
-- 참가자 신청 · 수정 · 삭제 (서버 전용)
--
-- Next.js 서버가 service_role로 호출한다. 검증 실패 시 아래 코드로 예외를 던진다.
--   EVENT_NOT_FOUND · SUBMISSION_NOT_FOUND · SUBMISSION_CLOSED · NOT_EDITABLE
--   INVALID_PIN · INVALID_INPUT
-- ─────────────────────────────────────────────────────────────

create function public._normalize_performers(p_names text[])
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_names text[];
begin
  select coalesce(array_agg(btrim(n) order by ord), '{}')
    into v_names
    from unnest(p_names) with ordinality as t(n, ord)
   where btrim(coalesce(n, '')) <> '';

  if cardinality(v_names) not between 1 and 10
     or exists (select 1 from unnest(v_names) n where char_length(n) > 30) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', detail = 'performers';
  end if;
  return v_names;
end;
$$;

-- p_songs: [{"artist": "...", "title": "..."}, ...]
create function public._validate_songs(p_songs jsonb, p_max integer)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(p_songs) is distinct from 'array'
     or jsonb_array_length(p_songs) not between 1 and p_max
     or exists (
       select 1 from jsonb_array_elements(p_songs) s
       where char_length(btrim(coalesce(s ->> 'artist', ''))) not between 1 and 100
          or char_length(btrim(coalesce(s ->> 'title', ''))) not between 1 and 100
     ) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', detail = 'songs';
  end if;
end;
$$;

create function public._assert_pin_format(p_pin text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', detail = 'pin';
  end if;
end;
$$;

-- PIN이 맞으면 신청과 행사를 잠근 채 돌려준다
create function public._lock_submission_with_pin(p_submission_id uuid, p_pin text)
returns table (submission_id uuid, event_id uuid, is_encore boolean, event_status public.event_status)
language plpgsql
set search_path = ''
as $$
declare
  v_hash text;
begin
  select s.id, s.event_id, s.is_encore, ev.status
    into submission_id, event_id, is_encore, event_status
    from public.submissions s
    join public.events ev on ev.id = s.event_id
   where s.id = p_submission_id
     for update of ev, s;

  if not found then
    raise exception 'SUBMISSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select edit_pin_hash into v_hash
    from public.submission_secrets
   where submission_secrets.submission_id = p_submission_id;

  if v_hash is null or p_pin is null or v_hash <> extensions.crypt(p_pin, v_hash) then
    raise exception 'INVALID_PIN' using errcode = 'P0001';
  end if;

  return next;
end;
$$;

-- 지금 이 신청을 참가자가 고칠 수 있는가
--   본 공연: 행사가 OPEN
--   앵콜:    행사가 ENCORE이고, 곡의 차례가 아직 시작되지 않음
create function public._assert_editable(p_submission_id uuid, p_is_encore boolean, p_status public.event_status)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not p_is_encore and p_status <> 'OPEN' then
    raise exception 'NOT_EDITABLE' using errcode = 'P0001';
  end if;

  if p_is_encore and (
    p_status <> 'ENCORE'
    or exists (
      select 1 from public.performance_entries e
      where e.submission_id = p_submission_id and e.status <> 'SCHEDULED'
    )
  ) then
    raise exception 'NOT_EDITABLE' using errcode = 'P0001';
  end if;
end;
$$;

-- 신청: OPEN이면 본 공연(여러 곡), ENCORE면 앵콜(한 곡, 선착순 자동 배정)
create function public.create_submission(
  p_public_code text,
  p_performers  text[],
  p_songs       jsonb,
  p_pin         text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event         public.events%rowtype;
  v_is_encore     boolean;
  v_performers    text[];
  v_submission_id uuid;
  v_next_order    integer;
begin
  -- 앵콜 선착순 번호가 겹치지 않도록 행사 단위로 직렬화
  select * into v_event from public.events where public_code = p_public_code for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_event.status = 'OPEN' then
    v_is_encore := false;
  elsif v_event.status = 'ENCORE' then
    v_is_encore := true;
  else
    raise exception 'SUBMISSION_CLOSED' using errcode = 'P0001';
  end if;

  v_performers := public._normalize_performers(p_performers);
  perform public._validate_songs(p_songs, case when v_is_encore then 1 else 10 end);
  perform public._assert_pin_format(p_pin);

  insert into public.submissions (event_id, performer_names, is_encore)
  values (v_event.id, v_performers, v_is_encore)
  returning id into v_submission_id;

  if v_is_encore then
    select coalesce(max(order_index), 0) + 1 into v_next_order
      from public.performance_entries
     where event_id = v_event.id and is_encore;
  end if;

  insert into public.performance_entries
    (event_id, submission_id, is_encore, artist, song_title, order_index, status)
  select v_event.id, v_submission_id, v_is_encore,
         btrim(s ->> 'artist'), btrim(s ->> 'title'),
         case when v_is_encore then v_next_order end,
         case when v_is_encore then 'SCHEDULED'::public.entry_status
              else 'SUBMITTED'::public.entry_status end
    from jsonb_array_elements(p_songs) with ordinality as t(s, ord)
   order by ord;

  insert into public.submission_secrets (submission_id, edit_pin_hash)
  values (v_submission_id, extensions.crypt(p_pin, extensions.gen_salt('bf', 8)));

  return v_submission_id;
end;
$$;

-- 수정 화면에 들어가기 전 PIN 확인. 수정 가능한 때가 아니면 NOT_EDITABLE.
create function public.verify_submission_pin(p_submission_id uuid, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from public._lock_submission_with_pin(p_submission_id, p_pin);
  perform public._assert_editable(v.submission_id, v.is_encore, v.event_status);
  return true;
end;
$$;

-- 수정: 공연자와 곡을 바꾼다.
--   본 공연: 곡 목록을 통째로 바꾼다 (OPEN 단계라 순서가 아직 없음)
--   앵콜:    곡 하나의 내용만 바꾸고 선착순 번호는 그대로 둔다
create function public.update_submission(
  p_submission_id uuid,
  p_pin           text,
  p_performers    text[],
  p_songs         jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v          record;
  v_performers text[];
begin
  select * into v from public._lock_submission_with_pin(p_submission_id, p_pin);
  perform public._assert_editable(v.submission_id, v.is_encore, v.event_status);

  v_performers := public._normalize_performers(p_performers);
  perform public._validate_songs(p_songs, case when v.is_encore then 1 else 10 end);

  update public.submissions set performer_names = v_performers where id = v.submission_id;

  if v.is_encore then
    update public.performance_entries
       set artist = btrim(p_songs -> 0 ->> 'artist'),
           song_title = btrim(p_songs -> 0 ->> 'title')
     where submission_id = v.submission_id;
  else
    delete from public.performance_entries where submission_id = v.submission_id;
    insert into public.performance_entries
      (event_id, submission_id, is_encore, artist, song_title)
    select v.event_id, v.submission_id, false, btrim(s ->> 'artist'), btrim(s ->> 'title')
      from jsonb_array_elements(p_songs) with ordinality as t(s, ord)
     order by ord;
  end if;
end;
$$;

-- 삭제 (본 공연 신청 삭제 · 앵콜 신청 취소)
create function public.delete_submission(p_submission_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from public._lock_submission_with_pin(p_submission_id, p_pin);
  perform public._assert_editable(v.submission_id, v.is_encore, v.event_status);
  delete from public.submissions where id = v.submission_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 관리자: 순서 재정렬
--
-- p_entry_ids 순서대로 01, 02, …를 매긴다. 목록에 없는 엔트리는 순서에서 빠진다
-- (order_index = null, SCHEDULED였다면 SUBMITTED로).
-- ─────────────────────────────────────────────────────────────

create function public.reorder_entries(p_event_id uuid, p_is_encore boolean, p_entry_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if exists (
    select 1 from unnest(p_entry_ids) as t(id)
    where not exists (
      select 1 from public.performance_entries e
      where e.id = t.id and e.event_id = p_event_id and e.is_encore = p_is_encore
    )
  ) or cardinality(p_entry_ids) <> (select count(distinct x) from unnest(p_entry_ids) x) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', detail = 'entry_ids';
  end if;

  set constraints public.performance_entries_order_unique deferred;

  update public.performance_entries
     set order_index = null,
         status = case when status = 'SCHEDULED' then 'SUBMITTED'::public.entry_status else status end
   where event_id = p_event_id and is_encore = p_is_encore
     and not (id = any (p_entry_ids));

  update public.performance_entries e
     set order_index = t.ord,
         status = case when e.status = 'SUBMITTED' then 'SCHEDULED'::public.entry_status else e.status end
    from unnest(p_entry_ids) with ordinality as t(id, ord)
   where e.id = t.id;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 함수 실행 권한
-- ─────────────────────────────────────────────────────────────

revoke execute on function
  public._normalize_performers(text[]),
  public._validate_songs(jsonb, integer),
  public._assert_pin_format(text),
  public._lock_submission_with_pin(uuid, text),
  public._assert_editable(uuid, boolean, public.event_status),
  public.create_submission(text, text[], jsonb, text),
  public.verify_submission_pin(uuid, text),
  public.update_submission(uuid, text, text[], jsonb),
  public.delete_submission(uuid, text),
  public.reorder_entries(uuid, boolean, uuid[])
from public, anon, authenticated;

-- 참가자 함수는 서버(service_role)만
grant execute on function
  public.create_submission(text, text[], jsonb, text),
  public.verify_submission_pin(uuid, text),
  public.update_submission(uuid, text, text[], jsonb),
  public.delete_submission(uuid, text)
to service_role;

-- 재정렬은 로그인한 관리자 (함수 안에서 is_admin 확인)
grant execute on function public.reorder_entries(uuid, boolean, uuid[]) to authenticated, service_role;
