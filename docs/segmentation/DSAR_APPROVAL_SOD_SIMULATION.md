# DSAR — Runtime SoD Enforcement: 충돌 시뮬레이션 (APPROVAL_SOD_SIMULATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_SIMULATION`(SPEC §2·§30)은 **SoD 통제 변경을 실제 강제하기 전에 그 영향을 사전 분석(what-if)** 하는 엔티티다. SPEC §30은 4종 변경 입력과 4종 영향 산출을 지정한다.

| 시뮬 입력(§30) | 영향 산출(§30) |
|---|---|
| New Conflict Rule | Blocked Operations(차단될 작업 수) |
| New Role | Approval 증가(추가 승인 요구량) |
| Permission 변경 | Runtime Latency(런타임 지연 영향) |
| Workflow 변경 | Risk 감소(위험 감소 효과) |

성능 계약(SPEC §38): Simulation ≤ 3초. API(SPEC §35): Conflict Simulation 엔드포인트 최소 제공.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT) |
|---|---|---|
| SoD 전용 Simulation 스키마·코드경로 | **ABSENT(grep 0)** | GT② §2 "SoD 전용 …Simulation… grep 0" · ADR §2.2 |
| 시뮬 입력이 될 Conflict Rule/Role 조합 정의 | **ABSENT(순신규)** | GT① §1·§3 · GT② §2 |
| Runtime Evaluation(영향 계산 기반) | **ABSENT** | GT② §2 "Runtime SoD Evaluator ABSENT(grep 0)" |
| 정적 역할표(입력 참조·재활용) | PARTIAL | `UserAuth.php:1119-1131`(owner>manager>member 3단 정적표·GT① §C) — New Role 시뮬 입력 참조 substrate |

시뮬레이션은 Rule/Matrix/Runtime Evaluator를 **가상 실행**하는 것인데, 대상 엔진 3종 모두 부재하므로 Simulation은 전면 순신규다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(안)**: `sim_id`·`tenant_id`·`change_kind`(NewRule/NewRole/PermChange/WorkflowChange)·`change_payload`·`impact_blocked_ops`·`impact_approval_delta`·`impact_latency_ms`·`impact_risk_delta`·`created_at`.
- **불변성**: 시뮬은 **읽기 전용 dry-run** — 실 Matrix/Assignment 무변경. SPEC §36 Immutable Conflict Rule 원칙상 시뮬 결과가 실 규칙을 변경하지 않음.
- **성능**: SPEC §38 ≤ 3초. 실 Runtime Evaluation(≤10ms)의 대량 가상 재생.
- **테넌트 격리**: `index.php:614-619`(auth_tenant 서버도출·GT① §E) 스코프 내 시뮬만 — 타 테넌트 Assignment 참조 금지.
- **증거**: 시뮬 실행·결과는 §24 Evidence로 `SecurityAudit.php:14-33`(GT① §F) append 재활용.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Simulation ≠ 비즈니스 simulate**: `RuleEngine.php`·`Decisioning.php`·`PriceOpt.php`의 simulate(GT② B-6)는 마케팅/가격 의사결정 시뮬이지 SoD 충돌 영향분석이 아니다. 개명·흡수 금지.
- **입력 substrate 개명금지**: 재활용하는 역할표(`UserAuth.php:1119-1131`)·RBAC 게이트는 SoD 엔진이 아니라 시뮬 입력원일 뿐(ADR §D-1 Extend).
- **"conflict" 흡수금지**: 409/sync conflict(GT② B-1)를 시뮬 대상 SoD 충돌로 오인 금지.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

**APPROVAL_SOD_SIMULATION = ABSENT(순신규).** SoD 전용 Simulation 스키마·영향분석 코드경로 grep 0(GT② §2). 시뮬 대상인 Conflict Rule/Matrix/Runtime Evaluator 3종 모두 선행 부재 — **선행 의존**: 대상 엔진(ADR §D-1·D-2) 신설 후에만 가상 실행 가능. 재활용: 정적 역할표(입력)·SecurityAudit(증거)·cross-tenant(격리). 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(Part 1~3-9 인증 후 RP-track).
