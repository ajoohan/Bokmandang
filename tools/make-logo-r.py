#!/usr/bin/env python3
"""복만당 — ® 포함 정식 로고 자산 생성

워드마크(logo-black/white.png)에 ® 를 합성해 아래를 만듭니다.

  assets/img/logo-black-r.png   ® 포함 (먹색)   — OG·인쇄 등 큰 자리용
  assets/img/logo-white-r.png   ® 포함 (아이보리)
  assets/img/logo-char-r.png    ® 만 (인트로 애니메이션 4번째 조각)

⚠️ 재현본입니다. 발주처 '로고' 폴더의 원본 .ai 에 ® 포함 버전이 있으면 그쪽이 정확합니다.
   ® 의 크기·위치는 아래 상수로 조정하세요.

  python tools/make-logo-r.py
"""
import sys, os
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
IMG  = os.path.join(ROOT, 'assets', 'img')
R_RATIO = 0.135     # ® 크기 (워드마크 높이 대비)
R_GAP   = 0.0209    # 워드마크 오른쪽 여백 (워드마크 폭 대비)
R_BASE  = 0.945     # ® 아랫변 위치 (워드마크 높이 대비)
SS      = 4         # 4배로 그린 뒤 축소 — 가장자리를 매끄럽게

def glyph(size, fill):
    """® 를 딱 맞게 렌더링한 RGBA 이미지"""
    f = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', size * SS)
    tmp = Image.new('RGBA', (size * SS * 2, size * SS * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    d.text((size * SS // 2, size * SS // 2), '®', font=f, fill=fill + (255,))
    return tmp.crop(tmp.split()[-1].getbbox())

def compose(src, fill, out):
    logo = Image.open(os.path.join(IMG, src)).convert('RGBA')
    w, h = logo.size
    g  = glyph(round(h * R_RATIO), fill)
    gs = (round(g.width / SS), round(g.height / SS))
    g  = g.resize(gs, Image.LANCZOS)
    gap = round(w * R_GAP)

    canvas = Image.new('RGBA', (w + gap + gs[0], h), (0, 0, 0, 0))
    canvas.alpha_composite(logo, (0, 0))
    canvas.alpha_composite(g, (w + gap, round(h * R_BASE) - gs[1]))
    canvas.save(os.path.join(IMG, out))
    print(f'{out:22} {canvas.size}  (® {gs[0]}x{gs[1]}, 여백 {gap})')
    return w, gap, gs

compose('logo-white.png', (250, 248, 244), 'logo-white-r.png')
w, gap, gs = compose('logo-black.png', (20, 18, 15), 'logo-black-r.png')

# 인트로 4번째 조각 — 다른 조각과 같은 419 높이 캔버스에 ® 만
h = Image.open(os.path.join(IMG, 'logo-black.png')).height
piece = Image.new('RGBA', (gs[0], h), (0, 0, 0, 0))
g = glyph(round(h * R_RATIO), (20, 18, 15)).resize(gs, Image.LANCZOS)
piece.alpha_composite(g, (0, round(h * R_BASE) - gs[1]))
piece.save(os.path.join(IMG, 'logo-char-r.png'))
print(f'{"logo-char-r.png":22} {piece.size}')

# index.html 인트로 조각 배치값
total = w + gap + gs[0]
widths = [225, 195, 244]
left = 0.0
print('\nindex.html 인트로 <img class="ch"> 스타일 —')
for i, cw in enumerate(widths, 1):
    print(f'  char-{i}: left:{left:.3f}%;width:{cw/total*100:.3f}%')
    left += cw / total * 100
print(f'  char-r: left:{(w+gap)/total*100:.3f}%;width:{gs[0]/total*100:.3f}%')
