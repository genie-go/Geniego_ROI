# DSAR — Decision Commit (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§33 COMMIT** — 결정을 원자적으로 확정하는 단일 트랜잭션 경계.

필수 필드:
`commit_id` · commit request id · instance id · command id · validation result id · slot id · action type · actor subject id · assignment id · claim id · lease id · authority resolution id · delegation resolution id · sequential instance id · stage id · level id · step id · commit sequence · decision effective_at · committed_at · transaction reference · lock id · fencing token · idempotency key · commit hash · status · evidence.

트랜잭션 경계(§48, 순서 고정):
1) Lock 검증 2) Fencing 검증 3) Expected Version 검증 4) Slot Unique 검증 5) Record 생성 6) History 생성 7) Snapshot 생성 8) Audit 생성 9) Instance 상태 갱신 10) Idempotency Result 11) Sequential Completion Ref Outbox 12) Committed Outbox. **분산 시 Outbox/Inbox + Recovery Contract.**

## 2. 기존 구현 대조

- **원자 Commit 부재.** 결정 확정이 트랜잭션으로 묶이지 않는다:
  - `Mapping::approve`: read approvals_json(`Mapping.php:273`) → append → **단일 UPDATE**(`Mapping.php:288`) — **트랜잭션 없음(TOCTOU)**. §48의 12단계 중 어느 것도 없다.
  - `AdminGrowth::approvalDecide`: 단일 `UPDATE status/decided_by`(`AdminGrowth.php:1330`).
  - `Alerting::decideAction`(`Alerting.php:594`) → 집행은 **별도 호출** `executeAction`에서 `AdAdapters::pause`(`Alerting.php:631`) + 별도 UPDATE(`Alerting.php:653`) — **비원자·무아웃박스**. 결정 UPDATE와 외부 집행이 두 트랜잭션으로 쪼개져 부분 커밋 위험.
  - `Catalog::approveQueue`: bulk `UPDATE status='queued'`(`Catalog.php:2397`) + `processWritebackQueue`(`Catalog.php:2404`) — 승인자 미기록.
- Slot Unique 검증 · Record/History/Snapshot 생성 · commit sequence · commit hash · transaction reference · fencing token — **grep 없음(no hits)**.
- 재사용 원형(현존, 결정용 결선 아님): omni_outbox claim/lease/SKIP LOCKED(`Omnichannel.php:390-448`)는 §48-11/12 Outbox 단계의 설계 원형(KEEP_SEPARATE) · Paddle 멱등(`Paddle.php:343-368`)은 §48-10 Idempotency Result의 일반화 대상(VALIDATED_LEGACY).

## 3. 판정

- Verdict: **ABSENT** (트랜잭션 없음 · Mapping TOCTOU `Mapping.php:288`)
- 선행 의존: §3.5 Sequential · §3.1 Approval — 원자 Commit이 확정할 Record(§35)·History(§36)·Slot(§13)이 선행 부재 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- Commit은 §48 12단계를 **단일 DB 트랜잭션**으로 감싸 신설. 현행 4핸들러의 산발 UPDATE를 이 경계 안으로 이전 — 특히 `Alerting`의 결정 UPDATE(`Alerting.php:594`)와 외부 집행(`Alerting.php:631,653`)의 비원자 분리는 Outbox(§46)로 후속화해야 부분 커밋을 제거한다.
- 재사용: omni_outbox 패턴(`Omnichannel.php:390-448`)을 Committed Outbox·Sequential Completion Ref Outbox의 원형으로, Paddle 멱등(`Paddle.php:343-368`)을 Idempotency Result 단계로 확장(Golden Rule = Extend).
- **Mandatory Control**: Slot Unique 검증(동일 Slot 단일 Committed — §13·§45)·Fencing(낮은 토큰 Commit 차단 — §43)·Expected Version(§44) 미통과 시 트랜잭션 롤백. Partial Commit·Client Time Commit 금지(§60).
- **실위험(핵심)**: `Mapping.php:288` 무트랜잭션 UPDATE = read/append/write TOCTOU. 정족수(`Mapping.php:287`)·dedup(`Mapping.php:278`)이 존재해도 트랜잭션이 없으면 동시 승인에서 last-write-wins로 무력화된다. 원자 Commit은 이 결함의 근본 치료이며 정족수/자기승인 차단(`Mapping.php:268`)은 트랜잭션 내부로 이전·보존(§70 무회귀).
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
