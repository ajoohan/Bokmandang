/* 홈페이지 문구 관리 — 자주 바뀌는 값만 키-값으로 다룹니다.
 *   GET                       전체
 *   PATCH { key: value, ... } 여러 개를 한 번에 저장
 *
 * 사이트 전체를 편집기로 만들지는 않았습니다. 아무 요소나 바꿀 수 있게 하면
 * 줄바꿈 하나로 화면이 무너지고, 무엇이 고쳐졌는지 추적하기도 어렵습니다.
 * 아래 ALLOWED 에 적힌 키만 저장합니다 — 새 문구를 열려면 여기와
 * index.html 의 data-t 속성을 함께 추가하세요.
 *
 * 외국어 — i18n: true 인 문구는 언어별 값을 따로 받습니다.
 *   'hero.title'     한국어 (원래 키 그대로)
 *   'hero.title@en'  영어 · '@cn' 중국어 · '@jp' 일본어
 * 표는 그대로 키-값이라 DB 를 바꿀 일이 없습니다. 외국어 칸을 비워 두면
 * 사이트는 한국어 값을 번역 사전에서 찾아 보고, 없으면 한국어를 그대로 씁니다.
 * 주소·전화·링크처럼 언어와 상관없는 값에는 i18n 을 붙이지 않습니다.
 */
import { sb, guard, readBody } from '../_lib.js';

/* 외국어 칸 — i18n.js 의 언어 코드와 같아야 사이트가 찾아 씁니다 */
export const LANGS = ['en', 'cn', 'jp'];

export const ALLOWED = {
  'hero.title':    { label: '히어로 제목',        max: 60,  multiline: true, i18n: true },
  'hero.desc':     { label: '히어로 설명',        max: 400, multiline: true, i18n: true },
  'store.address': { label: '본점 주소',          max: 160, multiline: true, i18n: true },
  'store.tel':     { label: '본점 대표문의',      max: 40 },
  'store.hours':   { label: '본점 영업 정보 (두 줄까지)', max: 120, multiline: true, i18n: true },
  'store.parking': { label: '본점 주차 안내',     max: 60, i18n: true },
  'menu.origin':   { label: '원산지 표기',        max: 300, multiline: true, i18n: true },
  /* 흐르는 띠 배너 — 한 줄에 한 문구씩 적습니다. 사이트가 사이에 마름모를
     넣고 두 벌 이어 붙여 끊김 없이 흐르게 만듭니다. */
  'marquee.items': { label: '띠 배너 문구 (한 줄에 하나)', max: 300, multiline: true, i18n: true },
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
      const fields = Object.entries(ALLOWED).map(([key, meta]) => {
        const f = { key, value: cur[key] ?? '', ...meta };
        if (meta.i18n) f.tr = Object.fromEntries(LANGS.map(l => [l, cur[`${key}@${l}`] ?? '']));
        return f;
      });
      return res.status(200).json({ fields });
    }

    if (req.method === 'PATCH') {
      const body = readBody(req) || {};
      const rows = [];
      for (const [key, raw] of Object.entries(body)) {
        /* 'hero.title@en' 은 'hero.title' 의 규칙(길이·줄바꿈)을 그대로 따릅니다 */
        const [base, lang, extra] = key.split('@');
        if (extra !== undefined) continue;
        /* ALLOWED[key] 로만 보면 'constructor' 같은 프로토타입 속성이 truthy 로 통과합니다 */
        if (!Object.hasOwn(ALLOWED, base)) continue;   // 모르는 키는 조용히 버립니다
        const meta = ALLOWED[base];
        if (lang !== undefined && !(meta.i18n && LANGS.includes(lang))) continue;
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
