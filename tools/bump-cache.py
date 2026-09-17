#!/usr/bin/env python3
"""복만당 — 캐시 버전(?v=) 한 번에 올리기

  python tools/bump-cache.py              # 오늘 날짜로 다음 글자 (20260917a -> b)
  python tools/bump-cache.py 20260918a    # 값을 직접 지정

왜 도구로 두나
  HTML 세 개(index · admin · privacy)가 같은 ?v= 를 써야 하는데, 손으로
  바꾸다 privacy.html 을 13일 동안 빠뜨렸습니다. 그 페이지만 옛 스타일시트
  주소를 가리켜, 전에 방문한 사람은 낡은 화면을 계속 보게 됩니다.
  Vercel 이 이 주소를 1년 immutable 로 캐시하기 때문에 스스로 낫지 않습니다.

  파일을 새로 만들면 아래 FILES 에 더하세요.
"""
import io, os, re, sys, datetime

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILES = ['index.html', 'admin.html', 'privacy.html']
PAT = re.compile(r'\?v=(\d{8}[a-z])')

def current():
    """지금 쓰이는 버전 중 가장 큰 값"""
    seen = set()
    for f in FILES:
        p = os.path.join(ROOT, f)
        if os.path.exists(p):
            seen.update(PAT.findall(io.open(p, encoding='utf-8').read()))
    return max(seen) if seen else ''

def nxt(cur):
    today = datetime.date.today().strftime('%Y%m%d')
    if cur[:8] == today:
        ch = cur[8]
        if ch == 'z':
            raise SystemExit('오늘 26번을 다 썼습니다. 값을 직접 넣으세요.')
        # i · l · o 는 1·1·0 과 헷갈려 건너뜁니다
        nc = chr(ord(ch) + 1)
        while nc in 'ilo':
            nc = chr(ord(nc) + 1)
        return today + nc
    return today + 'a'

def main():
    cur = current()
    new = sys.argv[1] if len(sys.argv) > 1 else nxt(cur)
    if not re.fullmatch(r'\d{8}[a-z]', new):
        raise SystemExit('버전은 20260917a 꼴이어야 합니다: ' + new)
    print('지금 ' + (cur or '(없음)') + '  ->  ' + new)
    total = 0
    for f in FILES:
        p = os.path.join(ROOT, f)
        if not os.path.exists(p):
            print('  ' + f + ': 파일 없음 — 건너뜀')
            continue
        s = io.open(p, encoding='utf-8').read()
        found = set(PAT.findall(s))
        s2 = PAT.sub('?v=' + new, s)
        n = sum(len(PAT.findall(io.open(p, encoding='utf-8').read())) for _ in [0])
        io.open(p, 'w', encoding='utf-8', newline='').write(s2)
        total += n
        old = ', '.join(sorted(found)) if found else '(없음)'
        print('  ' + f + ': ' + str(n) + '곳   이전 ' + old)
    print('모두 ' + str(total) + '곳')

if __name__ == '__main__':
    main()
