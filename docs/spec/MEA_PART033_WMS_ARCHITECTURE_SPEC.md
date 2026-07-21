# MEA Part 033 — Enterprise Warehouse Management System (WMS) Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Logistics Platform Foundation(Part 031)+Commerce Platform(Part 027 Inventory·024 OMS)+ROI Platform(016 Profit)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**WMS는 앱의 최강 도메인 중 하나로 광범위 실재**(GT①·`Wms`·205차 backend·wms_warehouses/wms_bins/wms_picking/wms_movements)·본 Part는 형식 통합 WMS 계층 + 고급 기능(ASN/RFID/Wave Picking) 신설(창고 재구현 없이). ★TMS(Part 032)와 대조되는 PARTIAL-strong. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
전 창고/물류센터/허브의 입고/검수/적치/보관/피킹/패킹/출고/재고조사/반품/Cross-Docking·창고 운영 통합 관리. Logistics Foundation/TMS/Inventory/OMS/ERP/IoT/Robotics/ROI/AI 연계 Enterprise Warehouse Framework.

## §2 구현 범위
Warehouse Management · Receiving · Put-away · Inventory Storage · Picking · Packing · Shipping · Warehouse Analytics · Governance · AI Warehouse Intelligence.

## §3 구현 목표 (10)
Warehouse Management Engine · Receiving Engine · Put-away Engine · Picking Engine · Packing Engine · Warehouse Analytics Service · Warehouse Dashboard · Governance Manager · Audit Service · AI Warehouse Advisor.

## §4 아키텍처 원칙 (10)
Warehouse First · Inventory Accuracy · Real-Time Operation · Event Driven · Policy Driven · Metadata Driven · AI Assisted · Enterprise Standard · High Availability · Audit by Default.

## §5 Canonical Entity (15)
WAREHOUSE · DISTRIBUTION_CENTER · STORAGE_LOCATION · BIN · RECEIVING_ORDER · PUTAWAY_TASK · PICKING_TASK · PACKING_TASK · SHIPPING_ORDER · INVENTORY_UNIT · PALLET · CONTAINER · WAREHOUSE_POLICY · WAREHOUSE_AUDIT · WAREHOUSE_EXCEPTION. → 상세 = `MEA_PART033_CANONICAL_ENTITIES.md`.

## §6 Warehouse Domain (10)
Distribution/Fulfillment/Regional/Cross Dock/Cold Storage/Bonded/Automated/Smart/Micro Fulfillment/Enterprise Warehouse. Warehouse Master 기준. → ★현행=`Wms`(wms_warehouses·type/temp·GT①)=창고 마스터 실재(Direct 등)·Cold Storage seed=`Wms`(temp 컬럼). ★Cross Dock/Bonded/Automated/Smart/Micro Fulfillment=부분/부재(형식 유형).

## §7 Warehouse Lifecycle (10)
Receiving→Inspection→Put-away→Storage→Replenishment→Picking→Packing→Shipping→Inventory Count→Archive. 실시간 추적. → ★현행=Receiving=`Wms`(wms_movements Inbound·recordMovement)·Put-away=`Wms`(putAway·pickBinForSku)·Storage=`Wms`(wms_bins/wms_stock)·Picking=`Wms`(wms_picking)·Shipping=`Wms`(reflectChannelSale)·Replenishment=`DemandForecast`(Part 027). ★추적=wms_movements+`SecurityAudit`. Inspection/Count(형식 워크플로우)=부분.

## §8 Receiving Management (8)
ASN Processing · Goods Receiving · Barcode/RFID Receiving · Quality/Damage Inspection · Shortage Detection · Confirmation. 입고 즉시 Inventory 동기화. → ★현행=Goods Receiving=`Wms`(wms_movements Inbound·recordMovement·createMovement)·Barcode=`Wms`(wms_bins barcode)·입고→재고 동기화=`Wms`(applyMovementToStock). ★ASN Processing/RFID/형식 Quality·Damage Inspection/Shortage Detection=부재.

