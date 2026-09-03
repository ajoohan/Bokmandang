/* 로그인 상태 + 사용 가능한 로그인 수단 — 화면이 무엇을 보여줄지 결정합니다 */
import { validSession, readCookie } from '../_lib.js';

export default async function handler(req, res) {
  const google = !!(process.env.GOOGLE_CLIENT_ID && (process.env.ADMIN_EMAILS || '').trim());
  const password = !!process.env.ADMIN_PASSWORD;
  const ready = !!process.env.ADMIN_SECRET && (google || password);
  return res.status(200).json({
    configured: ready,
    authenticated: ready && validSession(readCookie(req)),
    methods: { google, password },
    googleClientId: google ? process.env.GOOGLE_CLIENT_ID : null   // 공개해도 되는 값입니다
  });
}
