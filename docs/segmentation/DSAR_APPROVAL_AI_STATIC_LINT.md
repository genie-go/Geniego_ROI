# DSAR — Authorization AI Governance: AI Static Lint (Part 3-15 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §29는 authz AI 코드/설정 정적 분석에서 다음 6종을 **탐지(detect)** 하는 Static Lint를 규정한다.

| # | 탐지 대상 | 위반 의미 |
|---|---|---|
| 1 | Hardcoded AI Decision | 모델 대신 리터럴로 박제된 authz 판정 |
| 2 | Missing Explainability | XAI(§17) 산출물(근거/feature) 없는 추천 |
| 3 | Missing Confidence | Confidence Score(§18·0~100) 미부착 추천 |
| 4 | Missing Human Approval | Human Approval Gateway(§19) 미배선 자동변경 |
| 5 | Outdated Model Version | 폐기(deprecated) 모델 버전 참조 |
| 6 | Missing Evidence | AI Evidence(§23) 미기록 추천 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Lint rule | 판정 | 근거(파일:라인) |
|---|---|---|
| AI Static Lint(6종 전체) | **ABSENT(순신규)** | GT② §2 "Static Lint(missing XAI/confidence/human approval) … 전무" |
| Hardcoded AI Decision 탐지 | **ABSENT** | authz risk가 리터럴 라벨(`UserAuth.php:4165` 'high' 정적)로 존재하나 lint 대상화 없음 — GT① §E |
| Missing Explainability(XAI) 탐지 | **ABSENT** | authz XAI 자체 부재(GT② §2). ★혼동주의 §4 |
| Missing Confidence 탐지 | **ABSENT** | AI Confidence(§18) authz 미존재(GT② §2 "confidence/근거/training feature 없음") |
| Missing Human Approval 탐지 재활용 baseline | **PARTIAL** | maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`)=human 게이트 substrate·AI 미배선 — GT① §B |
| Outdated Model Version 탐지 | **ABSENT** | `Db.php:448-456`·`ModelMonitor.php:35` 버전 존재하나 deprecated lint 없음 |
| Missing Evidence 탐지 baseline | **PARTIAL** | SecurityAudit(`AccessReview.php:225`)·`UserAuth.php:4203` 기록 substrate·AI Evidence 미배선 — GT① §E |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **L-1**: authz 판정 경로에 리터럴 결과가 모델 산출을 대체하면 위반(Hardcoded AI Decision).
- **L-2**: 모든 추천 산출물은 XAI(§17: Recommendation/Confidence/Supporting Evidence/Training Features/Historical Similarity/Expected Benefit/Expected Risk) 필드를 강제. 결측 시 위반.
- **L-3**: Confidence Score(§18) 미부착 추천은 위반(Very High~Human Review Required 등급·0~100).
- **L-4**: Critical Policy/SoD Rule/Production Permission/Global Scope 변경에 Human Approval Gateway(§19) 미배선 시 위반(ADR D-3).
- **L-5**: deprecated model_version 참조 시 위반(→ Warning §31 / Error §30 AI_MODEL_DEPRECATED 연동).
- **L-6**: AI Evidence(§23: Feature Set/Training Dataset/Prediction Reason/Evaluation Result/Governance Approval) 미기록 추천은 위반.
- Static Lint는 CI 게이트로 실행(SPEC §37 Completion Gate·Regression 조건).

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- ★**최다 오흡수 함정**: `Decisioning.php:433-477` "explainability"·`Risk.php:61-66` top_drivers는 **마케팅 추천/fraud 피처기여 설명**이지 authz XAI 아님(ADR D-7·GT② §B-3). Missing Explainability lint은 이들을 authz XAI 충족으로 계산 금지.
- `AutoRecommend.php:35-920`·`Mmm.php:1-23`·`CustomerAI.php:9-23`의 추천/신뢰도는 마케팅 도메인 — authz Static Lint 대상 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**AI Static Lint = ABSENT(순신규).** 재활용 baseline: maker-checker(Human Approval 규칙 L-4)·SecurityAudit(Evidence 규칙 L-6). XAI/Confidence lint(L-2·L-3)은 authz XAI·Confidence 엔진 신설(ADR D-4) 후에만 유효 → 선행의존. ★마케팅 explainability/top_drivers를 XAI 충족으로 오계산 금지. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
