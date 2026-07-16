# Canonical DSAR Structured Discovery Governance — Evidence, Coverage/Gap, Schema Drift, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-2** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `Db.php`(MySQL+SQLite·isMysql)·`Dsar::collectSubjectData`·2677 tenant_id 필터·self-healing ensureTables(Schema Drift 대상)·SecurityAudit · Part 3-3-3-3-3-1 Coverage/Gap/Evidence · Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_STRUCTURED_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_STRUCTURED_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_STRUCTURED_DISCOVERY_QUERY.md`](CANONICAL_DSAR_STRUCTURED_DISCOVERY_QUERY.md) · ADR=[`../architecture/ADR_DSAR_STRUCTURED_DATA_DISCOVERY.md`](../architecture/ADR_DSAR_STRUCTURED_DATA_DISCOVERY.md)

---

## 1. Structured Query Evidence (§75-76)

**Evidence(§75)**: request_id · task_id · source_id · database/schema/object_registry_id · query_template_version · **query_plan_hash** · scope_version · identifier_set_version · parameter_hash · **tenant/brand/date_predicate_verified** · selected_fields · estimated_cost · actual_rows · actual_bytes · pages · started/completed_at · timeout · cancellation · result_hash · adapter_version · audit_reference.
**Query Text 보존(§76)**: **★Raw Query Text 에 PII 미포함(Parameterized 강제)** → Template ID·Version·Query Hash·Parameter Hash·Scope Reference·실행통계 우선기록.

---

## 2. Coverage (§77) & Gap (§78) & Schema Drift (§79-80)

**Coverage Dimension(§77)**: Registered Database·Schema·Object·Identifier Field·Tenant Scope·Date·Soft Delete·History Table·Warehouse·Graph·Vector·Feature Store·Query Success·Evidence Coverage. **Matrix(§101)**: | Request | Databases | Objects | Identifier Coverage | Tenant Coverage | Current | Deleted | Historical | Graph | Vector | Overall |
**Gap Type(§78, 21종)**: DATABASE/SCHEMA/TABLE/COLLECTION_UNREGISTERED · IDENTIFIER_FIELD_MISSING · TENANT/BRAND_FIELD_MISSING · PERSONAL_DATA/SENSITIVE_MAPPING_MISSING · QUERY_TEMPLATE_MISSING · INDEX_MISSING · PARTITION_FILTER_MISSING · SOFT_DELETE_NOT_SEARCHED · HISTORY_TABLE_NOT_SEARCHED · WAREHOUSE_LAG_UNKNOWN · GRAPH_SCOPE_UNSAFE · VECTOR_METADATA_MISSING · FEATURE_STORE_UNMAPPED · SCHEMA_DRIFT · QUERY_PERMISSION_BLOCKED · QUERY_COST_PROHIBITIVE.
**Schema Drift Detection(§79)**: Column 추가/삭제·Type 변경·Identifier/Tenant Field 변경·JSON Path 변경·Collection Schema 변경·Partition/Index/View Definition 변경·Warehouse Transformation·Graph Label/Edge·Vector Metadata·Feature Schema 변경. (현행 self-healing ensureTables 가 Drift 유발원 — 컬럼 add 감지.) **Drift 대응(§80)**: ①영향 Query Template 중지 ②Source `SCHEMA_DRIFT` ③자동 재스캔 ④Mapping 비교 ⑤Data Owner 확인 ⑥Template Version 생성 ⑦Golden Test ⑧재승인 ⑨Coverage 재계산 ⑩Audit.

---

## 3. Static Lint (§81) & Runtime Guard (§82)

