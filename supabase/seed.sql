-- 로컬 개발용 샘플 데이터 (supabase db reset 시 실행)
-- 디자인 시안과 같은 행사 · 신청을 만든다. 모든 샘플 신청의 PIN은 0000.

insert into public.events (title, event_date, venue, public_code, status)
values ('하이드 10월 정기 버스킹', '2026-10-24', '[장소]', 'hid-1024', 'OPEN');

select public.create_submission('hid-1024', array['박OO'],
  '[{"artist": "실리카겔", "title": "NO PAIN"}]', '0000');
select public.create_submission('hid-1024', array['김OO'],
  '[{"artist": "잔나비", "title": "주저하는 연인들을 위해"}, {"artist": "아이유", "title": "밤편지"}]', '0000');
select public.create_submission('hid-1024', array['신승빈', '이명우'],
  '[{"artist": "박효신", "title": "연인"}, {"artist": "DAY6", "title": "한 페이지가 될 수 있게"}]', '0000');
select public.create_submission('hid-1024', array['정OO'],
  '[{"artist": "검정치마", "title": "Everything"}]', '0000');
select public.create_submission('hid-1024', array['윤OO', '최OO'],
  '[{"artist": "10CM", "title": "봄이 좋냐??"}]', '0000');
select public.create_submission('hid-1024', array['한OO'],
  '[{"artist": "혁오", "title": "TOMBOY"}]', '0000');
