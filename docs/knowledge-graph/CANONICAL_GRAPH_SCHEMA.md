# EPIC 02-B — Canonical Knowledge Graph Node & Edge Schema (정식 마스터)

> **근거**: 02-A [`KNOWLEDGE_GRAPH_ARCHITECTURE_BASELINE.md`](KNOWLEDGE_GRAPH_ARCHITECTURE_BASELINE.md)(승인 Node/Edge 후보·저장결정) + 01-B/C/D(승인 CE/REL). **비파괴**: Registry·스키마 정의·정책만. 코드변경 0. 운영 Projection·Graph DB 도입·기존 DB 교체 없음(§27).
> **§28 통합**: 17개 파편 대신 본 마스터가 Node/Edge Type Registry·공통필드·ID정책·시간성·버전·Uniqueness·Entity Resolution·Confidence/Quality·Lineage·Traversal 권한·Data Classification·Projection·Validation을 통합. ADR=[`../architecture/ADR_KNOWLEDGE_GRAPH_SCHEMA.md`](../architecture/ADR_KNOWLEDGE_GRAPH_SCHEMA.md).
> **물리 매핑**: 저장 = 기존 `graph_node`/`graph_edge`(Db.php:816) 확장(02-A 결정). 공통필드는 컬럼 또는 `meta_json` 매핑(스키마 ALTER는 후속·Backfill 후·비파괴). node_type 4종→Node Type Registry 바인딩.
> **승인 데이터만**(§3.5): 미등록 Node/Edge Type·속성·상태값 임의 생성 금지. BLOCKED(OrderItem/NormalizedRecord/ActionRequest)은 스키마 등록하되 status=BLOCKED.

---

## 1. Graph 식별자 계층 (§4)
- **Node Type ID** `NT-{CAT}-NNNNNN`(영구·불변). **Edge Type ID** `ET-{CAT}-NNNNNN`.
- **Node Instance ID**: 외부 채널 ID 직접 PK 금지. 논리키 = **`tenant_id + canonical_entity_id + canonical_record_id`**(외부오브젝트는 `+ source_system + source_account_id + source_record_id`). 물리 `node_id`=해당 논리키의 결정적 해시(sha1).
- **Edge Instance ID**: 논리키 = **`tenant_id + edge_type_id + source_node_id + target_node_id + valid_from + source_system`**. 물리 `edge_id`=해시.
- 동일 Entity/관계의 중복 인스턴스 생성 차단(§14/§15 Uniqueness).

## 2. Node 공통 필드 표준 (§7)
`node_id · node_type_id · canonical_entity_id · canonical_record_id · tenant_id · workspace_id · scope_type(TENANT|WORKSPACE|GLOBAL) · source_system · source_account_id · source_record_id · source_version · graph_schema_version · projection_version · status · created_at · updated_at · valid_from · valid_to · is_deleted · deleted_at · data_classification · quality_score · trust_score · confidence_score · lineage_id · evidence_reference`
- Global Reference Node는 tenant_id 없이 `scope_type=GLOBAL` 명시. **원천 전체필드 복제 금지**(§9.5·§21).

## 3. Edge 공통 필드 표준 (§8)
`edge_id · edge_type_id · canonical_relationship_id · source_node_id · target_node_id · tenant_id · workspace_id · source_system · source_record_id · source_version · graph_schema_version · projection_version · status · created_at · updated_at · valid_from · valid_to · is_deleted · deleted_at · quality_score · trust_score · confidence_score · lineage_id · evidence_reference`
- Edge 속성은 **관계 자체 의미만**(§10). Source/Target 상세 속성 중복저장 금지.

## 4. Canonical Node Type Registry (§29 Matrix)

