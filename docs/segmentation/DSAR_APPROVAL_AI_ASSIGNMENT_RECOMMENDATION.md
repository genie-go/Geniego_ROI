# DSAR — Authorization AI Governance: 배정 추천 (APPROVAL_AI_ASSIGNMENT_RECOMMENDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_ASSIGNMENT_RECOMMENDATION`(SPEC §2)은 Assignment Optimization(SPEC §8)이 생성하는 **배정(role/permission assignment)** 최적화 추천이다. 추천 유형: **Assignment Removal·Assignment Consolidation·Temporary Assignment Conversion·JIT Conversion·Delegation Optimization**(SPEC §8). Standing privilege→Temporary/JIT 전환은 JIT Optimization(§16)과 연동되며, 자동 배정변경은 Human Approval(§19)·Governance Rule 통과가 필수다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 추천 | 판정 | 근거(파일:라인) |
|---|---|---|
| Assignment Removal | **PARTIAL(proto)** | `AccessReview.php:87-122` classify(EXPIRED/DORMANT·검토후보 surfacing·결정론적·AI 아님)·`:158` needs_review(GT① §2.A) |
| Assignment Consolidation | **ABSENT** | AI 배정 통합 추천 전무(GT② §2) |
| Temporary/JIT Conversion | **ABSENT** | `least.privilege`·SoD/JIT authz 매치 0(GT② §1·§2). standing privilege 제거 추천 전무 |
| Delegation Optimization | **PARTIAL(수동)** | `TeamPermissions.php:356-373` scopeWithinCap·`:381-387` assignableMap·`:810-831` reclamp(위임상한·정적·추천 아님)(GT① §2.A) |
| XAI/Confidence(배정) | **ABSENT** | 인가 추천 confidence/근거 없음(GT② §2) |
| Human Approval 게이트 | **PARTIAL(substrate·AI 미배선)** | `AccessReview.php:177-242`(justification 필수)·`:225` SecurityAudit·`Mapping.php:268-271`·`Alerting.php:642-650`(GT① §2.B) |

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 필드 | recommendation_type(remove/consolidate/temp_convert/jit_convert/delegation_opt)·target_assignment·confidence_score(0~100)·evidence_ref·expected_benefit·expected_risk·tenant_id |
| baseline | `AccessReview.php:87-122` classify(EXPIRED/DORMANT)를 Assignment Removal baseline으로 승격·AI 확장(ADR D-2) |
| Delegation | 현행 `TeamPermissions.php:356-373` 위임상한(수동)은 참조 baseline·AI Delegation Optimization은 순신규 |
| XAI 필수 | Recommendation·Confidence·Evidence·Feature·Benefit·Risk(§17). 근거없는 결론 금지(ADR D-4) |
| Human Approval | 배정 변경 자동수행 불가(§20). `AccessReview.php:177-242` decision(사유 필수)·maker-checker(`Alerting.php:642-650`) 게이트 배선(ADR D-3) |
| AI Evidence | SecurityAudit(`AccessReview.php:225`) 확장(§23·ADR D-5) |
| 테넌트 격리 | Tenant Isolation(§33). authz `acl_permission`/`auth_audit_log` 소스 |

## 4. KEEP_SEPARATE (마케팅 AI recommendation 흡수금지)

authz **배정** 추천은 마케팅/커머스 추천과 분리된다(ADR D-7).

| 마케팅 AI | 근거 | 오흡수 위험 |
|---|---|---|
| `AutoRecommend.php:35-920`(자가학습 prior `:185`·UCB bandit `:81`) | GT② §B-1 | 채널/예산 배정≠권한 배정 추천 |
| `CustomerAI.php:9-23`(구매확률·협업필터) | GT② §B-2 | 고객 배정≠role/permission 배정 |
| `DemandForecast.php:9-40`(Holt-Winters SKU 수요) | GT② §B-2 | 수요 예측≠배정 최적화 |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(Consolidation/Temporary·JIT Conversion/Delegation AI 추천·XAI·Confidence 순신규) / PARTIAL-substrate(`AccessReview.php:87-122` classify=Assignment Removal proto baseline·ADR D-2 / `TeamPermissions.php:356-373` 위임상한=수동 Delegation 참조 / `AccessReview.php:177-242`+maker-checker=Human Approval 게이트·ADR D-3 / SecurityAudit=AI Evidence·ADR D-5).** JIT/SoD Conversion 추천은 grep 0으로 순신규(Part 3-9 JIT 통제 소비·재구현 금지·ADR D-6). 마케팅 AI(AutoRecommend/CustomerAI/DemandForecast)는 흡수 금지. 선행: Part 1~3-14 인증(BLOCKED_PREREQUISITE). 코드 0 · NOT_CERTIFIED.
