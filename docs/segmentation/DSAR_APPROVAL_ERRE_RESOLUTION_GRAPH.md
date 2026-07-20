# DSAR — ERRE: 해석 그래프 DAG (APPROVAL_ROLE_RESOLUTION_GRAPH)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 Canonical Entity **`APPROVAL_ROLE_RESOLUTION_GRAPH`**(SPEC §5·§2 L85) — ERRE 해석의 **방향성 비순환 그래프(DAG)** — 를 명세한다.

SPEC §5(L164~174) 그래프 노드 구성:

- Subject Node · Assignment Node · Role Node · Hierarchy Node · Composite Node · Permission Node · Scope Node · Constraint Node · Deny Node · Policy Node · Risk Node.

**Graph는 반드시 DAG를 유지하며 순환 구조를 허용하지 않는다**(SPEC §5 L176). Hierarchy/Composite Expansion(SPEC §4-4·§4-5)은 이 그래프를 순회하며, 순환 발견 시 Runtime Guard(SPEC §28 "Cyclic Dependency")가 차단하고 `INVALID_RESOLUTION_GRAPH`(SPEC §30)를 발생시킨다.

**코드 변경 절대 0.** 설계 명세.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 권한 Resolution Graph = ABSENT

Ground-Truth ② #2(L28)가 실측: **role↔role 노드/엣지·순환탐지 백엔드 실코드 0.** 권한 해석을 위한 role 그래프·DAG·cycle detection이 존재하지 않는다. 현행 `effectiveForUser`(`TeamPermissions.php:393`)는 if/switch 직접 산출이며 그래프 순회가 아니다.

### 2.2 위계 유사물 = 그래프 아님 (약PARTIAL)

`parent_user_id` 기반 위계(`roleOf` `TeamPermissions.php:120`·`userByToken:316`·`normTeamRole` `UserAuth.php:1119`)는 **user↔user 부모참조**이지 role↔role 그래프가 아니다. Hierarchy Node substrate로 오해 금지 — 이는 owner/manager/member 3-tier 판정용 단일 부모 링크일 뿐 다단 role 상속 그래프가 아니다.

### 2.3 KEEP_SEPARATE — 비-권한 그래프/순환탐지 (오흡수 절대 금지)

Ground-Truth ② §4(L52~53)가 명시하는 **근접물이나 권한 resolution이 아닌** 그래프/cycle 코드. ERRE Graph substrate로 인용 절대 금지(가짜녹색 회피):

- `AdminMenu.php:504`·`:551`(`wouldCycle` = **menu_tree 조상체인** 순환탐지 — 메뉴 트리지 role 그래프 아님) — 비-권한·KEEP_SEPARATE.
- `PM/Dependencies.php:77`~`:90`(**task DFS** cycle 검출 — PM 태스크 의존성, authorization 무관) — 비-권한·KEEP_SEPARATE.
- `GraphScore.php:13`~`:25`(**마케팅 어트리뷰션 그래프** — 채널 기여도, role 무관) — 비-권한·KEEP_SEPARATE.

이 3종은 "그래프/순환탐지"라는 이름·알고리즘만 유사할 뿐 노드가 role이 아니다. ADR D-5·Ground-Truth ② §4 준수하여 ERRE Graph로 흡수·개명 금지.

### 2.4 종합

**Resolution Graph = ABSENT(순신규 그린필드).** role 노드 그래프·DAG·cycle detection 전무. `parent_user_id`는 그래프 아닌 단일 부모 링크. menu_tree/PM/GraphScore cycle 코드는 전부 KEEP_SEPARATE.

---

## 3. Canonical 설계 (DAG·순환 거부·노드 계약)

### 3.1 DAG 불변식 (SPEC §5 L176)

- 11개 노드 타입(Subject/Assignment/Role/Hierarchy/Composite/Permission/Scope/Constraint/Deny/Policy/Risk)으로 구성.
- **순환 구조 절대 불허**. Role→Role(hierarchy/composite) 엣지에서 순환 발견 시 즉시 거부.
- Graph Integrity는 DB Constraint(SPEC §33 "Graph Integrity")로도 강제.

### 3.2 순환 거부 경로

- Runtime Guard(SPEC §28)가 "Invalid Graph"·"Cyclic Dependency"를 차단.
- Error Contract(SPEC §30) `INVALID_RESOLUTION_GRAPH` 발생.
- 이 순환탐지 알고리즘은 **신규 구현**하되, KEEP_SEPARATE인 menu_tree `wouldCycle`·PM DFS를 재사용·개명하지 않는다(별도 role 그래프 전용).

### 3.3 파이프라인 소비

- Hierarchy Expansion(SPEC §4-4)·Composite Expansion(§4-5)이 그래프를 순회하여 Role Node에서 상속·합성 role을 확장.
- 확장 결과는 Effective Role Calculator(SPEC §7)로 전달되어 중복 제거+Canonical Ordering 적용.

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

Resolution Graph는 파이프라인 4·5단계(Hierarchy/Composite Expansion)의 **순회 대상 자료구조**다. Planner(SPEC §1-6)가 그래프 순회 계획을 수립하고, Executor(SPEC §16)가 결정적으로 순회하며, Optimizer(SPEC §15 "Graph Optimization")가 순회 비용을 최적화한다(형제 DSAR).

---

## 5. 무후퇴·Extend 원칙

- ADR D-1: 현행 `parent_user_id` 위계 판정(`roleOf:120`)은 **파괴하지 않고** Subject Resolution 입력으로 유지하되, 이를 role 그래프로 오승격하지 않는다(다단 role 상속은 신규 Graph에서 별도 표현).
- ADR D-5·무후퇴: KEEP_SEPARATE 그래프(menu_tree/PM/GraphScore)는 각자 도메인에서 그대로 유지 — ERRE Graph와 물리·논리 분리.

---

## 6. 완료 게이트 기여 (SPEC §37)

- SPEC §37 "Resolution Graph 구축"의 직접 책임 엔티티.
- Unit Test(SPEC §36) "Graph" 항목 + Security Test "Graph Manipulation" 통과가 인증 조건.
- Runtime Guard "Cyclic Dependency" 차단 검증(SPEC §28) 필수.
- 현재: **NOT_CERTIFIED · 코드 0 · BLOCKED_PREREQUISITE.**

---

## 7. 반날조 인용 출처 (전부 허용목록 내)

- `TeamPermissions.php:120`(`roleOf` parent_user_id 위계) · `:316`(via userByToken 위계) · `:393`(effectiveForUser if/switch·그래프 아님)
- `UserAuth.php:1119`(`normTeamRole` 위계)
- KEEP_SEPARATE(비-권한 그래프, substrate 인용 절대 금지·이름만 언급):
  - `AdminMenu.php:504`·`:551`(menu_tree wouldCycle)
  - `PM/Dependencies.php:77`~`:90`(task DFS cycle)
  - `GraphScore.php:13`~`:25`(마케팅 어트리뷰션 그래프)

**판정 요약: APPROVAL_ROLE_RESOLUTION_GRAPH = ABSENT(role DAG·cycle detection). parent_user_id는 그래프 아닌 단일 부모 링크. menu_tree/PM/GraphScore cycle 코드는 전부 비-권한·KEEP_SEPARATE. role 그래프는 순신규 그린필드.**
