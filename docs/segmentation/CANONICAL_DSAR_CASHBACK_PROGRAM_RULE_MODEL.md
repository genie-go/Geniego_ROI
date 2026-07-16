# CANONICAL DSAR — Cashback Program·Definition·Rule Model (Program·Definition·Rule·Version·Calculation·Scope·Trigger)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-1 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Program/Definition/Rule/Version/Calculation/Scope/Trigger) + [`CANONICAL_DSAR_CASHBACK_RULE_GOVERNANCE.md`](CANONICAL_DSAR_CASHBACK_RULE_GOVERNANCE.md)(Threshold·Cap·Limit·Budget·Funding·Stacking·Conflict·Override·Decision·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_PROGRAM_RULE_GOVERNANCE.md`](../architecture/ADR_DSAR_CASHBACK_PROGRAM_RULE_GOVERNANCE.md).
> 선행: Monetary Value(4-5-1-4)·Identity(4-5-1-3)·Entity Model(4-5-1-2)·Provider Inventory(4-5-1-1)·Reward Governance(4-4)·Coupon/Campaign.
> **범위**: Cashback 적립·지급·출금 처리 아님 — Program/Definition/Rule **기준정보·버전 관리 기반**(다음 Part 4-5-2-2 Eligibility·Trigger).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Cashback Program / Definition / Rule (고객 대상)** | ❌ **부재(grep 0)** — `cashback` 관련 파일·테이블 전무. `적립금`/`point_discount`=마켓 정산(Part 4-3·KEEP_SEPARATE) | **NOT_APPLICABLE → 신설(전방호환)** |
| **Rule Registry + Trigger + is_active 패턴** | △ **CouponEngine `coupon_rules`**: trigger_name(signup/upgrade/renewal/term_3mo/6mo/12mo·UNIQUE)·is_active·plan·duration_days·max_uses·note. `getActiveRule(trigger)`. | **VALIDATED_LEGACY·KEEP_SEPARATE_WITH_REASON**(GeniegoROI **자체 구독 쿠폰** 트리거 규칙·고객 cashback 아님. Rule Registry+trigger+is_active **참조 패턴**) |
| **Percentage / Fixed / Tiered Calculation** | △ Coupon discount(CouponAdmin·percentage/fixed 할인)·CouponEngine=plan/duration_days(정률/정액 rate 없음·무료기간) | **부분 인접(Coupon 할인)** · Cashback Calculation Policy = **NOT_APPLICABLE → 신설** |
| **Rule Version / Effective Time / Superseded** | ❌ **부재** — coupon_rules=단순 UPDATE(is_active toggle)·**rule version/effective time/superseded/migration 미보존** | **NOT_APPLICABLE → 신설** · **★현행 rule version 부재=GAP** |
| **Scope Policy (Tenant/Brand/Store/Merchant/Product/Category)** | ❌ 부재 — coupon_rules=trigger만·scope 없음. Coupon=구독 plan scope만 | **NOT_APPLICABLE → 신설** |
| **Threshold / Cap / Limit / Frequency** | △ coupon_rules=max_uses·free_coupons max_uses/usable_from·Referral per-referred UNIQUE | **부분 인접(max_uses/usable_from)** · Cashback Cap/Limit/Frequency = **NOT_APPLICABLE → 신설** |
| **Budget / Funding Reference** | ❌ 부재(Reward Funding 부재·Part 4-5-1-4) | **NOT_APPLICABLE → 신설** |
| **Currency / Rounding / Stacking / Exclusion / Priority / Conflict / Override** | ❌ 부재(고객 cashback 규칙 엔진 부재) | **NOT_APPLICABLE → 신설** |
| **Campaign Engine (인접)** | △ `AutoCampaign`·`admin_growth_campaign`·`line_campaigns` | **KEEP_SEPARATE**(마케팅 캠페인·cashback 아님) |

