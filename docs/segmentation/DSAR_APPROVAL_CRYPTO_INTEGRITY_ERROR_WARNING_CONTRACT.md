# DSAR — Cryptographic Integrity: Error & Warning Contract (§64/§65)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Error/Warning Contract는 전량 신규(현행 무결성 오류 코드 체계 부재). Error=차단, Warning=비차단 관찰.

## 1. 원문 전사 (Canonical Contract)

### §64 Error Contract (40여종, 원문 전사)

APPROVAL_CRYPTO_INTEGRITY_REGISTRY/POLICY/DEFINITION/VERSION_NOT_FOUND · _VERSION_INACTIVE · HASH_ALGORITHM_NOT_FOUND/NOT_ALLOWED/DEPRECATED/WEAK · CANONICALIZATION_POLICY_NOT_FOUND · CANONICALIZATION_VERSION_MISSING · CANONICAL_FIELD_SET_NOT_FOUND/VERSION_MISSING · CANONICAL_PROJECTION_FAILED · CANONICAL_VALUE_TYPE_UNSUPPORTED · CANONICAL_UNICODE/DECIMAL/MONETARY/TIMESTAMP/ENCODING_INVALID · LEDGER_PREVIOUS_DIGEST_MISSING · LEDGER_GENESIS_MARKER_INVALID · LEDGER_PAYLOAD/CONTEXT/REFERENCE/ENTRY_DIGEST_MISMATCH · LEDGER_CHAIN_BREAK · LEDGER_HEAD/CHECKPOINT_DIGEST_MISMATCH · DECISION_SNAPSHOT/EVIDENCE/AUDIT/OUTBOX/ATTACHMENT_MANIFEST/CORRECTION/SUPERSESSION_DIGEST_MISMATCH · LEDGER_CROSS_TENANT_CHAIN · HASH_ALGORITHM_DOWNGRADE_BLOCKED · LEDGER_VERIFICATION_FAILED · LEDGER_TAMPER_DETECTED · LEDGER_TAMPER_RESPONSE_REQUIRED · CRYPTO_INTEGRITY_RUNTIME_BLOCKED.

### §65 Warning Contract (11종, 원문 전사)

HASH_ALGORITHM_DEPRECATION/ROTATION_WARNING · CANONICALIZATION_WARNING · FIELD_SET_DRIFT_WARNING · LEDGER_VERIFICATION/CHECKPOINT_WARNING · LEDGER_LEGACY_HASH_WARNING · LEDGER_DUAL_DIGEST/MIGRATION/TAMPER_WARNING · LEDGER_MANUAL_REVIEW_REQUIRED.

의미: Error는 처리를 중단(fail-closed)하고 응답에 안정적 코드를 제공한다. Warning은 처리를 계속하되 관찰·감사·후속 검토를 트리거한다. Critical Ledger/Payment/Settlement/Contract/Legal/Compliance는 Digest 불일치를 Warning으로 강등 금지(§5.11).

## 2. 기존 구현 대조 (GROUND_TRUTH)

| 계열 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| REGISTRY/POLICY/DEFINITION/VERSION_NOT_FOUND·INACTIVE | **부재** | Registry/Policy/Definition/Version 구조 자체 부재 |
| HASH_ALGORITHM_NOT_FOUND/NOT_ALLOWED/DEPRECATED/WEAK | **부재** | Algorithm Registry 부재·`'sha256'` 하드코딩(`SecurityAudit.php:27`) |
| CANONICALIZATION_*·FIELD_SET_*·PROJECTION_FAILED | **부재** | canonical serializer 0·Field Set 개념 부재 |
| CANONICAL_UNICODE/DECIMAL/MONETARY/TIMESTAMP/ENCODING_INVALID | **부재** | 정규화 유틸 부재 |
| LEDGER_PREVIOUS_DIGEST_MISSING | **부분(우회)** | 오류를 코드 아닌 `'GENESIS'` fail-open으로 흡수(`SecurityAudit.php:39-40`) |
| LEDGER_GENESIS_MARKER_INVALID | **부재** | Versioned Genesis 검증 부재 |
| LEDGER_ENTRY_DIGEST_MISMATCH · LEDGER_CHAIN_BREAK | **부분(양호)** | verify가 `{ok:false, broken_at}` 반환(`SecurityAudit.php:56-68`) — 그러나 안정적 error code 아닌 boolean/정수 |
| LEDGER_HEAD/CHECKPOINT_DIGEST_MISMATCH | **부재** | Head/Checkpoint 부재 |
| DECISION_SNAPSHOT/EVIDENCE/AUDIT/OUTBOX/... _MISMATCH | **부재** | 해당 Digest 계층·대상 Ledger 부재 |
| LEDGER_CROSS_TENANT_CHAIN | **부재** | tenant 술어 없음(전역 체인) |
| HASH_ALGORITHM_DOWNGRADE_BLOCKED | **부재** | Downgrade 게이트 부재 |
| LEDGER_VERIFICATION_FAILED · TAMPER_DETECTED · TAMPER_RESPONSE_REQUIRED | **부분/부재** | verify 실패는 boolean; Tamper Incident/Response 개념 부재 |
| CRYPTO_INTEGRITY_RUNTIME_BLOCKED | **부재** | Runtime Guard 부재(별도 문서) |
| §65 Warning 전 11종 | **부재** | Warning 체계·LEGACY_HASH_WARNING·DUAL_DIGEST/MIGRATION_WARNING 전무 |

