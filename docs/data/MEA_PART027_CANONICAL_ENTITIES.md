# MEA Part 027 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Wms(wms_stock/wms_lots/wms_movements/wms_bins)·DemandForecast 재사용·형식 Reservation/Replenishment Engine greenfield·Part 021/024/017 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | INVENTORY | wms_stock | `Wms.php`(:98) | PARTIAL-strong |
| 2 | INVENTORY_ITEM | SKU 재고 | `Wms.php`(listStock:1284) | PARTIAL-strong |
| 3 | STOCK | on_hand | `Wms.php`(wms_stock) | PARTIAL-strong |
| 4 | STOCK_LOCATION | 창고/Bin | `Wms.php`(wms_bins:233·warehouses) | PARTIAL-strong |
| 5 | STOCK_BATCH | 배치(LOT 준함) | `Wms.php`(wms_lots) | PARTIAL |
| 6 | LOT | 로트·유효기간 | `Wms.php`(wms_lots:91·createLot:1458) | PARTIAL-strong |
| 7 | SERIAL_NUMBER | 부재(Serial) | — | ABSENT-formal |
| 8 | INVENTORY_RESERVATION | 할당(원자)·형식 예약 부분 | `Wms.php`(allocate:351)·LiveCommerce(289차) | PARTIAL |
| 9 | INVENTORY_MOVEMENT | 이동 | `Wms.php`(wms_movements:77·applyMovementToStock:1091) | PARTIAL-strong |
| 10 | INVENTORY_ADJUSTMENT | 조정 | `Wms.php`(adjustStock:1122) | PARTIAL-strong |
| 11 | REPLENISHMENT_PLAN | 수요예측 보충 | `DemandForecast`·`RuleEngine`(reorder) | PARTIAL |
| 12 | SAFETY_STOCK | 부재(형식 Safety Stock) | — | ABSENT-formal |
| 13 | INVENTORY_STATUS | 재고 상태·deadStock | `Wms`(288차) | PARTIAL |
| 14 | INVENTORY_AUDIT | wms_movements·해시체인 | `Wms`·`SecurityAudit` | PARTIAL-strong |
| 15 | INVENTORY_POLICY | stockPolicies | `Wms.php`(stockPolicies:1998) | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Warehouse=Wms(wms_stock)·Marketplace=ChannelSync·Available/Reserved=Wms(allocate)·Returned=OrderHub. Damaged/Consignment=부분.
- **§7 Lifecycle(10)**: Receiving=Wms(wms_movements Inbound)·Allocation=allocate·Adjustment=adjustStock·추적=wms_movements+SecurityAudit·형식 state machine=부분.
- **§8 Reservation(8)**: allocate/allocationPlan·원자 재고(289차)·형식 Expiration/Release/Backorder=부분.
- **§9 Allocation(8)**: ★FEFO=consumeLotsFefo/transferLotsFefo·Bin=wms_bins·FIFO/Serial(형식)=부분.
- **§10 Replenishment(8)**: Demand Forecast=DemandForecast(Part 017)·reorder=RuleEngine·Transfer=transferLotsFefo·형식 Safety Stock/Reorder Point/Min-Max=부분.
- **§11 Analytics(10)**: deadStock(288차·Aging/Slow Moving)·Inventory ROI=Rollup/Pnl(FEFO COGS)·형식 Turnover/DOI/Fill Rate=부분.
- **§12 Governance(8)**: Policy=stockPolicies·Adjustment=adjustStock·orphan 병합(286차)·Cycle Count/Physical(형식)=부분.
- **§13 Security**: Tenant/RBAC/Warehouse Access(guardWarehouse)/Audit(Part 021 상속).
- **§17 AI**: 부족/보충=DemandForecast·과잉/deadStock=Wms·이상=AnomalyDetection·Explainability=헌법 V4·재고 직접 변경/자동 승인 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~4·§6·§9·§10 adj·§14=재고/위치/LOT/FEFO/이동/조정/감사) / PARTIAL(§5·§8·§11·§13·§15) / ABSENT-formal(§7 SERIAL·§12 SAFETY_STOCK·형식 Reservation Engine(expiration)/Replenishment Engine(safety stock/reorder)/Serial 추적/Inventory Analytics).** 코드 0. ★재고 마스터(`Wms` wms_stock)·LOT/FEFO/COGS(`Wms`)·이동/할당(`Wms`)·Replenishment(`DemandForecast`) 재사용(★중복 재고/LOT/FEFO/COGS 도메인 절대 금지·재고 SSOT/FEFO COGS 정본 재구현 금지)·형식 Reservation/Replenishment Engine 신설(재고 재구현 없이)·Part 021/024/017 상속·★AI 재고 수량 직접 변경/자동 승인 불가(V3+V5+CHANGE_GATE).
