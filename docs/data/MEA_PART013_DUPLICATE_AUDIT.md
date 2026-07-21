# MEA Part 013 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = ROI Platform Foundation 신설이 기존 ROI/KPI 계산·Data Platform(Part 001~012)과 중복 재정의하지 않도록 경계 확정. ★ROI 값 SSOT 실재로 중복 계산 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| KPI/ROI 값 계산 | ★MEA Part 003 EDW(`Rollup`/`Pnl`/`Attribution`) | ★재정의 금지·재사용(★중복 KPI 계산 절대 금지) |
| KPI 정의 메타데이터 | MEA Part 004 Metadata | 참조·재사용 |
| ROI 데이터 품질(Trust First) | MEA Part 006 DQM | 참조·재사용 |
| 값 추적(Lineage) | MEA Part 007 | 참조·재사용 |
| 거버넌스/계산식 변경 | MEA Part 012·`CHANGE_GATE` | ★재사용·재정의 금지 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 KPI/ROI 계산 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| ROI/KPI 값(P&L SSOT) | 서버 P&L SSOT+VAT | `Rollup.php`·`Pnl.php` | ★재사용(★중복 KPI 계산 절대 금지·값 분산=회귀) |
| Marketing ROI/ROAS | 어트리뷰션·MMM | `Attribution.php`·`Mmm.php` | ★재사용 |
| LTV/CAC | CRM 역분개 | `CRM.php` | ★재사용 |
| Financial Metric | Revenue/Profit/Margin | `Pnl.php` | ★재사용 |
| KPI 단일정의 | 무후퇴 value unification | 무후퇴 원칙 | ★재사용 |
| 계산식 변경/이력 | 게이트·감사 | `CHANGE_GATE.md`·`SecurityAudit.php` | 재사용 |
| AI | 이상탐지·MMM·마케팅 AI | `AnomalyDetection`·`Mmm`·`ClaudeAI` | 재사용(전자)·KEEP_SEPARATE(마케팅) |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: KPI 단일 정의·값 무후퇴=★중복 KPI/ROI 계산 절대 금지(값 분산=회귀).
- [[feedback_real_value_autoderive]]: 임의 숫자 금지·SSOT 집계/파생.
- ★Pnl VAT(267차·해외광고비 VAT제외 289차)·CRM LTV 취소/반품 역분개(263차)=Financial 정본(재구현 금지).
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant ROI Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: ROI Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- ROI/KPI 값=`Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM` 승격(값 재계산 금지·정의만 메타데이터화). Governance=무후퇴+`CHANGE_GATE`. Audit=`SecurityAudit`. AI=`AnomalyDetection`/`Mmm`.

## 판정
**중복 위험 최상(ROI/KPI 값 SSOT 실재·제품 핵심).** ★핵심=`Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM`(ROI/KPI 계산)은 **재사용/승격**(★중복 KPI/ROI 계산 신설 절대 금지=값 분산=무후퇴 위반). Part 003 EDW·Part 004 Metadata·Part 012 거버넌스·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 metadata-driven ROI/KPI/Financial Metric Registry(값 재계산 아님·정의 계층)·Formula Version/Baseline Manager·ROI Dashboard Foundation뿐. 마케팅 AI KEEP_SEPARATE·AI 계산식 직접변경/승인 불가(V3+CHANGE_GATE).
