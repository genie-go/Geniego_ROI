# GeniegoROI Claude Code Implementation Specification

# CCIS Part061 — Enterprise Autonomous Enterprise, Hyperautomation, AI Workforce & Intelligent Business Operations Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Autonomous Enterprise·Hyperautomation·AI Workforce·Intelligent Business Operations 표준을 수립한다.

> ★**성격(★Part032/042/054 + MEA 060 중복 — 자동화 엔진 실재·형식 AI Workforce/Process Mining/Registry 부재)**:
> 본 Part 는 **CCIS Part032(워크플로/BPMN)·042(AI 거버넌스)·054(AI Agent)와 중복**되며, ★**MEA Part060
> (Hyperautomation = PARTIAL) 판정을 승계**한다. ★**MEA 060 핵심**: **자동화 엔진은 실재하되(JourneyBuilder/
> RuleEngine/Decisioning/callClaudeTools) 없는 것은 메타계층(Registry·통합 Orchestrator)이며, Orchestrator 는
> 디스패처**다(058~061 Registry 부재 5연속·어휘 제6항 "아키텍처 형태 선행 종속"). 명세가 다루는 **형식 AI
> Workforce(AI employee/supervisor 역할)·Digital Workers·Process Intelligence/Mining(Celonis)·RPA·형식 AI
> Task Orchestrator·통합 Autonomous Decision Engine·AI Workforce Analytics**는 **부재/부분**한다(grep 0·★rpa=
> i18n키 `rPass`·bot=LINE API URL 오탐 주의). ★**실재 축(자동화 substrate)**: **`RuleEngine`**(자율 액션·IF-THEN·
> Part032)·**`JourneyBuilder`**(자율 워크플로 캔버스·MEA 054)·**`AutoCampaign`/`AutoRecommend`/`Decisioning`**
> (자율 의사결정)·**`agent_mode`+`action_request`**(**Human-AI Collaboration·HITL**·Part054)·**`callClaudeTools`**
> (에이전틱·Part054)·**cron 자동화 34종**·**`omni_outbox`**(Intelligent Work Queue 유사·attempts+backoff)·
> **V5 Safety Rule**·**high-value 게이트**·**`SecurityAudit`** 는 실재한다. ★★**오흡수 차단**: **`RuleEngine`/
> `JourneyBuilder`/`Decisioning`=자율 액션/워크플로/의사결정이지 AI Workforce(디지털 직원) 아님** · **cron
> 자동화=스케줄 배치이지 Hyperautomation 통합 아님** · **Orchestrator=디스패처이지 형식 AI Task Orchestrator
> 아님**. Part001 §4 에 따라 실측 → AI Workforce/Digital Workers/Process Mining 부재증명 → RuleEngine+
> JourneyBuilder+agent_mode 성문화했다. ★정본=**Part032/042/054·MEA 060 D-2** 승계·**"자율집행=승인정책 존중"**·
> 재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 자동화 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Autonomous Enterprise Architecture | Events→Process Intel→Orchestrator→Workers→Human→Systems | **부분(대응물)** — Events→`RuleEngine`/`JourneyBuilder`→액션→`action_request`(Human). Process Intel/Workers 계층 아님 |
| Hyperautomation | Workflow/AI/RPA/Event Automation | **부분(MEA 060 PARTIAL)** — 워크플로(`JourneyBuilder`)·AI(`callClaudeTools`)·이벤트(`omni_outbox`). RPA 부재·통합 계층 아님 |
| AI Workforce | AI Employee/Assistant/Supervisor/Coordinator | **부재** — AI 직원 역할 없음. 에이전틱 코파일럿(단일·Part054)은 있으나 workforce 아님 |
| Digital Workers | Document/Support/Logistics/Finance 자동화 | **부분(대응물)** — 도메인 자동화(`AutoCampaign`·발주 `RuleEngine`·정산). 형식 디지털 워커 아님 |
| Intelligent Business Operations | Monitoring/Recommendation/Exception/Optimization | ★**부분 준수** — `AutoRecommend`/`Decisioning`·`Alerting`·`Mmm`. Exception Handling 부분 |
| Process Intelligence | Process Mining/Bottleneck/Automation Opportunity | **부재** — 프로세스 마이닝 없음(Celonis). `JourneyBuilder` stats(실측이지 마이닝 아님) |
| Autonomous Decision Engine | Rule/AI/Hybrid/Validation | ★**대응물** — `RuleEngine`(규칙)+`Decisioning`/`AutoRecommend`(AI)+V3 Trust(검증). 통합 엔진 아님(디스패처) |
| AI Task Orchestration | Assignment/Priority/Dependency/Retry | **부분(디스패처)** — cron·`omni_outbox`(우선순위/재시도)·`RuleEngine`. 형식 Orchestrator 아님 |
| Business Automation | Sales/Finance/Logistics/Customer | ★**부분 준수** — `AutoCampaign`(마케팅)·발주(`RuleEngine`)·정산·`Omnichannel`(고객). 영역별 실재 |
| Human-AI Collaboration | Approval/Review/AI Suggestion/Override | ★**실재** — `action_request`+`agent_mode`·high-value 게이트·근거/신뢰도(V4) |
| Enterprise Automation Governance | Automation/AI Policy/Approval/Audit | ★**대응물** — `CHANGE_GATE`·V5 Safety Rule·`action_request`·`SecurityAudit` |
| Intelligent Work Queue | Dynamic/Priority/AI Scheduling/Balancing | **부분(대응물)** — `omni_outbox`(큐·attempts·defer)·cron. AI Scheduling 부분 |
| AI Workforce Analytics | Productivity/Task Success/AI Utilization | **부분** — `ai_call_log`·rule_log·journey stats. Workforce 지표 대상 없음 |
| Operational Intelligence | Operational/Automation/AI KPI | **부분** — `Pnl`·`Mmm`·`AutoRecommend`·대시보드. 형식 Automation KPI 부분 |
| Continuous Optimization | Feedback/Policy/Workflow/AI Optimization | **부분** — `Mmm`(최적화)·`ModelMonitor`·A/B(`AbTesting`). Feedback Learning 부분 |
| Monitoring | Automation Status/AI Health/Queue/Decision Accuracy | **부분** — rule_log·`omni_outbox`·`SystemMetrics`·`ModelMonitor` |
| Logging | Automation/Task/Decision ID | **부분** — rule_log·`ai_call_log`·`SecurityAudit`. Decision ID 부분 |
| Security(RBAC/Workflow Auth/AI Perm/격리) | 자동화 권한 | ★**준수** — RBAC·`action_request`·V5 Safety Rule·테넌트 격리·`SecurityAudit` |
| Compliance(ISO 42001/NIST AI RMF) | AI 자동화 규정 | **부분** — V4/V5 헌법·`SecurityAudit`. 형식 인증 아님 |
| Disaster Recovery | Workflow/Queue/Decision 복구 | **부분** — `omni_outbox` 재큐·DLQ replay·cron 재실행 |
| Performance(Queue/Parallel/AI Scheduling) | 대규모 자동화 | **부분** — 배치(OMNI_BATCH)·cron. Parallel 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Automation First/Human in Control/Goal Driven/Explainable/Event Driven/Tenant Isolated/Secure Automation) | **★대체로 준수** | ★Human in Control(HITL)·Explainable(근거)·Event Driven·Secure Automation(V5)·Tenant Isolated. Continuous Learning 부분 |
| §4 Autonomous Enterprise Architecture | **부분(대응물)** | Events→`RuleEngine`/`JourneyBuilder`→`action_request`. Process Intel/Workers 아님 |
| §5 Hyperautomation | **부분(MEA 060)** | 워크플로·AI·이벤트. RPA/통합 계층 부재 |
| §6 AI Workforce | **부재** | AI 직원 역할 없음 |
| §7 Digital Workers | **부분(대응물)** | 도메인 자동화. 형식 워커 아님 |
| §8 Intelligent Business Operations | **부분 준수** | `AutoRecommend`/`Decisioning`·`Alerting`·`Mmm` |
| §9 Process Intelligence | **부재** | 프로세스 마이닝 없음(`JourneyBuilder` stats=실측) |
| §10 Autonomous Decision Engine | **★대응물** | `RuleEngine`+`Decisioning`+V3 Trust. 통합 엔진 아님(디스패처) |
| §11 AI Task Orchestration | **부분(디스패처)** | cron·`omni_outbox`·`RuleEngine`. 형식 Orchestrator 아님 |
| §12 Business Automation | **부분 준수** | `AutoCampaign`·발주·정산·`Omnichannel` |
| §13 Human-AI Collaboration | **★실재** | `action_request`+`agent_mode`·high-value 게이트 |
| §14 Automation Governance | **★대응물** | `CHANGE_GATE`·V5 Safety Rule·`SecurityAudit` |
| §15 Intelligent Work Queue | **부분(대응물)** | `omni_outbox`·cron |
| §16 AI Workforce Analytics | **부분** | `ai_call_log`·rule_log·journey stats |
| §17 Operational Intelligence | **부분** | `Pnl`·`Mmm`·`AutoRecommend` |
| §18 Continuous Optimization | **부분** | `Mmm`·`ModelMonitor`·`AbTesting` |
| §19 Monitoring | **부분** | rule_log·`omni_outbox`·`SystemMetrics` |
| §20 Logging | **부분** | rule_log·`ai_call_log`·`SecurityAudit` |
| §21 Security | **★준수** | RBAC·`action_request`·V5 Safety Rule·테넌트 격리 |
| §22 Compliance | **부분** | V4/V5·`SecurityAudit` |
| §23 Disaster Recovery | **부분** | `omni_outbox` 재큐·DLQ replay·cron |
| §24 Performance | **부분** | 배치·cron |
| §25~§26 PHP/Claude(Automation/AI Workforce/Task Orchestrator/Decision Engine Service) | **부분** | ★`RuleEngine`·`JourneyBuilder`·`Decisioning`·`agent_mode`·cron. AI Workforce/Process Mining/형식 Orchestrator 부재 |
| §27~§28 검증(automation:health/aiworkforce/decision:validate) | **대상 없음** | artisan 없음. `/v424/rules`·`/api/journey`·`action_request` 로 대체 |

