# DSAR — ERRE API Surface (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine API Surface)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §32
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **불변**: `/api` 접두 실배선 필수 · 무후퇴(Extend-only) · KEEP_SEPARATE · 반날조(`파일:라인`은 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §32(API)는 ERRE가 외부에 노출해야 하는 **최소 8개 엔드포인트**를 정의한다.

원문 8종(§32):

1. Resolve Effective Roles
2. Resolve Effective Permissions
3. Resolve Effective Scope
4. Resolve Constraints
5. Explain Authorization
6. Run Simulation
7. Compare Snapshots
8. Validate Resolution

본 문서는 이 8개 API 각각을 현행 라우트·핸들러 substrate와 대조한다. 판정 핵심: 현행 저장소에서 effective 결과를 반환하는 **유일한 실물 엔드포인트는 `GET /auth/team/effective-permissions`**(`TeamPermissions.php:694`, `effectiveForUser` 라이브 반환)뿐이며 **팀 도메인 한정**이다. plan/api_key 차원을 통합하는 Resolve/Explain/Simulate/Compare/Validate API는 전부 ABSENT(순신규 그린필드). 라우트 등록은 `routes.php`를 경유하며(핸들러 미배선≠실백엔드) 신규 실배선 시 `/api` 접두가 필수다.

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 근접 substrate (PARTIAL)

- **effective-permissions GET**(`TeamPermissions.php:694`): `GET /auth/team/effective-permissions` — `effectiveForUser()`(`TeamPermissions.php:393`) 라이브 반환. `$result + ['role'=>...]` merge 유사가 유일한 결합. **Resolve Effective Roles/Permissions/Scope(#1·#2·#3)의 팀 한정 근접**. 단일 API가 role+permission+scope를 한 응답에 반환(부분 통합).
- **미들웨어 게이트 응답**(`index.php:583`·`:587`): api_key rank/scope 게이트 — resolve API가 아닌 접근 차단 미들웨어.
- **plan 게이트 진입점**(`UserAuth.php:364` requirePlan·`:77` requireFeaturePlan): 각 핸들러 내부 호출 — 독립 API가 아닌 인라인 가드.
- **라우트 매핑**(`routes.php`): `'METHOD /path' => 'Class::method'` 문자열 등록. ERRE 신규 엔드포인트는 여기 등록해야 실배선(핸들러 존재만으로 라우팅 안 됨).

### 2.2 ABSENT 거버넌스 (SPEC §32 전용 API)

- **Explain API 부재**(② §2 #6, ABSENT): "왜 이 role이 활성인가"(SPEC §17) 반환 엔드포인트 grep 0 → `Explain Authorization`(#5) ABSENT.
- **Simulation API 부재**(② §2 #6, ABSENT): 권한 what-if(SPEC §26 Add/Remove Role·Permission Diff) 엔드포인트 grep 0 → `Run Simulation`(#6) ABSENT.
- **Snapshot 부재**(② §2 #3, ABSENT): 불변 스냅샷 자체 없음 → `Compare Snapshots`(#7) 비교 대상 부재.
- **Validate 부재**(② §2 #1, ABSENT): Resolution 무결성 검증(SPEC §28 Runtime Guard) 엔드포인트 grep 0 → `Validate Resolution`(#8) ABSENT.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

- `PriceOpt::simulate`·`AdminGrowth.php:1239`(campaign simulate)·`CustomerAI`(mode:simulated)는 이름이 "simulate"이나 **권한 시뮬레이션이 아니다**(Ground-Truth ② §4). `Run Simulation`(#6) API로 흡수·개명 금지.
- `ChannelRegistry.php`는 채널 레지스트리지 resolution API가 아니다.

## 3. Canonical 설계 (8 Endpoint)

| # | API | 설계 경로(방향) | 판정 | 근거(`파일:라인`) |
|---|---|---|---|---|
| 1 | Resolve Effective Roles | `GET /api/erre/resolve/roles` | **PARTIAL(팀 한정)** | 근접=`effective-permissions` GET(`TeamPermissions.php:694`)가 role 반환하나 팀 차원만. plan/api_key 통합 ABSENT |
| 2 | Resolve Effective Permissions | `GET /api/erre/resolve/permissions` | **PARTIAL(팀 한정)** | substrate=`effectiveForUser()`(`TeamPermissions.php:393`)·`subjectPerms()`(`:202`). 통합 PDP ABSENT |
| 3 | Resolve Effective Scope | `GET /api/erre/resolve/scope` | **PARTIAL(팀 한정)** | substrate=`effectiveScope()`(`TeamPermissions.php:236`)·`scopeValuesFor()`(`:272`). 팀 data_scope만 |
| 4 | Resolve Constraints | `GET /api/erre/resolve/constraints` | **PARTIAL(분산)** | 근접 substrate 산재=amount(`Catalog.php:1036`)·MFA(`UserAuth.php:941`)·api_key expires(`Keys.php:99`)·data_scope(`TeamPermissions.php:272`). 통합 constraint API ABSENT |
| 5 | Explain Authorization | `GET /api/erre/explain` | **ABSENT** | Explain Engine grep 0(② §2 #6). "왜 활성인가" 반환 엔드포인트 없음 |
| 6 | Run Simulation | `POST /api/erre/simulate` | **ABSENT** | 권한 what-if grep 0(② §2 #6). KEEP_SEPARATE simulate와 무관 |
| 7 | Compare Snapshots | `GET /api/erre/snapshots/compare` | **ABSENT** | Snapshot 자체 grep 0(② §2 #3). 비교 대상 부재 |
| 8 | Validate Resolution | `POST /api/erre/validate` | **ABSENT** | Runtime Guard 검증 API grep 0(② §2 #1). Guard substrate(`writeGuard.js:61`)는 FE 쓰기 게이트지 resolution 검증 API 아님 |

**설계 원칙**:

1. **`/api` 접두 실배선 필수** — ERRE 8 엔드포인트는 전부 `routes.php`에 `'GET /erre/...' => 'Class::method'`로 등록해야 실동작(nginx SPA HTML 폴백이 미배선 라우트를 200으로 착시시킴). 핸들러 클래스 존재만으로 라우팅 안 됨.
2. **effective-permissions GET 확장(대체 아님)** — `TeamPermissions.php:694`를 삭제하지 않고 Resolve API(#1·#2·#3)의 팀 차원 구현체로 승격, plan/api_key 차원 통합.
3. **Resolve 계열 인증**: viewer+ 읽기 허용(자기 자신 effective 조회), 타 subject 조회는 manager+·admin. 미들웨어 rank 게이트(`index.php:587`) 병행.
4. **Explain/Simulate/Compare/Validate(#5~#8)는 순신규** — Snapshot/Cache/Graph 선행 의존. 본 단계 설계만.

### 3.1 API별 정직 판정 서술

- **Resolve Effective Roles/Permissions/Scope(#1·#2·#3, PARTIAL)**: 유일 실물 엔드포인트 `GET /auth/team/effective-permissions`(`TeamPermissions.php:694`)가 `effectiveForUser()`(`:393`)를 라이브 반환하며, 한 응답에 role·permission·scope를 함께 담는다(`$result + ['role'=>...]` merge). 그러나 이는 **팀 도메인 차원만** 반영한다 — plan rank(`PlanPolicy.php:19`)·api_key roleRank(`index.php:573`)를 통합하지 않는다. ERRE Resolve API는 이 팀 한정 응답을 3-rank 통합 effective로 확장하는 것이며, 기존 엔드포인트를 대체하지 않고 상위 통합 계층을 얹는다.
- **Resolve Constraints(#4, PARTIAL 분산)**: 제약은 네 곳에 흩어져 있다 — 금액 임계(`Catalog.php:1036` HIGH_VALUE_KRW)·MFA 게이트(`UserAuth.php:941`)·api_key 만료(`Keys.php:99`)·data_scope 차원(`TeamPermissions.php:272`). 이들을 한 엔드포인트로 조회하는 통합 constraint API는 없다. ERRE는 분산 substrate를 파괴하지 않고 조회 façade로 통합한다.
- **Explain Authorization(#5, ABSENT)**: "왜 이 role이 활성인가"(SPEC §17)를 사람이 읽을 수 있는 형태 + JSON으로 반환하는 엔드포인트가 없다. 현행 어떤 API도 결정 근거(Assignment chain·Rule·Scope·Policy·Deny)를 설명하지 않는다. XAI 요구(데이터 헌법 Volume 4)의 순신규 대상.
- **Run Simulation(#6, ABSENT)**: 권한 what-if(SPEC §26: Add/Remove Role → Permission/Scope/Risk/Conflict Diff)가 없다. `PriceOpt::simulate`·`AdminGrowth.php:1239`·`CustomerAI` simulate는 이름만 같은 비-권한 시뮬레이션으로 KEEP_SEPARATE.
- **Compare Snapshots(#7, ABSENT)** / **Validate Resolution(#8, ABSENT)**: 스냅샷(SPEC §18)·Runtime Guard 검증(§28)이 전제인데 둘 다 부재. `writeGuard.js:61`은 FE 쓰기 게이트지 resolution 검증 API가 아니다.

## 4. Kernel 매핑 (SPEC §7~§28 ↔ API)

- **Effective Role/Permission/Scope Calculator(§7·§8·§9)** → Resolve API(#1·#2·#3). substrate=`effectiveForUser()`(`TeamPermissions.php:393`)·`effectiveScope()`(`:236`)·`normActions()`(`:182` canonical ordering).
- **Effective Constraint Calculator(§10)** → Resolve Constraints(#4). 분산 substrate=`Catalog.php:1036`(amount)·`UserAuth.php:941`(MFA)·`Keys.php:99`(expires)·`TeamPermissions.php:272`(data_scope).
- **Explain Engine(§17)** → Explain Authorization(#5). ABSENT.
- **Simulation(§26)** → Run Simulation(#6). ABSENT.
- **Snapshot(§18)/Reconciliation(§25)** → Compare Snapshots(#7). ABSENT.
- **Runtime Guard(§28)** → Validate Resolution(#8). 근접 Guard=`writeGuard.js:61`·`guardTeamWrite`(`UserAuth.php:1167`)·`Wms.php:557`(FE/BE 쓰기 게이트, resolution 검증 API 아님).

## 5. 무후퇴 · Extend

- **effective-permissions GET 존치·확장(ADR D-1)**: `TeamPermissions.php:694`·`effectiveForUser()`(`:393`)를 **삭제·개명하지 않고** Resolve API의 실 구현체로 승격. 팀 한정 로직을 plan/api_key 차원까지 확장.
- **미들웨어 게이트 병행**: `index.php:583`·`:587` rank 게이트는 ERRE Resolve API 위에서도 유지 — API 접근 자체를 게이트, resolution은 그 뒤 계층.
- **`/api` 접두 회귀 방지**: 신규 8 엔드포인트가 `routes.php` 미등록이면 nginx SPA 폴백으로 200 HTML 반환되어 "동작 착시" — 실배선 검증(POST/GET 실응답 JSON) 필수(무음 사망 회피).
- **KEEP_SEPARATE 불흡수**: `PriceOpt::simulate`·`AdminGrowth.php:1239`·`CustomerAI` simulate를 ERRE Simulation API로 통합·개명 금지.

### 5.1 무후퇴 회귀 시나리오

1. **effective-permissions GET 계약 보존**: `GET /auth/team/effective-permissions`(`TeamPermissions.php:694`) 응답 형태(role+permission+scope)를 소비하는 프론트(`AuthContext.jsx`·`useVisibleTabs.js`)가 존재하므로, ERRE Resolve API로 확장하되 기존 응답 스키마 하위호환을 깨지 않는다.
2. **`/api` 무음 사망 회피**: 신규 8 엔드포인트가 `routes.php` 미등록 시 nginx SPA 폴백이 HTML 200을 반환해 "성공 착시"를 유발한다(MEMORY /api 접두 트랩). 배포 검증은 반드시 실 JSON 응답을 확인(HTML 아님).
3. **미들웨어 게이트 병행**: Resolve API 접근 자체는 `index.php:587` rank 게이트가 먼저 통과시켜야 하며, resolution 결과는 그 뒤 계층. API 노출이 게이트를 우회하지 않는다.

### 5.2 인증·인가 매트릭스 (설계 방향)

- **Resolve(#1~#4)**: 자기 자신 effective 조회는 viewer+ 허용. 타 subject 조회는 manager+(`isManagerAdmin` `TeamPermissions.php:136`) 또는 admin. 조회 결과는 요청자 tenant로 격리(`WHERE tenant_id=?` `:202`).
- **Explain(#5)**: 조회 대상과 동일 인가 + 근거 노출이 PII를 포함하지 않도록 aggregate만(데이터 헌법 no-PII).
- **Simulation(#6)**: 쓰기 유사(what-if)이므로 analyst+ 또는 `write:*`(`index.php:587`). 실제 부여를 변경하지 않는 read-only 시뮬레이션임을 보장.
- **Compare/Validate(#7·#8)**: admin·감사자 전용. 스냅샷 무결성 검증은 특권 작업.

## 6. 완료 게이트

- **BLOCKED_PREREQUISITE**: 8종 전부 선행 foundation(Part 1~3-6) + Snapshot/Cache/Explain/Simulation 실 구현 이후 실배선. 본 단계는 경로·계약만.
- **PARTIAL(팀/분산 근접 4종)**: Resolve Roles(#1)·Permissions(#2)·Scope(#3)·Constraints(#4).
- **ABSENT(순신규 4종)**: Explain(#5)·Simulation(#6)·Compare Snapshots(#7)·Validate(#8).
- **완료 판정**: 8 엔드포인트 전부 `routes.php` 실배선(`/api` 접두) + 실응답 JSON 검증 + 인증/rank 게이트 + 회귀 테스트 통과. NOT_CERTIFIED 유지.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §32 / ADR / Ground-Truth ①② 등장분이다.

- `backend/src/Handlers/TeamPermissions.php` — `:182`(normActions) · `:202`(subjectPerms) · `:236`(effectiveScope) · `:272`(scopeValuesFor) · `:393`(effectiveForUser) · `:694`(effective-permissions GET)
- `backend/public/index.php` — `:583` · `:587`
- `backend/src/Handlers/UserAuth.php` — `:77`(requireFeaturePlan) · `:364`(requirePlan) · `:941`(MFA) · `:1167`(guardTeamWrite)
- `backend/src/Handlers/Catalog.php` — `:1036`(HIGH_VALUE_KRW)
- `backend/src/Handlers/Keys.php` — `:99`(scope expires 교차검증)
- `backend/src/Handlers/Wms.php` — `:557`(guardWarehouse)
- `backend/src/routes.php` — 라우트 매핑 정본
- `frontend/src/services/writeGuard.js` — `:61`(guardWrite)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: `PriceOpt::simulate` · `AdminGrowth.php:1239` · `CustomerAI` · `ChannelRegistry.php`

---
**요약**: SPEC §32의 8 API 판정 = PARTIAL 4(Resolve Roles/Permissions/Scope/Constraints, 팀·분산 한정)·ABSENT 4(Explain/Simulate/CompareSnapshots/Validate). 실물 엔드포인트는 `GET /auth/team/effective-permissions`(`TeamPermissions.php:694`) 단 1개(팀 한정). 통합 Resolve/Explain/Simulate/Compare/Validate는 순신규 그린필드. `/api` 접두 실배선 필수·Extend-only·NOT_CERTIFIED.
