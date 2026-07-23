# GeniegoROI Claude Code Implementation Specification

# CCIS Part054 — Enterprise AI Agents, Multi-Agent Orchestration, Agent Memory & Autonomous Operations Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise AI Agents·Multi-Agent Orchestration·Agent Memory·Autonomous Operations 표준을 수립한다.

> ★**성격(★Part021/022/042 + MEA 054 중복 — 단일 에이전트 tool-calling 강함·형식 Multi-Agent/Planning/장기
> 메모리 부재)**: 본 Part 는 **CCIS Part021(AI Gateway/Prompt)·022(AI Agent/MCP)·042(AI 거버넌스)와 중복**되며,
> ★**MEA Part054(AI Agent = PARTIAL-strong·저장소 최고 실재도)** 판정을 승계한다. AI Agent 는 이 저장소에서
> **가장 실재도 높은 AI 기능**이나, **단일 에이전트 tool-calling 코파일럿**이지 **형식 Multi-Agent 프레임워크**가
> 아니다. 명세가 다루는 **형식 Multi-Agent Orchestration(planner/executor/validator 역할·sequential/parallel/
> delegation)·Planning Engine(goal decomposition)·Agent Long-Term Memory(vector)·형식 MCP Server(백엔드
> 호스팅)·Agent Collaboration(consensus/conflict)·Capability Registry**는 **부재/부분**한다(grep 0·289차후속
> Vector 보류). ★**실재 축(단일 에이전트 tool-calling)**: **`ClaudeAI::callClaudeTools`**(255차·**tool-use
> 에이전틱 코파일럿**·tools 정의+messages 멀티턴·content blocks/stop_reason)·**`biQueryTool`+tools 배열**
> (Tool Calling·`/v422/ai/agentic`)·**`ClaudeAI` Gateway**(`gateway()` 일원화·**`ai_call_log` 감사**·MEA
> 053)·**`agent_mode`+`action_request`**(**HITL 승인·자율 집행 게이트**)·**`AutoRecommend`/`Decisioning`**(자율
> 의사결정)·**`RuleEngine`/`JourneyBuilder`**(자율 액션/워크플로)·**conversation memory**(멀티턴 messages)·
> **V3 Trust**(신뢰 게이트)·**V4 근거/신뢰도**(Explainable) 는 실재한다. ★★**오흡수 차단**: **`AutoRecommend`/
> `Decisioning`=의사결정 엔진이지 multi-agent orchestration 아님** · **conversation memory(멀티턴)=단기 working
> memory이지 long-term vector memory 아님** · **`agent_mode`=자율 집행 승인 모드이지 multi-agent framework
> 아님**. Part001 §4 에 따라 실측 → Multi-Agent/Planning/Agent Memory 부재증명 → ClaudeAI Gateway+agent_mode+
> AutoRecommend 성문화했다. ★정본=**MEA 054·헌법 V4/V5·"자율집행=승인정책 존중"** 승계. (문서 차수 — 코드
> 무변경.)

---

