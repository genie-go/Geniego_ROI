# DSAR — Authorization AI Governance: 인가 리스크 예측 (APPROVAL_AI_RISK_FORECAST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_RISK_FORECAST`(SPEC §2 Canonical Entity·§12 Risk Prediction)은 인가 환경을 학습해 **인가 리스크를 사전 예측**하는 엔티티다. SPEC §12 예측 대상 4종:

| # | 예측 대상 | 의미 |
|---|---|---|
| 1 | Privilege Escalation | 권한 상승 경로 발생 예측 |
| 2 | Insider Threat | 내부자 위협 발생 예측 |
| 3 | Excessive Permission Growth | 과도한 권한 증가 추세 예측 |
| 4 | Compliance Failure | 규제 준수 실패 예측 |

XAI(§17)·Confidence(§18)·성능 Risk Prediction ≤ 300ms(§35)·Immutable Model Version(§33) 계약을 따른다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 예측 대상 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| Privilege Escalation 예측 | **ABSENT** | authz 리스크 **예측 ML 없음**. `auth_audit_log.risk`(`UserAuth.php:4165`)은 호출측 'high' **정적 라벨**(`:4174`·`:4190-4191`)·예측 아님. GT② §2 "privilege escalation/insider threat 예측 ML 없음" |
| Insider Threat 예측 | **ABSENT** | grep 0. logAudit SSOT(`UserAuth.php:4150`·`:4203`)은 사후 감사기록·예측 아님 |
| Excessive Permission Growth 예측 | **ABSENT / PARTIAL(proto)** | 예측 없음. `AccessReview.php:87-122` classify(STALE_UNUSED/DORMANT 결정론 임계)가 과잉권한 **사후 surfacing** proto일 뿐(§6·§7 baseline) |
| Compliance Failure 예측 | **ABSENT** | `Compliance.php:53-130` posture=산술 readiness%(`:120`)·정적 매핑·**예측 아님**(§14 참조) |
| 모델 버전 스탬핑 패턴 | **PRESENT(마케팅)** | `risk_model_registry`(`Db.php:448-456`·`:463`)·risk_prediction.model_version — ★마케팅 fraud 도메인(KEEP_SEPARATE) |

★핵심: `auth_audit_log.risk`(`UserAuth.php:4165`)은 **정적 리스크 라벨**이지 학습 기반 예측이 아니다. authz Risk Forecast는 순신규(그린필드).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§12·§17·§22): `forecast_id`·`tenant_id`·`risk_type`(privilege_escalation|insider_threat|permission_growth|compliance_failure)·`target_ref`(role/permission/identity)·`forecast_score`·`confidence`(0~100 §18)·`explanation_ref`(§17 XAI)·`model_version`(불변 §33)·`feature_version`·`created_at`.
- **학습 데이터원**(§3·ADR §D-6): Authorization Events·Assignment History·Permission Usage — Observability(Part 3-14) 이벤트. 실존 substrate 재배선 대상=`auth_audit_log`(`UserAuth.php:4203`)·`acl_permission`(`TeamPermissions.php:152-159`).
- **XAI 필수**(§17): recommendation/confidence/supporting evidence/training features/historical similarity/expected benefit/expected risk. 근거없는 결론 금지(ADR §D-4).
- **제약**(§33): Immutable Model Version·Tenant Isolation. 예측은 테넌트 격리·타 테넌트 auth_audit_log 학습 금지.

## 4. KEEP_SEPARATE (마케팅 예측·fraud XAI 흡수금지)

★**최대 오흡수 위험**: `Risk.php:12-214`는 **공급망 fraud 로지스틱 예측**(`:27-66`)이며, `top_drivers`(`Risk.php:61-66`)는 **fraud 피처기여**이지 authz 권한판정 설명(XAI)이 아니다(GT② §B-3·ADR §D-7). `risk_model_registry`(`Risk.php:81`)·risk_prediction(`:91`)은 마케팅 fraud 도메인. authz Risk Forecast로 **흡수·개명 금지**.

- `CustomerAI.php:9-23` churn/LTV 예측·`AnomalyDetection.php:1-45` 광고 SPC 이상 — 커머스/마케팅 예측(§B-2·§B-3). authz 리스크 아님.
- 데이터소스 분리: `performance_metrics`/`crm_*`(마케팅) ≠ `auth_audit_log`/`acl_permission`(authz).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: authz Risk Forecast = **ABSENT(순신규)**. `auth_audit_log.risk`=정적 라벨(예측 아님)·`Compliance.php` posture=산술(예측 아님).
- **재활용(흡수 아님·재배선)**: `risk_model_registry` 버전패턴(`Db.php:448-456`)·ModelMonitor 재학습 상태머신(GT① §C)을 authz로 재배선(불변강제 신설). ClaudeAI LLM(`ClaudeAI.php:70`·`:542-666`)으로 XAI 설명생성.
- **KEEP_SEPARATE**: `Risk.php:12-214`·top_drivers(`:61-66`)·CustomerAI·AnomalyDetection 흡수 금지.
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE·Observability 학습원). 코드 변경 0.
