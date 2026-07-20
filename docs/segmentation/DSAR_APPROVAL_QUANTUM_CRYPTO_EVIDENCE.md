# DSAR — Approval Crypto Evidence (Part 3-23 §18)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §18)

`APPROVAL_CRYPTO_EVIDENCE`는 crypto migration·규정준수를 증명하는 tamper-evident 증거 레코드다. 스냅샷(§17)이 "지금 상태"라면 evidence는 "무엇이 언제 어떻게 바뀌었는가"의 검증 가능한 이력이다. §29 Immutable Crypto Inventory History 계약의 실체.

| 구획 | 계약 내용 | 예시 필드 |
|------|-----------|-----------|
| Migration Evidence | classic→PQC 이관 각 단계 기록 | `from_algo`, `to_algo`, `migrated_at`, `actor` |
| Compliance Evidence | 규정(FIPS/NIST PQC) 부합 증명 | `standard_ref`, `attested_by`, `attest_ts` |
| Risk Assessment | 잔존 양자 취약 자산 평가 | `asset_ref`, `quantum_risk`(high/med/low), `remediation_due` |
| Validation | 증거 무결성 검증 결과 | `chain_verify:bool`, `verified_ts` |
| Certificate Chain | 인증서 체인 이력 증거 | `cert_fingerprint`, `issuer_ref`, `superseded_by` |

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| Immutable 이력 체인 | SHA-256 해시체인 head·append (`SecurityAudit.php:27`·`:56-68`) | PARTIAL-substrate |
| Validation(verify) | 해시체인 verify 로직 (`SecurityAudit.php:43-53`·`:51`) | PARTIAL-substrate |
| 2차(보조) 감사 체인 | Admin 메뉴 감사 체인 (`AdminMenu.php:182`·`:197`·`:214`) | PARTIAL-substrate |
| Migration/Compliance/Risk Evidence | 없음 (crypto 이관 이력 부재) | ABSENT |
| Certificate Chain | 없음 | ABSENT |

증거 봉인·검증 계층은 실재한다: `SecurityAudit.php:27`(체인 head)·`:56-68`(append+prev 연결)·`:43-53`/`:51`(verify)가 tamper-evident 기반. `AdminMenu.php:182`의 2차 체인은 관리 조작 감사에 이미 사용 중으로, crypto evidence의 보조 앵커로 확장 가능(`:197`·`:214` 검증 지점). 그러나 crypto 특화 evidence 페이로드(migration/compliance/risk/certificate)는 grep 0 — 순신설.

## 3. 설계 계약

1. **Evidence 페이로드는 해시체인 위에 얹는다**: 각 evidence 레코드를 `SecurityAudit.php:56-68` append 규약으로 봉인해 사후 변조 불가.
2. **Validation은 기존 verify 재사용**: 증거 무결성 검증 정본은 `SecurityAudit.php:43-53`·`:51` verify 경로 — crypto 전용 verify를 새로 만들지 않고 payload type만 확장.
3. **2차 앵커는 관리 조작 경로**: crypto 상태를 관리자가 변경하는 사건은 `AdminMenu.php:182`·`:197`·`:214` 감사 체인에도 교차 기록해 이중 tamper-evidence.
4. **Migration history는 순신설**: from/to algo·compliance attest·quantum risk 필드는 신규 스키마. 코드 0.

## 4. KEEP_SEPARATE

- ML drift evidence(`ModelMonitor.php:18-19`·`:42-43`)는 모델 도메인 증거로 crypto evidence와 혼입 금지.
- 정산 reconciliation 증거(`PgSettlement.php`·`Wms.php:2160`)는 재무 이력으로 분리 유지.

## 5. 판정

**PARTIAL-substrate** — 불변 봉인·verify 계층은 `SecurityAudit.php:27`·`:56-68`·`:43-53`(+`AdminMenu.php:182` 2차 체인)로 재사용하되, crypto migration/compliance/risk/certificate evidence 페이로드는 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 Crypto Snapshot §17 부재).
