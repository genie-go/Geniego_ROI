# CANONICAL DSAR — Reward Rule·Event·Eligibility·Issuance·Redemption Discovery (Entity·Registry·Lifecycle)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-4 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Discovery/Entity/Lifecycle) + [`CANONICAL_DSAR_REWARD_GOVERNANCE.md`](CANONICAL_DSAR_REWARD_GOVERNANCE.md)(Graph·Candidate·Dedup·Reconciliation·Coverage·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_REWARD_DISCOVERY_GOVERNANCE.md`](../architecture/ADR_DSAR_REWARD_DISCOVERY_GOVERNANCE.md).
> 선행: Loyalty Foundation(4-1)·Membership Lifecycle(4-2)·Point Ledger(4-3)·Order/Payment(3-3-3-3-3-3-3-2)·Subscription(4-1군)·Coupon/Campaign·Verification Token(3-3-3-3-2)·EPIC05 Merge.

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 Entity | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Reward Referral Relationship** | ✅ **REAL** — `Referral.php`: `referral_code`(user_id UNIQUE·code UNIQUE)·`referral_signup`(referred_user_id **UNIQUE**·referrer_user_id·code·reward_coupon_id·reward_status). Referrer/Referee 분리·자기추천 차단·**Idempotency(referred_user_id UNIQUE 선점)**·**Fraud gate**(usable_from 30일 잠금 + `referredRetained` 피추천 활성유지 검증). Alerting::pushEvent 통지. | **VALIDATED_LEGACY · KEEP_SEPARATE_WITH_REASON** (도메인=GeniegoROI **자체 구독** 추천, 테넌트 최종고객 리워드 아님) — 무결성 패턴(멱등·역할분리·먹튀게이트)은 Canonical 고객 리워드 엔진 도입 시 **참조 정본** |
| **Reward Type / Asset** | ✅ **REAL(단일)** — `free_coupons` + `CouponRedeem`(plan·duration_days·max_uses·use_count·is_revoked·**valid_until**(만료)·**usable_from**(잠금)·redeemed_at). Referral 보상=1개월 PRO **coupon**. | **COUPON = VALIDATED_LEGACY**(구독쿠폰 SSOT) · 그 외 Type(POINT/CASHBACK/WALLET/GIFT_CARD/VOUCHER/FREE_SHIPPING/FREE_PRODUCT/FREE_SERVICE/SUB_EXT/UPGRADE/…) = **NOT_APPLICABLE** |
| Reward Program / Catalog / Definition / Rule | ❌ 테이블·구현 **부재(grep 0)** | **NOT_APPLICABLE**(엔진 미보유) |
| Reward Trigger / Trigger Event | ❌ 부재. Referral은 `applyOnSignup(isPaidSignup)` 단일 트리거(구독가입)만 | **NOT_APPLICABLE**(Referral 가입트리거만 REAL·범용 아님) |
| Reward Eligibility Policy / Evaluation / Decision Evidence | ❌ 부재. Referral은 `isSubscriber()`(유료티어+활성구독) 단순판정·Evidence 미보존 | **NOT_APPLICABLE** |
| Reward Qualification | △ Referral `usable_from`(30일 유지)=먹튀방지 조건. 범용 Qualification 엔진 부재 | **NOT_APPLICABLE**(Referral RETAIN gate만 REAL) |
| Reward Offer / Impression | ❌ 부재(Offer≠Issuance 개념 없음) | **NOT_APPLICABLE** |
| Reward Issuance | △ Referral=쿠폰 발급(free_coupons INSERT)·reward_status `granted` 단일상태 | **NOT_APPLICABLE**(범용 Issuance Lifecycle 부재·쿠폰발급만 REAL) |
| Reward Claim / Activation / Reservation | ❌ 부재 | **NOT_APPLICABLE** |
| Reward Redemption | △ `CouponRedeem::redeem`(usable_from + referredRetained 이중검증 → subscription_expires_at 갱신·use_count++) | **COUPON Redemption = VALIDATED_LEGACY** · 범용 = **NOT_APPLICABLE** |
| Fulfillment / Partner Fulfillment / Settlement | ❌ 부재 | **NOT_APPLICABLE** |
| Inventory / Quota / Budget / Liability | ❌ 부재(Referral=쿠폰 max_uses=1·per-referred 1회 UNIQUE만) | **NOT_APPLICABLE** |
| Expiration / Revocation / Reversal / Replacement / Transfer | △ 쿠폰 `valid_until`(만료)·`is_revoked`(취소) REAL·범용 없음 | **COUPON expiry/revoke = REAL** · 범용 = **NOT_APPLICABLE** |
| Stacking / Conflict | ❌ 부재 | **NOT_APPLICABLE** |
| Mission / Challenge / Achievement / Milestone | ❌ 고객 리워드 미션 부재. `PM\Milestones`=프로젝트관리 모듈(고객 리워드 아님). `journey_enrollments`=마케팅 여정(리워드 아님) | **NOT_APPLICABLE** · PM/Journey = **KEEP_SEPARATE** |
| Cashback / 적립금 / Wallet Credit | ❌ 고객 리워드 엔진 부재. `적립금`=마켓플레이스 **정산 차감 라인**(KrChannel/Pnl/OrderHub·`point_discount`와 동일·읽기전용) | **NOT_APPLICABLE** · 마켓 적립금 = **KEEP_SEPARATE**(정산 도메인, Part 4-3 point_discount 동일) |
| Tier Reward / Subscription Reward / Campaign Reward | ❌ 전용 엔진 부재. `crm_customers.grade`=CRM 등급속성(혜택 연결 원장 없음·Part 4-2) | **NOT_APPLICABLE** |

