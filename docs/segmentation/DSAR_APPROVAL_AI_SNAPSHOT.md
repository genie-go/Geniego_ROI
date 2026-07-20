# DSAR — Authorization AI Governance: AI 스냅샷 (APPROVAL_AI_SNAPSHOT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_SNAPSHOT`(SPEC §22)은 AI 추천이 산출된 시점의 **불변 재현 단위**로 다음 5요소를 저장한다.

| 필드 | SPEC 근거 | 의미 |
|---|---|---|
| Model Version | §22·§2(`APPROVAL_AI_MODEL_VERSION`) | 추천을 산출한 authz AI 모델의 확정 버전 |
| Feature Version | §22·§4(Feature Store) | 추천 산출에 투입된 feature set의 버전 |
| Recommendation | §22·§5~§16 | 산출된 policy/role/permission/scope/assignment 추천 본문 |
| Confidence | §22·§18(0~100·5등급) | AI Confidence Engine 등급·점수 |
| Timestamp | §22 | 스냅샷 확정 시각 |

목적: 추천의 사후 재현·감사·모델 비교(§32 Compare Model Versions)를 위한 시점 고정. Immutable Model Version(§33)·Recommendation Integrity(§33)·Tenant Isolation(§33)이 제약이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Snapshot 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz 전용 AI Snapshot 저장소 | **ABSENT** | GT② §2 "AI Snapshot/Evidence/Digest/Analytics/Drift/Simulation(authz) = ABSENT / PARTIAL". authz 전용 전무 |
| Model Version 레지스트리(패턴·마케팅) | **PARTIAL(패턴·불변강제 없음)** | `backend/src/Db.php:448-456`·`:463`(`risk_model_registry` model_name/model_version/is_deployed/metrics_json/training_range_json)·`backend/src/Handlers/Risk.php:149-152`·`:175`(예측시 model_version 스탬핑) |
| 모델당 버전 컬럼(이력 아님) | **PARTIAL** | `backend/src/Handlers/ModelMonitor.php:35`(ml_models.version 단일 컬럼·모델당 1행 갱신·이력 아님) |
| Snapshot 무결성(해시체인 substrate) | **PARTIAL(근접·재활용 후보)** | `backend/src/Handlers/AccessReview.php:225`(SecurityAudit 이중기록) |
| Immutable Model Version 강제(해시체인/WORM) | **ABSENT** | GT② §2 "Immutable Model Version 저장 = ABSENT". `risk_model_registry`·`ml_models` 가변 갱신·불변강제 없음(Db.php:448-456·ModelMonitor.php:35) |
| Feature Version / Confidence(authz) | **ABSENT** | GT② §2 XAI/AI Confidence(authz)=ABSENT·전용 feature store 없음 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **필드**: Model Version + Feature Version + Recommendation + Confidence(0~100·§18) + Timestamp(§22).
- **불변성**: 확정 스냅샷은 append-only·수정 불가(§33 Immutable Model Version·Recommendation Integrity). 현행 `risk_model_registry`(Db.php:448-456)·`ml_models`(ModelMonitor.php:35) 가변 갱신을 **불변강제(해시체인/WORM)로 신설**해야 계약 충족(ADR §D-5).
- **Digest 무결성**: 스냅샷은 `APPROVAL_AI_DIGEST`(§24)의 입력이며 SecurityAudit 해시체인(`AccessReview.php:225` 참조패턴) 확장으로 위변조 탐지(ADR §D-5).
- **테넌트 격리**: Tenant Isolation(§33) 절대. 스냅샷은 산출 테넌트 스코프에 고정.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- `risk_model_registry`(Db.php:448-456)·`Risk.php:149-152`·`:175`는 **공급망 fraud 마케팅 도메인**의 모델 버전 스탬핑이다(GT① §D·GT② §B-3). 버전 레지스트리 **패턴만** 참고하고 fraud 스냅샷을 authz Snapshot으로 **흡수·개명 금지**.
- `ModelMonitor.php:35`(ml_models.version)의 seed·소비는 마케팅(이탈/전환/추천/LTV/ROAS·`ModelMonitor.php:293-313`)이다(GT② §B-5). 버전 컬럼 패턴만 재활용.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**APPROVAL_AI_SNAPSHOT = ABSENT-greenfield(authz 전용 Snapshot 저장소·Feature Version·Confidence·불변강제 순신규).** 재활용(흡수 아님·재배선): `risk_model_registry` 버전 레지스트리 패턴(Db.php:448-456·Risk.php:149-152·:175)·`ml_models.version` 컬럼(ModelMonitor.php:35)·SecurityAudit 해시체인(AccessReview.php:225)을 **불변강제 authz Model Version Snapshot**으로 확장(ADR §D-5). 현행은 전부 가변 갱신이라 불변강제 신설이 계약 조건. 마케팅 fraud/ML seed KEEP_SEPARATE. 선행: Part 1~3-14 인증·Feature Store(§4)·Model Version(§2) 신설 후 실 구현(BLOCKED_PREREQUISITE).
