# DSAR — Sequential Effect Mapping (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§47 SEQUENTIAL_EFFECT_MAPPING (= APPROVAL_DECISION_ACTION_TRANSITION_MAPPING) — 액션이 순차 결재 흐름에 방출하는 이벤트:

1. `STEP_APPROVED`
2. `STEP_REJECTED`
3. `RETURN_REQUESTED`
4. `CHANGES_REQUESTED`
5. `CANCELLED_REFERENCE`
6. `CASE_WITHDRAWN_REFERENCE`
7. `CASE_RESUBMITTED_REFERENCE`
8. `STEP_ACKNOWLEDGED`
9. `STEP_DEFERRED`
10. `ABSTAINED_REFERENCE`

★ **Cursor 직접변경 금지** — 액션은 이벤트만 방출하고, **Sequential Engine이 검증 후 Transition**을 수행한다. 액션 핸들러가 다음 단계 커서를 직접 밀면 안 된다.

## 2. 기존 구현 대조

§GROUND_TRUTH 근거:

- **Sequential(순차 결재) 축 = ABSENT.** §3.2 Sequential 판정: Return Target 등 선행 부재이며, 순차 진행을 관장하는 **Cursor / Sequential Engine이 없다**. 다단계 결재의 "현재 단계 커서"와 그 전이 엔진이 부재.
- 현행 승인은 **단일 in-place UPDATE**(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`)로, 단계 개념 없이 상태를 바로 최종값으로 바꾼다 — 방출할 이벤트도, 그 이벤트를 소비할 엔진도 없다.
- `Mapping::approve/apply`(`:238-331`, `:287`, `:327`)의 Maker-Checker(approvals_json)는 **정족수 카운트**이지 순차 단계 커서가 아니다 — decide→execute(`Alerting.php:601-655`)도 선언적 Transition Mapping이 아니라 절차적 2단계 호출.
- 따라서 액션→Sequential 이벤트 매핑(§47 10종)은 방출·소비 양쪽 모두 대상이 없다.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE**
- **선행 의존**: §3.2 Sequential(Sequential Cursor / Engine 부재). 커서·엔진 신설 전에는 이벤트 매핑 정의 불가. 부차적으로 §3.1 Decision Core(불변 Record — 이벤트가 참조할 Step/Slot 부재).
- **cover: 0**

## 4. 확장/구현 방향 (설계)

- Sequential Effect Mapping은 **Sequential Cursor/Engine 선행 신설 후에만** 착수. Mapping의 정족수 카운트(`:287`)를 순차 커서로 전용 금지 — 정족수(병렬 합의) ≠ 순차 단계(직렬 전이).
- 선행 신설 후 설계 원칙:
  - ★ **Cursor 직접변경 금지** — 액션은 §47 이벤트만 방출(예: APPROVE→`STEP_APPROVED`). 다음 단계 활성화는 Sequential Engine이 검증(권한·소스 상태·전이 규칙) 후에만. `Catalog::approveQueue`(`:2383-2407`)식 승인 직후 즉시 후속 집행 융합은 재발 금지.
  - **매핑은 versioned 데이터** — 액션↔이벤트 1:1 하드코딩 금지(§47·§14 ★와 동형).
  - **효과 누락 금지** — 이벤트 미방출 시 순차 흐름이 멈춘 채 좀비화(§58 "Sequential Effect 누락" Gap).
- 실 구현 = Sequential Cursor/Engine 선행 신설 후 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
