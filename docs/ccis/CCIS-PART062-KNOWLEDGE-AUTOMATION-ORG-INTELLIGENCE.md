# GeniegoROI Claude Code Implementation Specification

# CCIS Part062 — Enterprise Knowledge Automation, Organizational Intelligence, Collective Memory & Continuous Learning Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Knowledge Automation·Organizational Intelligence·Collective Memory·Continuous Learning 표준을 수립한다.

> ★**성격(★Part029/034/043/054 중복 — 지식 SSOT+자동화 실재·형식 조직지능/Collective Memory/Continuous
> Learning 부재)**: 본 Part 는 **CCIS Part029(검색/RAG)·034(데이터 거버넌스)·043(지식그래프)·054(Agent
> Memory)와 중복**되며 그 판정을 승계한다. 명세가 다루는 **형식 Organizational Intelligence 플랫폼·Enterprise
> Collective Memory·형식 Enterprise Memory Graph·Continuous Learning 루프(자체 학습)·Enterprise Learning
> Loop·Knowledge Refinement 엔진·Organizational Reasoning(multi-step)**은 **부재/부분**한다(grep 0). ★**실재
> 축(지식 SSOT + 자동화)**: **`GeniegoKnowledge`/`GeniegoGlossary`**(지식/용어 SSOT·챗봇 주입·임의변경 금지·
> Part029/034)·**`gen_chatbot_knowledge.mjs`**(**Knowledge Automation**·270차·**"신규=라우트 추가로 챗봇 자동
> 인지"**·매 배포 재생성)·**챗봇 Retriever `geniegoFeatureDetails`**(어휘 검색/추천·min-score 게이트·Part029)·
> **`graph_node`/`GraphScore` KG**(Memory Graph 대응·Part043)·**`NEXT_SESSION`/docs**(조직 기억·lessons
> learned·세션 로그)·**`SecurityAudit`**(historical decisions) 는 실재한다. ★★**핵심 = Continuous Learning
> 정직**: **자체 ML 학습이 없어(Part027) 런타임 learning loop 부재** — 지식은 **빌드타임 재생성**(`gen_chatbot_
> knowledge.mjs`)이지 런타임 학습이 아니다. ★★**오흡수 차단**: **`graph_node`(도메인 어트리뷰션 그래프)≠
> Enterprise Memory Graph(조직 지식 그래프)** · **`NEXT_SESSION`/docs(사람 기록)≠AI Collective Memory(자동
> 축적)** · **챗봇 Retriever(어휘)≠Organizational Reasoning(multi-step)** · **빌드 재생성≠Continuous Learning
> loop**. Part001 §4 에 따라 실측 → Collective Memory/Continuous Learning/Memory Graph 부재증명 →
> GeniegoKnowledge+gen_chatbot_knowledge+graph_node 성문화했다. ★정본=**Part029/034/043/054·Part027(자체 학습
> 부재)** 승계·Vector 보류(표본 0)·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 지식 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Org Intelligence Architecture | Systems→Collection→Graph→Learning→Intel→Agents | **부분(대응물)** — 라우트→`gen_chatbot_knowledge.mjs`→지식 JSON→Retriever→챗봇/AI. Learning Engine 계층 아님 |
| Knowledge Automation | Extraction/Structuring/Classification/Publishing | ★**실재** — `gen_chatbot_knowledge.mjs`(i18n 네임스페이스→기능맵·**라우트 추가 자동 인지**·매 배포 재생성) |
| Organizational Intelligence | Insight/Best Practice/Decision Support | **부분(대응물)** — `AutoRecommend`/`Decisioning`·`Insights`·`Mmm`. 형식 조직 인사이트 부분 |
| Enterprise Collective Memory | Experience/Historical Decisions/Lessons | **부분(사람 기록)** — `NEXT_SESSION`/docs(lessons learned)·`SecurityAudit`(결정 이력). ★**AI 자동 축적 아님** |
| Enterprise Memory Graph | Entity/Semantic Link/Cross-Domain | **부분(대응물)** — `graph_node`/`GraphScore`(KG·Part043)·`EventNorm`(엔티티). ★**도메인 어트리뷰션 그래프이지 조직 지식 그래프 아님** |
| Organizational Reasoning | Evidence/Multi-Step/Explanation/Validation | **부분** — LLM 추론(`callClaudeTools`)·근거/신뢰도(V4)·V3 Trust. 형식 multi-step reasoning 부분 |
| Knowledge Refinement | Duplicate/Improvement/AI Review/Human Validation | **부분** — min-score 게이트(Retriever·허위 근거 방지)·`GeniegoGlossary` SSOT. 형식 refine 엔진 부분 |
| Continuous Learning | Feedback/Operational/AI Learning/Update | **부재(구조적)** — ★**자체 ML 학습 없음(Part027)** → 런타임 learning loop 없음. 지식=빌드타임 재생성 |
| Enterprise Learning Loop | Event→Analysis→Learning→Update | **부재(대응물 아님)** — 이벤트→지식 자동 변환 루프 없음. `AbTesting`/`Mmm`(최적화)은 학습 아님 |
| Knowledge Validation | Expert/AI/Policy/Evidence | ★**부분 준수** — min-score 게이트·`action_request`(승인)·V3 Trust·`GeniegoGlossary` 정본 |
| Knowledge Versioning | History/Rollback/Change Review | **부분** — git(지식 원본/docs)·`gen_chatbot_knowledge.mjs` 재생성. 형식 Knowledge Version 부분 |
| Knowledge Governance | Policy/Ownership/Approval/Lifecycle | ★**대응물** — DATA 헌법·`GeniegoGlossary`(임의변경 금지)·`action_request`·`CHANGE_GATE` |
| Knowledge Analytics | Usage/Search Trend/Effectiveness | **부분** — `ai_call_log`·Retriever 결과. 형식 지식 분석 부분 |
| Knowledge Recommendation | Context/AI Suggestion/Related/Best Practice | ★**대응물** — 챗봇 Retriever(어휘·근거)·`AutoRecommend`. 형식 knowledge rec 부분 |
| Organizational KPI Learning | KPI Trend/Benchmark/Improvement | **부분** — `Pnl`/`Mmm`/rollup·`AutoRecommend`. 형식 KPI 학습 부분 |
| Monitoring | Knowledge Growth/Validation/Rec Accuracy | **부분** — 지식 JSON 크기·`ai_call_log`·`SystemMetrics` |
| Logging | Knowledge/Version/Validation ID | **부분** — git·`SecurityAudit`. Knowledge/Version ID 부분 |
| Security(RBAC/Knowledge Encrypt/격리) | 지식 보호 | ★**준수** — RBAC·테넌트 격리·PII 미저장. 지식=공용 기능문서(암호화 대상 아님) |
| Compliance(ISO 30401 KM/42001) | 지식관리 표준 | **부분** — DATA 헌법·`SecurityAudit`. 형식 인증 아님 |
| Disaster Recovery | Knowledge/Graph/Learning 복구 | **부분** — git(지식/docs)·DB 백업(`graph_node`)·재생성 |
| Performance(Graph/Rec Cache/Incremental Learning) | 지식 성능 | **부분** — 정적 지식 JSON·인덱스. Incremental Learning 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Learn Continuously/Knowledge First/Evidence Based/Explainable/Human Verified/Tenant Isolated/Auditable/Governance) | **부분(지식 SSOT축)** | ★Knowledge First(SSOT)·Evidence Based(근거)·Explainable(Citation)·Human Verified(승인)·Tenant Isolated·Governance(헌법). Learn Continuously 부재 |
| §4 Org Intelligence Architecture | **부분(대응물)** | 라우트→자동생성→Retriever. Learning Engine 아님 |
| §5 Knowledge Automation | **★실재** | `gen_chatbot_knowledge.mjs`(라우트 추가 자동 인지) |
| §6 Organizational Intelligence | **부분(대응물)** | `AutoRecommend`/`Decisioning`·`Insights` |
| §7 Collective Memory | **부분(사람 기록)** | `NEXT_SESSION`/docs·`SecurityAudit`. AI 자동 축적 아님 |
| §8 Enterprise Memory Graph | **부분(대응물)** | `graph_node`(도메인 어트리뷰션·Part043). 조직 지식 그래프 아님 |
| §9 Organizational Reasoning | **부분** | LLM 추론·근거·V3 Trust |
| §10 Knowledge Refinement | **부분** | min-score 게이트·`GeniegoGlossary` |
| §11 Continuous Learning | **부재(구조적)** | ★자체 학습 없음(Part027)·빌드타임 재생성 |
| §12 Enterprise Learning Loop | **부재** | 이벤트→지식 루프 없음 |
| §13 Knowledge Validation | **부분 준수** | min-score·`action_request`·V3 Trust |
| §14 Knowledge Versioning | **부분** | git·재생성. 형식 Version 부분 |
| §15 Knowledge Governance | **★대응물** | DATA 헌법·`GeniegoGlossary`·`CHANGE_GATE` |
| §16 Knowledge Analytics | **부분** | `ai_call_log`·Retriever |
| §17 Knowledge Recommendation | **★대응물** | Retriever(근거)·`AutoRecommend` |
| §18 Organizational KPI Learning | **부분** | `Pnl`/`Mmm`/rollup |
| §19 Monitoring | **부분** | 지식 JSON·`ai_call_log`·`SystemMetrics` |
| §20 Logging | **부분** | git·`SecurityAudit` |
| §21 Security | **★준수** | RBAC·테넌트 격리·PII 미저장 |
| §22 Compliance | **부분** | DATA 헌법·`SecurityAudit` |
| §23 Disaster Recovery | **부분** | git·DB 백업·재생성 |
| §24 Performance | **부분** | 정적 JSON·인덱스 |
| §25~§26 PHP/Claude(Knowledge/Learning Engine/Memory Graph/Recommendation Service) | **부분** | ★`GeniegoKnowledge`·`gen_chatbot_knowledge.mjs`·Retriever·`graph_node`. Learning Engine/형식 Memory Graph/Vector 부재 |
| §27~§28 검증(knowledge:health/graph:status/learning:validate) | **대상 없음** | artisan 없음. `gen_chatbot_knowledge.mjs`·Retriever·`graph` API 로 대체 |

