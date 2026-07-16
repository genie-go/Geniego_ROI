# CANONICAL DSAR — Cashback Availability Governance (Availability·Adjustment·Cancellation·Expiration·Reservation·Duplicate·Reconciliation·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-3 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_CASHBACK_ACCRUAL_MODEL.md`](CANONICAL_DSAR_CASHBACK_ACCRUAL_MODEL.md)(Calculation/Accrual/Pending/Hold/Approval) + 본 문서(Availability/Governance).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_ACCRUAL_AVAILABILITY_GOVERNANCE.md`](../architecture/ADR_DSAR_CASHBACK_ACCRUAL_AVAILABILITY_GOVERNANCE.md).

---

## 1. Availability Policy (§23) · Event (§24·§25) · Partial (§26) ★Approval≠Availability

- **Availability Policy(§23)**: availability_policy_id·rule·**release type·required conditions·delay duration·release timezone·return window policy·settlement/fraud clearance/approval/budget commitment/funding confirmation requirement·scheduled release policy·partial release support**·version·evidence. Release Type(11): IMMEDIATE·AFTER_ORDER_COMPLETION·AFTER_FULFILLMENT·**AFTER_RETURN_WINDOW·AFTER_PAYMENT_SETTLEMENT**·AFTER_APPROVAL·AFTER_FRAUD_CLEARANCE·SCHEDULED_DATE·COMPOSITE·MANUAL·CUSTOM.
- **Availability Event(§24)**: cashback_availability_event_id·accrual·**previous/new status·released amount·remaining pending amount·currency·release policy·satisfied conditions·release trigger·source event·released_at·actor·partial**·evidence. 상태(§25, 9): SCHEDULED·CONDITION_PENDING·READY·PARTIALLY_RELEASED·RELEASED·CANCELLED·EXPIRED·FAILED·BLOCKED.
- **Partial(§26)**: original approved amount·released amount·remaining pending amount·release sequence·release reason·source condition·next expected release·evidence.
**★§4.4 Approval≠Availability(승인 후 Return Window/Payment Settlement/Funding Confirmation/Budget Commitment/Fraud Clearance/Scheduled Release Date 대기)·§4.6 Pending Cashback을 Available Balance에 포함 금지(Customer Portal 표시 O·Available 분리)**. **현행 인접**: Referral usable_from(AFTER schedule)·referredRetained(AFTER fraud/retention)·ReturnsPortal(AFTER_RETURN_WINDOW)·pg settled(AFTER_PAYMENT_SETTLEMENT).

## 2. Adjustment (§27) · Partial/Full Refund (§28·§29) · Cancellation (§30) · Expiration (§31)

- **Adjustment(§27)**: adjustment_id·accrual·**adjustment type·original/adjustment/resulting amount·currency·related order/refund/payment/rule correction·effective_at·actor·approval reference**·status·evidence. Type(15): PARTIAL_REFUND·FULL_REFUND·ORDER_CANCELLATION·PAYMENT_ADJUSTMENT·PRODUCT_REMOVAL·SHIPPING/TAX_ADJUSTMENT·RULE/CAP/LIMIT/FX/ROUNDING_CORRECTION·MANUAL_CORRECTION·DUPLICATE_REMOVAL·OTHER.
- **Partial Refund(§28)**: 원 Eligible Amount·환불 대상 Item·환불 금액·남은 Eligible Amount·**Rule Refund Calculation Policy·원 Cashback·조정 Cashback·이미 Available된 금액·아직 Pending 금액·Negative Balance 가능성·Reversal 필요 여부**·evidence. **★§4.9 부분 환불 시 전체 Accrual 무조건 취소 금지(Eligible Amount·Rule Policy 기준 부분 조정)**.
- **Full Refund(§29)**: **Pending Accrual Cancel·Approved Accrual Reject·Available Cashback Reversal 예약·이미 사용된 Cashback Clawback 필요·고객 책임 없는 Service Recovery 예외·Rule-specific Exception** 구분.
- **Cancellation(§30)**: cancellation id·accrual·cancelled amount·currency·cancellation reason·source object/event·cancelled_at·actor·**downstream action**·status·evidence. Downstream(8): NONE·RELEASE_RESERVATION·REVERSE_AVAILABLE·CREATE_CLAWBACK·ADJUST_BUDGET/LIMIT/FUNDING·MANUAL_REVIEW.
- **Expiration(§31)**: expiration id·accrual·amount·currency·**expiration reason·scheduled/expired_at·notice reference·grace period·restoration support·budget/limit/funding release**·status·evidence.
**현행 인접**: OrderHub 취소 역분개·CRM LTV 취소/반품 역분개(Adjustment/Reversal 실 패턴)·kr return_fee·Referral valid_until(expiration). **★Available 전 Adjustment vs Available 후 Reversal 예약 구분**.

