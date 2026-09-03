/* 가맹 상담이 들어오면 담당자에게 메일을 보냅니다.
 * 파일명이 _ 로 시작하므로 Vercel 이 라우트로 만들지 않습니다 (import 전용).
 *
 * 필요한 Vercel 환경변수
 *   RESEND_API_KEY    Resend(resend.com) API 키. 없으면 메일을 보내지 않고 조용히 넘어갑니다
 *   NOTIFY_TO         받는 주소. 기본 bokmandang.mkt@gmail.com (쉼표로 여러 개 가능)
 *   NOTIFY_FROM       보내는 주소. 기본 onboarding@resend.dev
 *                     지금은 '복만당 <alert@send.bokmandang.co.kr>' 로 넣어 두었습니다.
 *                     send.bokmandang.co.kr 은 Resend 에 인증된 발신 도메인입니다
 *                     (DKIM·SPF·MX·DMARC 를 가비아 DNS 에 등록해 두었습니다).
 *                     ↳ 기본값(onboarding@resend.dev)으로 돌아가면 Resend 계정 주인의
 *                       주소로만 배달됩니다. 받는 사람을 늘리려면 NOTIFY_FROM 이 필요합니다.
 *                     ⚠️ 환경변수를 고치면 새로 배포해야 반영됩니다 (빌드 시점에 박힙니다).
 *
 * ★ 메일 전송이 실패해도 접수는 성공입니다.
 *   손님 입장에서 신청은 이미 저장됐는데 메일 때문에 실패로 보이면 안 됩니다.
 */
const ENDPOINT = 'https://api.resend.com/emails';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 숫자만 오면 엑셀·메일에서 읽기 어려우니 보기 좋게 끊습니다 */
function prettyPhone(v) {
  const d = String(v ?? '').replace(/[^0-9]/g, '');
  if (d.startsWith('02')) {                       // 서울은 국번이 두 자리
    if (d.length === 10) return `02-${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 9)  return `02-${d.slice(2, 5)}-${d.slice(5)}`;
  }
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return String(v ?? '');
}

const row = (k, v) => v
  ? `<tr><th align="left" style="padding:9px 16px 9px 0;color:#797162;font-weight:600;white-space:nowrap;vertical-align:top">${k}</th>
       <td style="padding:9px 0;color:#14120F;line-height:1.7">${esc(v)}</td></tr>`
  : '';

export async function notifyInquiry({ name, phone, region, budget, message }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: 'RESEND_API_KEY 없음' };

  const to = (process.env.NOTIFY_TO || 'bokmandang.mkt@gmail.com')
    .split(',').map(s => s.trim()).filter(Boolean);
  const from = process.env.NOTIFY_FROM || '복만당 <onboarding@resend.dev>';

  const when = new Date(Date.now() + 9 * 3600 * 1000)   // 한국 시각
    .toISOString().replace('T', ' ').slice(0, 16);
  const tel = prettyPhone(phone);

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;
      max-width:560px;margin:0 auto;padding:28px 24px;color:#14120F">
    <p style="font-size:11px;letter-spacing:.16em;color:#856839;margin:0 0 8px">복만당 가맹 상담</p>
    <h1 style="font-size:20px;letter-spacing:-.03em;margin:0 0 4px">${esc(name)} 님이 상담을 신청했습니다</h1>
    <p style="font-size:13px;color:#6B6459;margin:0 0 22px">${when} 접수</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;
        border-top:1px solid #E5DFD4;border-bottom:1px solid #E5DFD4">
      ${row('연락처', tel)}
      ${row('희망 지역', region)}
      ${row('예산', budget)}
      ${row('문의 내용', message)}
    </table>
    <p style="margin:24px 0 0">
      <a href="https://bokmandang.vercel.app/admin"
         style="display:inline-block;background:#14120F;color:#FAF8F4;text-decoration:none;
                padding:13px 22px;border-radius:8px;font-size:13px;font-weight:600">관리자에서 열기</a>
    </p>
    <p style="font-size:12px;color:#797162;line-height:1.7;margin:22px 0 0">
      이 메일에는 신청자의 개인정보가 담겨 있습니다. 업무 목적으로만 쓰고 외부로 전달하지 마세요.
    </p>
  </div>`;

  const text = [
    `복만당 가맹 상담 — ${name} 님`, `접수: ${when}`, '',
    `연락처: ${tel}`,
    region  ? `희망 지역: ${region}` : '',
    budget  ? `예산: ${budget}` : '',
    message ? `문의 내용: ${message}` : '',
    '', '관리자: https://bokmandang.vercel.app/admin'
  ].filter(Boolean).join('\n');

  /* 메일 서버가 느려도 접수 응답이 늦어지면 안 되므로 8초에서 끊습니다 */
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to,
        subject: `[복만당 가맹상담] ${name} 님 · ${tel}`,
        reply_to: to[0],
        html, text
      }),
      signal: ac.signal
    });
    if (!r.ok) {
      console.error('상담 알림 메일 실패', r.status, (await r.text()).slice(0, 300));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('상담 알림 메일 예외', e.name === 'AbortError' ? '시간 초과' : e.message);
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}
