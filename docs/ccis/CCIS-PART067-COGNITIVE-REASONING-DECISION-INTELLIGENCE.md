# GeniegoROI Claude Code Implementation Specification

# CCIS Part067 — Enterprise Cognitive Architecture, Hybrid Reasoning, AI Decision Intelligence & Strategic Planning Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Cognitive Architecture·Hybrid Reasoning·AI Decision Intelligence·Strategic Planning 표준을 수립한다.

> ★**성격(★Part042/054/055/062 중복 — 의사결정/추론 substrate 실재·형식 Cognitive/Strategic Planning 엔진
> 부재)**: 본 Part 는 **CCIS Part042(AI 거버넌스)·054(AI Agent)·055(의사결정/예측)·062(조직지능)와 중복**되며
> 그 판정을 승계한다. 명세가 다루는 **형식 Cognitive Architecture(Cognitive Memory)·Strategic Planning
> Intelligence·Goal-Oriented Planning·형식 Multi-Objective Optimization 엔진·Monte Carlo·Planning Automation
> 워크플로**는 **부재/부분**한다(grep 0). ★**실재 축(의사결정/추론)**: **`Decisioning`/`AutoRecommend`**
> (Decision Intelligence·recommendation/ranking·MEA 058)·**`Mmm`**(**다목적 최적화**·ROI frontier·예산 배분·
> 정직 미산출 optimized:false)·**`RuleEngine`**(**규칙 추론** IF-THEN·Part032)+**`callClaudeTools`**(**LLM 추론**·
> Part054)=**Hybrid Reasoning 유사**·**`graph_node` KG**(KG reasoning·Part043)·**`PriceOpt`**(Decision
> Simulation·po_simulations·정직 미산출 null/422·Part055)·**V4 근거/신뢰도**(Explainable)·**V3 Trust**(신뢰
> 게이트)·**`agent_mode`+`action_request`**(Human Oversight·HITL) 는 실재한다. ★★**핵심(정직 미산출·MEA 058)**:
> **`Mmm`은 최적화 불가 시 `optimized:false`+사유·`PriceOpt`는 `null`/422+사유**(날조 대신 정직). ★★**오흡수
> 차단**: **`RuleEngine`+`callClaudeTools`=규칙+LLM 추론이지 형식 Cognitive Architecture(Cognitive Memory)
> 아님** · **`Mmm`=예산/ROI 다목적 최적화이지 Strategic Planning Intelligence(전략 수립) 아님** · **`PriceOpt`
> what-if=가격 시뮬이지 Monte Carlo/Decision Simulation 엔진 아님**. Part001 §4 에 따라 실측 → Cognitive/
> Strategic Planning 엔진 부재증명 → Decisioning+Mmm+RuleEngine+LLM 성문화했다. ★정본=**Part042/054/055/062·
> MEA 058** 승계·정직 미산출·"자율집행=승인정책 존중"·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 의사결정/추론 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Cognitive Architecture(Engine 결합) | Knowledge→Reasoning→Decision→Planning→Execution | **부분(대응물)** — 지식(GeniegoKnowledge)→`RuleEngine`/`callClaudeTools`→`Decisioning`→액션. 형식 Cognitive 계층 아님 |
| Cognitive Architecture(Memory/Context) | Cognitive Memory/Knowledge Integration/Context | **부분** — conversation memory(단기·Part054)·`EventNorm`(통합)·context. 형식 Cognitive Memory 아님 |
| Hybrid Reasoning | Rule/KG/Statistical/LLM Reasoning | ★**대응물** — `RuleEngine`(규칙)+`graph_node`(KG)+`Mmm`/`AttributionEngine`(통계)+`callClaudeTools`(LLM). 형식 hybrid 엔진 아님 |
| AI Decision Intelligence | Recommendation/Ranking/Validation/Explanation | ★**실재(MEA 058)** — `Decisioning`/`AutoRecommend`·근거/신뢰도(V4)·V3 Trust(검증) |
| Strategic Planning Intelligence | Strategic Analysis/Roadmap/KPI | **부분(대응물)** — `Mmm`(예산 전략)·`Pnl`/`Insights`·`PM\*`(로드맵/Gantt·Part047). 형식 전략 수립 부분 |
| Goal-Oriented Planning | Goal Definition/Hierarchy/Task/Tracking | **부분(대응물)** — 헌법 Business Goal 중심(V5)·`PM\*`(태스크/의존성)·`JourneyBuilder`(목표 트리거). 형식 goal hierarchy 부분 |
| Multi-Objective Optimization | Cost/Time/Resource/Risk Opt | ★**대응물** — `Mmm`(ROI frontier·예산 다목적)·`PriceOpt`(마진). ★예산/ROI이지 시간/자원 형식 최적화 부분 |
| Decision Simulation | Scenario/What-if/Monte Carlo/Comparison | **부분(대응물)** — `Mmm`(예산 시나리오)·`PriceOpt`(가격 what-if·po_simulations). ★**Monte Carlo 부재** |
| Planning Automation | Workflow/Scheduling/Dependency/Validation | **부분** — `JourneyBuilder`·cron·`PM\Dependencies`. 형식 planning 워크플로 부분 |
| Business Rule Engine | Repository/Versioning/Evaluation/Governance | ★**실재** — `RuleEngine`(IF-THEN·rule_log·중복0·Part032) |
| Knowledge-Assisted Decision | Best Practice/Org Memory/Historical | **부분** — `GeniegoKnowledge`/Retriever·`SecurityAudit`(결정 이력)·`NEXT_SESSION`. 형식 org memory 부분(Part062) |
| Decision Governance | Policy/Approval/Audit/Risk Review | ★**대응물** — `action_request`+`agent_mode`·V5 Safety Rule·high-value 게이트·`SecurityAudit` |
| Decision Analytics | Accuracy/Outcome/Trend/KPI | **부분** — `Mmm`/`Pnl`·`ModelMonitor`·`AbTesting`. Decision Accuracy 부분 |
| Strategy Recommendation | Options/Priority/Ranking/Allocation | ★**대응물** — `AutoRecommend`/`Decisioning`(우선순위)·`Mmm`(예산 배분). 형식 전략 대안 부분 |
| Planning Intelligence Dashboard | Strategic/Decision/Goal/KPI | **부분** — 역할별 대시보드·`Mmm`/`Pnl`·`PM\Kpi` |
| Monitoring | Decision Accuracy/Planning/Goal/Sim Quality | **부분** — `ModelMonitor`·`SystemMetrics`·journey stats |
| Logging | Decision/Planning/Goal ID | **부분** — `ai_call_log`·`SecurityAudit`·rule_log. Decision/Trace ID 부분 |
| Security(RBAC/Policy/Approval/Immutable/격리) | 전략 데이터 보호 | ★**준수** — RBAC·`action_request`·V5 Safety Rule·`SecurityAudit` 불변·테넌트 격리 |
| Compliance(ISO 42001/거버넌스) | AI 의사결정 규정 | **부분** — V4/V5 헌법·`SecurityAudit`. 형식 인증 아님 |
| Disaster Recovery | Planning/Decision/Knowledge 복구 | **부분** — DB 백업(po_simulations/pm_*)·git(지식) |
| Performance(Decision/Planning Cache/Parallel Reasoning) | 대규모 분석 | **부분** — Citation min-score·rollup 캐시. Parallel Reasoning 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Decision First/Explainable AI/Human in Control/Knowledge Driven/Policy Driven/Tenant Isolation/Auditability/Strategic Alignment) | **★대체로 준수** | ★Explainable(근거/신뢰도)·Human in Control(HITL)·Knowledge Driven(SSOT)·Policy Driven(V5)·Tenant Isolation·Auditability. Continuous Learning 부분 |
| §4~§5 Cognitive Architecture | **부분(대응물)** | 지식→추론→`Decisioning`→액션. 형식 Cognitive/Memory 계층 아님 |
| §6 Hybrid Reasoning | **★대응물** | `RuleEngine`+`graph_node`+통계+`callClaudeTools`. 형식 엔진 아님 |
| §7 AI Decision Intelligence | **★실재(MEA 058)** | `Decisioning`/`AutoRecommend`·근거/신뢰도·V3 Trust |
| §8 Strategic Planning Intelligence | **부분(대응물)** | `Mmm`·`Pnl`·`PM\*`(로드맵). 형식 전략 수립 부분 |
| §9 Goal-Oriented Planning | **부분(대응물)** | Business Goal(V5)·`PM\*`·`JourneyBuilder`. goal hierarchy 부분 |
| §10 Multi-Objective Optimization | **★대응물** | `Mmm`(ROI frontier·예산 다목적)·`PriceOpt`. 시간/자원 형식 부분 |
| §11 Decision Simulation | **부분(대응물)** | `Mmm`(시나리오)·`PriceOpt`(what-if). Monte Carlo 부재 |
| §12 Planning Automation | **부분** | `JourneyBuilder`·cron·`PM\Dependencies` |
| §13 Business Rule Engine | **★실재** | `RuleEngine`(IF-THEN·rule_log·중복0) |
| §14 Knowledge-Assisted Decision | **부분** | `GeniegoKnowledge`/Retriever·`SecurityAudit`·`NEXT_SESSION` |
| §15 Decision Governance | **★대응물** | `action_request`·V5 Safety Rule·high-value 게이트·`SecurityAudit` |
| §16 Decision Analytics | **부분** | `Mmm`/`Pnl`·`ModelMonitor`·`AbTesting` |
| §17 Strategy Recommendation | **★대응물** | `AutoRecommend`/`Decisioning`·`Mmm`(예산 배분) |
| §18 Planning Intelligence Dashboard | **부분** | 대시보드·`Mmm`/`Pnl`·`PM\Kpi` |
| §19 Monitoring | **부분** | `ModelMonitor`·`SystemMetrics`·journey stats |
| §20 Logging | **부분** | `ai_call_log`·`SecurityAudit`·rule_log |
| §21 Security | **★준수** | RBAC·`action_request`·V5 Safety Rule·불변 감사·테넌트 격리 |
| §22 Compliance | **부분** | V4/V5·`SecurityAudit` |
| §23 Disaster Recovery | **부분** | DB 백업·git |
| §24 Performance | **부분** | Citation min-score·rollup 캐시 |
| §25~§26 PHP/Claude(Cognitive/Reasoning/Planning/Decision Intelligence/Strategy Service) | **부분** | ★`Decisioning`·`Mmm`·`RuleEngine`·`callClaudeTools`·`PriceOpt`. 형식 Cognitive/Planning/Multi-Obj 엔진 부재 |
| §27~§28 검증(decision:health/reasoning:validate/planning:status) | **대상 없음** | artisan 없음. `Decisioning`·`Mmm`·`/v424/rules` API 로 대체 |

