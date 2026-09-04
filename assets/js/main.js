/* ===========================================================
   복만당 모션 레이어 — Motion(Framer Motion) 패턴을 WAAPI로 구현
   variants / stagger / whileInView / spring / layoutId(FLIP)
   외부 의존성 0, 스크립트 미실행 시에도 콘텐츠는 전부 보임
   =========================================================== */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const E = {
  out:   'cubic-bezier(.16,1,.3,1)',      // 부드러운 감속
  soft:  'cubic-bezier(.22,.61,.36,1)',
  back:  'cubic-bezier(.34,1.4,.64,1)',   // 스프링 느낌
  inout: 'cubic-bezier(.65,0,.35,1)'
};
function anim(el, kf, o={}){
  if(RM || !el.animate) return null;
  const props = Object.keys(kf);
  // 같은 속성을 잡고 있던 이전 애니메이션만 정리 (속성이 겹치지 않으면 공존)
  el.__mo = (el.__mo||[]).filter(r=>{
    if(r.props.some(p=>props.includes(p))){ try{r.a.cancel();}catch(e){} return false; }
    return true;
  });
  const a = el.animate(kf, {duration:o.d??700, delay:o.delay??0, easing:o.ease??E.out, fill:o.fill??'both'});
  a.finished.catch(()=>{});   // 취소 시 rejection 무시
  el.__mo.push({a, props});
  if(o.clear){ a.finished.then(()=>{
      o.clear.split(',').forEach(p=>el.style.removeProperty(p));
      try{a.cancel();}catch(e){}
      el.__mo=(el.__mo||[]).filter(r=>r.a!==a);
    }).catch(()=>{}); }
  return a;
}
const OBS=[];  // 참조를 유지해야 관찰자가 GC로 사라지지 않음
const done = a => (a && a.finished ? a.finished : Promise.resolve()).catch(()=>{});
function inView(el, cb, {once=true, amount=0.15, margin='0px 0px -8% 0px'}={}){
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){ cb(e.target); if(once) io.unobserve(e.target); }
  }),{threshold:amount, rootMargin:margin});
  io.observe(el); OBS.push(io); return io;
}

/* ---------- variants: 요소별 초기 상태 + 등장 모션 ---------- */
const V = {
  up:   {init:{opacity:'0',transform:'translateY(30px)'},   kf:{opacity:[0,1],transform:['translateY(30px)','none']}, d:820},
  upS:  {init:{opacity:'0',transform:'translateY(18px)'},   kf:{opacity:[0,1],transform:['translateY(18px)','none']}, d:700},
  left: {init:{opacity:'0',transform:'translateX(-26px)'},  kf:{opacity:[0,1],transform:['translateX(-26px)','none']},d:800},
  fade: {init:{opacity:'0'},                                kf:{opacity:[0,1]}, d:900},
  pop:  {init:{opacity:'0',transform:'scale(.94)'},         kf:{opacity:[0,1],transform:['scale(.94)','none']}, d:700, ease:E.back},
  /* 사진 전용: 아래에서 위로 커튼이 열리며 이미지가 천천히 줌아웃 */
  wipe: {init:{clipPath:'inset(0 0 100% 0)'},               kf:{clipPath:['inset(0 0 100% 0)','inset(0 0 0% 0)']}, d:1100, ease:E.inout}
};
function play(el, name, delay=0){
  const v=V[name]||V.up;
  anim(el, v.kf, {d:v.d, delay, ease:v.ease||E.out, clear:Object.keys(v.init).map(k=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())).join(',')});
}
function setInit(el, name){
  const v=V[name]||V.up;
  if(!RM) Object.entries(v.init).forEach(([k,val])=>el.style[k]=val);
}

/* 1) 등장 모션 대상 등록 ------------------------------------ */
const targets=[];
document.querySelectorAll('.rv').forEach(el=>targets.push([el,'up',0]));
document.querySelectorAll('.sec-head .eyebrow,.sec-head .h-sec,.sec-head .rule,.sec-head .lead').forEach(()=>{});
// 컨테이너 자식 stagger (안내/설명 블록)
const groups=[['.promise-grid','up',110],['.support','up',95],['.steps','upS',70],
              ['.kit ul li','left',70],['.store-info .info-row','left',80],['#faq .qa','upS',70],
              ['.stats-in > div','upS',110],['.tabs .tab','pop',55],['.thumbs img','pop',80],['.fnav a','upS',50]];
groups.forEach(([sel,v,gap])=>{
  const isChild = sel.includes(' ');
  const items = isChild ? [...document.querySelectorAll(sel)] : [...(document.querySelector(sel)?.children||[])];
  if(!items.length) return;
  const host = items[0].parentElement;
  items.forEach(el=>{ setInit(el,v); el.dataset.mo='1'; });
  inView(host, ()=>items.forEach((el,i)=>play(el,v,i*gap)), {amount:0.08});
});
// 개별 .rv (자식 stagger 대상이 아닌 것만)
document.querySelectorAll('.rv').forEach(el=>{
  if(el.dataset.mo) return;
  setInit(el,'up'); inView(el, ()=>play(el,'up'));
});

/* 2) 사진 모션 — 커튼 와이프 + 슬로우 줌 ---------------------- */
const PHOTOS=['.hero-img img','.promise-img img','.kit-img img','.gal-main'];
document.querySelectorAll(PHOTOS.join(',')).forEach(img=>{
  if(!RM){ img.style.clipPath='inset(0 0 100% 0)'; }
  // clip-path로 가린 요소는 자기 자신이 교차 판정되지 않으므로 부모를 관찰
  inView(img.parentElement||img, ()=>{
    img.style.clipPath='inset(0 0 0% 0)';
    anim(img,{clipPath:['inset(0 0 100% 0)','inset(0 0 0% 0)']},{d:1050,ease:E.inout});
    anim(img,{transform:['scale(1.14)','scale(1)']},{d:1800,ease:E.out,clear:'transform'});
  },{amount:0.12});
});

/* 3) 스크롤 연동 패럴랙스 (사진에 깊이감) --------------------- */
const PX=[];
function px(sel,amt){document.querySelectorAll(sel).forEach(el=>PX.push([el,amt]));}
px('.band .bg',-70); px('.hero-img img',-26); px('.promise-img img',-34); px('.kit-img img',-22);

/* 3-1) 히어로 가격 카드 — 테두리가 그어지고 글이 올라옵니다 -----
   사진 커튼이 내려간 뒤에 시작해야 카드만 먼저 떠 있지 않습니다.
   i18n 이 글을 이미 바꿔 놓은 뒤라서, 여기서 자르는 상자를 끼워도 안전합니다. */
(function(){
  const card = document.getElementById('pcard');
  if(!card) return;

  const lines = [...card.querySelectorAll('.pc-t')];
  /* 글을 상자에 넣어야 넘치는 부분이 잘려 '올라오는' 게 보입니다 */
  lines.forEach(el => {
    const inner = document.createElement('span');
    inner.className = 'pc-in';
    while (el.firstChild) inner.appendChild(el.firstChild);
    el.appendChild(inner);
  });
  const inners = lines.map(el => el.firstElementChild);
  const bars   = [...card.querySelectorAll('.pc-fr i')];

  if (RM) return;                      // 움직임을 줄여 달라고 했으면 그대로 둡니다

  card.style.opacity = '0';
  bars.forEach((b,i) => b.style.transform = (i % 2 ? 'scaleY(0)' : 'scaleX(0)'));
  inners.forEach(s => s.style.transform = 'translateY(110%)');

  /* 관찰자가 어떤 이유로든 안 뜨면 카드가 영영 안 보입니다(처음 상태가 숨김이라).
     3초가 지나도 소식이 없으면 그냥 보여 줍니다 — 모션보다 보이는 게 먼저입니다. */
  let played = false;
  const guard = setTimeout(() => {
    if (played) return;
    played = true;
    card.style.opacity = '';
    bars.forEach(b => b.style.transform = '');
    inners.forEach(s => s.style.transform = '');
  }, 3000);

  inView(card.parentElement || card, () => {
    if (played) return;
    played = true; clearTimeout(guard);
    /* 사진 와이프가 1.05초라, 카드는 그게 끝날 즈음 시작합니다 */
    const t0 = 620;
    card.style.opacity = '';
    anim(card, {opacity:[0,1]}, {d:420, delay:t0, ease:E.soft, clear:'opacity'});

    bars.forEach((b,i) => {
      const ax = i % 2 ? 'scaleY' : 'scaleX';
      b.style.transform = '';
      anim(b, {transform:[ax+'(0)', ax+'(1)']},
           {d:460, delay:t0 + 90 + i*110, ease:E.out, clear:'transform'});
    });

    inners.forEach((s,i) => {
      s.style.transform = '';
      anim(s, {transform:['translateY(110%)','translateY(0)'], opacity:[0,1]},
           {d:640, delay:t0 + 300 + i*90, ease:E.out, clear:'transform,opacity'});
    });

    /* 가격은 마지막에 올라갑니다 — 카드에서 가장 늦게 눈이 가야 하는 값입니다 */
    const num = card.querySelector('.num');
    if (num) setTimeout(() => countUp(num), t0 + 520);
  }, {amount:0.12});
})();

/* 4) 숫자 카운트업 (안내 지표) ------------------------------- */
document.querySelectorAll('.stats-in b').forEach(b=>{
  const raw=b.textContent.trim(), m=raw.match(/^(\d+)(.*)$/);
  if(!m) return;
  const end=+m[1], suf=m[2];
  if(RM) return;
  b.textContent='0'+suf;
  inView(b,()=>{
    const t0=performance.now(), dur=1200;
    (function tick(t){
      const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
      b.textContent=Math.round(end*e)+suf;
      if(p<1) requestAnimationFrame(tick);
    })(t0);
  },{amount:0.6});
});

