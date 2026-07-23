# GeniegoROI Claude Code Implementation Specification

# CCIS Part005 — Naming & Package Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

명명 규칙과 패키지/모듈 구조 표준을 수립한다.

> ★**성격(Part001~004 와 동일)**: 사용자가 Part005 명세를 제공했으나 **그대로 따르지 않았다.**
> 명세의 Reference Stack(`GenieGoROI\` 네임스페이스·`/api/v1` URL·`GENIEGOROI_DB_*` 환경변수·
> PostgreSQL·Laravel(Job/Queue/Policy/Listener)·Docker/Kubernetes·PSR-12 포매터·Pest)은
> **이 저장소에 대부분 존재하지 않거나, 적용 시 명세 자신의 §19("Namespace/API/Table/Event Rename 금지")와
> 헌법 Golden Rule("Replace 가 아니라 Extend")을 위반한다.**
> Part001 §4 "기존 기술 최우선 유지"에 따라 **실측 → 매핑 → 부재/모순 증명 → 실재하는 표준만 성문화**했다.

---

## 2. 실측 — 현행 명명/패키지 현실

| 항목 | 명세 제안 | **실측(정본)** | 판정 |
|------|-----------|----------------|------|
| PHP 버전 | 8.3+ | **8.1.34** | 명세 상향 미충족(§Part003 실측) |
| Framework | Laravel 계열 추정 | **Slim 4** (`slim/slim ^4.12`) | 불일치 |
| Database | PostgreSQL | **MySQL 8 + SQLite 폴백** | 불일치 |
| Namespace | `GenieGoROI\` | **`Genie\`** (Handlers 103·`Genie` 18·`Genie\Handlers\PM` 13·`Genie\Utils` 1) | 불일치 |
| Autoload | `GenieGoROI\ → src/` | **`Genie\ → src/`** (`composer.json` PSR-4) | 불일치 |
| 디렉터리 | Domain/Application/Infrastructure/Presentation(DDD) | **`src/Handlers/`·`src/Utils/` 평면** | DDD 부재 |
| Interface/Trait/Enum | 명명 규칙 상세 | **0개**(저장소에 해당 구성물 없음) | 대상 없음 |
| Handler 스타일 | Controller 클래스 | **정적 메서드**(`public static function`) + `routes.php` 문자열 매핑 | 확립됨 |
| API URL | `/api/v1/{resource}` | **`/v{NNN}/...` 버전접두 + `/api/...`** (routes.php 1600+행) | 불일치 |
| DB 명명 | snake_case 복수형 | **snake_case**(`channel_orders`·`api_key`·`user_session`) | 준수 |
| Migration | `YYYYMMDDNNNN_*.php` | `backend/migrations` **172차에서 정지** → 이후 핸들러별 `ensureTables` | 이원(문서화됨) |
| env 변수 | `GENIEGOROI_DB_*` | **`GENIE_DB_{HOST,NAME,PASS,PORT,USER}`** (`Db.php`) | 명세 키는 허구 |
| `declare(strict_types=1)` | 필수 | **128/137 파일(93%)** 이미 적용 | 관례 확립 |
| PSR | 1/4/12 | **PSR-4 준수**(autoload). PSR-12 포매터 미설치 | 부분 |
| 품질도구 | PHPStan·CS-Fixer/Pint·PHPUnit/Pest | **PHPStan 2.x 만**(Part004 도입) | 부분 |
| Docker/k8s | Image/Container/Namespace 명명 | `infra/`=Python/FastAPI **미사용 스텁**(Part003). 배포=수동 pscp | 미사용 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §5 Namespace `GenieGoROI\` | **미적용** | 실정본 `Genie\`. 변경 시 `routes.php` 1600+행 `'Genie\Handlers\...'` 문자열·103핸들러·autoload 전면 파괴 = §19 자기모순 + Golden Rule 위반 |
| §6 Composer `GenieGoROI\ → src/` | **미적용** | 실정본 `Genie\ → src/`. 동일 사유 |
| §7 DDD 디렉터리(Domain/Application/…) | **미적용** | 현행 `Handlers/`+`Utils/` 평면. 기존 디렉터리 이동 금지(§19). 신규 계층 강제는 Extend 아니라 Replace |
| §8 Class 명명(Repository/Service/DTO/Policy/Job/Event/Listener) | **부분/대상없음** | Repository·Service·DTO·Policy·Job·Event·Listener 패턴 **미사용**(Slim+정적핸들러 구조). Exception 접미사만 일부 실재 |
| §9 함수 camelCase | **준수** | 기존 코드 camelCase 관례 유지 |
| §10 변수 camelCase | **준수** | 유지 |
| §11 DB snake_case | **준수** | 기존 테이블 snake_case. ★단 `tenant_id` 격리 컬럼 필수(헌법) |
| §12 Migration 명명 | **부분** | 신규 마이그레이션은 규약 따르되, 현실은 172차 이후 `ensureTables` 자가치유. **어느 경로인지 명시**(Part004 §5) |
| §13 API `/api/v1/` | **미적용** | 실정본 `/v{NNN}/`+`/api/`. URL 변경 금지(§19). 신규는 최신 버전접두에 추가 |
| §14 Event 과거형 | **대상 없음** | Event 시스템 부재 |
| §15 Queue/Job | **대상 없음** | Job/Queue 프레임워크 부재. cron(`backend/bin/*_cron.php`)로 배치 |
| §16 env `GENIEGOROI_DB_*` | **미적용(허구)** | Part002 기확인 — `GENIEGOROI_DB_*` 는 어느 코드도 안 읽는다. 정본 `GENIE_DB_*`(`Db.php`) |
| §17 Docker 명명 | **미적용** | Docker 미사용(스텁). 배포=수동 pscp/plink |
| §18 Kubernetes 명명 | **미적용** | k8s 미사용 |
| §20 PSR-1/4/12 + strict_types | **부분채택** | PSR-4 준수·strict_types 93% 관례. PSR-12 포매터는 미설치(도입 시 Part004 baseline 방식) |
| §21 검증 명령 | **부분** | `composer validate`·`phpstan analyse` 실동작. cs-fixer/pint/phpunit/pest 미설치 |

---

## 4. 확립된 표준 (신규 코드가 따를 정본)

실행 가능한 규약은 [`docs/development/NAMING-STANDARDS.md`](../development/NAMING-STANDARDS.md) 에 성문화했다. 핵심:

- **Namespace**: `Genie\`. 핸들러=`Genie\Handlers\{Name}`(정적 메서드), PM 확장=`Genie\Handlers\PM\`, 유틸=`Genie\Utils\`, 공용 서비스=`Genie\{Name}`(예 `Genie\Db`·`Genie\Crypto`·`Genie\Mailer`).
- **신규 핸들러**: `src/Handlers/{Name}.php`, `class {Name}`, `public static function {action}(Request,Response,array): Response`, **`routes.php` 에 `'METHOD /v{NNN}/path' => 'Genie\\Handlers\\{Name}::{action}'` 등록**(autodiscovery 없음).
- **API URL**: 신규는 **최신 버전접두**(`/v{NNN}/`) + 실배선은 `/api/` 접두 병기(nginx SPA 폴백 착시 회피 — memory 정합). 기존 URL 불변.
- **DB**: snake_case, 복수형 테이블, `created_at`/`updated_at`, `is_*` boolean, **`tenant_id` 격리 컬럼 필수**. 신규 스키마는 마이그레이션 vs `ensureTables` 중 어느 쪽인지 명시.
- **env**: `GENIE_*`(예 `GENIE_DB_HOST`). `GENIEGOROI_*` 금지(허구).
- **파일 골격**: `<?php` + `declare(strict_types=1);`(신규 필수 — 이미 93% 관례).
- **PSR-4 준수**·PSR-12 정신(들여쓰기/가시성) 지향. 포매터 강제는 미도입.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

명세가 요구했으나 **의도적으로 만들지 않은 산출물**과 근거:

1. **`GenieGoROI\` 네임스페이스 전환** — 안 함. `routes.php` 문자열 매핑 1600+행·103핸들러·autoload 파괴. **명세 §19 가 스스로 Namespace Rename 을 금지**하므로 §5 와 §19 가 충돌하며, §19(보존)가 헌법 Golden Rule 과 정합해 우선한다.
2. **`/api/v1/` URL 스킴** — 안 함. §19(API URL 변경 금지) + 버전접두 회귀 라우팅 정본 보존.
3. **`GENIEGOROI_DB_*` 환경변수** — 안 함. Part002 에서 이미 **허구로 판정·`GENIE_*` 로 정정**한 키다. 재도입 금지.
4. **PostgreSQL·Laravel(Repository/Service/DTO/Policy/Job/Queue/Event/Listener)·Docker·Kubernetes** — 안 함. 저장소에 부재(Slim+MySQL/SQLite+수동배포). 신설은 Extend 아니라 Replace.
5. **PSR-12 포매터(php-cs-fixer/pint)·Pest/PHPUnit** — 이번 차수 미도입. 도입 시 Part004 의 **baseline 게이트 방식**(기존 위반 고정·증가분 차단)을 따를 것. 레거시 전면 재포맷은 diff 폭발·회귀 위험.
6. **PHP 8.3 상향** — 안 함. 실측 8.1.34. 상향은 서버 런타임 교체를 수반하는 인프라 결정.

---

## 6. 게이트가 드러낸 실결함 (Part004 PHPStan 연계)

Part004 에서 도입한 PHPStan(레벨5)이 명명/구조 감사 중 **실제 결함 2건**을 노출했고 수정했다:

| 파일 | 결함 | 영향 | 조치 |
|------|------|------|------|
| `Rollup.php` | `$pdo` 를 첫 `try` 안에서 할당 → `Db::pdo()` 예외 시 이후 5개 블록에서 `$pdo` 미정의(6건) | 인구통계·상품광고성과·원가·수수료 하이드레이션이 **무음 실패**(각 catch 가 삼킴) | `$pdo = Db::pdo()` 를 첫 try **밖으로 호이스팅** → 전 블록 보장 |
| `AgencyPortal.php` | `$rl` 을 로그인시도 조회 try 안에서만 할당 → CREATE/prepare 예외 시 실패카운트 분기가 undefined 변수 접근 | brute-force 카운트 경로 불안정 | `$rl = null` 초기화로 보장 |

> ★반대로 **미사용으로 보고된 항목 다수는 실결함이 아니었다**(정직 판정):
> `UserAdmin::requireMasterAdmin()` 미사용=**인가 갭 아님**(민감작업이 endpoint 게이트 대신 per-action 인라인 `isMaster` 체크로 더 세분화 보호). `ChannelSync:4001` unreachable=**의도적**(`ST11_SELLING_STOP_PATH=''` — 11번가 판매중지 URL 미확정이라 가짜성공 거부, memory 정합). **"always false/unreachable" 상당수가 feature-flag/placeholder 로 의도적**이라 일괄 수정을 금한다 — 건별 의도 확인 필수.

---

## 7. Claude Code 파일 생성 규칙

신규 PHP 파일 생성 전 반드시:

1. **중복 확인**: 동일 핸들러/메서드/라우트가 이미 있는지 grep(헌법 — 중복 신설 금지·기존 확장).
2. **Namespace**: `Genie\...` 사용. `GenieGoROI\` 금지.
3. **등록**: 핸들러는 `routes.php` 에 문자열 매핑 추가(미등록=미배선).
4. **격리**: 모든 쿼리에 `tenant_id` 조건(헌법 — 테넌트 격리 절대).
5. **골격**: `declare(strict_types=1);` 포함.
6. **금지**(§19): Namespace/디렉터리/API URL/Table/Event Rename.

---

## 8. Completion Criteria

- [x] 현행 명명/패키지 **실측**(namespace·dir·handler·API·DB·env·strict_types)
- [x] 명세 §5~§21 **섹션별 매핑·판정**
- [x] 확립된 표준 성문화(본 문서 §4 + `docs/development/NAMING-STANDARDS.md`)
- [x] 의도적 미적용 + 사유 명시(§5)
- [x] PSR-4 준수 확인·strict_types 커버리지 실측
- [x] 게이트(PHPStan)가 드러낸 실결함 수정·연계(§6)
- [x] Claude Code 생성 규칙 정의(§7)
- [x] `composer validate` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **이 저장소에 실재하는 명명 규약의 성문화**이지, 명세의 가상 스택을 이식한 것이 아니다.

---

## 다음 Part

**CCIS Part006 — Configuration & Environment Management (PHP 중심)** — ★주의: env 정본은 `GENIE_*`(루트 `.env`), `GENIEGOROI_*` 아님(본 §5-3).
