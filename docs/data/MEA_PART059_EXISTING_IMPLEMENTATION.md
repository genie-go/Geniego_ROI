# MEA Part 059 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 059 SPEC/ADR. ★부재증명 완료·과대주장 금지·**부재 축소 금지**·**뭉뚱그린 평가절하 금지**·정직 표기(**가격 도메인 시뮬레이션 실재 / Twin 개념 전무**).
> ★**Part 058 판정 상속·재판정 금지**(`Mmm::frontier` ROI 최적화 정본·`PriceOpt` 스택·`PnLDashboard` What-if·`DemandForecast`·`JourneyBuilder` Thompson). **경계 고정 — 058=의사결정(무엇을 할까), 059=모사·시뮬레이션(만약 이러면 어떻게 될까).**
> **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**

## 전수조사 방법
① **형식 용어 grep(★단어경계 `\b` 적용** · 범위=`backend/src`·`backend/bin`·`backend/data`·`tools`·`frontend/src`, `i18n/**`·`*.json` 제외): **`twin` = 0**(★단어 자체가 저장소에 없음) · `digital_twin`/`twin_model`/`twin_object`/`twin_state`/`twin_event`/`twin_policy`/`twin_metric`/`twin_version`/`twin_analytics`/`twin_audit`/`twin_registry`/`DigitalTwin`/`simulation_result`/`monte_carlo`/`discrete_event`/`sensitivity`/`constraint_analysis`/`scenario_generation`/`timeline_playback`/`heat_map`/`geographic_visual`/`asset_twin`/`process_twin` = **전부 0**.
② **광의 히트 분포 판독**: `simulation` 38 · `scenario` 68 · `prediction` 31 → **파일 단위로 전수 분류**(아래 ③).
③ **실 substrate 판독**: **`PriceOpt`**(`simulate`:927~949·`channelMixSimulate`:971~1003·`channelMixResults`:1011·**`gameTheorySim`**:797~809·`po_simulations`:105~108)·`Mmm`(058 확정)·`PnLDashboard.jsx`(058 확정 What-if:538~556)·`DemandForecast`·`SupplyChain`(sc_lines/sc_stages/sc_suppliers/sc_risk_rules:46~84)·`Wms`(:59~105 8테이블)·`WmsCctv`(274차)·`Logistics`·`AbTesting`·`routes.php`(:779·:783·:785~786).

### ★동음이의 배제(오흡수 방지 — 본 Part 최다)
| 히트 | 실체 | 판정 |
|---|---|---|
| **`twin` 0히트** | **저장소에 단어 자체가 없음** | ★Digital Twin 개념 **전무**(명확한 부재증명) |
| `scenario` 11히트 `tools/e2e/scenarios.mjs` | **E2E 테스트 시나리오**(266차 쓰기 플로우 검증·가역 자가정리) | ★**오흡수 금지**(테스트 시나리오≠비즈니스 시나리오) |
| `scenario` 17 + `simulation` 11히트 `frontend/src/pages/poI18n.js` | **i18n 라벨 사전** | ★오흡수 금지 |
| `simulation` 2히트 `frontend/src/pages/WmsManager.jsx`(:469·:2366) | **"Demo Mode: Stock Change Blocked (UI simulation only)"·"Demo simulation result"** = 데모 UI 문구 | ★**오흡수 금지**(데모 표시≠시뮬레이션 엔진) |
| `simulation` 다수 `tools/migrations/_archived/*` | **아카이브된 과거 패치 스크립트** | ★오흡수 금지 |
| `prediction` `routes.php`(6)·`ClaudeAI`(6)·`AbTesting`(1) | risk predict 라우트(056 확정)·LLM·**A/B 실험** | ★오흡수 금지(A/B 실험≠시뮬레이션) |
| `WmsCctv` 비디오월(274차) | **실시간 CCTV 스트림 시각화** | ★**오흡수 금지**(실물 영상≠Asset Twin·054가 `agent_version`≠AI Agent로 배제한 것과 동일 계열) |

## 실존 substrate

