# MEA Part 033 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 033 SPEC/ADR.

## 전수조사 방법
receiving/putaway/picking/packing/bin/slot/cyclecount/warehouse/movement 키워드로 `backend/src/Handlers/Wms.php` 전수 grep + 판독.

## 실존 substrate (★WMS 최강 실재·창고 운영 핵심)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 창고 마스터 | 창고·type/temp | `Wms.php`(wms_warehouses:59) | PARTIAL-strong |
| 입고(Receiving) | Inbound movement | `Wms.php`(wms_movements:77·recordMovement:662·createMovement:592) | PARTIAL-strong |
| 적치(Put-away) | 적치·bin 추천 | `Wms.php`(putAway:1768·pickBinForSku:1792) | PARTIAL-strong |
| Bin/Storage Location | zone/aisle/rack/slot | `Wms.php`(wms_bins:233·resolveBin:1504·listBins:1567·slotFromCode:1559) | PARTIAL-strong |
| 피킹(Picking) | 피킹 작업 | `Wms.php`(wms_picking:84·listPicking:1304·savePicking:1313) | PARTIAL-strong |
| 이동(Movement) | 재고 이동 | `Wms.php`(applyMovementToStock:1091·adjustStock:1122) | PARTIAL-strong |
| FEFO/LOT | 유효기간 출고 | `Wms.php`(consumeLotsFefo·Part 027) | PARTIAL-strong |
| 재고 SSOT | on_hand | `Wms.php`(wms_stock:98) | PARTIAL-strong |
| 창고 RBAC | warehouse별 role | `Wms.php`(wms_permissions:72·guardWarehouse:557) | PARTIAL-strong |
| Carrier/Supplier | 택배사·공급사 | `Wms.php`(wms_carriers:66·wms_suppliers:105) | PARTIAL-strong |
| CCTV/IoT | 온프렘 브리지 | `WmsCctv.php`(274차) | PARTIAL |
| Warehouse ROI | FEFO COGS | `Rollup`/`Pnl`(fefoCogsForRef) | PARTIAL |

## 부재(ABSENT-formal) — 고급 WMS 기능 (grep 판정)
ASN Processing·RFID Receiving·형식 Quality/Damage Inspection 워크플로우·Shortage Detection·Wave/Batch/Zone/Cluster Picking·Pick-to-Light/Voice/Mobile Picking·형식 Packing 워크플로우(Packing Validation/Packaging Recommendation)·Shipping Manifest/Dock Scheduling·Cold Storage/Bonded/Automated/Smart/Micro Fulfillment 유형·Cross-Dock·IoT/Robotics 연동·형식 Cycle Count 워크플로우·PALLET/CONTAINER 형식 엔티티·Event 표준(GoodsReceived 등).

## 판정
**PARTIAL-strong / ABSENT-formal(고급).** ★WMS는 **앱의 최강 도메인 중 하나로 창고 운영 핵심 광범위 실재**: `Wms`(창고 마스터 wms_warehouses·입고 wms_movements/recordMovement·적치 putAway/pickBinForSku·Bin wms_bins/resolveBin·피킹 wms_picking/savePicking·이동 applyMovementToStock·FEFO consumeLotsFefo·재고 SSOT wms_stock·창고 RBAC wms_permissions·Carrier/Supplier)·`WmsCctv`(274차 온프렘 브리지)이나, **고급 기능(ASN/RFID/형식 QC/Wave·Batch·Zone·Cluster Picking/Pick-to-Light·Voice/Packing 워크플로우/Dock Scheduling/Cold Storage·Bonded·Automated 유형/Cross-Dock/IoT·Robotics/형식 Cycle Count)은 부재**(205차 backend·TMS Part 032와 대조). 실행은 고급 기능 신설(기본 창고 재구현 없이·라이브 검증 후) 종속.
