# CANONICAL DSAR — Monetary Reward Entity Model (Aggregate·Program·Account·Participant·Beneficiary·Definition·Currency)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-2 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Aggregate/Program/Account/Participant/Definition/Currency) + [`CANONICAL_DSAR_MONETARY_REWARD_LEDGER_GOVERNANCE.md`](CANONICAL_DSAR_MONETARY_REWARD_LEDGER_GOVERNANCE.md)(Ledger·Settlement·Payout·Reversal·Clawback·Liability·Candidate·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_CANONICAL_MONETARY_REWARD_ENTITY_MODEL.md`](../architecture/ADR_DSAR_CANONICAL_MONETARY_REWARD_ENTITY_MODEL.md).
> 선행: Provider & Account Inventory(4-5-1-1)·Reward Governance(4-4)·Point Ledger(4-3)·Payment/Refund·Billing·Loyalty·EPIC05 Identity.
> **범위**: 개별 Cashback Rule/Commission 계산 로직 아님 — 모든 현금성 보상이 공유할 **공통 Entity/Lifecycle Contract**.

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Money / Currency Value Object** | ❌ **class Money 부재(grep 0)** — 금액=plain DECIMAL(16,2)/DOUBLE + 별도 `currency` VARCHAR 컬럼. Precision/Rounding/ValueType/EffectiveTime 없음 | **NOT_APPLICABLE → 신설**(전방호환 §37) |
| **FX Conversion** | △ `Connectors::fxToKrw(amount, currency)`(KRW 단방향 변환)·`performance_metrics.currency`(default KRW) | **부분 REAL** · **rate source/version/timestamp/gain·loss 미보존 = GAP** |
| **Settlement / Transaction** | ✅ **REAL(단, inbound)** — `pg_settlement`(tenant·provider·txn_id·**gross/fee/net**·currency·UNIQUE(tenant,provider,txn_id)) · `kr_settlement_line`(platform_fee/ad_fee/shipping_fee/return_fee·**net_payout**·currency KRW·period·sku) | **KEEP_SEPARATE_WITH_REASON**(테넌트가 **수취**하는 정산 — outbound 보상 아님. **Ledger/Currency/Idempotency 패턴=참조 정본**) |
| **광고비 지출 Ledger** | ✅ `ad_spend_ledger`(BillingMethod·MTD·billing_key) | **KEEP_SEPARATE**(광고 지출·outbound reward 아님) |
| **Idempotency** | ✅ `pg_settlement` UNIQUE(tenant,provider,txn_id)·Referral referred_user_id UNIQUE | **REAL 패턴**(Canonical Idempotency Key 참조 정본) |
| **Participant / Beneficiary 역할분리** | △ **Referral**(referrer_user_id/referred_user_id 분리·Part 4-4) | **부분 REAL(Referral만)** · 범용 Participant/Beneficiary = **NOT_APPLICABLE → 신설** |
| **Reversal / 역분개** | △ OrderHub 수동취소 역분개·CRM LTV 취소/반품 역분개(Part 268/263)·환불(Payment) | **인접 REAL(주문/LTV)** · Monetary Reward Reversal 엔진 = **NOT_APPLICABLE** |
| **Accounting 분류** | △ `Pnl.php` net_profit 분류(매출총이익−광고비−마켓수수료·원가) | **인접 REAL(P&L)** · Accounting Reference(journal/ledger account) = **NOT_APPLICABLE** |
| **Aggregate / Program / Account / Definition / Accrual / Ledger(unified) / Balance / Snapshot / Reservation / Payout(outbound) / Clawback / Liability / Funding Allocation** | ❌ 부재(grep 0) | **NOT_APPLICABLE → 신설(전방호환)** |
| **고객 Cashback/Rebate/Refund Incentive/Commission/Wallet Credit/Store Credit(outbound)** | ❌ 엔진 부재(Part 4-5-1-1 확정) | **NOT_APPLICABLE**(멀티테넌트 고객용 미래 제품) |

