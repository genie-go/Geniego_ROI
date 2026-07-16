# ADR — Knowledge Graph Node & Edge Schema (EPIC 02-B)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (스키마 설계·Registry 확정. 비파괴 — 코드변경 0). 실 ALTER/Projection은 후속 승인·Backfill·회귀 후.
- **근거**: [`../knowledge-graph/CANONICAL_GRAPH_SCHEMA.md`](../knowledge-graph/CANONICAL_GRAPH_SCHEMA.md) + 02-A Baseline + 01-B/C/D 승인 CE/REL.
- **상위**: `../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md`(저장=graph_node/graph_edge 확장).

## 결정 (핵심)
1. **Node Type ID `NT-{CAT}-NNNNNN` / Edge Type ID `ET-{CAT}-NNNNNN`**(영구·불변). 승인 CE/REL만 참조. 동일 의미 복수 Node/Edge Type 금지(Alias는 Registry, 표준 Edge명 단일화 PURCHASED 등).
2. **Node Instance 논리키 = tenant+CE+canonical_record**(외부오브젝트 +source_*). Edge 논리키 = tenant+edge_type+src+dst+valid_from+source_system. 외부 ID 직접 PK 금지.
3. **공통 필드 표준**(Node 26·Edge 24) 확정 — scope_type·source_*·schema/projection_version·quality/trust/confidence·lineage_id·evidence.
4. **Uniqueness**: Node UNIQUE(tenant,CE,record) / Edge UNIQUE(tenant,edge_type,src,dst,valid_from,source). Event형/유일형 Edge Type별 명시.
5. **Entity Resolution**: ER 미확정 시 SourceObject↔Customer 분리 + `POSSIBLY_SAME_AS`(ET-ER-000001). 확신 없이 SAME_AS 금지(승인병합 D/E만 CONNECTED_TO).
6. **시간성**: Transaction+Valid Time, Bitemporal 검토(Role/Segment/Category/Target/Pricing/Attribution/Automation). 시간가변 Edge=신규버전 신규 Edge.
7. **삭제=Tombstone**(원천삭제와 분리·Audit/Lineage 유지). 물리삭제 금지.
8. **Traversal 권한 이중검증·Cross-Tenant Deny·PII/Secret 미복제**(Reference만). 낮은 Confidence는 AI/자동화 제한.
9. **물리 매핑 = 기존 graph_node/graph_edge 확장**(컬럼/meta_json). ALTER는 후속·Backfill·무후퇴(3홉 스코어러/API 보존).

## 무후퇴·영구 규칙(§34)
새 Node/Edge Type 생성 전: CE/REL Registry + Node/Edge Type Registry + Alias/Duplicate + SoT + Tenant Scope + 민감정보 최소화 + Lineage/Confidence 확인 → ADR/PM. Registry 미등록 타입 운영 임의생성 금지.

## 결과
Canonical Graph Schema(Node 28·Edge 21 Type·공통필드·ID·Uniqueness·ER·시간성·권한·Lineage·Validation) 확정. 다음 **EPIC 02-C — Projection, Synchronization & Reconciliation Design** 입력 준비 완료. Security Risk 0·코드변경 0.
