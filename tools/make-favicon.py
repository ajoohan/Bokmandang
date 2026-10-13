#!/usr/bin/env python3
"""복만당 — 브라우저 탭 아이콘 · 홈 화면 아이콘 생성

  favicon.ico                    16 · 32 · 48 을 한 파일에 (사이트 루트)
  assets/img/favicon-96.png      <link rel="icon"> 용
  assets/img/apple-touch-icon.png  180 — 아이폰 홈 화면

원본은 assets/img/logo-black.png(발주처 정식 로고)입니다. 2026-09-05 에 로고를
정식본으로 갈아 끼운 뒤에도 아이콘만 옛 워드마크로 남아 있었습니다.

® 는 지웁니다. 아이콘 크기에서는 한두 점짜리 얼룩으로만 보입니다.
로고 안에서 ® 는 글자와 떨어진 따로 덩어리라서, 오른쪽 아래 모서리에 있는
덩어리를 찾아 그것만 투명하게 만듭니다 — 글자(당)의 획은 건드리지 않습니다.

왜 96 인가: 구글 검색결과에 뜨는 아이콘은 48 의 배수 크기여야 합니다.
예전 64 는 조건에 맞지 않아 검색결과에서 기본 지구본으로 나올 수 있습니다.

  python tools/make-favicon.py
"""
import os, sys
from collections import deque
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
IMG  = os.path.join(ROOT, 'assets', 'img')
BG   = (250, 248, 244, 255)   # 사이트 바탕색과 같은 아이보리
FILL = 0.80                   # 정사각형 안에서 로고가 차지하는 폭
ALPHA_ON = 40                 # 이보다 진한 픽셀만 '획' 으로 봅니다

def components(alpha, W, H):
    """불투명 픽셀 덩어리마다 (픽셀 목록, bbox)"""
    px = alpha.load()
    label = [[-1] * W for _ in range(H)]
    out = []
    for y in range(H):
        for x in range(W):
            if px[x, y] > ALPHA_ON and label[y][x] < 0:
                n = len(out); q = deque([(x, y)]); label[y][x] = n
                pts = []; x0 = x1 = x; y0 = y1 = y
                while q:
                    cx, cy = q.popleft(); pts.append((cx, cy))
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)):
                        if 0 <= nx < W and 0 <= ny < H and label[ny][nx] < 0 and px[nx, ny] > ALPHA_ON:
                            label[ny][nx] = n; q.append((nx, ny))
                out.append((pts, (x0, y0, x1, y1)))
    return out, label

def without_r(logo):
    W, H = logo.size
    alpha = logo.split()[-1]
    comps, label = components(alpha, W, H)
    # 오른쪽 아래 모서리(가로 85% · 세로 80% 너머)에 통째로 들어 있는 덩어리 = ® 와 그 안의 점
    r_ids = {i for i, (_, (x0, y0, x1, y1)) in enumerate(comps)
             if x0 > W * 0.85 and y0 > H * 0.80}
    if not r_ids:
        raise SystemExit('® 를 찾지 못했습니다 — 로고 파일이 바뀌었으면 위치 조건을 확인하세요.')
    rx0 = min(comps[i][1][0] for i in r_ids); ry0 = min(comps[i][1][1] for i in r_ids)
    rx1 = max(comps[i][1][2] for i in r_ids); ry1 = max(comps[i][1][3] for i in r_ids)
    out = logo.copy(); op = out.load()
    # ® 영역(가장자리 번짐 2px 포함) 안에서, 다른 글자 획에 속하지 않은 픽셀만 지웁니다
    for y in range(max(0, ry0 - 2), min(H, ry1 + 3)):
        for x in range(max(0, rx0 - 2), min(W, rx1 + 3)):
            l = label[y][x]
            if l < 0 or l in r_ids:
                r, g, b, _ = op[x, y]; op[x, y] = (r, g, b, 0)
    print(f'® 제거: 덩어리 {len(r_ids)}개, 영역 {rx0},{ry0} ~ {rx1},{ry1}')
    return out.crop(out.split()[-1].getbbox())

def square(mark, px):
    S = px * 4                                  # 크게 그린 뒤 줄여 가장자리를 매끄럽게
    canvas = Image.new('RGBA', (S, S), BG)
    w = round(S * FILL); h = round(mark.height * w / mark.width)
    if h > S * FILL:                            # 세로가 더 길면 세로에 맞춥니다
        h = round(S * FILL); w = round(mark.width * h / mark.height)
    m = mark.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(m, ((S - w) // 2, (S - h) // 2))
    return canvas.resize((px, px), Image.LANCZOS)

mark = without_r(Image.open(os.path.join(IMG, 'logo-black.png')).convert('RGBA'))

for name, px in [('favicon-96.png', 96), ('apple-touch-icon.png', 180)]:
    p = os.path.join(IMG, name)
    square(mark, px).convert('RGB').save(p, 'PNG', optimize=True)
    print(f'assets/img/{name:22} {px}x{px}  {os.path.getsize(p)//1024}KB')

ico = os.path.join(ROOT, 'favicon.ico')
square(mark, 256).save(ico, format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print(f'favicon.ico                       16·32·48  {os.path.getsize(ico)//1024}KB')
