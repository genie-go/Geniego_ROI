# DSAR — APPROVAL_EFFECTIVE_ROLE (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §7)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §7
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: PARTIAL-substrate / ABSENT-governance — substrate=`TeamPermissions::effectiveForUser`(`TeamPermissions.php:393`, 팀 한정)
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용 — 없으면 ABSENT) · Extend-only(대체 금지) · KEEP_SEPARATE 오흡수 금지

---

## 1. 목적

SPEC §7 Effective Role Calculator가 산출하는 **결과 엔티티** APPROVAL_EFFECTIVE_ROLE(§2 Canonical Entity 목록)을 정의한다. 이 엔티티는 한 주체(Subject)에 대해 Assignment·Hierarchy·Composite·Dynamic·Temporary·Emergency·Delegated·Service Role 등 모든 부여 경로를 통합해 **중복 제거(deduplication) 후 Canonical Ordering을 적용한 최종 실효 역할 집합**이다(SPEC §7 원문: "최종 결과는 중복 제거 후 Canonical Ordering 적용").

ERRE에서 이 엔티티는 Resolution Pipeline(SPEC §4)의 14단계 "Effective Role Generation"의 산출물이며, Snapshot(SPEC §18)·Digest(SPEC §20)로 영속되어 런타임 authorization projection(SPEC §27 "Effective Role Set")의 1차 입력이 된다.

