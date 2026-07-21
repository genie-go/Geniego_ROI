# MEA Part 023 — Enterprise Product Pricing & Pricing Intelligence Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART023_PRICING_INTELLIGENCE_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19 |
| 2 | ADR | `docs/architecture/ADR_MEA_PRICING_INTELLIGENCE_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART023_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART023_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART023_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART023_GOVERNANCE_MECHANISMS.md` | §7~§19 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART023_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-strong / ABSENT-formal.** ★가격 최적화·할인·다통화는 **실재**: `PriceOpt`(v420·elasticity 동적가격·optimalPrice·po_elasticity·주문 기반 학습)·`CouponRedeem`(원자 소진·TOCTOU 289차 이중지불 정본)·`Connectors::fxToKrw`(KRW base 다통화)+`Pnl`(보고통화·VAT 267차)·`MenuPricingSync`(master 게이트 287차)·`ChannelSync`(selPrc 286차)이나, **형식 Single Price Authority master·Price Master/Rule version-controlled·Daily/Historical Exchange Rate versioning·Currency Audit(Part 014 판정)·Pricing Governance/Authority(Part 018 판정)는 부재**. ★중복 가격/할인/통화/세금 계산 절대 금지(값 분산=회귀·정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 가격 정책 자동 승인/직접 반영 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Commerce Platform(Part 021)+PIM(Part 022)+ROI Calc·통화(Part 014)+Data Platform(001~012)+헌법 V3/V4/V5.
- 다음: **MEA Part 024 — Enterprise Order Management System (OMS) Architecture**(본 Pricing 상속·확장).

## ★Commerce Platform 진행 (Part 021~023)
Part 021 Commerce Foundation · 022 PIM · **023 Pricing & Pricing Intelligence** → 다음 024 OMS.
