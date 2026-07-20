# DSAR — Authorization AI Governance: 스코프 추천 (APPROVAL_AI_SCOPE_RECOMMENDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_SCOPE_RECOMMENDATION`(SPEC §2)은 Scope Optimization Engine(SPEC §9)이 생성하는 **스코프** 최적화 추천이다. 추천 유형: **Scope Reduction·Scope Merge·Scope Isolation·Scope Simplification·Cross-Tenant Boundary 강화**(SPEC §9). Global Scope 변경은 Human Approval 필수(§19)·Autonomous 자동수행 불가(§20). Cross-Tenant 경계 강화는 Tenant Isolation(§33)과 직결된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 추천 | 판정 | 근거(파일:라인) |
|---|---|---|
| Scope Reduction/Simplification | **ABSENT(AI)** | AI 스코프 축소 추천 전무(GT② §2). 현행 `TeamPermissions.php:356-373` scopeWithinCap=수동 위임상한(추천 아님)(GT① §2.A) |
| Scope Merge | **ABSENT** | AI 스코프 병합 추천 없음(GT② §2) |
| Scope Isolation | **PARTIAL(수동)** | `TeamPermissions.php:810-831` reclampTeamMembers(위임상한 재클램프·정적)·`:381-387` assignableMap(GT① §2.A) |
| Cross-Tenant Boundary 강화 | **ABSENT(AI)** | AI 경계강화 추천 없음(GT② §2). Tenant Isolation은 §33 제약으로만 존재 |
| XAI/Confidence(스코프) | **ABSENT** | 인가 추천 confidence/근거 없음(GT② §2) |
| Human Approval 게이트 | **PARTIAL(substrate·AI 미배선)** | `Mapping.php:268-271`·`Alerting.php:642-650`(GT① §2.B) |

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 필드 | recommendation_type(reduce/merge/isolate/simplify/cross_tenant_strengthen)·target_scope·confidence_score(0~100)·evidence_ref·expected_benefit·expected_risk·tenant_id |
| baseline | 현행 `TeamPermissions.php:356-373` 위임상한(수동)을 참조 baseline로만·AI 추천은 순신규(ADR D-2 확장) |
| XAI 필수 | Recommendation·Confidence·Evidence·Feature·Benefit·Risk(§17). 근거없는 결론 금지(ADR D-4) |
| Human Approval | Global Scope 변경 자동수행 불가(§19·§20). maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`) 배선(ADR D-3) |
| 테넌트 격리 | ★Cross-Tenant Boundary 강화 추천은 Tenant Isolation(§33) 정합. authz `acl_permission` 소스, 마케팅 소스 배제 |
| Autonomous 제약 | Global Scope 자동수행 불가(§20). 집행은 기존 통제(ADR D-6) |

## 4. KEEP_SEPARATE (마케팅 AI recommendation 흡수금지)

authz **스코프** 추천은 마케팅 예산/채널 추천과 분리된다(ADR D-7).

| 마케팅 AI | 근거 | 오흡수 위험 |
|---|---|---|
| `AutoRecommend.php:35-920`(예산배분·경험적 베이즈 `:79`·UCB bandit `:81`) | GT② §B-1 | 예산배분 최적화≠스코프 축소 |
| `Mmm.php:1-23`(믹스모델·adstock) | GT② §B-1 | 채널 믹스≠스코프 병합 |
| `Decisioning.php:12-477`(ingestAdInsights `:36`) | GT② §B-3 | 광고 의사결정≠스코프 격리 |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(Scope Reduction/Merge/Isolation/Cross-Tenant AI 추천·XAI·Confidence 순신규) / PARTIAL-substrate(`TeamPermissions.php:356-373`·`:810-831` 위임상한=수동 참조 baseline·AI 아님 / maker-checker=Human Approval 게이트·ADR D-3).** 현행 스코프 통제는 결정론적 수동 재클램프라 AI 추천은 순신규다. ★Cross-Tenant 강화는 Tenant Isolation(§33)과 정합. 마케팅 AI(AutoRecommend/Mmm/Decisioning)는 흡수 금지. 선행: Part 1~3-14 인증(BLOCKED_PREREQUISITE). 코드 0 · NOT_CERTIFIED.
