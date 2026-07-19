# DSAR — Role Registry Simulation Foundation (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity 설계)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Decision Core + Permission Engine 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **반날조 규율**: 모든 `file:line`은 위 2문서에서만 인용. 없으면 **ABSENT**. Role≠Permission≠Authority. 289차 폐기 `admin_roles`/`user_roles` 재부활·재플래그 금지.

---

## 1. 목적 (Purpose)

Role Definition에 대한 변경(권한 추가/제거·버전 변경·Group/Bundle 조정·Scope/Actor/Assignment/Risk/Owner 변경·Deprecate/Retire/Replace)을 **실제 반영하기 전에 그 영향을 예측(Simulation)** 하는 엔티티를 설계 정본으로 정의한다.

★핵심 안전 원칙: Simulation은 **실제 Role/Assignment/Mapping/Cache를 절대 변경하지 않는다**(read-only what-if). 산출물은 예측 리포트뿐이며, 특히 "권한 확대·Scope 확장"을 사전 가시화해 Least Privilege 위반과 무후퇴 위반을 사전 차단한다. 순신규 — 현행 substrate에 role what-if 개념 ABSENT.

## 2. Canonical 필드 (Simulation Record)

| 필드 | 설명 |
|---|---|
| simulation_id | 시뮬레이션 식별자 |
| simulation_type | 아래 열거형 |
| role_definition_id / base_version | 대상 Role Definition·기준 버전 |
| proposed_change | 제안 변경 명세(비적용) |
| current_permission_set / simulated_permission_set | 현재 vs 시뮬레이션 결과 Permission 집합 |
| added / removed | 추가·제거된 Permission |
| risk_delta | Risk Increase / Reduction |
| scope_delta | Scope Expansion / Reduction |
| existing_assignment_impact | 영향받는 기존 Assignment 규모·목록 |
| requirement | Migration / Review / Certification 요구 여부 |
| applied | 항상 false(비파괴 증거) |

## 3. 열거형 (Simulation Type)

- `ADD_PERMISSION` · `REMOVE_PERMISSION` · `CHANGE_PERMISSION_VERSION`
- `ADD_GROUP` · `REMOVE_GROUP` · `CHANGE_GROUP`
- `ADD_BUNDLE` · `REMOVE_BUNDLE` · `CHANGE_BUNDLE`
- `CHANGE_SCOPE_REQUIREMENT`
- `CHANGE_ACTOR_ELIGIBILITY`
- `CHANGE_ASSIGNMENT_POLICY`
- `CHANGE_OWNER`
- `CHANGE_RISK` · `CHANGE_CRITICALITY`
- `DEPRECATE` · `RETIRE` · `REPLACE_ROLE`

## 4. Substrate 매핑 (§5.2 + file:line)

| Simulation Type | 실존 substrate | file:line | 태그 |
|---|---|---|---|
| ADD/REMOVE_PERMISSION (권한 집합 산출) | acl_permission(menu×8 action) | `TeamPermissions.php:39,152-159` | PARTIAL(버전 없음) |
| CHANGE_SCOPE_REQUIREMENT (scope delta) | data_scope(9 dims 행필터) | `TeamPermissions.php:41,218-322` | PARTIAL |
| CHANGE_ACTOR_ELIGIBILITY | api_key role·defaultScopes | `Keys.php:95,189-194` | CANONICAL(API_CLIENT) |
| existing_assignment_impact | team_role 도출·team_id | `UserAuth.php:316`·`TeamPermissions.php:562` | 정형화 substrate |
| DEPRECATE/RETIRE (Lifecycle 영향) | isMaster·신규 admin=sub 강제 | `UserAdmin.php:43-46`·`:298-301` | SUB_ROLE_CANDIDATE |
| CHANGE_PERMISSION_VERSION | Permission Version 개념 | ABSENT | 순신규(Part 2) |
| ADD/REMOVE/CHANGE GROUP·BUNDLE | Group/Bundle 개념 | ABSENT | 순신규 |
| CHANGE_RISK / CHANGE_CRITICALITY / CHANGE_OWNER | Risk/Criticality/Owner 개념 | ABSENT | 순신규 |
| REPLACE_ROLE | Replacement 관계 | ABSENT | 순신규 |

## 5. 설계 원칙 (Design Principles)

- **★실제 변경 없음(read-only what-if)**: Role/Assignment/Mapping/Cache 무변경. `applied`=항상 false. 무후퇴·비파괴.
- **권한 확대 사전 가시화**: `added`·`risk_delta(Increase)`·`scope_delta(Expansion)`를 명시 산출 → Least Privilege(§D-5)·모호 단독 Role 자동활성 금지 준수를 사전 검증.
- **Role≠Permission≠Authority≠Plan**: 시뮬레이션은 Role Definition의 Permission 집합만 계산. Approval Authority(Part 5) 부여를 시뮬레이션하지 않으며, plan god flag를 우회 경로로 반영 금지.
- **오탐 방지**: `REPLACE_ROLE`가 `admin_roles`/`user_roles`(289차 폐기) 재부활을 의미하지 않는다 — 대체 대상은 Canonical Role. 폐기 계층을 시뮬레이션 소스로 쓰지 않는다.

## 6. Gap

- Canonical Permission Set 계산기 부재(acl_permission·roleRank→scope·admin_menus 3분산) → `current/simulated_permission_set` 통합 산출 불가(BLOCKED_PREREQUISITE).
- Permission Version/Group/Bundle 순신규 → 관련 simulation_type 예측 불가(선행 Part 2 실구현 후).
- Risk/Criticality/Owner/Replacement substrate 부재 → 해당 type 순신규.
- 시뮬레이션 엔진·저장소 미확정(설계). 실 엔진=RP-002 별도 승인세션.
