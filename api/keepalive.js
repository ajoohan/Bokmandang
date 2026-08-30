/* Supabase 무료 플랜은 7일간 요청이 없으면 프로젝트를 일시정지합니다.
   가맹 문의는 매일 들어오지 않으므로, 하루 한 번 가볍게 두드려 깨워 둡니다.
   vercel.json 의 crons 가 이 경로를 호출합니다. */
export default async function handler(req, res) {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const TABLE = process.env.SUPABASE_TABLE || 'inquiries';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(200).json({ skipped: true });
  try {
    const r = await fetch(
      `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(TABLE)}?select=id&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    return res.status(200).json({ ok: r.ok, status: r.status });
  } catch (e) {
    console.error('keepalive 실패', e);
    return res.status(200).json({ ok: false });
  }
}
