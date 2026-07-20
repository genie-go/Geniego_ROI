# DSAR — ERRE: 실효 역할 해석 엔진 (APPROVAL_EFFECTIVE_ROLE_ENGINE)

> 거버넌스 상태: 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
> 상위 SPEC: docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md
> 상위 ADR: docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md
> Ground-Truth: DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION / _DUPLICATE_IMPLEMENTATION_AUDIT

---

## 1. 목적·범위

본 DSAR은 EPIC 06-A Part 3-7의 최상위 Canonical Entity인 **`APPROVAL_EFFECTIVE_ROLE_ENGINE`**(이하 ERRE Engine) — 즉 GeniegoROI Authorization의 **Core Authorization Kernel·단일 Policy Decision Point(PDP)** — 을 거버넌스 관점에서 명세한다.

SPEC §0·§1(1)이 규정하듯 ERRE Engine은 RBAC·Hierarchy·Composite·Dynamic·Scoped·Service·Temporary·Delegated·Emergency Role을 하나의 실효 권한 계산으로 통합하며, **모든 접근 제어는 반드시 본 엔진을 통과**해야 한다(SPEC §0 L19). 본 엔진은 다음 15개 불변식을 만족해야 한다(SPEC §0 L23~37): Single Source of Truth · Deterministic Resolution · Immutable Resolution Snapshot · Version-aware · Scope-aware · Context-aware · Time-aware · Risk-aware · Policy-aware · Multi-tenant · High Availability · Horizontal Scalability · Cache Consistency · Explainable Authorization · Audit Traceability.

범위: ERRE Engine의 Registry·소유 계약·불변성·PDP 단일성만 다룬다. 그 하위 실행 구조(Pipeline·Context·Session·Graph·Planner·Optimizer·Executor)는 각기 형제 DSAR에서 상세화하며, 본 문서는 그것들을 오케스트레이션하는 **커널 경계(kernel boundary)** 를 정의한다.

**코드 변경 절대 0.** 본 문서는 설계 명세이며 실 구현은 선행 foundation(Part 1~3-6) 인증 후 별도 승인 세션(RP-track)에서 진행한다.

---

## 2. Ground-Truth 현황 (실존 substrate vs ABSENT)

### 2.1 통합 PDP 판정 = ABSENT (순신규 그린필드)

ADR §2.1과 Ground-Truth ① §4가 실측한 결론: **세 rank 체계를 하나의 canonical decision으로 통합하는 Policy Decision Point는 실존하지 않는다.**

- `PlanPolicy.php:19`(`RANK` free/demo=0…admin=5) — plan 차원 게이트.
- `index.php:573`(`$roleRank = ['viewer'=>0…'admin'=>3]`) + `AdminMenu.php:74` **중복 정의** — api_key 차원.
- team_role(owner/manager/member) — `TeamPermissions.php`·`UserAuth.php` 산재.

세 차원을 **한 함수 인자로 받아 단일 effective decision을 반환하는 resolver가 없다**(Ground-Truth ① §4 L133). 세 게이트는 미들웨어(api_key role)→`guardTeamWrite`(team_role, `index.php:82`)→핸들러 `requirePlan`(plan, `UserAuth.php:364`)+`effectiveScope`(team_role scope)로 **직교 병렬 layering** 되어 각기 독립 통과한다. `requireTenantSecurityWrite`(`UserAuth.php:1204`)가 "plan 게이트와 직교"임을 명시 — 의도적 layering이지 통합 PDP가 아니다.

### 2.2 실존 substrate = `effectiveForUser` (PARTIAL·팀 한정 부분 PDP)

ERRE Engine의 유일한 근접 중추는 `TeamPermissions::effectiveForUser()`(`TeamPermissions.php:393`)다. owner/admin→full, manager→팀권한, member→명시권한을 팀 상한과 교집합 clamp + scope 상속(member→team→own)을 **request-time 라이브 산출**한다(Ground-Truth ① §2.A). 진입점은 `effectivePermissions()` GET `/auth/team/effective-permissions`(`TeamPermissions.php:694`).

