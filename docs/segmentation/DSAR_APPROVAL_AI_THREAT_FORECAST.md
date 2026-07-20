# DSAR — Authorization AI Governance: 인가 위협 예측 (APPROVAL_AI_THREAT_FORECAST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_THREAT_FORECAST`(SPEC §2·§13 Threat Prediction)은 인가 런타임 행위를 학습해 **위협 신호를 사전 예측**하는 엔티티다. SPEC §13 예측 대상 4종:

| # | 예측 대상 | 의미 |
|---|---|---|
| 1 | Abnormal Behavior | 비정상 행위 패턴 예측 |
| 2 | Suspicious Session | 의심 세션 예측 |
| 3 | Credential Abuse | 자격증명 오남용 예측 |
| 4 | API Misuse | API 오용 예측 |

학습 데이터원(§3): Session History·Runtime Context·Audit Events·Threat Intelligence. XAI(§17)·Confidence(§18)·Runtime Guard(§28)와 정합.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 예측 대상 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| Abnormal Behavior 예측 | **ABSENT** | authz 행위 예측 ML 없음(GT② §2). 인가 계층은 전부 결정론적 rule-based(GT① §1) |
| Suspicious Session 예측 | **ABSENT** | 세션 이력 학습·의심세션 예측 전무. `auth_audit_log`(`UserAuth.php:4165`·`:4203`)은 사후 감사기록·예측 아님 |
| Credential Abuse 예측 | **ABSENT** | grep 0. logAudit SSOT(`UserAuth.php:4150`·`:4203`)은 이벤트 기록·예측 신호 아님 |
| API Misuse 예측 | **ABSENT** | authz API 오용 예측 없음 |
| 드리프트/이상 상태머신 패턴 | **PRESENT(마케팅·미배선)** | `ModelMonitor.php:30-291`·drift report(`:244-291`)·`driftCheck` — 도메인중립 상태머신이나 seed·소비=마케팅(§B-5) |

★핵심: authz 위협 예측은 **전부 ABSENT**. `auth_audit_log`는 위협 예측의 잠재 학습원이나 현재 예측 배선 0. 순신규(그린필드).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§13·§17·§22): `forecast_id`·`tenant_id`·`threat_type`(abnormal_behavior|suspicious_session|credential_abuse|api_misuse)·`subject_ref`(identity/session)·`forecast_score`·`confidence`(0~100 §18)·`explanation_ref`(§17)·`model_version`(불변 §33)·`created_at`.
- **학습 데이터원**(§3·ADR §D-6): Session History·Runtime Context·Audit Events — Observability(Part 3-14) 이벤트가 학습원. 실존 재배선 대상=`auth_audit_log`(`UserAuth.php:4203`).
- **XAI 필수**(§17): 근거·training feature·historical similarity 제공. 근거없는 결론 금지(ADR §D-4).
- **집행 분리**(ADR §D-6): AI는 위협 **예측·surfacing만**·차단 집행은 기존 통제(Zero Trust 3-13). Runtime Guard(§28)는 별개 계약.
- **제약**(§33): Tenant Isolation·Immutable Model Version. 타 테넌트 세션 이력 학습 금지.

## 4. KEEP_SEPARATE (마케팅 예측·fraud XAI 흡수금지)

★**혼동 함정**: `AnomalyDetection.php:1-45`는 **광고 SPC(μ±kσ) 이상탐지**이지 authz 위협 예측이 아니다(GT② §B-3). `Risk.php:12-214`(공급망 fraud 로지스틱 `:27-66`)·top_drivers(`:61-66`)도 fraud 피처기여이지 authz 위협 신호가 아니다(ADR §D-7). 흡수·개명 금지.

- `CustomerAI.php:9-23`(churn/구매확률)·`DemandForecast.php:9-40`(SKU 수요) — 커머스 예측(§B-2). authz 위협 아님.
- 데이터소스 분리: `performance_metrics`/`channel_orders`(마케팅) ≠ `auth_audit_log`(authz). authz 위협예측 ≠ 마케팅 이상탐지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Threat Forecast = **ABSENT(순신규 4종 전부)**. authz 계층 전부 결정론적·AI 예측 0.
- **재활용(흡수 아님·재배선)**: ModelMonitor 드리프트 상태머신(`ModelMonitor.php:30-291`·`:244-291`)·정직 폴백(`:183-194`)을 authz 위협모델로 재배선. ClaudeAI LLM(`ClaudeAI.php:70`·`:542-666`)=XAI 설명 infra.
- **KEEP_SEPARATE**: `AnomalyDetection.php:1-45`·`Risk.php:12-214`·top_drivers(`:61-66`) 흡수 금지.
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE·Observability 학습원). 코드 변경 0.
