# DSAR — Approval Role Path (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Path)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_PATH`는 Source Node에서 Target Node까지의 구체적 Edge 나열(node sequence·edge sequence)과 그 경로를 따라 계산된 Effective Permission/Deny/Scope/Actor Eligibility Digest를 저장한다. Diamond Inheritance(§45 A→B→D, A→C→D)처럼 동일 Target에 여러 경로가 존재할 때, Path 엔티티가 "어느 경로로 왔는지"의 증거(Path Evidence·§53)를 개별 보존하여 §46 Ambiguity Detection이 "완전 동일 경로만 Deduplicate, 차이가 있으면 Ambiguity"를 판정할 수 있게 한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| role path id | Path PK |
| graph version id | 상위 Graph Version(§30) 참조 |
| source node id | 출발 Node(§31) |
| target node id | 도착 Node(§31) |
| path length | 경로 상 Edge 개수 |
| node sequence | 경로 상 Node 나열(순서 보존) |
| edge sequence | 경로 상 Edge 나열(순서 보존) |
| path type | 아래 Path Type enum |
| effective permission digest | 이 경로로 유입되는 Permission의 다이제스트 |
| effective deny digest | 이 경로로 유입되는 Explicit Deny의 다이제스트 |
| effective scope digest | 이 경로의 Scope Propagation 결과 다이제스트 |
| actor eligibility digest | 이 경로의 Actor Eligibility 교집합 결과 다이제스트 |
| risk result | 이 경로를 따른 Risk 상향 결과 |
| ambiguity detected | §46 Ambiguity 판정 여부 |
| conflict detected | §18 Conflict 판정 여부 |
| valid from / valid to | 유효 기간 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Path Type**: `DIRECT · TRANSITIVE · SHORTEST · ALL_PATHS_REFERENCE · CONFLICT_PATH · EXCLUSION_PATH · CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Path 자체(node/edge sequence·Path Evidence) | ABSENT(순신규) | GROUND_TRUTH §4 "Diamond Inheritance / Ambiguity / Multiple Inheritance / Role Path / Path Evidence = 전무" |
| DIRECT/TRANSITIVE Path 근접 | 근접 알고리즘(Role 아닌 도메인) | 메뉴 트리 조회(`AdminMenu.php:268`)가 유일한 실제 parent-child traversal이나 대상이 메뉴(GROUND_TRUTH §5) |
| CONFLICT_PATH 근접 | ABSENT(순신규) | Role Conflict 자체가 부재(§18 substrate 전무) |
| EXCLUSION_PATH 근접 | ABSENT(순신규) | Role Exclusion 자체가 부재 |

## 5. 설계 원칙

- 동일 Source·Target 간 여러 경로가 존재해도(Multiple Inheritance) 각 경로는 개별 Path 레코드로 보존한다 — 조기에 Union하여 Source Chain을 소실시키지 않는다(§37 Permission Deduplication 원칙과 동형).
- `ALL_PATHS_REFERENCE`는 실제 모든 경로를 즉시 열거하는 것이 아니라 참조/필요 시 산출 계약이다(성능 원칙 §75 Precomputed Transitive Closure와 결합).
- 완전 동일한 Permission Version·Scope·Constraint·Deny·Actor Eligibility·Priority를 갖는 경로만 Deduplicate 가능하며, 하나라도 다르면 `ambiguity detected=true`로 표시한다(§45).
- `path length`·`node sequence`는 Circular Hierarchy Detection(§44)의 조기 종료 조건(Maximum Depth Guard)과 함께 사용한다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Path는 상위 Role Graph Edge(§32)·Node(§31)가 모두 ABSENT이므로 **완전 ABSENT(순신규)** 판정이다. Diamond Inheritance·Ambiguity Detection의 입력 자체가 존재하지 않는다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
