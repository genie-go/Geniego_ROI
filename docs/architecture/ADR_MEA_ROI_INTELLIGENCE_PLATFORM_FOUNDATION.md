# ADR — MEA Part 013 ROI Intelligence Platform Foundation

> **거버넌스 상태**: 아키텍처 결정 기록(★ROI Platform 계층 시작) · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part013 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 013은 ROI Platform Foundation. ★GeniegoROI는 **ROI 분석 플랫폼 자체**로 ROI/KPI **값** 산출이 이미 서버 SSOT로 실재·광범위 감사됨 — `Rollup`(P&L SSOT+집계)·`Pnl`(VAT/gross·net/operating profit·취소반품 역분개)·`Attribution`(ROAS/ROI)·`Mmm`(marketing mix/ROI frontier)·`CRM`(LTV/CAC). 단 이 값들은 **코드 내재 계산**이지 형식 metadata-driven ROI/KPI/Financial Metric Registry·Formula Version/Baseline Manager가 아니다(Part 003 EDW와 동일 판정). 본 Part는 Data Platform(Part 001~012) 상속(재정의 금지).

## 결정
- **D-1 (Data Platform Part 001~012·Part 003 재정의 금지):** KPI/ROI 값(Part 003 EDW)·Metadata(Part 004)·DQM Trust First(Part 006)·Lineage(Part 007)·거버넌스(Part 012)를 준수·인용. ROI 도메인(§6)=실 핸들러 매핑. 중복 정의 금지.
- **D-2 (ROI/KPI 값 SSOT = Rollup/Pnl/Attribution 승격·★중복 계산 절대 금지):** Revenue/Gross·Net·Operating Profit/ROAS/ROI/LTV/CAC/Margin 값 = `Rollup`/`Pnl`(VAT)/`Attribution`/`CRM`/`Mmm`. ★값은 단일소스·무후퇴([[feedback_no_regression_value_unification]]·[[feedback_real_value_autoderive]])로 이미 강제. ★중복 KPI/ROI 계산 신설 절대 금지(값 분산=회귀). 형식 KPI Registry는 정의를 메타데이터화(값 재계산 아님).
- **D-3 (ROI Governance = 무후퇴 + CHANGE_GATE + SecurityAudit 재사용):** KPI 단일 정의=무후퇴 value unification·계산식 변경 승인=`CHANGE_GATE`·계산 이력/감사=`SecurityAudit`·버전=git·Formula Protection=G2 sacred SHA. 형식 Formula Version/Baseline Manager=순신설(중복 거버넌스 금지).
- **D-4 (Financial = Pnl 승격·형식 Registry 신설):** Revenue/Gross/Operating/Net Profit/Margin/Cost/Investment=`Pnl`(VAT·해외광고비 VAT제외 289차·취소반품 역분개 263차)·`Rollup`. Cash Flow/Budget/Forecast=부분/신설. 형식 Financial Metric Registry=순신설(값 재정의 금지).
- **D-5 (Explainability/AI/Security = 헌법·Part 001~012 정합):** Explainable ROI=헌법 V4(근거/신뢰도·근거없는 결론 금지). AI(KPI 이상/ROI 최적화)=`AnomalyDetection`/`Mmm`·ROI 계산식 직접변경/승인 불가=헌법 V3+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. Security=tenant(`Db.php`·[[reference_platform_growth_actas_tenant_hijack]])/RBAC/Crypto/SecurityAudit.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED·★ROI Platform 계층 시작**. Data Platform(Part 001~012)/Part 003/헌법 상속·재정의 금지·ROI/KPI 값 SSOT는 이미 실재(★중복 계산 절대 금지)·형식 ROI/KPI/Financial Metric Registry·Formula Version/Baseline Manager는 값 재계산 없이 정의 계층만 신설(무후퇴). 실행은 선행 Part 001~012 종속.