/* 5) 히어로 오케스트레이션 (staggerChildren) ------------------ */
(function(){
  const box=document.querySelector('.hero .wrap > .rv');
  if(!box) return;
  const kids=[...box.children];
  kids.forEach(el=>{ if(!RM){el.style.opacity='0';el.style.transform='translateY(24px)';} });
  const img=document.querySelector('.hero-img');
  if(img&&!RM){img.style.opacity='0';}
  addEventListener('load',()=>{
    kids.forEach((el,i)=>anim(el,{opacity:[0,1],transform:['translateY(24px)','none']},{d:900,delay:120+i*110,clear:'opacity,transform'}));
    if(img) anim(img,{opacity:[0,1],transform:['translateY(30px) scale(.98)','none']},{d:1100,delay:180,clear:'opacity,transform'});
  });
})();

/* ===================== 인터랙션 ===================== */

/* 메뉴 필터 + layoutId 방식 탭 인디케이터 */
/* 파일명 베이스만 적습니다. 확장자별 사본(.avif/.webp)은 tools/optimize-images.py 가 만듭니다.
   메뉴 사진을 교체하면 같은 이름으로 .jpg 를 넣고 스크립트를 한 번 돌리세요. */
/* 관리자·DB 에서 온 값을 innerHTML 로 넣기 전에 반드시 통과시킵니다.
   메뉴명에 따옴표 하나만 있어도 속성이 깨지고, 꺾쇠가 있으면 마크업이 무너집니다. */
const esc = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* 사전에서 찾아 바꿉니다. i18n 이 못 훑는 곳(속성 조합·라이트박스 캡션)에 씁니다. */
const T = s => (window.BM_I18N && window.BM_I18N.t(s)) || s;
const IMG={g:'menu-gomtang',s:'menu-sugyuk',m:'menu-mandu',t:'menu-sugyuk-plate',b:'menu-teuk',k:'kit-package',u:'menu-useol',r:'menu-gonggibap'};
const IMGDIR='assets/img/';
/* 이미지는 1년 immutable 로 캐시합니다. 사진을 바꾸면 이 값을 올려야
   이미 방문한 사람도 새 사진을 받습니다 — tools/bump-image-version.py */
const IMGVER='20260904g';
const iv = u => u + (IMGVER ? '?v=' + IMGVER : '');
const MENU_SIZES='(max-width:760px) 78vw, (max-width:1080px) 44vw, 22vw';

/* 이 브라우저가 받아 갈 수 있는 가장 가벼운 형식.
   <picture> 안에서는 브라우저가 알아서 고르지만, 라이트박스의 두 번째 컷처럼
   <picture> 가 없는 자리에서는 우리가 골라야 합니다.

   브라우저는 <source type=...> 을 '받아 보기 전에' 지원 여부로 거릅니다.
   그래서 실제로 존재하지 않는 주소를 넣어 두고 어느 쪽이 뽑혔는지만 읽으면,
   한 바이트도 안 받고 알 수 있습니다. (1×1 이미지를 디코드해 보는 방법도 있지만
   base64 한 글자만 틀려도 조용히 jpg 로 떨어져서 이쪽이 안전합니다.)

   currentSrc 는 붙이자마자 바로 채워지지 않습니다. 그래서 프로브를 지우지 않고
   놔뒀다가 '쓸 때' 읽습니다 — 사진을 누르는 시점이면 이미 정해져 있습니다. */
const imgFmt = (function(){
  let fmt = '', probe = null;
  try {
    probe = document.createElement('picture');
    probe.innerHTML = '<source type="image/avif" srcset="data:,avif">' +
                      '<source type="image/webp" srcset="data:,webp">' +
                      '<img alt="" aria-hidden="true" src="data:,jpg">';
    probe.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
    (document.body || document.documentElement).appendChild(probe);
  } catch(e){ probe = null; }
  return function(){
    if (fmt) return fmt;                              // 한 번 정해지면 그대로 씁니다
    const cs = (probe && probe.querySelector('img').currentSrc) || '';
    if (!cs) return 'jpg';                            // 아직 못 정했으면 어디서나 열리는 쪽으로
    return (fmt = /avif/.test(cs) ? 'avif' : /webp/.test(cs) ? 'webp' : 'jpg');
  };
})();

/* AVIF → WebP → JPEG 순으로 고르는 <picture> 마크업 */
function picHTML(base, alt, sizes, wide){
  /* wide=true 면 800px 사본을 함께 알려 줍니다. 카드는 화면의 22% 남짓이라
     1600px 원본을 받을 이유가 없습니다 (사진을 크게 볼 때만 원본을 씁니다). */
  const set = ext => wide
    ? `${iv(IMGDIR + base + '-800.' + ext)} 800w, ${iv(IMGDIR + base + '.' + ext)} 1600w`
    : iv(IMGDIR + base + '.' + ext);
  return `<picture>
      <source type="image/avif" sizes="${sizes}" srcset="${set('avif')}">
      <source type="image/webp" sizes="${sizes}" srcset="${set('webp')}">
      <img src="${iv(IMGDIR + base + '.jpg')}" alt="${alt}" loading="lazy" decoding="async">
    </picture>`;
}
/* 사진 이름 풀이 —
   하드코딩 MENU 는 짧은 키('g')를, DB(menus.image_key)는 파일명('menu-gomtang')을 씁니다.
   IMG 로만 찾으면 DB 값이 undefined 가 되어 사진이 전부 깨집니다. 둘 다 받습니다. */
function imgBase(m){
  if(!m.img) return '';
  return IMG[m.img] || (/^[a-z0-9-]+$/i.test(m.img) ? m.img : '');
}
const MENU=[
 {c:'tang',n:'곰탕',d:'맑은 한우 육수에 양지 수육을 넉넉히. 복만당의 기본이자 기준.',p:'10,000',u:'원',img:'g',tag:'BEST'},
 {c:'tang',n:'수육곰탕',d:'한우 수육을 두 배로 올린 구성. 깍두기 한 점과 함께.',p:'19,000',u:'원',img:'s',tag:'SIGNATURE',brass:1},
 {c:'tang',n:'특곰탕',d:'고기 양을 늘린 구성. 한 그릇으로 든든하게 드시고 싶을 때.',p:'13,000',u:'원',img:'b'},
 {c:'tang',n:'우설곰탕',d:'부드럽게 삶아낸 우설을 얹은 별미. 수량 한정으로 준비합니다.',p:'16,000',u:'원',img:'u'},
 {c:'side',n:'이북식 손만두',d:'얇은 피에 김치와 두부를 채워 매일 손으로 빚습니다.',p:'2,000',u:'원 / 1알',img:'m'},
 {c:'side',n:'한우수육',d:'250g. 곰탕과 함께 또는 단품으로. 소금장과 함께 드세요.',p:'35,000',u:'원',img:'t'},
 {c:'side',n:'공깃밥',d:'국내산 쌀로 매일 새로 짓습니다.',p:'1,000',u:'원',img:'r'},
 {c:'kit',n:'곰탕 밀키트',d:'매장 육수 그대로. 600g 냉동 포장, 데우기만 하면 완성.',p:'9,000',u:'원',img:'k'}
];
const grid=document.getElementById('mgrid');
function render(f, first){
  const olds=[...grid.children];
  const draw=()=>{
    grid.innerHTML='';
    MENU.filter(m=>f==='all'||m.c===f).forEach((m,i)=>{
      const el=document.createElement('div');
      el.className='mcard';
      const base = imgBase(m);
      /* brass 는 DB 에 없는 값이라, API 로 교체되면 놋쇠 배지가 사라집니다.
         SIGNATURE 배지는 원래 놋쇠였으므로 태그로도 판단합니다. */
      const brass = m.brass || m.tag === 'SIGNATURE';
      el.innerHTML=`<div class="ph">${m.tag?`<span class="tag${brass?' brass':''}">${esc(m.tag)}</span>`:''}
        ${m.src ? `<img src="${esc(m.src)}" alt="${esc(m.n)}" loading="lazy" decoding="async">`
                : base ? picHTML(base, esc(m.n), MENU_SIZES, true)
                       : '<div class="ph-none" aria-hidden="true">사진 준비 중</div>'}
        <button type="button" class="zoom" aria-label="${esc(T(m.n) + ' ' + T('사진 크게 보기'))}"></button></div>
        <div class="body-w"><h3>${esc(m.n)}</h3><p>${esc(m.d)}</p>
        <div class="price"><b>${esc(m.p)}</b><span>${esc(m.u)}</span></div></div>`;
      /* 카드 아무 데나 클릭해도 열리지만(마우스), 키보드 조작은 사진 위 버튼이 담당합니다.
         버튼이 stopPropagation 하므로 사진을 직접 눌러도 두 번 열리지 않습니다. */
      const zoom=el.querySelector('.zoom');
      zoom.onclick=e=>{ e.stopPropagation();
        const img=el.querySelector('img'); if(!img) return;   // 사진이 없는 메뉴는 열지 않습니다
        /* 두 번째 컷은 <picture> 가 없어서 형식을 우리가 골라야 합니다.
           예전엔 무조건 .jpg 라 431KB 를 받았습니다.
           currentSrc 는 사진이 아직 안 받아졌으면 비어 있어서 믿을 수 없습니다 —
           그래서 못 읽으면 imgFmt() 로 판정합니다. */
        const ext = (String(img.currentSrc).match(/\.(avif|webp|jpg)(\?|$)/)||[,imgFmt()])[1];
        const second = m.src2 || (base ? iv(IMGDIR+base+'-2.'+ext) : '');
        /* 있는지 확인만 하는 데 원본을 받을 이유가 없습니다 — 800px 사본으로 두드립니다.
           800px 사본은 avif·webp 만 만들어 두었으니, jpg 로 떨어지면 원본을 씁니다. */
        const probe  = m.src2 || (base
          ? iv(IMGDIR+base+'-2' + (ext === 'jpg' ? '' : '-800') + '.' + ext) : '');
        const first  = m.src || (base ? iv(IMGDIR+base+'.'+ext) : '');
        openLB(img,T(m.n),T(m.d)+'  ·  '+m.p+T(m.u), second, probe, first); };
      el.onclick=()=>zoom.click();
      grid.appendChild(el);
      anim(el,{opacity:[0,1],transform:['translateY(22px) scale(.97)','none']},{d:620,delay:i*65,ease:E.back,clear:'opacity,transform'});
      const pb=el.querySelector('.price b'); if(pb) setTimeout(()=>countUp(pb), 260+i*65);
      /* 카드는 JS 가 그리므로 i18n 이 지나간 뒤입니다 — 여기서 한 번 더 통과시킵니다 */
      if(window.BM_I18N) BM_I18N.apply(el);
    });
  };
  if(first||RM||!olds.length){ draw(); return; }
  let fin=0;
  olds.forEach((el,i)=>{
    const a=anim(el,{opacity:[1,0],transform:['none','translateY(-12px) scale(.97)']},{d:260,delay:i*30,ease:E.soft});
    done(a).then(()=>{ if(++fin===olds.length) draw(); });
  });
}
render('all',true);

