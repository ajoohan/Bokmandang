/* 복만당 — 운영 설정
   ─────────────────────────────────────────────────────────────────────────
   코드를 고치지 않고 이 파일의 값만 채우면 동작합니다.
   빌드 과정이 없으므로 이 파일은 그대로 브라우저에 노출됩니다.
   ★ 비밀 키(API secret, 메일 서버 비밀번호 등)를 절대 넣지 마세요. ★
   ───────────────────────────────────────────────────────────────────────── */
window.BOKMANDANG = {

  /* ── 가맹 상담 폼 전송 ──────────────────────────────────────────────────
     브라우저는 우리 서버(/api/inquiry)만 호출하고, 그 함수가 Supabase 에 넣습니다.
     Supabase 키는 Vercel 환경변수로만 존재해 브라우저에 내려가지 않습니다.

       브라우저 ──POST /api/inquiry──> Vercel 함수 ──service_role──> Supabase
                                       (검증 · 중복차단 · 허니팟)

     Vercel 프로젝트 설정에 아래 환경변수가 있어야 실제로 저장됩니다.
       SUPABASE_URL          https://xxxx.supabase.co
       SUPABASE_SERVICE_KEY  service_role 키   ★ 이 파일에 쓰지 마세요 (브라우저에 노출됩니다)
       SUPABASE_TABLE        기본 inquiries (다른 스키마면 "bokmandang.inquiries")

     endpoint 를 비우면 전송하지 않고 완료 화면만 보여줍니다(로컬 확인용).
     방식을 갈아탈 때는 mode 를 바꾸세요 —
       'json'   application/json POST (현재. 자체 API·서버리스 함수)
       'form'   multipart/form-data POST (Formspree 등 폼 서비스)
       'opaque' no-cors POST (Google Apps Script. 성공/실패를 알 수 없습니다) */
  form: {
    endpoint: '/api/inquiry',
    mode: 'json',
    timeout: 15000,          // ms. 이 시간을 넘기면 실패로 처리합니다.
    subject: '복만당 가맹 상담 신청'   // Formspree 계열('form' 모드)의 메일 제목
  },

  /* ── 외부 채널 ──────────────────────────────────────────────────────────
     주소를 넣은 항목만 화면에 버튼으로 나타납니다. 비워 두면 아예 그리지 않습니다.
     (없는 채널 때문에 빈 버튼이 남지 않도록 만들어 두었습니다.)

     naverPlace  본점 네이버 플레이스   예) https://naver.me/xxxxxxxx
     reserve     네이버 예약           예) https://booking.naver.com/booking/...
     baemin/coupangeats/yogiyo  배달앱 매장 페이지
     kitShop     밀키트 온라인 구매처   예) 스마트스토어 주소
     ⚠️ 각 채널의 '본점' 주소인지 확인하고 넣으세요. */
  links: {
    naverPlace:  '',
    reserve:     '',
    baemin:      '',
    coupangeats: '',
    yogiyo:      '',
    kitShop:     ''
  },

  /* ── 방문 통계 ──────────────────────────────────────────────────────────
     ga4 에 측정 ID(G-XXXXXXXXXX)를 넣으면 gtag.js 를 자동으로 불러옵니다.
     비워 두면 외부 스크립트를 전혀 불러오지 않습니다.
     ⚠️ 통계 도구를 켜면 쿠키를 사용하게 되므로,
        privacy.html §10(자동 수집 장치) 문구도 함께 수정해야 합니다. */
  ga4: ''
};