## §9 Put-away Management (8)
Automatic/Manual Put-away · Location Recommendation · Capacity Validation · Zone/Temperature/Hazardous Allocation · Overflow. 정책+AI 추천. → ★★현행=Put-away=`Wms`(putAway·GT①)·Location Recommendation=`Wms`(pickBinForSku·bin 추천)·Zone Allocation=`Wms`(wms_bins zone/aisle/rack/level/slot). ★Capacity Validation(wms_bins capacity seed)·Temperature/Hazardous/Overflow=부분/부재.

## §10 Picking Management (8)
Wave/Batch/Zone/Cluster Picking · Pick-to-Light · Voice · Mobile · Priority Picking. SLA·출고 우선순위. → ★현행=Picking=`Wms`(wms_picking·listPicking/savePicking·GT①)·FEFO 출고=`Wms`(consumeLotsFefo·Part 027). ★Wave/Batch/Zone/Cluster Picking·Pick-to-Light/Voice/Mobile Picking=부재(기본 picking만).

## §11 Packing & Shipping (8)
Packing Validation · Packaging Recommendation · Label Printing · Barcode Verification · Shipping Manifest · Carrier Assignment · Dock Scheduling · Confirmation. 출고 시 TMS/OMS 연계. → ★현행=Carrier Assignment=`Wms`(wms_carriers·Part 032)·Shipping=`Wms`(reflectChannelSale)·Label/Manifest=`Logistics`(추적 seed)·출고→OMS=`OrderHub`. ★Packing Validation/Packaging Recommendation/Dock Scheduling 형식=부재.

## §12 Warehouse Analytics (8)
Capacity/Storage Utilization/Picking·Packing Productivity/Dock Utilization/Inventory Accuracy/Order Fulfillment Rate/Warehouse ROI. → ★현행=Inventory Accuracy=`Wms`(wms_stock·on_hand·재고 SSOT)·deadStock(288차)·Warehouse ROI=`Rollup`/`Pnl`(FEFO COGS). ★Storage Utilization/Picking Productivity/Dock Utilization 형식=부재.

## §13 Warehouse Governance (8)
Receiving/Storage/Picking/Packing/Shipping/Safety Policy · Compliance · Audit Trail. → ★현행=Policy=`Wms`(stockPolicies)·창고 RBAC=`Wms`(wms_permissions·warehouse별 role)·Audit=`SecurityAudit`. ★형식 통합 Governance Manager=부분.

## §14 Data Security
Tenant Isolation · RBAC · Warehouse Data Encryption · IoT Device Authentication · Audit Logging · Secure API Auth. 인증 장비만 연결. → ★현행=Tenant=`Db.php`·★창고 RBAC=`Wms`(wms_permissions·guardWarehouse)·Encryption=`Crypto`·Audit=`SecurityAudit`·CCTV=`WmsCctv`(274차·온프렘 브리지). ★IoT Device Authentication=부분(CCTV 브리지만).

## §15 Runtime 규칙
입고 검증 · 적치 위치 결정 · 피킹 작업 생성 · 패킹 검증 · 출고 처리 · Inventory 동기화 · Audit. → ★현행=입고=`Wms`(recordMovement)·적치=`Wms`(putAway/pickBinForSku)·피킹=`Wms`(savePicking)·출고=`Wms`(reflectChannelSale)·Inventory 동기화=`Wms`(applyMovementToStock·원자성)·Audit=`SecurityAudit`.

## §16 API 표준 (8)
Register Receiving · Complete Put-away · Generate Picking Task · Complete Packing · Confirm Shipment · Query Warehouse Status · Query Inventory Location · Query Audit. → ★현행=`Wms` API(createMovement·putAway·listPicking/savePicking·listBins/listBinStock·listStock·GT①) 실재. Packing 형식=부분. Part 001 API 표준(`/api` 접두·$register) 상속.

