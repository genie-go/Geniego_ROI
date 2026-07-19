# DSAR — Role Permission Mapping (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19) · ★**BLOCKED_PREREQUISITE(RP-002 · Permission Engine 실구현 부재 → Permission Version 결합 blocked)**
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서(GROUND_TRUTH)에서만 인용 · 부재는 **ABSENT**로 정직 표기 · **Role ≠ Permission** · 289차 폐기(admin_roles/user_roles)·기수정(P1~P4) 재플래그 금지.

---

## ① 목적

`ROLE_PERMISSION_MAPPING`은 **하나의 Role Version이 어떤 Permission(Definition·Version)을 · 어떤 성격으로 · 어떤 효과 기대·Scope 전파·우선순위로 참조하는가**를 정형화한 선언체다. Role은 Subject 부여 축, Permission은 자원×동작 능력 축 — Mapping은 그 둘을 잇는 **버전 결합 링크**이지 Role도 Permission도 아니다(Role ≠ Permission). 목적은 (a) 현행 3분산(acl_permission menu×action · roleRank→scope · admin_menus)로 흩어진 Role→Permission 변환을 **단일 매핑 Contract**로 통합하고, (b) 각 매핑을 Role Version ↔ Permission Version에 결합해 "Active Role이 Retired Permission을 참조하는" 무결성 위반을 차단하며, (c) Explicit Deny를 Allow로 덮어쓰지 못하게 효과 우선순위를 봉인하는 것이다.

★단 결합 상대인 **Permission Definition/Version(Part 2 Permission Engine)이 코드 0**(ADR §D-4) — Mapping은 지목할 Permission Version 저장체가 없어 Permission Version 결합 축이 **BLOCKED_PREREQUISITE**다. 본 문서는 그 결합 형상만 규정(선행 Permission Engine 실구현 후 활성 · RP-002).

## ② Canonical 필드

`ROLE_PERMISSION_MAPPING` — Role Version ↔ Permission

| # | 필드 | 설명 |
|---|---|---|
| 1 | `role_permission_mapping_id` | 매핑 식별자 |
| 2 | `tenant_id` | 귀속 테넌트(전역 표준 매핑은 `__shared__` 스코프) |
| 3 | `role_ref` | Role Definition 참조 |
| 4 | `role_version_ref` | ★Role **Version** 참조(가변 현재값 금지 — 이 매핑이 봉인된 Role Version) |
| 5 | `permission_definition_ref` | Permission Definition 참조(Part 2) |
| 6 | `permission_version_ref` | ★Permission **Version** 참조(Part 2 · **BLOCKED_PREREQUISITE**) |
| 7 | `mapping_type` | ③ 열거형 |
| 8 | `required` | 이 Role에 필수인가(true=제거 불가) |
| 9 | `effect_expectation` | 기대 효과(ALLOW/DENY 기대값 · Deny 우선) |
| 10 | `scope_propagation` | Role Scope Requirement가 Permission으로 전파되는 방식([Scope Requirement](DSAR_APPROVAL_ROLE_SCOPE_REQUIREMENT.md)) |
| 11 | `priority` | 충돌 시 평가 우선순위(Explicit Deny 최상위) |
| 12 | `condition_ref` | CONDITIONAL_PERMISSION일 때 조건 참조(부재 시 null) |
| 13 | `digest` | 불변 무결성 다이제스트(Role Version 축에서 봉인) |

## ③ 열거형

**`mapping_type`**: `DIRECT_PERMISSION` · `REQUIRED_PERMISSION` · `OPTIONAL_PERMISSION` · `CONDITIONAL_PERMISSION` · `EXCLUDED_PERMISSION` · `EXPLICIT_DENY_REFERENCE` · `ADMINISTRATIVE_PERMISSION` · `UI_HINT_PERMISSION` · `CUSTOM`

- **DIRECT_PERMISSION**: Role이 직접 보유하는 Permission.
- **REQUIRED_PERMISSION**: Role 성립에 필수(제거 시 Role 무효).
- **OPTIONAL_PERMISSION**: Assignment 시 선택 부여.
- **CONDITIONAL_PERMISSION**: `condition_ref` 충족 시에만 유효.
- **EXCLUDED_PERMISSION**: 이 Role에 공존 금지(SoD).
- **EXPLICIT_DENY_REFERENCE**: 명시적 거부(★Allow로 덮어쓰기 불가 · priority 최상위).
- **ADMINISTRATIVE_PERMISSION**: 관리 성격(admin_level/menu_super 계열).
- **UI_HINT_PERMISSION**: 메뉴 가시성 힌트(런타임 게이트 아님 — required_role 반쯤 死 계열).
- **CUSTOM**: 테넌트 확장.

