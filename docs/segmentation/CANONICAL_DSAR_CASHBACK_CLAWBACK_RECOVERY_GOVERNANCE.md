# CANONICAL DSAR — Cashback Clawback & Recovery Governance (Clawback·Offset·Negative Balance·Write-off·Restoration·Dispute·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-5 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_CASHBACK_REVERSAL_REFUND_MODEL.md`](CANONICAL_DSAR_CASHBACK_REVERSAL_REFUND_MODEL.md)(Reversal/Refund/Order/Fraud Case) + 본 문서(Clawback/Recovery/Governance).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_REVERSAL_REFUND_CLAWBACK.md`](../architecture/ADR_DSAR_CASHBACK_REVERSAL_REFUND_CLAWBACK.md).

---

## 1. Clawback (§23·§24·§25) · Calculation (§26) ★환수≠회수

- **Clawback(§23)**: cashback_clawback_id·account·subject·beneficiary·**original cashback/accrual/redemption/conversion/settlement/payout·clawback reason·requested/approved/recoverable/reserved/collected/remaining/written off amount·currency·recovery plan·requested/approved/started/completed_at·idempotency key**·status·evidence. 상태(§24, 21): DRAFT·REQUESTED·VALIDATING·APPROVAL_PENDING·APPROVED·RESERVATION_PENDING·COLLECTION_PENDING·PARTIALLY_COLLECTED·COLLECTED·**OFFSET_ACTIVE·PAYMENT_PLAN_ACTIVE**·DISPUTED·APPEALED·FAILED·**UNRECOVERABLE·WRITTEN_OFF**·CANCELLED·REINSTATED·BLOCKED·UNKNOWN.
- **Reason(§25, 16)**: ORDER_CANCELLED_AFTER_REWARD·PARTIAL/FULL_REFUND·PAYMENT_CHARGEBACK·FRAUD_CONFIRMED·DUPLICATE_REWARD/PAYOUT·INVALID_ELIGIBILITY·WRONG_BENEFICIARY·ATTRIBUTION_INVALID·RULE_CONFIGURATION_ERROR·PROVIDER/MANUAL_OVERPAYMENT·CONTRACT_VIOLATION·ACCOUNT_TRANSFER_ERROR·OTHER.
- **Calculation(§26)**: calculation id·clawback·**original reward/paid amount·already reversed amount·available/reserved/wallet balance recoverable·future cashback recoverable·refund offset recoverable·direct repayment amount·fee/tax adjustment·FX difference·final recoverable amount·currency·policy version**·calculated_at·evidence.
**★§4.1 Reversal(내부 되돌림)≠Clawback(이미 사용/전환/지급된 경제적 이익 실제 회수)·§4.9 환수 금액(Requested/Approved/Recoverable)≠실제 회수(Reserved/Collected/Remaining/Written Off)·§4.10 원 거래 연결**. **현행**: Clawback(outbound 현금 회수)=**완전 부재**(Payout outbound 부재와 동일)·신설. **인접**: Referral referredRetained(먹튀방지 clawback-like·구독 쿠폰 잠금).

## 2. Reservation (§27) · Recovery Plan (§28·§29) · Offset (§30·§31) · Direct Repayment (§32) · Installment (§33)

- **Clawback Reservation(§27)**: reservation id·clawback·account·**source balance type·requested/reserved amount·currency·reserved/expires/committed/released_at**·status·evidence. Source Type(8): AVAILABLE/RESERVED_CASHBACK·INTERNAL_WALLET·STORE_CREDIT·PENDING_REFUND·FUTURE_CASHBACK·PAYOUT_SETTLEMENT·OTHER.
- **Recovery Plan(§28)/Priority(§29)**: recovery plan id·clawback·**recovery strategy·priority order·legal basis reference·customer notification requirement·dispute window·maximum offset percentage·minimum protected balance·installment support**·status·version·evidence. Strategy(11): INTERNAL_BALANCE_FIRST·FUTURE_CASHBACK/REFUND/WALLET/PAYOUT_OFFSET·DIRECT_REPAYMENT·INSTALLMENT·MIXED·MANUAL·WRITE_OFF·CUSTOM. **권장 우선순위**: ①Pending 취소 ②Available Reversal ③Reservation Release ④내부 Wallet/Store Credit ⑤Settlement 상계 ⑥향후 Cashback 상계 ⑦환불액 상계 ⑧직접 상환 ⑨분할 상환 ⑩Write-off.
- **Offset(§30)/Future Offset(§31)**: offset id·clawback·**offset type·source transaction·source/offset amount·remaining source amount·currency·priority·gross future cashback·protected amount·offset percentage·customer available amount**·applied_at·status·evidence. Offset Type(9): FUTURE_CASHBACK·CUSTOMER_REFUND·WALLET_BALANCE·STORE_CREDIT·COMMISSION_PAYMENT·SETTLEMENT·PAYOUT·ACCOUNT_CREDIT·OTHER.
- **Direct Repayment(§32)/Installment(§33)**: repayment/installment id·**payer·payment method reference·requested/paid amount·currency·requested/due/paid/failed_at·sequence·scheduled amount·missed_at**·status·evidence.
**★§4.7 Future Offset 고객 동의 없이 무제한 금지(법적 근거·계약·통지·상한·유효기간·보호금액)·원 결제수단 자동 재청구=명시적 권한/계약 근거 필요(§32)**. → 전부 부재·신설.

