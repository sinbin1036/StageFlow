-- 앵콜은 본 공연이 모두 끝나기 전, 남은 곡이 5곡 이하일 때부터 열 수 있다.
-- 남은 본 공연 곡은 지우지 않고 그대로 이어서 진행하며, 앵콜 곡은 그 뒤에 부른다.
-- "남은 곡" = 아직 끝나지 않은 본 공연 곡 (대기 중 + 지금 공연 중). 취소 · 완료 곡은 세지 않는다.

create or replace function public.check_event_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'ENCORE' and old.status is distinct from 'ENCORE' then
    if (
      select count(*) from public.performance_entries e
      where e.event_id = new.id
        and not e.is_encore
        and e.status not in ('COMPLETED', 'CANCELLED')
    ) > 5 then
      raise exception 'MAIN_SET_NOT_FINISHED' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
