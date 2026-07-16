# CANONICAL DSAR — Rebate Classification Governance (Program Classification·Primary/Secondary/Hybrid·Provider Mapping·Decision·Reconciliation·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-2 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_TYPE_REGISTRY.md`](CANONICAL_DSAR_REBATE_TYPE_REGISTRY.md)(Type/Family/Dimensions/Boundary) + 본 문서(Governance).
> ADR: [`../architecture/ADR_DSAR_REBATE_TYPE_BUSINESS_MODEL_CLASSIFICATION.md`](../architecture/ADR_DSAR_REBATE_TYPE_BUSINESS_MODEL_CLASSIFICATION.md).

---

## 1. Program Classification (§23) · Primary/Secondary (§24) · Hybrid (§25) · Mutual Exclusivity (§26)

- **Program Classification(§23)**: program_classification_id·program·**primary rebate type·type family·business model·primary audience·sponsor classification·transaction flow·timing·calculation basis·calculation structure·claim model·settlement method·settlement timing·accounting nature·commercial purpose·hybrid·classification confidence·classification source·rule reference**·valid from/to·status·version·evidence.
- **Primary Type(§24)**: program·primary type·effective period·decision source·confidence·evidence. **Secondary Type**: program·secondary type·classification dimension·priority·reason·effective period·evidence. **★§4.2 동일 시점 Primary Type 하나만 허용**.
- **Hybrid(§25)**: hybrid classification id·**primary component·secondary components·component priority·conflict rule·reporting behavior·calculation separation requirement·settlement separation requirement**·evidence. 예: Volume+Growth·Contract+Tier·Consumer+Trade-in·Vendor+Promotional Allowance·Sell-in+Sell-out·MDF+Reimbursement·Instant+Delayed·Credit Memo+Cash Payout·Product+Subscription·Rebate+Price Protection.
- **Mutual Exclusivity(§26)**: INSTANT↔DELAYED·PROSPECTIVE↔RETROSPECTIVE·NO_CLAIM_REQUIRED↔CUSTOMER_SUBMITTED·CASH_PAYOUT↔CREDIT_MEMO(단일 방식)·CONSUMER↔B2B(단일 Audience). **Hybrid Program 명시적 예외 허용**.
**★§4.1 단일 Type 금지(Audience/Sponsor/Business Model/Flow/Timing/Calculation Basis/Claim/Settlement/Accounting/Purpose 동시 분류)·Primary 하나만**. 현행 부재·신설.

## 2. Provider Type Mapping (§27) · Classification Decision (§29) · Candidate (§30) · Confidence (§31)

- **Provider Type Mapping(§27)**: provider type mapping id·provider/account·source system·**external object type·external type code/name·canonical rebate type/business model/transaction flow/claim model/settlement method·mapping confidence·mapping method**·valid from/to·status·owner·evidence. Method(7): EXACT·CONFIGURED·RULE_BASED·SEMANTIC·MANUAL·LEGACY_ADAPTER·UNKNOWN. **★§4.3 Provider 명칭을 Canonical Type 직접 사용 금지(Versioned Mapping)**. → **현행 재사용**: ChannelRegistry group_type/channel_key(외부 type→canonical 매핑 패턴).
- **Decision(§29)**: decision_id·program·**candidate classifications·selected primary/secondary types·rejected types·business model/transaction flow/timing/calculation basis/claim model/settlement method/accounting nature/commercial purpose result·hybrid result·confidence·exclusion reasons·decision source·decided_at·reviewer**·status·evidence. 상태(11): AUTO/RULE/MANUALLY_CLASSIFIED·PARTIALLY_CLASSIFIED·CONFLICTED·LOW_CONFIDENCE·REVIEW_PENDING·APPROVED·REJECTED·SUPERSEDED·BLOCKED.
- **Candidate(§30)**: candidate id·request id·program·provider type·program name·description reference·**contract metadata·participant/beneficiary/claimant scope·sponsor·transaction source objects·settlement references·preliminary type·candidate type list·candidate business model/flow/timing/calculation basis/claim model/settlement method·confidence·conflicts·manual review requirement**·evidence.
- **Confidence(§31)**: EXACT·VERY_HIGH·HIGH·MEDIUM·LOW·CONFLICTED·UNVERIFIED·BLOCKED. 근거: Exact Provider Type Mapping·Contract Type·Program Name·Description·Participant/Sponsor Role·Transaction Flow·Claim Requirement·Settlement Method·Accounting Reference·Historical Type·Manual Review. **★Program 이름만 일치 시 EXACT 부여 금지**.

## 3. Reconciliation (§32·§33) · Critical Misclassification (§34)

