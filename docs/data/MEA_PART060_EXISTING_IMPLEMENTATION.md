# MEA Part 060 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 060 SPEC/ADR. ★부재증명 완료·과대주장 금지·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·정직 표기(**마케팅 워크플로 실재 / 전사 BPA·RPA 전무**).
> ★**Part 054·058 판정 상속·재판정 금지**(`JourneyBuilder` 자율 워크플로 엔진 PARTIAL-strong·`RuleEngine`·`AutoCampaign`·`agent_mode`·`Alerting`). **경계 고정 — 054=Agent/Workflow 실행, 058=의사결정, 059=모사, 060=전사 프로세스 자동화(BPA·RPA·Process Mining).**
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★단어경계 `\b` 적용** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, `i18n/**`·`*.json` 제외): `automation_workflow`/`business_process`/`process_step`/`automation_task`/`automation_rule`/`automation_policy`/`automation_event`/**`rpa_bot`**/`automation_job`/`process_instance`/`automation_decision`/`automation_metric`/`automation_version`/`automation_analytics`/`automation_audit`/`automation_registry`/**`hyperautomation`**/**`process_mining`**/`cycle_time`/**`bpmn`**/**`camunda`**/`temporal_`/**`zeebe`**/**`flowable`**/`step_functions`/`workflow_designer`/`parallel_process`/**`cognitive`**/**`ocr`** = **전부 0**.
② **광의 히트 파일 단위 전수 분류**: `sla` 80 · `automation` 75 · `workflow` 61 · `bottleneck` 2 · `bot` 1 · `rpa` 1 → 아래 ③.
③ **실 substrate 판독**: `JourneyBuilder`(054 정본·journeys/journey_enrollments/journey_node_logs/journey_decision_arm/journey_decision_log :35~60)·`RuleEngine`(058 확정)·`AutoCampaign`/`AdAdapters`(054/058)·`Alerting`(action_request)·`backend/bin` cron 36·**`backend/src/Handlers/PM/`**(Assignees·Attachments·Audit·Comments·**Dependencies**·Enterprise·Events·**Gantt**·Kpi·Milestones·Projects·Shared + `pm_portfolio`/`pm_raid`/`pm_time_log`/`pm_baseline` `Enterprise.php`:33~53)·프론트 PM 13페이지·`ReturnsPortal::toggleAutomation`(:387)·`Dsar`(:388 `sla_days`)·`routes.php`(:829·:1324·:1980~1982·:2655·:3863).

### ★동음이의 배제(오흡수 방지)
| 히트 | 실체 | 판정 |
|---|---|---|
| **`hyperautomation`·`rpa_bot`·`process_mining`·`bpmn`·`camunda`·`zeebe`·`flowable`·`cognitive`·`ocr` = 0** | **단어 자체가 없음** | ★해당 도메인 **개념 전무**(명확한 부재증명) |
| **`rpa` 1히트** | `DataTrustDashboard.jsx`(:197) **i18n 키 `rPass`** 안의 문자열 우연 일치 | ★**완전 오탐·오흡수 금지** |
| **`bot` 1히트** | `Line.php`(:24) **LINE Messaging API URL** `https://api.line.me/v2/bot` | ★**오흡수 금지**(메시징 API≠RPA_BOT) |
| **`bottleneck` 2히트** | 아카이브 i18n 마케팅 문구 + **`PMGanttView.jsx`(:130) CPM 임계경로 범례**("Critical = Slack 0") | ★**오흡수 금지**(프로젝트 임계경로≠Process Mining Bottleneck) |
| `workflow` 61 | `tools/ci_watch.sh`(14 **GitHub Actions workflow**)·`PremiumLayout.jsx`(6)·아카이브 i18n 패치 다수·가이드 i18n | ★오흡수 금지(CI 워크플로·라벨) |
| `automation` 75 | `routes.php`(4: `ReturnsPortal::toggleAutomation`:829/:3863 · **236차 Admin Growth Automation**:1324/:2655)·`planMenuPolicy.js`(4)·나머지 **메뉴명/가이드 라벨**("마케팅 자동화") | ★부분 실재·나머지 라벨 |
| `sla` 80 | **`/recon/tickets/sla/{upsert,{reason},sweep}`**(`routes.php`:1980~1982·v402:2011~2013·v403:2072~2074)·`Dsar`(:388 `sla_days`)·`inject_orderhub_i18n.cjs`(13 라벨)·가이드 | ★부분 실재(정산 대사·DSAR)·나머지 라벨 |

## 실존 substrate