**★결론(정직)**: **현금성 보상(outbound)을 발생·적립·정산·지급하는 Canonical 엔진은 부재**. 실체는 **inbound 정산**(pg_settlement·kr_settlement_line — 테넌트가 PG/마켓에서 **받는** 돈)·광고비 지출(ad_spend_ledger)·FX 변환(fxToKrw)·Idempotency(UNIQUE)·역할분리(Referral)·역분개(OrderHub/CRM)·P&L 분류(Pnl). 이들은 **Ledger/Currency/FX/Idempotency/Reversal 패턴의 참조 정본**이나 **outbound 현금성 보상과 도메인 분리(KEEP_SEPARATE)**. 본 Entity Model=멀티테넌트 고객용 미래 현금성 보상의 **공통 전방호환 계약**. **기존 Money·Ledger·Currency 모델 재사용/확장(중복 신설 금지·§4.10)**·지어내기·NO_DATA/오탐 금지.

---

## 1. Canonical Entity 목록 (37 목표) — §3

MONETARY_REWARD(Aggregate)·PROGRAM·ACCOUNT·PARTICIPANT·BENEFICIARY·ROLE·DEFINITION·RULE_REFERENCE·TRIGGER_REFERENCE·ELIGIBILITY_REFERENCE·ACCRUAL·TRANSACTION·LEDGER·LEDGER_ENTRY·BALANCE·BALANCE_SNAPSHOT·RESERVATION·AVAILABILITY_EVENT·SETTLEMENT·PAYOUT·REVERSAL·CLAWBACK·REFUND_ADJUSTMENT·EXPIRATION·LIABILITY·ACCOUNTING_REFERENCE·FUNDING_ALLOCATION·CURRENCY_AMOUNT(VO)·FX_CONVERSION·RELATIONSHIP_GRAPH·CANDIDATE·EVIDENCE + Error/Warning·Static Lint·Runtime Guard·Golden Dataset.
**현행 실체**: SETTLEMENT/TRANSACTION(pg_settlement·kr_settlement_line·KEEP_SEPARATE inbound)·FX_CONVERSION(fxToKrw 부분)·Idempotency(UNIQUE)·역할분리(Referral) = REAL 패턴. 나머지 = **신설**.

## 2. Canonical Aggregate `MONETARY_REWARD` (§5)

필드: monetary_reward_id·provider_id·provider_account_id·program_id·definition_id·external_reward_id·**reward category·subtype·source domain·source object type/id·trigger/rule/eligibility/accrual reference·participant references·beneficiary references**·tenant_id·workspace_id·brand_id·store_id·merchant_account_id·legal_entity_id·environment·region·**value summary·funding summary·liability summary**·current status·lifecycle version·source of truth·created/updated/effective/completed/archived/deleted_at·evidence·audit reference.
**현행**: Aggregate 부재 → 신설. tenant_id=REAL·workspace/brand/store/merchant/legal_entity=부재(Part 4-5-1-1 GAP·tenant row-level만).

## 3. Category (§6) · Status (§7)

**Category(20)**: CASHBACK·REBATE·REFUND_INCENTIVE·GOODWILL_CREDIT·SERVICE_RECOVERY_CREDIT·COMMISSION·AFFILIATE_COMMISSION·REFERRAL_COMMISSION·CREATOR_COMMISSION·INFLUENCER_COMMISSION·SALES_COMMISSION·MARKETPLACE_COMMISSION·REVENUE_SHARE·PROFIT_SHARE·WALLET_CREDIT·STORE_CREDIT·INVOICE_CREDIT·PAYOUT_REWARD·PARTNER_CREDIT·OTHER.
**★현행 실체 없음(전 Category outbound 보상=NOT_APPLICABLE)**. ⚠ **주의**: `kr_settlement_line.platform_fee`=테넌트가 마켓에 **지불**하는 수수료(비용)이지 테넌트가 참여자에게 **지급**하는 MARKETPLACE_COMMISSION 보상이 아님 → 오혼입 금지. Referral 보상=coupon(비현금·REFERRAL_COMMISSION 아님).
**Status(35)**: DRAFT·CALCULATED·ESTIMATED·ELIGIBILITY_PENDING·ELIGIBLE·NOT_ELIGIBLE·ACCRUED·PENDING·VALIDATION_HOLD·RETURN_WINDOW_HOLD·FRAUD_HOLD·TAX_HOLD·APPROVAL_PENDING·APPROVED·AVAILABLE·RESERVED·PAYABLE·SETTLEMENT_PENDING·SETTLED·PAYOUT_PENDING·PAID·PARTIALLY_PAID·REJECTED·CANCELLED·REVERSED·PARTIALLY_REVERSED·CLAWED_BACK·PARTIALLY_CLAWED_BACK·EXPIRED·WRITTEN_OFF·FAILED·ARCHIVED·DELETED·UNKNOWN. **★단일 상태 축약 금지(§4.1)·Accrual≠Payout(§4.4)**.

