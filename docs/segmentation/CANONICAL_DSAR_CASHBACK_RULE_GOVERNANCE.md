# CANONICAL DSAR — Cashback Rule Governance (Threshold·Cap·Limit·Budget·Funding·Currency·Stacking·Conflict·Override·Decision·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-1 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_CASHBACK_PROGRAM_RULE_MODEL.md`](CANONICAL_DSAR_CASHBACK_PROGRAM_RULE_MODEL.md)(Program/Definition/Rule/Calculation/Scope) + 본 문서(Governance).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_PROGRAM_RULE_GOVERNANCE.md`](../architecture/ADR_DSAR_CASHBACK_PROGRAM_RULE_GOVERNANCE.md).

---

## 1. Threshold (§25) · Cap (§26) · Limit (§27) · Frequency (§28) ★분리

- **Threshold(§25)**: threshold policy id·minimum purchase·minimum net paid·minimum item quantity·minimum subscription amount·minimum referral conversion·minimum usage·qualifying period·**threshold currency·FX policy**·version·evidence.
- **Cap(§26)**: cap policy id·**per transaction/order/day/week/month/campaign/member lifetime/global cap·currency·reset policy·rollover support**·version·evidence.
- **Limit(§27, 12 type)**: PER_TRANSACTION/ORDER/CUSTOMER/REWARD_ACCOUNT/DAY/WEEK/MONTH/BILLING_PERIOD/CAMPAIGN/PROGRAM·LIFETIME·GLOBAL. 필드: limit type·**count limit·amount limit·currency·reset period·current consumption source·reservation behavior·pending inclusion·reversed amount treatment**·version·evidence.
- **Frequency(§28)**: frequency policy id·maximum occurrences·window type·rolling/calendar·cooldown duration·reset timezone·**duplicate event behavior·linked identity scope·shared account treatment**·version·evidence.
**★§4.8 BUDGET_EXHAUSTED≠Rule Inactive·Threshold≠Cap≠Limit 분리(§45 혼용 차단)**. **현행 인접**: coupon_rules max_uses·free_coupons max_uses/usable_from·Referral per-referred UNIQUE=Limit 실 사례. Cashback Cap/Limit/Frequency 신설.

## 2. Budget (§29) · Funding (§30) · Currency (§31) · Rounding (§32)

- **Budget Reference(§29)**: budget reference id·reward/campaign budget id·budget currency·**committed/consumed/remaining amount reference·reservation policy·exhaustion behavior·replenishment behavior·overrun behavior**·status·evidence.
- **Funding Reference(§30)**: funding reference id·funding agreement·funding parties·allocation method·default allocation·merchant/product/campaign override·settlement/liability responsibility·valid from/to·version·evidence. **★§4.7 Funding≠Calculation**. → Monetary Funding Allocation(Part 4-5-1-4) 연결.
- **Currency Policy(§31)**: calculation/reward/customer display/settlement/payout/accounting currency·**FX conversion policy·rate type·rate timing·fallback policy·unsupported currency behavior**·version·evidence. → fxToKrw/krwToCurrency(Part 4-5-1-4) 연결.
- **Rounding Policy(§32)**: 계산 단계·적용 Currency·**Decimal Precision·Rounding Mode·Minimum Payout Unit·Cashback Minor Unit·Aggregate/Per-line/Final Total Rounding·Rounding Difference Treatment**·version·evidence. **★Part 4-5-1-4 §4.10 Float 금지·Decimal/Minor Unit 계승**.
**현행**: Budget/Funding/Currency Policy 부재·신설. 마켓 이중차감(Excluded)·Referral platform-funded 인접.

## 3. Stacking (§33) · Exclusion (§34) · Priority (§35) · Conflict (§36) · Override (§37)

- **Stacking(§33, 13)**: STACKABLE·NON_STACKABLE·BEST_CASHBACK_ONLY·BEST_TOTAL_BENEFIT·CASHBACK_WITH_COUPON/POINT/WALLET·PAYMENT_METHOD/MERCHANT/CATEGORY_EXCLUSIVE·PRIORITY_BASED·CUSTOMER_CHOICE·CUSTOM. **★§4.6 Priority≠Stacking 분리**.
- **Exclusion(§34)**: 특정 상품/카테고리/판매자/결제수단/지역/고객상태·Fraud Risk·Employee·Internal/Test Account·Gift Card Purchase·Tax·Shipping·Refund된 금액·Chargeback·Subscription Trial·이미 Discount된 상품·규제 품목·Custom. **각 Exclusion에 Reason Code·Evidence**.
- **Priority(§35)**: priority policy id·numeric priority·priority group·tie breaker·specificity rule·campaign/merchant/product/payment method/manual override precedence·version·evidence.
- **Conflict Result(§36)**: conflict result id·subject·transaction·candidate/matched/selected/excluded rules·conflict type·priority/stacking outcome·best value calculation·exclusion reasons·evaluated_at·version·evidence. Conflict Type(10): RATE/CAP/SCOPE/FUNDING/BUDGET/STACKING/PRIORITY/CURRENCY/VERSION/MANUAL_OVERRIDE_CONFLICT.
- **Override(§37)**: override id·target rule/scope·**override type·override value·reason·requested by·approved by·effective from/to·rollback reference**·status·evidence. Type(13): RATE·FIXED_AMOUNT·CAP·LIMIT·ELIGIBILITY·SCOPE·PRIORITY·STACKING·FUNDING·BUDGET·CURRENCY·PAUSE·EMERGENCY_DISABLE. **★Override=요청자/승인자/Validity/Rollback 강제**.
**현행**: 전부 부재·신설. **★§4.6 우선순위 높다고 중복 불가 판단 금지**.

