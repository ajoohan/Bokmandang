# 개발 인수인계 — 복만당 웹사이트

이 문서를 먼저 읽고 작업을 시작하세요.

---

## 1. 현재 상태

승인된 **디자인 시안이 실제 동작하는 코드로 구현되어 있습니다.** 목업이 아니라 그대로 배포 가능한 정적 사이트입니다.
남은 일은 새로 만드는 것이 아니라 **비어 있는 연결부를 채우고 미확정 정보를 확정하는 것**입니다.

| 항목 | 상태 |
|---|---|
| 레이아웃 · 디자인 | 완료 (PC / 모바일) |
| 카피 | 대부분 확정, 일부 미확정 (`CONTENT.md` 참조) |
| 이미지 | 실사진 + AVIF/WebP 최적화 완료 |
| 매장 목록 | 7개 매장, 상세 주소·전화번호 미확보 |
| 가맹 문의 폼 | 검증·전송·오류 처리 구현 완료. **받는 주소만 미설정** (`assets/js/config.js`) |
| 개인정보처리방침 | `privacy.html` 작성 · 링크 완료. 사업자 정보 등 일부 값 미확정 |
| 지도 | 네이버 지도 검색 링크로 연결 (임베드 아님) |
| SEO | 메타·OG·JSON-LD·sitemap·robots 완료. **배포 도메인만 미확정** |
| 애널리틱스 | 로더 구현 완료. GA4 측정 ID 미설정 (`assets/js/config.js`) |
| 사업자 정보 | 사업자등록증 기준 반영 완료 (푸터 법정 표시 + `Organization` JSON-LD) |
| 접근성 | 대비·터치타깃·건너뛰기 링크 실측 후 수정 완료. 실기기 검증만 남음 |
| 외부 채널 | 배달앱·예약·밀키트 구매 버튼은 `config.js` 의 `links` 에 주소를 넣으면 자동으로 붙습니다 |

**남은 일은 대부분 값을 채우는 것입니다 → [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md)**

## 2. 기술 결정 (합의됨 — 임의로 바꾸지 마세요)

- **정적 HTML/CSS/바닐라 JS 유지.** React·Vue·빌드 도구·CSS 프레임워크를 도입하지 않습니다.
- **외부 JS 라이브러리 0개.** 모션은 Web Animations API + IntersectionObserver로 직접 구현되어 있습니다. GSAP·Framer Motion 등을 추가하지 마세요.
- 외부 리소스는 **폰트 2개뿐** — Pretendard(jsDelivr), Cormorant(Google Fonts).
- 디자인 값은 전부 `style.css` 최상단 `:root` CSS 변수로 관리합니다. 하드코딩된 색·간격을 새로 만들지 마세요.
- `prefers-reduced-motion` 대응이 전 구간에 들어가 있습니다. 새 애니메이션을 추가할 때도 유지하세요.

## 3. 해야 할 일 (우선순위 순)

### P0 — 오픈 전 반드시

1. ~~**가맹 상담 폼 백엔드 연결**~~ → **구현 완료. 받는 주소만 넣으면 됩니다.**
   - 설정: `assets/js/config.js` → `BOKMANDANG.form.endpoint` / `.mode`
   - 로직: `assets/js/main.js` → `/* ══════ 가맹 상담 폼 ══════ */` 블록
   - `endpoint` 가 비어 있으면 전송하지 않고 완료 화면만 보여줍니다(현재 상태).
   - 검증 · 중복 제출 차단 · 전송 중 표시 · 타임아웃 · 실패 시 재시도 · 허니팟 포함.
   - Formspree(`form`) · 자체 API(`json`) · Apps Script(`opaque`) 세 방식을 지원합니다.
2. ~~**개인정보처리방침 페이지**~~ → **`privacy.html` 작성 완료.** 폼 동의 항목과 푸터에서 링크됨.
   - ⚠️ 사업자 정보 · 보호책임자 · 보유 기간 · 위탁 수탁자는 **발주처 확인 필요** (파일 상단 주석 참조).
