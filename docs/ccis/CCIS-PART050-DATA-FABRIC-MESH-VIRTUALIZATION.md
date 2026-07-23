# GeniegoROI Claude Code Implementation Specification

# CCIS Part050 — Enterprise Data Fabric, Data Mesh, Virtualization & Unified Data Access Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Data Fabric·Data Mesh·Virtualization·Unified Data Access 표준을 수립한다.

> ★**성격(★Part026/034/041/049 중복 + MEA 065 "메타계층 부재" — 통합 접근 실재·형식 Fabric/Mesh 부재)**: 본
> Part 는 **CCIS Part026(DWH)·034(거버넌스)·041(데이터플랫폼)·049(MDM)와 중복**되며 그 판정을 승계한다. ★핵심
> = **MEA Part065(Unified Intelligence Layer) 판정 승계**: 이 저장소는 **정규화·identity 통합·교차도메인
> 메트릭이 실재**하되 **없는 것은 도메인이 아니라 메타계층**(Registry/Fabric/EventBus) — 판정어휘 제6항
> **"아키텍처 형태 선행 종속"**. 명세가 다루는 **형식 Data Fabric 플랫폼·Data Mesh(domain data product/
> federated governance)·Data Virtualization(virtual table/view/join·Denodo)·Federated Query(cross-DB join/
> pushdown)·SQL Gateway/GraphQL·형식 Data Product Registry·Metadata Federation**은 **부재**한다(grep 0).
> ★**실재 축(통합 데이터 접근 substrate)**: **`EventNorm`/Unified Data Model**(**단일 논리/canonical 모델**·
> semantic mapping)·**rollup 집계**(통합 뷰·교차도메인 메트릭)·**`Connectors`/Connector Registry**(도메인
> 소스·**Adapter 패턴**·Part028)·**cron sync**(cross-system 통합)·**V3 Trust**(품질)·**`DataPlatform`**(Data
> Source Registry~data product 유사)·**`GeniegoGlossary`**(business vocabulary)·**테넌트 격리·RBAC/ABAC** 는
> 실재한다. ★★**헌법 V4 §16 = Intelligence Layer 는 하나**(중복 엔진 금지) → **별도 Fabric 신설 금지·기존 통합
> 계층 확장**. Part001 §4 에 따라 실측 → Fabric/Mesh/Virtualization 부재증명 → EventNorm+rollup+Connector
> 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 통합 데이터 접근 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Data Fabric Architecture | Source→Connectors→Logical Layer→Fabric→API/AI | **부분(대응물)** — Connectors→`EventNorm` 논리 모델→rollup→API/AI. 형식 Fabric 플랫폼 아님 |
| Data Fabric | Unified Metadata/Cross-System/Discovery | **부분(메타계층 부재)** — `EventNorm`+rollup+`DataPlatform`. 형식 Fabric(지능형 Discovery/Orchestration) 아님 |
| Data Mesh | Domain Data Product/Ownership/Federated Gov | **부분(대응물)** — 도메인 핸들러(CRM/Wms/Catalog)·테넌트 소유. 형식 Data Product/federated governance 아님 |
| Data Virtualization | Virtual Table/View/Join/Dynamic Mapping | **부재** — 가상화 없음. 물리 MySQL·rollup 집계(복제형)·`Mapping`(필드) |
| Logical Data Layer | Canonical Model/Abstraction/Unified Schema | ★**대응물** — **`EventNorm`/Unified Data Model**(canonical·표준 스키마·채널 나열 금지) |
| Unified Data Access | REST/GraphQL/SQL Gateway/AI Query | **부분(REST)** — `/v{NNN}`/`/api` REST·챗봇 AI Query. GraphQL/SQL Gateway 부재 |
| Federated Query | Cross-DB Join/Pushdown/Optimization | **부재** — 연합 질의 없음. 단일 MySQL·cron sync 통합(질의 아닌 적재) |
| Data Product | Product ID/Domain/Owner/SLA/Quality | **부분(대응물)** — `DataPlatform` Data Source(source_type/priority)·V3 Trust(Quality). 형식 Data Product 아님 |
| Domain-Oriented Ownership | Business/Technical Domain/Steward | **부분** — 도메인 핸들러·테넌트 소유(구독회원). 형식 도메인 거버넌스 부분 |
| Metadata Federation | Schema/Lineage/Glossary Federation | ★**대응물** — 출처 lineage·`GeniegoGlossary`·`DataPlatform`. 형식 federation 아님(중앙 MySQL) |
| Cross-System Query | ERP+CRM/TMS+WMS 통합질의 | **부분(적재형)** — cron sync 통합·rollup 교차도메인 집계. 실시간 연합질의 아님 |
| Semantic Data Layer | Business Vocabulary/Canonical/Semantic Map | ★**대응물** — `GeniegoGlossary`(용어)·`EventNorm`(canonical entity)·`graph_node`(Part043) |
| Data Federation API | Search/Query/Metadata/Lineage API | **부분** — `DataPlatform` API·챗봇 Retriever·rollup API. 형식 federation API 부분 |
| Data Governance Integration | Catalog/Policy/Lineage/Classification | ★**대응물** — `DataPlatform`·V3 Trust·lineage·`Dsar`(Part034) |
| Enterprise Data Catalog | Discovery/Search/Owner/Usage | **부분** — `DataPlatform` data_source·메트릭 카탈로그(Glossary). 형식 Catalog 도구 아님 |
| Monitoring | Query Latency/Connector Health/Virt Status | **부분** — cron 상태·`synced_at`·V3 Trust·`SystemMetrics`. 가상화 상태 대상 없음 |
| Logging | Data Product/Query/Domain/Trace | **부분** — 출처 기록·`SecurityAudit`. Query/Trace ID 부분 |
| Security(RBAC/ABAC/Masking/격리) | 정책 기반 접근 | ★**준수** — RBAC+Scope·`TeamPermissions`(ABAC)·Masking·**테넌트 격리 절대**·PII 미저장 |
| Compliance(GDPR) | 데이터 접근 정책 | ★**부분 준수** — `Dsar`·DATA 헌법·PII 미저장 |
| Disaster Recovery | Metadata/Catalog/Connector 복구 | **부분** — DB 백업·git(Registry/Glossary)·재수집 |
| Performance(Query/Metadata Cache/Pooling/증분) | 논리 계층 성능 | **부분** — 인덱스·증분(`synced_at`)·HTTP 캐시. Federated Query 캐시 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Data as a Product/Metadata First/Domain Ownership/Self-Service/Federated Governance/Tenant Isolated/AI Ready) | **부분(통합축)** | ★Metadata First(lineage)·Tenant Isolated·AI Ready·Policy Driven. Data as Product/Federated Governance 부분(메타계층 부재) |
| §4 Fabric Architecture | **부분(대응물)** | Connectors→`EventNorm`→rollup. Fabric 플랫폼 아님 |
| §5 Data Fabric | **부분(메타계층 부재)** | `EventNorm`+rollup+`DataPlatform`. 지능형 Fabric 아님 |
| §6 Data Mesh | **부분(대응물)** | 도메인 핸들러·테넌트 소유. Data Product/federated gov 아님 |
| §7 Data Virtualization | **부재** | 가상화 없음(물리 MySQL·rollup 복제형) |
| §8 Logical Data Layer | **★대응물** | `EventNorm`/Unified Data Model(canonical·표준 스키마) |
| §9 Unified Data Access | **부분(REST)** | REST·챗봇 AI Query. GraphQL/SQL Gateway 부재 |
| §10 Federated Query | **부재** | 연합 질의 없음(단일 MySQL·cron sync 적재) |
| §11 Data Product | **부분(대응물)** | `DataPlatform` Data Source·V3 Trust. 형식 Product 아님 |
| §12 Domain Ownership | **부분** | 도메인 핸들러·테넌트 소유. 형식 거버넌스 부분 |
| §13 Metadata Federation | **★대응물** | lineage·`GeniegoGlossary`·`DataPlatform`(중앙) |
| §14 Cross-System Query | **부분(적재형)** | cron sync·rollup 교차집계. 실시간 연합 아님 |
| §15 Semantic Data Layer | **★대응물** | `GeniegoGlossary`·`EventNorm`·`graph_node` |
| §16 Data Federation API | **부분** | `DataPlatform` API·Retriever·rollup |
| §17 Governance Integration | **★대응물** | `DataPlatform`·V3 Trust·lineage·`Dsar` |
| §18 Enterprise Data Catalog | **부분** | `DataPlatform`·메트릭 카탈로그. 형식 도구 아님 |
| §19 Monitoring | **부분** | cron·`synced_at`·V3 Trust·`SystemMetrics` |
| §20 Logging | **부분** | 출처 기록·`SecurityAudit` |
| §21 Security | **★준수** | RBAC+Scope·ABAC·Masking·테넌트 격리·PII 미저장 |
| §22 Compliance | **부분 준수** | `Dsar`·DATA 헌법·PII 미저장 |
| §23 Disaster Recovery | **부분** | DB 백업·git·재수집 |
| §24 Performance | **부분** | 인덱스·증분·캐시 |
| §25~§26 PHP/Claude(Fabric/Federated Query/Metadata Federation/Data Product Registry/Virtualization Adapter) | **부분** | ★`EventNorm`·rollup·`Connectors`(Adapter)·`DataPlatform`·V3 Trust. Fabric/Federated Query/Virtualization 부재 |
| §27~§28 검증(data-fabric:health/federated-query/data-product) | **대상 없음** | artisan 없음. `DataPlatform` API·V3 Trust·rollup·`make quality` 로 대체 |

