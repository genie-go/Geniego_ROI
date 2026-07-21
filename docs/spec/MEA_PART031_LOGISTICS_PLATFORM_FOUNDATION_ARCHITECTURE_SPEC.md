# MEA Part 031 — Logistics Platform Foundation Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**신규 계열(Logistics Platform Foundation)**: Commerce Platform(021~030)+Data Platform(001~012)+ROI Platform 위에서 물류 서비스 공통 기반을 정의하며, 이후 Logistics Part(032~)는 본 문서를 확장만 하고 중복 정의하지 않는다(Golden Rule=Extend). ★**창고·배송추적은 실재하나 TMS/Fleet/Driver/Route/Hub는 대부분 부재**(GT①·부재증명 완료)·본 Part는 형식 통합 Logistics Foundation 계층 + 부재 도메인 신설. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
전 물류 서비스 공통 플랫폼 정의. 운송/창고/배송/허브/차량/기사/화물/고객/파트너/AI/ROI 통합 물류 플랫폼. TMS/WMS/Last Mile/Fleet/Route/Tracking/Cross Border 하위 문서 기준.

## §2 구현 범위
Logistics Platform Foundation · Domain Model · Core Service · Runtime · Integration · Security · Governance · API Standard · Event Framework · AI Logistics Foundation.

## §3 구현 목표 (10)
Logistics Platform Core · Domain Framework · Runtime Engine · Service Registry · API Gateway · Event Bus · Monitoring Service · Governance Manager · Audit Service · AI Logistics Foundation.

## §4 아키텍처 원칙 (10)
Logistics First · API First · Event Driven · Cloud Native · Metadata Driven · AI Assisted · Enterprise Standard · High Availability · Multi-Tenant · Audit by Default.

## §5 Canonical Entity (15)
LOGISTICS_ORDER · SHIPMENT · DELIVERY · TRANSPORT · ROUTE · VEHICLE · DRIVER · WAREHOUSE · HUB · CUSTOMER · PARTNER · CARGO · TRACKING_EVENT · LOGISTICS_POLICY · LOGISTICS_AUDIT. → 상세 = `MEA_PART031_CANONICAL_ENTITIES.md`.

## §6 Logistics Domain (10)
Transportation/Warehouse/Distribution/Last Mile/Fleet/Route/Cross Border/Reverse Logistics/Same Day/Enterprise Logistics. Logistics Domain Registry 기준. → ★현행=Warehouse=`Wms`(205차·창고/할당/FEFO·Part 027 실재)·Distribution=`Wms`(allocationPlan)·배송추적=`Logistics`. ★Transportation/Fleet/Route/Cross Border/Reverse/Same Day/Last Mile=**부재**(전용 handler 없음·부재증명).

## §7 Platform Layer (8)
Presentation/API/Business Service/Logistics Engine/Integration/Event/Data/AI Layer. 표준 인터페이스. → ★현행=API=`index.php`(Gateway·RBAC·`/api` 접두)·Data=`Db.php`·Integration=`ChannelRegistry`(sync_kind='logistics'/'tracking'). Business Service/Engine Layer(물류 전용)=부분. ★형식 계층 분리=부분.

## §8 Core Services (8)
Shipment/Order/Route/Fleet/Driver/Warehouse/Tracking/Notification Service. 독립 확장. → ★현행=Warehouse Service=`Wms`·Tracking Service=`Logistics`(스마트택배·DHL)·Notification=`Mailer`/`SmsMarketing`·Order=`OrderHub`. ★Route/Fleet/Driver Service=**부재**.

## §9 Integration Framework (8)
REST/GraphQL API · Webhook · Kafka Event · File · ERP/OMS/Commerce Integration. Integration Gateway. → ★현행=REST=`index.php`·OMS/Commerce=`OrderHub`/`Wms`·물류 채널=`ChannelRegistry`(sync_kind='logistics'·`Logistics::isLogisticsChannel`)·자격증명=`ChannelCreds`. GraphQL/Kafka(형식)=부재.

## §10 Runtime Architecture (8)
Service Discovery/Load Balancing/Workflow Orchestration/Event Processing/Cache/Retry/Circuit Breaker/Failover. → ★현행=인프라 레벨(nginx/php-fpm 2 pool·[[reference_phpfpm_pool_tuning_502]])·Cache=`Rollup` 사전집계. ★형식 Service Discovery/Circuit Breaker/Failover(애플리케이션 레벨)=부재(단일 호스트·모놀리식).

## §11 Governance (8)
Domain/API/Event Standard · Naming Convention · Version Policy · Security Policy · SLA Policy · Audit Trail. → ★현행=API=버전 라우트(/v377~/v431)·Security=`index.php`(RBAC)·Audit=`SecurityAudit`·CHANGE_GATE. 형식 통합 Logistics Governance Manager=부재.

