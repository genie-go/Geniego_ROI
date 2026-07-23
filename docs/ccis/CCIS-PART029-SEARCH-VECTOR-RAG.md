# GeniegoROI Claude Code Implementation Specification

# CCIS Part029 — Search Engine, Full-Text Search, Vector Search & Knowledge Retrieval Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Search Engine·Full-Text Search·Vector Search·Knowledge Retrieval 표준을 수립한다.

> ★**성격(약한 스택 — 검색엔진·Vector DB 부재·어휘 검색만)**: 이 저장소는 **전용 검색엔진·벡터DB를 운영하지
> 않는다**. 명세가 요구하는 **Elasticsearch/OpenSearch/Meilisearch·Vector DB(pgvector/Qdrant/Pinecone/
> Milvus)·MySQL FULLTEXT(MATCH…AGAINST)·Embedding Index·Semantic Search**는 **부재**한다(grep 0·
> 289차후속 Vector DB 보류=표본 0). 검색·검색증강 실체는 **① RAG Retriever `geniegoFeatureDetails`**
> (ClaudeAI.php — **어휘 토큰 스코어링** BM25-lite·min-score 게이트≥5·Citation 출처) + **② 지식베이스**
> (`GeniegoKnowledge`(KO SSOT)·`GeniegoGlossary`·`gen_chatbot_knowledge.mjs`(270차 파이프라인)→
> `chatbot_feature_details.json`) + **③ Knowledge Graph `graph_node`**(node_type/node_id·테넌트격리) +
> **④ 프론트 상품/데이터 검색**(MySQL `LIKE`)로 실재한다. Part001 §4 에 따라 실측 → 검색엔진/Vector DB
> 부재증명 → 실 검색·RAG 스택 성문화했다. ★**핵심 문화자산(MEA 055 D-1/D-3)**: Retriever 는 **강한 단서
> 없으면(점수<5) 근거를 지어내지 않고 빈 결과 반환**한다("반품 포털" 질의에 옴니채널·P&L 오출처 방지) —
> **정직 미산출**. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 검색·RAG 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Search Engine | ES/OpenSearch/Meilisearch | **부재**. 프론트 상품/데이터 검색=MySQL `LIKE`·인덱스 컬럼 |
| Search Gateway | Query 진입점/라우팅 | **부분(대응물)** — 챗봇 질의 진입=`ClaudeAI` 핸들러. 형식 Search Gateway 계층 아님 |
| Full-Text Search | Tokenize/Stem/Synonym/Fuzzy | **부재(어휘만)** — MySQL FULLTEXT/MATCH…AGAINST 없음(grep 0). `LIKE` + Retriever 토큰 부분일치 |
| Analyzer(다국어) | Korean/EN/JA/ZH 분석기 | **부분** — Retriever가 15개 로케일 기능명 토큰 매칭. 형식 언어별 Analyzer 아님 |
| Index Design | 검색/저장 필드 분리 | **부분** — `chatbot_feature_details.json`(names/paths/match/title 필드)·DB 인덱스 컬럼 |
| Incremental Indexing | CDC/Event/Queue 색인 | **부분(빌드타임)** — `gen_chatbot_knowledge.mjs`(deploy.ps1)가 지식 JSON 재생성. 런타임 증분 아님 |
| Search Query(Keyword/Phrase/Prefix/Bool) | Query Builder 분리 | **부분** — `LIKE`·Retriever 스코어링. 형식 Query Builder 없음 |
| Ranking(TF-IDF/BM25/Freshness) | 랭킹 개선 | ★**대응물** — Retriever 가중 스코어(기능명 완전일치+6/토큰일치+5/경로+4/변별어휘+2)·**df 로 흔한어휘 제거**(BM25 유사) |
| Re-ranking(LLM) | AI 재정렬 | **대응물** — 상위 topN 근거를 LLM(`ClaudeAI::complete`)이 소비·답변 생성(형식 re-ranker 아님) |
| Vector Search | pgvector/Qdrant/Pinecone/Milvus | **부재**(289차후속 보류=표본 0). Embedding 자체 없음 |
| Embedding Index | Vector/Model Version/Source | **부재**. 어휘 검색이라 임베딩 인덱스 대상 없음 |
| Hybrid Search | Keyword+Vector 병합 | **부재**. Vector 축 없음 → 어휘 단일 |
| Semantic Search | 자연어 의미검색 | **부재(어휘만)** — 문자열/토큰 매칭. MEA 055 weak(의미검색 없음이 정직한 약점) |
| Knowledge Retrieval | 문서/FAQ/정책/KB | ★**실재** — `GeniegoKnowledge`(발급/메뉴 가이드)·`GeniegoGlossary`·`chatbot_feature_details.json` |
| Query Expansion | Synonym/Related/AI | **부분** — 토큰 부분일치·15로케일 기능명. 형식 synonym 확장 없음 |
| Search Cache | Popular/Result TTL | **부분** — 정적 지식 JSON(빌드산출)·HTTP 캐시(Part017). 검색결과 캐시 계층 아님 |
| Suggestion(Autocomplete) | 자동완성/검색이력 | **부분(프론트)** — UI 필터/자동완성. 형식 suggest 엔진 아님 |
| Search Analytics | Count/CTR/Zero Result | **부재/부분** — 형식 검색 분석 파이프라인 없음. Zero-result=Retriever 빈결과(정직) |
| Monitoring | Latency/Index/Cache Hit | **부분** — `SystemMetrics`·error_log. 검색 전용 지표 부재 |
| Security(RBAC/Tenant Filter) | 테넌트 격리 | ★**준수** — `graph_node` tenant_id 격리·프론트 검색 API 테넌트 스코프. **지식베이스=공용 기능문서**(테넌트 데이터 아님·누출 무관) |
| Logging(Trace ID/마스킹) | 검색 로그 | **부분** — error_log·`ai_call_log`(RAG 소비). Trace ID 부재(Part023) |
| Disaster Recovery | Snapshot/Replica/Restore | **부분** — 지식 JSON=git+빌드 재생성·DB 백업(Part015). 검색 클러스터 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Search First/Retrieval Before Gen/Relevance/Hybrid/Incremental/Explainable) | **부분 준수** | ★Retrieval Before Generation(RAG)·Explainable Retrieval(Citation 출처·점수). Hybrid/Vector 부재 |
| §4 Search Architecture | **부분(대응물)** | 챗봇 질의→Retriever→LLM. 형식 Search Gateway→Engine→Index 계층 아님 |
| §5 Search Gateway | **부분** | `ClaudeAI` 핸들러가 질의 진입. 라우팅/캐시/모니터 형식 계층 아님 |
| §6 Search Engine | **부재** | ES/OpenSearch/Meilisearch 없음. MySQL `LIKE`+Retriever |
| §7~§8 Full-Text/Analyzer | **부재(어휘만)** | FULLTEXT/MATCH…AGAINST 없음. Retriever 토큰 부분일치·15로케일 |
| §9 Index Design | **부분** | `chatbot_feature_details.json` 필드(names/paths/match/title). 형식 검색 인덱스 아님 |
| §10 Incremental Indexing | **부분(빌드타임)** | `gen_chatbot_knowledge.mjs`(deploy.ps1) 재생성. 런타임 CDC/Queue 색인 아님 |
| §11 Search Query | **부분** | `LIKE`·Retriever 스코어링. Query Builder 분리 없음 |
| §12 Ranking | **★대응물** | Retriever 가중 스코어(완전일치+6/토큰+5/경로+4/어휘+2)·**df 흔한어휘 제거**(BM25 유사) |
| §13 Re-ranking | **대응물** | 상위 topN 근거를 LLM 소비. 형식 LLM re-ranker 아님 |
| §14~§16 Vector/Embedding/Hybrid | **부재** | Embedding·Vector DB 없음(289차후속 보류=표본 0). Hybrid 불가(Vector 축 없음) |
| §17 Semantic Search | **부재(어휘만)** | 토큰/문자열 매칭. 의미검색 없음(MEA 055 weak — 정직한 약점) |
| §18 Knowledge Retrieval | **★실재** | `GeniegoKnowledge`(발급/메뉴)·`GeniegoGlossary`·`chatbot_feature_details.json`·`graph_node` KG |
| §19 Query Expansion | **부분** | 토큰 부분일치·15로케일 기능명. synonym/AI 확장 형식 아님 |
| §20~§21 Cache/Suggestion | **부분** | 정적 지식 JSON·HTTP 캐시·프론트 자동완성. suggest 엔진 아님 |
| §22 Search Analytics | **부재/부분** | 형식 CTR/Zero-result 분석 없음. Zero-result=Retriever 빈결과(정직) |
| §23 Monitoring | **부분** | `SystemMetrics`·error_log. 검색 전용 지표 부재 |
| §24 Security | **★준수** | `graph_node` tenant 격리·검색 API 테넌트 스코프. 지식베이스=공용 문서(누출 무관) |
| §25 Logging | **부분** | error_log·`ai_call_log`. Trace ID/마스킹 부분 |
| §26 Disaster Recovery | **부분** | 지식 JSON=git+빌드·DB 백업. 검색 클러스터 없음 |
| §27~§28 PHP/Claude(Gateway/ES Client/pgvector/Queue Indexing/Adapter) | **부분** | Retriever·지식 SSOT·테넌트 격리·정직 미산출. ES/pgvector Client·Queue 색인 부재 |
| §29~§30 검증(artisan search:health 등) | **대상 없음** | artisan 없음. `gen_chatbot_knowledge.mjs`·Retriever·`graph` API 로 대체 |

