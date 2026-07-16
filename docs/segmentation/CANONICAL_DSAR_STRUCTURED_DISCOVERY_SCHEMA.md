# Canonical DSAR Structured Discovery Schema — Entity Model, Source Profile, DB/Isolation Registry, Object/Field Mapping & Identifier/Scope/Temporal/Deletion/PII Registries

> **EPIC 06-A Part 3-3-3-3-3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `Db.php` — **MySQL primary**(`geniego_roi`/`geniego_roi_demo`) + **SQLite fallback**(`data/genie_{name}.sqlite`·`/tmp/genie_roi_{name}.sqlite`)·`isMysql()` 이중방언·self-healing `ensureTables`(migrations 172 이후 핸들러별) · **도메인 SQLite** `priceopt.sqlite`·`returns.sqlite`·`supplychain.sqlite`(별도 DB) · **테넌트격리=ROW_LEVEL_TENANT_KEY/SHARED_APPLICATION_FILTER**(`WHERE tenant_id=?` 2677 refs·native RLS 부재) · `Dsar::collectSubjectData`(하드코딩 8테이블·특정컬럼 SELECT·LIMIT·tenant_id) · Part 3-3-3-3-3-1 Discovery Source Registry/Scope/Planner/Candidate · Part 3-3-3-3-2 Verification Token · EPIC05 Identity Graph.
> **★정직(§실측)**: 현재 스택에 **Warehouse/Lakehouse/Graph DB/Vector DB/Feature Store/Read Replica 실인프라 부재**(bigquery/snowflake/pinecone/neo4j/read_replica grep=Connectors/DataExport 아웃바운드 대상·주석뿐). "graph"=GraphScore(MySQL 산출 identity score)≠Graph DB. 해당 Source Type=**NOT_APPLICABLE/미래목표**(지어내기 금지·전방호환 선언만).
> 형제: [`CANONICAL_DSAR_STRUCTURED_DISCOVERY_QUERY.md`](CANONICAL_DSAR_STRUCTURED_DISCOVERY_QUERY.md) · [`CANONICAL_DSAR_STRUCTURED_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_STRUCTURED_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_STRUCTURED_DATA_DISCOVERY.md`](../architecture/ADR_DSAR_STRUCTURED_DATA_DISCOVERY.md)

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| MySQL `geniego_roi`(+`_demo`) + SQLite fallback + priceopt/returns/supplychain.sqlite | Structured Source Profile 로 형식화(RELATIONAL_DATABASE·이중방언·도메인 DB 격리) |
| `Db.php isMysql()` 방언분기·self-healing ensureTables | Query Template 이중방언(MySQL/SQLite)·Schema Drift 대상 |
| **ROW_LEVEL_TENANT_KEY**(`WHERE tenant_id=?` 2677·native RLS 부재) | **Scope Predicate Verification 강제**(ORM/RLS 미신뢰·AST/Plan 검증·Join/CTE/Union Scope 유지) |
| `Dsar::collectSubjectData`(하드코딩 8테이블·컬럼 SELECT·LIMIT) | Structured Query Template Registry + Field Mapping + Candidate 로 형식화 |
| **Warehouse/Lakehouse/Graph DB/Vector DB/Feature Store/Read Replica 부재** | Source Type 선언(NOT_APPLICABLE/미래)·실인프라 도입 시 등록(**지어내기 금지**) |
| erasure=anonymize·일부 status 컬럼(soft delete 산발) | Deletion Status Field Registry·Soft Delete/Tombstone Discovery 형식화 |
| GraphScore(MySQL identity score) | Identifier/Match 보조·Graph DB 아님 명시 |

**무후퇴**: MySQL/SQLite 이중방언·도메인 SQLite 격리·tenant_id 필터·collectSubjectData·ensureTables·GraphScore 는 **정본 — 재구현 금지, Canonical Structured Discovery Adapter 아래 통합**. Database Engine별·Request Type별 독립 Planner/Candidate Store 신설 금지(§105).

---

## 1. Structured Discovery Entity Model (§4)

