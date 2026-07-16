# CANONICAL DSAR — Reward Discovery Governance (Graph·Candidate·Dedup·Reconciliation·Coverage·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-4 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REWARD_DISCOVERY.md`](CANONICAL_DSAR_REWARD_DISCOVERY.md)(Entity·Lifecycle) + 본 문서(Governance).
> ADR: [`../architecture/ADR_DSAR_REWARD_DISCOVERY_GOVERNANCE.md`](../architecture/ADR_DSAR_REWARD_DISCOVERY_GOVERNANCE.md).

---

## 1. Reward Relationship Graph (§61)

Canonical Person → Loyalty Member → Reward Eligibility · Reward Program → Catalog → Definition → Rule → Trigger Event → Eligibility Evaluation → Qualification → Offer → **Issuance** → {Claim·Activation·Reservation} → **Redemption** → Fulfillment → Settlement. Reward → {Point Transaction·Coupon·Voucher·Wallet·Gift Card·Order·Subscription·Campaign·Referral·Mission·Tier Assignment·Budget·Liability}.

**현행 실선(REAL)**:
- Canonical Person(app_user) → **referral_code**(user_id) → **referral_signup**(referrer_user_id/referred_user_id) → **free_coupons**(reward_coupon_id·COUPON Issuance) → **CouponRedeem**(subscription_expires_at 갱신) → Subscription 연장.
- free_coupons → valid_until(Expiration)·is_revoked(Revocation)·usable_from(Qualification gate)·referredRetained(Fraud gate).
**점선(N/A·향후)**: Program/Catalog/Definition/Rule/Trigger Event/Eligibility/Offer/Fulfillment/Settlement/Inventory/Budget/Liability·Point/Wallet/Gift Card 자산·Tier/Campaign 연결.
**★Reward↔Coupon(free_coupons)=REAL 연결·Reward↔Point(point_discount 마켓)=연결 금지(도메인 분리·오혼입 차단)**.

## 2. Candidate / Match / Inclusion (§62~§64)

- **Candidate(§62)**: candidate_id·request_id·discovery_task_id·provider/account/program/definition/rule id·subject id·loyalty_member_id·eligibility result·qualification status·offer/issuance/claim/activation id·**redemption ids·fulfillment ids·expiration state**·tenant·brand·store·**subject roles·shared context·match confidence·duplicate group·review requirements**·evidence ref.
- **Match(§63)**: EXACT_ISSUANCE_MATCH·EXACT_REDEMPTION_MATCH·EXACT_LOYALTY_MEMBER_MATCH·STRONG_CUSTOMER_RELATIONSHIP·**REFERRER_MATCH·REFEREE_MATCH**·TIER_MEMBER_MATCH·SUBSCRIPTION_OWNER_MATCH·BENEFICIARY_MATCH·SHARED_REWARD_MATCH·OFFER_ONLY·ELIGIBILITY_ONLY·WRONG_SUBJECT·**WRONG_TENANT·WRONG_BRAND**·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED.
- **포함 검증(§64)**: Verified Subject·Reward Subject Role·Loyalty Membership·Program·**Tenant/Brand/Store**·Eligibility Decision·Issuance/Claim/Activation/Redemption Relationship·**Referral Role(Referrer vs Referee)**·Shared Reward Context·Partner Fulfillment Context·Provider·Internal Consistency.
**현행**: Candidate Store 부재 → **N/A**. **★Referral은 referrer_user_id/referred_user_id 로 REFERRER/REFEREE 명확 분리 = §64 역할검증의 정본 사례**(DSAR 시 한 요청주체가 Referrer인지 Referee인지 반드시 구분).

## 3. Deduplication (§65·§66)