/* 관리자 화면에서 고친 메뉴를 받아옵니다.
   매장 목록과 같은 방식입니다 — 위의 기본 메뉴로 먼저 그려 두었으므로
   API 가 없거나 실패해도 화면은 그대로입니다. */
let curFilter='all';
fetch('/api/menu', {headers:{'Accept':'application/json'}})
  .then(r=>r.ok?r.json():null)
  .then(j=>{
    if(!j||!Array.isArray(j.rows)||!j.rows.length) return;
    const same = j.rows.length===MENU.length &&
      j.rows.every((m,i)=>m.n===MENU[i].n&&m.p===MENU[i].p&&m.d===MENU[i].d&&m.src===MENU[i].src);
    if(same) return;
    MENU.length=0; MENU.push(...j.rows);
    render(curFilter, true);
  })
  .catch(()=>{});

const ti=document.getElementById('ti');
function moveInd(t){
  if(!ti) return;
  ti.style.opacity='1';
  const p=t.parentElement.getBoundingClientRect(), r=t.getBoundingClientRect();
  const to={left:r.left-p.left, top:r.top-p.top, w:r.width, h:r.height};
  const cur={left:parseFloat(ti.style.left)||to.left, top:parseFloat(ti.style.top)||to.top,
             w:parseFloat(ti.style.width)||to.w, h:parseFloat(ti.style.height)||to.h};
  Object.assign(ti.style,{left:to.left+'px',top:to.top+'px',width:to.w+'px',height:to.h+'px'});
  anim(ti,{transform:[`translate(${cur.left-to.left}px,${cur.top-to.top}px) scaleX(${cur.w/to.w})`,'none']},
       {d:520,ease:E.back,clear:'transform'});
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
  t.classList.add('on'); moveInd(t); curFilter=t.dataset.f; render(curFilter);
});
addEventListener('load',()=>{const on=document.querySelector('.tab.on'); if(on) setTimeout(()=>moveInd(on),400);});
addEventListener('resize',()=>{const on=document.querySelector('.tab.on'); if(on) moveInd(on);});

/* ══════ 모달 포커스 관리 ══════
   aria-modal 대화상자가 열려 있는 동안 Tab 이 뒤 배경으로 새어 나가면 안 됩니다.
   inert 로 배경을 통째로 잠그고(지원 브라우저), Tab 순환은 직접 처리합니다.
   inert 를 못 쓰는 환경에서도 순환 처리만으로 키보드 사용자는 갇힌 상태가 유지됩니다. */
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const CAN_INERT='inert' in HTMLElement.prototype;
const shown=el=>el.offsetWidth>0||el.offsetHeight>0||el===document.activeElement;

/* 배경 잠금 — keep 에 넣은 요소는 살려 둡니다(예: 드로어를 여는 햄버거 버튼) */
function lockBg(on, keep){
  if(!CAN_INERT) return;
  ['#hd','#main','footer','#mbar','#tp'].forEach(sel=>{
    const el=document.querySelector(sel);
    if(!el || (keep&&keep.some(k=>el.contains(k)))) return;
    el.inert=on;
  });
}
/* Tab 순환 — els() 는 호출 시점의 포커스 대상 목록을 돌려줍니다 */
function cycle(els){
  return e=>{
    if(e.key!=='Tab') return;
    const list=els().filter(shown);
    if(!list.length) return;
    if(list.length===1){ e.preventDefault(); list[0].focus(); return; }
    const first=list[0], last=list[list.length-1];
    if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
  };
}

/* 라이트박스 — layoutId(공유 요소) 전환: 썸네일 위치에서 확대 */
const lb=document.getElementById('lb'), lbi=document.getElementById('lbi');
let origin=null;
/* shots: 두 번째 컷 주소. 있으면 ‹ › 로 넘겨 볼 수 있습니다. */
/* ── 사진 넘기기 ──────────────────────────────────────────────────────
   두 번째 컷이 없는 사진(매장 갤러리 등)도 같은 함수를 쓰므로
   파일이 실제로 있을 때만 버튼을 띄웁니다. */
const lbnav=document.getElementById('lbnav');
let shots=[], shot=0;
function paintShot(){
  lbi.src=shots[shot];
  const n=document.getElementById('lbn'); if(n) n.textContent=`${shot+1} / ${shots.length}`;
}
let shotSeq=0;
function setShots(first, second, probeUrl){
  shots=[first]; shot=0;
  const my=++shotSeq;                    // 나중에 연 사진이 이기도록
  if(!lbnav) return;
  lbnav.hidden=true;
  if(!second) return;
  const probe=new Image();
  /* 프리로드가 늦게 끝나면 그 사이 다른 사진이 열려 있을 수 있습니다.
     내 차례가 아니면 버립니다 — 안 그러면 엉뚱한 사진이 목록에 섞입니다. */
  probe.onload=()=>{ if(my!==shotSeq) return;
    shots.push(second); lbnav.hidden=false;
    const n=document.getElementById('lbn'); if(n) n.textContent=`1 / ${shots.length}`; };
  probe.onerror=()=>{};            // 800px 사본이 없으면 버튼만 안 뜹니다
  probe.src=probeUrl||second;
}
if(lbnav){
  const step=d=>{ if(shots.length<2) return; shot=(shot+d+shots.length)%shots.length; paintShot(); };
  document.getElementById('lbp1').onclick=e=>{ e.stopPropagation(); step(-1); };
  document.getElementById('lbn1').onclick=e=>{ e.stopPropagation(); step(1); };
  addEventListener('keydown',e=>{ if(!lb.classList.contains('on')) return;
    if(e.key==='ArrowLeft') step(-1); else if(e.key==='ArrowRight') step(1); });
}

function openLB(srcEl,t,p,second,probeUrl,firstUrl){
  // currentSrc: 브라우저가 실제로 내려받은 사본(avif/webp). 재다운로드를 막습니다.
  /* currentSrc 는 지연 로딩 사진이 아직 안 받아졌으면 비어 있습니다. 그때 .src 로
     떨어지면 1600px jpg 를 받게 되므로, 부르는 쪽이 알려 준 최선 형식을 먼저 씁니다. */
  const src = typeof srcEl==='string'? srcEl : (srcEl.currentSrc || firstUrl || srcEl.src);
  setShots(src, second, probeUrl);
  origin = typeof srcEl==='string'? null : srcEl.getBoundingClientRect();
  lbi.src=src; document.getElementById('lbt').textContent=t; document.getElementById('lbp').textContent=p;

  /* 카드가 받아 둔 사본은 800px 이라 크게 보면 조금 무릅니다. 먼저 그걸 띄워
     기다림 없이 열고(이미 캐시에 있습니다), 원본이 준비되면 조용히 갈아 끼웁니다.
     여는 순간 원본을 기다리면 확대 애니메이션이 빈 칸에서 시작합니다. */
  if (firstUrl && firstUrl !== src){
    const my = shotSeq, full = new Image();
    full.onload = () => {
      if (my !== shotSeq || shot !== 0) return;   // 그 사이 다른 사진으로 넘어갔으면 그만둡니다
      shots[0] = firstUrl; lbi.src = firstUrl;
    };
    full.src = firstUrl;
  }
  lb.__prev=document.activeElement;
  lb.classList.add('on'); document.body.style.overflow='hidden';
  lockBg(true);
  lb.__trap=cycle(()=>[...lb.querySelectorAll(FOCUSABLE)]);
  lb.addEventListener('keydown', lb.__trap);
  setTimeout(()=>document.getElementById('lbx').focus(),60);
  anim(lb,{opacity:[0,1]},{d:260,ease:E.soft,clear:'opacity'});
  const cap=lb.querySelector('.cap');
  anim(cap,{opacity:[0,1],transform:['translateY(16px)','none']},{d:520,delay:180,clear:'opacity,transform'});
  requestAnimationFrame(()=>{
    if(!origin||RM) { anim(lbi,{opacity:[0,1],transform:['scale(.94)','none']},{d:420,ease:E.back,clear:'opacity,transform'}); return; }
    const r=lbi.getBoundingClientRect();
    const dx=origin.left-r.left, dy=origin.top-r.top, sx=origin.width/r.width, sy=origin.height/r.height;
    anim(lbi,{transform:[`translate(${dx}px,${dy}px) scale(${sx},${sy})`,'none']},{d:620,ease:E.out,clear:'transform'});
  });
}
function closeLB(){
  const cap=lb.querySelector('.cap');
  anim(cap,{opacity:[1,0]},{d:160});
  let a;
  if(origin&&!RM){
    const r=lbi.getBoundingClientRect();
    const dx=origin.left-r.left, dy=origin.top-r.top, sx=origin.width/r.width, sy=origin.height/r.height;
    a=anim(lbi,{transform:['none',`translate(${dx}px,${dy}px) scale(${sx},${sy})`],opacity:[1,.4]},{d:420,ease:E.inout});
  }
  const fa=anim(lb,{opacity:[1,0]},{d:300,delay:100});
  if(lb.__trap){ lb.removeEventListener('keydown', lb.__trap); lb.__trap=null; }
  lockBg(false);
  /* 닫힘은 애니메이션 완료에 의존하면 안 됩니다 — 백그라운드 탭에서는 finished 가 오지 않아
     라이트박스가 열린 채로 남고 포커스도 돌아오지 않습니다. 안전망을 함께 겁니다. */
  let doneOnce=false;
  const finish=()=>{
    if(doneOnce) return; doneOnce=true;
    lb.classList.remove('on'); document.body.style.overflow='';
    if(lb.__prev&&lb.__prev.focus) lb.__prev.focus();
    lbi.style.transform=''; lbi.style.opacity=''; lb.style.opacity=''; cap.style.opacity='';
  };
  done(fa).then(finish).catch(finish);
  setTimeout(finish, 700);
}
document.getElementById('lbx').onclick=closeLB;
lb.onclick=e=>{if(e.target===lb)closeLB();};
addEventListener('keydown',e=>{if(e.key==='Escape'){ if(lb.classList.contains('on'))closeLB();
  if(document.body.classList.contains('nav-open')) setDrawer(false); }});

