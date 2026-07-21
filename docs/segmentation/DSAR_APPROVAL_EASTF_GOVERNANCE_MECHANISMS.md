# DSAR — EASTF Governance Mechanisms (Part 3-39 §21~§30)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §21 Runtime Guard — 차단 대상
Unauthorized Roadmap Change · Unapproved Initiative · Invalid KPI Publication · Portfolio Manipulation · Budget Governance Bypass · Benefit Evidence Tampering.
- 판정 **PARTIAL**. Roadmap/Portfolio 변조 차단=admin 게이트(`requirePlan('admin')`)+`SecurityAudit`+`index.php` RBAC. KPI=서버 집계 SSOT([[reference_real_value_autoderive]]). 신규 게이트 신설 금지.

## §22 Static Lint — 탐지 대상
Missing Business Case · Missing Executive Sponsor · Missing Success Metric · Invalid Dependency · Missing Benefit Owner · Incomplete Readiness Assessment.
- **ABSENT**. Invalid Dependency=`PM/Dependencies.php` DFS 순환검출 재사용. pre-commit/CI 확장.

## §23 Error Contract
TRANSFORMATION_PLAN_INVALID · ROADMAP_VALIDATION_FAILED · BUSINESS_CASE_REJECTED · PORTFOLIO_ANALYSIS_FAILED · BENEFIT_VALIDATION_FAILED · STRATEGIC_ALIGNMENT_FAILED · READINESS_ASSESSMENT_FAILED. — 순신설.

## §24 Warning Contract
Strategic Drift Detected · Initiative Behind Schedule · Budget Threshold Exceeded · Benefit Realization Delayed · Capability Maturity Below Target. — 순신설.

## §25 API (최소 8)
Register Transformation · Query Portfolio · Execute Impact Assessment · Generate Roadmap · Query KPI · Export Executive Report · Query Analytics · Validate Strategic Alignment.
- **ABSENT**. 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). 전 API=admin 게이트(requirePlan('admin')). KPI=서버 집계 SSOT.

## §26 Database Constraint
Immutable Transformation History · Roadmap Integrity · Portfolio Integrity · Benefit Evidence Integrity · Tenant Isolation · Executive Approval Integrity.
- Immutable/Evidence = `SecurityAudit::verify` 재사용(신규 체인 금지). Isolation = `Db.php`. Roadmap/Portfolio 무결성=버전+체인. 나머지 테이블 순신설.

## §27 Index
Portfolio · Initiative · Roadmap · Capability · KPI · Snapshot. — §26 테이블 종속·테넌트 선도키 권장.

## §28 성능 요구사항
Portfolio Evaluation ≤15초 · Roadmap Generation ≤30초 · KPI Refresh ≤5초 · Executive Dashboard Refresh ≤5초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §29 테스트
Unit/Integration(Operational Excellence Benchmark·Global Center of Excellence·Executive Governance Dashboard·Continuous Innovation·Validation Suite·Production Excellence)/Performance(100k Initiatives·10k Portfolios·250 Capabilities·10B KPI Records)/Security(Unauthorized Portfolio Access·Roadmap Tampering·KPI Manipulation·Cross-Tenant Strategy Leakage·Executive Approval Forgery)/Compliance(ISO 9001·27001·COBIT 2019·TOGAF·ITIL 4)/Regression 매트릭스. 순신설.

## §30 Completion Gate
24 구성요소 구축 + Performance Benchmark 통과 + Strategic Transformation Validation 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 엔티티 ABSENT/PARTIAL·조직 부재·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-38 인증 + 조직 신설.

## 종합 판정
전 메커니즘 **ABSENT-formal/PARTIAL** — Runtime Guard는 admin 게이트/SecurityAudit/RBAC 확장, Static Lint(Invalid Dependency)는 `PM/Dependencies.php` DFS 재사용, Evidence/Isolation은 `SecurityAudit`/`Db` 재사용, Portfolio는 PM/상위 Part 참조. 코드 변경 0. 실행 불가(선행 인증+조직 종속).
