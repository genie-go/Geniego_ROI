# CANONICAL DSAR — Rebate Program Lifecycle (State·Transition·Approval·Effectiveness·Suspension·Sunset·Retirement·Grandfathering·In-flight Protection)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Lifecycle State/Transition/Approval/Effectiveness/Sunset/Retirement/Grandfathering) + [`CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_VERSIONING_MIGRATION_GOVERNANCE.md)(Version/Snapshot/Diff/Supersession/Migration/Backfill/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md`](../architecture/ADR_DSAR_REBATE_PROGRAM_LIFECYCLE_VERSIONING_MIGRATION.md).
> 선행: Rebate Program Master(4-5-3-1-1·**§6.8 "상세 Version=4-5-3-1-4" 위임 수령**)·Type/Classification(4-5-3-1-2)·Funding/Sponsor/Responsibility(4-5-3-1-3)·Monetary Reward Foundation(4-5-1-1~1-4)·Cashback Lifecycle(4-5-2-1~2-5).
> **범위**: Program 자체의 생애주기/버전 전이만 — Rule 계산/Tier/Eligibility/Accrual/Claim/Settlement/Payout/Recovery 실행 아님(후속 4-5-3-1-5~9). **중복 구현 금지.**

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Program Lifecycle / Version / Migration 엔진** | ❌ **부재(grep 0)** — `rebate` 전무(backend/src 전역)·`sunset/superseded/deprecated_at/grandfather`에 rebate 맥락 0 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Version Snapshot / Rollback 지점** | ✅ **REAL** — `AdminMenu` menu_defaults(**snapshot_data JSON + version VARCHAR(32) + created_at**·[AdminMenu.php:119-120](../../backend/src/Handlers/AdminMenu.php)/138-139)·baseline 1회 캡처(:294-308)·최신 스냅샷 복원(:584)·audit `snapshot_version`(:625/641) | **재사용(§22 Snapshot·§30 Rollback 패턴)** |
| **Effective-dated Rule Version** | ✅ **REAL** — `kr_fee_rule.effective_from`([KrChannel.php:102](../../backend/src/Handlers/KrChannel.php)/128/140/151/459·`ORDER BY effective_from DESC`) | **재사용(§12 Effectiveness·§21 Version Validity)** |
| **Validity Window / 만료** | ✅ **REAL** — free_coupons `valid_until`/`usable_from`([CouponRedeem.php:51](../../backend/src/Handlers/CouponRedeem.php)/67-68/195/206·**NULL=무기한**·만료 검증) | **재사용(§12·§16 Expiry)** |
| **Supersession(구버전 마감) State Machine** | ✅ **REAL** — catalog_writeback_job `status='superseded'`([Catalog.php:1188](../../backend/src/Handlers/Catalog.php))·신규 잡이 기존 미완료 잡 마감(:394/588/1187)·**superseded는 결과 판정 제외**(:1871-1873) | **재사용(§25 Supersession)** |
| **Lifecycle Transition + Provider 정합** | ✅ **REAL** — auto_campaign `status: active\|paused`([AutoCampaign.php:490](../../backend/src/Handlers/AutoCampaign.php)/504)·**★233차 kill-switch 정직성=플랫폼 push 실패 시 DB 상태 미변경·502**(:602-609) | **재사용(§10 Transition Enforcement·§4.3 정본)** |
| **Migration Ledger / Rollback / Dry-run** | ✅ **REAL** — `schema_migrations` 원장·`-- @rollback` 블록·`--dry-run`([bin/migrate.php:13](../../backend/bin/migrate.php)/15/48/112) · migrations 21파일 **172차 정지** | **재사용(§27~§30)** |
| **Self-healing 스키마 진화** | ✅ **REAL** — 핸들러별 `ensureTables`/`CREATE TABLE IF NOT EXISTS` **73 핸들러**(migrations 정지 이후 정본) | **재사용(§29 Idempotent Execution)** |
| **Provider API Version Sunset** | △ routes.php 구버전 프리픽스 병존(/v410 등)·`AdAdapters::GOOGLE_VER='v17'`(구 v16 sunset 대비·[AdAdapters.php:31](../../backend/src/Handlers/AdAdapters.php)) | **참조(§17 Provider Sunset·rebate 아님)** |
| **Rebate Lifecycle State/Transition/Approval/Effectiveness/Suspension/Sunset/Retirement/Grandfathering/In-flight Protection** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Program Lifecycle/Versioning/Migration 엔진은 부재(NOT_APPLICABLE·grep 0)**. 그러나 **Lifecycle/Version 실 인프라가 풍부**: Snapshot/Rollback(menu_defaults)·Effective-dated Version(kr_fee_rule)·Validity/Expiry(free_coupons)·Supersession(catalog_writeback_job)·Transition Enforcement(auto_campaign kill-switch)·Migration Ledger/Rollback/Dry-run(migrate.php)·Idempotent Self-healing(73 핸들러). **★핵심 정직: §4.1 Lifecycle State≠Version·§4.3 Internal State≠Provider Actual State·§4.4 현재 Version으로 과거 거래 재계산 금지·§4.5 Approval≠Effectiveness·§4.6 Sunset≠Termination≠Retirement≠Archive≠Delete·이번 블록=Lifecycle/Version/Migration만(Rule/Tier/Eligibility/Accrual/Claim/Settlement 실행 후속)**. **기존 menu_defaults/kr_fee_rule/migrate.php/ensureTables 재사용(중복 금지·§40)**·지어내기·NO_DATA/오탐 금지·본 Lifecycle=멀티테넌트 고객용 미래 rebate 전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0·별도 승인 세션 후보)
- **[관찰·미확정] `KrChannel.php:459`** — `SELECT * FROM kr_fee_rule ... ORDER BY effective_from DESC, id DESC LIMIT 1` 이 **정산라인의 거래일과 무관하게 항상 최신 요율 1건**을 취해 `$expectedFee = $gross * $feeRate`(:462/471) 로 **과거 정산라인을 현재 요율로 재검증**. `effective_from` 컬럼이 존재함에도 **as-of 조회(`effective_from <= 거래일`)가 아님** = 본 문서 **§4.4(현재 Version으로 과거 거래 재계산 금지)의 실 사례**. **정본 원칙의 근거로만 기록** — 요율 이력 1건 테넌트에서는 무증상이고, 실 영향/의도 판정은 라이브 데이터 확인 필요(FP 레지스트리 규약: PM 코드 재증명 전 P0 단정 금지). **본 세션 비파괴 원칙상 수정하지 않음**. Rebate Version 엔진은 착수 시 **as-of 조회를 계약으로 강제**(§12·§21·§32).

