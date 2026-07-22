# GeniegoROI Claude Code Implementation Specification

# CCIS Part003 — Development Environment

Version 1.0 | 2026-07-22

---

## 1. 작업 목적

GeniegoROI 를 개발·테스트·운영할 수 있는 표준 개발환경을 정의한다.
Part001 §4 원칙(기존 프로젝트 기술 최우선 유지·무단 교체 금지)에 따라,
**Reference Stack 을 설치하는 것이 아니라 실제 환경을 실측하고 그 위에서 보완**한다.

---

## 2. 환경 분석 결과 (2026-07-22 실측)

### 2.1 설치된 도구

| 구분 | 도구 | 실측 버전 | 판정 |
|------|------|-----------|------|
| 필수 | Node.js | **24.16.0** | 충족 — `engines: >=20` 만족. 정본은 `.nvmrc`(20) — §8-1 |
| 필수 | npm | 11.13.0 | 충족 |
| 필수 | PHP (CLI) | **8.1.34** (ZTS, VC2019 x64) | 충족 (`composer.json` 요구 >= 8.1) |
| 필수 | Git | 2.54.0.windows.1 | 충족 |
| 필수 | Bash | 5.3.9 (Git Bash) | 충족 |
| 권장 | GNU Make | **4.4.1** | 본 차수에 신규 설치(`winget install ezwinports.make`) |
| 권장 | Composer | **없음** | `backend/vendor` 존재로 실행은 가능 · 의존성 갱신 불가 |
| 선택 | Docker | **없음** | 배포 경로가 아니므로 무영향 |
| 선택 | Python | **없음** | `scripts/*.py` 6개만 실행 불가 |

### 2.2 PHP 확장

| 확장 | 상태 | 필요 근거 |
|------|------|-----------|
| `pdo` · `pdo_mysql` | 활성 | `Db.php:127` 주 DB |
| `pdo_sqlite` | 활성 | `Db.php:149` 폴백 DB |
| `mbstring` · `json` | 활성 | 한글 처리 · API 응답 |
| **`openssl`** | **비활성** | `openssl_encrypt/decrypt/sign/verify/pkey_*` 9종 사용 |
| **`curl`** | **비활성** | 외부 API 호출 **34개 파일** |

→ 빌드에는 무관하나, 로컬에서 암복호화·외부연동 경로는 Fatal 로 죽는다. 활성화 절차는 SETUP.md §2.

### 2.3 의존성 · 설정 상태

| 항목 | 상태 |
|------|------|
| `frontend/node_modules` | 설치됨 |
| `backend/vendor` | 설치됨 (21개 패키지) · `composer.lock` 존재 |
| 루트 `.env` | **없음** (템플릿 `.env.example` 은 존재) |
| `core.hooksPath` | `.githooks` 설정됨 |
| `.vscode/settings.json` | 추적됨 — 개인설정 아닌 공유 워크스페이스 설정(§7) |

### 2.4 부재 확인 (있다고 가정하면 안 되는 것)

`mysql` · `psql` · `redis-cli` · `kafka-topics.sh` · `kubectl` · `kind` · `minikube` — **전부 미설치**.
`pnpm` · `yarn` 도 없다(패키지 매니저는 npm 단일).

---

## 3. Reference Stack 대비 매핑

CCIS Part003 §4 의 권장 기준과 이 저장소의 실제는 다르다. **임의 교체하지 않는다.**