**★결론(정직)**: **GeniegoROI는 범용 Reward Rule/Event/Eligibility/Issuance/Redemption 엔진을 미보유**. 유일한 실 리워드 흐름 = **GeniegoROI 자체 구독 Referral**(referral→free_coupons COUPON 보상, KEEP_SEPARATE — 테넌트 최종고객 리워드가 아니라 GeniegoROI 자신의 성장 추천제도). 마켓 적립금·PM Milestone·Journey는 도메인 분리(KEEP_SEPARATE). 따라서 본 Part의 대부분은 **NOT_APPLICABLE(엔진 부재)** 이며, 프롬프트가 명시한 "**GeniegoROI를 사용하는 모든 고객사가 최종고객에게 제공하는 리워드**"용 **멀티테넌트 고객용 미래 제품**의 **전방호환 계약**으로 기술한다. **Referral의 검증된 무결성 패턴(멱등·Referrer/Referee 분리·먹튀게이트·쿠폰 만료/취소)** 을 Canonical 리워드 엔진의 참조 정본으로 채택한다. 지어내기·NO_DATA/오탐 처리 금지.

---

## 1. Canonical Reward Discovery Entity Model (48 Entity)

`REWARD_DISCOVERY_PROFILE` · `REWARD_PROGRAM` · `REWARD_CATALOG` · `REWARD_DEFINITION` · `REWARD_DEFINITION_VERSION` · `REWARD_VALUE` · `REWARD_RULE` · `REWARD_RULE_VERSION` · `REWARD_TRIGGER` · `REWARD_TRIGGER_EVENT` · `REWARD_ELIGIBILITY_POLICY` · `REWARD_ELIGIBILITY_EVALUATION` · `REWARD_ELIGIBILITY_DECISION` · `REWARD_QUALIFICATION` · `REWARD_OFFER` · `REWARD_OFFER_IMPRESSION` · `REWARD_ISSUANCE` · `REWARD_CLAIM` · `REWARD_ACTIVATION` · `REWARD_RESERVATION` · `REWARD_REDEMPTION` · `REWARD_FULFILLMENT` · `REWARD_SETTLEMENT` · `REWARD_INVENTORY` · `REWARD_QUOTA` · `REWARD_BUDGET` · `REWARD_LIABILITY` · `REWARD_EXPIRATION` · `REWARD_REVOCATION` · `REWARD_REVERSAL` · `REWARD_REPLACEMENT` · `REWARD_TRANSFER` · `REWARD_STACKING_POLICY` · `REWARD_CONFLICT_RESULT` · `REWARD_MISSION` · `REWARD_CHALLENGE` · `REWARD_ACHIEVEMENT` · `REWARD_MILESTONE` · `REWARD_REFERRAL_RELATIONSHIP` · `REWARD_RELATIONSHIP` · `REWARD_CANDIDATE` · `REWARD_DUPLICATE_GROUP` · `REWARD_RECONCILIATION` · `REWARD_COVERAGE_RESULT` · `REWARD_DISCOVERY_GAP` · `REWARD_DISCOVERY_EVIDENCE` · `REWARD_AUDIT_EVENT`.

