# DSAR — Approval Role Specialization (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Specialization)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · Cycle 금지·Scope Intersection·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조

## 1. 목적

Role Specialization은 스펙 §15가 정의하는 `SPECIALIZES` Edge 관계로, Child/Target Role이 Base Role의 기능을 유지하면서 더 제한적이고 구체적인 Scope·Constraint·Permission을 갖는 경우를 정형화한다. 스펙 예시: Payment Approver → Korea Payment Approver → Seoul Organization Payment Approver → High-value Payment Approver Reference. Specialization은 상위 Edge Type 목록(§12: INCLUDES·INHERITS·SPECIALIZES·RESTRICTS·DEPENDS_ON·EXCLUDES·IMPLIES·COMPOSES) 중 하나이며, INCLUDES(단순 Permission Union 금지·§13)나 RESTRICTS(Deny 우선·§16)와 목적이 다르다 — Specialization의 기본은 **Scope 축소 + Constraint 강화**이며 자동 확대는 금지된다(§6.7 Default Scope Intersection).

## 2. Canonical 필드

Specialization은 별도 테이블이 아니라 `APPROVAL_ROLE_HIERARCHY_EDGE`(§12)의 `edge_type=SPECIALIZES` 인스턴스로 표현된다. 관련 필드:

| 필드 | 의미 |
|---|---|
| `edge_id` | Edge 식별자(PK) |
| `hierarchy_version_id` | 소속 Hierarchy Version |
| `source_node_id` / `target_node_id` | Base Role(Source) → Specialized Role(Target) |
| `source_role_version_id` / `target_role_version_id` | 버전 결합(§14 Role Version Binding) |
| `edge_type` | 고정값 `SPECIALIZES` |
| `inheritance_direction` | §9 Inheritance Direction(기본 `EXPLICIT_EDGE_DIRECTION_ONLY`) |
| `scope_propagation_policy` | Specialization 기본=`INTERSECTION`/`MOST_SPECIFIC`(§26·§39) — 자동 확대 금지 |
| `constraint_propagation_policy` | 강화 방향만 허용(§40 Role Constraint Propagation) |
| `permission_propagation_policy` / `deny_propagation_policy` | Base 기능 유지 원칙과 Explicit Deny 보존(§6.8) |
| `actor_eligibility_policy` / `validity_propagation_policy` | §27·§41 교집합 |
| `transitive 여부` / `priority` / `maximum_propagation_depth` | §12 공통 Edge 필드 |
| `conflict_policy_reference` / `condition_reference` | 선택 |
| `valid_from` / `valid_to` / `status` / `immutable_digest` / `evidence` | 공통 거버넌스 필드 |

Node 측에서는 §11 `APPROVAL_ROLE_HIERARCHY_NODE`의 `node_type=SPECIALIZED`가 대응한다.

## 3. 열거형 / 타입

- **Edge Type**(§12): `SPECIALIZES` — `INCLUDES`·`INHERITS`·`RESTRICTS`·`DEPENDS_ON`·`EXCLUDES`·`IMPLIES`·`COMPOSES`·`CUSTOM`과 구분되는 별도 값.
- **Node Type**(§11): `SPECIALIZED` — `ROOT`·`INTERMEDIATE`·`LEAF`·`ABSTRACT`·`COMPOSITE`·`RESTRICTED`·`CUSTOM`과 구분.
- **Scope Propagation Policy**(§39, Specialization 적용 시 기본값): `INTERSECTION` · `MOST_SPECIFIC` — `NO_PROPAGATION`·`CHILD_RESTRICTS_PARENT`·`PARENT_RESTRICTS_CHILD`·`EXPLICIT_MAPPING`·`CUSTOM`도 §39 전체 값공간에 존재하나 Specialization의 기본 의미론과는 축소 방향이 결합.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| `SPECIALIZES` Edge / `SPECIALIZED` Node | **ABSENT → 신설** | Role↔Role 특수화 관계 개념 자체가 저장소에 없음(전수조사 §4 "Composite Role/Component/Nested Composite=전무"·Role Graph 전체 grep 0건) |
| Scope 축소·Constraint 강화 강제 | **ABSENT** | 없음 |
| 근접 알고리즘(참조용·비-Role 도메인) | 참조만 · 오흡수 금지 | `effectiveScope`(fail-closed·상속 시 실패→DENY_SCOPE) `TeamPermissions.php:236-265`(§5 근접 패턴 표 "Effective Scope(fail-closed)" 항목) — Permission Scope 축의 fail-closed 계산이지 Role 간 SPECIALIZES Edge가 아님 |

★Base Role을 세분화하는 Role Definition(예: "Korea Payment Approver") 자체도 Part 3-1 전수조사에서 확인된 5개 role 어휘(team_role/api_key role/admin_level/AdminMenu ROLE_ENUM/plan)에 존재하지 않는다 — Specialization Edge 이전에 세분화된 Role Node 후보 자체가 순신설 대상.

## 5. 설계 원칙

1. **Scope 축소 기본·Constraint 강화**(스펙 §15 원문) — 확대 금지.
2. **자동 확대 금지**(§6.7 Default Scope Intersection·§42 Scope Expansion Guard) — Specialization Edge 활성화 시 Scope Expansion Guard 검증 통과 필요.
3. **SPECIALIZES ≠ INCLUDES**(§13, 단순 Permission Union 금지) **≠ RESTRICTS**(§16, Explicit Deny 추가 목적) — 세 Edge Type은 목적이 다르며 혼용 금지.
4. **Base Role 기능 유지** — 기능 상실이 아니라 범위 축소만(§14 Role Inheritance 원칙: Permission Version Binding·Tenant 일치·Actor Eligibility 일치 유지).
5. **Golden Rule** — 실 substrate 부재(순신설)이나 `effectiveScope` fail-closed 계산(비-Role 도메인)을 알고리즘 참조로만 사용, Role Graph로 오흡수 금지(§6.1·§6.2 경계).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: SPECIALIZES Edge 실 강제(Scope Expansion Guard·Constraint Propagation)는 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: `SPECIALIZES` Edge Type·`SPECIALIZED` Node Type·세분화 Role Definition 후보 전부 순신설.
- **Gap-2**: Scope Expansion Guard(§42)·Constraint Propagation(§40) 실 검증 로직 전무 — Specialization 활성화 시 확대 여부를 판정할 substrate 없음.
- **정직 부재**: `parent_user_id`/`menu_tree`/roleRank(전수조사 §1) 중 어느 것도 Specialization 의미(Base 기능 유지+범위 축소)를 갖지 않음 — 이들을 Specialization Edge로 오변환 금지(ADR D-1·D-2).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
