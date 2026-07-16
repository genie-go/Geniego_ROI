# Canonical DSAR Structured Discovery Query — Template/Parameterization, Scope Predicate Verification, Projection/Cost/Pagination/Timeout, Read-only/Replica, Temporal/Soft-delete, JSON/NoSQL/Warehouse/Lakehouse/Event/Time-series/Graph/Vector/Feature & Candidate/Dedup

> **EPIC 06-A Part 3-3-3-3-3-2** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `Db.php` isMysql() 이중방언·PDO prepared(bind param 관행)·`Dsar::collectSubjectData`(컬럼 SELECT·LIMIT·`WHERE tenant_id=?`) · **Warehouse/Graph/Vector/Feature Store 실인프라 부재→해당 Adapter=미래목표(NOT_APPLICABLE)** · Part 3-3-3-3-3-1 Query Template/Candidate/Duplicate.
> 형제: [`CANONICAL_DSAR_STRUCTURED_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_STRUCTURED_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_STRUCTURED_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_STRUCTURED_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_STRUCTURED_DATA_DISCOVERY.md`](../architecture/ADR_DSAR_STRUCTURED_DATA_DISCOVERY.md)

---

## 1. Query Template (§18-19) · Parameterization (§20) · Dynamic Object (§21)

**Template Schema(§18)**: structured_query_template_id · discovery_source_id · structured_object_id · operation · supported_identifier_types · required_scope_predicates · optional_predicates · selected_fields · join_objects · join_conditions · date_predicate · deletion_predicate · temporal_mode · ordering · pagination_strategy · result_limit · cost_threshold · timeout · transaction_isolation · parameter_schema · result_schema · evidence_fields · version · status · test_cases · owner. **상태(§19)**: DRAFT/VALIDATING/APPROVED/ACTIVE/ACTIVE_WITH_LIMITS/SUSPENDED/DEPRECATED/BLOCKED/TEST_ONLY. **★이중방언(MySQL/SQLite) 지원**(현행 isMysql 분기 정합). **Matrix(§100)**: | Template | Source | Object | Identifier | Scope Predicates | Date Predicate | Selected Fields | Limit | Cost | Version | Status |
**Parameterization(§20)**: Bind Parameter · Prepared Statement · Typed Parameter · Identifier/Date Type Validation · **Tenant/Brand Server Binding** · Object Allowlist · Sort Field Allowlist · Pagination Token Validation · Result Limit Server Enforcement · Template Version Validation.
**Dynamic Object(§21)**: Table/Collection/Index 이름 **Client 입력 직접 금지** → Registry ID 입력·Server-side Mapping·Allowlist·Tenant/Environment/Version 검증·Audit.

---

## 2. Scope Enforcement (§22-25)

**Row-level Scope(§22)**: 모든 Query 에 tenant_id·workspace_id·brand_id·legal_entity_id·source_account_id·environment·subject_identifier·date_range·deletion_status Predicate 포함(적용가능 시). **★DB RLS 있어도 Template Predicate 추가검증**(현행 native RLS 부재→필수).
**Scope Predicate Verification(§23)**: 실행 전 **Query Plan/AST 검사** — Tenant/Brand/Subject/Date/Environment Predicate 존재·**Join 후 Scope 유지·Subquery/Union Branch/CTE Scope 유지·View 내부 Scope**. **★ORM/Middleware 자동 Scope 가정 금지(§3.3)**.
**Column Projection(§24)**: Candidate 단계 기본 = Record ID·Subject Match Field·Tenant/Brand Field·Date Field·Data Category Indicator·Source Version·Deletion Status·Minimal Match Evidence. **★`SELECT *` 기본 금지(§3.4)** — Full Payload/Sensitive=별도 Review Query.
**Result Minimization(§25)**: Password Hash·MFA Secret·API Key·Payment Credential·Full Government ID·Full Document Image·Private Key·Raw Consent Evidence·무관 Free Text·다른 Subject Field·Internal Security Secret **기본 제외**.

