# DSAR — Role Permission Expansion Guard (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: §43 Permission Expansion Guard)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Permission Expansion Guard(스펙 §43)는 Scope Expansion Guard(§42)와 짝을 이루어, Role Hierarchy/Composite Role의 새 Version이 **새 Permission 유입 · Critical/Administrative/Approval/Export/Sensitive Data/User Administration/Override Permission 유입 · Explicit Deny 제거 · Permission Exclusion/Constraint 제거 · Optional Component 기본 활성화 · Transitive Edge 추가 · Maximum Depth 증가 · Multiple Inheritance 허용**과 같이 권한 자체가 확대되는 변경을 탐지하는 Mandatory Control이다. 저장소에는 이런 Permission 유입 diff 탐지가 없으며, 이 Guard가 반드시 잡아야 할 "Critical/Administrative Permission 무검증 유입"의 실사례(plan god flag)가 이미 존재한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| permission expansion guard id | Guard 판정 레코드 PK |
| hierarchy version id / composite version id | 검사 대상 Version 참조 |
| detected expansion type | 아래 Permission Expansion Signal enum(복수 가능) |
| newly introduced permission refs | 신규 유입 Permission Definition 목록 |
| removed deny refs | 제거된 Explicit Deny 목록(§6.8 위반 후보) |
| severity | Low · Medium · High · Critical(Critical/Administrative/Approval/Export/Override Permission 유입 시 자동 Critical) |
| block activation | High/Critical 시 true(강제) |
| simulation required | High/Critical 시 true(강제) |
| approval reference | 승인 근거 참조 |
| tenant id | 소속 테넌트 |
| status | 생명주기 상태 |
| immutable digest | 불변 다이제스트 |
| evidence | 근거 레코드 참조 |

## 3. 열거형 / 타입

**Permission Expansion Signal**: `NEW_PERMISSION_INTRODUCED` · `CRITICAL_PERMISSION_INTRODUCED` · `ADMINISTRATIVE_PERMISSION_INTRODUCED` · `APPROVAL_PERMISSION_INTRODUCED` · `EXPORT_PERMISSION_INTRODUCED` · `SENSITIVE_DATA_PERMISSION_INTRODUCED` · `USER_ADMINISTRATION_PERMISSION_INTRODUCED` · `OVERRIDE_PERMISSION_INTRODUCED` · `EXPLICIT_DENY_REMOVED` · `PERMISSION_EXCLUSION_CONSTRAINT_REMOVED` · `OPTIONAL_COMPONENT_DEFAULT_ACTIVATED` · `TRANSITIVE_EDGE_ADDED` · `MAXIMUM_DEPTH_INCREASED` · `MULTIPLE_INHERITANCE_ALLOWED`

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| Permission Expansion 탐지 로직 자체 | ABSENT(순신규) | Role Hierarchy/Composite Version·Permission diff 비교 전무(GROUND_TRUTH §4) |
| `CRITICAL_PERMISSION_INTRODUCED`/`ADMINISTRATIVE_PERMISSION_INTRODUCED`/`OVERRIDE_PERMISSION_INTRODUCED`가 막아야 할 부정 사례 | Anti-pattern(§6.5·전역 우회) | `isAdmin` plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`) — plan='admin'이면 Administrative/Critical/Override Permission 전부를 diff 검증 없이 즉시 부여. Permission Expansion Guard가 존재했다면 Critical로 탐지·차단해야 할 패턴의 실사례 |
| `EXPLICIT_DENY_REMOVED`(근접 참조 — fail-closed 반례) | Role Inclusion Candidate 아님 | `effectiveScope`(실패 시 DENY_SCOPE)(`TeamPermissions.php:236-265`)는 Deny를 기본값으로 삼는 fail-closed 설계이며, Guard가 지향하는 "Deny 제거를 탐지·차단"의 반대 방향(Deny 유지) 참조 패턴 |

## 5. 설계 원칙

- 새 Hierarchy/Composite Version 활성화 전, 직전 Active Version과 Effective Permission Set·Effective Deny Set을 diff 비교해 Permission Expansion Signal을 탐지한다(스펙 §43 목록 전부).
- Critical/Administrative/Approval/Export/Sensitive Data/User Administration/Override Permission 유입은 자동 Critical severity로 분류하고 활성화를 차단한다(§6.16 Mandatory Control·고객 설정 비활성화 불가).
- `isAdmin` plan god flag(`TeamPermissions.php:132`·`AuthContext.jsx:720`)는 이 Guard가 존재하지 않을 때 발생하는 결과의 실사례로만 참조한다 — 이 문서는 그 경로를 수정하지 않으며(코드 0), 289차 P1~P4 재플래그 대상도 아니다(별도 판정 대상·재논의 금지).
- Optional Component가 기본으로 활성화되는 변경(`OPTIONAL_COMPONENT_DEFAULT_ACTIVATED`)과 Multiple Inheritance 허용 전환은 Permission 유입 폭을 암묵적으로 넓히므로 Scope Expansion Guard(§42)와 별개로 반드시 이 Guard가 함께 탐지한다.
- `effectiveScope`의 fail-closed 설계(`TeamPermissions.php:236-265`)는 Deny 유지 원칙의 참조 패턴이나, Role Hierarchy Edge/Composite Version diff 비교 로직으로 그대로 승격하지 않는다(대상 층이 다름).

## 6. Gap / BLOCKED_PREREQUISITE

Permission Expansion Guard는 **완전 ABSENT(순신규)** 판정이다. 저장소에는 Version 간 Permission 확대 diff 비교 로직이 없다. 유일하게 확인 가능한 것은 이 Guard가 막으려는 확장 패턴의 실사례(`isAdmin` plan god flag·`TeamPermissions.php:132`·`AuthContext.jsx:720`)와, Deny 유지의 참조 패턴(`effectiveScope`·`TeamPermissions.php:236-265`)뿐이다(반날조 — anti-pattern을 구현 근거로 오인 금지). 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 코드 완성 후 별도 승인세션(RP-002)에서 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
