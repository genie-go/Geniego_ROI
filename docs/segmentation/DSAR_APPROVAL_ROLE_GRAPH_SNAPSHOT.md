# DSAR — Approval Role Graph Snapshot (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §50 Role Graph Snapshot)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_GRAPH_SNAPSHOT`(스펙 §50)은 특정 시점의 전체 Role Graph — 소속 Hierarchy/Composite Version 집합·Node/Edge 스냅샷·Path Summary·Root/Leaf Role·Effective Inherited/Composite Set·Permission/Deny/Scope Projection Digest·Actor Eligibility Digest·Cycle/Diamond/Ambiguity 판정 결과 — 를 불변으로 동결한 기록이다. Historical Graph 불변 보존(§6.15 "현재 Hierarchy로 과거 Authorization을 재해석하지 마라")을 실체화하는 핵심 Evidence 구조다. 저장소에는 Role Graph 자체가 없어 Snapshot 대상도 없으나, **비-Role 도메인**에 구조적으로 가장 근접한 "Version+Snapshot+Rollback 지점" 패턴이 메뉴 도메인에 실재한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| snapshot id | Snapshot PK |
| tenant id | 소속 테넌트 |
| graph id | 소속 `APPROVAL_ROLE_GRAPH`(§45) 참조 |
| graph version id | 소속 `APPROVAL_ROLE_GRAPH_VERSION`(§46) 참조 |
| hierarchy version ids | 포함된 Hierarchy Version(§10) 목록 |
| composite version ids | 포함된 Composite Role Version(§27) 목록 |
| node snapshots | Node(§11) 스냅샷 |
| edge snapshots | Edge(§12) 스냅샷 |
| path summary | Role Path(§52) 요약 |
| root roles | Root Node 목록 |
| leaf roles | Leaf Node 목록 |
| effective inherited sets | Effective Inherited Role Set(§62) 스냅샷 |
| effective composite sets | Effective Composite Role Set(§63) 스냅샷 |
| permission projection digest | Effective Role Permission Projection(§65) 다이제스트 |
| deny projection digest | Effective Role Deny Projection(§66) 다이제스트 |
| scope projection digest | Scope Propagation(§39) 결과 다이제스트 |
| actor eligibility digest | Actor Eligibility Intersection(§75) 결과 다이제스트 |
| conflict result | Role Conflict Detection(§79) 결과 |
| ambiguity result | Role Ambiguity Detection(§46 본 문서 계열) 결과 |
| cycle result | Circular Hierarchy Detection(§44) 결과 |
| captured at | 캡처 시각 |
| immutable digest | 불변 다이제스트(전체 Snapshot 무결성) |
| status | 생명주기 상태 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Status**: `ACTIVE` · `SUPERSEDED` · `ROLLBACK_TARGET`(§6.15 Historical Graph 재해석 금지 원칙 하에서만 참조용으로 재조회 가능·현재 판정에 재사용 금지)

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Role Graph Snapshot 자체 | ABSENT(순신규) | Role Hierarchy/Composite/Graph 전무(GROUND_TRUTH §4) — Snapshot 대상인 Role Graph 자체가 없음 |
| snapshot_data·version·rollback 지점(근접 — 비-Role) | Hardcoded Parent-child(메뉴 도메인)·Snapshot/Baseline | `menu_defaults`(snapshot_data·version·reset 롤백지점)(`AdminMenu.php:119-122,295-311,583-589`) — GROUND_TRUTH §5가 "§50 Graph Snapshot 참조(메뉴 대상)"로 명시한 근접 substrate. 대상이 메뉴 트리이지 Role Graph가 아니므로 구조 참조(Version+Snapshot+Rollback 3요소 결합 패턴)로만 사용 가능 |
| conflict/ambiguity/cycle result 필드(근접 없음) | ABSENT(순신규) | 대응 substrate 없음 — §44~46 자체가 ABSENT이므로 그 결과를 담는 Snapshot 필드도 ABSENT |

## 5. 설계 원칙

- Snapshot은 In-place Update 대상이 아니다 — 새 Graph Version 활성화 시마다 새 Snapshot을 생성한다(§6.5 Versioned Graph와 동일 원리).
- Historical Snapshot으로 과거 Authorization/Assignment를 재해석하지 않는다(§6.15) — `menu_defaults` reset 롤백(`AdminMenu.php:295-311,583-589`)처럼 "현재 상태를 과거 시점으로 되돌리는" 용도로 Role Graph Snapshot을 오용 금지. Role Graph Snapshot은 조회·Evidence 전용이며 되돌리기(rollback-and-apply) 기능이 아니다.
- `menu_defaults`(`AdminMenu.php:119-122,295-311,583-589`)는 "Version+Snapshot Data+Rollback 지점"이 한 테이블에 결합된 구조 패턴으로만 참조하며, 메뉴 노드를 Role Node로 흡수하지 않는다(대상 분리 유지).
- Graph Snapshot 생성은 Mandatory Control이며 고객 설정으로 비활성화 불가(§6.16 "Graph Snapshot").
- conflict result·ambiguity result·cycle result 필드는 각각 §79 Role Conflict Detection·본 배치 §46 Role Ambiguity Detection·§44 Circular Hierarchy Detection의 산출물을 그대로 동결 보관하며, Snapshot 자체가 별도 판정 로직을 재구현하지 않는다(중복 엔진 금지).

## 6. Gap / BLOCKED_PREREQUISITE

Role Graph Snapshot은 **완전 ABSENT(순신규)** 판정이다. Snapshot 대상인 Role Graph 자체가 존재하지 않으므로 Snapshot 기능도 존재할 수 없다. 유일한 근접 구조 패턴은 `menu_defaults`(`AdminMenu.php:119-122,295-311,583-589`)이며, 이는 GROUND_TRUTH가 직접 "§50 참조(메뉴 대상)"로 명시한 비-Role 도메인 substrate로서 구조(Version+Snapshot+Rollback) 참조만 가능하고 Role Graph Snapshot의 구현 증거로 승격할 수 없다(반날조). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
