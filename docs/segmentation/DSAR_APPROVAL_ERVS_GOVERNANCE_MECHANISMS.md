# DSAR — ERVS Governance Mechanisms (Part 3-29 §26~§35)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §26 Runtime Guard — 차단 대상
Validation Bypass · Invalid Reference · Unapproved Architecture · Missing Critical Evidence · Failed Security Validation · Unsupported Runtime.
- 판정 **ABSENT-formal**. 검증 우회 차단은 기존 배포 파이프라인(`deploy.yml`) 게이트·`index.php` RBAC 위에 배치(신규 게이트 신설 금지). Missing Evidence=Evidence 완전성(§23) 미충족 시 인증 거부.

## §27 Static Lint — 탐지 대상
Missing Validation Rule · Invalid Assertion · Orphan Requirement · Hardcoded Baseline · Missing Evidence · Incomplete Coverage.
- **PARTIAL**. 현 pre-commit 게이트(php -l·자격증명·sacred SHA·라우트 정합·정적자산)를 확장. Incomplete Coverage=E2E 119라우트 자동도출 커버리지 승격.

## §28 Error Contract
VALIDATION_FAILED · REFERENCE_CONFORMANCE_FAILED · SECURITY_VALIDATION_FAILED · COMPLIANCE_VALIDATION_FAILED · PERFORMANCE_VALIDATION_FAILED · DEPLOYMENT_VALIDATION_FAILED · CERTIFICATION_DENIED. — 순신설(에러코드 상수 부재).

## §29 Warning Contract
Validation Coverage Low · Architecture Deviation · Runtime Warning · Compliance Gap · Certification Near Expiration. — 순신설.

## §30 API (최소 8)
Execute Validation Suite · Query Validation Status · Compare Validation Result · Export Validation Report · Query Validation Analytics · Generate Validation Certificate · Validate Architecture · Validate Runtime.
- **ABSENT**. 최신 버전 프리픽스 아래 신설·`routes.php`+`index.php` bypass 규약(신규 실배선 `/api` 접두·[[reference_api_prefix_routing]]). Certificate 발급=admin 게이트(requirePlan('admin')).

## §31 Database Constraint
Immutable Validation History · Validation Result Integrity · Evidence Integrity · Snapshot Integrity · Tenant Isolation.
- Immutable/Evidence = `SecurityAudit::verify` 재사용(신규 체인 금지). Isolation = `Db.php`. Result/Snapshot 무결성=버전+체인. 나머지 테이블 순신설.

## §32 Index
Validation · Requirement · Assertion · Result · Evidence · Snapshot. — §31 테이블 종속·테넌트 선도키 권장.

## §33 성능 요구사항
Full Validation ≤20분 · Incremental ≤2분 · Architecture ≤30초 · Runtime ≤10초 · Availability ≥99.999%. — 현 E2E smoke는 수분(참조)·통합 Orchestrator 신설 후 측정.

## §34 테스트
Unit/Integration/Performance(100k Rules·10k Concurrent·1B Assertions)/Security(Validation Tampering·Evidence Manipulation·Cross-Tenant·Certificate Forgery)/Compliance(ISO 27001·42001·NIST·SOC2·PCI DSS)/Regression 매트릭스. 순신설.

## §35 Completion Gate
32 구성요소 구축 + Performance Benchmark 통과 + Enterprise Validation Certification 통과 + Regression 100%.
- **현재 게이트 미충족**(형식 엔티티 ABSENT/PARTIAL·코드 0). BLOCKED_PREREQUISITE=선행 Part1~3-28 인증.

## 종합 판정
전 메커니즘 **ABSENT-formal/PARTIAL** — Static Lint/Runtime Guard는 pre-commit/CI/RBAC 확장, Evidence/Isolation은 `SecurityAudit`·`Db` 재사용, Compliance/Runtime Validator는 `Compliance`·`Health` 승격. 코드 변경 0. 실행 불가(선행 인증 종속).