/* 모바일 드로어 — 링크 stagger + 포커스 가둠
   닫혀 있을 때는 visibility:hidden 이라 이미 Tab 대상에서 빠집니다.
   열렸을 때 뒤 배경으로 Tab 이 새는 것만 막으면 됩니다.
   햄버거 버튼(bgr)은 닫는 수단이라 순환 목록에 함께 넣습니다. */
const bgr=document.getElementById('bg'), dw=document.getElementById('dw');
const dwTrap=cycle(()=>[bgr, ...dw.querySelectorAll(FOCUSABLE)]);
function setDrawer(open){
  document.body.classList.toggle('nav-open', open);
  bgr.setAttribute('aria-expanded',open); bgr.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');
  lockBg(open,[bgr]);
  if(open){
    document.addEventListener('keydown', dwTrap);
    [...dw.children].forEach((a,i)=>anim(a,{opacity:[0,1],transform:['translateY(22px)','none']},{d:560,delay:80+i*70,clear:'opacity,transform'}));
    /* 드로어는 visibility 트랜지션(.45s)이 끝나야 포커스를 받습니다.
       기기·상황에 따라 시점이 달라서 고정 지연 대신 될 때까지 짧게 재시도합니다. */
    (function focusFirst(n){
      const el=dw.querySelector(FOCUSABLE);
      if(!el || !document.body.classList.contains('nav-open')) return;
      el.focus();
      if(document.activeElement!==el && n<12) setTimeout(()=>focusFirst(n+1),60);
    })(0);
  }else{
    document.removeEventListener('keydown', dwTrap);
    if(document.activeElement===document.body||dw.contains(document.activeElement)) bgr.focus();
  }
}
bgr.onclick=()=>setDrawer(!document.body.classList.contains('nav-open'));
[...dw.querySelectorAll('a')].forEach(a=>a.onclick=()=>setDrawer(false));

/* 매장 갤러리 — 크로스페이드 + 썸네일 반응 */
const gm=document.getElementById('gm'), gp=document.getElementById('gp');
const GAL_SIZES='(max-width:1080px) 92vw, min(600px, 46vw)';
/* 대표 이미지 교체 — <img src> 만 바꾸면 <source> 가 우선해서 사진이 안 바뀝니다.
   매장 사진은 모두 1120x750 원본 + 800폭 축소본을 함께 둡니다. */
function setGal(base){
  gp.querySelector('source[type="image/avif"]').srcset=`${IMGDIR}${base}-800.avif 800w, ${IMGDIR}${base}.avif 1120w`;
  gp.querySelector('source[type="image/webp"]').srcset=`${IMGDIR}${base}-800.webp 800w, ${IMGDIR}${base}.webp 1120w`;
  gm.src=`${IMGDIR}${base}.jpg`;
}
if(gp) gp.querySelectorAll('source').forEach(sc=>sc.sizes=GAL_SIZES);
document.querySelectorAll('#th .thumb').forEach(btn=>{
  const t=btn.querySelector('img');
  btn.onclick=()=>{
    if(t.classList.contains('on')) return;
    document.querySelectorAll('#th .thumb').forEach(x=>{
      x.querySelector('img').classList.remove('on'); x.setAttribute('aria-pressed','false');
    });
    t.classList.add('on'); btn.setAttribute('aria-pressed','true');
    anim(t,{transform:['scale(.92)','scale(1)']},{d:420,ease:E.back,clear:'transform'});
    const a=anim(gm,{opacity:[1,0],transform:['none','scale(1.03)']},{d:220,ease:E.soft});
    let once=false;
    const swap=()=>{ if(once)return; once=true;
      setGal(t.dataset.base); gm.alt=t.alt;
      anim(gm,{opacity:[0,1],transform:['scale(1.06)','none']},{d:700,ease:E.out,clear:'opacity,transform'});
    };
    done(a).then(swap).catch(swap);
    setTimeout(swap,400);   // 애니메이션이 멈춘 탭에서도 사진은 바뀌어야 합니다
  };
});
const galZoom=document.getElementById('galzoom');
if(galZoom) galZoom.onclick=()=>openLB(gm,T('복만당 본점'),'서울시 강남구 언주로 563, 원에디션강남 401동 116호');

/* FAQ — 높이 스프링 애니메이션 */
document.querySelectorAll('#faq .qa').forEach(q=>{
  const b=q.querySelector('button'), a=q.querySelector('.a'), p=a.querySelector('p');
  b.onclick=()=>{
    const open=q.classList.contains('on');
    document.querySelectorAll('#faq .qa').forEach(o=>{
      if(o===q) return;
      if(o.classList.contains('on')){ o.classList.remove('on'); o.querySelector('button').setAttribute('aria-expanded','false'); const oa=o.querySelector('.a');
        anim(oa,{maxHeight:[oa.scrollHeight+'px','0px']},{d:300,ease:E.soft,clear:'max-height'}); oa.style.maxHeight='0px'; }
    });
    b.setAttribute('aria-expanded',String(!open));
    if(open){ q.classList.remove('on'); anim(a,{maxHeight:[a.scrollHeight+'px','0px']},{d:300,ease:E.soft}); a.style.maxHeight='0px'; }
    else{
      q.classList.add('on'); const h=a.scrollHeight;
      anim(a,{maxHeight:['0px',h+'px']},{d:480,ease:E.out}); a.style.maxHeight=h+'px';
      anim(p,{opacity:[0,1],transform:['translateY(12px)','none']},{d:560,delay:80,clear:'opacity,transform'});
    }
  };
});

/* 폼 — 필드 포커스 & 제출 성공 스프링 */
document.querySelectorAll('.fld input,.fld select,.fld textarea').forEach(f=>{
  f.addEventListener('focus',()=>anim(f.previousElementSibling,{transform:['none','translateX(4px)'],color:['rgba(246,241,231,.55)','#C9A76A']},{d:300,fill:'forwards'}));
  f.addEventListener('blur',()=>anim(f.previousElementSibling,{transform:['translateX(4px)','none'],color:['#C9A76A','rgba(246,241,231,.55)']},{d:300,clear:'transform,color'}));
});
/* ══════ 가맹 상담 폼 ══════
   전송 대상은 assets/js/config.js 의 BOKMANDANG.form 에서 설정합니다.
   endpoint 가 비어 있으면 전송하지 않고 완료 화면만 보여줍니다(데모 모드). */
