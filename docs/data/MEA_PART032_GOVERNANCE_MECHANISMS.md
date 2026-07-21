# MEA Part 032 — Governance Mechanisms (§7~§19 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★Carrier/Route seed(`Wms`)·Freight seed(`Pnl`)·배송추적(`Logistics`)·SecurityAudit 재사용(★중복 창고/캐리어/배송비 절대 금지)·TMS 핵심 대부분 순신설(부재증명·과대주장 금지)·Part 031/027 상속.

## §7 Lifecycle 거버넌스
Request→Planning→Carrier Selection→Dispatch→Pickup→In Transit→Delivery→Settlement→Completion→Archive. 현행=Delivery/In Transit=`Logistics`·Settlement=`Pnl`(배송비). ★Request/Planning/Carrier Selection/Dispatch/Pickup=순신설(부재).

## §8 Planning 거버넌스
Route/Capacity/Carrier/Time Window/Multi-Stop/Cross Dock/Load/Simulation. 현행=Route seed=`Wms::allocationPlan`(geoCentroid·nearest warehouse·형식 최적화 아님). ★Capacity/Carrier/Time Window/Multi-Stop/Cross Dock/Load Planning/Simulation=순신설(부재·라이브 검증 후).

## §9 Dispatch 거버넌스
Automatic/Manual Dispatch·Driver/Vehicle/Carrier Assignment·Optimization·Approval·Reassignment. 현행=Carrier Assignment seed=`Wms`(listCarriers/saveCarrier). ★Dispatch Engine·Driver/Vehicle Assignment(엔티티 부재)=순신설.

## §10 Freight 거버넌스
Freight/Contract/Spot Rate·Fuel Surcharge·Toll·Calculation/Settlement/Audit. 현행=Freight Cost seed=`Pnl`(shippingCost·채널별 정률·무료배송 기준·279차 net_payout)·Settlement=`Pnl`. ★Freight Rate(Contract/Spot)·Fuel Surcharge·Toll·형식 Freight Engine=순신설(중복 배송비 계산 금지·`Pnl` 정본 승격).

## §11 Monitoring 거버넌스
GPS/ETA/Delay/Exception/Temperature/Vehicle Health/Driver Activity/Real-Time Dashboard. 현행=배송 추적=`Logistics`(Part 031)·Exception/Delay=`AnomalyDetection`·CCTV=`WmsCctv`(274차). ★GPS/ETA/Temperature/Vehicle Health/Driver Activity Monitoring=순신설(GPS/telematics 부재).

## §12 Governance 거버넌스
Dispatch/Carrier/Vehicle Assignment/Freight/SLA/Exception Policy·Compliance·Audit Trail. 현행=Audit=`SecurityAudit`·Compliance=`Compliance`. ★Dispatch/Carrier/Freight/SLA/형식 Governance Manager=순신설.

## §13 Security 거버넌스
Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC/API Auth=`index.php`·Transportation Encryption=`Crypto`·GPS Data Protection(GPS 부재→해당 없음)·Audit=`SecurityAudit::verify`(★유일 tamper-evident·[[reference_menu_audit_log_not_tamper_evident]]).

## §14 Runtime 거버넌스
Transport Order 검증·운송 계획·배차·운임 계산·Tracking Event·Exception·Audit. 현행=Tracking=`Logistics`·운임(배송비)=`Pnl`·Exception=`AnomalyDetection`·Audit=`SecurityAudit`. ★Transport Order/계획/배차 Runtime=순신설.

## §15 API 거버넌스 (8)
Create Transport Order/Generate Plan/Assign Vehicle·Driver/Dispatch/Update Status/Query Freight/Query Audit. 현행=Tracking=`Logistics` API·Freight(배송비)=`Pnl` API seed. ★Transport Order/Plan/Assign/Dispatch API=순신설. ★$register+`/api` 접두([[reference_api_prefix_routing]]). Part 001 API 표준 상속.

## §16 Event 거버넌스 (8)
TransportOrderCreated/TransportPlanned/DispatchCompleted/VehicleAssigned/DriverAssigned/ShipmentPickedUp/DeliveryCompleted/TransportationAudited. 현행=DeliveryCompleted=`Logistics`(추적) seed. ★TransportOrder/Planned/Dispatch/Vehicle/Driver/Pickup Event=순신설. Data Platform §15 정합.

## §17 AI 거버넌스
최적 운송 계획/지연 예측/배차 최적화/비용 예측/Carrier 성과/SLA 위반 예측/Freight 최적화/Explainable. 현행=지연/이상=`AnomalyDetection`·비용=`Pnl`(배송비)·Explainability=헌법 V4. ★AI는 운송 지시 자동 승인/배차 자동 확정 불가=헌법 V3+V5(안전 자동화)+`CHANGE_GATE`. 계획/배차 최적화 AI=대상 엔진 부재로 순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## §18~§19 성능·완료
성능=대상 엔진 미존재(벤치 대상 부재). 완료=형식 TMS 전 계층(Planning/Dispatch/Freight/Fleet/Driver/GPS Monitoring) 구현 시(대부분 부재·코드 0). ★단 carrier/배송비/배송추적 seed는 실재.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★Carrier/Route seed(`Wms`)·Freight seed(`Pnl`)·배송추적(`Logistics`)·Audit(`SecurityAudit`) 재사용·승격(★중복 창고/캐리어/배송비 절대 금지=값 분산=회귀·`Wms`/`Pnl` 정본 재구현 금지)·형식 TMS 전 계층(Transportation Planning/Dispatch Engine/Fleet·Vehicle·Driver Assignment/Freight Rate/GPS·ETA·Telematics Monitoring)만 신설(대부분 순신설·부재증명·과대주장 금지·라이브 검증 후). Part 031/027/024/016/Data Platform/헌법 상속·재정의 금지·★AI 운송 지시 자동 승인/배차 자동 확정 불가(V3+V5+CHANGE_GATE).
