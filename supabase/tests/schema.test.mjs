// 스키마 시나리오 테스트: 마이그레이션 + seed를 PGlite에 적용하고 권한 · 단계 규칙을 확인한다.
// 실행: npm run test:db (Docker 불필요)
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeDb } from './db.mjs';

const supabaseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(supabaseDir, 'migrations');
const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => path.join(migrationsDir, f));
const db = await makeDb(migrations, path.join(supabaseDir, 'seed.sql'));

const ADMIN = '11111111-1111-1111-1111-111111111111';
const NOBODY = '22222222-2222-2222-2222-222222222222';
await db.exec(`insert into auth.users values ('${ADMIN}'), ('${NOBODY}'); insert into public.admins values ('${ADMIN}');`);

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✔', name); }
  else { fail++; console.log('  ✖', name, extra); }
};

// role: 'anon' | 'authenticated' | 'service_role' | null(superuser)
async function as(role, sub, sql, params = []) {
  return db.transaction(async (tx) => {
    if (sub) await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub]);
    if (role) await tx.exec(`set local role ${role}`);
    return tx.query(sql, params);
  });
}
async function err(role, sub, sql, params = []) {
  try { await as(role, sub, sql, params); return null; }
  catch (e) { return e.message; }
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

const ev = await one(`select id from public.events where public_code = 'hid-1024'`);
const duet = await one(`select id from public.submissions where performer_names = array['신승빈','이명우']`);

console.log('\n[공개 읽기 · 비밀 보호]');
ok('anon은 공개 행사의 신청을 읽는다', (await as('anon', null, `select count(*)::int c from public.submissions`)).rows[0].c === 6);
ok('anon은 submission_secrets를 읽을 수 없다', /permission denied/.test(await err('anon', null, `select * from public.submission_secrets`)));
ok('관리자도 submission_secrets를 읽을 수 없다', /permission denied/.test(await err('authenticated', ADMIN, `select * from public.submission_secrets`)));
ok('anon은 events에 쓸 수 없다', /permission denied/.test(await err('anon', null, `update public.events set title = 'x'`)));
ok('anon은 신청 함수를 직접 호출할 수 없다',
  /permission denied/.test(await err('anon', null, `select public.create_submission('hid-1024', array['x'], '[{"artist":"a","title":"b"}]', '1234')`)));
ok('일반 로그인 사용자는 events를 수정해도 반영되지 않는다',
  (await as('authenticated', NOBODY, `update public.events set title = 'hack' returning id`)).rows.length === 0);

console.log('\n[DRAFT 숨김]');
await db.exec(`insert into public.events (title, event_date, public_code) values ('비공개', '2026-11-01', 'draft-1')`);
ok('anon은 DRAFT 행사를 볼 수 없다', (await as('anon', null, `select count(*)::int c from public.events where public_code = 'draft-1'`)).rows[0].c === 0);
ok('관리자는 DRAFT 행사를 본다', (await as('authenticated', ADMIN, `select count(*)::int c from public.events where public_code = 'draft-1'`)).rows[0].c === 1);
ok('DRAFT 행사에는 신청할 수 없다',
  /SUBMISSION_CLOSED/.test(await err('service_role', null, `select public.create_submission('draft-1', array['x'], '[{"artist":"a","title":"b"}]', '1234')`)));

console.log('\n[모집 중 · PIN]');
ok('틀린 PIN은 INVALID_PIN', /INVALID_PIN/.test(await err('service_role', null, `select public.verify_submission_pin($1, '9999')`, [duet.id])));
ok('맞는 PIN은 true', (await as('service_role', null, `select public.verify_submission_pin($1, '0000') v`, [duet.id])).rows[0].v === true);
ok('PIN 형식 오류(3자리)는 INVALID_INPUT',
  /INVALID_INPUT/.test(await err('service_role', null, `select public.create_submission('hid-1024', array['x'], '[{"artist":"a","title":"b"}]', '123')`)));
ok('공연자 없음은 INVALID_INPUT',
  /INVALID_INPUT/.test(await err('service_role', null, `select public.create_submission('hid-1024', array['  '], '[{"artist":"a","title":"b"}]', '1234')`)));
ok('곡 11개는 INVALID_INPUT',
  /INVALID_INPUT/.test(await err('service_role', null, `select public.create_submission('hid-1024', array['x'], $1::jsonb, '1234')`,
    [JSON.stringify(Array.from({ length: 11 }, () => ({ artist: 'a', title: 'b' })))])));
await as('service_role', null, `select public.update_submission($1, '0000', array['신승빈','이명우','김OO'], '[{"artist":"박효신","title":"연인"},{"artist":"DAY6","title":"예뻤어"},{"artist":"아이유","title":"Love wins all"}]')`, [duet.id]);
ok('모집 중 수정으로 곡이 3개가 된다', (await one(`select count(*)::int c from public.performance_entries where submission_id = $1`, [duet.id])).c === 3);
ok('공연자도 바뀐다', (await one(`select cardinality(performer_names) n from public.submissions where id = $1`, [duet.id])).n === 3);
const tmp = (await as('service_role', null, `select public.create_submission('hid-1024', array['임시'], '[{"artist":"a","title":"b"}]', '1111') id`)).rows[0].id;
await as('service_role', null, `select public.delete_submission($1, '1111')`, [tmp]);
ok('삭제하면 신청 · 곡 · PIN이 함께 지워진다',
  (await one(`select (select count(*) from public.submissions where id = $1)::int + (select count(*) from public.submission_secrets where submission_id = $1)::int c`, [tmp])).c === 0);

console.log('\n[모집 마감 이후]');
await as('authenticated', ADMIN, `update public.events set status = 'CLOSED' where id = $1`, [ev.id]);
ok('마감 후 신청은 SUBMISSION_CLOSED',
  /SUBMISSION_CLOSED/.test(await err('service_role', null, `select public.create_submission('hid-1024', array['x'], '[{"artist":"a","title":"b"}]', '1234')`)));
ok('마감 후 수정은 NOT_EDITABLE',
  /NOT_EDITABLE/.test(await err('service_role', null, `select public.update_submission($1, '0000', array['x'], '[{"artist":"a","title":"b"}]')`, [duet.id])));
ok('마감 후 PIN 확인도 NOT_EDITABLE', /NOT_EDITABLE/.test(await err('service_role', null, `select public.verify_submission_pin($1, '0000')`, [duet.id])));

console.log('\n[관리자 순서 편성]');
const mainIds = (await db.query(`select id from public.performance_entries where event_id = $1 and not is_encore order by created_at, id`, [ev.id])).rows.map(r => r.id);
ok('일반 로그인 사용자는 재정렬할 수 없다',
  /FORBIDDEN/.test(await err('authenticated', NOBODY, `select public.reorder_entries($1, false, $2::uuid[])`, [ev.id, mainIds])));
const reversed = [...mainIds].reverse();
await as('authenticated', ADMIN, `select public.reorder_entries($1, false, $2::uuid[])`, [ev.id, reversed]);
const after = (await db.query(`select id, order_index, status from public.performance_entries where event_id = $1 and not is_encore order by order_index`, [ev.id])).rows;
ok('재정렬하면 01부터 순서가 매겨진다', after.every((r, i) => r.order_index === i + 1 && r.id === reversed[i]));
ok('배치된 곡은 SCHEDULED가 된다', after.every(r => r.status === 'SCHEDULED'));
await as('authenticated', ADMIN, `select public.reorder_entries($1, false, $2::uuid[])`, [ev.id, mainIds]);
ok('다시 재정렬해도 순서 중복 오류 없이 바뀐다',
  (await one(`select id from public.performance_entries where event_id = $1 and order_index = 1 and not is_encore`, [ev.id])).id === mainIds[0]);
ok('다른 행사의 엔트리를 섞으면 INVALID_INPUT',
  /INVALID_INPUT/.test(await err('authenticated', ADMIN, `select public.reorder_entries($1, true, $2::uuid[])`, [ev.id, mainIds.slice(0, 1)])));

console.log('\n[공연 중]');
await as('authenticated', ADMIN, `update public.events set status = 'PUBLISHED' where id = $1`, [ev.id]);
await as('authenticated', ADMIN, `update public.events set status = 'LIVE' where id = $1`, [ev.id]);
await as('authenticated', ADMIN, `update public.performance_entries set status = 'PERFORMING' where id = $1`, [mainIds[0]]);
ok('공연 중인 곡은 하나뿐', /duplicate key|unique/.test(await err('authenticated', ADMIN, `update public.performance_entries set status = 'PERFORMING' where id = $1`, [mainIds[1]])));
const mainLeft = async () =>
  (await one(`select count(*)::int c from public.performance_entries where event_id = $1 and not is_encore and status not in ('COMPLETED','CANCELLED')`, [ev.id])).c;
const openEncore = () => err('authenticated', ADMIN, `update public.events set status = 'ENCORE' where id = $1`, [ev.id]);
ok(`남은 본 공연이 ${await mainLeft()}곡이면 앵콜을 열 수 없다`, /MAIN_SET_NOT_FINISHED/.test(await openEncore()));
await as('authenticated', ADMIN, `update public.performance_entries set status = 'COMPLETED' where id = any($1::uuid[])`, [mainIds.slice(0, mainIds.length - 6)]);
ok('6곡 남아도 앵콜을 열 수 없다', (await mainLeft()) === 6 && /MAIN_SET_NOT_FINISHED/.test(await openEncore()));
await as('authenticated', ADMIN, `update public.performance_entries set status = 'CANCELLED' where id = $1`, [mainIds[mainIds.length - 6]]);
ok('5곡 남으면 앵콜을 연다 (취소 곡은 세지 않음)', (await mainLeft()) === 5 && (await openEncore()) === null);
ok('앵콜을 열어도 남은 본 공연 5곡은 대기 상태로 그대로 남는다',
  (await one(`select count(*)::int c from public.performance_entries where event_id = $1 and not is_encore and status = 'SCHEDULED' and order_index is not null`, [ev.id])).c === 5);

console.log('\n[앵콜]');
ok('앵콜은 한 번에 한 곡 (2곡은 INVALID_INPUT)',
  /INVALID_INPUT/.test(await err('service_role', null, `select public.create_submission('hid-1024', array['x'], '[{"artist":"a","title":"b"},{"artist":"c","title":"d"}]', '1234')`)));
const e1 = (await as('service_role', null, `select public.create_submission('hid-1024', array['한OO','정OO'], '[{"artist":"윤하","title":"사건의 지평선"}]', '1234') id`)).rows[0].id;
const e2 = (await as('service_role', null, `select public.create_submission('hid-1024', array['신승빈'], '[{"artist":"아이유","title":"너의 의미"}]', '4829') id`)).rows[0].id;
const e3 = (await as('service_role', null, `select public.create_submission('hid-1024', array['박OO'], '[{"artist":"혁오","title":"위잉위잉"}]', '5555') id`)).rows[0].id;
const order = async (id) => (await one(`select order_index, status from public.performance_entries where submission_id = $1`, [id]));
ok('선착순으로 01, 02, 03이 자동 배정된다',
  (await order(e1)).order_index === 1 && (await order(e2)).order_index === 2 && (await order(e3)).order_index === 3);
ok('앵콜 곡은 바로 SCHEDULED', (await order(e2)).status === 'SCHEDULED');
ok('앵콜도 submission_secrets에 PIN이 있다', (await one(`select count(*)::int c from public.submission_secrets where submission_id = $1`, [e2])).c === 1);
await as('service_role', null, `select public.update_submission($1, '4829', array['신승빈'], '[{"artist":"아이유","title":"좋은 날"}]')`, [e2]);
const e2row = await one(`select song_title, order_index from public.performance_entries where submission_id = $1`, [e2]);
ok('차례 전에는 PIN으로 곡을 바꿀 수 있고 번호는 그대로', e2row.song_title === '좋은 날' && e2row.order_index === 2);
await as('authenticated', ADMIN, `update public.performance_entries set status = 'PERFORMING' where submission_id = $1`, [e1]);
ok('차례가 시작된 앵콜 곡은 NOT_EDITABLE',
  /NOT_EDITABLE/.test(await err('service_role', null, `select public.update_submission($1, '1234', array['x'], '[{"artist":"a","title":"b"}]')`, [e1])));
await as('service_role', null, `select public.delete_submission($1, '5555')`, [e3]);
const e4 = (await as('service_role', null, `select public.create_submission('hid-1024', array['김OO'], '[{"artist":"아이유","title":"밤편지"}]', '0000') id`)).rows[0].id;
ok('취소 후 새 신청은 마지막 번호 다음(03)', (await order(e4)).order_index === 3);
ok('관리자는 앵콜 순서를 옮길 수 있다', await (async () => {
  const ids = (await db.query(`select id from public.performance_entries where event_id = $1 and is_encore order by order_index`, [ev.id])).rows.map(r => r.id);
  await as('authenticated', ADMIN, `select public.reorder_entries($1, true, $2::uuid[])`, [ev.id, [ids[0], ids[2], ids[1]]]);
  return (await order(e4)).order_index === 2 && (await order(e2)).order_index === 3;
})());

console.log('\n[종료]');
await as('authenticated', ADMIN, `update public.events set status = 'ENDED' where id = $1`, [ev.id]);
ok('종료 후 앵콜 신청은 SUBMISSION_CLOSED',
  /SUBMISSION_CLOSED/.test(await err('service_role', null, `select public.create_submission('hid-1024', array['x'], '[{"artist":"a","title":"b"}]', '1234')`)));
ok('종료 후 앵콜 수정은 NOT_EDITABLE',
  /NOT_EDITABLE/.test(await err('service_role', null, `select public.update_submission($1, '4829', array['x'], '[{"artist":"a","title":"b"}]')`, [e2])));

console.log('\n[Realtime]');
const pub = (await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).rows.map(r => r.tablename);
ok('events · submissions · performance_entries만 publication에 있다',
  JSON.stringify(pub) === JSON.stringify(['events', 'performance_entries', 'submissions']), JSON.stringify(pub));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