### A. Simulation Engine — ★가격/이익 도메인 한정 실재
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| **What-if Simulation(가격)** | log-log 회귀로 가격별 수량·매출·이익·마진 **시나리오 배열** 산출 | `PriceOpt::simulate`(:927~948·회귀식 :944) | PARTIAL |
| **정직 미산출** | 회귀 모델 없으면 qty/revenue/profit=**null** 반환(마진만 산출) | `PriceOpt`(:946) | PARTIAL-strong |
| **Financial Simulation** | 채널믹스 시뮬레이션 | `PriceOpt::channelMixSimulate`(:971~1003)·`routes.php`(:785) | PARTIAL |
| **★경쟁반응 시뮬레이션** | 크로스마켓 **게임이론** 경쟁반응(260차 심화) | `PriceOpt::gameTheorySim`(:797~809)·`routes.php`(:779) | PARTIAL |
| **★재현성 기반(SIMULATION_RESULT)** | **payload_json + result_json + sim_type** 영속 | `po_simulations`(`PriceOpt`:105~108·INSERT :870·:949·:1003) | PARTIAL-strong |
| **시뮬레이션 이력 조회** | 최근 20건 결과 조회 | `PriceOpt::channelMixResults`(:1011)·`routes.php`(:786) | PARTIAL |
| What-if(순이익 5레버) | 매출·광고비·원가·배송비·반품비 즉시 재계산 | `PnLDashboard.jsx`(058 확정·:538~556·**클라이언트**) | PARTIAL |
| ROI Simulation(이익곡선) | PROFIT(T) 곡선·T\*·증액여력 | `Mmm::frontier`(058 정본·:349~352·:437) | PARTIAL-strong |
| Predictive Forecast | Holt-Winters 수요 예측 | `DemandForecast`(051/052/058 확정) | PARTIAL |
| 접근 통제 | pro 플랜 게이트·테넌트 스코프 | `PriceOpt::gameTheorySim`(:799~800) | PARTIAL |

### B. Twin 대상 도메인의 **운영 상태**(★Twin 아님·모델링 seed로만)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Warehouse 운영 상태 | 창고·캐리어·권한·이동·피킹·로트·재고·공급사 8테이블 | `Wms`(:59~105) | **ABSENT-formal**(운영 상태이지 Twin 아님) |
| Supply Chain 모델 seed | `sc_lines`(supplier·sku·**leadTime·risk·delayRate·totalCost**)·`sc_stages`·`sc_suppliers`·**`sc_risk_rules`** | `SupplyChain`(:46·:62·:73·:84·:188~189) | PARTIAL-weak(파라미터 실재·시뮬레이터 부재) |
| Commerce/Financial 상태 | 주문·P&L·정산 | `OrderHub`·P&L(268차 확정) | ABSENT-formal |
| 실시간 시각화(비-Twin) | CCTV 비디오월 | `WmsCctv`(274차·★오흡수 금지) | ABSENT-formal |
| 차트 유틸 | 대시보드 차트 | `frontend/src/components/dashboards/ChartUtils.jsx`·`ReportBuilder.jsx` | PARTIAL-weak |

### C. 보안·감사(상속)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Tenant Isolation | 시뮬레이션 전 테이블 tenant 키·fail-closed | `PriceOpt`(:800·:949·:1011)·`Risk`(056:15~18) | PARTIAL-strong |
| RBAC·플랜 게이트 | 전역 writeGuard·`requirePlan('pro')` | `index.php`(056:72~75)·`PriceOpt`(:799) | PARTIAL-strong |
| Immutable Audit | 해시체인 정본 | `SecurityAudit`(056) | PARTIAL |