| Node Type ID | CE ID | Name | Source of Truth | Scope | Required Props | Sensitive | Temporal | Projection | Status |
|---|---|---|---|---|---|---|---|---|---|
| NT-ORG-000001 | CE-ORG-Tenant | Tenant | tenant_kv | GLOBAL/自 | tenant_id,name | 저 | N | Full | VERIFIED |
| NT-ORG-000002 | CE-ORG-Workspace | Workspace | tenant_kv | Tenant | ws_id | 저 | N | Full | CANDIDATE |
| NT-USR-000001 | CE-USR-User | User | app_user | Tenant | user_id,role | 중 | Y(role) | Incr | VERIFIED |
| NT-CUS-000001 | CE-CUS-Customer | Customer | crm_customers | Tenant | canonical_record_id | ★PII참조 | Y(segment/grade) | Incr | VERIFIED |
| NT-CUS-000002 | CE-CUS-Segment | CustomerSegment | crm_segment | Tenant | seg_id | 저 | Y | Incr | CANDIDATE |
| NT-CUS-000003 | CE-CUS-Identity | CustomerIdentity | crm identity(D/E) | Tenant | identity_id | 중 | Y | Incr | 재사용 |
| NT-PRD-000001 | CE-PRD-Product | Product | catalog | Tenant | prd_id | 저 | N | Incr | CANDIDATE |
| NT-SKU-000001 | CE-SKU-SKU | SKU | channel_products/wms | Tenant | sku | 저 | N | Incr | VERIFIED |
| NT-ORD-000001 | CE-ORD-Order | Order | channel_orders | Tenant | channel,channel_order_id | 중 | N | Incr | VERIFIED |
| NT-ORD-000002 | CE-ORD-OrderItem | OrderItem | (부재) | Tenant | — | 중 | N | — | **BLOCKED** |
| NT-INV-000001 | CE-INV-Inventory | Inventory | wms_stock | Tenant | sku,wh_id | 저 | Y(수량) | Incr | VERIFIED |
| NT-CHN-000001 | CE-CHN-Channel | Channel | ChannelRegistry | GLOBAL+Tenant | channel,group_type | 저 | N | Full | VERIFIED |
| NT-CMP-000001 | CE-CMP-AdCampaign | AdCampaign | performance_metrics | Tenant | campaign_ext_id | 저 | Y(target) | Incr | VERIFIED |
| NT-CMP-000002 | CE-CMP-AdGroup | AdGroup | ad_audience_breakdowns | Tenant | adset_id | 저 | Y | Incr | CANDIDATE |
| NT-CMP-000003 | CE-CMP-Ad | Ad | ad_ext_id | Tenant | ad_ext_id | 저 | Y | Incr | CANDIDATE |
| NT-MKT-000001 | CE-MKT-Creative | Creative | creative_sku_map | Tenant | creative_id | 저 | Y(placement) | Incr | CANDIDATE |
| NT-MKT-000002 | CE-MKT-Content | Content | influencer_store | Tenant | content_id | 저 | N | Incr | CANDIDATE |
| NT-MKT-000003 | CE-MKT-Conversion | ConversionEvent | pixel_events | Tenant | event_id | 중 | N | **Incr(볼륨)** | CANDIDATE·PERF_RISK |
| NT-MKT-000004 | CE-CHN-Session | Session | pixel_sessions | Tenant | session_id | 중 | N | Incr | CANDIDATE |
| NT-CRT-000001 | CE-CRT-Creator | Creator | influencer_store | Tenant | creator_id | 중 | N | Incr | VERIFIED |
| NT-ANA-000001 | CE-ANA-Metric | Metric | Rollup(SSOT) | Tenant | metric_key,period | 저 | Y | Full | CANDIDATE |
| NT-ANA-000002 | CE-ANA-Insight | Insight | Insights | Tenant | insight_id | 저 | N | Incr | CANDIDATE |
| NT-ANA-000003 | CE-ANA-Recommendation | Recommendation | AutoRecommend | Tenant | rec_id | 저 | N | Incr | CANDIDATE |
| NT-ANA-000004 | CE-ANA-Decision | DecisionProposal | Decisioning | Tenant | decision_id | 저 | N | Incr | CANDIDATE |
| NT-DAT-000001 | CE-DAT-Connector | Connector | connector_config | Tenant | channel | 저(자격제외) | N | Full | CANDIDATE |
| NT-DAT-000002 | CE-DAT-SyncRun | SyncRun | connector_sync_log | Tenant | run_id | 저 | N | Incr | CANDIDATE |
| NT-DAT-000003 | CE-DAT-RawRecord | RawRecord | raw_vendor_event | Tenant | raw_id | 중 | N | **Incr(볼륨)** | CANDIDATE·PERF_RISK |
| NT-DAT-000004 | CE-DAT-Normalized | NormalizedRecord | normalized_activity_event | Tenant | — | 중 | N | — | **BLOCKED(고아)** |
| NT-DAT-000005 | CE-DAT-ModelVersion | ModelVersion | (미영속) | Tenant | model_id,ver | 저 | Y | — | **UNVERIFIED** |
| NT-AUT-000001 | CE-AUT-Workflow | Workflow(Journey) | journeys | Tenant | journey_id | 저 | Y(활성) | Incr | CANDIDATE |
| NT-AUT-000002 | CE-AUT-Run | AutomationRun | journey_enrollments | Tenant | run_id | 저 | N | Incr | CANDIDATE |
| NT-SEC-000001 | CE-SEC-Audit | AuditLog | audit_log | Tenant | log_id | 중 | N | Incr | CANDIDATE |

