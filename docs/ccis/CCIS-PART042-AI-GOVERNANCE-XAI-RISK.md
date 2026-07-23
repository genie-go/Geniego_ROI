# GeniegoROI Claude Code Implementation Specification

# CCIS Part042 — Enterprise AI Governance, Responsible AI, Explainable AI (XAI) & AI Risk Management Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

AI Governance·Responsible AI·XAI·AI Risk Management 표준을 수립한다.

> ★**성격(거버넌스 원칙 강·형식 XAI/Bias/Fairness 도구 부재)**: AI 거버넌스는 헌법 V4/V5(AI Marketing
> Intelligence OS)의 핵심이나, **원칙·게이트 층위**가 강하고 **형식 XAI/Bias/Fairness 측정 도구**는 없다
> (MEA 056 AI Governance weak). ★**강한 축(거버넌스 원칙·게이트)**: **V4 Explainable AI**(근거/신뢰도 표시·
> `ClaudeAI` **Citation**=근거 블록·**min-score 게이트≥5**·"근거 없으면 빈 배열·**지어내지 않는다**"=설명가능성
> 핵심·MEA 055)·**HITL**(`action_request`+`agent_mode` 승인·high-value 게이트 ₩5M↑ 무승인 차단)·**V3 Trust
> 게이트**(READY 데이터만 AI 사용·수집≠사용)·**`ModelMonitor`**(모델 감시·Part027)·**`ClaudeAI` Gateway**
> (전송 일원화·`ai_call_log` 감사·MEA 053)·**`SecurityAudit`**(AI 감사)·**V5 Safety Rule**(신뢰도/권한/동기화/
> 통계신뢰 부족→자동집행 금지·경고) 가 실재한다. ★**부재 축**: 명세의 **형식 XAI(SHAP/LIME/Feature
> Importance)·Bias Detection·Fairness Assessment(Demographic Parity)·형식 AI Risk Framework·Guardrail
> 엔진(prompt/output validation·content moderation)·형식 AI Policy Engine·ISO 42001/NIST AI RMF/EU AI Act
> 인증**은 **부재/부분**(grep 0). ★**정직·구조적 한계**: **Bias/Fairness의 인구통계 측정은 PII 미저장(집계
> 코호트)으로 구조적으로 제한**된다(개인 demographic 레코드 없음). Part001 §4 에 따라 실측 → SHAP/LIME/Bias
> 부재증명 → V4 헌법+HITL+ModelMonitor+V3 Trust 성문화했다. ★정본=**MEA 053~058·헌법 V4/V5·Part027(MLOps)·
> Part040(SecOps)** 승계. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 AI 거버넌스 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| AI Governance Architecture | Request→Policy→Risk→Decision→Explain→Audit | **부분(대응물)** — V3 Trust 게이트→`ClaudeAI` Gateway→Citation(근거)→`SecurityAudit`. 형식 Policy/Risk 엔진 부분 |
| AI Governance Framework | Policy/Owner/Classification/Approval/Risk | **부분** — `ModelMonitor`(모델 메타)·`action_request`(승인)·V3 Trust. 형식 AI Registry/Risk Level 부분 |
| Responsible AI | Transparency/Accountability/Privacy/Oversight | ★**대응물** — V4 헌법·PII 미저장·HITL(`action_request`)·근거 표시 |
| Explainable AI(XAI) | Global/Local/Feature Importance/Trace | ★**대응물(형식 XAI 아님)** — V4 Citation(근거 블록·`sources`·min-score 게이트·`Decisioning`/`Mmm` 근거). **SHAP/LIME/Feature Importance 부재**(MEA 056) |
| AI Risk Management | Model/Operational/Regulatory/Data/Security Risk | **부분** — `Risk`·V3 Trust(Data Risk)·`SecurityAudit`(Security). 형식 Risk Level 차등승인 부분 |
| AI Policy Enforcement | Access/Usage/Output/Escalation | **부분(대응물)** — RBAC·V5 Safety Rule(신뢰도/권한 부족→집행금지)·high-value 게이트. 형식 Output Policy 엔진 부분 |
| Human-in-the-Loop(HITL) | Manual Review/Approval/Override | ★**실재** — `action_request`+`agent_mode`(승인·집행 정책)·high-value 게이트(₩5M↑ 무승인 차단·289차) |
| AI Fairness | Equal Opportunity/Demographic Parity | **부재(구조적 제한)** — **PII 미저장(집계 코호트)** → 인구통계 fairness 측정 구조적 불가. formal fairness 없음 |
| Bias Detection | Data/Model/Output/Feedback Bias | **부재** — 편향 탐지 도구 없음. (V3 Trust Fake/Bot/Spam 은 데이터 품질이지 모델 편향 아님) |
| Model Explainability | Feature Contribution/Confidence/Reason | ★**대응물** — 근거/신뢰도 표시(V4)·`Decisioning`/`Mmm` 근거·Citation. Feature Contribution(SHAP) 부재 |
| AI Audit | Model Version/Input·Output/Reviewer/Approval | ★**부분 준수** — `ai_call_log`(LLM 호출 감사)·`SecurityAudit`·`ModelMonitor`. Input/Output 최소저장(PII 미저장) |
| AI Safety Guardrails | Prompt/Output Validation/Content Detection | **부분** — 프롬프트 시스템 제약·V3 Trust·`Ssrf`. 형식 Guardrail 엔진(moderation) 부분 |
| AI Decision Logging | Request/Model/Decision/Confidence/Policy | ★**부분 준수** — `ai_call_log`·`Decisioning` 근거·Citation. Confidence/Policy Result 부분 |
| AI Approval Workflow | Draft→Risk Review→Approval→Production | **부분** — `action_request`(승인)·`ModelMonitor`. 형식 모델 승인 게이트 부분(Part027 큐잉) |
| Model Registry Integration | Registry Lookup/Approval Verify | **부분** — `ModelMonitor`(ml_models)·V3 Trust. 형식 승인 검증 부분 |
| Monitoring | Policy Violations/Bias Trend/Risk Score | **부분** — `AnomalyDetection`·`Alerting`·`SystemMetrics`(정직 null). Bias Trend 대상 없음 |
| Logging | Model/Tenant/Policy Version/Trace | **부분** — `ai_call_log`·`SecurityAudit`. Policy Version/Trace ID 부분 |
| Security(RBAC/Approval/Immutable Audit) | AI 정책 보안 | ★**준수** — RBAC+Scope·`action_request`·`SecurityAudit`(불변)·`Crypto` |
| Compliance(ISO 42001/NIST AI RMF/EU AI Act) | AI 규제 | **부재/부분** — 형식 AI 규제 인증 없음. V4/V5 헌법·PII 미저장·설명가능성이 원칙 대응 |
| Disaster Recovery | Policy/Registry/Audit/Guardrail 복구 | **부분** — DB 백업(`ai_call_log`/`ml_models`)·git(헌법). Guardrail 대상 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Responsible by Design/Human Oversight/Transparent/Explainable/Fair/Risk Aware/Policy Enforced/Auditable/Tenant Isolated) | **★대체로 준수(Fair 제외)** | ★Human Oversight(HITL)·Transparent/Explainable(Citation)·Auditable·Tenant Isolated·Policy Enforced(V5). Fair=PII 미저장 구조적 제한 |
| §4 AI Governance Architecture | **부분(대응물)** | V3 Trust→Gateway→Citation→Audit. 형식 Policy/Risk 엔진 부분 |
| §5 Governance Framework | **부분** | `ModelMonitor`·`action_request`·V3 Trust. 형식 Registry/Risk Level 부분 |
| §6 Responsible AI | **★대응물** | V4 헌법·PII 미저장·HITL·근거 표시 |
| §7 Explainable AI | **★대응물** | V4 Citation(근거·min-score 게이트·`Decisioning`/`Mmm`). SHAP/LIME 부재(MEA 056) |
| §8 AI Risk Management | **부분** | `Risk`·V3 Trust·`SecurityAudit`. Risk Level 차등승인 부분 |
| §9 AI Policy Enforcement | **부분(대응물)** | RBAC·V5 Safety Rule·high-value 게이트. Output Policy 엔진 부분 |
| §10 HITL | **★실재** | `action_request`+`agent_mode`·high-value 게이트 |
| §11 AI Fairness | **부재(구조적 제한)** | PII 미저장(집계 코호트)→인구통계 fairness 측정 불가 |
| §12 Bias Detection | **부재** | 편향 탐지 도구 없음(V3 Trust=데이터 품질이지 모델 편향 아님) |
| §13 Model Explainability | **★대응물** | 근거/신뢰도(V4)·`Decisioning`/`Mmm`·Citation. SHAP 부재 |
| §14 AI Audit | **부분 준수** | `ai_call_log`·`SecurityAudit`·`ModelMonitor`. Input/Output 최소(PII 미저장) |
| §15 Safety Guardrails | **부분** | 프롬프트 제약·V3 Trust·`Ssrf`. 형식 moderation 엔진 부분 |
| §16 AI Decision Logging | **부분 준수** | `ai_call_log`·근거·Citation. Confidence/Policy 부분 |
| §17 AI Approval Workflow | **부분** | `action_request`·`ModelMonitor`(큐잉·Part027). 형식 승인 게이트 부분 |
| §18 Model Registry Integration | **부분** | `ModelMonitor`(ml_models)·V3 Trust. 승인 검증 부분 |
| §19 Monitoring | **부분** | `AnomalyDetection`·`Alerting`·`SystemMetrics`(null). Bias Trend 없음 |
| §20 Logging | **부분** | `ai_call_log`·`SecurityAudit`. Policy Version/Trace 부분 |
| §21 Security | **★준수** | RBAC+Scope·`action_request`·`SecurityAudit` 불변·`Crypto` |
| §22 Compliance | **부재/부분** | ISO 42001/NIST AI RMF/EU AI Act 형식 없음. V4/V5·PII 미저장·설명가능성 원칙 대응 |
| §23 Disaster Recovery | **부분** | DB 백업·git(헌법). Guardrail 부분 |
| §24 Performance | **부분** | Citation min-score·HTTP 캐시. Explanation/Risk 캐시 부분 |
| §25~§26 PHP/Claude(Governance Service/Policy Engine/XAI Adapter/Approval Workflow) | **부분** | ★`ClaudeAI` Gateway·Citation·`action_request`·V3 Trust·`ModelMonitor`. XAI Adapter(SHAP)/형식 Policy Engine 부재 |
| §27~§28 검증(ai:policy:health/ai:bias:scan/ai:guardrail) | **대상 없음** | artisan 없음·Bias/Guardrail 도구 없음. V3 Trust·`action_request`·`ai_call_log` 로 대체 |

