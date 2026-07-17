# DSAR — Role-Permission Binding (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_ROLE_PERMISSION`
role_permission_id · role_id · permission_id · **effect · scope_limitation · condition_reference · field_access_profile · inherited · inherited_from_role** · valid_from/to · status · evidence

## 실측
**현행 정본** = `acl_permission`(메뉴 × 8동작 매트릭스·TeamPermissions.php:15) + team_role 위계 → **Role-Permission Binding 의 실 기반**(재사용).

## 규칙
- **Role Inheritance 는 제한적 지원 · 순환 관계 차단**(§17).
- Binding 에 **scope_limitation 필수** — Role 이 광범위해도 **Scope 로 제한**(§4.9).
- effect 에 **DENY 지원**(Explicit Deny 우선·§4.2).
- **Role 이름 기반 분기 코드 금지** — 반드시 Binding 조회.
