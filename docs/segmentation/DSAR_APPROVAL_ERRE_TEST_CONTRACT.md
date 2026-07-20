# DSAR — ERRE Test Contract (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity: Effective Role Resolution Engine Test Contract)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §36
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **불변**: fail-closed 회귀 0 · 무후퇴(Extend-only) · 반날조(`파일:라인`은 SPEC·ADR·Ground-Truth ①② 등장분만·없으면 ABSENT)

---

## 1. 목적

SPEC §36(테스트)은 ERRE의 완료 조건인 **5개 테스트 카테고리**를 정의한다.

원문 5카테고리(§36):

1. **Unit** — Graph · Pipeline · Calculator · Optimizer · Explain
2. **Integration** — Assignment · Scope · Dynamic Role · Service Role · Policy Engine
3. **Performance** — 100K Concurrent Resolution · 1M Effective Permission Projection · Incremental Cache Refresh
4. **Security** — Authorization Bypass · Cache Poisoning · Graph Manipulation · Permission Escalation · Scope Escalation
5. **Regression** — RBAC · ABAC · Workflow · Approval · Audit

본 문서는 이 5개 카테고리 각각을 현행 테스트 인프라와 대조한다. ★판정 핵심(CLAUDE.md 명시): **이 저장소에는 구성된 lint·test 스크립트가 없다**(`npm test` 없음·PHPUnit 스위트 없음·검증은 수동/배포). 따라서 SPEC §36의 5 카테고리는 **전부 테스트 스위트 ABSENT**이며, 순신규로 테스트 하네스부터 구축해야 한다. 유일한 근접 검증 자산은 E2E 스모크(회귀 자동화)와 fail-closed 로직(`TeamPermissions.php:234`)의 존재이나, 이를 커버하는 자동 테스트는 부재하다.

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 근접 substrate (테스트 대상 로직은 실재·테스트는 부재)

- **테스트 대상 로직 실재**: Calculator(`effectiveForUser` `TeamPermissions.php:393`)·Scope(`effectiveScope` `:236`)·Optimizer 근접(`normActions` dedupe `:182`)·Conflict(`clampActions` `:423`·`scopeWithinCap` `:356`)는 **테스트 가능한 순수 로직으로 실재**. 단 이를 검증하는 자동 테스트 스위트는 없음.
- **fail-closed 로직**: `DENY_SCOPE='__deny__'`(`TeamPermissions.php:234`)·member 강등(`roleOf` `:120`)·plan 'free' 강등(`requireFeaturePlan` `UserAuth.php:77`) — Security 테스트(Escalation/Bypass) 대상이나 회귀 테스트 부재.
- **권한상승 차단 로직**: `Keys.php:99`(scope 초과 422)·`putMemberPermissions()`(`TeamPermissions.php:641`, DELEGATION_EXCEEDED 403) — Permission/Scope Escalation 테스트 대상.

### 2.2 ABSENT 거버넌스 (SPEC §36 테스트 스위트)