---

## 1. Canonical Entity (22) — §5 (이번 블록)

REBATE_PROGRAM_LIFECYCLE_STATE·LIFECYCLE_STATE_MODEL·LIFECYCLE_TRANSITION·TRANSITION_TRIGGER·TRANSITION_GUARD·TRANSITION_ENFORCEMENT_HOOK·LIFECYCLE_APPROVAL·APPROVAL_POLICY·EFFECTIVENESS_WINDOW·ACTIVATION·SUSPENSION·RESUMPTION·SUNSET_PLAN·TERMINATION·RETIREMENT·ARCHIVE_REFERENCE·GRANDFATHERING_POLICY·GRANDFATHERED_PARTICIPANT·IN_FLIGHT_PROTECTION·LIFECYCLE_DECISION·LIFECYCLE_RECONCILIATION·LIFECYCLE_AUDIT_EVENT.
**후속 블록(4-5-3-1-5~9)**: RULE·TIER·THRESHOLD·ELIGIBILITY·ACCRUAL·CLAIM·SETTLEMENT·PAYOUT·RECOVERY(**이번 블록 중복 구현 금지·Reference Field만 준비**).
**현행 실체**: Snapshot/Rollback(menu_defaults)·Effectiveness(kr_fee_rule effective_from·free_coupons valid_until)·Supersession(catalog_writeback_job)·Transition Enforcement(auto_campaign) = REAL 재사용. 나머지 = **신설**.

## 2. Lifecycle State (§6) · State Model (§7) ★State≠Version