### A. Intelligent Workflow (§8) — ★054 정본·재판정 금지
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **AUTOMATION_WORKFLOW** | `journeys` 노드 그래프 정의 | `JourneyBuilder`(:35·054 확정) | PARTIAL-strong |
| **PROCESS_INSTANCE** | `journey_enrollments`(인스턴스별 진행) | `JourneyBuilder`(:42) | PARTIAL-strong |
| **AUTOMATION_METRIC/실행로그** | `journey_node_logs` | `JourneyBuilder`(:48) | PARTIAL |
| **AUTOMATION_DECISION** | `journey_decision_arm`·`journey_decision_log`(Thompson) | `JourneyBuilder`(:54·:60) | PARTIAL |
| Workflow Designer | 노드 캔버스(사람이 설계) | `JourneyBuilder`(054 확정) | PARTIAL |
| Dynamic Workflow·Conditional Routing | delay resume·event wait+timeout·condition/split | (054 확정) | PARTIAL-strong |
| Event Trigger | 트리거 진입·detector(churn/segment/abandon) | (054 확정) | PARTIAL |
| Exception Handling | 대기/타임아웃·발송 안전게이트·**정직 보류** | (054 확정)·`AutoCampaign`(058 확정) | PARTIAL-strong |
| Workflow Analytics | 여정/노드 실행 통계 | (054 확정) | PARTIAL |

### B. Hyperautomation Engine (§9) — 부분 실재
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Process Orchestration | 노드 그래프 실행 | `JourneyBuilder`(054) | PARTIAL |
| **AI Decision Integration** | 추천·최적화 7엔진 | (058 확정) | PARTIAL-strong |
| **AUTOMATION_RULE / Rule Definition** | `rule_engine`(metric/op/threshold/action)·`rule_engine_log` | `RuleEngine`(058 확정) | PARTIAL |
| **AUTOMATION_JOB / Task Scheduling** | cron **36 파일**·daypart | `backend/bin`·`RuleEngine`(058) | PARTIAL |
| **Human Approval** | 2인 정족수·approved만 집행·agent_mode 기본 approval | `Alerting`·`AdAdapters`(054/056/058) | PARTIAL-strong |
| Automation Chaining | 노드 체이닝(email/sms/kakao/webhook) | `JourneyBuilder`(054) | PARTIAL |
| 자동화 토글(도메인) | 반품 자동화 on/off | `ReturnsPortal::toggleAutomation`(:387)·`routes.php`(:829·:3863) | PARTIAL-weak |
| 자체 마케팅 자동화 | 236차 Admin Growth Automation | `routes.php`(:1324·:2655)·`AdminGrowth` | PARTIAL |

### C. Process/Task 모델링 — ★프로젝트 관리(PPM) 축·BPA 아님
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **작업 의존성 그래프** | `predecessor_id`·`successor_id`·**`dep_type`(FS)**·`lag_days` + **DFS 순환 검출** | `PM/Dependencies.php`(:22~24·:39·:77~79) | PARTIAL(**PPM 축**) |
| **임계경로(CPM)** | ES/EF/LS/LF·**slack=LS−ES**·**critical path=slack 0** | `PM/Gantt.php`(:10·:17~18·:52·:181~183)·`PMGanttView.jsx`(:130) | PARTIAL(**PPM 축**) |
| 프로젝트/작업 자산 | `pm_portfolio`·`pm_raid`·`pm_time_log`·`pm_baseline` + 핸들러 12종 | `PM/Enterprise.php`(:33~53)·`backend/src/Handlers/PM/` | PARTIAL(**PPM 축**) |
| PM 이벤트·감사 | `PM/Events.php`·`PM/Audit.php` | `backend/src/Handlers/PM/` | PARTIAL-weak |
| PM 대시보드 13종 | Gantt·EVM·Milestones·Portfolio·RAID·Resources·TaskBoard/Table 등 | `frontend/src/pages/PM*.jsx` | PARTIAL |

