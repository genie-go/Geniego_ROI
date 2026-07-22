# MEA Part 059 — Enterprise Digital Twin, Simulation & Scenario Intelligence Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(grep 0·**단어경계 적용**)·정직 표기(**Twin 개념 전무 / 가격 시뮬레이션 실재** 동시 기술)·과대주장 금지·**부재 축소 금지**·오흡수 금지. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 058 판정 상속·재판정 금지**·**경계 고정: 058=의사결정(무엇을 할까), 059=모사·시뮬레이션(만약 이러면 어떻게 될까)**.

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART059_DIGITAL_TWIN_SIMULATION_SCENARIO_INTELLIGENCE_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19(verbatim) |
| 2 | ADR | `docs/architecture/ADR_MEA_DIGITAL_TWIN_SIMULATION_SCENARIO_INTELLIGENCE_ARCHITECTURE.md` | 결정 D-1~D-7 |
| 3 | GT① EXISTING | `docs/data/MEA_PART059_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART059_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART059_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART059_GOVERNANCE_MECHANISMS.md` | §7~§17 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART059_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL-weak (가격/이익 도메인 시뮬레이션은 실재 / ★Digital Twin 개념·Registry·Modeling·Visualization = 전면 ABSENT).**
★★**본 Part의 성격 규정(ADR D-1)**: **"Twin이 부실하다"가 아니라 "Twin 개념이 아예 없다"**(**`twin` 단어경계 히트 0** — 저장소에 단어조차 없음·이 저장소에서 가장 명확한 부재증명)이면서, 동시에 **"시뮬레이션은 가격 도메인에 진짜로 있다"** — **두 사실을 동시에 정직히** 기술한다(과대주장 금지 + 부재 축소 금지 동시 적용). 따라서 §7 "지속적 동기화"·§11 "실시간 시각화"는 **"미구현"이 아니라 "선행 개념 부재로 성립 불가"**다(057·058에서 확립한 판정 어휘 구분 승계).
★**실재(정직 인정·평가절하 금지)**: ① **가격 시뮬레이션 3종** — `PriceOpt::simulate`(:927~948·**log-log 회귀** :944 `q=exp(intercept+slope·log(p))` → 가격별 qty_est/revenue/profit/margin 시나리오 배열)·`channelMixSimulate`(:971~1003 채널믹스)·**`gameTheorySim`(:797~809 크로스마켓 게임이론 경쟁반응·260차 심화)** ② **★재현성 기반 영속** — `po_simulations`(:105~108)가 **`sim_type`+`payload_json`(입력)+`result_json`(출력)**을 영속(:870·:949·:1003)하고 이력 조회(:1011) → **§9 "반복 가능하고 재현 가능" 기반 실재**(단 **model_version·seed 고정 계약은 부재**·정직 표기) ③ **★정직 미산출** — 회귀 모델 없으면 **qty/revenue/profit을 `null`로 반환**(:946·마진만)·원가 미보유 시 **422 + 명확한 사유**("원가(cost) 필요 — 상품 등록 또는 cost 전달":808) ④ **ROI Simulation** `Mmm::frontier`(058 정본·PROFIT(T) 곡선·T\*) ⑤ **What-if 5레버** `PnLDashboard.jsx`(058:538~556·**클라이언트**) ⑥ **예측** `DemandForecast`(Holt-Winters)·`Risk`(056) ⑦ **접근 통제** `requirePlan('pro')`(:799)+테넌트 스코프(:800·:949·:1011) ⑧ **모델링 seed** `SupplyChain`(sc_lines의 **supplier·sku·leadTime·risk·delayRate·totalCost**:46·:188~189·sc_stages·sc_suppliers·**sc_risk_rules**:62~84)·`Wms`(8테이블:59~105) ⑨ 보안 상속(전역 writeGuard 056:72~75·해시체인 감사 056).
★**ABSENT(grep 0·부재증명 완료·축소 금지)**: ★★**Digital Twin 전 계층** — DIGITAL_TWIN·TWIN_MODEL·TWIN_OBJECT·TWIN_STATE·TWIN_EVENT·TWIN_POLICY·TWIN_METRIC·TWIN_VERSION·TWIN_ANALYTICS·TWIN_AUDIT **엔티티 10종**·**Enterprise Twin Registry**(§6 근간)·Twin Modeling Engine(§8 8항목 전량)·**Real-Time Synchronization**·State Management/Validation·**Twin Visualization 전량**(Interactive Twin View·Process Visualization·**Heat Map**·KPI Overlay·**Geographic Visualization**·**Timeline Playback**·Executive Reporting)·Twin Governance Policy 6종·Compliance Validation·**Twin Data Encryption·Secure Synchronization** · **Simulation 미보유 축**: Event·Capacity·**Route**·Inventory·Resource·Risk Simulation(grep 0: monte_carlo/discrete_event/route_optim) · **Scenario Intelligence 대부분**: Scenario Generation(자동)·**Multi Scenario Comparison**·**Constraint Analysis**(BUSINESS_CONSTRAINT)·**Sensitivity Analysis**·Executive Dashboard · **API 8종·Event 8종 전량** · §17 Scenario Recommendation·**Capacity Forecasting**(★057 확정 부재·**GPU/인프라 선행 종속**·051)·Explainable/Autonomous Optimization Recommendation · 성능 SLA(§18·**"미달"이 아니라 "측정 기반 부재"**).
★★**핵심 판별**: 저장소에는 Twin 대상 도메인의 **운영 데이터가 풍부**하다(`Wms` 8테이블·`SupplyChain` sc_lines/stages/suppliers/risk_rules·`OrderHub`·P&L·`Mmm`). **그러나 이는 실제 운영 상태이지 디지털 모사체가 아니다** — **모델 정의·상태 동기화·시뮬레이션 대상으로 추상화된 계층이 없다**. §6 Twin Domain 10종은 **"데이터는 있으나 Twin이 없다"**가 정확한 기술이다.
★**오흡수 금지(동음이의 실측 — 본 Part 최다)**: **`tools/e2e/scenarios.mjs`(scenario 11히트) = E2E 테스트 시나리오**(266차 쓰기 플로우·가역 자가정리)**≠비즈니스 시나리오** · **`frontend/src/pages/poI18n.js`(scenario 17·simulation 11) = i18n 라벨 사전** · **`WmsManager.jsx`(:469·:2366) = "Demo Mode: Stock Change Blocked (UI simulation only)"·"Demo simulation result" 데모 UI 문구 ≠ 시뮬레이션 엔진** · `tools/migrations/_archived/*` = **아카이브된 과거 패치 스크립트** · `prediction` 31히트 = risk predict 라우트(056 확정)·`ClaudeAI`·**`AbTesting` A/B 실험 ≠ Predictive Simulation** · **`WmsCctv` 비디오월(274차) = 실시간 CCTV 영상 ≠ Asset Twin**(054가 `agent_version`≠AI Agent로 배제한 것과 **동일 계열**) · **`Wms` 8테이블 = 운영 재고 상태 ≠ Warehouse Twin** · `SupplyChain` leadTime/risk/delayRate = **입력 파라미터** ≠ Twin 산출값 · `JourneyBuilder`(마케팅 여정·**054 소관**) ≠ Workflow Modeling · `graph_node`/`graph_edge`(마케팅 기여도·**055 확정**) ≠ Object Relationship Modeling · `ChartUtils.jsx`/`ReportBuilder.jsx` = **일반 차트** ≠ Twin View · `Risk`(056) = 리스크 **예측** ≠ Risk **Simulation** · `po_simulations`(**가격 한정**) ≠ Enterprise Simulation Platform · `SecurityAudit` ≠ TWIN_AUDIT 엔티티.
★**강점 정직 기술(후퇴 금지)**: 명세 §17 "AI는 **승인 없이 운영 환경에 Simulation 결과를 자동 반영**하거나 **실제 데이터를 임의 변경**하지 않는다"는 **현행이 구조적으로 충족** — ⓐ**시뮬레이션은 읽기·계산 전용**이며 결과를 `po_simulations`에 **기록만** 하고 운영 가격/재고를 직접 바꾸지 않는다 ⓑ가격 실제 변경은 **리프라이서 규칙+실행 이력**(058 `po_repricer_rules`:121/`po_repricer_history`:132) 경로이며 **`agent_mode`·킬스위치 게이트 종속** ⓒ파괴적 액션은 **제안-only+HITL**(054 D-2) ⓓ기본값 **approval**. 코드 변경 0.