**현행 실체 여부**: `REWARD_REFERRAL_RELATIONSHIP`(referral_signup·**REAL, KEEP_SEPARATE**) · COUPON형 `REWARD_ISSUANCE`/`REWARD_REDEMPTION`/`REWARD_EXPIRATION`/`REWARD_REVOCATION`(free_coupons·**REAL**) 외 **전 Entity = NOT_APPLICABLE(향후 신설)**.

---

## 2. Reward Discovery Profile (§7)

Program·Provider Account 당: `reward_discovery_profile_id`·provider_id·provider_account_id·loyalty_program_id·**tenant_id·brand_id·store_ids**·legal_entity_id·environment·region·catalog/rule/eligibility/issuance/redemption/fulfillment/inventory/budget/expiration/stacking model·referral/partner/API/webhook/bulk-export support·historical/deleted coverage·owner·version·status·certification_status·last_verified_at.
**현행**: Profile 부재 → GeniegoROI 자체 Referral 1건만 존재(provider=self·program=subscription_referral·type=COUPON·model 전 필드 N/A). 도입 시 **테넌트별 Profile**(고객사 리워드 프로그램)로 확장.

## 3. Reward Program / Type (§8·§9)

`reward_program_id`·loyalty_program_id·name·**program type**(LOYALTY/PROMOTIONAL/**REFERRAL**/MEMBERSHIP_TIER/SUBSCRIPTION/ENGAGEMENT/GAMIFICATION/SERVICE_RECOVERY/PARTNER/EMPLOYEE/CORPORATE/EVENT/RETENTION/REACTIVATION/CUSTOM)·tenant·brand·store/audience scope·funding model·budget ref·validity·status·owner·version·evidence.
**현행**: `REFERRAL` 프로그램 1건(GeniegoROI 구독)·나머지 유형 N/A.

## 4. Reward Catalog / Definition / Type Registry / Value (§10~§14)

- **Catalog(§10)**: catalog_id·program·name·tenant/brand/region/channel·member segment·valid_from/to·inventory/display/personalization policy·status·version·evidence. → **N/A**.
- **Definition(§11)**: definition_id·catalog·external_reward_id·**reward type**·name·customer-facing title·benefit summary·point/coupon/voucher/wallet/gift_card/product/service/entitlement/monetary value ref·currency·inventory ref·fulfillment method·validity·transferability·stackability·taxable·regulatory restriction·status·version·owner·evidence. → **COUPON Definition 1형(1개월 PRO)만 실체**·나머지 N/A.
- **Type Registry(§12)**: POINT·COUPON·VOUCHER·CASHBACK·WALLET_CREDIT·STORE_CREDIT·GIFT_CARD·FREE_SHIPPING·SHIPPING_DISCOUNT·FREE_PRODUCT·PRODUCT_DISCOUNT·FREE_SERVICE·SERVICE_CREDIT·SUBSCRIPTION_EXTENSION·SUBSCRIPTION_UPGRADE·FEE_WAIVER·TRIAL_EXTENSION·DIGITAL_ITEM·BADGE·ACHIEVEMENT·STATUS_BENEFIT·PRIORITY_SUPPORT·EVENT_ACCESS·DRAW_ENTRY·PARTNER_BENEFIT·DONATION·MYSTERY_REWARD·CUSTOM. → **COUPON=REAL·SUBSCRIPTION_EXTENSION**(구독기간 부여, free_coupons.duration_days)=REAL 준함·**나머지 N/A**.
- **Definition Version(§13)**: version_id·definition·previous·changed fields·effective from/to·customer value change·funding/fulfillment change·eligibility impact·**active issuance impact·grandfathering policy**·actor·reason·evidence. → **N/A**(현행 정의 버전 미보존 = 향후 필수).
- **Value Model(§14)**: face value·**monetary equivalent·currency·customer perceived value·funding cost·fulfillment cost·shipping cost·partner settlement cost·liability amount·margin impact·expected/actual incremental revenue**·cost model version·calculated_at·evidence. → **N/A**(§5.7 Value≠실제 Cost 분리 필수).

## 5. Reward Rule / Type / Version (§15~§17)

