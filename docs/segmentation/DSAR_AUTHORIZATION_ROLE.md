# DSAR — Authorization Role (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## 실측 — ★현행 Role 3계통 (CONSOLIDATION_REQUIRED)
| 계통 | 위계 | 근거 |
|---|---|---|
| **team_role** | owner > manager > member | TeamPermissions.php:17 · **★fail-open: 미설정=owner**(AdminMenu.php:52-54·MIGRATION_REQUIRED) |
| **api_key role** | `['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]` | index.php:554 |
| **admin master/sub** | master > sub | requireMasterAdmin2(5핸들러) · requireSubAdminMenu(286차) |

**★Role 을 4번째로 늘리지 말 것** — 3계통을 Canonical Role 로 통합하되 **실효 동작 보존**(Legacy Equivalence=5-8).

## Entity `AUTHORIZATION_ROLE`
authorization_role_id · **role_code · role_name · role_category · system_defined · custom_role · tenant_id · organization_id · default_scope · privilege_level · sensitive_role · production_role · assignable · delegable · approval_required** · valid_from/to · version · status · evidence

## Role Category (16)
SYSTEM · PLATFORM · TENANT · WORKSPACE · ORGANIZATION · FINANCE · OPERATIONS · PROGRAM · CLAIM · SETTLEMENT · PAYOUT · AUDIT · SECURITY · SUPPORT · PROVIDER · CUSTOM

## 규칙
**§4.9 Role ≠ Scope** · **Role 이름으로 권한 하드코딩 금지 — Role-Permission Binding 사용**(§44 Lint) · sensitive_role / production_role 은 **Time-bound + Approval Hook**(5-4·5-5).
