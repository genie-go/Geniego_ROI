# GeniegoROI Claude Code Implementation Specification

# CCIS Part043 — Enterprise Knowledge Graph, Semantic Web, Ontology & Graph Intelligence Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Knowledge Graph·Semantic Web·Ontology·Graph Intelligence 표준을 수립한다.

> ★**성격(대응물 스택 — MySQL property graph 실재·형식 RDF/OWL/Neo4j 부재)**: 이 저장소는 관계 기반 지식을
> **MySQL property graph**로 실현하지 **시맨틱 웹 스택(RDF/OWL/SPARQL)**이 아니다. 명세가 다루는 **형식
> RDF/RDFS/OWL·SPARQL·그래프 DB(Neo4j/JanusGraph/Neptune)·Triple Store·형식 Ontology Management·Knowledge
> Reasoning(OWL inference)·Graph Analytics 알고리즘(centrality/community)**은 **부재**한다(grep 0·MEA 055 KG
> weak). ★**실재 축(property graph substrate)**: **`graph_node`/`graph_edge`**(v419 `GraphScore`·**MySQL
> 방향성 가중 property graph**·KG 정본·Part029·node_type/node_id·엣지 weight·경로 스코어)·**`AttributionEngine`**
> (markov 그래프·경로 확률 기여도·Part031)·**`GeniegoGlossary`**(용어집=온톨로지 유사·Part034)·**`EventNorm`/
> Unified Data Model**(엔티티 정규화·Part034)·**CRM dedup**(entity resolution 유사·231 DB SSOT)·**챗봇
> Retriever**(어휘 semantic search·Part029) 가 실재한다. ★핵심: **`graph_node`는 도메인 특화 어트리뷰션
> 그래프(influencer→creative→sku→order)이지 범용 RDF 지식그래프가 아니다**. Part001 §4 에 따라 실측 → RDF/OWL/
> Neo4j 부재증명 → graph_node+markov+Glossary 성문화했다. ★정본=**KG=`graph_node`(Part029·중복 KG 금지)·
> `AttributionEngine`(Part031)·`GeniegoGlossary`(Part034)** 승계. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 그래프 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Knowledge Graph Architecture | Data→Ontology→KG→Reasoning→Semantic | **부분(대응물)** — 데이터→`EventNorm` 정규화→`graph_node`/`graph_edge`→`GraphScore` 경로. Reasoning 계층 아님 |
| Graph Data Model(Node/Edge/Property) | 고유 식별자 | ★**실재** — `graph_node`(node_type/node_id/label/meta_json)·`graph_edge`(가중 방향성) |
| Graph Database | Neo4j/JanusGraph/Neptune | **부재(대응물)** — MySQL 저장(`graph_node`/`graph_edge`). 전용 그래프 DB 아님 |
| Property Graph(Node/Edge Property) | 속성/관계 | ★**실재** — `graph_node.meta_json`·`graph_edge` weight·방향성. 다중 관계 부분 |
| RDF(Subject/Predicate/Object) | Triple Store | **부재** — RDF Triple 없음. property graph(nodes/edges) |
| RDFS/OWL(Class/SubClass/Restriction) | Ontology 정의 | **부재** — OWL 온톨로지 없음. `GeniegoGlossary`(용어·비형식) |
| SPARQL | Semantic Query | **부재** — SPARQL 없음. SQL(graph_node/edge)·`GraphScore` 경로 질의 |
| Ontology Management | Version/Hierarchy/Namespace | **부분(대응물)** — `GeniegoGlossary`(용어 SSOT)·`EventNorm`(표준 정규화). 형식 온톨로지 버전관리 아님 |
| Entity Resolution | Duplicate/Identity/Alias/Confidence | **부분(대응물)** — CRM dedup(231 DB SSOT)·`EventNorm`(정규화)·해시 식별자. 형식 ER confidence 부분 |
| Semantic Search | Ontology/Entity/Relationship/Context | **부분(어휘)** — 챗봇 Retriever(어휘 토큰 스코어·Part029)·`GraphScore`. 형식 시맨틱/벡터 아님 |
| Knowledge Reasoning | Rule/Ontology/Inference | **부분(규칙)** — `RuleEngine`(IF-THEN)·`GraphScore`(경로 스코어). OWL inference 아님 |
| Relationship Intelligence | Customer/Supplier/Shipment Network | ★**대응물** — `graph_node`(influencer→creative→sku→order)·`AttributionEngine`(markov)·Customer360(V4) |
| Graph Analytics | Centrality/Community/Path/Similarity | **부분(경로)** — `GraphScore`(경로 스코어·기여도)·markov(경로 확률). Centrality/Community 알고리즘 부재 |
| Graph Visualization | Node/Edge/Cluster/Timeline | **부분(프론트)** — 어트리뷰션/저니 시각화(프론트). 범용 그래프 뷰어 부분 |
| Metadata Integration | Catalog/Glossary/Lineage/MDM | ★**대응물** — `DataPlatform`·`GeniegoGlossary`·출처 lineage(Part034) |
| Monitoring | Query/Reasoning/Graph Growth | **부분** — `graph_node`/`edge` 카운트·`SystemMetrics`. Reasoning Time 대상 없음 |
| Logging | Graph/Entity/Relationship ID | **부분** — `SecurityAudit`·graph upsert. Trace ID 부재 |
| Security(RBAC/Graph Access/격리/Namespace) | 관계 접근 제한 | ★**준수** — `GraphScore` **은행급 fail-closed**(위조불가 auth_tenant)·**테넌트 격리 절대**·RBAC |
| Compliance(GDPR/데이터 정책) | 그래프 데이터 활용 | ★**부분 준수** — PII 미저장(해시 식별자)·`Dsar`·DATA 헌법 |
| Disaster Recovery | Graph/Ontology/Triple 복구 | **부분** — DB 백업(`graph_node`/`edge`)·git(Glossary). Triple/Ontology 대상 없음 |
| Performance(Graph Cache/Incremental Reasoning) | 대규모 그래프 | **부분** — 인덱스·HTTP 캐시. 그래프 전용 최적화/incremental reasoning 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Knowledge First/Relationship Centric/Semantic by Design/Ontology Driven/Explainable Graph/Tenant Isolated) | **부분(그래프축)** | ★Relationship Centric(`graph_node`/`AttributionEngine`)·Explainable(근거)·Tenant Isolated·Metadata Connected. Semantic/Ontology Driven 부분 |
| §4 KG Architecture | **부분(대응물)** | `EventNorm`→`graph_node`→`GraphScore`. Reasoning 계층 아님 |
| §5 Graph Data Model | **★실재** | `graph_node`/`graph_edge`(node/edge/property/label) |
| §6 Graph Database | **부재(대응물)** | MySQL 저장. Neo4j 아님 |
| §7 Property Graph | **★실재** | `graph_node.meta_json`·`graph_edge` weight·방향성 |
| §8 RDF | **부재** | Triple Store 없음. property graph |
| §9 RDFS/OWL | **부재** | OWL 온톨로지 없음. `GeniegoGlossary`(비형식) |
| §10 SPARQL | **부재** | SPARQL 없음. SQL·`GraphScore` 경로 |
| §11 Ontology Management | **부분(대응물)** | `GeniegoGlossary`·`EventNorm`. 형식 온톨로지 버전 아님 |
| §12 Entity Resolution | **부분(대응물)** | CRM dedup·`EventNorm`·해시. 형식 ER confidence 부분 |
| §13 Semantic Search | **부분(어휘)** | 챗봇 Retriever(어휘·Part029)·`GraphScore`. 시맨틱/벡터 아님 |
| §14 Knowledge Reasoning | **부분(규칙)** | `RuleEngine`·`GraphScore` 경로. OWL inference 아님 |
| §15 Relationship Intelligence | **★대응물** | `graph_node`(influencer→sku→order)·`AttributionEngine`·Customer360 |
| §16 Graph Analytics | **부분(경로)** | `GraphScore`·markov 경로. Centrality/Community 부재 |
| §17 Graph Visualization | **부분(프론트)** | 어트리뷰션/저니 시각화. 범용 뷰어 부분 |
| §18 Metadata Integration | **★대응물** | `DataPlatform`·`GeniegoGlossary`·lineage |
| §19 Monitoring | **부분** | 노드/엣지 카운트·`SystemMetrics`. Reasoning Time 없음 |
| §20 Logging | **부분** | `SecurityAudit`·graph upsert. Trace ID 부재 |
| §21 Security | **★준수** | `GraphScore` fail-closed(위조불가 tenant)·테넌트 격리·RBAC |
| §22 Compliance | **부분 준수** | PII 미저장·`Dsar`·DATA 헌법 |
| §23 Disaster Recovery | **부분** | DB 백업·git. Triple/Ontology 대상 없음 |
| §24 Performance | **부분** | 인덱스·캐시. 그래프 전용/incremental reasoning 부분 |
| §25~§26 PHP/Claude(Graph/Ontology Service/SPARQL Adapter/ER Service) | **부분** | ★`GraphScore`·`AttributionEngine`·`EventNorm`·`GeniegoGlossary`. SPARQL/OWL/ER 전용 부재 |
| §27~§28 검증(graph:health/ontology:validate/semantic:search) | **대상 없음** | artisan 없음·RDF/OWL 없음. `/v419/graph/*` API·Retriever 로 대체 |

