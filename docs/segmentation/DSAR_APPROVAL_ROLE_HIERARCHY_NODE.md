# DSAR — Approval Role Hierarchy Node (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Node)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_HIERARCHY_NODE`는 특정 Hierarchy Version(§10) 내에서 하나의 Role Definition(Part 3-1)·Role Version이 위계 그래프상 어느 위치(Root/중간/Leaf/Abstract/Composite 등)에 있는지를 표현하는 노드다. Abstract Node는 직접 Assignment 대상이 되지 않도록 준비해야 한다(스펙 §11). 저장소에는 이런 Role 전용 그래프 노드 개념이 없다 — `menu_tree`의 각 행(`AdminMenu.php:108,117`)이 구조적으로 가장 근접한 "노드+parent_id+depth" 패턴이나 대상이 메뉴다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| node id | Node PK |
| hierarchy version id | 소속 Hierarchy Version(§10) FK |
| role definition id | Part 3-1 Role Definition 참조 |
| role version id | Part 3-1 Role Definition Version 참조(Version Binding) |
| node type | 아래 Node Type enum |
| root 여부 | Root Node인지 |
| leaf 여부 | Leaf Node인지 |
| abstract 여부 | Abstract Node인지(직접 Assignment 금지) |
| assignable 여부 | 직접 Subject Assignment 대상 가능 여부 |
| composite 여부 | Composite Role Node인지 |
| depth | Root로부터의 깊이 |
| path key | 경로 식별 키(예: materialized path) |
| sequence | 동일 depth 내 정렬 순서 |
| valid from / valid to | 유효 기간 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Node Type**: `ROOT · INTERMEDIATE · LEAF · ABSTRACT · COMPOSITE · SPECIALIZED · RESTRICTED · CUSTOM`

Abstract Node는 직접 Assignment 대상이 되지 않도록 준비한다(assignable 여부 필드로 강제).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Node 자체(Role Definition을 그래프 노드로 감싸는 실체) | ABSENT(순신규) | Role Hierarchy Node 개념 전무(GROUND_TRUTH §4) |
| depth / path key(근접 구조 패턴) | Organization Hierarchy Candidate·Hardcoded Parent-child(메뉴) | `menu_tree` adjacency list `parent_id`(MySQL `AdminMenu.php:108`·SQLite `:134`)+closure 인덱스(`:117`)+트리 조회(`:268`) — "저장소에서 유일하게 진짜 parent-child 인접리스트/트리 구조"(GROUND_TRUTH §1.3)이나 **대상이 메뉴**이지 Role이 아님. Role Hierarchy Node로 오흡수 금지(§6.1·ADR D-1) |
| root/leaf/abstract 여부(근접 없음) | ABSENT(순신규) | 대응 substrate 없음 |
| assignable 여부(Abstract=비할당 강제 근거) | ABSENT(순신규) | 대응 substrate 없음. Part 3-3 Subject Role Assignment가 부재하므로 "할당 대상 여부" 자체도 순신규 |

## 5. 설계 원칙

- 모든 Node는 반드시 Role Definition id + Role Version id를 함께 참조한다(Version Binding) — 스펙 §4.1·§14의 Role Version Binding 원칙과 정합.
- Abstract Node는 assignable=false로 고정하고, 이를 위반하는 Assignment 시도는 거부한다(스펙 §11 명시 요구사항).
- `menu_tree.parent_id`(`AdminMenu.php:108,117,268`)의 인접리스트+closure 인덱스 구조는 알고리즘/스키마 설계의 참조 패턴으로만 재사용하고, 메뉴 Node 자체를 Role Hierarchy Node로 흡수하지 않는다(GROUND_TRUTH §5·ADR D-1 "오흡수 금지").
- Node 삭제/이동은 In-place가 아니라 신규 Hierarchy Version(§10) 발급을 통해서만 반영한다(§6.5).
- composite 여부 필드는 Composite Role(§26)과의 연결점이나, Node 자체가 Composite Role Component를 대체하지 않는다(§6.3 Composite Role ≠ Permission Group 구분과 별개로 Node/Component 계층도 분리 유지).

## 6. Gap / BLOCKED_PREREQUISITE

Role Hierarchy Node는 **완전 ABSENT(순신규)** 판정이다. 구조적으로 가장 근접한 것은 `menu_tree`의 adjacency list+depth+closure 인덱스(`AdminMenu.php:108,117,268`)이나 대상이 메뉴이므로 직접 재사용 불가(§6.1 오용 경계). Abstract Node 비할당 강제는 Part 3-3 Subject Role Assignment 자체가 이번 Part 범위 밖이라 실 검증 불가 — BLOCKED_PREREQUISITE. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
