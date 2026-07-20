# DSAR — Approval Mesh Recovery (Part 3-24 §2·§14)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §14 Recovery Coordinator)

`APPROVAL_MESH_RECOVERY`는 Universal Governance Mesh의 **복구 조정자(Recovery Coordinator)** 다. 계약상 역할:

- Mesh 계층 장애로부터의 복구를 조율한다: **Node Recovery**(고립·실패 노드 재합류), **Cluster Recovery**(정족수 상실 클러스터 재구성), **Region Recovery**(리전 장애 failover/failback), **Synchronization Recovery**(epoch 불일치 재수렴), **Trust Recovery**(폐기/손상된 신뢰 앵커·경로 재확립).
- 복구 과정을 **감사 가능한 append-only 이력**으로 남겨, 어떤 상태에서 어떤 순서로 재수렴했는지 사후 재구성 가능하게 한다.
- 목표는 "장애 이후 Mesh가 안전한 정본 authz 상태로 되돌아오되, 복구 과정 자체가 격차·특권 상승을 유발하지 않는다"는 불변식이다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| Mesh Recovery Coordinator | 없음 | **ABSENT** | grep 0 — 조정 대상 노드/클러스터 부재 |
| Node/Cluster/Region Recovery | 없음 | **ABSENT** | 복수 노드·리전 물리 대상 부재 |
| Synchronization Recovery(epoch 재수렴) | 없음 | **ABSENT** | 분산 epoch 전파 substrate 부재 |
| Trust Recovery(신뢰 재확립) | 없음 | **ABSENT** | Trust Fabric 부재(§Trust 정합) |
| 복구 이력 append-only 기저(참고) | 부분(감사 해시체인) | **참고 PARTIAL** | `SecurityAudit.php:27`·`:63-64`(append-only 해시체인, mesh-recovery용 아님) |

라이브에는 **Mesh 복구를 조율할 대상 자체가 없다** — 단일 호스트 모놀리스이므로 재합류할 노드, 재구성할 클러스터, failover할 리전이 존재하지 않는다. 복구 계약에 유일하게 참고 가능한 실재물은 감사 이력의 append-only 해시체인(`SecurityAudit.php:27`·`:63-64`)뿐이며, 이는 **복구 이력을 기록할 기저**로 참조할 수 있을 뿐 복구 조정자 자체는 아니다.

## 3. 설계 계약 (규칙)

- **R1 (안전 재수렴)**: 복구는 항상 정본 epoch(§Registry R1)로 수렴해야 하며, 복구 중 노드가 임의 상태를 정본으로 확정 금지.
- **R2 (특권 무상승)**: 복구 과정이 어떤 주체에게도 평시보다 높은 권한을 부여하지 않는다 — 복구 경로는 deny-by-default를 유지한다.
- **R3 (append-only 이력)**: 복구 단계·순서·결과는 오직 추가만 가능하며, 기존 감사 해시체인 계약(`SecurityAudit.php:27`·`:63-64`)을 확장 기저로 삼는다(병렬 체인 신설 금지).
- **R4 (Fail-closed)**: 복구 미완/불확실 구간의 authz 결정은 거부 우선이며, 미복구 상태를 "정상"으로 승격 금지.
- **R5 (테넌트 격리)**: 복구 조정은 테넌트 경계를 넘지 않으며, 공용 스코프는 `__shared__` 명시 표기로만 다룬다.

## 4. KEEP_SEPARATE

해당 없음. 본 §는 authz mesh 인프라 복구 계약이며, 데이터/백업/DR 절차(DB restore·dist swap)나 마케팅 자동화 롤백과 개념·대상이 다르다 — 그것은 데이터/배포 복구이지 authz mesh 상태 재수렴이 아니다.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_RECOVERY`는 **ABSENT** — Mesh Recovery Coordinator·Node/Cluster/Region/Synchronization/Trust Recovery는 grep 0의 **순신설(greenfield)** 대상이다. 유일한 참고물은 복구 이력 기저가 될 수 있는 감사 append-only 해시체인(`SecurityAudit.php:27`·`:63-64`)이나, 이는 복구 조정자가 아니다. 관장할 복수 노드/리전 substrate가 부재하므로 코드 변경 0 · **BLOCKED_PREREQUISITE · NOT_CERTIFIED**.
