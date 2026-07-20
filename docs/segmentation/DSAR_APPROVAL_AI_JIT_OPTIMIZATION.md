# DSAR — Authorization AI Governance: JIT 최적화 + Policy Drift 예측 (JIT Optimization)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

JIT Optimization Engine(SPEC §1-16·§16)은 JIT(Just-In-Time) 권한 사용을 학습해 **standing privilege를 최소화 추천**한다. 본 DSAR은 SPEC §11 Policy Drift Prediction도 포함한다.

| 영역 | 추천/예측 대상 (SPEC) |
|---|---|
| §16 JIT Optimization | Standing Privilege 제거 · Temporary Assignment 전환 · Session Duration 최적화 · Approval Chain 단축 |
| §11 Policy Drift Prediction | Policy Obsolescence · Conflict Growth · Coverage Gap · Complexity Increase |

모든 추천은 XAI(§17)·Confidence(§18)를 제공하고, Production Permission/Global Scope 변경은 Human Approval 필수(§19).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 추천/예측 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| Standing Privilege 제거 추천 | **ABSENT / PARTIAL(proto)** | AI 추천 없음(GT② §2). `AccessReview.php:87-122` classify(DORMANT 90d/STALE_UNUSED 결정론 임계)=미사용 권한 사후 surfacing proto(§6·§7 baseline) |
| Temporary Assignment 전환 추천 | **ABSENT** | grep 0. `TeamPermissions.php:152-159` acl_permission=정적 RBAC/ABAC(추천 아님) |
| Session Duration 최적화 추천 | **ABSENT** | grep 0 |
| Approval Chain 단축 추천 | **ABSENT / PARTIAL(substrate)** | AI 추천 없음. `Mapping.php:238-294`·`Alerting.php:601-608`·quorum≥2(`:642-650`)=maker-checker 실동작(추천 아님·AI 미배선) |
| Policy Drift 예측(§11) | **ABSENT / PARTIAL(패턴)** | authz policy drift 예측 없음. `ModelMonitor.php:161-218`·`:244-291` drift 상태머신=**마케팅 모델**(GT② §2·§B-5)·authz 미배선 |

★핵심: JIT 최적화·Policy Drift 예측 **전부 ABSENT(순신규)**. classify(§A)·maker-checker(§B)·ModelMonitor drift(§C)는 재활용 substrate이나 JIT/drift에 배선된 것 없음.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§16·§11·§17): `optimization_id`·`tenant_id`·`jit_action`(remove_standing|convert_temporary|tune_session_duration|shorten_approval_chain) 또는 `drift_type`(obsolescence|conflict_growth|coverage_gap|complexity_increase)·`target_ref`·`confidence`(0~100 §18)·`explanation_ref`(§17)·`expected_benefit`·`model_version`(불변 §33).
- **학습 데이터원**(§3·ADR §D-6): JIT Requests·Assignment History·Session History·Policy Decisions. JIT/Policy 통제는 Part 3-9/3-12 소유·AI는 **추천·예측만**·집행 재구현 금지(ADR §D-6).
- **Policy Drift 예측**(§11): ModelMonitor drift 상태머신(`ModelMonitor.php:30-291`·정직 폴백 `:183-194`)을 authz 데이터로 재배선(ADR §D-1). 미연결 시 mt_rand 날조 금지(`ModelMonitor.php:183-194` 정직 폴백 패턴).
- **Human Approval**(§19·ADR §D-3): Production Permission/Global Scope는 자동 적용 금지·maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`) 배선.
- **제약**(§33): Tenant Isolation·Immutable Model Version.

## 4. KEEP_SEPARATE (마케팅 예측·fraud XAI 흡수금지)

★JIT 최적화·Policy Drift 예측은 **인가 최적화**이며, 마케팅 최적화·드리프트와 분리된다(ADR §D-7).

- `AutoRecommend.php:35-920`(예산배분 최적화·UCB bandit `:81`)·`Mmm.php:1-23`(믹스모델 한계ROAS)는 **광고 최적화**이지 JIT 최적화가 아니다(GT② §B-1). 흡수 금지.
- ★드리프트 함정: `ModelMonitor.php:293-313` seedDemoModels(이탈/전환/추천/LTV/광고ROAS)·drift 소비는 **마케팅**(GT② §B-5). 상태머신(`:30-291`)만 도메인중립 재배선·seed 흡수 금지.
- ★오흡수 함정: `Risk.php:61-66` top_drivers·`Decisioning.php:433-477` explainability=마케팅 설명(GT② §B-3). authz XAI 아님.
- 데이터소스 분리: `performance_metrics`/`crm_*`(마케팅) ≠ JIT Requests·`acl_permission`(authz).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: JIT Optimization·Policy Drift 예측 = **ABSENT(순신규·grep 0)**. classify는 standing privilege proto baseline·정적 assignment는 추천 아님.
- **재활용(흡수 아님·재배선/승격)**: `AccessReview.php:87-122` classify(DORMANT/STALE_UNUSED)를 standing privilege 추천 baseline로 승격·ModelMonitor drift 상태머신(`ModelMonitor.php:30-291`·정직 폴백 `:183-194`)을 authz Policy Drift로 재배선(ADR §D-1)·maker-checker를 approval chain 게이트에 배선·ClaudeAI LLM=XAI infra(`ClaudeAI.php:70`·`:542-666`).
- **KEEP_SEPARATE**: AutoRecommend/Mmm·ModelMonitor seed(`:293-313`)·`Risk.php:61-66`·`Decisioning.php:433-477` 흡수 금지.
- **선행의존**: Part 1~3-14(JIT=3-9·PDP=3-12) 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0.
