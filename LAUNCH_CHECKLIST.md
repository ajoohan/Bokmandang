# 오픈 전 체크리스트 — 복만당 웹사이트

개발 쪽에서 할 수 있는 일은 끝났고, **여기 남은 것은 대부분 "값을 채우는 일"** 입니다.
각 항목에 어느 파일 어디를 고치면 되는지 적어 두었습니다.

---

## 🔴 발주처 확인이 필요한 값

코드가 아니라 **정보**가 없어서 막혀 있는 것들입니다. 값만 주시면 바로 반영됩니다.

| # | 확인할 것 | 반영 위치 | 지금 상태 |
|---|---|---|---|
| 1 | **고유 도메인** | `python tools/set-site-url.py https://도메인 --from https://bokmandang.vercel.app` | 현재 `bokmandang.vercel.app` 로 동작 중 |
| ~~2~~ | ~~상담 폼 연동~~ | ~~Supabase + Vercel~~ | ✅ **동작 확인 완료** |
| ~~2-b~~ | ~~관리자 화면~~ | ~~Vercel · Supabase~~ | ✅ **구글 로그인으로 활성화 완료** |
| ~~3~~ | ~~사업자 정보~~ | ~~푸터 · privacy.html~~ | ✅ **사업자등록증으로 반영 완료** |
| 4-b | **401동 호수 확인** — 등록 124호 / 본점 116호 / 제조원 123호 | `CONTENT.md` 참조 | 세 가지가 달라 확인 필요 |
| 5 | **개인정보 보유 기간** | `privacy.html` §3 | "동의일로부터 1년" (표준값으로 임시 기재) |
| 6 | **지점별 상세 주소·전화번호** | `assets/data/stores.js` | 동(洞) 단위까지만 |
| 7 | **지점별 영업시간·브레이크타임** | `assets/data/stores.js`, `index.html` 본점 카드 | 네이버 지도 표시값 |
| 8 | **8번째 이후 매장 존재 여부** | `assets/data/stores.js` | 7개 (목록 하단 미확인) |
| 9 | `CONTENT.md` ⚠️ 표시 문구 전부 | 창업연도·추출시간·표준평수·교육기간·창업비 구간 등 | 임시값 |
| 10 | **GA4 측정 ID** (통계를 쓸 경우) | `assets/js/config.js` → `ga4` | 비어 있음 → 스크립트 미로드 |
| 11 | **외부 채널 주소** — 네이버 플레이스·예약, 배달앱 3사, 밀키트 구매처 | `assets/js/config.js` → `links` | 비어 있음 → 버튼 미표시 |

> ⚠️ 위 값들은 **추측해서 채우지 마세요.** 특히 5(보유 기간)는 법적 고지 사항입니다.

---

## 🟡 값을 받은 뒤 해야 하는 작업

### 1. 도메인 반영
```bash
python tools/set-site-url.py https://www.실제도메인
```
`index.html` · `privacy.html` · `sitemap.xml` · `robots.txt` 를 한 번에 바꿉니다.
실행 뒤 `index.html` 상단의 "배포 도메인 미확정" 주석을 지우세요.

### 2. 상담 폼 켜기 (Supabase + Vercel)

구조 — 브라우저는 우리 서버만 호출하고, 그 함수가 Supabase 에 넣습니다.
Supabase 키는 브라우저에 절대 내려가지 않습니다.

```
브라우저 ──POST /api/inquiry──> Vercel 함수 ──service_role──> Supabase
                                (검증·중복차단·허니팟)
```

**a. Supabase**
- [ ] 프로젝트 생성 (리전 **Seoul / ap-northeast-2**)
- [ ] SQL Editor 에서 `supabase/migrations/0001_inquiries.sql` 실행
- [ ] Settings → API 에서 **Project URL** 과 **service_role** 키 복사