---

## 4. 확립된 표준 (신규 의사결정/추론 코드가 따를 정본)

- ★**의사결정 정본 = `Decisioning`/`AutoRecommend`**(Decision Intelligence·recommendation/ranking·MEA 058). ★**근거/신뢰도 표시(V4 Explainable)·근거없는 결론 금지**. 신규 의사결정은 이 엔진 확장(중복 금지).
- ★**Hybrid Reasoning = `RuleEngine`(규칙)+`graph_node`(KG)+`Mmm`/`AttributionEngine`(통계)+`callClaudeTools`(LLM)**. 이 조합이 hybrid reasoning 대응물. ★**형식 Cognitive Architecture 엔진 신설 금지**(기존 조합 확장).
- ★**다목적 최적화 = `Mmm`(ROI frontier·예산 배분)**·`PriceOpt`(마진). ★★**정직 미산출**: 최적화 불가=`optimized:false`+사유·`PriceOpt` null/422+사유(MEA 058·날조 금지).
- ★**Decision Simulation = `Mmm`(시나리오)+`PriceOpt`(what-if·po_simulations)**. ★**Monte Carlo 신설 전 표본/근거 확보**(정직 미산출). ★**부트스트랩 신뢰구간**(용어집·통계 신뢰).
- ★**규칙 = `RuleEngine`(IF-THEN·rule_log·중복0)**·지식=`GeniegoKnowledge`/Retriever·목표=Business Goal 중심(V5·헌법).
- ★★**Human Oversight/거버넌스 = `agent_mode`+`action_request`+V5 Safety Rule+high-value 게이트**. ★**자율집행=승인정책 존중**(신뢰도/권한/통계신뢰 부족→집행금지)·V3 Trust READY 데이터만·`SecurityAudit`.
- ★★**오흡수 차단**: **`RuleEngine`+`callClaudeTools`=규칙+LLM 추론이지 형식 Cognitive Architecture(Cognitive Memory) 아님** · **`Mmm`=예산/ROI 다목적 최적화이지 Strategic Planning Intelligence(전략 수립) 아님** · **`PriceOpt` what-if=가격 시뮬이지 Monte Carlo 엔진 아님** · **`Decisioning`=의사결정 추천이지 multi-agent 아님**(Part054).
- ★★**Part042/054/055/062 중복·재판정 금지**: AI 거버넌스=Part042·Agent=Part054·의사결정/예측=Part055·조직지능=Part062 정본. 본 Part 는 Cognitive/Reasoning/Strategic Planning 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 다중 Part 중복 + 형식 Cognitive/Planning 엔진 부재)