## 3. Budget (§32) · Limit (§33) · Funding (§34) Reservation ★선점

- **Budget Reservation(§32)**: budget reservation id·accrual·budget reference·**requested/reserved amount·currency·reserved_at·expires_at·committed_at·released_at·idempotency key**·status·evidence. Status(8): REQUESTED·RESERVED·PARTIALLY_RESERVED·COMMITTED·RELEASED·EXPIRED·FAILED·BLOCKED. **★현행 정본 참조**: ad_spend_ledger MTD budget cap(월 예산 절대 초과 금지)·charging 선점(stale 회수·동시 실행 방지)=Reservation/Commit/Release/Idempotency 실 패턴.
- **Limit Reservation(§33)**: limit reservation id·accrual·limit policy·subject scope·requested/reserved count/amount·currency·reserved/expires/committed/released_at·status·evidence(Pending Accrual이 한도 선점 정책).
- **Funding Reservation(§34)**: funding reservation id·accrual·funding agreement·funding party·requested/reserved amount·currency·reserved/confirmed/released_at·status·evidence. **★Funding Party별 Reservation 합계=Accrual Funding Allocation 일치 검증**.
**★§4.1 Accrual 확정 전 Budget/Limit/Funding 선점(Reservation)·Commit/Release/Expire Lifecycle**. 현행 cashback Reservation 부재·신설(ad_spend_ledger 예약 패턴 재사용).

## 4. Duplicate Detection (§35) · Candidate (§36)

- **Duplicate(§35)**: Provider Accrual ID·Trigger Event ID·**Idempotency Key·Subject+Rule Version+Source Object·Order+Cashback Rule·Payment+Cashback Rule·Referral Relationship+Rule·Subscription Renewal+Rule·Calculation Input Hash·Provider·Internal Lineage**. **★Duplicate 삭제 금지→Group·Winner·Excluded Record 보존**. **현행 정본**: pg_settlement/Referral/coupon_redemptions UNIQUE.
- **Candidate(§36)**: candidate id·request id·accrual·subject·beneficiary·reward account·program·rule·**rule version·trigger event·eligibility evaluation·qualification·calculation result·estimated/calculated/approved/available amount·pending reason·hold·approval·availability·budget/limit/funding reservation·duplicate group·tenant·brand·merchant·currency**·status·evidence.

## 5. Reconciliation (§37·§38) · Coverage (§39) · Gap (§40·§41)

