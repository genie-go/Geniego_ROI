# ADR — MEA Part 053 Enterprise Generative AI, LLM & Prompt Engineering Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료·오흡수 금지·과대주장 금지·헌법 V4/V5·데이터 헌법 V3/V4·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## Context
MEA Part 053은 Generative AI·LLM·Prompt Engineering·RAG·Function Calling·LLM Gateway·AI Assistant·LLM Governance를 표준화하려 한다. GeniegoROI에는 **LLM 실행 스택이 상당 수준 실재**한다: Anthropic Messages API 호출(`ClaudeAI::callClaude`:597)·중앙 호출 래퍼(`complete`:70)와 실 소비자 3핸들러(`Reviews`:424·`AdminGrowth`:1092·`CreativeStudio`:139)·tool-use Function Calling(`callClaudeTools`:648)·프롬프트 캐싱(:607)·**토큰 미터링+테넌트 일일 레이트리밋**(`ai_usage_quota`:529~539·:519~521)·BYO 키 격리(:592)·키 AES-256-GCM(:53)·**어휘 기반 지식검색 top-N 주입**(`geniegoFeatureDetails`:206~276)·자동 재생성 지식 코퍼스(`tools/gen_chatbot_knowledge.mjs`)·멀티모달(비전 입력:2836~2845·이미지 2 provider·영상)·15개국 응답(:3653)·출력 XSS 정화(:32·:2865)·SSRF 가드(:2770)·무허위 규칙 폴백(:1199·:3299)·AI 응답 영속(`ai_analyses`:469~502).
반면 **거버넌스 계층은 전부 부재**: Prompt Registry/Versioning/Testing/Evaluation·RAG(벡터·임베딩·청크·인용)·LLM Gateway(Multi-LLM 라우팅·텍스트 Provider Abstraction·LB·Response Cache)·Context Management/LLM_SESSION·Safety Policy·Hallucination Detection·민감정보 마스킹·LLM_AUDIT 엔티티·Event 표준 8종(전부 grep 0·부재증명 완료).
★선행 관계: **Part 054(AI Agent)가 본 Part보다 먼저 작성**되어(커밋 `eccc0841a3a`) 053 상속분을 "미확정"으로 남겼다. 본 ADR에서 그 갭을 **소급 정합**한다(D-6).

## D-1 실 LLM 계층=단일 벤더 실행 스택·Gateway/Registry는 순신설
**결정**: 실재=`ClaudeAI`의 Anthropic 호출 스택(모델 상수 `claude-sonnet-4-6`:20·엔드포인트 상수:21·max_tokens 4096:22·벤더 헤더 하드코딩:620~624)과 `AiGenerate`의 테넌트 BYO 경로(`ai_settings.model` 기본 `claude-haiku-4-5`:27·:166·:254). ★**FOUNDATION_MODEL/LLM 레지스트리·Multi-LLM Routing·텍스트 Provider Abstraction·Load Balancing·Response Cache**=부재(grep 0: `llm_gateway`/`provider_abstraction`/`multi_llm`/`response_cache`)·순신설. ★명세 §10 "LLM Provider 변경은 애플리케이션 수정 없이 가능해야 한다"는 **현재 미충족**이며 이것이 본 Part의 1순위 목표다. ★**오흡수 금지**: 이미지 생성의 provider 2종 분기(openai|stability:2900~2914)는 **다른 모달리티**이지 텍스트 LLM 추상화가 아니고, `MarketingDataHub`의 `ChatGPT Search`(:18)·`google_gemini`(:43)는 **AI 검색채널 점유율 참조 데이터**이지 LLM Provider 통합이 아니다.

## D-2 ★★Gateway 정본=`ClaudeAI::complete` 승격 · 호출 경로 2개 병존을 흡수(신설 금지)
**결정**: 텍스트 LLM 호출 경로가 **2개 병존**한다 — **경로 A** `ClaudeAI::callClaude`(:597·플랫폼 공용키:46~58·모델 상수·**quota 게이트 경유**:599/:639·프롬프트 캐싱:607·감사 `ai_analyses`) / **경로 B** `AiGenerate::callClaude`(:254·테넌트 BYO 키:166·모델 DB값·**quota 게이트 미경유**·감사 `ai_generate_log`:59~78). 키 해석·모델 선택·레이트리밋·감사 스키마가 경로마다 다르며, 이는 명세 §10이 해결하려는 문제의 **실증**이다.
★**Gateway 정본은 이미 존재하는 `ClaudeAI::complete`(:70)의 승격**이며 **새 게이트웨이 클래스 신설 금지**(헌법 V4·[[feedback_no_duplicate_features]]) — 이미 `Reviews`/`AdminGrowth`/`CreativeStudio`가 이 래퍼로 수렴한 **선례**가 있다.
★흡수 시 **최대집합 승계 4조건**(하나라도 누락 시 회귀·[[feedback_no_regression_value_unification]]): ⓐ**quota 게이트 승계**(경로 B는 현재 미경유) ⓑBYO 키 우선·전역 폴백 동작 보존(:326~329·:592) ⓒ`Crypto` 복호 경로 유지(:53·:125) ⓓ감사 스키마 통일(`ai_analyses`/`ai_generate_log`).
★가용성 우선 **fail-open**(quota 인프라 실패 시 통과:559)은 **의도된 기존 동작**이다 — fail-closed 전환은 서비스 중단 위험이 있으므로 명시 승인 없이 바꾸지 않는다.
★**이는 설계 사안이지 신규 결함 주장이 아니다.** 은퇴 모델 자가치유(`Db`:376~378)는 **288차 확정·수정 완료분**([[project_n288_full_audit]])으로 재플래그하지 않는다([[feedback_audit_reference_past_fixes]]).

