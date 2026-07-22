# MEA Part 058 — Enterprise AI Decision Intelligence & Autonomous Business Architecture · INDEX

> **거버넌스 상태**: 설계 문서 세트 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(grep 0·**단어경계 적용**)·정직 표기(**도메인별 스택 실재 / 통합 Registry 부재**·"미달"과 "측정 불가" 구분)·과대주장 금지·**부재 축소 금지**·오흡수 금지. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 054 판정 상속·재판정 금지**·**경계 고정: 054=Agent/Workflow 실행 계층, 058=Decision 계층**.

## 문서 세트 (7)
| # | 문서 | 경로 | 역할 |
|---|---|---|---|
| 1 | SPEC v1.0 | `docs/spec/MEA_PART058_AI_DECISION_INTELLIGENCE_AUTONOMOUS_BUSINESS_ARCHITECTURE_SPEC.md` | 원문 명세 §1~§19(verbatim) |
| 2 | ADR | `docs/architecture/ADR_MEA_AI_DECISION_INTELLIGENCE_AUTONOMOUS_BUSINESS_ARCHITECTURE.md` | 결정 D-1~D-7 |
| 3 | GT① EXISTING | `docs/data/MEA_PART058_EXISTING_IMPLEMENTATION.md` | 전수조사 근거지 |
| 4 | GT② DUPLICATE | `docs/data/MEA_PART058_DUPLICATE_AUDIT.md` | 중복 경계 |
| 5 | CANONICAL | `docs/data/MEA_PART058_CANONICAL_ENTITIES.md` | 15 엔티티 §5~§17 |
| 6 | GOVERNANCE | `docs/data/MEA_PART058_GOVERNANCE_MECHANISMS.md` | §7~§17 메커니즘 |
| 7 | INDEX | `docs/data/MEA_PART058_INDEX.md` | 본 문서 |

