# CANONICAL DSAR — Rebate Economic Responsibility Governance (Claim·Settlement·Payout·Liability·Accounting·Fee·Tax·FX·Recovery Responsibility·Decision·Reconciliation·Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-3 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_FUNDING_MODEL.md`](CANONICAL_DSAR_REBATE_FUNDING_MODEL.md)(Sponsor/Funding Party/Agreement/Model/Allocation/Commitment) + 본 문서(Responsibility/Governance).
> ADR: [`../architecture/ADR_DSAR_REBATE_FUNDING_SPONSOR_RESPONSIBILITY.md`](../architecture/ADR_DSAR_REBATE_FUNDING_SPONSOR_RESPONSIBILITY.md).

---

## 1. Responsibility 분리 (§4.8) — 6축

**Contractual·Operational·Financial·Accounting·Legal·Recovery Responsibility** 구분. **★§4.1 Sponsor≠Funder·§4.2 Funder≠Payer·§4.3 Settlement≠Accounting**. 하나의 Party 다중 Role(§8). Responsibility Matrix(§27): Sponsor·Economic Funder·Budget Owner·Claim Processor/Approver·Settlement Operator·Payout Operator·Liability Owner·Accounting Owner·Tax Owner·FX Cost Owner·Recovery Owner(각 Primary/Secondary Party·Legal Entity·Agreement·Validity·Status).

## 2. Claim Processing (§18) · Settlement (§19) · Payout (§20) Responsibility

- **Claim Processing(§18)**: responsibility_id·program·party·**responsibility_type·claimant type·claim channel·validation/evidence review/fraud review/approval responsibility·SLA·escalation owner**·valid from/to·status·evidence. Type(10): INTAKE·VALIDATION·DOCUMENT_REVIEW·DATA_RECONCILIATION·FRAUD_REVIEW·APPROVAL·REJECTION·APPEAL_REVIEW·CUSTOMER_SUPPORT·AUDIT. → Claim 상세 Lifecycle=후속·AnomalyDetection(fraud review) 재사용.
- **Settlement(§19)**: responsibility_id·program·**settlement party·settlement counterparty·settlement method·settlement account·settlement currency·settlement schedule·gross/fee/tax/withholding/FX/adjustment/reconciliation responsibility**·valid from/to·status·evidence. → pg_settlement/kr_settlement 참조(inbound·outbound rebate settlement=신설).
- **Payout(§20)**: responsibility_id·program·**payout operator·payout funder·payout provider·payout account·payout method·payout currency·recipient/destination verification responsibility·fee/tax/returned payout/retry/fraud loss responsibility**·valid from/to·status·evidence. **★§4.2 Payout Operator≠Payout Funder**. → Cashback Payout(4-5-2-4·outbound 부재) 정합·신설.

## 3. Liability (§21) · Accounting (§22) Responsibility

- **Liability(§21)**: responsibility_id·program·funding party·legal entity·**liability type·recognition trigger·recognition currency·revaluation/breakage/write-off responsibility·accounting period**·valid from/to·status·evidence. Type(10): ESTIMATED·ACCRUED·APPROVED·CLAIMED·PAYABLE·SETTLED·DEFERRED·CONTINGENT·RECOVERY·OTHER. → CRM LTV 역분개(Liability 역분개 인접)·Legal Entity=부재(신설).
- **Accounting(§22)**: responsibility_id·program·**accounting entity·ERP company·cost center·profit center·accounting nature·journal/credit memo/debit memo/AP/AR/accrual/reversal/write-off responsibility·reporting currency**·valid from/to·status·evidence. → **현행**: Pnl(COGS/expense/contra-revenue=Accounting Nature 인접)·**ERP Company/Cost Center/Profit Center=부재(신설·회계 미연동)**. **★최종 회계=법인/국가/ERP 정책 Reference**.

## 4. Fee (§23) · Tax/Withholding (§24) · FX (§25) · Recovery (§26) Responsibility

