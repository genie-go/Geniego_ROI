# CANONICAL DSAR — Cashback Payout Governance (Withdrawal·Payout·Settlement·Integrity·Reconciliation·Duplicate·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-4 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_CASHBACK_LEDGER_MODEL.md`](CANONICAL_DSAR_CASHBACK_LEDGER_MODEL.md)(Ledger/Balance/Redemption/Conversion) + 본 문서(Payout/Governance).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_LEDGER_REDEMPTION_PAYOUT.md`](../architecture/ADR_DSAR_CASHBACK_LEDGER_REDEMPTION_PAYOUT.md).

---

## 1. Withdrawal Request (§29·§30) · Payout Eligibility (§31) ★요청≠지급

- **Withdrawal(§29)**: withdrawal_request_id·account·subject·beneficiary·**payout recipient·payout destination·requested amount·currency·available balance snapshot·minimum threshold reference·fee reference·tax/withholding reference·FX reference·requested/verified/approved/expires_at·idempotency key**·status·evidence. 상태(§30, 19): DRAFT·REQUESTED·**RECIPIENT_VERIFICATION_PENDING·BALANCE_VALIDATION_PENDING·THRESHOLD_VALIDATION_PENDING·FEE_CALCULATION_PENDING·TAX_REVIEW_PENDING·APPROVAL_PENDING**·APPROVED·SETTLEMENT_PENDING·PROCESSING·PARTIALLY_PAID·PAID·FAILED·RETURNED·CANCELLED·EXPIRED·REVERSED·BLOCKED.
- **Payout Eligibility(§31)**: Cashback Account Active·**Beneficiary Verified·Payout Recipient Verified·Destination Ownership Verified**·Available Balance·Minimum Threshold·Maximum Limit·Currency/Country Support·Legal Entity·Fraud State·Tax Profile·Withdrawal Cooldown·Previous Failed Payout·Negative Balance·Pending Clawback·Compliance Hold.
**★§4.8 Payout Recipient≠Beneficiary 자동 동일시 금지(Recipient Verification·Destination Ownership 확인)·§4.9 요청≠지급(Requested/Verified/Approved/Settled/Processing/Paid/Failed/Returned/Reversed 분리)**. **현행**: Payout(outbound to 고객)·Recipient Verification(KYC)=**완전 부재(Part 4-5-1-3)**·신설. **★pg_settlement=inbound(테넌트 수취)로 정반대 방향**.

## 2. Payout Threshold (§32) · Fee (§33) · Settlement (§34)

- **Threshold(§32)**: payout threshold id·program·account type·country·currency·**minimum/maximum payout·daily/monthly/frequency limit·cooldown·threshold FX policy**·valid from/to·version·evidence.
- **Fee(§33)**: payout fee id·payout method·provider·**fixed/percentage/minimum/maximum fee·currency·fee payer·tax treatment**·valid from/to·version·evidence. Fee Payer(6): CUSTOMER·MERCHANT·PLATFORM·PARTNER·SHARED·WAIVED.
- **Settlement(§34)**: cashback_settlement_id·account·withdrawal request·beneficiary·payout recipient·settlement period·**gross requested/fee/withholding/adjustment amount·clawback offset·net payable amount·settlement/payout currency·FX reference·created/approved/finalized_at·accounting reference**·status·evidence.
→ 부재·신설. fxToKrw(Part 4-5-1-4)·pg_settlement net/fee(참조·inbound). **Withholding/Tax=Part 4-5-1-3 Tax Subject 부재→신설**.

## 3. Payout (§35·§36) · Attempt (§37) · Failed/Returned (§38) · Partial (§39)

