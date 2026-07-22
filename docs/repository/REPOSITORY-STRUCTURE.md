# Repository Structure

GeniegoROI 프로젝트 Repository 구조 공식 문서

Version 1.0 | 2026-07-22 | CCIS Part002

---

## 1. Repository 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | GeniegoROI |
| Git Root | `e:\project\GeniegoROI` |
| 기본 Branch | `master` (통합 트렁크 · 배포 트리거) — `main` 은 계보 단절 레거시, [BRANCHING-STRATEGY.md](BRANCHING-STRATEGY.md) §2.0 |
| 구조 유형 | 단일 Repository (Monolith → 점진적 Microservice 전환 계획) |
| 중첩 Repository | 없음 |

---

## 2. 실제 Directory 구조

```text
GeniegoROI/                         ← Git Repository Root
│
├── frontend/                       ← [APP] React 18 + Vite SPA + Capacitor Mobile
│   ├── src/                        ← React 소스코드
│   │   ├── components/             ← UI 컴포넌트
│   │   ├── pages/                  ← 페이지 컴포넌트
│   │   ├── i18n/                   ← 다국어 (locales/*.js 15개 언어)
│   │   ├── context/                ← React Context
│   │   └── hooks/                  ← Custom Hooks
│   ├── public/                     ← Static Assets
│   ├── android/                    ← Capacitor Android
│   ├── ios/                        ← Capacitor iOS
│   ├── scripts/                    ← 프론트엔드 빌드/배포 스크립트
│   ├── dist/                       ← 빌드 산출물 [gitignored]
│   ├── node_modules/               ← npm 의존성 [gitignored]
│   ├── package.json                ← npm 설정 (genie-roi-v407-ui)
│   ├── vite.config.js              ← Vite 설정
│   ├── capacitor.config.json       ← Capacitor 설정
│   ├── nginx.conf                  ← Nginx 설정
│   └── Dockerfile                  ← 프론트엔드 컨테이너
│
├── backend/                        ← [SERVICE] PHP 8.1 + Slim 4 API
│   ├── src/                        ← PHP 소스코드
│   │   ├── routes.php              ← API 라우트 (전체 API 정의)
│   │   ├── Db.php                  ← Database 레이어
│   │   ├── RoiService.php          ← ROI 계산 서비스
│   │   ├── Handlers/               ← 요청 핸들러
│   │   └── Utils/                  ← 유틸리티
│   ├── migrations/                 ← SQL 마이그레이션 파일
│   ├── public/                     ← PHP 웹 루트 (index.php)
│   ├── data/                       ← 런타임 데이터
│   ├── vendor/                     ← Composer 의존성 [gitignored]
│   ├── composer.json               ← PHP 의존성 (genie/roi-enterprise-core)
│   └── README.md                   ← Backend 서비스 문서
│
├── infra/                          ← [INFRASTRUCTURE] IaC + Container
│   ├── aws/                        ← AWS 인프라 (CloudFront, EC2 등)
│   ├── azure/                      ← Azure 인프라 (Bicep, Key Vault 등)
│   ├── media/                      ← 미디어 서버 설정
│   ├── Dockerfile.api              ← API 컨테이너
│   ├── Dockerfile.worker           ← Worker 컨테이너
│   └── docker-compose.yml          ← 로컬 infra Compose
│
├── docs/                           ← [DOCUMENTATION] 전체 문서
│   ├── ccis/                       ← CCIS 구현 명세 (Part001~)
│   ├── architecture/               ← ADR (221개 Architecture Decision Record)
│   ├── repository/                 ← [신규] Repository 구조 문서
│   ├── security/                   ← 보안 문서
│   ├── implementation/             ← 구현 원칙 문서
│   └── ... (docs/ 하위 디렉터리 총 25개)
│
├── tools/                          ← [TOOLS] 프로젝트 도구
│
├── scripts/                        ← [SCRIPTS] 자동화 스크립트
│   └── validation/                 ← [신규] 검증 스크립트
│
├── .github/                        ← [CI/CD] GitHub Actions
│   ├── workflows/
│   │   ├── deploy.yml              ← 배포 파이프라인
│   │   └── security-scan.yml       ← 보안 스캔
│   └── dependabot.yml
│
├── .githooks/                      ← [GIT HOOKS] Local Hook
│   ├── pre-commit                  ← 커밋 전 검증
│   └── baseline.json               ← Hook 기준 설정
│
├── CODEOWNERS                      ← [신규] 코드 소유자 정의
├── Makefile                        ← [신규] Root 빌드 명령
├── .editorconfig                   ← [신규] 에디터 설정
├── .gitignore                      ← Git 무시 파일 (441라인)
├── .gitattributes                  ← Git 속성 (eol 설정)
├── docker-compose.yml              ← Root Level Docker Compose
├── CONTRIBUTING.md                 ← 기여 가이드
└── CLAUDE.md                       ← Claude Code 작업 규칙
```