3. **매장 상세 정보 채우기** — `assets/data/stores.js`의 주소·전화번호. 현재 동(洞) 단위까지만 있음. ← 미완
4. **영업시간 확정** — 지점별로 다름. `index.html` 본점 카드 + `stores.js`. ← 미완
5. ~~**이미지 최적화**~~ → **완료.** JPEG 원본은 그대로 두고 AVIF/WebP 사본을 추가했습니다.
   - 변환: `python tools/optimize-images.py` (Pillow 필요. 사이트 구동에는 불필요한 일회성 도구)
   - 마크업: 정적 이미지는 `<picture>`, JS 생성 이미지는 `picHTML()` / `setGal()` 을 거칩니다.
   - 넓은 사진은 800px 축소본(`-800`), 갤러리 썸네일은 240px 축소본(`-240`)을 함께 씁니다.
   - 히어로는 lazy 제외 + AVIF preload + `fetchpriority="high"`.
6. ~~**메타/SEO**~~ → **완료.** OG 이미지(`assets/img/og-cover.jpg`, `tools/make-og-image.py` 로 생성) ·
   `sitemap.xml` · `robots.txt` · `Restaurant`+`Menu`+`WebSite` JSON-LD · GA4 로더(`config.js`).
   - ⚠️ **배포 도메인이 정해지면 `python tools/set-site-url.py https://도메인` 한 번 실행하세요.**

### P1 — 오픈 직후

7. ~~**매장 목록 운영 고도화**~~ → **2단계까지 완료.**
   - 1단계: `stores.js` 직접 수정 — 지금은 **오프라인 폴백**으로만 남았습니다.
   - 2단계(현재): 관리자 화면 `/admin` → Supabase `stores` → `/api/stores` → 사이트.
     `/api/stores` 가 실패하면 `{rows:null}` 을 돌려주고 사이트는 `stores.js` 로 되돌아갑니다.
   - 3단계: 네이버 지도 API 연동으로 지점·영업시간 자동 동기화. API 키 발급과 승인 필요.
   - **설계 시 주의**: `main.js`의 매장 목록 렌더 함수는 `STORES` 배열 하나만 참조합니다. 데이터 출처만 바꾸면 UI 수정이 필요 없습니다.

   **팝업 · 홈페이지 문구** (2026-09-02 추가)
   - `/admin` → 팝업 탭. **띠배너**(화면 맨 위 한 줄)와 **모달**(가운데) 두 가지입니다.
     같은 형태가 여러 개면 순서가 앞선 것 하나만 뜹니다 — 겹치면 아무것도 안 읽힙니다.
   - 노출 기간은 **서버에서** 거릅니다(`api/site.js`). 브라우저 시계는 믿지 않습니다.
     PostgREST 는 `or=` 를 두 번 넘기면 하나만 먹어서, 기간 비교는 코드에서 합니다.
   - 모달은 인트로 커튼이 끝난 뒤(`body.loaded`) 뜹니다. 커튼 위에 겹치면 둘 다 안 읽힙니다.
   - 띠배너가 뜨면 `body.has-band` 가 붙고 `--band-h` 만큼 헤더와 본문을 내립니다.
     문구가 길어 두 줄이 되는 경우까지 맞추려고 실제 높이를 재서 넣습니다.
   - "오늘 하루 보지 않기" 는 `localStorage` 에만 남습니다(그 브라우저 한정).
   - 문구는 `api/admin/settings.js` 의 **ALLOWED 에 적힌 키만** 저장합니다.
     새 문구를 열려면 ALLOWED 와 `index.html` 의 `data-t` 를 **함께** 추가하세요.
     ⚠️ 히어로 제목은 `splitLines()` 가 줄 단위로 쪼개 놓은 상태입니다.
     그냥 textContent 를 바꾸면 구조가 깨지므로 `setText()` 가 다시 쪼갭니다.
   - 외부 채널 주소도 여기서 관리합니다. `config.js` 의 `links` 보다 우선합니다.
     `drawLinks()` 는 다시 그릴 수 있어야 하므로 요소를 remove 하지 않고 비우고 감춥니다.

   **관리자 메뉴 관리** (2026-09-02 추가)
   - `/admin` → 메뉴 관리 탭. 메뉴명·가격·설명·분류·배지·사진·게시 여부를 다룹니다.
   - 사진은 **브라우저에서 캔버스로 1600px JPEG 으로 줄여** 올립니다.
     서버에서 줄이려면 sharp 같은 의존성이 필요한데 이 프로젝트는 의존성 없이 굴러가는 게 원칙입니다.
   - 올린 사진은 Supabase Storage `menu-photos` 버킷(Public)에 들어가고,
     `menus.image_url` 에 공개 주소가 저장됩니다.
     ⚠️ 버킷이 없으면 업로드가 502 로 떨어집니다 — Supabase → Storage 에서 만들어 주세요.
   - 사이트는 `/api/menu` 로 목록을 받고, 실패하면 `main.js` 의 기본 MENU 배열로 그립니다.
   - `image_url` 이 있으면 그 주소를 그대로 `<img>` 로 씁니다(AVIF/WebP 사본이 없으므로 `<picture>` 를 안 씁니다).
     비어 있으면 저장소의 `image_key` 로 기존 `<picture>` 경로를 씁니다.
   - CSP `img-src` 에 `https://*.supabase.co` 가 있어야 사진이 보입니다.

   **관리자 매장 편집 동작** (`admin.html` · `assets/js/admin.js`)
   - 행은 평소 읽기 전용입니다. `[수정]` → 폼이 열리고 `[저장]` 을 눌러야 서버로 갑니다.
   - **순서**는 화면에 보이는 대로 1부터입니다. ▲▼ 로 옮기면 `sort` 를 1..N 으로 다시 매깁니다.
   - **지역**은 주소 앞머리로 자동 판정합니다(`서울` / `경기` / 그 외 `지방`).
     사이트 필터 버튼이 셋뿐이라 인천·부산 등은 모두 `지방` 입니다 — 버튼을 늘리려면
     `admin.js` 의 `regionOf()` 와 `api/admin/stores.js` 의 `REGIONS` 를 함께 고치세요.
   - **주소 검색**은 카카오(다음) 우편번호 서비스를 **별도 창**으로 엽니다.
     ⚠️ 페이지 안에 iframe 으로 넣으면 그 문서(about:blank)가 우리 CSP 를 그대로 물려받아
     내부 리소스가 전부 막힙니다. 임베드로 되돌리지 마세요.
     `vercel.json` 의 CSP `script-src` 에 `https://t1.daumcdn.net` 이 있어야 합니다.
     (경로별 헤더 규칙 `source: "/admin"` 은 이 프로젝트에서 적용이 들쭉날쭉해 전역 규칙에 두었습니다.)