## 3. Negative Balance (§34~§36) · Failure (§37) · Unrecoverable (§38) · Write-off (§39) · Reinstatement (§40)

- **Negative Balance(§34)**: negative_balance_id·account·source clawback·**previous balance·negative amount·currency·protected threshold·offset policy·recovery deadline·resolved_at**·status·evidence. 상태(§35, 10): ACTIVE·OFFSET_PENDING·PARTIALLY_RECOVERED·RECOVERED·DISPUTED·FROZEN·EXPIRED·WRITTEN_OFF·REINSTATED·BLOCKED. Policy(§36): program·account type·country·currency·**negative balance allowed·maximum negative amount·future offset support·maximum offset percentage·payout/redemption block·notice requirement·dispute support·write-off threshold**·valid from/to·version·evidence. **★§4.6 Negative Balance 암묵 허용 금지(Program/Country/Account Type별 Policy 명시)**.
- **Failure(§37)**: failure id·clawback·recovery attempt·**failure type·failed amount·currency·retryable·next retry·escalation**·status·evidence. Type(12): INSUFFICIENT_BALANCE·DESTINATION_UNAVAILABLE·PAYMENT_FAILED·CUSTOMER_DISPUTE·LEGAL_RESTRICTION·ACCOUNT_CLOSED/TRANSFERRED·CURRENCY_UNSUPPORTED·PROVIDER_ERROR·TIMEOUT·DATA_MISMATCH·OTHER.
- **Unrecoverable(§38)/Write-off(§39)**: unrecoverable/write_off id·clawback·**remaining/written off amount·currency·reason·recovery attempts·legal review·collection agency reference·write-off eligibility·accounting period·accounting reference·approval·approved_by·written_off_at·reinstatement support**·status·evidence. Write-off Reason(9): BELOW_COLLECTION_THRESHOLD·LEGAL_RESTRICTION·CUSTOMER_INSOLVENCY·ACCOUNT_CLOSED·RECOVERY_COST_EXCEEDS_AMOUNT·CUSTOMER_SERVICE_EXCEPTION·FRAUD_LOSS·DATA_DEFECT·OTHER.
- **Reinstatement(§40)**: reinstatement id·**original reversal/clawback·reinstated amount·currency·reason·dispute/appeal reference·restored ledger entry·budget/limit/funding impact·reinstated_at·approved_by**·status·evidence(잘못된 Reversal/Clawback·Dispute 승인 복구).
→ 전부 부재·신설. **★고객 책임 없는 서비스 장애 보상=환수 제외 예외(CUSTOMER_SERVICE_EXCEPTION)**.

## 4. FX (§41) · Fee/Tax (§42) · Restoration (§43~§46) · Accounting (§47)