---

## 4. 확립된 표준 (신규 검색·RAG 코드가 따를 정본)

- ★**RAG Retriever 정본 = `geniegoFeatureDetails`**(ClaudeAI.php·어휘 토큰 스코어링). 신규 지식 검색은 이 Retriever 확장(중복 Retriever 신설 금지·헌법 V4 Retriever 일원화). **min-score 게이트≥5 유지**(약한 단서만으로 근거 승격 금지).
- ★**정직 미산출(핵심 문화자산·MEA 055 D-1/D-3)**: 강한 단서 없으면 **빈 결과 반환·지어내지 않는다**. 모델은 일반지식으로 답하되 **허위 출처 금지**. Citation 출처는 프롬프트 투입분과 **동일 선별 결과**(불일치 방지).
- ★**KNOWLEDGE_SOURCE 정본 = `gen_chatbot_knowledge.mjs`**(270차 파이프라인)→`chatbot_feature_details.json`. 지식 원본=프론트 데이터(`issuanceGuide.js`·`guideSpecs.js`)·`GeniegoKnowledge`(KO SSOT)·`GeniegoGlossary`. ★**신규 기능=라우트 추가만으로 챗봇 자동 인지**(임의 지식 하드코딩 금지).
- ★**KG 정본 = `graph_node`**(node_type/node_id·테넌트격리). 신규 그래프 노드는 이 스키마 확장.
- ★**Ranking**: 가중 스코어(완전일치>토큰일치>경로>변별어휘)·**df 로 흔한어휘 제거**. 압도적 1위 있으면 잡음 후보(상위 40% 미만) 제외.
- ★**테넌트 격리**: 검색 대상이 테넌트 데이터면 `tenant_id` 격리(위조 불가 권위 tenant). 지식베이스는 공용 기능문서(테넌트 데이터 아님).
- ★**Explainable Retrieval**: 근거/출처/점수 표시(V4 헌법). 근거없는 결론 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **전용 검색엔진(Elasticsearch/OpenSearch/Meilisearch)** — 안 함. 검색 규모가 전용 클러스터를 요구하지 않는다(MySQL `LIKE`+Retriever 충분). 도입=인프라·색인 파이프라인 선행.
2. **Vector DB(pgvector/Qdrant/Pinecone/Milvus)·Embedding Index·Semantic/Hybrid Search** — 안 함. **289차후속 Vector DB 보류(표본 0 → 검증 불가)**. Embedding 축이 없어 의미검색 부재(MEA 055 weak — 정직한 약점).
3. **MySQL FULLTEXT(MATCH…AGAINST)** — 안 함. 어휘 검색은 `LIKE`+Retriever 스코어링. FULLTEXT 인덱스 미도입.
4. **런타임 Incremental Indexing(CDC/Queue 색인)** — 안 함. 지식 JSON=빌드타임 재생성(`gen_chatbot_knowledge.mjs`). 검색 대상이 빌드 산출물이라 런타임 색인 불필요.
5. **형식 Search Analytics(CTR/Zero-result 대시보드)·Suggest 엔진·검색결과 캐시 계층** — 안 함/부분. Zero-result=Retriever 빈결과(정직)·프론트 자동완성.
6. **artisan `search:*`/`vector:*` 명령** — 없음(Slim). `gen_chatbot_knowledge.mjs`·Retriever·`graph` API 로 대체.