---

## 4. 확립된 표준 (신규 자동화 코드가 따를 정본)

- ★★**MEA 060 스코프 분리(D-2)**: **워크플로 엔진(JourneyBuilder)·규칙(RuleEngine)·의사결정(Decisioning)·에이전틱(callClaudeTools)은 실재**하되 **형식 AI Workforce/Process Mining/통합 Orchestrator/Registry 는 부재**(058~061 Registry 부재·어휘 제6항). ★**Orchestrator=디스패처**·별도 자율기업 메타계층 신설 금지·기존 엔진 확장.
- ★**자율 액션 정본 = `RuleEngine`(IF-THEN)+`JourneyBuilder`(워크플로)+`AutoCampaign`/`AutoRecommend`/`Decisioning`(의사결정)**(Part032). 신규 자동화는 이 엔진 확장(중복 금지). ★**거짓 트리거 0**(실데이터 조건).
- ★★**Human-AI Collaboration/HITL 정본 = `agent_mode`+`action_request`**. ★**자율집행=승인정책 존중**(헌법 V4)·**high-value 게이트**(₩5M↑ 무승인 차단·289차)·**고위험 업무 Human Review 없이 자동 실행 금지**·서버측 강제.
- ★**V5 Safety Rule**: 신뢰도/권한/동기화/통계신뢰 부족 시 **자율 집행 금지→경고**. V3 Trust READY 데이터만. AI 권고=근거/신뢰도(V4 Explainable)·근거없는 적용 금지.
- ★**Work Queue = `omni_outbox`**(attempts+backoff·defer·DLQ replay)+cron. AI Task Orchestration=디스패처(cron/큐/규칙). 형식 Orchestrator 신설 금지.
- ★**거버넌스·감사**: 자동화 정책=`CHANGE_GATE`·정책 변경 버전관리·`SecurityAudit`(불변)·테넌트 격리.
- ★★**오흡수 차단**: **`RuleEngine`/`JourneyBuilder`/`Decisioning`≠AI Workforce(디지털 직원)** · **cron 자동화≠Hyperautomation 통합** · **`JourneyBuilder` stats≠Process Mining** · **디스패처≠형식 AI Task Orchestrator**. ★grep 오탐 주의(rpa=`rPass`·bot=LINE URL).
- ★★**Part032/042/054·MEA 060 중복·재판정 금지**: 워크플로=Part032·거버넌스=Part042·에이전트=Part054 정본. 본 Part 는 Autonomous Enterprise/Hyperautomation 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — MEA 060·Part032/042/054 중복 + 메타계층 부재)