(function(){
  const fm=document.getElementById('fm'); if(!fm) return;
  const CFG=(window.BOKMANDANG&&window.BOKMANDANG.form)||{};
  const btn=document.getElementById('fsub'), btnT=btn.querySelector('.t'), err=document.getElementById('ferr');
  const sent=document.getElementById('sent'), demo=sent.querySelector('.demo');
  const LIVE=!!(CFG.endpoint||'').trim();
  let sending=false;

  if(LIVE&&demo) demo.remove();   // 실제 전송이 켜지면 "접수되지 않습니다" 안내를 지웁니다

  /* ── 검증 ── 폼에 novalidate 가 걸려 있어 브라우저가 막지 않으므로 직접 확인합니다 */
  const digits=v=>v.replace(/[^0-9]/g,'');
  const RULES=[
    ['f1', v=>v.trim().length>=2,                      '성함을 <b>2자 이상</b> 입력해 주세요.'],
    ['f2', v=>{const d=digits(v); return d.length>=9&&d.length<=11;}, '연락처를 <b>숫자 9~11자리</b>로 정확히 입력해 주세요.'],
    ['f6', (v,el)=>el.checked,                         '<b>개인정보 수집 및 이용</b>에 동의해 주세요.']
  ];
  function clearErr(){
    err.hidden=true; err.innerHTML='';
    fm.querySelectorAll('.bad').forEach(el=>{el.classList.remove('bad');el.removeAttribute('aria-invalid');});
  }
  function fail(el,msg){
    el.classList.add('bad'); el.setAttribute('aria-invalid','true');
    err.innerHTML=msg; err.hidden=false;
    el.focus({preventScroll:true});
    el.scrollIntoView({block:'center',behavior:RM?'auto':'smooth'});
    if(!RM) anim(err,{opacity:[0,1],transform:['translateY(-6px)','none']},{d:340,clear:'opacity,transform'});
  }
  function validate(){
    for(const [id,ok,msg] of RULES){
      const el=document.getElementById(id);
      if(!ok(el.value,el)){ fail(el,msg); return false; }
    }
    return true;
  }
  fm.querySelectorAll('input,select,textarea').forEach(el=>
    el.addEventListener('input',()=>{ if(el.classList.contains('bad')) clearErr(); }));

  /* ── 완료 화면 ── 입력 줄이 차례로 사라진 뒤 확인 카드가 스프링으로 등장 */
  function showSent(){
    const rows=[...fm.querySelectorAll('.fld,.agree-row,button[type=submit]')];
    let shown=false;
    const finish=()=>{
      if(shown) return; shown=true;
      rows.forEach(x=>x.style.display='none');
      sent.classList.add('on');
      anim(sent,{opacity:[0,1],transform:['scale(.94)','none']},{d:560,ease:E.back,clear:'opacity,transform'});
      anim(sent.querySelector('.ok'),{transform:['scale(0) rotate(-45deg)','none']},{d:700,delay:120,ease:E.back,clear:'transform'});
    };
    if(RM||!rows.length){ finish(); return; }
    let n=0;
    rows.forEach((x,i)=>{
      const a=anim(x,{opacity:[1,0],transform:['none','translateY(-10px)']},{d:240,delay:i*40,ease:E.soft});
      done(a).then(()=>{ x.style.display='none'; if(++n===rows.length) finish(); });
    });
    /* 안전망 — 제출 직후 탭을 백그라운드로 두면 애니메이션이 멈춰 완료 콜백이 오지 않습니다.
       전송은 이미 끝났으므로 접수 화면은 반드시 보여줘야 합니다. */
    setTimeout(finish, 640+rows.length*40);
  }

  /* ── 전송 ── */
  function send(){
    const fd=new FormData(fm);
    const mode=CFG.mode||'form';
    if(mode!=='json'){
      // 폼 서비스로 메일이 갈 때만 의미 있는 값입니다. 자체 API 에는 보내지 않습니다.
      fd.append('_subject', CFG.subject||'복만당 가맹 상담 신청');
      fd.append('보낸시각', new Date().toLocaleString('ko-KR'));
    }

    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(), CFG.timeout||15000);
    const opt={method:'POST', signal:ctl.signal};

    if(mode==='json'){
      opt.headers={'Content-Type':'application/json','Accept':'application/json'};
      opt.body=JSON.stringify(Object.fromEntries(fd));
    }else if(mode==='opaque'){
      opt.mode='no-cors';           // 응답을 읽을 수 없습니다 — config.js 주석 참고
      opt.body=fd;
    }else{
      opt.headers={'Accept':'application/json'};
      opt.body=fd;                  // Content-Type 은 브라우저가 boundary 와 함께 붙입니다
    }

    return fetch(CFG.endpoint, opt).then(res=>{
      clearTimeout(timer);
      if(mode==='opaque') return;   // opaque 응답은 status 가 항상 0 입니다
      if(res.ok) return;
      // 서버가 이유를 알려주면 그대로 보여줍니다 (예: "성함을 2자 이상…")
      return res.json().then(
        j=>{ const e=new Error(j&&j.error ? j.error : 'HTTP '+res.status); e.fromServer=!!(j&&j.error); throw e; },
        ()=>{ throw new Error('HTTP '+res.status); });
    }, e=>{ clearTimeout(timer); throw e; });
  }

  fm.onsubmit=e=>{
    e.preventDefault();
    if(sending) return;                                   // 중복 제출 방지
    clearErr();
    if(document.getElementById('f0').value) return;       // 허니팟 — 봇이면 조용히 무시
    if(!validate()) return;

    if(!LIVE){ showSent(); return; }                      // 데모 모드

    sending=true;
    btn.disabled=true; fm.setAttribute('aria-busy','true');
    btnT.textContent='보내는 중…';
    send().then(showSent).catch(ex=>{
      sending=false;
      btn.disabled=false; fm.removeAttribute('aria-busy');
      btnT.textContent='다시 보내기';
      const TEL=' <a href="tel:0256555288">02-565-5288</a>로 연락 주세요.';
      err.textContent='';   // 서버 문구는 HTML 로 해석하지 않습니다
      if(ex&&ex.name==='AbortError')
        err.innerHTML='전송이 지연되고 있습니다. 잠시 후 다시 시도하시거나'+TEL;
      else if(ex&&ex.fromServer)
        err.textContent=ex.message;
      else
        err.innerHTML='전송에 실패했습니다. 네트워크를 확인한 뒤 다시 시도하시거나'+TEL;
      err.hidden=false;
      if(!RM) anim(err,{opacity:[0,1],transform:['translateY(-6px)','none']},{d:340,clear:'opacity,transform'});
    });
  };
})();

/* ══════ 외부 채널 · 주소 복사 ══════
   config.js 의 BOKMANDANG.links 에 주소가 들어 있는 항목만 버튼으로 그립니다.
   비어 있으면 아무것도 그리지 않아 빈 버튼이 남지 않습니다. */
/* 관리자에서 주소를 고치면 다시 그려야 하므로 함수로 둡니다.
   예전에는 비었을 때 요소를 remove() 해 버려서, 나중에 값이 와도 그릴 자리가 없었습니다.
   이제는 비우고 감추기만 합니다. */
function drawLinks(){
  const L=(window.BOKMANDANG&&window.BOKMANDANG.links)||{};
  const url=k=>((L[k]||'')+'').trim();

  const box=document.getElementById('ext');
  if(box){
    box.innerHTML='';
    [['naverPlace','네이버 플레이스'],['reserve','네이버 예약'],
     ['baemin','배달의민족'],['coupangeats','쿠팡이츠'],['yogiyo','요기요']]
      .forEach(([k,label])=>{
        const u=url(k); if(!u) return;
        const a=document.createElement('a');
        a.className='chip-link'; a.href=u; a.target='_blank'; a.rel='noopener';
        a.textContent=label;
        a.setAttribute('aria-label', label+' (새 창)');
        box.appendChild(a);
      });
    box.hidden=!box.children.length;
  }

  const kit=document.getElementById('kitshop'), ku=url('kitShop');
  if(kit){
    kit.innerHTML = ku
      ? `<a class="btn btn-brass" href="${esc(ku)}" target="_blank" rel="noopener">밀키트 구매하기 `
        + `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3L4 12" stroke="currentColor" stroke-width="1.3" fill="none"/></svg></a>`
      : '';
    kit.hidden=!ku;
  }

  /* 메뉴 섹션에도 구매처를 안내합니다 — 밀키트 카드를 본 사람이
     어디서 사는지 바로 알 수 있게. 주소가 없으면 그리지 않습니다. */
  const mk=document.getElementById('menuKit');
  if(mk){
    mk.innerHTML = ku
      ? `밀키트는 온라인에서도 구매하실 수 있습니다 <a href="${esc(ku)}" target="_blank" rel="noopener">스마트스토어에서 구매하기`
        + `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3L4 12" stroke="currentColor" stroke-width="1.3" fill="none"/></svg></a>`
      : '';
    mk.hidden=!ku;
    if(window.BM_I18N) BM_I18N.apply(mk);
  }
  if(window.BM_I18N){ var ex=document.getElementById('ext'); if(ex) BM_I18N.apply(ex);
                      var ks=document.getElementById('kitshop'); if(ks) BM_I18N.apply(ks); }
}
drawLinks();

(function(){

  /* 주소 복사 — clipboard API 는 https/localhost 에서만 동작합니다.
     막힌 환경에서는 안내 문구를 바꿔 직접 복사하도록 유도합니다. */
  const cp=document.getElementById('cpaddr');
  if(cp){
    const label=cp.textContent;
    let t;
    cp.onclick=()=>{
      const say=msg=>{ cp.textContent=msg; clearTimeout(t); t=setTimeout(()=>cp.textContent=label,2200); };
      const addr=cp.dataset.addr;
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(addr).then(()=>say('복사했습니다'),()=>say('복사할 수 없습니다'));
      } else say('복사할 수 없습니다');
    };
  }
})();

/* ══════ 방문 통계 (선택) ══════
   config.js 의 ga4 에 측정 ID 를 넣으면 그때만 gtag.js 를 불러옵니다. */
(function(){
  const id=(window.BOKMANDANG&&window.BOKMANDANG.ga4||'').trim();
  if(!id) return;
  const t=document.createElement('script');
  t.async=true; t.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
  document.head.appendChild(t);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){dataLayer.push(arguments);};
  gtag('js',new Date()); gtag('config',id);
})();

/* 버튼 hover 리프트 */
document.querySelectorAll('.btn').forEach(b=>{
  b.addEventListener('mouseenter',()=>anim(b,{transform:['none','translateY(-2px)']},{d:260,ease:E.back,fill:'forwards'}));
  b.addEventListener('mouseleave',()=>anim(b,{transform:['translateY(-2px)','none']},{d:300,clear:'transform'}));
});

/* 스크롤 루프 — 헤더 / 진행바 / 패럴랙스 / 현재 섹션 */
const hd=document.getElementById('hd'), tp=document.getElementById('tp'), pg=document.getElementById('pg');
const links=[...document.querySelectorAll('header nav a')].filter(a=>(a.getAttribute('href')||'').startsWith('#'));
let ticking=false;
function frame(){
  const y=scrollY, H=document.documentElement.scrollHeight-innerHeight;
  hd.classList.toggle('solid',y>40);
  tp.classList.toggle('on',y>700);
  if(pg) pg.style.width=(H>0? (y/H*100):0)+'%';
  if(!RM) PX.forEach(([el,amt])=>{
    const r=el.getBoundingClientRect();
    if(r.bottom>-200&&r.top<innerHeight+200){
      const p=(r.top+r.height/2-innerHeight/2)/innerHeight;
      el.style.setProperty('--pyy',(p*amt)+'px');
      el.style.translate='0 '+(p*amt)+'px';
    }
  });
  let cur='';
  links.forEach(a=>{const s=document.querySelector(a.getAttribute('href')); if(s&&s.offsetTop-140<=y)cur=a.getAttribute('href');});
  links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')===cur));
  ticking=false;
}
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(frame);}},{passive:true});
frame();
tp.onclick=()=>scrollTo({top:0,behavior:'smooth'});

/* ══════════════════════════════════════════════════════════
   확장 모션 레이어
   split-line 마스크 / 인트로 커튼 / 마퀴 / 스크롤 스크럽 /
   마그네틱 버튼 / 커스텀 커서 / 카드 마우스 패럴랙스 /
   헤더 오토하이드 / 가격 카운트업 / 레일 진행선
   ══════════════════════════════════════════════════════════ */

