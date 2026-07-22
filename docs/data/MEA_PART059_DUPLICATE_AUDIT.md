# MEA Part 059 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 목적 = Digital Twin/Simulation/Scenario 계층 신설이 기존 **가격 시뮬레이션**(`PriceOpt`)·**ROI 곡선**(`Mmm`·058 정본)·**What-if**(`PnLDashboard`)·**예측**(`DemandForecast`·`Risk`)·**운영 상태**(`Wms`·`SupplyChain`·`OrderHub`)·**시각화**(`ChartUtils`·`WmsCctv`)와 **중복 재정의하지 않도록** 경계 확정. ★헌법 V4 단일 Intelligence Layer. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 058 판정 상속·재판정 금지**·**경계 고정: 058=의사결정(무엇을 할까), 059=모사·시뮬레이션(만약 이러면 어떻게 될까)**.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| **의사결정·최적화·추천·규칙** | ★**MEA Part 058**(`Mmm::frontier` ROI 정본·`PriceOpt`·`AutoRecommend`·`RuleEngine`) | ★**재정의 금지·재판정 금지** |
| Agent·Autonomous Workflow | ★MEA Part 054(`JourneyBuilder`·`agent_mode`·`Alerting`) | ★재정의 금지(Workflow Modeling ≠ 마케팅 여정) |
| 통계 예측(Holt-Winters·Markov·MMM) | ★MEA Part 051/052(`DemandForecast`·`Mmm`·`Attribution`) | ★재정의 금지·재사용 |
| **AI 관측·메트릭·대시보드** | ★MEA Part 057(`SystemMetrics`·`Health`) | ★재정의 금지(Twin Monitoring은 그 위에) |
| AI Governance·감사·Trust | ★MEA Part 056(`SecurityAudit`·`action_request`) | ★재정의 금지(Twin Governance는 그 위에) |
| GPU/클러스터/분산컴퓨팅 | ★MEA Part 051(**부재 확정**) | ★재판정 금지(대규모 시뮬레이션=**인프라 선행 종속**) |
| 가용성·SLA | ★MEA Part 044/045/050 | ★재정의 금지(99.99% 미보증 승계) |
| 테넌트·RBAC·암호화 | ★MEA Part 047/048/049 | ★재정의 금지·재사용 |
| 데이터 신뢰(READY만) | ★데이터 헌법 V3 | ★재정의 금지(★**시뮬레이션 입력도 신뢰 검증 통과분만**) |

## ★동음이의(코드베이스) — 재사용 vs 오흡수 (★중복 시뮬레이터 절대 금지)
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| **SIMULATION / What-if Simulation** | 가격 곡선 시뮬레이션 | `PriceOpt::simulate`(:927~948) | ★**재사용·승격**(중복 시뮬레이터 금지) |
| **SIMULATION_RESULT** | `sim_type`+`payload_json`+`result_json` 영속 | `po_simulations`(`PriceOpt`:105~108·:870·:949·:1003) | ★**재사용·정본**(재현성 기반 이미 존재) |
| Financial Simulation | 채널믹스 | `PriceOpt::channelMixSimulate`(:971~1003)·`channelMixResults`(:1011) | ★재사용 |
| **경쟁반응 Simulation** | 게임이론 크로스마켓(260차) | `PriceOpt::gameTheorySim`(:797~809) | ★재사용(중복 경쟁모델 금지) |
| ROI Simulation | PROFIT(T) 곡선·T\* | `Mmm::frontier`(058 정본) | ★**재사용**(★058 정본·재정의 금지) |
| What-if(순이익) | 5레버 클라이언트 슬라이더 | `PnLDashboard.jsx`(058·:538~556) | ★재사용·★오흡수 금지(클라이언트≠Simulation Engine) |
| Predictive Forecast | Holt-Winters | `DemandForecast`(051/052/058) | ★재사용 |
| Risk Simulation | 사업 리스크 확률 | `Risk`(056 확정) | ★오흡수 금지(**리스크 예측≠Risk Simulation**) |
| **DIGITAL_TWIN / TWIN_OBJECT** | **없음**(`twin` 단어경계 0) | (grep 0) | ★**순신설**(오흡수할 대상조차 없음) |
| Warehouse Twin | 창고 운영 8테이블 | `Wms`(:59~105) | ★**오흡수 금지**(운영 상태≠Twin 모사체)·모델링 seed로만 |
| Supply Chain Twin | sc_lines(leadTime·risk·delayRate)·sc_stages·sc_risk_rules | `SupplyChain`(:46~84·:188~189) | ★재사용(파라미터 seed)·★오흡수 금지(입력값≠Twin) |
| Asset Twin | CCTV 비디오월(274차) | `WmsCctv` | ★**오흡수 금지**(실시간 영상≠Asset Twin·054 `agent_version` 배제와 동일 계열) |
| Workflow Modeling | 마케팅 여정 캔버스 | `JourneyBuilder`(054 소관) | ★**오흡수 금지**(마케팅 여정≠비즈니스 프로세스 Twin) |
| Twin Visualization | 일반 차트 유틸 | `ChartUtils.jsx`·`ReportBuilder.jsx` | ★재사용·★오흡수 금지(차트≠Twin View) |
| **Scenario(테스트)** | E2E 쓰기 플로우 시나리오 | `tools/e2e/scenarios.mjs`(266차·11히트) | ★**오흡수 금지**(테스트≠비즈니스 시나리오) |
| Scenario/Simulation(라벨) | i18n 사전 | `frontend/src/pages/poI18n.js`(28히트) | ★오흡수 금지 |
| Simulation(데모 문구) | "Demo Mode: UI simulation only" | `WmsManager.jsx`(:469·:2366) | ★**오흡수 금지**(데모 표시≠엔진) |
| Prediction | risk predict·LLM·**A/B 실험** | `routes.php`·`ClaudeAI`·`AbTesting` | ★오흡수 금지(A/B 실험≠Predictive Simulation) |
| Twin Monitoring | 플랫폼 메트릭 | `SystemMetrics`(057 정본) | ★재사용(중복 수집기 금지·057 D-1) |
| Twin Audit | 해시체인 정본 | `SecurityAudit`(056) | ★재사용(체인 정본 하나) |
| Twin 암호화 | `Crypto` AES-256-GCM | (049) | ★재사용 |

