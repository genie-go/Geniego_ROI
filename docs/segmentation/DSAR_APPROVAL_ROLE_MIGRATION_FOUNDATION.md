# DSAR — Role Registry Migration Foundation (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity 설계)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Decision Core + Permission Engine 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **반날조 규율**: 모든 `file:line`은 위 2문서에서만 인용. 없으면 **ABSENT**. Role≠Permission≠Authority. 289차 폐기 `admin_roles`/`user_roles` 재부활·재플래그 금지.

---

## 1. 목적 (Purpose)

기존/외부의 **Legacy Role 표현**(DB role 컬럼·사용자유형·직급명·관리자 Boolean·IAM/LDAP/AD 그룹·JWT/OAuth/ERP/Workflow/UI role·subscription/permission/security profile)을 **Canonical Role Definition으로 마이그레이션(매핑)** 하는 엔티티를 설계 정본으로 정의한다.

★핵심 안전 원칙(Golden Rule): **Legacy `ADMIN`/`MANAGER`/`APPROVER`·plan god flag를 자동으로 활성(auto-grant)하지 않는다.** 모든 Legacy 원천은 semantic/permission/scope/actor eligibility/risk 등가성을 **분해·검증**한 뒤에만 매핑하며, 애매하면 `manual_review`·`REJECT`로 fail-closed. 순신규 — 현행에 Legacy→Canonical 매핑 계층 ABSENT(가장 근접했던 `admin_roles`/`user_roles`는 289차 폐기).

## 2. Canonical 필드 (Migration Mapping Record)

| 필드 | 설명 |
|---|---|
| migration_id | 마이그레이션 레코드 식별자 |
| source_type | 아래 §3 Legacy Source Type |
| source_role_code / source_role_name | 원천 role 코드·명칭 |
| source_permission | 원천 권한 표현 |
| source_scope_representation | 원천 scope 표현 |
| target_role / target_version | Canonical 대상 Role·버전 |
| semantic_equivalence | 의미 등가성 판정 |
| permission_equivalence / scope_equivalence / actor_eligibility_equivalence / risk_equivalence | 항목별 등가성 |
| migration_type | 아래 §3 매핑 유형 |
| mapping_confidence | 매핑 신뢰도(낮으면 manual_review 강제) |
| manual_review | 수동 검토 필요 여부(자동활성 차단) |

## 3. 열거형 (Enumerations)

**Legacy Source Type**: `DATABASE_ROLE` · `USER_TYPE` · `ACCOUNT_TYPE` · `ADMIN_BOOLEAN` · `MANAGER_BOOLEAN` · `APPROVER_BOOLEAN` · `JOB_TITLE` · `POSITION` · `DEPARTMENT_ROLE` · `IAM_GROUP` · `LDAP_GROUP` · `AD_GROUP` · `JWT_ROLE` · `OAUTH_ROLE` · `CLIENT_ROLE` · `ERP_ROLE` · `WORKFLOW_ROLE` · `UI_ROLE` · `FEATURE_ROLE` · `SUBSCRIPTION_ROLE` · `PERMISSION_PROFILE` · `SECURITY_PROFILE`

**Migration Type**: `ONE_TO_ONE` · `ONE_TO_MANY` · `MANY_TO_ONE` · `SPLIT` · `MERGE` · `RENAME` · `DEPRECATE` · `REJECT`

## 4. Substrate 매핑 (§5.2 + file:line) — 마이그레이션 소스 vs 폐기

