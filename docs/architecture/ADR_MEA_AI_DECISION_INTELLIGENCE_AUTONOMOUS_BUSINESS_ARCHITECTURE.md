# ADR — MEA Part 058 Enterprise AI Decision Intelligence & Autonomous Business Architecture

> **거버넌스 상태**: 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-22).
> ★부재증명 완료(**단어경계 `\b` 적용**)·오흡수 금지·과대주장 금지·**부재 축소 금지**·헌법 V4/V5·데이터 헌법 V3·`CHANGE_GATE` 우선. **★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.**
> ★**Part 054 판정 상속·재판정 금지**·**경계 고정: 054=Agent/Workflow 실행 계층, 058=Decision 계층**(056 cross-cutting 규율 승계).

## Context
MEA Part 058은 데이터·모델·Agent·Rule·KPI·ROI를 기반으로 최적 의사결정을 지원하고 자율 비즈니스 운영을 가능하게 하려 한다. GeniegoROI에는 **도메인별 의사결정·최적화 스택이 다수 실재**한다: **ROI 최적화**(`Mmm::frontier`:349~352 — 한계이익 수식 :281 `margin_c·(β/κ)·exp(−x/κ)−1`·`x*_c=κ·ln(margin_c·β/κ)`·`T*=Σx*_c`·`profitOptSpend`:337~338 → **적정 총예산 T\*·PROFIT(T) 곡선·증액여력**:386~391·:437), **가격 결정 스택**(`PriceOpt` 탄력성:81·추천:91·시뮬레이션:105·리프라이서 규칙:121·실행 이력:132), **폐루프 학습 추천**(`AutoRecommend` 벤치마크:114·학습 prior:185·`learnFromOutcomes`:247·`recommend`:506), **세그먼트 추천·우선순위**(`Decisioning`:432·:466~487), **규칙 평가**(`RuleEngine`:41~66·`evaluateAll`:181), **자율 실행 + 정직 보류**(`AutoCampaign`:345~350), **승인 정책**(`agent_mode` 054:42~50·`Alerting` 2인 정족수:602), **What-if 5레버**(`PnLDashboard.jsx`:538~556·클라이언트), **실행 로그 4종**(`optimization_log`:77·`rule_engine_log`:47·`po_repricer_history`:132·`journey_node_logs`).
반면 **통합 계층은 전면 부재**: Enterprise Decision Registry·Canonical Entity 15종 형식 계약·Rule Versioning/Simulation/Conflict Detection·Multi-Criteria(형식)·Decision Policy 객체·API 8종·Event 8종(전부 grep 0·부재증명 완료).

## D-1 ★★본 Part의 성격 — "결정 엔진이 없다"가 아니라 "7개인데 통합 Registry가 없다"
**결정**: 의사결정 로직이 **7개 이상 핸들러에 분산**되어 있고 **각자 자기 추천·자기 규칙·자기 실행 로그**를 가진다 — `Decisioning`(세그먼트 추천)·`AutoRecommend`(채널 추천·학습)·`Mmm`(예산 최적화)·`PriceOpt`(가격 결정)·`RuleEngine`(임계 규칙)·`AutoCampaign`(자율 실행)·`JourneyBuilder`(여정 결정·054 소관).
★따라서 명세 §6 "모든 의사결정 자산은 **Enterprise Decision Registry**를 기준으로 관리"·§7 "모든 의사결정은 **추적 가능**해야 한다"는 **미충족**이다 — 개별 결정은 남지만 **"오늘 이 테넌트에서 어떤 의사결정이 몇 건 났고 무엇이 승인/거부/보류됐는가"를 답할 단일 지점이 없다**.
★★**본 Part의 위험은 "중복 신설"보다 "8번째 엔진을 만드는 것"이다.** Decision Platform은 **새 결정 로직이 아니라 기존 7개 위의 얇은 통합 계층(Registry + 표준 계약 + 뷰 + 디스패처)**이어야 한다(헌법 V4 단일 Intelligence Layer·[[feedback_no_duplicate_features]]).
★**실행 로그 통합 방식**: 기존 4종을 **파괴하지 말고 DECISION_EXECUTION 뷰/참조로 통합**한다(원본 테이블 유지=무회귀·[[feedback_no_regression_value_unification]]).

