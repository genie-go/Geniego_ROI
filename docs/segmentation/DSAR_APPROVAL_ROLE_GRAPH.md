# DSAR — Approval Role Graph (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Graph)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_GRAPH`는 Registry(§7 최상위)·Hierarchy(§9)·Composite Role(§21)을 하나의 통합 조회 표면으로 투영하는 최상위 그래프 컨테이너다. Hierarchy Edge(포함/상속/특수화/제한)와 Composite Edge(조합)를 분리 저장하되, Graph Type으로 어느 투영인지(순수 Hierarchy·순수 Composite·둘의 결합·Legacy Migration용·What-if Simulation용)를 명시한다. 이 엔티티가 실제 traversal의 시작점이며, Root/Node/Edge count와 `cycle free 여부`를 그래프 단위로 캐시해 Runtime Guard(§69)가 매번 전체 그래프를 재순회하지 않도록 한다. 저장소에는 Role↔Role 그래프 개념 자체가 부재(GROUND_TRUTH §0 총평 "Part 3-2 도메인 전체가 순신규")하므로 이 엔티티는 완전 신규다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| role graph id | Graph PK |
| tenant id | 소속 테넌트 |
| hierarchy registry id | 상위 Registry(§7) 참조 |
| graph code | 고유 코드 |
| graph name | 표시명 |
| graph type | 아래 Graph Type enum |
| root count | Root Node(§11 ROOT/§31 진입점) 수 |
| node count | Graph Node(§31) 총수 |
| edge count | Graph Edge(§32) 총수 |
| maximum depth | 이 그래프에서 도달한 최대 깊이 |
| cycle free 여부 | 최신 Cycle Detection(§44) 결과 캐시 |
| multiple inheritance 여부 | 다중 상속 존재 여부 |
| active version id | 현재 Active `APPROVAL_ROLE_GRAPH_VERSION`(§30) 참조 |
| graph digest | Canonical Sorting Digest(§54) |
| valid from / valid to | 유효 기간 |
| status | 생명주기 상태 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Graph Type**: `HIERARCHY · COMPOSITE · COMBINED · MIGRATION · SIMULATION · CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Role Graph 컨테이너 자체 | ABSENT(순신규) | 저장소에 Role↔Role 그래프 개념 부재(GROUND_TRUTH §4 "Role Graph / … = 전무") |
| cycle free 여부(그래프 단위 캐시 판정) | ABSENT(순신규) | 대응 substrate 없음. 근접 알고리즘은 메뉴 도메인 `wouldCycle`(`AdminMenu.php:540-555`)뿐이며 Role 대상 아님(GROUND_TRUTH §5) |
| Graph Type=HIERARCHY 투영 근접(선형 rank) | Hardcoded Parent-child(순서)·Unversioned Hierarchy | api_key `roleRank`(`index.php:573,592-595`) — 선형 전순서일 뿐 그래프 아님(ADR D-1) |
| Graph Type=COMPOSITE 투영 근접 | Permission Group Candidate(묶음) | team_role→acl_permission(`TeamPermissions.php:152`) — Role→Permission 묶음이지 Composite Role 조합 아님(§6.3) |
| Graph Type=MIGRATION 투영 | ABSENT(순신규) | 대응 substrate 없음(§64 Existing Hierarchy Migration 미착수) |

## 5. 설계 원칙

- Hierarchy(포함/상속/특수화/제한)와 Composite(조합)는 별도 Edge Type 체계(§12·§32)로 저장하되 하나의 Graph가 둘을 통합 조회할 수 있도록 Graph Type으로 구분한다(§6.1~6.3 4분리 유지 — Graph 통합이 개념 병합을 의미하지 않는다).
- `cycle free 여부`는 매 Graph Version 활성화 시(§30) Cycle Detection(§44 Tarjan SCC/DFS)을 재계산한 캐시이며, In-place 갱신이 아니라 새 Version 생성 시점에만 재산출한다(§6.5 Versioned Graph).
- Graph는 Tenant-isolated이며 Cross-Tenant Edge(§47)는 별도 Registry 정책 없이 존재할 수 없다.
- roleRank/parent_user_id/menu_tree 3종 substrate는 Graph Node/Edge로 흡수하지 않는다(ADR D-1·D-6) — 이 문서의 substrate 매핑은 전부 "근접이되 오흡수 금지" 참조일 뿐 실 구현 근거가 아니다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Graph는 저장소에 대응 substrate가 전무한 **완전 ABSENT(순신규)** 판정이다. Graph Node(§31)·Graph Edge(§32)·Graph Version(§30)이 모두 미구현 상태이므로 이 컨테이너도 채울 데이터가 없다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
