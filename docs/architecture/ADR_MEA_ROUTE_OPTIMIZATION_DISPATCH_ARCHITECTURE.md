# ADR — MEA Part 035 Enterprise Route Optimization & Dispatch Intelligence Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part035 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 035는 Route Optimization & Dispatch Intelligence. ★★**대부분 부재**: 유일 실 seed=`Wms::allocationPlan`(창고→배송지 haversine·nearest warehouse selection·Capacity=on_hand 커버 우선·GT①)·`geoCentroid`/`haversineKm`. ★이것은 **단일 홉 창고 선택이지 multi-stop 경로 최적화가 아님**. ETA/Traffic/route_optim/sequencing/load_plan 전용 handler **부재(부재증명 완료·grep 0)**. Dispatch=Vehicle/Driver 부재(Part 034). ★비즈니스 모델: 3PL 택배사 사용→경로 최적화는 택배사 담당(Part 031/032/034 정합). 본 Part는 Logistics Foundation(Part 031)/TMS(Part 032)/Fleet(Part 034) 상속(재정의 금지).

## 결정
- **D-1 (Part 031/032/034/Data Platform 재정의 금지):** Logistics Foundation(Part 031)·TMS(Part 032)·Fleet(Part 034)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (Warehouse Selection seed = Wms 승격·★오흡수 금지):** Warehouse Selection = `Wms::allocationPlan`(haversine·nearest warehouse·on_hand 커버). ★이것은 **출고 창고 선택(단일 홉)이지 route optimization이 아님**(오흡수 금지·과대주장 금지). 형식 Route Optimization Engine(multi-stop/sequencing)=순신설(warehouse selection과 별개).
- **D-3 (Dispatch/ETA/Traffic = 부재·전부 순신설):** ★Dispatch Intelligence=Vehicle/Driver 부재(Part 034)→부재·ETA Prediction Engine=부재·Traffic Intelligence=External Map/Traffic API 미연동으로 부재. ★전부 순신설(자체 배송/Fleet 운영 착수 시·External Map API·GPS·차량 연동 필수·부재증명 완료). ETA 표시 seed=`Logistics`(택배사 추적·자체 ETA 예측 아님).
- **D-4 (Analytics/Cost = 기존 승격·형식 신설):** Route Cost seed=`Pnl`(배송비 shippingCost)·On-Time seed=`Logistics`(배송 상태)·SLA/지연 잠재=`AnomalyDetection`(범용·대상 Route 부재). ★형식 Route Analytics(Route Efficiency/ETA Accuracy/Distance per Delivery)=순신설(중복 배송비 계산 금지·`Pnl` 정본).
- **D-5 (Security/AI = 헌법 정합):** Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·좌표=`Wms`(geoCentroid·명시 lat/lng·위치정보 개인정보 보호 준수)·Audit=`SecurityAudit`. AI(경로/교통/ETA/SLA)=`AnomalyDetection`/`DemandForecast`(대상 Route 부재)·Explainability=헌법 V4·★AI 차량 운행 직접 제어/배차 자동 확정 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED·ABSENT-heavy**. Logistics/Commerce/Data Platform/헌법 상속·재정의 금지·Warehouse Selection seed(`Wms::allocationPlan`·haversine)·배송 추적(`Logistics`)·Route Cost(`Pnl`)·`SecurityAudit` 재사용(★오흡수 금지·warehouse selection≠route optimization·중복 배송비 금지)·Route Optimization Engine(multi-stop)·Dispatch Intelligence·ETA Prediction·Traffic Intelligence 전부 순신설(자체 배송/Fleet 운영 착수 시·External Map/GPS/차량 연동 필수·과대주장 금지). 실행은 자체 배송 운영 + External Map API 연동 종속.
