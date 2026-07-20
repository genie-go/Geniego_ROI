# DSAR — Authorization AI Governance: 인간 승인 게이트웨이 (APPROVAL_AI_HUMAN_APPROVAL_GATEWAY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

SPEC §19 Human Approval Gateway는 AI 추천의 **자동 적용 금지 대상**을 규정한다: **Critical Policy · Regulatory Policy · SoD Rule · Production Permission · Global Scope**. 이들은 Human Approval 필수이며, Autonomous Optimization(§20)의 자동수행 불가 대상(Policy/Permission/Role/Compliance Rule 변경)과 연동한다. 이 게이트는 인가 AI 거버넌스에서 유일하게 **PARTIAL substrate가 실존**하는 엔티티다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §19 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| maker-checker(서로 다른 2인·self 차단·정족수) | **PARTIAL(substrate·AI 미배선)** | `Mapping.php:238-294`·`:268-271` self-approval 차단·`:287` dedup(실동작) |
| maker-checker(신원확인·quorum≥2) | **PARTIAL** | `Alerting.php:601-608` 신원확인·`:634-641` dedup·`:642-650` quorum≥2 완비 |
| 사유 필수 human 결정 게이트 | **PARTIAL** | `AccessReview.php:177-242` decision(justification 필수)·`:225` SecurityAudit 이중기록 |
| AI 추천/자동변경 승인 배선 | **ABSENT** | GT② §2 "AI 추천 승인 게이트에 미배선". 대상=mapping_change_request/action_request/수동 접근검토뿐(GT① §B) |

★substrate는 완비이나 **AI 추천/자동변경 승인 게이트에 배선된 것 없음**(GT① §B 각주·ADR D-3).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **게이트 판정**: 추천 대상이 Critical Policy/Regulatory Policy/SoD Rule/Production Permission/Global Scope(§19)면 `human_approval_required=true`·Autonomous 자동수행 차단(§20).
- **승인 계약**: 서로 다른 2인·self 차단·정족수(`Mapping.php:268-271`·`Alerting.php:642-650` 재활용)·justification 필수(`AccessReview.php:177-242`)·SecurityAudit 이중기록(`:225`).
- **제약**: 미배선 상태를 AI 추천 승인 게이트로 **재배선**(ADR D-3·Extend). Tenant Isolation(§33). Static Lint `Missing Human Approval`(§29) 강제. Error `AI_GOVERNANCE_BLOCKED`(§30).

## 4. KEEP_SEPARATE (마케팅 explainability/top_drivers 흡수금지)

maker-checker substrate 자체는 authz/거버넌스 근접물(오흡수 위험 낮음)이나, 이 게이트가 승인하는 **대상 추천의 신뢰도·설명**은 절대 마케팅 `Decisioning.php:433-477` explainability·`Risk.php:61-66` top_drivers에서 끌어오지 않는다(GT② §B-3). Alerting/Mapping의 마케팅·알림 도메인 판정 로직도 authz 게이트로 혼용 금지 — maker-checker **패턴만** 재활용.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = PARTIAL-substrate(maker-checker 완비·AI 미배선) / ABSENT(AI 승인 배선).** 재활용(재배선·흡수 아님): `Mapping.php:238-294`·`Alerting.php:601-650`·`AccessReview.php:177-242`를 AI 추천/자동변경 승인 게이트에 배선(ADR D-3). Critical/SoD/Production/Global Scope는 Human Approval 필수·Autonomous 금지(§19·§20). 선행 의존: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
