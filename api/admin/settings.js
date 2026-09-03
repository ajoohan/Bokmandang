/* 홈페이지 문구 관리 — 자주 바뀌는 값만 키-값으로 다룹니다.
 *   GET                       전체
 *   PATCH { key: value, ... } 여러 개를 한 번에 저장
 *
 * 사이트 전체를 편집기로 만들지는 않았습니다. 아무 요소나 바꿀 수 있게 하면
 * 줄바꿈 하나로 화면이 무너지고, 무엇이 고쳐졌는지 추적하기도 어렵습니다.
 * 아래 ALLOWED 에 적힌 키만 저장합니다 — 새 문구를 열려면 여기와
 * index.html 의 data-t 속성을 함께 추가하세요.
 */
import { sb, guard, readBody } from '../_lib.js';

export const ALLOWED = {
  'hero.title':    { label: '히어로 제목',        max: 60,  multiline: true },
  'hero.desc':     { label: '히어로 설명',        max: 400, multiline: true },
  'store.address': { label: '본점 주소',          max: 160, multiline: true },
  'store.tel':     { label: '본점 대표문의',      max: 40 },
  'store.hours':   { label: '본점 영업 정보',     max: 80 },
  'store.parking': { label: '본점 주차 안내',     max: 60 },
  'menu.origin':   { label: '원산지 표기',        max: 300, multiline: true },
  'links.naverPlace':  { label: '네이버 플레이스', max: 500, url: true },
  'links.reserve':     { label: '네이버 예약',     max: 500, url: true },
  'links.baemin':      { label: '배달의민족',      max: 500, url: true },
  'links.coupangeats': { label: '쿠팡이츠',        max: 500, url: true },
  'links.yogiyo':      { label: '요기요',          max: 500, url: true },
  'links.kitShop':     { label: '밀키트 구매처',   max: 500, url: true }
};

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const db = sb();
  if (!db) return res.status(500).json({ error: 'Supabase 설정이 없습니다.' });

  try {
    if (req.method === 'GET') {
      const r = await db.get('settings?select=key,value');
      if (!r.ok) {
        console.error('문구 조회 실패', r.status, await r.text());
        return res.status(502).json({ error: '문구를 불러오지 못했습니다. 0005_popups_and_settings.sql 을 실행했는지 확인하세요.' });
      }
      const cur = {};
      for (const row of await r.json()) cur[row.key] = row.value ?? '';
      // 아직 행이 없는 키도 빈 값으로 함께 내려 화면에서 칸이 빠지지 않게 합니다
      const fields = Object.entries(ALLOWED).map(([key, meta]) =>
        ({ key, value: cur[key] ?? '', ...meta }));
      return res.status(200).json({ fields });
    }

    if (req.method === 'PATCH') {
      const body = readBody(req) || {};
      const rows = [];
      for (const [key, raw] of Object.entries(body)) {
        /* ALLOWED[key] 로만 보면 'constructor' 같은 프로토타입 속성이 truthy 로 통과합니다 */
        if (!Object.hasOwn(ALLOWED, key)) continue;   // 모르는 키는 조용히 버립니다
        const meta = ALLOWED[key];
        let v = String(raw ?? '').slice(0, meta.max);
        if (!meta.multiline) v = v.replace(/[\r\n]+/g, ' ');
        v = v.trim();
        if (meta.url && v && !/^https?:\/\//i.test(v))
          return res.status(400).json({ error: `${meta.label} 은(는) http:// 또는 https:// 로 시작해야 합니다.` });
        rows.push({ key, value: v, updated_at: new Date().toISOString() });
      }
      if (!rows.length) return res.status(400).json({ error: '저장할 내용이 없습니다.' });

      // key 가 기본키라 upsert 로 한 번에 넣습니다
      const r = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/settings?on_conflict=key', {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(rows)
      });
      if (!r.ok) { console.error('문구 저장 실패', r.status, await r.text()); return res.status(502).json({ error: '저장하지 못했습니다.' }); }
      return res.status(200).json({ ok: true, saved: rows.length });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ error: '허용되지 않는 방식입니다.' });
  } catch (e) {
    console.error('문구 API 예외', e);
    return res.status(502).json({ error: '처리 중 문제가 발생했습니다.' });
  }
}
