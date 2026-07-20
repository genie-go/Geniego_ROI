# DSAR — Approval Fabric Evidence (Part 3-16 §19·§31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §19·§31)

`APPROVAL_FABRIC_EVIDENCE`는 fabric이 authorization 결정을 노드간 분산·동기화·복구하는 과정에서 발생하는 사실(fact)을 불변 기록으로 남긴다. SPEC §19가 요구하는 evidence 종류:

- **Distribution History**: 정책/스냅샷이 어느 노드로 언제 배포됐는지의 이력.
- **Sync Evidence**: 노드간 상태 동기화 성공/실패·delta 증거.
- **Failover History**: region/replica 장애 전환 이력.
- **Health Events**: fabric 구성요소 상태 변화 이벤트.
- **Routing Decision**: 요청이 어느 노드/정책 경로로 라우팅됐는지의 결정 기록.

§31(immutable)은 특히 **Immutable Distribution History**를 tamper-evident 해시연쇄로 봉인하도록 요구한다.

## 2. Substrate 매핑

| SPEC 요구 (§19/§31) | 라이브 substrate | 상태 |
|---|---|---|
| 단일노드 append-only 감사 기록 | `SecurityAudit.php:4-33` 해시체인 | PARTIAL 참고 |
| 해시 계산·연쇄 preimage | `SecurityAudit.php:8`·`:27` | 참고 |
| tamper-evident verify 계약 | `SecurityAudit.php:35-40` | 참고 |
| Distribution/Sync/Failover/Routing 노드간 증거 | 없음 — 노드간 fabric 미존재 | ABSENT(순신설) |
| Health Events(fabric 구성요소) | 없음 — fabric 구성요소 부재 | ABSENT |

## 3. 설계 계약

- **재활용**: `SecurityAudit.php:4-33`의 단일노드 append-only 해시체인을 **fabric-native evidence**로 확장한다. 기존 `:8`/`:27` 해시연쇄 preimage 규약과 `:35-40` verify 계약을 evidence 체인에 동일 적용(재구현 금지).
- **순신설 영역**: Distribution History·Sync Evidence·Failover History·Routing Decision은 라이브에 대응물이 전무 — 노드간 배포 증거는 순신설. 각 evidence 레코드는 `prev_hash`/`node_hash`로 연쇄해 §31 immutable 충족.
- **Immutable Distribution History**: 배포 이벤트마다 (source_node, target_node, snapshot_version, ts, delta_digest) 봉인. verify는 `SecurityAudit.php:35-40` 동형.
- **한계**: `SecurityAudit`는 **단일노드 감사**이며 노드간 배포증거를 제공하지 않는다 — 그 간극이 순신설 범위.

## 4. 판정

**PARTIAL 참고 + 순신설.** `SecurityAudit.php:4-33`(`:8`·`:27`·`:35-40`)=단일노드 append-only 감사 해시체인을 fabric-native evidence 체인으로 **확장**할 수 있으나, Distribution/Sync/Failover/Routing 등 노드간 배포증거는 라이브에 전무하여 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(fabric 노드 실재 선행).
