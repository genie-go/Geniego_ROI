# DSAR — Ledger Verification Job (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§48 **Verification Job** (원문 전사, 정본 엔티티 `APPROVAL_LEDGER_VERIFICATION_JOB`) — 무결성 검증을 **언제·무엇을·어느 범위로** 수행할지 정의하는 작업 선언. Job Type 10종(+CUSTOM):

- `COMMIT_TIME` — Append/Commit 시점 즉시 검증(§51, 실패 시 Transaction Rollback)
- `READ_TIME` — 조회 시점 검증(§52, Critical Profile)
- `PERIODIC_INCREMENTAL` — Last Verified 이후 증분(§53)
- `PERIODIC_FULL` — Full Partition/Full Ledger 전수
- `CHECKPOINT` — Checkpoint Range 검증(§42)
- `ON_DEMAND` — 수동 요청
- `INCIDENT` — Tamper Incident 대응 검증
- `MIGRATION` — Digest Version/Algorithm 이행 검증(§59)
- `RECOVERY` — 복구 후 재검증
- `COMPLIANCE` — 규제·감사 목적 검증
- `CUSTOM`

필수 필드: `job id` · `tenant` · `ledger` · `partition` · `job type` · `scope`(§38) · `start/end sequence` · `integrity version policy` · `checkpoint policy` · `priority` · `schedule ref` · `max duration` · `retry/failure policy` · `owner` · `status` · `evidence`.

의미: Verification Job은 검증을 **일회성 함수 호출이 아니라 스케줄·우선순위·재시도 정책을 가진 운영 작업**으로 승격한다. Job이 실행되면 §49 Run이 생성되고, Run이 §50 Result를 낳으며, 불일치는 §45 Incident로 흐른다.

## 2. 기존 구현 대조

- **Verification Job 체계 부재** — job type·scope·schedule·priority·retry/failure policy로 검증을 운영 작업화한 구조체 전무.
- **현행 유일 유사물 = 배선된 단발 호출** — `SecurityAudit::verify($pdo)`(`SecurityAudit.php:56-68`)가 `AdminGrowth.php:1429`에서 **`ON_DEMAND` 1종만** 사실상 구현(관리자 조회 시 즉시 전수 재계산). 그러나:
  - `COMMIT_TIME` 검증 없음 — append 경로(`SecurityAudit.php:27`)는 write만 하고 커밋 시점 재검증·Rollback(§51) 미배선.
  - `READ_TIME`/`PERIODIC_INCREMENTAL`/`PERIODIC_FULL`/`CHECKPOINT`/`MIGRATION`/`RECOVERY`/`COMPLIANCE` 전무.
  - scope·start/end sequence·priority·max duration·retry policy 없음 — verify()는 항상 전체 체인 무조건 재계산(`:59` 계열, tenant 술어도 없음 → 전역 단일 체인).
- **선행 검증 대상 부재** — Ledger Partition/Checkpoint/Head(§3.1)가 ABSENT(GROUND_TRUTH 1절)라 CHECKPOINT/PARTITION scope Job은 대상 없음.
- **substrate 부분 실재** — cron(`media_gc_cron.php`)·행수준 SKIP LOCKED는 존재하나 **원장 verification job 스케줄러 아님**(GROUND_TRUTH 4절 Batch/Worker PARTIAL).
- **장식 오인 금지** — `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 저장만·비교 미실행 → 검증 Job 대상 아님.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (ON_DEMAND 1종은 seed로 실재)
- cover: **0** (Job 체계로서는 부재) — `SecurityAudit::verify`+`AdminGrowth.php:1429` 배선은 `ON_DEMAND` Job Type의 **원형(seed)**으로 KEEP_SEPARATE 재사용, 10종 Job 체계를 대체하지 못함.
- 선행 의존: §3.1 Ledger(Partition/Checkpoint/Head)·§3.2 Decision Commit(COMMIT_TIME 집행점)·§10 Integrity Version Policy 종속. 나머지 9종 순신규.

## 4. 확장/구현 방향 (설계)

- **순신규 `approval_ledger_verification_job`** — 10종 Job Type × scope(§38 SINGLE_ENTRY…FULL_LEDGER) × schedule/priority/retry로 검증을 운영 작업화. `SecurityAudit::verify`를 저수준 검증 커널로 재사용하되 **scope·start/end sequence 파라미터화**(현행은 항상 전수).
- **Extend(발명 아닌 조립)**: `AdminGrowth.php:1429` 배선을 `ON_DEMAND` Job으로 흡수. `COMMIT_TIME`은 §51에 따라 append 트랜잭션 내 재검증+Rollback로 신설(현행 append `:27`은 무검증 write). Periodic은 cron(`media_gc_cron.php` 패턴)·SKIP LOCKED substrate로 조립.
- **실위험 반영(무후퇴 예외=개선)**: verify()에 **tenant 술어 부재**(`:59` 계열, GROUND_TRUTH 5절 #4) → Job의 `tenant`·`partition` 필드로 `WHERE tenant_id=?` 강제(§5.13 Tenant Binding). 전역 단일 체인 이식 시 CROSS_TENANT 오판 방지.
- **fail-closed 전제**: Job 실패(`SecurityAudit.php:32` fail-open)를 `retry/failure policy`로 명시 관리 — 삼키지 말고 실패 상태·Incident로 승격.
- **§5.13 불가침**: Entry/Head Verification·Verification Audit는 고객설정으로 비활성 불가 — 최소 COMMIT_TIME(Critical Profile) Job은 강제.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_RUN]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_RESULT]] · [[DSAR_APPROVAL_LEDGER_TAMPER_INCIDENT]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
