# DSAR — Approval Role Graph Version (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Graph Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_GRAPH_VERSION`은 Role Graph(§29)의 In-place Update를 금지(§6.5)하고 모든 구조 변경을 새 불변 버전으로 강제하는 엔티티다. Node/Edge Snapshot뿐 아니라 Closure/Path Snapshot Reference, Cycle Detection·Ambiguity·Conflict·Scope Expansion·Permission Expansion 결과를 버전 활성화 시점에 동결(freeze)하여, 이후 어떤 Effective 계산도 "그 시점 그래프가 무엇이었는지"를 재질의 없이 재현할 수 있게 한다. Affected Role/Assignment Reference Count는 Part 3-3 Assignment Governance가 재사용할 Impact Analysis(§63) 입력이다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| graph version id | Version PK |
| role graph id | 상위 Graph(§29) 참조 |
| version number | 순차 버전 번호 |
| previous version id | 직전 버전 참조(체인) |
| node snapshot | 이 버전 시점 Node 전체 스냅샷 |
| edge snapshot | 이 버전 시점 Edge 전체 스냅샷 |
| closure snapshot reference | Transitive Closure 스냅샷 참조 |
| path snapshot reference | Role Path(§33) 스냅샷 참조 |
| root snapshot | Root Node 목록 스냅샷 |
| leaf snapshot | Leaf Node 목록 스냅샷 |
| cycle detection result | §44 Cycle Detection 판정 결과 |
| ambiguity result | §46 Role Ambiguity Detection 판정 결과 |
| conflict result | §18 Role Conflict 판정 결과 |
| scope expansion result | §42 Scope Expansion Guard 판정 결과 |
| permission expansion result | §43 Permission Expansion Guard 판정 결과 |
| affected role count | 이 버전 변경으로 영향받는 Role 수 |
| affected assignment reference count | 영향받는 Assignment Reference 수(Part 3-3 재사용) |
| effective from / effective to | 유효 기간 |
| created by / reviewed by / approved by | 3단계 책임자 |
| activated at / superseded at | 활성화/대체 시각 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

Role Graph Version 자체는 별도 Version Type enum이 스펙에 명시되지 않는다(§30). 활성화 게이트에 사용되는 판정 결과값은 §44(Cycle: PASS/BLOCKED)·§46(Ambiguity: 탐지/무탐지)·§18(Conflict Severity)·§42~43(Expansion: NONE/LOW/MEDIUM/HIGH/CRITICAL)을 참조하며 이 문서에서 별도로 재정의하지 않는다.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Version 자체(불변 스냅샷 체인) | ABSENT(순신규) | Role Graph가 ABSENT이므로 그 버전도 ABSENT. `menu_defaults`(snapshot_data·version·reset 롤백지점, `AdminMenu.php:119-122,295-311,583-589`)가 유일한 "버전화된 스냅샷" 패턴이나 대상이 메뉴이지 Role Graph 아님(GROUND_TRUTH §5) |
| cycle detection result 필드 | ABSENT(순신규) | Role 대상 Cycle Detection 부재. 근접 알고리즘은 메뉴 `wouldCycle`(`AdminMenu.php:540-555`, depth<100 guard)뿐 |
| affected role count / affected assignment reference count | ABSENT(순신규) | Impact Analysis(§63) substrate 부재. 대응 없음 |

## 5. 설계 원칙

- In-place Update 절대 금지(§6.5) — Edge/Node 변경은 항상 새 `graph version id`를 발급하고 이전 버전은 `superseded at`으로 종결한다.
- Cycle Detection·Ambiguity·Conflict·Scope/Permission Expansion 결과는 버전 활성화 게이트이며, 하나라도 BLOCKED/HIGH 이상이면 `activated at`을 채우지 않는다(§6.16 Mandatory Control은 고객 설정으로 우회 불가).
- Historical Version은 불변 보존(§6.15) — 현재 Graph로 과거 Version을 재해석하지 않는다.
- `node snapshot`/`edge snapshot`은 메뉴 도메인 `menu_defaults` 스냅샷 패턴을 알고리즘 참조로만 사용하며, 대상(Role)을 메뉴 스키마 위에 흡수하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Graph Version은 상위 Role Graph(§29)가 ABSENT이므로 이 엔티티 역시 대응 substrate가 전무한 **완전 ABSENT(순신규)** 판정이다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
