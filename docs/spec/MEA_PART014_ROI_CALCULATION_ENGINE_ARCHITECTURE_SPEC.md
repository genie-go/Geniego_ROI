# MEA Part 014 — Enterprise ROI Calculation Engine Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 013(ROI Foundation)+Data Platform(Part 001~012)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). Part 013 ROI/KPI 값 SSOT·Part 003 Aggregation(Rollup)·Part 006 DQM Validation·데이터 헌법 6볼륨을 준수·인용한다. ★**ROI 계산 엔진은 이미 실재**(GT①·Rollup/Pnl/Attribution)·본 Part는 형식 Formula-as-Code 계층만 추가(값 재계산 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
모든 ROI 계산을 표준화하고 일관·재현 가능한 결과를 제공하는 핵심 계산 엔진. Marketing/Commerce/Logistics/Financial/AI ROI 계산의 실행 기준(Runtime Standard)·ROI Platform 핵심 컴포넌트.

## §2 구현 범위
ROI Calculation Engine · Formula Engine · Calculation Runtime · Metric Aggregation · Financial Calculation · Multi-Currency Calculation · Scenario Calculation · Formula Version Management · Calculation Audit · AI Calculation Optimization.

## §3 구현 목표 (10)
ROI Calculation Engine · Formula Repository · Formula Execution Engine · Metric Aggregation Engine · Financial Calculation Engine · Currency Conversion Engine · Scenario Calculation Engine · Formula Version Manager · Calculation Audit Service · AI Optimization Engine.

## §4 아키텍처 원칙 (10)
Single Calculation Engine · Formula as Code · Explainable Calculation · **Deterministic Result** · Version Controlled · Event Driven · Metadata Driven · Financial Accuracy · AI Assisted · Enterprise Standard.

## §5 Canonical Entity (15)
ROI_FORMULA · ROI_FORMULA_VERSION · ROI_CALCULATION_JOB · ROI_CALCULATION_RESULT · ROI_INPUT_PARAMETER · ROI_OUTPUT_RESULT · ROI_METRIC_VALUE · ROI_FINANCIAL_VALUE · ROI_SCENARIO · ROI_CURRENCY_RATE · ROI_EXECUTION_LOG · ROI_CALCULATION_AUDIT · ROI_ERROR · ROI_THRESHOLD · ROI_VALIDATION_RESULT. → 상세 = `MEA_PART014_CANONICAL_ENTITIES.md`.

## §6 지원 계산 유형 (10)
Marketing/Commerce/Logistics/Financial/Customer/Product/Campaign/Organization/AI/Enterprise ROI. 동일 Runtime. → ★현행=실 핸들러 계산(Marketing=`Mmm`/`Attribution`·Commerce=`OrderHub`/`Rollup`·Financial=`Pnl`·Customer=`CRM`·Enterprise=`Rollup` P&L SSOT·Part 013 정합).

## §7 Formula 관리
Formula ID/Name/Business Definition/Expression/Version/Effective Date/Owner/Approval/Priority/Status. 이전 버전 유지. → ★★현행: 계산식(Formula)은 **코드 내재**(`Rollup`/`Pnl`/`Attribution` PHP)·버전=git·Approval=`CHANGE_GATE`. ★**형식 Formula Repository/Formula-as-Code(선언적 Expression)/Formula Version Manager=ABSENT**(Part 013 정합).

## §8 Calculation Workflow (10단계)
입력 검증→KPI 검증→Formula 선택→Currency 변환→Financial 계산→ROI 계산→Validation→Audit→Event 발행→Dashboard. → ★현행=입력 검증(인라인/Part 006)·Financial/ROI 계산(`Pnl`/`Rollup`/`Attribution`)·Currency 변환(CurrencyContext)·Audit(`SecurityAudit`)·Dashboard(프론트). Formula 선택/Event 발행(형식)=ABSENT.

## §9 Currency 처리
Multi-Currency · Daily/Historical Exchange Rate · Base Currency Conversion · Exchange Rate Audit · Currency Version. **기준+원본 통화 함께 저장.** → ★현행=Multi-Currency/Base Conversion=`CurrencyContext`+`Pnl`(통화 처리). Daily/Historical FX Rate 버전/Exchange Rate Audit=부분/ABSENT(형식 Currency Conversion Engine 신설).

