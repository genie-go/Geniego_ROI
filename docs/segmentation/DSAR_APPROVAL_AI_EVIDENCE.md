# DSAR — Authorization AI Governance: AI 증거 (APPROVAL_AI_EVIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_AI_EVIDENCE`(SPEC §23)는 AI 추천의 **정당성 입증 근거 묶음**으로 다음 5요소를 저장한다.

| 필드 | SPEC 근거 | 의미 |
|---|---|---|
| Feature Set | §23·§4 | 추천 산출에 투입된 feature 집합 |
| Training Dataset | §23·§3(Data Sources) | 모델 학습에 사용된 데이터셋(불변·§33) |
| Prediction Reason | §23·§17(XAI) | 예측/추천의 설명 가능한 근거 |
| Evaluation Result | §23·§21(Evaluation 단계) | 모델 평가 결과(accuracy 등) |
| Governance Approval | §23·§19(Human Approval) | 거버넌스/Human 승인 기록 |

목적: Explainable AI(§17)·Evidence Integrity(§33)·규제준수(ISO 42001/NIST AI RMF) 입증. "근거없는 결론 금지"(V4 헌법·ADR §D-4).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Evidence 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| AI Evidence 해시체인(무결성 substrate) | **PARTIAL(근접·재활용)** | `backend/src/Handlers/AccessReview.php:225`(SecurityAudit 이중기록)·`backend/src/Handlers/UserAuth.php:4203`(logAudit SSOT)·`:4150` |
| Governance Approval(maker-checker substrate·AI 미배선) | **PARTIAL** | `backend/src/Handlers/Mapping.php:238-294`·`:268-271`(self-approval 차단·정족수)·`backend/src/Handlers/Alerting.php:642-650`(quorum≥2)·`backend/src/Handlers/AccessReview.php:177-242`(justification 필수 결정) |
| Evaluation Result(ML metrics·마케팅) | **PARTIAL(도메인중립 패턴)** | `backend/src/Handlers/ModelMonitor.php:142-158`(modelMetrics·ml_model_metrics) |
| Training Dataset / Feature Set 품질 게이트(마케팅) | **PARTIAL(패턴)** | `backend/src/Handlers/DataPlatform.php:231-346`(dataQuality·dataLineage·ML feature store 아님·소비=마케팅) |
| Prediction Reason 생성 infra(LLM·도메인중립) | **PARTIAL(재활용)** | `backend/src/Handlers/ClaudeAI.php:70`·`:542-666`(complete·quotaGate·callClaude) |
| authz 전용 Feature Set/Training Dataset/Prediction Reason | **ABSENT** | GT② §2 XAI/AI Confidence(authz)=ABSENT·Feature Store/Dataset ABSENT·Snapshot/Evidence(authz) ABSENT |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **필드**: Feature Set + Training Dataset + Prediction Reason + Evaluation Result + Governance Approval(§23).
- **불변성**: Training Dataset·Evidence는 Immutable(§33 Immutable Training Dataset·Evidence Integrity). SecurityAudit 해시체인(`AccessReview.php:225` 참조패턴)·logAudit(`UserAuth.php:4203`) 확장으로 위변조 방지(ADR §D-5).
- **Governance Approval 배선**: maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`)·AccessReview decision(`:177-242`)을 AI 추천 승인 게이트(§19)에 배선해 Evidence의 Governance Approval 필드를 충족(ADR §D-3). Critical Policy/SoD Rule/Production Permission/Global Scope는 Human Approval 필수(§19).
- **Prediction Reason**: ClaudeAI LLM/quota(`:70`·`:542-666`) infra 재활용해 XAI 설명 생성(ADR §D-4). 테넌트 격리(§33) 절대.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- ★**최대 오흡수 함정**: `Decisioning.php:433-477`의 "explainability"·`Risk.php:61-66`의 top_drivers는 **광고추천 설명/fraud 피처기여**이지 authz XAI/Prediction Reason이 **아니다**(GT② §B-3·ADR §D-7). Evidence의 Prediction Reason으로 흡수·개명 금지.
- `ModelMonitor.php:142-158`(modelMetrics)·`DataPlatform.php:231-346`(quality)는 **도메인중립 패턴만** 참고. 소비·seed는 마케팅(GT② §B-4·§B-5). ClaudeAI 마케팅 프롬프트(`ClaudeAI.php:648-838`·`:2348-3010`)는 흡수 금지·LLM 코어(`:70`·`:542-666`)만 재활용.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**APPROVAL_AI_EVIDENCE = ABSENT-greenfield(authz 전용 Feature Set/Training Dataset/Prediction Reason 순신규) / PARTIAL-substrate.** 재활용(흡수 아님·재배선): SecurityAudit 해시체인(AccessReview.php:225)·logAudit(UserAuth.php:4203·:4150)를 immutable Evidence로 확장(ADR §D-5)·maker-checker(Mapping.php:268-271·Alerting.php:642-650·AccessReview.php:177-242)를 Governance Approval에 배선(ADR §D-3)·ModelMonitor metrics(:142-158)·DataPlatform quality(:231-346) 패턴 참고·ClaudeAI LLM(:70·:542-666)로 Prediction Reason 생성. 마케팅 explainability/top_drivers KEEP_SEPARATE(흡수 최다 함정). 선행: Part 1~3-14 인증·XAI(§17)·Feature Store(§4) 신설 후 실 구현(BLOCKED_PREREQUISITE).
