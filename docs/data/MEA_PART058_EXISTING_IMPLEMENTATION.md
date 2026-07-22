# MEA Part 058 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 058 SPEC/ADR. ★부재증명 완료·과대주장 금지·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·정직 표기(**도메인별 스택 실재 / 통합 Registry 부재**).
> ★**Part 054(AI Agent/Autonomous Workflow) 판정 상속·재판정 금지**: `JourneyBuilder`(자율 워크플로 엔진 PARTIAL-strong)·`RuleEngine`(규칙 자동화)·`Alerting` action_request(Maker-Checker)·`agent_mode`(권한모드 3단계). **경계 고정 — 054=Agent/Workflow 실행 계층, 058=Decision(의사결정) 계층.**
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★단어경계 `\b` 적용** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, `i18n/**`·`*.json` 제외): `decision_request`/`decision_result`/`decision_rule`/`decision_policy`/`decision_model`/`decision_score`/`decision_context`/`decision_option`/`decision_approval`/`decision_execution`/`decision_exception`/`decision_analytics`/`decision_version`/`decision_audit`/`decision_registry`/`business_rule`/`rule_version`/`rule_simulation`/`rule_conflict`/`rule_deployment`/`what_if`/`multi_criteria`/`mcda`/`scenario_compar`/`route_optim`/`schedule_optim`/`DecisionEngine` = **전부 0**.
② **실 substrate 판독**: `Decisioning`·`AutoRecommend`·**`Mmm`**(optimize·frontier)·**`PriceOpt`**(9테이블)·`RuleEngine`·`AutoCampaign`(+`optimization_log`)·`DemandForecast`·`Onsite`·`AdAdapters`·`ClaudeAI`(053/054 확정)·`Risk`(056 확정)·`frontend/src/pages/PnLDashboard.jsx`(What-if)·054 확정분(`JourneyBuilder`·`Alerting`·`agent_mode`).
③ **동음이의 배제(오흡수 방지)**: **`whatif` 11히트 = `frontend/src/pages/PnLDashboard.jsx`(:538~556) 클라이언트 What-if 슬라이더**(실재하나 **프론트 즉석 계산**·서버 최적화 서비스 아님) · **`autonomous` 1히트 = `frontend/src/pages/AIInsights.jsx`(:599) 마케팅 카피**("Autonomous orchestration…")이지 자율 운영 구현 아님(054 확정과 동일) · `Risk`(사업 리스크·056 확정)≠Decision Risk Assessment · `SystemMetrics`의 optimiz* 히트=플랫폼 관측(057).

## 실존 substrate (★도메인별 의사결정 스택 다수 실재 / 통합 계층 부재)

### A. Decision Engine 요소 (§8)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **Rule Evaluation** | metric/op/threshold→action·실행 로그 | `RuleEngine`(:41~53 rule_engine·rule_engine_log·`evaluateAll`:181·054 확정) | PARTIAL |
| **AI Recommendation** | 채널 효과·학습 prior·**폐루프 학습** | `AutoRecommend`(:114 channel_benchmark·:185 channel_learned_prior·**`learnFromOutcomes`:247**·`channelEffectiveness`:369·`recommend`:506) | PARTIAL-strong |
| AI Recommendation(세그먼트) | 집계 세그먼트별 ROAS/CPA→제안 | `Decisioning::recommendations`(:432·:465~481) | PARTIAL |
| AI Recommendation(LLM) | 전략 추천 5건 JSON | `ClaudeAI`(053 확정·:1710·`campaignRecommend`:1894) | PARTIAL |
| **ROI Evaluation** | ROAS/CPA/이익 산출 | `Decisioning`(:466~470)·`Mmm` | PARTIAL-strong |
| **Priority Ranking** | ROAS 내림차순·상위 N | `Decisioning`(:486~487) | PARTIAL |
| **Decision Execution** | 캠페인 생성/활성·예산·상태 변경 | `AutoCampaign`(:345~350)·`AdAdapters`(054 확정) | PARTIAL-strong |
| Risk Assessment(사업) | 가중합+시그모이드+기여도 | `Risk::predict`(056 확정·:31~60) | PARTIAL |
| Multi-Criteria(암묵) | ROAS+CPA+spend 복합 판단 | `Decisioning`(:466~478) | PARTIAL-weak |

