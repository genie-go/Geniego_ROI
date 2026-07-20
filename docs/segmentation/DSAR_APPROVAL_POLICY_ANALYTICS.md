# DSAR — PDP/PEP Governance: 결정 분석·설명 (APPROVAL_POLICY_ANALYTICS)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_POLICY_ANALYTICS는 **PDP 결정의 집계 지표(§17)와 개별 결정 설명(§16 Decision Explain)** 을 담당하는 엔티티다.

| 영역 | SPEC 근거 | 구성 |
|---|---|---|
| Decision Analytics 지표 | §17 | Permit·Deny·Challenge·Average Latency·Cache Hit·Policy Coverage·Policy Execution Count |
| Decision Explain | §16 | Why Permit·Why Deny·Which Policy·Which Rule·Which Scope·Which Assignment·Which Deny·Which Risk |

Analytics는 §29 API(Query Analytics·Explain Decision)로 노출되며, Explain은 §23 Evidence(Rule/Scope/Assignment/Risk Trace)를 원자료로 삼는다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz Decision Analytics(Permit/Deny/Challenge/Latency/Cache Hit/Coverage) | **ABSENT** | authz 결정 통계·집계 전무. 마케팅 analytics는 KEEP_SEPARATE (GT① §3, GT② §2·§5) |
| Cache Hit 지표 | **ABSENT** | Runtime Decision Cache 자체 부재(매 호출 DB 재계산 `TeamPermissions.php:202-225`) → Cache Hit 산출 불가 (GT② §2) |
| Policy Coverage/Execution Count | **ABSENT** | Policy Registry/Version grep 0 → 정책 커버리지·실행횟수 측정대상 없음 (GT② §2) |
| Decision Explain(Why Permit/Deny) | **ABSENT** | 런타임 결정 설명 생성기 부재 (GT② §2 Decision Explain ABSENT) |
| Explain 근접물($violations) | **PARTIAL** | `$violations`(`TeamPermissions.php:656-674`)는 위임(DELEGATION_EXCEEDED) 위반 나열만 — 결정 설명 아님 (GT① §G, GT② §2) |
| Explain 원자료(Evidence) | **PARTIAL** | SecurityAudit(`SecurityAudit.php:12-68`)·auth_audit_log(`UserAuth.php:4174`) 문자열 detail — rule/scope trace 미기록 (GT① §G) |
| Decision Types(설명 대상) | **PARTIAL** | MFA/Challenge(`UserAuth.php:929-964`)·Read-only(`:1128`) 실집행이나 설명 미생성 (GT① §F) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **Analytics 지표 7종**(§17): Permit/Deny/Challenge 카운트·Average Latency·Cache Hit·Policy Coverage·Policy Execution Count. 전부 순신규 — 중앙 PDP(effectiveForUser `TeamPermissions.php:393-421` 승격)가 결정을 발행해야 집계원이 생김(ADR D-1·D-6).
- **Decision Explain 8문항**(§16): Which Policy/Rule/Scope/Assignment/Deny/Risk를 §23 Evidence trace에서 재구성. 현행 `$violations`(`TeamPermissions.php:656-674`) 패턴을 확장(ADR D-3).
- **성능**: §32 Explain Generation ≤ 100ms(실 구현 세션 조건).
- **3-11 결합**: Part 3-11 RBAC Analytics Dashboard가 PDP 결정 통계를 **소비**(ADR D-6·§55 무중복). Analytics는 PDP 결정 발행의 하류 소비자 — 재구현 금지.
- **테넌트 격리**: §30 Tenant Isolation — 지표·설명은 `X-Tenant-Id`(`index.php:619`) 경계 내 집계.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

★저장소의 analytics/drift/simulate/reconcil 신호는 거의 전부 마케팅·ops·finance이며 authz PDP와 코드·데이터 공유 없음(GT② §5).
- 마케팅 결정/추천: `Decisioning.php:12`·`:36`(ingestAdInsights)·`:432`(recommendations)·`RuleEngine.php:24`·`Catalog.php:1104`(evaluatePolicy) — authz Analytics 아님(GT② §C-1).
- 비-authz drift/sim/recon: `ModelMonitor.php:220-335`(ML 드리프트)·`PriceOpt.php:927`·`AdminGrowth.php:1239`(simulate)·`Connectors.php:902`(ROAS recon) — authz Decision Analytics/Drift/Simulation 아님(GT② §C-3).
- entitlement: `PlanPolicy` RANK·requirePlan(`UserAuth.php:364`) 상용 구매등급 게이트(authz와 직교·GT② §C-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT**. authz Decision Analytics 7지표·Decision Explain 전부 순신규. Explain 근접물 `$violations`(`TeamPermissions.php:656-674`)는 위임위반 나열에 국한이고, Cache Hit/Coverage/Execution Count는 Decision Cache·Policy Registry 부재로 **측정대상 자체가 없음**.
- **재활용(제한적)**: Explain 원자료는 SecurityAudit Evidence(`SecurityAudit.php:12-68`)·`auth_audit_log`(`UserAuth.php:4174`)·`$violations`(`TeamPermissions.php:656-674`) 확장.
- **선행 의존**: 중앙 PDP 승격+Decision Cache(§14)+Policy Registry(§11)+Evidence 구조화(§23)가 모두 선행 — **BLOCKED_PREREQUISITE**. Part 3-11 Analytics Dashboard가 소비 계층. 코드 변경 0·NOT_CERTIFIED.