- **State(§6, 18)**: DISCOVERED·DRAFT·PENDING_REVIEW·PENDING_APPROVAL·APPROVED·SCHEDULED·ACTIVE·PAUSED·SUSPENDED·AMENDED·SUPERSEDED·SUNSETTING·CLOSED_TO_NEW·TERMINATED·EXPIRED·RETIRED·ARCHIVED·UNKNOWN. 필드: lifecycle_state_id·program·**state·state_reason·entered_at·entered_by·expected_exit_at·previous_state·state_source(INTERNAL/PROVIDER/CONTRACT/MANUAL)·provider_reported_state·reconciliation_status**·version reference·evidence.
- **State Model(§7)**: state_model_id·program·**허용 전이 집합·terminal states·reversible states·자동 전이 정책·수동 전이 권한 profile·provider-authoritative 여부**·valid from/to·version·evidence.
**★§4.1 Lifecycle State≠Version(상태 전이가 자동으로 새 Version을 만들지 않음·역도 성립 — PAUSE는 Version 불변·요율 변경은 State 불변 Version 증가)**. **★§4.2 State≠Status 문자열**(Canonical State Enum·Provider 문자열 그대로 저장 금지·Mapping+Confidence). **★§4.3 Internal State≠Provider Actual State** — **현행 정본 재사용**: auto_campaign kill-switch(AutoCampaign.php:602-609)가 **플랫폼 push 실패 시 DB 상태를 바꾸지 않고 502 반환**(표기 'paused'인데 플랫폼 계속 집행=광고비 누수 방지). Rebate도 동일: **Provider/계약 상대방 반영 실패 시 내부 State 전이 금지(발산 금지)**. → State/Model Store=신설.

## 3. Transition (§8) · Trigger (§9) · Guard·Enforcement (§10)

- **Transition(§8)**: transition_id·program·**from_state·to_state·transition_type·trigger·requested/approved_by·requested/effective_at·reason·evidence·provider_push_result·rollback_reference·idempotency_key**·status·audit. Type(12): CREATE·SUBMIT·REVIEW·APPROVE·REJECT·SCHEDULE·ACTIVATE·PAUSE·RESUME·SUSPEND·AMEND·CLOSE/TERMINATE/RETIRE/ARCHIVE.
- **Trigger(§9, 14)**: MANUAL_OPERATOR·SCHEDULED_DATE·APPROVAL_COMPLETED·CONTRACT_EFFECTIVE/EXPIRY·BUDGET_EXHAUSTED·COMMITMENT_EXHAUSTED·FUNDING_WITHDRAWN·SPONSOR_TERMINATION·PROVIDER_EVENT·FRAUD_HOLD·COMPLIANCE_HOLD·SUPERSEDED_BY_VERSION·SYSTEM_MIGRATION. **★현행 인접**: 만료 트리거=free_coupons valid_until 검증(CouponRedeem.php:67-68·NULL=무기한)·Budget 소진=BillingMethod MTD cap(4-5-3-1-3 §16 Commitment).
- **Guard/Enforcement(§10, 13)**: 승인 미완료 ACTIVATE 금지·Funding Party/Agreement 없이 ACTIVATE 금지(4-5-3-1-3 §4·Agreement 없이 Accrual 금지 계승)·Commitment/Reservation 부족 시 ACTIVATE 금지·**In-flight Accrual/Claim 있는 상태에서 TERMINATE 즉시 금지(§19)**·Terminal State 재전이 금지·Provider push 실패 시 전이 금지(§4.3)·Cross-Tenant/Wrong Legal Entity 전이 차단·Scope/Version 미확정 ACTIVATE 금지·**Idempotency Key 강제(중복 전이 금지)**·권한 profile 검증·Historical 전이 삭제 금지·Evidence 없는 전이 금지·Demo/Sandbox→Production 전이 금지.
**★§4.5 Approval≠Effectiveness(승인=권한 확보·발효=Effectiveness Window 진입·APPROVED≠ACTIVE·Cashback 4-5-2-3 "Approval≠Availability" 계승)**. → 전부 신설(auto_campaign 전이 패턴 재사용).

## 4. Approval (§11) · Effectiveness Window (§12) ★Approval≠Effectiveness