| Part003 §4 권장 | GeniegoROI 실제 | 처리 방침 |
|-----------------|-----------------|-----------|
| Java 21 · Gradle/Maven · Spring Boot · Flyway | **없음** — backend = PHP 8.1 + Slim 4 | 도입하지 않음. `check-java.sh` 도 **생성하지 않음**(없는 런타임의 검사기는 허구다) |
| Node LTS · **pnpm 우선** · TypeScript · Next.js | Node + **npm** · JavaScript(JSX) · Vite SPA | 패키지 매니저 교체는 잠금파일·CI·Docker 동시 변경이라 별도 ADR 사안. 현행 유지 |
| Python 3.12 · venv · Poetry/uv · FastAPI · pytest | Python 미설치 · `scripts/*.py` 6개(i18n 보조)만 존재 | 선택 항목으로 강등. 빌드/배포 무관 |
| **PostgreSQL** · pgAdmin | **MySQL** 주 + **SQLite** 폴백 | 현행 유지. compose 의 postgres 는 스텁이다(infra/README.md) |
| **Redis** | 사용하지 않음 | 도입하지 않음 |
| **Apache Kafka** · Schema Registry | 사용하지 않음 | 도입하지 않음 |
| Docker Desktop · Compose v2 | 미설치 · compose 구성은 비동작 스텁 | 선택 항목. 배포는 수동 `pscp`/`plink` |
| Kind / Minikube / k3d | 없음 | 도입하지 않음 |

### 3.1 §5 디렉터리 구조 매핑

Part003 §5 는 `development/` 하위에 bootstrap·docker·compose·kubernetes·scripts·templates·validation 을 두는 구조를 제시한다.
이 저장소는 Part002 에서 이미 `scripts/validation/` 을 정본으로 확정했으므로 **새 최상위 디렉터리를 만들지 않는다**(중복 금지).

| Part003 표준 | GeniegoROI 실제 |
|--------------|-----------------|
| `development/bootstrap/` | `scripts/bootstrap/` |
| `development/validation/` | `scripts/validation/` |
| `development/docker/`, `compose/`, `kubernetes/` | 해당 스택 미사용 — 생성하지 않음 |
| `.env.example` · `Makefile` · `README.md` | 루트에 존재(Part002 산출) |

---

## 4. 생성 및 수정 파일

### 신규

| 파일 | 내용 |
|------|------|
| `docs/ccis/CCIS-PART003-DEVELOPMENT-ENVIRONMENT.md` | 본 문서 |
| `docs/development/SETUP.md` | 환경 구축 절차 |
| `docs/development/IDE.md` | 에디터 규약 · 인코딩 함정 |
| `docs/development/TROUBLESHOOTING.md` | 증상→원인→조치 |
| `scripts/bootstrap/bootstrap.sh` | 초기화 (검증→의존성→.env 템플릿→hooks) |
| `scripts/bootstrap/bootstrap.ps1` | Windows 런처 (로직 없음 — Git Bash 로 `.sh` 실행) |

### 수정 (확장)

| 파일 | 변경 |
|------|------|
| `scripts/validation/check-environment.sh` | Part001 의 출력 전용 스크립트를 **실검증 로직**으로 확장 — 버전 비교·PHP 확장·필수/권장/선택 3단계·exit code·`--only` |
| `Makefile` | `bootstrap` 을 `bootstrap.sh` 위임으로 변경(중복 제거) · `validate-env` 타깃 신설 |

### 의도적으로 만들지 않은 것

| Part003 §6 요구 | 사유 |
|-----------------|------|
| `check-java.sh` | Java 런타임이 저장소에 없다. 만들면 그 자체가 허구 산출물 |
| `check-development-environment.sh` · `check-node.sh` · `check-python.sh` · `check-docker.sh` | 기존 `check-environment.sh` 확장 + `--only node\|php\|docker\|python` 으로 흡수. 동일 로직 5벌 유지는 표류를 부른다 |
| `.env.local.example` | 루트 `.env.example`(Part002) 와 `backend/.env.local.example`(기존) 이 이미 존재. 3번째 템플릿은 중복 |

---

## 5. 검증 결과

