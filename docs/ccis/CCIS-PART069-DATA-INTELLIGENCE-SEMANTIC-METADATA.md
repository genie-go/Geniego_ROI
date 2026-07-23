# GeniegoROI Claude Code Implementation Specification

# CCIS Part069 — Enterprise Autonomous Data Intelligence, Unified Semantic Data Layer, Active Metadata & AI-Native Data Platform Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Autonomous Data Intelligence·Unified Semantic Data Layer·Active Metadata·AI-Native Data Platform 표준을 수립한다.

> ★**성격(★데이터 계열 5개 Part 026/034/041/049/050 강한 중복 — 데이터 인텔리전스=핵심 경쟁력·형식 Active
> Metadata/AI-Native Platform 도구 부재)**: 본 Part 는 **CCIS Part026(DWH/BI)·034(데이터 거버넌스/MDM)·041(데이터
> 플랫폼)·049(MDM/품질)·050(Data Fabric)와 강하게 중복**되며 그 판정을 승계한다. 데이터 인텔리전스는 이
> 저장소의 **핵심 경쟁력**(DATA 헌법 Volume 1~5·V3 Trust)이나, **정책·품질·정규화 층위**가 강하고 **형식 Active
> Metadata/AI-Native Data Platform/Data Contracts/Data Observability 도구(Atlan/Monte Carlo/Great
> Expectations)**는 없다. 명세가 다루는 **형식 Active Metadata(자동 enrichment/tagging)·Data Contracts(schema
> contract)·Data Observability 도구(freshness/drift 모니터)·형식 Data Product Registry·Semantic Knowledge
> Layer(ontology)·Vector/Elasticsearch/Kafka**는 **부재/부분**한다(grep 0·289차후속 Vector 보류). ★**실재
> 축(데이터 substrate)**: **`EventNorm`/Unified Data Model**(Semantic/Canonical Layer)·**rollup 집계**(de-facto
> DWH·Part026)·**V3 Data Trust**(READY/WARNING/BLOCKED = Data Quality Intelligence·Data Observability 유사·
> 수집≠사용)·**출처 lineage**(Source/Credential/Sync/Quality/Trust = Data Lineage)·**`DataPlatform`**(Data
> Source Registry ~ Data Product)·**`GeniegoGlossary`**(Business Glossary)·**cron sync**(ETL·synced_at 증분)·
> **챗봇 Retriever**(Data Discovery·어휘) 는 실재한다. ★★**핵심(MEA 065·헌법 V4 §16)**: **정규화·통합은 실재
> 하되 없는 것은 메타계층(Active Metadata/Data Fabric)** — **Intelligence Layer 는 하나**(별도 플랫폼 신설 금지·
> 기존 확장). Part001 §4 에 따라 실측 → Active Metadata/Data Contracts/Data Observability 도구 부재증명 →
> EventNorm+rollup+V3 Trust+lineage 성문화했다. ★정본=**Part026/034/041/049/050·MEA 065** 승계·"수집≠사용·채널
> 나열 금지·단일 Intelligence Layer"·재판정 금지. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 데이터 인텔리전스 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| AI-Native Data Platform Architecture | Sources→Metadata→Semantic→Intel→AI→Apps | **부분(대응물)** — Sources→cron sync→`EventNorm`→rollup→AI(챗봇/통계). 형식 Semantic/Metadata 계층 부분 |
| AI-Native Data Platform | Unified Access/AI Interface/Intelligent Query/Context | **부분** — rollup 통합·챗봇 Retriever(AI 인터페이스)·context. Intelligent Query(NL→SQL) 부분 |
| Active Metadata | Discovery/Enrichment/Automation/Versioning | **부분(수동)** — 출처 기록·`gen_chatbot_knowledge.mjs`(빌드타임 자동). ★**런타임 active metadata 아님** |
| Unified Semantic Data Layer | Glossary/Semantic Mapping/Entity/Context | ★**대응물** — `EventNorm`/Unified Data Model·`GeniegoGlossary`·`graph_node`(entity). ★**채널 나열 금지·표준 정규화** |
| Enterprise Data Intelligence | Recommendation/Context/Search/AI Discovery | **부분** — `AutoRecommend`·챗봇 Retriever(어휘)·`DataPlatform`. AI Discovery 부분 |
| Data Product | Ownership/SLA/Lifecycle/Usage | **부분(대응물)** — `DataPlatform` Data Source(source_type/owner=tenant/priority)·V3 Trust. 형식 Product 아님 |
| Data Contracts | Schema/API Contract/Validation/Compat | **부분(대응물)** — `Mapping`(필드매핑)·`EventNorm` 정규화·`/v{NNN}` 버전(하위호환). 형식 Data Contract 아님 |
| Semantic Knowledge Layer | Ontology/Taxonomy/Graph/Context | **부분(대응물)** — `GeniegoGlossary`(용어)·`graph_node`(KG·Part043). 형식 OWL Ontology 아님 |
| Data Lineage Intelligence | E2E Lineage/Impact/Transformation/Provenance | ★**실재(텍스트)** — 출처(Source/Credential/Sync/Quality/Trust)·`EventNorm` 정규화 추적. Impact Analysis 부분 |
| Data Observability | Freshness/Completeness/Accuracy/Drift | ★**대응물** — V3 Trust(Quality)·`AnomalyDetection`·`synced_at`(freshness)·`ModelMonitor`(drift). 형식 Observability 도구 아님 |
| Metadata Automation | Auto Classification/Tagging/Doc/Lineage | **부분(빌드타임)** — `gen_chatbot_knowledge.mjs`·출처 자동유도(channel_credential). 런타임 auto-tag 부분 |
| Data Catalog | Registry/Search/Ownership/Documentation | **부분(대응물)** — `DataPlatform` data_source·메트릭 카탈로그(Glossary). Collibra/Atlan 아님 |
| Data Quality Intelligence | Quality Score/Duplicate/Missing/Recommendation | ★**강함(핵심 경쟁력)** — **V3 Data Trust**(READY/WARNING/BLOCKED·Cross Validation)·`AnomalyDetection`·CRM dedup(Part049) |
| Data Discovery | Semantic/AI/Context/Cross-Domain Search | **부분(어휘)** — 챗봇 Retriever(어휘·Part029)·`DataPlatform`. 시맨틱/벡터 부재(289차후속 보류) |
| AI Data Governance | Data/Metadata/Access/Compliance Policy | ★**대응물** — DATA 헌법·V3 Trust·`Dsar`·RBAC·`SecurityAudit`(Part034) |
| Monitoring | Metadata Freshness/Quality/Lineage/AI Readiness | **부분** — V3 Trust 상태·`synced_at`·`SystemMetrics`(정직 null). Semantic Consistency 부분 |
| Logging | Dataset/Metadata/Lineage ID | **부분** — 출처 기록·`SecurityAudit`. Dataset/Trace ID 부분 |
| Security(RBAC/Metadata Encrypt/Classification/격리) | 데이터 보호 | ★**준수** — RBAC+Scope·Masking·**테넌트 격리 절대**·PII 미저장(집계 코호트) |
| Compliance(ISO 8000/11179) | 데이터 품질/메타 표준 | **부분** — DATA 헌법·V3 Trust·출처. 형식 ISO 8000/11179 인증 아님 |
| Disaster Recovery | Metadata/Catalog/Lineage/Semantic 복구 | **부분** — DB 백업·git(Glossary/헌법)·재수집(cron)·재생성(gen_chatbot) |
| Performance(Metadata/Semantic Index/Parallel) | 대규모 데이터 | **부분** — 인덱스·증분(synced_at)·HTTP 캐시. Semantic Index 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Data as a Product/Metadata First/Semantic by Design/AI Ready/Continuous Quality/Explainable/Tenant Isolation/Privacy by Design/Governance) | **★대체로 준수** | ★Metadata First(lineage)·Semantic by Design(`EventNorm`)·Continuous Quality(V3 Trust)·AI Ready·Tenant Isolation·Privacy(PII 미저장)·Governance(헌법). Data as a Product 부분 |
| §4 AI-Native Platform Architecture | **부분(대응물)** | cron→`EventNorm`→rollup→AI. 형식 Metadata/Semantic 계층 부분 |
| §5 AI-Native Data Platform | **부분** | rollup·챗봇 Retriever. Intelligent Query 부분 |
| §6 Active Metadata | **부분(수동/빌드타임)** | 출처 기록·`gen_chatbot_knowledge`. 런타임 active 아님 |
| §7 Unified Semantic Data Layer | **★대응물** | `EventNorm`·`GeniegoGlossary`·`graph_node`(채널 나열 금지) |
| §8 Enterprise Data Intelligence | **부분** | `AutoRecommend`·Retriever·`DataPlatform` |
| §9 Data Product | **부분(대응물)** | `DataPlatform` Data Source·V3 Trust |
| §10 Data Contracts | **부분(대응물)** | `Mapping`·`EventNorm`·`/v{NNN}` 버전 |
| §11 Semantic Knowledge Layer | **부분(대응물)** | `GeniegoGlossary`·`graph_node`. OWL 아님 |
| §12 Data Lineage Intelligence | **★실재(텍스트)** | 출처(Source/Credential/Sync/Quality/Trust)·`EventNorm` |
| §13 Data Observability | **★대응물** | V3 Trust·`AnomalyDetection`·`synced_at`·`ModelMonitor` |
| §14 Metadata Automation | **부분(빌드타임)** | `gen_chatbot_knowledge`·출처 자동유도 |
| §15 Data Catalog | **부분(대응물)** | `DataPlatform`·메트릭 카탈로그. Atlan 아님 |
| §16 Data Quality Intelligence | **★강함(핵심 경쟁력)** | V3 Data Trust(READY/WARNING/BLOCKED)·`AnomalyDetection`·CRM dedup |
| §17 Data Discovery | **부분(어휘)** | Retriever(어휘)·`DataPlatform`. 시맨틱/벡터 부재 |
| §18 AI Data Governance | **★대응물** | DATA 헌법·V3 Trust·`Dsar`·RBAC·`SecurityAudit` |
| §19 Monitoring | **부분** | V3 Trust·`synced_at`·`SystemMetrics`(null) |
| §20 Logging | **부분** | 출처 기록·`SecurityAudit` |
| §21 Security | **★준수** | RBAC+Scope·Masking·테넌트 격리·PII 미저장 |
| §22 Compliance | **부분** | DATA 헌법·V3 Trust. ISO 8000/11179 형식 아님 |
| §23 Disaster Recovery | **부분** | DB 백업·git·재수집·재생성 |
| §24 Performance | **부분** | 인덱스·증분·캐시 |
| §25~§26 PHP/Claude(Data Intelligence/Metadata/Semantic/Catalog/Governance Service·PG/Redis/ES/Vector/Kafka Adapter) | **부분** | ★`EventNorm`·rollup·V3 Trust·lineage·`DataPlatform`·`GeniegoGlossary`. Active Metadata/Data Contracts/Vector/ES/Kafka 부재 |
| §27~§28 검증(data:health/metadata:validate/lineage:analyze) | **대상 없음** | artisan 없음. `DataPlatform` API·V3 Trust·`make quality` 로 대체 |