- **Approval(§11)**: lifecycle_approval_id·program·target transition/version·**approval_type·policy reference·requester·approver(s)·approval_level·quorum·approved/rejected_at·rejection_reason·delegation reference·expires_at**·status·evidence. Type(10): PROGRAM_CREATION·ACTIVATION·RULE/FUNDING_CHANGE·SCOPE_CHANGE·SUSPENSION·TERMINATION·RETIREMENT·MIGRATION·EMERGENCY_OVERRIDE. **★승인 없는 운영 Override 금지(4-5-3-1-3 §15 계승)**·**승인 만료(expires_at) 후 발효 금지**.
- **Effectiveness Window(§12)**: effectiveness_window_id·program·version·**effective_from·effective_to·timezone·announced_at·closed_to_new_at·grace_period_end·scheduled_activation_at·actual_activation_at**·status·evidence. **★as-of 조회 계약**: 임의 시점 t의 유효 Program/Version = `effective_from <= t AND (effective_to IS NULL OR t < effective_to)`. **NULL effective_to=무기한(free_coupons valid_until NULL 규약 계승·CouponRedeem.php:67)**.
**★현행 재사용**: kr_fee_rule effective_from(KrChannel.php:102/128/140/151)·free_coupons valid_until/usable_from(CouponRedeem.php:51-68). **★§4.4 현재 Version으로 과거 거래 재계산 금지 — 반드시 as-of 조회(★KrChannel:459 최신 1건 조회는 §0 인접 관찰 참조)**.

## 5. Suspension (§13) · Resumption (§14) · Sunset (§15) · Expiry (§16) · Termination·Retirement·Archive (§17) ★전부 구별

- **Suspension(§13)**: suspension_id·program·**suspension_type·reason·scope(전체/특정 Scope/특정 Participant)·suspended/expected_resume_at·in-flight 처리 정책·accrual 중단 여부·claim 접수 중단 여부**·approver·evidence. Type(9): OPERATIONAL·FUNDING_SHORTFALL·FRAUD_HOLD·COMPLIANCE_HOLD·DISPUTE·PROVIDER_OUTAGE·CONTRACT_BREACH·EMERGENCY·OTHER. **★Suspension≠Termination(가역·복귀 가능)**.
- **Resumption(§14)**: resumption_id·suspension·**resumed_at·backfill 정책(중단기간 Accrual 소급 여부)·approver·evidence**. **★중단기간 소급=명시 정책만(자동 소급 금지·§31 Backfill 계약)**.
- **Sunset(§15)**: sunset_plan_id·program·**announced_at·closed_to_new_at(신규 참여 차단)·last_accrual_at·last_claim_submission_at·last_settlement_at·last_payout_at·grace_period_end·successor_program_reference·migration_plan_reference·participant 통지 정책**·status·evidence. **★§4.6 Sunset≠Termination — Sunset=예고된 단계적 종료(신규 차단 후에도 기 발생 Accrual/Claim은 grace 기간까지 처리)**.
- **Expiry(§16)**: 계약/Validity 자연 만료(effective_to 도달)·**Expiry≠Termination(의사결정 없는 자동 만료)**·free_coupons valid_until 검증 패턴 재사용.
- **Termination(§17a)**: 계약/의사결정에 의한 조기 종료·termination_reason·termination_type(11: CONTRACT_END·SPONSOR_WITHDRAWAL·FUNDING_WITHDRAWAL·BREACH·FRAUD·COMPLIANCE·BUSINESS_DECISION·PROVIDER_DISCONTINUED·MERGER/MIGRATION·SUPERSEDED·OTHER)·**in-flight 처리 의무(§19)**·최종 정산/지급 책임(4-5-3-1-3 §18~§26 Responsibility 참조). **Retirement(§17b)**: 운영 종료 후 참조 전용(신규 전이 금지·조회/감사/재정산 참조만·**데이터 유지**). **Archive(§17c)**: 콜드 보관 Reference(archive_reference_id·retention policy·법정 보존기간·복원 절차). **★§4.6 Sunset≠Termination≠Expiry≠Retirement≠Archive≠Delete — ★Program/Version/전이/Evidence 물리 삭제 금지(Append-only·Historical 보존·§4.13)**. Provider Sunset(참조): AdAdapters GOOGLE_VER v16→v17(AdAdapters.php:31)=**Provider API 버전 sunset≠Rebate Program sunset(혼동 금지)**.

