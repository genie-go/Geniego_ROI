# MEA Part 033 — Governance Mechanisms (§7~§20 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★창고 운영(`Wms` 입고/적치/보관/Bin/피킹/이동/FEFO/창고 RBAC)·CCTV(`WmsCctv`)·SecurityAudit 재사용(★중복 창고/재고/Bin/FEFO 절대 금지·Part 027 관점 분리)·고급 기능 순신설(과대주장 금지)·Part 031/027 상속.

## §7 Lifecycle 거버넌스
Receiving→Inspection→Put-away→Storage→Replenishment→Picking→Packing→Shipping→Inventory Count→Archive·실시간 추적. 현행=Receiving=`Wms`(recordMovement)·Put-away=`Wms`(putAway)·Storage=`Wms`(wms_bins)·Picking=`Wms`(savePicking)·Shipping=`Wms`(reflectChannelSale)·Replenishment=`DemandForecast`(Part 027). ★추적=wms_movements+`SecurityAudit`. Inspection/Count 워크플로우=순신설.

## §8 Receiving 거버넌스
ASN/Goods Receiving/Barcode/RFID/Quality·Damage Inspection/Shortage/Confirmation·입고 즉시 Inventory 동기화. 현행=Goods Receiving=`Wms`(wms_movements Inbound·recordMovement)·Barcode=`Wms`(wms_bins barcode)·동기화=`Wms`(applyMovementToStock·원자성). ★ASN/RFID/형식 QC/Shortage=순신설.

## §9 Put-away 거버넌스
Automatic/Manual/Location Recommendation/Capacity Validation/Zone·Temperature·Hazardous Allocation/Overflow·정책+AI 추천. 현행=Put-away=`Wms`(putAway)·Location Recommendation=`Wms`(pickBinForSku·bin 추천)·Zone=`Wms`(wms_bins zone/aisle/rack/slot). ★Capacity(capacity seed)/Temperature/Hazardous/Overflow=순신설.

## §10 Picking 거버넌스
Wave/Batch/Zone/Cluster Picking/Pick-to-Light/Voice/Mobile/Priority·SLA·출고 우선순위. 현행=Picking=`Wms`(wms_picking·listPicking/savePicking)·FEFO 출고=`Wms`(consumeLotsFefo). ★Wave/Batch/Zone/Cluster/Pick-to-Light/Voice/Mobile Picking=순신설(기본 picking만 실재).

## §11 Packing & Shipping 거버넌스
Packing Validation/Packaging Recommendation/Label/Barcode/Manifest/Carrier Assignment/Dock Scheduling/Confirmation·출고 시 TMS/OMS 연계. 현행=Carrier=`Wms`(wms_carriers)·Shipping=`Wms`(reflectChannelSale)·OMS=`OrderHub`·Label/추적=`Logistics`. ★Packing 워크플로우/Manifest/Dock Scheduling=순신설.

## §12 Analytics 거버넌스
Capacity/Storage Utilization/Picking·Packing Productivity/Dock Utilization/Inventory Accuracy/Fulfillment Rate/Warehouse ROI. 현행=Inventory Accuracy=`Wms`(wms_stock SSOT)·deadStock(288차)·Warehouse ROI=`Rollup`/`Pnl`(FEFO COGS). ★Storage Utilization/Productivity/Dock Utilization=순신설.

## §13 Governance 거버넌스
Receiving/Storage/Picking/Packing/Shipping/Safety Policy·Compliance·Audit Trail. 현행=Policy=`Wms`(stockPolicies)·창고 RBAC=`Wms`(wms_permissions)·Audit=`SecurityAudit`. 형식 통합 Governance Manager=순신설.

## §14 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·★창고 RBAC=`Wms`(wms_permissions·warehouse별 role·guardWarehouse)·Warehouse Encryption=`Crypto`·★IoT Device Auth=`WmsCctv`(274차 온프렘 브리지·인증 장비)·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]])+wms_movements.

## §15 Runtime 거버넌스
입고 검증·적치 위치 결정·피킹 작업 생성·패킹 검증·출고 처리·Inventory 동기화·Audit. 입고=`Wms`(recordMovement)·적치=`Wms`(putAway/pickBinForSku)·피킹=`Wms`(savePicking)·출고=`Wms`(reflectChannelSale)·동기화=`Wms`(applyMovementToStock 원자성)·Audit=`SecurityAudit`.

## §16 API 거버넌스 (8)
Register Receiving/Complete Put-away/Generate Picking Task/Complete Packing/Confirm Shipment/Query Status·Location·Audit. 현행=`Wms` API(createMovement·putAway·listPicking/savePicking·listBins/listBinStock·listStock) 실재. Packing=순신설. ★$register+`/api` 접두([[reference_api_prefix_routing]]). Part 001 API 표준 상속.

## §17 Event 거버넌스 (8)
GoodsReceived/PutawayCompleted/PickingTaskGenerated/PickingCompleted/PackingCompleted/ShipmentReleased/WarehouseCountCompleted/WarehouseAudited. 현행=`Wms`(wms_movements·재고 델타 자동 푸시 283차) seed(동기·event-driven 부재). Data Platform §15 정합.

## §18 AI 거버넌스
최적 적치 위치/피킹 동선/작업량 예측/공간 최적화/재고 이동/작업자 생산성/병목 예측/Explainable. 현행=적치 추천 seed=`Wms`(pickBinForSku)·작업량=`DemandForecast`·재고 이동=`Wms`(transferLotsFefo)·이상=`AnomalyDetection`·Explainability=헌법 V4. ★AI는 창고 작업 자동 승인/재고 직접 이동 불가=헌법 V3+V5(안전 자동화)+`CHANGE_GATE`. 피킹 동선/공간 최적화 AI=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §19~§20 성능·완료
성능=`Wms` sqlite(소유권 273차) seed(벤치 대상 미존재). 완료=고급 기능(ASN/RFID/Wave Picking/Packing 워크플로우/Dock Scheduling/IoT/Robotics) 구현 시(기본 창고 실재·코드 0). ★단 창고 운영 핵심은 최강 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★창고 운영(`Wms` 입고/적치/보관/Bin/피킹/이동/FEFO/창고 RBAC)·CCTV(`WmsCctv`)·재고 SSOT(`Wms`)·Warehouse ROI(`Rollup`/`Pnl`)·Audit(`SecurityAudit`) 재사용·승격(★중복 창고/재고/Bin/FEFO 절대 금지=값 분산=회귀·재고 SSOT/FEFO COGS 정본 재구현 금지·Part 027 관점 분리)·고급 기능(ASN/RFID/Wave·Batch·Zone·Cluster Picking/Pick-to-Light·Voice/Packing 워크플로우/Dock Scheduling/Cold Storage·Bonded 유형/Cross-Dock/IoT·Robotics/Cycle Count)만 신설(기본 창고 재구현 없이·과대주장 금지·라이브 검증 후). Part 031/027/024/016/Data Platform/헌법 상속·재정의 금지·★AI 창고 작업 자동 승인/재고 직접 이동 불가(V3+V5+CHANGE_GATE).
