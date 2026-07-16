# CANONICAL DSAR — Cashback Ledger & Balance Model (Account·Ledger·Entry·Sequence·Balance·Reservation·Redemption·Conversion)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-4 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Account/Ledger/Entry/Balance/Reservation/Redemption/Conversion) + [`CANONICAL_DSAR_CASHBACK_PAYOUT_GOVERNANCE.md`](CANONICAL_DSAR_CASHBACK_PAYOUT_GOVERNANCE.md)(Withdrawal·Settlement·Payout·Integrity·Reconciliation·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_LEDGER_REDEMPTION_PAYOUT.md`](../architecture/ADR_DSAR_CASHBACK_LEDGER_REDEMPTION_PAYOUT.md).
> 선행: Accrual/Availability(4-5-2-3)·Eligibility(4-5-2-2)·Monetary Ledger(4-5-1-2)·Value/FX(4-5-1-4)·Identity(4-5-1-3)·Point Ledger(4-3).
> **범위**: 사용 가능 Cashback의 장부·잔액·사용·Wallet 전환·출금·지급 판단 기반(다음 Part 4-5-2-5 Reversal/Clawback).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Cashback Ledger / Balance / Wallet / Withdrawal / Payout 엔진** | ❌ **부재(grep 0)** — `cashback ledger/wallet/payout/balance` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Redemption + Double-use 방지 (원자적)** | ✅ **REAL 정본** — `CouponRedeem`: `use_count>=max_uses` 거부 + **원자적 조건부 UPDATE(`WHERE id=? AND use_count<max_uses` + rowCount)로 이중 사용 방지** · usable_from(lock)·redeemed_at | **VALIDATED_LEGACY·KEEP_SEPARATE_WITH_REASON**(구독 쿠폰·**§41 Double Redemption Detection 실 정본**) |
| **Order Credit Redemption (포인트 체크아웃 사용)** | △ `point_discount`(KrChannel/Rollup·마켓 포인트 buyer 체크아웃 사용·정산 차감) | **KEEP_SEPARATE_WITH_REASON**(마켓 정산·읽기수집·Order Credit 실 사례) |
| **Idempotency / Duplicate 방지** | ✅ **REAL 정본** — pg_settlement/Referral/coupon_redemptions UNIQUE | **VALIDATED_LEGACY**(§40 Duplicate Payout·§41 Double Redemption 방지) |
| **Append-only Ledger + Balance=Ledger 재계산** | △ Point Ledger(4-3) Append-only·Ledger-calculated Balance 상태 계약(엔진 부재) | **NOT_APPLICABLE → 신설(정합)** · **hash chain(previous/entry hash) 부재=신설** |
| **FX Conversion (Payout FX)** | ✅ `Connectors::fxToKrw`/`krwToCurrency`(24통화·Part 4-5-1-4·float·rate version GAP) | **VALIDATED_LEGACY(확장)** |
| **Payout (outbound to 고객/beneficiary)** | ❌ **완전 부재** — pg_settlement=**inbound**(테넌트 수취)·ad_spend_ledger=광고 지출(고객 지급 아님) | **NOT_APPLICABLE → 신설(정반대 방향)** |
| **Withdrawal / Store Credit / Recipient Verification(KYC)** | ❌ 부재(Part 4-5-1-3 KYC/payout recipient 부재) | **NOT_APPLICABLE → 신설** |
| **Cashback Account/Ledger/Entry/Sequence/Checkpoint·Balance/Snapshot·Reservation·Redemption(cashback)/Allocation·Wallet/Store Conversion·Settlement/Payout Attempt/Return·Integrity** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **고객 Cashback Ledger/Balance/Wallet/Withdrawal/Payout 엔진은 부재(NOT_APPLICABLE)**. 그러나 핵심 패턴의 **실 정본이 존재**: **CouponRedeem**(원자적 조건부 UPDATE로 이중 사용 방지=**Double Redemption Detection 정본**·구독 쿠폰·KEEP_SEPARATE)·**point_discount**(마켓 포인트 체크아웃 사용=Order Credit 실 사례·읽기수집)·**Idempotency**(UNIQUE)·**fxToKrw**(FX)·Point Ledger 4-3(Append-only·Balance=Ledger reconciliation 상태 계약). **★핵심 정직: Payout은 outbound(테넌트→고객 지급)인데 현행 pg_settlement은 inbound(테넌트 수취)로 정반대 방향·완전 신설**. **기존 CouponRedeem 원자성/Idempotency/fxToKrw·Point Ledger 4-3 패턴 재사용(중복 엔진 금지)**·지어내기·NO_DATA/오탐 금지·본 Ledger=멀티테넌트 고객용 미래 cashback 전방호환 계약.

