#!/usr/bin/env python3
"""복만당 — 단일 파일 프로토타입 빌드  →  build/prototype.html

index.html + CSS + JS + 이미지 + 폰트를 파일 하나로 묶습니다.
공유 링크로 올려 리뷰받는 용도이고, 실제 배포본은 여전히 index.html 입니다.

  python tools/build-artifact.py
"""
import sys, io, os, re, json, base64
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.join(os.path.dirname(__file__), '..')
R    = lambda *p: os.path.join(ROOT, *p)
read = lambda p: io.open(R(p), encoding='utf-8').read()

MIME = {'.avif':'image/avif', '.webp':'image/webp', '.jpg':'image/jpeg',
        '.jpeg':'image/jpeg', '.png':'image/png'}

def datauri(path):
    ext = os.path.splitext(path)[1].lower()
    with open(R(path), 'rb') as f:
        return f'data:{MIME[ext]};base64,' + base64.b64encode(f.read()).decode()

# ── 1. 페이지가 참조하는 이미지를 전부 모은다 ────────────────────────────
html = read('index.html')
js   = read('assets/js/main.js')
# 미리보기는 Chrome/Edge 대상이라 AVIF 만 싣습니다 (WebP·JPEG 폴백은 제외 — 용량 1/4).
# 실제 배포본(index.html)은 세 포맷을 모두 유지합니다.
refs = set(re.findall(r'assets/img/[\w.-]+\.(?:avif|png)', html))
# JS 가 템플릿 리터럴로 만드는 것들 (메뉴 사진 · 매장 갤러리)
for base in re.findall(r"'(menu-[\w-]+|kit-package)'", js):
    refs.add(f'assets/img/{base}.avif')
for base in ['store-hall','store-hall-2','store-entrance','store-counter','store-sign']:
    for suf in ('','-800','-240'):
        refs.add(f'assets/img/{base}{suf}.avif')
refs = sorted(r for r in refs if os.path.exists(R(r)))

art  = {r: datauri(r) for r in refs}
raw  = sum(os.path.getsize(R(r)) for r in refs)
# __ART 는 JS 가 런타임에 만드는 경로만 담습니다.
# HTML 에 이미 박아 넣은 것까지 넣으면 같은 base64 가 파일에 두 번 들어갑니다.
js_needed = {r for r in refs
             if re.match(r'assets/img/(menu-|kit-package)', r)
             or re.match(r'assets/img/store-[\w-]*?(-800)?\.avif$', r) and '-240' not in r}
art_js = {k: v for k, v in art.items() if k in js_needed}
print(f'이미지 {len(refs)}개  원본 {raw//1024}KB → base64 {sum(len(v) for v in art.values())//1024}KB'
      f'  (그중 JS 조회용 {len(art_js)}개)')

# ── 2. 폰트 (Pretendard 서브셋) ─────────────────────────────────────────
sub = R('build/pretendard-subset.woff2')
if not os.path.exists(sub):
    sys.exit('build/pretendard-subset.woff2 가 없습니다. 서브셋을 먼저 만드세요.')
font_b64 = base64.b64encode(open(sub,'rb').read()).decode()
print(f'폰트 서브셋 {os.path.getsize(sub)//1024}KB → base64 {len(font_b64)//1024}KB')

FONT_CSS = ("@font-face{font-family:'Pretendard Variable';font-weight:45 930;"
            "font-style:normal;font-display:swap;"
            f"src:url(data:font/woff2;base64,{font_b64}) format('woff2-variations')}}\n")

# ── 3. HTML 에서 본문만 뽑는다 (아티팩트가 head/body 를 감싸 줍니다) ────
# 공유 갤러리에서는 SEO 제목보다 브랜드 이름 자체가 알아보기 쉽습니다
title = '복만당 1++ 한우곰탕'
body  = html.split('<body>',1)[1].rsplit('</body>',1)[0]
body  = re.sub(r'<script src="[^"]*"></script>\s*', '', body)   # 외부 스크립트 참조 제거
body  = re.sub(r'\s*<source type="image/webp"[^>]*>', '', body) # WebP <source> 제거 (AVIF 만 embed)
body  = re.sub(r'src="assets/img/([\w-]+)\.jpe?g"',
               lambda m: f'src="assets/img/{m.group(1)}.avif"', body)  # img 폴백도 AVIF 로

# ── 4. JS 를 인라인용으로 손본다 ───────────────────────────────────────
cfg = read('assets/js/config.js')
sto = read('assets/data/stores.js')

def sub1(pattern, repl, text, want, what):
    """치환이 실제로 일어났는지 확인합니다 — 조용히 실패하면 결과물이 깨집니다"""
    out, n = re.subn(pattern, repl, text)
    assert n == want, f'{what}: {want}곳을 기대했는데 {n}곳 (원본이 바뀌었는지 확인하세요)'
    print(f'  JS {what}: {n}곳')
    return out

print('JS 인라인 처리 —')
# 템플릿 리터럴이 만드는 경로를 data URI 조회로
js = sub1(r"\$\{IMGDIR\}\$\{base\}([\w.-]*)",
          lambda m: "${__u(IMGDIR+base+'%s')}" % m.group(1), js, 8, '이미지 경로 → 조회')  # picHTML 3 + setGal 5
js = sub1(r"const IMGDIR='assets/img/';",
          "const IMGDIR='assets/img/';\nconst __u=p=>(window.__ART&&window.__ART[p])||p;",
          js, 1, '__u 헬퍼 주입')
# AVIF 만 싣기 때문에 webp <source> 와 jpg 폴백은 뺍니다
js = sub1(r'(?m)^[ \t]*<source type="image/webp".*\n', '', js, 1, 'picHTML webp 제거')
js = sub1(r'(?m)^[ \t]*gp\.querySelector\(\'source\[type="image/webp"\]\'\).*\n', '', js, 1,
          'setGal webp 제거')
js = sub1(r"__u\(IMGDIR\+base\+'\.jpg'\)", "__u(IMGDIR+base+'.avif')", js, 2, 'jpg 폴백 → avif')

# ── 5. CSS ─────────────────────────────────────────────────────────────
css = read('assets/css/style.css')

# ── 6. 이미지 경로 → data URI (HTML 속성) ──────────────────────────────
for path, uri in sorted(art.items(), key=lambda kv: -len(kv[0])):
    body = body.replace(path, uri)

out = []
out.append(f'<title>{title}</title>')
out.append('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
out.append('<link rel="preconnect" href="https://fonts.googleapis.com">'
           '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
out.append('<link href="https://fonts.googleapis.com/css2?family=Cormorant:wght@300;400;500;600'
           '&display=swap" rel="stylesheet">')
out.append('<style>\n' + FONT_CSS + css + '\n</style>')
out.append(body)
out.append('<script>window.__ART=' + json.dumps(art_js) + ';</script>')
out.append('<script>\n' + cfg + '\n</script>')
out.append('<script>\n' + sto + '\n</script>')
out.append('<script>\n' + js  + '\n</script>')

os.makedirs(R('build'), exist_ok=True)
dest = R('build/prototype.html')
io.open(dest, 'w', encoding='utf-8').write('\n'.join(out))
print(f'\nbuild/prototype.html  {os.path.getsize(dest)/1024/1024:.2f}MB')
