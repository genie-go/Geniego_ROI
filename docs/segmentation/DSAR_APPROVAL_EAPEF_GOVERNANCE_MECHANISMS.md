# DSAR — EAPEF Governance Mechanisms (Part 3-30 §23~§32)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §23 Runtime Guard — 차단 대상
Unsafe Deployment · SLO Violation Deployment · Error Budget Exhaustion · Unauthorized Operational Change · Critical Capacity Exhaustion · Production Policy Bypass.
- 판정 **ABSENT-formal**. Unsafe/SLO Deployment 차단은 기존 배포 파이프라인(`deploy.yml` 게이트)·`index.php` RBAC 위 배치(신규 게이트 신설 금지). Error Budget=SLO(§5) 신설 후 계산.

## §24 Static Lint — 탐지 대상
Missing Runbook · Missing SLO · Missing Rollback Plan · Incomplete Monitoring · Invalid Capacity Threshold · Missing Operational Owner.
- **ABSENT**. pre-commit/CI 확장 대상. Missing Rollback=Part3-25 Rollback Readiness 정합(schema rollback만 실재).

## §25 Error Contract
PRODUCTION_HEALTH_CRITICAL · RELIABILITY_THRESHOLD_FAILED · ERROR_BUDGET_EXHAUSTED · OPERATIONAL_BASELINE_INVALID · SERVICE_LEVEL_BREACH · CAPACITY_LIMIT_EXCEEDED · OPERATIONAL_EXCELLENCE_FAILED. — 순신설.

## §26 Warning Contract
Reliability Decreasing · Error Budget Low · Capacity Trending High · MTTR Increasing · Automation Coverage Below Target. — 순신설.

## §27 API (최소 8)
Query Production Health · Query Reliability Score · Execute Operational Assessment · Export Production Report · Query Capacity Forecast · Register Improvement Action · Query Analytics · Validate Operational Baseline.
- **ABSENT**. 최신 버전 프리픽스 아래 신설·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). Production Health/Executive Dashboard=admin 게이트(requirePlan('admin')·`SystemMetrics` 공개 metrics는 비밀 미포함 유지).

## §28 Database Constraint
Immutable Incident History · Operational Evidence Integrity · Reliability Score History · Production Baseline Integrity · Tenant Isolation.
- Immutable/Evidence = `SecurityAudit::verify` 재사용(신규 체인 금지). Isolation = `Db.php`. Reliability/Baseline 무결성=버전+체인. 나머지 테이블 순신설.

## §29 Index
Incident · Reliability · Health · Capacity · Performance · Improvement. — §28 테이블 종속·테넌트 선도키 권장.

## §30 성능 요구사항
Production Health Calculation ≤5초 · Reliability Assessment ≤30초 · Capacity Forecast ≤60초 · Dashboard Refresh ≤10초 · Availability ≥99.999%. — 벤치 대상 미존재(엔티티 신설 후 측정).

## §31 테스트
Unit/Integration/Performance(1k Clusters·100k Services·10M Daily Decisions)/Security(Unauthorized Operational Change·Incident Evidence Tampering·Cross-Tenant·Dashboard Privilege Escalation)/Compliance(ISO 27001·20000-1·SRE·ITIL 4·NIST)/Regression 매트릭스. 순신설.

## §32 Completion Gate
26 구성요소 구축 + Performance Benchmark 통과 + Production Excellence Certification 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 엔티티 ABSENT/PARTIAL·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-29 인증.

## 종합 판정
전 메커니즘 **ABSENT-formal/PARTIAL** — Runtime Guard/Static Lint는 deploy/CI/RBAC 확장, Evidence/Isolation은 `SecurityAudit`·`Db` 재사용, Health/Incident/Baseline은 `Health`/`Alerting`/`Db` 승격. 코드 변경 0. 실행 불가(선행 인증 종속).
