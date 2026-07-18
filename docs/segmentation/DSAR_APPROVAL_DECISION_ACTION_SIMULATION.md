# DSAR — Action Simulation (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§57 ACTION_SIMULATION

- **TYPE (enum)**: `APPROVE` / `REJECT` / `RETURN` / `REQUEST_CHANGES` / `CANCEL` / `WITHDRAW` / `RESUBMIT` / `ACKNOWLEDGE` / `DEFER` / `INVALID_REASON` / `MISSING_COMMENT` / `MISSING_ATTACHMENT` / `INVALID_RETURN_TARGET` / `RETURN_LOOP` / `UNRESOLVED_CHANGE_ITEMS` / `CASE_VERSION_CHANGE` / `AMOUNT_CHANGE` / `CURRENCY_CHANGE` / `LEGAL_ENTITY_CHANGE` / `ASSIGNMENT` / `CLAIM_LEASE` / `SEQUENTIAL_EFFECT` / `CONCURRENT_ACTION` / `CUSTOM`.
- **필드**: `simulation id` · `type` · `action definition version` · `decision instance/slot` · `actor` · `source state` · `proposed action` · `proposed reason` · `proposed comment hash` · `attachment manifest` · `proposed target` · `change request` · `resubmission package` · `simulated eligibility` · `simulated outcome` · `simulated assignment/claim/lease/sequential effect` · `simulated conflicts` · `simulation hash` · `status` · `evidence`.
- ★ **실 Record / Comment / Attachment / Change Request / Effect / Event 미생성** (부작용 없는 예측만).

## 2. 기존 구현 대조

- 코드 기반 판정 **PARTIAL** — "집행 전 영향 미리보기" 개념이 한 도메인에 실재하나(도메인 특화), §57가 규정하는 **범용 Action Simulation**(액션 타입별 eligibility/outcome/effect/conflict 예측)은 부재.
- 실존(도메인 특화 미리보기):
  - `Mapping::impactPreview`(`Handlers/Mapping.php:333`) — 재캐노니컬라이즈 apply 이전에 영향 행수를 테넌트 스코프로 카운트(`normalized_activity_event` 기준 추정, `:346-354`). 실 Record를 생성하지 않는 부작용 없는 예측 = §57 취지와 정합하는 유일 substrate.
- 부재/미구현:
  - `APPROVE`/`REJECT`/`RETURN`/`CANCEL`/`WITHDRAW`/`RESUBMIT`/... 액션 타입별 시뮬레이션 → **no hits**. `impactPreview`는 매핑 재작성 영향(행수)에 특화됐을 뿐 결정-액션 eligibility/outcome/effect 예측이 아님.
  - `INVALID_REASON`/`MISSING_COMMENT`/`MISSING_ATTACHMENT`/`INVALID_RETURN_TARGET`/`RETURN_LOOP`/`UNRESOLVED_CHANGE_ITEMS`/`CONCURRENT_ACTION` 등 **실패 시나리오 시뮬레이션** → 부재(해당 검증 규격 §12·§39·§43·§20·§21·§24 자체가 ABSENT).
  - `simulated eligibility/outcome/assignment/claim/lease/sequential effect/conflicts` 예측 산출·`simulation hash` → 부재. `simulation type`으로 실 Record와 분리 저장하는 구조 없음.

## 3. 판정

- Verdict: **PARTIAL** (도메인 특화 impact preview 1종 실재 · 범용 Action Simulation 부재)
- 선행 의존: §57 시뮬레이션 산출물(`simulated eligibility`·`outcome`·`effect`·`conflict`)은 §12 Eligibility·§13 Effect·§14 Outcome·§50 Conflict의 **실 판정 로직을 부작용 없이 재실행**함을 전제 — 전부 ABSENT. 시뮬레이션할 대상 규격이 없음.
- cover: **impactPreview 1개소**(`Mapping.php:333`, 매핑 재작성 영향 행수 한정) · **결정-액션 시뮬레이션 = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): `Mapping::impactPreview`(`Mapping.php:333`)의 "부작용 없는 예측" 패턴을 **일반 원리로 승격** — 단, 그 자체는 매핑 도메인 특화라 결정-액션 시뮬레이션 엔진으로 직접 재사용 불가. 신규 `approval_decision_action_simulation`은 Eligibility(§12)·Effect(§13)·Outcome(§14) 판정 함수를 **read-only 모드로 재호출**하는 형태로 설계(로직 중복 금지).
- Mandatory Control(§57 ★): 시뮬레이션은 실 Record/Comment/Attachment/Change Request/Effect/Event를 **절대 생성 금지**. `impactPreview`가 이미 이 원칙을 지킴(카운트만, `Mapping.php:353-354`) — 확장 시에도 저장소를 실 Record와 물리 분리(§52 SIMULATION snapshot type).
- 실패 시나리오 커버리지: `INVALID_REASON`/`MISSING_COMMENT`/`RETURN_LOOP`/`CONCURRENT_ACTION` 등은 사용자에게 "이 액션이 왜 막히는지" 사전 고지 목적 — 해당 검증 규격(§12·§20·§21·§50) 구현 후에만 시뮬레이션 가능하므로 이 축은 **BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