1. **형식 AI Workforce(AI employee/supervisor 역할)·Digital Workers·형식 통합 Orchestrator** — 안 함(MEA 060). ★**엔진은 있는데 Registry/메타계층 없음**(어휘 제6항 "아키텍처 형태 선행 종속"). Orchestrator=디스패처. 통합 자율기업 계층=아키텍처 형태 신설.
2. **Process Intelligence/Mining(Celonis)·RPA** — 안 함. `JourneyBuilder` stats(실측)≠마이닝. RPA=부재(★`rpa` grep=i18n `rPass` 오탐).
3. **AI Workforce Analytics·형식 Intelligent Work Queue(AI Scheduling)** — 부분. `ai_call_log`·`omni_outbox`(큐)·cron 이 대응물. Workforce 지표/AI 스케줄링 부분.
4. **Continuous Learning(Feedback Learning)** — 부분. `Mmm`(최적화)·`AbTesting`·`ModelMonitor`. 자체 학습 없음(Part027).
5. **`RuleEngine`/`JourneyBuilder`/cron 을 AI Workforce/Hyperautomation 통합/Process Mining 으로 오흡수 금지** — 자율 액션/워크플로/스케줄 배치이지 형식 자율기업 계층 아님.
6. **artisan `automation:*`/`aiworkforce`/`decision:validate` 명령** — 없음(Slim). `/v424/rules`·`/api/journey`·`action_request` 로 대체.