## ★★핵심 설계 제약 9종 (구현 착수 시 필수)
1. **착수 순서 고정**(D-1) — ①Twin Registry+TWIN_MODEL → ②TWIN_STATE+동기화 → ③Simulation 표준 계약(기존 `PriceOpt` 승격) → ④Scenario/Visualization. **역순 금지**(동기화를 먼저 만들면 동기화할 모델이 없다).
2. **TWIN_STATE는 운영 테이블 복제 금지 · 참조/투영**(D-2) — 복제=두 개의 진실=회귀.
3. **SIMULATION_RESULT는 `po_simulations` `sim_type` 확장 + `model_version`/`seed` 추가**(D-3) — 새 결과 테이블 신설 금지(원본 유지=무회귀).
4. **시뮬레이터·시각화·관측·감사·예측 이원화 금지**(D-3) — 각 도메인 정본 재사용, 통합 Engine은 **디스패처**(★058 D-1 "8번째 엔진 금지"와 동일 병리).
5. **산출 불가 시 0/임의값이 아니라 null·명시적 사유**(D-4) — **0은 "정상"으로 오독**. ★057 `SystemMetrics` null · 058 `Mmm` `optimized:false` · 059 `PriceOpt` null/422 = **3연속 모범**.
6. **시뮬레이션 입력도 데이터 헌법 V3 신뢰 검증 통과분만**(D-4) — 미검증 입력 → **그럴듯한 오답** → §17 경로로 운영 반영 시 피해 확대.
7. **Simulation Policy 필수 3항목**(D-5) — 실행 빈도·**비용 상한**(단일호스트 CPU 포화 위험)·**결과 보존 정책**(★`po_simulations`는 INSERT만 있고 **무한 누적**)·입력 신뢰 게이트.
8. **Twin/Simulation API는 인증 필수 접두 + 테넌트 격리 절대**(D-6) — **원가·마진·탄력성·경쟁 반응 추정 = 영업 기밀**. TWIN_AUDIT은 `SecurityAudit` 확장이되 **고빈도 동기화 로그는 앵커링**(체인 직접 유입 금지).
9. **BUSINESS_CONSTRAINT는 058 Decision Policy와 스코프 분리**(D-6) — 058=**결정 정책**(무엇을 승인할까), 059=**물리·업무 제약**(창고 용량·리드타임·최소주문량). 제약 원천은 **기존 데이터 파생**(임의 상수 금지).
※ **§17 게이트는 058보다 더 엄격히**(D-7) — **시뮬레이션은 추정이라 자동 반영 위험이 실측 기반 결정보다 크다**(모델 가정이 틀리면 결과 전체가 틀리고 손실이 즉시 실현).

