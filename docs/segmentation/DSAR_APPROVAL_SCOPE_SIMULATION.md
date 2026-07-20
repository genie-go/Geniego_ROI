# DSAR — Approval Scope Simulation (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Simulation · 스펙 §31)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · **Simulation은 실제 Scope/Assignment/Cache를 절대 변경하지 않는다** · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §31 Scope Simulation은 Add Scope · Remove Scope · Merge Scope · Split Scope를 **실제 반영 전에 what-if로 미리 계산**해 영향 분석을 제공하는 절차다. ground-truth §9는 "scope 거버넌스 계층(Version/Projection 영속/Drift/Snapshot/Registry/Simulation/Evidence) grep 0 전항목"으로 판정했으므로 Simulation은 **완전 ABSENT**다. `replaceScope`(`TeamPermissions.php:337-346`)는 DELETE→INSERT 방식의 즉시·전량 교체(이력 소실)이며, 이는 what-if 미리보기가 아니라 실제 반영 그 자체다 — Simulation과 혼동하지 않는다.

## 2. Canonical 필드

스펙 §31은 시뮬레이션 유형만 정의(필드 섹션 없음). 설계 제안: Simulation ID · Target Scope Definition Reference · Baseline Scope Version · Simulation Type(§3 열거값) · Simulated Change Payload · Current Effective Scope Projection / Simulated Effective Scope Projection · Impact Summary · Status.

## 3. 열거형 / 타입

스펙 §31 원문 — **Simulation Type**: Add Scope · Remove Scope · Merge Scope · Split Scope. 산출: 영향 분석(Impact Analysis).

## 4. 실 substrate 매핑 (ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Simulation 대상(Scope Registry/Version) | — | — | **ABSENT** — Canonical Scope Registry/Version 자체가 순신규(ADR §3) → 시뮬레이션할 실체 없음 |
| 실제 변경 경로(Simulation과 대비되는 즉시반영) | `replaceScope`(DELETE→INSERT 전량교체) | `TeamPermissions.php:337-346` | **PRESENT(즉시반영)이나 Simulation 아님** — what-if 미리보기 없이 즉시 실반영. 이력 소실(EXISTING_IMPLEMENTATION §1) |
| Effective Scope 계산(영향 분석의 재료가 될 수 있는 근접) | `effectiveScope`(라이브 재계산) | `TeamPermissions.php:236-265` | **PARTIAL(근접)** — 실제 적용 계산이지 가상 변경 미리보기가 아님(§27 Effective Scope Engine 판정과 동일 경계) |
| Impact Summary(SoD/Risk/Downstream 영향) | — | — | **ABSENT** — SoD/Risk 개념 자체가 06-A 계열에서 순신규(Part 3-3 ground-truth 동형 판정) |

## 5. 설계 원칙

- Simulation은 어떤 경우에도 **실제 Scope/Assignment/Cache를 변경하지 않는다**(스펙 §31 명문·Part 3-3 Simulation과 동형 규율). 산출은 읽기전용 Result로만 저장한다.
- `effectiveScope`(`TeamPermissions.php:236-265`) 계산 로직은 "권한이 실제로 어떻게 적용되는지"의 참조 알고리즘으로만 재사용하고, what-if 가상 변경 계산기로 오흡수하지 않는다 — 라이브 재계산이지 시뮬레이션이 아니라는 EXISTING_IMPLEMENTATION §9 판정과 동일 경계를 유지한다.
- `replaceScope`의 즉시반영·이력소실 방식(`TeamPermissions.php:337-346`)을 Simulation 설계의 반면교사로 삼는다 — Simulation 구현 시 Version 엔티티(§6)와 결합해 "미리보기 후 명시적 승인 시에만 반영" 흐름을 확보해야 하며, 현행 즉시반영 패턴을 Simulation의 실행 경로로 재사용하지 않는다.
- 영향 분석(Impact Summary)은 Add/Remove/Merge/Split 4종 각각에 대해 Effective Scope 변화·영향받는 Assignment 참조를 산출하되, 자동 적용(auto-apply)하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **Gap**: Simulation 대상 Scope Registry/Version 자체가 ABSENT. Impact Summary(SoD/Risk)도 대상 개념 자체가 ABSENT.
- **BLOCKED_PREREQUISITE(RP-002)**: Simulation은 Canonical Scope Registry/Version(본 Part 본체)·Role Assignment(Part 3-3)가 먼저 실구현되어야 "무엇을 시뮬레이션할지"가 성립함.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
