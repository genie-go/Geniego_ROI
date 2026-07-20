# DSAR — Authorization AI Governance: 테스트 계약 (Part 3-15 §36)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §36은 6개 테스트 축을 요구한다.

| 축 | 대상 | SPEC 근거 |
|---|---|---|
| Unit | Recommendation/Prediction/XAI/Confidence/Simulation Engine | §36 Unit |
| Integration | RBAC/PDP/PEP/Zero Trust/Observability/Compliance | §36 Integration |
| Performance | 10M Predictions·1M Recommendations/day·100 Concurrent Model Ver | §36 Performance |
| Security | Model/Dataset Poisoning·Feature Manipulation·Prompt Injection·Unauthorized Model Deployment | §36 Security |
| Compliance | ISO 42001·NIST AI RMF·ISO 27001·SOC 2·OWASP LLM Top 10 | §36 Compliance |
| Regression | Authorization/Policy/Workflow/Audit/AI Governance | §36 Regression |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 축 | 판정 | 근거(파일:라인) |
|---|---|---|
| Unit | **ABSENT** | authz AI Recommendation/Prediction/XAI/Confidence/Simulation 엔진 전무(GT② §2). 리포 무 PHPUnit(CLAUDE.md) |
| Integration(Compliance) | **PARTIAL(substrate)** | Compliance posture=control introspection+SOC2/ISO 정적매핑 `Compliance.php:53-130`·readiness% `:120`(ML 아님) |
| Integration(Human Approval) | **PARTIAL(maker-checker)** | self-approval 차단 `Mapping.php:268-271`·정족수 quorum≥2 `Alerting.php:642-650`·decision justification 필수 `AccessReview.php:177-242` — AI 게이트 미배선 |
| Performance | **ABSENT** | 10M/1M/day·100 concurrent 부하 대상 엔진 부재 |
| Security | **PARTIAL(모니터)** | drift/retrain 상태머신 `ModelMonitor.php:161-218`·`:244-291`(마케팅)·정직 폴백 `:183-194` — model/dataset poisoning 가드 ABSENT |
| Compliance(Evidence) | **PARTIAL(근접)** | SecurityAudit 이중기록 `AccessReview.php:225`·logAudit SSOT `UserAuth.php:4203` — AI Evidence 미배선 |
| Regression(Authorization) | **PARTIAL(정적)** | acl 정적 RBAC/ABAC `TeamPermissions.php:152-159`·재클램프 `:810-831`·위임상한 `:356-373`·`:381-387` |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Unit**: Recommendation(§5~9)·Prediction(§12~14)·XAI(§17)·Confidence(§18)·Simulation(§27) 엔진별 단위 테스트. classify 결정론 baseline(`AccessReview.php:87-122`) 회귀 고정.
- **Integration**: RBAC/PDP/PEP/Zero Trust/Observability/Compliance(§36) 연계 — Compliance posture(`Compliance.php:53-130`)·Human Approval(maker-checker `Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`) AI 게이트 배선(ADR D-3) 검증.
- **Performance**: §35 SLO(Recommendation≤500ms·Accuracy≥95%)를 10M predictions·1M recommendations/day·100 concurrent model version 부하에서 검증.
- **Security**: Runtime Guard(§28 Model Poisoning/Dataset Poisoning/Feature Tampering/Model Rollback/AI Bypass)·Prompt Injection·Unauthorized Model Deployment 방어. ModelMonitor 정직 폴백(`ModelMonitor.php:183-194`) 검증.
- **Compliance**: ISO 42001·NIST AI RMF·ISO 27001·SOC 2·OWASP LLM Top 10 — AI Evidence(SecurityAudit `AccessReview.php:225` 확장)·XAI 근거 표시(ADR D-4 근거없는 결론 금지).
- **Regression**: Authorization/Policy/Workflow/Audit/AI Governance 100% 무후퇴(ADR 무후퇴·Extend-only).

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: `ModelMonitor.php:161-218`·`:244-291` 마케팅 모델 테스트·`Decisioning.php:433-477` explainability·`Risk.php:61-66` top_drivers는 **마케팅 설명이지 authz XAI 아님**(GT② §4 B-3·ADR D-7 오흡수 최다 함정). 마케팅 AI 테스트 흡수/개명 금지.
- **선행의존**: Unit/Integration/Performance/Security/Compliance/Regression 실행은 대상 엔진(순신규)·§33 store·§35 SLO 확정 후. Part 1~3-14 인증 선행.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** 리포에 PHPUnit 스위트 부재(CLAUDE.md)·authz AI 엔진 부재로 6축 테스트 대상이 없다. Unit/Integration/Performance/Security/Compliance/Regression 실 작성·통과는 **RP-track 실구현 세션 조건**이며, AI Governance Validation(ISO 42001/NIST AI RMF/OWASP LLM Top10)·Regression 100%는 완료 게이트(§37) 필수 조건이다. 재활용은 Compliance posture·maker-checker·SecurityAudit·classify baseline의 authz 검증 재배선에 한하며 마케팅 AI(explainability/top_drivers) 흡수 금지. 선행 Part 1~3-14 인증에 의존한다.
