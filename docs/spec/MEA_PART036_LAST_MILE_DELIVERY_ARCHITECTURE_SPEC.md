# MEA Part 036 — Enterprise Last Mile Delivery & Delivery Experience Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Logistics Foundation(Part 031)+TMS(032)+Fleet(034)+Route(035)+Customer 360(Part 025)+Commerce Platform**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**배송 추적/고객 알림/피드백은 실재(3PL 경유)이나 자체 배송 실행/PoD/배송원은 부재**(GT①·부재증명 완료). ★비즈니스 모델: 3PL 택배사(스마트택배/DHL)가 물리적 last-mile 담당·GeniegoROI는 추적/알림/경험 계층·자체 배송 실행 아님. file:line 인용은 GT①②/ADR 등장분만(반날조). ★과대주장 금지.

## §1 작업 목적
고객에게 상품 최종 전달되는 Last Mile Delivery 전 과정 통합 관리. TMS/Fleet/Route/Customer 360/OMS/Marketplace/Notification/ROI/AI 연계 Enterprise Last Mile Framework.

## §2 구현 범위
Last Mile Delivery · Delivery Execution · Tracking · Proof of Delivery · Customer Delivery Experience · Exception Management · Analytics · Governance · Notification · AI Delivery Intelligence.

## §3 구현 목표 (10)
Last Mile Delivery Engine · Delivery Execution Engine · Tracking Service · Proof of Delivery Service · Experience Service · Analytics Service · Dashboard · Governance Manager · Audit Service · AI Delivery Advisor.

## §4 아키텍처 원칙 (10)
Customer First · Real-Time Visibility · Event Driven · Mobile First · Policy Driven · Metadata Driven · AI Assisted · Enterprise Standard · High Availability · Audit by Default.

## §5 Canonical Entity (15)
DELIVERY_ORDER · DELIVERY_TASK · DELIVERY_STOP · DELIVERY_AGENT · DELIVERY_STATUS · DELIVERY_SCHEDULE · DELIVERY_WINDOW · PROOF_OF_DELIVERY · CUSTOMER_NOTIFICATION · DELIVERY_EXCEPTION · DELIVERY_FEEDBACK · DELIVERY_POLICY · DELIVERY_AUDIT · DELIVERY_SCORE · DELIVERY_EVENT. → 상세 = `MEA_PART036_CANONICAL_ENTITIES.md`.

## §6 Last Mile Domain (10)
Home/Same-Day/Express/Scheduled/Locker/Store Pickup/Contactless/Reverse Pickup/B2B/Enterprise Delivery. Delivery Order 기준. → ★현행=Home Delivery=3PL 택배사(`Logistics`)·Reverse Pickup=`OrderHub`(반품 RETURN_TOKENS). ★Same-Day/Express/Locker/Store Pickup/Contactless(자체 배송)=부재.

## §7 Delivery Lifecycle (10)
Scheduled→Driver Assigned→Loaded→Out for Delivery→Arrived→Delivered→Proof Confirmed→Customer Feedback→Closed→Archive. 실시간 기록/공유. → ★현행=Delivered/상태=`Logistics`(택배사 추적)·Customer Feedback=`Reviews`. ★Driver Assigned/Loaded/Out for Delivery/Arrived/Proof Confirmed(자체 배송)=부재(3PL 상태만).

## §8 Delivery Execution (8)
Scheduling · Driver Dispatch · Multi-Stop · Delivery Window · Contactless · Signature Collection · OTP Verification · Confirmation. SLA·고객 요청. → ★현행=**부재**(자체 배송 실행 없음·Driver 부재·Part 034). OTP seed=`UserAuth`(계정 인증·배송 확인 아님)·3PL 택배사가 배송 실행.

## §9 Proof of Delivery (8)
Digital Signature · QR/OTP Verification · Photo Capture · GPS Verification · Timestamp · Recipient ID · Electronic Receipt. 변경 불가 감사. → ★현행=**부재**(자체 PoD 없음·3PL 택배사가 배송 완료 처리). Timestamp/감사=`SecurityAudit`(신설 시).

## §10 Customer Delivery Experience (8)
Real-Time Tracking · ETA Notification · Reminder · Rescheduling · Instruction · Driver Contact · Feedback · Satisfaction Survey. → ★현행=Real-Time Tracking=`Logistics`(택배사 추적)·ETA/Reminder Notification=`SmsMarketing`/`WebPush`/`CRM`(발송 게이트)·Feedback/Survey=`Reviews`. ★Rescheduling/Driver Contact(자체 배송)=부재.

## §11 Delivery Exception Management (8)
Delay · Failed · Address Issue · Customer Absence · Damaged/Lost Shipment · Re-Delivery · Escalation. 자동 담당자 전달. → ★현행=Delay/이상=`AnomalyDetection`(범용)·Failed/Return=`OrderHub`(RETURN_TOKENS)·Escalation=`Alerting`. ★Address Issue/Customer Absence/Re-Delivery(자체 배송 워크플로우)=부재.

## §12 Delivery Analytics (8)
On-Time Delivery Rate · First Attempt Success · Average Delivery Time · Cost · Customer Satisfaction · Productivity · Exception Rate · Delivery ROI. → ★현행=Delivery Cost=`Pnl`(배송비)·Customer Satisfaction=`Reviews`·On-Time seed=`Logistics`(배송 상태). ★First Attempt Success/Average Delivery Time/Productivity=부재.

