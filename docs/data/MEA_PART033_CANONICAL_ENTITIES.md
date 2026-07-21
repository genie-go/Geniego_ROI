# MEA Part 033 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Wms 창고 운영 재사용·고급 기능 순신설·Part 031/027/024 상속·Part 027 관점 분리.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | WAREHOUSE | 창고 마스터 | `Wms.php`(wms_warehouses:59) | PARTIAL-strong |
| 2 | DISTRIBUTION_CENTER | 창고 type | `Wms.php`(wms_warehouses type) | PARTIAL |
| 3 | STORAGE_LOCATION | Bin 위치 | `Wms.php`(wms_bins:233) | PARTIAL-strong |
| 4 | BIN | zone/aisle/rack/slot | `Wms.php`(wms_bins·resolveBin:1504) | PARTIAL-strong |
| 5 | RECEIVING_ORDER | Inbound movement | `Wms.php`(recordMovement:662) | PARTIAL(형식 ASN 부재) |
| 6 | PUTAWAY_TASK | 적치 | `Wms.php`(putAway:1768) | PARTIAL-strong |
| 7 | PICKING_TASK | 피킹 | `Wms.php`(wms_picking:84·savePicking:1313) | PARTIAL-strong |
| 8 | PACKING_TASK | 부재(형식 패킹) | — | ABSENT |
| 9 | SHIPPING_ORDER | 출고 | `Wms.php`(reflectChannelSale:768)·`OrderHub` | PARTIAL |
| 10 | INVENTORY_UNIT | 재고 단위(SKU) | `Wms.php`(wms_stock) | PARTIAL-strong |
| 11 | PALLET | 부재(형식 Pallet) | — | ABSENT |
| 12 | CONTAINER | 부재(형식 Container) | — | ABSENT |
| 13 | WAREHOUSE_POLICY | stockPolicies·RBAC | `Wms.php`(stockPolicies:1998·wms_permissions:72) | PARTIAL |
| 14 | WAREHOUSE_AUDIT | wms_movements·해시체인 | `Wms`·`SecurityAudit` | PARTIAL-strong |
| 15 | WAREHOUSE_EXCEPTION | 이상 탐지 | `AnomalyDetection` | PARTIAL |

## §6~§18 표준 판정
- **§6 Domain(10)**: 창고 마스터=Wms(type/temp)·Cold Storage seed=temp. ★Cross Dock/Bonded/Automated/Smart/Micro Fulfillment=부분/부재.
- **§7 Lifecycle(10)**: Receiving=recordMovement·Put-away=putAway·Storage=wms_bins·Picking=savePicking·Shipping=reflectChannelSale·Replenishment=DemandForecast·Inspection/Count 워크플로우=부분.
- **§8 Receiving(8)**: Goods Receiving=wms_movements Inbound·Barcode=wms_bins·즉시 동기화=applyMovementToStock. ★ASN/RFID/형식 QC/Shortage=부재.
- **§9 Put-away(8)**: putAway·Location Recommendation=pickBinForSku·Zone=wms_bins. Capacity/Temperature/Hazardous/Overflow=부분/부재.
- **§10 Picking(8)**: wms_picking·FEFO=consumeLotsFefo. ★Wave/Batch/Zone/Cluster/Pick-to-Light/Voice/Mobile=부재.
- **§11 Packing&Shipping(8)**: Carrier=wms_carriers·Shipping=reflectChannelSale·OMS=OrderHub. ★Packing 워크플로우/Manifest/Dock Scheduling=부재.
- **§12 Analytics(8)**: Inventory Accuracy=wms_stock·ROI=Rollup/Pnl(FEFO COGS)·Storage Utilization/Productivity=부재.
- **§14 Security**: Tenant/★창고 RBAC(wms_permissions/guardWarehouse)/Encryption/Audit/IoT(WmsCctv 274차).
- **§18 AI**: 적치 추천 seed=pickBinForSku·작업량=DemandForecast·이동=transferLotsFefo·Explainability=헌법 V4·창고 작업 자동 승인/재고 직접 이동 불가=헌법 V3+V5+CHANGE_GATE. 피킹 동선/공간 최적화 AI=부재. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§3·§4·§6·§7·§10·§14=창고/Bin/적치/피킹/재고/감사) / PARTIAL(§2·§5·§9·§13·§15) / ABSENT(§8·§11·§12 PACKING/PALLET/CONTAINER·고급 기능).** 코드 0. ★창고 운영(`Wms` 입고/적치/보관/Bin/피킹/이동/FEFO/창고 RBAC) 재사용(★중복 창고/재고/Bin/FEFO 절대 금지·재고 SSOT/FEFO COGS 정본 재구현 금지·Part 027 관점 분리)·고급 기능(ASN/RFID/Wave Picking/Packing/Dock Scheduling/IoT) 순신설(과대주장 금지·라이브 검증 후)·Part 031/027/024 상속·★AI 창고 작업 자동 승인/재고 직접 이동 불가(V3+V5+CHANGE_GATE).
