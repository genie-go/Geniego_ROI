# DSAR — Authorization AI Governance: 데이터베이스 제약 (Part 3-15 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §33은 authz AI 거버넌스 저장소에 5개 불변/무결성 제약을 요구한다.

| 제약 | SPEC 근거 | 의미 |
|---|---|---|
| Immutable Model Version | §33 · §2(APPROVAL_AI_MODEL_VERSION) | 배포 모델 버전은 append-only·사후 변경 불가 |
| Immutable Training Dataset | §33 · §23(Evidence=Training Dataset) | 학습 데이터셋 스냅샷 불변 봉인 |
| Recommendation Integrity | §33 · §22(Snapshot) | 추천 레코드 위변조 방지 |
| Evidence Integrity | §33 · §23 | Feature Set/Prediction Reason/Governance Approval 무결성 |
| Tenant Isolation | §33 | 테넌트 간 모델·추천·증거 격리 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 제약 | 판정 | 근거(파일:라인) |
|---|---|---|
| Immutable Model Version | **PARTIAL(가변)** | `risk_model_registry`(model_name/model_version/is_deployed/metrics_json/training_range_json) `Db.php:448-456`·`ml_models.version` 단일컬럼 `ModelMonitor.php:35` — 둘 다 **가변 갱신·불변강제(해시체인/WORM) 없음**(GT② §2 Immutable Model Version 행) |
| Immutable Training Dataset | **ABSENT** | 전용 dataset 버전/봉인 없음. `training_range_json` `Db.php:448-456`은 범위 메타만·불변 아님 |
| Recommendation Integrity | **ABSENT** | authz AI 추천 저장·무결성 전무(GT① §3 순신규) |
| Evidence Integrity | **PARTIAL(근접)** | SecurityAudit 이중기록 `AccessReview.php:225`·logAudit SSOT `UserAuth.php:4203` — append-only 증거 substrate이나 AI Evidence 미배선(GT② §3-7) |
| Tenant Isolation | **PARTIAL(정적 RBAC)** | acl_permission 정적 RBAC/ABAC `TeamPermissions.php:152-159`·model 테넌트 격리 전용 제약 ABSENT |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Immutable Model Version(§33)**: risk_model_registry(`Db.php:448-456`) 가변 패턴을 **불변강제로 신설**(model_version append-only·is_deployed 전이 감사·이전 버전 물리보존). ADR D-5 = SecurityAudit 해시체인(`AccessReview.php:225` 참조패턴) 확장.
- **Immutable Training Dataset(§33)**: dataset 스냅샷 해시 봉인·Evidence(§23) Training Dataset 링크. risk_prediction.model_version 스탬핑(`Db.php:463`) 패턴을 dataset_version으로 확장.
- **Recommendation/Evidence Integrity**: Snapshot(Model/Feature Version·Confidence·Timestamp §22)·Evidence(Feature Set·Prediction Reason·Evaluation·Governance Approval §23)를 SecurityAudit 해시체인으로 무결 봉인.
- **Tenant Isolation(§33)**: 모든 model/recommendation/evidence 행에 tenant 스코프·acl 정적 격리(`TeamPermissions.php:152-159`) 상속.
- **Constraint 검증**: Runtime Guard(§28 Model Rollback Attack·Dataset Poisoning 차단)와 정합.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: `risk_model_registry`(`Db.php:448-456`)·`Risk.php:149-187`은 **마케팅 공급망 fraud 도메인**(GT② §4 B-3). 버전 레지스트리 **패턴만** 참조·fraud 모델 흡수/개명 금지. `ml_models`(`ModelMonitor.php:35`) seed=마케팅(`:293-313`).
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). 불변강제 신설은 SecurityAudit 확장 전제(ADR D-5).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** authz AI model/dataset/recommendation/evidence 불변·무결성 제약 = 현행 가변 레지스트리(`Db.php:448-456`·`ModelMonitor.php:35`)를 **불변강제로 신설**하고 SecurityAudit(`AccessReview.php:225`) 해시체인을 확장하는 순신규. DB Constraint(Immutable Model Version/Training Dataset·Recommendation/Evidence Integrity·Tenant Isolation) 실 적용·검증은 RP-track 실구현 세션 조건이며 선행 Part 1~3-14 인증에 의존한다. 마케팅 fraud 레지스트리(Risk/risk_model_registry) 흡수 금지.
