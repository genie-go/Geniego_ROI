# DSAR — Approval Decision Action Transition Mapping (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§47 SEQUENTIAL_EFFECT_MAPPING = `APPROVAL_DECISION_ACTION_TRANSITION_MAPPING`.

Event (원문 전사):
`STEP_APPROVED` / `STEP_REJECTED` / `RETURN_REQUESTED` / `CHANGES_REQUESTED` / `CANCELLED_REFERENCE` / `CASE_WITHDRAWN` / `CASE_RESUBMITTED_REFERENCE` / `STEP_ACKNOWLEDGED` / `STEP_DEFERRED` / `STEP_ABSTAINED_REFERENCE`.

★ 제약: **Cursor 직접변경 금지** — Sequential Engine이 Event를 받아 검증 후에만 Transition을 수행한다. Action Effect(§13)는 Sequential 좌표를 직접 쓰지 않고 이 Mapping을 통해 이벤트만 발행한다.

## 2. 기존 구현 대조

- Action → (검증) → Sequential Transition 을 매개하는 선언적 매핑 → **no hits**.
- 실존 집행은 **결정과 동시에 자기 상태를 직접 UPDATE**(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`) — 발행할 이벤트도, 그 이벤트를 소비할 엔진도 없다.
- 매핑의 소비자인 Sequential(§3.2) = **ABSENT**(`sequential_*/approval_stage/step` 0). 진행시킬 Step/Level/Stage Cursor 자체가 없어 "Transition"이 정의 불가능.
- 이벤트 발행 인프라(§29 Outbox 계열)도 결정 도메인에는 부재 — `Alerting::executeAction`(`Alerting.php:601-655`)의 집행은 비원자·무아웃박스로 결정과 분리.

## 3. 판정

- Verdict: **ABSENT** · **BLOCKED_PREREQUISITE**
- 선행 의존: §3.2 Sequential(Step/Level/Stage Cursor·Transition 엔진) 부재가 결정적 차단. Mapping은 상위 좌표가 존재해야만 의미를 가진다.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_transition_mapping` — 10종 Event를 Sequential 좌표 이동으로 사상하는 **버전드 선언 테이블**. Action Effect(§13)는 이 매핑을 통해 이벤트만 발행하고 Cursor는 절대 직접 쓰지 않는다(§58 Sequential Effect 누락·Cursor 직접변경 방지).
- 착수 순서 강제: Sequential Engine(§3.2 신설) → Action Target Resolution(§20) → 본 Mapping. 선행 없이 Mapping만 만들면 이벤트가 소비되지 않는 죽은 계층이 된다 → **선행 신설 세션 종속**.
- Mandatory Control: Sequential Engine은 이벤트 수신 시 (a) 유효 source 상태 (b) 동일 Case 계보 (c) Return Loop/Max(§21) 를 재검증한 뒤에만 Transition. 이벤트≠자동전이.
- 무후퇴: 기존 단일 도메인 승인(`AdminGrowth::approvalDecide` `AdminGrowth.php:1289-1344` 등)은 단일 Step 특수사례로 흡수 — 다단계 도입 시에도 기존 이력 파괴 금지.
- 실위험: 현행 `Alerting` decide(`Alerting.php:601`)→execute(`Alerting.php:655`) 비원자 분리를 다단계로 확장하면 부분 전이 위험 증폭 — Transition은 Commit Boundary 안에서 원자적으로.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
