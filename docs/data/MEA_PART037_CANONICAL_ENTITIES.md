# MEA Part 037 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Logistics/WmsCctv/SupplyChain/Alerting 재사용·통합 Control Tower/GPS/차량 가시성 순신설·Part 031/033/036 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | SHIPMENT | 배송/추적 | `Logistics`·`OrderHub` | PARTIAL-strong |
| 2 | SHIPMENT_TRACK | 추적 이력 | `Logistics`(shipment_tracking) | PARTIAL-strong |
| 3 | TRACKING_EVENT | 추적 이벤트 | `Logistics`(track) | PARTIAL-strong |
| 4 | TRACKING_POINT | 부재(GPS 좌표점) | — | ABSENT(GPS 부재) |
| 5 | VISIBILITY_STATUS | 배송/창고 상태 | `Logistics`·`Wms`·`WmsCctv` | PARTIAL |
| 6 | ETA | 택배사 ETA 표시(자체 예측 아님) | `Logistics` | PARTIAL-weak |
| 7 | CONTROL_TOWER_ALERT | 알림 정책 | `Alerting`(alert_policies) | PARTIAL-strong |
| 8 | LOGISTICS_EXCEPTION | 이상·공급망 리스크 | `AnomalyDetection`·`SupplyChain`(risk) | PARTIAL |
| 9 | MONITORING_RULE | 알림 룰·리스크 룰 | `Alerting`·`SupplyChain`(sc_risk_rules) | PARTIAL |
| 10 | TRACKING_DEVICE | CCTV 카메라(차량 GPS 부재) | `WmsCctv`(RTSP/NVR) | PARTIAL-weak |
| 11 | LOCATION | 좌표(창고·GPS 부재) | `Wms`(geoCentroid) | PARTIAL-weak |
| 12 | VISIBILITY_POLICY | RBAC·권한 | `index.php` | PARTIAL |
| 13 | CONTROL_SESSION | CCTV 세션(형식 관제 세션 아님) | `WmsCctv`(세션) | PARTIAL-weak |
| 14 | VISIBILITY_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | OPERATION_STATUS | 창고/공급망 상태 | `Wms`·`SupplyChain` | PARTIAL |

## §6~§18 표준 판정
- **§6 Domain(10)**: Shipment=Logistics·Warehouse=WmsCctv/Wms·Inventory=Wms·공급망=SupplyChain. ★Vehicle/Driver/Hub Visibility(GPS/차량 부재)=ABSENT.
- **§7 Lifecycle(10)**: In Transit/Delivered=Logistics·Created=OrderHub. ★Hub Arrival/Departure/Pickup(Hub/자체 부재)=ABSENT.
- **§8 Tracking(8)**: Barcode/QR=Wms·택배사 추적=Logistics·CCTV=WmsCctv. ★GPS/RFID/IoT Sensor(차량 GPS 부재)=ABSENT.
- **§9 Visibility(8)**: Timeline/Progress=Logistics·Warehouse Status=Wms/WmsCctv·Customer=Logistics·권한=index. ★Vehicle Location/자체 ETA(GPS 부재)=ABSENT.
- **§10 Control Tower(8)**: Warehouse Monitoring=WmsCctv·Alert Center=Alerting·Exception=AnomalyDetection·공급망=SupplyChain. ★통합 Global Map/Command Center/Incident Management=ABSENT.
- **§11 Exception(8)**: Delay/이상=AnomalyDetection·Failure/Return=OrderHub·Escalation=Alerting·공급망 지연=SupplyChain. ★Route Deviation/Temperature/Vehicle Breakdown(GPS/IoT/차량 부재)=ABSENT.
- **§12 Analytics(8)**: On-Time=Logistics·ROI=Rollup/Pnl·리스크=SupplyChain. ★ETA Accuracy/Fleet Visibility=ABSENT.
- **§14 Security**: Tenant/RBAC/Encryption/★Device Auth(WmsCctv 세션)/Audit(Part 021 상속).
- **§18 AI**: 지연=AnomalyDetection·위험도=SupplyChain(risk)·Explainability=헌법 V4·물류 상태 직접 변경/관제 결정 자동 수행 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~3·§7·§14=추적/알림/감사) / PARTIAL(§5·§8·§9·§12·§15) / PARTIAL-weak(§6·§10·§11·§13 GPS/CCTV) / ABSENT(§4 TRACKING_POINT·통합 Control Tower/GPS/차량 Visibility).** 코드 0. ★추적(`Logistics`)·창고 관제(`WmsCctv`)·공급망(`SupplyChain`)·알림(`Alerting`) 재사용(★중복 추적/관제/가시성/알림 절대 금지·정본 재구현 금지)·통합 Control Tower/GPS/차량 가시성 순신설(부재·자체 차량/GPS 후·과대주장 금지)·Part 031/033/036 상속·★AI 물류 상태 직접 변경/관제 결정 자동 수행 불가(V3+V5+CHANGE_GATE).
