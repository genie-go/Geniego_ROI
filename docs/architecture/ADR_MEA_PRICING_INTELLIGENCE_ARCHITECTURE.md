# ADR — MEA Part 023 Enterprise Product Pricing & Pricing Intelligence Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part023 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 023은 Pricing & Pricing Intelligence(가격 정책/계산/할인/동적가격/다통화). ★코드베이스에는 **가격 최적화/할인/다통화가 이미 실재**: `PriceOpt.php`(v420·elasticityOptimal·po_elasticity·harvestElasticityFromOrders·optimalPrice·optimize/recommendations·priceopt.sqlite·GT①)=동적가격(탄력성 기반)·`CouponRedeem`(원자 소진 TOCTOU 289차)·`CouponAdmin`=할인·`Connectors::fxToKrw`/`fxRateKrwPerUnit`(KRW base 정규화)+`Pnl`(보고통화 환산·VAT 267차)=다통화·`MenuPricingSync`(master 게이트 287차)·`ChannelSync`(selPrc 11번가 286차)=채널가격. ★단 Part 014에서 **Daily/Historical Exchange Rate versioning·Currency Audit=ABSENT**, Part 018에서 **Pricing/Approval Authority=ABSENT** 판정됨. 본 Part는 Part 021/022/014 상속(재정의 금지).

## 결정
- **D-1 (Part 021/022/014/Data Platform 재정의 금지):** Commerce Foundation(Part 021)·PIM(Part 022)·통화/계산(Part 014)·Metadata(Part 004)를 준수·인용. 가격 도메인=`PriceOpt`/`CouponRedeem`/`Connectors`. 중복 정의 금지.
- **D-2 (Dynamic Pricing = PriceOpt 승격·★중복 가격 계산 절대 금지):** 동적가격 = `PriceOpt`(elasticity·optimalPrice·수요/재고 기반·v420). ★가격 최적화 정본(273차 priceopt.sqlite 소유권 버그 수정 이력·재구현 금지). ★중복 가격/최적화 계산 신설 절대 금지(값 분산=회귀). 형식 Enterprise Pricing Engine은 `PriceOpt`를 Single Price Authority로 승격(가격 재계산 아님).
- **D-3 (Discount = CouponRedeem 승격):** 할인 = `CouponRedeem`(원자 소진 UPDATE+rowCount·TOCTOU 289차·preview/redeem)·`CouponAdmin`·Bundle=`ProductAddon`. ★TOCTOU 이중지불 방지 정본(289차·재구현 금지). 형식 Tiered/BOGO/우선순위 정책 엔진=순신설(중복 할인 계산 금지).
- **D-4 (Multi-Currency = Connectors/Pnl 승격·Exchange Rate versioning 형식 신설):** 다통화 = `Connectors::fxToKrw`/`fxRateKrwPerUnit`(KRW base 정규화)+`Pnl`(보고통화 환산·app_setting)·Regional Tax=`Pnl`(VAT). ★Part 014 판정 재사용: **Daily/Historical Exchange Rate versioning·Currency Audit=ABSENT**·형식 Currency Conversion Service(versioning/audit)=순신설(중복 통화 변환 금지·fxToKrw 승격).
- **D-5 (Governance/Security/AI = 헌법·무후퇴 정합):** Approval=`MenuPricingSync` master 게이트(287차)+writeback 승인(289차)·Tenant=`Db.php`·RBAC=`index.php`·Rule Protection=git+`CHANGE_GATE`·Audit=`SecurityAudit`. ★Pricing/Approval Authority=ABSENT(Part 018 정합·형식 Governance Manager 순신설). AI(최적 판매가/수요 예측/수익성)=`PriceOpt`/`DemandForecast`/`Pnl`/`Mmm`·Explainability=헌법 V4·★AI 가격 정책 자동 승인/직접 반영 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 021/022/014/Data Platform/헌법 상속·재정의 금지·동적가격(`PriceOpt`)·할인(`CouponRedeem`)·다통화(`Connectors::fxToKrw`/`Pnl`)·채널가격(`MenuPricingSync`)·`SecurityAudit` 재사용(★중복 가격/할인/통화 계산 절대 금지)·형식 Enterprise Pricing Engine(Single Price Authority)·Price Master/Rule version·Exchange Rate versioning·Pricing Governance Manager만 신설(가격 재계산 없이). 실행은 Single Price Authority 승격 계층 신설 종속.
