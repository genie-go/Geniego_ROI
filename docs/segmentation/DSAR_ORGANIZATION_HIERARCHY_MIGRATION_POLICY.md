# DSAR — Hierarchy Version Migration Policy (§14)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §14 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### ★§14 는 담당 5개 § 중 **최대 제약**이다 — 집행 수단 자체가 없다

| # | 제약 | 실측 | 귀결 |
|---|---|---|---|
| **1** | **마이그레이션 파일 경로가 죽었다** | `backend/migrations/` **21파일 · 최신 `20260527_172_002_coupon_tables.sql` = 172차 정지 확정**(실측: `ls backend/migrations \| tail` → `20260527_171_002_plan_config_add_columns.sql`·`20260527_171_003_plan_period_pricing.sql`·`20260527_172_001_menu_value_score.sql`·`20260527_172_002_coupon_tables.sql`). 이후 전 스키마는 핸들러별 self-healing `ensureTables`(`CRM.php:44`·`EnterpriseAuth.php:45`·`AdminMenu.php:108`) | **조직 스키마는 마이그레이션 파일로 들어갈 수 없다** |
| **2** | ★★ **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** | 패턴 = 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}`(`Db.php:1123-1127`·`CRM.php:109`). **UPDATE·재계산·행 이행 코드 0** | ★**Hierarchy Version 간 데이터 이행의 집행 수단이 현재 없다** — §46 Retroactive 재계산도 동일 |
| **3** | **두 방언 수기 중복** | 모든 스키마가 MySQL/SQLite 별도 작성(`CRM.php:48` vs `:77`) | 조직 스키마 도입 시 **양쪽 동시 작성 의무** |
| ⚠️ | **변종 존재** | PM 8테이블은 마이그레이션 정의 + 런타임 자가치유 **병행** — `PM\Shared::ensurePmTables:37-53` 이 부재 시 `Migrate::applyFiles` 로 **168차 SQL 을 런타임 적용** | **유일한 탈출구 후보** · 단 마이그레이션 파일이 172차 정지이므로 신규 SQL 추가는 미검증 경로 |
| — | 마이그레이션 무결성 | `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`·`:63-64`·`:145`/`:151`) | `immutable_hash` 선례 |
| — | 로컬 실행 위험 | `php backend/bin/migrate.php` 는 **원격 서버에서** 실행해야 함 — `Db.php:120` 이 `GENIE_DB_HOST` 를 `127.0.0.1` 로 기본값 처리 | 로컬 실행 = 로컬 DB 타격 |

### 정책 대상(승인 케이스)의 실측

| 항목 | 실측 | 판정 |
|---|---|---|
| 승인 케이스 엔티티 | **grep 0**(5-3-2 §12·§13·§14 확정) — 승인은 노드가 아니라 **핸들러 메서드**(`Mapping::approve` `Mapping.php:238-294`) | `ABSENT` |
| 승인 스냅샷 | **부재** — `menu_defaults(snapshot_data JSON, version)`(`AdminMenu.php:120`)가 유일 스냅샷이나 **전역 1행 · 승인 무관** | `ABSENT` |
| 재평가 Hook | 재평가·재계산 트리거 grep 0 | `ABSENT` |
| Cross-Legal-Entity 판정 | `legal_entity` **grep 0** → 판정 대상 자체 없음 | `ABSENT` |
| Tenant Boundary 변경 차단 | ★**격리 강제는 REAL** — 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(`index.php:600`) · 세션→`auth_tenant` 주입(`:429-442`) · strict fail-closed(`:585`). **단 "테넌트 경계 변경"이라는 연산 자체가 없다**(테넌트 마스터 테이블 부재) | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의.** 🔴 **`Migrate` 를 "Hierarchy Version 이행 엔진"으로 계산하면 역산이다.** `Migrate` 는 **DDL 파일 적용기**(`Migrate::applyFiles`)이지 **도메인 데이터 이행기가 아니다**. 원문 §14 가 요구하는 것은 *"승인 케이스를 어느 계층 버전으로 해석할 것인가"* 라는 **런타임 정책**이지 스키마 배포가 아니다. 이름의 `migration` 겹침이 **최대 함정**이다.

## 1. 원문 전사 + 판정 — **원문 9종 + 기본값 6종**

### 1-1. 지원 정책 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | NEW_RESOLUTIONS_ONLY | 부재 — resolution(해석) 엔티티 없음 | `NOT_APPLICABLE` |
| 2 | NEW_APPROVAL_CASES_ONLY | 부재 — 승인 케이스 grep 0 | `NOT_APPLICABLE` |
| 3 | ACTIVE_CASES_KEEP_SNAPSHOT | 부재 — 케이스·스냅샷 **양쪽** 부재 | `NOT_APPLICABLE` |
| 4 | ACTIVE_CASES_REEVALUATE | 부재 · ★**집행 수단 없음**(제약 2) | `CONTRACT_ONLY` |
| 5 | SELECTED_CASES_MIGRATE | 부재 · ★**집행 수단 없음**(제약 2) | `CONTRACT_ONLY` |
| 6 | ALL_ELIGIBLE_CASES_MIGRATE | 부재 · ★**집행 수단 없음**(제약 2) | `CONTRACT_ONLY` |
| 7 | MANUAL_REVIEW | **부재** — Review 단계 자체 없음(5-3-2 확정: Review/Approval 미분화) | `ABSENT` |
| 8 | BLOCK_NEW_APPROVALS | 부재(승인) · 인접 차단 선례 = `Dependencies::validateDependency` **쓰기 전 차단**(`PM/Dependencies.php:32-34` → 422) · `AgencyPortal` fail-closed(`:427` → 403) | `LEGACY_ADAPTER` |
| 9 | CUSTOM | 부재 — 확장 축 없음 | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `CONTRACT_ONLY` 3 · `LEGACY_ADAPTER` 1 · `ABSENT` 1 · `NOT_APPLICABLE` 4.

### 1-2. 기본값 — **원문 6종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 과거 완료 승인: 기존 Snapshot 유지 | ★**구조적 불가** — 스냅샷 부재 + as-of 조회 부재(`WHERE effective_from <= :as_of` **전역 0건**). 현행 `kr_fee_rule` 읽기는 **최신승**(`Pnl.php:454`)이라 **과거를 오늘 값으로 재해석**한다 = 이 기본값의 **정반대** | `ABSENT` |
| 2 | 진행 중 승인: 기존 Snapshot 유지 | 구조적 불가 — 동일 | `ABSENT` |
| 3 | 새로운 승인: 새 Active Hierarchy Version 사용 | 부재 · ⚠️ **최신승 읽기(`ORDER BY effective_from DESC LIMIT 1`)가 우연히 이 한 줄과 형태 일치** — 🔴 **커버로 계산 금지**(1·2를 만족 못 하는 최신승은 정책이 아니라 정책 부재다) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | Critical Security Change: 명시적 재평가 Hook | 부재 · ★**집행 수단 없음**(제약 2) · 재평가 트리거 grep 0 | `CONTRACT_ONLY` |
| 5 | Cross-Legal-Entity 변경: Manual Review | 부재 — `legal_entity` grep 0 **AND** Review 단계 없음 → **양쪽 부재** | `ABSENT` |
| 6 | Tenant Boundary 변경: 차단 | 격리 강제 REAL(`index.php:600`·`:585`) **but** 테넌트 마스터 테이블 부재(`api_key.tenant_id VARCHAR(100)` `Db.php:944` **FK 없음** · 발급 = `'acct_'.$id` 문자열 생성 `UserAuth.php:220-224`) → **"경계 변경" 연산 자체가 없어 차단할 대상이 없다** | `KEEP_SEPARATE_WITH_REASON` |

**실측 개수: 6 / 6 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `CONTRACT_ONLY` 1 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 3.

> **합계: 원문 15종(정책 9 + 기본값 6) / 15 전사. 커버 0.**

## 2. 규칙

### 2-1. ★핵심 긴장 — 정직하게 기록한다

**§14 는 계약만 쓸 수 있고 집행할 수 없다.**

1. **경로 1(마이그레이션 파일) — 죽었다.** `backend/migrations/` 는 **172차에 정지**(최신 `20260527_172_002_coupon_tables.sql`)했고 이후 전 스키마가 `ensureTables` 로 옮겨갔다. 조직 스키마는 **마이그레이션 파일로 들어갈 수 없다**.
2. **경로 2(`ensureTables`) — 이행을 못 한다.** ★**`ensureTables` 는 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 로 테이블을 만들 뿐 데이터 변환·백필을 하지 않는다**(`Db.php:1123-1127`·`CRM.php:109`). `ACTIVE_CASES_REEVALUATE`·`SELECTED_CASES_MIGRATE`·`ALL_ELIGIBLE_CASES_MIGRATE` 는 **정의상 데이터 이행**인데 **그것을 실행할 코드 층이 레포에 없다**.

→ **결론: §14 의 이행 계열 정책은 전부 `CONTRACT_ONLY` 다.** 계약(정책 enum·필드)은 정의할 수 있으나 **실코드 0**이며, **집행 수단을 먼저 만들지 않으면 영원히 `VACUOUS`** 다.

🔴 **이 긴장을 "구현 가능"으로 봉합하지 마라.** §13 `migration policy` 필드를 스키마에 넣는 것은 **1시간이면 되고**, 그 필드는 **아무것도 하지 않는다**. 필드 존재를 커버로 계산하면 정확히 5-3-1 의 역산 오류다.

### 2-2. 집행 수단 선행 조건 (§14 착수 전 반드시)

- **⚠️ 유일한 탈출구 후보 = PM 변종**: `PM\Shared::ensurePmTables:37-53` 이 테이블 부재 시 `Migrate::applyFiles` 로 **168차 SQL 을 런타임 적용**한다 = 마이그레이션 정의 + 런타임 자가치유 **병행**. **데이터 이행 스크립트를 런타임에 태울 수 있는 유일한 실 선례**다. 단 마이그레이션 파일 자체가 172차 정지이므로 **신규 SQL 추가는 미검증 경로** — 라이브 확인 필요.
- **선행 요구 3건**(없으면 §14 전부 `VACUOUS`):
  1. **스냅샷 능력** — 기본값 1·2("기존 Snapshot 유지")의 전제. 현행 유일 스냅샷 `menu_defaults`(`AdminMenu.php:120`)는 **전역 1행 · tenant 없음 · immutable_hash 없음**.
  2. **as-of 조회 능력** — 🔴 **`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건**(PM 직접 검증). `kr_fee_rule.effective_from`(`Db.php:898`)은 컬럼만 있고 읽기가 **전부 최신승**이다. **`effective_to` 는 grep 0** → **폐구간 모델 자체가 신규**.
  3. **승인 케이스 엔티티** — 정책의 **목적어**가 없다.

