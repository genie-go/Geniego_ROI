# DSAR — Approval Fabric Cluster Node (Part 3-16 §2·§14·§32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_CLUSTER_NODE`는 Unified Authorization Fabric에서 정책결정(PDP)·정책집행(PEP)을 수행하는 **논리 노드**를 fabric에 등록하고, 그 생사(liveness)·준비도(readiness)·부하를 헬스 신호로 표면화하는 substrate 계약이다. 계약 요소:

- **Node Identity**: `node_id`, `role∈{PDP, PEP, PDP+PEP}`, `capabilities`(평가 가능한 정책 클래스), `version`.
- **Registration/Deregistration**: 노드가 fabric membership에 join/leave하는 생명주기. 정족수(quorum)·멤버십 뷰가 전제.
- **Health & Heartbeat**: `readiness`(정책 로드 완료·의존성 도달), `liveness`(주기적 heartbeat), `drain`(신규 결정 거부·기존 배수).
- **Load/Capacity Signal**: 노드별 결정 처리율·backlog를 fabric router로 노출.

## 2. Substrate 매핑 (라이브 실측)

| Fabric 계약 요소 | 라이브 substrate | 상태 |
|---|---|---|
| Node membership/registry | 없음 — 단일 프로세스 `$app` (`backend/public/index.php:23`, 종단 `:686`) | **ABSENT** |
| PDP/PEP 노드 분리 | 없음 — authz 미들웨어가 동일 요청 스레드 인라인 (`index.php:99-122`, `:423-461`) | **ABSENT** |
| Cluster quorum/membership view | 없음 — `composer.json:5-13` 클러스터/큐/mesh 의존 전무 | **ABSENT** |
| Heartbeat/liveness registry | 없음 — 노드 개념 부재 | **ABSENT** |
| Readiness probe | `Health.php:13-26` = 단일 프로세스 self 응답(노드 준비도 아님) | **PARTIAL(비-fabric)** |
| Load/capacity signal | `SystemMetrics.php:60-100`(`:32`, `:67-76`) = 단일노드 self probe(CPU/mem) | **PARTIAL(비-fabric)** |
| 세션/자격 저장 | `Db.php:63-87` 단일 PDO 커넥션 | **ABSENT(공유상태 노드아님)** |

## 3. 설계 계약 (순신설 — 코드 0)

fabric membership plane을 신규 도입한다. `APPROVAL_CLUSTER_NODE` 레코드(`node_id`/`role`/`capabilities`/`version`/`state∈{joining,ready,draining,down}`), heartbeat TTL 기반 liveness, readiness gate(정책 스냅샷 로드 완료 전 결정 거부). router는 `ready` 노드에만 결정을 배정하고 `draining`은 신규 배정에서 제외한다. 정족수 미달 시 fabric은 fail-secure(신규 승인 보류)로 수렴한다. 기존 단일노드 `index.php:23`/`Db.php:63-87`는 이 계약에서 **첫 번째(그리고 현재 유일한) 노드**로 표현되며, 다중 노드는 전부 미래 상태다.

## 4. 판정

**ABSENT.** 라이브 authz는 클러스터 개념 자체가 없는 단일노드 모놀리스다(`index.php:23`·`:686`, `Db.php:63-87`, `composer.json:5-13` 무의존). `Health.php:13-26`·`SystemMetrics.php:60-100`은 **단일노드 self probe**일 뿐 fabric node registry/heartbeat이 아니므로 PRESENT 근거로 인용 금지. Cluster Node substrate는 전부 순신설 대상이며 선행 fabric membership plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
