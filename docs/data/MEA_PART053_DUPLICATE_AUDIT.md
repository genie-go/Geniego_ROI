# MEA Part 053 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = Generative AI/LLM/Prompt 계층 신설이 기존 `ClaudeAI`(LLM 호출·프롬프트·quota·도구)·`AiGenerate`(BYO 키·생성 로그)·`CreativeStudio`/`Reviews`/`AdminGrowth`(소비자)·`GeniegoKnowledge`+`gen_chatbot_knowledge.mjs`(지식 코퍼스)·`Crypto`/`SecurityAudit`와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4 단일 Intelligence Layer·중복 인텔리전스 금지. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| AI Platform 자산·모델 레지스트리 | ★MEA Part 051(`ClaudeAI`·`ModelMonitor`) | ★재정의 금지·재사용 |
| ML 모델 수명주기·드리프트 | ★MEA Part 052(`ModelMonitor`) | ★재정의 금지·재사용 |
| AI Agent·Tool·Autonomous Workflow | ★MEA Part 054(`ClaudeAI::agenticAsk`·`JourneyBuilder`) | ★재정의 금지(★053=LLM 계층·054=Agent 계층 경계 고정) |
| 단일 Intelligence Layer(중복 엔진 금지) | ★헌법 Volume 4 | ★재정의 금지 |
| 안전 자동화·승인정책·미검증 생성물 자동반영 금지 | ★헌법 Volume 5·`CHANGE_GATE` | ★재정의 금지·재사용 |
| AI 사용 데이터 신뢰(READY만)·XAI | ★데이터 헌법 V3/V4·`DataPlatform` | ★재정의 금지·재사용 |
| 테넌트 격리·RBAC·감사·암호화 | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |
| API Gateway·Observability | ★MEA Part 042/046 | ★재정의 금지(LLM Gateway는 그 위에) |
| Role/Permission·비인간 identity | ★EPIC 06-A Part1~3-6(`api_key`) | ★재정의 금지 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 LLM/프롬프트 엔진 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| LLM Gateway | 중앙 호출 래퍼(키·quota·테넌트 일원화) | `ClaudeAI::complete`(:70) | ★재사용·승격(중복 게이트웨이 신설 금지) |
| Multi-LLM Routing | 단일 벤더 상수 | `ClaudeAI`(:20~21) | ★오흡수 금지(단일 provider≠Provider Abstraction) |
| Provider Abstraction | 이미지 provider 2종 분기 | `ClaudeAI`(:2900~2914·:2969·:2986) | ★오흡수 금지(**이미지 모달리티**≠텍스트 LLM 추상화) |
| Token Management | `ai_usage_quota`·input/output 누적 | `ClaudeAI`(:529~539·:637~639) | ★재사용(중복 토큰 테이블 금지) |
| Rate Limiting | 테넌트 일일 캡 3종+env | `ClaudeAI`(:519~521·:542~561) | ★재사용(중복 캡 로직 금지) |
| Cost Optimization | 입력측 프롬프트 캐싱 | `ClaudeAI`(:607·:652) | ★재사용·★오흡수 금지(입력 캐시≠Response Cache) |
| PROMPT_TEMPLATE | 하드코딩 프롬프트 빌더 9종 | `ClaudeAI`(:120·:1017·:1051·:1135·:1750·:1856·:1961·:1998·:2104) | ★오흡수 금지(메서드 문자열≠Registry·버전 0) |
| Prompt Versioning | 렌더된 실행 프롬프트 로그 | `AiGenerate`(:63·:178~179) | ★오흡수 금지(실행 이력≠템플릿 버전) |
| RAG / Semantic Retrieval | 어휘 점수 top-N 주입 | `ClaudeAI::geniegoFeatureDetails`(:206~276) | ★재사용(Retriever 승격)·★오흡수 금지(어휘≠벡터) |
| Chunk Management | Vite `manualChunks` | `vite.config.js` | ★오흡수 금지(번들 분할≠RAG 청크) |
| Vector Similarity | 협업필터링 상품추천 `cosine` | (282차 CF 추천) | ★오흡수 금지(추천 유사도≠임베딩 검색) |
| Multi-LLM 통합 | `ChatGPT Search`/`google_gemini` 항목 | `MarketingDataHub`(:18·:43) | ★오흡수 금지(**AI 검색채널 점유율 데이터**≠LLM Provider) |
| KNOWLEDGE_SOURCE | 자동생성 기능맵·가이드 코퍼스 | `tools/gen_chatbot_knowledge.mjs`·`GeniegoKnowledge`(:13/:520/:646) | ★재사용(중복 지식 파이프라인 절대 금지) |
| Context / LLM_SESSION | 프론트 제공 history(10턴/4000자) | `ClaudeAI`(:24~25·:878~903) | ★오흡수 금지(클라이언트 컨텍스트≠서버 Session·**Part 054 §D-3 동일**) |
| Function Calling | tools 배열·multi-turn 디스패치 | `ClaudeAI`(:648·:849~870·:919~926) | ★재사용(**Part 054 Tool Calling과 동일 substrate**·이중 기술 금지) |
| AI Assistant | 챗봇·코파일럿·라이브 어시스트 | `ClaudeAI`(:82·:839·:2079) | ★재사용(중복 어시스턴트 신설 금지) |
| Multi-language Persona | 응답 언어 15종 상수 | `ClaudeAI`(:3653·:3665) | ★재사용·★오흡수 금지(언어 지시≠업무 Persona) |
| Hallucination Detection | 프롬프트 내 반날조 지시 | `ClaudeAI`(:271·:309) | ★재사용·★오흡수 금지(지시문≠탐지기) |
| Response Validation | JSON 파싱 실패 폴백 | `ClaudeAI`(:992~1015·:1383~1386) | ★오흡수 금지(파싱 가드≠검증 엔진) |
| AI Safety Filter | SVG 활성콘텐츠 제거·SSRF 가드 | `ClaudeAI`(:32~43·:2865·:2770) | ★재사용·★오흡수 금지(출력 정화≠콘텐츠 안전정책) |
| LLM_AUDIT | `ai_analyses`·`ai_generate_log` | `ClaudeAI`(:469~502)·`AiGenerate`(:59~78) | ★재사용·★오흡수 금지(tamper-evident 아님) |
| Audit 정본(해시체인) | `SecurityAudit::verify` | (048) | ★재사용(정본·중복 감사 금지) |
| Prompt/키 암호화 | `Crypto` AES-256-GCM | `ClaudeAI`(:53)·`AiGenerate`(:125) | ★재사용(중복 암호화 금지) |

