# DSAR — Role Circular Reference Detection (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §44 Circular Hierarchy Detection)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Circular Reference Detection(스펙 §44 Circular Hierarchy Detection)은 Role Hierarchy Edge와 Composite Role Component 양쪽 모두에서 **Direct Self-reference · A→B→A · A→B→C→A · Composite A가 Composite A를 포함 · Composite A가 B를 포함하고 B가 A를 포함 · Hierarchy Edge↔Composite Edge Cross Cycle · Dependency Cycle · Exclusion Cycle Reference · Supersession Cycle · Alias Cycle · External Mapping Cycle**을 Tarjan SCC 또는 DFS Color 등 검증된 알고리즘으로 탐지하고, Cycle 발견 시 해당 Version의 활성화를 차단하는 Mandatory Control(§6.16)이다. 저장소에는 Role↔Role 대상의 Cycle Detection이 없다. 단, **비-Role 도메인**에 동형 알고리즘 패턴 2건이 실재하며, 이는 오직 알고리즘 참조용이지 Role Cycle Detection의 증거가 아니다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| circular reference check id | 검사 실행 레코드 PK |
| hierarchy version id / composite version id | 검사 대상 Version 참조 |
| algorithm | `TARJAN_SCC` · `DFS_COLOR` |
| cycle type detected | 아래 Cycle Type enum(복수 가능) |
| cycle path | 탐지된 순환 경로(Node/Edge 시퀀스) |
| block activation | Cycle 탐지 시 항상 true(비활성화 불가·§6.16) |
| tenant id | 소속 테넌트 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Cycle Type**: `DIRECT_SELF_REFERENCE` · `TWO_HOP_CYCLE`(A→B→A) · `THREE_HOP_CYCLE`(A→B→C→A) · `COMPOSITE_SELF_INCLUSION` · `COMPOSITE_MUTUAL_INCLUSION` · `HIERARCHY_COMPOSITE_CROSS_CYCLE` · `DEPENDENCY_CYCLE` · `EXCLUSION_CYCLE_REFERENCE` · `SUPERSESSION_CYCLE` · `ALIAS_CYCLE` · `EXTERNAL_MAPPING_CYCLE`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Role↔Role Cycle Detection 자체 | ABSENT(순신규) | Role Hierarchy/Composite/Graph 전무(GROUND_TRUTH §4) — backend PHP grep 0건(circular·Tarjan 포함) |
| `DIRECT_SELF_REFERENCE`/depth guard(근접 알고리즘·비-Role) | Hardcoded Parent-child(메뉴 도메인) | `wouldCycle`(id===newParent 즉시 차단·depth<100 가드)(`AdminMenu.php:540-555`) — 메뉴 트리 대상 조상체인 walk+self-ref+depth guard. GROUND_TRUTH §5가 "§44 Circular Detection 참조 패턴(단 메뉴 대상·role 아님)"으로 명시한 근접 알고리즘일 뿐 Role Graph substrate 아님 |
| `DEPENDENCY_CYCLE`(근접 알고리즘·비-Role) | Role Dependency Candidate 아님(태스크 도메인) | PM 태스크 의존성 cycle 검출 주석(`PM/Dependencies.php:10`) — DFS 도달가능성 기반. GROUND_TRUTH §5가 "§44 참조(태스크 그래프·role 아님)"로 명시한 근접 알고리즘일 뿐 |

## 5. 설계 원칙

- Tarjan SCC 또는 DFS Color 등 검증된 알고리즘을 사용하며, 자체 발명 알고리즘 신설을 지양한다(스펙 §44 "검증된 Algorithm").
- Direct Cycle뿐 아니라 Indirect Cycle(A→B→C→A 이상)까지 반드시 차단한다(§6.6).
- Hierarchy Edge와 Composite Component는 별개 구조이나 Cross Cycle(Hierarchy Edge가 Composite Component를 거쳐 다시 자신으로 돌아오는 경로)까지 단일 통합 탐지 대상으로 취급한다.
- Cycle 탐지 시 해당 Version의 활성화를 차단한다 — 고객 설정으로 비활성화 불가(§6.16).
- `wouldCycle`(`AdminMenu.php:540-555`)와 PM Dependencies DFS(`PM/Dependencies.php:10`)는 **알고리즘 패턴 참조만** 가능하다(GROUND_TRUTH §5 명시) — 메뉴 노드·태스크를 Role Node로 흡수하거나, 이 두 substrate를 Role Cycle Detection의 실 구현 증거로 인용 금지(반날조).
- Composite A includes Composite A(자기 포함) 탐지는 Hierarchy Cycle Detection과 별개 검사 경로로 유지하되 동일 Mandatory Control 그룹에 속한다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Circular Reference Detection은 **완전 ABSENT(순신규)** 판정이다. 저장소에는 Role Node/Edge를 대상으로 한 Cycle Detection이 전무하다(grep 0건). 근접 알고리즘은 오직 비-Role 도메인 2건(`wouldCycle`·`AdminMenu.php:540-555`, PM Dependencies DFS·`PM/Dependencies.php:10`)뿐이며 이들은 참조 패턴일 뿐 Role Graph substrate가 아니다(반날조 — 메뉴/태스크 도메인을 Role Cycle Detection 증거로 오인 금지). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