---

## 1. Canonical Entity (30) — §5

CASHBACK_LEDGER_PROFILE·ACCOUNT·LEDGER·LEDGER_ENTRY·LEDGER_CHECKPOINT·TRANSACTION·BALANCE·BALANCE_SNAPSHOT·RESERVATION·REDEMPTION·REDEMPTION_ALLOCATION·WALLET_CONVERSION·STORE_CREDIT_CONVERSION·WITHDRAWAL_REQUEST·PAYOUT_ELIGIBILITY·PAYOUT_THRESHOLD·PAYOUT_FEE·SETTLEMENT·PAYOUT·PAYOUT_ATTEMPT·PAYOUT_RETURN·DUPLICATE_PAYOUT_GROUP·DOUBLE_REDEMPTION_GROUP·LEDGER_INTEGRITY_RESULT·BALANCE_RECONCILIATION·LEDGER_CANDIDATE·LEDGER_COVERAGE·LEDGER_GAP·LEDGER_EVIDENCE·LEDGER_AUDIT_EVENT.
**현행 실체**: REDEMPTION(CouponRedeem·이중 사용 방지 정본)·Order Credit(point_discount)·Idempotency(UNIQUE)·FX(fxToKrw)·Balance=Ledger(Point Ledger 4-3) = REAL 참조. 나머지 = **신설**.

## 2. Ledger Profile (§6) · Account (§7·§8)

- **Profile(§6)**: cashback_ledger_profile_id·provider/account·program·tenant·brand·store/merchant·legal_entity·environment·**ledger source of truth·account/balance/redemption/wallet conversion/withdrawal/settlement/payout/FX/fee/withholding/integrity/reconciliation model**·historical coverage·deleted transaction support·owner·version·status·evidence. → 부재·신설.
- **Account(§7)**: cashback_account_id·monetary reward account·provider account·external cashback account id·**owner identity·beneficiary identity·payout recipient reference**·tenant·brand·store·merchant·legal entity·environment·account type·default/supported currency·withdrawal/wallet conversion support·status·opened/suspended/closed/deleted_at·evidence. Type(8): CUSTOMER/SHARED/ORGANIZATION/MERCHANT/PARTNER_CASHBACK_ACCOUNT·INTERNAL_CLEARING·PAYOUT_CLEARING·LIABILITY_ACCOUNT.
- **상태(§8, 13)**: PENDING·ACTIVE·ACTIVE_WITH_WARNINGS·FROZEN·SUSPENDED·**WITHDRAWAL_BLOCKED·FRAUD_HOLD**·CLOSED·ARCHIVED·MERGED·TRANSFERRED·DELETED·UNKNOWN.
→ 부재·신설(owner/beneficiary/payout recipient=Part 4-5-1-3 신설 identity 연결).

## 3. Ledger (§9) · Entry (§10·§11) · Sequence·Checkpoint (§12) ★Append-only·Hash Chain

