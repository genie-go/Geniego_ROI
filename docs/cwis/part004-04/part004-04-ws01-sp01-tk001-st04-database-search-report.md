# CWIS-P004-U04-WS01-SP01-TK001-ST04 — Database Search Report

> **압축 실행 (사용자 승인)**: 본 Step 은 **ST04(DB/Migration) + ST05(Route/API) + ST06(Test/Package)** 를
> 1개 실행 단위로 통합했다. 산출물·검증은 각 Step 명세대로 전부 생성했다.

| 항목 | 값 |
|---|---|
| **Specification ID** | `CWIS-P004-U04-WS01-SP01-TK001-ST04` (+ST05·ST06 통합) |
| 선행 Step | ST01 `READY_WITH_LIMITATIONS` · ST02 `READY` · ST03 `READY_WITH_LIMITATIONS` |
| Git Branch | `feat/n236-admin-growth-automation` |
| Git Revision (직전) | `98ee8c4fe8a` |
| 검색 엔진 | PHP native (정적 정규식 — DB 연결·Boot·Migration 실행 0) |
| 실행 시간 | 약 1.1초 (207 파일) |
| **완료 상태** | **READY** |

---

## 1. ★핵심 결론

> **저장소 전체 321개 테이블 중 즐겨찾기 관련 테이블은 0개다.**
> **라우트 1,503개 중 즐겨찾기 API 는 0개다.**
> **즐겨찾기 관련 외부 패키지는 0개다.**

ST02(백엔드 PHP 0건) · ST03(프런트 API 0건)에 이어 **DB·Route·Package 3축에서 서버측 부재가 최종 확정**되었다.

유일한 인접 구조는 **`saved_report` 1개**이며, 이는 즐겨찾기가 아니라 "리포트 정의 저장"이다.
다만 *"사용자가 무언가를 저장한다"* 패턴의 **저장소 내 유일한 선례**이므로 재사용 후보로 인벤토리에 등재했다(§5).

---

## 2. 필요성 판정 (상시 원칙 적용)

| 명세 요구 | 판정 | 사유 |
|---|---|---|
| DB/Migration 검색 실행 | **IMPLEMENT** | 결론이 예상돼도 **321개 테이블 전수 확인이 곧 증거**. 1.1초 |
| ST05·ST06 개별 Step | **압축 통합** | 셋 다 동일 결론(서버측 0)을 재확인하는 구조. 산출물은 전부 생성하되 실행은 1회 |
| §7 `database/migrations` `database/schema` `database/seeders` `database/factories` `migrations` `src/Entity` `src/Domain` `app/Models` `tests/Fixtures` `resources/schema` | **SKIP** | **전부 부재**(실측 10/10) |
| Laravel `Schema::create`/`Blueprint` 파서 | **패턴만** | Laravel 미사용. 0건 예상되나 부재 증명 목적으로 패턴 유지(비용 0) |
| Doctrine `AbstractMigration`/`#[ORM\...]` 파서 | **패턴만** | Doctrine 미설치. 동일 |
| Eloquent Model 파서 | **패턴만** | `illuminate/database` 가 composer 에 **선언돼 있으나 코드 사용 0건**(`extends Model` 0 · `use Illuminate` 0). 선언만 보고 "Eloquent 사용"으로 판정하면 오진 |
| §30 Schema Dump 구조 추출 | **SKIP** | `database/schema/*.sql` 부재. 저장소 내 `.sql` 560개 중 **537개가 `legacy_v338_pkg` 아카이브**(scope 제외) |
| §31 Seeder/Factory | **SKIP** | 디렉터리 자체가 부재 |
| §32 Test Schema | **SKIP** | `tests/` 부재. 테스트 러너도 없음 |

---

## 3. 탐지된 데이터베이스 기술 (실측)