**★결론(정직)**: **고객 대상 Cashback Program/Definition/Rule 엔진은 부재(NOT_APPLICABLE)**. 실체=**CouponEngine `coupon_rules`**(GeniegoROI **자체 구독 쿠폰** 트리거 규칙·Rule Registry+trigger+is_active **참조 패턴**·단 **rule version/scope/cap/stacking/calculation rate 부재=GAP**·KEEP_SEPARATE). Coupon 할인(percentage/fixed)·Campaign(AutoCampaign)은 **인접**(cashback 아님·KEEP_SEPARATE). `적립금`/`point_discount`=마켓 정산(KEEP_SEPARATE). 본 Cashback Registry=멀티테넌트 고객용 미래 cashback의 전방호환 계약. **CouponEngine의 trigger-based rule 패턴을 참조하되 version/scope/cap/calculation/stacking을 추가**·지어내기·NO_DATA/오탐 금지.

---

## 1. Canonical Entity (31) — §5

CASHBACK_DISCOVERY_PROFILE·PROGRAM·PROGRAM_VERSION·DEFINITION·DEFINITION_VERSION·RULE·RULE_VERSION·CALCULATION_POLICY·TRIGGER_POLICY·SCOPE_POLICY·ELIGIBILITY_POLICY_REFERENCE·THRESHOLD_POLICY·LIMIT_POLICY·CAP_POLICY·FREQUENCY_POLICY·BUDGET_REFERENCE·FUNDING_REFERENCE·CURRENCY_POLICY·ROUNDING_POLICY·STACKING_POLICY·EXCLUSION_POLICY·PRIORITY_POLICY·CONFLICT_RESULT·RULE_OVERRIDE·RULE_DECISION·RULE_CANDIDATE·RULE_RECONCILIATION·RULE_COVERAGE·RULE_GAP·RULE_EVIDENCE·RULE_AUDIT_EVENT.
**현행 실체**: RULE(coupon_rules·trigger+is_active·구독 쿠폰·KEEP_SEPARATE 참조)·CALCULATION(Coupon 할인 인접) = 부분. 나머지 = **신설**.

## 2. Discovery Profile (§6) · Program (§7·§8·§9) ★Program≠Definition≠Rule

- **Profile(§6)**: cashback_discovery_profile_id·provider/account id·tenant·brand·store_ids·merchant_ids·legal_entity·environment·region·supported currencies·program/rule/version/calculation/trigger model·eligibility/limit/budget/funding/stacking/conflict/override support·historical/deleted rule coverage·source of truth·owner·version·status·evidence. → 부재·신설.
- **Program(§7)**: cashback_program_id·provider/account·external program id·name·**program type**·tenant·brand·store/merchant scope·legal entity·region·supported currencies·customer segment/channel scope·funding model·budget reference·settlement model·validity·status·version·owner·evidence.
- **Program Type(§8, 18)**: GENERAL·PURCHASE·FIRST_PURCHASE·SUBSCRIPTION·RENEWAL·REFERRAL·LOYALTY_TIER·CAMPAIGN·MERCHANT_FUNDED·BRAND_FUNDED·PAYMENT_METHOD·CARD_LINKED·PRODUCT_SPECIFIC·CATEGORY_SPECIFIC·SERVICE_RECOVERY·REACTIVATION·PARTNER·CUSTOM.
- **Program 상태(§9, 12)**: DRAFT·ACTIVE·ACTIVE_WITH_WARNINGS·SCHEDULED·PAUSED·**BUDGET_EXHAUSTED**·SUSPENDED·EXPIRED·ARCHIVED·DEPRECATED·DELETED·UNKNOWN. **★§4.8 BUDGET_EXHAUSTED≠Rule Inactive**.
**★§4.1 Program(운영 체계)≠Definition(혜택 정의)≠Rule(계산·대상·한도·조건) 분리**. 현행 coupon_rules=Program/Definition/Rule 미분리(trigger 단일)=참조 시 분리 신설.

## 3. Definition (§10) · Type (§11) · Version (§12)

