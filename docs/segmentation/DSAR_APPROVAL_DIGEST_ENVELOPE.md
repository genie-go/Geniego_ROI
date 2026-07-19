# DSAR — Digest Envelope (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> file:line 인용원 = [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] GROUND_TRUTH allowlist 한정.

## 1. 원문 전사 (Canonical Contract)

§23 DIGEST_ENVELOPE 필수 필드 (원문 전사):
- `envelope id` · `tenant`
- `aggregate type/id/version`
- `integrity definition id` · `integrity version id`
- `algorithm id` · `algorithm version`
- `canonicalization policy id` · `canonicalization version`
- `field set id` · `field set version`
- `schema version` · `output encoding`
- `digest purpose`
- `generated_at` · `generated_by implementation`
- `status` · `evidence`

Purpose enum (19종, 원문 전사): `PAYLOAD` / `CONTEXT` / `LEDGER_ENTRY` / `CHAIN` / `LEDGER_HEAD` / `LEDGER_LINK` / `SNAPSHOT` / `EVIDENCE` / `AUDIT` / `OUTBOX` / `ATTACHMENT_MANIFEST` / `CORRECTION` / `SUPERSESSION` / `RETENTION_ACTION` / `LEGAL_HOLD` / `CHECKPOINT` / `SEAL_FOUNDATION` / `VERIFICATION_RESULT` / `CUSTOM`.

의미: Digest Envelope는 하나의 digest 값을 **자기기술(self-describing)** 하는 메타데이터 봉투다. 어떤 aggregate를(type/id/version) 어떤 algorithm·canonicalization·field set·schema 버전으로 어떤 purpose(19종) 하에 산출했는지를 digest에 고정한다. 봉투 없이 산출된 raw digest는 재계산·검증·회전(rotation) 시 어떤 규칙으로 만들어졌는지 알 수 없어 §5.8(Digest Version Entry 고정)·§5.5(Algorithm/Version Registry 관리)를 충족할 수 없다.

## 2. 기존 구현 대조

- **Digest Envelope(자기기술 메타데이터) 부재.** SecurityAudit는 SHA-256 digest를 산출하나(`SecurityAudit.php:27`) 그 digest에 **algorithm id/version·canonicalization version·field set version·schema version·purpose**를 함께 묶는 봉투 구조가 없다. algorithm은 코드 내 `'sha256'` 하드코딩이며 KMS/HSM·Key Version Registry는 부재(GROUND_TRUTH §4: `algorithm/키 버전 레지스트리 0`).
- `canonicalization policy id/version`·`field set id/version` → **no hits**. Canonical JSON Library·Decimal Utility·Unicode Normalization Utility 모두 ABSENT(GROUND_TRUTH §4)이므로 봉투가 지시할 canonicalization 버전 자체가 존재하지 않는다.
- `digest purpose`(19종 enum) → **no hits**. SecurityAudit·MediaHost(`MediaHost.php:93`)·Migrate checksum(`Migrate.php:50`)이 각기 다른 목적으로 digest를 만들지만 이를 purpose로 구분·선언하는 계층이 없다 — 오히려 §67 "File Hash↔Ledger Hash 혼용" 위험 영역.
- `generated_at`/`generated_by implementation`을 digest와 함께 봉인 → 부분적으로만: SecurityAudit는 preimage의 `$now`를 `created_at`에 저장(`SecurityAudit.php:31`)해 재계산 가능한 시각은 갖지만 이는 봉투가 아니라 로우 컬럼이며, implementation version은 미기록.

## 3. 판정

- Verdict: **ABSENT** (digest를 자기기술하는 봉투 메타데이터 개념 전무. algorithm 하드코딩·purpose 미구분)
- 선행 의존: Envelope는 §7~§12 Registry/Policy/Definition/Version/Profile·Algorithm Registry·Canonicalization Policy·Field Set을 참조 필드로 요구 — 이들 전부 ABSENT. 또한 aggregate type이 지시하는 Decision/Ledger aggregate가 §3.1/§3.2 부재(BLOCKED_PREREQUISITE).
- cover: **0** (envelope row·purpose enum·algorithm/canonicalization version binding 0). SecurityAudit의 raw digest는 봉투 없는 값이라 §23 계약 미충족.

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_digest_envelope` — §23 전 필드. 모든 digest(Payload/Context/Entry/Chain/Head/Link/Checkpoint …)는 반드시 봉투를 통해 산출·저장하여 algorithm id/version·canonicalization version·field set version·schema version·purpose(19종)를 값에 고정(§5.8 재계산 재현성).
- 재사용 substrate(발명 아닌 조립): digest 산출 primitive = SHA-256(`SecurityAudit.php:27`·`MediaHost.php:93`·`Migrate.php:50`)·HMAC-SHA256(`Crypto.php:98-99`) 재사용. `generated_at` = 서버 UTC(`Db.php:438`·`SecurityAudit.php:24`). 재계산 가능 시각 저장 패턴 = `SecurityAudit.php:31` 확장.
- ★확장 시 보강 델타: algorithm을 `'sha256'` 하드코딩(현행)에서 **Algorithm Registry 참조(algorithm id+version)** 로 승격 — 하드코딩은 §5.5·§62 Static Lint 차단 대상. canonicalization version·field set version은 봉투가 지시해야 재계산이 결정적이 됨(현행 canonicalization 자체 부재 → §5.3 위반의 근원).
- ★purpose 분리로 §67 File Hash↔Ledger Hash 혼용 차단: MediaHost 내용주소 digest(`MediaHost.php:93`)는 `ATTACHMENT_MANIFEST`/`EVIDENCE` purpose, SecurityAudit 체인은 `AUDIT`/`LEDGER_ENTRY` purpose로 봉투상 명시 구분.
- 장식 오인 금지: `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 봉투 없는 저장전용 값이라 Envelope 근거로 계상 금지.
- 선행 조립: Registry/Algorithm Registry/Canonicalization Policy/Field Set → 본 Envelope → 각 Digest 계층. 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_PAYLOAD_DIGEST]] · [[DSAR_APPROVAL_CONTEXT_DIGEST]] · [[DSAR_APPROVAL_LEDGER_ENTRY_DIGEST]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
