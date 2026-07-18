# DSAR — Duplicate Execution Prevention (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §50 DUPLICATE_EXECUTION_PREVENTION — 방지 대상
동일 Step/Level/Stage 이중 활성 · 동일 Completion Event 이중 처리 · 동일 Next Step/Assignment 이중 생성 · 동일 Snapshot/Transition/Recovery/Cursor 이중 · Scheduler + Event Consumer 중복 · API Retry/Kafka Redelivery 중복.

## 2. 기존 구현 대조

- **구조적 중복실행 방지 계층 ABSENT.** §50이 열거한 대상 중 Stage/Level/Step·Completion Event·Next Step·Snapshot·Cursor 는 대응 엔티티 자체가 ABSENT 이므로 그 이중실행을 방지할 대상조차 없다.
- 실존하는 방지 수단은 **두 가지 국소 primitive 뿐**:
  - **CAS 조건부 UPDATE**: 동일 잡 이중 선점을 affected-rows 로 차단 — `Catalog.php:1726-1730`(`WHERE status IN(...)`)·`JourneyBuilder.php:415-425`(노드 선점)·`ChannelSync.php:6148`. 두 워커가 경합하면 한쪽만 1행 갱신, 나머지는 0행 → 중복 진행 차단.
  - **UNIQUE 제약**: 동일 이벤트 이중 처리 dedup — Paddle notification_id(`Paddle.php:343-348`)·journey_node_sent(`JourneyBuilder.php:454,482,490`).
- 그 외 방어는 상태체크 409(`AdminGrowth.php:1327` 이미 처리된 요청 재결정 차단)·정족수 재승인 차단(`Mapping.php:262`)·dedup(`:279`)이나, 이는 **결정 단계 재입력 방지**이지 전이/활성화/스냅샷의 범용 이중실행 방지가 아니다.
- **범용 멱등(§48) 부재** → Scheduler + Event Consumer 중복·API Retry/Kafka Redelivery 중복을 가로채는 공통 게이트가 없다.

## 3. 판정

- Verdict: **PARTIAL** — CAS(`Catalog.php:1726-1730`·`JourneyBuilder.php:415-425`·`ChannelSync.php:6148`) + UNIQUE(`Paddle.php:343-348`·`JourneyBuilder.php:454`)만 존재.
- 선행 의존: Step/Level/Stage·Completion Event·Cursor·Snapshot 이중방지는 각 엔티티가 ABSENT(§13~§15·§18·§45·§52) → **BLOCKED_PREREQUISITE**. 범용 §48 Idempotency 부재.
- cover: 부분(CAS 이중선점 차단 · UNIQUE 이벤트 dedup) · 나머지 0

## 4. 확장/구현 방향 (설계)

- 순신규 **중복실행 방지 매트릭스** — §51 Concurrent Transition Prevention 과 결합. 이중 활성/이중 Completion/이중 Next Step 생성은 Unique Active State Constraint + Unique Current Cursor Constraint(§51)로, 이벤트 이중처리는 범용 Idempotency Key(§48)로 각각 차단.
- 재사용 기반: CAS(`Catalog.php:1726-1730`·**CANONICAL**)를 "동일 대상 단일 진행" 보장의 원자 단위로 승격, UNIQUE(`Paddle.php:343-348`·`JourneyBuilder.php:454`)를 이벤트 dedup 참조정본으로 표준화. JourneyBuilder 선점 CAS(`JourneyBuilder.php:415-425`)가 Scheduler/Consumer 중복 방지 패턴의 참조.
- ★무후퇴 필수: Scheduler + Event Consumer 가 동시에 활성화를 시도해도 단일 Activation Commit(§34)만 허용. Mandatory Control(§59·§67 중복구현 감사). Fail Closed.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
