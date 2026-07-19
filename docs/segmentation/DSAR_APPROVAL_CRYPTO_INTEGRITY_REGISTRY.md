# DSAR — Cryptographic Integrity Registry (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§7 CRYPTO_INTEGRITY_REGISTRY 필수 필드 (원문 전사):
- `registry id` · `tenant` · `code` · `name`
- `type` · `authoritative source`
- `supported algorithms` · `default algorithms`
- `canonicalization standards` · `output encodings`
- `chain support` · `checkpoint support` · `seal(foundation) support` · `dual-digest support` · `legacy support` · `verification support`
- `owner` · `active_version` · `valid_from` / `valid_to`
- `status` · `evidence`

TYPE enum: `PLATFORM` / `TENANT` / `DECISION_LEDGER` / `FINANCIAL_CONTROL` / `LEGAL` / `COMPLIANCE` / `SECURITY` / `CUSTOM` (8종).

의미: Cryptographic Integrity Registry는 테넌트·도메인 단위로 **어떤 무결성 원장이 존재하며 그 원장이 어떤 알고리즘(supported/default)·canonicalization 표준·출력 인코딩을 쓰고, chain/checkpoint/seal/dual-digest/legacy/verification을 지원하는지를 데이터로 선언**하는 최상위 등록소다. Policy(§8)·Definition(§9)·Version(§10)·Profile(§11)·Hash Algorithm Registry(§12)의 상위 루트이자, 실 Digest 계층(§23~§37)·Verification(§38~§56)의 소속 컨테이너다. 이름·주석이 아니라 `active_version`·`supported algorithms`로 어떤 무결성 체계가 실제로 가동 중인지를 열거·조회할 수 있어야 한다.

## 2. 기존 구현 대조

- **암호 무결성 원장 등록소는 부재** — `registry id`/`code`/`type`/`supported/default algorithms`/`canonicalization standards`/`chain·checkpoint·seal·dual-digest·legacy·verification support`/`active_version`을 데이터로 선언하는 구조체 전무. 무결성은 등록소로 열거·조회되지 않고, 알고리즘은 코드에 `'sha256'` 리터럴로 산재 하드코딩(§5.5 위반).
- 실존하는 유사 자산(GROUND_TRUTH 기반, 등록소 아님):
  - **`SecurityAudit` security_audit_log** — 유일한 실 append-only SHA-256 해시체인. write preimage(`SecurityAudit.php:27`)·`created_at` 재계산 저장(`SecurityAudit.php:31`)·`lastHash`/GENESIS(`SecurityAudit.php:39-40`)·DDL `prev_hash`(`SecurityAudit.php:51`)·verify(`SecurityAudit.php:56-68`)·배선(`AdminGrowth.php:1429`). 그러나 이는 **단일 감사트레일**이지, 다수 원장을 테넌트·도메인별로 표준화 선언하는 registry가 아니다. `type`·`supported algorithms`·`canonicalization standards`·`active_version` 선언 0.
  - `Crypto.php:81,98-99`(SHA-256/HMAC-SHA256) — Hash Utility substrate이나 등록소 아님.
  - `MediaHost.php:93`(내용주소 CAS, `:88-90` 바이트검증·`:100-102` 원자쓰기) — Attachment/Evidence 파일 digest source이나 등록소 아님.
- `supported/default algorithms`·`canonicalization standards`·`output encodings`·`chain/checkpoint/seal/dual-digest/legacy/verification support`를 데이터로 선언하는 등록소 → **no hits**.
- `active_version`/`valid_from`/`valid_to`(등록소 버전·유효기간) → **no hits**.

## 3. 판정

- Verdict: **ABSENT** (실 substrate=SecurityAudit 단일 체인·Crypto·MediaHost는 등록소 아님)
- 선행 의존: Registry는 암호 무결성 6군의 상위 루트 — 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(설계전용·코드/테이블 0)에 종속되어 하위 Policy(§8)·Definition(§9)·Version(§10)·Profile(§11)·Algorithm Registry(§12)·Digest/Verification 전체가 연쇄 부재. 결합할 Ledger Entry·Snapshot·Evidence·Audit·Outbox 대상 자체가 없어 **BLOCKED_PREREQUISITE**. 단 §3.3 Platform Security Foundation(SHA-256·HMAC·서버UTC·내용주소 CAS)은 재사용 substrate로 PRESENT.
- cover: **0** (암호 무결성 원장 등록소 데이터 선언 전무. SecurityAudit는 단일 감사트레일 패턴으로 KEEP_SEPARATE, registry 대체 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_crypto_integrity_registry` 등록소 — 테넌트·도메인 단위로 `type`(8종)·`supported/default algorithms`·`canonicalization standards`·`output encodings`와 `chain/checkpoint/seal(foundation)/dual-digest/legacy/verification support`를 데이터로 선언. Golden Rule=Extend: `SecurityAudit`(`SecurityAudit.php:56-68`)의 append-only SHA-256 체인+verify를 CANONICAL_LEDGER_CHAIN_DIGEST 패턴으로 재사용하되, registry는 그 상위에서 다수 원장을 표준화(KEEP_SEPARATE — 감사트레일≠decision ledger).
- 재사용 substrate(§3.3): SHA-256(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`)·HMAC-SHA256(`Crypto.php:98-99`)·내용주소 CAS(`MediaHost.php:88-102`)·서버UTC(`SecurityAudit.php:24`). Digest·Chain·verify는 "발명 아닌 조립".
- Mandatory Control: `supported/default algorithms`를 registry에서 선언하고 실제 Digest 생성은 이 등록값만 참조(§5.5 하드코딩 금지) — 현행 `'sha256'` 리터럴 산재를 §12 Hash Algorithm Registry로 이관하고 registry가 그 조합을 승인한다.
- **★중대 긍정(공포=부재)**: Tamper/Chain 경로에 Weak Algorithm(MD5/SHA-1/CRC) 사용 = **0**(GROUND_TRUTH §2·§5). registry의 `supported algorithms`는 처음부터 SHA-256/384/512·SHA3만 등재하고 약한 알고리즘 진입로가 없다 — 신규 부담이 아니라 이미 청정한 substrate를 정식 선언으로 승격하는 작업.
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`, verify() 0)·`schema_migrations.checksum`(`Migrate.php:50,63-64`, 비교 미실행)·`journey_decision_log`(`JourneyBuilder.php:1192`, in-place UPDATE)은 registry의 실 무결성 근거로 계상 금지.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
