# DSAR — EACIF Governance Mechanisms (Part 3-32 §23~§32)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §23 Runtime Guard — 차단 대상
Unauthorized Feature Activation · Expired Feature Flag Usage · Unapproved Pilot Promotion · Missing Rollback Strategy · Innovation Policy Bypass · High Risk Rollout.
- 판정 **ABSENT-formal**. Unauthorized Feature Activation 차단은 기존 plan 게이트(`PlanPolicy`)·`index.php` RBAC·`deploy.yml` 위 배치(신규 게이트 신설 금지). Expired Flag=Feature Flag Governance(§15) expiration 신설 후.

## §24 Static Lint — 탐지 대상
Missing Success Criteria · Missing Feature Owner · Missing Rollback Plan · Stale Feature Flag · Incomplete Business Case · Missing KPI Definition.
- **ABSENT**. pre-commit/CI 확장. Stale Feature Flag=flag 형식화 후 만료 검사. Missing Rollback=Part3-25 Rollback Readiness 정합.

## §25 Error Contract
INNOVATION_APPROVAL_FAILED · EXPERIMENT_VALIDATION_FAILED · FEATURE_FLAG_INVALID · PILOT_PROMOTION_DENIED · KPI_TARGET_NOT_MET · BUSINESS_VALUE_UNVERIFIED · ROLLOUT_VALIDATION_FAILED. — 순신설.

## §26 Warning Contract
Innovation Backlog Growing · Pilot Exceeding Duration · KPI Trending Down · Feature Flag Near Expiration · Innovation ROI Below Target. — 순신설.

## §27 API (최소 8)
Register Innovation · Query Innovation Status · Start Experiment · Promote Pilot · Query KPI · Export Innovation Report · Query Analytics · Validate Rollout.
- **ABSENT**(단 Start Experiment=`AbTesting` 재사용). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). Promote Pilot/Production Approval=admin 게이트(requirePlan('admin')).

## §28 Database Constraint
Immutable Innovation History · Experiment Integrity · KPI Integrity · Evidence Integrity · Tenant Isolation.
- Immutable/Evidence = `SecurityAudit::verify` 재사용(신규 체인 금지). Isolation = `Db.php`. Experiment/KPI 무결성=버전+체인. 나머지 테이블 순신설.

## §29 Index
Idea · Experiment · Pilot · Feature Flag · KPI · Snapshot. — §28 테이블 종속·테넌트 선도키 권장.

## §30 성능 요구사항
Idea Registration ≤2초 · Experiment Initialization ≤30초 · KPI Calculation ≤10초 · Analytics Refresh ≤30초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §31 테스트
Unit/Integration(Global Operations·Production Excellence·Validation Suite·Governance Mesh·AI Governance)/Performance(500k Ideas·100k Experiments·50k Feature Flags)/Security(Unauthorized Feature Activation·Experiment Manipulation·Cross-Tenant Feature Exposure·KPI Tampering)/Compliance(ISO 56002·27001·NIST·SOC2·ITIL 4 CI)/Regression 매트릭스. 순신설.

## §32 Completion Gate
26 구성요소 구축 + Performance Benchmark 통과 + Continuous Innovation Validation 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 엔티티 ABSENT/PARTIAL·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-31 인증.

## 종합 판정
전 메커니즘 **ABSENT-formal/PARTIAL** — Runtime Guard/Static Lint는 plan 게이트/CI/RBAC 확장, Evidence/Isolation은 `SecurityAudit`·`Db` 재사용, Start Experiment API는 `AbTesting` 재사용. 코드 변경 0. 실행 불가(선행 인증 종속).
