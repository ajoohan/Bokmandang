/* 복만당 관리자 화면 — admin.html 전용
   CSP 가 인라인 스크립트를 막기 때문에 파일로 분리했습니다. */
/* ── 공통 ───────────────────────────────────────────────────────────── */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 빈 상태 · 오류를 같은 틀로 — 한 줄 문구만 띄우면 무엇을 해야 할지 알 수 없습니다 */
const empty = (mark, title, desc) =>
  `<div class="adm-empty">
     <div class="mk" aria-hidden="true">${mark}</div>
     <h3>${title}</h3><p>${desc}</p>
   </div>`;

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

const skeleton = n => Array.from({ length: n },
  () => '<div class="adm-skel"><i></i><i></i><i></i></div>').join('');

async function loadInq() {
  const box = $('#inqList');
  box.innerHTML = skeleton(4);
  try {
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    if (q) p.set('q', q);
    const { rows, counts } = await api('/api/admin/inquiries?' + p);

    for (const k of ['all', ...Object.keys(STATUS)])
      $('#c-' + k).textContent = counts[k] || 0;

    if (!rows.length) {
      box.innerHTML = (q || filter)
        ? empty('0', '조건에 맞는 상담이 없습니다',
                '검색어를 지우거나 다른 상태를 눌러 보세요.')
        : empty('—', '아직 접수된 상담이 없습니다',
                '사이트의 가맹 상담 신청이 들어오면 이 자리에 쌓입니다. ' +
                '접수되면 상태를 바꿔가며 진행 상황을 관리하세요.');
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
    box.innerHTML = empty('!', '목록을 불러오지 못했습니다', esc(ex.message));
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

/* ── 매장 목록 ──────────────────────────────────────────────────────────
   평소에는 읽기 전용입니다. [수정]으로 폼을 열고 [저장]을 눌러야 반영됩니다 —
   칸을 벗어날 때마다 저장하던 예전 방식은 잘못 건드린 값까지 그대로 넘어갔습니다.

   · 순서   화면에 보이는 그대로 1부터. ▲▼ 로 옮기고 sort 를 1..N 으로 다시 매깁니다.
   · 지역   주소에서 자동으로 정합니다. 사이트 필터가 서울·경기·지방 셋뿐이라
            그 외 시·도는 모두 '지방'으로 묶습니다.
   · 주소   카카오(다음) 우편번호 서비스를 눌렀을 때만 불러옵니다.        */
const REGIONS = ['서울', '경기', '지방'];
const NEW = '__new__';                 // 아직 저장되지 않은 행
let stores = [];
let editing = null;                    // 편집 중인 매장 id

function regionOf(addr) {
  const s = String(addr || '').trim();
  if (!s) return '';
  if (/^서울/.test(s)) return '서울';
  if (/^경기/.test(s)) return '경기';
  return '지방';
}

const badge = (on, cls, txt) => on ? `<span class="bdg ${cls}">${txt}</span>` : '';

function viewRow(s, i, last) {
  return `
    <div class="adm-store" data-id="${s.id}">
      <div class="ord">
        <span class="n">${i + 1}</span>
        <span class="mv">
          <button class="ib" data-up ${i === 0 ? 'disabled' : ''} title="위로" aria-label="${esc(s.name)} 위로">▲</button>
          <button class="ib" data-down ${last ? 'disabled' : ''} title="아래로" aria-label="${esc(s.name)} 아래로">▼</button>
        </span>
      </div>
      <div class="nm">${esc(s.name)}</div>
      <div class="rg">${esc(s.region) || '<span class="dim">—</span>'}</div>
      <div class="ad">${esc(s.address) || '<span class="dim">주소 미입력</span>'}</div>
      <div class="hr">${esc(s.hours) || '<span class="dim">—</span>'}</div>
      <div class="bdgs">${badge(s.is_main, 'main', '본점') + badge(s.is_new, 'new', 'NEW') +
        badge(s.is_soon, '', '예정') + badge(!s.published, 'off', '비공개')
        || '<span class="dim">—</span>'}</div>
      <div class="adm-act">
        <button class="adm-btn" data-edit>수정</button>
        <button class="adm-btn danger" data-del>삭제</button>
      </div>
    </div>`;
}

const flag = (s, f, txt) =>
  `<label><input type="checkbox" data-f="${f}"${s[f] ? ' checked' : ''}>${txt}</label>`;

function editRow(s) {
  const isNew = s.id === NEW;
  return `
    <div class="adm-store editing" data-id="${s.id}" data-region="${esc(s.region) || '서울'}">
      <div class="adm-edit">
        <div class="eh">${isNew ? '새 매장 추가' : esc(s.name) + ' 수정'}</div>
        <div class="eg">
          <label class="f"><span>지점명</span>
            <input type="text" data-f="name" value="${esc(s.name)}" placeholder="예) 매봉역점" maxlength="60"></label>
          <label class="f"><span>영업 정보</span>
            <input type="text" data-f="hours" value="${esc(s.hours)}" placeholder="예) 15:40 라스트오더" maxlength="80"></label>
          <div class="f f-addr"><span>주소</span>
            <div class="addr">
              <input type="text" data-f="address" value="${esc(s.address)}"
                     placeholder="주소 검색을 눌러 찾은 뒤 동·호수를 이어서 적으세요" maxlength="200">
              <button type="button" class="adm-btn lg" data-find>주소 검색</button>
            </div>
            <p class="ehint"><b data-region>${esc(s.region) || '—'}</b>지역은 주소에서 자동으로 정해집니다.
              사이트의 지역 필터 버튼과 연결됩니다.</p>
          </div>
          <div class="f f-flag"><span>표시 설정</span>
            <div class="adm-flags">
              ${flag(s, 'is_main', '본점')}${flag(s, 'is_new', 'NEW')}
              ${flag(s, 'is_soon', '예정')}${flag(s, 'published', '사이트에 게시')}
            </div>
          </div>
        </div>
        <div class="ea">
          <button type="button" class="adm-btn primary lg" data-save>저장</button>
          <button type="button" class="adm-btn lg" data-cancel>취소</button>
        </div>
      </div>
    </div>`;
}

function render() {
  const box = $('#strList');
  if (!stores.length) {
    box.innerHTML = empty('—', '등록된 매장이 없습니다',
      '오른쪽 위 “+ 매장 추가”로 지점을 만들고 주소와 영업 정보를 채우세요.');
    return;
  }
  box.innerHTML = stores.map((s, i) =>
    String(s.id) === String(editing) ? editRow(s) : viewRow(s, i, i === stores.length - 1)
  ).join('');
}

async function loadStr() {
  const box = $('#strList');
  box.innerHTML = skeleton(3);
  try {
    const { rows } = await api('/api/admin/stores');
    stores = rows; editing = null;
    render();
  } catch (ex) {
    box.innerHTML = empty('!', '매장 목록을 불러오지 못했습니다', esc(ex.message));
  }
}

/* 지역 표시를 주소에 맞춰 갱신합니다 */
function syncRegion(row) {
  const addr = row.querySelector('[data-f=address]').value;
  const r = regionOf(addr) || row.dataset.region || '서울';
  row.dataset.region = r;
  row.querySelector('[data-region]').textContent = r;
}

/* ── 주소 검색 (카카오 우편번호) ────────────────────────────────────────
   별도 창으로 엽니다. 페이지 안에 iframe 으로 넣으면 그 문서가 우리 CSP 를
   그대로 물려받아 내부 리소스가 전부 막힙니다(about:blank 상속).
   창은 자기 출처의 정책을 따르므로 우리 쪽은 스크립트 출처 하나만 열면 됩니다. */
let daumP;
function loadDaum() {
  if (daumP) return daumP;
  daumP = new Promise((ok, no) => {
    const el = document.createElement('script');
    el.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    el.onload = () => ok(window.daum);
    el.onerror = () => { daumP = null; no(new Error('주소 검색을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.')); };
    document.head.appendChild(el);
  });
  return daumP;
}

/* 팝업 차단을 피하려면 클릭 그 순간에 열어야 합니다.
   그래서 편집 폼이 열릴 때 미리 스크립트를 받아 둡니다. */
function openAddr(row) {
  if (!window.daum || !daum.Postcode) {
    loadDaum().catch(() => {});
    toast('주소 검색을 준비하고 있습니다. 잠시 뒤 다시 눌러 주세요.', true);
    return;
  }
  const inp = row.querySelector('[data-f=address]');
  /* 팝업이 막히면 아무 일도 안 일어난 것처럼 보입니다 —
     창이 안 열렸을 때를 잡아 무엇을 해야 하는지 알려 줍니다. */
  const openOrig = window.open;
  let win;
  window.open = function () { win = openOrig.apply(window, arguments); return win; };
  try {
    new daum.Postcode({
      oncomplete(d) {
        let a = d.roadAddress || d.jibunAddress;
        if (d.buildingName) a += ', ' + d.buildingName;
        inp.value = a;
        syncRegion(row);
        inp.focus();
        inp.setSelectionRange(a.length, a.length);
        toast('주소를 넣었습니다. 동·호수는 이어서 적으세요.');
      }
    }).open({ popupTitle: '복만당 매장 주소 검색', autoClose: true });
  } finally { window.open = openOrig; }
  if (!win) toast('브라우저가 팝업을 막았습니다. 주소창의 팝업 차단 아이콘에서 허용한 뒤 다시 눌러 주세요.', true);
}

/* ── 저장 ───────────────────────────────────────────────────────────── */
async function saveStore(row) {
  const g = f => row.querySelector(`[data-f="${f}"]`);
  const body = {
    name:    g('name').value.trim(),
    address: g('address').value.trim(),
    hours:   g('hours').value.trim(),
    is_main: g('is_main').checked, is_new: g('is_new').checked,
    is_soon: g('is_soon').checked, published: g('published').checked
  };
  body.region = regionOf(body.address) || row.dataset.region || '서울';
  if (!REGIONS.includes(body.region)) body.region = '지방';
  if (!body.name) { toast('지점명을 입력해 주세요.', true); g('name').focus(); return; }

  const btn = row.querySelector('[data-save]');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    if (row.dataset.id === NEW) {
      body.sort = stores.length;
      await api('/api/admin/stores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      await api('/api/admin/stores', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.dataset.id, ...body })
      });
    }
    toast('저장했습니다.');
    await loadStr();
  } catch (ex) {
    toast(ex.message, true);
    btn.disabled = false; btn.textContent = '저장';
  }
}

/* ── 순서 이동 ──────────────────────────────────────────────────────────
   화면을 먼저 바꾸고 서버를 뒤따르게 합니다. 실패하면 서버 값으로 되돌립니다. */
async function move(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= stores.length) return;
  [stores[i], stores[j]] = [stores[j], stores[i]];
  render();
  const changed = stores.filter((s, k) => s.id !== NEW && s.sort !== k + 1);
  try {
    await Promise.all(changed.map(s => {
      const k = stores.indexOf(s) + 1;
      return api('/api/admin/stores', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, sort: k })
      }).then(() => { s.sort = k; });
    }));
    toast('순서를 바꿨습니다.');
  } catch (ex) { toast(ex.message, true); loadStr(); }
}

