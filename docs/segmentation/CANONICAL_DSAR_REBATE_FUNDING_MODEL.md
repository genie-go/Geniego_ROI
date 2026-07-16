# CANONICAL DSAR — Rebate Funding Model (Sponsor·Funding Party·Agreement·Model·Allocation·Shared Funding·Override·Commitment)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-3 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Sponsor/Funding Party/Agreement/Model/Allocation/Commitment) + [`CANONICAL_DSAR_REBATE_RESPONSIBILITY_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_RESPONSIBILITY_GOVERNANCE.md)(Settlement/Payout/Liability/Accounting/Fee/Tax/FX/Recovery Responsibility·Decision·Reconciliation·Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_FUNDING_SPONSOR_RESPONSIBILITY.md`](../architecture/ADR_DSAR_REBATE_FUNDING_SPONSOR_RESPONSIBILITY.md).
> 선행: Rebate Program Master(4-5-3-1-1)·Type/Classification(4-5-3-1-2)·Monetary Funding Foundation(4-5-1-4)·Cashback Budget Reservation(4-5-2-3).
> **범위**: 비용 부담/자금 구조/책임 분리만 — Rule 계산/Eligibility/Claim/Settlement/Payout 실행 아님(후속 4-5-3-1-4~9).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Sponsor / Funding Party / Agreement / Allocation / Responsibility 엔진** | ❌ **부재(grep 0)** — `rebate fund/funding_party/sponsor/liability_owner/cost_center/credit_memo` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Monetary Funding Model (연결)** | △ 4-5-1-4 Funding Party/Agreement/Allocation=전방호환 계약(부재·신설) | **연결(monetary_funding_party/agreement/allocation id)** |
| **Funding Cost 실 사례** | ✅ **REAL** — kr_settlement_line 이중차감(**마켓 수수료=테넌트 부담**)·`Referral` platform-funded(GeniegoROI 자체)·pg_settlement fee | **참조**(Funding cost 실 사례·§4.7 Funding≠Cost) |
| **Budget / Commitment / Reservation 패턴** | ✅ **REAL** — `BillingMethod`(monthly_budget MTD cap·charging 선점·auto_campaign budget SUM)·Cashback Budget Reservation(4-5-2-3) | **재사용**(Commitment/Reservation 패턴·§4.6 Funding≠Budget) |
| **Liability / Accounting Responsibility** | △ `Pnl`(COGS/expense/contra-revenue)·CRM LTV 역분개(Liability 역분개) | **참조(Accounting Nature·법인/국가/ERP)** |
| **FX Responsibility** | ✅ fxToKrw/krwToCurrency(Part 4-5-1-4·rate version GAP) | **재사용** |
| **Sponsor / Funding Party 주체** | ✅ SupplyChain suppliers·PartnerPortal·channel_credential(vendor/merchant)·Referral(platform) | **재사용(주체 Identity·Part 4-5-1-3)** |
| **Recovery Responsibility** | △ OrderHub 역분개·Cashback Recovery(4-5-2-5) | **참조** |
| **Legal Entity / ERP Company / Cost Center / Profit Center** | ❌ **부재**(Part 4-5-1-1) | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Funding/Sponsor/Responsibility 엔진은 부재(NOT_APPLICABLE)**. 실 인접=Monetary Funding Model(4-5-1-4 연결)·Funding cost(kr 이중차감 마켓 수수료·Referral platform-funded)·Budget/Commitment/Reservation(BillingMethod MTD cap·charging 선점)·Liability/Accounting(Pnl·CRM 역분개)·FX(fxToKrw)·주체(SupplyChain/PartnerPortal/channel_credential/Referral). **★핵심 정직: §4.1 Sponsor≠Funding Party·§4.2 Funding Party≠Payer·§4.3 Settlement Party≠Accounting Party(역할 분리)·이번 블록=Funding/Responsibility만(Lifecycle/Rule/Claim/Settlement 실행 후속)**. **기존 Monetary Funding Model/BillingMethod/Pnl/fxToKrw 재사용(중복 금지·§40)**·Legal Entity/ERP/Cost Center 부재(신설)·지어내기·NO_DATA/오탐 금지·본 Funding=멀티테넌트 고객용 미래 rebate 전방호환 계약.

---

## 1. Canonical Entity (24) — §5

REBATE_SPONSOR·FUNDING_PARTY·ECONOMIC_RESPONSIBILITY_ROLE·FUNDING_AGREEMENT_REFERENCE·FUNDING_MODEL·FUNDING_ALLOCATION·SHARED_FUNDING_GROUP·FUNDING_OVERRIDE·FUNDING_COMMITMENT·FUNDING_RESERVATION_REFERENCE·SETTLEMENT/PAYOUT/CLAIM_PROCESSING/LIABILITY/ACCOUNTING/FEE/TAX/FX/RECOVERY_RESPONSIBILITY·FUNDING_DECISION·CANDIDATE·RECONCILIATION·EVIDENCE·AUDIT_EVENT.
**현행 실체**: Funding Party 주체(SupplyChain/channel_credential)·Commitment(BillingMethod)·Accounting(Pnl)·FX(fxToKrw) = 참조 재사용. 나머지 = **신설**.

