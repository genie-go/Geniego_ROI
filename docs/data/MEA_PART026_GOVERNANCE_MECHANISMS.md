# MEA Part 026 — Governance Mechanisms (§7~§19 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★프로모션(`Promotion`)·쿠폰(`CouponAdmin`/`CouponRedeem`)·캠페인(`AutoCampaign`)·적격성(`CRM::isMarketingSendAllowed`)·SecurityAudit 재사용(★중복 쿠폰/프로모션/발송 게이트 절대 금지)·형식 통합 Promotion Engine 신설(도메인 재구현 없이).

## §7 Lifecycle 거버넌스
Draft→Rule Definition→Validation→Approval→Scheduled→Active→Suspended→Expired→Closed→Archived·미승인 실행 금지. 현행=`Promotion`(effectiveStatus)·`CouponAdmin`(is_active/revoke)·`AutoCampaign`(상태). 형식 통합 Lifecycle Manager=순신설.

## §8 Rule Engine 거버넌스
Customer/Product/Category/Channel/Region Eligibility·Membership/Order Amount/Quantity/Time/Stackable Rule. 현행=Customer Eligibility=`CRM::isMarketingSendAllowed`(발송 게이트 SSOT·frequency_window·289차)·Membership=`CouponAdmin`(plan)·Order Amount=`CouponRedeem`(조건). ★Stackable/우선순위 형식 Rule Engine=순신설(EPIC 06-A Part 3-2 Eligibility 정합·isMarketingSendAllowed 승격).

## §9 Coupon 거버넌스
Single/Batch/Unique/Reusable/Membership/Welcome/Referral/QR/Barcode/Digital·사용 이력·중복 검증. 현행=`CouponAdmin`(coupon_rules·issue·revoke·max_uses)+`CouponRedeem`(★원자 소진 UPDATE+rowCount·TOCTOU 289차·중복 방지·쿠폰코드 bin2hex random_bytes 안전). ★이중지불 방지 정본. QR/Barcode(형식)=순신설.

## §10 Campaign 거버넌스
Planning/Audience/Scheduling/Multi-Channel/Budget/Execution/Monitoring/Evaluation. 현행=`AutoCampaign`(budget·guardrails·landing_url)·Audience=`CRM`(crm_segments·Part 025)·웹팝업=`WebPopupCampaign`(A/B 264차)·Evaluation=`AbTesting`. ★Customer Segment 연계·형식 통합 Campaign Manager=순신설.

## §11 Benefit & Reward 거버넌스
Discount/Coupon/Cashback/Reward Point/Free Shipping/Gift/Membership Upgrade/Loyalty/Partner/AI Personalized·ROI 효과 기록. 현행=Discount/Coupon=`Promotion`/`CouponRedeem`·Membership Upgrade=`CouponAdmin`(plan·upgrade)·Loyalty=`CRM`(grade)·AI Personalized=`AutoRecommend`. ★Reward Point/Cashback 형식=순신설(중복 혜택 계산 금지).

## §12 Governance 거버넌스
Approval Workflow/Budget Control/Rule Version/Promotion Priority/Conflict Detection/Compliance/Rollback/Audit Trail·충돌 자동 검증. 현행=Approval=`CouponAdmin`(revoke·admin)·Budget=`AutoCampaign`(guardrails)·Audit=`SecurityAudit`. ★Conflict Detection/Priority 형식=순신설.

## §13 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(viewer<connector<analyst<admin+writeGuard)·Budget Protection=`AutoCampaign`(guardrails)·Coupon Integrity=`CouponRedeem`(원자성·bin2hex random_bytes·289차)·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]]).

## §14 Runtime 거버넌스
Promotion Rule 검증·Customer Eligibility·Coupon 검증·Benefit 계산·Budget 확인·Event·Audit. Eligibility=`CRM::isMarketingSendAllowed`·Coupon=`CouponRedeem`(원자성)·Benefit=`Promotion`/`CouponRedeem`·Audit=`SecurityAudit`.

## §15 API 거버넌스 (8)
Create/Update Promotion·Publish Campaign·Issue/Validate Coupon·Apply Promotion·Query Campaign Result·Query Audit. 현행=`Promotion` API(/v429/promotions)·`CouponAdmin` API(/v424/admin/coupons/*)·`CouponRedeem` API·`AutoCampaign` API 실재. ★신규 실배선 `/api` 접두 필수([[reference_api_prefix_routing]]). Part 001 API 표준 상속.

## §16 Event 거버넌스 (8)
PromotionCreated/Approved/Activated/CampaignStarted/CouponIssued/CouponRedeemed/PromotionCompleted/PromotionAudited. 현행=`CouponAdmin`(issue=CouponIssued)·`CouponRedeem`(redeem=CouponRedeemed) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI 거버넌스
최적 Promotion 추천/고객별 혜택/Campaign 대상/ROI 예측/Coupon 남용 탐지/충돌 분석/Budget 최적화/Explainable. 현행=추천=`AutoRecommend`·대상=`Decisioning`(no-PII)·ROI 예측=`Mmm`·남용=`AnomalyDetection`·Budget=`Mmm`(frontier)·Explainability=헌법 V4. ★AI는 Promotion 자동 승인/자동 실행 불가=헌법 V3+V5(안전 자동화)+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §18~§19 성능·완료
성능=handler seed(벤치 대상 미존재). 완료=형식 통합 Promotion Engine/Eligibility Rule Engine/Conflict Detection 구현 시(부분 충족·코드 0). ★단 프로모션·쿠폰·캠페인·적격성은 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★프로모션(`Promotion`)·쿠폰(`CouponAdmin`/`CouponRedeem` 원자성)·캠페인(`AutoCampaign`/`WebPopupCampaign`)·적격성(`CRM::isMarketingSendAllowed` SSOT)·Audit(`SecurityAudit`) 재사용·승격(★중복 쿠폰/프로모션/발송 게이트 절대 금지=값 분산=회귀·TOCTOU 원자성/발송 게이트 정본 재구현 금지)·형식 통합 Promotion Engine/Eligibility Rule Engine/Conflict Detection/Reward·Cashback만 신설(도메인 재구현 없이). Part 021/023/025/Data Platform/헌법 상속·재정의 금지·★AI Promotion 자동 승인/자동 실행 불가(V3+V5+CHANGE_GATE).
