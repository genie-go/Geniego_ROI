# CANONICAL DSAR — Monetary Funding & Cost Basis Governance (Funding·Cost·Liability·Margin·ROI·Reconciliation·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-4 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_MONETARY_VALUE_FX_MODEL.md`](CANONICAL_DSAR_MONETARY_VALUE_FX_MODEL.md)(Amount/Value Type/Currency/FX) + 본 문서(Funding/Cost/Governance).
> ADR: [`../architecture/ADR_DSAR_MONETARY_REWARD_VALUE_CURRENCY_FUNDING.md`](../architecture/ADR_DSAR_MONETARY_REWARD_VALUE_CURRENCY_FUNDING.md).

---

## 1. Funding Party (§17) · Agreement (§18) · Allocation (§19) ★합계 검증

- **Funding Party(§17, 14)**: PLATFORM·MERCHANT·BRAND·SELLER·VENDOR·PARTNER·MANUFACTURER·AFFILIATE_NETWORK·MARKETPLACE·LEGAL_ENTITY·CAMPAIGN_BUDGET·LOYALTY_BUDGET·SUBSCRIPTION_PROVIDER·OTHER. **각 Funding Party를 Canonical Person/Organization 연결(Part 4-5-1-3)**.
- **Funding Agreement(§18)**: funding agreement reference id·funding parties·reward program·**contract reference·funding model·allocation rule·currency·maximum amount·effective from/to·settlement/liability/tax responsibility·approval reference**·status·evidence. 계약 원문 전체 복제 금지.
- **Funding Allocation(§19)**: funding allocation id·monetary reward·funding party·funding agreement·**allocation method·allocation percentage·allocated face/payable/paid value·allocated cost·allocated liability·currency**·valid from/to·status·evidence. Method(11): FIXED_PERCENTAGE·FIXED_AMOUNT·TIERED·RESIDUAL·PRIORITY·CONTRACT_BASED·ACTUAL_COST_BASED·REVENUE_SHARE_BASED·MARGIN_BASED·MANUAL·CUSTOM. **★Allocation 총합=100% 또는 전체 금액 일치 검증(§37 Over/Under 100% 차단)·§4.5 Funding≠Cost**.
**현행**: Reward Funding 개념 부재·신설. **인접**: Referral=platform-funded(GeniegoROI 자체)·kr_settlement_line 이중차감(vat/coupon/point 제외)·마켓 수수료=테넌트 부담. **★동일 비용 다중 Funding Party 중복 배정=Critical Gap(§35)**.

## 2. Cost Basis (§20) · Cost Model (§21) · Cost Component (§22) ★Face≠Cost

- **Cost Basis(§20)**: cost_basis_id·monetary reward·**cost model·base/variable/fixed cost·fulfillment/shipping cost·provider/payment/settlement/payout fee·tax cost·partner cost·customer service cost·fraud loss·breakage adjustment·currency**·calculated_at·model version·source·evidence.
- **Cost Model(§21, 13)**: FACE_VALUE·ACTUAL_PAYOUT·ACTUAL_FULFILLMENT_COST·STANDARD_COST·MARGINAL_COST·CONTRACT_COST·PARTNER_SETTLEMENT_COST·COST_OF_GOODS·SHIPPING_COST·SERVICE_COST·BLENDED_COST·ESTIMATED_COST·CUSTOM.
- **Cost Component(§22)**: cost component id·cost basis·**component type·amount·currency·source·allocation reference·incurred_at·recognized_at**·status·evidence. Type(15): REWARD_VALUE·PRODUCT_COST·SHIPPING·SERVICE·PROVIDER_FEE·PAYMENT_FEE·PAYOUT_FEE·SETTLEMENT_FEE·PARTNER_FEE·TAX·WITHHOLDING·CUSTOMER_SUPPORT·FRAUD_LOSS·FX_GAIN_LOSS·OTHER.
**★§4.6 Face Value≠Cost Basis(무료배송 10,000원 상당·실제 원가 3,200원)**. **현행 인접**: `Pnl` **COGS(WAC·OrderHub::aggregateCogs SSOT)**·PG/마켓 fee(pg_settlement.fee·kr_settlement_line.platform_fee/payment)=Cost Component 실 데이터원(주문 단위). Reward 단위 Cost Basis=신설(COGS/fee SSOT 재사용).

