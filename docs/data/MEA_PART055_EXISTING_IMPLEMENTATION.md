# MEA Part 055 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 055 SPEC/ADR. ★부재증명 완료·과대주장 금지·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·정직 표기(어휘검색·비-벡터·그래프 도메인 상이).
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★전부 0** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, 로케일 제외): `knowledge_graph`/`KnowledgeGraph`/`knowledge_node`/`knowledge_edge`/`knowledge_object`/`ontology`/`Ontology`/`entity_extraction`/`graph_traversal`/`graph_query`/`GraphQuery`/`vector_index`/`VectorIndex`/`vector_collection`/`ann_index`/`hnsw`/`ivfflat`/`document_chunk`/`DocumentChunk`/`chunk_generation`/`retrieval_query`/`knowledge_version`/`knowledge_policy`/`knowledge_audit`/`knowledge_source`/`semantic_search`/`embedding`/`vector_store`/`VectorStore`/`citation`/`knowledge_lineage`/`retention_policy`. ★053 확정 부재분 승계(재조사 불요·동일 0): `pgvector`/`faiss`/`pinecone`/`weaviate`/`similarity_search`/`cosine`(벡터 용도).
② **실 substrate 판독**: `tools/gen_chatbot_knowledge.mjs`(304줄 지식 코퍼스 생성기)·`backend/data/chatbot_feature_details.json`(203KB)·`chatbot_feature_map.md`(24KB)·`GeniegoKnowledge`·`ClaudeAI::geniegoFeatureDetails`(053 확정)·`GraphScore`(461줄)+`graph_node`/`graph_edge`(`Db`)·`LegalDoc`·`MediaHost`·`CreativeStore`·`DataPlatform`·`Dsar`·`GlobalSearch`/`CommandPalette`(프론트).
③ **동음이의 배제(오흡수 방지)**: `citation` 실코드 히트=**0**(히트는 `frontend/src/i18n/autofill.json`·`demoUiI18n.json` 로케일 산물) · `chunk`=**Vite `manualChunks` 번들 분할**(053 확정) · `cosine`=**협업필터링 상품추천 유사도**(282차) · `attribution_identity_link`(280차)=**세션↔해시 식별 그래프**이지 Knowledge Graph 아님(`Dsar`:683~698 삭제 대상으로만 등장) · `GlobalSearch`/`CommandPalette`=**하드코딩 메뉴 목록의 substring 필터**이지 Semantic Search 아님.

## 실존 substrate (★어휘(non-vector) 지식 파이프라인 + 범용 typed 그래프 저장소 실재)

### A. 지식 코퍼스 생성 파이프라인 (★본 Part 최대 실재분)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Knowledge Acquisition | 라우트·i18n 정본·사이드바·팔레트에서 자동 수집 | `gen_chatbot_knowledge.mjs`(:40 LANGS 15·:109 srcFiles·:121 routesForBasename·:132 T_CALL·:134 nsData) | PARTIAL-strong |
| Classification | 키 이름 기반 9분류(title/action/field/state…) | `gen_chatbot_knowledge.mjs`(:156~171) | PARTIAL-strong |
| Metadata Extraction | ns→제목·15개국 별칭·진입경로·라틴토큰·행동/필드/상태/주의 | 동(:183~222) | PARTIAL-strong |
| Chunk Generation(문서단위) | 네임스페이스=1 기능블록·잡음 ns 배제(MIN_KEYS 4) | 동(:172·:183~222) | PARTIAL |
| **Indexing(어휘·df 가중)** | **문서빈도로 변별력 없는 어휘 배제(DF_MAX 3)→변별 어휘 확정** | 동(:226~232·:233~240) | PARTIAL |
| Knowledge Update | **매 배포 전량 재생성**(신규 기능 자동 인지) | `deploy.ps1`(:14)·`package.json`(:7 `chatbot:kb`) | PARTIAL-strong |
| 산출물(코퍼스 2종) | 컴팩트 인덱스 + 기능별 상세 인벤토리 | 동(:22·:24·:291~293·:296~297)·`backend/data/chatbot_feature_{map.md,details.json}` | PARTIAL-strong |
| Retrieval(어휘 점수) | 질의 점수화→상위40% 컷→top-N 주입 | `ClaudeAI::geniegoFeatureDetails`(:206~276·:245~248·:251) | PARTIAL |
| Knowledge Repository(정적) | 발급가이드·메뉴가이드·플랫폼 소개 | `GeniegoKnowledge`(:13·:520·:646) | PARTIAL |
| Explainable Retrieval(지시) | "여기 없는 것 지어내지 마라"·"없는 URL 발명 금지" | `ClaudeAI`(:271·:309) | PARTIAL-weak |