- **FX Policy(§41)**: ORIGINAL_TRANSACTION/PAYOUT_RATE·REFUND_EVENT/RECOVERY_DATE_RATE·SETTLEMENT/ACCOUNTING/CONTRACT/PROVIDER_RATE·CUSTOM. 기록: Original Currency/Amount·Recovery Currency·Applied Rate·**Rate Version·FX Difference·Accounting Treatment**. → fxToKrw 확장(Part 4-5-1-4 rate version GAP 계승).
- **Fee/Tax(§42)**: Payout Fee Refund·Non-refundable Fee·Provider Fee Recovery·Withholding Reversal·Tax Recalculation/Document Amendment·FX/Collection Fee·**Customer Charge Prohibition**·Funding Party Fee Allocation.
- **Funding(§43)/Budget(§44)/Limit(§45)/Liability(§46) Restoration**: original funding allocation·recoverable/restored/unrecovered amount·party·**original consumed amount·restoration amount·period treatment·rollover·member/order/campaign/global/lifetime limit restoration(Fraud/Duplicate 예외)·original/released/recovered/remaining liability·write-off impact**·accounting period·evidence. → Funding/Budget/Limit(Part 4-5-2-1/1-4) 연결·CRM LTV 역분개=Liability 인접.
- **Accounting Reversal(§47)**: accounting reversal reference id·reversal/clawback·**original accounting entry·reversal/adjustment journal reference·debit/credit account reference·amount·currency·accounting date·period**·status·evidence. → 회계 미연동·부재·신설(Pnl 인접).

## 5. Notification (§48) · Dispute (§49) · Appeal (§50)

- **Notification(§48)**: notification id·reversal/clawback·customer·**notification type·customer-visible reason·amount·currency·dispute deadline·sent/delivered/acknowledged_at·channel·locale**·status·evidence. Type(10): REVERSAL/REFUND_ADJUSTMENT/FRAUD_HOLD/CLAWBACK/FUTURE_OFFSET/NEGATIVE_BALANCE_NOTICE·REPAYMENT_REQUEST·INSTALLMENT/WRITE_OFF/REINSTATEMENT_NOTICE. **★Customer-visible Reason에 내부 Fraud Signal·민감정보 원문 금지**.
- **Dispute(§49)/Appeal(§50)**: dispute/appeal id·reversal/clawback·subject/appellant·**disputed amount·dispute/appeal reason·submitted_at·supporting evidence reference·review owner/authority·decision·reinstatement amount·decided_at**·status·evidence. Dispute 상태(9): SUBMITTED·UNDER_REVIEW·MORE_INFORMATION_REQUIRED·UPHELD·PARTIALLY_UPHELD·REJECTED·WITHDRAWN·ESCALATED·CLOSED.
→ Notification/Dispute/Appeal(cashback recovery)=부재·신설. isMarketingSendAllowed/발송 인프라(Part 1) 재사용(단 Communication≠Financial 통지).

## 6. Candidate (§51) · Reconciliation (§52·§53) · Coverage (§54) · Gap (§55·§56)

- **Candidate(§51)**: candidate id·request id·account·**original reward·accrual·ledger entries·redemption·conversion·settlement·payout·refund·chargeback·fraud case·reversal·clawback·negative balance·recovery plan·collected/remaining/written off amount·tenant·brand·merchant·legal entity·currency·dispute status·reconciliation status**·evidence.
- **Reconciliation(§52)**: Refund↔Cashback Adjustment·Order Cancellation↔Accrual Cancellation·**Partial Refund↔Recalculated Cashback·Reversal Decision↔Ledger Reversal·Available Reversal↔Balance Change·Redemption Reversal↔Order Credit·Wallet Reversal↔Destination Debit·Payout Reversal↔Provider Result·Chargeback↔Recovery·Fraud Decision↔Clawback·Requested Clawback↔Collected·Recovery Offset↔Future Cashback·Negative Balance↔Account Balance·Funding/Budget/Limit Restoration↔Original·Liability↔Outstanding·Accounting Reversal↔ERP·Notification↔Policy·Dispute Decision↔Reinstatement·Provider↔Internal Recovery**. 상태(§53, 24): MATCH·REFUND_ADJUSTMENT/ORDER_CANCELLATION/PARTIAL_REFUND_RECALCULATION/REVERSAL_LEDGER/BALANCE_RESTORATION/REDEMPTION_REVERSAL/CONVERSION_REVERSAL/PAYOUT_REVERSAL/CHARGEBACK_RECOVERY/FRAUD_CLAWBACK/CLAWBACK_COLLECTION/OFFSET/NEGATIVE_BALANCE/FUNDING/BUDGET/LIMIT_RESTORATION/LIABILITY_ADJUSTMENT/ACCOUNTING_REVERSAL_MISMATCH·NOTIFICATION_MISSING·DISPUTE_REINSTATEMENT_MISMATCH·PROVIDER_INTERNAL_RECOVERY_DRIFT·MANUAL_REVIEW·BLOCKED.
- **Coverage(§54, 34)/Gap(§55, 28)**: Reversal/Policy/Decision·Refund Adjustment/Item Allocation·Order/Return/Chargeback·Fraud Case/Decision·Clawback/Calculation/Reservation/Collection·Recovery Plan/Offset/Future Offset/Direct Repayment/Installment·Negative Balance/Policy·Failure/Unrecoverable/Write-off/Reinstatement·FX/Fee·Funding/Budget/Limit/Liability Restoration·Accounting·Notification/Dispute·Evidence.
- **Critical Gap(§56)**: **환불 후 Cashback 미조정·부분 환불 전액 Reversal·전액 환불 후 Available 유지·이미 사용된 Cashback 기록 삭제·이미 지급된 Cashback Clawback 없음·동일 Recovery 중복 실행·Wrong Customer/Account Clawback·Cross-Tenant Recovery·Fraud 의심만으로 확정 환수·Negative Balance 정책 없이 음수 생성·Future Offset 상한/통지 없음·원 거래 관계 없는 Clawback·Currency/FX Version 없는 Recovery·Funding/Budget/Limit 복구 누락·Liability/Accounting 조정 누락·Dispute 승인 후 Reinstatement 누락·고객 통지 의무 누락·Write-off 승인 없음·Provider↔Internal 불일치**.
**현행 정직 GAP**: Cashback Recovery 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지). Critical Gap 시 Access Review 차단.

