# CANONICAL DSAR — Monetary Reward Value & FX Model (Amount·Value Type·Currency·Precision·Rounding·FX·Revaluation)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-1-4 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Amount/Value Type/Currency/FX) + [`CANONICAL_DSAR_MONETARY_FUNDING_COST_GOVERNANCE.md`](CANONICAL_DSAR_MONETARY_FUNDING_COST_GOVERNANCE.md)(Funding·Cost·Liability·Margin·ROI·Reconciliation·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_MONETARY_REWARD_VALUE_CURRENCY_FUNDING.md`](../architecture/ADR_DSAR_MONETARY_REWARD_VALUE_CURRENCY_FUNDING.md).
> 선행: Identity Governance(4-5-1-3)·Entity Model(4-5-1-2)·Provider Inventory(4-5-1-1)·Reward Governance(4-4).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **FX Conversion 엔진** | ✅ **REAL(가장 강한 자산)** — `Connectors::fxToKrw`/`krwToCurrency`/`fxRateKrwPerUnit`: **24 통화**(KRW internal base·reporting 통화 변환)·`fxRates()`=hardcoded defaults(USD=1350·EUR=1450·JPY=9·VND=0.053·IDR=0.084…) + **`app_setting.fx_rates_krw`(DB override·24h TTL·`fxFetchLive` fallback)** | **VALIDATED_LEGACY(확장)** — Canonical FX Conversion(rate version/timestamp per-transaction·Rate Type) 확장 |
| **Money Value Object** | ❌ **부재** — 금액=**float/DOUBLE + currency 컬럼**(`fxToKrw(float $amount)`). precision/rounding/value type/minor unit 없음 | **NOT_APPLICABLE → 신설** · **★§4.10 Float 금지 위반(현행 float 계산)=GAP** |
| **FX Rate Version / Historical FX** | ❌ **부재** — `app_setting.fx_rates_krw` single-row(24h cache·**current rate만**)·per-transaction rate version/timestamp 미보존 | **부분 REAL(rate store)** · **★§4.4 Historical FX Version 미보존=Critical GAP** |
| **Currency Registry (ISO/Precision/Rounding)** | △ 24 통화 rate 존재·`performance_metrics.currency`(default KRW)·`pg_settlement.currency`·`kr_settlement_line.currency(KRW)` | **부분 REAL** · **ISO numeric/minor unit/precision/rounding/zero-decimal(JPY/KRW) Registry 부재=GAP** |
| **Reporting 통화 다통화** | ✅ **REAL** — `krwToCurrency`(내부 KRW SSOT·표기만 테넌트 통화 변환·P&L 다통화 리포팅) | **VALIDATED_LEGACY** |
| **Cost Basis / Margin** | △ **인접 REAL** — `Pnl`: grossProfit=revenue−cogs·netProfit=netPayout−cogs−adSpend−couponDiscount−influencerCost·**COGS(WAC·OrderHub::aggregateCogs SSOT)** | **VALIDATED_LEGACY(인접·주문 단위)** · Reward 단위 Cost Basis = **NOT_APPLICABLE** |
| **Incremental Revenue / ROI** | △ **인접 REAL** — `Mmm`(profit frontier·roi·payback)·`AttributionEngine`(markov incremental) | **VALIDATED_LEGACY(인접·마케팅 지출 단위)** · Reward 단위 ROI Reference = **NOT_APPLICABLE** |
| **Value Breakdown (Face/Accrued/Approved/Payable/Settled/Paid) — outbound** | ❌ outbound reward 부재(Part 4-5-1-2)·pg net/kr net_payout=inbound 값 | **NOT_APPLICABLE → 신설** |
| **Funding Party / Agreement / Allocation** | ❌ 부재(Reward funding 개념 없음)·kr_settlement_line 이중차감(vat/coupon/point 제외)·Referral platform-funded 인접 | **NOT_APPLICABLE → 신설**(GOVERNANCE 문서) |
| **Liability Currency / Accounting Value / FX Revaluation / Gain·Loss** | ❌ 부재(회계 미연동·재평가 없음) | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **FX 변환은 강한 실 자산**(`fxToKrw` 24 통화·KRW base·app_setting override·live fetch)이나 **①float 계산(§4.10 위반) ②per-transaction rate version/timestamp 미보존(§4.4 Historical FX GAP) ③precision/rounding/zero-decimal Registry 부재**. Cost/Margin(Pnl COGS·netProfit)·ROI(Mmm frontier)는 **주문/마케팅 지출 단위 인접 REAL**(Reward 단위 아님). Value Breakdown(outbound)·Funding Allocation·Liability/Accounting/Revaluation=부재. **★기존 FX/COGS/Margin/ROI 모델 재사용·확장(중복 신설 금지·§44)**·본 Value Model=멀티테넌트 고객용 미래 현금성 보상 Value의 전방호환 계약·지어내기 금지.