---

## 4. 확립된 표준 (신규 지식 코드가 따를 정본)

- ★**지식 정본 = `GeniegoKnowledge`/`GeniegoGlossary`**(지식/용어 SSOT·챗봇 주입·임의변경 금지·Part029/034). 신규 지식은 이 SSOT 확장(중복 지식베이스 금지).
- ★★**Knowledge Automation 정본 = `gen_chatbot_knowledge.mjs`**(270차·i18n 네임스페이스→기능맵·매 배포 재생성). ★**"신규=라우트 추가로 챗봇 자동 인지"**(문화자산)·**하드코딩 지식 금지**·KNOWLEDGE_SOURCE 단일화.
- ★**검색/추천 = 챗봇 Retriever `geniegoFeatureDetails`**(어휘·min-score 게이트≥5). ★**근거 없으면 빈 결과·지어내지 않는다**(허위 근거 방지·Explainable·Part029). 중복 Retriever 금지.
- ★**KG = `graph_node`/`GraphScore`**(Part043). ★★**오흡수 금지**: **도메인 어트리뷰션 그래프이지 Enterprise Memory Graph(조직 지식 그래프)가 아니다**. 중복 KG 금지.
- ★★**Continuous Learning 정직**: ★**자체 ML 학습 없음(Part027) → 런타임 learning loop 신설 금지**. 지식은 빌드타임 재생성이지 런타임 학습 아님. Vector 지식=보류(표본 0·Part029). "학습"=최적화(`Mmm`)·A/B(`AbTesting`)이지 ML 학습 아님.
- ★**Collective Memory 정직**: `NEXT_SESSION`/docs(사람 기록·lessons learned)·`SecurityAudit`(결정 이력)가 조직 기억이지 **AI 자동 축적 Collective Memory 아님**. 세션 로그는 사람이 유지(B3 500KB 상한·초과 시 아카이브).
- ★**거버넌스·정직**: 지식 검증=min-score·`action_request` 승인·V3 Trust·`GeniegoGlossary` 정본. 근거없는 AI 추천 금지·테넌트 격리·PII 미저장.
- ★★**Part029/034/043/054 중복·재판정 금지**: 검색/RAG=Part029·거버넌스=Part034·KG=Part043·Agent Memory=Part054 정본. 본 Part 는 Knowledge Automation/Collective Memory 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 다중 Part 중복 + Continuous Learning 구조적 부재)

