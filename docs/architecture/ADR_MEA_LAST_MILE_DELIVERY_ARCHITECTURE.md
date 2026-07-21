# ADR — MEA Part 036 Enterprise Last Mile Delivery & Delivery Experience Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part036 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 036은 Last Mile Delivery & Delivery Experience. ★**추적/고객 알림/피드백 계층은 실재(3PL 경유)이나 자체 배송 실행/PoD/배송원은 부재**: 실재=`Logistics`(3PL 스마트택배/DHL·shipment_tracking·GT①)·`SmsMarketing`/`WebPush`/`CRM`(고객 알림·발송 게이트·'배송완료' seed·GT①)·`Reviews`(고객 피드백·GT①)·`OrderHub`(반품 Reverse Pickup)·`Pnl`(배송비). 부재=자체 Delivery Execution(Driver 부재·Part 034)·PoD(Signature/Photo/GPS)·Delivery Agent. ★비즈니스 모델: 3PL 택배사가 물리적 last-mile 담당·GeniegoROI는 추적/알림/경험 계층. 본 Part는 Logistics(Part 031)/Fleet(034)/Route(035)/Customer 360(025) 상속(재정의 금지).

## 결정
- **D-1 (Part 031/034/035/025/Commerce 재정의 금지):** Logistics Foundation(Part 031)·Fleet(Part 034)·Route(Part 035)·Customer 360(Part 025)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (Delivery Tracking = Logistics 승격·★중복 추적 절대 금지):** 배송 추적 = `Logistics`(3PL 스마트택배 t_key 1개로 전 택배사·DHL·shipment_tracking). ★택배사 통합 추적 정본(Part 031·재구현 금지). ★중복 추적 신설 절대 금지(값 분산=회귀). 형식 Delivery Tracking Service=`Logistics` 승격.
- **D-3 (Customer Notification/Feedback = 기존 승격·발송 게이트 SSOT):** 고객 알림 = `SmsMarketing`/`WebPush`/`CRM`(발송 게이트 `CRM::isMarketingSendAllowed` SSOT·289차·Part 026)·Feedback/Survey=`Reviews`. ★발송 게이트=적격성 SSOT(중복 발송 게이트 금지·Part 026 정합). 형식 Delivery Notification Service=순신설(발송 게이트 승격).
- **D-4 (자체 배송 실행/PoD = 부재·순신설):** ★Delivery Execution(Driver Dispatch/Multi-Stop·Part 034 Driver 부재)·Proof of Delivery(Digital Signature/Photo/GPS Verification)·Delivery Agent·Delivery Window/Rescheduling=**부재·순신설**(자체 배송 운영 착수 시·부재증명 완료). ★"코드 존재≠구현 완료"([[feedback_competitive_gap_verify]]·283차)·과대주장 금지·OTP seed=`UserAuth`(계정 인증·배송 확인 아님·오흡수 금지).
- **D-5 (Security/AI = 헌법·Privacy 정합):** Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·★Customer Privacy=No-PII 집계(v418.1)·DSAR=`Dsar`·Audit=`SecurityAudit`. AI(지연/만족도/실패 원인)=`AnomalyDetection`/`Reviews`/`CustomerAI`·Explainability=헌법 V4·★AI 배송 완료 자동 승인/고객 응대 자동 확정 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Logistics/Commerce/Customer 360/Data Platform/헌법 상속·재정의 금지·배송 추적(`Logistics`)·고객 알림(`SmsMarketing`/`WebPush`/발송 게이트)·피드백(`Reviews`)·배송비(`Pnl`)·`SecurityAudit` 재사용(★중복 추적/알림/피드백 절대 금지·발송 게이트 SSOT·정본 재구현 금지·OTP 오흡수 금지)·자체 Delivery Execution/PoD/Delivery Agent/Window 순신설(자체 배송 운영 착수 시·부재증명·과대주장 금지). 실행은 자체 배송 운영 결정 종속.
