# ADR — Cryptographic Hash Chain & Tamper Detection Governance (EPIC 06-A-03-02-03-02)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 구현은 선행 Immutable Ledger·Decision Core 신설 후 별도 승인세션)
- **차수**: 289차 후속 회차 (2026-07-19)
- **스펙**: [`SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM`](../segmentation/SPEC_06A_03_02_03_02_CRYPTO_HASH_CHAIN_TAMPER_VERBATIM.md)
- **전수조사(ⓑ·GROUND_TRUTH)**: [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_CRYPTO_INTEGRITY_DUPLICATE_IMPLEMENTATION_AUDIT`](../segmentation/DSAR_APPROVAL_CRYPTO_INTEGRITY_DUPLICATE_IMPLEMENTATION_AUDIT.md)
- **선행 블록**: [`ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER`](ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER.md)(06-A-03-02-03-01) · [`ADR_DSAR_DECISION_ACTIONS_GOVERNANCE`](ADR_DSAR_DECISION_ACTIONS_GOVERNANCE.md) · [`ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE`](ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE.md)
- **관련 메모리**: [[reference_menu_audit_log_not_tamper_evident]] · [[project_n289_13_epic06a_design_governance]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-02는 Immutable Decision Ledger의 각 Entry·Link·Head·Checkpoint·Snapshot·Evidence·Audit·Outbox를 **Cryptographic Digest + Hash Chain**으로 결합하여, 변조·삭제·삽입·순서변경·Cross-Tenant Chain·Algorithm Downgrade·Canonicalization 불일치를 탐지하는 Enterprise Integrity Verification 체계를 요구한다(Decision Integrity 10 세부 EPIC 중 2번째·Digital Signature/PKI/SoD/Fraud는 후속). §3은 §3.1 Immutable Ledger·§3.2 Decision Foundation·§3.3 Platform Security Foundation을 전제한다.

능력 기반 전수조사(ⓑ·2 에이전트·코드 정독):
- **★유일 실 Hash Chain + verify = `SecurityAudit::verify`** — SHA-256 append-only·prev_hash 체인·GENESIS·tenant preimage·**재계산 가능한 created_at**·`hash_equals`+`prev_hash` 이중검증(`SecurityAudit.php:24,27,31,39-40,51,56-68`)·실 배선(`AdminGrowth.php:1429`이 verify 호출·integrity 노출).
- **★그 실 체인조차 Canonicalization 부재** — preimage=raw `|`-concat + `json_encode(details,UNESCAPED_UNICODE)`(ksort/NFC/Decimal/Timestamp-precision 정규화 없음) → §5.3·§5.4 위반. Head-CAS 없음·verify tenant 술어 없음·`catch` no-op fail-open(`:32`).
- **★Weak-algorithm 무결성 사용 = 0(중대 긍정)** — Tamper/Chain 경로에 MD5/SHA-1/CRC 전무. 산재 md5/sha1/crc는 비보안(ID/캐시/PII 가명화) 또는 벤더 프로토콜 강제(OAuth1.0a HMAC-SHA1·TOTP HMAC-SHA1·CRAM-MD5).
- **선행 §3.1 Immutable Ledger·§3.2 Decision Foundation = 설계전용·코드/테이블 0**(591 DSAR_APPROVAL_* 전부 BLOCKED_PREREQUISITE·cover0).

## 2. 결정 (Decision)

### D-1. Canonical Cryptographic Integrity Contract를 **신설**하되 실존 primitive/패턴을 확장(Golden Rule) — "발명이 아니라 조립"

| 실존 | §66 태그 | 확장 결정 |
|---|---|---|
| **`SecurityAudit` append-only+verify** | **CANONICAL_VERIFICATION_ENGINE / CANONICAL_LEDGER_CHAIN_DIGEST 패턴(확장·KEEP_SEPARATE)** | 유일 실 해시체인·검증기(`SecurityAudit.php:56-68`). Entry/Chain/Head/Verification의 참조 구현. 단 ★감사 트레일≠decision ledger·**Canonicalization/Head-CAS/tenant 술어/tx경계**를 확장 시 보강(무후퇴 예외=개선). |
| `Crypto.php` SHA-256·HMAC-SHA256 | **VALIDATED_CRYPTO_HASH_UTILITY** | Digest·HMAC 재사용(`Crypto.php:81,98-99`). Algorithm은 Registry로 이관·문자열 하드코딩 제거. |
| `MediaHost` 내용주소 CAS | **VALIDATED_FILE_HASH_SOURCE** | Attachment Manifest Digest(§33)의 file content digest 소스(`MediaHost.php:88-102`). 원문 미포함·Manifest만. |
| 서버 UTC `gmdate` | **재사용 substrate(Trusted Time)** | Timestamp Canonicalization(§19)의 신뢰 시각원. |

### D-2. **장식 오인 금지** (무결성 자산으로 승격 금지)

- `menu_audit_log.hash_chain`(`AdminMenu.php:169-218`) = **verify() 0·preimage `ts` 미저장(재계산 불가)·tamper-evident 아님**([[reference_menu_audit_log_not_tamper_evident]]).
- `schema_migrations.checksum`(`Migrate.php:50,63-64`) = 저장만·비교 미실행.
- `journey_decision_log`(`JourneyBuilder.php:1192`) = in-place UPDATE·append-only 아님.

### D-3. **약한 알고리즘 = 정직한 "부재"** (오탐 방지)

§61 Critical Gap "MD5/SHA-1/CRC를 Integrity Proof로 사용"은 **해당 없음**. 무결성/해시체인 경로는 전부 SHA-256. 산재 md5/sha1/crc는 (a) 비보안 ID/캐시/버킷/PII 가명화(`CRM.php:589-930` sha1) 또는 (b) 벤더 프로토콜 강제(OAuth1.0a·TOTP·CRAM-MD5)로 **repo 설계 선택 아님**. Legacy Hash Import(§60)에서 LEGACY_WEAK_HASH/비무결성으로 분류·보존하되 Canonical Digest로 승격 금지. GdprConsent md5(UA+date) 예측가능성은 저위험 주석 사항(체인 결함 아님).

### D-4. **구현 BLOCKED_PREREQUISITE** — 선행 Ledger·Decision Core 신설 후 별도 승인세션(RP-002)

| 선행군 | 상태 |
|---|---|
| §3.1 Immutable Ledger Foundation · §3.2 Decision Foundation | **ABSENT(설계전용·코드/테이블 0)** |
| §3.3 Platform Security Foundation | **PRESENT(재사용 substrate·Canonical JSON/Decimal/Unicode Utility·KMS 제외)** |

→ 해시체인이 결합할 **불변 Ledger Entry·Snapshot·Evidence·Audit·Outbox 대상이 없어 공회전**. **§74 per-entity 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0**이 정직판정. ★단 Platform primitive(SecurityAudit 체인+verify·SHA-256·MediaHost CAS·서버UTC)는 실재로 실 엔진은 "Ledger 신설 → 기존 primitive 위 Canonical Digest/Chain 적재"로 조립 가능. 이번 차수=설계 명세(코드 0).

### D-5. Digest ≠ Encryption ≠ Digital Signature (§5.1·§5.2·구현 시 강제)

이번 단계=Strong Cryptographic Digest + Hash Chain만. Digital Signature/PKI/HSM/KMS/외부 Timestamp Authority/Blockchain은 후속 EPIC. 암호화 존재로 Digest 생략 금지·Digest로 Signature 대체 금지.

### D-6. Canonicalization 없이 Hash 금지 (§5.3·§5.4·최우선 델타)

실 체인조차 raw concat이므로, 이번 설계의 최우선 확장 델타는 **Canonical Serialization Policy(Null/Number/Monetary/Timestamp/Unicode/Encoding/Collection/Reference) + Canonical Payload Projection**을 Digest 계산 앞단에 강제하는 것. 문자열 임의연결·`json_encode(UNESCAPED_UNICODE)` preimage 대체.

### D-7. Mandatory 무결성 제어 고객설정 비활성 불가(§5.13)

Canonical Serialization·Strong Algorithm·Previous Digest Binding·Sequence/Tenant Binding·Entry/Head Verification·Critical Tamper Alert·Verification Audit·Algorithm Version Recording·Weak Algorithm Rejection.

## 3. ★실 위험 (별도 수정세션 후보)

1. **`SecurityAudit` Canonicalization 부재**(`:27` raw concat+UNESCAPED_UNICODE json) — 실 체인이나 §5.3/§5.4 위반. 이식·재사용 전 Canonical Projection 보강.
2. **`SecurityAudit` fail-open**(`:32` catch no-op·`:40` GENESIS on error) — 체인 silent reset·§5.11 위배 창.
3. **`SecurityAudit` Head-CAS/tx경계 부재**(`:39` DESC 조회) — 동시 INSERT 체인분기.
4. **verify()에 tenant 술어 없음** — 전역 단일 체인·멀티테넌트 이식 시 `WHERE tenant_id=?` 필수.
5. **장식 3종**(menu_audit_log·schema_migrations.checksum·journey_decision_log) — 무결성 착시.
6. **알고리즘 'sha256' 리터럴 하드코딩 산재**(`SecurityAudit.php:27`·`Crypto.php:81`·`MediaHost.php:93`·`Migrate.php:50`) — Registry/Policy 이관 필요(Rotation 불가 상태).

## 4. 대안 (Considered)

- **A. 지금 Hash Chain 구현** — 기각. 해시할 Ledger Entry·Decision Record 부재(D-4)·빈 파이프 위 장식. RP-002 위반.
- **B. `SecurityAudit`를 그대로 Decision Ledger Chain으로 전용** — 부분 채택(패턴 참조·D-1). 단 Canonicalization/Head-CAS/tenant/tx경계 미달로 직접 전용 금지·보강 필요.
- **C. 설계 명세만(코드 0)+실존 primitive 조립계획+선행 전제 명문화** — **채택**. 06-A 계열 일관.

## 5. 귀결 (Consequences)

- (+) `SecurityAudit` 체인+verify 패턴·`Crypto` SHA-256/HMAC·`MediaHost` CAS·서버UTC의 정본 지위·조립 경로 확정("발명 아닌 조립").
- (+) 실 위험 6건(특히 Canonicalization 부재·fail-open·Head-CAS·하드코딩) 문서화·장식 오인 방지·★Weak Algorithm "부재"의 정직 판정(오탐 예방).
- (+) Canonicalization/Field Set/Digest Envelope/Verification/Tamper/Rotation 72편 per-entity 설계 정본 확보 → 선행 Ledger 신설 시 즉시 착수 기반.
- (−) 이번 차수 런타임 기능 증가 0.
- (→) 다음: 선행 Immutable Ledger·Decision Core 실구현 → Cryptographic Hash Chain 실 엔진 → **EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding Governance**(스펙 대기).

## 6. 규율 준수

Golden Rule(Extend not Replace) · 중복 Hash Utility/Canonicalization/Verification Engine 금지 · 무후퇴(Canonicalization 보강=개선 예외) · "결론의 근거도 재실증"(해시체인 존재≠tamper-evident·Weak Algorithm 부재도 코드 정독으로 확정) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002 · 장식 오인 금지 · GROUND_TRUTH 외 인용 금지.
