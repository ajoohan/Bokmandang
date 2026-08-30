/* 매장 목록 편집 — 조회 / 추가 / 수정 / 삭제
 *   GET                     전체 (미게시 포함)
 *   POST   { ...store }     추가
 *   PATCH  { id, ...필드 }  수정
 *   DELETE ?id=123          삭제
 */
import { sb, guard, readBody } from '../_lib.js';

const REGIONS = ['서울', '경기', '지방'];
const LIMITS = { name: 60, address: 200, hours: 80 };

function shape(body, { partial = false } = {}) {
  const out = {};
  const put = (k, v) => { if (v !== undefined) out[k] = v; };
  if (body.name !== undefined) {
    const v = String(body.name).trim().slice(0, LIMITS.name);
    if (!v) return { error: '지점명을 입력해 주세요.' };
    out.name = v;
  } else if (!partial) return { error: '지점명을 입력해 주세요.' };

  if (body.region !== undefined) {
    if (!REGIONS.includes(body.region)) return { error: '지역은 서울·경기·지방 중 하나여야 합니다.' };
    out.region = body.region;
  }
  if (body.address !== undefined) put('address', String(body.address).trim().slice(0, LIMITS.address));
  if (body.hours   !== undefined) put('hours',   String(body.hours).trim().slice(0, LIMITS.hours));
  for (const k of ['is_main', 'is_new', 'is_soon', 'published'])
    if (body[k] !== undefined) out[k] = !!body[k];
  if (body.sort !== undefined) {
    const n = parseInt(body.sort, 10);
    if (Number.isNaN(n)) return { error: '정렬 순서는 숫자여야 합니다.' };
    out.sort = n;
  }
  return { value: out };
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const db = sb();
  if (!db) return res.status(500).json({ error: 'Supabase 설정이 없습니다.' });

  try {
    if (req.method === 'GET') {
      const r = await db.get('stores?select=*&order=sort.asc,id.asc');
      if (!r.ok) { console.error('매장 조회 실패', r.status, await r.text()); return res.status(502).json({ error: '매장 목록을 불러오지 못했습니다. 0002_admin.sql 을 실행했는지 확인하세요.' }); }
      return res.status(200).json({ rows: await r.json() });
    }

    if (req.method === 'POST') {
      const { value, error } = shape(readBody(req));
      if (error) return res.status(400).json({ error });
      const r = await db.post('stores', value);
      if (!r.ok) { console.error('매장 추가 실패', r.status, await r.text()); return res.status(502).json({ error: '추가하지 못했습니다.' }); }
      return res.status(200).json({ ok: true, row: (await r.json())[0] });
    }

    if (req.method === 'PATCH') {
      const body = readBody(req);
      if (!body.id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const { value, error } = shape(body, { partial: true });
      if (error) return res.status(400).json({ error });
      if (!Object.keys(value).length) return res.status(400).json({ error: '바꿀 내용이 없습니다.' });
      const r = await db.patch(`stores?id=eq.${encodeURIComponent(body.id)}`, value);
      if (!r.ok) { console.error('매장 수정 실패', r.status, await r.text()); return res.status(502).json({ error: '저장하지 못했습니다.' }); }
      return res.status(200).json({ ok: true, row: (await r.json())[0] });
    }

    if (req.method === 'DELETE') {
      const id = (req.query || {}).id;
      if (!id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const r = await db.del(`stores?id=eq.${encodeURIComponent(id)}`);
      if (!r.ok) { console.error('매장 삭제 실패', r.status, await r.text()); return res.status(502).json({ error: '삭제하지 못했습니다.' }); }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: '허용되지 않는 방식입니다.' });
  } catch (e) {
    console.error('매장 API 예외', e);
    return res.status(502).json({ error: '처리 중 문제가 발생했습니다.' });
  }
}
