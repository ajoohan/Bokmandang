#!/usr/bin/env python3
"""Pretendard 가변 woff2 → OG 이미지용 정적 TTF (weight 600)

PIL 은 woff2 를 못 읽어서, 이미지에 한글 카피를 얹으려면 이 변환이 필요합니다.
사이트 자체와는 무관합니다 — 이미지 생성 도구일 뿐입니다.

  curl -s -o build/PretendardVariable.woff2 https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2
  python tools/make-kr-font.py
"""
import sys, os
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC  = os.path.join(ROOT, 'build', 'PretendardVariable.woff2')
DST  = os.path.join(ROOT, 'build', 'Pretendard-600.ttf')
if not os.path.exists(SRC):
    raise SystemExit(f'{SRC} 가 없습니다. 위 curl 명령을 먼저 실행하세요.')
f = TTFont(SRC); f.flavor = None
instancer.instantiateVariableFont(f, {'wght': 600}).save(DST)
print(f'{DST}  {os.path.getsize(DST)//1024}KB')
