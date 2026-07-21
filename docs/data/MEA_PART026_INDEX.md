# MEA Part 026 — Enterprise Promotion, Coupon & Campaign Management Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART026_PROMOTION_COUPON_CAMPAIGN_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19 |
| 2 | ADR | `docs/architecture/ADR_MEA_PROMOTION_COUPON_CAMPAIGN_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART026_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART026_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART026_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART026_GOVERNANCE_MECHANISMS.md` | §7~§19 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART026_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-strong / ABSENT-formal.** ★프로모션·쿠폰·캠페인·적격성은 **실재**: `Promotion`(merchant_promotion·effectiveStatus)·`CouponAdmin`(coupon_rules·issue/revoke·max_uses 172차)·`CouponRedeem`(원자 소진 TOCTOU 289차·중복 방지·이중지불 정본)·`AutoCampaign`(budget/guardrails)·`WebPopupCampaign`(A/B 264차)·`CRM::isMarketingSendAllowed`(발송 게이트 SSOT·289차 Eligibility)이나, **형식 통합 Promotion Engine·Eligibility Rule Engine(Stackable/우선순위)·Conflict Detection·Reward Point/Cashback는 미완**(도메인 산재·EPIC 06-A Part 3-2 정합). ★중복 쿠폰/프로모션/발송 게이트 절대 금지(값 분산=회귀·TOCTOU 원자성/발송 게이트 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI Promotion 자동 승인/자동 실행 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Commerce Platform(Part 021~025)+ROI Platform(013~020)+Data Platform(001~012)+EPIC 06-A(Eligibility)+헌법 V3/V4/V5.
- 다음: **MEA Part 027 — Enterprise Inventory & Inventory Intelligence Architecture**(본 Promotion 상속·확장).

## ★Commerce Platform 진행 (Part 021~026)
Part 021 Commerce Foundation · 022 PIM · 023 Pricing · 024 OMS · 025 Customer 360 · **026 Promotion/Coupon/Campaign** → 다음 027 Inventory Intelligence.
