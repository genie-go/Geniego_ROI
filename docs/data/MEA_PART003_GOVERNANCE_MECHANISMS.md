# MEA Part 003 — Governance Mechanisms (§11~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §11 Historical Data
Insert Only · SCD(Type 2) · 변경 이력 보존 · Version 관리 · 감사 추적.
- 판정 **PARTIAL**. 변경 이력/감사=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]]). 일부 스냅샷(정산/rollup) 실재. **형식 SCD Type 2=ABSENT**(대부분 현재값 UPDATE)·순신설(과거 KPI 재현 필요 시).

## §12 Data Security
Row/Column Level Security · Tenant Isolation · Sensitive Data Masking · Query Audit · Access Policy Enforcement.
- 판정 **PARTIAL**(Part 001/002 상속). RLS/Tenant Isolation=`Db.php`(tenant_id·[[reference_platform_growth_actas_tenant_hijack]])·Masking=`ChannelCreds`(last4)·Query Audit=`SecurityAudit`·Access Policy=`index.php` RBAC/writeGuard(289차). Column-Level Security=순신설.

## §13 Runtime 규칙
Canonical Dimension 사용 · KPI 중앙 정의 참조 · Fact 무결성 검증 · 변경 이력 보존 · 분석 쿼리 감사.
- 판정 **PARTIAL**. ★KPI 중앙 정의 참조=값 단일소스(`Rollup`/`Pnl` SSOT·[[feedback_no_regression_value_unification]])·변경 이력/쿼리 감사=`SecurityAudit`. Canonical Dimension 사용/Fact 무결성 형식 검증=순신설(형식 차원모델 후).

## §14 API 표준 (8)
Query Dataset/KPI/ROI/Dimension/Fact/Aggregate · Refresh Semantic Model · Validate Warehouse.
- **PARTIAL**. Query KPI/ROI/Aggregate=`Rollup`/`Pnl`/`Attribution` API seed(실재). Refresh Semantic Model/Validate Warehouse=ABSENT. Part 001 API 표준(REST/version/idempotency) 상속·RBAC 게이트.

## §15 Event 표준 (8)
WarehouseLoaded · FactCreated · DimensionUpdated · KPIUpdated · AggregateGenerated · SemanticPublished · QueryExecuted · WarehouseValidated.
- **ABSENT**(event-driven 부재·Part 001/002 §15 정합·내부 이벤트버스 후 신설).

## §16 AI Integration
KPI 이상 탐지 · 데이터 품질 평가 · 집계 최적화 · Semantic 자동 추천 · ROI 예측 · 분석 모델 추천 · Warehouse 직접 수정 불가.
- 판정 **PARTIAL**(헌법 정합). KPI 이상=`AnomalyDetection`·품질=`DataPlatform`(DataTrust)·ROI 예측=`Mmm`(frontier). Warehouse 직접 수정 불가=데이터 헌법 V3(수집≠사용·READY만)/V4(근거/신뢰도). Semantic 추천/집계 최적화=순신설.

## §17 성능 요구사항
KPI 조회 ≤300ms · 집계 조회 ≤1초 · 대시보드 ≤2초 · 동시 10,000명 · Availability ≥99.99%. — 벤치 대상 미존재(형식 계층 신설 후·현행 Rollup 사전집계로 조회 최적화 seed).

## §18 Completion Criteria
EDW·Subject Area·Fact/Dimension·Semantic Layer·KPI Repository·Historical·Security·Runtime·API/Event·AI 구현.
- **현재 미충족**(형식 Star Schema/Fact-Dimension/Semantic Layer/KPI Definition Registry/SCD Type 2·Event 표준 ABSENT·코드 0). ★단 KPI/ROI 값 SSOT는 이미 실재.

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-formal** — Security(RLS/audit)·Runtime(KPI 중앙 정의=값 SSOT)·API(Query KPI/ROI)·AI(이상/ROI 예측)는 `Db.php`/`SecurityAudit`/`Rollup`/`Pnl`/`Attribution`/`Mmm`/`AnomalyDetection` 재사용(★값 중복 계산 절대 금지), **형식 Star Schema·Fact/Dimension·Semantic Layer·metadata-driven KPI Definition Registry·SCD Type 2·Event 표준은 순신설(값 재계산 없이)**. Part 001/002/헌법 재정의 금지. 코드 변경 0.
