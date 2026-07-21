# MEA Part 013 — Index (ROI Intelligence Platform Foundation)

> **거버넌스 상태**: 설계 명세 인덱스(★ROI Platform 계층 시작) · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 013 (ROI Intelligence Platform Foundation) 산출 문서 색인. ★MEA Data Platform(Part 001~012) 상속·확장(재정의 금지)·ROI Platform 최상위 Foundation.

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART013_ROI_INTELLIGENCE_PLATFORM_FOUNDATION_SPEC.md` | canonical baseline SPEC v1.0(§1~§17) |
| `docs/architecture/ADR_MEA_ROI_INTELLIGENCE_PLATFORM_FOUNDATION.md` | 설계 결정(D-1~D-5·Part 001~012 상속·ROI/KPI 값 SSOT 승격·★중복 계산 금지) |
| `docs/data/MEA_PART013_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART013_DUPLICATE_AUDIT.md` | GT② ROI/KPI 계산·Part 003/004/012 중복 경계 |
| `docs/data/MEA_PART013_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~15 ROI Domain/KPI/Financial 판정 |
| `docs/data/MEA_PART013_GOVERNANCE_MECHANISMS.md` | §9~17 Governance/Financial/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART013_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(ROI/KPI 값 SSOT 실재·제품 핵심):** ★ROI/KPI 값 산출=`Rollup.php`(서버 P&L SSOT+집계)·`Pnl.php`(VAT/gross·net/operating profit·해외광고비 VAT제외 289차·취소반품 역분개 263차) · Marketing ROI/ROAS=`Attribution.php`·`Mmm.php`(ROI frontier) · Customer ROI(LTV/CAC)=`CRM.php` · Commerce/Enterprise ROI=`OrderHub`/`Rollup` · ROI Domains=실 핸들러 매핑(12 도메인) · ROI Governance(KPI 단일 정의)=무후퇴 value unification+`CHANGE_GATE`(계산식 변경 승인)+`SecurityAudit`(이력) · Explainable ROI=헌법 V4 · Currency/Period=`CurrencyContext`/PeriodFilterBar.
- **ABSENT-formal(형식 ROI/KPI/Financial Registry greenfield):** Enterprise ROI Platform(형식) · ROI Registry · **metadata-driven KPI Registry**(현행 KPI 정의=코드 내재) · **Financial Metric Registry** · ROI Policy Manager · **Formula Version Manager** · **Baseline Manager** · ROI Dashboard Foundation · ROI AI Foundation · Event 표준(ROIModelRegistered 등) · Cash Flow/Budget/Forecast Metric(부분/부재).
- **★핵심 구분:** GeniegoROI가 **ROI 분석 플랫폼 자체**라 ROI/KPI **값**은 이미 서버 SSOT로 산출·광범위 감사됨(무후퇴 단일소스·VAT/역분개·제품 핵심)이나 **정의는 코드 내재**(형식 metric 레지스트리/Formula versioning/Baseline 부재·Part 003 EDW 동일 판정). 값 재계산 없이 정의 계층만 신설.
- **★재사용(★중복 KPI/ROI 계산 신설 절대 금지·값 분산=회귀):** `Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM`(ROI/KPI 값)·무후퇴 value unification(단일 정의)·`CHANGE_GATE`(변경 승인)·`SecurityAudit`(감사)·`AnomalyDetection`/`Mmm`(AI). Part 003 EDW·Part 004 Metadata·Part 012 거버넌스·헌법 재정의 금지. AI=ROI 계산식 직접변경/승인 불가(V3+CHANGE_GATE)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[feedback_no_regression_value_unification]](KPI 단일 정의·값 무후퇴=★중복 KPI/ROI 계산 절대 금지) · [[feedback_real_value_autoderive]](SSOT 집계/파생) · Pnl VAT(267차·해외광고비 VAT제외 289차)/CRM LTV 역분개(263차)=Financial 정본(재구현 금지) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant ROI Leakage) · [[reference_menu_audit_log_not_tamper_evident]](ROI Audit 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED · ★ROI Platform 계층 시작**(선행 Part 001~012 + metric 정의 레지스트리 신설·값 재계산 없이).

## 다음
MEA Part 014 — Enterprise ROI Calculation Engine Architecture(본 ROI Foundation 상속·확장·중복 정의 금지).
