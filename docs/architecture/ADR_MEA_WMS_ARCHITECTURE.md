# ADR — MEA Part 033 Enterprise Warehouse Management System (WMS) Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part033 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 033은 WMS(창고 운영 통합 관리). ★★**TMS(Part 032)와 대조적으로 WMS는 앱의 최강 도메인 중 하나로 광범위 실재**: `Wms.php`(205차 backend·GT①)·테이블 wms_warehouses(창고 마스터·type/temp)·wms_bins(zone/aisle/rack/level/slot)·wms_movements(입고/이동)·wms_picking(피킹)·wms_lots(FEFO)·wms_stock(on_hand SSOT)·wms_carriers·wms_permissions(창고 RBAC)·wms_suppliers·함수 recordMovement(입고)·putAway/pickBinForSku(적치·bin 추천)·resolveBin/listBins·savePicking(피킹)·adjustStock·consumeLotsFefo(FEFO). 본 Part는 Logistics Foundation(Part 031)/Inventory(Part 027)/OMS(Part 024) 상속(재정의 금지).

## 결정
- **D-1 (Part 031/027/024/Data Platform 재정의 금지):** Logistics Foundation(Part 031)·Inventory(Part 027·`Wms` 재고/FEFO)·OMS(Part 024)·Metadata(Part 004)를 준수·인용. ★Part 027(Inventory)와 Part 033(WMS)은 동일 `Wms` handler=Inventory는 재고 관점·WMS는 창고 운영 관점(중복 정의 금지·관점 분리).
- **D-2 (창고 운영 = Wms 승격·★중복 창고/재고 도메인 절대 금지):** 창고 운영 = `Wms`(입고 recordMovement·적치 putAway·보관 wms_bins·피킹 wms_picking·이동 wms_movements·창고 마스터 wms_warehouses·창고 RBAC wms_permissions). ★재고 SSOT(wms_stock·286차)·FEFO COGS(Part 027)=정본(재구현 금지). ★중복 창고/재고/Bin/FEFO 도메인 신설 절대 금지(값 분산=회귀). 형식 Warehouse Management Engine은 `Wms`를 승격(창고 재구현 아님).
- **D-3 (Bin/적치 = Wms 승격):** Bin/Storage Location = `Wms`(wms_bins·zone/aisle/rack/level/slot·resolveBin·binSeq/slotFromCode)·적치 추천=`Wms`(putAway·pickBinForSku). ★형식 Location Recommendation(AI)·Capacity Validation(wms_bins capacity seed)=순신설(중복 bin 로직 금지·seed 승격).
- **D-4 (고급 기능 = 순신설·과대주장 금지):** ★ASN Processing·RFID·형식 Quality/Damage Inspection·Wave/Batch/Zone/Cluster Picking·Pick-to-Light/Voice Picking·형식 Packing 워크플로우·Shipping Manifest/Dock Scheduling·Cold Storage/Bonded/Automated/Smart/Micro Fulfillment 유형·Cross-Dock·IoT/Robotics·형식 Cycle Count=**순신설**(기본 WMS는 실재하나 고급 기능 부재·부재증명). ★"코드 존재≠구현 완료"([[feedback_competitive_gap_verify]]·283차)·과대주장 금지·IoT/Robotics/RFID는 라이브 장비 연동 후 구현 권장.
- **D-5 (Security/AI = 헌법 정합):** ★창고 RBAC=`Wms`(wms_permissions·warehouse별 role·guardWarehouse)·Tenant=`Db.php`·Encryption=`Crypto`·Audit=`SecurityAudit`+wms_movements·IoT=`WmsCctv`(274차 온프렘 브리지). AI(적치/작업량/이동/이상)=`Wms`(pickBinForSku)/`DemandForecast`/`AnomalyDetection`·Explainability=헌법 V4·★AI 창고 작업 자동 승인/재고 직접 이동 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Logistics/Inventory/OMS/Data Platform/헌법 상속·재정의 금지·창고 운영(`Wms` 입고/적치/보관/Bin/피킹/이동/FEFO/창고 RBAC)·CCTV(`WmsCctv`)·`SecurityAudit` 재사용(★중복 창고/재고/Bin/FEFO 도메인 절대 금지·재고 SSOT/FEFO COGS 정본 재구현 금지·Part 027 관점 분리)·형식 고급 기능(ASN/RFID/Wave Picking/Packing 워크플로우/Dock Scheduling/IoT/Robotics)만 신설(기본 창고 재구현 없이·과대주장 금지·라이브 검증 후). 실행은 고급 기능 신설 종속.
