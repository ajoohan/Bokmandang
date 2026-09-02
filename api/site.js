/* 공개 — 홈페이지 문구 + 지금 띄울 팝업
 *
 * 매장·메뉴와 같은 원칙입니다: 실패하면 빈 값을 돌려주고 사이트는 HTML 에 적힌
 * 원래 문구를 그대로 씁니다. 관리자 기능을 안 켜도 화면이 비지 않습니다.
 *
 * 노출 기간은 서버에서 걸러 보냅니다 — 브라우저 시계는 믿을 게 못 됩니다.
 */
import { sb } from './_lib.js';

const EMPTY = { settings: {}, popups: [] };

export default async function handler(req, res) {
  /* 공지는 매장·메뉴보다 급합니다(임시 휴무 등) — 더 짧게 잡습니다 */
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  const db = sb();
  if (!db) return res.status(200).json(EMPTY);

  const out = { settings: {}, popups: [] };
  try {
    const s = await db.get('settings?select=key,value');
    if (s.ok) for (const row of await s.json()) out.settings[row.key] = row.value ?? '';
  } catch { /* 문구는 없으면 HTML 원문을 씁니다 */ }

  try {
    /* 기간은 여기서 거릅니다. PostgREST 는 or= 를 두 번 넘기면 하나만 먹고,
       팝업은 많아야 몇 개라 한 번에 받아 걸러도 부담이 없습니다.
       브라우저 시계는 못 믿으므로 판단은 반드시 서버에서 합니다. */
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);  // 한국 날짜
    const p = await db.get('popups?select=id,kind,title,body,image_url,link_url,link_label,' +
                           'starts_at,ends_at&published=is.true&order=sort.asc,id.asc');
    if (p.ok) {
      out.popups = (await p.json())
        .filter(x => (!x.starts_at || x.starts_at <= today) && (!x.ends_at || x.ends_at >= today))
        .map(({ starts_at, ends_at, ...rest }) => rest);
    }
  } catch { /* 팝업이 없으면 안 띄웁니다 */ }

  return res.status(200).json(out);
}
