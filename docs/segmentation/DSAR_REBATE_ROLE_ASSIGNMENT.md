# DSAR — Role Assignment (§25)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — 필수 필드
role_assignment_id·**authorization_subject_id**·rebate_role_id·**role_version_id**·assignment_type·assignment source·tenant_id·workspace_id·organization_id·department_id·team_id·group_id·**legal_entity_ids**·brand_ids·merchant_ids·vendor_ids·partner_ids·program_ids·contract references·country/region/environment scope·provider account scope·**financial threshold**·field access profile·assigned_by·requested_by·approved_by·**business justification**·ticket reference·**valid_from·valid_to**·review_at·**last_used_at**·status·evidence.

## 🔴 실측 — Assignment 3계통 REAL, 그러나 Scope·Validity 가 없다
| 계통 | Scope | Validity |
|---|---|---|
| `team_role`(`TeamPermissions.php:13/17`) | team 단위 | ❌ **없음** |
| `api_key`(`Db.php:942-955`) | tenant + scopes_json | ✅ **`expires_at` REAL** · **`last_used_at`·`use_count` REAL** |
| `sso_group_role_map`(`EnterpriseAuth.php:70`) | tenant + group | ❌ **없음** |

## 🔴 핵심 발견 — api_key 는 이미 계약의 절반을 만족한다
`expires_at`(Validity) · `last_used_at`+`use_count`(**Usage §42 · Dormant 탐지 §44 원재료**) · `is_active` · `scopes_json`.
**5-7이 이미 지적**: Dormant 탐지를 **새 필드 없이** api_key 로 할 수 있다. **단 인간 Subject 에는 `last_used_at` 이 없다.**

**Assignment Type(13)**: DIRECT · GROUP_BASED · ORGANIZATION_INHERITED · TENANT_INHERITED · WORKSPACE_INHERITED · ROLE_HIERARCHY_INHERITED · TEMPORARY · CONDITIONAL · SYSTEM_MANAGED · **SCIM_MANAGED** · API_MANAGED · MIGRATED · EMERGENCY_REFERENCE.

## 분류
api_key = **VALIDATED_LEGACY(재사용 강제·Validity/Usage 기반)** · team_role·sso_group_role_map = **CONSOLIDATION_REQUIRED**(Scope·Validity 부재) · 통합 Assignment = **NOT_APPLICABLE → 신설**.
