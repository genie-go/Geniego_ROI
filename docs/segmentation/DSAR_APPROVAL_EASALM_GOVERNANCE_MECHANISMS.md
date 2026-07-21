# DSAR — EASALM Governance Mechanisms (Part 3-33 §23~§32)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §23 Runtime Guard — 차단 대상
Unapproved Architecture Deployment · Standard Violation · Missing ADR · Unsupported Pattern · Architecture Policy Bypass · Compliance Violation.
- 판정 **PARTIAL**. Missing ADR/Standard Violation 차단은 기존 변경게이트(`docs/CHANGE_GATE.md`)·pre-commit 게이트·`index.php` RBAC 위 배치(신규 게이트 신설 금지). ★현재 CHANGE_GATE는 문서형 규율(강제 자동화는 pre-commit 일부).

## §24 Static Lint — 탐지 대상
Missing ADR · Circular Dependency · Invalid Pattern Usage · Architecture Drift · Missing Architecture Owner · Incomplete Review.
- **PARTIAL**. Circular Dependency=`AdminMenu` wouldCycle·`PM/Dependencies.php` DFS 알고리즘 재사용. Missing ADR=본 DSAR 파이프라인 규율 형식화. pre-commit 확장.

## §25 Error Contract
ARCHITECTURE_REVIEW_FAILED · ADR_NOT_FOUND · ARCHITECTURE_STANDARD_VIOLATION · DEPENDENCY_ANALYSIS_FAILED · IMPACT_ANALYSIS_INVALID · ARCHITECTURE_COMPLIANCE_FAILED · ARCHITECTURE_DEPLOYMENT_DENIED. — 순신설(에러코드 상수 부재).

## §26 Warning Contract
Architecture Drift Increasing · Technical Debt Growing · Review Overdue · Pattern Deprecated · Standard Update Required. — 순신설.

## §27 API (최소 8)
Register Architecture · Submit Architecture Review · Query ADR · Execute Impact Analysis · Validate Compliance · Export Architecture Package · Query Analytics · Compare Architecture Versions.
- **ABSENT**. 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). Submit Review/Register Architecture=admin 게이트(requirePlan('admin')).

## §28 Database Constraint
Immutable ADR History · Architecture Version Integrity · Dependency Graph Integrity · Compliance Evidence Integrity · Tenant Isolation.
- Immutable ADR = git 이력(불변) + (형식화 시) `SecurityAudit::verify` 체인. Isolation = `Db.php`. Version/Dependency 무결성=버전+체인. 나머지 테이블 순신설.

## §29 Index
Architecture · ADR · Review · Dependency · Snapshot · Compliance. — §28 테이블 종속·테넌트 선도키 권장.

## §30 성능 요구사항
Architecture Review Submission ≤3초 · Impact Analysis ≤20초 · Dependency Graph Query ≤2초 · Architecture Comparison ≤10초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §31 테스트
Unit/Integration(Continuous Innovation·Reference Architecture·Validation Suite·Governance Mesh·Digital Twin·Knowledge Graph)/Performance(100k Assets·1M Dependencies·500k ADR·10k Concurrent Reviews)/Security(Unauthorized Architecture Change·ADR Tampering·Dependency Graph Manipulation·Cross-Tenant·Review Approval Bypass)/Compliance(ISO 42010·TOGAF·ISO 27001·COBIT 2019·NIST)/Regression 매트릭스. 순신설.

## §32 Completion Gate
26 구성요소 구축 + Performance Benchmark 통과 + Architecture Lifecycle Validation 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 런타임 엔티티 ABSENT/PARTIAL·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-32 인증.

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-formal** — Runtime Guard/Static Lint는 CHANGE_GATE/pre-commit/RBAC·wouldCycle 알고리즘 확장, Immutable ADR은 git+`SecurityAudit` 재사용, Isolation은 `Db.php`. 형식 런타임 ARB/Impact/Analytics는 순신설. 코드 변경 0. 실행 불가(선행 인증 종속).