## 2. 실측 — 현행 AI Agent 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Agent Architecture | Planner→Orchestrator→Agents→Tool→Memory→Validate | **부분(단일 에이전트)** — `callClaudeTools`(tool-use 멀티턴)→도구→응답. Planner/Orchestrator 분리 아님 |
| AI Agent Framework | Planner/Executor/Validator/Reviewer | **부분(단일)** — `ClaudeAI` 에이전틱 코파일럿(단일 role). 역할 분리 프레임워크 아님 |
| Multi-Agent Orchestration | Sequential/Parallel/Delegation | **부재** — 멀티 에이전트 오케스트레이션 없음. 단일 tool-calling 루프 |
| Agent Memory(Conversation/State/Task) | 작업 상태 유지 | **부분** — conversation memory(멀티턴 messages·context). State/Task Memory 부분 |
| Long-Term Memory(Vector/Semantic/KG) | 장기 기억 | **부분(대응물)** — `GeniegoKnowledge`(지식)·`graph_node`(KG). ★**Vector 장기 메모리 부재**(289차후속 보류·표본 0) |
| Short-Term Memory | Session/Active Context | ★**실재** — 멀티턴 messages·세션 context. 세션 종료 시 폐기 |
| Working Memory | Task Var/Tool Result/Planning State | **부분** — tool result(멀티턴)·요청 context. 형식 working memory 부분 |
| Planning Engine | Goal Decomposition/Task Plan | **부재(대응물)** — LLM 자체 추론(암묵 계획)·`RuleEngine`(규칙). 형식 Planning Engine 아님 |
| Tool Calling | MCP/REST/DB/Internal | ★**실재** — `callClaudeTools`·`biQueryTool`·tools 배열(안전 규약·권한 검증). REST/DB 도구 |
| MCP Integration | MCP Server/Client/Discovery | **부분(개발도구)** — Claude Code(개발툴)는 MCP 사용. ★**백엔드는 MCP Server 아님**(tool-calling은 ClaudeAI) |
| Autonomous Workflow | Goal Execution/Retry/Approval | ★**부분 준수** — `agent_mode`+`action_request`(승인)·`RuleEngine`/`JourneyBuilder`(자율 액션)·`omni_outbox` retry |
| Agent Collaboration | Shared Context/Delegation/Consensus | **부재** — 에이전트 협업 없음(단일). ("consensus"=모델 동의도·Part043·협업 아님) |
| Human-in-the-Loop(HITL) | Approval/Review/Override/Escalation | ★**실재** — `action_request`+`agent_mode`·high-value 게이트(₩5M↑ 무승인 차단·Part042) |
| Agent Governance | Policy/Capability Registry/Execution Limit | **부분** — V5 Safety Rule·`action_request` 승인·quota(`ai_call_log`). 형식 Capability Registry 부분 |
| Agent Observability | Agent/Tool Trace/Execution Timeline | **부분** — `ai_call_log`(호출 감사)·`SecurityAudit`. Agent/Tool Trace 부분 |
| Monitoring | Success/Tool Latency/Planning Accuracy | **부분** — `ai_call_log`·`SystemMetrics`. Planning Accuracy 대상 없음 |
| Logging | Agent/Task/Memory ID | **부분** — `ai_call_log`·`SecurityAudit`. Agent/Memory ID 부분 |
| Security(RBAC/Tool Perm/Prompt/Memory Encrypt/격리) | 허용 Tool만 | ★**부분 준수** — RBAC·tool 안전 규약(권한 검증)·프롬프트 제약·테넌트 격리·`Crypto`. Memory 암호화 부분 |
| Compliance(ISO 42001/EU AI Act) | AI 거버넌스 | **부분** — V4/V5 헌법·PII 미저장·설명가능성(Part042). 형식 인증 아님 |
| Disaster Recovery | Agent/Memory/Workflow/MCP 복구 | **부분** — 세션 재생성·`omni_outbox` 재큐. Memory/MCP 복구 대상 부분 |
| Performance(Planning/Memory Cache/Tool Pool/Parallel) | Agent 성능 | **부분** — Gateway·Citation min-score·HTTP 캐시. Parallel Agent 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Agent First/Goal Driven/Planning Before Acting/Tool Oriented/Safe Autonomy/Explainable/Human Oversight/Tenant Isolated) | **★대체로 준수(단일)** | ★Tool Oriented(tool-use)·Safe Autonomy(agent_mode/Safety Rule)·Explainable(근거)·Human Oversight(HITL)·Tenant Isolated. Multi-Agent Planning 부분 |
| §4 Agent Architecture | **부분(단일)** | `callClaudeTools` tool-use. Planner/Orchestrator 분리 아님 |
| §5 Agent Framework | **부분(단일)** | 에이전틱 코파일럿(단일 role) |
| §6 Multi-Agent Orchestration | **부재** | 멀티 에이전트 없음(단일 루프) |
| §7 Agent Memory | **부분** | conversation/context. State/Task 부분 |
| §8 Long-Term Memory | **부분(대응물)** | `GeniegoKnowledge`/`graph_node`. Vector 장기 메모리 부재 |
| §9 Short-Term Memory | **★실재** | 멀티턴 messages·세션 context |
| §10 Working Memory | **부분** | tool result·context |
| §11 Planning Engine | **부재(대응물)** | LLM 암묵 추론·`RuleEngine`. 형식 Planning 아님 |
| §12 Tool Calling | **★실재** | `callClaudeTools`·`biQueryTool`·tools(안전 규약) |
| §13 MCP Integration | **부분(개발도구)** | Claude Code MCP. 백엔드=MCP Server 아님 |
| §14 Autonomous Workflow | **부분 준수** | `agent_mode`·`action_request`·`RuleEngine`/`JourneyBuilder`·retry |
| §15 Agent Collaboration | **부재** | 협업 없음(단일) |
| §16 HITL | **★실재** | `action_request`+`agent_mode`·high-value 게이트 |
| §17 Agent Governance | **부분** | V5 Safety Rule·`action_request`·quota. Capability Registry 부분 |
| §18 Agent Observability | **부분** | `ai_call_log`·`SecurityAudit` |
| §19 Monitoring | **부분** | `ai_call_log`·`SystemMetrics` |
| §20 Logging | **부분** | `ai_call_log`·`SecurityAudit` |
| §21 Security | **부분 준수** | RBAC·tool 안전 규약·프롬프트 제약·격리·`Crypto` |
| §22 Compliance | **부분** | V4/V5·PII 미저장·설명가능성 |
| §23 Disaster Recovery | **부분** | 세션 재생성·`omni_outbox` 재큐 |
| §24 Performance | **부분** | Gateway·Citation·캐시. Parallel Agent 없음 |
| §25~§26 PHP/Claude(Orchestrator/Planning/Memory/MCP Adapter/HITL Service) | **부분** | ★`ClaudeAI` Gateway·tool-calling·`agent_mode`·`action_request`·V3 Trust. Multi-Agent/Planning/Vector Memory/MCP Server 부재 |
| §27~§28 검증(agent:health/planner:status/mcp:health) | **대상 없음** | artisan 없음. `/v422/ai/agentic`·`ai_call_log`·`action_request` 로 대체 |