- **Definition(§10)**: cashback_definition_id·program·external definition id·name·customer-facing title·description reference·**cashback type·calculation policy·reward/customer display/settlement currency·payout destination support·expiration support·transferability·withdrawal support·tax reference**·status·version·valid from/to·evidence.
- **Type(§11, 16)**: PERCENTAGE·FIXED_AMOUNT·TIERED·VOLUME·PROGRESSIVE·PRODUCT_SPECIFIC·CATEGORY_SPECIFIC·MERCHANT_SPECIFIC·BRAND_SPECIFIC·PAYMENT_METHOD_SPECIFIC·CARD_LINKED·SUBSCRIPTION_SPECIFIC·REFERRAL_SPECIFIC·HYBRID·MANUAL·CUSTOM.
- **Definition Version(§12)**: cashback_definition_version_id·definition·previous version·changed fields·effective from/to·**value model impact·customer display impact·active rule impact·historical transaction behavior·migration policy**·actor·approval·reason·evidence.
→ 부재·신설. **★§4.3 정률/정액/구간형 혼용 금지·§4.2 현재 Rule만 저장 금지(Version 보존)**.

## 4. Rule (§13) · Type (§14) · 상태 (§15) · Version (§16)

- **Rule(§13)**: cashback_rule_id·program·definition·external rule id·name·**rule type·calculation policy·trigger policy·eligibility policy reference·scope policy·threshold/limit/cap/frequency policy·budget/funding reference·currency/rounding/stacking/exclusion/priority policy**·valid from/to·timezone·status·version·owner·evidence.
- **Rule Type(§14, 19)**: AUTOMATIC·CLAIM_REQUIRED·APPROVAL_REQUIRED·PURCHASE_BASED·PAYMENT_BASED·ORDER_COMPLETION_BASED·SUBSCRIPTION_BASED·RENEWAL_BASED·REFERRAL_BASED·CAMPAIGN_BASED·TIER_BASED·PRODUCT_BASED·CATEGORY_BASED·MERCHANT_BASED·PAYMENT_METHOD_BASED·CARD_LINKED·MANUAL·**AI_RECOMMENDED**·CUSTOM. **★§4.10 AI_RECOMMENDED=Production Rule과 별도 상태(자동 승격 금지)**.
- **Rule 상태(§15, 17)**: DRAFT·REVIEW_PENDING·APPROVED·SCHEDULED·ACTIVE·ACTIVE_WITH_WARNINGS·PAUSED·BUDGET_EXHAUSTED·LIMIT_REACHED·SUSPENDED·EXPIRED·**SUPERSEDED**·DEPRECATED·ARCHIVED·DELETED·BLOCKED·UNKNOWN.
- **Rule Version(§16)**: cashback_rule_version_id·rule·previous version·rule payload reference·**calculation/eligibility/scope/threshold/cap/limit/priority/stacking/funding/budget/currency change·effective from/to·affected active programs·affected pending accruals·migration behavior·rollback reference**·actor·approval·evidence.
**현행 참조**: coupon_rules=trigger_name+is_active(단순 toggle·**rule version/effective time/rollback 부재=GAP**). Rule/Version 신설 시 이 참조 패턴에 version/scope/calculation 추가.

## 5. Calculation Policy (§17·§18) · Eligible Amount Basis (§19) · Included/Excluded (§20)

