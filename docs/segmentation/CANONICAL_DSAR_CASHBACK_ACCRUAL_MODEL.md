# CANONICAL DSAR — Cashback Accrual Model (Calculation·Accrual·Version·Pending·Hold·Approval·Rejection)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-3 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Calculation/Accrual/Pending/Hold/Approval) + [`CANONICAL_DSAR_CASHBACK_AVAILABILITY_GOVERNANCE.md`](CANONICAL_DSAR_CASHBACK_AVAILABILITY_GOVERNANCE.md)(Availability·Adjustment·Reservation·Duplicate·Reconciliation·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_ACCRUAL_AVAILABILITY_GOVERNANCE.md`](../architecture/ADR_DSAR_CASHBACK_ACCRUAL_AVAILABILITY_GOVERNANCE.md).
> 선행: Eligibility/Trigger(4-5-2-2)·Program/Rule(4-5-2-1)·Monetary Accrual/Ledger(4-5-1-2)·Value/FX(4-5-1-4)·Point Ledger(4-3).
> **범위**: 출금/Wallet 전환/Payout 아님 — 계산·예정 적립·보류·승인·사용 가능 전환 **판단 기반**(다음 Part 4-5-2-4 Ledger/Payout).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Cashback Accrual / Pending / Hold / Approval / Availability 엔진** | ❌ **부재(grep 0)** — `cashback accru` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Pending → Charging → Committed Lifecycle + Budget Reservation** | ✅ **REAL 정본(참조)** — `BillingMethod.ad_spend_ledger`: status `pending`(미청구·정직) → `charging`(선점·**stale 회수**·동시 실행 방지) → `reconciling` → committed · **MTD budget cap**(월 예산 한도 절대 초과 금지) | **VALIDATED_LEGACY·KEEP_SEPARATE_WITH_REASON**(outbound 광고비·고객 cashback 아님. **Pending/Hold/Budget Reservation/Idempotency 실 패턴 참조 정본**) |
| **Pending → Available Lifecycle + Hold + Expiration** | △ `Referral` usable_from(30일 pending/lock)·**referredRetained(hold gate)**·valid_until(expiration) | **VALIDATED_LEGACY**(pending/hold/expiration 실 사례·구독 쿠폰·KEEP_SEPARATE) |
| **Duplicate Accrual 방지 (Idempotency)** | ✅ **REAL 정본** — pg_settlement/Referral/coupon_redemptions UNIQUE | **VALIDATED_LEGACY**(§4.8 중복 Accrual 방지 정본) |
| **Return Window / Payment Settlement / Fraud Hold** | △ `ReturnsPortal`/kr return_fee(return window)·`pg_settlement`(settled)·`AnomalyDetection`(fraud) | **VALIDATED_LEGACY**(Hold 조건 인접) |
| **Refund / Cancellation Adjustment (Reversal)** | △ OrderHub 취소 역분개·CRM LTV 취소/반품 역분개(Part 268/263) | **VALIDATED_LEGACY(인접·주문/LTV)** · Cashback Accrual Adjustment = **NOT_APPLICABLE** |
| **Accrual 상태 계약 (Earned→Pending→Confirmed→Available)** | △ Point Ledger(4-3)=전방호환 상태 계약(엔진 부재) | **NOT_APPLICABLE → 신설(정합)** |
| **Calculation Result/Component·Accrual/Version·Pending/Hold/Approval/Rejection·Reservation(cashback)** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Cashback Accrual/Pending/Hold/Approval/Availability 엔진은 부재(NOT_APPLICABLE)**. 그러나 **Accrual lifecycle의 실 패턴이 풍부**: **BillingMethod ad_spend_ledger**(pending→charging→committed + MTD budget cap + charging 선점 = **Pending/Hold/Budget Reservation/Idempotency 참조 정본**·outbound 광고비·KEEP_SEPARATE)·Referral(usable_from/referredRetained/valid_until = pending/hold/expiration)·Idempotency(UNIQUE)·Return/Settlement/Fraud(ReturnsPortal/pg/AnomalyDetection)·역분개(OrderHub/CRM). **기존 BillingMethod 예약/선점 패턴·Idempotency·역분개 재사용(중복 엔진 금지)**·지어내기·NO_DATA/오탐 금지·본 Accrual=멀티테넌트 고객용 미래 cashback 전방호환 계약.

---

## 1. Canonical Entity (29) — §5

CASHBACK_ACCRUAL_PROFILE·CALCULATION_RESULT·CALCULATION_INPUT·CALCULATION_COMPONENT·ACCRUAL·ACCRUAL_VERSION·PENDING·PENDING_REASON·HOLD·HOLD_REASON·HOLD_RELEASE·APPROVAL·APPROVAL_DECISION·REJECTION·AVAILABILITY_EVENT·AVAILABILITY_POLICY·ACCRUAL_ADJUSTMENT·ACCRUAL_CANCELLATION·ACCRUAL_EXPIRATION·BUDGET_RESERVATION·LIMIT_RESERVATION·FUNDING_RESERVATION·ACCRUAL_DUPLICATE_GROUP·ACCRUAL_CANDIDATE·ACCRUAL_RECONCILIATION·ACCRUAL_COVERAGE·ACCRUAL_GAP·ACCRUAL_EVIDENCE·ACCRUAL_AUDIT_EVENT.
**현행 실체**: Pending/Hold/Budget Reservation(ad_spend_ledger)·Idempotency(UNIQUE)·Expiration(Referral valid_until) = REAL 참조. 나머지 = **신설**.

