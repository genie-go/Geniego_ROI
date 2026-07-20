# DSAR — Authorization Knowledge Graph Database Constraint (Part 3-21 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Knowledge Graph의 **at-rest 데이터베이스 무결성 제약**을 정의한다. 5대 제약: (a) Immutable Graph Version — 승인된 그래프 버전은 append-only, 사후 변조 불가. (b) Ontology Version Integrity — 온톨로지 스키마 버전의 단조 증가·참조 유효성. (c) Relationship Integrity — 노드 간 관계(edge)의 출발/도착 노드 실재·타입 정합·중복 금지. (d) Snapshot Integrity — 그래프 스냅샷의 내용 해시 봉인·재현 가능. (e) Tenant Isolation — 모든 노드/엣지/온톨로지 레코드의 테넌트 경계 절대 격리.

## 2. Substrate 매핑

| SPEC 제약 | 현 substrate | 근거 file:line | 판정 |
|---|---|---|---|
| Tenant Isolation | acl_permission `tenant_id` 컬럼 | `TeamPermissions.php:152-159`·`:160-166` | PARTIAL(권한 도메인만) |
| Immutable(append-only) | SecurityAudit 해시체인 | `SecurityAudit.php:25-31`·`:51` | PARTIAL(감사 로그만) |
| Graph Version Integrity | — (authz graph_version 테이블 부재) | — | ABSENT |
| Ontology Version Integrity | — (ontology 테이블 부재) | — | ABSENT |
| Relationship Integrity | — (authz relationship/edge 테이블 부재) | — | ABSENT |
| Snapshot Integrity | — (authz graph snapshot 부재) | — | ABSENT |

## 3. 설계 계약
- **Immutable Graph Version**: 승인된 `authz_graph_version` 레코드는 UPDATE/DELETE 금지, 신규 버전은 신규 행. 봉인은 SecurityAudit 해시체인(`SecurityAudit.php:25-31`) 패턴을 준용하여 이전 버전 digest를 다음 버전이 참조(prev_hash 연쇄). 순신설.
- **Ontology Version Integrity**: 온톨로지 버전 단조 증가 제약·활성 버전 유일성(부분 UNIQUE)·참조 온톨로지 존재 FK. 현 DB=순수 MySQL(`Db.php:126-127`)이므로 FK/체크제약 및 트리거로 강제. 순신설.
- **Relationship Integrity**: edge의 (from_node, to_node, rel_type) 3원 UNIQUE, 양단 노드 실재 FK, self-loop 정책 명시. 순신설.
- **Snapshot Integrity**: 스냅샷 = 노드/엣지 집합의 정렬 직렬화 후 내용 해시. 봉인 digest는 감사 체인(`SecurityAudit.php:51`)에 기록하여 사후 재현·변조 탐지. 순신설.
- **Tenant Isolation**: 신설 authz KG 전 테이블은 acl_permission의 `tenant_id` 강제 패턴(`TeamPermissions.php:152-159`)을 계승 — 모든 조회/쓰기에 tenant_id 술어 필수, 복합 인덱스 선두 컬럼.

## 4. KEEP_SEPARATE
- `graph_node`/`graph_edge`(`Db.php:815-839`, 인덱스 `:838-839`)는 **마케팅 GraphScore** 그래프이며 authz Knowledge Graph가 **아니다**. 동명이라도 authz PRESENT로 오판 금지. authz KG는 별도 네임스페이스 신설.
- GraphScore substrate(`GraphScore.php:12-30`·`:57`)는 마케팅 관계 스코어링 전용 — authz 재사용 금지, KEEP_SEPARATE.

## 5. 판정
**PARTIAL**. Tenant Isolation은 acl_permission `tenant_id`(`TeamPermissions.php:152-159`·`:160-166`)로, Immutable 봉인은 SecurityAudit 해시체인(`SecurityAudit.php:25-31`·`:51`)으로 substrate 존재. 그러나 Graph Version/Ontology/Relationship/Snapshot Integrity 제약은 **전부 순신설**이며 현 DB(`Db.php:126-127`)에 authz graph 스키마 부재. `graph_node`/`graph_edge`(`Db.php:815-839`)는 마케팅으로 인용 금지. **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 Part1~3-20 인증 후 §30 실현).
