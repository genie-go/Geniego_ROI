# DSAR — Ledger Reconciliation Status (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§55 `LEDGER_RECONCILIATION_STATUS` (enum 전사)

`MATCH` / `DECISION_RECORD_MISSING_LEDGER` / `LEDGER_MISSING_DECISION_RECORD` / `COMMIT_MISMATCH` / `HISTORY_MISMATCH` / `SNAPSHOT_MISMATCH` / `EVIDENCE_MISMATCH` / `AUDIT_MISMATCH` / `OUTBOX_MISMATCH` / `SEQUENTIAL_REFERENCE_MISMATCH` / `LINK_MISMATCH` / `PREVIOUS_ENTRY_MISMATCH` / `HEAD_MISMATCH` / `SEQUENCE_MISMATCH` / `PARTITION_MISMATCH` / `CORRECTION_MISMATCH` / `SUPERSESSION_MISMATCH` / `RETENTION_MISMATCH` / `LEGAL_HOLD_MISMATCH` / `LEGACY_HISTORY_MISMATCH` / `ERP_HISTORY_MISMATCH` / `WORKFLOW_HISTORY_MISMATCH` / `MANUAL_REVIEW` / `BLOCKED`.

(원문 §55 축약 표기: `MATCH` · `DECISION_RECORD_MISSING_LEDGER` · `LEDGER_MISSING_DECISION_RECORD` · `COMMIT` · `HISTORY` · `SNAPSHOT` · `EVIDENCE` · `AUDIT` · `OUTBOX` · `SEQUENTIAL_REFERENCE` · `LINK` · `PREVIOUS_ENTRY` · `HEAD` · `SEQUENCE` · `PARTITION` · `CORRECTION` · `SUPERSESSION` · `RETENTION` · `LEGAL_HOLD` · `LEGACY_HISTORY` · `ERP_HISTORY` · `WORKFLOW_HISTORY_MISMATCH` · `MANUAL_REVIEW` · `BLOCKED`.)

## 2. 기존 구현 대조

- 코드 기반 판정 **ABSENT** — §55 enum은 §54 Ledger Reconciliation의 결과 코드로서, 부모 엔티티(§54) 자체가 ABSENT이므로 이 상태 enum도 성립하지 않음.
- 오탐 주의: 재무 정산 대사(`routes.php:1943-1998`, `/recon/reports/.../approve|lock`)는 자체 status(정산 리포트 승인/락)를 갖지만, 이는 정산 도메인 상태이지 §55 원장 무결성 대사 상태 코드가 아님(명명 충돌·도메인 무관).
- 부재/미구현:
  - `DECISION_RECORD_MISSING_LEDGER`·`LEDGER_MISSING_DECISION_RECORD` → **no hits**. Committed Decision Record와 Ledger Entry가 둘 다 부재(결정=in-place UPDATE `Mapping.php:288`)라 "한쪽에만 있음"을 판별할 두 집합이 없음.
  - `HEAD_MISMATCH`·`SEQUENCE_MISMATCH`·`PARTITION_MISMATCH`·`PREVIOUS_ENTRY_MISMATCH` → 부재. Ledger Head/Sequence/Partition/Previous Entry 엔티티(§20/§19/§16/§17) 전부 ABSENT이라 불일치 대상이 없음.
  - `CORRECTION_MISMATCH`·`SUPERSESSION_MISMATCH`·`RETENTION_MISMATCH`·`LEGAL_HOLD_MISMATCH` → 부재. 대응 엔티티(§29/§32/§36/§37) ABSENT.
  - `LEGACY_HISTORY_MISMATCH` 를 산출·기록하는 로직 → 부재. in-place status UPDATE(`Mapping.php:285-289,327`·`Catalog` 승인큐·`Alerting` decide)는 canonical vs legacy 이원 상태를 만들지 않으므로 mismatch 판별 대상이 없음.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §55는 §54 Ledger Reconciliation의 결과 enum — §54가 ABSENT이고, §54는 다시 §3.1 Decision Core·§15 Ledger·§17 Entry·§19 Sequence·§20 Head·§29 Correction·§32 Supersession·§36 Retention·§37 Legal Hold(전부 ABSENT)에 종속 → **BLOCKED_PREREQUISITE**.
- cover: **0**.

## 4. 확장/구현 방향 (설계)

- 순신규: §55 24종 status enum을 §54 `approval_decision_ledger_reconciliation.status` 컬럼으로 선언. 부모 §54 구현과 동시에만 의미가 있음(독립 구현 불가).
- Mandatory Control: `MATCH` 외 모든 mismatch는 **자동 정정 금지** — `MANUAL_REVIEW` 또는 `BLOCKED`로 라우팅하여 사람이 canonical 상태를 확정. 자동 우회는 감사 무결성 훼손(§54 "Production Ledger 자동수정 금지"와 동일).
- 마이그레이션 경로: `LEGACY_HISTORY_MISMATCH`는 현행 in-place UPDATE(`Mapping.php:288`·`JourneyBuilder.php:1192` in-place rewarded UPDATE) 잔재를 canonical Ledger Entry로 흡수하는 전용 상태 — 무후퇴(§68) 원칙 하에 기존 status를 삭제하지 말고 canonical과 병존시키며 mismatch를 명시적으로 기록.
- 실위험: 상태 enum만 선언하고 §54 대조 로직 없이 노출하면 "장식적 status"가 됨(289차 `menu_audit_log` hash-chain verify 0·`SecurityAudit::verify` 정정과 동일 함정) — status는 반드시 실 대조 결과로만 채워져야 함.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_RECONCILIATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