- **Payout(§35)**: cashback_payout_id·settlement·withdrawal request·beneficiary·payout recipient·**destination type·masked destination·payout provider·payout account·gross/fee/withholding/net amount·currency·provider payout id·requested/processing/completed/failed/returned_at·idempotency key**·status·evidence. 상태(§36, 12): SCHEDULED·PENDING·PROCESSING·PARTIALLY_PAID·PAID·FAILED·RETRYING·RETURNED·CANCELLED·REVERSED·BLOCKED·UNKNOWN. **★금융계좌 원문 저장 금지(Masked·Part 4-5-1-3)**.
- **Attempt(§37)**: payout attempt id·payout·attempt number·provider request id·requested/response_at·provider status·response code·failure category·retryable·next retry_at·status·evidence.
- **Failed/Returned(§38)**: 실패 사유(14): INVALID_DESTINATION·DESTINATION_CLOSED·RECIPIENT_MISMATCH·INSUFFICIENT_PROVIDER_BALANCE·PROVIDER_ERROR·BANK/WALLET_REJECTED·COMPLIANCE_BLOCK·CURRENCY/COUNTRY_UNSUPPORTED·NETWORK_ERROR·TIMEOUT·DUPLICATE_REQUEST·OTHER. Returned: provider return id·return reason·returned amount·**balance restoration policy·fee refund policy·tax adjustment policy·next action**·evidence.
- **Partial(§39)**: requested/settled/paid/unpaid amount·**fee/withholding allocation·payout sequence·remaining settlement·next payout date**·evidence.
**★Failed/Returned Payout 후 Balance Restoration·Fee Refund·Tax Adjustment 정책 실행·Evidence 보존**. → 부재·신설(pg_settlement은 outbound Payout 아님).

## 4. Duplicate Payout (§40) · Double Redemption (§41) ★현행 정본

- **Duplicate Payout(§40)**: Provider Payout ID·Withdrawal Request ID·Settlement ID·**Idempotency Key·Beneficiary+Amount+Currency+Time Window·Destination Token+Settlement·Provider Request ID·Ledger Transaction ID·Content Hash·Source Lineage**. **★Duplicate 삭제 금지→Group/Winner/Excluded 보존**.
- **Double Redemption(§41)**: 동일 Reservation 재사용·동일 Order 중복 Redemption·동일 Ledger Entry 이중 차감·동일 Accrual 초과 사용·**Wallet/Store Credit Conversion 후 원 Cashback 재사용**·Reversed Redemption 재사용·Partial Redemption 누적 초과.
**★현행 정본**: **CouponRedeem 원자적 조건부 UPDATE(`WHERE use_count<max_uses` + rowCount)=Double Redemption 방지 실 정본**·pg/Referral/coupon UNIQUE=Duplicate 방지.

## 5. Ledger Integrity (§42) · Balance Reconciliation (§44·§45)

- **Integrity(§42)**: Sequence Gap·Duplicate Sequence·**Entry Hash Mismatch·Previous Hash Mismatch·Deleted/Modified Entry**·Orphan Transaction·Missing Accrual/Reversal/Conversion Counter-entry·**Reservation 초과 Commit·Redemption/Payout 초과 차감·Negative Balance**·Cross-account/Cross-currency Entry·Source Object 불일치·Timestamp 역전.
- **Reconciliation(§44)**: Source↔Ledger Balance·Available Accrual↔Ledger Credit·Reservation↔Reserved Balance·Redemption↔Order/Invoice Credit·**Wallet Conversion Out↔Destination Wallet Credit·Store Credit Out↔Destination Credit**·Withdrawal↔Settlement·Settlement↔Payout·Payout↔Provider Result·**Failed/Returned Payout↔Balance Restoration**·Payout Fee↔Provider Fee·Withholding↔Tax Reference·FX↔Paid Amount·Liability↔Unpaid Balance·**Customer Portal Balance↔Canonical Balance**. 상태(§45, 21): MATCH·AVAILABLE/RESERVED_BALANCE·REDEMPTION·ORDER_CREDIT·WALLET/STORE_CREDIT_CONVERSION·WITHDRAWAL_SETTLEMENT·SETTLEMENT_PAYOUT·PROVIDER_PAYOUT·FAILED_PAYOUT_RESTORATION·RETURNED_PAYOUT·FEE·WITHHOLDING·FX·LIABILITY_MISMATCH·**DOUBLE_REDEMPTION_RISK·DUPLICATE_PAYOUT_RISK**·PROVIDER_INTERNAL_LEDGER_DRIFT·MANUAL_REVIEW·BLOCKED.
**현행**: hash chain 무결성 부재=신설·Point Ledger 4-3 Ledger Integrity 정합·Balance=Ledger reconciliation 정합.

## 6. Candidate (§46) · Coverage (§47) · Gap (§48·§49)