1. **형식 Cognitive Architecture(Cognitive Memory)·형식 Strategic Planning Intelligence 엔진** — 안 함. `RuleEngine`+`callClaudeTools`+`graph_node`(hybrid reasoning)·`Mmm`/`PM\*`(전략/로드맵)이 대응물. 형식 인지 엔진 미도입.
2. **형식 Multi-Objective Optimization 엔진(시간/자원/리스크 동시)·Monte Carlo Simulation** — 부분. `Mmm`(ROI/예산 다목적 frontier)·`PriceOpt`(what-if)가 대응물. ★Monte Carlo=표본/통계신뢰 확보 선행(정직 미산출).
3. **형식 Goal Hierarchy/Planning Automation 워크플로** — 부분. Business Goal 중심(V5)·`PM\*`·`JourneyBuilder`. 형식 goal hierarchy 부분.
4. **Continuous Learning(전략 학습)** — 부분. `Mmm`/`AbTesting`/`ModelMonitor`. 자체 학습 없음(Part027).
5. **`RuleEngine`/`callClaudeTools`/`Mmm`/`PriceOpt` 를 Cognitive Architecture/Strategic Planning/Monte Carlo 로 오흡수 금지** — 규칙+LLM 추론/예산 최적화/가격 시뮬이지 형식 인지·전략 엔진 아님.
6. **Part042/054/055/062 와 중복되는 거버넌스/Agent/의사결정/조직지능** — 각 Part 정본(재판정 금지). 본 Part 는 Cognitive/Reasoning/Strategic 관점만.
7. **artisan `decision:*`/`reasoning:validate`/`planning:status` 명령** — 없음(Slim). `Decisioning`·`Mmm`·`/v424/rules` API 로 대체.

