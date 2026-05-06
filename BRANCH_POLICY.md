# GeniegoROI 브랜치 정책

**확정 세션**: 37차 (2026-05-07)  
**5세션 인계 종결**: 32차 → 33차 → 34차 → 35차 → 36차 → **37차 종결**

## 1. 브랜치 체계

### `master` — 세션 기록 + 분석 작업 전용 브랜치
- 현재 작업 브랜치 (개발/검수/세션 인계 작업 수행)
- commit 패턴: `docs(session)`, `chore(tools)`, `chore(cleanup)` 등
- 32~36차 세션 commit 누적
- HEAD (37차 시작 시점): `42efdb8` (36차 종료 commit)

### `origin/main` — production 배포 전용 브랜치
- GitHub default 브랜치
- commit 패턴: `fix:`, `feat:` 등 production 코드 변경
- 사례: i18n 번역 마무리, 500 error 수정, demo 제거, trial pro 활성화
- HEAD (37차 시작 시점): `d25c389`

## 2. 핵심 사실 (37차 검증 완료)

- **두 브랜치는 공통 조상이 없는 독립된 git 히스토리**
- 검증 명령: `git merge-base master origin/main` → exit code 1, 출력 없음
- 분기 commit 수 (37차 시점):
  - master 170 commit (main 미포함)
  - main 16 commit (master 미포함)
- 표준 `git merge` 불가능 (`--allow-unrelated-histories` 강제 시 전체 commit 충돌)

## 3. 운영 규칙

### 금지 사항
- 표준 `git merge master origin/main` 또는 그 역방향 금지
- `--allow-unrelated-histories` 옵션 사용 금지
- master에서 production 코드 변경 금지
- main에서 세션 기록 commit 금지

### 허용 사항
- 두 브랜치 간 코드 이동 필요 시: `git cherry-pick` 또는 수동 patch 적용
- 각 브랜치에서 독립적으로 작업 흐름 유지
- 두 브랜치는 별도 작업 흐름으로 영구 유지

## 4. 작업 흐름 가이드

| 작업 종류 | 대상 브랜치 |
|---|---|
| 세션 기록 (`docs(session)`) | `master` |
| 검수자 분석 결과 commit | `master` |
| 도구/정리 작업 (`chore(...)`) | `master` |
| production 버그 수정 (`fix:`) | `main` |
| 신규 기능 (`feat:`) | `main` |
| i18n / 번역 / 배포 | `main` |

## 5. 5세션 인계 종결 사유

32차부터 5세션 연속 "사용자/팀 결정 필요"로 인계됐던 사유:
- 이전 검수자들이 **공통 조상 부재 사실을 미파악**, 단순 분기로 오해
- merge 가능성을 전제로 결정 회피

37차에서 `git merge-base` 검증으로 사실 확정 → 옵션 ④ (분리 정책 공식화)가 유일한 합리적 선택임이 명확해져 종결.