- **Reconciliation(§37)**: Rule Decision↔Calculation Result·Calculation↔Accrual·**Estimated↔Calculated·Calculated↔Approved·Approved↔Available**·Pending Reason↔Source Object Status·Hold State↔Fraud/Payment/Budget State·Approval Decision↔Approved Amount·Availability Conditions↔Release Event·**Order Refund↔Accrual Adjustment·Budget/Limit/Funding Reservation↔Accrual/Allocation·Provider Accrual↔Internal·Customer Portal Pending Balance↔Canonical Pending·Available Balance↔Availability Event**. 상태(18): MATCH·RULE_CALCULATION/CALCULATION_ACCRUAL/ESTIMATED_CALCULATED/CALCULATED_APPROVED/APPROVED_AVAILABLE_MISMATCH·PENDING_REASON/HOLD_STATE/APPROVAL_AMOUNT/AVAILABILITY_CONDITION/REFUND_ADJUSTMENT/BUDGET/LIMIT/FUNDING_RESERVATION_MISMATCH·**DUPLICATE_ACCRUAL_RISK**·PROVIDER_INTERNAL_ACCRUAL_DRIFT·MANUAL_REVIEW·BLOCKED.
- **Coverage(§39, 24)**: Accrual Profile·Calculation Input/Result/Component·Accrual·Version·Pending·Pending Reason·Hold·Hold Release·Approval·Approval Stage·Rejection·Availability Policy/Event·Partial Availability·Adjustment·Cancellation·Expiration·Budget/Limit/Funding Reservation·Duplicate Detection·Evidence.
- **Gap(§40, 22)**: CALCULATION_INPUT/RESULT/COMPONENT_MISSING·ACCRUAL(_VERSION)_MISSING·PENDING/HOLD_REASON_MISSING·HOLD_RELEASE/APPROVAL_HISTORY_MISSING·APPROVAL_ACTOR/REJECTION_REASON_MISSING·AVAILABILITY_POLICY/EVENT_MISSING·PARTIAL_RELEASE_HISTORY_MISSING·REFUND_ADJUSTMENT/CANCELLATION/EXPIRATION_HISTORY_MISSING·BUDGET/LIMIT/FUNDING_RESERVATION_MISSING·**DUPLICATE_PREVENTION_MISSING**·PROVIDER_INTERNAL_CASHBACK_ACCRUAL_DRIFT.
- **Critical Gap(§41)**: **동일 Trigger 중복 Accrual·잘못된 고객/계정 Accrual·Calculated↔Approved 차이 근거 없음·Pending Cashback을 Available Balance 포함·Return Window 전 Available·Payment 미정산 Available·Fraud Hold 중 Available·Approval Actor/Policy 누락·부분 환불 후 미조정·전액 환불 후 Pending 유지·Budget/Limit Reservation 없이 확정·Funding Reservation 합계 불일치·Hold Release Evidence 누락·Provider↔Internal 금액 불일치·Version History 없음**.
**현행 정직 GAP**: Cashback Accrual 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지). Critical Gap 시 Access Review 차단.

## 6. Static Lint (§42) · Runtime Guard (§43)

**Lint(§42)**: **Calculation Result 없는 Accrual·Eligibility/Trigger/Rule Version 없는 Accrual·Currency/Idempotency Key 없는 Accrual·Pending Reason 없는 Pending·Hold Reason 없는 Hold·Approval Actor 없는 Manual Approval·Approval↔Availability 혼용·Pending Amount를 Available Balance 포함·Return Window Policy 누락·Partial Refund Adjustment 누락·Budget/Limit/Funding Reservation 누락·Version 없이 Amount 덮어쓰기·Duplicate Accrual 삭제·Evidence 없는 Hold Release·기존 Accrual Engine 중복 생성**.
**Guard(§43)**: Wrong Subject/Reward Account·**Cross-Tenant Accrual**·Wrong Brand/Merchant·Invalid Rule Version/Eligibility·Qualification Incomplete·**Duplicate Accrual**·Currency Mismatch·**Budget/Limit/Funding Reservation Failed·Payment Not Settled·Return Window Incomplete·Fraud Hold Active·Approval Missing·Unauthorized Approval·Invalid Availability Release·Refund Adjustment Missing**·Critical Accrual Drift·Kill Switch.
**현행 실증**: ad_spend_ledger MTD cap(Budget Guard)·charging 선점 동시 실행 방지·pg/Referral UNIQUE(Duplicate 차단)·auth_tenant(Cross-Tenant)·pg settled·AnomalyDetection(fraud)·ReturnsPortal(return window) 재사용.

## 7. Error (§44) · Warning (§45)

