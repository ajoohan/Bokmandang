/* 팝업 관리 — 조회 / 추가 / 수정 / 삭제
 *   GET                     전체 (미게시·기간 지난 것 포함)
 *   POST   { ...popup }     추가
 *   PATCH  { id, ...필드 }  수정
 *   DELETE ?id=123          삭제
 *
 * 이미지는 api/admin/menu-photo.js 를 함께 씁니다 (bucket=popup-photos).
 */
import { sb, guard, readBody } from '../_lib.js';

const KINDS = ['banner', 'modal'];
const LIMITS = { title: 80, body: 400, link_label: 30, link_url: 500, image_url: 500 };

function shape(body, { partial = false } = {}) {
  const out = {};
  const str = (k, max) => { if (body[k] !== undefined) out[k] = String(body[k]).trim().slice(0, max); };

  if (body.title !== undefined) {
    const v = String(body.title).trim().slice(0, LIMITS.title);
    if (!v) return { error: '팝업 제목을 입력해 주세요.' };
    out.title = v;
  } else if (!partial) return { error: '팝업 제목을 입력해 주세요.' };

  if (body.kind !== undefined) {
    if (!KINDS.includes(body.kind)) return { error: '형태는 띠배너 또는 모달이어야 합니다.' };
    out.kind = body.kind;
  }
  str('body', LIMITS.body);
  str('link_label', LIMITS.link_label);
  str('image_url', LIMITS.image_url);

  /* 링크에 javascript: 가 들어가면 사이트에서 그대로 눌립니다 */
  for (const k of ['link_url']) {
    if (body[k] === undefined) continue;
    const v = String(body[k]).trim().slice(0, LIMITS.link_url);
    if (v && !/^(https?:\/\/|\/|#)/i.test(v))
      return { error: '링크는 http:// 또는 https:// 로 시작하거나, 사이트 안 주소(/, #)여야 합니다.' };
    out[k] = v;
  }

  /* 날짜는 비울 수 있습니다(즉시 시작 / 끝없이). 빈 문자열은 null 로 넣어야
     Postgres date 컬럼이 받아 줍니다. */
  for (const k of ['starts_at', 'ends_at']) {
    if (body[k] === undefined) continue;
    const v = String(body[k]).trim();
    if (!v) { out[k] = null; continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { error: '날짜는 YYYY-MM-DD 형식이어야 합니다.' };
    out[k] = v;
  }
  /* 한쪽만 보내면 DB 의 반대쪽 값과 비교할 수 없어, 종료일이 시작일보다 앞선
     팝업이 만들어질 수 있습니다. 그런 팝업은 기간 필터를 영영 통과하지 못하는데
     목록에는 '게시' 로 보여 원인을 찾기 어렵습니다. 둘 다 받도록 강제합니다.
     (관리자 화면은 항상 두 칸을 함께 보냅니다) */
  const hasS = out.starts_at !== undefined, hasE = out.ends_at !== undefined;
  if (hasS !== hasE)
    return { error: '노출 시작일과 종료일은 함께 보내야 합니다.' };
  if (out.starts_at && out.ends_at && out.starts_at > out.ends_at)
    return { error: '종료일이 시작일보다 빠릅니다.' };

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
      const r = await db.get('popups?select=*&order=sort.asc,id.asc');
      if (!r.ok) {
        console.error('팝업 조회 실패', r.status, await r.text());
        return res.status(502).json({ error: '팝업을 불러오지 못했습니다. 0005_popups_and_settings.sql 을 실행했는지 확인하세요.' });
      }
      return res.status(200).json({ rows: await r.json() });
    }

    if (req.method === 'POST') {
      const { value, error } = shape(readBody(req));
      if (error) return res.status(400).json({ error });
      const r = await db.post('popups', value);
      if (!r.ok) { console.error('팝업 추가 실패', r.status, await r.text()); return res.status(502).json({ error: '추가하지 못했습니다.' }); }
      return res.status(200).json({ ok: true, row: (await r.json())[0] });
    }

    if (req.method === 'PATCH') {
      const body = readBody(req);
      if (!body.id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const { value, error } = shape(body, { partial: true });
      if (error) return res.status(400).json({ error });
      if (!Object.keys(value).length) return res.status(400).json({ error: '바꿀 내용이 없습니다.' });
      const r = await db.patch(`popups?id=eq.${encodeURIComponent(body.id)}`, value);
      if (!r.ok) { console.error('팝업 수정 실패', r.status, await r.text()); return res.status(502).json({ error: '저장하지 못했습니다.' }); }
      return res.status(200).json({ ok: true, row: (await r.json())[0] });
    }

    if (req.method === 'DELETE') {
      const id = (req.query || {}).id;
      if (!id) return res.status(400).json({ error: 'id 가 필요합니다.' });
      const r = await db.del(`popups?id=eq.${encodeURIComponent(id)}`);
      if (!r.ok) { console.error('팝업 삭제 실패', r.status, await r.text()); return res.status(502).json({ error: '삭제하지 못했습니다.' }); }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: '허용되지 않는 방식입니다.' });
  } catch (e) {
    console.error('팝업 API 예외', e);
    return res.status(502).json({ error: '처리 중 문제가 발생했습니다.' });
  }
}
