#!/usr/bin/env python3
"""복만당 — 프로필 이미지 생성  →  brand/

네이버 플레이스·인스타그램·카카오 채널처럼 **정사각형 프로필**을 요구하는
곳에 올릴 로고 이미지를 만듭니다. 사이트에서 쓰는 파일이 아닙니다.

  bokmandang-profile-1000.png          흰 배경 (프로필 사진용)
  bokmandang-profile-400.png           흰 배경, 작은 판
  bokmandang-logo-r-transparent-1000.png   배경 없음 (인쇄·문서 삽입용)

원본은 `assets/img/logo-black.png` — 발주처 정식 로고이고 ® 가 이미 글자에
붙어 있습니다. 2026-09-05 에 이 파일을 정식본으로 갈아 끼우기 전에는 ® 없는
옛 워드마크였고, 그래서 이 스크립트가 Arial 의 ® 를 오른쪽에 합성했습니다.
지금 그대로 돌리면 ® 가 두 개가 됩니다 — 그 합성을 걷어냈습니다.

프로필은 대부분 **원형으로 잘립니다.** LOGO_W 를 키우면 네 귀퉁이가 잘려
나가므로, 바꾸더라도 원 안에 들어오는지 눈으로 확인하세요.

  python tools/make-profile-logo.py
"""
import sys, os
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC  = os.path.join(ROOT, 'assets', 'img', 'logo-black.png')
OUT  = os.path.join(ROOT, 'brand')
BG   = (255, 255, 255)

S      = 2000     # 작업 해상도 (마지막에 축소해 계단현상 제거)
LOGO_W = 0.62     # 캔버스 대비 로고 폭. 오른쪽 ® 를 포함한 값입니다 —
                  # 한글 글자만 보면 예전(0.575)과 같은 크기로 보입니다.

def build(transparent=False):
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0) if transparent else BG + (255,))
    logo = Image.open(SRC).convert('RGBA')
    w = round(S * LOGO_W)
    h = round(logo.height * w / logo.width)
    logo = logo.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(logo, ((S - w) // 2, (S - h) // 2))
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
