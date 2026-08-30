#!/usr/bin/env python3
"""복만당 — 검색엔진 색인 차단 / 허용 토글

  python tools/set-indexing.py block   # 차단 (오픈 전 기본값)
  python tools/set-indexing.py allow   # 허용 (정식 오픈 시)

robots.txt 와 각 HTML 의 <meta name="robots"> 를 함께 바꿉니다.
한쪽만 바꾸면 색인이 새거나 막히므로 반드시 이 스크립트로 토글하세요.

admin.html 과 /api/ 는 어느 모드에서도 항상 차단합니다.
"""
import sys, io, os, re
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.join(os.path.dirname(__file__), '..')
# admin.html 은 늘 noindex 이므로 여기 넣지 않습니다 (파일에 하드코딩)
PAGES = {'index.html': 'index,follow,max-image-preview:large',
         'privacy.html': 'index,follow'}
BLOCK = 'noindex,nofollow'
MARK  = '<!-- 오픈 전 색인 차단 — tools/set-indexing.py allow 로 해제 -->'
DEFAULT_SITEMAP = 'Sitemap: https://bokmandang.example.com/sitemap.xml'

mode = (sys.argv[1] if len(sys.argv) > 1 else '').lower()
if mode not in ('block', 'allow'):
    print(__doc__); sys.exit(1)

for page, live in PAGES.items():
    p = os.path.join(ROOT, page)
    s = io.open(p, encoding='utf-8').read()
    want = BLOCK if mode == 'block' else live
    s, n = re.subn(r'<meta name="robots" content="[^"]*">',
                   f'<meta name="robots" content="{want}">', s)
    assert n == 1, f'{page}: <meta name="robots"> 를 찾지 못했습니다'
    s = s.replace(MARK + '\n', '')
    if mode == 'block':
        s = s.replace(f'<meta name="robots" content="{want}">',
                      MARK + f'\n<meta name="robots" content="{want}">', 1)
    io.open(p, 'w', encoding='utf-8').write(s)
    print(f'  {page:14} robots meta → {want}')

# robots.txt 는 통째로 다시 씁니다.
# 빈 줄이 User-agent 그룹을 끊으므로 Disallow 들은 붙어 있어야 합니다.
p = os.path.join(ROOT, 'robots.txt')
prev = io.open(p, encoding='utf-8').read() if os.path.exists(p) else ''
m = re.search(r'^Sitemap:.*$', prev, re.M)

out = ['# 복만당 — robots.txt']
if mode == 'block':
    out += ['# ⚠️ 오픈 전 색인 차단 상태입니다. 정식 오픈 시:',
            '#    python tools/set-indexing.py allow']
out += ['# Sitemap 주소는 배포 도메인 확정 후: python tools/set-site-url.py https://도메인',
        '', 'User-agent: *',
        'Disallow: /' if mode == 'block' else 'Allow: /',
        'Disallow: /admin.html',     # 관리자 화면은 상시 차단
        'Disallow: /api/',
        '', m.group(0) if m else DEFAULT_SITEMAP, '']
io.open(p, 'w', encoding='utf-8').write('\n'.join(out))
print(f'  robots.txt     → {"Disallow" if mode == "block" else "Allow"}: /  (admin·api 는 상시 차단)')
print(f'\n색인 {"차단" if mode == "block" else "허용"} 적용 완료. 배포해야 반영됩니다.')