중복 그룹: Provider Reward Issuance·Internal Reward Record·Point Earn·Coupon Issuance·Wallet Credit·Gift Card Issuance·Campaign Benefit·CRM Benefit Snapshot·CDP Reward Trait·Warehouse Copy·Webhook Event·Partner Fulfillment Record.
Key: External Reward ID·Reward Issuance ID·**Rule+Subject+Trigger Event**·Idempotency Key·Claim ID·Redemption ID·Fulfillment ID·Referral Relationship ID·Campaign+Member+Reward·Content Hash·Source Lineage.
**현행**: 단일 소스(free_coupons)라 Provider/Internal drift 없음. **★Referral 멱등=referred_user_id UNIQUE(=Subject+Trigger 조합의 실 Dedup Key)**. 도입 시 Idempotency Key·Rule+Subject+Trigger 표준화.

## 4. Reconciliation (§67·§68)

비교 축: Eligibility Result↔Issuance·Qualification↔Issuance·Issuance↔Point/Coupon/Wallet Asset·Claim↔Activation·Redemption↔Order Discount·Redemption↔Fulfillment·Fulfillment↔Partner Response·Settlement↔Actual Cost·Inventory Reservation↔Issuance·Quota Usage↔Issuance Count·Budget Consumption↔Issued/Redeemed Cost·Expired Reward↔Outstanding Liability·Revoked Reward↔Active Asset·**Referral Qualification↔Dual Reward**·Tier Assignment↔Tier Reward·Campaign Audience↔Issuance·Provider Reward↔Internal Reward.
상태(§68): MATCH·ELIGIBILITY_ISSUANCE_MISMATCH·QUALIFICATION_MISMATCH·ISSUANCE_ASSET_MISMATCH·CLAIM_ACTIVATION_MISMATCH·REDEMPTION_MISMATCH·FULFILLMENT_MISMATCH·PARTNER_FULFILLMENT_MISMATCH·SETTLEMENT_MISMATCH·INVENTORY_MISMATCH·QUOTA_MISMATCH·BUDGET_MISMATCH·LIABILITY_MISMATCH·EXPIRATION_MISMATCH·REVOCATION_MISMATCH·**REFERRAL_REWARD_MISMATCH**·TIER_REWARD_MISMATCH·CAMPAIGN_REWARD_MISMATCH·PROVIDER_INTERNAL_MISMATCH·MANUAL_REVIEW·BLOCKED.
**현행**: 실 대사 = **Issuance(referral_signup.reward_coupon_id)↔Coupon(free_coupons.id)** 연결 무결성(applyOnSignup이 발급 후 UPDATE로 연결)·**Revoked/Expired Coupon↔Active 사용 차단**(CouponRedeem 검증). 범용 Reconciliation Job **N/A**.

## 5. Coverage / Gap / Critical Gap (§69~§71)

