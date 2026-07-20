# DSAR — Approval Mesh Health (Part 3-24 §2·§13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §13 Health Model)

`APPROVAL_MESH_HEALTH`는 Universal Governance Mesh의 **건강 모델(Health Model)** 이다. 계약상 역할:

- Mesh를 구성하는 각 계층의 건강을 표준 신호로 판정한다: **Node Health**(개별 authz 노드), **Cluster Health**(노드 집합), **Region Health**(리전 단위), **Synchronization Health**(정책 epoch 전파 지연/불일치), **Trust Health**(신뢰 앵커·경로 유효성).
- 로컬 노드 건강 신호를 **mesh 수준으로 집계(aggregation)** 하고, 노드 간 **heartbeat**로 활성/고립을 판정한다.
- 목표는 "Mesh 어느 부분이 건강하지 않아 authz 결정을 신뢰할 수 없는가"를 조기에 노출하는 것이다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| 단일 노드 프로세스/시스템 헬스 | 존재 | **PARTIAL** | `SystemMetrics.php:14-30`·`:16-19`·`:32` |
| 리소스/부하 메트릭 수집 | 존재 | **PARTIAL** | `SystemMetrics.php:36-47`·`:50-55` |
| 헬스 엔드포인트(liveness) | 존재 | **PARTIAL** | `Health.php:27`·`:47`·`:72`·`:81` |
| DB/의존성 연결성 체크 | 존재 | **PARTIAL** | `Health.php:56`·`:99` |
| Cluster/Region Health 집계 | 없음 | **ABSENT** | grep 0 — 단일 호스트 |
| 노드 간 heartbeat / Sync Health | 없음 | **ABSENT** | 복수 노드·리전 부재 |
| Trust Health(신뢰경로 상태) | 없음 | **ABSENT** | Trust Fabric substrate 부재(§Trust 정합) |

라이브 건강 신호는 **단일 노드 범위**에 완결된다. `SystemMetrics.php:14-30`·`:32`은 한 호스트의 시스템 메트릭을, `Health.php:27`·`:72`은 그 노드의 liveness와 의존성 연결성(`:56`·`:99`)을 판정한다. 이는 관측적으로 유효하나 **단일노드 health**이며, mesh 집계·heartbeat·Sync/Trust Health가 관장할 복수 노드/리전이 부재하다.

## 3. 설계 계약 (규칙)

- **R1 (계층별 신호)**: Node/Cluster/Region/Sync/Trust Health는 각각 명시 신호로 판정하며, 단일노드 신호를 mesh 건강으로 오승격 금지. 기존 노드 헬스(`SystemMetrics.php:14-30`·`Health.php:27`)를 Node Health 신호 소스로 확장한다.
- **R2 (집계 보수성)**: mesh 건강은 최악 노드 우선(pessimistic aggregation) — 일부 리전 degraded면 Mesh를 GREEN으로 표기 금지.
- **R3 (Sync Health 정합)**: 정책 epoch 전파 지연/불일치는 Sync Health로 노출하며, Registry epoch 계약(§Registry R1)과 정합한다.
- **R4 (Fail-closed 연동)**: Health가 BLOCKED/UNKNOWN인 노드의 authz 결정은 신뢰 강등되며, 미지 건강을 "정상"으로 승격 금지.
- **R5 (중복 엔진 금지)**: 노드 헬스는 기존 `SystemMetrics`·`Health` 계약을 확장하며, 별도 헬스 수집엔진을 난립시키지 않는다.

## 4. KEEP_SEPARATE

해당 없음. 본 §는 authz mesh 인프라 건강 계약이며, 데이터/ML 층의 "health/monitoring"(예: `ModelMonitor`의 모델 드리프트 건강)과 개념·대상이 다르다 — 그것은 데이터 신뢰·모델 상태이지 authz 노드 건강이 아니다.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_HEALTH`는 **PARTIAL** — 단일 노드 health(`SystemMetrics.php:14-30`·`:32`·`Health.php:27`·`:72`)는 실재하나 **단일 호스트 범위**다. Cluster/Region Health 집계·노드 간 heartbeat·Synchronization/Trust Health는 **순신설(greenfield)** 대상이며, 단일노드 health를 mesh health로 오판 금지. 코드 변경 0 · 선행(복수 노드/리전 substrate) 부재로 **BLOCKED_PREREQUISITE · NOT_CERTIFIED**.
