# DSAR — Authorization Policy (§21)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_POLICY`
authorization_policy_id · **policy_code · policy_name · policy_type · target_resource_types · target_actions · policy_effect · priority · tenant_scope · environment_scope · default_deny · active_version · owner** · status · valid_from/to · evidence

## 실측
**중앙 Policy 클래스는 `PlanPolicy` 하나뿐**(`const RANK` · **기능키→최소 요구 플랜 매핑**·PlanPolicy.php:19-24/41) → **Policy Registry 의 실 기반(재사용)**.
**부재** = Policy Registry · Policy Version · Rule · Condition · Effect · Conflict · **중앙 PDP**.

## 규칙
- **default_deny = true 기본**(§4.1 Deny-by-default).
- **RBAC·ABAC·PBAC 를 경쟁 모델로 만들지 말고 단일 Canonical Contract 로 조합**(§5).
- **★PlanPolicy 를 대체하지 말고 편입**(중복 Policy Store 신설 금지·§51).
- **★UI 동기화 위험**: PlanPolicy.php:14 "프론트 PLAN_TIER_RANK / MENU_MIN_PLAN 과 정합 유지(**변경 시 양쪽 동시 갱신**)" — 수동 동기화 → **UI_API_MISMATCH Reconciliation 대상**(286차 rank 맵 붕괴 사고로 드리프트 실현).
