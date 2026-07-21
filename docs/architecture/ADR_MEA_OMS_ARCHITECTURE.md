# ADR — MEA Part 024 Enterprise Order Management System (OMS) Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part024 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 024는 OMS(주문 생성~완료 통합 관리). ★코드베이스에는 **주문 집계/취소·반품/이행이 이미 실재**: `OrderHub.php`(v3·165차 Aggregator·CANCEL_TOKENS/RETURN_TOKENS/claimType 오픈마켓 상태머신 정규화 SSOT·취소 역분개 268차·14채널·GT①)·`Wms.php`(listWarehouses·allocate·listCarriers/saveCarrier·reflectChannelSale·resolvePrimaryWarehouse·FEFO·GT①)·`ChannelSync`(marketplace 주문 sync)·`Logistics`(배송)·`LiveCommerce`(placeOrder 원자 재고 289차). ★현행 핵심 모델=**OrderHub는 Aggregator**(주문은 외부 채널/마켓에서 생성·집계). 본 Part는 Part 021/022/023 상속(재정의 금지).

## 결정
- **D-1 (Part 021/022/023/Data Platform 재정의 금지):** Commerce Foundation(Part 021)·PIM(Part 022)·Pricing(Part 023)·Metadata(Part 004)를 준수·인용. 주문 도메인=`OrderHub`/`Wms`/`ChannelSync`. 중복 정의 금지.
- **D-2 (주문 집계 = OrderHub 승격·★중복 주문/취소 도메인 절대 금지):** 주문 = `OrderHub`(집계·CANCEL/RETURN_TOKENS·claimType 상태머신 정규화 SSOT). ★취소 역분개(268차)·취소/반품 제외 술어 통일(286차 2축·매출 SSOT 정합)=정본(재구현 금지). ★중복 주문/취소/반품 도메인 신설 절대 금지(값 분산=회귀). 형식 Single Order Authority는 `OrderHub`를 SSOT로 승격(주문 재구현 아님).
- **D-3 (이행 = Wms 승격):** Fulfillment = `Wms`(창고 Assignment·allocate·Inventory Reservation 원자성·Carrier Assignment·FEFO·reflectChannelSale)+`Logistics`(delivery tracking). ★WMS 발주/재고 SSOT 정본(286/287차·재구현 금지). 형식 Picking/Packing/Label/POD Coordinator=순신설(중복 창고/재고 로직 금지).
- **D-4 (Orchestration = 형식 신설·Aggregator 모델 명시):** ★현행=Aggregator(주문은 채널 생성·`OrderHub` 집계)·Warehouse Routing=`Wms`(resolvePrimaryWarehouse). ★형식 Order Orchestration Engine(Split/Merge/Back Order/Cross Border Routing)·Single Order Authority(authoring OMS)=ABSENT·순신설. 집계 모델→authoring OMS 승격은 대규모(선행 종속).
- **D-5 (Validation/Security/AI = 헌법·무후퇴 정합):** Validation seed=Inventory(`Wms` 원자성)·Payment(`Payment`)·Pricing(`PriceOpt`)·Tax(`Pnl` VAT)·Fraud(`AnomalyDetection`)·Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·No-PII(v418.1)·Audit/Integrity=`SecurityAudit`. AI(이상/Fraud/경로 최적화/취소·반품 예측)=`AnomalyDetection`/`Wms`/`CustomerAI`·Explainability=헌법 V4·★AI 주문 승인/취소/배송 지시 자동 수행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021/022/023/Data Platform/헌법 상속·재정의 금지·주문 집계(`OrderHub`)·이행(`Wms`)·배송(`Logistics`)·Multi-Channel(`ChannelSync`/`LiveCommerce`)·`SecurityAudit` 재사용(★중복 주문/취소 도메인 절대 금지·취소 역분개 정본 재구현 금지)·형식 Enterprise OMS Engine(Single Order Authority)·Orchestration Engine·Validation Engine·Change Management만 신설(주문 재구현 없이). 실행은 Aggregator→authoring OMS 승격 계층 신설 종속.
