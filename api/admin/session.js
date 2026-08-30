/* 현재 로그인 상태 확인 — 화면 진입 시 로그인 폼을 보일지 결정합니다 */
import { validSession, readCookie } from '../_lib.js';
export default async function handler(req, res) {
  const configured = !!(process.env.ADMIN_PASSWORD && process.env.ADMIN_SECRET);
  return res.status(200).json({ configured, authenticated: configured && validSession(readCookie(req)) });
}