1. **Continuous Learning(런타임 학습 루프)·Enterprise Learning Loop** — 안 함. ★**자체 ML 학습 없음(Part027)** → 런타임 learning loop 대상 자체 없음(구조적). 지식=빌드타임 재생성(`gen_chatbot_knowledge.mjs`). Vector 지식=보류(표본 0).
2. **형식 Enterprise Collective Memory(AI 자동 축적)** — 부분. `NEXT_SESSION`/docs(사람 기록)·`SecurityAudit`(결정 이력)이 대응물. AI 자동 축적 아님.
3. **형식 Enterprise Memory Graph(조직 지식 그래프)** — 부분. `graph_node`(도메인 어트리뷰션·Part043)이 대응물이지 조직 지식 그래프 아님(오흡수 금지).
4. **형식 Organizational Reasoning(multi-step)·Knowledge Refinement 엔진** — 부분. LLM 추론·min-score 게이트·`GeniegoGlossary` SSOT. 형식 엔진 부재.
5. **Part029/034/043/054 와 중복되는 검색/거버넌스/KG/Agent Memory** — 각 Part 정본(재판정 금지). 본 Part 는 Knowledge Automation/Collective Memory 관점만.
6. **artisan `knowledge:*`/`graph:status`/`learning:validate` 명령** — 없음(Slim). `gen_chatbot_knowledge.mjs`·Retriever·`graph` API 로 대체.

