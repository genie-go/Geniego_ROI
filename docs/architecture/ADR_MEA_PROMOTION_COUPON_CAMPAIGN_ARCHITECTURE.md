# ADR — MEA Part 026 Enterprise Promotion, Coupon & Campaign Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part026 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 026은 Promotion/Coupon/Campaign Management. ★코드베이스에는 **프로모션/쿠폰/캠페인/적격성이 이미 실재**: `Promotion.php`(v429·merchant_promotion·effectiveStatus·머천트 할인코드·GT①)·`CouponAdmin.php`(172차·coupon_rules·issue·revoke·max_uses·GT①)·`CouponRedeem.php`(redeem·preview·★원자 소진 UPDATE+rowCount TOCTOU 289차·중복 방지·GT①)·`AutoCampaign.php`(auto_campaign·budget·guardrails·landing_url)·`WebPopupCampaign.php`(웹팝업 A/B 264차)·`CRM::isMarketingSendAllowed`(발송 게이트 SSOT·289차 Eligibility Engine·Part 3-2). 본 Part는 Part 021/023/025 상속(재정의 금지).

## 결정
- **D-1 (Part 021/023/025/Data Platform 재정의 금지):** Commerce Foundation(Part 021)·Pricing(Part 023·할인)·Customer 360(Part 025·세그먼트/적격성)·Metadata(Part 004)를 준수·인용. Promotion 도메인=`Promotion`/`CouponAdmin`/`AutoCampaign`. 중복 정의 금지.
- **D-2 (쿠폰 = CouponAdmin/CouponRedeem 승격·★중복 쿠폰 절대 금지):** 쿠폰 = `CouponAdmin`(coupon_rules·issue/revoke·max_uses)·`CouponRedeem`(원자 소진·preview). ★TOCTOU 이중지불 방지 원자성(289차·UPDATE+rowCount)=정본(재구현 금지)·쿠폰 코드=bin2hex(random_bytes)(289차 안전 확정). ★중복 쿠폰 발급/소진 로직 신설 절대 금지(값 분산=회귀). 형식 Coupon Engine은 `CouponAdmin`/`CouponRedeem`을 승격(쿠폰 재구현 아님).
- **D-3 (프로모션/캠페인 = Promotion/AutoCampaign 승격):** 프로모션 = `Promotion`(merchant_promotion·effectiveStatus)·캠페인=`AutoCampaign`(budget/guardrails)+`WebPopupCampaign`(A/B 264차)·Evaluation=`AbTesting`. ★Audience=`CRM` 세그먼트(Part 025). 형식 통합 Promotion Engine/Campaign Manager=순신설(중복 프로모션/캠페인 금지).
- **D-4 (적격성/발송 게이트 = CRM 승격·★중복 발송 게이트 절대 금지):** Eligibility = `CRM::isMarketingSendAllowed`(발송 게이트 단일 SSOT·frequency_window·289차 Eligibility Engine·Part 3-2·Contactability≠Reachability·Unknown≠Eligible Fail-closed). ★RuleEngine 빈도캡 enforcement=deprecated·CRM 발송 게이트가 단일 SSOT(H2 디덕). ★중복 발송 게이트/빈도캡 신설 절대 금지. 형식 Eligibility Rule Engine(Stackable/우선순위)=순신설(isMarketingSendAllowed 승격).
- **D-5 (Governance/Security/AI = 헌법·무후퇴 정합):** Approval=`CouponAdmin`(revoke·admin)·Budget=`AutoCampaign`(guardrails)·Tenant=`Db.php`·RBAC=`index.php`·Coupon Integrity=`CouponRedeem`(원자성·random_bytes)·Audit=`SecurityAudit`. ★Conflict Detection/Priority·Reward Point/Cashback=순신설. AI(Promotion 추천/ROI 예측/남용 탐지/Budget 최적화)=`AutoRecommend`/`Mmm`/`AnomalyDetection`·Explainability=헌법 V4·★AI Promotion 자동 승인/자동 실행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021/023/025/Data Platform/헌법 상속·재정의 금지·프로모션(`Promotion`)·쿠폰(`CouponAdmin`/`CouponRedeem`)·캠페인(`AutoCampaign`/`WebPopupCampaign`)·적격성(`CRM::isMarketingSendAllowed`)·`SecurityAudit` 재사용(★중복 쿠폰/프로모션/발송 게이트 절대 금지·TOCTOU 원자성/발송 게이트 정본 재구현 금지)·형식 통합 Promotion Engine·Eligibility Rule Engine·Conflict Detection·Reward/Cashback만 신설(도메인 재구현 없이). 실행은 통합 오케스트레이션 계층 신설 종속.
