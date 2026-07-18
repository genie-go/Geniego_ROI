# DSAR — Integrity State & Transition (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 INTEGRITY_STATE enum (원문 전사):
`PENDING` / `VALIDATING` / `VALID` / `APPEND_PENDING` / `APPENDING` / `APPENDED` / `CHECKPOINT_PENDING` / `CHECKPOINTED` / `CORRECTION_PENDING` / `SUPERSEDED_REFERENCE` / `RETENTION_ACTION_PENDING` / `LEGAL_HOLD` / `GAP_DETECTED` / `DUPLICATE_DETECTED` / `ORDER_CONFLICT` / `RECONCILIATION_REQUIRED` / `RECOVERY_PENDING` / `FAILED` / `ARCHIVED`.

§14 INTEGRITY_EVENT (원문 전사):
`CONTEXT_CREATED` · `LEDGER_APPEND_REQUESTED`/`STARTED` · `ENTRY_APPENDED` · `HEAD_UPDATED` · `CHECKPOINT_CREATED` · `CORRECTION_REQUESTED`/`APPENDED` · `SUPERSESSION_APPENDED` · `REVERSAL`/`VOID`/`REDACTION_REFERENCE_APPENDED` · `RETENTION_ACTION_APPENDED` · `LEGAL_HOLD_BOUND` · `GAP`/`DUPLICATE`/`ORDER_CONFLICT`/`HEAD_MISMATCH`/`ORPHAN_DETECTED` · `RECONCILIATION_REQUIRED` · `RECONSTRUCTION_STARTED`/`COMPLETED` · `SIMULATION_STARTED`/`COMPLETED` · `MANUAL_REVIEW_REQUESTED`.

§13-14 파생 INTEGRITY_TRANSITION 원칙: State 간 전이는 명시적 전이로만 정의 — **직접 status 변경 금지**(Event → 허용 전이 → 다음 State).

## 2. 기존 구현 대조

- **Integrity State machine·Event·Transition 전부 부재.** 무결성 컨텍스트를 상태로 추적하는 테이블/enum이 없다.
- 유일 append 계보인 `SecurityAudit.php`(security_audit_log `:48-52`)는 상태를 갖지 않는다 — INSERT/SELECT만(`:8`)이고 각 로우는 즉시 `APPENDED` 등가로 확정될 뿐 `PENDING`/`VALIDATING`/`APPEND_PENDING`/`GAP_DETECTED` 같은 중간·이상 상태를 표현하지 않는다.
- `verify(`:56-68`)`는 이벤트가 아니라 사후 일괄 검산이다 — `GAP_DETECTED`/`ORDER_CONFLICT`/`HEAD_MISMATCH`를 상태로 승격하는 경로가 없어 gap 무탐지(연속 체인만 확인).
- 승인 결정은 상태를 in-place UPDATE(`Mapping.php:285-289,327`·테이블 `Db.php:623,655`)로 덮어써 전이 이력 자체가 소실된다 — 명시적 Transition의 정반대.
- `INTEGRITY_EVENT` 후보 신호(`CHECKPOINT_CREATED`·`RECONCILIATION_REQUIRED`·`SIMULATION_*`·`LEGAL_HOLD_BOUND`) → **no hits**.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: State/Event/Transition은 §3.1 Decision Core 위 §12 INTEGRITY_CONTEXT의 상태 축 — Decision Core ABSENT(`approval_decision` 0)이라 상태를 부여할 무결성 컨텍스트 자체가 없다. 상위 IMMUTABLE_LEDGER(§15)·LEDGER_ENTRY(§17)도 ABSENT.
- cover: **0** (state/event/transition 데이터 0)

## 4. 확장/구현 방향 (설계)

- 순신규 `integrity_context_state`(19-State enum §13) + `integrity_event` append 로그(§14) — 상태 컬럼 직접 UPDATE 금지·이벤트가 허용 전이표를 통해서만 상태를 진전시키는 명시적 상태머신.
- 재사용 substrate: `SecurityAudit` append-only+verify 패턴(KEEP_SEPARATE·확장)을 이벤트 로그의 불변 기반으로, 서버UTC(`SecurityAudit.php:24`·`Db.php:438`)를 recorded_at 기준으로 차용. Event 저장은 감사트레일과 별개의 무결성 이벤트 스트림.
- `GAP_DETECTED`/`DUPLICATE_DETECTED`/`ORDER_CONFLICT`/`HEAD_MISMATCH`를 상태로 승격 — 현행 `verify()`의 "연속 체인만 확인"(gap 무탐지)을 명시적 이상 State로 표면화.
- 선행 조립 순서: Decision Core(§3.1) 신설 → INTEGRITY_CONTEXT(§12) → 본 State/Event/Transition. Core 부재 상태에서 상태머신만 신설하면 공회전 — 별도 승인세션(RP-002).
- ★직접 status 변경 금지(§13-14)는 승인 in-place UPDATE(`Mapping.php:288`)의 정반대 계약 — 신설 시 Transition 함수 외 status 컬럼 쓰기 경로를 차단해야 무후퇴.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
