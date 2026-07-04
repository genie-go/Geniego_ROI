# ArchitectureRegistry — 아키텍처 레지스트리 (포인터)

> **정본(SSOT)**: 여기서 중복 보관하지 않고 아래를 가리킨다.
> - 도메인 구현 아키텍처 정본: **`docs/IMPLEMENTATION_STATUS.md`** (10+3 도메인)
> - 서브시스템 아키텍처: `docs/ADMIN_GROWTH_AUTOMATION_ARCHITECTURE.md`·`docs/TEAM_PERMISSION_ARCHITECTURE.md`·`AI_PROFIT_OS_ARCHITECTURE.md`(루트)
> - 인프라: `docs/ARCH_AWS.md`·`ARCH_AZURE.md`·`DEPLOY_*.md`
> - 상위 개요: `CLAUDE.md`(monorepo 구조·backend Slim/routes·frontend Vite/chunk)

## 핵심 구조 요약
- 모노레포: `frontend/`(React18/Vite·122페이지 lazy) + `backend/`(PHP8.1/Slim4·PSR-4 `Genie\`·MySQL+SQLite폴백).
- 백엔드 라우팅: `routes.php` $custom(정의)+$register(등록) 2단계·버전접두 v377~v431·/api alias(basePath strip).
- 인증: index.php 인라인 미들웨어(RBAC viewer<connector<analyst<admin+scope·X-Tenant override·public bypass).
- 데모/운영: DB 물리분리(geniego_roi / geniego_roi_demo)·IS_DEMO 3중 격리.

## 갱신 규칙
구조적 변경(신규 도메인·라우팅규약·인증·격리) 시 정본 문서 갱신 + 여기 요약 반영.
