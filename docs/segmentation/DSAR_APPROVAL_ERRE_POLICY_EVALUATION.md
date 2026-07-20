# DSAR — ERRE Policy Evaluation (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §13
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (D-1·D-2·D-7)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_ROLE_RESOLUTION_*`(Policy Node)

---

## 1. 목적

본 DSAR은 ERRE Resolution Pipeline(SPEC §4)의 **12단계 Policy Evaluation**(SPEC §13)의 거버넌스 계약을 정의한다. Policy Evaluation은 Effective Role·Permission·Scope·Constraint·Deny·Risk 산출이 끝난 뒤, 이를 **정책 계층**에 통과시켜 최종 접근 결정을 형성하는 단계다. SPEC §13이 정의한 정책은 RBAC Policy·ABAC Policy·Scope Policy·Runtime Policy·Emergency Policy·Break Glass Policy·Organization Policy 7종이다.

GeniegoROI에는 이 정책 계층이 **직교 병렬로 부분 실재(PARTIAL)**한다. plan rank 게이트(`PlanPolicy`·`requirePlan`), scope 정책(`effectiveScope`), api_key RBAC 미들웨어가 각각 독립적으로 통과하나, 이를 하나의 canonical Policy Decision Point(PDP)로 통합 평가하는 계층은 부재하다(Ground-Truth ① §4). 본 계산기는 분산 정책 게이트를 파괴하지 않고 통합 Policy Evaluation 단계의 구현체로 승격(Extend)한다.

## 2. Ground-Truth 판정

### 2.1 실존 substrate (PARTIAL — Ground-Truth ① §2.C·D·B)

정책 게이트 substrate는 아래로 실재하나 **직교 병렬**이며 통합 PDP는 부재하다.

| 파일:라인 | 정책 종류 | 역할 | 상태 |
|---|---|---|---|
| `backend/src/PlanPolicy.php:19` | RBAC(plan rank) | `RANK` free/demo=0<starter=1<growth=2<pro=3<enterprise=4<admin=5(god) SSOT | PRESENT |
| `backend/src/PlanPolicy.php:27` | RBAC(feature) | `FEATURE_MIN_PLAN` — 기능키→최소플랜 맵 | PRESENT |
| `backend/src/PlanPolicy.php:41` | RBAC | `rank()` — 미정의→0 | PRESENT |
| `backend/src/PlanPolicy.php:47` | RBAC | `minPlanFor()` — 미정의 기능 fail-secure 'pro' | PRESENT |
| `backend/src/PlanPolicy.php:53` | RBAC | `allows()` — rank(plan)>=rank(minPlan) | PRESENT |
| `backend/src/Handlers/UserAuth.php:364` | RBAC(plan) | `requirePlan()` — PlanPolicy::RANK 단일소스로 userRank<minRank→403 | PRESENT |
| `backend/src/Handlers/UserAuth.php:77` | RBAC(plan) | `requireFeaturePlan()` — 미해석 plan→'free' fail-secure, admin/demo 우회 | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:236` | Scope Policy | `effectiveScope()` — 실효 데이터범위 정책 산출 | PRESENT |
| `backend/public/index.php:583` | RBAC(api_key) | `/v421/keys` → admin:keys scope OR rank≥3 아니면 403 | PRESENT |
| `backend/public/index.php:587` | RBAC(api_key) | write 메서드: write:* 없으면 ingest write:ingest OR rank≥1, 그외 rank≥2 아니면 403 | PRESENT |
| `backend/src/Handlers/UserAuth.php:1204` | Org/Owner Policy | `requireTenantSecurityWrite()` — plan 게이트와 **직교**하는 owner 게이트 | PRESENT |

**직교 병렬 근거**(Ground-Truth ① §4): 세 게이트(api_key role 미들웨어 → guardTeamWrite team_role → 핸들러 requirePlan+effectiveScope)는 각기 독립 통과한다. `requireTenantSecurityWrite`(`UserAuth.php:1204`)가 "plan 게이트와 직교" 명시 — **의도적 layering**이지 통합 PDP가 아니다.

### 2.2 부재 (ABSENT — Ground-Truth ① §4, ② 표 #1)

- **통합 Policy Evaluation 부재**: 세 차원을 한 함수 인자로 받아 단일 정책 결정을 반환하는 resolver 없음(① §4).
- **ABAC Policy PARTIAL/미통합**: data_scope 기반 속성 조건은 있으나(scope 차원) 통합 ABAC 정책 엔진 부재. (Dynamic/ABAC는 Part 3-5 계보.)
- **Emergency/Break Glass Policy ABSENT**: 명시적 명명 함수 부재(① §2.C 각주). `parent_user_id`가 위계 판정 substrate일 뿐.

