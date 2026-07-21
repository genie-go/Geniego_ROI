# MEA Part 032 — Enterprise Transportation Management System (TMS) Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Logistics Platform Foundation(Part 031)+Commerce Platform(Part 024 OMS·027 Inventory·029 Channel)+ROI Platform(016 Profit)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**TMS(운송 계획/배차/운임/GPS)는 대부분 부재**(GT①·부재증명 완료·Part 031 정합)·본 Part는 부재 도메인 신설 + carrier/geo routing/배송비 seed 승격. file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
운송 계획/배차/실행/모니터링/운임/운송 정산/성과 분석 통합 관리. Logistics Foundation/WMS/Fleet/Route/Last Mile/OMS/ERP/GPS·Telematics/ROI/AI 연계 Enterprise Transportation Framework.

## §2 구현 범위
Transportation Planning · Execution · Dispatch Management · Fleet Assignment · Carrier Management · Freight Management · Monitoring · Analytics · Governance · AI Transportation Intelligence.

## §3 구현 목표 (10)
Transportation Management Engine · Dispatch Engine · Planning Engine · Carrier Management Service · Freight Management Service · Analytics Service · Dashboard · Governance Manager · Audit Service · AI Transportation Advisor.

## §4 아키텍처 원칙 (10)
Transportation First · Plan Before Execute · Event Driven · Real-Time Visibility · Policy Driven · Metadata Driven · AI Assisted · Enterprise Standard · High Availability · Audit by Default.

## §5 Canonical Entity (15)
TRANSPORT_ORDER · TRANSPORT_PLAN · TRANSPORT_JOB · TRANSPORT_ASSIGNMENT · DISPATCH · CARRIER · VEHICLE · DRIVER · FREIGHT · TRANSPORT_ROUTE · TRANSPORT_STATUS · TRANSPORT_POLICY · TRANSPORT_AUDIT · TRANSPORT_EXCEPTION · TRANSPORT_COST. → 상세 = `MEA_PART032_CANONICAL_ENTITIES.md`.

## §6 Transportation Domain (10)
Inbound/Outbound/Inter-Warehouse Transfer/Hub/Last Mile/Cross Border/Same-Day/Scheduled/Dedicated/Enterprise Transportation. Transport Order 기준. → ★현행=Inter-Warehouse Transfer=`Wms`(transferLotsFefo·Part 027)만 seed·Outbound=`Wms::allocationPlan`(창고→배송지)·나머지(Inbound/Hub/Last Mile/Cross Border/Same-Day/Dedicated)=**부재**(부재증명).

## §7 Transportation Lifecycle (10)
Request→Planning→Carrier Selection→Dispatch→Pickup→In Transit→Delivery→Settlement→Completion→Archive. 실시간 추적. → ★현행=Delivery/In Transit 추적=`Logistics`(Part 031)·Settlement=`Pnl`(배송비). ★Request/Planning/Carrier Selection/Dispatch/Pickup=**부재**(형식 Lifecycle 없음).

## §8 Transportation Planning (8)
Route/Capacity/Carrier/Time Window/Multi-Stop/Cross Dock/Load Planning · Simulation. 정책 기반. → ★현행=Route seed=`Wms::allocationPlan`(geoCentroid·nearest warehouse·형식 최적화 아님). ★Capacity/Carrier/Time Window/Multi-Stop/Cross Dock/Load Planning/Simulation=**부재**.

## §9 Dispatch Management (8)
Automatic/Manual Dispatch · Driver/Vehicle/Carrier Assignment · Optimization · Approval · Reassignment. → ★현행=Carrier Assignment seed=`Wms`(listCarriers/saveCarrier·창고 캐리어). ★Automatic/Manual Dispatch·Driver/Vehicle Assignment·Dispatch Engine=**부재**(Driver/Vehicle 엔티티 자체 부재).

## §10 Freight Management (8)
Freight/Contract/Spot Rate · Fuel Surcharge · Toll Charge · Freight Calculation/Settlement/Audit. 계약·정책 기반. → ★현행=Freight Cost seed=`Pnl`(shippingCost·채널별 정률·무료배송 기준금액)·Freight Settlement=`Pnl`(배송비 정산). ★Freight Rate(Contract/Spot)·Fuel Surcharge·Toll Charge·형식 Freight Engine=**부재**.

## §11 Transportation Monitoring (8)
GPS Tracking · ETA · Delay Detection · Exception · Temperature · Vehicle Health · Driver Activity · Real-Time Dashboard. → ★현행=배송 추적=`Logistics`(스마트택배/DHL·Part 031)·Exception=`AnomalyDetection`·CCTV=`WmsCctv`(274차). ★GPS Tracking·ETA·Temperature·Vehicle Health·Driver Activity Monitoring=**부재**(GPS/telematics 없음).

