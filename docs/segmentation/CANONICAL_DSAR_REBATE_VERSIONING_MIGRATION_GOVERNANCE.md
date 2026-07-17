# CANONICAL DSAR — Rebate Versioning & Migration Governance (Version·Component·Effective Period·Conflict·Migration Plan/Scope/Mapping/Batch/Execution/Validation/Rollback·Historical Binding·In-flight·Reconciliation·Lint/Guard·Evidence/Audit·기존구현 분류)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.0(스펙 v1.0 기준 확장)
> 정본 쌍: [`CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md`](CANONICAL_DSAR_REBATE_PROGRAM_LIFECYCLE.md)(State/Transition/Change Set/Amendment/Impact/Approval/Activation/중단/종료/Supersession/Archive/Delete/Restore) + 본 문서.
> ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md).
> 선행: Program Master(4-5-3-1-1 §6.8 위임)·Type(4-5-3-1-2 **Historical Classification 보존**)·Funding(4-5-3-1-3 **§4.9 Historical Agreement 보존·§33 Float 금지**).
> **범위**: Version·Migration 거버넌스만 — Rule 계산/Claim/Settlement/Payout 실행 아님. 전체 Lint/Guard **Certification**=1-7·Golden=1-8·Legacy Equivalence=1-9(본 블록은 **최소 Lint/Guard**만·§44/§45).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 스펙 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Version / Migration 엔진** | ❌ **부재(grep 0·`rebate` 전무)** | **NOT_APPLICABLE → 신설** |
| **Snapshot + Version + Rollback 지점** | ✅ **REAL** — menu_defaults(snapshot_data JSON·**version VARCHAR(32)**·created_at·[AdminMenu.php:119-120](../../backend/src/Handlers/AdminMenu.php))·**baseline 1회 캡처**(:294-308·"reset 롤백 지점")·최신 복원(:584)·audit snapshot_version(:625/641) | **재사용(§11 Component·§22 Snapshot·§37 Rollback)** |
| **Supersession(구버전 마감·결과 제외)** | ✅ **REAL** — catalog_writeback_job `status='superseded'`([Catalog.php:1188](../../backend/src/Handlers/Catalog.php))·**"superseded 결과를 읽으면 해결된 오류가 계속 표시된다"→판정 제외**(:1871-1873)·★1187 회귀(미처리 잡 삭제 금지) | **재사용(Lifecycle §26·물리 삭제 대신 상태 마감)** |
| **Effective-dated Version** | ✅ **REAL** — kr_fee_rule.effective_from([KrChannel.php:102](../../backend/src/Handlers/KrChannel.php)/128/140/151/459) | **재사용(§10 Version·§12 Effective Period)** ·★§0 관찰 |
| **★Migration Framework(Ledger·Rollback·Dry-run)** | ✅ **REAL** — `schema_migrations` 원장(기적용 skip)·**`-- @rollback` 블록 + record 제거**·`--dry-run`(적용 예정 식별만)·[bin/migrate.php:13](../../backend/bin/migrate.php)/15/48/112/150 · migrations **21파일·172차 정지** | **재사용(§30·§35·§37 정본)** |
| **Idempotent 진화(마이그레이션 이후)** | ✅ **REAL** — 핸들러별 self-healing `ensureTables`/`CREATE TABLE IF NOT EXISTS` **73 핸들러** | **재사용(§35 Idempotency)** |
| **Version Gate(의도적 변경 승인)** | ✅ **REAL** — `.githooks/baseline.json` sacred SHA(의도적 변경 시 갱신+`--no-verify`·267차 교훈) | **참조(§44 Lint·승인된 변경만)** |
| **Data Backfill / Dual Run / Shadow** | ❌ **부재** — 배치 마이그레이션 프레임워크(건수/금액 검증·batch·checkpoint) 전무 | **NOT_APPLICABLE → 신설(§31·§34·§36)** |
| **Rebate Version/Component/Change Set/Migration 7종/Historical Binding/In-flight/Reconciliation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Versioning/Migration 엔진은 부재(NOT_APPLICABLE)**. 실 인접=Snapshot/Rollback(menu_defaults **version+snapshot_data+복원**)·Supersession(catalog_writeback_job **상태 마감·판정 제외**)·Effective-dated(kr_fee_rule)·**Migration Ledger/Rollback/Dry-run(migrate.php 정본)**·Idempotent(73 핸들러)·Version Gate(baseline.json). **★부재 확정(신설)**: **Batch/Checkpoint/건수·금액 Validation/Dual Run/Shadow·Feature Flag·Deployment/Incident Registry**(스펙 §3 선행조건이나 실측 부재·지어내기 금지). **★핵심 정직: §4.7 Version≠Amendment≠Correction·§4.10 Backfill≠Recalculation·§4.13 Version 물리 삭제 금지(Append-only)·§4.11 Snapshot 불변·§4.4 Program Version≠Rule Version**. 전방호환 계약.

