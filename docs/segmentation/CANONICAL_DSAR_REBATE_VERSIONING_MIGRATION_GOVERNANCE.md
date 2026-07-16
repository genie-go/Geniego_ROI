# CANONICAL DSAR — Rebate Versioning & Migration Governance (Version·Snapshot·Diff·Supersession·Amendment·Migration·Backfill·Reconciliation·Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md`](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md)(State/Transition/Approval/Effectiveness/Sunset/Grandfathering) + 본 문서(Version/Snapshot/Diff/Supersession/Migration/Backfill/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md).
> 선행: Program Master(4-5-3-1-1 §6.8 위임)·Type/Classification(4-5-3-1-2 §Historical Classification 보존)·Funding(4-5-3-1-3 §4.9 Historical Agreement 보존·§33 Float 금지).
> **범위**: Program/Version/Scope/Rule 참조의 버전·마이그레이션 거버넌스만 — Rule 계산/Claim/Settlement/Payout 실행 아님(후속 선행설계 R1~R5).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Version / Migration 엔진** | ❌ **부재(grep 0·`rebate` 전무)** | **NOT_APPLICABLE → 신설** |
| **Snapshot + Version + Rollback 지점** | ✅ **REAL** — menu_defaults(snapshot_data JSON·**version VARCHAR(32)**·created_at·[AdminMenu.php:119-120](../../backend/src/Handlers/AdminMenu.php))·**baseline 1회 캡처**(:294-308·"reset 롤백 지점")·최신 스냅샷 복원(:584)·audit snapshot_version(:625/641) | **재사용(§22 Snapshot·§30 Rollback)** |
| **Supersession(구버전 마감·결과 제외)** | ✅ **REAL** — catalog_writeback_job `status='superseded'`([Catalog.php:1188](../../backend/src/Handlers/Catalog.php))·신규가 미완료 잡 마감(:394/588)·**"superseded 결과를 읽으면 해결된 오류가 계속 표시된다"→판정 제외**(:1871-1873)·★1187 회귀 교훈(미처리 잡 삭제 금지) | **재사용(§25 Supersession·물리 삭제 대신 상태 마감)** |
| **Effective-dated Version** | ✅ **REAL** — kr_fee_rule.effective_from([KrChannel.php:102](../../backend/src/Handlers/KrChannel.php)/128/140/151/459) | **재사용(§21 Version Validity)** ·★§0 관찰(as-of 미적용) |
| **Migration Ledger·Rollback·Dry-run** | ✅ **REAL** — `schema_migrations` 원장(기적용 skip)·**`-- @rollback` 블록 + record 제거**·`--dry-run`(적용 예정 식별만)·[bin/migrate.php:13](../../backend/bin/migrate.php)/15/48/112/150 | **재사용(§27~§30 정본)** |
| **Idempotent 진화(마이그레이션 이후)** | ✅ **REAL** — migrations **21파일·172차 정지**·이후 스키마 변경=핸들러별 self-healing `ensureTables`/`CREATE TABLE IF NOT EXISTS` **73 핸들러** | **재사용(§29 Idempotent Execution)** |
| **Version Gate(의도적 변경 승인)** | ✅ **REAL** — `.githooks/baseline.json` sacred SHA(의도적 변경 시 갱신+`--no-verify`·267차 교훈) | **참조(§35 Guard·승인된 변경만)** |
| **Rebate Version/Type/Snapshot/Diff/Change Classification/Amendment/Correction/Migration Plan/Backfill/Recalculation Guard/Reconciliation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Versioning/Migration 엔진은 부재(NOT_APPLICABLE)**. 실 인접=Snapshot/Rollback(menu_defaults **version+snapshot_data+복원**)·Supersession(catalog_writeback_job **상태 마감·결과 제외**)·Effective-dated Version(kr_fee_rule)·**Migration Ledger/Rollback/Dry-run(migrate.php 정본)**·Idempotent Self-healing(73 핸들러)·Version Gate(baseline.json). **★핵심 정직: §4.7 Version≠Amendment≠Correction·§4.10 Backfill≠Recalculation·§4.13 Version 물리 삭제 금지(Append-only)·§4.11 Snapshot 불변**. **기존 menu_defaults/migrate.php/ensureTables 재사용(중복 금지·§40)**·지어내기·NO_DATA/오탐 금지·전방호환 계약.

---

## 1. Canonical Entity (21) — §5 (이번 블록)