## ④ substrate 매핑 (§5.2 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate (file:line) | §5.2 분류 | 판정 |
|---|---|---|---|
| Role→Permission 변환(주 substrate) | `acl_permission`(menu×8 action) `TeamPermissions.php:39`·`:152-159`, data_scope 9dims `:41`·`:218-322` | CANONICAL_ROLE_REGISTRY_CANDIDATE | PARTIAL(team_role→Permission, 낱개·버전 미결합) |
| `role_ref`(team_role) | `app_user.team_role` `UserAuth.php:188`(도출 `:316`)·`roleOf :120-131` | CANONICAL_ROLE_REGISTRY_CANDIDATE | EXISTS(3값 vocabulary) |
| `mapping_type` roleRank→scope 축 | roleRank `index.php:573`·defaultScopes `Keys.php:189-194`(admin→read/write/admin:keys) | CANONICAL(별개 actor·API_CLIENT) | PARTIAL(2번째 분산 축) |
| ADMINISTRATIVE/UI_HINT 축(admin_menus) | `admin_menus`(JSON)·AdminMenu required_role `AdminMenu.php:247`(검증 `:401`)·isSuper `:148-151` | CONSOLIDATION_REQUIRED(반쯤 死) | PARTIAL(3번째 분산 축·rank 불일치) |
| effect_expectation(Deny 우선) | 문자열 상수 비교 `TeamPermissions.php:123`·`AuthContext.jsx:707` | 정책 소비지 미러 | PARTIAL(Explicit Deny 정형 없음) |
| `role_version_ref` | Role Version 개념 없음 | — | **ABSENT(순신규)** |
| `permission_definition_ref`/`permission_version_ref` | Part 2 Permission Definition/Version 저장체 **코드 0** | — | **BLOCKED_PREREQUISITE(RP-002)** |
| `required`/`priority`/`condition_ref`/`digest`/Mapping 자체 | 단일 매핑 함수·매핑 record 부재 | — | **ABSENT(순신규)** |

★현행은 team_role→acl_permission·roleRank→scope·admin_menus 세 축이 **서로 무관하게 분산**되어 단일 매핑 함수가 없다. Mapping은 순신규 링크이나, 변환 재료(acl_permission menu×action · roleRank · admin_menus)는 실재하므로 "발명이 아니라 조립"이다.

## ⑤ 설계원칙

- **Golden Rule**: `acl_permission`(menu×action `TeamPermissions.php:152-159`)이 **Role Permission Mapping의 substrate**다 — team_role→Permission 변환을 이 위에 통합하고, roleRank→scope(`index.php:573`)·admin_menus 3분산 축을 단일 매핑 Contract로 흡수한다. 별도 Role Permission Registry 신설 금지(중복 엔진 금지).
- **Role ≠ Permission**: Mapping은 Role이 Permission을 **참조**할 뿐 Permission Definition을 소유하지 않는다(Permission은 Part 2 소유). Role 부여(Assignment)는 Part 3-3, 금액 Authority는 Part 5로 직교.
- **★Role Version은 Permission Version에 결합** — Mapping은 특정 Role Version ↔ 특정 Permission Version을 봉인. In-place Update 금지. **Active Role이 Retired Permission을 참조하는 매핑 생성 금지**(무결성 위반).
- **★Explicit Deny 불가침**: `EXPLICIT_DENY_REFERENCE`/`effect_expectation=DENY`는 priority 최상위 — 어떤 Allow 매핑으로도 덮어쓸 수 없다(Deny overrides).
- **★Critical Permission 추가 = Risk 재평가**: risk=CRITICAL Permission을 Role에 추가하는 매핑은 Role Version 재발행 + Review/Certification 재트리거(자립 quick-fix 아님).
- **Mandatory Control**(ADR §D-6): Tenant Isolation·Role/Permission Version Binding·Retired Runtime Block·Duplicate Code Protection·Historical Immutability는 고객설정으로 비활성 불가.
- 실 구현 = 별도 승인세션(RP-002). **코드/DB 변경 0 · NOT_CERTIFIED**.

## ⑥ Gap

- **G1 BLOCKED_PREREQUISITE(RP-002·핵심)**: Permission Definition/Version(Part 2 Permission Engine) 코드 0 → `permission_version_ref` 결합 원리적 불가. Role Version ↔ Permission Version 매핑은 선행 Permission Engine 실구현 후 활성.
- **G2 ABSENT**: Role Version·단일 매핑 함수·`required`/`priority`/`condition_ref`/`digest`·Explicit Deny 정형 = 순신규.
- **G3 PARTIAL(3분산)**: Role→Permission 변환이 acl_permission(`:152-159`)·roleRank→scope(`index.php:573`)·admin_menus(`AdminMenu.php:247`) 세 무관 축으로 흩어짐 → 통합 대상. required_role rank 불일치(반쯤 死)는 CONSOLIDATION_REQUIRED.
- **G4**: 현행 team_role/menu_key가 Canonical `{DOMAIN}:{FUNCTION}:{ROLE}` / Permission Code가 아님 → 매핑이 참조할 Code 정규화(Legacy Alias) 선행 필요.