## 부재(ABSENT — 부재증명 완료·grep 0)
★★**Digital Twin 개념 전면 부재**: **`twin` 단어경계 히트 0** — DIGITAL_TWIN·TWIN_MODEL·TWIN_OBJECT·TWIN_STATE·TWIN_EVENT·TWIN_POLICY·TWIN_METRIC·TWIN_VERSION·TWIN_ANALYTICS·TWIN_AUDIT **엔티티 전량**·**Enterprise Twin Registry**(§6 근간)·Twin Modeling Engine·Twin Visualization Platform·Twin Governance Manager·Twin Monitoring Dashboard·Twin Audit Service·Enterprise Simulation Advisor.
★**Twin Domain(§6) 전량**: Logistics/Warehouse/Fleet/Commerce/Supply Chain/Financial/ROI/Process/Asset Twin(★운영 데이터는 있으나 **디지털 모사체(Twin)로 모델링·동기화·시뮬레이션되는 대상이 아니다**).
★**Twin Lifecycle(§7) 전량**: Twin Registration·Model Definition·**Data Synchronization**·Scenario Analysis(형식)·Validation·Version Upgrade·Archive(★"모든 Twin은 실제 운영 환경과 **지속적으로 동기화**되어야 한다" → **동기화 대상 자체가 없음**).
★**Twin Modeling(§8) 전량**: Physical Asset Modeling·Business Process Modeling·Workflow Modeling(★`JourneyBuilder`는 **마케팅 여정**·054 소관)·Object Relationship Modeling·Dependency Modeling·State Management·Real-Time Synchronization·Version Management.
★**Simulation Engine(§9) 미보유 축**: **Event Simulation·Capacity Simulation·Route Simulation·Inventory Simulation·Resource Simulation·Risk Simulation**(★실재는 **가격/이익/채널믹스/경쟁반응**뿐·grep 0: monte_carlo/discrete_event).
★**Scenario Intelligence(§10) 대부분**: **Scenario Generation(자동)**·**Multi Scenario Comparison**·**Constraint Analysis**(BUSINESS_CONSTRAINT 엔티티 부재)·**Sensitivity Analysis**(grep 0)·Scenario Recommendation Engine·**Executive Dashboard**(★"모든 Scenario는 **KPI 및 ROI 영향도**를 함께 제공한다" → 가격 시뮬레이션은 profit/margin을 주나 **KPI 영향도 표준 계약 부재**).
★**Twin Visualization(§11) 전량**: Interactive Twin View·Process Visualization·**Heat Map**·KPI Overlay·**Geographic Visualization**·**Timeline Playback**·Executive Reporting(형식)(grep 0: heat_map/geographic_visual/timeline_playback/leaflet/mapbox — ★`ChartUtils.jsx`·`ReportBuilder.jsx`는 **일반 차트**이지 Twin 시각화 아님).
★**Twin Governance(§12)**: Twin/Synchronization/Simulation/Version/Validation/Access **Policy 객체**·Compliance Validation·Twin Audit Trail.
★**Security(§13)**: **Twin Data Encryption**·**Secure Synchronization**(동기화 자체 부재로 동반).
★**Runtime 규칙(§14)**: **Twin Synchronization·State Validation·Prediction 생성(형식)·Event 생성**·Twin Audit 기록.
★**API 표준(§15) 8종 전량**(Register/Synchronize Twin·Execute Simulation(표준)·Execute Scenario(표준)·Query Twin Status/Simulation Result(표준)/Twin Analytics/Twin Audit — ★도메인 API(`/v420/price/simulate`:783·`/v420/price/game-theory`:779·`/v420/channel-mix/simulate`:785·`/results`:786)는 있으나 **Twin 표준 API 없음**)·**Event 표준(§16) 8종 전량**.
★**§17 미보유**: Scenario Recommendation·**Capacity Forecasting**(인프라 용량·057 확정 부재)·**Resource Optimization**·Explainable Recommendation(형식)·Autonomous Optimization Recommendation.
★**성능 SLA(§18)**: Twin Synchronization ≤1s·Simulation 시작 ≤3s·Scenario Evaluation ≤5s·API ≤300ms·**99.99%**=측정 장치 부재(★057·058 규율: **"미달"이 아니라 "측정 기반 부재"**·단일호스트 044/045/050 승계).

★**부수 관찰(신규 결함 주장 아님·재감사 금지)**: ⓐ `PriceOpt::gameTheorySim`은 **원가 미보유 시 422 + 명확한 사유**("원가(cost) 필요 — 상품 등록 또는 cost 전달":808)를 반환한다 — **정직 미산출 패턴**(058 D-2·`Mmm` `optimized:false`와 동일 계열). ⓑ `po_simulations`는 **INSERT만 있고 삭제·보존 정책이 없다**(무한 누적) — 설계 사안(§D-5)이지 결함 주장이 아니다. ⓒ `SupplyChain`의 `leadTime`/`risk`/`delayRate`는 **입력 파라미터**이지 시뮬레이션 산출값이 아니다(정직 표기).

