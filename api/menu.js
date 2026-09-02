/* 공개 메뉴 목록 — 사이트가 그대로 받아 그립니다.
 *
 * 매장 목록(/api/stores)과 같은 원칙입니다:
 *   설정이 없거나 실패하면 rows:null 을 돌려주고, 사이트는 main.js 에 박혀 있는
 *   기본 메뉴로 그대로 그립니다. 관리자 기능을 안 켜도 화면이 비지 않습니다.
 */
import { sb } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const db = sb();
  if (!db) return res.status(200).json({ rows: null });
  try {
    const r = await db.get(
      'menus?select=category,name,description,price,unit,tag,image_key,image_url,image_url2' +
      '&published=is.true&order=sort.asc,id.asc');
    if (!r.ok) return res.status(200).json({ rows: null });
    const rows = (await r.json()).map(m => ({
      c: m.category,
      n: m.name,
      d: m.description,
      p: Number(m.price || 0).toLocaleString('ko-KR'),
      u: m.unit,
      tag: m.tag || undefined,
      img: m.image_key || undefined,
      src: m.image_url || undefined,      // 관리자에서 올린 사진
      src2: m.image_url2 || undefined
    }));
    if (!rows.length) return res.status(200).json({ rows: null });
    return res.status(200).json({ rows });
  } catch {
    return res.status(200).json({ rows: null });
  }
}
