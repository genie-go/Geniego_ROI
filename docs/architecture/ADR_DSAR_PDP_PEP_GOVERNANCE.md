# ADR — Policy Decision Point (PDP) & Policy Enforcement Point (PEP) Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-12
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0)
- **Ground-Truth**: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-10 · **3-11(RBAC Analytics Dashboard)** · ★3-7(ERRE) 직접 결합

---

## 1. Context

GeniegoROI의 인가는 **중앙 결정론적 PDP 없이** 이원·산재한다: (a) `index.php` 중앙 coarse PEP(roleRank+scope+method·`:572-619`), (b) 핸들러 분산 PEP(`requireTeamWrite`·`guardWarehouse`·`requirePlan`), (c) **하드코딩 authz 61+12개소/14핸들러**(admin 문자열/auth_role 직접비교). `TeamPermissions::effectiveForUser`(`:393-421`)가 RBAC(acl_permission)+ABAC(data_scope)를 통합하는 유일한 proto-PDP지만 **private·전역 요청 경로에 미배선**이다. Policy Registry/Version/Bundle·Decision Cache·Explain·Combining Algorithm은 부재하다.

본 ADR은 **PDP/PEP Governance** — 모든 접근요청을 PIP→PDP→Decision Cache→PEP 로 통과시키는 중앙 Authorization Decision Fabric — 의 거버넌스 기반을 정의한다. XACML/NIST SP 800-162(ABAC)/Zero Trust 참조. Part 3-7 ERRE(Effective Role Resolution)의 산출이 PDP의 핵심 입력이며, 3-9 JIT·3-10 SoD·3-11 Analytics가 PDP 평가·소비 계층으로 결합한다.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **중앙 PEP(coarse·PRESENT)**: `index.php:69`·`:572-619`(RBAC/scope/tenant)·`:78-89`(guardTeamWrite).
- **분산 PEP(PRESENT)**: `requireTeamWrite`(`UserAuth.php:1134`·~11 호출)·`guardWarehouse`(`Wms.php:557`)·`requirePlan`(`:364`·entitlement).
- **proto-PDP(PARTIAL·미배선)**: `effectiveForUser`(`TeamPermissions.php:393-421`)·`effectiveScope`(`:236-265`)·clamp(`:356-373`·`:423-429`).
- **PIP(PRESENT)**: acl_permission/data_scope(`TeamPermissions.php:39-41`·`:152-166`)+세션(`UserAuth.php:256-268`).
- **PEP 강제+Explicit Deny(PRESENT)**: scopeSql(`:286-322`)·`__deny__`(`:234`).
- **Decision Types(PRESENT)**: MFA/Challenge(`UserAuth.php:929-964`)·Read-only(`:1128`).
- **Evidence/PAP(PARTIAL)**: SecurityAudit 체인(`SecurityAudit.php:12-68`)·auth_audit_log(`:4174`)·TeamPermissions CRUD(`:598-692`).

### 2.2 거버넌스 계층 (GT②)
Policy Registry/Version/Package/Bundle·통합 PDP·Decision Pipeline(고정순서)·Decision Cache/Invalidation·Explain·Combining(deny-overrides)·authz Decision Analytics/Drift/Simulation/Reconciliation·Runtime Guard/Static Lint = **grep 0(authz)**.

### 2.3 종합
**판정 = ABSENT-PDP(통합·Registry·Cache·Explain) / 이원분산-PEP / PRESENT-PIP·proto-PDP / PARTIAL-PAP·Evidence.** ★Missing PDP 증거=하드코딩 authz 61+12개소.

## 3. Decision

### D-1. effectiveForUser를 중앙 PDP로 승격한다 (Extend, 대체 아님)
`TeamPermissions::effectiveForUser`(`:393-421`)를 전역 요청 경로에 배선되는 결정론적 중앙 PDP로 승격. Decision Pipeline(§8 12단계 고정순서: Request→Context→Attribute→**Effective Role(ERRE 3-7)**→Scope→Policy→SoD(3-10)→Risk→Compliance→Decision→Audit→Cache)로 구조화. 출력 결정론.

### D-2. 분산 PEP·하드코딩 61+12개소를 PDP 소비로 수렴 (Static Lint)
중앙 PEP(`index.php:69-619`)+분산 PEP(`requireTeamWrite`·`guardWarehouse`)는 유지하되 **PDP 경유로 재배선**(PEP는 PDP 우회 불가·§5). 하드코딩 authz(admin 문자열/auth_role 61+12개소)는 §26 Static Lint(Direct Permission Check)로 탐지·PDP 호출로 수렴. ★라이브 결함 아님·아키텍처 부채·설계만.