### B. Decision Optimization (§10) ★정량 근거 제공
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **ROI Optimization(★핵심)** | **이익 효율 프론티어·적정 총예산 T\*·PROFIT(T) 곡선** | `Mmm::frontier`(:349~352·:386~391·:437) | PARTIAL-strong |
| 한계이익 최적화(수식) | 한계이익(c,x)=margin_c·(β/κ)·exp(−x/κ)−1 · x\*_c=κ·ln(margin_c·β/κ) · T\*=Σx\*_c | `Mmm`(:281·`profitOptSpend`:337~338) | PARTIAL-strong |
| 예산 배분 최적화 | 채널별 최적 일지출·현행 대비·증액여력 | `Mmm::optimize`(:210)·`frontier`(:386~391) | PARTIAL-strong |
| **정직 미최적화 반환** | 모델/원가 없으면 `optimized:false`+사유 | `Mmm`(:375·:378) | PARTIAL-strong |
| **Cost/Price Optimization** | 탄력성·추천가·시뮬레이션·리프라이서 규칙/이력 | `PriceOpt`(:81 po_elasticity·**:91 po_recommendations**·**:105 po_simulations**·**:121 po_repricer_rules**·**:132 po_repricer_history**·:114 po_competitors·:137 po_calendar) | PARTIAL-strong |
| **What-if Analysis** | 5레버(매출·광고비·원가·배송비·반품비) 즉시 순이익 재계산 | `PnLDashboard.jsx`(:538~556) | PARTIAL(**클라이언트**) |
| Predictive Optimization | Holt-Winters 수요 예측 | `DemandForecast`(051/052 확정) | PARTIAL |
| 변형 선택(탐색·활용) | Thompson sampling | `JourneyBuilder`(054 확정·:1130~1152) | PARTIAL |
| 온사이트 최적화 | CRO | `Onsite` | PARTIAL-weak |

### C. Autonomous Business (§11) ★054 상속·재판정 금지
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Autonomous Workflow | 노드 그래프 실행 엔진 | `JourneyBuilder`(054 확정 PARTIAL-strong) | PARTIAL-strong |
| Event-Based Automation | 트리거 진입·detector | `JourneyBuilder`(054 확정·:297·:341~) | PARTIAL |
| Decision Scheduling | cron 36·daypart | `backend/bin`·`RuleEngine`(:54 daypart_schedule) | PARTIAL |
| **Human Approval Workflow** | 2인 정족수·approved만 집행 | `Alerting`(054/056 확정·:602·:626~632) | PARTIAL |
| **승인 정책(권한모드)** | recommend/approval/auto·기본 approval | `AdAdapters::agentMode`(054 확정·:42~50) | PARTIAL-strong |
| **자율 실행(auto)** | agent_mode=auto 시 사람 클릭 없이 추천→실행 | `AutoCampaign`(:345~350) | PARTIAL |
| **★Exception Handling(정직 보류)** | 킬스위치·결제수단·딜리버리 미충족 시 **활성화 보류+사유 반환** | `AutoCampaign`(:345~350 주석·`$activation`) | PARTIAL-strong |
| Continuous Improvement | 성과→prior 학습 | `AutoRecommend::learnFromOutcomes`(:247) | PARTIAL |
| 빈도/피로도 제어 | frequency_window·frequency_event | `RuleEngine`(:60~66) | PARTIAL |

