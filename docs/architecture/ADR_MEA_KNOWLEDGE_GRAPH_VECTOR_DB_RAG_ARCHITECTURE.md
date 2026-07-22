# ADR — MEA Part 055 Enterprise Knowledge Graph, Vector Database & RAG Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·데이터 헌법 V2/V3·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## Context
MEA Part 055는 기업 지식·문서·메타데이터·임베딩·시맨틱 검색·Knowledge Graph·RAG를 통합 관리하려 한다. GeniegoROI에는 **비-벡터(어휘) 지식 파이프라인이 실제로 동작**한다: `tools/gen_chatbot_knowledge.mjs`가 라우트·i18n 정본·사이드바·팔레트에서 지식을 **수집**(:109·:121·:132)→**분류 9종**(:156~171)→**메타데이터 추출**(:183~222)→**기능블록 생성**(:172)→**문서빈도 기반 변별어휘 확정**(:226~240)→**코퍼스 2종 산출**(:291~297)하고, **매 배포 전량 재생성**(`deploy.ps1`:14)되어 신규 기능을 자동 인지한다. 검색측은 `ClaudeAI::geniegoFeatureDetails`(:206~276)가 점수화·상위 40% 컷·top-N 주입으로 완결한다. 또한 **범용 typed 속성 그래프**(`graph_node`/`graph_edge` `Db`:816~839)와 **3-hop 가중 순회 + 경로 열거**(`GraphScore`:187~235), **content-addressed 자산 저장 + GC**(`MediaHost`:75~100·:168~180), 다국어 문서·게시(`LegalDoc`:34~45·:72·:104), 소스 메타·품질/신뢰(`DataPlatform`:61~73·:231·:308), 삭제권(`Dsar`:409·:539)이 실재한다.
반면 **명세의 3대 축은 전면 부재**: **Vector Database**(임베딩·ANN·컬렉션·Vector Registry)·**Semantic Search**·**Knowledge Graph(지식 도메인·온톨로지)**. 여기에 **Citation·Enterprise Knowledge Registry·KNOWLEDGE_VERSION/Lineage·Knowledge ACL·Event 8종**도 전부 grep 0(부재증명 완료).
★상속: 본 Part의 RAG 순신설분은 **Part 053 ADR D-4를 직접 승계**하며 재판정하지 않는다.

## D-1 실 지식 계층=어휘(non-vector) IR 파이프라인 · 벡터 계층은 순신설
**결정**: 실재하는 것은 **고전 IR(정보검색) 파이프라인**이다 — 문서(기능블록) 구성 + **문서빈도(df)로 변별력 없는 어휘 배제**(DF_MAX 3·:226~232) + 변별 어휘 확정(:233~240) + 질의 점수화·상위 40% 컷·top-N(:245~251). 이는 "지식 블록을 그냥 주입"하는 수준이 **아니며**, 뭉뚱그린 평가절하를 금지한다.
★그러나 **임베딩·벡터 인덱스·시맨틱 유사도는 전무**(grep 0: embedding/vector_index/ann_index/hnsw/ivfflat/pgvector/faiss/pinecone/weaviate)이며, 명세 §9 Vector Database 8항목·§10 Semantic/Hybrid Retrieval은 **전부 순신설**이다.
★**오흡수 금지**: 어휘 df 가중 ≠ 임베딩/시맨틱 유사도 · 기능블록 ≠ 임베딩 DOCUMENT_CHUNK · Vite `manualChunks` ≠ RAG Chunk · 협업필터링 `cosine`(282차) ≠ 벡터 유사도 · `GlobalSearch`(:9·:95~103)/`CommandPalette`의 **하드코딩 메뉴 substring 필터** ≠ Semantic Search.

## D-2 ★Knowledge Graph=`graph_node`/`graph_edge` **node_type 확장**으로 승격 · 새 테이블 금지
**결정**: `graph_node`(tenant·node_type·node_id·label·`meta_json`:816~824)/`graph_edge`(src/dst typed·`edge_weight`·`edge_label`·`meta_json`:826~837)+양방향 인덱스(:838~839)는 **저장 shape가 범용 typed 속성 그래프**이고, `GraphScore`는 **3-hop 가중 순회와 경로 열거**(:187~235·hop1:192/hop2:207/hop3:216)를 실제로 수행한다.
★그러나 **도메인은 마케팅 기여도**(노드유형 influencer/creative/sku/order **하드코딩**·클래스 주석 :12~30)이며 **Ontology·Entity Extraction·Graph Query 언어·Visualization·Graph Reasoning은 부재**다. 따라서 "Knowledge Graph 실재"는 **과대주장**이고, "무관하니 새로 만든다"는 **중복**이다.
★**결정된 경로**: Knowledge Graph는 **새 테이블이 아니라 기존 `graph_node.node_type` 확장**으로 얹는다(기존 4종 불변=무회귀·헌법 V4). ★오흡수 금지: `attribution_identity_link`(280차 세션↔해시 식별 그래프·`Dsar`:683~698)는 KG가 아니다.