## 2. Profile (§6) · Calculation Input (§7) · Result (§8) · Component (§9)

- **Profile(§6)**: cashback_accrual_profile_id·provider/account·program·tenant·brand·store/merchant·legal_entity·environment·**calculation source·accrual source of truth·pending/hold/approval/availability/adjustment/expiration/budget reservation/limit reservation/funding reservation/duplicate prevention model**·historical coverage·deleted accrual support·owner·version·status·evidence. → 부재·신설.
- **Calculation Input(§7)**: calculation_input_id·subject·reward account·trigger event·program·rule·**rule version·eligibility evaluation·qualification·source order/payment/subscription/referral·gross/eligible/excluded/refunded/tax/shipping/discount/point payment/gift card/wallet credit amount·currency·FX reference·limit/budget/funding snapshot**·evaluated_at·evidence. **현행 인접**: kr_settlement_line 이중차감(excluded)·Pnl NET_PAID·pg net.
- **Calculation Result(§8)**: cashback_calculation_result_id·input·**calculation method·base amount·rate·fixed amount·tier reference·calculated amount·cap before/applied·limit/budget/funding adjusted·final calculated amount·currency·rounding policy·rounding difference·rule version**·calculated_at·calculation status·exclusion reasons·evidence. 상태(10): CALCULATED·ZERO_VALUE·CAP_APPLIED·LIMIT_ADJUSTED·BUDGET_ADJUSTED·FUNDING_ADJUSTED·EXCLUDED·FAILED·MANUAL_REVIEW·BLOCKED.
- **Component(§9)**: component id·result·**component type·input amount·rate·output amount·currency·sequence·rule reference·applied·reason**·evidence. Type(16): BASE_AMOUNT·PERCENTAGE·FIXED_AMOUNT·TIER_RATE·PRODUCT/CATEGORY/MERCHANT/PAYMENT_METHOD_RATE·CAP·LIMIT·BUDGET·FUNDING·FX·ROUNDING·ADJUSTMENT·OTHER.
**★§4.1 Calculation Result≠Accrual(Eligibility 실패/Duplicate/Budget 부족/Limit 초과/Invalid Currency/Fraud Block/Wrong Account/Manual Review로 Accrual 미생성)**. **★Decimal/Minor Unit·Float 금지(Part 4-5-1-4 계승)**.

## 3. Cashback Accrual (§10) · 상태 (§11) · Version (§12) ★Append-only

- **Accrual(§10)**: cashback_accrual_id·monetary reward id·reward account·subject·beneficiary·program·definition·rule·**rule version·eligibility evaluation·qualification·trigger event·calculation result·external accrual id·estimated/calculated/approved/available/rejected/cancelled/adjusted amount·currency·accrual status·pending reason·hold/approval/availability reference·budget/limit/funding reservation·idempotency key·duplicate group·accrued/approved/available/expires_at·source of truth**·evidence.
- **상태(§11, 23)**: DRAFT·ESTIMATED·CALCULATED·PENDING·HELD·APPROVAL_PENDING·PARTIALLY_APPROVED·APPROVED·AVAILABILITY_PENDING·PARTIALLY_AVAILABLE·AVAILABLE·PARTIALLY_REJECTED·REJECTED·PARTIALLY_CANCELLED·CANCELLED·PARTIALLY_ADJUSTED·ADJUSTED·EXPIRED·REVERSED·FAILED·BLOCKED·ARCHIVED·UNKNOWN.
- **Version(§12)**: accrual version id·accrual·previous version·**previous/new amount·previous/new status·change reason·related refund/order change/rule correction/approval/hold release·effective_at·recorded_at·actor**·evidence. **현재값 덮어쓰기 금지**.
**★§4.2 Estimated≠Calculated≠Approved≠Available(10,000≠8,500≠8,000≠7,500·500 환불 조정)·§4.5 모든 Amount 변경 Version/Adjustment/Decision History 보존(Append-only·Point Ledger 4-3 정합)·§4.8 동일 Trigger/Rule/Subject 중복 Accrual 금지(Idempotency Key·Duplicate Group·UNIQUE 정본)**.

## 4. Pending (§13·§14) · Hold (§15~§18) ★Pending≠Hold

