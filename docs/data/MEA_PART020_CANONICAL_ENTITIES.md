# MEA Part 020 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★AutoRecommend(자가학습)·Mmm(optimize/frontier)·AbTesting·Rollup/Pnl 재사용·형식 Continuous Improvement 계층 greenfield·Part 013~019 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | OPTIMIZATION_PLAN | 부재(형식 Plan) | — | ABSENT-formal |
| 2 | OPTIMIZATION_ACTION | 예산 배분·추천 액션 | `Mmm`(optimize:209)·`AutoRecommend` | PARTIAL |
| 3 | IMPROVEMENT_GOAL | objective(부분) | (220차 objective) | PARTIAL-informal |
| 4 | PERFORMANCE_GAP | 목표 대비 실측 | `Rollup`/`Pnl` vs 목표 | PARTIAL-informal |
| 5 | ACTION_RECOMMENDATION | ROI 기반 추천 | `AutoRecommend.php` | PARTIAL-strong |
| 6 | OPTIMIZATION_SCENARIO | PROFIT(T)·배분 시나리오 | `Mmm`(frontier/optimize) | PARTIAL |
| 7 | IMPROVEMENT_RESULT | 성과 측정 | `Rollup`/`Pnl`·`AbTesting` | PARTIAL |
| 8 | IMPROVEMENT_STATUS | 부재(형식 상태) | — | ABSENT-formal |
| 9 | IMPROVEMENT_OWNER | 부재(형식 Owner) | — | ABSENT-formal |
| 10 | BENEFIT_ESTIMATE | 예상 ROI | `Mmm`(frontier) | PARTIAL |
| 11 | IMPLEMENTATION_COST | 비용 컴포넌트 | `Pnl`(비용 조립) | PARTIAL |
| 12 | ROI_IMPROVEMENT | ROI 델타 | `Rollup`(ROI) | PARTIAL |
| 13 | OPTIMIZATION_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 14 | CONTINUOUS_MONITOR | ROI/KPI Trend·Risk | `Rollup`·`Alerting` | PARTIAL |
| 15 | ACTION_STATUS | 캠페인 상태(부분) | `AutoCampaign`(auto_campaign) | PARTIAL |

## §6~§16 표준 판정
- **§6 Domain(12)**: Marketing=Mmm/AutoRecommend·Commerce=AutoCampaign·Logistics=Wms·Product=PriceOpt·AI=ModelMonitor. Resource/Org/Strategic(형식)=부분.
- **§7 Closed-Loop(10)**: ★AutoRecommend 자가학습(성과→prior 정밀화·251차)·Mmm optimize·승인=헌법 V5·형식 통합 Workflow=부분.
- **§8 Goal Management(8)**: objective(220차)·형식 Goal Management Service(Alignment/Tracking)=ABSENT.
- **§9 Action Recommendation(10)**: Budget=Mmm optimize·Campaign=AutoRecommend·Pricing=PriceOpt·예상 ROI=Mmm frontier. 실재 강함.
- **§10 Tracking(10)**: 실측=Rollup/Pnl·A/B=AbTesting·Planned vs Actual/Benefit Realization(형식)=ABSENT.
- **§11 Monitoring(8)**: ROI/KPI Trend=Rollup·Risk=Alerting/AnomalyDetection·Continuous Improvement Score(형식)=ABSENT.
- **§12 Security**: Tenant/RBAC/Audit/Approval Control(V5)/Masking(Part 001~019 상속).
- **§16 AI**: 개선 추천=AutoRecommend·Resource=Mmm optimize·Explainability=헌법 V4·자동 승인/적용 불가=헌법 V5+V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§5·§13=추천/감사) / PARTIAL(§2~4·§6·§7·§10~12·§14·§15) / ABSENT-formal(§1 PLAN·§8 STATUS·§9 OWNER·형식 Continuous Improvement Manager/Goal Management/Improvement Tracker).** 코드 0. ★폐루프 최적화(`AutoRecommend`/`Mmm`)·개선 측정(`AbTesting`)·성과(`Rollup`/`Pnl`) 재사용(★중복 최적화/추천 절대 금지)·형식 Continuous Improvement 계층 신설(최적화 재구현 없이)·Part 013~019 상속·★AI 개선 계획 자동 승인/적용 불가(V5+V3+CHANGE_GATE).
