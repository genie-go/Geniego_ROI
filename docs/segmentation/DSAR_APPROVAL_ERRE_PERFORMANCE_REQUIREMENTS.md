# DSAR — ERRE Performance Requirements (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine Performance Requirements)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §35
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **불변**: 결정적(deterministic) 100% · 무후퇴(Extend-only) · 반날조(`파일:라인`은 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §35(성능 요구사항)는 ERRE resolution이 만족해야 하는 **7개 성능 목표**를 정의한다.

원문 7종(§35):

1. P95 Resolution Time ≤ 20ms
2. P99 Resolution Time ≤ 50ms
3. Cache Hit ≥ 95%
4. Deterministic Result 100%
5. Horizontal Scale 지원
6. Lock-Free Read Path 지원
7. Incremental Recalculation 지원

본 문서는 이 7개 목표 각각을 현행 substrate와 대조한다. ★판정 핵심(Ground-Truth ② §2 #4): **현행은 캐시가 전무하여 매 요청 DB를 재조회**(`TeamPermissions.php:202`·`:215`)한다. `effectiveForUser()`(`TeamPermissions.php:393`)는 반환만 하고 저장하지 않으므로 Cache Hit(≥95%)·Lock-Free Read Path·Incremental Recalculation 요구를 **구조적으로 미충족**한다. Deterministic(#4)만 부분 근접(canonical ordering `normActions` `:182` 실재)이다. 즉 성능 요구 달성은 **스냅샷+캐시 아키텍처 신설이 필수**(ADR §4 비용)이며 현행으로는 불가능하다.

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 substrate (현행 성능 특성)

- **매 요청 재계산·재조회**(② §2 #4): 권한계산 결과 캐시·무효화 grep 0. `subjectPerms()`(`TeamPermissions.php:202`)·`subjectScope()`(`:215`)가 요청마다 DB `SELECT`. `effectiveForUser()`(`TeamPermissions.php:393`)는 라이브 재계산·반환만(저장 안 함).
- **결정적 근접**: `normActions()`(`TeamPermissions.php:182`)가 ACTIONS 정의순 재정렬(결정적·view 선두·dedupe). `clampActions()`(`:423`) 교집합도 결정적. **단 cross-차원(plan/role/scope) canonical evaluation ordering 부재**(Ground-Truth ① §3) → 전역 100% deterministic 미보장.
- **탈중앙 stateless 근접**: 미들웨어 게이트(`index.php:587`)·핸들러 게이트는 요청별 독립 계산(공유 상태 없음) — horizontal scale에 유리하나 캐시 없어 매번 DB 부하.

### 2.2 ABSENT 거버넌스 (SPEC §35 전용 성능 계층)

- **Cache 계층 ABSENT**(② §2 #4): Effective Role/Permission/Scope/Constraint/Policy Cache(SPEC §21) grep 0 → Cache Hit(#3) 0%(캐시 자체 부재).
- **Snapshot 부재로 Lock-Free 불가**(② §2 #3, #6): 불변 스냅샷 영속 grep 0 → Lock-Free Read Path(#6)가 참조할 스냅샷 부재. 매 요청 DB 조회는 lock-free read가 아님.
- **Incremental 부재**(② §2 #5): Drift/Incremental Evaluation(SPEC §15 Optimizer) grep 0 → Incremental Recalculation(#7) 미지원. 매번 full 재계산.
- **Executor/성능 계약 부재**(② §2 #1): P95/P99 SLA 측정·타임아웃 경계 자체 없음.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

- `Connectors.php:819`("요청당 1회 채널캐시")는 채널 데이터 캐시지 **권한 resolution 캐시가 아니다**(Ground-Truth ② §4). Cache Hit(#3) substrate로 인용 금지.
- `ModelMonitor`(model drift)·`Risk.php:81`(ML probability)의 성능 특성은 role resolution 성능과 무관.

## 3. Canonical 설계 (7 Performance Target)

| # | 목표 | 현행 vs 요구 | 판정 | 근거(`파일:라인`) |
|---|---|---|---|---|
| 1 | P95 ≤ 20ms | 매 요청 DB 재조회(캐시 0) → 목표 미충족 | **ABSENT(미충족)** | `subjectPerms`(`TeamPermissions.php:202`)·`subjectScope`(`:215`) 요청마다 SELECT |
| 2 | P99 ≤ 50ms | 동상. tail latency DB I/O 종속 | **ABSENT(미충족)** | 동상(`TeamPermissions.php:202`·`:215`) |
| 3 | Cache Hit ≥ 95% | 캐시 계층 부재 → Hit 0% | **ABSENT** | 권한계산 캐시 grep 0(② §2 #4) |
| 4 | Deterministic 100% | canonical ordering 부분 실재·cross-차원 미보장 | **PARTIAL** | `normActions`(`TeamPermissions.php:182`)·`clampActions`(`:423`) 결정적. cross-차원 ordering ABSENT(① §3) |
| 5 | Horizontal Scale | stateless 요청별 계산(근접)·단 DB 병목 | **PARTIAL** | 미들웨어/핸들러 요청 독립(`index.php:587`). 캐시 없어 DB 스케일 종속 |
| 6 | Lock-Free Read Path | 스냅샷 부재 → 매 요청 DB 조회(lock-free 아님) | **ABSENT** | 불변 스냅샷 grep 0(② §2 #3·#6) |
| 7 | Incremental Recalc | full 재계산·증분 없음 | **ABSENT** | Optimizer/Incremental grep 0(② §2 #1·#5) |

**설계 원칙**:

1. **★스냅샷+캐시 필수(ADR §4 비용)** — P95≤20ms·Cache Hit≥95%·Lock-Free는 현행 매 요청 재조회로는 **구조적으로 불가능**. 불변 스냅샷(SPEC §18)+버전 캐시(SPEC §21)를 신설하고 런타임은 스냅샷 참조(lock-free read path). 정직: "현행이 느려서 튜닝"이 아니라 "캐시 아키텍처 자체가 없어 신설".
2. **Deterministic 전역화(#4)** — `normActions`(`TeamPermissions.php:182`) canonical ordering을 cross-차원(plan/role/scope)까지 확장, 동일 입력(Subject+Context+Version)→동일 출력 100%(ADR D-2).
3. **Incremental(#7)** — Assignment/Role/Policy 변경 시 영향 subject만 재계산(SPEC §15 Optimizer). full 재계산 회피.
4. **성능은 정확성 후행** — 캐시/스냅샷이 fail-closed·deny 우선(ADR D-4) 정확성을 훼손하면 안 됨. Cache Hit을 위해 stale deny를 allow로 서빙 금지(보안>성능).

### 3.1 목표별 정직 판정 서술

- **P95≤20ms(#1) / P99≤50ms(#2) (ABSENT·미충족)**: 현행 resolution은 매 요청 `subjectPerms()`(`TeamPermissions.php:202`)·`subjectScope()`(`:215`) DB SELECT를 수행한다. 응답 시간은 DB I/O·연결 풀·부하에 종속되며, 캐시가 없어 반복 조회의 이득이 0이다. tail latency(P99)는 DB 병목 시 급증한다. 이는 "느린 구현을 튜닝"할 문제가 아니라 "캐시 계층이 없어 SLA를 보증할 구조가 없는" 문제다.
- **Cache Hit≥95%(#3) (ABSENT)**: 권한계산 캐시가 grep 0(② §2 #4)이므로 Cache Hit은 정의상 0%다. 근접물 `Connectors.php:819`("요청당 1회 채널캐시")는 채널 데이터 캐시로 KEEP_SEPARATE. 이 목표는 Cache Engine(§21) 신설 없이는 측정조차 불가능하다.
- **Deterministic 100%(#4) (PARTIAL)**: 부분 실재. `normActions()`(`TeamPermissions.php:182`)가 ACTIONS 정의순으로 결정적 재정렬(view 선두·dedupe)하고 `clampActions()`(`:423`) 교집합도 결정적이다. 그러나 cross-차원(plan rank·api_key roleRank·team scope) 간 canonical evaluation ordering이 부재(① §3)하여, 세 차원이 통합될 때 순서 의존적 결과 가능성이 남는다. 전역 100% deterministic은 ordering 통합이 선행.
- **Horizontal Scale(#5) (PARTIAL)**: 미들웨어 게이트(`index.php:587`)·핸들러 계산은 요청별 독립(공유 상태 없음)이라 수평 확장에 유리한 stateless 특성을 이미 가진다. 그러나 캐시가 없어 모든 노드가 DB로 직행하므로, 노드를 늘려도 DB가 병목이 된다 — 진정한 수평 확장은 스냅샷 캐시로 DB 부하를 흡수해야 완성된다.
- **Lock-Free Read Path(#6) / Incremental Recalculation(#7) (ABSENT)**: 둘 다 스냅샷·Optimizer(§15·§18) 부재로 미지원. 현행은 매번 full 재계산(`effectiveForUser` `TeamPermissions.php:393`)이며 락 여부 이전에 참조할 불변 스냅샷이 없다.

## 4. Kernel 매핑 (SPEC §15~§21 ↔ 성능 목표)

- **Resolution Optimizer(§15)** → Incremental Recalc(#7). substrate ABSENT — Duplicate Removal은 `normActions` dedupe(`TeamPermissions.php:182`)가 근접이나 증분 평가 ABSENT.
- **Resolution Executor(§16, stateless/deterministic)** → Deterministic(#4)·Horizontal Scale(#5). substrate 근접=`clampActions`(`TeamPermissions.php:423`)·요청 독립 게이트(`index.php:587`).
- **Cache Engine(§21)** → Cache Hit(#3). substrate ABSENT.
- **Snapshot(§18)** → Lock-Free Read Path(#6)·P95/P99(#1·#2). substrate ABSENT.

## 5. 무후퇴 · Extend

- **effectiveForUser 존치·전방 캐시(ADR D-1)**: `effectiveForUser()`(`TeamPermissions.php:393`)를 **삭제하지 않고** 그 결과를 스냅샷+캐시에 얹는다. 캐시 미스 시 현행 라이브 재계산으로 폴백(정확성 무후퇴).
- **canonical ordering 확장**: `normActions`(`TeamPermissions.php:182`)·`clampActions`(`:423`)의 결정적 로직을 대체하지 않고 cross-차원까지 확장(deterministic 전역화).
- **정확성 우선(ADR D-4)**: 캐시 도입이 deny 우선·fail-closed(`TeamPermissions.php:234` `__deny__`)를 후퇴시키지 않도록 — 캐시 무효화(SPEC §22)가 Assignment/Policy 변경 시 즉시 발동. stale allow 금지.
- **KEEP_SEPARATE 불흡수**: `Connectors.php:819` 채널캐시·`ModelMonitor`·`Risk.php:81` 성능을 ERRE 캐시 성능으로 통합·오표기 금지.

### 5.1 무후퇴 회귀 시나리오

1. **캐시 미스 폴백 정확성**: 캐시 미스 시 `effectiveForUser()`(`TeamPermissions.php:393`) 라이브 재계산으로 폴백하되, 폴백 결과가 캐시 히트 결과와 100% 일치해야 한다(deterministic). 폴백이 다른 결과를 내면 캐시가 정확성을 훼손한 것.
2. **stale allow 금지(ADR D-4)**: grant 축소(`reclampTeamMembers` `TeamPermissions.php:809`)·plan 만료(`resolveActivePlan` `UserAuth.php:119`) 시 캐시가 즉시 무효화되어야 한다. 캐시가 이전 넓은 권한을 계속 서빙하면 권한상승 취약점. 성능(Cache Hit)을 위해 보안을 희생하지 않는다.
3. **`__deny__` 즉시성 보존**: scope deny(`TeamPermissions.php:234`→`:286` `AND 1=0`)는 캐시 계층에서도 즉시 반영. 캐시가 deny를 지연시키면 fail-closed 후퇴.

### 5.2 벤치마크 설계 방향 (SPEC §36 Performance 연계)

성능 목표는 SPEC §36의 Performance 테스트로 검증된다 — 100K Concurrent Resolution·1M Effective Permission Projection·Incremental Cache Refresh. 현행은 이 벤치를 수행할 하네스 자체가 없다(CLAUDE.md: `npm test`·PHPUnit 부재). 벤치는 스냅샷+캐시 아키텍처 완성 후 (a) 캐시 히트율을 실측하고 (b) P95/P99를 부하 하에서 측정하며 (c) grant 변경 후 무효화-재계산 지연을 측정한다. 정직: 이 세 측정 모두 현행 substrate로는 대상이 없어 순신규 구축이 선행이다.

## 6. 완료 게이트

- **BLOCKED_PREREQUISITE**: 7 목표 중 5종(#1·#2·#3·#6·#7)이 스냅샷+캐시 아키텍처(SPEC §18·§21) 신설 이후 달성 가능. 본 단계는 성능 계약만.
- **PARTIAL(부분 근접 2종)**: Deterministic(#4, canonical ordering 부분)·Horizontal Scale(#5, stateless 근접·DB 병목).
- **ABSENT(미충족·순신규 5종)**: P95(#1)·P99(#2)·Cache Hit(#3)·Lock-Free(#6)·Incremental(#7).
- **완료 판정**: 7 목표 전부 Performance Benchmark(SPEC §36 100K Concurrent·1M Permission Projection) 통과 + Deterministic 100% 회귀 + 캐시 무효화 정확성 검증(stale allow 0). NOT_CERTIFIED 유지.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §35 / ADR / Ground-Truth ①② 등장분이다.

- `backend/src/Handlers/TeamPermissions.php` — `:182`(normActions canonical ordering) · `:202`(subjectPerms 매 요청 SELECT) · `:215`(subjectScope 매 요청 SELECT) · `:234`(DENY_SCOPE fail-closed) · `:393`(effectiveForUser 라이브 재계산) · `:423`(clampActions 결정적 교집합)
- `backend/public/index.php` — `:587`(요청 독립 미들웨어 게이트)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: `Connectors.php:819`(채널캐시) · `ModelMonitor` · `Risk.php:81`(ML probability)

---
**요약**: SPEC §35의 7 성능 목표 판정 = ABSENT/미충족 5(P95/P99/CacheHit/LockFree/Incremental)·PARTIAL 2(Deterministic·HorizontalScale). ★현행은 캐시 전무·매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`)라 성능 요구를 구조적으로 미충족. 달성엔 불변 스냅샷+버전 캐시 신설 필수(ADR §4). 정확성(deny 우선)>성능 — stale allow 금지. Extend-only·NOT_CERTIFIED.