## D-2 ★ROI 최적화는 이미 정량 근거를 제공한다 — `Mmm::frontier` 정본·중복 최적화기 금지
**결정**: 명세 §10 "최적화 결과는 **정량적 근거를 제공**해야 한다"는 **이미 충족**된다. `Mmm::frontier`(:349~352)가 **한계이익 수식**(:281)으로 채널별 이익최적 지출과 **적정 총예산 T\***·**PROFIT(T) 곡선**·**증액여력**을 산출하고(:386~391·:437), **모델 또는 원가가 없으면 `optimized:false` + 사유를 정직 반환**한다(:375 `frontierNoModel`·:378 `frontierNoCost`+`needs:sku_cost`).
★**이 패턴이 본 저장소의 모범**이다([[feedback_real_value_autoderive]]). 신규 결정/최적화 지표도 **산출 불가 시 0이나 임의값이 아니라 명시적 미산출 + 사유**로 반환한다(057 D-2 "0은 정상으로 오독된다"와 동일 규율).
★**중복 최적화기 신설 금지**: ROI=`Mmm::frontier`, 가격=`PriceOpt`, 수요=`DemandForecast`가 정본이며 통합 Optimizer는 **디스패처**여야 한다. ★**오흡수 금지**: `Mmm::frontier`는 **마케팅 예산 최적화**이지 범용 Decision Optimization이 아니다(§10 Resource/Schedule/Route Optimization은 **grep 0·순신설**).

## D-3 ★Business Rule Engine — 임계 규칙은 실재, 버전·시뮬레이션·충돌탐지는 결여(중복 아닌 보강)
**결정**: `RuleEngine`(metric/op/threshold/action :41~46·`saveRule`:111·`toggleRule`:137·`evaluateAll`:181)과 `po_repricer_rules`(`PriceOpt`:121)는 **규칙 정의·평가가 실동작**한다. 그러나 명세 §9 "모든 Rule은 **버전과 변경 이력**을 관리한다"는 **미충족**이다 — `rule_engine`은 **현재값만 보관**(UPDATE 덮어쓰기)이고 **`rule_engine_log`(:47)는 실행 로그이지 변경 이력이 아니다**(오흡수 금지·정직 표기).
★**Rule Versioning은 append-only 이력 테이블 신설**이 정본 경로이며, 이는 **중복이 아니라 결여 보강**이다(기존 `rule_engine`은 현재값 뷰로 유지=무회귀).
★**Rule Conflict Detection**은 실제 위험을 다룬다 — 현행은 다중 규칙 동시 발화 시 **상충 액션(예: 예산 증액 vs 캠페인 중지)을 막을 장치가 없다**. 설계 시 **`AdAdapters` 액추에이터 진입점에서 최종 상충 검사**(중복 게이트 신설 금지·054 액추에이터 정본 재사용).
★**Rule Simulation 필수 제약**: 시뮬레이션이 **실 액추에이터를 호출하면 안 된다**(드라이런 격리). `AutoCampaign`/`AdAdapters` 실행 경로와 명확히 분리하고 **킬스위치·`agent_mode` 게이트를 우회하지 않을 것**.

## D-4 ★★자율 실행 게이트는 후퇴 금지 — 통합 Engine도 반드시 경유
**결정**: 현행 자율 실행은 **`agent_mode='auto'` + 킬스위치 + 결제수단·딜리버리 게이트 통과 시에만** 활성화되고, 미충족 시 **캠페인은 생성하되 활성화를 보류하고 사유를 반환**한다(`AutoCampaign`:345~350·279차 사용자 요구 반영분). 기본값은 **approval**(fail-safe·054:42~50)이며 승인 필요 액션은 **2인 정족수**(`Alerting`:602·approved만 집행:626~632).
★이는 명세 §11 "자율 운영은 **승인 정책을 준수**해야 한다"·§17 "AI는 **승인 정책 없이 중요 경영 의사결정을 자동 확정**하지 않는다"를 **이미 충족**한다.
★★**후퇴 금지 자산**: 통합 Decision Engine이 **직접 실행하는 설계는 이 게이트를 반드시 경유**해야 한다 — 우회하면 **명세 §11/§17 + 헌법 V5 동시 위반**이다([[feedback_no_regression_value_unification]]·[[feedback_deploy_approval_mandatory]]).
★**"중요 경영 의사결정"의 범위를 넓힐수록**(예산 재배분·가격 변경·재고 발주) **승인 게이트를 더 엄격히** 적용한다.

## D-5 ★What-if는 클라이언트에 실재 — 서버 승격 시 즉시성 상실 금지
**결정**: `PnLDashboard.jsx`(:538~556)에 **5레버 What-if**(매출/판매량·광고비·원가(COGS)·배송비·반품비)가 실재하며 **현재 순이익 대비 시나리오 순이익·시나리오 마진을 즉시 재계산**한다. 다만 **클라이언트 즉석 계산**이며 **서버 Decision Optimization 서비스가 아니다**(오흡수 금지·정직 표기).
★서버 승격 시 **슬라이더 즉시 반응(클라이언트 계산)을 유지한 하이브리드**로 설계하고, **기존 프론트 계산을 제거하면 회귀**다. 서버측은 **저장·공유·시나리오 비교(§8 Scenario Comparison)** 를 담당한다.