---

## 3. CCIS 표준 매핑

GeniegoROI는 실제 운영 경로를 CCIS Part002 표준 경로에 매핑한다.

| CCIS 표준 경로 | GeniegoROI 실제 경로 | 비고 |
|---------------|---------------------|------|
| `apps/web/` | `frontend/` | React SPA |
| `apps/mobile/` | `frontend/android/`, `frontend/ios/` | Capacitor |
| `services/roi-service/` | `backend/` | PHP Slim 4 |
| `infrastructure/` | `infra/` | 명칭 차이 |
| `deployment/` | `.github/workflows/`, `infra/aws/`, `infra/azure/` | 분산 |
| `database/migrations/` | `backend/migrations/` | 서비스 소유 방식 |
| `docs/` | `docs/` | 일치 |
| `scripts/validation/` | `scripts/validation/` | 신규 생성 |

> **이동 금지**: 기존 경로(`frontend/`, `backend/`, `infra/`)는 안정 운영 중이므로 임의 이동하지 않는다.
> 대규모 구조 변경은 별도 ADR 승인 후 진행한다.

---

## 4. 파일 생성 위치 규칙

Claude Code가 파일을 생성할 때 다음 위치 기준을 따른다.

| 파일 유형 | 생성 위치 |
|-----------|-----------|
| React 컴포넌트 | `frontend/src/components/` |
| React 페이지 | `frontend/src/pages/` |
| React Hook | `frontend/src/hooks/` |
| 다국어 파일 | `frontend/src/i18n/locales/` |
| PHP API 라우트 | `backend/src/routes.php` |
| PHP 서비스 | `backend/src/` |
| SQL Migration | `backend/migrations/` |
| 배포 설정 | `infra/` 또는 `.github/workflows/` |
| CCIS 문서 | `docs/ccis/` |
| Architecture 문서 | `docs/architecture/` |
| Repository 문서 | `docs/repository/` |
| 검증 스크립트 | `scripts/validation/` |

---

## 5. 금지 사항

- Root에 업무 소스코드 생성 금지
- Root에 빌드 산출물 `.tgz`, `.zip`, `.tar.gz` 커밋 금지 (gitignored)
- Root에 임시 파일 `_*.log`, `_*.txt` 추적 금지 (gitignored)
- 서비스 내부에 다른 서비스 소스 참조 금지
- `.env.*` 파일에 실제 비밀 저장 금지 (`.env.example`만 추적)
- `backend/vendor/` 수동 수정 금지
- `frontend/node_modules/` 수동 수정 금지
- `frontend/dist/` 직접 편집 금지

---

## 6. 관련 문서

- [MODULE-OWNERSHIP.md](MODULE-OWNERSHIP.md) — 모듈 소유자 정의
- [BRANCHING-STRATEGY.md](BRANCHING-STRATEGY.md) — Branch 전략
- [CONTRIBUTION-GUIDE.md](CONTRIBUTION-GUIDE.md) — 기여 방법
- [GENERATED-CODE-POLICY.md](GENERATED-CODE-POLICY.md) — 생성 코드 정책
- [DEPENDENCY-BOUNDARIES.md](DEPENDENCY-BOUNDARIES.md) — 의존성 경계

---

*CCIS Part002 — Repository & Monorepo Architecture*
