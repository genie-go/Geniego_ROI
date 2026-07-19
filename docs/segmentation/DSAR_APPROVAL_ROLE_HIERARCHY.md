# DSAR — Approval Role Hierarchy Definition (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Definition)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_HIERARCHY`는 하나의 Hierarchy Registry(§8) 아래 실제로 정의되는 개별 Role 위계 그래프 하나를 표현한다. Hierarchy Type(FUNCTIONAL/BUSINESS/APPROVAL/…)·Inheritance Direction(Parent가 Child를 상속하는지, 반대인지, 아니면 방향을 명시 Edge로만 표현하는지)·Root/Multiple Root/Multiple Inheritance 허용 여부·기본 정책(Edge Type·Scope 전파·Permission 집계·Conflict 해소·Actor Eligibility)을 정의의 레벨에서 고정한다. 저장소에는 이런 "정의된 Role 위계 그래프" 자체가 없다 — 있는 것은 로직 곳곳에 흩어진 3종의 위계 유사 substrate(roleRank/parent_user_id/menu_tree)뿐이며, 이들은 각각 별개 대상을 가리키므로 이번 Part 3-2가 정의하려는 Role↔Role Hierarchy Definition의 근접 substrate가 아니다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| role hierarchy id | Definition PK |
| hierarchy registry id | 소속 Registry(§8) FK |
| tenant id | 소속 테넌트 |
| hierarchy code | 고유 코드 |
| hierarchy name | 표시명 |
| description | 설명 |
| hierarchy type | 아래 Hierarchy Type enum |
| inheritance direction | 아래 Inheritance Direction enum(기본값 `EXPLICIT_EDGE_DIRECTION_ONLY`) |
| root role required | Root Role 존재 강제 여부 |
| multiple roots allowed | 복수 Root 허용 여부 |
| multiple inheritance allowed | 다중 상속(하나의 Node가 여러 Parent) 허용 여부 |
| maximum depth | 최대 깊이 |
| default edge type | 기본 Edge Type(§12) |
| default scope propagation | 기본 Scope 전파(기본 Intersection·§6.7) |
| default permission aggregation | 기본 Permission 집계 정책 |
| default conflict resolution | 기본 Conflict 해소 정책 |
| default actor eligibility policy | 기본 Actor Eligibility 정책(기본 교집합·§6.9) |
| current version id | 현재 Active `APPROVAL_ROLE_HIERARCHY_VERSION`(§10) 참조 |
| owner | 소유자 |
| valid from / valid to | 유효 기간 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Hierarchy Type**: `FUNCTIONAL · BUSINESS · APPROVAL · ADMINISTRATIVE · SECURITY · DATA_ACCESS · SERVICE · SYSTEM · API_CLIENT · CUSTOM`

**Inheritance Direction**: `PARENT_INHERITS_CHILD · CHILD_INHERITS_PARENT · EXPLICIT_EDGE_DIRECTION_ONLY` (기본값 = `EXPLICIT_EDGE_DIRECTION_ONLY`)

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Hierarchy Definition 자체 | ABSENT(순신규) | Role Hierarchy/Graph 개념 전무(GROUND_TRUTH §4·백엔드 PHP grep 0건: hierarchy·composite·ancestor·descendant 등) |
| hierarchy type=API_CLIENT (근접) | Hardcoded Parent-child(순서)·Unversioned Hierarchy | api_key `roleRank`(`index.php:573,592-595`) — 선형 전순서일 뿐 Hierarchy Definition(root/direction/edge type 없음)이 아님. ADR D-1: Category/Actor 축 별도 Registry로 정규화, Hierarchy Definition으로 오변환 금지 |
| inheritance direction(오용 위험 참조) | Organization Hierarchy Candidate(오용 위험) | `parent_user_id` owner→member(`UserAuth.php:176,316,423-426`)는 "상위가 하위를 상속"하는 조직 위계이지 Role Hierarchy Direction이 아님(§6.1·ADR D-2). Role Hierarchy Definition으로 흡수 금지 |
| default edge type / root(오용 위험 참조) | Organization Hierarchy Candidate | `menu_tree.parent_id`(`AdminMenu.php:108,117,268`)는 메뉴 트리 root/edge이지 Role Hierarchy Definition 대상이 아님(§6.1) |
| default actor eligibility policy(Human/Machine 혼합 금지 근거) | ABSENT(순신규) | 대응 substrate 없음 |

## 5. 설계 원칙

- Role Hierarchy는 Organization Hierarchy가 아니다(§6.1) — `parent_user_id`(계정 owner→member)·`menu_tree`(메뉴)를 Hierarchy Definition의 Root/Edge로 흡수하지 않는다(ADR D-2).
- Role Hierarchy는 Permission Hierarchy가 아니다(§6.2) — Hierarchy Definition의 default permission aggregation은 별도 정책 필드로 존재하되 Role Graph가 Permission Graph를 복제하지 않는다.
- Inheritance Direction 기본값은 `EXPLICIT_EDGE_DIRECTION_ONLY`다 — 방향을 Edge 레벨에서 명시하지 않고 Definition 레벨의 암묵 방향(Parent가 Child를 상속 또는 그 반대)을 기본으로 삼지 않는다(§6.4·스펙 §9).
- roleRank(`index.php:573`)와 같은 선형 rank를 Hierarchy Type=API_CLIENT 근접 축으로 참조할 수 있으나, "선형 rank=상속"으로 오변환하지 않는다(§6.2·ADR D-1).
- Versioned Graph를 사용한다(§6.5) — current version id는 In-place Update 대상이 아니라 새 `APPROVAL_ROLE_HIERARCHY_VERSION` 생성 시 교체되는 참조다.
- multiple inheritance allowed·maximum depth는 Registry(§8)의 상한을 넘을 수 없다(상속 관계).

## 6. Gap / BLOCKED_PREREQUISITE

Role Hierarchy Definition은 **완전 ABSENT(순신규)** 판정이다. 저장소에는 정의된 Role↔Role 위계 그래프가 존재하지 않으며, 근접 substrate 3종(roleRank/parent_user_id/menu_tree)은 전부 다른 대상을 가리켜 Definition으로 승격할 수 없다(ADR D-1·D-2). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
