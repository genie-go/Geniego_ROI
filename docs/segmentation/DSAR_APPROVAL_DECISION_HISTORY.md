# DSAR — Decision History (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§36 HISTORY** — 결정 인스턴스/레코드의 전 생애 사건 순차 기록(불변).

필수 필드:
`history_id` · instance id · record id · sequence · event type · previous state · new state · actor · command id · transition id · validation result · commit result · reason code · occurred_at · `immutable_hash` · evidence.

EVENT_TYPE (원문 전사):
`COMMAND_RECEIVED` · `VALIDATION_STARTED` · `PASSED` · `FAILED` · `LOCK_ACQUIRED` · `COMMIT_STARTED` · `COMMITTED` · `COMMIT_FAILED` · `RETRY_STARTED` · `RECOVERY_STARTED` · `COMPLETED` · `CONFLICT_DETECTED` · `DUPLICATE_DETECTED` · `REPLAY_BLOCKED` · `SNAPSHOT_CREATED` · `OUTBOX_CREATED` · `SEQUENTIAL_REFERENCE_CREATED` · `ARCHIVED`.

구분(§37): History Sequence ≠ Commit Sequence — History는 사건 순, Commit Sequence는 확정 순.

## 2. 기존 구현 대조

- **결정 생애 History 부재.** 상태 전이·검증·커밋의 사건열이 순차 기록되지 않는다 — 각 핸들러는 최종 상태만 UPDATE(`Mapping.php:288` · `AdminGrowth.php:1330` · `Alerting.php:594` · `Catalog.php:2397`).
- 존재하는 것은 **audit_log**(감사 write): `AdminGrowth` audit(`AdminGrowth.php:1342`) · `Alerting` audit(`Alerting.php:597,655`). 그러나 audit_log는 **비무결**이다 — 무결 정본은 SecurityAudit::verify(`SecurityAudit.php:56-68`)이며 audit_log는 verify가 0인 장식(reference: menu_audit_log는 tamper-evident 아님, 289차 116편 정정).
- `history_id`·sequence·previous/new state·`immutable_hash`·EVENT_TYPE 18종 분류 — **grep 없음(no hits)**. audit는 사건을 남기되 결정 인스턴스에 결선된 순차·불변 History가 아니다.

## 3. 판정

- Verdict: **ABSENT** (audit_log는 비무결)
- 선행 의존: §35 Record · §27 State Machine · §30 Transition Instance — History가 참조할 record id·상태 전이가 선행 부재 → **BLOCKED_PREREQUISITE**(§3.1 Approval·§3.5 Sequential 연쇄).
- cover: 0 (audit_log 존재는 History 상당물로 산입 불가 — 비무결·비결선)

## 4. 확장/구현 방향 (설계)

- Decision History는 §35 Record와 짝을 이루는 **append-only 무결 사건 원장**으로 신설. §33 Commit 트랜잭션 6단계에서 History 행을 생성하며, previous→new state·EVENT_TYPE·`immutable_hash`를 기록해 §57 Reconciliation의 Record↔History 비교를 가능케 한다.
- **audit_log ≠ History**: 기존 audit(`AdminGrowth.php:1342` · `Alerting.php:597,655`)는 보조 감사로 무후퇴 보존(§70)하되, 결정 사건의 진실원으로 삼지 말 것. 무결성은 SecurityAudit::verify(`SecurityAudit.php:56-68`) 방식의 hash 체인 검증으로 확보 — audit_log의 verify=0 장식을 History 대체물로 재사용 금지.
- **Mandatory Control**: History Sequence는 인스턴스 내 monotonic(§37), Commit Sequence와 별개 축. 사건 누락 시 §57 Reconciliation·§53 Recovery가 탐지(기존 History 수정 금지, 새 사건으로만).
- **실위험**: audit_log를 History로 오인하면 (1) 위조 actor(`Alerting.php:33-35`)의 사건이 검증 불가 감사에 섞이고 (2) 상태 전이 순서 재구성이 불가능하다. 무결 History는 사건 무결성의 근본 장치다.
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
