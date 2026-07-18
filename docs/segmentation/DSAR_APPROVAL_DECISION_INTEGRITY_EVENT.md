# DSAR — Decision Integrity Event (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§14 INTEGRITY_EVENT enum (원문 전사):
`CONTEXT_CREATED` · `LEDGER_APPEND_REQUESTED` / `LEDGER_APPEND_STARTED` · `ENTRY_APPENDED` · `HEAD_UPDATED` · `CHECKPOINT_CREATED` · `CORRECTION_REQUESTED` / `CORRECTION_APPENDED` · `SUPERSESSION_APPENDED` · `REVERSAL_REFERENCE_APPENDED` / `VOID_REFERENCE_APPENDED` / `REDACTION_REFERENCE_APPENDED` · `RETENTION_ACTION_APPENDED` · `LEGAL_HOLD_BOUND` · `GAP_DETECTED` / `DUPLICATE_DETECTED` / `ORDER_CONFLICT_DETECTED` / `HEAD_MISMATCH_DETECTED` / `ORPHAN_DETECTED` · `RECONCILIATION_REQUIRED` · `RECONSTRUCTION_STARTED` / `RECONSTRUCTION_COMPLETED` · `SIMULATION_STARTED` / `SIMULATION_COMPLETED` · `MANUAL_REVIEW_REQUESTED`.

(§13-14 파생 INTEGRITY_TRANSITION: Event는 State 전이의 트리거이며 직접 status 변경 금지.)

의미: Integrity Event는 원장 무결성 파이프라인에서 발생하는 사건(context 생성→append 요청/시작→entry append→head 갱신→checkpoint→correction/supersession/reversal/void/redaction→retention/legal hold→gap/duplicate/order/head-mismatch/orphan 탐지→reconciliation→reconstruction/simulation→manual review)을 append-only 이벤트 스트림으로 기록한다.

## 2. 기존 구현 대조

- **무결성 이벤트 스트림은 부재** — 위 enum을 발생·기록하는 이벤트 파이프라인 전무.
- 능력 판정:
  - `ENTRY_APPENDED` 유사 → `SecurityAudit` INSERT(`SecurityAudit.php:48-52`, INSERT/SELECT만 `:8`)가 유일한 실 append 이벤트이나, 이는 감사 이벤트 자체이지 원장 무결성 이벤트(Append 요청/시작/head 갱신을 구분)가 아니다.
  - `HEAD_UPDATED`/`HEAD_MISMATCH_DETECTED` → **ABSENT**: Head-CAS 부재(`SecurityAudit.php:35-41` lastHash가 ORDER BY id DESC·CAS 없음).
  - `CHECKPOINT_CREATED`·`CORRECTION_REQUESTED/APPENDED`·`SUPERSESSION_APPENDED`·`REVERSAL/VOID/REDACTION_REFERENCE_APPENDED`·`RETENTION_ACTION_APPENDED`·`LEGAL_HOLD_BOUND` → **no hits**(해당 개념 전무).
  - `GAP_DETECTED`/`DUPLICATE_DETECTED`/`ORDER_CONFLICT_DETECTED`/`ORPHAN_DETECTED`/`RECONCILIATION_REQUIRED` → **ABSENT**(탐지·조정 이벤트 전무).
  - `RECONSTRUCTION_*`/`SIMULATION_*`/`MANUAL_REVIEW_REQUESTED` → **ABSENT**(reconstruction/simulation/manual review 개념 부재).
  - Outbox 이벤트 substrate(`Omnichannel.php:390-448`·리스 `:395`)·Inbox dedup(`Paddle.php:108,146,343-368`)은 재사용 substrate이나 무결성 이벤트로 발행된 바 없음.

## 3. 판정

- Verdict: **ABSENT** (선행 Decision Core·Ledger 부재로 이벤트 발생 주체 없음 → 실질 BLOCKED_PREREQUISITE)
- 선행 의존: 이벤트의 대상인 Context(§12)·Ledger Entry(§17)·Head(§20)가 §3.1 Decision Core ABSENT에 종속.
- cover: **0** (무결성 이벤트 enum·스트림 전무. SecurityAudit INSERT·omni_outbox는 재사용 substrate로만 존재).

## 4. 확장/구현 방향 (설계)

- 선행 신설 필수: Decision Core(§3.1)·Context(§12)·실 Ledger(§15)·Head(§20)를 먼저 신설해야 이벤트가 발생할 주체 확보.
- 순신규 무결성 이벤트 스트림 — enum 전종을 append-only로 발행. Golden Rule=Extend: Outbox(`Omnichannel.php:390-448`)를 `ENTRY_APPENDED`/`HEAD_UPDATED` 등 이벤트 발행의 재사용 substrate로, SKIP LOCKED(`Omnichannel.php:405,429-441`)를 이벤트 소비 워커의 동시성 substrate로 채택.
- Mandatory Control: `GAP_DETECTED`/`DUPLICATE_DETECTED`/`ORDER_CONFLICT_DETECTED`/`HEAD_MISMATCH_DETECTED`/`ORPHAN_DETECTED`/`RECONCILIATION_REQUIRED`를 실 이벤트로 발행해 §56 Critical Gap(Gap 자동은폐·Outbox↔Ledger 불일치)을 표면화. 이벤트는 직접 status 변경 금지(§13-14 파생) — State 전이 트리거로만.
- 실위험: 이벤트 없이 append만 하면 `HEAD_MISMATCH`/`ORPHAN`이 무음 발생. `LEGAL_HOLD_BOUND` 이벤트로 hold를 명시화해 `media_gc_cron.php:35,43` 물리삭제와의 상충을 감지.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
