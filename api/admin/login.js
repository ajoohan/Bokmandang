/* 관리자 로그인 — 비밀번호 확인 후 서명된 세션 쿠키 발급 */
import { timingSafeEqual } from 'node:crypto';
import { createHash } from 'node:crypto';
import { issueSession, setCookie, readBody, COOKIE } from '../_lib.js';

const sha = s => createHash('sha256').update(String(s)).digest();

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST 만 허용합니다.' }); }
  const { ADMIN_PASSWORD, ADMIN_SECRET } = process.env;
  if (!ADMIN_PASSWORD || !ADMIN_SECRET)
    return res.status(500).json({ error: '관리자 기능이 설정되지 않았습니다. ADMIN_PASSWORD·ADMIN_SECRET 을 넣어 주세요.' });

  const given = readBody(req).password || '';
  // 길이를 감추기 위해 해시끼리 비교합니다
  const ok = timingSafeEqual(sha(given), sha(ADMIN_PASSWORD));
  if (!ok) {
    // 무차별 대입 속도를 늦춥니다. 강한 비밀번호가 전제입니다.
    await new Promise(r => setTimeout(r, 700));
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
  setCookie(res, issueSession(), 60 * 60 * 8);
  return res.status(200).json({ ok: true });
}