## 3. 판정

- **Verdict: 전량 신규.** 실 verify(`SecurityAudit.php:56-68`)가 `{ok, checked, broken_at}` 구조로 Entry Mismatch·Chain Break를 표현하나, 이는 **안정적 Error Contract 코드가 아니다**(boolean/정수 반환·error taxonomy 부재). §64 40여종·§65 11종 코드 체계 전무.
- **★정직 기술**: HASH_ALGORITHM_WEAK/DEPRECATED·LEGACY_HASH_WARNING은 현행 무결성 경로에 Weak Algorithm 사용이 0이므로 **예방적 코드**(현행 발화 대상 없음). 오탐 방지 — Weak Algorithm 오류를 "현행 위반"으로 계상 금지.
- **fail-open 위험**: `SecurityAudit.php:32` catch no-op·`:39-40` GENESIS-on-error는 LEDGER_PREVIOUS_DIGEST_MISSING/CHAIN_BREAK를 error로 표면화하지 않고 흡수 → §5.11 위배. 신규 Contract에서 이를 fail-closed error로 승격.
- cover: **0** (Error/Warning 코드 taxonomy 부재. verify 반환 구조만 부분 근거).
- 선행: 대상 Ledger/Decision 부재 → SNAPSHOT/EVIDENCE/AUDIT/OUTBOX/CORRECTION/SUPERSESSION 계열은 결합 대상 없음(BLOCKED_PREREQUISITE).

## 4. 확장·구현 방향 (설계)

- **Error taxonomy 신규**: §64 40여종을 안정적 문자열 코드로 정의(Registry/Policy/Definition/Version·Algorithm·Canonicalization·Field Set·Projection·Value·Previous/Genesis·Entry/Chain/Head/Checkpoint·Snapshot~Supersession·Cross-Tenant·Downgrade·Verification·Tamper·Runtime). 각 코드에 severity·차단범위(Commit/Append/Read/Workflow)·복구 절차 매핑.
- **Warning taxonomy 신규**: §65 11종. Warning은 처리 계속 + Verification Audit(§55)·Manual Review(§46) 트리거. LEGACY_HASH_WARNING·DUAL_DIGEST/MIGRATION_WARNING은 Rotation/Migration Foundation(§57~§59)과 결합.
- **Severity 게이트**: Critical Profile(Payment/Settlement/Legal/Compliance)의 ENTRY/CHAIN/HEAD/CHECKPOINT_MISMATCH는 Error로 고정(Warning 강등 금지·§5.11). Legacy Untrusted·Deprecation은 Warning 허용.
- **실 verify 승격(무후퇴 예외=개선)**: `SecurityAudit.php:56-68`의 `{ok:false, broken_at}`을 LEDGER_ENTRY_DIGEST_MISMATCH/LEDGER_CHAIN_BREAK error code로 매핑. fail-open 2지점(`:32`·`:39-40`)을 LEDGER_PREVIOUS_DIGEST_MISSING·TAMPER_RESPONSE_REQUIRED로 표면화.
- **무후퇴 보장**: 기존 verify 소비처(`AdminGrowth.php:1429`)는 boolean 소비 유지하되 error code는 부가(계약 확장·회귀 없음).
- **실 구현은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_API_CONTRACT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
