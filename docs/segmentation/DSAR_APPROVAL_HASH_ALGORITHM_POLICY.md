# DSAR — Hash Algorithm Policy (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§12(Algorithm) + §8(Policy) 결합 — HASH_ALGORITHM_POLICY 필수 필드 (원문 전사):
- `minimum algorithm strength`
- `allowed algorithm ids` · `prohibited algorithm ids`
- `digest length` (minimum digest bit length)
- `output encoding`
- `algorithm rotation policy` · `deprecation policy` · `sunset policy`
- `weak algorithm rejection`(§5.13 비활성 불가 항목)
- `approved use case scope` · `prohibited use case scope`
- `owner` · `version` · `status` · `evidence`

정책 대상 분류(§12): approved=SHA-256/384/512·SHA3-256/384/512 / prohibited=MD5·SHA-1·CRC(CRC32/Adler32)·hashCode·MurmurHash·xxHash·CityHash·DB convenience hash·Runtime object identity hash·Truncated Digest.

의미: Hash Algorithm Policy는 Registry(§12)의 알고리즘 카탈로그 위에서 **어떤 알고리즘이 무결성 용도로 허용/차단되고, 최소 강도·digest 길이·출력 인코딩이 무엇이며, deprecation/sunset을 어떻게 관리하는지를 정책 데이터로 강행 선언**한다. §5.6(약한 알고리즘 차단)·§5.13(Weak Algorithm Rejection은 고객설정으로 비활성 불가)의 집행 지점이며, Policy(§8) `allowed/prohibited algorithm ids`·Profile(§11) `allowed algorithms`가 이 정책과 정합해야 한다.

## 2. 기존 구현 대조

- **해시 알고리즘 정책은 부재** — `minimum algorithm strength`/`allowed·prohibited algorithm ids`/`digest length`/`deprecation·sunset policy`/`weak algorithm rejection`을 데이터로 선언·강제하는 구조체 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `allowed algorithm ids` → **PARTIAL(청정 substrate)**: 실사용이 전부 SHA-256/HMAC-SHA256(`SecurityAudit.php:27`·`Crypto.php:81,98-99`·`MediaHost.php:93`)—허용 알고리즘 요건을 이미 사실상 충족하나 정책 선언 0.
  - **★`prohibited algorithm ids` / `weak algorithm rejection` → 실사용 위반 = 0(중대 긍정)**: Tamper/Chain 경로에 MD5/SHA-1/CRC **전무**(GROUND_TRUTH §2·§3·§5). 존재하는 약한 해시는 전부 비무결성(가명화 `CRM.php:589-930` SHA-1) 또는 벤더 프로토콜 강제(OAuth1.0a·TOTP·CRAM-MD5)—무결성 증명으로 쓰인 약한 알고리즘 0.
  - `minimum algorithm strength`·`digest length` → **ABSENT(선언)**: 실사용 256bit≥이나 정책으로 최소 강도를 강제하는 구조 부재.
  - `output encoding` → **ABSENT(선언)**: hex 관례(`SecurityAudit.php:27` 계열)이나 정책화 0·Hex/Base64 혼용 방지 규칙 없음.
  - `deprecation policy`·`sunset policy`·`algorithm rotation policy` → **ABSENT**: 알고리즘 수명주기·전환 정책 0(§57 Rotation Foundation 부재).
  - 알고리즘이 정책이 아니라 코드 리터럴 `'sha256'`(`SecurityAudit.php:27`)로 고정 → §5.5 위반.

## 3. 판정

- Verdict: **ABSENT** (allowed·weak-rejection은 청정 substrate로 사실상 충족되나 정책 선언·강제 0)
- 선행 의존: Registry(§12) 부재 및 §3.1/§3.2 ABSENT(설계전용)에 종속. 정책이 강제할 원장 digest 대상 부재 → **BLOCKED_PREREQUISITE**.
- cover: **0** (알고리즘 정책 데이터 선언 전무. 실사용 청정은 관례일 뿐 정책화 0).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_hash_algorithm_policy` — Registry(§12) 위에서 `allowed algorithm ids`=SHA-256/384/512·SHA3-*, `prohibited algorithm ids`=MD5/SHA-1/CRC/hashCode/Murmur/xxHash/CityHash/Truncated, `minimum digest bit length`≥256, `output encoding` 고정(hex 또는 base64 단일화)을 강행 선언. `weak algorithm rejection`을 §5.13 비활성 불가 항목으로 고정.
- Golden Rule=Extend: 현행 SHA-256 실사용(`SecurityAudit.php:27`·`Crypto.php:81`)을 `allowed` 정책의 CANONICAL 실증으로 승격하고, `'sha256'` 하드코딩을 §12 Registry `algorithm id` 참조로 이관(§5.5).
- **★Weak Algorithm 무결성 사용 0(긍정) 명시**: 본 정책의 `prohibited algorithm ids`는 **기존 위반을 제거하는 마이그레이션이 아니라, 이미 청정한 상태를 회귀로부터 봉인하는 게이트**다(GROUND_TRUTH §2·§3·§5 확정). §62 Static Lint(MD5/SHA-1 Import·CRC Security Use·hashCode Integrity Use·Weak Algorithm Feature Flag)가 이 정책을 근거로 신규 진입을 CI에서 차단.
- Mandatory Control: `deprecation policy`·`sunset policy`로 향후 SHA-256→SHA-384/SHA3 전환 시 §57 Rotation(NEW_ENTRIES_ONLY/DUAL_DIGEST)·§58 Dual-Digest를 요구—기존 digest 덮어쓰기 금지(§5.8).
- KEEP_SEPARATE: `CRM.php:589-930` SHA-1 가명화·벤더 HMAC(`NaverSms.php:94`)은 `prohibited use case scope`의 예외(비무결성)로 명시—무결성 경로 재사용 금지.

관련: [[DSAR_APPROVAL_HASH_ALGORITHM_REGISTRY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
