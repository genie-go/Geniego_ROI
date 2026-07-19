# DSAR — Permission Bundle (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT**로 정직 표기 · Part 1 D-2(4건)·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_BUNDLE`는 **배포/상품/모듈/기능 단위로 표준화된 Permission Package** — 여러 개별 Permission을 하나의 재사용 가능한 묶음으로 정형화한 선언체다. 목적은 (a) 반복 부여되는 Permission 집합을 표준 패키지로 캡슐화하고, (b) actor/role/client 타입별 **적용 대상**과 **필수·선택·배제 Permission**을 명시하며, (c) 부여 시 Compatibility·SoD·Approval Authority Hook의 진입점을 제공하는 것이다.

Bundle은 **Grant가 아니다** — Bundle은 "무엇을 한 묶음으로 부여할 수 있는가"의 **정의(Definition-level Template)**이고, 실제 부여는 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md)의 `BUNDLE_DERIVED` type이 참조로 수행한다. Bundle ≠ Role([P3](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)) ≠ Authority(P5). Role은 Subject 부여 축, Bundle은 Permission 묶음 축, Authority는 금액/통화/법인 한도 축으로 직교한다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `bundle_id` | Canonical 식별자 |
| `tenant_id` | 귀속 테넌트(전역 표준 Bundle은 `__shared__` 스코프) |
| `bundle_code` | `{DOMAIN}:BUNDLE:{NAME}` Canonical Code |
| `bundle_type` | ③ 열거형 |
| `display_name` / `description` | 표기·설명(판정 사용 금지) |
| `target_actor_types` | 적용 대상 actor type(HUMAN/SERVICE_ACCOUNT/…) |
| `target_role_refs` | 적용 대상 Role 참조(P3 Adapter Contract) |
| `target_client_types` | 적용 대상 Client Type(API_CLIENT/INTEGRATION/…) |
| `mandatory_permission_refs` | 필수 Permission(제거 불가) |
| `optional_permission_refs` | 선택 Permission(부여 시 선택) |
| `excluded_permission_refs` | 배제 Permission(같은 Bundle에 공존 금지) |
| `risk_level` | LOW/MEDIUM/HIGH/CRITICAL |
| `current_version_id` | 활성 [`BUNDLE_VERSION`](DSAR_APPROVAL_PERMISSION_BUNDLE_VERSION.md) 참조 |
| `status` | ACTIVE/DEPRECATED/RETIRED |
| `digest` | 불변 무결성 해시(Version 축에서 봉인) |

## ③ 열거형

**`bundle_type`**: `STANDARD` · `PRODUCT` · `MODULE` · `FUNCTION` · `INDUSTRY` · `TENANT_TEMPLATE` · `SERVICE_ACCOUNT` · `API_CLIENT` · `MIGRATION` · `CUSTOM`

**예시 표준 Bundle**:
- **Standard Approver Bundle**(`STANDARD`·target=HUMAN·mandatory={approve action}·excluded={자기부여})
- **Payment Operations Bundle**(`FUNCTION`·risk=CRITICAL·target=HUMAN only·SERVICE_ACCOUNT excluded·Approval Authority Hook 필수)

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| Permission vocabulary(묶음 재료) | `TeamPermissions` ACTIONS 8종·MENU_CATALOG 26메뉴 | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:39`, `:55-82` |
| 개별 Permission grant 재료 | `acl_permission` (menu×action) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-171` |
| 부여상한(Bundle 부여도 상속) | `assignableMap`·`putMemberPermissions`·`clampActions` | 위임상한 확장점 | `TeamPermissions.php:354-360`, `:628-647`, `:396-402` |
| **Bundle 선언체 자체** | — | — | **ABSENT** (표준 Permission Package·type·target·mandatory/optional/excluded 테이블 전무) |
| **Bundle risk_level / version 링크** | — | — | **ABSENT** |

★현행은 개별 `menu_key×action` grant를 **매번 낱개로** 부여할 뿐, 재사용 Package 개념이 없다. Bundle은 순신규 선언체이나, 묶는 **재료**(ACTIONS·MENU_CATALOG·acl_permission)와 부여상한 봉인(`:628-647`)은 실재하므로 "발명이 아니라 조립"이다.

## ⑤ 설계원칙

- **Golden Rule**: Bundle은 `acl_permission` grant substrate(`replacePerms :325`)를 **낱개 대신 묶어** 부여하는 상위 Template — 별도 Permission Registry/Grant 엔진 신설 금지. 부여상한 `:628-647`(DELEGATION_EXCEEDED fail-closed)은 Bundle 부여에도 그대로 상속·확장한다(부여자가 자기 권한을 초과하는 Bundle 부여 불가).
- **Permission ≠ Role ≠ Authority**: Bundle의 `target_role_refs`는 Role을 **참조**만 하며 Role Definition을 소유하지 않는다(P3 Adapter Contract). risk=CRITICAL Bundle의 실제 금액 승인 가부는 P5 Authority가 별도 검증(Hook만 제공).
- **Default Deny·배제 우선**: `excluded_permission_refs`는 `mandatory`/`optional`보다 우선(Deny overrides). Critical Conflict 시 Bundle Grant 차단([`COMPATIBILITY`](DSAR_APPROVAL_PERMISSION_BUNDLE_COMPATIBILITY.md)).
- **불변 버전화**: Bundle 구성 변경은 In-place Update 금지 — 새 [`BUNDLE_VERSION`](DSAR_APPROVAL_PERMISSION_BUNDLE_VERSION.md) 발행·digest 봉인.
- **Mandatory Control**: Tenant Isolation·Canonical Code·Version·Wildcard 제한은 고객설정으로 비활성 불가(ADR §6.16).

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: Bundle의 실 부여는 선행 Part 1 Authorization Decision Core + Canonical Action/Resource Registry가 신설되어야 Binding 가능(Decision 결합 공회전). 실 엔진은 별도 승인세션.
- Bundle 선언체·type·target·mandatory/optional/excluded·risk·version 링크 = **전부 ABSENT**(순신규).
- 현행 `menu_key`가 Canonical `{DOMAIN}:{RESOURCE}:{ACTION}` Code가 아님 → Bundle이 참조할 Permission Code 정규화(Legacy Mapping) 선행 필요.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 본 문서는 설계 명세이며 런타임 기능 증가 0.
