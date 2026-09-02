-- 복만당 매장 목록 갱신 — 2026-09-02 발주처 전달 주소 기준
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
-- 0002_admin.sql 을 이미 돌린 프로젝트에서 이어서 실행합니다.
--
-- 무엇이 바뀌나
--   · 7곳 → 14곳 (운영 12 · 오픈예정 2). 부산·대전 포함
--   · '힐스테이트 에코송파점' → '에코송파점'
--   · 주소를 전달받은 도로명 주소로 교체
--   · sort 를 화면에 보이는 순서 그대로 1..14 로 다시 매김
--
-- 안전장치: 지점명이 같으면 덮어쓰고, 없으면 새로 넣습니다.
--           관리자 화면에서 이미 손댄 영업시간은 지우지 않습니다(hours 는 비어 있을 때만 채움).

begin;

-- 지점명이 유일해야 아래 upsert 가 성립합니다.
create unique index if not exists stores_name_key on public.stores (name);

with incoming(sort, name, region, address, hours, is_main, is_soon) as (values
  ( 1, '본점',               '서울', '서울 강남구 언주로 563 근린생활시설 제401동 제116호', '15:40 라스트오더',   true,  false),
  ( 2, '매봉역점',           '서울', '서울 강남구 남부순환로378길 12 지상1층 104호',        '19:30 영업 종료',    false, false),
  ( 3, '방배중앙점',         '서울', '서울 서초구 방배로15길 28 La Ville 제1층 101호',      '14:10 라스트오더',   false, false),
  ( 4, '양재삼호물산점',     '서울', '서울 서초구 논현로17길 4 1층 102호',                  '15:00 브레이크타임', false, false),
  ( 5, '양재시민의숲점',     '서울', '서울 서초구 강남대로6길 11 1층 103호',                '15:00 브레이크타임', false, false),
  ( 6, '에코송파점',         '서울', '서울 송파구 정의로7길 13 B동 1층 126호',              '영업시간 확인 중',   false, false),
  ( 7, '과천지식정보타운점', '경기', '경기 과천시 과천대로7나길 20 101호',                  '영업시간 확인 중',   false, false),
  ( 8, '서판교점',           '경기', '경기 성남시 분당구 운중로 129 111호',                 '영업시간 확인 중',   false, false),
  ( 9, '서현역점',           '경기', '경기 성남시 분당구 서현로180번길 26 101호',           '14:30 라스트오더',   false, false),
  (10, '죽전점',             '경기', '경기 용인시 수지구 현암로 160, 104호',                '영업시간 확인 중',   false, false),
  (11, '대전만년점',         '지방', '대전 서구 만년로 79 1층',                             '영업시간 확인 중',   false, false),
  (12, '센텀시티역점',       '지방', '부산 해운대구 센텀동로 9 C동 1층 121호',              '영업시간 확인 중',   false, false),
  (13, '영등포구청역점',     '서울', '서울 영등포구 당산로27길 5 1층',                      '오픈 준비 중',       false, true),
  (14, '강북수유점',         '서울', '서울 강북구 삼양로107길 36',                          '오픈 준비 중',       false, true)
)
insert into public.stores (sort, name, region, address, hours, is_main, is_soon, published)
select sort, name, region, address, hours, is_main, is_soon, true from incoming
on conflict (name) do update set
  sort      = excluded.sort,
  region    = excluded.region,
  address   = excluded.address,
  is_main   = excluded.is_main,
  is_soon   = excluded.is_soon,
  published = true,
  -- 관리자 화면에서 채워 둔 영업시간이 있으면 그대로 둡니다
  hours     = case
                when coalesce(public.stores.hours, '') in ('', '영업시간 확인 중') then excluded.hours
                else public.stores.hours
              end;

-- 옛 이름으로 남아 있던 행 정리 (에코송파점으로 대체됨)
delete from public.stores where name = '힐스테이트 에코송파점';

commit;

-- 확인용
-- select sort, name, region, is_soon, published, address from public.stores order by sort;
