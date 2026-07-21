# MEA Part 013 — Governance Mechanisms (§9~§17)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §9 ROI Governance
KPI 단일 정의 · ROI 계산식 버전 관리 · 승인 없는 계산식 변경 금지 · 계산 이력 보존 · 감사 로그 · Baseline 관리.
- 판정 **PARTIAL-strong**. ★KPI 단일 정의=무후퇴 value unification(값 단일소스·[[feedback_no_regression_value_unification]]·[[feedback_real_value_autoderive]])·계산식 변경 승인=`CHANGE_GATE`·계산 이력/감사=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]])·버전=git. 형식 Formula Version Manager/Baseline Manager=순신설.

## §10 Financial 기준 (10)
Revenue · Gross/Operating/Net Profit · Investment · Cost · Margin · Cash Flow · Budget · Forecast.
- 판정 **PARTIAL-strong**. Revenue/Gross/Operating/Net Profit/Margin/Cost/Investment=`Pnl.php`(★VAT·해외광고비 VAT제외 289차·취소반품 역분개 263차)·`Rollup.php`. Cash Flow/Budget/Forecast=부분/ABSENT. 형식 Financial Metric Registry=순신설(값 재정의 금지).

## §11 Data Security
Tenant Isolation · Financial Data Encryption · RBAC · Audit Logging · Formula Protection · Sensitive Data Masking.
- 판정 **PARTIAL**(Part 001~012 상속). Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·Encryption=`Crypto`·RBAC=`index.php`·Audit=`SecurityAudit`·★Formula Protection=git+pre-commit G2 sacred SHA(계산식 변경=`CHANGE_GATE`+감사)·Masking=`ChannelCreds`.

## §12 Runtime 규칙
KPI 검증 · Formula Version 검증 · Financial Metric 검증 · Baseline 확인 · ROI 계산 이력 저장 · Audit.
- 판정 **PARTIAL**. KPI 값=`Rollup`/`Pnl` SSOT·계산 이력/Audit=`SecurityAudit`·Financial 검증=`Pnl`(VAT/역분개 술어 통일 286차). Formula Version/Baseline 검증=순신설(형식 Registry 후).

## §13 API 표준 (8)
Register ROI Model/KPI · Query ROI Definition/KPI/Financial Metric · Validate/Publish ROI Model · Query ROI Status.
- **PARTIAL**(단 Query KPI/ROI/Financial=`Rollup`/`Pnl`/`Attribution` API seed 실재). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약. Register/Publish=admin 게이트.

## §14 Event 표준 (8)
ROIModelRegistered · KPIRegistered · ROIFormulaUpdated · ROIValidated · BaselineUpdated · FinancialMetricUpdated · ROIPublished · ROIAuditRecorded.
- **ABSENT**(event-driven 부재·Data Platform §15 정합·`SecurityAudit`가 ROI 감사 대체·내부 이벤트버스 후 신설).

## §15 AI Integration
KPI/ROI 모델/Baseline 추천 · Formula 검증 · KPI 이상 탐지 · ROI 구조 최적화 · Financial 연관성 분석 · ROI Explainability 지원 · ROI 계산식 직접 변경/승인 불가.
- 판정 **PARTIAL**(헌법 정합). KPI 이상 탐지=`AnomalyDetection`·ROI Explainability=데이터 헌법 V4(근거/신뢰도·근거없는 결론 금지)·ROI 최적화=`Mmm`(frontier). ★ROI 계산식 직접 변경/승인 불가=헌법 V3(수집≠사용)+`CHANGE_GATE`. KPI/Baseline 추천/Financial 연관성=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE(중복 AI 엔진 금지·V3 난립금지).

## §16 성능 요구사항
KPI 조회 ≤200ms · ROI 정의 ≤300ms · Formula 검증 ≤500ms · Dashboard ≤2초 · Availability ≥99.99%. — 벤치 대상 미존재·현행 `Rollup` 사전집계로 조회 최적화 seed.

## §17 Completion Criteria
Enterprise ROI Platform·ROI/KPI/Financial Metric Registry·ROI Governance·Runtime·Security·API/Event·AI Foundation·ROI 표준.
- **현재 미충족**(형식 ROI/KPI/Financial Metric Registry·Formula Version/Baseline Manager·Event 표준 ABSENT·코드 0). ★단 ROI/KPI 값 SSOT·거버넌스(무후퇴/CHANGE_GATE)는 실 강함.

## 종합 판정
전 메커니즘 **PARTIAL-strong/ABSENT-formal** — ROI/KPI 값(Rollup/Pnl/Attribution/Mmm/CRM)·Governance(무후퇴/CHANGE_GATE)·Financial(Pnl VAT/역분개)·Audit(SecurityAudit)·Explainability(헌법 V4)·AI(이상/최적화)는 재사용(★중복 KPI/ROI 계산 절대 금지), **형식 metadata-driven ROI/KPI/Financial Metric Registry·Formula Version/Baseline Manager·ROI Dashboard Foundation·Event 표준은 순신설(값 재계산 없이)**. Data Platform(Part 001~012)/Part 003/헌법 재정의 금지. 코드 변경 0.
