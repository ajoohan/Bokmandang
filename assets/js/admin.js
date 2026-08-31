/* 복만당 관리자 화면 — admin.html 전용
   CSP 가 인라인 스크립트를 막기 때문에 파일로 분리했습니다. */
/* ── 공통 ───────────────────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastT;
function toast(msg, bad) {
  const t = $('#toast');
  t.textContent = msg; t.classList.toggle('bad', !!bad); t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

async function api(path, opt = {}) {
  const r = await fetch(path, { credentials: 'same-origin', ...opt });
  if (r.status === 401) { show('login'); throw new Error('로그인이 필요합니다.'); }
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok) throw new Error((j && j.error) || `요청 실패 (${r.status})`);
  return j;
}

function show(which) {
  $('#login').hidden = which !== 'login';
  $('#app').hidden = which !== 'app';
  if (which === 'login') setTimeout(() => $('#pw').focus(), 50);
}

/* ── 로그인 ─────────────────────────────────────────────────────────── */
/* 로그인 성공 후 공통 처리 */
function enter() { show('app'); loadInq(); loadStr(); }

/* 구글에서 받은 ID 토큰을 서버로 보냅니다. 검증은 전부 서버가 합니다. */
async function onGoogle(resp) {
  const err = $('#loginErr'); err.textContent = '';
  try {
    const r = await api('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: resp.credential })
    });
    if (r && r.email) console.log('로그인:', r.email);
    enter();
  } catch (ex) { err.textContent = ex.message; }
}

/* GIS 스크립트가 늦게 로드될 수 있어 준비될 때까지 짧게 기다립니다 */
function initGoogle(clientId, tries = 0) {
  if (!window.google || !google.accounts || !google.accounts.id) {
    if (tries < 40) return setTimeout(() => initGoogle(clientId, tries + 1), 150);
    $('#loginErr').textContent = '구글 로그인을 불러오지 못했습니다. 새로고침해 주세요.';
    return;
  }
  google.accounts.id.initialize({ client_id: clientId, callback: onGoogle });
  google.accounts.id.renderButton($('#gsiBtn'),
    { theme: 'outline', size: 'large', width: 300, text: 'signin_with', locale: 'ko' });
  $('#gsi').hidden = false;
}

$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  const pw = $('#pw');
  if (!pw || $('#pwBox').hidden) return;          // 비밀번호 수단이 꺼져 있으면 무시
  const btn = $('#loginBtn'), err = $('#loginErr');
  btn.disabled = true; btn.textContent = '확인 중…'; err.textContent = '';
  try {
    await api('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw.value })
    });
    pw.value = '';
    enter();
  } catch (ex) {
    err.textContent = ex.message;
  } finally {
    btn.disabled = false; btn.textContent = '로그인';
  }
};

$('#logout').onclick = async () => {
  try { await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }); } catch {}
  show('login');
};

/* ── 탭 ─────────────────────────────────────────────────────────────── */
document.querySelectorAll('.adm-tab button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.adm-tab button').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  $('#view-inq').hidden = b.dataset.view !== 'inq';
  $('#view-str').hidden = b.dataset.view !== 'str';
});

/* ── 상담 접수 ──────────────────────────────────────────────────────── */
const STATUS = { new: '접수', contacted: '연락함', visiting: '상권검토', contracted: '계약', closed: '종료' };
let filter = '', q = '';