| Legacy Source Type | 실존 substrate | file:line | 마이그레이션 소스 여부 |
|---|---|---|---|
| DATABASE_ROLE (team_role) | `app_user.team_role` | `UserAuth.php:188`·`TeamPermissions.php:120-131` | ★소스(CANONICAL_ROLE_REGISTRY_CANDIDATE) |
| CLIENT_ROLE (api_key role) | `api_key.role` | `Keys.php:95`·`index.php:573` | ★소스(API_CLIENT actor) |
| ACCOUNT_TYPE/ADMIN_BOOLEAN (admin_level) | `app_user.admin_level` master/sub | `UserAdmin.php:43-46` | ★소스(SUB_ROLE) |
| UI_ROLE (AdminMenu enum) | `menu_tree.required_role` | `AdminMenu.php:247`·rank `:74` | ★소스(CONSOLIDATION_REQUIRED) |
| IAM_GROUP/LDAP_GROUP/AD_GROUP (SSO) | `sso_group_role_map`·roleForGroups | `EnterpriseAuth.php:70-72,78-88` | ★소스(VALIDATED_IAM Adapter) |
| SUBSCRIPTION_ROLE (plan god flag) | `app_user.plan/plans`='admin' | `TeamPermissions.php:132`·`AuthContext.jsx:720` | ★소스이나 **god flag 자동활성 금지**(§6.5) |
| ADMIN_BOOLEAN/MANAGER_BOOLEAN/APPROVER_BOOLEAN (하드코딩) | isManager/isApprover | ABSENT(정직 부재) | 소스 없음(날조 금지) |
| JOB_TITLE / POSITION / DEPARTMENT_ROLE | job_title/jobTitle/HR position | ABSENT(정직 부재) | 소스 없음 |
| JWT_ROLE / OAUTH_ROLE / ERP_ROLE / WORKFLOW_ROLE / FEATURE_ROLE / PERMISSION_PROFILE / SECURITY_PROFILE | 해당 개념 | ABSENT | 순신규(외부 도입 시) |
| **admin_roles / user_roles** | 폐기 고아 테이블 | `routes.php:1670`·`UserAdmin.php:596-599` | **마이그레이션 대상 아님(재부활 금지)** |

## 5. 설계 원칙 (Design Principles)

- **★Legacy ADMIN/MANAGER/APPROVER·plan god flag 자동활성 금지(Golden Rule)**: `ADMIN_BOOLEAN`/`MANAGER_BOOLEAN`/`APPROVER_BOOLEAN`·`SUBSCRIPTION_ROLE`(plan='admin')는 자동 매핑으로 상위 권한을 부여하지 않는다. 모호 단독 Role(ADMIN/ALL_ACCESS) 자동활성 금지(§D-5). plan god flag는 Role/admin_level 기반으로 분리(§D-2 후속 정합).
- **분해·등가성 검증 후 매핑**: semantic/permission/scope/actor_eligibility/risk 등가성을 개별 판정. `mapping_confidence` 낮으면 `manual_review`=true·`REJECT` fail-closed.
- **admin_roles 재부활 금지**: 289차 폐기 계층(`routes.php:1670`)을 마이그레이션 소스/대상 어느 쪽으로도 부활 금지. Canonical Role은 team_role/TeamPermissions 위에 신설.
- **정직 부재 존중**: `isManager`/`isApprover`/`job_title`/`position`(HR) substrate 부재(정직) → 해당 source_type을 "발견"으로 날조 금지. 외부 IdP/ERP 실제 도입 시에만 유효.
- **비파괴 매핑**: Migration Record는 매핑 명세일 뿐, 실 assignment 이행은 별 승인 절차(무후퇴).

## 6. Gap

- Canonical Role Definition/Version 순신규 → `target_role`/`target_version` 부재(BLOCKED_PREREQUISITE) → 현재는 소스 인벤토리·매핑 설계만 가능.
- permission/scope 등가성은 3분산 매핑(acl_permission·roleRank→scope·admin_menus) 통합 부재로 산출 미완 → 선행 Part 2 Permission Engine 실구현 후.
- JWT/OAuth/ERP/Workflow/Feature/Profile 원천은 레포 부재(외부 도입 시 유효) → 순신규.
- mapping_confidence 산정 기준 미확정(설계). 실 엔진=RP-002 별도 승인세션.
