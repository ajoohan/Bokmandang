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
const IMG={g:'menu-gomtang',s:'menu-sugyuk',m:'menu-mandu',t:'menu-sugyuk-plate',b:'menu-teuk',k:'kit-package',u:'menu-useol'};
const IMGDIR='assets/img/';
const MENU_SIZES='(max-width:760px) 78vw, (max-width:1080px) 44vw, 22vw';
/* AVIF → WebP → JPEG 순으로 고르는 <picture> 마크업 */
function picHTML(base, alt, sizes){
  return `<picture>
      <source type="image/avif" sizes="${sizes}" srcset="${IMGDIR}${base}.avif">
      <source type="image/webp" sizes="${sizes}" srcset="${IMGDIR}${base}.webp">
      <img src="${IMGDIR}${base}.jpg" alt="${alt}" loading="lazy" decoding="async">
    </picture>`;
}
const MENU=[
 {c:'tang',n:'곰탕',d:'맑은 한우 육수에 양지 수육을 넉넉히. 복만당의 기본이자 기준.',p:'11,000',u:'원',img:'g',tag:'BEST'},
 {c:'tang',n:'수육곰탕',d:'한우 수육을 두 배로 올린 구성. 깍두기 한 점과 함께.',p:'19,000',u:'원',img:'s',tag:'SIGNATURE',brass:1},
 {c:'tang',n:'특곰탕',d:'고기 양을 늘린 구성. 한 그릇으로 든든하게 드시고 싶을 때.',p:'13,000',u:'원',img:'b'},
 {c:'tang',n:'우설곰탕',d:'부드럽게 삶아낸 우설을 얹은 별미. 수량 한정으로 준비합니다.',p:'16,000',u:'원',img:'u'},
 {c:'side',n:'이북식 손만두',d:'얇은 피에 김치와 두부를 채워 매일 손으로 빚습니다.',p:'2,000',u:'원 / 1알',img:'m'},
 {c:'side',n:'한우수육',d:'250g. 곰탕과 함께 또는 단품으로. 소금장과 함께 드세요.',p:'35,000',u:'원',img:'t'},
 {c:'side',n:'공깃밥',d:'국내산 쌀로 매일 새로 짓습니다.',p:'1,000',u:'원',img:'g'},
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
      el.innerHTML=`<div class="ph">${m.tag?`<span class="tag${m.brass?' brass':''}">${m.tag}</span>`:''}
        ${picHTML(IMG[m.img], m.n, MENU_SIZES)}
        <button type="button" class="zoom" aria-label="${m.n} 사진 크게 보기"></button></div>
        <div class="body-w"><h3>${m.n}</h3><p>${m.d}</p>
        <div class="price"><b>${m.p}</b><span>${m.u}</span></div></div>`;
      /* 카드 아무 데나 클릭해도 열리지만(마우스), 키보드 조작은 사진 위 버튼이 담당합니다.
         버튼이 stopPropagation 하므로 사진을 직접 눌러도 두 번 열리지 않습니다. */
      const zoom=el.querySelector('.zoom');
      zoom.onclick=e=>{ e.stopPropagation(); openLB(el.querySelector('img'),m.n,m.d+'  ·  '+m.p+m.u); };
      el.onclick=()=>zoom.click();
      grid.appendChild(el);
      anim(el,{opacity:[0,1],transform:['translateY(22px) scale(.97)','none']},{d:620,delay:i*65,ease:E.back,clear:'opacity,transform'});
      const pb=el.querySelector('.price b'); if(pb) setTimeout(()=>countUp(pb), 260+i*65);
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
  t.classList.add('on'); moveInd(t); render(t.dataset.f);
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
function openLB(srcEl,t,p){
  // currentSrc: 브라우저가 실제로 내려받은 사본(avif/webp). 재다운로드를 막습니다.
  const src = typeof srcEl==='string'? srcEl : (srcEl.currentSrc||srcEl.src);
  origin = typeof srcEl==='string'? null : srcEl.getBoundingClientRect();
  lbi.src=src; document.getElementById('lbt').textContent=t; document.getElementById('lbp').textContent=p;
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
if(galZoom) galZoom.onclick=()=>openLB(gm,'복만당 본점','서울시 강남구 언주로 563, 원에디션강남 401동 116호');

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
(function(){
  const L=(window.BOKMANDANG&&window.BOKMANDANG.links)||{};
  const url=k=>((L[k]||'')+'').trim();

  const box=document.getElementById('ext');
  if(box){
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
    if(!box.children.length) box.remove();
  }

  const kit=document.getElementById('kitshop'), ku=url('kitShop');
  if(kit){
    if(ku){
      const a=document.createElement('a');
      a.className='btn btn-brass'; a.href=ku; a.target='_blank'; a.rel='noopener';
      a.innerHTML='밀키트 구매하기 <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3L4 12" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>';
      kit.replaceWith(a);
    } else kit.remove();
  }

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

/* 2) 라벨 글자 스태거 ------------------------------------- */
document.querySelectorAll('.hero .lbl, .rail .lbl, .band .sig').forEach(el=>{
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
  const t0=performance.now(), dur=900;
  (function tick(t){
    const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=Math.round(end*e).toLocaleString('ko-KR');
    if(p<1) requestAnimationFrame(tick);
  })(t0);
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
  let region='all', kw='';
  const nmap=s=>'https://map.naver.com/p/search/'+encodeURIComponent('복만당 '+s);
  function draw(animate){
    const rows=STORES.filter(s=>(region==='all'||s.r===region) &&
      (!kw||(s.n+s.a+s.r).toLowerCase().includes(kw)));
    list.innerHTML='';
    rows.forEach((s,i)=>{
      const el=document.createElement('div');
      el.className='srow'; el.setAttribute('role','listitem');
      el.innerHTML=`<div class="nm">${s.n}
          ${s.main?'<span class="badge">본점</span>':''}
          ${s.new?'<span class="badge">NEW</span>':''}
          ${s.soon?'<span class="badge soon">오픈예정</span>':''}</div>
        <div class="ad">${s.a}</div>
        <div class="tel">${s.t}</div>
        <a class="go" href="${nmap(s.n)}" target="_blank" rel="noopener">지도 보기
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5"/></svg></a>`;
      list.appendChild(el);
      if(animate!==false) anim(el,{opacity:[0,1],transform:['translateY(14px)','none']},
        {d:560,delay:i*48,ease:E.out,clear:'opacity,transform'});
    });
    empty.style.display=rows.length?'none':'block';
    /* 필터·검색 결과를 스크린리더에 알립니다. 숫자는 카운트업 애니메이션과 별개로
       최종 값만 한 번 넣어야 읽는 도중에 계속 끊기지 않습니다. */
    const st=document.getElementById('sstatus');
    if(st) st.textContent = rows.length
      ? `매장 ${rows.length}곳이 검색되었습니다.`
      : '검색 결과가 없습니다.';
    const target=rows.length;
    if(!RM){ const t0=performance.now();
      (function tk(t){const p=Math.min(1,(t-t0)/600);cnt.textContent=Math.round(target*(1-Math.pow(1-p,3)));
        if(p<1)requestAnimationFrame(tk);})(t0);
    } else cnt.textContent=target;
  }
  rgn.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    rgn.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); region=b.dataset.r; draw();
  });
  let deb; q.addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{kw=q.value.trim().toLowerCase();draw();},160);});
  draw(false);
  { const st=document.getElementById('sstatus'); if(st) st.textContent=''; }

  /* 관리자 화면에서 고친 매장 목록을 받아옵니다.
     assets/data/stores.js 로 먼저 그린 뒤라, API 가 없거나 실패해도 화면은 정상입니다.
     (관리자 기능을 안 쓰면 /api/stores 가 rows:null 을 돌려주고 아무 일도 없습니다) */
  fetch('/api/stores', {headers:{'Accept':'application/json'}})
    .then(r=>r.ok?r.json():null)
    .then(j=>{
      if(!j||!Array.isArray(j.rows)||!j.rows.length) return;
      const same = j.rows.length===STORES.length &&
        j.rows.every((s,i)=>s.n===STORES[i].n&&s.a===STORES[i].a&&s.t===STORES[i].t&&s.r===STORES[i].r);
      if(same) return;                       // 바뀐 게 없으면 다시 그리지 않습니다
      STORES.length=0; STORES.push(...j.rows);
      draw(false);
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
