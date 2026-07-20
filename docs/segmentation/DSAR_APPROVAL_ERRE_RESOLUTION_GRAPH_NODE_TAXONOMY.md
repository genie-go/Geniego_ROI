# DSAR — ERRE Resolution Graph Node Taxonomy (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §5(Resolution Graph · 11 Node)
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: Graph는 DAG 유지·순환 거부 · **반날조**: `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 · **menu_tree wouldCycle/PM DFS/GraphScore = KEEP_SEPARATE(비-권한 그래프)** · 289차 확정분 재플래그 금지

---

## 1. 목적

**Resolution Graph**(SPEC §5)는 ERRE가 effective 권한을 계산하는 데 사용하는 **권한 위상 그래프**이며, 본 편은 그 **11종 노드의 분류(taxonomy)**를 정의한다. SPEC §5 원문이 정의하는 노드는 다음과 같다.

`Subject Node · Assignment Node · Role Node · Hierarchy Node · Composite Node · Permission Node · Scope Node · Constraint Node · Deny Node · Policy Node · Risk Node` (11종)

Graph는 반드시 **DAG(Directed Acyclic Graph)**를 유지하며 **순환 구조를 허용하지 않는다**(SPEC §5 말미). 이 그래프 위에서 Subject→Assignment→Role→(Hierarchy/Composite 확장)→Permission/Scope/Constraint/Deny/Policy/Risk로 이어지는 결정 경로가 계산된다.

본 편의 핵심은 **role↔role 결정 그래프의 부재 판정**과, 표면상 유사한 비-권한 그래프(menu_tree·PM task DFS·마케팅 attribution)를 **KEEP_SEPARATE로 명확히 배제**하는 것이다. 그래프 오흡수는 ERRE 설계에서 가장 흔한 가짜녹색 위험이다.

## 2. Ground-Truth (11 Node substrate / ABSENT / KEEP_SEPARATE)

### 2.1 판정 요약 — **role↔role 그래프 ABSENT (순신규 그린필드)**

Ground-Truth ② §2 표 #2가 확정: **"Resolution Graph(DAG)/Cycle Detection (role↔role) = ABSENT — role 노드/엣지·순환탐지 0."** 현행 권한 계산은 **그래프가 아니라 if/switch 직접 산출**(`TeamPermissions.php:393` `effectiveForUser`)이다. 노드·엣지·DAG·순환탐지 자료구조가 권한 도메인에 실존하지 않는다.

### 2.2 11 노드 substrate 대조표

| # | SPEC §5 노드 | 판정 | 최근접 데이터(노드화 대상) / 근거 |
|---|---|---|---|
| 1 | Subject Node | **PARTIAL(데이터만)** | `roleOf`(`TeamPermissions.php:120`)·`userByToken`(`UserAuth.php:249`)·api_key(`index.php:575`) — subject 데이터는 실재하나 그래프 노드 아님 |
| 2 | Assignment Node | **PARTIAL(데이터만)** | acl_permission 행(`subjectPerms` `:202`)·data_scope 행(`subjectScope` `:215`) — 레코드지 노드 아님 |
| 3 | Role Node | **PARTIAL(협소)** | owner/manager/member(`roleOf` `:120`)·api_key role(`index.php:573`)·plan(`PlanPolicy.php:19`) — 3차원 분산 문자열, 노드 아님 |
| 4 | Hierarchy Node | **PARTIAL(하드코딩)** | owner>manager>member(`isManagerAdmin` `:136`)·plan RANK 0~5(`PlanPolicy.php:19`) — 하드코딩 순위지 그래프 위계 노드 아님 |
| 5 | Composite Node | **ABSENT** | role↔role 합성 부재. manage 슈퍼셋(`:39`)은 action 포함관계지 composite role 노드 아님 |
| 6 | Permission Node | **PARTIAL(vocabulary)** | ACTIONS 8동작(`:39`)·menu_key⇒actions 맵(`:202`) — 어휘지 그래프 노드 아님 |
| 7 | Scope Node | **PARTIAL(vocabulary)** | DATA_SCOPES 9차원(`:41`)·`effectiveScope`(`:236`) — 어휘지 노드 아님 |
| 8 | Constraint Node | **PARTIAL(분산)** | amount(`Catalog.php:1036`)·MFA(`UserAuth.php:941`)·api_key expires(`Keys.php:99`)·data_scope(`:272`) — 분산 constraint지 노드 아님 |
| 9 | Deny Node | **PARTIAL(센티넬)** | `__deny__`(`TeamPermissions.php:234`)·member 전역차단(`guardTeamWrite` `UserAuth.php:1167`) — 센티넬/게이트지 노드 아님 |
| 10 | Policy Node | **PARTIAL(게이트)** | plan 게이트(`requirePlan` `UserAuth.php:364`·`PlanPolicy::allows` `:53`) — 게이트지 노드 아님 |
| 11 | Risk Node | **ABSENT** | role→risk 노드 부재(Ground-Truth ② §2 #7 grep 0) |

**결론**: 11 노드 중 **Composite·Risk 2종은 대상 데이터 자체 ABSENT**, 나머지 9종은 **노드화할 데이터는 분산 실재하나 그래프 구조·엣지·DAG·순환탐지는 전무**하다. 즉 "노드 재료는 있으나 그래프는 없다."

### 2.3 KEEP_SEPARATE — 비-권한 그래프/순환탐지 (오흡수 절대 금지·가짜녹색 회피)

Ground-Truth ② §4가 확정한 대로, 다음 그래프/DFS/순환탐지는 **권한 resolution 그래프가 아니다.** 절대 ERRE Resolution Graph substrate로 인용 금지 — 이름·구조(cycle detection·DAG)가 유사해 오흡수 위험이 가장 큰 항목이다.

- `AdminMenu.php:504`·`:551`(`wouldCycle`) — **menu_tree 조상 체인 순환탐지**. 메뉴 트리 무결성 검증이지 role↔role 그래프가 아니다. 구조가 DAG cycle check와 동일해 보이나 **권한 결정 그래프가 아님.**
- `PM/Dependencies.php:77`~`:90`(task DFS) — **PM 태스크 의존성 DFS**. authorization 무관 그래프. **권한 아님.**
- `GraphScore.php:13`~`:25`(마케팅 어트리뷰션 그래프) — 광고 기여 그래프. **권한 아님.**

이 셋은 "DAG·cycle·graph·DFS" 키워드가 정확히 겹치므로, MEMORY 규칙(§Part3-2 판정)대로 "위계 유사 3종은 Role↔Role 그래프가 아니다"를 그대로 준수한다. ERRE Graph는 이들을 재사용·개명·통합하지 않는다(ADR D-5).

## 3. Canonical 설계

### 3.1 Canonical Entity — `APPROVAL_ROLE_RESOLUTION_GRAPH`(SPEC §2)

전량 신규. 11 노드 타입 + 엣지 타입 정의.

| 노드 타입 | 역할 | 진입 엣지 |
|---|---|---|
| Subject Node | 그래프 루트(사용자/api_key/service) | (루트) |
| Assignment Node | subject→role 부여 사실 | Subject→Assignment |
| Role Node | 부여된 role | Assignment→Role |
| Hierarchy Node | role 상속 관계 | Role→Hierarchy→Role(상위) |
| Composite Node | role 합성 관계 | Role→Composite→Role(구성원) |
| Permission Node | role/composite가 부여하는 action | Role→Permission |
| Scope Node | permission 적용 범위 | Permission→Scope |
| Constraint Node | 조건 제약(time/amount/device 등) | Permission/Scope→Constraint |
| Deny Node | 명시적 거부(Allow보다 우선) | Subject/Role→Deny |
| Policy Node | 정책 평가 노드 | Role/Permission→Policy |
| Risk Node | risk 등급 노드 | Subject/Role→Risk |

### 3.2 DAG 불변식

- **순환 금지**: Hierarchy/Composite 엣지가 순환을 형성하면 `INVALID_RESOLUTION_GRAPH`(SPEC §30) 거부. Runtime Guard(§28 Cyclic Dependency)가 매 resolution 시 DAG 검증.
- **결정적 순회**: 노드 방문 순서는 Pipeline(§4) 순서에 고정 — Subject→Assignment→Hierarchy/Composite 확장→Scope/Constraint/Deny/Risk/Permission Projection→Policy. 동일 그래프→동일 순회→동일 결과(§35 Deterministic).
- **Deny 우선**: Deny Node는 어떤 Allow(Permission/Role) 경로보다 우선한다(ADR D-4).

### 3.3 노드화 계약

현행 분산 데이터(9종 PARTIAL)를 노드로 승격: role 문자열→Role Node, acl_permission 행→Assignment/Permission Node, data_scope→Scope Node, `__deny__` 센티넬→Deny Node, plan 게이트→Policy Node. Composite/Risk Node는 대상 데이터 순신규.

## 4. Kernel 매핑 (노드→Pipeline 단계)

| 노드 | 생성 Pipeline 단계(§4) | 승격 대상 substrate |
|---|---|---|
| Subject | Subject Resolution(§4-1) | `roleOf`(`:120`)·`userByToken`(`UserAuth.php:249`) |
| Assignment | Assignment Collection(§4-3) | `subjectPerms`(`:202`)·`subjectScope`(`:215`) |
| Hierarchy | Hierarchy Expansion(§4-4) | `isManagerAdmin`(`:136`)·`PlanPolicy::RANK`(`:19`) |
| Composite | Composite Expansion(§4-5) | **ABSENT**(순신규) |
| Permission | Permission Projection(§4-11) | `normActions`(`:182`)·`actionsCover`(`:194`) |
| Scope | Scope Projection(§4-7) | `effectiveScope`(`:236`)·`scopeSql`(`:286`) |
| Constraint | Constraint Projection(§4-8) | `Catalog.php:1036`·`UserAuth.php:941`·`Keys.php:99` |
| Deny | Deny Projection(§4-9) | `__deny__`(`:234`)·`guardTeamWrite`(`UserAuth.php:1167`) |
| Policy | Policy Evaluation(§4-12) | `requirePlan`(`UserAuth.php:364`)·`PlanPolicy::allows`(`:53`) |
| Risk | Risk Projection(§4-10) | **ABSENT**(순신규) |

## 5. 무후퇴 · Extend

- **Golden Rule(Extend, ADR D-1)**: 현행 role 문자열·acl_permission·data_scope·deny 센티넬을 **파괴하지 않고** 그래프 노드로 승격(래핑)한다. `effectiveForUser`의 if/switch 로직은 그래프 순회 결과로 재표현하되 동일 결정을 보장.
- **KEEP_SEPARATE 절대 준수**: menu_tree `wouldCycle`(`AdminMenu.php:504`·`:551`)·PM DFS(`:77~:90`)·GraphScore(`:13~:25`)는 각 도메인에 존치. 순환탐지 로직이 유사하다고 ERRE Graph로 통합·재사용 금지(가짜녹색 회피).
- **무후퇴**: 그래프 도입은 결정 결과를 바꾸지 않는다 — 동일 권한 판정을 그래프 위상으로 재구성할 뿐. DAG 검증은 fail-secure(순환 시 거부).
- **양방향 정직(ADR D-7)**: 노드 재료(9종)가 분산 실재함을 "그래프 있음"으로 과신 금지. Composite/Risk 노드 grep 0을 "숨겨진 구현"으로 과장 금지.

## 6. 완료 게이트

- [ ] `APPROVAL_ROLE_RESOLUTION_GRAPH` 11 노드 타입·엣지 타입 실 구현
- [ ] DAG 불변식·순환탐지(Cyclic Dependency Guard §28) 구현
- [ ] 9종 분산 데이터 노드화 승격·Composite/Risk 노드 순신규 구현
- [ ] 그래프 순회 결과 = `effectiveForUser` 기존 결정과 동치 회귀 검증(무후퇴)
- [ ] KEEP_SEPARATE(menu_tree/PM DFS/GraphScore) 미통합·미재사용 회귀 검증
- [ ] SPEC §33 Graph Integrity DB 제약 배선
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 Part 3-1(Role Registry)·3-2(Hierarchy/Composite) 실구현 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §5(11 노드·DAG·순환거부)·§4(Pipeline)·§28(Cyclic Dependency Guard)·§30(INVALID_RESOLUTION_GRAPH)·§33(Graph Integrity)·§35(Deterministic)
- ADR D-1(Extend)·D-4(Deny 우선)·D-5(KEEP_SEPARATE)·D-7(양방향 정직)
- Ground-Truth ① §2-A(`TeamPermissions.php:39`·`:41`·`:120`·`:136`·`:182`·`:194`·`:202`·`:215`·`:234`·`:236`·`:286`)·§2-B(`index.php:573`·`:575`)·§2-C(`UserAuth.php:249`·`:364`·`:941`·`:1167`)·§2-D(`PlanPolicy.php:19`·`:53`)·§2-E(`Keys.php:99`)
- Ground-Truth ② §2 #2(role↔role 그래프 ABSENT)·#7(Risk ABSENT)·§4(`AdminMenu.php:504`/`:551` wouldCycle·`PM/Dependencies.php:77~:90`·`GraphScore.php:13~:25` = **KEEP_SEPARATE**)·§2 #8(Constraint `Catalog.php:1036`)
- role↔role 그래프·Composite·Risk 노드는 grep 0 실측 — 비-권한 그래프로 채우기 절대 금지.
