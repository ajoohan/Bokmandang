#!/usr/bin/env python3
"""복만당 — bokmandang-web 폴더를 GitHub 저장소 루트로 밀어 넣기

왜 이 스크립트가 필요한가
  로컬 저장소는 이 폴더의 '상위'(D:\bokmandang)이고, GitHub 저장소는 이 폴더의
  '내용물'이 루트입니다. 그래서 평범한 git push 로는 안 올라갑니다.
  git subtree push 는 원격에 병합 커밋이 한 번이라도 생기면 non-fast-forward 로
  거부됩니다. 그래서 매번 다음 순서로 밉니다.

    1) subtree split 으로 이 폴더만 루트로 끌어올린 커밋을 만들고
    2) 그 트리를 그대로 둔 채 원격 tip 을 부모로 얹은 병합 커밋을 만들어
    3) 일반 push (fast-forward) 로 내보냅니다

  force push 를 쓰지 않으므로 원격 이력이 사라지지 않습니다.

밀고 나서 사이트까지 확인합니다
  Vercel 의 GitHub 연결이 여러 번 조용히 풀렸습니다(2026-09-03 · 09-06 ·
  09-17 · 09-20). 그럴 때 푸시는 성공하고 GitHub 에도 올라가는데 배포만
  'Blocked' 로 막힙니다. 아무 신호가 없어서, 09-17 것은 사흘 동안 묻힌 채
  개인정보처리방침이 3주 전 화면을 내보내고 있었습니다.
  그래서 푸시 뒤 사이트의 캐시 버전이 실제로 바뀌는지 지켜보고,
  안 바뀌면 무엇을 해야 하는지 함께 알립니다.

  python tools/push-to-github.py
  python tools/push-to-github.py --no-verify    # 확인 없이 밀기만
"""
import subprocess, sys, os, re, time, urllib.request, urllib.error
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

PREFIX = 'bokmandang-web'
REMOTE, BRANCH = 'origin', 'main'

SITE = 'https://bokmandang.co.kr/'
WAIT_SEC = 150          # 평소 20초 안에 올라옵니다. 넉넉히 2분 반.
POLL_SEC = 10
VERIFY = '--no-verify' not in sys.argv

def git(*a, **kw):
    r = subprocess.run(['git', *a], capture_output=True, text=True,
                       encoding='utf-8', errors='replace', cwd=TOP, **kw)
    if r.returncode and not kw.get('ok_fail'):
        sys.exit(f'실패: git {" ".join(a)}\n{r.stderr.strip()}')
    return r.stdout.strip()

TOP = subprocess.run(['git', 'rev-parse', '--show-toplevel'],
                     capture_output=True, text=True).stdout.strip()
if not TOP:
    sys.exit('git 저장소 안에서 실행하세요.')

dirty = git('status', '--porcelain')
if dirty:
    sys.exit('커밋되지 않은 변경이 있습니다. 먼저 커밋하세요:\n' + dirty)

author = git('log', '-1', '--format=%an <%ae>')
print(f'커밋 작성자: {author}')
if 'noreply.github.com' not in author:
    print('  ⚠️ Vercel Hobby 는 프로젝트 소유자가 아닌 작성자의 커밋을 배포하지 않습니다.')
    print('     git config user.email 을 확인하세요.')

print('1) 원격 최신 상태 가져오기')
git('fetch', REMOTE, BRANCH)
remote_tip = git('rev-parse', f'{REMOTE}/{BRANCH}')

print(f'2) {PREFIX} 를 루트로 분리')
split = git('subtree', 'split', f'--prefix={PREFIX}')

if split == remote_tip:
    print('   원격과 동일합니다. 보낼 것이 없습니다.'); sys.exit(0)

# 원격이 이미 이 트리를 담고 있으면 그냥 fast-forward
tree = git('rev-parse', f'{split}^{{tree}}')
print('3) 원격 tip 을 부모로 얹어 병합 커밋 생성')
msg = ('사이트 폴더 변경 반영\n\n'
       'bokmandang-web 을 저장소 루트로 옮겨 담습니다 '
       '(tools/push-to-github.py).')
merged = subprocess.run(
    ['git', 'commit-tree', tree, '-p', split, '-p', remote_tip, '-m', msg],
    capture_output=True, text=True, encoding='utf-8', cwd=TOP).stdout.strip()

