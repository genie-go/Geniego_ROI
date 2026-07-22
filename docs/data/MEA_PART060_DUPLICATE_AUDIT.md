# MEA Part 060 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = Hyperautomation 계층 신설이 기존 **워크플로**(`JourneyBuilder`·054 정본)·**규칙**(`RuleEngine`)·**스케줄**(cron 36)·**승인**(`Alerting`·`agent_mode`)·**액추에이터**(`AdAdapters`)·**의사결정 7엔진**(058)·**PM 프로젝트 관리**(`PM/*`)와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4 단일 Intelligence Layer. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 054·058 판정 상속·재판정 금지**·**경계 고정: 054=Agent/Workflow 실행, 058=의사결정, 059=모사, 060=전사 프로세스 자동화**.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| **Autonomous Workflow·Agent·Maker-Checker** | ★**MEA Part 054**(`JourneyBuilder` 정본·`agent_mode`·`Alerting`) | ★**재정의 금지·재판정 금지**(§8·§9 대부분이 054 소관) |
| **의사결정·추천·최적화·규칙** | ★**MEA Part 058**(`RuleEngine`·`AutoRecommend`·`Mmm`·`PriceOpt`·`AutoCampaign`) | ★**재정의 금지·재판정 금지** |
| 시뮬레이션·What-if | ★MEA Part 059(`PriceOpt`·`po_simulations`) | ★재정의 금지 |
| AI 관측·메트릭 | ★MEA Part 057(`SystemMetrics` 정본) | ★재정의 금지(Automation Monitoring은 그 위에) |
| AI Governance·감사 | ★MEA Part 056(`SecurityAudit` 정본·`action_request`) | ★재정의 금지(Automation Governance는 그 위에) |
| **승인 워크플로 거버넌스** | ★EPIC 06-A(Role/Permission/Delegation·**BPM 엔진 부재 확정**) | ★재정의 금지·**판정 승계** |
| 비인간 identity | ★EPIC 06-A Part3-6(**`api_key`가 유일**) | ★재정의 금지(Bot 계정은 그 위에) |
| 가용성·SLA | ★MEA Part 044/045/050 | ★재정의 금지(99.99% 미보증 승계) |
| 테넌트·RBAC·암호화 | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| **AUTOMATION_WORKFLOW** | `journeys` 노드 그래프 | `JourneyBuilder`(:35·054 정본) | ★재사용(**중복 워크플로 엔진 절대 금지**) |
| **PROCESS_INSTANCE** | `journey_enrollments` | `JourneyBuilder`(:42) | ★재사용·승격 |
| AUTOMATION_DECISION | `journey_decision_arm`/`_log` | `JourneyBuilder`(:54·:60) | ★재사용 |
| 실행 로그 | `journey_node_logs` | `JourneyBuilder`(:48) | ★재사용(★058 D-1 로그 통합과 정합) |
| **AUTOMATION_RULE** | `rule_engine`(metric/op/threshold) | `RuleEngine`(058 확정) | ★재사용·★오흡수 금지(임계값≠정책 객체·**버전 부재**) |
| **AUTOMATION_JOB** | cron 36 파일 | `backend/bin` | ★재사용·★**오흡수 금지**(배치 스케줄≠Hyperautomation) |
| Human Approval | 2인 정족수·agent_mode | `Alerting`·`AdAdapters`(054/056/058) | ★재사용(중복 승인 경로 금지) |
| AI Decision Integration | 추천·최적화 7엔진 | (058 확정) | ★재사용(★**8번째 엔진 금지**·058 D-1) |
| 도메인 자동화 토글 | 반품 자동화 on/off | `ReturnsPortal::toggleAutomation`(:387) | ★재사용·★오흡수 금지(도메인 토글≠Automation Registry) |
| **PROCESS_STEP / 의존성** | `predecessor_id`·`successor_id`·`dep_type`·`lag_days`·**DFS 순환 검출** | `PM/Dependencies.php`(:22~39·:77~79) | ★**재사용 가능(PPM 축)**·★**오흡수 금지**(프로젝트 작업≠비즈니스 프로세스 스텝) |
| Bottleneck Analysis | **CPM 임계경로**(slack=LS−ES·critical=0) | `PM/Gantt.php`(:10·:17~18·:181~183) | ★**오흡수 금지**(프로젝트 임계경로≠Process Mining 병목) |
| 프로젝트 자산 | `pm_portfolio`/`pm_raid`/`pm_time_log`/`pm_baseline` | `PM/Enterprise.php`(:33~53) | ★재사용(PPM)·오흡수 금지 |
| **RPA_BOT** | LINE Messaging API URL | `Line.php`(:24 `api.line.me/v2/bot`) | ★**오흡수 금지**(메시징 API≠Bot) |
| RPA(용어) | i18n 키 `rPass` 우연 일치 | `DataTrustDashboard.jsx`(:197) | ★**완전 오탐·오흡수 금지** |
| Workflow(CI) | GitHub Actions | `tools/ci_watch.sh`(14히트) | ★**오흡수 금지**(CI 워크플로≠BPA) |
| SLA Management | 정산 대사 티켓 SLA·DSAR 법정기한 | `routes.php`(:1980~1982)·`Dsar`(:388) | ★재사용·★오흡수 금지(도메인 SLA≠워크플로 SLA) |
| Automation Monitoring | 플랫폼 메트릭 | `SystemMetrics`(057 정본) | ★재사용(중복 수집기 금지·057 D-1) |
| Automation Audit | 해시체인 | `SecurityAudit`(056 정본) | ★재사용(체인 정본 하나) |
| Bot Credential Vault | `Crypto` AES-256-GCM | (049) | ★재사용(Bot 부재로 미적용) |
| Autonomous Enterprise | 마케팅 카피 | `AIInsights.jsx`(:599·058/059 확정) | ★**오흡수 금지**(문구≠구현) |

