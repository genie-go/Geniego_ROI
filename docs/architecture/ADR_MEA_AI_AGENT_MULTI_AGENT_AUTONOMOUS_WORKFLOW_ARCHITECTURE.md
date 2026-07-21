# ADR — MEA Part 054 Enterprise AI Agent, Multi-Agent & Autonomous Workflow Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★부재증명 완료·오흡수 금지·과대주장 금지·헌법 V4/V5/데이터 헌법 V3/CHANGE_GATE 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## Context
MEA Part 054는 AI Agent 등록→목표정의→계획→도구선택→워크플로 실행→검증→학습→폐기 전 생명주기와 Multi-Agent 협업·Planning Engine·Tool Calling·Agent Memory를 표준화하려 한다. GeniegoROI에는 **단일 에이전트 tool-use 코파일럿**(`ClaudeAI::agenticAsk`·읽기도구 6+제안도구 3)·**휴먼-인-루프 집행**(`agenticExecute`)·**Agent 권한모드 3단계**(`agent_mode`)·**자율 워크플로 엔진**(`JourneyBuilder` 노드 그래프+cron)·**규칙 자동화**(`RuleEngine`)·**Maker-Checker 승인**(`Alerting` action_request)이 실재해 051/052 대비 실재도가 가장 높다. 반면 Multi-Agent·Agent Registry·Planning Engine·Agent Memory·Agent Runtime은 전부 grep 0. ★선행 갭 해소(2026-07-22): **Part 053(Generative AI/LLM/Prompt Engineering) 완결**(ADR D-6 소급 정합) — 053 상속분 확정. 본 Part의 Tool Calling은 053 §11 Function Calling과 **동일 substrate(`callClaudeTools`:648)·동일 판정**, Agent Memory는 053 CONTEXT/LLM_SESSION과 **동일 ABSENT**이며 이중 기술·판정 분산을 금지한다.

## D-1 실 Agent=단일 에이전트 tool-use 코파일럿 1개·Multi-Agent는 순신설
**결정**: 실재=`ClaudeAI::agenticAsk`(:839) 단일 에이전트 루프(Anthropic tool-use·`callClaudeTools`:648·도구 반복 6회 상한:907·도구 디스패치 맵:919~926). ★Coordinator/Planner/Executor/Reviewer/Knowledge Agent·Communication Protocol·Task Delegation·Conflict Resolution·Agent Registry(AI_AGENT 등록/버전/폐기)=부재(grep 0: multi_agent/MultiAgent/Coordinator/agent_registry/reviewer_agent)·순신설. ★중복 에이전트 엔진 신설 금지=헌법 V4 단일 Intelligence Layer — Multi-Agent 구현 시 `agenticAsk`를 Executor로 승격하고 그 위에 Orchestrator만 얹는다(코파일럿 재구현 금지).

## D-2 ★파괴적 액션 자동집행 금지는 이미 충족 (정직 기술·후퇴 금지)
**결정**: 액션도구는 `propose_*` 3종(pause_campaign/budget_change/create_segment:863~869)으로 **제안만 생성**하고 tool_result에 "승인 후 실행" 통지만 반환(:932~936). 실집행은 `agenticExecute`(:956)에서 사용자가 명시 승인한 **단일 액션만** 기존 가드레일 액추에이터(`AdAdapters::pause`:967·`updateBudget`:973·`CRM::refreshSegmentForSend`:984)로 수행. 테넌트 기본 권한모드는 `approval`(fail-safe·`AdAdapters::agentMode`:44~50), 자율집행은 `auto` **그리고** 킬스위치 OFF일 때만(`agentAutoAllowed`:53~56). ★이는 명세 §17(승인 없는 파괴적 작업 금지)·헌법 V5·[[feedback_deploy_approval_mandatory]]를 이미 충족 — **어떤 개편도 이 게이트를 약화시키면 회귀**([[feedback_no_regression_value_unification]]).

## D-3 ★Agent Memory·Planning Engine 오흡수 금지 (정직 표기)
**결정**: 현행 대화 맥락은 **프론트가 보낸 history를 매 요청 재구성**(`ClaudeAI`:878~903·`HIST_MAX_TURNS` 10·`HIST_MAX_CHARS` 4000·연속 role 병합·첫 메시지 user 강제)이며, ★안전상 과거 assistant의 tool_use 블록은 신뢰하지 않고 text로만 재구성(:880~881·위조 tool_result 주입 차단)한다. 즉 **서버 영속 Agent Memory Service·Agent Session은 부재**(grep 0: agent_memory/agent_session)이며 클라이언트 제공 컨텍스트일 뿐이다. 또한 도구 6회 반복 루프는 LLM의 암묵적 도구 선택이지 **명시 계획 산출물(AGENT_PLAN)·Goal Decomposition을 만들지 않는다**(grep 0: planning_engine/goal_decomposition/AGENT_PLAN). ★Agent Memory Service·Planning Engine=순신설·과대주장 금지.

