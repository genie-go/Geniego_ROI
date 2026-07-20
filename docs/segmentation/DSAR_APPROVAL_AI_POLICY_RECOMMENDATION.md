# DSAR — Authorization AI Governance: 정책 추천 (APPROVAL_AI_POLICY_RECOMMENDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_POLICY_RECOMMENDATION`(SPEC §2)은 Policy Recommendation Engine(SPEC §5)이 생성하는 인가 **정책** 최적화 추천이다. 추천 유형: **Policy Simplification·Policy Consolidation·Policy Split·Policy Retirement·Policy Coverage Expansion·Policy Conflict Resolution**(SPEC §5). 모든 추천은 XAI(§17: Recommendation·Confidence Score·Supporting Evidence·Training Features·Historical Similarity·Expected Benefit·Expected Risk)를 수반하며, Critical/Regulatory Policy 변경은 Human Approval 필수(§19)·Autonomous 자동 정책변경 금지(§20).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 추천 | 판정 | 근거(파일:라인) |
|---|---|---|
| Policy Simplification/Consolidation/Split/Retirement | **ABSENT** | authz `policy.recommend` grep 0 (GT② §1·§2). AI 정책 추천 엔진 전무 |
| Policy Conflict Resolution | **ABSENT** | AI 충돌해소 추천 전무 (GT② §2) |
| Coverage Expansion | **ABSENT** | 커버리지 갭 AI 추천 없음 (GT② §2) |
| 결정론 baseline(proto) | **PARTIAL** | `AccessReview.php:87-122` classify(EXPIRED/DORMANT/STALE_UNUSED·결정론적 임계·AI 아님)(GT① §2.A) |
| XAI/Confidence(정책) | **ABSENT** | 인가 추천 confidence/근거/training feature 없음 (GT② §2) |
| Human Approval 게이트 | **PARTIAL(substrate·AI 미배선)** | `Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`(GT① §2.B) |

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 필드 | recommendation_type(simplify/consolidate/split/retire/expand/conflict_resolve)·target_policy_id·confidence_score(0~100·§18)·evidence_ref·expected_benefit·expected_risk·tenant_id |
| Confidence 등급 | Very High/High/Medium/Low/Human Review Required(§18) |
| XAI 필수 | Recommendation·Confidence·Supporting Evidence·Training Features·Historical Similarity·Expected Benefit·Expected Risk 전 항목(§17). 근거없는 결론 금지(ADR D-4) |
| Human Approval | Critical Policy·Regulatory Policy는 자동적용 금지·Human Approval 필수(§19). maker-checker 재활용(ADR D-3) |
| Autonomous 제약 | Policy 변경 자동수행 불가(§20). 집행은 기존 통제(ADR D-6·추천만) |
| 테넌트 격리 | Tenant Isolation(§33). authz `acl_permission`/`auth_audit_log` 소스, 마케팅 소스 배제 |
| 학습원 | Observability(Part 3-14) 이벤트가 학습 데이터원(ADR D-6) |

## 4. KEEP_SEPARATE (마케팅 AI recommendation 흡수금지)

authz **정책** 추천은 마케팅 추천과 데이터소스·목적이 완전 분리된다(ADR D-7).

| 마케팅 AI | 근거 | 오흡수 위험 |
|---|---|---|
| `AutoRecommend.php:35-920`(예산배분·UCB bandit `:81`·경험적 베이즈 `:79`) | GT② §B-1 | 예산배분 추천≠정책 추천 |
| `Decisioning.php:433-477` "explainability" | GT② §B-3 | ★광고추천 설명≠authz XAI(오흡수 최다 함정·ADR D-7) |
| `Mmm.php:1-23`(믹스모델·한계ROAS) | GT② §B-1 | 광고 최적화≠정책 최적화 |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(AI 정책 추천 엔진·XAI·Confidence 순신규) / PARTIAL-substrate(`AccessReview.php:87-122` classify=결정론 baseline으로 승격·ADR D-2 / maker-checker=Human Approval 게이트 배선·ADR D-3).** 실 엔진은 결정론 baseline을 AI 모델로 확장하고 XAI/confidence를 신설한다. 마케팅 AI(AutoRecommend/Decisioning/Mmm)·`Decisioning.php:433-477` explainability는 흡수 금지. 선행: Part 1~3-14 인증 후 RP-track 구현(BLOCKED_PREREQUISITE). 코드 0 · NOT_CERTIFIED.
