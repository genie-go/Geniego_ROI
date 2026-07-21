# MEA Part 003 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 003 SPEC/ADR.

## 전수조사 방법
Rollup/Pnl/Attribution/Mmm/CRM/KPI/ROI/fact/dimension/star-schema/scd/semantic-layer/olap 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (★KPI/ROI 값 SSOT 실재·제품 핵심)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| KPI/ROI 값 산출(SSOT) | ★서버 P&L SSOT+집계 | `Rollup.php`·`Pnl.php`(VAT/gross·net) | PARTIAL-strong(값 SSOT) |
| ROAS/ROI/Conversion/Attribution | 어트리뷰션 계산 | `Attribution.php` | PARTIAL-strong |
| LTV/CAC/Retention | CRM 계산(취소/반품 역분개) | `CRM.php` | PARTIAL-strong |
| ROI 예측/마케팅믹스 | Mmm frontier | `Mmm.php` | PARTIAL |
| Aggregate Layer | GROUP BY 집계(daily/monthly) | `Rollup.php` | PARTIAL |
| Fact(관계형) | orders/channel_orders/performance_metrics | DB 테이블 | PARTIAL(형식 Fact 테이블 아님) |
| Dimension(관계형) | tenant/time/product/channel 컬럼 | `Db.php`·테이블 컬럼 | PARTIAL(형식 Dimension 아님) |
| RLS/Tenant Isolation | tenant_id 스코핑 | `Db.php` | 실재(재사용) |
| Query Audit | 해시체인 감사 | `SecurityAudit.php` | 실재 |
| AI(KPI 이상/품질) | 이상탐지·DataTrust | `AnomalyDetection.php`·`DataPlatform.php` | PARTIAL |

## 부재(ABSENT-formal) — 형식 차원 모델/시맨틱/레지스트리 (grep 0)
Enterprise Data Warehouse(형식) · Subject Area Manager(형식) · **Fact/Dimension Repository**(Star/Snowflake Schema·형식 Fact/Dimension 테이블) · **Semantic Model/Layer**(Business Glossary/Metric Mapping/Dimension Alias) · **metadata-driven KPI/Metric Definition Registry**(현행 KPI 정의=코드 내재) · Aggregate Engine(형식) · Historical Repository(**SCD Type 2**) · Analytical Query Engine(OLAP cube) · Event 표준(WarehouseLoaded 등) · Column Level Security.

## 판정
**PARTIAL-strong / ABSENT-formal.** ★KPI/ROI **값** 산출은 서버 SSOT로 실재·광범위 감사됨(`Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm`·값 무후퇴 단일소스=제품 핵심)하나, **형식 EDW·Star/Snowflake Schema·Fact/Dimension 테이블·Semantic Layer·metadata-driven KPI Definition Registry·SCD Type 2는 전무**(값은 관계형+Rollup 집계 위에 코드로 계산). 실행은 선행 Part 001/002 + 차원모델/시맨틱 계층 신설(값 재계산 없이) 종속.
