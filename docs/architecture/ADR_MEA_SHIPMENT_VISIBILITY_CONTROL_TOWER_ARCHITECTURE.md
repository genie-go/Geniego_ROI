# ADR — MEA Part 037 Enterprise Shipment Tracking, Visibility & Control Tower Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part037 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 037은 Shipment Tracking/Visibility/Control Tower. ★**추적/창고 CCTV 관제/공급망 가시성/알림은 실재이나 통합 Control Tower/GPS/차량 가시성은 부재**: 실재=`Logistics`(스마트택배/DHL·shipment_tracking·GT①)·`WmsCctv`(274차·RTSP/NVR/ONVIF 실시간 카메라·비디오 관제·GT①)·`SupplyChain`(v420·sc_stages/suppliers/risk_rules·leadTime/delayRate·GT①)·`Alerting`(alert_policies·escalation·GT①)·`AnomalyDetection`(exception). 부재=통합 Control Tower Platform·GPS/IoT Sensor·Vehicle/Driver Visibility(Part 034 부재). 본 Part는 Logistics(Part 031)/WMS(033)/Last Mile(036)/Route(035) 상속(재정의 금지).

## 결정
- **D-1 (Part 031/033/035/036/Data Platform 재정의 금지):** Logistics Foundation(Part 031)·WMS(Part 033)·Route(Part 035)·Last Mile(Part 036)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (Shipment Tracking = Logistics 승격·★중복 추적 절대 금지):** 추적 = `Logistics`(스마트택배 t_key 1개로 전 택배사·DHL·shipment_tracking·시간순). ★택배사 통합 추적 정본(Part 031/036·재구현 금지). ★중복 추적 신설 절대 금지. 형식 Shipment Tracking Engine=`Logistics` 승격.
- **D-3 (창고 관제/공급망 가시성 = WmsCctv/SupplyChain 승격):** Warehouse Visibility/관제 = `WmsCctv`(RTSP/NVR/ONVIF 실시간 카메라·비디오 관제·274차·★자체 부재증명 이력=cctv|rtsp|nvr|onvif grep 0 확인 후 신설)·공급망 가시성=`SupplyChain`(sc_stages/suppliers/risk_rules·leadTime/delayRate/risk). ★재구현 금지. 형식 Visibility Engine=승격.
- **D-4 (Control Tower/GPS/차량 가시성 = 부재·형식 신설):** ★통합 Control Tower Platform(Global Logistics Map/Operations Command Center/Incident Management)·GPS/RFID/IoT Sensor Tracking·Vehicle/Driver Visibility(Part 034 부재)·자체 ETA Visibility Engine·Hub Visibility=**부재·순신설**(부재증명 완료). ★3PL 사용·자체 차량/GPS 부재(Part 034/035 정합·과대주장 금지). Control Tower seed=`WmsCctv`(창고 관제)+`Alerting`(alert center)이나 통합 Global Map/Command Center 아님.
- **D-5 (Alert/Security/AI = 헌법 정합):** Alert Center=`Alerting`(alert_policies·escalation)·Exception=`AnomalyDetection`·Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·★Device Auth=`WmsCctv`(카메라 세션 인가 토큰·274차)·Audit=`SecurityAudit`. AI(지연/위험도)=`AnomalyDetection`/`SupplyChain`(risk)·Explainability=헌법 V4·★AI 물류 상태 직접 변경/관제 결정 자동 수행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Logistics/Commerce/Data Platform/헌법 상속·재정의 금지·추적(`Logistics`)·창고 관제(`WmsCctv`)·공급망 가시성(`SupplyChain`)·Alert(`Alerting`)·Exception(`AnomalyDetection`)·`SecurityAudit` 재사용(★중복 추적/창고 관제/공급망/알림 절대 금지·정본 재구현 금지)·통합 Control Tower Platform(Global Map/Command Center)·GPS/IoT/차량 가시성·자체 ETA Visibility만 신설(부재·자체 차량/GPS 운영 착수 시·과대주장 금지). 실행은 통합 Control Tower + 자체 GPS/차량 연동 종속.
