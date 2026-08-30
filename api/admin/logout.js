/* 관리자 로그아웃 — 쿠키를 즉시 만료시킵니다 */
import { setCookie } from '../_lib.js';
export default async function handler(req, res) {
  setCookie(res, '', 0);
  return res.status(200).json({ ok: true });
}
