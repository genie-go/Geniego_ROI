# DSAR — Authorization AI Governance: 불변 모델 버전 (APPROVAL_AI_MODEL_VERSION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_MODEL_VERSION`은 AI Model의 **불변(immutable) 버전 스냅샷**이다. SPEC §2(Canonical Entity `APPROVAL_AI_MODEL_VERSION`)·§33(Database Constraint "Immutable Model Version")에 정의된다. 각 배포 버전은 학습 데이터셋·Feature 버전·메트릭·거버넌스 승인 기록을 봉인해 변조 불가로 보존하며, 모델 버전 비교(SPEC §32 "Compare Model Versions" API)·AI Snapshot(§22 Model Version 저장)의 참조 단위다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 층위 | 판정 | 근거(file:line) |
|---|---|---|
| Immutable Model Version(불변강제·해시체인/WORM) | **ABSENT** | GT② 표: "risk_model_registry(`Db.php:448-456`)·ml_models(`ModelMonitor.php:35`) 가변 갱신·불변강제(해시체인/WORM) 없음" |
| 모델 버전 레지스트리 패턴(재사용·가변) | **PRESENT·마케팅·불변강제 없음** | `Db.php:448-456`(model_version)·`:463`(risk_prediction.model_version)·`Risk.php:149-152`(예측시 model_version 스탬핑)·`:175`·`:149-187` |
| 버전 이력(단일 컬럼·이력 아님) | **PARTIAL** | `ModelMonitor.php:35`(ml_models.version 단일 컬럼·모델당 1행 갱신·이력 아님) |
| 불변 Evidence 참조패턴(재사용) | **PRESENT·authz proto** | `AccessReview.php:225`(SecurityAudit 이중기록·해시체인 참조패턴) |

★버전 스탬핑 패턴(model_version 컬럼)은 존재하나 **가변 갱신**이며 불변강제(해시체인/WORM)는 전무하다. 실 이력 append-only는 신설 대상.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(설계)**: model_id·version·training_dataset_ref(Immutable §33)·feature_version·metrics·governance_approval_ref·created_at·Tenant(§33).
- **불변 제약(핵심)**: Immutable Model Version·Immutable Training Dataset(§33) — 생성 후 변경 불가. Runtime Guard "Model Rollback Attack" 차단(§28)·Static Lint "Outdated Model Version" 탐지(§29).
- **상태**: AI Snapshot(§22)에 Model Version·Feature Version·Timestamp 저장·AI Evidence(§23)에 Training Dataset·Governance Approval 봉인.
- **재배선/신설**: 현행 `risk_model_registry`·`ml_models` 가변 갱신(`Db.php:448-456`·`ModelMonitor.php:35`)을 **불변강제로 승격 신설** — SecurityAudit 해시체인(`AccessReview.php:225` 참조패턴) 확장(ADR D-5).

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

`Db.php:448-456` risk_model_registry·`Risk.php:149-187` 버전 스탬핑은 **마케팅 공급망 fraud 도메인**(GT① §D·GT② §4 B-3)으로 authz Model Version이 아니다. 패턴만 참조하고 fraud risk_model_registry 자체는 KEEP_SEPARATE. `Risk.php:61-66` top_drivers 흡수 금지(ADR D-7).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(불변강제) + PARTIAL(가변 버전 패턴)**. Immutable Model Version 순신규(GT②/ADR 2.2 grep 0).
- **재활용(재배선·확장)**: `Db.php:448-456`·`Risk.php:149-187` 버전 레지스트리 패턴을 authz로 재배선하되 **불변강제(해시체인/WORM)는 SecurityAudit(`AccessReview.php:225`) 확장으로 신설**(ADR D-5). 흡수 아님.
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE).
- **NOT_CERTIFIED**: 코드 변경 0.