## 4. Rule Decision Contract (§38) · Candidate (§39)

- **Decision(§38)**: decision id·subject·transaction·program·definition·rule·**rule version·trigger/scope/eligibility/threshold/limit/cap/budget/funding/stacking/exclusion result·calculation input/output·decision result·exclusion reasons·evaluated_at**·evidence. Result(14): MATCHED·NOT_MATCHED·ELIGIBLE·NOT_ELIGIBLE·CALCULATED·ZERO_VALUE·LIMIT_REACHED·CAP_APPLIED·BUDGET_BLOCKED·EXCLUDED·CONFLICTED·OVERRIDDEN·MANUAL_REVIEW·BLOCKED.
- **Candidate(§39)**: candidate id·request id·program·definition·rule·rule version·provider/account·tenant·brand·store·merchant·region·currency·scope/trigger summary·eligibility reference·calculation policy·cap/limit/funding/budget summary·status·duplicate group·evidence.
**★Decision Evidence 보존(Rule Version·계산 입력/출력·Exclusion Reason)**. 현행 부재·신설.

## 5. Reconciliation (§40·§41) · Coverage (§42) · Gap (§43·§44)

- **Reconciliation(§40)**: Provider Rule↔Internal Rule·Program Status↔Rule Status·Definition Version↔Rule Version·**Display Rate↔Calculation Rate**·Scope Config↔Actual Applied Scope·Threshold↔Transaction Qualification·Cap↔Calculated Cashback·Limit Consumption↔Actual Accrual·Budget Remaining↔New Accrual·Funding Allocation↔Rule Funding·Currency Policy↔Transaction Currency·Rounding↔Calculated·Stacking↔Applied Benefits·Priority↔Selected Rule·Override↔Production Result. 상태(19): MATCH·PROGRAM_RULE/DEFINITION_VERSION/RULE_VERSION/DISPLAY_CALCULATION/SCOPE/THRESHOLD/CAP/LIMIT/BUDGET/FUNDING/CURRENCY/ROUNDING/STACKING/PRIORITY/OVERRIDE_MISMATCH·PROVIDER_INTERNAL_RULE_DRIFT·MANUAL_REVIEW·BLOCKED.
- **Coverage(§42, 23)**: Program·Definition·Definition Version·Rule·Rule Version·Calculation·Trigger·Scope·Eligibility Reference·Threshold·Cap·Limit·Frequency·Budget·Funding·Currency·Rounding·Stacking·Exclusion·Priority·Conflict·Override·Decision Evidence.
- **Gap(§43, 23)**: CASHBACK_PROGRAM/DEFINITION/RULE_UNREGISTERED·DEFINITION_VERSION/RULE_VERSION_MISSING·CALCULATION/TRIGGER/SCOPE/ELIGIBILITY_REFERENCE/THRESHOLD/CAP/LIMIT/FREQUENCY/BUDGET_REFERENCE/FUNDING_REFERENCE/CURRENCY/ROUNDING/STACKING/EXCLUSION/PRIORITY_POLICY_MISSING·OVERRIDE_HISTORY_MISSING·DECISION_EVIDENCE_MISSING·PROVIDER_INTERNAL_CASHBACK_RULE_DRIFT.
- **Critical Gap(§44)**: **잘못된 Tenant/Brand에 Rule 적용·Display Rate↔Calculation Rate 불일치·Rule Version 없이 계산·Expired Rule 적용·Budget Exhausted에서 신규 허용·Member Limit 초과·Global Cap 초과·Currency 없이 계산·Zero-decimal Rounding 오류·Funding 누락·Stacking 누락으로 이중 적용·Priority Conflict 미해결·Manual Override 승인 없음·Test Rule Production 적용·Product/Merchant Exclusion 누락·Provider↔Internal Drift**.
**현행 정직 GAP**: Cashback 규칙 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지). 실 GAP=coupon_rules rule version/scope/cap/stacking 부재. Critical Gap 시 Access Review 차단.