---

## 4. 확립된 표준 (신규 데이터 인텔리전스 코드가 따를 정본)

- ★★**단일 Intelligence Layer(헌법 V4 §16·MEA 065)**: **Intelligence Layer 는 하나** → **별도 AI-Native Data Platform/Active Metadata/Data Fabric 신설 금지·기존 확장**. Semantic/Canonical=**`EventNorm`/Unified Data Model**(★**채널 나열 금지 → 표준 정규화**).
- ★**Data Quality Intelligence = V3 Data Trust**(READY/WARNING/BLOCKED·Cross Validation·핵심 경쟁력). ★**수집≠사용**(Fake/Bot/Spam/Fraud/Duplicate/Anomaly 검증 + Quality/Trust/Confidence 후에만 AI/자동화). 기존 `DataPlatform`/`AnomalyDetection` 확장(난립 금지).
- ★**Lineage/Observability = 출처 기록(Source/Credential/Sync/Quality/Trust)+`synced_at`(freshness)+`ModelMonitor`(drift)+`AnomalyDetection`**. 형식 Data Observability 도구 신설 금지(기존 확장).
- ★**Data Product/Catalog = `DataPlatform`(Data Source Registry)+`GeniegoGlossary`(용어)+메트릭 카탈로그**(Part034). 형식 Catalog(Atlan) 이식 금지.
- ★**Data Contract 대응 = `Mapping`(필드매핑)+`EventNorm` 정규화+`/v{NNN}` 버전(하위호환)**. schema 변경은 하위호환·검증(V3 Trust) 후.
- ★**Discovery = 챗봇 Retriever(어휘·min-score·Part029)**. ★**Vector/시맨틱 검색 보류**(289차후속·표본 0). 지식=`GeniegoKnowledge`.
- ★**거버넌스·정직**: DATA 헌법·`Dsar`(삭제vs익명화)·RBAC·테넌트 격리 절대·PII 미저장(집계 코호트)·정직 미산출(null+사유·SystemMetrics).
- ★★**오흡수 차단**: **rollup=집계이지 형식 DWH/Data Product 아님** · **출처 기록=텍스트 lineage이지 Active Metadata(런타임 auto-enrichment) 아님** · **`EventNorm`=정규화이지 형식 Semantic Knowledge Layer(OWL) 아님** · **V3 Trust(데이터 신뢰도)≠Data Observability 도구(Monte Carlo)**.
- ★★**데이터 계열 5개 Part 중복·재판정 금지**: DWH=Part026·거버넌스/MDM=Part034·데이터플랫폼=Part041·MDM/품질=Part049·Data Fabric=Part050 정본. 본 Part 는 Active Metadata/Data Contracts/Observability 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 데이터 계열 중복 + 형식 도구 부재)