## 5. Canonical Edge Type Registry (§30 Matrix)

| Edge Type ID | REL ID | Name | Source→Target | Cardinality | Scope | Temporal | Unique Key | Confidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| ET-ORG-000001 | REL-ORG-000001 | OWNS | Tenant→Workspace | 1:N | Tenant | N | (t,src,dst) | 1.0 | VERIFIED |
| ET-USR-000001 | REL-USR-000001 | MEMBER_OF | User→Workspace | N:1 | Tenant | Y(role기간) | (t,src,dst,valid_from) | 1.0 | VERIFIED |
| ET-CUS-000001 | REL-CUS-000001 | PURCHASED | Customer→Order | 1:N | Tenant | N | (t,src,dst) | src신뢰 | VERIFIED |
| ET-ORD-000001 | REL-ORD-000002 | CONTAINS | Order→SKU | 1:N | Tenant | N | (t,src,dst) | — | **BLOCKED(OrderItem)** |
| ET-INV-000001 | REL-INV-000001 | STOCKED_AS | SKU→Inventory | 1:N | Tenant | Y(수량시점) | (t,src,dst,valid_from) | 1.0 | VERIFIED |
| ET-ORD-000002 | REL-ORD-000006 | ATTRIBUTED_TO | Order→AttributionResult | 1:1 | Tenant | N | (t,src,dst) | model | VERIFIED |
| ET-MKT-000001 | REL-MKT-000006 | ATTRIBUTED_TO | Touch→AdCampaign | N:1 | Tenant | Y | (t,src,dst,valid_from) | model | VERIFIED |
| ET-MKT-000002 | REL-MKT-000001 | USED_CREATIVE | Ad→Creative | N:1 | Tenant | Y(placement) | (t,src,dst,valid_from) | 1.0 | CANDIDATE |
| ET-MKT-000003 | REL-MKT-000003 | PROMOTES | Creative→SKU | N:M | Tenant | N | (t,src,dst) | map신뢰 | CANDIDATE |
| ET-CRT-000001 | REL-CRT-000001 | CREATED_BY | Content→Creator | N:1 | Tenant | N | (t,src,dst) | 1.0 | VERIFIED |
| ET-CRT-000002 | REL-CRT-000004 | INFLUENCED_BY | Order→Creator | N:1 | Tenant | N | (t,src,dst) | 귀속신뢰 | VERIFIED |
| ET-MKT-000004 | REL-MKT-000004 | BELONGS_TO | ConversionEvent→Session | N:1 | Tenant | N | (t,src,dst) | 1.0 | CANDIDATE·PERF |
| ET-AUT-000001 | REL-AUT-000002 | EXECUTED | Enrollment→Action | 1:N | Tenant | Y | (t,src,dst,valid_from) | 1.0 | CANDIDATE |
| ET-CUS-000002 | REL-CUS-000004 | CONNECTED_TO | Customer→Identity | N:1 | Tenant | Y | (t,src,dst,valid_from) | ER신뢰 | 재사용(D/E/F) |
| ET-DAT-000001 | REL-DAT-000005 | NORMALIZED_FROM | Normalized→Raw | 1:1 | Tenant | N | (t,src,dst) | — | **BLOCKED(고아)** |
| ET-ANA-000001 | REL-ANA-000001 | DERIVED_FROM | Metric→Order/AdPerf | N:M | Tenant | Y(period) | (t,src,dst,valid_from) | 1.0 | CANDIDATE |
| ET-ANA-000002 | (신규) | SUPPORTED_BY | Recommendation→Insight | N:M | Tenant | N | (t,src,dst) | conf | CANDIDATE |
| ET-ANA-000003 | (신규) | BASED_ON | DecisionProposal→Recommendation | N:M | Tenant | N | (t,src,dst) | conf | CANDIDATE |
| ET-AUT-000002 | REL-AUT-000009 | EXECUTED_FOR | AutomationRun→TargetEntity | N:1 | Tenant | N | (t,src,dst) | 1.0 | CANDIDATE |
| ET-SEC-000001 | REL-ORG(scope) | SCOPED_TO | *→Tenant/Workspace | N:1 | Tenant | N | (t,src,dst) | 1.0 | VERIFIED |
| ET-ER-000001 | (ER) | POSSIBLY_SAME_AS | SourceObject↔Customer | N:M | Tenant | N | (t,src,dst) | ER score | CANDIDATE |