---

## 1. Canonical Entity (25) — §5

MONETARY_VALUE_PROFILE·AMOUNT·VALUE_BREAKDOWN·VALUE_TYPE·CURRENCY_PROFILE·CURRENCY_PRECISION·ROUNDING_POLICY·FX_RATE·FX_RATE_VERSION·FX_CONVERSION·FX_REVALUATION·FX_GAIN_LOSS·FUNDING_PARTY·FUNDING_AGREEMENT_REFERENCE·FUNDING_ALLOCATION·COST_BASIS·COST_COMPONENT·MARGIN_IMPACT·INCREMENTAL_REVENUE_REFERENCE·ROI_REFERENCE·VALUE_RECONCILIATION·VALUE_COVERAGE·VALUE_GAP·VALUE_EVIDENCE·VALUE_AUDIT_EVENT.
**현행 실체**: FX_RATE/CONVERSION(fxToKrw·app_setting·확장)·CURRENCY_PROFILE(부분)·COST_BASIS/MARGIN(Pnl 인접)·ROI(Mmm 인접) = REAL. 나머지 = **신설**.

## 2. Value Profile (§6) · Monetary Amount (§7) ★Decimal/Minor Unit

- **Value Profile(§6)**: monetary_value_profile_id·provider/account/program/reward account id·tenant·brand·legal_entity·environment·**reward/settlement/payout/accounting currency·customer display currencies·FX provider·FX rate type·precision/rounding/funding/cost basis/liability/tax model·revaluation policy·source of truth**·version·status·owner·evidence. → 부재·신설. 현행=KRW internal base·app_setting FX·Pnl 다통화 리포팅.
- **Amount(§7)**: monetary_amount_id·**amount_minor_units·decimal_amount·currency_code·precision·rounding_mode·value_type**·original/converted amount reference·FX conversion reference·effective_at·calculated_at·source·source version·status·evidence. **★§4.1 Currency 강제·§4.10 Float 금지(Decimal/Minor Unit)·Minor Unit↔Decimal 일관성 검증**. → **현행 float(fxToKrw)=§4.10 위반=핵심 GAP**·Money VO 신설(Decimal/Minor Unit).

## 3. Value Type (§8) · Value Breakdown (§9)

- **Value Type(28)**: FACE·DISPLAY·ESTIMATED·CALCULATED·ACCRUED·PENDING·APPROVED·AVAILABLE·RESERVED·PAYABLE·SETTLED·PAID·FUNDED·COST·FULFILLMENT_COST·FEE·TAXABLE·WITHHOLDING·LIABILITY·ACCOUNTING·REFUND·REVERSAL·CLAWBACK·EXPIRED·WRITTEN_OFF·INCREMENTAL_REVENUE·MARGIN_IMPACT·ROI_VALUE. **★§4.2 표시 가치≠실제 지급(최대10달러/적립7.35/승인7/지급6.8/수수료0.2 별도)**.
- **Value Breakdown(§9)**: value_breakdown_id·monetary reward id·face/display/estimated/calculated/accrued/approved/available/reserved/payable/settled/paid/funded/liability/cost/taxable/withholding/fee value·currency references·calculated_at·version·evidence.
→ outbound reward Value Breakdown 부재·신설. 현행 pg net/kr net_payout=inbound settled 값(참조).

## 4. Currency Profile (§10) · Precision · Rounding Policy (§11)

- **Currency Profile(§10)**: **ISO 4217 code·numeric code·minor unit·decimal precision·symbol·zero-decimal 여부·rounding increment·cash/accounting/payout/tax rounding rule**·active from/to·status·version·evidence. → 현행 24 통화 rate만·**ISO numeric/minor unit/precision/rounding Registry 부재=GAP**.
- **Rounding Policy(§11)**: HALF_UP·HALF_DOWN·HALF_EVEN·FLOOR·CEILING·DOWN·UP·TRUNCATE·CASH_ROUNDING·PROVIDER_DEFINED·LEGAL_ENTITY_DEFINED·CUSTOM. 각 계산 단계 Rounding 기록. → 현행 float 반올림 암묵·정책 미기록=GAP.
- **★§4.9 Zero-decimal Currency(JPY/KRW)=일반 통화처럼 처리 금지·Registry 관리**. 현행 JPY/KRW rate 있으나 minor unit 정책 부재.

