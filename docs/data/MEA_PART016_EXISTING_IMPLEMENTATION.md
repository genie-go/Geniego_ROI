# MEA Part 016 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 016 SPEC/ADR.

## 전수조사 방법
grossProfit/operatingProfit/netProfit/margin/vat/cogs/frontier/profitOptSpend/attribution/cost/revenue 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (★P&L SSOT·이익 최적화)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| P&L 값(SSOT) | ★서버 계산·단일소스 | `Pnl.php`(grossProfit=revenue−cogs·operatingProfit·netProfit·:23~25) | PARTIAL-strong(값) |
| VAT 엔진 | 부가세 상계/과세기간 | `Pnl.php`(vat·:27·:35) | PARTIAL-strong |
| 비용 컴포넌트 | 조립(Cost Center 아님) | `Pnl.php`(cogs·adSpend·platformFee·couponDiscount·returnFee·shippingCost·influencerCost·:24) | PARTIAL(조립) |
| 이익 최적화/Forecast | ★이익 효율 프론티어 | `Mmm.php`(frontier·profitOptSpend·PROFIT(T)·T*·marginal_roas·:338·:349~352) | PARTIAL-strong(경쟁차별) |
| Profit Attribution | UTM/Coupon/Deeplink | `Attribution.php`(confidence·:13~14) | PARTIAL |
| Revenue | 주문매출·정산 | `OrderHub`(주문매출)·`Pnl`(netPayout)·`Paddle`(subscription) | PARTIAL |
| Customer Profit | LTV(취소/반품 역분개) | `CRM`(LTV·263차) | PARTIAL |
| Channel/Campaign Profit | 채널 집계 | `Rollup`·`ChannelSync` | PARTIAL |
| AI Profit | 231차 AI Profit OS | `AnomalyDetection`·`Mmm`·231차 | PARTIAL |
| Audit/Encryption | 해시체인·AES-256-GCM | `SecurityAudit.php`·`Crypto` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Profit Intelligence Engine (grep 0)
형식 Profit Intelligence Engine(단일)·**Cost Center/Cost Element 테이블**(비용=컴포넌트 조립)·Contribution/Break-even/Variance/Sensitivity Analysis(형식)·**Profit Scenario/What-if Engine**·Best/Expected/Worst Case·Budget Comparison·형식 Profit Forecast Engine·형식 Profit Attribution(비용·이익 원인 추적)·Event 표준(ProfitCalculationStarted 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★이익/매출/비용 **값**은 서버 SSOT(`Pnl` grossProfit/operatingProfit/netProfit·VAT·무후퇴 단일소스·제품 핵심)·이익 최적화 프론티어(`Mmm`·경쟁사 미제공·270차)·Attribution(`Attribution`)·Customer Profit(`CRM` LTV)는 실재하나, **형식 metadata-driven Profit Intelligence Engine·Cost Center 계층·Scenario/What-if Engine·형식 Forecast Engine은 전무**(이익 값=코드 내재·Part 013/014/015 동일 판정). 실행은 선행 Part 001~015 + 형식 Profit Intelligence Engine 신설(값 재계산 없이) 종속.
