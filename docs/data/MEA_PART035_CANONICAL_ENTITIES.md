# MEA Part 035 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★warehouse selection seed만(route optimization 아님·오흡수 금지)·Route 핵심 전부 순신설·Part 031/032/034 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | ROUTE | warehouse→배송지 단일 홉 seed | `Wms::allocationPlan`(:1014) | PARTIAL-weak(route 아님) |
| 2 | ROUTE_PLAN | 부재(multi-stop 계획) | — | ABSENT |
| 3 | ROUTE_SEGMENT | 부재 | — | ABSENT |
| 4 | STOP | 부재(배송 정류) | — | ABSENT |
| 5 | DISPATCH_PLAN | 부재(Vehicle/Driver 부재) | — | ABSENT |
| 6 | ETA | 택배사 추적 상태(자체 예측 아님) | `Logistics` | PARTIAL-weak |
| 7 | LOAD_PLAN | 부재(적재 계획) | — | ABSENT |
| 8 | DELIVERY_SEQUENCE | 부재(배송 순서) | — | ABSENT |
| 9 | TRAFFIC_EVENT | 부재(External Map 미연동) | — | ABSENT |
| 10 | OPTIMIZATION_POLICY | on_hand/근접 점수 seed | `Wms`(점수:903) | PARTIAL-weak |
| 11 | ROUTE_SCORE | warehouse 점수 seed | `Wms`(allocationPlan 점수) | PARTIAL-weak |
| 12 | ROUTE_STATUS | 배송 상태 | `Logistics` | PARTIAL |
| 13 | ROUTE_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 14 | ROUTE_EXCEPTION | 범용 이상(대상 부재) | `AnomalyDetection` | ABSENT(대상 없음) |
| 15 | ROUTE_SIMULATION | 부재 | — | ABSENT |

## §6~§18 표준 판정
- **§6 Domain(10)**: Delivery Route seed=Wms(창고→배송지 단일 홉). ★Multi-Stop/Cross Dock/Hub/Same-Day/Express/Reverse/Cross Border=ABSENT.
- **§7 Lifecycle(10)**: Monitoring=Logistics. ★Request/Planning/Optimization/Dispatch/Re-optimization=ABSENT.
- **§8 Optimization(8)**: Distance 근접=Wms(haversine)·Capacity=on_hand. ★Shortest Path/Fastest/Multi-Objective/multi-stop/Fuel/Cost/Time Window=ABSENT(single-hop만).
- **§9 Dispatch(8)**: ABSENT(Vehicle/Driver 부재·Part 034).
- **§10 ETA(8)**: 택배사 추적 상태=Logistics·Delay=AnomalyDetection(범용). ★자체 ETA Prediction/Weather/Traffic Adjustment=ABSENT.
- **§11 Traffic(8)**: ABSENT(External Map/Traffic API 미연동).
- **§12 Analytics(8)**: Route Cost=Pnl(배송비)·On-Time seed=Logistics. ★Route Efficiency/ETA Accuracy/Distance per Delivery=ABSENT.
- **§14 Security**: Tenant/RBAC/Encryption/Audit(신설 시 상속)·좌표=Wms(geoCentroid·위치 개인정보 보호).
- **§18 AI**: SLA/지연 잠재=AnomalyDetection/DemandForecast(대상 Route 부재)·Explainability=헌법 V4·차량 운행 직접 제어/배차 자동 확정 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§13 AUDIT) / PARTIAL-weak(§1·§6·§10·§11·§12 seed) / ABSENT(§2~5·§7~9·§15 ROUTE_PLAN/SEGMENT/STOP/DISPATCH/LOAD/SEQUENCE/TRAFFIC/SIMULATION·형식 Route 전 계층).** 코드 0. ★warehouse selection seed(`Wms::allocationPlan`·haversine·route optimization 아님·오흡수 금지)·배송 추적(`Logistics`)·Route Cost(`Pnl`) 재사용·Route Optimization(multi-stop)/Dispatch/ETA/Traffic 전부 순신설(자체 배송 운영+External Map API 후·과대주장 금지)·Part 031/032/034 상속·★AI 차량 운행 직접 제어/배차 자동 확정 불가(V3+V5+CHANGE_GATE).