## D-4 Autonomous Workflow=`JourneyBuilder` 승격·중복 워크플로 엔진 절대 금지
**결정**: 실 워크플로 엔진=`JourneyBuilder`(journeys/journey_enrollments/journey_node_logs/journey_decision_arm/journey_decision_log:42~74). Conditional Routing(:628)·Tool Chaining 유사 노드 실행(email/sms/kakao/webhook:714~722)·Dynamic Execution(delay resume_at:556~571·event wait+timeout:577~622)·Workflow Analytics(`journeyStats`:256·노드별 실행수:274)·변형 선택(Thompson sampling:1130~1152)·트리거 자동 진입(`enrollByTrigger`:297·detector churn/segment/abandon:341~)·`journey_cron.php` 주기 실행이 실재. 규칙형 자동화=`RuleEngine`(rule_engine/rule_engine_log·`evaluateAll`:181/`evaluateTenant`:194·`rule_engine_cron.php`). ★**중복 워크플로/규칙 엔진 신설 절대 금지**([[feedback_no_duplicate_features]]·헌법 V4) — Agent Workflow는 이 둘의 확장으로만. ★단, **사람이 그린 정적 캔버스≠Autonomous Goal Planning**(오흡수 금지)·Workflow Recovery(형식)=부재.

## D-5 Human Approval=Maker-Checker(action_request) 재사용·생산자 갭은 기존 보류 항목
**결정**: 승인 워크플로 정본=`Alerting` action_request(2인 정족수 승인:660~665·**approved 상태에서만 집행**:698~702·실 액추에이터 디스패치·정직 상태 executed/failed/approved_manual). ★생산자(INSERT INTO action_request)는 여전히 grep 0 — 이는 **287/288차에 이미 확정·보류 등재된 기존 항목**([[project_n287_full_audit]]·[[project_n288_full_audit]])이며 본 Part는 **상태 기술만** 하고 재플래그하지 않는다([[feedback_audit_reference_past_fixes]]). Agent Approval Policy 구현 시 새 승인 테이블 신설 금지·action_request 확장.

## D-6 Agent Security/Identity/Audit은 Part 047~049 상속·중복 금지
**결정**: Tenant Isolation=`Db`/`auth_tenant`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(047·writeGuard 서버전역)·Audit 정본=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]])·권한모드 변경 감사=`UserAuth::audit('agent_mode_change', high)`(:1748)·Memory/Tool 자격 암호화=`Crypto`(049). ★**Agent Identity(AGENT_ROLE·비인간 identity)**=`api_key`가 유일 실 비인간 identity(EPIC 06-A Part3-6 확정)이나 **Agent 전용 identity는 부재**·순신설. ★중복 IAM/Audit/암호화 신설 금지.

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★실재도 PARTIAL-strong(AI 시리즈 최고)이나 **형식 Multi-Agent·Registry·Planning·Memory·Runtime은 전부 부재**(grep 0).
- ★중복 금지 재사용: `ClaudeAI`(코파일럿·도구)·`JourneyBuilder`(워크플로)·`RuleEngine`(규칙)·`Alerting` action_request(승인)·`AdAdapters`(액추에이터·킬스위치·agent_mode)·`AutoCampaign`/`Decisioning`/`AutoRecommend`(의사결정)·`Crypto`/`SecurityAudit`/`index.php`(보안).
- ★오흡수 금지: 단일 tool-use 루프≠Multi-Agent·프론트 history≠Agent Memory·도구 반복≠Planning Engine·Journey 캔버스≠Goal Planning·cron 37종≠Agent Runtime·"Budget/Inventory Planner"≠Planner Agent·`WmsCctv.agent_version`(CCTV 브리지)≠AI Agent.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·AI Agent의 기업 정책 자동 변경·승인 없는 파괴적 외부 작업 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 044/047/048/049/051/052/**053** 상속·재감사 금지. ★Part 053 갭 해소 완료(2026-07-22·053 ADR D-6 소급 정합).
