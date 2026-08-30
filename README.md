# 복만당 웹사이트

한우곰탕 프랜차이즈 **복만당(BOKMANDANG)** 공식 웹사이트.
빌드 도구 없이 동작하는 정적 사이트입니다. (HTML + CSS + 바닐라 JS)

## 실행

```bash
# 아무 정적 서버나 사용 (그냥 index.html 더블클릭해도 동작합니다)
npx serve .
# 또는
python3 -m http.server 8000
```

의존성 설치, 빌드, 번들링 과정이 없습니다. 파일을 고치면 새로고침으로 바로 확인됩니다.

## 폴더 구조

```
bokmandang-web/
├── index.html              전체 페이지 (단일 페이지 구조)
├── privacy.html            개인정보처리방침 (JS 없이 CSS만 사용)
├── sitemap.xml
├── robots.txt
├── assets/
│   ├── css/style.css       디자인 토큰 + 전체 스타일
│   ├── js/main.js          모션 엔진 + 인터랙션 + 폼
│   ├── js/config.js        ★ 운영 설정 — 폼 받는 주소 · GA4 ID
│   ├── data/stores.js      ★ 매장 목록 데이터 (여기만 고치면 반영)
│   └── img/                원본 JPEG/PNG + AVIF/WebP 사본 + og-cover.jpg
├── tools/                  일회성 스크립트 (사이트 구동에는 불필요)
│   ├── optimize-images.py  JPEG → AVIF/WebP 변환
│   ├── make-og-image.py    공유 카드 이미지 생성
│   └── set-site-url.py     배포 도메인 일괄 치환
├── LAUNCH_CHECKLIST.md     ★ 오픈 전 남은 일 — 발주처 확인 항목 포함
├── HANDOFF.md              ★ 개발 인수인계 — 먼저 읽으세요
├── DESIGN.md               디자인 시스템 스펙
└── CONTENT.md              전체 카피 원문 + 확정/미확정 구분
```

`tools/` 는 사진을 교체하거나 도메인이 정해졌을 때만 돌리면 됩니다 (Python 3 + Pillow).
평소 개발에는 필요 없습니다 — 여전히 빌드 도구 없이 파일만 고치면 됩니다.

## 페이지 구성

단일 페이지 · 6개 섹션 — 히어로 → 01 브랜드 → 인용 배너 → 02 메뉴 → 03 밀키트 → 04 매장안내 → 05 창업안내 → 06 가맹문의

## 배포

정적 호스팅 어디든 그대로 올라갑니다. 루트를 이 폴더로 지정하면 끝입니다.

> ⚠️ **올리기 전에** — 배포 도메인이 정해졌다면 아래를 한 번 실행하세요.
> canonical · OG · sitemap 의 placeholder 도메인이 실제 주소로 바뀝니다.
> ```bash
> python tools/set-site-url.py https://실제도메인
> ```
> 그 밖에 오픈 전 남은 항목은 `LAUNCH_CHECKLIST.md` 에 정리되어 있습니다.

- **Vercel** — `vercel --prod` (설정 파일 불필요)
- **Netlify** — 폴더 드래그앤드롭
- **Cloudflare Pages / GitHub Pages** — 빌드 명령 없음, 출력 디렉터리 `/`

## 브라우저 지원

Chrome / Edge / Safari / Firefox 최신 2개 버전.
`clip-path`, Web Animations API, `backdrop-filter`, CSS `translate` 속성을 사용합니다.
`prefers-reduced-motion` 설정 시 모든 모션이 자동으로 꺼집니다.

사진은 `<picture>` 로 **AVIF → WebP → JPEG** 순으로 고릅니다.
지원 대상 브라우저는 모두 AVIF 또는 WebP를 지원하므로 JPEG는 사실상 예비용입니다.