## 4. Program (§8) · Account (§9)

- **Program(§8)**: program_id·provider·account·external program id·name·category·tenant·brand·**store/merchant scope·legal entity**·region·supported currencies·participant/beneficiary types·**funding/settlement/payout/liability model**·validity·status·version·owner·evidence. → 부재·신설.
- **Account(§9)**: account_id·provider account·program·external account id·**account type**·owner type·owner id·canonical identity reference·tenant·brand·store·merchant·legal entity·environment·region·default/supported currency·balance/settlement/payout model·status·opened/suspended/closed/deleted_at·evidence.
  **Account Type(14)**: CUSTOMER_REWARD/CASHBACK/REBATE/COMMISSION/AFFILIATE/CREATOR/SELLER/PARTNER/WALLET/SETTLEMENT/PAYOUT/LIABILITY/CLEARING/INTERNAL_LEDGER_ACCOUNT. → 부재·신설(Reward Account=참여자별 보상 계정·현행 없음).

## 5. Participant (§10) · Beneficiary (§11) · Role (§12) ★핵심 분리

- **Participant(§10)**: participant_id·**participant type**·external id·canonical person/organization reference·loyalty member/customer/seller/partner/employee reference·provider account·tenant·brand·legal entity·validity·**verification status**·status·evidence. Type(19): CUSTOMER/LOYALTY_MEMBER/BUYER/REFERRER/REFEREE/AFFILIATE/INFLUENCER/CREATOR/SALESPERSON/SELLER/VENDOR/PARTNER/AGENCY/RESELLER/EMPLOYEE/ORGANIZATION/PLATFORM/MERCHANT/UNKNOWN.
- **Beneficiary(§11)**: beneficiary_id·monetary reward id·participant id·**beneficiary type·benefit allocation ratio·allocated amount reference·payout recipient reference·wallet destination·invoice credit destination·tax subject reference·verification status**·valid from/to·status·evidence. Type(11): PRIMARY/SECONDARY/SHARED/ORGANIZATION/PARTNER/MERCHANT/SELLER/EMPLOYEE/PLATFORM_RECIPIENT/BENEFICIAL_OWNER/UNKNOWN.
- **Role(§12, 17)**: TRIGGERING_CUSTOMER·PURCHASER·BENEFICIARY·PAYOUT_RECIPIENT·REFERRER·REFEREE·AFFILIATE·ATTRIBUTED_CREATOR·SELLER·FUNDING_PARTY·SETTLEMENT_COUNTERPARTY·APPROVER·CALCULATOR·ACCOUNT_OWNER·TAX_SUBJECT·ADMIN·UNKNOWN.
**★§4.2·§4.8: Reward를 발생시킨 Customer ≠ 실제 지급받는 Beneficiary·Commission Recipient(Affiliate/Creator/Seller/Partner)를 Customer로 자동 통합 금지**. 현행 실 사례=**Referral referrer(수령)≠referee(발생)** 분리. 범용 Participant/Beneficiary Store=신설.

## 6. Definition (§13) · Rule/Trigger/Eligibility Reference (§14~§16)

