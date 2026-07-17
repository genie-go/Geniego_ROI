# CANONICAL DSAR — Rebate Program Lifecycle (State·Transition·Change Set·Amendment·Impact·Approval·Activation·Pause·Suspension·Emergency Disable·Expiration·Termination·Supersession·Archival·Deletion·Restoration)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0** · v2.0(스펙 v1.0 기준 확장)
> 정본 쌍: 본 문서(Lifecycle/State/Transition/Change Set/Amendment/Impact/Approval/Activation/중단/종료/Supersession/Archive/Delete/Restore) + [`CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md)(Version/Component/Effective Period/Conflict/Migration/Historical Binding/In-flight/Reconciliation/Lint/Guard/Evidence/Audit/기존구현 분류).
> ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md).
> 선행: Program Master(4-5-3-1-1 **§6.8 "상세 Version=4-5-3-1-4" 위임 수령**)·Type/Classification(4-5-3-1-2)·Funding/Sponsor/Responsibility(4-5-3-1-3).
> **범위**: Program과 기준정보의 시간에 따른 변경 통제만 — **Rule 상세 계산·Eligibility·Accrual·Claim·Settlement·Payout 실행 아님**. 상세 Permission·Approval Workflow=**4-5-3-1-5**(본 블록은 Approval **Reference**와 Enforcement Hook만)·Coverage/Gap=1-6·전체 Lint/Guard Certification=1-7·Golden=1-8·Legacy Equivalence=1-9. **중복 구현 금지.**

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 스펙 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Program Lifecycle/Version/Migration 엔진** | ❌ **부재(grep 0)** — `rebate` 전무(backend/src 전역) | **NOT_APPLICABLE → 신설(전방호환)** |
| **Version Snapshot / Rollback 지점** | ✅ **REAL** — `menu_defaults`(**snapshot_data JSON + version VARCHAR(32) + created_at**·[AdminMenu.php:119-120](../../backend/src/Handlers/AdminMenu.php)/138-139)·**baseline 1회 캡처**(:294-308·"reset 롤백 지점")·최신 복원(:584)·audit `snapshot_version`(:625/641) | **재사용(§11 Component·§29 Restoration·Version 문서 §22)** |
| **Effective-dated Version** | ✅ **REAL** — `kr_fee_rule.effective_from`([KrChannel.php:102](../../backend/src/Handlers/KrChannel.php)/128/140/151/459) | **재사용(§12 Effective Period)** ·★§0 관찰(as-of 미적용) |
| **Validity / 만료(Expiration)** | ✅ **REAL** — free_coupons `valid_until`/`usable_from`([CouponRedeem.php:67-68](../../backend/src/Handlers/CouponRedeem.php)·**NULL=무기한**) | **재사용(§24 Expiration)** |
| **Supersession(구버전 마감)** | ✅ **REAL** — catalog_writeback_job `status='superseded'`([Catalog.php:1188](../../backend/src/Handlers/Catalog.php))·**판정 제외**(:1871-1873)·★미처리 잡 삭제 금지 회귀(:1187) | **재사용(§26 Supersession)** |
| **Transition Enforcement + Provider 정합** | ✅ **REAL** — auto_campaign `status: active\|paused`([AutoCampaign.php:490](../../backend/src/Handlers/AutoCampaign.php)/504)·**★kill-switch 정직성=플랫폼 push 실패 시 DB 상태 미변경·502**(:473/602-609·233차 P1) | **재사용(§8 Transition·§4.3 정본)** |
| **Migration Framework(Ledger·Rollback·Dry-run)** | ✅ **REAL** — `schema_migrations` 원장·**`-- @rollback` 블록 + record 제거**·`--dry-run`([bin/migrate.php:13](../../backend/bin/migrate.php)/15/48/112) · migrations **21파일·172차 정지** | **재사용(Version 문서 §30·§35·§37)** |
| **Idempotent 스키마 진화** | ✅ **REAL** — 핸들러별 `ensureTables`/`CREATE TABLE IF NOT EXISTS` **73 핸들러** | **재사용(§35 Execution 멱등)** |
| **Change Approval / Change History** | △ menu_audit_log·auth_audit_log(감사 로그)·`.githooks/baseline.json` sacred SHA(의도적 변경만 통과) | **참조(§18 Approval Reference=신설·§49 Audit)** |
| **Kill Switch** | △ **REAL(패턴만)** — AutoCampaign kill-switch 정직성(:473/602-609) — **Registry 아님**(프로그램 단위 긴급차단 레지스트리 부재) | **참조 → §23 Emergency Disable 신설** |
| **Feature Flag Registry** | ❌ **부재(grep 0)** — `feature_flag/featureFlag` 전무 | **NOT_APPLICABLE → 신설(§19 rollout·§20 Gate)** |
| **Incident Registry / Postmortem** | ❌ **부재(grep 0)** — `incident` 핸들러 전무 | **NOT_APPLICABLE → 신설(§22 triggering_incident)** |
| **Deployment Registry** | ❌ **부재** — deploy 스크립트는 있으나 배포 레지스트리 없음(CI inert·수동 pscp/plink) | **NOT_APPLICABLE → 신설(§48 deployment reference)** |
| **Environment Registry** | ✅ GENIE_ENV/IS_DEMO·`Db::envLabel()`(278차 트랩) | **재사용(§19 environment)** |
| **Provider API Version Sunset** | △ routes.php 구버전 프리픽스 병존·`AdAdapters::GOOGLE_VER='v17'`(구 v16 sunset 대비·[AdAdapters.php:31](../../backend/src/Handlers/AdAdapters.php)) | **참조(Provider Sunset≠Program Sunset·혼동 금지)** |
| **Rebate Lifecycle State/Transition/Change Set/Impact/Activation/Pause/Suspension/Emergency Disable/Expiration/Termination/Supersession/Archival/Deletion/Restoration** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Program Lifecycle/Versioning/Migration 엔진은 부재(NOT_APPLICABLE·grep 0)**. 그러나 **Lifecycle 실 인프라가 풍부**: Snapshot/Rollback(menu_defaults)·Effective-dated(kr_fee_rule)·Expiry(free_coupons)·Supersession(catalog_writeback_job)·**Transition Enforcement(auto_campaign kill-switch)**·**Migration Ledger/Rollback/Dry-run(migrate.php)**·Idempotent(73 핸들러)·Environment(GENIE_ENV). **★부재 확정(신설)**: **Feature Flag Registry·Incident Registry·Deployment Registry**(스펙 §3이 선행조건으로 가정하나 **실측 부재** — 지어내기 금지·Reference 필드만 준비). **★핵심 정직: §4.1 Lifecycle State≠Version·§4.3 Internal State≠Provider Actual State·§4.4 현재 Version으로 과거 거래 재계산 금지·§4.5 Approval≠Effectiveness·§4.6 Sunset/Expiration≠Termination≠Retirement≠Archive≠Delete·§4.8 Pause≠Suspension≠Emergency Disable**. **기존 menu_defaults/kr_fee_rule/migrate.php/ensureTables/auto_campaign 재사용(중복 금지·§51)**·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **[관찰·미확정] `KrChannel.php:459`** — `SELECT * FROM kr_fee_rule ... ORDER BY effective_from DESC, id DESC LIMIT 1` 이 **정산라인 거래일과 무관하게 최신 요율 1건**을 취해 `$expectedFee = $gross * $feeRate`(:462/471)로 **과거 정산라인을 현재 요율로 재검증**. `effective_from` 존재에도 **as-of 조회(`effective_from <= 거래일`) 아님** = 본 문서 **§4.4·§12 Effective Period·§38 Historical Binding의 실 사례**. **정본 원칙 근거로만 기록** — 요율 이력 1건 테넌트는 무증상·실 영향/의도는 라이브 확인 필요(FP 레지스트리 규약: PM 코드 재증명 전 P0 단정 금지). **비파괴 원칙상 미수정**.
- **스펙 §3 선행조건 중 Feature Flag/Incident/Deployment Registry는 실측 부재** — 있다고 가정하고 설계하면 허구 배선이 된다(287차 "죽은 스켈레톤" 교훈). **Reference 필드만 두고 NOT_APPLICABLE 정직 표기**.

---

## 1. Canonical Entity (32) — §5

REBATE_PROGRAM_LIFECYCLE·LIFECYCLE_TRANSITION·PROGRAM_VERSION·VERSION_COMPONENT·EFFECTIVE_PERIOD·CHANGE_SET·AMENDMENT·CHANGE_IMPACT·APPROVAL_REFERENCE·ACTIVATION·PAUSE·SUSPENSION·EMERGENCY_DISABLE·EXPIRATION·TERMINATION·SUPERSESSION·ARCHIVAL·DELETION·RESTORATION·MIGRATION_PLAN·MIGRATION_SCOPE·MIGRATION_MAPPING·MIGRATION_BATCH·MIGRATION_EXECUTION·MIGRATION_VALIDATION·MIGRATION_ROLLBACK·HISTORICAL_BINDING·INFLIGHT_POLICY·VERSION_RECONCILIATION·LIFECYCLE_CANDIDATE·LIFECYCLE_EVIDENCE·LIFECYCLE_AUDIT_EVENT.
**본 문서**=Lifecycle/Transition/Change Set/Amendment/Impact/Approval/Activation/Pause/Suspension/Emergency/Expiration/Termination/Supersession/Archival/Deletion/Restoration/Candidate. **짝 문서**=Version/Component/Effective Period/Conflict/Migration 7종/Historical Binding/In-flight/Reconciliation/Lint/Guard/Evidence/Audit.
**후속 블록**: 상세 Permission·Approval Workflow(**4-5-3-1-5**)·Coverage/Gap(1-6)·Lint/Guard Certification(1-7)·Golden(1-8)·Legacy Equivalence(1-9) — **본 블록 중복 구현 금지·Reference Field만 준비**.
**현행 실체**: Snapshot/Rollback(menu_defaults)·Effective-dated(kr_fee_rule)·Expiry(free_coupons)·Supersession(catalog_writeback_job)·Transition Enforcement(auto_campaign)·Migration(migrate.php) = REAL 재사용. 나머지 = **신설**. Feature Flag/Incident/Deployment Registry = **부재→신설**.

## 2. Lifecycle (§6) · State (§7) ★State≠Version

- **Lifecycle(§6)**: rebate_program_lifecycle_id·rebate_program_id·**current_state·previous_state·current_version_id·active_version_id·scheduled_version_id·effective_from·effective_to·last_transition_at·last_transition_by·transition_reason·approval_reference·feature_flag_reference(★부재→신설)·kill_switch_reference(★AutoCampaign 패턴 인접·Registry 부재→신설)**·status·evidence.
- **State(§7, 36)**: DISCOVERED·REGISTERED·DRAFT·CONFIGURING·VALIDATION_PENDING·VALIDATION_FAILED·REVIEW_PENDING·APPROVAL_PENDING·APPROVED·SCHEDULED·ACTIVATING·**ACTIVE**·ACTIVE_WITH_WARNINGS·PAUSING·PAUSED·RESUMING·SUSPENDING·SUSPENDED·**EMERGENCY_DISABLED**·EXPIRING·EXPIRED·TERMINATING·TERMINATED·SUPERSEDED·MIGRATION_PENDING·MIGRATING·MIGRATED·ARCHIVING·ARCHIVED·DELETION_PENDING·DELETED·RESTORATION_PENDING·RESTORED·BLOCKED·FAILED·UNKNOWN.
**★§4.1 State≠Version**(PAUSE=Version 불변·요율 변경=State 불변 Version 증가·상태 전이가 자동으로 Version을 만들지 않고 역도 성립). **★§4.2 State≠Provider 문자열**(Canonical Enum·Provider 문자열 그대로 저장 금지·Mapping+Confidence). **★§4.3 Internal State≠Provider Actual State** — **현행 정본 재사용**: auto_campaign kill-switch(AutoCampaign.php:602-609)가 **플랫폼 push 실패 시 DB 상태를 바꾸지 않고 502**("'paused' 표기인데 플랫폼은 계속 집행=광고비 누수" 방지) → **Rebate도 Provider/계약 상대방 반영 실패 시 내부 State 전이 금지(발산 금지)**.

## 3. Transition (§8) · 허용 전이 (§9)

- **Transition(§8)**: transition_id·rebate_program_id·**from_state·to_state·transition_type·requested_by·approved_by·executed_by·requested_at·approved_at·executed_at·effective_at·reason·preconditions·validation_result·rollback_transition·idempotency_key**·status·evidence.
- **Type(§8b, 24)**: CREATE·REGISTER·SUBMIT_FOR_VALIDATION·VALIDATE·SUBMIT_FOR_REVIEW·APPROVE·REJECT·SCHEDULE·ACTIVATE·PAUSE·RESUME·SUSPEND·EMERGENCY_DISABLE·EXPIRE·TERMINATE·SUPERSEDE·MIGRATE·ARCHIVE·DELETE·RESTORE·ROLLBACK·CORRECT·BLOCK·UNBLOCK.
- **허용 전이(§9)**: DISCOVERED→REGISTERED→DRAFT→CONFIGURING→VALIDATION_PENDING→{REVIEW_PENDING|VALIDATION_FAILED}→APPROVAL_PENDING→{APPROVED|DRAFT}→{SCHEDULED|ACTIVATING}→ACTIVE · ACTIVE→PAUSING→PAUSED→RESUMING→ACTIVE · ACTIVE→SUSPENDING→SUSPENDED→ACTIVE · {ACTIVE,PAUSED,SUSPENDED}→**EMERGENCY_DISABLED** · ACTIVE→EXPIRING→EXPIRED · {ACTIVE,PAUSED,SUSPENDED}→TERMINATING→TERMINATED · {ACTIVE,EXPIRED,TERMINATED}→SUPERSEDED · {APPROVED,ACTIVE,PAUSED}→MIGRATION_PENDING→MIGRATING→MIGRATED · {EXPIRED,TERMINATED,SUPERSEDED,MIGRATED}→ARCHIVING→ARCHIVED→DELETION_PENDING→DELETED · {DELETED,ARCHIVED}→RESTORATION_PENDING→RESTORED. **★목록 외 전이는 Runtime Guard 차단(§45)·Terminal 재전이 금지·Idempotency Key 강제(중복 전이 금지)·Evidence 없는 전이 금지·Demo/Sandbox→Production 전이 금지**.

## 4. Change Set (§14) · Amendment (§15) ★Version 없는 변경 금지

- **Change Set(§14)**: change_set_id·rebate_program_id·**base_version_id·target_version_id·change_type·changed_components·previous_values_reference·new_values_reference·breaking_change·customer_impact·financial_impact·accounting_impact·migration_required·backfill_required·rollback_required·requested_by·requested_at**·status·evidence. **Type(21)**: METADATA·CLASSIFICATION·SCOPE·PARTICIPANT·BENEFICIARY·CLAIMANT·SPONSOR·FUNDING·CONTRACT·COUNTRY·CURRENCY·ENVIRONMENT·RESPONSIBILITY·EFFECTIVE_PERIOD·SOURCE_OF_TRUTH·PARENT_CHILD·SETTLEMENT·PAYOUT·ACCOUNTING·EMERGENCY·COMPOSITE.
- **★§4.2 Version 없는 운영 변경 금지** — 다음은 **반드시 새 Version 또는 명시적 Change Set 생성**: Program Type·Scope·Sponsor·Funding Party·Funding Allocation·Contract·Country·Currency·Participant·Beneficiary·Claimant·Settlement Method·Payout Responsibility·Liability Owner·Accounting Responsibility·Effective Period. **현재 Program Record 직접 수정으로 과거 상태 덮어쓰기 금지(§4.3)**.
- **Amendment(§15)**: amendment_id·program·**source_contract_amendment_reference(4-5-3-1-3 §9 amendment_reference 연결·★계약 원문 복제 금지)·affected_version·amendment_type·amendment_reason·effective_from/to·affected_scope·affected_funding·affected_responsibility·affected_inflight_items·approval_reference·migration_requirement·rollback_reference**·status·evidence. **Type(15)**: EXTEND_PERIOD·SHORTEN_PERIOD·ADD_SCOPE·REMOVE_SCOPE·CHANGE_SPONSOR·CHANGE_FUNDING·CHANGE_CURRENCY·CHANGE_COUNTRY·CHANGE_CONTRACT·CHANGE_SETTLEMENT·CHANGE_PAYOUT·CHANGE_ACCOUNTING·CORRECTION·EMERGENCY·OTHER.

## 5. Change Impact (§16) · 위험 등급 (§17)

- **Impact(§16)**: impact_assessment_id·change_set_id·**impact_domain·affected_record_count·financial_amount_reference·affected_currency·severity·automatic_migration_allowed·manual_review_required·backfill_required·rollback_complexity·risk_summary·mitigation·assessed_by·assessed_at**·evidence. **Domain(24)**: New/Historical Transaction·Pending/Approved Claim·Pending/Approved Accrual·Liability·Budget·Commitment·Reservation·Settlement·Credit/Debit Memo·Payout·Recovery·Dispute·Reporting·Accounting·Customer Portal·Provider Connector·ERP Integration·Data Warehouse·API Consumer·Pending Eligibility.
- **위험 등급(§17, 7)**: NONE·LOW·MEDIUM·HIGH·CRITICAL·BLOCKED·UNKNOWN. **★기본 High/Critical 후보(14)**: Tenant 변경·Legal Entity 변경·Funding Party 변경·Currency 변경·Accounting Owner 변경·Beneficiary Type 변경·Claimant Authorization 변경·**Retrospective 적용**·**Historical Transaction 재귀속**·Settlement Method 변경·Payout Responsibility 변경·Provider Account 변경·Production Environment 변경·Migration 대량 변경. **★Breaking Change에 Impact Assessment 없이 진행 금지(§44 Lint)**.

## 6. Approval Reference (§18) ★상세 Workflow=1-5

- **Approval Reference(§18)**: approval_reference_id·program·version_id·change_set_id·**approval_type·required_roles·submitted_at·approved_at·rejected_at·approval_result·approver_references·segregation_of_duties_result·expiry**·status·evidence. **Type(12)**: INITIAL_ACTIVATION·VERSION_ACTIVATION·FUNDING_CHANGE·CONTRACT_CHANGE·CURRENCY_CHANGE·LEGAL_ENTITY_CHANGE·MIGRATION·TERMINATION·DELETE·RESTORE·EMERGENCY_CHANGE·ROLLBACK.
**★§4.5 Approval≠Effectiveness**(승인=권한 확보·발효=Effective Period 진입·APPROVED≠ACTIVE·Cashback 4-5-2-3 "Approval≠Availability" 계승)·**승인 만료(expiry) 후 발효 금지**·**Approval 완료 전 Production Activation 차단(§20·§45)**. **★본 블록=Reference+Enforcement Hook만·상세 Permission·Approval Workflow·SoD 정책=4-5-3-1-5(중복 구현 금지)**.

## 7. Activation (§19) · ★Activation Gate (§20)

- **Activation(§19)**: activation_id·program·version_id·**activation_type·requested_at·scheduled_at·activated_at·validation_result·approval_reference·feature_flag(★부재→신설)·rollout_percentage·tenant_scope·environment(GENIE_ENV 재사용)·pre_activation_snapshot(★menu_defaults baseline 패턴 재사용)·post_activation_validation·rollback_window**·status·evidence. **Type(8)**: IMMEDIATE·SCHEDULED·PHASED·TENANT_BY_TENANT·REGION_BY_REGION·PROVIDER_SYNCED·MANUAL·EMERGENCY.
- **★Gate(§20, 23)**: Program Master Valid·Program Type Valid·Tenant/Workspace Bound·Environment Valid·Scope Valid·Participant/Beneficiary/Claimant Defined·Sponsor Defined·Funding Model Valid·Funding Allocation Valid·**Shared Funding Total Valid**(4-5-3-1-3 §14)·Contract Valid·Currency Supported·Country Supported·Settlement Responsibility Defined·Payout Responsibility Defined·Liability Owner Defined·Accounting Responsibility Defined·Source of Truth Resolved·**Approval Completed**·No Critical Reconciliation Gap·No Active Duplicate Ambiguity·Feature Flag Ready·**Rollback Plan Ready**·Audit Ready. **★하나라도 Critical Failure이면 Activation 차단(fail-closed)**. **★Rollback 지점(pre-activation snapshot) 없는 Activation 금지** — 현행 정본=menu_defaults **baseline 1회 캡처**(AdminMenu.php:294-308·282차 "스냅샷 없어 reset 404"=**스냅샷 없으면 롤백 불가** 교훈).

## 8. Pause (§21) · Suspension (§22) · ★Emergency Disable (§23) — 3자 구별

- **★§4.8 Pause≠Suspension≠Emergency Disable**: **Pause**=계획/운영상 일시 중지(가역)·**Suspension**=위험·규정·오류로 인한 **강제 중단**·**Emergency Disable**=**즉시 차단이 필요한 긴급 조치**(선실행·사후 승인).
- **Pause(§21)**: pause_id·program·version_id·**pause_type·reason·requested_by·approved_by·paused_at·expected_resume_at·new_transaction_policy·pending_claim_policy·pending_accrual_policy·settlement_policy·payout_policy·resumed_at**·status·evidence. **Type(7)**: PLANNED·OPERATIONAL·BUDGET·PROVIDER_MAINTENANCE·CONTRACT_REVIEW·DATA_QUALITY·MANUAL.
- **Suspension(§22)**: suspension_id·program·version_id·**suspension_reason·severity·triggering_incident(★Incident Registry 부재→신설·Reference만)·suspended_at·suspended_by·scope·new_transaction_block·claim_block·accrual_block·settlement_block·payout_block·investigation_owner·review_at·release_conditions·released_at**·status·evidence. **Reason(13)**: FRAUD_RISK·SECURITY_INCIDENT·COMPLIANCE_RISK·FINANCIAL_RISK·**DOUBLE_FUNDING**(4-5-3-1-3 §4.10)·**WRONG_LEGAL_ENTITY**·CURRENCY_ERROR·PROVIDER_DRIFT·DATA_CORRUPTION·CONTRACT_DISPUTE·ACCOUNTING_ERROR·REGULATORY_RESTRICTION·OTHER.
- **★Emergency Disable(§23)**: emergency_disable_id·program·**affected_version·trigger·severity·disabled_scope·disabled_at·disabled_by·approval_after_action_required·new_transaction_block·claim_block·accrual_block·settlement_block·payout_block(★각 차단 범위 독립 설정)·provider_disable_result·feature_flag_result·recovery_plan·review_deadline·restored_at**·status·evidence. **★긴급 차단은 신속 실행하되 사후 승인·Review Deadline·Audit 강제**. **★현행 정본 재사용**: AutoCampaign kill-switch 정직성(:473/602-609) — **Provider disable 실패 시 내부만 "차단됨" 표기 금지(발산·§4.3)·`provider_disable_result` 실 결과 기록**(287/288차 가짜집행/가짜녹색 클래스 정합). **Kill Switch Registry는 부재→신설**.

## 9. Expiration (§24) · Termination (§25) · Supersession (§26) ★종료≠업무 종료

- **★§4.7 Program 종료≠모든 업무 종료** — 종료 후에도 계속될 수 있는 업무: Pending Claim·Pending Validation·Accrued Rebate·Approved Rebate·Settlement·Credit Memo·Payout·Dispute·Recovery·Audit. **★In-flight Policy(짝 문서 §39) 없는 Termination/Migration 금지(§44)·종료를 이유로 기존 승인된 권리·회계 기록 임의 삭제 금지**.
- **Expiration(§24)**: expiration_id·program·**active_version·scheduled_expiration_at·actual_expiration_at·transaction_cutoff·claim_grace_period·pending_claim_policy·pending_accrual_policy·settlement_completion_policy·payout_completion_policy·liability_close_policy·customer_notification_reference·successor_program**·status·evidence. **현행 인접**: free_coupons `valid_until`(**NULL=무기한** 규약·CouponRedeem.php:67-68). **★Expiration=의사결정 없는 자연 만료(≠Termination)**.
- **Termination(§25)**: termination_id·program·**termination_type·reason·contract_termination_reference·requested_at·approved_at·terminated_at·effective_at·new_transaction_policy·pending_claim_policy·pending_accrual_policy·settlement_policy·payout_policy·recovery_policy·data_retention_policy·successor_program**·status·evidence. **Type(10)**: NORMAL·EARLY·CONTRACTUAL·PROVIDER_INITIATED·CUSTOMER_INITIATED·REGULATORY·FINANCIAL·SECURITY·EMERGENCY·OTHER.
- **Supersession(§26)**: supersession_id·**predecessor_program/version·successor_program/version·supersession_type·effective_at·scope_mapping·participant_mapping·funding_mapping·contract_mapping·pending_item_policy·historical_binding_policy(★§4.10)·migration_plan·rollback_reference**·status·evidence. **Type(10)**: FULL_REPLACEMENT·PARTIAL_REPLACEMENT·REGIONAL_REPLACEMENT·PRODUCT_REPLACEMENT·CONTRACT_REPLACEMENT·PROVIDER_REPLACEMENT·CONSOLIDATION·SPLIT·CORRECTION·OTHER. **현행 정본 재사용**: catalog_writeback_job `status='superseded'`(Catalog.php:1188)·**판정 제외**(:1871-1873)·**★미처리 잡 물리 삭제 금지 회귀 교훈**(:1187) → **구 Program/Version 물리 삭제 금지·상태 마감+판정 제외**.

## 10. Archival (§27) · Deletion (§28) · Restoration (§29) ★Archive≠Delete

- **Archival(§27)**: archival_id·program·**final_version·archived_at·archived_by·reason·retention_policy·retrieval_support·reporting_support·claim_lookup_support·settlement_lookup_support·audit_lookup_support·restore_support**·status·evidence. **★Archive는 삭제가 아니다 — Archived Program의 과거 거래·Claim·Settlement·Payout·Audit 조회 보장(§43 "Archive 후 Historical Lookup 불가"=Critical)**.
- **Deletion(§28)**: deletion_id·program·**deletion_type·requested_by·approved_by·requested_at·approved_at·deleted_at·reason·retention_requirement·legal_hold·active_dependency_count·pending_claim_count·pending_settlement_count·rollback_support·restoration_deadline**·status·evidence. **Type(6)**: **SOFT_DELETE(기본)**·PROVIDER_DELETED·DUPLICATE_DEPRECATION·TEST_DATA_DELETE·LEGAL_ERASURE_REFERENCE·**HARD_DELETE_EXCEPTION**. **★Hard Delete는 명시적 법적·보안 정책과 승인 없이는 금지(§44 "Hard Delete 기본 사용"=Lint 차단)·Audit History 손실=Critical(§43)**. **DSAR 삭제 요청도 금전/세무 원장은 법정 보존기간 내 삭제 금지 → PII 익명화**(헌법 No-PII 정합).
- **Restoration(§29)**: restoration_id·program·**source_archival·source_deletion·restoration_type·target_state·target_version·requested_by·approved_by·restored_at·data_integrity_result·provider_restore_result·dependent_mapping_result·feature_flag_result**·status·evidence. **Type(6)**: METADATA_RESTORE·FULL_RESTORE·READ_ONLY_RESTORE·HISTORICAL_LOOKUP_RESTORE·PROVIDER_SYNC_RESTORE·EMERGENCY_RESTORE. **현행 정본 재사용**: menu_defaults 최신 스냅샷 복원(AdminMenu.php:584)+audit `snapshot_version`(:625/641).

## 11. Lifecycle Candidate (§42) · Critical Gap (§43)

- **Candidate(§42)**: candidate_id·request_id·program·**current lifecycle·current version·proposed state·proposed version·change set·amendment·impact assessment·approval reference·effective period·activation reference·pause/suspension reference·termination reference·successor program·migration plan·inflight policy·provider version·reconciliation result·risk level·manual review requirement**·evidence.
- **★Critical Gap(§43, 19)**: Active Program에 Active Version 없음·**동일 기간 여러 Active Version**·**Approval 없이 Production Activation**·**미래 Version 조기 적용**·만료 Version 신규 거래 적용·Terminated Program 신규 Claim 허용·**Emergency Disable 중 Accrual/Payout 지속**·Program Version 없이 거래 생성·Funding Agreement Version 누락·**과거 거래를 현재 Version으로 덮어쓰기**·Migration Mapping 누락·**Cross-Tenant Migration**·**Wrong Legal Entity Migration**·**Migration 금액 불일치**·Rollback 불가 상태 고위험 Cutover·**Archive 후 Historical Lookup 불가**·**Hard Delete로 Audit History 손실**·Provider·Internal Version Drift·Pending Claim/Settlement 처리 정책 누락. → **Access Review 차단**.

## 12. Lifecycle Matrix (§54) · In-flight Matrix (§57) — 현행

| Program | Current State | Active Version | Scheduled Version | Effective From/To | Approval | Provider State | Risk | Status |
|---|---|---|---|---|---|---|---|---|
| (Rebate Program) | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): 자동캠페인 | active\|paused | N/A | N/A | N/A | N/A | **플랫폼 push 결과(실패 시 전이 거부 502)** | — | auto_campaign(:602-609) |
| 인접(재사용): 마켓 수수료 룰 | N/A | (최신 행) | N/A | **effective_from**(to 부재) | N/A | N/A | ★as-of 미적용(§0) | kr_fee_rule(:459) |
| 인접(재사용): 추천 보상쿠폰 | 발급\|사용\|만료\|취소 | N/A | N/A | usable_from / **valid_until(NULL=무기한)** | N/A | N/A | — | free_coupons(:67-68) |
| 인접(재사용): 메뉴트리 | 현행\|기본값 스냅샷 | version VARCHAR(32) | N/A | created_at | N/A | N/A | — | menu_defaults(:119/584) |
| (Feature Flag·Incident·Deployment Registry) | — | — | — | — | — | — | — | **부재→신설** |

| Program | Entity Type | Source Version | Target Version | Policy | Cutoff | Reevaluation | Notification | Accounting Impact | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate In-flight) | Claim/Accrual/Settlement/Payout/Dispute/Recovery | — | — | **짝 문서 §39(9종 정책)** | — | — | — | — | **N/A(신설)** |