REBATE_PROGRAM_VERSION·VERSION_TYPE·VERSION_SNAPSHOT·VERSION_DIFF·CHANGE_CLASSIFICATION·VERSION_SUPERSESSION·AMENDMENT·CORRECTION·VERSION_APPROVAL_REFERENCE·VERSION_PIN·MIGRATION_PLAN·MIGRATION_EXECUTION·MIGRATION_STEP·MIGRATION_ROLLBACK·MIGRATION_DRY_RUN_RESULT·BACKFILL_PLAN·BACKFILL_EXECUTION·LEGACY_MAPPING·VERSION_RECONCILIATION·VERSION_EVIDENCE·VERSION_AUDIT_EVENT.
**현행 실체**: Snapshot(menu_defaults)·Supersession(catalog_writeback_job)·Migration Plan/Execution/Rollback/Dry-run(migrate.php+schema_migrations) = REAL 재사용. 나머지 = **신설**.

## 2. Program Version (§20) · Version Type (§21) · Snapshot (§22) ★불변

- **Version(§20)**: rebate_program_version_id·program·**version_number(단조 증가)·version_label·version_type·parent_version_id·supersedes_version_id·effective_from/to·approval reference·author·created_at·published_at·state(DRAFT/APPROVED/PUBLISHED/SUPERSEDED/ROLLED_BACK)·snapshot reference·diff reference·change_classification·rollback_reference·immutable_hash**·evidence. **★§4.1 State≠Version 재확인(Lifecycle 문서 §6)·★Version 삭제/덮어쓰기 금지(Append-only·새 Version 생성만)**.
- **Version Type(§21, 12)**: INITIAL·RULE_CHANGE·TIER/THRESHOLD_CHANGE·FUNDING_CHANGE·SCOPE_CHANGE·CLASSIFICATION_CHANGE·ELIGIBILITY_CHANGE·CLAIM_POLICY_CHANGE·SETTLEMENT_CHANGE·CORRECTION·PROVIDER_SYNC·MIGRATION. **Validity**: effective_from/to(kr_fee_rule effective_from 재사용·**effective_to 명시**)·**as-of 조회 계약(§12 Lifecycle)**.
- **Snapshot(§22)**: version_snapshot_id·version·**snapshot_data(전체 Program 정의 구조 — Master/Scope/Type/Funding/Rule reference)·snapshot_hash·captured_at·captured_by·source(MANUAL/AUTO_PRE_CHANGE/BASELINE)·restore 가능 여부**·evidence. **★현행 정본 재사용**: menu_defaults(snapshot_data JSON+version+created_at·AdminMenu.php:119-120)·**baseline 1회 캡처=롤백 지점 확보**(:294-308·282차 "reset 항상 404" 근본수정 교훈=**스냅샷 없으면 롤백 불가**)·복원 시 audit에 snapshot_version 기록(:625/641). **★§4.11 Snapshot 불변(발행 후 수정 금지·재캡처=새 Snapshot)·계약 원문 복제 금지(4-5-3-1-3 §9 계승·Authorized Reference)**.

## 3. Diff (§23) · Change Classification (§24) · Supersession (§25)

- **Diff(§23)**: version_diff_id·from/to version·**changed field paths·before/after value(민감·계약 원문 제외)·change type(ADD/MODIFY/REMOVE)·impact scope(참여자/Accrual/Claim/Settlement 영향)·breaking 여부·영향 추정 건수**·generated_at·evidence. **★Diff 없는 Version 발행 금지(무엇이 바뀌었는지 불명 = 승인 불가)**.
- **Change Classification(§24, 9)**: NON_BREAKING·BREAKING·FAVORABLE(참여자 유리)·UNFAVORABLE(참여자 불리)·NEUTRAL·CORRECTIVE·COMPLIANCE_MANDATED·PROVIDER_FORCED·EMERGENCY. **★UNFAVORABLE/BREAKING=Grandfathering 정책 필수(Lifecycle §18)·통지 정책 필수·소급 적용 금지**.
- **Supersession(§25)**: supersession_id·superseded/superseding version·**superseded_at·사유·in-flight 처리(Lifecycle §19 pinning)·구버전 결과 판정 제외 여부**·evidence. **★현행 정본 재사용**: catalog_writeback_job(Catalog.php:1188 `status='superseded'`·**신규가 기존 미완료 마감**·:1871-1873 **superseded는 결과 판정에서 제외**="해결된 오류가 계속 표시" 방지·**:1187 회귀 교훈=미처리 잡 물리 삭제 금지**). Rebate: **구 Version 물리 삭제 금지·SUPERSEDED 상태 마감+판정 제외(§4.13)**.

## 4. Amendment (§26a) · Correction (§26b) ★개정≠정정

