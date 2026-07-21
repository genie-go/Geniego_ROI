# MEA Part 054 — Governance Mechanisms (§7~§17 통합)

> **거버넌스 상태**: 거버넌스 메커니즘 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★`ClaudeAI`(코파일럿·도구·HITL)·`JourneyBuilder`(워크플로)·`RuleEngine`(규칙)·`Alerting`(action_request 승인)·`AdAdapters`(agent_mode·액추에이터·킬스위치)·`Crypto`/`SecurityAudit`/`index.php` 재사용(★중복 Agent/Workflow 엔진 절대 금지=헌법 V4)·Multi-Agent/Registry/Planning/Memory/Runtime 순신설·오흡수 금지·과대주장 금지·★★마케팅 AI/dev AI KEEP_SEPARATE·Part 051/052/047~049·EPIC 06-A 상속.

## §7 Agent Lifecycle 거버넌스
Registration→Goal Definition→Task Planning→Tool Selection→Workflow Execution→Result Validation→Feedback Learning→Optimization→Retirement→Archive. 현행=Tool Selection(LLM·`ClaudeAI`:911~926)·Workflow Execution(`JourneyBuilder`:553~724)·부분 Result(:946)만. ★Registration/Goal/Planning/Validation(형식)/Learning/Retirement=순신설. ★전 실행 추적 요구는 `journey_node_logs`(:724)·`rule_engine_log`가 부분 충족이나 **Agent 실행 트레일 자체는 부재**(`SecurityAudit` 확장으로만·중복 감사 신설 금지).

## §8 Agent Runtime 거버넌스
Registration/Scheduling/Goal Mgmt/Task Queue/Runtime Isolation/Session/Scaling/Monitoring. 현행=Scheduling=cron 37종(`journey_cron`/`rule_engine_cron`/`optimize_cron`/`omni_dispatch_cron` 등)·Session=요청 단위(영속 없음). ★Task Queue·Runtime Isolation·Scaling·Runtime Monitoring=순신설(★배치 cron≠독립 Agent Runtime 오흡수 금지·단일호스트 인프라 선행 종속=Part 044/045/050 승계).

## §9 Multi-Agent 거버넌스
Coordinator/Planner/Executor/Reviewer/Knowledge Agent·Communication Protocol·Task Delegation·Conflict Resolution. 현행=**전무**(grep 0). ★순신설이나 설계 원칙 고정: `ClaudeAI::agenticAsk`를 **Executor로 승격**하고 Orchestrator만 상위 신설(★코파일럿 재구현 금지=헌법 V4)·Reviewer는 기존 승인(`Alerting` action_request:660~665)과 통합(★중복 승인 경로 금지)·Task Delegation은 EPIC 06-A Delegation 설계 상속(권한 상한 초과 위임 금지).

## §10 Autonomous Workflow 거버넌스
Goal/Workflow Planning·Dynamic Execution·Conditional Routing·Tool Chaining·Human Approval·Recovery·Analytics. 현행=Dynamic Execution(delay resume:556~571·event wait+timeout:577~622)·Conditional Routing(condition:628·split:638~647)·노드 체이닝(email/sms/kakao/webhook:714~722)·Human Approval(`agenticExecute`:956·action_request approved만:698~702)·Analytics(:256/:274)·트리거 자동진입(:297·detector:341~). ★안전장치 실재=발송 게이트(frequency cap·quiet hours·consent:1234~1247)·webhook URL 공개 HTTPS 검증(:930). ★Goal/Workflow Planning(자율)·Workflow Recovery=순신설(★정적 캔버스≠자율 계획 오흡수 금지).

## §11 Tool Calling 거버넌스
API/DB/Search/Document/External Tool·Plugin·Function Calling·Tool Permission Control. 현행=Function Calling(`callClaudeTools`:648·stop_reason tool_use:911)·읽기도구 6종(전부 집계·테넌트 스코프·LIMIT 내장·개인정보 미반환:853)·액션도구는 `propose_*` 제안만(:863~869/:932~936)·unknown_tool 거부(:938). 권한=`requirePro`(:840)+테넌트(:841). ★**형식 Tool Registry·per-Tool Permission Control(≤100ms Authorization)·Plugin Integration·External System Tool**=순신설(★플랜게이트≠권한 엔진 오흡수 금지). ★도구 증설은 **기존 tools 배열에만**(신규 엔드포인트/메뉴 0 원칙·283차 선례).

## §12 Agent Governance
Agent/Execution/Tool/Workflow/Approval/Safety Policy·Compliance·Audit Trail. 현행=Agent Policy=`agent_mode`(recommend|approval|auto·기본 approval fail-safe·`AdAdapters`:44~50·검증 `UserAuth`:1743·변경 감사 high:1748·owner 전용)·Execution Safety=`agentAutoAllowed`(auto+킬스위치 OFF:53~56)·`AutoCampaign`(:347 자율 활성화도 결제수단·딜리버리 게이트 통과 시에만)·Approval=action_request 2인 정족수(:660~665)·Audit=`SecurityAudit::verify`(★유일 tamper-evident). ★Tool/Workflow Policy(형식)·Compliance Validation·Agent Policy Manager=순신설. ★★현행 3모드 정책·킬스위치·정족수는 **후퇴 금지 자산**([[feedback_no_regression_value_unification]]).

