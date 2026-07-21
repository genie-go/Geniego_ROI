# MEA Part 040 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Wms/Pnl/Rollup/DemandForecast/SupplyChain 재사용·형식 KPI Registry/Data Mart greenfield·Fleet/Route/Cross Border 분석은 상위 도메인 부재로 부재·Part 015/019/027 상속·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | LOGISTICS_KPI | 물류 KPI 값(값 SSOT) | `Wms`/`Pnl`/`Rollup` | PARTIAL-strong(값)·ABSENT(레지스트리) |
| 2 | LOGISTICS_METRIC | 지표 집계 | `Rollup`/`Pnl` | PARTIAL-strong |
| 3 | TRANSPORT_METRIC | 운송 지표(배송비) | `Pnl`(shippingCost) | PARTIAL-weak |
| 4 | WAREHOUSE_METRIC | deadStock·재고 정확도 | `Wms`(288차) | PARTIAL-strong |
| 5 | DELIVERY_METRIC | 배송 상태 | `Logistics` | PARTIAL |
| 6 | FLEET_METRIC | 부재(Fleet·Part 034) | — | ABSENT |
| 7 | ROUTE_METRIC | 부재(Route·Part 035) | — | ABSENT |
| 8 | COST_METRIC | 배송비/COGS | `Pnl`(FEFO COGS) | PARTIAL-strong |
| 9 | SERVICE_LEVEL | SLA·알림 | `Alerting`·`SupplyChain` | PARTIAL |
| 10 | OPERATIONAL_INSIGHT | insight | `Insights` | PARTIAL |
| 11 | LOGISTICS_FORECAST | Holt-Winters | `DemandForecast`(Part 017) | PARTIAL-strong |
| 12 | ANALYTICS_REPORT | 리포트 빌더 | `Reports`(193차) | PARTIAL-strong |
| 13 | ANALYTICS_POLICY | Data Quality | `DataPlatform`(DataTrust) | PARTIAL |
| 14 | ANALYTICS_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | DASHBOARD_CONFIGURATION | 대시보드(Part 019) | Part 019·`AdminMenu` | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: Warehouse=Wms·Delivery=Logistics·Reverse=OrderHub·Cost=Pnl·공급망=SupplyChain. ★Fleet/Route/Cross Border(도메인 부재)=ABSENT.
- **§7 KPI(10)**: Warehouse Util=Wms·Cost=Pnl·ROI=Rollup·Satisfaction=Reviews. ★Fleet Util/Route Efficiency(도메인 부재)·형식 KPI Registry(Part 015)=부재.
- **§8 Operational(8)**: Delay=AnomalyDetection/SupplyChain·Capacity=Wms·SLA=Alerting. ★Bottleneck/Benchmarking=부재.
- **§9 Cost(8)**: Transportation/Delivery=Pnl·Warehouse=Pnl/Wms(FEFO COGS)·Optimization=Mmm. ★Fuel/Maintenance(Fleet 부재)=부재.
- **§10 Forecast(8)**: Demand/Capacity=DemandForecast·Risk=SupplyChain. ★Fleet/Driver Requirement(Fleet 부재)=부재.
- **§11 Dashboard(8)**: Warehouse/Cost=Part 019·Control Tower=WmsCctv(Part 037)·역할=RBAC. ★Fleet/Route(도메인 부재)=부재.
- **§12 Governance(8)**: Data Quality=DataPlatform·Report=Reports·KPI Policy(Part 015 부재)=부분.
- **§13 Security**: Tenant/RBAC/Dashboard Access/★No-PII 집계/Audit(Part 021 상속).
- **§17 AI**: 수요=DemandForecast·지연=AnomalyDetection·비용 절감=Mmm·SLA 위험=SupplyChain·Explainability=헌법 V4·운영 데이터 직접 변경/정책 자동 수정 불가=헌법 V3+V5+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1·§2·§4·§8·§11·§12·§14=KPI 값/창고/비용/예측/리포트/감사) / PARTIAL(§3·§5·§9·§10·§13·§15) / ABSENT(§6·§7 FLEET/ROUTE_METRIC·형식 Logistics KPI Registry/Data Mart·Fleet/Route/Cross Border 분석).** 코드 0. ★물류 KPI 값(`Wms`/`Pnl`/`Rollup`)·예측(`DemandForecast`)·대시보드(Part 019) 재사용(★중복 물류 KPI/분석 계산 절대 금지·One Version of Truth)·형식 KPI Registry/Data Mart 신설(값 재계산 없이)·Fleet/Route/Cross Border 분석은 상위 도메인 구현 시 순신설·Part 015/019/027 상속·★AI 운영 데이터 직접 변경/물류 정책 자동 수정 불가(V3+V5+CHANGE_GATE).
