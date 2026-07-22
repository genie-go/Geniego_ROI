# MEA Part 058 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = Decision Intelligence 계층 신설이 기존 **추천**(`AutoRecommend`·`Decisioning`·`ClaudeAI`)·**최적화**(`Mmm`·`PriceOpt`·`DemandForecast`·`Onsite`)·**규칙**(`RuleEngine`)·**자율 실행**(`AutoCampaign`·`AdAdapters`·`JourneyBuilder`)·**승인**(`Alerting`·`agent_mode`)·**감사**(`SecurityAudit`)와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4 단일 Intelligence Layer·**중복 인텔리전스 금지**. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 054 판정 상속·재판정 금지**·**경계 고정: 054=Agent/Workflow 실행 계층, 058=Decision 계층**(056 cross-cutting 규율 승계).

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| **Autonomous Workflow·Agent·Tool·Maker-Checker** | ★**MEA Part 054**(`JourneyBuilder`·`agenticAsk`·`Alerting`·`agent_mode`) | ★**재정의 금지·재판정 금지**(§11 대부분이 054 소관) |
| AI 자산·모델·통계 예측 | ★MEA Part 051/052(`Mmm`·`DemandForecast`·`Risk`·`ModelMonitor`) | ★재정의 금지·재사용 |
| LLM 추천·프롬프트 | ★MEA Part 053(`ClaudeAI`) | ★재정의 금지·재사용 |
| Knowledge/RAG 근거 | ★MEA Part 055 | ★재정의 금지 |
| **AI Governance·승인·감사·Trust** | ★MEA Part 056(`SecurityAudit`·`action_request`·헌법 규범) | ★재정의 금지(Decision Governance는 그 위에) |
| AI 관측·메트릭·로그 | ★MEA Part 057(`SystemMetrics`·SIEM) | ★재정의 금지(Decision Monitoring은 그 위에) |
| **단일 Intelligence Layer(중복 엔진 금지)** | ★헌법 Volume 4 | ★재정의 금지 |
| **안전 자동화·승인정책·Safety Rule** | ★헌법 Volume 5·`CHANGE_GATE` | ★재정의 금지·재사용 |
| 데이터 신뢰(READY만 AI 사용) | ★데이터 헌법 V3 | ★재정의 금지·재사용 |
| 테넌트·RBAC·암호화 | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 추천/최적화/규칙 엔진 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Recommendation Engine | 채널 효과·학습 prior·폐루프 | `AutoRecommend`(:114·:185·:247·:369·:506) | ★재사용·승격(**중복 추천 엔진 절대 금지**) |
| Recommendation(세그먼트) | 집계 세그먼트 제안 | `Decisioning`(:432·:465~481) | ★재사용 |
| Recommendation(LLM) | 전략 추천 JSON | `ClaudeAI`(053·:1710·:1894) | ★재사용 |
| **ROI/Budget Optimization** | 프론티어·T\*·이익곡선·한계이익 수식 | `Mmm::frontier`(:349~352·:281·:337~338·:386~391) | ★**재사용·정본**(중복 최적화기 금지) |
| Cost/Price Optimization | 탄력성·추천·시뮬레이션·리프라이서 | `PriceOpt`(:81·:91·:105·:121·:132) | ★재사용(중복 가격 엔진 금지) |
| **What-if Analysis** | 5레버 클라이언트 슬라이더 | `PnLDashboard.jsx`(:538~556) | ★재사용·★**오흡수 금지**(**클라이언트 즉석 계산≠서버 최적화 서비스**) |
| Scenario Simulation | 가격 시뮬레이션 | `PriceOpt`(:105 po_simulations) | ★재사용·★오흡수 금지(가격 도메인 한정) |
| Predictive Optimization | Holt-Winters | `DemandForecast`(051/052) | ★재사용 |
| **Business Rule Engine** | metric/op/threshold 임계값 | `RuleEngine`(:41~53·`evaluateAll`:181) | ★재사용·★**오흡수 금지**(임계값≠버전·시뮬레이션·충돌탐지 갖춘 BRE) |
| Rule 변경 이력 | `rule_engine_log` | `RuleEngine`(:47) | ★**오흡수 금지**(**실행** 로그≠**변경** 이력) |
| Decision Execution | 캠페인 생성/활성·예산 | `AutoCampaign`(:345~350)·`AdAdapters`(054) | ★재사용(중복 액추에이터 금지) |
| **Exception Handling** | 게이트 미충족 시 보류+사유 | `AutoCampaign`(:345~350) | ★**재사용(정직 보류=후퇴 금지 자산)** |
| Autonomous Workflow | 노드 그래프 엔진 | `JourneyBuilder`(054 정본) | ★재사용(**중복 워크플로 엔진 절대 금지**) |
| Human Approval Workflow | 2인 정족수 | `Alerting`(054/056·:602·:626~632) | ★재사용(중복 승인 경로 금지) |
| Approval Policy | agent_mode 3모드 | `AdAdapters`(054·:42~50) | ★재사용(중복 모드 저장 금지) |
| DECISION_EXECUTION 로그 | `optimization_log`·`rule_engine_log`·`po_repricer_history`·`journey_node_logs` | `AutoCampaign`(:77)·`RuleEngine`(:47)·`PriceOpt`(:132)·(054) | ★재사용·★**통합 시 파괴 금지** |
| Explainable Decision | `no_pii`·`derived_from` 공시 | `Decisioning`(056·:477~481) | ★재사용·★오흡수 금지(정적 공시≠설명 엔진) |
| Decision Risk | 사업 리스크 모델 | `Risk`(056 확정) | ★오흡수 금지(사업 리스크≠의사결정 리스크) |
| Autonomous Business | 마케팅 카피 | `AIInsights.jsx`(:599) | ★**오흡수 금지**("Autonomous orchestration…"=**문구**·구현 0) |
| Decision Audit | 해시체인 정본 | `SecurityAudit`(056) | ★재사용(체인 정본 하나) |

