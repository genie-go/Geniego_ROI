# DSAR — 테스트 매트릭스 계약 (Part 3-17 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §35)

Compliance 는 6개 테스트 계층을 100% 통과해야 한다:

- **T-1 Unit** — Control Mapping · Assessment · Gap · Attestation · Reporting.
- **T-2 Integration** — RBAC · PDP · PEP · Zero Trust · AI Governance · Observability · Fabric.
- **T-3 Performance** — 100K Controls · 10K Regulations · 1B Evidence · 1K Concurrent.
- **T-4 Security** — Evidence Tampering · Fake Attestation · Unauthorized Exception · Control Bypass · Cross-Tenant.
- **T-5 Compliance** — ISO 27001 · SOC2 · PCI DSS · SOX · GDPR · HIPAA · NIST CSF.
- **T-6 Regression** — Part1~3-16 전 계약 무후퇴.

## 2. 라이브 substrate 매핑

| 테스트 계층 | 실 substrate | 상태 |
|---|---|---|
| T-1 Unit | Control Mapping·Assessment·Gap·Attestation·Reporting 구현 ABSENT → 테스트 대상 없음 | **미구현** |
| T-2 Integration(RBAC) | 라이브 RBAC·감사 스코프 서버도출 `Compliance.php:198-209` — 회귀 대상 존재 | 부분 대상 실재 |
| T-4 Security(Evidence Tampering) | SecurityAudit 해시체인 `SecurityAudit.php:14-68`·`verify()` `:56-68` — 변조탐지 테스트 표적 실재 | **부분 대상 실재** |
| T-4 Security(Cross-Tenant) | 크로스테넌트 위조 차단 `index.php:600-619`·감사 스코프 `Compliance.php:200-206` — 보안 테스트 표적 실재 | **부분 대상 실재** |
| T-4 Security(Fake Attestation/Unauthorized Exception/Control Bypass) | attestation/exception/control 프레임워크 부재 | **미구현** |
| T-3 Performance | 측정 대상 compliance 프레임워크 부재(§34) | **미구현** |
| T-5 Compliance | ISO/SOC2/PCI/SOX/GDPR/HIPAA/NIST 매핑 대상 control/regulation 테이블 부재 | **미구현** |
| T-6 Regression | Part1~3-16 = 설계 DSAR(코드 0) → 회귀 baseline 미존재 | **미구현** |
| 실행 하네스 | 저장소 구성 lint/test 스크립트 없음(수동 검증) | 테스트 러너 ABSENT |

## 3. 설계 계약(신설 시)

- T-4 중 **라이브 표적이 실재하는 항목**(Evidence Tampering `SecurityAudit.php:56-68`, Cross-Tenant `index.php:600-619`·`Compliance.php:200-206`)과 T-2 RBAC/감사스코프(`Compliance.php:198-209`)는 프레임워크 신설 전이라도 현 모놀리스에 대한 회귀 테스트로 우선 정의 가능.
- T-1/T-3/T-5 및 T-4 의 나머지(Fake Attestation·Unauthorized Exception·Control Bypass)는 Control/Assessment/Attestation/Exception substrate 가 실재해야 대상이 생긴다(§32~§34 종속).
- T-6 Regression 은 Part1~3-16 이 **설계 DSAR(코드 0)** 이므로 실행 가능한 회귀 baseline 이 아직 없다 — 실 구현 인증 후 baseline 확정.
- 테스트 러너 자체가 저장소에 부재하므로 실 구현 세션(RP-track)이 하네스 도입을 선행 항목으로 포함해야 한다.

## 4. 판정

**미구현.** compliance 프레임워크가 없어 Unit/Performance/Compliance/Regression 및 대부분의 Security 대상이 부재하다. 다만 Security(Evidence Tampering `SecurityAudit.php:14-68`·`:56-68`, Cross-Tenant `index.php:600-619`)·Integration(RBAC `Compliance.php:198-209`)의 일부 표적은 라이브에 실재해 우선 회귀화 가능. 회귀 대상 전체 = Part1~3-16(현재 코드 0 설계물). 실 구현 세션 조건.

NOT_CERTIFIED · 코드 변경 0 · BLOCKED_PREREQUISITE.