- **Amendment(§26a)**: amendment_id·program·version·**개정 대상(Rule/Funding/Scope/Term)·계약 Amendment Reference(4-5-3-1-3 §9 amendment_reference 연결)·effective_from(장래효)·approval·통지**·evidence. **개정=장래를 향한 조건 변경 → 새 Version + 새 Effectiveness Window·과거 거래 불변**.
- **Correction(§26b)**: correction_id·target version·**정정 사유(데이터 입력 오류/Provider 오보/계산 오류)·정정 범위·소급 여부·영향 받은 Accrual/Claim 목록·역분개/재정산 참조·approval**·evidence. **정정=과거 사실의 오류 수정 → 소급 가능하되 반드시 ①승인 ②영향 목록 ③역분개(Append-only·OrderHub 역분개 패턴·4-5-2-5 Reversal 정합) ④Audit**. **★§4.7 Amendment≠Correction — 개정을 정정으로 위장해 과거 소급 금지·정정을 개정으로 위장해 오류 은폐 금지. ★정정도 원본 Version 덮어쓰기 금지(새 Version+역분개)**.

## 5. Migration Plan (§27) · Execution (§28·§29) · Rollback (§30) ★migrate.php 정본

- **Plan(§27)**: migration_plan_id·**migration_type·source(legacy/provider/구 Version)·target·대상 건수·단계(step) 목록·dry-run 결과 reference·rollback plan·승인·실행 창(window)·중단 기준·데이터 검증 기준**·status·evidence. Type(9): PROGRAM_ONBOARDING·PROVIDER_MIGRATION·VERSION_MIGRATION·LEGACY_IMPORT·SCHEMA_EVOLUTION·TENANT_MIGRATION·LEGAL_ENTITY_MIGRATION·CONSOLIDATION·SPLIT.
- **Dry-run(§28)**: **★현행 정본 재사용** — migrate.php `--dry-run`(:13 "적용 예정 식별만·DB 변경 없음"). Rebate: **Migration 실행 전 dry-run 결과(영향 건수·충돌·검증 실패) 없이 실행 금지**.
- **Execution(§29)**: migration_execution_id·plan·**step·started/finished_at·처리/성공/실패 건수·idempotency_key·중단 사유·재실행 안전성**·status·evidence. **★현행 정본 재사용**: `schema_migrations` 원장(**기적용 skip**·migrate.php:48)=**멱등 실행 원장**·self-healing `ensureTables` 73 핸들러(**CREATE TABLE IF NOT EXISTS**=재실행 안전). **★Migration은 멱등(재실행 시 중복 생성/이중 반영 금지)·원장에 기록되지 않은 실행 금지**.
- **Rollback(§30)**: migration_rollback_id·execution·**rollback SQL/절차 reference·rollback 사유·복원 Snapshot reference·rolled_back_at·approver**·evidence. **★현행 정본 재사용**: migrate.php `-- @rollback` 블록 적용 + **schema_migrations record 제거**(:15)·`[검토] @rollback 블록 SQL 사전 확인`(:112). menu_defaults baseline=**복원 지점**(AdminMenu.php:294-308). **★Rollback 계획/복원 지점 없는 Migration 실행 금지(282차 "스냅샷 없어 reset 404" 교훈)**.

## 6. Backfill (§31) · Recalculation 금지 (§32) ★Backfill≠Recalculation

- **Backfill Plan/Execution(§31)**: backfill_plan_id·program·**대상 기간·대상 Scope/Participant·backfill 사유(중단기간 소급/누락 수집/Provider 지연 데이터)·적용 Version(as-of)·예상 건수·승인·dry-run·rollback**·status·evidence. **★Backfill=누락된 과거 사실을 "그 시점 Version"으로 뒤늦게 생성**(Lifecycle §14 Resumption 소급 정책 연결).
- **Recalculation Guard(§32)**: **★§4.10 Backfill≠Recalculation — 현재 Version으로 과거 거래를 재계산해 기존 Accrual/Claim/Settlement 값을 덮어쓰는 행위 금지**. 허용: ①as-of Version 기반 신규 생성(Backfill) ②승인된 Correction(§26b·역분개+Append-only). 금지: 무승인 일괄 재계산·기존 원장 UPDATE·in-flight Claim 신버전 재계산(Lifecycle §19). **★실 사례(§0 관찰)**: KrChannel:459가 거래일 무관 최신 kr_fee_rule 1건으로 과거 정산라인 재검증 — **Rebate Version 엔진은 as-of 조회를 계약으로 강제**(§21·Lifecycle §12). **Float 금지(Decimal·4-5-3-1-3 §33 계승)**.
- **Legacy Mapping(§31b)**: legacy_mapping_id·legacy program/version id·canonical program/version id·**mapping confidence·mapping method·검증 상태**·evidence. **★이름만 EXACT 매핑 금지(4-5-3-1-2 계승)·미검증 매핑으로 Accrual 생성 금지**.

## 7. Reconciliation (§33) · Critical Gap (§34) · Lint/Guard (§35) · Error/Warning (§36)