## ★★핵심 중복 위험 — "이미 7개로 파편화되어 있다"
의사결정 로직이 **7개 이상 핸들러에 분산**되어 있고 **각자 자기 추천·자기 규칙·자기 실행 로그**를 가진다:
`Decisioning`(세그먼트 추천) · `AutoRecommend`(채널 추천·학습) · `Mmm`(예산 최적화) · `PriceOpt`(가격 결정) · `RuleEngine`(임계 규칙) · `AutoCampaign`(자율 실행+`optimization_log`) · `JourneyBuilder`(여정 결정·054 소관).
★따라서 본 Part의 위험은 "중복 신설"보다 **"8번째 엔진을 만드는 것"**이다. **Decision Platform은 새 결정 로직이 아니라 기존 7개 위의 얇은 통합 계층(Registry+표준 계약)**이어야 한다(헌법 V4 단일 Intelligence Layer).

## ★★신설 시 발생할 내부 중복 — 사전 차단
1. **추천 엔진 이원화 금지**: DECISION_OPTION 생성은 `AutoRecommend`/`Decisioning`/`Mmm`/`PriceOpt` **호출**로 해결. 새 추천 로직 금지.
2. **최적화기 이원화 금지**: ROI=`Mmm::frontier`, 가격=`PriceOpt`, 수요=`DemandForecast`가 정본. 통합 Optimizer는 **디스패처**여야 한다.
3. **규칙 엔진 이원화 금지**: `RuleEngine` 확장(★단 **Versioning·Simulation·Conflict Detection은 순신설**이며 이는 중복이 아니라 **결여 보강**).
4. **승인 경로 이원화 금지**: `action_request`+`agent_mode` 재사용(054/056 D-5 동일 결정).
5. **실행 로그 5원화 금지**: 기존 4종(`optimization_log`·`rule_engine_log`·`po_repricer_history`·`journey_node_logs`)을 **파괴하지 말고** DECISION_EXECUTION **뷰/참조로 통합**(원본 테이블 유지=무회귀).
6. **감사 체인 이원화 금지**: `SecurityAudit` 정본 하나(056 D-3·057 D-4 — ★고빈도 결정 로그는 체인에 넣지 말고 앵커링).

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. 추천·최적화·규칙·자율실행·승인 substrate가 **전부 실재하고 이미 파편화** → **8번째 엔진 신설 절대 금지·통합 계약만**. 헌법 V4 "중복 인텔리전스 금지".
- ★[[feedback_minimize_new_menus]]: Decision Monitoring Dashboard는 신규 사이드바가 아니라 **기존 AI/분석 메뉴**(`AIInsights`·`AIRecommendTab`·`AIRuleEngine`·`PnLDashboard`) 편입 우선.
- ★★[[feedback_no_regression_value_unification]]: **`agent_mode` 기본 approval·킬스위치 종속 auto·`AutoCampaign` 정직 보류(결제수단/딜리버리 미충족 시 사유 반환)·2인 정족수·`Mmm` `optimized:false` 정직 반환**은 약화 시 즉시 회귀. **후퇴 금지 자산.**
- ★★[[feedback_real_value_autoderive]]: **DECISION_SCORE·Decision Analytics는 실 로그 파생만**(`optimization_log`·`rule_engine_log`·`po_repricer_history`·`journey_node_logs`·`ai_usage_quota`). ★`Mmm::frontier`가 **모델·원가 없으면 `optimized:false`+사유**를 반환하는 패턴(:375·:378)이 **본 저장소의 모범**이며 신규 결정 지표도 **측정 불가 시 0이 아니라 명시적 미산출**로 반환할 것(057 D-2 규율 승계).
- ★[[feedback_competitive_gap_verify]]: Decision Registry·Rule Versioning/Simulation/Conflict·Multi-Criteria·Event 8종 부재=grep 0 부재증명 완료. **동시에 ROI 프론티어·가격 스택·폐루프 학습·What-if·정직 보류는 실재분으로 인정**(뭉뚱그린 감점 금지).
- ★[[feedback_audit_reference_past_fixes]]: `action_request` 생산자 부재(287/288차)·`AutoCampaign` auto 모드(279차 사용자 요구)=**확정분** — 상태 기술만·재플래그 금지.
- ★[[reference_platform_growth_actas_tenant_hijack]]: 의사결정 데이터는 **테넌트 격리 절대**(타 테넌트 예산·가격·마진이 노출되면 영업 기밀 유출).
- ★[[reference_api_prefix_routing]]·053 D-5·057 D-7: 신규 Decision API는 `/api` 접두 동시 등재 + **인증 필수 접두**(공개 bypass 배치 시 **경영 의사결정 무인증 노출**).
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI는 승인 정책 없이 중요 경영 의사결정을 자동 확정하거나 기업 정책을 변경 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: Recommendation=`AutoRecommend`/`Decisioning`/`ClaudeAI` · ROI Optimization=**`Mmm::frontier` 정본** · Price=`PriceOpt` · 수요=`DemandForecast` · Rule Evaluation=`RuleEngine` · 자율 실행=`AutoCampaign`/`AdAdapters` · Workflow=`JourneyBuilder`(054) · 승인=`Alerting`+`agent_mode` · What-if=`PnLDashboard` 로직 **서버 승격** · 실행 로그 4종=DECISION_EXECUTION 뷰로 통합(원본 유지) · 감사=`SecurityAudit` · 관측=`SystemMetrics`(057) · 테넌트/RBAC=`Db`/`index.php`.
- **순신설(부재·grep 0)**: ★**Enterprise Decision Registry**(§6 근간)·Canonical Entity 15종 표준 계약·통합 Decision Engine(**디스패처**)·**Rule Versioning·Rule Simulation·Rule Conflict Detection·Rule Deployment**·Multi-Criteria Analysis(형식)·**Resource/Schedule/Route Optimization**·Decision Policy 6종·Compliance Validation·Decision Analytics Platform·Decision Monitoring Dashboard(통합)·Decision Audit Service·AI Decision Advisor·Decision Data Encryption·형식 ACL·**API 8종·Event 8종**.

