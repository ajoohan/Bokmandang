-- 0007 — 공깃밥에 전용 사진 연결
--
-- 왜
--   공깃밥 사진이 없어서 곰탕 사진(menu-gomtang)을 임시로 쓰고 있었습니다.
--   메뉴 카드 두 칸에 같은 사진이 나오고, 크게 보면 곰탕이 나왔습니다.
--   발주처가 공기밥.jpg · 공기밥1.jpg 를 보내와 menu-gonggibap 으로 넣었습니다.
--
-- ⚠️ 이 마이그레이션을 돌려야 사이트에 반영됩니다.
--   화면은 /api/menu (DB) 를 먼저 쓰고, assets/js/main.js 의 목록은
--   그 요청이 실패했을 때만 쓰이는 폴백입니다. 코드만 고치면 안 바뀝니다.
--
-- 되돌리려면
--   update public.menus set image_key = 'menu-gomtang' where name = '공깃밥';

begin;

update public.menus
   set image_key = 'menu-gonggibap'
 where name = '공깃밥'
   and coalesce(image_key, '') in ('', 'menu-gomtang')   -- 관리자가 이미 바꿨으면 건드리지 않습니다
   and coalesce(image_url, '') = '';                     -- 관리자가 사진을 올렸으면 그게 우선입니다

commit;

-- 확인
--   select name, image_key, image_url from public.menus order by sort, id;