## D-3 ★Prompt는 코드다 — Registry 순신설, 기존 프롬프트는 seed로 무손실 이관
**결정**: 현행 프롬프트=**PHP 메서드 하드코딩 9종**(`geniegoSystemPrompt`:120·`systemPrompt`:1017·`marketingEvalPrompt`:1051·`influencerEvalPrompt`:1135·`channelKpiPrompt`:1750·`campaignRecommendPrompt`:1856·`campaignAdCreativePrompt`:1961·`campaignSearchPrompt`:1998·`livePrompt`:2104). 변수 보간·질문 기반 가변 블록(:206)은 있으나 **저장·버전·비교·테스트·평가·A/B가 전무**(grep 0: `prompt_template`/`prompt_registry`/`prompt_version`/`prompt_test`)하여 **프롬프트 한 줄 변경에 코드 배포가 필요**하다.
★**오흡수 금지**: 메서드 문자열≠PROMPT_TEMPLATE Registry · `ai_generate_log.prompt`(:63)는 **렌더된 실행 프롬프트 로그**이지 템플릿 버전이 아니다.
★Registry 도입 시 **기존 9종을 원문 그대로 기본값(seed)으로 이관**하고 DB 오버라이드만 얹는다(원문 변경 금지·무회귀). Prompt Analytics 지표는 `ai_usage_quota`·`ai_analyses.tokens_used`·`ai_generate_log.tokens_used` **실 로그 파생**만 사용하고 임의 수치 금지([[feedback_real_value_autoderive]]).

## D-4 ★RAG=어휘 검색 실재·벡터 계층 순신설 · 지식 코퍼스는 기존 파이프라인 재사용
**결정**: 실재하는 것은 **어휘(lexical) 검색 기반 grounding**이다 — 코퍼스(`backend/data/chatbot_feature_details.json` 203KB) 로드 → 기능명(15개 로케일)·경로·변별어휘 점수화 → 상위 40% 컷(:245~248) → **top-N 주입**(:251) → **반날조 지시**("여기 없는 버튼·필드를 지어내지 마라, 모르면 모른다고 하라":271 / "존재하지 않는 기능·URL을 발명하지 마라":309). 전량 100KB 상시 주입을 피하려 top-N을 쓴다는 **설계 의도가 코드에 명시**(:202)돼 있어 Context Window 관리의 원형이 실재한다.
★**부재**: 임베딩·벡터 인덱스·Semantic/Hybrid Retrieval·Chunk Management·**구조화된 Citation 반환**(grep 0: `embedding`/`vector_search`/`semantic_search`/`pgvector`/`faiss`/`pinecone`). 명세 §9 "모든 AI 응답은 근거(Context)를 함께 관리" 중 **주입은 충족·인용 반환은 미충족**(정직 표기).
★**오흡수 금지**: Vite `manualChunks`≠RAG Chunk · 협업필터링 상품추천 `cosine`(282차)≠임베딩 유사도 검색.
★**KNOWLEDGE_SOURCE 정본=기존 자동 파이프라인**(`tools/gen_chatbot_knowledge.mjs`가 라우트·i18n 정본에서 **매 배포 재생성** → 신규 기능이 자동 인지됨·[[reference_chatbot_knowledge_pipeline]]) — RAG는 이를 **인덱싱 소스로 재사용**하고 별도 수기 코퍼스 신설 금지. ★RAG 인덱스는 **테넌트 격리가 절대**(교차 검색 시 즉시 크로스테넌트 누출·[[reference_platform_growth_actas_tenant_hijack]]).

