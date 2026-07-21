# DSAR — EAINGA Governance Mechanisms (Part 3-46 §22~§31)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §22 Runtime Guard — 차단 대상
Unapproved Model Usage · Prompt Injection · Unsafe AI Decision · Policy Bypass · Cross-Tenant Context Leakage · Explainability Failure.
- 판정 **PARTIAL**. Cross-Tenant Context Leakage 차단=`Db.php` 격리·위임 tenant 서버바인딩([[reference_platform_growth_actas_tenant_hijack]]). Unsafe AI Decision=헌법 V5 안전자동화(신뢰/권한/통계신뢰 부족 시 자동집행 금지→경고) 재사용. **Prompt Injection·Unapproved Model·Explainability Failure 가드=순신설**(현행 부재).

## §23 Static Lint — 탐지 대상
Missing Model Card · Missing Prompt Approval · Missing Safety Validation · Missing Explainability · Missing Risk Assessment · Missing Compliance Evidence.
- **ABSENT**. pre-commit 확장(현 G-게이트에 AI 카드/프롬프트 승인 검사 추가).

## §24 Error Contract
AI_MODEL_VALIDATION_FAILED · AI_DECISION_ABORTED · AI_SAFETY_VIOLATION · PROMPT_VALIDATION_FAILED · MODEL_DRIFT_EXCEEDED · AI_COMPLIANCE_FAILED · AI_EXPLAINABILITY_FAILED. — 순신설(단 MODEL_DRIFT=`ModelMonitor` 드리프트 신호 seed).

## §25 Warning Contract
Model Drift Increasing · Confidence Declining · Prompt Quality Degrading · Safety Risk Elevated · Human Override Increasing. — 순신설(Drift/Confidence=ModelMonitor/Decisioning seed).

## §26 API (최소 8)
Register AI Model · Execute AI Decision · Validate Prompt · Query AI Governance · Export AI Audit Report · Query AI Analytics · Evaluate AI Model · Publish AI Baseline.
- **ABSENT**(단 Execute AI Decision=`Decisioning`/`AutoRecommend` seed·Query Analytics=`ModelMonitor` seed). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약. Register/Publish/Export=admin 게이트(`requireAdmin`). ★AI Decision 자동집행은 헌법 V5 승인정책 존중(외부채널 변경=명시 권한내).

## §27 Database Constraint
Immutable AI History · Model Integrity · Prompt Integrity · Evidence Integrity · Tenant Isolation · AI Baseline Integrity.
- Immutable/Evidence Integrity = `SecurityAudit::verify` 재사용(신규 체인 금지·[[reference_menu_audit_log_not_tamper_evident]]). Tenant Isolation = `Db.php`. 나머지 테이블 순신설(테넌트 선도키).

## §28 Index
Model · Prompt · Decision · Analytics · Snapshot · Evidence. — §27 테이블 종속·테넌트 선도키 권장.

## §29 성능 요구사항
AI Decision ≤700ms · Explainability ≤2초 · Model Validation ≤30초 · Dashboard ≤5초 · Availability ≥99.999%. — 벤치 대상 미존재(엔진 신설 후 측정).

## §30 테스트
Unit(Decision/Safety/Explainability/Compliance/Analytics)·Integration(Part3-45 EAGDTEF·Strategic Sustainability·Future Tech·Validation Suite·Production Excellence·Executive Dashboard)·Performance(10k Models·100M Decisions/일·500M Prompt·50k 동시·100 Region)·**Security(★Prompt Injection·Model Poisoning·Data Leakage·Cross-Tenant Context·Unauthorized Model Deployment)**·Compliance(ISO 42001·23894·NIST AI RMF·27001·EU AI Act)·Regression 매트릭스. 순신설. ★Prompt Injection·Cross-Tenant Context=최우선 보안테스트.

## §31 Completion Gate
25 구성요소 구축 + Performance Benchmark + AI-Native Governance Validation + Regression 100%.
- **현재 게이트 미충족**(형식 AI 거버넌스 ABSENT·마케팅 AI는 KEEP_SEPARATE·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-45 인증.

## 종합 판정
전 메커니즘 **ABSENT-formal/PARTIAL** — Runtime Guard/Isolation/Evidence는 `Db.php`/`SecurityAudit`/헌법 V5 안전자동화 재사용, Drift/Decision/Analytics는 `ModelMonitor`/`Decisioning` 승격, Explainability는 헌법 V4 강제 형식화. **Prompt Injection Defense·형식 Model/Prompt Governance·AI Risk/Compliance Validator는 순신설**. 마케팅 AI 오흡수 금지. 코드 변경 0. 실행 불가(선행 인증 종속).
