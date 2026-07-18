# DSAR — Simulation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §55 SIMULATION TYPE
`INSTANCE_INITIALIZATION` · `STAGE/LEVEL/STEP_ACTIVATION` · `NEXT_STEP/LEVEL/STAGE_RESOLUTION` · `OPTIONAL_STEP/LEVEL_SKIP` · `AUTO_ACTIVATION` · `PAUSE/RESUME/SUSPENSION` · `ASSIGNMENT_FAILURE` · `AUTHORITY/DELEGATION_INVALIDATION` · `CURSOR_DRIFT` · `DUPLICATE_EVENT` · `CONCURRENT_TRANSITION` · `RECOVERY` · `HISTORICAL_REPLAY` · `CUSTOM`.

### 필드
simulation_id · type · sequential definition version · request/case/workflow/chain version · stage/level/step/cursor/assignment/authority/delegation/dependency state · triggering event · simulated guards/preconditions/transition/next stage/level/step · simulated conflict · simulation hash · status · evidence.

★실 State/Assignment/Cursor/Lock/Event/Notification/Decision 미변경.

## 2. 기존 구현 대조

- **Simulation ABSENT — 전무.** 실 상태를 변경하지 않고 전이·다음 스텝 해석·스킵·충돌을 시험 실행(dry-run)하는 시뮬레이션 엔진은 없다.
- 시뮬레이션이 예측할 대상(Guard·Precondition·Transition·Next Stage/Level/Step·Conflict) 자체가 대부분 ABSENT(§21·§22·§20·§30·§56) 이므로, 모의할 결정 로직이 존재하지 않는다.
- 상태전이 3종은 즉시 커밋형 UPDATE(`Catalog.php:1726`·`AdminGrowth.php:1330`·`Mapping.php:287`)로, "적용하지 않고 결과만 계산" 하는 분리된 평가 경로가 없다. JourneyBuilder 저니(`JourneyBuilder.php:44,68,504`)도 실 발송/상태변경을 수반하며 dry-run 모드가 아니다.

## 3. 판정

- Verdict: **ABSENT** — 시뮬레이션 엔진 없음.
- 선행 의존: 모의 대상인 State Machine·Transition·Guard·Cursor·Assignment/Authority/Delegation 이 전부 ABSENT(§17·§20·§21·§45·§3.3·§3.4) → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. State Machine·Transition Definition(§19)·Guard(§21) 신설 후, **동일 결정 로직을 부작용 없이 실행하는 시뮬레이션 경로** 구현 — Next Step Resolution·Skip·Auto-activation·Concurrent Transition·Cursor Drift·Recovery·Historical Replay 를 모의하고 simulated guards/preconditions/conflict 결과를 반환.
- 설계 제약: 결정 평가기(Guard/Precondition/Resolution)를 **실 커밋과 시뮬레이션이 공유** 하도록 순수 함수형으로 분리 — 두 경로의 로직 분기(drift)를 원천 차단.
- ★무후퇴 필수(원칙 핵심): **시뮬레이션은 실 State/Assignment/Cursor/Lock/Event/Notification/Decision 를 절대 변경하지 않는다.** simulation hash 로 결과 봉인, Evidence(§64)에 PII/자격증명 저장 금지. Mandatory Control(§55). Fail Closed — 부작용 유발 가능성이 있는 시뮬레이션은 실행 거부.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
