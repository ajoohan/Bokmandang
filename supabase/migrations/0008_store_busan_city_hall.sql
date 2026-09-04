-- 0008 — 부산시청점 추가 (2026-09-04 발주처 전달)
--
--   부산시청점  부산 연제구 중앙대로 1043 1층
--               매일 10:30 – 20:00 · 0507-1332-9136
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--
-- ⚠️ 이 마이그레이션을 돌려야 사이트에 나옵니다. 화면은 /api/stores (DB) 를
--   먼저 쓰고, assets/data/stores.js 는 그 요청이 실패했을 때만 쓰는 폴백입니다.
--
-- 지방 묶음(대전·부산) 끝에 넣고, 뒤의 오픈예정 두 곳을 한 칸씩 밀었습니다.
-- 화면은 sort 순서대로 보여 줍니다.
--
-- 되돌리려면
--   delete from public.stores where name = '부산시청점';
--   update public.stores set sort = 13 where name = '영등포구청역점';
--   update public.stores set sort = 14 where name = '강북수유점';

begin;

-- 0003 에서 만든 이름 유일 색인에 기대어 upsert 합니다.
create unique index if not exists stores_name_key on public.stores (name);

-- 오픈예정 두 곳을 먼저 뒤로 밀어 자리를 비웁니다.
update public.stores set sort = 15 where name = '강북수유점';
update public.stores set sort = 14 where name = '영등포구청역점';

insert into public.stores (sort, name, region, address, hours, phone, is_main, is_new, is_soon, published)
values (13, '부산시청점', '지방', '부산 연제구 중앙대로 1043 1층',
        '매일 10:30 – 20:00', '0507-1332-9136', false, true, false, true)
on conflict (name) do update
   set sort    = excluded.sort,
       region  = excluded.region,
       address = excluded.address,
       -- 관리자 화면에서 이미 손댄 값은 덮지 않습니다
       hours   = case when coalesce(public.stores.hours, '') = '' then excluded.hours else public.stores.hours end,
       phone   = case when coalesce(public.stores.phone, '') = '' then excluded.phone else public.stores.phone end;

commit;

-- 확인
--   select sort, name, region, hours, phone from public.stores order by sort, id;
