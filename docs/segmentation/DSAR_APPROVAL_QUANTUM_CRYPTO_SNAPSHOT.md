# DSAR — Approval Crypto Snapshot (Part 3-23 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §17)

`APPROVAL_CRYPTO_SNAPSHOT`는 특정 시점(as-of instant)의 authorization 도메인 암호 자산 상태를 불변(immutable)으로 고정하는 point-in-time capture다. 스냅샷은 다음 5개 하위 구획을 단일 봉인 단위로 포착한다.

| 구획 | 계약 내용 | 예시 필드 |
|------|-----------|-----------|
| Crypto Inventory | 사용 중인 알고리즘·키 소재 목록 | `algo_id`, `key_class`(KEK/DEK/signing), `pqc_ready:bool` |
| Key Status | 키별 활성/만료/폐기 상태 | `key_ref`, `rotation_epoch`, `status`(active/retiring/revoked) |
| Certificate Status | 인증서 유효성·체인 상태 | `cert_fingerprint`, `not_after`, `chain_valid` |
| Migration Progress | classic→PQC 이관 진척도 | `migrated_count`, `pending_count`, `hybrid_mode:bool` |
| Timestamp | as-of 시각·봉인 시각 | `as_of_ts`, `sealed_ts` |

스냅샷은 §29 Immutable 계약에 따라 **작성 후 변경 불가** — 정정은 새 스냅샷을 append하고 이전 스냅샷을 supersede 참조로만 표시한다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| Crypto Inventory | 없음 (알고리즘 자산 카탈로그 부재) | ABSENT |
| Key Status | KEK 회전 로직 존재하나 상태 스냅샷 아님 (`Crypto.php:133-148`) | ABSENT(참고만) |
| Certificate Status | 없음 | ABSENT |
| Migration Progress | 없음 (PQC 이관 트래킹 부재) | ABSENT |
| Immutable 봉인 | SHA-256 해시체인 (`SecurityAudit.php:27`·`:56-68`) | PARTIAL-substrate |

crypto snapshot 자체는 grep 0 — greenfield ABSENT. 유일한 재사용 지점은 불변 봉인 메커니즘으로, `SecurityAudit.php:27`의 체인 head와 `:56-68`의 append·연결 로직을 스냅샷 봉인 substrate로 확장한다. `Crypto.php:84-88`(KEK 파생)·`:108-126`(암호화)·`:121`(GCM tag)·`:133-148`(회전)은 Key Status 구획의 관찰 대상일 뿐 스냅샷 생성기가 아니다.

## 3. 설계 계약

1. **Capture는 read-only 관찰**: 스냅샷 생성기는 Crypto/키 상태를 읽기만 하며 `Crypto.php`의 회전·파생 로직을 절대 변경하지 않는다(비파괴).
2. **봉인은 해시체인 확장**: 각 스냅샷 레코드는 `SecurityAudit.php:56-68` 방식(prev_hash→payload→SHA-256)으로 연결해 tamper-evident. 검증 정본은 `SecurityAudit.php:63`·`:64` prev/hash 필드 규약을 따른다.
3. **§29 Immutable 준수**: 수정 금지·supersede-append only. 정정 스냅샷은 `supersedes` 포인터만 보유.
4. **NOT_CERTIFIED**: 본 §17은 코드 0 · 설계 계약만 확정.

## 4. KEEP_SEPARATE

- ML drift 스냅샷은 별개 도메인 — `ModelMonitor.php:18-19`는 crypto snapshot에 흡수 금지.
- 정산 reconciliation 스냅샷(`PgSettlement.php`·`Wms.php:2160`)은 재무 도메인 불변 기록으로 분리 유지.

## 5. 판정

**ABSENT** — crypto snapshot 부재(grep 0), greenfield 순신설. 단 Immutable 봉인 계층만 `SecurityAudit.php:27`·`:56-68` 해시체인 확장으로 재사용. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 Crypto Inventory foundation 부재).
