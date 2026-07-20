# DSAR — Approval Mesh Snapshot (Part 3-24 §18·§30 Immutable Topology History)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §18·§30)

`APPROVAL_MESH_SNAPSHOT`은 승인 거버넌스 메시(Authorization Universal Governance Mesh)의 특정 시점 위상(topology) 전체를 불변(immutable)하게 고정한 관측 단위다. 하나의 스냅샷은 다음 필드를 포함한다.

- **Mesh Identity**: mesh 전역 식별자 + 논리 버전.
- **Node State[]**: 각 거버넌스 노드(region-local 정책 집행점)의 상태(healthy/degraded/isolated).
- **Region State[]**: 지역(region) 단위 가용성·정책 동기화 상태.
- **Policy Version**: 스냅샷 시점에 각 노드가 보유한 authorization policy 버전 벡터.
- **Timestamp**: 관측 확정 시각(불변 앵커).

§30(Immutable Topology History)은 이 스냅샷 시퀀스를 append-only로 누적하여 "언제 어느 노드가 어떤 정책 버전으로 어떤 상태였는가"를 사후 위·변조 불가하게 재구성할 것을 요구한다.

## 2. Substrate 매핑

| SPEC 요구 | 기존 substrate | 상태 | 근거 |
|---|---|---|---|
| Mesh 위상 스냅샷 객체 | 없음 (grep 0) | ABSENT-greenfield | 코드/스키마 부재 |
| Node State / Region State 집계 | 없음 | ABSENT-greenfield | 코드/스키마 부재 |
| Policy Version 벡터 | 없음 (mesh 차원) | ABSENT-greenfield | 코드/스키마 부재 |
| Immutable Topology History (append-only 불변) | SecurityAudit 해시체인 | PARTIAL-substrate(확장) | `SecurityAudit.php:27` 체인 링크·`:63-64` verify |
| 불변 확정 시각 앵커 | SecurityAudit 이벤트 ts | 참고 | `SecurityAudit.php:27` |

## 3. 설계 계약

- 스냅샷 자료구조(Mesh/Node/Region State + Policy Version 벡터 + Timestamp)는 **순신설**한다. 기존 코드에 mesh 위상 개념이 없으므로 확장 대상 자체가 없다.
- §30 불변성 요구는 신규 스토어를 별도로 세우지 않고 **`SecurityAudit.php:27`의 해시체인 링크 구조를 확장**하여 스냅샷 확정 이벤트를 append-only로 봉인한다. 무결성 검증은 `SecurityAudit.php:63-64`의 verify 경로를 재사용해 스냅샷 시퀀스가 tamper-evident 함을 보장한다.
- 스냅샷은 관측 전용(read-model)으로, 정책 집행·평가 로직을 포함하지 않는다. 집행은 상위 파트의 authorization 계층이 담당하며 본 스냅샷은 그 결과 위상만 고정한다.
- topology history는 SecurityAudit 이벤트와 논리적으로 분리된 mesh-topology 도메인 레코드로 표현하되, 불변 봉인만 해시체인 substrate에 위임한다.

## 4. KEEP_SEPARATE

- ML drift/model 관측(`ModelMonitor.php:18-19`)은 승인 메시 위상과 무관 — 편입 금지.
- 정산 도메인(`PgSettlement.php`)은 별도 트랜잭션 무결성 경계 — mesh snapshot에 흡수 금지.

## 5. 판정

**ABSENT-greenfield**. Mesh snapshot 자료구조·Node/Region State·Policy Version 벡터는 grep 0으로 실재하지 않는다(순신설). §30 Immutable Topology History의 불변성만 `SecurityAudit.php:27`·`:63-64` 해시체인을 확장하는 PARTIAL-substrate로 충족한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 mesh 도메인 부재).
