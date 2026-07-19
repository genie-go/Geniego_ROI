# DSAR — Approval Role Hierarchy Edge (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Edge)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_HIERARCHY_EDGE`는 두 Role Hierarchy Node(§11) 간 관계를 표현하는 핵심 실체다. ADR D-3이 명시하듯 `parent_id`만 저장하는 방식을 금지하고, Edge Type(INCLUDES/INHERITS/SPECIALIZES/RESTRICTS/DEPENDS_ON/EXCLUDES/IMPLIES/COMPOSES)과 Inheritance Direction, 그리고 Permission/Deny/Scope/Constraint/Actor Eligibility/Validity Propagation Policy를 명시적으로 저장한다(§6.4). 저장소에는 이런 의미론을 갖는 Role↔Role Edge가 없다 — 있는 것은 단순 컬럼(`menu_tree.parent_id`) 또는 컬럼 없는 암묵 순서(roleRank)뿐이며, 둘 다 Edge Type/Propagation Policy 개념이 없다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| edge id | Edge PK |
| hierarchy version id | 소속 Hierarchy Version(§10) FK |
| source node id / target node id | 연결되는 두 Node(§11) |
| source role version id / target role version id | 각 Node의 Role Version(Version Binding) |
| edge type | 아래 Edge Type enum |
| inheritance direction | 이 Edge의 방향(§9 Inheritance Direction과 정합) |
| permission propagation policy | Permission 전파 방식 |
| deny propagation policy | Explicit Deny 전파 방식(§6.8 — 항상 보존) |
| scope propagation policy | Scope 전파 방식(기본 Intersection·§6.7) |
| constraint propagation policy | Constraint 전파 방식 |
| actor eligibility policy | Actor Eligibility 결합 방식(교집합 기본·§6.9) |
| validity propagation policy | 유효기간 결합 방식 |
| transitive 여부 | 이 Edge가 전이적으로 적용되는지 |
| priority | 동일 Node에 여러 Edge 존재 시 우선순위 |
| maximum propagation depth | 전파 최대 깊이 |
| conflict policy reference | 충돌 시 참조할 정책(§79/§80) |
| condition reference optional | Conditional Edge 참조(선택) |
| valid from / valid to | 유효 기간 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Edge Type**: `INCLUDES · INHERITS · SPECIALIZES · RESTRICTS · DEPENDS_ON · EXCLUDES · IMPLIES · COMPOSES · CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Edge 자체(Type+Direction+Propagation Policy를 갖는 실체) | ABSENT(순신규) | Role Hierarchy Edge 개념 전무(GROUND_TRUTH §4). `parent_id`만 저장하는 방식조차 Role 대상으로는 부재 |
| Edge Type=INHERITS 근접(순서 오변환 위험) | Hardcoded Parent-child(순서)·Unversioned Hierarchy | api_key `roleRank`(`index.php:573,592-595`)는 rank 순서일 뿐 edge type/direction/propagation policy가 전무한 **선형 rank**(GROUND_TRUTH §1.1). ADR D-3: "`parent_id`만 저장 금지"가 정확히 겨냥하는 반례 |
| Edge Type=INHERITS(계정 위계 오흡수 위험) | Organization Hierarchy Candidate(오용 위험) | `parent_user_id`(`UserAuth.php:176,316,423-426`)는 사람 간 owner→member 관계이지 Role Edge가 아님(§6.1·ADR D-2) |
| Edge(메뉴 인접리스트 근접 구조) | Organization Hierarchy Candidate·Hardcoded Parent-child(메뉴) | `menu_tree.parent_id`(`AdminMenu.php:108,117,268`) — 컬럼 하나로 관계만 표현하고 Type/Direction/Propagation Policy 없음. ADR D-3이 금지하는 "`parent_id`만 저장" 패턴의 실제 사례(단, 대상은 메뉴) |
| Cycle 검출(Edge 그래프 알고리즘 근접) | 참조 패턴(Role 아님) | menu_tree `wouldCycle`(id===newParent 즉시차단·depth<100, `AdminMenu.php:540-555`) — §44 Circular Detection 참조 패턴(메뉴 대상·Role Edge 아님, GROUND_TRUTH §5) |

## 5. 설계 원칙

- `parent_id`만 저장하지 않는다(§6.4) — 모든 Edge는 edge type과 inheritance direction을 명시 필드로 갖는다.
- `INCLUDES`/`INHERITS`를 단순 Permission Union으로 구현하지 않는다(스펙 §13) — permission/deny/scope/actor eligibility/validity/risk 각각의 전파 방식을 개별 정책 필드로 정의한다.
- `SPECIALIZES`는 Scope 축소가 기본이며 자동 확대를 금지한다(스펙 §15).
- `RESTRICTS`는 Allow보다 우선한다(스펙 §16).
- Circular Reference를 Direct/Indirect 모두 차단한다(§6.6) — menu_tree `wouldCycle`(`AdminMenu.php:540-555`)의 조상체인 walk+self-ref+depth guard 패턴을 알고리즘 참조로만 재사용하고, 메뉴 대상 로직을 그대로 Role Edge에 이식하지 않는다(대상·스키마가 다름).
- Cross-Tenant Edge는 명시적 Cross-registry Policy가 없는 한 차단한다(§6.14).
- roleRank(`index.php:573`)·menu_tree.parent_id(`AdminMenu.php:108`) 둘 다 Edge Type/Propagation Policy가 없는 "단순 순서/컬럼" 사례이므로, 신규 Edge 설계 시 이 두 사례를 "하지 말아야 할 패턴"의 반례로 명시한다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Hierarchy Edge는 **완전 ABSENT(순신규)** 판정이다. `parent_id`만 저장하는 반례(`menu_tree.parent_id`)와 rank만 있는 반례(`roleRank`)가 실재하나 둘 다 Edge Type/Propagation Policy가 없어 이번 스펙이 요구하는 Edge 실체의 근접 substrate가 아니다. Cycle Detection 알고리즘은 `AdminMenu.php:540-555`(메뉴 대상)를 구조적 참조로만 활용 가능하다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
