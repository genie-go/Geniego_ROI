# DSAR — Role Permission Group Mapping (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19) · ★**BLOCKED_PREREQUISITE(RP-002 · Permission Engine 실구현 부재 → Permission Group Version 결합 blocked)**
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서(GROUND_TRUTH)에서만 인용 · 부재는 **ABSENT** · **Role ≠ Permission Group** · 289차 폐기·기수정 재플래그 금지.

---

## ① 목적

`ROLE_PERMISSION_GROUP_MAPPING`은 **하나의 Role Version이 어떤 Permission Group(Category/Domain 단위 Permission 묶음)을 · 어떤 성격·Scope 전파·우선순위로 참조하는가**를 정형화한 선언체다. Permission Group은 Permission을 카테고리/도메인 단위로 묶은 **Permission 축의 집합**이고 Role은 Subject 부여 축 — 둘은 직교한다(**Role ≠ Permission Group**). 개별 Permission을 낱개로 참조하는 [Role Permission Mapping](DSAR_APPROVAL_ROLE_PERMISSION_MAPPING.md)과 달리, Group Mapping은 **묶음 단위** 참조로 반복 매핑을 줄이고 도메인 일관성을 준다.

★단 결합 상대인 **Permission Group(Part 2 Permission Engine)이 코드 0** — 현행 레포에는 Permission을 도메인/카테고리로 묶는 Group 선언체가 부재(MENU_CATALOG 메뉴 그룹핑은 UI 카탈로그이지 Permission Group이 아님). 따라서 Group Version 결합 축은 **BLOCKED_PREREQUISITE(RP-002)**다. 본 문서는 결합 형상만 규정.

## ② Canonical 필드

`ROLE_PERMISSION_GROUP_MAPPING` — Role Version ↔ Permission Group

| # | 필드 | 설명 |
|---|---|---|
| 1 | `role_permission_group_mapping_id` | 매핑 식별자 |
| 2 | `tenant_id` | 귀속 테넌트(전역 표준 매핑은 `__shared__`) |
| 3 | `role_ref` | Role Definition 참조 |
| 4 | `role_version_ref` | ★Role **Version** 참조(봉인 대상) |
| 5 | `permission_group_id` | Permission Group 식별자(Part 2) |
| 6 | `permission_group_version_ref` | ★Permission Group **Version** 참조(Part 2 · **BLOCKED_PREREQUISITE**) |
| 7 | `mapping_type` | ③ 열거형 |
| 8 | `scope_propagation` | Group 내 Permission으로의 Scope 전파 방식([Scope Requirement](DSAR_APPROVAL_ROLE_SCOPE_REQUIREMENT.md)) |
| 9 | `priority` | 충돌 시 평가 우선순위(Explicit Deny 최상위) |
| 10 | `digest` | 불변 무결성 다이제스트(Role Version 축에서 봉인) |

## ③ 열거형

**`mapping_type`**: `DIRECT_PERMISSION` · `REQUIRED_PERMISSION` · `OPTIONAL_PERMISSION` · `CONDITIONAL_PERMISSION` · `EXCLUDED_PERMISSION` · `EXPLICIT_DENY_REFERENCE` · `ADMINISTRATIVE_PERMISSION` · `UI_HINT_PERMISSION` · `CUSTOM`

(Group 단위 적용 — [Role Permission Mapping](DSAR_APPROVAL_ROLE_PERMISSION_MAPPING.md) ③과 동일 의미론이되 대상이 Permission 낱개가 아니라 Group. `EXCLUDED_PERMISSION`/`EXPLICIT_DENY_REFERENCE`는 Group 전체 배제/거부.)

## ④ substrate 매핑 (§5.2 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate (file:line) | §5.2 분류 | 판정 |
|---|---|---|---|
| Group 묶음의 재료(Permission vocabulary) | `acl_permission` menu×8 action `TeamPermissions.php:39`·`:152-159`, data_scope `:41`·`:218-322` | CANONICAL_ROLE_REGISTRY_CANDIDATE | PARTIAL(낱개 재료만·Group 없음) |
| 카테고리 단위 묶음(근접·UI 축) | `admin_menus`(JSON)·AdminMenu required_role `AdminMenu.php:247` | CONSOLIDATION_REQUIRED(반쯤 死) | PARTIAL(메뉴 그룹핑≠Permission Group) |
| `role_ref`(team_role) | `app_user.team_role` `UserAuth.php:188`·`roleOf :120-131` | CANONICAL_ROLE_REGISTRY_CANDIDATE | EXISTS(vocabulary만) |
| `role_version_ref` | Role Version 개념 없음 | — | **ABSENT(순신규)** |
| `permission_group_id`/`permission_group_version_ref` | Permission Group 선언체(Part 2) **코드 0** | — | **BLOCKED_PREREQUISITE(RP-002)** |
| `scope_propagation`/`priority`/`digest`/Mapping 자체 | Group 매핑 record 부재 | — | **ABSENT(순신규)** |

★현행에는 Permission을 도메인/카테고리로 묶는 **Permission Group 자체가 부재**하다(acl_permission은 menu×action 낱개, admin_menus는 UI 메뉴 그룹핑). Group Mapping은 순신규이며 Part 2 Permission Group 신설이 선행 전제다.

## ⑤ 설계원칙

- **Golden Rule**: Group Mapping은 [Role Permission Mapping](DSAR_APPROVAL_ROLE_PERMISSION_MAPPING.md)의 substrate(acl_permission `:152-159`) 위에 **묶음 참조 상위 Template**를 얹는다 — 별도 Role/Group Registry 신설 금지. Group은 Part 2 Permission Group을 **참조**만 하고 소유하지 않는다.
- **Role ≠ Permission Group**: Role은 Subject 부여 축, Permission Group은 Permission 카테고리 축 — Group Mapping은 그 둘의 참조 링크이지 Group Definition이 아니다.
- **★Group Version 변경 시 Role Version 재검토**: Permission Group 구성이 바뀌면(Permission 추가/제거) 그 Group을 참조하는 모든 Role의 실효 권한이 변하므로 **Role Version 재검토 + Review 재트리거**. Group 확장이 Role 권한을 확대하면 Risk 재평가.
- **Explicit Deny 불가침·Deny overrides**: Group 단위 `EXPLICIT_DENY_REFERENCE`는 하위 Allow를 덮어쓸 수 없다.
- **Version 결합·불변**: Role Version ↔ Permission Group Version 봉인. In-place Update 금지 · Retired Group 참조 금지.
- **Mandatory Control**(ADR §D-6): Tenant Isolation·Version Binding·Historical Immutability는 비활성 불가.
- 실 구현 = 별도 승인세션(RP-002). **코드/DB 변경 0 · NOT_CERTIFIED**.

## ⑥ Gap

- **G1 BLOCKED_PREREQUISITE(RP-002)**: Permission Group(Part 2)이 코드 0 → `permission_group_version_ref` 결합 원리적 불가. Group 자체 신설이 선행.
- **G2 ABSENT**: Role Version·Permission Group·Group Mapping record·`scope_propagation`/`priority`/`digest` = 전부 순신규. 현행 admin_menus 메뉴 그룹핑은 UI 카탈로그이지 Permission Group이 아님(오탐 금지).
- **G3 PARTIAL**: 묶음 재료(acl_permission·admin_menus)는 실재하나 도메인 Permission Group 정형·Role 결합 부재.
