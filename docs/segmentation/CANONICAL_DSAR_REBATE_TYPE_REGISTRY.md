# CANONICAL DSAR — Rebate Type Registry & Classification Dimensions (Type·Family·Business Model·Flow·Timing·Calculation·Claim·Settlement·Accounting·Purpose)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-2 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Type/Family/Dimensions/Instrument Boundary) + [`CANONICAL_DSAR_REBATE_CLASSIFICATION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_CLASSIFICATION_GOVERNANCE.md)(Program Classification·Primary/Secondary/Hybrid·Provider Mapping·Decision·Reconciliation·Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_TYPE_BUSINESS_MODEL_CLASSIFICATION.md`](../architecture/ADR_DSAR_REBATE_TYPE_BUSINESS_MODEL_CLASSIFICATION.md).
> 선행: Rebate Program Master(4-5-3-1-1)·Monetary Reward/Cashback Foundation·Pnl·ChannelRegistry.
> **범위**: Type/Business Model **분류만** — Rule 계산식/Eligibility/Accrual/Claim/Settlement/Payment 아님. Funding/Lifecycle=후속(4-5-3-1-3~9). §4.4 Type≠계산 로직.

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Type Registry / Taxonomy** | ❌ **부재(grep 0)** — `rebate_type/classification/incentive/allowance/scan-back/off-invoice` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Provider Type Mapping 패턴 (외부 type→canonical)** | ✅ **REAL** — `ChannelRegistry` group_type(sales/marketing/logistics/pg/messaging)·channel_key | **재사용**(외부 type→canonical 매핑 패턴) |
| **Instrument Boundary (§22: Rebate≠Discount/Cashback/Commission/Refund/Point)** | ✅ **REAL(각 도메인 실체)** — Discount=coupon(CouponAdmin percentage/fixed)·Cashback=부재(4-5-2-*)·Commission=마켓 수수료(kr platform_fee)·Refund=OrderHub 역분개·Loyalty Point=point_discount(마켓) | **경계 정의(참조)** — Rebate=이들과 명확 구분 |
| **Transaction Flow (Sell-in/through/out)** | △ `SupplyChain`(sell-in supplier→dealer)·`channel_orders`(sell-out)·kr_settlement_line | **재사용**(Flow 실 데이터원) |
| **Accounting Nature (Contra Revenue/Expense)** | △ `Pnl`(contra-revenue via coupon/point 차감·marketing/commission expense·COGS adjustment) | **재사용(Reference)** — 최종 회계는 법인/국가/ERP 정책 |
| **Calculation Basis (Revenue/Margin/Volume/Growth)** | △ `Mmm`/`Rollup`(revenue/margin/volume/growth) | **재사용(Reference)** |
| **Rebate Type/Version·Business Model·Audience/Sponsor·Flow/Timing/Calculation Basis/Structure/Claim Model/Settlement Method/Accounting Nature/Commercial Purpose Classification·Program Classification·Primary/Secondary/Hybrid·Provider Mapping(rebate)·Decision/Candidate/Reconciliation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Type Registry/Taxonomy는 부재(NOT_APPLICABLE)**. 실 인접=Provider Type Mapping 패턴(ChannelRegistry group_type)·Instrument Boundary 각 도메인 실체(Discount=coupon·Cashback 부재·Commission=마켓 수수료·Refund=역분개·Point=point_discount)·Transaction Flow(SupplyChain sell-in·channel_orders sell-out)·Accounting Nature(Pnl contra-revenue/expense)·Calculation Basis(Mmm/Rollup). **★핵심 정직: 이번 블록=Type/Business Model 분류만·§4.4 Type=Classification≠계산 로직(상세 Rule=후속)·§4.5 Rebate≠Discount/Cashback/Commission/Refund/Marketing Fund(경계 정의)**. **기존 group_type/Pnl/Mmm 재사용(Type Enum 중복 금지·§42)**·지어내기·NO_DATA/오탐 금지·본 Registry=멀티테넌트 고객용 미래 rebate 전방호환 계약.

---

## 1. Canonical Entity (22) — §5