- **Pending(§13)**: cashback_pending_id·accrual·**pending reason·pending amount·currency·started_at·expected/actual resolution_at·source condition·related event**·status·evidence. 상태(14): PENDING·WAITING_ORDER_COMPLETION/FULFILLMENT/**RETURN_WINDOW**/PAYMENT_SETTLEMENT/FRAUD_REVIEW/APPROVAL/BUDGET/FUNDING/LIMIT_RELEASE/SCHEDULE·RESOLVED·CANCELLED·EXPIRED·FAILED. Reason(§14, 15): ORDER_NOT_COMPLETED/FULFILLED·RETURN_WINDOW_NOT_COMPLETED·PAYMENT_NOT_SETTLED·FRAUD/MANUAL_REVIEW_PENDING·APPROVAL/BUDGET/FUNDING/LIMIT/PROVIDER_CONFIRMATION_PENDING·SCHEDULED_RELEASE·DATA_INCOMPLETE·EVENT_ORDERING_PENDING·OTHER.
- **Hold(§15)**: cashback_hold_id·accrual·**hold type·hold reason·hold amount·currency·placed_by·placed_at·expected review_at·released_at·release decision·escalation reference**·status·evidence. 상태(9): ACTIVE·REVIEW_PENDING·RELEASED·PARTIALLY_RELEASED·EXTENDED·REJECTED·CANCELLED·EXPIRED·BLOCKED.
- **Hold Type(§16, 12)**: RETURN_WINDOW·PAYMENT_SETTLEMENT·FRAUD·MANUAL_REVIEW·BUDGET·LIMIT·FUNDING·DISPUTE·COMPLIANCE·PROVIDER·DATA_QUALITY·OTHER. Reason(§17, 15): ORDER_RETURN_RISK·PAYMENT_SETTLEMENT_PENDING·PAYMENT_DISPUTE·FRAUD_SCORE_HIGH·IDENTITY_MISMATCH·BENEFICIARY_UNVERIFIED·BUDGET/LIMIT/FUNDING_RESERVATION_FAILED·RULE_CONFLICT·SOURCE_DATA_CONFLICT·PROVIDER/COMPLIANCE/MANUAL_ADMIN_REVIEW·OTHER.
- **Hold Release(§18)**: hold release id·hold·**release type·released amount·remaining held amount·decision·decision source·decided_by·decided_at·next status·conditions**·evidence. Type(6): FULL_RELEASE·PARTIAL_RELEASE·REJECT·EXTEND·CONVERT_TO_MANUAL_REVIEW·CANCEL.
**★§4.3 Pending(정상 대기)≠Hold(위험/검토/조건 미충족 의도적 중단)·§4.7 Hold≠Not Eligible(해제 후 승인/사용 가능 전환 가능)**. **현행 인접**: ad_spend_ledger pending/charging·ReturnsPortal(return window)·pg settled·AnomalyDetection(fraud).

## 5. Approval (§19·§20) · Multi-stage (§21) · Rejection (§22)

- **Approval(§19)**: cashback_approval_id·accrual·**approval type·requested/approved/rejected amount·currency·approval source·approval actor·requested/decided_at·decision·decision reason·policy version**·evidence. Type(8): AUTOMATIC_RULE·PROVIDER·FRAUD_CLEARANCE·FINANCE·OPERATIONS·CUSTOMER_SERVICE·MANUAL_ADMIN·MULTI_STAGE_APPROVAL. Decision(§20, 9): APPROVED·PARTIALLY_APPROVED·REJECTED·DEFERRED·MORE_INFORMATION_REQUIRED·ESCALATED·CANCELLED·EXPIRED·BLOCKED.
- **Multi-stage(§21)**: Rule Engine→Provider→Fraud→Operations→Finance→Compliance→Final. stage id·sequence·approver role·requested/decision amount·status·decision·decided_at·evidence.
- **Rejection(§22)**: cashback_rejection_id·accrual·**rejected amount·currency·rejection type·reason·source·actor·rejected_at·customer-visible reason reference·appeal support·appeal deadline**·status·evidence. Type(12): ELIGIBILITY_INVALIDATED·ORDER_CANCELLED·PAYMENT_FAILED·REFUND_COMPLETED·FRAUD_BLOCKED·LIMIT_EXCEEDED·BUDGET_EXHAUSTED·FUNDING_FAILED·DUPLICATE_ACCRUAL·INVALID_BENEFICIARY·PROVIDER/MANUAL_REJECTED·OTHER.
**★§4.10 Approval Actor≠자동 승인 Source(System/Provider/Rule Engine/Fraud Engine/Finance/Operations/Customer Service/Manual Admin 구분)**. 현행 승인 워크플로 부재·신설(admin requirePlan 재사용).

## 6. Accrual Lifecycle Matrix (§53) · Hold·Approval Matrix (§54) — 현행

| Accrual | Estimated | Calculated | Pending | Held | Approved | Available | Adjusted | Cancelled | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Accrual) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(참조): 광고비 청구 | N/A | 약정액 | pending(미청구) | charging(선점) | — | committed(charged) | reconciling | 회수 | ad_spend_ledger |
| 인접: 추천보상 | N/A | 1개월 PRO | usable_from(30일 lock) | referredRetained gate | granted | usable | N/A | 미유지 잠금 | referral_signup |

| Accrual | Hold Type | Held Amount | Review | Approval Type | Approved | Rejected | Released | Actor | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Hold/Approval) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 인접: 추천 먹튀게이트 | RETAIN(referredRetained) | 쿠폰 | 30일 유지 | 자동(활성 확인) | usable | 미유지 차단 | usable_from 경과 | system | referral_signup |
