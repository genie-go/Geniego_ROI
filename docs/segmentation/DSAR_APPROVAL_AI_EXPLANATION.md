# DSAR — Authorization AI Governance: 설명가능성 XAI (APPROVAL_AI_EXPLANATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_EXPLANATION`(SPEC §2·§17)은 모든 인가 AI 추천에 첨부되는 **설명가능성(XAI) 페이로드**다. SPEC §17은 7요소를 필수화한다: **Recommendation · Confidence Score · Supporting Evidence · Training Features · Historical Similarity · Expected Benefit · Expected Risk**. 근거없는 추천은 Static Lint `Missing Explainability`(§29)로 차단되고, V4 헌법 Explainable AI(근거없는 결론 금지)와 정합한다(ADR D-4).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §17 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz XAI(권한판정 설명) | **ABSENT** | GT② §2 "XAI / AI Confidence(authz) = ABSENT"·§B-3 ★혼동주의 |
| Supporting Evidence substrate | **PARTIAL(재활용)** | `AccessReview.php:225` SecurityAudit 이중기록·`UserAuth.php:4203` logAudit SSOT — AI Evidence(§23) 근접(GT① §B·§C) |
| 설명 생성 LLM infra | **PARTIAL(재활용)** | `ClaudeAI.php:70` complete·`:542`·`:564` quotaGate/Consume·`:597-666` callClaude — 도메인중립 LLM 코어(GT① §C) |
| 마케팅 "explainability"(★흡수 금지) | **KEEP_SEPARATE** | `Decisioning.php:433-477` explainability=광고추천 설명·`Risk.php:61-66` top_drivers=fraud 피처기여(GT② §B-3) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(§17 7요소)**: `recommendation`·`confidence_score`(→APPROVAL_AI_CONFIDENCE)·`supporting_evidence`·`training_features`·`historical_similarity`·`expected_benefit`·`expected_risk`·`tenant_id`.
- **생성**: 설명 자연어화는 `ClaudeAI.php:70`·`:597-666` LLM infra 재활용(도메인중립 코어만·마케팅 프롬프트 표면 `ClaudeAI.php:648-838`·`:2348-3010`은 미사용)(ADR D-4).
- **제약**: Evidence(§23 Feature Set/Prediction Reason)는 SecurityAudit 해시체인 확장(ADR D-5·`AccessReview.php:225` 참조패턴). Tenant Isolation(§33). Static Lint `Missing Explainability`(§29) 강제.

## 4. KEEP_SEPARATE (마케팅 explainability/top_drivers 흡수금지)

★**오흡수 최다 함정**(ADR D-7·GT② §B-3): `Decisioning.php:433-477` "explainability"는 **광고 추천 설명**(`Decisioning.php:12-477`·ingestAdInsights `:36`), `Risk.php:61-66` top_drivers는 **공급망 fraud 피처기여**(`Risk.php:27-66` 로지스틱·`:91` risk_prediction)다. 둘 다 `performance_metrics` 소스 마케팅 설명이지 authz `acl_permission`/`auth_audit_log` 권한판정 XAI가 아니다. authz XAI로 **흡수·개명 절대 금지**. `ClaudeAI.php:648-955`·`:1856-1998`·`:2348-3010` 마케팅 프롬프트도 KEEP_SEPARATE(코어 `:70`·`:542-666`만 재활용).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**판정 = ABSENT-greenfield(authz XAI 순신규) / PARTIAL-substrate(재활용).** 재활용: `ClaudeAI.php:70`·`:542-666` LLM 설명생성 infra·`AccessReview.php:225`/`UserAuth.php:4203` Evidence. ABSENT: authz 추천 confidence/근거/training feature. 선행 의존: Part 1~3-14 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED. Decisioning explainability·Risk top_drivers 흡수 금지·근거없는 결론 금지.
