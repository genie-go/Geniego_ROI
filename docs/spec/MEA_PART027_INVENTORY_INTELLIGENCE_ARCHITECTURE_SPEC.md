# MEA Part 027 — Enterprise Inventory & Inventory Intelligence Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 021(Commerce Foundation)+024(OMS)+017(Forecast)+Data Platform+ROI Platform**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**재고 마스터/LOT/FEFO/이동/할당은 이미 광범위 실재**(GT①·`Wms`·wms_stock/wms_lots/wms_movements)·본 Part는 형식 Reservation/Replenishment Engine 계층만 추가(재고 재구현 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
전 재고 생성/입고/출고/예약/이동/실사/보충/폐기·재고 최적화 통합 관리. OMS/PIM/Logistics/WMS/Marketplace/ROI/AI 연계 Enterprise Inventory Framework.

## §2 구현 범위
Inventory Management · Master · Stock Reservation · Allocation · Movement · Replenishment · Intelligence · Governance · Analytics · AI Inventory Intelligence.

## §3 구현 목표 (10)
Inventory Management Engine · Inventory Master Repository · Stock Reservation Engine · Inventory Allocation Engine · Replenishment Engine · Inventory Analytics Service · Inventory Dashboard · Inventory Governance Manager · Inventory Audit Service · AI Inventory Advisor.

## §4 아키텍처 원칙 (10)
Inventory Single Source of Truth · Real-Time Inventory · Event Driven · Reservation First · Policy Driven · Metadata Driven · AI Assisted · Enterprise Standard · High Availability · Audit by Default.

## §5 Canonical Entity (15)
INVENTORY · INVENTORY_ITEM · STOCK · STOCK_LOCATION · STOCK_BATCH · LOT · SERIAL_NUMBER · INVENTORY_RESERVATION · INVENTORY_MOVEMENT · INVENTORY_ADJUSTMENT · REPLENISHMENT_PLAN · SAFETY_STOCK · INVENTORY_STATUS · INVENTORY_AUDIT · INVENTORY_POLICY. → 상세 = `MEA_PART027_CANONICAL_ENTITIES.md`.

## §6 Inventory Domain (10)
Warehouse/Store/Marketplace/Transit/Reserved/Available/Damaged/Returned/Consignment/Enterprise Inventory. Inventory Master 기준. → ★현행=Warehouse=`Wms`(wms_stock·on_hand SSOT)·Marketplace=`ChannelSync`(채널 재고)·Available/Reserved=`Wms`(allocate)·Returned=`OrderHub`(반품). 형식 Damaged/Consignment=부분.

## §7 Inventory Lifecycle (10)
Receiving→Inspection→Available→Reservation→Allocation→Picking→Shipping→Return→Adjustment→Archive. 모든 변경 추적. → ★현행=Receiving=`Wms`(wms_movements Inbound·reflectChannelRestock)·Available=`Wms`(on_hand)·Allocation=`Wms`(allocate)·Shipping=`Wms`/`Logistics`·Return=`OrderHub`·Adjustment=`Wms`(adjustStock). ★변경 추적=wms_movements+`SecurityAudit`.

## §8 Inventory Reservation (8)
Order/Priority/Partial Reservation · Expiration · Release · Backorder · Multi-Warehouse · Validation. 실시간 동기화. → ★현행=`Wms`(allocate·allocationPlan·원자 재고 289차 LiveCommerce)·Multi-Warehouse=`Wms`(wh_id). ★형식 Reservation Expiration/Release/Backorder=부분.

## §9 Inventory Allocation (8)
Warehouse/Zone/FIFO/FEFO/Batch/Serial/Priority/Split Allocation. 상품 유형별 정책. → ★★현행=`Wms`(allocate·allocationPlan·★FEFO=consumeLotsFefo/transferLotsFefo·wms_lots expiry·GT①)·Zone/Bin=`Wms`(wms_bins·zone/aisle/rack/level/slot). FIFO/Serial(형식)=부분. FEFO 실 강함.

## §10 Replenishment Management (8)
Safety Stock · Reorder Point · Min-Max · Demand Forecast Replenishment · Automatic · Supplier · Warehouse Transfer · Emergency. Forecast 연계. → ★현행=Demand Forecast Replenishment=`DemandForecast`(Holt-Winters·Part 017)·Reorder=`RuleEngine`(ACTIONS reorder)·Warehouse Transfer=`Wms`(transferLotsFefo)·발주=`Wms`(287차 원가). ★형식 Safety Stock/Reorder Point/Min-Max Engine=부분.

## §11 Inventory Analytics (10)
Turnover · Days of Inventory · Stock Accuracy · Overstock · Stockout · Aging · Slow/Fast Moving · Fill Rate · Inventory ROI. → ★현행=deadStock 분석(288차·wms SSOT)·Aging/Slow Moving=`Wms`(deadstock)·Inventory ROI=`Rollup`/`Pnl`(FEFO COGS=fefoCogsForRef). 형식 Turnover/DOI/Fill Rate=부분.