- **Fee(§23)**: Provider/Claim Processing/Validation/Settlement/Payout/Bank/Wallet/FX/Tax Filing/Recovery/Collection Fee·Customer Service Cost·Audit Cost. 각: fee type·**responsible party·allocation rule·customer charge·recoverable·funding agreement·currency·validity**·evidence.
- **Tax/Withholding(§24)**: responsibility_id·program·**tax jurisdiction·tax subject role·filing/withholding/reporting/document issuance responsibility·tax cost owner·correction responsibility**·valid from/to·status·evidence. **★법률 판단 코드 하드코딩 금지(국가/법인별 정책 Reference)**.
- **FX(§25)**: responsibility_id·program·**conversion stage·rate source/selection responsibility·FX cost/gain/loss owner·rounding difference owner·revaluation responsibility·source/target currency**·valid from/to·status·evidence. Stage(10): CALCULATION·CLAIM·ACCRUAL·SETTLEMENT·CREDIT_MEMO·PAYOUT·ACCOUNTING·RECOVERY·REFUND·REPORTING. → fxToKrw(Part 4-5-1-4·rate version GAP) 재사용.
- **Recovery(§26)**: responsibility_id·program·**recovery owner·funding party·settlement party·original payer·recovery method·refund/claim overpayment/duplicate payment/fraud/chargeback recovery·write-off/dispute/legal escalation responsibility**·valid from/to·status·evidence. → OrderHub 역분개·Cashback Recovery(4-5-2-5) 정합.
**★§4.7 Funding≠Cost Basis(Funding Amount≠실제 경제적 비용)**.

## 5. Funding Decision (§28) · Candidate (§29)

- **Decision(§28)**: funding_decision_id·program·subject transaction/claim/accrual reference·funding model·**candidate/selected funding parties·allocation results·residual/budget/commitment result·settlement/payout/liability responsibility result·fee/tax/FX responsibility result·override reference·decision source·decided_at·confidence**·status·evidence. 상태(10): RESOLVED·PARTIALLY_RESOLVED·**UNDERFUNDED·OVERFUNDED·CONFLICTED·AGREEMENT_MISSING·BUDGET_BLOCKED·COMMITMENT_BLOCKED**·MANUAL_REVIEW·BLOCKED.
- **Candidate(§29)**: candidate id·request id·program·sponsor·funding parties·agreements·funding model·allocation scope·percentages·fixed amounts·budget·commitment·**settlement/payout party·liability/accounting/fee/tax/FX/recovery owner**·currency·validity·confidence·conflicts·manual review requirement·evidence.

## 6. Reconciliation (§30·§31) · Critical Funding Gap (§32)

- **Reconciliation(§30)**: Sponsor↔Contract Party·**Contractual Funder↔Actual Funder·Funding Agreement↔Allocation·Allocation Percentage↔100%·Allocation Amount↔Funded Value·Budget↔Commitment·Commitment↔Reservation·Reservation↔Accrual·Funding Party↔Settlement Party·Settlement Party↔Payout Party·Liability Owner↔Accounting Entity·Fee Owner↔Provider Charge·Tax Owner↔Withholding·FX Cost Owner↔Conversion·Recovery Owner↔Actual Recovery·Provider Funding↔Internal·ERP Cost Center↔Program·Historical Agreement↔Applied Transaction**. 필드: reconciliation_id·program·comparison_type·source/canonical reference·source/canonical value·difference·currency·result·severity·detected/resolved_at·resolution·evidence. 상태(§31, 24): MATCH·SPONSOR/CONTRACT_FUNDER/FUNDING_PARTY/ALLOCATION_PERCENTAGE/ALLOCATION_AMOUNT_MISMATCH·**DOUBLE_FUNDING·UNDERFUNDING·OVERFUNDING**·BUDGET_COMMITMENT/COMMITMENT_RESERVATION/RESERVATION_ACCRUAL/SETTLEMENT_RESPONSIBILITY/PAYOUT_RESPONSIBILITY/LIABILITY_OWNER/ACCOUNTING_OWNER/FEE_OWNER/TAX_OWNER/FX_OWNER/RECOVERY_OWNER_MISMATCH·PROVIDER_INTERNAL_FUNDING_DRIFT·HISTORICAL_AGREEMENT_MISMATCH·MANUAL_REVIEW·BLOCKED.
- **Critical Gap(§32)**: **Active Program에 Funding Party 없음·Sponsor만 있고 Funder 없음·Shared Funding 100% 초과·100% 미만+Residual 없음·Double Funding·Wrong Tenant Funding Party·Wrong Legal Entity Liability·만료 Agreement 사용·Agreement 없이 Accrual·Budget Owner/Funding Party 불명확·Settlement/Payout Party 미정의·Liability Owner 미정의·Currency 불일치·FX Cost Owner 미정의·Recovery Owner 미정의·Provider↔Internal Funding 불일치·과거 거래에 현재 Agreement 적용**.
**현행 정직 GAP**: Rebate Funding 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지). Critical 시 Access Review 차단.

