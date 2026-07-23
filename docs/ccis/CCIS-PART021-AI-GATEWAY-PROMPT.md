# GeniegoROI Claude Code Implementation Specification

# CCIS Part021 — AI Service Integration, LLM Gateway & Prompt Engineering Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

AI 서비스 통합·LLM Gateway·Prompt Engineering 표준을 수립한다.

> ★**성격(Part012 와 유사·강한 스택)**: 앞선 부재 스택 Part 들과 달리 **AI 는 이 저장소의 핵심 역량**
> (헌법 V4 — AI Marketing Intelligence OS). 명세의 **AI Gateway First·Guardrail·RAG·Human Override·
> Observable AI·Cost/Token 관리**는 **대체로 강하게 준수**한다. 실측 결과 **LLM Gateway=`ClaudeAI::
> gateway`/`complete` 단일 통과점**(MEA 053·본인 289차후속 구현·`ai_call_log` 감사·quota·BYO 우선)이며
> **우회 경로 0**이다. 다만 **멀티프로바이더 Adapter·Prompt 템플릿 파일·Vector DB** 는 부분/부재다.
> Part001 §4 에 따라 실측 → 매핑 후, **053 단일 통과점 불변식을 품질 게이트에 편입**했다(실 개선·§6).

---

## 2. 실측 — 현행 AI 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| LLM Gateway | 모든 AI 요청 게이트 경유 | ★**`ClaudeAI::gateway()`/`complete()` 단일 통과점**(053). `callClaude`/`callClaudeTools`/`callClaudeLong` 전부 ClaudeAI.php 내부 위임 |
| ★게이트 우회 | 금지 | ★**우회 0** — `api.anthropic.com` 은 **ClaudeAI.php 1파일**(`const API_URL`)에만. AiGenerate 등은 위임(직접호출 0) |
| 감사 | Trace/Cost 로깅 | ★**`ai_call_log`**(메타데이터·best-effort·053) |
| Multi-provider | OpenAI/Claude/Gemini Adapter | **Claude 주력**(gateway). 이미지/영상 생성 등 OpenAI 부분(전부 ClaudeAI.php 내). Gemini 소수. 형식적 `LLMInterface` Adapter 는 아님 |
| BYO/Quota | 인증·Rate/Cost | ★**BYO 키 우선**(`ai_settings` 자기키=quota 비대상)·**quota 게이트(76)**·`quotaSnapshot` |
| Prompt 관리 | 코드 분리·템플릿 파일 | **코드 내 메서드(9)** — `templates/` 파일 아님(하드코딩에 가까우나 메서드로 캡슐화) |
| Prompt Versioning | v1/v2 이력 | **부분** — 메서드/차수 기반. 별도 버전 레지스트리 아님 |
| RAG | Embedding→Vector→Retrieval | ★**`geniegoFeatureDetails`(90)** — Citation(sources/ns/paths/score·055·Explainable AI). ★**Vector DB 부재**(embedding 0·보류·표본0) |
| Guardrail | Injection/출력검증/정책 | ★**강함(191)** — Trust READY/WARNING/BLOCKED(V3)·Explainable(근거/신뢰도)·**승인정책**(`action_request`·`agent_mode`)·근거없는 결론 금지 |
| Human Override | 사용자 승인 | ★**준수** — Decision 자동집행은 승인정책 존중(V4/V5)·고액/외부송출 게이트(289차) |
| Streaming | SSE/Chunk | **부분**(SSE 실재·Part018). LLM 스트리밍 부분 |
| Function/Tool Calling | Schema | ★**`callClaudeTools`**(tool calling·053 5경로 중 하나) |
| Retry/Fallback | 백오프·Provider 전환 | **retry 실재**(Part013). Provider 자동 fallback 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Gateway First/Guardrail/Retrieval First/Observable/Human Override) | **★대체로 준수** | Gateway 단일통과점·Guardrail 강함·RAG Citation·ai_call_log·승인정책. Model Agnostic 은 Claude 중심(부분) |
| §4~§5 AI Architecture/Gateway | **★준수** | `ClaudeAI::gateway` 단일 통과점·Model Routing/Auth/Retry/Logging/Cost |
| §6~§7 Multi-LLM/Adapter | **부분** | Claude 주력·OpenAI(이미지) 부분. 형식적 `LLMInterface`/Adapter 는 아님(gateway 가 추상화) |
| §8 Model Routing | **부분** | 기능별 timeout/max_tokens 분기(complete/Long). 비용/속도 라우팅 정책은 부분 |
| §9~§11 Prompt Template/Versioning/구성 | **부분** | System/User 구성 준수. Prompt=코드 메서드(템플릿 파일 아님). Versioning 부분 |
| §12 Context Management | **★준수** | tenant/locale(`X-Lang`)·비즈니스 컨텍스트. 불필요 컨텍스트 최소 |
| §13 Token Management | **★준수** | quota(76)·quotaSnapshot·ai_call_log 메타 |
| §14 Streaming | **부분** | SSE 실재. LLM 스트리밍 부분 |
| §15~§16 Function/Tool Calling | **★준수** | `callClaudeTools`·최소권한 |
| §17~§19 Embedding/RAG/Vector DB | **부분** | ★RAG Citation(055) 준수. **Vector DB 부재(보류·표본0)**·Embedding 미사용 |
| §20 AI Guardrail | **★강하게 준수** | Trust(READY/WARNING/BLOCKED)·Explainable·승인정책·출력검증 |
| §21 Cost Optimization | **부분 준수** | quota·컨텍스트 최소·max_tokens 분기. 캐시/라우팅 부분 |
| §22 Retry | **부분 준수** | retry·외부연동. Invalid Prompt 재시도 안 함 |
| §23 Caching | **부분** | AI 응답 캐시 부분(정적/rollup·Part017) |
| §24~§25 Monitoring/Logging | **부분** | ai_call_log·SystemMetrics::probeAi(정직 미산출 null). traceId 부재(Part013) |
| §26 Fallback | **부분** | Provider 자동 fallback 부분. BYO 실패 시 처리 |
| §27~§28 Security/Response Validation | **★준수** | API 키 Secret(.env/Crypto)·입출력 검증·Prompt Sanitization·근거없는 결론 금지(V4) |
| §29 PHP(Guzzle/Adapter/Circuit Breaker) | **부분** | cURL/HTTP·gateway 추상화. 형식 Adapter/Circuit Breaker 아님(Part013) |
| §30 Claude(Prompt 하드코딩/Validation 없는 응답 금지) | **부분 준수** | ai_call_log·근거표시·승인정책. Prompt 코드내(템플릿 아님) |
| §31~§32 검증(ai:health 등) | **대상 없음** | artisan 없음. ★**본 차수 게이트 §8=api.anthropic.com 단일통과점 검사** |