1. **형식 Active Metadata(런타임 auto-enrichment/tagging)·AI-Native Data Platform 도구(Atlan)** — 안 함. 출처 기록·`gen_chatbot_knowledge`(빌드타임)·V3 Trust 가 대응물. ★**단일 Intelligence Layer**(별도 플랫폼 신설 금지·헌법 V4 §16).
2. **형식 Data Contracts(schema contract 엔진)·Data Observability 도구(Monte Carlo/Great Expectations)** — 안 함. `Mapping`/`EventNorm`/`/v{NNN}`·V3 Trust/`synced_at`/`ModelMonitor`가 대응물.
3. **Semantic Knowledge Layer(OWL Ontology)·Vector/Elasticsearch/Kafka** — 부분/부재. `GeniegoGlossary`/`graph_node`·MySQL·`omni_outbox`(Part041/043/050). Vector=289차후속 보류(표본 0).
4. **형식 Data Product Registry/SLA** — 부분. `DataPlatform` Data Source·V3 Trust 가 대응물.
5. **`rollup`/출처 기록/`EventNorm`/V3 Trust 를 형식 DWH/Active Metadata/Semantic Layer/Observability 도구로 오흡수 금지** — 집계/텍스트 lineage/정규화/데이터 신뢰도이지 형식 도구 아님.
6. **Part026/034/041/049/050 와 중복되는 DWH/거버넌스/플랫폼/MDM/Fabric** — 각 Part 정본(재판정 금지). 본 Part 는 Active Metadata/Data Contracts/Observability 관점만.
7. **artisan `data:*`/`metadata:validate`/`lineage:analyze` 명령** — 없음(Slim). `DataPlatform` API·V3 Trust·`make quality` 로 대체.