- **Reconciliation(§33, 18)**: State↔Version·Version↔Snapshot(hash)·Version↔Diff·Version↔Approval·Effectiveness↔Transition·Internal State↔**Provider Actual State**(auto_campaign 정본)·Version↔Supersession·Grandfathered↔Pinned Version·In-flight↔Pinned Version·Migration↔Ledger·Migration↔Rollback·Backfill↔as-of Version·Correction↔역분개·Legacy↔Canonical·Historical↔Applied·Scope↔Version·Funding Agreement↔Version·Provider↔Internal Drift.
- **Critical Gap(§34, 16)**: 승인 없이 PUBLISHED·Snapshot 없는 Version·Diff 없는 Version·**Internal/Provider State 발산**·Terminal 재전이·**과거 거래 현재 Version 재계산**·in-flight 미보호 Terminal 전이·UNFAVORABLE 변경에 Grandfathering 부재·Effectiveness 중첩/공백(동일 시점 2+ 유효 Version 또는 0건)·Version 물리 삭제·Rollback 계획 없는 Migration·dry-run 없는 Migration·멱등성 없는 재실행·Backfill 무승인·미검증 Legacy Mapping·Cross-Tenant/Wrong Legal Entity Version. → **Access Review 차단**.
- **Lint/Guard(§35)**: Static Lint(Version 직접 UPDATE/DELETE 금지·as-of 없는 유효 Version 조회 금지·Float 금지·Snapshot 미기록 발행 금지)·Runtime Guard(auth_tenant row-level 재사용·UNIQUE(program, version_number)·Idempotency Key·**Terminal/Provider push Guard**·승인 만료 검증)·CI(**tools/e2e smoke 계약키 가드 확장**·route check·php -l). **기존 게이트 재사용**: baseline.json sacred SHA(의도적 변경만)·CHANGE_GATE 5중 게이트·registry 갱신 의무.
- **Error(§36a, 19)**: VERSION_NOT_APPROVED·SNAPSHOT_MISSING·DIFF_MISSING·EFFECTIVENESS_OVERLAP/GAP·STATE_PROVIDER_DIVERGENCE·TERMINAL_STATE_TRANSITION·HISTORICAL_RECALCULATION_BLOCKED·IN_FLIGHT_UNPROTECTED·GRANDFATHERING_REQUIRED·VERSION_DELETE_BLOCKED·MIGRATION_NO_ROLLBACK·MIGRATION_NO_DRYRUN·MIGRATION_NOT_IDEMPOTENT·BACKFILL_NOT_APPROVED·LEGACY_MAPPING_UNVERIFIED·CROSS_TENANT_VERSION·WRONG_LEGAL_ENTITY·FLOAT_ARITHMETIC·APPROVAL_EXPIRED. **Warning(§36b, 12)**: PROVIDER_STATE_STALE·SNAPSHOT_HASH_DRIFT·VERSION_LABEL_DUPLICATE·SUNSET_NOT_ANNOUNCED·GRACE_PERIOD_ENDING·SUSPENSION_LONG_RUNNING·MIGRATION_PARTIAL·BACKFILL_LARGE_SCOPE·LEGACY_MAPPING_LOW_CONFIDENCE·EFFECTIVE_TO_NULL_UNBOUNDED·PENDING_APPROVAL_STALE·PROVIDER_API_VERSION_SUNSET.

## 8. Version Matrix (§45) · Migration Matrix (§46) — 현행

| Program | Version | Type | Effective From/To | Snapshot | Diff | Approval | Supersedes | State | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Version) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): 메뉴트리 기본값 | version VARCHAR(32) | BASELINE | created_at(만료 없음) | **snapshot_data JSON** | N/A | N/A | 최신 1건 복원 | N/A | menu_defaults(:119/584) |
| 인접(재사용): 마켓 수수료 룰 | (행별) | RULE_CHANGE | **effective_from**(to 부재) | N/A | N/A | N/A | ORDER BY DESC | N/A | kr_fee_rule(:151) |
| 인접(재사용): 카탈로그 잡 | (잡별) | N/A | N/A | payload | N/A | N/A | **status='superseded'** | 판정 제외 | catalog_writeback_job(:1188/1871) |

| Migration | Ledger | Dry-run | Rollback | Idempotent | 승인 | 현행 정본 |
|---|---|---|---|---|---|---|
| (Rebate Migration) | — | — | — | — | — | **N/A(신설)** |
| 인접(재사용): 스키마 | **schema_migrations**(기적용 skip) | **--dry-run** | **`-- @rollback`+record 제거** | CREATE IF NOT EXISTS | 수동 실행 | migrate.php(:13/15/48) |
| 인접(재사용): 자가치유 | (원장 없음·선언적) | N/A | N/A | **ensureTables 73 핸들러** | N/A | 172차 이후 정본 |