## 판정
**PARTIAL-weak (가격/이익 도메인 시뮬레이션은 실재 / ★Digital Twin 개념·Twin Registry·Twin Modeling·Twin Visualization = 전면 ABSENT).**
★**실재(정직 인정·평가절하 금지)**: **가격 도메인에 진짜 시뮬레이션 스택이 있다** — `PriceOpt::simulate`(:927~948)가 **log-log 회귀**(:944 `q=exp(intercept+slope·log(p))`)로 가격별 수량·매출·이익·마진 **시나리오 배열**을 산출하고, **회귀 모델이 없으면 qty/revenue/profit을 `null`로 반환**(:946·마진만 산출)한다. `channelMixSimulate`(:971~1003)가 채널믹스를, **`gameTheorySim`(:797~809)이 크로스마켓 게임이론 경쟁반응**(260차 심화)을 시뮬레이션하며 **원가 미보유 시 422+사유**(:808)로 정직 거절한다. 무엇보다 **`po_simulations`(:105~108)가 `sim_type`+`payload_json`+`result_json`을 영속**(:870·:949·:1003)해 **§9 "Simulation 결과는 반복 가능하고 재현 가능해야 한다"의 기반을 실제로 갖추고** 있고 이력 조회(:1011)도 된다. 여기에 058 확정분(`Mmm::frontier` PROFIT(T) 곡선·`PnLDashboard` What-if 5레버·`DemandForecast`)이 더해진다.
★**부재(grep 0·부재증명 완료·축소 금지)**: ★★**Digital Twin은 개념 자체가 없다** — **`twin` 단어경계 히트 0**. Twin 엔티티 15종 중 Twin 계열 전량·**Enterprise Twin Registry**·Twin Modeling Engine·**Real-Time Synchronization**·Twin Visualization(Heat Map·Geographic·Timeline Playback)·Twin Governance·Twin Audit·**Event/Capacity/Route/Inventory/Resource/Risk Simulation**·**Multi Scenario Comparison·Constraint Analysis·Sensitivity Analysis**·API 8종·Event 8종·성능 SLA.
★★**핵심 판별(정직 기술)**: 저장소에는 **창고·공급망·주문·재무의 운영 데이터가 풍부**하지만(`Wms` 8테이블:59~105·`SupplyChain` sc_lines/stages/suppliers/risk_rules:46~84·`OrderHub`·P&L), 이는 **실제 운영 상태**이지 **디지털 모사체(Twin)가 아니다** — **모델 정의·상태 동기화·시뮬레이션 대상으로 추상화된 계층이 없다**. 즉 §6 Twin Domain 10종은 **"데이터는 있으나 Twin이 없다"**가 정확한 기술이다.
★**오흡수 금지**: **`tools/e2e/scenarios.mjs`(11히트)=E2E 테스트 시나리오**(266차)≠비즈니스 시나리오 · **`poI18n.js`(scenario 17·simulation 11)=i18n 라벨 사전** · **`WmsManager.jsx`(:469·:2366)="Demo Mode: UI simulation only"·"Demo simulation result" 데모 문구**≠시뮬레이션 엔진 · `tools/migrations/_archived/*`=**아카이브 패치 스크립트** · `prediction` 히트=risk predict 라우트(056)·LLM·**A/B 실험**(`AbTesting`)≠Predictive Simulation · **`WmsCctv` 비디오월(274차)=실시간 CCTV 영상**≠Asset Twin · `Wms` 8테이블=**운영 재고 상태**≠Warehouse Twin · `SupplyChain` leadTime/risk/delayRate=**입력 파라미터**≠시뮬레이션 산출 · `JourneyBuilder`(마케팅 여정·054 소관)≠Workflow Modeling · `ChartUtils.jsx`/`ReportBuilder.jsx`=**일반 차트**≠Twin 시각화 · `po_simulations`(가격 한정)≠Enterprise Simulation Platform. 코드 변경 0.
