# GeniegoROI Claude Code Implementation Specification

# CCIS Part002 — Repository & Monorepo Architecture

Version 1.0 | 2026-07-22

---

## 1. 작업 목적

CCIS Part002는 GeniegoROI 전체 소스코드, 계약 문서, 데이터베이스 자산, 인프라 코드, 테스트, 운영 스크립트 및 아키텍처 문서를 하나의 통제된 Repository와 일관된 디렉터리 구조로 관리하기 위한 기준을 정의한다.

---

## 2. 현재 Repository 분석 결과

### 2.1 Git Repository

| 항목 | 상태 |
|------|------|
| Repository Root | `e:\project\GeniegoROI` |
| Current Branch | `feat/n236-admin-growth-automation` |
| 중첩 Git Repository | **없음** (확인 완료) |
| Working Tree 변경 | 3개 파일 modified |

### 2.2 식별된 모듈

| 모듈 | 경로 | 기술 스택 |
|------|------|-----------|
| Frontend Web App | `frontend/` | React 18.3 + Vite 5.4.21 + Capacitor 6 (★§2.4 빌드 정본 주의) |
| Backend API | `backend/` | PHP 8.1 + Slim 4 + MySQL |
| Infrastructure | `infra/` | Docker, AWS, Azure |
| Documentation | `docs/` | Markdown (ADR, CCIS, Architecture 등) |
| Tools | `tools/` | JSON, Config |
| GitHub CI/CD | `.github/workflows/` | deploy.yml, security-scan.yml |
| Git Hooks | `.githooks/` | pre-commit |

### 2.3 현재 Root 구조 (실제)

```text
GeniegoROI/
├── backend/           ← PHP Slim 4 API (genie/roi-enterprise-core)
│   ├── src/           ← PHP Source (routes.php, Db.php, RoiService.php 등)
│   ├── migrations/    ← SQL 마이그레이션 (날짜-차수 명명 방식)
│   ├── public/        ← Web Root
│   ├── vendor/        ← Composer Dependencies (gitignored)
│   └── composer.json
├── frontend/          ← React 18 SPA (genie-roi-v407-ui)
│   ├── src/           ← React Source
│   ├── public/        ← Static Assets
│   ├── android/       ← Capacitor Android
│   ├── ios/           ← Capacitor iOS
│   ├── scripts/       ← 빌드/배포 스크립트
│   └── package.json
├── infra/             ← Infrastructure (Docker, AWS, Azure)
│   ├── aws/
│   ├── azure/
│   ├── media/
│   └── docker-compose.yml
├── docs/              ← 전체 문서 (CCIS, ADR, Architecture 등)
│   ├── ccis/          ← CCIS 구현 명세
│   ├── architecture/  ← ADR 221개
│   └── ... (24개 하위 디렉터리)
├── tools/             ← 프로젝트 도구
├── .github/           ← CI/CD (deploy.yml, security-scan.yml)
├── .githooks/         ← pre-commit hook
├── .gitignore         ← 441라인 (매우 상세)
├── .gitattributes     ← eol 설정
├── docker-compose.yml ← Root Level Compose
└── CONTRIBUTING.md
```

### 2.4 Vite 이중 구성 — 빌드 정본 (2026-07-22 실측)

저장소에 `vite` 와 `vite.config.js` 가 **두 벌** 있다. 실제 산출물을 만드는 쪽은 `frontend/` 다.

| | 루트 (`./`) | **frontend/ (정본)** |
|---|---|---|
| vite 버전 | 7.3.1 (설치됨) | **5.4.21 (설치됨)** |
| config | `vite.config.js` (111줄, `root: frontend`) | **`frontend/vite.config.js` (63줄)** |
| manualChunks | vendor 분리 제거 이력 반영본 | **vendor-react / vendor-charts / vendor-locales / shared-context** |
| 실제 호출자 | **없음** | `deploy.ps1:30` (`Set-Location frontend` → `npm.cmd run build`)<br>`deploy.yml:61,97` (`cd frontend` → `npm run build`) |

