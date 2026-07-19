# DSAR — Canonicalization Policy (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§13 CANONICALIZATION_POLICY 필수 필드 (원문 전사):
- `serialization format` (CANONICAL_JSON / CBOR ref / BINARY ref / CUSTOM — 초기 **CANONICAL_JSON 우선**)
- `property ordering`
- `null policy` · `empty policy` · `string policy`
- `unicode policy` · `encoding policy`
- `boolean policy` · `integer policy` · `decimal policy` · `monetary policy`
- `timestamp policy` · `date policy` · `timezone policy`
- `collection policy` · `map policy`
- `binary policy` · `reference policy`
- `excluded field policy`
- `schema version policy` · `max payload size`

의미: Canonicalization Policy는 **Hash 이전에 payload를 결정적(deterministic) 표준형으로 변환하는 상위 컨테이너**다. 필드순서·whitespace·null/빈문자열·숫자/Decimal Scale·Timestamp TZ/Precision·Unicode 정규화·Collection 순서·Boolean·Reference·Binary Encoding 차이를 **모두 제거한 뒤**에만 digest를 계산한다(§5.3). 하위 정책(§16 Null·§17 Number·§18 Monetary·§19 Timestamp·§20 Unicode·§21 Collection·§22 Reference)을 결합하며, §5.4(`field1+field2+field3` 원문 문자열 임의연결 금지·필드경계/Type 보존 Canonical Envelope 사용)를 강행한다. 환경·언어 무관 동일 Digest(Cross-language 재현성)의 유일한 근거다.

## 2. 기존 구현 대조

- **Canonicalization Policy는 부재(핵심 결함)** — `serialization format`/`property ordering`/각 하위 정책을 데이터로 선언하는 canonical serializer 전무. ksort/NFC/RFC 8785(JCS) canonical JSON 라이브러리 0(GROUND_TRUTH §4 Canonical JSON Library=ABSENT).
- 개념별 능력 판정(GROUND_TRUTH):
  - `serialization format`·`property ordering` → **ABSENT**: 실 체인의 preimage는 raw `|`-concat + `json_encode(details, UNESCAPED_UNICODE)`(`SecurityAudit.php:27`)—**property ordering 미보장**(PHP 배열 삽입순서 의존)·§5.4 문자열 임의연결 위반. `json_encode(UNESCAPED_UNICODE)`는 canonicalization이 **아님**(GROUND_TRUTH §4 명시).
  - `null policy`·`empty policy` → **ABSENT**: Field Absent/Explicit Null/Empty String/Empty Array 구분 규칙 0.
  - `unicode policy` → **ABSENT**: NFC/NFKC normalizer 0(GROUND_TRUTH §4 Unicode Normalization Utility=ABSENT). `UNESCAPED_UNICODE`는 정규화가 아니라 이스케이프 억제일 뿐.
  - `decimal policy`·`monetary policy` → **ABSENT**: Decimal canonical(minor unit·precision version) 0(GROUND_TRUTH §4 Decimal Utility=ABSENT)·Float 직접사용 방지 규칙 없음.
  - `timestamp policy`·`timezone policy` → **PARTIAL(substrate)**: 서버 UTC `gmdate`(`SecurityAudit.php:24`) 실재하나, ISO-8601·Precision 고정·Trailing zero 정규화 정책은 부재. 대조로 장식 `menu_audit_log`는 `date('c')` local-tz(§19 위반, `AdminMenu.php:169-212` 계열).
  - `collection policy`·`map policy` → **ABSENT**: Unordered Set/Map Canonical 정렬 규칙 0.
  - `reference policy` → **ABSENT**: Stable Identifier vs Display Name 구분 규칙 0(§22).
  - `binary policy`·`encoding policy` → **PARTIAL**: 내용주소 CAS(`MediaHost.php:88-102`)는 바이트 직접 해시라 encoding 무관—Attachment Manifest(§33) substrate이나 policy 선언 아님.

## 3. 판정

- Verdict: **ABSENT** (핵심 결함 — canonical serializer 자체가 없음)
- 선행 의존: §3.3 Canonical JSON/Decimal/Unicode Utility ABSENT에 직접 종속. §3.1/§3.2 ABSENT(설계전용)로 canonicalize 대상 payload도 부재 → **BLOCKED_PREREQUISITE**.
- cover: **0** (canonicalization 데이터 선언·구현 전무. UTC gmdate만 substrate로 PARTIAL, canonicalization 정책화 0).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_canonicalization_policy` — `serialization format`=CANONICAL_JSON 우선, `property ordering`=deterministic key sort(ksort/RFC 8785), 하위 §16~§22(Null·Number·Monetary·Timestamp·Unicode·Collection·Reference)를 결합 선언. Version(§10)의 `canonicalization version`으로 스냅샷.
- **★핵심 실결함 정면 반영**: 현행 `json_encode(details, UNESCAPED_UNICODE)` + raw `|`-concat(`SecurityAudit.php:27`)은 **canonicalization이 아니다**. 실 체인 SecurityAudit조차 §5.3(Canonicalization 없이 Hash 금지)·§5.4(문자열 임의연결 금지)를 위반하므로, 이 정책 도입은 SecurityAudit 재사용·이식 전 **선결 보강**이다(GROUND_TRUTH §5 실위험 1·무후퇴 예외=개선). 도입 시 §10 `CANONICALIZATION_CHANGE` version으로 승급하고 기존 entry는 semantic equivalence 검증(§59, 단순 Rehash 금지).
- Golden Rule=Extend: 서버 UTC(`SecurityAudit.php:24`)를 `timestamp policy`의 substrate로 재사용하되 ISO-8601·Precision 고정·Trailing zero 규칙을 추가. 내용주소 CAS(`MediaHost.php:88-102`)를 `binary policy`/Attachment Manifest(§33) substrate로 재사용.
- Mandatory Control: `null policy`(Empty→Null 자동변환 금지)·`number policy`(Float 직접사용 금지·negative zero 정규화)·`monetary policy`(minor unit·precision version)·`unicode policy`(NFC 명시)·`collection policy`(Set/Map canonical 정렬)를 §5.13 비활성 불가 항목(Canonical Serialization)으로 강제.
- 장식 오인 금지 — `menu_audit_log`의 `date('c')` local-tz preimage(`AdminMenu.php:169-212`, verify() 0)는 canonicalization 반례이지 근거 아님. `schema_migrations.checksum`(`Migrate.php:50,63-64`)도 canonical payload 근거 아님.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_POLICY]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
