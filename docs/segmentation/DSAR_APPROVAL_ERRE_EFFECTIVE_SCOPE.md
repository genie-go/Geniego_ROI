# DSAR — APPROVAL_EFFECTIVE_SCOPE (EPIC 06-A-03-02-03-04 Part 3-7 · per-entity · SPEC §9)

- **상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE · 289차 후속 (2026-07-20)
- **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §9
- **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
- **Ground-Truth**: [`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md)(①) · [`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)(②)
- **판정**: PARTIAL-substrate / ABSENT-governance — substrate=`effectiveScope`(`TeamPermissions.php:236`)·data_scope 9차원
- **불변**: 반날조(모든 `file:line`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만) · Extend-only · Intersection 기본(SPEC §9)

---

## 1. 목적

SPEC §9 Effective Scope Calculator가 산출하는 **결과 엔티티** APPROVAL_EFFECTIVE_SCOPE를 정의한다. Assignment Scope·Role Scope·Permission Scope·Runtime Scope·Context Scope를 통합하며 **Intersection(교집합) 기본 적용**(SPEC §9 원문)이다. 이 엔티티는 Resolution Pipeline(SPEC §4) 7단계 "Scope Projection" 산출물로, 런타임 projection(SPEC §27 "Effective Scope Set")의 입력이 된다.