## §10 Validation (8)
Formula/Parameter/Financial/KPI/Threshold/Scenario/Currency/Version Validation. → ★Part 006 DQM 정합(Financial/KPI 검증=`Pnl`/`Rollup`·인라인 bounds). Formula/Scenario/Version Validation(형식)=순신설.

## §11 Audit 정책
Formula Version · Input/Output · Execution Time · User · Source Data · Currency · Timestamp · Trace ID. → ★계산 감사=`SecurityAudit`(actor/action/details·불변)·Source Data=`DataPlatform` lineage(Part 007). Trace ID(형식)=순신설.

## §12 Data Security
Formula Protection · Financial Data Encryption · Tenant Isolation · RBAC · Audit Logging · **Immutable Calculation History**. → ★Part 001~013 상속: Formula Protection=git+G2 sacred SHA+`CHANGE_GATE`·Encryption=`Crypto`·Tenant=`Db.php`·RBAC=`index.php`·★Immutable Calculation History=`SecurityAudit`(append-only 해시체인).

## §13 Runtime 규칙
Formula Version 검증 · 입력 검증 · KPI 검증 · Currency 변환 · Calculation Audit · Event 발행. → ★입력/KPI 검증=Part 006·계산=`Rollup`/`Pnl`(결정론적 SSOT)·Currency=CurrencyContext·Audit=`SecurityAudit`. Formula Version 검증/Event 발행=순신설.

## §14 API 표준 (8)
Execute ROI Calculation · Validate/Query/Register/Update Formula · Query Calculation Result · Compare Formula Version · Get Calculation Audit. → ★Execute/Query Result=`Rollup`/`Pnl`/`Attribution` API seed(실재)·Compare Version=git diff. Register/Update/Validate Formula(형식)=ABSENT. Part 001 API 표준 상속.

## §15 Event 표준 (8)
CalculationStarted/Completed/Failed · FormulaValidated/Published · CurrencyUpdated · CalculationAudited · ROIResultGenerated. → ABSENT(event-driven 부재·Data Platform §15 정합·`SecurityAudit`가 계산 감사 대체).

## §16 AI Integration
Formula 최적화 추천 · 계산 성능 예측 · 입력 이상 탐지 · 계산 오류 분석 · Financial 이상 탐지 · Scenario 추천 · KPI 영향 분석 · **Explainable Calculation Report** **만**·Formula 직접 수정/승인 불가. → ★입력/Financial 이상=`AnomalyDetection`·Explainable=헌법 V4·Scenario=`Mmm`(frontier). Formula 직접 수정/승인 불가=헌법 V3+`CHANGE_GATE`. 최적화/성능 예측=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
단일 계산 ≤200ms · 대량 ≥100k건/분 · Formula 조회 ≤100ms · Validation ≤200ms · Availability ≥99.99%. (벤치 대상 미존재·현행 `Rollup` 사전집계로 조회 최적화 seed.)

## §18 Completion Criteria
ROI Calculation Engine·Formula Repository·Financial Calculation·Currency Conversion·Validation·Audit·Security·Runtime·API/Event·AI 구현. → **현재 미충족**(형식 Formula-as-Code Engine/Repository/Version Manager·Scenario·Currency Conversion Engine ABSENT·코드 0). ★단 계산 엔진(Rollup/Pnl/Attribution)·결정론·감사는 실 강함.

## 판정
**PARTIAL-strong(★ROI Calculation Engine=Rollup/Pnl/Attribution/Mmm/CRM 명령형·결정론적 SSOT·Financial=Pnl VAT·Currency=CurrencyContext·Aggregation=Rollup·Audit=SecurityAudit(Immutable)·Explainable=헌법 V4·Validation=Part 006) / ABSENT-formal(형식 Formula-as-Code Engine·Formula Repository·Formula Version Manager·Scenario Calculation Engine·Currency Conversion Engine(FX versioning)·Event 표준).** ★핵심=계산 엔진은 이미 실재·결정론적 SSOT(제품 핵심)이나 "Formula as Code" 선언적 엔진·formula repository·versioning은 부재(코드 내재·Part 013 정합). Part 013/Data Platform 상속(재정의 금지)·★중복 계산 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·AI Formula 직접수정/승인 불가(V3+CHANGE_GATE). 코드 변경 0.

## 다음
MEA Part 015 — Enterprise KPI Management Architecture(본 Calculation Engine 상속·확장).
