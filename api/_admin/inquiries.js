/* 가맹 상담 목록 — 조회 / 상태·메모 수정 / 삭제
 *   GET    ?status=new&q=홍&limit=50   목록
 *   PATCH  { id, status?, memo? }       수정
 *   DELETE ?id=123                      파기 (정보주체 삭제 요청 대응)
 */
import { sb, guard, readBody } from '../_lib.js';

const STATUS = ['new', 'contacted', 'visiting', 'contracted', 'closed'];
const TABLE = () => process.env.SUPABASE_TABLE || 'inquiries';

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const db = sb();
  if (!db) return res.status(500).json({ error: 'Supabase 설정이 없습니다.' });
  const T = encodeURIComponent(TABLE());

  try {
    if (req.method === 'GET') {
      const { status = '', q = '', limit = '100' } = req.query || {};
      const n = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
      let path = `${T}?select=*&order=created_at.desc&limit=${n}`;
      if (STATUS.includes(status)) path += `&status=eq.${status}`;
      if (q) {
        // 이름·연락처·희망지역·문의내용에서 부분 일치
        const like = `*${String(q).replace(/[*,()]/g, '')}*`;
        path += `&or=(name.ilike.${encodeURIComponent(like)},phone.ilike.${encodeURIComponent(like)},region.ilike.${encodeURIComponent(like)},message.ilike.${encodeURIComponent(like)})`;
      }
      const r = await db.get(path);
      if (!r.ok) { console.error('목록 조회 실패', r.status, await r.text()); return res.status(502).json({ error: '목록을 불러오지 못했습니다.' }); }
      const rows = await r.json();

      // 상태별 건수 (배지용)
      const cr = await db.get(`${T}?select=status`);
      const counts = { all: 0 };
      if (cr.ok) for (const { status: s } of await cr.json()) { counts.all++; counts[s] = (counts[s] || 0) + 1; }
      return res.status(200).json({ rows, counts });
    }

    if (req.method === 'PATCH') {
      const { id, status, memo } = readBody(req);
      if (!id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const patch = {};
      if (status !== undefined) {
        if (!STATUS.includes(status)) return res.status(400).json({ error: '알 수 없는 상태값입니다.' });
        patch.status = status;
      }
      if (memo !== undefined) patch.memo = String(memo).slice(0, 2000);
      if (!Object.keys(patch).length) return res.status(400).json({ error: '바꿀 내용이 없습니다.' });
      const r = await db.patch(`${T}?id=eq.${encodeURIComponent(id)}`, patch);
      if (!r.ok) { console.error('수정 실패', r.status, await r.text()); return res.status(502).json({ error: '저장하지 못했습니다.' }); }
      return res.status(200).json({ ok: true, row: (await r.json())[0] });
    }

    if (req.method === 'DELETE') {
      const id = (req.query || {}).id;
      if (!id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const r = await db.del(`${T}?id=eq.${encodeURIComponent(id)}`);
      if (!r.ok) { console.error('삭제 실패', r.status, await r.text()); return res.status(502).json({ error: '삭제하지 못했습니다.' }); }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: '허용되지 않는 방식입니다.' });
  } catch (e) {
    console.error('상담 API 예외', e);
    return res.status(502).json({ error: '처리 중 문제가 발생했습니다.' });
  }
}