---

## 4. 확립된 표준 (신규 AI 거버넌스 코드가 따를 정본)

- ★**Explainable AI 정본 = V4 헌법 "근거/신뢰도 표시"** + `ClaudeAI` **Citation**(근거 블록·`sources`·**min-score 게이트≥5**). ★**근거 없으면 빈 배열·지어내지 않는다**(허위 출처 금지=설명가능성 핵심·MEA 055). ★**근거없는 결론 금지**. AI 추천은 `Decisioning`/`Mmm` 근거 동반.
- ★**HITL 정본 = `action_request`+`agent_mode`**. 자동집행은 승인정책 경유·**high-value 게이트**(₩5M↑ 무승인 차단·289차)·직접 publish 우회 금지(서버측 강제).
- ★**V5 Safety Rule**: **신뢰도/권한/동기화/통계신뢰 부족 시 자동집행 금지→경고**. ROAS 실패→광고중지 금지 등 안전장치. AI 자동화는 이 게이트 통과 필수.
- ★**AI는 V3 Trust READY 데이터만 사용**(수집≠사용·Part034/041). BLOCKED/WARNING 데이터로 추천/자동화 금지.
- ★**Gateway 일원화 = `ClaudeAI::complete`**(전송 단일 통과점·`ai_call_log` 감사·MEA 053). 신규 LLM 호출은 Gateway 경유(BYO 키 우선). ★053→056→057 단일 통과점이 감사/거버넌스 최대 레버리지.
- ★**모델 감시 = `ModelMonitor`**(Part027)·감사=`SecurityAudit`(불변 해시체인·Part040·재오염 금지). 정직 미산출(운영 재학습=큐잉·null+사유).
- ★**Fairness/Bias 정직 한계**: **PII 미저장(집계 코호트) → 인구통계 fairness 측정 구조적 제한**. 형식 fairness 도입 시 privacy-by-design 과 상충 검토 필수(demographic 레코드 신설=헌법 PII 금지 위반). 신설 금지·상충 명시.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식 XAI(SHAP/LIME/Feature Importance)** — 안 함(MEA 056·`shap` grep 0). V4 Citation(근거 블록)·`Decisioning`/`Mmm` 근거가 설명가능성 대응물. 통계/LLM 모델이라 SHAP 대상(학습형 ML)이 제한적(Part027).
2. **Bias Detection·Fairness Assessment(Demographic Parity 등)** — 안 함. ★**PII 미저장(집계 코호트)로 인구통계 측정이 구조적으로 제한**된다(개인 demographic 레코드 없음). demographic 레코드 신설=헌법 PII 금지 위반. privacy-by-design 과 상충.
3. **형식 AI Risk Framework(Risk Level 차등승인)·형식 AI Policy Engine** — 부분. `Risk`·V3 Trust·V5 Safety Rule·high-value 게이트가 대응물. 형식 Risk/Policy 엔진 미도입.
4. **AI Safety Guardrail 엔진(prompt/output moderation)** — 부분. 프롬프트 시스템 제약·V3 Trust·`Ssrf`. 형식 content moderation 엔진 미도입.
5. **ISO 42001/NIST AI RMF/EU AI Act 형식 인증** — 안 함. V4/V5 헌법·설명가능성·HITL·PII 미저장 기술 원칙은 준수하되 형식 인증서는 외부 프로세스.
6. **artisan `ai:policy:*`/`ai:bias:scan`/`ai:guardrail` 명령** — 없음(Slim·Bias/Guardrail 도구 없음). V3 Trust·`action_request`·`ai_call_log`·Citation 로 대체.