## §12 Data Security
Tenant Isolation · RBAC · Encryption at Rest/Transit · Secret Management · Audit Logging · API Authentication · Zero Trust. → ★Commerce/Data Platform 상속: Tenant=`Db.php`·RBAC/API Auth=`index.php`·Encryption=`Crypto`(at rest)·Secret=`ChannelCreds`·Audit=`SecurityAudit`. Zero Trust Network(형식)=부분.

## §13 Runtime 규칙
Service Validation · API Auth · Event Publication · Policy Validation · Monitoring · Logging · Audit. → ★현행=API Auth=`index.php`·Audit=`SecurityAudit`·Monitoring=`Alerting`. Event Publication(형식 Event Bus)=부재.

## §14 API 표준 (8)
Register Logistics Service · Query Status · Register/Query Shipment · Register Vehicle/Driver · Query Route · Query Platform Health. → ★현행=Shipment=`Logistics` API(/v427/logistics/track·shipments·carriers)·Health=`/health`. ★Register Vehicle/Driver·Query Route=**부재**. Part 001 API 표준(`/api` 접두·$register·[[reference_api_prefix_routing]]) 상속.

## §15 Event 표준 (8)
ShipmentCreated · LogisticsOrderCreated · VehicleRegistered · DriverAssigned · RouteCreated · TrackingUpdated · LogisticsCompleted · LogisticsAudited. → ★현행=TrackingUpdated=`Logistics`(track seed·동기)·ShipmentCreated=`Wms`/`OrderHub` seed. ★Vehicle/Driver/Route Event=부재. event-driven(형식 Event Bus)=부재.

## §16 AI Integration
물류 운영 분석 · 이상 탐지 · 서비스 장애 예측 · 리소스 예측 · 자동 확장 추천 · 운영 KPI · 비용 최적화 · Explainable Logistics Insight. **AI는 운영 정책 자동 변경/서비스 자동 배포 불가.** → ★현행=이상=`AnomalyDetection`·물류 KPI=`Rollup`/`Pnl`(배송비·shippingCost)·Explainability=헌법 V4·자동 배포 불가=헌법 V3+V5+`CHANGE_GATE`. 리소스/자동 확장(인프라 AI)=부재. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
API ≤300ms · Event ≤500ms · Service Discovery ≤1초 · Monitoring ≤5초 · Availability ≥99.99%. (현행 단일 호스트·php-fpm 2 pool seed·벤치 대상 미존재.)

## §18 Completion Criteria
Logistics Platform Core·Domain Framework·Runtime·Integration·Governance·Security·API/Event·Monitoring·AI 구현. → **부분 충족·다수 부재**(창고=`Wms`·배송추적=`Logistics` 실재·TMS/Fleet/Driver/Route/Hub 및 형식 통합 Logistics Foundation=부재). 코드 0.

## 판정
**PARTIAL-weak / ABSENT-heavy.** ★실재=Warehouse(`Wms`·205차·창고/할당/FEFO·Part 027)·Shipment Tracking(`Logistics`·스마트택배 CJ/롯데/한진/로젠/우체국·DHL Unified Tracking·shipment_tracking)·Warehouse-to-ship geo routing seed(`Wms::allocationPlan`·geoCentroid·nearest warehouse)·배송 상태(`OrderHub`)·물류 채널 통합(`ChannelRegistry` sync_kind='logistics')·배송비(`Pnl` shippingCost)·Security(Commerce 상속). ★**부재(부재증명 완료·전용 handler grep 0)=Transportation Management System·Fleet·Driver·Route Optimization·Hub·Cross Border·Reverse Logistics·Last Mile·Same Day·형식 통합 Logistics Platform Foundation(Service Registry/Event Bus/API Gateway meta-layer)·Service Discovery/Circuit Breaker/Failover(모놀리식 단일 호스트).** ★핵심=창고+배송추적만 실재이며 **물류 도메인 대부분(운송/차량/기사/경로/허브)은 진짜 부재**(Commerce Platform과 대조·과대주장 금지·[[feedback_competitive_gap_verify]]). Commerce Platform(`Wms`/`OrderHub`)·Data Platform 상속(재정의 금지)·★중복 창고/배송추적 도메인 절대 금지(값 분산=회귀·`Wms` 재고 SSOT/`Logistics` 추적 정본 재구현 금지)·마케팅 AI KEEP_SEPARATE·★AI 운영 정책 자동 변경/서비스 자동 배포 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 032 — Enterprise Transportation Management System (TMS) Architecture(본 Logistics Foundation 상속·확장·대부분 신설).
