#!/usr/bin/env python3
"""복만당 — 이미지 주소에 버전 꼬리표를 붙입니다.

  python tools/bump-image-version.py 20260903b

왜 필요한가
  이미지는 vercel.json 에서 1년 immutable 로 캐시합니다(빠르니까).
  그래서 같은 이름으로 파일만 바꾸면 이미 방문했던 사람에게는
  최대 1년 동안 옛 사진이 그대로 보입니다.
  실제로 히어로·밀키트 사진을 바꿨는데 옛 사진이 계속 나온 적이 있습니다.

  css/js 처럼 주소 끝에 ?v=... 를 붙여 두면, 버전만 올리면 새로 받아 갑니다.

무엇을 고치나
  index.html · privacy.html · admin.html 의 assets/img/... 참조와
  assets/js/main.js 의 IMGVER 값.
  ※ og:image 는 건드리지 않습니다 — 카카오·페이스북이 주소로 캐시하므로
    바꾸면 링크 미리보기를 다시 긁어야 합니다.
"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

if len(sys.argv) < 2:
    sys.exit('사용법: python tools/bump-image-version.py <버전>   예) 20260903b')
VER = sys.argv[1].strip()
if not re.fullmatch(r'[0-9a-z]+', VER):
    sys.exit('버전은 영소문자와 숫자만 쓰세요.')

IMG = re.compile(r'(assets/img/[A-Za-z0-9._-]+\.(?:avif|webp|jpg|jpeg|png))(\?v=[0-9a-z]+)?')

def bump_html(path):
    p = os.path.join(ROOT, path)
    if not os.path.exists(p):
        return f'{path}: 없음'
    s = io.open(p, encoding='utf-8').read()
    lines = s.split('\n')
    n = 0
    for i, line in enumerate(lines):
        if 'og:image' in line or 'twitter:image' in line:
            continue                       # 링크 미리보기 캐시를 건드리지 않습니다
        new, k = IMG.subn(lambda m: f'{m.group(1)}?v={VER}', line)
        if k:
            lines[i] = new
            n += k
    io.open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    return f'{path}: {n}곳'

def bump_js():
    p = os.path.join(ROOT, 'assets/js/main.js')
    s = io.open(p, encoding='utf-8').read()
    new, k = re.subn(r"const IMGVER='[0-9a-z]*'", f"const IMGVER='{VER}'", s)
    if not k:
        return 'main.js: IMGVER 를 찾지 못했습니다 ⚠️'
    io.open(p, 'w', encoding='utf-8', newline='\n').write(new)
    return f'main.js: IMGVER={VER}'

for r in [bump_html('index.html'), bump_html('privacy.html'),
          bump_html('admin.html'), bump_js()]:
    print(' ', r)
print(f'\n이미지 버전을 {VER} 로 맞췄습니다. 사진을 바꿀 때마다 이 스크립트를 돌리세요.')
