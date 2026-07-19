# DSAR — Role Registry Reconciliation Foundation (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity 설계)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Decision Core + Permission Engine 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **반날조 규율**: 모든 `file:line`은 위 2문서에서만 인용. 없으면 **ABSENT**. Role≠Permission≠Authority. 289차 폐기 `admin_roles`/`user_roles` 재부활·재플래그 금지.

---

## 1. 목적 (Purpose)

Canonical Role Registry가 도입될 때, **5개 흩어진 role 어휘**(team_role·api_key role·admin_level·AdminMenu enum·plan)와 외부 IAM/ERP/Workflow 표현이 Canonical Role Definition과 **정합하는지 대사(Reconciliation)** 하는 엔티티를 설계 정본으로 정의한다. Reconciliation은 "값충돌('admin' 3중복)·반쯤 死(AdminMenu rank 불일치)·Legacy vs Canonical 괴리·중복 Code"를 탐지하는 대사 계층이며, 스스로 role을 병합·변경하지 않고 **불일치 목록만 산출**한다(비파괴).

★대사 대상 5 어휘는 **재부활이 아니라 정형화·통합**의 소스다. `admin_roles`/`user_roles`(289차 폐기)는 대사 대상에서 제외(고아 테이블 — `routes.php:1670`·`UserAdmin.php:596-599`).

## 2. Canonical 필드 (Reconciliation Record)

| 필드 | 설명 |
|---|---|
| reconciliation_id | 대사 레코드 식별자 |
| comparison_type | 아래 §3 비교 종류 |
| left_ref / right_ref | 대사 좌/우 대상(Registry·Definition·Active Version·외부 alias 등) |
| status | `MATCH` · `MISMATCH` · `MISSING_LEFT` · `MISSING_RIGHT` · `DUPLICATE` · `CONFLICT` |
| severity | `INFO` · `LOW` · `MEDIUM` · `HIGH` · `CRITICAL` |
| snapshot_digest | 대사 시점 상태 다이제스트 |
| resolution | `CONSOLIDATE` · `ALIAS` · `DEPRECATE` · `MANUAL_REVIEW` · `NO_ACTION`(비파괴 — 실 변경은 별 절차) |

## 3. 열거형 (Comparison Type)

- `REGISTRY_VS_DEFINITION` — Registry 등재 vs Definition 구조체
- `DEFINITION_VS_ACTIVE_VERSION` — Definition vs 활성 버전
- `CODE_VS_NAMESPACE` — Canonical Code vs `{DOMAIN}:{FUNCTION}:{ROLE}` 네임스페이스
- `TYPE_VS_ACTOR_ELIGIBILITY` — Role Type vs Actor Eligibility
- `RISK_VS_PERMISSION_RISK` — Role Risk vs 매핑 Permission Risk
- `CRITICALITY_VS_PERMISSIONS` — Criticality vs 보유 Permission
- `PERMISSION_MAPPING_VS_ACTIVE` · `GROUP_MAPPING_VS_ACTIVE` · `BUNDLE_MAPPING_VS_ACTIVE`
- `SCOPE_REQUIREMENT_VS_DEFINITION`
- `ASSIGNMENT_POLICY_VS_RISK`
- `OWNER_VS_SUBJECT` — Owner vs 실제 주체
- `REVIEW_VS_LAST` · `CERTIFICATION_VS_LAST`
- `LIFECYCLE_VS_ASSIGNMENTS` — Lifecycle 상태 vs 잔존 Assignment
- `ALIAS_VS_IAM` · `ALIAS_VS_ERP` · `ALIAS_VS_WORKFLOW`
- `LEGACY_VS_CANONICAL` — 5 어휘 Legacy vs Canonical
- `DUPLICATE_CODE` — 중복 Canonical Code
- `SNAPSHOT_DIGEST` — 스냅샷 다이제스트 무결성

## 4. Substrate 매핑 (§5.2 + file:line) — 5 어휘 대사 대상

