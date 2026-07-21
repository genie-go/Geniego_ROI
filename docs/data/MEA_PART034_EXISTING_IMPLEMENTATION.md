# MEA Part 034 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 034 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
vehicle/driver/fleet/maintenance/fuel/telematics/차량/운전자/배차 키워드로 `backend/src` 전수 grep + 판독. ★Vehicle/Driver/Fleet/Maintenance/Fuel CREATE TABLE·registration 함수 부재증명(grep 0).

## 실존 substrate (★극소 seed·도메인 자체 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Partner Fleet(3PL) | 택배사 추적·레지스트리 | `Logistics.php`(택배사)·`Wms`(wms_carriers:66) | PARTIAL-weak(소유 차량 아님) |
| Operating Cost seed | 배송비 | `Pnl`(shippingCost·연료비 아님) | PARTIAL-weak |
| Asset/Device Tracking seed | 창고 CCTV | `WmsCctv.php`(274차·차량 아님) | PARTIAL-weak |
| 고장 예측 잠재 엔진 | 범용 예측/이상 | `ModelMonitor`·`AnomalyDetection`(대상 Fleet 부재) | ABSENT(대상 없음) |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| Security | Tenant/RBAC/암호화 | `Db`·`index`·`Crypto` | PARTIAL-strong(신설 시 상속) |

## 부재(ABSENT — 부재증명 완료·전용 테이블·함수 grep 0)
★**Fleet Master·Vehicle·Driver·Vehicle Type·Driver License·Vehicle Assignment·Maintenance Plan/Record·Fuel Transaction·Vehicle Inspection·Telematics Device·Fleet Policy** 전부·**Vehicle/Driver Management**·**Assignment Engine**·**Maintenance Management**·**Fuel & Operation Management**(연료/EV 충전/Mileage/Engine Hours/Carbon Emission)·**Fleet Analytics**(Utilization/Availability/Driver Productivity/Safety Score)·형식 Fleet 전 계층·Event 표준.

## 판정
**ABSENT (near-total) / seed 극소.** ★현행 substrate=**거의 전무**: Fleet/Vehicle/Driver/Maintenance/Fuel/Telematics 전용 테이블·함수 부재(부재증명 완료·grep 0). 극소 seed=Partner Fleet(3PL 택배사·`Logistics`/`Wms` wms_carriers·소유 차량 아님)·Operating Cost(`Pnl` 배송비·연료비 아님)·Asset/Device(`WmsCctv` 창고 CCTV·차량 아님)뿐이며 **전부 Fleet 도메인이 아님(오흡수 금지)**. ★★핵심=**GeniegoROI는 3PL 택배사를 사용하는 e-커머스 ROI 플랫폼이지 자체 차량/기사 운영 물류사가 아니므로 Fleet/Vehicle/Driver 관리는 현 비즈니스 범위 밖**(Part 031/032 정합·과대주장 금지). 실행은 비즈니스 모델 결정(자체 물류 vs 3PL) + 라이브 차량/GPS/기사 연동 후 전부 신설 종속.