---

## 4. 확립된 표준 (신규 그래프 코드가 따를 정본)

- ★**KG 정본 = `graph_node`/`graph_edge`**(v419 `GraphScore`·MySQL property graph·node_type/node_id·가중 방향성). 신규 그래프 노드/관계는 이 스키마 확장. ★**중복 KG 신설 금지**(KG 정본=`graph_node`·헌법 V4). RDF/OWL/Neo4j 이식 금지.
- ★**관계 인텔리전스 = `AttributionEngine`(markov)+`GraphScore`(경로 스코어)**. 어트리뷰션/기여도는 이 그래프 확장(중복 엔진 금지·Part031). Customer360=Unified Entity Model(V4).
- ★**엔티티 정규화/해석 = `EventNorm`/Unified Data Model**(Part034). ★**채널 나열 금지 → 표준 정규화**. Entity Resolution=CRM dedup(231 DB SSOT)·해시 식별자.
- ★**용어/온톨로지 = `GeniegoGlossary`**(용어 SSOT·챗봇 주입·임의변경 금지). 형식 OWL 온톨로지 신설 금지(용어집 확장).
- ★**시맨틱 검색/추론 = 챗봇 Retriever(어휘·Part029)+`RuleEngine`(규칙 추론)+`GraphScore`(경로)**. 형식 SPARQL/OWL inference 신설 금지.
- ★**테넌트 격리·정직**: `GraphScore` **은행급 fail-closed**(위조불가 auth_tenant·raw X-Tenant-Id 불신)·테넌트 격리 절대·PII 미저장(해시 식별자)·`SecurityAudit`.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식 RDF/RDFS/OWL·Triple Store·SPARQL** — 안 함. `graph_node`/`graph_edge` property graph(MySQL)가 대응물. 시맨틱 웹 스택=데이터모델·엔진 전면 신설.
2. **전용 그래프 DB(Neo4j/JanusGraph/Neptune)** — 안 함. MySQL property graph(방향성 가중 엣지·경로 스코어)로 어트리뷰션 그래프 실현. 전용 그래프 DB=인프라 도입.
3. **형식 Ontology Management(OWL Class/Restriction·버전관리)·Knowledge Reasoning(OWL inference)** — 안 함. `GeniegoGlossary`(용어)·`RuleEngine`(규칙 추론)·`GraphScore`(경로)가 대응물.
4. **Graph Analytics 알고리즘(Centrality/Community Detection/Similarity)** — 부분. `GraphScore`(경로 스코어·기여도)·markov(경로 확률)가 대응물. 형식 그래프 알고리즘 라이브러리 부재.
5. **형식 Entity Resolution(confidence/alias 해석 엔진)·시맨틱/벡터 검색** — 부분. CRM dedup·`EventNorm`·어휘 Retriever(Part029). 벡터 검색=289차후속 보류(표본 0).
6. **artisan `graph:*`/`ontology:validate`/`semantic:search` 명령** — 없음(Slim·RDF/OWL 없음). `/v419/graph/*` API·Retriever·`GeniegoGlossary` 로 대체.

