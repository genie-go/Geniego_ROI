# CANONICAL DSAR — Monetary Reward Ledger Governance (Ledger·Balance·Settlement·Payout·Reversal·Clawback·Liability·Candidate·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-2 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_MONETARY_REWARD_ENTITY_MODEL.md`](CANONICAL_DSAR_MONETARY_REWARD_ENTITY_MODEL.md)(Aggregate/Participant/Currency) + 본 문서(Ledger/Settlement/Governance).
> ADR: [`../architecture/ADR_DSAR_CANONICAL_MONETARY_REWARD_ENTITY_MODEL.md`](../architecture/ADR_DSAR_CANONICAL_MONETARY_REWARD_ENTITY_MODEL.md).

---

## 1. Transaction (§18) · Ledger (§19) · Ledger Entry (§20) ★Append-only

- **Transaction(§18)**: transaction_id·monetary reward·reward account·**transaction type**·participant·beneficiary·debit/credit amount·currency·source object type/id·related transaction·settlement/payout/accounting reference·requested/effective/completed_at·**idempotency key**·status·evidence. Type(18): ACCRUAL·APPROVAL·AVAILABILITY_RELEASE·RESERVATION·RESERVATION_RELEASE·REDEMPTION·WALLET_CREDIT·WALLET_DEBIT·SETTLEMENT·PAYOUT·PAYOUT_REVERSAL·CLAWBACK·REFUND_ADJUSTMENT·EXPIRATION·WRITE_OFF·MANUAL_ADJUSTMENT·FX_CONVERSION·CORRECTION.
- **Ledger(§19)**: ledger_id·reward account·program·**ledger type·currency·tenant·brand·legal entity·opening date·current sequence·current checkpoint·source of truth·last reconciled at**·status·version·evidence. Type(9): CASHBACK/REBATE/COMMISSION/WALLET_CREDIT/SETTLEMENT/PAYOUT/LIABILITY/CLEARING/**UNIFIED_MONETARY_REWARD**.
- **Ledger Entry(§20)**: ledger_entry_id·ledger·transaction·**sequence·entry type·debit/credit amount·currency·balance after·pending/reserved/payable/liability balance after·effective_at·recorded_at·source event id·idempotency key·reversal entry reference·correction entry reference**·evidence. Entry Type(20): OPENING_BALANCE·ACCRUAL·PENDING_ACCRUAL·APPROVAL·AVAILABILITY·RESERVE·RELEASE·PAYABLE·SETTLEMENT·PAYOUT·REVERSAL·CLAWBACK·EXPIRATION·WRITE_OFF·ADJUSTMENT_CREDIT·ADJUSTMENT_DEBIT·FX_GAIN·FX_LOSS·CORRECTION·CLOSING_BALANCE.
**★§4.5 Ledger Entry 수정/삭제 금지 → Reversal/Correction/Adjustment/Clawback Entry 추가·Append-only·Sequence·Idempotency·Balance After 기록**(Point Ledger Part 4-3 정합). **★§4.6 Monetary Reward Transaction≠Payment Transaction**(연결하되 Entity/Ledger 분리). **현행**: 범용 Unified Ledger 부재→신설. pg_settlement/kr_settlement_line=append/upsert(수정-in-place 없음·sequence/balance_after 없음)=Append-only 패턴 부분·idempotency(UNIQUE)=참조 정본.

## 2. Balance (§21·§22) · Snapshot (§23)

- **Balance(§21)**: balance_id·reward account·ledger·currency·**estimated/pending/approved/available/reserved/payable/settled/paid/clawback/liability/expired/written off balance·source balance·ledger calculated balance·difference**·calculated_at·status·evidence. **★§4.3 다중 Value·Source Balance vs Ledger-calculated Balance 비교**.
- **상태(§22)**: MATCHED·SOURCE_ONLY·LEDGER_ONLY·MISMATCH·NEGATIVE·STALE·RECONCILING·FROZEN·UNKNOWN.
- **Snapshot(§23)**: snapshot id·reward account·ledger·currency·snapshot time·all balance categories·**ledger sequence·transaction high-water mark·checksum·previous snapshot·difference**·source·evidence.
**현행**: Balance/Snapshot 부재→신설. **Balance vs Ledger 불일치=Critical Gap**(Point Ledger 정합).

## 3. Reservation (§24) · Availability Event (§25)

- **Reservation(§24)**: reservation id·monetary reward·reward account·beneficiary·reserved amount·currency·reason·order/invoice/settlement reference·reserved/expires/committed/released_at·status·**idempotency key**·evidence.
- **Availability Event(§25)**: availability event id·accrual·reward account·amount·currency·previous/new state·available_at·release trigger·source object·actor·evidence.
**현행**: 부재→신설.

## 4. Settlement (§26·§27) · Payout (§28·§29) ★분리

- **Settlement(§26)**: settlement_id·provider·account·settlement account·period·participant·beneficiary·monetary reward references·**gross/adjustment/reversal/clawback/fee/tax withholding/net payable amount·currency**·created/approved/finalized_at·status·statement reference·accounting reference·evidence. 상태(14): DRAFT·CALCULATING·PENDING_APPROVAL·APPROVED·FINALIZED·PAYOUT_PENDING·PARTIALLY_PAID·PAID·DISPUTED·ADJUSTED·REOPENED·CANCELLED·FAILED·ARCHIVED.
- **Payout(§28)**: payout_id·settlement·beneficiary·payout recipient reference·**payout destination type·masked destination reference·gross/fee/withholding/net amount·currency·payout provider·payout account**·requested/processed/completed/failed_at·failure category·retry reference·status·evidence. Destination(10): BANK_REFERENCE·PAYMENT_PROVIDER_ACCOUNT·DIGITAL_WALLET·INTERNAL_WALLET·STORE_CREDIT·INVOICE_CREDIT·GIFT_CARD·CHECK·MANUAL_SETTLEMENT·OTHER. **★금융계좌 원문 저장 금지(Masked Reference·Verification 상태만)**. 상태(13): SCHEDULED·PENDING_VERIFICATION·PENDING·PROCESSING·PARTIALLY_PAID·PAID·FAILED·RETRYING·RETURNED·CANCELLED·REVERSED·BLOCKED·UNKNOWN.
**★§4.4·§4.7 Settlement≠Payout·Wallet Credit≠Bank Payout**. **현행**: pg_settlement(gross/fee/net)·kr_settlement_line(net_payout)=**inbound Settlement**의 실체(테넌트 수취·**outbound Payout to 참여자=부재**). Settlement 필드/net 계산=참조 정본·outbound Payout(Failed/Returned/Retried 상태)=신설. **★§4.9 fee/tax withholding 분리·kr_settlement_line 이중차감 방지(vat/coupon/point 제외)=Settlement 규율 실 사례**.

## 5. Reversal (§30) · Clawback (§31) · Refund Adjustment (§32) · Expiration (§33)

- **Reversal(§30)**: reversal id·original transaction/accrual/payout·**reversal type·amount·currency·reason·source event·order cancellation reference·refund reference·dispute reference**·reversed_at·actor·status·evidence.
- **Clawback(§31)**: clawback_id·beneficiary·original reward/accrual/settlement/payout·**clawback reason·requested/recovered/remaining amount·currency·recovery method·negative carry-forward**·requested/approved/completed_at·status·evidence. Reason(11): ORDER_CANCELLED·ORDER_RETURNED·PAYMENT_REFUNDED·CHARGEBACK·FRAUD·DUPLICATE_REWARD·ATTRIBUTION_INVALID·CONTRACT_VIOLATION·OVERPAYMENT·MANUAL_CORRECTION·OTHER.
- **Refund Adjustment(§32)**: refund adjustment id·refund reference·original reward·beneficiary·adjustment category·original/adjusted/restored/recovered amount·currency·effective_at·status·evidence(정상 환불액≠추가 Reward 조정 구분).
- **Expiration(§33)**: expiration id·monetary reward·reward account·accrual references·original/remaining amount·currency·scheduled/expired_at·notice references·grace period·restoration eligibility·status·evidence.
**★§4.5 Reversal/Clawback=반드시 Original Reward/Accrual/Transaction/Settlement/Payout 연결(Runtime Guard §46)**. **현행**: OrderHub 수동취소 역분개·CRM LTV 취소/반품 역분개(Part 268/263)·환불(Payment)=Reversal 인접 근거. Monetary Reward Clawback 엔진=부재·신설(clawback reason=취소/반품/refund/chargeback → OrderHub 취소·kr return_fee 인접).

## 6. Liability (§34) · Accounting Reference (§35) · Funding Allocation (§36)

- **Liability(§34)**: liability id·program·category·ledger·legal entity·currency·**accrued/approved/available/payable/settled/paid liability·expired breakage·written off amount·expected payout rate**·model version·accounting period·calculated_at·accounting reference·evidence. → 부재·신설(Rollup net_profit=인접).
- **Accounting Reference(§35)**: accounting ref id·monetary reward/transaction/settlement/payout·accounting provider·**ledger account reference·journal entry reference·accounting classification·debit/credit account reference·amount·currency·accounting date·period**·status·evidence. Classification(11): MARKETING_EXPENSE·CUSTOMER_INCENTIVE_EXPENSE·COST_OF_REVENUE·COMMISSION_EXPENSE·PARTNER_PAYABLE·CUSTOMER_CREDIT_LIABILITY·ACCRUED_LIABILITY·SETTLEMENT_PAYABLE·BREAKAGE_INCOME·REFUND_ADJUSTMENT·OTHER. → 회계 시스템 미연동·부재·신설(Pnl 분류=인접).
- **Funding Allocation(§36)**: funding allocation id·monetary reward·funding party·**funding type·allocation percentage·allocated amount·currency·funding agreement reference·settlement/liability responsibility**·valid from/to·status·evidence. Type(11): PLATFORM/MERCHANT/BRAND/PARTNER/SELLER/MANUFACTURER/SHARED_FUNDED·MARKETING_BUDGET·LOYALTY_BUDGET·CONTRACT_FUNDED·OTHER. → 부재·신설.

## 7. Relationship Graph (§39) · Candidate (§40·§41) · Evidence (§42)

**Graph(§39)**: Canonical Person/Organization → Participant → {Reward Account·Beneficiary} · Program → Definition → Rule Reference · Trigger → Eligibility → Accrual → Monetary Reward → Transaction · Reward Account → Ledger → Ledger Entry · Transaction → Settlement → Payout · Transaction → Reversal · Settlement → Clawback · Reward → {Refund Adjustment·Expiration·Liability·Accounting·Funding·Order·Payment·Refund·Subscription·Campaign·Referral·Commission Attribution·Wallet Destination}.
**Candidate(§40)**: candidate id·request/discovery task id·provider·account·program·reward account·monetary reward id·transaction/settlement/payout ids·participant/beneficiary ids·**subject roles·tenant·brand·store·merchant·legal entity·currency·value summary·shared account context·recipient verification state·match confidence·duplicate group·review requirements**·evidence. Match(21): EXACT_REWARD_ACCOUNT/MONETARY_REWARD/TRANSACTION/SETTLEMENT/PAYOUT_MATCH·STRONG_CUSTOMER/PARTNER_MATCH·VERIFIED_BENEFICIARY_MATCH·AFFILIATE/CREATOR/SELLER_MATCH·PAYOUT_RECIPIENT_ONLY·SHARED_ACCOUNT_MATCH·WRONG_ACCOUNT/BENEFICIARY/TENANT/BRAND/LEGAL_ENTITY·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED.
**Evidence(§42)**: evidence id·request·provider·account·source system·source object·external object id·**source of truth role·API/export/webhook reference·schema version·account scope·tenant·brand·legal entity·currency·discovered/effective_at·result hash·lineage·confidence·audit reference**. Financial 원문 미포함.

## 8. Error (§43) · Warning (§44)

**Error(23)**: MONETARY_REWARD(_ACCOUNT)_NOT_FOUND·_ACCOUNT_SCOPE_MISMATCH·MONETARY_PARTICIPANT_NOT_FOUND·MONETARY_BENEFICIARY_UNRESOLVED·**MONETARY_RECIPIENT_VERIFICATION_MISSING**·_RULE/_ELIGIBILITY_REFERENCE_MISSING·_ACCRUAL/_TRANSACTION_NOT_FOUND·**MONETARY_LEDGER_INCOMPLETE·MONETARY_BALANCE_MISMATCH**·_SETTLEMENT/_PAYOUT_NOT_FOUND·**MONETARY_REVERSAL/_CLAWBACK_RELATIONSHIP_MISSING**·**MONETARY_CURRENCY_MISSING·MONETARY_FX_REFERENCE_MISSING**·MONETARY_LIABILITY_MISMATCH·_ACCOUNTING_REFERENCE_MISSING·_FUNDING_ALLOCATION_MISSING·**MONETARY_CROSS_TENANT_RISK**·_RUNTIME_BLOCKED.
**Warning(14)**: MULTIPLE_PARTICIPANT/BENEFICIARY_MATCH·SHARED_ACCOUNT·RECIPIENT·PENDING_ACCRUAL·SETTLEMENT_DELAY·PAYOUT_DELAY·PARTIAL_PAYOUT·NEGATIVE_BALANCE·CLAWBACK·FX·LIABILITY·ACCOUNTING_WARNING·MANUAL_REVIEW_REQUIRED.

## 9. Static Lint (§45) · Runtime Guard (§46)

**Lint(§45)**: **Currency 없는 Amount**·Provider Account Binding 없는 Reward·Tenant Binding 없는 Reward Account·Legal Entity 없는 Settlement·**Participant↔Beneficiary 자동 동일시·Customer↔Commission Recipient 자동 동일시·Accrual↔Payout 혼용·Wallet Credit↔Bank Payout 혼용·Face Value↔Paid Value 혼용·Payment Transaction↔Monetary Reward Transaction 혼용**·**Ledger Entry Update/Delete**·Idempotency Key 누락·Reversal 원 Transaction 누락·Clawback 원 Reward 누락·**Payout Recipient Verification 누락·금융계좌 원문 저장·FX Version 누락**·Source of Truth 누락·Evidence 없는 Entity·**기존 Money/Ledger Entity 중복 생성**.
**Guard(§46)**: Wrong Provider/Reward Account·**Cross-Tenant Reward**·Wrong Brand/Merchant/Legal Entity·**Unverified Beneficiary/Payout Recipient**·Unsupported Currency·Missing FX·**Duplicate Transaction/Ledger Entry/Payout**·Invalid Settlement/Reversal/Clawback Relationship·**Negative Balance Policy 위반**·Scope 초과 Financial Export·Critical Schema Drift·Kill Switch.
**현행 실증**: pg_settlement UNIQUE(Duplicate Transaction 차단)·channel_credential auth_tenant only(Cross-Tenant 차단·184차)·GENIE_ENV 물리분리·kr_settlement_line 이중차감 방지.

## 10. Golden Entity Dataset (§47) · Conformance (§48)

**Golden(§47)**: Program/Account(Cashback/Rebate/Commission/Wallet·단일/다중 Currency·Partner/Affiliate/Creator/Seller·Wrong Tenant/Cross-brand/Closed/Deleted) · Participant/Beneficiary(Customer=Beneficiary·**Customer≠Beneficiary**·Referrer/Referee·Affiliate/Creator/Seller/Agency·Organization/Shared·**Unverified Recipient·Wrong Beneficiary**) · Accrual/Transaction(Estimated/Pending/Approved/Available/Hold/Rejected·**Idempotent·Duplicate 차단**·Reservation/Release/Wallet Credit/Settlement) · Ledger/Balance(Opening/Accrual/Payable/Payout/Reversal/Clawback/Expiration/Correction Entry·Match/Mismatch/**Negative·Sequence Gap·Entry 수정 차단**) · Settlement/Payout(정상/Partial/Multi-beneficiary·정상/Partial/Failed/Returned·**Duplicate 차단**·Wallet/Bank/Invoice Destination) · Reversal/Clawback(Order Cancellation/Refund Reversal·Fraud/Partial Clawback·Negative Carry-forward·**Missing Original 차단·Invalid 관계 차단**) · Financial(Platform/Merchant/Partner/Shared-funded·**KRW/USD/JPY·FX Conversion·Zero-decimal·FX Version 누락 차단**·Liability·Accounting).
**실 회귀 시드**: pg_settlement UNIQUE 멱등·Cross-Tenant 차단·kr 이중차감 방지·fxToKrw 변환 — 즉시 Golden 등록 가능.
**Conformance(§48)**: Cashback/Rebate/Refund Incentive/Affiliate/Referral/Creator/Marketplace Commission/Revenue Share/Wallet/Store Credit/Settlement/Payout에 동일 Contract(Program·Account·Participant·Beneficiary·Amount·Currency·Accrual·Transaction·Ledger·Balance·Settlement·Payout·Reversal·Clawback·Liability·Accounting·Evidence·Audit).

## 11. 기존 구현 분류 (§49) · 중복 감사 (§50)

| 구현 | 분류 | 근거 |
|---|---|---|
| `pg_settlement`(PgSettlement) | **KEEP_SEPARATE_WITH_REASON**(Settlement 패턴 참조정본) | 테넌트 수취 PG 정산(inbound·gross/fee/net·UNIQUE 멱등). outbound Reward 아님 |
| `kr_settlement_line`(Db.php) | **KEEP_SEPARATE_WITH_REASON** | 마켓 정산(inbound·net_payout·platform_fee=테넌트 지불 비용)·이중차감 방지 |
| `ad_spend_ledger`(BillingMethod) | **KEEP_SEPARATE_WITH_REASON** | 광고 지출 원장·outbound reward 아님 |
| `Connectors::fxToKrw` | **VALIDATED_LEGACY**(확장) | FX 변환 실 구현·Canonical FX Conversion(rate source/version/timestamp) 확장 |
| Referral(referrer/referee) | **KEEP_SEPARATE**(역할분리 정본) | Participant/Beneficiary 분리·비현금 coupon(Part 4-4) |
| OrderHub 역분개·CRM LTV 역분개·Pnl 분류 | **VALIDATED_LEGACY**(인접) | Reversal/Accounting 인접 패턴·Monetary Reward 엔진 아님 |
| Money VO·Unified Ledger·Participant/Beneficiary/Accrual/Payout(outbound)/Clawback/Liability/Balance/Snapshot/FundingAllocation/AccountingReference·고객 Cashback/Rebate/Commission/Wallet 엔진 | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**중복 감사(§50)**: **Money VO 없음(단일 신설·중복 금지)**·Currency=DECIMAL+currency 컬럼(Enum 난립 없음)·FX=fxToKrw 단일(중복 금지)·Ledger=도메인별 개별 테이블(Unified Ledger로 통합 계획·즉시 삭제 금지→Migration/Compatibility). **★§4.10 기존 Money/Currency/Ledger/Transaction 모델 재사용·Reward 유형별 독립 Candidate Store 금지**.

## 12. 기능 후퇴 방지 · 검증 게이트 (§56) · 영구 규칙

**후퇴 방지**: pg_settlement/kr_settlement_line/ad_spend_ledger/fxToKrw·`/v427/pg/*`·Rollup·BillingMethod·Pnl API·Existing Ledger/Settlement/Payout/Accounting/Currency 기능 보존(회귀 0).
**게이트(§56)**: Aggregate·공통 모델·Program/Account Provider Scope·**Participant≠Beneficiary·Customer/Affiliate/Creator/Seller 역할 구분**·Definition≠Rule Reference·Trigger/Eligibility·**Accrual≠Payout**·Transaction≠Ledger Entry·**Append-only Ledger**·Balance/Snapshot·**Settlement≠Payout**·**Reversal/Clawback 원 Transaction 강제**·**Currency 없는 Amount 차단·FX Version 보존**·Face/Payable/Paid/Liability 분리·**Wallet Credit≠Bank Payout**·Liability/Accounting·Funding Allocation·Graph·Candidate/Evidence·Lint/Guard·**기존 Money/Ledger 중복 생성 없음**·Golden/Conformance·회귀 0·ADR/PM/Repeat Problem/Agent History.
**영구 규칙**: 신규 현금성 보상 도입 전 **기존 Money/Currency/Ledger/Transaction 재사용(중복 금지)** · Provider/Tenant/Brand/Legal Entity Scope · **Participant/Beneficiary 분리·Recipient Verification** · Append-only Ledger·Idempotency·Balance=Ledger Reconciliation · Settlement≠Payout·Reversal/Clawback 원거래 연결 · Currency/FX Version 강제·금융계좌 원문 금지 · Liability/Accounting/Funding · Candidate/Evidence · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **inbound 정산(pg/kr settlement)↔outbound reward·광고 지출↔reward·Payment↔Monetary Reward 오혼입 금지·Reward 유형별 독립 Ledger/Candidate Store 중복 생성 금지.**

## 13. Lifecycle Matrix (§54) · Financial Value Matrix (§55) — 현행

| Reward | Accrued | Approved | Available | Reserved | Settled | Paid | Reversed | Clawed Back | Status |
|---|---|---|---|---|---|---|---|---|---|
| (outbound 현금성 보상) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(엔진 부재)** |
| pg/kr 정산(inbound·참조) | N/A | N/A | N/A | N/A | ✅net/net_payout | N/A(테넌트 수취) | 역분개(인접) | N/A | KEEP_SEPARATE |

| Reward | Face Value | Accrued | Approved | Payable | Paid | Liability | Currency | FX Version | Accounting |
|---|---|---|---|---|---|---|---|---|---|
| (outbound) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| pg/kr 정산(참조) | gross | N/A | N/A | N/A | net/net_payout | N/A | ✅컬럼 | **미보존(GAP)** | Pnl 분류(인접) |
