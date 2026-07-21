# MEA Part 013 — ROI Intelligence Platform Foundation · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세(★ROI Platform 계층 시작) · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Data Platform(Part 001~012) 전체**를 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). 특히 Part 003 EDW(KPI/ROI 값 SSOT)·Part 004 Metadata(KPI 정의)·Part 006 DQM(Trust First)·데이터 헌법 6볼륨을 준수·인용한다. ★**ROI 값 SSOT는 이미 실재**(GT①)·본 Part는 형식 정의 레지스트리 계층만 추가. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
기업 모든 활동을 Investment/Cost/Revenue/Profit/Value 관점에서 통합 분석하는 ROI Intelligence Platform Foundation. Marketing/Commerce/Logistics/Financial/AI ROI를 포함하는 모든 ROI 서비스의 최상위 Foundation·ROI Platform SSOT.

## §2 구현 범위
Enterprise ROI Platform · ROI Domain Model · ROI Governance · ROI Calculation/KPI/Financial Measurement/ROI Intelligence Framework · ROI Metadata/Security/Runtime Standard.

## §3 구현 목표 (10)
Enterprise ROI Platform · ROI Registry · ROI Metadata Repository · ROI Governance Manager · KPI Registry · Financial Metric Registry · ROI Policy Manager · ROI Runtime Manager · ROI Dashboard Foundation · ROI AI Foundation.

## §4 아키텍처 원칙 (10)
Profit First · Business Outcome First · Explainable ROI · Canonical KPI · Financial Accuracy · Event Driven · AI Assisted · Enterprise Standard · Metadata Driven · Audit by Default.

## §5 Canonical Entity (15)
ROI_DOMAIN · ROI_MODEL · ROI_METRIC · ROI_KPI · ROI_POLICY · ROI_CALCULATION · ROI_PERIOD · ROI_TARGET · ROI_RESULT · ROI_BASELINE · ROI_FORECAST · ROI_AUDIT · ROI_DASHBOARD · ROI_SCORE · ROI_STATUS. → 상세 = `MEA_PART013_CANONICAL_ENTITIES.md`.

## §6 ROI Domain (12)
Marketing · Commerce · Logistics · Sales · Financial · AI · Customer · Product · Partner · Organization · Campaign · Enterprise ROI. → ★현행 매핑=Marketing ROI=`Mmm`/`Attribution`·Commerce ROI=`OrderHub`/`Rollup`·Logistics ROI=`Wms`·Financial ROI=`Pnl`/`PgSettlement`·Customer ROI=`CRM`(LTV)·Campaign ROI=`AutoCampaign`/`Attribution`·Enterprise ROI=`Rollup`(P&L SSOT).

## §7 ROI 측정 원칙 (8)
Investment · Cost · Revenue · Gross/Net Profit · Time Period · KPI 기준 · Currency. **계산 값 추적 가능.** → ★★현행 실재=Revenue/Gross·Net Profit/VAT=`Pnl`(267차 서버 P&L SSOT)·Cost/Investment=`Pnl`(광고비/원가·해외광고비 VAT제외 289차 정합)·Period=기간필터(PeriodFilterBar)·Currency=`CurrencyContext`·추적=`DataPlatform` lineage(Part 007). 형식 ROI Calculation Framework=값 재계산 없이 정의 계층만.

## §8 KPI 표준
KPI ID/Name/Business Definition/Calculation Formula/Data Source/Owner/Version/Frequency/Threshold/Status. → ★★현행: KPI **값**은 서버 SSOT(`Rollup`/`Pnl`/`Attribution`/`CRM`)·★단 **정의(Formula/Definition/Version)는 코드 내재**(metadata-driven KPI Registry=ABSENT·Part 003/004 정합). Owner=Part 001 Ownership(ABSENT·신설).

## §9 ROI Governance
KPI 단일 정의 · ROI 계산식 버전 관리 · 승인 없는 계산식 변경 금지 · 계산 이력 보존 · 감사 로그 · Baseline 관리. → ★★실 substrate — KPI 단일 정의=무후퇴 value unification(값 단일소스·[[feedback_no_regression_value_unification]]·[[feedback_real_value_autoderive]])·계산식 변경 승인=`CHANGE_GATE`·계산 이력/감사=`SecurityAudit`·버전=git. 형식 Formula Version Manager/Baseline Manager=ABSENT.