### 2-3. 금지·강제

- 🔴 **`Migrate`(`Migrate.php`) 를 §14 커버로 계산 금지.** DDL 파일 적용기이지 도메인 데이터 이행기가 아니다. **이름의 `migration` 겹침이 최대 함정.**
- 🔴 **최신승 읽기(`ORDER BY effective_from DESC LIMIT 1`)를 기본값 3("새로운 승인: 새 Active Version")의 커버로 계산 금지.** 형태는 닮았으나 **기본값 1·2(과거·진행 중은 기존 스냅샷 유지)를 동시에 위반**한다. ★**`Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 기간을 무시** → **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**. 단 주석(`:451`)이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 **의도를 명시**하므로 **설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요).
- 🔴 **`BLOCK_NEW_APPROVALS` 를 "쉬운 항목"으로 착수하지 마라.** 차단 선례(`PM/Dependencies.php:32-34` 422 · `AgencyPortal.php:427` 403)는 훌륭하나, **차단할 "승인" 자체가 없다**.
- **신설 스키마는 `ensureTables` + 두 방언 동시 작성 의무**(`CRM.php:48` vs `:77`) — 마이그레이션 파일 경로가 죽었으므로 선택지가 아니다.
- **`php backend/bin/migrate.php` 를 로컬에서 돌리지 마라** — `Db.php:120` 이 `GENIE_DB_HOST` 를 `127.0.0.1` 기본값으로 잡아 **로컬 DB 를 친다**.
- 🔴 15종 **"있다고 가정"하고 배선 금지.**
