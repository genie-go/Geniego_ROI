# MEA Part 032 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 032 SPEC/ADR. ★부재증명 완료(과대주장 금지).

## 전수조사 방법
freight/dispatch/gps/telematics/eta/carrier/transport_order/transport_plan/fuel_surcharge/vehicle/driver 키워드로 `backend/src/Handlers` 전수 grep + 판독. ★TMS 전용 handler·테이블 부재증명(grep 0·incidental만).

## 실존 substrate (★seed만·TMS 핵심 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Carrier Registry | 창고 캐리어 | `Wms.php`(listCarriers:368·saveCarrier:386·deleteCarrier:428) | PARTIAL(seed) |
| Route seed | nearest warehouse | `Wms.php`(allocationPlan:1014·geoCentroid:974) | PARTIAL-weak(seed·형식 최적화 아님) |
| Inter-Warehouse Transfer | FEFO 이동 | `Wms.php`(transferLotsFefo·Part 027) | PARTIAL |
| Freight Cost seed | 배송비 정률 | `Pnl.php`(shippingCost:210·채널별 정률·무료배송 기준:134) | PARTIAL(seed) |
| Freight Settlement seed | 배송비 정산 | `Pnl.php`(279차 net_payout 배송비:117) | PARTIAL |
| 배송 추적 | 스마트택배/DHL | `Logistics.php`(Part 031) | PARTIAL-strong |
| Exception | 이상 탐지 | `AnomalyDetection.php` | PARTIAL |
| CCTV | 창고 CCTV | `WmsCctv.php`(274차) | PARTIAL |
| Security | RBAC/암호화 | `index.php`·`Crypto`·`SecurityAudit` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·전용 handler/엔티티 grep 0)
★**Transportation Planning Engine**(Route/Capacity/Carrier/Time Window/Multi-Stop/Cross Dock/Load Planning/Simulation)·**Dispatch Engine**(Automatic/Manual Dispatch·Optimization·Reassignment)·**Fleet/Vehicle/Driver Assignment**(Vehicle/Driver 엔티티 자체 부재)·**Freight Rate**(Contract/Spot/Fuel Surcharge/Toll)·**GPS Tracking·ETA·Telematics**·**Temperature/Vehicle Health/Driver Activity Monitoring**·**Transport Order/Plan/Job**·형식 TMS 전 계층·형식 Governance Manager·Event 표준(TransportOrderCreated 등).

## 판정
**ABSENT-heavy / PARTIAL-weak(seed만).** ★실재 seed=Carrier Registry(`Wms`·listCarriers/saveCarrier)·Route seed(`Wms::allocationPlan`·geoCentroid·형식 최적화 아님)·Freight Cost seed(`Pnl`·shippingCost 채널별 정률)·Inter-Warehouse Transfer(`Wms::transferLotsFefo`)·배송 추적(`Logistics`·Part 031)·Exception(`AnomalyDetection`)·CCTV(`WmsCctv`)뿐이며, **TMS 핵심(운송 계획·배차·Fleet/Vehicle/Driver·운임율·GPS/Telematics)은 진짜 부재**(부재증명 완료·전용 handler·엔티티 grep 0·Part 031 정합·과대주장 금지). 실행은 부재 도메인 라이브 검증(실제 차량/GPS 연동) 후 신설 종속.
