/* 복만당 — 운영 설정
   ─────────────────────────────────────────────────────────────────────────
   코드를 고치지 않고 이 파일의 값만 채우면 동작합니다.
   빌드 과정이 없으므로 이 파일은 그대로 브라우저에 노출됩니다.
   ★ 비밀 키(API secret, 메일 서버 비밀번호 등)를 절대 넣지 마세요. ★
   ───────────────────────────────────────────────────────────────────────── */
window.BOKMANDANG = {

  /* ── 가맹 상담 폼 전송 ──────────────────────────────────────────────────
     form.endpoint 가 비어 있으면 전송하지 않고 완료 화면만 보여줍니다(현재 상태).
     주소를 채우는 순간 실제 전송이 켜집니다.

     mode — 받는 쪽에 맞춰 셋 중 하나를 고르세요.
       'form'   multipart/form-data 로 POST. 응답 상태로 성공을 판정합니다.
                → Formspree, Getform, Basin 등 폼 서비스. **권장**
                  예) endpoint:'https://formspree.io/f/xxxxxxxx', mode:'form'
       'json'   application/json 으로 POST. 응답 상태로 성공을 판정합니다.
                → 자체 API 서버 / Resend·SendGrid 를 감싼 서버리스 함수
                  예) endpoint:'https://api.복만당도메인/inquiry', mode:'json'
       'opaque' no-cors 로 POST. **응답을 읽을 수 없어 실패해도 성공으로 보입니다.**
                → Google Apps Script 웹앱처럼 CORS 헤더를 못 주는 경우만.
                  이 방식을 쓰면 시트에 실제로 쌓이는지 주기적으로 확인해야 합니다.

     Formspree 로 붙이는 절차
       1. formspree.io 가입 → New Form → 받을 메일 주소 지정
       2. 발급된 https://formspree.io/f/XXXXXXXX 를 endpoint 에 붙여넣기
       3. 폼에서 한 번 제출 → 메일함의 확인 링크 클릭 (첫 1회만)
     ──────────────────────────────────────────────────────────────────── */
  form: {
    endpoint: '',
    mode: 'form',
    timeout: 15000,          // ms. 이 시간을 넘기면 실패로 처리합니다.
    subject: '복만당 가맹 상담 신청'   // Formspree 계열의 메일 제목(_subject)
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
