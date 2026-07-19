# DSAR — Cryptographic Integrity Definition (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§9 CRYPTO_INTEGRITY_DEFINITION 필수 필드 (원문 전사):
- `definition id` · `registry id` · `code` · `name`
- `applicable ledger types` · `applicable entry types`
- `algorithm policy` · `canonicalization policy` · `verification policy`
- `payload field set` · `context field set` · `reference field set` · `chain field set` · `checkpoint field set`
- `current version`
- `owner` · `status` · `evidence`

의미: Cryptographic Integrity Definition은 Registry(§7) 아래에서 **어떤 원장 타입·엔트리 타입에 어떤 알고리즘·canonicalization·verification 정책이 적용되고, digest 산출에 어떤 field set(payload/context/reference/chain/checkpoint)이 투입되는지를 구체적으로 결합**하는 정의체다. Version(§10)으로 스냅샷되며, §14 Canonical Field Set·§15 Canonical Payload Projection·§23 Digest Envelope·§26 Entry Digest가 이 정의를 참조하여 실제 digest를 생성한다. Policy(§8)가 "규칙"이라면 Definition은 "어느 대상에 어떤 field set으로 그 규칙을 적용하는가"의 바인딩이다.

## 2. 기존 구현 대조

- **무결성 정의체는 부재** — `definition id`/`applicable ledger/entry types`/`algorithm·canonicalization·verification policy`/각 `field set` 참조/`current version`을 데이터로 결합 선언하는 구조체 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `applicable ledger/entry types` → **ABSENT**: 원장 타입·엔트리 타입 개념 자체 부재(§3.1/§3.2 ABSENT). `SecurityAudit`는 단일 `action` 문자열만 기록(`SecurityAudit.php:27`)·엔트리 타입 분류 없음.
  - `algorithm policy` 참조 → **ABSENT**: `'sha256'` 하드코딩(`SecurityAudit.php:27`)·정책 참조 0.
  - `canonicalization policy` 참조 → **ABSENT**: canonical serializer 부재. `json_encode(UNESCAPED_UNICODE)`(`SecurityAudit.php:27`)는 canonicalization 아님.
  - `verification policy` 참조 → **PARTIAL**: verify() 능력(`SecurityAudit.php:56-68`) 실재하나 정의체가 참조하는 정책이 아니라 하드코딩된 단일 검증 루프.
  - `payload field set`·`context field set`·`reference field set` → **ABSENT**: digest 투입 필드가 명시 field set이 아니라 preimage 문자열에 인라인 concat(`SecurityAudit.php:27`: prev·tenant·actor·action·details·now). 포함/제외 필드 경로·type map·정렬 선언 0(§14 미달).
  - `chain field set`·`checkpoint field set` → **ABSENT**: chain 결합은 `prev_hash` 단일 필드뿐(§28 Sequence/Entry Type/Integrity Version 결합 부재)·checkpoint 개념 부재.
  - `current version` → **ABSENT**: digest version을 entry에 고정하는 구조 부재(§5.8).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Registry(§7)·Policy(§8) ABSENT 및 §3.1 Immutable Ledger·§3.2 Decision Foundation ABSENT(설계전용)에 종속. 정의체가 적용될 원장 타입·엔트리 타입·field set 대상 부재 → **BLOCKED_PREREQUISITE**.
- cover: **0** (정의체 데이터 선언 전무. `SecurityAudit`의 인라인 preimage는 명시 field set/policy 참조가 아니라 하드코딩).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_crypto_integrity_definition` — Registry 아래 `applicable ledger/entry types`에 Policy(§8)·Canonicalization Policy(§13)·각 field set(§14)을 결합 선언하고 Version(§10)으로 스냅샷. Golden Rule=Extend: `SecurityAudit`의 preimage 구성 필드(prev·tenant·actor·action·details, `SecurityAudit.php:27`)를 **명시 field set으로 승격**하되, 인라인 concat이 아닌 §14 Canonical Field Set(포함/제외 경로·type map·정렬)로 재선언.
- Mandatory Control: `payload/context/reference field set`을 분리 선언(§24 Payload≠Context)하여 Sequence/Previous Digest는 Payload에 혼합하지 않고 Chain field set에서만 결합(§28)—현행 단일 preimage 혼합(`SecurityAudit.php:27`)의 구조적 한계를 정의 레벨에서 해소.
- **★핵심 실결함 반영**: `canonicalization policy` 참조를 필수화 — 현행 `json_encode(UNESCAPED_UNICODE)`(`SecurityAudit.php:27`)는 §5.3/§5.4 위반이므로 정의체가 §13 Canonicalization Policy를 반드시 바인딩(ksort/NFC/Decimal/Timestamp-precision).
- `current version`으로 digest version을 entry에 고정(§5.8)—과거 entry를 현재 algorithm으로 조용히 재계산·덮어쓰기 금지를 정의 레벨에서 강제.
- 장식 오인 금지 — `menu_audit_log.hash_chain`(`AdminMenu.php:169-212`, verify() 0)·`journey_decision_log`(`JourneyBuilder.php:1192`, in-place UPDATE)은 정의체의 실 무결성 대상 아님.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_VERSION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