## §12 Transportation Governance (8)
Dispatch/Carrier/Vehicle Assignment/Freight/SLA/Exception Policy · Compliance · Audit Trail. → ★현행=Audit=`SecurityAudit`·Compliance=`Compliance`. ★Dispatch/Carrier/Freight/SLA/형식 Governance Manager=**부재**.

## §13 Data Security
Tenant Isolation · RBAC · Transportation Data Encryption · GPS Data Protection · Audit Logging · Secure API Auth. → ★Logistics/Commerce 상속: Tenant=`Db.php`·RBAC/API Auth=`index.php`·Encryption=`Crypto`·Audit=`SecurityAudit`. GPS Data Protection(GPS 부재→해당 없음)=부재.

## §14 Runtime 규칙
Transport Order 검증 · 운송 계획 생성 · 배차 · 운임 계산 · Tracking Event · Exception · Audit. → ★현행=Tracking Event=`Logistics`·운임(배송비)=`Pnl`·Audit=`SecurityAudit`. ★Transport Order/운송 계획/배차 Runtime=**부재**.

## §15 API 표준 (8)
Create Transport Order · Generate Transport Plan · Assign Vehicle/Driver · Dispatch · Update Status · Query Freight · Query Audit. → ★현행=Tracking=`Logistics` API·Freight(배송비)=`Pnl` API seed. ★Transport Order/Plan/Assign Vehicle·Driver/Dispatch API=**부재**. Part 001 API 표준(`/api` 접두·$register) 상속.

## §16 Event 표준 (8)
TransportOrderCreated · TransportPlanned · DispatchCompleted · VehicleAssigned · DriverAssigned · ShipmentPickedUp · DeliveryCompleted · TransportationAudited. → ★현행=DeliveryCompleted=`Logistics`(추적) seed. ★TransportOrder/Planned/Dispatch/Vehicle/Driver/Pickup Event=**부재**. Data Platform §15 정합.

## §17 AI Integration
최적 운송 계획 · 지연 예측 · 배차 최적화 · 비용 예측 · Carrier 성과 · SLA 위반 예측 · Freight 최적화 · Explainable Transportation Insight. **AI는 운송 지시 자동 승인/배차 자동 확정 불가.** → ★현행=지연/이상=`AnomalyDetection`·비용=`Pnl`(배송비)·Explainability=헌법 V4·배차 자동 확정 불가=헌법 V3+V5+`CHANGE_GATE`. ★운송 계획/배차 최적화 AI=부재(대상 엔진 부재). 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §18 성능 요구사항
운송 계획 ≤2초 · 자동 배차 ≤3초 · 운임 계산 ≤500ms · Tracking Event ≤500ms · Dashboard ≤2초 · Availability ≥99.99%. (대상 엔진 미존재·벤치 대상 부재.)

## §19 Completion Criteria
TMS Engine·Planning·Dispatch·Freight·Monitoring·Governance·Security·Runtime·API/Event·AI 구현. → **대부분 미충족·부재**(carrier/geo routing/배송비 seed만·TMS 전 계층=부재). 코드 0.

## 판정
**ABSENT-heavy / PARTIAL-weak(seed만).** ★실재 seed=Carrier Registry(`Wms`·listCarriers/saveCarrier)·Route seed(`Wms::allocationPlan`·geoCentroid nearest warehouse·형식 최적화 아님)·Freight Cost seed(`Pnl`·shippingCost 채널별 정률·무료배송 기준)·배송 추적(`Logistics`·Part 031)·Inter-Warehouse Transfer(`Wms::transferLotsFefo`)·Exception(`AnomalyDetection`)·CCTV(`WmsCctv`)·Security(Logistics 상속). ★**부재(부재증명 완료·전용 handler grep 0)=Transportation Planning Engine·Dispatch Engine·Fleet/Vehicle/Driver Assignment·Freight Rate(Contract/Spot/Fuel Surcharge/Toll)·GPS Tracking·ETA·Telematics·Temperature/Vehicle Health/Driver Activity Monitoring·Transport Order/Plan/Job·형식 TMS 전 계층.** ★핵심=carrier/geo routing/배송비 seed만 존재하며 **TMS 핵심(운송 계획·배차·운임율·GPS)은 진짜 부재**(Part 031 정합·과대주장 금지·[[feedback_competitive_gap_verify]]). Logistics/Commerce Platform 상속(재정의 금지)·★중복 창고/캐리어/배송비 도메인 절대 금지(값 분산=회귀·`Wms`/`Pnl` 정본 재구현 금지)·부재 도메인 라이브 검증 후 구현 권장·마케팅 AI KEEP_SEPARATE·★AI 운송 지시 자동 승인/배차 자동 확정 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 033 — Enterprise Warehouse Management System (WMS) Architecture(본 TMS 상속·★WMS는 `Wms` 실 강함·Part 027 상세).
