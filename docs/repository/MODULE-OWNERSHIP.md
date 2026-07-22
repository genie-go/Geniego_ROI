# Module Ownership

GeniegoROI 모듈별 소유자 정의

Version 1.0 | 2026-07-22 | CCIS Part002

---

## 1. 소유권 원칙

- 각 모듈은 하나의 명확한 Owner를 가진다
- Owner는 해당 모듈의 Source, Database, API, Event를 책임진다
- 다른 모듈의 소유 자산을 직접 수정하지 않는다
- 모듈 경계를 넘는 변경은 Owner 간 협의 후 진행한다

---

## 2. 모듈 소유권 목록

### 2.1 Frontend Module

```yaml
module: frontend
path: frontend/
description: React 18 + Vite SPA + Capacitor Mobile App
version: "407.0.0"
package: genie-roi-v407-ui

businessOwner: Product Team
technicalOwner: Frontend Lead
maintainers:
  - Frontend Team

runtime:
  - Browser (SPA)
  - Android (Capacitor)
  - iOS (Capacitor)

buildCommand: "cd frontend && npm run build"
devCommand: "cd frontend && npm run dev"
lintCommand: "cd frontend && npm run lint"
mobileAndroid: "cd frontend && npm run cap:android"
mobileIOS: "cd frontend && npm run cap:ios"

dependencies:
  - backend (REST API via HTTP)

ownedAssets:
  - frontend/src/
  - frontend/public/
  - frontend/android/
  - frontend/ios/
  - frontend/scripts/
  - frontend/package.json
  - frontend/vite.config.js
  - frontend/capacitor.config.json
  - frontend/nginx.conf
  - frontend/Dockerfile

supportChannel: "#frontend"
```

### 2.2 Backend Module

```yaml
module: backend
path: backend/
description: PHP 8.1 + Slim 4 REST API (roi-enterprise-core)
package: genie/roi-enterprise-core

businessOwner: Engineering Team
technicalOwner: Backend Lead
maintainers:
  - Backend Team

runtime:
  - PHP 8.1
  - Slim 4 Framework
  - MySQL
  - SQLite (local dev)

buildCommand: "cd backend && composer install --no-dev --optimize-autoloader"
lintCommand: "cd backend && php -l src/routes.php"
deployTarget: Application Server (SSH)

databaseOwner: backend
migrations: backend/migrations/

ownedAssets:
  - backend/src/
  - backend/migrations/
  - backend/public/
  - backend/composer.json
  - backend/.env.example

apiOwner: backend
apiLocation: backend/src/routes.php

dependencies:
  - MySQL Database
  - External APIs (Naver SMS, Twilio 등)

supportChannel: "#backend"
```

### 2.3 Infrastructure Module

```yaml
module: infra
path: infra/
description: Infrastructure as Code (Docker, AWS, Azure)

businessOwner: Engineering Team
technicalOwner: Platform/DevOps Lead
maintainers:
  - DevOps Team

deploymentOwner: infra

ownedAssets:
  - infra/aws/
  - infra/azure/
  - infra/media/
  - infra/Dockerfile.api
  - infra/Dockerfile.worker
  - infra/docker-compose.yml
  - docker-compose.yml (root)

supportChannel: "#infrastructure"
```

### 2.4 CI/CD Module

```yaml
module: cicd
path: .github/workflows/
description: GitHub Actions CI/CD Pipeline

technicalOwner: Platform Lead
maintainers:
  - DevOps Team

ownedAssets:
  - .github/workflows/deploy.yml
  - .github/workflows/security-scan.yml
  - .github/dependabot.yml
  - .githooks/

supportChannel: "#devops"
```

### 2.5 Documentation Module

```yaml
module: docs
path: docs/
description: 전체 프로젝트 문서 (CCIS, ADR, Architecture)

businessOwner: Architecture Team
technicalOwner: Solution Architect

ownedAssets:
  - docs/ccis/           ← CCIS 구현 명세
  - docs/architecture/   ← ADR 221개
  - docs/repository/     ← Repository 구조 문서
  - docs/security/       ← 보안 문서
  - docs/implementation/ ← 구현 원칙

supportChannel: "#architecture"
```

---

## 3. 모듈 간 통신 규칙

```text
frontend/  ──REST API──►  backend/
    │                        │
    │                        ▼
    │                    MySQL DB
    │                    SQLite (dev)
    │
    ▼
External Services (CDN, App Store)
```

**금지 사항**:
- `frontend/` 소스가 `backend/` 소스를 직접 import하지 않는다
- `backend/` 소스가 `frontend/` 소스를 직접 참조하지 않는다
- 서비스 간 직접 파일시스템 공유하지 않는다

---

## 4. Ownership 변경 절차

1. 변경 대상 모듈의 현재 Owner에게 사전 통보
2. 변경 사유와 범위를 ADR로 문서화
3. 리뷰 후 CODEOWNERS 파일 업데이트
4. 관련 팀에 공지

---

*CCIS Part002 — Module Ownership*