### B. 그래프 저장소·순회 (★도메인=마케팅 기여도이지 기업 지식 아님)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 노드 저장(typed·속성) | `graph_node`(tenant·node_type·node_id·label·**meta_json**) | `Db`(:816~824)·`GraphScore::upsertNode`(:44·:70~78) | PARTIAL |
| 엣지 저장(typed·가중·라벨) | `graph_edge`(src/dst type+id·**edge_weight**·edge_label·meta_json) | `Db`(:826~837)·`upsertEdge`(:107·:138) | PARTIAL |
| 양방향 인덱스 | src/dst 각각 인덱스 | `Db`(:838~839) | PARTIAL |
| **Graph Traversal(다중홉)** | **3-hop 가중 순회 + 경로 열거**(influencer→creative→sku→order) | `GraphScore::scoreInfluencer`(:187~235·hop1:192·hop2:207·hop3:216) | PARTIAL |
| Graph Analytics(부분) | 노드유형별 top scorer 집계 | `GraphScore::summary`(:429) | PARTIAL-weak |
| 그래프 조회 API | nodes/edges/score×4/summary | `routes.php`(:732~740) | PARTIAL |
| 그래프 테넌트 격리(fail-closed) | `auth_tenant` 우선·raw 헤더 불신 | `GraphScore::tenantId`(:33~41) | PARTIAL-strong |

### C. 문서·자산·메타데이터
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| DOCUMENT(다국어 본문) | `legal_doc`(doc_key·lang·title·subtitle·body·updated_at·PK 복합) | `LegalDoc::ensureTables`(:34~45) | PARTIAL-weak |
| Knowledge Publishing | 관리자 저장→공개 조회 | `LegalDoc::adminSave`(:104)·`publicGet`(:72) | PARTIAL-weak |
| 자산 저장(콘텐츠 주소화) | **sha256 content-addressed** + MIME 실바이트 검증 + 원자적 쓰기 | `MediaHost::store`(:75~100) | PARTIAL-strong |
| **Retention(GC)** | 참조 스캔 후 미참조 자산 회수(grace 7일) | `MediaHost::gc`(:168~180) | PARTIAL |
| 자산 blob | `brand_asset` | `CreativeStore`(:283·:288) | PARTIAL-weak |
| 소스 메타데이터 | `data_source`(type·channel·account·credential·data_kind·priority·status·last_seen) | `DataPlatform`(:61~73) | PARTIAL |
| 품질·신뢰 메타 | 레코드 품질 스캔·`reliability_score`·freshness | `DataPlatform`(:231·:308) | PARTIAL |
| 지식/데이터 삭제권 | DSAR export/execute·식별그래프 삭제 | `Dsar`(:409·:539·:683~698) | PARTIAL |
| Security 상속 | 테넌트·RBAC·감사·암호화 | `Db`·`index.php`(047)·`SecurityAudit`(048)·`Crypto`(049) | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·grep 0)
★**Vector Database 전면**: EMBEDDING/VECTOR_INDEX/VECTOR_COLLECTION 엔티티·**Embedding Storage·임베딩 생성**·**ANN Index**(hnsw/ivfflat)·**Similarity Search(벡터)**·Hybrid Search·Multi-Vector Index·Collection Management·Vector Versioning·Vector Optimization·**Vector Registry**.
★**Semantic Search 전면**: 시맨틱 검색기·Semantic Similarity Analysis·Embedding Management Service(★프론트 `GlobalSearch`(:9·:95~103)는 **하드코딩 메뉴 substring 필터**·백엔드 전역 검색 엔드포인트 부재).
★**Knowledge Graph(지식 도메인) 전면**: KNOWLEDGE_NODE/KNOWLEDGE_EDGE/KNOWLEDGE_GRAPH 엔티티·**Entity Extraction**·**Ontology Management**·Knowledge Linking·**Graph Query(질의언어)**·형식 Graph Analytics·**Graph Visualization**·Graph Reasoning(★`graph_node`/`graph_edge`는 **마케팅 기여도 그래프**·노드유형 4종 하드코딩·지식 온톨로지 아님).
★**RAG Retrieval Engine(형식)**: RETRIEVAL_QUERY/KNOWLEDGE_CONTEXT 엔티티·Semantic/Hybrid Retrieval·**Metadata Filtering**·형식 Context Ranking·**Citation Management**(실코드 0)·Context Window Optimization·**Retrieval Evaluation**·**Retrieval Analytics**.
★**Knowledge Management/Governance**: **Enterprise Knowledge Registry**(§6 "모든 지식 자산의 기준")·KNOWLEDGE_OBJECT/KNOWLEDGE_SOURCE 엔티티·**KNOWLEDGE_VERSION·변경 이력**(§7 "모든 Knowledge는 버전과 변경 이력 관리" **미충족** — 코퍼스는 매 배포 **전량 덮어쓰기**·`legal_doc`은 `updated_at`만)·**Knowledge Lineage**·Knowledge Validation·Knowledge Discovery/Recommendation·Knowledge Analytics·Knowledge/Metadata/Embedding/Retrieval/Version/Retention **Policy 객체**·Compliance Validation·**KNOWLEDGE_AUDIT 엔티티**·Knowledge Operations Dashboard·AI Knowledge Advisor·Knowledge Governance Manager.
★**Lifecycle 미구현 단계**: Embedding Generation·(벡터)Indexing·**Retirement**·**Archive**.
★**Security**: **Knowledge Encryption**(`legal_doc.body`·코퍼스 JSON 평문)·**Vector Protection**(벡터 부재로 동반)·**Sensitive Knowledge Masking**·**접근 정책 기반 Retrieval 제한**(§13 필수·현행 코퍼스는 **전 테넌트 공용 단일 파일**·per-user 지식 ACL 부재).
★**Event 표준 8종 전부**: KnowledgeRegistered/EmbeddingGenerated/VectorIndexed/RetrievalExecuted/KnowledgeUpdated/CitationGenerated/KnowledgePublished/KnowledgeAudited.
★**Document Intelligence**: Document Parsing(PDF/Office 등)·자동 Knowledge Extraction(★현행 파싱 대상은 **자사 소스코드·i18n**뿐·업로드 문서 파이프라인 없음).
★**성능 SLA(§18)**: Embedding ≤2s·Vector Search ≤300ms·Semantic ≤500ms·RAG ≤1s·**99.99% 가용성**=측정·보증 장치 부재(단일호스트·Part 044/045/050 승계).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ 지식 코퍼스는 **테넌트 무관 단일 전역 파일**(`backend/data/chatbot_feature_*`)이다 — 내용이 **제품 기능 설명**이라 현재는 테넌트 데이터가 아니어서 문제되지 않으나, **테넌트 문서를 넣는 순간 격리가 필수**(설계 제약·§D-5). ⓑ `graph_node`에 `(tenant_id,node_type,node_id)` UNIQUE 제약이 없어 애플리케이션 레벨 select-then-insert로 upsert한다(`GraphScore`:66~78 주석에 명시·**288차 확정·수정 완료분**([[project_n288_full_audit]]) — 상태 기술만·재플래그 안 함). ⓒ 코퍼스 생성기는 **한국어 정본(`ko.js`) 의존**이며 15개국 별칭은 로케일에서 파생된다(:40).