## 7. Static Lint (§57) · Runtime Guard (§58)

**Lint(§57)**: **Original Transaction 없는 Reversal·원 Reward/Payout 없는 Clawback·Refund Reference 없는 Refund Adjustment·부분 환불 Item Allocation 누락·Pending/Available/Paid 상태 동일 처리·Ledger Entry 삭제 방식 Reversal·Fraud Suspected를 Confirmed 자동 처리·Clawback Calculation 없는 Collection·Negative Balance Policy 누락·Future Offset 상한 누락·Customer Notification Policy 누락·FX Policy 누락·Funding/Budget/Limit Restoration 누락·Accounting Reversal Reference 누락·Write-off Approval 누락·Dispute Decision 없는 Reinstatement·Idempotency Key 없는 Recovery·Evidence 없는 Manual Clawback·기존 Recovery Engine 중복 생성**.
**Guard(§58)**: Wrong Cashback Account/Subject/Beneficiary·**Cross-Tenant Recovery**·Wrong Brand/Merchant/Legal Entity·**Duplicate Reversal/Clawback·Original Transaction Missing·Reversible/Recoverable Amount Exceeded·Fraud Not Confirmed·Refund/Chargeback Not Finalized**·Currency Unsupported·FX Missing·**Negative Balance/Future Offset Limit Exceeded·Unauthorized Recovery/Write-off·Dispute Hold Active**·Critical Recovery Drift·Kill Switch.
**현행 실증**: **OrderHub order_id 멱등(Duplicate Reversal 차단)·부분클레임 과다역분개 수정(Reversible Amount 초과 방지)·역전이 차단(force only)**·pg/Referral/coupon UNIQUE·auth_tenant(Cross-Tenant)·AnomalyDetection(Fraud) 재사용.

## 8. Error (§59) · Warning (§60)

**Error(26)**: CASHBACK_REVERSAL_NOT_ALLOWED/DUPLICATE/AMOUNT_INVALID·REFUND_ADJUSTMENT_NOT_FOUND·**REFUND/CHARGEBACK_NOT_FINALIZED·PARTIAL_REFUND_ALLOCATION_MISSING·FRAUD_NOT_CONFIRMED**·CLAWBACK_NOT_ALLOWED/DUPLICATE/AMOUNT_INVALID·RECOVERY_PLAN_NOT_FOUND·RECOVERY_BALANCE_INSUFFICIENT·**NEGATIVE_BALANCE_NOT_ALLOWED·FUTURE_OFFSET_LIMIT_EXCEEDED·DIRECT_REPAYMENT_FAILED·RECOVERY_UNRECOVERABLE·WRITE_OFF_UNAUTHORIZED·RECOVERY_FX_MISSING**·FUNDING/BUDGET/LIMIT_RESTORATION_FAILED·LIABILITY_ADJUSTMENT/ACCOUNTING_REVERSAL_FAILED·RECOVERY_RECONCILIATION_FAILED·RECOVERY_RUNTIME_BLOCKED.
**Warning(17)**: PARTIAL_REFUND·THRESHOLD_REEVALUATION·CHARGEBACK_PENDING·FRAUD_REVIEW·PARTIAL_CLAWBACK·NEGATIVE_BALANCE·FUTURE_OFFSET·DIRECT_REPAYMENT·INSTALLMENT_DELAY·UNRECOVERABLE_BALANCE·WRITE_OFF·RECOVERY_FX·FUNDING_RESTORATION·ACCOUNTING_REVERSAL·DISPUTE_WARNING·PROVIDER_INTERNAL_RECOVERY_DRIFT·RECOVERY_MANUAL_REVIEW_REQUIRED.