**Error(22)**: CASHBACK_CALCULATION_RESULT_NOT_FOUND·CALCULATION_FAILED·ACCRUAL_NOT_FOUND·**ACCRUAL_DUPLICATE**·ACCRUAL_SCOPE_MISMATCH·PENDING/HOLD_REASON_REQUIRED·HOLD_ACTIVE·**APPROVAL_REQUIRED·APPROVAL_UNAUTHORIZED·APPROVAL_AMOUNT_INVALID·AVAILABILITY_CONDITION_INCOMPLETE·RETURN_WINDOW_INCOMPLETE·PAYMENT_NOT_SETTLED·FRAUD_HOLD_ACTIVE·BUDGET/LIMIT/FUNDING_RESERVATION_FAILED·REFUND_ADJUSTMENT_REQUIRED**·ACCRUAL_VERSION_MISSING·ACCRUAL_RECONCILIATION_FAILED·ACCRUAL_RUNTIME_BLOCKED.
**Warning(16)**: ESTIMATED_AMOUNT·CALCULATION_COMPONENT·PENDING_DELAY·RETURN_WINDOW·PAYMENT_SETTLEMENT·FRAUD_REVIEW·MANUAL_REVIEW·APPROVAL_DELAY·PARTIAL_APPROVAL·PARTIAL_AVAILABILITY·BUDGET/LIMIT/FUNDING_RESERVATION·REFUND_ADJUSTMENT_WARNING·PROVIDER_INTERNAL_ACCRUAL_DRIFT·ACCRUAL_MANUAL_REVIEW_REQUIRED.

## 8. Golden Dataset (§46) · Conformance (§47) · Legacy Equivalence (§48)

**Golden(§46)**: Calculation(Percentage/Fixed/Tiered·Cap/Limit/Budget/Funding 조정·FX/Rounding·Zero-value·Failure) · Accrual(Estimated/Calculated/Pending/Approved/Available·**Duplicate 차단·Wrong Customer/Cross-Tenant 차단·Rule Version 누락 차단·Idempotency 재처리**) · Pending(Order Completion/Fulfillment/**Return Window**/Payment Settlement/Fraud Review/Manual Approval/Budget/Funding/Scheduled/Expiration) · Hold(Return Window/Payment/Fraud/Manual Review/Budget/Limit/Funding·Full/Partial Release·Rejection/Extension) · Approval(Automatic/Provider/Fraud Clearance/Finance/Multi-stage/Partial/Rejection/Deferred·**Unauthorized 차단**/Expiration) · Availability(Immediate/Order Completion 후/**Return Window 후/Payment Settlement 후**/Fraud Clearance 후/Scheduled/Composite/Partial·**Invalid Release 차단**) · Refund/Adjustment(Partial/Full/Order Cancellation/Product Removal/Rule/FX/Rounding Correction/Duplicate Removal·**Available 전 Adjustment·Available 후 Reversal 예약**) · Reservation(Budget/Partial/Failure·Limit/Shared·Funding/Multi-party·Expiration/Release/Commit) · Governance(Provider Match/Drift·Version History·**Customer Portal Pending 일치·Evidence Missing/Critical Gap Block**).
**실 회귀 시드**: ad_spend_ledger MTD cap·charging 선점·pg/Referral UNIQUE 중복 차단·ReturnsPortal return window·OrderHub 역분개·Referral usable_from — 즉시 Golden 등록 가능.
**Conformance(§47)**: Purchase/First Purchase/Subscription/Renewal/Referral/Product/Merchant/Card-linked/Campaign/Loyalty Tier Cashback에 동일 Contract(Calculation Input/Result·Accrual·Version·Pending·Hold·Approval·Availability·Adjustment·Cancellation·Expiration·Budget/Limit/Funding Reservation·Dedup·Reconciliation·Evidence·Audit).
**Legacy Equivalence(§48)**: 기존 ad_spend_ledger(pending/charging/commit·budget)·Referral(usable_from/retained)·OrderHub 역분개·pg settled와 Calculation/Estimated/Calculated/Approved/Available/Pending/Hold/Approval/Rejection/Availability/Partial/Refund Adjustment/Reservation/Duplicate·Error·Warning·Latency·Audit 비교. **UNEXPLAINED·중복 Accrual·Premature Release→전환차단**.

## 9. 기존 구현 분류 (§49) · 중복 감사 (§50)