**b. Vercel 환경변수** (Settings → Environment Variables, 세 환경 모두)

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | `https://yxhuyreepsulvxzsldca.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service_role 키 — **어디에도 커밋하지 마세요** |
| `SUPABASE_TABLE` | `inquiries` |
| `GOOGLE_CLIENT_ID` | 구글 OAuth 클라이언트 ID (공개값) |
| `ADMIN_EMAILS` | 관리자 구글 계정. 쉼표로 여러 명 |
| `ADMIN_SECRET` | 세션 쿠키 서명키. 바꾸면 전원 로그아웃 |

**관리자 담당자가 바뀌면** `ADMIN_EMAILS` 만 고치면 됩니다. 비밀번호 공유가 없습니다.

⚠️ 구글 Cloud Console 의 **승인된 자바스크립트 원본**에 사이트 주소가 있어야
로그인 버튼이 뜹니다. 고유 도메인을 붙이면 그 주소도 추가하세요.

> Supabase 프로젝트는 **PLUSTONIC 조직과 다른 계정**에 있습니다 (무료 플랜 2개 제한 회피).
> 나중에 담당자 인수인계를 위해 **소유 계정이 누구 것인지 기록해 두세요.**
> 개인 메일이면 발주처 계정으로 이관하거나 조직 멤버로 초대해야 합니다.

**c. 확인** — 배포 후 실제로 한 번 제출
- [ ] Supabase Table Editor 의 `inquiries` 에 행이 생기는지
- [ ] 이름 1자로 제출 → "성함을 2자 이상…" 이 뜨는지 (서버 검증)
- [ ] 같은 번호로 연속 제출 → 1건만 쌓이는지 (중복 차단)
- [ ] 완료 화면의 "실제로 접수되지 않습니다" 안내가 사라졌는지 (자동)

**d. 보관기간 파기** — `purge_expired_inquiries()` 함수를 만들어 뒀습니다.
Supabase 대시보드에서 pg_cron 으로 매일 돌리거나, 담당자가 주기적으로 실행하세요.
처리방침 §3(1년)·§8(파기) 이행에 필요합니다.

### 3. 개인정보처리방침 마무리
`privacy.html` 최상단 주석에 채워야 할 항목이 정리되어 있습니다.
폼 전송 방식이 정해지면 **§5 위탁 표에 실제 수탁자를 적어야 합니다.**
(예: Formspree Inc. — 문의 데이터 전송·보관 / Google LLC — 스프레드시트 보관)

### 4. 통계 도구를 켠다면
`config.js` 의 `ga4` 에 ID를 넣으면 자동으로 로드됩니다.
**쿠키를 쓰게 되므로 `privacy.html` §10(자동 수집 장치) 문구도 함께 고쳐야 합니다.**
현재 §10은 "쿠키를 사용하지 않습니다"로 적혀 있습니다.

### 5. 임시 안내 문구 정리  ⚠️ 지금 검색이 열려 있습니다

**색인 허용 상태입니다** (2026-08-30, 링크 미리보기 우선 결정).
`noindex` 로 다시 닫으려면 `python tools/set-indexing.py block`.

푸터의 "웹사이트 시안(프로토타입)" 표기는 제거했습니다.

**남아 있는 안내 문구 — 정보가 확정되면 지우세요.**
- `index.html` 매장 목록 하단 — `※ 지점명과 지역은 네이버 지도 검색 결과 기준입니다…`
  **지점 주소·전화번호가 확정되기 전에는 지우지 마세요.** 이 문구가 없으면
  동(洞) 단위 주소와 네이버 지도에서 옮겨 온 영업시간이 확정된 정보처럼 보입니다.
- 상담 완료 화면의 "실제로 접수되지 않습니다" 는 전송이 켜져 있으면 자동으로 사라집니다.

### 6. 검색엔진 등록
- [ ] Google Search Console 에 사이트 등록 + `sitemap.xml` 제출
- [ ] 네이버 서치어드바이저 등록 + 사이트맵 제출
- [ ] [리치 결과 테스트](https://search.google.com/test/rich-results)로 `Restaurant` 구조화 데이터 확인
- [ ] 카카오톡·페이스북에 링크를 붙여넣어 공유 카드(og-cover.jpg) 확인

### 7. 실기기 최종 점검

자동 점검(대비·타깃 크기·레이블·제목 단계)은 통과했습니다. **아래는 사람이 직접 봐야 하는 것들입니다.**

- [ ] iOS Safari / Android Chrome 에서 폼 입력 (입력 시 화면이 확대되지 않는지)
- [ ] 첫 Tab 에서 좌상단 **"본문 바로가기"** 알약이 보이는지 → Enter 로 본문 이동되는지
- [ ] Tab 만으로 헤더 → 메뉴 탭 → 매장 검색 → 폼 → 푸터 순서대로 도는지 (역순 Shift+Tab 도)
- [ ] 스크린리더(VoiceOver / TalkBack)로 폼 오류가 읽히는지 — 빈 폼 제출 → "성함을 2자 이상…"
- [ ] 메뉴 라이트박스를 열고 **Esc 로 닫은 뒤 포커스가 원래 카드로 돌아오는지**
- [ ] 라이트박스가 열린 상태에서 Tab 을 여러 번 눌러도 **뒤 페이지로 빠져나가지 않는지**
- [ ] 모바일 메뉴를 열면 **첫 링크에 포커스가 잡히는지** (트랜지션 후) · Tab 이 드로어 안에서만 도는지
- [ ] 운영체제 "동작 줄이기"를 켠 상태에서 콘텐츠가 전부 보이는지 (인트로 생략 + 즉시 표시)
- [ ] 실제 손가락으로 지역 필터·지도 보기·동의 체크박스가 눌리는지

---

## 🟢 이미 되어 있는 것

| 항목 | 상태 |
|---|---|
| 사업자 정보 표시 | 푸터 법정 표시 항목(상호·대표자·등록번호·주소·전화) + `Organization` JSON-LD |
| 이미지 최적화 | AVIF/WebP 사본 + `<picture>` + `srcset` + `loading="lazy"` 적용 |
| 히어로 LCP | AVIF preload + `fetchpriority="high"` |
| 메타 · OG | title/description/canonical/OG/Twitter + `og-cover.jpg` (1200×630) |
| 구조화 데이터 | `Restaurant` + `Menu`(가격 8종) + `Organization` + `WebSite` JSON-LD |
| sitemap · robots | `bokmandang.vercel.app` 기준으로 반영됨. admin·api 는 상시 차단 |
| 개인정보처리방침 | `privacy.html` — 폼 동의 항목과 푸터에서 링크됨 |
| 폼 검증 | 성함·연락처·동의 필수 검사, 오류 메시지, 포커스 이동 |
| 폼 전송 | 중복 제출 차단 · 전송 중 표시 · 타임아웃 · 실패 시 재시도 · 허니팟 |
| 통계 | `config.js` 에 ID 넣으면 자동 로드 (안 넣으면 외부 스크립트 0개 유지) |
| 폼 백엔드 | `api/inquiry.js` — 서버 검증·중복차단·허니팟. 키는 서버에만 |
| 일시정지 방지 | `api/keepalive.js` + 매일 03:00 크론 (Supabase 무료 플랜 7일 미사용 정지 대응) |
| 보안 헤더 | `vercel.json` — CSP·HSTS·X-Frame-Options·Referrer-Policy |
| 캐시 정책 | 이미지 1년 immutable · CSS/JS 1주 revalidate · API no-store |
| 함수 리전 | 서울(icn1) — 응답 지연 최소화 + 처리 위치 국내 |
| 국외 이전 고지 | `privacy.html` §5 — Vercel·Supabase 기준 표 작성 |
| 접근성 | 대비 위반 119건 → **0건** · 터치 타깃 44px · 건너뛰기 링크 · 폼 오류 `role="alert"` |
| 모달 접근성 | 라이트박스·드로어 배경 `inert` + `Tab` 가둠 + 닫을 때 포커스 복귀 |
| 손님 동선 | 본점 카드에 길찾기 · 주소 복사 분리 (기존에는 가맹 상담 폼으로 연결돼 있었음) |
| 외부 채널 | `config.js` 의 `links` 에 주소를 넣은 항목만 버튼 생성 |
| 캐시 무효화 | CSS·JS 에 `?v=20260829` — **배포할 때마다 숫자를 올리세요** |
| 인트로 | 세션당 1회만 재생 (`sessionStorage`) |
| 관리자 화면 | `/admin` — **구글 로그인**. 상담 상태·메모 관리 + 매장 목록 편집 |
| 관리자 접근 권한 | `ADMIN_EMAILS` 환경변수에 이메일 추가/삭제로 관리 (쉼표 구분) |
| 링크 미리보기 | OG 이미지 실주소 반영 — 카카오·슬랙·페북 스크래퍼 응답 확인 완료 |
| 등급 표기 | `1++` 전면 삭제 (2026-08-30 발주처 확인 — 사실 아님). 경위는 `CONTENT.md` |
| 검색 | **허용** (미리보기 우선). 되돌리려면 `python tools/set-indexing.py block` |
| GitHub | `ajoohan/Bokmandang` (public) · 푸시는 `python tools/push-to-github.py` |

---

## 참고 — 남은 개선 항목 (오픈 후)

`HANDOFF.md` 의 P1 · P2 를 보세요. 요약하면,
매장 목록 관리자 화면 → 네이버 지도 API 연동 · 지도 임베드 · 배달앱/예약 링크 · 영문 페이지.