- **Ledger(§9)**: cashback_ledger_id·account·program·**ledger type·currency·tenant·brand·legal entity·opening date·opening balance·current sequence·current checkpoint·last reconciled at·source of truth**·status·version·evidence. Type(10): AVAILABLE·PENDING·RESERVED·REDEMPTION·WALLET_CONVERSION·SETTLEMENT·PAYOUT·LIABILITY·CLAWBACK·**UNIFIED_CASHBACK**.
- **Entry(§10)**: cashback_ledger_entry_id·ledger·transaction·**sequence·entry type·debit/credit amount·currency·available/pending/reserved/payable/paid/liability balance after·effective_at·recorded_at·source event id·source object·idempotency key·reversal/correction entry·previous entry hash·entry hash**·evidence. Type(§11, 26): OPENING_BALANCE·ACCRUAL_AVAILABLE·RESERVATION(_RELEASE)·REDEMPTION·ORDER/INVOICE/SUBSCRIPTION_CREDIT·WALLET_CONVERSION_OUT·WALLET_CONVERSION_IN_REFERENCE·STORE_CREDIT_CONVERSION_OUT·PAYABLE·SETTLEMENT·PAYOUT·PAYOUT_RETURN·PAYOUT_REVERSAL·EXPIRATION·REVERSAL·CLAWBACK·ADJUSTMENT_CREDIT/DEBIT·FX_GAIN/LOSS·CORRECTION·CLOSING_BALANCE.
- **Sequence·Checkpoint(§12)**: Sequence 연속성·**Previous/Current Entry Hash·Checkpoint Sequence/Balance·Transaction High-water Mark·Snapshot Hash**·Missing/Duplicate/Reordered/Modified/Deleted Entry. **Append-only 무결성 강제**.
**★§4.1 Accrual≠Ledger Entry(Available 전환 후 검증된 Entry)·§4.6 Entry 수정/삭제 금지→Reversal/Correction/Adjustment/Clawback Entry**. **현행**: hash chain(previous/entry hash) 부재=신설·Point Ledger 4-3 Append-only 정합. **idempotency=UNIQUE 정본**.

## 4. Transaction (§13·§14) · Balance (§15·§16) · Snapshot (§17) ★Balance=Ledger

- **Transaction(§13)**: cashback_transaction_id·account·ledger·monetary reward·accrual·**transaction type·subject·beneficiary·amount·currency·available/reserved/payable/paid impact·source object·related transaction·reservation/redemption/conversion/settlement/payout reference·requested/effective/completed_at·idempotency key**·status·evidence. Type(19): AVAILABILITY_CREDIT·RESERVE·RELEASE·REDEEM·ORDER/INVOICE/SUBSCRIPTION_CREDIT·WALLET/STORE_CREDIT_CONVERSION·WITHDRAWAL_REQUEST·SETTLEMENT·PAYOUT·PAYOUT_RETURN/REVERSAL·EXPIRATION·REVERSAL·CLAWBACK·ADJUSTMENT·CORRECTION. 상태(§14, 13): CREATED·PENDING·RESERVED·PROCESSING·PARTIALLY_COMPLETED·COMPLETED·RELEASED·FAILED·CANCELLED·REVERSED·RETURNED·BLOCKED·UNKNOWN.
- **Balance(§15)**: cashback_balance_id·account·ledger·currency·**pending/available/reserved/redeemed/wallet converted/payable/settled/paid/expired/reversed/clawback/adjustment/liability balance·source balance·ledger calculated balance·difference**·calculated_at·status·evidence. 상태(§16, 10): MATCHED·SOURCE_ONLY·LEDGER_ONLY·MISMATCH·NEGATIVE·STALE·RECONCILING·FROZEN·BLOCKED·UNKNOWN.
- **Snapshot(§17)**: snapshot id·account·ledger·currency·snapshot_at·all balance categories·**ledger checkpoint·transaction high-water mark·previous snapshot·difference·checksum**·source·evidence.
**★§4.2 Ledger(이력)≠Balance(시점 계산·재계산 가능)·§4.3 Available≠Reserved≠Redeemed≠Paid·§4.7 Source Balance 단일 신뢰 금지→Ledger-calculated 비교**. Point Ledger 4-3 정합. **Balance 계산 Contract(§43)**: Opening Available + Accrual Credit + Reversal Restoration + Positive Adj + Returned Payout Restoration − Reservation Commit − Redemption − Wallet/Store Conversion − Payout − Expiration − Clawback − Negative Adj = Closing Available.

