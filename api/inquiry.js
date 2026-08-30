/* 복만당 — 가맹 상담 접수 (Vercel 서버리스 함수)
 * ─────────────────────────────────────────────────────────────────────────
 * 브라우저는 이 함수만 호출합니다. Supabase 키는 서버 환경변수로만 존재하고
 * 브라우저에는 절대 내려가지 않습니다.
 *
 * 필요한 환경변수 (Vercel 프로젝트 설정 → Environment Variables)
 *   SUPABASE_URL          https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role 키  ★ 절대 클라이언트에 노출 금지
 *   SUPABASE_TABLE        기본값 inquiries. 다른 스키마면 "bokmandang.inquiries" 형태
 *
 * 의존 패키지가 없습니다 — Node 내장 fetch 만 씁니다.
 */

const MAX = { name: 40, phone: 30, region: 80, budget: 40, message: 2000 };

const clean = (v, limit) =>
  typeof v === 'string' ? v.trim().slice(0, limit) : '';

const digits = s => (s || '').replace(/[^0-9]/g, '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST 만 허용합니다.' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const TABLE = process.env.SUPABASE_TABLE || 'inquiries';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('환경변수 SUPABASE_URL / SUPABASE_SERVICE_KEY 가 없습니다.');
    return res.status(500).json({ error: '서버 설정이 완료되지 않았습니다.' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});

  // 허니팟 — 봇이면 성공한 척하고 조용히 버립니다 (재시도 유발 방지)
  if (clean(body._gotcha, 100)) return res.status(200).json({ ok: true });

  const name    = clean(body.name, MAX.name);
  const phone   = clean(body.phone, MAX.phone);
  const region  = clean(body.region, MAX.region);
  const budget  = clean(body.budget, MAX.budget);
  const message = clean(body.message, MAX.message);
  const agreed  = body.agree === true || body.agree === 'on' || body.agree === 'true';

  // 브라우저에서도 검사하지만, 서버가 최종 관문입니다
  if (name.length < 2)  return res.status(400).json({ error: '성함을 2자 이상 입력해 주세요.' });
  const d = digits(phone);
  if (d.length < 9 || d.length > 11)
    return res.status(400).json({ error: '연락처를 숫자 9~11자리로 입력해 주세요.' });
  if (!agreed)
    return res.status(400).json({ error: '개인정보 수집 및 이용 동의가 필요합니다.' });

  const rest = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(TABLE)}`;
  const auth = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
  };

  try {
    // 같은 번호가 1분 안에 또 들어오면 중복으로 봅니다 (새로고침·연타 방지)
    const since = new Date(Date.now() - 60_000).toISOString();
    const dupe = await fetch(
      `${rest}?select=id&phone=eq.${encodeURIComponent(phone)}&created_at=gte.${since}&limit=1`,
      { headers: auth }
    );
    if (dupe.ok && (await dupe.json()).length) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    const ins = await fetch(rest, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ name, phone, region, budget, message })
    });

    if (!ins.ok) {
      // 응답 본문에 스키마 정보가 담길 수 있어 서버 로그에만 남깁니다
      console.error('Supabase insert 실패', ins.status, await ins.text());
      return res.status(502).json({ error: '접수 처리 중 문제가 발생했습니다.' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('접수 처리 예외', e);
    return res.status(502).json({ error: '접수 처리 중 문제가 발생했습니다.' });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
