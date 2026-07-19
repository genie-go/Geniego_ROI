# DSAR — Digest Algorithm Rotation Foundation (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§57 Algorithm Rotation Foundation (`APPROVAL_DIGEST_ROTATION_PLAN`, 원문 전사):
- `plan id` · `tenant`
- `source algorithm id` · `target algorithm id`
- `source integrity version` · `target integrity version`
- `affected ledger types` · `affected sequence range`
- `transition mode`
- `dual-digest start` / `dual-digest end`
- `new write policy` · `historical migration policy`
- `rollback policy` · `verification policy`
- `approved by` · `status` · `evidence`

Mode enum (6종): `NEW_ENTRIES_ONLY` / `DUAL_DIGEST` / `FULL_REHASH_REFERENCE` / `CHECKPOINT_ANCHOR` / `MIGRATION_BY_PARTITION` / `CUSTOM`.
**★기존 Digest 덮어쓰기 금지.**

의미: Algorithm Rotation Foundation은 무결성 알고리즘(예: SHA-256→SHA3-256)을 **안전하게 전환하는 계획서**다. 전환 모드 6종을 선택하고(신규 Entry만 새 알고리즘·이중 Digest 병행·참조용 전체 재해시·Checkpoint 앵커·파티션 단위 마이그레이션), dual-digest 시작/종료 시점·신규 쓰기 정책·과거 이관 정책·롤백/검증 정책·승인자를 데이터로 선언한다. **핵심 불변식: 기존 Entry의 Digest를 새 알고리즘으로 조용히 재계산·덮어쓰기 금지**(§5.8) — 과거 Digest는 그 알고리즘 버전으로 고정되어야 하며, 전환은 Dual-Digest(§58)로 병행 추가할 뿐 대체하지 않는다.

## 2. 기존 구현 대조

- **Rotation 계획·인프라는 부재** — source/target 알고리즘·transition mode·dual-digest 창을 선언하는 구조 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `source/target algorithm id` → **ABSENT(하드코딩)**: 알고리즘이 코드에 `'sha256'` 리터럴로 고정(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`·`Db.php:272`). algorithm id를 데이터로 참조·전환하는 인프라가 없어 **rotation 자체가 구조적으로 불가능**.
  - `transition mode`(6종) → **ABSENT**: NEW_ENTRIES_ONLY/DUAL_DIGEST/FULL_REHASH_REFERENCE/CHECKPOINT_ANCHOR/MIGRATION_BY_PARTITION 개념 0.
  - `dual-digest start/end` → **ABSENT**: 이중 Digest 병행 창 개념 부재(§58 참조).
  - `affected ledger types/sequence range` → **ABSENT**: 원장 타입·논리 sequence 개념 부재.
  - `rollback/verification policy`·`approved by` → **ABSENT**.
  - **★기존 Digest 덮어쓰기 금지(불변식)** → **현행 준수(중대 긍정)이나 강제장치 부재**: `SecurityAudit` write는 append-only INSERT(`SecurityAudit.php:8`)이고 Stored Digest를 갱신하는 Setter/Update가 없다 — 우연히 "덮어쓰기 없음"은 만족하나, 이를 **강제하는 정책·가드는 부재**(누군가 Update repository를 추가하면 막을 장치 없음, §62 Static Lint 미비).

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (알고리즘 하드코딩으로 rotation 인프라 자체가 부재. 덮어쓰기 금지는 현행 관행상 만족하나 강제장치 없음).
- 선행 의존: §7~§12 Registry/Algorithm Registry(algorithm id 데이터화)·§3.1 Immutable Ledger·§58 Dual-Digest ABSENT에 종속 → 전환할 algorithm id 참조체계·이중 Digest 병행 대상이 없어 **BLOCKED_PREREQUISITE**.
- cover: **0** (rotation plan·transition mode·dual-digest 창 전무. append-only 준수는 우연적).

## 4. 확장/구현 방향 (설계)

- 순신규 `APPROVAL_DIGEST_ROTATION_PLAN` — source/target algorithm id·integrity version·affected ledger types/sequence range·transition mode(6종)·dual-digest start/end·new write/historical migration/rollback/verification policy·approved by를 선언. 실 전환은 Dual-Digest(§58)·Version Migration(§59)로 집행.
- **★선결: 알고리즘 데이터화**: rotation이 가능하려면 먼저 `'sha256'` 하드코딩(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)을 §12 Hash Algorithm Registry 참조로 이관(§5.5). 알고리즘이 리터럴인 한 rotation은 코드 수정=재배포와 동의어라 무결성 전환 불가.
- **★기존 Digest 덮어쓰기 금지 강제**: 현행 append-only(`SecurityAudit.php:8`)의 우연적 만족을 정식 불변식으로 승격 — Stored Digest Setter·Digest Update Repository를 §62 Static Lint로 차단하고, 전환은 오직 Dual-Digest 병행 추가로만 허용(§5.8·§57).
- **★Rollback 안전성**: transition mode별 rollback policy를 선언 — DUAL_DIGEST 중 target 실패 시 source Digest 유지로 무손실 복귀(과거 Primary 유지, §58).
- 재사용 substrate: 서버UTC(`SecurityAudit.php:24`)로 dual-digest start/end·activated 시각 기록.
- 장식 오인 금지 — `schema_migrations.checksum`(`Migrate.php:50,63-64`)의 알고리즘 고정은 rotation 인프라 아님.

관련: [[DSAR_APPROVAL_DIGEST_DUAL_TRANSITION]] · [[DSAR_APPROVAL_DIGEST_VERSION_MIGRATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