| 검증 | 명령 | 결과 |
|------|------|------|
| 개발환경 | `make validate-env` | **EXIT 0** — PASS 13 / WARN 7 / FAIL 0 |
| Bootstrap (Git Bash) | `bash scripts/bootstrap/bootstrap.sh --check` | **EXIT 0** |
| Bootstrap (PowerShell 런처) | `powershell -File scripts\bootstrap\bootstrap.ps1 -Check` | 정상 — Git Bash 자동 탐색 후 위임 |
| 저장소 게이트 | `make validate` | **EXIT 0** — 4/4 PASS · WARN 0 |
| 문법 | `bash -n` (신규 `.sh` 2종) | 통과 |

### 미실행 검증 (정직 보고)

| 항목 | 사유 |
|------|------|
| `bootstrap.sh` 전체 실행(설치 단계 포함) | `--check` 모드만 실행. 전체 실행은 `npm install`·`composer install` 로 기존 의존성 트리를 건드리므로 사용자 승인 후 수행 |
| Backend Build (`composer install`) | composer 미설치 |
| Python Test | Python 미설치 · pytest 대상 코드 없음 |
| Docker Compose 기동 | Docker 미설치 · compose 구성이 비동작 스텁 |
| PostgreSQL/Redis/Kafka 연결 | 해당 스택 미사용 |

---

## 6. Security (Part003 §11)

| 원칙 | 적용 |
|------|------|
| 기본 계정 하드코딩 금지 | `.env.example` 전 항목 플레이스홀더 |
| 운영 Secret 미보관 | `.env`·`*.pem`·`*.key` gitignored · pre-commit 시크릿 스캔 |
| **Bootstrap 이 Secret 을 생성하지 않음** | 템플릿 복사까지만. JWT 시크릿 자동생성 등을 하지 않는다 |
| 로그에 Password 미출력 | 검증 스크립트는 값이 아니라 **존재 여부와 버전만** 출력 |

---

## 7. 알려진 불일치 — `.vscode/settings.json` ↔ `.editorconfig`

`.editorconfig` 는 `insert_final_newline = true`·`trim_trailing_whitespace = true` 인데
`.vscode/settings.json` 은 둘 다 `false` 다. **의도된 안전장치로 판단하여 유지한다** —
`ko.js`(≈1MB) 급 파일에서 저장만으로 수천 줄 공백 diff 가 발생해 실제 변경을 덮기 때문이다.
정합성을 이유로 되돌리지 않는다. 상세는 [IDE.md](../development/IDE.md) §3.

---

## 8. 미결 항목 (결정 필요)

| # | 항목 | 현황 | 영향 |
|---|------|------|------|
| ~~1~~ | ~~Node 버전 분기~~ | **해소 (2026-07-22)** — §8.1 참조 | — |
| 2 | PHP `openssl`·`curl` 비활성 | 로컬 한정 | 암복호화·외부연동 경로 로컬 테스트 불가 |
| 3 | Composer 미설치 | `vendor` 존재로 당장 무영향 | 백엔드 의존성 추가/갱신 시 필수 |
| 4 | `scripts/*.py` 6개 | Python 미설치로 실행 불가 | 실사용 여부 확인 후 이전(Node 화) 또는 아카이브 판단 |

### 8.1 Node 버전 통일 (해소됨)

착수 시점 실측 — 핀이 **4곳에 흩어져 있었고 값이 갈렸다**.

| 위치 | 착수 전 | 조치 후 |
|------|---------|---------|
| `.github/workflows/deploy.yml` (2개소) | `node-version: '18'` | `node-version-file: '.nvmrc'` |
| `.github/workflows/security-scan.yml` (2개소) | `node-version: '20'` | `node-version-file: '.nvmrc'` |
| `frontend/Dockerfile` | `FROM node:20-alpine` | `ARG NODE_VERSION=20` + `FROM node:${NODE_VERSION}-alpine` |
| 로컬 | 24.16.0 | 변경 없음 (`engines: >=20` 충족) |
| **정본** | **없음** | **`.nvmrc` = 20 신설** |

