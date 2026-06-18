# EXISTING_FEATURE_MAP.md

GeniegoROI 기존 기능 전수 매핑 — "AI Profit Intelligence Operating System" 초고도화 착수 전 분석

- 작성일: 2026-06-18 · 기준: E:\project\GeniegoROI HEAD `ec389a9` (231차)
- 방법: 3개 병렬 탐색 에이전트(Profit/Twin/Graph/Dashboard · AI/Agent/Closed-Loop · Governance/Benchmark/Security) + 본 세션 직접 감사
- **핵심 결론**: OS 12개 영역의 **측정(Measure)·분석(Analyze) 인프라는 거의 완성**돼 있고, **폐쇄루프(감지→추천→승인→실행→학습)도 ~80% 구축**됨. 따라서 작업은 **신규 생성이 아니라 기존 구조의 통합·상위 레이어 추가**다. 신규 메뉴/대시보드/Agent/ROI 핸들러를 만들 필요가 없다.

> 17개 핵심 핸들러(Rollup·OrderHub·Attribution·AttributionEngine·AnomalyDetection·Decisioning·AutoRecommend·AutoCampaign·GraphScore·ClaudeAI·CustomerAI·AiGenerate·DemandForecast·Mmm·Insights·ModelMonitor·Risk) **전부 존재 확인**.

---

## OS 5단계 ↔ 기존 기능 매핑 (한눈에)

| 단계 | 이미 있는 것 | 통합/상위 레이어 갭 |
|------|-------------|---------------------|
| **Measure(측정)** | Rollup·OrderHub(COGS·배송비)·performance_metrics·channel_orders·정산·WMS·픽셀 | (없음 — 완성) |
| **Analyze(분석)** | PnLDashboard 순이익 워터폴·AnomalyDetection(SPC)·AttributionEngine(markov)·Mmm(반응곡선)·GraphScore·Decisioning | Profit Health Score·Root Cause 인과추론 |
| **Decide(의사결정)** | AutoRecommend(다목표·베이즈·UCB·가드레일)·Mmm.optimize·PriceOpt.simulation·ClaudeAI(언어추천) | 통합 What-if 시나리오·Executive Copilot 단일 진입 |
| **Execute(실행)** | action_request(2단계 승인)·Alerting.executeAction·AdAdapters(Meta/Google/TikTok/Naver)·Approvals.jsx | Agent 권한모드(Recommend/Approval/Auto) |
| **Learn(학습)** | audit_log·Db::audit(231차)·optimization_log·channel_benchmark(cold→warm 실측) | ROI 공식 버저닝·전후 비교 표준화 |

---

## 영역별 상세 (12 영역)

### 1. Profit Operating System
- **백엔드**: `Rollup.php`(v423 집계) · `OrderHub.php`(주문·취소/반품 SSOT·서버 COGS·배송비) · `RoiService.php`(ROI/ROAS) · `Mmm.php`(반응곡선·예산최적화)
- **프론트**: `PnLDashboard.jsx`(순이익 워터폴 8탭) · `GlobalDataContext.jsx` pnlStats(단일소스 파생) · `RollupDashboard.jsx`
- **라우트**: `/v423/rollup/*` · `/v424/mmm/*` · `/v424/orderhub/*`
- **DB**: channel_orders · performance_metrics · marketing_roi · orderhub_settlements · kr_fee_rule(배송비·threshold)
- **성숙도**: 측정·분석 완성(매출−COGS−수수료−배송−반품 워터폴). **미구현: Profit Health Score / Risk / Opportunity / Action Tracking / Learning Loop**
- **초고도화 포인트**: PnLDashboard에 **ProfitHealthScore 탭** 추가(기존 워터폴·returnRate 경보 재사용). 신규 ROI 메뉴 금지.

