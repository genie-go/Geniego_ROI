# MEA Part 026 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Promotion/CouponAdmin/CouponRedeem/AutoCampaign/isMarketingSendAllowed 재사용·형식 통합 Promotion Engine greenfield·Part 021/023/025 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | PROMOTION | merchant_promotion | `Promotion.php`(:51) | PARTIAL-strong |
| 2 | PROMOTION_POLICY | 룰·정책(부분) | `Promotion`·`CouponAdmin` | PARTIAL |
| 3 | PROMOTION_RULE | 쿠폰 룰 | `CouponAdmin.php`(coupon_rules:38) | PARTIAL |
| 4 | CAMPAIGN | auto_campaign | `AutoCampaign.php`(:45) | PARTIAL-strong |
| 5 | CAMPAIGN_TARGET | 세그먼트 연계 | `CRM`(crm_segments) | PARTIAL |
| 6 | COUPON | 발급·룰 | `CouponAdmin.php`·`CouponRedeem.php` | PARTIAL-strong |
| 7 | COUPON_BATCH | 발급(부분·batch 형식) | `CouponAdmin`(issue) | PARTIAL |
| 8 | BENEFIT | 할인/쿠폰 혜택 | `Promotion`·`CouponRedeem` | PARTIAL |
| 9 | REWARD | 부재(Reward Point/Cashback) | — | ABSENT-formal |
| 10 | ELIGIBILITY_RULE | 발송 게이트 SSOT | `CRM::isMarketingSendAllowed`(289차) | PARTIAL-strong |
| 11 | PROMOTION_BUDGET | 캠페인 budget | `AutoCampaign`(budget/guardrails) | PARTIAL |
| 12 | PROMOTION_RESULT | 평가·A/B | `AbTesting`·`CouponRedeem`(사용) | PARTIAL |
| 13 | PROMOTION_STATUS | effectiveStatus | `Promotion.php`(:65)·`CouponAdmin`(is_active) | PARTIAL-strong |
| 14 | PROMOTION_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | CAMPAIGN_SCHEDULE | 캠페인 스케줄(부분) | `AutoCampaign`·`WebPopupCampaign` | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Discount=Promotion·Coupon=CouponAdmin/CouponRedeem·Membership=CouponAdmin(217차)·웹팝업=WebPopupCampaign. Cashback/Reward=ABSENT.
- **§7 Lifecycle(10)**: Promotion effectiveStatus·CouponAdmin is_active/revoke·형식 Lifecycle Manager=부분.
- **§8 Rule Engine(10)**: Customer Eligibility=isMarketingSendAllowed(SSOT)·Membership=CouponAdmin(plan)·Stackable/우선순위(형식)=부분.
- **§9 Coupon(10)**: ★CouponAdmin(룰/발급/revoke/max_uses)+CouponRedeem(원자 소진 289차·중복 방지)·QR/Barcode=부분.
- **§10 Campaign(8)**: AutoCampaign(budget/guardrails)·Audience=CRM 세그먼트·평가=AbTesting·형식 Campaign Manager=부분.
- **§11 Benefit&Reward(10)**: Discount/Coupon=Promotion/CouponRedeem·Membership Upgrade=CouponAdmin·★Reward Point/Cashback=ABSENT.
- **§12 Governance(8)**: Approval=CouponAdmin(revoke)·Budget=AutoCampaign·★Conflict Detection/Priority=ABSENT.
- **§13 Security**: Tenant/RBAC/Coupon Integrity(원자성·random_bytes)/Audit(Part 021 상속).
- **§17 AI**: 추천=AutoRecommend·ROI 예측=Mmm·남용=AnomalyDetection·Budget 최적화=Mmm(frontier)·Explainability=헌법 V4·자동 승인/실행 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§4·§6·§10·§13·§14=프로모션/캠페인/쿠폰/적격성/상태/감사) / PARTIAL(§2·§3·§5·§7·§8·§11 부분·§12·§15) / ABSENT-formal(§9 REWARD·형식 통합 Promotion Engine/Eligibility Rule Engine/Conflict Detection/Reward·Cashback).** 코드 0. ★프로모션(`Promotion`)·쿠폰(`CouponAdmin`/`CouponRedeem`)·캠페인(`AutoCampaign`)·적격성(`CRM::isMarketingSendAllowed`) 재사용(★중복 쿠폰/프로모션/발송 게이트 절대 금지·TOCTOU 원자성/발송 게이트 정본 재구현 금지)·형식 통합 Promotion Engine 신설(도메인 재구현 없이)·Part 021/023/025 상속·★AI Promotion 자동 승인/자동 실행 불가(V3+V5+CHANGE_GATE).