## 6. Static Lint (§45) · Runtime Guard (§46)

**Lint(§45)**: **Program 없는 Rule·Definition 없는 Rule·Rule Version 누락·Effective Time 누락·Calculation Method 누락·Scope Policy 누락·Eligibility Reference 누락·Threshold↔Cap↔Limit 혼용·Budget/Funding/Currency/Rounding/Stacking/Priority Policy 누락·Test Rule Production 사용·AI Recommendation Production 자동 승격·Display Rate를 Calculation Rate로 직접 사용·Evidence 없는 Override·기존 Cashback Registry 중복 생성**.
**Guard(§46)**: Wrong Program/Provider Account·**Cross-Tenant Rule**·Wrong Brand/Store/Merchant·**Expired/Superseded Rule·Invalid Rule Version·Scope Mismatch**·Currency Unsupported·Missing FX·Limit/Cap Exceeded·**Budget Exhausted**·Funding Invalid·Stacking/Priority Conflict·**Unauthorized Override·Test Rule in Production**·Critical Rule Drift·Kill Switch.
**현행 실증**: coupon_rules is_active 게이트·pg_settlement UNIQUE(idempotency)·auth_tenant(Cross-Tenant 차단) 패턴 재사용.

## 7. Error (§47) · Warning (§48)

**Error(22)**: CASHBACK_PROGRAM/DEFINITION/RULE_NOT_FOUND·DEFINITION_VERSION/RULE_VERSION_MISSING·**RULE_EXPIRED**·CALCULATION/TRIGGER_POLICY_MISSING·SCOPE_MISMATCH·ELIGIBILITY_REFERENCE_MISSING·**THRESHOLD_NOT_MET·LIMIT_EXCEEDED·CAP_EXCEEDED·BUDGET_EXHAUSTED**·FUNDING_INVALID·CURRENCY_UNSUPPORTED·ROUNDING_POLICY_MISSING·**STACKING_CONFLICT·PRIORITY_CONFLICT·OVERRIDE_UNAUTHORIZED·PROVIDER_INTERNAL_RULE_DRIFT**·RULE_RUNTIME_BLOCKED.
**Warning(15)**: RULE_VERSION·DISPLAY_RATE·SCOPE·THRESHOLD·CAP·LIMIT·BUDGET·FUNDING·CURRENCY·ROUNDING·STACKING·PRIORITY·OVERRIDE_WARNING·PROVIDER_INTERNAL_DRIFT·MANUAL_REVIEW_REQUIRED.

## 8. Golden Rule Dataset (§49) · Conformance (§50) · Legacy Equivalence (§51)

