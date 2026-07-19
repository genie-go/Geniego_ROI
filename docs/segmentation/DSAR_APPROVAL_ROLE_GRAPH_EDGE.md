# DSAR — Approval Role Graph Edge (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Graph Edge)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_GRAPH_EDGE`는 Role Graph Version(§30) 내부에서 두 Node 간 관계를 표현한다. §12 Role Hierarchy Edge와 값공간이 유사하나 Graph Edge는 그래프 전체 investigation을 위해 세 종류를 추가로 지원한다: `CONFLICTS_WITH`(§18 Role Conflict를 그래프 위에서 직접 조회 가능하게 함) · `SUPERSEDES`(Deprecated/Retired Role이 신규 Role로 대체됐음을 그래프 상에서 추적·§49) · `ALIAS_REFERENCE`(동일 Role의 별칭 매핑을 그래프 상에서 순환 없이 추적·§46 Ambiguity Detection 입력). `parent_id`만 저장하는 방식(§6.4 금지)과 달리 모든 Edge는 Type+Direction+6종 Propagation Policy(Permission/Deny/Scope/Constraint/Actor/Validity)를 명시적으로 저장한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| graph edge id | Edge PK |
| graph version id | 상위 Graph Version(§30) 참조 |
| source node id | 출발 Node(§31) 참조 |
| target node id | 도착 Node(§31) 참조 |
| edge type | 아래 Edge Type enum |
| direction | Inheritance Direction(§9 참조, 기본값 EXPLICIT_EDGE_DIRECTION_ONLY) |
| transitive | 이 Edge가 전이적으로 전파되는지 여부 |
| priority | 동일 Source·Target 다중 Edge 시 우선순위(§38 Precedence 입력) |
| propagation policy | Permission Propagation Policy(§13 Role Inclusion 6요소 중 하나) |
| scope policy | Scope Propagation Policy(§39, 기본 INTERSECTION) |
| deny policy | Deny Propagation Policy(§6.8 항상 보존) |
| actor policy | Actor Eligibility Propagation Policy(§6.9 교집합) |
| validity policy | Validity Propagation Policy(§41 교집합) |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Edge Type**: `INCLUDES · INHERITS · SPECIALIZES · RESTRICTS · DEPENDS_ON · EXCLUDES · CONFLICTS_WITH · COMPOSES · SUPERSEDES · ALIAS_REFERENCE · CUSTOM`

(§12 Role Hierarchy Edge의 `IMPLIES`는 Graph Edge 값공간에 없으며, 대신 그래프 투영 전용 `CONFLICTS_WITH`·`SUPERSEDES`·`ALIAS_REFERENCE` 3종이 추가된다 — 스펙 §32 원문 그대로.)

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Edge 자체(source/target node + 6종 policy) | ABSENT(순신규) | Role↔Role Edge 개념 전무(GROUND_TRUTH §4 "Circular Hierarchy Detection … Ancestor·Descendant Resolution = 전무") |
| `parent_id`만 저장(금지 대상 자체) | Hardcoded Parent-child(메뉴) | `menu_tree.parent_id`(`AdminMenu.php:108,117,268`) — 이것이 정확히 §6.4가 금지하는 "parent_id만 저장" 안티패턴의 실 사례이나 대상은 메뉴이지 Role 아님(§66 "Organization Hierarchy를 Role Hierarchy로 중복" 위험 지점) |
| CONFLICTS_WITH 근접(비-Role Cycle Detection) | 근접 알고리즘(Role 아닌 도메인) | 메뉴 `wouldCycle`(`AdminMenu.php:540-555`)·PM 태스크 의존성 cycle 검출(`PM/Dependencies.php:10`) — §44 참조 패턴일 뿐 Role Edge 아님 |
| SUPERSEDES 근접 | ABSENT(순신규) | 대응 substrate 없음 |
| ALIAS_REFERENCE 근접 | ABSENT(순신규) | 대응 substrate 없음 |

## 5. 설계 원칙

- `INCLUDES`/`INHERITS`를 단순 Permission Union으로 구현 금지(§13) — 6종 Propagation Policy를 모두 명시해야 Edge가 유효하다.
- `CONFLICTS_WITH` Edge 존재는 Composite 활성화(§18 Critical Conflict) 및 Runtime Resolution(§69)을 차단하는 근거로 직접 조회 가능해야 한다.
- `SUPERSEDES` Edge는 Deprecated/Retired Role(§49)의 Migration 경로를 그래프 상에서 추적하되, Active Graph에서 Retired Node를 거치는 traversal은 Runtime Guard로 차단한다(§6.12).
- `ALIAS_REFERENCE`는 자기 자신을 가리키는 Alias Cycle을 금지 대상에 명시 포함한다(§44 "Alias Cycle").
- `menu_tree.parent_id`의 "parent_id만 저장" 패턴을 Role Graph Edge 설계 시 반면교사로만 참조하고, 메뉴 데이터를 Edge로 흡수하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Graph Edge는 저장소에 대응 substrate가 전무한 **완전 ABSENT(순신규)** 판정이다. §6.4가 명시적으로 경계하는 "parent_id만 저장" 안티패턴의 실사례(`menu_tree.parent_id`)는 메뉴 도메인이지 Role Edge가 아니므로 구현 근거로 인용할 수 없다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
