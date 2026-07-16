# CANONICAL DSAR — Cashback Reversal & Refund Adjustment Model (Reversal·Refund·Order Cancellation·Return·Chargeback·Fraud Case)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-5 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Reversal/Refund/Order/Return/Chargeback/Fraud Case) + [`CANONICAL_DSAR_CASHBACK_CLAWBACK_RECOVERY_GOVERNANCE.md`](CANONICAL_DSAR_CASHBACK_CLAWBACK_RECOVERY_GOVERNANCE.md)(Clawback·Offset·Negative Balance·Write-off·Restoration·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_REVERSAL_REFUND_CLAWBACK.md`](../architecture/ADR_DSAR_CASHBACK_REVERSAL_REFUND_CLAWBACK.md).
> 선행: Ledger/Payout(4-5-2-4)·Accrual(4-5-2-3)·Monetary Reversal/Clawback(4-5-1-2)·Value/FX(4-5-1-4)·Point Ledger(4-3).
> **범위**: Cashback 전체 Lifecycle 종결(취소·환불·부정 회수·환수). 다음 Part 4-5-3-1 Rebate.

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Cashback Reversal / Refund Adjustment / Fraud Recovery / Clawback 엔진** | ❌ **부재(grep 0)** — `cashback reversal/clawback/recovery/refund` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Reversal (역분개) 실 정본** | ✅ **REAL 정본** — `OrderHub` 취소/반품 **CRM LTV 역분개**(폴링/웹훅 대칭·원주문 총액)·**order_id 멱등(이중역분개 방지)**·**부분클레임 과다역분개 수정(실환불액=원주문 상한)**·역전이 차단(force=true·un-cancel) | **VALIDATED_LEGACY**(§4.4 부분 조정·§57 Duplicate Recovery 방지·§4.5 원 기록 보존 실 정본) |
| **Return Adjustment (반품 신청/확정)** | △ `ReturnsPortal`·kr return_fee | **VALIDATED_LEGACY**(§18 반품 신청≠확정 인접) |
| **Chargeback Adjustment** | △ `Paddle`(dispute·MoR·대부분 OUT_OF_SCOPE) | **KEEP_SEPARATE_WITH_REASON**(MoR·PCI OUT_OF_SCOPE·§19 인접) |
| **Fraud Case (의심/확정 구분)** | △ `AnomalyDetection`/DataTrust(V3 신뢰검증) | **VALIDATED_LEGACY**(§20·§21 suspected/confirmed·신호 원문 미복제) |
| **Clawback-like Recovery** | △ `Referral` referredRetained(먹튀방지·1개월 미유지 시 쿠폰 영구 잠금) | **VALIDATED_LEGACY·KEEP_SEPARATE**(구독 쿠폰·clawback-like) |
| **Idempotency / Duplicate Recovery 방지** | ✅ **REAL 정본** — pg/Referral/coupon UNIQUE + **OrderHub order_id 멱등** | **VALIDATED_LEGACY**(§8 Duplicate Reversal 방지) |
| **FX / Point Ledger 상태 계약** | ✅ fxToKrw · Point Ledger 4-3(Reversal/Clawback 상태 계약·Append-only) | **VALIDATED_LEGACY(확장/정합)** |
| **Reversal Policy/Decision·Refund Allocation·Clawback/Calculation/Collection·Negative Balance/Write-off/Future Offset/Direct Repayment/Dispute/Appeal(outbound 회수)** | ❌ 완전 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **고객 Cashback Reversal/Refund Adjustment/Fraud Recovery/Clawback 엔진은 부재(NOT_APPLICABLE)**. 그러나 **Reversal의 실 정본이 강함**: **OrderHub 취소/반품 역분개**(CRM LTV 역분개·**order_id 멱등으로 이중역분개 방지**·**부분클레임 과다역분개 수정=부분 조정**·역전이 차단·원 기록 보존)·ReturnsPortal(반품)·AnomalyDetection(Fraud)·Referral referredRetained(clawback-like)·Idempotency(UNIQUE+order_id). **★핵심 정직: Reversal(시스템 내부 되돌림)=OrderHub 역분개로 실체 강함·Clawback(이미 지급된 현금 outbound 회수)/Negative Balance/Write-off/Future Offset/Direct Repayment/Dispute=완전 부재(신설·Payout outbound 부재와 동일)**. **기존 OrderHub 역분개 멱등/부분조정·Idempotency·AnomalyDetection·Point Ledger 4-3 재사용(중복 엔진 금지)**·지어내기·NO_DATA/오탐 금지·본 Recovery=멀티테넌트 고객용 미래 cashback 전방호환 계약.

---

## 1. Canonical Entity (33) — §5

