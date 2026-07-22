# MEA Part 055 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = Knowledge/Vector/RAG 계층 신설이 기존 **지식 코퍼스 파이프라인**(`tools/gen_chatbot_knowledge.mjs`+`GeniegoKnowledge`+`backend/data/chatbot_feature_*`)·**검색측**(`ClaudeAI::geniegoFeatureDetails`)·**그래프 저장소**(`graph_node`/`graph_edge`+`GraphScore`)·**자산 저장**(`MediaHost`/`CreativeStore`)·**문서**(`LegalDoc`)·**메타데이터**(`DataPlatform`)와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4 단일 Intelligence Layer·중복 인텔리전스 금지. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| LLM 호출·프롬프트·토큰·Function Calling | ★MEA Part 053(`ClaudeAI`·`complete()`) | ★재정의 금지·재사용 |
| **RAG 순신설분 정의** | ★MEA Part 053 ADR D-4(어휘 검색 실재·벡터 계층 순신설) | ★**본 Part가 직접 상속·재판정 금지** |
| Agent·Tool·Autonomous Workflow | ★MEA Part 054(`agenticAsk`·`JourneyBuilder`) | ★재정의 금지(Knowledge 도구는 기존 tools 배열 증설) |
| AI Platform 자산·모델 | ★MEA Part 051/052(`ClaudeAI`·`ModelMonitor`) | ★재정의 금지·재사용 |
| 데이터 소스·품질·신뢰(READY) | ★데이터 헌법 V2/V3·`DataPlatform` | ★재정의 금지·재사용 |
| 단일 Intelligence Layer(중복 엔진 금지) | ★헌법 Volume 4 | ★재정의 금지 |
| 미검증 자동 게시·자동 변경 금지 | ★헌법 Volume 5·`CHANGE_GATE` | ★재정의 금지·재사용 |
| 테넌트 격리·RBAC·감사·암호화 | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |
| API Gateway·Observability | ★MEA Part 042/046 | ★재정의 금지 |
| DSAR·삭제권 | `Dsar`(283차) | ★재정의 금지(지식 삭제는 여기 편입) |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 지식/그래프/검색 엔진 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| KNOWLEDGE_SOURCE / 코퍼스 생성 | 자동 재생성 지식 파이프라인 | `gen_chatbot_knowledge.mjs`(:109~240·:291~297) | ★재사용(**중복 코퍼스 신설 절대 금지**) |
| Classification / Metadata Extraction | 키 기반 9분류·ns 메타 추출 | 동(:156~171·:183~222) | ★재사용(재구현 금지) |
| Indexing | **어휘 df 가중**(DF_MAX 3) | 동(:226~240) | ★재사용·★오흡수 금지(df≠임베딩 인덱스) |
| DOCUMENT_CHUNK | 네임스페이스=1 기능블록 | 동(:172·:183~222) | ★오흡수 금지(표시 단위≠임베딩 청크) |
| Chunk(번들) | Vite `manualChunks` | `vite.config.js` | ★오흡수 금지(번들 분할≠RAG 청크) |
| RETRIEVAL_QUERY / Retrieval | 어휘 점수 top-N | `ClaudeAI::geniegoFeatureDetails`(:206~276) | ★재사용·승격(**중복 Retriever 금지**) |
| Context Ranking | 점수 정렬·상위40% 컷 | 동(:245~248·:251) | ★재사용·★오흡수 금지(어휘 정렬≠시맨틱 랭킹) |
| Semantic Search | 하드코딩 메뉴 substring 필터 | `GlobalSearch`(:9·:95~103)·`CommandPalette` | ★오흡수 금지(문자열 포함≠시맨틱) |
| Similarity(벡터) | 협업필터링 상품추천 `cosine` | (282차 CF 추천) | ★오흡수 금지(추천 유사도≠임베딩 검색) |
| KNOWLEDGE_NODE/EDGE 저장 | `graph_node`/`graph_edge`(typed·가중·meta_json) | `Db`(:816~839)·`GraphScore`(:44·:107) | ★**재사용·확장**(중복 그래프 테이블 절대 금지) |
| KNOWLEDGE_GRAPH(도메인) | 마케팅 기여도 그래프 | `GraphScore` 클래스 주석(:12~30) | ★오흡수 금지(기여도 도메인≠기업 지식 온톨로지) |
| Graph Traversal | 3-hop 가중 순회·경로 열거 | `GraphScore::scoreInfluencer`(:187~235) | ★재사용·★오흡수 금지(고정 체인≠범용 순회/질의) |
| 식별 그래프 | `attribution_identity_link` | `Dsar`(:683~698) | ★오흡수 금지(세션↔해시 식별≠Knowledge Graph) |
| DOCUMENT | `legal_doc`(다국어 본문) | `LegalDoc`(:34~45) | ★재사용(중복 문서 테이블 금지) |
| Knowledge Publishing | 관리자 저장→공개 조회 | `LegalDoc`(:104·:72) | ★재사용 |
| Knowledge Repository(바이너리) | sha256 content-addressed 저장 | `MediaHost::store`(:75~100) | ★재사용·★오흡수 금지(파일 저장≠Knowledge Repository) |
| Retention Policy | 미참조 자산 GC(grace 7일) | `MediaHost::gc`(:168~180) | ★재사용(중복 GC 금지) |
| Enterprise Metadata | `data_source`·품질·신뢰 | `DataPlatform`(:61~73·:231·:308) | ★재사용·★오흡수 금지(**데이터** 메타≠**지식** 메타) |
| Knowledge Audit | 해시체인 `SecurityAudit::verify` | (048) | ★재사용(정본·중복 감사 금지) |
| Knowledge Encryption | `Crypto` AES-256-GCM | (049) | ★재사용(중복 암호화 금지) |
| Knowledge 삭제권 | DSAR export/execute | `Dsar`(:409·:539) | ★재사용(중복 삭제 경로 금지) |

