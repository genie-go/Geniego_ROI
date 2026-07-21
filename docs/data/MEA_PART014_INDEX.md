# MEA Part 014 — Index (Enterprise ROI Calculation Engine Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 014 (ROI Calculation Engine) 산출 문서 색인. ★MEA Part 013(ROI Foundation)+Data Platform(Part 001~012) 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART014_ROI_CALCULATION_ENGINE_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_ROI_CALCULATION_ENGINE_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 013 상속·Rollup/Pnl 계산 엔진 승격·★중복 계산 금지) |
| `docs/data/MEA_PART014_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART014_DUPLICATE_AUDIT.md` | GT② 계산 엔진·Part 013/003 중복 경계 |
| `docs/data/MEA_PART014_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 계산유형/Formula/Currency 판정 |
| `docs/data/MEA_PART014_GOVERNANCE_MECHANISMS.md` | §9~18 Currency/Validation/Audit/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART014_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(계산 엔진·결정론적 SSOT 실재·제품 핵심):** ★ROI Calculation Engine=`Rollup.php`(P&L SSOT+집계)·`Pnl.php`(VAT/gross·net profit·역분개 263차)·`Attribution.php`(ROAS/ROI)·`Mmm.php`(marketing mix/frontier)·`CRM.php`(LTV/CAC)=명령형 PHP·**결정론적**(같은 입력→같은 출력·무후퇴 단일소스) · Metric Aggregation=`Rollup`(GROUP BY) · Financial Calculation=`Pnl`(VAT/역분개) · Multi-Currency/Base Conversion=`CurrencyContext.jsx`+`Pnl` · **Immutable Calculation History**=`SecurityAudit`(append-only 해시체인) · Validation=Part 006 DQM · Explainable Calculation=헌법 V4 · Scenario=`Mmm`(frontier).
- **ABSENT-formal(형식 Formula 엔진 greenfield):** ROI Calculation Engine(형식 단일 엔진) · **Formula Repository** · **Formula Execution Engine**(선언적 Expression·Formula as Code) · **Formula Version Manager** · **Scenario Calculation Engine**(형식) · **Currency Conversion Engine**(Daily/Historical FX rate versioning·Exchange Rate Audit) · Trace ID · Event 표준(CalculationStarted 등) · AI Optimization Engine(형식).
- **★핵심 구분:** ROI 계산 엔진은 이미 실재·**결정론적 SSOT**(제품 핵심)이나 "Formula as Code" 선언적 엔진·formula repository·versioning·scenario가 아니라 **코드 내재 계산**(Part 013/003 동일 판정). 형식 Formula-as-Code 계층으로 래핑만(값 재계산 없이).
- **★재사용(★중복 계산/집계/통화/감사 엔진 신설 절대 금지·값 분산=회귀):** `Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM`(계산 엔진)·`CurrencyContext`(통화)·`SecurityAudit`(불변 이력)·무후퇴 value unification. Part 013 ROI Foundation·Part 003 EDW·Part 012 거버넌스·헌법 재정의 금지. ★Pnl VAT/CRM LTV 역분개=Financial 계산 정본(재구현 금지). AI=Formula 직접수정/승인 불가(V3+CHANGE_GATE)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[feedback_no_regression_value_unification]](값 무후퇴·단일소스=★중복 계산/집계 절대 금지) · Pnl VAT(267차·해외광고비 VAT제외 289차)/CRM LTV 역분개(263차)=Financial 정본 · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Calculation Leakage) · [[reference_menu_audit_log_not_tamper_evident]](Immutable Calculation History 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~013 + 형식 Formula-as-Code 엔진 신설·값 재계산 없이).

## 다음
MEA Part 015 — Enterprise KPI Management Architecture(본 Calculation Engine 상속·확장·중복 정의 금지).