**Coverage 차원(§69, 35+)**: Program·Catalog·Definition·Rule·Rule Version·Trigger·Eligibility·**Eligibility Evidence**·Qualification·Offer·Impression·Issuance·Claim·Activation·Reservation·Redemption·Fulfillment·Partner Fulfillment·Settlement·Inventory·Quota·Budget·Liability·Expiration·Revocation·Reversal·Replacement·Transfer·Stacking·Mission·**Referral**·Tier Reward·Subscription Reward·Campaign Reward·Evidence.
**Gap Type(§70, 29)**: REWARD_PROGRAM_UNREGISTERED·REWARD_CATALOG_UNREGISTERED·REWARD_DEFINITION_UNMAPPED·REWARD_RULE_UNMAPPED·REWARD_RULE_VERSION_MISSING·REWARD_TRIGGER_UNMAPPED·ELIGIBILITY_POLICY_MISSING·**ELIGIBILITY_DECISION_EVIDENCE_MISSING**·QUALIFICATION_HISTORY_MISSING·REWARD_OFFER/ISSUANCE/CLAIM/ACTIVATION/REDEMPTION/FULFILLMENT_HISTORY_MISSING·PARTNER_FULFILLMENT_UNMAPPED·REWARD_SETTLEMENT/INVENTORY/QUOTA/BUDGET/LIABILITY_MISSING·REWARD_EXPIRATION/REVOCATION/REVERSAL_HISTORY_MISSING·REWARD_STACKING_POLICY_MISSING·**REFERRAL_REWARD_RELATIONSHIP_MISSING**·TIER_REWARD_RELATIONSHIP_MISSING·CAMPAIGN_REWARD_RELATIONSHIP_MISSING·PROVIDER_INTERNAL_REWARD_DRIFT.
**Critical Gap(§71) — High/Critical**: 잘못된 Tenant 고객 발급·Eligibility 근거 없이 발급·동일 Trigger 중복 발급·동일 Reward 이중 Redemption·Inventory/Quota/Budget 초과 발급·Revoked Reward 사용 가능·Expired Reward가 Liability 잔존·**Referral 양측 중 한쪽 누락**·Tier Reward 오티어 발급·Partner Fulfillment 실패를 성공 처리·Redemption 완료·Fulfillment 누락·Reward 비용/Settlement 미추적·AI 추천을 실제 발급으로 기록·Shared Reward 개인 전부 귀속·Provider·Internal 불일치.
**현행 정직 GAP**: **범용 리워드 엔진 부재 = 결함 아니라 `PROVIDER_LIMITATION`/NOT_APPLICABLE**(NO_DATA/오탐 금지). 실 GAP=①Referral **Rule Version/Eligibility Evidence 미보존**(하드상수) ②Reward **Value/Cost/Liability 미추적** ③Referee 보상 없음(정책상). Critical Gap 시 Access Review 차단.

## 6. Discovery Evidence / Explain (§72·§73)

Evidence(§72): request_id·discovery_task_id·provider/account/program/catalog/definition/rule id·subject·loyalty_member_id·endpoint/query template·API version·scope/identity/rule version·date range·**reward status filters·deleted/archived inclusion·pagination·async job**·eligibility/offer/issuance/claim/redemption/fulfillment/expiration/duplicate/excluded count·error·started/completed_at·result hash·audit ref.
Explain(§73): 어떤 Program/Catalog 검색·어떤 Rule 적용·어떤 Trigger 발생·왜 Eligible/Not·어떤 Qualification 완료·어떤 Reward Offered·실제 발급·Claim/Activation 필요·언제/어디 사용·어떤 상품/서비스 Fulfillment·만료/취소/복구·어떤 Inventory/Quota/Budget 소비·비용/Settlement·**어떤 자산(Point/Coupon/Wallet/Gift Card)** 으로 제공·어떤 Provider/Internal 중복 제거·어떤 Coverage Gap.

## 7. Permission Registry (§74)

VIEW_REWARD_{DISCOVERY_PROFILE·PROGRAM·CATALOG·DEFINITION·RULE·RULE_VERSION·TRIGGER_EVENT·ELIGIBILITY·ELIGIBILITY_EVIDENCE·QUALIFICATION·OFFER·ISSUANCE·CLAIM·ACTIVATION·RESERVATION·REDEMPTION·FULFILLMENT·SETTLEMENT·INVENTORY·QUOTA·BUDGET·LIABILITY·EXPIRATION·REVOCATION·REVERSAL·REFERRAL·COVERAGE·EVIDENCE·AUDIT} · RUN_REWARD_RECONCILIATION · MANAGE_REWARD_GAP · ADMIN_REWARD_DISCOVERY_OVERRIDE.
**★위 권한은 Reward 발급·취소·복구·예산/Inventory 변경 실행 권한을 포함하지 않는다**(Discovery=읽기·집행 분리·§59 Subscription 변경 권한 분리와 정합).
**현행**: 별도 리워드 권한 부재. 도입 시 기존 RBAC(viewer<connector<analyst<admin)·TeamPermissions 확장(신규 권한 스토어 금지).

## 8. Static Lint (§75) — CI 차단

