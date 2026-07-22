# ADR — MEA Part 059 Enterprise Digital Twin, Simulation & Scenario Intelligence Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(**단어경계 `\b` 적용**)·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·데이터 헌법 V3·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 058 판정 상속·재판정 금지**·**경계 고정: 058=의사결정(무엇을 할까), 059=모사·시뮬레이션(만약 이러면 어떻게 될까)**.

## Context
MEA Part 059는 물류·커머스·공급망·운영·재무·ROI 환경을 디지털 공간에 재현하고 시나리오를 예측·분석·최적화하려 한다. 전수조사 결과 **두 사실이 동시에 참**이다:
① **Digital Twin은 개념 자체가 없다** — **`twin` 단어경계 히트 0**(저장소에 단어조차 없음). Twin 엔티티·Registry·Modeling·Synchronization·Visualization 전량 부재.
② **시뮬레이션은 가격 도메인에 진짜로 있다** — `PriceOpt::simulate`(:927~948)가 **log-log 회귀**(:944 `q=exp(intercept+slope·log(p))`)로 가격별 수량·매출·이익·마진 시나리오를 산출하고, `channelMixSimulate`(:971~1003)·**`gameTheorySim`(:797~809 크로스마켓 게임이론 경쟁반응·260차)**이 더해지며, **`po_simulations`(:105~108)가 `sim_type`+`payload_json`+`result_json`을 영속**(:870·:949·:1003)해 이력 조회(:1011)까지 된다. 여기에 058 확정분(`Mmm::frontier` PROFIT(T) 곡선·`PnLDashboard` What-if 5레버:538~556·`DemandForecast`)이 있다.

## D-1 ★★"Twin이 부실하다"가 아니라 "Twin 개념이 아예 없다" (판정 어휘 확정)
**결정**: `twin` **단어경계 히트 0**은 이 저장소에서 가장 명확한 부재증명이다. 따라서 §7 "모든 Twin은 실제 운영 환경과 **지속적으로 동기화**되어야 한다"·§11 "Twin 상태는 **실시간으로 시각화**되어야 한다"는 **"미구현"이 아니라 "선행 개념 부재로 성립 불가"**로 기술한다(057·058에서 확립한 판정 어휘 구분 승계 — "미달"vs"측정 기반 부재", "미구현"vs"인프라 선행 종속", "중복"vs"결여 보강").
★동시에 **부재 축소도 금지**: 시뮬레이션 실재분(가격 3종·재현성 영속·정직 미산출)을 **Twin 부재로 뭉뚱그려 감점하지 않는다**([[feedback_competitive_gap_verify]]).
★**착수 순서 고정**: ①**Twin Registry + TWIN_MODEL 정의** → ②TWIN_STATE 스키마 + 동기화 → ③Simulation 표준 계약(기존 `PriceOpt` 승격) → ④Scenario/Visualization. **역순 착수 금지** — 동기화를 먼저 만들면 **동기화할 모델이 없는 파이프라인**이 된다.

## D-2 ★운영 데이터는 풍부하나 Twin이 아니다 — 복제 금지·참조/투영
**결정**: 저장소에는 Twin 대상 도메인의 **운영 데이터가 풍부**하다 — Warehouse(`Wms` 창고·캐리어·권한·이동·피킹·로트·재고·공급사 **8테이블**:59~105)·Supply Chain(`SupplyChain` `sc_lines`의 **supplier·sku·leadTime·risk·delayRate·totalCost**:46·:188~189 + `sc_stages`·`sc_suppliers`·**`sc_risk_rules`**:62~84)·Commerce(`OrderHub`)·Financial/ROI(P&L·`Mmm`).
★**그러나 이는 실제 운영 상태이지 디지털 모사체가 아니다** — 모델 정의·상태 동기화·시뮬레이션 대상으로 **추상화된 계층이 없다**. §6 Twin Domain 10종은 **"데이터는 있으나 Twin이 없다"**가 정확한 기술이다.
★**설계 제약**: **TWIN_STATE는 운영 테이블을 복제하지 말고 참조/투영**한다 — 복제하면 **두 개의 진실**이 되고 값 분산=회귀([[feedback_no_regression_value_unification]]). Supply Chain의 `leadTime`/`risk`/`delayRate`는 **Twin 파라미터의 원천**으로 재사용하되, 이들은 **입력 파라미터이지 시뮬레이션 산출값이 아님**을 유지한다(정직 표기).

