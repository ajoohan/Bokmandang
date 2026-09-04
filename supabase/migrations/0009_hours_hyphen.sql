-- 0009 — 영업시간의 대시를 일반 하이픈으로
--
-- 왜
--   화면 문구의 대시를 모두 일반 하이픈(-)으로 통일했습니다.
--   부산시청점 영업시간만 DB 에 en 대시(–)로 들어가 있어, 코드를 고쳐도
--   화면에는 계속 '매일 10:30 – 20:00' 으로 나옵니다.
--   매장 정보는 /api/stores(DB) 가 먼저이고 assets/data/stores.js 는 폴백입니다.
--
-- 안 돌려도 사이트는 정상입니다 — 그 한 줄의 대시 모양만 다릅니다.
--
-- 되돌리려면
--   update public.stores set hours = replace(hours, '-', '–') where name = '부산시청점';

begin;

update public.stores
   set hours = replace(hours, '–', '-')
 where hours like '%–%';

commit;

-- 확인
--   select name, hours from public.stores where hours <> '' order by sort, id;