★**준수하는 실 원칙**: **자율 액션(RuleEngine·거짓 트리거 0)·자율 워크플로(JourneyBuilder)·자율 의사결정(Decisioning/AutoRecommend·근거/신뢰도)·Human-AI(agent_mode/action_request·high-value 게이트)·V5 Safety Rule·V3 Trust READY·work queue(omni_outbox)·거버넌스(CHANGE_GATE/SecurityAudit)·테넌트 격리**. ★**오흡수 차단**: 엔진≠AI Workforce·cron≠Hyperautomation·stats≠Process Mining. ★**Part032/042/054·MEA 060 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. 자율 액션/워크플로=`RuleEngine`/`JourneyBuilder`(Part032) 확장(중복 금지·거짓 트리거 0). 의사결정=`Decisioning`/`AutoRecommend`(근거/신뢰도).
2. ★★Human-AI/HITL=`agent_mode`+`action_request`·high-value 게이트·V5 Safety Rule(부족 시 집행금지). ★고위험 업무 Human Review 없이 자동 실행 금지·자율집행=승인정책 존중.
3. Work Queue=`omni_outbox`(큐·재시도·DLQ)+cron. AI Task Orchestration=디스패처. 형식 Orchestrator/Registry 신설 금지(MEA 060·기존 확장).
4. ★★오흡수 금지: `RuleEngine`/`JourneyBuilder`/`Decisioning`(AI Workforce 아님)·cron(Hyperautomation 통합 아님)·stats(Process Mining 아님). grep 오탐 주의(rpa=rPass·bot=LINE URL).
5. 거버넌스=`CHANGE_GATE`·정책 버전관리·`SecurityAudit`·V3 Trust READY·테넌트 격리.
6. ★★AI Workforce/Digital Workers/Process Mining/RPA/형식 통합 Orchestrator 를 선이식하지 않는다(MEA 060 메타계층 선행 종속). 워크플로/거버넌스/에이전트 판정=Part032/042/054 정본(재판정 금지).