Rule↔Issuance 혼용·Eligibility↔Entitlement 혼용·**Offer↔Issuance 혼용·Issuance↔Redemption 혼용·Redemption↔Fulfillment 혼용·AI Recommendation을 Issuance로 저장**·Definition/Rule Version 누락·Eligibility Evidence 누락·**Idempotency Key 없는 Issuance**·Reward Asset 관계 누락·Inventory/Quota/Budget 확인 누락·Expiration History 누락·Revocation 후 Active·Referral Role 미구분·Shared Reward 자동 개인 귀속·Partner Fulfillment 결과 누락·Current Reward만 검색·Internal DB만으로 Complete·Pagination 미완료·Evidence 생성 누락.
**추가(도메인 분리)**: **마켓 적립금/point_discount 를 리워드로 매핑·PM Milestone/Journey를 리워드 미션으로 매핑·쿠폰 redeem 을 범용 Reward Redemption으로 확대 금지**.

## 9. Runtime Guard (§76) — 차단

Invalid Verification Token·Closed/Withdrawn Request·Wrong Provider Account·Wrong Reward Program·**Wrong Tenant·Wrong Brand**·Subject Role 미해결·Eligibility 미검증 Issuance·**Duplicate Trigger Issuance·Duplicate Reward Issuance·Double Redemption**·Inventory 부족·Quota 초과·Budget 초과·**Expired Reward Redemption·Revoked Reward Redemption**·Shared Reward Scope 초과·Referral Fraud·Partner Scope 불일치·Scope 초과 Reward Export·Pagination 미완료 Complete·Critical Schema Drift·Kill Switch.
**현행 실증**: CouponRedeem이 **usable_from(잠금)·referredRetained(먹튀)·valid_until(만료)·is_revoked(취소)** 4중 Guard 실행 = §76 Expired/Revoked/Fraud 차단의 정본. Referral applyOnSignup 자기추천·중복(UNIQUE) 차단 = Duplicate Issuance Guard 실증.

## 10. Error / Warning Contract (§77·§78)

**Error(31)**: REWARD_PROGRAM_NOT_REGISTERED·REWARD_CATALOG_NOT_REGISTERED·REWARD_DEFINITION_NOT_FOUND·REWARD_RULE_NOT_FOUND·REWARD_RULE_VERSION_MISSING·REWARD_TRIGGER_INVALID·REWARD_ELIGIBILITY_POLICY_MISSING·REWARD_ELIGIBILITY_UNRESOLVED·REWARD_ELIGIBILITY_EVIDENCE_MISSING·REWARD_QUALIFICATION_INCOMPLETE·REWARD_OFFER_NOT_FOUND·REWARD_ISSUANCE_NOT_FOUND·**REWARD_DUPLICATE_ISSUANCE**·REWARD_CLAIM_FAILED·REWARD_ACTIVATION_FAILED·REWARD_REDEMPTION_FAILED·**REWARD_DOUBLE_REDEMPTION**·REWARD_FULFILLMENT_FAILED·REWARD_PARTNER_FULFILLMENT_FAILED·REWARD_SETTLEMENT_MISSING·REWARD_INVENTORY_INSUFFICIENT·REWARD_QUOTA_EXCEEDED·REWARD_BUDGET_EXCEEDED·REWARD_LIABILITY_MISMATCH·REWARD_EXPIRATION_HISTORY_MISSING·REWARD_REVOCATION_MISMATCH·REWARD_REFERRAL_RELATIONSHIP_MISSING·REWARD_RECONCILIATION_FAILED·REWARD_COVERAGE_INCOMPLETE·REWARD_CRITICAL_GAP·REWARD_PERMISSION_DENIED·REWARD_RUNTIME_BLOCKED.
**Warning(20)**: REWARD_MULTIPLE_ELIGIBILITY_MATCH·REWARD_RULE_VERSION_WARNING·REWARD_ELIGIBILITY_WARNING·REWARD_OFFER_WARNING·REWARD_ISSUANCE_DELAY_WARNING·REWARD_CLAIM_EXPIRY_WARNING·REWARD_PARTIAL_REDEMPTION_WARNING·REWARD_FULFILLMENT_DELAY_WARNING·REWARD_PARTNER_WARNING·REWARD_INVENTORY_WARNING·REWARD_QUOTA_WARNING·REWARD_BUDGET_WARNING·REWARD_LIABILITY_WARNING·REWARD_EXPIRATION_WARNING·REWARD_REVOCATION_WARNING·REWARD_STACKING_WARNING·REWARD_REFERRAL_WARNING·REWARD_PROVIDER_INTERNAL_DRIFT·REWARD_MANUAL_REVIEW_REQUIRED·REWARD_SLA_RISK.