## 3. Margin (§23) · Incremental Revenue (§24) · ROI (§25) — Reference Contract

- **Margin Impact(§23)**: margin impact id·monetary reward·order/invoice·**gross revenue·discount impact·reward cost·fulfillment cost·commission cost·payment fee·tax impact·gross margin before/after reward·margin delta·currency**·calculated_at·model version·evidence. → **현행 인접**: `Pnl` grossProfit=revenue−cogs·netProfit(광고비·수수료·쿠폰·인플루언서 차감)=Margin 실 인접(주문/기간 단위). Reward 단위 신설.
- **Incremental Revenue Reference(§24)**: incremental revenue reference id·monetary reward·campaign·experiment·holdout·subject·**measurement window·baseline/observed/incremental revenue·confidence interval reference·attribution model reference**·calculated_at·evidence. **상세 Attribution Engine 아닌 Reference Contract**. → **현행 인접**: `Mmm`(frontier)·`AttributionEngine`(markov incremental)·holdout(Part 282). Reward 단위 Reference=신설(연결).
- **ROI Reference(§25)**: ROI reference id·monetary reward·program·campaign·subject segment·incremental revenue reference·**total reward/funding/fulfillment/settlement cost·gross profit impact·net incremental value·ROI ratio·payback period**·calculated_at·model version·evidence. → `Mmm`(roi·payback) 인접·후속 Analytics/Attribution 연결.

## 4. Refund/Reversal FX (§26) · Clawback FX (§27) · Budget (§28) · Liability Currency (§29)

- **Refund/Reversal FX(§26)**: Original Transaction Rate 유지·Refund Date Rate·Settlement Provider Rate·Contract Rate·Accounting Revaluation 별도 — **정책 Version 관리·Transaction별 실제 적용 정책 기록**.
- **Clawback FX(§27)**: Original Reward/Paid Currency·Recovery Currency·**Original/Recovery Rate·Recovered/Remaining Amount·FX Difference·Accounting Treatment**·evidence.
- **Budget(§28)**: Budget/Reward/Commitment/Settlement/Accounting Currency·FX Reserve·Budget Consumed/Remaining·Overrun·FX Impact.
- **Liability Currency(§29)**: Original/Functional/Accounting Currency·**Booked/Revalued Rate·Original/Revalued Liability·FX Gain·Loss·Accounting Period**·evidence.
→ 전부 부재·신설(Reward outbound Refund/Clawback/Budget/Liability 부재). **★§4.8 Negative Amount 의미 명시(Reversal/Clawback/Refund/FX Loss/Adjustment/Correction — 부호만으로 추론 금지)**.

## 5. Value Relationship Graph (§30)

Monetary Reward → Value Breakdown → Monetary Amount → {Currency Profile·FX Conversion → FX Rate Version} · Monetary Reward → Funding Allocation → {Funding Party·Funding Agreement} · Monetary Reward → Cost Basis → Cost Component · Monetary Reward → {Liability·Accounting Reference·Margin Impact·Incremental Revenue Reference·ROI Reference} · {Settlement·Payout·Refund·Reversal·Clawback} → FX Conversion.
**현행 실선**: Reward → (외부매출) fxToKrw → KRW · Order → COGS(WAC) → Pnl netProfit · Mmm/Attribution → ROI/incremental. Reward 단위 Value Graph=신설.

## 6. Reconciliation (§31·§32) · Coverage (§33) · Gap (§34·§35)

