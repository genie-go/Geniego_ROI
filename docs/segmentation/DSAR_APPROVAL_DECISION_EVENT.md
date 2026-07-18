# DSAR — Approval Decision Event (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

`§28 EVENT` — 이벤트 타입(원문 전사):

`DECISION_COMMAND_RECEIVED` · `VALIDATION_REQUESTED/STARTED` · `VALIDATED` · `VALIDATION_FAILED` · `COMMIT_REQUESTED/STARTED` · `COMMITTED` · `COMMIT_FAILED` · `DUPLICATE_DETECTED` · `IDEMPOTENCY_CONFLICT` · `REPLAY_DETECTED` · `LOCK_ACQUIRED/FAILED` · `STALE_FENCING_TOKEN_DETECTED` · `CONFLICT_DETECTED` · `RETRY_REQUESTED/STARTED` · `RECOVERY_REQUESTED/STARTED/COMPLETED` · `SNAPSHOT_CREATED` · `OUTBOX_CREATED` · `SEQUENTIAL_COMPLETION_REFERENCE_CREATED` · `RECONCILIATION_DRIFT_DETECTED` · `SIMULATION_STARTED/COMPLETED` · `MANUAL_REVIEW_REQUESTED`.

필드: `event_id` · instance/command/record id · event type · source · actor/system actor id · correlation/causation id · idempotency key · payload hash · received/processed_at · status · evidence.

## 2. 기존 구현 대조

- **결정 이벤트 소싱 전면 부재**: `event_id`·event type·correlation/causation id·payload hash를 담는 이벤트 스트림이 실존하지 않는다. 결정은 이벤트를 발행하지 않고 status 컬럼을 in-place UPDATE할 뿐이다.
- **audit_log ≠ Event Sourcing**: `AdminGrowth`(:1342)·`Alerting`(:597,:655)·`Mapping`의 audit는 사후 감사 기록이지, 상태 전이를 이벤트로 소싱하여 재구성(replay)하는 소스가 아니다. correlation/causation id·payload hash·event type 열거(§28 24종)가 없다. 게다가 audit_log는 비무결(정본=`SecurityAudit.php:56-68`).
- **파생 이벤트 부재**: `DUPLICATE_DETECTED`의 재료(중복차단 `Mapping.php:278`·이미처리 `AdminGrowth.php:1327`)는 존재하나 **이벤트로 방출되지 않고 조건 분기로 소멸**. `LOCK_ACQUIRED`·`STALE_FENCING_TOKEN_DETECTED`·`OUTBOX_CREATED`·`SNAPSHOT_CREATED`·`RECONCILIATION_DRIFT_DETECTED` 등은 대응 자산(Lock/Fencing/Outbox/Snapshot/Reconciliation) 자체가 결정 도메인에 부재.
- **Outbox 이벤트 부재**: `Alerting::executeAction`(:601-665)의 집행(:631)+UPDATE(:653) 비원자·무아웃박스 → COMMITTED 이벤트가 트랜잭션 경계 안에서 발행되지 않음. Paddle 웹훅 멱등(`Paddle.php:343-368`)·omni_outbox(`Omnichannel.php:390-448`)는 인접 재사용 자산일 뿐 결정 이벤트로 배선 안 됨.

## 3. 판정

- Verdict: **ABSENT** — 결정 이벤트소싱 없음.
- 선행 의존: §27 State Machine(PARTIAL)·§29 Transition Definition(ABSENT)이 이벤트의 발생원. 나아가 Lock/Fencing/Outbox/Snapshot/Reconciliation(전부 ABSENT) 없이는 해당 이벤트 타입이 발생할 수 없다.
- cover: **0** (audit_log는 대체물 아님).

## 4. 확장/구현 방향 (설계)

- **이벤트 스트림 신설**: 상태 전이(§29)마다 §28 이벤트를 append-only로 발행(event_id·correlation/causation id·payload hash). audit_log와 별도 — audit는 유지하되 이벤트 소싱의 대용으로 쓰지 말 것.
- **Transactional Outbox 패턴**: COMMITTED/OUTBOX_CREATED 이벤트는 결정 커밋과 동일 트랜잭션 경계(§48)에서 발행. omni_outbox claim/lease/SKIP LOCKED(`Omnichannel.php:390-448`·claim_id random_bytes :392)를 Decision Outbox 설계 원형으로 참조(KEEP_SEPARATE). 멱등은 Paddle UNIQUE(notification_id)(`Paddle.php:343-368`)를 VALIDATED_LEGACY로 일반화.
- **파생 이벤트 방출**: 현재 조건 분기로 소멸하는 중복탐지(`Mapping.php:278`·`AdminGrowth.php:1327`)를 `DUPLICATE_DETECTED`/`IDEMPOTENCY_CONFLICT` 이벤트로 승격.
- **무결 연계**: 이벤트 무결성은 audit_log(비무결)가 아니라 `SecurityAudit::verify`(:56-68) 계열에 연결.
- 실 구현 = §27/§29 신설 후 별도 승인 세션. 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