★**준수하는 실 원칙(강함)**: **V4 Explainable(근거/신뢰도·Citation·min-score 게이트·근거없는 결론 금지)·HITL(action_request·high-value 게이트)·V5 Safety Rule(부족 시 집행금지)·V3 Trust READY 게이트(수집≠사용)·Gateway 일원화(ai_call_log 감사)·ModelMonitor·SecurityAudit(불변)·정직 미산출·테넌트 격리·PII 미저장**. ★**정직 한계 명시**: Fairness/Bias 인구통계 측정은 PII 미저장으로 구조적 제한(결함 아님·설계 선택).

---

## 6. Claude Code 구현 규칙

1. AI 추천/결정=V4 근거/신뢰도 표시(`ClaudeAI` Citation·min-score 게이트·`Decisioning`/`Mmm` 근거). ★근거 없으면 빈 배열·지어내지 않는다·근거없는 결론 금지.
2. 자동집행=`action_request`+`agent_mode` 승인·high-value 게이트·V5 Safety Rule(신뢰도/권한 부족→집행금지). 서버측 강제.
3. AI 데이터=V3 Trust READY만(수집≠사용). LLM 호출=`ClaudeAI::complete` Gateway·`ai_call_log` 감사(직접 전송 금지).
4. 모델 감시=`ModelMonitor`·감사=`SecurityAudit`(불변·재오염 금지)·정직 미산출(큐잉·null+사유).
5. ★**Bias/Fairness 인구통계 측정을 위해 demographic PII 를 신설하지 않는다**(헌법 PII 금지·집계 코호트 유지). privacy-by-design 상충 명시.
6. SHAP/LIME/형식 Guardrail 엔진/AI Policy Engine/ISO 42001 을 "명세에 있다"는 이유로 이식하지 않는다(V4 Citation+HITL+V3 Trust+Safety Rule 로 커버). 형식 도구=도입 결정 후.

