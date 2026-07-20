# DSAR — Approval Role Assignment Conflict Detection (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Conflict Detection · 스펙 §18)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Decision Core 실 구현 부재
- **불변**: 만료/정지/취소는 Version 생성 · Assignment Scope Intersection 기본 · Golden Rule(Extend not Replace·중복 Conflict Engine 신설 금지) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 P1~P4·admin_roles 폐기 재플래그 금지

---

## 1. 목적

스펙 §18 Assignment Conflict는 신규/기존 Assignment 사이의 Duplicate·Conflicting·SoD·Actor·Scope·Version 충돌과, 만료/취소된 Assignment가 여전히 활성으로 취급되는 상태를 **쓰기 시점에 정형 탐지**하는 능력이다. 저장소의 5개 실행 substrate(team_role 3핸들러·api_key 2경로·wms_permissions·pm_task_assignees)는 각자 독립적인 값 검증(화이트리스트·owner 보호)만 수행할 뿐, Assignment 간의 **관계형 충돌**을 탐지하는 로직은 어디에도 없다(GROUND_TRUTH §3·§6). SoD(직무분리)·isManager/isApprover 개념은 Part 3-1 정합상 부재로 이미 확정됐고, 본 편에서도 동일하게 확정한다.

## 2. Canonical 필드

`APPROVAL_ROLE_ASSIGNMENT_CONFLICT`(전부 신규 · 스펙 §18 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | conflict id | Conflict 식별자 |
| 2 | subject id | 대상 Subject |
| 3 | assignment id(신규) / assignment id(기존) | 충돌 쌍 |
| 4 | conflict type | 아래 §3 열거형 |
| 5 | detected at | 탐지 시각(쓰기 시점) |
| 6 | detection source | 어느 쓰기 경로에서 탐지됐는지 |
| 7 | resolution status | 미해결/차단/승인된 예외/해소 |
| 8 | override reason / override approver | SoD 예외 승인 시 근거 |
| 9 | evidence | §27 Assignment Evidence 참조 |

## 3. 열거형 / 타입

**Conflict Type**(스펙 §18 원문): `DUPLICATE_ASSIGNMENT · CONFLICTING_ASSIGNMENT · SOD_CONFLICT · ACTOR_CONFLICT · SCOPE_CONFLICT · EXPIRED_ASSIGNMENT · REVOKED_ASSIGNMENT · MULTIPLE_ACTIVE_ASSIGNMENT · VERSION_CONFLICT`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Conflict Type | 판정 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| DUPLICATE_ASSIGNMENT(물리 중복 방지 근접) | **PARTIAL(근접이나 SoD 아님)** | pm_task_assignees UNIQUE 제약 위반 시 409(`Assignees.php:36-38`) — 동일 (task, actor, role) 재삽입만 차단. team_role/api_key/wms_permissions는 UNIQUE 자체가 없음(wms는 `Wms.php:72-76,114` 스키마상 UNIQUE 부재 확인) |
| CONFLICTING_ASSIGNMENT | **ABSENT** | 신규 Assignment가 기존과 상충하는지 비교하는 로직 grep 0 |
| SOD_CONFLICT | **ABSENT** | isManager/isApprover·직무분리 규칙 부재(GROUND_TRUTH §3·Part 3-1 정합) |
| ACTOR_CONFLICT | **ABSENT** | Subject Type 간 상충 규칙 부재(GROUND_TRUTH §4 Subject 커버리지 표 참조) |
| SCOPE_CONFLICT | **ABSENT** | Assignment Scope 엔티티 자체 부재(effectiveScope는 계산이지 충돌탐지 아님·`TeamPermissions.php:236-265`) |
| EXPIRED_ASSIGNMENT | **PARTIAL(부분 근접)** | api_key만 `expires_at` 요청시점 게이트 실재(`Keys.php:119,170`·`index.php:518-520`). team_role/sub-admin/wms/pm은 만료 필드 자체 없음 |
| REVOKED_ASSIGNMENT | **PARTIAL(근접)** | is_active=0 토글(`UserAuth.php:1445`·`UserAuth.php:1679-1682`·`Keys.php:135-148`/`UserAuth.php:4364-4377`)이 근접이나, "취급 중"으로 재탐지하는 별도 Conflict 로직은 없음(단순 조회 필터) |
| MULTIPLE_ACTIVE_ASSIGNMENT | **ABSENT** | 동일 Subject·Role의 복수 활성 Assignment를 탐지·병합하는 로직 부재 |
| VERSION_CONFLICT | **ABSENT** | Assignment Version 자체 부재. `replacePerms`/`replaceScope`(`TeamPermissions.php:324-336,337-346`)는 DELETE→INSERT로 이전 상태를 소실시켜 Version 개념 부재를 실증 |

## 5. 설계 원칙

- Conflict Detection은 **쓰기 시점 fail-closed 게이트**로 설계한다(승인 없이는 SOD_CONFLICT/ACTOR_CONFLICT/SCOPE_CONFLICT를 통과시키지 않음) — 그러나 실 게이트는 선행 Assignment Registry/Version 신설 이후에만 배선 가능.
- pm_task_assignees UNIQUE(`Assignees.php:36-38`)는 **물리 중복 방지**이지 SoD/Conflict 판정이 아니다(DUPLICATE_AUDIT §2 "UNIQUE 제약=물리 중복 방지지 SoD 아님" 정합) — DUPLICATE_ASSIGNMENT의 참조 패턴으로만 재사용하고 SOD_CONFLICT 대체물로 오흡수하지 않는다.
- EXPIRED_ASSIGNMENT/REVOKED_ASSIGNMENT는 5자원 중 일부에서만 근접 상태값(is_active·expires_at)이 실재하므로, Conflict Detection 신설 시 **자원별 상태 이질성**(wms/pm은 하드 DELETE라 "만료/취소된 Assignment가 남아있는" 개념 자체가 없음)을 그대로 반영해야 하며 일괄 동일 취급 금지.
- VERSION_CONFLICT는 Version 엔티티 신설이 전제 — 지금 시도하면 비교 대상이 없어 항상 무의미(false negative)하게 통과한다.

## 6. Gap / BLOCKED_PREREQUISITE

- SOD_CONFLICT/CONFLICTING_ASSIGNMENT/ACTOR_CONFLICT/SCOPE_CONFLICT/MULTIPLE_ACTIVE_ASSIGNMENT/VERSION_CONFLICT = **전부 ABSENT(순신규)**.
- DUPLICATE_ASSIGNMENT/EXPIRED_ASSIGNMENT/REVOKED_ASSIGNMENT = **PARTIAL** — 자원별 근접 상태값은 실재하나 "충돌 탐지"로 정형화된 로직은 없음(단순 값 저장·요청시점 게이트뿐).
- 실 엔진 = 선행 Assignment Registry/Version(본 Part 본체)·Permission Engine·Role Registry/Hierarchy 실구현 후 별도 승인세션(RP-002). NOT_CERTIFIED.