---

## 1. Program Version (§10) · Type · Status ★Program Version≠Rule Version

- **Version(§10)**: rebate_program_version_id·rebate_program_id·**version_number·semantic_version·previous_version_id·supersedes_version_id·rollback_of_version_id·correction_of_version_id·version_type·version_status·change_set_id·amendment_id·effective_from·effective_to·created_at·recorded_at·approved_at·scheduled_at·activated_at·retired_at·created_by·approved_by·immutable_payload_hash·source_of_truth_reference**·evidence.
- **Type(§10b, 12)**: INITIAL·MINOR·MAJOR·PATCH·CORRECTION·AMENDMENT·EMERGENCY·MIGRATION·ROLLBACK·PROVIDER_SYNC·LEGACY_IMPORT·RESTORATION.
- **Status(§10c, 13)**: DRAFT·VALIDATION_PENDING·VALIDATED·REVIEW_PENDING·APPROVAL_PENDING·APPROVED·SCHEDULED·ACTIVE·SUPERSEDED·RETIRED·REJECTED·ROLLED_BACK·ARCHIVED·BLOCKED.
**★§4.4 Program Version≠Rule Version**(Program Version=전체 운영 구조·Rule Version=계산/자격/한도 상세 → **각 거래에 둘 다 기록**·§38 Historical Binding). **★§4.3 과거 Version 덮어쓰기 금지** — 기존 Version 수정·삭제 대신 **New/Correction/Amendment/Superseding/Rollback Version**. **★Approved Version=Immutable**(`immutable_payload_hash` 필수·§44 Lint).

## 2. ★Version Component (§11) — Snapshot/Reference

- **Component(§11)**: component_id·version_id·**component_type·component_reference·component_version·component_hash·inherited·overridden·effective_from·effective_to**·evidence.
- **Component Type(23)**: Program Master·Classification·Program Scope·Participant Scope·Beneficiary Scope·Claimant Scope·Sponsor·Funding Agreement·Funding Model·Funding Allocation·Economic Responsibility·Contract Reference·Country·Currency·Environment·Source of Truth·Parent·Child Relationship·Successor·Predecessor Relationship·Operational Configuration·Feature Flag(★부재→신설)·Rule Set Reference·Notification Policy Reference·Migration Policy Reference.
**★현행 정본 재사용**: menu_defaults(**snapshot_data JSON + version + created_at**·AdminMenu.php:119-120)=Snapshot 구조·**baseline 1회 캡처=롤백 지점**(:294-308). **★§4.11 Snapshot 불변**(발행 후 수정 금지·재캡처=새 Snapshot)·**계약 원문 복제 금지**(4-5-3-1-3 §9 Authorized Reference 계승·`component_reference`+`component_hash`만).

## 3. Effective Period (§12) · ★Version 충돌 규칙 (§13)

