# MEA Part 003 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Rollup/Pnl/Attribution/CRM/Mmm 값 SSOT 재사용·형식 차원모델/시맨틱 greenfield·Part 001/002 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | SUBJECT_AREA | Part 001 DATA_DOMAIN·핸들러 | (Part 001) | PARTIAL(도메인 매핑) |
| 2 | FACT_TABLE | 관계형(orders/performance_metrics) | DB 테이블 | PARTIAL(형식 Fact 아님) |
| 3 | DIMENSION_TABLE | tenant/time/product 컬럼 | `Db.php`·컬럼 | PARTIAL(형식 Dimension 아님) |
| 4 | KPI_DEFINITION | ★코드 내재 계산(값 SSOT) | `Rollup.php`·`Pnl.php` | PARTIAL-strong(값)·ABSENT(정의 레지스트리) |
| 5 | METRIC_DEFINITION | 코드 내재 | `Attribution.php`·`CRM.php` | PARTIAL(값)·ABSENT(형식) |
| 6 | AGGREGATE_TABLE | GROUP BY 집계 | `Rollup.php` | PARTIAL |
| 7 | TIME_DIMENSION | daily/monthly 컬럼 | `Rollup.php` | PARTIAL(형식 아님) |
| 8 | ORGANIZATION_DIMENSION | tenant/대행사 | `AgencyPortal`·tenant_id | PARTIAL |
| 9 | CUSTOMER_DIMENSION | CRM 고객 | `CRM.php` | PARTIAL |
| 10 | PRODUCT_DIMENSION | 카탈로그 상품 | `Catalog.php` | PARTIAL |
| 11 | REGION_DIMENSION | 부재/부분(Geo) | `Geo.php` | PARTIAL-informal |
| 12 | ROI_FACT | ★ROI/ROAS 계산 | `Attribution.php`·`Mmm.php` | PARTIAL-strong(값) |
| 13 | ANALYTICS_MODEL | Mmm/Insights | `Mmm.php`·`Insights.php` | PARTIAL |
| 14 | QUERY_PROFILE | 부재(형식) | — | ABSENT |
| 15 | SEMANTIC_VIEW | 부재(Business Glossary) | — | ABSENT-formal |

## §6~§16 표준 판정
- **§6 Subject Area(12)**: Part 001 DATA_DOMAIN 상속·실 핸들러 매핑(Commerce=OrderHub·Marketing=Mmm/Attribution·Finance=Pnl·ROI=Rollup/Attribution·Logistics=Wms). 형식 Subject Area Manager=ABSENT.
- **§7 Fact(10)**: Sales/Order/ROI/Inventory/Marketing Fact=관계형 테이블+계산 실재·형식 Fact 테이블/Star Schema=ABSENT.
- **§8 Dimension(11)**: Tenant=`tenant_id`(Part 001)·Time/Product/Channel/Currency=관계형 컬럼·형식 Canonical Dimension=ABSENT.
- **§9 KPI Repository**: ★값=`Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm` SSOT(무후퇴 단일소스)·**정의=코드 내재**(metadata-driven Registry ABSENT).
- **§10 Semantic Layer**: **ABSENT-formal**(Business Glossary/Metric Mapping 순신설).
- **§11 Historical**: 일부 스냅샷·감사=`SecurityAudit`·**SCD Type 2=ABSENT**.
- **§12 Security**: RLS/Tenant=`Db.php`·Query Audit=`SecurityAudit`·Access=`index.php` RBAC. Column-Level=순신설.
- **§16 AI**: KPI 이상/품질=`AnomalyDetection`/`DataPlatform`·ROI 예측=`Mmm`·직접수정 불가=헌법 V3. Semantic 추천=순신설.

## 판정
**PARTIAL-strong(§4·§5·§12 KPI/ROI 값 SSOT=Rollup/Pnl/Attribution/CRM/Mmm) / PARTIAL(§1~3·§6~11·§13 관계형 Fact/Dimension·집계) / ABSENT-formal(§14·§15=Query Profile/Semantic View·형식 Star Schema/KPI Definition Registry/SCD Type 2).** 코드 0. ★KPI/ROI 값 SSOT 재사용(중복 계산 절대 금지)·형식 차원모델/시맨틱/메트릭 레지스트리 신설(값 재계산 없이)·Part 001/002 상속.
