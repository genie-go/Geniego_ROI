# GeniegoROI Claude Code Implementation Specification

# CCIS Part022 — AI Agent, MCP, Tool Calling & Multi-Agent Architecture Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

AI Agent·MCP·Tool Calling·Multi-Agent 표준을 수립한다.

> ★**성격(Part021 과 유사)**: AI 는 이 저장소의 핵심 역량(헌법 V4/V5). 명세의 **Tool First·Human
> Override(HITL)·Least Privilege·Governability·Observable Agent** 는 **대체로 준수**한다. 실측 결과
> 실 Agent 는 **`agent_mode`(recommend/approval/auto) + `action_request`(승인 큐) + 자동화/결정 핸들러
> (`AutoCampaign`/`AutoRecommend`/`Decisioning`/`RuleEngine`/`Alerting`/`Mmm`)** 이며(MEA 054 PARTIAL-
> strong), Tool Calling=`callClaudeTools`(053)이다. 다만 **MCP·Multi-Agent Orchestrator·Tool Registry
> 는 부재**다. Part001 §4 에 따라 **실측 → MCP/멀티에이전트 부재 증명 → 실 agent_mode/승인정책 성문화**했다.
> (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 AI Agent 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Agent 거버넌스 | Agent as Coordinator | ★**`agent_mode`(15·recommend/approval/auto·231 OS#4)** — 모드별 자동집행 허용범위 |
| 승인 큐(HITL) | Human-in-the-Loop | ★**`action_request`(34·승인 큐·289차)** + writeGuard 서버전역 |
| 실 Agent | Assistant/Analysis/Workflow… | ★**자동화/결정 핸들러**: `AutoCampaign`·`AutoRecommend`·`Decisioning`·`RuleEngine`·`Alerting`·`Mmm`(SRP 도메인별) |
| Tool/Function Calling | Schema 기반 | ★**`callClaudeTools`(21·053)** — tool_use·input_schema |
| HITL(고위험 승인) | 결제/삭제/권한 승인 | ★**`evaluatePolicy`/high_value 게이트(21·289차)** — 고액/외부송출은 서버측 승인 후 집행(직접 publish 우회 금지) |
| Agent State | Pending/Planning/Running… | **부분**(상태값 27 — planning/waiting 등). 전용 Agent state machine 은 아님 |
| MCP(Model Context Protocol) | Client/Server | **부재**(0) |
| Multi-Agent Orchestrator/Planner | Planner→Research→Report | **부재**(0) — 단일 자동화 핸들러 |
| Tool Registry | Registry 관리 | **부재**(0) — Tool=`callClaudeTools` 인자 정의 |
| Agent Memory | Short/Long-term | **부분** — 대화/세션(챗봇)·DB 상태. 형식 Memory 계층 아님 |
| Agent Security | 최소권한·Audit | ★**RBAC/writeGuard/evaluatePolicy·`SecurityAudit`·`ai_call_log`**(Part012/021) |
| Provider Independent | Adapter | **부분** — `ClaudeAI::gateway` 추상화(Claude 주력·Part021) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Tool First/Human Override/Least Privilege/Governable/Observable) | **★대체로 준수** | agent_mode 거버넌스·action_request 승인·writeGuard 최소권한·ai_call_log 관측. Provider Independent 는 Claude 중심(부분) |
| §4~§5 Agent Architecture/종류 | **부분(대응물)** | Agent Gateway/Orchestrator 계층 없음. 자동화 핸들러(SRP 도메인별)가 Agent |
| §6~§8 MCP Client/Server | **미적용** | MCP 부재 |
| §9~§10 Tool Registry/Tool 정의 | **부분** | 형식 Registry 없음. Tool=`callClaudeTools` 인자(name/description/input_schema) |
| §11~§12 Tool/Function Calling(권한/Schema) | **★준수** | `callClaudeTools`·JSON schema·권한(RBAC) |
| §13~§14 Multi-Agent/Orchestrator | **미적용** | Orchestrator 0. 단일 핸들러 |
| §15 Agent Planning | **미적용** | Planner 부재. 규칙/결정=`RuleEngine`/`Decisioning`(계획형 아님) |
| §16~§17 Agent Memory/Context | **부분** | 챗봇 대화·세션·DB 상태. tenant/locale 컨텍스트 최소(민감정보 제외) |
| §18 HITL | **★강하게 준수** | agent_mode·action_request·evaluatePolicy·high_value 게이트(289차) |
| §19 Workflow Agent | **대응물** | `JourneyBuilder`(여정)·`RuleEngine`. Agent 형식 아님(Part019) |
| §20 Agent Security | **★준수** | RBAC·writeGuard·evaluatePolicy·SecurityAudit |
| §21~§22 Monitoring/Logging | **부분** | ai_call_log·action_request 상태·SystemMetrics. traceId 부재(Part013) |
| §23~§24 Retry/Fallback | **부분** | 외부연동 retry. Human Review fallback(승인) |
| §25 Agent Communication(느슨한 결합) | **부분** | DB 작업큐·상태(Part018). Event Bus 아님 |
| §26 Agent State | **부분** | 상태값 존재. 전용 state machine 아님 |
| §27 Prompt Security | **★준수** | Injection 방어·컨텍스트 검증·출력검증·근거없는 결론 금지(V4) |
| §28~§29 PHP/Claude(Tool Permission/HITL/Injection) | **부분 준수** | 권한·HITL·Injection 준수. MCP/Tool Registry/Provider Adapter 미적용 |
| §30~§31 검증(mcp:health/agent:status) | **대상 없음** | MCP/artisan 없음. action_request 상태·`callClaudeTools` |

---

## 4. 확립된 표준 (신규 Agent 코드가 따를 정본)

- **Agent = 도메인 자동화 핸들러**(`AutoCampaign`/`AutoRecommend`/`Decisioning`/`RuleEngine`/`Alerting`/`Mmm`) + **`agent_mode`(recommend/approval/auto)** 거버넌스. 중복 엔진 신설 금지(V4 §16).
- ★**HITL(헌법 V4/V5)**: 고위험(고액·외부송출·삭제·권한변경)은 **`action_request` 승인 큐 → 승인 후 집행**. **서버측 `evaluatePolicy`/high_value 게이트**(직접 publish 우회 금지·289차). `agent_mode='auto'` 라도 안전규칙(신뢰도/권한/동기화/통계신뢰 부족 시 자동집행 금지→경고).
- **Tool Calling**: `callClaudeTools`(053·게이트 §8 경유)·JSON input_schema·최소권한(RBAC).
- **Agent Security**: RBAC·writeGuard·evaluatePolicy·`SecurityAudit`·`ai_call_log`. 민감정보 프롬프트/메모리 제외.
- **Context**: tenant/locale·비즈니스 컨텍스트 최소. Prompt Injection/Tool Injection 방어·출력 검증.
- **Provider**: `ClaudeAI::gateway` 경유(Part021). Claude 주력.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **MCP(Model Context Protocol) Client/Server** — 안 함. PHP 백엔드에 MCP 부재. Tool=`callClaudeTools`. MCP 도입=신규 프로토콜 계층(인프라).
2. **Multi-Agent Orchestrator/Planner/Agent graph** — 안 함. 단일 자동화 핸들러+agent_mode 가 정본. 멀티에이전트=대규모 신설(MEA 054 어휘 "아키텍처 형태 선행 종속").
3. **형식 Tool Registry·Agent State Machine·Agent Memory 계층** — 안 함. `callClaudeTools` 인자·DB 상태·챗봇 세션으로 대응.
4. **Provider-Independent Agent(멀티LLM Adapter)** — 부분. gateway 추상화·Claude 주력(Part021).
5. **traceId/OpenTelemetry Agent 추적** — 안 함(Part013). ai_call_log·action_request 상태.

★**준수하는 실 원칙(강함)**: **HITL/Governability**(agent_mode·action_request·evaluatePolicy·high_value 게이트)·Tool Calling(callClaudeTools)·최소권한(writeGuard)·Prompt Security·근거없는 결론 금지·안전규칙(자동집행 조건).

---

## 6. Claude Code 구현 규칙

1. Agent=도메인 자동화 핸들러 + `agent_mode` 거버넌스. Orchestrator/MCP/Tool Registry 대규모 신설 금지.
2. ★**고위험 작업은 HITL** — `action_request` 승인 큐·**서버측 `evaluatePolicy`/high_value 게이트**(직접 우회 금지·289차). `auto` 모드도 안전규칙 위반 시 자동집행 금지→경고.
3. Tool=`callClaudeTools`(게이트 §8·053 경유)·JSON schema·RBAC 권한. 결과 검증.
4. Agent Security=writeGuard/evaluatePolicy·SecurityAudit·ai_call_log. 민감정보 프롬프트/메모리 제외.
5. Prompt/Tool Injection 방어·컨텍스트 검증·근거없는 결론 금지(V4 Explainable).
6. MCP/Multi-Agent Orchestrator/Tool Registry 를 "명세에 있다"는 이유로 이식하지 않는다(단일 핸들러+agent_mode 유지).

---

## 7. Completion Criteria

- [x] AI Agent **실측**(agent_mode 15·action_request 34·자동화 핸들러 6·callClaudeTools 21·HITL evaluatePolicy 21·MCP 0·Orchestrator 0)
- [x] 명세 §3~§31 **섹션별 매핑·판정**(MCP/Multi-Agent/Tool Registry/Planner 부재 증명)
- [x] 실 Agent 규약(agent_mode·action_request 승인·Tool Calling·HITL evaluatePolicy·Agent Security) 성문화(§4)
- [x] ★HITL/Governability(§18)·Tool Calling(§11)·Agent Security(§20)·Prompt Security(§27) 준수 명시
- [x] 의도적 미적용 + 사유(§5) — MCP/Multi-Agent/Tool Registry/Provider Adapter
- [x] Claude Code 규칙(§6) · `make quality` 정합(AI Gateway 게이트 §8 정합)

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 agent_mode + action_request 승인 + Decisioning 자동화 + HITL(evaluatePolicy) Agent 스택의 성문화이지 MCP/Multi-Agent Orchestrator 이식이 아니다.

---

## 다음 Part

**CCIS Part023 — Observability, Monitoring, Telemetry & Operations** — ★사전 경고: OpenTelemetry/Prometheus/Grafana/Loki/Jaeger **부재**(Part013/016/017). 실 관측=`SystemMetrics` 프로브(★정직 미산출 null+사유)·`Compliance` SIEM 포워더·`Alerting`·Health(`/healthz`)·`error_log`. SLI/SLO 부분. Part023 도 실측→OTel 부재증명→SystemMetrics/Alerting/Health 성문화(관측 스택 이식 금지).
