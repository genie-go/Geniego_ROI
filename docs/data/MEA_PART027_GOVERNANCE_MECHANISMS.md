# MEA Part 027 — Governance Mechanisms (§7~§19 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★재고 마스터(`Wms` wms_stock)·LOT/FEFO/COGS(`Wms`)·이동/할당(`Wms`)·Replenishment(`DemandForecast`)·SecurityAudit 재사용(★중복 재고/LOT/FEFO/COGS 도메인 절대 금지)·형식 Reservation/Replenishment Engine 신설(재고 재구현 없이).

## §7 Lifecycle 거버넌스
Receiving→Inspection→Available→Reservation→Allocation→Picking→Shipping→Return→Adjustment→Archive·모든 변경 추적. 현행=Receiving=`Wms`(wms_movements Inbound·reflectChannelRestock)·Allocation=`Wms`(allocate)·Adjustment=`Wms`(adjustStock)·Return=`OrderHub`. ★추적=wms_movements+`SecurityAudit`. 형식 통합 Lifecycle=순신설.

## §8 Reservation 거버넌스
Order/Priority/Partial/Expiration/Release/Backorder/Multi-Warehouse/Validation·실시간 동기화. 현행=`Wms`(allocate·allocationPlan·원자 재고 289차)·Multi-Warehouse=`Wms`(wh_id). ★형식 Reservation Engine(Expiration/Release/Backorder 명시적 예약 테이블)=순신설.

## §9 Allocation 거버넌스
Warehouse/Zone/FIFO/FEFO/Batch/Serial/Priority/Split·상품 유형별 정책. 현행=`Wms`(allocate·allocationPlan·★FEFO=consumeLotsFefo/transferLotsFefo·Bin=wms_bins zone/aisle/rack). ★FEFO 실 강함. FIFO/Serial(형식)=순신설.

## §10 Replenishment 거버넌스
Safety Stock/Reorder Point/Min-Max/Demand Forecast/Automatic/Supplier/Warehouse Transfer/Emergency·Forecast 연계. 현행=Demand Forecast=`DemandForecast`(Holt-Winters·Part 017)·reorder=`RuleEngine`(ACTIONS)·Transfer=`Wms`(transferLotsFefo)·발주 원가(287차). ★형식 Safety Stock/Reorder Point/Min-Max Engine=순신설(중복 예측/보충 금지).

## §11 Analytics 거버넌스
Turnover/DOI/Stock Accuracy/Overstock/Stockout/Aging/Slow·Fast Moving/Fill Rate/Inventory ROI. 현행=deadStock(288차·Aging/Slow Moving)·Inventory ROI=`Rollup`/`Pnl`(FEFO COGS=fefoCogsForRef). ★형식 Turnover/DOI/Fill Rate=순신설(중복 COGS 계산 금지).

## §12 Governance 거버넌스
Inventory/Reservation/Allocation Policy/Adjustment Approval/Threshold/Cycle Count/Physical Inventory/Audit Trail. 현행=Policy=`Wms`(stockPolicies)·Adjustment=`Wms`(adjustStock·strictOut)·orphan 병합(consolidateOrphanStock 286차)·Audit=`SecurityAudit`. ★Cycle Count/Physical Inventory 형식=순신설.

## §13 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(viewer<connector<analyst<admin+writeGuard)·Inventory Encryption=`Crypto`·Warehouse Access=`Wms`(guardWarehouse)·Audit/Integrity=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]])+wms_movements.

## §14 Runtime 거버넌스
재고 수량 검증·Reservation 확인·Allocation·Replenishment 계산·Inventory Event·Audit. 재고=`Wms`(on_hand·원자성)·Allocation=`Wms`(allocate)·Replenishment=`DemandForecast`·Audit=`SecurityAudit`+wms_movements·품질=Trust First(Part 006).

## §15 API 거버넌스 (8)
Register/Update Inventory·Reserve/Release Stock·Allocate·Execute Replenishment·Query Inventory·Query Audit. 현행=`Wms` API(listStock·setSkuStock·allocate·listLots·createLot·listBinStock) 실재. ★신규 실배선 `/api` 접두 필수([[reference_api_prefix_routing]]). Part 001 API 표준 상속.

## §16 Event 거버넌스 (8)
InventoryReceived/Reserved/Allocated/Adjusted/Transferred/ReplenishmentGenerated/InventoryCountCompleted/InventoryAudited. 현행=`Wms`(wms_movements·재고 델타 자동 푸시 283차) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI 거버넌스
재고 부족 예측/과잉 탐지/안전재고 추천/회전율 분석/자동 보충량/창고 간 재배치/이상 탐지/Explainable. 현행=부족/보충=`DemandForecast`·과잉/deadStock=`Wms`(288차)·이상=`AnomalyDetection`·Explainability=헌법 V4. ★AI는 재고 수량 직접 변경/자동 승인 불가=헌법 V3+V5(안전 자동화)+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §18~§19 성능·완료
성능=`Wms` sqlite seed(priceopt/wms 소유권 273차·벤치 대상 미존재). 완료=형식 Reservation Engine/Replenishment Engine/Serial 추적 구현 시(부분 충족·코드 0). ★단 재고 마스터·LOT/FEFO·이동·할당은 최강 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★재고 마스터(`Wms` wms_stock SSOT)·LOT/FEFO/COGS(`Wms`)·이동/할당(`Wms`)·Replenishment(`DemandForecast`/`RuleEngine`)·Audit(`SecurityAudit`+wms_movements) 재사용·승격(★중복 재고/LOT/FEFO/COGS 도메인 절대 금지=값 분산=회귀·재고 SSOT/FEFO COGS 정본 재구현 금지)·형식 Stock Reservation Engine(expiration)/Replenishment Engine(safety stock/reorder)/Serial 추적/형식 Inventory Analytics만 신설(재고 재구현 없이). Part 021/024/017/Data Platform/헌법 상속·재정의 금지·★AI 재고 수량 직접 변경/자동 승인 불가(V3+V5+CHANGE_GATE).
