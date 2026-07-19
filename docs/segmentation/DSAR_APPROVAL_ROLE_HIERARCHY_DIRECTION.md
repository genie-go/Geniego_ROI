# DSAR — Approval Role Hierarchy Direction (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Direction)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Hierarchy Direction은 Role Hierarchy Definition(§9)의 `inheritance direction` 필드와 Role Hierarchy Edge(§12)의 Edge별 `inheritance direction` 필드가 함께 답해야 하는 질문("Parent가 Child의 Permission을 상속하는가, Child가 Parent의 Permission을 상속하는가, 아니면 방향을 개별 Edge가 명시하는가")을 다루는 정책 개념이다. 스펙이 규정하는 기본값은 Definition 레벨의 암묵 방향이 아니라 **Edge 레벨 명시 방향**(`EXPLICIT_EDGE_DIRECTION_ONLY`)이다. 저장소에는 Parent/Child 의미를 방향 정책으로 명시한 substrate가 없다 — `parent_user_id`(계정)와 `menu_tree.parent_id`(메뉴)는 각기 나름의 암묵 방향(상위→하위 소유/포함)을 갖지만 Role Permission 상속 방향과 무관한 별개 도메인이다.

## 2. Canonical 필드

Direction은 독립 테이블이 아니라 §9(Role Hierarchy Definition)와 §12(Role Hierarchy Edge)에 내장된 필드로 구현된다.

| 필드 | 소속 | 의미 |
|---|---|---|
| inheritance direction | `APPROVAL_ROLE_HIERARCHY`(§9) | Hierarchy Definition 전체의 기본 방향 정책 |
| inheritance direction | `APPROVAL_ROLE_HIERARCHY_EDGE`(§12) | 개별 Edge의 실제 적용 방향(Definition 기본값을 Edge가 override 가능) |
| default edge type | `APPROVAL_ROLE_HIERARCHY`(§9) | 방향과 짝을 이루는 기본 Edge Type |

## 3. 열거형 / 타입

**Inheritance Direction** (스펙 §9): `PARENT_INHERITS_CHILD · CHILD_INHERITS_PARENT · EXPLICIT_EDGE_DIRECTION_ONLY` — **기본값 = `EXPLICIT_EDGE_DIRECTION_ONLY`**.

- `PARENT_INHERITS_CHILD`: 상위(Parent) Role이 하위(Child) Role의 Permission을 상속한다.
- `CHILD_INHERITS_PARENT`: 하위(Child) Role이 상위(Parent) Role의 Permission을 상속한다.
- `EXPLICIT_EDGE_DIRECTION_ONLY`: Definition 레벨 암묵 방향을 두지 않고, 각 Edge(§12)의 `inheritance direction`·`edge type`이 그 Edge에 한해 방향을 명시한다(기본값).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Inheritance Direction 정책 자체 | ABSENT(순신규) | 저장소에 Role 상속 방향을 명시하는 필드/정책 부재(GROUND_TRUTH §4) |
| 상위→하위 암묵 방향(오용 위험 참조) | Organization Hierarchy Candidate(오용 위험) | `parent_user_id` "하위(팀원) 계정의 상위 owner id"(`UserAuth.php:176`)·`team_role = parent_user_id ? 'member' : 'owner'`(`:316`) — owner→member 방향은 **계정 소유 관계**이지 Role Permission 상속 방향이 아님(§6.1). ADR D-2: 오변환 실제 위험 지점 |
| 상위→하위 암묵 방향(메뉴 참조) | Organization Hierarchy Candidate | `menu_tree.parent_id`(`AdminMenu.php:108,117,268`)의 부모→자식 방향은 메뉴 트리 방향이지 Role 상속 방향이 아님 |
| 선형 rank의 암묵 방향(오변환 위험) | Hardcoded Parent-child(순서)·Unversioned Hierarchy | api_key `roleRank`(`index.php:573,592-595`)는 숫자가 클수록 상위 권한이라는 "정렬 순서"이지, 상속 방향(누가 누구의 Permission을 받는가)을 정의하지 않음. ADR D-1: "선형 rank=상속으로 오변환 금지"(§6.2) |

## 5. 설계 원칙

- 기본값은 `EXPLICIT_EDGE_DIRECTION_ONLY`다 — Definition 레벨에서 "위가 아래를 상속한다"는 암묵 규칙을 기본으로 두지 않고, Edge 단위로 방향을 명시해야만 상속이 성립한다(스펙 §9·§6.4).
- Parent/Child의 의미(누가 누구의 Permission을 상속하는지)는 반드시 명시하며, `parent_id` 컬럼 존재만으로 방향을 추론하지 않는다(§6.4·ADR D-3).
- `parent_user_id`(계정 소유 방향)·`menu_tree.parent_id`(메뉴 트리 방향)는 각기 고유한 암묵 방향을 갖는 별개 도메인이며, Role Hierarchy Direction 정책으로 흡수·재해석하지 않는다(§6.1·ADR D-1 경계 보존).
- roleRank의 순서(`index.php:573`)를 "상속 방향"으로 오독하지 않는다 — 이는 API 권한 정렬 순서일 뿐 Role→Role Permission 전파 방향이 아니다(§6.2).
- Direction이 `PARENT_INHERITS_CHILD` 또는 `CHILD_INHERITS_PARENT`로 설정된 Hierarchy라도, 개별 Edge가 다른 Edge Type(RESTRICTS/EXCLUDES 등)을 통해 방향과 무관하게 제한을 가할 수 있다(§16 Role Restriction이 Allow보다 우선).

## 6. Gap / BLOCKED_PREREQUISITE

Role Hierarchy Direction은 **완전 ABSENT(순신규)** 판정이다. 근접 substrate 3종(roleRank/parent_user_id/menu_tree)이 각자의 암묵 방향을 갖지만 전부 Role Permission 상속 방향과 무관한 별개 도메인이며, 이를 Role Hierarchy Direction으로 흡수하면 §6.1 위반이다(ADR D-2 실제 위험 지점으로 명시). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