## §17 Event 표준 (8)
GoodsReceived · PutawayCompleted · PickingTaskGenerated · PickingCompleted · PackingCompleted · ShipmentReleased · WarehouseCountCompleted · WarehouseAudited. → ★현행=`Wms`(wms_movements·재고 델타 자동 푸시 283차) seed(동기·event-driven 부재). Data Platform §15 정합.

## §18 AI Integration
최적 적치 위치 · 피킹 동선 최적화 · 작업량 예측 · 창고 공간 최적화 · 재고 이동 추천 · 작업자 생산성 · 병목 예측 · Explainable Warehouse Insight. **AI는 창고 작업 자동 승인/재고 직접 이동 불가.** → ★현행=적치 추천 seed=`Wms`(pickBinForSku)·작업량 예측=`DemandForecast`·재고 이동=`Wms`(transferLotsFefo)·이상=`AnomalyDetection`·Explainability=헌법 V4·재고 직접 이동 불가=헌법 V3+V5+`CHANGE_GATE`. ★피킹 동선 최적화/공간 최적화 AI=부재. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §19 성능 요구사항
입고 등록 ≤500ms · 적치 추천 ≤300ms · 피킹 작업 ≤1초 · 출고 확정 ≤1초 · Dashboard ≤2초 · Availability ≥99.99%. (현행 `Wms` sqlite·소유권 273차 seed.)

## §20 Completion Criteria
Warehouse Management Engine·Receiving·Put-away·Picking·Packing·Analytics·Governance·Security·API/Event·AI 구현. → **부분 충족·강함**(창고 마스터/입고/적치/보관/Bin/피킹/이동/FEFO/창고 RBAC 실재·ASN/RFID/Wave Picking/Packing 워크플로우/Dock Scheduling=미완). 코드 0.

## 판정
**PARTIAL-strong(★WMS 최강 실재=창고 마스터=`Wms`(wms_warehouses·type/temp)·입고=`Wms`(wms_movements Inbound·recordMovement)·적치=`Wms`(putAway·pickBinForSku bin 추천)·Bin/보관=`Wms`(wms_bins·zone/aisle/rack/level/slot·resolveBin)·피킹=`Wms`(wms_picking·listPicking/savePicking)·이동=`Wms`(wms_movements·applyMovementToStock)·FEFO=`Wms`(consumeLotsFefo·Part 027)·창고 RBAC=`Wms`(wms_permissions·guardWarehouse)·Carrier=`Wms`(wms_carriers)·Supplier=`Wms`(wms_suppliers)·CCTV=`WmsCctv`(274차)·Inventory Accuracy=`Wms`(on_hand SSOT)·Warehouse ROI=`Rollup`/`Pnl`) / ABSENT-formal(ASN Processing·RFID·형식 Quality/Damage Inspection·Wave/Batch/Zone/Cluster Picking·Pick-to-Light/Voice Picking·형식 Packing 워크플로우·Shipping Manifest/Dock Scheduling·Cold Storage/Bonded/Automated/Smart/Micro Fulfillment 유형·Cross-Dock·IoT/Robotics·형식 Cycle Count 워크플로우).** ★핵심=WMS는 **앱의 최강 도메인 중 하나로 창고 운영 핵심(입고/적치/보관/Bin/피킹/이동/FEFO/창고 RBAC) 광범위 실재**(205차 backend·다수 감사 하드닝·TMS Part 032와 대조)이나 고급 기능(ASN/RFID/Wave Picking/Pick-to-Light/Dock Scheduling/IoT/Robotics)은 부재. Logistics/Commerce Platform 상속(재정의 금지)·★중복 창고/재고/Bin/FEFO 도메인 절대 금지(값 분산=회귀·재고 SSOT/FEFO COGS 정본 재구현 금지·Part 027)·마케팅 AI KEEP_SEPARATE·★AI 창고 작업 자동 승인/재고 직접 이동 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 034 — Enterprise Fleet, Vehicle & Driver Management Architecture(본 WMS 상속·★Fleet/Vehicle/Driver 부재·ABSENT-heavy 예상).
