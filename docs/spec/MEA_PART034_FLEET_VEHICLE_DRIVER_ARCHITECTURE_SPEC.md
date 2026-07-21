# MEA Part 034 — Enterprise Fleet, Vehicle & Driver Management Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Logistics Platform Foundation(Part 031)+TMS(Part 032)+WMS(Part 033)+ROI Platform(016 Profit)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★★**Fleet/Vehicle/Driver는 도메인 자체가 사실상 부재**(GT①·부재증명 완료·grep 0). ★비즈니스 모델 실측: GeniegoROI는 **3PL 택배사(스마트택배 CJ/롯데/한진/로젠/우체국·DHL)를 사용하는 e-커머스 ROI 플랫폼**이지 자체 차량/기사 운영 물류사가 아님 → Fleet/Vehicle/Driver 관리는 현 범위 밖·전부 순신설. file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
전 차량/운전자/운송 장비/유지보수/운행/연료/안전/법규 준수 통합 관리. Logistics Foundation/TMS/Route/Last Mile/GPS·Telematics/IoT/ERP/ROI/AI 연계 Enterprise Fleet Framework.

## §2 구현 범위
Fleet/Vehicle/Driver Management · Vehicle Assignment · Maintenance · Fuel · Safety Management · Fleet Analytics · Governance · AI Fleet Intelligence.

## §3 구현 목표 (10)
Fleet Management Engine · Vehicle Management Service · Driver Management Service · Assignment Engine · Maintenance Management Engine · Fuel Management Service · Fleet Analytics Service · Fleet Dashboard · Fleet Audit Service · AI Fleet Advisor.

## §4 아키텍처 원칙 (10)
Fleet First · Safety First · Real-Time Visibility · Event Driven · Policy Driven · Metadata Driven · AI Assisted · Enterprise Standard · High Availability · Audit by Default.

## §5 Canonical Entity (15)
FLEET · VEHICLE · DRIVER · VEHICLE_TYPE · DRIVER_LICENSE · VEHICLE_ASSIGNMENT · MAINTENANCE_PLAN · MAINTENANCE_RECORD · FUEL_TRANSACTION · VEHICLE_INSPECTION · TELEMATICS_DEVICE · FLEET_POLICY · FLEET_STATUS · FLEET_AUDIT · FLEET_EXCEPTION. → 상세 = `MEA_PART034_CANONICAL_ENTITIES.md`. ★대부분 부재.

## §6 Fleet Domain (10)
Delivery Vehicle/Cargo Truck/Refrigerated/Electric/Motorcycle/Trailer/Forklift/Rental Fleet/Partner Fleet/Enterprise Fleet. Fleet Master 기준. → ★현행=**전부 부재**(자체 차량 없음). Partner Fleet seed=3PL 택배사(`Logistics`·`Wms` wms_carriers)만 간접 존재(소유 차량 아님).

## §7 Fleet Lifecycle (10)
Registration→Inspection→Available→Assignment→In Operation→Maintenance→Suspension→Retirement→Disposal→Archive. 실시간 상태. → ★현행=**부재**(Vehicle 엔티티 없음·형식 Lifecycle 없음).

## §8 Vehicle Management (8)
Registration/Classification/Asset Tracking/License/Insurance/Inspection Schedule/Availability/History. 변경 불가 감사. → ★현행=**부재**(Vehicle 테이블·함수 grep 0). Asset Tracking seed=`WmsCctv`(창고 CCTV·차량 아님·274차).

## §9 Driver Management (8)
Registration/License Validation/Qualification/Working Schedule/Assignment/Safety Training/Performance/Compliance. 자격 만료 알림. → ★현행=**부재**(Driver 엔티티 없음). 만료 알림 seed=`Alerting`(범용 알림·기사 자격 아님).

## §10 Vehicle Assignment (8)
Automatic/Manual Assignment/Driver·Capacity·Skill·Route Matching/Schedule Optimization/Reallocation. → ★현행=**부재**(배차 없음·Vehicle/Driver 부재). Route Matching seed=`Wms::allocationPlan`(창고→배송지 geo·차량 배차 아님·Part 032).

## §11 Maintenance Management (8)
Preventive/Corrective Maintenance/Scheduling/Parts/Cost/History/Health Check/Approval. 전체 수명주기. → ★현행=**부재**(정비 없음). 고장 예측 잠재 엔진=`ModelMonitor`/`DemandForecast`(범용·차량 정비 아님).

## §12 Fuel & Operation Management (8)
Fuel Consumption/Cost/EV Charging/Mileage/Engine Hours/Idle Time/Operating Cost/Carbon Emission. ESG 연계. → ★현행=**부재**(연료/운행 데이터 없음·GPS/telematics 부재). Operating Cost seed=`Pnl`(배송비 shippingCost·연료비 아님). Carbon/ESG=부재(Part 019 정합).

