# DSAR — Permission Definition (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

개별 Permission의 **불변 선언체**. 무엇을(resource)·어떤 동작(action)을·어떤 효과(effect)로·누구(actor eligibility)에게·어떤 조건(scope)에서 허용/거부하는지의 Canonical 명세. Role이 아니며(Role은 Permission을 묶는 Part 3 상위 개념) Approval Authority도 아님(금액/한도는 Part 5). Definition은 In-place 변경 불가 — 변경은 Version(별도 엔티티)으로만.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `permission_code` | Canonical Code(`{DOMAIN}:{RESOURCE}:{ACTION}`·Namespace 준수) |
| `name` | 사람이 읽는 명칭 |
| `type` | Permission 유형(§3) |
| `domain` | 소속 도메인 |
| `resource_type` | 대상 리소스 유형 |
| `canonical_action` | 정규 동작(ACTIONS 매핑) |
| `effect` | ALLOW/DENY/CONDITIONAL_ALLOW/UI_HINT_ONLY([`DSAR_APPROVAL_PERMISSION_EFFECT`](DSAR_APPROVAL_PERMISSION_EFFECT.md)) |
| `risk` | Risk 등급([`DSAR_APPROVAL_PERMISSION_RISK_CLASSIFICATION`](DSAR_APPROVAL_PERMISSION_RISK_CLASSIFICATION.md)) |
| `actor_eligibility` | 부여 가능 actor 종류(human/service/system/api client) |
| `grant_allowed` | 직접 grant 허용 여부 |
| `scope_required` | scope 결합 필수 여부 |
| `resource_version_binding` | 대상 Resource 버전 결속 요구 |
| `commit_revalidation` | commit 시점 재검증 요구 |
| `current_version` | 현재 유효 Definition 버전 |
| `status` | Lifecycle 상태 |
| `digest` | Definition 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**Permission type**: `RESOURCE_ACTION` · `DATA_ACCESS` · `FIELD_ACCESS` · `ROW_ACCESS` · `API_ACCESS` · `UI_HINT` · `ADMINISTRATIVE` · `APPROVAL_ACTION` · … (확장 가능).

**actor_eligibility**: `HUMAN_USER` · `SERVICE_ACCOUNT` · `SYSTEM` · `API_CLIENT`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| (resource,action) 선언 | `acl_permission`(menu_key×actions CSV) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-171`·`:206-216`·`:325-336` |
| canonical_action 후보 | `ACTIONS` 8동작 | 정형화 | `TeamPermissions.php:39` |
| ROW_ACCESS type | `data_scope`(9 dims·행필터) | ROW/DATA_SCOPE_CANDIDATE | `TeamPermissions.php:160-171`·`:218-322` |
| API_ACCESS type | api_key scopes + index.php RBAC | CANONICAL(PEP) | `index.php:553-603`·`Keys.php:191,204` |
| resolver(current 계산) | `effectiveForUser` | EXISTS(미영속) | `TeamPermissions.php:366` |

★**정직**: `type`(RESOURCE_ACTION/FIELD_ACCESS/APPROVAL_ACTION 등)·`actor_eligibility`·`effect` 필드·`resource_version_binding`·`commit_revalidation`·`digest`·`current_version` = **순신규 ABSENT**. FIELD_ACCESS(필드 단위) substrate 전무. 현 acl_permission은 (menu_key, actions) 쌍만·effect/risk/actor 축 없음.

## 5. 설계 원칙 / 결정

- Permission ≠ Role(P3) ≠ Approval Authority(P5) — Definition은 Role Definition과 동일 Entity로 만들지 않음.
- effect 누락 = Deny(fail-closed). UI_HINT effect는 서버 permit 아님.
- Definition은 불변 — 변경은 [`DSAR_APPROVAL_PERMISSION_DEFINITION_VERSION`](DSAR_APPROVAL_PERMISSION_DEFINITION_VERSION.md)로만(In-place Update 금지).
- HIGH+ risk는 `resource_version_binding`·`commit_revalidation` 필수(Risk별 Control 참조).
- Golden Rule: acl_permission을 Definition substrate로 확장·정형화(중복 Definition store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: effect/risk/actor_eligibility/version binding/FIELD_ACCESS = 순신규.
- **BLOCKED_PREREQUISITE**: resource_version_binding·commit_revalidation은 선행 Canonical Resource Registry + Decision Core 부재로 상위 결합 공회전 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
