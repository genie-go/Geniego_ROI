# MEA Part 003 — Enterprise Data Warehouse Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 001(Foundation)+Part 002(Data Lake)**를 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). Foundation의 DATA_DOMAIN/표준필드(tenant_id 등)/헌법 6볼륨/`DATA_ARCHITECTURE.md`, Data Lake의 Curated/AI Feature Zone을 인용·준수한다. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
Data Lake 정제 데이터 기반 경영·ROI·AI 분석·의사결정 통합 저장소(EDW). Enterprise Analytics 단일 기준(SSOT)·모든 KPI/ROI는 EDW 기준 산출. → ★현행: KPI/ROI **값**은 이미 서버 SSOT로 산출(GT① 참조·`Rollup`/`Pnl`/`Attribution`). 본 Part는 형식 차원 모델·메트릭 레지스트리 계층을 추가.

## §2 구현 범위
Enterprise Data Warehouse · Subject Area · Fact/Dimension Model · Star/Snowflake Schema · Historical Storage · Aggregate/Semantic/Business KPI Layer.

## §3 구현 목표 (10)
Enterprise Data Warehouse · Subject Area Manager · Fact/Dimension Repository · Semantic Model · Aggregate Engine · Historical Repository · KPI/ROI Repository · Analytical Query Engine.

## §4 아키텍처 원칙 (10)
Subject-Oriented · Integrated · Time-Variant · Non-Volatile · Analytics First · Canonical Dimension · Reusable Fact · AI Ready · Query Optimized · Enterprise Standard.

## §5 Canonical Entity (15)
SUBJECT_AREA · FACT_TABLE · DIMENSION_TABLE · KPI_DEFINITION · METRIC_DEFINITION · AGGREGATE_TABLE · TIME/ORGANIZATION/CUSTOMER/PRODUCT/REGION_DIMENSION · ROI_FACT · ANALYTICS_MODEL · QUERY_PROFILE · SEMANTIC_VIEW. → 상세 = `MEA_PART003_CANONICAL_ENTITIES.md`.

## §6 Subject Area (12)
Organization · Customer · Product · Commerce · Marketing · Logistics · Finance · AI · ROI · Operations · Governance · Compliance. → ★Part 001 DATA_DOMAIN 상속·실 핸들러 매핑(GT①).

## §7 Fact Model (10)
Sales/Order/Shipment/Delivery/Marketing/Finance/ROI/Inventory/Customer Activity/AI Prediction Fact. 공통 Dimension 참조. → ★현행=관계형 테이블(orders/channel_orders/performance_metrics)이 Fact 역할·형식 Fact 테이블/Star Schema=ABSENT.

## §8 Dimension Model (11)
Time · Organization · Tenant · Customer · Product · Campaign · Channel · Warehouse · Vehicle · Region · Currency. 재사용 원칙. → ★Tenant=`tenant_id`(Part 001)·Time/Product/Channel=관계형 컬럼(informal)·형식 Canonical Dimension 테이블=ABSENT.

## §9 KPI Repository
Revenue · Gross Profit · Net Profit · CAC · LTV · ROAS · ROI · Conversion Rate · Delivery Success Rate · Customer Retention. **KPI 정의=단일 버전.** → ★★현행: KPI **값**은 서버 SSOT로 산출(`Rollup` P&L SSOT·`Pnl` gross/net+VAT·`Attribution` ROAS/ROI/conversion·`CRM` LTV/CAC/retention·값 무후퇴 단일소스 강제·[[feedback_no_regression_value_unification]]). ★단 **메트릭 정의는 코드 내재**(형식 metadata-driven KPI Definition Registry=ABSENT).

## §10 Semantic Layer
Business Glossary · Metric/KPI Mapping · Dimension Alias · Query Abstraction · Security Mapping. → **ABSENT-formal**(비즈니스 용어↔모델 연결 형식 레이어 부재).

## §11 Historical Data
Insert Only · SCD(Type 2) · 변경 이력 보존 · Version 관리 · 감사 추적. → ★현행=일부 스냅샷·감사=`SecurityAudit`. **형식 SCD Type 2=ABSENT**(대부분 현재값 UPDATE).

## §12 Data Security
Row/Column Level Security · Tenant Isolation · Sensitive Data Masking · Query Audit · Access Policy Enforcement. → ★Part 001/002 상속: RLS/Tenant=`Db.php`(tenant_id)·Masking=ChannelCreds·Query Audit=`SecurityAudit`·Access Policy=`index.php` RBAC/writeGuard. Column-Level=순신설.

## §13 Runtime 규칙
Canonical Dimension 사용 · KPI 중앙 정의 참조 · Fact 무결성 검증 · 변경 이력 보존 · 분석 쿼리 감사. → ★KPI 중앙 정의=값 단일소스(`Rollup`/`Pnl` SSOT)·감사=`SecurityAudit`. Canonical Dimension/Fact 무결성 형식 검증=순신설.

## §14 API 표준 (8)
Query Dataset/KPI/ROI/Dimension/Fact/Aggregate · Refresh Semantic Model · Validate Warehouse. → ★Query KPI/ROI=`Rollup`/`Pnl`/`Attribution` API seed(실재)·Semantic/Validate=ABSENT. Part 001 API 표준 상속.

## §15 Event 표준 (8)
WarehouseLoaded · FactCreated · DimensionUpdated · KPIUpdated · AggregateGenerated · SemanticPublished · QueryExecuted · WarehouseValidated. → ABSENT(event-driven 부재·Part 001/002 §15 정합).

## §16 AI Integration
KPI 이상 탐지 · 데이터 품질 평가 · 집계 최적화 · Semantic 자동 추천 · ROI 예측 · 분석 모델 추천 **만**·Warehouse 직접 수정 불가. → ★KPI 이상=`AnomalyDetection`/`DataPlatform`·ROI 예측=`Mmm`(frontier) seed·직접 수정 불가=헌법 V3. Semantic 추천=순신설.

## §17 성능 요구사항
KPI 조회 ≤300ms · 집계 조회 ≤1초 · 대시보드 ≤2초 · 동시 10,000명 · Availability ≥99.99%. (벤치 대상 미존재.)

## §18 Completion Criteria
EDW·Subject Area·Fact/Dimension·Semantic Layer·KPI Repository·Historical·Security·Runtime·API/Event·AI 구현. → **현재 미충족**(형식 Star Schema/Fact-Dimension/Semantic Layer/KPI Definition Registry ABSENT·코드 0).

## 판정
**PARTIAL-strong(★KPI/ROI 값 산출 SSOT 실재·감사됨=Rollup/Pnl/Attribution/Mmm/CRM·RLS/tenant/audit/aggregate) / ABSENT-formal(형식 EDW·Star/Snowflake Schema·Fact/Dimension 테이블·Semantic Layer·metadata-driven KPI Definition Registry·SCD Type 2).** ★핵심=KPI/ROI **값**은 이미 서버 SSOT(무후퇴 단일소스·제품 핵심)이나 **차원 모델/메트릭 정의 레지스트리/시맨틱 레이어**는 형식 부재 — 값은 코드 내재 계산. Part 001/002 상속(재정의 금지). 코드 변경 0.

## 다음
MEA Part 004 — Enterprise Metadata Management Architecture(본 EDW 상속·확장).
