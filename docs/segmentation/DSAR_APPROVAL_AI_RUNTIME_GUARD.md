# DSAR — Authorization AI Governance: AI Runtime Guard (Part 3-15 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §28은 AI 거버넌스 파이프라인 런타임에서 다음 6종을 **차단(block)** 하는 Runtime Guard를 규정한다.

| # | 차단 대상 | 의미 |
|---|---|---|
| 1 | Unauthorized Model Usage | 미승인/미배포 모델 버전으로 추천·예측 실행 |
| 2 | Unapproved Recommendation Deployment | Human Approval Gateway(§19) 미통과 추천 자동 집행 |
| 3 | Dataset Poisoning | 학습 데이터셋 무결성 훼손·오염 주입 |
| 4 | Feature Tampering | Feature Store(§4) 값 변조 |
| 5 | Model Rollback Attack | 승인된 버전을 과거 취약 버전으로 되돌리기 |
| 6 | AI Bypass | 게이트를 우회한 authz 변경 직접 집행 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Guard | 판정 | 근거(파일:라인) |
|---|---|---|
| AI Runtime Guard(6종 전체) | **ABSENT** | GT② §2 "AI Runtime Guard(model poisoning/AI bypass) … 전무"(grep 0) |
| Unapproved Deployment 차단 재활용 substrate | **PARTIAL(maker-checker·AI 미배선)** | `Mapping.php:268-271`(self-approval 차단·정족수)·`Alerting.php:642-650`(quorum≥2)·`AccessReview.php:177-242`(justification 필수 결정) — GT① §B |
| Model Rollback 방어(불변 버전 저장) | **ABSENT** | `Db.php:448-456` risk_model_registry·`ModelMonitor.php:35` ml_models.version 전부 **가변 갱신**·불변강제(해시체인/WORM) 없음 — GT② §2 |
| Poisoning/Tampering 무결성 기록 substrate | **PARTIAL(AI 미배선)** | SecurityAudit(`AccessReview.php:225`) 이중기록·`UserAuth.php:4203` logAudit SSOT — AI Evidence 근접(GT① §B·§E) |

★AI 추천/모델을 대상으로 배선된 Runtime Guard는 **0건**. 재활용 substrate(maker-checker·SecurityAudit)는 authz 수동 게이트일 뿐 AI 파이프라인에 미배선.

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **G-1 Model Authorization**: 추천·예측 실행 전 model_version이 `is_deployed=1`(패턴 `Db.php:463`) 상태이며 Governance 승인 이력이 있는지 검증. 미승인 시 차단(→ Error §30 AI_MODEL_NOT_FOUND / AI_GOVERNANCE_BLOCKED).
- **G-2 Deployment Gate**: 추천 집행은 반드시 Human Approval Gateway(§19) 통과. Critical Policy/SoD Rule/Production Permission/Global Scope는 자동집행 금지(SPEC §19·§20·ADR D-3).
- **G-3 Dataset/Feature Integrity**: 학습 데이터셋·Feature 값 해시 검증(불변 저장·ADR D-5). 불일치 시 차단(→ AI_DATASET_INVALID).
- **G-4 Rollback 방어**: 승인 버전보다 낮은 버전 활성화 차단. 불변 Model Version 저장(SPEC §33 Immutable Model Version) 신설 필요.
- **G-5 Bypass 방어**: AI 경로 밖 authz 변경도 SecurityAudit(`AccessReview.php:225` 패턴) 기록·감지.
- 모든 차단은 SecurityAudit append-only 기록(ADR D-5).

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- `ModelMonitor.php:30-291` 드리프트/재학습 상태머신은 **도메인중립이나 seed·소비=마케팅**(`:293-313` seedDemoModels=이탈/전환/추천/LTV/ROAS) — authz Guard로 재배선하되 마케팅 모델 대상 흡수 금지.
- `Risk.php:12-214`(공급망 fraud 로지스틱 `:27-66`)·`Decisioning.php:12-477`는 마케팅 AI — Runtime Guard 보호 대상 아님(GT② §4·ADR D-7).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**AI Runtime Guard = ABSENT(순신규).** 재활용(흡수 아님·재배선): maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`)를 Deployment Gate에, SecurityAudit(`AccessReview.php:225`)을 무결성·Bypass 감지에 배선. 불변 Model Version 저장은 SecurityAudit 해시체인 확장으로 신설(현행 `Db.php:448-456`·`ModelMonitor.php:35` 가변→불변강제). 코드 변경 0 · NOT_CERTIFIED · Part 1~3-14 인증 선행(BLOCKED_PREREQUISITE).