---

## 4. 확립된 표준 (신규 AI 코드가 따를 정본)

- ★**모든 Claude LLM 호출은 `ClaudeAI::gateway()`/`complete()` 경유**(053 단일 통과점). `api.anthropic.com` 직접 호출은 **ClaudeAI.php 에만**. 새 전송 경로·중복 엔진 신설 금지(헌법 V4 §16·게이트 §8 강제).
- **BYO/Quota**: 테넌트 자기 키(`ai_settings`)=자기 비용(quota 비대상). 공용은 quota 게이트. **테넌트 귀속 필수**(quota 버킷 격리·289차후속 P0).
- **감사**: `ai_call_log`(메타데이터·best-effort). 프롬프트 원문은 민감도 정책.
- ★**Guardrail(헌법 V3/V4)**: **신뢰검증(READY) 통과 데이터만 AI 사용**·모든 추천에 **근거/신뢰도 표시(Explainable)**·**근거없는 결론 금지**·Decision 자동집행은 **승인정책 존중**(action_request·agent_mode). 고액/외부송출=서버 게이트(289차).
- **RAG**: `geniegoFeatureDetails`(Citation·ns/paths/score) 재사용. KNOWLEDGE_SOURCE=`gen_chatbot_knowledge.mjs`(신규=라우트만 추가로 자동 인지·270차). ★Vector DB 는 표본 생긴 뒤 착수(보류).
- **Prompt/Context**: System/User 구성·tenant/locale·불필요 컨텍스트 최소. 민감정보 프롬프트 금지.
- **Function/Tool**: `callClaudeTools`·최소권한.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식적 `LLMInterface`/멀티프로바이더 Adapter·Provider 자동 fallback** — 부분만. `ClaudeAI::gateway` 가 추상화·Claude 주력. 완전 Model-Agnostic Adapter=대규모 리팩토링(중복 엔진 금지).
2. **Prompt 템플릿 파일·Prompt Versioning 레지스트리** — 안 함. 코드 메서드로 캡슐화. 별도 파일 분리는 관리 오버헤드.
3. **Vector DB(pgvector/Qdrant)·Embedding** — ★보류(양 환경 표본 0 → 구현해도 "미산출"만·검증 불가). 표본 생긴 뒤 착수.
4. **traceId/OpenTelemetry AI 추적·Circuit Breaker** — 안 함(Part013). ai_call_log·SystemMetrics 부분.
5. **Streaming LLM 전면** — 부분. SSE 실재.

