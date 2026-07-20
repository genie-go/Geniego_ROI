# DSAR — Authorization AI Governance: AI 거버넌스 레지스트리·지식베이스 (APPROVAL_AI_GOVERNANCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_GOVERNANCE`는 Authorization AI Governance Platform의 **최상위 거버넌스 앵커**다. SPEC §1(구현 목표 1·2 "AI Governance Registry"·"Authorization Knowledge Base")·§2(Canonical Entity 목록 최상단 `APPROVAL_AI_GOVERNANCE`)에 정의된다. 역할은 단순 AI 추천 기능이 아니라 인가 환경을 지속 학습·분석해 정책을 최적화하는 **Autonomous Authorization Control System**의 통제 registry(SPEC §0)로서, 모든 AI Model/Feature Store/Dataset/Recommendation/Prediction의 등록·XAI(§17)·Confidence(§18)·Human Approval Gateway(§19)·Governance Rule(§20)·Continuous Learning(§21) 전 계층을 관장한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 항목 | 판정 | 근거(file:line) |
|---|---|---|
| AI Governance Registry / Knowledge Base | **ABSENT(grep 0)** | GT② §2: "authz AI 거버넌스 레지스트리·지식베이스 전무". `authz.*(ai\|ml\|model)`·`policy.recommend` authz 매치 0건(GT② §1) |
| Governance Rule 통과 후 자동변경(§20) | **PARTIAL(substrate·AI 미배선)** | maker-checker `Mapping.php:268-271`·`Alerting.php:642-650`·AccessReview decision `AccessReview.php:177-242`(justification 필수 `:225`) — Human Approval 완비이나 AI 게이트 미배선(GT① §B·GT② 표) |
| 지식원(학습 이벤트) substrate | **PARTIAL** | SecurityAudit/logAudit `UserAuth.php:4203`·`AccessReview.php:225`(AI Evidence 근접·authz 전용 아님) |

★AI Governance Registry·Authorization Knowledge Base 자체는 그린필드다. 인가 계층은 전부 결정론적 rule-based이며(GT① §1), 존재하는 AI/ML은 전부 마케팅 도메인(§4)이다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **레지스트리 스코프**: 등록 대상 = AI Model·Model Version·Feature Store·Dataset·Recommendation·Prediction·Confidence·Explanation·Simulation·Snapshot·Evidence·Digest·Analytics·Drift·Feedback(SPEC §2 Canonical Entity 전 목록의 상위 컨테이너).
- **상태**: Continuous Learning 10단계(SPEC §21 Data Collection→Validation→Feature Extraction→Training→Evaluation→Explainability Validation→**Governance Approval**→Deployment→Monitoring→Retraining) 중 Governance Approval 게이트가 본 엔티티에 귀속.
- **제약**: Tenant Isolation(SPEC §33)·자동변경은 Governance Rule 통과 필수(§0·§20 자동 수행 불가: Policy 변경·Permission 삭제·Role 삭제·Compliance Rule 변경).
- **Error/Warning**: `AI_GOVERNANCE_BLOCKED`(SPEC §30)·모델/추천/데이터셋 하위 계약 총괄.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

본 엔티티는 authz 거버넌스 registry이며, 저장소의 마케팅 AI 8종(GT② §4: `AutoRecommend.php:35-920`·`Mmm.php:1-23`·`CustomerAI.php:9-23`·`Decisioning.php:12-477`·`AnomalyDetection.php:1-45`·`Risk.php:12-214`·`DemandForecast.php:9-40`·`GraphScore.php:12-40`)은 `performance_metrics`/`crm_*` 소스 마케팅 AI로 **흡수·개명 금지**. ★XAI 혼동 함정: `Decisioning.php:433-477` "explainability"·`Risk.php:61-66` top_drivers는 마케팅 설명이지 authz Governance 지식이 아니다(ADR D-7).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT-greenfield**. AI Governance Registry·Knowledge Base 순신규(GT②/ADR 2.2 grep 0).
- **재활용(흡수 아님·재배선)**: maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`)를 Governance Approval 게이트(§20)로 배선(ADR D-3)·SecurityAudit(`AccessReview.php:225`)를 거버넌스 Evidence로 확장(ADR D-5).
- **선행의존**: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). Observability(3-14) 이벤트가 학습 데이터원(ADR D-6).
- **NOT_CERTIFIED**: 코드 변경 0.
