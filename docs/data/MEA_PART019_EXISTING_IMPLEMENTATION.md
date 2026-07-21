# MEA Part 019 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 019 SPEC/ADR.

## 전수조사 방법
dashboard/executive/scorecard/report/widget/snapshot/objective 키워드로 `backend/src/Handlers` + `frontend/src/pages` 전수 grep + 판독.

## 실존 substrate (★대시보드·리포트 빌더)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| Executive/ROI Dashboard | 프론트 대시보드 | `RollupDashboard.jsx`·`Dashboard.jsx` | PARTIAL-strong |
| Financial/Profit Dashboard | P&L 대시보드 | `PnLDashboard.jsx`·`Pnl.php` | PARTIAL-strong |
| Marketing/Data Dashboard | 채널 KPI·데이터 신뢰 | `ChannelKPI.jsx`·`DataTrustDashboard.jsx`·`PMOverview.jsx` | PARTIAL |
| Executive Reporting | ★예약 리포트·KPI 요약·발송 | `Reports.php`(193차·report_schedule·KPI 요약·Mailer·report_run·reports_cron.php:14~15) | PARTIAL-strong |
| Widget/Viz | 차트 타입 | `ReportBuilder.jsx`(REPORT_VIZ_TYPES:33) | PARTIAL-strong |
| KPI Snapshot/집계 | 사전집계 레이어 | `Rollup.php`(V423:12) | PARTIAL-strong |
| Strategic Monitoring | ROI/Profit/성장/AI | `Rollup`·`Pnl`·`CRM`·`ModelMonitor`·SoS(267차) | PARTIAL |
| Executive Alert | 알림 정책 | `Alerting.php` | PARTIAL |
| Role-Based Personalization | RBAC+메뉴+i18n | `index.php`·`AdminMenu.php`·15개국 i18n(270차) | PARTIAL |
| AI Executive Advisor | 우선순위/Opportunity | `AutoRecommend`·`Insights`·`AnomalyDetection` | PARTIAL |
| Audit/Encryption | 해시체인·AES | `SecurityAudit.php`·`Crypto` | PARTIAL-strong |

## 부재(ABSENT-formal) — 형식 Scorecard/전략 계층 (grep 0 또는 산재)
형식 Enterprise Scorecard Engine(Balanced Scorecard)·Strategic Objective/Business Goal 형식 관리·Board/Investor Dashboard·ESG Indicator·Dashboard Personalization Manager(형식 레이아웃 영속·Favorite/Saved View)·형식 Report Template Registry·Executive Cockpit(형식)·Event 표준(DashboardOpened 등).

## 판정
**PARTIAL-strong / ABSENT-formal.** ★대시보드·리포트 빌더·KPI 집계는 **실재**: 프론트 대시보드 6+(Dashboard/PnL/Rollup/ChannelKPI/DataTrust/PMOverview)·`Reports`(193차 예약 리포트·KPI 요약·Mailer·cron)·`ReportBuilder.jsx`(REPORT_VIZ_TYPES)·`Rollup`(사전집계)·`Alerting`(Alert)·RBAC+i18n 15국(Personalization)이나, **형식 Enterprise Scorecard Engine·Strategic Objective 관리·Board/Investor Dashboard·ESG·Personalization Manager는 부재**(Part 013~018 동일). One Version of Truth=`Rollup`/`Pnl` SSOT(Part 015). 실행은 선행 Part 001~018 + 형식 Scorecard/전략 계층 신설(값·대시보드 재구현 없이) 종속.
