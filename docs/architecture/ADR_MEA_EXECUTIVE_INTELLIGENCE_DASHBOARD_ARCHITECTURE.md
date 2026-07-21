# ADR — MEA Part 019 Enterprise Executive Intelligence & Strategic Dashboard Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part019 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 019는 Executive Intelligence & Strategic Dashboard(경영진 시각화·전략 분석 최상위 계층). ★코드베이스에는 **대시보드/리포트가 이미 실재**: 프론트 `Dashboard.jsx`·`PnLDashboard.jsx`·`RollupDashboard.jsx`·`ChannelKPI.jsx`·`DataTrustDashboard.jsx`·`PMOverview.jsx`(GT①)·`Reports.php`(193차·report_schedule CRUD·KPI 요약·Mailer 발송·report_run·reports_cron.php·GT①)·`ReportBuilder.jsx`(REPORT_VIZ_TYPES)·`Rollup.php`(V423 KPI 집계). 본 Part는 Part 013~018/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 013~018/Data Platform 재정의 금지):** ROI/이익 값(Part 013/016)·KPI(Part 015)·Forecast(Part 017)·Decision(Part 018)·Metadata(Part 004)를 준수·인용. Dashboard 도메인(§6)=실 프론트/핸들러 매핑. 중복 정의 금지.
- **D-2 (대시보드 = 기존 프론트 승격·★중복 대시보드/KPI 계산 절대 금지·One Version of Truth):** 대시보드 = `Dashboard`/`PnLDashboard`/`RollupDashboard`/`ChannelKPI`/`DataTrustDashboard`. ★KPI/ROI 값 = `Rollup`/`Pnl` SSOT(Part 015·무후퇴 단일소스). ★"One Version of Truth"(§4)=★중복 KPI 계산 절대 금지(값 분산=회귀). 형식 Executive Dashboard Platform은 기존 대시보드를 조립(값 재계산 아님).
- **D-3 (Executive Reporting = Reports 승격):** 리포트 = `Reports.php`(예약 리포트 report_schedule·KPI 요약·Mailer 발송·report_run·reports_cron.php·GT①)+`ReportBuilder.jsx`(REPORT_VIZ_TYPES 위젯). ★193차 "가짜 셸→실구현" 이력(재구현 금지). Board/Investor/Regulatory Report(형식)·형식 Report Template=순신설.
- **D-4 (Scorecard/Monitoring = 기존 승격·형식 신설):** Corporate KPI=`Rollup`·Goal=objective 퍼널(220차)·Market Share=SoS(267차)·AI Performance=`ModelMonitor`·Alert=`Alerting`. ★형식 Enterprise Scorecard Engine(Balanced Scorecard)·Strategic Objective/Business Goal 형식 관리·ESG Indicator=순신설(중복 KPI 집계 금지·기존 파생).
- **D-5 (Personalization/AI/Security = 헌법·무후퇴 정합):** Role-Based=`index.php`(RBAC)+`AdminMenu`·Language=15개국 i18n(270차)·Tenant=`Db.php`·Audit=`SecurityAudit`·Encryption=`Crypto`. AI(Executive Summary/우선순위/Opportunity)=`AutoRecommend`/`AnomalyDetection`/`Insights`·Explainability=헌법 V4·★AI 경영 결정 자동 실행 불가=헌법 V5+V3+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 013~018/Data Platform/헌법 상속·재정의 금지·대시보드(프론트)·리포트(`Reports`)·KPI 집계(`Rollup`)·Alert(`Alerting`)·`SecurityAudit` 재사용(★중복 대시보드/KPI 계산 절대 금지·One Version of Truth)·형식 Enterprise Scorecard Engine·Strategic Objective 관리·Board/Investor Dashboard·Personalization Manager만 신설(값·대시보드 재구현 없이). 실행은 선행 Part 001~018 종속.
