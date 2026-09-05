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
function enter() { show('app'); loadInq(); loadStr(); loadMenus(); loadPopups(); loadTexts(); }

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

/* ── 탭 ───────────────────────────────────────────────────────────────
   상담 접수는 탭 묶음 밖에 따로 있습니다(성격이 다릅니다) — 둘을 함께 다룹니다. */
const VIEWS = ['inq', 'str', 'men', 'pop', 'txt'];
const TABS = () => [...document.querySelectorAll('.adm-tab button, .adm-inq')];

function showView(view) {
  TABS().forEach(x => x.classList.toggle('on', x.dataset.view === view));
  VIEWS.forEach(v => { $('#view-' + v).hidden = v !== view; });
}
TABS().forEach(b => b.onclick = () => showView(b.dataset.view));

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

    /* 아직 손대지 않은 상담이 몇 건인지 헤더에 띄웁니다 —
       탭을 눌러 보지 않아도 새 문의가 왔는지 알 수 있게. */
    const badge = $('#inqBadge');
    if (badge) {
      const fresh = counts.new || 0;
      badge.textContent = fresh;
      badge.hidden = !fresh;
      $('#tabInq').classList.toggle('has-new', !!fresh);
    }

    if (!rows.length) {
      box.innerHTML = (q || filter)
        ? empty('0', '조건에 맞는 상담이 없습니다',
                '검색어를 지우거나 다른 상태를 눌러 보세요.')
        : empty('-', '아직 접수된 상담이 없습니다',
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

/* ── 엑셀(CSV) 내려받기 ────────────────────────────────────────────────
   지금 고른 상태·검색어가 그대로 반영됩니다. 화면에 보이는 것을 그대로 받는 셈입니다.

   엑셀에서 깨지지 않게 두 가지를 맞춥니다.
     · UTF-8 BOM 을 붙입니다 — 없으면 한글이 전부 깨져 보입니다.
     · 연락처를 010-0000-0000 꼴로 만듭니다 — 숫자만 있으면 엑셀이 수로 읽어
       앞자리 0 을 없애 버립니다. */
const CSV_MAX = 500;                       // API 가 한 번에 주는 최대치

const csvCell = v => {
  const t = String(v ?? '').replace(/\r?\n/g, ' ').trim();
  return /[",;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

function csvPhone(v) {
  const d = String(v ?? '').replace(/[^0-9]/g, '');
  // 서울은 국번이 두 자리입니다 — 세 자리로 끊으면 021-234-5678 처럼 엉뚱해집니다
  if (d.startsWith('02')) {
    if (d.length === 10) return `02-${d.slice(2,6)}-${d.slice(6)}`;
    if (d.length === 9)  return `02-${d.slice(2,5)}-${d.slice(5)}`;
  }
  if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  return String(v ?? '');                  // 형식을 모르면 원본 그대로
}

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
};

$('#dlCsv').onclick = async () => {
  const btn = $('#dlCsv');
  btn.disabled = true;
  const label = btn.innerHTML;
  btn.textContent = '만드는 중…';
  try {
    const p = new URLSearchParams({ limit: String(CSV_MAX) });
    if (filter) p.set('status', filter);
    if (q) p.set('q', q);
    const { rows } = await api('/api/admin/inquiries?' + p);
    if (!rows.length) { toast('내려받을 상담이 없습니다.', true); return; }

    const head = ['접수일시','신청자','연락처','희망 지역','예산','문의 내용','진행 상태','담당자 메모'];
    const body = rows.map(r => [
      fmt(r.created_at), r.name, csvPhone(r.phone), r.region, r.budget,
      r.message, STATUS[r.status] || r.status, r.memo
    ].map(csvCell).join(','));

    // ﻿ = BOM. 엑셀이 UTF-8 로 읽게 하는 표시입니다.
    const blob = new Blob(['﻿' + [head.join(','), ...body].join('\r\n')],
                          { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `복만당-가맹상담-${stamp()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast(rows.length >= CSV_MAX
      ? `${rows.length}건을 받았습니다. 최대치라 더 있을 수 있으니 상태로 나눠 받으세요.`
      : `${rows.length}건을 내려받았습니다.`);
  } catch (ex) {
    toast(ex.message, true);
  } finally {
    btn.disabled = false; btn.innerHTML = label;
  }
};

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
      <div class="rg">${esc(s.region) || '<span class="dim">-</span>'}</div>
      <div class="ad">${esc(s.address) || '<span class="dim">주소 미입력</span>'}</div>
      <div class="hr">${esc(s.hours) || '<span class="dim">-</span>'}
        ${s.phone ? `<span class="sub">${esc(s.phone)}</span>` : ''}
        ${s.closed ? `<span class="sub">${esc(s.closed)} 휴무</span>` : ''}</div>
      <div class="bdgs">${badge(s.is_main, 'main', '본점') + badge(s.is_new, 'new', 'NEW') +
        badge(s.is_soon, '', '예정') + badge(!s.published, 'off', '비공개')
        || '<span class="dim">-</span>'}</div>
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
            <p class="ehint"><b data-region>${esc(s.region) || '-'}</b>지역은 주소에서 자동으로 정해집니다.
              사이트의 지역 필터 버튼과 연결됩니다.</p>
          </div>
          <label class="f"><span>전화번호</span>
            <input type="text" data-f="phone" value="${esc(s.phone)}" placeholder="예) 02-565-5288" maxlength="40"></label>
          <label class="f"><span>휴무일</span>
            <input type="text" data-f="closed" value="${esc(s.closed)}" placeholder="예) 매주 일요일" maxlength="60"></label>
          <div class="f f-addr"><span>네이버 지도 링크</span>
            <input type="text" data-f="map_url" value="${esc(s.map_url)}"
                   placeholder="네이버 지도에서 이 지점을 열고 주소창을 복사해 붙여넣으세요" maxlength="500">
            <p class="ehint">손님이 <b>‘지도 보기’</b>를 누르면 여기로 갑니다.
              영업시간을 안 채운 지점은 <b>‘지도에서 영업시간 확인’</b>으로 안내되니,
              시간이 바뀌어도 지도만 최신이면 됩니다.
              비워 두면 지점명으로 네이버 검색을 엽니다.</p>
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
    box.innerHTML = empty('-', '등록된 매장이 없습니다',
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
    phone:   g('phone').value.trim(),
    closed:  g('closed').value.trim(),
    map_url: g('map_url').value.trim(),
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
                phone: '', closed: '', map_url: '',
                is_main: false, is_new: false, is_soon: false, published: false });
  editing = NEW; render();
  loadDaum().catch(() => {});
  const el = $('#strList').querySelector('.editing');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.querySelector('[data-f=name]').focus();
};

/* ── 메뉴 관리 ──────────────────────────────────────────────────────────
   매장 목록과 같은 방식입니다 — 평소엔 읽기 전용, [수정]으로 폼을 열고 [저장]으로 확정.

   사진은 브라우저에서 줄여 올립니다. 서버에서 이미지를 다루려면 sharp 같은
   의존성이 필요한데 이 프로젝트는 의존성 없이 굴러가는 게 원칙이라,
   캔버스로 1600px JPEG 을 만들어 보냅니다. 원본을 그대로 골라도 됩니다. */
const CATS = { tang: '곰탕', side: '사이드', kit: '밀키트' };
let menus = [];
let mEditing = null;

const won = n => Number(n || 0).toLocaleString('ko-KR');

/* 사진 미리보기 — 올린 사진이 있으면 그것, 없으면 저장소의 기본 사진 */
const menuThumb = m =>
  m.image_url ? m.image_url
  : m.image_key ? `assets/img/${m.image_key}-800.webp`
  : '';

function menuView(m, i, last) {
  const th = menuThumb(m);
  return `
    <div class="adm-menu" data-id="${m.id}">
      <div class="ord">
        <span class="n">${i + 1}</span>
        <span class="mv">
          <button class="ib" data-mup ${i === 0 ? 'disabled' : ''} title="위로" aria-label="${esc(m.name)} 위로">▲</button>
          <button class="ib" data-mdown ${last ? 'disabled' : ''} title="아래로" aria-label="${esc(m.name)} 아래로">▼</button>
        </span>
      </div>
      <div class="th">${th ? `<img src="${esc(th)}" alt="" loading="lazy">` : '<span class="no">사진 없음</span>'}</div>
      <div class="nm">${esc(m.name)}${m.tag ? `<span class="bdg new">${esc(m.tag)}</span>` : ''}
        <span class="ds">${esc(m.description) || '<span class="dim">설명 없음</span>'}</span></div>
      <div class="rg">${CATS[m.category] || m.category}</div>
      <div class="pr">${won(m.price)}<small>${esc(m.unit)}</small></div>
      <div class="bdgs">${m.published ? '<span class="dim">-</span>' : '<span class="bdg off">비공개</span>'}</div>
      <div class="adm-act">
        <button class="adm-btn" data-medit>수정</button>
        <button class="adm-btn danger" data-mdel>삭제</button>
      </div>
    </div>`;
}

function menuEdit(m) {
  const isNew = m.id === NEW;
  const th = menuThumb(m);
  return `
    <div class="adm-menu editing" data-id="${m.id}">
      <div class="adm-edit">
        <div class="eh">${isNew ? '새 메뉴 추가' : esc(m.name) + ' 수정'}</div>
        <div class="eg">
          <label class="f"><span>메뉴명</span>
            <input type="text" data-f="name" value="${esc(m.name)}" placeholder="예) 우설곰탕" maxlength="60"></label>
          <label class="f"><span>가격</span>
            <input type="text" data-f="price" value="${won(m.price)}" placeholder="숫자만" inputmode="numeric"></label>
          <label class="f"><span>분류</span>
            <select data-f="category">${Object.entries(CATS).map(([v, l]) =>
              `<option value="${v}"${v === m.category ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="f"><span>단위</span>
            <input type="text" data-f="unit" value="${esc(m.unit || '원')}" placeholder="원 / 원 · 1알" maxlength="20"></label>
          <label class="f f-addr"><span>설명</span>
            <input type="text" data-f="description" value="${esc(m.description)}"
                   placeholder="메뉴 카드에 한 줄로 들어갑니다" maxlength="300"></label>
          <label class="f"><span>배지</span>
            <input type="text" data-f="tag" value="${esc(m.tag)}" placeholder="BEST · SIGNATURE (비워도 됩니다)" maxlength="20"></label>
          <div class="f"><span>표시 설정</span>
            <div class="adm-flags">
              <label><input type="checkbox" data-f="published"${m.published ? ' checked' : ''}>사이트에 게시</label>
            </div>
          </div>

          <div class="f f-addr"><span>사진</span>
            <div class="pho">
              <div class="pv" data-pv>${th ? `<img src="${esc(th)}" alt="">` : '<span class="no">사진 없음</span>'}</div>
              <div class="pa">
                <label class="adm-btn lg" tabindex="0">대표 사진 고르기
                  <input type="file" accept="image/*" data-pick="1" hidden></label>
                <label class="adm-btn lg" tabindex="0">두 번째 컷
                  <input type="file" accept="image/*" data-pick="2" hidden></label>
                <p class="ehint" data-pmsg>JPG · PNG · WebP. 올리면 <span class="num">1600</span>px 로 줄여 저장합니다.
                  ${m.image_url2 ? '두 번째 컷이 등록돼 있습니다.' : ''}</p>
              </div>
            </div>
            <input type="hidden" data-f="image_url"  value="${esc(m.image_url)}">
            <input type="hidden" data-f="image_url2" value="${esc(m.image_url2)}">
          </div>
        </div>
        <div class="ea">
          <button type="button" class="adm-btn primary lg" data-msave>저장</button>
          <button type="button" class="adm-btn lg" data-mcancel>취소</button>
        </div>
      </div>
    </div>`;
}

function renderMenus() {
  const box = $('#menList');
  if (!menus.length) {
    box.innerHTML = empty('-', '등록된 메뉴가 없습니다',
      '오른쪽 위 “+ 메뉴 추가”로 메뉴를 만드세요. 만들기 전까지는 사이트에 기본 메뉴가 그대로 보입니다.');
    return;
  }
  box.innerHTML = menus.map((m, i) =>
    String(m.id) === String(mEditing) ? menuEdit(m) : menuView(m, i, i === menus.length - 1)
  ).join('');
}

async function loadMenus() {
  const box = $('#menList');
  box.innerHTML = skeleton(3);
  try {
    const { rows } = await api('/api/admin/menu');
    menus = rows; mEditing = null;
    renderMenus();
  } catch (ex) {
    box.innerHTML = empty('!', '메뉴를 불러오지 못했습니다', esc(ex.message));
  }
}

/* 캔버스로 줄여 data URL 로 만듭니다 — 원본 4MB 를 그대로 올리면 함수가 막습니다 */
function shrink(file, max = 1600) {
  return new Promise((ok, no) => {
    const fr = new FileReader();
    fr.onerror = () => no(new Error('사진을 읽지 못했습니다.'));
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => no(new Error('사진 형식을 알 수 없습니다.'));
      im.onload = () => {
        let { width: w, height: h } = im;
        if (Math.max(w, h) > max) { const r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        ok(cv.toDataURL('image/jpeg', 0.85));
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

async function pickPhoto(row, input) {
  const file = input.files && input.files[0];
  input.value = '';                       // 같은 파일을 다시 골라도 change 가 나도록
  if (!file) return;
  const slot = input.dataset.pick;        // '1' 대표 · '2' 두 번째 컷
  const msg = row.querySelector('[data-pmsg]');
  const name = (row.querySelector('[data-f=name]').value || 'menu').trim();
  msg.textContent = '사진을 줄이는 중…';
  try {
    const data = await shrink(file);
    msg.textContent = '올리는 중…';
    const r = await api('/api/admin/menu-photo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: slot === '2' ? name + '-2' : name, data })
    });
    row.querySelector(slot === '2' ? '[data-f=image_url2]' : '[data-f=image_url]').value = r.url;
    if (slot === '1') {
      const pv = row.querySelector('[data-pv]');
      pv.innerHTML = `<img src="${r.url}" alt="">`;
    }
    msg.textContent = slot === '2'
      ? '두 번째 컷을 올렸습니다. 저장을 눌러야 반영됩니다.'
      : '대표 사진을 올렸습니다. 저장을 눌러야 반영됩니다.';
  } catch (ex) {
    msg.textContent = ex.message;
    toast(ex.message, true);
  }
}

async function saveMenu(row) {
  const g = f => row.querySelector(`[data-f="${f}"]`);
  const body = {
    name:        g('name').value.trim(),
    description: g('description').value.trim(),
    price:       g('price').value,
    unit:        g('unit').value.trim() || '원',
    category:    g('category').value,
    tag:         g('tag').value.trim(),
    image_url:   g('image_url').value.trim(),
    image_url2:  g('image_url2').value.trim(),
    published:   g('published').checked
  };
  if (!body.name) { toast('메뉴명을 입력해 주세요.', true); g('name').focus(); return; }

  const btn = row.querySelector('[data-msave]');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    if (row.dataset.id === NEW) {
      body.sort = menus.length;
      await api('/api/admin/menu', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      await api('/api/admin/menu', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.dataset.id, ...body })
      });
    }
    toast('저장했습니다.');
    await loadMenus();
  } catch (ex) {
    toast(ex.message, true);
    btn.disabled = false; btn.textContent = '저장';
  }
}

async function moveMenu(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= menus.length) return;
  [menus[i], menus[j]] = [menus[j], menus[i]];
  renderMenus();
  const changed = menus.filter((m, k) => m.id !== NEW && m.sort !== k + 1);
  try {
    await Promise.all(changed.map(m => {
      const k = menus.indexOf(m) + 1;
      return api('/api/admin/menu', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, sort: k })
      }).then(() => { m.sort = k; });
    }));
    toast('순서를 바꿨습니다.');
  } catch (ex) { toast(ex.message, true); loadMenus(); }
}

$('#menList').addEventListener('change', e => {
  if (e.target.matches('[data-pick]')) pickPhoto(e.target.closest('.adm-menu'), e.target);
});
/* 파일 고르기 버튼은 label 이라 Enter 로 안 열립니다 — 키보드에서도 열리게 합니다 */
$('#menList').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const lb = e.target.closest('label.adm-btn'); if (!lb) return;
  e.preventDefault(); lb.querySelector('input[type=file]').click();
});

$('#menList').addEventListener('click', async e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const row = btn.closest('.adm-menu'); if (!row) return;
  const id = row.dataset.id;
  const i = menus.findIndex(m => String(m.id) === id);

  if (btn.hasAttribute('data-mup'))    return moveMenu(i, -1);
  if (btn.hasAttribute('data-mdown'))  return moveMenu(i, 1);
  if (btn.hasAttribute('data-msave'))  return saveMenu(row);

  if (btn.hasAttribute('data-medit')) {
    if (mEditing === NEW) menus = menus.filter(m => m.id !== NEW);
    mEditing = menus[i].id; renderMenus();
    $('#menList').querySelector('.editing [data-f=name]').focus();
    return;
  }
  if (btn.hasAttribute('data-mcancel')) {
    if (id === NEW) menus = menus.filter(m => m.id !== NEW);
    mEditing = null; renderMenus();
    return;
  }
  if (btn.hasAttribute('data-mdel')) {
    const nm = menus[i] ? menus[i].name : '이 메뉴';
    if (!confirm(`${nm} 을(를) 메뉴에서 삭제합니다.\n\n되돌릴 수 없습니다. 계속할까요?`)) return;
    try {
      await api('/api/admin/menu?id=' + encodeURIComponent(id), { method: 'DELETE' });
      toast('삭제했습니다.'); loadMenus();
    } catch (ex) { toast(ex.message, true); }
  }
});

$('#addMenu').onclick = () => {
  if (menus.some(m => m.id === NEW)) return;
  menus.push({ id: NEW, name: '', category: 'tang', description: '', price: 0, unit: '원',
               tag: '', image_key: '', image_url: '', image_url2: '', published: false });
  mEditing = NEW; renderMenus();
  const el = $('#menList').querySelector('.editing');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.querySelector('[data-f=name]').focus();
};

/* ── 팝업 ───────────────────────────────────────────────────────────────
   메뉴·매장과 같은 방식입니다 — 평소엔 읽기 전용, [수정] 으로 열고 [저장] 으로 확정.
   형태는 두 가지뿐입니다: 화면 맨 위 띠배너 / 화면 가운데 모달. */
const KINDS = { banner: '띠배너', modal: '모달' };
let popups = [];
let pEditing = null;

const dateText = p => {
  const a = p.starts_at || '', b = p.ends_at || '';
  if (!a && !b) return '<span class="dim">기간 제한 없음</span>';
  return `${a || '지금부터'} <span class="dim">~</span> ${b || '계속'}`;
};

/* 기간이 끝났는지 화면에서 바로 알 수 있게 표시합니다 */
function popState(p) {
  const today = new Date().toISOString().slice(0, 10);
  if (!p.published) return '<span class="bdg off">비공개</span>';
  if (p.ends_at && p.ends_at < today) return '<span class="bdg off">기간 종료</span>';
  if (p.starts_at && p.starts_at > today) return '<span class="bdg">대기 중</span>';
  return '<span class="bdg new">노출 중</span>';
}

function popView(p, i, last) {
  return `
    <div class="adm-pop" data-id="${p.id}">
      <div class="ord">
        <span class="n">${i + 1}</span>
        <span class="mv">
          <button class="ib" data-pup ${i === 0 ? 'disabled' : ''} title="위로" aria-label="${esc(p.title)} 위로">▲</button>
          <button class="ib" data-pdown ${last ? 'disabled' : ''} title="아래로" aria-label="${esc(p.title)} 아래로">▼</button>
        </span>
      </div>
      <div class="rg">${KINDS[p.kind] || p.kind}</div>
      <div class="nm">${esc(p.title)}
        <span class="ds">${esc(p.body) || '<span class="dim">내용 없음</span>'}</span></div>
      <div class="hr">${dateText(p)}</div>
      <div class="bdgs">${popState(p)}</div>
      <div class="adm-act">
        <button class="adm-btn" data-pedit>수정</button>
        <button class="adm-btn danger" data-pdel>삭제</button>
      </div>
    </div>`;
}

function popEdit(p) {
  const isNew = p.id === NEW;
  return `
    <div class="adm-pop editing" data-id="${p.id}">
      <div class="adm-edit">
        <div class="eh">${isNew ? '새 팝업' : esc(p.title) + ' 수정'}</div>
        <div class="eg">
          <label class="f"><span>형태</span>
            <select data-f="kind">${Object.entries(KINDS).map(([v, l]) =>
              `<option value="${v}"${v === p.kind ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="f"><span>제목</span>
            <input type="text" data-f="title" value="${esc(p.title)}" placeholder="예) 서판교점 오픈" maxlength="80"></label>
          <label class="f f-addr"><span>내용</span>
            <input type="text" data-f="body" value="${esc(p.body)}"
                   placeholder="띠배너는 한 줄로 짧게 · 모달은 조금 길어도 됩니다" maxlength="400"></label>
          <label class="f"><span>노출 시작</span>
            <input type="date" data-f="starts_at" value="${esc(p.starts_at || '')}"></label>
          <label class="f"><span>노출 종료</span>
            <input type="date" data-f="ends_at" value="${esc(p.ends_at || '')}"></label>
          <label class="f"><span>링크 주소</span>
            <input type="text" data-f="link_url" value="${esc(p.link_url)}"
                   placeholder="https://... 또는 #store (비워도 됩니다)" maxlength="500"></label>
          <label class="f"><span>링크 문구</span>
            <input type="text" data-f="link_label" value="${esc(p.link_label || '자세히 보기')}" maxlength="30"></label>

          <div class="f f-addr" data-img${p.kind === 'banner' ? ' hidden' : ''}><span>모달 이미지</span>
            <div class="pho">
              <div class="pv" data-pv>${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<span class="no">사진 없음</span>'}</div>
              <div class="pa">
                <label class="adm-btn lg" tabindex="0">사진 고르기
                  <input type="file" accept="image/*" data-ppick hidden></label>
                <p class="ehint" data-pmsg>모달 위쪽에 <span class="num">4</span>:<span class="num">3</span> 으로 들어갑니다. 없어도 됩니다.</p>
              </div>
            </div>
            <input type="hidden" data-f="image_url" value="${esc(p.image_url)}">
          </div>

          <div class="f"><span>표시 설정</span>
            <div class="adm-flags">
              <label><input type="checkbox" data-f="published"${p.published ? ' checked' : ''}>사이트에 게시</label>
            </div>
          </div>
        </div>
        <div class="ea">
          <button type="button" class="adm-btn primary lg" data-psave>저장</button>
          <button type="button" class="adm-btn lg" data-pcancel>취소</button>
        </div>
      </div>
    </div>`;
}

function renderPopups() {
  const box = $('#popList');
  if (!popups.length) {
    box.innerHTML = empty('-', '만들어 둔 팝업이 없습니다',
      '오른쪽 위 “+ 팝업 추가”로 공지나 이벤트를 올리세요. 게시를 켜야 사이트에 나타납니다.');
    return;
  }
  box.innerHTML = popups.map((p, i) =>
    String(p.id) === String(pEditing) ? popEdit(p) : popView(p, i, i === popups.length - 1)
  ).join('');
}

async function loadPopups() {
  const box = $('#popList');
  box.innerHTML = skeleton(2);
  try {
    const { rows } = await api('/api/admin/popups');
    popups = rows; pEditing = null;
    renderPopups();
  } catch (ex) {
    box.innerHTML = empty('!', '팝업을 불러오지 못했습니다', esc(ex.message));
  }
}

async function savePopup(row) {
  const g = f => row.querySelector(`[data-f="${f}"]`);
  const body = {
    kind:       g('kind').value,
    title:      g('title').value.trim(),
    body:       g('body').value.trim(),
    starts_at:  g('starts_at').value,
    ends_at:    g('ends_at').value,
    link_url:   g('link_url').value.trim(),
    link_label: g('link_label').value.trim() || '자세히 보기',
    image_url:  g('image_url').value.trim(),
    published:  g('published').checked
  };
  if (!body.title) { toast('팝업 제목을 입력해 주세요.', true); g('title').focus(); return; }

  const btn = row.querySelector('[data-psave]');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    if (row.dataset.id === NEW) {
      body.sort = popups.length;
      await api('/api/admin/popups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      await api('/api/admin/popups', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.dataset.id, ...body })
      });
    }
    toast('저장했습니다.');
    await loadPopups();
  } catch (ex) {
    toast(ex.message, true);
    btn.disabled = false; btn.textContent = '저장';
  }
}

async function movePopup(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= popups.length) return;
  [popups[i], popups[j]] = [popups[j], popups[i]];
  renderPopups();
  const changed = popups.filter((p, k) => p.id !== NEW && p.sort !== k + 1);
  try {
    await Promise.all(changed.map(p => {
      const k = popups.indexOf(p) + 1;
      return api('/api/admin/popups', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, sort: k })
      }).then(() => { p.sort = k; });
    }));
    toast('순서를 바꿨습니다.');
  } catch (ex) { toast(ex.message, true); loadPopups(); }
}

$('#popList').addEventListener('change', async e => {
  const row = e.target.closest('.adm-pop'); if (!row) return;
  /* 띠배너에는 이미지를 쓰지 않으므로 형태를 바꾸면 사진 칸을 숨깁니다 */
  if (e.target.matches('[data-f=kind]')) {
    const box = row.querySelector('[data-img]');
    if (box) box.hidden = e.target.value === 'banner';
    return;
  }
  if (!e.target.matches('[data-ppick]')) return;
  const input = e.target, file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const msg = row.querySelector('[data-pmsg]');
  msg.textContent = '사진을 줄이는 중…';
  try {
    const data = await shrink(file);
    msg.textContent = '올리는 중…';
    const r = await api('/api/admin/menu-photo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: 'popup', name: row.querySelector('[data-f=title]').value || 'popup', data })
    });
    row.querySelector('[data-f=image_url]').value = r.url;
    row.querySelector('[data-pv]').innerHTML = `<img src="${r.url}" alt="">`;
    msg.textContent = '올렸습니다. 저장을 눌러야 반영됩니다.';
  } catch (ex) { msg.textContent = ex.message; toast(ex.message, true); }
});

$('#popList').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const lb = e.target.closest('label.adm-btn'); if (!lb) return;
  e.preventDefault(); lb.querySelector('input[type=file]').click();
});

$('#popList').addEventListener('click', async e => {
  const btn = e.target.closest('button'); if (!btn) return;
  const row = btn.closest('.adm-pop'); if (!row) return;
  const id = row.dataset.id;
  const i = popups.findIndex(p => String(p.id) === id);

  if (btn.hasAttribute('data-pup'))   return movePopup(i, -1);
  if (btn.hasAttribute('data-pdown')) return movePopup(i, 1);
  if (btn.hasAttribute('data-psave')) return savePopup(row);

  if (btn.hasAttribute('data-pedit')) {
    if (pEditing === NEW) popups = popups.filter(p => p.id !== NEW);
    pEditing = popups[i].id; renderPopups();
    $('#popList').querySelector('.editing [data-f=title]').focus();
    return;
  }
  if (btn.hasAttribute('data-pcancel')) {
    if (id === NEW) popups = popups.filter(p => p.id !== NEW);
    pEditing = null; renderPopups();
    return;
  }
  if (btn.hasAttribute('data-pdel')) {
    const nm = popups[i] ? popups[i].title : '이 팝업';
    if (!confirm(`${nm} 을(를) 삭제합니다.\n\n되돌릴 수 없습니다. 계속할까요?`)) return;
    try {
      await api('/api/admin/popups?id=' + encodeURIComponent(id), { method: 'DELETE' });
      toast('삭제했습니다.'); loadPopups();
    } catch (ex) { toast(ex.message, true); }
  }
});

$('#addPop').onclick = () => {
  if (popups.some(p => p.id === NEW)) return;
  popups.push({ id: NEW, kind: 'banner', title: '', body: '', image_url: '',
                link_url: '', link_label: '자세히 보기',
                starts_at: '', ends_at: '', published: false });
  pEditing = NEW; renderPopups();
  const el = $('#popList').querySelector('.editing');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.querySelector('[data-f=title]').focus();
};

/* ── 홈페이지 문구 ──────────────────────────────────────────────────────
   어떤 문구를 열어 둘지는 서버(api/admin/settings.js 의 ALLOWED)가 정합니다.
   화면은 받은 목록을 그대로 그리므로, 항목을 늘려도 여기는 고칠 게 없습니다. */
async function loadTexts() {
  const box = $('#txtList');
  box.innerHTML = skeleton(4);
  try {
    const { fields } = await api('/api/admin/settings');
    box.innerHTML = `<div class="adm-txt">` + fields.map(f => `
      <label class="tf">
        <span>${esc(f.label)}${f.url ? '<i>주소</i>' : ''}</span>
        ${f.multiline
          ? `<textarea data-k="${esc(f.key)}" maxlength="${f.max}" rows="3"
                       placeholder="비우면 사이트의 원래 문구가 나옵니다">${esc(f.value)}</textarea>`
          : `<input type="text" data-k="${esc(f.key)}" maxlength="${f.max}" value="${esc(f.value)}"
                    placeholder="${f.url ? 'https://…' : '비우면 사이트의 원래 문구가 나옵니다'}">`}
      </label>`).join('') + `</div>`;
  } catch (ex) {
    box.innerHTML = empty('!', '문구를 불러오지 못했습니다', esc(ex.message));
  }
}

$('#saveTxt').onclick = async () => {
  const btn = $('#saveTxt');
  const fields = [...document.querySelectorAll('#txtList [data-k]')];
  if (!fields.length) { toast('저장할 문구가 없습니다.', true); return; }
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    const body = {};
    fields.forEach(el => { body[el.dataset.k] = el.value; });
    await api('/api/admin/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    toast('문구를 저장했습니다. 사이트를 새로고침하면 보입니다.');
  } catch (ex) {
    toast(ex.message, true);
  } finally {
    btn.disabled = false; btn.innerHTML = '문구 저장';
  }
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
