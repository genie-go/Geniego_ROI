# MEA Part 053 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 053 SPEC/ADR. ★부재증명 완료·과대주장 금지·정직 표기(단일 벤더·어휘검색·감사 부분적).
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★전부 0** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, 로케일 제외): `prompt_template`/`PromptTemplate`/`prompt_registry`/`PromptRegistry`/`prompt_version`/`prompt_test`/`prompt_eval`/`PromptAnalytics`/`llm_gateway`/`LlmGateway`/`provider_abstraction`/`multi_llm`/`vector_search`/`VectorSearch`/`embedding`/`semantic_search`/`similarity_search`/`pgvector`/`faiss`/`pinecone`/`weaviate`/`rag_engine`/`RAGEngine`/`knowledge_source`/`chunk_manage`/`context_window`/`token_usage`/`llm_audit`/`llm_session`/`safety_policy`/`foundation_model`/`response_cache`/`hallucination`.
② **실 substrate 판독**: `ClaudeAI`(3,759줄 · LLM 호출·프롬프트·quota·tool-use·멀티모달)·`AiGenerate`(375줄 · BYO 키·생성 로그)·`CreativeStudio`·`Reviews`·`AdminGrowth`(`ClaudeAI::complete` 소비자)·`GeniegoKnowledge`·`tools/gen_chatbot_knowledge.mjs`·`backend/data/chatbot_feature_{details.json,map.md}`·`Db::ensureAiSettings`·`routes.php`(`/v422/ai/*`·`/ai/*`).
③ **동음이의 배제(오흡수 방지)**: `chunk`(113)=**Vite `manualChunks` 번들 분할**이지 RAG Chunk 아님 · `cosine`(6)=**협업필터링 상품추천 유사도**(282차)이지 벡터 임베딩 검색 아님 · `rag_`(1)=`demoUiI18n.json` 한국어 문자열 내부 우연 일치 · `embedding`/`hallucination` 실코드 히트=**0**(초기 전체스캔의 히트는 전부 `docs/**`·아카이브 tarball 산물) · `MarketingDataHub`의 `ChatGPT Search (OpenAI)`(:18)·`google_gemini`(:43)=**AI 검색채널 점유율 참조 데이터**이지 LLM Provider 통합 아님.

