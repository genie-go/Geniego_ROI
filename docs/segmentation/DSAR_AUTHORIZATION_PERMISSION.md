# DSAR — Authorization Permission (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md](CANONICAL_DSAR_AUTHORIZATION_FOUNDATION.md) · [CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md](CANONICAL_DSAR_AUTHORIZATION_POLICY_DECISION.md) · ADR: [ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_PERMISSION_RBAC_ABAC_PBAC_FOUNDATION.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=후속 승인 세션.

## Entity `AUTHORIZATION_PERMISSION`
authorization_permission_id · **permission_code · resource_type · action · scope_template · condition_template · field_access_profile · default_effect · risk_level · production_restricted · financial_approval_required · PII_clearance_required · MFA_required · deprecated** · valid_from/to · version · status · evidence

## 실측 — 현행 Permission 2계통
| 현행 | 대상 | 분류 | 근거 |
|---|---|---|---|
| **`acl_permission`** = 메뉴 × **8동작** 매트릭스 | 인간(team) | **CANONICAL_AUTHORIZATION_PERMISSION**(승격·재사용) | TeamPermissions.php:15 |
| **`scopes_json`**(`admin:keys`·`write:*`·`write:ingest`) + roleRank fallback | **API_CLIENT** | **KEEP_SEPARATE**(용도 상이) + Canonical 상위 통합 | index.php:562-575 |

## 규칙
- **Permission 은 Resource Type × Action × Scope × Condition × Field Access 조합** — **Role 이름으로 하드코딩 금지**(§44 Lint).
- **Rebate Resource×Action 을 기존 `acl_permission` 매트릭스에 등록**(중복 Permission Store 신설 금지).
- **★192차 교훈**: 새 Permission 게이트 작성 시 **`/api` 별칭 변형도 동시 매칭**(미매칭 시 권한상승 우회·index.php:562-567).
