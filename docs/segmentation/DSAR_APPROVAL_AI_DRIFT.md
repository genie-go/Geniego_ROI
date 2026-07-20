# DSAR — Authorization AI Governance: AI 드리프트 탐지 (APPROVAL_AI_DRIFT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_AI_DRIFT는 인가(authz) AI 거버넌스 모델의 예측 신뢰성 저하를 지속 탐지하는 엔티티다. SPEC §26은 5종 드리프트를 규정한다.

| SPEC §26 드리프트 | 의미(authz 맥락) |
|---|---|
| Feature Drift | 입력 피처 분포 변화(§4 Identity/Role/Permission/Session/Risk/Behavioral/Temporal Feature) |
| Concept Drift | 입력→라벨 관계 변화(최소권한 판정 기준 변동) |
| Dataset Drift | 학습 데이터셋(§3 Authorization Events/Policy Decisions/Assignment History) 분포 변화 |
| Prediction Drift | 예측 출력 분포 변화(risk/threat/compliance forecast) |
| Recommendation Drift | 추천 품질/수용률 저하(§25 Recommendation Acceptance/Accuracy) |

SPEC §31 Warning Contract는 `Model Drift Increasing`·`Feature Drift Detected`·`Recommendation Quality Declining`·`Dataset Aging`를, §25 AI Analytics는 `Model Drift` 지표를 요구한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| 드리프트 상태머신(drift_score/drift_status/retrain_threshold/auto_retrain) | **PRESENT·authz 미배선** | GT① §C `ModelMonitor.php:244-291`(driftCheck)·`:221-241`(drift report)·`:30-72`(스키마)·`:142-158`(modelMetrics) — ★도메인중립이나 대상=마케팅 모델 |
| 재학습 파이프라인 | PRESENT·마케팅 | GT① §C `ModelMonitor.php:161-218`(retrain) — GT② §2 "ModelMonitor retrain은 마케팅 모델" |
| 정직 폴백(미연결 시 날조 금지) | PRESENT·참고 | GT① §C `ModelMonitor.php:183-194`·`:255-266` — mt_rand 날조 금지·queue만 |
| 데이터 품질/aging 게이트 | PRESENT·마케팅 | GT① §C `DataPlatform.php:231-346`(dataQuality/dataLineage·ML feature store 아님) |
| 모델 버전(단일 컬럼·이력 아님) | PARTIAL | GT① §C·D `ModelMonitor.php:35`(ml_models.version) |
| **authz 전용 드리프트 탐지** | **ABSENT** | GT② §2 "SecurityAudit Evidence 근접·ModelMonitor drift(`:244-291`)는 마케팅. authz 전용 전무" · ADR §2.2 grep 0(authz) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `drift_id`, `tenant_id`, `model_version`(§2 immutable), `drift_type`(feature/concept/dataset/prediction/recommendation·§26), `drift_score`(§25 Model Drift), `drift_status`, `detected_at`, `evidence_ref`(§23).
- **상태**: `ModelMonitor.php:244-291` 상태머신을 authz 데이터(acl_permission/auth_audit_log/access_review_item — GT① §3·ADR D-1)로 재배선한 상태 전이(정상→경고→재학습 후보). ADR D-1.
- **제약**: SPEC §33 Tenant Isolation(테넌트별 드리프트 격리)·Immutable Model Version. §31 Warning 발화 시 §19 Human Approval Gateway 경유(자동 재배포 금지·SPEC §28 Unapproved Recommendation Deployment 차단). 미연결 데이터=정직 폴백(`ModelMonitor.php:183-194`), drift score 날조 금지.

## 4. KEEP_SEPARATE (마케팅 drift/simulate 흡수금지)

- `ModelMonitor.php:244-291` 상태머신은 **재사용 참고 substrate이나 seed·소비는 마케팅**: GT② §B-5 `ModelMonitor.php:293-313`(seedDemoModels=이탈/구매전환/상품추천/LTV/광고ROAS). authz 드리프트로 개명·흡수 금지.
- 마케팅 이상탐지 `AnomalyDetection.php:1-45`(광고 SPC μ±kσ·GT② §B-3)는 드리프트 아님·별개 유지.
- authz 드리프트 데이터소스(auth_audit_log/acl_permission)와 마케팅(`performance_metrics`/`crm_*`)은 완전 분리(GT② §5).

## 5. 판정

- **NOT_CERTIFIED · ABSENT-순신규**: authz 전용 AI 드리프트 탐지 = grep 0(ADR §2.2·GT② §2). 코드 변경 0.
- **재활용(흡수 아님·재배선)**: `ModelMonitor.php:30-291` 드리프트/재학습 상태머신·정직 폴백을 authz 모델 대상으로 재배선(ADR D-1). immutable model version은 SecurityAudit 확장 신설(ADR D-5).
- **선행 의존**: BLOCKED_PREREQUISITE — Part 1~3-14 인증 후 실 구현(ADR §4). Observability(3-14) 이벤트가 드리프트 학습·모니터 데이터원(ADR §1·D-6).
