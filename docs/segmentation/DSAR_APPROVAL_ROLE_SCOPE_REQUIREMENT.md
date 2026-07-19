# DSAR — Role Scope Requirement (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19) · ★**BLOCKED_PREREQUISITE(RP-002 · 실 Scope 값 결합·검증은 Part 3-4 Scoped Role 실구현 후)**
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서(GROUND_TRUTH)에서만 인용 · 부재는 **ABSENT** · **Role ≠ Permission** · Scope **요구 구조**이지 실 Scope 값 아님(실값=Part 3-4) · 289차 폐기·기수정 재플래그 금지.

---

## ① 목적

`ROLE_SCOPE_REQUIREMENT`는 **하나의 Role Version이 Assignment(부여) 시점에 어떤 Scope 축을 · 필수/선택 · 단일/다중 · wildcard/하위트리 허용 여부 · 기본 출처 · 최대 범위 폭 · 검증 정책으로 요구하는가**를 정형화한 **요구 구조** 선언체다. ★이는 **실제 Scope 값(특정 Org ID·Resource ID)이 아니다** — 실 Scope 값 결합·집행은 [Scoped Role(Part 3-4)](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)의 몫이다. 목적은 (a) Role Definition에 실 Org/Resource ID를 하드코딩하지 못하게 하고, (b) 부여 시 어떤 Scope를 반드시 지정해야 하는지(예: PAYMENT 역할은 LEGAL_ENTITY·AMOUNT_REF 필수)를 선언하며, (c) wildcard·하위트리·최대 폭 상한으로 과대 부여(Least Privilege 위반)를 사전 차단하는 것이다.

★실 Scope 값 바인딩·검증 실행은 **Part 3-4**에 위임되므로 이 구조의 런타임 집행 축은 **BLOCKED_PREREQUISITE(RP-002)**다. 본 문서는 요구 구조 형상만 규정.

## ② Canonical 필드

`ROLE_SCOPE_REQUIREMENT` — Role Version 부여 시 Scope 요구 구조(실값 아님)

| # | 필드 | 설명 |
|---|---|---|
| 1 | `role_scope_requirement_id` | 요구 구조 식별자 |
| 2 | `tenant_id` | 귀속 테넌트(전역 표준은 `__shared__`) |
| 3 | `role_ref` | Role Definition 참조 |
| 4 | `role_version_ref` | ★Role **Version** 참조(봉인 대상) |
| 5 | `scope_type` | ③ 열거형 — 요구되는 Scope 축(값 아님) |
| 6 | `required` | 부여 시 필수 지정 여부 |
| 7 | `multiple_allowed` | 동일 축 다중 값 허용 |
| 8 | `wildcard_allowed` | wildcard(`*`) 허용 여부(★기본 false·Least Privilege) |
| 9 | `descendants_allowed` | 하위트리(subtree) 확장 허용 |
| 10 | `exact_match` | 정확 일치만 허용(하위/상위 불가) |
| 11 | `default_source` | 부여 시 값 미지정 시 기본 출처(예: 부여자 tenant·session) |
| 12 | `maximum_scope_breadth` | 최대 범위 폭 상한(과대 부여 차단) |
| 13 | `validation_policy` | 값 검증 정책 참조(형식·존재·소유 검증 — 실행은 Part 3-4) |
| 14 | `digest` | 불변 무결성 다이제스트(Role Version 축에서 봉인) |

## ③ 열거형

**`scope_type`**: `TENANT` · `LEGAL_ENTITY` · `ORGANIZATION` · `ORGANIZATION_SUBTREE` · `PROJECT` · `REGION_REF` · `RESOURCE_TYPE` · `RESOURCE_INSTANCE` · `RESOURCE_VERSION` · `DATA_CATEGORY` · `CHANNEL` · `CLIENT` · `AMOUNT_REF` · `CURRENCY_REF` · `TIME` · `ENVIRONMENT` · `COMPOSITE` · `CUSTOM`

- **COMPOSITE**: 복수 축의 조합 요구(예: LEGAL_ENTITY × AMOUNT_REF × CURRENCY_REF).
- **AMOUNT_REF/CURRENCY_REF**: 금액/통화 축 요구(실 한도값·Authority는 Part 5).
- **RESOURCE_VERSION**: 특정 자원 버전 축(Canonical Resource Version Registry 부재 시 요구만 선언).

