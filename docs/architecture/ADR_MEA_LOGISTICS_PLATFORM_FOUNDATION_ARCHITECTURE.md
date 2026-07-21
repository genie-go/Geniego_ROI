# ADR — MEA Part 031 Logistics Platform Foundation Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part031 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 031은 Logistics Platform Foundation(신규 Logistics 계열 Baseline). ★★**Commerce Platform과 대조적으로 물류 도메인은 대부분 부재**: **실재**=`Wms.php`(205차·창고/할당/FEFO/allocationPlan·geoCentroid nearest routing·GT①·Part 027)·`Logistics.php`(스마트택배 CJ/롯데/한진/로젠/우체국 통합 추적·DHL Unified Tracking·shipment_tracking·carriers·GT①)·`OrderHub`(배송 상태). **부재(부재증명 완료·grep 0)**=Fleet/Driver/Route Optimization/Hub/Transportation/Cross Border/Reverse Logistics/Last Mile 전용 handler·테이블. 본 Part는 Commerce Platform(`Wms`/`OrderHub`)/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Commerce/Data Platform 재정의 금지):** Commerce Inventory(Part 027·`Wms`)·OMS(Part 024·`OrderHub`)·Metadata(Part 004)를 준수·인용. 물류 도메인=`Wms`/`Logistics`. 중복 정의 금지.
- **D-2 (창고 = Wms 승격·★중복 창고 도메인 절대 금지):** Warehouse = `Wms`(wms_stock·창고/캐리어/allocate·FEFO·allocationPlan·geoCentroid nearest routing·Part 027). ★재고 SSOT/FEFO COGS 정본(재구현 금지). ★중복 창고/재고 도메인 신설 절대 금지(값 분산=회귀). 형식 Warehouse Service는 `Wms`를 승격(WMS는 Part 033에서 상세·본 Part는 Foundation 참조).
- **D-3 (배송추적 = Logistics 승격):** Tracking = `Logistics`(스마트택배 sweettracker·DHL Unified Tracking·shipment_tracking·carriers·`isLogisticsChannel`)·물류 채널=`ChannelRegistry`(sync_kind='logistics'/'tracking')·자격증명=`ChannelCreds`. ★t_key 1개로 전 택배사(스마트택배)·재구현 금지. 형식 Tracking Service=순신설(중복 추적 금지·`Logistics` 승격).
- **D-4 (부재 도메인 = 순신설·과대주장 금지):** ★Transportation Management System·Fleet·Driver·Route Optimization·Hub·Cross Border·Reverse Logistics·Last Mile·Same Day=**전부 순신설**(전용 handler 부재·부재증명 완료). ★"코드 존재≠구현 완료"([[feedback_competitive_gap_verify]]·283차)·과대주장 금지·부재 도메인은 라이브 검증 후 구현 권장. Route seed=`Wms::allocationPlan`(geoCentroid·nearest warehouse)만 존재(형식 Route Optimization 아님).
- **D-5 (Foundation/Runtime/Security = 헌법 정합):** ★형식 통합 Logistics Platform Foundation(Service Registry/Event Bus/API Gateway meta-layer)·Service Discovery/Circuit Breaker/Failover=**부재**(모놀리식 단일 호스트·Commerce Foundation Part 021 판정과 동형·인프라 nginx/php-fpm 2 pool). API Gateway seed=`index.php`·Tenant=`Db.php`·Encryption=`Crypto`·Secret=`ChannelCreds`·Audit=`SecurityAudit`. AI(이상/물류 KPI)=`AnomalyDetection`/`Rollup`·Explainability=헌법 V4·★AI 운영 정책 자동 변경/서비스 자동 배포 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Commerce/Data Platform/헌법 상속·재정의 금지·창고(`Wms`)·배송추적(`Logistics`)·물류 채널(`ChannelRegistry`)·`SecurityAudit` 재사용(★중복 창고/배송추적 도메인 절대 금지·재고 SSOT/추적 정본 재구현 금지)·형식 통합 Logistics Platform Foundation·부재 도메인(TMS/Fleet/Driver/Route/Hub/Cross Border/Reverse/Last Mile)만 신설(대부분 순신설·과대주장 금지). 실행은 부재 도메인 라이브 검증 후 구현 권장. ★신규 Logistics Platform 계열(Part 031~) 착수.
