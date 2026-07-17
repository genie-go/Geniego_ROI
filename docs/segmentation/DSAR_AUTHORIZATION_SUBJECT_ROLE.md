# DSAR — Subject-Role Assignment (§18)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_SUBJECT_ROLE`
subject_role_id · authorization_subject_id · role_id · **tenant_id · workspace_id · organization_id · legal_entity_id · environment · program_scope · provider_account_scope · assigned_by · assignment_reason · approval_reference** · valid_from/to · status · evidence

## 규칙
- **§4.9 Role ≠ Scope** — `REBATE_PROGRAM_MANAGER` 를 보유해도 **허용된 Tenant·Workspace·Brand·Country·Legal Entity·Program Scope 에서만** 권한 행사.
- **valid_to 경과 = 즉시 차단**(`AUTHORIZATION_ROLE_ASSIGNMENT_EXPIRED`) · **Expired Assignment 로 접근 지속 = Critical Gap**(§43).
- **Revoked Role 로 기존 Session 접근 지속 = Critical Gap** → Cache 무효화(§43·5-6).
- assigned_by · assignment_reason · approval_reference · Evidence **필수**(무근거 부여 금지).
- **상세 Assignment / Delegation / JIT / Time-bound = 5-4 · 5-5**(본 블록은 Foundation 만).