★**준수하는 실 원칙(강함)**: **단일 Intelligence Layer(헌법 V4 §16·별도 플랫폼 금지)·`EventNorm` Semantic/Canonical(채널 나열 금지)·V3 Trust(Data Quality·수집≠사용·핵심 경쟁력)·출처 lineage(Observability 대응)·`DataPlatform`/`GeniegoGlossary`(Catalog/Glossary)·rollup(통합 뷰)·테넌트 격리·PII 미저장·정직 미산출·중복 엔진 금지**. ★**오흡수 차단**: rollup≠DWH·출처≠Active Metadata·EventNorm≠OWL·V3 Trust≠Observability 도구. ★**데이터 계열 5개 Part 정본 재사용**.

---

## 6. Claude Code 구현 규칙

1. ★★단일 Intelligence Layer(헌법 V4 §16). 별도 AI-Native Data Platform/Active Metadata/Data Fabric 신설 금지·`EventNorm`/Unified Data Model 확장(**채널 나열 금지**).
2. 품질=V3 Data Trust(READY/WARNING/BLOCKED·**수집≠사용**). Lineage/Observability=출처 기록+`synced_at`+`ModelMonitor`+`AnomalyDetection`. `DataPlatform`/`AnomalyDetection` 확장(난립 금지).
3. Catalog/Glossary=`DataPlatform`+`GeniegoGlossary`. Data Contract=`Mapping`+`EventNorm`+`/v{NNN}`(하위호환·V3 Trust 검증). Discovery=Retriever(어휘·Vector 보류).
4. ★거버넌스=DATA 헌법·`Dsar`(삭제vs익명화)·RBAC·테넌트 격리 절대·PII 미저장(집계 코호트)·정직 미산출(null+사유).
5. ★★오흡수 금지: rollup(≠DWH/Data Product)·출처 기록(≠Active Metadata)·`EventNorm`(≠OWL Semantic Layer)·V3 Trust(≠Data Observability 도구).
6. ★★DWH/거버넌스/플랫폼/MDM/Fabric 판정=Part026/034/041/049/050 정본(재판정 금지). Atlan/Monte Carlo/Vector/ES/Kafka 이식 금지(EventNorm+rollup+V3 Trust+lineage 로 커버).

