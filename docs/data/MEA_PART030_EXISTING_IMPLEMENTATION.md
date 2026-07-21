# MEA Part 030 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 030 SPEC/ADR.

## 전수조사 방법
gmv/aov/conversion/turnover/best-seller/slow-moving/product-performance/SoS/clv/cac 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★커머스 KPI/분석 값·대시보드)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| 커머스 KPI/집계(SSOT) | GMV/ROAS/conversion | `Rollup.php`(channel_orders·performance_metrics·:19·SKU 성과:235·attribution 배분:257) | PARTIAL-strong |
| Product ROI/Profitability | 상품 이익 | `Pnl.php`(P&L SSOT) | PARTIAL-strong |
| CLV/Churn | 생애가치·이탈 | `CustomerAI.php`(BG-NBD 279차)·`CRM`(LTV 263차) | PARTIAL-strong |
| Conversion | 전환 | `AttributionMetrics.php` | PARTIAL-strong |
| SoS/채널 비교 | Share of Shelf | `DigitalShelf.php`(267차) | PARTIAL-strong |
| Turnover/Slow Moving | deadStock | `Wms`(288차) | PARTIAL |
| 세그먼트 분석 | RFM/세그먼트 | `CRM`(crm_segments·Part 025) | PARTIAL-strong |
| Report | 리포트 빌더 | `Reports.php`(193차) | PARTIAL-strong |
| 대시보드 | 프론트 대시보드 | Part 019(RollupDashboard/PnLDashboard/ChannelKPI) | PARTIAL-strong |
| Insight | aggregate insight | `Insights.php` | PARTIAL |
| AI(판매예측/추천) | 예측·추천 | `DemandForecast`·`Mmm`·`AutoRecommend` | PARTIAL |
| Audit/DataQuality | 해시체인·DataTrust | `SecurityAudit`·`DataPlatform` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Commerce KPI Engine/Data Mart (Part 015/019 판정 정합)
형식 Commerce Data Mart(통합)·metadata-driven Commerce KPI Engine/Registry(Part 015 KPI Registry 부재 정합)·Commerce Analytics Engine(통합 오케스트레이션)·형식 Drill-down 엔진·ANALYTICS_JOB 형식·Commerce Forecast(형식·Part 017 승격)·Event 표준(CommerceMetricUpdated 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★커머스 KPI/분석 **값**은 서버 SSOT: `Rollup`(GMV/ROAS/conversion·SKU 성과·attribution 배분)·`Pnl`(Product ROI)·`CustomerAI`/`CRM`(CLV/churn/세그먼트)·`AttributionMetrics`(conversion)·`DigitalShelf`(SoS 267차)·`Wms`(turnover)·대시보드(Part 019)·`Reports`(193차)이나, **형식 metadata-driven Commerce KPI Engine·Commerce Data Mart·Analytics Engine은 부재**(KPI 값 코드 내재·Part 015 KPI Registry·Part 019 Dashboard 판정 정합). 실행은 형식 KPI Engine/Data Mart 신설(값 재계산 없이) 종속. ★Commerce Platform 마지막 계층.