**Static Lint(§81)**: Raw SQL String Concatenation · **`SELECT *`** · Tenant/Brand/Environment Predicate 누락 · 대형 Table Date Predicate 누락 · Parameter Type 미검증 · Dynamic Table Name · Unbounded NoSQL Query · Regex Full Scan · OFFSET 대량 Pagination · Result Limit 누락 · Timeout 누락 · **Read-write Credential 사용** · Full Payload Candidate 저장 · Graph Max Depth 누락 · Vector Metadata Filter 누락 · Warehouse Query Tag 누락 · Query Template Version 누락 · Evidence 생성누락 · Soft Delete Table 누락 · Test Dataset 포함.
**Runtime Guard(§82)**: Invalid Verification Token · Scope Version 불일치 · Query Template 미승인 · **Tenant/Brand Predicate 미적용** · Wrong Schema/Database · Read-write Credential · Query Cost Prohibitive · Date Range 초과 · Result Limit 초과 · Query Timeout 초과 · Schema Drift Critical · Replica Stale · **Cross-Tenant Join** · Shared Graph Node Broad Expansion · **Vector Similarity-only Subject Match** · Test/Demo Dataset · Full Payload 무승인 조회 · **Kill Switch**.

---

## 4. Error (§83) & Warning (§84)

**Error(§83, 23종)**: SOURCE_PROFILE_NOT_FOUND · OBJECT_NOT_REGISTERED · FIELD_MAPPING_MISSING · IDENTIFIER_FIELD_MISSING · TENANT_SCOPE_FIELD_MISSING · QUERY_TEMPLATE_NOT_FOUND · QUERY_TEMPLATE_NOT_APPROVED · QUERY_PARAMETER_INVALID · QUERY_SCOPE_VIOLATION · QUERY_COST_PROHIBITIVE · QUERY_TIMEOUT · QUERY_CANCELLED · RESULT_LIMIT_EXCEEDED · SCHEMA_DRIFT · REPLICA_STALE · PARTITION_FILTER_REQUIRED · INDEX_REQUIRED · TEMPORAL_QUERY_UNSUPPORTED · GRAPH_SCOPE_UNSAFE · VECTOR_METADATA_MISSING · FEATURE_STORE_MAPPING_MISSING · PERMISSION_DENIED · RUNTIME_BLOCKED (모두 `STRUCTURED_` 접두).
**Warning(§84, 14종)**: SOURCE_REPLICA_LAG · SCHEMA_WARNING · QUERY_COST_HIGH · INDEX_RECOMMENDED · PARTIAL_DATE_COVERAGE · SOFT_DELETE_COVERAGE_WARNING · HISTORY_TABLE_WARNING · WAREHOUSE_FRESHNESS_WARNING · GRAPH_SHARED_NODE_WARNING · VECTOR_ORPHAN_WARNING · FEATURE_EXPIRY_WARNING · LEGACY_QUERY_USED · MANUAL_REVIEW_REQUIRED · COVERAGE_WARNING (모두 `STRUCTURED_` 접두).

---

## 5. Golden Dataset (§85) · Adapter Conformance (§86) · Equivalence (§87-88)

