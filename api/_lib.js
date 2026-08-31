/* 복만당 — API 공용 헬퍼
 * 파일명이 _ 로 시작하면 Vercel 이 라우트로 노출하지 않습니다. (import 전용)
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

export const COOKIE = 'bm_admin';
const MAX_AGE = 60 * 60 * 8;          // 8시간이면 하루 업무를 덮습니다

/* ── Supabase REST ────────────────────────────────────────────────────── */
export function sb() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const base = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/';
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };
  return {
    get:   (path)       => fetch(base + path, { headers }),
    patch: (path, body) => fetch(base + path, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body) }),
    post:  (path, body) => fetch(base + path, { method: 'POST',  headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body) }),
    del:   (path)       => fetch(base + path, { method: 'DELETE', headers })
  };
}

/* ── 세션 쿠키 ─────────────────────────────────────────────────────────
   서버가 서명한 "만료시각.랜덤값" 문자열입니다. 서버에 세션 저장소가 없어도
   위조 여부를 검증할 수 있습니다. ADMIN_SECRET 을 바꾸면 모든 세션이 끊깁니다. */
const secret = () => process.env.ADMIN_SECRET || '';

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueSession() {
  const payload = `${Date.now() + MAX_AGE * 1000}.${randomBytes(9).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

export function validSession(token) {
  if (!token || !secret()) return false;
  const i = token.lastIndexOf('.');
  if (i < 0) return false;
  const payload = token.slice(0, i), got = token.slice(i + 1);
  const want = sign(payload);
  // 길이가 다르면 timingSafeEqual 이 던지므로 먼저 거릅니다
  if (got.length !== want.length) return false;
  if (!timingSafeEqual(Buffer.from(got), Buffer.from(want))) return false;
  return Number(payload.split('.')[0]) > Date.now();
}

export const setCookie = (res, value, maxAge) =>
  res.setHeader('Set-Cookie',
    `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);

export const readCookie = (req) =>
  (req.headers.cookie || '').split(';')
    .map(s => s.trim().split('='))
    .find(([k]) => k === COOKIE)?.[1] || '';

/* 관리자 라우트 진입 가드 — 통과하면 true
   로그인 수단은 구글 또는 비밀번호 중 하나만 있으면 됩니다.
   필수는 세션 서명키(ADMIN_SECRET) 뿐입니다. */
export function guard(req, res) {
  const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && (process.env.ADMIN_EMAILS || '').trim());
  const hasPassword = !!process.env.ADMIN_PASSWORD;
  if (!secret() || !(hasGoogle || hasPassword)) {
    res.status(500).json({ error: '관리자 기능이 설정되지 않았습니다. ADMIN_SECRET 과 로그인 수단(GOOGLE_CLIENT_ID·ADMIN_EMAILS)을 확인하세요.' });
    return false;
  }
  if (!validSession(readCookie(req))) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return false;
  }
  return true;
}

export const readBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
};