## §13 Agent Security 거버넌스
Tenant Isolation=`Db`/`auth_tenant`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(047·writeGuard 서버전역)·Audit Logging=`SecurityAudit`(048)·Secure Tool Access 부분(집계 전용·테넌트 스코프·개인정보 미반환·No-PII v418.1)·자격 암호화=`Crypto`(AES-256-GCM·049). ★**Agent Identity(AGENT_ROLE·비인간 identity)**=`api_key`가 유일 실 비인간 identity(EPIC 06-A Part3-6)이나 Agent 전용은 부재·순신설. ★**Memory Encryption**=Agent Memory 자체가 부재라 동반 순신설. ★최소 권한 원칙=Agent도 사용자 권한 상한 초과 불가(EPIC 06-A 상속·상한 초과 위임 금지).

## §14 Runtime 규칙 거버넌스
Goal Validation·Task Planning·Tool Authorization·Workflow Execution·Result Validation·Event·Audit. 현행=Tool 실행(:919~939)·Workflow Execution(`JourneyBuilder`)·부분 Audit. ★Goal Validation·Task Planning·형식 Tool Authorization·Result Validation·Event 생성=순신설. ★도구 반복 상한 6회(:907)·대화 상한(10턴/4000자:878~903)=비용/토큰 폭주 방어 실재(재사용).

## §15 API 거버넌스 (8)
Register Agent·Execute Agent·Execute Workflow·Invoke Tool·Query Status/Memory/Metrics/Audit. 현행=Execute Agent=`POST /v422/ai/agentic`(`routes.php`:49~52·`$register`:2478~2479)·Execute(승인집행)=`/v422/ai/agentic/execute`·Execute Workflow=여정 launch/enroll·Query Audit seed=`SecurityAudit`. ★Register Agent·Query Agent Status/Memory/Metrics=순신설(★write=analyst+·writeGuard 상속·`/api` 접두 필수[[reference_api_prefix_routing]]·Part 042 API Gateway 정합).

## §16 Event 거버넌스 (8)
AgentRegistered/GoalCreated/PlanGenerated/WorkflowStarted/ToolExecuted/AgentCompleted/AgentFailed/AgentAudited. 현행=ToolExecuted 유사=`journey_node_logs`(:724)·`rule_engine_log`·WorkflowStarted 유사=enrollment(:227)·AgentAudited seed=`SecurityAudit`(동기 기록·event-driven 부재). ★전 Event 표준=순신설(★실행 로그≠이벤트 버스 오흡수 금지·Part 046 Observability 정합).

## §17 AI 거버넌스
Goal Decomposition·Autonomous Planning·Dynamic Task Allocation·Multi-Agent Collaboration·Tool Recommendation·Workflow Optimization·Explainable Agent Reasoning·Responsible Agent Validation. 현행=Tool Recommendation=LLM 도구 선택(:871~876 시스템 프롬프트가 도메인별 도구 지정)·Explainable Reasoning 부분=**근거 수치 강제·도구 error 시 수치 날조 금지·추측 금지**(:876)·Responsible=데이터 헌법 V3(READY만)·헌법 V4(XAI). ★Goal Decomposition·Autonomous Planning·Dynamic Task Allocation·Multi-Agent·자율 Workflow Optimization=순신설. ★★**AI Agent는 승인 없이 기업 정책 변경·외부 시스템 파괴적 작업 자동 수행 불가** = 현행이 이미 충족(제안-only:932~936·HITL 단일 액션:956~987·기본 approval:44~50·킬스위치 종속:53~56·발송 게이트:1234~1247)·헌법 V5+`CHANGE_GATE`+배포 승인([[feedback_deploy_approval_mandatory]]). 마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.

## 판정
전 메커니즘 **설계-only·코드 0·NOT_CERTIFIED.** ★실 Agent 거버넌스=`agent_mode` 3모드(기본 approval fail-safe·owner 전용·high 감사)·`agentAutoAllowed`(킬스위치 종속)·`propose_*` 제안-only+`agenticExecute` HITL·action_request 2인 정족수(approved만 집행)·`JourneyBuilder` 발송 안전게이트(frequency cap·quiet hours·consent)·`SecurityAudit`(유일 tamper-evident)=**AI 시리즈 최고 실재도·후퇴 금지 자산**. ★**Multi-Agent(Coordinator/Planner/Reviewer/Protocol/Delegation/Conflict)·Agent Registry·Planning Engine(Goal Decomposition·AGENT_PLAN)·Agent Memory Service(+Encryption)·Agent Session·Agent Runtime(Isolation/Task Queue/Scaling)·형식 Tool Registry/Permission Control·Agent Identity·Agent Metric/Operations Dashboard/Advisor·Event 표준 8종·Workflow Recovery·99.99% SLA=순신설**(부재·grep 0·부재증명 완료·단일호스트 인프라 선행 종속). ★오흡수 금지(단일 tool-use 루프≠Multi-Agent Orchestrator·프론트 제공 history≠서버 Agent Memory·도구 6회 반복≠Planning Engine·정적 Journey 캔버스≠Autonomous Goal Planning·cron 37종≠Agent Runtime·`RuleEngine` 임계값≠Agent Policy Engine·"Budget/Inventory Planner"≠Planner Agent·`WmsCctv.agent_version`≠AI Agent). 헌법 Volume 4/5·데이터 헌법 V3·Part 044/047/048/049/051/052·EPIC 06-A 상속·재감사 금지(287/288차 action_request 생산자 보류 포함)·★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★승인 없는 파괴적 자동집행 불가(V5+CHANGE_GATE)·★**Part 053 완결·상속 정합 완료**(289차 후속 2026-07-22·ADR D-6): §11 Tool Calling=053 §11 Function Calling **동일 substrate·동일 판정**, Agent Memory=053 CONTEXT/LLM_SESSION **동일 ABSENT**, §17 "승인 없는 파괴적 작업 금지"=053 §17 "미검증 생성물 자동반영 금지" **동일 게이트·양쪽 이미 충족·후퇴 금지**.