---

## 4. 확립된 표준 (신규 통합 데이터 접근 코드가 따를 정본)

- ★★**단일 통합 계층 원칙(헌법 V4 §16)**: **Intelligence Layer 는 하나** → **별도 Data Fabric/Mesh 신설 금지·기존 통합 계층 확장**. 논리 모델=**`EventNorm`/Unified Data Model**(canonical·semantic mapping). ★**채널 나열 금지 → 표준 정규화**.
- ★**통합 뷰 = rollup 집계**(교차도메인 메트릭·de-facto DWH·Part026). Cross-System 통합=**cron sync 적재**(실시간 연합질의 아님·Part041). 가상화 대신 물리 집계.
- ★**도메인 소스 = `Connectors`/Connector Registry**(Adapter 패턴·Part028). 신규 소스=커넥터 등록(Quality Gate/Trust Score). ★**중복 커넥터 금지**.
- ★**Data Product 대응 = `DataPlatform` Data Source Registry**(source_type/priority/credential)+V3 Trust(Quality Score). 형식 Data Product 신설 금지(Registry 확장).
- ★**메타/거버넌스 = 출처 lineage + `GeniegoGlossary`(vocabulary) + `DataPlatform` + `Dsar`(retention)**(Part034). Semantic=`EventNorm`+`graph_node`(Part043).
- ★**품질 게이트 = V3 Trust**(READY/WARNING/BLOCKED·수집≠사용). 통합 데이터도 신뢰검증 후 AI/자동화.
- ★**테넌트 격리·PII 미저장·정직 미산출**: 통합 접근도 위조 불가 권위 tenant·RBAC/ABAC·집계 코호트·null+사유.
- ★★**중복 3개 Part 명시**: 형식 DWH=Part026·거버넌스=Part034·데이터플랫폼=Part041·MDM=Part049 정본(재판정 금지). 본 Part 는 Fabric/Mesh/Virtualization 관점 보강.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 메타계층 부재 + 다중 Part 중복)