**표준 Edge명 단일화**(§3.2): PURCHASED(≠BOUGHT/ORDERED). Inverse는 별도 이름 금지·방향속성으로.

## 6. 시간성 모델 (§11)
- **Transaction Time**(created_at)+**Valid Time**(valid_from/to) 이원. **Bitemporal 검토 대상**: User Role·Customer Segment·Product Category·Campaign Target·Pricing·Subscription·Attribution·Automation Eligibility(과거 시점 관계 재현 필요분). 시간가변 Edge는 Unique Key에 valid_from 포함(신규 버전=신규 Edge, 구버전 valid_to 마감).

## 7. 상태·삭제·Tombstone (§12/§13)
- 상태 화이트리스트: ACTIVE/INACTIVE/PENDING/UNVERIFIED/PARTIALLY_VERIFIED/VERIFIED/BLOCKED/DEPRECATED/ARCHIVED/TOMBSTONED/SYNC_ERROR/QUALITY_WARNING/SECURITY_RESTRICTED. 임의 문자열 금지.
- **삭제=원천삭제와 분리**: 외부 삭제 이벤트→즉시 물리삭제 금지→is_deleted/Tombstone 전환, 연결 Edge 정책 적용, Audit/Lineage 유지.

## 8. Uniqueness & Entity Resolution (§14/§15/§16)
- **중복 Node 방지키**: `(tenant_id, canonical_entity_id, canonical_record_id)` (외부오브젝트 `+source_*`). → graph_node에 UNIQUE 추가(후속·Backfill 후).
- **중복 Edge 방지키**: `(tenant_id, edge_type_id, source_node_id, target_node_id, valid_from, source_system)`. Event형(INTERACTED_WITH 다중 허용) vs 유일형(BELONGS_TO 단일) Edge Type별 명시.
- **Entity Resolution**: Shopify Customer/CRM Contact/Stripe Customer/Email Subscriber는 무조건 별도 Node 금지. ER 미확정 시 **SourceObject Node ↔ Canonical Customer Node 분리 + `POSSIBLY_SAME_AS`(ET-ER-000001) 후보관계**. **확신 없이 SAME_AS 확정 금지**(D/E 승인병합만 CONNECTED_TO 확정).

