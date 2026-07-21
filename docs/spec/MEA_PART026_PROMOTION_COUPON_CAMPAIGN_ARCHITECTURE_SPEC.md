# MEA Part 026 — Enterprise Promotion, Coupon & Campaign Management Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 021(Commerce Foundation)+023(Pricing)+025(Customer 360)+Data Platform+ROI Platform**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**프로모션/쿠폰/캠페인/적격성은 이미 실재**(GT①·`Promotion`·`CouponAdmin`·`CouponRedeem`·`AutoCampaign`·`CRM::isMarketingSendAllowed`)·본 Part는 형식 통합 Promotion Engine/Eligibility Rule Engine 계층만 추가(도메인 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
모든 프로모션/쿠폰/캠페인/이벤트/고객 혜택 통합 관리. Pricing/OMS/Customer 360/Marketing/Marketplace/ROI/AI 연계 Enterprise Promotion Framework.

## §2 구현 범위
Promotion/Coupon/Campaign/Benefit/Reward Management · Eligibility Engine · Promotion Analytics · Governance · Runtime · AI Promotion Intelligence.

## §3 구현 목표 (10)
Promotion Engine · Coupon Engine · Campaign Manager · Benefit Management Service · Eligibility Rule Engine · Promotion Analytics Service · Promotion Dashboard · Promotion Governance Manager · Promotion Audit Service · AI Promotion Advisor.

## §4 아키텍처 원칙 (10)
Promotion First · Policy Driven · Rule Based · Event Driven · Explainable Promotion · Reusable Campaign · Metadata Driven · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
PROMOTION · PROMOTION_POLICY · PROMOTION_RULE · CAMPAIGN · CAMPAIGN_TARGET · COUPON · COUPON_BATCH · BENEFIT · REWARD · ELIGIBILITY_RULE · PROMOTION_BUDGET · PROMOTION_RESULT · PROMOTION_STATUS · PROMOTION_AUDIT · CAMPAIGN_SCHEDULE. → 상세 = `MEA_PART026_CANONICAL_ENTITIES.md`.

## §6 Promotion Domain (10)
Discount/Coupon/Membership/Seasonal/Flash Sale/Event/Cashback/Bundle/Marketplace Promotion · Enterprise Campaign. Promotion Master 기준. → ★현행=Discount=`Promotion`(merchant_promotion)·Coupon=`CouponAdmin`/`CouponRedeem`·Membership=`CouponAdmin`(217차)·Bundle=`ProductAddon`·웹팝업=`WebPopupCampaign`(264차). Cashback/Reward(형식)=부분.

## §7 Promotion Lifecycle (10)
Draft→Rule Definition→Validation→Approval→Scheduled→Active→Suspended→Expired→Closed→Archived. 미승인 실행 금지. → ★현행=`Promotion`(effectiveStatus·상태 매핑)·`CouponAdmin`(is_active/revoke)·`AutoCampaign`(상태). 형식 통합 Lifecycle Manager=부분.

## §8 Promotion Rule Engine (10)
Customer/Product/Category/Channel/Region Eligibility · Membership/Order Amount/Quantity/Time/Stackable Rule. 정책 기반. → ★현행=Customer Eligibility=`CRM::isMarketingSendAllowed`(발송 게이트 SSOT·289차 Eligibility Engine)·Membership=`CouponAdmin`(plan)·Order Amount=`CouponRedeem`(조건). ★Stackable/우선순위 형식 Rule Engine=부분(EPIC 06-A Part 3-2 Eligibility 정합).

## §9 Coupon Management (10)
Single/Batch/Unique/Reusable/Membership/Welcome/Referral/QR/Barcode/Digital Coupon. 사용 이력·중복 검증. → ★★현행=`CouponAdmin`(coupon_rules·issue·revoke·max_uses·172차)·`CouponRedeem`(redeem·preview·★원자 소진 UPDATE+rowCount TOCTOU 289차·중복 방지·GT①). 쿠폰 실 강함. QR/Barcode(형식)=부분.

## §10 Campaign Management (8)
Planning · Audience Selection · Scheduling · Multi-Channel · Budget · Execution · Monitoring · Evaluation. Customer Segment 연계. → ★현행=`AutoCampaign`(auto_campaign·budget·guardrails·landing_url)·Audience=`CRM`(crm_segments·Part 025)·웹팝업=`WebPopupCampaign`(A/B 264차)·Evaluation=`AbTesting`. 형식 통합 Campaign Manager=부분.

## §11 Benefit & Reward (10)
Discount/Coupon/Cashback/Reward Point/Free Shipping/Gift/Membership Upgrade/Loyalty/Partner/AI Personalized Benefit. ROI 효과 기록. → ★현행=Discount/Coupon=`Promotion`/`CouponRedeem`·Membership Upgrade=`CouponAdmin`(plan·upgrade)·Loyalty=`CRM`(grade)·AI Personalized=`AutoRecommend`. ★Reward Point/Cashback 형식=ABSENT.

