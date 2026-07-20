# DSAR — Authorization AI Governance: AI 모델 (APPROVAL_AI_MODEL)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_MODEL`은 Authorization AI Governance의 **학습 모델 단위**다. SPEC §2(Canonical Entity `APPROVAL_AI_MODEL`)에 정의되며, Role/Permission/Scope/Assignment 최적화 추천·Policy Drift/Risk/Threat/Compliance 예측(SPEC §5~§16)을 수행하는 authz 도메인 모델의 등록·상태·로드 대상이다. Model Load ≤ 1초(§35), Model 인덱스(§34), `AI_MODEL_NOT_FOUND`·`AI_MODEL_DEPRECATED`(§30) 계약을 가진다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 층위 | 판정 | 근거(file:line) |
|---|---|---|
| authz 전용 AI Model | **ABSENT** | authz role/permission 최적화·예측 모델 전무(GT① §1·GT② §2). 인가는 전부 결정론적 rule-based |
| 도메인중립 모델 레지스트리 스키마(재사용) | **PRESENT·마케팅·authz 미배선** | `ModelMonitor.php:30-72`(ml_models/ml_model_metrics/ml_retrain_log 스키마)·`:35`(ml_models.version 단일 컬럼) — 도메인 컬럼 없음, seed=마케팅(`:293-313`) |
| 배포모델 조회·메트릭 패턴(재사용) | **PRESENT·마케팅 fraud** | `Db.php:448-456`(risk_model_registry: model_name/model_version/is_deployed/metrics_json/training_range_json)·`Risk.php:81`(is_deployed=1 배포모델 조회)·`:118` |
| 정직 폴백(미연결 시 날조 금지) | **PRESENT·패턴 참고** | `ModelMonitor.php:183-194`(mt_rand 날조 금지·queue만)·`:255-266` |

★모델 레지스트리 **패턴**(스키마·is_deployed·metrics_json)은 존재하나 전부 마케팅/fraud 도메인이며 authz 데이터에 미배선(GT① §C·§D).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(설계)**: model_id·model_name·목적(Recommendation/Prediction 유형 §5~§16)·is_deployed·metrics_json·training_range·Tenant(§33 Tenant Isolation).
- **상태**: Continuous Learning(§21) Training→Evaluation→Governance Approval→Deployment 상태머신. `AI_MODEL_DEPRECATED` 은퇴 상태(§30)·Warning "Model Drift Increasing"(§31).
- **제약**: Model 인덱스(§34)·Model Load ≤ 1초(§35)·100 Concurrent Model Versions(§36). 실 모델 배포는 Runtime Guard(§28 Unauthorized Model Usage 차단)·Static Lint(§29 Outdated Model Version) 통과.
- **재배선 대상**: `ModelMonitor.php:30-291` 상태머신을 authz 데이터(acl_permission/auth_audit_log/access_review_item)로 재배선(ADR D-1).

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

`ModelMonitor.php:293-313` seedDemoModels(이탈예측/구매전환/상품추천/LTV/광고ROAS)·`Risk.php:12-214`(공급망 fraud 로지스틱 `:27-66`·risk_model_registry `:81`)는 **마케팅/커머스 fraud 모델**로 authz AI Model이 아니다(GT② §4 B-3·B-5). 마케팅 AI 8종(GT② §4)·`Risk.php:61-66` top_drivers·`Decisioning.php:433-477` explainability 흡수·개명 금지(ADR D-7). 데이터소스 `performance_metrics`/`crm_*` ≠ authz `acl_permission`/`auth_audit_log`.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(authz 전용) + 재사용 패턴(도메인중립 레지스트리 스키마)**. authz AI Model 순신규(GT② 표: authz grep 0).
- **재활용(재배선)**: `ModelMonitor.php:30-291` 모델 모니터링/드리프트 상태머신·`Db.php:448-456` risk_model_registry 버전패턴을 authz 모델 거버넌스로 재배선(ADR D-1). 흡수 아님.
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE)·Immutable 강제는 별도 엔티티(APPROVAL_AI_MODEL_VERSION).
- **NOT_CERTIFIED**: 코드 변경 0.
