# DSAR — Ledger Entry Type (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§17 ENTRY_TYPE enum (원문 전사):
`DECISION_COMMAND_RECEIVED` / `VALIDATION_COMPLETED` / `COMMIT_STARTED` / `COMMITTED` · `DECISION_ACTION_COMMITTED` · `HISTORY_EVENT` · `SNAPSHOT`/`EVIDENCE`/`AUDIT`/`OUTBOX_CREATED` · `SEQUENTIAL_REFERENCE_CREATED` · `CORRECTION`/`AMENDMENT`/`SUPERSESSION` · `REVERSAL`/`VOID`/`REDACTION_REFERENCE` · `RETENTION`/`LEGAL_HOLD_ACTION` · `MIGRATION`/`RECONCILIATION`/`RECOVERY_ENTRY` · `CUSTOM`.

## 2. 기존 구현 대조

- **Entry Type registry 부재.** 원장 Entry가 없으므로 그 유형 분류도 없다(상위 §17 LEDGER_ENTRY = BLOCKED_PREREQUISITE).
- 유형별 대응 사건은 코드에 산재하나 **불변 Entry로 기록되지 않는다**:
  - `COMMITTED` 계열: 승인 확정 = in-place UPDATE(`Mapping.php:285-289,327`) — Commit을 새 불변 로우가 아니라 status 덮어쓰기로 처리 → `COMMIT_STARTED`/`COMMITTED` 구분 부재.
  - `AUDIT`: `SecurityAudit.php`(security_audit_log `:48-52`) 감사 로우는 실재하나 원장 Entry Type이 아니라 감사 액션 문자열.
  - `OUTBOX_CREATED`: omni_outbox(`Omnichannel.php:390-448`) 실재하나 결정 원장과 미결합.
  - `MIGRATION`: schema_migrations(`Migrate.php:38,50`)는 스키마용이지 원장 backfill 아님.
- `CORRECTION`/`AMENDMENT`/`SUPERSESSION`/`REVERSAL`/`VOID`/`REDACTION_REFERENCE`/`RETENTION`/`LEGAL_HOLD_ACTION`/`RECONCILIATION`/`RECOVERY_ENTRY` → **no hits**. 결정 정정은 새 Entry가 아니라 덮어쓰기(`Mapping.php:288`·`journey_decision_log` in-place `JourneyBuilder.php:1192`).

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE — Entry 부재로 유형 분류 불가)
- 선행 의존: Entry Type은 §17 LEDGER_ENTRY의 `entry type/subtype` 도메인 — Entry ABSENT, §3.1 Decision Core ABSENT.
- cover: **0/21** (Entry Type 데이터 0). 대응 사건 일부(commit/audit/outbox)는 로직으로 실재하나 불변 유형 로우 아님.

## 4. 확장/구현 방향 (설계)

- 순신규 `ledger_entry.entry_type` enum(§17 21종) — 상태 문자열/핸들러 로직에 융합된 사건을 **명시적 불변 Entry 유형**으로 분리. `COMMIT_STARTED`↔`COMMITTED` 2단계 분리로 부분 커밋 가시화.
- 재사용 substrate: `AUDIT`/`OUTBOX_CREATED`/`SNAPSHOT`/`EVIDENCE` Entry는 기존 자산(SecurityAudit `:48-52`·omni_outbox `Omnichannel.php:390-448`·MediaHost CAS `:88-90,93-96`)을 참조(reference id)로 링크 — 데이터 중복 없이 Entry Type이 실 자산을 가리키게.
- ★`CORRECTION`/`AMENDMENT`/`SUPERSESSION`/`REVERSAL`/`VOID`/`REDACTION_REFERENCE`는 원본 수정이 아니라 **새 Entry**(§29~35) — 현행 in-place UPDATE(`Mapping.php:288`) 정반대 계약. Entry Type이 정정을 append-only로 강제하는 핵심 축.
- 선행 조립: Decision Core(§3.1) → LEDGER_ENTRY(§17) → 본 Entry Type. Entry 부재 상태에서 유형 enum만 신설 = 공회전 → 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_ENTRY]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