## §12 Promotion Governance (8)
Approval Workflow · Budget Control · Rule Version · Promotion Priority · Conflict Detection · Compliance · Rollback · Audit Trail. 충돌 자동 검증. → ★현행=Approval=`CouponAdmin`(revoke·admin)·Budget=`AutoCampaign`(budget/guardrails)·Audit=`SecurityAudit`. ★Conflict Detection/Priority 형식=ABSENT.

## §13 Data Security
Tenant Isolation · RBAC · Budget Protection · Promotion Rule Protection · Audit Logging · Coupon Integrity Validation. → ★Part 021 상속: Tenant=`Db.php`·RBAC=`index.php`·Coupon Integrity=`CouponRedeem`(원자성·bin2hex random_bytes)·Audit=`SecurityAudit`.

## §14 Runtime 규칙
Promotion Rule 검증 · Customer Eligibility · Coupon 검증 · Benefit 계산 · Budget 확인 · Event · Audit. → ★현행=Eligibility=`CRM::isMarketingSendAllowed`·Coupon=`CouponRedeem`(원자성)·Benefit=`Promotion`/`CouponRedeem`·Audit=`SecurityAudit`.

## §15 API 표준 (8)
Create/Update Promotion · Publish Campaign · Issue/Validate Coupon · Apply Promotion · Query Campaign Result · Query Audit. → ★현행=`Promotion` API(/v429/promotions)·`CouponAdmin` API(/v424/admin/coupons/*·issue·revoke)·`CouponRedeem` API·`AutoCampaign` API 실재. Part 001 API 표준(`/api` 접두) 상속.

## §16 Event 표준 (8)
PromotionCreated/Approved/Activated · CampaignStarted · CouponIssued · CouponRedeemed · PromotionCompleted · PromotionAudited. → ★현행=`CouponAdmin`(issue=CouponIssued)·`CouponRedeem`(redeem=CouponRedeemed) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI Integration
최적 Promotion 추천 · 고객별 혜택 추천 · Campaign 대상 추천 · Promotion ROI 예측 · Coupon 남용 탐지 · Promotion 충돌 분석 · Budget 최적화 · Explainable Promotion Report. **AI는 Promotion 자동 승인/자동 실행 불가.** → ★현행=Promotion 추천=`AutoRecommend`·Campaign 대상=`Decisioning`(no-PII)·ROI 예측=`Mmm`·Coupon 남용=`AnomalyDetection`·Budget 최적화=`Mmm`(frontier)·Explainability=헌법 V4·자동 실행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
Rule 평가 ≤100ms · Coupon 검증 ≤100ms · 적용 ≤200ms · Campaign 조회 ≤300ms · Dashboard ≤2초 · Availability ≥99.99%. (현행 handler seed.)

## §19 Completion Criteria
Promotion Engine·Coupon Engine·Campaign Management·Eligibility Rule Engine·Benefit Management·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(프로모션/쿠폰/캠페인/적격성 실재·형식 통합 Promotion Engine·Eligibility Rule Engine·Conflict Detection=미완). 코드 0.

## 판정
**PARTIAL-strong(★프로모션=`Promotion`(merchant_promotion·effectiveStatus)·쿠폰=`CouponAdmin`(coupon_rules·issue/revoke·max_uses 172차)+`CouponRedeem`(원자 소진 TOCTOU 289차·중복 방지)·캠페인=`AutoCampaign`(budget/guardrails)+`WebPopupCampaign`(A/B 264차)·적격성=`CRM::isMarketingSendAllowed`(발송 게이트 SSOT·289차 Eligibility)·Audience=`CRM` 세그먼트(Part 025)·평가=`AbTesting`·AI=`AutoRecommend`/`Mmm`) / ABSENT-formal(형식 통합 Promotion Engine(Promotion/Coupon/Campaign 산재)·Eligibility Rule Engine(통합 Stackable/우선순위·EPIC 06-A Part 3-2 정합)·Promotion Conflict Detection/Priority·Reward Point/Cashback·Budget Control(형식)·Benefit Management Service·Event 표준).** ★핵심=프로모션·쿠폰·캠페인·적격성은 **실재**(Promotion/CouponAdmin/CouponRedeem 원자성 정본·AutoCampaign·isMarketingSendAllowed SSOT)이나 형식 통합 Promotion Engine·Eligibility Rule Engine·Conflict Detection은 부재(도메인 산재·Part 021 정합·EPIC 06-A Eligibility 정합). Part 021/023/025/Data Platform 상속(재정의 금지)·★중복 쿠폰/프로모션/발송 게이트 절대 금지(값 분산=회귀·TOCTOU 원자성/발송 게이트 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI Promotion 자동 승인/자동 실행 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 027 — Enterprise Inventory & Inventory Intelligence Architecture(본 Promotion 상속·확장).
