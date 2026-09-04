#!/usr/bin/env python3
"""복만당 — 발주처가 보낸 메뉴 사진을 사이트 이미지로 들여옵니다.

  python tools/import-menu-photos.py [원본폴더]     기본값: ../메뉴사진

원본(3~6MB, 3992px)을 그대로 올리면 14장에 57MB 라 페이지를 쓸 수 없습니다.
자르거나 보정하지 않고 크기만 줄여 넣습니다 — 구도와 색은 원본 그대로입니다.

메뉴 한 개당 사진 두 장(예: 곰탕.jpg / 곰탕1.jpg)이 오면
  · 첫 장  → menu-<키>.jpg        카드에 보이는 대표 사진
  · 둘째 장 → menu-<키>-2.jpg      사진을 크게 볼 때 함께 넘겨 보는 두 번째 컷

넣은 뒤에는 tools/optimize-images.py 를 돌려 AVIF/WebP 사본을 만드세요.
사이트 구동에 필요한 도구가 아닙니다(빌드 단계 아님).
"""
import sys, os, io
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
DST  = os.path.join(HERE, '..', 'assets', 'img')
SRC  = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', '메뉴사진')

MAX_W   = 1600    # 사진을 크게 볼 때(라이트박스) 기준. 카드는 이보다 훨씬 작게 씁니다.
QUALITY = 84

# 원본 파일명 → 사이트에서 쓰는 이름. main.js 의 IMG 맵과 짝을 맞춥니다.
MAP = {
  '곰탕':      'menu-gomtang',
  '특곰탕':    'menu-teuk',
  '우설곰탕':  'menu-useol',
  '수육곰탕':  'menu-sugyuk',
  '한우수육':  'menu-sugyuk-plate',
  '이북식만두':'menu-mandu',
  '공기밥':    'menu-gonggibap',
  '밀키트':    'kit-package',
}

if not os.path.isdir(SRC):
    sys.exit(f'원본 폴더를 찾을 수 없습니다: {SRC}')

done, missing = [], []
for korean, base in MAP.items():
    for suffix, out_suffix in (('', ''), ('1', '-2')):
        src = os.path.join(SRC, f'{korean}{suffix}.jpg')
        if not os.path.exists(src):
            missing.append(os.path.basename(src)); continue
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')   # 촬영 방향 반영
            w, h = im.size
            if max(w, h) > MAX_W:
                r = MAX_W / max(w, h)
                im = im.resize((round(w * r), round(h * r)), Image.LANCZOS)
            out = os.path.join(DST, f'{base}{out_suffix}.jpg')
            im.save(out, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
        before = os.path.getsize(src) // 1024
        after  = os.path.getsize(out) // 1024
        done.append(f'  {korean}{suffix}.jpg  {w}x{h} {before:>5}KB  →  '
                    f'{os.path.basename(out)}  {im.size[0]}x{im.size[1]} {after:>4}KB')

print('\n'.join(done))
if missing:
    print('\n찾지 못한 파일:', ', '.join(missing))
print(f'\n{len(done)}장 완료. 이어서 tools/optimize-images.py --force 를 돌리세요.')