### 2. Enterprise Digital Twin / What-if Simulation
- **백엔드**: `PriceOpt.php`(탄성도·po_simulations) · `Mmm.php`(`/v424/mmm/optimize` 예산배분) · `DemandForecast.php`(Holt-Winters)
- **프론트**: `PriceOpt.jsx` · `MarketingMix.jsx`(채널 시뮬) · `DemandForecast.jsx` · `PnLDashboard` ForecastTab
- **성숙도**: 가격·마케팅·수요 **부분 시뮬 존재**. **미구현: 통합 시나리오(광고비±·배송비±·반품률± → 순이익 영향)·Scenario Compare**
- **초고도화 포인트**: PnLDashboard ForecastTab에 **Scenario Builder 통합**(Mmm.optimize + PriceOpt.simulation API 이미 분리됨 → 통합만). 신규 Digital Twin 메뉴 금지.

### 3. Profit Knowledge Graph
- **백엔드**: `GraphScore.php`(graph_node/graph_edge) · `AttributionEngine.php`(6모델·markov removal-effect) · `Attribution.php`(터치/쿠폰/딥링크)
- **프론트**: `PnLDashboard` Attribution 탭(GraphScore 전용 페이지 없음)
- **DB**: graph_node · graph_edge · attribution_touch · attribution_result
- **성숙도**: 노드/엣지·MTA 귀속 존재. **미구현: 순이익 가중 그래프(margin·배송비·반품비 반영)**
- **초고도화 포인트**: GraphScore 엣지 가중치에 **순이익 기여** 추가(기존 graph_edge.weight 확장). 신규 그래프 메뉴 불요.

### 4. Root Cause Intelligence
- **백엔드**: `AnomalyDetection.php`(SPC μ±kσ·Western Electric) · `Decisioning.php`(세그먼트·추천) · `AttributionEngine`(채널 기여)
- **프론트**: `PnLDashboard` Anomaly 탭 · `PerformanceHub.jsx`
- **성숙도**: 이상 **탐지** 완성. **미구현: 인과추론(profit drop → 어느 비용/채널?)·자동 처방 액션**
- **초고도화 포인트**: AnomalyDetection 이상점 → **원인 분해(워터폴 델타 기여) + action_request 추천 연결**(인프라 기존). 신규 핸들러 불요.

### 5. Enterprise Dashboard 통합(역할별 View)
- **현존**: `Dashboard.jsx`(8탭) · `PnLDashboard` · `RollupDashboard` · `PerformanceHub` · `OperationsHub` · `DataTrustDashboard` · `SystemMonitor` · `MarketingMix`
- **성숙도**: 대시보드 **완성**, **역할별(CEO/CFO/CMO/COO) 분화 미흡**(tabPlanPolicy는 플랜 게이팅만)
- **초고도화 포인트**: 기존 대시보드에 **role-view 프리셋**(탭 필터)로 통합. 신규 대시보드 금지.

### 6. Closed Loop Optimization
- **백엔드**: 감지 `Alerting.php`(alert_policy·condition_tree) → 추천 `AutoRecommend.php` → 승인 `action_request`(2단계 approvals_json) → 실행 `Alerting.executeAction`+`AdAdapters.php` → 학습 `audit_log`+`optimization_log`
- **프론트**: `Approvals.jsx`(승인 모달) · `AutoMarketing.jsx`
- **성숙도**: **폐쇄루프 ~80% 완성**. 갭: Alerting cron 명확화 · AutoCampaign.optimize 호출경로 · AIRuleEngine 백엔드(데모전용)
- **초고도화 포인트**: 기존 루프 **연결 강화**(cron 등록·상태 동기). 신규 실행 Agent 금지.

### 7. Executive AI Copilot
- **백엔드**: `ClaudeAI.php`(실 Claude API·analyze·marketing-insight·campaign-search) · `CustomerAI.php`(churn/LTV) · `Decisioning.php` · `AiGenerate.php`
- **프론트**: `AIInsights.jsx`(질의응답·실시간 스트림) · `AIRuleEngine.jsx`
- **DB**: ai_settings(테넌트 BYO Claude 키) · app_setting(전역 키)
- **성숙도**: 실 AI 분석 70-80%. **미구현: 근거+KPI연결+원인+추천액션+실행승인+결과추적의 단일 Copilot 흐름**
- **초고도화 포인트**: `AIInsights`를 **Executive Copilot**으로 확장(ClaudeAI + pnlStats + AnomalyDetection + action_request 연결). 신규 AI 메뉴 금지.

