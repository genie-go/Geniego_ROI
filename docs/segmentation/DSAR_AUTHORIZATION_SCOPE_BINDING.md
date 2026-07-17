# DSAR — Scope Binding (§26)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_SCOPE_BINDING`
scope_binding_id · **binding_target_type**(Subject / Role / Permission / Policy / Resource) · binding_target_id · authorization_scope · **effect · priority · inherited_from · override** · valid_from/to · status · evidence

## 규칙
- **§4.9 Role ≠ Scope** — Role 이 넓어도 Scope Binding 이 실효 범위를 결정.
- **override 는 명시 기록**(부모 Scope 무조건 상속 금지).
- Subject Scope ∩ Resource Scope 불일치 = **차단**(§32 평가 순서 ⑨⑩).
- **Cross-Tenant Scope Binding 금지**(§43 Critical).
