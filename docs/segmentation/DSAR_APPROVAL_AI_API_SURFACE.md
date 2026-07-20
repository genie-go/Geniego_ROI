# DSAR — Authorization AI Governance: AI API Surface (Part 3-15 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_AI_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §32는 authz AI 거버넌스 최소 API 8종을 규정한다. 전부 **신규**(authz AI 엔진 부재).

| API | 역할 | 매핑 |
|---|---|---|
| Generate Recommendation | Policy/Role/Permission/Scope/Assignment 추천 생성 | §5~§9 |
| Explain Recommendation | XAI 근거·confidence·feature 반환 | §17·§18 |
| Predict Risk | privilege escalation/insider threat 예측 | §12 |
| Predict Compliance | certification delay/audit failure 예측 | §14 |
| Predict Threat | abnormal behavior/credential abuse 예측 | §13 |
| Run Simulation | role reduction/policy merge 예상효과 | §27 |
| Query Analytics | acceptance/accuracy/drift/override 지표 | §25 |
| Compare Model Versions | 버전 간 성능 비교 | §22·§33 |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| API | 판정 | 근거(파일:라인) |
|---|---|---|
| Generate Recommendation(authz) | **ABSENT / PARTIAL(proto)** | `AccessReview.php:87-122` classify(결정론 임계 proto·AI 아님)·`:158`·`:162-163` 심각도 정렬 — GT① §A |
| Explain Recommendation(XAI) | **ABSENT** | authz XAI 부재. LLM infra 재활용 후보 `ClaudeAI.php:70`·`:542`·`:597-666`(complete/callClaude·도메인중립) — GT① §C |
| Predict Risk(authz) | **ABSENT(정적 라벨만)** | `UserAuth.php:4165`·`:4174` auth_audit_log.risk=정적 리터럴·예측 없음 — GT① §E |
| Predict Compliance | **ABSENT(정적)** | `Compliance.php:53-130`·`:120` posture=산술 readiness%·ML 아님 — GT① §E |
| Predict Threat | **ABSENT** | privilege escalation/insider threat 예측 ML 없음(GT② §2) |
| Run Simulation | **ABSENT** | authz 시뮬레이션 전무(GT② §2) |
| Query Analytics | **ABSENT** | authz AI 지표 집계 없음(GT② §2) |
| Compare Model Versions | **ABSENT(가변 레지스트리)** | `Db.php:448-456`·`ModelMonitor.php:35` 버전 존재하나 이력/비교 불변저장 없음(★마케팅) — GT① §D |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **A-1 신규 표면**: 8종 API 전부 신규 엔드포인트. `/api` 접두 실배선 필수(저장소 라우팅 규약)·라우트 등록 파일에 `$register` 배선(실 구현 세션 조건).
- **A-2 XAI 강제**: Generate/Explain은 §17 전 필드(Recommendation/Confidence/Evidence/Training Features/Historical Similarity/Expected Benefit/Expected Risk) 반환. 근거없는 결론 금지(ADR D-4·V4 헌법).
- **A-3 Explain infra 재활용**: 설명생성은 ClaudeAI LLM/quota(`ClaudeAI.php:70`·`:542`·`:597-666`) 도메인중립 코어 재활용(quotaGate `:542`·callClaude Tools `:597-666`).
- **A-4 Predict baseline**: Predict Risk/Compliance/Threat는 정적 substrate(`UserAuth.php:4165`·`Compliance.php:53-130`)를 baseline로 ML 예측 확장(ADR D-2). 정적 라벨을 예측으로 위장 금지.
- **A-5 Compare Versions 불변**: Compare Model Versions는 불변 Model Version 저장(§33·ADR D-5) 전제. 현행 가변 레지스트리(`Db.php:448-456`) 불변강제 신설 후.
- **A-6 쓰기 게이트**: 추천 집행 API는 Human Approval Gateway(§19·maker-checker `Mapping.php:268-271`·`Alerting.php:642-650`) 통과 필수.

## 4. KEEP_SEPARATE (마케팅 AI 흡수금지)

- ★ClaudeAI **마케팅 표면**(`ClaudeAI.php:648-838`·`:839-955`·BI/CRM/PnL agentic 툴콜·광고 소재/이미지/비디오)은 authz API 아님 — LLM 코어(`:70`·`:542-666`)만 재활용(GT② §B-4·ADR D-7).
- 마케팅 AI 8종의 추천/예측 API는 별개 표면: `AutoRecommend.php:35-920`(예산배분·UCB `:81`)·`Mmm.php:1-23`·`CustomerAI.php:9-23`·`Decisioning.php:12-477`·`Risk.php:12-214`·`AnomalyDetection.php:1-45`·`DemandForecast.php:9-40`·`GraphScore.php:12-40`.
- ★XAI 함정: `Decisioning.php:433-477` explainability·`Risk.php:61-66` top_drivers는 Explain Recommendation(authz)로 흡수 금지(마케팅 설명).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**AI API Surface = ABSENT(8종 순신규).** 재활용(재배선·흡수 아님): AccessReview classify(`:87-122`)→Generate baseline·ClaudeAI LLM 코어(`:70`·`:597-666`)→Explain infra·정적 risk/compliance(`UserAuth.php:4165`·`Compliance.php:53-130`)→Predict baseline·maker-checker→쓰기 게이트. Compare Versions는 불변 Model 저장 신설 후 유효 → 선행의존. ★마케팅 AI 8종·ClaudeAI 마케팅 표면·explainability/top_drivers 흡수 금지. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