## 판정
**PARTIAL-weak (어휘(non-vector) 지식 파이프라인 + 범용 typed 그래프 저장소 실재 / ★Vector DB·Embedding·Semantic Retrieval·Citation·Knowledge Registry·Ontology = 전면 ABSENT).**
★**실재(정직 인정·평가절하 금지)**: 본 Part의 최대 자산은 **`tools/gen_chatbot_knowledge.mjs` 지식 코퍼스 파이프라인**으로, 수집(:109·:121·:132)→**분류**(:156~171)→**메타데이터 추출**(:183~222)→**문서(기능)블록 생성**(:172)→**문서빈도 기반 변별어휘 확정**(:226~240)→산출(:291~297)→**매 배포 재생성**(`deploy.ps1`:14)까지 이어지는 **고전 IR(정보검색) 파이프라인이 실제로 동작**하며, 검색측은 `ClaudeAI::geniegoFeatureDetails`(:206~276)가 점수화·상위40% 컷·top-N 주입으로 완결한다. 또한 **범용 typed 속성 그래프**(`graph_node`/`graph_edge`·가중 엣지·meta_json·양방향 인덱스·**3-hop 가중 순회 + 경로 열거** `GraphScore`:187~235)와 **콘텐츠 주소화 자산 저장 + GC 회수**(`MediaHost`:75~100·:168~180), 다국어 문서 저장·게시(`LegalDoc`:34~45·:72·:104), 소스 메타데이터·품질/신뢰(`DataPlatform`:61~73·:231·:308)가 실재한다.
★**부재(grep 0·부재증명 완료·축소 금지)**: **임베딩·벡터 인덱스·시맨틱 검색·Citation·Knowledge Registry·KNOWLEDGE_VERSION/Lineage·Ontology/Entity Extraction·Knowledge ACL·Knowledge Encryption·Event 8종·성능 SLA**. 명세 §7 "모든 Knowledge는 버전과 변경 이력 관리"·§10 "검색 결과는 근거(Citation)와 함께 제공"·§13 "민감 Knowledge는 접근 정책에 따라 Retrieval 제한"은 **전부 미충족**.
★**오흡수 금지**: `graph_node`/`graph_edge`=**마케팅 기여도 그래프**(노드유형 influencer/creative/sku/order 하드코딩)≠Enterprise Knowledge Graph · 3-hop 고정 체인≠범용 Graph Traversal/Query 언어 · `attribution_identity_link`(280차 식별 그래프)≠Knowledge Graph · **어휘 df 가중≠임베딩/시맨틱 유사도** · **기능블록≠DOCUMENT_CHUNK(임베딩 단위)** · Vite `manualChunks`≠Chunk · 협업필터링 `cosine`≠벡터 유사도 · `GlobalSearch`/`CommandPalette` substring 필터≠Semantic Search · `MediaHost` 파일 저장소≠Knowledge Repository · `DataPlatform` **데이터** 소스 메타≠**지식** 메타데이터 · 코퍼스 전량 재생성≠Knowledge Versioning · `ai_analyses`·로그≠KNOWLEDGE_AUDIT. 코드 변경 0.
