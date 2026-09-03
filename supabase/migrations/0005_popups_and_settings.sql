-- 복만당 — 팝업 관리 + 홈페이지 문구 관리 (2026-09-02 발주처 요청)
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → 붙여넣고 Run.
--            0004_menus_and_store_fields.sql 다음에 실행합니다.
--
--   1) popups   상단 띠배너 / 가운데 모달 팝업
--   2) settings 자주 바뀌는 문구만 키-값으로. 사이트 전체를 편집기로 만들지는 않았습니다
--   3) popup-photos 버킷 — 모달 팝업에 넣을 이미지

begin;

-- ── 1) 팝업 ──────────────────────────────────────────────────────────
create table if not exists public.popups (
  id         bigint generated always as identity primary key,
  kind       text        not null default 'banner',   -- banner(상단 띠) | modal(가운데)
  title      text        not null default '',
  body       text        not null default '',
  image_url  text        not null default '',         -- 모달에서만 씁니다
  link_url   text        not null default '',
  link_label text        not null default '자세히 보기',
  starts_at  date,                                    -- 비우면 바로 시작
  ends_at    date,                                    -- 비우면 끝없이
  sort       int         not null default 0,
  published  boolean     not null default false,      -- 만들자마자 뜨면 곤란합니다
  created_at timestamptz not null default now()
);
alter table public.popups enable row level security;   -- 서버(service_role)만 접근

comment on column public.popups.kind      is 'banner = 헤더 위 한 줄 띠 / modal = 화면 가운데 팝업';
comment on column public.popups.starts_at is '노출 시작일(포함). 비우면 즉시.';
comment on column public.popups.ends_at   is '노출 종료일(포함). 비우면 계속.';

-- ── 2) 홈페이지 문구 ─────────────────────────────────────────────────
create table if not exists public.settings (
  key        text        primary key,
  value      text        not null default '',
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

-- 지금 사이트에 실려 있는 값을 그대로 넣습니다. 관리자에서 고치면 이 값이 바뀝니다.
-- ※ key 는 코드가 찾는 이름입니다. 마음대로 바꾸면 화면에 반영되지 않습니다.
insert into public.settings (key, value) values
  ('hero.title',    E'맑은 국물에\n깊은 맛을 담다'),
  ('hero.desc',     '한우를 정성껏 우려, 맑고 깊은 맛을 담았습니다. 따뜻한 마음과 정성으로 완성한 곰탕에 복만당의 또 하나의 시그니처, 이북식 손만두를 곁들이면 담백하고 깊은 맛을 한층 더 풍성하게 즐기실 수 있습니다.'),
  ('store.address', E'서울시 강남구 언주로 563\n원에디션강남 401동 116호'),
  ('store.tel',     '02-565-5288'),
  ('store.hours',   '15:40 라스트오더'),
  ('store.parking', '지하주차장 이용'),
  ('menu.origin',   '원산지 — 소고기(국내산), 쌀(국내산), 돼지고기(국내산), 무(국내산), 고춧가루(국내산·중국산)'),
  ('links.naverPlace',  ''),
  ('links.reserve',     ''),
  ('links.baemin',      ''),
  ('links.coupangeats', ''),
  ('links.yogiyo',      ''),
  ('links.kitShop',     'https://smartstore.naver.com/beflique')
on conflict (key) do nothing;

-- ── 3) 팝업 이미지 버킷 ──────────────────────────────────────────────
commit;

-- 버킷 생성은 트랜잭션 밖에서 합니다.
-- 안에 두면 권한 부족 등으로 실패했을 때 위의 테이블 생성까지 통째로 되돌아가는데,
-- 화면에는 버킷 오류만 보여 원인을 찾기 어렵습니다.
-- 이 문장이 실패하면 대시보드 → Storage → New bucket 에서 직접 만드세요(Public).
insert into storage.buckets (id, name, public)
values ('popup-photos', 'popup-photos', true)
on conflict (id) do update set public = true;

-- 확인용
-- select id, kind, title, published, starts_at, ends_at from public.popups order by sort;
-- select key, value from public.settings order by key;
