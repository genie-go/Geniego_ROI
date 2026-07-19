# DSAR — Role Registry Cache (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity 설계)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Decision Core + Permission Engine 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **반날조 규율**: 모든 `file:line`은 위 2문서에서만 인용. 없으면 **ABSENT**. Role≠Permission≠Authority. 289차 폐기 `admin_roles`/`user_roles` 재부활·재플래그 금지.

---

## 1. 목적 (Purpose)

Role Definition을 런타임 인가 판정에 재사용할 때 매번 5개 흩어진 role 어휘(team_role·api_key role·admin_level·AdminMenu enum·plan)를 재해석·재조립하지 않도록 **Version-aware·Tenant-aware Role Cache Key 구조**를 설계 정본으로 정의한다. 이 캐시는 Role Definition의 **Active Version에 결합된 파생 산출물의 무효화 경계**를 규정하며, 캐시 키 자체가 곧 무효화 트리거(Drift·Revalidation)의 대상 좌표가 된다.

★핵심 원칙: **캐시 키는 Version + Tenant를 반드시 포함**한다. 버전/테넌트 미포함 캐시는 289차에 폐기된 `admin_roles`류 하드코딩 정적 상수와 동형의 오류(교차 테넌트 누출·구버전 고착)를 재현한다. 이 엔티티는 순신규(기존 substrate에 캐시 계층 자체가 ABSENT — `auth_audit_log`는 변경 로그일 뿐 파생 캐시 아님).

## 2. Canonical 필드 (Cache Key 구성요소)

| 필드 | 설명 | 무효화 민감도 |
|---|---|---|
| tenant | 테넌트 격리 경계(교차 테넌트 캐시 누출 금지) | 절대 격리 |
| role_registry_id | Role Registry(단일 정본) 식별자 | Registry Drift |
| role_definition_id | Role Definition 구조체 식별자 | Definition 변경 |
| role_code | Canonical Code `{DOMAIN}:{FUNCTION}:{ROLE}` | 코드/네임스페이스 변경 |
| active_version | Role Definition의 활성 버전(★필수) | Version 변경 → 신 키 |
| lifecycle_state | Draft~Archived 전이 상태 | Suspended/Deprecated/Retired |
| actor_type | USER / API_CLIENT / SERVICE / SYSTEM eligibility | Actor Eligibility 변경 |
| domain | 소속 도메인(APPROVAL 등) | 도메인 재분류 |
| permission_mapping_digest | Role→Permission Version Mapping 다이제스트 | Permission 버전/상태 변경 |
| permission_group_mapping_digest | Permission Group 매핑 다이제스트 | Group 변경 |
| permission_bundle_mapping_digest | Permission Bundle 매핑 다이제스트 | Bundle 변경 |
| scope_requirement_digest | Scope Requirement(tenant_id·data_scope·team) 다이제스트 | Scope 요건 변경 |
| assignment_policy_digest | Assignment Policy 다이제스트 | Assignment 정책 변경 |
| owner_digest | Business/Technical/Security Owner 다이제스트 | Owner 변경 |
| review_certification_policy_version | Review/Certification 정책 버전 | 정책 버전 변경 |

## 3. 열거형 (Enumerations)

- **cache_scope**: `TENANT` · `ROLE_DEFINITION` · `ROLE_VERSION` · `ACTOR_TYPE`
- **invalidation_reason**: `ROLE_VERSION_CHANGED` · `LIFECYCLE_CHANGED` · `PERMISSION_MAPPING_CHANGED` · `GROUP_MAPPING_CHANGED` · `BUNDLE_MAPPING_CHANGED` · `SCOPE_REQUIREMENT_CHANGED` · `ASSIGNMENT_POLICY_CHANGED` · `OWNER_CHANGED` · `REVIEW_POLICY_CHANGED` · `MANUAL` · `TAMPER_SUSPECTED`
- **cache_state**: `FRESH` · `STALE` · `INVALIDATED` · `PENDING_REVALIDATION`
- **digest_algorithm**: (설계 — Part 2 Snapshot/Evidence Digest 정본과 정합. 이번 차수 미확정)

## 4. Substrate 매핑 (§5.2 + file:line)

| Canonical 필드 | 실존 substrate | file:line | 태그 |
|---|---|---|---|
| tenant | `app_user.team_id`(team_member 부재) | `TeamPermissions.php:562` | CANONICAL_ROLE_REGISTRY_CANDIDATE |
| role_definition (team_role) | `app_user.team_role` | `UserAuth.php:188`·도출 `:316` | 정형화 substrate |
| role_definition (api_key) | `api_key.role`·validRoles | `Keys.php:95` | 별개 actor(API_CLIENT) |
| role_definition (admin_level) | `app_user.admin_level` | `UserAdmin.php:43-46` | SUB_ROLE_CANDIDATE |
| role_definition (AdminMenu) | `menu_tree.required_role` | `AdminMenu.php:247` | CONSOLIDATION_REQUIRED |
| permission_mapping_digest | acl_permission(menu×action) | `TeamPermissions.php:39,152-159` | PARTIAL(3분산) |
| scope_requirement_digest | data_scope(9 dims 행필터) | `TeamPermissions.php:41,218-322` | PARTIAL |
| active_version | **버전 컬럼/개념 없음** | ABSENT | 순신규 |
| lifecycle_state | 하드코딩 enum·런타임 CRUD 불가 | ABSENT | 순신규 |
| owner_digest | 역할 소유 개념 없음 | ABSENT | 순신규 |
| **캐시 계층 자체** | 파생 캐시/무효화 경계 | ABSENT | 순신규 |

## 5. 설계 원칙 (Design Principles)

- **Version + Tenant-aware 필수**: 캐시 키에서 `active_version`·`tenant` 누락 금지. 버전 미포함=구버전 고착, 테넌트 미포함=교차 누출.
- **Historical Immutability**: 캐시는 파생물일 뿐 Role Definition Version을 In-place Update 하지 않는다(§D-6 Mandatory Control). 버전 변경은 신 키 생성.
- **Role≠Permission≠Authority≠JobTitle≠Plan**: 캐시 키는 Role Definition 좌표만 표현. plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`)를 캐시 판정에 흡수 금지 — Role 판정을 plan에서 분리(§D-2 후속 정합).
- **Fail-closed 정합**: substrate `roleOf` fail-closed(`TeamPermissions.php:120-131`) 계승 — 캐시 미스/무효화 시 권한 확대 방지.
- **Duplicate Code Protection**: 동일 role_code에 대한 중복 캐시 엔트리 금지(§D-6).

## 6. Gap

- Role Registry/Definition/Version/Namespace 순신규 → **캐시 키의 좌표축 전부 ABSENT**(BLOCKED_PREREQUISITE).
- `active_version` substrate 부재(버전 개념 자체 없음 — `EXISTING_IMPLEMENTATION §3` Version=ABSENT) → 버전 결합 캐시는 Part 2 Permission Engine 실구현 후 가능.
- permission/group/bundle mapping digest는 3분산 축(acl_permission·roleRank→scope·admin_menus) 통합 매핑 함수 부재로 산출 불가.
- digest 알고리즘·캐시 저장소는 이번 차수 미확정(설계). 실 엔진=RP-002 별도 승인세션.