- **Reconciliation(§31)**: Face↔Calculated·Calculated↔Accrued·Accrued↔Approved·Approved↔Available·Available↔Payable·Payable↔Settled·Settled↔Paid·Paid↔Payout Provider·**Funding Allocation Total↔Reward Value·Funded↔Actual Cost·Liability↔Outstanding Reward·Accounting↔ERP·FX Conversion↔Provider Settlement·Refund↔Reversal·Clawback↔Recovery·Budget Consumed↔Issued·Reward Cost↔Margin Impact·Incremental Revenue↔ROI**. 상태(20): MATCH·FACE_CALCULATION/ACCRUAL/APPROVAL/PAYABLE/SETTLEMENT/PAYOUT_MISMATCH·FUNDING_ALLOCATION/COST_BASIS/LIABILITY/ACCOUNTING_VALUE_MISMATCH·FX_RATE/FX_ROUNDING_MISMATCH·REFUND_FX/CLAWBACK_FX_MISMATCH·BUDGET/MARGIN/ROI_REFERENCE_MISMATCH·MANUAL_REVIEW·BLOCKED.
- **Coverage(§33, 21)**: Monetary Amount·Currency·Precision·Rounding·Value Type·Value Breakdown·FX Rate·FX Version·FX Conversion·Revaluation·Funding Party·Funding Agreement·Funding Allocation·Cost Basis·Cost Component·Liability·Accounting Value·Margin Impact·Incremental Revenue Reference·ROI Reference·Evidence.
- **Gap(§34, 24)**: MONETARY_AMOUNT_CURRENCY_MISSING·PRECISION_UNKNOWN·ROUNDING_POLICY_MISSING·VALUE_TYPE/VALUE_BREAKDOWN 누락·**FX_RATE/FX_RATE_VERSION/FX_RATE_SOURCE/FX_CONVERSION_HISTORY/FX_REVALUATION 누락**·FUNDING_PARTY_UNRESOLVED·FUNDING_AGREEMENT_MISSING·**FUNDING_ALLOCATION_INCOMPLETE·FUNDING_ALLOCATION_TOTAL_MISMATCH**·COST_BASIS/COST_COMPONENT 누락·LIABILITY/ACCOUNTING_VALUE 누락·REFUND_FX/CLAWBACK_FX_POLICY_UNKNOWN·MARGIN_IMPACT/INCREMENTAL_REVENUE/ROI_REFERENCE 누락·PROVIDER_INTERNAL_VALUE_DRIFT.
- **Critical Gap(§35)**: **Currency 없는 Amount·잘못된 Currency Settlement·Historical FX Rate 누락·현재 환율로 과거 지급액 덮어쓰기·Funding Allocation 총합 불일치·동일 비용 다중 Funding 중복 배정·Face Value를 실제 Cost로 처리·Liability↔Paid 불일치·지급액↔Payout Provider 불일치·Refund/Clawback FX 정책 미정의·Zero-decimal Precision 오류·Floating Point 계산·Accounting↔ERP 불일치·Budget Currency Conversion 누락·FX Gain/Loss 미반영·Wrong Legal Entity Accounting Currency**.
**현행 정직 GAP**: **①float 계산(§4.10 위반) ②per-transaction FX rate version/timestamp 미보존(Historical FX) ③precision/rounding/zero-decimal Registry 부재 ④Funding Allocation/Cost Basis(Reward 단위)/Liability/Accounting/Revaluation 부재**. Reward Value 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지). Critical Gap 시 Access Review 차단.

## 7. Static Lint (§36) · Runtime Guard (§37)

**Lint(§36)**: **Currency 없는 Amount·Float/Double 금액 계산·Precision 없는 Currency·Rounding Policy 없는 계산·Value Type 없는 Amount·Face Value↔Paid Value 혼용·Funding↔Cost 혼용·Liability↔Expense 혼용·FX Rate Version 누락·Original Amount 덮어쓰기·Funding Allocation 합계 검증 누락·Refund/Clawback FX 정책 누락·Zero-decimal Currency 오처리·Negative Amount 의미 미정의·Accounting Currency 없는 Entry·기존 Money/Currency/FX 모델 중복 생성·Evidence 없는 FX Conversion**.
**Guard(§37)**: Unsupported/Precision Mismatch Currency·Invalid Rounding·**Missing/Expired/Wrong Type FX Rate·Wrong Legal Entity Currency·Funding Over/Under 100%·Duplicate Funding·Negative Cost 위반·Budget Overrun·Liability Negative·Payout/Settlement/Accounting Currency Mismatch·Critical Value Drift·Kill Switch**.
**현행 실증/GAP**: fxToKrw 미상통화 무변환(정직)·app_setting 24h TTL(stale 경고 가능)이나 **float 계산·rate version 미보존은 §36 Lint의 현행 위반=우선 시정 대상**(Reward 엔진 도입 시).

