# DSAR — Subject Binding (§8)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_SUBJECT_BINDING`
subject_binding_id · authorization_subject_id · **binding_type** · canonical_entity_id · binding_role · source · **primary · inherited** · valid_from/to · status · evidence

## Binding Type (17)
Tenant · Workspace · Team · Department · Organization · **Legal Entity** · Brand · Store · Merchant · Vendor · Partner · Country · Region · **Environment** · **Provider Account** · Contract · **Rebate Program**

## 실측
REAL = Tenant(`auth_tenant` 주입·`authedTenant` 64핸들러) · Team(team_role) · Brand/Store 등 일부(DATA_SCOPES 9).
부재 = **Legal Entity · Environment(권한) · Provider Account · Contract · Rebate Program** 바인딩.

## 규칙
**Binding 만료(valid_to) 경과 시 즉시 차단**(§45 Subject Binding Expired) · inherited 명시 · **Cross-Tenant Binding 금지**.
