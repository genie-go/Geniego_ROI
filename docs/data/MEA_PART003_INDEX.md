# MEA Part 003 — Index (Enterprise Data Warehouse Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 003 (Enterprise Data Warehouse Architecture) 산출 문서 색인. ★MEA Part 001/002 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART003_DATA_WAREHOUSE_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_DATA_WAREHOUSE_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001/002 상속·KPI/ROI 값 SSOT 승격) |
| `docs/data/MEA_PART003_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART003_DUPLICATE_AUDIT.md` | GT② KPI/ROI 계산·Part 001/002 중복 경계 |
| `docs/data/MEA_PART003_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 Subject/Fact/Dimension/KPI 판정 |
| `docs/data/MEA_PART003_GOVERNANCE_MECHANISMS.md` | §11~18 Historical/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART003_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(KPI/ROI 값 SSOT 실재·제품 핵심):** Revenue/Gross·Net Profit/VAT=`Rollup.php`(서버 P&L SSOT+집계)·`Pnl.php` · ROAS/ROI/Conversion/Attribution=`Attribution.php` · LTV/CAC/Retention=`CRM.php`(취소/반품 역분개) · ROI 예측/마케팅믹스=`Mmm.php`(frontier) · Aggregate=`Rollup`(GROUP BY daily/monthly) · Fact=관계형(orders/channel_orders/performance_metrics) · Dimension=tenant/time/product 컬럼 · RLS/Tenant=`Db.php` · Query Audit=`SecurityAudit` · AI 이상/품질=`AnomalyDetection`/`DataPlatform`.
- **ABSENT-formal(형식 차원모델/시맨틱/레지스트리):** Enterprise Data Warehouse(형식) · **Star/Snowflake Schema·Fact/Dimension Repository** · **Semantic Layer**(Business Glossary/Metric Mapping/Dimension Alias) · **metadata-driven KPI/Metric Definition Registry**(현행 KPI 정의=코드 내재) · **SCD Type 2** · Analytical Query Engine(OLAP) · Column Level Security · Event 표준(WarehouseLoaded 등).
- **★핵심 구분:** KPI/ROI **값**은 이미 서버 SSOT로 산출·광범위 감사됨(무후퇴 단일소스·제품 핵심)이나 **정의는 코드 내재**(형식 차원 모델/Semantic Layer/메트릭 정의 레지스트리 부재). 값 재계산 없이 정의 계층만 신설.
- **★재사용(★중복 KPI 계산 절대 금지·값 분산=회귀):** `Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm`(KPI/ROI 값)·`Db.php`(RLS)·`SecurityAudit`(감사)·`AnomalyDetection`/`DataPlatform`(AI). Part 001/002·헌법·DATA_ARCHITECTURE 재정의 금지. AI=Warehouse 직접수정 불가(헌법 V3).
- **★교훈:** [[feedback_no_regression_value_unification]](값 무후퇴·단일소스=중복 KPI 계산 금지) · [[feedback_real_value_autoderive]](SSOT 집계/파생·임의 숫자 금지) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Analytics Leakage) · [[reference_menu_audit_log_not_tamper_evident]](Query Audit 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001/002 + 차원모델/시맨틱 계층 신설·값 재계산 없이).

## 다음
MEA Part 004 — Enterprise Metadata Management Architecture(본 EDW 상속·확장·중복 정의 금지).
