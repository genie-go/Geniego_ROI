# MEA Part 024 — Enterprise Order Management System (OMS) Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 021(Commerce Foundation)+022(PIM)+023(Pricing)+Data Platform(001~012)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**주문 집계/취소·반품/이행은 이미 실재**(GT①·`OrderHub`·`Wms`·`ChannelSync`)·본 Part는 형식 OMS Orchestration/Single Order Authority 계층만 추가(주문 재구현 없이). ★현행 `OrderHub`=Aggregator(주문은 채널/마켓에서 생성·집계 모델). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
전 주문 생성/검증/승인/분배/이행/변경/취소/완료 전 과정 통합 관리. PIM/Pricing/Inventory/Payment/Logistics/Marketplace/ROI Platform 연계 Enterprise OMS.

## §2 구현 범위
Order Lifecycle Management · Orchestration · Validation · Routing · Fulfillment Coordination · Change Management · Order Audit · Analytics · Multi-Channel OMS · AI Order Intelligence.

## §3 구현 목표 (10)
Enterprise OMS Engine · Order Orchestration Engine · Order Validation Engine · Order Routing Engine · Fulfillment Coordinator · Order Analytics Service · Order Dashboard · Order Audit Service · Order Policy Manager · AI Order Advisor.

## §4 아키텍처 원칙 (10)
Order First · Single Order Authority · Event Driven · API First · High Availability · Metadata Driven · Multi-Channel Ready · AI Assisted · Enterprise Standard · Audit by Default.

## §5 Canonical Entity (15)
ORDER · ORDER_ITEM · ORDER_LINE · ORDER_STATUS · ORDER_SOURCE · ORDER_CHANNEL · ORDER_PAYMENT · ORDER_SHIPMENT · ORDER_FULFILLMENT · ORDER_SPLIT · ORDER_HOLD · ORDER_APPROVAL · ORDER_HISTORY · ORDER_AUDIT · ORDER_POLICY. → 상세 = `MEA_PART024_CANONICAL_ENTITIES.md`.

## §6 Order Domain (10)
Retail/Marketplace/Subscription/B2B/B2C/International/Logistics Service/Digital Service/AI Generated/Enterprise Order. Order Master 기준. → ★현행=Marketplace=`OrderHub`(집계·14채널)+`ChannelSync`·Subscription=`Paddle`·Live=`LiveCommerce`·Logistics Service=`Logistics`. 형식 Order Master 통합=부분(Aggregator 모델).

## §7 Order Lifecycle (10)
Created→Validation→Payment Pending→Payment Approved→Inventory Allocation→Fulfillment→Shipment→Delivered→Completed→Archived. 예외=Hold/Cancel/Return/Refund. → ★현행=`OrderHub`(CANCEL_TOKENS/RETURN_TOKENS/claimType·오픈마켓 상태머신 정규화 SSOT·취소 역분개 268차)·`Payment`(결제)·`Wms`(allocate·이행). ★형식 통합 Lifecycle state machine(Created~Archived)=부분(집계 상태 정규화 중심).

## §8 Order Validation (10)
Customer/Product/Inventory/Pricing/Promotion/Payment/Fraud/Shipping/Tax/Compliance Validation. 실패 시 Order Hold. → ★현행=Inventory=`Wms`(재고 확인·원자성)·Pricing=`PriceOpt`·Payment=`Payment`·Tax=`Pnl`(VAT)·Fraud=`AnomalyDetection`(부분). 형식 통합 Validation Engine·Order Hold 상태=부분.

## §9 Order Orchestration (8)
Multi-Warehouse Routing · Split/Merge Order · Partial Shipment · Back Order · Drop Shipping · Cross Border Routing · Priority Fulfillment. 정책 기반. → ★현행=Warehouse Routing=`Wms`(resolvePrimaryWarehouse·allocate·multi-warehouse)·Partial=`Wms`. ★형식 Split/Merge/Back Order/Cross Border Orchestration Engine=ABSENT.

## §10 Fulfillment Coordination (8)
Warehouse Assignment · Inventory Reservation · Picking/Packing · Shipping Label · Carrier Assignment · Delivery Tracking · Proof of Delivery. 실시간 동기화. → ★★현행=`Wms`(listWarehouses·allocate·listCarriers/saveCarrier·reflectChannelSale·FEFO·GT①)+`Logistics`(delivery tracking). 창고/캐리어/할당 실재. Picking/Packing/Label/POD=부분.

## §11 Order Change Management (8)
Quantity/Address Change · Product Replacement · Hold/Resume · Cancellation · Return/Refund Request. 변경 이력 저장·원본 불변. → ★현행=Cancel/Return=`OrderHub`(claimType·취소 역분개 268차)·Refund=`OrderHub`/`Payment`. ★변경 이력·원본 불변=`SecurityAudit`. 형식 Change Management(Quantity/Address/Hold/Resume)=부분.