## ★★판정 정합 — 상충으로 보이는 두 선행 판정은 스코프가 다르다
- **054**: "`JourneyBuilder`=자율 워크플로 엔진 **PARTIAL-strong**"
- **EPIC 06-A 5-3-1**: "BPMN/Temporal/Camunda/Flowable/Zeebe/StepFunctions grep 0 → **워크플로 엔진 자체가 부재**"
★**본 Part 재확인 결과 둘 다 맞다** — 054는 **마케팅 여정 실행 엔진의 실재**를, EPIC 06-A는 **범용 BPM 엔진의 부재**를 말한다. **양쪽 판정을 모두 유지**하고 **기준 차이를 명시**해 정합시킨다(재판정 아님·056 cross-cutting 규율).

## ★★신설 시 발생할 내부 중복 — 사전 차단
1. **워크플로 엔진 이원화 금지**: BPA 엔진을 새로 만들면 `JourneyBuilder`와 **두 개의 실행 엔진**. **범용 BPM이 필요하면 `JourneyBuilder` 노드 타입 확장**이 1순위 검토 대상이며, 별도 엔진은 **마케팅 여정과의 경계·데이터 이중화 비용을 정량 비교한 뒤**에만.
2. **규칙 엔진 이원화 금지**: `RuleEngine` 확장(★**Versioning·정책 객체는 결여 보강**이지 중복 아님·058 D-3 동일).
3. **스케줄러 이원화 금지**: cron 36 재사용(★단 **배치 스케줄≠Automation Job 오케스트레이션**·형식 Job 계층은 순신설).
4. **승인 경로 이원화 금지**: `action_request`+`agent_mode`(054/056/058 D-5 동일).
5. **관측·감사 이원화 금지**: Monitoring=`SystemMetrics`(057 D-1)·Audit=`SecurityAudit`(056 D-3·**고빈도 실행 로그는 앵커링**).
6. **실행 로그 이원화 금지**: `journey_node_logs`·`rule_engine_log`·`optimization_log`·`po_repricer_history`를 **파괴하지 말고 뷰 통합**(058 D-1 승계).
7. **비인간 identity 이원화 금지**: Bot 계정은 **`api_key` 위에** 얹는다(EPIC 06-A Part3-6 확정·별도 계정 체계 금지).

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. 워크플로·규칙·스케줄·승인·액추에이터·의사결정·PM substrate 실재 → **중복 신설 금지·기존 심화**. 헌법 V4.
- ★[[feedback_minimize_new_menus]]: Automation Monitoring Dashboard는 신규 사이드바가 아니라 **기존 메뉴**(`AIRuleEngine`·`Marketing`·PM 13페이지·`AIInsights`) 편입 우선.
- ★★[[feedback_no_regression_value_unification]]: **agent_mode 기본 approval·킬스위치·2인 정족수·발송 안전게이트·`AutoCampaign` 정직 보류**는 약화 시 즉시 회귀. **BPA 엔진이 이 게이트를 우회하면 명세 §17 + 헌법 V5 동시 위반**(058 D-4 승계).
- ★★[[feedback_real_value_autoderive]]: **Process Intelligence 지표(사이클 타임·병목·자동화 기회)는 실 실행 로그 파생만**(`journey_node_logs`·`rule_engine_log`·cron 결과·`pm_time_log`). ★**산출 불가 시 0/임의값이 아니라 null·명시적 사유**(057~059 **3연속 모범** 승계 — 0은 "정상"으로 오독).
- ★[[feedback_competitive_gap_verify]]: Hyperautomation·RPA·Process Mining·Registry·Event 8종 부재=grep 0 부재증명 완료. **동시에 워크플로 엔티티 대응·규칙·스케줄·승인·PM 의존성/CPM은 실재분으로 인정**(뭉뚱그린 감점 금지).
- ★[[feedback_audit_reference_past_fixes]]: `ReturnsPortal::toggleAutomation` SQL 인젝션=**기수정분**(:13)·상태 기술만·재플래그 금지.
- ★[[reference_platform_growth_actas_tenant_hijack]]: 자동화 데이터는 **테넌트 격리 절대**(프로세스·승인·실행 이력이 교차 노출되면 조직 기밀).
- ★[[reference_api_prefix_routing]]·053 D-5·057 D-7·058 D-6·059 D-6: 신규 Automation API는 `/api` 접두 동시 등재 + **인증 필수 접두**.
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI는 승인 정책 없이 핵심 비즈니스 프로세스를 자동 변경하거나 조직 정책을 임의 수정 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: AUTOMATION_WORKFLOW=`journeys` · **PROCESS_INSTANCE=`journey_enrollments`** · AUTOMATION_DECISION=`journey_decision_*` · AUTOMATION_RULE=`rule_engine`(+Versioning **보강**) · AUTOMATION_JOB=cron 36 · Human Approval=`action_request`+`agent_mode` · AI Decision=058 7엔진 · PROCESS_STEP seed=`PM/Dependencies`(PPM 축·경계 유지) · Bottleneck seed=`PM/Gantt` CPM(경계 유지) · Monitoring=`SystemMetrics`(057) · Audit=`SecurityAudit`(056) · 암호화=`Crypto` · Bot identity=`api_key`(EPIC 06-A) · 테넌트/RBAC=`Db`/`index.php`.
- **순신설(부재·grep 0)**: ★**Enterprise Automation Registry**(§6 근간)·Cognitive Process Engine·Automation Orchestrator(형식)·**RPA Integration 전량**(Bot Management/Scheduling·Desktop/Web/Legacy·**OCR**·Monitoring/Analytics)·**Process Mining·Bottleneck(프로세스)·Cycle Time·Automation Opportunity Detection**·**Intelligent Document Processing**·BUSINESS_PROCESS/PROCESS_STEP(형식)/AUTOMATION_TASK/POLICY/**RPA_BOT**/**AUTOMATION_VERSION**/ANALYTICS/AUDIT·**Process Discovery·Process Modeling(BPMN)**·Parallel Processing(형식)·**SLA Management(워크플로)**·Recovery Automation·Runtime Optimization·**Workflow Encryption·Bot Credential Vault**·**API 8종·Event 8종**·§17 AI 8종.

