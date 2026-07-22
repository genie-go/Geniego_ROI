# ADR — MEA Part 060 Enterprise Cognitive Enterprise, Hyperautomation & Autonomous Enterprise Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(**단어경계 `\b` + 광의 히트 파일 단위 전수 분류**)·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 054·058 판정 상속·재판정 금지**·**경계 고정: 054=Agent/Workflow 실행, 058=의사결정, 059=모사, 060=전사 프로세스 자동화(BPA·RPA·Process Mining)**.

## Context
MEA Part 060은 모든 비즈니스 프로세스·Agent·Workflow·Decision·RPA·Event 자동화를 통합해 자율형 기업을 구성하려 한다. 전수조사 결과:
① **Hyperautomation·Cognitive·RPA는 단어 자체가 없다** — `hyperautomation`·`rpa_bot`·`process_mining`·`bpmn`·`camunda`·`zeebe`·`flowable`·`cognitive`·`ocr` **전부 0**.
② **그러나 워크플로 자동화 축은 엔티티 수준으로 대응된다** — `journeys`(AUTOMATION_WORKFLOW `JourneyBuilder`:35)·**`journey_enrollments`(PROCESS_INSTANCE:42)**·`journey_node_logs`(:48)·`journey_decision_arm`/`_log`(:54·:60). 여기에 `RuleEngine`(058)·cron 36·2인 정족수+`agent_mode`·058 7엔진·`ReturnsPortal::toggleAutomation`(:387)·236차 Admin Growth Automation(`routes.php`:1324·:2655)이 더해진다.
③ **PPM 축이 별도로 실재** — `PM/Dependencies.php`(작업 의존성 `predecessor_id`/`successor_id`/**`dep_type` FS**/`lag_days`:22~39 + **DFS 순환 검출**:77~79)·`PM/Gantt.php`(**CPM** ES/EF/LS/LF·`slack=LS−ES`·`critical=slack 0`:10·:17~18·:181~183)·`pm_portfolio`/`pm_raid`/`pm_time_log`/`pm_baseline`(`PM/Enterprise.php`:33~53)+핸들러 12종+프론트 13페이지.

## D-1 ★★"자동화가 없다"가 아니라 "마케팅 도메인 자동화는 있고 전사 BPA/RPA는 없다"
**결정**: `JourneyBuilder`는 **마케팅 여정 실행 엔진**이지 범용 비즈니스 프로세스 엔진이 아니고, PM 도메인은 **프로젝트 관리(PPM)**이지 BPA가 아니다. §6 Domain 10종 중 실질 대응은 **Workflow Automation·AI Agent Automation·Event Automation 부분**뿐이며, **Business Process Automation(전사)·RPA·Intelligent Document Processing·Process Mining·Process Intelligence·Autonomous Enterprise·Enterprise Hyperautomation은 전면 부재**다.
★따라서 §10 "RPA Bot은 중앙 관리 체계에서 운영한다"는 **"미구현"이 아니라 "선행 개념 부재로 성립 불가"**로 기술한다(059 D-1 판정 어휘 승계).

## D-2 ★★상충으로 보이는 선행 판정 2건은 스코프가 다르다 — 양쪽 유지
**결정**: **054**는 "`JourneyBuilder`=자율 워크플로 엔진 **PARTIAL-strong**"이라 했고, **EPIC 06-A 5-3-1**은 "BPMN/Temporal/Camunda/Flowable/Zeebe/StepFunctions `backend/src` grep 0 → **워크플로 엔진 자체가 부재**"라 했다.
★**본 Part 재확인 결과 둘 다 맞다** — 054는 **마케팅 여정 실행 엔진의 실재**를, EPIC 06-A는 **범용 BPM 엔진의 부재**를 말한다. **양쪽 판정을 모두 유지**하고 **기준 차이를 명시**해 정합시킨다(**재판정 아님**·056 cross-cutting 규율).
★이 사례는 **cross-cutting Part에서 상충 판정을 만났을 때의 표준 처리법**이다 — 어느 한쪽을 뒤집지 말고 **스코프를 분리해 둘 다 참으로 만든다**.

