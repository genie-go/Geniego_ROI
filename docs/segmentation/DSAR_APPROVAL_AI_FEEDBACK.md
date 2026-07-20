# DSAR — Authorization AI Governance: AI 피드백 학습 (APPROVAL_AI_FEEDBACK)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_AI_FEEDBACK은 인가 AI 추천에 대한 human 결정(승인/기각/override)을 학습 신호로 회수하는 엔티티다. SPEC §25 AI Analytics는 피드백 지표를 규정한다.

| SPEC §25 지표 | 피드백 의미 |
|---|---|
| Recommendation Acceptance Rate | 추천 수용률(피드백 학습 입력) |
| Recommendation Accuracy | 추천 정확도 |
| Human Override Rate | ★human이 AI 추천을 뒤집은 비율(핵심 피드백 신호) |
| False Positive / False Negative | 오탐/미탐(라벨 정정) |

SPEC §31 Warning Contract `Human Override Rate High`. §21 Continuous Learning은 10단계(Data Collection→…→Retraining)로 피드백을 재학습에 반영한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| **authz human override→학습 피드백 루프** | **ABSENT** | GT② §2 "Autonomous Optimization/Continuous Learning(authz) = ABSENT · 자율 최적화·authz 학습/재학습/거버넌스 승인 파이프라인 전무" · ADR §2.2 grep 0 |
| human 결정 게이트(override 발생지·피드백 원천) | PARTIAL·substrate·AI 미배선 | GT① §B `AccessReview.php:177-242`(decision·justification 필수)·`:225`(SecurityAudit 이중기록) — 사유 필수 human 결정 |
| maker-checker(승인/기각 신호) | PARTIAL·AI 미배선 | GT① §B `Mapping.php:268-271`(self-approval 차단·정족수)·`Alerting.php:642-650`(quorum≥2) — GT② §2 "AI 추천 승인 게이트에 미배선" |
| 재학습 파이프라인(피드백→재학습 substrate) | PRESENT·마케팅 | GT① §C `ModelMonitor.php:161-218`(retrain)·`:30-72`(ml_retrain_log 스키마) — 대상=마케팅 모델 |
| 피드백 감사기록(Evidence) | PARTIAL·근접 | GT① §C·B `UserAuth.php:4203`(logAudit SSOT)·`AccessReview.php:225`(SecurityAudit) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**: `feedback_id`, `tenant_id`, `recommendation_ref`, `model_version`(§2), `human_decision`(accept/reject/override — §19 결정 결과), `justification`(필수·`AccessReview.php:177-242` 패턴), `override_flag`, `evidence_ref`(§23), `collected_at`.
- **상태**: human 결정(§19 Human Approval Gateway) → 피드백 회수 → §25 Human Override Rate/Acceptance 집계 → §21 Continuous Learning 재학습 입력. maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`)·AccessReview decision(`:177-242`)을 AI 추천 승인 게이트에 배선(ADR D-3)해 override 신호를 피드백 원천으로 회수.
- **제약**: SPEC §33 Tenant Isolation·§23 Evidence Integrity. justification 필수(근거없는 결론 금지·ADR D-4·V4 헌법 XAI). Human Override Rate High(§31) 발화 시 추천 품질 재검. 재학습은 §21 7단계 Governance Approval 통과 후만(자동 배포 금지·§28).

## 4. KEEP_SEPARATE (마케팅 drift/simulate 흡수금지)

- 마케팅 자가학습 흡수 절대 금지: GT② §B-1 `AutoRecommend.php:35-920`(자가학습 prior `:185`·경험적 베이즈 `:79`)는 광고 예산 피드백이지 authz human override 피드백 아님(ADR D-7).
- 재학습 substrate `ModelMonitor.php:161-218`은 재배선 참고이나 seed·소비는 마케팅(GT② §B-5 `:293-313`). authz 피드백 학습으로 개명·흡수 금지.
- ★XAI 혼동 함정: `Decisioning.php:433-477` explainability·`Risk.php:61-66` top_drivers=마케팅 설명(GT② §B-3·ADR D-7). authz 피드백 근거 아님.
- 데이터소스 분리: authz 피드백 = auth_audit_log/access_review_item, 마케팅 = `performance_metrics`/`crm_*`(GT② §5).

## 5. 판정

- **NOT_CERTIFIED · ABSENT-순신규**: authz human override→학습 피드백 루프 = grep 0(ADR §2.2·GT② §2). 코드 변경 0.
- **재활용(흡수 아님·재배선)**: maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`)·AccessReview decision(`:177-242`·justification 필수)을 AI 추천 승인 게이트에 배선해 override 피드백 회수(ADR D-3)·`ModelMonitor.php:161-218` 재학습 substrate 재배선(D-1)·SecurityAudit(`:225`)/logAudit(`:4203`)를 피드백 Evidence로(D-5). Continuous Learning은 순신규(D-4).
- **선행 의존**: BLOCKED_PREREQUISITE — Part 1~3-14 인증 후 실 구현(ADR §4). Human Approval Gateway(§19) 배선이 피드백 원천 전제(ADR D-3).
