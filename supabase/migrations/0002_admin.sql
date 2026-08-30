-- 복만당 — 관리자 화면용 스키마 (매장 목록 + 상담 열람)
--
-- 상담(inquiries)은 0001 에서 이미 만들었습니다. 여기서는 매장 목록만 추가합니다.
-- 접근은 전부 서버(/api/admin/*)를 거치므로, 0001 과 같이 RLS 를 켜고
-- 정책을 두지 않습니다 → service_role 만 통과합니다.

create table if not exists public.stores (
  id          bigint generated always as identity primary key,
  sort        integer not null default 100,          -- 목록 정렬 순서 (작을수록 위)
  name        text    not null check (char_length(name) between 1 and 60),
  region      text    not null default '서울'
                check (region in ('서울','경기','지방')),  -- 지역 필터 버튼과 일치해야 함
  address     text    not null default '' check (char_length(address) <= 200),
  hours       text    not null default '' check (char_length(hours) <= 80),
  is_main     boolean not null default false,        -- 본점 배지
  is_new      boolean not null default false,        -- NEW 배지
  is_soon     boolean not null default false,        -- 오픈예정 배지
  published   boolean not null default true,         -- 끄면 사이트에서 숨김
  updated_at  timestamptz not null default now()
);

comment on table public.stores is '복만당 매장 목록. /api/stores 로 사이트에 공급되고 /api/admin/stores 로 편집합니다.';
comment on column public.stores.region is '서울 | 경기 | 지방 — index.html 지역 필터 버튼의 data-r 값과 일치';

create index if not exists stores_order_idx on public.stores (sort, id);

alter table public.stores enable row level security;
revoke all on public.stores from anon, authenticated;

create or replace function public.touch_stores_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists stores_touch on public.stores;
create trigger stores_touch before update on public.stores
  for each row execute function public.touch_stores_updated_at();

-- ── 초기 데이터 — assets/data/stores.js 와 동일 ──────────────────────────
-- ⚠️ 주소·영업시간은 아직 확정값이 아닙니다 (CONTENT.md 참조).
--    관리자 화면에서 확정값으로 바꾸세요.
insert into public.stores (sort, name, region, address, hours, is_main)
select * from (values
  (10, '본점',                '서울', '서울 강남구 언주로 563, 원에디션강남 401동 116호', '15:40 라스트오더',   true),
  (20, '매봉역점',            '서울', '서울 강남구 도곡동',        '19:30 영업 종료',     false),
  (30, '방배중앙점',          '서울', '서울 서초구 방배동',        '14:10 라스트오더',    false),
  (40, '양재삼호물산점',      '서울', '서울 서초구 양재동',        '15:00 브레이크타임',  false),
  (50, '양재시민의숲점',      '서울', '서울 서초구 양재동',        '15:00 브레이크타임',  false),
  (60, '힐스테이트 에코송파점','서울', '서울 송파구',               '영업시간 확인 중',    false),
  (70, '서현역점',            '경기', '경기 성남시 분당구 서현동', '14:30 라스트오더',    false)
) as v(sort, name, region, address, hours, is_main)
where not exists (select 1 from public.stores);
