# ADR — MEA Part 027 Enterprise Inventory & Inventory Intelligence Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part027 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 027은 Inventory & Inventory Intelligence(재고 통합 관리·최적화). ★코드베이스에는 **재고가 앱의 최강 도메인 중 하나로 광범위 실재**: `Wms.php`(205차 backend·wms_stock:98/on_hand SSOT·wms_movements:77·wms_lots:91/expiry·wms_lot_consumptions:226/cost·wms_bins:233/zone·aisle·rack·slot·GT①)·allocate:351·allocationPlan:1014·adjustStock:1122·★consumeLotsFefo:1159/transferLotsFefo:1194(FEFO)·fefoCogsForRef:1257(FEFO COGS)·stockPolicies:1998·consolidateOrphanStock:866(286차 orphan 병합)·Replenishment=`DemandForecast`(Part 017)+`RuleEngine`(ACTIONS reorder)·deadStock(288차). 본 Part는 Part 021/024/017 상속(재정의 금지).

## 결정
- **D-1 (Part 021/024/017/Data Platform 재정의 금지):** Commerce Foundation(Part 021)·OMS(Part 024)·Forecast(Part 017)·Metadata(Part 004)를 준수·인용. 재고 도메인=`Wms`. 중복 정의 금지.
- **D-2 (재고 마스터 = Wms 승격·★중복 재고 도메인 절대 금지):** 재고 SSOT = `Wms`(wms_stock·on_hand). ★재고 필드 정본(286차 prdSelQty·wh_id 폴백 병합·wms_stock SSOT)·재고 델타 자동 푸시(283차)=정본(재구현 금지). ★중복 재고/재고 계산 신설 절대 금지(값 분산=회귀). 형식 Inventory Master Repository는 `wms_stock`을 Single Source of Truth로 승격(재고 재구현 아님).
- **D-3 (LOT/FEFO/COGS = Wms 승격):** LOT/FEFO = `Wms`(wms_lots·consumeLotsFefo/transferLotsFefo·expiry)·FEFO COGS=`Wms`(fefoCogsForRef·fefoUnitCost). ★FEFO 원가 산출=Financial 정본(P&L COGS 연계·재구현 금지). 형식 FIFO/Serial Number 추적=순신설(중복 LOT/COGS 로직 금지).
- **D-4 (Reservation/Allocation/Replenishment = 기존 승격·형식 신설):** Allocation=`Wms`(allocate·allocationPlan·Bin wms_bins)·Reservation seed=`Wms`(원자 재고 289차)·Replenishment=`DemandForecast`(Part 017)+`RuleEngine`(reorder). ★형식 Reservation Engine(Expiration/Release/Backorder)·Replenishment Engine(Safety Stock/Reorder Point/Min-Max)=순신설(중복 할당/보충 로직 금지·기존 승격).
- **D-5 (Governance/Security/AI = 헌법·무후퇴 정합):** Policy=`Wms`(stockPolicies)·Adjustment=`Wms`(adjustStock·strictOut)·Tenant=`Db.php`·RBAC=`index.php`·Warehouse Access=`Wms`(guardWarehouse)·Audit=`SecurityAudit`+wms_movements. AI(부족/보충/과잉/이상)=`DemandForecast`/`Wms`(deadStock)/`AnomalyDetection`·Explainability=헌법 V4·★AI 재고 수량 직접 변경/자동 승인 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021/024/017/Data Platform/헌법 상속·재정의 금지·재고 마스터(`Wms` wms_stock)·LOT/FEFO/COGS(`Wms`)·이동(wms_movements)·할당(allocate)·Bin(wms_bins)·Replenishment(`DemandForecast`/`RuleEngine`)·`SecurityAudit` 재사용(★중복 재고/LOT/FEFO/COGS 도메인 절대 금지·재고 SSOT/FEFO COGS 정본 재구현 금지)·형식 Reservation Engine(expiration)·Replenishment Engine(safety stock/reorder)·Serial 추적·형식 Inventory Analytics만 신설(재고 재구현 없이). 실행은 형식 Engine 신설 종속.
