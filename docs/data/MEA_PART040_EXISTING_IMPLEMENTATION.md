# MEA Part 040 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 040 SPEC/ADR. ★부재증명 완료·과대주장 금지.

## 전수조사 방법
logistics-analytics/kpi/deadstock/turnover/on-time/fulfillment/shippingCost/delayRate 키워드로 `backend/src/Handlers` 전수 grep + 판독.

## 실존 substrate (★창고/배송/비용/예측 분석 seed·Fleet/Route/Cross Border 분석 부재)
| MEA 개념 | 실존 substrate | 인용 | 판정 |
|---|---|---|---|
| Warehouse Analytics | deadStock·재고 정확도·FEFO COGS | `Wms`(deadStock 288차)·`Pnl`(fefoCogsForRef) | PARTIAL-strong |
| Delivery Analytics | 배송 상태 | `Logistics`(Part 031) | PARTIAL |
| Reverse Analytics | 반품률 | `OrderHub`(RETURN_TOKENS) | PARTIAL |
| Cost Analytics | 배송비/COGS | `Pnl`(shippingCost·FEFO COGS) | PARTIAL-strong |
| 공급망 리스크 | risk/delayRate | `SupplyChain`(sc_risk_rules·delayRate) | PARTIAL-strong |
| Forecast | Holt-Winters | `DemandForecast`(Part 017/027) | PARTIAL-strong |
| Logistics ROI | 글로벌/채널 ROI | `Rollup`/`Pnl`(SoS 267차) | PARTIAL |
| SLA/Delay | 알림·이상 | `Alerting`·`AnomalyDetection` | PARTIAL |
| Dashboard | 프론트 대시보드 | Part 019(Rollup/PnLDashboard)·Control Tower=WmsCctv(Part 037) | PARTIAL |
| Report | 리포트 빌더 | `Reports`(193차) | PARTIAL-strong |
| Audit/DataQuality | 해시체인·DataTrust | `SecurityAudit`·`DataPlatform` | PARTIAL-strong |

## 부재(ABSENT — 부재증명 완료·상위 도메인 부재/형식 미완)
★**Fleet Analytics**(Utilization·Part 034 부재)·**Route Analytics**(Efficiency·Part 035 부재)·**Cross Border Analytics**(Duty Cost·Part 039 부재)·**Fuel/Maintenance Cost**(Fleet 부재)·**Bottleneck Detection**·형식 metadata-driven **Logistics KPI Registry/Data Mart**(Part 015 KPI Registry 부재 정합)·Logistics Analytics Engine(통합)·Fleet/Driver Requirement Forecast(Fleet 부재)·Event 표준(LogisticsMetricUpdated 등).

## 판정
**PARTIAL / ABSENT-formal(Fleet/Route/Cross Border 분석·형식 KPI Registry/Data Mart).** ★실재=Warehouse Analytics(`Wms`·deadStock·FEFO COGS)·Cost Analytics(`Pnl`·배송비/COGS)·공급망 리스크(`SupplyChain`·delayRate)·Forecast(`DemandForecast`·Holt-Winters)·Logistics ROI(`Rollup`/`Pnl`)·Delivery Analytics(`Logistics`)·Reverse Analytics(`OrderHub`)·Dashboard(Part 019)·Report(`Reports`)이나, **Fleet/Route/Cross Border Analytics(상위 도메인 부재·Part 034/035/039)·Fuel/Maintenance Cost·형식 metadata-driven Logistics KPI Registry/Data Mart는 부재**(부재증명 완료·Part 015/030 판정 정합). ★★핵심=**창고/배송/비용/예측 분석 값은 seed 실재이나 Fleet/Route/Cross Border 분석은 상위 도메인 부재로 부재이며 형식 Logistics KPI Registry/Data Mart는 미완**(과대주장 금지). 실행은 형식 KPI Registry + 상위 도메인 구현 후 종속.