## 6. Grandfathering (§18) · In-flight Protection (§19) ★소급 금지

- **Grandfathering Policy(§18)**: grandfathering_policy_id·program·**신버전 발효 시 기존 참여자 정책·grandfathered version reference·적용 대상 Scope/Participant·grandfather_until·불리 변경 소급 금지 여부·통지 정책·opt-in/opt-out**·approver·evidence. Mode(7): NONE(전원 신버전)·FULL(기존 참여자 구버전 유지)·UNTIL_DATE·UNTIL_CONTRACT_END·UNTIL_CLAIM_SETTLED·PER_PARTICIPANT·CUSTOM. **★기존 참여자에게 불리한 신버전 자동 소급 적용 금지(구버전 Validity 보존)**.
- **Grandfathered Participant(§18b)**: participant reference(4-5-3-1-1 §참여자 Scope)·pinned version·pinned reason·valid until·evidence.
- **In-flight Protection(§19)**: **Version 전환/Suspension/Sunset/Termination 시점에 진행 중인 Accrual/Claim/Settlement/Payout은 "발생 시점 Version"으로 완결**(생성 시점 Version pinning·Claim 제출 시점 Version 기록). in_flight_protection_id·program·**protected object type(ACCRUAL/CLAIM/SETTLEMENT/PAYOUT/RECOVERY)·pinned version·pinned_at·완결 기한·미완결 시 처리 정책**·evidence. **★진행 중 Claim을 신버전 요율로 재계산 금지(§4.4/§32 정합)·Terminal 전이가 in-flight를 무단 폐기 금지(§10 Guard)**.

## 7. Lifecycle Matrix (§43) · Transition Matrix (§44) — 현행

| Program | State | State Source | Provider State | Effective From/To | Approval | Sunset Plan | Grandfathering | In-flight | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Program Lifecycle) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): 자동캠페인 | active\|paused | INTERNAL+PROVIDER | 플랫폼 push 결과 | N/A | N/A | N/A | N/A | **push 실패 시 전이 거부(502)** | auto_campaign(:602-609) |
| 인접(재사용): 마켓 수수료 룰 | N/A | INTERNAL | N/A | **effective_from**(effective_to 부재) | N/A | N/A | N/A | ★as-of 미적용(§0 관찰) | kr_fee_rule(:459) |
| 인접(재사용): 추천 보상쿠폰 | 발급\|사용\|만료\|취소 | INTERNAL | N/A | usable_from / **valid_until(NULL=무기한)** | N/A | N/A | N/A | 원자적 이중사용 방지 | free_coupons(:67-68) |
| 인접(재사용): 메뉴트리 | 현행\|기본값 스냅샷 | INTERNAL | N/A | created_at | N/A | N/A | N/A | N/A | menu_defaults(:119/584) |

| From → To | Trigger | Guard | Approval | Provider Push | 현행 정본 |
|---|---|---|---|---|---|
| DRAFT→PENDING_APPROVAL | MANUAL | Scope/Version 확정 | 필요 | N/A | 신설 |
| APPROVED→ACTIVE | SCHEDULED_DATE | **Funding/Agreement/Commitment 존재**·Effectiveness 진입 | 완료+미만료 | 필요 | 신설(auto_campaign 패턴) |
| ACTIVE→PAUSED | MANUAL/FRAUD/BUDGET | in-flight 보존 | 정책별 | **실패 시 전이 거부** | **auto_campaign(:602-609)** |
| ACTIVE→SUNSETTING | SCHEDULED/CONTRACT | closed_to_new·grace 설정 | 필요 | 필요 | 신설 |
| *→TERMINATED | BREACH/WITHDRAWAL | **in-flight 완결 정책(§19)** | 필요 | 필요 | 신설 |
| TERMINATED→RETIRED→ARCHIVED | SCHEDULED | Terminal·**물리 삭제 금지** | 필요 | N/A | 신설 |
