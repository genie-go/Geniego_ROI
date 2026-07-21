# MEA Part 023 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 023 SPEC/ADR.

## 전수조사 방법
price/discount/dynamic/elasticity/currency/exchange/coupon/margin/menu-pricing 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (★동적가격·할인·다통화)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Dynamic Pricing(탄력성) | 탄력성 기반 최적가 | `PriceOpt.php`(v420·elasticityOptimal:216·po_elasticity:81·optimalPrice:297) | PARTIAL-strong |
| 가격 최적화 API | optimize/recommendations | `PriceOpt.php`(optimize:755·optimizeBatch:883·listRecommendations:918) | PARTIAL-strong |
| Base/Margin | cost_price·target_margin | `PriceOpt.php`(:43~45) | PARTIAL-strong |
| 주문 기반 탄력성 학습 | harvest from orders | `PriceOpt.php`(harvestElasticityFromOrders:255) | PARTIAL-strong |
| Discount/Coupon | 원자 소진 | `CouponRedeem.php`(redeem:33·preview:181·TOCTOU 289차)·`CouponAdmin.php` | PARTIAL-strong |
| Multi-Currency | KRW base 정규화 | `Connectors::fxToKrw`·`fxRateKrwPerUnit`·`Pnl.php`(krwPerUnit:265·보고통화:291) | PARTIAL-strong |
| Channel Pricing | master 게이트 | `MenuPricingSync.php`(287차)·`ChannelSync`(selPrc 286차) | PARTIAL-strong |
| Tax | VAT | `Pnl.php`(267차) | PARTIAL-strong |
| Subscription Pricing | 구독 플랜 | `Paddle.php`·`AdminPlans.php` | PARTIAL |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Price Master/Governance (Part 014/018 판정 정합)
형식 Enterprise Pricing Engine(Single Price Authority master)·Price Master/Price List/Price Rule(version-controlled)·**Daily/Historical Exchange Rate versioning·Currency Audit**(Part 014 판정)·**Pricing Authority·Pricing Governance Manager**(Part 018 Authority ABSENT 정합)·Tiered/BOGO 우선순위 정책 엔진·형식 Price Calculation Framework(순서 오케스트레이션)·Event 표준(PriceCreated 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★가격 최적화·할인·다통화는 **실재**: `PriceOpt`(v420·탄력성 동적가격·optimalPrice·주문 기반 학습)·`CouponRedeem`(원자 소진 TOCTOU 289차)·`Connectors::fxToKrw`(KRW base 다통화)+`Pnl`(보고통화·VAT)·`MenuPricingSync`(master 게이트 287차)·`ChannelSync`(selPrc 286차)이나, **형식 Single Price Authority master·Exchange Rate versioning(Daily/Historical·Currency Audit)·Pricing Governance/Authority는 부재**(가격=handler별·Part 014 통화 판정·Part 018 Authority ABSENT 정합). 실행은 Single Price Authority 승격 계층 신설(가격 재계산 없이) 종속.
