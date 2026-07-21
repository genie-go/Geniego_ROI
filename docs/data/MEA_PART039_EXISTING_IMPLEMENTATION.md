# MEA Part 039 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 039 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
customs/hs-code/duty/tariff/origin/sanction/import/export/dhl/international 키워드로 `backend/src` 전수 grep + 판독. ★Customs/HS/Duty/Trade Compliance 전용 handler 부재증명(grep incidental).

## 실존 substrate (★국제 추적·글로벌 판매·원산지 seed·통관 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| International Tracking | DHL 국제 특송 | `Logistics.php`(DHL:18·INTL const:44·현재 DHL 실구현·나머지 pending:19) | PARTIAL(seed) |
| 글로벌 마켓 판매 | amazon/ebay | `ChannelSync.php`·Part 029 | PARTIAL |
| Certificate of Origin seed | 11번가 원산지 | `Catalog`·`st11_notice_types.json`(286차) | PARTIAL-weak(seed) |
| International Freight Cost | 배송비 | `Pnl`(shippingCost·VAT≠관세) | PARTIAL-weak |
| 다통화 | KRW base | `Connectors::fxToKrw` | PARTIAL |
| Cross Border ROI | 글로벌 채널 ROI | `Rollup`/`Pnl`(SoS 267차) | PARTIAL |
| Carrier Registration | 택배사 | `Wms`(wms_carriers)/`ChannelRegistry` | PARTIAL |
| Audit | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·전용 handler grep 0)
★**Customs Management**(Customs Declaration/HS Code Validation/Duty Calculation/Customs Inspection/Release/Electronic Filing)·**Trade Compliance**(Sanction Screening/Restricted Goods/Country Compliance/FTA Eligibility/Dangerous Goods)·**Import/Export Registration**·**Customs Documentation**(Commercial Invoice/Packing List/Export License)·**Bonded/International Warehouse**·**International Rate/Transit Time/SLA Monitoring**·IMPORT_ORDER/EXPORT_ORDER/HS_CODE/DUTY/COUNTRY_RULE/CUSTOMS_DECLARATION 형식 엔티티·통관 전 계층.

## 판정
**ABSENT-heavy / PARTIAL-weak(seed 극소).** ★실재 seed=International Tracking(`Logistics`·DHL·INTL const·현재 DHL 실구현·FedEx/UPS/TNT pending)·글로벌 마켓 판매(`ChannelSync`·amazon/ebay)·Certificate of Origin seed(`Catalog`+`st11_notice_types.json`·286차)·International Freight Cost(`Pnl` 배송비)·다통화(`Connectors::fxToKrw`)·Cross Border ROI(`Rollup`/`Pnl`)이나, **Customs Management·Trade Compliance·Import/Export Registration·Customs Documentation은 진짜 부재**(부재증명 완료·grep incidental). ★★핵심=**GeniegoROI는 글로벌 마켓 판매+DHL 국제 추적 e-커머스 플랫폼이지 통관사(Customs Broker)가 아니므로 통관/HS Code/관세/무역 규정은 부재**(통관은 3PL/통관사 담당·Part 034/035 정합·과대주장 금지·★VAT≠관세). 실행은 자체 통관 운영 + 통관/정부 API 연동 후 신설 종속.