★**준수하는 실 원칙**: **지식 SSOT(GeniegoKnowledge/Glossary·임의변경 금지)·Knowledge Automation(gen_chatbot_knowledge·라우트 추가 자동 인지)·어휘 Retriever(min-score·근거 없으면 빈 결과)·KG(graph_node)·조직 기억(NEXT_SESSION/docs·SecurityAudit)·거버넌스(헌법/CHANGE_GATE)·테넌트 격리·PII 미저장·정직 미산출**. ★**오흡수 차단**: graph_node≠Memory Graph·docs≠AI Collective Memory·빌드 재생성≠Continuous Learning. ★**Part029/034/043/054 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. 지식=`GeniegoKnowledge`/`GeniegoGlossary` SSOT 확장(중복 금지·임의변경 금지). ★자동화=`gen_chatbot_knowledge.mjs`(라우트 추가 자동 인지·하드코딩 지식 금지).
2. 검색/추천=Retriever(어휘·min-score·근거 없으면 빈 결과). KG=`graph_node`(중복 금지). ★도메인 그래프≠Enterprise Memory Graph.
3. ★★Continuous Learning(런타임 학습 루프) 신설 금지 — 자체 ML 학습 없음(Part027)·빌드타임 재생성·Vector 보류(표본 0).
4. ★★오흡수 금지: `graph_node`(도메인 그래프)·`NEXT_SESSION`/docs(사람 기록)·빌드 재생성을 Enterprise Memory Graph/AI Collective Memory/Continuous Learning 으로 표기하지 않는다.
5. 지식 검증=min-score·`action_request`·V3 Trust·`GeniegoGlossary` 정본. 근거없는 AI 추천 금지·테넌트 격리·PII 미저장.
6. ★★검색/거버넌스/KG/Agent Memory 판정=Part029/034/043/054 정본(재판정 금지). 형식 조직지능/Collective Memory/Vector 지식 이식 금지.

---

## 7. Completion Criteria

- [x] 지식 스택 **실측**(형식 조직지능/Collective Memory/Memory Graph/Continuous Learning/Learning Loop 부재·`GeniegoKnowledge`/`Glossary` SSOT·`gen_chatbot_knowledge.mjs`·Retriever·`graph_node`·`NEXT_SESSION`/docs 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(Continuous Learning **구조적 부재**(자체 학습 없음·Part027)·지식 SSOT+자동화 실재·Part029/034/043/054 중복)
- [x] 실 지식(GeniegoKnowledge+gen_chatbot_knowledge+Retriever+graph_node+docs) 성문화(§4)
- [x] ★Knowledge Automation(라우트 추가 자동 인지)·지식 SSOT·min-score Retriever·★★오흡수 차단(graph_node≠Memory Graph·docs≠Collective Memory·빌드 재생성≠Continuous Learning) 명시
- [x] 의도적 미적용 + 사유(§5) — Continuous Learning/Learning Loop/Collective Memory/Memory Graph/Organizational Reasoning(+Part029/034/043/054 중복)
- [x] Claude Code 규칙(§6) · `GeniegoKnowledge`·`gen_chatbot_knowledge.mjs`·Retriever·`graph_node` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **지식 SSOT + Knowledge Automation**(`GeniegoKnowledge`/`Glossary` +
> `gen_chatbot_knowledge.mjs` "라우트 추가 자동 인지" + 어휘 Retriever + `graph_node` KG + `NEXT_SESSION`/docs
> 조직 기억)의 성문화이지 형식 조직지능/Collective Memory/Continuous Learning 이식이 아니다. ★★**Continuous
> Learning 구조적 부재**: **자체 ML 학습이 없어(Part027) 런타임 learning loop 대상 자체가 없다**(빌드타임 재생성).
> ★★**오흡수 차단**: **`graph_node`는 Enterprise Memory Graph 가 아니고, `NEXT_SESSION`/docs 는 AI Collective
> Memory 가 아니며, 빌드 재생성은 Continuous Learning 이 아니다**. Part029/034/043/054 정본(재판정 금지).

---

## 다음 Part

**CCIS Part063 — Enterprise Autonomous Compliance, Continuous Controls Monitoring (CCM), Policy Intelligence & Regulatory Automation** — ★사전 실측 예고: ★**Part012/034/040/058과 중복** — 형식 CCM 도구(Vanta/Drata)·Regulatory Intelligence·형식 Policy Engine 은 **부재**이나, 컴플라이언스 실체는 **`Compliance`(SOC2/ISO 준비도 대시보드·실측 introspection)·`SecurityAudit`(불변 증적)·`Dsar`/`GdprConsent`(GDPR/PIPA)·`CHANGE_GATE`(정책 게이트)·pre-commit 게이트(자격증명 스캔)·PHPStan·writeGuard·V5 Safety Rule**로 부분 실재. Part063 도 실측→Vanta/Drata/Regulatory Intelligence 부재증명→Compliance 준비도+SecurityAudit+CHANGE_GATE 성문화. ★Part040 "준비도≠실제 인증·날조 금지"·Part012/034/058 중복 명시.
