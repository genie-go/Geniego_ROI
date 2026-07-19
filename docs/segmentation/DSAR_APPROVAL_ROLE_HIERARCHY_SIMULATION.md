# DSAR — Approval Role Hierarchy Simulation (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Hierarchy Simulation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)·Role Graph(Part 3-2 본체) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Simulation은 실제 Graph/Role Version/Assignment/Cache 변경 금지 · Legacy 자동활성화 금지 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

---

## 1. 목적

§62 Role Hierarchy Simulation은 Node/Edge 추가·제거, Component 추가·제거, Scope/Deny/Actor/Conflict Policy 변경, Maximum Depth 증가, Multiple Inheritance 활성화 등을 **실제 Graph에 반영하기 전에 what-if로 미리 계산**하는 절차이며, **실제 Graph/Role Version/Assignment/Cache는 절대 변경하지 않는다**(§62 원문). 대상 Role Graph 자체가 ABSENT이므로 지금은 시뮬레이션할 실 Graph가 없다. 저장소에는 이와 동형인 "실제 반영 전 미리보기" 패턴이 Role 아닌 도메인(메뉴 스냅샷/롤백)에만 존재하며, 본 문서는 이를 참조 패턴으로만 인용하고 Role Graph로 오흡수하지 않는다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| simulation id | Simulation Result PK |
| target hierarchy id / composite id | 시뮬레이션 대상 |
| baseline graph version | 시뮬레이션 시작 시점 버전 |
| simulation type | 아래 Simulation Type enum |
| simulated change payload | 가상 변경 내용(Node/Edge/Component/Policy) |
| current graph snapshot / simulated graph snapshot | 전후 비교용 |
| added/removed roles·permissions·denies | 산출 항목 |
| scope expansion/reduction | 산출 항목 |
| new/resolved conflicts | 산출 항목 |
| cycle detection result / diamond inheritance detection result | 산출 항목 |
| risk increase / criticality change | 산출 항목 |
| affected roles / affected assignment references | 산출 항목 |
| cache invalidation estimate | 산출 항목(실제 무효화 아님·추정치) |
| manual review requirement | 산출 항목 |
| activation recommendation | 산출 항목(권고일 뿐 자동 적용 아님) |
| status | 시뮬레이션 상태 |

## 3. 열거형 / 타입

**Simulation Type**: `ADD_NODE · REMOVE_NODE · ADD_EDGE · REMOVE_EDGE · CHANGE_EDGE_TYPE · CHANGE_DIRECTION · CHANGE_PROPAGATION_POLICY · ADD_PARENT · REMOVE_PARENT · ADD_CHILD · REMOVE_CHILD · ADD_COMPONENT · REMOVE_COMPONENT · CHANGE_COMPONENT_VERSION · ADD_NESTED_COMPOSITE · CHANGE_SCOPE_POLICY · CHANGE_DENY_POLICY · CHANGE_ACTOR_POLICY · CHANGE_CONFLICT_POLICY · INCREASE_MAXIMUM_DEPTH · ENABLE_MULTIPLE_INHERITANCE · CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·없으면 ABSENT) |
|---|---|---|
| Simulation 대상(Role Graph) | ABSENT(순신규) | Role Graph 부재로 시뮬레이션할 실체 없음(GROUND_TRUTH §4) |
| CYCLE_DETECTION 산출 항목의 참조 알고리즘 패턴(Role 아님) | 근접 substrate(비-Role 도메인) | `wouldCycle`(id===newParent 즉시차단·depth<100·`AdminMenu.php:540-555`) — 메뉴 트리 대상. §44 Circular Detection 참조 패턴일 뿐 Role Cycle Simulation 아님 |
| CYCLE_DETECTION 산출 항목의 참조 알고리즘 패턴(Role 아님) 2 | 근접 substrate(비-Role 도메인) | PM 태스크 의존성 DFS 도달가능성(`PM/Dependencies.php:10`) — 태스크 그래프 대상 |
| "변경 전 미리보기·롤백" 동형 UX 패턴(Role 아님) | 근접 substrate(비-Role 도메인) | `menu_defaults`(snapshot_data·version·reset 롤백지점·`AdminMenu.php:119-122,295-311,583-589`) — 메뉴 스냅샷/롤백이지 Graph Simulation 아님 |
| Scope/Deny 시뮬레이션 계산 로직(Role 아님) | 근접 substrate(비-Role 도메인) | `effectiveScope`(owner=null·상속·실패 DENY_SCOPE·`TeamPermissions.php:236-265`) — 실제 적용 계산이지 what-if 시뮬레이션이 아님 |

## 5. 설계 원칙

- Simulation은 어떤 경우에도 **실제 Graph/Role Version/Assignment/Cache를 변경하지 않는다**(§62 명문). 산출은 읽기 전용 Result로만 저장한다.
- CYCLE_DETECTION 산출 항목의 알고리즘은 `AdminMenu.php:540-555`(메뉴 대상 조상체인 walk+self-ref+depth guard)·`PM/Dependencies.php:10`(태스크 DFS)을 **참조 패턴**으로만 재사용하고, 대상(메뉴/태스크)을 Role Node/Edge로 흡수하지 않는다(GROUND_TRUTH §5 "동형 알고리즘/구조가 비-Role 도메인에 실재·오흡수 금지 경계").
- `menu_defaults` 스냅샷/롤백(`AdminMenu.php:119-122,295-311,583-589`)은 Role Graph Simulation의 산출물 저장 방식(전후 Snapshot 비교)에 참조 패턴이 될 수 있으나, 메뉴 도메인 실체를 Role Graph Snapshot으로 재사용하지 않는다.
- ACTIVATION_RECOMMENDATION은 권고에 그치며, 자동 적용(auto-activate)하지 않는다 — Legacy Composite 자동 활성화 금지(§65)와 동일 규율.

## 6. Gap / BLOCKED_PREREQUISITE

Simulation 대상 Role Hierarchy/Composite Graph가 저장소에 전무(**ABSENT·순신규**). 근접 알고리즘·UX 패턴(Cycle Detection·Snapshot/Rollback·effectiveScope)은 비-Role 도메인에 실재하나 참조용일 뿐 대체물이 아니다. 실 Simulation 엔진은 Role Graph 실 신설 이후 별도 승인세션(RP-002)에서 구현한다. NOT_CERTIFIED.