### 8. Autonomous Profit Agent
- **백엔드**: Observe(`AnomalyDetection`)→Diagnose(`Alerting`/`Mmm`)→Plan/Recommend(`AutoRecommend`)→Approve(`action_request`)→Execute(`AdAdapters`)→Verify(`optimization_log`)→Learn(`audit_log`)
- **성숙도**: 루프 초안 60%. **미구현: 권한모드(Recommend Only/Approval Required/Auto Execute)** — `app_user.agent_mode` 컬럼+게이트 부재
- **초고도화 포인트**: `app_user.agent_mode` 컬럼 추가 + AdAdapters 실행 전 모드 게이트(기본 Approval Required). 신규 Agent 금지.

### 9. Profit Governance & Trust Layer
- **백엔드**: `audit_log`+`Db::audit`(231차) · `Mapping.php`(감사) · `ModelMonitor.php`(ml_models·drift)
- **프론트**: `DataTrustDashboard.jsx`(품질·신선도·완전성) · `Audit.jsx`(감사로그·CSV)
- **성숙도**: 데이터 품질·감사 중급. **미구현: KPI Registry(DB)·Metric Dictionary·Data Lineage·ROI Formula Versioning·Agent Decision Trace**
- **초고도화 포인트**: KPI/메트릭을 **DB 메타로 외부화** + ROI 공식 버전 테이블. DataTrustDashboard 확장. 신규 메뉴 불요.

### 10. Enterprise Benchmark Engine
- **백엔드**: `AutoRecommend.php`(CHANNEL 6채널·AFFINITY 18업종) · `channel_benchmark` 테이블(cold seed→warm 실측) · `MarketingDataHub.php`
- **성숙도**: 채널·업종 벤치마크 중급(전역 익명 구조). **미구현: 국가별·신뢰도 점수·벤치마크 vs 실측 UI 구분**
- **초고도화 포인트**: channel_benchmark에 country 차원 + 표본수/신뢰도. **가짜 하드코딩 금지·내부 익명 집계 유지**.

### 11. (= 영역 5 Dashboard 통합 참조)

### 12. Security / Compliance — `SECURITY_REVIEW.md` 참조 (요약: 멀티테넌트·암호화·감사·MFA·RBAC 견고, ABAC/SSO/일반 rate-limit/CSRF토큰/응답표준 갭)

---

## 발견된 중복/정리 후보 (→ DUPLICATE_AUDIT_REPORT.md 반영)
- `Attribution.php`(v419 단일터치) vs `AttributionEngine.php`(v424 MTA): 프론트는 v424만 사용 → v419 레거시 정리 검토(이미 본 세션 감사에서 역할분리로 판정, 폐기 아닌 디프리케이트).
- KPI/메트릭이 `AutoRecommend.php` 소스 상수에 하드코딩 → DB 외부화(중복 아닌 거버넌스 갭).
- API 응답 봉투 비표준(TemplateResponder 단순 json) → `{success,data,message,error,meta}` 표준화(본 세션 1-4에서 "인라인=TemplateResponder 동일" 확인됨 → 표준화는 봉투 래퍼 신설 필요).

## 결론
**OS의 90%는 이미 존재**한다. 남은 일은 (a)상위 통합 레이어(Health Score·통합 What-if·Root Cause 처방·역할별 View·Copilot·Agent 권한모드) 추가 (b)거버넌스/보안 갭 보강이며, **전부 기존 핸들러·페이지·테이블 확장**으로 달성한다. → `AI_PROFIT_OS_ARCHITECTURE.md`, `REMAINING_GAPS.md` 참조.