## D-5 ★Safety/Security — 실재 방어는 후퇴 금지, 마스킹·프롬프트 암호화 부재는 정직 기록
**결정**: 실재 방어=출력 SVG 활성콘텐츠 제거(`stripActiveSvg`:32~43·`sanitizeSvg`:2865·저장형 XSS 이중방어)·**SSRF 가드**(`urlSafe`:2770·`fetchUrlContext`:2786)·비용 폭주 방어(10턴/4000자:24~25·도구 반복 6회:907·일일 캡:519~521)·**테넌트 격리 전 테이블 적용**(`ai_usage_quota`/`ai_analyses`/`ai_settings`·191차 tenant_id 보강:503)·키 AES-256-GCM(:53·:125)·**무허위 폴백**(`AdminGrowth`:1073 "허위 성과 수치 없음"·`MmmReportI18n`:13 AI 미가용 정직 고지). **전부 후퇴 금지 자산.**
★**부재(정직 기록)**: **민감정보 Prompt 전송 前 자동 마스킹**(명세 §13 필수·grep 0)·**Prompt Encryption**(`ai_generate_log.prompt` **평문**:63)·SAFETY_POLICY 엔티티·입력측 Safety Filtering·**Hallucination Detection**(반날조 **지시문**만 있고 **탐지기 없음**·오흡수 금지)·형식 Response Validation(JSON 파싱 폴백:992~1015은 가드이지 검증 엔진 아님).
★**정직 병기**: 코파일럿 도구는 **집계값만 반환하고 개인 식별정보를 반환하지 않는 설계**(No-PII v418.1·:853)라 프롬프트 노출면이 구조적으로 좁다 — 그러나 **마스킹 계층 부재라는 사실을 이 강점으로 상쇄하지 않는다**(강점 과대주장 금지·부재 축소 금지).
★신규 관리·조회 API 배치 주의: `/v422/ai/*`는 **인증 공개 bypass 경로**이므로 Prompt Registry·Token Usage·LLM Audit 같은 관리 API를 그 접두에 얹으면 **인증 우회**가 된다 — 인증 필수 접두에 배치하고 `/api` 변형 동시 등재([[reference_api_prefix_routing]]).

## D-6 ★Part 054 소급 정합(선행 갭 해소) — 동일 substrate 이중 기술 금지
**결정**: Part 054는 053 명세 미수령 상태에서 작성돼 053 상속분을 "미확정"으로 남겼다. 본 ADR로 그 갭을 해소하며, **동일 substrate에 대한 판정을 다음과 같이 고정**한다(값 분산=회귀·[[feedback_no_regression_value_unification]]):
- **Function Calling(053 §11 / 054 Tool Calling)** = 동일 substrate `callClaudeTools`(:648)+tools 배열(:849~870)+디스패치(:919~926) → **양쪽 PARTIAL-strong**. 053은 **LLM 프로토콜 계층**, 054는 **Agent 도구 계층**으로 기술 분담하며 **중복 도구 레지스트리 신설 금지**.
- **CONTEXT/LLM_SESSION(053 §5·§9 / 054 AGENT_MEMORY §D-3)** = 동일 substrate 프론트 제공 history(:878~903·10턴/4000자) → **양쪽 ABSENT(서버 영속 없음)**. 클라이언트 컨텍스트를 서버 Memory/Session으로 승격 주장 금지.
- **AI Workflow(053 §6)** = **Part 054 소관**(`JourneyBuilder`)이며 본 Part에서 재정의 금지.
- **미검증 생성물 자동 반영 금지(053 §17 / 054 §D-2)** = 동일 게이트(제안·초안 저장 + HITL 집행 + `agent_mode` 기본 approval + 킬스위치) → **양쪽 "이미 충족·후퇴 금지"**.
★054 문서 4종의 "Part 053 미작성·명세 미수령·상속분 미확정" 문구는 본 Part 완결에 맞춰 **소급 갱신**한다(문서 정합·판정 변경 아님).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL(실행계층 실재·거버넌스계층 부재)** — AI 시리즈에서 054와 함께 실재도 상위.
- ★중복 금지 재사용: `ClaudeAI`(호출·중앙 래퍼·프롬프트 9종·quota/토큰·tool-use·멀티모달·15개국·정화/SSRF·폴백·`ai_analyses`)·`AiGenerate`(BYO·`ai_generate_log`)·`GeniegoKnowledge`+`gen_chatbot_knowledge.mjs`(지식 코퍼스)·`Crypto`/`SecurityAudit`/`index.php`(보안).
- ★순신설: Prompt Registry/Versioning/Testing/Evaluation/Optimization·Prompt Analytics·AI Prompt Advisor·RAG Engine(임베딩·벡터·시맨틱/하이브리드·청크·인용)·LLM Gateway(Multi-LLM·Provider Abstraction·LB·Response Cache)·Context Management·LLM_SESSION·Safety Policy·Hallucination Detection·Response Validation(형식)·마스킹·Prompt 암호화·Governance Manager·LLM_AUDIT·Event 표준 8종·성능 SLA(§18·단일호스트 종속=Part 044/045/050 승계).
- ★오흡수 금지: 하드코딩 프롬프트≠Registry·실행 로그≠Versioning·어휘 top-N≠벡터 RAG·Vite chunk/CF cosine≠RAG·`ChatGPT Search`/`google_gemini`≠LLM Provider·이미지 provider 2종≠텍스트 Provider Abstraction·입력 캐시≠Response Cache·프론트 history≠서버 LLM_SESSION·i18n 15개국≠업무 Persona·반날조 지시문≠Hallucination Detector·파싱 가드≠Response Validation·SVG 정화≠Safety Filter·`ai_analyses`≠tamper-evident Audit.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·미검증 생성물의 업무 시스템 자동 반영 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 042/044/046/047/048/049/051/052/054·EPIC 06-A 상속·재감사 금지(288차 확정분).
