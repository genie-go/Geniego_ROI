# MEA Part 031 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 031 SPEC/ADR. ★부재증명 완료(과대주장 금지).

## 전수조사 방법
logistics/wms/delivery/fleet/route/carrier/tracking/shipment/driver/hub/transport 키워드로 `backend/src/Handlers` 전수 grep + 판독. ★fleet/driver/route/hub 전용 테이블·함수 부재증명(CREATE TABLE·function grep 0).

## 실존 substrate (★창고·배송추적만·물류 도메인 대부분 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Warehouse | 창고/할당/FEFO | `Wms.php`(205차·allocationPlan:1014·Part 027) | PARTIAL-strong |
| Warehouse geo routing | nearest warehouse | `Wms.php`(geoCentroid:974·shipLat/shipLng:363) | PARTIAL(seed) |
| Shipment Tracking | 스마트택배·DHL | `Logistics.php`(sweettracker:17·DHL:18·shipment_tracking·carriers:27) | PARTIAL-strong |
| Carrier | CJ/롯데/한진/로젠/우체국 | `Logistics.php`(:37~41·epost/cj/hanjin/logen/lotte) | PARTIAL-strong |
| 배송 상태 | 배송/출고 | `OrderHub`·`Wms` | PARTIAL |
| 물류 채널 통합 | sync_kind='logistics' | `ChannelRegistry`·`Logistics.php`(isLogisticsChannel:49) | PARTIAL-strong |
| 배송비 | shippingCost | `Pnl`(배송비 컴포넌트) | PARTIAL |
| CCTV | 창고 CCTV | `WmsCctv.php`(274차) | PARTIAL |
| API Gateway/Security | RBAC/암호화 | `index.php`·`Crypto`·`ChannelCreds`·`SecurityAudit` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·전용 handler/테이블 grep 0)
★**Transportation Management System(TMS)**·**Fleet**·**Driver**·**Route Optimization**(allocationPlan geoCentroid=seed·형식 최적화 아님)·**Hub**·**Cross Border Logistics**·**Reverse Logistics**·**Last Mile Delivery**·**Same Day Delivery**·형식 통합 Logistics Platform Foundation(Service Registry/Event Bus/API Gateway meta-layer)·Service Discovery/Circuit Breaker/Failover(모놀리식 단일 호스트)·형식 Event Bus·LOGISTICS_ORDER/VEHICLE/DRIVER/ROUTE/HUB 형식 엔티티.

## 판정
**PARTIAL-weak / ABSENT-heavy.** ★실재=Warehouse(`Wms`·Part 027)·Shipment Tracking(`Logistics`·스마트택배 CJ/롯데/한진/로젠/우체국·DHL·shipment_tracking)·Warehouse geo routing seed(`Wms::allocationPlan`·geoCentroid)·물류 채널 통합(`ChannelRegistry` sync_kind='logistics')·배송비(`Pnl`)뿐이며, **물류 도메인 대부분(TMS/Fleet/Driver/Route Optimization/Hub/Cross Border/Reverse/Last Mile/Same Day)은 진짜 부재**(부재증명 완료·전용 handler grep 0·Commerce Platform과 대조·과대주장 금지). 형식 통합 Logistics Foundation도 부재(모놀리식·Commerce Foundation Part 021 동형). 실행은 부재 도메인 라이브 검증 후 신설 종속.
