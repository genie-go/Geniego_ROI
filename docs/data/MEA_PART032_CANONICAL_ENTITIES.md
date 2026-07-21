# MEA Part 032 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Wms/Pnl/Logistics seed 재사용·TMS 핵심 대부분 순신설(부재증명)·Part 031/027 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | TRANSPORT_ORDER | 부재(운송 오더) | — | ABSENT |
| 2 | TRANSPORT_PLAN | 부재(운송 계획) | — | ABSENT |
| 3 | TRANSPORT_JOB | 부재 | — | ABSENT |
| 4 | TRANSPORT_ASSIGNMENT | 창고 할당(seed) | `Wms`(allocate/allocationPlan) | PARTIAL-weak |
| 5 | DISPATCH | 부재(배차) | — | ABSENT |
| 6 | CARRIER | 창고 캐리어 | `Wms.php`(listCarriers:368) | PARTIAL(seed) |
| 7 | VEHICLE | 부재(Fleet) | — | ABSENT |
| 8 | DRIVER | 부재(Driver) | — | ABSENT |
| 9 | FREIGHT | 배송비(seed) | `Pnl.php`(shippingCost:210) | PARTIAL(seed) |
| 10 | TRANSPORT_ROUTE | nearest warehouse seed | `Wms.php`(allocationPlan/geoCentroid) | PARTIAL-weak(seed) |
| 11 | TRANSPORT_STATUS | 배송추적 상태 | `Logistics`·`OrderHub` | PARTIAL |
| 12 | TRANSPORT_POLICY | 부재(운송 정책) | — | ABSENT |
| 13 | TRANSPORT_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 14 | TRANSPORT_EXCEPTION | 이상 탐지 | `AnomalyDetection` | PARTIAL |
| 15 | TRANSPORT_COST | 배송비 | `Pnl.php`(shippingCost) | PARTIAL(seed) |

## §6~§17 표준 판정
- **§6 Domain(10)**: Inter-Warehouse Transfer=Wms(transferLotsFefo)·Outbound=Wms(allocationPlan)만 seed. ★Inbound/Hub/Last Mile/Cross Border/Same-Day/Dedicated=ABSENT.
- **§7 Lifecycle(10)**: Delivery/In Transit=Logistics·Settlement=Pnl(배송비). ★Request/Planning/Carrier Selection/Dispatch/Pickup=ABSENT.
- **§8 Planning(8)**: Route seed=Wms(geoCentroid). ★Capacity/Carrier/Time Window/Multi-Stop/Cross Dock/Load/Simulation=ABSENT.
- **§9 Dispatch(8)**: Carrier Assignment seed=Wms(saveCarrier). ★Dispatch Engine/Driver/Vehicle Assignment=ABSENT.
- **§10 Freight(8)**: Freight Cost seed=Pnl(shippingCost). ★Freight Rate(Contract/Spot/Fuel/Toll)=ABSENT.
- **§11 Monitoring(8)**: 배송 추적=Logistics·Exception=AnomalyDetection·CCTV=WmsCctv. ★GPS/ETA/Temperature/Vehicle Health/Driver Activity=ABSENT.
- **§12 Security**: Tenant/RBAC/Encryption/Audit(Logistics 상속)·GPS Data Protection(GPS 부재)=부재.
- **§17 AI**: 지연/이상=AnomalyDetection·비용=Pnl·Explainability=헌법 V4·운송 지시/배차 자동 확정 불가=헌법 V3+V5+CHANGE_GATE. 계획/배차 최적화 AI=대상 엔진 부재. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§13 AUDIT) / PARTIAL(§4·§6·§9·§10·§11·§14·§15 seed) / ABSENT(§1·§2·§3·§5·§7·§8·§12 TRANSPORT_ORDER/PLAN/JOB/DISPATCH/VEHICLE/DRIVER/POLICY·형식 TMS 전 계층).** 코드 0. ★Carrier/Route seed(`Wms`)·Freight seed(`Pnl`)·배송추적(`Logistics`) 재사용(★중복 창고/캐리어/배송비 절대 금지·`Wms`/`Pnl` 정본 재구현 금지)·TMS 핵심(계획/배차/Fleet/Driver/운임율/GPS) 대부분 순신설(부재증명·과대주장 금지·라이브 검증 후)·Part 031/027 상속·★AI 운송 지시 자동 승인/배차 자동 확정 불가(V3+V5+CHANGE_GATE).