## 11. Golden Reward Dataset (§79) — 테스트 전용

Program·Catalog(단일/다중 Brand/Store/Region/Wrong Tenant/Archived/Definition Version Change/Legacy) · Eligibility(Tier/Segment/Subscription/Purchase Threshold/Signup/Birthday/Anniversary/Consent/Suppression/Fraud Block/Previous Limit/Cooldown/Inventory·Budget Waiting/Not Eligible/Conditional/Manual Review) · Trigger·Qualification(Purchase/Order/Renewal/Tier Upgrade/**Referral Conversion**/Review/Usage/Mission/**Duplicate Trigger**/Out-of-order/Expired/Revoked) · Offer·Issuance(Auto/Claim/Activation Required/AI Recommended/Viewed/Dismissed/Expired/Scheduled/Success/**Duplicate 차단**/Failure) · Asset(Point/**Coupon**/Voucher/Wallet/Gift Card/Cashback/Free Shipping/Product/Service/Subscription Ext/Upgrade/Fee Waiver/Digital/Partner) · Redemption·Fulfillment(Full/Partial/Multiple/Reservation/Cancel/**Double 차단**/Physical/Digital/Partner/Failure/Retry/**Redemption완료·Fulfillment누락**) · Inventory·Budget(Reservation/Release/Exhausted/Member·Campaign·Global Quota/Budget Available·Exhausted·**Overrun 차단**/Liability/Breakage) · Expiration·Revocation(Scheduled/Grace/Claim/Partial Balance/Revocation/Fraud/Order Cancellation/Reversal/Replacement/Transfer) · **Referral**(Referrer/Referee/**Referral Fraud**)·Tier·Mission · Governance(Shared/Organization/**Wrong Subject 차단·Cross-Tenant 차단**/Pagination 완료·미완료 차단/Provider·Internal Duplicate/Eligibility·Budget Mismatch/Coverage Complete/Critical Gap/Override 허용·금지).
**현행 실 회귀 시드**: Referral 자기추천 차단·중복(UNIQUE) 차단·usable_from 잠금·referredRetained 먹튀차단·valid_until 만료·is_revoked 취소 — 6개는 실 코드로 즉시 Golden 등록 가능.

## 12. Conformance / Legacy Equivalence (§80~§82)

**Conformance(§80)**: 각 Entity에 Provider Account Scope·Tenant/Brand Scope·Subject Role·Rule Version·Eligibility Evidence·Current/Historical State·Asset Relationship·Inventory/Budget·Candidate·Dedup·Reconciliation·Coverage·Evidence·Audit 동일 계약.
**Legacy Equivalence(§81)**: 기존 Referral·Coupon·Mission·Referral 기능과 Program/Definition/Rule/Eligible Member/Offer/Issuance/Claim/Activation/Redemption/Fulfillment/Expiration/Revocation/Referral Reward/Tier Reward/Mission Completion/Inventory/Quota/Budget/Liability/Provider·Internal Match/Error/Warning/Latency/Audit 비교.
**Difference(§82)**: MATCH·EXPECTED_*_CORRECTION(Program/Rule/Eligibility/Issuance/Redemption/Fulfillment/Inventory/Budget/Liability/Expiration/Referral/Tier Reward)·LEGACY_PRIVACY/SECURITY/REWARD_DEFECT·LEGACY_DISCOVERY_GAP·**LEGACY_WRONG_MEMBER_RISK**·CANONICAL_REWARD_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED.
**전환 차단**: UNEXPLAINED·LEGACY_WRONG_MEMBER_RISK·실 고객혜택 영향 LEGACY_REWARD_DEFECT·실 고객영향 LEGACY_DISCOVERY_GAP·CANONICAL_REWARD_DEFECT·Cross-Tenant 결과.

