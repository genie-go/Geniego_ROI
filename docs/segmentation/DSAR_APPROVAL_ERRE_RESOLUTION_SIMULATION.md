# DSAR — ERRE Resolution Simulation (EPIC 06-A-03-02-03-04 Part 3-7)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md) §26 · 목표 §1-22
> **상위 ADR**: [`ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: Simulation=완전 dry-run(실 DB/Runtime 부작용 0) · **반날조**: 모든 `파일:라인`은 상위 SPEC·ADR·Ground-Truth ①② 등장분만 인용, 그 외는 `ABSENT` 명시 · KEEP_SEPARATE(마케팅 simulate) 오흡수 금지 · 289차 확정분(P1~P5) 재플래그 금지

---

## 1. 목적

**Resolution Simulation**(SPEC §26)은 ERRE의 what-if 축이다. Role/Scope/Policy/Runtime의 가상 변경을 **실제 적용 전에** dry-run으로 평가하여 그 영향을 정량 산출한다. SPEC §26 원문이 정의하는 시뮬레이션 입력·출력은 다음과 같다.

- **가상 변경 입력**: Add Role · Remove Role · Add Scope · Remove Scope · Policy Change · Runtime Change (6종)
- **영향 분석 출력(diff)**: Permission Diff · Scope Diff · Risk Diff · Conflict Diff (4종)

즉 "이 사용자에게 manager role을 추가하면 어떤 permission이 늘고, 어떤 scope가 넓어지고, risk가 어떻게 바뀌며, 어떤 SoD conflict가 발생하는가"를 **실 권한 상태를 건드리지 않고** 미리 계산하는 것이 목적이다. 이는 접근 부여 전 사전 심사(pre-grant review)·최소권한 검증·감사 대응의 핵심 도구다.

본 편의 절대 원칙은 **실 상태 무변경**이다. Simulation은 `acl_permission`/`data_scope`/plan/api_key 등 실 substrate에 어떤 write도 발생시켜서는 안 되며, 실 resolution 경로와 물리적으로 분리된 격리 경로로 설계된다.

## 2. Ground-Truth (substrate / ABSENT / KEEP_SEPARATE)

### 2.1 판정 요약 — **ABSENT (순신규 그린필드)**

권한 what-if·resolution simulation 경로는 백엔드 실코드 **grep 0**이다(Ground-Truth ② §2 표 #6 "Simulation/Explain(XAI) = ABSENT"). 현행 권한 계산은 **매 요청 즉시 실행형**(`TeamPermissions.php:393` `effectiveForUser`가 if/switch로 직접 산출·반환)이며, 변경을 적용하지 않고 영향만 미리 계산하는 dry-run 모드는 존재하지 않는다.

### 2.2 실 substrate 부재 대조표

| SPEC §26 Simulation 입력/출력 | 최근접 실 substrate | 판정 | 근거 |
|---|---|---|---|
| Add Role dry-run | 실 role 부여 경로(`putMemberPermissions` `TeamPermissions.php:641`)는 즉시 영속(DELETE→INSERT) | **ABSENT**(실행형만) | Ground-Truth ① §2-A |
| Remove Role dry-run | `reclampTeamMembers`(`TeamPermissions.php:809`)=축소 시 즉시 재클램프 영속 | **ABSENT** | Ground-Truth ① §2-A |
| Add/Remove Scope dry-run | `replaceScope`(`TeamPermissions.php:337`)=data_scope DELETE→INSERT 즉시 영속 | **ABSENT** | Ground-Truth ① §2-A |
| Policy Change dry-run | plan/policy 변경 사전 시뮬레이션 경로 | **ABSENT**(grep 0) | Ground-Truth ② §2 #6 |
| Runtime Change dry-run | Runtime Context 개념 자체 부재 | **ABSENT**(grep 0) | Ground-Truth ② §2 #6 |
| Permission Diff | effective 결과 diff 계산기 | **ABSENT** | Ground-Truth ② §2 #6 |
| Scope Diff | scope 변화량 계산기 | **ABSENT** | Ground-Truth ② §2 #6 |
| Risk Diff | Effective Risk Calculator 자체 ABSENT(§2 #7) | **ABSENT** | Ground-Truth ② §2 #7 |
| Conflict Diff | Conflict Detection/SoD 자체 ABSENT(§2 #9) | **ABSENT** | Ground-Truth ② §2 #9 |

### 2.3 KEEP_SEPARATE — 이름만 유사한 "simulate" (오흡수 금지·가짜녹색 회피)

Ground-Truth ② §4가 확정한 대로, 다음 `simulate` 계열은 **권한 resolution simulation이 아니다.** 절대 ERRE Simulation substrate로 인용하지 않는다.

- `PriceOpt::simulate` — 가격 최적화 시뮬레이션(커머스). **권한 아님.**
- `AdminGrowth.php:1239`(campaign simulate) — 마케팅 캠페인 시뮬레이션. **권한 아님.**
- `CustomerAI`(mode:simulated) — CRM AI 시뮬레이션 모드. **권한 아님.**

이 셋은 마케팅/커머스/CRM 도메인의 예측 시뮬레이션으로, 입력이 role/scope/policy가 아니라 가격·캠페인·고객 행동이다. ERRE Simulation은 이들을 재사용·개명·통합하지 않는다(ADR D-5).

## 3. Canonical 설계

### 3.1 Canonical Entity — `APPROVAL_ROLE_RESOLUTION_SIMULATION`(SPEC §2)

전량 신규(실값 아님). 핵심 필드:

| # | 필드 | 의미 |
|---|---|---|
| 1 | simulation_id | 시뮬레이션 식별자 |
| 2 | tenant | 테넌트 격리 스코프 |
| 3 | subject_ref | 대상 Subject(사용자/api_key/service) 참조 |
| 4 | base_snapshot_ref | 비교 기준선(현행 effective snapshot) 참조 |
| 5 | proposed_change | 가상 변경 payload(§26 6종 중) |
| 6 | change_type | add_role/remove_role/add_scope/remove_scope/policy_change/runtime_change |
| 7 | simulated_at | 시뮬레이션 실행 시각 |
| 8 | permission_diff | Permission 증감 diff |
| 9 | scope_diff | Scope 증감 diff |
| 10 | risk_diff | Risk 등급 변화 diff |
| 11 | conflict_diff | 신규/해소 SoD·conflict diff |
| 12 | actual_state_unchanged_flag | 무변경 검증 플래그(실 write 0 보증) |

### 3.2 열거형

- **change_type**(SPEC §26): `ADD_ROLE` · `REMOVE_ROLE` · `ADD_SCOPE` · `REMOVE_SCOPE` · `POLICY_CHANGE` · `RUNTIME_CHANGE`
- **diff 종류**(SPEC §26): `PERMISSION_DIFF` · `SCOPE_DIFF` · `RISK_DIFF` · `CONFLICT_DIFF`

### 3.3 동작 계약

1. **완전 격리(dry-run)**: Simulation은 실 Resolution Pipeline(SPEC §4)을 **read-only 복제 컨텍스트**에서 실행한다. base snapshot을 로드하고 proposed_change를 in-memory로만 오버레이한 뒤 Pipeline을 재실행해 effective 결과를 산출, base와 diff한다. `acl_permission`/`data_scope`/plan/api_key/snapshot 어떤 테이블에도 write 금지.
2. **결정적**: 동일 base_snapshot + 동일 proposed_change → 동일 diff 100%(SPEC §35 Deterministic Result). Simulation은 실 Resolution Executor(SPEC §16 stateless·deterministic)를 그대로 재사용해야 하므로 실 엔진과 동일 로직 경로를 타되 부작용만 차단한다.
3. **실행은 별도 승인 경유**: Simulation 결과 승인 후에만 실 변경(Assignment write·Revalidation)으로 연결. Simulation 자체는 실행을 유발하지 않는다.

## 4. Kernel 매핑 (Resolution Pipeline 상 위치)

Simulation은 SPEC §4 Pipeline을 **가상 입력으로 재실행**하는 메타 경로다. 각 diff는 아래 Calculator를 dry-run으로 호출한 결과다.

| diff 출력 | 재실행 대상 Kernel 단계 | 실 substrate(승격 대상) | 판정 |
|---|---|---|---|
| Permission Diff | Effective Permission Calculator(SPEC §8) | `effectiveForUser`(`TeamPermissions.php:393`)·`clampActions`(`:423`)·`normActions`(`:182`) | 승격 후 dry-run 호출 |
| Scope Diff | Effective Scope Calculator(SPEC §9) | `effectiveScope`(`TeamPermissions.php:236`)·`scopeWithinCap`(`:356`) | 승격 후 dry-run 호출 |
| Risk Diff | Effective Risk Calculator(SPEC §12) | **ABSENT**(§2 #7 grep 0) | 순신규 |
| Conflict Diff | Conflict Detection/SoD(SPEC §14) | **ABSENT**(§2 #9 grep 0) | 순신규 |

즉 Permission/Scope Diff는 실존 substrate를 격리 재호출하면 성립 가능하나, Risk/Conflict Diff는 대상 Calculator 자체가 부재하므로 순신규 엔진 완성 후에만 산출 가능하다.

## 5. 무후퇴 · Extend

- **Golden Rule(Extend, ADR D-1)**: Simulation은 `effectiveForUser`/`effectiveScope`/`clampActions`를 **파괴하지 않고** dry-run 컨텍스트에서 재사용한다. 실 즉시-실행형 write 경로(`putMemberPermissions` `:641`·`replaceScope` `:337`·`reclampTeamMembers` `:809`)와 물리적으로 분리된 격리 경로로 추가된다.
- **무후퇴**: 현행 권한 부여 UX·게이트는 Simulation 도입과 무관하게 그대로 유지. Simulation은 부여 전 선택적 사전심사 레이어일 뿐 기존 경로를 대체하지 않는다.
- **부작용 0 보증**: `actual_state_unchanged_flag`로 실 write 0을 계약 수준에서 강제. Simulation 경로에서 실 DB write가 1건이라도 발생하면 완료게이트 실패로 판정.
- **KEEP_SEPARATE 유지**: PriceOpt/AdminGrowth/CustomerAI simulate는 각 도메인에 그대로 존치, ERRE로 통합 금지.

## 6. 완료 게이트

- [ ] `APPROVAL_ROLE_RESOLUTION_SIMULATION` Canonical Entity·열거형 실 구현
- [ ] dry-run 격리 컨텍스트(실 write 0) 구현 및 부작용 0 회귀 검증
- [ ] Permission/Scope Diff = 실존 Calculator 승격 후 격리 재호출 산출
- [ ] Risk/Conflict Diff = 선행 Effective Risk Calculator(§12)·Conflict Detection(§14) 실 구현 이후 산출
- [ ] `actual_state_unchanged_flag` 무변경 계약 강제·회귀 테스트 100%
- [ ] SPEC §32 API `Run Simulation`·`Compare Snapshots` 배선
- [ ] **BLOCKED_PREREQUISITE 해소**: 선행 foundation(Part 1~3-6) 인증 + Resolution Pipeline/Snapshot(별편) 실구현 후 별도 승인세션(RP-track)
- [ ] 본 편 코드/DB 변경 **0** 유지 · NOT_CERTIFIED

## 7. 반날조 인용 출처

- SPEC §26(Simulation)·§2(Canonical Entity)·§4(Pipeline)·§8~§9(Calculator)·§12(Risk)·§14(Conflict)·§32(API)·§35(Deterministic)
- ADR D-1(Extend)·D-5(KEEP_SEPARATE)
- Ground-Truth ① §2-A(`TeamPermissions.php:182`·`:236`·`:337`·`:356`·`:393`·`:423`·`:641`·`:809`)
- Ground-Truth ② §2 표 #6(Simulation/Explain ABSENT)·#7(Risk ABSENT)·#9(SoD ABSENT)·§4(PriceOpt/AdminGrowth `:1239`/CustomerAI simulate = KEEP_SEPARATE)
- 그 외 모든 축은 **ABSENT**(grep 0) 정직 유지 — 근접 substrate로 오분류·날조 금지.
