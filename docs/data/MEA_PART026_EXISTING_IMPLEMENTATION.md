# MEA Part 026 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 026 SPEC/ADR.

## 전수조사 방법
coupon/promotion/campaign/eligib/reward/benefit/isMarketingSendAllowed/stackable 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★프로모션·쿠폰·캠페인·적격성)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 프로모션(할인코드) | merchant_promotion | `Promotion.php`(v429·:51·effectiveStatus:65) | PARTIAL-strong |
| 쿠폰 관리 | 룰·발급·revoke | `CouponAdmin.php`(172차·coupon_rules:38·issue:19·revoke:21·max_uses) | PARTIAL-strong |
| 쿠폰 소진(원자성) | 중복 방지 | `CouponRedeem.php`(redeem:33·preview:181·TOCTOU 289차) | PARTIAL-strong |
| 캠페인 | budget·guardrails | `AutoCampaign.php`(auto_campaign:45·budget:50·guardrails:65) | PARTIAL-strong |
| 웹팝업 캠페인 | A/B | `WebPopupCampaign.php`(264차) | PARTIAL |
| 적격성/발송 게이트 | 단일 SSOT | `CRM::isMarketingSendAllowed`(289차 Eligibility·frequency_window) | PARTIAL-strong |
| Audience | 세그먼트 | `CRM`(crm_segments·Part 025) | PARTIAL-strong |
| Membership Coupon | plan | `CouponAdmin`(plan·217차) | PARTIAL |
| 평가 | A/B | `AbTesting.php` | PARTIAL |
| AI(추천/남용) | 추천·이상 | `AutoRecommend`·`Mmm`·`AnomalyDetection` | PARTIAL |
| Audit/Integrity | 해시체인·random_bytes | `SecurityAudit`·`CouponRedeem`(random_bytes) | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 통합 Promotion Engine (도메인 산재)
형식 통합 Promotion Engine(Promotion/Coupon/Campaign 산재)·Eligibility Rule Engine(통합 Stackable/우선순위·EPIC 06-A Part 3-2 정합)·Promotion Conflict Detection/Priority·Reward Point/Cashback·형식 Budget Control·Benefit Management Service·Promotion Master(단일 SSOT)·Event 표준(PromotionCreated 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★프로모션·쿠폰·캠페인·적격성은 **실재**: `Promotion`(merchant_promotion·effectiveStatus)·`CouponAdmin`(coupon_rules·issue/revoke·max_uses 172차)·`CouponRedeem`(원자 소진 TOCTOU 289차·중복 방지)·`AutoCampaign`(budget/guardrails)·`WebPopupCampaign`(A/B 264차)·`CRM::isMarketingSendAllowed`(발송 게이트 SSOT·289차 Eligibility)이나, **형식 통합 Promotion Engine·Eligibility Rule Engine(Stackable/우선순위)·Conflict Detection·Reward Point/Cashback은 부재**(도메인 산재·Part 021 정합·EPIC 06-A Part 3-2 정합). 실행은 통합 오케스트레이션 계층 신설(도메인 재구현 없이) 종속.