---

## 3. Date/Partition/Index/Cost/Limit/Pagination/Timeout (§26-35)

**Date Range(§26)**: 대형 Event/History Table 필수 — DSAR Scope·Customer Relationship·Retention·Source Historical Coverage·Request Type·Verification Scope·Jurisdiction·Archive Coverage 기준.
**Partition Pruning(§27)**: Partition Predicate 존재·Type 일치·Timezone 안전·Date Boundary·Historical/Deleted/Archive/Tenant/Source Account Partition. **실패 시 대형 Query 차단/Warehouse Batch 전환**. **Index(§28)**: tenant_id+customer_profile_id/person_id/normalized_email/normalized_phone/external_customer_id·source_account_id+external_id·tenant_id+event_at·hashed_identifier+hash_version. **Index 추가=운영 쓰기성능/비용 검토 후**.
**Cost Estimation(§29)**: Estimated Rows/Bytes·Partition Count·Index Usage·Join Cardinality·Sort Cost·Spill Risk·Warehouse Credits·Expected Latency·Concurrency Impact·Result Size. **상태(§30)**: LOW/MODERATE/HIGH/VERY_HIGH/PROHIBITIVE/UNKNOWN — **`PROHIBITIVE`·`UNKNOWN`=운영 DB 자동실행 차단**. **대응(§31)**: Result Field/Date Range 축소·Identifier 분할·Index·Read Replica/Warehouse 전환·Async Batch·Partition별 실행·Manual Approval·Query 취소·Scope 재검토.
**Result Limit(§32)**: Page Size·Max Candidate·Max Raw Bytes·Max Source Total·Max Query Time·Max Concurrent·Max Identifier Batch·Max Join Depth. **Pagination(§33)**: KEYSET/CURSOR/CONTINUATION_TOKEN/PARTITION_CURSOR/EVENT_TIME_CURSOR·OFFSET_LIMIT 제한적. **★대형 Table OFFSET 전체순회 기본 금지**. **Token(§34)**: request_id·task_id·source_id·query_template_version·scope_version·last_key·partition·issued/expires_at·integrity_signature·environment.
**Timeout/Cancellation(§35)**: Connection/Statement/Lock/Job Timeout·Cancellation Token·Kill Query·Transaction Cleanup·Temporary Object Cleanup·Retry Eligibility·Audit.

---

## 4. Read-only Credential (§36) · Read Replica (§37-38) · Isolation (§39)

**Read-only(§36)**: Schema Usage·Table/View Select·Explain·제한 Metadata·Temporary Read-only Session 만. **금지**: INSERT/UPDATE/DELETE/DDL/GRANT/EXECUTE Unsafe Procedure/COPY External/Credential 관리/다른 Tenant Schema. **★Discovery Query 가 Row/Document/Index/Lock/Transaction/Sequence/Trigger/Session 변경 금지(§3.2)**.
**Read Replica(§37-38)**: 가능 시 Primary 대신 Read Replica/Analytics Replica/Warehouse/Snapshot 사용(**현행 replica 부재→미래**). Consistency 상태: STRONG/READ_AFTER_WRITE/EVENTUAL/LAGGED/UNKNOWN/STALE/BLOCKED — **DSAR Access 결과에 Replica Lag·Source of Truth 검증여부 기록**.
**Isolation(§39)**: READ COMMITTED/REPEATABLE READ/SNAPSHOT/AS OF SYSTEM TIME/READ ONLY TRANSACTION/EVENTUAL READ — **장시간 Lock Isolation 회피**.

---

## 5. Temporal (§40-41) · Soft Delete (§42-43)