## ④ substrate 매핑 (§5.2 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate (file:line) | §5.2 분류 | 판정 |
|---|---|---|---|
| DATA_CATEGORY/RESOURCE 행필터 Scope 값(실값 축) | `data_scope`(9 dims 행필터) `TeamPermissions.php:41`·`:218-322` | CANONICAL_ROLE_REGISTRY_CANDIDATE | PARTIAL(실 Scope 값 substrate·요구 구조 아님·Part 3-4) |
| CLIENT/API scope 값(실값 축) | api_key `scopes_json`·defaultScopes `Keys.php:189-194`(admin→read/write/admin:keys)·admin:menu_super `AdminMenu.php:148-151` | CANONICAL(별개 actor·API_CLIENT) | PARTIAL(실 scope 값·요구 구조 아님·Part 3-4) |
| TENANT 축 | `app_user.team_id` `TeamPermissions.php:562`·tenant 격리 | CANONICAL_ROLE_REGISTRY_CANDIDATE | EXISTS(tenant 축만) |
| `role_ref`(team_role) | `app_user.team_role` `UserAuth.php:188`·`roleOf :120-131` | CANONICAL_ROLE_REGISTRY_CANDIDATE | EXISTS(vocabulary만) |
| `role_version_ref` | Role Version 개념 없음 | — | **ABSENT(순신규)** |
| `required`/`multiple_allowed`/`wildcard_allowed`/`descendants_allowed`/`exact_match`/`maximum_scope_breadth`/`validation_policy` | Scope **요구 구조** 선언·상한 정책 부재 | — | **ABSENT(순신규)** |
| LEGAL_ENTITY/ORGANIZATION(_SUBTREE)/PROJECT/REGION/RESOURCE_INSTANCE/RESOURCE_VERSION/AMOUNT/CURRENCY/TIME/ENVIRONMENT 축 | 해당 Scope 축 자체 부재 | — | **ABSENT** |

★`data_scope`(`:218-322`)와 api_key `scopes_json`/defaultScopes(`Keys.php:189-194`)는 **실 Scope 값**을 담는 substrate이지 "부여 시 요구 구조"가 아니다(실값 결합=Part 3-4). Role Scope Requirement는 그 위에 얹는 순신규 요구 구조이며, 조직/법인/프로젝트/자원 인스턴스 등 대부분의 Scope 축은 레포에 부재(정직 ABSENT).

## ⑤ 설계원칙

- **★Role Definition에 실제 Org ID/Resource ID 하드코딩 금지**: Role은 "어떤 Scope 축을 요구하는가"만 선언하고, 실 값(특정 acct_1·resource_42)은 Assignment 시점(Part 3-3)에 지정·Scoped Role(Part 3-4)에서 결합·검증. Role Definition은 값-불변.
- **Golden Rule**: 실 Scope 값 substrate는 `data_scope`(`TeamPermissions.php:218-322`)·api_key `scopes_json`/defaultScopes(`Keys.php:189-194`)를 확장한다 — 별도 Scope 저장 엔진 신설 금지. 이 문서는 그 위의 **요구 구조** 층만 정의.
- **Least Privilege·과대 부여 차단**: `wildcard_allowed` 기본 false · `maximum_scope_breadth` 상한 · `exact_match` 우선. 모호 광역 Scope(ALL/`*`) 자동 활성 금지(ADR §D-5).
- **Role ≠ Permission**: Scope Requirement는 Role 부여의 범위 축이지 Permission 능력 축이 아니다. 금액/통화 축(AMOUNT_REF/CURRENCY_REF) 요구는 선언만 하고 실 한도 Authority 검증은 Part 5.
- **Version 결합·불변**: Role Version ↔ Scope Requirement 봉인 · In-place Update 금지.
- **Mandatory Control**(ADR §D-6): Tenant Isolation·Version Binding·Wildcard 제한·Historical Immutability 비활성 불가.
- 실 구현 = 별도 승인세션(RP-002). **코드/DB 변경 0 · NOT_CERTIFIED**.

## ⑥ Gap

- **G1 BLOCKED_PREREQUISITE(RP-002·Part 3-4)**: 실 Scope 값 결합·검증 실행은 Scoped Role(Part 3-4)의 몫 — 요구 구조 선언만으로는 런타임 집행 불가.
- **G2 ABSENT(순신규)**: Role Version·Scope **요구 구조**(required/multiple/wildcard/descendants/exact_match/maximum_scope_breadth/validation_policy)·digest = 전부 신규.
- **G3 ABSENT(Scope 축)**: LEGAL_ENTITY·ORGANIZATION(_SUBTREE)·PROJECT·REGION·RESOURCE_INSTANCE·RESOURCE_VERSION·AMOUNT·CURRENCY·TIME·ENVIRONMENT 축 자체 레포 부재(정직 부재·오탐 금지).
- **G4 PARTIAL**: 실 Scope 값 재료(`data_scope :218-322`·api_key `scopes_json`/defaultScopes `Keys.php:189-194`)와 TENANT 격리(`team_id :562`)는 실재하나 "부여 시 요구 구조" 층 미분리 → Part 3-4에서 결합.
