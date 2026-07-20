# DSAR — 테스트 매트릭스 계약 (Part 3-16 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §34)

Fabric 은 6개 테스트 계층을 100% 통과해야 한다:

- **T-1 Unit** — Control Plane / Data Plane / Routing / Sync / Failover.
- **T-2 Integration** — RBAC · PDP · PEP · Zero Trust · AI Governance · Observability · Compliance.
- **T-3 Performance** — 1M Decisions/sec · 100 Regions · 10K Nodes · 1B Policies.
- **T-4 Security** — Split-Brain · Tampering · Region Isolation · Cache Poisoning · Cross-Tenant.
- **T-5 Compliance** — ISO 27001 · SOC2 · NIST Zero Trust · CIS · PCI DSS.
- **T-6 Regression** — Part1~3-15 전 계약 무후퇴.

## 2. 라이브 substrate 매핑

| 테스트 계층 | 실 substrate | 상태 |
|---|---|---|
| T-1 Unit | Control/Data Plane·Routing·Sync·Failover 구현 ABSENT → 테스트 대상 없음 | **미구현** |
| T-2 Integration(RBAC) | 라이브 RBAC = viewer<connector<analyst<admin `index.php:423-461`·`:99-122` — 회귀 대상 존재 | 부분 대상 실재 |
| T-4 Security(Cross-Tenant) | 크로스테넌트 위조 차단 `index.php:614-619` — 보안 테스트 표적 실재 | 부분 대상 실재 |
| T-4 Security(Tampering) | SecurityAudit 해시체인 `SecurityAudit.php:4-33`·verify(`:35-40`) — 변조탐지 테스트 표적 | 부분 대상 실재 |
| T-3 Performance | 측정 대상 fabric 부재(§33) | **미구현** |
| T-5 Compliance | 인증 프레임워크 매핑 대상 fabric 부재 | **미구현** |
| T-6 Regression | Part1~3-15 = 설계 DSAR(코드 0) → 회귀 baseline 미존재 | **미구현** |
| 실행 하네스 | 저장소에 구성된 lint/test 스크립트 없음(수동 검증) | 테스트 러너 ABSENT |

## 3. 설계 계약(신설 시)

- T-2/T-4 중 **라이브 표적이 실재하는 항목**(RBAC `index.php:423-461`, Cross-Tenant `index.php:614-619`, Tampering `SecurityAudit.php:4-33`·`:35-40`)은 fabric 신설 전이라도 현 모놀리스에 대한 회귀 테스트로 우선 정의 가능.
- T-1/T-3/T-5 는 Control/Data Plane·다중 리전·정책 스케일 substrate 가 실재해야 대상이 생긴다(§31~§33 종속).
- T-6 Regression 은 Part1~3-15 가 **설계 DSAR(코드 0)** 이므로 실행 가능한 회귀 baseline 이 아직 없다 — 실 구현 인증 후 baseline 확정.
- 테스트 러너 자체가 저장소에 부재하므로, 실 구현 세션은 하네스 도입을 선행 항목으로 포함해야 한다.

## 4. 판정

**미구현.** Fabric 구현이 없어 Unit/Performance/Compliance/Regression 대상이 부재하다. 다만 Integration(RBAC `index.php:423-461`)·Security(Cross-Tenant `index.php:614-619`·Tampering `SecurityAudit.php:4-33`)의 일부 표적은 라이브에 실재해 우선 회귀화 가능. 회귀 대상 전체 = Part1~3-15(현재 코드 0 설계물). 실 구현 세션 조건.

NOT_CERTIFIED · 코드 변경 0 · BLOCKED_PREREQUISITE.
