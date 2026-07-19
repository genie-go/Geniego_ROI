# DSAR — Role Binding Foundation (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 `ABSENT`. Role≠Permission≠Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

Role Binding Foundation = **Role Definition이 어떤 구성요소들과 결합되는가**의 구조 계약. 여기서 Binding은 **정의 수준 결합**(Role Definition ↔ Permission/Group/Bundle/Domain/Actor/Scope/Policy/Owner)이지, **실 Subject(사용자·API 클라이언트)에 대한 역할 부여가 아니다**.

- **★핵심 경계**: 실 **Subject Assignment Binding**(누구에게 이 역할을 부여했는가)은 **Part 3-3 소관 · BLOCKED_PREREQUISITE**. 본 편은 그 선행 계약(정의 결합)만 규정한다. 이 경계를 흐리면 289차가 폐기한 `admin_roles/user_roles` assignRole/revokeRole(`routes.php:1670`·`UserAdmin.php:596-599`)의 재부활이 된다 — 금지.
- Role≠Permission≠Authority: Binding은 Role이 참조하는 대상을 묶을 뿐, Permission 정의(Part 2)도 승인 권한(Part 5)도 아니다.

## ② Canonical 필드 (Binding 계약 · 코드 0)

`ROLE_BINDING` (정의 수준 결합 · 전부 신규)

| # | 필드 | 의미 |
|---|---|---|
| 1 | role_binding_id | 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | role_definition_version_ref | 결합 주체 Role Definition Version(별편 2) |
| 4 | bound_target_type | 결합 대상 유형(③ 열거형) |
| 5 | bound_target_ref | 결합 대상 참조 |
| 6 | bound_target_version_ref | 결합 대상 Version(Permission Version 등·Part 2 BLOCKED) |
| 7 | binding_kind | 결합 방식(direct/via_group/via_bundle 등) |
| 8 | constraint | 결합 제약(조건부·Scope 전파) |
| 9 | effective_at / status | 결합 유효 시각·상태 |
| 10 | binding_digest | 결합 무결성 다이제스트(별편 6) |

## ③ 열거형 — bound_target_type (정의 결합 대상 · 코드 0)

| # | bound_target_type | 축 | Part |
|---|---|---|---|
| 1 | PERMISSION_DEFINITION_VERSION | Permission | Part 2(BLOCKED) |
| 2 | PERMISSION_GROUP_VERSION | Group | Part 2 |
| 3 | PERMISSION_BUNDLE_VERSION | Bundle | Part 2 |
| 4 | AUTHORIZATION_DOMAIN | Domain | Part 1 |
| 5 | ACTOR_TYPE | Actor Eligibility | 본 Part |
| 6 | SCOPE_REQUIREMENT | Scope | Part 3-4 |
| 7 | ASSIGNMENT_POLICY | Policy | 본 Part |
| 8 | OWNER | Ownership | 본 Part |
| 9 | REVIEW_POLICY | Policy | 본 Part |
| 10 | CERTIFICATION_POLICY | Policy | 본 Part |

> ★**SUBJECT_ASSIGNMENT** (사용자↔역할 실 부여)는 본 열거형에 **의도적으로 없다** → Part 3-3 · BLOCKED_PREREQUISITE.

## ④ substrate 매핑 (§5.2 분류 + file:line · 없으면 ABSENT)

| Binding 축 | 최근접 substrate | §5.2 태그 | file:line (2문서) | 판정 |
|---|---|---|---|---|
| PERMISSION(DIRECT, menu×action) | `acl_permission` | PARTIAL(3분산) | `TeamPermissions.php:39,152-159` | PARTIAL |
| SCOPE_REQUIREMENT | `data_scope` | PARTIAL | `TeamPermissions.php:41,218-322` | PARTIAL |
| ACTOR_TYPE(API_CLIENT) | `api_key.role` | CANONICAL(별개 actor) | `Keys.php:95`·`index.php:573` | PARTIAL |
| ACTOR_TYPE(EXTERNAL_IDP) | SSO group→role | VALIDATED_IAM(Adapter) | `EnterpriseAuth.php:70-88` | ADAPTER |
| ACTOR_TYPE(ADMINISTRATIVE) | `admin_level` | SUB_ROLE_CANDIDATE | `UserAdmin.php:43-46` | PARTIAL |
| AUTHORIZATION_DOMAIN | AdminMenu ROLE_ENUM | CONSOLIDATION_REQUIRED(반쯤 死) | `AdminMenu.php:247`·rank `:74` | PARTIAL |
| **PERMISSION_DEFINITION_VERSION** | — | — | **ABSENT**(Part 2·버전) | **BLOCKED_PREREQUISITE** |
| OWNER / REVIEW / CERTIFICATION POLICY | — | — | **ABSENT** | **ABSENT** |
| ASSIGNMENT_POLICY | — | — | **ABSENT**(자동활성 금지 계약) | **ABSENT** |
| **SUBJECT_ASSIGNMENT** | (`team_role` 부여) | — | (Part 3-3) | **BLOCKED_PREREQUISITE** |
| binding_digest | — | — | **ABSENT**(개념=선행 Hash Chain 봉인기) | **ABSENT** |

> ★anti-pattern: `team_role` 부여 경로는 실 Subject Assignment에 해당하나, 이는 **Part 3-3의 실 Assignment Binding 대상**이지 본 편(정의 결합)이 아니다. `plan 'admin'` god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`)를 ACTOR_TYPE/OWNER 결합으로 승계 금지(§6.5 Role≠Plan).

## ⑤ 설계원칙

- **정의 결합 ≠ Subject 부여**: 본 편은 Role Definition ↔ 구성요소 결합만. 실 사용자 부여는 Part 3-3(BLOCKED_PREREQUISITE). 경계 혼동 시 폐기 admin_roles 재부활 위험.
- **Version 결합**: Permission 등 대상은 **Version**을 가리켜야 함(Part 2 확정 전 BLOCKED). Version 없는 결합은 감사 재현 불가.
- **자동활성 금지**: 모호 단독 Role(ADMIN/ALL_ACCESS) 자동활성·ASSIGNMENT_POLICY 없는 결합 금지(Least Privilege).
- **Tenant 격리·불변 결합 이력**: 결합 변경은 Audit Event(별편 5)로 기록·append-only.
- **Golden Rule**: 3분산 substrate(acl_permission·roleRank→scope·admin_menus)를 확장 결합하되 4번째 결합 저장소 신설 금지. `binding_digest`=선행 Hash Chain 봉인기 개념 재사용(별편 6).

## ⑥ Gap

- 정의 수준 Role Binding 엔티티·Version 결합·제약 = **ABSENT**.
- PERMISSION_DEFINITION_VERSION 결합 = **BLOCKED_PREREQUISITE**(Part 2 부재).
- OWNER/REVIEW/CERTIFICATION/ASSIGNMENT POLICY 결합 = **ABSENT**.
- **실 Subject Assignment Binding = Part 3-3 · BLOCKED_PREREQUISITE**(본 편 범위 밖·의도적 제외).
- 실 Binding 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
