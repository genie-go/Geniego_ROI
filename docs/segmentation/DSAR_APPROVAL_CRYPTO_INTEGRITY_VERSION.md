# DSAR — Cryptographic Integrity Version (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 CRYPTO_INTEGRITY_VERSION 필수 필드 (원문 전사):
- `version id` · `definition id` · `number` · `previous`
- `version type`
- `algorithm id` · `algorithm version`
- `digest output length` · `output encoding`
- `canonicalization version`
- `field set versions`
- `genesis formula version` · `chain formula version` · `checkpoint formula version`
- `effective_from` / `effective_to`
- `created by` · `reviewed by` · `approved by` · `activated_at`
- `version integrity digest`
- `status` · `evidence`

VERSION TYPE enum: `INITIAL` / `ALGORITHM_CHANGE` / `CANONICALIZATION_CHANGE` / `FIELD_SET_CHANGE` / `CHAIN_FORMULA_CHANGE` / `CHECKPOINT_FORMULA_CHANGE` / `OUTPUT_ENCODING_CHANGE` / `SECURITY_HARDENING` / `CORRECTION` / `MIGRATION` (10종).

의미: Cryptographic Integrity Version은 Definition(§9)의 **알고리즘·canonicalization·field set·genesis/chain/checkpoint formula를 한 시점에 고정(freeze)한 불변 스냅샷**이다. Entry는 이 version을 참조하여 digest를 산출하고 그 version을 entry에 고정(§5.8)하므로, 과거 entry는 당시 version으로만 재검증된다. `version type`은 무엇이 바뀌어 새 version이 났는지(알고리즘·canonicalization·field set·chain/checkpoint formula·encoding·보안강화·정정·마이그레이션)를 분류하고, **`version integrity digest`는 version 정의 자체의 변조를 탐지**한다(정책 문서조차 무결성 대상).

## 2. 기존 구현 대조

- **무결성 버전 스냅샷은 부재** — `version id`/`number`/`version type`/`algorithm id·version`/`canonicalization version`/`field set versions`/각 `formula version`/`version integrity digest`를 데이터로 고정하는 구조체 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `algorithm id`·`algorithm version`·`digest output length`·`output encoding` → **ABSENT**: 알고리즘이 version이 아니라 `'sha256'` 리터럴로 코드에 고정(`SecurityAudit.php:27`)·출력 인코딩(hex)도 관례로만 결정·버전 미기록.
  - `canonicalization version` → **ABSENT**: canonicalization 자체가 부재하므로 버전도 없음.
  - `field set versions`·`genesis/chain/checkpoint formula version` → **ABSENT**: preimage 구성이 코드에 하드코딩(`SecurityAudit.php:27`)·formula를 버전으로 고정하는 구조 0.
  - `version type`(INITIAL/ALGORITHM_CHANGE/…) → **no hits**.
  - `version integrity digest` → **ABSENT**: version 정의 자체를 해시하는 개념 부재.
  - digest version을 entry에 고정 → **ABSENT**: `SecurityAudit`는 entry에 algorithm/version 컬럼 없이 hash만 저장(`SecurityAudit.php:51` DDL). §5.8(version 고정)·§45(expected/actual version 대조) 미달.
  - 유일 유사: `schema_migrations.checksum`(`Migrate.php:50,63-64`)이 마이그레이션 파일의 버전-체크섬 관례이나 **저장만·비교 미실행**이라 version integrity 근거 아님(장식).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Definition(§9) ABSENT 및 §3.1/§3.2 ABSENT(설계전용)에 종속. 버전이 고정할 정의체·field set·formula 대상 부재 → **BLOCKED_PREREQUISITE**.
- cover: **0** (버전 스냅샷 데이터 선언 전무. algorithm/canonicalization/formula를 버전으로 고정하는 구조 0).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_crypto_integrity_version` — Definition 아래 `algorithm id/version`·`digest output length`·`output encoding`·`canonicalization version`·`field set versions`·`genesis/chain/checkpoint formula version`을 한 시점에 고정하고 `version type`(10종)으로 변경 사유를 분류·`version integrity digest`로 version 정의 자체를 봉인.
- Golden Rule=Extend: `SecurityAudit`의 SHA-256 산출을 `INITIAL` version의 algorithm으로 등재하되, 현행 `'sha256'` 하드코딩(`SecurityAudit.php:27`)을 `algorithm id`+`algorithm version` 참조로 이관(§5.5).
- **★핵심 실결함 반영**: 현행 canonicalization 부재(`SecurityAudit.php:27` raw concat + `json_encode(UNESCAPED_UNICODE)`)를 §13 Canonicalization Policy 도입 시 `CANONICALIZATION_CHANGE` version으로 승급하고, 기존 entry는 이전 version으로 유지·재계산 금지(§5.8·§59 Semantic Equivalence)—단순 Rehash 아닌 이중 검증.
- Mandatory Control: digest version을 entry에 고정(§5.8)—§45 Tamper Detection이 expected/actual version을 대조할 수 있도록 entry에 `integrity version` 컬럼을 필수화(현행 `SecurityAudit.php:51` DDL에는 version 컬럼 없음).
- 장식 오인 금지 — `schema_migrations.checksum`(`Migrate.php:50,63-64`)은 저장만·비교 미실행이므로 `version integrity digest`의 실증 아님. `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`) verify() 0도 버전 근거 아님.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_DEFINITION]] · [[DSAR_APPROVAL_HASH_ALGORITHM_REGISTRY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
