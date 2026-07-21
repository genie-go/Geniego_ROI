# MEA Part 037 — Enterprise Shipment Tracking, Visibility & Control Tower Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Logistics Foundation(Part 031)+WMS(033)+Last Mile(036)+Route(035)+ROI Platform**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**추적/창고 CCTV 관제/공급망 가시성/알림은 실재이나 통합 Control Tower/GPS/차량 가시성은 부재**(GT①·부재증명 완료). file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 운송/배송/창고/물류 자산 상태 실시간 추적·End-to-End Visibility·Control Tower 예외 통합 관제. TMS/WMS/Last Mile/Fleet/Route/IoT/GPS·Telematics/Customer/ROI/AI 연계 Enterprise Logistics Visibility Framework.

## §2 구현 범위
Shipment Tracking · Real-Time Visibility · Logistics Control Tower · Event Monitoring · Exception Management · ETA Visibility · Operational Dashboard · Analytics · Governance · AI Visibility Intelligence.

## §3 구현 목표 (10)
Shipment Tracking Engine · Logistics Visibility Engine · Control Tower Platform · Event Monitoring Engine · Exception Management Engine · Analytics Service · Control Tower Dashboard · Governance Manager · Audit Service · AI Visibility Advisor.

## §4 아키텍처 원칙 (10)
End-to-End Visibility · Real-Time Monitoring · Event Driven · Single Source of Truth · Policy Driven · Metadata Driven · AI Assisted · Enterprise Standard · High Availability · Audit by Default.

## §5 Canonical Entity (15)
SHIPMENT · SHIPMENT_TRACK · TRACKING_EVENT · TRACKING_POINT · VISIBILITY_STATUS · ETA · CONTROL_TOWER_ALERT · LOGISTICS_EXCEPTION · MONITORING_RULE · TRACKING_DEVICE · LOCATION · VISIBILITY_POLICY · CONTROL_SESSION · VISIBILITY_AUDIT · OPERATION_STATUS. → 상세 = `MEA_PART037_CANONICAL_ENTITIES.md`.

## §6 Visibility Domain (10)
Shipment/Vehicle/Warehouse/Hub/Driver/Cross Border/Inventory/Customer/Partner/Enterprise Visibility. Tracking Registry 기준. → ★현행=Shipment Visibility=`Logistics`(추적)·Warehouse Visibility=`WmsCctv`(CCTV·274차)+`Wms`(재고 상태)·Inventory=`Wms`(on_hand)·공급망=`SupplyChain`(sc_stages·risk). ★Vehicle/Driver/Hub Visibility(GPS/차량 부재·Part 034)=부재.

## §7 Shipment Lifecycle (10)
Created→Pickup Confirmed→In Transit→Hub Arrival→Hub Departure→Out for Delivery→Delivered→Completed→Archived→Audited. Event 기록. → ★현행=In Transit/Delivered=`Logistics`(택배사 추적 상태)·Created=`OrderHub`/`Wms`. ★Hub Arrival/Departure/Pickup(자체 물류·Hub 부재)=부재(3PL 상태만).

## §8 Shipment Tracking (8)
GPS/RFID/Barcode/QR/IoT Sensor/Mobile/Manual/Hybrid Tracking. 시간순 저장. → ★현행=Barcode/QR=`Wms`(wms_bins barcode)·택배사 추적=`Logistics`(스마트택배·shipment_tracking·시간순)·CCTV=`WmsCctv`(RTSP/NVR/ONVIF). ★GPS/RFID/IoT Sensor Tracking(차량 GPS 부재·Part 034/035)=부재.

## §9 Logistics Visibility (8)
Real-Time Location/ETA Visibility/Shipment Timeline/Vehicle·Warehouse Status/Delivery Progress/SLA Visibility/Customer Portal. 권한별. → ★현행=Shipment Timeline/Delivery Progress=`Logistics`(추적)·Warehouse Status=`Wms`/`WmsCctv`·Customer Visibility=`Logistics`(고객 추적)·권한=`index.php`(RBAC). ★Real-Time Vehicle Location/자체 ETA Visibility(GPS 부재)=부재.

## §10 Control Tower (8)
Real-Time Monitoring/Global Logistics Map/Exception·SLA·Delay Dashboard/Alert Center/Incident Management/Operations Command Center. 통합 관제. → ★현행=Warehouse Monitoring=`WmsCctv`(비디오 관제·274차)·Alert Center=`Alerting`(alert_policies·escalation)·Exception=`AnomalyDetection`·공급망 관제=`SupplyChain`(risk). ★통합 Global Logistics Map/Operations Command Center/Incident Management(형식 Control Tower Platform)=부재.

## §11 Exception Management (8)
Delay/Route Deviation/Lost Shipment/Temperature Alert/Vehicle Breakdown/Delivery Failure/Customs Delay/Escalation. 자동 알림/대응. → ★현행=Delay/이상=`AnomalyDetection`·Delivery Failure/Return=`OrderHub`(RETURN_TOKENS)·Escalation=`Alerting`·공급망 지연=`SupplyChain`(delayRate). ★Route Deviation/Temperature/Vehicle Breakdown(GPS/IoT/차량 부재)=부재.

