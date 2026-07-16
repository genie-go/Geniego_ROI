# EPIC 02-A — Enterprise Knowledge Graph: Inventory & Architecture Baseline (Master)

> **근거**: Entity Foundation(EPIC 01-A/B/C/D) + 288차 **그래프성 자산 전수조사**(실코드). **비파괴**: 발견·설계·문서만. 코드변경 0.
> **상위 원칙**: `../CONSTITUTION.md`(Extend not Replace) · `../DATA_INTELLIGENCE_CONSTITUTION.md`·`../UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`(**Intelligence Layer는 하나·중복엔진 금지**). → 신규 KG는 **기존 graph_node/graph_edge 확장**, 병렬 그래프 엔진 신설 금지.
> **입력**: [`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md)(노드 후보) · [`../entities/CANONICAL_RELATIONSHIP_REGISTRY.md`](../entities/CANONICAL_RELATIONSHIP_REGISTRY.md)(엣지 후보) · [`../entities/ENTITY_FOUNDATION_VALIDATION_REPORT.md`](../entities/ENTITY_FOUNDATION_VALIDATION_REPORT.md)(승인 SSOT). ADR=[`../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md`](../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md).

---

## 1. 기존 그래프성 자산 인벤토리 (실코드 근거)

| # | 자산 | 위치 | 구조 | 실사용 | KG 관점 |
|---|---|---|---|---|---|
| **A** | **graph_node / graph_edge (GraphScore)** | `Db.php:816-839`·`GraphScore.php` | node_type 4종(influencer/creative/sku/order) 화이트리스트(`:57`), 방향 가중 엣지, 고정 3홉 `influencer→creative→sku→order`. **UNIQUE 없음**→앱단 upsert(`:70-79`) | 스키마·스코어링·UI(`/graph-score`) 완비. **★자동 인제스천/생성UI 부재→수동 API 적재만**(참조파일 3개뿐). 실데이터 연결 UNVERIFIED | **유일한 진짜 그래프 저장소=KG 확장 기반** |
| B | Markov 전이행렬 | `AttributionEngine.php:1468-1520` | in-memory START/CONV/NULL 흡수연쇄 | 실사용(Attribution·cron). 영속 그래프 아님 | 계보 입력(전이 지식) |
| C | Shapley | `AttributionEngine.php:965-1022` | 파워셋 협조게임 | 실사용 | 그래프 아님 |
| D | Union-Find 아이덴티티 | `CRM.php:600-644` | 그래프 순회, 결과=identity_id 컬럼 | 실사용(CRM360) | **identity resolution 레이어 재사용** |
| E | crm_identity_merge_link | `CRM.php:708-718` | (a_id,b_id,score) 병합엣지·승인 | 실사용(DSAR) | 진짜 엣지테이블(재사용) |
| F | attribution_identity_link | `Attribution.php:133-145` | identity_hash↔session·confidence | 실사용(스티칭·DSAR) | cross-device 엣지(재사용) |
| G | 벡터/임베딩/RAG | — | **부재**(pgvector/embedding grep 0) | 챗봇=keyword 규칙(`ClaudeAI.php:224`·`GeniegoKnowledge.php`) | 신규시 중복 아님(챗봇 RAG 후보) |
| H | CF/유사상품 추천 | — | **부재** | AutoRecommend=채널배분·Catalog=키워드사전 | 신규시 중복 아님 |

**§6 관계 저장방식**: EPIC 01-C ~55관계 중 **DB 그래프 저장은 A(REL-ANA-000006) 단 1건**, 나머지는 전부 FK/조인. → 범용 엔티티 KG는 조인관계의 선별적 물질화가 신규작업이나 **저장 스키마는 A 재사용**.

---

## 2. 아키텍처 베이스라인 (Extend, not Replace)

### 2.1 원칙
- **단일 KG 저장소 = graph_node/graph_edge 확장**. 병렬 노드/엣지 테이블 신설 금지(§중복엔진 금지).
- **노드 타입 = Canonical Entity(CE)**. 현행 4종을 **CE 카탈로그로 일반화**(customer/product/order/campaign/creator/content/channel …). node_type 화이트리스트를 CE Registry에 바인딩.
- **엣지 타입 = Canonical Relationship(REL)**. edge_label = REL ID. 방향/카디널리티는 REL Registry 준수.
- **테넌트 격리 절대**: graph_node/graph_edge에 이미 tenant_id 존재 → 모든 KG 쿼리 `WHERE tenant_id=?` fail-closed 강제(01-D 정본 패턴 승계).
- **Trust First(Vol3)**: 신뢰검증(READY) 통과 데이터만 엣지 적재. 미검증/Fake/Demo는 KG 제외.

### 2.2 최우선 갭 — 자동 인제스천(Ingestion) 부재
현재 KG의 근본 결함은 스키마가 아니라 **엣지 공급원 단절**(수동 API만). 베이스라인의 1순위:
- **Edge Writer 신설**: 주문 저장(ChannelSync recordCrmPurchase/saveOrders)·귀속(attribution_touch)·CRM 이벤트에서 CE→REL 엣지를 멱등 적재. Order→Customer·Order→SKU·Creator→Order 등 이미 검증된 관계(01-C VERIFIED)를 소스로.
- **선결**: 기존 파이프라인 훅 지점(무후퇴)에 write-through 추가 — 라이브 데이터 흐름 확인 후(블라인드 금지).

### 2.3 스키마 진화(비파괴 계획)
| 항목 | 현행 | 베이스라인 | 방식 |
|---|---|---|---|
| node_type | 4종 하드화이트리스트(`:57`) | CE 카탈로그 바인딩(확장) | 화이트리스트 확대(기존 4종 보존) |
| UNIQUE | 없음(앱단 upsert) | `UNIQUE(tenant_id, node_type, node_id)`·`UNIQUE(tenant_id, src_type, src_id, dst_type, dst_id, edge_label)` | ALTER ADD(중복 정리 후·Backfill) |
| 인제스천 | 수동 API | 이벤트 write-through | Writer 신설(기존 파이프라인 훅) |
| 홉 | 고정 3홉 | REL 기반 범용 순회(기존 3홉 스코어러 보존) | 확장(GraphScore 재사용) |
| identity | 별도(D/E/F) | KG identity 레이어로 참조 통합 | 재사용(재구현 금지) |

### 2.4 KG 노드/엣지 카탈로그 초안(CE/REL 매핑)
- **노드(CE)**: Customer·Order·SKU·Product·AdCampaign·AdGroup·Ad·Creative·Creator·Channel·Session·Segment·Journey (Foundation APPROVED_CANONICAL 우선).
- **엣지(REL)**: REL-ORD-000001(Order→Customer)·REL-PRD-000002(Product→SKU)·REL-INV-000001(SKU→Inventory)·REL-MKT-000003(Creative→SKU)·REL-CRT-000001(Creator→Content)·REL-MKT-000006(Touch→Campaign)·REL-AUT-000002(Enrollment→Action) 등 VERIFIED 관계부터 물질화.
- **BLOCKED 제외**: OrderItem(REL-ORD-000002 ABSENT)·NormalizedRecord·ActionRequest는 Foundation에서 BLOCKED → KG 적재 보류.

---

## 3. 벡터/임베딩 레이어 판정
- 기존 자산 전무(G) → 신규 도입은 **중복 아님**. 단, KG의 1순위는 그래프 인제스천이며 벡터는 후속(챗봇 keyword→RAG 업그레이드, GraphRAG 결합 후보). Vol3/Vol4 Explainable AI 근거요건 준수(임베딩 결과도 근거·신뢰도 표기).

## 4. 리스크·격리·거버넌스
- **테넌트 격리**: 신규 Edge Writer가 반드시 파이프라인의 도출 tenant_id 사용(본문 신뢰 금지, ChannelSync:5620 패턴 승계). Demo/운영 분리(VITE_DEMO_MODE·IS_DEMO) → KG는 운영 테넌트만.
- **무후퇴**: GraphScore 3홉 스코어러/화면/API 응답 필드 보존하며 확장. UNIQUE 추가 전 중복행 정리 Backfill+검증쿼리.
- **거버넌스**: 신규 노드/엣지 타입은 CE/REL Registry 등재분만(임의 타입 금지). Registry Validation 게이트.

## 5. §완료 상태
- **KG Inventory 확정**: 실 자산 A~H, 실사용/부재 판정 완료.
- **Architecture Baseline 확정**: 단일저장소=graph_node/graph_edge 확장·CE노드/REL엣지 매핑·최우선갭=자동 인제스천·비파괴 스키마 진화·격리/무후퇴 규칙.
- **미검증**: 자산 A 프로덕션 실적재 여부(UNVERIFIED)·인제스천 훅 라이브 데이터 흐름(라이브검증 대기). 코드변경 0.
- 다음 **EPIC 02-B(Knowledge Graph Ingestion & Edge Writer)** 입력 준비 완료.