## §13 Fleet Analytics (8)
Fleet Utilization/Vehicle Availability/Driver Productivity/Fuel Efficiency/Maintenance Cost/Operating Cost/Fleet ROI/Safety Score. → ★현행=**부재**(Fleet 데이터 없음). Operating Cost=`Pnl`(배송비)·Fleet ROI 잠재=`Rollup`/`Pnl`(대상 Fleet 부재).

## §14 Fleet Governance (8)
Assignment/Maintenance/Driver Qualification/Safety/Compliance/Utilization Policy · Audit · Exception. → ★현행=Audit=`SecurityAudit`·Compliance=`Compliance`(범용). ★Fleet 전용 Governance=부재.

## §15 Data Security
Tenant Isolation · RBAC · Vehicle Data Encryption · Driver Information Protection · Device Authentication · Audit Logging. 개인정보·운행정보 분리. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·Audit=`SecurityAudit`·No-PII(v418.1). ★Vehicle/Driver 데이터(부재)→해당 없음. Device Auth seed=`WmsCctv`(CCTV만).

## §16 Runtime 규칙
차량 상태 검증 · 운전자 자격 · 차량 배정 · 정비 일정 · 운행 데이터 · Event · Audit. → ★현행=Audit=`SecurityAudit`만. ★차량/운전자/배정/정비/운행 Runtime=부재.

## §17 API 표준 (8)
Register Vehicle/Driver · Assign Vehicle/Driver · Update Status · Record Fuel · Register Maintenance · Query Fleet Status. → ★현행=**전부 부재**(Fleet API 없음). Part 001 API 표준(`/api` 접두·$register) 상속(신설 시).

## §18 Event 표준 (8)
VehicleRegistered/DriverRegistered/VehicleAssigned/MaintenanceScheduled/MaintenanceCompleted/FuelRecorded/FleetStatusUpdated/FleetAudited. → ★현행=**전부 부재**. Data Platform §15 정합(신설 시).

## §19 AI Integration
차량 고장 예측 · 예방 정비 추천 · 연료 소비 최적화 · 운전자 성과 · 차량 배치 최적화 · 안전사고 위험 예측 · 차량 교체 시점 · Explainable Fleet Insight. **AI는 차량 자동 배정/운전자 자동 승인 불가.** → ★현행=고장 예측 잠재 엔진=`ModelMonitor`/`AnomalyDetection`(범용·대상 Fleet 부재)·Explainability=헌법 V4·자동 배정/승인 불가=헌법 V3+V5+`CHANGE_GATE`. ★Fleet AI=대상 도메인 부재로 전부 순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §20 성능 요구사항
차량 조회 ≤300ms · 배정 ≤1초 · 운전자 검증 ≤300ms · 정비 일정 ≤1초 · Dashboard ≤2초 · Availability ≥99.99%. (대상 도메인 미존재·벤치 대상 부재.)

## §21 Completion Criteria
Fleet Engine·Vehicle·Driver·Assignment·Maintenance·Fuel·Governance·Security·API/Event·AI 구현. → **거의 전부 미충족·부재**(Fleet/Vehicle/Driver 도메인 자체 부재). 코드 0.

## 판정
**ABSENT (near-total) / seed 극소.** ★현행 substrate=**거의 전무**: Fleet/Vehicle/Driver/Maintenance/Fuel/Telematics 전용 테이블·함수 **부재(부재증명 완료·grep 0)**. 극소 seed=Partner Fleet(3PL 택배사·`Logistics`/`Wms` wms_carriers·소유 차량 아님)·Operating Cost(`Pnl` 배송비·연료비 아님)·Asset/Device Tracking(`WmsCctv` 창고 CCTV·차량 아님)·고장 예측 잠재 엔진(`ModelMonitor`/`AnomalyDetection`·대상 Fleet 부재)·Audit(`SecurityAudit`). ★★핵심=**GeniegoROI는 3PL 택배사를 사용하는 e-커머스 ROI 플랫폼이지 자체 차량/기사 운영 물류사가 아니므로 Fleet/Vehicle/Driver 관리는 현 비즈니스 범위 밖**(과대주장 금지·[[feedback_competitive_gap_verify]]). ★도메인 전부 순신설(자체 Fleet 운영 착수 시·라이브 차량/GPS/기사 연동 필수·블라인드 신설 금지·"코드 존재≠구현 완료" 283차). Logistics/Commerce Platform 상속(재정의 금지)·★중복 택배사/배송비 도메인 절대 금지(`Logistics`/`Pnl` 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 차량 자동 배정/운전자 자동 승인 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 035 — Enterprise Route Optimization & Dispatch Intelligence Architecture(본 Fleet 상속·★Route Optimization 부재·allocationPlan seed만).
