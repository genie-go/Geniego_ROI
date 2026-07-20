# DSAR — ERRE Error Contract (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine Error Contract)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §30
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **불변**: fail-closed(deny 우선) · 무후퇴(Extend-only) · KEEP_SEPARATE(마케팅/ML/감사/PM 오흡수 금지) · 반날조(`파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §30(Error Contract)는 ERRE(Effective Role Resolution Engine)의 최종 권한 계산이 실패했을 때 반환해야 하는 **8종 하드 에러 코드**를 정의한다.

원문 8종(§30):

1. `ROLE_RESOLUTION_FAILED`
2. `INVALID_RESOLUTION_GRAPH`
3. `EFFECTIVE_ROLE_NOT_FOUND`
4. `EFFECTIVE_PERMISSION_NOT_FOUND`
5. `POLICY_EVALUATION_FAILED`
6. `RESOLUTION_TIMEOUT`
7. `INVALID_RUNTIME_CONTEXT`
8. `CACHE_CORRUPTED`

본 문서는 이 8개 코드 각각을 현행 substrate와 대조하여 **PARTIAL(근접 substrate 실재)** 또는 **ABSENT(순신규·거버넌스 계층 부재)** 로 정직 판정한다. 판정 핵심: 현행 저장소에는 **Canonical ERRE Error Contract 자체가 grep 0**이며(Ground-Truth ② §2 #1 Pipeline ABSENT), 유일하게 실물 코드로 존재하는 근접 실패 응답은 api_key 인증 미들웨어(`index.php:583`·`:587`)의 범용 403과 팀 도메인 fail-closed 센티넬(`TeamPermissions.php:234`)뿐이다. 이 둘을 ERRE 전용 에러 코드로 오표기하지 않는다.

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 근접 substrate (PARTIAL)

- **범용 authz 거부 응답**: api_key 미들웨어가 write 메서드에서 rank 미달 시 403(`index.php:587`), `/v421/keys`에서 admin scope 미달 시 403(`index.php:583`). 이는 **범용 게이트 거부**지 ERRE resolution 실패 코드가 아니다.
- **scope fail-closed 센티넬**: `DENY_SCOPE='__deny__'`(`TeamPermissions.php:234`) → `scopeValuesFor()`(`:272`) `[]` → `scopeSql()`(`:286`) `AND 1=0`. 비-owner scope 산출 실패 시 fail-closed로 전체 차단 — resolution 실패를 "거부"로 흡수하는 국소 로직.
- **plan 미해석 fail-secure**: `requireFeaturePlan()`(`UserAuth.php:77`)이 미해석 plan을 'free'로 강등, `minPlanFor()`(`PlanPolicy.php:47`)가 미정의 기능을 'pro' fail-secure. 계산 불능 시 안전측 강등 — 에러 코드가 아닌 안전 폴백.
- **effective 산출 진입점**: `effectiveForUser()`(`TeamPermissions.php:393`)·`effectivePermissions()` GET(`:694`)가 유일한 effective generator(팀 한정)이나, 실패 시 명명된 에러 코드를 던지지 않고 role 분기 기본값(member→명시권한 clamp)으로 귀결.

### 2.2 ABSENT 거버넌스 (SPEC §30 전용 코드)

- **Pipeline/Executor 부재**(Ground-Truth ② §2 #1, ABSENT): resolution이 파이프라인 없이 `TeamPermissions.php:393` if/switch 직접 산출 → `ROLE_RESOLUTION_FAILED`·`RESOLUTION_TIMEOUT`을 던질 스테이지 경계 자체가 없음.
- **Resolution Graph(DAG) 부재**(② §2 #2, ABSENT): role↔role 노드/엣지·순환탐지 grep 0 → `INVALID_RESOLUTION_GRAPH` 판정 대상 부재.
- **Snapshot/Cache 부재**(② §2 #3·#4, ABSENT): 불변 스냅샷·버전 캐시 grep 0 → `CACHE_CORRUPTED` 무결성 검사 대상 부재.
- **Runtime Context 부재**(② §2 #6, ABSENT): `INVALID_RUNTIME_CONTEXT` 판정에 필요한 Resolution Context 모델(SPEC §6) 부재.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

`SecurityAudit.php:25-31`(append-only 해시체인)·`Alerting.php:665`("executor identity"는 알림 실행자)·`Risk.php:12`(churn ML)·`PM/Dependencies.php:77-90`(task DFS cycle)·`GraphScore.php:13-25`(마케팅 그래프)는 이름만 유사할 뿐 **권한 resolution 에러가 아니다**(Ground-Truth ② §4). ERRE Error Contract에 흡수·개명 금지.

## 3. Canonical 설계 (8 Error Code)

| # | 코드 | 발동 스테이지(SPEC §4 Pipeline) | 판정 | 근거(`파일:라인`) |
|---|---|---|---|---|
| 1 | `ROLE_RESOLUTION_FAILED` | Effective Role Generation(14) | **PARTIAL** | 근접=effective 산출 함수(`TeamPermissions.php:393`) 실재하나 실패 시 명명 에러 없이 role 분기 기본값. 전용 코드 ABSENT |
| 2 | `INVALID_RESOLUTION_GRAPH` | Graph 무결성(§5 DAG) | **ABSENT** | Resolution Graph 자체 grep 0(② §2 #2). 근접 wouldCycle(`AdminMenu.php:504`)은 menu_tree라 KEEP_SEPARATE |
| 3 | `EFFECTIVE_ROLE_NOT_FOUND` | Subject/Assignment Resolution(1·3) | **PARTIAL** | 근접=`roleOf()` 정규화(`TeamPermissions.php:120`)가 키부재 시 member 강등(fail-closed)·에러 대신 안전값. 전용 not-found 코드 ABSENT |
| 4 | `EFFECTIVE_PERMISSION_NOT_FOUND` | Permission Projection(11) | **PARTIAL** | 근접=`subjectPerms()`(`TeamPermissions.php:202`) 빈 맵 반환·에러 아님 |
| 5 | `POLICY_EVALUATION_FAILED` | Policy Evaluation(12) | **PARTIAL** | 근접=plan 게이트 미해석 시 fail-secure 강등(`UserAuth.php:77`·`PlanPolicy.php:47`)이나 "실패 에러"가 아닌 안전 폴백. 통합 Policy Evaluation 스테이지 ABSENT |
| 6 | `RESOLUTION_TIMEOUT` | Executor(§16) | **ABSENT** | Executor·타임아웃 경계 부재(② §2 #1). 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`)에 타임아웃 계약 없음 |
| 7 | `INVALID_RUNTIME_CONTEXT` | Runtime Context(§6) | **ABSENT** | Resolution Context 모델 부재(② §2 #6). 근접=`X-Tenant-Id` 강제덮어쓰기(`index.php:608`)는 컨텍스트 검증이 아닌 위조차단 |
| 8 | `CACHE_CORRUPTED` | Cache(§21) | **ABSENT** | 권한계산 캐시 자체 grep 0(② §2 #4). 무효화 대상 없음 |

**설계 원칙**:

1. **범용 403을 ERRE 전용 에러로 오표기 금지** — `index.php:583`·`:587`의 범용 403은 미들웨어 rank 게이트 실패지 ERRE resolution 실패가 아니다. #1·#5는 PARTIAL로 정직 표기.
2. **fail-closed 우선(ADR D-4)** — resolution 불능 시 Explicit Deny로 귀결. 현행 `__deny__`(`TeamPermissions.php:234`)·member 강등(`:120`) fail-closed를 전역 에러 계약으로 승격.
3. **HTTP 매핑(설계 방향)**: #1~#5 = 403(Forbidden), #6 = 504(Gateway Timeout), #7 = 400(Bad Request), #8 = 500(Internal, 내부적으로 캐시 우회 재계산 폴백). 실 매핑은 구현 세션 확정.
4. **에러 응답에 Explain 참조 포함**(SPEC §17 Explain Engine 연계) — 모든 에러는 "왜 실패했는가"의 Evidence 핸들을 동반해야 하나, 현행 Explain Engine ABSENT(② §2 #6)이므로 순신규.

### 3.1 코드별 정직 판정 서술 (PARTIAL 4종)

- **`ROLE_RESOLUTION_FAILED`(#1)**: 현행에서 effective role 산출은 `effectiveForUser()`(`TeamPermissions.php:393`) if/switch 분기로 이뤄지며, 어떤 분기도 실패 시 예외가 아니라 **role별 안전 기본값**(owner→full, member→명시권한 clamp)으로 귀결한다. 즉 "resolution 실패"라는 개념적 상태가 코드에 존재하지 않는다. ERRE에서 Pipeline(SPEC §4) 14단계가 도입되면 각 스테이지 예외가 이 코드로 수렴하나, 현행엔 그 경계가 없어 PARTIAL(계산기는 있으나 실패 계약 없음)로 판정한다.
- **`EFFECTIVE_ROLE_NOT_FOUND`(#3)**: `roleOf()`(`TeamPermissions.php:120`)는 `parent_user_id` 키 부재 시 member로 강등하고 키 존재+빈값 시 owner로 판정한다. 즉 subject를 찾지 못해도 not-found를 던지지 않고 **fail-closed 기본값**으로 처리한다. 이는 보안상 옳으나(모호성→최소권한), 명시적 not-found 신호가 없어 감사·설명(Explain) 관점에서 PARTIAL이다.
- **`EFFECTIVE_PERMISSION_NOT_FOUND`(#4)**: `subjectPerms()`(`TeamPermissions.php:202`)는 acl_permission 행이 없으면 빈 맵을 반환한다. "권한 없음"과 "조회 실패"가 코드상 구분되지 않는다 — 둘 다 빈 맵. ERRE는 이 둘을 분리(진짜 not-found vs 명시적 no-grant)해야 감사 가능하나 현행은 미구분.
- **`POLICY_EVALUATION_FAILED`(#5)**: plan 게이트는 미해석 plan을 'free'로(`UserAuth.php:77`), 미정의 기능을 'pro'로(`PlanPolicy.php:47`) **안전측 강등**한다. 이는 "평가 실패"가 아니라 "실패를 안전값으로 흡수"다. 통합 Policy Evaluation 스테이지(SPEC §4 단계 12)가 없어, ABAC/Runtime/Emergency 정책 평가 실패를 이 코드로 던질 구조가 부재하다.

### 3.2 코드별 정직 판정 서술 (ABSENT 4종)

- **`INVALID_RESOLUTION_GRAPH`(#2)**: role↔role 상속 그래프(SPEC §5 DAG) 자체가 없다. 근접물 `AdminMenu.php:504`(menu_tree wouldCycle)는 메뉴 조상체인 순환탐지지 role 그래프가 아니므로 KEEP_SEPARATE. 그래프가 없으면 "무효 그래프" 판정 대상도 없다.
- **`RESOLUTION_TIMEOUT`(#6)**: stateless Executor(SPEC §16)·타임아웃 SLA 경계가 없다. 매 요청 DB 재조회(`TeamPermissions.php:202`)에 개별 타임아웃 계약이 없어, resolution 전체를 감싸는 시간 예산 개념이 부재하다.
- **`INVALID_RUNTIME_CONTEXT`(#7)**: Resolution Context 모델(SPEC §6: Session/Device/Auth Level/Geo)이 없다. `X-Tenant-Id` 강제덮어쓰기(`index.php:608`)는 tenant 위조차단이지 컨텍스트 유효성 검증이 아니다 — tenant 하나만 다루고 나머지 context 차원은 미모델링.
- **`CACHE_CORRUPTED`(#8)**: 권한계산 캐시 계층이 없어(② §2 #4) 무결성을 검증할 캐시 자체가 없다. Digest 기반 캐시 검증(SPEC §20·§21)은 순신규.

## 4. Kernel 매핑 (SPEC §4 Pipeline 스테이지 ↔ 에러 코드)

- **Subject Resolution(1)/Identity Validation(2)** → `EFFECTIVE_ROLE_NOT_FOUND`(#3). substrate=`roleOf()`(`TeamPermissions.php:120`)·`isAdmin()`(`:132`)·`userByToken()`(`UserAuth.php:249`).
- **Assignment Collection(3)** → `EFFECTIVE_PERMISSION_NOT_FOUND`(#4). substrate=`subjectPerms()`(`TeamPermissions.php:202`)·`subjectScope()`(`:215`).
- **Hierarchy/Composite Expansion(4·5)** → `INVALID_RESOLUTION_GRAPH`(#2). substrate ABSENT.
- **Policy Evaluation(12)** → `POLICY_EVALUATION_FAILED`(#5). substrate=`requireFeaturePlan()`(`UserAuth.php:77`)·`requirePlan()`(`:364`)·`allows()`(`PlanPolicy.php:53`).
- **Effective Generation(14)/Executor(§16)** → `ROLE_RESOLUTION_FAILED`(#1)·`RESOLUTION_TIMEOUT`(#6). substrate 중추=`effectiveForUser()`(`TeamPermissions.php:393`).
- **Snapshot(16)/Cache(17)** → `CACHE_CORRUPTED`(#8). substrate ABSENT.
- **Runtime Context** → `INVALID_RUNTIME_CONTEXT`(#7). substrate ABSENT.

## 5. 무후퇴 · Extend

- **재구현 금지(ADR D-1)**: `effectiveForUser()`(`TeamPermissions.php:393`)·`__deny__` 센티넬(`:234`)·plan fail-secure(`UserAuth.php:77`)를 **삭제·개명하지 않고** 이들이 던지는(또는 폴백하는) 실패 지점 위에 ERRE 전용 에러 코드를 신설한다.
- **fail-closed 강화(ADR D-4)**: 현행 국소 fail-closed(scope `AND 1=0`·member 강등·plan 'free' 강등)를 전역 Deny 우선 에러 계약으로 승격하되, 기존 안전측 동작을 후퇴시키지 않는다(더 열지 않는다).
- **범용 403 병행 유지**: `index.php:583`·`:587` 미들웨어 게이트는 ERRE 완성까지 존치. ERRE는 그 위 계층 — 미들웨어 통과 후에도 effective resolution이 deny면 전용 에러 발동.
- **KEEP_SEPARATE 불흡수**: `SecurityAudit`·`Alerting`·`Risk`·`PM/Dependencies`·`GraphScore`의 에러/실패 경로를 ERRE 에러 코드로 통합·개명 금지(가짜녹색 회피).

### 5.1 무후퇴 회귀 시나리오 (구현 세션 고정 대상)

1. **안전측 강등 보존**: `roleOf()`(`TeamPermissions.php:120`) 키부재→member 강등이 ERRE 도입 후에도 유지되어야 한다. 신규 `EFFECTIVE_ROLE_NOT_FOUND`(#3)가 강등을 대체해 "미해석 subject를 owner로 승격"하는 회귀는 금지(권한상승 취약점).
2. **deny 우선 불변(ADR D-4)**: `__deny__`(`TeamPermissions.php:234`)→`scopeSql AND 1=0`(`:286`)이 만드는 전면 차단이, 신규 에러 처리 경로에서 우회되어 allow로 새면 안 된다. 에러 발생 시 기본 응답은 항상 deny.
3. **plan fail-secure 보존**: `requireFeaturePlan()`(`UserAuth.php:77`) 미해석→'free', `minPlanFor()`(`PlanPolicy.php:47`) 미정의→'pro'가 `POLICY_EVALUATION_FAILED`(#5) 도입 후에도 유지. 에러가 게이트를 열지 않는다.
4. **미들웨어-ERRE 이중 게이트**: `index.php:583`·`:587` 통과가 ERRE 통과를 함의하지 않도록 — 두 계층은 독립 AND 조건. 어느 하나만 통과해도 접근 불가.

### 5.2 위협 모델 관점 (에러가 곧 보안 경계)

에러 계약은 단순 상태코드가 아니라 **fail-secure 경계**다. 잘못 설계된 에러 처리는 권한상승 벡터가 된다 — 예: resolution 실패를 "일단 허용 후 로그"로 처리하면 `RESOLUTION_TIMEOUT`(#6)이 곧 우회 경로가 된다. ERRE 8 코드는 전부 **실패=차단(fail-closed)** 원칙 하에 설계되어야 하며, 이는 현행 `__deny__`·member 강등의 정신을 전역화한 것이다. Static Lint(SPEC §29)로 233개소 하드코딩 authz(② §3)가 에러 경계를 우회하지 않는지 정적탐지한다.

## 6. 완료 게이트

- **BLOCKED_PREREQUISITE**: 8종 전부 선행 foundation(Part 1~3-6) 인증 + Resolution Pipeline/Graph/Cache(§4·§5·§21) 실 구현 이후에 발동 가능. 본 단계는 명세·계약만.
- **ABSENT(순신규 4종)**: `INVALID_RESOLUTION_GRAPH`(#2)·`RESOLUTION_TIMEOUT`(#6)·`INVALID_RUNTIME_CONTEXT`(#7)·`CACHE_CORRUPTED`(#8).
- **PARTIAL(근접·불충분 4종)**: `ROLE_RESOLUTION_FAILED`(#1)·`EFFECTIVE_ROLE_NOT_FOUND`(#3)·`EFFECTIVE_PERMISSION_NOT_FOUND`(#4)·`POLICY_EVALUATION_FAILED`(#5).
- **완료 판정**: 8종 전 코드가 실 Pipeline 스테이지 경계에서 발동 + HTTP 매핑 + Explain 핸들 동반 + 회귀 테스트 통과. NOT_CERTIFIED 유지(별도 승인 세션).

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 상위 SPEC §30 / ADR / Ground-Truth ①② 등장분이다.

- `backend/src/Handlers/TeamPermissions.php` — `:120`(roleOf) · `:132`(isAdmin) · `:202`(subjectPerms) · `:215`(subjectScope) · `:234`(DENY_SCOPE) · `:272`(scopeValuesFor) · `:286`(scopeSql) · `:393`(effectiveForUser) · `:694`(effectivePermissions)
- `backend/public/index.php` — `:583` · `:587` · `:608`
- `backend/src/Handlers/UserAuth.php` — `:77`(requireFeaturePlan) · `:249`(userByToken) · `:364`(requirePlan)
- `backend/src/PlanPolicy.php` — `:47`(minPlanFor) · `:53`(allows)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: `AdminMenu.php:504`(menu_tree wouldCycle) · `SecurityAudit.php:25-31` · `Alerting.php:665` · `Risk.php:12` · `PM/Dependencies.php:77-90` · `GraphScore.php:13-25`

---
**요약**: SPEC §30의 8 에러 코드 판정 = ABSENT 4(Graph/Timeout/RuntimeContext/Cache)·PARTIAL 4(ResolutionFailed/RoleNotFound/PermissionNotFound/PolicyFailed). 실물 실패 응답은 api_key 미들웨어 범용 403 + `__deny__` scope fail-closed뿐. 전용 ERRE 에러 계약은 순신규 그린필드. Extend-only·fail-closed 우선·NOT_CERTIFIED.
