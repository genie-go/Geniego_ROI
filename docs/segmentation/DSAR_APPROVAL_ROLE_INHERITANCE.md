# DSAR — Approval Role Inheritance (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Inheritance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Inheritance는 `INHERITS` Edge Type(§12)이 실제로 어떻게 Permission을 전파하는지를 규정하는 상위 개념이며, Direct·Transitive·Single·Multiple·Scoped·Restricted·Conditional·Version-bound 8가지 상속 형태를 지원해야 한다(스펙 §14). Permission Version Binding·Role Version Binding·Tenant 일치·Lifecycle 유효·Actor Eligibility 일치·Scope Expansion 금지·Explicit Deny 유지·Conflict 탐지·Path Evidence 생성이 필수 원칙이다. 저장소에는 이런 다형 Role 상속이 없다. 근접 substrate는 전부 비-Role 도메인의 유사 계산(effectiveForUser·wouldCycle)이며, Role→Role Version-bound Transitive 상속 자체는 순신규다.

## 2. Canonical 필드

Role Inheritance는 독립 테이블이 아니라 `APPROVAL_ROLE_HIERARCHY_EDGE`(§12, edge_type=`INHERITS`)의 의미론과, 그 계산 결과를 담는 `APPROVAL_EFFECTIVE_INHERITED_ROLE_SET`(§62)·`APPROVAL_ROLE_PATH`(§52)·`APPROVAL_ROLE_PATH_EVIDENCE`(§56)로 구성된다.

| 필드 / 개념 | 소속 | 의미 |
|---|---|---|
| edge type = `INHERITS` | §12 Edge | 상속 관계 표시 |
| inheritance depth | 파생(§59) | Direct=1, Transitive=N단계 |
| inheritance distance | 파생(§60) | Root 또는 특정 기준으로부터의 거리 |
| inheritance source chain | 파생(§61) | 상속이 유래한 경로 체인 |
| role version id (source/target) | §12 Edge | Role Version Binding — 어느 Version이 상속에 결합되는지 |
| permission version binding | Part 2 연계 | 상속되는 Permission의 Version 고정 |
| tenant id 일치 검증 | 계산 규칙 | Source·Target Role의 tenant 일치 강제 |
| actor eligibility intersection | §75 | 상속 경로 전체의 Actor Eligibility 교집합 |
| scope intersection | §71 | 상속 경로 전체의 Scope 교집합(자동 확대 금지·§72/§73) |
| explicit deny 유지 | §66 | 상속 중 Deny 소실 금지 |
| role path / path evidence | §52·§56 | 상속이 성립한 실제 경로와 그 증거 |
| effective inherited role set | §62 | 특정 Role이 최종적으로 상속받는 Role 집합(계산 결과) |

## 3. 열거형 / 타입

Role Inheritance 고유 enum은 없으며, 지원해야 하는 **Inheritance 지원 형태**는(스펙 §14): `Direct · Transitive · Single · Multiple · Scoped · Restricted · Conditional Inheritance Reference · Version-bound`.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Direct/Transitive Role Inheritance 자체 | ABSENT(순신규) | Role↔Role 상속·Transitive Closure·Ancestor/Descendant Resolution 전무(GROUND_TRUTH §4) |
| Version-bound 상속(Role Version 결합) | ABSENT(순신규) | Role Definition Version 자체가 Part 3-1에서 설계 단계(코드 0)라 결합 대상 부재(BLOCKED_PREREQUISITE) |
| Effective 계산(resolver/flatten 동형 알고리즘 참조) | 참조 패턴(Role 아님) | `effectiveForUser`(owner/admin→full·manager→team acl·member→team cap 클램프, `TeamPermissions.php:366-394`) — §34 Effective Inherited Set·§36 Permission Merge의 **동형 알고리즘 참조**이나 role→permission 묶음 계산이지 role 상속이 아님(GROUND_TRUTH §5) |
| Cycle 방지(상속 금지 조건의 알고리즘 참조) | 참조 패턴(Role 아님) | menu_tree `wouldCycle`(`AdminMenu.php:540-555`) — 조상체인 walk+self-ref+depth guard. §44 참조하되 메뉴 대상 |
| Actor Eligibility 교집합 오용 위험 | Organization Hierarchy Candidate(오용 위험) | `parent_user_id` owner→member 상속(`UserAuth.php:176,316,423-426`)은 계정 소유 상속이지 Role Actor Eligibility 교집합 대상이 아님(§6.1) |
| Scope Intersection 참조(fail-closed) | 참조 패턴(Role 아님) | `effectiveScope`(owner=null·상속·실패 DENY_SCOPE, `TeamPermissions.php:236-265`) — §39 Scope Propagation 참조(role→permission scope 계산이지 role 상속 scope 아님) |
| 선형 rank 상속 오변환 위험 | Hardcoded Parent-child(순서)·Unversioned Hierarchy | api_key `roleRank`(`index.php:573`)는 상속 관계가 아닌 순서일 뿐(§6.2 "선형 rank≠상속") |

## 5. 설계 원칙

- Direct·Transitive·Single·Multiple·Scoped·Restricted·Conditional·Version-bound 8가지 상속 형태를 모두 지원한다(스펙 §14) — 그중 다수는 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 구현되어야 Version-bound가 성립하므로 BLOCKED_PREREQUISITE.
- Role Version Binding·Permission Version Binding을 강제한다 — Version이 결합되지 않은 상속은 성립하지 않는다(§92/§93 Missing Version Detection과 연계).
- Tenant 일치를 강제한다(§6.14 Cross-Tenant Edge 차단과 정합).
- Lifecycle 유효성을 검증한다 — Retired/Deprecated Role은 Active 상속에서 제거한다(§6.11·§6.12).
- Actor Eligibility 일치(교집합)를 강제한다(§6.9) — `parent_user_id`의 사람 간 상속과 혼동하지 않는다.
- Scope Expansion을 금지한다(§6.7·§73 Scope Expansion Guard) — `effectiveScope`(`TeamPermissions.php:236-265`)의 fail-closed 패턴을 참조하되 role→permission이 아닌 role→role 상속에 맞게 재설계한다.
- Explicit Deny를 유지한다(§6.8) — 상속 경로 중 어느 지점에서도 Deny가 소실되지 않는다.
- Conflict를 탐지하고 Path Evidence를 생성한다(§79 Role Conflict Detection·§56 Role Path Evidence) — `effectiveForUser`(`TeamPermissions.php:366-394`)와 같은 "합성 결과만 반환하고 경로를 기록하지 않는" 패턴을 그대로 답습하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Inheritance는 **완전 ABSENT(순신규)** 판정이다. 알고리즘 형태(effective 계산·fail-closed scope·cycle 방지)는 비-Role 도메인(TeamPermissions·AdminMenu)에 근접 패턴이 실재하나 전부 role 대상이 아니므로 직접 재사용 불가하고 참조로만 활용한다(GROUND_TRUTH §5). Version-bound 상속은 Role Definition Version(Part 3-1)·Permission Version(Part 2)이 코드 0 설계 단계인 한 원천적으로 BLOCKED_PREREQUISITE다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