## D-3 ★SIMULATION_RESULT 정본=`po_simulations` 확장 · 새 결과 테이블 금지
**결정**: 명세 §9 "Simulation 결과는 **반복 가능하고 재현 가능**해야 한다"의 **기반이 이미 존재**한다 — `po_simulations`(:105~108)가 **`sim_type` + `payload_json`(입력) + `result_json`(출력)**을 영속하고(:870·:949·:1003) 이력을 조회(:1011)한다. **입력이 남으므로 재현이 가능한 구조**다.
★**다만 완전한 재현 보장은 아니다**: **모델 버전·난수 시드 고정 계약이 없다**(정직 표기). 표준화 시 **`sim_type` 확장 + `model_version`/`seed` 필드 추가**가 정본 경로이며 **새 결과 테이블 신설 금지**(원본 유지=무회귀).
★**시뮬레이터도 이원화 금지**: 가격=`PriceOpt::simulate`, 채널믹스=`channelMixSimulate`, 경쟁=`gameTheorySim`, ROI 곡선=`Mmm::frontier`(058 정본), 수요=`DemandForecast`가 **각 도메인 정본**이며 통합 Simulation Engine은 **디스패처+표준 계약**이어야 한다(★058 D-1 "8번째 엔진 금지"와 **동일 병리**).

## D-4 ★정직 미산출은 저장소 3연속 모범 — 신규 시뮬레이션에 강제
**결정**: `PriceOpt::simulate`는 **회귀 모델이 없으면 qty/revenue/profit을 `null`로 반환**(:946·마진만 산출)하고, `gameTheorySim`은 **원가 미보유 시 422 + 명확한 사유**("원가(cost) 필요 — 상품 등록 또는 cost 전달":808)를 반환한다.
★이는 **057 `SystemMetrics`("측정 불가 값은 null")·058 `Mmm`(`optimized:false`+사유)와 같은 계열의 3연속 모범**이다([[feedback_real_value_autoderive]]). 신규 시뮬레이션도 **산출 불가 시 0이나 임의값이 아니라 null/명시적 사유**로 반환한다 — ★**0은 "정상"으로 오독**되어 잘못된 의사결정을 유발한다(057 D-2 규율).
★★**데이터 헌법 V3 적용**: **시뮬레이션 입력도 신뢰 검증 통과분만** 사용한다 — 미검증 데이터로 돌린 시뮬레이션은 **그럴듯한 오답**을 만들고, §17 경로로 운영에 반영되면 피해가 확대된다.

## D-5 ★Simulation Policy 필수 — 비용 상한·보존 정책·입력 게이트
**결정**: Twin Governance(§12)는 **전량 순신설**이나 **Access Policy seed는 실재**한다(`PriceOpt::gameTheorySim` `requirePlan('pro')`:799·테넌트 스코프:800).
★**Simulation Policy 필수 3항목**: ⓐ**실행 빈도·비용 상한** — 대규모 시뮬레이션은 **단일호스트 CPU 포화 위험**(044/045/050 승계·051 GPU/클러스터 부재 확정) ⓑ**결과 보존 정책** — ★`po_simulations`는 **INSERT만 있고 삭제·보존 정책이 없어 무한 누적**된다(설계 사안·신규 결함 주장 아님) ⓒ**입력 신뢰 게이트**(데이터 헌법 V3).
★**성능(§18)**: Twin Sync ≤1s·Simulation 시작 ≤3s·Scenario Evaluation ≤5s·API ≤300ms·99.99%는 **측정 장치 부재** → **"미달"이 아니라 "측정 기반 부재"**. 계측은 **`SystemMetrics` 확장**(057 D-1·별도 수집기 금지). 대규모 시뮬레이션의 §18 달성은 **인프라 선행 종속**.

## D-6 ★Twin 데이터 보안 — 영업 기밀·테넌트 격리 절대·인증 필수 접두
**결정**: 시뮬레이션 데이터에는 **원가·마진·탄력성·경쟁 반응 추정**이 담긴다 — 교차 노출 시 **영업 기밀 유출**이다(058 D-6과 동일 성격). **테넌트 격리 절대**([[reference_platform_growth_actas_tenant_hijack]])·전역 writeGuard 상속(056:72~75).
★**Twin/Simulation API는 전량 인증 필수 접두**에 배치한다 — 공개 bypass 접두에 얹으면 **원가·마진이 무인증 노출**된다(053 D-5·057 D-7·058 D-6 교훈)·`/api` 변형 동시 등재([[reference_api_prefix_routing]]).
★**TWIN_AUDIT**은 **`SecurityAudit` 확장**이되 **고빈도 동기화 로그를 체인에 직접 넣지 말 것**(체인 붕괴·057 D-4·058 D-6 **앵커링** 승계). **Twin Data Encryption**은 `Crypto`(049) 재사용.
★**BUSINESS_CONSTRAINT 스코프 분리**: 058=**결정 정책**(무엇을 승인할까), 059=**물리·업무 제약**(창고 용량·리드타임·최소주문량). 제약 원천은 **`SupplyChain` leadTime·`Wms` 용량 등 기존 데이터 파생**(임의 상수 금지).

