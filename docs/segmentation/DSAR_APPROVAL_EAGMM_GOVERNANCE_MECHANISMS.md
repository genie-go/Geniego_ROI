# DSAR — EAGMM Governance Mechanisms (Part 3-28 §24~§33)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §24 Runtime Guard — 차단 대상
Invalid Assessment · Unauthorized Score Modification · Missing Evidence · Incomplete Benchmark · False Certification Claim.
- 판정 **ABSENT-formal**. Score/Certification 변조 차단은 기존 `index.php` RBAC(admin gate)·`UserAuth::guardTeamWrite` 위에 배치(신규 게이트 신설 금지). False Certification=Evidence 완전성(§18) 미충족 시 차단.

## §25 Static Lint — 탐지 대상
Missing Capability Mapping · Undefined Assessment · Missing Improvement Plan · Incomplete Evidence · Duplicate Benchmark · Invalid Weight Definition.
- **ABSENT**. CI(pre-commit·`security-scan.yml`) 확장 대상. 특히 Invalid Weight/Duplicate Benchmark=스코어 신뢰성 게이트.

## §26 Error Contract
MATURITY_ASSESSMENT_FAILED · CAPABILITY_MODEL_INVALID · BENCHMARK_UNAVAILABLE · TARGET_STATE_INVALID · IMPROVEMENT_PLAN_INCOMPLETE · CERTIFICATION_READINESS_FAILED · SCORE_CALCULATION_ERROR. — 순신설(에러코드 상수 부재).

## §27 Warning Contract
Governance Maturity Declining · Domain Score Below Threshold · Improvement Delayed · Certification Readiness Reduced · Technical Debt Increasing. — 순신설.

## §28 API (최소 8)
Execute Assessment · Query Maturity Score · Compare Benchmark · Generate Improvement Roadmap · Query Executive Scorecard · Export Assessment · Query Analytics · Validate Target State.
- **ABSENT**. 최신 버전 프리픽스 아래 신설·`routes.php` 등록+`index.php` bypass 규약 준수(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). Executive Scorecard/Certification=admin 게이트(requirePlan('admin')).

## §29 Database Constraint
Immutable Assessment History · Score Version Integrity · Benchmark Integrity · Evidence Integrity · Tenant Isolation.
- Immutable/Evidence Integrity = `SecurityAudit::verify` 재사용(신규 체인 금지). Tenant Isolation = `Db.php` 재사용. Score/Benchmark 무결성=버전 컬럼+체인. 나머지 테이블 순신설.

## §30 Index
Assessment · Capability · Domain · Benchmark · Snapshot · Score. — §29 테이블 종속. 테넌트 컬럼 선도키 권장.

## §31 성능 요구사항
Full Assessment ≤10분 · Benchmark Comparison ≤15초 · Executive Scorecard ≤5초 · Analytics Refresh ≤30초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §32 테스트
Unit/Integration/Performance/Security(Score Manipulation·Benchmark Poisoning·Cross-Tenant)/Compliance(ISO 27001·42001·COBIT·CMMI·NIST CSF)/Regression 매트릭스(SPEC §32). 순신설.

## §33 Completion Gate
26 구성요소 구축 + Performance Benchmark 통과 + Governance Maturity Validation 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 엔티티 ABSENT/PARTIAL·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-27 인증.

## 종합 판정
전 메커니즘 **ABSENT-formal**(순신설) — 단 Evidence/Isolation은 `SecurityAudit`·`Db` 재사용, Runtime Guard/API는 기존 RBAC·CI 확장, Control/Certification은 `Compliance.php` 승격. 코드 변경 0. 실행 불가(선행 인증 종속).
