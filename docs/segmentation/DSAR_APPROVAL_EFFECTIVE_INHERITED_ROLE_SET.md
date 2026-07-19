# DSAR — Approval Effective Inherited Role Set (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Effective Inherited Role Set)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

`APPROVAL_EFFECTIVE_INHERITED_ROLE_SET`은 특정 Source Role(Version)이 Hierarchy Edge(§12/§32)를 통해 최종적으로 상속·제외·충돌·의존하는 Role 전체를 하나의 Resolved 집합으로 캐시한다. Direct/Transitive Inherited Roles와 Excluded/Conflicting/Dependency Roles를 분리 저장해, "포함되지만 실제로는 제외/충돌로 무효화된 Role"을 혼동 없이 추적한다. Source Paths(§33 Role Path 참조 목록)를 함께 저장하여 이 Set이 어떤 경로들로부터 산출됐는지 재현 가능하게 한다(§53 Path Evidence와 결합).

★근접 주의: 현행 저장소에서 이름이 가장 근접한 실 구현은 `TeamPermissions::effectiveForUser`(`TeamPermissions.php:366-394` — owner/admin→full·manager→team acl·member→team cap 클램프)와 `effectiveScope`(`TeamPermissions.php:236-265` — owner=null·상속·실패 시 DENY_SCOPE)다. 이 둘은 **Role→Permission 묶음의 Effective 계산이지 Role→Role 상속 Resolution이 아니다**(GROUND_TRUTH §5 "근접이나 role 상속 아님"). Effective Inherited Role Set을 이 함수들의 확장으로 오인하지 말 것 — 입력(Role 집합을 순회하는 그래프 traversal)과 출력(Inherited/Excluded/Conflicting Role 집합) 자체가 이 함수들에 존재하지 않는다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| effective inherited set id | Set PK |
| tenant id | 소속 테넌트 |
| source role definition id | 기준 Role Definition |
| source role version id | 기준 Role Definition Version(Version Binding) |
| hierarchy version id | 사용된 Hierarchy Version(§10) 참조 |
| direct inherited roles | 직접 상속 Role 목록 |
| transitive inherited roles | 전이 상속 Role 목록 |
| excluded roles | §19 Role Exclusion으로 제외된 Role 목록 |
| conflicting roles | §18 Role Conflict로 충돌 표시된 Role 목록 |
| dependency roles | §17 Role Dependency로 요구되는 Role 목록 |
| source paths | 이 Set을 산출한 Role Path(§33) 참조 목록 |
| maximum depth reached | 이 Set 계산에서 도달한 최대 깊이 |
| actor eligibility result | §6.9 교집합 결과 |
| effective scope requirements | §39 Scope Propagation 최종 결과 |
| effective validity | §41 Validity Intersection 결과 |
| effective risk | §6.10 Risk 상향 결과 |
| effective criticality | Criticality 상향 결과 |
| effective permission projection id | §65 Effective Role Permission Projection 참조 |
| effective deny projection id | §66 Effective Role Deny Projection 참조 |
| set digest | 이 Set의 Canonical Digest |
| resolved at | 계산 시각 |
| valid until | 만료 시각(Cache Invalidation·§57 대상) |
| status | 생명주기 상태 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

Effective Inherited Role Set 자체는 별도 열거형이 스펙에 명시되지 않는다(§34). 구성 요소인 각 Role 참조에는 §31 Node Type, §12/§32 Edge Type, §67 Dependency Type이 간접 적용된다.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Set 자체(Direct/Transitive/Excluded/Conflicting/Dependency Role 집합) | ABSENT(순신규) | Role↔Role Effective Resolution 전무(GROUND_TRUTH §4 "Ancestor·Descendant Resolution = 전무") |
| **근접 Effective 계산 패턴(Role 상속 아님)** | Role Inclusion 아님·Permission Group Candidate(묶음) | `effectiveForUser`(`TeamPermissions.php:366-394`) — team_role 3단계에 대한 Permission 클램프이지 Role Set 상속 계산 아님(GROUND_TRUTH §5) |
| **근접 Scope 계산 패턴** | Role Inclusion 아님 | `effectiveScope`(`TeamPermissions.php:236-265` — fail-closed DENY_SCOPE) — Role 상속과 무관한 Permission Scope 계산(GROUND_TRUTH §5) |
| source paths(경로 증거) | ABSENT(순신규) | Role Path(§33) 자체가 ABSENT이므로 참조할 실체 없음 |
| excluded roles / conflicting roles | ABSENT(순신규) | Role Exclusion(§19)·Role Conflict(§18) 자체가 부재 |

## 5. 설계 원칙

- Effective Inherited Role Set은 **Resolved Cache**이며 원본 진실이 아니다 — Hierarchy Version(§10)이 바뀌면 재계산하고 이전 Set은 불변 보존한다(§6.15).
- Excluded/Conflicting Role은 목록에서 제거하지 않고 별도 필드로 "왜 제외/충돌됐는지" 명시 보존한다(§6.13 Diamond 명시 처리와 동일 원칙 — 조용히 사라지게 하지 않는다).
- `effectiveForUser`/`effectiveScope`(TeamPermissions.php)는 **알고리즘 스타일 참조**로만 사용 가능하다(fail-closed 클램프 패턴) — 이 함수들을 확장해 Role Set을 계산하는 방식은 §6.1~6.3 4분리를 위반하므로 채택하지 않는다. Role Graph traversal은 별도 신규 Resolver로 구축한다.
- `valid until` 만료 시 Cache Invalidation Trigger(§57) 목록에 명시된 이벤트(Role Version Activated 등) 발생 시 즉시 무효화한다.

## 6. Gap / BLOCKED_PREREQUISITE

Effective Inherited Role Set은 상위 Role Graph(§29)·Path(§33)·Hierarchy Edge(§12/§32)가 모두 ABSENT이므로 **완전 ABSENT(순신규) · BLOCKED_PREREQUISITE** 판정이다. 유일한 근접 패턴(`effectiveForUser`/`effectiveScope`)은 Role→Permission 묶음 계산이며 Role→Role 상속 계산이 아니므로 확장 기반으로 재사용할 수 없다(§6.3). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
