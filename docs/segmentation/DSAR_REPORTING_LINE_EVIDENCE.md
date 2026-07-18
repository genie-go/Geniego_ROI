# DSAR — Evidence Contract (§73)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §73 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★목록 말미 실측 — **`evidence` 로 끝나지 않는다. 추가하지 않았다.**

5-3-1 에서 끝 항목 `evidence` 19축 누락 사고가 있었으나, **반대 편향도 금지**(규칙 4). **원문을 직접 확인한 결과:**

```
SPEC …VERBATIM.md:2550   * effective_at
                  :2551   * recorded_at
                  :2552   * immutable hash
                  :2553   * lineage
                  :2554   * audit reference     ← 목록 끝
```

🔴 **원문 필수 필드 40종은 `audit reference` 로 끝난다.** `evidence` 항목은 **없다** → **추가하지 않았다.** (`evidence id` 는 **1번 항목**이지 말미 항목이 아니다.)

### `REPORTING_LINE_EVIDENCE` = **엔티티 전역 0**

`REPORTING_LINE_EVIDENCE` backend 전역 grep **0** · Manager 도메인 실 코드 0 · `rebate` **전역 0**.

### 필드별 이식 가능 선례 (극소수)

| 원문 필드 | 현행 선례 | 이식 판정 |
|---|---|---|
| `tenant` | `pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`) + `KEY idx_pm_audit_tenant_time (tenant_id, created_at)`(`:17`) | ✅ **골격 이식** |
| `immutable hash` | `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128` · SHA-256 `:197` · `lastHash():214-219`) · `schema_migrations.checksum`(`Migrate.php:50`) | ⚠️ **알고리즘만** — 🔴**쓰기 체인만 실재·`verify()` 0·preimage ts(`:195`) 소실 → tamper-evident 아님**(검증형 정본 = `SecurityAudit::verify():56-68`) · 🔴`menu_audit_log` 에 **`tenant_id` 없음 → 스키마 복제 금지** · `lastHash()` 에 **tenant 술어 없음** |
| `recorded_at` | `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`(`…168_008:16`) | ✅ |
| `effective_at` | 🔴 **as-of 질의 전례 0** — `kr_fee_rule.effective_from`(`Db.php:898`) **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0) · `as_of` 2건 = **응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`) | ❌ 신규 |
| `lineage` | `pm_audit_log.diff_json JSON`(`:13`) = 변경 diff 이지 lineage 아님 | ❌ 신규 |
| `snapshot reference` | 🔴 `pm_baseline.captured_at` = **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스·as-of 질의 불가** → `KV_ONLY`. ★`snapshot` grep **최다 히트 = CCTV JPEG 프레임**(`WmsCctv.php:45`·`routes.php:271`) — 검색 최우선 오염원 | ❌ 신규 |
| `source system`/`source record`/`source version` | **manager 보유 소스 0개**(HRIS/ERP/Directory/SCIM manager 전부 `ABSENT` · `sso_config` DDL `EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` **2슬롯 · `manager_attr` 없음**) | ❌ 무대상 |

### 🔴 금지 목록 — **No-PII 헌법과 정합**

CLAUDE.md **"No PII storage"** 원칙(설계 결정: 집계 전용 · 세그먼트는 aggregate cohort 이지 구매자 레코드 아님)과 §73 금지 11종은 **같은 방향**이다. §73 은 그 원칙을 **직원 도메인으로 확장**한다.

⚠️ **본 레포의 "DSAR Data Subject" = 고객**(직원 아님). §73 이 금지하는 **Employee PII**(급여·성과평가·Leave 사유·Health·Bank)는 **현행 레포에 축 자체가 없다** → 금지 11종은 **오늘 위반 0**이나, **이는 준수의 증거가 아니라 축의 부재다**(규칙 9·10). HRIS/ERP 커넥터를 신설하는 순간 **11종 전부가 즉시 활성 위험**이 된다 — 특히 **`HRIS 전체 Payload`**(원문 #10)는 커넥터 구현의 **기본 유혹**이다.

## 1. 원문 전사 + 판정 — **원문 51종**(필수 40 + 금지 11)

### 1-A. 필수 필드 — **40종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | evidence id | Evidence 엔티티 0 | `CONTRACT_ONLY` |
| 2 | tenant | ✅선례 `pm_audit_log.tenant_id NOT NULL`(`…168_008:7`). 🔴반례 `audit_log`·`menu_audit_log`·`admin_growth_approval` **tenant 없음** | `CONTRACT_ONLY` |
| 3 | reporting line registry | Registry 0 | `CONTRACT_ONLY` |
| 4 | reporting line definition | Definition 0 | `CONTRACT_ONLY` |
| 5 | reporting line version | Version 0 | `CONTRACT_ONLY` |
| 6 | supervisory hierarchy | Supervisory 축 0 | `CONTRACT_ONLY` |
| 7 | supervisory hierarchy version | 동상 | `CONTRACT_ONLY` |
| 8 | manager relationship | Relationship 0 | `CONTRACT_ONLY` |
| 9 | manager relationship version | 🔴 **§68 #15 = 현행 사실**(엔티티 version 0 · `menu_defaults.version` 리터럴 `'baseline'` 라벨) | `CONTRACT_ONLY` |
| 10 | subordinate subject | Subject = `app_user` 뿐 · 종속 관계 0 | `CONTRACT_ONLY` |
| 11 | subordinate position | Position 0(`position_idx` = **PM 태스크 정렬순서**) | `CONTRACT_ONLY` |
| 12 | subordinate organization | 조직 축 = 5-3-3-1 산출 **18/18 `CONTRACT_ONLY`** · `ORGANIZATION_*` backend grep 0 | `CONTRACT_ONLY` |
| 13 | manager subject | Manager Subject 0 | `CONTRACT_ONLY` |
| 14 | manager position | Position 0 | `CONTRACT_ONLY` |
| 15 | manager organization | 조직 축 0 | `CONTRACT_ONLY` |
| 16 | relationship type | Type 축 0(§4.6 표현 불가) | `CONTRACT_ONLY` |
| 17 | assignment | Assignment 0 | `CONTRACT_ONLY` |
| 18 | assignment scope | Scope 인접 = `data_scope` **`UNIQUE(tenant_id,subject_type,subject_id)`**(`TeamPermissions.php:164`) = **단일행이 스키마로 강제**(규칙 10 — 정책이 아니라 UNIQUE 가 복수를 금지) · `DATA_SCOPES 'company'` = **무제한 센티넬**(`effectiveScope():258`) | `CONTRACT_ONLY` |
| 19 | source system | **manager 보유 소스 0개** | `CONTRACT_ONLY` |
| 20 | source record | 동상 · 🔴**SCIM PATCH manager = 침묵 no-op**(`scimUpdateUser:391-396` `'active'` 경로만 분기 → `PATCH {"path":"manager"}` 에 **200 + 정상 User 반환** = 가짜 녹색) | `CONTRACT_ONLY` |
| 21 | source version | 동상 | `CONTRACT_ONLY` |
| 22 | employment reference | 🔴 **고용 축 0** — `is_active` = **계정 상태**(base DDL `Db.php:1106`) · `app_user` ALTER **5개소 전량에서 고용 컬럼 0** | `CONTRACT_ONLY` |
| 23 | organization hierarchy version | 5-3-3-1 축 · 실 코드 0 | `CONTRACT_ONLY` |
| 24 | legal entity relationship | Legal Entity 0(`ceo_name` = `app_user` **프로필 평문 문자열** `UserAuth.php:306-307`,`:499`,`:1720`) | `CONTRACT_ONLY` |
| 25 | effective period | 기간 축 0(`effective_to`/`valid_from`/`valid_to` **grep 0**) | `CONTRACT_ONLY` |
| 26 | acting reference | `acting` 0. 🔴**`impersonate:466-525` 로 계산 금지** | `CONTRACT_ONLY` |
| 27 | temporary reference | Temporary 0 | `CONTRACT_ONLY` |
| 28 | interim reference | `interim` 1건 = **지오리프트 중간결과**(`AttributionEngine.php:672`) | `CONTRACT_ONLY` |
| 29 | vacancy reference | `vacan` grep 0. 🔴**§68 #10 결함은 실재하나 참조할 엔티티가 없다** | `CONTRACT_ONLY` |
| 30 | candidate reference | 🔴 **Candidate 계산 코드 0**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0 · `approver` 2건 = **에러 메시지 문자열** `Mapping.php:248`,`:280`) | `CONTRACT_ONLY` |
| 31 | snapshot reference | Snapshot 0 · `pm_baseline.captured_at` = `KV_ONLY` · ★CCTV 오염원 | `CONTRACT_ONLY` |
| 32 | approval request reference | ⚠️인접 실재: `mapping_change_request`(**REAL**) · `admin_growth_approval`(**REAL**, 🔴tenant 없음) · `catalog_writeback_job`(**REAL**) · `action_request`(**VACUOUS** — 생산자 0) — **전부 Manager 근거를 참조하지 않는다** | `CONTRACT_ONLY` |
| 33 | approval case reference | Case 축 0 | `CONTRACT_ONLY` |
| 34 | task reference | `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))` = **태스크 역할이지 매니저 아님** | `CONTRACT_ONLY` |
| 35 | reconciliation reference | 🔴 **이중 공허**(좌·우변 부재) | `CONTRACT_ONLY` |
| 36 | effective_at | 🔴 **as-of 질의 전례 0** — 컬럼만 있고 질의 없음(`kr_fee_rule.effective_from` `Db.php:898` · 읽기 4개소 **전부 최신승**) | `CONTRACT_ONLY` |
| 37 | recorded_at | ✅선례 `pm_audit_log.created_at`(`…168_008:16`). **§38 Business/System 이중 시간축 = 전례 0** | `CONTRACT_ONLY` |
| 38 | immutable hash | ⚠️선례 `menu_audit_log.hash_chain`(`AdminMenu.php:128`·`:197`·`:214-219`) — 🔴**쓰기 체인만 실재·`verify()` 0·preimage ts(`:195`) 소실 → tamper-evident 아님**(검증형 정본 = `SecurityAudit::verify():56-68`) · **알고리즘만 이식 · 스키마 복제 금지**(tenant 없음) | `CONTRACT_ONLY` |
| 39 | lineage | lineage 축 0(`diff_json` 은 변경 diff) | `CONTRACT_ONLY` |
| 40 | **audit reference** | §74 `REPORTING_LINE_AUDIT_EVENT` 축 · 실 코드 0 — ★**원문 목록의 마지막 항목**(`evidence` 아님) | `CONTRACT_ONLY` |

### 1-B. 저장 금지 — **11종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Password | 비번 평문 저장 0(해시) · ⚠️`.clineignore` 가 `.env`·`*.pem`·`*.key` 차단 · CI `tools/scan_secrets.sh` 형태 차단 | `NOT_APPLICABLE`(위반 0) |
| 2 | Access Token | ⚠️토큰 축 실재하나 Evidence 아님. **시크릿 1회 노출 관례 有**(`UserAuth.php:4250`,`:4288`·`OpenPlatform.php:187` — 재표시 안 함) | `NOT_APPLICABLE` |
| 3 | Credential Secret | 자격증명 저장 축은 실재(커넥터)나 Evidence 축 부재 | `NOT_APPLICABLE` |
| 4 | 불필요한 Employee PII | 🔴 **Employee PII 축 자체가 0** — 위반 0은 **준수가 아니라 부재**(규칙 9). ⚠️본 레포 "DSAR Data Subject" = **고객**(직원 아님) | `NOT_APPLICABLE` |
| 5 | 급여 원문 | 급여 축 0(`budget_amount` `Projects.php:14-15` = **프로젝트 예산액**이지 급여 아님) | `NOT_APPLICABLE` |
| 6 | 성과 평가 원문 | 성과평가 축 0(`grade` **45+건 전량 무관** — 고객등급·리드등급·모델품질) | `NOT_APPLICABLE` |
| 7 | 민감 Leave 사유 | Leave 축 **전역 0**(`on_leave`·`out_of_office` 0) | `NOT_APPLICABLE` |
| 8 | Health 정보 | Health 축 0(`health` 히트는 **`/health` 엔드포인트**·Health Score — 의료 아님) | `NOT_APPLICABLE` |
| 9 | Bank Data | 은행 축 0(`business_unit_id` = **Trustpilot 자격증명** — 이름 함정) | `NOT_APPLICABLE` |
| 10 | HRIS 전체 Payload | 🔴 **HRIS `ABSENT`**(`hris`·`workday`·`bamboo`·`payroll`·`sap`·`netsuite` 소스 히트 0 · 커넥터 카탈로그 행 0 · fetcher 0). **커넥터 신설 시 최우선 위험** | `NOT_APPLICABLE` |
| 11 | Directory Secret | Directory `ABSENT`(`ldap`·`active_directory`·`distinguishedName` 0 · 🔴**`$dn` 2건 = PHP 지역변수**(`Connectors.php:1557`·`GraphScore.php:343`) — `distinguishedName` 아님) | `NOT_APPLICABLE` |

**실측 개수: 51 / 51 전사** (필수 40 + 금지 11).
측정기 분모 **51** · 원문 대조 **51**(40+11) · 전사 **51** — **3자 일치.**
판정 분포: 필수 **`CONTRACT_ONLY` 40/40** · 금지 **`NOT_APPLICABLE` 11/11**(위반 0 — 단 **축의 부재이지 준수 아님**).

## 2. 규칙

- ★ **원문 필수 목록은 `audit reference` 로 끝난다 — `evidence` 항목은 없으며 추가하지 않았다.** 5-3-1 누락 사고의 반대 편향(없는 항목 추가)도 금지다(규칙 4). `evidence id` 는 **1번 항목**이다.
- 🔴 **금지 11종 "위반 0"을 준수로 계산 금지**(규칙 9·10). Employee PII·급여·Leave·Health·Bank 축이 **레포에 아예 없어서** 0이다. **HRIS/ERP 커넥터를 신설하는 순간 11종 전부가 활성 위험**이 되며, 특히 **#10 `HRIS 전체 Payload` 는 커넥터 구현의 기본 유혹**이다(원본 응답 통째 저장). **커넥터 설계서에 필드 화이트리스트를 선(先) 고정하라.**
- **No-PII 헌법과 정합**: §73 금지 목록은 CLAUDE.md **"No PII storage"**(집계 전용 · 세그먼트 = aggregate cohort) 원칙을 **직원 도메인으로 확장**한 것이다. 상충 없음 — **강화**다.
- 🔴 **#38 `immutable hash` — 알고리즘만 이식, 스키마 복제 금지.** `menu_audit_log.hash_chain`(`AdminMenu.php:128`)은 SHA-256 prev-chain 선례이나 **쓰기 체인만 실재하고 `verify()` 가 0·preimage 의 `ts`(`:195`)가 INSERT 컬럼목록에서 소실돼 행에서 재계산 불가 → tamper-evident 가 아니다**(검증형 정본 = `SecurityAudit::verify():56-68`). 또한 **`tenant_id` 가 없고** `lastHash():214-219` 에 **tenant 술어가 없다**. 테넌트별 체인을 만들려면 **`WHERE tenant_id=?` 필수**(없으면 테넌트 간 체인이 뒤엉킨다).
- 🔴 **#36 `effective_at` / #37 `recorded_at` 을 "컬럼만 붙이면 된다"로 견적 금지.** as-of **질의**가 레포 전역 0이다(`kr_fee_rule.effective_from` 은 컬럼 有·질의 無 · 읽기 4개소 전부 최신승). **§38 Business/System 이중 시간축은 전례 0** → 저장·질의 양 계층 신규.
- 🔴 **#31 `snapshot reference` — 검색 오염 주의.** `snapshot` grep 최다 히트는 **CCTV JPEG 프레임**(`WmsCctv.php:45`·`routes.php:271`)이고, `pm_baseline.captured_at` 은 **DB 컬럼이 아니라 JSON 키**(`Handlers/PM/Enterprise.php:360`) → 인덱스·as-of 질의 불가.
- 🔴 **#20 `source record` — SCIM 침묵 no-op 경고.** `scimUpdateUser:391-396` 이 `'active'` 경로만 분기해 `PATCH {"path":"manager"}` 에 **200 + 정상 User 리소스**를 반환한다(Okta/Entra 콘솔엔 성공 표시 · 저장된 것은 없음). **현재 소비자 0 → 관찰 사실 · 등급 미부여**이나, manager 인입을 SCIM 으로 설계하면 **첫 통합에서 가짜 녹색**을 만든다.
- 🔴 **Evidence 스토어를 새로 만들기 전에 §74 를 읽어라** — `pm_audit_log` 골격 + `menu_audit_log` 해시체인 **합집합 확장**이 정본이며 **중복 감사 스토어 신설은 금지**다.
- ⚠️ **Migration 제약**: `backend/migrations/` **21파일 · 172차 정지** → 신규 스키마는 마이그레이션 경로 없이 `ensureTables` 멱등 CREATE. 🔴**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **Evidence 소급 생성 수단 없음**. **MySQL/SQLite 두 방언 수기 중복 작성 의무.**
- 🔴 **본 문서는 코드변경 0.** 실 Evidence 스키마·해시체인 구현은 **별도 승인세션**.
