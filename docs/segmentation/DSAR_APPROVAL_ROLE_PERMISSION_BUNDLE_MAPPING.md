# DSAR — Role Permission Bundle Mapping (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19) · ★**BLOCKED_PREREQUISITE(RP-002 · Permission Engine 실구현 부재 → Permission Bundle Version 결합 blocked)**
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서(GROUND_TRUTH)에서만 인용 · 부재는 **ABSENT** · **Role ≠ Permission Bundle** · 289차 폐기·기수정 재플래그 금지.

---

## ① 목적

`ROLE_PERMISSION_BUNDLE_MAPPING`은 **하나의 Role Version이 어떤 Permission Bundle(배포/상품/모듈/기능 단위 표준 Permission Package)을 · 필수/선택/배제 거동·호환성 결과·Scope 전파로 참조하는가**를 정형화한 선언체다. Permission Bundle은 Part 2에서 정의된 **재사용 Permission Package**([`PERMISSION_BUNDLE`](DSAR_APPROVAL_PERMISSION_BUNDLE.md))이고 Role은 Subject 부여 축 — Bundle Mapping은 그 둘의 참조 링크이지 Bundle Definition도 Role도 아니다(**Role ≠ Permission Bundle**). 목적은 Role이 표준 Bundle을 참조해 일관된 Permission 묶음을 상속하되, Bundle의 mandatory/optional/exclusion 거동과 Compatibility(SoD) 결과를 Role Version에 봉인하는 것이다.

★단 결합 상대인 **Permission Bundle(Part 2 Permission Engine)이 코드 0** — Bundle 선언체·type·target·mandatory/optional/excluded·version 링크가 전부 순신규(현행은 menu_key×action 낱개 부여만). 따라서 Bundle Version 결합 축은 **BLOCKED_PREREQUISITE(RP-002)**다. 본 문서는 결합 형상만 규정.

## ② Canonical 필드

`ROLE_PERMISSION_BUNDLE_MAPPING` — Role Version ↔ Permission Bundle

| # | 필드 | 설명 |
|---|---|---|
| 1 | `role_permission_bundle_mapping_id` | 매핑 식별자 |
| 2 | `tenant_id` | 귀속 테넌트(전역 표준 매핑은 `__shared__`) |
| 3 | `role_ref` | Role Definition 참조 |
| 4 | `role_version_ref` | ★Role **Version** 참조(봉인 대상) |
| 5 | `permission_bundle_id` | Permission Bundle 식별자(Part 2) |
| 6 | `permission_bundle_version_ref` | ★Permission Bundle **Version** 참조(Part 2 · **BLOCKED_PREREQUISITE**) |
| 7 | `mandatory_behavior` | Bundle의 필수 Permission 상속 거동(제거 불가) |
| 8 | `optional_behavior` | 선택 Permission 상속 여부 |
| 9 | `exclusion_behavior` | 배제 Permission 처리(공존 금지·Deny 우선) |
| 10 | `compatibility_result` | Bundle↔Role 기존 권한 호환성 판정(③ 열거형) |
| 11 | `scope_propagation` | Bundle Permission으로의 Scope 전파([Scope Requirement](DSAR_APPROVAL_ROLE_SCOPE_REQUIREMENT.md)) |
| 12 | `digest` | 불변 무결성 다이제스트(Role Version 축에서 봉인) |

## ③ 열거형

**`compatibility_result`**: `COMPATIBLE` · `CONDITIONALLY_COMPATIBLE` · `CONFLICT_SOD` · `CONFLICT_EXCLUSION` · `EXPANSION_REQUIRES_REVIEW` · `INCOMPATIBLE`

**`mandatory_behavior` / `optional_behavior` / `exclusion_behavior`**: `INHERIT` · `INHERIT_LOCKED`(제거 불가) · `SELECTABLE` · `DENY_OVERRIDE`(배제·거부 우선) · `SKIP`