/* 1) 헤드라인 줄 단위 마스크 리빌 ------------------------- */
function splitLines(el){
  if(el.dataset.split) return [...el.querySelectorAll('.mo-line > span')];
  const parts=el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML=parts.map(p=>'<span class="mo-line"><span>'+p+'</span></span>').join('');
  el.dataset.split='1';
  return [...el.querySelectorAll('.mo-line > span')];
}
document.querySelectorAll('.d1, .head .d2, .band h2, .cta-in .d2').forEach(h=>{
  const lines=splitLines(h);
  if(RM) return;
  lines.forEach(l=>{l.style.transform='translateY(112%)';l.style.opacity='0';});
  inView(h.closest('section')||h, ()=>{
    lines.forEach((l,i)=>anim(l,{transform:['translateY(112%)','none'],opacity:[0,1]},
      {d:1050,delay:i*105,ease:E.out,clear:'transform,opacity'}));
  },{amount:0.05});
});

/* 히어로의 '전국 N개 매장' — 매장을 늘려도 문구가 어긋나지 않게 데이터에서 채웁니다.
   바로 아래 라벨 스태거가 글자를 하나씩 span 으로 쪼개 버리므로,
   그 전에 한 번 채우고, 나중에 값이 바뀌면 쪼개진 형태로 다시 씁니다. */
function heroStoreLabel(list){
  const el=document.getElementById('hlbl'); if(!el) return;
  const open=(list||[]).filter(s=>!s.soon).length;
  if(!open || el.dataset.n===String(open)) return;
  el.dataset.n=String(open);
  /* i18n 이 이미 이 라벨을 번역해 두었는데 여기서 한국어 틀로 덮어쓰면 되돌아갑니다.
     사전에서 같은 문장을 찾아 숫자만 갈아 끼웁니다.

     예전에는 번역문에서 리터럴 12 를 찾아 바꿨습니다. 그 정규식이 편집 도중
     깨져 백스페이스 문자가 박혔고, 아무 말 없이 항상 12 개로 보였습니다.
     자리표시자를 쓰고, 그마저 없으면 한국어 틀로 직접 만듭니다 —
     숫자만은 반드시 맞게 둡니다. */
  var tpl='SINCE 2024 - 전국 {n}개 매장';
  var tr=(window.BM_I18N && window.BM_I18N.t && window.BM_I18N.t(tpl)) || tpl;
  const txt = tr.indexOf('{n}') >= 0 ? tr.replace('{n}', open)
                                     : 'SINCE 2024 - 전국 ' + open + '개 매장';
  if(el.querySelector('.mo-ch'))
    el.innerHTML=[...txt].map(c=>'<span class="mo-ch">'+(c===' '?'&nbsp;':c)+'</span>').join('');
  else el.textContent=txt;
}
heroStoreLabel(window.STORES);

/* 2) 라벨 글자 스태거 ------------------------------------- */
/* 가격 카드의 라벨은 뺍니다 — 카드가 자기 모션을 갖고 있는데, 여기서
   innerHTML 을 글자 단위로 다시 쓰면 그 구조가 통째로 날아갑니다. */
document.querySelectorAll('.hero .lbl:not(.pc-t), .rail .lbl, .band .sig').forEach(el=>{
  if(RM) return;
  const txt=el.textContent;
  el.innerHTML=[...txt].map(c=>'<span class="mo-ch">'+(c===' '?'&nbsp;':c)+'</span>').join('');
  const chs=[...el.querySelectorAll('.mo-ch')];
  chs.forEach(c=>{c.style.opacity='0';c.style.transform='translateY(8px)';});
  inView(el,()=>chs.forEach((c,i)=>anim(c,{opacity:[0,1],transform:['translateY(8px)','none']},
    {d:520,delay:i*22,ease:E.out,clear:'opacity,transform'})),{amount:0.4});
});

/* 3) 인트로 커튼 ------------------------------------------ */
(function(){
  const intro=document.getElementById('intro');
  if(!intro) return;
  /* 인트로는 한 세션에 한 번만. 같은 탭에서 다시 들어오거나 뒤로가기로 돌아올 때
     3초짜리 커튼을 또 보게 하지 않습니다. 탭을 닫으면 초기화됩니다.
     (sessionStorage 가 막힌 환경 — 시크릿 모드 등 — 에서는 예외를 삼키고 매번 재생) */
  let seen=false;
  try{ seen=sessionStorage.getItem('bm.intro')==='1'; }catch(e){}
  if(RM||seen){ intro.remove(); document.body.classList.add('loaded'); return; }
  try{ sessionStorage.setItem('bm.intro','1'); }catch(e){}
  // 붓글씨 쓰듯 한 글자씩 왼쪽→오른쪽으로 그어지며 등장
  /* 붓글씨 3글자는 획을 긋듯 순차로, ® 는 마지막에 톡 떨어지듯 붙습니다 */
  const chars=[...intro.querySelectorAll('.ch:not(.ch-r)')];
  const rmark=intro.querySelector('.ch-r');
  const GAP=230, START=180, DRAW=340, HOLD=520;
  document.body.style.overflow='hidden';
  const run=()=>{
    chars.forEach((c,i)=>{
      const d=START+i*GAP;
      anim(c,{opacity:[0,1]},{d:70,delay:d});
      anim(c,{clipPath:['inset(0 100% 0 0)','inset(0 0 0 0)']},{d:DRAW,delay:d,ease:'cubic-bezier(.22,.95,.3,1)'});
      anim(c,{transform:['translateY(7px) scale(1.07)','none']},{d:DRAW+80,delay:d,ease:'cubic-bezier(.3,1.5,.55,1)'});
    });
    if(rmark){
      const rd=START+chars.length*GAP-40;
      anim(rmark,{opacity:[0,1]},{d:220,delay:rd});
      anim(rmark,{transform:['translateY(-6px) scale(.72)','none']},{d:460,delay:rd,ease:E.back});
    }
    setTimeout(()=>{
      [...chars,rmark].filter(Boolean).forEach((c,i)=>anim(c,{opacity:[1,0],transform:['none','translateY(-9px)']},{d:420,delay:i*45,ease:E.soft}));
      const a=anim(intro,{clipPath:['inset(0 0 0 0)','inset(0 0 100% 0)']},{d:900,delay:280,ease:E.inout});
      done(a).then(()=>{ intro.remove(); document.body.style.overflow=''; document.body.classList.add('loaded'); });
    }, START+(chars.length-1)*GAP+DRAW+HOLD);
  };
  if(document.readyState==='complete') run(); else addEventListener('load',run);
  // 안전망 — 애니메이션이 끝나지 않아도(백그라운드 탭 등) 4.2초 뒤엔 반드시 걷어냅니다
  setTimeout(()=>{ if(document.getElementById('intro')){intro.remove();document.body.style.overflow='';document.body.classList.add('loaded');} },4200);
})();

/* 4) 무한 마퀴 (스크롤 방향에 따라 속도/방향 변화) --------- */
(function(){
  const tr=document.getElementById('mq');
  if(!tr||RM) return;
  let x=0, w=0, sp=0.45, dir=1;
  const measure=()=>{ w=tr.firstElementChild.getBoundingClientRect().width; };
  addEventListener('resize',measure); setTimeout(measure,300); measure();
  let last=scrollY;
  addEventListener('scroll',()=>{ dir = scrollY>last ? 1 : -1; sp = 0.45 + Math.min(Math.abs(scrollY-last)*0.05,2.4); last=scrollY; },{passive:true});
  (function loop(){
    sp += (0.45-sp)*0.05;
    x -= sp*dir;
    if(w){ if(x<=-w) x+=w; if(x>0) x-=w; }
    tr.style.transform='translateX('+x+'px)';
    requestAnimationFrame(loop);
  })();
})();

/* 5) 커스텀 커서 ------------------------------------------ */
(function(){
  if(RM||!matchMedia('(pointer:fine)').matches) return;
  const d=document.getElementById('cur'), r=document.getElementById('curr');
  if(!d||!r) return;
  let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my,scale=1,ts=1;
  addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;d.style.opacity='1';r.style.opacity='.7';},{passive:true});
  addEventListener('mouseleave',()=>{d.style.opacity='0';r.style.opacity='0';});
  const hot='a,button,.mcard,.thumbs img,.tab,.qa button,input,select,textarea';
  addEventListener('mouseover',e=>{ ts = e.target.closest(hot) ? 1.75 : 1; },{passive:true});
  (function loop(){
    rx+=(mx-rx)*.16; ry+=(my-ry)*.16; scale+=(ts-scale)*.14;
    d.style.transform='translate('+(mx-4.5)+'px,'+(my-4.5)+'px)';
    r.style.transform='translate('+(rx-19)+'px,'+(ry-19)+'px) scale('+scale.toFixed(3)+')';
    requestAnimationFrame(loop);
  })();
})();

/* 6) 마그네틱 버튼 ---------------------------------------- */
if(!RM) document.querySelectorAll('.btn, .top').forEach(b=>{
  b.addEventListener('mousemove',e=>{
    const r=b.getBoundingClientRect();
    const dx=(e.clientX-(r.left+r.width/2))/r.width, dy=(e.clientY-(r.top+r.height/2))/r.height;
    b.style.translate=(dx*9).toFixed(1)+'px '+(dy*7).toFixed(1)+'px';
  });
  b.addEventListener('mouseleave',()=>{ b.style.transition='translate .5s cubic-bezier(.16,1,.3,1)';
    b.style.translate='0 0'; setTimeout(()=>b.style.transition='',520); });
  b.addEventListener('mouseenter',()=>{ b.style.transition=''; });
});

/* 7) 메뉴 카드 마우스 패럴랙스 ---------------------------- */
if(!RM) document.addEventListener('mousemove',e=>{
  const c=e.target.closest('.mcard'); if(!c) return;
  const img=c.querySelector('img'); if(!img) return;
  const r=c.getBoundingClientRect();
  const dx=(e.clientX-(r.left+r.width/2))/r.width, dy=(e.clientY-(r.top+r.height/2))/r.height;
  img.style.translate=(dx*-14).toFixed(1)+'px '+(dy*-12).toFixed(1)+'px';
},{passive:true});
if(!RM) document.addEventListener('mouseout',e=>{
  const c=e.target.closest('.mcard'); if(!c) return;
  const img=c.querySelector('img'); if(img) img.style.translate='0 0';
},{passive:true});

