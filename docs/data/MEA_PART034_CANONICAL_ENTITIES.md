# MEA Part 034 — Canonical Entities Design & Judgment (§5~§19)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★도메인 자체 부재(부재증명·grep 0)·극소 seed는 Fleet 아님(오흡수 금지)·전부 순신설·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | FLEET | 부재(3PL 택배사만) | `Logistics`(택배사·소유 아님) | ABSENT |
| 2 | VEHICLE | 부재 | — | ABSENT |
| 3 | DRIVER | 부재 | — | ABSENT |
| 4 | VEHICLE_TYPE | 부재 | — | ABSENT |
| 5 | DRIVER_LICENSE | 부재 | — | ABSENT |
| 6 | VEHICLE_ASSIGNMENT | 부재(창고 할당은 Part 032/033) | — | ABSENT |
| 7 | MAINTENANCE_PLAN | 부재 | — | ABSENT |
| 8 | MAINTENANCE_RECORD | 부재 | — | ABSENT |
| 9 | FUEL_TRANSACTION | 부재(배송비≠연료비) | — | ABSENT |
| 10 | VEHICLE_INSPECTION | 부재 | — | ABSENT |
| 11 | TELEMATICS_DEVICE | 부재(CCTV=창고) | `WmsCctv`(차량 아님) | ABSENT |
| 12 | FLEET_POLICY | 부재 | — | ABSENT |
| 13 | FLEET_STATUS | 부재 | — | ABSENT |
| 14 | FLEET_AUDIT | 해시체인(신설 시) | `SecurityAudit.php` | PARTIAL(범용) |
| 15 | FLEET_EXCEPTION | 범용 이상(대상 부재) | `AnomalyDetection` | ABSENT(대상 없음) |

## §6~§19 표준 판정
- **§6 Domain(10)**: ★전부 부재(자체 차량 없음)·Partner Fleet seed=3PL 택배사(소유 아님).
- **§7 Lifecycle(10)**: 부재(Vehicle 엔티티 없음).
- **§8 Vehicle Mgmt(8)**: 부재·Asset Tracking seed=WmsCctv(창고·차량 아님).
- **§9 Driver Mgmt(8)**: 부재·만료 알림 seed=Alerting(범용).
- **§10 Assignment(8)**: 부재·Route Matching seed=Wms allocationPlan(창고→배송지·차량 배차 아님).
- **§11 Maintenance(8)**: 부재·고장 예측 잠재=ModelMonitor(대상 부재).
- **§12 Fuel & Operation(8)**: 부재·Operating Cost seed=Pnl(배송비·연료비 아님)·Carbon/ESG=부재.
- **§13 Analytics(8)**: 부재·Operating Cost=Pnl·Fleet ROI 잠재=Rollup/Pnl(대상 부재).
- **§14 Security**: Tenant/RBAC/Encryption/Audit(신설 시 상속)·No-PII(기사 개인정보 보호).
- **§19 AI**: 고장/성과=ModelMonitor/AnomalyDetection(대상 Fleet 부재)·Explainability=헌법 V4·차량 자동 배정/운전자 자동 승인 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**ABSENT (near-total)(§1~13·§15) / PARTIAL(§14 범용 Audit).** 코드 0. ★Fleet/Vehicle/Driver 도메인 자체 부재(부재증명 완료·grep 0)·극소 seed(3PL `Logistics`·`Wms` 택배사·`Pnl` 배송비·`WmsCctv` CCTV)는 **Fleet 아님(오흡수 금지)**·전부 순신설(자체 Fleet 운영 착수 시·라이브 검증 후·과대주장 금지)·Part 031/032/033 상속·★AI 차량 자동 배정/운전자 자동 승인 불가(V3+V5+CHANGE_GATE). ★GeniegoROI=3PL 사용 e-커머스 ROI 플랫폼·현 범위 밖.
