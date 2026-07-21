# MEA Part 030 — Canonical Entities Design & Judgment (§5~§18)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Rollup/Pnl/CustomerAI/AttributionMetrics/DigitalShelf 재사용·형식 Commerce KPI Engine/Data Mart greenfield·Part 015/019/025 상속·One Version of Truth.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | COMMERCE_KPI | GMV/ROAS(값 SSOT) | `Rollup.php`·`Pnl.php` | PARTIAL-strong(값)·ABSENT(레지스트리) |
| 2 | COMMERCE_METRIC | 지표 집계 | `Rollup.php`(:19) | PARTIAL-strong |
| 3 | SALES_METRIC | 판매 지표 | `Rollup.php`(channel_orders) | PARTIAL-strong |
| 4 | CUSTOMER_METRIC | CLV/churn | `CustomerAI`·`CRM` | PARTIAL-strong |
| 5 | PRODUCT_METRIC | 상품 ROAS/ROI | `Rollup`(:235)·`Pnl` | PARTIAL-strong |
| 6 | ORDER_METRIC | 주문 지표 | `OrderHub`·`Rollup` | PARTIAL |
| 7 | INVENTORY_METRIC | turnover/deadStock | `Wms`(288차) | PARTIAL |
| 8 | MARKETPLACE_METRIC | SoS/채널 | `DigitalShelf`(267차) | PARTIAL-strong |
| 9 | COMMERCE_DASHBOARD | 프론트 대시보드 | Part 019 | PARTIAL-strong |
| 10 | COMMERCE_INSIGHT | aggregate insight | `Insights.php` | PARTIAL |
| 11 | ANALYTICS_REPORT | 리포트 빌더 | `Reports.php`(193차) | PARTIAL-strong |
| 12 | COMMERCE_FORECAST | 판매 예측 | `DemandForecast`·`Mmm` | PARTIAL |
| 13 | ANALYTICS_JOB | 집계(cron·형식 Job 부분) | `Rollup` | PARTIAL |
| 14 | ANALYTICS_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | ANALYTICS_POLICY | Data Quality/게이트 | `DataPlatform`(DataTrust) | PARTIAL |

## §6~§18 표준 판정
- **§6 Domain(10)**: Sales=Rollup·Customer=CustomerAI/CRM·Product=Pnl/Rollup·Inventory=Wms·Marketplace=DigitalShelf·Payment=PgSettlement. 공통 KPI Framework(형식)=부분.
- **§7 KPI(10)**: GMV/Net Sales=Rollup/Pnl·Conversion=AttributionMetrics·CLV=CRM·CAC=Rollup·Turnover=Wms·Commerce ROI=Rollup/Pnl·★KPI Registry(Part 015=형식 부재).
- **§8 Sales(8)**: Rollup(SKU/채널/기간 drill seed)·형식 Drill-down UI=부분.
- **§9 Customer(8)**: CustomerAI(churn/CLV)·CRM(세그먼트·Part 025)·Journey=JourneyBuilder·Customer 360 연계=Part 025.
- **§10 Product(8)**: Rollup(SKU ROAS)·Pnl(Profitability)·Slow Moving=Wms(deadStock)·Product ROI=Rollup/Pnl.
- **§11 Marketplace(8)**: SoS/비교=DigitalShelf(267차)·Commission=PgSettlement/Pnl·Effectiveness=AbTesting.
- **§12 Dashboard(8)**: Part 019 대시보드·Reports(193차)·형식 통합 Dashboard=부분.
- **§13 Governance(8)**: Data Quality=DataPlatform·Report=Reports·KPI Definition(Part 015 형식 부재)=부분.
- **§14 Security**: Tenant/RBAC/Permission/★No-PII 집계(v418.1)/Audit(Part 021 상속).
- **§18 AI**: 판매 예측=DemandForecast/Mmm·추천=AutoRecommend·이탈=CustomerAI·가격=PriceOpt·Explainability=헌법 V4·분석 결과 변경/데이터 직접 수정 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~5·§8·§9·§11·§14=KPI 값/판매/고객/마켓/감사) / PARTIAL(§6·§7·§10·§12·§13·§15) / ABSENT-formal(§1 레지스트리·형식 Commerce KPI Engine/Data Mart/Analytics Engine·Drill-down·Event 표준).** 코드 0. ★커머스 KPI 값(`Rollup`/`Pnl`/`Attribution`/`CRM`)·분석(`CustomerAI`/`DigitalShelf`)·대시보드(Part 019) 재사용(★중복 커머스 KPI/분석 계산 절대 금지·One Version of Truth)·형식 Commerce KPI Engine/Data Mart 신설(값 재계산 없이)·Part 015/019/025 상속·★AI 분석 결과 변경/운영 데이터 직접 수정 불가(V3+V5+CHANGE_GATE).