CASHBACK_RECOVERY_PROFILE·REVERSAL·REVERSAL_POLICY·REVERSAL_DECISION·REFUND_ADJUSTMENT·REFUND_ALLOCATION·ORDER_CANCELLATION_ADJUSTMENT·RETURN_ADJUSTMENT·CHARGEBACK_ADJUSTMENT·FRAUD_CASE·FRAUD_RECOVERY_DECISION·CLAWBACK·CLAWBACK_CALCULATION·CLAWBACK_RESERVATION·CLAWBACK_COLLECTION·RECOVERY_PLAN·RECOVERY_INSTALLMENT·RECOVERY_OFFSET·NEGATIVE_BALANCE·NEGATIVE_BALANCE_POLICY·RECOVERY_FAILURE·UNRECOVERABLE_BALANCE·WRITE_OFF·RECOVERY_REINSTATEMENT·RECOVERY_NOTIFICATION·RECOVERY_DISPUTE·RECOVERY_APPEAL·RECOVERY_CANDIDATE·RECOVERY_RECONCILIATION·RECOVERY_COVERAGE·RECOVERY_GAP·RECOVERY_EVIDENCE·RECOVERY_AUDIT_EVENT.
**현행 실체**: REVERSAL(OrderHub 역분개·멱등·부분조정 정본)·FRAUD_CASE(AnomalyDetection)·RETURN(ReturnsPortal)·Idempotency(UNIQUE) = REAL. 나머지 = **신설**.

## 2. Recovery Profile (§6) · Reversal (§7~§10)

- **Profile(§6)**: cashback_recovery_profile_id·provider/account·program·tenant·brand·merchant·legal_entity·environment·**reversal/refund adjustment/fraud recovery/clawback/negative balance/future offset/direct repayment/dispute/write-off/FX/accounting model**·source of truth·historical coverage·deleted recovery support·owner·version·status·evidence. → 부재·신설.
- **Reversal(§7)**: cashback_reversal_id·account·accrual·**original transaction/ledger entry/redemption/conversion/settlement/payout·reversal type·reversal reason·requested/approved/reversed/remaining amount·currency·source refund/cancellation/chargeback/fraud case·requested/approved/reversed_at·actor·idempotency key**·status·evidence.
- **Type(§8, 14)**: PENDING_ACCRUAL_CANCEL·APPROVED_ACCRUAL_CANCEL·AVAILABLE_BALANCE_REVERSAL·RESERVATION_REVERSAL·REDEMPTION_REVERSAL·WALLET/STORE_CREDIT_CONVERSION_REVERSAL·SETTLEMENT_REVERSAL·PAYOUT_REVERSAL·EXPIRATION_REVERSAL·DUPLICATE_TRANSACTION_REVERSAL·RULE_CORRECTION_REVERSAL·MANUAL_ADJUSTMENT_REVERSAL·OTHER.
- **Reason(§9, 20)**: ORDER_CANCELLED/RETURNED·PARTIAL/FULL_REFUND·PAYMENT_VOIDED/REFUNDED·CHARGEBACK·FRAUD_CONFIRMED·DUPLICATE_ACCRUAL/REDEMPTION/PAYOUT·INVALID_ELIGIBILITY·WRONG_BENEFICIARY/RULE·RULE_CONFIGURATION_ERROR·PROVIDER/DATA_ERROR·MANUAL_CORRECTION·CUSTOMER_DISPUTE_UPHELD·OTHER. 상태(§10, 13): REQUESTED·VALIDATING·APPROVAL_PENDING·APPROVED·PARTIALLY_REVERSED·REVERSED·**COLLECTION_REQUIRED**·FAILED·REJECTED·CANCELLED·DISPUTED·BLOCKED·UNKNOWN.
**★§4.1 Reversal(내부 되돌림)≠Clawback(현금 회수)·§4.10 모든 Recovery 원 거래 연결·§10 REVERSED≠COLLECTION_REQUIRED(Available은 Reversal·Paid는 Clawback)**. **현행 정본**: OrderHub 역분개(order_id 멱등·부분클레임 과다역분개 수정).

## 3. Reversal Policy (§11) · Decision (§12) ★상태별 처리

- **Policy(§11)**: reversal policy id·rule·**reward state·source event type·full/partial reversal support·original/current FX policy·fee/tax treatment·budget/limit/funding restoration·customer notification·appeal support**·valid from/to·version·evidence.
- **Decision(§12)**: decision id·reversal·**original/current state·original amount·refundable base amount·eligible remaining amount·reversible amount·collection required amount·reason·policy version·decision source·decided_by/at**·status·evidence.
**★§4.3 상태별 처리 분리**: Pending(취소/감액)·Approved(승인 취소/감액)·Available(**Ledger Reversal**)·Reserved(Reservation 해제/감액)·Redeemed(복원/상계/채권화)·Wallet Converted(Destination Wallet Debit)·**Paid(외부 회수/향후 상계/채권=Clawback)**. **★§4.5 이미 사용된 Cashback 삭제 금지→Reversal/Recovery Entry 추가(OrderHub 원 기록 보존 정합·Point Ledger 4-3 Append-only)**.

## 4. Refund Adjustment (§13·§14) · Allocation (§15) · Threshold/Cap 재평가 (§16) ★부분≠전액

