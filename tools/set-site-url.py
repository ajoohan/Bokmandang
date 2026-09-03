#!/usr/bin/env python3
"""복만당 — 배포 도메인 일괄 치환

canonical · og:url · og:image · JSON-LD · sitemap.xml · robots.txt 에 흩어져 있는
placeholder 도메인을 실제 도메인으로 한 번에 바꿉니다.

  python tools/set-site-url.py https://www.bokmandang.co.kr

도메인이 또 바뀌면 현재 값을 --from 으로 넘기세요.
  python tools/set-site-url.py https://새도메인 --from https://옛도메인
"""
import sys
try: sys.stdout.reconfigure(encoding='utf-8')   # Windows 콘솔에서 한글 깨짐 방지
except Exception: pass
import sys, os, io, re

DEFAULT_OLD = 'https://bokmandang.co.kr'   # 현재 대표 도메인. 바꾸면 여기도 갱신하세요
FILES = ['index.html', 'privacy.html', 'sitemap.xml', 'robots.txt']
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

args = [a for a in sys.argv[1:] if not a.startswith('--')]
old = DEFAULT_OLD
if '--from' in sys.argv:
    old = sys.argv[sys.argv.index('--from') + 1].rstrip('/')

if not args:
    print(__doc__)
    sys.exit(1)

new = args[0].rstrip('/')
if not re.match(r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', new):
    sys.exit(f'주소 형식이 올바르지 않습니다: {new}\n예) https://www.bokmandang.co.kr')
if new.startswith('http://'):
    print('⚠️  http:// 입니다. 공유 카드와 검색 노출을 위해 https 를 권장합니다.')

total = 0
for f in FILES:
    p = os.path.join(ROOT, f)
    if not os.path.exists(p):
        print(f'   건너뜀 {f} (없음)')
        continue
    s = io.open(p, encoding='utf-8').read()
    n = s.count(old)
    if n:
        io.open(p, 'w', encoding='utf-8').write(s.replace(old, new))
        total += n
    print(f'{"바꿈" if n else "  변화없음"} {f:16} {n}곳')

print(f'\n{old} → {new}   총 {total}곳')
if total:
    print('index.html 상단의 "배포 도메인 미확정" 주석도 지워 주세요.')