| 항목 | 결과 |
|---|---|
| Platform | **MySQL 8.0.37 (주) + SQLite (폴백)** — `backend/src/Db.php` 가 두 DSN 만 생성 |
| PostgreSQL | **미사용** — `docker-compose.yml` 의 `postgres:16` 선언은 초기커밋 스텁(ST01 트랩 §3 기록) |
| ORM | **없음** — `extends Model` 0 · `ORM\Entity` 0 · `use Illuminate` 0. **raw PDO** |
| Doctrine | 미설치 |
| **Migration Tool** | **CUSTOM** — `backend/src/Migrate.php` + **핸들러별 `ensureTables()` 자가치유** |
| Redis / Elasticsearch | 미설치 |

★**스키마 정본이 마이그레이션이 아니다.** `backend/migrations`(21개)는 세션 172 에서 동결됐고,
현재 스키마는 **`backend/src/**` 의 `CREATE TABLE IF NOT EXISTS` 499개(86 파일)** 가 만든다.
ST01 이 이 트랩을 기록했고 본 Step 이 **양쪽을 모두 스캔**했다.

---

## 4. 검색 범위·통계

| 항목 | 값 |
|---|---|
| 검색 루트 | `backend/migrations` `backend/src` `backend/bin` `backend/data` `config` |
| 부재로 제외된 후보 | 10개 (§2 표) |
| 확장자 | `php sql xml yaml yml json neon` |
| 검색 파일 | **207** |
| Migration 파일 | 21 |
| SQL 파일 | 21 |
| **ORM 파일** | **0** |
| 읽기 실패 | **0** (0.0%) · 외부 symlink 0 · 10MB 초과 0 |
| 데이터 Dump 열람 | **0** (`backups/` `dumps/` `*backup.sql` 사전 차단) |
| **저장소 전체 테이블** | **321** |
| **후보 테이블** | **1** (`saved_report`) |
| 매치 | 2 |
| 민감정보 마스킹 | 0 (대상 없음) |

### 4.1 구조 집계

| 항목 | 값 |
|---|---|
| 고유 Column | 6 |
| Primary Key | 1 |
| **Foreign Key** | **0** |
| **Unique Constraint** | **0** |
| Index | 1 |
| **Polymorphic 구조** | **0** |
| User Scope 구조 | **0** |
| Tenant Scope 구조 | 1 |
| Workspace / Project Scope | 0 / 0 |
| Soft Delete | 0 |
| Ordering(position/sort_order) | 0 |
| JSON Metadata | 0 |
| Legacy / Schema Drift 후보 | 0 |

---

## 5. 유일한 후보 — `saved_report`

| 속성 | 값 |
|---|---|
| 정의 위치 | `backend/src/Handlers/Reports.php:553` (**ensureTables DDL** — 마이그레이션 아님) |
| 컬럼 | `id` `tenant_id` `name` `config` `viz` `created_at` |
| Primary Key | `id` (AUTO_INCREMENT) |
| Index | `idx_sr2_tenant (tenant_id)` |
| **tenant_aware** | **YES** |
| **user_scoped** | **NO** ← 핵심 |
| polymorphic / ordering / soft delete / JSON | 전부 NO |
| 분류 | `POTENTIAL_RELATED_INFRASTRUCTURE` (즐겨찾기 **직접 구현 아님**) |

★**설계 선례로서의 의미**: 저장소에서 *"사용자가 항목을 저장한다"* 에 가장 가까운 유일한 테이블인데
**`user_id` 가 없다** — 즉 저장된 리포트는 **테넌트 전체 공유**이지 개인 소유가 아니다.
Part004-04 즐겨찾기는 **개인 소유**여야 하므로 이 구조를 그대로 복제해서는 안 된다(ST10 입력).

### 5.1 Risk Candidate 2건 (근거 기반 — 추측 생성 금지)

| Risk | 대상 | 근거 |
|---|---|---|
| `MISSING_USER_SCOPE` | `saved_report` | `user_id`/`principal_id` 컬럼 부재 — 사용자별 저장 불가 |
| `MISSING_UNIQUE_CONSTRAINT` | `saved_report` | 중복 방지 UNIQUE 제약 부재 |

두 건 모두 `severity_candidate = UNKNOWN`. **ST04 는 위험도를 확정하지 않는다**(ST10 소관).

---

## 6. [ST05 통합] Route / API