8. **지도 임베드** — 현재 각 매장의 "지도 보기"는 `map.naver.com/p/search/복만당+<지점명>`으로 새 창을 엽니다. 본점 카드에 지도 임베드 추가 검토.
9. ~~**외부 채널 연결**~~ → **자리 구현 완료. 주소만 넣으면 됩니다.**
   `config.js` → `links` 에 `naverPlace` `reserve` `baemin` `coupangeats` `yogiyo` `kitShop`.
   **주소를 넣은 항목만** 버튼으로 그려지고, 비어 있으면 요소 자체를 지웁니다(빈 버튼이 남지 않음).
   본점 카드의 `길찾기 · 예약 문의` 버튼은 가맹 상담 폼으로 가고 있었습니다 —
   손님 동선(길찾기 / 주소 복사)과 가맹 문의를 분리했습니다.
10. ~~**접근성 최종 점검**~~ → **자동 점검 완료. 실기기 검증만 남음.**
    - 명도 대비 위반 **119건 → 0건**. 토큰을 고쳤으니 `DESIGN.md` 컬러 표를 먼저 보세요.
      `--mute-2` `#938B7D`→`#797162` · `--gold-t` / `--gold-d` / `--num-l` 신설.
    - 터치 타깃 44×44 미달 항목 전부 보정 (헤더·푸터 링크, 탭, 지역 필터, 지도 보기, 동의 체크박스).
    - `.sr` 건너뛰기 링크가 포커스해도 안 보이던 문제 수정 (`.sr:focus`).
    - **모달 포커스 가둠 추가** — 라이트박스·드로어가 열린 동안 배경에 `inert`, `Tab` 순환.
      이 과정에서 라이트박스가 `<main>` 안에 있어 배경을 잠그면 자기 자신도 비활성화되는 문제를
      발견해 `<body>` 직속으로 옮겼습니다. **모달은 `<main>` 밖에 두세요.**
    - 자동 점검 통과 ≠ 사용 가능. **남은 것은 실기기 확인** — `LAUNCH_CHECKLIST.md` 7번.

### P2 — 이후

11. 다국어 (영어 우선 — 외국인 관광객 대응)
12. 소식/보도자료 섹션
13. 밀키트 온라인 판매 연동

## 4. 절대 하지 말 것

