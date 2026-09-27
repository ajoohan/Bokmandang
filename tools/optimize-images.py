#!/usr/bin/env python3
"""복만당 — 이미지 최적화 (JPEG → AVIF / WebP)

원본 JPEG는 그대로 두고 같은 폴더에 최신 포맷 사본을 만듭니다.
HTML의 <picture>가 AVIF → WebP → JPEG 순으로 골라 씁니다.

  python tools/optimize-images.py            # 없는 것만 생성
  python tools/optimize-images.py --force    # 전부 다시 생성

새 사진을 추가하면 이 스크립트를 한 번 돌리고,
index.html의 <picture> 블록에 같은 형태로 <source>를 추가하세요.
사이트 구동에는 필요 없는 일회성 도구입니다 (빌드 단계 아님).
"""
import sys
try: sys.stdout.reconfigure(encoding='utf-8')   # Windows 콘솔에서 한글 깨짐 방지
except Exception: pass
import sys, os, glob
from PIL import Image

SRC_DIR   = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img')
NARROW_W  = 800    # 이 폭의 축소본을 함께 생성 (모바일용)
WIDE_MIN  = 1100   # 원본이 이보다 넓을 때만 축소본을 만듦
THUMB_W   = 240    # 썸네일용 초소형본
THUMB_OF  = 'store-'   # 이 접두사로 시작하는 파일만 썸네일본 생성 (매장 갤러리)
Q_AVIF, Q_WEBP = 55, 78

# <picture> 로 고를 수 없는 자리 — 사본을 만들어 봐야 쓰이지 않고 배포 용량만 늡니다.
#   og-cover      : og:image 는 주소 하나뿐이고, 스크래퍼가 JPEG 를 기대합니다
#   menu-v*-poster: <video poster> 는 주소 하나만 받습니다
JPEG_ONLY = ('og-cover', 'menu-v1-poster', 'menu-v2-poster',
             'menu-v3-poster', 'menu-v4-poster')

force = '--force' in sys.argv
total_before = total_after = 0

def save(im, path, fmt):
    global total_after
    if fmt == 'AVIF':
        im.save(path, 'AVIF', quality=Q_AVIF)
    else:
        im.save(path, 'WEBP', quality=Q_WEBP, method=6)
    total_after += os.path.getsize(path)
    return os.path.getsize(path)

for src in sorted(glob.glob(os.path.join(SRC_DIR, '*.jpg'))):
    base, _ = os.path.splitext(src)
    name = os.path.basename(base)
    if name in JPEG_ONLY:
        print(f'{name:24} JPEG 만 씁니다 — 건너뜁니다')
        continue
    with Image.open(src) as im:
        im = im.convert('RGB')
        w, h = im.size
        jpg_size = os.path.getsize(src)
        total_before += jpg_size
        outs = [(im, '')]
        if w >= WIDE_MIN:
            nh = round(h * NARROW_W / w)
            outs.append((im.resize((NARROW_W, nh), Image.LANCZOS), f'-{NARROW_W}'))
        if name.startswith(THUMB_OF):
            th = round(h * THUMB_W / w)
            outs.append((im.resize((THUMB_W, th), Image.LANCZOS), f'-{THUMB_W}'))
        line = [f'{name:24} {w}x{h} jpg {jpg_size//1024:>4}KB']
        for image, suffix in outs:
            for ext, fmt in (('avif', 'AVIF'), ('webp', 'WEBP')):
                out = f'{base}{suffix}.{ext}'
                if os.path.exists(out) and not force:
                    total_after += os.path.getsize(out)
                    line.append(f'{suffix or "":>5}.{ext} skip')
                    continue
                line.append(f'{suffix or "":>5}.{ext} {save(image, out, fmt)//1024:>4}KB')
        print(' | '.join(line))

print(f'\nJPEG 원본 합계 {total_before//1024}KB → 생성본 합계 {total_after//1024}KB')
