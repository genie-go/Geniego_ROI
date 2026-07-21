# ADR — MEA Part 030 Enterprise Commerce Analytics & AI Commerce Intelligence Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part030 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 030은 Commerce Analytics & AI Commerce Intelligence(Commerce Platform 최상위 분석 계층·마지막). ★코드베이스에는 **커머스 KPI/분석/대시보드가 이미 실재**: `Rollup.php`(channel_orders·performance_metrics·GMV/ROAS/conversion·ad_insight_agg SKU 차원·attribution 기반 상품 광고비 배분·GT①)·`Pnl`(product profitability/ROI)·`CustomerAI`(churn/CLV·BG-NBD 279차)·`AttributionMetrics`(conversion)·`CRM`(CLV·세그먼트)·`DigitalShelf`(SoS 267차)·`Wms`(turnover/deadStock)·`Reports`(193차)·Part 019 대시보드. ★반복 판정: KPI **값**은 실 SSOT이나 형식 metadata-driven KPI Registry/Data Mart는 부재(Part 015/019 동일). 본 Part는 Commerce Platform(021~029)/ROI Platform 상속(재정의 금지).

## 결정
- **D-1 (Commerce/ROI/Data Platform 재정의 금지):** ROI/이익 값(Part 013/016)·KPI(Part 015)·Dashboard(Part 019)·Forecast(Part 017)·Customer 360(Part 025)·Metadata(Part 004)를 준수·인용. 분석 도메인=`Rollup`/`Pnl`/`CustomerAI`. 중복 정의 금지.
- **D-2 (커머스 KPI 값 = Rollup/Pnl/Attribution 승격·★중복 KPI 계산 절대 금지·One Version of Truth):** 커머스 KPI = `Rollup`(GMV/ROAS/conversion)·Product ROI=`Pnl`·CLV=`CRM`/`CustomerAI`·Conversion=`AttributionMetrics`·SoS=`DigitalShelf`(267차). ★값은 무후퇴 단일소스([[feedback_no_regression_value_unification]])로 이미 강제(VAT 267차·CRM LTV 263차·adj_roas). ★"One Version of Truth"(§4)=★중복 커머스 KPI/분석 계산 절대 금지(값 분산=회귀). 형식 Commerce KPI Engine은 정의를 메타데이터화(값 재계산 아님).
- **D-3 (분석 = 도메인 handler 승격·형식 Data Mart 신설):** Sales=`Rollup`·Customer=`CustomerAI`/`CRM`·Product=`Pnl`/`Rollup`·Marketplace=`DigitalShelf`·Inventory=`Wms`. ★형식 Commerce Data Mart·Commerce Analytics Engine(통합)=순신설(중복 집계 금지·기존 SSOT 파생·DataPlatform lineage 연계).
- **D-4 (대시보드/Report = Part 019/Reports 승격):** 대시보드=Part 019(RollupDashboard/PnLDashboard/ChannelKPI)·Report=`Reports`(193차·템플릿). ★중복 대시보드/리포트 신설 금지(Part 019 정합). 형식 통합 Commerce Dashboard=순신설.
- **D-5 (Security/AI = 헌법·무후퇴 정합):** Tenant=`Db.php`·RBAC/Permission=`index.php`+`AdminMenu`·★No-PII 집계(v418.1)·Data Quality=`DataPlatform`(DataTrust)·Audit=`SecurityAudit`. AI(판매 예측/추천/이탈/가격 전략/Promotion ROI)=`DemandForecast`/`Mmm`/`AutoRecommend`/`CustomerAI`/`PriceOpt`/`AbTesting`·Explainability=헌법 V4·★AI 분석 결과 변경/운영 데이터 직접 수정 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Commerce Platform/ROI Platform/Data Platform/헌법 상속·재정의 금지·커머스 KPI 값(`Rollup`/`Pnl`/`Attribution`/`CRM`)·분석(`CustomerAI`/`DigitalShelf`/`Wms`)·대시보드(Part 019)·Report(`Reports`)·`SecurityAudit` 재사용(★중복 커머스 KPI/분석 계산 절대 금지·One Version of Truth)·형식 metadata-driven Commerce KPI Engine·Data Mart·Analytics Engine·통합 Dashboard만 신설(값 재계산 없이). 실행은 형식 KPI Engine/Data Mart 신설 종속. ★Commerce Platform(Part 021~030) 설계 완료.
