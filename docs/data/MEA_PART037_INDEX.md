# MEA Part 037 — Enterprise Shipment Tracking, Visibility & Control Tower Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★부재증명 완료·과대주장 금지.

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART037_SHIPMENT_VISIBILITY_CONTROL_TOWER_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§20 |
| 2 | ADR | `docs/architecture/ADR_MEA_SHIPMENT_VISIBILITY_CONTROL_TOWER_ARCHITECTURE.md` | 결정 D-1~D-5 |
| 3 | GT① EXISTING | `docs/data/MEA_PART037_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART037_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART037_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§18 |
| 6 | GOVERNANCE | `docs/data/MEA_PART037_GOVERNANCE_MECHANISMS.md` | §7~§20 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART037_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL / ABSENT-formal(통합 Control Tower·GPS·차량 가시성).** ★실재=Shipment Tracking(`Logistics`·스마트택배/DHL·shipment_tracking·시간순)·Warehouse Visibility/관제(`WmsCctv`·RTSP/NVR/ONVIF 실시간 카메라·비디오 관제·274차·자체 부재증명 이력)·공급망 가시성(`SupplyChain`·v420·sc_stages/suppliers/risk_rules·leadTime/delayRate)·Alert Center(`Alerting`·alert_policies·escalation)·Exception(`AnomalyDetection`)·Inventory Visibility(`Wms`)·Device Auth(`WmsCctv` 세션)이나, **통합 Control Tower Platform(Global Logistics Map/Operations Command Center/Incident Management)·GPS/RFID/IoT Sensor Tracking·Vehicle/Driver Visibility(Part 034 부재)·자체 ETA Visibility Engine·Hub Visibility은 미완**(부재증명 완료·3PL·자체 차량/GPS 부재·Part 034/035 정합·과대주장 금지). ★중복 추적/관제/가시성/알림 절대 금지(정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 물류 상태 직접 변경/관제 결정 자동 수행 불가(V3+V5). 코드 변경 0.

## 상속·다음
- 상속: Logistics Platform Foundation(Part 031)+WMS(033)+Route(035)+Last Mile(036)+ROI Platform(016)+헌법 V3/V4/V5.
- 다음: **MEA Part 038 — Enterprise Reverse Logistics, Returns & Claims Management Architecture**(본 Visibility 상속·★반품=`OrderHub` RETURN_TOKENS 실재).

## ★Logistics Platform 진행 (Part 031~037)
Part 031 Foundation · 032 TMS · 033 WMS(★PARTIAL-strong) · 034 Fleet(ABSENT) · 035 Route(ABSENT-heavy) · 036 Last Mile(PARTIAL-weak) · **037 Tracking/Visibility/Control Tower(PARTIAL·추적/CCTV 관제/공급망/알림 실재·통합 Control Tower/GPS 부재)** → 다음 038 Reverse Logistics/Returns/Claims.
