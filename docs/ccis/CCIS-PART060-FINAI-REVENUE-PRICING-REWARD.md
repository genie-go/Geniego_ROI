# GeniegoROI Claude Code Implementation Specification

# CCIS Part060 — Enterprise FinAI, Revenue Intelligence, Pricing Optimization & Monetary Reward Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise FinAI·Revenue Intelligence·Pricing Optimization·Monetary Reward 표준을 수립한다.

> ★**성격(★Part031/055 중복 — 수익/가격/리워드 강함=핵심 경쟁력)**: 본 Part 는 **CCIS Part031(재무/회계)·
> 055(의사결정/예측)와 중복**되며 그 판정을 승계한다. ★**수익 인텔리전스·가격 최적화·리워드는 이 저장소의
> 핵심 경쟁력(강한 영역)**이다 — "실순이익 ROI"가 제품 정체성. 형식 "FinAI 플랫폼(단일 통합)"·IFRS 회계·형식
> Incentive Engine(성과 자동 인센티브)은 **부분/부재**(Part031: 복식부기 GL 부재)이나, 구성 역량은 강하게
> 실재한다. ★**강한 축**: **Revenue Intelligence**=`Pnl`(**실순이익**·grossProfit/operatingProfit/netProfit·
> 매출/이익 분석·핵심 경쟁력)·`Rollup`(매출 집계)·`Insights`·`RoiService` · **Pricing Optimization/Dynamic
> Pricing**=`PriceOpt`(**AI 가격 최적화·리프라이서**·`po_simulations`·**정직 미산출 null/422**)·`MenuPricingSync` ·
> **ROI Intelligence**=`Mmm`(**ROI frontier**·예산 최적화·정직 미산출 optimized:false)·`AttributionEngine`
> (campaign ROI) · **Revenue Forecasting**=`DemandForecast`·`Mmm` · **Monetary Reward/Incentive**=`CouponEngine`/
> `CouponRedeem`(**TOCTOU 수정·288차**)/`CouponAdmin`/`Referral`/`Promotion` · **Commission**=`Influencer`
> (크리에이터 정산·`creator_settlements`)·`AgencyPortal`/`PartnerPortal`(파트너 수수료) · **Subscription
> Revenue(MRR/ARR)**=구독 빌링(Paddle MoR/Stripe·`subscription_ledger`·Part031/045) · **AI 추천**=`AutoRecommend`/
> `Decisioning`. ★★**오흡수 차단**: **`Pnl`=관리회계 손익이지 IFRS 복식부기 회계 아님(Part031)** · **`Mmm`=ROI
> 예측이지 매출 확정 아님** · **구독 빌링=SaaS 구독이지 형식 MRR/ARR 대시보드 아님**. Part001 §4 에 따라 실측 →
> FinAI 플랫폼/IFRS 판정 → Pnl+Mmm+PriceOpt+리워드 성문화했다. ★정본=**Part031/055** 승계·**정직 미산출·
> high-value 게이트·가짜녹색 금지** 재확인·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 수익/가격/리워드 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| FinAI Architecture | Events→Revenue→Pricing→ROI→Reward→Dashboard | ★**대체로 준수** — Events→`Pnl`/`Rollup`→`PriceOpt`→`Mmm`(ROI)→리워드→대시보드 |
| Revenue Intelligence | Tracking/Trend/Analysis/Recommendation | ★**강함(핵심 경쟁력)** — `Pnl`(실순이익)·`Rollup`·`Insights`·`AutoRecommend` |
| Dynamic Pricing | Demand/Time/Region/Customer Pricing | ★**부분 준수** — `PriceOpt`(리프라이서·라이브 경쟁가)·`MenuPricingSync`. Region/Customer 부분 |
| Pricing Optimization | Margin/Discount/Promotion/AI Rec | ★**실재** — `PriceOpt`(마진 최적화·`po_simulations`·정직 미산출)·`Promotion` |
| Profitability Analytics | Gross/Operating/Net Profit/Trend | ★**강함** — `Pnl`(grossProfit/operatingProfit/**netProfit**·Part031) |
| Revenue Forecasting | Monthly/Quarterly/AI Prediction | ★**대응물** — `DemandForecast`·`Mmm`(ROI 예측)·`Pnl`. `ModelMonitor` 감시 |
| ROI Intelligence | ROI/Campaign/Customer/Investment ROI | ★**강함** — `Mmm`(ROI frontier)·`RoiService`·`AttributionEngine`(campaign ROI·markov) |
| Incentive Engine | Rule/Bonus/Achievement/Approval | **부분(대응물)** — `RuleEngine`(규칙)·`Referral`·`Promotion`·`action_request`. 형식 성과 인센티브 부분 |
| Monetary Reward | Policy/Cash/Point/Settlement | ★**실재** — `CouponEngine`/`CouponRedeem`(**TOCTOU 수정·288차**)/`CouponAdmin`·포인트/쿠폰 |
| Commission Management | Sales/Partner/Affiliate/Settlement | ★**실재** — `Influencer`(크리에이터 정산·`creator_settlements`)·`AgencyPortal`/`PartnerPortal`·정산(Part031) |
| Subscription Revenue(MRR/ARR) | Recurring/MRR/ARR/Renewal | **부분(대응물)** — 구독 빌링(Paddle MoR/Stripe·`subscription_ledger`). 형식 MRR/ARR 대시보드 부분 |
| Partner Revenue Sharing | Split/Settlement/Multi-Level/Audit | ★**부분 준수** — `AgencyPortal`/`PartnerPortal`·정산 배분·`SecurityAudit`. Multi-Level 부분 |
| Financial Analytics | KPI/Revenue/Cost/Margin Dashboard | ★**대응물** — `Pnl`·`Reports`·역할별 대시보드·`DataExport` |
| Revenue Governance | Pricing/Reward Policy/Approval/Audit | ★**대응물** — `action_request`(승인)·high-value 게이트·`SecurityAudit`·`CouponAdmin` |
| Financial Dashboard | Executive/Revenue/ROI/Reward | ★**대응물** — 역할별 대시보드(Executive/Marketing)·`Mmm`/`Pnl`/ROI |
| Monitoring | Revenue Growth/ROI/Pricing/Forecast Accuracy | **부분** — `Pnl`·`Mmm`·`ModelMonitor`·`SystemMetrics`. Forecast Accuracy 부분 |
| Logging | Revenue/Reward/Commission ID | ★**부분 준수** — `SecurityAudit`·정산 이력·`CouponRedeem` 로그. Trace ID 부분 |
| Security(Financial Encrypt/RBAC/Settlement Auth/격리) | 재무 보호 | ★**준수** — `Crypto` AES·RBAC+Scope·**high-value 게이트**(₩5M↑ 무승인 차단)·테넌트 격리 |
| Compliance(IFRS/SOC2) | 재무 규정 | **부분** — `Pnl` SSOT·`SecurityAudit`. ★**IFRS 복식부기 아님**(Part031·관리회계) |
| Disaster Recovery | Revenue/Reward/Settlement 복구 | **부분** — DB 백업(정산/쿠폰)·`omni_outbox` 재큐 |
| Performance(Revenue/Pricing Cache/Reward Batch) | 대규모 재무 | **부분** — rollup 집계·증분·cron 배치 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Revenue First/AI Assisted Pricing/ROI Driven/Explainable/Fair Reward/Continuous Opt/Tenant Isolation/Auditable) | **★대체로 준수** | ★ROI Driven(`Mmm`)·AI Pricing(`PriceOpt`)·Explainable(근거/신뢰도)·Fair Reward(TOCTOU 수정)·Tenant Isolation·Auditable. IFRS 부분 |
| §4 FinAI Architecture | **★대체로 준수** | Events→`Pnl`→`PriceOpt`→`Mmm`→리워드→대시보드 |
| §5 Revenue Intelligence | **★강함** | `Pnl`·`Rollup`·`Insights`·`AutoRecommend` |
| §6 Dynamic Pricing | **부분 준수** | `PriceOpt`(리프라이서)·`MenuPricingSync` |
| §7 Pricing Optimization | **★실재** | `PriceOpt`(마진·po_simulations·정직 미산출) |
| §8 Profitability Analytics | **★강함** | `Pnl`(gross/operating/netProfit) |
| §9 Revenue Forecasting | **★대응물** | `DemandForecast`·`Mmm`·`Pnl` |
| §10 ROI Intelligence | **★강함** | `Mmm` frontier·`RoiService`·`AttributionEngine` |
| §11 Incentive Engine | **부분(대응물)** | `RuleEngine`·`Referral`·`Promotion`·`action_request` |
| §12 Monetary Reward | **★실재** | `CouponEngine`/`CouponRedeem`(TOCTOU)·`CouponAdmin` |
| §13 Commission Management | **★실재** | `Influencer`(creator_settlements)·`AgencyPortal`/`PartnerPortal` |
| §14 Subscription Revenue | **부분(대응물)** | 구독 빌링(Paddle/Stripe·subscription_ledger). MRR/ARR 대시보드 부분 |
| §15 Partner Revenue Sharing | **부분 준수** | `AgencyPortal`/`PartnerPortal`·정산 배분. Multi-Level 부분 |
| §16 Financial Analytics | **★대응물** | `Pnl`·`Reports`·대시보드·`DataExport` |
| §17 Revenue Governance | **★대응물** | `action_request`·high-value 게이트·`SecurityAudit`·`CouponAdmin` |
| §18 Financial Dashboard | **★대응물** | 역할별 대시보드·`Mmm`/`Pnl`/ROI |
| §19 Monitoring | **부분** | `Pnl`·`Mmm`·`ModelMonitor` |
| §20 Logging | **부분 준수** | `SecurityAudit`·정산·`CouponRedeem` |
| §21 Security | **★준수** | `Crypto`·RBAC·high-value 게이트·테넌트 격리 |
| §22 Compliance | **부분** | `Pnl` SSOT. ★IFRS 복식부기 아님(Part031) |
| §23 Disaster Recovery | **부분** | DB 백업·`omni_outbox` 재큐 |
| §24 Performance | **부분** | rollup·증분·cron 배치 |
| §25~§26 PHP/Claude(Revenue/Pricing/ROI/Reward/Commission Service) | **★대체로 준수** | ★`Pnl`·`PriceOpt`·`Mmm`·`CouponEngine`·`Influencer`. 형식 FinAI 플랫폼/IFRS 부분 |
| §27~§28 검증(revenue:health/pricing:optimize/reward:status) | **대상 없음** | artisan 없음. `/v424/pnl`·`PriceOpt`·`Mmm`·`CouponAdmin` API 로 대체 |

---

## 4. 확립된 표준 (신규 수익/가격/리워드 코드가 따를 정본)

- ★**수익/손익 정본 = `Pnl`**(실순이익 SSOT·Part031·핵심 경쟁력). ★**산식은 클라와 100% 동일·무회귀**. ★★**오흡수 금지**: `Pnl`=관리회계 손익이지 IFRS 복식부기 회계 아님(GL 부재·Part031).
- ★**가격 최적화 정본 = `PriceOpt`**(리프라이서·`po_simulations`). ★★**정직 미산출**: 산출 불가=`null`/422+사유(날조 금지)·`priceopt.sqlite` 소유권 주의(273차). Dynamic Pricing=경쟁가 수집(네이버 등).
- ★**ROI 정본 = `Mmm`(ROI frontier)+`RoiService`+`AttributionEngine`**(campaign ROI·markov). ★★**정직 미산출**: 최적화 불가=`optimized:false`+사유. ★**`Mmm`=ROI 예측이지 매출 확정 아님**(오흡수 금지).
- ★**리워드 정본 = `CouponEngine`/`CouponRedeem`/`CouponAdmin`+`Referral`+`Promotion`**. ★★**동시성 안전**: `CouponRedeem` **TOCTOU 수정**(288차·중복 지급 방지). ★**Fair Reward**·리워드 정책 버전관리·`action_request` 승인.
- ★**수수료/정산 = `Influencer`(creator_settlements)+`AgencyPortal`/`PartnerPortal`+정산 5종**(Part031). ★**멱등 정산·가짜녹색 금지**(288차 정산 zero-out)·`SecurityAudit`.
- ★**거버넌스·보안**: 가격/리워드 변경=`action_request` 승인·**high-value 게이트**(₩5M↑ 무승인 차단·289차)·`SecurityAudit`·`Crypto`·테넌트 격리. ★**AI 가격 추천=근거/신뢰도(V4 Explainable)**·근거없는 추천 금지.
- ★**정직 미산출·SSOT**: 산출 불가=null+사유(임의값 금지)·값 단일소스 실시간 일체화(한 값 변경=관련 전부 동기화).
- ★★**Part031/055 중복·재판정 금지**: 재무/정산/VAT=Part031·의사결정/예측=Part055 정본. 본 Part 는 Revenue/Pricing/Reward 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — Part031/055 중복 + FinAI 플랫폼/IFRS 부분)

1. **형식 "FinAI 플랫폼"(단일 통합)·IFRS 복식부기 회계** — 부분/부재. 구성 역량(`Pnl`/`Mmm`/`PriceOpt`/리워드)은 강하나 형식 통합 플랫폼/IFRS GL 부재(Part031: 관리회계·복식부기 GL 부재).
2. **형식 Incentive Engine(성과 자동 인센티브·achievement evaluation)** — 부분. `RuleEngine`·`Referral`·`Promotion`이 대응물. 형식 성과 평가 인센티브 부분.
3. **형식 MRR/ARR 대시보드·Multi-Level Revenue Sharing** — 부분. 구독 빌링(`subscription_ledger`)·`AgencyPortal` 정산이 대응물. 형식 MRR/ARR·다단계 배분 부분.
4. **`Pnl`/`Mmm`/구독 을 IFRS 회계/매출 확정/형식 MRR 로 오흡수 금지** — 관리회계 손익/ROI 예측/SaaS 구독이지 형식 재무제표 아님.
5. **Part031/055 와 중복되는 정산/VAT/의사결정/예측** — 각 Part 정본(재판정 금지). 본 Part 는 Revenue/Pricing/Reward 관점만.
6. **artisan `revenue:*`/`pricing:optimize`/`reward:status` 명령** — 없음(Slim). `/v424/pnl`·`PriceOpt`·`Mmm`·`CouponAdmin` API 로 대체.

★**준수하는 실 원칙(강함·핵심 경쟁력)**: **실순이익 SSOT(`Pnl`)·AI 가격 최적화(`PriceOpt`·정직 미산출)·ROI frontier(`Mmm`·정직 미산출)·리워드(TOCTOU 안전·Fair)·수수료 정산(멱등·가짜녹색 금지)·high-value 승인 게이트·근거/신뢰도(Explainable)·정직 미산출·테넌트 격리·값 단일소스 일체화**. ★**오흡수 차단**: Pnl≠IFRS·Mmm≠매출확정·구독≠형식 MRR. ★**Part031/055 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. 수익/손익=`Pnl`(실순이익 SSOT·클라 100% 동일·무회귀). ★★오흡수 금지: `Pnl`≠IFRS 복식부기 회계.
2. 가격=`PriceOpt`(리프라이서·po_simulations·정직 미산출 null/422). ROI=`Mmm`(frontier·optimized:false)+`RoiService`+`AttributionEngine`. ★`Mmm`≠매출 확정.
3. 리워드=`CouponEngine`/`CouponRedeem`(TOCTOU 안전·288차)/`Referral`/`Promotion`. 수수료=`Influencer`/`AgencyPortal`(멱등 정산·가짜녹색 금지).
4. ★가격/리워드 변경=`action_request` 승인·**high-value 게이트**·`SecurityAudit`. AI 가격 추천=근거/신뢰도(V4). 정직 미산출(null+사유)·테넌트 격리.
5. ★★오흡수 금지: `Pnl`/`Mmm`/구독을 IFRS 회계/매출 확정/형식 MRR 로 표기하지 않는다.
6. ★★재무/정산/VAT=Part031·의사결정/예측=Part055 정본(재판정 금지). 형식 FinAI 플랫폼/IFRS GL 이식 금지(구성 역량 확장).

---

## 7. Completion Criteria

- [x] 수익/가격/리워드 스택 **실측**(형식 FinAI 플랫폼/IFRS GL/형식 MRR·ARR 부분·`Pnl` 실순이익·`PriceOpt` 가격 최적화·`Mmm` ROI frontier·`CouponEngine`/`Influencer` 리워드/수수료 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(수익/가격/리워드 강함=핵심 경쟁력·형식 FinAI 플랫폼/IFRS 부분·Part031/055 중복)
- [x] 실 FinAI(Pnl+PriceOpt+Mmm+CouponEngine+Influencer+구독 빌링) 성문화(§4)
- [x] ★실순이익 SSOT·AI 가격/ROI 최적화(정직 미산출)·리워드(TOCTOU 안전)·high-value 게이트·★★오흡수 차단(Pnl≠IFRS·Mmm≠매출확정·구독≠MRR) 명시
- [x] 의도적 미적용 + 사유(§5) — FinAI 플랫폼/IFRS GL/형식 Incentive Engine/MRR·ARR/Multi-Level Sharing(+Part031/055 중복)
- [x] Claude Code 규칙(§6) · `Pnl`·`PriceOpt`·`Mmm`·`CouponEngine`·`Influencer` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part031/055 승계 + 핵심 경쟁력**(실순이익 `Pnl` + AI 가격 `PriceOpt`
> + ROI frontier `Mmm` + 리워드 `CouponEngine`(TOCTOU 안전) + 수수료 `Influencer` 정산)의 성문화이지 형식 FinAI
> 플랫폼/IFRS 복식부기 GL 이식이 아니다. ★★**오흡수 차단**: **`Pnl`은 IFRS 회계가 아니고(관리회계·GL 부재),
> `Mmm`은 매출 확정이 아니며, 구독 빌링은 형식 MRR/ARR 대시보드가 아니다**. ★**정직 미산출**(PriceOpt null/422·
> Mmm optimized:false)·**high-value 게이트**. Part031/055 정본(재판정 금지).

---

## 다음 Part

**CCIS Part061 — Enterprise Autonomous Enterprise, Hyperautomation, AI Workforce & Intelligent Business Operations** — ★사전 실측 예고: ★**Part032(워크플로)·042(AI 거버넌스)·054(AI Agent)·MEA 060(Hyperautomation PARTIAL)와 중복** — 형식 AI Workforce/Digital Workers/Process Intelligence(Celonis)는 **부재/부분**이나, 자동화 실체는 **`RuleEngine`(자율 액션)·`JourneyBuilder`(자율 워크플로)·`AutoCampaign`/`AutoRecommend`/`Decisioning`(자율 의사결정)·`agent_mode`+`action_request`(HITL)·cron 자동화·`callClaudeTools`(에이전틱)·V5 Safety Rule**로 부분 실재. Part061 도 실측→AI Workforce/Digital Workers/Process Mining 부재증명→RuleEngine+JourneyBuilder+agent_mode 성문화. ★MEA 060 D-2 스코프 분리(워크플로 엔진 실재 vs BPM 부재)·"자율집행=승인정책 존중"·Part032/042/054 중복 명시.
