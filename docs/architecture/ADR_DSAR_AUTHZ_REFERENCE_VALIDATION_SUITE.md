# ADR — Enterprise Authorization Reference Validation Suite (Part 3-29)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_29_REFERENCE_VALIDATION_SUITE_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_ERVS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ERVS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-29는 전 구현을 표준 기준에 자동 검증하는 ERVS를 규정한다. 본 ADR은 설계 결정과 현행 substrate(검증 자산이 비교적 많음) 대비 판정을 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (형식 Enterprise Reference Validation 순신설)**: 통합 Validation Registry/Orchestrator·아키텍처 conformance·PDP/PEP/Zero Trust/Digital Twin/Knowledge Graph/Governance Mesh Validator·Validation Certificate는 신설(grep 0).
- **D-2 (PARTIAL substrate 재사용·러너 난립 금지)**:
  - Runtime/Architecture Validation → E2E smoke(`tools/e2e`·`render.mjs`·119라우트 자동도출·무음사망 탐지) 승격([[reference_e2e_smoke]]).
  - Security/Deployment Validation → CI(`deploy.yml`·`security-scan.yml` composer audit/CodeQL) 통합.
  - Static Lint → pre-commit 게이트(php -l·자격증명·sacred SHA·라우트 정합) 확장.
  - Runtime Validator → Health/SystemMetrics probe 재사용. Compliance Validator → `Compliance.php` readiness.
  - Evidence Integrity → `SecurityAudit::verify` 재사용. Tenant Isolation → `Db.php`.
- **D-3 (Validation History Immutable)**: 검증 결과/스코어/인증 이력=append-only+무결성. SecurityAudit 확장.
- **D-4 (Certification 게이트)**: Validation Certificate 발급/조회=admin 게이트(`requirePlan('admin')`) 위 배치. False Certification=Evidence 완전성 미충족 시 차단.
- **D-5 (무후퇴)**: 기존 E2E smoke/CI/pre-commit는 ERVS 신설 시 흡수·보존(중복 러너 신설 금지·매 배포 전후 실행 규율 유지).

## KEEP_SEPARATE (오흡수 금지)
- 기능 E2E smoke(가역 시나리오·계약가드) ≠ Enterprise Reference conformance(아키텍처/거버넌스 범위).
- CI vuln scan(composer audit/CodeQL·report-only) ≠ Security Validator 엔진.
- ModelMonitor drift ≠ Digital Twin Validator · GraphScore ≠ Knowledge Graph Validator · PM baseline ≠ Validation Baseline.

## 결과 (Consequences)
- 판정 = PARTIAL(E2E/CI/pre-commit/Health/Compliance substrate 실재·비교적 큼) / ABSENT-formal(통합 Orchestrator·Reference Assertion·PDP/PEP/Zero Trust/Digital Twin/KG/Mesh Validator·Certificate 순신설).
- 실행 순서: 선행 Part 인증 → Validation Registry+Orchestrator 신설 → E2E/CI/pre-commit/Health/Compliance 승격 배선 → Reference Assertion/Certificate → Analytics/Digest. 코드 0.