- **Refund Adjustment(§13)**: cashback_refund_adjustment_id·refund/order/payment reference·accrual·ledger·**original/refunded/remaining eligible amount·original/recalculated cashback amount·reversal/clawback amount·currency·FX reference·adjustment method**·calculated_at·status·evidence. Method(§14, 11): PROPORTIONAL·ITEM_LEVEL_RECALCULATION·RULE/THRESHOLD/CAP/TIER_REEVALUATION·FIXED_REWARD_REVERSAL·MERCHANT/CONTRACT_POLICY·MANUAL·CUSTOM.
- **Allocation(§15)**: allocation id·refund adjustment·**order item·product·category·merchant·original/refunded/remaining item amount·original/recalculated item cashback·adjustment amount·currency·rule reference**·evidence.
- **Threshold/Cap 재평가(§16)**: Minimum Purchase·Net Paid·Product Quantity·Eligible Category·Merchant Threshold·Tiered Rate·Per-order/Campaign Cap·Member Limit·Funding Allocation·Budget Consumption. **★부분 환불 후 Threshold 미달 시 전체 Cashback 취소 여부 Policy 명시**.
**★§4.4 부분 환불을 전액 Reversal로 처리 금지(Item/Eligible Amount/Rule/Cap/Threshold 재계산)**. **★현행 정본**: OrderHub **부분클레임 과다역분개 수정(실환불액=원주문 상한)**·kr return_fee. Refund Adjustment(cashback-specific)=신설.

## 5. Order Cancellation (§17) · Return (§18) · Chargeback (§19)

- **Order Cancellation(§17)**: adjustment id·order·cancellation event·**cancellation type·cancelled items/amount·affected accruals/redemptions/payouts·reversal/clawback amount·budget/limit/funding restoration**·status·evidence.
- **Return(§18)**: return adjustment id·return reference·**returned items·received·return accepted·restocking fee·refund amount·Cashback impact·effective date·dispute status**·status·evidence. **★반품 신청≠실제 반품 확정 구분**(ReturnsPortal 인접).
- **Chargeback(§19)**: chargeback adjustment id·chargeback reference·payment·order·**chargeback/disputed/won/lost amount·original Cashback·provisional recovery·final recovery·recovery release**·status·evidence. **★Chargeback 취소/승소 시 Recovery 복구**. → Paddle(MoR·OUT_OF_SCOPE 인접).
**현행 정본**: OrderHub 취소/반품 역분개(order_id 멱등·CRM LTV 역분개)·ReturnsPortal(반품).

## 6. Fraud Case (§20·§21) · Recovery Decision (§22) ★의심≠확정

- **Fraud Case(§20)**: cashback_fraud_case_id·subject·beneficiary·account·**related accruals/redemptions/conversions/payouts·fraud case reference·fraud category·suspected/confirmed/recoverable amount·risk score reference·opened/reviewed/confirmed/cleared_at**·status·evidence. Category(13): FAKE_ORDER·SELF_REFERRAL·MULTI_ACCOUNT_ABUSE·PAYMENT/REFUND/RETURN_FRAUD·COUPON_STACKING/DUPLICATE_REWARD/IDENTITY_ABUSE·MERCHANT_COLLUSION·CREATOR_ATTRIBUTION_FRAUD·ACCOUNT_TAKEOVER·OTHER. 상태(§21, 12): SUSPECTED·OPEN·UNDER_REVIEW·PROVISIONAL_HOLD·CONFIRMED·PARTIALLY_CONFIRMED·CLEARED·DISPUTED·APPEALED·CLOSED·BLOCKED·UNKNOWN.
- **Recovery Decision(§22)**: decision id·fraud case·**recovery required·recoverable/non-recoverable amount·reversal/clawback amount·account freeze·future offset·direct collection·payout block·decision source·decided_by/at·policy version**·evidence.
**★§4.8 Fraud 의심(Suspected/Under Review)≠확정(Confirmed)(의심만으로 확정 환수 금지)**. **현행 인접**: AnomalyDetection/DataTrust(V3 READY/WARNING/BLOCKED·신호 원문 미복제·Referral self_referral 방지 인접). Fraud Case Store=신설.

## 7. Recovery Matrix (§68) · Refund Adjustment Matrix (§69) — 현행

| Original Reward | Refund | Reversal | Clawback | Recoverable | Collected | Remaining | Negative Balance | Write-off | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Recovery) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(참조): 주문 취소 | 채널 환불 | ✅OrderHub 역분개(멱등) | N/A(outbound 부재) | N/A | N/A | N/A | N/A | N/A | CRM LTV 역분개 |
| 인접: 추천 먹튀 | N/A | N/A | referredRetained(쿠폰 잠금) | 잠금 | N/A | N/A | N/A | N/A | 1개월 미유지 영구잠금 |

| Order | Original Eligible | Refunded Eligible | Remaining Eligible | Original Cashback | Recalculated | Reversal | Clawback | Currency | Result |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback 부분환불) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접: OrderHub 부분클레임 | 원주문 총액 | 실환불액 | 잔여 | N/A | N/A | 실환불액=상한(과다역분개 수정) | N/A | KRW | CRM LTV 역분개 |
