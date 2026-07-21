# MEA Part 037 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 037 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
tracking/visibility/control-tower/cctv/global-map/iot-sensor/supplychain/alert 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★추적·창고 CCTV 관제·공급망 가시성·알림 실재·통합 Control Tower/GPS 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Shipment Tracking | 3PL 통합 추적 | `Logistics.php`(스마트택배/DHL·shipment_tracking·Part 031) | PARTIAL-strong |
| Warehouse Visibility/관제 | CCTV 실시간 카메라 | `WmsCctv.php`(274차·RTSP:63/NVR/ONVIF·비디오 관제) | PARTIAL-strong |
| 공급망 가시성 | 스테이지/공급사/리스크 | `SupplyChain.php`(v420·sc_stages/sc_suppliers/sc_risk_rules·leadTime/delayRate:46) | PARTIAL-strong |
| Alert Center | 알림 정책·escalation | `Alerting.php`(alert_policies·escalation) | PARTIAL-strong |
| Exception/Delay | 이상 탐지 | `AnomalyDetection.php` | PARTIAL |
| Inventory Visibility | on_hand | `Wms`(wms_stock) | PARTIAL |
| Barcode/QR Tracking | bin barcode | `Wms`(wms_bins barcode) | PARTIAL |
| Logistics ROI | 배송비/SoS | `Rollup`/`Pnl` | PARTIAL |
| Device Auth | 카메라 세션 인가 | `WmsCctv`(세션 토큰:36) | PARTIAL-strong |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·전용 handler grep 0)
★**통합 Control Tower Platform**(Global Logistics Map/Operations Command Center/Incident Management)·**GPS/RFID/IoT Sensor Tracking**(차량 GPS 부재·Part 034/035)·**Vehicle/Driver Visibility**(Part 034 부재)·**Hub Visibility**·**자체 ETA Visibility Engine**·Route Deviation/Temperature/Vehicle Breakdown Exception(GPS/IoT 부재)·CONTROL_SESSION(형식 관제 세션)·Event 표준(ControlTowerUpdated 등).

## 판정
**PARTIAL / ABSENT-formal(통합 Control Tower·GPS·차량).** ★실재=Shipment Tracking(`Logistics`)·Warehouse Visibility/관제(`WmsCctv`·CCTV 실시간·274차)·공급망 가시성(`SupplyChain`·sc_stages/risk)·Alert Center(`Alerting`)·Exception(`AnomalyDetection`)·Inventory Visibility(`Wms`)·Device Auth(`WmsCctv` 세션)이나, **통합 Control Tower Platform(Global Map/Command Center)·GPS/IoT Sensor Tracking·Vehicle/Driver Visibility·자체 ETA Visibility는 부재**(부재증명 완료·3PL 사용·자체 차량/GPS 부재·Part 034/035 정합). 실행은 통합 Control Tower + 자체 GPS/차량 연동 후 신설 종속.
