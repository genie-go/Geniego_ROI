# DSAR — Role Lifecycle (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-1)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Role Definition의 **생애주기 상태**와 허용 전이(Transition)를 규정하는 명세. Role이 설계→검토→승인→활성→중단→폐지→은퇴→보관으로 이동하는 상태 기계를 정의하고, 각 상태에서의 런타임/Assignment 허용을 제한한다. ★**순신규**: 현 substrate의 역할 값은 하드코딩 enum(`team_role` 3값·`api_key.role` 4값)이라 런타임 CRUD·상태 전이가 **원천 불가**하다(폐기된 admin_roles만 유일하게 CRUD를 시도했었으나 DORMANT로 제거).

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `role_code` | 대상 Role Canonical Code |
| `status` | 현재 Lifecycle 상태(§3) |
| `previous_status` | 직전 상태(전이 감사) |
| `transition_reason` | 전이 사유 |
| `transitioned_by` | 전이 수행 actor |
| `transitioned_at` | 전이 시각 |
| `runtime_allowed` | 현 상태에서 런타임 Effective 포함 가능 여부(파생) |
| `assignment_allowed` | 현 상태에서 신규 Assignment 가능 여부(파생) |

## 3. 열거형 / 타입

**status**: `DRAFT` · `REVIEW` · `APPROVED` · `ACTIVE` · `SUSPENDED` · `DEPRECATED` · `RETIRED` · `ARCHIVED`.

**허용 Transition(정상 경로만)**:
`DRAFT→REVIEW` · `REVIEW→APPROVED` · `REVIEW→DRAFT`(반려) · `APPROVED→ACTIVE` · `ACTIVE→SUSPENDED` · `SUSPENDED→ACTIVE`(복원) · `ACTIVE→DEPRECATED` · `DEPRECATED→RETIRED` · `RETIRED→ARCHIVED` · (`SUSPENDED→DEPRECATED` 허용).

**금지 전이(예시)**: `DRAFT→ACTIVE`(검토·승인 건너뜀) · `RETIRED→ACTIVE`(은퇴 부활) · `ARCHIVED→*`(보관 후 재활성) · 역방향 임의 전이.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 역할 값 집합(하드코딩) | `team_role`(owner/manager/member) | 하드코딩 enum(런타임 CRUD 불가) | `UserAuth.php:188`·`TeamPermissions.php:120-131` |
| API 역할 값(하드코딩) | `api_key.role` validRoles | 하드코딩 enum | `Keys.php:95` |
| 유일한 CRUD 시도(폐기) | `admin_roles`/`user_roles` | DEPRECATED(289차 폐기·재부활 금지) | `routes.php:1670`·`UserAdmin.php:596-599` |

★**정직**: `status` 8상태·전이 상태 기계·허용/금지 Transition·`transition_reason`/`transitioned_by`/`runtime_allowed`/`assignment_allowed` = **전부 순신규 ABSENT**. 현 역할은 코드 상수라 Draft/Review/Suspended/Deprecated/Retired/Archived 라는 생애 상태 자체가 존재하지 않는다. Lifecycle(EXISTING §3)=ABSENT. 폐기 admin_roles가 유일한 CRUD 근접이었으나 재부활 금지.

## 5. 설계 원칙 / 결정

- **상태별 런타임/Assignment 제한**:
  - `DRAFT`/`REVIEW` — 런타임 Effective 포함·Assignment **금지**(미승인 역할).
  - `APPROVED` — Assignment 준비 상태·활성 전 런타임 미포함.
  - `ACTIVE` — 정상 런타임·Assignment 허용.
  - `SUSPENDED` — 신규 Assignment 금지 + **기존 Effective 즉시 제거**(런타임 중지·상세 [`DSAR_APPROVAL_ROLE_SUSPENSION`](DSAR_APPROVAL_ROLE_SUSPENSION.md)).
  - `DEPRECATED` — 신규 Assignment 금지·기존 유지+Migration 유도(상세 [`DSAR_APPROVAL_ROLE_DEPRECATION`](DSAR_APPROVAL_ROLE_DEPRECATION.md)).
  - `RETIRED` — 런타임 무효(Effective 미포함)·상세 [`DSAR_APPROVAL_ROLE_RETIREMENT`](DSAR_APPROVAL_ROLE_RETIREMENT.md).
  - `ARCHIVED` — Historical 참조 전용.
- **비정상 Transition 차단(fail-closed)**: 허용 목록 외 전이는 거부·감사. 승인/검토 건너뛴 활성화 불가.
- **Role Definition은 In-place 삭제 금지** — 폐기/은퇴/보관은 상태 전이로만(파괴적 DROP 금지·폐기 admin_roles도 고아 유지 원칙과 정합).
- Lifecycle ≠ Version(별 엔티티·[`DSAR_APPROVAL_ROLE_VALIDITY`](DSAR_APPROVAL_ROLE_VALIDITY.md)): 상태와 유효 버전은 독립.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Lifecycle 8상태·전이 게이트·상태별 제한 = 순신규(하드코딩 enum은 런타임 상태 전이 불가).
- **BLOCKED_PREREQUISITE(RP-002)**: 전이 감사·불변 기록은 선행 불변 Ledger/Decision Core 부재로 공회전.
- 실 Role Registry(데이터화된 역할)가 선행되어야 Lifecycle이 의미를 가짐 — 현 하드코딩 substrate에는 부착 불가.
- 폐기 admin_roles/user_roles 재부활·재플래그 금지. 289차 P1~P4 재플래그 금지.