- **`CONTENT.md`에 "확인 필요"로 표시된 문구를 확정된 사실처럼 쓰지 마세요.** 영업시간, 창업 비용 구간, 슈퍼바이저 지원 기간 등은 발주처 확인 전 임시값입니다.
- 매장 주소·전화번호를 추측해서 채우지 마세요.
- **`privacy.html` 의 사업자 정보·보호책임자·보유 기간을 임의로 확정하지 마세요.** 법적 고지 사항입니다.
- **`assets/js/config.js` 에 비밀 키를 넣지 마세요.** 빌드 과정이 없어 그대로 브라우저에 노출됩니다.
- 인용 문구를 실존 인물의 발언으로 표기하지 마세요.
- 이미지 파일명을 바꾸지 마세요 (CSS·JS·HTML 세 곳에서 참조).

## 4-1. 저장소 · 배포

| | |
|---|---|
| GitHub | `ajoohan/Bokmandang` · **public** · 기본 브랜치 `main` |
| GitHub (사본) | `bokmandang/homepage` · public · 같은 내용을 담아 둔 공개 사본 |
| Vercel | `bokmandang/bokmandang` (복만당 계정 `bokmandangmkt-2267`) · 함수 리전 서울(icn1) |
| Supabase | `yxhuyreepsulvxzsldca` (PLUSTONIC 조직과 **다른 계정** — 인수인계 시 소유자 확인) |

**저장소 루트 = 이 폴더의 내용물입니다.** `index.html` 이 최상단에 있어
Vercel 의 Root Directory 를 비워 둔 채로 그대로 붙습니다.

### 도메인 두 개가 같은 파일을 내려줍니다

| 주소 | 쓰임 |
|---|---|
| `bokmandang.co.kr` | **대표 도메인**. 한국어. canonical·og·JSON-LD·sitemap 기준 |
| `bokmandang.com` | 외국어 랜딩. 처음 들어오면 `i18n.js` 가 영어로 엽니다 |

리다이렉트가 아니라 **같은 파일을 두 주소가 함께 서빙합니다.** 그래서
`.com` 에서도 canonical 이 `.co.kr` 을 가리키면 검색엔진이 `.com` 을 중복으로
묶어 **외국어 페이지를 통째로 색인에서 뺍니다.** `i18n.js` 의 `seo()` 가
자기 도메인을 canonical 로 다시 쓰고, hreflang 은 한국어를 `.co.kr`,
나머지를 `.com` 으로 보냅니다. 로컬·미리보기 주소에서는 손대지 않습니다.

도메인이 또 바뀌면 정적 파일 쪽은 한 줄로 바꿉니다.

```bash
python tools/set-site-url.py https://새주소
```

`i18n.js` 의 `KO_HOST` · `INTL_HOST` 두 상수도 함께 고쳐야 합니다.
스크립트는 거기까지 손대지 않습니다.

⚠️ **도메인을 바꾸면 Google OAuth 원본도 함께 고쳐야 합니다.** 관리자 로그인은
페이지를 연 주소를 검사해서, 등록되지 않은 주소면 `400 origin_mismatch` 로 막힙니다.
사이트는 멀쩡한데 관리자만 안 들어가지므로 원인을 찾기 어렵습니다.

Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID →
**승인된 JavaScript 원본**. 리디렉션 URI 가 아닙니다. 경로와 끝 슬래시 없이 도메인만 넣습니다.
현재 등록: `bokmandang.co.kr` · `www.bokmandang.co.kr` · `bokmandang.com` ·
`www.bokmandang.com` · `bokmandang.vercel.app`

### 관리자 로그인만 PLUSTONIC 조직에 있습니다

나머지(GitHub · Vercel · Supabase · Resend · 가비아)는 모두 복만당 계정입니다.
관리자 로그인의 OAuth 클라이언트만 **PLUSTONIC 조직의 Google Cloud 프로젝트**에
있습니다(`jin@plustonic.com` 으로 관리). **2026-09-03 당분간 이대로 쓰기로 했습니다.**

알아 둘 점 — 그 프로젝트가 없어지거나 계정 접근이 막히면 **관리자 로그인이 끊깁니다**
(사이트와 상담 접수는 계속 돕니다). 옮기려면 복만당 Google 계정에서 OAuth 클라이언트를
새로 만들고 위 원본들을 등록한 뒤, Vercel 의 `GOOGLE_CLIENT_ID` 만 바꾸면 됩니다.
코드는 고칠 게 없습니다.

### 로컬 폴더 구조가 저장소와 다릅니다 ⚠️

작업용 로컬 저장소는 한 단계 위(`D:okmandang`)에 있고 이 폴더는 그 하위입니다.
그래서 **평범한 `git push` 로는 안 올라갑니다.** 아래 한 줄로 미세요.