const fmt = iso => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` +
         ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

async function loadInq() {
  const box = $('#inqList');
  try {
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    if (q) p.set('q', q);
    const { rows, counts } = await api('/api/admin/inquiries?' + p);

    for (const k of ['all', ...Object.keys(STATUS)])
      $('#c-' + k).textContent = counts[k] || 0;

    if (!rows.length) {
      box.innerHTML = `<div class="adm-empty">${q || filter ? '조건에 맞는 상담이 없습니다.' : '아직 접수된 상담이 없습니다.'}</div>`;
      return;
    }
    box.innerHTML = rows.map(r => `
      <div class="adm-row" data-id="${r.id}">
        <div class="who">
          <b>${esc(r.name)}</b>
          <a href="tel:${esc(String(r.phone).replace(/[^0-9+]/g, ''))}">${esc(r.phone)}</a>
          <div class="when">${fmt(r.created_at)}</div>
        </div>
        <div>${esc(r.region) || '<span style="color:var(--mute-2)">지역 미기재</span>'}
          <div class="when">${esc(r.budget) || '예산 미기재'}</div></div>
        <div>
          <div class="msg">${esc(r.message)}</div>
          <textarea class="adm-memo" data-memo placeholder="담당자 메모">${esc(r.memo)}</textarea>
        </div>
        <div><select class="adm-sel" data-status data-s="${r.status}">
          ${Object.entries(STATUS).map(([v, l]) =>
            `<option value="${v}"${v === r.status ? ' selected' : ''}>${l}</option>`).join('')}
        </select></div>
        <div class="adm-act"><button class="adm-btn danger" data-del title="삭제">삭제</button></div>
      </div>`).join('');
  } catch (ex) {
    box.innerHTML = `<div class="adm-empty">${esc(ex.message)}</div>`;
  }
}

document.querySelectorAll('.adm-chip').forEach(c => c.onclick = () => {
  document.querySelectorAll('.adm-chip').forEach(x => x.classList.remove('on'));
  c.classList.add('on'); filter = c.dataset.status; loadInq();
});
let qT; $('#q').oninput = e => { clearTimeout(qT); qT = setTimeout(() => { q = e.target.value.trim(); loadInq(); }, 250); };

/* 상태 변경 · 메모 저장 — 행이 다시 그려져도 붙어 있도록 위임합니다 */
$('#inqList').addEventListener('change', async e => {
  const row = e.target.closest('.adm-row'); if (!row) return;
  const id = row.dataset.id;
  try {
    if (e.target.matches('[data-status]')) {
      await api('/api/admin/inquiries', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: e.target.value })
      });
      e.target.dataset.s = e.target.value;
      toast('상태를 바꿨습니다.');
      loadInq();                       // 건수 배지 갱신
    } else if (e.target.matches('[data-memo]')) {
      await api('/api/admin/inquiries', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, memo: e.target.value })
      });
      toast('메모를 저장했습니다.');
    }
  } catch (ex) { toast(ex.message, true); }
});

$('#inqList').addEventListener('click', async e => {
  if (!e.target.matches('[data-del]')) return;
  const row = e.target.closest('.adm-row');
  const who = row.querySelector('.who b').textContent;
  if (!confirm(`${who} 님의 상담 내역을 삭제합니다.\n\n되돌릴 수 없습니다. 계속할까요?`)) return;
  try {
    await api('/api/admin/inquiries?id=' + encodeURIComponent(row.dataset.id), { method: 'DELETE' });
    toast('삭제했습니다.'); loadInq();
  } catch (ex) { toast(ex.message, true); }
});

/* ── 매장 목록 ──────────────────────────────────────────────────────── */
const REGIONS = ['서울', '경기', '지방'];

async function loadStr() {
  const box = $('#strList');
  try {
    const { rows } = await api('/api/admin/stores');
    if (!rows.length) { box.innerHTML = '<div class="adm-empty">매장이 없습니다. 위의 “매장 추가”를 눌러 시작하세요.</div>'; return; }
    box.innerHTML = rows.map(s => `
      <div class="adm-store" data-id="${s.id}">
        <div><input type="number" data-f="sort" value="${s.sort}"></div>
        <div><input type="text" data-f="name" value="${esc(s.name)}" placeholder="지점명"></div>
        <div><select data-f="region">${REGIONS.map(r =>
          `<option${r === s.region ? ' selected' : ''}>${r}</option>`).join('')}</select></div>
        <div><input type="text" data-f="address" value="${esc(s.address)}" placeholder="주소"></div>
        <div><input type="text" data-f="hours" value="${esc(s.hours)}" placeholder="예) 15:40 라스트오더"></div>
        <div class="adm-flags">
          <label><input type="checkbox" data-f="is_main" ${s.is_main ? 'checked' : ''}>본점</label>
          <label><input type="checkbox" data-f="is_new" ${s.is_new ? 'checked' : ''}>NEW</label>
          <label><input type="checkbox" data-f="is_soon" ${s.is_soon ? 'checked' : ''}>예정</label>
          <label><input type="checkbox" data-f="published" ${s.published ? 'checked' : ''}>게시</label>
          <button class="adm-btn danger" data-del>삭제</button>
        </div>
      </div>`).join('');
  } catch (ex) {
    box.innerHTML = `<div class="adm-empty">${esc(ex.message)}</div>`;
  }
}

$('#strList').addEventListener('change', async e => {
  const row = e.target.closest('.adm-store'); if (!row || !e.target.dataset.f) return;
  const f = e.target.dataset.f;
  const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  try {
    await api('/api/admin/stores', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.dataset.id, [f]: v })
    });
    toast('저장했습니다.');
    if (f === 'sort') loadStr();     // 순서가 바뀌면 다시 정렬
  } catch (ex) { toast(ex.message, true); loadStr(); }
});

$('#strList').addEventListener('click', async e => {
  if (!e.target.matches('[data-del]')) return;
  const row = e.target.closest('.adm-store');
  const nm = row.querySelector('[data-f=name]').value || '이 매장';
  if (!confirm(`${nm} 을(를) 목록에서 삭제합니다.\n\n되돌릴 수 없습니다. 계속할까요?`)) return;
  try {
    await api('/api/admin/stores?id=' + encodeURIComponent(row.dataset.id), { method: 'DELETE' });
    toast('삭제했습니다.'); loadStr();
  } catch (ex) { toast(ex.message, true); }
});

$('#addStore').onclick = async () => {
  const name = prompt('새 지점명을 입력하세요.');
  if (!name || !name.trim()) return;
  try {
    await api('/api/admin/stores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), region: '서울', sort: 999, published: false })
    });
    toast('추가했습니다. 주소·영업 정보를 채운 뒤 “게시”를 켜세요.');
    loadStr();
  } catch (ex) { toast(ex.message, true); }
};

/* ── 시작 ───────────────────────────────────────────────────────────── */
(async () => {
  try {
    const s = await api('/api/admin/session');
    if (!s.configured) {
      show('login');
      $('#loginErr').innerHTML = '관리자 기능이 아직 설정되지 않았습니다.<br>' +
        'Vercel 환경변수 <b>ADMIN_SECRET</b> 과 ' +
        '<b>GOOGLE_CLIENT_ID</b> · <b>ADMIN_EMAILS</b> 를 넣어 주세요.';
      $('#loginBtn').disabled = true;
      return;
    }
    $('#pwBox').hidden = !s.methods.password;
    $('#pwOr').hidden = !(s.methods.password && s.methods.google);
    if (s.methods.google && s.googleClientId) initGoogle(s.googleClientId);
    if (s.authenticated) enter();
    else show('login');
  } catch { show('login'); }
})();
