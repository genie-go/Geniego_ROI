# DSAR — Manager Relationship Version (§14)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §14(790-833) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

> **분할 고지(규칙 3)**: 측정기 §14 분모 = **32**(필수 필드 19 + Change Type 13). 본 편은 **필수 필드 19종**만 전사한다. **Change Type 13종은 별도 편** [DSAR_MANAGER_RELATIONSHIP_CHANGE_TYPE.md](DSAR_MANAGER_RELATIONSHIP_CHANGE_TYPE.md). **19 + 13 = 32 로 측정기와 일치.**

## 0. 현행 실측 (file:line)

### 대전제 — **버전 축이 존재하지 않는다. 그리고 부재의 깊이가 항목마다 다르다.**

| 축 | 실측 | 판정 근거 |
|---|---|---|
| `effective_to` | **grep 0** | — |
| `valid_to` | **grep 0** | ★유일 히트 `Onsite.php:396` 은 **`'invalid_token'` 문자열의 부분일치 = 위양성** |
| `valid_from` / `effective_from`(관계) | **grep 0** | 세율 `kr_fee_rule.effective_from`(`Db.php:898`)은 **다른 도메인** |
| optimistic lock `version` | **grep 0** | — |
| 엔티티 `version` | **1건** — `menu_defaults.version`(`AdminMenu.php:120` `VARCHAR(32) NOT NULL`) | 🔴**유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** |
| `previous_version_id` / 체인 | **0** | — |

### 🔴 ★교정 계층이 축마다 다르다 — **"시점 컬럼만 붙이면 된다"는 일반화가 깨진다**

