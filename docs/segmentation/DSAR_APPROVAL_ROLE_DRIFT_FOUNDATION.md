# DSAR — Role Registry Drift Foundation (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity 설계)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Decision Core + Permission Engine 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **반날조 규율**: 모든 `file:line`은 위 2문서에서만 인용. 없으면 **ABSENT**. Role≠Permission≠Authority. 289차 폐기 `admin_roles`/`user_roles` 재부활·재플래그 금지.

---

## 1. 목적 (Purpose)

Role Definition의 **활성 버전에 묶여 배포·캐시·집행된 상태**가, 그 이후 발생한 Role/Permission/Group/Bundle/Policy 변경과 **불일치(Drift)** 하는 조건을 정형 탐지하기 위한 Drift 엔티티를 설계 정본으로 정의한다. Drift는 스스로 Role Definition을 수정하지 않으며(무후퇴·Historical Immutability), 오직 "런타임 차단(runtime_blocked)"과 "재검증 요구(revalidation_required)"의 신호원으로만 작동한다. 순신규 — 현행 substrate에 Role 버전 간 drift 개념 자체가 ABSENT(`EXISTING_IMPLEMENTATION §3` Version=ABSENT·Snapshot=ABSENT).

## 2. Canonical 필드 (Drift Record)

| 필드 | 설명 |
|---|---|
| drift_type | 아래 열거형 |
| role_definition_id | 대상 Role Definition |
| role_version | Drift가 관측된 Role Definition 버전 |
| previous_digest | 이전(배포/캐시된) 상태 다이제스트 |
| current_digest | 현재(재계산) 상태 다이제스트 |
| severity | `INFO` · `LOW` · `MEDIUM` · `HIGH` · `CRITICAL` |
| runtime_blocked | 런타임 인가 차단 여부(Retired/Suspended·CRITICAL 시 true) |
| revalidation_required | 재검증 요구 여부(Revalidation 엔티티 트리거) |
| resolved_by | 해소 주체·Revalidation Record 참조(미해소=OPEN) |

## 3. 열거형 (Drift Type)

- `ROLE_VERSION_DRIFT` — Role Definition 활성 버전과 소비지 결합 버전 불일치
- `ROLE_STATUS_DRIFT` — Lifecycle 상태(Draft~Archived) 불일치
- `PERMISSION_VERSION_DRIFT` — 매핑된 Permission Version 불일치
- `PERMISSION_STATUS_DRIFT` — Permission 상태(Retired 등) 변경
- `PERMISSION_GROUP_VERSION_DRIFT` — Permission Group 버전 불일치
- `PERMISSION_BUNDLE_VERSION_DRIFT` — Permission Bundle 버전 불일치
- `ACTOR_ELIGIBILITY_DRIFT` — Actor Eligibility(USER/API_CLIENT/SERVICE/SYSTEM) 변경
- `SCOPE_REQUIREMENT_DRIFT` — Scope Requirement(tenant/data_scope/team) 변경
- `ASSIGNMENT_POLICY_DRIFT` — Assignment Policy 변경
- `OWNER_DRIFT` — Business/Technical/Security Owner 변경
- `REVIEW_POLICY_DRIFT` — Review 정책 변경
- `CERTIFICATION_POLICY_DRIFT` — Certification 정책 변경
- `RISK_DRIFT` — Role Risk 등급 변경
- `CRITICALITY_DRIFT` — Role Criticality 변경
- `REPLACEMENT_DRIFT` — Replacement(대체 Role) 관계 변경
- `REGISTRY_DRIFT` — Registry(단일 정본) 무결성 불일치

## 4. Substrate 매핑 (§5.2 + file:line)

| Drift Type | 실존 substrate | file:line | 태그 |
|---|---|---|---|
| ROLE_STATUS_DRIFT | team_role fail-closed 정규화(미해결→member) | `TeamPermissions.php:120-131` | 정형화 substrate |
| PERMISSION_VERSION_DRIFT | acl_permission(menu×action) | `TeamPermissions.php:39,152-159` | PARTIAL(버전 없음) |
| SCOPE_REQUIREMENT_DRIFT | data_scope(9 dims 행필터) | `TeamPermissions.php:41,218-322` | PARTIAL |
| ACTOR_ELIGIBILITY_DRIFT | api_key role(별개 actor axis) | `Keys.php:95`·`index.php:573` | CANONICAL(API_CLIENT) |
| REGISTRY_DRIFT / AdminMenu 정합 | required_role rank 불일치(반쯤 死) | `AdminMenu.php:247`·rank `:74` | CONSOLIDATION_REQUIRED |
| Evidence(변경 로그) | auth_audit_log | `EXISTING_IMPLEMENTATION §3`(PARTIAL) | 변경 로그만 |
| ROLE_VERSION_DRIFT / previous·current digest | 버전·스냅샷 개념 | ABSENT | 순신규 |
| GROUP/BUNDLE/RISK/CRITICALITY/REPLACEMENT DRIFT | 해당 개념 | ABSENT | 순신규 |
| OWNER_DRIFT | 역할 소유 개념 | ABSENT | 순신규 |

## 5. 설계 원칙 (Design Principles)

- **비파괴 신호원**: Drift는 관측만 하고 Role Definition을 In-place Update 하지 않는다. 해소는 신 버전/재검증(Revalidation)으로 처리(무후퇴).
- **runtime_blocked = Mandatory Control**: Retired Runtime Block·Deprecated Assignment Block(§D-6)은 고객설정으로 비활성 불가. CRITICAL severity는 fail-closed 차단.
- **Role≠Permission≠Authority**: Permission Version/Status Drift는 Role Drift로 위장하지 않고 별 drift_type으로 구분(Part 2 Permission Engine 소유 데이터를 참조만).
- **오탐 방지**: `plan 'admin'` god flag 누출(`TeamPermissions.php:132`)은 Role Drift가 아니라 §6.5 위반의 후속 정합 대상 — Drift로 재플래그하지 않는다. `admin_roles`/`user_roles` 폐기(289차)를 Drift로 계상 금지.

## 6. Gap

- Role Version/Snapshot/Digest 순신규 → `previous_digest`/`current_digest` 비교 기반 전무(BLOCKED_PREREQUISITE).
- Permission Version 결합은 선행 Part 2 Permission Engine(설계·코드 0) 실구현 후 가능 → `PERMISSION_*_DRIFT` 계열 산출 불가.
- Group/Bundle/Risk/Criticality/Replacement/Owner 개념 substrate 부재 → 해당 drift_type 순신규.
- severity 산정·digest 알고리즘·저장소 미확정(설계). 실 엔진=RP-002 별도 승인세션.
