# DSAR — Authorization AI Governance: 지속 학습 파이프라인 (APPROVAL_AI_CONTINUOUS_LEARNING)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §21 Continuous Learning Pipeline은 인가 AI 모델의 **10단계 학습 수명주기**를 규정한다: 1) Data Collection → 2) Data Validation → 3) Feature Extraction → 4) Model Training → 5) Evaluation → 6) Explainability Validation → 7) **Governance Approval** → 8) Deployment → 9) Monitoring → 10) Retraining. Part 3-14 Observability 이벤트가 학습 데이터원, Part 3-8~3-13 통제가 최적화 대상이다(ADR D-6).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §21 단계 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz 학습/재학습/거버넌스 승인 파이프라인 | **ABSENT** | GT② §2 "Continuous Learning(authz) = ABSENT. authz 학습/재학습/거버넌스 승인 파이프라인 전무" |
| Monitoring/Retraining 상태머신(도메인중립·재활용) | **PARTIAL(재활용)** | `ModelMonitor.php:30-291` 상태머신·`:161-218` retrain·`:244-291` driftCheck·`:183-194` 정직 폴백(GT① §C) |
| Data Validation/Feature 품질 게이트 | **PARTIAL(재활용)** | `DataPlatform.php:231-346` dataQuality/dataLineage(ML feature store 아님·GT① §C) |
| Governance Approval(7단계) 게이트 | **PARTIAL(재활용)** | maker-checker `Mapping.php:268-271`·`AccessReview.php:177-242`(§19) |
| Immutable Model/Dataset(8·10단계) | **ABSENT** | `Db.php:448-456` risk_model_registry·`ModelMonitor.php:35` ml_models 가변 갱신·불변강제 없음(GT② §2) |

★`ModelMonitor.php:161-218` retrain·`:293-313` seed는 **마케팅 모델 대상**(GT② §B-5). 상태머신만 도메인중립.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **10단계 상태**: `pipeline_stage`(Data Collection~Retraining)·`governance_approved`(7단계·§19 게이트)·`model_version`(§2·불변)·`dataset_id`(불변)·`tenant_id`.
- **학습원/대상**: 학습 데이터원=Observability(3-14) 이벤트·authz 데이터(acl_permission/auth_audit_log/access_review_item)로 `ModelMonitor.php:30-291` 상태머신 재배선(ADR D-1). 최적화 대상=RBAC/SoD/JIT/PDP/Zero Trust 통제(재구현 금지·ADR D-6).
- **제약**: Immutable Model Version·Training Dataset(§33)은 SecurityAudit 해시체인 확장(ADR D-5·현행 가변 레지스트리→불변강제 신설). 정직 폴백(`ModelMonitor.php:183-194` mt_rand 날조 금지). Tenant Isolation(§33). Warning `Model Drift Increasing`/`Dataset Aging`(§31).

## 4. KEEP_SEPARATE (마케팅 explainability/top_drivers 흡수금지)

`ModelMonitor.php:161-218` retrain·`:293-313` seedDemoModels(이탈/전환/추천/LTV/ROAS)·`AutoRecommend.php:79`·`:185` 자가학습 prior·`CustomerAI.php:9-23`·`DemandForecast.php:9-40`·`GraphScore.php:12-40`는 **마케팅/커머스 학습 파이프라인**이다(GT② §B). authz Continuous Learning으로 **흡수·개명 금지**. `Decisioning.php:433-477` explainability·`Risk.php:61-66` top_drivers는 6단계 Explainability Validation에서 참조 금지(마케팅 설명·ADR D-7).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(authz 학습 파이프라인 순신규) / PARTIAL-substrate(도메인중립 인프라 재활용).** 재활용(재배선·흡수 아님): `ModelMonitor.php:30-291` 드리프트/재학습 상태머신·`DataPlatform.php:231-346` quality·maker-checker(§19 Governance Approval)·SecurityAudit(불변 model/dataset)(ADR D-1·D-5). ABSENT: authz 학습원 배선·불변강제·거버넌스 승인 파이프라인. 선행 의존: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE)·Observability(3-14) 이벤트가 학습원. 코드 변경 0 · NOT_CERTIFIED. 마케팅 retrain/seed/자가학습 흡수 금지.
