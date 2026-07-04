# AnalyticsRegistry — 분석 산출 엔진/지표 레지스트리

> 산출 로직 SSOT. 신규 분석 지표 착수 전 여기+IMPLEMENTATION_STATUS §3/§4 확인(중복 산출 금지). 프론트는 백엔드 산출 재사용(이중구현 금지).

| 도메인 | 엔진(정본 file) | 산출 |
|--------|----------------|------|
| 정산/P&L | `OrderHub::rollupSettlementsCore` | 서버집계·kr_fee_rule·취소제외·실정산우선·늦은반품 원월귀속(SSOT) |
| 롤업 | `Rollup.php` | 주문수=행수·productChannelMatrix(CAC/CTR/profit_roi)·어트리뷰션 dedup |
| 어트리뷰션 | `AttributionEngine.php` | 6모델MTA·markov removal·Shapley-exact·뷰스루(vt_window/VTC)·blended·geo-holdout·lift(z검정) |
| MMM | `Mmm.php` | MCMC(Metropolis-Gibbs)·adstock λ·Hill포화·R-hat·ESS/MCSE·accept_rate·DECOMP.RSSD·backtest |
| ROAS 진실 | `Connectors::roasReconciliation` | 매체보고 vs 실주문 truthRatio(취소제외) |
| CRM 예측 | `CRM::addPredictiveScores`·`CustomerAI` | churn_prob/predicted_clv 생존모델·RFM·productAffinity |
| 리포트 | `Reports.php` | 피벗·사용자메트릭·totals 가중합계·드릴다운 |
| 가격 | `PriceOpt` | 탄력성(qty)·Buybox·velocity·경쟁가harvest |
| 수요 | `DemandForecast` | ABC·안전재고·일별 forecast+sigma·dead-stock |

## 원칙
- 산출 SSOT는 백엔드. 프론트는 배선/렌더만(알고리즘 프론트 존재 시 백엔드는 데이터만 제공).
- 취소/반품 제외 형제 대칭(realRevMap·roasRecon·journeys·productPerf 일관).
- 하드코딩 파생지표는 IS_DEMO 게이트 필수(운영 유출 금지).

## 갱신 규칙
신규/변경 분석 엔진·지표 append. 산출 변경 시 소비처(UI/API/자동화 의사결정) 파급 확인(Impact Analysis Analytics 차원).
