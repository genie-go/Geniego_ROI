# DSAR — Decision Simulation Foundation (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**SIMULATION_FOUNDATION (§59)** — TYPE(원문 전사):
`SINGLE_COMMAND` / `ACTOR_CHANGE` / `ASSIGNMENT_CHANGE` / `CLAIM_EXPIRATION` / `LEASE_EXPIRATION` / `AUTHORITY_CHANGE` / `DELEGATION_CHANGE` / `STEP_STATE_CHANGE` / `CURSOR_CHANGE` / `AMOUNT_CHANGE` / `CURRENCY_CHANGE` / `LEGAL_ENTITY_CHANGE` / `SECURITY_SUSPENSION` / `SOD_CONFLICT` / `IDEMPOTENCY_REPLAY` / `DUPLICATE_COMMAND` / `CONCURRENT_COMMIT` / `OUTBOX_FAILURE` / `RECOVERY` / `HISTORICAL_REPLAY` / `CUSTOM`.

필드: `simulation_id` · type · command · decision version · actor/assignment/claim/lease/authority/delegation/sequential/cursor state · resource · action · amount · currency · simulated validation/commit result · simulated conflict/outbox · simulation hash · status · evidence.

**★ 절대 원칙 (§59)**: Simulation 은 실 Record/History/Snapshot/Audit/Outbox/Sequential Event 를 **미생성**한다 — 순수 예측 실행이다.

## 2. 기존 구현 대조

- **전면 부재 (ABSENT).** Simulation 은 §GROUND_TRUTH 개념별 판정에서 ABSENT. `simulation_id`·simulated validation/commit result·simulation hash 를 갖는 결정 시뮬레이션 엔티티/경로는 존재하지 않는다.
- **혼동 주의 — `dry_run_diff` 는 Simulation 이 아니다.** `Alerting` 의 `dry_run_diff`(`Alerting.php:564`)는 집행 전 **변경 예상 diff 를 저장·미리보기**하는 산출물이다. §59 가 요구하는, 전체 Validation Pipeline(§25 27단계)을 가상 상태(ACTOR_CHANGE·AUTHORITY_CHANGE·CONCURRENT_COMMIT 등)로 통과시켜 simulated validation/commit result 를 내는 **결정 시뮬레이터가 아니다**. dry_run_diff 는 단일 액션의 미리보기이지, 결정 커밋 경로의 가상 재현이 아니다.
- **가상 실행 프레임 부재**: §59 TYPE 21종(ACTOR_CHANGE·CLAIM_EXPIRATION·SOD_CONFLICT·IDEMPOTENCY_REPLAY·CONCURRENT_COMMIT·HISTORICAL_REPLAY …)이 겨냥하는 시나리오 축은 대응 선행 엔티티(Assignment·Claim·Lease·Authority·Delegation·Idempotency·Lock)가 ABSENT 이므로 시뮬레이션 입력 상태 자체가 없다.

## 3. 판정

- Verdict: **ABSENT** (선행 부재 의존 → 실질 **BLOCKED_PREREQUISITE**)
- 선행 의존: §59 는 Command(§14)·Validation Pipeline(§25)·Commit(§33)·Idempotency(§39)·Lock(§41) 등을 **부작용 없이 가상 실행**한다. 이 실경로들이 ABSENT 이므로 시뮬레이터가 복제·우회할 대상이 없다. 선행 6군 + 결정 코어 신설 이후 성립.
- cover: **0** (`dry_run_diff`(`Alerting.php:564`)는 저장 프리뷰이지 Decision Simulation 커버 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티** — 실존 대응 자산 없음. `dry_run_diff` 를 Simulation 으로 재해석·재사용 금지(미리보기≠부작용 없는 전 경로 가상 실행).
- **재사용 원칙**: Simulation 은 실 Validation Pipeline(§25)·Commit Revalidation(§32) 로직을 **동일 코드로** 태우되, 최종 write(Record/History/Snapshot/Audit/Outbox/Sequential Event)만 차단해야 한다 — 별도 시뮬레이션 로직 복제 금지(로직 이중화 = drift 원천).
- **Mandatory Control — §59 절대 원칙**: Simulation 은 어떤 실 side-effect 도 남기지 않는다. 시뮬레이션이 실 Record 를 만들면 그 순간 Simulation 이 아니라 오염이다.
- **정직판정**: Simulation 은 코어의 **부가 진단 도구**이지 결정 경로가 아니므로 선행 우선순위에서 후순위.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