| 선례 축 | 상태 | 필요 계층 |
|---|---|---|
| **세율** `kr_fee_rule.effective_from`(`Db.php:898`) | **컬럼 有·질의 無** — `WHERE effective_from <= :as_of` **전역 0** · 읽기 4개소 전부 최신승(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | **질의 계층**(과거 복원 가능) |
| **환율** `fxToKrw`(`Connectors.php:1749`) | **컬럼도 이력도 無** — `app_setting` KV 단일행 덮어쓰기(`:1804-1805`) | **저장 계층 신설** — 복원할 게 없다 |

★**§38 Business/System Time 이중 시간축 = 전례 0.**

### 🔴 ★`ensureTables` 는 **백필을 하지 않는다** — §40 Retroactive Correction 집행 수단 부재

`backend/migrations/` **21파일 · 172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → 신규 스키마는 **마이그레이션 파일 경로 없음** → 핸들러별 `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}`.
🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다.** 🔴**`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 데이터 이행기가 아니다.** ⚠️예외 후보 = `Handlers/PM/Shared.php:37-53`(런타임 `Migrate::applyFiles`). **MySQL/SQLite 두 방언 수기 중복 작성 의무.**

### 인접 선례 — **알고리즘은 이식 가능 · 스키마 복제는 금지**

| 선례 | 실측 | 이식 가능성 |
|---|---|---|
| `menu_audit_log.hash_chain` | `AdminMenu.php:128` `CHAR(64) DEFAULT NULL` · SHA-256 prev-chain 생성 `:182-197` · `lastHash():214-219` | ✅ **알고리즘만** · 🔴**`menu_audit_log` 에 `tenant_id` 없음 → 스키마 복제 금지** · 🔴**`lastHash()` 에 tenant 술어 없음**(`SELECT … ORDER BY id DESC LIMIT 1` `:216`) → 테넌트별 체인 시 `WHERE tenant_id=?` **필수** |
| `schema_migrations.checksum` | `Migrate.php:50` `hash('sha256', $sql)` | ✅ 해시 관례 |
| `pm_audit_log` | `tenant_id NOT NULL`(migration `20260526_168_008:7`) + `entity` + `diff_json`(`:13`) + 3인덱스(`:17-19`) + append-only 주석(`:2-3`) | ✅ **테넌트 인지 감사로그의 유일 정상 선례** |
| `pm_baseline.captured_at` | 🔴**DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) | ❌ **인덱스 불가·as-of 질의 불가** → `KV_ONLY` |
| `as_of` 2건 | `PgSettlement.php:279`·`AttributionEngine.php:666` = **응답 타임스탬프**이지 as-of 질의 아님 | ❌ |

### 🔴 ★이력 소거 반례 — §55 정면 위반 선례

`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 **이전 해지 시각을 소거** → **이력 물리적 소멸**. **§55 "과거 Snapshot 대체 금지" 의 정면 반례 — 복제 금지.**

## 1. 원문 전사 + 판정 — **원문 19종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_relationship_version_id | 버전 엔티티 부재 · 관계 엔티티 자체 부재(§13) | `CONTRACT_ONLY` |
| 2 | manager_relationship_id | §13 관계 엔티티 부재 | `CONTRACT_ONLY` |
| 3 | version_number | 🔴**`menu_defaults.version` 은 선례가 아니다** — 유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정 = **버전이 아니라 라벨**(주석 `:281` 이 282차까지 0행 자인). optimistic lock `version` grep **0** | `CONTRACT_ONLY` |
| 4 | previous_version_id | 버전 체인 0 · `prev` 참조 선례는 `hash_chain`(`AdminMenu.php:128`)뿐이며 **로그 체인이지 엔티티 버전 체인 아님** | `CONTRACT_ONLY` |
| 5 | subordinate reference | §13 종속측 참조 부재 | `CONTRACT_ONLY` |
| 6 | manager reference | §13 매니저 참조 부재 · `team.manager_user_id` 는 **§17 축**(관계행 아님) | `CONTRACT_ONLY` |
| 7 | relationship type | §11 Manager Type 27종 표현 수단 0 | `CONTRACT_ONLY` |
| 8 | primary state | 🔴**규칙 10** — `team.manager_user_id` 가 1칸이라 "primary" 가 **우연히 참**. 상태로 관리되지 않음 | `CONTRACT_ONLY` |
| 9 | scope | `data_scope` `UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`) = **단일행이 스키마로 강제** · 버전별 scope 스냅샷 0 | `CONTRACT_ONLY` |
| 10 | source version | 외부 소스가 **manager 데이터를 한 바이트도 싣지 않음**(§3.4 42항목 전량 부재) → 버전화할 원본이 0 | `CONTRACT_ONLY` |
| 11 | change type | 하기 13종 축 — **별도 편** [DSAR_MANAGER_RELATIONSHIP_CHANGE_TYPE.md](DSAR_MANAGER_RELATIONSHIP_CHANGE_TYPE.md) | `CONTRACT_ONLY` |
| 12 | change reason | `menu_audit_log.reason TEXT`(`AdminMenu.php:127`)·`pm_audit_log.diff_json` 인접 — **감사 사유이지 버전 사유 아님** · 관계 도메인 0 | `CONTRACT_ONLY` |
| 13 | effective_from | `effective_from` = **세율 도메인 1건**(`Db.php:898`) · 🔴**컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0) → **패턴만 참조 가능, 준수 사례 아님** | `CONTRACT_ONLY` |
| 14 | effective_to | **grep 0** — 종료 시점 축 전례 없음 | `CONTRACT_ONLY` |
| 15 | recorded_at | **패턴 실재** — `created_at`(`team` `:149`·`menu_audit_log` `:129` `DATETIME DEFAULT CURRENT_TIMESTAMP`). 🔴**단 System Time 이지 Business Time 아님** — §38 이중 시간축 전례 0 | `LEGACY_ADAPTER`(패턴만 이식) |
| 16 | recorded_by | **패턴 실재** — `menu_audit_log.changed_by VARCHAR(255)`+`changed_by_role VARCHAR(32)`(`AdminMenu.php:126`) · `team.created_by`(`:149`). 🔴**단 actor 표준이 전사에 없다** — `Mapping::actorId:36-53` 은 국소 REAL(3분기 · 미확인 null `:52` → 403 fail-closed)이나 **`Alerting::actor:33-36` 은 여전히 `X-User-Email` 헤더/`?actor=` 쿼리/`'unknown'` 폴백 = 위조가능** | `PARTIAL` |
| 17 | immutable_hash | **알고리즘 선례 실재** — `menu_audit_log.hash_chain` SHA-256 prev-chain(`AdminMenu.php:128` · 생성 `:182-197` · `lastHash():214-219`) · `schema_migrations.checksum`(`Migrate.php:50`). 🔴**스키마 복제 금지**(`menu_audit_log` 에 `tenant_id` 없음 · `lastHash()` 에 tenant 술어 없음) · 🔴 **쓰기 체인만 실재·검증기(`verify()`) 0·preimage ts(`:195`) 소실 → tamper-evident 아님**(검증형 정본 = `SecurityAudit::verify():56-68`) | `LEGACY_ADAPTER`(알고리즘만) |
| 18 | status | **패턴 실재** — `team.status VARCHAR(20) DEFAULT 'active'`(`:148`) · 화이트리스트 `['active','disabled','archived']`(`:490`). 버전 도메인 0 | `LEGACY_ADAPTER`(패턴만 이식) |
| 19 | evidence | 증거 첨부 축 0 · §66 Reconciliation 은 **좌·우변 이중 부재** | `CONTRACT_ONLY` |

