# DSAR — Ledger Verification Snapshot (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§54 Verification Snapshot 필수 필드 (원문 전사):
- `snapshot id` · `run id` · `tenant` · `ledger` · `partition`
- `integrity definition version`
- `algorithm registry snapshot`
- `canonicalization policy snapshot`
- `field set snapshot`
- `ledger head snapshot`
- `checkpoint snapshot`
- `verified sequence range`
- `mismatch summary`
- `incident refs`
- `captured_at`
- `immutable digest`
- `status` · `evidence`

의미: Verification Snapshot은 특정 Verification Run(§49)이 **어떤 무결성 세계 상태를 근거로 검증했는지를 그 시점에 동결**한 증거 레코드다. 검증에 사용된 Integrity Definition Version·Algorithm Registry·Canonicalization Policy·Field Set·Ledger Head·Checkpoint의 스냅샷과, 검증한 sequence range·mismatch 요약·연계 Incident 참조를 담고, **자기 자신도 immutable digest로 봉인**된다. 이로써 "그때 그 정책·그 알고리즘·그 Head 상태에서 이 구간을 검증했고 결과가 이러했다"를 사후 재현 불가능하게 만들지 않고, 정책이 이후 바뀌어도 검증 근거를 소급 위조할 수 없게 한다(§5.12 Tamper 결과도 Immutable).

## 2. 기존 구현 대조

- **Verification Snapshot 레코드는 부재** — 검증 시점의 정책·알고리즘·Head·Checkpoint 상태를 동결하고 immutable digest로 봉인하는 구조 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `run id`·`verified sequence range`·`mismatch summary` → **PARTIAL(휘발성 반환값)**: `SecurityAudit::verify`가 `{ok,checked,broken_at}`(`SecurityAudit.php:56-68`)를 반환 — checked(검증 건수)·broken_at(첫 불일치 지점)은 mismatch summary의 원형이다. 그러나 이는 **호출 시 즉석 반환값**이지 영속 Snapshot 레코드가 아니며, `AdminGrowth.php:1429`에서 화면 표출 후 소멸.
  - `algorithm registry snapshot`·`canonicalization policy snapshot`·`field set snapshot` → **ABSENT**: Registry/Policy/Field Set 개념 자체 부재(하드코딩 `'sha256'`). 스냅샷할 정책 상태가 없음.
  - `ledger head snapshot`·`checkpoint snapshot` → **ABSENT**: Head Digest·Checkpoint Digest 부재.
  - `integrity definition version` → **ABSENT**: Definition/Version 개념 부재.
  - `immutable digest`(Snapshot 자기봉인) → **ABSENT**: verify 결과는 재계산·봉인 없이 소멸. `MediaHost.php:88-102`(내용주소 CAS)가 immutable digest 봉인의 substrate 패턴이나 검증 스냅샷에 결선 안 됨.
  - `incident refs` → **ABSENT**: Tamper Incident 개념·테이블 부재.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (mismatch summary 원형은 verify 반환값에 존재하나 영속 Snapshot·정책 동결·자기봉인 전무).
- 선행 의존: §3.1 Immutable Ledger(Head·Checkpoint)·§7~§12 Registry/Policy/Definition/Field Set·§45 Tamper Incident ABSENT에 종속 → 스냅샷할 정책·Head·Checkpoint·Incident 대상이 없어 **BLOCKED_PREREQUISITE**. immutable digest 봉인 substrate(`MediaHost.php:88-102`)는 PRESENT.
- cover: **0** (검증 스냅샷 레코드·정책 동결·자기봉인 전무. verify 반환값은 휘발성).

## 4. 확장/구현 방향 (설계)

- 순신규 `APPROVAL_LEDGER_VERIFICATION_SNAPSHOT` — 각 Verification Run 완료 시 Integrity Definition Version·Algorithm Registry·Canonicalization Policy·Field Set·Ledger Head·Checkpoint 스냅샷 + verified sequence range + mismatch summary + incident refs를 캡처하고, 스냅샷 자체를 immutable digest로 봉인.
- Golden Rule=Extend: `SecurityAudit::verify`의 `{ok,checked,broken_at}`(`SecurityAudit.php:56-68`)를 mismatch summary(checked→verified count·broken_at→first mismatch sequence)의 원천으로 사용하고, `AdminGrowth.php:1429`의 화면 표출을 영속 Snapshot 기록으로 승격.
- **★자기봉인 substrate 재사용**: `MediaHost.php:93`(SHA-256 내용주소)·`:88-90` 바이트검증·`:100-102` 원자쓰기를 Snapshot의 `immutable digest` 계산·불변 저장 패턴으로 재사용 — Snapshot을 나중에 조용히 고칠 수 없게 봉인.
- **★정책 동결의 이유**: Algorithm/Canonicalization/Field Set Version을 스냅샷에 고정해야, 이후 rotation·migration으로 정책이 바뀌어도 "당시 근거"를 소급 위조 불가(§5.8 과거 재계산·덮어쓰기 금지와 동일 원리).
- 재사용 substrate: 서버UTC(`SecurityAudit.php:24`)로 captured_at 기록.
- 장식 오인 금지 — `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 검증 스냅샷 아님.

관련: [[DSAR_APPROVAL_LEDGER_PERIODIC_VERIFICATION]] · [[DSAR_APPROVAL_LEDGER_VERIFICATION_RECONCILIATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
