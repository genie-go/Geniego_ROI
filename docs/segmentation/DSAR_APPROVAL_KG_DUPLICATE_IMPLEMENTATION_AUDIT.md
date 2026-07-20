# DSAR — Authorization Knowledge Graph & Semantic Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`.
> (A) authz KG 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 동음이의(마케팅 attribution graph·챗봇 KB·데이터 lineage·product affinity·PM DAG·XML-DSig).

---

## 1. 핵심 판정 — **authz KG/ontology/semantic-reasoning 전면 그린필드**

`KnowledgeGraph|GraphNode|GraphEdge|HAS_ROLE|INHERITS|ontology|SemanticModel|neo4j|cypher|transitive|centrality|graphReasoning` **authz 매치 0건**. 유일 graph/node/edge/lineage/knowledge/semantic/affinity 코드는 마케팅 attribution(`GraphScore.php`·`AttributionEngine.php`)·journey(`JourneyBuilder.php`)·챗봇 KB(`GeniegoKnowledge.php`)·데이터 lineage(`DataPlatform.php`)·product affinity(CRM/Decisioning/CustomerAI/AutoRecommend)—전부 KEEP_SEPARATE. 저장소=순수 MySQL(`Db.php:126-127`·graph DB 드라이버 grep 0).

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| Knowledge Graph Registry / Graph Node/Edge(authz) | **ABSENT(grep 0)** | authz 노드/엣지 엔진 없음·`graph_node`/`graph_edge`=마케팅 GraphScore(`GraphScore.php:57`·§B) |
| Ontology Manager / Semantic Model Engine | **ABSENT(grep 0)** | ontology/SemanticModel/rdf/sparql/triple 없음 |
| Authorization Graph Builder(RBAC/ABAC/JIT/SoD graph) | **ABSENT(grep 0)** | GraphBuilder/AuthorizationGraph 없음·SOURCE 데이터만(GT① §A) |
| Relationship Discovery / Dependency Analyzer / Lineage / Impact / Root Cause(authz) | **ABSENT(grep 0)** | lineage=데이터(`DataPlatform.php:313-345`)·reconcil=정산(§B) |
| Graph Reasoning(transitive/constraint/trust/policy inference) | **ABSENT(grep 0)** | inference 히트=`Mmm.php:949`(MCMC 통계·authz 아님) |
| Semantic Search / Recommendation(authz) | **ABSENT(grep 0)** | semantic 히트=코드주석(`AccessReview.php:26`·`:211`·`PM/Gantt.php:20`)·FULLTEXT/embedding grep 0 |
| Graph Snapshot/Evidence(native)/Digest/Analytics(centrality)/Drift/Simulation/Revalidation/Reconciliation | **ABSENT** | centrality/connectedComponents grep 0·SecurityAudit(§C)=generic |
| Runtime Guard / Static Lint | **ABSENT(grep 0)** | graph poisoning/orphan node grep 0·순환탐지=menu tree(`AdminMenu.php:551-566`·authz KG 아님) |
| SOURCE 관계 데이터 | **PRESENT** | TeamPermissions(`:39`·`:152-159`·`:393-421`)·위계(`UserAuth.php:186-188`) |
| Immutable Evidence | **PARTIAL** | SecurityAudit 해시체인(`SecurityAudit.php:25-64`·graph snapshot 없음) |
| AI Reasoning infra | **PARTIAL** | ClaudeAI LLM(`ClaudeAI.php:70`·graph reasoning 아님) |
| Store | **MySQL 관계형** | `Db.php:126-127`·graph DB 없음 |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 확장)

1. **TeamPermissions SOURCE** — `TeamPermissions.php:39`·`:152-159`·`:393-421`·`:737-753`. Graph Builder(§7) ingest 원천.
2. **위계 엣지** — `UserAuth.php:186-188`·`AdminMenu.php:107-117`·`EnterpriseAuth.php:70`·`AgencyPortal.php:64`. Graph Edge(§4).
3. **SecurityAudit 해시체인** — `SecurityAudit.php:25-64`. Graph Evidence(§18).
4. **ClaudeAI LLM** — `ClaudeAI.php:70`. Reasoning/Search infra(§15·§9).
5. **menu wouldCycle** — `AdminMenu.php:551-566`. Circular lint(§26) 원천.

## 4. ★KEEP_SEPARATE — authz KG 아님 (마케팅 graph·챗봇 KB·데이터 lineage·affinity·PM DAG·XML-DSig)

