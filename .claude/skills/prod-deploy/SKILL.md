---
name: prod-deploy
description: Ship the open PRs of this repo to production — decide a merge order, rehearse every
  merge together on a scratch worktree, verify that combined tree (jest, tsc, web export, migration
  dry-run), merge on GitHub in the same order, confirm the live p28.vercel.app bundle has the new
  code, then move the deployed Jira tickets to 완료. Use when asked to deploy/release to prod
  ("prod로 배포", "PR 머지해서 배포").
metadata:
  version: '1.0.0'
---

# prod-deploy

main은 Vercel 프로덕션(p28.vercel.app)에 바로 배포된다. 그래서 "PR을 하나씩 머지"가 곧
"프로덕션을 여러 번 바꾸는 것"이다. 이 스킬은 **머지하기 전에 전부 합친 상태를 먼저 검증**하고,
검증한 것과 똑같은 트리가 main이 되게 한다.

사용자가 배포를 명시적으로 요청했을 때만 쓴다. 되돌리기 어려운 바깥 행동이다.

도구: `gh`는 Windows에서 PATH에 없을 수 있으니 `"/c/Program Files/GitHub CLI/gh.exe"`.
Jira는 `scripts/jira.cjs`(규칙은 `.claude/rules/jira-ticket-automation.md`).

## 1. 무엇이 나가는지 파악

```bash
gh pr list --state open --json number,title,headRefName,baseRefName,mergeable
git fetch origin
for b in <각 head 브랜치>; do
  git rev-list --count origin/main..origin/$b     # ahead
  git diff --name-only origin/main...origin/$b    # 바뀐 파일
done
```

- **스택 PR**: base가 main이 아닌 PR(예: #6 → KAN-26)은 부모 다음에 머지한다.
- **마이그레이션**: `supabase/migrations/` 번호 순서대로 들어가게 브랜치 순서를 정한다.
- 브랜치 이름·PR 제목에서 Jira 키를 모아 둔다(7단계에서 씀). 키가 없는 PR도 있다.

## 2. 순서 정하기

작고 독립적인 것 먼저 → 같은 파일을 건드리는 것끼리 붙여서 → 스택은 부모→자식 →
넓은 UI 변경은 마지막. 이 순서가 그대로 리허설·실제 머지 순서다.

## 3. 리허설 (main은 아직 안 건드림)

```bash
git worktree add --detach ../p28-deploy origin/main
cd ../p28-deploy
for b in <순서>; do git merge --no-ff --no-edit origin/$b || { git diff --name-only --diff-filter=U; git merge --abort; break; }; done
```

충돌이 나면 여기서 멈추고, **그 PR 브랜치에서** main(또는 앞 브랜치)을 머지해 해결 → 검사 →
푸시한 뒤 리허설을 처음부터 다시 한다.

## 4. 합친 트리 검증

리허설 워크트리에서(의존성은 junction으로 공유):

```bash
cmd //c mklink //J node_modules "C:\Users\1124j\p28\node_modules"
mkdir -p .expo/types && cp ../p28/.expo/types/router.d.ts .expo/types/
npx jest --maxWorkers=2                      # Test Suites에 failed가 있으면 실패
npx tsc --noEmit                             # 기존 baseline 오류 외 신규 없음
npx expo export --platform web --clear --output-dir "$TEMP/deploy-export"
git rev-parse 'HEAD^{tree}'                  # 기록해 둔다
```

- 메모리가 부족하면(여유 2GB 미만) jest·tsc·export를 동시에 돌리지 말고 나눠서.
- **마이그레이션**은 링크된 원래 폴더(`supabase/.temp/project-ref`가 있는 곳)에서 확인한다 —
  워크트리는 링크가 없어 `LegacyProjectNotLinkedError`가 난다:
  `supabase db push --linked -p "$SUPABASE_DB_PASSWORD" --dry-run`
  보류 중인 것이 있으면 jira 규칙대로 적용(DROP이면 백업 먼저)한 뒤 진행.

## 5. GitHub에서 같은 순서로 머지

- `gh pr merge <N> --merge` (머지 커밋 — 리허설과 같은 트리가 나오게. squash 쓰지 않음).
- 각 PR은 `mergeable`이 `UNKNOWN`이 아닐 때까지 기다린 뒤, `MERGEABLE`이 아니거나 base가
  main이 아니면 **멈추고 보고**한다.
- **스택 PR은 머지 전에 base를 main으로 바꾼다**: `gh pr edit <N> --base main`.
  이 저장소는 `delete_branch_on_merge=false`라 부모가 머지돼도 base가 자동으로 안 바뀐다.
  그대로 머지하면 부모 브랜치로 들어가고 main엔 안 들어간다.

## 6. 배포 확인

```bash
git fetch origin
[ "$(git rev-parse 'origin/main^{tree}')" = "<4단계 트리>" ] && echo IDENTICAL
gh api repos/elponchis/p28/commits/<main head>/status   # Vercel=success 기다림
```

그다음 운영 번들을 직접 연다: `https://p28.vercel.app/` HTML에서
`/_expo/static/js/web/entry-*.js`를 찾아 받고, **이번에 들어간 코드에만 있는 문자열**
(새 i18n 키, 새 스타일 이름 등)이 있는지 grep. "배포 성공" 표시만으로 끝내지 않는다.

## 7. Jira

배포된 PR에 대응하는 티켓만, `검토 중` → 코멘트 → `완료`:

```bash
node scripts/jira.cjs comment <KEY> "prod에 배포했습니다. PR #N을 main에 머지(main <sha>)했고 운영 번들에서 확인 …"
node scripts/jira.cjs move <KEY> "완료"
```

- 코드 변경이 없는 티켓(사람이 직접 닫은 것, "이 기능 필요 없음" 등)은 옮기지 않는다.
- 이번 배포에 안 들어간 후속 단계가 있는 티켓은 코멘트에 남은 일을 적는다.

## 8. 정리와 보고

- 리허설 워크트리 제거: junction 먼저 `rmdir`(Windows), 그다음 `git worktree remove --force`.
  junction을 먼저 안 끊으면 원본 `node_modules`가 지워질 수 있다.
- 로컬 main 포인터만 앞당김(체크아웃은 건드리지 않음):
  `git merge-base --is-ancestor main origin/main && git branch -f main origin/main`
- 보고: 머지 순서와 머지 커밋, 트리 일치 여부, 검증 결과(테스트 수·tsc baseline·export·
  마이그레이션), 운영 번들 확인, 옮긴/안 옮긴 티켓과 이유.

## Windows 함정

- Git Bash에서 `git show origin/main:path`는 경로 변환으로 깨질 수 있다 → 워크트리 파일을
  직접 읽거나 `MSYS_NO_PATHCONV=1`.
- `git grep`의 `[id]` 같은 경로는 `'app/group/[[]id]/…'`로 이스케이프.
- 체크아웃은 CRLF(`core.autocrlf=true`)라 eslint가 `␍`를 지적할 수 있다 — 저장소에는 LF로
  들어가므로 `--rule 'prettier/prettier: [error, {endOfLine: auto}]'`로 검사.
