-- 복만당 — 가맹 상담 접수 테이블
--
-- 이 테이블은 웹사이트의 /api/inquiry (Vercel 함수) 를 통해서만 기록됩니다.
-- 브라우저는 Supabase 를 직접 호출하지 않습니다.
--
-- 전용 프로젝트를 쓰면 이대로,
-- 다른 프로젝트에 얹는다면 테이블명을 bokmandang_inquiries 로 바꾸고
-- Vercel 환경변수 SUPABASE_TABLE 에 같은 이름을 넣으세요. (코드 수정 불필요)

create table if not exists public.inquiries (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 40),
  phone       text not null check (char_length(phone) between 9 and 30),
  region      text check (char_length(region) <= 80),
  budget      text check (char_length(budget) <= 40),
  message     text check (char_length(message) <= 2000),
  -- 담당자가 상담 진행 상태를 관리하는 칸 (개인정보 아님)
  status      text not null default 'new'
                check (status in ('new','contacted','visiting','contracted','closed')),
  memo        text
);

comment on table  public.inquiries is '복만당 가맹 상담 신청. /api/inquiry 를 통해서만 기록됩니다.';
comment on column public.inquiries.status is 'new 접수 / contacted 연락함 / visiting 상권검토 / contracted 계약 / closed 종료';

create index if not exists inquiries_created_at_idx   on public.inquiries (created_at desc);
create index if not exists inquiries_phone_recent_idx on public.inquiries (phone, created_at desc);

-- ── 접근 통제 ────────────────────────────────────────────────────────────
-- RLS 를 켜고 정책을 하나도 만들지 않습니다.
-- → anon·authenticated 는 읽기/쓰기 모두 차단됩니다.
-- → service_role(서버 함수만 보유) 은 RLS 를 우회하므로 정상 동작합니다.
-- 공개 키가 유출돼도 상담 내역을 조회할 수 없습니다.
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon, authenticated;

-- ── 보관 기간 ────────────────────────────────────────────────────────────
-- 개인정보처리방침 §3 은 "동의일로부터 1년" 입니다.
-- 아래 함수를 pg_cron 으로 매일 돌리거나, 담당자가 주기적으로 실행하세요.
create or replace function public.purge_expired_inquiries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare removed integer;
begin
  delete from public.inquiries
   where created_at < now() - interval '1 year'
     and status in ('new','closed');
  get diagnostics removed = row_count;
  return removed;
end;
$$;

comment on function public.purge_expired_inquiries is
  '보유기간(1년) 지난 상담 내역 파기. 개인정보처리방침 §3·§8 이행용.';
