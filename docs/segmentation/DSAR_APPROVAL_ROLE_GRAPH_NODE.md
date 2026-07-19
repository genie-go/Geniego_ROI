# DSAR — Approval Role Graph Node (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Graph Node)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_ROLE_GRAPH_NODE`는 Role Graph Version(§30) 내부에서 하나의 traversal 정점을 표현한다. Node는 순수 Role Definition Version(§31 Node Type=ROLE)일 수도, Composite Role Version(COMPOSITE_ROLE)일 수도, 아직 Canonical Registry에 없는 외부 참조(EXTERNAL_ROLE_REFERENCE — IAM/ERP/Workflow Migration 대상)일 수도 있다. Node 단위로 `assignable`(직접 Assignment 대상이 될 수 있는지)을 플래그하여, Abstract Node(§11)가 실수로 Subject에 직접 부여되지 않도록 한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| graph node id | Node PK |
| graph version id | 상위 Graph Version(§30) 참조 |
| node type | 아래 Node Type enum |
| role definition id | Part 3-1 Role Definition 참조(Node Type=ROLE 계열) |
| role version id | Part 3-1 Role Definition Version 참조(Version Binding) |
| composite role version id (optional) | Node Type=COMPOSITE_ROLE일 때 Composite Role Version(§22) 참조 |
| external source reference (optional) | Node Type=EXTERNAL_ROLE_REFERENCE일 때 Legacy/IAM/ERP/Workflow 원본 참조(§64 Migration) |
| tenant id | 소속 테넌트 |
| actor type | Node가 대상으로 하는 Actor Type(Human/Service/System/API Client) |
| risk | Node의 Risk 등급 |
| criticality | Node의 Criticality 등급 |
| lifecycle status | Node가 참조하는 Role/Composite의 생명주기 상태 |
| assignable | 직접 Assignment 대상 가능 여부(Abstract Node는 false) |
| depth | 이 Graph Version에서의 깊이 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Node Type**: `ROLE · COMPOSITE_ROLE · ABSTRACT_ROLE · RESTRICTED_ROLE · SPECIALIZED_ROLE · EXTERNAL_ROLE_REFERENCE · CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Node 자체(role definition id·role version id 결합) | ABSENT(순신규) | Part 3-1 Role Definition Version이 설계 단계(코드 0)이므로 Node가 결합할 대상도 부재(BLOCKED_PREREQUISITE) |
| Node Type=ROLE 근접(Role 값공간 원자) | Hardcoded Parent-child(순서)·Unversioned Hierarchy / Organization Hierarchy Candidate | api_key `roleRank`의 4단계(`index.php:573`)·team_role 3단계(`TeamPermissions.php:120-131`)·admin_level(`UserAuth.php:1548,1614,1672`) — 각기 다른 값공간의 원자값이며 Graph Node로 정형화된 적 없음(ADR D-1 "선형 rank≠상속") |
| Node Type=COMPOSITE_ROLE 근접 | Permission Group Candidate(묶음) | team_role→acl_permission(`TeamPermissions.php:152`) — Role→Permission 묶음이지 Composite Role Node 아님(§6.3) |
| Node Type=EXTERNAL_ROLE_REFERENCE 근접 | IAM Group Nesting Candidate(Adapter) | SSO group→team_role 평면 매핑(`EnterpriseAuth.php:78-88`) — nested group 아닌 1-hop 매핑, Graph Node로 흡수 금지(§48) |
| assignable=false(Abstract Node 차단) | ABSENT(순신규) | 대응 substrate 없음 |

## 5. 설계 원칙

- `role version id`는 필수 결합이며(§14 Role Version Binding), Missing Role Version은 Runtime Guard(§69 `_HIERARCHY_ROLE_VERSION_MISSING`)로 차단한다.
- Abstract Node(`assignable=false`)는 Part 3-3 Assignment 대상에서 제외되며, 이는 Role Graph 내부 판정이지 조직/메뉴 위계와 무관하다.
- EXTERNAL_ROLE_REFERENCE Node는 §64 Legacy Hierarchy Migration의 Mapping Confidence·Manual Review 게이트를 통과하기 전까지 `assignable=false`로 고정한다(§65 자동 활성화 금지).
- roleRank/team_role/admin_level 등 실존 선형 값공간은 Node Type=ROLE의 "정규화 대상 후보"일 뿐이며, 이 문서의 substrate 매핑은 실 구현 근거가 아니라 오흡수 방지 경계다(ADR D-1).

## 6. Gap / BLOCKED_PREREQUISITE

Role Graph Node는 결합 대상인 Role Definition Version(Part 3-1)·Composite Role Version(§22)이 모두 설계 단계(코드 0)이므로 **완전 ABSENT(순신규) · BLOCKED_PREREQUISITE** 판정이다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