`reward_rule_id`·program·definition·external_rule_id·name·**rule type**(AUTOMATIC/CLAIM_REQUIRED/CODE_REQUIRED/APPROVAL_REQUIRED/MISSION_COMPLETION/MILESTONE/TIER_ACHIEVEMENT/PURCHASE_THRESHOLD/FREQUENCY/**REFERRAL**/SUBSCRIPTION/USAGE/RETENTION/REACTIVATION/RANDOM_DRAW/FIRST_COME_FIRST_SERVED/MANUAL/AI_RECOMMENDED/CUSTOM)·trigger type·eligibility policy·**qualification threshold·issuance quantity/frequency·per-member/global/budget limit·inventory requirement**·valid from/to·timezone·priority·stacking/exclusion policy·status·version·owner·evidence.
**Rule Version(§17)**: 변경 시 previous·changed conditions/reward/limit/budget/priority·effective time·affected candidates·**affected issued rewards·migration behavior**·actor·approval·evidence.
**현행**: `REFERRAL` 룰 1건(코드로 구독가입→referrer 쿠폰)·상수 하드코딩(REWARD_PLAN='pro'·REWARD_DAYS=30·VALID_DAYS=365·RETAIN_DAYS=30). Rule/Version Registry **N/A**(향후 §5.11 판단근거·Version 필수).

## 6. Reward Trigger / Trigger Event (§18~§20)

Trigger(§18): SIGNUP·FIRST_LOGIN·FIRST_PURCHASE·PURCHASE·ORDER_COMPLETION·PAYMENT_SUCCESS·SUBSCRIPTION_START·SUBSCRIPTION_RENEWAL·PLAN_UPGRADE·REVIEW_SUBMISSION·REFERRAL_CREATED·REFERRAL_CONVERTED·BIRTHDAY·ANNIVERSARY·TIER_UPGRADE·MISSION_COMPLETE·USAGE_THRESHOLD·ENGAGEMENT_THRESHOLD·CART_RECOVERY·SERVICE_FAILURE·SUPPORT_RESOLUTION·MANUAL_EVENT·SCHEDULED_EVENT·AI_DECISION·CUSTOM_EVENT.
Trigger Event(§19): event_id·trigger type·external event id·subject·loyalty member·reward rule·**source object type/id·order/payment/subscription/campaign ref·event time·received time·processed time·deduplication key**·tenant·brand·status·evidence.
Event 상태(§20): RECEIVED·VALIDATING·ACCEPTED·REJECTED·DUPLICATE·ELIGIBILITY_PENDING·QUALIFIED·NOT_QUALIFIED·ISSUANCE_PENDING·COMPLETED·FAILED·EXPIRED·UNKNOWN.
**현행**: `REFERRAL_CONVERTED`(=구독가입) 트리거 1종만 REAL·Event 레코드/Dedup Key 미보존(멱등은 referred_user_id UNIQUE로 대체). 범용 Trigger Event Store **N/A**.

## 7. Eligibility Policy / Evaluation / Result / Decision Evidence (§21~§24)

- **Policy(§21)**: eligibility_policy_id·rule·subject type·member status/tier/segment/subscription/purchase/order count/product/channel/store/region requirement·age·legal restriction·**consent requirement·suppression exclusion·fraud threshold·previous reward exclusion·cooldown·frequency/inventory/budget requirement**·valid from/to·version·evidence.
- **Evaluation(§22)**: evaluation_id·subject·rule·policy version·evaluated_at·context/identity version·membership/tier/subscription state·purchase summary·segment refs·**consent/suppression/fraud/inventory/budget state·previous issuance count**·result·exclusion reasons·evidence.
- **Result(§23)**: ELIGIBLE·CONDITIONALLY_ELIGIBLE·NOT_ELIGIBLE·WAITING_EVENT·WAITING_APPROVAL·WAITING_INVENTORY·WAITING_BUDGET·LIMIT_REACHED·COOLDOWN_ACTIVE·SUPPRESSED·FRAUD_BLOCKED·EXPIRED_POLICY·UNKNOWN·MANUAL_REVIEW.
- **Decision Evidence(§24)**: decision evidence id·evaluation·condition id·input source·input value ref·condition result·rule version·data timestamp·confidence·exclusion reason·audit ref. **민감정보 원문 불필요 복제 금지**.
**현행**: `isSubscriber()`(유료티어+활성구독+비-무료데모) 단순 boolean·Evidence/Exclusion Reason 미보존. Policy/Evaluation/Evidence **N/A**(§5.11 판단근거 보존 필수).