- **Effective Period(§12)**: effective_period_id·program·version_id·**timezone(현행 DEFAULT_TZ 'Asia/Seoul' 정합)·start_at·end_at·inclusive_start·inclusive_end·transaction_cutoff_at·claim_submission_cutoff_at·accrual_cutoff_at·settlement_cutoff_at·payout_cutoff_at·grace_period·late_processing_policy**·status·evidence.
**★§4.5 Effective Time≠Recorded Time** — created_at·recorded_at·approved_at·scheduled_at·effective_from·effective_to·activated_at·paused_at·terminated_at·archived_at **전부 분리**. **★as-of 조회 계약**: 시점 t의 유효 Version=`effective_from <= t AND (effective_to IS NULL OR t < effective_to)`. **NULL end=무기한**(free_coupons valid_until 규약 계승·CouponRedeem.php:67). **★§4.6 미래 Version 조기 적용 금지**(Scheduled Version은 effective_from 전까지 신규 거래 미적용·§45 Guard).
- **★충돌 규칙(§13, 8)** — 다음을 차단: **동일 Program의 겹치는 Active Version**·**동일 Effective Time에 2+ Current Version**·종료일<시작일·Parent/Child Version 비호환 Scope·**Program Version↔Funding Agreement Validity 불일치**·**Program Version↔Contract Validity 불일치**·Program Version↔Currency Scope 불일치·**Program Version↔Provider Account Environment 불일치**.

## 4. Migration Plan (§30) · Cutover 전략 (§31) ★Migration≠데이터 복사

- **★§4.9 Migration≠데이터 복사** — Source·Target·Mapping·Eligibility·Exclusion·Validation·Cutover·Rollback·Reconciliation·Evidence **전부 포함해야 Migration**.
- **Plan(§30)**: migration_plan_id·**source_program/version·target_program/version·migration_type·migration_reason·migration_scope·cutover_strategy·freeze_window·start_at·target_cutover_at·rollback_window·source_of_truth_switch·provider_coordination·data_backfill_requirement·dual_run_requirement·shadow_validation_requirement·approval_reference·owner**·status·evidence. **Type(15)**: VERSION_UPGRADE·PROGRAM_REPLACEMENT·PROGRAM_CONSOLIDATION·PROGRAM_SPLIT·PROVIDER_MIGRATION·**TENANT_MIGRATION**·WORKSPACE_MIGRATION·**LEGAL_ENTITY_MIGRATION**·CONTRACT_MIGRATION·FUNDING_MIGRATION·CURRENCY_MIGRATION·REGION_MIGRATION·LEGACY_MIGRATION·DATA_MODEL_MIGRATION·EMERGENCY_MIGRATION.
- **Cutover(§31, 13)**: BIG_BANG·PHASED·TENANT_BY_TENANT·REGION_BY_REGION·PROGRAM_BY_PROGRAM·CONTRACT_BY_CONTRACT·PRODUCT_BY_PRODUCT·CLAIM_COHORT·TRANSACTION_DATE·**DUAL_RUN**·**SHADOW**·READ_ONLY_LEGACY·MANUAL. **★대규모·고위험 Migration은 기본 Dual Run 또는 Phased 검토**(§45 "Rollback Window Expired"·§43 "Rollback 불가 고위험 Cutover"=Critical). **★현행 부재→신설**(Dual Run/Shadow 프레임워크 없음).

## 5. Migration Scope (§32) · Mapping (§33)

- **Scope(§32)**: migration_scope_id·migration_plan·**entity_type·inclusion_criteria·exclusion_criteria·date_range·tenant_scope·legal_entity_scope·status_scope·expected_record_count·expected_amount_reference·currency·migration_order·dependency**·evidence. **Entity(26)**: Program Master·Program Version·Scope·Classification·Sponsor·Funding·Contract·Participant·Beneficiary·Claimant·Rule Reference·Eligibility Reference·Claim·Accrual·Liability·Budget·Commitment·Reservation·Settlement·Credit Memo·Debit Memo·Payout·Recovery·Dispute·Audit·Reporting History.
- **Mapping(§33)**: mapping_id·migration_plan·**source/target entity type·id·version·mapping_type·transformation_rule·default_value_policy·unmapped_value_policy·identity_mapping·currency_mapping·funding_mapping·status_mapping·historical_binding_policy·confidence·review_requirement**·status·evidence. **Type(9)**: ONE_TO_ONE·ONE_TO_MANY·MANY_TO_ONE·MANY_TO_MANY·SPLIT·CONSOLIDATE·REFERENCE_ONLY·**NO_MIGRATION**·MANUAL. **★Mapping 누락 시 Migration 실행 금지(§43 Critical·§45 Guard)·이름만 EXACT 매핑 금지**(4-5-3-1-2 계승)·**미검증 매핑으로 Claim/Accrual 생성 금지**.