### B-1. ★마케팅 attribution graph (★graph/node/edge 최대 혼동 — graph_node/graph_edge 테이블)
- `GraphScore.php:12-30`·`:57`·`:70-97`·`:187-256`·`:318-361`·`:367-423`·`:429-460`(V419 Graph Scoring·influencer→creative→sku→order·node_type allow-list·다홉 가중전파). ★`graph_node`/`graph_edge` 테이블(`Db.php:815-839`·`:816`·`:826`·InnoDB·tenant/src/dst 인덱스 `:838-839`)=마케팅 attribution·**authz 노드/엣지 아님·PRESENT 오판 절대 금지**.
- `AttributionEngine.php:19-38`·`:33`·`:242`·`:1416`·`:1468`(markov 흡수체인 removal-effect). 통계 multi-touch attribution·authz reasoning 아님.
- `Attribution.php:184`·`:241`(linkProbabilistic·probabilistic_identities). 크로스디바이스 identity resolution·authz identity graph 아님.
- `JourneyBuilder.php:38`·`:67`·`:131-137`(journeys.nodes/edges·canvas from/to). 마케팅 자동화 캔버스·authz 아님.

### B-2. 챗봇 knowledge base (knowledge/semantic 동음이의)
- `GeniegoKnowledge.php:11`·`ClaudeAI.php:105`·`:198`·`:282-287`·`:2317`·`:3200`·`:3557`(geniegoKnowledgeBlock·knowledge_base_v1·getChannelKnowledgeBase). product/마케팅 챗봇 KB·authz ontology 아님.

### B-3. 데이터 lineage / product affinity (lineage/relationship 동음이의)
- `DataPlatform.php:281`·`:313-345`(dataLineage·DataTrust·분석결과→소스 provenance). 데이터-거버넌스 lineage·authz policy lineage 아님.
- `CRM.php:1280-1285`(productAffinity)·`Decisioning.php:349`(segmentAffinity)·`CustomerAI.php:266`·`:299`(CF+Content-Based·affinity_score)·`AutoRecommend.php:50`·`:490`(AFFINITY/blendAffinity). 상품추천/친화도·권한 클러스터 아님.

### B-3b. 정산/재고 reconciliation (reconciliation 동음이의 — authz graph reconciliation 아님)
- `PgSettlement.php:294-295`(정산 대사)·`KrChannel.php:415-419`(정산 reconciliation)·`Connectors.php:902`(ROAS reconciliation). 재무/정산 대사·authz graph reconciliation(§24) 아님.

### B-4. PM DAG / XML-DSig (node/edge/semantic/digest 동음이의)
- `PM/Gantt.php:20`(dep_type semantics·lag). PM 태스크 DAG·authz 아님.
- `EnterpriseAuth.php:589-619`(SAML ds:Signature·DOMNode C14N·DigestValue). XML-DSig 암호 노드/digest·graph 노드/digest 아님.
- `Mmm.php:949`(inference=mcmc). Bayesian MMM·authz inference 아님.

## 5. 종합

**authz Knowledge Graph = SOURCE-PRESENT(RBAC/ABAC 관계·위계·정책 노드/엣지 원천) / GRAPH-ABSENT-greenfield(Registry·Node/Edge 엔진·Schema·Ontology·Semantic Model·Graph Builder·Sync·Semantic Search·Relationship Discovery·Dependency Analyzer·Lineage·Impact·Root Cause·Reasoning·Recommendation·Snapshot/Evidence/Digest/Analytics/Drift/Simulation/Revalidation/Reconciliation·Guard/Lint 순신규) / PARTIAL(SecurityAudit evidence·ClaudeAI reasoning infra·menu-tree DFS·role rank 암묵·순수 MySQL).** 재활용(흡수 아님·확장): TeamPermissions SOURCE→Graph Builder·위계→Graph Edge·SecurityAudit→Graph Evidence·ClaudeAI→Reasoning infra·menu wouldCycle→circular lint. **★KEEP_SEPARATE=GraphScore 마케팅 attribution(★graph_node/graph_edge 테이블 PRESENT 오판 금지)·AttributionEngine markov·Attribution 확률 identity·JourneyBuilder journey graph·GeniegoKnowledge 챗봇 KB·DataPlatform 데이터 lineage·product affinity(CRM/Decisioning/CustomerAI/AutoRecommend)·PM DAG·XML-DSig node/digest·Mmm MCMC.** authz KG≠마케팅 graph/attribution/챗봇 KB/데이터 lineage/affinity/PM DAG/XML-DSig.