**20 을 선택한 근거**: 이미 다수(security-scan 2개소 + Dockerfile)가 20 이었고,
Vite 5.4 가 공식 지원하는 LTS 다. 18 은 두 워크플로 간에도 불일치를 만들고 있었다.

**핵심은 숫자가 아니라 단일 소스다.** 숫자를 4곳에 다시 박으면 같은 표류가 재발하므로,
CI 는 `setup-node` 의 `node-version-file` 로 `.nvmrc` 를 읽는다.
버전을 올릴 때 고칠 곳은 **`.nvmrc` 와 `frontend/Dockerfile` 의 ARG 기본값 둘뿐**이다
(Dockerfile 의 `FROM` 은 파일을 읽지 못해 구조적으로 분리가 불가능하다).

`check-environment.sh` 도 하드코딩을 버리고 `.nvmrc` 를 읽는다 —
정본 미만이면 FAIL, 정본 초과(로컬 24 등)면 engines 충족으로 보고 WARN 만 낸다.

**검증**: `cd frontend && npm run build` → `✓ built in 50.52s` · EXIT 0.
`.nvmrc` 기반 CI 실행 결과는 push 후 Actions 에서 확인해야 한다(로컬에서는 재현 불가).

---

## 9. Completion Criteria

| 기준 | 상태 |
|------|------|
| 개발환경 분석 완료 | ✅ |
| Java 확인 | ✅ **부재 확인** (해당 스택 미사용 — 도입하지 않음) |
| Build Tool 확인 | ✅ npm · (Gradle/Maven 부재 확인) |
| Node 확인 | ✅ 24.16.0 · CI 불일치 경고 구현 |
| Python 확인 | ✅ 부재 확인 · 선택 항목으로 분류 |
| Docker 확인 | ✅ 부재 확인 · compose 스텁 판정 |
| PostgreSQL / Redis / Kafka 확인 | ✅ **전부 미사용 확인** (도입하지 않음) |
| Bootstrap Script 작성 | ✅ `.sh` + Windows 런처 |
| Validation Script 보완 | ✅ `check-environment.sh` 확장 |
| `.env.example` 검토 | ✅ Part002 에서 허구 키 → 실사용 `GENIE_*` 로 교체 완료 |
| Frontend Build 검증 | ⚠️ **미실행** — 기존 산출물/의존성 변경 회피. `make lint`·게이트만 수행 |
| Backend Build 검증 | ⚠️ **미실행** — composer 미설치 |
| Python Test 검증 | ⚠️ **해당 없음** |
| Docker Compose 검증 | ⚠️ **해당 없음** (스텁) |
| Secret 미포함 확인 | ✅ pre-commit 스캔 통과 · 신규 파일 시크릿 0 |
| Git Diff 검토 | ✅ |
| 생성·수정 파일 보고 | ✅ §4 |
| 실패·미완료 항목 보고 | ✅ §5 · §8 |

**판정: 조건부 완료.** 환경 분석·스크립트·문서는 완료됐고, 빌드/컨테이너 검증 4건은
"실패"가 아니라 **해당 스택 부재 또는 사용자 승인 대기**다.

---

## 10. 다음 Part 선행 조건

**CCIS Part004 — Coding Standards** 착수 전 확인할 것:

- 이 저장소에는 lint 설정이 `frontend/.eslintrc.json` 하나뿐이고, PHP 측 정적분석 도구(PHPStan/Psalm/PHP-CS-Fixer)는 **없다**. Part004 에서 "기존 규칙 유지"의 대상이 프론트엔드에만 존재함을 전제해야 한다.
- 백엔드 lint 는 현재 `php -l src/routes.php` **단일 파일 문법검사**뿐이다(전체 파일 대상 아님).
- 커밋 메시지·브랜치 규약은 Part002 에서 이미 정의됐다([BRANCHING-STRATEGY.md](../repository/BRANCHING-STRATEGY.md) §3~4). Part004 에서 재정의하지 않는다.

---

*다음 Part: CCIS Part004 — Coding Standards*