- 운영 배포·CI **양쪽 모두** `frontend/` 로 진입해 빌드하므로 **루트 `vite.config.js` 와 루트 vite 7 은 빌드 경로에서 사용되지 않는다.**
- 루트 `package.json` 의 `"build": "vite build"` 를 저장소 루트에서 직접 실행하면
  **다른 vite 버전 + 다른 청크 전략**으로 빌드된다 → 운영 산출물과 불일치. 사용 금지.
- ★ `CLAUDE.md` 는 "Vite 7 / 루트에서 `vite build` 가 정상 · `cd frontend` 를 넣지 말 것" 으로 기술하고 있으나
  위 실측과 **상충**한다(CLAUDE.md 가 구식). 정정 여부는 별도 승인 사항.

### 2.5 CCIS Part002 표준 대비 Gap

| CCIS 표준 | 현재 경로 | 처리 방침 |
|-----------|-----------|-----------|
| `apps/` | `frontend/` | **이동 금지** — 운영 중, Migration Plan 문서화 |
| `services/` | `backend/` | **이동 금지** — 운영 중, Migration Plan 문서화 |
| `infrastructure/` | `infra/` | **이동 금지** — 명칭 차이만, 매핑 문서화 |
| `database/migrations/` | `backend/migrations/` | **이동 금지** — 서비스 소유 방식 채택 |
| `CODEOWNERS` | `CODEOWNERS` | 생성 완료 (★GitHub 팀 슬러그 미실재 — 실계정 치환 필요) |
| `.editorconfig` | `.editorconfig` | 생성 완료 |
| `Makefile` | `Makefile` | 생성 완료 (`make` 미설치 환경에서는 실행 검증 미수행) |
| `docs/repository/` | `docs/repository/` | 생성 완료 (6개 문서) |
| `scripts/validation/` | `scripts/validation/` | 생성 완료 (7개 `.sh` — 실행 검증 완료) |
| `contracts/` | **없음** | 현재 API Contract 없음 — 필요 시 생성 |

---

## 3. 적용 구조 (실제 운영 기준)

### 3.1 현행 디렉터리 역할 매핑

```text
CCIS 표준          GeniegoROI 실제         비고
─────────────────────────────────────────────────────
apps/web        →  frontend/              React+Vite SPA
apps/mobile     →  frontend/android/      Capacitor Android
                   frontend/ios/          Capacitor iOS
services/       →  backend/               PHP Slim 4 API
infrastructure/ →  infra/                 Docker/AWS/Azure IaC
deployment/     →  .github/workflows/     CI/CD Pipeline
                   infra/aws/             AWS Deployment
                   infra/azure/           Azure Deployment
database/       →  backend/migrations/    SQL Migrations (서비스 소유)
contracts/      →  (미사용)               API Contract 없음
tests/          →  backend/src/           내부 테스트
docs/           →  docs/                  문서 (충분)
scripts/        →  frontend/scripts/      프론트엔드 스크립트
                   scripts/validation/    (신규) 검증 스크립트
```

### 3.2 Dependency Direction (적용 기준)

```text
frontend/ (App Layer)
    ↓ REST API
backend/ (Service Layer)
    ↓
backend/migrations/ (Database Layer)
```

- `frontend/`는 `backend/`에 REST API로만 통신
- `backend/`는 직접 `frontend/` 소스에 의존하지 않음
- 공통 Library 없음 (현재 단일 App/Service 구조)

---

## 4. 모듈 Ownership

### 4.1 Frontend Module

```yaml
module: frontend
path: frontend/
businessOwner: Product Team
technicalOwner: Frontend Lead
runtime: Browser (SPA) + Mobile (Capacitor)
buildCommand: npm run build
devCommand: npm run dev
testCommand: npm run lint
deployTarget: CDN / App Store / Play Store
```

### 4.2 Backend Module

```yaml
module: backend
path: backend/
businessOwner: Engineering Team
technicalOwner: Backend Lead
runtime: PHP 8.1 + Slim 4
databaseOwner: backend
buildCommand: composer install --no-dev --optimize-autoloader
testCommand: php -l src/routes.php
deployTarget: Application Server
```

### 4.3 Infrastructure

```yaml
module: infra
path: infra/
businessOwner: DevOps Team
technicalOwner: Platform Lead
deploymentOwner: infra
```