## 실존 substrate (★LLM 실행계층 실재 · 형식 Prompt/RAG/Gateway 거버넌스 계층 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| LLM 호출(텍스트) | Anthropic Messages API·모델 상수·max_tokens | `ClaudeAI`(:20~22·:597·:613~625) | PARTIAL-strong |
| 중앙 호출 래퍼(사실상 GW) | 키해석+quota+테넌트 일원화 public 래퍼 | `ClaudeAI::complete`(:70~78) | PARTIAL |
| GW 소비자(재사용 실증) | 리뷰·성장·크리에이티브가 동일 경로 사용 | `Reviews`(:424)·`AdminGrowth`(:1092)·`CreativeStudio`(:139) | PARTIAL-strong |
| Function Calling | tools 배열+multi-turn tool_use 디스패치 | `ClaudeAI::callClaudeTools`(:648~663)·(:849~870·:919~926) | PARTIAL-strong |
| 도구 6종(읽기·집계) | bi/crm/pnl/inventory/orders/review | `ClaudeAI`(:667/:698/:722/:745/:775/:808) | PARTIAL-strong |
| SYSTEM_PROMPT | 하드코딩 시스템 프롬프트 빌더 9종 | `ClaudeAI`(:120·:1017·:1051·:1135·:1750·:1856·:1961·:1998·:2104) | PARTIAL |
| Context Injection | 런타임 변수·데이터 스냅샷 주입 | `ClaudeAI`(:1497 buildAgentContext·:1710) | PARTIAL |
| Prompt Caching(입력측) | `cache_control: ephemeral`(5분 TTL) | `ClaudeAI`(:607·:652) | PARTIAL |
| TOKEN_USAGE(미터링) | `ai_usage_quota`·input/output 토큰 누적 | `ClaudeAI`(:529~539·:637~639·:662·:564~589) | PARTIAL-strong |
| Rate Limiting(테넌트·일) | 호출 600·토큰 3M·이미지 100 캡+env 오버라이드 | `ClaudeAI`(:519~521·:523~527·:542~561) | PARTIAL-strong |
| BYO 키 격리 | 테넌트 키 사용 시 공용 quota 비대상 | `ClaudeAI::usingGlobalKey`(:592~594) | PARTIAL |
| 키 보관(암호화) | app_setting AES-256-GCM 복호 | `ClaudeAI`(:46~58 · `Crypto::decrypt`:53) | PARTIAL-strong |
| 테넌트별 모델/키 설정 | `ai_settings`(provider·api_key·model·is_active) | `Db::ensureAiSettings`(:361~378)·`AiGenerate`(:88·:127~132·:166) | PARTIAL |
| Model Selection(2경로 중 1) | 테넌트 `ai_settings.model`로 호출 | `AiGenerate`(:27·:175·:254~262) | PARTIAL |
| Knowledge Retrieval(어휘) | 코퍼스 로드→어휘 점수→**top-N 주입** | `ClaudeAI::geniegoFeatureDetails`(:206~276·상위 40% 컷:246~248·slice:251) | PARTIAL |
| Knowledge Grounding | "여기 없는 것 지어내지 마라"·모르면 모른다 | `ClaudeAI`(:266~275·특히 :271) | PARTIAL |
| 지식 코퍼스(자동생성) | 라우트/i18n 정본에서 기능맵 자동 재생성 | `tools/gen_chatbot_knowledge.mjs`(:40 LANGS 15)·`backend/data/chatbot_feature_details.json`(203KB)·`chatbot_feature_map.md`(24KB) | PARTIAL-strong |
| 정적 지식 블록 | 발급가이드·메뉴가이드·플랫폼 소개 | `ClaudeAI::geniegoKnowledgeBlock`(:282~321)·`GeniegoKnowledge`(:13·:520·:646) | PARTIAL |
| Multimodal(입력) | data URI 이미지 → Claude 비전 블록(최대 4) | `ClaudeAI::callClaudeLong`(:2831·:2836~2845) | PARTIAL |
| Multimodal(생성) | 이미지 2 provider·영상 생성 | `ClaudeAI::generateImage`(:2900~2914)·`imgGenOpenAI`(:2969)·`imgGenStability`(:2986)·`campaignAdVideo`(:3010) | PARTIAL |
| Multi-language 출력 | 응답 언어 15종 상수·정규화 | `ClaudeAI::REPORT_LANGS`(:3653)·`normReportLang`(:3654·:3665·:3679) | PARTIAL |
| AI_RESPONSE 영속 | `ai_analyses`(question·snapshot·summary·**model·tokens_used·status·error_msg**) | `ClaudeAI::migrate`(:465~503)·`analyses`(:1652) | PARTIAL |
| 실행 이력(프롬프트+결과) | `ai_generate_log`(prompt·result·tokens_used) | `AiGenerate`(:59~78·:178~179) | PARTIAL |
| 출력 안전 정화 | SVG 활성콘텐츠 제거·XSS 이중방어 | `ClaudeAI::stripActiveSvg`(:32~43)·`sanitizeSvg`(:2865) | PARTIAL-strong |
| 외부 컨텍스트 SSRF 가드 | URL 스킴/사설망 차단 후 fetch | `ClaudeAI::urlSafe`(:2770)·`fetchUrlContext`(:2786) | PARTIAL-strong |
| 컨텍스트 상한(비용방어) | 10턴/4000자·도구 반복 6회 | `ClaudeAI`(:24~25·:878~903·:907) | PARTIAL |
| Graceful Degradation | 키·quota·오류 시 규칙기반 폴백(허위수치 없음) | `ClaudeAI`(:1199·:3299·:3556·:2657)·`MmmReportI18n`(:13 aiUnavailableNote) | PARTIAL-strong |
| 응답 파싱 가드 | JSON 파싱 실패 시 원문 요약 폴백 | `ClaudeAI::parseAnalysis`(:992~1015)·(:1383~1386·:1452~1455) | PARTIAL-weak |
| API 표면 | `/v422/ai/*` 다수·`/ai/*` 생성계 | `routes.php`(:47~54·:563~567·:832~842) | PARTIAL |
| Security 상속 | 테넌트·RBAC·감사·암호화 | `Db`·`index.php`(047)·`SecurityAudit`(048)·`Crypto`(049) | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·grep 0)
★**Prompt Management Platform 전부**: PROMPT/PROMPT_TEMPLATE 엔티티·Prompt Registry·**Prompt Versioning**·Dynamic Prompt 조립기·Prompt Variables 스키마·**Prompt Testing**·**Prompt Evaluation**·**Prompt Optimization**·Prompt Analytics Service·AI Prompt Advisor(프롬프트=PHP 메서드 하드코딩 문자열 9종·저장·버전·비교·A/B 전무).
★**RAG Engine 전부**: **Vector Search·임베딩·Semantic Retrieval·Hybrid Search·Chunk Management·Citation Management·Context Ranking(형식)·KNOWLEDGE_SOURCE/RAG_QUERY 엔티티**(어휘 점수 top-N만 실재·벡터 인덱스/임베딩 모델/청크 엔티티/인용 반환 전무).
★**LLM Gateway 전부**: **Multi-LLM Routing**·**Provider Abstraction**(텍스트 LLM은 단일 벤더 상수 `ClaudeAI`:20~21)·**Load Balancing**·**Response Cache**·**Cost Optimization 엔진**·모델 폴백/장애전환·FOUNDATION_MODEL/LLM 레지스트리.
★**Context Management Engine**: **Context Window Management(형식)**·CONTEXT 엔티티·**LLM_SESSION 영속**(대화 맥락=프론트가 매 요청 제공:878~903)·Context Policy.
★**LLM Governance/Safety**: SAFETY_POLICY 엔티티·Safety Filtering(형식)·**Hallucination Detection**(프롬프트 지시:271만·탐지기 없음)·Response Grounding 검증기·**Response Validation(형식)**·Prompt/Model/Context/Token Policy 관리자·LLM Governance Manager·Compliance Validation·**LLM_AUDIT 엔티티**·**Prompt 전송 전 민감정보 자동 마스킹**(grep 0 — 도구가 집계값만 반환해 위험이 낮은 설계이나 마스킹 계층 자체는 부재).
★**Prompt Encryption**(프롬프트 본문 암호화·`ai_generate_log.prompt`는 평문 저장)·**AI Assistant Persona 체계**(업무별 Persona 정의·전환)·**Conversation Memory(서버)**.
★**Event 표준 8종 전부**: PromptExecuted/ContextRetrieved/RAGCompleted/FunctionInvoked/AIResponseGenerated/SafetyRuleTriggered/PromptOptimized/LLMAudited.
★**성능 SLA(§18)**: Prompt Validation ≤100ms·Context Retrieval ≤300ms·LLM Routing ≤100ms·**99.99% 가용성**=측정·보증 장치 부재(단일호스트·Part 044/045/050 승계).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ 텍스트 LLM 호출 경로가 **2개 병존** — `ClaudeAI`(플랫폼 공용키·모델 상수 `claude-sonnet-4-6`:20·quota 게이트·`ai_analyses` 감사)와 `AiGenerate`(테넌트 BYO 키·`ai_settings.model` 기본 `claude-haiku-4-5`:27·**quota 게이트 미경유**·`ai_generate_log` 별도 감사). 이는 **LLM Gateway 부재의 실증**이자 본 Part의 통합 대상(설계 사안·§D-2). ⓑ 은퇴 모델 자가치유(`Db`:376~378)는 **288차 확정·수정 완료분**([[project_n288_full_audit]])이며 본 Part는 상태 기술만·재플래그하지 않음. ⓒ `ai_analyses`/`ai_generate_log`는 **tamper-evident 아님**(해시체인 정본=`SecurityAudit::verify`·[[reference_menu_audit_log_not_tamper_evident]]).