- **Candidate(§46)**: candidate id·request id·account·ledger·**balance·snapshot·ledger entry range·transaction/reservation/redemption/conversion/withdrawal/settlement/payout ids·beneficiary·payout recipient·tenant·brand·merchant·legal entity·currency·integrity status·reconciliation status·duplicate groups**·review requirement·evidence.
- **Coverage(§47, 28)**: Ledger Profile·Account·Ledger·Entry·Sequence·Checkpoint·Transaction·Balance·Snapshot·Reservation·Redemption·Partial Redemption·Order Credit·Wallet/Store Conversion·Withdrawal·Payout Eligibility·Threshold·Fee·Settlement·Payout·Attempt·Failure·Return·Duplicate Detection·Integrity·Reconciliation·Evidence.
- **Gap(§48, 26)**: ACCOUNT_UNREGISTERED·LEDGER/ENTRY_MISSING·SEQUENCE_GAP·HASH_MISMATCH·BALANCE(_SNAPSHOT)_MISSING·RESERVATION/REDEMPTION/PARTIAL_REDEMPTION_HISTORY_MISSING·ORDER_CREDIT_RELATIONSHIP_MISSING·WALLET/STORE_CREDIT_CONVERSION_HISTORY_MISSING·WITHDRAWAL_HISTORY_MISSING·PAYOUT_ELIGIBILITY/THRESHOLD/FEE_MISSING·SETTLEMENT/PAYOUT/PAYOUT_ATTEMPT_HISTORY_MISSING·FAILED_PAYOUT_RESTORATION/RETURNED_PAYOUT_HISTORY_MISSING·**DUPLICATE_PAYOUT/DOUBLE_REDEMPTION_PREVENTION_MISSING·LEDGER_INTEGRITY_FAILED**·PROVIDER_INTERNAL_LEDGER_DRIFT.
- **Critical Gap(§49)**: **Ledger Entry 수정/삭제·Balance↔Ledger 불일치·동일 Cashback 이중 사용·동일 Withdrawal 이중 Payout·Wallet 전환 후 원 Cashback 재사용·Redemption 금액이 Available 초과·Unverified Recipient Payout·Wrong Tenant/Legal Entity Payout·Failed/Returned Payout 후 Balance 미복구·Payout Fee/Withholding 불일치·Settlement↔Provider Payout 불일치·Currency/FX Version 누락·Reservation 없이 Redemption·Sequence/Hash 무결성 실패·Negative Balance 위반·Provider↔Internal Drift**.
**현행 정직 GAP**: Cashback Ledger/Payout 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지). Critical Gap 시 Access Review 차단.

## 7. Static Lint (§50) · Runtime Guard (§51)

**Lint(§50)**: **Accrual Reference 없는 Ledger Credit·Currency 없는 Entry·Ledger Entry Update/Delete·Sequence 없는 Entry·Idempotency Key 없는 Transaction·Reservation 없는 Redemption·Redemption↔Payout 혼용·Wallet Conversion 후 원 Cashback 재사용 가능 구조·Payout Recipient Verification 누락·Masking 없는 Destination 저장·Withdrawal Threshold/Fee/FX Version 누락·Failed/Returned Payout Restoration 누락·Duplicate Payout/Double Redemption 방지 누락·Source Balance만으로 Complete·기존 Ledger/Wallet 중복 생성·Evidence 없는 Manual Adjustment**.
**Guard(§51)**: Wrong Cashback Account·**Cross-Tenant Ledger**·Wrong Brand/Merchant/Legal Entity·**Insufficient Available/Reserved Balance·Duplicate Redemption·Duplicate Payout·Reservation Expired/Scope Mismatch·Unverified Beneficiary/Payout Recipient·Destination Ownership Mismatch·Minimum Threshold Not Met·Maximum Payout Exceeded**·Currency Unsupported·FX Missing·**Negative Balance Violation·Ledger Integrity Failure·Provider Payout Conflict**·Scope 초과 Financial Export·Kill Switch.
**현행 실증**: **CouponRedeem 원자적 조건부 UPDATE(Double Redemption 차단)**·pg/Referral/coupon UNIQUE(Duplicate)·auth_tenant(Cross-Tenant)·fxToKrw 미상통화 무변환 재사용.

## 8. Error (§52) · Warning (§53)

