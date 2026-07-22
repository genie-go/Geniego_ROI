# MEA Part 055 — Enterprise Knowledge Graph, Vector Database & RAG Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(grep 0)·정직 표기(어휘검색·비-벡터·그래프 도메인 상이·빌드타임 배치)·과대주장 금지·**부재 축소 금지**·오흡수 금지·헌법 V4/V5·데이터 헌법 V2/V3 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART055_KNOWLEDGE_GRAPH_VECTOR_DB_RAG_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19(verbatim) |
| 2 | ADR | `docs/architecture/ADR_MEA_KNOWLEDGE_GRAPH_VECTOR_DB_RAG_ARCHITECTURE.md` | 결정 D-1~D-7 |
| 3 | GT① EXISTING | `docs/data/MEA_PART055_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART055_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART055_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART055_GOVERNANCE_MECHANISMS.md` | §7~§17 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART055_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-weak (어휘(non-vector) 지식 파이프라인 + 범용 typed 그래프 저장소 실재 / ★명세 3대 축 Vector DB·Semantic Search·지식 Knowledge Graph = 전면 ABSENT).**
★**실재(정직 인정·평가절하 금지)**: ① **결정적 지식 코퍼스 파이프라인** `tools/gen_chatbot_knowledge.mjs` — 수집(라우트·i18n 정본·사이드바·팔레트 :109/:121/:132/:134)→**분류 9종**(:156~171)→**메타데이터 추출**(제목·15개국 별칭·진입경로·라틴토큰·행동/필드/상태/주의 :183~222)→**기능블록 생성**(잡음 ns 배제 MIN_KEYS 4 :172)→**문서빈도(df) 기반 변별어휘 확정**(DF_MAX 3 :226~232·:233~240)→**코퍼스 2종 산출**(:22/:24·:291~293/:296~297)→**매 배포 전량 재생성**(`deploy.ps1`:14·`package.json`:7 = 신규 기능 자동 인지) ② **어휘 Retrieval** `ClaudeAI::geniegoFeatureDetails`(:206~276·상위40% 컷:245~248·top-N:251·전량 100KB 주입 회피 의도 :202) ③ **범용 typed 속성 그래프** `graph_node`/`graph_edge`(label·**edge_weight**·edge_label·`meta_json`·양방향 인덱스 `Db`:816~839) + **3-hop 가중 순회 + 경로 열거**(`GraphScore::scoreInfluencer`:187~235·hop1:192/hop2:207/hop3:216·`summary`:429·API `routes.php`:732~740) ④ **fail-closed 테넌트 해석**(`GraphScore::tenantId`:33~41 — `auth_tenant` 우선·**raw `X-Tenant-Id` 불신**) ⑤ **content-addressed 자산 저장**(sha256·**실바이트 MIME 검증**·원자적 쓰기 `MediaHost::store`:75~100) + **Retention GC**(참조 스캔·grace 7일 :168~180) ⑥ 다국어 문서·수동 게시(`LegalDoc`:34~45·:72·:104) ⑦ 소스 메타·품질/신뢰(`DataPlatform`:61~73·:231·:308) ⑧ 삭제권(`Dsar`:409·:539·식별그래프 :683~698) ⑨ 정적 지식(`GeniegoKnowledge`:13/:520/:646) ⑩ **AI 쓰기 경로 부재**(자동 게시 불가).
★**ABSENT(grep 0·부재증명 완료·축소 금지)**: **Vector Database 전면**(EMBEDDING·VECTOR_INDEX·VECTOR_COLLECTION·Embedding Storage·**ANN Index**·Similarity/Hybrid Search·Multi-Vector·Collection Management·Vector Versioning/Optimization·**Vector Registry**) · **Semantic Search 전면**(Semantic Similarity Analysis·Embedding Management Service) · **Knowledge Graph(지식 도메인)**(KNOWLEDGE_NODE/EDGE/GRAPH 엔티티·**Entity Extraction**·**Ontology Management**·Knowledge Linking·**Graph Query 언어**·**Graph Visualization**·Graph Reasoning) · **RAG 형식 계층**(RETRIEVAL_QUERY/KNOWLEDGE_CONTEXT 엔티티·Semantic/Hybrid Retrieval·**Metadata Filtering**·**Citation Management**(실코드 0)·Retrieval Evaluation/Analytics) · **Enterprise Knowledge Registry**(§6 근간) · **KNOWLEDGE_VERSION·변경이력**(§7 "모든 Knowledge는 버전과 변경 이력 관리" **미충족** — 코퍼스는 **전량 덮어쓰기**·`legal_doc`은 `updated_at` 1필드) · **Knowledge Lineage**·Validation·Discovery·Recommendation·Analytics · 전 **Policy 객체**·Compliance Validation·Governance Manager·Dashboard·Advisor · **KNOWLEDGE_AUDIT 엔티티** · **Knowledge ACL(접근정책 기반 Retrieval 제한·§13 필수)**·**Knowledge Encryption**(`legal_doc.body`·코퍼스 JSON 평문)·**Vector Protection**·**Sensitive Masking** · **Document Parsing(외부 PDF/Office)**·Retirement·Archive · **Event 표준 8종** · 성능 SLA §18(99.99%).
★**오흡수 금지(동음이의 실측)**: **`graph_node`/`graph_edge`는 마케팅 기여도 그래프**(노드유형 influencer/creative/sku/order **하드코딩**·클래스 주석 :12~30)**≠Enterprise Knowledge Graph** · 3-hop **고정 체인**≠범용 Graph Traversal/Query 언어 · **`attribution_identity_link`(280차 세션↔해시 식별 그래프)≠KG** · **어휘 df 가중≠임베딩/시맨틱 유사도** · **기능블록≠임베딩 DOCUMENT_CHUNK** · **Vite `manualChunks`≠RAG Chunk** · **협업필터링 `cosine`(282차)≠벡터 유사도 검색** · **`GlobalSearch`(:9·:95~103)/`CommandPalette` 하드코딩 메뉴 substring 필터≠Semantic Search** · `MediaHost` 파일 저장소≠Knowledge Repository · **`DataPlatform` 데이터 소스 메타≠지식 메타데이터** · 전량 재생성≠Knowledge Versioning · **프롬프트 반날조 지시(`ClaudeAI`:271·:309)≠구조화 Citation/Explainable Retrieval** · 배치 재생성·DB write≠이벤트 버스 · `SecurityAudit`≠KNOWLEDGE_AUDIT 엔티티 · `citation` 실코드 히트 **0**(히트는 `frontend/src/i18n/autofill.json`·`demoUiI18n.json` 로케일 산물).
★**강점 정직 기술(후퇴 금지)**: 명세 §17 "AI는 검증되지 않은 Knowledge를 자동 게시하거나 기업 지식 저장소를 자동 변경하지 않는다"는 **현행이 구조적으로 충족** — 코퍼스 생성자는 **AI가 아니라 결정적 빌드 스크립트**(:156~240)·소스는 **사람이 작성한 i18n·라우트 정본**·`LegalDoc` 게시는 **관리자 수동**(:104)·**AI는 읽기만 하고 쓰기 경로가 없다**. 따라서 §17 "Automatic Knowledge Extraction"을 **AI 추출로 기술하면 과대주장**(현재 비-AI 규칙 기반). 코드 변경 0.