## §13 Delivery Governance (8)
Delivery/SLA/Customer Communication/Exception/Proof/Security Policy · Compliance · Audit. → ★현행=Communication=발송 게이트(`CRM::isMarketingSendAllowed`)·Audit=`SecurityAudit`·Compliance=`Compliance`. ★Delivery 전용 Governance=부분.

## §14 Data Security
Tenant Isolation · RBAC · Delivery Data Encryption · Customer Privacy Protection · GPS Data Protection · Audit. 고객 개인정보/위치정보 법규 준수. → ★현행=Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·★Customer Privacy=No-PII 집계(v418.1)·DSAR=`Dsar`·Audit=`SecurityAudit`. GPS Data(자체 GPS 부재)=해당 없음.

## §15 Runtime 규칙
Delivery Task 생성 · Driver Assignment 검증 · Tracking · ETA 갱신 · Proof 검증 · Customer Notification · Audit. → ★현행=Tracking=`Logistics`·Notification=`SmsMarketing`/`WebPush`(발송 게이트)·Audit=`SecurityAudit`. ★Delivery Task/Driver Assignment/Proof Runtime(자체 배송)=부재.

## §16 API 표준 (8)
Create/Assign Delivery · Update Status · Submit Proof · Send Notification · Query Tracking · Register Feedback · Query Audit. → ★현행=Query Tracking=`Logistics` API(/v427/logistics/track·shipments)·Feedback=`Reviews` API·Notification=`SmsMarketing`/`WebPush` API 실재. ★Create/Assign Delivery/Submit Proof(자체 배송)=부재. Part 001 API 표준 상속.

## §17 Event 표준 (8)
DeliveryCreated · DriverAssigned · DeliveryStarted · ETAUpdated · DeliveryCompleted · ProofSubmitted · DeliveryExceptionOccurred · DeliveryAudited. → ★현행=DeliveryCompleted=`Logistics`(택배사 추적) seed. ★DriverAssigned/ProofSubmitted(자체 배송)=부재. Data Platform §15 정합.

## §18 AI Integration
배송 지연 예측 · 재배송 가능성 · 고객 만족도 예측 · ETA 정확도 · 배송 경로 재추천 · 실패 원인 분석 · 생산성 최적화 · Explainable Delivery Insight. **AI는 배송 완료 자동 승인/고객 응대 자동 확정 불가.** → ★현행=지연/이상=`AnomalyDetection`·만족도=`Reviews`/`CustomerAI`·Explainability=헌법 V4·자동 승인 불가=헌법 V3+V5+`CHANGE_GATE`. ★경로 재추천/생산성(자체 배송 부재)=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §19 성능 요구사항
배송 상태 갱신 ≤300ms · ETA ≤300ms · Proof ≤500ms · 고객 알림 ≤1초 · Dashboard ≤2초 · Availability ≥99.99%. (현행 `Logistics` 추적·`SmsMarketing` 발송 seed.)

## §20 Completion Criteria
Last Mile Engine·Delivery Execution·PoD·Customer Experience·Analytics·Governance·Security·Runtime·API/Event·AI 구현. → **부분 충족**(추적/알림/피드백 실재·자체 Delivery Execution/PoD/Delivery Agent=부재). 코드 0.

## 판정
**PARTIAL-weak / ABSENT-formal(자체 배송 실행).** ★실재=Delivery Tracking(`Logistics`·3PL 스마트택배/DHL·shipment_tracking)·Customer Notification(`SmsMarketing`/`WebPush`/`CRM`·발송 게이트·'배송완료' 알림 seed)·Customer Feedback/Survey(`Reviews`)·Reverse Pickup(`OrderHub` 반품)·Delivery Cost(`Pnl` 배송비)·Exception 이상(`AnomalyDetection`)·Privacy(No-PII/`Dsar`)·Audit(`SecurityAudit`). ★**부재(부재증명 완료)=자체 Delivery Execution(Driver Dispatch/Multi-Stop·Part 034 Driver 부재)·Proof of Delivery(Digital Signature/Photo/GPS Verification)·Delivery Agent·Delivery Window/Rescheduling·자체 배송 워크플로우.** ★★핵심=**3PL 택배사가 물리적 last-mile 배송을 담당하므로 GeniegoROI는 추적/알림/경험 계층(실재)이고 자체 배송 실행/PoD/배송원은 부재**(Part 034/035 정합·과대주장 금지·[[feedback_competitive_gap_verify]]). 추적/알림/피드백은 3PL 경유 실재이나 자체 배송 실행은 순신설(자체 배송 운영 착수 시). Logistics/Commerce/Customer 360 상속(재정의 금지)·★중복 추적/알림/피드백 절대 금지(`Logistics`/`SmsMarketing`/`Reviews` 정본 재구현 금지·발송 게이트 SSOT)·마케팅 AI KEEP_SEPARATE·★AI 배송 완료 자동 승인/고객 응대 자동 확정 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 037 — Enterprise Shipment Tracking, Visibility & Control Tower Architecture(본 Last Mile 상속·★추적=`Logistics` 실재·Control Tower 부재).
