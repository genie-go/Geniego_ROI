# DSAR — Decision Audit Foundation (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**AUDIT_FOUNDATION (§56)** — 감사 이벤트 유형(원문 전사):
`APPROVAL_DECISION_REGISTRY_CREATED` / `POLICY_CREATED` / `DEFINITION_CREATED` / `VERSION_CREATED` / `INSTANCE_CREATED` · `COMMAND_RECEIVED` · `ACTOR_RESOLVED` · `TARGET_RESOLVED` · `VALIDATION_STARTED` · `VALIDATED` · `VALIDATION_FAILED` · `LOCK_ACQUIRED` · `COMMIT_REQUESTED` · `COMMIT_STARTED` · `COMMITTED` · `COMMIT_FAILED` · `DUPLICATE_DETECTED` · `REPLAY_BLOCKED` · `IDEMPOTENCY_CONFLICT` · `CONFLICT_DETECTED` · `RETRY_STARTED` · `RECOVERY_STARTED` · `RECOVERY_COMPLETED` · `SNAPSHOT_CREATED` · `OUTBOX_CREATED` · `SEQUENTIAL_REFERENCE_CREATED` · `DRIFT_DETECTED` · `RECONCILIATION_REQUIRED` · `SIMULATION_STARTED` · `SIMULATION_COMPLETED` · `MANUAL_REVIEW_REQUESTED`.

## 2. 기존 구현 대조

- **감사 기록은 편재(PRESENT).** 현행 4핸들러 모두 결정 후 audit 을 남긴다:
  - `AdminGrowth::approvalDecide` — audit(:1342)
  - `Alerting::decideAction`/`executeAction` — audit(:597, :655)
  - `Mapping::approve` — 승인자 누적(:285) + 감사 편입
- **정본 = `SecurityAudit::verify`(`SecurityAudit.php:56-68`).** 감사 무결(tamper-evidence)의 유일 검증 경로다. **★ `audit_log` 테이블 자체는 무결하지 않다** — MEMORY [Reference: menu_audit_log.hash_chain 은 tamper-evident 아님] 정정대로, 체인 쓰기만 실재하고 `verify()` 커버 0·preimage ts 소실이면 그 audit_log 는 **검증 불가능한 장식**이다. 감사 무결의 근거는 audit_log 존재가 아니라 `SecurityAudit::verify` 통과 여부다.
- **§56 이벤트 유형 대비 커버리지**: 현행 audit 은 대략 결정(approve/reject) 사후 로그 1~2종에 그친다. `COMMAND_RECEIVED`·`ACTOR_RESOLVED`·`VALIDATION_STARTED/VALIDATED/FAILED`·`LOCK_ACQUIRED`·`COMMIT_*`·`DUPLICATE_DETECTED`·`REPLAY_BLOCKED`·`IDEMPOTENCY_CONFLICT`·`DRIFT_DETECTED`·`SNAPSHOT/OUTBOX/SEQUENTIAL_REFERENCE_CREATED`·`RECONCILIATION_REQUIRED`·`SIMULATION_*` 등 §56 대다수 이벤트는 **대응 선행 엔티티 자체가 부재**하므로 발화 지점도 없다.

## 3. 판정

- Verdict: **PRESENT** (감사 편재 · 단 `audit_log` 비무결 · 정본은 `SecurityAudit::verify`)
- 선행 의존: 감사 프레임은 실재하나, §56 이벤트 대부분은 선행 6군(Command/Validation/Lock/Snapshot/Outbox/Reconciliation ABSENT)에 막혀 **발화 대상 없음** → 그 축들은 **BLOCKED_PREREQUISITE**.
- cover: `SecurityAudit::verify`(`SecurityAudit.php:56-68`) 감사 무결 정본 + 4핸들러 결정 후 audit(AdminGrowth:1342·Alerting:597,655). 나머지 이벤트 커버 **0**.

## 4. 확장/구현 방향 (설계)

- **`SecurityAudit::verify`(:56-68) 를 감사 무결 정본으로 확장** — 신규 audit 엔진 신설 금지(Golden Rule = Extend). 결정 감사 이벤트 전량을 이 체인에 편입하고 `verify()` 커버리지를 §56 이벤트로 확장.
- **재오염 금지**: `audit_log` 존재를 무결의 증거로 재플래그하지 말 것(289차 정정). "감사 남김" ≠ "감사 무결" — verify 통과가 유일 근거.
- **Mandatory Control**: §48 Transaction Boundary 8단계에서 Audit 은 Record·Snapshot 과 동일 트랜잭션 생성. 현행 Alerting 비원자(:631/:653)·Mapping TOCTOU(:287) 하에서는 감사와 결정이 원자적으로 묶이지 않아 **누락 side-effect(§53 Recovery 대상)** 가 발생 가능 — 원자 Commit 골격이 선행.
- **정직판정**: PRESENT 는 "충분"이 아니라 "감사 프레임 실재"의 의미. §56 이벤트 커버리지 확장은 선행 엔티티 신설과 동반.
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