**실측 개수: 19 / 19 전사** (측정기 §14 분모 32 = 본 편 19 + Change Type 편 13 · **분할 후 합계 일치**).
커버리지 = `CONTRACT_ONLY` 15 · `LEGACY_ADAPTER` 3 · `PARTIAL` 1. **`VALIDATED_LEGACY` 0 — 커버 0종.**

## 2. 규칙

- 🔴 **`ensureTables` 로는 §40 Retroactive Correction 을 집행할 수 없다.** 테이블 생성만 하고 **데이터 변환·백필을 하지 않는다**. 버전 백필이 필요하면 **집행 수단 자체를 먼저 결정**하라(마이그레이션 경로가 172차에 정지 → 신규 파일 경로 없음). **"컬럼만 추가하면 과거가 복원된다"는 역산.**
- 🔴 **`menu_defaults.version` 을 버전 선례로 인용 금지** — 리터럴 `'baseline'` 고정 = **버전이 아니라 라벨**(`AdminMenu.php:309`). **"컬럼이 있다 → 버전 모델이 있다"는 규칙 7 위반.**
- 🔴 **교정 계층이 축마다 다르다.** 세율 축 = **질의 계층**(컬럼 有·복원 가능) · 환율 축 = **저장 계층 신설**(복원할 게 없다). **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.**
- **`immutable_hash` 는 알고리즘만 이식하라.** `menu_audit_log.hash_chain` 의 SHA-256 prev-chain 은 유효하나 🔴**스키마 복제 금지** — `tenant_id` 가 **없고** `lastHash():216` 에 **tenant 술어가 없다**. 테넌트별 체인은 `WHERE tenant_id=?` **필수**. 🔴 **또한 쓰기 체인만 실재하고 검증기(`verify()`)가 0**이며 preimage `ts`(`:195`)가 INSERT 컬럼에 없어 `created_at` DB DEFAULT 가 덮어 재계산 불가 → tamper-evident 아님. 검증형 정본 = `SecurityAudit::verify():56-68`. 테넌트 인지 감사로그의 정상 선례는 **`pm_audit_log`**(`tenant_id NOT NULL` · `diff_json` · 3인덱스 · append-only).
- 🔴 **`pm_baseline.captured_at` 을 as-of 선례로 계산 금지** — **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360`) → **인덱스 불가·as-of 질의 불가**(`KV_ONLY`). `as_of` 2건(`PgSettlement.php:279`·`AttributionEngine.php:666`)도 **응답 타임스탬프**이지 as-of 질의 아님.
- 🔴 **`AgencyPortal.php:304`·`:381`(`revoked_at=NULL` 소거) 패턴 복제 절대 금지** — **§55 "과거 Snapshot 대체 금지" 정면 반례**. Version 행은 **append-only**, `effective_to` **폐쇄**로 종료하고 **물리 삭제·덮어쓰기 금지**.
- 🔴 **`recorded_by` 를 `Alerting::actor:33-36` 으로 채우지 마라** — `X-User-Email` 헤더/`?actor=` 쿼리/`'unknown'` 폴백 = **289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴**. 참조 구현은 **`Mapping::actorId:36-53`**(3분기 · 미확인 null `:52` → **403 fail-closed** `:187-190`·`:246-250`).
  - ⚠️**관찰(등급 미부여)**: `Mapping::actorId` 도 **동일인이 API키/세션 경로로 접근하면 actor 문자열이 다르다** → dedup(`:279`)·자기승인 차단(`:268`)이 **경로 전환으로 우회 가능**. **실 경합 경로 미검증.**
- **MySQL/SQLite 두 방언 수기 중복 작성 의무** — `ensureTables` 경로에 방언 자동 변환 없음.
- 🔴 19종 **"있다고 가정"하고 배선 금지.**