---

## 5. Database 관리 방식

GeniegoROI는 **서비스 소유 방식**을 채택한다.

```text
backend/migrations/{날짜}_{차수}_{번호}_{설명}.sql
```

예시:
```text
backend/migrations/
├── 20260526_165_001_create_orderhub_claims.sql
├── 20260526_168_001_create_pm_projects.sql
└── 20260527_172_002_coupon_tables.sql
```

**규칙**:
- 각 Migration은 backend 모듈이 소유
- 다른 모듈의 Table을 직접 변경하지 않음
- Migration 파일은 한 번 실행 후 수정하지 않음
- Rollback이 필요하면 새 Migration 파일 추가

---

## 6. Branch 전략

자세한 내용은 [BRANCHING-STRATEGY.md](../repository/BRANCHING-STRATEGY.md) 참조.

요약:
- `master` — **통합 트렁크**. Protected, 유일한 배포 트리거(`deploy.yml:80`)
- `main` — `master` 와 **공통 조상 없음**(2026-03-27 정체). 계보 단절 레거시 · 처리 미결
- `feat/{session}-{description}` — 기능 개발 (`master` 에서 분기)
- `fix/{issue}-{description}` — 버그 수정
- `hotfix/{description}` — 긴급 수정

---

## 7. Generated Code 정책

자세한 내용은 [GENERATED-CODE-POLICY.md](../repository/GENERATED-CODE-POLICY.md) 참조.

현재 Generated Code 항목:
- `backend/vendor/` — Composer로 생성 (gitignored)
- `frontend/node_modules/` — npm으로 생성 (gitignored)
- `frontend/dist/` — Vite Build 산출물 (gitignored)
- `frontend/android/app/src/main/assets/public/` — Capacitor Sync (gitignored)

---

## 8. Security 기준

- `.env` 파일 → gitignored (`.env.example`만 추적)
- Private Key, PEM 파일 → gitignored
- `backend/vendor/` → gitignored
- Pre-commit Hook → `.githooks/pre-commit` (Secret Scan 포함)
- CI Secret → GitHub Actions Secrets 사용

---

## 9. 대규모 Migration Plan (미실행)

현재 구조가 안정적으로 운영 중이므로 **즉시 이동하지 않는다**.
필요 시 별도 ADR 승인 후 아래 계획을 참조한다.

| 단계 | 작업 | 영향 범위 |
|------|------|-----------|
| 1 | `frontend/` → `apps/web/` | package.json scripts, nginx.conf, Dockerfile, CI/CD |
| 2 | `backend/` → `services/roi-service/` | composer.json, deploy 스크립트, CI/CD |
| 3 | `infra/` → `infrastructure/` | .github/workflows, docker-compose |
| 4 | `backend/migrations/` 유지 | 서비스 소유 방식 계속 |

**Rollback**: 각 단계는 별도 PR로 분리. Branch 보호로 Revert 가능.

---

## 10. Completion Criteria (검증 결과)

- [x] Git Repository Root 확인 완료
- [x] 현재 Repository 구조 분석 완료
- [x] App 및 Service 목록 식별
- [x] Shared Library 목록 식별 (없음)
- [x] Contract 위치 식별 (없음)
- [x] Database Migration 위치 식별 (`backend/migrations/`)
- [x] Infrastructure 및 Deployment 위치 식별 (`infra/`, `.github/`)
- [x] Test 및 Documentation 위치 식별
- [x] 중첩 Repository 없음 확인
- [x] Repository Structure 문서화
- [x] Module Ownership 문서화
- [x] Branching Strategy 문서화
- [x] Contribution Guide 작성
- [x] Generated Code Policy 정의
- [x] Dependency Boundary 정의
- [x] CODEOWNERS 생성
- [x] .gitignore 보안 항목 검토
- [x] Repository Layout 검증 구현
- [x] Module Boundary 검증 구현
- [x] Generated File 검증 구현
- [x] Large File 검증 구현
- [x] 기존 Build 구조 훼손 없음
- [x] 기존 CI/CD 구조 훼손 없음

---

*다음 Part: CCIS Part003 — Development Environment*