**Temporal Query(§40)**: Current Row·Historical Version·Valid-time/Transaction-time History·Audit History·CDC History·Snapshot History·Soft-deleted History. **As-of Contract(§41)**: as_of_time·temporal_mode·timezone·source_temporal_capability·historical_table·version_field·retention_limit·result_confidence·gaps·evidence.
**Soft Delete Discovery(§42)**: Active Table·Soft-deleted Row·History/Tombstone/Audit/Archive Table·Warehouse Historical Copy·Search Index/Graph/Vector 잔존 모두 조사. **★Active Table 부재 ≠ 데이터 부존재(§3.6)**. **Tombstone(§43)**: Tombstone 자체=최소 개인데이터 → Candidate 기록하되 삭제사실·시각·범위·재수집 방지 Reference·Hash·Legal Hold·Retention·원문 부재 구분. (Part 3-3-3-2 Deletion Tombstone 정합.)

---

## 6. JSON/Nested (§44-45) · NoSQL (§46-47) · Key-value (§48) · Wide-column (§49)

**JSON/Nested(§44)**: JSON Path Registry·Nested Identifier/Tenant Path·Array Element Match·Key-value Attribute·Flattened Warehouse Column·Free-form Properties·Schema Version별 Path·Unknown Key Detection. **금지(§45)**: 모든 JSON Key Full Scan·Regex 전체 Payload·Tenant Predicate 없는 JSON Search·PII Payload 로그·Dynamic JSON Path 무검증·전체 Document 반환·Unknown Schema 자동 Complete. (현행 result_json·brand_json·config_json 등 JSON 컬럼 정합.)
**NoSQL(§46)**: shard/partition key·tenant field·subject identifiers·nested paths·indexes·date field·soft delete field·consistency·pagination·max result·operator allowlist·aggregation pipeline policy. **Operator Allowlist(§47)**: equality·bounded range·in-list 제한·array contains·indexed prefix·aggregation·projection·sort·lookup/join 제한. **고비용 Regex/Server-side Script/Unbounded Aggregation 제한**. (현행 NoSQL 부재→미래.)
**Key-value(§48)**: 직접 Subject Key·Tenant-prefixed Key·Composite Key·Secondary Index·TTL·Cache·Persistent/Session Store·Tombstone 구분. **Key Pattern 전체 Scan 기본 금지**. **Wide-column(§49)**: Partition/Clustering/Tenant Key·Time Bucket·Query Pattern·Tombstone Density·Consistency·Pagination·Secondary Index·Materialized View. **Partition Key 없는 Cluster 전체 Scan 금지**. (현행 KV/Wide-column 부재→미래.)

---

## 7. Warehouse/Lakehouse/DataLake (§50-55) · Event/Time-series (§56-59)

**★현행 Warehouse/Lakehouse/DataLake 실인프라 부재 → 본 절=미래목표 계약(도입 시 등록)**.
**Warehouse(§50-52)**: Dataset·Schema·Table·Partition·Cluster Key·Load Frequency·Source Lineage·Last Load·Freshness·Delete Propagation·PII Masking·Historical Coverage·Tenant Mapping·Cost Model·Resource Group. Governance: Resource Group 격리·Query Tag·Cost/Byte Scan Limit·Timeout·Concurrency·Result Cache·Temp Table Cleanup·**Export 금지**·Tenant Predicate·Partition Filter·Audit. Query Tag=dsar_request_id·discovery_task_id·tenant_id·purpose·query_template_version·actor_service·environment(**Raw Identifier 포함 금지**).
**Lakehouse(§53-54)**: Delta/Iceberg/Hudi/Parquet Managed/External/Catalog View·Snapshot/Manifest/Partition/Schema Evolution/Delete File(Equality/Position)/Vacuum/Time Travel/Compaction/Hidden Partition. Time Travel=Retention·삭제 Subject 재노출 위험·Snapshot ID·Version·Legal Hold·Scope·Temp Cleanup·Audit 검증 후만. **DataLake(§55)**: Catalog 등록·Partition Pruning·Column Projection·Predicate Pushdown·Tenant Partition·File Manifest·Schema Version·Encryption·Result Limit·Temp Cleanup.
**Event Store(§56-57)**: Subject/Profile/External ID·Event Type·Event/Ingestion Time·Source Account·Tenant/Brand·Event Version·Dedup ID·Invalid/Rejected/Late/Corrected Event. Window=DSAR Date Scope·Raw Event Retention·Late Arrival·Correction Window·Historical Coverage·Warehouse Archive·Attribution Window·Identity Link Validity. (현행=raw_vendor_event/normalized_activity_event MySQL 테이블.)
**Time-series(§58-59)**: Tenant Filter·Subject Tag·Time Range·Measurement Allowlist·Field Projection·Downsampled/Raw 구분·Retention Tier·Aggregate Series 구분. Aggregate=Individual/Device/Household/Cohort/Fully Anonymous/Pseudonymous Series 구분(개인 연결가능성 확인).