- **Definition(§13)**: definition_id·program·external id·category·name·**calculation/value/funding/settlement/payout/expiration/reversal/clawback/tax model·transferability·withdrawal capability**·valid from/to·status·version·evidence. → 부재·신설.
- **Rule Reference(§14)**: rule_reference_id·external/canonical rule id·**rule version**·category·calculation method·eligibility policy ref·trigger type·effective from/to·source system·status·evidence. **본 단계=Reference Contract만(상세 Rule Engine 아님)**.
- **Trigger Reference(§15)**: ORDER_CREATED/COMPLETED·PAYMENT_SUCCEEDED·**RETURN_WINDOW_COMPLETED**·SUBSCRIPTION_STARTED/RENEWED·REFERRAL_CONVERTED·CAMPAIGN_COMPLETED·CLAIM_APPROVED·SALES_CONVERTED·CREATOR_ATTRIBUTED·SETTLEMENT_PERIOD_CLOSED·MANUAL_APPROVAL·SERVICE_FAILURE·SLA_BREACH·REFUND_COMPLETED·CUSTOM_EVENT. 필드: trigger id·external event id·type·source object·event/received time·**idempotency key**·participant references·status·evidence.
- **Eligibility Reference(§16)**: eligibility ref id·policy id/version·subject·evaluation time·result·**exclusion reasons·fraud/consent/suppression/geographic status·previous reward count·limit status**·evidence. 결과(9): ELIGIBLE/CONDITIONALLY_ELIGIBLE/NOT_ELIGIBLE/PENDING_REVIEW/LIMIT_REACHED/FRAUD_BLOCKED/SUPPRESSED/EXPIRED/UNKNOWN.
→ 전부 부재·신설. Trigger idempotency=pg_settlement UNIQUE 패턴 계승.

## 7. Accrual (§17)

accrual_id·monetary reward id·reward account·participant·beneficiary·source transaction·calculation reference·**calculated/estimated/approved amount·currency·accrued_at·available_at·hold until·hold reason·expiration date**·status·idempotency key·evidence. 상태(11): CALCULATED·ESTIMATED·PENDING·HELD·APPROVED·AVAILABLE·REJECTED·CANCELLED·REVERSED·EXPIRED·FAILED.
**★§4.4 Accrual≠Payout**(Return Window/Fraud Hold/Approval Hold/Min Threshold/Recipient Verification/Tax Review/Settlement Delay/Payout Failure/Cancellation/Clawback로 미지급 가능). → 부재·신설. **RETURN_WINDOW_HOLD=kr_settlement_line return_fee·환불 역분개(Part 263) 인접 근거**.

## 8. Currency Amount Value Object (§37) · FX Conversion (§38)

- **Amount VO(§37)**: amount·**currency code·precision·rounding mode·value type·effective time·source·original amount·converted amount·FX reference**·status. **Value Type(11)**: FACE/ESTIMATED/ACCRUED/APPROVED/AVAILABLE/PAYABLE/PAID/FUNDED/LIABILITY/ACCOUNTING/DISPLAY_VALUE. **★§4.3·§4.9: Face Value≠Paid Value·Currency 없는 금액 금지**. → **기존 Money VO 없음(신설)·§4.10 재사용 원칙상 신설 시 단일 VO**.
- **FX Conversion(§38)**: conversion id·source amount/currency·target amount/currency·**FX rate·rate source·rate timestamp·rate version·conversion reason·rounding rule·gain·loss reference**·status·evidence. **★Historical Reward=당시 FX Rate Version 보존**. → 현행 `fxToKrw`=변환 함수 실 구현(KRW 단방향)·**rate source/version/timestamp/gain·loss 미보존=GAP**. Canonical FX Conversion 신설(fxToKrw 확장).

## 9. Entity Matrix (§53) — 현행 실측

| Entity | Domain | Provider Scope | Tenant | Participant | Beneficiary | Currency | Ledger | Source of Truth | Status |
|---|---|---|---|---|---|---|---|---|---|
| pg_settlement | PG 정산(inbound) | Stripe/Toss/… | ✅ | N/A(테넌트) | N/A | ✅컬럼 | 개별테이블 | pg_settlement | **KEEP_SEPARATE(참조정본)** |
| kr_settlement_line | 마켓 정산(inbound) | 쿠팡/11번가/… | ✅ | N/A | N/A | ✅(KRW) | 개별테이블 | kr_settlement_line | **KEEP_SEPARATE** |
| ad_spend_ledger | 광고 지출 | 광고채널 | ✅ | N/A | N/A | ✅(KRW) | 원장 | ad_spend_ledger | **KEEP_SEPARATE** |
| Referral referrer/referee | 추천(coupon) | self | ✅ | ✅분리 | ✅분리 | N/A(비현금) | N/A | referral_signup | **KEEP_SEPARATE(역할분리 정본)** |
| MONETARY_REWARD Aggregate(outbound) | 현금성 보상 | — | — | — | — | — | Unified | — | **NOT_APPLICABLE(신설)** |