★**준수하는 실 원칙**: **property graph(`graph_node`/`edge`·KG 정본·중복 금지)·관계 인텔리전스(AttributionEngine markov·GraphScore 경로)·엔티티 정규화(EventNorm·채널 나열 금지)·용어 SSOT(GeniegoGlossary)·규칙 추론(RuleEngine)·은행급 fail-closed 테넌트 격리·PII 미저장(해시)·정직 미산출**. ★**핵심 구분**: `graph_node`=도메인 어트리뷰션 그래프이지 범용 RDF KG 아님.

---

## 6. Claude Code 구현 규칙

1. 그래프 노드/관계=`graph_node`/`graph_edge`(`GraphScore`·Part029 KG 정본) 확장. ★중복 KG 신설 금지·RDF/OWL/Neo4j 이식 금지.
2. 관계 인텔리전스=`AttributionEngine`(markov)+`GraphScore`(경로) 확장(중복 엔진 금지). 엔티티 정규화=`EventNorm`(**채널 나열 금지**).
3. 용어=`GeniegoGlossary`(SSOT·임의변경 금지). 추론=`RuleEngine`(규칙)·`GraphScore`(경로). OWL inference/SPARQL 신설 금지.
4. Entity Resolution=CRM dedup(231 SSOT)·해시 식별자. 시맨틱 검색=Retriever(Part029·어휘).
5. ★`GraphScore` fail-closed(위조불가 auth_tenant·raw 헤더 불신)·테넌트 격리 절대·PII 미저장(해시)·`SecurityAudit`.
6. RDF/OWL/SPARQL/Neo4j/Triple Store/Graph Analytics 라이브러리를 "명세에 있다"는 이유로 이식하지 않는다(`graph_node`+`AttributionEngine`+`GeniegoGlossary`+`RuleEngine` 로 커버).

