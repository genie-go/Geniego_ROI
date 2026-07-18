# DSAR — Sequential Event (Event Sourcing) (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§18 EVENT — 지원 Event 유형(요약):
SEQUENTIAL_INSTANCE_CREATED/INITIALIZED · STAGE/LEVEL/STEP_CREATED/READY/ACTIVATED · ASSIGNMENT_REQUIRED/CREATED/INVALIDATED · CLAIM_REQUIRED/GRANTED/RELEASED · DECISION_RECEIVED_REFERENCE · STEP/LEVEL/STAGE_COMPLETION_REQUESTED/COMPLETED/SKIPPED · NEXT_STEP/LEVEL/STAGE_RESOLVED · PAUSE/RESUME/SUSPEND_REQUESTED · PAUSED/RESUMED/SUSPENDED/BLOCKED · RETRY/RECOVERY_REQUESTED/STARTED/COMPLETED · ORPHAN/DEADLOCK/DUPLICATE_TRANSITION/CONCURRENT_TRANSITION/CURSOR_DRIFT/RECONCILIATION_DRIFT_DETECTED · INSTANCE_COMPLETED/CANCELLED/ARCHIVED_REFERENCE.

필드: event_id · instance_id · stage/level/step instance id · event type · source · source event id · source aggregate type/id · actor subject id · system actor id · correlation id · causation id · idempotency key · expected state · payload hash · received_at · processed_at · status · evidence.

## 2. 기존 구현 대조

- **순차 이벤트소싱이 없다.** 승인 상태 변경은 이벤트 append 가 아니라 **인라인 조건부 UPDATE**로 즉시 덮어쓴다:
  - 승인 `SET status='queued' WHERE status='pending_approval'`(`Catalog.php:2397`) · 선점 `SET status='processing'`(`Catalog.php:1726`) · 복구(`Catalog.php:1700`) · 재부활(`Catalog.php:1710`).
  - `admin_growth_approval` pending→approved|rejected 단발 UPDATE(`AdminGrowth.php:1330`).
- **이벤트 스트림·correlation/causation·idempotency key·expected state 를 가진 이벤트 레코드가 승인 도메인에 전무**(§GROUND_TRUTH: Sequential Event ABSENT).
- 부분적 멱등 primitive 는 존재하나 도메인 국소적: Paddle UNIQUE(notification_id)(`Paddle.php:343-348`)·journey_node_sent UNIQUE(`JourneyBuilder.php:454,482,490`). **범용 idempotency-key 미들웨어/이벤트 축은 없다**.
- 근접 이벤트 로그 = JourneyBuilder 여정 진행이나 이는 마케팅 그래프 순회이지 승인 이벤트소싱이 아니다(§GROUND_TRUTH: KEEP_SEPARATE·단 멱등/리스 패턴 참조정본).
- DLQ replay(`routes.php:1927-1932`)는 데드레터 재처리이지 상태머신 이벤트 리플레이가 아님(§GROUND_TRUTH: KEEP_SEPARATE).

## 3. 판정

- Verdict: **ABSENT** (순차 이벤트소싱 없음 · 인라인 UPDATE 덮어쓰기만)
- 선행 의존: §3.4 Assignment(ASSIGNMENT/CLAIM 이벤트) · §3.1 Approval Chain(STAGE/LEVEL/STEP 이벤트) · Instance/Stage/Level/Step Instance(§11~§15·ABSENT)
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 이벤트 스토어.** 상태 변경을 UPDATE 덮어쓰기가 아니라 이벤트 append + 파생 상태 갱신으로 전환한다(이는 상태 임의 덮어쓰기 방지 §42·§54 원칙과 직결).
- **범용 Idempotency Key 신설(★실위험 해소)**: 현행은 Paddle/journey_node_sent 도메인 UNIQUE 만(§GROUND_TRUTH: PARTIAL). Event 의 `idempotency key`+`payload hash`로 Scheduler+Event Consumer 중복·API Retry·Kafka Redelivery 중복 처리를 단일 Commit 으로 흡수(§48·§50). 동일 key 다른 request hash = Conflict.
- **causation/correlation 체인**: SecurityAudit::verify(`SecurityAudit.php:56-68`) 감사무결 substrate 를 이벤트 lineage 검증에 인용.
- **덮어쓰기 금지 원칙 승계 방지**: 현행 `SET status=next` 인라인 UPDATE(`Catalog.php:2397`·`AdminGrowth.php:1330`) 패턴을 이벤트 없이 이식하면 §54 Replay 기준 소실 — Completion Event 없이 COMPLETED 진입은 Critical Gap(§59).
- **무후퇴**: 이벤트 스토어는 State Machine·Transition Instance 와 동시 신설·선행 5군 이후 → **BLOCKED_PREREQUISITE**.

관련: [[DSAR_APPROVAL_SEQUENTIAL_TRANSITION_INSTANCE]] · [[DSAR_APPROVAL_SEQUENTIAL_STATE]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