## 상속·다음
- **상속**: **051~058 전체** — 특히 **058(Decision Intelligence)과 경계 고정·재판정 금지** + 헌법 V4/V5 + 데이터 헌법 V3 + `CHANGE_GATE` + Security(047~049) + Observability(046/057) + 가용성(044/045/050) + GPU/클러스터 부재(051) + API GW(042) + EPIC 06-A.
- **다음**: **MEA Part 060 — Enterprise Cognitive Enterprise, Hyperautomation & Autonomous Enterprise Architecture**(명세 지정). ★예상 조사 후보=`JourneyBuilder`/`agent_mode`/`AutoCampaign`(054·058 확정)·`RuleEngine`·cron 36·`ClaudeAI` 코파일럿(053/054)·`AutoRecommend`. ★**부재 예상은 반드시 grep 부재증명 후 판정**(053 선례). ★오흡수 사전 주의: cron 36≠Hyperautomation · `JourneyBuilder`(마케팅 여정)≠Enterprise Process Automation · `AIInsights.jsx`:599 "Autonomous orchestration" **마케팅 카피**≠Autonomous Enterprise(058 확정) · `agent_mode` 3모드≠Cognitive Enterprise.

## ★AI Platform 진행 (Part 051~059)
051 AI Foundation(PARTIAL) · 052 ML & MLOps(ABSENT-heavy) · 053 GenAI/LLM(PARTIAL·**호출경로 2개 병존**) · 054 AI Agent(**PARTIAL-strong·최고 실재도**) · 055 Knowledge/RAG(PARTIAL-weak) · 056 AI Governance(PARTIAL-weak·**"규범은 문서에 있고 기계 집행이 없다"**) · 057 AI Observability(PARTIAL-weak·**AI 미프로브**) · 058 Decision Intelligence(**PARTIAL**·**"결정 엔진이 7개인데 통합 Registry가 없다"**) · **059 Digital Twin/Simulation/Scenario(★PARTIAL-weak — 가격 시뮬레이션 3종+재현성 영속+정직 미산출 실재 / ★★`twin` 단어경계 0 = Twin 개념 자체 부재)** → 다음 **060 Cognitive Enterprise/Hyperautomation/Autonomous Enterprise**.
★**AI 시리즈 반복 결론**: 053(Gateway 부재) → 056(감사 구멍) → 057(AI 미프로브) → 058(Decision 파편화) → **059(Simulation 파편화 + Twin 전무)**. **통합 계약(Gateway·감사·계측·Decision Registry·Twin Registry)이 일관된 처방**이며 **053 Gateway 일원화가 실 구현 1순위**다. ★**정직 미산출 3연속 모범**(057 null · 058 `optimized:false` · 059 null/422)은 이 저장소의 **가장 강한 문화 자산**으로 신규 구현에 반드시 승계할 것.
