# DSAR — Authorization AI Governance: AI 신뢰도 엔진 (APPROVAL_AI_CONFIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_CONFIDENCE`(SPEC §2·§18)는 인가 AI 추천/예측마다 산출되는 **신뢰도 등급·점수** 엔티티다. SPEC §18은 5등급(**Very High / High / Medium / Low / Human Review Required**)과 **Confidence Score 범위 0~100**을 규정한다. Confidence는 XAI(§17)의 필수 구성요소이며, 낮은 신뢰도는 Error Contract `AI_CONFIDENCE_TOO_LOW`(§30)로 차단되고 Human Approval Gateway(§19)의 라우팅 신호가 된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz AI Confidence Score/등급 | **ABSENT** | GT② §2 "XAI / AI Confidence(authz) = ABSENT". 인가 추천 confidence/근거/training feature 제공 없음 |
| 결정론 baseline(proto·confidence 아님) | **PARTIAL** | `AccessReview.php:87-122` classify(EXPIRED/DORMANT/STALE_UNUSED/EXPIRING_SOON)·`:158`·`:162-163` 심각도 정렬 — 신뢰도 점수 아님, 임계 라벨 |
| 마케팅 confidence류(★흡수 금지) | **KEEP_SEPARATE** | `Risk.php:61-66` top_drivers(fraud 피처기여)·`Decisioning.php:433-477` explainability — 마케팅 설명이지 authz confidence 아님(GT② §B-3) |

★인가축 신뢰도 점수는 grep 0(GT② §2). 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `confidence_score`(0~100·SPEC §18)·`confidence_grade`(Very High/High/Medium/Low/Human Review Required)·`recommendation_id`(FK→추천)·`model_version`(§2·§22 Snapshot)·`tenant_id`.
- **상태 파생**: score→grade 매핑(임계는 실 구현 세션 확정)·`Human Review Required`는 Human Approval Gateway(§19) 강제 라우팅.
- **제약**: Snapshot(§22 Confidence 저장)·Evidence(§23)·Analytics(§25 Recommendation Accuracy/Human Override Rate)로 관측. Tenant Isolation(§33) 절대. Static Lint `Missing Confidence`(§29) 대상.

## 4. KEEP_SEPARATE (마케팅 explainability/top_drivers 흡수금지)

- `Risk.php:61-66` top_drivers·`Risk.php:27-66` 공급망 fraud 로지스틱·`Decisioning.php:433-477` "explainability"는 **마케팅/fraud 도메인 신뢰·기여도**로 `performance_metrics`/`crm_*` 소스다. authz Confidence(acl_permission/auth_audit_log 소스)로 **흡수·개명 금지**(GT② §4·ADR D-7).
- `ModelMonitor.php:293-313` seedDemoModels(이탈/전환/추천/LTV/ROAS)의 메트릭도 마케팅.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(authz Confidence 순신규).** 재활용(흡수 아님·재배선): `AccessReview.php:87-122` classify를 결정론 baseline로 삼되 confidence는 신설(ADR D-2). 선행 의존: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED. 마케팅 top_drivers/explainability 흡수 금지·근거없는 결론 금지.
