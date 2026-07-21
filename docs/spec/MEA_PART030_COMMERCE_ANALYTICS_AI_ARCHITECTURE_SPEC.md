# MEA Part 030 — Enterprise Commerce Analytics & AI Commerce Intelligence Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **Commerce Platform(Part 021~029)+ROI Platform(013~020·Part 015 KPI·019 Dashboard)+Data Platform(001~012)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). ★**커머스 KPI/분석/대시보드는 이미 실재**(GT①·`Rollup`·`Pnl`·`CustomerAI`·`AttributionMetrics`·`DigitalShelf`)·본 Part는 형식 Commerce Data Mart/KPI Engine 계층만 추가(값 재계산 없이). ★Commerce Platform 마지막 계층(분석). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
전 상품/고객/주문/재고/결제/프로모션/Marketplace 데이터 통합 분석·실시간 인사이트·AI 의사결정 지원. Commerce Platform 최상위 분석 계층·Enterprise Commerce Intelligence Framework.

## §2 구현 범위
Commerce Analytics · Commerce KPI · Customer/Product/Order/Sales/Marketplace Analytics · Commerce Dashboard · Commerce Intelligence · AI Commerce Intelligence.

## §3 구현 목표 (10)
Commerce Analytics Engine · Commerce Data Mart · Commerce KPI Engine · Commerce Dashboard · Customer/Product/Sales Analytics Engine · Commerce Audit Service · Commerce Insight Service · AI Commerce Advisor.

## §4 아키텍처 원칙 (10)
Data Driven Commerce · Business Outcome First · Explainable Analytics · Real-Time Insight · Event Driven · Metadata Driven · AI Assisted · Enterprise Standard · **One Version of Truth** · Audit by Default.

## §5 Canonical Entity (15)
COMMERCE_KPI · COMMERCE_METRIC · SALES_METRIC · CUSTOMER_METRIC · PRODUCT_METRIC · ORDER_METRIC · INVENTORY_METRIC · MARKETPLACE_METRIC · COMMERCE_DASHBOARD · COMMERCE_INSIGHT · ANALYTICS_REPORT · COMMERCE_FORECAST · ANALYTICS_JOB · ANALYTICS_AUDIT · ANALYTICS_POLICY. → 상세 = `MEA_PART030_CANONICAL_ENTITIES.md`.

## §6 Commerce Analytics Domain (10)
Sales/Customer/Product/Inventory/Promotion/Pricing/Marketplace/Payment/Fulfillment/Enterprise Commerce Analytics. 공통 KPI Framework. → ★현행=Sales=`Rollup`(channel_orders·GMV/ROAS)·Customer=`CustomerAI`/`CRM`·Product=`Pnl`/`Rollup`(SKU ROAS)·Inventory=`Wms`(deadStock)·Marketplace=`DigitalShelf`(SoS 267차)·Payment=`PgSettlement`. 공통 KPI Framework(형식)=부분.

## §7 KPI Framework (10)
GMV · Net Sales · AOV · Conversion Rate · CLV · CAC · Repeat Purchase Rate · Inventory Turnover · Cart Abandonment · Commerce ROI. KPI Registry 연계. → ★현행=GMV/Net Sales=`Rollup`/`Pnl`·Conversion=`AttributionMetrics`·CLV=`CRM`(263차)·CAC=`Rollup`·Turnover/deadStock=`Wms`·Commerce ROI=`Rollup`/`Pnl`. ★KPI Registry(Part 015=형식 부재 정합).

## §8 Sales Analytics (8)
Trend/by Product/Category/Channel/Region/Customer/Time/Comparison. Drill-down. → ★현행=`Rollup`(channel_orders·SKU/채널/기간 집계·drill seed)·by Channel=`Rollup`/`DigitalShelf`. 형식 Drill-down UI=부분.

## §9 Customer Analytics (8)
Segmentation/Purchase Behavior/Retention/Churn/Loyalty/Customer Value/Recommendation Performance/Journey. Customer 360 실시간 연계. → ★현행=`CustomerAI`(churn/CLV·BG-NBD 279차)·`CRM`(세그먼트·RFM·Part 025)·Journey=`JourneyBuilder`·Recommendation=`AutoRecommend`. Customer 360=Part 025.

## §10 Product Analytics (8)
Performance/Ranking/Category Performance/Best Seller/Slow Moving/Profitability/ROI/Trend. ROI 기준. → ★현행=Product ROAS/성과=`Rollup`(ad_insight_agg SKU 차원·attribution 배분)·Profitability=`Pnl`·Slow Moving=`Wms`(deadStock)·Trend=`DemandForecast`. Product ROI=`Rollup`/`Pnl`.

## §11 Marketplace Analytics (8)
Marketplace Sales/Profitability/Channel Comparison/Commission/Listing/Promotion Effectiveness/Marketplace ROI/Global Sales. 채널별 비교. → ★현행=Channel Comparison/SoS=`DigitalShelf`(267차)·Commission=`PgSettlement`/`Pnl`·Promotion Effectiveness=`AbTesting`·Marketplace ROI=`Rollup`(채널별). Listing(형식)=부분.