## ④ substrate 매핑 (§5.2 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate (file:line) | §5.2 분류 | 판정 |
|---|---|---|---|
| Bundle이 묶을 Permission 재료 | `acl_permission` menu×8 action `TeamPermissions.php:39`·`:152-159`, data_scope `:41`·`:218-322` | CANONICAL_ROLE_REGISTRY_CANDIDATE | PARTIAL(낱개 재료·Bundle 없음) |
| `role_ref`(team_role) | `app_user.team_role` `UserAuth.php:188`·`roleOf :120-131` | CANONICAL_ROLE_REGISTRY_CANDIDATE | EXISTS(vocabulary만) |
| API_CLIENT Bundle 근접(defaultScopes) | defaultScopes `Keys.php:189-194`(admin→read/write/admin:keys)·roleRank `index.php:573` | CANONICAL(별개 actor·API_CLIENT) | PARTIAL(고정 scope 세트≠Bundle) |
| `role_version_ref` | Role Version 개념 없음 | — | **ABSENT(순신규)** |
| `permission_bundle_id`/`permission_bundle_version_ref` | Permission Bundle 선언체(Part 2) **코드 0** | — | **BLOCKED_PREREQUISITE(RP-002)** |
| `compatibility_result`/`mandatory/optional/exclusion_behavior`/`digest`/Mapping 자체 | Bundle Mapping record·호환성 판정 부재 | — | **ABSENT(순신규)** |

★현행에는 **Permission Bundle 선언체 자체가 부재**하다(개별 `menu_key×action`을 매번 낱개 부여). Bundle Mapping은 순신규이며, defaultScopes(`Keys.php:189-194`)의 고정 scope 세트가 개념적으로 가장 근접하나 재사용 Package·version·target 개념이 없어 Bundle이 아니다.

## ⑤ 설계원칙

- **Golden Rule**: Bundle Mapping은 [Role Permission Mapping](DSAR_APPROVAL_ROLE_PERMISSION_MAPPING.md) substrate(acl_permission `:152-159`) 위에 Part 2 [`PERMISSION_BUNDLE`](DSAR_APPROVAL_PERMISSION_BUNDLE.md)을 **참조**하는 링크만 얹는다 — Bundle Definition/Grant 엔진 신설 금지. Bundle 부여의 상한(부여자 자기 권한 초과 금지)은 Part 2 Bundle 규율을 그대로 상속.
- **Role ≠ Permission Bundle**: Role은 Subject 부여 축, Bundle은 Permission Package 축 — Mapping은 참조이지 소유가 아니다.
- **★Bundle 변경이 Role 권한 확대 시 Role Version + Review 요구**: Bundle 버전 상향으로 Role의 실효 권한이 확대되면(`compatibility_result=EXPANSION_REQUIRES_REVIEW`) **Role Version 재발행 + Review/Certification 필수**. 자동 상속 금지.
- **exclusion·Deny 우선**: `exclusion_behavior=DENY_OVERRIDE`는 mandatory/optional보다 우선. `CONFLICT_SOD`/`CONFLICT_EXCLUSION` 시 매핑 차단(fail-closed).
- **Version 결합·불변**: Role Version ↔ Bundle Version 봉인 · In-place Update 금지 · Retired Bundle 참조 금지.
- **Mandatory Control**(ADR §D-6): Tenant Isolation·Version Binding·Duplicate Code Protection·Historical Immutability 비활성 불가.
- 실 구현 = 별도 승인세션(RP-002). **코드/DB 변경 0 · NOT_CERTIFIED**.

## ⑥ Gap

- **G1 BLOCKED_PREREQUISITE(RP-002)**: Permission Bundle(Part 2) 코드 0 → `permission_bundle_version_ref`·`compatibility_result` 결합 원리적 불가. Bundle 신설이 선행.
- **G2 ABSENT**: Role Version·Bundle Mapping record·mandatory/optional/exclusion 거동·compatibility 판정·digest = 전부 순신규.
- **G3 PARTIAL**: 묶음 재료(acl_permission)·API_CLIENT 고정 scope 세트(defaultScopes `Keys.php:189-194`)는 실재하나 재사용 Bundle·Role 결합 부재.