print('4) push')
r = subprocess.run(['git', 'push', REMOTE, f'{merged}:{BRANCH}'],
                   capture_output=True, text=True, encoding='utf-8',
                   errors='replace', cwd=TOP)
print((r.stdout + r.stderr).strip())
if r.returncode:
    sys.exit(r.returncode)


# ── 5) 사이트에 실제로 올라갔는지 확인 ──────────────────────────────
VER = re.compile(r'\?v=(\d{8}[a-z])')

def live_version():
    """사이트가 지금 내주는 캐시 버전. 못 읽으면 None."""
    try:
        req = urllib.request.Request(
            SITE + '?deploycheck=' + str(int(time.time())),
            headers={'Cache-Control': 'no-cache', 'User-Agent': 'bokmandang-deploy-check'})
        with urllib.request.urlopen(req, timeout=15) as f:
            m = VER.search(f.read(60000).decode('utf-8', 'replace'))
            return m.group(1) if m else None
    except Exception:
        return None

def warn_blocked():
    print('')
    print('  ' + '!' * 58)
    print('  배포가 사이트에 반영되지 않았습니다.')
    print('')
    print('  푸시는 됐고 GitHub 에도 올라갔습니다 — 막힌 곳은 Vercel 입니다.')
    print('')
    print('  2026-09-26 이전에 다섯 번 막혔던 원인은 이제 없습니다.')
    print('  그때는 저장소가 비공개라서, Vercel 계정의 GitHub 연결이 풀리면')
    print('  Hobby 요금제가 커밋 작성자를 못 알아보고 Blocked 처리했습니다.')
    print('  저장소를 공개로 돌린 뒤로는 작성자를 아예 따지지 않습니다.')
    print('')
    print('  그래도 막혔다면 새로운 원인입니다. 이 순서로 보세요.')
    print('')
    print('  1. vercel.com/bokmandang/bokmandang/deployments')
    print('     맨 위 항목의 상태와, 눌러서 나오는 이유를 그대로 읽습니다.')
    print('  2. Blocked 라면 settings/git 에서 Disconnect 한 뒤')
    print('     GitHub → ajoohan/Bokmandang 을 다시 잇습니다.')
    print('     ("Upgrade to Pro" 는 누를 필요 없습니다)')
    print('  3. Error 라면 함수 개수를 의심하세요 — Hobby 는 한 배포에 12개까지입니다.')
    print('     새 관리자 API 는 api/_admin/ 에 두고 라우터에만 등록합니다.')
    print('  4. 막힌 배포는 Hobby 에서 Redeploy 가 막혀 있습니다.')
    print('     tools/bump-cache.py 로 버전을 올려 새 커밋을 한 번 더 미세요.')
    print('  ' + '!' * 58)

if not VERIFY:
    print('\n5) 배포 확인은 건너뜁니다 (--no-verify)')
    sys.exit(0)

local_path = os.path.join(TOP, PREFIX, 'index.html')
want = None
try:
    with open(local_path, encoding='utf-8') as f:
        m = VER.search(f.read())
        want = m.group(1) if m else None
except OSError:
    pass

if not want:
    print('\n5) index.html 에서 캐시 버전을 못 찾아 확인을 건너뜁니다.')
    sys.exit(0)

print(f'\n5) 사이트 반영 확인 — {want} 가 나올 때까지 최대 {WAIT_SEC}초')
first = live_version()
if first is None:
    print('   사이트를 읽지 못했습니다(네트워크?). 확인을 건너뜁니다 —')
    print('   배포가 실패했다는 뜻은 아닙니다. 잠시 뒤 직접 열어 보세요.')
    sys.exit(0)
if first == want:
    print(f'   이미 {want} 입니다. 캐시 버전을 안 올렸다면 이번 변경이')
    print('   올라갔는지는 이 방법으로 알 수 없습니다 —')
    print('   tools/bump-cache.py 로 버전을 올리고 미는 습관을 권합니다.')
    sys.exit(0)

deadline = time.time() + WAIT_SEC
while time.time() < deadline:
    time.sleep(POLL_SEC)
    now = live_version()
    left = int(deadline - time.time())
    print(f'   {now or "읽기 실패"}   (남은 {max(left,0)}초)')
    if now == want:
        print(f'\n   ✅ 반영됐습니다 — {want}')
        sys.exit(0)

warn_blocked()
sys.exit(1)
