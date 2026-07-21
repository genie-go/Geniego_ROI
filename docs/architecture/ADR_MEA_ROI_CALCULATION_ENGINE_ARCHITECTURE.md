# ADR — MEA Part 014 Enterprise ROI Calculation Engine Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part014 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 014는 ROI Calculation Engine(Part 013 ROI Foundation의 계산 엔진 상세). ★GeniegoROI는 ROI 계산 엔진이 이미 실재·결정론적 SSOT — `Rollup`(P&L SSOT+집계)·`Pnl`(VAT/gross·net profit)·`Attribution`(ROAS/ROI)·`Mmm`(marketing mix)·`CRM`(LTV/CAC)가 명령형 PHP로 계산(같은 입력→같은 출력·무후퇴 단일소스). Currency=`CurrencyContext`+`Pnl`. 단 이 엔진은 "Formula as Code"(선언적 Expression·formula repository·versioning)가 아니라 코드 내재 계산이다(Part 013/003 동일 판정). 본 Part는 Part 013/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 013/003/Data Platform 재정의 금지):** ROI/KPI 값(Part 013·Part 003)·Aggregation(Rollup)·Validation(Part 006)·Lineage(Part 007)를 준수·인용. 계산 유형(§6)=실 핸들러 매핑. 중복 정의 금지.
- **D-2 (Calculation Engine = Rollup/Pnl/Attribution 승격·★중복 계산 절대 금지):** Single Calculation Engine = `Rollup`/`Pnl`/`Attribution`/`Mmm`/`CRM`(명령형·결정론적 SSOT). ★값은 무후퇴 단일소스([[feedback_no_regression_value_unification]])로 이미 강제. ★중복 계산/집계 엔진 신설 절대 금지(값 분산=회귀). 형식 Formula Execution Engine은 이 계산을 래핑(값 재계산 아님).
- **D-3 (Formula as Code = ABSENT·형식 Repository 신설):** 계산식(Formula)은 현재 코드 내재(PHP)이지 선언적 Expression·formula repository·versioning 아님. 형식 Formula Repository/Formula-as-Code/Formula Version Manager=순신설(git+`CHANGE_GATE`가 현행 버전/승인). Scenario Calculation=`Mmm`(frontier) seed·형식 Scenario Engine 신설.
- **D-4 (Currency/Immutable = CurrencyContext/SecurityAudit 재사용):** Multi-Currency/Base Conversion=`CurrencyContext`+`Pnl`. Daily/Historical FX Rate versioning/Exchange Rate Audit=순신설. ★Immutable Calculation History=`SecurityAudit`(append-only 해시체인·[[reference_menu_audit_log_not_tamper_evident]]). 중복 감사 체인 신설 금지.
- **D-5 (Explainability/AI/Security = 헌법·Part 001~013 정합):** Explainable Calculation=헌법 V4(근거/신뢰도). AI(입력/Financial 이상·Scenario)=`AnomalyDetection`/`Mmm`·Formula 직접수정/승인 불가=헌법 V3+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. Formula Protection=git+G2 sacred SHA·Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·Encryption=`Crypto`.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 013/003/Data Platform/헌법 상속·재정의 금지·계산 엔진(Rollup/Pnl/Attribution)·결정론 SSOT·CurrencyContext·SecurityAudit 재사용(★중복 계산/집계/감사 절대 금지)·형식 Formula-as-Code Engine/Repository/Version Manager·Scenario·Currency Conversion Engine만 신설(값 재계산 없이). 실행은 선행 Part 001~013 종속.
