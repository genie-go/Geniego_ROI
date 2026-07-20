# DSAR — Effective Permission Calculator (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §8)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §8 (구현 목표 #10)
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md) (D-1 승격 · D-4 deny>allow)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: PARTIAL-substrate / ABSENT-governance — substrate=`clampActions`(`:423`)·`normActions`(`:182`)·`subjectPerms`(`:202`) 승격
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만) · Extend-only · Merge Rule(deny>allow / narrow>wide / runtime>static)

---

## 1. 목적

SPEC §8 Effective Permission Calculator(구현 목표 #10)는 Direct·Inherited·Composite·Dynamic·Runtime·Service Permission을 통합하되 **Permission Merge Rule**(Explicit Deny > Allow / Narrow Scope > Wide Scope / Runtime Constraint > Static Constraint)을 적용해 실효 권한을 산출하는 **계산기(엔진 컴포넌트)**다. 본 편은 그 계산기의 거버넌스 계약을 정의한다(산출 **결과 엔티티**는 별편 `APPROVAL_EFFECTIVE_PERMISSION` 소관).

이 계산기는 Resolution Pipeline(SPEC §4) 15단계 "Effective Permission Generation"의 실행 주체이며, Resolution Executor(SPEC §16)의 Thread Safe·Stateless·Deterministic 특성을 만족해야 한다.

**Ground-Truth 요지**(① §3): permission 산출·clamp의 실존 substrate는 `subjectPerms`(`:202`)·`normActions`(`:182`)·`clampActions`(`:423`)로 **PRESENT**하나, 이들은 (a) 팀 도메인 한정, (b) merge rule 1항(Explicit Deny > Allow)이 통합 부재(allow-only grant 모델), (c) 명시적 combine/merge 명명 함수 부재다. 본 계산기는 이 substrate를 승격·확장하는 PARTIAL 형태다.

## 2. Ground-Truth 현황

### 2.1 실존 substrate (PARTIAL — 승격 대상 계산 로직)

| substrate | file:line | 계산기 역할 | 판정 |
|---|---|---|---|
| `subjectPerms()` — acl_permission → menu_key⇒actions[] 맵(request-time) | `TeamPermissions.php:202` | Direct Permission 수집 | PRESENT |
| `normActions()` — ACTIONS 부분집합 정렬+dedupe+view 자동포함 | `TeamPermissions.php:182` | canonical ordering·dedupe | PRESENT |
| `actionsCover()` — manage 슈퍼셋 판정 | `TeamPermissions.php:194` | 권한 포함관계 | PRESENT |
| **`clampActions()`** — want∩cap 교집합(cap manage면 전체) | `TeamPermissions.php:423` | **Merge Rule: narrow>wide intersection** | PRESENT |
| `effectiveForUser()` — member 명시권한을 팀상한과 교집합 clamp | `TeamPermissions.php:393` | permission 결합(인라인) | PRESENT(팀 한정) |
| `putMemberPermissions()` — assignable 초과 검증(403)+clamp+scopeWithinCap | `TeamPermissions.php:641` | 위임 상한 검증 | PRESENT |
| `reclampTeamMembers()` — 팀권한 축소 시 재클램프(영속) | `TeamPermissions.php:809` | re-projection | PRESENT |
| api_key write 게이트(rank/scope 비교) | `index.php:587` | Permission 판정(api_key) | PRESENT |
| `requireFeaturePlan()` + `FEATURE_MIN_PLAN`/`minPlanFor`(fail-secure 'pro') | `UserAuth.php:77` · `PlanPolicy.php:27`·`:47` | Permission 판정(plan) | PRESENT |
| api_key scope 상한 교차검증(초과→422)+`array_unique` dedupe | `Keys.php:99`·`:102`·`:201` | dedupe·cap | PRESENT |

### 2.2 Merge Rule·combine 부재 실측 (Ground-Truth ① §3)

- **combine/merge 명명 함수 부재**: 결합은 `effectiveForUser`(`:393`) 내부 인라인(role 분기+clamp+scope 상속). `$result + ['role'=>...]`(`effectivePermissions:694`)가 유일한 merge 유사. 통합 계산기 프레임워크(Pipeline/Executor) grep 0(Ground-Truth ② #1).
- **Explicit Deny > Allow**: PARTIAL — acl_permission allow-only grant 모델, negative-ACL 부재(별편 EFFECTIVE_DENY·EFFECTIVE_PERMISSION 소관).
- **Narrow Scope > Wide Scope**: PRESENT — `clampActions`(`:423`)·member clamp.
- **Runtime Constraint > Static Constraint**: ABSENT — runtime 우선 통합 로직 grep 0.

### 2.3 KEEP_SEPARATE (오흡수 금지)

- `RuleEngine.php`(캠페인 자동제어)·`Decisioning.php`·`Alerting.php:665`("executor identity"=알림 실행자, resolution executor 아님)는 permission 계산이 아니다(Ground-Truth ② §4·ADR D-5). merge/executor 명명이 유사해도 흡수 금지.

## 3. Canonical 설계

Effective Permission Calculator의 거버넌스 계약(SPEC §8·§16):

| 계약 항목 | 요구 |
|---|---|
| 입력 | Effective Role 집합(별편) + Direct/Inherited/Composite/Dynamic/Runtime/Service Permission + Effective Deny(별편) |
| 처리 | (1) Explicit Deny 최우선 차감 → (2) narrow scope 우선 → (3) runtime constraint > static → (4) dedupe·canonical ordering |
| 출력 | `APPROVAL_EFFECTIVE_PERMISSION`(별편) permission_set |
| 특성 | Thread Safe · Stateless · Deterministic 100% |

**승격 알고리즘**(ADR D-1·D-4): `clampActions`(`:423`) intersection과 `normActions`(`:182`) dedupe·ordering을 통합 계산기 단계로 추출·확장. Explicit Deny 차감을 merge 앞단에 신설(전역 Deny Calculator 산출 결합). 팀 한정 로직을 plan·api_key permission 차원까지 통합.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 계산기 실행 | substrate 승격 |
|---|---|---|
| 3. Assignment Collection | permission 수집 | `subjectPerms`(`:202`) |
| 9. Explicit Deny Projection | deny 최우선 차감 | 별편 EFFECTIVE_DENY |
| 11. Permission Projection | action 정규화·dedupe | `normActions`(`:182`)·`actionsCover`(`:194`) |
| 13. Conflict Detection | intersection·cap 검증 | `clampActions`(`:423`)·`putMemberPermissions`(`:641`) |
| **15. Effective Permission Generation** | **계산기 본체 실행** | `effectiveForUser`(`:393`) 승격 |

SPEC §15 Optimizer(Permission Merge)와 협력.

## 5. 무후퇴 · Extend

- **Extend-only**(ADR D-1): `clampActions`·`normActions`·`subjectPerms`를 파괴하지 않고 Effective Permission Calculator 단계 구현체로 승격.
- **Explicit Deny > Allow 전역화**(ADR D-4): 현행 국소 deny 센티넬을 전역 Deny Calculator 산출과 결합해 merge 앞단 차감. narrow>wide는 `clampActions`가 이미 보장.
- **실재 과신 회피**(ADR D-7): allow-only grant 모델에 negative-ACL·명시적 combine 함수가 없음을 "merge 계산기가 이미 있다"로 오판 금지.
- **부재 과장 회피**: Pipeline/Executor·runtime constraint 우선 로직 grep 0은 실측 부재.
- **무후퇴**: `requireFeaturePlan`·api_key write 게이트·scope 상한 검증은 ERRE 완성까지 유지·병행.

## 6. 완료게이트 기여

SPEC §37 중 기여 항목:
- **"Effective Permission Calculator 구축"** — 본 편은 그 계산기의 거버넌스 계약(직접 대응).
- Unit Test(Calculator·SPEC §36)·성능(1M Effective Permission Projection·SPEC §36)·Deterministic 100%(SPEC §35)는 실 구현 세션 조건.
- Regression(RBAC·ABAC·Approval·SPEC §36) merge rule 결정성 검증.
- 실 구현은 선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션(RP-track). 본 편 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

- `TeamPermissions.php:182` · `:194` · `:202` · `:393` · `:423` · `:641` · `:694` · `:809`(Ground-Truth ① §2.A·§3)
- `index.php:587`(① §2.B) · `UserAuth.php:77`(① §2.C) · `PlanPolicy.php:27`·`:47`(① §2.D) · `Keys.php:99`·`:102`·`:201`(① §2.E)
- KEEP_SEPARATE: `RuleEngine.php` · `Decisioning.php` · `Alerting.php:665`(Ground-Truth ② §4·ADR D-5)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