## 13. Observability / Alert / Audit (§83~§85)

**Metrics(§83)**: Program/Catalog/Definition/Rule/Trigger Event/**Duplicate Trigger**/Eligibility Evaluation/Eligible/Not Eligible/Offer/Impression/Issuance/**Duplicate Issuance Block**/Claim/Activation/Reservation/Redemption/**Double Redemption Block**/Fulfillment/Fulfillment Failure/Partner Failure/Inventory Remaining·Mismatch/Quota Usage·Exceeded/Budget Remaining·Exceeded/Liability/Expiration/Revocation/**Referral Reward**/Mission Completion/Reconciliation Mismatch/Coverage Gap/**Wrong Subject Block·Cross-Tenant Block**/Legacy Adapter Usage/P50·P95·P99.
**Alert(§84)**: Program Mapping 누락·Cross-Tenant Reward·Eligibility Evidence 누락·Duplicate Trigger/Issuance 급증·Double Redemption 시도·Inventory 부족·Inventory·Issuance 불일치·Quota/Budget 초과·Liability 급증·Claim/Activation 실패·Fulfillment 지연·Partner 실패·Revoked/Expired Reward 사용 시도·**Referral Reward 불일치**·Tier Reward 오발급·Provider·Internal Drift·Critical Gap·Legacy Adapter 신규 사용·Evidence 누락.
**Audit Event(§85, 37)**: REWARD_DISCOVERY_PROFILE_CREATED … REWARD_DUPLICATE_ISSUANCE_BLOCKED·REWARD_DOUBLE_REDEMPTION_BLOCKED·REWARD_REFERRAL_LINKED·REWARD_RECONCILIATION_COMPLETED·REWARD_GAP_DETECTED·REWARD_RUNTIME_BLOCKED(전 Lifecycle Discovery 이벤트).

## 14. 기존 구현 분류 (§86) · 중복 감사 (§87)

| 구현 | 분류 | 근거 |
|---|---|---|
| `Referral.php`(referral_code·referral_signup) | **VALIDATED_LEGACY · KEEP_SEPARATE_WITH_REASON** | GeniegoROI 자체 구독 성장추천(테넌트 최종고객 리워드 아님). 무결성 패턴=Canonical 참조 정본 |
| `free_coupons`+`CouponRedeem` | **VALIDATED_LEGACY**(COUPON 자산 SSOT) | 구독쿠폰 발급/상환·valid_until/usable_from/is_revoked/use_count. Canonical COUPON Type=이 SSOT 재사용(중복 엔진 금지) |
| 마켓 `적립금`/`point_discount`(KrChannel/Pnl/OrderHub/Rollup/PgSettlement) | **KEEP_SEPARATE_WITH_REASON** | 마켓플레이스 정산 차감 라인·읽기전용·리워드 아님(Part 4-3 동일) |
| `PM\Milestones`·badge·achievement | **KEEP_SEPARATE_WITH_REASON** | 프로젝트관리 모듈·고객 리워드 아님 |
| `journey_enrollments`(JourneyBuilder) | **KEEP_SEPARATE_WITH_REASON** | 마케팅 여정 Enrollment·리워드 아님(Part 4-2 동일) |
| Reward Program/Catalog/Definition/Rule/Eligibility/Offer/Issuance(범용)/Fulfillment/Inventory/Budget/Liability | **UNVERIFIED → NOT_APPLICABLE** | 엔진 부재(grep 0)·향후 신설 |

