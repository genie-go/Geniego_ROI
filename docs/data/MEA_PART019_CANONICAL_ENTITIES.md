# MEA Part 019 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★프론트 대시보드·Reports·Rollup·Alerting 재사용·형식 Scorecard/전략 계층 greenfield·Part 013~018 상속·One Version of Truth.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | EXECUTIVE_DASHBOARD | 프론트 대시보드 | `RollupDashboard.jsx`·`Dashboard.jsx` | PARTIAL-strong |
| 2 | DASHBOARD_WIDGET | 차트 타입 | `ReportBuilder.jsx`(REPORT_VIZ_TYPES) | PARTIAL-strong |
| 3 | EXECUTIVE_REPORT | 예약 리포트 | `Reports.php`(193차) | PARTIAL-strong |
| 4 | SCORECARD | 부재(형식 Scorecard) | — | ABSENT-formal |
| 5 | STRATEGIC_OBJECTIVE | objective 퍼널(부분) | (220차 objective) | PARTIAL-informal |
| 6 | BUSINESS_GOAL | 목표(부분) | `AutoRecommend`(objective) | PARTIAL-informal |
| 7 | EXECUTIVE_ALERT | 알림 정책 | `Alerting.php` | PARTIAL |
| 8 | PERFORMANCE_STATUS | KPI 상태 | `Rollup`·`Pnl` | PARTIAL |
| 9 | EXECUTIVE_INSIGHT | aggregate insight | `Insights.php` | PARTIAL |
| 10 | KPI_SNAPSHOT | 사전집계 | `Rollup.php`(V423) | PARTIAL-strong |
| 11 | DASHBOARD_LAYOUT | 부재(형식 영속) | — | ABSENT-formal |
| 12 | REPORT_TEMPLATE | 리포트 스케줄(부분) | `Reports.php`(report_schedule) | PARTIAL |
| 13 | EXECUTIVE_SESSION | 세션 인증 | `index.php`·`UserAuth` | PARTIAL |
| 14 | EXECUTIVE_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL-strong |
| 15 | STRATEGIC_METRIC | ROI/Profit/SoS | `Rollup`·`Pnl`·SoS(267차) | PARTIAL |

## §6~§16 표준 판정
- **§6 Domain(12)**: Executive/ROI=RollupDashboard·Financial/Profit=PnLDashboard·Marketing=ChannelKPI·Data=DataTrustDashboard. Board/Investor(형식)=ABSENT.
- **§7 Widget(14)**: ReportBuilder REPORT_VIZ_TYPES·KPI/ROI Card=Rollup/Pnl·Funnel=objective(220차)·AI Panel=AutoRecommend·Drag&Drop 영속(형식)=부분.
- **§8 Scorecard(8)**: Corporate KPI=Rollup·Goal=objective·★Balanced Scorecard·형식 Scorecard Engine=ABSENT.
- **§9 Monitoring(12)**: ROI/Profit=Rollup/Pnl·Growth=CRM·AI=ModelMonitor·Market Share=SoS·ESG(형식)=ABSENT.
- **§10 Reporting(10)**: Daily/Weekly/Monthly=Reports 예약·Board/Investor/Regulatory(형식)=부분.
- **§11 Personalization(8)**: Role-Based=RBAC+AdminMenu·Language=15국 i18n·Favorite/Saved View(형식)=부분.
- **§12 Security**: Tenant/RBAC/Permission/Audit/Encryption(Part 001~018 상속).
- **§16 AI**: 우선순위=AutoRecommend·이상=AnomalyDetection·Opportunity=Insights·Explainability=헌법 V4·경영 결정 자동 실행 불가=헌법 V5+V3+CHANGE_GATE. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§1~3·§10·§14=대시보드/위젯/리포트/집계/감사) / PARTIAL(§5~9·§12·§13·§15) / ABSENT-formal(§4 SCORECARD·§11 DASHBOARD_LAYOUT·형식 Enterprise Scorecard Engine/Strategic Objective 관리/Board·Investor Dashboard/ESG/Personalization Manager).** 코드 0. ★대시보드(프론트)·리포트(`Reports`)·KPI 집계(`Rollup`) 재사용(★중복 대시보드/KPI 계산 절대 금지·One Version of Truth)·형식 Scorecard/전략 계층 신설(값·대시보드 재구현 없이)·Part 013~018 상속·AI 경영 결정 자동 실행 불가(V5+V3).
