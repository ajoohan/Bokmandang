#!/usr/bin/env python3
"""복만당 — 검색엔진 색인 차단 / 허용 토글

  python tools/set-indexing.py block   # 차단 (오픈 전 기본값)
  python tools/set-indexing.py allow   # 허용 (정식 오픈 시)

robots.txt 와 각 HTML 의 <meta name="robots"> 를 함께 바꿉니다.
둘 중 하나만 바꾸면 색인이 새어 나가므로 반드시 이 스크립트로 토글하세요.
"""
import sys, io, os, re
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT  = os.path.join(os.path.dirname(__file__), '..')
PAGES = {'index.html': 'index,follow,max-image-preview:large',
         'privacy.html': 'index,follow'}
BLOCK = 'noindex,nofollow'
MARK  = '<!-- 오픈 전 색인 차단 — tools/set-indexing.py allow 로 해제 -->'

mode = (sys.argv[1] if len(sys.argv) > 1 else '').lower()
if mode not in ('block', 'allow'):
    print(__doc__); sys.exit(1)

for page, live in PAGES.items():
    p = os.path.join(ROOT, page)
    s = io.open(p, encoding='utf-8').read()
    want = BLOCK if mode == 'block' else live
    new, n = re.subn(r'<meta name="robots" content="[^"]*">',
                     f'<meta name="robots" content="{want}">', s)
    assert n == 1, f'{page}: <meta name="robots"> 를 찾지 못했습니다'
    new = new.replace(MARK + '\n', '')
    if mode == 'block':
        new = new.replace(f'<meta name="robots" content="{want}">',
                          MARK + f'\n<meta name="robots" content="{want}">', 1)
    io.open(p, 'w', encoding='utf-8').write(new)
    print(f'  {page:14} robots meta → {want}')

p = os.path.join(ROOT, 'robots.txt')
s = io.open(p, encoding='utf-8').read()
s = re.sub(r'(?m)^(Allow|Disallow): /$',
           'Disallow: /' if mode == 'block' else 'Allow: /', s)
head = ('# ⚠️ 오픈 전 색인 차단 상태입니다. 정식 오픈 시:\n'
        '#    python tools/set-indexing.py allow\n'
        if mode == 'block' else '')
s = re.sub(r'(?s)^#.*?\n\n', '', s, count=1)   # 기존 안내 주석 제거
s = ('# 복만당 — robots.txt\n' + head +
     '# Sitemap 주소는 배포 도메인 확정 후: python tools/set-site-url.py https://도메인\n\n' + s)
io.open(p, 'w', encoding='utf-8').write(s)
print(f'  robots.txt     → {"Disallow" if mode=="block" else "Allow"}: /')
print(f'\n색인 {"차단" if mode=="block" else "허용"} 적용 완료. 배포해야 반영됩니다.')