## 6. ★Migration Batch (§34) · Execution (§35) · Validation (§36) · Rollback (§37)

- **Batch(§34)**: migration_batch_id·plan·**batch_sequence·entity_type·tenant·legal_entity·date_range·expected_count·actual_count·expected_amount·actual_amount·currency·started_at·completed_at·error_count·warning_count·retry_count**·status·evidence. **Status(12)**: PLANNED·READY·RUNNING·PARTIALLY_COMPLETED·COMPLETED·VALIDATION_PENDING·VALIDATED·FAILED·RETRYING·ROLLBACK_PENDING·ROLLED_BACK·BLOCKED. **★batch를 뭉뚱그려 성공/실패 표기 금지(건별 기록)**(288차 가짜녹색 정합).
- **★Execution(§35)**: execution_id·plan·batch·**execution_attempt·source_checkpoint·target_checkpoint·started_at·completed_at·records_read·records_transformed·records_written·records_skipped·records_failed·financial_total_before·financial_total_after·currency·idempotency_key·execution_hash**·status·evidence. **★현행 정본 재사용**: `schema_migrations` 원장(**기적용 skip**·migrate.php:48)=**멱등 실행 원장**·`ensureTables` **CREATE IF NOT EXISTS**(재실행 안전·73 핸들러). **★Migration 재실행으로 중복 Claim/Accrual/Liability/Settlement/Payout 생성 금지(Idempotency Key 강제·§44 Lint)·원장 미기록 실행 금지**.
- **★Dry-run(§35b)**: **현행 정본** migrate.php `--dry-run`(:13 "적용 예정 식별만·DB 변경 없음"). **★dry-run 결과(영향 건수·충돌·검증 실패) 없이 Migration 실행 금지**.
- **★Validation(§36)**: validation_id·plan·batch·**validation_type·source_result·target_result·difference·tolerance·severity·passed·validated_at·validator·resolution**·evidence. **검증 항목(25)**: Record Count·**Financial Amount**·Currency·Program Binding·Version Binding·**Tenant**·**Legal Entity**·Contract·Funding Allocation·Participant·Beneficiary·Claimant·Claim Status·Accrual Status·Liability·Settlement·Payout·Historical Timestamp·Audit Lineage·Duplicate·**Missing Mapping**·Orphan Record·Provider Result·Customer Portal Result·Reporting Result. **★Critical Validation 실패 시 Cutover 완료 금지 → Rollback 또는 Manual Review 전환**.
- **★Rollback(§37)**: rollback_id·plan·execution·**rollback_reason·rollback_scope·requested_by·approved_by·started_at·completed_at·source_restore_checkpoint·target_reversal_checkpoint·records_reverted·financial_entries_reversed·feature_flag_result·source_of_truth_restored·integrity_result**·status·evidence. **★현행 정본 재사용**: migrate.php **`-- @rollback` 블록 적용 + schema_migrations record 제거**(:15)·`[검토] @rollback 블록 SQL 사전 확인`(:112)·menu_defaults baseline=**복원 지점**(AdminMenu.php:294-308). **★Rollback은 단순 Target 삭제가 아니다** — 필요 시 **Reversal·Correction·Restoration Event 생성**(Append-only)·**Rollback 계획/복원 지점 없는 Migration 실행 금지**(282차 "스냅샷 없어 reset 404" 교훈).

## 7. ★Historical Binding (§38) · In-flight Policy (§39)