---

## 7. Completion Criteria

- [x] 데이터 인텔리전스 스택 **실측**(형식 Active Metadata/AI-Native Platform 도구/Data Contracts/Data Observability 도구/Vector/ES/Kafka 부재·`EventNorm`·rollup·V3 Trust·출처 lineage·`DataPlatform`·`GeniegoGlossary` 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 도구 부재 증명·데이터 품질/정규화/lineage 강함·데이터 계열 5개 Part 중복)
- [x] 실 데이터 인텔리전스(EventNorm+rollup+V3 Trust+lineage+DataPlatform+GeniegoGlossary) 성문화(§4)
- [x] ★★단일 Intelligence Layer(헌법 V4 §16·별도 플랫폼 금지)·V3 Trust(수집≠사용)·Semantic(채널 나열 금지)·★★오흡수 차단(rollup≠DWH·출처≠Active Metadata·EventNorm≠OWL·V3 Trust≠Observability 도구) 명시
- [x] 의도적 미적용 + 사유(§5) — Active Metadata/AI-Native Platform 도구/Data Contracts/Observability 도구/OWL/Vector/ES/Kafka(+데이터 계열 5개 Part 중복)
- [x] Claude Code 규칙(§6) · `EventNorm`·rollup·V3 Trust·출처 lineage·`DataPlatform`·`GeniegoGlossary` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **데이터 계열 5개 Part(026/034/041/049/050)+MEA 065 중복 + 데이터
> substrate**(`EventNorm` Semantic/Canonical + rollup 통합 뷰 + V3 Data Trust 품질 + 출처 lineage + `DataPlatform`
> Registry + `GeniegoGlossary`)의 성문화이지 형식 Active Metadata/AI-Native Platform/Data Contracts/Data
> Observability 도구 이식이 아니다. ★★**핵심(헌법 V4 §16·MEA 065)**: **Intelligence Layer 는 하나** — 정규화·통합은
> 실재하되 없는 것은 메타계층(Active Metadata/Data Fabric)이며 별도 플랫폼 신설 금지. ★★**오흡수 차단**: **rollup은
> DWH 가 아니고, 출처 기록은 Active Metadata 가 아니며, `EventNorm`은 OWL Semantic Layer 가 아니고, V3 Trust 는
> Data Observability 도구가 아니다**. DWH/거버넌스/플랫폼/MDM/Fabric=Part026/034/041/049/050 정본(재판정 금지).

---

## 다음 Part

**CCIS Part070 — GeniegoROI Enterprise Autonomous AI Operating System (AI-OS), Unified Enterprise Intelligence & Next-Generation AI Platform Master Standard (최종)** — ★사전 예고: **CCIS 시리즈 최종 마스터 문서**로, Part001~069 전체를 통합한다. ★**신규 실측 대상이 아니라 통합·종결 문서** — 앞선 69개 Part 판정을 총괄하고, 저장소의 실체(단일 모놀리스 PHP/Slim·MySQL·외부 LLM Gateway·통계모델·데이터 인텔리전스 핵심경쟁력·은행급 보안 지향·정직 미산출 문화)와 명세의 형식 AI-OS(Unified Control Plane/Enterprise AI Fabric/Cross-Domain Orchestration) 부재(MEA 065 메타계층 선행종속·헌법 V4 §16 단일 Intelligence Layer)를 최종 성문화한다. ★"명세 완결≠구현 완결"·"오흡수 차단"·"재판정 금지"·"단일 Intelligence Layer"·정직 미산출 문화를 CCIS 종결 원칙으로 확정.