## §12 Multi-Channel OMS (8)
Online Mall/Mobile/Marketplace/POS/Partner API/Live Commerce/Social Commerce/Enterprise Portal. 동일 OMS Runtime. → ★현행=Marketplace=`OrderHub`/`ChannelSync`(14채널)·Live=`LiveCommerce`·Partner=`PartnerPortal`·Social=`Omnichannel`. POS(형식)=부분.

## §13 Data Security
Tenant Isolation · RBAC · Customer Information Encryption · Payment Information Protection · Audit Logging · Order Integrity Validation. → ★Part 021 상속: Tenant=`Db.php`(OrderHub guardEnv·isDemoTenant)·RBAC=`index.php`·Encryption=`Crypto`·No-PII 집계(v418.1)·Audit/Integrity=`SecurityAudit`.

## §14 Runtime 규칙
Order 생성 · Validation · Payment 상태 · Inventory 예약 · Fulfillment 요청 · Event · Audit. → ★현행=Order=`OrderHub`·Payment=`Payment`·Inventory=`Wms`(예약·원자성)·Fulfillment=`Wms`·Audit=`SecurityAudit`.

## §15 API 표준 (8)
Create/Update/Cancel/Hold/Resume Order · Query Order · Query History · Get Dashboard. → ★현행=`OrderHub` API(집계·조회·claimType)·`Wms` API(이행)·`ChannelSync` API(주문 sync) 실재. Create/Hold/Resume(형식·집계 모델)=부분. Part 001 API 표준(`/api` 접두) 상속.

## §16 Event 표준 (8)
OrderCreated/Validated/Approved · InventoryReserved · FulfillmentStarted · ShipmentCompleted · OrderDelivered · OrderAudited. → ★현행=`Wms`(재고 예약·재고 델타 283차)·`OrderHub`(상태 집계) seed(동기·event-driven 부재). Data Platform §15 정합.

## §17 AI Integration
주문 이상 탐지 · Fraud Risk · Fulfillment 경로 최적화 · 배송 지연 예측 · 취소/반품 가능성 예측 · 구매 패턴 · Explainable Order Analysis. **AI는 주문 승인/취소/배송 지시 자동 수행 불가.** → ★현행=이상=`AnomalyDetection`·경로 최적화=`Wms`/`Logistics`·취소/반품 예측=`CustomerAI`(부분)·패턴=`CustomerAI`·Explainability=헌법 V4·자동 수행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
주문 생성 ≤300ms · Validation ≤200ms · Inventory 예약 ≤500ms · 조회 ≤200ms · Dashboard ≤2초 · Availability ≥99.99%. (현행 `OrderHub` 집계·11번가 N+1 회피 285차 seed.)

## §19 Completion Criteria
Enterprise OMS Engine·Validation·Orchestration·Fulfillment·Multi-Channel·Security·Runtime·API/Event·AI 구현. → **부분 충족**(주문 집계/취소·반품/이행 실재·형식 Single Order Authority·Orchestration Engine·Validation Engine=미완). 코드 0.

## 판정
**PARTIAL-strong(★주문 집계=`OrderHub`(v3·CANCEL/RETURN_TOKENS·claimType 오픈마켓 상태머신 정규화 SSOT·취소 역분개 268차·14채널)·이행=`Wms`(창고/캐리어/allocate·FEFO·reflectChannelSale)·배송=`Logistics`·Multi-Channel=`ChannelSync`/`LiveCommerce`/`Omnichannel`·Inventory 예약=`Wms`(원자성)·Security=Tenant/RBAC/Crypto/SecurityAudit) / ABSENT-formal(형식 Enterprise OMS Engine(Single Order Authority)·Order Orchestration Engine(Split/Merge/Back Order/Cross Border)·Order Validation Engine(통합 Fraud/Compliance)·형식 Lifecycle state machine·Order Change Management(Quantity/Address/Hold/Resume)·Event 표준).** ★핵심=주문 집계·취소/반품 정규화·이행(창고/캐리어)은 **실재**(OrderHub Aggregator·Wms fulfillment·취소 역분개 정본)이나 형식 Single Order Authority·Orchestration Engine은 부재(★현행=Aggregator 모델·주문은 채널에서 생성·Part 021 handler별 구현 정합). Part 021/022/023/Data Platform 상속(재정의 금지)·★중복 주문/재고/취소 도메인 절대 금지(값 분산=회귀·취소 역분개 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 주문 승인/취소/배송 지시 자동 수행 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 025 — Enterprise Customer & Customer 360 Architecture(본 OMS 상속·확장).