★**준수하는 실 원칙**: **Retrieval Before Generation(RAG)·정직 미산출(허위 출처 금지·min-score 게이트)·Explainable Retrieval(출처/점수)·KNOWLEDGE_SOURCE 단일화(라우트 추가만으로 자동 인지)·Retriever 일원화(중복 금지)·가중 랭킹(df 제거)·테넌트 격리**.

---

## 6. Claude Code 구현 규칙

1. 지식 검색=`geniegoFeatureDetails` Retriever 확장(중복 Retriever 신설 금지·min-score 게이트≥5 유지).
2. ★**정직 미산출**: 강한 단서 없으면 빈 결과·허위 출처 금지. Citation 은 프롬프트 투입분과 동일 선별.
3. 지식 원본=`gen_chatbot_knowledge.mjs`→`chatbot_feature_details.json`·`GeniegoKnowledge`/`GeniegoGlossary`. ★**신규 기능=라우트 추가로 챗봇 자동 인지**(하드코딩 지식 금지).
4. KG=`graph_node`(node_type) 확장. 테넌트 데이터 검색은 `tenant_id` 격리.
5. ★**Explainable Retrieval**: 근거/출처/점수 표시. 근거없는 결론 금지.
6. Elasticsearch/OpenSearch/pgvector/Qdrant/Pinecone/Milvus/FULLTEXT 를 "명세에 있다"는 이유로 이식하지 않는다(규모/표본 부족·289차후속 Vector DB 보류). Vector/Semantic 도입은 **표본 확보 후** 재검토.