```bash
python tools/push-to-github.py
```

`git subtree push` 는 원격에 병합 커밋이 한 번이라도 생기면
`non-fast-forward` 로 거부됩니다. 위 스크립트는 분리 → 원격 tip 을 부모로 얹기 →
일반 push 순으로 처리해서 **force push 없이** 매번 통과합니다.
원격 이력이 사라지지 않습니다.

### ⚠️ Vercel 계정에 GitHub 이 연결돼 있어야 합니다

Vercel **Hobby 는 프로젝트 소유자의 커밋만 배포합니다.** 계정에 GitHub 이
연결돼 있지 않으면 푸시는 성공하는데 배포가 조용히 `Blocked` 로 멈춥니다.
목록에는 이유가 안 뜨고, Redeploy 창을 열어야 아래 문구가 보입니다.

> The Deployment was blocked because the commit author does not have
> contributing access to the project on Vercel.

확인 위치 — Vercel → 계정 설정 → Authentication → **GitHub** 이 연결됨 상태여야 합니다.
(이 프로젝트에서 20시간 넘게 배포가 막혔던 원인입니다.)

### ⚠️ 커밋 작성자를 바꾸지 마세요

Vercel **Hobby 플랜은 프로젝트 소유자가 아닌 사람이 만든 커밋을 배포하지 않습니다.**

> The Deployment was blocked because the commit author does not have
> contributing access to the project on Vercel.

작성자가 다르면 GitHub 푸시는 성공하는데 Vercel 에서 조용히 `Blocked` 로 멈춥니다.
목록에 이유가 표시되지 않고, Redeploy 창을 열어야 위 문구가 보입니다.

이 저장소는 아래 값으로 고정해 두었습니다.

```bash
git log -1 --format='%an <%ae>'
```

담당자가 바뀌면 **그 사람의 GitHub 이메일로 바꾸고, 그 계정이 Vercel 프로젝트
소유자이거나 Pro 팀 멤버여야** 합니다. Hobby 는 팀 협업을 지원하지 않습니다.

### 배포

CLI 로 직접 올릴 때는 **이 폴더 안에서** 실행합니다.

```bash
npx vercel deploy --prod
```

GitHub 연동(자동배포)을 붙이면 Root Directory 는 **비워 두세요.** 저장소 루트가
곧 사이트 루트입니다.

`.vercelignore` 가 내부 문서(`*.md`)·`tools/`·`supabase/`·`brand/`·`build/` 를
배포에서 제외합니다. **이 파일이 없으면 `https://도메인/CONTENT.md` 로 미확정 값이
그대로 열립니다.** 새 내부 문서를 추가하면 여기도 함께 확인하세요.

## 5. 코드 지도

### `index.html`
섹션마다 `id`가 붙어 있고 네비게이션·스크롤 스파이가 이 `id`를 참조합니다.
`#top #brand #band #menu #kit #store #franchise #contact`

### `assets/css/style.css`
1. `:root` 디자인 토큰 → 2. 타이포 → 3. 섹션 골격 → 4. 헤더/버튼 → 5. 섹션별 스타일 → 6. 모션 → 7. 미디어 쿼리
브레이크포인트는 **1080px**(레이아웃 1단 전환·모바일 메뉴)과 **760px**(모바일 전용 UI), **640px**(초소형)입니다.

### `assets/js/main.js`
| 블록 | 역할 |
|---|---|
| `anim()` / `inView()` | 모션 엔진. 같은 속성을 잡은 이전 애니메이션을 자동 취소합니다 |
| 등장 모션 등록 | `.rv` 클래스가 붙은 요소를 자동으로 스크롤 등장 처리 |
| 메뉴 | `MENU` 배열 → 카드 렌더 + 탭 필터 + 라이트박스 |
| 매장 | `STORES`(외부 파일) → 목록 렌더 + 검색 + 지역 필터 |
| 인트로 | 로고 3글자 순차 등장 → 커튼 |
| 스크롤 루프 | 헤더 숨김·진행바·패럴랙스·현재 섹션 하이라이트 |
| 모바일 | 하단 액션바 · 메뉴 캐러셀 |

**새 섹션을 추가할 때**: 마크업에 `.rv`만 붙이면 등장 모션이 자동 적용됩니다. JS 수정 불필요.

### `assets/data/stores.js`
`window.STORES` 배열. 파일 상단 주석에 필드 설명이 있습니다.

