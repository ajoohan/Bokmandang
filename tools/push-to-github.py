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

  python tools/push-to-github.py
"""
import subprocess, sys, os
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

PREFIX = 'bokmandang-web'
REMOTE, BRANCH = 'origin', 'main'

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
sys.exit(r.returncode)