## 한 줄 판정
**PARTIAL (도메인별 의사결정·최적화 스택이 다수 실재 / ★통합 Decision Registry·Engine·Rule 거버넌스 = ABSENT).** ★AI 시리즈에서 **054 다음으로 실재도가 높다.**
★★**본 Part의 성격 규정(ADR D-1)**: **"결정 엔진이 없다"가 아니라 "결정 엔진이 7개인데 통합 Registry가 없다."** 의사결정 로직이 **`Decisioning`(세그먼트 추천)·`AutoRecommend`(채널 추천·학습)·`Mmm`(예산 최적화)·`PriceOpt`(가격 결정)·`RuleEngine`(임계 규칙)·`AutoCampaign`(자율 실행)·`JourneyBuilder`(여정 결정·054 소관)** 7개에 분산되어 **각자 자기 추천·자기 규칙·자기 실행 로그**를 가진다. 따라서 §6 "모든 의사결정 자산은 **Enterprise Decision Registry** 기준"·§7 "모든 의사결정은 **추적 가능**"이 **미충족** — **"오늘 이 테넌트에서 어떤 의사결정이 몇 건 났고 무엇이 승인/거부/보류됐는가"를 답할 단일 지점이 없다**. ★★따라서 본 Part의 위험은 "중복 신설"보다 **"8번째 엔진을 만드는 것"**이며, Decision Platform은 **기존 7개 위의 얇은 통합 계층(Registry+표준 계약+뷰+디스패처)**이어야 한다.
★**실재(정직 인정·평가절하 금지)**: ① **★ROI 최적화가 수식 수준으로 실동작** — `Mmm::frontier`(:349~352)가 **한계이익 수식**(:281 `margin_c·(β/κ)·exp(−x/κ)−1`·`x*_c=κ·ln(margin_c·β/κ)`·`T*=Σx*_c`·`profitOptSpend`:337~338)으로 **적정 총예산 T\*·PROFIT(T) 곡선·증액여력**을 산출(:386~391·:437)하고 **모델·원가 없으면 `optimized:false`+사유 정직 반환**(:375 `frontierNoModel`·:378 `frontierNoCost`+`needs:sku_cost`) → **§10 "최적화 결과는 정량적 근거를 제공해야 한다" 충족** ② **가격 결정 스택 완비** — `PriceOpt` 탄력성(:81)·**추천**(:91)·**시뮬레이션**(:105)·**리프라이서 규칙**(:121)·**실행 이력**(:132)·경쟁사(:114)·캘린더(:137) ③ **폐루프 학습 추천** — `AutoRecommend` 벤치마크(:114)·**학습 prior**(:185)·**`learnFromOutcomes`**(:247)·`channelEffectiveness`(:369)·`recommend`(:506) ④ **세그먼트 추천·우선순위** — `Decisioning`(:432·ROAS/CPA 산출:466~470·ROAS 정렬 상위 N:486~487) ⑤ **규칙 평가·daypart·frequency** — `RuleEngine`(:41~66·`evaluateAll`:181) ⑥ **★자율 실행 + 정직 보류** — `AutoCampaign`(:345~350: agent_mode=auto면 사람 클릭 없이 추천→실행하되 **킬스위치·결제수단·딜리버리 미충족 시 활성화 보류 + 사유 반환**) ⑦ **승인 정책** — `agent_mode` 3모드 기본 approval fail-safe(054:42~50)·2인 정족수(`Alerting` 054/056:602·:626~632) ⑧ **What-if 5레버** — `PnLDashboard.jsx`(:538~556 매출/광고비/원가/배송비/반품비 → 즉시 순이익·마진 재계산·**클라이언트**) ⑨ **실행 로그 4종** — `optimization_log`(`AutoCampaign`:77)·`rule_engine_log`(`RuleEngine`:47)·`po_repricer_history`(`PriceOpt`:132)·`journey_node_logs`(054) ⑩ Explainable 공시(`Decisioning` 056:477~481)·Risk drivers(056)·테넌트 fail-closed·전역 writeGuard·해시체인 감사.
★**ABSENT(grep 0·부재증명 완료·축소 금지)**: **Enterprise Decision Registry**(§6 근간) · **Canonical Entity 15종 형식 계약 전량**(DECISION·DECISION_REQUEST·**DECISION_VERSION**·DECISION_ANALYTICS 등) · 통합 Decision Engine/Analytics Platform/Monitoring Dashboard/Governance Manager/Audit Service/AI Decision Advisor · **Business Rule Engine(§9) 대부분**(**Rule Versioning·Simulation·Validation·Deployment·Conflict Detection·Optimization·Analytics** — ★"모든 Rule은 **버전과 변경 이력**을 관리한다" **미충족**) · **Multi-Criteria Analysis(형식)·Scenario Comparison(서버 통합)** · **Resource·Schedule·Route Optimization** · Decision Policy 6종·Compliance Validation · **Decision Data Encryption·형식 ACL**("승인된 사용자만 접근") · **API 8종·Event 8종 전량** · §17 Scenario Simulation(통합)·KPI Impact Analysis(형식)·Responsible Decision Validation · 성능 SLA(§18).
★**정직 구분(057 규율 승계)**: §18 성능 요구(Decision Evaluation ≤500ms·Rule Execution ≤100ms·Decision API ≤300ms)는 **측정 장치 부재** → **"미달"이 아니라 "측정 기반 부재"**. 계측은 **`SystemMetrics` 확장**으로(057 D-1·별도 수집기 금지).
★**오흡수 금지(동음이의 실측)**: **`whatif` 11히트 = `PnLDashboard.jsx`(:538~556) 클라이언트 슬라이더**(실재하나 **서버 Decision Optimization 서비스 아님**) · **`autonomous` 1히트 = `AIInsights.jsx`(:599) 마케팅 카피**("Autonomous orchestration, real-time predictive analytics…")**≠자율 운영 구현**(054 확정과 동일) · `RuleEngine`(metric/op/threshold 임계값)≠**Business Rule Engine**(버전·시뮬레이션·충돌탐지 갖춘) · **`rule_engine_log`(실행 로그)≠Rule 변경 이력**(`rule_engine`은 UPDATE 덮어쓰기·현재값만) · `Decisioning`(v418.1 **광고 세그먼트 추천**)≠Enterprise Decision Intelligence 플랫폼 · `AutoCampaign`(**캠페인** 자동화)≠Autonomous **Business** · `Mmm::frontier`(**마케팅 예산** 최적화)≠범용 Decision Optimization · `JourneyBuilder`(**마케팅 여정**·**054 소관**)≠비즈니스 의사결정 엔진 · `Risk`(**사업** 리스크·056 확정)≠Decision Risk Assessment · `po_simulations`(**가격** 시뮬레이션)≠통합 Scenario Simulation · `SecurityAudit`(보안 감사)≠DECISION_AUDIT 엔티티.
★**강점 정직 기술(후퇴 금지)**: 명세 §11 "자율 운영은 **승인 정책을 준수**해야 한다"·§17 "AI는 **승인 정책 없이 중요 경영 의사결정을 자동 확정**하거나 기업 정책을 변경하지 않는다"는 **현행이 구조적으로 충족** — ⓐ자율 실행은 **`agent_mode='auto'` + 킬스위치 + 결제수단·딜리버리 게이트 통과 시에만**이고 미충족 시 **정직 보류+사유 반환** ⓑ**기본값은 approval**(fail-safe) ⓒ**기업 정책이 문서/코드**라 AI가 변경할 대상이 없다(056 D-7) ⓓ파괴적 액션은 **제안-only+HITL**(054 D-2) ⓔ승인 필요 액션은 **2인 정족수**. 코드 변경 0.

