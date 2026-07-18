# DSAR — Ledger Migration (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§66/§79 `LEDGER_MIGRATION` — Legacy History Migration. 과거 결정 이력을 Ledger로 backfill 시 아래를 **각 Entry에 저장**(원문 전사):

- **Source System** · **Source Record ID** · **Source Sequence** · **Source Timestamp** · **Source Actor** · **Migration Batch** · **Migration Time** · **Validation Result**.

### 원칙 (원문 전사)
- ★**불완전 시 추정 금지** → `MIGRATED_WITH_INCOMPLETE_SOURCE` 상태 + Manual Review 표기(누락 필드를 지어내 채우지 않음).
- Migration Entry도 **새 Sequence 할당**(§19 — Correction/Migration도 새 Sequence·재번호화 금지).
- Migration Backfill **중복 금지**(§47 Duplicate Detection — Retry/Backfill/Recovery 중복 탐지).
- Legacy ↔ Canonical **이중 진실원 금지**(§56 Critical — backfill 후 Legacy는 참조 전용).

## 2. 기존 구현 대조

- **Ledger Migration/backfill 부재 → ABSENT.** 원장 자체(§15)가 없어 이관 목적지가 없다.
- 실존 Migration Framework `Migrate.php`는 **스키마용**(schema_migrations `:38,50`·트랜잭션 `:54-60`·checksum 저장 `:50,63-64`이나 비교 미실행) — DDL 버전관리 전용이며 결정 이력 backfill 로직은 no hits.
- Legacy 결정 이력의 실체:
  - 승인 결정 = **in-place UPDATE**(`Mapping.php:285-289,327`·테이블 `Db.php:623,655`) → 과거 상태 **이미 소실**(backfill 소스가 마지막 상태만 보유·중간 이력 복원 불가 → 상당수 Entry가 `MIGRATED_WITH_INCOMPLETE_SOURCE` 대상).
  - `journey_decision_log`(`JourneyBuilder.php:60,74,1192`) 역시 in-place UPDATE → Source Sequence/중간 상태 부재.
  - `SecurityAudit`(`:48-52`)·`audit_log`(`Db.php:434-440`)·`pm_audit_log`(`PM/Shared.php:129-148`)는 append-only라 **Source Timestamp/Actor/Sequence 보존** — 상대적으로 온전한 backfill 소스 후보.

## 3. 판정

- Verdict: **ABSENT** (Ledger Migration/backfill 미구현)
- 선행 의존: 이관 목적지 Immutable Ledger(§15)·Entry(§17)·Sequence(§19)가 부재 → **BLOCKED_PREREQUISITE**. 소스 측 in-place UPDATE로 인해 backfill 자체가 부분적으로만 가능.
- cover: 스키마 Migration Framework(`Migrate.php`) 실존 · **Ledger backfill 로직 = 0**.

## 4. 확장/구현 방향 (설계)

- **Migration Framework 재사용 ≠ Ledger backfill**: `Migrate.php`(schema_migrations·트랜잭션)는 **DDL 전용**이므로 결정 이력 backfill은 **별도 신설**(스키마 마이그레이션에 이력 이관을 얹지 않음).
- **소스 온전성 등급화**:
  - append-only 소스(SecurityAudit·audit_log·pm_audit_log) → Source Sequence/Timestamp/Actor 보존 → 정상 backfill.
  - in-place UPDATE 소스(Mapping approvals_json·journey_decision_log) → 중간 이력 소실 → **`MIGRATED_WITH_INCOMPLETE_SOURCE` + Manual Review**(추정 채움 금지).
- **각 Migration Entry 필수 메타**: Source System/Record ID/Sequence/Timestamp/Actor/Batch/Migration Time/Validation Result. **새 Ledger Sequence 할당**(§19)·**Duplicate Detection**(§47)으로 재실행 안전.
- **이중 진실원 차단**: backfill 후 Legacy 테이블은 참조 전용으로 고정(Canonical Ledger가 SoT) — §56 Critical 준수.
- 재사용 substrate: 트랜잭션(`Migrate.php:54-60`·`Omnichannel.php:404-415`)·서버UTC(`Db.php:438`·`SecurityAudit.php:24`)·SHA-256(`SecurityAudit.php:27`·MediaHost `:93`)로 Migration Entry 다이제스트·시각 위조 차단.
- 무후퇴: Legacy 소스는 backfill 검증 완료까지 삭제 금지(★`media_gc_cron.php:35,43`의 90일 물리 DELETE가 backfill 이전 소스를 파괴하지 않도록 Legal Hold 우선).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_LEDGER_FUNCTION_REGRESSION_GATE]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
