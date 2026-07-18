# DSAR — Decision Transition Instance (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§30 TRANSITION_INSTANCE** — 상태 전이 1회의 불변 실행 기록.

필수 필드:
`instance_id` · `def_id`(→ §29 Transition Definition) · decision instance id · command id · source state · target state · triggering event · expected version · actual version · lock id · lease id · fencing token · idempotency record id · guard result · precondition result · transition result · failure code · retry count · started_at · committed_at · failed_at · `immutable_hash` · status · evidence.

RESULT enum (14):
`APPLIED` · `ALREADY_APPLIED` · `REJECTED` · `BLOCKED` · `RETRYABLE_FAILURE` · `NON_RETRYABLE_FAILURE` · `VERSION_MISMATCH` · `IDEMPOTENCY_CONFLICT` · `REPLAY_BLOCKED` · `STALE_FENCING_TOKEN` · `LOCK_FAILED` · `VALIDATION_EXPIRED` · `MANUAL_REVIEW_REQUIRED`.

관련 원문: §27 STATE_MACHINE(DRAFT…ARCHIVED, Terminal 6) · §29 TRANSITION_DEFINITION(lock/lease/authority/delegation/assignment revalidation required · snapshot/audit/outbox required) · §28 EVENT.

## 2. 기존 구현 대조

- **상태 전이 자체가 부재.** 4개 승인 핸들러는 State Machine을 거치지 않고 단일 컬럼을 직접 뒤집는다: `Mapping::approve` 단일 `UPDATE`(`Mapping.php:288`) · `AdminGrowth::approvalDecide` 단일 `UPDATE status/decided_by`(`AdminGrowth.php:1330`) · `Alerting::decideAction` 단일 `UPDATE`(`Alerting.php:594`) · `Catalog::approveQueue` bulk `UPDATE status='queued'`(`Catalog.php:2397`).
- 하드코딩 status flip(`AgencyPortal.php:381,400`)은 source→target 전이 정의도, guard/precondition 평가도 없이 이진 상태만 이동한다(선행 §3.5 Sequential ABSENT — 가장 치명적).
- Transition 실행의 불변 기록(`immutable_hash`), `def_id` 참조, `transition result` enum, expected/actual version, lock/fencing/idempotency 결선 — **grep 상당물 없음(no hits)**.
- `ALREADY_APPLIED`/멱등 전이 상당물: `AdminGrowth`의 이미처리 409(`AdminGrowth.php:1327`)·`Catalog` CAS-lite `WHERE status`(`Catalog.php:2397`)가 재적용을 부분적으로 막으나, 이는 전이 인스턴스가 아니라 단발 UPDATE의 방어일 뿐 — RESULT enum도, 재시도 카운트도, fencing도 없다.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.1 Approval(chain/workflow 0) · §3.5 Sequential(하드코딩 status flip) — 전이를 정의할 State Machine·Transition Definition(§27·§29)이 선행 부재 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- Transition Instance는 §29 Transition Definition·§27 State Machine이 선행 신설된 후에만 의미를 갖는다. 선행 6군(Approval/Authority/Delegation/Assignment/Sequential/Identity) 부재 위에 전이 로그만 얹으면 장식이 된다.
- 재사용 원형: `Catalog::approveQueue`의 CAS-lite `WHERE status`(`Catalog.php:2397`)는 `ALREADY_APPLIED`/`VERSION_MISMATCH` 판별의 최소 선례로 일반화. omni_outbox의 claim/lease/SKIP LOCKED(`Omnichannel.php:390-448`)는 `LOCK_FAILED`·`STALE_FENCING_TOKEN` RESULT를 뒷받침할 lock/lease/fencing 설계 원형(KEEP_SEPARATE — 결정 도메인에 별도 신설).
- **Mandatory Control(무후퇴)**: 모든 전이는 (1) source 상태 검증 → (2) guard/precondition 평가 → (3) expected↔actual version 일치 → (4) fencing token 최신 → (5) 불변 `immutable_hash` 기록. 실패는 RESULT enum으로만 표현(silent flip 금지).
- **실위험**: 현행 단일 UPDATE는 전이 인스턴스 없이 상태를 바꾸므로 재적용·역방향·경합을 탐지할 수 없다. `Alerting::actor()` 헤더 위조(`Alerting.php:33-35`)와 결합 시 위조 actor의 임의 전이가 무기록으로 통과 — 전이 로그 신설이 이 우회의 탐지 기반이 된다.
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
