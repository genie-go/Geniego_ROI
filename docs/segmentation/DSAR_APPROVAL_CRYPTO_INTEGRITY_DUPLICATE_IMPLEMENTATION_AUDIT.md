# DSAR — Cryptographic Integrity: 중복 구현 감사 (§67)

> EPIC 06-A-03-02-03-02 · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 규율: 중복 Hash Utility/Canonicalization/Verification Engine 신설 금지 — 실존 확장.

## 1. §67 중복 대상별 판정

| §67 항목 | 현황 | 판정·조치 |
|---|---|---|
| 여러 Hash Utility | `Crypto.php:81,98-99`(AES키·HMAC)·`SecurityAudit.php:27`(체인)·`MediaHost.php:93`(내용주소)·`Db.php:272,998`(dedup·apikey) | **분산이나 관심사 상이**. 무결성 Digest 정본은 `SecurityAudit` 패턴으로 **통합(CANONICAL)**·나머지 KEEP_SEPARATE(키재료/PII/dedup은 무결성 아님). 신규 Hash Utility 금지 |
| 여러 Canonical JSON | **0(부재)** | canonical serializer 없음 → 신규 1개 **CANONICALIZATION_POLICY** 단일 정본. `json_encode(UNESCAPED_UNICODE)` 산재를 canonical projection으로 대체(무후퇴 개선) |
| 서로 다른 Decimal/Timestamp/Unicode 정규화 | Decimal/Unicode 정규화 부재·시각은 `gmdate` 관례 | 단일 §17/§18/§19/§20 정책으로 신설·`gmdate` 관례 흡수 |
| 동일 Entry 다중 비호환 Digest | **없음** | 실 Ledger Entry 자체가 부재 |
| Algorithm 이름 문자열 하드코딩 | `'sha256'` 리터럴 산재(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Migrate.php:50`) | **§62 Static Lint 대상**. Hash Algorithm Registry(§12)+Policy(§8)로 이관 |
| Field Set 코드 중복 | **없음(부재)** | Field Set 개념 자체 신규 |
| MD5·SHA-1 Legacy 사용 | 무결성 경로 **0**. 비보안=`CRM.php:589-930`(sha1 가명화)·기타 md5(ID/캐시/버킷)·벤더강제(OAuth1.0a/TOTP/CRAM-MD5) | 무결성 Critical Gap **아님**. Legacy Hash Import(§60)에서 LEGACY_WEAK_HASH/비무결성으로 분류·보존(Canonical 승격 금지) |
| File Hash ↔ Ledger Hash 혼용 | `MediaHost`(파일)·`SecurityAudit`(감사) 분리 | 혼용 없음. Attachment Manifest Digest(§33)는 MediaHost 내용주소를 **참조**(원문 미포함) |
| Audit Hash ↔ Entry Hash 혼용 | `SecurityAudit`가 감사 겸 유일 체인 | 감사트레일≠decision ledger 관심사 분리(§5.3). 패턴 재사용하되 Entry Digest는 별도 |
| Checksum Security 사용 | `schema_migrations.checksum` 저장만(비교 0) | **장식**. Security 무결성 근거 계상 금지 |
| Previous Hash 누락 | menu_audit_log는 `hash_chain`을 prev로 사용하나 검증불가 | menu 계열 무결성 계상 제외 |
| Genesis 불일치 | `SecurityAudit.php:39` GENESIS 상수만 | §27 Versioned Genesis Marker로 표준화(현행 단순상수 격상) |
| Head/Checkpoint Digest 미검증 | Head-CAS/Checkpoint 부재 | §30/§37/§41/§42 신규 |
| Verification 결과 중복저장·Tamper SoT 중복 | **없음(부재)** | Verification Result/Tamper Incident 신규 단일 SoT |
| Migration Rehash Script 중복 | **없음** | §57~59 Rotation/Migration Foundation 단일 |
| Hex/Base64 혼용 | SHA-256 hex 일관(`sha256(...)` 기본 hex) | Output Encoding Policy(§8)로 명문화 |
| Default Charset / ORM Serialization / Map 순서 의존 | `json_encode` 기본 의존(맵 순서·이스케이프) | §13~§21로 결정성 강제 |
| Client Hash 신뢰 / ERP Hash 직접사용 | 무결성 경로에서 **없음** | 원칙 유지(신규 시 금지 명문화) |
| Weak Algorithm 고객설정 활성 | **없음** | §5.13 비활성불가 명문화 |

## 2. 통합 결론

- **중복 무결성 엔진 난립 = 없음**(오히려 무결성 Governance 자체가 부재). 위험은 "중복"이 아니라 ①canonicalization 부재 ②알고리즘 문자열 하드코딩 산재 ③장식 3종의 무결성 착시.
- **통합 방향**: Digest·Chain·Verify **정본 1개**(`SecurityAudit` 패턴 확장) + Canonicalization/Field Set/Algorithm Registry **각 단일 정본**. `Crypto.php`/`MediaHost`/PII 해시는 관심사 분리로 KEEP_SEPARATE(무결성 정본에 병합 금지).
- **무후퇴 예외(=개선)**: 산재 `'sha256'` 리터럴·`json_encode(UNESCAPED_UNICODE)` preimage를 Registry/Canonical Projection으로 이관은 기능 후퇴 아닌 무결성 강화. 단 실 구현은 선행 Ledger 신설 후.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