## 8. Error (§38) · Warning (§39)

**Error(23)**: MONETARY_CURRENCY_REQUIRED·_CURRENCY_UNSUPPORTED·_PRECISION_INVALID·_ROUNDING_POLICY_MISSING·_VALUE_TYPE_REQUIRED·_VALUE_BREAKDOWN_INCOMPLETE·**_FX_RATE_NOT_FOUND·_FX_RATE_VERSION_MISSING·_FX_RATE_EXPIRED·_FX_CONVERSION_FAILED·_FX_REVALUATION_FAILED**·_FUNDING_PARTY_UNRESOLVED·_FUNDING_AGREEMENT_MISSING·**_FUNDING_ALLOCATION_MISMATCH·_DUPLICATE_FUNDING**·_COST_BASIS_MISSING·_LIABILITY_VALUE_MISMATCH·_ACCOUNTING_VALUE_MISMATCH·_REFUND_FX/_CLAWBACK_FX_POLICY_MISSING·_MARGIN_IMPACT_MISSING·_VALUE_RECONCILIATION_FAILED·_VALUE_RUNTIME_BLOCKED.
**Warning(13)**: _ESTIMATED_VALUE·_ROUNDING_DIFFERENCE·_FX_STALE·_FX_SOURCE·_FX_REVALUATION·_FUNDING·_COST_ESTIMATE·_LIABILITY·_ACCOUNTING·_MARGIN·_ROI_REFERENCE_WARNING·_PROVIDER_INTERNAL_VALUE_DRIFT·_VALUE_MANUAL_REVIEW_REQUIRED.

## 9. Golden Value Dataset (§40) · Conformance (§41) · Legacy Equivalence (§42)

**Golden(§40)**: Currency/Precision(KRW/USD/EUR/JPY/GBP·**Zero-decimal·2/3-decimal·Unsupported·Precision Mismatch·Float 차단**) · Value Lifecycle(Face/Estimated/Accrued/Approved/Available/Payable/Settled/Paid/Liability/Written-off·**Face≠Paid 정상**) · FX(USD→KRW·EUR→USD·JPY→KRW·Display/Settlement/Payout/Accounting Conversion·**Historical FX Version·Missing/Expired FX 차단·Rounding Difference·Gain/Loss·Revaluation**) · Funding(Platform/Merchant/Partner 100%·Split·3-party·**100% 초과/미만 차단·Duplicate 차단**·Contract-based) · Cost(Face Value/Actual Payout/Free Shipping 실원가/Free Product/Provider/Payout/Partner Fee/Fulfillment/Tax/Fraud Loss/Estimated/Actual) · Refund/Clawback(Original/Refund Date Rate·Partial·Full Reversal·다른 Currency·Negative Carry-forward·FX Difference) · Financial(Liability Calc/Revaluation·Budget Conversion·Margin Before/After·Incremental Revenue/ROI Reference·Accounting Match/Mismatch).
**실 회귀 시드**: fxToKrw 24통화·미상통화 무변환·krwToCurrency 리포팅·Pnl COGS/netProfit·Mmm roi — 즉시 Golden 등록 가능(단 float→Decimal 시정 전제).
**Conformance(§41)**: Cashback/Rebate/Refund Incentive/Affiliate/Referral/Creator/Marketplace Commission/Revenue Share/Wallet/Store Credit/Settlement/Payout/Clawback/Liability에 동일 Contract(Amount·Currency·Precision·Rounding·Value Type·FX Rate·FX Version·Funding·Cost Basis·Liability·Accounting·Margin·Reconciliation·Evidence·Audit).
**Legacy Equivalence(§42)**: 기존 금액/환율(fxToKrw)/Funding/Cost(Pnl COGS)/Settlement/Paid/Refund/Liability/Margin과 Amount·Currency·FX Rate·Converted Amount·Cost Basis·Margin Impact·Error·Warning·Latency·Audit 비교. **UNEXPLAINED·잘못된 Currency·Historical FX 누락→전환차단**.

## 10. 기존 구현 분류 (§43) · 중복 감사 (§44)