---

## 4. 확립된 표준 (신규 AI Agent 코드가 따를 정본)

- ★**Agent Gateway 정본 = `ClaudeAI::callClaudeTools`**(tool-use 에이전틱·`gateway()` 일원화·MEA 053). 신규 도구는 **`/v422/ai/agentic` 의 tools 배열에만 증설**(신규 엔드포인트/메뉴 0·`biQueryTool` 안전 규약 그대로). ★**전송 일원화·`ai_call_log` 감사**·BYO 키 우선.
- ★**HITL/자율 집행 정본 = `agent_mode`+`action_request`**(승인정책·high-value 게이트 ₩5M↑ 무승인 차단·Part042). ★**자율집행=승인정책 존중**(헌법 V4·직접 우회 금지·서버측 강제).
- ★**V5 Safety Rule**: 신뢰도/권한/동기화/통계신뢰 부족 시 **자율 집행 금지→경고**. AI Agent 자동화는 이 게이트 통과 필수·V3 Trust READY 데이터만.
- ★**Explainable = V4 근거/신뢰도**(Citation·min-score 게이트·근거 없으면 빈 배열·Part042). Agent 의사결정은 근거 동반·근거없는 결론 금지.
- ★**Tool 안전 규약**: tools 는 권한 검증 후 호출·테넌트 격리·`biQueryTool` 패턴(읽기 전용 BI 쿼리 등 안전 도구). ★**임의 코드 실행 도구 금지**(Part048 보안 강점).
- ★**메모리 정직**: conversation memory(멀티턴)는 **단기 working memory**·세션 종료 폐기. ★**Long-Term Vector Memory 신설 보류**(289차후속·표본 0→검증 불가). 장기 지식=`GeniegoKnowledge`/`graph_node`.
- ★★**오흡수 차단**: **`AutoRecommend`/`Decisioning`≠multi-agent** · **conversation memory≠long-term memory** · **`agent_mode`≠multi-agent framework** · **모델 consensus%≠agent 협업**. 단일 에이전트 tool-calling 임을 정직 표기.
- ★★**Part021/022/042·MEA 054 중복·재판정 금지**: Gateway=Part021·MCP=Part022·거버넌스=Part042 정본. 본 Part 는 Agent/Memory/Autonomous 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 다중 Part 중복 + 형식 Multi-Agent 부재)

1. **형식 Multi-Agent Orchestration(planner/executor/validator 역할·delegation)·Planning Engine(goal decomposition)** — 안 함. **단일 에이전트 tool-calling**(`callClaudeTools`)·LLM 암묵 추론·`RuleEngine`이 대응물. 멀티 에이전트=프레임워크 신설.
2. **Agent Long-Term Memory(Vector/Semantic)** — 보류. ★**289차후속 Vector DB 보류**(표본 0→검증 불가). 장기 지식=`GeniegoKnowledge`(지식 SSOT)·`graph_node`(KG). conversation memory 는 단기.
3. **형식 MCP Server(백엔드 호스팅)** — 안 함. ★**Claude Code(개발툴)는 MCP 사용하나 PHP 백엔드는 MCP Server 아님**(tool-calling=ClaudeAI 내부). MCP 판정=Part022 정본.
4. **Agent Collaboration(consensus/conflict resolution)·Capability Registry** — 부재/부분. 단일 에이전트라 협업 없음("consensus"=모델 동의도·오흡수 금지). Governance=V5 Safety Rule·quota.
5. **`AutoRecommend`/`Decisioning`/`agent_mode`/conversation memory 를 Multi-Agent/Long-Term Memory/Framework 로 오흡수 금지** — 의사결정 엔진/승인 모드/단기 메모리이지 형식 멀티 에이전트 아님.
6. **artisan `agent:*`/`planner:status`/`mcp:health` 명령** — 없음(Slim). `/v422/ai/agentic`·`ai_call_log`·`action_request` 로 대체.

