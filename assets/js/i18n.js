/* 복만당 — 다국어 (KR · EN · CN · JP)
 * ─────────────────────────────────────────────────────────────────────────
 * 한국어 원문을 그대로 열쇠로 씁니다. HTML 300여 곳에 data-i 를 다는 대신
 * 화면의 글을 훑어 사전에서 찾아 바꿉니다. 문구를 고쳐도 사전만 채우면 됩니다.
 *
 * ★ 이 파일은 main.js 보다 먼저 실행돼야 합니다.
 *   main.js 가 제목을 줄·글자 단위 <span> 으로 쪼개 애니메이션을 걸기 때문에,
 *   그 뒤에 바꾸면 구조가 깨집니다.
 *
 * 문장 한복판에 <span class="num">10,000</span> 같은 조각이 들어 있어서
 * 글자 노드를 하나씩 바꾸면 "곰탕은" / "원에서 시작합니다" 처럼 쪼개집니다.
 * 어순이 다른 언어에서는 그대로 두면 문장이 깨지므로,
 * 꾸밈용 태그만 들어 있는 요소는 통째로 한 문장으로 다룹니다.
 *
 * 번역하지 않는 것 (의도적)
 *   · 매장 주소·지점명 — 번역하면 찾아갈 수 없습니다 (data-no-i18n)
 *   · 개인정보처리방침 — 법적 효력이 있는 문서라 기계 번역하지 않습니다
 *   · 관리자 화면과 관리자가 넣은 내용(메뉴·매장·팝업·문구) — 한국어로 운영합니다
 *
 * 사전: assets/js/i18n-en.js · -cn.js · -jp.js 가 window.I18N 에 넣습니다.
 */