1. **형식 Data Fabric 플랫폼·Data Mesh(domain data product/federated governance)** — 안 함. ★**MEA 065 판정**: 도메인/데이터는 실재하되 **없는 것은 메타계층**(Registry/Fabric/EventBus·어휘 제6항 "아키텍처 형태 선행 종속"). ★**헌법 V4 §16 = Intelligence Layer 는 하나** → 별도 Fabric 신설 금지(기존 `EventNorm`+rollup 확장).
2. **Data Virtualization(virtual table/view/join·Denodo)·Federated Query(cross-DB/pushdown)** — 안 함. 단일 MySQL·cron sync **적재형 통합**(실시간 연합질의 아님). 가상화=인프라 도입.
3. **SQL Gateway/GraphQL·형식 Data Product Registry·Metadata Federation** — 부분. REST(`/v{NNN}`)·`DataPlatform`·중앙 lineage 가 대응물.
4. **Part026/034/041/049 와 중복되는 형식 Catalog/Lineage/Quality/MDM** — 각 Part 정본(재판정 금지). 본 Part 는 Fabric/Mesh/Virtualization 관점만.
5. **artisan `data-fabric:*`/`federated-query`/`data-product` 명령** — 없음(Slim). `DataPlatform` API·V3 Trust·rollup·`make quality` 로 대체.