Entity: `STRUCTURED_DISCOVERY_SOURCE_PROFILE` · `DATABASE_CLUSTER` · `DATABASE_SCHEMA` · `STRUCTURED_DATA_OBJECT` · `STRUCTURED_FIELD_MAPPING` · `SUBJECT_IDENTIFIER_FIELD` · `TENANT_SCOPE_FIELD` · `BRAND_SCOPE_FIELD` · `TEMPORAL_FIELD` · `DELETION_STATUS_FIELD` · `STRUCTURED_QUERY_TEMPLATE` · `STRUCTURED_QUERY_PLAN` · `STRUCTURED_QUERY_EXECUTION` · `STRUCTURED_QUERY_RESULT_PAGE` · `STRUCTURED_RESULT_CANDIDATE` · `STRUCTURED_QUERY_EVIDENCE` · `STRUCTURED_SCHEMA_DRIFT_FINDING` · `STRUCTURED_COVERAGE_RESULT` · `STRUCTURED_DISCOVERY_GAP` · `STRUCTURED_DISCOVERY_AUDIT_EVENT`. (기존 등가=Db/collectSubjectData → 확장·나머지 신규.)

---

## 2. Structured Source Profile (§5) · DB Type (§6) · Tenant Isolation (§7)

**Profile(§5)**: source_profile_id · discovery_source_id · database_type · engine · engine_version · cluster_id · database_id · schema_or_catalog · environment · region · source_of_truth_status · **tenant_isolation_model · brand_isolation_model** · row_level_security_status · column_level_security_status · encryption_status · read_replica_availability · temporal_query_capability · historical_coverage · soft_delete_model · archive_relationship · query_cost_model · maximum_concurrency · owner · status · version · certification_status. **Matrix(§98)**: | Source | Engine | Isolation | Source of Truth | Objects | Identifier Fields | Tenant Field | Temporal | Replica | Status |
**Database Type(§6, 19종)**: POSTGRESQL · MYSQL · MARIADB · SQL_SERVER · ORACLE · SQLITE · DOCUMENT_DATABASE · KEY_VALUE_DATABASE · WIDE_COLUMN_DATABASE · DATA_WAREHOUSE · DATA_LAKE · LAKEHOUSE · EVENT_STORE · TIME_SERIES_DATABASE · GRAPH_DATABASE · VECTOR_DATABASE · FEATURE_STORE · STRUCTURED_SEARCH_INDEX · OTHER. **★실사용 Engine 만 활성화(§6)** — 현행=MYSQL·SQLITE 만. 나머지=NOT_APPLICABLE(미래).
**Tenant Isolation Model(§7)**: DATABASE_PER_TENANT · SCHEMA_PER_TENANT · TABLE_PER_TENANT · **ROW_LEVEL_TENANT_KEY**(현행) · SOURCE_ACCOUNT_ISOLATION · CLUSTER_PER_TENANT · SHARED_WITH_RLS · **SHARED_APPLICATION_FILTER**(현행) · NO_NATIVE_ISOLATION · UNKNOWN. **★`NO_NATIVE_ISOLATION`·`UNKNOWN`·`SHARED_APPLICATION_FILTER`=강화 Query Guard 요구**(native RLS 없는 현행이 여기 해당 → Scope Predicate Verification 필수).

---

## 3. Structured Data Object Registry (§8-10)