---

## 7. Completion Criteria

- [x] AI 거버넌스 스택 **실측**(SHAP/LIME/Bias/Fairness/Guardrail 엔진/형식 AI Policy 부재·V4 Citation·`action_request` HITL·V3 Trust·`ModelMonitor`·Gateway·V5 Safety Rule 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 XAI/Bias/Fairness 부재 증명·거버넌스 원칙 강함·Fairness 구조적 제한)
- [x] 실 거버넌스(V4 Explainable+HITL+V3 Trust+Gateway+ModelMonitor+SecurityAudit+V5 Safety) 성문화(§4)
- [x] ★근거/신뢰도(근거없는 결론 금지)·HITL(high-value 게이트)·V5 Safety Rule·V3 Trust READY·Gateway 감사·**Fairness PII 구조적 제한 정직 명시**
- [x] 의도적 미적용 + 사유(§5) — SHAP/LIME/Bias/Fairness/Risk Framework/Guardrail 엔진/ISO 42001
- [x] Claude Code 규칙(§6) · `ClaudeAI` Citation·`action_request`·V3 Trust·`ModelMonitor`·`SecurityAudit` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **거버넌스 원칙·게이트**(V4 Explainable Citation + HITL
> action_request + V3 Trust READY + Gateway 감사 + V5 Safety Rule)의 성문화이지 SHAP/LIME/Bias/Fairness/
> Guardrail 엔진 이식이 아니다. ★**정직 한계**: **Fairness/Bias 인구통계 측정은 PII 미저장(집계 코호트)으로
> 구조적으로 제한**되며, 이는 결함이 아니라 **privacy-by-design 설계 선택**이다(demographic PII 신설=헌법 위반).

---

## 다음 Part

**CCIS Part043 — Enterprise Knowledge Graph, Semantic Web, Ontology & Graph Intelligence** — ★사전 실측 예고: 형식 RDF/OWL/SPARQL·그래프 DB(Neo4j)·Ontology 도구는 **부재**이나, 그래프 지식 실체는 **`graph_node`(node_type/node_id·KG 정본·Part029)·`GraphScore`·`AttributionEngine`(markov 그래프)·`GeniegoGlossary`(용어 온톨로지 유사)·`EventNorm`/Unified Entity Model(엔티티 해석)·Customer360(관계 인텔리전스)**로 부분 실재. Part043 도 실측→RDF/OWL/Neo4j 부재증명→graph_node+markov+Glossary 성문화. ★KG 정본=`graph_node`(Part029)·MEA 055 KG weak·"중복 KG 금지" 승계.