## 9. 신뢰도·품질·Lineage (§17/§18)
- Node/Edge에 quality_score·trust_score·confidence_score 필수. 산출/참조 = Source Reliability·Auth·Freshness·Completeness·Cross-Source·Duplicate·ER Confidence·Mapping·Model·Human Verification(Vol3 엔진 재사용). **낮은 Confidence는 AI 추천·자동화 제한**(Vol4/5).
- **Lineage**: source_system·source_record_id·mapping_rule·sync_run/event·projection_version·수정이력 추적. **Lineage 없으면 status=UNVERIFIED/QUALITY_WARNING**.

## 10. Schema Versioning (§19)
- graph_schema_version 관리: Effective Date·Breaking여부·Node/Edge/Property 변경·Migration/Rebuild 필요·Compatibility 기간·Rollback. **기존 Property 즉시삭제 금지**(Deprecated 후 호환기간).

## 11. Traversal 권한 & 민감정보 최소화 (§20/§21)
- 권한 구분: Direct Node/Edge Read·1-Hop·Multi-Hop·**Sensitive Path Traversal**·Aggregate·Export·Admin·Service-to-Service. 예: 일반 사용자 **Customer→Credential→Secret 경로 탐색 금지**. RBAC(viewer<connector<analyst<admin) 매핑·Application+Query Layer 이중검증·**Cross-Tenant Deny 절대**.
- **미저장(직접복제 금지)**: Password·OAuth Access/Refresh Token·API Secret·카드정보·전체주소·민감 PII·보안설정·원본Header·인증Cookie. → Secret Reference / Canonical Store Reference만(No-PII 승계).

## 12. Projection & Validation (§22/§23)
- **Projection 재생성 가능 필수**(원천에서 rebuild). Type별 Projection Source·Trigger·Incremental·Full Rebuild·Reconciliation·Failure Recovery·Lag·Idempotency·Ordering·DLQ 정의(상세=후속 02-C). Projection 로직 다중 서비스 중복구현 금지.
- **Schema Validation**(생성 전): [Node] 등록타입·승인 CE·필수필드·Tenant Scope·SoT·중복키·민감정보 부재·Lineage. [Edge] 등록타입·Source/Target 타입 허용·Tenant 일치·Cardinality 미위반·중복 아님·Valid Time·권한·Lineage. → 정적+런타임 Validator(후속 구현).

## 13. §32 완료 보고 수치
승인 Node Type: VERIFIED 8·CANDIDATE 17·재사용 1·UNVERIFIED 1·BLOCKED 1(=총 28) · 승인 Edge Type: VERIFIED 8·CANDIDATE 9·재사용 1·BLOCKED 2·ER 1(=총 21) · Unverified 1(ModelVersion) · Duplicate Candidate 0(표준명 단일화로 방지) · Temporal Type: Node 8·Edge 7 · Sensitive Type: Customer/User/Session/Raw/Audit 등 6 · Tenant Scoped 대부분·Global Reference 2(Tenant/Channel) · Schema Validation Rule=Node 8+Edge 9 · Security Risk 0 · Migration/Rebuild 필요=graph_node/edge UNIQUE+컬럼 ALTER(후속·Backfill) · 문서=본 마스터+ADR+PM · Validator=계획(정적+런타임) · 남은리스크=OrderItem BLOCKED·볼륨노드(Conversion/Raw) Projection·ModelVersion 영속·A 실적재 · **EPIC02-C(Projection/Sync/Reconciliation) 준비 완료**. 코드변경 0.