---

## 8. Graph (§60-63) · Vector (§64-67) · Feature Store (§68-69) · Dedup (§70-71) · Candidate (§73-74)

**★현행 Graph DB/Vector DB/Feature Store 실인프라 부재("graph"=GraphScore MySQL score)→본 절=미래목표**.
**Graph(§60-63)**: Node(Person/Profile/Account/Identifier/Device/Order/Consent/Audience/Campaign/Support/External). Traversal Contract=start_node·verified_subject_binding·allowed/prohibited_edge_types·**max_depth**·tenant/brand/temporal_predicate·node_label_allowlist·result_limit·cycle_handling·shared_node_handling·evidence. **금지(§62)**: 무제한 Depth·모든 Edge·Tenant Predicate 없는 Traversal·**Shared Email Node 통한 다른 Person 확장**·Household/Company 전체 자동포함·Deleted Node 무시·Graph Result 직접 Export. Shared Node(§63)=Email/Phone/Address/Device/IP/Household/Company/Browser/Payment Token/Delivery Location → Neighbor 자동 Subject Data 포함 금지(§3.8).
**Vector(§64-67)**: Metadata 필수(vector_record_id·tenant/brand_id·subject_id/source_document_reference·data_category·purpose·model/embedding_version·source_created/updated_at·expiry·deletion_status·source_system). **★Similarity ≠ Identity Proof(§3.7)** → ①Verified Metadata Filter ②Source Document ID ③Subject ID ④Profile ID ⑤Tenant/Brand ⑥Exact Metadata Match 우선·Similarity=누락 Source 탐지 보조만. Candidate=vector_record·source_document·subject_metadata·tenant/brand_match·model/embedding_version·source_deletion_status·match_basis·similarity 사용여부·inclusion·evidence. **Deletion Gap(§67)**: Source Document 삭제 후 Vector 잔존·Tenant/Subject Metadata 누락·Old Embedding/Re-embed/Backup Vector 잔존·Deleted Subject 재검색.
**Feature Store(§68-69)**: feature_id·group·subject_key·tenant·event/created_time·model_consumers·purpose·source_lineage·freshness·expiry·online/offline_store·deletion_behavior. Candidate=Raw/Derived/Prediction Input/Training/Online Current/Offline Historical/Aggregate/**Sensitive Proxy** Feature 구분.
**Dedup(§70-71)**: Source Table ID·Primary Key·Source Record Version·Materialization Time·Load ID·Content Hash·Lineage·Replica Lag·Transformation 비교(SoT 기준 대표·Replica=Lineage 유지). Search Index=Tenant Alias·Index Pattern Allowlist·Subject/Keyword/Normalized Field·Date Filter·Source Document ID·Index Version·Old Index·Deleted Document·Refresh Lag·Result Limit(**`_all` Broad·Wildcard Leading·Script Query·Old Index 자동포함 금지**).
**Candidate(§73-74)**: Source Record Reference·Canonical Entity Candidate·Subject Match·Tenant/Brand·Date·Data Category·Sensitivity·Deletion Status·Source of Truth·Record Version·Duplicate Group·Lineage 표준화. **★Candidate Store=전체 Row/Document 대신 Reference·Minimal Match Fields·Classification·Hash·Version·Evidence 우선**(Full Payload=암호화 임시 Review Store 제한적).