## ★★내부 중복(본 저장소 실재) — 통합 대상
**텍스트 LLM 호출 경로가 2개 병존한다.**
- **경로 A** `ClaudeAI::callClaude`(:597) — 플랫폼 공용키(`app_setting`·:46~58)·모델 **상수** `claude-sonnet-4-6`(:20)·**quota 게이트 경유**(:599·:639)·프롬프트 캐싱(:607)·감사=`ai_analyses`(:469~502).
- **경로 B** `AiGenerate::callClaude`(:254) — 테넌트 **BYO 키**(`ai_settings`·:166)·모델 **DB 값**(기본 `claude-haiku-4-5`:27)·**quota 게이트 미경유**·감사=`ai_generate_log`(:59~78).

→ 키 해석·모델 선택·레이트리밋·감사 스키마가 **경로마다 다르다**. 이는 명세 §10 LLM Gateway가 해결하려는 바로 그 문제이며, **본 Part의 통합 대상**이다(ADR D-2). ★단 이는 **설계 사안**이지 신규 결함 주장이 아니며, 은퇴모델 자가치유(`Db`:376~378)는 **288차 확정·수정 완료분**([[project_n288_full_audit]])으로 재플래그하지 않는다([[feedback_audit_reference_past_fixes]]).

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. `ClaudeAI`(LLM 호출·프롬프트·quota·도구·멀티모달)·`AiGenerate`(BYO)·`GeniegoKnowledge`+`gen_chatbot_knowledge.mjs`(지식) 실재 → **중복 LLM 클라이언트/프롬프트 저장소/지식 파이프라인 신설 금지·기존 심화**. 헌법 V4 "중복 인텔리전스 금지".
- ★[[feedback_minimize_new_menus]]: Prompt Management/LLM 사용량 콘솔은 신규 사이드바가 아니라 기존 AI/연동 허브 메뉴 편입 우선(`AIInsights`·`CreativeStudioTab`·`AIRuleEngine` 실재).
- ★[[feedback_no_regression_value_unification]]: **quota 게이트·BYO 격리·키 암호화·출력 정화·SSRF 가드·무허위 폴백**은 약화 시 즉시 회귀. Gateway 통합이 경로 B를 흡수할 때 **quota 게이트를 반드시 승계**해야 하며(현재 미경유), 반대로 경로 A의 캡을 느슨하게 만들면 회귀.
- ★[[feedback_competitive_gap_verify]]: Prompt Registry·RAG·Vector·Gateway·Event 8종 부재=grep 0 부재증명 완료(코드 존재분 감점 금지 — 토큰 미터링·레이트리밋·어휘 검색·멀티모달·15개국은 **실재분으로 인정**).
- ★[[feedback_real_value_autoderive]]: Prompt Analytics 지표(성공률·토큰·지연)는 `ai_usage_quota`·`ai_analyses.tokens_used`·`ai_generate_log.tokens_used` **실 로그 파생**이어야 하며 임의 수치 금지.
- ★[[reference_menu_audit_log_not_tamper_evident]]: LLM Audit tamper-evidence 정본=`SecurityAudit::verify`만. `ai_analyses`/`ai_generate_log`를 "감사 체인"으로 승격 주장 금지.
- ★[[reference_chatbot_knowledge_pipeline]]: 지식 코퍼스는 **라우트/i18n 정본에서 자동 재생성**되는 기존 파이프라인이 정본 — RAG 도입 시 이를 **인덱싱 소스로 재사용**하고 별도 수기 코퍼스 신설 금지.
- ★[[reference_api_prefix_routing]]: 신규 LLM 엔드포인트는 `/api` 접두 변형 동시 등재 필수(`routes.php`:50·:52 선례).
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **미검증 생성물의 업무 시스템 자동 반영 금지**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: LLM Gateway=`ClaudeAI::complete`(:70) 승격 후 **경로 B 흡수** · Token/Rate=`ai_usage_quota` 확장 · Function Calling=`callClaudeTools`(:648) tools 배열 증설 · Retriever=`geniegoFeatureDetails`(:206) 승격 · KNOWLEDGE_SOURCE=`gen_chatbot_knowledge.mjs` 산출물 인덱싱 · AI_RESPONSE/감사=`ai_analyses`+`ai_generate_log` 스키마 통일 · 안전=`stripActiveSvg`/`sanitizeSvg`/`urlSafe` · 암호화=`Crypto` · 테넌트/RBAC=`Db`/`index.php` · Audit 체인=`SecurityAudit`.
- **순신설(부재·grep 0)**: ★Prompt Registry(PROMPT/PROMPT_TEMPLATE·버전·변수 스키마·테스트·평가·최적화)·Prompt Analytics·AI Prompt Advisor·**RAG Engine**(임베딩·벡터 인덱스·시맨틱/하이브리드 검색·청크·인용·Context Ranking)·**Multi-LLM Routing/Provider Abstraction/Load Balancing/Response Cache**·Context Management Engine·LLM_SESSION·SAFETY_POLICY·Hallucination Detection·Response Validation(형식)·민감정보 마스킹 계층·Prompt 암호화·LLM Governance Manager·LLM_AUDIT 엔티티·Event 표준 8종.

