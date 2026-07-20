# DSAR — ERRE Completion Gate (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine Completion Gate)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §37
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **위치**: 본 문서는 **Part 3-7(ERRE)의 최종 완료 게이트 정본**이다. 하위 per-entity DSAR 7편의 완료 조건을 집약한다.
- **불변**: 무후퇴(Extend-only) · fail-closed 우선 · KEEP_SEPARATE · 반날조(`파일:라인`은 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §37(Completion Gate)은 ERRE 실 구현이 "완료(Done)"로 인정되기 위한 **18개 완료 조건**을 정의한다.

원문 18조건(§37): Resolution Engine · Resolution Graph · Effective Role Calculator · Effective Permission Calculator · Effective Scope Calculator · Constraint Calculator · Deny Calculator · Explain Engine · Snapshot · Evidence · Digest · Cache · Drift · Revalidation · Simulation · Runtime Guard · Static Lint · Performance Benchmark 통과 · Regression Test 100% 통과.

본 문서는 이 완료 조건들을 현행 substrate와 대조하여 **각 조건의 시작점(PARTIAL/ABSENT)** 과 **선행 의존(BLOCKED_PREREQUISITE)** 을 집약한다. ★판정 핵심(ADR §2.3): **ERRE = PARTIAL-substrate / ABSENT-governance**. 18조건 중 Calculator 계열 3종(Role/Permission/Scope)만 PARTIAL(팀 한정 substrate 실재)이고 나머지 15종은 ABSENT(순신규). 본 게이트는 코드 0·NOT_CERTIFIED이며, 실 완료는 선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션(RP-track)에서 판정한다.

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 substrate (PARTIAL·완료 시작점 실재)

- **Effective Role/Permission/Scope Calculator 3종**: `effectiveForUser()`(`TeamPermissions.php:393`, 중추)·`effectiveScope()`(`:236`)·`normActions()`(`:182`)·`clampActions()`(`:423`)가 팀 한정 실 계산기. 완료 조건의 PARTIAL 시작점.
- **Deny Calculator 근접**: `DENY_SCOPE='__deny__'`(`TeamPermissions.php:234`)·member 쓰기 전역 deny(`UserAuth.php:1167`+`index.php:82`). 통합 "deny beats allow" 부재.
- **Constraint Calculator 근접**: amount(`Catalog.php:1036`)·MFA(`UserAuth.php:941`)·api_key expires(`Keys.php:99`)·data_scope(`TeamPermissions.php:272`) 분산.
- **Runtime Guard 근접**: `writeGuard.js:61`·`guardTeamWrite`(`UserAuth.php:1167`)·`Wms.php:557`. Static Lint ABSENT.

### 2.2 ABSENT 거버넌스 (SPEC §37 완료 조건)

- **8 ABSENT 계층**(② §2, ADR §2.2): Resolution Engine/Pipeline·Resolution Graph(DAG)·Snapshot/Digest·Cache·Drift/Revalidation/Reconciliation·Simulation/Explain·Effective Risk·Conflict/SoD. 완료 조건 중 이들 계층은 순신규.
- **Static Lint ABSENT**(② §2 #10): 하드코딩 authz 233개소(BE 106/FE 127) 정적탐지 도구·룰 0.
- **Performance Benchmark 미충족**(② §2 #4): 캐시 부재로 매 요청 재조회 → P95≤20ms·Cache Hit≥95% 구조적 미충족(별도 DSAR PERFORMANCE 판정).
- **Regression 스위트 부재**(CLAUDE.md): `npm test`·PHPUnit 없음 → Regression 100% 통과 판정 하네스 자체 순신규(별도 DSAR TEST 판정).

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

Ground-Truth ② §4 전체: `RuleEngine`·`Decisioning`·`AnomalyDetection`·`Alerting.php:665`·`Risk.php:12`·`ModelMonitor`·`SecurityAudit.php:25-31`(해시체인)·`PM/Dependencies.php:77-90`(task DFS)·`GraphScore.php:13-25`·`AdminMenu.php:504`(menu_tree wouldCycle)·`ChannelRegistry`·`PriceOpt`/`AdminGrowth.php:1239`/`CustomerAI`(비-권한 simulate). 완료 조건 충족으로 오계산 금지 — 이들이 있다고 Graph/Snapshot/Simulation/Risk 완료로 표기하면 가짜녹색.

## 3. Canonical 설계 (18 Completion Condition 집약)

| # | 완료 조건(SPEC §37) | 시작점 판정 | 하위 DSAR | 근거(`파일:라인`) |
|---|---|---|---|---|
| 1 | Resolution Engine 구축 | ABSENT | (Pipeline) | Pipeline grep 0(② §2 #1) |
| 2 | Resolution Graph 구축 | ABSENT | (Graph) | role↔role DAG grep 0(② §2 #2) |
| 3 | Effective Role Calculator | **PARTIAL** | API_SURFACE | `effectiveForUser`(`TeamPermissions.php:393`) 팀 한정 |
| 4 | Effective Permission Calculator | **PARTIAL** | API_SURFACE | `subjectPerms`(`TeamPermissions.php:202`)·`normActions`(`:182`) |
| 5 | Effective Scope Calculator | **PARTIAL** | API_SURFACE | `effectiveScope`(`TeamPermissions.php:236`)·`scopeValuesFor`(`:272`) |
| 6 | Constraint Calculator | **PARTIAL(분산)** | ERROR/API | amount(`Catalog.php:1036`)·MFA(`UserAuth.php:941`)·expires(`Keys.php:99`) |
| 7 | Deny Calculator | **PARTIAL(국소)** | ERROR | `__deny__`(`TeamPermissions.php:234`)·`guardTeamWrite`(`UserAuth.php:1167`) |
| 8 | Explain Engine | ABSENT | API_SURFACE | XAI grep 0(② §2 #6) |
| 9 | Snapshot | ABSENT | DATABASE/INDEX | 불변 스냅샷 grep 0(② §2 #3) |
| 10 | Evidence | ABSENT | ERROR/WARNING | Evidence 영속 grep 0(② §2 #3) |
| 11 | Digest | ABSENT | DATABASE | 권한 digest grep 0. SecurityAudit는 KEEP_SEPARATE |
| 12 | Cache | ABSENT | PERFORMANCE/INDEX | 권한계산 캐시 grep 0(② §2 #4) |
| 13 | Drift | ABSENT | WARNING | drift grep 0(② §2 #5) |
| 14 | Revalidation | ABSENT | WARNING | 재검증 grep 0(② §2 #5) |
| 15 | Simulation | ABSENT | API_SURFACE | 권한 what-if grep 0(② §2 #6) |
| 16 | Runtime Guard | **PARTIAL(Guard만)** | API/ERROR | `writeGuard.js:61`·`Wms.php:557`. Static Lint ABSENT |
| 17 | Static Lint | ABSENT | (233개소 수렴) | 하드코딩 authz 233개소(② §3)·도구 0 |
| 18 | Perf Benchmark + Regression 100% | ABSENT | PERFORMANCE/TEST | 캐시/테스트 스위트 부재(② §2 #4·CLAUDE.md) |

**게이트 원칙**:

1. **PARTIAL 3종은 확장 완료(대체 아님)** — Role/Permission/Scope Calculator(#3·#4·#5)는 `effectiveForUser`(`TeamPermissions.php:393`)를 plan/api_key 차원까지 확장해야 완료(팀 한정→통합 PDP, ADR D-1).
2. **ABSENT 15종은 순신규 완료** — Graph/Snapshot/Cache/Drift/Simulation/Explain/Risk/Lint는 그린필드 구축 후에만 완료.
3. **fail-closed 무후퇴(ADR D-4)** — Deny Calculator(#7)·Runtime Guard(#16) 완료가 현행 `__deny__`·`guardTeamWrite` 안전측을 후퇴시키면 완료 불인정.
4. **가짜녹색 금지** — KEEP_SEPARATE 근접물을 완료로 오계산 금지. Static Lint(#17)로 233개소 수렴 진행률이 완료 지표.

### 3.1 완료 판정의 정직성 원칙 (실재 과신·부재 과장 양방향 회피, ADR D-7)

- **실재 과신 회피**: PARTIAL 5종(#3~#7·#16)이 "이미 있으니 거의 완료"로 오판되지 않도록 한다. `effectiveForUser()`(`TeamPermissions.php:393`)는 팀 한정 부분 PDP지 통합 kernel이 아니고, `guardTeamWrite`(`UserAuth.php:1167`)는 member 읽기전용 강제지 scope-escalation 전반 가드가 아니다(ADR D-7). 이들을 완료의 80%로 세면 통합·Graph·Snapshot이라는 본질적 신규 작업을 과소평가하게 된다.
- **부재 과장 회피**: ABSENT 13종이 "숨겨진 구현이 어딘가 있을 것"으로 흐려지지 않도록 한다. Snapshot/Cache/Graph/SoD의 grep 0은 실측 부재다(② §2). 다만 RBAC substrate 테이블은 런타임 생성(`TeamPermissions.php:139`)으로 실재하므로 "테이블도 없다"는 과장은 금지 — 마이그레이션 밖에 있을 뿐 substrate는 있다.
- **보안수정 재활용**: 289차 P1~P5 보안수정(writeGuard 서버강제·admin SSOT `resolveAdminByToken`·plan fail-secure)은 ERRE Subject Resolution·Deny Projection의 실 substrate로 재활용되며, 이를 "미완료"로 재플래그하지 않는다(ADR D-7).

### 3.2 조건별 완료 시작점 서술

- **Calculator 3종(#3·#4·#5, PARTIAL)**: 완료의 실질은 "팀 차원 계산기를 3-rank 통합 PDP로 승격"이다. 현행 세 rank(plan `PlanPolicy.php:19`·api_key `index.php:573`·team_role)는 직교 병렬(① §4)이라, 한 요청에서 세 차원이 동시 해석되지 않는다. 통합은 substrate 재사용이되 통합 로직 자체는 신규다.
- **Deny/Constraint/Guard(#6·#7·#16, PARTIAL)**: 국소·분산 substrate(`__deny__` `TeamPermissions.php:234`·amount `Catalog.php:1036`·`writeGuard.js:61`)를 전역 통합 계산기로 승격. 완료는 "흩어진 것을 하나로 모으되 각 국소 강제를 후퇴 없이 보존"이다.
- **ABSENT 13종**: Engine/Graph/Explain/Snapshot/Evidence/Digest/Cache/Drift/Revalidation/Simulation/StaticLint/Perf/Regression은 완료 시작점이 0이다 — grep 0(② §2). 이들은 선행 foundation 인증 후 그린필드 구축이 완료의 전제다.

## 4. Kernel 매핑 (SPEC §37 ↔ 하위 DSAR 7편)

- **Error Contract(§30)** → Deny(#7)·Constraint(#6)·Runtime Guard(#16) 실패 계약. DSAR_ERROR_CONTRACT.
- **Warning Contract(§31)** → Drift(#13)·Revalidation(#14)·Evidence(#10). DSAR_WARNING_CONTRACT.
- **API(§32)** → Calculator 3종(#3·#4·#5)·Explain(#8)·Simulation(#15) 노출. DSAR_API_SURFACE.
- **DB Constraint(§33)** → Snapshot(#9)·Digest(#11)·Tenant Isolation. DSAR_DATABASE_CONSTRAINT.
- **Index(§34)** → Snapshot(#9)·Cache(#12) 조회 성능. DSAR_INDEX_STRATEGY.
- **성능(§35)** → Cache(#12)·Perf Benchmark(#18). DSAR_PERFORMANCE_REQUIREMENTS.
- **테스트(§36)** → Regression 100%(#18). DSAR_TEST_CONTRACT.
- **본 게이트(§37)** → 18조건 집약 정본.

## 5. 무후퇴 · Extend

- **Calculator 3종 확장 완료(ADR D-1)**: `effectiveForUser`(`TeamPermissions.php:393`)·`effectiveScope`(`:236`)를 삭제 없이 plan/api_key 차원 통합으로 확장해야 #3·#4·#5 완료.
- **국소 fail-closed 승격(ADR D-4)**: `__deny__`(`TeamPermissions.php:234`)·member 강등(`:120`)·`guardTeamWrite`(`UserAuth.php:1167`)를 전역 Deny/Guard로 승격하되 안전측 무후퇴.
- **233개소 점진 수렴(ADR D-6)**: Static Lint(#17)로 하드코딩 authz(② §3)를 점진 수렴 — 일괄 파괴 아닌 무후퇴 점진.
- **부수 아키텍처 부채(ADR D-8)**: api_key roleRank 중복(`index.php:573`↔`AdminMenu.php:74`)·RBAC 런타임 CREATE(`TeamPermissions.php:139`)는 완료 게이트 통과 시 SSOT·마이그레이션 정합 대상(즉시 수정 아님·라이브 실결함 아님).
- **KEEP_SEPARATE 불흡수**: §2.3 근접물을 완료 조건 충족으로 오계산 금지(가짜녹색 회피).

## 6. 완료 게이트 (본 Part의 최종 게이트 정본)

**Part 3-7(ERRE) 완료 = 아래 전부 충족 시에만 CERTIFIED 승격:**

1. **선행 인증**: Part 1~3-6(Auth Registry·Permission Engine·Role Registry·Hierarchy/Composite·Assignment·Scoped·Dynamic·Service) 전부 실 구현·인증(BLOCKED_PREREQUISITE 해제).
2. **18조건 구축**: SPEC §37 18조건 전부 실 코드(Engine/Graph/Calculator×3/Constraint/Deny/Explain/Snapshot/Evidence/Digest/Cache/Drift/Revalidation/Simulation/Guard/Lint).
3. **성능(§35)**: P95≤20ms·P99≤50ms·Cache Hit≥95%·Deterministic 100%·Lock-Free·Incremental — 스냅샷+캐시 아키텍처로 충족.
4. **테스트(§36)**: Unit/Integration/Performance/Security/Regression 100% 통과 + fail-closed 회귀 0.
5. **무후퇴 검증**: 기존 게이트(미들웨어 RBAC·`guardTeamWrite`·`requirePlan`·`effectiveScope`) 병행·후퇴 0. 233개소 Static Lint 수렴 진행.
6. **배포 승인**: 운영/데모 동등 배포 + 사전 승인(MEMORY 배포 승인 규칙).

- **현재 상태**: 코드 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE**. 본 설계는 명세·거버넌스 계약만. 실 완료는 별도 승인 세션(RP-track).
- **다음 추천(SPEC §38)**: Part 3-8 Role Certification & Access Review Governance.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §37 / ADR / Ground-Truth ①② 등장분이다. 테스트/lint 부재는 CLAUDE.md 명시.

- `backend/src/Handlers/TeamPermissions.php` — `:120`(roleOf) · `:139`(ensureSchema) · `:182`(normActions) · `:202`(subjectPerms) · `:234`(DENY_SCOPE) · `:236`(effectiveScope) · `:272`(scopeValuesFor) · `:393`(effectiveForUser) · `:423`(clampActions)
- `backend/src/Handlers/UserAuth.php` — `:941`(MFA) · `:1167`(guardTeamWrite)
- `backend/public/index.php` — `:82`(guardTeamWrite 호출) · `:573`(roleRank)
- `backend/src/Handlers/Catalog.php` — `:1036`(HIGH_VALUE_KRW)
- `backend/src/Handlers/Keys.php` — `:99`(scope expires)
- `backend/src/Handlers/AdminMenu.php` — `:74`(roleRank 중복) · `:504`(menu_tree wouldCycle · KEEP_SEPARATE)
- `frontend/src/services/writeGuard.js` — `:61`(guardWrite)
- `backend/src/Handlers/Wms.php` — `:557`(guardWarehouse)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: `RuleEngine.php` · `Decisioning.php` · `AnomalyDetection.php` · `Alerting.php:665` · `Risk.php:12` · `ModelMonitor.php` · `SecurityAudit.php:25-31` · `PM/Dependencies.php:77-90` · `GraphScore.php:13-25` · `ChannelRegistry.php` · `PriceOpt.php` · `AdminGrowth.php:1239` · `CustomerAI.php`

---
**요약**: SPEC §37의 18 완료 조건 판정 = PARTIAL 5(Role/Permission/Scope Calculator·Constraint·Deny·Runtime Guard 근접)·ABSENT 13(Engine/Graph/Explain/Snapshot/Evidence/Digest/Cache/Drift/Revalidation/Simulation/StaticLint/Perf/Regression). 본 문서가 Part 3-7 최종 게이트 정본. 완료 = 선행 Part 1~3-6 인증 + 18조건 구축 + 성능/테스트 통과 + 무후퇴 + 배포 승인. 현재 코드 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE. 다음=Part 3-8 Role Certification.