## §12 Inventory Governance (8)
Inventory/Reservation/Allocation Policy · Adjustment Approval · Threshold · Cycle Count · Physical Inventory · Audit Trail. → ★현행=Policy=`Wms`(stockPolicies)·Adjustment=`Wms`(adjustStock·strictOut)·orphan 병합(consolidateOrphanStock 286차)·Audit=`SecurityAudit`. ★Cycle Count/Physical Inventory 형식=부분.

## §13 Data Security
Tenant Isolation · RBAC · Inventory Data Encryption · Warehouse Access Control · Audit Logging · Inventory Integrity Validation. → ★Part 021 상속: Tenant=`Db.php`·RBAC=`index.php`·Warehouse Access=`Wms`(guardWarehouse)·Audit/Integrity=`SecurityAudit`.

## §14 Runtime 규칙
재고 수량 검증 · Reservation 확인 · Allocation · Replenishment 계산 · Inventory Event · Audit. → ★현행=재고=`Wms`(on_hand·원자성)·Allocation=`Wms`(allocate)·Replenishment=`DemandForecast`·Audit=`SecurityAudit`+wms_movements.

## §15 API 표준 (8)
Register/Update Inventory · Reserve Stock · Release Reservation · Allocate · Execute Replenishment · Query Inventory · Query Audit. → ★현행=`Wms` API(listStock·setSkuStock·allocate·listLots·createLot·listBinStock·GT①) 실재. Reserve/Release(형식)=부분. Part 001 API 표준(`/api` 접두) 상속.

## §16 Event 표준 (8)
InventoryReceived/Reserved/Allocated/Adjusted/Transferred · ReplenishmentGenerated · InventoryCountCompleted · InventoryAudited. → ★현행=`Wms`(wms_movements·재고 델타 자동 푸시 283차) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI Integration
재고 부족 예측 · 과잉 재고 탐지 · 안전재고 추천 · 회전율 분석 · 자동 보충량 추천 · 창고 간 재배치 추천 · 재고 이상 탐지 · Explainable Inventory Report. **AI는 재고 수량 직접 변경/자동 승인 불가.** → ★현행=부족/보충 예측=`DemandForecast`·과잉/deadStock=`Wms`(288차)·이상=`AnomalyDetection`·Explainability=헌법 V4·직접 변경/자동 승인 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
재고 조회 ≤100ms · Reservation ≤200ms · Allocation ≤300ms · Replenishment ≤2초 · Dashboard ≤2초 · Availability ≥99.99%. (현행 `Wms` seed·priceopt/wms sqlite 소유권 273차.)

## §19 Completion Criteria
Inventory Management Engine·Reservation·Allocation·Replenishment·Analytics·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(재고 마스터/LOT/FEFO/이동/할당 실재·형식 Reservation Engine(expiration)·Replenishment Engine(safety stock/reorder point)·Serial 추적=미완). 코드 0.

## 판정
**PARTIAL-strong(★재고 마스터=`Wms`(wms_stock·on_hand SSOT·실시간)·LOT/FEFO=`Wms`(wms_lots·consumeLotsFefo/transferLotsFefo·expiry)·이동=`Wms`(wms_movements)·할당=`Wms`(allocate·allocationPlan)·Bin=`Wms`(wms_bins·zone/aisle/rack)·FEFO COGS=`Wms`(fefoCogsForRef)·Replenishment=`DemandForecast`(Part 017)+`RuleEngine`(reorder)·deadStock=`Wms`(288차)·Inventory ROI=`Rollup`/`Pnl`·Warehouse Access=`Wms`(guardWarehouse)) / ABSENT-formal(형식 Stock Reservation Engine(Expiration/Release/Backorder)·Replenishment Engine(Safety Stock/Reorder Point/Min-Max)·Serial Number 추적·형식 Inventory Analytics(Turnover/DOI/Fill Rate)·Cycle Count/Physical Inventory·Event 표준).** ★핵심=재고는 **앱의 최강 도메인 중 하나로 마스터/LOT/FEFO/이동/할당/Bin/COGS 실재**(WMS 205차 backend·다수 감사 하드닝)이나 형식 Reservation Engine(expiration)·Replenishment Engine(safety stock/reorder)·Serial 추적은 부재(Part 021 정합). Part 021/024/017/Data Platform 상속(재정의 금지)·★중복 재고/LOT/FEFO/COGS 도메인 절대 금지(값 분산=회귀·재고 SSOT/FEFO COGS 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 재고 수량 직접 변경/자동 승인 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 028 — Enterprise Payment, Billing & Settlement Architecture(본 Inventory 상속·확장).