### D. 실행 이력·감사·보안
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **DECISION_EXECUTION 로그(도메인별)** | `optimization_log`·`rule_engine_log`·`po_repricer_history`·`journey_node_logs` | `AutoCampaign`(:77)·`RuleEngine`(:47)·`PriceOpt`(:132)·(054) | PARTIAL |
| Explainable Decision(공시) | `no_pii`·`derived_from`·집계기반 note | `Decisioning`(056 확정·:477~481) | PARTIAL |
| Immutable Audit | 해시체인 정본 | `SecurityAudit`(056 확정) | PARTIAL |
| Tenant/RBAC | fail-closed·전역 writeGuard | `Risk`(056:15~18)·`index.php`(056:72~75) | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·grep 0)
★**Canonical Entity 15종 전량 형식 부재**: DECISION·DECISION_REQUEST·DECISION_RESULT·DECISION_RULE·DECISION_POLICY·DECISION_MODEL·DECISION_SCORE·DECISION_CONTEXT·DECISION_OPTION·DECISION_APPROVAL·DECISION_EXECUTION·DECISION_EXCEPTION·DECISION_ANALYTICS·DECISION_VERSION·DECISION_AUDIT(★실질 대응은 **도메인별 테이블에 흩어져 있고 공통 엔티티가 없다**).
★★**Enterprise Decision Registry**(§6 "모든 의사결정 자산은 Enterprise Decision Registry를 기준으로 관리" **근간 미충족**)·Enterprise Decision Intelligence Platform·Decision Engine(통합)·**Decision Governance Manager**·**Decision Monitoring Dashboard(통합)**·Decision Audit Service·AI Decision Advisor·Decision Analytics Platform.
★**Business Rule Engine(§9) 대부분**: **Rule Versioning**·**Rule Simulation**·Rule Validation·**Rule Deployment(승격)**·**Rule Conflict Detection**·Rule Optimization·Rule Analytics(★"모든 Rule은 **버전과 변경 이력**을 관리한다" **미충족** — `rule_engine`은 현재값만·이력 없음·`rule_engine_log`는 **실행 로그**이지 변경 이력 아님).
★**Decision Lifecycle(§7) 형식 단계**: **Decision Request·Context Collection(형식)·Alternative Generation(형식)·Decision Evaluation(형식)·Archive**(★"모든 의사결정은 **추적 가능**해야 한다" → **도메인별 로그는 있으나 통합 추적 불가**).
★**Multi-Criteria Analysis(형식)**·**Scenario Comparison(서버)**·형식 Decision Execution 계약.
★**Decision Optimization 미보유 축**: **Resource Optimization**·**Schedule Optimization**·**Route Optimization**(grep 0·물류 경로 최적화 부재).
★**Decision Governance(§12)**: Decision/Approval/Rule/Optimization/Exception/Risk **Policy 객체**·Compliance Validation·Decision 전용 Audit Trail.
★**Security(§13)**: **Decision Data Encryption**·**Policy Protection**(정책 객체 자체가 부재)·"의사결정 데이터는 **승인된 사용자만 접근**"(형식 ACL 부재·현행은 테넌트+RBAC 일반 게이트).
★**Runtime 규칙(§14)**: 형식 Context 수집·형식 Risk Assessment 삽입·**Event 생성**·Decision Audit 기록.
★**API 표준(§15) 8종 전량**(Execute Decision·Evaluate Rule·Optimize Decision·Query Decision Status/Analytics/Policy·Register Decision·Query Decision Audit — ★도메인별 API는 있으나 **Decision 표준 API 없음**)·**Event 표준(§16) 8종 전량**(DecisionRequested/RuleEvaluated/RecommendationGenerated/DecisionApproved/DecisionExecuted/DecisionRejected/DecisionOptimized/DecisionAudited).
★**§17 미보유**: **Scenario Simulation(서버·통합)**·**KPI Impact Analysis(형식)**·**ROI Prediction(형식)**·Responsible Decision Validation·형식 Explainable Decision.
★**성능 SLA(§18)**: Decision Evaluation ≤500ms·Rule Execution ≤100ms·Recommendation ≤2s·Decision API ≤300ms·**99.99% 가용성**=측정 장치 부재(★057 규율: **"미달"이 아니라 "측정 기반 부재"**·단일호스트 044/045/050 승계).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ **의사결정 로직이 7개 이상 핸들러에 분산**되어 있고(`Decisioning`·`AutoRecommend`·`Mmm`·`PriceOpt`·`RuleEngine`·`AutoCampaign`·`JourneyBuilder`) **각자 자기 추천·자기 규칙·자기 실행 로그를 가진다** — 이는 **설계 사안**(§D-1)이지 결함 주장이 아니다. ⓑ `action_request` 생산자 부재=**287/288차 확정 보류분**(상태 기술만). ⓒ `AutoCampaign` auto 모드 자율 활성화(:345~350)는 **279차 사용자 요구 반영분**이며 킬스위치·결제수단·딜리버리 게이트 종속(054 확정).

