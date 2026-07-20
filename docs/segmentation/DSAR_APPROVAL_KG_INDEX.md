# DSAR — Authorization Knowledge Graph Index (Part 3-21 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Knowledge Graph 조회 성능을 위한 **인덱스 계약**을 정의한다. 대상: (a) Node 인덱스 — 노드 식별/타입/테넌트 조회. (b) Edge 인덱스 — 출발/도착 노드·관계 타입 순회. (c) Ontology 인덱스 — 온톨로지 버전·활성 조회. (d) Relationship 인덱스 — 관계 타입·시맨틱 조회. (e) Graph Version 인덱스 — 버전 체인 조회. (f) Snapshot 인덱스 — 스냅샷 시점·digest 조회. 모든 인덱스는 tenant_id 선두 복합으로 격리를 인덱스 레벨에서 강제한다.

## 2. Substrate 매핑

| SPEC 인덱스 | 현 substrate | 근거 file:line | 판정 |
|---|---|---|---|
| Node 인덱스(authz) | — | — | ABSENT |
| Edge 인덱스(authz) | — | — | ABSENT |
| Ontology 인덱스 | — | — | ABSENT |
| Relationship 인덱스 | — | — | ABSENT |
| Graph Version 인덱스 | — | — | ABSENT |
| Snapshot 인덱스 | — | — | ABSENT |
| (참고)마케팅 graph_node/edge 인덱스 | GraphScore | `Db.php:838-839` | KEEP_SEPARATE |

## 3. 설계 계약
- **Node 인덱스**: `(tenant_id, node_type, node_key)` 복합 UNIQUE + `(tenant_id, node_type)` 조회 인덱스. tenant_id 선두는 acl_permission 격리 패턴(`TeamPermissions.php:152-159`) 계승.
- **Edge 인덱스**: `(tenant_id, from_node, rel_type)` 순방향 순회 + `(tenant_id, to_node, rel_type)` 역방향 순회. Relationship Integrity(§30) UNIQUE와 정합.
- **Ontology 인덱스**: `(tenant_id, ontology_name, version)` + 활성 버전 부분 인덱스.
- **Relationship 인덱스**: `(tenant_id, rel_type)` 시맨틱 필터.
- **Graph Version 인덱스**: `(tenant_id, graph_version)` 단조 조회 + prev_hash 체인 탐색 보조.
- **Snapshot 인덱스**: `(tenant_id, snapshot_ts)` + `(tenant_id, snapshot_digest)`.
- 현 DB=순수 MySQL(`Db.php:126-127`) — 상기 인덱스 전부 신설 DDL로 생성, 자가치유 `ensureTables` 패턴 준용.

## 4. KEEP_SEPARATE
- `graph_node`/`graph_edge` 및 그 인덱스(`Db.php:838-839`)는 **마케팅 GraphScore** 전용. authz KG 인덱스와 물리 분리·재사용 금지. 동명 인덱스 존재를 authz PRESENT로 오판 금지.

## 5. 판정
**ABSENT**. authz Knowledge Graph 인덱스는 **전무**하다. 유일하게 존재하는 `graph_node`/`graph_edge` 인덱스(`Db.php:838-839`)는 마케팅으로 KEEP_SEPARATE·인용 대상 아님. 본 §31 인덱스 전 항목 **순신설**이며 §30(DB Constraint) 스키마에 종속 — 선행 §30 미실현 시 인덱스 대상 부재. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
