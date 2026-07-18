# DSAR — Decision Integrity Version (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 INTEGRITY_VERSION 필수 필드 (원문 전사):
- `version_id` · `definition id` · `version_number` · `previous_version_id`
- `version_type` · `change_summary`
- 정책 스냅샷: `ledger entry type snapshot` · `sequence snapshot` · `partition snapshot` · `required reference snapshot` · `correction policy snapshot` · `retention policy snapshot` · `legal hold policy snapshot` · `transaction policy snapshot` · `reconciliation policy snapshot`
- `effective_from` / `effective_to`
- `created_by` · `reviewed_by` · `approved_by` · `activated_at`
- `immutable_hash foundation`
- `status` · `evidence`

TYPE enum: `INITIAL` / `ENTRY_TYPE_CHANGE` / `PARTITION_CHANGE` / `SEQUENCE_CHANGE` / `REFERENCE_CHANGE` / `CORRECTION_POLICY_CHANGE` / `RETENTION_POLICY_CHANGE` / `LEGAL_HOLD_POLICY_CHANGE` / `TRANSACTION_POLICY_CHANGE` / `RECONCILIATION_POLICY_CHANGE` / `CORRECTION` / `MIGRATION`.

의미: Integrity Version은 Definition(§9)의 각 변경을 불변 스냅샷으로 버전화한다. `previous_version_id` 체인·`immutable_hash foundation`으로 정책 변경 이력 자체가 append-only여야 하며, `created/reviewed/approved_by`로 Maker-Checker 승인을 요구한다.

## 2. 기존 구현 대조

- **무결성 정의 버전 구조체는 부재** — `version_id`/`definition id`/`version_number`/`previous_version_id`/`immutable_hash foundation`을 데이터로 선언하는 구조체 전무.
- 선행 의존 대상 부재: `definition id`가 §9 Definition(BLOCKED_PREREQUISITE)에 종속 — 버전화할 원장 정의 자체가 없음.
- 유사 버전 관례(능력 판정):
  - `previous_version_id` 체인 유사 → `SecurityAudit`의 prev_hash 체인(`SecurityAudit.php:27`)이 유일한 실 링크 패턴이나, 이는 감사 이벤트 체인이지 정책 버전 체인이 아니다.
  - `immutable_hash foundation` → SHA-256 3개소(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)가 재사용 substrate이나 버전 스냅샷 해시에 적용된 바 없음. `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 비교 미실행(장식).
  - 정책 스냅샷 필드(entry type/sequence/partition/reference/correction/retention/legal hold/transaction/reconciliation snapshot) → **no hits**.
  - `created_by`/`reviewed_by`/`approved_by`(Maker-Checker) → 원장 정의 버전에는 부재. 승인 유사는 `Mapping.php:315`(approvals_json)이나 in-place UPDATE.
  - `version_type` enum(INITIAL/…/MIGRATION) → **no hits**.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE**
- 선행 의존: Definition(§9) BLOCKED_PREREQUISITE에 종속 → 버전화 대상 부재. 상위 Registry(§7)·§3.1 Decision Core 모두 ABSENT.
- cover: **0** (버전 구조체·정책 스냅샷·immutable hash 전무. prev_hash 체인·SHA-256은 재사용 substrate로만 존재).

## 4. 확장/구현 방향 (설계)

- 선행 신설 필수: Registry(§7)·Definition(§9)을 먼저 신설한 뒤 본 Version이 `definition id`로 결합.
- 순신규 `decision_integrity_version` — `previous_version_id` 체인 + 9종 정책 스냅샷 + `immutable_hash foundation`. Golden Rule=Extend: `SecurityAudit`의 prev_hash 체인(`SecurityAudit.php:27,39`)과 verify(`SecurityAudit.php:56-68`)를 정책 버전 체인·검증의 CANONICAL 패턴으로 재사용.
- 재사용 substrate: SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)을 `immutable_hash foundation`의 해시 substrate로 채택. `schema_migrations.checksum`(`Migrate.php:50`)은 비교 미실행이므로 그대로 답습 금지 — 반드시 verify를 실집행.
- Mandatory Control: `created/reviewed/approved_by`를 강제해 정책 변경 자체를 Maker-Checker 승인+append-only로 — 현행 `Mapping.php:285-289,327` in-place UPDATE 패턴을 정책 버전에 답습 금지.
- 무후퇴: 정책 변경 이력이 in-place로 덮이면 과거 원장의 검증 기준이 소실되므로, Version은 반드시 append-only(§24)로 신설.

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