## D-7 ★Simulation 결과 자동 반영 금지는 현행이 구조적으로 충족 — 시뮬레이션은 추정이라 위험이 더 크다
**결정**: 명세 §17 말미 "AI는 **승인 없이 운영 환경에 Simulation 결과를 자동 반영**하거나 **실제 데이터를 임의 변경**하지 않는다"는 **현행 설계가 구조적으로 충족**한다: ⓐ**시뮬레이션은 읽기·계산 전용**이며 결과를 `po_simulations`에 **기록만** 하고 운영 가격/재고를 직접 바꾸지 않는다 ⓑ가격 실제 변경은 **리프라이서 규칙 + 실행 이력**(058 `po_repricer_rules`:121/`po_repricer_history`:132) 경로이며 **`agent_mode`·킬스위치 게이트 종속**(054/058 D-4) ⓒ파괴적 액션은 **제안-only+HITL**(054 D-2) ⓓ**기본값은 approval**(fail-safe).
★**후퇴 금지 자산**. 향후 **"시뮬레이션 최적해 자동 적용"**을 도입한다면 **승인 게이트를 반드시 앞에 둔다**([[feedback_deploy_approval_mandatory]]).
★★**추가 경고**: **시뮬레이션은 추정이므로 자동 반영의 위험이 실측 기반 결정보다 더 크다** — 모델 가정이 틀리면 결과 전체가 틀리고, 그것이 게이트 없이 운영에 반영되면 **손실이 즉시 실현**된다. §17 게이트는 058보다 **더 엄격히** 적용해야 한다.

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL-weak** — 가격/이익 도메인 시뮬레이션은 실재하나 **Digital Twin 개념·Registry·Modeling·Visualization은 전면 부재**(`twin` 단어경계 0).
- ★중복 금지 재사용: **`PriceOpt`**(시뮬레이션 3종·**`po_simulations` 재현성 정본**)·**`Mmm::frontier`**(058 ROI 정본)·`PnLDashboard`(What-if)·`DemandForecast`/`Risk`(예측)·`SupplyChain`(파라미터 seed)·`Wms`/`OrderHub`(운영 상태)·`ChartUtils`(시각화)·`SystemMetrics`(057 관측 정본)·`SecurityAudit`(056 감사 정본)·`Crypto`/`index.php`.
- ★순신설: **Digital Twin 전 계층**(엔티티 10종·**Enterprise Twin Registry**·Twin Modeling Engine·**Real-Time Synchronization**·State Management/Validation·**Twin Visualization 전량**(Interactive View·Heat Map·KPI Overlay·Geographic·Timeline Playback)·Twin Governance Policy 6종)·**Event/Capacity/Route/Inventory/Resource/Risk Simulation**·**Multi Scenario Comparison·Constraint Analysis·Sensitivity Analysis·Scenario Generation**·Executive Dashboard·**API 8종·Event 8종**.
- ★오흡수 금지: **`tools/e2e/scenarios.mjs`(11히트)=E2E 테스트 시나리오**(266차)**≠비즈니스 시나리오** · **`frontend/src/pages/poI18n.js`(scenario 17·simulation 11)=i18n 라벨 사전** · **`WmsManager.jsx`(:469·:2366)="Demo Mode: Stock Change Blocked (UI simulation only)"·"Demo simulation result" 데모 문구≠시뮬레이션 엔진** · `tools/migrations/_archived/*`=**아카이브 패치 스크립트** · `prediction` 히트=risk predict(056)·LLM·**`AbTesting` A/B 실험≠Predictive Simulation** · **`WmsCctv` 비디오월(274차)=실시간 CCTV 영상≠Asset Twin**(054 `agent_version` 배제와 동일 계열) · **`Wms` 8테이블=운영 재고 상태≠Warehouse Twin** · `SupplyChain` leadTime/risk/delayRate=**입력 파라미터**≠Twin 산출 · `JourneyBuilder`(마케팅 여정·054 소관)≠Workflow Modeling · `graph_node`/`graph_edge`(마케팅 기여도·055 확정)≠Object Relationship Modeling · `ChartUtils.jsx`/`ReportBuilder.jsx`=**일반 차트**≠Twin View · `Risk`(056)=리스크 **예측**≠Risk **Simulation** · `po_simulations`(**가격 한정**)≠Enterprise Simulation Platform · `SecurityAudit`≠TWIN_AUDIT 엔티티.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·AI의 Simulation 결과 운영 자동 반영·실제 데이터 임의 변경 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 042/044/045/046/047/048/049/**051~058**·EPIC 06-A 상속·**재판정 금지**·재감사 금지(260차 게임이론·266차 E2E·274차 CCTV 확정분).