**Golden(§85·55+ 시나리오)**: MySQL Person ID/Customer Profile/Account 조회 · Tenant/Brand Predicate 검증 · Cross-Tenant Join 차단 · `SELECT *`/Raw SQL Injection 차단 · Parameter Type 오류 · Dynamic Table Name 차단 · Date Partition Pruning/Partition Filter 누락 차단 · Keyset Pagination/Cursor Resume · Query Timeout/Cancellation · High Cost 차단 · Read Replica/Replica Lag Warning · Temporal As-of · Soft-deleted/History/Tombstone 조회 · JSON Email Path/Array Identifier/Unknown Path Warning · Document Exact/NoSQL Regex Full Scan 차단 · Key-value Direct/Key Pattern Full Scan 차단 · Wide-column Partition · Warehouse Partition/Byte Limit · Lakehouse Time Travel/Deleted File · Event Date Window/Late Event · Time-series Subject Tag/Aggregate 구분 · Graph Person Traversal/Shared Email 확장/Max Depth 차단 · Vector Metadata Exact/Similarity-only 차단/Source 삭제 후 Vector 잔존 탐지 · Feature Online/Offline/Sensitive Proxy · Materialized View Duplicate · Search Index Old Version 제외 · Schema Drift Column 추가/Tenant Field 변경 · Query Evidence/Candidate Minimal Payload · Coverage Complete/Critical Gap. (**★현행 미존재 Engine 시나리오=NOT_APPLICABLE 표기·미래 검증**.)
**Conformance(§86)**: Relational DB·Document DB·Key-value·Wide-column·Warehouse·Lakehouse·Event Store·Time-series·Graph·Vector DB·Feature Store·Search Index 에 동일 Contract(Source Profile·Object Registry·Field Mapping·Tenant Scope·Identifier·Query Template·Parameterization·Cost·Timeout·Pagination·Candidate·Evidence·Coverage·Gap·Audit).
**Equivalence(§87)**: 기존 `collectSubjectData`·Customer 360·CRM Query 와 비교(Object Coverage·Identifier Match·Tenant/Brand Scope·Date Coverage·Current/Deleted/Historical Row·Candidate/Duplicate Count·Query Cost·Latency·Error·Warning). **Difference(§88)**: MATCH·EXPECTED_{SCOPE/IDENTIFIER/DELETED_DATA/HISTORY/DUPLICATE/QUERY_SAFETY}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_DISCOVERY_GAP·LEGACY_DATA_LOSS_RISK**·CANONICAL_STRUCTURED_DISCOVERY_DEFECT·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·고객영향 `LEGACY_SECURITY_DEFECT`·`LEGACY_DISCOVERY_GAP`=운영전환 차단**.

---

## 6. Observability (§89) · Alert (§90) · Audit (§91)

**Metrics(§89)**: Registered Database/Object Count·Field Mapping/Identifier/Tenant Field Coverage·Query Count·Success/Failure·Timeout·Cancellation·Cost 분포·Rows/Bytes Scanned·Result Count·Full Scan Block·Cross-Tenant Block·Schema Drift·Replica Lag·Soft Delete/Historical/Warehouse/Graph/Vector/Feature Candidate·Duplicate·Coverage Gap·Legacy Usage·P50/P95/P99.
**Alert(§90)**: Tenant Predicate 누락·Cross-Tenant Join 시도·Full Scan 시도·Cost 급증·Timeout 급증·Read-write Credential 사용·Schema Drift Critical·Identifier Field 삭제·Tenant Field 변경·Warehouse Load 지연·Soft Delete 검색누락·Graph Shared Node 확장·Vector Metadata 누락·Deleted Source Vector 잔존·Test Dataset 검색·Coverage Critical Gap·Legacy Query 신규사용·Evidence 누락.
**Audit Event(§91, 23종)**: SOURCE_PROFILE_CREATED · OBJECT_REGISTERED · FIELD_MAPPING_CREATED · IDENTIFIER_FIELD_REGISTERED · QUERY_TEMPLATE_CREATED/APPROVED · QUERY_PLAN_ESTIMATED · QUERY_STARTED/COMPLETED/FAILED/CANCELLED/BLOCKED · RESULT_PAGE_CREATED · CANDIDATE_NORMALIZED · DUPLICATE_GROUPED · TEMPORAL_QUERY_EXECUTED · SOFT_DELETE_DISCOVERED · GRAPH_TRAVERSAL_EXECUTED · VECTOR_RECORD_DISCOVERED · SCHEMA_DRIFT_DETECTED · COVERAGE_CALCULATED · GAP_DETECTED · RUNTIME_BLOCKED (모두 `STRUCTURED_` 접두·SecurityAudit 확장).

---

## 7. Existing Implementation Classification (§92) & Duplicate Audit (§93) & Regression Gate (§94)

