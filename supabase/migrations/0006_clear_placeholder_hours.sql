-- 0006 — '영업시간 확인 중' 자리표시를 비웁니다
--
-- 왜
--   영업시간을 못 받은 지점에 '영업시간 확인 중' 이라고 적어 두었습니다.
--   채워 넣을 계획이 없으면 손님에게 지키지 않을 약속이 됩니다.
--   이제 영업시간이 비어 있으면 사이트가 '지도에서 영업시간 확인' 으로
--   안내하고, 옆의 '지도 보기' 가 관리자에 넣은 네이버 지도 링크로 갑니다.
--   지도만 최신이면 되니 영업시간이 바뀌어도 손볼 게 없습니다.
--
-- 안 돌려도 사이트는 정상입니다 — 화면을 그리는 쪽에서 이 문구를 이미
-- '아직 모름' 으로 취급합니다. 다만 관리자 편집창에 옛 문구가 남습니다.
--
-- 되돌리려면 (필요할 일은 없습니다)
--   update public.stores set hours = '영업시간 확인 중'
--    where coalesce(hours, '') = '' and name in ( ...해당 지점명... );

begin;

update public.stores
   set hours = ''
 where hours ~ '확인\s*중';

commit;

-- 확인
--   select name, coalesce(nullif(hours, ''), '(비어 있음)') as hours,
--          coalesce(nullif(map_url, ''), '(비어 있음)') as map_url
--     from public.stores order by sort, id;