**중복 감사(§87)**: 현행 리워드 소스 단일(Referral+free_coupons)·**중복 Reward Program Registry/Catalog/Eligibility Engine/Issuance History/Redemption History 없음**(drift 위험 0). 도입 시 **Provider별 독립 Candidate Store·Request Type별 독립 Reward Discovery Engine 생성 금지**(단일 엔진).

## 15. 기능 후퇴 방지 · 회귀 게이트 (§88·§95)

변경 전후 비교: Referral 프로그램·free_coupons Catalog/Definition·쿠폰 만료/취소·CouponRedeem 먹튀게이트·Referrer/Referee 분리·멱등·Existing API Compatibility(`/auth/referral/*`·`/coupon/redeem`). **승인되지 않은 기능 감소 시 전환 차단**.
**검증 게이트(§95)**: Program/Catalog Registry·Definition/Version·Reward Type↔원본 Asset 연결·**Value↔실제 Cost 분리**·Rule/Version·Trigger Dedup·Eligibility Policy·**Decision Evidence 보존**·Qualification 추적·**Offer≠Issuance·Recommendation≠Issuance**·**Issuance Idempotency**·Claim/Activation·Reservation/Redemption·Partial·**Redemption≠Fulfillment**·Partner Fulfillment·Settlement·Inventory/Quota/Budget·Liability·Expiration/Revocation/Reversal·Replacement/Transfer·Stacking/Conflict·Mission/Achievement·**Referral 양측 관계**·Tier/Subscription/Campaign Reward·Relationship Graph·**Candidate Subject Role+Scope**·Provider·Internal Dedup·Reconciliation·Coverage/Gap/Evidence·Static Lint/Runtime Guard·Golden/Conformance·기존 구현 분류·**기존 정상 기능 임의삭제 금지**·ADR/PM/Repeat Problem/Agent History 갱신.

## 16. 영구 규칙 (§98)

신규 Reward Program/Type/Rule/Trigger/Fulfillment Provider 추가 전: ①Provider·Program Scope ②**Tenant/Brand/Store Scope** ③Definition/Version 등록 ④**Value/Cost Model** ⑤Rule/Trigger/Eligibility ⑥Decision Evidence ⑦Qualification/Issuance Lifecycle ⑧Claim/Activation 필요여부 ⑨Redemption/Fulfillment 관계 ⑩Asset Relationship ⑪Inventory/Quota/Budget 영향 ⑫Liability/Settlement 영향 ⑬Expiration/Revocation/Reversal 정책 ⑭Stacking/Conflict 정책 ⑮Candidate/Dedup ⑯Reconciliation/Coverage ⑰Golden/Conformance ⑱Static Lint/Runtime Guard ⑲중복·기능후퇴 검사 ⑳ADR·PM 기록. **Provider별 독립 DSAR Request Registry/Candidate Store/Coverage Engine/Reward Discovery Engine 생성 금지(단일 엔진). 마켓 적립금↔리워드↔쿠폰↔포인트↔PM/Journey 오혼입 금지. Referral 무결성 패턴(멱등·역할분리·먹튀게이트)을 Canonical 리워드 엔진에 필수 계승**.

## 17. Reward Coverage Matrix(§94) — 현행

| Request | Program | Rule | Eligibility | Offer | Issuance | Claim | Redemption | Fulfillment | Expiration | Budget | Overall |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 구독회원 DSAR | REFERRAL 1(self) | 하드상수(Version N/A) | isSubscriber(Evidence N/A) | N/A | ✅ coupon(멱등) | N/A | ✅ CouponRedeem | ✅ 구독연장 | ✅ valid_until | N/A | **PARTIAL(Referral+Coupon만)** |
| (테넌트 최종고객 리워드) | — | — | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(엔진 부재)** |
