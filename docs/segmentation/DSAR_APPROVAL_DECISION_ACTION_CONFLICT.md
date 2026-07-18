# DSAR — Action Conflict (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§50 ACTION_CONFLICT

- **TYPE (enum)**: `INCOMPATIBLE_ACTIONS` / `MULTIPLE_TERMINAL_ACTIONS` / `INVALID_SOURCE_STATE` / `INVALID_TARGET` / `REASON_MISMATCH` / `COMMENT_REQUIREMENT_MISMATCH` / `ATTACHMENT_REQUIREMENT_MISMATCH` / `RETURN_LOOP` / `CHANGE_REQUEST_DUPLICATE` / `CANCEL_AFTER_IRREVERSIBLE_EFFECT` / `WITHDRAW_AFTER_IRREVERSIBLE_EFFECT` / `RESUBMIT_WITH_UNRESOLVED_ITEMS` / `RESUBMIT_VERSION_CONFLICT` / `ASSIGNMENT_EFFECT_CONFLICT` / `CLAIM_EFFECT_CONFLICT` / `SEQUENTIAL_EFFECT_CONFLICT` / `OUTCOME_MAPPING_CONFLICT` / `CUSTOM`.
- **필수 필드**: `conflict_id` · `decision instance id` · `decision slot id` · `action command ids` · `action types` · `target ids` · `conflict type` · `expected policy` · `actual state` · `severity` · `detected_at` · `resolution policy` · `winning action reference` · `resolved_by` · `resolved_at` · `status` · `evidence`.
- 연계 규격: 양립불가 조합(§49 ACTION_COMPATIBILITY)·중복 Terminal(§48 ACTION_PRECEDENCE)이 이 엔티티의 detection 원천.

## 2. 기존 구현 대조

- 코드 기반 판정: 결정↔집행 2단계는 실재하나(Mapping approve→apply `Handlers/Mapping.php:287,327` · Alerting decide→execute `Handlers/Alerting.php:601-655`), **다중 액션 명령을 하나의 Decision Slot에 대해 병렬 수집·비교·중재하는 Conflict 엔티티는 부재**.
- 부분적 방어(단일 액션 순차 방어일 뿐 Conflict 검출 아님):
  - 재처리 차단 = 상태 게이트: `Mapping.php:262`(status≠pending → 409) · `AdminGrowth.php:1327`(status≠pending → 409). 이는 idempotency성 단일 슬롯 방어이지, 두 액션 command 간 `INCOMPATIBLE_ACTIONS`/`MULTIPLE_TERMINAL_ACTIONS` 판별이 아님.
  - Tenant Guard(`index.php:404-420`)는 격리이지 액션 충돌과 무관.
- `conflict_id`·`action command ids`(복수)·`conflict type`·`winning action reference`·`resolution policy` 를 데이터로 선언·기록하는 구조 → **no hits**.
- §49/§48 규격(COMPATIBILITY·PRECEDENCE) 자체가 ABSENT이므로, 그 위반을 탐지·기록하는 §50도 성립 불가.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Decision Core(불변 Record/Slot/Commit 부재 — in-place UPDATE만: `Alerting.php:594` · `AdminGrowth.php:1330` · `Catalog.php:2383`). Slot에 다중 액션 command가 축적되는 모델 자체가 없어 충돌 대상이 존재하지 않음. **BLOCKED_PREREQUISITE**(Decision Core + §48 Precedence + §49 Compatibility).
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_conflict` — §50 18종 TYPE + 필드를 데이터로 선언. 선행 필수: Decision Core(불변 Slot·Record)와 §48/§49(Precedence·Compatibility) 규격이 먼저 존재해야 Conflict가 판별 대상을 가진다.
- 확장 기반(Golden Rule = Extend): 현행 상태 게이트(`Mapping.php:262` · `AdminGrowth.php:1327`)를 **Conflict 검출의 최초 축**(`MULTIPLE_TERMINAL_ACTIONS` 검출점)으로 승격 — 단순 409를 넘어 충돌 유형·winning action·resolution policy를 기록.
- Mandatory Control: `winning action reference` 자동선정 금지(§48 ★단순 순위 자동승자 금지). Lock/Commit Sequence·Expected Version·Policy 검증 후에만 우선순위를 **참고**로 사용, 실제 승자는 Manual Review 경유.
- 실위험: `Alerting::executeAction`(`Alerting.php:631,653`) 집행이 결정 확정과 비원자로 분리 — 충돌 미검출 상태에서 두 집행이 동시 진행되면 `ASSIGNMENT_EFFECT_CONFLICT`/`SEQUENTIAL_EFFECT_CONFLICT`가 사후에만 드러남. Conflict 검출은 집행 이전(Validation 단계)에 Fencing과 함께 배치돼야 함.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