## ★★내부 중복 위험(신설 시 발생할 것) — 사전 차단
1. **코퍼스 이원화 금지**: RAG 도입 시 별도 수기 코퍼스를 만들면 `chatbot_feature_*`와 **두 개의 진실**이 생긴다. **`gen_chatbot_knowledge.mjs` 산출물을 유일 인덱싱 소스로 사용**([[reference_chatbot_knowledge_pipeline]]·[[feedback_no_regression_value_unification]]).
2. **Retriever 이원화 금지**: 벡터 검색 도입 시 `geniegoFeatureDetails`(:206)를 **대체가 아니라 Hybrid의 어휘 축으로 편입**. 어휘 검색을 제거하면 **키 없는/저비용 경로가 사라져 회귀**(현재 임베딩 없이도 동작).
3. **그래프 이원화 금지**: Knowledge Graph를 새 테이블로 만들면 `graph_node`/`graph_edge`와 중복. **동일 테이블에 `node_type`을 확장**(기존 4종 불변·무회귀)하는 것이 정본 경로.
4. **자산 저장 이원화 금지**: 문서 원본 저장은 `MediaHost` content-addressed 저장(:75~100)+GC(:168~180) 확장. 별도 업로드 저장소 신설 금지.

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. 코퍼스·검색·그래프·자산·문서·메타데이터 substrate가 **전부 실재** → **중복 신설 금지·기존 심화**. 헌법 V4 "중복 인텔리전스 금지".
- ★[[feedback_minimize_new_menus]]: Knowledge Operations Dashboard는 신규 사이드바가 아니라 기존 AI/데이터 메뉴 편입 우선.
- ★[[feedback_no_regression_value_unification]]: **어휘 검색 경로·df 가중·매 배포 재생성·MediaHost GC·그래프 fail-closed 테넌트 해석**(`GraphScore`:33~41)은 약화 시 즉시 회귀.
- ★[[feedback_competitive_gap_verify]]: Vector DB·임베딩·시맨틱·Citation·Ontology 부재=grep 0 부재증명 완료. **동시에 코퍼스 파이프라인·그래프 순회·content-addressed 저장은 실재분으로 인정**(뭉뚱그린 감점 금지).
- ★[[feedback_real_value_autoderive]]: Retrieval Analytics(적중률·미검색률)는 실 질의 로그 파생이어야 하며 임의 수치 금지. ★현재 **질의 로그 자체가 부재**(순신설).
- ★[[reference_menu_audit_log_not_tamper_evident]]: KNOWLEDGE_AUDIT tamper-evidence 정본=`SecurityAudit::verify`만.
- ★[[reference_platform_growth_actas_tenant_hijack]]: **RAG 인덱스·Knowledge Graph는 테넌트 격리 절대**. `GraphScore::tenantId`(:33~41)의 fail-closed 해석(`auth_tenant` 우선·raw 헤더 불신)을 **동일하게 적용**해야 하며 완화 시 크로스테넌트 지식 누출.
- ★[[reference_api_prefix_routing]]: 신규 Knowledge API는 `/api` 접두 변형 동시 등재 필수.
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI가 검증되지 않은 Knowledge를 자동 게시하거나 지식 저장소를 자동 변경 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: KNOWLEDGE_SOURCE/Acquisition/Classification/Metadata=`gen_chatbot_knowledge.mjs` · Retriever(어휘 축)=`geniegoFeatureDetails` · KNOWLEDGE_NODE/EDGE=`graph_node`/`graph_edge`(**node_type 확장**) · Traversal=`GraphScore` · DOCUMENT=`legal_doc` · 원본 저장·Retention=`MediaHost`(store/gc) · 자산=`CreativeStore` · 메타/품질=`DataPlatform` · Audit=`SecurityAudit` · 암호화=`Crypto` · 삭제권=`Dsar` · 테넌트/RBAC=`Db`/`index.php` · LLM=Part 053 `complete()`.
- **순신설(부재·grep 0)**: ★**Embedding Management Service**·**Vector Database**(저장·ANN·컬렉션·버저닝·Vector Registry)·**Semantic/Hybrid Retrieval**·**Metadata Filtering**·**Citation Management**·Context Window Optimization·Retrieval Evaluation/Analytics·**Enterprise Knowledge Registry**·KNOWLEDGE_OBJECT/VERSION/POLICY/AUDIT 엔티티·**Knowledge Lineage**·Ontology Management·Entity Extraction·Graph Query 언어·Graph Visualization·**Knowledge ACL(접근정책 기반 Retrieval 제한)**·Knowledge Encryption·Sensitive Knowledge Masking·Document Parsing(외부 문서)·Knowledge Operations Dashboard·Knowledge Governance Manager·AI Knowledge Advisor·**Event 표준 8종**.