## ★★선행 조건 (구현 착수 전 필수)
1. **테넌트 격리 + Knowledge ACL**(ADR D-4) — 현행 코퍼스는 **테넌트 무관 전역 단일 파일**. 내용이 제품 기능 설명이라 **지금은 무해**하나, **테넌트 문서를 인덱싱하는 순간 크로스테넌트 지식 누출 경로**가 된다. `GraphScore::tenantId`(:33~41) fail-closed 패턴을 인덱싱·검색 전 경로에 동일 적용([[reference_platform_growth_actas_tenant_hijack]]).
2. **임베딩 호출은 Part 053 LLM Gateway 경유 강제**(ADR D-5) — 053에서 이미 텍스트 LLM 경로 2개 병존(quota 미경유 경로 존재)이 확인됨. **세 번째 경로 추가 금지**·비용은 기존 `ai_usage_quota` 미터링 편입.
3. **코퍼스·Retriever 이원화 금지**(ADR D-3) — `gen_chatbot_knowledge.mjs` 산출물이 **유일 인덱싱 소스**. 벡터 검색은 어휘 축을 **대체가 아니라 Hybrid로 편입**(어휘 경로는 임베딩·키 없이도 동작 → 제거 시 회귀).
4. **Knowledge Graph는 `graph_node.node_type` 확장**(ADR D-2) — 새 그래프 테이블 신설 금지(기존 4종 불변=무회귀).

## 상속·다음
- **상속**: **Generative AI/LLM/Prompt(053 — 본 Part RAG 순신설분의 직접 상위·ADR D-4 승계·재판정 금지)** + AI Agent(054) + AI Foundation(051)/MLOps(052) + 헌법 Volume 4/5 + 데이터 헌법 V2/V3(소스·품질·Trust) + Enterprise Security(047~049) + Developer Platform(042 API GW·046 Observability) + 가용성(044/045/050) + EPIC 06-A(Role/Permission).
- **다음**: **MEA Part 056 — Enterprise AI Governance, Responsible AI & Model Risk Management Architecture**(명세 지정). ★예상 조사 후보=`ModelMonitor`(드리프트·052 확정)·`Decisioning`/`AutoRecommend`(HITL)·`agent_mode` 3모드(054 확정)·데이터 헌법 V3/V4(XAI·Trust)·`SecurityAudit`. ★**부재 예상은 반드시 grep 부재증명 후 판정**(053에서 가설이 대부분 틀렸던 선례).

## ★AI Platform 진행 (Part 051~055)
Part 051 AI Foundation(PARTIAL) · 052 ML & MLOps(ABSENT-heavy·드리프트 스캐폴드) · 053 Generative AI/LLM/Prompt(PARTIAL·LLM 실행계층 실재·거버넌스 부재·**호출경로 2개 병존=Gateway 1순위 통합**) · 054 AI Agent/Multi-Agent/Autonomous Workflow(PARTIAL-strong) · **055 Knowledge Graph/Vector DB/RAG(★PARTIAL-weak — 어휘 지식 파이프라인·범용 그래프 저장소·content-addressed 자산 실재 / Vector DB·Semantic·지식 KG·Citation·Registry 전면 부재 / ★★선행조건=테넌트 격리+Knowledge ACL)** → 다음 **056 AI Governance/Responsible AI/Model Risk**.