| 구현 | 분류 | 근거 |
|---|---|---|
| `BillingMethod.ad_spend_ledger`(pending/charging/committed·MTD budget cap·charging 선점) | **VALIDATED_LEGACY·KEEP_SEPARATE_WITH_REASON** | outbound 광고비 청구. **Pending/Hold/Budget Reservation/Idempotency 참조 정본**·고객 cashback 아님 |
| `Referral`(usable_from/referredRetained/valid_until) | **VALIDATED_LEGACY·KEEP_SEPARATE** | 구독 쿠폰 pending/hold/expiration 실 사례 |
| pg_settlement/Referral/coupon_redemptions UNIQUE | **VALIDATED_LEGACY(Idempotency 정본)** | §4.8 중복 Accrual 방지 |
| `ReturnsPortal`/kr return_fee·`pg_settlement`(settled)·`AnomalyDetection` | **VALIDATED_LEGACY** | Return Window/Payment Settlement/Fraud Hold 조건 |
| OrderHub 취소 역분개·CRM LTV 역분개 | **VALIDATED_LEGACY(인접)** | Refund/Cancellation Adjustment 실 패턴 |
| Cashback Calculation Result/Accrual/Version/Pending/Hold/Approval/Rejection/Availability/Adjustment/Reservation(cashback) | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**중복 감사(§50)**: **Budget Reservation=ad_spend_ledger 단일(MTD cap)·Idempotency=UNIQUE 정본·Return=ReturnsPortal·Fraud=AnomalyDetection**. ★도입 시 **Provider별 독립 Accrual Model 금지·기존 ad_spend_ledger 예약/선점 패턴·Idempotency·역분개 재사용(중복 엔진 금지)**.

## 10. 기능 후퇴 방지 · 검증 게이트 (§56) · 영구 규칙

**후퇴 방지**: ad_spend_ledger·Referral·pg_settlement·ReturnsPortal·AnomalyDetection·OrderHub 역분개·`/v427/billing/*`·Existing Calculation/Approval/Scheduler/Admin/API/Customer Portal 기능 보존(회귀 0).
**게이트(§56)**: Calculation Input/Result 보존·**Estimated≠Calculated≠Approved≠Available**·Accrual/Version History·**Pending≠Hold**·Pending Reason/해결 시점·Hold Reason/Release Decision·**Approval Actor/Policy/Amount·Partial Approval**·Availability Policy/Event·Partial Availability·**Return Window/Payment Settlement/Fraud 조건 검증**·Refund/Cancellation Adjustment·**Budget/Limit/Funding Reservation·Duplicate Accrual 차단·Pending 금액↔Available Balance 분리**·Candidate Lifecycle·Reconciliation·Coverage/Gap/Evidence·Lint/Guard·**기존 Engine 중복 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History.
**영구 규칙(§59)**: 신규 Cashback Accrual 도입 전 **기존 ad_spend_ledger(예약/선점/MTD cap)/Idempotency(UNIQUE)/역분개(OrderHub)/Return(ReturnsPortal)/Fraud(AnomalyDetection) 재사용(중복 엔진 금지)** · Calculation Result/Accrual/Pending/Hold/Approval/Availability 별도 Entity/상태 · **Eligibility 확인≠즉시 Available** · Estimated/Calculated/Approved/Available 분리 · **Amount 변경 Append-only Version/Adjustment(덮어쓰기 금지)** · **Pending≠Hold·Approval≠Availability·Hold≠Not Eligible·Pending≠Available Balance** · Return Window/Payment Settlement/Fraud/Budget/Limit/Funding Hold 구분 · 다단계 승인·Approval Actor≠자동 Source · Availability Policy 조건 검증(Return Window/Settlement 전 확정 금지) · 부분 환불 부분 조정(전체 취소 금지)·전액 환불 상태별 구분 · Budget/Limit/Funding Reservation(Commit/Release/Expire·Funding 합계 일치) · **Duplicate Accrual 차단(Idempotency·Group 보존·삭제 금지)** · Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **Pending↔Available Balance·Approval↔Availability·Hold↔Not Eligible·outbound 광고비 ledger↔cashback accrual·Provider별 독립 Accrual Model 오혼입/중복 금지.**

## 11. Reservation Matrix (§55) — 현행

| Accrual | Budget Requested | Budget Reserved | Limit Reserved | Funding Reserved | Expiry | Commit | Release | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Reservation) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 인접(참조): 광고비 청구 | 당월 약정 | MTD≤월예산 | N/A | N/A | 월말 | charged | 크래시 회수 | pending→charging→committed | ad_spend_ledger |