## 8. Qualification (§25·§26)

qualification_id·subject·rule·trigger event·**qualification type·threshold·current progress·completed_at·expiry**·status·issuance ref·evidence.
상태: NOT_STARTED·IN_PROGRESS·COMPLETED·FAILED·CANCELLED·EXPIRED·REVOKED·MANUAL_REVIEW·UNKNOWN.
**현행**: Referral RETAIN gate(usable_from 30일 + referredRetained 활성유지)=먹튀방지 Qualification의 실 사례·범용 Progress 추적 **N/A**. **★미완료 Qualification 발급 금지**(§5.1 Rule Eligible≠Issued).

## 9. Offer / Impression (§27~§29)

Offer(§27): offer_id·subject·definition·rule·eligibility evaluation·channel·placement·offered_at·valid until·claim required·personalized·**AI recommendation ref·experiment ref·holdout**·status·evidence.
상태(§28): CREATED·SCHEDULED·OFFERED·VIEWED·CLICKED·CLAIMED·DISMISSED·EXPIRED·WITHDRAWN·SUPPRESSED·UNKNOWN.
Impression(§29): impression_id·offer·subject·channel·placement·shown_at·viewed_at·clicked_at·dismissed_at·session ref·experiment variant·consent state·evidence.
**현행**: Offer/Impression 개념 부재 → **N/A**. **★Offer≠Issuance(§5.3)·AI 추천≠Issuance(§5.9) 필수**.

## 10. Issuance / Status (§30·§31)

issuance_id·definition·rule·subject·loyalty member·**reward account ref·trigger event·eligibility evaluation·qualification·offer ref·quantity·value ref·issued_at·available_at·expires_at·issuance channel·funding source·budget ref·inventory reservation·status·idempotency key·duplicate group**·evidence.
상태(§31): SCHEDULED·PENDING·ISSUED·AVAILABLE·CLAIM_REQUIRED·CLAIMED·ACTIVATION_REQUIRED·ACTIVATED·PARTIALLY_REDEEMED·REDEEMED·FULFILLED·EXPIRED·REVOKED·REVERSED·REPLACED·FAILED·BLOCKED·UNKNOWN.
**현행**: Referral 쿠폰 발급(free_coupons INSERT)=Issuance의 실 사례이나 **reward_status='granted' 단일상태·available_at(usable_from)·expires_at(valid_until)·idempotency(referred_user_id UNIQUE) REAL**·범용 다상태 Issuance Store **N/A**. **★Idempotency 필수(§5.1·§30) — Referral이 정본 사례**.

## 11. Claim / Activation / Reservation (§32~§35)

- **Claim(§32·§33)**: claim_id·issuance·subject·claim method·**claim token ref**·claimed_at·claim channel·verification status·status·expiry·evidence. 상태: AVAILABLE·CLAIMED·VERIFIED·REJECTED·EXPIRED·CANCELLED·DUPLICATE·FRAUD_BLOCKED·UNKNOWN. **Claim Secret 원문 저장 금지**.
- **Activation(§34)**: activation_id·issuance·subject·activation method·activated_at·valid from/to·channel·device/session ref·status·evidence.
- **Reservation(§35)**: reservation_id·issuance·subject·inventory item·cart/checkout/order ref·reserved_at·expires_at·committed_at·released_at·quantity·status·idempotency key·evidence.
**현행**: Claim/Activation/Reservation 부재 → **N/A**(쿠폰은 코드입력 즉시 redeem·명시 Claim 단계 없음).

## 12. Redemption / Partial (§36~§38)

redemption_id·issuance·definition·subject·**redemption type·redeemed quantity·remaining quantity·monetary value·currency·order/invoice/subscription/point transaction/coupon redemption/wallet/gift card/partner ref·redeemed_at·channel·location/store**·status·evidence.
상태(§37): CREATED·RESERVED·PROCESSING·PARTIALLY_REDEEMED·REDEEMED·FULFILLMENT_PENDING·FULFILLED·CANCELLED·REVERSED·FAILED·EXPIRED·FRAUD_BLOCKED·UNKNOWN.
Partial(§38): original/redeemed/remaining quantity·value allocation·expiration behavior·allowed/cumulative redemption count·final redemption·evidence.
**현행**: `CouponRedeem::redeem`(usable_from + referredRetained 이중검증 → subscription_expires_at 갱신·use_count++·redeemed_at)=**COUPON Redemption REAL**. Partial 미지원(max_uses=1). 범용 Redemption **N/A**. **★Issuance≠Redemption(§5.4)·Redemption≠Fulfillment(§5.5)**.