### D. SLA·보안 (상속)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| SLA(정산 대사 티켓) | upsert·조회·**sweep** | `routes.php`(:1980~1982·:2011~2013·:2072~2074) | PARTIAL |
| SLA(DSAR 법정기한) | `sla_days` | `Dsar`(:388) | PARTIAL-weak |
| SLA(알림/공급망) | (046 확정) | — | PARTIAL |
| Tenant/RBAC·감사·암호화 | fail-closed·전역 writeGuard·해시체인·`Crypto` | (056 확정) | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·grep 0)
★★**Hyperautomation·Cognitive·RPA 전 계층 부재**(단어 자체 0): **Enterprise Hyperautomation Platform**·**Cognitive Process Engine**·Automation Orchestrator(형식)·**RPA Integration Platform**·Process Intelligence Service·**Automation Governance Manager**·Automation Monitoring Dashboard·Automation Audit Service·Enterprise Automation Advisor·**Enterprise Automation Registry**(§6 근간).
★**Canonical Entity 형식 부재**: BUSINESS_PROCESS·PROCESS_STEP(형식)·AUTOMATION_TASK·AUTOMATION_POLICY·**RPA_BOT**·**AUTOMATION_VERSION**·AUTOMATION_ANALYTICS·AUTOMATION_AUDIT(전용).
★**§6 Domain 미보유**: **Business Process Automation(전사)**·**Robotic Process Automation**·**Intelligent Document Processing**(OCR 0)·**Process Mining**·Process Intelligence·**Autonomous Enterprise**·Enterprise Hyperautomation.
★**§7 Lifecycle 미보유**: **Process Discovery**·**Process Modeling(BPMN)**·Automation Deployment(형식)·**Retirement·Archive**(★"모든 자동화 프로세스는 **변경 이력**을 관리한다" → **미충족**: `journeys`·`rule_engine` 모두 **현재값 덮어쓰기**·058 §9 확정과 동일 병리).
★**§8 미보유**: 형식 **Parallel Processing**·**SLA Management(워크플로)**.
★**§9 미보유**: **Recovery Automation**·**Runtime Optimization**·형식 Event Processing 엔진.
★**§10 RPA 전량**: Bot Management/Scheduling·**Desktop/Web/Legacy Automation**·**OCR Integration**·Bot Monitoring/Analytics(★`bot` 1히트=LINE API URL·`ocr`=0).
★**§11 Process Intelligence 대부분**: **Process Mining**·**Bottleneck Analysis(프로세스)**·**Cycle Time Analysis**·**Automation Opportunity Detection**(★`PM/Gantt` CPM은 **프로젝트 임계경로**이지 프로세스 병목 분석 아님).
★**§12 Governance**: Automation/Workflow/Bot/Exception/Compliance **Policy 객체**·Security Validation·Automation Audit Trail.
★**§13 Security**: **Workflow Encryption**·**Bot Credential Vault**(★`Crypto`(049) 재사용 가능하나 Bot 자체가 부재)·"자동화 계정 **최소 권한**"(형식 서비스 계정 부재·**`api_key`가 유일 비인간 identity**·EPIC 06-A Part3-6 확정).
★**§14 Runtime**: **Process Validation**·형식 Policy Evaluation·**Event 생성**·형식 Monitoring/Audit.
★**§15 API 8종·§16 Event 8종 전량**(Register Workflow/Bot·Execute Automation·Query Automation Status/Process Analytics/Automation Metrics/Automation Audit / WorkflowRegistered·BotInvoked·ProcessCompleted·ExceptionDetected·AutomationOptimized·AutomationAudited).
★**§17 미보유**: **Process Recommendation**·Workflow Optimization(자동)·**Intelligent Task Routing**·**Process Prediction**·**Automation Opportunity Detection**·**Autonomous Scheduling**·Explainable/Responsible Automation Validation.
★**성능 SLA(§18)**: Workflow 시작 ≤2s·Event Processing ≤500ms·Task Scheduling ≤1s·API ≤300ms·**99.99%**=측정 장치 부재(★057~059 규율: **"미달"이 아니라 "측정 기반 부재"**).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ **판정 정합** — EPIC 06-A 5-3-1이 "**BPMN/Temporal/Camunda/Flowable/Zeebe/StepFunctions grep 0 → 워크플로 엔진 자체가 부재**"라 기술했고 054는 "`JourneyBuilder`=자율 워크플로 엔진 **PARTIAL-strong**"이라 기술했다. **본 Part 재확인 결과 둘 다 맞다** — **스코프가 다르다**(054=**마케팅 여정 실행 엔진 실재** / EPIC 06-A=**범용 BPM 엔진 부재**). 본 Part는 **양쪽을 모두 유지**하고 판정 기준 차이를 명시한다(재판정 아님·§D-1). ⓑ `ReturnsPortal::toggleAutomation`의 SQL 인젝션은 **기수정분**(:13 주석 — prepared statement 전환)·상태 기술만.