## 판정
**중복 위험 最高(추천·최적화·규칙·자율실행·승인 substrate가 전부 실재하며 ★이미 7개로 파편화) + ★신설 시 발생할 내부 중복 6종 사전 차단.** ★핵심=`AutoRecommend`(폐루프 추천)·`Decisioning`(세그먼트)·**`Mmm::frontier`(ROI 최적화 정본·T\*·이익곡선)**·`PriceOpt`(가격 9테이블)·`DemandForecast`·`RuleEngine`(임계 규칙)·`AutoCampaign`(자율 실행+정직 보류+`optimization_log`)·`AdAdapters`(액추에이터·agent_mode)·`JourneyBuilder`/`Alerting`(054 정본)·`ClaudeAI`(053)·`SecurityAudit`(056)·`SystemMetrics`(057)·`Crypto`/`index.php`는 **재사용/승격**(★**8번째 결정 엔진 신설 절대 금지**=헌법 V4·정본 재구현 금지). 헌법 V4/V5·데이터 헌법 V3·Part 042/044/046/047/048/049/**051~057**·EPIC 06-A **재정의 금지·재판정 금지**. 본 Part 고유 순신설=★**Enterprise Decision Registry**·Canonical Entity 15종 표준 계약·통합 Decision Engine(디스패처)·**Rule Versioning/Simulation/Conflict Detection/Deployment**·Multi-Criteria(형식)·Resource/Schedule/Route Optimization·Decision Policy 6종·Analytics/Dashboard/Advisor·**API 8종·Event 8종**뿐(부재·grep 0·부재증명 완료). ★★**본 Part의 성격**=**"결정 엔진이 없다"가 아니라 "결정 엔진이 7개인데 통합 Registry가 없다"** — Decision Platform은 **새 결정 로직이 아니라 기존 7개 위의 얇은 통합 계층(Registry+표준 계약+뷰)**이어야 한다. ★오흡수 금지(**`whatif` 11히트=`PnLDashboard.jsx` 클라이언트 슬라이더≠서버 최적화 서비스** · **`autonomous` 1히트=`AIInsights.jsx`:599 마케팅 카피≠구현** · `RuleEngine` 임계값≠Business Rule Engine(버전·시뮬레이션·충돌탐지) · **`rule_engine_log`(실행 로그)≠Rule 변경 이력** · `Decisioning`(광고 세그먼트)≠Decision Intelligence 플랫폼 · `AutoCampaign`(캠페인 자동화)≠Autonomous Business · `Mmm::frontier`(마케팅 예산)≠범용 Decision Optimization · `JourneyBuilder`(마케팅 여정·054 소관)≠비즈니스 의사결정 엔진 · `Risk`(사업 리스크·056)≠Decision Risk Assessment · `po_simulations`(가격)≠통합 Scenario Simulation). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★승인 정책 없는 중요 경영 의사결정 자동 확정·기업 정책 변경 불가(V5+CHANGE_GATE).