★**준수하는 실 원칙(강함·MEA 054 최고 실재도)**: **tool-calling 에이전틱(`callClaudeTools`·안전 규약·tools 배열)·Gateway 일원화(ai_call_log 감사)·HITL(agent_mode+action_request·high-value 게이트)·V5 Safety Rule·V3 Trust READY·V4 근거/신뢰도·자율 액션(RuleEngine/JourneyBuilder)·테넌트 격리·PII 미저장**. ★**오흡수 차단**: 단일 에이전트≠multi-agent·단기 메모리≠장기 메모리. ★**Part021/022/042·MEA 054 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. Agent 도구=`ClaudeAI::callClaudeTools`(tool-use)·`/v422/ai/agentic` tools 배열 증설(신규 엔드포인트/메뉴 0·`biQueryTool` 안전 규약). Gateway `gateway()` 일원화·`ai_call_log` 감사.
2. 자율 집행=`agent_mode`+`action_request`(승인정책·high-value 게이트)·V5 Safety Rule(부족 시 집행금지)·V3 Trust READY만. ★자율집행=승인정책 존중(우회 금지).
3. 근거/신뢰도=V4 Citation(근거 없으면 빈 배열). Tool=권한 검증·테넌트 격리·**임의 코드 실행 도구 금지**.
4. 메모리=단기 conversation(세션 폐기). ★**Long-Term Vector Memory 신설 보류**(표본 0). 장기=`GeniegoKnowledge`/`graph_node`.
5. ★★**오흡수 금지**: `AutoRecommend`/`Decisioning`(multi-agent 아님)·conversation memory(long-term 아님)·`agent_mode`(framework 아님)·consensus%(협업 아님).
6. ★★형식 Multi-Agent/Planning Engine/Vector Memory/MCP Server 를 "명세에 있다"는 이유로 이식하지 않는다(`callClaudeTools`+`agent_mode`+`AutoRecommend` 로 커버). Gateway/MCP/거버넌스 판정=Part021/022/042 정본(재판정 금지).

---

## 7. Completion Criteria

- [x] AI Agent 스택 **실측**(형식 Multi-Agent/Planning Engine/Long-Term Vector Memory/MCP Server 부재·`callClaudeTools` tool-use·`agent_mode`+`action_request` HITL·Gateway 감사·`AutoRecommend`/`Decisioning`·V3 Trust 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 Multi-Agent/Planning/Vector Memory 부재 증명·단일 에이전트 tool-calling 강함·MEA 054 최고 실재도)
- [x] 실 Agent(callClaudeTools+agent_mode+action_request+AutoRecommend+V3 Trust+V4 근거) 성문화(§4)
- [x] ★tool-calling 에이전틱·HITL(high-value 게이트)·V5 Safety Rule·★★오흡수 차단(AutoRecommend≠multi-agent·conversation≠long-term·agent_mode≠framework) 명시
- [x] 의도적 미적용 + 사유(§5) — Multi-Agent Orchestration/Planning Engine/Long-Term Vector Memory/MCP Server/Agent Collaboration(+Part021/022/042·MEA 054 중복)
- [x] Claude Code 규칙(§6) · `callClaudeTools`·`agent_mode`·`action_request`·`ai_call_log`·V3 Trust 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **MEA 054(최고 실재도) 승계** — 실재하는 **단일 에이전트 tool-calling
> 코파일럿**(`callClaudeTools` 에이전틱 + `agent_mode`/`action_request` HITL + Gateway 감사 + `AutoRecommend`/
> `Decisioning` 자율 의사결정 + V3 Trust + V4 근거)의 성문화이지 형식 Multi-Agent 프레임워크/Planning Engine/
> Vector 장기 메모리 이식이 아니다. ★★**오흡수 차단**: **`AutoRecommend`는 multi-agent 가 아니고, conversation
> memory 는 long-term 이 아니며, `agent_mode`는 framework 가 아니다**. Gateway/MCP/거버넌스=Part021/022/042 정본.

---

## 다음 Part

**CCIS Part055 — Enterprise Digital Twin, Simulation, Decision Intelligence & Predictive Operations** — ★사전 실측 예고: ★**MEA 058(Decision Intelligence PARTIAL)·059(Digital Twin weak)와 중복** — 형식 Digital Twin(물리 자산 트윈)·What-if 시뮬레이션 엔진은 **부재/부분**이나, 의사결정/예측 실체는 **`Mmm`(ROI frontier·예산 시뮬)·`PriceOpt`(가격 시뮬·po_simulations·정직 미산출)·`DemandForecast`(수요예측)·`Decisioning`/`AutoRecommend`(의사결정)·`Risk`·V3 Trust**로 부분 실재. Part055 도 실측→Digital Twin/What-if 엔진 부재증명→Mmm+PriceOpt+DemandForecast 성문화. ★MEA 058/059·"정직 미산출(Mmm optimized:false·PriceOpt null/422)"·"비용축≠환경축" 승계·Digital Twin은 Part037에서 이미 부재 판정.
