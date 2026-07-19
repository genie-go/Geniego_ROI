# DSAR — Legacy Hash Import (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§60 Legacy Hash Import (원문 전사) — 7분류 enum:
- `TRUSTED_CRYPTOGRAPHIC_HASH`
- `WEAK_CRYPTOGRAPHIC_HASH`
- `NON_CRYPTOGRAPHIC_CHECKSUM`
- `UNKNOWN_HASH`
- `MISSING_HASH`
- `CORRUPTED_HASH`
- `UNVERIFIABLE_HASH`

계약: **Legacy Hash를 Canonical Digest Field에 복사 금지 — 별도 Source Hash Metadata + Canonical Digest 신규 생성.**

의미: Legacy Hash Import는 기존 시스템·벤더·과거 구현이 남긴 각종 hash/checksum을 원장 무결성 체계로 편입할 때, 그것을 **강도·검증가능성에 따라 7종으로 분류**하고 Canonical Digest로 오인·승격하지 않도록 격리하는 계층이다. 강한 암호 해시(TRUSTED)·약한 암호 해시(WEAK: MD5/SHA-1)·비암호 체크섬(CRC 등)·미상·부재·손상·검증불가로 나누고, **어느 것도 Canonical Digest Field에 직접 복사하지 않는다** — Legacy 값은 오직 Source Hash Metadata로만 보존하고, 그 위에 Canonical Digest를 새로 생성한다(§5.6). WEAK/NON_CRYPTOGRAPHIC은 무결성 증명으로 신뢰 금지.

## 2. 기존 구현 대조 (★GROUND_TRUTH 실재 Legacy 분류)

- **Legacy Hash Import 분류·격리 계층은 부재** — 그러나 **분류 대상 Legacy는 레포에 실재**하며, 아래와 같이 7분류에 매핑된다:

| 실재 Legacy | file:line | 알고리즘 | §60 분류 | 근거 |
|---|---|---|---|---|
| CRM 가명 identity_id | `CRM.php:589-930` | SHA-1 | **WEAK_CRYPTOGRAPHIC_HASH** | 무결성 아닌 가명화(pseudonymization). SHA-1은 §5.6 차단 알고리즘 |
| schema_migrations.checksum | `Migrate.php:50`·`:63-64` | SHA-256 | **NON_CRYPTOGRAPHIC_CHECKSUM(용도상)** | 알고리즘은 강하나 **저장만·비교 미실행**(무결성 증명으로 미작동)·디스크 파일 대상 배포 checksum |
| 벤더 프로토콜 hash | (OAuth1.0a·TOTP·CRAM-MD5) | md5/sha1 | **WEAK_CRYPTOGRAPHIC_HASH(벤더 강제)** | 프로토콜 규격 강제·무결성 증명 아님. Canonical 승격 금지 |
| PII 가명화 | `AdAdapters.php:1785`·`Dsar.php:24-29`·`Reviews.php:522`·`Attribution.php:115` | SHA-256(정규화) | **비무결성(pseudonymization·KEEP_SEPARATE)** | 무결성 원장 대상 아님. Import 대상에서 제외 |
| dedup_key | `Db.php:272` | SHA-256(40 truncate) | **NON_CRYPTOGRAPHIC 용도(dedup≠무결성)** | Truncated Digest(§5.6)·자연키 dedup |

- 개념별 능력 판정:
  - `TRUSTED_CRYPTOGRAPHIC_HASH` 분류 대상 → **경계적**: `Crypto.php:81,98-99`(SHA-256/HMAC-SHA256)·`MediaHost.php:93`(내용주소 SHA-256)는 강한 암호 해시이나 무결성 원장 Import 대상이 아니라 재사용 substrate(§3.3). Import가 아니라 CANONICAL 직접 사용.
  - `MISSING_HASH`·`CORRUPTED_HASH`·`UNVERIFIABLE_HASH` → **N/A(현재)**: 원장 Entry가 없어 부재·손상·검증불가 판별 대상 자체가 없음.
  - **Canonical Digest Field 복사 금지** → **강제장치 부재**: 위 Legacy를 Canonical로 승격하지 못하게 막는 정책·가드 0(§62 Static Lint 미비).

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (Import 분류 계층은 전무하나, 분류 대상 Legacy는 실재·매핑 확정).
- 선행 의존: §3.1 Immutable Ledger·§7 Registry(Source Hash Metadata 슬롯)·§56 Reconciliation ABSENT에 종속 → Legacy를 담을 Metadata 슬롯·그 위 Canonical Digest 생성 대상이 없어 **BLOCKED_PREREQUISITE**.
- cover: **0** (분류·격리·Source Metadata 보존 계층 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 Legacy Hash Import 분류기 — 위 실재 Legacy를 7종으로 분류하고, 각각 **Source Hash Metadata로만 보존**(Canonical Digest Field 복사 금지, §5.6·§60). Canonical Digest는 그 위에 신규 생성.
- **★분류 확정(재검토 금지)**: `CRM.php:589-930`(SHA-1)·벤더 md5/sha1 = **WEAK_CRYPTOGRAPHIC_HASH** → 무결성 증명 신뢰 금지·Canonical 승격 금지. `Migrate.php:50,63-64`(checksum) = **NON_CRYPTOGRAPHIC_CHECKSUM(용도상)** → 저장만·비교 미실행이므로 무결성 근거 아님. PII 가명화 4개소·dedup_key는 **비무결성 KEEP_SEPARATE** → Import 대상 제외.
- **★Canonical Field 복사 금지 강제**: Legacy 값을 Entry Digest Field에 복사하는 경로를 §62 Static Lint(Weak Algorithm·Legacy Canonical 신뢰)로 차단. Reconciliation(§56)에서만 "Canonical vs Legacy checksum" 대사 상대편으로 참조.
- **★중대 긍정 재확인**: Tamper/Chain 경로에 Weak Algorithm 무결성 사용 = 0(GROUND_TRUTH §2·§5) — WEAK 분류 대상은 전부 가명화·벤더 프로토콜·배포 checksum이지 원장 무결성 증명이 아니다. 즉 Import의 실무 부담은 "오염 제거"가 아니라 "격리 선언".
- 재사용 substrate: 강한 암호 해시(`Crypto.php:81,98-99`·`MediaHost.php:93`)는 Import가 아닌 CANONICAL 직접 사용으로 신규 Digest 생성에 투입.
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`) verify() 0은 TRUSTED로 오분류 금지(검증 불가한 장식=UNVERIFIABLE 성격).

관련: [[DSAR_APPROVAL_LEDGER_VERIFICATION_RECONCILIATION]] · [[DSAR_APPROVAL_DIGEST_VERSION_MIGRATION]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[reference_menu_audit_log_not_tamper_evident]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
