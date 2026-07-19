# DSAR — Ledger Periodic Verification (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§53 Periodic Verification (원문 전사):
- `Incremental` since Last Verified
- `Full Partition`
- `Full Ledger`
- `Checkpoint Range`
- `Random Sampling`
- `High-risk Decision`
- 최근 `Migrated` / `Corrected` / `Superseded` Entry
- `Legal Hold` Entry

의미: Periodic Verification은 스케줄러·워커가 **주기적으로** 원장 무결성을 재검증하는 배치 계층이다. 마지막 검증 이후의 신규 Entry만 훑는 Incremental, 파티션/원장 전체를 훑는 Full Partition·Full Ledger, Checkpoint 대표 구간만 검증하는 Checkpoint Range, 무작위 표본 Random Sampling, 그리고 위험도 기반 선별 검증(High-risk Decision·최근 Migrated/Corrected/Superseded Entry·Legal Hold Entry)을 조합한다. Commit-time(§51)·Read-time(§52)이 놓친 지연·저장계층·DBA 직접변경·Migration Silent Mutation을 사후 포착하는 안전망이다(§48 Verification Job의 PERIODIC_INCREMENTAL/PERIODIC_FULL/CHECKPOINT 유형으로 구동).

## 2. 기존 구현 대조

- **주기적 원장 검증 배치는 부재** — Incremental/Full/Checkpoint/Sampling/위험선별을 스케줄로 구동하는 Verification Job 결선 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `Full Ledger`(전수 검증 능력) → **PARTIAL**: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)가 전 행 순회 재계산 검증을 수행 — 이것이 Full Ledger 검증 능력의 실 substrate다. 그러나 **주기 스케줄·Job 구동이 없고** 배선은 관리자 조회 1개소(`AdminGrowth.php:1429`)의 on-demand 호출뿐.
  - `Incremental since Last Verified` → **ABSENT**: 마지막 검증 sequence·watermark 저장 개념 부재. verify는 항상 전수(`SecurityAudit.php:56-68`).
  - `Full Partition`·`Checkpoint Range` → **ABSENT**: 논리 Partition·Checkpoint 개념 부재. 검증은 전역 단일 체인 전수뿐.
  - `Random Sampling` → **ABSENT**: 표본 검증 로직 0.
  - `High-risk Decision`·`Migrated/Corrected/Superseded`·`Legal Hold` 선별 → **ABSENT**: 위험도·Correction·Supersession·Legal Hold 개념·테이블 부재(선행 §3.1 미충족)로 선별 대상 자체가 없음.
  - Batch/Worker substrate → **PARTIAL**: cron(`media_gc_cron.php`)·SKIP LOCKED(`Omnichannel.php:405,429-441`)로 주기 배치·분산 워커 substrate는 실재하나, 원장 verification job으로 결선되지 않음.
  - **★역상충 실위험**: `media_gc_cron.php:35,43`은 append-only 감사로그를 90일 물리 DELETE — 주기 검증이 붙어야 할 원장을 오히려 주기 삭제(Legal Hold 예외 없음). Periodic Verification과 정면 상충하는 기존 배치.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (전수 verify 능력·batch substrate는 존재하나 주기 Job·선별·Incremental·Checkpoint 결선 전무).
- 선행 의존: §3.1 Immutable Ledger(Partition·Checkpoint·Correction·Supersession·Legal Hold)·§3.2 Decision Foundation ABSENT(설계전용)에 종속 → 주기 검증할 원장·선별 대상이 없어 **BLOCKED_PREREQUISITE**. cron·SKIP LOCKED substrate는 PRESENT.
- cover: **0** (주기 검증 Job·Incremental/Checkpoint/Sampling/위험선별 전무. verify 전수 능력은 on-demand 단일 배선).

## 4. 확장/구현 방향 (설계)

- 순신규 Periodic Verification Job(§48 PERIODIC_INCREMENTAL/PERIODIC_FULL/CHECKPOINT) — Incremental(Last Verified watermark 이후)·Full Partition·Full Ledger·Checkpoint Range·Random Sampling·High-risk/Migrated/Corrected/Superseded/Legal Hold 선별을 스케줄 구동. 각 Run은 §49 Verification Run·§50 Result로 기록.
- Golden Rule=Extend: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 전수 재계산 로직을 Full Ledger 검증기로 재사용하고, **sequence watermark를 추가해 Incremental화**. cron(`media_gc_cron.php`)·SKIP LOCKED(`Omnichannel.php:405,429-441`)를 워커 파티셔닝 substrate로 재사용.
- **★역상충 시정(무후퇴 예외=개선)**: `media_gc_cron.php:35,43`의 감사로그 90일 물리 DELETE를 append-only 원장 대상에서 제외 — Periodic Verification이 검증하는 원장은 물리 삭제 금지(§36 Legal Hold·delete prevention). 이는 삭제와 검증이 같은 대상에서 충돌하지 않게 하는 선결.
- **★Last Verified 상태 영속화**: Incremental이 성립하려면 (원장, 파티션)별 last verified sequence를 저장해야 함 — 순신규 상태 테이블 필요.
- 재사용 substrate: 서버UTC(`SecurityAudit.php:24`·`Db.php:438`)로 verified_at 기록·`created_at` 재계산 저장(`SecurityAudit.php:31`)으로 재계산 결정성 확보.
- 장식 오인 금지 — `schema_migrations.checksum`(`Migrate.php:50,63-64`) 비교 미실행·`menu_audit_log.hash_chain`(`AdminMenu.php:169-212`) verify() 0은 주기 검증 근거 아님.

관련: [[DSAR_APPROVAL_LEDGER_COMMIT_TIME_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_SNAPSHOT]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_RECONCILIATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