| 항목 | 값 |
|---|---|
| `routes.php` 총 라우트 | **1,503** |
| **즐겨찾기 관련 라우트** | **0** |
| 검색 패턴 | `/favorites` `/favourites` `/bookmarks` `/saved-items` `/pinned-items` `/pins` `/star` `/unstar` `/unfavorite` `/unbookmark` |

★본 저장소 라우트 정본은 `routes.php` 의 `'METHOD /path' => 'Class::method'` 문자열 맵이다.
Laravel `Route::` / Symfony Attribute 라우팅은 존재하지 않는다.
ST03 의 프런트 API 호출 0건과 **정확히 정합**한다.

---

## 7. [ST06 통합] Package / Test

| 항목 | 값 |
|---|---|
| **즐겨찾기 관련 외부 패키지** | **0** (`backend/composer.json` · `frontend/package.json` · `package.json` 전수) |
| Test Runner | **NONE** — PHPUnit/Pest/Jest/Vitest 미설치 |
| 테스트 자산 | 자체 검증 스크립트 3종(`navigation_analyze_selftest.mjs` · `navigation_registry_selftest.php` · `navigation_context_selftest.php`) |

→ 재사용할 수 있는 즐겨찾기 라이브러리가 없으므로 **자체 구현이 유일한 선택지**다.

---

## 8. 생성 파일

| 파일 | 내용 |
|---|---|
| `tools/cwis/navigation/scripts/search-favorites-database.php` | 재실행 가능한 정적 검색기(DB 연결·Boot·Migration 실행 0) |
| `…/output/favorites-database-raw-results.json` | 원본 2건 + 메타/통계 |
| `…/favorites-database-table-inventory.json` | 후보 테이블 1건 + **전체 321 테이블 수** |
| `…/favorites-database-column-inventory.json` | 컬럼 6건 |
| `…/favorites-database-constraint-inventory.json` | 제약 1 + 인덱스 1 |
| `…/favorites-database-orm-inventory.json` | **0건** — ORM 미사용 결론 + 사유 |
| `…/favorites-database-migration-inventory.json` | 마이그레이션 21건(동결 사실 명시) |
| `…/favorites-database-risk-candidates.json` | 위험 후보 2건 |
| `…/favorites-api-route-inventory.json` | **[ST05]** 라우트 1,503 중 즐겨찾기 0 |
| `…/favorites-package-test-inventory.json` | **[ST06]** 패키지 0 · 테스트 러너 부재 |
| `docs/cwis/part004-04/…-st04-database-search-report.md` | 본 보고서 |

---

## 9. 검증 결과

**22 passed, 0 failed** (+ 명세 §55 `php -r json_decode(JSON_THROW_ON_ERROR)` **VALID**)

| 검증 | 결과 |
|---|---|
| JSON 9개 구문 (§55) | PASS |
| **모든 ID 형식 + 고유** (§56) | PASS (`FAV-DB-` `-CST-` `-ORM-` `-MIG-` `-RISK-`) |
| **file_path 상대·내부·traversal 없음·실재** (§57) | PASS |
| **Column → Table 정합** (§58) | PASS |
| **Constraint/Index → Table 정합** (§58) | PASS |
| **Constraint/Index 컬럼이 실제 테이블 컬럼에 존재** (§59) | PASS |
| Table 컬럼목록 = Column 인벤토리 집계 | PASS |
| ORM 인벤토리 정합(빈 결과 + 사유 기록) | PASS |
| **Migration 정합·중복 없음** (§60) | PASS |
| **Risk 가 근거를 가짐(추측 금지)** | PASS |
| **Credential/Connection String/실데이터 없음** (§61) | PASS (8패턴) |
| 절대경로·개인 디렉터리 없음 (§48) | PASS |
| `matched_text` 300자 이하 (§46) | PASS |
| classification / constraint_type / operation_type enum | PASS |
| **★전체 테이블 수 독립 재계산 일치(누락 방지)** | PASS |
| **★즐겨찾기 테이블 0건 독립 경로 재확인** | PASS |
| [ST05] 라우트 정합 (1,503 파싱 + 0건) | PASS |
| [ST06] 패키지/테스트 정합 | PASS |
| **운영 코드 무변경** (§62) | PASS |
| **★Migration 미실행·DB 미접속** | PASS (`new PDO`·`mysqli`·`artisan`·`eval`·`curl_exec` 등 부재 검사) |

