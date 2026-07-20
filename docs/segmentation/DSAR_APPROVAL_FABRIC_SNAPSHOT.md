# DSAR — Approval Fabric Snapshot (Part 3-16 §18·§31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §18·§31)

`APPROVAL_FABRIC_SNAPSHOT`은 authorization fabric의 특정 시점 상태를 불변(immutable)으로 봉인하는 산출물이다. SPEC §18은 스냅샷이 다음을 원자적으로 포착하도록 요구한다:

- **Policy State**: 유효 정책 집합의 결정론적 다이제스트(rule/scope/version 집합).
- **Cluster State**: fabric 참여 노드(region/replica) 구성·membership·역할.
- **Context State**: 스냅샷 생성 시점의 tenant/entity/attribute 컨텍스트 경계.
- **Version**: 단조 증가 스냅샷 버전(monotonic, gap 없음).
- **Timestamp**: 신뢰 가능한 생성 시각(preimage 보존 필수 — §31).

§31(immutable)은 스냅샷이 생성 후 변경 불가·해시 연쇄로 tamper-evident해야 함을 규정한다.

## 2. Substrate 매핑

| SPEC 요구 (§18/§31) | 라이브 substrate | 상태 |
|---|---|---|
| Fabric Snapshot store (Policy/Cluster/Context) | 없음 — authz는 단일 PHP/MySQL 모놀리스 | ABSENT |
| Immutable 봉인·해시연쇄 | `SecurityAudit.php:4-33` 해시체인(단일노드 append-only) | PARTIAL 참고 |
| 해시 계산·검증 preimage | `SecurityAudit.php:8`·`:27`·`:35-40`(verify 기준) | 참고만 |
| 단조 Version·Timestamp | 없음 (fabric version 개념 부재) | ABSENT |
| Cluster membership 상태 | 없음 — 노드간 fabric 미존재 | ABSENT |

## 3. 설계 계약

- **저장 모델**: `authz_fabric_snapshot`(신설) — `snapshot_version`(monotonic)·`policy_digest`·`cluster_digest`·`context_digest`·`created_ts`(preimage 보존)·`prev_hash`·`node_hash`. §31 immutable은 `SecurityAudit.php:4-33` 해시연쇄 패턴을 **확장**하여 신설(재구현 금지·기존 엔진 확장).
- **결정론**: 동일 fabric 상태 → 동일 다이제스트. Policy/Cluster/Context 각각을 정규화(canonical sort) 후 해시.
- **검증**: `SecurityAudit.php:35-40` verify 계약과 동형(同型)의 chain-verify를 스냅샷 체인에 적용. verify 실패 시 스냅샷은 NOT_CERTIFIED.
- **선행 의존**: Cluster/Context State는 fabric(§16 전반)이 실재해야 채워지므로, 실 데이터는 BLOCKED_PREREQUISITE.

## 4. 판정

**ABSENT.** 라이브에 authorization fabric snapshot은 존재하지 않는다(단일 PHP/MySQL 모놀리스). 유일한 재활용 참고는 `SecurityAudit.php:4-33`(`:8`·`:27`·`:35-40`) 단일노드 해시체인이며, 이를 **확장**해 Immutable Snapshot을 신설한다. 노드간 cluster 상태·fabric version은 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