**Error(23)**: CASHBACK_ACCOUNT/LEDGER_NOT_FOUND·LEDGER_ENTRY_INVALID·LEDGER_SEQUENCE_INVALID·**LEDGER_INTEGRITY_FAILED·BALANCE_INSUFFICIENT·RESERVED_BALANCE_INSUFFICIENT**·RESERVATION_NOT_FOUND/EXPIRED·REDEMPTION_FAILED·**DOUBLE_REDEMPTION**·WALLET/STORE_CREDIT_CONVERSION_FAILED·WITHDRAWAL_NOT_ELIGIBLE·PAYOUT_THRESHOLD_NOT_MET·**PAYOUT_RECIPIENT_UNVERIFIED·PAYOUT_DESTINATION_MISMATCH**·SETTLEMENT/PAYOUT_FAILED·**DUPLICATE_PAYOUT·PAYOUT_RETURNED**·BALANCE_RECONCILIATION_FAILED·LEDGER_RUNTIME_BLOCKED.
**Warning(15)**: BALANCE_STALE·RESERVATION_EXPIRY·PARTIAL_REDEMPTION·WALLET_CONVERSION·WITHDRAWAL_THRESHOLD·PAYOUT_FEE·WITHHOLDING·FX·PAYOUT_DELAY·PARTIAL_PAYOUT·PAYOUT_RETRY·PAYOUT_RETURN·NEGATIVE_BALANCE_WARNING·PROVIDER_INTERNAL_LEDGER_DRIFT·LEDGER_MANUAL_REVIEW_REQUIRED.

## 9. Golden Dataset (§54) · Conformance (§55) · Legacy Equivalence (§56)

**Golden(§54)**: Ledger/Balance(Opening·Accrual Credit·Reservation/Release·Redemption·Wallet Conversion·Payout·Reversal·Clawback·Expiration·Correction·Match/Mismatch·**Negative·Sequence Gap·Hash Mismatch·Entry Update 차단**) · Redemption(Full/Partial/Multiple·Order/Invoice/Subscription Credit·Insufficient Balance·Expired Reservation·**Double Redemption 차단**·Reversal·Allocation across Accruals) · Wallet/Store Credit(Conversion·Partial·Different Currency·Fee·Failure·Reversal·**원 Cashback 재사용 차단**·Destination Mismatch) · Withdrawal/Payout(Threshold 충족/미충족·**Verified/Unverified Recipient 차단**·Bank/Digital/Internal Wallet·Fee·Withholding·FX·Partial·Failed·Retry·**Returned·Balance Restoration·Duplicate Payout 차단**) · Governance(**Cross-Tenant/Wrong Legal Entity/Wrong Currency 차단**·Provider Match/Drift·Customer Portal Balance Match·**Evidence Missing/Critical Integrity Gap Block**·Manual Review).
**실 회귀 시드**: CouponRedeem 원자적 이중 방지·pg/Referral/coupon UNIQUE·point_discount Order Credit·fxToKrw·auth_tenant Cross-Tenant — 즉시 Golden 등록 가능.
**Conformance(§55)**: Order Redemption/Invoice Credit/Subscription Credit/Wallet Conversion/Store Credit Conversion/Bank Payout/Payment Provider Payout/Digital Wallet Payout/Partial Payout/Returned Payout에 동일 Contract(Account·Ledger·Entry·Sequence·Balance·Snapshot·Reservation·Redemption·Conversion·Withdrawal·Settlement·Payout·Fee·Withholding·FX·Integrity·Reconciliation·Evidence·Audit).
**Legacy Equivalence(§56)**: 기존 CouponRedeem(redemption·use_count)·point_discount(order credit)·pg_settlement(net/fee)·fxToKrw와 Account/Available/Reserved/Redeemed/Payable/Paid Balance·Entry/Reservation/Redemption/Conversion/Withdrawal/Settlement/Payout/Failed/Returned·Fee·Withholding·FX·Integrity·Error·Warning·Latency·Audit 비교. **UNEXPLAINED·이중 사용·이중 Payout·Integrity 실패→전환차단**.

## 10. 기존 구현 분류 (§57) · 중복 감사 (§58)