| 구현 | 분류 | 근거 |
|---|---|---|
| `Connectors::fxToKrw`/`krwToCurrency`/`fxRates`(app_setting.fx_rates_krw+defaults+live) | **VALIDATED_LEGACY(확장·단 float→Decimal 시정)** | FX 변환 실 자산(24통화·KRW base·DB override·live). Canonical FX(rate version/timestamp/type) 확장 |
| `Pnl`(grossProfit·netProfit·COGS WAC) | **VALIDATED_LEGACY(인접·주문 단위)** | Cost/Margin 실 데이터원(COGS·fee). Reward 단위 Cost Basis/Margin 신설 시 SSOT 재사용 |
| `Mmm`(frontier·roi·payback)·`AttributionEngine`(incremental) | **VALIDATED_LEGACY(인접·마케팅 지출 단위)** | ROI/Incremental Revenue 실 인접. Reward 단위 Reference 신설 시 연결 |
| `pg_settlement.fee`/`kr_settlement_line`(platform_fee/payment) | **VALIDATED_LEGACY(Cost Component 데이터원·inbound)** | Provider/Settlement fee 실 데이터 |
| Money VO·Currency Precision/Rounding Registry·FX Rate Version·Funding Party/Agreement/Allocation·Reward Cost Basis·Liability/Accounting/Revaluation·Reward ROI Reference | **UNVERIFIED → NOT_APPLICABLE** | 부재·신설 |

**중복 감사(§44)**: **FX=fxToKrw 단일(중복 금지·확장)**·Currency=DECIMAL+currency 컬럼(Enum 난립 없음)·COGS=OrderHub::aggregateCogs SSOT(divergence 방지)·ROI=Mmm 단일. **★§4.10 Money VO 신설 시 단일·Reward 유형별 독립 환율 계산 금지·기존 FX/COGS/Margin/ROI 재사용**.

## 11. 기능 후퇴 방지 · 검증 게이트 (§50) · 영구 규칙

**후퇴 방지**: fxToKrw/krwToCurrency·app_setting.fx_rates_krw·Pnl COGS/netProfit·Mmm ROI·pg/kr fee·다통화 리포팅 API 보존(회귀 0).
**게이트(§50)**: 모든 Amount Currency·**Decimal/Minor Unit(§4.10)**·Currency Precision Registry·Rounding Policy·Value Type 분리·Face/Accrued/Paid/Cost/Liability 구분·**Original/Converted 보존·Historical FX Version 보존·Settlement/Payout/Accounting FX 분리·FX Revaluation·Gain/Loss**·Funding Party Identity 연결·Funding Agreement·**Funding Allocation 합계 검증**·Cost Basis/Component·Liability/Accounting·Refund/Clawback FX 정책·Budget/Liability Currency·Margin Impact·Incremental Revenue/ROI Reference·Reconciliation·Coverage/Gap/Evidence·Lint/Guard·**기존 Money/Currency/FX 중복 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History.
**영구 규칙(§53)**: 신규 현금성 보상 Value 도입 전 **기존 Money/Currency/FX(fxToKrw)/COGS(Pnl)/ROI(Mmm) 재사용(중복 금지)** · **모든 Amount에 Currency/Precision/Rounding/Value Type 강제·Decimal/Minor Unit(Float 금지)** · **원 통화 보존·Historical FX Version 보존(과거 지급액 현재 환율 재계산 금지)** · Conversion Type 분리(Display/Settlement/Payout/Accounting/Tax/Liability/Refund/Reversal/Clawback) · Revaluation·Gain/Loss · Funding Party Identity 연결·Allocation 합계 검증·Duplicate Funding 금지 · **Face≠Cost·Funding≠Cost·Liability≠Expense** · Refund/Clawback FX 정책 Version · Negative Amount 의미 명시 · Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **Reward 유형별 독립 환율/Cost/ROI 계산 중복 생성 금지.**

## 12. Funding Matrix (§49) — 현행

| Reward | Funding Party | Method | Percentage | Funded Value | Paid Value | Cost | Liability | Agreement | Status |
|---|---|---|---|---|---|---|---|---|---|
| (outbound 현금성 보상) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| Referral 추천보상(인접) | PLATFORM(GeniegoROI 자체) | N/A | 100% | 1개월 PRO 상당 | coupon | 미추적 | 미추적 | N/A | 인접(비현금) |
