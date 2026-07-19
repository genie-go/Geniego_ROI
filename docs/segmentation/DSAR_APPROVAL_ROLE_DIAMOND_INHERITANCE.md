# DSAR — Role Diamond Inheritance Detection (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §45 Diamond Inheritance Detection)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Diamond Inheritance Detection(스펙 §45)은 A가 B와 C를 모두 포함하고, B와 C가 다시 D를 공통으로 포함하는 다이아몬드 형태 상속에서 D의 Permission이 중복 유입되거나, 두 경로의 D Version/Scope Propagation/Constraint/Deny/Validity/Actor Eligibility/Priority가 서로 다를 때 이를 탐지하는 것이다. 완전히 동일한 경우에만 Deduplicate가 허용되고, 조금이라도 차이가 있으면 Ambiguity 또는 Conflict로 처리해야 한다(자동 병합 금지). 저장소에는 **다중 부모(multi-parent)를 가질 수 있는 구조 자체가 없다** — Role 유사 substrate 3종은 전부 단일 부모(single-parent) 구조이므로 Diamond가 구조적으로 발생할 수 없다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| diamond detection id | 검사 결과 레코드 PK |
| hierarchy version id / composite version id | 검사 대상 Version 참조 |
| apex node ref | 다이아몬드 정점(A) Node 참조 |
| convergence node ref | 다이아몬드 수렴점(D) Node 참조 |
| paths | 정점→수렴점 도달 경로(복수) — 각 경로의 Role Version/Scope Propagation/Constraint/Deny/Validity/Actor Eligibility/Priority 스냅샷 |
| paths identical | 모든 경로의 위 속성이 완전 동일한지 여부 |
| resolution | `DEDUPLICATED`(동일 시만) · `AMBIGUITY`(차이 시) · `CONFLICT`(상충 시) |
| tenant id | 소속 테넌트 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Resolution**: `DEDUPLICATED` · `AMBIGUITY` · `CONFLICT`

**Path Divergence Dimension**(차이 판정 축): `ROLE_VERSION` · `SCOPE_PROPAGATION` · `CONSTRAINT` · `DENY` · `VALIDITY` · `ACTOR_ELIGIBILITY` · `PRIORITY`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Diamond Inheritance Detection 자체 | ABSENT(순신규) | Role Hierarchy/Composite/Graph 전무(GROUND_TRUTH §4) — 다중 상속(multiple inheritance)/다중 경로 개념 없음 |
| 다중 부모 구조 전제(구조적 부재 증거) | Organization Hierarchy Candidate(단일 부모 구조) | `parent_user_id`는 계정당 단일 `parent_user_id` 컬럼(`UserAuth.php:176,316`) — 한 계정이 둘 이상의 owner를 가질 수 없는 단일 부모(tree, not DAG) 구조이므로 Diamond가 구조적으로 발생 불가. Role Graph의 다중 상속과는 무관한 별개 도메인(§6.1 오용 대상) |
| 경로 간 속성 비교(근접 없음) | ABSENT(순신규) | 대응 substrate 없음 — team_role→acl_permission(`TeamPermissions.php:152`)은 단일 매핑이라 경로 비교 대상이 아님 |

## 5. 설계 원칙

- Diamond 자체는 금지 대상이 아니다 — 탐지·명시적 처리(Deduplicate 또는 Ambiguity/Conflict)의 대상이다(스펙 §45 "명시적으로 처리하라").
- 완전히 동일한 경로(Role Version·Scope Propagation·Constraint·Deny·Validity·Actor Eligibility·Priority 전부 일치)만 자동 Deduplicate 가능하다. 하나라도 다르면 자동 병합 금지 — Ambiguity 또는 Conflict로 승격한다.
- `parent_user_id`(`UserAuth.php:176,316`)는 단일 부모 구조라는 사실 자체가 "Diamond가 이 substrate에서는 구조적으로 불가능함"을 보여주는 대조 참조일 뿐, Role Diamond Detection의 구현 근거가 아니다(반날조 주의).
- Diamond 탐지는 Circular Reference Detection(§44)과 독립 대상이다 — Diamond는 순환이 아니라 비순환 그래프(DAG) 안의 수렴 경로이며, 두 탐지 모두 동일 Graph Traversal 기반을 공유할 수 있으나 판정 로직은 분리한다.
- Diamond 탐지 결과는 Role Graph Snapshot(§50)의 `conflict result`·`ambiguity result` 필드에 반영된다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Diamond Inheritance Detection은 **완전 ABSENT(순신규)** 판정이며, 근접 알고리즘 참조조차 존재하지 않는다(Cycle Detection과 달리 비-Role 도메인 근접 패턴도 GROUND_TRUTH에 등재되어 있지 않음 — 정직한 완전 부재). 유일하게 언급 가능한 것은 `parent_user_id`가 단일 부모 구조라는 대조적 사실(`UserAuth.php:176,316`)뿐이며, 이는 Diamond 부재를 설명하는 배경 참조이지 구현 substrate가 아니다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
