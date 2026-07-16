# ADR — Knowledge Graph Architecture Baseline (EPIC 02-A)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (발견·설계 베이스라인. 비파괴 — 코드변경 0). 실 구현(Edge Writer·스키마 ALTER)은 후속 승인·회귀테스트 후.
- **근거**: [`../kg/KNOWLEDGE_GRAPH_INVENTORY_AND_BASELINE.md`](../kg/KNOWLEDGE_GRAPH_INVENTORY_AND_BASELINE.md) + 288차 그래프성 자산 전수조사(실코드) + Entity Foundation(01-A~D).
- **상위 헌법**: `../UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(Intelligence Layer는 하나·중복엔진 금지·무후퇴).

## 맥락
Entity Foundation(CE/REL) 승인 위에 Enterprise Knowledge Graph를 구축한다. 착수 전 기존 그래프성 자산을 전수조사해 중복 신설을 방지한다.

## 결정 (핵심)
1. **단일 KG 저장소 = 기존 graph_node/graph_edge 확장**(Db.php:816·GraphScore.php). 병렬 그래프 엔진/테이블 신설 **금지**. Markov/Shapley(in-memory)·Union-Find/merge_link(아이덴티티)는 별개 유지·재사용(재구현 금지).
2. **노드=Canonical Entity, 엣지=Canonical Relationship(edge_label=REL ID)**. node_type 화이트리스트를 현행 4종에서 CE 카탈로그로 일반화(기존 4종 보존).
3. **최우선 갭 = 자동 인제스천 부재**. KG의 근본 결함은 스키마가 아니라 엣지 공급원 단절(수동 API만·실데이터 연결 UNVERIFIED). 베이스라인 1순위 = 주문/귀속/CRM 이벤트 기반 **Edge Writer 신설**(01-C VERIFIED 관계부터).
4. **비파괴 스키마 진화**: `UNIQUE(tenant, node_type, node_id)`·`UNIQUE(tenant, src, dst, edge_label)` 추가(중복 정리 Backfill 후), 3홉 스코어러/화면/API 응답 보존.
5. **격리·Trust First**: 모든 KG 쿼리 `WHERE tenant_id` fail-closed(01-D 정본 승계), Edge Writer는 파이프라인 도출 tenant 사용(본문 신뢰 금지). READY(Vol3) 통과·비Demo 데이터만 적재.
6. **벡터/임베딩=신규영역**(기존 전무·중복 아님) 단 그래프 인제스천 이후 순위. 챗봇 keyword→RAG 업그레이드 후보.

## 무후퇴·영구 규칙
- 신규 노드/엣지 타입은 CE/REL Registry 등재분만(임의 타입 금지·Registry Validation 게이트). Canonical 변경 시 회귀 Baseline+Rollback.
- 미검증 자산(A 프로덕션 실적재)을 근거로 완료 선언 금지. 인제스천 훅은 라이브 데이터 흐름 확인 후(블라인드 금지).

## 저장·동기화 결정 (정식 02-A §11/§25 Decision Matrix)
- **저장 = 현행 RDB graph_node/graph_edge 확장(1순위)** + (볼륨 증가 시)읽기 Projection. **Dedicated Graph DB(Neo4j 등) 보류** — 운영복잡도·Lock-in이 현 UC 규모의 이익 초과, 규모 요구 시 재평가(성급 확정 금지). In-Memory는 Markov류 계산 한정(현행 유지).
- **동기화 = Event-Driven Projection(write-through) + 주기 Reconciliation + Backfill**. CDC는 스택상 과함. Idempotency/Ordering/Late·Delete Event/Lag/Version 검증 필수.
- **격리=tenant_id fail-closed+Query Middleware, 권한=RBAC 이중검증, PII 미복제**(No-PII 승계).

## 시퀀스 정정
핸드북 정식 02-B=**Node & Edge Schema Design**(스키마 설계). 288차 초기 선작성한 `docs/kg/*INGESTION*/SERVING*`는 후속 EPIC(인제스천/서빙)용 forward-looking으로 재라벨(비파괴). 정식 02-A 정본=`docs/knowledge-graph/KNOWLEDGE_GRAPH_ARCHITECTURE_BASELINE.md`.

## 결과
KG Inventory·Architecture Baseline 확정(단일저장소 RDB 확장·CE/REL 매핑·저장/동기화 근거결정·격리/권한/최소화). 다음 **EPIC 02-B — Knowledge Graph Canonical Node & Edge Schema Design** 입력자료 준비 완료.