## D-3 ★코퍼스·Retriever 이원화 금지 — 기존 파이프라인이 유일 인덱싱 소스
**결정**: RAG 구현 시 **별도 수기 코퍼스 신설 금지**. `gen_chatbot_knowledge.mjs` 산출물(`backend/data/chatbot_feature_map.md`·`chatbot_feature_details.json`)이 **유일 인덱싱 소스**다([[reference_chatbot_knowledge_pipeline]]) — 두 코퍼스는 곧 **두 개의 진실**이고 값 분산은 회귀다([[feedback_no_regression_value_unification]]).
★**Retriever도 이원화 금지**: 벡터 검색은 `geniegoFeatureDetails`(:206)를 **대체하지 않고 Hybrid의 어휘 축으로 편입**한다. 현행 어휘 경로는 **임베딩·API 키 없이도 동작**하므로 제거 시 무키/저비용 경로가 사라져 **회귀**.
★**Citation은 신규 수집 없이 승격 가능**: 블록→출처 매핑(ns·`paths`)이 **이미 코퍼스에 존재**(:183~222)하므로 반환 계약만 추가하면 된다. 현행의 프롬프트 반날조 지시(`ClaudeAI`:271·:309)는 **구조화 인용이 아니다**(정직 표기).

## D-4 ★★테넌트 격리·Knowledge ACL = 최우선 선행 조건 (누락 시 크로스테넌트 지식 누출)
**결정**: 현행 지식 코퍼스는 **테넌트 무관 전역 단일 파일**이다. 내용이 **제품 기능 설명**이라 **현재는 무해**하나(정직 병기), **테넌트 문서·계약서·내부 자료를 인덱싱하는 순간 테넌트 격리 + per-user Knowledge ACL이 선행 필수**다 — 누락 시 RAG가 **크로스테넌트 지식 누출 경로**가 된다.
★적용 패턴은 이미 저장소에 있다: `GraphScore::tenantId`(:33~41)의 **fail-closed 해석**(`auth_tenant` 우선·**raw `X-Tenant-Id` 헤더를 적재 테넌트로 신뢰하지 않음**)을 **인덱싱·검색 전 경로에 동일 적용**([[reference_platform_growth_actas_tenant_hijack]]).
★명세 §13 "민감한 Knowledge는 접근 정책에 따라 Retrieval을 **제한**한다" → 현행 **미충족**(검색에 정책 필터 없음)·순신설. **Knowledge Encryption**(`legal_doc.body`·코퍼스 JSON 평문)·**Sensitive Masking**도 동반 순신설(`Crypto` 049 재사용).

## D-5 임베딩 호출은 Part 053 LLM Gateway 경유 강제 · 별도 provider 경로 신설 금지
**결정**: Embedding Management Service는 **자체 provider 호출 경로를 만들지 않는다**. Part 053 ADR D-2가 확정한 대로 **`ClaudeAI::complete` 승격 게이트웨이를 경유**하며, 흡수 시 **최대집합 승계 4조건**(quota 게이트·BYO 키 우선·`Crypto` 복호·감사 스키마)을 그대로 따른다. 임베딩 비용은 **별도 quota 테이블이 아니라 기존 `ai_usage_quota`(053 :529~539) 미터링에 편입**한다.
★근거: 053에서 이미 **텍스트 LLM 호출 경로 2개 병존**(quota 미경유 경로 존재)이 확인됐다 — 여기에 **세 번째 경로(임베딩)를 추가하면 동일 부채가 확대**된다.
★인프라: pgvector/외부 벡터DB 선택은 **단일호스트 현실**을 전제로 재검토(Part 044/045/050 승계·§18 99.99% SLA는 현재 미보증).

