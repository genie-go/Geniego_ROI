# MEA Part 035 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 035 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
route/optimization/dispatch/eta/traffic/sequencing/load-plan/haversine/geocentroid 키워드로 `backend/src` 전수 grep + 판독. ★ETA/traffic/route_optim/sequencing/load_plan 전용 handler 부재증명(grep 0·incidental만).

## 실존 substrate (★warehouse selection seed만·Route 대부분 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Warehouse Selection(single-hop) | haversine nearest warehouse | `Wms.php`(allocationPlan:1014·geoCentroid:974·haversineKm:986·selectWarehouseForSale:1084) | PARTIAL-weak(seed·route optimization 아님) |
| Distance/Capacity | on_hand 커버 우선·근접 | `Wms.php`(점수:903) | PARTIAL-weak(seed) |
| 배송 추적/ETA 표시 | 택배사 추적 | `Logistics.php`(Part 031·자체 ETA 예측 아님) | PARTIAL |
| Route Cost seed | 배송비 | `Pnl`(shippingCost) | PARTIAL-weak |
| SLA/지연 잠재 | 범용 이상 | `AnomalyDetection`(대상 Route 부재) | ABSENT(대상 없음) |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·전용 handler grep 0)
★**Route Optimization Engine**(Shortest Path/Fastest/Multi-Objective/multi-stop sequencing/Time Window/Fuel/Cost Optimization)·**Dispatch Intelligence**(Vehicle/Driver 부재·Part 034)·**ETA Prediction Engine**(Weather/Traffic Adjustment/Continuous Update)·**Traffic Intelligence**(External Map/Traffic API 미연동)·**Load Planning**·**Delivery Sequence**·ROUTE_PLAN/SEGMENT/STOP/DISPATCH_PLAN/TRAFFIC_EVENT 형식 엔티티·형식 Route 전 계층·Event 표준.

## 판정
**ABSENT-heavy / PARTIAL-weak(seed 극소).** ★유일 실 seed=Warehouse Selection(`Wms::allocationPlan`·haversine·nearest warehouse·on_hand 커버·single-hop geo)·배송 추적(`Logistics`)·Route Cost(`Pnl` 배송비)이나, **Route Optimization(multi-stop sequencing)·Dispatch·ETA Prediction·Traffic Intelligence는 진짜 부재**(부재증명 완료·grep 0). ★★핵심=`Wms::allocationPlan`은 **단일 홉 출고 창고 선택(haversine)이지 multi-stop 경로 최적화가 아니며(오흡수 금지)**, Dispatch/ETA/Traffic은 부재(3PL 택배사가 경로 최적화 담당·Part 031/032/034 정합·과대주장 금지). 실행은 자체 배송/Fleet 운영 + External Map API/GPS 연동 후 전부 신설 종속.
