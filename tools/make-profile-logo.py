#!/usr/bin/env python3
"""복만당 — 프로필 이미지 생성  →  brand/

정식 로고는 워드마크 오른쪽 아래에 ® 가 붙은 형태입니다.
현재 사이트의 logo-black.png 에는 ® 가 없어, 여기서 합성해 붙입니다.

⚠️ 이것은 재현본입니다. 발주처 '로고' 폴더의 원본 .ai 에 ® 포함 버전이 있으면
   그것을 쓰는 편이 정확합니다 (자간·크기·위치가 원안과 다를 수 있음).

  python tools/make-profile-logo.py
"""
import sys, os
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC  = os.path.join(ROOT, 'assets', 'img', 'logo-black.png')
OUT  = os.path.join(ROOT, 'brand')
INK  = (20, 18, 15)          # --ink
BG   = (255, 255, 255)

S        = 2000              # 작업 해상도 (마지막에 축소해 계단현상 제거)
LOGO_W   = 0.575             # 캔버스 대비 워드마크 폭 — 원형 크롭 안전영역 안에 들어옵니다
R_RATIO  = 0.135             # ® 크기 (워드마크 높이 대비)
R_GAP    = 0.012             # 워드마크 오른쪽 여백
R_DROP   = 0.055             # 아래로 내리는 정도

def build(transparent=False):
    canvas = Image.new('RGBA', (S, S), (0,0,0,0) if transparent else BG+(255,))
    logo = Image.open(SRC).convert('RGBA')
    w = round(S * LOGO_W)
    h = round(logo.height * w / logo.width)
    logo = logo.resize((w, h), Image.LANCZOS)

    # ® 를 붙일 자리를 감안해 워드마크를 살짝 왼쪽·위로 둡니다
    rs   = round(h * R_RATIO)
    gap  = round(S * R_GAP)
    x = (S - w - rs - gap) // 2
    y = (S - h) // 2 - round(h * 0.03)
    canvas.alpha_composite(logo, (x, y))

    d = ImageDraw.Draw(canvas)
    f = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', rs)
    bb = d.textbbox((0, 0), '®', font=f)
    rx = x + w + gap
    ry = y + h - (bb[3] - bb[1]) - round(h * R_DROP) + round(h * 0.02)
    d.text((rx - bb[0], ry - bb[1]), '®', font=f, fill=INK + (255,))
    return canvas

for name, transparent, sizes in [
    ('bokmandang-profile',            False, [1000, 400]),
    ('bokmandang-logo-r-transparent', True,  [1000]),
]:
    art = build(transparent)
    for px in sizes:
        img = art.resize((px, px), Image.LANCZOS)
        out = os.path.join(OUT, f'{name}-{px}.png')
        if not transparent:
            img = img.convert('RGB')          # 프로필용은 알파 없이 (플랫폼 호환)
        img.save(out, 'PNG', optimize=True)
        print(f'{os.path.relpath(out, ROOT):48} {px}x{px}  {os.path.getsize(out)//1024}KB')