- **★Historical Binding(§38)**: 각 거래/업무에 **고정**: rebate_program_id·**rebate_program_version_id**·**rule_version_reference**·classification_version·funding_agreement_version·funding_allocation_version·contract_version·participant_identity_version·beneficiary_identity_version·claimant_authorization_version·currency_policy_version·source_of_truth_version·**effective_at·recorded_at**·evidence. **★§4.10 Historical Transaction을 현재 Program으로 자동 재귀속 금지** — 기존 거래는 **당시 적용된 Program·Version·Rule·Funding Agreement 유지**·**현재 Version으로 과거 Binding 덮어쓰기/재계산 금지**(§43 Critical·§44 Lint·§45 Guard). **★실 사례(§0 관찰)**: KrChannel:459가 거래일 무관 최신 kr_fee_rule로 과거 정산라인 재검증 → **Rebate는 as-of 조회를 계약으로 강제**.
- **In-flight Policy(§39)**: inflight_policy_id·program·**source_version·target_version·entity_type·handling_policy·cutoff_at·reevaluation_requirement·notification_requirement·accounting_impact**·status·evidence. **대상(10)**: Pending Eligibility·Pending Claim·Submitted Claim·Approved Claim·Pending Accrual·Approved Accrual·Settlement Pending·Payout Pending·Dispute·Recovery. **처리(9)**: KEEP_SOURCE_VERSION·MOVE_TO_TARGET_VERSION·REEVALUATE·**GRANDFATHER**·CANCEL·COMPLETE_THEN_MIGRATE·MANUAL_REVIEW·SPLIT_BY_EFFECTIVE_DATE·CUSTOM. **★In-flight Policy 없는 Termination/Migration 금지(§44)·Terminal 전이가 in-flight 무단 폐기 금지·진행 중 Claim을 신버전으로 재계산 금지(§38 정합)**.

## 8. Provider·Internal Version Reconciliation (§40·§41)

- **비교 대상(§40, 12)**: Provider Program Version↔Internal Version·Provider Effective Date↔Internal Effective Date·Provider Status↔Internal Lifecycle·Contract Amendment↔Program Version·Scope Version↔Applied Scope·Funding Agreement Version↔Applied Funding·Currency Version↔Applied Currency·Source of Truth Version↔Warehouse Copy·**Scheduled Activation↔Actual Activation**·Program Termination↔Provider Termination·**Migration Source Count↔Target Count**·Historical Binding↔Current Mapping.
- **상태(§41, 19)**: MATCH·PROVIDER_VERSION_MISMATCH·EFFECTIVE_DATE_MISMATCH·STATUS_MISMATCH·CONTRACT_AMENDMENT_MISMATCH·SCOPE_VERSION_MISMATCH·FUNDING_VERSION_MISMATCH·CURRENCY_VERSION_MISMATCH·SOURCE_OF_TRUTH_VERSION_MISMATCH·ACTIVATION_TIMING_MISMATCH·TERMINATION_MISMATCH·**MIGRATION_COUNT_MISMATCH**·**MIGRATION_AMOUNT_MISMATCH**·HISTORICAL_BINDING_MISMATCH·**MULTIPLE_ACTIVE_VERSION**·VERSION_GAP·VERSION_OVERLAP·MANUAL_REVIEW·BLOCKED. **★현행 정본**: auto_campaign kill-switch(Internal≠Provider 발산 금지·AutoCampaign.php:602-609).

## 9. 최소 Static Lint (§44) · Runtime Guard (§45) — 전체 Certification=1-7

- **Lint(§44, 20)**: Active Program에 Active Version 없음·**동일 기간 다중 Active Version**·Effective From 없는 Version·**Immutable Hash 없는 Approved Version**·**Version 없이 Program 변경**·**Program Version과 Rule Version 혼용**·**Recorded Time과 Effective Time 혼용**·Approval Reference 없는 Activation·**Rollback Plan 없는 Critical Change**·**Impact Assessment 없는 Breaking Change**·**In-flight Policy 없는 Termination·Migration**·Historical Binding 없는 Transaction·**Future Version 조기 적용**·**Current Version으로 과거 거래 덮어쓰기**·**Hard Delete 기본 사용**·**Migration Idempotency 누락**·Migration Validation 누락·Source·Target Tenant 검증 누락·**Evidence 없는 Emergency Change**·기존 Version Registry 중복 생성.
- **Guard(§45, 21)**: Invalid Lifecycle Transition·**Unapproved Activation**·Multiple Active Version·Expired Version·**Future Version Early Use**·Wrong Program Version·**Cross-Tenant Version**·Wrong Environment·Suspended Program Transaction·**Emergency Disabled Program Transaction**·Terminated Program New Claim·Archived Program Mutation·Deleted Program Operation·Migration Scope Mismatch·**Migration Mapping Missing**·**Migration Financial Mismatch**·**Wrong Legal Entity Migration**·Rollback Window Expired·Provider Version Conflict·Critical Lifecycle Drift·Kill Switch 활성. **재사용**: auth_tenant row-level·UNIQUE(program, version_number)·Idempotency Key·baseline.json sacred SHA·CHANGE_GATE 5중 게이트·`npm run e2e` smoke.

