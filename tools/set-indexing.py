#!/usr/bin/env python3
"""복만당 — 검색엔진 색인 차단 / 허용 토글

  python tools/set-indexing.py block   # 검색 제외 (오픈 전 기본값)
  python tools/set-indexing.py allow   # 검색 허용 (정식 오픈 시)

⚠️ block 모드에서도 robots.txt 는 크롤링을 '허용'합니다. 일부러 그렇게 합니다.

   robots.txt 로 Disallow 하면 크롤러가 페이지를 아예 안 읽어서
   <meta name="robots" content="noindex"> 를 보지 못합니다. 그러면 오히려
   URL 만 검색에 노출되는 일이 생기고, 카카오톡·페이스북 링크 미리보기(OG)도
   같이 막힙니다.

   검색에서 확실히 빼는 올바른 방법은 "크롤링은 열어 두고 noindex 를 읽히는 것"
   입니다. block 모드가 하는 일이 그것입니다.

admin.html 과 /api/ 는 어느 모드에서도 robots.txt 로 차단합니다
(색인 대상이 아니라 애초에 긁힐 이유가 없는 경로라서).
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
    out += ['# ⚠️ 현재 검색 제외 상태입니다 (각 페이지의 meta robots=noindex).',
            '#    크롤링 자체는 허용해야 noindex 가 읽히고 링크 미리보기도 동작합니다.',
            '#    정식 오픈 시: python tools/set-indexing.py allow']
# 크롤링은 두 모드 모두 허용합니다 (위 docstring 참조).
# 검색 제외는 각 HTML 의 <meta name="robots"> 가 담당합니다.
out += ['# Sitemap 주소는 배포 도메인 확정 후: python tools/set-site-url.py https://도메인',
        '', 'User-agent: *',
        'Allow: /',
        'Disallow: /admin.html',     # 관리자 화면
        'Disallow: /api/',
        '', m.group(0) if m else DEFAULT_SITEMAP, '']
io.open(p, 'w', encoding='utf-8').write('\n'.join(out))
print(f'\n색인 {"차단" if mode == "block" else "허용"} 적용 완료. 배포해야 반영됩니다.')
