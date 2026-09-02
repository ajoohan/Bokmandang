-- 복만당 — 메뉴 관리 + 매장 정보 확장 (2026-09-02 발주처 요청)
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--            0003_stores_2026_09.sql 다음에 실행합니다.
--
-- 이 파일이 하는 일
--   1) stores 에 전화번호 · 휴무일 · 지도 링크 칸을 추가합니다
--   2) menus 표를 만들고 현재 사이트 메뉴 8종을 그대로 넣습니다
--   3) 메뉴 사진을 올릴 스토리지 버킷(menu-photos)을 만듭니다
--
-- ※ 3)번 버킷은 SQL 로 만들 수 없는 프로젝트도 있습니다. 아래 insert 가 실패하면
--   대시보드 → Storage → New bucket → 이름 menu-photos, Public 체크로 직접 만드세요.

begin;

-- ── 1) 매장 정보 확장 ────────────────────────────────────────────────
alter table public.stores add column if not exists phone   text default '';
alter table public.stores add column if not exists closed  text default '';   -- 휴무일 (예: 매주 일요일)
alter table public.stores add column if not exists map_url text default '';   -- 네이버/카카오 지도 링크

comment on column public.stores.phone   is '매장 대표번호. 비우면 사이트에 표시하지 않습니다.';
comment on column public.stores.closed  is '휴무일 안내 문구. 비우면 표시하지 않습니다.';
comment on column public.stores.map_url is '지도 링크. 비우면 지점명으로 네이버 지도 검색을 엽니다.';

-- ── 2) 메뉴 ──────────────────────────────────────────────────────────
create table if not exists public.menus (
  id          bigint generated always as identity primary key,
  sort        int          not null default 0,
  category    text         not null default 'tang',   -- tang(곰탕) | side(사이드) | kit(밀키트)
  name        text         not null,
  description text         not null default '',
  price       int          not null default 0,
  unit        text         not null default '원',
  tag         text         not null default '',       -- BEST · SIGNATURE 등. 비우면 배지 없음
  image_key   text         not null default '',       -- 저장소에 들어 있는 기본 사진 이름 (menu-gomtang 등)
  image_url   text         not null default '',       -- 관리자에서 올린 사진. 있으면 이 쪽을 씁니다
  image_url2  text         not null default '',       -- 크게 볼 때 넘겨 보는 두 번째 컷
  published   boolean      not null default true,
  created_at  timestamptz  not null default now()
);

-- 브라우저에서 직접 읽지 못하게 잠급니다. 서버(service_role)만 접근합니다.
alter table public.menus enable row level security;

create unique index if not exists menus_name_key on public.menus (name);

-- 현재 사이트에 있는 메뉴를 그대로 옮깁니다. 이미 있으면 건드리지 않습니다.
insert into public.menus (sort, category, name, description, price, unit, tag, image_key)
values
  (1,'tang','곰탕',        '맑은 한우 육수에 양지 수육을 넉넉히. 복만당의 기본이자 기준.', 10000,'원','BEST',     'menu-gomtang'),
  (2,'tang','특곰탕',      '고기 양을 늘린 구성. 한 그릇으로 든든하게 드시고 싶을 때.',    13000,'원','',         'menu-teuk'),
  (3,'tang','우설곰탕',    '부드럽게 삶아낸 우설을 얹은 별미. 수량 한정으로 준비합니다.',  16000,'원','',         'menu-useol'),
  (4,'tang','수육곰탕',    '한우 수육을 두 배로 올린 구성. 깍두기 한 점과 함께.',          19000,'원','SIGNATURE','menu-sugyuk'),
  (5,'side','이북식 손만두','얇은 피에 김치와 두부를 채워 매일 손으로 빚습니다.',            2000,'원 / 1알','',   'menu-mandu'),
  (6,'side','한우수육',    '250g. 곰탕과 함께 또는 단품으로. 소금장과 함께 드세요.',       35000,'원','',         'menu-sugyuk-plate'),
  (7,'side','공깃밥',      '국내산 쌀로 매일 새로 짓습니다.',                              1000,'원','',         'menu-gomtang'),
  (8,'kit', '곰탕 밀키트',  '매장에서 매일 끓이는 그 곰탕. 600g 냉동 포장, 데우기만 하면 완성.', 9000,'원','',    'kit-package')
on conflict (name) do nothing;

-- ── 3) 메뉴 사진 버킷 ────────────────────────────────────────────────
-- 사진은 누구나 볼 수 있어야 하므로 public 입니다. 올리는 것은 서버만 합니다.
insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do update set public = true;

commit;

-- 확인용
-- select sort, category, name, price, image_key, image_url from public.menus order by sort;
-- select name, phone, closed, map_url from public.stores order by sort;
