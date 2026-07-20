# DSAR — Approval Mesh Evidence (Part 3-24 §19·§30 Immutable Sync Log)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §19·§30)

`APPROVAL_MESH_EVIDENCE`는 메시가 수행한 각 거버넌스 작용(동기화·배포·검증·합의·복구)의 결과를 증거(evidence)로 남기는 불변 레코드다. 필드 계약:

- **Synchronization History**: 노드 간 정책 동기화 시도·완료 이력.
- **Policy Distribution**: authorization policy 버전이 각 노드로 배포된 결과.
- **Trust Validation**: 배포된 정책의 신뢰 검증(무결성·출처) 결과.
- **Consensus Result**: 다노드 간 정책 합의(quorum) 판정 결과.
- **Recovery Result**: degraded/isolated 노드 복구 시도의 결과.

§30(Immutable Sync Log)은 이 evidence 스트림이 append-only·tamper-evident 함을 요구한다.

## 2. Substrate 매핑

| SPEC 요구 | 기존 substrate | 상태 | 근거 |
|---|---|---|---|
| Sync/Distribution/Consensus/Recovery evidence 레코드 | 없음 (mesh 차원, grep 0) | ABSENT-greenfield | 코드/스키마 부재 |
| 불변 append-only 로그 | SecurityAudit 해시체인 | PARTIAL-substrate | `SecurityAudit.php:27` 체인 링크 |
| Trust Validation (무결성 검증) | SecurityAudit verify | PARTIAL-substrate | `SecurityAudit.php:29-31`·`:63-64` |
| topology/sync ledger | 없음 | ABSENT-greenfield | 코드/스키마 부재 |

## 3. 설계 계약

- Synchronization History·Policy Distribution·Consensus Result·Recovery Result 레코드는 mesh 도메인에 부재하므로 **순신설**한다.
- evidence의 불변·검증 요구는 **`SecurityAudit.php:27`의 해시체인**을 mesh-evidence 저장 substrate로 확장한다. 각 evidence 이벤트는 체인에 링크되어 append-only가 되고, 검증은 `SecurityAudit.php:63-64`의 verify로 무결성을 확인한다.
- Trust Validation 단계는 `SecurityAudit.php:29-31`의 이벤트 기록 경로를 재사용하여 정책 배포의 출처·무결성 판정을 evidence로 봉인한다.
- 단, mesh의 topology/sync ledger(어느 노드가 어느 시점에 무엇을 동기화했는지의 위상 원장)는 SecurityAudit에 존재하지 않으므로 **별도 순신설**한다. SecurityAudit은 불변 봉인만 제공하고, 위상 의미는 신규 ledger가 보유한다.

## 4. KEEP_SEPARATE

- ML consensus/drift(`ModelMonitor.php:18-19`)의 관측 합의는 authorization mesh consensus와 의미가 다름 — 흡수 금지.
- 정산 원장(`PgSettlement.php`)은 금융 트랜잭션 evidence로 mesh evidence와 경계 분리.

## 5. 판정

**PARTIAL-substrate**. evidence 불변 봉인·Trust Validation은 `SecurityAudit.php:27`·`:29-31`·`:63-64` 해시체인 verify를 확장해 충족한다. 그러나 Synchronization History·Consensus Result·Recovery Result 및 topology/sync ledger는 mesh 차원에서 grep 0으로 부재(순신설). 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