| 어휘/대상 | 값 | file:line | 태그 |
|---|---|---|---|
| team_role | owner/manager/member | `UserAuth.php:188`·`TeamPermissions.php:120-131` | CANONICAL_ROLE_REGISTRY_CANDIDATE |
| api_key role | viewer/connector/analyst/admin | `Keys.php:95`·`index.php:573` | CANONICAL(API_CLIENT) |
| admin_level | master/sub | `UserAdmin.php:43-46` | SUB_ROLE_CANDIDATE |
| AdminMenu ROLE_ENUM | admin/super_admin/moderator | `AdminMenu.php:247`·rank `:74`(불일치) | CONSOLIDATION_REQUIRED(반쯤 死) |
| plan 'admin' god flag | god flag(§6.5 위반) | `TeamPermissions.php:132`·`AuthContext.jsx:720`·`AdminMenu.php:57` | ANTI_PATTERN(후속 정합) |
| ALIAS_VS_IAM (SSO) | sso_group_role_map | `EnterpriseAuth.php:70-72,78-88` | VALIDATED_IAM(Adapter) |
| **DUPLICATE_CODE** | 'admin' 3체계 중복 | `EXISTING_IMPLEMENTATION §2` | 값충돌(대사 핵심) |
| PERMISSION_MAPPING_VS_ACTIVE | acl_permission | `TeamPermissions.php:39,152-159` | PARTIAL(버전 없음) |
| ALIAS_VS_ERP / ALIAS_VS_WORKFLOW | ERP/Workflow role | ABSENT | 순신규(Migration 소스) |
| REVIEW_VS_LAST / CERTIFICATION_VS_LAST | Review/Certification | ABSENT | 순신규 |
| OWNER_VS_SUBJECT | Owner 개념 | ABSENT | 순신규 |
| admin_roles/user_roles | **폐기(대사 대상 아님)** | `routes.php:1670`·`UserAdmin.php:596-599` | DEPRECATED(재부활 금지) |

## 5. 설계 원칙 (Design Principles)

- **비파괴 대사**: Reconciliation은 불일치 목록만 산출. 실제 병합/통합은 별 승인 절차(resolution은 권고). 무후퇴.
- **값충돌 최우선**: 'admin'이 team_role 아님·api_key role·AdminMenu enum·plan 4곳에서 다른 값공간으로 쓰임(`EXISTING_IMPLEMENTATION §2`) → `DUPLICATE_CODE`/`CONFLICT`로 대사. Canonical Namespace `{DOMAIN}:{FUNCTION}:{ROLE}`로 정규화·Legacy Alias·confidence 부여.
- **AdminMenu 반쯤 死 정합**: required_role(3값)이 실 게이트 rank(api_key 4값)와 불일치(`AdminMenu.php:247`·rank `:74`) → `CODE_VS_NAMESPACE`/`REGISTRY_VS_DEFINITION` 대사로 통합 유도.
- **Role≠Plan**: plan god flag(`TeamPermissions.php:132`)는 `LEGACY_VS_CANONICAL` 대사로 노출하되 Role로 재부여 금지(§D-2 후속 enforcement).
- **오탐 방지**: `admin_roles`/`user_roles` 폐기(289차)를 `MISSING`으로 계상 금지 — 폐기가 정상. isManager/isApprover/Job Title 부재(정직)를 불일치로 날조 금지.

## 6. Gap

- Canonical Registry/Definition/Active Version 순신규 → 대사의 우변(Canonical) 부재(BLOCKED_PREREQUISITE) → 현재는 5 어휘 상호 대사만 의미.
- Permission/Group/Bundle mapping vs Active는 선행 Part 2 Permission Engine 실구현 후 가능(버전 결합 필요).
- ERP/Workflow alias·Review/Certification·Owner·Risk substrate 부재 → 해당 comparison 순신규.
- snapshot_digest 알고리즘 미확정(설계). 실 엔진=RP-002 별도 승인세션.
