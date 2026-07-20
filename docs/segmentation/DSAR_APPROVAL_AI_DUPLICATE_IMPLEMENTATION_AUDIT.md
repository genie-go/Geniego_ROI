# DSAR — Authorization AI Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_15_AUTHORIZATION_AI_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_AUTHZ_AI_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_AI_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) ★KEEP_SEPARATE 마케팅 AI/ML(오흡수 최대 위험).

---

## 1. 핵심 판정 — **authz AI 거버넌스 부재, 인가는 결정론적 rule-based / AI는 전부 마케팅**

`authz.*(ai|ml|model)`·`role.mining`·`least.privilege`·`policy.recommend`·`privilege.escalation.*predict` **authz 매치 0건**. authz AI 거버넌스 골격은 그린필드. 존재하는 AI/ML/recommendation/prediction은 **거의 전부 마케팅·커머스·CRM**(§B). 단 도메인중립 인프라·proto-recommendation·maker-checker(GT①)는 재활용.

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| AI Governance Registry / Knowledge Base | **ABSENT(grep 0)** | authz AI 거버넌스 레지스트리·지식베이스 전무 |
| AI Feature Store / ML Dataset Manager | **ABSENT / PARTIAL(패턴)** | 전용 feature store/feature view/dataset 버전 없음. `DataPlatform.php:231-346`(데이터 카탈로그+quality)은 ML feature store 아님·소비=마케팅 |
| Policy/Role/Permission/Scope/Assignment Recommendation(AI) | **ABSENT / PARTIAL(proto)** | AI 추천 엔진 전무. `AccessReview.php:87-122` classify=결정론적 임계 proto·`TeamPermissions.php:356-373` 수동 위임상한. 미사용 role·중복 permission·least-privilege AI 추천 없음 |
| authz Risk/Threat/Compliance Prediction | **ABSENT** | `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 라벨·`Compliance.php:53-130` posture=산술 readiness%(`:120`). privilege escalation/insider threat 예측 ML 없음 |
| SoD Recommendation / JIT Optimization(AI) | **ABSENT(grep 0)** | 신규 conflict rule 추천·standing privilege 제거 추천 전무 |
| XAI / AI Confidence(authz) | **ABSENT** | 인가 추천 confidence/근거/training feature 제공 없음. ★혼동주의(§B) |
| Human Approval Gateway(AI 배선) | **PARTIAL(substrate·AI 미배선)** | maker-checker(`Mapping.php:268-271`·`Alerting.php:642-650`)·AccessReview decision(`:177-242`) 완비이나 AI 추천 승인 게이트에 미배선 |
| Autonomous Optimization / Continuous Learning(authz) | **ABSENT** | 자율 최적화·authz 학습/재학습/거버넌스 승인 파이프라인 전무. `ModelMonitor` retrain(`:161-218`)은 마케팅 모델 |
| AI Snapshot/Evidence/Digest/Analytics/Drift/Simulation(authz) | **ABSENT / PARTIAL** | SecurityAudit(`AccessReview.php:225`) Evidence 근접·ModelMonitor drift(`:244-291`)는 마케팅. authz 전용 전무 |
| Immutable Model Version 저장 | **ABSENT** | `risk_model_registry`(`Db.php:448-456`)·`ml_models`(`ModelMonitor.php:35`) 가변 갱신·불변강제(해시체인/WORM) 없음 |
| AI Runtime Guard(model poisoning/AI bypass)/Static Lint(missing XAI/confidence/human approval) | **ABSENT** | AI 거버넌스 가드·lint 전무 |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 재배선/확장)

1. **모델 모니터링/드리프트 상태머신** — `ModelMonitor.php:30-291`(drift_score/retrain_threshold·정직 폴백 `:183-194`). authz 모델 거버넌스로 재배선.
2. **LLM/quota/키관리 코어** — `ClaudeAI.php:70`·`:542-666`. authz XAI 설명생성 infra.
3. **모델 버전 레지스트리 패턴** — `Db.php:448-456`·`Risk.php:149-187`. authz 모델 버전·메트릭·배포플래그(불변강제 신설 필요).
4. **데이터 품질/신뢰 게이트** — `DataPlatform.php:231-346`. authz feature/dataset quality 참고.
5. **proto-recommendation** — `AccessReview.php:87-122` classify. AI recommendation의 결정론 baseline.
6. **Human Approval** — `Mapping.php:268-271`·`Alerting.php:642-650`·`AccessReview.php:177-242`. AI 게이트에 배선.
7. **AI Evidence** — `SecurityAudit`(`AccessReview.php:225`)·`UserAuth::logAudit`(`:4203`). AI Evidence/Snapshot.

## 4. ★KEEP_SEPARATE — 마케팅 AI/ML (authz 거버넌스 아님·오흡수 최대 위험·개명 금지)

★저장소는 마케팅/커머스 AI 플랫폼이라 AI/ML/recommendation/prediction/model이 대량이나 **거의 전부 마케팅 도메인**(`performance_metrics`/`crm_*`/`channel_orders`≠authz `acl_permission`/`auth_audit_log`).

### B-1. 마케팅 추천·최적화
- `AutoRecommend.php:35-920`(예산배분·UCB bandit `:81`·경험적 베이즈 `:79`·채널 벤치마크 `:114`·자가학습 prior `:185`)·`Mmm.php:1-23`(믹스모델·adstock·한계ROAS). 광고 최적화.

### B-2. 고객·수요·그래프 예측
- `CustomerAI.php:9-23`(RFM/churn/LTV·구매확률)·`DemandForecast.php:9-40`(Holt-Winters SKU 수요)·`GraphScore.php:12-40`(influencer→sku 어트리뷰션). 커머스/CRM.

### B-3. 광고 의사결정·이상탐지·fraud (★XAI 혼동 함정)
- `Decisioning.php:12-477`(ingestAdInsights `:36`·**"explainability" `:433-477`=광고추천 설명≠authz XAI**)·`AnomalyDetection.php:1-45`(광고 SPC μ±kσ)·`Risk.php:12-214`(공급망 fraud 로지스틱 `:27-66`·**top_drivers `:61-66`=fraud 피처기여≠권한판정 설명**·risk_model_registry `:81`·risk_prediction `:91`). ★explainability/top_drivers를 authz XAI로 흡수 금지.

### B-4. LLM 마케팅 표면
- `ClaudeAI.php:648-838`·`:839-955`(BI/CRM/PnL agentic 툴콜=커머스 데이터)·`:1051`·`:1135`·`:1359`·`:1856-1998`·`:2348-3010`(마케팅 프롬프트·광고 소재/이미지/비디오 생성). LLM 코어(`:70`·`:542-666`)만 도메인중립 재활용.

### B-5. ML 모델 모니터링 seed
- `ModelMonitor.php:293-313`(seedDemoModels=이탈예측/구매전환/상품추천/LTV/광고ROAS). 상태머신(`:30-291`)은 도메인중립이나 seed·소비는 마케팅.

## 5. 종합

**Authorization AI Governance 거버넌스 = ABSENT 골격(AI Registry·Feature Store·Recommendation/Prediction 엔진·XAI·Confidence·Human Approval Gateway 배선·Autonomous·Continuous Learning·Snapshot/Evidence/Digest/Analytics/Drift/Simulation·immutable model·Guard/Lint 순신규) / PARTIAL(AccessReview classify proto·maker-checker·도메인중립 ML 인프라 미배선) / 대량 마케팅 AI KEEP_SEPARATE.** 재활용(흡수 아님·재배선): ModelMonitor 드리프트/재학습·ClaudeAI LLM/quota·risk_model_registry 버전패턴·DataPlatform quality·AccessReview classify/maker-checker/SecurityAudit. **★KEEP_SEPARATE=마케팅 AI 8종(AutoRecommend/Mmm/CustomerAI/Decisioning/AnomalyDetection/Risk/DemandForecast/GraphScore)+ClaudeAI 마케팅 프롬프트. ★XAI 혼동 함정: Decisioning explainability·Risk top_drivers는 마케팅 설명이지 authz XAI 아님.** authz AI≠마케팅 AI(데이터소스 `performance_metrics`/`crm_*` ≠ authz `acl_permission`/`auth_audit_log`).
