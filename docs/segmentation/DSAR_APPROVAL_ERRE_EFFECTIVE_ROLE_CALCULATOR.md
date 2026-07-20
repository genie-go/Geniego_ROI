# DSAR — Effective Role Calculator (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §7)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §7 (구현 목표 #9)
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md) (D-1 승격)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: PARTIAL-substrate / ABSENT-governance — substrate=`effectiveForUser`(`TeamPermissions.php:393`) 승격
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만) · Extend-only(대체 금지) · Deterministic 100%(ADR D-2)

---

## 1. 목적

SPEC §7 Effective Role Calculator(구현 목표 #9)는 한 주체의 모든 부여 경로(Assigned·Expanded·Composite·Dynamic·Temporary·Emergency·Delegated·Service Role)를 통합해 **중복 제거 후 Canonical Ordering을 적용한 실효 역할 집합**을 산출하는 **계산기(엔진 컴포넌트)**다. 본 편은 그 계산기의 거버넌스 계약을 정의한다(산출 **결과 엔티티**는 별편 `APPROVAL_EFFECTIVE_ROLE` 소관).

이 계산기는 Resolution Pipeline(SPEC §4) 14단계 "Effective Role Generation"의 실행 주체이며, Resolution Executor(SPEC §16)의 특성 — **Thread Safe · Stateless · Deterministic** — 을 만족해야 한다.

**Ground-Truth 요지**(① §1·§4): effective role을 request-time에 산출하는 유일한 실존 계산 함수는 `effectiveForUser`(`TeamPermissions.php:393`)이나, 이는 **팀 도메인 한정 라이브 재계산**이며 plan rank·api_key roleRank를 통합하지 않는 부분 PDP다. 본 계산기는 이 함수를 승격·확장하는 PARTIAL 형태다.

## 2. Ground-Truth 현황

### 2.1 실존 substrate (PARTIAL — 승격 대상 계산 함수)

| substrate | file:line | 계산기 역할 | 판정 |
|---|---|---|---|
| **`effectiveForUser()`** — role 분기(owner/admin→full, manager→팀권한, member→명시권한 clamp)+scope 상속. **핵심 effective 산출** | `TeamPermissions.php:393` | **Effective Role 계산 커널(팀 한정)** | PRESENT(live recompute) |
| `roleOf()` — team_role 정규화(fail-closed) | `TeamPermissions.php:120` | Subject role 판정 | PRESENT |
| `isAdmin`/`isOwnerAdmin`/`isManagerAdmin` | `TeamPermissions.php:132`·`:134`·`:136` | 역할 등급 판정 | PRESENT |
| `assignableMap()` — 위임 상한(owner→null, manager→팀권한맵, member→[]) | `TeamPermissions.php:381` | 부여 경로 상한 | PRESENT |
| `normActions()` — 정의순 재정렬+dedupe(action 차원) | `TeamPermissions.php:182` | **canonical ordering·dedupe(부분)** | PARTIAL |
| `effectivePermissions()` GET `/auth/team/effective-permissions` — `effectiveForUser` 라이브 반환 | `TeamPermissions.php:694` | 계산 진입점(팀 한정) | PRESENT |
| `userByToken()` — 세션→app_user, team_role 기본값(`:316` parent_user_id?member:owner) | `UserAuth.php:249` | Subject Resolution 입력 | PRESENT |

**Executor 특성 실측**: `effectiveForUser`(`:393`)는 매 요청 DB 재조회(`subjectPerms:202`·`subjectScope:215`) 기반 stateless 재계산이나, **결과 영속·버전·캐시가 없어**(Ground-Truth ② #3·#4) SPEC §16의 deterministic-with-snapshot 계약 미달. Pipeline/Planner/Optimizer/Executor 프레임워크 자체가 grep 0으로 ABSENT(Ground-Truth ② #1).

### 2.2 통합 계산 부재 (ABSENT)

- Hierarchy Expansion·Composite Expansion·Dynamic Evaluation(SPEC §4 4·5·6단계) 역할 전개 계산 grep 0(Ground-Truth ② #1·#2).
- `effectiveForUser`는 team_role+isAdmin만 결합, plan rank/api_key roleRank/scopes 미고려 = **부분 PDP**(Ground-Truth ① §4).
- api_key roleRank가 `index.php:573` ↔ `AdminMenu.php:74` **중복 정의** — 계산기 입력 단일소스 아님(ADR D-8 부수 발견).

### 2.3 KEEP_SEPARATE (오흡수 금지)

- `AdminMenu.php:504`~`:551`(`wouldCycle`)·`PM/Dependencies.php:77`~`:90`(task DFS)·`GraphScore.php:13`~`:25`는 role↔role 계산이 아니다 — 계산기 알고리즘에 흡수 금지(ADR D-5).
- `PriceOpt::simulate`·`AdminGrowth.php:1239`는 비-권한 시뮬레이션이며 role 계산 아님(Ground-Truth ② §4).

## 3. Canonical 설계

Effective Role Calculator의 거버넌스 계약(SPEC §7·§16):

| 계약 항목 | 요구 |
|---|---|
| 입력 | Subject + Resolution Context(SPEC §6) + Assignment 집합 |
| 처리 | Assigned/Expanded/Composite/Dynamic/Temporary/Emergency/Delegated/Service 통합 → dedupe → Canonical Ordering |
| 출력 | `APPROVAL_EFFECTIVE_ROLE`(별편) role_set |
| 특성 | Thread Safe · Stateless · Deterministic(동일 입력→동일 출력 100%) |
| 결정성 근거 | Resolution Version 바인딩, 정렬 규칙 고정 |

**승격 알고리즘**(ADR D-1): `effectiveForUser`(`:393`) 내부 인라인 role 분기를 계산기 파이프라인 단계로 추출·확장. 팀 한정 로직에 plan rank(`PlanPolicy.php:19`)·api_key roleRank(`index.php:573`) 차원을 추가 입력으로 통합해 단일 PDP 계산기를 형성. `normActions`(`:182`)의 정의순 dedupe를 role 차원 canonical ordering으로 승격.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 계산기 실행 | substrate 승격 |
|---|---|---|
| 3. Assignment Collection | 부여 경로 수집 | `assignableMap`(`:381`) |
| 4~6. Hierarchy/Composite/Dynamic Expansion | 역할 전개 | ABSENT(순신규) |
| **14. Effective Role Generation** | **계산기 본체 실행** | `effectiveForUser`(`:393`) 승격 |
| 16. Snapshot Generation | 결과 영속 | ABSENT(순신규) |

SPEC §15 Resolution Optimizer(Duplicate Removal·Permission Merge)와 협력.

## 5. 무후퇴 · Extend

- **Extend-only**(ADR D-1): `effectiveForUser`(`:393`)를 **파괴하지 않고** Effective Role Calculator 단계 구현체로 승격. 팀 한정 로직을 plan·api_key 차원까지 확장.
- **실재 과신 회피**(ADR D-7): `effectiveForUser`는 팀 한정 부분 PDP지 통합 kernel이 아니다 — 계산기가 "이미 완성"이라 오판 금지.
- **부재 과장 회피**: Pipeline/Executor 프레임워크·Hierarchy/Composite/Dynamic 계산 grep 0은 실측 부재.
- **무후퇴**: `effectiveForUser`·`effectivePermissions`(팀 진입점)는 ERRE 완성까지 유지·병행. api_key roleRank 중복 정의는 SSOT화 대상이나 현행 안전성 유지(ADR D-8).

## 6. 완료게이트 기여

SPEC §37 중 기여 항목:
- **"Effective Role Calculator 구축"** — 본 편은 그 계산기의 거버넌스 계약(직접 대응).
- "Resolution Engine 구축" — Pipeline 14단계 실행 주체.
- Unit Test(Calculator·SPEC §36)·성능(P95≤20ms·SPEC §35)·Deterministic 100%(SPEC §35)는 실 구현 세션 조건.
- 실 구현은 선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션(RP-track). 본 편 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

- `TeamPermissions.php:120` · `:132` · `:134` · `:136` · `:182` · `:202` · `:215` · `:381` · `:393` · `:694`(Ground-Truth ① §2.A)
- `UserAuth.php:249`(① §2.C) · `PlanPolicy.php:19`(① §2.D) · `index.php:573`(① §2.B) · `AdminMenu.php:74`(① §4)
- KEEP_SEPARATE: `AdminMenu.php:504`~`:551` · `PM/Dependencies.php:77`~`:90` · `GraphScore.php:13`~`:25` · `PriceOpt` · `AdminGrowth.php:1239`(Ground-Truth ② §4·ADR D-5)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
