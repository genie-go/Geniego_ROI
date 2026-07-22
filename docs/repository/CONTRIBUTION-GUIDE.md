# Contribution Guide

GeniegoROI 기여 가이드

Version 1.0 | 2026-07-22 | CCIS Part002

> **기존 CONTRIBUTING.md와 관계**: 이 문서는 CCIS Part002 기준에 따른 Repository 관점의 기여 가이드이다.
> 코드 스타일, 상세 워크플로우는 루트의 [CONTRIBUTING.md](../../CONTRIBUTING.md)를 참조한다.

---

## 1. 시작 전 확인 사항

```bash
# 1. Git 상태 확인
git status --short
git branch --show-current

# 2. 최신 master 동기화
#    ★ origin/main 에 rebase 하지 말 것 — master 와 공통 조상이 없어 전 커밋이 충돌로 재생된다
#      (BRANCHING-STRATEGY.md §2.0).
git fetch origin
git rebase origin/master

# 3. 의존성 설치
cd frontend && npm install
cd backend && composer install
```

---

## 2. Branch 생성

```bash
# 기능 개발
git checkout -b feat/n{session}-{description}

# 버그 수정
git checkout -b fix/{issue}-{description}

# 긴급 수정
git checkout -b hotfix/{description}
```

상세 Branch 전략은 [BRANCHING-STRATEGY.md](BRANCHING-STRATEGY.md) 참조.

---

## 3. 파일 생성 위치 규칙

**반드시 지켜야 하는 위치 기준**:

| 작업 | 위치 |
|------|------|
| React 컴포넌트 추가 | `frontend/src/components/` |
| React 페이지 추가 | `frontend/src/pages/` |
| 다국어 키 추가 | `frontend/src/i18n/locales/{lang}.js` |
| PHP API 라우트 추가 | `backend/src/routes.php` |
| PHP 서비스 클래스 추가 | `backend/src/` |
| SQL Migration 추가 | `backend/migrations/` |
| 배포 설정 변경 | `infra/` 또는 `.github/workflows/` |
| 문서 추가 | `docs/` 하위 적절한 디렉터리 |
| 검증 스크립트 추가 | `scripts/validation/` |

**금지 위치**:
- Root에 업무 소스코드 생성 금지
- Root에 임시 파일/로그 커밋 금지
- `backend/vendor/` 직접 수정 금지
- `frontend/node_modules/` 직접 수정 금지

---

## 4. Database Migration 작성

```text
파일명: {YYYYMMDD}_{session}_{sequence}_{description}.sql
```

**예시**:
```sql
-- 20260727_291_001_create_export_logs.sql
CREATE TABLE `export_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tenant_id` INT UNSIGNED NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**규칙**:
- 파일명은 날짜_차수_순번_설명 형식
- 한 번 실행된 Migration 파일은 수정하지 않음
- Rollback이 필요하면 새 파일 추가
- 다른 서비스 Table을 변경하지 않음

---

## 5. Commit 전 검증

Pre-commit Hook이 자동으로 다음을 검사한다:
- 비밀 파일 패턴 탐지
- 대용량 파일 탐지
- 금지된 Root 파일 패턴

**수동 검증**:
```bash
# Frontend
cd frontend && npm run lint
cd frontend && npm run build

# Backend
cd backend && php -l src/routes.php

# Repository Layout 검증
bash scripts/validation/check-repository-layout.sh
bash scripts/validation/check-large-files.sh
```

---

## 6. Pull Request 제출

1. Branch push
   ```bash
   git push origin feat/n{session}-{description}
   ```

2. GitHub에서 PR 생성
3. PR Template 작성 (변경 요약, 테스트 결과)
4. CODEOWNERS에 해당하는 Owner에게 Review 요청
5. CI 통과 확인
6. 1인 이상 Approve 후 Merge

---

## 7. 금지 사항

- `.env`, `*.pem`, `*.key` 파일을 커밋하지 않는다
- `backend/vendor/`, `frontend/node_modules/`, `frontend/dist/`를 커밋하지 않는다
- `*.tgz`, `*.tar.gz`, `*.zip` 빌드 산출물을 Root에 커밋하지 않는다
- 임시 파일(`_build_*.log`, `SESSION_*.md` 등)을 추적 파일로 커밋하지 않는다
- Generated Code를 수동으로 수정하지 않는다
- Force Push를 `master` Branch에 사용하지 않는다

---

## 8. 도움말

- 기존 상세 워크플로우: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- Branch 전략: [BRANCHING-STRATEGY.md](BRANCHING-STRATEGY.md)
- 모듈 소유자: [MODULE-OWNERSHIP.md](MODULE-OWNERSHIP.md)
- Repository 구조: [REPOSITORY-STRUCTURE.md](REPOSITORY-STRUCTURE.md)

---

*CCIS Part002 — Contribution Guide*