REBATE_TYPE_REGISTRY·TYPE_VERSION·BUSINESS_MODEL_REGISTRY·AUDIENCE_CLASSIFICATION·SPONSOR_CLASSIFICATION·TRANSACTION_FLOW_CLASSIFICATION·TIMING_CLASSIFICATION·CALCULATION_BASIS_CLASSIFICATION·CLAIM_MODEL_CLASSIFICATION·SETTLEMENT_METHOD_CLASSIFICATION·ACCOUNTING_NATURE_CLASSIFICATION·COMMERCIAL_PURPOSE_CLASSIFICATION·PROGRAM_CLASSIFICATION·PROGRAM_PRIMARY_TYPE·PROGRAM_SECONDARY_TYPE·PROVIDER_TYPE_MAPPING·CLASSIFICATION_DECISION·CLASSIFICATION_RULE_REFERENCE·CLASSIFICATION_CANDIDATE·CLASSIFICATION_RECONCILIATION·CLASSIFICATION_EVIDENCE·CLASSIFICATION_AUDIT_EVENT.
**현행 실체**: Provider Type Mapping(group_type)·Accounting Nature(Pnl)·Flow(SupplyChain/channel_orders) = 참조 재사용. 나머지 = **신설**.

## 2. Type Registry (§6) · Type Version (§28)

- **Registry(§6)**: rebate_type_id·type_code·type_name·description·**type family·audience classification·default business model/transaction flow/timing/claim model/settlement method/accounting nature·parent type·mutual exclusivity group·deprecated·replacement type**·valid from/to·version·status·owner·evidence.
- **Version(§28)**: rebate type version id·type·previous version·**changed definition/parent type/exclusivity/default classifications·effective from/to·migration policy·affected programs·reporting impact**·actor·approval·evidence. **★§4.6 Historical Classification 덮어쓰기 금지(Version/Validity 보존)**.

## 3. Primary Type (§7, 60+) · Family (§8, 17)

**Consumer/Customer(13)**: CONSUMER/CUSTOMER_REBATE·MAIL_IN/DIGITAL_CLAIM_REBATE·**INSTANT/DELAYED_REBATE**·PRODUCT/SERVICE/SUBSCRIPTION/RENEWAL/TRADE_IN/ENERGY_EFFICIENCY/PRICE_PROTECTION_REBATE.
**Commercial/B2B(15)**: B2B/CONTRACT/**VOLUME/GROWTH/TIER**/PERFORMANCE/LOYALTY/RETENTION/RENEWAL_B2B/MIX/PRODUCT_MIX/MARKET_SHARE/TARGET_ACHIEVEMENT/TURNOVER/MARGIN_REBATE.
**Channel/Supply Chain(10)**: MANUFACTURER/VENDOR/SUPPLIER/DISTRIBUTOR/DEALER/RESELLER/RETAILER/SELLER/CHANNEL/MARKETPLACE_REBATE.
**Trade Promotion/Allowance(17)**: **SCAN_BACK·SHIP_AND_DEBIT·CHARGEBACK_REBATE·BILL_BACK·OFF/POST_INVOICE_ALLOWANCE**·PROMOTIONAL/LISTING/SLOTTING/DISPLAY/ADVERTISING_ALLOWANCE·**COOP_MARKETING·MDF·MARKET_DEVELOPMENT_FUND**·DEMO/INVENTORY/STOCK_ROTATION_ALLOWANCE.
**Other(10)**: TAX/GOVERNMENT/UTILITY/LOGISTICS/FREIGHT/SERVICE_LEVEL/SLA/REFUND_LINKED/CUSTOM_REBATE·OTHER·UNKNOWN.
**Family(§8)**: CONSUMER·CUSTOMER·COMMERCIAL·CONTRACTUAL·SALES_PERFORMANCE·CHANNEL·SUPPLY_CHAIN·TRADE_PROMOTION·MARKETING_FUND·PRICE_ADJUSTMENT·SERVICE·SUBSCRIPTION·LOGISTICS·GOVERNMENT·TAX·CUSTOM·UNKNOWN.
→ 전부 신설. **현행 실 rebate type 없음**·group_type(채널 분류)≠rebate type(오혼입 금지).

## 4. Audience (§9, 19) · Sponsor (§10, 15) · Business Model (§11, 18)