---

## 7. Completion Criteria

- [x] 자동화 스택 **실측**(형식 AI Workforce/Digital Workers/Process Mining/RPA/통합 Orchestrator/Registry 부재·`RuleEngine`·`JourneyBuilder`·`Decisioning`·`agent_mode`·`callClaudeTools`·`omni_outbox`·cron 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 자율기업 **메타계층 부재**(MEA 060·어휘 제6항) 증명·자동화 엔진 실재)
- [x] 실 자동화(RuleEngine+JourneyBuilder+Decisioning+agent_mode+omni_outbox+cron) 성문화(§4)
- [x] ★★MEA 060 스코프 분리(엔진 실재 vs 메타계층 부재·Orchestrator=디스패처)·Human-AI(high-value 게이트)·V5 Safety Rule·★★오흡수 차단(엔진≠AI Workforce·cron≠Hyperautomation·stats≠Process Mining) 명시
- [x] 의도적 미적용 + 사유(§5) — AI Workforce/Digital Workers/Process Mining/RPA/형식 Orchestrator/Continuous Learning(+Part032/042/054·MEA 060 중복)
- [x] Claude Code 규칙(§6) · `RuleEngine`·`JourneyBuilder`·`Decisioning`·`agent_mode`·`omni_outbox` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **MEA 060 승계** — **자동화 엔진(`RuleEngine`·`JourneyBuilder`·
> `Decisioning`·`callClaudeTools`) + Human-AI(`agent_mode`/`action_request`) + work queue(`omni_outbox`) + cron**
> 은 실재하되, **없는 것은 도메인이 아니라 메타계층**(형식 AI Workforce/Process Mining/통합 Orchestrator/
> Registry·어휘 제6항). ★**Orchestrator=디스패처**. ★★**오흡수 차단**: **엔진은 AI Workforce 가 아니고, cron 은
> Hyperautomation 통합이 아니며, `JourneyBuilder` stats 는 Process Mining 이 아니다**. 워크플로/거버넌스/에이전트=
> Part032/042/054 정본(재판정 금지).

---

## 다음 Part

**CCIS Part062 — Enterprise Knowledge Automation, Organizational Intelligence, Collective Memory & Continuous Learning** — ★사전 실측 예고: ★**Part029(검색/RAG)·034(거버넌스)·043(KG)·054(Agent Memory)와 중복** — 형식 조직지능/Collective Memory/Enterprise Memory Graph·Continuous Learning 루프는 **부재/부분**이나, 지식 실체는 **`GeniegoKnowledge`/`GeniegoGlossary`(지식 SSOT)·`gen_chatbot_knowledge.mjs`(자동 지식 생성·라우트 추가 자동 인지)·챗봇 Retriever(어휘)·`graph_node` KG·`NEXT_SESSION`/docs(조직 기억)·MEMORY(세션 기억)**로 부분 실재. Part062 도 실측→Collective Memory/Enterprise Memory Graph/Continuous Learning 부재증명→GeniegoKnowledge+gen_chatbot_knowledge+graph_node 성문화. ★자체 학습 부재(Part027)·"신규=라우트 추가 자동 인지"·Vector 보류(표본 0)·Part029/043 중복 명시.