| 구현 | 분류 | 근거 |
|---|---|---|
| `CouponRedeem`(use_count/max_uses·**원자적 조건부 UPDATE**·usable_from) | **VALIDATED_LEGACY·KEEP_SEPARATE_WITH_REASON** | 구독 쿠폰 상환·**Double Redemption Detection 실 정본**·고객 cashback 아님 |
| `point_discount`(KrChannel/Rollup) | **KEEP_SEPARATE_WITH_REASON** | 마켓 포인트 체크아웃 사용(Order Credit 실 사례·읽기수집·정산) |
| pg_settlement/Referral/coupon_redemptions UNIQUE | **VALIDATED_LEGACY(Idempotency 정본)** | Duplicate Payout/Double Redemption 방지 |
| `Connectors::fxToKrw`/`krwToCurrency` | **VALIDATED_LEGACY(확장)** | Payout FX(float/rate version GAP·Part 4-5-1-4) |
| `pg_settlement`(net/fee·inbound) | **KEEP_SEPARATE_WITH_REASON** | 테넌트 수취 정산(Settlement 필드 참조·**outbound Payout 아님·정반대**) |
| Point Ledger(4-3 Append-only·Balance=Ledger) | **참조(정합)** | 상태 계약 정합 |
| Cashback Account/Ledger(hash chain)/Entry/Balance/Reservation/Redemption(cashback)/Wallet/Withdrawal/Settlement/Payout(outbound)/Integrity | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**중복 감사(§58)**: **Redemption 원자성=CouponRedeem 정본·Idempotency=UNIQUE·FX=fxToKrw 단일·Order Credit=point_discount**. ★도입 시 **Provider별 독립 Cashback Ledger Model 금지·CouponRedeem 원자성/Idempotency/fxToKrw·Point Ledger 4-3 패턴 재사용(중복 엔진 금지)·inbound 정산(pg)↔outbound Payout 오혼입 금지**.

## 11. 기능 후퇴 방지 · 검증 게이트 (§64) · 영구 규칙

**후퇴 방지**: CouponRedeem·point_discount·pg_settlement·fxToKrw·Rollup·`/coupon/*`·`/v427/pg/*`·Existing Balance/Redemption/Conversion/Payout/Retry/Monitoring 기능 보존(회귀 0).
**게이트(§64)**: Account/Ledger·**Append-only Entry·Sequence/Hash/Checkpoint·Idempotency**·Balance=Ledger 재계산·**Pending/Available/Reserved/Payable/Paid 분리**·Reservation Lifecycle·Full/Partial Redemption·Order/Invoice/Subscription Credit·Allocation·Wallet/Store Conversion·**Conversion 후 원 Cashback 재사용 차단**·Withdrawal Eligibility·Threshold/Fee/Withholding·**Recipient/Destination Verification·Settlement≠Payout·Failed/Returned/Retry·Partial Payout·Duplicate Payout 차단·Double Redemption 차단·Ledger Integrity·Source/Ledger/Provider Reconciliation**·Coverage/Gap/Evidence·Lint/Guard·**기존 Engine 중복 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History.
**영구 규칙(§67)**: 신규 Cashback Ledger 도입 전 **기존 CouponRedeem(원자성)/Idempotency(UNIQUE)/fxToKrw/point_discount(Order Credit)/Point Ledger 4-3(Append-only·Balance=Ledger) 재사용(중복 엔진 금지)** · Accrual/Ledger Entry/Balance/Redemption/Conversion/Settlement/Payout 별도 Entity/Lifecycle · **Available 검증 Accrual만 Credit·Append-only(Sequence/Hash/Idempotency/Balance After)·Entry 수정/삭제 금지(Reversal/Correction/Clawback)** · Source Balance 단일 신뢰 금지→Ledger 비교 · Reservation(Request/Reserve/Commit/Release/Expire) · Full/Partial Redemption·Allocation(여러 Accrual·FIFO/expiry) · Wallet/Store Conversion 양방향 연결·**전환 후 원 Cashback 재사용 차단** · **Redemption≠Payout·요청≠지급·Payout Recipient≠Beneficiary·Recipient/Destination Verification·금융계좌 원문 금지** · Threshold/Fee/Withholding/FX · Settlement≠Payout·Failed/Returned Balance Restoration · **Duplicate Payout/Double Redemption 차단(Idempotency·Group 보존·삭제 금지)** · Ledger Integrity(Sequence/Hash/Overdraw/Negative) · Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **Redemption↔Payout·inbound 정산(pg)↔outbound Payout·Wallet 전환↔원 Cashback·Provider별 독립 Ledger Model 오혼입/중복 금지.**

## 12. Payout Matrix (§63) — 현행

| Withdrawal | Beneficiary | Destination | Requested | Fee | Withholding | Net | Settlement | Provider Status | Result |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Payout·outbound) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(완전 신설·Recipient Verification 부재)** |
| 인접(참조·정반대): PG 정산 | N/A(테넌트) | N/A | gross | fee | N/A | net | pg_settlement | provider resp | **inbound(수취)·outbound 아님** |
