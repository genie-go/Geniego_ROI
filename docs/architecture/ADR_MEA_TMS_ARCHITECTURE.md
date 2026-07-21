# ADR — MEA Part 032 Enterprise Transportation Management System (TMS) Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part032 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 032는 TMS(운송 계획/배차/운임/모니터링). ★★**Part 031에서 이미 판정된 대로 TMS는 대부분 부재**: **실재 seed**=`Wms`(listCarriers/saveCarrier·allocationPlan/geoCentroid nearest warehouse·transferLotsFefo·GT①)·`Pnl`(shippingCost·채널별 정률·무료배송 기준·GT①)·`Logistics`(배송 추적·Part 031). **부재(부재증명 완료·grep 0)**=freight rate/dispatch/GPS/telematics/transport_order/transport_plan 전용 handler·Fleet/Vehicle/Driver 엔티티. 본 Part는 Logistics Foundation(Part 031)/Commerce Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 031/Commerce/Data Platform 재정의 금지):** Logistics Foundation(Part 031)·Inventory(Part 027·`Wms`)·OMS(Part 024·`OrderHub`)·Profit(Part 016·`Pnl`)를 준수·인용. 중복 정의 금지.
- **D-2 (Carrier/Route seed = Wms 승격·★중복 캐리어 절대 금지):** Carrier Registry = `Wms`(listCarriers/saveCarrier·창고 캐리어)·Route seed=`Wms::allocationPlan`(geoCentroid·nearest warehouse·형식 Route Optimization 아님·seed). ★중복 캐리어/재고 도메인 신설 절대 금지. 형식 Carrier Management Service·Route Planning Engine=순신설(seed 승격).
- **D-3 (Freight seed = Pnl 승격):** Freight Cost = `Pnl`(shippingCost·채널별 정률·무료배송 기준금액·배송비 정산). ★배송비=Financial 정본(P&L 연계·재구현 금지·279차 estimated net_payout 배송비 반영). 형식 Freight Rate(Contract/Spot/Fuel Surcharge/Toll)·Freight Engine=순신설(중복 배송비 계산 금지·`Pnl` 승격).
- **D-4 (부재 도메인 = 순신설·과대주장 금지):** ★Transportation Planning Engine·Dispatch Engine·Fleet/Vehicle/Driver Assignment·GPS Tracking·ETA·Telematics·Temperature/Vehicle Health/Driver Activity Monitoring·Transport Order/Plan/Job=**전부 순신설**(전용 handler·엔티티 부재·부재증명 완료). ★"코드 존재≠구현 완료"([[feedback_competitive_gap_verify]]·283차)·과대주장 금지·부재 도메인은 라이브 검증(실제 차량/GPS 연동) 후 구현 권장.
- **D-5 (Security/AI = 헌법 정합):** Tenant=`Db.php`·RBAC/API Auth=`index.php`·Encryption=`Crypto`·Audit=`SecurityAudit`·Exception=`AnomalyDetection`·배송 추적=`Logistics`. AI(지연/비용)=`AnomalyDetection`/`Pnl`·Explainability=헌법 V4·★AI 운송 지시 자동 승인/배차 자동 확정 불가=헌법 V3+V5+`CHANGE_GATE`. 운송 계획/배차 최적화 AI=대상 엔진 부재로 순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Logistics/Commerce/Data Platform/헌법 상속·재정의 금지·Carrier/Route seed(`Wms`)·Freight seed(`Pnl`)·배송 추적(`Logistics`)·`SecurityAudit` 재사용(★중복 창고/캐리어/배송비 절대 금지·`Wms`/`Pnl` 정본 재구현 금지)·형식 TMS 전 계층(Planning/Dispatch/Freight/Fleet/Driver/GPS Monitoring)만 신설(대부분 순신설·부재증명·과대주장 금지·라이브 검증 후). 실행은 부재 도메인 라이브 검증 후 구현 종속.