**Ground-Truth 요지**: effective **role 집합**을 request-time에 산출하는 유일한 실존 generator는 `effectiveForUser`(`TeamPermissions.php:393`)이나 이는 **팀 도메인 한정 라이브 재계산**이며, plan rank·api_key roleRank를 통합하지 않고 결과를 영속·버전화하지 않는다(Ground-Truth ① §4·② #3). 따라서 본 엔티티는 substrate 승격 + 순신규 영속·통합 계층이 결합된 PARTIAL 형태다.

## 2. Ground-Truth 현황

### 2.1 실존 substrate (PARTIAL — 팀 한정 role 집합 산출)

| substrate | file:line | Resolution Kernel 매핑 | 판정 |
|---|---|---|---|
| `effectiveForUser()` — role 분기(owner/admin→full, manager→팀권한, member→clamp) 후 실효 역할·권한 산출 | `TeamPermissions.php:393` | **Effective Role Generation (kernel 중추)** | PRESENT(live recompute·팀 한정) |
| `roleOf()` — team_role 정규화(fail-closed: `parent_user_id` 키부재→member) | `TeamPermissions.php:120` | Subject Resolution | PRESENT |
| `isAdmin()` / `isOwnerAdmin()` / `isManagerAdmin()` — god flag·역할 판정 | `TeamPermissions.php:132` · `:134` · `:136` | Subject Resolution | PRESENT |
| `assignableMap()` — 위임 상한(owner→null, manager→팀권한맵, member→[]) | `TeamPermissions.php:381` | Assignment Collection (cap) | PRESENT |
| `normActions()` — ACTIONS 정의순 재정렬 + dedupe(`$set[$a]=true` 해시) | `TeamPermissions.php:182` | **Canonical Ordering / dedupe (부분)** | PARTIAL |
| team_role 정규화(미지정→owner, fail-open) | `UserAuth.php:1119` `normTeamRole()` | Subject Resolution | PRESENT |
| `resolveAdminByToken()` — plan/plans='admin' 세션→admin row | `UserAuth.php:2998` | Subject Resolution (admin SSOT) | PRESENT |

**결합 로직 실측**(Ground-Truth ① §3): role 집합의 중복 제거는 `normActions`의 `$set[$a]=true` 해시(`TeamPermissions.php:182`)로 **action 차원에서만** 존재. **cross-차원(plan/api_key/team_role) 역할 canonical ordering·통합 dedupe 함수는 부재** — 결합은 `effectiveForUser`(`:393`) 내부 인라인 분기일 뿐, 명시적 명명 combine/merge 함수 없음.

### 2.2 통합 부재 (ABSENT — Ground-Truth ① §4)

세 rank가 직교 병렬 산재하여 하나의 canonical role 집합으로 통합되지 않음:
1. **plan rank** — `PlanPolicy::RANK`(`PlanPolicy.php:19`, 0~5)
2. **api_key roleRank** — `index.php:573`(0~3) + `AdminMenu.php:74` **중복 정의**(단일소스 아님)
3. **team_role** — owner/manager/member (`TeamPermissions`·`UserAuth` 산재)

세 차원을 한 함수 인자로 받아 단일 effective role 집합을 반환하는 resolver 없음. api_key 경로와 세션(team_role) 경로는 **상호배타적** — 한 요청에서 세 rank 동시해석 안 됨.

### 2.3 KEEP_SEPARATE (오흡수 금지)

- `AdminMenu.php:504`~`:551`(`wouldCycle` — menu_tree 조상체인) · `PM/Dependencies.php:77`~`:90`(task DFS) · `GraphScore.php:13`~`:25`(마케팅 어트리뷰션 그래프)는 **role↔role 그래프가 아니다**. Role 집합 통합에 이들의 순환탐지·DFS를 재사용 금지(가짜녹색 회피).
- `legacy_v338_pkg` Python `effective_role_for_user`(org.py)는 폐기 Python — 현행 PHP 무관·재부활 금지(Ground-Truth ② §4).

## 3. Canonical 설계

APPROVAL_EFFECTIVE_ROLE 엔티티의 canonical 필드(SPEC §7·§18·§20 파생):

| # | 필드 | 의미 |
|---|---|---|
| 1 | effective_role_id | 산출 결과 식별자 |
| 2 | subject_ref | 대상 주체(user/api_key/service) |
| 3 | role_set[] | 중복 제거 후 Canonical Ordering 적용된 실효 역할 목록 |
| 4 | source_paths[] | 각 역할의 부여 경로(Assigned/Expanded/Composite/Dynamic/Temporary/Emergency/Delegated/Service) |
| 5 | resolution_version | 불변 버전 바인딩(SPEC §33) |
| 6 | evaluated_at | 산출 시각(Resolution Context) |
| 7 | digest | Snapshot Digest 참조(SPEC §20) |

**Canonical Ordering 규칙**(SPEC §7): 산출 대상 역할(Assigned·Expanded·Composite·Dynamic·Temporary·Emergency·Delegated·Service)을 통합 후 (a) 중복 제거 → (b) 결정적 정렬(deterministic ordering) 적용. 동일 입력(Subject+Context+Version)→동일 출력 100%(ADR D-2). 기존 `normActions`(`TeamPermissions.php:182`)의 정의순 재정렬 원리를 role 차원으로 승격·확장한다.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 본 엔티티 기여 | substrate 승격 대상 |
|---|---|---|
| 3. Assignment Collection | role 부여 경로 수집 | `subjectPerms`(`:202`)·`assignableMap`(`:381`) 확장 |
| 4. Hierarchy Expansion | 상속 역할 전개 | ABSENT (순신규) |
| 5. Composite Expansion | 합성 역할 전개 | ABSENT (순신규) |
| 6. Dynamic Evaluation | 조건부 역할 평가 | ABSENT (순신규) |
| **14. Effective Role Generation** | **role_set 산출·dedupe·ordering** | `effectiveForUser`(`:393`) 승격 |
| 16. Snapshot Generation | role_set 불변 영속 | ABSENT (순신규) |

Graph는 DAG 유지·순환 거부(SPEC §5). role 노드/엣지·순환탐지는 grep 0(Ground-Truth ② #2)이므로 순신규.

## 5. 무후퇴 · Extend

- **Extend-only**(ADR D-1): `effectiveForUser`(`:393`)·`assignableMap`(`:381`)·`normActions`(`:182`)를 **파괴하지 않고** Effective Role Calculator 단계 구현체로 승격. 팀 한정 로직을 plan·api_key 차원까지 확장해 통합 PDP를 형성.
- **실재 과신 회피**(ADR D-7): `effectiveForUser`는 팀 한정 **부분 PDP**이지 통합 kernel이 아니다 — "이미 통합 role 산출이 있다"로 오판 금지.
- **부재 과장 회피**: Hierarchy/Composite/Dynamic 역할 전개 grep 0은 실측 부재이지 "숨겨진 구현"이 아니다.
- **무후퇴**: 기존 게이트(미들웨어 RBAC·`guardTeamWrite`·`requirePlan`·`effectiveScope`)는 ERRE 완성까지 유지·병행. `api_key roleRank` 중복 정의(`index.php:573` ↔ `AdminMenu.php:74`)는 통합 시 SSOT화 대상이나, 현행 안전성은 유지(ADR D-8 부수 발견).

## 6. 완료게이트 기여

SPEC §37 Completion Gate 중 본 엔티티가 충족에 기여하는 항목:
- "Effective Role Calculator 구축" — 본 엔티티는 그 산출물 계약.
- "Resolution Engine 구축" — Pipeline 14단계 산출물 정의.
- Regression Test 100%(SPEC §36) — RBAC·Approval·Audit 회귀에서 role_set 결정성 검증.
- 실 구현·벤치마크(P95≤20ms·SPEC §35)·회귀는 **선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션(RP-track)**의 완료 조건(ADR §5). 본 편은 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

본 편이 인용한 모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분:
- `TeamPermissions.php:120` · `:132` · `:134` · `:136` · `:182` · `:202` · `:381` · `:393`(Ground-Truth ① §2.A)
- `UserAuth.php:1119` · `:2998`(Ground-Truth ① §2.C)
- `PlanPolicy.php:19`(Ground-Truth ① §2.D) · `index.php:573`(② §2.B) · `AdminMenu.php:74`(① §4)
- KEEP_SEPARATE: `AdminMenu.php:504`~`:551` · `PM/Dependencies.php:77`~`:90` · `GraphScore.php:13`~`:25`(Ground-Truth ② §4)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
