# ADR — Knowledge Graph Query, Traversal & Security Gate (EPIC 02-D)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Query/권한/게이트 설계 확정. 비파괴 — 코드변경 0). **운영 Query 배선은 인제스천(02-C) 라이브검증 후·Shadow→제한운영→운영 승인 단계.**
- **근거**: [`../knowledge-graph/GRAPH_QUERY_ARCHITECTURE.md`](../knowledge-graph/GRAPH_QUERY_ARCHITECTURE.md) + 02-A/B/C + 기존 조회 자산(GraphScore GET·Attribution·AutoRecommend·CRM).

## 결정 (핵심)
1. **Canonical Graph Query Layer = GraphScore GET(/v419/graph/*) 확장**(13 Layer 경유·중복 Query Service 금지). UI/분석/자동화 저장소 직접호출 금지.
2. **모든 Query 서버 재검증**(클라이언트 tenant/role 불신) + **각 Hop 권한 재검증**(시작 Node 권한≠전체 경로). Denied Paths(Customer→Credential·Cross-Tenant·Demo→Prod).
3. **무제한 Multi-Hop 금지**: Complexity 사전계산(REJECTED 미실행)·목적별 Depth/Fanout/Result/Timeout/RateLimit(Admin도 무제한 금지).
4. **결과에 신뢰상태 병기**(freshness·drift·quality/trust/confidence·partial·truncated·lineage). Freshness 미충족/Drift Critical → 경고/차단.
5. **AI/추천/자동화 게이트**: Vol3 READY·Vol4 Explainable(최소 Subgraph·근거 Lineage)·Vol5 Safety(VERIFIED만·Dry Run·승인·Rollback) 승계. 미검증 관계 자동화 근거 사용 금지.
6. **Cache/Search Tenant Scope 격리**·**Fallback=Canonical RDB(SoT)** → Graph 장애가 핵심기능 전체중단 유발 안 함.
7. ★**운영 승인 게이트(정직)**: Graph 실적재 전(02-C 인제스천 미배선)이라 PRODUCTION 승인 0·최대 Shadow. 라이브검증이 선결.

## 무후퇴·영구 규칙(§47)
새 Query/Traversal/Path/Evidence Query 전: Query Type Registry·기존 Query·Tenant Scope·Node/Edge/Property/Path 권한·Depth/Fanout/Timeout/Limit·Freshness/Quality/Confidence·Cache/Search Scope·Audit/Observability·성능/보안/회귀 테스트 → ADR/PM. **제한없는 Multi-Hop·Scope없는 Graph API 금지**. 검증안된 관계 자동화 근거 금지.

## 결과 — EPIC 02 완료
Canonical Graph Query/Traversal/Security 설계·게이트 확정. **EPIC 02(Enterprise Knowledge Graph Foundation) 설계 완결**(02-A Baseline·02-B Schema·02-C Projection·02-D Query/Security). 기능 후퇴 0·Security Risk 1(웹훅 HMAC·02-C)·코드변경 0. 실 배선은 자격증명 등록→인제스천 라이브검증 후. 다음 권장 **EPIC 03-A — Enterprise Semantic Layer Inventory & Canonical Business Vocabulary**.