★**준수하는 실 원칙**: **의사결정(`Decisioning`/`AutoRecommend`·근거/신뢰도)·Hybrid Reasoning(RuleEngine+KG+통계+LLM)·다목적 최적화(Mmm frontier·정직 미산출)·Decision Simulation(PriceOpt what-if·정직 미산출)·Business Goal 중심·Human Oversight(action_request·V5 Safety Rule·high-value 게이트)·V3 Trust READY·정직 미산출·테넌트 격리**. ★**오흡수 차단**: 규칙+LLM≠Cognitive Architecture·Mmm≠Strategic Planning·what-if≠Monte Carlo. ★**Part042/054/055/062 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. 의사결정=`Decisioning`/`AutoRecommend`(근거/신뢰도·근거없는 결론 금지) 확장(중복 금지). Hybrid Reasoning=`RuleEngine`+`graph_node`+통계+`callClaudeTools`.
2. 다목적 최적화=`Mmm`(frontier)·시뮬=`PriceOpt`(what-if). ★★정직 미산출(optimized:false·null/422·날조 금지). Monte Carlo=표본/통계신뢰 선행.
3. ★★Human Oversight=`agent_mode`+`action_request`·V5 Safety Rule(부족 시 집행금지)·high-value 게이트·V3 Trust READY. 자율집행=승인정책 존중.
4. ★★오흡수 금지: `RuleEngine`+`callClaudeTools`(≠Cognitive Architecture)·`Mmm`(≠Strategic Planning)·`PriceOpt` what-if(≠Monte Carlo)·`Decisioning`(≠multi-agent).
5. 규칙=`RuleEngine`(중복0)·지식=`GeniegoKnowledge`/Retriever·목표=Business Goal(V5)·`SecurityAudit`·테넌트 격리.
6. ★★거버넌스/Agent/의사결정/조직지능 판정=Part042/054/055/062 정본(재판정 금지). 형식 Cognitive/Strategic Planning/Monte Carlo 엔진 이식 금지(기존 조합 확장).