그러나 이는 **team_role+isAdmin만 결합하고 plan rank/api_key roleRank/scopes를 미고려**하는 **부분 PDP(팀 한정)** 다(Ground-Truth ① §4 L135). ADR §2.1 L14 판정 그대로: "유일한 effective generator이나 plan/api_key 차원을 통합하지 않는다".

### 2.3 정직 분리 (D-7 준수)

- **실재 과신 회피**: `effectiveForUser`는 팀 한정 부분 PDP지 통합 kernel이 아니다(ADR D-7). "이미 통합 엔진이 있다"로 오판 금지.
- **부재 과장 회피**: 통합 PDP grep 0은 실측 부재지 "숨겨진 구현"이 아니다.

### 2.4 KEEP_SEPARATE (오흡수 금지)

`SecurityAudit`(해시체인)·`Risk`(churn ML)·`PM/Dependencies`(task DFS)·`GraphScore`·`RuleEngine`·`Decisioning`·`AnomalyDetection`·`Alerting`·`ModelMonitor` 등은 이름만 유사하며 **권한 resolution이 아니다**(ADR D-5·Ground-Truth ② §4). ERRE Engine 커널에 흡수·개명·통합 금지(가짜녹색 회피). 폐기 레거시 `legacy_v338_pkg` Python `effective_role_for_user`(org.py) 재부활 금지.

---

## 3. Canonical 설계 (Registry/Version/Snapshot/불변성)

### 3.1 Canonical Entity 등록

- **Entity**: `APPROVAL_EFFECTIVE_ROLE_ENGINE` (SPEC §2 L81 최상위).
- **Registry**: SPEC §1(1) "Effective Role Resolution Engine Registry" — 엔진 인스턴스·버전·활성 정책 세트를 등록하는 최상위 레지스트리. tenant별 등록·격리(SPEC §0 Multi-tenant).

### 3.2 단일 PDP 계약 (ADR D-2)

- **Single Source of Truth**: 모든 접근 제어는 ERRE Engine을 통과한다. 우회 경로는 Static Lint(§29·SPEC) 대상.
- **Deterministic**: 동일 입력(Subject+Context+Version)→동일 출력 100% 보장(SPEC §35 "Deterministic Result 100%").
- **Immutable Snapshot**: effective 결과는 immutable Resolution Snapshot+Digest+Version으로 영속(SPEC §18·§20·§33 "Immutable Resolution Version"). 런타임은 스냅샷을 참조(lock-free read path·SPEC §35).

### 3.3 무결성 제약 (SPEC §33)

Immutable Resolution Version · Snapshot Integrity · Digest Validation · Graph Integrity · Tenant Isolation · Version Binding. 현행 substrate는 tenant isolation은 있으나(`TeamPermissions.php:202`·`:215` `WHERE tenant_id=?`) **version binding·immutable 제약이 부재**하다(Ground-Truth ② §5 L67) — ERRE Engine 도입 시 신설.

### 3.4 성능 계약 (SPEC §35)