- **Reconciliation(§32)**: Provider Type↔Canonical·ERP↔Canonical·CRM↔Canonical·**Contract Nature↔Program Type·Participant Scope↔Audience·Sponsor↔Business Model·Transaction Data↔Flow·Claim Process↔Claim Model·Settlement History↔Settlement Method·Accounting Entry↔Accounting Nature·Description↔Commercial Purpose·Current↔Historical Type·Reporting↔Operational Type**. 필드: reconciliation id·program·comparison type·source/canonical classification·result·difference·severity·detected/resolved_at·resolution·evidence. 상태(§33, 20): MATCH·PROVIDER/ERP/CRM/CONTRACT_TYPE·AUDIENCE·SPONSOR_MODEL·TRANSACTION_FLOW·TIMING·CALCULATION_BASIS·CLAIM_MODEL·SETTLEMENT_METHOD·ACCOUNTING_NATURE·COMMERCIAL_PURPOSE·HISTORICAL_TYPE·REPORTING_OPERATIONAL_MISMATCH·MULTIPLE_PRIMARY_TYPE·LOW_CONFIDENCE·MANUAL_REVIEW·BLOCKED.
- **Critical Misclassification(§34)**: **Cashback/Commission/Refund를 Rebate로 잘못 분류·Consumer Program을 B2B로·B2B Credit Memo를 Consumer Cash Payout으로·Sell-in을 Sell-out으로·Retrospective Tier를 Instant로·Claim-required를 No-claim으로·Credit Memo를 Cash Payout으로·Price Adjustment를 Marketing Expense로만·Production Program이 UNKNOWN Type·동일 시점 다중 Primary Type·Historical Type 덮어쓰기·Provider Type Mapping 누락으로 잘못된 계산/정산 경로**.
**★§4.5 Rebate≠Discount/Cashback/Commission/Refund(경계 정본=coupon/cashback 부재/마켓 수수료/역분개 참조)**. 현행 정직 GAP: Rebate 분류 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE. Critical 시 Access Review 차단.

## 4. Static Lint (§35) · Runtime Guard (§36)

**Lint(§35)**: **Primary Type 없는 Active Program·동일 기간 다중 Primary Type·Type Family 없는 Type·Business Model 없는 Active Program·Audience Classification 없는 Program·Claim Model 없는 Claim 가능 Program·Settlement Method 없는 지급 가능 Program·Accounting Nature 없는 ERP 연결 Program·Provider Type Mapping 없이 외부 Type 직접 사용·Historical Type 덮어쓰기·Rebate↔Cashback Type 혼용·Rebate↔Commission Type 혼용·Type만으로 Calculation Rule 자동 추론·Evidence 없는 Manual Classification·Deprecated Type 신규 사용·기존 Type Registry 중복 생성**.
**Guard(§36)**: **Unknown Primary Type in Production·Multiple Primary Type·Deprecated Type·Provider Mapping Conflict·Audience Scope Mismatch·Sponsor/Business Model Mismatch·Transaction Flow Mismatch·Claim Model Mismatch·Settlement Method Mismatch·Accounting Nature Critical Mismatch·Historical Classification Gap·Low-confidence Auto Classification·Wrong Instrument Boundary·Critical Type Drift·Kill Switch**.
**현행 실증**: ChannelRegistry group_type(분류 enum·admin 관리)·Pnl accounting 분류·GENIE_ENV(Production 격리) 재사용.

## 5. Error (§37) · Warning (§38) · Evidence (§39) · Audit (§40)

**Error(20)**: REBATE_TYPE_NOT_FOUND·PRIMARY_TYPE_MISSING·**MULTIPLE_PRIMARY_TYPE·TYPE_DEPRECATED**·TYPE_FAMILY/BUSINESS_MODEL/AUDIENCE_CLASSIFICATION/TRANSACTION_FLOW/TIMING/CALCULATION_BASIS/CLAIM_MODEL/SETTLEMENT_METHOD/ACCOUNTING_NATURE/COMMERCIAL_PURPOSE_MISSING·**PROVIDER_TYPE_MAPPING_MISSING·CLASSIFICATION_CONFLICT·CLASSIFICATION_CONFIDENCE_LOW·INSTRUMENT_BOUNDARY_CONFLICT**·HISTORICAL_CLASSIFICATION_MISSING·CLASSIFICATION_RUNTIME_BLOCKED.
**Warning(14)**: SECONDARY_TYPE·HYBRID_CLASSIFICATION·PROVIDER_TYPE·AUDIENCE·TRANSACTION_FLOW·TIMING·CALCULATION_BASIS·CLAIM_MODEL·SETTLEMENT_METHOD·ACCOUNTING_NATURE·HISTORICAL_TYPE·LOW_CONFIDENCE·TYPE_DRIFT_WARNING·CLASSIFICATION_MANUAL_REVIEW_REQUIRED.
**Evidence(§39)**: evidence id·program·provider/account·external type code·contract reference·program metadata/transaction sample/claim process/settlement/accounting reference·classification dimension·selected/rejected values·decision source·confidence·effective/discovered_at·lineage·result hash·audit reference. **★계약/Claim/회계 문서 원문 복제 금지**.
**Audit(§40, 15)**: TYPE_CREATED/UPDATED/DEPRECATED·PROGRAM_CLASSIFIED·PRIMARY_TYPE_ASSIGNED/CHANGED·SECONDARY_TYPE_ADDED/REMOVED·HYBRID_CLASSIFICATION_CREATED·PROVIDER_TYPE_MAPPED/MAPPING_CHANGED·CLASSIFICATION_CONFLICT_DETECTED·CLASSIFICATION_RECONCILED·MANUAL_REVIEW_REQUESTED·CLASSIFICATION_BLOCKED.

