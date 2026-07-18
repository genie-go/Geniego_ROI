# DSAR — Auto Activation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§34 AUTO_ACTIVATION — 자동 활성화 성립 조건:
- Policy 가 자동 활성화 허용
- Previous Completion Event 검증
- Previous Blocking 완료
- Instance Active
- Instance 가 Pause/Suspend/Block 아님
- Assignment 생성 가능
- Authority/Delegation 재검증
- Lock 획득
- Idempotency 유효

★핵심 불변식: Scheduler 와 Event Consumer 가 **중복 트리거해도 단일 Activation Commit** 만 성립.

## 2. 기존 구현 대조

- **Step/Level/Stage Instance 부재**: 자동 활성화 대상 계층 자체가 없음(§GROUND_TRUTH).
- **Policy 레지스트리 부재**(§8): 자동 활성화 허용 여부를 판정할 Policy(auto-activation 지원 필드) 자산 없음.
- **Completion Event 부재**: Previous Completion Event 를 발행·검증하는 이벤트 자산 없음(상태전이 3종은 Event 없이 `SET status` 직접 변경).
- **자동 진행 substrate(승인 아님)**: cron 폴링 기반 자동 진행은 JourneyBuilder resume(`JourneyBuilder.php:403`)·catalog_writeback_job stale 회수(`Catalog.php:1700`) 등에 실존하나 모두 **승인 도메인 밖**(KEEP_SEPARATE). 이들은 Scheduler 단독 진행이며 Event Consumer 와의 중복 방지 계약(§34 단일 Commit)이 없음.
- **중복 방지 primitive**: 멱등은 PARTIAL(Paddle UNIQUE `Paddle.php:343-348`·journey_node_sent UNIQUE `JourneyBuilder.php:454,482,490`) — 범용 Idempotency 미들웨어 없음. Scheduler+Event Consumer 이중 트리거를 단일 Commit 으로 수렴시킬 범용 장치 ABSENT.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Approval Chain(Stage/Level/Step)·Assignment·Authority·Delegation·Policy 레지스트리 부재 → 자동 활성화 대상·허용판정·재검증 실체 전무.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. §33 Step Activation(수동)의 자동 트리거 변형 — Step/Assignment/Policy 선행 필수.
- **Mandatory Control**: §50 Duplicate Execution Prevention + §51 Concurrent Transition Prevention 이 핵심. Scheduler 와 Event Consumer 가 동시에 활성화를 시도해도 Idempotency Key(§48) + Unique Active State Constraint(§51)로 **단일 Activation Commit** 보장.
- 확장 substrate: JourneyBuilder 의 원자적 선점 CAS(`JourneyBuilder.php:415-425`)와 멱등 발송(journey_node_sent UNIQUE)은 "중복 트리거→단일 실행" 패턴의 가장 성숙한 참조 정본(KEEP_SEPARATE·인용).
- Authority/Delegation 은 활성화 시점 재검증(생성 당시 스냅샷과 대조) — 부여 후 만료·회수 반영.
- **★실위험**: Fencing Token 부재 시 지연된 Scheduler 트리거가 이미 진행된 상태 위에 활성화 커밋할 창 — Fencing Token 하 Commit 강제.
- **BLOCKED_PREREQUISITE**: 선행 5군 신설 전 실 구현 불가.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