## ★★핵심 설계 제약 7종 (구현 착수 시 필수)
1. **8번째 결정 엔진 신설 금지**(D-1) — 추천/최적화/규칙/승인/실행 로그 **전부 기존 정본 재사용**. 통합 Engine은 **디스패처**.
2. **실행 로그 원본 파괴 금지**(D-1) — 기존 4종을 **DECISION_EXECUTION 뷰/참조로 통합**(원본 유지=무회귀).
3. **통합 Engine도 자율 실행 게이트 반드시 경유**(D-4) — `agent_mode`·킬스위치·결제수단/딜리버리 게이트 우회 시 **명세 §11/§17 + 헌법 V5 동시 위반**.
4. **Rule Simulation은 실 액추에이터 호출 금지**(D-3) — 드라이런 격리·킬스위치/`agent_mode` 우회 금지.
5. **Rule Conflict Detection은 `AdAdapters` 진입점에서 최종 상충 검사**(D-3) — 현행은 다중 규칙 동시 발화 시 **상충 액션(예산 증액 vs 캠페인 중지)을 막을 장치가 없다**. 중복 게이트 신설 금지.
6. **산출 불가 시 0/임의값이 아니라 명시적 미산출+사유**(D-2) — `Mmm::frontier`의 `optimized:false`+사유 패턴 승계(057 "0은 정상으로 오독" 규율과 동일).
7. **Decision API는 인증 필수 접두 + 테넌트 격리 절대**(D-6) — 의사결정 데이터에는 **예산·가격·마진·탄력성**이 담겨 노출 시 **영업 기밀 유출**. 감사는 `SecurityAudit` 확장이되 **고빈도 결정 로그는 앵커링**(체인 직접 유입 금지).
※ 부가: What-if 서버 승격 시 **클라이언트 즉시성 유지**(하이브리드)·기존 프론트 계산 제거는 회귀(D-5).

## 상속·다음
- **상속**: **051~057 전체** — 특히 **054(Agent/Autonomous Workflow)와 경계가 겹치며 재판정 금지**(054=실행 계층, 058=Decision 계층) + 헌법 V4/V5 + 데이터 헌법 V3 + `CHANGE_GATE` + Security(047~049) + Observability(046/057) + 가용성(044/045/050) + API GW(042) + EPIC 06-A.
- **다음**: **MEA Part 059 — Enterprise Digital Twin, Simulation & Scenario Intelligence Architecture**(명세 지정). ★예상 조사 후보=`PriceOpt`(`po_simulations`:105)·`PnLDashboard.jsx`(What-if:538~556)·`Mmm`(PROFIT(T) 곡선)·`DemandForecast`·`JourneyBuilder`(Thompson)·`WmsCctv`(온프렘 브리지). ★**부재 예상은 반드시 grep 부재증명 후 판정**(053 선례 — 가설이 대부분 틀렸음). ★오흡수 사전 주의: `po_simulations`(가격 시뮬레이션)≠Digital Twin · What-if 슬라이더≠Simulation Engine · `Mmm` 이익곡선≠Scenario Intelligence · **`WmsCctv`(CCTV 브리지)≠물리 Digital Twin**.

## ★AI Platform 진행 (Part 051~058)
Part 051 AI Foundation(PARTIAL) · 052 ML & MLOps(ABSENT-heavy) · 053 GenAI/LLM/Prompt(PARTIAL·**호출경로 2개 병존**) · 054 AI Agent(PARTIAL-strong·**AI 시리즈 실재도 최고**) · 055 Knowledge/Vector/RAG(PARTIAL-weak) · 056 AI Governance(PARTIAL-weak·**"규범은 문서에 있고 기계 집행이 없다"**) · 057 AI Analytics/Observability/Ops(PARTIAL-weak·**`SystemMetrics`가 AI 미프로브**) · **058 AI Decision Intelligence & Autonomous Business(★PARTIAL — 054 다음으로 실재도 높음 · ROI 프론티어 수식·가격 스택·폐루프 학습·What-if·정직 보류 실재 / ★★"결정 엔진이 7개인데 통합 Registry가 없다")** → 다음 **059 Digital Twin/Simulation/Scenario Intelligence**.
★**AI 시리즈 반복 결론**: 053(Gateway 부재) → 056(감사 구멍) → 057(AI 미프로브) → **058(Decision 파편화)**. 앞의 셋은 **같은 뿌리(단일 통과점 부재)**이고, 058은 **같은 병리의 의사결정판**이다. **통합 계약(Gateway·감사·계측·Decision Registry)이 AI 시리즈 전체의 일관된 처방**이며 **053 Gateway 일원화가 실 구현 1순위**다.