## 판정
**PARTIAL (마케팅 워크플로 자동화 축은 실재[054 정본] / ★전사 BPA·RPA·Process Mining·Cognitive·Automation Registry = 전면 ABSENT).**
★**실재(정직 인정·평가절하 금지)**: **워크플로 자동화 축이 엔티티 수준으로 대응된다** — `journeys`(AUTOMATION_WORKFLOW:35)·**`journey_enrollments`(PROCESS_INSTANCE:42)**·`journey_node_logs`(실행 로그:48)·`journey_decision_arm`/`journey_decision_log`(AUTOMATION_DECISION:54·:60)가 실재하고, 054가 확정한 조건분기·대기/타임아웃·트리거 detector·발송 안전게이트·Thompson이 그 위에서 동작한다. 여기에 **규칙 자동화**(`RuleEngine` 058)·**스케줄링**(cron 36·daypart)·**Human Approval**(2인 정족수·`agent_mode` 기본 approval)·**AI Decision Integration**(058 7엔진)·**도메인 자동화 토글**(`ReturnsPortal::toggleAutomation`:387)·**자체 마케팅 자동화**(236차 Admin Growth:1324·:2655)가 더해진다. 또한 **프로젝트 관리(PPM) 축**에 **작업 의존성 그래프**(`PM/Dependencies.php` `predecessor_id`/`successor_id`/**`dep_type` FS**/`lag_days`:22~39 + **DFS 순환 검출**:77~79)와 **CPM 임계경로**(`PM/Gantt.php` ES/EF/LS/LF·**slack=LS−ES**·**critical=slack 0**:10·:17~18·:181~183)가 실동작하며, `pm_portfolio`/`pm_raid`/`pm_time_log`/`pm_baseline`(:33~53)+핸들러 12종+프론트 13페이지가 있다. SLA는 **정산 대사 티켓**(`routes.php`:1980~1982 upsert/조회/**sweep**)·**DSAR 법정기한**(`Dsar`:388)에서 실재한다.
★**부재(grep 0·부재증명 완료·축소 금지)**: ★★**Hyperautomation·Cognitive·RPA는 단어 자체가 없다** — Platform 10종·**Enterprise Automation Registry**(§6 근간)·**RPA 전량**(Bot Management/Scheduling·Desktop/Web/Legacy·**OCR**·Monitoring/Analytics)·**Process Mining·Bottleneck(프로세스)·Cycle Time·Automation Opportunity Detection**·**Intelligent Document Processing**·BUSINESS_PROCESS/PROCESS_STEP(형식)/AUTOMATION_TASK/POLICY/**RPA_BOT**/**VERSION**/ANALYTICS/AUDIT 엔티티·Process Discovery·**Process Modeling(BPMN)**·Recovery Automation·Runtime Optimization·**Workflow Encryption·Bot Credential Vault**·**API 8종·Event 8종**·§17 AI 8종·성능 SLA.
★★**핵심 판별(정직 기술)**: **"자동화가 없다"가 아니라 "마케팅 도메인 자동화는 있고 전사 프로세스 자동화(BPA/RPA)는 없다"**이다. `JourneyBuilder`는 **마케팅 여정 실행 엔진**이지 **범용 비즈니스 프로세스 엔진이 아니며**(EPIC 06-A 5-3-1 확정: BPMN/Camunda/Zeebe/Flowable/Temporal/StepFunctions grep 0), PM 도메인은 **프로젝트 관리(PPM)**이지 BPA가 아니다. §6 Domain 10종 중 실질 대응은 **Workflow Automation·AI Agent Automation·Event Automation 부분**뿐이다.
★**오흡수 금지**: **`rpa` 1히트=`DataTrustDashboard.jsx`(:197) i18n 키 `rPass` 우연 일치=완전 오탐** · **`bot` 1히트=`Line.php`(:24) LINE Messaging API URL≠RPA_BOT** · **`bottleneck` 2히트=아카이브 i18n 마케팅 문구 + `PMGanttView.jsx`(:130) CPM 임계경로 범례≠Process Mining Bottleneck** · **`workflow` 61=`tools/ci_watch.sh` GitHub Actions workflow·라벨** · `automation` 75 대부분=**메뉴명/가이드 라벨** · `sla` 80 대부분=**i18n 라벨** · **cron 36≠Hyperautomation**(배치 스케줄) · `JourneyBuilder`(**마케팅 여정**·054 소관)≠Enterprise BPA · **PM 도메인=프로젝트 관리(PPM)**≠Business Process Automation · **`PM/Gantt` CPM=프로젝트 임계경로**≠프로세스 병목 분석 · **`AIInsights.jsx`:599 "Autonomous orchestration…" 마케팅 카피≠Autonomous Enterprise**(058·059 확정) · `agent_mode` 3모드≠Cognitive Enterprise · `RuleEngine` 임계값≠Automation Rule Engine(버전·정책 객체 부재) · 챗봇≠RPA_BOT. 코드 변경 0.