## ★★신설 시 발생할 내부 중복 — 사전 차단
1. **시뮬레이터 이원화 금지**: 가격=`PriceOpt::simulate`, 채널믹스=`channelMixSimulate`, 경쟁=`gameTheorySim`, ROI 곡선=`Mmm::frontier`(058 정본), 수요=`DemandForecast`가 **각 도메인 정본**. 통합 Simulation Engine은 **디스패처+표준 계약**이어야 한다(★058 D-1 "8번째 엔진 금지"와 동일 병리).
2. **SIMULATION_RESULT 테이블 이원화 금지**: **`po_simulations`(`sim_type`+`payload_json`+`result_json`)가 이미 재현성 기반**이다. 새 결과 테이블 신설 대신 **`sim_type` 확장 + 표준 스키마 승격**(원본 유지=무회귀).
3. **시각화 이원화 금지**: Twin View는 `ChartUtils.jsx` 기반 확장. 별도 차트 스택 도입 금지.
4. **관측 이원화 금지**: Twin Monitoring Dashboard는 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지).
5. **감사 이원화 금지**: TWIN_AUDIT은 **`SecurityAudit` 확장**이되 **고빈도 동기화 로그는 체인 직접 유입 금지**(057 D-4·058 D-6 앵커링 승계).
6. **예측 이원화 금지**: PREDICTION은 `DemandForecast`/`Mmm`/`Risk` **호출**로 해결(새 예측 모델 신설 금지).

## ★교훈 반영
- ★★[[feedback_no_duplicate_features]]: 착수 전 grep 전수 완료. **Twin은 오흡수할 대상조차 없으나**(단어경계 0) **Simulation/Scenario/Prediction substrate는 실재하고 이미 도메인별로 분산** → **통합 시뮬레이터 신설 금지·기존 심화**. 헌법 V4.
- ★[[feedback_minimize_new_menus]]: Twin Monitoring/Executive Dashboard는 신규 사이드바가 아니라 **기존 메뉴**(`PriceOpt`·`PnLDashboard`·`WmsManager`·`AIInsights`) 편입 우선.
- ★★[[feedback_real_value_autoderive]]: **`PriceOpt::simulate`가 회귀 모델 없으면 qty/revenue/profit을 `null`로 반환**(:946)하고 **`gameTheorySim`이 원가 미보유 시 422+사유**(:808)를 반환하는 패턴은 **058 `Mmm` `optimized:false`·057 `SystemMetrics` null과 같은 계열의 모범**이다. ★신규 시뮬레이션도 **산출 불가 시 0이나 임의값이 아니라 null/명시적 사유**로 반환할 것(0은 "정상"으로 오독).
- ★★**데이터 헌법 V3 적용**: **시뮬레이션 입력도 신뢰 검증 통과분만** 사용해야 한다 — 미검증 데이터로 돌린 시뮬레이션은 **그럴듯한 오답**을 만들고, 그것이 §17을 통해 운영에 반영되면 피해가 확대된다.
- ★[[feedback_no_regression_value_unification]]: **정직 미산출(null/422+사유)·payload+result 영속(재현성)·pro 플랜 게이트·테넌트 스코프**는 약화 시 즉시 회귀. **후퇴 금지 자산.**
- ★[[feedback_competitive_gap_verify]]: Twin·Registry·Modeling·Visualization·Sensitivity·Constraint·Event 8종 부재=grep 0 부재증명 완료. **동시에 가격 시뮬레이션 3종·재현성 영속·정직 미산출은 실재분으로 인정**(뭉뚱그린 감점 금지).
- ★[[feedback_audit_reference_past_fixes]]: `gameTheorySim`(260차 심화)·`WmsCctv`(274차)·E2E 시나리오(266차)=**확정분** — 상태 기술만·재플래그 금지.
- ★[[reference_platform_growth_actas_tenant_hijack]]: 시뮬레이션 데이터는 **테넌트 격리 절대**(원가·마진·탄력성·경쟁 반응이 담겨 **영업 기밀**·058 D-6과 동일).
- ★[[reference_api_prefix_routing]]·053 D-5·057 D-7·058 D-6: 신규 Twin/Simulation API는 `/api` 접두 동시 등재 + **인증 필수 접두**.
- ★헌법 V5+[[feedback_deploy_approval_mandatory]]: **AI는 승인 없이 Simulation 결과를 운영 환경에 자동 반영하거나 실제 데이터를 임의 변경 불가**(명세 §17)·배포 승인 필수.

