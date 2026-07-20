# DSAR — Authorization AI Governance: 역할 추천 (APPROVAL_AI_ROLE_RECOMMENDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_ROLE_RECOMMENDATION`(SPEC §2)은 Role Optimization Engine(SPEC §6)이 생성하는 **역할** 최적화 추천이다. 분석 대상: **Unused Roles·Duplicate Roles·Overlapping Roles·Excessive Hierarchies·Composite Role Candidates·Least Privilege Opportunities**(SPEC §6). 각 추천은 XAI(§17)·Confidence(§18)를 수반하고, Role 삭제는 Autonomous 자동수행 불가(§20)·Human Approval 필수(§19).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 분석 | 판정 | 근거(파일:라인) |
|---|---|---|
| Unused Roles | **PARTIAL(proto)** | `AccessReview.php:87-122` classify(DORMANT 90d/STALE_UNUSED·결정론적 임계·AI 아님)·`:158`·`:162-163` 심각도 정렬(GT① §2.A) |
| Duplicate/Overlapping Roles | **ABSENT** | `role.mining` authz 매치 0(GT② §1). 중복 role AI 추천 없음(GT② §2) |
| Least Privilege Opportunities | **ABSENT** | `least.privilege` authz 매치 0(GT② §1). AI 최소권한 추천 없음(GT② §2) |
| Excessive Hierarchies/Composite | **ABSENT** | AI 위계/복합역할 추천 전무(GT② §2) |
| XAI/Confidence(역할) | **ABSENT** | 인가 추천 confidence/근거 없음(GT② §2·§B ★혼동주의) |
| Human Approval 게이트 | **PARTIAL(substrate·AI 미배선)** | `AccessReview.php:177-242`(justification 필수)·`:225` SecurityAudit 이중기록(GT① §2.B) |

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 필드 | recommendation_type(unused/duplicate/overlap/hierarchy/composite/least_priv)·target_role·confidence_score(0~100)·evidence_ref·expected_benefit·expected_risk·tenant_id |
| baseline | `AccessReview.php:87-122` classify를 Role Recommendation baseline으로 승격·AI 확장(unused role·least-privilege)(ADR D-2) |
| XAI 필수 | confidence/근거/feature 제공(§17·ADR D-2). 근거없는 결론 금지(ADR D-4) |
| Human Approval | Role 삭제 자동수행 불가(§20). `AccessReview.php:177-242` decision(사유 필수) 게이트 재활용(ADR D-3) |
| AI Evidence | SecurityAudit(`AccessReview.php:225`) 확장(§23·ADR D-5) |
| 테넌트 격리 | Tenant Isolation(§33). authz `acl_permission` 소스 |
| Immutable | 추천 무결성·Model Version 불변강제 신설(§33·ADR D-5) |

## 4. KEEP_SEPARATE (마케팅 AI recommendation 흡수금지)

authz **역할** 추천은 마케팅/커머스 AI와 분리된다(ADR D-7).

| 마케팅 AI | 근거 | 오흡수 위험 |
|---|---|---|
| `CustomerAI.php:9-23`(RFM/churn/LTV 협업필터 상품추천) | GT② §B-2 | 고객·상품 추천≠역할 추천 |
| `AutoRecommend.php:35-920`(자가학습 prior `:185`·채널 벤치마크 `:114`) | GT② §B-1 | 채널/예산 추천≠역할 최적화 |
| `GraphScore.php:12-40`(influencer→sku 어트리뷰션) | GT② §B-2 | 그래프 스코어≠역할 오버랩 |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(Duplicate/Overlapping/Least-Privilege AI 추천·XAI·Confidence 순신규) / PARTIAL-substrate(`AccessReview.php:87-122` classify=Unused Role proto baseline·ADR D-2 / `AccessReview.php:177-242` decision=Human Approval 게이트·ADR D-3 / SecurityAudit=AI Evidence·ADR D-5).** classify는 결정론적 임계(AI 아님)라 baseline 승격 후 AI 모델로 확장한다. 마케팅 AI(CustomerAI/AutoRecommend/GraphScore)는 흡수 금지. 선행: Part 1~3-14 인증(BLOCKED_PREREQUISITE). 코드 0 · NOT_CERTIFIED.
