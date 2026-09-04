-- 0010 — 문구 관리(settings) 값의 대시도 일반 하이픈으로
--
-- 왜
--   0009 로 매장 영업시간은 정리했는데, 메뉴 원산지 문구가 남았습니다.
--   이 문장은 index.html 이 아니라 DB(문구 관리)에서 오기 때문에 코드 치환에
--   걸리지 않았습니다. 한국어 화면에만 en/em 대시가 하나 남아 있었습니다.
--
--   영어·중국어·일본어는 사전 값으로 나오므로 이미 하이픈입니다.
--   그래서 한국어만 모양이 달랐습니다.
--
-- 대시는 U&'\2013' (en) · U&'\2014' (em) 로 적었습니다. 글자 그대로 적으면
-- 붙여넣는 과정에서 바뀌어 0 행만 처리되고 조용히 끝날 수 있습니다.
--
-- 안 돌려도 사이트는 정상입니다 — 원산지 줄의 대시 모양만 다릅니다.

begin;

update public.settings
   set value = translate(value, U&'\2013\2014', '--'),
       updated_at = now()
 where value <> translate(value, U&'\2013\2014', '--');

commit;

-- 확인 — 결과가 0 행이어야 합니다
--   select key, value from public.settings
--    where value <> translate(value, U&'\2013\2014', '--');