★**준수하는 실 원칙(강함)**: **Gateway First(053 단일통과점·우회0)**·Guardrail(Trust/Explainable/승인정책)·RAG Citation·BYO/Quota·Human Override·API 키 Secret·근거없는 결론 금지.

---

## 6. ★실 개선 — AI Gateway 단일통과점 게이트 편입 (§5·053)

- `scripts/quality/check-code-quality.sh` **§8 신설**: `api.anthropic.com` 직접 호출이 **`ClaudeAI.php`(게이트웨이) 외 핸들러**에 나타나면 **FAIL**. → **053 단일 통과점 불변식 보호**(신규 우회 경로=`ai_call_log` 감사·quota·BYO 우회·테넌트 과금 격리 붕괴 회귀 차단).
- 현재 결과: **우회 0**(api.anthropic.com=ClaudeAI.php 1파일). `make quality` 9 PASS.
- ★본인이 289차후속에 구현한 053 일원화(5경로→1)를 **게이트로 영속 보호** — 앞으로 누가 새 전송 경로를 추가하면 즉시 걸린다.

---

## 7. Claude Code 구현 규칙

1. ★**Claude 호출은 `ClaudeAI::gateway`/`complete` 만**(053). `api.anthropic.com` 직접 금지(게이트 §8). 새 전송 경로·중복 엔진 금지(V4 §16).
2. **테넌트 귀속 필수**(quota 버킷 격리·289차후속 P0). BYO 키=자기비용(quota 비대상).
3. ★**Guardrail**: READY 데이터만 AI·**근거/신뢰도 표시**·**근거없는 결론 금지**·자동집행은 승인정책(action_request/agent_mode). 고액/외부송출=서버 게이트.
4. RAG=`geniegoFeatureDetails`(Citation) 재사용. Vector DB 신설 금지(보류·표본0). 지식=`gen_chatbot_knowledge.mjs`.
5. Prompt=민감정보 금지·컨텍스트 최소. API 키=Secret(.env/Crypto). 입출력 검증(Prompt Injection).
6. 멀티프로바이더 Adapter/Vector DB/Prompt 템플릿 파일을 "명세에 있다"는 이유로 대규모 신설하지 않는다(gateway 추상화 유지·표본 후 착수).

---

## 8. Completion Criteria

- [x] AI 스택 **실측**(gateway 단일통과점·우회0·ai_call_log·guardrail 191·quota 76·RAG 90·Vector 0)
- [x] 명세 §3~§32 **섹션별 매핑·판정**(대체로 준수 + Adapter/Vector DB/템플릿 미적용 사유)
- [x] 실 AI 규약(Gateway·BYO/Quota·Guardrail·RAG Citation·Human Override) 성문화(§4)
- [x] ★**AI Gateway 단일통과점 게이트 §8 편입**(053 불변식 보호·우회0)(§6)
- [x] 의도적 미적용 + 사유(§5) — Adapter/Vector DB/Prompt 템플릿
- [x] Claude Code 규칙(§7) · `make quality` 9 PASS 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 강한 AI 스택(ClaudeAI 단일 게이트웨이·Guardrail·RAG Citation)의 성문화 + 단일통과점 게이트 편입이지, 멀티프로바이더 Adapter/Vector DB 이식이 아니다.

---

## 다음 Part

**CCIS Part022 — AI Agent, MCP, Tool Calling & Multi-Agent** — ★사전 경고: Agent=**`action_request`+`agent_mode`(recommend/approval/auto)** 승인정책·`AutoCampaign`/`AutoRecommend`/`Decisioning`. Tool Calling=`callClaudeTools`(본 Part). MCP/Multi-Agent Orchestration=부분/부재(MEA 054 PARTIAL-strong). Part022 도 실측→매핑→기존 agent_mode/Decisioning 성문화.
