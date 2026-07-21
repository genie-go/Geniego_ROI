# MEA Part 030 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Commerce Analytics 신설이 기존 KPI 값(`Rollup`/`Pnl`)·분석·대시보드(Part 019)·Part 015 KPI와 중복 재정의하지 않도록 경계 확정. ★KPI 값 SSOT·대시보드 실재로 중복 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| KPI 값 계산 | ★MEA Part 015 KPI·Part 013 ROI·`Rollup`/`Pnl` | ★재정의 금지·재사용(★중복 KPI 계산 금지) |
| Dashboard | ★MEA Part 019 Executive Dashboard·Part 019 프론트 | ★재정의 금지·재사용 |
| Customer Analytics | ★MEA Part 025 Customer 360·`CustomerAI`/`CRM` | ★재정의 금지·재사용 |
| Product/Marketplace ROI | ★MEA Part 016 Profit·Part 029·`Pnl`/`DigitalShelf` | ★재정의 금지·재사용 |
| Forecast | ★MEA Part 017 Forecast·`DemandForecast` | 참조·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 커머스 KPI/분석 계산 절대 금지·One Version of Truth)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| 커머스 KPI 값 | GMV/ROAS 집계 SSOT | `Rollup.php`·`Pnl.php` | ★재사용(★중복 KPI 계산 신설 절대 금지·값 분산=회귀) |
| Product ROI | 상품 이익 | `Pnl.php` | ★재사용(중복 이익 계산 금지) |
| CLV/Churn | 고객 예측 | `CustomerAI`·`CRM` | ★재사용(중복 CLV 금지) |
| Conversion | 전환 | `AttributionMetrics.php` | 재사용 |
| SoS/채널 비교 | Share of Shelf | `DigitalShelf.php`(267차) | 재사용 |
| 대시보드/Report | 프론트·리포트 | Part 019·`Reports` | ★재사용(중복 대시보드/리포트 금지) |
| AI | 마케팅 AI | `ClaudeAI` | KEEP_SEPARATE |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: One Version of Truth=KPI 단일소스·값 무후퇴=★중복 커머스 KPI/분석 계산 절대 금지(값 분산=회귀).
- ★KPI 값 SSOT=`Rollup`/`Pnl`/`Attribution`/`CRM`(VAT 267차·LTV 263차·adj_roas)·Part 015 정합·재구현 금지.
- ★대시보드=Part 019·Report=`Reports`(193차)·중복 대시보드/리포트 금지.
- ★No-PII 집계(v418.1)·Commerce Analytics는 집계 cohort(구매자 레코드 아님).
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Analytics Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Analytics Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- 커머스 KPI=`Rollup`/`Pnl` 승격(값 재계산 금지·정의만 메타데이터화). 분석=도메인 handler. 대시보드=Part 019. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(KPI 값 SSOT·대시보드 실재).** ★핵심=`Rollup`/`Pnl`(커머스 KPI 값)·`CustomerAI`/`CRM`(고객 분석)·`AttributionMetrics`(전환)·`DigitalShelf`(SoS)·Part 019(대시보드)·`Reports`(리포트)·`SecurityAudit`는 **재사용/승격**(★중복 커머스 KPI/분석/대시보드 신설 절대 금지=값 분산=무후퇴 위반·One Version of Truth). Part 015 KPI·Part 019 Dashboard·Part 013/016 ROI·Part 025 Customer·Part 017 Forecast·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 metadata-driven Commerce KPI Engine·Commerce Data Mart·Analytics Engine(통합)·형식 Drill-down·Event 표준뿐. 마케팅 AI KEEP_SEPARATE·★AI 분석 결과 변경/운영 데이터 직접 수정 불가(V3+V5+CHANGE_GATE).
