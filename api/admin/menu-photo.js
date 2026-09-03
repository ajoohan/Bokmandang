/* 메뉴 사진 업로드 — Supabase Storage 의 menu-photos 버킷에 넣습니다.
 *
 * 브라우저가 사진을 캔버스로 줄여 JPEG 로 만든 뒤 base64 로 보냅니다.
 * 서버에서 이미지를 다루려면 sharp 같은 의존성이 필요한데, 이 프로젝트는
 * 의존성 없이 굴러가는 게 원칙이라 크기 조절은 브라우저가 맡습니다.
 *
 *   POST { name: '곰탕', data: 'data:image/jpeg;base64,...' }
 *   → { ok:true, url:'https://xxx.supabase.co/storage/v1/object/public/menu-photos/....jpg' }
 *
 * 버킷이 public 이라 URL 을 아는 사람은 누구나 볼 수 있습니다(사이트에 실릴 사진이라 의도한 것).
 * 올리는 것은 service_role 을 쥔 이 함수만 할 수 있습니다.
 */
import { guard, readBody } from '../_lib.js';

/* 메뉴와 팝업이 같은 방식으로 올리므로 버킷만 갈아 끼웁니다.
   목록에 없는 이름은 받지 않습니다 — 임의의 버킷에 쓰게 두면 안 됩니다. */
const BUCKETS = { menu: 'menu-photos', popup: 'popup-photos' };
const MAX_BYTES = 3 * 1024 * 1024;      // 줄여서 보내므로 3MB 면 넉넉합니다

/* 파일 이름에 한글·공백이 들어가면 URL 이 지저분해지고 인코딩 사고가 납니다.
   영숫자만 남기고, 알아볼 수 없으면 시각을 씁니다. */
function safeName(name) {
  const base = String(name || '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${base || 'menu'}-${Date.now().toString(36)}.jpg`;
}

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: '허용되지 않는 방식입니다.' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return res.status(500).json({ error: 'Supabase 설정이 없습니다.' });

  const body = readBody(req);
  const want = body.bucket || 'menu';
  /* BUCKETS[want] 로만 보면 'constructor' 같은 프로토타입 속성이 함수로 잡힙니다 */
  if (!Object.hasOwn(BUCKETS, want))
    return res.status(400).json({ error: '알 수 없는 저장 위치입니다.' });
  const BUCKET = BUCKETS[want];
  const raw = String(body.data || '');
  const m = raw.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: '이미지 형식을 알 수 없습니다. JPG·PNG·WebP 만 올릴 수 있습니다.' });

  let buf;
  try { buf = Buffer.from(m[2], 'base64'); }
  catch { return res.status(400).json({ error: '사진을 읽지 못했습니다.' }); }
  if (!buf.length) return res.status(400).json({ error: '빈 파일입니다.' });
  if (buf.length > MAX_BYTES)
    return res.status(413).json({ error: '사진이 너무 큽니다. 다시 시도해 주세요.' });

  const file = safeName(body.name);
  const base = SUPABASE_URL.replace(/\/$/, '');

  try {
    const up = await fetch(`${base}/storage/v1/object/${BUCKET}/${file}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: buf
    });
    if (!up.ok) {
      const text = await up.text();
      console.error('사진 업로드 실패', up.status, text);
      if (up.status === 404)
        return res.status(502).json({ error: `${BUCKET} 버킷이 없습니다. Supabase → Storage 에서 만들어 주세요(Public).` });
      return res.status(502).json({ error: '사진을 올리지 못했습니다.' });
    }
    return res.status(200).json({
      ok: true,
      url: `${base}/storage/v1/object/public/${BUCKET}/${file}`
    });
  } catch (e) {
    console.error('사진 업로드 예외', e);
    return res.status(502).json({ error: '사진을 올리지 못했습니다.' });
  }
}
