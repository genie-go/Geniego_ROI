# MEA Part 003 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = EDW 신설이 기존 KPI/ROI 계산·Part 001/002와 중복 재정의하지 않도록 경계 확정. ★KPI 값 SSOT 실재로 중복 계산 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| DATA_DOMAIN/표준필드/분류 | ★MEA Part 001 Foundation | ★재정의 금지·상속 |
| Curated/AI Feature Zone | ★MEA Part 002 Data Lake | ★재정의 금지·상속 |
| DataTrust/Quality | Part 001·`DataPlatform` | 참조·재사용 |
| 데이터 규범/정본 | 헌법 6볼륨·`DATA_ARCHITECTURE.md` | 참조·정합 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 KPI 계산 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| KPI/ROI 값(P&L SSOT) | 서버 P&L SSOT+VAT | `Rollup.php`·`Pnl.php` | ★재사용(중복 KPI 계산 절대 금지·값 분산=회귀) |
| ROAS/Attribution | 어트리뷰션 | `Attribution.php` | ★재사용 |
| LTV/CAC | CRM(역분개) | `CRM.php` | ★재사용 |
| ROI 예측 | Mmm frontier | `Mmm.php` | 재사용 |
| RLS/Isolation | tenant_id | `Db.php` | 재사용 |
| Query Audit | 해시체인 | `SecurityAudit.php` | 재사용 |
| AI(이상/품질) | 이상탐지·DataTrust | `AnomalyDetection`·`DataPlatform` | 재사용(V3 난립금지) |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 값 무후퇴·단일소스 실시간 일체화 — KPI 중복 계산 시 값 분산=회귀.
- [[feedback_real_value_autoderive]]: 임의 숫자 금지·SSOT 집계/파생.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Analytics Leakage·RLS=tenant_id 서버바인딩.
- [[reference_menu_audit_log_not_tamper_evident]]: Query Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- KPI/ROI 값=`Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm` 승격(값 재계산 금지·정의만 메타데이터화). RLS=`Db.php`. Audit=`SecurityAudit`. AI=`AnomalyDetection`/`DataPlatform`.

## 판정
**중복 위험 최상(KPI/ROI 값 SSOT 실재·제품 핵심).** ★핵심=`Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm`(KPI/ROI 계산)은 **재사용/승격**(★중복 KPI 계산 절대 금지·값 분산=무후퇴 위반). Part 001/002·헌법·`DATA_ARCHITECTURE.md` **재정의 금지**. 본 Part 고유 순신설=형식 Star/Snowflake Schema·Fact/Dimension 테이블·Semantic Layer(Business Glossary/Metric Mapping)·metadata-driven KPI Definition Registry(값 재계산 아님·정의 계층)·SCD Type 2·Analytical Query Engine뿐. 현행 관계형+Rollup 집계 무후퇴 존중(파괴적 재모델 금지).