## 판정
**PARTIAL (도메인별 의사결정·최적화 스택이 다수 실재 / ★통합 Decision Registry·Engine·Rule 거버넌스 = ABSENT).**
★**실재(정직 인정·평가절하 금지)**: 본 Part는 AI 시리즈에서 **054 다음으로 실재도가 높다**. ① **ROI 최적화가 수식 수준으로 실동작** — `Mmm::frontier`(:349~352)가 **한계이익 수식**(:281 margin_c·(β/κ)·exp(−x/κ)−1 · x\*_c=κ·ln(margin_c·β/κ) · T\*=Σx\*_c)으로 **적정 총예산 T\*와 PROFIT(T) 곡선**을 산출하고, 모델/원가가 없으면 **`optimized:false`+사유를 정직 반환**(:375·:378) → 명세 §10 "최적화 결과는 **정량적 근거를 제공**해야 한다" **충족** ② **가격 결정 스택 완비** — `PriceOpt` 9테이블(탄력성·**추천**:91·**시뮬레이션**:105·**리프라이서 규칙**:121·**실행 이력**:132·경쟁사·캘린더) ③ **폐루프 학습 추천** — `AutoRecommend`(벤치마크:114·**학습 prior**:185·**`learnFromOutcomes`**:247) ④ **What-if 5레버 즉시 재계산**(`PnLDashboard.jsx`:538~556·**클라이언트**) ⑤ **자율 실행 + 정직 보류** — `AutoCampaign`(:345~350 auto 모드 자율 활성화·킬스위치/결제수단/딜리버리 미충족 시 **보류+사유 반환**) ⑥ **승인 정책**(`agent_mode` 기본 approval·2인 정족수·054/056 확정) ⑦ 규칙 평가·빈도 제어·daypart(`RuleEngine`:41~66) ⑧ 도메인별 실행 로그(`optimization_log`:77·`rule_engine_log`:47·`po_repricer_history`:132).
★**부재(grep 0·부재증명 완료·축소 금지)**: **Canonical Entity 15종 형식 전량**·**Enterprise Decision Registry**·통합 Decision Engine/Analytics/Governance Manager/Monitoring Dashboard/Advisor·**Rule Versioning·Simulation·Conflict Detection·Deployment**·Multi-Criteria Analysis(형식)·**Resource/Schedule/Route Optimization**·Decision Policy 6종·Decision Data Encryption·형식 ACL·**API 8종·Event 8종**·성능 SLA.
★★**핵심 구조 문제(정직 기술)**: **의사결정 로직이 7개 이상 핸들러에 분산**(`Decisioning`·`AutoRecommend`·`Mmm`·`PriceOpt`·`RuleEngine`·`AutoCampaign`·`JourneyBuilder`)되어 **각자 자기 추천·자기 규칙·자기 실행 로그**를 가진다. 따라서 §6 "모든 의사결정 자산은 **Enterprise Decision Registry** 기준"·§7 "모든 의사결정은 **추적 가능**"은 **미충족**이다 — 개별 결정은 남지만 **"이 테넌트에서 오늘 어떤 의사결정이 몇 건 났고 무엇이 승인/거부됐는가"를 답할 단일 지점이 없다**.
★**오흡수 금지**: **`whatif` 11히트=`PnLDashboard.jsx`(:538~556) 클라이언트 슬라이더**(실재하나 **서버 Decision Optimization 서비스 아님**) · **`autonomous` 1히트=`AIInsights.jsx`(:599) 마케팅 카피**("Autonomous orchestration…")≠자율 운영 구현 · `RuleEngine`(metric/op/threshold 임계값)≠**Business Rule Engine**(버전·시뮬레이션·충돌탐지) · `rule_engine_log`(**실행** 로그)≠Rule **변경 이력** · `Decisioning`(v418.1 **광고 세그먼트 추천**)≠Enterprise Decision Intelligence 플랫폼 · `AutoCampaign`(**캠페인** 자동화)≠Autonomous **Business** · `Mmm::frontier`(**마케팅 예산** 최적화)≠범용 Decision Optimization · `JourneyBuilder`(**마케팅 여정**·054 소관)≠비즈니스 의사결정 엔진 · `Risk`(**사업** 리스크·056 확정)≠Decision Risk Assessment · `po_simulations`(**가격** 시뮬레이션)≠통합 Scenario Simulation. 코드 변경 0.