## 5. FX Rate (§12) · Rate Version (§13) · Conversion (§14) ★Historical 보존

- **FX Rate(§12)**: FX rate id·source/target currency·**rate·inverse rate·rate type·provider·provider account·region·rate timestamp·valid from/to·published_at·received_at·version**·status·evidence. Rate Type(11): SPOT·DAILY_CLOSE·DAILY_AVERAGE·MONTHLY_AVERAGE·SETTLEMENT_RATE·PAYOUT_RATE·ACCOUNTING_RATE·TAX_RATE·CONTRACT_RATE·PROVIDER_RATE·CUSTOM. → **현행 `app_setting.fx_rates_krw`(single-row·24h·current rate)+hardcoded defaults=Rate Store 부분**·Rate Type/version/timestamp 미분리=GAP.
- **Rate Version(§13)**: FX rate version id·FX rate id·previous version·source data·changed rate·**corrected·effective time·publication time·applied transactions·revaluation required**·actor·reason·evidence. **★과거 Transaction이 새 Rate로 자동 덮어써지지 않게**. → **현행 rate version 부재=Critical GAP**.
- **FX Conversion(§14)**: FX conversion id·source/target monetary amount·source/target currency·**FX rate id·FX rate version·conversion type·rate timestamp·pre-round amount·rounded amount·rounding difference**·converted_at·status·evidence. Conversion Type(13): CUSTOMER_DISPLAY·REWARD_CALCULATION·FUNDING_ALLOCATION·SETTLEMENT·PAYOUT·ACCOUNTING·TAX·LIABILITY·REFUND·REVERSAL·CLAWBACK·BUDGET·REPORTING. **★§4.3 원 통화·환산 통화 모두 보존(덮어쓰기 금지)**. → **현행 fxToKrw/krwToCurrency=CUSTOMER_DISPLAY/REPORTING conversion 실 구현**·per-conversion rate version/rounding difference 미보존=GAP·conversion type 미분리.

## 6. FX Revaluation (§15) · Gain·Loss (§16)

- **Revaluation(§15)**: revaluation id·source balance·original/new FX rate·original/revalued accounting value·**gain·loss·accounting period**·revalued_at·policy·status·evidence. **★이미 지급 완료 Reward 임의 재평가 금지**.
- **Gain·Loss(§16)**: FX gain loss id·source transaction/settlement/payout·source/target currency·**booked rate·actual rate·booked/actual amount·gain/loss amount·accounting reference·recognized_at**·status·evidence.
→ 부재·신설(미지급 Liability/Settlement 잔액 재평가). 현행 KRW base 단일·재평가 없음.

## 7. Value Matrix (§47) · FX Matrix (§48) — 현행 실측

| Reward | Face | Accrued | Approved | Available | Payable | Settled | Paid | Cost | Liability | Currency |
|---|---|---|---|---|---|---|---|---|---|---|
| (outbound 현금성 보상) | — | — | — | — | — | — | — | — | — | **N/A(신설)** |
| pg/kr 정산(inbound·참조) | gross | N/A | N/A | N/A | N/A | net/net_payout | net | Pnl COGS(주문) | N/A | ✅컬럼 |

| Transaction | Source Cur | Source Amt | Target Cur | Converted Amt | Rate Type | Rate Version | Rounding | Gain·Loss | Status |
|---|---|---|---|---|---|---|---|---|---|
| Reporting 변환(krwToCurrency) | KRW | ✅ | 테넌트 통화 | ✅ | app_setting/hardcoded | **미보존(GAP)** | float(암묵) | N/A | REAL(부분) |
| 외부 매출 KRW 변환(fxToKrw) | USD/JPY/… | ✅ | KRW | ✅ | app_setting/defaults | **미보존(GAP)** | float(§4.10 위반) | N/A | REAL(부분) |
| (Reward Settlement/Payout FX) | — | — | — | — | — | — | — | — | **N/A(신설)** |
