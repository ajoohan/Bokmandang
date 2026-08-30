#!/usr/bin/env python3
"""복만당 — OG(공유 카드) 이미지 생성  →  assets/img/og-cover.jpg  (1200x630)

배경: band-broth.jpg 크롭 + 먹색 그라디언트 · 중앙: 로고 워드마크 · 하단: 골드 헤어라인 + 라틴 캡션
한글은 로고 이미지로 표현하므로 별도 한글 폰트가 필요 없습니다.

  python tools/make-og-image.py
"""
import sys
try: sys.stdout.reconfigure(encoding='utf-8')   # Windows 콘솔에서 한글 깨짐 방지
except Exception: pass
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

IMG = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img')
W, H = 1200, 630
GOLD = (198, 166, 103)

bg = Image.open(os.path.join(IMG, 'band-broth.jpg')).convert('RGB')
# 1200x630 비율로 센터 크롭
sc = max(W / bg.width, H / bg.height)
bg = bg.resize((round(bg.width * sc), round(bg.height * sc)), Image.LANCZOS)
bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2,
              (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))

# 배경을 살짝 흐리고 먹색으로 덮어 글자를 띄웁니다 (인용 배너와 같은 톤)
bg = bg.filter(ImageFilter.GaussianBlur(2.2))
veil = Image.new('RGB', (W, H), (16, 15, 12))
bg = Image.blend(bg, veil, 0.60)
# 중앙이 더 진한 세로 그라디언트 — 워드마크 대비 확보
grad = Image.new('L', (1, H))
for y in range(H):
    t = abs(y - H * 0.52) / (H * 0.52)          # 중앙 0 → 가장자리 1
    grad.putpixel((0, y), int(150 * (1 - t ** 1.7)))
bg = Image.composite(Image.new('RGB', (W, H), (16, 15, 12)), bg,
                     grad.resize((W, H)))

# 워드마크
logo = Image.open(os.path.join(IMG, 'logo-white.png')).convert('RGBA')
lw = 330
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
bg.paste(logo, ((W - lw) // 2, 168), logo)

d = ImageDraw.Draw(bg)
serif  = ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', 27)
serif_s= ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', 17)

def center(text, y, font, fill, track=0):
    w = sum(d.textlength(c, font=font) + track for c in text) - track
    x = (W - w) / 2
    for c in text:
        d.text((x, y), c, font=font, fill=fill)
        x += d.textlength(c, font=font) + track

center('1++ HANWOO GOMTANG', 392, serif, (250, 248, 244), track=5)
d.line([(W / 2 - 26, 448), (W / 2 + 26, 448)], fill=GOLD, width=1)
center('BOKMANDANG  ·  SEOUL', 472, serif_s, GOLD, track=4)

out = os.path.join(IMG, 'og-cover.jpg')
bg.save(out, 'JPEG', quality=86, optimize=True, progressive=True)
print(f'{out}  {os.path.getsize(out)//1024}KB  {W}x{H}')