## 6. 기존 구현 분류 (§41) · 중복 감사 (§42)

| 구현 | 분류 | 근거 |
|---|---|---|
| `ChannelRegistry` group_type(sales/marketing/logistics/pg/messaging) | **재사용(Provider Type Mapping 패턴)** | 외부 type→canonical 분류·admin 관리. Rebate Provider Type Mapping 재사용(**group_type≠rebate type 오혼입 금지**) |
| `Pnl`(contra-revenue via coupon/point·marketing/commission expense·COGS) | **재사용(Accounting Nature Reference)** | 회계 성격 분류 인접·최종 회계는 법인/국가/ERP |
| `SupplyChain`(sell-in)·`channel_orders`/kr_settlement_line(sell-out) | **재사용(Transaction Flow)** | Sell-in/Sell-out 실 데이터원 |
| `Mmm`/`Rollup`(revenue/margin/volume/growth) | **재사용(Calculation Basis Reference)** | basis 인접 |
| Instrument Boundary(coupon 할인·cashback 부재·마켓 수수료·OrderHub 역분개·point_discount) | **경계 참조** | Rebate≠Discount/Cashback/Commission/Refund/Point |
| Rebate Type Registry/Version·Business Model·Audience/Sponsor/Flow/Timing/Calculation Basis/Structure/Claim Model/Settlement Method/Accounting Nature/Commercial Purpose Classification·Program Classification·Primary/Secondary/Hybrid·Provider Mapping(rebate)·Decision/Candidate/Reconciliation | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**중복 감사(§42)**: **분류 enum=group_type 단일(채널)·Accounting=Pnl 단일·Flow=SupplyChain/channel_orders**. ★도입 시 **ERP/CRM/Analytics별 독립 Type Taxonomy·Consumer/B2B 별도 중복 Type Registry·Deprecated Type 복제·동일 의미 다른 코드값 금지·기존 group_type/Pnl 재사용**. 동일 의미 Type 즉시 삭제 금지→Alias/Migration 계획.

## 7. 기능 후퇴 방지 · 검증 게이트 (§48) · 영구 규칙

**후퇴 방지**: ChannelRegistry group_type·Pnl·SupplyChain·channel_orders·Mmm·Rollup·`/v426/channels`·Existing Rebate Reporting/ERP/CRM/Provider Connector/Analytics/Admin UI 기능 보존(회귀 0).
**게이트(§48)**: Type Registry·Family·Consumer/B2B/Channel/Trade Promotion 분리·**Primary 하나·Secondary/Hybrid**·Audience/Sponsor·Business Model·Sell-in/through/out·Instant/Delayed/Prospective/Retrospective·**Calculation Basis≠Structure·Claim Model≠Requirement**·Settlement Method/Timing·Accounting Nature Reference·Commercial Purpose·**Rebate↔Discount/Cashback/Commission/Refund 경계**·Provider Type Mapping·Type Version/Deprecated/Replacement·Decision/Confidence·Provider/ERP/Contract Reconciliation·**Historical Classification 보존·Low-confidence 자동 분류 차단**·중복 Type Registry 없음·회귀 0·ADR/PM/Repeat Problem/Agent History·다음 Funding 실행 가능.
**영구 규칙(§51)**: 신규 Rebate Type 도입 전 **기존 group_type/Pnl/SupplyChain/Mmm 재사용(Type Enum 중복 금지)** · **단일 Type 금지(다차원 Classification)·Primary 하나** · **§4.4 Type≠계산 로직(Classification·상세 Rule=후속)** · **§4.5 Rebate≠Discount/Cashback/Commission/Refund/Marketing Fund(모호 시 HYBRID/MANUAL_REVIEW)** · Provider 명칭≠Canonical(Versioned Mapping·이름만 EXACT 금지) · Confidence 다요소 · **Historical Classification 덮어쓰기 금지(Version/Validity)** · Mutual Exclusivity(Hybrid 예외) · Provider/ERP/Contract Reconciliation·Critical Misclassification · Static Lint/Runtime Guard · 중복/후퇴 검사 · ADR/PM 기록. **Rebate↔Cashback/Commission Type·group_type(채널)↔rebate type·Type↔계산 로직 오혼입·ERP/CRM/Analytics 독립 Taxonomy 중복 생성 금지.**

## 8. Classification Reconciliation Matrix (§47) — 현행

| Program | Provider Type | ERP Type | Contract Type | Canonical Type | Conflict | Confidence | Resolution | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Classification) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): 채널 | group_type | N/A(ERP 미연동) | ChannelContract | N/A | — | admin 확정 | — | is_active | channel_registry |