### `assets/js/config.js`
운영값(폼 엔드포인트 · 외부 채널 주소 · GA4 ID)만 모아 둔 파일.
**코드를 고치지 않고 여기 값만 채우면 동작합니다.** 비밀 키는 절대 넣지 마세요.

### `assets/js/i18n.js` + `i18n-en.js` · `-cn.js` · `-jp.js` — 다국어
헤더 우측의 KR / EN / CN / JP 전환입니다. 원래 '가맹 상담 신청' 버튼이 있던
자리이고, 상담 버튼은 히어로·플로팅 바·창업안내에 남아 있습니다.

**한국어 원문이 그대로 열쇠입니다.** HTML 에 `data-i` 를 300여 곳에 다는 대신
화면의 글을 훑어 사전에서 찾아 바꿉니다. 그래서 **문구를 고치면 사전의 열쇠도
같이 고쳐야 합니다.** 안 고치면 그 문장만 한국어로 남습니다(화면은 깨지지 않습니다).

⚠️ **`i18n.js` 는 `main.js` 보다 먼저 실행돼야 합니다.** `main.js` 가 제목을
글자 단위 `<span>` 으로 쪼개 애니메이션을 걸기 때문에, 그 뒤에 바꾸면 구조가
깨집니다. `index.html` 의 script 순서를 바꾸지 마세요.

JS 가 나중에 그리는 것은 `BM_I18N.apply(요소)` 로 한 번 더 태웁니다.
문장을 조합해 만드는 값(라이트박스 캡션, `aria-label`)은 `main.js` 의 `T()` 로
조각마다 번역합니다 — 통짜 문장은 사전에 없기 때문입니다.
탭 제목과 검색 설명은 `<head>` 라 `walk` 가 못 훑어서 `seo()` 가 따로 바꿉니다.

**번역하지 않는 것** — 매장 주소·지점명(`data-no-i18n`. 번역하면 찾아갈 수
없습니다), 개인정보처리방침(법적 효력이 있는 문서), 관리자 화면과 관리자가 넣은
내용, `og:*`(링크 미리보기를 긁는 쪽은 JS 를 돌리지 않아 바꿔도 소용없습니다).

언어는 `?lang=` → 저장된 선택(`localStorage['bm.lang']`) → 도메인
(`bokmandang.com` 은 영어) → 한국어 순으로 정합니다.

### 캐시 무효화
CSS·JS 는 `?v=20260829` 쿼리를 달고 있습니다. 빌드 해시가 없는 정적 사이트라
**파일을 고치고 배포할 때 이 숫자를 함께 올리지 않으면 방문자에게 옛 파일이 남습니다.**
`index.html` · `privacy.html` 두 곳에 있습니다.

### 인트로 커튼
`sessionStorage['bm.intro']` 로 **세션당 1회**만 재생합니다. 탭을 닫으면 초기화됩니다.
다시 매번 재생하려면 `main.js` 인트로 블록의 `seen` 검사를 지우세요.

### `privacy.html`
개인정보처리방침. `index.html` 과 CSS를 공유하지만 **JS는 불러오지 않습니다**
(`main.js` 는 `index.html` 전용 요소를 참조하므로 그대로 붙이면 오류가 납니다).
문서 페이지용 스타일은 `style.css` 8번째 블록 `/* 9. 문서 페이지 */` 에 있습니다.

### `tools/` — 일회성 스크립트 (사이트 구동에 불필요, 빌드 단계 아님)
| 스크립트 | 역할 |
|---|---|
| `optimize-images.py` | JPEG → AVIF/WebP 사본 + 축소본 생성. 사진을 교체·추가하면 한 번 실행 |
| `make-og-image.py` | 공유 카드 이미지(`og-cover.jpg`) 생성 |
| `set-site-url.py` | placeholder 도메인을 실제 도메인으로 일괄 치환 |

모두 Python 3 + Pillow 만 있으면 됩니다 — `pip install Pillow`

## 6. 알려진 제약

- 이미지가 JPEG 원본이라 첫 로딩이 무겁습니다 (총 1.3MB). P0-5 최적화 전까지는 LCP가 목표치(2.5초)를 넘길 수 있습니다.
- 커스텀 커서는 마우스 환경에서만 동작합니다 (터치 기기 자동 비활성).
- 인트로 커튼은 첫 방문마다 재생됩니다. 세션당 1회로 제한하려면 `sessionStorage` 처리를 추가하세요.