## 13. Fulfillment / Partner / Settlement (§39~§42)

- **Fulfillment(§39·§40)**: fulfillment_id·redemption·definition·**fulfillment type**(DIGITAL_IMMEDIATE/DIGITAL_ASYNC/PHYSICAL_SHIPMENT/STORE_PICKUP/SERVICE_BOOKING/SUBSCRIPTION_CHANGE/ACCOUNT_CREDIT/POINT_CREDIT/COUPON_ISSUANCE/GIFT_CARD_ISSUANCE/PARTNER_API/MANUAL/OTHER)·provider·merchant/partner·product/service/shipment/entitlement/subscription change ref·scheduled/started/completed/failed_at·status·cost ref·evidence.
- **Partner Fulfillment(§41)**: partner id·account·reward ref·request id·request/response time·partner status·settlement ref·customer communication·failure reason·retry·evidence.
- **Settlement(§42)**: settlement_id·fulfillment·funding party·merchant·partner·**face value·reimbursable amount·actual cost·fee·currency·settlement period/date·accounting ref**·status·evidence.
**현행**: Referral 쿠폰 redeem=SUBSCRIPTION_CHANGE(구독기간 갱신) 준함이나 명시 Fulfillment/Settlement 레코드 없음. **N/A**.

## 14. Inventory / Quota / Budget / Liability (§43~§46)

- **Inventory(§43)**: inventory_id·definition·type·**total/reserved/issued/redeemed/remaining quantity**·restock policy·region·store·valid from/to·status·version·evidence.
- **Quota(§44)**: quota_id·rule·type·global/tenant/brand/store/member/daily/weekly/monthly/campaign limit·consumed/remaining count·reset rule·status·evidence.
- **Budget(§45)**: budget_id·program·campaign·funding source·budget amount·currency·committed/issued/redeemed/settled/remaining amount·period·owner·approval·status·evidence.
- **Liability(§46)**: liability_id·type·**issued but unredeemed quantity·issued value·expected redemption rate·outstanding liability·expired breakage·settled liability**·currency·calculated_at·model version·accounting ref·evidence.
**현행**: 전부 부재 → **N/A**(Referral은 per-referred 1회 UNIQUE·쿠폰 max_uses=1 = 원시 Quota 대체). **★Inventory/Quota/Budget 초과 발급 차단(§76) 필수**.

## 15. Lifecycle 종료 — Expiration / Revocation / Reversal / Replacement / Transfer (§47~§51)

- **Expiration(§47)**: expiration_id·issuance·definition·original/remaining quantity·**scheduled/actual expiry·notice refs·grace period·extension**·status·evidence. → 쿠폰 `valid_until`=REAL·notice/grace/extension N/A.
- **Revocation(§48)**: revocation_id·issuance·reason(fraud/duplicate/order cancellation/eligibility invalidation/membership termination/policy violation)·revoked_at·actor·approval·customer notification·status·evidence. → 쿠폰 `is_revoked`=REAL·구조화 사유 N/A.
- **Reversal(§49)**: reversal_id·redemption·issuance·reversal type·quantity·value·order cancellation·refund ref·fulfillment cancellation·reversed_at·restoration behavior·status·evidence. → **N/A**.
- **Replacement(§50)**: replacement_id·original/replacement issuance·reason·equivalent value·original revoked·replaced_at·actor·evidence. → **N/A**.
- **Transfer(§51)**: transfer_id·source/destination subject·issuance·quantity·value·transfer rule·relationship requirement·requested/approved/completed_at·fee·status·evidence. → **N/A**.
**★Expired·Revoked Reward 사용 차단 필수(§5.8·§76)** — 현행 CouponRedeem이 valid_until/is_revoked/usable_from 검증으로 실증.

## 16. Stacking / Conflict (§52·§53)

