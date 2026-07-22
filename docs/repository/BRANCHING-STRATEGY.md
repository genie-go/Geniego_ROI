# Branching Strategy

GeniegoROI Git Branch 전략

Version 1.0 | 2026-07-22 | CCIS Part002

---

## 1. Branch 구조

★ 이 저장소의 통합 트렁크는 `main` 이 아니라 **`master`** 다. 실측 근거는 §2.1 참조.

```text
master                             ← 통합 트렁크 · 유일한 배포 트리거
├── feat/{session}-{description}   ← 기능 개발
├── fix/{issue}-{description}      ← 버그 수정
├── hotfix/{description}           ← 긴급 수정
├── release/{version}              ← 릴리스 준비
└── chore/{description}            ← 유지보수

main                               ← 계보 단절된 레거시 라인 (§2.0)
```

---

## 2. Branch 역할

### 2.0 master 와 main (실측 기준 · 혼동 주의)

두 브랜치는 **공통 조상이 없다**. 같은 프로젝트의 두 시점이 아니라 서로 무관한 두 히스토리다.

| 브랜치 | 최신 커밋 | 역할 |
|--------|-----------|------|
| `master` | `ef0da53` (2026-07-09) | **통합 트렁크**. 작업 브랜치의 분기 기준이자 배포 트리거 |
| `origin/main` | `d25c389` (2026-03-27) | 정체된 레거시 라인. 작업 계보와 단절 |

검증 명령:
```bash
git merge-base master origin/main            # 출력 없음 = 공통 조상 없음
git merge-base feat/n236-... master          # ef0da53 = master 팁에서 분기됨
```

**미결 사항**: `main` 을 폐기할지, 재동기화할지는 아직 결정되지 않았다.
결정 전까지 `main` 을 대상으로 PR 을 열지 않는다 (머지 시 전 파일 충돌).

### 2.1 master

- 통합 트렁크 — 항상 배포 가능한 상태 유지
- Protected Branch (직접 push 금지)
- PR Review 필수 (최소 1인)
- Force Push 금지
- **push 시 `.github/workflows/deploy.yml` 의 `deploy` job 이 발동한다**
  (`deploy.yml:80` — `if: github.ref == 'refs/heads/master' && github.event_name == 'push'`).
  단, SCP/SSH 단계는 `HAS_SSH_SECRETS` 미등록으로 skip 되므로 **push 만으로 운영에 반영되지 않는다.**
  실제 반영은 수동 `pscp`/`plink` 절차다 — push 를 배포 완료로 읽지 말 것.
- `verify` job(정적 게이트)은 모든 브랜치·PR 에서 실행되며 배포하지 않는다

### 2.2 feat/{session}-{description}

**목적**: 신규 기능 개발

**명명 규칙**:
```
feat/n{session_number}-{kebab-case-description}
```

**예시**:
```
feat/n236-admin-growth-automation
feat/n290-roi-dashboard-redesign
feat/n291-export-excel-feature
```

**규칙**:
- `master` 에서 분기 (`main` 아님 — §2.0)
- 완료 시 `master` 로 PR
- 리뷰 후 Squash Merge 또는 Merge Commit

### 2.3 fix/{issue}-{description}

**목적**: 버그 수정

**명명 규칙**:
```
fix/{issue-number}-{kebab-case-description}
```

**예시**:
```
fix/bug-001-console-log-leak
fix/bug-042-i18n-missing-key
```

### 2.4 hotfix/{description}

**목적**: 운영 환경 긴급 수정

**명명 규칙**:
```
hotfix/{kebab-case-description}
```

**규칙**:
- `master` 에서 직접 분기
- 수정 완료 즉시 `master` 에 PR
- 필요 시 빠른 리뷰 (1인 이상)

### 2.5 release/{version}

**목적**: 릴리스 준비 (QA, 버전 업)

**예시**:
```
release/v408.0.0
release/v408.1.0
```

---

## 3. Commit Message 규칙

Conventional Commit 형식을 권장한다.

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Type**:
- `feat` — 신규 기능
- `fix` — 버그 수정
- `docs` — 문서 변경
- `style` — 코드 스타일 (기능 변경 없음)
- `refactor` — 리팩터링
- `test` — 테스트 추가/수정
- `chore` — 빌드/도구 변경
- `perf` — 성능 개선
- `ci` — CI/CD 변경
- `revert` — 이전 커밋 되돌리기

**예시**:
```
feat(dashboard): add ROI trend chart with 12-month view

fix(i18n): resolve missing ko.js key for order status

docs(ccis): add CCIS-PART002 repository architecture

chore(.gitignore): add tgz build artifact patterns
```

---

## 4. Pull Request 규칙

### PR 제목 형식
```
[{type}] {description} (#{session_number})
```

**예시**:
```
[feat] Admin Growth Automation Dashboard (#236)
[fix] i18n Korean key missing (#042)
[docs] CCIS Part002 Repository Architecture
```

### PR 본문 필수 항목
```markdown
## 변경 요약
{무엇을 왜 변경했는지}

## 변경 파일
- {파일 경로}: {변경 내용}

## 테스트
- [ ] Frontend build 통과
- [ ] Backend PHP lint 통과
- [ ] 기존 기능 동작 확인

## 스크린샷 (UI 변경 시)
```

### 리뷰 기준
- 최소 1인 Approve 필수
- CODEOWNERS에 정의된 파일은 해당 Owner Review 필수
- CI 통과 필수

---

## 5. Tag 전략

```
v{major}.{minor}.{patch}
```

**예시**:
```
v407.0.0
v408.0.0
v408.1.0
```

- Release 후 `master` 에 Tag 생성
- Tag는 Signed Commit 권장
- Tag는 삭제하지 않음

---

## 6. 현재 운영 Branch 현황 (2026-07-22 `git branch -a` 실측)

| Branch | 최신 커밋 | 목적 | 상태 |
|--------|-----------|------|------|
| `master` | `ef0da53` (2026-07-09) | 통합 트렁크 · 배포 트리거 | Active |
| `feat/n236-admin-growth-automation` | `e3b25e5` (2026-07-22) | 현재 개발 중 (master 에서 분기) | Active |
| `fix/n235-p0-tenant-isolation-ingest-idempotency` | `736d2bb` | 이전 작업 | 잔존 |
| `origin/main` | `d25c389` (2026-03-27) | 계보 단절 레거시 | **처리 미결 (§2.0)** |
| `origin/yyocool` | — | 출처 불명 | **처리 미결** |

---

*CCIS Part002 — Branching Strategy*