- **테스트 스크립트 자체 ABSENT**(CLAUDE.md): `npm test` 없음·PHPUnit 없음·lint 스크립트 없음. Unit/Integration/Performance/Security/Regression 자동 스위트 전무.
- **Unit 대상 계층 부재**: Graph/Pipeline/Optimizer/Explain은 로직 자체가 ABSENT(② §2 #1·#2·#6)라 테스트 대상조차 없음(테스트 이전에 구현 선행).
- **Performance 벤치 부재**: 100K Concurrent·1M Projection·Incremental Cache Refresh는 캐시/스냅샷 계층 부재(② §2 #4)라 측정 대상 없음.
- **Security 테스트 부재**: Cache Poisoning·Graph Manipulation은 캐시/그래프 계층 부재(② §2 #2·#4)라 공격면 자체가 미형성.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

- E2E 스모크(`npm run e2e`·render.mjs 라우트 도출)는 **화면 렌더/무음 사망 탐지**지 ERRE resolution unit 테스트가 아니다. ERRE Test Contract로 흡수·오표기 금지(가짜녹색 회피).
- `PM/Dependencies.php:77-90`(task DFS)·`GraphScore.php:13-25` 테스트가 있더라도 role graph 테스트가 아니다.

## 3. Canonical 설계 (5 Test Category)

| # | 카테고리 | 테스트 대상(SPEC §36 원문) | 판정 | 근거(`파일:라인` / CLAUDE.md) |
|---|---|---|---|---|
| 1 | Unit | Graph·Pipeline·Calculator·Optimizer·Explain | **ABSENT** | 테스트 스크립트 없음(CLAUDE.md). Calculator 로직만 실재(`TeamPermissions.php:393`)·Graph/Pipeline/Explain 대상 ABSENT(② §2 #1·#2·#6) |
| 2 | Integration | Assignment·Scope·Dynamic·Service·Policy | **ABSENT** | Assignment/Scope 로직 실재(`TeamPermissions.php:202`·`:236`)나 통합 테스트 스위트 없음 |
| 3 | Performance | 100K Concurrent·1M Projection·Incremental | **ABSENT** | 벤치 하네스 없음·캐시 계층 부재(② §2 #4) |
| 4 | Security | Bypass·Cache Poison·Graph Manip·Perm/Scope Escalation | **ABSENT** | 권한상승 차단 로직 실재(`Keys.php:99`·`TeamPermissions.php:641`)나 자동 보안 테스트 없음. Cache/Graph 공격면 미형성 |
| 5 | Regression | RBAC·ABAC·Workflow·Approval·Audit | **ABSENT** | 회귀 스위트 없음(CLAUDE.md). E2E 스모크는 화면 렌더 검증(KEEP_SEPARATE) |

**설계 원칙**:

1. **테스트 하네스부터 신설(CLAUDE.md 현실 반영)** — `npm test`·PHPUnit 부재이므로 ERRE 구현 세션은 테스트 러너 구축을 포함. "테스트가 있는데 통과만 안 함"이 아니라 "스위트 자체 순신규".
2. **fail-closed 회귀 최우선(#5)** — `__deny__`(`TeamPermissions.php:234`)·member 강등(`:120`)·plan fail-secure(`UserAuth.php:77`)는 회귀 테스트로 고정. deny가 allow로 새는 회귀 0 강제(ADR D-4).
3. **Escalation 테스트는 실재 로직 커버(#4)** — `Keys.php:99`(scope 초과 422)·`putMemberPermissions`(`TeamPermissions.php:641` DELEGATION_EXCEEDED)를 Permission/Scope Escalation 테스트로 명시 커버.
4. **Unit은 순수 Calculator부터(#1)** — `effectiveForUser`(`TeamPermissions.php:393`)·`clampActions`(`:423`)·`scopeWithinCap`(`:356`)는 이미 순수 로직 → Reflection/SQLite로 실DB 없이 행동검증(MEMORY 로컬 PHP 패턴) 가능. Graph/Explain은 구현 선행.

### 3.1 카테고리별 정직 판정 서술

- **Unit(#1, ABSENT)**: 테스트 대상 로직의 실재 정도가 항목마다 다르다. Calculator(`effectiveForUser` `TeamPermissions.php:393`·`normActions` `:182`)는 순수 함수로 즉시 테스트 가능하나, Graph/Pipeline/Optimizer/Explain은 로직 자체가 ABSENT(② §2 #1·#2·#6)라 "테스트 대상이 없어서 테스트가 없다". 즉 이 카테고리는 절반은 하네스만, 절반은 구현+하네스 둘 다 선행이다.
- **Integration(#2, ABSENT)**: Assignment(`subjectPerms` `TeamPermissions.php:202`)·Scope(`effectiveScope` `:236`)는 실 DB 왕복 로직이라 통합 테스트 가치가 크나, Dynamic/Service Role은 선행 Part(3-5·3-6) 구현 의존이다. Policy Engine 통합 테스트는 plan/api_key/team 3-rank가 통합 PDP로 합쳐진 후에만 유의미하다(현행 직교 병렬).
- **Performance(#3, ABSENT)**: 100K Concurrent·1M Projection·Incremental Cache Refresh는 캐시/스냅샷 계층 부재(② §2 #4)로 측정 대상이 없다. 벤치 하네스 자체도 없다(CLAUDE.md).
- **Security(#4, ABSENT)**: 권한상승 차단 로직은 실재한다 — `Keys.php:99`(scope 초과 422)·`putMemberPermissions`(`TeamPermissions.php:641` DELEGATION_EXCEEDED)·`scopeWithinCap`(`:356`). 그러나 이를 공격 관점에서 검증하는 자동 보안 테스트는 없다. Cache Poisoning·Graph Manipulation은 캐시/그래프 계층 부재로 공격면 자체가 아직 형성되지 않았다.
- **Regression(#5, ABSENT)**: 회귀 스위트가 없다(CLAUDE.md). E2E 스모크(render.mjs)는 화면 렌더·무음 사망 탐지지 RBAC/ABAC 권한 회귀 검증이 아니므로 KEEP_SEPARATE. fail-closed 회귀(deny→allow 누출)를 고정할 테스트가 가장 시급하다.

## 4. Kernel 매핑 (SPEC §36 카테고리 ↔ 대상 로직)

- **Unit — Calculator** → `effectiveForUser`(`TeamPermissions.php:393`)·`effectiveScope`(`:236`)·`normActions`(`:182`)·`clampActions`(`:423`).
- **Integration — Assignment/Scope** → `subjectPerms`(`TeamPermissions.php:202`)·`subjectScope`(`:215`)·`replacePerms`(`:325`)·`reclampTeamMembers`(`:809`).
- **Security — Escalation** → `Keys.php:99`(scope 초과)·`putMemberPermissions`(`TeamPermissions.php:641`)·`scopeWithinCap`(`:356`).
- **Security — Bypass** → 하드코딩 authz 233개소(Static Lint 대상·② §3)·미들웨어 게이트(`index.php:587`).
- **Regression — RBAC/ABAC** → 팀 RBAC(`TeamPermissions`)·plan rank(`PlanPolicy.php:19`)·data_scope ABAC(`TeamPermissions.php:272`).

## 5. 무후퇴 · Extend

- **기존 검증 자산 존치**: E2E 스모크(render.mjs)·수동 배포 검증을 **대체하지 않고** ERRE 전용 테스트를 추가. E2E는 화면 렌더 회귀용으로 유지(ERRE unit과 역할 분리).
- **fail-closed 로직 무후퇴 고정**: `__deny__`(`TeamPermissions.php:234`)·member 강등(`:120`)을 회귀 테스트로 고정 — ERRE 도입 중 실수로 안전측이 열리는 회귀 0.
- **Reflection+SQLite 검증(MEMORY 패턴)**: 실 DB 없이 핸들러 private 정책로직 행동검증 가능 — Calculator/Escalation 테스트를 로컬 PHP(pdo_sqlite)로 우선 구축.
- **KEEP_SEPARATE 불흡수**: E2E 스모크·`PM/Dependencies`·`GraphScore` 테스트를 ERRE Test Contract로 오표기 금지(가짜녹색).

### 5.1 무후퇴 회귀 시나리오 (테스트가 고정할 불변)

1. **deny 우선 불변**: `__deny__`(`TeamPermissions.php:234`)→`scopeSql AND 1=0`(`:286`)이 전면 차단을 만든다는 사실을 회귀 테스트로 못박는다. ERRE 리팩터링 중 어떤 코드도 이 차단을 우회해 allow로 만들 수 없다.
2. **member 강등 불변**: `roleOf()`(`TeamPermissions.php:120`) 키부재→member, `normTeamRole()`(`UserAuth.php:1119`) 미지정→owner의 상반된 fail 방향(전자 fail-closed·후자 fail-open)이 각 호출부에서 의도대로 유지되는지 테스트로 고정.
3. **DELEGATION_EXCEEDED 유지**: `putMemberPermissions()`(`TeamPermissions.php:641`)가 assignable 초과 시 403을 던지는 위임 상한이 회귀로 유지 — 이를 우회하면 manager가 자기 상한 넘는 권한을 부여하는 취약점.

### 5.2 검증 인프라 현실 (CLAUDE.md·MEMORY 정합)

CLAUDE.md는 이 저장소에 lint/test 스크립트가 없고 검증이 수동/배포임을 명시한다. MEMORY의 로컬 PHP 패턴(php.ini pdo_sqlite/mysql·mbstring + Reflection)으로 실 DB 없이 핸들러 private 정책로직을 행동검증할 수 있으므로, ERRE Calculator/Escalation Unit 테스트는 이 방식으로 우선 구축 가능하다. 다만 이는 로컬 개발 편의지 CI 통합 테스트를 대체하지 않는다 — .github/workflows/deploy.yml은 EN 로케일 syntax guard·빌드·로그인 스모크만 수행하며 권한 회귀를 검증하지 않는다. ERRE 완료 게이트(SPEC §37)의 "Regression 100% 통과"는 CI에 권한 회귀 스위트를 추가하는 작업을 포함한다.

## 6. 완료 게이트

- **BLOCKED_PREREQUISITE**: 5 카테고리 전부 테스트 하네스 신설 + 대상 계층(Graph/Pipeline/Cache/Explain) 구현 이후 작성 가능. 본 단계는 테스트 계약만.
- **ABSENT(전 카테고리 순신규)**: Unit(#1)·Integration(#2)·Performance(#3)·Security(#4)·Regression(#5) — 전부 스위트 자체 부재.
- **완료 판정(SPEC §37 연계)**: Regression Test 100% 통과 + Performance Benchmark(§35) 통과 + fail-closed 회귀 0 + Escalation/Bypass 보안 테스트 통과. NOT_CERTIFIED 유지.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §36 / ADR / Ground-Truth ①② 등장분이다. 테스트 스크립트 부재는 CLAUDE.md 명시.

- `backend/src/Handlers/TeamPermissions.php` — `:120`(roleOf 강등) · `:182`(normActions) · `:202`(subjectPerms) · `:215`(subjectScope) · `:234`(DENY_SCOPE) · `:236`(effectiveScope) · `:325`(replacePerms) · `:356`(scopeWithinCap) · `:393`(effectiveForUser) · `:423`(clampActions) · `:641`(putMemberPermissions DELEGATION_EXCEEDED) · `:809`(reclampTeamMembers)
- `backend/src/Handlers/UserAuth.php` — `:77`(requireFeaturePlan fail-secure)
- `backend/src/Handlers/Keys.php` — `:99`(scope 초과 422)
- `backend/src/PlanPolicy.php` — `:19`(RANK)
- `backend/public/index.php` — `:587`(미들웨어 게이트)
- **KEEP_SEPARATE(권한 아님·오흡수 금지)**: E2E 스모크(render.mjs·`npm run e2e`) · `PM/Dependencies.php:77-90` · `GraphScore.php:13-25`

---
**요약**: SPEC §36의 5 테스트 카테고리 판정 = 전부 ABSENT(스위트 자체 부재). ★CLAUDE.md 명시대로 이 저장소엔 `npm test`·PHPUnit·lint 스크립트가 없다. 테스트 대상 로직(Calculator/Escalation)은 실재하나 자동 테스트 부재 → 하네스부터 순신규. fail-closed 회귀 0 최우선·Reflection+SQLite로 Calculator 우선 커버·E2E 스모크는 KEEP_SEPARATE. Extend-only·NOT_CERTIFIED.