### D-3. Policy Registry/Version/Bundle·Decision Cache·Explain 순신규
- Policy Registry/Version/Package/Bundle(§11·§12)·PAP 게시·버전(§7)을 신설 — 현행 코드/DB 암묵정책을 선언적 정책으로 승격. `TeamPermissions.php:598-692` CRUD에 버전/게시 계층 추가.
- Decision Cache(§14·subject/resource/action/context-hash→decision·TTL·invalidation §15) 순신규(현행 매 요청 DB 재계산).
- Decision Explain(§16 Why Permit/Deny) 순신규 — `$violations`(`TeamPermissions.php:656-674`) 패턴 확장.

### D-4. Deny-overrides Combining Algorithm 신설
현행 `__deny__` 센티넬(`TeamPermissions.php:234`·단일 스코프 fail-closed)을 전역 deny-overrides 결합규칙(§10 기본 Deny Overrides)으로 승격. allow/deny 병합 규칙 신설.

### D-5. Decision Evidence는 SecurityAudit 확장
결정증거(§23 Evaluation Chain/Rule Trace/Scope Trace/Assignment Trace)는 SecurityAudit 해시체인(`SecurityAudit.php:12-53`) 재활용·확장. 현행 문자열 detail을 구조화된 rule/scope trace로 확장. Immutable Decision Snapshot(§30)은 해시체인 기반.

### D-6. Part 1~3-11과의 결합 (읽기 입력·무중복)
PDP는 ERRE(3-7 effectiveForUser)·JIT(3-9 grant)·SoD(3-10 conflict)·Dynamic Role·Compliance 산출을 **입력**으로 평가한다(Decision Pipeline §8). 각 엔진 재구현 금지(중복 엔진 금지). 3-11 Analytics가 PDP 결정 통계를 소비.

### D-7. Runtime Guard·테넌트 격리
PDP Bypass/PEP Disable/Cache Poisoning 차단(§25)은 중앙 PEP(`index.php:78-89`)+X-Tenant-Id 격리(`:619`) 재활용 위에 신설.

### D-8. 정직 분리
- **실재 과신 회피**: 중앙 PEP는 coarse(method+scope)이지 리소스/액션 PDP 아님. effectiveForUser는 proto-PDP지만 미배선. PIP는 실존하나 device/geo/계산 risk는 PDP 미소비.
- **부재 과장 회피**: Policy Registry/Cache/Explain/Combining grep 0은 실측 부재(그린필드).
- **오흡수 회피**: Catalog evaluatePolicy·RuleEngine·Decisioning·action_request policy·ModelMonitor drift·PgSettlement recon은 마케팅/ops(GT② §5) — authz policy 아님·흡수 금지.
- **부채≠결함**: 하드코딩 61+12개소는 아키텍처 부채(수렴 대상)이지 라이브 결함 아님(재플래그 금지).

## 4. Consequences

- **긍정**: 중앙 결정론적 인가·PEP 우회 불가·정책 선언/버전/게시·결정 캐시/설명/증거·Zero Trust. Authorization Kernel 완성.
- **비용**: 신규(Policy Registry/Version/Bundle·PDP·Decision Pipeline/Cache/Explain/Combining·Snapshot/Evidence/Digest·authz Analytics/Drift/Simulation·Guard/Lint). effectiveForUser 승격·61+12개소 수렴.
- **선행 의존**: Part 1~3-11 인증 후 실 구현(BLOCKED_PREREQUISITE). ERRE(3-7)가 PDP 핵심 입력.
- **무후퇴**: 중앙/분산 PEP·PIP·scopeSql·Decision Types·SecurityAudit·마케팅 엔진 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조).
- Completion Gate·Performance(P95≤15ms)·Zero Trust Decision Validation(NIST 800-162/XACML)·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: PDP/PEP = ABSENT-PDP(통합·Policy Registry/Version/Bundle·Decision Pipeline/Cache/Explain/Combining·authz Analytics/Drift/Sim·Guard/Lint 순신규) / 이원분산-PEP(중앙 coarse+분산 handler+하드코딩 61+12) / PRESENT(PIP acl_permission/data_scope·proto-PDP effectiveForUser·scopeSql 강제·`__deny__`·Decision Types MFA/Challenge/Read-only) / PARTIAL(PAP CRUD·Evidence SecurityAudit). Extend: effectiveForUser→중앙 PDP 승격·분산 PEP·하드코딩 61+12 수렴(Static Lint)·deny-overrides 신설·SecurityAudit Evidence 확장·PAP 버전화·Part1~3-11 읽기입력(무중복). 코드0·NOT_CERTIFIED·선행의존. **마케팅 policy/decision(Catalog/RuleEngine/Decisioning/action_request/ModelMonitor/PgSettlement) 흡수 금지·하드코딩=부채≠결함.**
