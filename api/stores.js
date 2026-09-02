/* 공개 매장 목록 — 사이트가 최신 목록을 받아 갑니다 (인증 불필요, 게시된 것만).
 * 실패하면 사이트는 assets/data/stores.js 의 값을 그대로 씁니다. */
import { sb } from './_lib.js';

export default async function handler(req, res) {
  const db = sb();
  if (!db) return res.status(200).json({ rows: null });   // 미설정 — 사이트는 정적 목록 사용
  try {
    const r = await db.get('stores?select=name,region,address,hours,phone,closed,map_url,is_main,is_new,is_soon&published=is.true&order=sort.asc,id.asc');
    if (!r.ok) return res.status(200).json({ rows: null });
    const rows = (await r.json()).map(s => ({
      n: s.name, r: s.region, a: s.address, t: s.hours,
      tel: s.phone || undefined, off: s.closed || undefined, map: s.map_url || undefined,
      main: s.is_main || undefined, new: s.is_new || undefined, soon: s.is_soon || undefined
    }));
    /* 관리자에서 고친 내용이 1분 안에 보이도록. 예전에는 5분 캐시에 최대 1시간까지
       오래된 값을 흘려보내, 매장을 고쳐도 한참 반영되지 않았습니다. */
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ rows });
  } catch (e) {
    console.error('공개 매장 목록 조회 실패', e);
    return res.status(200).json({ rows: null });
  }
}
