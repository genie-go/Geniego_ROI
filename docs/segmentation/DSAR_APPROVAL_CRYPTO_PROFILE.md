# DSAR — Cryptographic Profile (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§11 CRYPTO_PROFILE 필수 필드 (원문 전사):
- `profile id` · `code` · `name`
- `minimum digest bit length`
- `allowed algorithms`
- `checkpoint frequency`
- `commit verification` · `read verification` · `periodic verification`
- `full chain interval`
- `tamper severity mapping`
- `write block policy` · `read block policy`
- `incident escalation`
- `status` · `evidence`

PROFILE TYPE enum: `STANDARD` / `FINANCIAL_HIGH` / `PAYMENT_CRITICAL` / `SETTLEMENT_CRITICAL` / `LEGAL_HIGH` / `COMPLIANCE_HIGH` / `SECURITY_HIGH` / `REGULATED` / `CUSTOM` (9종).

의미: Cryptographic Profile은 원장에 적용되는 **보증 수준 프리셋**—최소 digest 비트길이·허용 알고리즘·checkpoint/commit/read/periodic verification 주기·full chain 검증 간격·tamper severity 매핑·write/read block 정책·incident escalation—을 데이터로 선언한다. FINANCIAL_HIGH·PAYMENT_CRITICAL·SETTLEMENT_CRITICAL 등 고위험 프로파일일수록 digest 비트길이·verify 빈도·write/read block이 강화되고, §46 Tamper Response(Critical Entry Mismatch→Commit 차단)와 §52 Read-time Verification(Critical Profile은 조회 시 검증)의 강도를 결정한다.

## 2. 기존 구현 대조

- **암호 프로파일 구조체는 부재** — `profile id`/`code`/TYPE(STANDARD/FINANCIAL_HIGH/…)/`minimum digest bit length`/각 verification 주기/`tamper severity mapping`/`write·read block policy`를 데이터로 선언하는 구조체 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `minimum digest bit length`·`allowed algorithms` → **PARTIAL(청정 substrate)**: 실사용 알고리즘이 전부 SHA-256(256bit) 이상(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`)이라 최소 비트길이 요건을 이미 충족하나, 프로파일로 **선언·강제**하는 구조는 부재.
  - `commit verification`·`read verification`·`periodic verification`·`full chain interval` → **ABSENT**: verify() 능력(`SecurityAudit.php:56-68`)은 실재하나 호출은 배선 1개소(`AdminGrowth.php:1429`)뿐—commit-time/read-time/주기/full-chain 프로파일 부재.
  - `checkpoint frequency` → **ABSENT**: checkpoint 개념 자체 부재.
  - `tamper severity mapping` → **ABSENT**: verify()는 `{ok,checked,broken_at}`만 반환(`SecurityAudit.php:56-68`)·INFO~CATASTROPHIC severity 매핑 없음.
  - `write block policy`·`read block policy` → **ABSENT(fail-open)**: 오히려 실패 `catch` no-op(`SecurityAudit.php:32`)으로 write가 무차단 지속. verify 실패 시 read를 정상처럼 반환(§52 위반 창).
  - `incident escalation` → **ABSENT**: 무결성 위반 incident escalation 프로파일 부재.
  - TYPE enum(FINANCIAL_HIGH 등) → **no hits**.

## 3. 판정

- Verdict: **ABSENT** (allowed algorithms·최소 비트길이만 청정 substrate로 PARTIAL 충족)
- 선행 의존: Registry(§7)·Definition(§9) ABSENT 및 §3.1/§3.2 ABSENT(설계전용)에 종속. 프로파일이 적용될 원장·verification job 대상 부재 → **BLOCKED_PREREQUISITE**.
- cover: **0** (프로파일 데이터 선언 전무. verify 능력과 SHA-256 실사용은 substrate로만 PARTIAL, 프로파일화 0).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_crypto_profile` — TYPE 9종 프리셋(STANDARD…REGULATED)별로 `minimum digest bit length`·`allowed algorithms`·`checkpoint/commit/read/periodic verification`·`full chain interval`·`tamper severity mapping`·`write/read block policy`·`incident escalation`을 선언.
- Golden Rule=Extend: `SecurityAudit::verify`(`SecurityAudit.php:56-68`)를 `periodic verification`·`full chain interval`의 CANONICAL 실증으로 승격하고, 프로파일이 주기적 verify 스케줄을 강제(현재는 배선 1개소 `AdminGrowth.php:1429` 임시호출뿐).
- **★중대 긍정(공포=부재) 반영**: `minimum digest bit length`≥256·`allowed algorithms`=SHA-256/384/512·SHA3만—현행 실사용이 이미 이 요건을 충족(Weak Algorithm 무결성 사용 0)하므로, 고위험 프로파일 도입이 **마이그레이션 부담 없이** 청정 substrate 위에서 성립.
- **★fail-open→block 전환**: `write block policy`·`read block policy`를 §46(Chain Break→Append 차단)·§52(Critical Profile 조회 검증·실패 시 read 제한)로 선언 — 현행 `catch` no-op(`SecurityAudit.php:32`)의 fail-open을 FINANCIAL/PAYMENT 프로파일에서 fail-closed로 반전.
- Mandatory Control: `tamper severity mapping`으로 verify()의 `broken_at`(`SecurityAudit.php:56-68`)을 §45 Severity(INFO~CATASTROPHIC)·Category로 승격하고 `incident escalation`을 연결.
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`) verify() 0·`schema_migrations.checksum`(`Migrate.php:50,63-64`) 비교 미실행은 프로파일 보증 근거로 계상 금지.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_REGISTRY]] · [[DSAR_APPROVAL_HASH_ALGORITHM_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
