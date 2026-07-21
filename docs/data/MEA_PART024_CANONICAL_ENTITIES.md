# MEA Part 024 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★OrderHub/Wms/ChannelSync/Logistics 재사용·형식 Single Order Authority/Orchestration greenfield·Part 021~023 상속·Aggregator 모델.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | ORDER | 주문 집계(Aggregator) | `OrderHub.php`(v3:11) | PARTIAL-strong |
| 2 | ORDER_ITEM | 주문 라인 | `OrderHub.php` | PARTIAL-strong |
| 3 | ORDER_LINE | 라인 | `OrderHub.php` | PARTIAL |
| 4 | ORDER_STATUS | 상태머신 정규화 | `OrderHub.php`(claimType:93) | PARTIAL-strong |
| 5 | ORDER_SOURCE | 채널 소스 | `OrderHub`·`ChannelSync` | PARTIAL |
| 6 | ORDER_CHANNEL | 14채널 | `OrderHub`·`ChannelSync` | PARTIAL-strong |
| 7 | ORDER_PAYMENT | 결제 | `Payment.php`·`Paddle` | PARTIAL-strong |
| 8 | ORDER_SHIPMENT | 배송 | `Logistics.php`·`Wms` | PARTIAL |
| 9 | ORDER_FULFILLMENT | 창고/할당 | `Wms.php`(allocate:351) | PARTIAL-strong |
| 10 | ORDER_SPLIT | 부재(형식 Split) | — | ABSENT-formal |
| 11 | ORDER_HOLD | 부재(형식 Hold) | — | ABSENT-formal |
| 12 | ORDER_APPROVAL | 부재(형식 Approval) | — | ABSENT-formal |
| 13 | ORDER_HISTORY | 상태 이력(부분) | `OrderHub`·`SecurityAudit` | PARTIAL |
| 14 | ORDER_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | ORDER_POLICY | 게이트 산재 | (게이트) | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Marketplace=OrderHub/ChannelSync·Subscription=Paddle·Live=LiveCommerce·Logistics Service=Logistics. Aggregator 모델·형식 Master 통합=부분.
- **§7 Lifecycle(10)**: OrderHub 상태 정규화(CANCEL/RETURN)·취소 역분개·Payment·Wms 이행·형식 state machine(Created~Archived)=부분.
- **§8 Validation(10)**: Inventory=Wms(원자성)·Pricing=PriceOpt·Payment=Payment·Tax=Pnl·Fraud=AnomalyDetection·형식 Validation Engine/Hold=부분.
- **§9 Orchestration(8)**: Warehouse Routing=Wms(resolvePrimaryWarehouse)·형식 Split/Merge/Back Order/Cross Border=ABSENT.
- **§10 Fulfillment(8)**: ★Wms(창고/캐리어/allocate/reflectChannelSale·FEFO)+Logistics·Picking/Packing/Label/POD=부분.
- **§11 Change Management(8)**: Cancel/Return=OrderHub·Refund=Payment·이력=SecurityAudit·Quantity/Address/Hold/Resume(형식)=부분.
- **§12 Multi-Channel(8)**: OrderHub/ChannelSync(14채널)·LiveCommerce·Omnichannel·POS(형식)=부분.
- **§13 Security**: Tenant/RBAC/Encryption/No-PII/Audit/Integrity(Part 021 상속).
- **§17 AI**: 이상=AnomalyDetection·경로=Wms/Logistics·취소/반품 예측=CustomerAI·Explainability=헌법 V4·주문 승인/취소/배송 자동 수행 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§2·§4·§6·§7·§9·§14=집계/상태/이행/감사) / PARTIAL(§3·§5·§8·§13·§15) / ABSENT-formal(§10 SPLIT·§11 HOLD·§12 APPROVAL·형식 Single Order Authority/Orchestration Engine/Validation Engine).** 코드 0. ★주문 집계(`OrderHub`)·이행(`Wms`)·Multi-Channel(`ChannelSync`/`LiveCommerce`) 재사용(★중복 주문/취소/재고 도메인 절대 금지·취소 역분개 정본 재구현 금지)·형식 Single Order Authority/Orchestration 신설(주문 재구현 없이·Aggregator→authoring 승격)·Part 021~023 상속·★AI 주문 승인/취소/배송 지시 자동 수행 불가(V3+V5+CHANGE_GATE).