## §12 Logistics Analytics (8)
On-Time Delivery/ETA Accuracy/Delay Frequency/Exception Rate/Tracking Coverage/Fleet Visibility/Operational Efficiency/Logistics ROI. → ★현행=On-Time seed=`Logistics`·Logistics ROI=`Rollup`/`Pnl`(배송비)·공급망 리스크=`SupplyChain`. ★ETA Accuracy/Fleet Visibility(GPS 부재)=부재.

## §13 Control Tower Governance (8)
Monitoring/Alert/Escalation/SLA/Tracking/Retention Policy · Compliance · Audit. → ★현행=Alert Policy=`Alerting`(alert_policies)·Audit=`SecurityAudit`·Compliance=`Compliance`. ★통합 Control Tower Governance=부분.

## §14 Data Security
Tenant Isolation · RBAC · Location Data Encryption · Device Authentication · Audit · Secure API. 위치/이동 데이터 최소권한. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·★Device Auth=`WmsCctv`(카메라 세션 인가·Authorization 헤더 대체 토큰·274차)·Audit=`SecurityAudit`. Location Data(GPS 부재)=창고 CCTV만.

## §15 Runtime 규칙
Tracking Event 수신 · 위치 갱신 · ETA 재계산 · Exception 탐지 · Alert 생성 · Dashboard 갱신 · Audit. → ★현행=Tracking Event=`Logistics`·Exception=`AnomalyDetection`·Alert=`Alerting`·Audit=`SecurityAudit`. ★위치 갱신/ETA 재계산(GPS 부재)=부분.

## §16 API 표준 (8)
Register Tracking Event · Update Location · Query Status · Query ETA · Create Alert · Query Control Tower Dashboard · Register Exception · Query Audit. → ★현행=Tracking=`Logistics` API(/v427/logistics/track·shipments)·Alert=`Alerting` API·CCTV=`WmsCctv` API(/api/wms/cameras)·공급망=`SupplyChain` API 실재. ★Update Location/Query ETA(GPS)=부분. Part 001 API 표준 상속.

## §17 Event 표준 (8)
TrackingEventReceived · ShipmentLocationUpdated · ETARecalculated · LogisticsAlertCreated · ExceptionDetected · ShipmentDelivered · ControlTowerUpdated · VisibilityAudited. → ★현행=TrackingEventReceived/ShipmentDelivered=`Logistics`·LogisticsAlertCreated=`Alerting`·ExceptionDetected=`AnomalyDetection` seed(동기·event-driven 부재). Data Platform §15 정합.

## §18 AI Integration
배송 지연 조기 예측 · 이상 이동 패턴 · ETA 정확도 · SLA 위반 예측 · 운영 병목 · Control Tower 우선순위 · 물류 위험도 · Explainable Visibility Insight. **AI는 물류 상태 직접 변경/관제 결정 자동 수행 불가.** → ★현행=지연 예측=`AnomalyDetection`/`DemandForecast`·물류 위험도=`SupplyChain`(risk_rules)·Explainability=헌법 V4·관제 결정 자동 수행 불가=헌법 V3+V5+`CHANGE_GATE`. ★이상 이동 패턴/ETA(GPS 부재)=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §19 성능 요구사항
Tracking Event ≤200ms · 위치 갱신 ≤300ms · ETA ≤500ms · Alert ≤500ms · Dashboard ≤2초 · Availability ≥99.99%. (현행 `Logistics`/`WmsCctv`/`Alerting` seed.)

## §20 Completion Criteria
Shipment Tracking Engine·Visibility·Control Tower·Exception·Analytics·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(추적/창고 CCTV 관제/공급망 가시성/알림 실재·통합 Control Tower/GPS/차량 가시성=미완). 코드 0.

## 판정
**PARTIAL / ABSENT-formal(통합 Control Tower·GPS·차량 가시성).** ★실재=Shipment Tracking(`Logistics`·스마트택배/DHL·shipment_tracking·시간순)·Warehouse Visibility/관제(`WmsCctv`·RTSP/NVR/ONVIF 실시간 카메라·비디오 관제·274차·자체 부재증명 이력)·공급망 가시성(`SupplyChain`·v420·sc_stages/suppliers/risk_rules·leadTime/delayRate/risk)·Alert Center(`Alerting`·alert_policies·escalation)·Exception(`AnomalyDetection`)·Inventory Visibility(`Wms` on_hand)·Logistics ROI(`Rollup`/`Pnl`)·Device Auth(`WmsCctv` 카메라 세션). ★**부재(부재증명 완료)=통합 Control Tower Platform(Global Logistics Map/Operations Command Center/Incident Management)·GPS/RFID/IoT Sensor Tracking(차량 GPS 부재·Part 034/035)·Vehicle/Driver Visibility(Part 034 부재)·자체 ETA Visibility Engine·Hub Visibility.** ★핵심=**추적·창고 CCTV 관제·공급망 가시성·알림은 실재이나 통합 Control Tower(Global Map/Command Center)·GPS/차량 가시성은 부재**(3PL 사용·자체 차량/GPS 부재·Part 034/035 정합·과대주장 금지·[[feedback_competitive_gap_verify]]). Logistics/Commerce Platform 상속(재정의 금지)·★중복 추적/창고 관제/공급망/알림 절대 금지(`Logistics`/`WmsCctv`/`SupplyChain`/`Alerting` 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 물류 상태 직접 변경/관제 결정 자동 수행 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 038 — Enterprise Reverse Logistics, Returns & Claims Management Architecture(본 Visibility 상속·★반품=`OrderHub` RETURN_TOKENS 실재).