★**준수하는 실 원칙(강함)**: **단일 통합 계층(헌법 V4 §16·Fabric 신설 금지)·`EventNorm` canonical 논리 모델(채널 나열 금지)·rollup 통합 뷰(교차도메인)·Connector Registry(Adapter·중복 금지)·V3 Trust(수집≠사용)·출처 lineage·`GeniegoGlossary` vocabulary·테넌트 격리·PII 미저장·정직 미산출**. ★**메타계층 부재 정직**: Fabric/Mesh 는 아키텍처 형태 선행 종속(MEA 065·어휘 제6항)이며 데이터/도메인은 이미 통합돼 있다.

---

## 6. Claude Code 구현 규칙

1. ★★통합 계층=**하나**(헌법 V4 §16). 별도 Data Fabric/Mesh 신설 금지·`EventNorm`/Unified Data Model 확장(**채널 나열 금지**).
2. 통합 뷰=rollup 집계(교차도메인·Part026). Cross-System=cron sync 적재(Part041). 가상화/Federated Query 이식 금지(단일 MySQL).
3. 도메인 소스=`Connectors`/Connector Registry(Adapter·Quality Gate·중복 금지). Data Product=`DataPlatform` Registry 확장.
4. 메타/거버넌스=lineage+`GeniegoGlossary`+`DataPlatform`+`Dsar`(Part034). 품질=V3 Trust(수집≠사용). Semantic=`EventNorm`+`graph_node`.
5. ★테넌트 격리 절대·RBAC/ABAC·PII 미저장(집계 코호트)·정직 미산출(null+사유).
6. ★★Denodo/Data Fabric/Data Mesh/Federated Query 를 "명세에 있다"는 이유로 이식하지 않는다(EventNorm+rollup+Connector 로 커버). 형식 DWH/거버넌스/MDM 판정=Part026/034/049 정본(재판정 금지).

---

## 7. Completion Criteria

- [x] 통합 데이터 접근 스택 **실측**(Data Fabric/Mesh/Virtualization/Federated Query/Denodo 부재·`EventNorm` canonical·rollup 통합 뷰·`Connectors` Adapter·`DataPlatform`·V3 Trust 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(Fabric/Mesh/Virtualization **메타계층 부재**(MEA 065·어휘 제6항) 증명·통합 접근 실재)
- [x] 실 통합(EventNorm+rollup+Connector Registry+DataPlatform+V3 Trust+lineage) 성문화(§4)
- [x] ★★단일 통합 계층(헌법 V4 §16·Fabric 신설 금지)·canonical 논리 모델(채널 나열 금지)·rollup 교차도메인·V3 Trust·테넌트 격리·★중복 3+Part 명시
- [x] 의도적 미적용 + 사유(§5) — Data Fabric/Mesh/Virtualization/Federated Query/SQL Gateway/GraphQL(메타계층 선행 종속)
- [x] Claude Code 규칙(§6) · `EventNorm`·rollup·`Connectors`·`DataPlatform`·V3 Trust 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part026/034/041/049 중복 + MEA 065 판정**의 성문화다 — 데이터/도메인은
> **`EventNorm` canonical 논리 모델 + rollup 통합 뷰 + Connector Registry 로 이미 통합**돼 있으나, **없는 것은
> 도메인이 아니라 메타계층**(Data Fabric/Mesh/EventBus·어휘 제6항 "아키텍처 형태 선행 종속")이다. ★★**헌법 V4
> §16 = Intelligence Layer 는 하나** → 별도 Fabric 신설 금지·기존 통합 계층 확장. Denodo/Federated Query 이식이
> 아니다.

---

## 다음 Part

**CCIS Part051 — Enterprise Event-Driven Architecture (EDA), Event Mesh & Real-Time Integration** — ★사전 실측 예고: 형식 EDA(Event Broker/Event Mesh·Solace)·Event Sourcing·CQRS·Kafka/Pulsar Pub/Sub·Schema Registry 는 **부재**(Part018/041 승계)이나, 이벤트 실체는 **`omni_outbox`(DB-backed 이벤트 큐+DLQ replay)·pixel/이벤트(`PixelTracking`·`EventNorm`)·webhook(`Webhooks`/`OpenPlatform::emit` HMAC)·cron 이벤트·`RuleEngine` 트리거·Saga 대신 DB 트랜잭션**로 부분 실재. Part051 도 실측→Event Broker/Mesh/Sourcing/CQRS 부재증명→omni_outbox+webhook+EventNorm 성문화. ★Part018(Queue/Event)·028(Webhook)·032(워크플로 Saga 부재) 중복 명시.