**분류(§92)**: 실측 결과 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `Db.php`(MySQL+SQLite·isMysql 이중방언·PDO prepared) | `VALIDATED_LEGACY` → Source Profile/Query Template 이중방언 기반 | 정본 연결계층·재사용 |
| `Dsar::collectSubjectData`(하드코딩 8테이블·컬럼 SELECT·LIMIT·tenant_id) | `MIGRATION_REQUIRED` → `CANONICAL_SQL_DISCOVERY_ADAPTER`/Candidate | Registry/Coverage/Gap/Schema Drift 부재 → Template 기반 형식화(기능 보존) |
| 2677 `WHERE tenant_id=?` 애플리케이션 필터 | `CONSOLIDATION_REQUIRED` → Scope Predicate Verification | native RLS 부재 → AST/Plan 검증 강제 |
| priceopt/returns/supplychain.sqlite(도메인 DB) | `LEGACY_ADAPTER` → 별도 Source Profile | 도메인격리 SQLite=별도 RELATIONAL_DATABASE Source |
| self-healing ensureTables(migrations 172+) | `VALIDATED_LEGACY` → Schema Drift Detection 대상 | 컬럼 add=Drift 유발원 |
| GraphScore(MySQL identity score) | `KEEP_SEPARATE_WITH_REASON` | Graph DB 아님·Identifier/Match 보조만 |
| **Warehouse/Lakehouse/Graph DB/Vector DB/Feature Store Adapter** | `UNVERIFIED`(미래·NOT_APPLICABLE) | **실인프라 부재 — 지어내기 금지·도입 시 등록** |
| Structured Query Template/Field Mapping/Candidate/Coverage/Gap 부재 | 신설 | 현행 부재 |
**Duplicate Audit(§93)**: 실측 — SQL 연결=`Db.php` 단일·DSAR SQL discovery=`collectSubjectData` 단일·tenant 필터=관행(헬퍼 산발 → Scope Predicate Verification 로 통합). **중복 Query Builder/Candidate Normalizer/Soft Delete Search 신설 위험만 차단**(§105 Engine별 독립 Planner/Candidate Store 금지).
**Regression Gate(§94)**: 변경 전후 Person/Profile/Email/Phone/External ID Search·Tenant/Brand Scope·Date Filter·Pagination·Query Timeout·Cost Guard·Read Replica·Current/Soft-deleted/Historical/Warehouse/Graph/Vector Data·Feature Store·Duplicate·Evidence·Coverage·Audit·**Existing API Compatibility**(collectSubjectData·CRM·CustomerAI 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 8. 완료 상태 요약

Structured Entity 20 · Source Profile · DB Type 19(현행 MySQL/SQLite·나머지 미래) · Tenant Isolation 10(현행 ROW_LEVEL/SHARED_APP) · Object Type 22/상태 · Field Mapping · Identifier Field 21/Scope/Temporal 15/Deletion 10 · Personal/Sensitive Mapping · Query Template(이중방언)/Parameterization/Dynamic Object · Scope Predicate Verification · Column Projection/Minimization · Date/Partition/Index · Cost 6상태/Result Limit/Pagination 6/Timeout · Read-only/Replica 7상태/Isolation · Temporal/As-of/Soft Delete/Tombstone · JSON/NoSQL/KV/Wide-column · Warehouse/Lakehouse/DataLake(미래)/Event/Time-series · Graph(미래)/Vector(미래)/Feature Store(미래)/Dedup/Search Index · Candidate Normalization/Payload · Evidence · Coverage 14차원/Gap 21유형 · Schema Drift/대응 10 · Static Lint 21/Runtime Guard 18 · Error 23/Warning 14 · Golden 55+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★현행 미존재 인프라(Warehouse/Graph/Vector/Feature)=NOT_APPLICABLE 정직표기·도입 시 등록**. **실 Adapter/Query Template/Candidate/CI가드 구현 = Part 3-3-3-3-3-3~8(후속 승인 세션·verify+배포승인).**
