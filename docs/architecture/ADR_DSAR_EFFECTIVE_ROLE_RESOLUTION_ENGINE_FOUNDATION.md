# ADR — Effective Role Resolution Engine (ERRE) Foundation Governance

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-7
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md`
- **Ground-Truth**: `docs/segmentation/DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `docs/segmentation/DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1(Auth Registry) · Part 2(Permission Engine) · Part 3-1(Role Registry) · 3-2(Hierarchy/Composite) · 3-3(Assignment) · 3-4(Scoped) · 3-5(Dynamic/ABAC) · 3-6(Service/System)

---

## 1. Context

GeniegoROI Authorization은 세 rank 체계(plan `PlanPolicy::RANK`, api_key `index.php:573` roleRank, team_role owner/manager/member)가 **직교 병렬**로 산재하며, effective 권한을 통합 산출하는 **단일 Policy Decision Point(PDP)가 부재**하다. 유일한 effective generator는 `TeamPermissions::effectiveForUser()`(`TeamPermissions.php:393`)로, 팀 도메인 한정 라이브 재계산이며 plan/api_key 차원을 통합하지 않는다.

본 ADR은 RBAC·Hierarchy·Composite·Dynamic·Scoped·Service·Temporary·Delegated·Emergency Role을 하나의 **Effective Role Resolution Engine(ERRE)** — Core Authorization Kernel — 으로 통합하는 거버넌스 기반을 정의한다. 모든 접근 제어는 본 엔진을 통과해야 한다(Single Source of Truth).

## 2. Ground-Truth 판정 (전수조사 기반)

### 2.1 실존 substrate (PARTIAL·Ground-Truth ①)
- **중추**: `TeamPermissions::effectiveForUser`(`:393`) = effective role/permission/scope 라이브 산출(팀 한정). `effectiveScope`(`:236`)·`clampActions`(`:423`)·`scopeWithinCap`(`:356`)·`assignableMap`(`:381`) 등 계산·clamp·cap substrate 실재.
- **결합/deny/ordering**: scope 차원 fail-closed 센티넬 `__deny__`(`:234`→`:272`→`:286` `AND 1=0`)·member 쓰기 전역차단(`UserAuth.php:1167`+`index.php:82`)·`normActions` canonical ordering(`:182`)·intersection clamp. 단 **통합 "deny beats allow" 규칙·negative-ACL 레코드·통합 combine 함수 부재**.
- **3-rank**: plan(`PlanPolicy.php:19`)·api_key(`index.php:573`, `AdminMenu.php:74` 중복정의)·team_role — **통합 resolver 없음**.

### 2.2 거버넌스 계층 (ABSENT-dominant·Ground-Truth ②)
- **ABSENT 8**: Pipeline/Planner/Optimizer/Executor · Resolution Graph(DAG)/Cycle · Snapshot/Digest/Version · Cache/Invalidation · Drift/Revalidation/Reconciliation · Simulation/Explain(XAI) · Effective Risk Calculator · Conflict/SoD.
- **PARTIAL 3**: Effective Constraint(amount `Catalog.php:1036`·MFA `UserAuth.php:941`·api_key expires `Keys.php:99`·data_scope `TeamPermissions.php:272` 분산·통합모델 없음) · Runtime Guard(`writeGuard.js:61`·`guardTeamWrite`·`Wms.php:557`; Static Lint ABSENT) · DB substrate(RBAC 런타임 생성 `TeamPermissions.php:139`·version binding 부재).
- **PRESENT 1**: 하드코딩 authz **233개소**(BE 106/FE 127) — resolution 우회·god-role 산재, 중앙 게이트 미강제.

### 2.3 종합
**ERRE 판정 = PARTIAL-substrate / ABSENT-governance.** Part 3-6과 동형 계열이나 substrate가 단일 함수로 더 좁다. resolution 거버넌스 런타임 계층은 순신규 그린필드.

## 3. Decision

### D-1. ERRE는 기존 substrate를 **대체가 아닌 승격·통합(Extend)** 한다
`effectiveForUser`/`effectiveScope`/`clampActions`/`assignableMap`을 파괴하지 않고, 이들을 ERRE Resolution Pipeline(§4)의 **Effective Role/Permission/Scope Calculator 단계 구현체**로 승격한다. 팀 도메인 한정 로직을 plan·api_key 차원까지 확장해 통합 PDP를 형성한다. (Golden Rule: Replace가 아니라 Extend)

### D-2. 단일 PDP·결정적(deterministic)·불변 스냅샷
모든 접근 제어는 ERRE를 통과한다. 동일 입력(Subject+Context+Version)→동일 출력 100% 보장. effective 결과는 immutable Resolution Snapshot+Digest+Version으로 영속하며, 런타임은 스냅샷을 참조(lock-free read path).

### D-3. Pipeline 순서 불변 (§4 SPEC)
Subject Resolution→Identity Validation→Assignment Collection→Hierarchy/Composite Expansion→Dynamic Evaluation→Scope/Constraint/Deny/Risk/Permission Projection→Policy Evaluation→Conflict Detection→Effective Generation→Snapshot→Cache→Audit. 순서 변경 불가. Graph는 DAG 유지·순환 거부.

### D-4. Explicit Deny > Allow (전역 규칙 신설)
현행 국소 `__deny__` 센티넬을 **전역 Effective Deny Calculator**로 승격 — Explicit/Runtime/Risk/Policy/Environment Deny가 어떤 Allow보다 우선. narrow scope > wide scope, runtime constraint > static constraint.

### D-5. KEEP_SEPARATE — 마케팅/ML/감사/PM 도메인 오흡수 금지
Ground-Truth ② §4의 근접물(RuleEngine·Decisioning·AnomalyDetection·Alerting·Risk churn ML·ModelMonitor·SecurityAudit 해시체인·menu_tree wouldCycle·PM Dependencies DFS·GraphScore·ChannelRegistry·PriceOpt/AdminGrowth/CustomerAI simulate)은 이름만 유사하고 권한 resolution이 아니다. ERRE에 흡수·개명·통합 금지(가짜녹색 회피). 폐기 레거시 `legacy_v338_pkg` Python 재부활 금지.

### D-6. Static Lint로 233개소 하드코딩 authz 수렴
`=== 'admin'`·`role == 'owner'` 233개소를 ERRE Static Lint(§29) 대상으로 등록 — direct permission lookup·bypass resolution engine·hardcoded authz 정적탐지. 점진 수렴(무후퇴).

### D-7. 정직 분리 (실재 과신·부재 과장 양방향 회피)
- **실재 과신 회피**: `effectiveForUser`는 팀 한정 부분 PDP지 통합 kernel 아님. `guardTeamWrite`는 member 읽기전용 강제지 scope-escalation 전반 가드 아님. 이를 "이미 있다"로 오판 금지.
- **부재 과장 회피**: Snapshot/Cache/Graph/SoD grep 0은 실측 부재지 "숨겨진 구현"이 아님. RBAC substrate 테이블은 런타임 생성으로 실재(마이그레이션 밖).
- 이번 세션 P1~P5 보안수정(writeGuard 서버강제·admin SSOT resolveAdminByToken·plan fail-secure)은 ERRE Subject Resolution·Deny Projection의 실 substrate로 재활용(재플래그 금지).

### D-8. 부수 발견 (설계 코드 0 · 수정 아님 · 후속 fix 후보)
- **god-role 산재 위험**: 233개소 하드코딩 authz는 중앙 게이트 미강제 — 향후 role 시맨틱 변경 시 드리프트·우회 리스크. ERRE 도입 전까지 개별 게이트에 의존(현행 안전성은 유지). Static Lint 도입이 실 완화책.
- **api_key roleRank 중복 정의**(`index.php:573` ↔ `AdminMenu.php:74`): 단일소스 아님 — 두 맵이 향후 diverge 가능. ERRE Subject Resolution 통합 시 SSOT화 대상.
- **RBAC substrate 마이그레이션 밖**(`TeamPermissions::ensureSchema` 런타임 CREATE): 스키마 거버넌스(migration 파일) 밖에 존재 — version binding·immutable 이력 부재. ERRE Database Constraint(§33) 도입 시 정합 대상.
- (모두 라이브 실결함이 아닌 **아키텍처 부채**. 즉시 수정 대상 아님. 이전 Part 3-2/3-4 부수발견처럼 별도 판단.)

## 4. Consequences

- **긍정**: 단일 PDP·결정적·설명가능(Explainable)·감사가능(Traceable) authorization. 233개소 산재를 중앙 수렴. deny 우선 전역화로 fail-secure 강화.
- **비용**: 대규모 신규(Registry/Pipeline/Graph/Snapshot/Digest/Cache/Drift/Reval/Reconciliation/Sim/Explain/Guard/Lint). 성능 요구(P95≤20ms·Cache Hit≥95%·lock-free)는 스냅샷+캐시 아키텍처 필수.
- **선행 의존**: Part 1~3-6 인증 후 실 구현(BLOCKED_PREREQUISITE). 본 설계는 명세·거버넌스 계약만.
- **무후퇴**: 기존 게이트(미들웨어 RBAC·guardTeamWrite·requirePlan·effectiveScope)는 ERRE 완성까지 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. 실 엔진은 별도 승인 세션(RP-track)에서 Golden Rule+verify+배포승인 하에 구현.
- 하위 per-entity DSAR(`DSAR_APPROVAL_ERRE_*`)은 본 ADR + Ground-Truth ①② 등장 `파일:라인`만 인용(반날조 허용목록).
- Completion Gate(§37)·Performance Benchmark(§35)·Regression 100%(§36)는 실 구현 세션의 완료 조건.

---
**요약**: ERRE = PARTIAL-substrate(`effectiveForUser` 단일 함수 + 분산 constraint/guard) / ABSENT-governance(Pipeline·Graph·Snapshot·Cache·Drift·Sim·Explain·SoD·Risk 순신규). Extend-only 단일 PDP·deterministic·immutable snapshot·deny>allow 전역·KEEP_SEPARATE·Static Lint 233개소 수렴. 코드 0·NOT_CERTIFIED·선행의존.
