# DSAR — Assignment Effect Mapping (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§45 ASSIGNMENT_EFFECT_MAPPING — 액션이 현재 Assignment에 미치는 효과의 열거형:

1. `KEEP_ACTIVE`
2. `MARK_COMPLETED`
3. `RELEASE`
4. `RETURN_TO_QUEUE`
5. `CANCEL`
6. `SUSPEND`
7. `REASSIGN_REFERENCE`
8. `RECREATE_ON_RESUBMIT`
9. `CLOSE_AND_ARCHIVE`
10. `NO_CHANGE`
11. `CUSTOM`

권장 매핑(하드코딩 금지 · versioned 정책):
- APPROVE → `MARK_COMPLETED`
- REJECT → `CLOSE_AND_ARCHIVE`
- RETURN → `RELEASE` / `RETURN_TO_QUEUE`
- REQUEST_CHANGES → `KEEP_ACTIVE` / `SUSPEND`
- CANCEL / WITHDRAW → `CANCEL`
- RESUBMIT → `RECREATE_ON_RESUBMIT`
- DEFER → `KEEP_ACTIVE` / `SUSPEND`

## 2. 기존 구현 대조

§GROUND_TRUTH 근거:

- **Assignment 개념 자체가 ABSENT** — §3.3 Assignment 판정: 결정 대상이 특정 결재자에게 **할당(assign)** 되는 축이 존재하지 않는다. 정적 RBAC(§3.4)만 있고, "이 결정 슬롯은 지금 누구의 것인가"를 표현하는 Assignment 레코드가 없다.
- `orderhub_claims`(`OrderHub.php:93,530`)는 **CS 클레임(주문 클레임) 오탐** — 결재 Assignment가 아니라 고객 주문 클레임 도메인이다. 결정 액션의 Assignment로 전용 금지.
- 따라서 액션이 Assignment에 미치는 효과(§45의 11종) 역시 매핑할 **대상이 없다** — 현행 승인은 in-place status UPDATE(`Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`)일 뿐, 완료된 Assignment를 `MARK_COMPLETED`로 종결하거나 `RELEASE`로 큐에 반환하는 개념이 없다.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**
- **선행 의존**: §3.3 Assignment(부재). Assignment 엔티티가 없으면 그 효과 매핑은 정의 불가 — 전형적 선행 부재 차단. 부차적으로 §3.1 Decision Core(불변 Record) 및 Action Effect(§13)에도 의존.
- **cover: 0**

## 4. 확장/구현 방향 (설계)

- Assignment Effect Mapping은 **Assignment 선행 신설 없이는 착수 불가**(BLOCKED). `orderhub_claims`(`OrderHub.php:93,530`)를 결재 Assignment로 재해석하는 것은 도메인 오염 — **KEEP_SEPARATE**, 전용 금지.
- 선행(Assignment) 신설 후 설계 원칙:
  - **매핑은 데이터** — 액션→효과를 코드 분기로 박지 않고 versioned 정책으로(§45 ★). 현행 하드코딩 상태 UPDATE는 선례가 아니라 이관 대상.
  - **무기한 활성 금지에 대응** — `KEEP_ACTIVE`/`SUSPEND`는 재활성/만료 정책과 함께만 허용(§46 Claim·Lease와 정합).
  - **효과 누락 금지** — APPROVE 후 Assignment를 `MARK_COMPLETED`하지 않으면 좀비 Assignment 발생(§58 "Assignment Effect 누락" Gap).
- 실 구현 = Assignment 선행 신설 후 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