(function () {
  'use strict';

  var LANGS = [
    { code: 'ko', label: 'KR', html: 'ko-KR' },
    { code: 'en', label: 'EN', html: 'en'    },
    { code: 'cn', label: 'CN', html: 'zh-CN' },
    { code: 'jp', label: 'JP', html: 'ja'    }
  ];
  var KEY = 'bm.lang';

  /* 어떤 언어로 보여줄지 —
     주소의 ?lang= → 저장된 선택 → 도메인 기본값(.com 은 영어) → 한국어 */
  function pick() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.some(function (l) { return l.code === q; })) return q;
    try {
      var saved = localStorage.getItem(KEY);
      if (saved && LANGS.some(function (l) { return l.code === saved; })) return saved;
    } catch (e) {}
    if (/(^|\.)bokmandang\.com$/i.test(location.hostname)) return 'en';
    return 'ko';
  }

  var lang = pick();
  var dict = (window.I18N && window.I18N[lang]) || null;

  var SKIP   = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, CODE: 1, PRE: 1 };
  /* 지워도 뜻이 상하지 않는 꾸밈 태그 — 이것만 들어 있으면 문장 하나로 봅니다 */
  var INLINE = { SPAN: 1, B: 1, STRONG: 1, EM: 1, I: 1, SMALL: 1, BR: 1, Q: 1, U: 1, MARK: 1 };
  var HAS_KO = /[가-힣]/;
  var NL = String.fromCharCode(10);

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function norm(s) {
    return String(s).replace(/[ \t]+/g, ' ')
                    .replace(new RegExp('\\s*' + NL + '\\s*', 'g'), NL)
                    .trim();
  }

  function tr(s) {
    if (!dict) return null;
    var k = norm(s);
    if (!k) return null;
    var v = dict[k];
    return (typeof v === 'string' && v) ? v : null;
  }

  /* 요소의 글을 열쇠로 만듭니다 — <br> 은 줄바꿈으로 남깁니다 */
  function keyOf(el) {
    var out = '';
    [].forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) out += n.nodeValue;
      else if (n.nodeName === 'BR') out += NL;
      else if (n.nodeType === 1) out += keyOf(n);
    });
    return out;
  }

  /* 통째로 바꿔도 되는 요소인가 — 링크·버튼·아이콘이 들어 있으면 안 됩니다 */
  function isLeaf(el) {
    for (var i = 0; i < el.children.length; i++) {
      if (!INLINE[el.children[i].nodeName]) return false;
    }
    return true;
  }

  function walk(root) {
    if (!dict || !root) return;

    (function visit(el) {
      if (SKIP[el.nodeName]) return;
      if (el.hasAttribute && el.hasAttribute('data-no-i18n')) return;

      if (isLeaf(el) && HAS_KO.test(el.textContent)) {
        var t = tr(keyOf(el));
        if (t !== null) {
          el.innerHTML = esc(t).split(NL).join('<br>');
          return;
        }
      }
      /* 통째로 못 바꾸면 자식으로 내려가고, 이 요소가 직접 가진 글자도 손봅니다 */
      [].slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeType === 1) visit(n);
        else if (n.nodeType === 3 && HAS_KO.test(n.nodeValue)) {
          var v = tr(n.nodeValue);
          if (v === null) return;
          var lead = n.nodeValue.match(/^\s*/)[0];
          var tail = n.nodeValue.match(/\s*$/)[0];
          n.nodeValue = lead + v + tail;
        }
      });
    })(root);

    /* 속성도 함께 — 안 바꾸면 화면은 영어인데 툴팁·대체텍스트만 한국어로 남습니다 */
    ['placeholder', 'aria-label', 'alt', 'title'].forEach(function (a) {
      [].forEach.call(root.querySelectorAll('[' + a + ']'), function (el) {
        if (el.closest('[data-no-i18n]')) return;
        var t = tr(el.getAttribute(a));
        if (t !== null) el.setAttribute(a, t);
      });
    });
  }

  /* ── 언어 전환 버튼 ────────────────────────────────────────────────── */
  function paintSwitch() {
    var box = document.getElementById('lang');
    if (!box) return;
    box.innerHTML = LANGS.map(function (l) {
      return '<button type="button" data-lang="' + l.code + '"' +
             (l.code === lang ? ' class="on" aria-current="true"' : '') +
             ' lang="en">' + l.label + '</button>';
    }).join('');

    box.onclick = function (e) {
      var b = e.target.closest('button[data-lang]');
      if (!b || b.dataset.lang === lang) return;
      try { localStorage.setItem(KEY, b.dataset.lang); } catch (err) {}
      /* 통째로 다시 읽습니다 — 이미 쪼개진 제목을 되돌리는 것보다 확실합니다 */
      var u = new URL(location.href);
      u.searchParams.set('lang', b.dataset.lang);
      location.replace(u.toString());
    };
  }

  /* ── 검색엔진에 언어를 알려 줍니다 ─────────────────────────────────── */
  function seo() {
    var meta = LANGS.filter(function (l) { return l.code === lang; })[0];
    document.documentElement.lang = meta ? meta.html : 'ko-KR';

    /* <head> 는 walk 가 훑지 않습니다 — 브라우저 탭 제목과 검색 설명은 여기서 */
    var ttl = tr(document.title);
    if (ttl !== null) document.title = ttl;
    var desc = document.head.querySelector('meta[name=description]');
    if (desc) {
      var d = tr(desc.content);
      if (d !== null) desc.content = d;
    }
    /* og:* 는 그대로 둡니다 — 링크 미리보기를 긁는 쪽은 JS 를 돌리지 않습니다 */

    [].forEach.call(document.head.querySelectorAll('link[rel=alternate][hreflang]'),
      function (e) { e.remove(); });
    LANGS.forEach(function (l) {
      var u = new URL(location.href);
      u.searchParams.set('lang', l.code);
      var link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = l.html;
      link.href = u.toString();
      document.head.appendChild(link);
    });
  }

  walk(document.body);
  paintSwitch();
  seo();

  /* 나중에 그려지는 것(메뉴 카드·팝업)도 같은 사전으로 바꿀 수 있게 열어 둡니다 */
  window.BM_I18N = { lang: lang, t: tr, apply: walk };
})();
