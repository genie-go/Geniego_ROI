# DSAR — Hash Algorithm Registry (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§12 HASH_ALGORITHM_REGISTRY 필수 필드 (원문 전사):
- `algorithm id` · `code` · `family` · `name`
- `standard reference`
- `digest bit length`
- `collision resistance classification` · `preimage resistance classification`
- `implementation provider` · `provider version`
- `FIPS status`
- `approved use cases` · `prohibited use cases`
- `introduced_at` · `deprecated_at` · `sunset_at`
- `status` · `evidence`

초기 권장 Canonical 알고리즘: **SHA-256 / SHA-384 / SHA-512 / SHA3-256 / SHA3-384 / SHA3-512**.
차단 알고리즘: **MD5 · SHA-1 · CRC(CRC32/Adler32) · Java hashCode · MurmurHash · xxHash · CityHash · DB convenience hash · Runtime object identity hash · Truncated Digest**.

의미: Hash Algorithm Registry는 **어떤 해시 알고리즘이 시스템에 존재하고, 그 family·비트길이·collision/preimage 저항성·FIPS 상태·구현 provider·approved/prohibited use case·도입/폐기/sunset 시점을 데이터로 선언**하는 알고리즘 카탈로그다. Policy(§8)의 `allowed/prohibited algorithm ids`·Profile(§11)의 `allowed algorithms`·Version(§10)의 `algorithm id`가 모두 이 레지스트리를 참조한다. §5.5(알고리즘 하드코딩 금지)·§5.6(약한 알고리즘 차단)의 데이터 집행 지점이며, 알고리즘을 코드 리터럴이 아니라 등록소로 관리하는 유일한 정본이다.

## 2. 기존 구현 대조

- **해시 알고리즘 레지스트리는 부재** — `algorithm id`/`family`/`digest bit length`/`collision·preimage resistance`/`FIPS status`/`approved·prohibited use cases`/`deprecated·sunset_at`를 데이터로 선언하는 카탈로그 전무. 알고리즘은 코드에 `'sha256'` 리터럴로 산재 하드코딩(§5.5 위반).
- 개념별 능력 판정(GROUND_TRUTH):
  - **Strong 알고리즘 실사용(등록 대상)**:
    - SHA-256 — `SecurityAudit.php:27`(체인 preimage)·`Crypto.php:81`(AES 키유도)·`MediaHost.php:93`(내용주소 CAS)·`Db.php:272`(dedup_key)·`Db.php:998,1006`(데모 API-key). `family`=SHA-2·256bit.
    - HMAC-SHA256 — `Crypto.php:98-99`(purpose-bound 토큰)·`NaverSms.php:94`(SENS 벤더 서명).
    - bcrypt — `Db.php:1219-1220`(비밀번호, `password_hash`)—무결성 아닌 인증(KEEP_SEPARATE).
  - **★차단 알고리즘의 무결성 사용 = 0(중대 긍정)**: Tamper/Chain 경로에 MD5/SHA-1/CRC **전무**(GROUND_TRUTH §2·§3). 존재하는 약한 해시는 전부 **비무결성 용도**:
    - SHA-1 — `CRM.php:589-930`(가명 `identity_id`, PII pseudonymization·비무결성).
    - (검색범위 내 MD5/CRC의 Security Integrity 사용 히트 0).
  - `standard reference`·`FIPS status`·`provider version` → **no hits**(알고리즘 메타데이터 선언 0).
  - `deprecated_at`·`sunset_at` → **no hits**(알고리즘 수명주기 관리 0).

## 3. 판정

- Verdict: **ABSENT** (알고리즘 카탈로그 부재. 단 실사용 알고리즘 자체는 전부 Strong—등록만 남은 청정 substrate)
- 선행 의존: Policy(§8)·Profile(§11)·Version(§10)이 참조할 레지스트리 부재. §3.1/§3.2 ABSENT(설계전용)와 무관하게 알고리즘 카탈로그는 Platform 레벨에서 선행 없이 성립 가능하나, 이를 소비할 원장 부재로 실효는 **BLOCKED_PREREQUISITE**.
- cover: **0** (알고리즘 레지스트리 데이터 선언 전무. `'sha256'` 리터럴 하드코딩이 산재).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_hash_algorithm_registry` — SHA-256/384/512·SHA3-256/384/512를 `INITIAL` approved 알고리즘으로 등재(family·비트길이·collision/preimage 저항성·FIPS status·provider version). MD5·SHA-1·CRC·hashCode·Murmur/xxHash/CityHash·Truncated Digest를 `prohibited use cases`(Security Integrity)로 명시 등재.
- **★핵심 실결함 반영 — 하드코딩 이관**: 현행 `'sha256'` 리터럴 산재(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Db.php:272`)를 레지스트리 `algorithm id` 참조로 이관(§5.5)—코드가 알고리즘 문자열을 직접 쓰지 않고 등록값을 조회. 이는 향후 §57 Rotation의 전제.
- **★중대 긍정 반영(공포=부재)**: 차단 알고리즘의 무결성 사용 = 0이므로, prohibited 등재는 **마이그레이션이 아니라 회귀 방지 게이트**—§62 Static Lint(MD5/SHA-1 Import·CRC Security Use·hashCode Integrity Use)가 이 레지스트리를 근거로 신규 진입을 차단.
- KEEP_SEPARATE 분리: `CRM.php:589-930`의 SHA-1 가명화·`Db.php:1219-1220` bcrypt·`NaverSms.php:94` 벤더 HMAC은 **비무결성 use case**로 레지스트리에서 approved use case를 구분 등재(무결성 digest 경로와 혼용 금지)—약한 알고리즘이 무결성으로 오분류되지 않도록.
- 장식 오인 금지 — `schema_migrations.checksum`(`Migrate.php:50,63-64`)의 SHA-256은 비교 미실행이므로 무결성 알고리즘 실사용으로 계상하되 verify 없는 저장은 별도 표기.

관련: [[DSAR_APPROVAL_HASH_ALGORITHM_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_VERSION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