## 10. Error (§46) · Warning (§47) · Evidence (§48) · Audit Event (§49)

- **Error(§46, 26)**: LIFECYCLE_NOT_FOUND·TRANSITION_NOT_ALLOWED·VERSION_NOT_FOUND·**ACTIVE_VERSION_MISSING**·**MULTIPLE_ACTIVE_VERSION**·VERSION_EXPIRED·VERSION_NOT_EFFECTIVE·VERSION_OVERLAP·VERSION_GAP·**APPROVAL_REQUIRED**·ACTIVATION_BLOCKED·SUSPENDED·**EMERGENCY_DISABLED**·TERMINATED·ARCHIVED·DELETED·**IMPACT_ASSESSMENT_REQUIRED**·**INFLIGHT_POLICY_MISSING**·MIGRATION_PLAN_NOT_FOUND·**MIGRATION_MAPPING_MISSING**·MIGRATION_VALIDATION_FAILED·**MIGRATION_FINANCIAL_MISMATCH**·MIGRATION_ROLLBACK_FAILED·**HISTORICAL_BINDING_MISSING**·VERSION_RECONCILIATION_FAILED·LIFECYCLE_RUNTIME_BLOCKED (전부 `REBATE_PROGRAM_` 접두).
- **Warning(§47, 16)**: VERSION_WARNING·SCHEDULED_ACTIVATION_WARNING·EFFECTIVE_DATE_WARNING·CHANGE_IMPACT_WARNING·PAUSE_WARNING·SUSPENSION_WARNING·EXPIRATION_WARNING·TERMINATION_WARNING·SUPERSESSION_WARNING·ARCHIVAL_WARNING·RESTORATION_WARNING·MIGRATION_WARNING·DUAL_RUN_WARNING·ROLLBACK_WARNING·PROVIDER_VERSION_DRIFT·LIFECYCLE_MANUAL_REVIEW_REQUIRED.
- **Evidence(§48)**: evidence_id·program·version·transition·change_set·amendment·**approval reference·provider version reference·contract amendment reference·deployment reference(★부재→신설)·feature flag reference(★부재→신설)·migration plan·migration batch·validation result·rollback result·source/target checkpoint·effective_at·recorded_at·actor·confidence·lineage·result hash·audit reference**. **★민감 계약 원문·Credential·고객 개인정보·금융정보 원문 저장 금지**(헌법 No-PII·4-5-3-1-3 §9 계승).
- **Audit Event(§49, 28)**: VERSION_{CREATED,VALIDATED,APPROVED,SCHEDULED,ACTIVATED,SUPERSEDED,ROLLED_BACK}·CHANGE_SET_CREATED·AMENDMENT_LINKED·IMPACT_ASSESSED·PROGRAM_{ACTIVATED,PAUSED,RESUMED,SUSPENDED,EMERGENCY_DISABLED,EXPIRED,TERMINATED,SUPERSEDED,ARCHIVED,DELETED,RESTORED}·MIGRATION_{PLANNED,STARTED,COMPLETED,FAILED,ROLLED_BACK}·VERSION_DRIFT_DETECTED·MANUAL_REVIEW_REQUESTED. **현행 재사용**: menu_audit_log·auth_audit_log 패턴.

## 11. 기존 구현 분류 (§50) · 중복 구현 감사 (§51)