## D-3 ★Automation Orchestrator는 새 실행 엔진이 아니라 디스패처 (3연속 원칙)
**결정**: 통합 Orchestrator를 **새 워크플로 실행 엔진으로 만들면** `JourneyBuilder`와 **두 개의 실행 엔진**이 되어 값 분산=회귀다(헌법 V4).
★**058 D-1 "8번째 결정 엔진 금지" · 059 D-3 "통합 Simulation Engine=디스패처" · 060 "Orchestrator=디스패처"** — **동일 원칙 3연속**이다.
★**범용 BPM이 필요하면 `JourneyBuilder` 노드 타입 확장이 1순위 검토 대상**이며, 별도 엔진은 **마케팅 여정과의 경계·데이터 이중화 비용을 정량 비교한 뒤**에만 채택한다.
★**실행 로그 이원화 금지**: `journey_node_logs`·`rule_engine_log`·`optimization_log`·`po_repricer_history`를 **파괴하지 말고 뷰 통합**(058 D-1 승계).

## D-4 ★AUTOMATION_VERSION은 중복이 아니라 결여 보강
**결정**: 명세 §7 "모든 자동화 프로세스는 **변경 이력**을 관리한다"는 **미충족**이다 — `journeys`(:35)·`rule_engine`(058) 모두 **현재값 덮어쓰기**이고, `journey_node_logs`(:48)·`rule_engine_log`는 **실행 로그이지 변경 이력이 아니다**(058 §9와 **동일 병리**).
★**append-only 이력 테이블 신설이 정본 경로**이며 기존 테이블은 **현재값 뷰로 유지**한다(무회귀). 이는 **"중복"이 아니라 "결여 보강"**이다(058 D-3 판정 어휘 승계).

## D-5 ★RPA는 오탐 2건을 명시 배제하고 순신설 · Bot identity는 `api_key` 위에
**결정**: RPA 관련 히트는 **전부 오탐**이다 — **`rpa` 1히트 = `DataTrustDashboard.jsx`(:197) i18n 키 `rPass` 우연 일치(완전 오탐)** · **`bot` 1히트 = `Line.php`(:24) LINE Messaging API URL(`https://api.line.me/v2/bot`)** · `ocr` = 0. 챗봇(`ClaudeAI` 053)도 RPA_BOT이 아니다.
★**Bot identity 설계 제약**: Bot 도입 시 **`api_key` 위에 얹는다** — **`api_key`가 유일한 실 비인간 identity**(EPIC 06-A Part3-6 확정)이며 **별도 계정 체계 신설 금지**. §13 "자동화 계정 **최소 권한**"은 EPIC 06-A 권한 상한을 상속하고, Bot 자격은 **`Crypto`(049) AES-256-GCM Vault**로 보관한다(중복 암호화 금지).

