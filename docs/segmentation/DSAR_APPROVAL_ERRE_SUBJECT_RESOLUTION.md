# DSAR — ERRE Subject Resolution + Identity Validation (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §4(1~2단계)
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (D-1·D-7·D-8)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_ROLE_RESOLUTION_CONTEXT`(Subject Node)

---

## 1. 목적

본 DSAR은 ERRE Resolution Pipeline(SPEC §4)의 **1단계 Subject Resolution**과 **2단계 Identity Validation**의 거버넌스 계약을 정의한다. Subject Resolution은 인입 요청을 **정규화된 Subject 식별자**(user/api_key/agency/admin + tenant + rank 차원)로 확정하는 파이프라인의 첫 관문이며, 이후 모든 계산기(Assignment/Scope/Constraint/Deny/Risk/Policy)의 입력 기준점이다.

GeniegoROI에는 Subject 해석 substrate가 **차원별로 풍부하게 실재(PARTIAL)**하나, 세 rank 체계(plan·api_key·team_role)를 **하나의 canonical Subject로 통합**하는 resolver가 부재하다(Ground-Truth ① §4). 세 차원은 직교 병렬로 산재하며 한 요청에서 동시 해석되지 않는다. 본 계산기는 분산된 Subject 해석 함수를 파괴하지 않고 통합 Subject Resolution 단계의 구현체로 승격(Extend)한다.

## 2. Ground-Truth 판정

### 2.1 실존 substrate (PARTIAL — Ground-Truth ① §2.A·B·C·D)

Subject/Identity 해석 substrate는 아래로 실재한다(반날조 허용목록 등장분).

| 파일:라인 | 역할 | Subject 차원 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:120` | `roleOf()` — team_role 정규화. fail-closed: `parent_user_id` 키존재+빈값→owner·키부재→member 강등 | team_role | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:132` | `isAdmin()` — plan/plans==='admin' god flag | admin flag | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:134` | `isOwnerAdmin()` — admin OR roleOf==owner | 파생 판정 | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:136` | `isManagerAdmin()` — admin OR role∈{owner,manager} | 파생 판정 | PRESENT |
| `backend/src/Handlers/UserAuth.php:249` | `userByToken()` — 세션→app_user, plan=`CASE admin ELSE COALESCE(plans,plan,demo)`, team_role 기본(:316 `parent_user_id?member:owner`), 유휴 자동로그아웃 | 통합 user row | PRESENT |
| `backend/src/Handlers/UserAuth.php:49` | `resolveTenantPlan()` — 테넌트 owner 유효 plan 도출(만료 다운그레이드·fail-open null) | plan | PRESENT |
| `backend/src/Handlers/UserAuth.php:119` | `resolveActivePlan()` — 구독만료→free 자동 다운그레이드(DB 영속) | plan lifecycle | PRESENT |
| `backend/src/Handlers/UserAuth.php:409` | `authedTenant()` — 인증 user 격리 tenant, admin `X-Act-As-Tenant:platform_growth` 임퍼소네이트 제한 허용, 하위계정 상속 | tenant | PRESENT |
| `backend/src/Handlers/UserAuth.php:1119` | `normTeamRole()` — 정규화, 미지정→owner(fail-open·roleOf와 반대) | team_role | PRESENT |
| `backend/src/Handlers/UserAuth.php:2998` | `resolveAdminByToken()` — plan/plans='admin' 세션→admin row(admin SSOT) | admin | PRESENT |
| `backend/public/index.php:573` | `roleRank = ['viewer'=>0,'connector'=>1,'analyst'=>2,'admin'=>3]` | api_key rank | PRESENT |
| `backend/public/index.php:608` | `auth_key`/`auth_role`/`auth_tenant` 주입 + X-Tenant-Id 강제덮어쓰기(위조차단) | context 주입 | PRESENT |
| `backend/public/index.php:99` | agency `agt_` 토큰 → auth_tenant 서버바인딩 + auth_role 주입 | agency 차원 | PRESENT |
| `backend/public/index.php:423` | api_key(AI경로)·세션 토큰 → auth_tenant/auth_role(viewer) fallback 주입 | context fallback | PRESENT |
| `backend/src/PlanPolicy.php:19` | `RANK` free/demo=0..admin=5(god) plan rank SSOT | plan rank | PRESENT |

**Identity Validation 실측**: `userByToken()`(`:249`)의 유휴 자동로그아웃·`index.php:608`의 X-Tenant-Id 강제덮어쓰기(위조차단)·`authedTenant()`(`:409`)의 임퍼소네이트 제한 허용이 신원 검증 substrate다. 이번 세션 P1~P5 보안수정(admin SSOT `resolveAdminByToken`)은 Subject Resolution의 실 substrate로 재활용(ADR D-7·재플래그 금지).

### 2.2 부재 — 3-rank 통합 부재 (ABSENT — Ground-Truth ① §4)

**통합 Subject resolver 부재**가 핵심 갭이다:
- 세 rank(plan `PlanPolicy::RANK`(`:19`)·api_key `index.php:573`·team_role)를 한 함수 인자로 받아 단일 canonical Subject를 반환하는 resolver 없음.
- 세 게이트는 직교 병렬 layering(미들웨어 api_key role → guardTeamWrite team_role → 핸들러 requirePlan plan).
- api_key 경로와 세션(team_role) 경로는 **상호배타** — 한 요청에서 세 rank 동시해석 안 됨(① §4).
- **api_key roleRank 중복 정의**(`index.php:573` ↔ `AdminMenu.php:74`): 단일소스 아님(ADR D-8 — 향후 diverge 가능·SSOT화 대상).
- break-glass 명시적 명명 함수 부재. `parent_user_id`가 `userByToken:316`·`roleOf:120`·`normTeamRole` 위계 판정 substrate(① §2.C 각주).

### 2.3 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ①/② §4)

`EnterpriseAuth.php`(SCIM/SSO team_role 프로비저닝)는 provisioning이지 resolution이 아니다(① §5 참고). `EnterpriseAuth.php:314`(SAML SPSSODescriptor)는 SoD 오탐. Subject Resolution substrate로 인용 금지.

## 3. Canonical 설계

### 3.1 Canonical Subject

```
RESOLVED_SUBJECT {
  subject_type       : user | api_key | agency | admin
  subject_id         : 정규화 식별자
  tenant             : authedTenant 격리 결과 (임퍼소네이트 검증 포함)
  ranks              : { plan_rank, api_key_rank, team_role }   // 3-rank 통합
  identity_validated : bool (세션·토큰·유휴·위조 검증 통과)
  resolution_version : 불변 버전 바인딩
  evidence           : 각 차원 해석 근거 (SPEC §17 Explain)
}
```

### 3.2 3-rank 통합 resolver (SPEC §4 1단계)

현행 직교 병렬(① §4)을 **단일 canonical Subject로 통합**한다:
- **plan_rank** — `PlanPolicy::RANK`(`:19`)·`resolveActivePlan()`(`UserAuth.php:119`) 승격.
- **api_key_rank** — `index.php:573` roleRank 승격 + `AdminMenu.php:74` 중복 정의 **SSOT화**(ADR D-8).
- **team_role** — `roleOf()`(`:120`)·`normTeamRole()`(`:1119`) 승격. `roleOf`(fail-closed)와 `normTeamRole`(fail-open) 상반 시맨틱을 통합 정책으로 조정(fail-closed 우선 권장).
- **admin** — `resolveAdminByToken()`(`:2998`) SSOT 승격.

### 3.3 Identity Validation (SPEC §4 2단계)

- 세션·토큰 검증(`userByToken`(`:249`))·유휴 자동로그아웃 승격.
- tenant 위조차단(`index.php:608` X-Tenant-Id 강제덮어쓰기)·임퍼소네이트 제한(`authedTenant`(`:409`)) 승격.
- 검증 실패 시 **fail-closed**(모호성→deny·ADR D-4 정합).

### 3.4 Determinism (ADR D-2)

동일 (토큰·Context·Version) → 동일 RESOLVED_SUBJECT. Subject 해석 결과는 Snapshot의 기준점이며 Cache Invalidation은 assignment/role 변경 시(SPEC §22).

### 3.5 fail-closed vs fail-open 상반 시맨틱 조정

현행 substrate는 미지정 team_role 처리가 **상반**된다:
- `roleOf()`(`:120`) — 키부재→member 강등(**fail-closed**·안전측).
- `normTeamRole()`(`:1119`) — 미지정→owner(**fail-open**·`roleOf`와 반대).

두 함수가 서로 다른 경로에서 호출되며 상반된 기본값을 낸다(① §2.C). 통합 Subject Resolution은 이 모호성을 단일 정책으로 확정해야 하며, ADR D-4(deny 우선·모호성→deny) 정합상 **fail-closed(member 강등) 우선**이 권장 기준이다. 단 이는 무후퇴 검증(현행 owner 기본 경로가 깨지지 않는지) 하에 실 구현 세션에서 결정.

### 3.6 Snapshot·Explain·Error·Warning (SPEC §17·§18·§30·§31)

- **Snapshot**(SPEC §18): RESOLVED_SUBJECT를 Resolution Version과 기준점으로 영속.
- **Explain**(SPEC §17): "어떤 Assignment/rank 때문에 이 Subject로 해석되었는가" 제공.
- **Error**(SPEC §30): 신원 검증 실패 시 `INVALID_RUNTIME_CONTEXT` 또는 `ROLE_RESOLUTION_FAILED`(fail-closed로 deny).
- **Warning**(SPEC §31): 임퍼소네이트 활성·tenant 전환 시 `Runtime Context Changed`.

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | substrate 승격 대상 |
|---|---|---|
| 1. Subject Resolution | 3-rank 통합 canonical Subject | `roleOf`(`:120`)·`userByToken`(`:249`)·`authedTenant`(`:409`)·`resolveAdminByToken`(`:2998`)·`roleRank`(`index.php:573`)·`PlanPolicy::RANK`(`:19`) |
| 2. Identity Validation | 세션·토큰·위조·유휴 검증 | `userByToken`(`:249`)·`index.php:608` |
| 3. Assignment Collection | Subject 기준 assignment 수집 | (Assignment DSAR 연동) |

Subject Resolution 산출은 전 계산기의 입력 기준점. SPEC §17 Explain이 "어떤 Assignment/rank 때문인가" 제공.

### 4.1 DB·Runtime Guard 계약 (SPEC §28·§33)

- **DB Constraint**(SPEC §33): Subject 스냅샷은 Immutable Version·Tenant Isolation. 현행 tenant 격리(`authedTenant`(`:409`)·`index.php:608` X-Tenant-Id 강제덮어쓰기) 승계.
- **Runtime Guard**(SPEC §28): Unknown Runtime Context·tenant 위조 차단. `index.php:608`의 위조차단을 Guard 신호로 승격.
- **Static Lint**(SPEC §29): `isAdmin`(`:132`)·`=== 'owner'`류 하드코딩 Subject 판정(233개소·ADR D-6·D-8) 정적 탐지 대상.

## 5. 무후퇴 · Extend (ADR D-1·D-7·D-8)

- **Extend-only(직교→통합)**: `roleOf`(`:120`)·`userByToken`(`:249`)·`authedTenant`(`:409`)·`resolveAdminByToken`(`:2998`)·`roleRank`(`index.php:573`)를 파괴하지 않고 통합 Subject resolver의 구현체로 승격.
- **실재 과신 회피**(D-7): 세 rank는 통합되지 않은 직교 병렬(① §4)이다. api_key/세션 경로는 상호배타. "이미 통합 resolver가 있다"로 오판 금지.
- **부재 과장 회피**(D-7): break-glass 명명 함수·3-rank 통합 resolver grep 0은 실측 부재.
- **부수 발견 존중**(D-8): api_key roleRank 중복 정의(`index.php:573`↔`AdminMenu.php:74`)는 아키텍처 부채(즉시 수정 아님·ERRE 통합 시 SSOT화). `roleOf`(fail-closed)↔`normTeamRole`(fail-open) 상반 시맨틱도 통합 시 조정 대상.
- **병행 유지**: 현행 Subject 해석 게이트는 유지·병행. tenant 위조차단·임퍼소네이트 제한·유휴 로그아웃 시맨틱 절대 보존.

## 6. 완료 게이트

1. 3-rank(plan·api_key·team_role)를 단일 canonical Subject로 통합 해석.
2. Identity Validation(세션·토큰·위조·유휴·임퍼소네이트) 통과 시에만 후속 진행, 실패→fail-closed.
3. api_key roleRank SSOT화(`index.php:573`↔`AdminMenu.php:74` 정합·ADR D-8).
4. `roleOf`(fail-closed)↔`normTeamRole`(fail-open) 상반 시맨틱 통합 정책 확정.
5. Subject Snapshot·Version 불변 영속(SPEC §18·§33).
6. Regression: 현행 tenant 격리·위조차단·유휴 로그아웃 100% 무후퇴(SPEC §36).
7. Security: Authorization Bypass·tenant 위조·임퍼소네이트 남용 차단(SPEC §28·§36).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: 3-rank 통합 해석·`roleOf`(fail-closed)↔`normTeamRole`(fail-open) 조정 정책·admin god flag(`isAdmin:132`).
- **Integration**: `userByToken`(`:249`)→`authedTenant`(`:409`)→`resolveAdminByToken`(`:2998`) 파이프, agency `agt_`(`index.php:99`)·api_key(`:423`) fallback, 임퍼소네이트 제한(`X-Act-As-Tenant:platform_growth`).
- **SSOT 회귀**: `index.php:573`↔`AdminMenu.php:74` roleRank 정합(ADR D-8).
- **Security**: tenant 위조(`index.php:608`)·유휴 로그아웃·임퍼소네이트 남용 차단(SPEC §36).
- **Regression**: 현행 tenant 격리·위조차단·유휴 자동로그아웃 100% 무후퇴.

> 선행 의존: Part 1~3-6 인증 후 별도 승인 세션. 코드 0.

## 7. 반날조 인용 출처

- `TeamPermissions.php:120·:132·:134·:136`·`UserAuth.php:49·:119·:249·:316·:409·:1119·:2998`·`index.php:99·:423·:573·:608`·`PlanPolicy.php:19`·`AdminMenu.php:74` — Ground-Truth ① §2·§4
- SPEC §4(1~2단계)·§6·§17·§18·§22·§28·§33·§36
- ADR D-1(Extend)·D-2(deterministic)·D-7(정직 분리·P1~P5 재활용)·D-8(부수발견 roleRank 중복)
- KEEP_SEPARATE: `EnterpriseAuth.php`(SCIM/SSO provisioning·`:314` SAML 오탐) — Ground-Truth ① §5·② §2

**요약**: Subject Resolution = PARTIAL-substrate(`roleOf`/`userByToken`/`resolveAdminByToken`/`authedTenant`/`roleRank`/`PlanPolicy::RANK` 차원별 풍부 실재) / ABSENT-governance(3-rank 통합 resolver 부재·직교 병렬·상호배타). Extend-only·직교→단일 canonical Subject·fail-closed identity 검증. 부수발견=roleRank 중복(ADR D-8)·roleOf↔normTeamRole 상반. 코드 0·NOT_CERTIFIED·선행의존.
