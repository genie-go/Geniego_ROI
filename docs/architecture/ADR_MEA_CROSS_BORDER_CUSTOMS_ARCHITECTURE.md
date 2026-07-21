# ADR — MEA Part 039 Enterprise Cross Border Logistics & Customs Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part039 EXISTING/DUPLICATE) 등장 file:line만(반날조). ★과대주장 금지·부재증명 완료.

## 맥락
MEA Part 039는 Cross Border Logistics & Customs. ★**국제 추적/글로벌 판매/원산지·다통화는 seed 실재이나 통관/HS Code/관세/무역 규정은 부재**: 실재=`Logistics`(DHL Unified Tracking·INTL const dhl/fedex/ups/tnt/cj_intl·현재 DHL 실구현·나머지 pending·GT①)·`ChannelSync`(amazon/ebay 글로벌 판매·GT①)·`Catalog`+`st11_notice_types.json`(원산지·286차·GT①)·`Pnl`(VAT·배송비)·`Connectors::fxToKrw`(다통화). 부재=Customs/HS Code/Duty/Trade Compliance 전용 handler(부재증명 완료·grep incidental). ★비즈니스 모델: 글로벌 마켓 판매+DHL 추적 e-커머스 플랫폼·통관사 아님. 본 Part는 Logistics(Part 031)/Marketplace(029)/Payment(028) 상속(재정의 금지).

## 결정
- **D-1 (Part 031/029/028/016/Data Platform 재정의 금지):** Logistics Foundation(Part 031)·Marketplace(Part 029)·Payment(Part 028)·Profit/VAT(Part 016)·Metadata(Part 004)를 준수·인용. 중복 정의 금지.
- **D-2 (International Tracking = Logistics 승격·★중복 추적 절대 금지):** 국제 추적 = `Logistics`(DHL Unified Tracking·INTL const). ★DHL 실구현·FedEx/UPS/TNT는 정직하게 pending(과대주장 금지·"현재 정직하게 pending" 코드 주석 준수). ★중복 국제 추적 신설 절대 금지. 형식 International Carrier Management=`Logistics` 승격.
- **D-3 (원산지/글로벌 판매 = Catalog/ChannelSync 승격):** Certificate of Origin seed=`Catalog`+`st11_notice_types.json`(11번가 원산지·country of origin·286차·재구현/재학습 금지)·글로벌 판매=`ChannelSync`(amazon/ebay·Part 029). 형식 Customs Documentation(Commercial Invoice/Packing List)=순신설(원산지 정본 재사용).
- **D-4 (Customs/Duty/Trade Compliance = 부재·순신설·★VAT≠관세):** ★Customs Management(Customs Declaration/HS Code/Duty Calculation/Electronic Filing)·Trade Compliance(Sanction/Restricted Goods/FTA/Dangerous Goods)·Import/Export Registration=**부재·순신설**(부재증명 완료). ★VAT(`Pnl`)≠관세(Duty)=오흡수 금지(부가세와 관세는 별개·"코드 존재≠구현 완료" 283차). ★통관은 3PL/통관사 담당·자체 통관 운영 착수 시(통관 시스템/정부 API 연동 필수·과대주장 금지).
- **D-5 (Security/AI = 헌법 정합):** Tenant=`Db.php`·RBAC=`index.php`·Encryption=`Crypto`·Audit=`SecurityAudit`·다통화=`Connectors::fxToKrw`. AI(지연/경로)=`AnomalyDetection`·Explainability=헌법 V4·★AI 통관 신고 자동 제출/정부 승인 자동 수행 불가=헌법 V3+V5+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED·ABSENT-heavy**. Logistics/Commerce/Data Platform/헌법 상속·재정의 금지·국제 추적(`Logistics` DHL)·글로벌 판매(`ChannelSync`)·원산지(`Catalog`/st11)·VAT/배송비(`Pnl`)·다통화(`Connectors`)·`SecurityAudit` 재사용(★중복 국제 추적/원산지/VAT/다통화 절대 금지·★VAT≠관세 오흡수 금지·정본 재구현 금지)·Customs/HS Code/Duty/Trade Compliance/통관 전 계층 순신설(부재·자체 통관 운영 착수 시·통관 시스템/정부 API 연동 필수·과대주장 금지). 실행은 자체 통관 운영 결정 + 통관/정부 API 연동 종속.
