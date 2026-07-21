# MEA Part 027 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 027 SPEC/ADR.

## 전수조사 방법
stock/inventory/lot/batch/fefo/fifo/allocate/reserv/reorder/replenish/deadstock 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★재고 마스터·LOT/FEFO·이동·할당·최강 도메인)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 재고 마스터(SSOT) | on_hand | `Wms.php`(wms_stock:98·on_hand) | PARTIAL-strong |
| 재고 이동 | Inbound/transfer | `Wms.php`(wms_movements:77·applyMovementToStock:1091) | PARTIAL-strong |
| LOT/유효기간 | expiry | `Wms.php`(wms_lots:91·listLots:1448·createLot:1458) | PARTIAL-strong |
| FEFO | 유효기간 우선 출고 | `Wms.php`(consumeLotsFefo:1159·transferLotsFefo:1194) | PARTIAL-strong |
| FEFO COGS | 원가 산출 | `Wms.php`(fefoCogsForRef:1257·fefoUnitCost:1267) | PARTIAL-strong |
| 할당(Allocation) | 창고 할당 | `Wms.php`(allocate:351·allocationPlan:1014) | PARTIAL-strong |
| Bin/Location | zone/aisle/rack/slot | `Wms.php`(wms_bins:233·listBinStock:1636) | PARTIAL-strong |
| 재고 조정 | adjust·strictOut | `Wms.php`(adjustStock:1122·setSkuStock:629) | PARTIAL-strong |
| orphan 병합 | wh_id 폴백 병합 | `Wms.php`(consolidateOrphanStock:866·286차) | PARTIAL-strong |
| Replenishment | 수요예측 보충 | `DemandForecast.php`(Part 017)·`RuleEngine`(reorder) | PARTIAL |
| deadStock | 과잉/사장재고 | `Wms`(288차) | PARTIAL |
| Warehouse Access | 창고 가드 | `Wms.php`(guardWarehouse:557) | PARTIAL-strong |
| Audit | wms_movements·해시체인 | `Wms`·`SecurityAudit` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Reservation/Replenishment Engine (grep 판정)
형식 Stock Reservation Engine(Order Reservation·Expiration·Release·Backorder 명시적 예약 테이블)·Replenishment Engine(Safety Stock·Reorder Point·Min-Max 형식)·Serial Number 추적(LOT은 실재·Serial 부재)·형식 Inventory Analytics(Turnover/DOI/Fill Rate)·Cycle Count/Physical Inventory 워크플로우·Consignment Inventory·Event 표준(InventoryReceived 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★재고는 **앱의 최강 도메인 중 하나로 광범위 실재**: `Wms`(wms_stock·on_hand SSOT·wms_movements·wms_lots·wms_lot_consumptions·wms_bins·205차 backend)·FEFO(consumeLotsFefo/transferLotsFefo)·FEFO COGS(fefoCogsForRef)·할당(allocate/allocationPlan)·Bin(zone/aisle/rack/slot)·조정(adjustStock)·orphan 병합(286차)·Replenishment(`DemandForecast`+`RuleEngine`)·deadStock(288차)이나, **형식 Stock Reservation Engine(Expiration/Release)·Replenishment Engine(Safety Stock/Reorder Point)·Serial Number 추적은 부재**(Part 021 정합). 실행은 형식 Engine 신설(재고 재구현 없이) 종속.
