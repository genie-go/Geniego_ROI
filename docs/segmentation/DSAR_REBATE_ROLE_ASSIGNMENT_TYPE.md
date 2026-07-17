# DSAR — Role Assignment Type (§25)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## Assignment Type (13)
DIRECT · GROUP_BASED · ORGANIZATION_INHERITED · TENANT_INHERITED · WORKSPACE_INHERITED · ROLE_HIERARCHY_INHERITED · TEMPORARY · CONDITIONAL · SYSTEM_MANAGED · SCIM_MANAGED · API_MANAGED · MIGRATED · EMERGENCY_REFERENCE.

## 실측 대응
| Type | 현행 |
|---|---|
| **DIRECT** | ✅ team_role 직접 부여 · api_key 발급 |
| **GROUP_BASED** | ✅ **REAL** — `sso_group_role_map` + `roleForGroups()`(`EnterpriseAuth.php:70/78`) |
| **SCIM_MANAGED** | ✅ **REAL** — `sso_config.scim_enabled`·`scim_token_hash`·`auto_provision` :59 · `scimJson()` :35 |
| **API_MANAGED** | ✅ api_key |
| 나머지 8 | ❌ 부재 |

## 🔴 Type 을 기록해야 하는 이유
**같은 권한이라도 출처가 다르면 회수 방법이 다르다.**
GROUP_BASED 는 **Group 제거로 사라져야** 하고(§28), DIRECT 는 **명시적 Revocation 이 필요**하다(§34).
**Type 없이 Assignment 만 있으면 회수 시 무엇을 건드려야 할지 알 수 없다.**

## 분류
GROUP_BASED·SCIM_MANAGED = **VALIDATED_LEGACY** · Type 축 자체 = **NOT_APPLICABLE → 신설**.