## 판정
**PARTIAL(실행계층 실재 · 거버넌스계층 부재).** ★실재=**LLM 실행 스택이 상당 수준 완비** — Anthropic 호출(:597)·중앙 래퍼 `complete()`(:70)와 실 소비자 3핸들러·Function Calling(tool-use:648·도구 6종)·프롬프트 캐싱(:607)·**토큰 미터링+테넌트 일일 캡**(`ai_usage_quota`:529·:637~639·:519~521)·BYO 키 격리(:592)·키 AES-256-GCM(:53)·**어휘 기반 지식 검색 top-N 주입 + 반날조 grounding 지시**(:206~276)·자동생성 지식 코퍼스(`gen_chatbot_knowledge.mjs`)·멀티모달(비전 입력:2836~2845·이미지 2 provider·영상)·15개국 응답(:3653)·출력 XSS 정화(:32·:2865)·SSRF 가드(:2770)·규칙기반 무허위 폴백(:1199·:3299)·AI 응답 영속(`ai_analyses` model/tokens/status:469~502). ★**부재(grep 0·부재증명 완료)**: Prompt Registry/Versioning/Testing/Evaluation/Optimization·Prompt Analytics·**RAG(벡터·임베딩·시맨틱·하이브리드·청크·인용)**·**LLM Gateway(Multi-LLM 라우팅·Provider Abstraction·LB·Response Cache)**·Context Management Engine·LLM_SESSION·Safety Policy/Hallucination Detection/Response Validation(형식)·민감정보 마스킹·Prompt 암호화·LLM Governance Manager·LLM_AUDIT 엔티티·Event 표준 8종·성능 SLA. ★**오흡수 금지**: 하드코딩 시스템 프롬프트 9종≠Prompt Template Registry · `ai_generate_log.prompt`(렌더된 실행 로그)≠Prompt Versioning · 어휘 점수 top-N≠Vector/Semantic RAG · 자동 기능맵 주입≠Retrieval Index · 일일 quota 캡≠Multi-LLM Routing/Cost Optimization(**단, 레이트리밋·토큰 미터링 자체는 실재 — 뭉뚱그린 평가절하 금지**) · 입력측 `cache_control: ephemeral`≠Response Cache · **이미지 provider 2종(openai|stability)≠텍스트 LLM Provider Abstraction**(모달리티 상이) · i18n 15개국/`REPORT_LANGS`≠LLM Persona 체계 · 프론트 제공 history(10턴/4000자)≠서버 Context/Session Management(**★Part 054 §D-3과 동일 판정**) · 폴백 템플릿≠Response Validation/Hallucination Detection · SVG 정화≠AI Safety Content Filter · `ai_analyses`≠tamper-evident LLM Audit · `chunk`(Vite)·`cosine`(CF 추천)·`ChatGPT Search`/`google_gemini`(검색채널 점유율 데이터)=동음이의. ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE. 코드 변경 0.
