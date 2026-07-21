# ADR — MEA Part 038 Enterprise Reverse Logistics, Returns & Claims Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part038 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 038은 Reverse Logistics/Returns/Claims. ★**반품/교환/환불 상태·회계는 실재(`OrderHub` SSOT)이나 물리적 RMA 워크플로우/회수 배차/Claims/Repair/Disposition은 부재**: 실재=`OrderHub`(RETURN_TOKENS·EXCHANGE_TOKENS·claimType cancel|return|exchange 정규화 SSOT·219 하드닝·매출포함+returnFee·교환 매출중립 스왑·268차 취소 역분개·GT①)·`Wms`(reflectChannelRestock 재입고·GT①)·`Pnl`(returnFee operatingProfit 차감·정본·GT①). 부재=RMA/Pickup 배차(Driver 부재·Part 034)/Claims/Repair/Disposition. 본 Part는 OMS(Part 024)/WMS(033)/Last Mile(036)/Payment(028)/Profit(016) 상속(재정의 금지).

## 결정
- **D-1 (Part 024/033/036/028/016 재정의 금지):** OMS(Part 024·`OrderHub`)·WMS(Part 033·`Wms`)·Payment(Part 028)·Profit(Part 016·`Pnl`)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (반품/교환/환불 = OrderHub 승격·★중복 반품 절대 금지):** 반품/교환/환불 = `OrderHub`(RETURN_TOKENS·EXCHANGE_TOKENS·claimType 정규화 SSOT). ★취소/반품/교환 캐논 SSOT=219 감사 하드닝(union·한 곳 수정=전 집계 정합)·268차 취소 역분개·반품 매출포함+returnFee·교환 매출중립=정본(재구현 금지). ★중복 반품/교환/환불 상태 신설 절대 금지(값 분산=회귀·매출 정합 SSOT). 형식 Returns Management Engine=`OrderHub` 승격(상태 정규화→RMA 워크플로우).
- **D-3 (재입고/Reverse Cost = Wms/Pnl 승격):** 재입고 = `Wms`(reflectChannelRestock·Part 024/027)·Reverse Cost=`Pnl`(returnFee·operatingProfit 차감·return_fee 정산). ★returnFee=Financial 정본(P&L 연계·재구현 금지). 형식 Disposition(Restock 외)=순신설.
- **D-4 (RMA/Pickup/Claims/Repair = 부재·순신설):** ★형식 RMA 워크플로우(Return Authorization/Label/Window/Policy Validation)·Pickup Scheduling/Driver Assignment(Driver 부재·Part 034)·Claims Management(Damage/Warranty/Insurance·Claim Settlement)·Repair/Refurbishment·Disposition(Recycle/Disposal/Vendor Return/Salvage)=**부재·순신설**(부재증명 완료). ★3PL 회수·자체 배차 부재(Part 034/036 정합·과대주장 금지). Return Tracking=`Logistics`(택배사).
- **D-5 (Security/AI = 헌법 정합):** Tenant=`Db.php`·RBAC=`index.php`·Customer Data=No-PII(v418.1)·Encryption=`Crypto`·Audit=`SecurityAudit`. AI(반품 가능성/사기성/사유)=`CustomerAI`/`AnomalyDetection`/`Reviews`·Reverse Cost=`Pnl`·Explainability=헌법 V4·★AI 반품/환불/클레임 승인 자동 수행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. OMS/WMS/Payment/Profit/Data Platform/헌법 상속·재정의 금지·반품/교환/환불(`OrderHub` SSOT)·재입고(`Wms`)·Reverse Cost(`Pnl` returnFee)·Return Tracking(`Logistics`)·`SecurityAudit` 재사용(★중복 반품/교환/환불/returnFee 절대 금지·매출 정합 SSOT·정본 재구현 금지)·형식 RMA 워크플로우/Pickup 배차/Claims/Repair/Disposition만 신설(부재·3PL 회수·자체 배차 운영 착수 시·과대주장 금지). 실행은 형식 RMA/Claims 워크플로우 신설 종속.
