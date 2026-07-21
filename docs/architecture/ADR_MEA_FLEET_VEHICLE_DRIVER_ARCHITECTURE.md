# ADR — MEA Part 034 Enterprise Fleet, Vehicle & Driver Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part034 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 034는 Fleet/Vehicle/Driver Management. ★★**도메인 자체가 사실상 부재**: Vehicle/Driver/Fleet/Maintenance/Fuel/Telematics 전용 테이블·함수 **부재(부재증명 완료·grep 0)**. ★비즈니스 모델 실측: GeniegoROI는 **3PL 택배사(스마트택배 CJ/롯데/한진/로젠/우체국·DHL·`Logistics`)를 사용하는 e-커머스 ROI 플랫폼**이지 자체 차량/기사 운영 물류사가 아님(Part 031/032 정합). 극소 seed=Partner Fleet(3PL·`Wms` wms_carriers·소유 차량 아님)·Operating Cost(`Pnl` 배송비)·CCTV(`WmsCctv` 창고). 본 Part는 Logistics Foundation(Part 031)/TMS(Part 032) 상속(재정의 금지).

## 결정
- **D-1 (Part 031/032/033/Data Platform 재정의 금지):** Logistics Foundation(Part 031)·TMS(Part 032)·WMS(Part 033)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (도메인 부재 명시·과대주장 금지):** ★Fleet/Vehicle/Driver/Maintenance/Fuel/Telematics=**전부 부재**(부재증명 완료·grep 0). ★"코드 존재≠구현 완료"([[feedback_competitive_gap_verify]]·283차)·과대주장 금지·부재를 정직하게 명시. ★**GeniegoROI 비즈니스 모델=3PL 택배사 사용·자체 Fleet 운영 아님**→Fleet/Vehicle/Driver 관리는 현 범위 밖(전략적 선택·향후 자체 물류 착수 시에만 필요).
- **D-3 (극소 seed = 재사용·오흡수 금지):** Partner Fleet seed=`Logistics`(3PL 택배사 추적)·`Wms`(wms_carriers·택배사 레지스트리·소유 차량 아님)·Operating Cost seed=`Pnl`(배송비 shippingCost·연료비 아님)·CCTV=`WmsCctv`(창고·차량 아님·274차). ★이들은 Fleet 도메인이 아니며 **오흡수 금지**(택배사≠자체 차량·배송비≠연료비·창고 CCTV≠차량 telematics). 형식 Fleet Master=전부 순신설.
- **D-4 (전부 순신설·라이브 검증 필수):** ★Fleet Management Engine·Vehicle/Driver Management·Assignment Engine·Maintenance·Fuel·Telematics·Safety=**전부 순신설**(도메인 자체 부재). ★자체 Fleet 운영 착수 시에만 구현(라이브 차량/GPS/기사/telematics 연동 필수·블라인드 신설 금지). 고장 예측 잠재 엔진=`ModelMonitor`/`AnomalyDetection`(범용·대상 Fleet 부재로 직접 미적용).
- **D-5 (Security/AI = 헌법 정합):** Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·Audit=`SecurityAudit`·No-PII(v418.1·기사 개인정보 보호 시 준수)·Device Auth seed=`WmsCctv`. AI(고장/성과)=`ModelMonitor`/`AnomalyDetection`(대상 부재)·Explainability=헌법 V4·★AI 차량 자동 배정/운전자 자동 승인 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Logistics/Commerce/Data Platform/헌법 상속·재정의 금지·극소 seed(3PL `Logistics`·`Wms` wms_carriers·`Pnl` 배송비·`WmsCctv`·`SecurityAudit`) 재사용(★오흡수 금지·택배사≠자체 차량·배송비≠연료비)·Fleet/Vehicle/Driver 도메인 전부 순신설(자체 Fleet 운영 착수 시·라이브 검증 필수·과대주장 금지). 실행은 비즈니스 모델 결정(자체 물류 vs 3PL) + 라이브 차량/GPS/기사 연동 종속. ★현 판정=ABSENT(near-total).
