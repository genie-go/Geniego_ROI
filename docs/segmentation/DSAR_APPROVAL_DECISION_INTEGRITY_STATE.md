# DSAR — Decision Integrity State (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 INTEGRITY_STATE enum (원문 전사):
`PENDING` / `VALIDATING` / `VALID` / `APPEND_PENDING` / `APPENDING` / `APPENDED` / `CHECKPOINT_PENDING` / `CHECKPOINTED` / `CORRECTION_PENDING` / `SUPERSEDED_REFERENCE` / `RETENTION_ACTION_PENDING` / `LEGAL_HOLD` / `GAP_DETECTED` / `DUPLICATE_DETECTED` / `ORDER_CONFLICT` / `RECONCILIATION_REQUIRED` / `RECOVERY_PENDING` / `FAILED` / `ARCHIVED`.

(§13-14 파생 INTEGRITY_TRANSITION: State 간 전이는 명시적으로 정의하며 직접 status 변경 금지.)

의미: Integrity State는 원장 Append 파이프라인의 단계(검증→append→checkpoint→correction→retention/legal hold→conflict/gap/duplicate→reconciliation/recovery→failed/archived)를 표현하는 상태머신이다. 직접 status 덮어쓰기 없이 정의된 Transition으로만 이동해야 한다.

## 2. 기존 구현 대조

- **무결성 상태머신은 부재** — 19종 State 및 Transition을 데이터로 선언·강제하는 구조체 전무.
- 능력 판정:
  - `APPENDED` 유사(append 완료) → `SecurityAudit`(`SecurityAudit.php:48-52`) INSERT/SELECT만(`SecurityAudit.php:8`)이 유일한 실 append이나, append 전후 상태(PENDING/VALIDATING/APPEND_PENDING/APPENDING)를 구분하지 않고 단일 INSERT로 종결 — 상태머신 아님.
  - `VALIDATING`/`VALID` → verify(`SecurityAudit.php:56-68`)는 사후 검증일 뿐 Append 전 상태 게이트 아님.
  - `CHECKPOINT_PENDING`/`CHECKPOINTED`·`CORRECTION_PENDING`·`SUPERSEDED_REFERENCE`·`RETENTION_ACTION_PENDING`·`LEGAL_HOLD` → **no hits**(checkpoint/correction/supersession/retention/legal hold 개념 부재).
  - `GAP_DETECTED`/`DUPLICATE_DETECTED`/`ORDER_CONFLICT`/`RECONCILIATION_REQUIRED`/`RECOVERY_PENDING` → **ABSENT**(Gap/Duplicate/Order/Reconciliation 탐지 전무 — Gap 자동은폐 위험).
  - `FAILED`/`ARCHIVED` → 원장 맥락의 실패/보관 상태 부재.
  - 직접 status 변경 금지 원칙 위반 사례: 승인 in-place UPDATE(`Mapping.php:285-289,327`)·`journey_decision_log` in-place UPDATE(`JourneyBuilder.php:60,74,1192`)는 Transition 없이 status를 덮어쓴다.

## 3. 판정

- Verdict: **ABSENT** (선행 Decision Core·Ledger 부재로 상태를 가질 주체 자체 없음 → 실질 BLOCKED_PREREQUISITE)
- 선행 의존: 상태의 주체인 Ledger Entry(§17)·Context(§12)가 §3.1 Decision Core ABSENT에 종속. 상태머신을 얹을 대상 부재.
- cover: **0** (19종 State·Transition 전무. SecurityAudit 단일 INSERT는 상태머신 아님).

## 4. 확장/구현 방향 (설계)

- 선행 신설 필수: Decision Core(§3.1)·Context(§12)·실 Ledger(§15)를 먼저 신설해야 상태가 얹힐 주체 확보.
- 순신규 상태머신 — 19종 State + 명시적 Transition(§13-14 파생) 정의. **직접 status 변경 금지**(§CONTRACTS): `Mapping.php:285-289,327`·`JourneyBuilder.php:60,74,1192`의 in-place UPDATE 패턴을 답습 금지하고, 상태 이동은 append-only Entry(§24)로만.
- 재사용 substrate: SKIP LOCKED(`Omnichannel.php:405,429-441`)·Outbox 리스(`Omnichannel.php:395`)를 `APPEND_PENDING`→`APPENDING` 처리 워커의 동시성 substrate로 채택.
- Mandatory Control: `GAP_DETECTED`/`DUPLICATE_DETECTED`/`ORDER_CONFLICT`/`RECONCILIATION_REQUIRED`를 실 상태로 도입해 Gap 자동은폐(§56 Critical)를 차단 — 현재 탐지 전무.
- 실위험: `LEGAL_HOLD` 상태 부재로 `media_gc_cron.php:35,43` 물리 DELETE가 무제한. Legal Hold 상태를 도입해 hold 중 삭제·redaction·archive purge를 차단.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