- **Audience(§9)**: END_CONSUMER·INDIVIDUAL/BUSINESS/ENTERPRISE_CUSTOMER·DISTRIBUTOR·WHOLESALER·DEALER·RESELLER·RETAILER·SELLER·VENDOR·SUPPLIER·PARTNER·AFFILIATE·EMPLOYEE·GOVERNMENT_ENTITY·ORGANIZATION·MULTI_PARTY·OTHER. 필드: classification id·program·**audience type·primary·participant/beneficiary/claimant/account/contract requirement**·valid from/to·evidence.
- **Sponsor(§10)**: MANUFACTURER·BRAND·MERCHANT·RETAILER·VENDOR·SUPPLIER·DISTRIBUTOR·MARKETPLACE·PLATFORM·PARTNER·GOVERNMENT·UTILITY_PROVIDER·LEGAL_ENTITY·MULTIPLE_SPONSORS·OTHER. **★Sponsor Type≠Funding Allocation(비용 책임=4-5-3-1-3)**.
- **Business Model(§11)**: DIRECT_TO_CONSUMER·B2B·B2C·MANUFACTURER_TO_CONSUMER/RETAILER/DISTRIBUTOR·VENDOR_TO_CUSTOMER·SUPPLIER_TO_BUYER·DISTRIBUTOR_TO_DEALER·PLATFORM_TO_SELLER·MARKETPLACE_TO_MERCHANT·PARTNER_TO_CUSTOMER·MULTI_PARTY_SPONSORED·CONTRACTUAL_ALLOWANCE·TRADE_PROMOTION·CHANNEL_INCENTIVE·GOVERNMENT_SPONSORED·CUSTOM. 필드: business_model_id·model code·**source/target/economic beneficiary/claimant/settlement counterparty role·direct/indirect·contractual**·valid from/to·evidence.
→ 신설. Part 4-5-1-3 Identity·Referral·PartnerPortal 역할 재사용.

## 5. Transaction Flow (§12) · Timing (§13) · Calculation Basis/Structure (§14·§15)

- **Flow(§12, 20)**: **SELL_IN·SELL_THROUGH·SELL_OUT**·PURCHASE·RESALE·CONSUMPTION·SUBSCRIPTION_START/RENEWAL·SERVICE_DELIVERY·INVOICE·PAYMENT·SHIPMENT·RECEIPT·POS_SCAN·INVENTORY_MOVEMENT·USAGE·CLAIM_SUBMISSION·CONTRACT_PERFORMANCE·MULTI_STAGE·CUSTOM. **SELL_IN=제조사/공급자→유통사/리셀러·SELL_THROUGH=채널 재고 다음 단계·SELL_OUT=리셀러→최종고객**. **실 Source Object와 Flow Type 별도 연결**. → **현행 재사용**: SupplyChain(sell-in)·channel_orders/kr_settlement_line(sell-out).
- **Timing(§13, 16)**: INSTANT·TRANSACTION_TIME·POST_TRANSACTION·DELAYED·PERIOD/MONTH/QUARTER/YEAR/CONTRACT_END·MILESTONE/CLAIM_APPROVAL/SETTLEMENT_BASED·**RETROSPECTIVE·PROSPECTIVE**·HYBRID·MANUAL. **PROSPECTIVE=거래 전/시 기준 확정·RETROSPECTIVE=기간 실적/사후 조건 과거 재계산**.
- **Calculation Basis(§14, 33)**: UNIT/PURCHASE/SALES_QUANTITY·PURCHASE/SALES_AMOUNT·NET/GROSS_REVENUE·NET_PAID·INVOICE_AMOUNT·MARGIN·GROSS_MARGIN·PROFIT·VOLUME·GROWTH_RATE·ABSOLUTE_GROWTH·MARKET_SHARE·TARGET_ACHIEVEMENT·PRODUCT/CATEGORY_MIX·CUSTOMER/ORDER/RENEWAL_COUNT·CONTRACT_VALUE·USAGE·SERVICE_LEVEL·SLA·INVENTORY·POS_SCAN·SHIPMENT·CLAIM_AMOUNT·FIXED_AMOUNT·CUSTOM. **★계산식 대신하지 않음(§4.4)**. → Mmm/Rollup/Pnl(revenue/margin/volume/growth) 재사용.
- **Structure(§15, 18)**: FIXED_AMOUNT·PERCENTAGE·PER_UNIT·PER_TRANSACTION·**TIERED·STEPPED·PROGRESSIVE·RETROACTIVE_TIER·NON_RETROACTIVE_TIER·VOLUME_BAND·GROWTH_BAND·CLIFF_THRESHOLD**·LINEAR·FORMULA_BASED·MATRIX·MULTI_DIMENSIONAL·MANUAL·CUSTOM.

## 6. Claim Model (§16) · Requirement (§17) · Settlement Method (§18) · Timing (§19)