---

## 7. Completion Criteria

- [x] 그래프 스택 **실측**(RDF/OWL/SPARQL/Neo4j/Triple Store/Ontology 부재·`graph_node`/`graph_edge` property graph·`AttributionEngine` markov·`GeniegoGlossary`·`EventNorm` 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(RDF/OWL/SPARQL/Neo4j 부재 증명·property graph substrate 실재·범용 KG 아님)
- [x] 실 그래프(graph_node+GraphScore+AttributionEngine+GeniegoGlossary+EventNorm) 성문화(§4)
- [x] ★KG 정본=`graph_node`(중복 금지)·관계 인텔리전스(markov/경로)·엔티티 정규화(채널 나열 금지)·용어 SSOT·fail-closed 테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — RDF/OWL/SPARQL/Neo4j/Triple Store/Ontology/Graph Analytics 알고리즘
- [x] Claude Code 규칙(§6) · `graph_node`/`GraphScore`·`AttributionEngine`·`GeniegoGlossary`·`EventNorm` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **MySQL property graph substrate**(`graph_node`/`edge`
> `GraphScore` + `AttributionEngine` markov + `GeniegoGlossary` 용어 + `EventNorm` 정규화)의 성문화이지 RDF/
> OWL/SPARQL/Neo4j 이식이 아니다. ★핵심 구분: **`graph_node`=도메인 특화 어트리뷰션 그래프이지 범용 RDF
> 지식그래프가 아니다**(KG 정본·중복 신설 금지·MEA 055 KG weak).

---

## 다음 Part

**CCIS Part044 — Enterprise Blockchain, Distributed Ledger, Smart Contract & Digital Asset** — ★사전 실측 예고: 블록체인/DLT/Smart Contract/NFT/Wallet 은 **ABSENT-total이나 "사업 범위 밖"**(MEA 062 Blockchain 최저·정직한 부재). ★**`SecurityAudit` 해시체인 ≠ Blockchain**(062 D-1): 단일 노드·**합의 없음**·분산 복제 없음·불변성은 append-only 코드 규율 의존(DB 관리자 UPDATE 가능·**탐지만 하지 막지 못한다**). Part044 도 실측→블록체인 전면 부재증명→out of scope 선언(`SecurityAudit`≠blockchain 오흡수 차단). ★MEA 062 D-1·064 out of scope 어휘·"온체인은 롤백 불가라 사전 승인이 유일 방어선" 승계.