Stacking Policy: STACKABLE·NON_STACKABLE·CATEGORY_EXCLUSIVE·BEST_VALUE_ONLY·PRIORITY_BASED·CUSTOMER_CHOICE·PLATFORM_AND_PARTNER·COUPON_EXCLUSIVE·POINT_EXCLUSIVE·CUSTOM.
Conflict Result: conflict result id·subject·candidate/selected/excluded rewards·stacking policy·priority·best value calculation·exclusion reasons·evaluated_at·evidence.
**현행**: 부재 → **N/A**.

## 17. Mission / Challenge / Achievement / Milestone (§54~§56)

Mission: mission_id·program·name·**mission type**(PURCHASE/VISIT/LOGIN/REVIEW/REFERRAL/CONTENT/SOCIAL/USAGE/SUBSCRIPTION/PROFILE_COMPLETION/MULTI_STEP/STREAK/CUSTOM)·steps·completion condition·reward definition·valid period·repeatability·member limit·status·version·evidence.
Challenge/Achievement/Milestone: entity id·subject·definition·progress·threshold·started/completed_at·reward issuance·status·evidence.
**현행**: 고객 리워드 미션 부재 → **N/A**. `PM\Milestones`(프로젝트관리)·`journey_enrollments`(마케팅 여정)=**KEEP_SEPARATE**(리워드 아님·오혼입 금지).

## 18. Referral / Tier / Subscription / Campaign Reward (§57~§60)

- **Referral(§57) ✅REAL**: referral relationship id·**referrer·referee**·referral code ref·referral event·qualifying action·**referrer reward·referee reward**·qualification time·issuance time·fraud state·status·evidence.
  **현행 실측**: referral_signup(referrer_user_id·referred_user_id 분리·code·reward_coupon_id·reward_status)·referral_code(user_id·code). **Referrer 보상=1개월 PRO 쿠폰**(단방향)·**Referee 보상=없음**(현행 정책). 자기추천 차단·**멱등(referred UNIQUE)**·먹튀게이트(usable_from + referredRetained). → **KEEP_SEPARATE**(GeniegoROI 자체 구독 성장추천, 테넌트 최종고객 아님). **★§5.10 Referral 역할 분리·양측 각각 추적 = Referral.php가 정본 패턴**.
- **Tier Reward(§58)**: loyalty member·tier assignment·tier version·reward definition·recurring·anniversary·issued_at·valid period·status·evidence. Tier 변경 후 기존 Tier Reward 처리 정책 기록. → **N/A**(grade만·Part 4-2).
- **Subscription Reward(§59)**: Trial Extension·Free Month·Subscription Credit·Plan Upgrade·Add-on·Fee Waiver·Renewal/Retention/Reactivation Reward. **Subscription 변경 실행과 Reward Discovery 권한 분리**. → Referral 쿠폰=Free Month(PRO) 준함·전용 엔진 **N/A**.
- **Campaign Reward(§60)**: campaign id·audience·segment·experiment·holdout·reward rule·reward definition·issuance/redemption/fulfillment count·cost·revenue impact ref·status·evidence. → **N/A**.

## 19. Reward Lifecycle Matrix(§92) — 현행 실측 예시

| Reward | Rule | Eligible | Offered | Issued | Claimed | Activated | Redeemed | Fulfilled | Status |
|---|---|---|---|---|---|---|---|---|---|
| GeniegoROI 구독 추천보상(1개월 PRO 쿠폰) | REFERRAL(하드상수) | isSubscriber(단순) | N/A(Offer 없음) | ✅ free_coupons INSERT(멱등·usable_from 잠금) | N/A | N/A | ✅ CouponRedeem(usable_from+retained 검증) | ✅ subscription_expires_at 갱신 | granted→redeemed / valid_until 만료 / is_revoked |
| (그 외 모든 리워드 유형) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(엔진 부재)** |

## 20. Reward Cost Matrix(§93) — 현행

| Reward | Funding | Face Value | Actual Cost | Issued | Redeemed | Fulfilled | Liability | Revenue Impact | Status |
|---|---|---|---|---|---|---|---|---|---|
| 구독 추천보상 쿠폰 | Platform-funded(GeniegoROI 자체) | 1개월 PRO 상당 | N/A(미추적) | referral_signup count | rewarded/redeemed count | 구독연장 | **N/A(미계산)** | N/A | — |

**★Value≠실제 Cost(§5.7)**: 현행 Funding Cost/Liability/Margin/Incremental Revenue 미추적 = 도입 시 필수 신설(§14).