## D-6 ★Decision 데이터 보안 — 테넌트 격리 절대 + 인증 필수 접두
**결정**: 의사결정 데이터에는 **예산·가격·마진·탄력성**이 담긴다 — 교차 노출 시 **영업 기밀 유출**이다. **테넌트 격리 절대**([[reference_platform_growth_actas_tenant_hijack]]·`Risk`:15~18 fail-closed 패턴 준수)·전역 writeGuard 상속(056:72~75).
★**Decision API는 전량 인증 필수 접두**에 배치한다 — 공개 bypass 접두에 얹으면 **경영 의사결정이 무인증 노출**된다(053 D-5·057 D-7 교훈)·`/api` 변형 동시 등재([[reference_api_prefix_routing]]).
★**DECISION_AUDIT**은 **새 해시체인이 아니라 `SecurityAudit` 확장**(056 D-3)이되, **고빈도 결정 로그를 체인에 직접 넣지 말고**(체인 붕괴·057 D-4) **구간 앵커링**으로 무결성을 보장한다.
★**Decision Data Encryption**(`Crypto` 049 재사용)·**형식 ACL**("승인된 사용자만 접근")=순신설.

## D-7 ★성능은 "미달"이 아니라 "측정 기반 부재" — 계측은 `SystemMetrics` 확장으로
**결정**: §18(Decision Evaluation ≤500ms·Rule Execution ≤100ms·Recommendation ≤2s·Decision API ≤300ms·99.99%)은 **측정 장치가 없어 판정 불가**다 — **"미달"이 아니라 "측정 기반 부재"**로 기술한다(057 규율 승계).
★계측 도입 시 **별도 수집기 신설 금지** — **`SystemMetrics`에 Decision 프로브를 추가**한다(057 D-1 동일 결정). 이는 **057에서 확인한 "AI 미프로브" 공백과 같은 해법**이며, **053 Gateway 일원화 → 056 감사 통일 → 057 AI 프로브 → 058 Decision 프로브**가 하나의 연속된 작업이다.

## Consequences
- 코드 변경 0·NOT_CERTIFIED. ★판정=**PARTIAL** — AI 시리즈에서 **054 다음으로 실재도가 높다**. 도메인별 의사결정·최적화 스택은 다수 실재하나 **통합 Decision Registry·Engine·Rule 거버넌스는 전면 부재**.
- ★중복 금지 재사용: `AutoRecommend`·`Decisioning`·**`Mmm`(ROI 최적화 정본)**·`PriceOpt`·`RuleEngine`·`AutoCampaign`·`AdAdapters`·`DemandForecast`·`Onsite`·`JourneyBuilder`/`Alerting`(054 정본)·`ClaudeAI`(053)·`Risk`/`SecurityAudit`(056)·`SystemMetrics`(057)·`Crypto`/`index.php`.
- ★순신설: **Enterprise Decision Registry**·Canonical Entity 15종 표준 계약·통합 Decision Engine(**디스패처**)·**Rule Versioning/Simulation/Validation/Deployment/Conflict Detection/Optimization/Analytics**·**DECISION_VERSION**·Multi-Criteria(형식)·Scenario Comparison(통합)·**Resource/Schedule/Route Optimization**·Decision Policy 6종·Compliance Validation·Decision Analytics/Dashboard/Advisor·Decision Data Encryption·형식 ACL·**API 8종·Event 8종**.
- ★오흡수 금지: **`whatif` 11히트=`PnLDashboard.jsx`(:538~556) 클라이언트 슬라이더≠서버 Decision Optimization 서비스** · **`autonomous` 1히트=`AIInsights.jsx`(:599) 마케팅 카피**("Autonomous orchestration…")**≠자율 운영 구현** · `RuleEngine`(metric/op/threshold)≠**Business Rule Engine**(버전·시뮬레이션·충돌탐지) · **`rule_engine_log`(실행 로그)≠Rule 변경 이력** · `Decisioning`(v418.1 광고 세그먼트)≠Decision Intelligence 플랫폼 · `AutoCampaign`(캠페인 자동화)≠Autonomous **Business** · `Mmm::frontier`(마케팅 예산)≠범용 Decision Optimization · `JourneyBuilder`(마케팅 여정·**054 소관**)≠비즈니스 의사결정 엔진 · `Risk`(사업 리스크·056)≠Decision Risk Assessment · `po_simulations`(가격)≠통합 Scenario Simulation · `SecurityAudit`≠DECISION_AUDIT 엔티티.
- ★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·승인 정책 없는 중요 경영 의사결정 자동 확정·기업 정책 변경 불가(헌법 V5+`CHANGE_GATE`+배포 승인). Part 042/044/046/047/048/049/**051~057**·EPIC 06-A 상속·**재판정 금지**·재감사 금지(287/288차 `action_request` 생산자·279차 auto 모드 확정분).