## §12 Commerce Dashboard (8)
Executive/Sales/Product/Customer/Marketplace/Inventory/Promotion/Commerce KPI Dashboard. 실시간 KPI. → ★현행=Part 019 대시보드(RollupDashboard/PnLDashboard/ChannelKPI/DataTrustDashboard)·Reports(193차). 형식 통합 Commerce Dashboard=부분.

## §13 Commerce Governance
KPI Definition · Analytics Policy · Dashboard Template · Report Version · Data Quality · Analytics Approval · Retention · Audit Trail. → ★현행=Data Quality=`DataPlatform`(DataTrust)·Report=`Reports`(템플릿)·Audit=`SecurityAudit`. ★KPI Definition/형식 Governance(Part 015 정합)=부분.

## §14 Data Security
Tenant Isolation · RBAC · Analytics Data Encryption · Sensitive Data Masking · Dashboard Permission · Audit Logging. → ★Part 021 상속: Tenant=`Db.php`·RBAC/Permission=`index.php`+`AdminMenu`·★No-PII 집계(v418.1)·Audit=`SecurityAudit`.

## §15 Runtime 규칙
KPI 계산 · Metric 집계 · Dashboard 갱신 · Analytics 실행 · Insight 생성 · Event · Audit. → ★현행=KPI/Metric=`Rollup`/`Pnl`(사전집계 SSOT)·Insight=`Insights`·Audit=`SecurityAudit`.

## §16 API 표준 (8)
Query Commerce KPI/Sales/Customer/Product/Marketplace Analytics · Generate Report · Query Dashboard · Query Audit. → ★현행=`Rollup` API·`Pnl` API·`Reports` API·`DigitalShelf` API 실재. Part 001 API 표준(`/api` 접두) 상속.

## §17 Event 표준 (8)
CommerceMetricUpdated · KPICalculated · DashboardRefreshed · InsightGenerated · ReportGenerated · ForecastCompleted · AnalyticsCompleted · AnalyticsAudited. → ★현행=`Reports`(report_run=ReportGenerated)·`Rollup`(집계) seed(동기·event-driven 부재). Data Platform §15 정합.

## §18 AI Integration
판매 예측 · 상품 추천 최적화 · 고객 구매 패턴 · 이탈 고객 예측 · 채널 성과 최적화 · 가격 전략 추천 · Promotion ROI 분석 · Explainable Commerce Insight. **AI는 분석 결과 변경/운영 데이터 직접 수정 불가.** → ★현행=판매 예측=`DemandForecast`/`Mmm`·추천=`AutoRecommend`·이탈=`CustomerAI`·가격 전략=`PriceOpt`·Promotion ROI=`Mmm`/`AbTesting`·Explainability=헌법 V4·데이터 직접 수정 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §19 성능 요구사항
KPI 계산 ≤500ms · Dashboard ≤2초 · Analytics ≤3초 · Report ≤5초 · Insight ≤2초 · Availability ≥99.99%. (현행 `Rollup` 사전집계·번들 지연로드 272차 seed.)

## §20 Completion Criteria
Commerce Analytics Engine·KPI Framework·Customer/Product/Marketplace Analytics·Dashboard·Governance·Security·API/Event·AI 구현. → **부분 충족**(커머스 KPI/분석/대시보드 실재·형식 Commerce Data Mart·Commerce KPI Engine(metadata-driven)=미완). 코드 0.

## 판정
**PARTIAL-strong(★커머스 KPI/분석 값 실재=`Rollup`(GMV/ROAS/conversion·channel_orders·SKU 성과·attribution 배분)·Product ROI=`Pnl`·CLV/churn=`CustomerAI`/`CRM`·Conversion=`AttributionMetrics`·SoS/채널 비교=`DigitalShelf`(267차)·Turnover/deadStock=`Wms`·Commerce ROI=`Rollup`/`Pnl`·대시보드=Part 019·Report=`Reports`·Explainable=헌법 V4) / ABSENT-formal(형식 Commerce Data Mart·metadata-driven Commerce KPI Engine/Registry(Part 015 정합)·Commerce Analytics Engine(통합)·형식 Drill-down·Event 표준).** ★핵심=커머스 KPI/분석 **값**은 이미 서버 SSOT(`Rollup`/`Pnl`/`Attribution`/`CRM`·무후퇴 단일소스·제품 핵심)·대시보드(Part 019)는 실재이나 형식 metadata-driven Commerce KPI Engine·Data Mart는 부재(KPI 값 코드 내재·Part 015/019 동일 판정). Commerce Platform/ROI Platform/Data Platform 상속(재정의 금지)·★중복 커머스 KPI/분석 계산 절대 금지(값 분산=회귀·One Version of Truth)·마케팅 AI KEEP_SEPARATE·★AI 분석 결과 변경/운영 데이터 직접 수정 불가(V3+V5). 코드 변경 0.

## 다음
MEA Part 031 — Logistics Platform Foundation Architecture(Commerce Platform 완료·신규 Logistics Platform 계열 착수).