| 현행 구현 | 분류 | 근거 |
|---|---|---|
| menu_defaults(snapshot+version+baseline 복원) | **VALIDATED_LEGACY**(재사용 대상) | AdminMenu.php:119/294-308/584 |
| kr_fee_rule.effective_from | **VALIDATED_LEGACY** + ★`MIGRATION_REQUIRED`(as-of 조회 미적용·§0 관찰·**별도 승인 세션**) | KrChannel.php:151/459 |
| catalog_writeback_job superseded | **VALIDATED_LEGACY** | Catalog.php:1188/1871 |
| auto_campaign kill-switch 정직성 | **VALIDATED_LEGACY**(Transition Enforcement 정본) | AutoCampaign.php:602-609 |
| migrate.php + schema_migrations + `-- @rollback` + `--dry-run` | **VALIDATED_LEGACY**(Migration 정본) | bin/migrate.php:13/15/48/112 |
| ensureTables 73 핸들러(172차 이후 스키마 진화) | **KEEP_SEPARATE_WITH_REASON**(선언적 자가치유·Rebate Migration 원장과 목적 상이) | 73 핸들러 |
| free_coupons valid_until/usable_from | **VALIDATED_LEGACY** | CouponRedeem.php:67-68 |
| baseline.json sacred SHA | **VALIDATED_LEGACY**(Version Gate) | .githooks |
| Feature Flag / Incident / Deployment Registry | **UNVERIFIED → 부재 확정(NOT_APPLICABLE·신설)** | grep 0 |
| Batch/Checkpoint/금액 Validation/Dual Run/Shadow | **NOT_APPLICABLE(신설)** | 부재 |

**중복 구현 감사(§51)** — 전수 탐지 결과: **여러 Rebate Program Status Enum=0**(rebate 부재)·**여러 Lifecycle State Machine=0**(rebate)·**Program Version Store=0**(rebate)·**Effective Date 모델=2종 공존**(kr_fee_rule `effective_from` / free_coupons `usable_from`+`valid_until` — **목적 상이·KEEP_SEPARATE**)·**Change History Store=2종**(menu_audit_log / auth_audit_log — **도메인별·KEEP_SEPARATE**)·**Activation Scheduler=0**·**Pause·Suspension 구현=1종**(auto_campaign·**재사용**)·**Archive·Delete 모델=0**(rebate)·**Migration Framework=1종**(migrate.php·**재사용·중복 신설 금지**)·**Historical Binding 모델=0**·**Provider Version Mapping=0**·**ERP/CRM/Provider별 독립 Lifecycle=0**. **★결론: Rebate Lifecycle/Version 중복 구현 위험은 "신설 시 migrate.php/menu_defaults/auto_campaign을 재사용하지 않고 새 프레임워크를 만드는 것"** → **§50 VALIDATED_LEGACY 재사용 강제**.

## 12. Version Matrix (§55) · Migration Matrix (§56) — 현행

| Program | Version | Type | Previous | Effective Period | Change Set | Approval | Hash | Provider Version | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Version) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): 메뉴 기본값 | version VARCHAR(32) | BASELINE | N/A | created_at(만료 없음) | N/A | N/A | **snapshot_data JSON** | N/A | menu_defaults(:119/584) |
| 인접(재사용): 마켓 수수료 룰 | (행별) | RULE_CHANGE | (id 순) | **effective_from**(to 부재) | N/A | N/A | N/A | N/A | kr_fee_rule(:151) |
| 인접(재사용): 카탈로그 잡 | (잡별) | N/A | N/A | N/A | N/A | N/A | payload | N/A | **status='superseded'**(:1188) |

| Migration | Source | Target | Scope | Expected/Actual Count | Expected/Actual Amount | Validation | Rollback | Dry-run | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Migration) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 인접(재사용): 스키마 | migrations/ | DB | 파일 단위 | (원장 skip 판정) | N/A | N/A | **`-- @rollback`+record 제거** | **`--dry-run`** | schema_migrations(migrate.php:13/15/48) |
| 인접(참조): 자가치유 | 선언적 | DB | 핸들러별 | N/A | N/A | N/A | N/A | N/A | ensureTables 73(원장 없음) |
| (Batch·Checkpoint·금액 검증·Dual Run·Shadow) | — | — | — | — | — | — | — | — | **부재→신설** |
