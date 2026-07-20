# DSAR — Authorization AI Governance: 인가 준수 예측 (APPROVAL_AI_COMPLIANCE_FORECAST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_COMPLIANCE_FORECAST`(SPEC §2·§14 Compliance Prediction)은 인가 준수 상태를 학습해 **규제 준수 리스크를 사전 예측**하는 엔티티다. SPEC §14 예측 대상 4종:

| # | 예측 대상 | 의미 |
|---|---|---|
| 1 | Certification Delay | 인증(재인증) 지연 예측 |
| 2 | Audit Failure | 감사 실패 예측 |
| 3 | Evidence Gap | 증거 공백 예측 |
| 4 | Regulatory Violation | 규제 위반 예측 |

학습 데이터원(§3): Compliance Reports·Audit Events. XAI(§17)·AI Evidence(§23)와 정합. ISO 42001/NIST AI RMF 참조(ADR §1).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 예측 대상 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| Certification Delay 예측 | **ABSENT** | 재인증 지연 예측 ML 없음. authz AI 예측 grep 0(GT② §2) |
| Audit Failure 예측 | **ABSENT** | 감사 실패 예측 전무 |
| Evidence Gap 예측 | **ABSENT / PARTIAL(substrate)** | 예측 없음. `AccessReview.php:177-242`·SecurityAudit 이중기록(`:225`)=사후 증거 기록(AI Evidence §23 근접)·예측 아님 |
| Regulatory Violation 예측 | **ABSENT** | 규제 위반 예측 없음 |
| 준수 자세(posture) 산출 | **PARTIAL(정적·예측 아님)** | `Compliance.php:53-130` posture=control introspection+정적 SOC2/ISO 매핑+**산술 readiness%**(`:120`)·**ML 아님**(GT① §E) |

★핵심: `Compliance.php:53-130` posture는 **산술 readiness%**(현재 상태 계산)이지 미래 예측이 아니다. authz Compliance Forecast는 순신규(그린필드).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§14·§17·§23): `forecast_id`·`tenant_id`·`compliance_type`(certification_delay|audit_failure|evidence_gap|regulatory_violation)·`framework_ref`(SOC2/ISO 42001/ISO 27001)·`forecast_score`·`confidence`(0~100 §18)·`evidence_ref`(§23)·`explanation_ref`(§17)·`model_version`(불변 §33)·`created_at`.
- **학습 데이터원**(§3·ADR §D-6): Compliance Reports·Audit Events. 실존 재배선 대상=`Compliance.php:53-130` posture 산출을 baseline feature로·`AccessReview` decision(`:177-242`)·SecurityAudit(`:225`)·logAudit(`UserAuth.php:4203`).
- **AI Evidence**(§23·ADR §D-5): Feature Set/Training Dataset/Prediction Reason/Evaluation Result/Governance Approval을 SecurityAudit 해시체인(`AccessReview.php:225` 참조패턴) 확장으로 불변 저장.
- **XAI 필수**(§17): 근거·training feature. 근거없는 결론 금지(ADR §D-4).
- **제약**(§33): Tenant Isolation·Immutable Model/Dataset.

## 4. KEEP_SEPARATE (마케팅 예측·fraud XAI 흡수금지)

★authz Compliance Forecast는 **인가 규제 준수** 예측이며, 저장소의 마케팅 AI 예측(`Risk.php:12-214` 공급망 fraud·`CustomerAI.php:9-23` churn/LTV·`DemandForecast.php:9-40` 수요)과 데이터소스·목적이 완전히 분리된다(GT② §B·ADR §D-7).

- ★오흡수 함정: `Risk.php:61-66` top_drivers(fraud 피처기여)·`Decisioning.php:433-477` "explainability"(광고추천 설명)는 **마케팅 설명**이지 authz 준수 예측/XAI가 아니다(GT② §B-3·ADR §D-7). 흡수·개명 금지.
- 데이터소스 분리: `performance_metrics`/`crm_*`(마케팅) ≠ `Compliance.php` posture·`auth_audit_log`(authz).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Compliance Forecast = **ABSENT(순신규 4종 전부)**. `Compliance.php` posture=산술 readiness%(예측 아님).
- **재활용(흡수 아님·재배선)**: `Compliance.php:53-130` posture(baseline feature)·SecurityAudit(`AccessReview.php:225`)·logAudit(`UserAuth.php:4203`)를 AI Evidence(§23)로 확장·불변강제 신설. ClaudeAI LLM=XAI infra(`ClaudeAI.php:70`·`:542-666`).
- **KEEP_SEPARATE**: `Risk.php`·`Decisioning.php:433-477` explainability·CustomerAI/DemandForecast 흡수 금지.
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0.