---

## 7. Completion Criteria

- [x] 의사결정/추론 스택 **실측**(형식 Cognitive Architecture/Strategic Planning/Multi-Obj 엔진/Monte Carlo 부재·`Decisioning`/`AutoRecommend`·`Mmm` frontier·`RuleEngine`+`callClaudeTools` hybrid·`PriceOpt` 시뮬 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 Cognitive/Strategic Planning 엔진 부재 증명·의사결정/hybrid reasoning 실재·Part042/054/055/062 중복)
- [x] 실 의사결정(Decisioning+Mmm+RuleEngine+callClaudeTools+PriceOpt) 성문화(§4)
- [x] ★근거/신뢰도·Hybrid Reasoning·정직 미산출(Mmm/PriceOpt)·Human Oversight(V5 Safety Rule)·★★오흡수 차단(규칙+LLM≠Cognitive·Mmm≠Strategic Planning·what-if≠Monte Carlo) 명시
- [x] 의도적 미적용 + 사유(§5) — Cognitive Architecture 엔진/Strategic Planning Intelligence/Multi-Obj 엔진/Monte Carlo/Goal Hierarchy(+Part042/054/055/062 중복)
- [x] Claude Code 규칙(§6) · `Decisioning`·`Mmm`·`RuleEngine`·`callClaudeTools`·`PriceOpt` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part042/054/055/062 중복 + 의사결정/추론 substrate**(`Decisioning`/
> `AutoRecommend` Decision Intelligence + `RuleEngine`+`callClaudeTools`+`graph_node`+통계 Hybrid Reasoning +
> `Mmm` 다목적 최적화 + `PriceOpt` Decision Simulation)의 성문화이지 형식 Cognitive Architecture/Strategic
> Planning/Monte Carlo 엔진 이식이 아니다. ★★**정직 미산출**(Mmm optimized:false·PriceOpt null/422). ★★**오흡수
> 차단**: **규칙+LLM 추론은 Cognitive Architecture 가 아니고, `Mmm`은 Strategic Planning Intelligence 가 아니며,
> what-if 는 Monte Carlo 가 아니다**. 거버넌스/Agent/의사결정/조직지능=Part042/054/055/062 정본(재판정 금지).

---

## 다음 Part

**CCIS Part068 — Enterprise Digital Immune System (DIS), Secure SDLC Automation, Software Supply Chain Security & Trusted Delivery** — ★사전 실측 예고: ★**Part014(테스트)·015(CI/CD)·040(SecOps)·059(플랫폼)·063(컴플라이언스)와 중복** — 형식 DIS·SBOM·SLSA·Software Supply Chain Security(Sigstore)는 **부재**이나, Secure SDLC 실체는 **pre-commit 게이트(자격증명 스캔·i18n sacred SHA)·PHPStan(290차)·CHANGE_GATE·CI/CD(deploy.yml)·SSRF 가드·writeGuard·`SecurityAudit`·E2E 스모크(266차)**로 부분 실재. Part068 도 실측→DIS/SBOM/SLSA/Sigstore 부재증명→pre-commit+PHPStan+CHANGE_GATE+CI 성문화. ★Part014/015/040/059/063 중복·단일 모놀리스·"pre-commit=dev-time 통제" 승계.
