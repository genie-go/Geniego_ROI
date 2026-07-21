# MEA Part 023 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★PriceOpt/CouponRedeem/Connectors/Pnl/MenuPricingSync 재사용·형식 Price Master/Governance greenfield·Part 014/018/021/022 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | PRICE_MASTER | PriceOpt base_price(형식 마스터 부재) | `PriceOpt.php`(:45) | PARTIAL |
| 2 | PRICE_LIST | 부재(형식 List) | — | ABSENT-formal |
| 3 | PRICE_POLICY | target_margin·정책(부분) | `PriceOpt.php`(:44) | PARTIAL |
| 4 | PRICE_RULE | 탄력성 규칙 | `PriceOpt.php`(po_elasticity:81) | PARTIAL |
| 5 | PRICE_VERSION | 부재(형식 Version)·git | git | ABSENT-formal |
| 6 | PRICE_COMPONENT | cost/margin 컴포넌트 | `PriceOpt.php`·`Pnl` | PARTIAL |
| 7 | DISCOUNT_RULE | 쿠폰 할인 | `CouponRedeem.php` | PARTIAL-strong |
| 8 | SURCHARGE_RULE | 부재(형식 Surcharge) | — | ABSENT-formal |
| 9 | TAX_RULE | VAT | `Pnl.php`(267차) | PARTIAL-strong |
| 10 | EXCHANGE_RATE | KRW base(versioning 부재) | `Connectors::fxToKrw` | PARTIAL(versioning ABSENT) |
| 11 | PRICE_CALCULATION | 최적가 산출 | `PriceOpt.php`(optimalPrice:297) | PARTIAL-strong |
| 12 | PRICE_HISTORY | recommendations(부분) | `PriceOpt.php` | PARTIAL-informal |
| 13 | PRICE_APPROVAL | master 게이트 | `MenuPricingSync`(287차)·writeback(289차) | PARTIAL |
| 14 | PRICE_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | PRICE_STATUS | recommendation 상태 | `PriceOpt.php` | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Base/Channel=PriceOpt/MenuPricingSync·Marketplace=ChannelSync(selPrc)·Subscription=Paddle·Promotional=CouponRedeem. 형식 Master 통합=부분.
- **§7 Lifecycle(8)**: PriceOpt recommendations·MenuPricingSync master 게이트·writeback 승인·형식 Lifecycle Manager=부분.
- **§8 Calculation(10)**: Base=PriceOpt·Discount/Coupon=CouponRedeem·Tax=Pnl VAT·Currency=fxToKrw·형식 순서 Framework=부분.
- **§9 Dynamic(8)**: ★PriceOpt elasticity(수요/재고 기반)·Competitor/AI(형식)=부분·승인 정책=헌법 V5.
- **§10 Discount(10)**: Coupon=CouponRedeem(원자 289차)·Bundle=ProductAddon·형식 Tiered/BOGO/우선순위=부분.
- **§11 Multi-Currency(8)**: KRW base=fxToKrw·보고통화=Pnl·★Daily/Historical Exchange Rate versioning·Currency Audit=ABSENT(Part 014).
- **§12 Governance(8)**: Approval=MenuPricingSync master 게이트·★Pricing Authority·형식 Governance Manager=ABSENT(Part 018).
- **§13 Security**: Tenant/RBAC/Encryption/Rule Protection/Audit(Part 021 상속).
- **§17 AI**: 최적 판매가=PriceOpt·수요 예측=DemandForecast·수익성=Pnl/Mmm·Explainability=헌법 V4·자동 반영 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§7·§9·§11 calc·§14=할인/세금/계산/감사, ★§9 Dynamic) / PARTIAL(§1·§3·§4·§6·§10·§12·§13·§15) / ABSENT-formal(§2 LIST·§5 VERSION·§8 SURCHARGE·§10 EXCHANGE versioning·형식 Enterprise Pricing Engine/Price Master/Governance Manager/Exchange Rate versioning).** 코드 0. ★가격 최적화(`PriceOpt`)·할인(`CouponRedeem`)·다통화(`Connectors::fxToKrw`/`Pnl`) 재사용(★중복 가격/할인/통화 계산 절대 금지)·형식 Price Master/Governance 신설(가격 재계산 없이)·Part 014/018/021/022 상속·★AI 가격 정책 자동 승인/직접 반영 불가(V3+V5+CHANGE_GATE).
