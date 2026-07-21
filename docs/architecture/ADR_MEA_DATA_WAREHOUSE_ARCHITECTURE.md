# ADR — MEA Part 003 Enterprise Data Warehouse Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part003 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 003은 EDW(경영/ROI 분석 통합 저장소). ★GeniegoROI는 **ROI 분석 대시보드**로 KPI/ROI **값** 산출이 이미 서버 SSOT로 실재·광범위 감사됨(`Rollup` P&L SSOT·`Pnl` VAT·`Attribution` ROAS·`CRM` LTV·`Mmm` frontier). 단 이 값들은 **코드 내재 계산**이지 형식 차원 모델(Star/Snowflake·Fact/Dimension 테이블)·Semantic Layer·metadata-driven KPI Definition Registry가 아니다. 본 Part는 Part 001/002 상속(재정의 금지).

## 결정
- **D-1 (Part 001/002 상속·재정의 금지):** DATA_DOMAIN/표준필드/헌법/DATA_ARCHITECTURE(Part 001)·Curated/AI Feature Zone(Part 002)를 준수·인용. Subject Area(§6)=Part 001 DATA_DOMAIN 매핑. 중복 정의 금지.
- **D-2 (KPI/ROI 값 SSOT = Rollup/Pnl/Attribution 승격·값 무후퇴):** Revenue/Gross·Net Profit/ROAS/ROI/LTV/CAC/Conversion/Retention 값 = `Rollup.php`(서버 P&L SSOT+집계)·`Pnl.php`(VAT/gross·net)·`Attribution.php`(ROAS/conversion)·`CRM.php`(LTV/CAC)·`Mmm.php`(ROI frontier). ★값은 단일소스·무후퇴([[feedback_no_regression_value_unification]]·[[feedback_real_value_autoderive]])로 이미 강제. 중복 KPI 계산 신설 절대 금지(값 분산=회귀). 형식 KPI Definition Registry는 이 계산의 **정의를 메타데이터화**(값 재계산 아님).
- **D-3 (Fact/Dimension/Star Schema = ABSENT-formal·현행 관계형 존중):** Fact=관계형 테이블(orders/channel_orders/performance_metrics)·Dimension=tenant_id/time/product/channel 컬럼(informal). 형식 Star/Snowflake·Fact/Dimension 테이블·OLAP cube=순신설(현행 관계형+Rollup 집계 무후퇴 존중·파괴적 재모델 금지).
- **D-4 (Security/Audit = Part 001/002 재사용):** RLS/Tenant Isolation=`Db.php`(tenant_id·[[reference_platform_growth_actas_tenant_hijack]])·Query Audit=`SecurityAudit`·Access Policy=`index.php` RBAC/writeGuard·Masking=ChannelCreds. Column-Level Security=순신설. 중복 격리/감사 금지.
- **D-5 (Semantic Layer/SCD/AI = 신설·헌법 정합):** Semantic Layer(Business Glossary/Metric Mapping)·SCD Type 2·형식 Aggregate/Query Engine=순신설. AI(KPI 이상/ROI 예측)=`AnomalyDetection`/`DataPlatform`/`Mmm` 승격·Warehouse 직접수정 불가=헌법 V3(수집≠사용·READY만). 중복 AI 엔진 금지(V3 난립금지).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001/002/헌법/DATA_ARCHITECTURE 상속·재정의 금지·KPI/ROI 값 SSOT는 이미 실재(중복 계산 절대 금지)·형식 차원모델/Semantic Layer/메트릭 레지스트리는 값 재계산 없이 정의 계층만 신설(무후퇴). 실행은 선행 Part 001/002 종속.