## 7. Static Lint (§33) · Runtime Guard (§34)

**Lint(§33)**: **Active Program에 Funding Model 없음·Funding Party 없는 Allocation·Agreement 없는 Contract-based Funding·Allocation Currency 누락·Shared Funding 총합 검증 누락·Residual Policy 누락·Sponsor↔Funder 자동 동일시·Funder↔Payer 자동 동일시·Settlement↔Accounting Party 자동 동일시·Liability Owner 누락·Fee/Tax/FX Responsibility 누락·Recovery Responsibility 누락·Version 없는 Override·승인 없는 Override·Historical Agreement 덮어쓰기·Float 기반 Funding 계산·Evidence 없는 Manual Allocation·기존 Monetary Funding Model 중복 생성**.
**Guard(§34)**: **Wrong Funding Party·Cross-Tenant Funding·Wrong Legal Entity·Expired Agreement·Unsupported Currency·Allocation Over 100%·Under 100% without Residual·Duplicate Funding·Budget/Commitment Insufficient·Reservation Missing·Liability/Settlement/Payout/Tax/FX/Recovery Responsibility Missing·Unauthorized Override·Critical Funding Drift·Kill Switch**.
**현행 실증**: BillingMethod MTD budget cap(Budget Insufficient)·charging 선점(Reservation)·auth_tenant(Cross-Tenant)·pg/coupon UNIQUE(Duplicate) 재사용.

## 8. Error (§35) · Warning (§36) · Evidence (§37) · Audit (§38)

**Error(22)**: FUNDING_MODEL/PARTY/AGREEMENT_NOT_FOUND·AGREEMENT_EXPIRED·ALLOCATION_INVALID·**PERCENTAGE_OVER/UNDERALLOCATED·DOUBLE_FUNDING_DETECTED**·CURRENCY_MISMATCH·BUDGET/COMMITMENT_INSUFFICIENT·RESERVATION_MISSING·**SETTLEMENT/PAYOUT/LIABILITY/ACCOUNTING/TAX/FX/RECOVERY_RESPONSIBILITY_MISSING**·OVERRIDE_UNAUTHORIZED·RECONCILIATION_FAILED·RUNTIME_BLOCKED.
**Warning(14)**: SHARED_FUNDING·RESIDUAL_FUNDING·BUDGET·COMMITMENT·SETTLEMENT_RESPONSIBILITY·PAYOUT_RESPONSIBILITY·LIABILITY·ACCOUNTING·FEE_ALLOCATION·TAX_RESPONSIBILITY·FX_RESPONSIBILITY·RECOVERY_RESPONSIBILITY·PROVIDER_INTERNAL_FUNDING_DRIFT·FUNDING_MANUAL_REVIEW_REQUIRED.
**Evidence(§37)**: evidence id·program·sponsor·funding party·agreement/contract/budget/commitment/provider funding/ERP/accounting reference·allocation dimension/value·responsibility role·decision source·effective/discovered_at·confidence·lineage·result hash·audit reference. **★계약 원문/은행정보/세금 식별정보/PII 저장 금지**.
**Audit(§38, 21)**: SPONSOR/FUNDING_PARTY_REGISTERED·FUNDING_AGREEMENT_LINKED·FUNDING_MODEL/ALLOCATION_CREATED·ALLOCATION_CHANGED·SHARED_FUNDING_GROUP_CREATED·OVERRIDE_REQUESTED/APPROVED/REJECTED·COMMITMENT_CREATED/CONSUMED/RELEASED·RESPONSIBILITY_ASSIGNED/CHANGED·**DOUBLE_FUNDING/UNDERFUNDING/OVERFUNDING_DETECTED**·RECONCILIATION_FAILED·FUNDING_BLOCKED·MANUAL_REVIEW_REQUESTED.

## 9. 기존 구현 분류 (§39) · 중복 감사 (§40)