## 판정
**중복 위험 高(코퍼스·검색·그래프·자산·문서·메타데이터 substrate 전부 실재) + ★신설 시 발생할 내부 중복 4종 사전 차단 명시.** ★핵심=`tools/gen_chatbot_knowledge.mjs`(수집·분류·메타추출·블록생성·df 가중·매 배포 재생성)·`ClaudeAI::geniegoFeatureDetails`(어휘 검색·top-N)·`GeniegoKnowledge`(정적 지식)·`graph_node`/`graph_edge`+`GraphScore`(typed 속성 그래프·3-hop 가중 순회)·`MediaHost`(content-addressed 저장+GC)·`LegalDoc`(다국어 문서·게시)·`DataPlatform`(소스 메타·품질/신뢰)·`Dsar`(삭제권)·`Crypto`/`SecurityAudit`/`index.php`(보안)는 **재사용/승격**(★중복 코퍼스·Retriever·그래프 테이블·자산 저장소 신설 절대 금지=헌법 V4·정본 재구현 금지). 헌법 V4/V5·데이터 헌법 V2/V3·Part 042/046/047/048/049/051/052/**053**/054·EPIC 06-A **재정의 금지**. 본 Part 고유 순신설=★Embedding/Vector DB·Semantic·Hybrid·Metadata Filtering·**Citation**·Knowledge Registry/Version/Lineage/Policy/Audit·Ontology·Entity Extraction·Graph Query/Visualization·**Knowledge ACL**·암호화·마스킹·Document Parsing·Dashboard/Advisor·Event 8종뿐(부재·grep 0·부재증명 완료). ★오흡수 금지(마케팅 기여도 그래프≠Knowledge Graph·3-hop 고정 체인≠범용 순회/질의·식별그래프≠KG·어휘 df≠임베딩·기능블록≠임베딩 청크·Vite chunk≠RAG 청크·CF cosine≠벡터 유사도·substring 필터≠Semantic Search·파일 저장소≠Knowledge Repository·데이터 메타≠지식 메타·전량 재생성≠Versioning·로그≠KNOWLEDGE_AUDIT). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★미검증 Knowledge 자동 게시·저장소 자동 변경 불가(V5+CHANGE_GATE). ★Part 053 정합: 본 Part의 RAG 순신설분은 053 ADR D-4를 **직접 상속**하며 **재판정하지 않는다**(값 분산=회귀).