> 마지막 2개 항목이 핵심이다 — 검색 누락(0건이 아니라 못 찾은 것)과 DB 접속 사고를 기계적으로 차단한다.

---

## 10. 파서 결함 1건 발견·수정

**컬럼 분할 결함** — 초기 구현이 `preg_split('/,\s*\n/')` 로 프래그먼트를 나눠
`name VARCHAR(255) NOT NULL, config TEXT NOT NULL, viz VARCHAR(20) …` 처럼 **한 줄에 여러 컬럼이 선언된 경우**
`config` · `viz` 를 **누락**했다(실측). 괄호 깊이·따옴표를 인식하는 top-level 콤마 분할기로 교체했고,
`DECIMAL(14,2)` 내부 콤마로 잘리는 문제도 함께 차단했다. 재실행 후 6/6 컬럼 정상 추출.

---

## 11. 제한 사항

1. **ensureTables DDL 은 문자열 연결·조건 분기를 포함할 수 있다** — 본 파서는 `CREATE TABLE …` 리터럴만
   해석한다. 변수로 조립되는 테이블명이 있다면 놓칠 수 있다(현재 저장소에서는 미발견).
2. **MySQL/SQLite 이중 DDL** — 대부분 핸들러가 두 경로를 각각 선언한다. 테이블 인벤토리는
   **첫 등장(MySQL 경로)** 을 기준으로 파싱했다. SQLite 경로에만 있는 컬럼이 있다면 반영되지 않는다.
3. **`legacy_v338_pkg` 아카이브 미검색** — `.sql` 560개 중 537개가 여기 있으나 scope 제외 대상(과거 미러).
4. **Foreign Key 0건은 스키마 특성** — 본 저장소는 애플리케이션 레벨 무결성을 쓰며 FK 를 거의 두지 않는다.
   즐겨찾기 후보 테이블이 없으므로 FK 부재를 결함으로 판정하지 않았다.

---

## 12. 다음 Step 진행 가능 여부

**READY**

필수 JSON 7개(+ST05·ST06 통합 2개) + 보고서 생성, 검증 22/22 통과, 운영 코드 변경 0건,
DB 미접속·Migration 미실행 확인.

### 12.1 Task001 의 남은 작업

압축 계획에 따라 남은 것은 **ST07~ST11 통합 1개 Step**(정규화 · 분류 · 의존/재사용 매핑 · 갭 분석 · 최종 검증)뿐이다.

### 12.2 ★Task001 을 통한 확정 사실 (ST07~ST11 입력)

| # | 사실 | 근거 Step |
|---|---|---|
| 1 | 백엔드 PHP 즐겨찾기 구현 **0** | ST02 (179 파일 전수) |
| 2 | 프런트 구현 **2개** — Sidebar(디바이스 전역) · CaseStudy(테넌트 스코프) | ST03 |
| 3 | 프런트 → 서버 API 호출 **0** | ST03 |
| 4 | DB 테이블 **0** / 321개 중 | ST04 |
| 5 | 서버 라우트 **0** / 1,503개 중 | ST05(통합) |
| 6 | 외부 패키지 **0**, 테스트 러너 부재 | ST06(통합) |
| 7 | 재사용 가능한 Polymorphic Resource 인프라 **0** | ST02·ST04 |
| 8 | 가장 가까운 선례 `saved_report` 는 **user_scoped=NO** (테넌트 공유) | ST04 |
| 9 | `aria-pressed` **0** — 토글 접근성 결함 | ST03 |

→ **즐겨찾기 서버화는 "기존 확장"이 아니라 "신규 구축"** 이며, 재사용할 수 있는 것은
Part004-02 의 `menu_key` 정본 + Alias 105건, 그리고 `tGetJSON` 테넌트 스코프 저장 패턴뿐이다.