/* 8) 가격 카운트업 ---------------------------------------- */
function countUp(el){
  if(RM) return;
  const raw=el.textContent.replace(/,/g,''), end=+raw;
  if(!end) return;
  const t0=performance.now(), dur=900, done=end.toLocaleString('ko-KR');
  (function tick(t){
    const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=Math.round(end*e).toLocaleString('ko-KR');
    if(p<1) requestAnimationFrame(tick);
  })(t0);
  setTimeout(()=>{ el.textContent=done; }, dur+200);   // 프레임이 안 돌아도 숫자는 남깁니다
}

/* 9) 스크롤 스크럽 대상 등록 ------------------------------ */
const SCRUB=[];
document.querySelectorAll('.sec').forEach(sec=>{
  const bar=sec.querySelector('.rail .bar');
  if(bar) SCRUB.push([sec,p=>bar.style.setProperty('--p',p.toFixed(3))]);
});
(function(){
  const img=document.querySelector('.hero-img>img');
  const hero=document.querySelector('.hero');
  if(img&&hero&&!RM) SCRUB.push([hero,p=>{ img.style.scale=(1+p*0.07).toFixed(4); }]);
})();
(function(){ /* 인용 배너: 스크롤에 따라 문장이 밝아짐 */
  const band=document.getElementById('band');
  if(!band||RM) return;
  const lines=[...band.querySelectorAll('.mo-line > span')];
  if(!lines.length) return;
  SCRUB.push([band,p=>{
    lines.forEach((l,i)=>{
      const seg=(p-0.12-i*0.13)/0.4;
      l.style.opacity=Math.max(.22,Math.min(1,seg)).toFixed(3);
    });
  }]);
})();

/* 10) 헤더 오토 하이드 + 스크럽 루프 ---------------------- */
(function(){
  const hd=document.getElementById('hd');
  let prev=scrollY, raf=false;
  function tick(){
    const y=scrollY;
    if(!document.body.classList.contains('nav-open')){
      if(y>420 && y>prev+6) hd.classList.add('hide');
      else if(y<prev-6 || y<=420) hd.classList.remove('hide');
    }
    prev=y;
    SCRUB.forEach(([el,fn])=>{
      const r=el.getBoundingClientRect();
      const p=Math.max(0,Math.min(1,(innerHeight*0.85-r.top)/(r.height+innerHeight*0.5)));
      fn(p);
    });
    raf=false;
  }
  addEventListener('scroll',()=>{ if(!raf){raf=true;requestAnimationFrame(tick);} },{passive:true});
  tick();
})();

/* ══════ 매장 디렉터리 ══════
   ▼ 실제 지점 정보는 아래 STORES 배열만 교체하면 됩니다.
   r: '서울' | '경기' | '지방'   ·  new:true → NEW 배지  ·  soon:true → 오픈예정 배지 */
// 매장 데이터는 assets/data/stores.js 에서 주입됩니다 (window.STORES)
const STORES = (window.STORES || []).slice();   // API 응답으로 내용이 교체될 수 있습니다
(function(){
  const list=document.getElementById('slist'), empty=document.getElementById('sempty'),
        cnt=document.getElementById('scnt'), q=document.getElementById('sq'), rgn=document.getElementById('rgn');
  if(!list) return;
  let region='all', kw='', cntT;
  const PER=10, pager=document.getElementById('spager');   // 한 화면에 10곳씩
  let page=1;
  const nmap=s=>'https://map.naver.com/p/search/'+encodeURIComponent('복만당 '+s);
  function draw(animate){
    const rows=STORES.filter(s=>(region==='all'||s.r===region) &&
      (!kw||(s.n+s.a+s.r).toLowerCase().includes(kw)));
    /* 걸러진 결과가 줄면 보고 있던 쪽수가 사라질 수 있어 범위 안으로 되돌립니다 */
    const pages=Math.max(1, Math.ceil(rows.length/PER));
    if(page>pages) page=pages;
    const shown=rows.slice((page-1)*PER, page*PER);
    list.innerHTML='';
    shown.forEach((s,i)=>{
      const el=document.createElement('div');
      el.className='srow'; el.setAttribute('role','listitem');
      /* 지도 링크는 관리자에서 넣은 주소를 우선합니다. 비어 있으면 지점명으로 검색을 엽니다.
         값은 서버에서 http(s) 인지 검사한 뒤에만 저장됩니다. */
      const tel = s.tel ? `<a class="ph" href="tel:${String(s.tel).replace(/[^0-9+]/g,'')}">${esc(s.tel)}</a>` : '';
      /* 영업시간을 아직 못 받은 지점은 옛날에 '영업시간 확인 중' 이라고 적어 뒀는데,
         채워 넣을 계획이 없으면 지키지 않을 약속이 됩니다. 바로 옆 '지도 보기' 로
         넘겨 두면 영업시간이 바뀌어도 손볼 게 없습니다. */
      /* 영업시간 값은 '15:40 라스트오더' 처럼 숫자 + 낱말입니다. 통째로는 사전에
         없으니 낱말만 갈아 끼웁니다 — 시간은 어느 나라 말이든 그대로입니다. */
      const hrs = (!s.t || /확인\s*중/.test(s.t))
        ? `<span class="h-none">${esc(T('지도에서 영업시간 확인'))}</span>`
        : esc(String(s.t).replace(/라스트오더|브레이크타임|영업 종료|오픈 준비 중|매일/g, m => T(m)));
      el.innerHTML=`<div class="nm">${esc(s.n)}
          ${s.main?`<span class="badge">${esc(T('본점'))}</span>`:''}
          ${s.new?'<span class="badge">NEW</span>':''}
          ${s.soon?`<span class="badge soon">${esc(T('오픈예정'))}</span>`:''}</div>
        <div class="ad">${esc(s.a)}${tel?'<span class="sep-d">·</span>'+tel:''}</div>
        <div class="tel">${hrs}${s.off?`<span class="off">${esc(s.off)} ${esc(T('휴무'))}</span>`:''}</div>
        <a class="go" href="${esc(s.map||nmap(s.n))}" target="_blank" rel="noopener">${esc(T('지도 보기'))}
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5"/></svg></a>`;
      list.appendChild(el);
      if(animate!==false) anim(el,{opacity:[0,1],transform:['translateY(14px)','none']},
        {d:560,delay:i*48,ease:E.out,clear:'opacity,transform'});
    });
    empty.style.display=rows.length?'none':'block';
    drawPager(rows.length, pages);
    if(window.BM_I18N && pager) BM_I18N.apply(pager);
    /* 필터·검색 결과를 스크린리더에 알립니다. 숫자는 카운트업 애니메이션과 별개로
       최종 값만 한 번 넣어야 읽는 도중에 계속 끊기지 않습니다. */
    const st=document.getElementById('sstatus');
    if(st) st.textContent = rows.length
      ? `매장 ${rows.length}곳이 검색되었습니다.`
      : '검색 결과가 없습니다.';
    const target=rows.length;
    cnt.textContent=target;          // 애니메이션이 안 돌아도 숫자는 맞아야 합니다
    if(!RM){ const t0=performance.now();
      (function tk(t){const p=Math.min(1,(t-t0)/600);cnt.textContent=Math.round(target*(1-Math.pow(1-p,3)));
        if(p<1)requestAnimationFrame(tk);})(t0);
      /* rAF 가 멈춘 채로 끝나면(탭이 뒤에 있거나 브라우저가 프레임을 아낄 때)
         0 에서 굳습니다. 시간이 지나면 무조건 최종값으로 맞춰 둡니다.
         필터를 연달아 바꾸면 이전 타이머가 옛 숫자로 되돌리므로 매번 취소합니다. */
      clearTimeout(cntT);
      cntT = setTimeout(()=>{ cnt.textContent=target; }, 900);
    }
  }
  /* 쪽 버튼 — 결과가 한 쪽뿐이면 아예 그리지 않습니다 */
  function drawPager(total, pages){
    if(!pager) return;
    if(pages<2){ pager.hidden=true; pager.innerHTML=''; return; }
    pager.hidden=false;
    const btn=(p,label,cur,dis)=>
      `<button type="button" data-p="${p}"${cur?' class="on" aria-current="page"':''}${dis?' disabled':''}>${label}</button>`;
    const nums=Array.from({length:pages},(_,i)=>btn(i+1,i+1,page===i+1,false)).join('');
    pager.innerHTML =
      btn(page-1,'‹',false,page===1) + nums + btn(page+1,'›',false,page===pages) +
      `<span class="pg-of">${(page-1)*PER+1}-${Math.min(page*PER,total)} / ${total}${
        (window.BM_I18N && window.BM_I18N.t('곳')) || '곳'}</span>`;
  }
  if(pager) pager.onclick=e=>{
    const b=e.target.closest('button[data-p]'); if(!b||b.disabled) return;
    page=+b.dataset.p; draw();
    /* 쪽을 넘기면 목록 맨 위가 보이게 — 안 그러면 화면 중간에 머물러 바뀐 걸 놓칩니다 */
    list.scrollIntoView({block:'start', behavior:RM?'auto':'smooth'});
  };

  rgn.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    rgn.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); region=b.dataset.r; page=1; draw();
  });
  let deb; q.addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{kw=q.value.trim().toLowerCase();page=1;draw();},160);});
  draw(false);
  { const st=document.getElementById('sstatus'); if(st) st.textContent=''; }

  heroStoreLabel(STORES);

  /* 관리자 화면에서 고친 매장 목록을 받아옵니다.
     assets/data/stores.js 로 먼저 그린 뒤라, API 가 없거나 실패해도 화면은 정상입니다.
     (관리자 기능을 안 쓰면 /api/stores 가 rows:null 을 돌려주고 아무 일도 없습니다) */
  fetch('/api/stores', {headers:{'Accept':'application/json'}})
    .then(r=>r.ok?r.json():null)
    .then(j=>{
      if(!j||!Array.isArray(j.rows)||!j.rows.length) return;
      const same = j.rows.length===STORES.length &&
        j.rows.every((s,i)=>s.n===STORES[i].n&&s.a===STORES[i].a&&s.t===STORES[i].t&&s.r===STORES[i].r
                            &&s.tel===STORES[i].tel&&s.off===STORES[i].off&&s.map===STORES[i].map);
      if(same) return;                       // 바뀐 게 없으면 다시 그리지 않습니다
      STORES.length=0; STORES.push(...j.rows);
      draw(false); heroStoreLabel(STORES);
    })
    .catch(()=>{});                          // 오프라인·차단 등 — 정적 목록 유지
  inView(list,()=>{ [...list.children].forEach((el,i)=>{
    el.style.opacity='0';
    anim(el,{opacity:[0,1],transform:['translateY(16px)','none']},{d:600,delay:i*55,ease:E.out,clear:'opacity,transform'});
  });},{amount:0.05});
})();

