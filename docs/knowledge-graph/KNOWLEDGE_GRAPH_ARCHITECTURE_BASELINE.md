# EPIC 02-A — Enterprise Knowledge Graph Inventory & Architecture Baseline (정식 마스터)

> **근거**: EPIC 00(Metadata) + 01-A/B/C/D(승인된 CE/REL·Foundation) + 288차 그래프성 자산 전수조사(실코드). **비파괴**: 발견·설계·문서만. 코드변경 0. Graph DB 도입·기존 DB 교체·관계 삭제·중복 엔진 신설 없음(§21).
> **§22 통합**: 스펙의 14개 파편 문서 대신 본 마스터가 Inventory·Node/Edge Candidates·Use Cases·Source of Truth·Storage/Sync Options·Tenant Isolation·Permission·Data Minimization·Duplicate·Risk Register·Baseline을 통합(중복문서 금지 준수).
> **입력 정본**: [`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md) · [`../entities/CANONICAL_RELATIONSHIP_REGISTRY.md`](../entities/CANONICAL_RELATIONSHIP_REGISTRY.md) · [`../entities/ENTITY_FOUNDATION_VALIDATION_REPORT.md`](../entities/ENTITY_FOUNDATION_VALIDATION_REPORT.md). ADR=[`../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md`](../architecture/ADR_KNOWLEDGE_GRAPH_BASELINE.md).
> **승인 데이터만**: EPIC 01-D APPROVED_CANONICAL 항목만 Node/Edge 후보. BLOCKED(OrderItem/NormalizedRecord/ActionRequest)은 후보 제외.

---

## 0. 시퀀스 정정(정직 — §1 불일치 공개)
288차 초기에 핸드북 시퀀스를 예단해 `docs/kg/KNOWLEDGE_GRAPH_INGESTION_PLAN.md`(Edge Writer)·`KNOWLEDGE_GRAPH_SERVING_PLAN.md`(Serving)를 "02-B/02-C"로 선작성했으나, **정식 핸드북 02-B는 Node & Edge Schema Design**이다. 두 선행문서는 삭제하지 않고 **후속 EPIC(인제스천/서빙)용 forward-looking 설계**로 재라벨(비파괴). 본 마스터가 정식 02-A 정본이며 `docs/kg/KNOWLEDGE_GRAPH_INVENTORY_AND_BASELINE.md`의 인벤토리 내용을 흡수·확장한다.

---

## 1. 기존 그래프성 구조 전수 인벤토리 (실코드 근거)

| # | 구조 | 위치 | 유형 | 실사용 | 상태 |
|---|---|---|---|---|---|
| A | **graph_node/graph_edge (GraphScore)** | `Db.php:816-839`·`GraphScore.php` | 방향 가중 그래프(4노드타입·3홉·UNIQUE없음 앱단upsert) | 스키마/스코어링/UI 완비, **자동 인제스천 부재→수동 API만**, 실적재 UNVERIFIED | VERIFIED(구조)·PARTIALLY_VERIFIED(운영) |
| B | Markov 전이행렬 | `AttributionEngine.php:1468-1520` | in-memory 상태전이(START/CONV/NULL 흡수) | Attribution·cron 실사용, 비영속 | VERIFIED |
| C | Shapley 협조게임 | `AttributionEngine.php:965-1022` | 파워셋(그래프 아님) | 실사용 | VERIFIED |
| D | Union-Find 아이덴티티 | `CRM.php:600-644` | 그래프 순회→identity_id 컬럼 | CRM360 실사용 | VERIFIED |
| E | crm_identity_merge_link | `CRM.php:708-718` | (a_id,b_id,score) 병합 엣지(승인) | DSAR·병합 실사용 | VERIFIED |
| F | attribution_identity_link | `Attribution.php:133-145` | identity_hash↔session·confidence | 스티칭 실사용 | VERIFIED |
| G | Journey/Workflow 그래프 | journeys·journey_enrollments·nodes | DAG(노드/브랜치) | 실사용(발송) | VERIFIED(자동화 DAG) |
| H | 데이터 계보 | data_lineage(COMPUTED)·raw→normalized | 계보 체인(비영속·normalized 고아) | 부분(표시전용) | PARTIALLY_VERIFIED |
| I | DB FK/조인 관계망 | 전 핸들러 | 관계형(암묵 그래프) | 실사용(정본) | VERIFIED |
| J | 벡터/임베딩/RAG | — | **부재**(pgvector grep 0) | 챗봇=keyword 규칙 | ABSENT |
| K | CF/유사상품 추천 | — | **부재** | AutoRecommend=채널배분 | ABSENT |

**핵심**: 진짜 영속 그래프 저장소는 **A(graph_node/graph_edge) 단 1개**. B~F는 그래프성이나 별개 목적(귀속·아이덴티티)·재사용 대상. I(FK/조인)가 관계의 실질 정본. → **중복 Graph Engine 신설 금지, A 확장이 정본**(§3.1).

---

## 2. Graph Node Candidate Matrix (§23 — 승인 CE만)

| Node Type ID | CE ID | Node | Use Case | Source of Truth | Tenant Scope | Sensitive | Projection Need | Status | Risk |
|---|---|---|---|---|---|---|---|---|---|
| N-CUS | CE-CUS-* | Customer | Journey·Attribution·Recommend | crm_customers | Tenant | ★(PII 최소화) | High | CANONICAL_PROPOSED | LOW |
| N-ORD | CE-ORD-* | Order | Journey·LTV·Attribution | channel_orders | Tenant | 중 | High | CANONICAL_PROPOSED | LOW |
| N-SKU | CE-SKU-* | SKU | ProductGrowth·Affinity | channel_products/wms_stock | Tenant | 저 | High | CANONICAL_PROPOSED | LOW |
| N-PRD | CE-PRD-* | Product | ProductGrowth | catalog | Tenant | 저 | Med | CANDIDATE | LOW |
| N-CHN | CE-CHN-* | Channel(Sales/Ad) | Attribution·Mix | ChannelRegistry | Global+Tenant | 저 | Med | CANONICAL_PROPOSED | LOW |
| N-CMP | CE-CMP-* | AdCampaign | Attribution·Recommend | performance_metrics(campaign_ext_id) | Tenant | 저 | High | CANONICAL_PROPOSED | LOW |
| N-CRT | CE-CRT-* | Creator | ProductGrowth·귀속 | influencer_store | Tenant | 중 | Med | CANONICAL_PROPOSED | LOW |
| N-CRE | CE-MKT-Creative | Creative | Attribution·성과 | creative_sku_map/ad_design | Tenant | 저 | Med | CANDIDATE | LOW |
| N-SES | CE-CHN-Session | Session | Journey·Attribution | pixel_sessions | Tenant | 중(디바이스) | Med | CANDIDATE | LOW |
| N-SEG | CE-CUS-Segment | CustomerSegment | Recommend·Automation | crm_segment | Tenant | 저 | Low | CANDIDATE | LOW |
| N-CNV | CE-MKT-Conversion | ConversionEvent | Attribution | pixel_events | Tenant | 중 | High(볼륨) | CANDIDATE | PERFORMANCE_RISK(볼륨) |
| N-JNY | CE-AUT-Workflow | Journey | AutomationDecision | journeys | Tenant | 저 | Med | CANDIDATE | LOW |
| N-INS | CE-ANA-Insight | Insight/Recommendation | Decision 근거 | Insights/AutoRecommend | Tenant | 저 | Med | CANDIDATE | LOW |
| N-CON | CE-DAT-Connector | Connector/SyncRun | Lineage | connector_config | Tenant | 저(자격 제외) | Low | CANDIDATE | LOW |
| N-RAW | CE-DAT-Raw | RawRecord | Lineage | raw_vendor_event | Tenant | 중 | Low(볼륨) | CANDIDATE | PERFORMANCE_RISK |
| N-MDL | CE-DAT-ModelVersion | ModelVersion | Lineage·XAI | (미영속) | Tenant | 저 | Low | UNVERIFIED | — |
| N-AUD | CE-SEC-Audit | AuditLog·SecurityEvent | Security Graph | audit_log 외 | Tenant | 중 | Low | CANDIDATE | LOW |

**BLOCKED 제외**: OrderItem(REL-ORD-000002 ABSENT)·NormalizedRecord(고아)·ActionRequest(생산자0). **원칙**: 모든 CE를 Node로 만들지 않음 — 탐색 가치 있는 것만(§6). Alias(Buyer/Member/Shopper=Customer)는 별도 Node 금지(§3.3).

## 3. Graph Edge Candidate Matrix (§24 — 승인 REL·표준 Edge명)

| Edge Type ID | REL ID | Source | Edge(표준) | Target | Cardinality | Tenant | Temporal | Status | Risk |
|---|---|---|---|---|---|---|---|---|---|
| E-PURCHASED | REL-CUS-000001 | Customer | PURCHASED | Order | 1:N | Tenant | Valid | CANONICAL_PROPOSED | LOW |
| E-CONTAINS-SKU | REL-ORD(sku) | Order | CONTAINS | SKU | 1:N* | Tenant | — | BLOCKED(OrderItem 부재) | HIGH |
| E-STOCKED | REL-INV-000001 | SKU | STOCKED_AS | Inventory | 1:N | Tenant | Valid | CANONICAL_PROPOSED | LOW |
| E-ATTRIBUTED | REL-ORD-000006 | Order | ATTRIBUTED_TO | AttributionResult | 1:1 | Tenant | — | CANONICAL_PROPOSED | LOW |
| E-TOUCH-CMP | REL-MKT-000006 | Touch | ATTRIBUTED_TO | AdCampaign | N:1 | Tenant | Valid | CANONICAL_PROPOSED | LOW |
| E-USED-CREATIVE | REL-MKT-000001 | Ad | USED_CREATIVE | Creative | N:1 | Tenant | — | CANDIDATE | LOW |
| E-PROMOTES | REL-MKT-000003 | Creative | PROMOTED_BY→(SKU) | SKU | N:M | Tenant | — | CANDIDATE | LOW |
| E-CREATOR-CONTENT | REL-CRT-000001 | Creator | CREATED_BY | CreatorContent | 1:N | Tenant | — | CANONICAL_PROPOSED | LOW |
| E-CREATOR-ORDER | REL-CRT-000004 | Creator | INFLUENCED_BY | Order | 1:N | Tenant | — | CANONICAL_PROPOSED | LOW |
| E-SESSION-CONV | REL-MKT-000004 | ConversionEvent | BELONGS_TO | Session | N:1 | Tenant | — | CANDIDATE | PERFORMANCE_RISK |
| E-ENROLL-ACTION | REL-AUT-000002 | Enrollment | EXECUTED | Action | 1:N | Tenant | Valid | CANDIDATE | LOW |
| E-SCOPED | REL-ORG(tenant) | * | SCOPED_TO | Tenant | N:1 | — | — | CANONICAL_PROPOSED | LOW |
| E-NORMALIZED | REL-DAT-000005 | RawRecord | NORMALIZED_FROM | NormalizedRecord | 1:1 | Tenant | — | BLOCKED(고아) | LOW |
| E-DERIVED | REL-ANA-000001 | Metric | DERIVED_FROM | Order+AdPerf | N:M | Tenant | — | CANDIDATE | LOW |
| E-IDENTITY | REL-CUS-000004 | Customer | CONNECTED_TO | CustomerIdentity | N:1 | Tenant | Valid | 재사용(D/E/F) | LOW |

**표준 Edge명 단일화**(§7): 동일 의미 복수 이름 금지. `INFLUENCED_BY`/`ATTRIBUTED_TO` 등 REL Registry 매핑. **Temporal(Valid Time)**: Segment 소속·Role·Category·Automation 활성은 시간가변 → valid_from/to 고려(§9).

## 4. Knowledge Graph Use Cases (§10) — 우선순위

| # | Use Case | 핵심 질의 | 기존 자산 | 우선 |
|---|---|---|---|---|
| UC1 | Customer Journey | Customer→Session→Touch→Campaign→Order | A + pixel + attribution | 高 |
| UC2 | Attribution Graph | Conversion↔Touch↔Campaign↔Creative 경로 | B(Markov)+A | 高 |
| UC3 | Product Growth | SKU↔Creator↔Creative↔Revenue | **A(정확히 이 3홉)** | 高(A 직결) |
| UC4 | Marketing Recommendation | 업종·채널·상품·성과 연결 근거 | AutoRecommend+A 피처 | 中 |
| UC5 | Automation Decision | Insight→Recommendation→Approval→Run 근거 | Journey DAG+action_request(고아) | 中(고아 해소 후) |
| UC6 | Data Lineage | Source→Raw→Canonical→Metric→Automation | H(비영속)+normalized(고아) | 中(라이브검증) |
| UC7 | Engineering Impact | Feature→API→Service→DB→Test 의존성 | docs/registry(19)·Dependency | 中(문서그래프) |
| UC8 | Security & Audit | Admin→Session→Credential→Resource | audit 6테이블 | 低 |

**UC3가 기존 GraphScore(A)와 정확히 일치** → A 확장의 1순위 실사용.

## 5. Source of Truth (§12)
- Order→channel_orders · Customer→crm_customers · Inventory→wms_stock · Campaign→performance_metrics(+external mapping) · AttributionResult→AttributionEngine · Recommendation→AutoRecommend/Insights · Journey→journeys · Lineage→(영속화 필요 Vol3). **Graph는 파생 계층 — 삭제해도 SoT에서 재구축 가능해야 함**(§2·§12). Graph가 원천 유일저장소 되지 않음.

## 6. Storage Options — Architecture Decision Matrix (§25)

| Option | UseCase Fit | Performance | Consistency | Tenant Isolation | Op Cost | Migration Risk | Lock-in | 권고 |
|---|---|---|---|---|---|---|---|---|
| **RDB graph_node/graph_edge(현행 확장)** | 中~高(3홉·중밀도) | 中(인덱스·앱순회) | 高(단일 트랜잭션) | 高(tenant_id 검증됨) | **低(기존 스택)** | **低** | **없음** | ★**채택(1순위)** |
| RDB FK/Recursive CTE | 中(정본 관계) | 中 | 高 | 高 | 低 | 低 | 없음 | 보조(정본 유지) |
| Graph Projection(읽기전용) | 高(경로질의) | 高(사전계산) | 中(동기화 지연) | 高(스코프 유지) | 中 | 中 | 낮음 | 조건부(볼륨 증가 시) |
| Dedicated Graph DB(Neo4j 등) | 高(심화 경로) | 高 | 中 | 中(별도 강제) | **高** | 高 | **높음** | **보류**(규모 요구 전 미도입) |
| In-Memory Graph | 中(배치분석) | 高(휘발) | 低 | 앱강제 | 中 | 低 | 낮음 | Markov류 계산 한정(현행 B 유지) |

**권고**: **현행 RDB graph_node/graph_edge 확장 + (볼륨 증가 시) 읽기 Projection**. Dedicated Graph DB는 UC 규모·경로 밀도가 실제로 요구할 때만(현 근거로는 운영복잡도·Lock-in이 이익 초과 → 보류). MySQL+SQLite 스택·팀 유지보수성·검증된 tenant 격리를 활용.

## 7. Sync Options (§13)
- **권고 = Event-Driven Projection(write-through) + 주기 Reconciliation + Backfill**. graph_edge를 주문/귀속/CRM 이벤트에서 갱신(후속 EPIC). 필수검증: Idempotency(UNIQUE/upsert)·Ordering·Duplicate/Late/Delete Event·Retry·Projection Lag·Reconciliation·Version. CDC는 스택상 과함 → 앱 write-through 우선.

## 8. Tenant Isolation Architecture (§14)
- **Tenant Property Enforcement**(graph_node/graph_edge 기 tenant_id) + **Query Middleware**(모든 순회 `WHERE tenant_id=?` fail-closed). Graph ID 직접접근 금지(항상 tenant 동반). Demo/운영 분리(IS_DEMO). 공용 Reference(ChannelRegistry 등)만 Global Scope 명시. Separate Namespace/DB는 규모 전 불필요(01-D 격리 PASS 근거).

## 9. Permission Model (§15)
- Node/Edge Read·Write·Traversal 권한을 기존 RBAC(viewer<connector<analyst<admin+scope)에 매핑. Sensitive Node Masking(Customer PII). Automation/Analytics Service Scope(읽기전용 순회). **Cross-Tenant Deny** 절대. Application Layer + Query Layer 이중 검증.

## 10. Data Minimization (§16)
- Customer Node에 이메일/전화/주소/결제/Secret/OAuth Token **미복제**. Canonical ID + 분류·집계 속성만(등급/세그먼트/집계 LTV). PII는 SoT(crm_customers)에만, Graph는 참조(identity_id). No-PII 원칙(CLAUDE.md) 승계.

## 11. Duplicate / Consistency Risk (§17·§18 Risk Register)

| 항목 | 유형 | 심각도 | 조치 |
|---|---|---|---|
| ROAS/LTV 이원 계산(PHP+JS) | 중복 파생 관계 | HIGH | 01-D 계획(공용헬퍼) — Graph는 SoT 산출 소비 |
| Attribution 경로 재계산(화면별) | 중복 그래프 계산 | MED | Graph 단일 경로 근거로 수렴 |
| Lineage 비영속(H)+normalized 고아 | 계보 단절 | MED | 영속화(Vol3)·라이브검증 |
| graph_edge UNIQUE 부재 | 중복 Edge | MED | UNIQUE 추가(후속 스키마 EPIC) |
| ConversionEvent/RawRecord 볼륨 | 성능 | MED | Projection·샘플링·미Node화 검토 |
| A 실적재 여부 미확인 | 일관성(빈 그래프) | MED | 인제스천 라이브검증 |
| 삭제 Entity Node 잔존/역방향 불일치 | 일관성 | LOW | Reconciliation |
| **Cross-Tenant Node 연결** | 보안 | (설계상 차단) | Query Middleware 강제(현 격리 PASS) |

**Security Risk 0 · Tenant Isolation Risk 0**(01-D 3정본 fail-closed 승계) · Performance Risk 2(Conversion/Raw 볼륨) · SoT 미확정 1(ModelVersion 미영속).

## 12. Architecture Baseline 확정 (§28)
1. **단일 KG 저장소 = graph_node/graph_edge 확장**(RDB 기반, 병렬 Graph Engine·Graph DB 미도입).
2. **Node=승인 CE, Edge=승인 REL(표준 Edge명)**. node_type 4종→CE 카탈로그 일반화. BLOCKED 제외.
3. **Graph=파생 계층**(SoT 별도·재구축 가능). Lineage/Rebuild 보장.
4. **Sync=Event-Driven Projection + Reconciliation + Backfill**(후속 구현).
5. **격리=tenant_id fail-closed + Query Middleware**, **권한=RBAC 매핑 이중검증**, **PII 미복제**.
6. **저장기술 확정 보류**: 현 근거로 RDB 확장 채택, Dedicated Graph DB는 규모 요구 시 재평가(§11 성급 확정 금지).

## 13. §27 완료 보고 수치
조사 기존 그래프성 구현 11(A~K) · Node 후보 17(승인 CE) · Edge 후보 15(승인 REL) · 핵심 UseCase 8 · Duplicate Candidate 3(ROAS/LTV·Attribution 재계산·중복 Edge) · Security Risk 0 · Tenant Isolation Risk 0 · Performance Risk 2(Conversion/Raw 볼륨) · SoT 미확정 1(ModelVersion) · Storage 평가=RDB 확장 채택·GraphDB 보류 · Sync 평가=Event Projection 권고 · 문서=본 마스터+ADR+PM(통합) · 테스트/Benchmark=경로질의 성능·볼륨 노드 벤치 계획 · 남은리스크=A 실적재·Lineage 영속·볼륨노드 · **EPIC 02-B(Node & Edge Schema Design) 준비 완료**. 코드변경 0.