## 9. Golden Dataset (§61) · Conformance (§62) · Legacy Equivalence (§63)

**Golden(§61)**: Pending/Approved Reversal(Cancel·Partial·**Duplicate/Wrong Customer/Cross-Tenant 차단**) · Refund(부분/전액/Item-level/배송비/세금·**Threshold 유지/미달·Cap/Tier 재계산·Fixed 전체 취소·Service Recovery 유지**) · Order/Return(전체/일부 취소·반품 신청/확정/거절·Restocking·교환) · Chargeback(생성·Hold·승소/패소·부분·**Recovery 복구**) · Fraud(Suspected/Cleared/Confirmed/Partial·Self-referral/Multi-account/Refund/Merchant Collusion/Takeover·Appeal) · Clawback(Available/Wallet/Store/Settlement/Future/Refund Offset·Direct Repayment·Partial·Multiple-source·**Duplicate/초과 차단**) · Negative Balance(허용/금지·최대 한도·Future Offset·Payout/Redemption Block·부분/완전 회수·**정책 초과 차단**) · Failure/Write-off(Insufficient/Account Closed/Payment Failure/Legal·Collection Cost 초과·Write-off 승인·**Unauthorized 차단**·Reinstatement) · FX/Accounting(Original/Recovery Date Rate·다른 Currency·Gain/Loss·Fee Refund·Withholding Reversal·Funding/Budget/Limit Restoration·Liability/Accounting Reversal) · Dispute/Notification(Reversal/Clawback/Future Offset Notice·제출/승인/부분/거절·Appeal·Reinstatement·**Notification 누락 차단**).
**실 회귀 시드**: OrderHub 역분개 order_id 멱등·부분클레임 과다역분개 수정·pg/Referral/coupon UNIQUE·AnomalyDetection·Referral referredRetained·ReturnsPortal — 즉시 Golden 등록 가능.
**Conformance(§62)**: Pending Cancellation/Available Reversal/Partial·Full Refund Adjustment/Redemption/Wallet Conversion/Payout Reversal/Fraud Clawback/Chargeback Recovery/Future Offset/Negative Balance/Direct Repayment/Write-off/Reinstatement에 동일 Contract(Original Relationship·Policy·Calculation·Approval·Amount·Currency·FX·Ledger·Balance·Funding/Budget/Limit/Liability·Accounting·Notification·Dispute·Reconciliation·Evidence·Audit).
**Legacy Equivalence(§63)**: 기존 OrderHub 역분개·CRM LTV 역분개·ReturnsPortal·Paddle·AnomalyDetection·Referral referredRetained와 Refund Adjustment/Reversal/Clawback/Collected/Remaining/Negative Balance/Funding·Budget·Limit Restoration/Liability/Accounting/Notification/Dispute·Error·Warning·Latency·Audit 비교. **UNEXPLAINED·부분 환불 전액 취소·Wrong Customer·Fraud 미확정 환수→전환차단**.

## 10. 기존 구현 분류 (§64) · 중복 감사 (§65) · 영구 규칙 (§74)