## 판정
**중복 위험 高(LLM 실행·프롬프트·지식·감사 substrate 전부 실재) + ★내부 중복 1건 실재(텍스트 LLM 호출 경로 2개 병존).** ★핵심=`ClaudeAI`(호출·중앙 래퍼·프롬프트 9종·quota/토큰·tool-use·멀티모달·15개국·정화/SSRF·폴백·`ai_analyses`)·`AiGenerate`(BYO·`ai_generate_log`)·`CreativeStudio`/`Reviews`/`AdminGrowth`(소비자)·`GeniegoKnowledge`+`gen_chatbot_knowledge.mjs`(지식 코퍼스)·`Crypto`/`SecurityAudit`/`index.php`(보안)는 **재사용/승격**(★중복 LLM 클라이언트·프롬프트 저장소·지식 파이프라인 신설 절대 금지=헌법 V4·정본 재구현 금지). 헌법 V4/V5·데이터 헌법 V3/V4·Part 042/046/047/048/049/051/052/**054**·EPIC 06-A **재정의 금지**. 본 Part 고유 순신설=★Prompt Registry/Versioning/Testing/Evaluation·Prompt Analytics·**RAG Engine(벡터·임베딩·청크·인용)**·**LLM Gateway(Multi-LLM·Provider Abstraction·LB·Response Cache)**·Context Management/LLM_SESSION·Safety Policy/Hallucination Detection/Response Validation·마스킹·Prompt 암호화·Governance Manager·LLM_AUDIT·Event 8종뿐(부재·grep 0·부재증명 완료). ★오흡수 금지(하드코딩 프롬프트≠Registry·실행 로그≠버전·어휘 top-N≠벡터 RAG·Vite chunk/CF cosine≠RAG·`ChatGPT Search`/`google_gemini` 데이터≠Provider·이미지 provider 2종≠텍스트 LLM 추상화·입력 캐시≠Response Cache·프론트 history≠서버 Session·i18n≠Persona·지시문≠Hallucination Detector·파싱 가드≠Response Validation·SVG 정화≠Safety Filter·`ai_analyses`≠tamper-evident). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★승인 없는 미검증 생성물 업무 반영 불가(V5+CHANGE_GATE). ★Part 054 정합: Function Calling·Context/Session 판정은 054 §D-3/§11과 **동일 substrate·동일 판정**으로 고정(값 분산=회귀).