/* ══════ 모바일 강화 ══════ */
(function(){
  const mq=matchMedia('(max-width:760px)');
  const bar=document.getElementById('mbar'), hint=document.getElementById('swipe');
  function apply(){
    const m=mq.matches;
    document.body.classList.toggle('has-mbar',m);
    if(hint) hint.style.display=m?'flex':'none';
  }
  apply(); mq.addEventListener('change',apply);

  // 하단 바: 히어로를 지나면 등장, 문의 섹션에서는 숨김
  if(bar){
    const contact=document.getElementById('contact');
    const upd=()=>{
      if(!mq.matches){bar.classList.remove('on');return;}
      const past=scrollY>460;
      const inContact=contact && contact.getBoundingClientRect().top < innerHeight*0.8;
      bar.classList.toggle('on', past && !inContact && !document.body.classList.contains('nav-open'));
    };
    upd(); addEventListener('scroll',upd,{passive:true}); mq.addEventListener('change',upd);
  }

  // 메뉴 캐러셀: 스와이프하면 힌트 숨김
  const grid=document.getElementById('mgrid');
  if(grid&&hint){
    grid.addEventListener('scroll',()=>{
      if(grid.scrollLeft>20){ anim(hint,{opacity:[1,0]},{d:320,fill:'forwards'});
        setTimeout(()=>hint.style.visibility='hidden',330); }
    },{passive:true,once:true});
  }

  // 모바일에서는 무거운 스크럽 패럴랙스 축소
  if(mq.matches){ PX.length=0; }
  mq.addEventListener('change',e=>{ if(e.matches) PX.length=0; });
})();

/* ══════ 홈페이지 문구 · 팝업 ══════
   /api/site 한 번으로 둘 다 받습니다. 실패하면 아무 일도 일어나지 않고
   HTML 에 적힌 원래 문구가 그대로 남습니다. */
(function(){
  /* 문구를 갈아 끼웁니다.
     주의 — 히어로 제목은 이미 splitLines() 가 줄 단위 <span> 으로 쪼개 놓았습니다.
     그냥 textContent 를 바꾸면 그 구조가 날아가 애니메이션이 깨지므로,
     쪼개진 요소는 다시 쪼개고 곧바로 보이게 둡니다(응답이 늦게 오므로 등장 연출은 생략). */
  function setText(el, text){
    const html = esc(text).replace(/\n/g, '<br>');
    if (el.dataset.split){
      el.innerHTML = html;
      delete el.dataset.split;
      splitLines(el).forEach(l => { l.style.opacity='1'; l.style.transform='none'; });
      return;
    }
    if (el.querySelector('.mo-ch')){
      el.innerHTML = [...String(text)].map(c =>
        `<span class="mo-ch">${c===' '?'&nbsp;':esc(c)}</span>`).join('');
      return;
    }
    el.innerHTML = html;
  }

  /* ── 팝업 ────────────────────────────────────────────────────────
     '오늘 하루 보지 않기' 는 이 브라우저에만 남습니다(localStorage).
     막힌 환경(시크릿 모드 등)에서는 그냥 매번 보이게 둡니다. */
  const today = () => new Date().toISOString().slice(0,10);
  const seenKey = id => `bm.pop.${id}`;
  function hidden(id){
    try { return localStorage.getItem(seenKey(id)) === today(); } catch(e){ return false; }
  }
  function hideToday(id){
    try { localStorage.setItem(seenKey(id), today()); } catch(e){}
  }

  /* 모달은 흰 카드 위라 btn-line(어두운 섹션용)을 쓰면 글자가 안 보입니다 */
  const linkHTML = p => p.link_url
    ? `<a class="btn btn-dark" href="${esc(p.link_url)}"${/^https?:/i.test(p.link_url)?' target="_blank" rel="noopener"':''}>${esc(p.link_label||'자세히 보기')}</a>`
    : '';

  function showBand(p){
    const el = document.getElementById('popBand');
    if (!el) return;
    el.innerHTML = `<div class="pb-in">
        <p><b>${esc(p.title)}</b>${p.body?`<span>${esc(p.body)}</span>`:''}</p>
        ${p.link_url?`<a class="pb-go" href="${esc(p.link_url)}"${/^https?:/i.test(p.link_url)?' target="_blank" rel="noopener"':''}>${esc(p.link_label||'자세히 보기')}</a>`:''}
        <button type="button" class="pb-x" aria-label="공지 닫기">✕</button>
      </div>`;
    el.hidden = false;
    document.body.classList.add('has-band');
    /* 실제 높이를 재서 헤더·본문을 정확히 그만큼만 내립니다 (문구가 길면 두 줄이 됩니다) */
    const setH = () => document.documentElement.style.setProperty('--band-h', el.offsetHeight + 'px');
    setH(); addEventListener('resize', setH);
    el.querySelector('.pb-x').onclick = () => {
      el.hidden = true;
      document.body.classList.remove('has-band');
      document.documentElement.style.removeProperty('--band-h');
      hideToday(p.id);
    };
  }

  function showModal(p){
    const el = document.getElementById('popModal');
    if (!el) return;
    el.innerHTML = `<div class="pm-card" role="document">
        <button type="button" class="pm-x" aria-label="닫기">✕</button>
        ${p.image_url?`<img class="pm-img" src="${esc(p.image_url)}" alt="">`:''}
        <div class="pm-body">
          <h2 id="popTitle">${esc(p.title)}</h2>
          ${p.body?`<p>${esc(p.body).replace(/\n/g,'<br>')}</p>`:''}
          ${linkHTML(p)}
        </div>
        <label class="pm-off"><input type="checkbox"> 오늘 하루 보지 않기</label>
      </div>`;
    el.hidden = false;

    const off = el.querySelector('.pm-off input');
    const prev = document.activeElement;
    const close = () => {
      if (off.checked) hideToday(p.id);
      el.hidden = true;
      document.body.style.overflow = '';
      lockBg(false);
      el.removeEventListener('keydown', trap);
      if (prev && prev.focus) prev.focus();
    };
    /* 열려 있는 동안 Tab 이 뒤 배경으로 새어 나가지 않게 잠급니다 (라이트박스와 같은 방식) */
    lockBg(true);
    const trap = cycle(() => [...el.querySelectorAll(FOCUSABLE)]);
    el.addEventListener('keydown', trap);
    document.body.style.overflow = 'hidden';
    el.querySelector('.pm-x').onclick = close;
    el.addEventListener('click', e => { if (e.target === el) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden) close(); });
    setTimeout(() => el.querySelector('.pm-x').focus(), 60);
    anim(el, {opacity:[0,1]}, {d:240, ease:E.soft, clear:'opacity'});
    anim(el.querySelector('.pm-card'), {opacity:[0,1], transform:['translateY(18px) scale(.97)','none']},
         {d:520, ease:E.back, clear:'opacity,transform'});
  }

  /* 모달은 인트로 커튼이 끝난 뒤에 띄웁니다 — 커튼 위에 겹치면 둘 다 안 읽힙니다.
     인트로가 없거나 이미 끝났으면 바로 띄웁니다. */
  function afterIntro(fn){
    /* 옵저버와 5초 폴백이 둘 다 fn 을 부르면 모달이 두 번 그려집니다.
       어느 쪽이 먼저 오든 한 번만 실행되게 잠급니다. */
    let done = false;
    const once = () => { if (done) return; done = true; fn(); };
    if (document.body.classList.contains('loaded')) return once();
    const mo = new MutationObserver(() => {
      if (document.body.classList.contains('loaded')) { mo.disconnect(); setTimeout(once, 260); }
    });
    mo.observe(document.body, {attributes:true, attributeFilter:['class']});
    setTimeout(() => { mo.disconnect(); once(); }, 5000);   // 인트로가 멈춰도 팝업은 뜨게
  }

  fetch('/api/site', {headers:{'Accept':'application/json'}})
    .then(r => r.ok ? r.json() : null)
    .then(j => {
      if (!j) return;

      /* 문구 */
      const st = j.settings || {};
      /* 관리자 문구는 i18n 이 지나간 뒤에 도착합니다 — 그대로 쓰면 번역이 한국어로
         되돌아갑니다. 사전에서 찾아 보고, 관리자가 새로 쓴 문장이면 원문 그대로 둡니다. */
      document.querySelectorAll('[data-t]').forEach(el => {
        const v = st[el.dataset.t];
        if (typeof v === 'string' && v.trim()) setText(el, T(v));
      });
      /* 외부 채널 주소도 같은 곳에서 관리합니다 — config.js 값보다 우선합니다 */
      const L = (window.BOKMANDANG && window.BOKMANDANG.links) || {};
      let changed = false;
      for (const k of Object.keys(L)) {
        const v = st['links.' + k];
        if (typeof v === 'string' && v.trim() && v !== L[k]) { L[k] = v.trim(); changed = true; }
      }
      if (changed && typeof drawLinks === 'function') drawLinks();

      /* 팝업 — 종류별로 하나씩만 띄웁니다. 여러 개 겹치면 읽히지 않습니다. */
      const list = (j.popups || []).filter(p => !hidden(p.id));
      const band = list.find(p => p.kind === 'banner');
      const modal = list.find(p => p.kind === 'modal');
      if (band) showBand(band);
      if (modal) afterIntro(() => showModal(modal));
    })
    .catch(() => {});
})();