| 구현 | 분류 | 근거 |
|---|---|---|
| **OrderHub 취소/반품 역분개**(order_id 멱등·부분클레임 과다역분개 수정·역전이 차단) | **VALIDATED_LEGACY**(Reversal 실 정본) | CRM LTV 역분개·**멱등(이중역분개 방지)·부분 조정(실환불액=상한)·원 기록 보존** |
| **CRM LTV 역분개**(Part 268/263) | **VALIDATED_LEGACY** | Liability/Balance 역분개 실 사례 |
| `ReturnsPortal`/kr return_fee | **VALIDATED_LEGACY** | Return Adjustment(신청/확정) |
| `Paddle`(chargeback·MoR) | **KEEP_SEPARATE_WITH_REASON** | MoR·PCI OUT_OF_SCOPE |
| `AnomalyDetection`/DataTrust | **VALIDATED_LEGACY** | Fraud Case(의심/확정·신호 원문 미복제) |
| `Referral` referredRetained | **VALIDATED_LEGACY·KEEP_SEPARATE** | 먹튀방지 clawback-like(구독 쿠폰) |
| pg/Referral/coupon UNIQUE + OrderHub order_id 멱등 | **VALIDATED_LEGACY(Idempotency 정본)** | Duplicate Recovery 방지 |
| Cashback Reversal(cashback)/Clawback/Calculation/Collection/Negative Balance/Write-off/Future Offset/Direct Repayment/Dispute/Appeal/Restoration/Accounting Reversal | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설(outbound 회수=Payout 부재와 동일) |

**중복 감사(§65)**: **Reversal=OrderHub 역분개 정본·Idempotency=UNIQUE+order_id·Fraud=AnomalyDetection·Return=ReturnsPortal**. ★도입 시 **Provider별 독립 Recovery Model 금지·OrderHub 역분개 멱등/부분조정·Idempotency·AnomalyDetection·Point Ledger 4-3 재사용(중복 엔진 금지)**.
**영구 규칙(§74)**: 신규 Cashback Recovery 도입 전 **기존 OrderHub 역분개(멱등/부분조정)/Idempotency(UNIQUE+order_id)/Fraud(AnomalyDetection)/Return(ReturnsPortal)/Point Ledger 4-3(Append-only) 재사용(중복 엔진 금지)** · **Reversal≠Clawback·Refund≠Cashback Reversal** · 상태별 처리(Pending/Available/Redeemed/Paid) · **부분 환불 재계산(전액 Reversal 금지)·이미 사용 기록 삭제 금지(Recovery Entry 추가)** · Fraud 의심≠확정·환수≠회수·모든 Recovery 원 거래 연결 · Negative Balance Policy(암묵 허용 금지)·Future Offset 상한/통지/보호금액·원 결제수단 자동 재청구 권한 필요 · FX Rate Version·Fee/Tax 분리·**Funding/Budget/Limit/Liability Restoration·Accounting Reversal** · Customer Notification(Fraud Signal 원문 금지)·Dispute/Appeal·Reinstatement · **Duplicate Recovery 차단(Idempotency)** · Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **Reversal↔Clawback·Refund↔Cashback·Fraud 의심↔확정·outbound 회수 오혼입/중복 금지.**

## 11. 기능 후퇴 방지 · 검증 게이트 (§71)

**후퇴 방지**: OrderHub 역분개·CRM LTV 역분개·ReturnsPortal·Paddle·AnomalyDetection·Referral·`/coupon/*`·Existing Refund/Reversal/Fraud/Accounting/Customer Service 기능 보존(회귀 0).
**게이트(§71)**: Reversal≠Clawback·원 Accrual/Ledger/Payout 연결·부분/전액 환불 구분·Item-level 재계산·Threshold/Cap/Tier 환불 후 재평가·**상태별 처리(Pending/Available/Redeemed/Paid)**·Order/Return/Chargeback·**Fraud 의심/확정/해제 구분**·Clawback Calculation·회수 가능↔실제 회수 분리·Internal/Wallet/Future/Direct Repayment·Negative Balance Policy·상한/기간/보호금액·Failure/Unrecoverable/Write-off·Reinstatement·FX/Fee/Tax·**Funding/Budget/Limit/Liability 복구·Accounting Reversal**·Customer Notification·Dispute/Appeal·Reconciliation·Coverage/Gap/Evidence·Lint/Guard·**기존 Engine 중복 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History.

## 12. Recovery Collection Matrix (§70) — 현행

| Clawback | Internal Balance | Wallet | Future Cashback | Refund Offset | Direct Payment | Installment | Collected | Remaining | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Clawback 회수) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(완전 신설·outbound 회수 부재)** |
| 인접(참조): 추천 먹튀 | 쿠폰 잠금(referredRetained) | N/A | N/A | N/A | N/A | N/A | 잠금 | N/A | 1개월 미유지 영구잠금 |