## 판정
**중복 위험 高(워크플로·규칙·스케줄·승인·액추에이터·의사결정·PM substrate 전부 실재) + ★신설 시 발생할 내부 중복 7종 사전 차단 + ★★상충으로 보이는 선행 판정 2건 정합.** ★핵심=**`JourneyBuilder`(054 워크플로 정본)**·`RuleEngine`/`AutoCampaign`/`AdAdapters`(058)·`Alerting`+`agent_mode`(승인)·cron 36(스케줄)·**`PM/*` 12핸들러+4테이블+13페이지**(PPM 축)·`ReturnsPortal`(도메인 토글)·`SystemMetrics`(057)·`SecurityAudit`(056)·`Crypto`/`index.php`는 **재사용/승격**(★중복 워크플로·규칙·스케줄러·승인·관측·감사·실행로그·Bot identity 신설 절대 금지=헌법 V4). 헌법 V4/V5·데이터 헌법 V3·Part 042/044/046/047/048/049/**051~059**·EPIC 06-A **재정의 금지·재판정 금지**. 본 Part 고유 순신설=★**Enterprise Automation Registry**·Cognitive Process Engine·**RPA 전량**·**Process Mining/Intelligence**·**Intelligent Document Processing**·형식 엔티티 8종·**Process Discovery/Modeling(BPMN)**·Recovery Automation·Runtime Optimization·Workflow Encryption/Bot Vault·**API 8종·Event 8종**뿐. ★★**본 Part의 성격**=**"자동화가 없다"가 아니라 "마케팅 도메인 자동화는 있고 전사 프로세스 자동화(BPA/RPA)는 없다"**. ★오흡수 금지(**`rpa` 1히트=i18n 키 `rPass` 완전 오탐** · **`bot` 1히트=LINE API URL** · **`bottleneck`=CPM 임계경로 범례** · **`workflow` 61=GitHub Actions·라벨** · `automation`/`sla` 대부분=메뉴명·라벨 · **cron 36≠Hyperautomation** · `JourneyBuilder`(마케팅 여정·054)≠Enterprise BPA · **PM 도메인=PPM≠BPA** · **`PM/Gantt` CPM=프로젝트 임계경로≠Process Mining 병목** · `AIInsights.jsx`:599 마케팅 카피≠Autonomous Enterprise · `RuleEngine` 임계값≠Automation Policy 객체 · 챗봇≠RPA_BOT). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★승인 정책 없는 핵심 비즈니스 프로세스 자동 변경·조직 정책 임의 수정 불가(V5+CHANGE_GATE).
