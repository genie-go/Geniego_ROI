# MEA Part 014 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = Calculation Engine 신설이 기존 Rollup/Pnl/Attribution 계산·Part 013/Data Platform과 중복 재정의하지 않도록 경계 확정. ★계산 엔진 실재로 중복 계산 위험 최상.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| ROI/KPI 값 계산 | ★MEA Part 013 ROI Foundation·Part 003 EDW(`Rollup`/`Pnl`) | ★재정의 금지·재사용(★중복 계산 절대 금지) |
| Aggregation | MEA Part 003·`Rollup` | ★재사용 |
| Validation | MEA Part 006 DQM | 참조·재사용 |
| Lineage(Source Data) | MEA Part 007 | 참조·재사용 |
| Governance/Formula 변경 | MEA Part 012/013·`CHANGE_GATE` | ★재사용·재정의 금지 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 계산/집계 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Calculation Engine | 명령형 계산 SSOT | `Rollup.php`·`Pnl.php`·`Attribution.php`·`Mmm.php`·`CRM.php` | ★재사용(★중복 계산/집계 엔진 신설 절대 금지·값 분산=회귀) |
| Financial Calculation | VAT/profit | `Pnl.php` | ★재사용(VAT/역분개 정본) |
| Currency | 통화 변환 | `CurrencyContext.jsx`·`Pnl.php` | 재사용 |
| Immutable History | 해시체인 | `SecurityAudit.php` | 재사용(중복 감사 금지) |
| Scenario | Mmm frontier | `Mmm.php` | 재사용 |
| Formula 변경/버전 | 게이트·git | `CHANGE_GATE.md`·git | 재사용 |
| AI | 이상탐지·Mmm·마케팅 AI | `AnomalyDetection`·`Mmm`·`ClaudeAI` | 재사용(전자)·KEEP_SEPARATE(마케팅) |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: 값 무후퇴·단일소스=★중복 계산/집계 절대 금지(값 분산=회귀).
- ★Pnl VAT(267차·해외광고비 VAT제외 289차)·CRM LTV 취소/반품 역분개(263차)=Financial 계산 정본(재구현 금지).
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Calculation Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Immutable Calculation History 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- Calculation Engine=`Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM` 승격(값 재계산 금지·Formula 래핑). Currency=`CurrencyContext`+`Pnl`. Immutable=`SecurityAudit::verify`. Formula 변경=`CHANGE_GATE`+git.

## 판정
**중복 위험 최상(계산 엔진 실재·결정론적 SSOT·제품 핵심).** ★핵심=`Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM`(계산 엔진)·`CurrencyContext`(통화)·`SecurityAudit`(불변 이력)는 **재사용/승격**(★중복 계산/집계/통화/감사 엔진 신설 절대 금지=값 분산=무후퇴 위반). Part 013 ROI Foundation·Part 003 EDW·Part 012 거버넌스·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 Formula-as-Code Engine·Formula Repository·Formula Version Manager·Scenario Calculation Engine·Currency Conversion Engine(FX versioning)뿐(값 재계산 아님·래핑/정의 계층). 마케팅 AI KEEP_SEPARATE·AI Formula 직접수정/승인 불가(V3+CHANGE_GATE).
