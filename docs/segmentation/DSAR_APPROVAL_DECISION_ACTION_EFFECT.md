# DSAR — Approval Decision Action Effect (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 ACTION_EFFECT 필수 필드 (원문 전사):
- `effect_id` · `action version id`
- `decision state effect`
- `sequential step effect` · `sequential level effect` · `sequential stage effect` · `sequential instance effect`
- `assignment effect` · `claim effect` · `lease effect` · `work item effect`
- `approval requirement effect` · `approval case effect`
- `workflow effect reference`
- `requester task effect` · `change request effect` · `resubmission effect`
- `notification event reference` · `compensation reference`
- `terminal` · `retryable`
- `effective_from` / `effective_to`
- `status` · `evidence`

의미: Action Effect는 특정 action version이 확정될 때 decision state·sequential·assignment/claim/lease/work item·case·workflow·requester task/change request/resubmission에 미치는 효과를 **선언적 매핑**으로 정의한다. 액션(§8 Definition)과 결과 반영을 1단계 하드코딩이 아니라 versioned mapping으로 분리하는 것이 핵심 규율이다.

## 2. 기존 구현 대조

- **Action → Effect Mapping 계층 부재** — 액션 확정이 선언적 effect 매핑 없이 **직접 status UPDATE**로 처리됨(§3.5·§64 확정).
  - `Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383` = in-place UPDATE 3핸들러. 불변 Record/Slot/Commit·effect 선언 부재.
- 존재하는 것은 "선언적 Mapping"이 아니라 **결정↔집행 2단계**뿐:
  - `Mapping::approve → apply`(`Handlers/Mapping.php:287,327`) — approve로 결정, apply로 반영(선언적 effect 테이블 아님).
  - `Alerting::decideAction → executeAction`(`Handlers/Alerting.php:601-655`) — decide 후 execute. 집행이 `Alerting.php:653`에서 이뤄지나 액션과 비원자·핸들러 로직 하드코딩.
- `decision state effect`는 status 문자열로 융합 · `sequential/assignment/claim/lease/work item effect` → **no hits**(§3.2 Sequential·§3.3 Assignment ABSENT).
- `compensation reference`·`terminal`·`retryable` (보상·재시도 선언) → **no hits**. `notification event reference` → 일부 omni_outbox 재사용 가능하나 effect 결합 부재.
- `effect_id`/`action version id`/`effective_from/to` (버전 결합 effect) → **no hits**(§9 Version ABSENT).

## 3. 판정

- Verdict: **ABSENT** (Effect Mapping 없음 · 직접 status UPDATE)
- 선행 의존: Action Version(§9) ABSENT — effect가 결합할 버전 부재. §3.2 Sequential·§3.3 Assignment ABSENT — sequential/assignment/claim/lease effect 대상 부재. Outcome(§14) ABSENT — effect↔outcome 매핑 부재.
- cover: **0** (선언적 effect 매핑 전무 · 실재는 직접 UPDATE 3핸들러 + 비선언적 2단계 decide/apply·decide/execute).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_action_effect` — action version별 effect를 **선언적 매핑**으로 분리, 직접 status UPDATE(`Alerting.php:594`·`AdminGrowth.php:1330`·`Catalog.php:2383`)를 매핑 조회로 대체(§64 중복 해소, 무후퇴).
- 확장 기반: `Alerting::decideAction/executeAction`(`Alerting.php:601-655`)=CANONICAL 2단계 골격을 effect 집행 엔진으로 승격(decide=Record 확정, execute=effect 적용). `Mapping::approve/apply`(`Mapping.php:287,327`)=VALIDATED_LEGACY apply 단계를 effect 반영에 재사용.
- Mandatory Control(실위험): `Alerting::executeAction`(`Alerting.php:653`) 집행이 액션 확정과 **비원자·무아웃박스**로 분리돼 부분 집행 위험 — Effect 적용을 Transaction Boundary + `compensation reference`(보상 트랜잭션)로 감싸야 함. `terminal`/`retryable`을 선언해 부분 실패 재시도를 안전화.
- `ASSIGNMENT_EFFECT_MAPPING`(§45)·`CLAIM_LEASE_EFFECT_MAPPING`(§46)·`SEQUENTIAL_EFFECT_MAPPING`(§47)은 각 선행축(Assignment/Sequential) 완료 후 effect에 연결 — 그 전까지 `decision state effect`+`case effect`만 우선 선언.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