/* ── 조작 ───────────────────────────────────────────────────────────── */
$('#strList').addEventListener('click', async e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const row = btn.closest('.adm-store'); if (!row) return;
  const id = row.dataset.id;
  const i = stores.findIndex(s => String(s.id) === id);

  if (btn.hasAttribute('data-up'))   return move(i, -1);
  if (btn.hasAttribute('data-down')) return move(i, 1);
  if (btn.hasAttribute('data-find')) return openAddr(row);
  if (btn.hasAttribute('data-save')) return saveStore(row);

  if (btn.hasAttribute('data-edit')) {
    if (editing === NEW) stores = stores.filter(s => s.id !== NEW);
    editing = stores[i].id; render();
    loadDaum().catch(() => {});          // 주소 검색을 미리 받아 둡니다
    $('#strList').querySelector('.editing [data-f=name]').focus();
    return;
  }
  if (btn.hasAttribute('data-cancel')) {
    if (id === NEW) stores = stores.filter(s => s.id !== NEW);
    editing = null; render();
    return;
  }
  if (btn.hasAttribute('data-del')) {
    const nm = stores[i] ? stores[i].name : '이 매장';
    if (!confirm(`${nm} 을(를) 목록에서 삭제합니다.\n\n되돌릴 수 없습니다. 계속할까요?`)) return;
    try {
      await api('/api/admin/stores?id=' + encodeURIComponent(id), { method: 'DELETE' });
      toast('삭제했습니다.'); loadStr();
    } catch (ex) { toast(ex.message, true); }
  }
});

/* 주소를 직접 고쳐도 지역이 따라오게 합니다 */
$('#strList').addEventListener('input', e => {
  if (e.target.matches('[data-f=address]')) syncRegion(e.target.closest('.adm-store'));
});

$('#addStore').onclick = () => {
  if (stores.some(s => s.id === NEW)) return;
  stores.push({ id: NEW, name: '', region: '서울', address: '', hours: '',
                is_main: false, is_new: false, is_soon: false, published: false });
  editing = NEW; render();
  loadDaum().catch(() => {});
  const el = $('#strList').querySelector('.editing');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.querySelector('[data-f=name]').focus();
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