### 2.3 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ② §4)

`RuleEngine.php`(channel_roas/sku_stock 캠페인 자동제어)·`Decisioning.php`·`PolicyTreeEditor` 등은 **마케팅 자동화 정책**이지 접근 권한 정책이 아니다. ERRE Policy Evaluation에 흡수 금지(ADR D-5·가짜녹색 회피).

## 3. Canonical 설계

### 3.1 통합 Policy Decision Point (PDP)

Policy Evaluation은 앞선 계산기(Role/Permission/Scope/Constraint/Deny/Risk)의 산출을 입력으로 7종 정책을 순차 평가해 단일 `ALLOW|DENY|REQUIRE_APPROVAL` 결정을 반환한다.

```
POLICY_EVALUATION_RESULT {
  decision     : ALLOW | DENY | REQUIRE_APPROVAL
  applied      : [ RBAC, ABAC, SCOPE, RUNTIME, EMERGENCY, BREAK_GLASS, ORG ]
  deny_source  : (DENY 시) 어떤 정책이 차단했는가
  evidence     : 각 정책 평가 근거 (SPEC §19 Evidence·§17 Explain)
  version      : 정책 버전 바인딩 (SPEC §33)
}
```

### 3.2 7종 정책 평가 (SPEC §13)

1. **RBAC Policy** — plan rank(`PlanPolicy::RANK`(`:19`)·`requirePlan`(`UserAuth.php:364`)) + api_key rank(`index.php:583`·`:587`) 통합.
2. **ABAC Policy** — data_scope 속성 조건(Part 3-5 계보 연동).
3. **Scope Policy** — `effectiveScope()`(`TeamPermissions.php:236`) 승격.
4. **Runtime Policy** — 세션·컨텍스트 기반 동적 정책.
5. **Emergency Policy** — 긴급 접근(신규·ABSENT).
6. **Break Glass Policy** — 최후수단 접근(신규·ABSENT).
7. **Organization Policy** — `requireTenantSecurityWrite()`(`UserAuth.php:1204`) owner 게이트 승격.

### 3.3 평가 순서·결합 규칙

- **deny 우선**: 어느 정책이든 DENY면 최종 DENY(Effective Deny Calculator·ADR D-4 정합).
- **fail-secure**: 미해석 plan→'free'(`requireFeaturePlan`(`:77`)), 미정의 기능→'pro'(`minPlanFor`(`:47`))의 fail-secure 시맨틱을 통합 규칙으로 승격.
- **직교→통합**: 현행 직교 병렬 게이트(① §4)를 단일 PDP로 순차 결합하되, 각 게이트의 결정 시맨틱은 보존.
- **REQUIRE_APPROVAL**: Effective Constraint의 Approval Requirement(`requiresHighValueApproval`)가 걸리면 REQUIRE_APPROVAL 반환.

### 3.4 Determinism (ADR D-2)

동일 (Subject·Context·정책 Version) → 동일 decision. 결과는 Snapshot·Evidence에 불변 영속.

### 3.5 Snapshot·Explain·Error·Warning (SPEC §17·§18·§30·§31)

- **Snapshot**(SPEC §18): decision·applied 정책·version을 불변 영속.
- **Explain**(SPEC §17): "어떤 Policy 때문인가"·"어떤 Rule 때문인가"를 사람이해·JSON 양형 제공. DENY 시 차단 정책을 명시.
- **Evidence**(SPEC §19): Policy Decision·Rule Evaluation 근거 기록.
- **Error**(SPEC §30): 정책 평가 실패 시 `POLICY_EVALUATION_FAILED`(fail-secure로 DENY).
- **Warning**(SPEC §31): 정책 갱신 반영 필요 시 `Policy Updated`.

### 3.6 직교→통합의 정합 원칙

현행 세 게이트는 서로 다른 타이밍(미들웨어/전역 가드/핸들러)에 통과한다(① §4). 통합 PDP는 이 순서를 **결정적 평가 시퀀스로 고정**하되 각 게이트의 개별 결정 시맨틱(예 `requireTenantSecurityWrite`(`:1204`)의 owner 직교성)을 보존한다. 통합은 게이트를 제거하는 것이 아니라 하나의 순차 평가로 감싸는 것이다(Extend·무후퇴).

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | substrate 승격 대상 |
|---|---|---|
| 12. Policy Evaluation | 7종 정책 순차 평가 | `PlanPolicy`(`:19~:53`)·`requirePlan`(`:364`)·`effectiveScope`(`:236`)·`index.php:583/:587` |
| 9. Explicit Deny Projection | Policy Deny 공급 | (Deny Calculator 연동) |
| 14/15. Effective Generation | 최종 decision 확정 | `requireTenantSecurityWrite`(`:1204`) |
| 16. Snapshot Generation | 정책 결정 스냅샷 | (신규 — ABSENT) |