## D-6 ★Process Intelligence — PM CPM을 프로세스 병목으로 오흡수 금지 · 지표는 실 로그 파생만
**결정**: **`PM/Gantt.php` CPM**(:10 "N-152-F §5.4 CPM critical-path 계산"·:17~18 `slack=LS−ES`·`critical path: slack==0`·:181~183)은 **프로젝트 임계경로**이지 **프로세스 병목 분석이 아니다**(`PMGanttView.jsx`:130 범례도 "project bottleneck"). `pm_time_log`(:47)도 **프로젝트 공수**이지 프로세스 사이클 타임이 아니다.
★**Process Intelligence 지표는 실 실행 로그 파생만** 허용한다(`journey_node_logs`·`rule_engine_log`·cron 결과·`optimization_log`·`po_repricer_history`·[[feedback_real_value_autoderive]]).
★★**산출 불가 시 0이나 임의값이 아니라 null·명시적 사유** — **057 `SystemMetrics` null · 058 `Mmm` `optimized:false`+사유 · 059 `PriceOpt` null/422+사유 = 3연속 모범** 승계. **0은 "정상"으로 오독되어 병목을 은폐**한다.
★**도메인 SLA를 워크플로 SLA로 흡수 금지**: 정산 대사 티켓 SLA(`routes.php`:1980~1982 upsert/조회/**sweep**)·DSAR 법정기한(`Dsar`:388)은 실재하나 **축이 다르다**(패턴만 참조).

## D-7 ★프로세스 자동 변경 금지는 현행이 구조적으로 충족 — 범위가 넓을수록 게이트를 더 엄격히
**결정**: 명세 §17 말미 "AI는 **승인 정책 없이 핵심 비즈니스 프로세스를 자동 변경**하거나 **조직 정책을 임의로 수정**하지 않는다"는 **현행 설계가 구조적으로 충족**한다: ⓐ**프로세스 정의(`journeys` 캔버스)는 사람이 설계**하며 AI가 자동 변경하지 않는다 ⓑ자율 실행은 **`agent_mode='auto'`+킬스위치+결제수단·딜리버리 게이트** 통과 시에만이고 미충족 시 **정직 보류+사유 반환**(058 확정) ⓒ**기본값은 approval**(fail-safe) ⓓ파괴적 액션은 **제안-only+HITL**(054 D-2) ⓔ**조직 정책이 문서/코드**라 AI가 수정할 대상이 없다(056 D-7).
★**후퇴 금지 자산**. 향후 **Autonomous Scheduling·자동 프로세스 변경**을 도입한다면 **승인 게이트를 반드시 앞에 둔다**([[feedback_deploy_approval_mandatory]]).
★★**Hyperautomation은 자동화 범위를 넓히는 일이므로 게이트를 더 엄격히** 적용한다 — 059 D-7("시뮬레이션은 추정이라 위험이 더 크다")과 같은 논리로, **범위가 넓을수록 무게이트 사고의 파급이 크다**.
★**API 배치**: Automation API는 **전량 인증 필수 접두**(프로세스 정의·승인 이력·실행 로그=**조직 기밀**·053 D-5·057 D-7·058 D-6·059 D-6 교훈)·`/api` 변형 동시 등재([[reference_api_prefix_routing]])·**테넌트 격리 절대**([[reference_platform_growth_actas_tenant_hijack]]).
★**성능(§18)**: Workflow 시작 ≤2s·Event Processing ≤500ms·Task Scheduling ≤1s·API ≤300ms·99.99%는 **측정 장치 부재** → **"미달"이 아니라 "측정 기반 부재"**. 계측은 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지).

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL** — 마케팅 워크플로 자동화 축은 실재(054 정본)하나 **전사 BPA·RPA·Process Mining·Cognitive·Automation Registry는 전면 부재**.
- ★★**Registry 부재 3연속**(058 Decision Registry·059 Twin Registry·060 Automation Registry)=**같은 구조적 병리**이며 처방도 같다(**기존 엔진 위의 얇은 통합 계층**).
- ★중복 금지 재사용: **`JourneyBuilder`(054 워크플로 정본)**·`RuleEngine`/`AutoCampaign`/`AdAdapters`(058)·`Alerting`+`agent_mode`(승인)·cron 36(스케줄)·**`PM/*`**(PPM 축)·`ReturnsPortal`(도메인 토글)·`SystemMetrics`(057 관측 정본)·`SecurityAudit`(056 감사 정본)·`Crypto`(049 Vault)·`api_key`(EPIC 06-A Bot identity)·`index.php`.
- ★순신설: **Enterprise Automation Registry**·Cognitive Process Engine·**RPA 전량**(Bot Management/Scheduling·Desktop/Web/Legacy·**OCR**·Monitoring/Analytics)·**Process Mining·Bottleneck(프로세스)·Cycle Time·Automation Opportunity Detection**·**Intelligent Document Processing**·BUSINESS_PROCESS·**AUTOMATION_VERSION**·형식 PROCESS_STEP/TASK/POLICY/AUDIT·**Process Discovery/Modeling(BPMN)**·Parallel Processing(형식)·**SLA Management(워크플로)**·Recovery Automation·Runtime Optimization·**Workflow Encryption·Bot Credential Vault**·**API 8종·Event 8종**·§17 AI 5종.
- ★오흡수 금지: **`rpa` 1히트=i18n 키 `rPass` 완전 오탐**(`DataTrustDashboard.jsx`:197) · **`bot` 1히트=LINE Messaging API URL**(`Line.php`:24) · **`bottleneck` 2히트=아카이브 i18n 마케팅 문구 + `PMGanttView.jsx`(:130) CPM 임계경로 범례** · **`workflow` 61=`tools/ci_watch.sh` GitHub Actions**·라벨 · `automation` 75·`sla` 80 대부분=**메뉴명·i18n 라벨** · **cron 36≠Hyperautomation** · `JourneyBuilder`(마케팅 여정·054 소관)≠Enterprise BPA · **PM 도메인=PPM≠BPA** · **`PM/Gantt` CPM=프로젝트 임계경로≠Process Mining 병목** · `pm_time_log`=프로젝트 공수≠프로세스 사이클 타임 · **`AIInsights.jsx`:599 "Autonomous orchestration…" 마케팅 카피≠Autonomous Enterprise**(058·059 확정) · `RuleEngine` 임계값≠Automation Policy 객체 · 챗봇≠RPA_BOT · 도메인 SLA≠워크플로 SLA Management.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·승인 정책 없는 핵심 비즈니스 프로세스 자동 변경·조직 정책 임의 수정 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 042/044/046/047/048/049/**051~059**·EPIC 06-A 상속·**재판정 금지**·재감사 금지(`ReturnsPortal` SQL 인젝션 기수정분).