## 2. Sponsor (§6) · Funding Party (§7) · Economic Responsibility Role (§8) ★역할 분리

- **Sponsor(§6)**: rebate_sponsor_id·program·**sponsor_type·canonical_organization_id·legal_entity_id·provider_account_id·contract_reference·sponsor_role·primary·operational_owner·marketing_owner·customer_facing_owner**·valid from/to·status·version·evidence. Type(15): MANUFACTURER·BRAND·MERCHANT·VENDOR·SUPPLIER·DISTRIBUTOR·RETAILER·MARKETPLACE·PLATFORM·PARTNER·GOVERNMENT·UTILITY_PROVIDER·LEGAL_ENTITY·MULTI_SPONSOR·OTHER.
- **Funding Party(§7)**: rebate_funding_party_id·program·**monetary_funding_party_id**·party_type·canonical_organization_id·legal_entity_id·merchant/vendor/settlement account·accounting_entity_id·contract_reference·funding/liability_currency·active·valid from/to·status·evidence. Type(17): MANUFACTURER·BRAND·PLATFORM·MERCHANT·SELLER·VENDOR·SUPPLIER·DISTRIBUTOR·RETAILER·PARTNER·MARKETPLACE·LEGAL_ENTITY·CAMPAIGN_BUDGET·MARKETING_FUND·GOVERNMENT·UTILITY_PROVIDER·OTHER.
- **Economic Responsibility Role(§8, 26)**: PROGRAM_SPONSOR·CONTRACTUAL/ECONOMIC_FUNDER·BUDGET_OWNER·FUNDING_APPROVER·CLAIM_PROCESSOR/APPROVER·SETTLEMENT_OPERATOR/COUNTERPARTY·PAYOUT_OPERATOR/FUNDER·CREDIT/DEBIT_MEMO_ISSUER·AP/AR_RESPONSIBLE·LIABILITY/EXPENSE_OWNER·TAX/WITHHOLDING_RESPONSIBLE·FX_COST/FEE_OWNER·RECOVERY/DISPUTE/WRITE_OFF_OWNER·DATA_SOURCE/AUDIT_OWNER. **하나의 Party 다중 Role**.
**★§4.1 Sponsor≠Funding Party(기획/소유/홍보≠실제 비용 부담)·§4.2 Funding Party≠Payer(Manufacturer 부담·Distributor Settlement·Platform Payout)·§4.3 Settlement Party≠Accounting Party**. **현행**: Referral=platform sponsor+funder 동일(단순)·마켓 수수료=vendor funder 인접(테넌트 부담). Sponsor/Funding Party/Role Store=신설(Part 4-5-1-3 Identity·SupplyChain/PartnerPortal 재사용).

## 3. Funding Agreement (§9) · Funding Model (§10)

- **Agreement(§9)**: funding_agreement_reference_id·program·**monetary_funding_agreement_reference_id·agreement_type·contract_reference·amendment_reference·participating parties·effective from/to·renewal/termination reference·funding model·allocation method·maximum/minimum commitment·currency·budget reference·settlement/payout/liability/recovery/tax responsibility·approval requirement·source of truth**·status·version·evidence. Type(15): MANUFACTURER/VENDOR/SUPPLIER/DISTRIBUTOR/MERCHANT/PARTNER/MARKETPLACE_AGREEMENT·CUSTOMER_CONTRACT·TRADE_PROMOTION/MDF/COOP_AGREEMENT·GOVERNMENT_PROGRAM·INTERNAL_BUDGET_POLICY·MULTI_PARTY_AGREEMENT·OTHER. **★계약 원문 복제 금지(Authorized Reference·ChannelContract 인접)**.
- **Funding Model(§10, 21)**: SINGLE/MULTI_PARTY_FUNDED·SHARED_PERCENTAGE/FIXED_AMOUNT·TIER/PRODUCT/SKU/CATEGORY/REGION/COUNTRY/CHANNEL/CONTRACT/CLAIM/PERFORMANCE/BUDGET_BASED_FUNDING·RESIDUAL_FUNDING·REIMBURSEMENT_MODEL·ADVANCE/POST_SETTLEMENT_FUNDING·MIXED·MANUAL·CUSTOM. 필드: funding_model_id·program·**model_type·allocation_basis·residual/overfunding/underfunding/rounding/FX policy·override support**·valid from/to·version·status·evidence.
→ 부재·신설. Monetary Funding Agreement/Allocation(4-5-1-4) 연결.

## 4. Funding Allocation (§11) · Scope (§12) · Method (§13) ★Percentage+Amount

