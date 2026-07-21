# MEA Part 024 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 024 SPEC/ADR.

## 전수조사 방법
order/cancel/status/fulfill/warehouse/allocate/carrier/split/hold 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★주문 집계·이행·취소/반품)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Order 집계(Master seed) | Aggregator v3·14채널 | `OrderHub.php`(:11·165차) | PARTIAL-strong |
| 취소/반품 정규화(SSOT) | 상태머신 정규화 | `OrderHub.php`(CANCEL_TOKENS:85·RETURN_TOKENS:86·claimType:93) | PARTIAL-strong |
| 취소 역분개 | 매출 SSOT 정합 | `OrderHub.php`(268차·ordersStats:80) | PARTIAL-strong |
| Warehouse Assignment | 창고 관리·기본창고 | `Wms.php`(listWarehouses:252·resolvePrimaryWarehouse:841) | PARTIAL-strong |
| Inventory Reservation | 할당·원자성 | `Wms.php`(allocate:351) | PARTIAL-strong |
| Carrier Assignment | 캐리어 관리 | `Wms.php`(listCarriers:368·saveCarrier:386) | PARTIAL-strong |
| 채널 판매 반영 | 재고 반영 | `Wms.php`(reflectChannelSale:768) | PARTIAL-strong |
| 배송 추적 | delivery tracking | `Logistics.php` | PARTIAL |
| Multi-Channel Order | marketplace/live | `ChannelSync.php`·`LiveCommerce`(원자 재고 289차) | PARTIAL-strong |
| Fraud/이상 | 이상 탐지 | `AnomalyDetection.php` | PARTIAL |
| Security/Integrity | Tenant/RBAC/Audit | `OrderHub`(guardEnv:46)·`index`·`SecurityAudit` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 OMS Orchestration (Aggregator 모델·grep 판정)
형식 Enterprise OMS Engine(Single Order Authority·authoring OMS)·Order Orchestration Engine(Split/Merge/Back Order/Cross Border Routing)·Order Validation Engine(통합 Fraud/Compliance/Shipping)·형식 Order Lifecycle state machine(Created~Archived)·Order Change Management(Quantity/Address/Hold/Resume)·Picking/Packing/Label/POD Coordinator·Order Hold 상태·Event 표준(OrderCreated 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★주문 집계·취소/반품 정규화·이행은 **실재**: `OrderHub`(v3 Aggregator·CANCEL/RETURN_TOKENS·claimType 상태머신 정규화 SSOT·취소 역분개 268차·14채널)·`Wms`(창고/캐리어/allocate·FEFO·reflectChannelSale)·`Logistics`(배송)·`ChannelSync`/`LiveCommerce`(Multi-Channel)이나, **형식 Single Order Authority(authoring OMS)·Orchestration Engine(Split/Merge/Routing)·Validation Engine·Lifecycle state machine은 부재**(★현행=Aggregator 모델·주문은 채널에서 생성·집계·Part 021 handler별 구현 정합). 실행은 Aggregator→authoring OMS 승격 계층 신설(주문 재구현 없이) 종속.