**Ground-Truth 요지**: scope 교집합·narrow>wide는 실존 substrate로 **PRESENT**하다. `effectiveScope`(`TeamPermissions.php:236`)가 요청자 실효 데이터범위를 라이브 산출하며 `DATA_SCOPES` 9차원(`:41`)을 다룬다. 단 결과는 request-time 휘발이며 영속·버전·캐시가 부재(Ground-Truth ② #3·#4). Runtime Scope·Context Scope와의 교집합 통합은 순신규.

## 2. Ground-Truth 현황

### 2.1 실존 substrate (PARTIAL — scope 산출·교집합·enforcement)

| substrate | file:line | Resolution Kernel 매핑 | 판정 |
|---|---|---|---|
| `DATA_SCOPES` 9차원 상수(company..own) | `TeamPermissions.php:41` | Scope Projection (vocabulary) | PRESENT |
| `subjectScope()` — data_scope 행 조회 → {scope_type, values[]} | `TeamPermissions.php:215` | Assignment Collection (scope) | PRESENT |
| `effectiveScope()` — 요청자 실효 범위 라이브 산출(owner/admin→null 무제한, 비-owner 실패→DENY_SCOPE fail-closed, user 우선→team 상속) | `TeamPermissions.php:236` | **Scope/Deny/Effective Generation** | PRESENT(팀 한정) |
| `scopeValuesFor()` — 특정 차원 허용값(`__deny__`→[], 타차원→null) | `TeamPermissions.php:272` | Scope Projection | PRESENT |
| `scopeSql()` — 차원값→SQL IN절, deny→`AND 1=0` | `TeamPermissions.php:286` | Scope Projection (enforcement) | PRESENT |
| `scopeSqlNamed()` — named-param 변형 | `TeamPermissions.php:299` | Scope Projection | PRESENT |
| `scopeChannelProduct()` — channel/product/brand 다차원 동시강제 | `TeamPermissions.php:315` | Scope Projection (다차원 intersection) | PRESENT |
| `scopeWithinCap()` — 요청 scope ⊆ manager scope 부분집합 검증(교차차원·무제한·전사=fail-closed) | `TeamPermissions.php:356` | **Conflict Detection / scope cap (narrow>wide)** | PRESENT |
| `replaceScope()` — data_scope DELETE→INSERT 영속 | `TeamPermissions.php:337` | Scope 영속화(할당) | PRESENT |
| `authedTenant()` — 인증 user 격리 tenant, admin 임퍼소네이트 제한 | `UserAuth.php:409` | Scope/Subject (tenant scope) | PRESENT |

**교집합·narrow>wide 실측**(Ground-Truth ① §3): **PRESENT**. `scopeWithinCap()`(`:356`)=요청 scope ⊆ manager scope, `effectiveScope`(`:236`)의 user 우선→team 상속으로 narrow(user)<wide(team)<widest(owner→null) 위계. `scopeChannelProduct`(`:315`)가 다차원 동시강제(교집합 형태).

### 2.2 통합 교집합 부재 (ABSENT)

- Assignment/Role/Permission/Runtime/Context 5종 scope를 하나의 교집합으로 결합하는 통합 함수 부재 — 현행은 `effectiveScope`(`:236`)가 team_role scope만 산출(plan·api_key 차원 미결합).
- scope 산출 결과의 불변 스냅샷·버전·캐시 grep 0(Ground-Truth ② #3·#4) — 매 요청 DB 재조회(`subjectScope:215`).
- **tenant isolation PRESENT**: 모든 쿼리 `WHERE tenant_id=?`(예 `TeamPermissions.php:202`·`:215`)이나 **version binding·immutable 제약 부재**(Ground-Truth ② §5).

### 2.3 KEEP_SEPARATE (오흡수 금지)

- `Connectors.php:819`(요청당 1회 채널캐시)·`Wms.php`(reconcileChannelStock)는 데이터 scope resolution이 아니다(Ground-Truth ② §4). scope 교집합에 흡수 금지.

## 3. Canonical 설계

APPROVAL_EFFECTIVE_SCOPE 엔티티 canonical 필드(SPEC §9):

| # | 필드 | 의미 |
|---|---|---|
| 1 | effective_scope_id | 산출 결과 식별자 |
| 2 | subject_ref | 대상 주체 |
| 3 | scope_dimensions{} | 9차원(company..own) × 허용값 집합 |
| 4 | intersection_trace[] | Assignment/Role/Permission/Runtime/Context 각 출처 + 교집합 근거 |
| 5 | deny_dimensions[] | `__deny__` 적용 차원(EFFECTIVE_DENY 참조) |
| 6 | tenant_binding | 격리 tenant(불변) |
| 7 | resolution_version | 불변 버전 바인딩 |

**Intersection 알고리즘**(SPEC §9): 5종 scope를 차원별로 교집합. 한 차원이라도 `__deny__`이면 해당 차원 `[]`(빈 집합)로 fail-closed. `scopeWithinCap`(`:356`) 부분집합 검증과 `effectiveScope`(`:236`) 상속을 통합 교집합으로 승격.

## 4. Resolution Kernel 매핑

| SPEC §4 Pipeline 단계 | 본 엔티티 기여 | substrate 승격 대상 |
|---|---|---|
| 3. Assignment Collection | scope 할당 수집 | `subjectScope`(`:215`) |
| **7. Scope Projection** | **차원별 교집합 산출** | `effectiveScope`(`:236`)·`scopeChannelProduct`(`:315`) 승격 |
| 9. Explicit Deny Projection | `__deny__` 차원 차감 | `scopeValuesFor`(`:272`)·`scopeSql`(`:286`) |
| 13. Conflict Detection | 부분집합 cap 검증 | `scopeWithinCap`(`:356`) |

## 5. 무후퇴 · Extend

- **Extend-only**(ADR D-1): `effectiveScope`·`scopeWithinCap`·`scopeSql`을 파괴하지 않고 Effective Scope Calculator 단계 구현체로 승격. 팀 한정을 Runtime/Context scope 차원까지 확장.
- **실재 과신 회피**(ADR D-7): `effectiveScope`는 팀 한정 부분 산출이지 5종 scope 통합 교집합이 아니다.
- **부재 과장 회피**: scope 스냅샷·캐시 grep 0은 실측 부재(숨겨진 구현 아님). data_scope 테이블은 런타임 생성으로 실재(Ground-Truth ② §5).
- **무후퇴**: `effectiveScope`·enforcement SQL·tenant isolation은 ERRE 완성까지 유지·병행. tenant isolation 절대 보존.

## 6. 완료게이트 기여

SPEC §37 중 기여 항목:
- "Effective Scope Calculator 구축" — 본 엔티티는 산출물 계약.
- Integration Test(Scope·SPEC §36) 검증 대상.
- Runtime Guard(SPEC §28 "Scope Escalation" 차단)의 입력.
- 실 구현은 선행 foundation 인증 후 별도 승인 세션(RP-track). 본 편 코드 0·NOT_CERTIFIED.

## 7. 반날조 인용 출처

- `TeamPermissions.php:41` · `:215` · `:236` · `:272` · `:286` · `:299` · `:315` · `:337` · `:356`(Ground-Truth ① §2.A·§3)
- `UserAuth.php:409`(① §2.C) · `TeamPermissions.php:202`(② §5, tenant isolation)
- KEEP_SEPARATE: `Connectors.php:819`(Ground-Truth ② §4)

실코드 파일 미열람 — 정본 4문서가 유일 근거. NOT_CERTIFIED · 코드 변경 0.