- **Calculation Policy(§17, 18)**: PERCENTAGE_OF_ELIGIBLE_AMOUNT·FIXED_PER_ORDER/ITEM/SUBSCRIPTION/REFERRAL·TIERED_BY_PURCHASE_AMOUNT/ORDER_COUNT/MEMBER_LEVEL·PROGRESSIVE_RATE·VOLUME_RATE·MERCHANT/PRODUCT/CATEGORY/PAYMENT_METHOD/CARD_LINKED_RATE·HYBRID·MANUAL·CUSTOM.
- **필드(§18)**: calculation_policy_id·method·rate·fixed amount·**eligible amount basis·included/excluded amount types·tier definitions·minimum base amount·maximum eligible amount·pre-discount/post-discount basis·tax inclusive·shipping inclusive·point payment inclusion·coupon discount inclusion·refunded amount treatment·currency·rounding policy**·version·evidence.
- **Eligible Amount Basis(§19, 13)**: ORDER_SUBTOTAL·ORDER_TOTAL·**NET_PAID_AMOUNT**·PRODUCT_AMOUNT·CATEGORY_AMOUNT·SUBSCRIPTION_AMOUNT·RENEWAL_AMOUNT·INVOICE_SUBTOTAL/TOTAL·PAYMENT_CAPTURED_AMOUNT·SETTLED_AMOUNT·MARGIN_AMOUNT·CUSTOM.
- **Included/Excluded(§20)**: Included(Product/Service/Subscription Fee/Add-on/Usage/Shipping/Tax/Fee) · Excluded(**Coupon Discount·Point Redemption·Gift Card·Wallet Credit·Tax·Shipping·Refund·Chargeback**·Previous Balance·Donation·Restricted Item). **Rule Version별 기록**.
→ 부재·신설. **★§4.4 표시 Cashback(최대10%)≠실제 계산(3%)≠한도(5,000원)≠예산소진(0원)**. **현행 인접**: kr_settlement_line 이중차감(vat/coupon_discount/point_discount 제외)=Excluded Amount 실 사례·Pnl NET_PAID.

## 6. Trigger Policy (§21·§22) · Scope Policy (§23) · Eligibility Reference (§24)

- **Trigger(§21, 16)**: ORDER_CREATED/PAID/COMPLETED/FULFILLED·**RETURN_WINDOW_COMPLETED**·PAYMENT_CAPTURED/SETTLED·SUBSCRIPTION_STARTED/RENEWED·PLAN_UPGRADED·REFERRAL_CONVERTED·CAMPAIGN_QUALIFIED·TIER_ACHIEVED·MANUAL_APPROVAL·SCHEDULED·CUSTOM_EVENT. 필드(§22): trigger policy id·type·source object·required source status·event time field·**delay·return window·settlement requirement·idempotency key source·cancellation/reversal trigger**·version·evidence. → 현행 coupon_rules trigger_name(signup/upgrade/renewal·구독 트리거)=참조·cashback trigger 신설. **★idempotency=pg_settlement UNIQUE 패턴 계승**.
- **Scope Policy(§23)**: scope policy id·tenant/brand/store/merchant/seller/region/country/channel/product/category/service/subscription plan ids·payment method types·card programs·customer segments·loyalty tiers·**inclusion/exclusion mode**·valid from/to·version·evidence. **★§4.5 Scope 암묵 추론 금지(명시)**. → 부재·신설(tenant=auth_tenant 재사용).
- **Eligibility Reference(§24)**: Customer Status·Loyalty Membership/Tier·Segment·Subscription·Purchase History·First Purchase·Order Count·Total Spend·Product/Merchant Purchase·Payment Method·Country/Region·Consent·Suppression·Fraud·Previous Cashback·Cooldown·Budget/Global/Member Limit. **상세 평가=다음 Part 4-5-2-2**. **★§4.9 Eligibility(대상 판단)→Calculation(금액) 순서 분리**.

## 7. Program·Rule Matrix (§56) — 현행 실측

| Program | Definition | Rule | Version | Scope | Calculation | Trigger | Cap | Limit | Funding | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| (고객 Cashback) | — | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(부재·신설)** |
| CouponEngine 구독쿠폰(참조·KEEP_SEPARATE) | plan/duration | coupon_rules(trigger+is_active) | **없음(GAP)** | 구독 plan | duration_days(무료기간) | signup/upgrade/renewal/term_* | max_uses | max_uses | PLATFORM(자체) | is_active |
| 마켓 적립금(KEEP_SEPARATE) | — | — | — | — | point_discount(정산 차감) | — | — | — | — | 정산 |
