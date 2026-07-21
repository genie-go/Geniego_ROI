# MEA Part 014 — Governance Mechanisms (§9~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §9 Currency 처리
Multi-Currency · Daily/Historical Exchange Rate · Base Currency Conversion · Exchange Rate Audit · Currency Version. 기준+원본 통화 함께 저장.
- 판정 **PARTIAL**. Multi-Currency/Base Conversion=`CurrencyContext.jsx`+`Pnl.php`(통화 처리). Daily/Historical FX Rate 버전·Exchange Rate Audit·기준+원본 동시 저장=부분/순신설(형식 Currency Conversion Engine).

## §10 Validation (8)
Formula/Parameter/Financial/KPI/Threshold/Scenario/Currency/Version Validation.
- 판정 **PARTIAL**. Financial/KPI 검증=`Pnl`/`Rollup`(값 SSOT·Part 006 DQM Trust First)·Parameter=인라인 bounds·Threshold=`Alerting`. Formula/Scenario/Version/Currency Validation(형식)=순신설.

## §11 Audit 정책
Formula Version · Input/Output · Execution Time · User · Source Data · Currency · Timestamp · Trace ID.
- 판정 **PARTIAL-strong**. 계산 감사=`SecurityAudit`(actor/action/details·append-only·[[reference_menu_audit_log_not_tamper_evident]])·Source Data=`DataPlatform` lineage(Part 007)·User=actor. Trace ID(형식)=순신설.

## §12 Data Security
Formula Protection · Financial Data Encryption · Tenant Isolation · RBAC · Audit Logging · Immutable Calculation History.
- 판정 **PARTIAL**(Part 001~013 상속). ★Formula Protection=git+pre-commit G2 sacred SHA+`CHANGE_GATE`(계산식 변경 승인)·Encryption=`Crypto`·Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`·★Immutable Calculation History=`SecurityAudit`(append-only 해시체인).

## §13 Runtime 규칙
Formula Version 검증 · 입력 검증 · KPI 검증 · Currency 변환 · Calculation Audit · Event 발행.
- 판정 **PARTIAL**. 입력/KPI 검증=Part 006·계산=`Rollup`/`Pnl`(★결정론적 SSOT)·Currency=CurrencyContext·Audit=`SecurityAudit`. Formula Version 검증/Event 발행=순신설.

## §14 API 표준 (8)
Execute ROI Calculation · Validate/Query/Register/Update Formula · Query Calculation Result · Compare Formula Version · Get Calculation Audit.
- **PARTIAL**(단 Execute/Query Result=`Rollup`/`Pnl`/`Attribution` API seed·Compare=git diff·Get Audit=`SecurityAudit`). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약. Register/Update Formula=admin 게이트.

## §15 Event 표준 (8)
CalculationStarted/Completed/Failed · FormulaValidated/Published · CurrencyUpdated · CalculationAudited · ROIResultGenerated.
- **ABSENT**(event-driven 부재·Data Platform §15 정합·`SecurityAudit`가 계산 감사 대체·내부 이벤트버스 후 신설).

## §16 AI Integration
Formula 최적화 추천 · 계산 성능 예측 · 입력 이상 탐지 · 계산 오류 분석 · Financial 이상 탐지 · Scenario 추천 · KPI 영향 분석 · Explainable Calculation Report · Formula 직접 수정/승인 불가.
- 판정 **PARTIAL**(헌법 정합). 입력/Financial 이상 탐지=`AnomalyDetection`·Explainable Calculation Report=데이터 헌법 V4(근거/신뢰도)·Scenario=`Mmm`(frontier). ★Formula 직접 수정/승인 불가=헌법 V3(수집≠사용)+`CHANGE_GATE`. 최적화/성능 예측=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE(중복 AI 엔진 금지·V3 난립금지).

## §17 성능 요구사항
단일 계산 ≤200ms · 대량 ≥100k건/분 · Formula 조회 ≤100ms · Validation ≤200ms · Availability ≥99.99%. — 벤치 대상 미존재·현행 `Rollup` 사전집계로 조회 최적화 seed.

## §18 Completion Criteria
ROI Calculation Engine·Formula Repository·Financial Calculation·Currency Conversion·Validation·Audit·Security·Runtime·API/Event·AI 구현.
- **현재 미충족**(형식 Formula-as-Code Engine/Repository/Version Manager·Scenario·Currency Conversion Engine·Event 표준 ABSENT·코드 0). ★단 계산 엔진·결정론·불변 감사는 실 강함.

## 종합 판정
전 메커니즘 **PARTIAL-strong/ABSENT-formal** — 계산 엔진(Rollup/Pnl/Attribution)·Financial(Pnl VAT)·Currency(CurrencyContext)·Immutable History(SecurityAudit)·Validation(Part 006)·Explainable(헌법 V4)는 재사용(★중복 계산/집계/통화/감사 절대 금지), **형식 Formula-as-Code Engine·Formula Repository·Formula Version Manager·Scenario Calculation Engine·Currency Conversion Engine(FX versioning)·Event 표준은 순신설(값 재계산 없이)**. Part 013/Data Platform/헌법 재정의 금지. 코드 변경 0.