**Object Type(§8, 22종)**: TABLE · VIEW · MATERIALIZED_VIEW · COLLECTION · DOCUMENT_BUCKET · KEYSPACE · COLUMN_FAMILY · EXTERNAL_TABLE · ICEBERG/DELTA/HUDI_TABLE · EVENT_STREAM_TABLE · TIME_SERIES_MEASUREMENT · GRAPH_NODE_LABEL · GRAPH_EDGE_TYPE · VECTOR_COLLECTION · FEATURE_GROUP · SEARCH_INDEX · HISTORY_TABLE · AUDIT_TABLE · CDC_TABLE · TOMBSTONE_TABLE. (현행=TABLE·VIEW·AUDIT_TABLE(dsar_audit_log 등) 활성.)
**Schema(§9)**: structured_object_id · discovery_source_id · object_type · catalog · schema · object_name · physical_location · canonical_entity · source_of_truth_status · tenant_field · brand_field · primary_key · subject_identifier_fields · date_fields · deletion_status_fields · personal_data_fields · sensitive_fields · partition_fields · cluster_keys · indexes · row_count_estimate · historical_coverage · retention_policy · owner · version · status · last_schema_scan · certification_status. **Matrix(§99)**: | Object | Type | Canonical Entity | Tenant Field | Subject Fields | Date Field | Delete Field | PII Fields | Partition | Status |
**상태(§10)**: ACTIVE/ACTIVE_WITH_WARNINGS/READ_ONLY/HISTORICAL/ARCHIVED/DEPRECATED/RETIRED/SCHEMA_DRIFT/UNREGISTERED_DEPENDENCY/ORPHAN/SHADOW/BLOCKED/UNVERIFIED.

---

## 4. Structured Field Mapping (§11) & Identifier/Scope/Temporal/Deletion Registries (§12-15)

**Field Mapping(§11)**: field_mapping_id · structured_object_id · physical_field_name · canonical_field_id · data_type · nullable · array 여부 · nested_path · data_category · sensitivity · identifier_type · tenant_scope 여부 · brand_scope 여부 · temporal_role · deletion_role · encrypted/tokenized/hashed 여부 · masking_policy · searchable/exportable 여부 · correction/deletion_support · owner · version · status.
**Subject Identifier Field(§12, 21 Role)**: CANONICAL_PERSON_ID · CUSTOMER_PROFILE_ID · ACCOUNT_ID · EMAIL · NORMALIZED_EMAIL · HASHED_EMAIL · PHONE · NORMALIZED_PHONE · HASHED_PHONE · CRM_CONTACT_ID · COMMERCE/ORDER/PAYMENT_CUSTOMER_ID · SUPPORT_CONTACT_ID · DEVICE_ID · COOKIE_ID · EXTERNAL/LEGACY_CUSTOMER_ID · SOURCE_RECORD_ID · FOREIGN_KEY_TO_SUBJECT · EMBEDDED_SUBJECT_REFERENCE. (현행 crm_customers·channel_orders 컬럼 매핑.)
**Tenant/Brand Scope Field(§13)**: tenant_id · workspace_id · brand_id · store_id · legal_entity_id · source_account_id · environment · region field. **★없는 Shared Object=안전한 Join/Partition/Database Scope 격리근거 제시 필수**.
**Temporal Field(§14, 15 Role)**: CREATED_AT · UPDATED_AT · EVENT_AT · EFFECTIVE_FROM/TO · VALID_FROM/TO · DELETED_AT · ARCHIVED_AT · INGESTED_AT · PROCESSED_AT · SNAPSHOT_AT · VERSION_AT · TRANSACTION_TIME · BUSINESS_TIME.
**Deletion Status Field(§15)**: IS_DELETED · DELETED_AT · STATUS · TOMBSTONE · ANONYMIZED_AT · PURGED_AT · RETENTION_STATE · ARCHIVE_STATE · ACTIVE_FLAG · RECORD_VERSION_END. (현행 erasure=anonymize·산발 status → 형식화.)

---

## 5. Personal (§16) & Sensitive (§17) Data Mapping

**Personal(§16)**: 직접식별자 · 간접식별자 · Contact · Transaction · Behavioral · Marketing · Consent/Suppression · Derived Profile · Model Score · Free Text · JSON Payload · External Identifier · Security/Fraud · Audit Reference. **★자동분류 결과=Data Owner 검토 없이 최종확정 금지**.
**Sensitive(§17)**: Authentication Secret · Payment Credential · Government Identifier · Precise Location · Health · Biometric · Minor · Legal Privileged · Security Secret · Fraud Investigation · Vulnerability Inference · 기타 Registry Sensitive Category. (Part 3-3-3-1 Privacy Sensitive Category 정합·**실 컬럼 기준·허구 금지**.)
