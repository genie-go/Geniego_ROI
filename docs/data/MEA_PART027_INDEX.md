# MEA Part 027 — Enterprise Inventory & Inventory Intelligence Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART027_INVENTORY_INTELLIGENCE_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19 |
| 2 | ADR | `docs/architecture/ADR_MEA_INVENTORY_INTELLIGENCE_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART027_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART027_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART027_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART027_GOVERNANCE_MECHANISMS.md` | §7~§19 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART027_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-strong / ABSENT-formal.** ★재고는 **앱의 최강 도메인 중 하나로 광범위 실재**: `Wms`(wms_stock·on_hand SSOT·wms_movements·wms_lots·wms_lot_consumptions·wms_bins·205차 backend)·FEFO(consumeLotsFefo/transferLotsFefo)·FEFO COGS(fefoCogsForRef)·할당(allocate/allocationPlan)·Bin(zone/aisle/rack/slot)·조정(adjustStock)·orphan 병합(286차)·Replenishment(`DemandForecast`+`RuleEngine` reorder)·deadStock(288차)이나, **형식 Stock Reservation Engine(Expiration/Release/Backorder)·Replenishment Engine(Safety Stock/Reorder Point/Min-Max)·Serial Number 추적은 미완**(Part 021 정합). ★중복 재고/LOT/FEFO/COGS 도메인 절대 금지(값 분산=회귀·재고 SSOT/FEFO COGS 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 재고 수량 직접 변경/자동 승인 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Commerce Platform(Part 021~026)+ROI Platform(013~020·Part 016 Profit·017 Forecast)+Data Platform(001~012)+헌법 V3/V4/V5.
- 다음: **MEA Part 028 — Enterprise Payment, Billing & Settlement Architecture**(본 Inventory 상속·확장).

## ★Commerce Platform 진행 (Part 021~027)
Part 021 Commerce Foundation · 022 PIM · 023 Pricing · 024 OMS · 025 Customer 360 · 026 Promotion/Coupon/Campaign · **027 Inventory Intelligence** → 다음 028 Payment/Billing/Settlement.