## §10 Financial 기준 (10)
Revenue · Gross/Operating/Net Profit · Investment · Cost · Margin · Cash Flow · Budget · Forecast. → ★현행=Revenue/Gross/Net/Operating Profit/Margin/Cost/Investment=`Pnl`(VAT·취소/반품 역분개 263차)·`Rollup`. Cash Flow/Budget/Forecast=부분/ABSENT. 형식 Financial Metric Registry=ABSENT.

## §11 Data Security
Tenant Isolation · Financial Data Encryption · RBAC · Audit Logging · Formula Protection · Sensitive Data Masking. → ★Part 001~012 상속: Tenant=`Db.php`·Encryption=`Crypto`·RBAC=`index.php`·Audit=`SecurityAudit`·★Formula Protection=git+G2 sacred SHA(계산식 변경=CHANGE_GATE+감사).

## §12 Runtime 규칙
KPI 검증 · Formula Version 검증 · Financial Metric 검증 · Baseline 확인 · ROI 계산 이력 저장 · Audit. → ★KPI 값=`Rollup`/`Pnl` SSOT·계산 이력/Audit=`SecurityAudit`. Formula Version/Baseline 검증=순신설(형식 Registry 후).

## §13 API 표준 (8)
Register ROI Model/KPI · Query ROI Definition/KPI/Financial Metric · Validate/Publish ROI Model · Query ROI Status. → ★Query KPI/ROI=`Rollup`/`Pnl`/`Attribution` API seed(실재)·Register/Publish/Validate ROI Model(형식)=ABSENT. Part 001 API 표준 상속.

## §14 Event 표준 (8)
ROIModelRegistered · KPIRegistered · ROIFormulaUpdated · ROIValidated · BaselineUpdated · FinancialMetricUpdated · ROIPublished · ROIAuditRecorded. → ABSENT(event-driven 부재·Data Platform §15 정합·`SecurityAudit`가 ROI 감사 대체).

## §15 AI Integration
KPI/ROI 모델/Baseline 추천 · Formula 검증 · KPI 이상 탐지 · ROI 구조 최적화 · Financial 연관성 분석 · **ROI Explainability 지원** **만**·ROI 계산식 직접 변경/승인 불가. → ★KPI 이상=`AnomalyDetection`·ROI Explainability=헌법 V4(근거/신뢰도)·ROI 최적화=`Mmm`(frontier)·직접 변경/승인 불가=헌법 V3+`CHANGE_GATE`. KPI/Baseline 추천=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §16 성능 요구사항
KPI 조회 ≤200ms · ROI 정의 ≤300ms · Formula 검증 ≤500ms · Dashboard ≤2초 · Availability ≥99.99%. (벤치 대상 미존재·현행 Rollup 사전집계로 조회 최적화 seed.)

## §17 Completion Criteria
Enterprise ROI Platform·ROI/KPI/Financial Metric Registry·ROI Governance·Runtime·Security·API/Event·AI Foundation·ROI 표준 수립. → **현재 미충족**(형식 ROI/KPI/Financial Metric Registry·Formula Version/Baseline Manager ABSENT·코드 0). ★단 ROI/KPI 값 SSOT·거버넌스(무후퇴/CHANGE_GATE)는 실 강함.

## 판정
**PARTIAL-strong(★ROI/KPI 값 SSOT 실재·감사됨=Rollup/Pnl/Attribution/Mmm/CRM·ROI 도메인 실 핸들러·Financial(VAT/profit/margin)·거버넌스=무후퇴/CHANGE_GATE·Explainability=헌법 V4·Currency/Period) / ABSENT-formal(형식 ROI/KPI/Financial Metric Registry·metadata-driven 정의·Formula Version/Baseline Manager·ROI Dashboard Foundation).** ★핵심=ROI/KPI **값**은 이미 서버 SSOT(제품 핵심·무후퇴 단일소스·VAT/역분개 감사됨)이나 **정의는 코드 내재**(형식 metric 레지스트리 부재·Part 003 정합). Data Platform(Part 001~012) 상속(재정의 금지)·★중복 KPI/ROI 계산 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·AI 계산식 직접변경/승인 불가(V3+CHANGE_GATE). 코드 변경 0.

## 다음
MEA Part 014 — Enterprise ROI Calculation Engine Architecture(본 ROI Foundation 상속·확장).