- **Allocation(§11)**: funding_allocation_id·program·funding_agreement_reference·funding_party·**allocation_scope·allocation_method·allocation_percentage·fixed_amount·maximum/minimum_amount·allocated estimated/accrued/approved/settled/paid/liability/cost value·currency·FX reference·priority·residual**·valid from/to·status·version·evidence.
- **Scope(§12, 22)**: PROGRAM·REGION·COUNTRY·BRAND·STORE·MERCHANT·SELLER·VENDOR·DISTRIBUTOR·PRODUCT·SKU·CATEGORY·SERVICE·SUBSCRIPTION·CONTRACT·CHANNEL·CUSTOMER_SEGMENT·PARTICIPANT_TYPE·CLAIM_TYPE·SETTLEMENT_METHOD·ACCOUNTING_PERIOD·CUSTOM. **Canonical Entity Reference 연결**.
- **Method(§13, 19)**: FIXED_PERCENTAGE/AMOUNT·EQUAL_SPLIT·PROPORTIONAL_TO_SALES/PURCHASE/MARGIN/VOLUME·TIER/PRODUCT/SKU/CATEGORY/REGION/CONTRACT/CLAIM_BASED·ACTUAL_COST_BASED·RESIDUAL·PRIORITY·MANUAL·CUSTOM.
**★§4.4 Percentage+Amount 둘 다 관리(비율만 저장 금지)·§4.9 현재 Agreement로 과거 거래 덮어쓰기 금지(Validity/Version)·Float 금지(§33·Part 4-5-1-4 Decimal 계승)**. → Monetary Funding Allocation(4-5-1-4) 연결·마켓 수수료 배분 인접.

## 5. Shared Funding (§14) · Override (§15) ★합계 검증

- **Shared Funding Group(§14)**: shared_funding_group_id·program·group_name·**funding parties·allocation method·total percentage·total committed amount·currency·residual party·rounding difference owner·underfunding/overfunding owner**·valid from/to·status·evidence. 검증: 총 비율·총 금액·Residual·Currency·Legal Entity·Agreement Validity.
- **Override(§15)**: funding_override_id·target funding model/allocation·**override scope·override type·original/override value·reason·requested/approved_by·effective from/to·rollback reference**·status·evidence. Type(13): PARTY·PERCENTAGE·FIXED_AMOUNT·CURRENCY·LIABILITY/SETTLEMENT/PAYOUT/FEE/TAX/FX/RECOVERY/RESIDUAL_OWNER·EMERGENCY_DISABLE. **★승인 없는 운영 Override 금지**.
**★§4.5 Shared Funding 합계 검증(Percentage=100% 또는 Amount=Funded·Residual 명시)·§4.10 Double Funding 금지(동일 금액 다중 Party 중복 귀속 금지)**. 현행 Funding Allocation 부재·신설(4-5-1-4 정합).

## 6. Commitment (§16) · Reservation Reference (§17)

- **Commitment(§16)**: funding_commitment_id·program·funding_party·agreement/budget reference·**commitment type·committed/consumed/reserved/remaining amount·currency·commitment period·committed/expires/released_at**·status·evidence. Type(9): PROGRAM/PERIOD/CAMPAIGN/CONTRACT/PRODUCT/CLAIM/SETTLEMENT_COMMITMENT·ADVANCE_FUNDING·OTHER.
- **Reservation Reference(§17)**: reservation_reference_id·program·funding party·commitment·source transaction/claim/accrual·requested/reserved amount·currency·reservation status·reserved/expires/committed/released_at·evidence. **★실행 Entity 신설 대신 기존 Monetary Reservation 연결**.
**★§4.6 Funding≠Budget(Budget=한도·Funding=비용 부담 구조)**. **현행 재사용**: BillingMethod ad_spend_ledger(MTD budget cap·charging 선점·commitment/reservation 패턴)·Cashback Budget Reservation(4-5-2-3). **★Commitment 부족/Reservation 없이 Contract-based Accrual 생성 금지(Enforcement Hook)**.

## 7. Funding Matrix (§43) · Commitment Matrix (§45) — 현행

| Program | Sponsor | Funding Party | Agreement | Method | Percentage | Amount | Currency | Validity | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Funding) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(참조): 추천보상 | PLATFORM(GeniegoROI) | PLATFORM(자체) | N/A | 100% | 100% | 1개월 PRO | N/A | valid_until | 인접 |
| 인접: 마켓 수수료 | N/A | VENDOR(테넌트 부담) | N/A | 요율 | platform_fee율 | kr platform_fee | KRW | 정산기간 | 인접(비용) |

| Program | Party | Budget | Committed | Reserved | Consumed | Remaining | Currency | Expiry | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Commitment) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 인접(재사용): 광고비 | 테넌트 | monthly_budget | 약정 | charging 선점 | charged | remaining | KRW | 월말 | ad_spend_ledger |