| 구현 | 분류 | 근거 |
|---|---|---|
| Monetary Funding Model(4-5-1-4 Funding Party/Agreement/Allocation) | **연결(전방호환 계약)** | Rebate Funding이 monetary id로 연결·중복 생성 금지 |
| kr_settlement_line 이중차감(마켓 수수료)·Referral platform-funded·pg_settlement fee | **참조(Funding cost 실 사례)** | 테넌트/플랫폼 비용 부담 |
| `BillingMethod`(MTD budget cap·charging 선점·auto_campaign budget) | **재사용(Commitment/Reservation 패턴)** | Budget/Commitment/Reservation |
| `Pnl`(COGS/expense/contra-revenue)·CRM LTV 역분개 | **참조(Accounting/Liability Nature)** | 최종 회계=법인/국가/ERP |
| `fxToKrw` | **재사용(FX Responsibility)** | Conversion stage |
| SupplyChain/PartnerPortal/channel_credential/Referral·AnomalyDetection·OrderHub 역분개 | **재사용(주체/Claim Fraud/Recovery)** | Funding Party 주체·책임 |
| Rebate Sponsor/Funding Party/Agreement/Model/Allocation/Shared Funding/Override/Commitment/Responsibility(Settlement/Payout/Liability/Accounting/Fee/Tax/FX/Recovery)/Decision/Reconciliation·Legal Entity/ERP Company/Cost Center | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**중복 감사(§40)**: **Funding Model=Monetary(4-5-1-4) 단일·Budget/Commitment=BillingMethod·Accounting=Pnl·FX=fxToKrw**. ★도입 시 **ERP/Provider/CRM별 독립 Funding Table·Rebate 유형별 중복 Funding Logic 금지·기존 Monetary Funding Model 재사용**.

## 10. 기능 후퇴 방지 · 검증 게이트 (§46) · 영구 규칙

**후퇴 방지**: Monetary Funding Model·BillingMethod·Pnl·fxToKrw·kr_settlement_line·SupplyChain·PartnerPortal·`/v427/billing/*`·Existing Rebate Provider/ERP/Accounting/Budget/Settlement/Reporting 기능 보존(회귀 0).
**게이트(§46)**: **Sponsor≠Funding Party·Funding Party≠Payer·Settlement≠Accounting Party**·Agreement↔Contract Reference·Funding Model·Allocation Scope/Method·**Percentage+Amount 둘 다·Shared Funding 합계 검증·Residual Policy·Double Funding 차단·Override 승인/Validity**·Commitment↔Budget·Reservation Reference·Claim Processing/Settlement/Payout/Liability/Accounting/Fee/Tax/FX/Recovery Responsibility·Provider/Contract/ERP Reconciliation·**Historical Agreement 보존·Wrong Tenant/Legal Entity 차단**·중복 Funding 모델 없음·회귀 0·ADR/PM/Repeat Problem/Agent History·다음 Lifecycle 실행 가능.
**영구 규칙(§49)**: 신규 Rebate Funding 도입 전 **기존 Monetary Funding Model/BillingMethod/Pnl/fxToKrw 재사용(중복 금지)** · **Sponsor≠Funder≠Payer≠Settlement≠Accounting Party(역할 분리·다중 Role)** · Funding Agreement Authorized Reference(계약 원문 금지) · **Percentage+Amount 둘 다·Shared Funding 합계 검증·Double Funding 금지·Residual 명시** · Funding≠Budget≠Cost Basis · Override 승인/Validity/Rollback · Commitment/Reservation(부족 시 Accrual 금지 Enforcement) · 6축 Responsibility(Contractual/Operational/Financial/Accounting/Legal/Recovery) · Fee/Tax(법률 하드코딩 금지·정책 Reference)/FX(Stage별)/Recovery Responsibility · **Historical Agreement 덮어쓰기 금지(Validity/Version)·Float 금지(Decimal)** · Provider/ERP/Contract Reconciliation · Static Lint/Runtime Guard · 중복/후퇴 검사 · ADR/PM 기록. **Sponsor↔Funder↔Payer·Settlement↔Accounting·Funding↔Budget↔Cost·현재↔Historical Agreement·기존 Monetary Funding Model 중복 오혼입/생성 금지.**

## 11. Responsibility Matrix (§44) — 현행

| Program | Claim Processor | Settlement Operator | Payout Operator | Liability Owner | Accounting Owner | Tax Owner | FX Owner | Recovery Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Responsibility) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설·6축 역할 분리)** |
| 인접(참조) | AnomalyDetection(fraud) | pg/kr settlement | (outbound 부재) | Pnl/CRM 역분개 | Pnl(ERP 부재) | 부재 | fxToKrw | OrderHub 역분개 | 신설 |