P95 ≤ 20ms · P99 ≤ 50ms · Cache Hit ≥ 95% · Deterministic 100% · Horizontal Scale · Lock-Free Read Path · Incremental Recalculation. 현행 `effectiveForUser`는 매 요청 DB 재조회(`TeamPermissions.php:202`·`:215`)로 캐시가 없어(Ground-Truth ② #4 ABSENT) 이 계약을 만족하지 못한다.

---

## 4. Resolution Kernel 매핑 (SPEC §4 파이프라인 위치)

ERRE Engine은 파이프라인의 특정 단계가 아니라 **18단계 전체를 소유·오케스트레이션하는 커널**이다(SPEC §4). 현행 대응:

- 현행 `effectiveForUser`(`TeamPermissions.php:393`)는 파이프라인 없이 **if/switch로 직접 산출**한다(Ground-Truth ② #1 L27). ERRE Engine은 이 인라인 로직을 §4 파이프라인 단계 구현체로 **승격(Extend)** 한다(ADR D-1).
- 커널 출력은 SPEC §27 Runtime Authorization Projection: Effective Role Set · Permission Set · Scope Set · Constraint Set · Deny Set · Risk Level.

---

## 5. 무후퇴·Extend 원칙 (기존 substrate 대체금지·승격)

- **Golden Rule (ADR D-1)**: `effectiveForUser`(`:393`)·`effectiveScope`(`:236`)·`clampActions`(`:423`)·`assignableMap`(`:381`)을 파괴하지 않고 ERRE Pipeline의 Calculator 단계 구현체로 **승격**. 팀 도메인 한정 로직을 plan·api_key 차원까지 확장해 통합 PDP를 형성.
- **무후퇴(ADR §4)**: 기존 게이트(미들웨어 RBAC·`guardTeamWrite`·`requirePlan`·`effectiveScope`)는 ERRE 완성까지 **유지·병행**. Extend-only.
- **P1~P5 보안수정 재활용(ADR D-7)**: writeGuard 서버강제·admin SSOT `resolveAdminByToken`(`UserAuth.php:2998`)·plan fail-secure(`requireFeaturePlan` `UserAuth.php:77`)는 ERRE Subject Resolution·Deny Projection의 실 substrate로 재활용(재플래그 금지).

---

## 6. 완료 게이트 기여 (SPEC §37 중 이 엔티티 항목)

SPEC §37 완료 조건 중 본 엔티티가 직접 책임지는 항목:

- **"Resolution Engine 구축"** — 본 엔티티의 실 구현 완료.
- 하위 게이트(Graph·Calculator·Explain·Snapshot·Cache 등)는 형제 DSAR가 분담하나, 본 커널이 이들을 통합 오케스트레이션함이 완료의 필요조건.
- Performance Benchmark 통과(SPEC §35) · Regression Test 100%(SPEC §36: RBAC·ABAC·Workflow·Approval·Audit)가 커널 인증의 필수 게이트.

현재 상태: **NOT_CERTIFIED · BLOCKED_PREREQUISITE.** 코드 0. 선행 Part 1~3-6 인증 미완.

---

## 7. 반날조 인용 출처 (사용한 파일:라인 목록·전부 허용목록 내)

- `TeamPermissions.php:393` (`effectiveForUser` 부분 PDP 중추) — Ground-Truth ① §2.A / ADR §2.1
- `TeamPermissions.php:236` (`effectiveScope`) · `:381` (`assignableMap`) · `:423` (`clampActions`) · `:202`·`:215` (request-time DB 조회·tenant isolation) · `:694` (`effectivePermissions` 진입점) — Ground-Truth ①·②
- `PlanPolicy.php:19` (`RANK`) — Ground-Truth ① §2.D
- `index.php:573` (roleRank) · `index.php:82` (`guardTeamWrite` 전역) — Ground-Truth ① §2.B
- `AdminMenu.php:74` (roleRank 중복 정의) — Ground-Truth ① §4
- `UserAuth.php:77` (`requireFeaturePlan`) · `:364` (`requirePlan`) · `:1204` (`requireTenantSecurityWrite` 직교) · `:2998` (`resolveAdminByToken`) — Ground-Truth ①
- (KEEP_SEPARATE로만 언급, substrate 인용 아님: `SecurityAudit`·`Risk`·`PM/Dependencies`·`GraphScore`·`RuleEngine`·`Decisioning`·`AnomalyDetection`·`Alerting`·`ModelMonitor`)

**판정 요약: APPROVAL_EFFECTIVE_ROLE_ENGINE = ABSENT(통합 PDP) / PARTIAL(`effectiveForUser` 팀 한정 부분 PDP). 통합 커널은 순신규 그린필드. Extend-only 승격 대상.**