SPEC §32 API `Validate Resolution`·`Explain Authorization` 진입점. SPEC §17 Explain이 "어떤 Policy 때문인가" 제공.

### 4.1 DB·Runtime Guard 계약 (SPEC §28·§33)

- **DB Constraint**(SPEC §33): 정책 결정 스냅샷은 Immutable Version·Version Binding. `FEATURE_MIN_PLAN`(`PlanPolicy.php:27`) 등 정책 맵은 버전 관리 대상.
- **Runtime Guard**(SPEC §28): Invalid Policy·Unknown Runtime Context 차단. plan/api_key 게이트 우회 시 차단.
- **Static Lint**(SPEC §29): plan/role 하드코딩 비교(233개소·ADR D-6)를 정책 우회 탐지 대상으로 등록.

## 5. 무후퇴 · Extend (ADR D-1·D-7)

- **Extend-only**: `PlanPolicy::RANK`(`:19`)·`requirePlan`(`UserAuth.php:364`)·`effectiveScope`(`:236`)·api_key 미들웨어(`index.php:583`·`:587`)를 파괴하지 않고 Policy Evaluation의 구현체로 승격. 직교 병렬을 단일 PDP로 통합.
- **실재 과신 회피**(D-7): `effectiveForUser`는 team_role+isAdmin만 결합하는 부분 PDP지 plan/api_key까지 통합한 kernel이 아니다(① §4). 통합 정책 평가로 오판 금지.
- **부재 과장 회피**(D-7): Emergency/Break Glass 명명 함수 grep 0은 실측 부재.
- **병행 유지**: 현행 requirePlan·effectiveScope·api_key 게이트는 ERRE 완성 전까지 유지·병행. fail-secure(free/pro 기본화) 절대 보존.

## 6. 완료 게이트

1. 7종 정책을 단일 PDP로 순차 평가해 ALLOW/DENY/REQUIRE_APPROVAL 반환.
2. deny 우선·fail-secure 시맨틱 100% 강제(ADR D-4·현행 승계).
3. 직교 3게이트(plan/api_key/team_role)를 통합하되 결정 무후퇴.
4. Policy 결정 Snapshot·Evidence·Version 불변 영속(SPEC §18·§19·§33).
5. Explain Engine이 적용 정책·차단 정책 제공(SPEC §17).
6. Regression: RBAC·ABAC·Approval 시나리오 100% 무후퇴(SPEC §36).
7. `RuleEngine`/`Decisioning` 오흡수 0(KEEP_SEPARATE 감사).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: 7종 정책 순차 평가·deny 우선·fail-secure(미해석 plan→free·미정의 기능→pro).
- **Integration**: plan(`requirePlan:364`)+api_key(`index.php:583/:587`)+team_role(effectiveScope) 직교 3게이트 통합 후 개별 결정 무후퇴, Approval Requirement→REQUIRE_APPROVAL.
- **Performance**: P95 ≤ 20ms·Policy Cache Hit ≥ 95%(SPEC §35).
- **Security**: 정책 우회·escalation 차단(SPEC §36).
- **Regression**: RBAC·ABAC·Approval·Audit 시나리오 100% 무후퇴(SPEC §36).

> 선행 의존: Part 1~3-6 인증 후 별도 승인 세션. 코드 0.

## 7. 반날조 인용 출처

- `PlanPolicy.php:19·:27·:41·:47·:53`·`UserAuth.php:77·:364·:1204`·`TeamPermissions.php:236`·`index.php:583·:587` — Ground-Truth ① §2·§4
- SPEC §4·§13·§17·§18·§19·§32·§33·§36
- ADR D-1(Extend)·D-2(deterministic)·D-4(deny 우선)·D-7(정직 분리)
- KEEP_SEPARATE: `RuleEngine.php`·`Decisioning.php`(마케팅 정책) — Ground-Truth ② §4

**요약**: Policy Evaluation = PARTIAL-substrate(plan RBAC·scope 정책·api_key RBAC 직교 병렬 실재) / ABSENT-governance(통합 PDP·Emergency/Break Glass 순신규). Extend-only·직교→단일 PDP 통합·deny 우선·fail-secure 승계. `RuleEngine`/`Decisioning`은 KEEP_SEPARATE. 코드 0·NOT_CERTIFIED·선행의존.
