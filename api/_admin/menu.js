/* 메뉴 관리 — 조회 / 추가 / 수정 / 삭제
 *   GET                     전체 (미게시 포함)
 *   POST   { ...menu }      추가
 *   PATCH  { id, ...필드 }  수정
 *   DELETE ?id=123          삭제
 *
 * 사진 업로드는 별도입니다 — api/admin/menu-photo.js
 */
import { sb, guard, readBody } from '../_lib.js';

const CATS = ['tang', 'side', 'kit'];
const LIMITS = { name: 60, description: 300, unit: 20, tag: 20, image_key: 60, image_url: 500, image_url2: 500 };

function shape(body, { partial = false } = {}) {
  const out = {};
  const str = (k, max) => {
    if (body[k] === undefined) return;
    out[k] = String(body[k]).trim().slice(0, max);
  };

  if (body.name !== undefined) {
    const v = String(body.name).trim().slice(0, LIMITS.name);
    if (!v) return { error: '메뉴명을 입력해 주세요.' };
    out.name = v;
  } else if (!partial) return { error: '메뉴명을 입력해 주세요.' };

  if (body.category !== undefined) {
    if (!CATS.includes(body.category))
      return { error: '분류는 곰탕·사이드·밀키트 중 하나여야 합니다.' };
    out.category = body.category;
  }
  str('description', LIMITS.description);
  str('unit', LIMITS.unit);
  str('tag', LIMITS.tag);
  str('image_key', LIMITS.image_key);
  /* 사진 주소는 공개 사이트의 <img src> 로 그대로 나갑니다.
     업로드가 돌려준 https 주소만 받습니다 — 팝업의 link_url 과 같은 기준입니다. */
  for (const k of ['image_url', 'image_url2']) {
    if (body[k] === undefined) continue;
    const v = String(body[k]).trim().slice(0, LIMITS[k]);
    if (v && !/^https:\/\//i.test(v))
      return { error: '사진 주소는 https:// 로 시작해야 합니다. 사진 고르기로 올려 주세요.' };
    out[k] = v;
  }

  if (body.price !== undefined) {
    // '13,000' 처럼 들어와도 받아 줍니다
    const n = parseInt(String(body.price).replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(n) || n < 0) return { error: '가격은 0 이상의 숫자여야 합니다.' };
    out.price = n;
  }
  if (body.sort !== undefined) {
    const n = parseInt(body.sort, 10);
    if (Number.isNaN(n)) return { error: '정렬 순서는 숫자여야 합니다.' };
    out.sort = n;
  }
  if (body.published !== undefined) out.published = !!body.published;
  return { value: out };
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  const db = sb();
  if (!db) return res.status(500).json({ error: 'Supabase 설정이 없습니다.' });

  try {
    if (req.method === 'GET') {
      const r = await db.get('menus?select=*&order=sort.asc,id.asc');
      if (!r.ok) {
        console.error('메뉴 조회 실패', r.status, await r.text());
        return res.status(502).json({ error: '메뉴를 불러오지 못했습니다. 0004_menus_and_store_fields.sql 을 실행했는지 확인하세요.' });
      }
      return res.status(200).json({ rows: await r.json() });
    }

    if (req.method === 'POST') {
      const { value, error } = shape(readBody(req));
      if (error) return res.status(400).json({ error });
      const r = await db.post('menus', value);
      if (!r.ok) { console.error('메뉴 추가 실패', r.status, await r.text()); return res.status(502).json({ error: '추가하지 못했습니다. 같은 이름의 메뉴가 있는지 확인하세요.' }); }
      return res.status(200).json({ ok: true, row: (await r.json())[0] });
    }

    if (req.method === 'PATCH') {
      const body = readBody(req);
      if (!body.id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const { value, error } = shape(body, { partial: true });
      if (error) return res.status(400).json({ error });
      if (!Object.keys(value).length) return res.status(400).json({ error: '바꿀 내용이 없습니다.' });
      const r = await db.patch(`menus?id=eq.${encodeURIComponent(body.id)}`, value);
      if (!r.ok) { console.error('메뉴 수정 실패', r.status, await r.text()); return res.status(502).json({ error: '저장하지 못했습니다.' }); }
      return res.status(200).json({ ok: true, row: (await r.json())[0] });
    }

    if (req.method === 'DELETE') {
      const id = (req.query || {}).id;
      if (!id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const r = await db.del(`menus?id=eq.${encodeURIComponent(id)}`);
      if (!r.ok) { console.error('메뉴 삭제 실패', r.status, await r.text()); return res.status(502).json({ error: '삭제하지 못했습니다.' }); }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: '허용되지 않는 방식입니다.' });
  } catch (e) {
    console.error('메뉴 API 예외', e);
    return res.status(502).json({ error: '처리 중 문제가 발생했습니다.' });
  }
}
