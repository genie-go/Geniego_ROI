# DSAR — Authorization Quantum-Ready Database Constraint (Part 3-23 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Part 3-23 §29는 Quantum-Ready(PQC) 권한 아키텍처의 **데이터 무결성 제약(Database Constraint)** 5축을 규정한다:
(a) **Immutable Crypto Inventory History** — 암호 자산 인벤토리 변경의 추가전용 이력(수정·삭제 불가).
(b) **Immutable Migration History** — 고전→PQC 마이그레이션 단계별 불변 기록.
(c) **Key Version Integrity** — 키 버전 단조 증가·재사용 금지·롤백 방지 제약.
(d) **Certificate Chain Integrity** — 인증서 체인(root→intermediate→leaf) 참조 무결성.
(e) **Tenant Isolation** — 모든 crypto 자산·키·인증서·마이그레이션 기록의 테넌트 경계 강제.

## 2. Substrate 매핑
| §29 제약 | 현행 substrate | 근거(file:line) | 상태 |
|---|---|---|---|
| Tenant Isolation | api_key tenant 컬럼 기반 격리 | `Db.php:945` | PARTIAL(재사용 가능) |
| Immutable Crypto Inventory History | SecurityAudit SHA-256 append-only 해시 체인 | `SecurityAudit.php:27`·`:43-53` | PARTIAL(체인 기판 존재·crypto 자산 스키마 부재) |
| Immutable Migration History | 동일 SecurityAudit 체인 확장 | `SecurityAudit.php:56-68` | PARTIAL(전용 이벤트 타입 부재) |
| Key Version Integrity | KEK 버전 개념 존재 | `Crypto.php:84-88` | PARTIAL(crypto_asset 관리 테이블 부재) |
| Certificate Chain Integrity | 관리 테이블 전무 | (allowlist 외·기술 서술) | ABSENT(순신설) |

## 3. 설계 계약
- **Tenant Isolation**: 신설 crypto 관리 테이블 전부 `tenant_id` NOT NULL + api_key tenant(`Db.php:945`)와 동일 해석 규칙 재사용. 교차 테넌트 비밀 조회 차단(§32 Cross-Tenant Secret 표적과 정합).
- **Immutable 2축**: 물리 UPDATE/DELETE 금지 대신 SecurityAudit SHA-256 체인(`SecurityAudit.php:27`)을 **정본 append-only 원장**으로 재사용. Inventory/Migration 이벤트는 `:43-53`(append)·`:56-68`(검증) 경로로 봉인. 별도 tamper-evident 엔진 신설 금지(중복 방지).
- **Key Version Integrity**: KEK 버전(`Crypto.php:84-88`)을 단조 증가 제약으로 승격 — 버전 감소·재사용 시 write reject. crypto_asset·key_version 테이블은 grep 0(GT①)이므로 스키마 순신설·§30 인덱스 종속.
- **Certificate Chain Integrity**: 인증서 체인 관리 테이블 순신설. parent_cert_id FK 자기참조 + 만료·폐기 상태 제약. 현행 인증서 관리 substrate 없음(기술 서술).

## 4. 판정
**PARTIAL**. Tenant Isolation(api_key tenant `Db.php:945`)·Immutable 2축(SecurityAudit SHA-256 체인 `SecurityAudit.php:27`·`:43-53`)·Key Version(KEK 버전 `Crypto.php:84-88`)은 재사용 기판 존재. Crypto Inventory 스키마·Migration History 전용 타입·Certificate Chain Integrity는 **순신설**(관리 테이블 grep 0·GT①). 현 DB=api_key(`Db.php:945`). 코드 변경 0 · NOT_CERTIFIED · §30 인덱스 선행.