- **Claim Model(§16, 19)**: NO_CLAIM_REQUIRED·AUTOMATIC_SYSTEM_CLAIM·CUSTOMER/MERCHANT/SELLER/DISTRIBUTOR/PARTNER/AUTHORIZED_AGENT_SUBMITTED·BATCH_CLAIM·PERIODIC_STATEMENT_CLAIM·INVOICE_BASED·POS/SHIPMENT_DATA_BASED·PROOF_OF_PURCHASE/PERFORMANCE_REQUIRED·CONTRACT_CERTIFICATION_REQUIRED·MANUAL_INTERNAL_CLAIM·HYBRID·CUSTOM.
- **Requirement(§17, 21)**: NONE·RECEIPT·INVOICE·ORDER_CONFIRMATION·PAYMENT_PROOF·SERIAL_NUMBER·PRODUCT_CODE·BARCODE·WARRANTY_REGISTRATION·CUSTOMER/BUSINESS_IDENTITY·CONTRACT_REFERENCE·SALES/POS/INVENTORY/SHIPMENT/PERFORMANCE_REPORT·MARKETING_PROOF·APPROVAL/TAX_DOCUMENT·CUSTOM. **상세 Claim Evidence Lifecycle=후속**.
- **Settlement Method(§18, 22)**: CASH_PAYOUT·BANK_TRANSFER·PAYMENT_PROVIDER_PAYOUT·DIGITAL_WALLET·CHECK·PREPAID/GIFT_CARD·STORE/ACCOUNT/INVOICE_CREDIT·INVOICE_OFFSET·**CREDIT_MEMO·DEBIT_MEMO·AP_OFFSET·AR_OFFSET**·NEXT_ORDER_DISCOUNT·CONTRACT_SETTLEMENT·INTERNAL_LEDGER·PRODUCT_FULFILLMENT·SERVICE_CREDIT·MIXED·CUSTOM. Timing(§19, 14): IMMEDIATE·PER_TRANSACTION·DAILY/WEEKLY/MONTHLY/QUARTERLY/ANNUALLY·CLAIM_APPROVAL·PERIOD/CONTRACT_CLOSE·THRESHOLD_REACHED·ON_DEMAND·MANUAL·CUSTOM.

## 7. Accounting Nature (§20) · Commercial Purpose (§21) · Instrument Boundary (§22)

- **Accounting Nature(§20, 21)**: PRICE_REDUCTION·PURCHASE/SALES_PRICE_ADJUSTMENT·**CONTRA_REVENUE**·MARKETING/SALES_INCENTIVE/TRADE_PROMOTION_EXPENSE·COST_OF_REVENUE·COST_OF_GOODS_ADJUSTMENT·VENDOR_RECEIVABLE·CUSTOMER/PARTNER_PAYABLE·ACCRUED/DEFERRED_LIABILITY·CREDIT_MEMO_RECEIVABLE·DEBIT_MEMO_PAYABLE·OTHER_INCOME·EXPENSE_REIMBURSEMENT·GOVERNMENT_GRANT·TAX_CREDIT·CUSTOM. **★최종 회계=법인/국가/ERP 정책·Classification Reference로만**. → **현행 재사용**: Pnl(contra-revenue via coupon/point 차감·marketing/commission expense·COGS).
- **Purpose(§21, 25)**: CUSTOMER_ACQUISITION/RETENTION·REACTIVATION·PURCHASE_INCENTIVE·VOLUME/REVENUE/MARKET_SHARE_GROWTH·PRODUCT_MIX_IMPROVEMENT·NEW_PRODUCT_LAUNCH·CHANNEL_EXPANSION·INVENTORY_REDUCTION/ROTATION·PRICE/MARGIN/PROMOTIONAL/ADVERTISING/SELL_THROUGH_SUPPORT·DEALER/PARTNER_PERFORMANCE·CONTRACT_COMPLIANCE·SERVICE_LEVEL_COMPENSATION·SUBSCRIPTION_RENEWAL·GOVERNMENT_POLICY·ENERGY_EFFICIENCY·CUSTOM.
- **★Instrument Boundary(§22)**: **Discount**(결제 전 가격 직접 감소·coupon)·**Cashback**(거래 후 Reward Account 적립·부재)·**Refund**(원 거래 금액 반환·역분개)·**Commission**(판매/추천/성과 보상·마켓 수수료)·**Rebate**(계약/구매/실적/Claim/기간 조건 사후 가격/비용 조정·환급)·**Marketing Fund**(Marketing Activity 재원·MDF)·**Expense Reimbursement**(증빙 기반 실비 상환). **★모호 시 단일 Type 자동 확정 금지→HYBRID/MANUAL_REVIEW**.

## 8. Type Matrix (§45) · Business Model Matrix (§46) — 현행

| Program | Primary Type | Type Family | Secondary Types | Audience | Sponsor | Flow | Timing | Claim | Settlement |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate) | — | — | — | — | — | — | — | — | — |
| — | **전부 NOT_APPLICABLE(신설)** | | | | | 인접: SupplyChain(sell-in)·channel_orders(sell-out) | | | 인접: Credit Memo=Pnl 차감 |

| Program | Source Party | Target Party | Beneficiary | Claimant | Settlement Counterparty | Direct·Indirect | Contractual | Status |
|---|---|---|---|---|---|---|---|---|
| (Rebate Business Model) | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
