/* 관리자 로그인
 *
 * 두 가지 방식을 지원합니다. 환경변수가 있는 것만 활성화됩니다.
 *
 *  ① Google 로그인 (권장)   GOOGLE_CLIENT_ID + ADMIN_EMAILS
 *     브라우저가 Google 에서 받은 ID 토큰을 보내면, 서버가 Google 에
 *     직접 확인하고 허용 목록에 있는 이메일인지 검사합니다.
 *     비밀번호를 나눠 가질 필요가 없고, 누가 들어왔는지 로그에 남습니다.
 *
 *  ② 비밀번호 (예비)        ADMIN_PASSWORD
 *     Google 설정이 잘못됐을 때를 대비한 예비 수단입니다.
 *     ①이 동작하면 이 환경변수는 지우는 편이 안전합니다.
 *
 * 어느 쪽이든 통과하면 같은 세션 쿠키를 발급합니다.
 */
import { timingSafeEqual, createHash } from 'node:crypto';
import { issueSession, setCookie, readBody } from '../_lib.js';

const sha = s => createHash('sha256').update(String(s)).digest();
const emails = () => (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

/* Google ID 토큰 검증 — Google 의 공식 확인 엔드포인트를 씁니다.
   서명·만료·발급자를 Google 이 검사해 주고, 우리는 aud 와 이메일만 확인하면 됩니다. */
async function verifyGoogle(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return { error: 'Google 로그인이 설정되지 않았습니다.' };
  let info;
  try {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' +
                          encodeURIComponent(credential));
    if (!r.ok) return { error: '구글 인증에 실패했습니다.' };
    info = await r.json();
  } catch (e) {
    console.error('구글 토큰 확인 실패', e);
    return { error: '구글 인증 서버에 연결하지 못했습니다.' };
  }
  if (info.aud !== clientId)            return { error: '이 사이트용 로그인이 아닙니다.' };
  if (info.email_verified !== 'true' && info.email_verified !== true)
                                        return { error: '이메일이 확인되지 않은 계정입니다.' };
  const email = String(info.email || '').toLowerCase();
  const allow = emails();
  if (!allow.length)                    return { error: '허용된 관리자 이메일이 지정되지 않았습니다.' };
  if (!allow.includes(email))           return { error: `${info.email} 은(는) 관리자로 등록되어 있지 않습니다.` };
  return { email };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 만 허용합니다.' });
  }
  if (!process.env.ADMIN_SECRET)
    return res.status(500).json({ error: '관리자 기능이 설정되지 않았습니다. ADMIN_SECRET 을 넣어 주세요.' });

  const body = readBody(req);

  // ① Google
  if (body.credential) {
    const { email, error } = await verifyGoogle(body.credential);
    if (error) { await new Promise(r => setTimeout(r, 400)); return res.status(401).json({ error }); }
    console.log('관리자 로그인:', email);
    setCookie(res, issueSession(), 60 * 60 * 8);
    return res.status(200).json({ ok: true, email });
  }

  // ② 비밀번호
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(400).json({ error: '구글 계정으로 로그인해 주세요.' });
  if (!timingSafeEqual(sha(body.password || ''), sha(pw))) {
    await new Promise(r => setTimeout(r, 700));   // 무차별 대입 속도 저하
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
  console.log('관리자 로그인: 비밀번호');
  setCookie(res, issueSession(), 60 * 60 * 8);
  return res.status(200).json({ ok: true });
}