**Golden(§49)**: Program/Definition(General/First Purchase/Subscription/Renewal/Referral/Card-linked/Product/Merchant/Campaign·Archived/Deleted·Version Change) · Calculation(1%/5%/Fixed 1,000 KRW/10 USD/Tiered/Progressive/Product/Category/Merchant/Payment-method/Hybrid/**Zero-value**) · Scope(Tenant/Brand/Store/Merchant/Region/Country/Channel/Product/Category/Subscription·**Wrong Tenant/Merchant Block**) · Threshold/Cap/Limit(Min Met/Not Met·Per-order/Daily/Monthly/Lifetime Cap·Member/Global Limit·Rolling/Calendar·Reset·Cap Applied) · Budget/Funding(Platform/Merchant/Partner/Shared·Available/Reserved/**Exhausted**·Override/Mismatch·**Overrun Block**) · Currency/Rounding(KRW/USD/JPY·Multi-currency·FX·Half-up/even·Per-line/Final·Difference) · Stacking/Conflict(Cashback+Coupon/Point/Wallet·Non-stackable·Best Only·Priority·Product vs Merchant·Card vs Campaign·Equal Priority·Manual Override·**Unauthorized Block**) · Version(Current/Scheduled/**Expired/Superseded**/Rollback/**Test/AI Recommended**·Provider Match/Drift·**Evidence Missing Block**).
**실 회귀 시드**: coupon_rules trigger+is_active·kr 이중차감 Excluded·pg UNIQUE 멱등·auth_tenant Cross-Tenant 차단 — 즉시 Golden 등록 가능.
**Conformance(§50)**: Percentage/Fixed/Tiered/Product/Category/Merchant/Payment Method/Card-linked/Subscription/Referral/Campaign/Loyalty Tier Cashback에 동일 Contract(Program·Definition·Rule·Version·Calculation·Trigger·Scope·Eligibility·Threshold·Cap·Limit·Budget·Funding·Currency·Rounding·Stacking·Exclusion·Priority·Override·Evidence·Audit).
**Legacy Equivalence(§51)**: 기존 coupon_rules(구독 쿠폰)·Coupon 할인·Campaign과 Program/Definition/Rule Count·Display/Calculation Rate·Scope·Trigger·Threshold·Cap·Limit·Budget·Funding·Stacking·Priority·Override·Error·Warning·Latency·Audit 비교. **UNEXPLAINED·잘못된 Scope·Rule Drift→전환차단**.

## 9. 기존 구현 분류 (§52) · 중복 감사 (§53)

| 구현 | 분류 | 근거 |
|---|---|---|
| `CouponEngine.coupon_rules`(trigger+is_active·plan/duration/max_uses) | **VALIDATED_LEGACY·KEEP_SEPARATE_WITH_REASON** | GeniegoROI 자체 구독 쿠폰 트리거 규칙. Rule Registry+trigger+is_active 참조 패턴·**rule version/scope/cap/calculation rate 부재 GAP**·고객 cashback 아님 |
| `free_coupons`/`CouponRedeem`·`CouponAdmin` | **KEEP_SEPARATE_WITH_REASON** | 구독 플랜 쿠폰(percentage/fixed 없음·무료기간). Coupon Part 정본 |
| `AutoCampaign`·`admin_growth_campaign`·`line_campaigns` | **KEEP_SEPARATE_WITH_REASON** | 마케팅 캠페인·cashback 아님 |
| 마켓 `적립금`/`point_discount` | **KEEP_SEPARATE_WITH_REASON** | 마켓 정산 차감(Part 4-3) |
| Cashback Program/Definition/Rule/Version/Calculation/Scope/Threshold/Cap/Limit/Budget/Funding/Currency/Rounding/Stacking/Exclusion/Priority/Conflict/Override/Decision | **UNVERIFIED → NOT_APPLICABLE** | 고객 cashback 엔진 부재(grep 0)·신설 |

**중복 감사(§53)**: **coupon_rules 단일(구독)·free_coupons/CouponRedeem SSOT(Db::ensureCouponTables 일원화)·중복 Registry 없음**. ★도입 시 **Provider별 독립 Cashback Rule Model 금지·기존 coupon_rules/Coupon SSOT와 cashback 오혼입 금지·CouponEngine trigger 패턴 재사용(중복 엔진 금지)**.

## 10. 기능 후퇴 방지 · 검증 게이트 (§58) · 영구 규칙

**후퇴 방지**: coupon_rules·free_coupons/CouponRedeem·CouponAdmin·AutoCampaign·`/auth/referral/*`·`/coupon/*`·Existing Rule/Campaign/Admin UI/API/Experiment 기능 보존(회귀 0).
**게이트(§58)**: Program Registry·**Program≠Definition≠Rule 분리·Definition/Rule Version 보존**·Calculation Policy·Eligible Amount Basis·Included/Excluded·Trigger·Scope(Tenant/Brand/Store/Merchant)·Eligibility Reference·**Threshold≠Cap≠Limit 분리·Frequency/Cooldown**·Budget/Funding Reference·Currency/Rounding·Stacking/Exclusion/Priority·Conflict Resolution·**Override 승인/Validity·Rule Decision Evidence**·Provider/Internal Reconciliation·Coverage/Gap/Evidence·Lint/Guard·**기존 Registry 중복 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History.
**영구 규칙(§61)**: 신규 Cashback 도입 전 **기존 coupon_rules/Coupon SSOT/Campaign 재사용(중복 금지)·CouponEngine trigger 패턴 참조** · Program/Definition/Rule/Version 분리·현재 Rule만 저장 금지 · Calculation(정률/정액/구간 구분)·Eligible Amount Basis·Included/Excluded(Rule Version별) · Trigger·Scope 명시(암묵 추론 금지) · Threshold/Cap/Limit/Frequency 분리 · Budget/Funding(Monetary Allocation 연결) · Currency/Rounding(Decimal/Minor Unit·Float 금지) · Stacking≠Priority·Exclusion Reason Code · Conflict(Priority/Specificity/Best Value/Override) · **AI Recommendation Production 자동 승격 금지·Override 승인/Rollback·Decision Evidence** · Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **coupon_rules(구독)↔cashback·마켓 적립금↔cashback·Campaign↔cashback 오혼입 금지·Provider별 독립 Cashback Rule Model 중복 생성 금지.**

## 11. Conflict Matrix (§57) — 현행

| Transaction | Candidate Rules | Selected Rules | Excluded Rules | Priority | Stacking | Best Value | Override | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback 규칙 충돌) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 구독 쿠폰(참조·단일 trigger) | coupon_rules(trigger 1개) | is_active 1개 | N/A | N/A | N/A(단일) | N/A | admin toggle | is_active | KEEP_SEPARATE |