## D-6 자산·문서·메타데이터·삭제권은 기존 정본 재사용 · 중복 저장소 금지
**결정**: 문서 원본 저장=**`MediaHost` content-addressed 저장 재사용**(sha256·**실바이트 MIME 검증**·원자적 쓰기 :75~100) + **Retention=`MediaHost::gc`**(참조 스캔·grace 7일 :168~180) — 별도 업로드 저장소·별도 GC 신설 금지. DOCUMENT=`legal_doc`(:34~45) 확장 · 자산=`brand_asset`(`CreativeStore`:283/:288) · 메타/품질=`DataPlatform`(:61~73·:231·:308·★**데이터** 메타이지 **지식** 메타가 아님 — 오흡수 금지) · **삭제권=`Dsar`**(:409·:539) 편입(중복 삭제 경로 금지) · Audit tamper-evidence 정본=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]])이며 KNOWLEDGE_AUDIT은 그 위에 얹는다.
★신규 API는 `/api` 접두 변형 동시 등재([[reference_api_prefix_routing]]) + **053 D-5 교훈 승계**: 인증 공개 bypass 접두에 Knowledge 관리·감사 API 배치 금지(인증 우회).

## D-7 ★AI 자동 게시 금지는 현행이 구조적으로 충족 (정직 기술·후퇴 금지)
**결정**: 명세 §17 말미 "AI는 검증되지 않은 Knowledge를 자동 게시하거나 기업 지식 저장소를 자동 변경하지 않는다"는 **현행 설계가 구조적으로 충족**한다: ⓐ 코퍼스 생성자는 **AI가 아니라 결정적 빌드 스크립트**(:156~240) ⓑ 소스는 **사람이 작성한 i18n·라우트 정본** ⓒ `LegalDoc` 게시는 **관리자 수동**(:104) ⓓ **AI는 코퍼스를 읽기만 하고 쓰기 경로가 없다**.
★따라서 §17의 "Automatic Knowledge Extraction"은 **현재 비-AI 규칙 기반**이며 이를 "AI 지식 추출 실재"로 기술하면 **과대주장**이다(정직 표기).
★**후퇴 금지**: 향후 LLM 기반 자동 지식 추출을 도입한다면 **검증·승인 게이트를 반드시 앞에 둔다**(무게이트 자동 게시=명세 §17 + 헌법 V5 동시 위반·[[feedback_deploy_approval_mandatory]]).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL-weak** — 어휘 지식 파이프라인·범용 그래프 저장소·자산/문서/메타는 실재하나 **명세 3대 축(Vector DB·Semantic Search·지식 Knowledge Graph)은 전면 부재**.
- ★중복 금지 재사용: `gen_chatbot_knowledge.mjs`(코퍼스)·`geniegoFeatureDetails`(어휘 검색)·`GeniegoKnowledge`·`graph_node`/`graph_edge`+`GraphScore`·`MediaHost`(저장·GC)·`LegalDoc`·`CreativeStore`·`DataPlatform`·`Dsar`·`Crypto`/`SecurityAudit`/`index.php`.
- ★순신설: Embedding Service·Vector DB(저장·ANN·컬렉션·버저닝·Vector Registry)·Semantic/Hybrid Retrieval·Metadata Filtering·**Citation**·Retrieval Evaluation/Analytics·**Enterprise Knowledge Registry**·KNOWLEDGE_OBJECT/VERSION/POLICY/AUDIT·Lineage·Ontology/Entity Extraction/Graph Query/Visualization·**Knowledge ACL**·Encryption·Masking·Document Parsing(외부문서)·Dashboard/Governance Manager/Advisor·Event 8종.
- ★오흡수 금지: 마케팅 기여도 그래프≠Knowledge Graph · 3-hop 고정 체인≠범용 순회/질의 · 식별그래프≠KG · 어휘 df≠임베딩 · 기능블록≠임베딩 청크 · Vite chunk≠RAG 청크 · CF cosine≠벡터 유사도 · substring 필터≠Semantic Search · 파일 저장소≠Knowledge Repository · **데이터** 메타≠**지식** 메타 · 전량 재생성≠Versioning · 반날조 지시문≠구조화 Citation · 배치 재생성≠이벤트 · `SecurityAudit`≠KNOWLEDGE_AUDIT.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·미검증 Knowledge 자동 게시·지식 저장소 자동 변경 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 042/044/046/047/048/049/051/052/**053**/054·EPIC 06-A 상속·재감사 금지(288차 `graph_node` UNIQUE 부재 확정·수정 완료분 포함).
