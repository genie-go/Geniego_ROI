# DSAR — Decision Commit Result (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§34 COMMIT_RESULT** — Commit 시도의 확정 결과.

RESULT enum (22):
`COMMITTED` · `ALREADY_COMMITTED` · `COMMITTED_WITH_WARNINGS` · `REJECTED` · `BLOCKED` · `VERSION_CONFLICT` · `ASSIGNMENT_CHANGED` · `CLAIM_INVALID` · `LEASE_EXPIRED` · `AUTHORITY_INVALID` · `DELEGATION_INVALID` · `STEP_STATE_CHANGED` · `CURSOR_CHANGED` · `DUPLICATE_DECISION` · `IDEMPOTENCY_CONFLICT` · `STALE_FENCING_TOKEN` · `OUTBOX_FAILURE` · `SNAPSHOT_FAILURE` · `AUDIT_FAILURE` · `RETRY_REQUIRED` · `MANUAL_REVIEW_REQUIRED`.

필드:
`result_id` · commit id · result · decision record id · history id · snapshot id · audit event id · outbox event id · sequential completion reference id · warnings · failure code · retryable · committed_at · status · evidence.

## 2. 기존 구현 대조

- **구조화된 Commit Result enum 부재.** 결정 핸들러는 결과를 결정 도메인 상태값이 아니라 HTTP/논리 상태로 반환한다: `Alerting::decideAction` — `approve` 아니면 전부 `rejected`(`Alerting.php:594` 인근, 3의 여지 없음) · `AdminGrowth::approvalDecide` — enum `['approved','rejected']` 2종(`AdminGrowth.php:1321`).
- `ALREADY_COMMITTED` 상당: `AdminGrowth` 이미처리 409(`AdminGrowth.php:1327`)가 유일하게 재확정을 논리적으로 구분하나 22종 enum 중 1종의 근사에 불과.
- `VERSION_CONFLICT`/`STALE_FENCING_TOKEN`/`OUTBOX_FAILURE`/`SNAPSHOT_FAILURE`/`AUDIT_FAILURE`/`DUPLICATE_DECISION` — 대응 상태 자체가 없다(Snapshot·Outbox·Fencing·Record 부재). **grep 없음(no hits)**.
- decision record id·history id·snapshot id·outbox event id를 담는 result 반환체 부재 — 애초 §33 Commit이 이 side-effect들을 생성하지 않으므로 참조할 대상이 없다.

## 3. 판정

- Verdict: **ABSENT** (enum)
- 선행 의존: §33 Commit(원자 Commit) 부재 — 결과를 산출할 Commit 트랜잭션이 없어 Result도 없다 → **BLOCKED_PREREQUISITE**(§3.1 Approval·§3.5 Sequential에 연쇄).
- cover: 0

## 4. 확장/구현 방향 (설계)

- Commit Result는 §33 Commit 트랜잭션의 유일한 반환 계약으로 신설. 현행 2종 문자열 상태(`approved`/`rejected`)를 22종 도메인 enum으로 대체하되, 성공은 `COMMITTED`/`COMMITTED_WITH_WARNINGS`, 실패는 원인별 코드(`VERSION_CONFLICT`·`LEASE_EXPIRED`·`STALE_FENCING_TOKEN` 등)로 정직하게 구분 — 실패를 성공으로 위장 금지(가짜녹색 클래스, 288차 systemic).
- 재사용: `AdminGrowth` 409(`AdminGrowth.php:1327`)의 이미처리 판별을 `ALREADY_COMMITTED`/`IDEMPOTENCY_CONFLICT`로 승격(Extend). Paddle 멱등(`Paddle.php:343-368`)은 `ALREADY_COMMITTED` 반환 선례.
- **Mandatory Control**: `retryable` 플래그로 §52 Retry 대상(Transient DB/Outbox/Snapshot 실패)과 Business Failure(자동 Retry 금지 — §52)를 분리. `OUTBOX_FAILURE`/`SNAPSHOT_FAILURE`/`AUDIT_FAILURE`는 Record 생성 후 부수효과 누락을 §53 Recovery로 넘긴다(기존 Record 수정 금지).
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
