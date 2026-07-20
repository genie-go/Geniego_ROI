# DSAR — PDP/PEP Governance: 인가 정책 시뮬레이션 (APPROVAL_POLICY_SIMULATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_SIMULATION`(SPEC §2)은 인가 정책·규칙·컨텍스트·스코프의 **변경을 실제 집행 전에 가상 평가하여 영향을 분석**하는 엔티티다. SPEC §21(Simulation)은 시뮬레이션 대상과 영향 지표를 규정한다.

| 시뮬레이션 대상(SPEC §21) | 영향 분석 지표(SPEC §21) |
|---|---|
| New Policy | Permit 변화 |
| New Rule | Deny 변화 |
| New Context | Latency |
| New Scope | Cache |

- SPEC §29 API의 `Simulate Policy`가 진입점. 실 결정을 변경하지 않는 **dry-run**(PEP 미집행).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 요소 | 판정 | 근거 |
|---|---|---|
| authz Policy Simulation 엔진 | **ABSENT(grep 0)** | GT② §2 "authz 결정 통계·드리프트·시뮬 전무" · GT② §1 authz 매치 0건 |
| 시뮬레이션 입력(정책 결정 함수) | **PARTIAL(proto)** | `effectiveForUser`(`TeamPermissions.php:393-421`)가 결정 근접이나 private·미배선(GT① §C). dry-run 경로 부재 |
| 영향 대상 결정 집합(scope 강제) | **PRESENT** | `scopeSql`/`scopeSqlNamed`(`TeamPermissions.php:286-322`) — Permit/Deny 변화 관측대상 |
| Latency/Cache 지표원 | **ABSENT** | Decision Cache 부재(GT② §2 `TeamPermissions.php:202-225` 매 호출 DB 재계산) → Cache 영향 산출 불가 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: 후보 변경(`sim_target`∈{POLICY, RULE, CONTEXT, SCOPE}·SPEC §21) + 기준 정책 버전 + 대표 Request 표본.
- **출력(영향 리포트)**: `permit_delta`·`deny_delta`·`latency_est`·`cache_impact`(SPEC §21). PEP 미집행(dry-run) — 실 Target Resource 접근 없음.
- **상태**: `DRAFTED` → `SIMULATED` → `PROMOTED`(승인 시 PAP 게시·SPEC §7) 또는 `DISCARDED`.
- **제약**: 테넌트 격리 절대(SPEC §30·`index.php:619`). 시뮬레이션은 격리된 평가 컨텍스트에서만 수행·운영 결정/캐시 오염 금지(SPEC §25 Runtime Guard `Cache Poisoning` 방지). 결정론 보장(SPEC §4 출력 Deterministic).
- **선행 의존**: 시뮬레이션은 중앙 PDP(effectiveForUser 승격·ADR §D-1) dry-run 능력 + Policy Version baseline이 선행. ★SPEC §21은 New Policy/Rule/Context/Scope 영향분석이므로 **선행 PDP 의존**(중앙 결정함수 없이는 delta 산출 불가).

## 4. KEEP_SEPARATE (마케팅 policy/drift/simulate/recon 흡수금지)

★동음이의 엄격 분리(GT② §5 C-3). 본 엔티티의 simulation은 **authz 정책 영향분석**이며 다음과 무관:

- **PriceOpt.php:927** · **AdminGrowth.php:1239** = 마케팅 시뮬레이션(가격/성장). authz Policy Simulation 아님. 흡수·개명 금지.
- Catalog `evaluatePolicy`(`Catalog.php:1104`)·RuleEngine(`RuleEngine.php:24`)·Decisioning(`Decisioning.php:36` ingestAdInsights·`:432` recommendations) = 마케팅 규칙/의사결정(GT② §5 C-1). authz policy 아님.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. authz Policy Simulation 엔진 grep 0(GT②·ADR §2.2).
- **재활용(흡수 아님)**: 결정함수는 신설 중앙 PDP(effectiveForUser 승격·ADR §D-1), 영향관측은 `scopeSql`(`:286-322`).
- **선행의존(BLOCKED_PREREQUISITE)**: Policy Registry/Version + 중앙 PDP dry-run이 선행. Latency/Cache 지표는 Decision Cache(순신규·ADR §D-3) 후 성립. 코드 변경 0 · NOT_CERTIFIED. 하드코딩 authz 61+12개소(GT② §4)는 부채≠결함(ADR §D-8).