## 확장 대상(중복 신설 금지·기존 승격 / 순신설)
- **승격(기존 확장)**: SIMULATION=`PriceOpt::simulate`/`channelMixSimulate`/`gameTheorySim` · **SIMULATION_RESULT=`po_simulations` `sim_type` 확장+표준 스키마 승격** · ROI Simulation=`Mmm::frontier`(058 정본) · What-if=`PnLDashboard` 로직 서버 승격(★클라이언트 즉시성 유지·058 D-5) · PREDICTION=`DemandForecast`/`Mmm`/`Risk` 호출 · Supply Chain 파라미터=`sc_lines`/`sc_risk_rules` seed · 시각화=`ChartUtils.jsx` · Twin Monitoring=`SystemMetrics`(057) · Audit=`SecurityAudit`(056) · 암호화=`Crypto` · 테넌트/RBAC=`Db`/`index.php`.
- **순신설(부재·grep 0)**: ★**Digital Twin 전 계층**(DIGITAL_TWIN·TWIN_MODEL·TWIN_OBJECT·TWIN_STATE·TWIN_EVENT·TWIN_POLICY·TWIN_METRIC·TWIN_VERSION·TWIN_ANALYTICS·TWIN_AUDIT)·**Enterprise Twin Registry**·Twin Modeling Engine·**Real-Time Synchronization**·State Management/Validation·Twin Visualization(Interactive View·**Heat Map**·KPI Overlay·**Geographic**·**Timeline Playback**)·Twin Governance Policy 6종·**Event/Capacity/Route/Inventory/Resource/Risk Simulation**·**Multi Scenario Comparison·Constraint Analysis(BUSINESS_CONSTRAINT)·Sensitivity Analysis·Scenario Generation**·Executive Dashboard·**API 8종·Event 8종**.

## 판정
**중복 위험 中(★Twin은 오흡수할 대상조차 없으나[단어경계 0] Simulation/Scenario/Prediction substrate는 실재·도메인별 분산) + ★신설 시 발생할 내부 중복 6종 사전 차단.** ★핵심=**`PriceOpt`**(가격 시뮬레이션 3종 + **`po_simulations` 재현성 영속**)·**`Mmm::frontier`**(ROI 곡선·058 정본)·`PnLDashboard`(What-if)·`DemandForecast`/`Risk`(예측)·`SupplyChain`(파라미터 seed)·`Wms`/`OrderHub`(운영 상태)·`ChartUtils`(시각화)·`SystemMetrics`(057)·`SecurityAudit`(056)·`Crypto`/`index.php`는 **재사용/승격**(★중복 시뮬레이터·결과 테이블·시각화·관측·감사·예측 신설 절대 금지=헌법 V4·정본 재구현 금지). 헌법 V4/V5·데이터 헌법 V3·Part 042/044/045/046/047/048/049/**051~058**·EPIC 06-A **재정의 금지·재판정 금지**. 본 Part 고유 순신설=★**Digital Twin 전 계층**(개념 자체가 부재)·Twin Registry/Modeling/Synchronization/Visualization/Governance·Event·Capacity·Route·Inventory·Resource·Risk Simulation·Multi Scenario Comparison·Constraint/Sensitivity Analysis·API 8종·Event 8종뿐. ★★**본 Part의 성격**=**"Twin이 부실하다"가 아니라 "Twin 개념이 아예 없다"**(단어경계 0)이며, 동시에 **"시뮬레이션은 가격 도메인에 진짜로 있다"** — 두 사실을 **동시에 정직히** 기술한다(과대주장 금지 + 부재 축소 금지). ★오흡수 금지(**`tools/e2e/scenarios.mjs`=E2E 테스트 시나리오** · **`poI18n.js`=i18n 라벨** · **`WmsManager.jsx`="Demo Mode: UI simulation only" 데모 문구** · `tools/migrations/_archived/*`=아카이브 패치 · `AbTesting`=A/B 실험≠Predictive Simulation · **`WmsCctv` 비디오월=실시간 CCTV 영상≠Asset Twin** · `Wms` 8테이블=운영 재고 상태≠Warehouse Twin · `SupplyChain` leadTime/risk/delayRate=입력 파라미터≠Twin · `JourneyBuilder`(054 소관)≠Workflow Modeling · `ChartUtils`/`ReportBuilder`=일반 차트≠Twin View · `Risk`(056)=리스크 **예측**≠Risk **Simulation** · `po_simulations`(가격 한정)≠Enterprise Simulation Platform). ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·★AI의 Simulation 결과 운영 자동 반영·실제 데이터 임의 변경 불가(V5+CHANGE_GATE).