## 5. Reservation (§18·§19) · Redemption (§20~§23) · Conversion (§25~§28)

- **Reservation(§18)**: cashback_reservation_id·account·subject·**reservation type·requested/reserved amount·currency·source object·order/invoice/subscription/withdrawal reference·reserved_at·expires_at·committed_at·released_at·idempotency key**·status·evidence. Type(8): ORDER_REDEMPTION·INVOICE/SUBSCRIPTION_CREDIT·WALLET/STORE_CREDIT_CONVERSION·WITHDRAWAL·PAYOUT·MANUAL. 상태(§19, 10): REQUESTED·RESERVED·PARTIALLY_RESERVED·COMMITTED·PARTIALLY_COMMITTED·RELEASED·EXPIRED·CANCELLED·FAILED·BLOCKED.
- **Redemption(§20)**: cashback_redemption_id·account·reservation·monetary reward·subject·beneficiary·**redemption type·requested/redeemed/remaining requested amount·currency·monetary equivalent·order/invoice/subscription/reward reference·redeemed_at·channel·store·idempotency key**·status·evidence. Type(10): ORDER_DISCOUNT·ORDER_PAYMENT·INVOICE/SUBSCRIPTION/SHIPPING/SERVICE_CREDIT·PARTNER_REDEMPTION·WALLET/STORE_CREDIT_CONVERSION·OTHER. 상태(§21, 11): CREATED·RESERVED·PROCESSING·PARTIALLY_REDEEMED·REDEEMED·CANCELLED·REVERSED·FAILED·EXPIRED·FRAUD_BLOCKED·UNKNOWN.
- **Partial(§22)/Allocation(§23)**: original/reserved/redeemed/remaining·redemption sequence·cumulative·final·**source accrual·source ledger entry·allocated amount·allocation priority**(EARLIEST_AVAILABLE/EXPIRY_FIRST·OLDEST_ACCRUAL·CAMPAIGN_RESTRICTED·STANDARD·CUSTOM)·evidence. **하나의 주문에 여러 Cashback Lot/Accrual 사용 추적**(Point Ledger 4-3 Expiration Lot/FIFO 정합).
- **Order/Invoice/Subscription Credit(§24)**: credit reference id·redemption·source object·gross amount·cashback applied·remaining payable·currency·tax treatment·invoice adjustment·completed_at·status·evidence.
- **Wallet Conversion(§25·§26)/Store Credit(§27)/Reversal(§28)**: source transaction·source/converted amount·source/destination currency·**FX conversion·conversion fee/rate·destination wallet/credit account·reversal support·idempotency key**·status·evidence. **★§4.5 Wallet Conversion≠원 Cashback 덮어쓰기(양방향 연결·각각 보존)·전환 후 원 Cashback 재사용 차단(§41)**.
**★현행 정본**: CouponRedeem(원자적 조건부 UPDATE·이중 사용 방지)·point_discount(Order Credit 실 사례). Reservation/Wallet Conversion=신설.

## 6. Ledger Matrix (§61) · Balance Matrix (§62) — 현행

| Entry | Type | Transaction | Debit | Credit | Available After | Reserved After | Payable After | Sequence | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Ledger Entry) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설·hash chain)** |
| 인접(참조): 쿠폰 상환 | REDEMPTION | CouponRedeem | use_count++ | N/A | N/A | N/A | N/A | 없음 | 원자적 UPDATE(이중 방지) |
| 인접: 마켓 포인트 | ORDER_CREDIT | point_discount | 정산 차감 | N/A | N/A | N/A | net_payout | 없음 | 읽기수집 |

| Account | Pending | Available | Reserved | Redeemed | Converted | Payable | Paid | Liability | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Balance) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설·Balance=Ledger 재계산)** |
