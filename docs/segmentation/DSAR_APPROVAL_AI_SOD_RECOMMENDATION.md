# DSAR — Authorization AI Governance: SoD 추천 엔진 (SoD Recommendation)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SoD Recommendation Engine(SPEC §1-15·§15 SoD Recommendation)은 인가 이력을 학습해 **직무분리(SoD) 규칙을 최적화 추천**하는 엔티티다. SPEC §15 추천 대상 4종:

| # | 추천 대상 | 의미 |
|---|---|---|
| 1 | New Conflict Rule | 신규 SoD 충돌 규칙 추천 |
| 2 | Existing Rule 강화 | 기존 규칙 강화 추천 |
| 3 | Exception 제거 | SoD 예외 제거 추천 |
| 4 | Override 감소 | Override 감소 추천 |

모든 추천은 XAI(§17)·Confidence(§18)를 제공하고, SoD Rule 변경은 **Human Approval 필수**(§19)·Autonomous 자동수행 금지(§20).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 추천 대상 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| New Conflict Rule 추천 | **ABSENT(grep 0)** | 신규 conflict rule 추천 전무(GT② §2). SoD 추천 ML 없음 |
| Existing Rule 강화 추천 | **ABSENT** | grep 0. authz 계층 전부 결정론적(GT① §1) |
| Exception 제거 추천 | **ABSENT / PARTIAL(수동)** | AI 추천 없음. `TeamPermissions.php:356-373`·`:381-387` scopeWithinCap/assignableMap=**수동 위임상한**(추천 아님) |
| Override 감소 추천 | **ABSENT** | grep 0 |
| 결정론 baseline (proto) | **PARTIAL** | `AccessReview.php:87-122` classify(결정론 임계 proto·NEEDS_REVIEW 심각도 정렬 `:158`·`:162-163`)=AI Recommendation baseline(ADR §D-2) |
| Human Approval 게이트 | **PARTIAL(substrate·AI 미배선)** | `Mapping.php:238-294`·self-approval 차단(`:268-271`)·`Alerting.php:642-650` quorum≥2·`AccessReview.php:177-242`(justification 필수) — maker-checker 완비이나 **AI 추천 승인에 미배선** |

★핵심: SoD 추천은 **grep 0(순신규)**. classify(§A)와 maker-checker(§B)는 재활용 substrate이나 SoD AI 추천에 배선된 것 없음.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§15·§17): `recommendation_id`·`tenant_id`·`sod_action`(new_conflict_rule|strengthen_rule|remove_exception|reduce_override)·`target_rule_ref`·`confidence`(0~100 §18)·`explanation_ref`(§17)·`expected_benefit`·`expected_risk`·`approval_state`·`model_version`(불변 §33).
- **학습 데이터원**(§3·ADR §D-6): SoD Violations·Assignment History·Audit Events. SoD 통제 자체는 Part 3-10 소유·AI는 **추천만**·집행 재구현 금지(ADR §D-6).
- **XAI 필수**(§17): recommendation/confidence/supporting evidence/training features/expected benefit/expected risk. 근거없는 결론 금지(ADR §D-4).
- **Human Approval**(§19·ADR §D-3): SoD Rule은 자동 적용 금지 대상(§19)·Human Approval 필수. maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`)를 AI 추천 승인 게이트에 배선.
- **제약**(§33): Tenant Isolation·Immutable Model Version·Recommendation Integrity.

## 4. KEEP_SEPARATE (마케팅 예측·fraud XAI 흡수금지)

★SoD 추천은 **인가 직무분리** 추천이며, 마케팅 추천엔진과 완전 분리된다(ADR §D-7).

- `AutoRecommend.php:35-920`(예산배분·UCB bandit `:81`·자가학습 prior `:185`)·`Mmm.php:1-23`(믹스모델)는 **광고 최적화 추천**이지 SoD 추천이 아니다(GT② §B-1). 흡수·개명 금지.
- ★오흡수 함정: `Decisioning.php:433-477` "explainability"·`Risk.php:61-66` top_drivers는 **마케팅 설명**이지 SoD XAI가 아니다(GT② §B-3·ADR §D-7).
- 데이터소스 분리: `performance_metrics`/`crm_*`(마케팅) ≠ SoD Violations·`acl_permission`(`TeamPermissions.php:152-159`)(authz).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: SoD Recommendation = **ABSENT(순신규 4종 전부·grep 0)**. 수동 위임상한(`TeamPermissions.php:356-373`)은 추천 아님.
- **재활용(흡수 아님·재배선/승격)**: `AccessReview.php:87-122` classify를 AI 추천 결정론 baseline로 승격(ADR §D-2)·maker-checker(§B)를 AI 승인 게이트에 배선(ADR §D-3)·ClaudeAI LLM=XAI infra(`ClaudeAI.php:70`·`:542-666`).
- **KEEP_SEPARATE**: AutoRecommend/Mmm·`Decisioning.php:433-477`·`Risk.php:61-66` 흡수 금지.
- **선행의존**: Part 1~3-14(SoD=3-10) 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0.