---

## 7. Completion Criteria

- [x] 검색·RAG 스택 **실측**(검색엔진/Vector DB/FULLTEXT/Embedding 부재·Retriever `geniegoFeatureDetails`·지식 SSOT·`graph_node` KG·MySQL LIKE)
- [x] 명세 §3~§30 **섹션별 매핑·판정**(ES/OpenSearch/Vector DB/Semantic/Hybrid 부재 증명)
- [x] 실 검색(어휘 Retriever+지식베이스+KG+가중 랭킹) 성문화(§4)
- [x] ★정직 미산출(min-score 게이트·허위 출처 금지)·Explainable Retrieval·KNOWLEDGE_SOURCE 단일화·Retriever 일원화·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — 검색엔진/Vector DB/Semantic/Hybrid/FULLTEXT/런타임 색인
- [x] Claude Code 규칙(§6) · `gen_chatbot_knowledge.mjs`·Retriever·`graph` API 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **전용 검색엔진·벡터DB를 운영하지 않는** 저장소의 실 검색·RAG
> 스택(어휘 토큰 스코어링 Retriever + 지식 SSOT + `graph_node` KG + MySQL LIKE)의 성문화이지 Elasticsearch/
> pgvector/Semantic Search 이식이 아니다. ★**핵심 문화자산(MEA 055)**: Retriever 는 강한 단서 없으면 근거를
> 지어내지 않고 **빈 결과+허위 출처 금지**(정직 미산출). Vector/Semantic 은 표본 확보 후 재검토.

---

## 다음 Part

**CCIS Part030 — Identity Management, IAM, SSO & Enterprise Access Control Standards** — ★사전 실측 예고: 형식 IdP·SAML 2.0·SCIM·LDAP/AD·PAM 은 **부분/부재**하나, 인증·접근제어 실체는 **`api_key`(SHA-256·RBAC viewer<connector<analyst<admin+scopes)·세션토큰(hash-only 게이트·289차후속)·`OAuth`·`EnterpriseAuth`(SSO group→role 부분배선·289차)·MFA·`SecurityAudit`·admin SSOT·writeGuard 서버전역**로 실재. Part030 도 실측→SAML/SCIM/LDAP/PAM 부재증명→api_key RBAC+세션+OAuth+EnterpriseAuth 성문화(IdP 프레임워크 이식 금지).
