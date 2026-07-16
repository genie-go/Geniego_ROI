# Canonical DSAR Discovery Schema — Entity Model, Source Registry, Source-of-Truth, Capability/Health, Search Scope & Subject Identifier Set

> **EPIC 06-A Part 3-3-3-3-3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): 기존 DSAR discovery=`Dsar::collectSubjectData`(subject email/phone → customerIds/orderIds → **하드코딩 ~8테이블** channel_orders·crm_activities·crm_channel_prefs·crm_customers·email_sends·email_suppression·journey_enrollments·sms_messages·Registry/Coverage/Gap/SoT 구분 부재) · `DataPlatform.data_source`(tenant·source_type[subscriber_owned/external_channel]·source_channel·source_account·source_credential_id·data_kind·source_priority·status·last_seen_at·reliability_score·dataLineage=data_source+connector_sync_log — **분석수집용 부분 Source Registry**) · `DataExport`(data_export_destination/run=아웃바운드·별개) · `Connectors`/connector_sync_log · `CRM`/`CustomerAI`(customer 360) · Db.php(MySQL+SQLite fallback) · EPIC05 Customer Identity Graph · Part 3-3-3-3-1 DSAR Scope/Fulfillment Job · Part 3-3-3-3-2 Verification Token/Identity Match.
> 형제: [`CANONICAL_DSAR_DISCOVERY_PLANNER.md`](CANONICAL_DSAR_DISCOVERY_PLANNER.md) · [`CANONICAL_DSAR_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_ENTERPRISE_DATA_DISCOVERY_ARCHITECTURE.md`](../architecture/ADR_DSAR_ENTERPRISE_DATA_DISCOVERY_ARCHITECTURE.md)
> **성격**: 목표 계약. 세부 Adapter(SQL/NoSQL/Warehouse/SaaS/File/Archive/Processor)=Part 3-3-3-3-3-2~5. Export=Part 3-3-3-3-4. 실 Registry/Planner 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `Dsar::collectSubjectData` **하드코딩 8테이블** lookup(email/phone→customerIds/orderIds) | Discovery Source Registry + Planner + Candidate 로 형식화(하드코딩 → 등록기반·Coverage/Gap 명시) |
| `DataPlatform.data_source`(source_type/channel/account/credential/priority·subscriber_owned/external_channel) | **Discovery Source Registry 로 확장**(분석수집 소스 → DSAR discovery 소스 편입·중복 신설 금지) |
| `reliability_score`·dataQuality·dataLineage(272차) | Source Health·Coverage·Discovery Lineage 로 편입 |
| `DataExport`(data_export_destination/run·아웃바운드 스케줄) | `KEEP_SEPARATE`(아웃바운드 Export≠DSAR Subject Discovery)·Part 3-3-3-3-4 연계 |
| `Connectors`+connector_sync_log(채널 자격/동기화 상태) | Source Health·Connector Credential Binding |
| **Search Scope(Verification Token 기반)·Subject Identifier Set(trust/shared/conflict)·Discovery Planner/Plan/Task·Query Template(tenant filter 강제)·Candidate/Match/Exclusion·Coverage/Gap·Checkpoint/Idempotency 부재** | 신설 |
| Db.php MySQL+SQLite fallback(2 storage) | Source of Truth·Replica 구분 대상 |

**무후퇴**: `collectSubjectData` discovery·`DataPlatform.data_source`·`Connectors`/sync_log·`CRM`/`CustomerAI` 360·`DataExport`·Db fallback 은 **정본 — 재구현 금지, Canonical Discovery Planner·Source Adapter 아래 통합**. Request Type별(Access/Export/Correction/Restriction/Erasure)·Source별(DB/SaaS/Archive/Processor) 독립 Discovery Planner 신설 금지(§96).

---

## 1. Canonical Data Discovery Entity Model (§4)

Entity: `DISCOVERY_SOURCE(_VERSION)` · `DISCOVERY_SOURCE_ACCOUNT` · `DISCOVERY_CAPABILITY` · `DISCOVERY_SOURCE_HEALTH` · `DISCOVERY_POLICY(_VERSION)` · `DISCOVERY_SEARCH_SCOPE` · `DISCOVERY_SUBJECT_IDENTIFIER_SET` · `DISCOVERY_SEARCH_IDENTIFIER` · `DISCOVERY_SEARCH_STRATEGY` · `DISCOVERY_SOURCE_PRIORITY` · `DISCOVERY_PLAN(_VERSION)` · `DISCOVERY_TASK` · `DISCOVERY_DEPENDENCY` · `DISCOVERY_QUERY_TEMPLATE` · `DISCOVERY_ADAPTER` · `DISCOVERY_JOB(_CHECKPOINT)` · `DISCOVERY_SEARCH_CANDIDATE` · `DISCOVERY_MATCH_RESULT` · `DISCOVERY_EXCLUSION` · `DISCOVERY_COVERAGE_RESULT` · `DISCOVERY_GAP` · `DISCOVERY_EVIDENCE` · `DISCOVERY_RECONCILIATION` · `DISCOVERY_AUDIT_EVENT`. (기존 등가=data_source/collectSubjectData/connector_sync_log → 확장·나머지 신규. CE Registry 등재.)

---

## 2. Discovery Source Registry (§5-8)

**Schema(§5)**: discovery_source_id · data_asset_id · source_name · source_type · source_of_truth_status · tenant/workspace/brand/legal_entity_scope · environment · region · jurisdiction_scope · storage_or_service · source_account_ids · connector_id · credential_reference · schema_reference · data_categories · sensitive_categories · subject_types · **searchable_identifiers** · supported_operations · search_mode · owner · technical_owner · privacy_owner · processor_id · subprocessor_ids · status · version · certification_status · created/updated/last_verified_at.
**Source Type(§6, 41종)**: RELATIONAL/NOSQL_DATABASE · DATA_WAREHOUSE/LAKE/LAKEHOUSE · EVENT_STORE · TIME_SERIES/GRAPH/VECTOR_DATABASE · SEARCH_INDEX · CACHE · QUEUE · DLQ · OBJECT/FILE/ARCHIVE/BACKUP_STORAGE · CRM · ERP · COMMERCE/PAYMENT/MARKETING/EMAIL/SMS/PUSH/ADVERTISING/ANALYTICS/CUSTOMER_SUPPORT_PLATFORM · IDENTITY/AUTHENTICATION/CONSENT/FRAUD/SECURITY_PLATFORM · AI_PROVIDER · DOCUMENT_PLATFORM · EMAIL_MAILBOX · SHARED_DRIVE · **MANUAL_SYSTEM** · THIRD_PARTY_PROCESSOR · LEGACY_SYSTEM.
**Source of Truth(§7, 15종)**: CANONICAL_SOURCE_OF_TRUTH · DOMAIN_SOURCE_OF_TRUTH · AUTHORIZED_REPLICA · DERIVED_PROJECTION · ANALYTICS_COPY · SEARCH_INDEX_COPY · CACHE_COPY · ARCHIVE_COPY · BACKUP_COPY · EXTERNAL_PROCESSOR_COPY · TEMPORARY_COPY · LEGACY_SOURCE · UNVERIFIED_SOURCE · **ORPHAN_SOURCE · SHADOW_SOURCE**.
**상태(§8)**: DRAFT/DISCOVERED/MAPPED/VALIDATING/READY/READY_WITH_WARNINGS/PARTIAL_CAPABILITY/MANUAL_ONLY/DEGRADED/DISCONNECTED/CREDENTIAL_EXPIRED/SCHEMA_DRIFT/PERMISSION_BLOCKED/REGION_BLOCKED/DEPRECATED/RETIRED/BLOCKED/UNVERIFIED. **Matrix(§89)**: | Source ID | Source Type | Source of Truth | Tenant Scope | Search Identifiers | Capabilities | Health | Region | Owner | Status |

---

## 3. Discovery Capability (§9-11) & Health (§12-14)

**Capability Type(§9, 26종)**: SUBJECT_LOOKUP · IDENTIFIER_LOOKUP · ACCOUNT_LOOKUP · DATE_RANGE_FILTER · TENANT/BRAND/LEGAL_ENTITY_FILTER · DATA_CATEGORY/PROCESSING_ACTIVITY_FILTER · FULL_TEXT_SEARCH · EXACT/HASH/PREFIX_MATCH · GRAPH_TRAVERSAL · ARCHIVE/BACKUP_SEARCH · HISTORICAL/AS_OF_QUERY · EXPORT · RECTIFICATION · RESTRICTION · DELETE · ANONYMIZE · PROCESSOR_REQUEST · MANUAL_REVIEW. **필수(§10)**: capability_id · discovery_source_id · capability_type · supported_identifier_types · supported_filters · query_limitations · maximum_date_range/result_size · pagination · rate_limit · consistency · latency_expectation · historical/archive_coverage · permission/privacy_restriction · status · version · last_tested_at.
**Search Mode(§11)**: REALTIME_API · BATCH_QUERY · DATABASE_QUERY · CONNECTOR_QUERY · ASYNC_JOB · FILE_SCAN · ARCHIVE_RESTORE_REQUIRED · PROCESSOR_REQUEST · MANUAL_SEARCH · UNSUPPORTED.
**Health(§12)**: source_health_id · discovery_source_id · connector/credential/permission/schema/query_status · latency · error_rate · rate_limit_status · last_success/failure · last_schema_check · last_coverage_test · health_status · blockers · checked_at. **상태(§13)**: HEALTHY/HEALTHY_WITH_WARNINGS/DEGRADED/PARTIAL/DISCONNECTED/CREDENTIAL_EXPIRED/PERMISSION_DENIED/SCHEMA_DRIFT/RATE_LIMITED/TIMEOUT/MANUAL_ONLY/UNKNOWN/BLOCKED. (현행 connector_sync_log/reliability_score 확장.)
**Readiness Gate(§14)**: Plan 포함 전 Registry 등록·Owner·Scope·Data Category·Search Capability·Connector/Credential·Permission·Schema·Tenant Filter·Environment·Region·Privacy Approval·Query Audit·Result Handling·Error Contract 확인. **★Critical Source Health Unknown 이면 Discovery Complete 선언 금지(§3.5)**.

---

## 4. Search Scope Contract (§15-17) — Verification 기반 서버생성

**Schema(§15)**: discovery_scope_id · dsar_request_id · fulfillment_job_id · **verification_token_reference** · subject_id · customer_profile_ids · person_ids · account_ids · tenant_id · workspace/brand/legal_entity_ids · jurisdictions · request_type/subtypes · data_category_ids · sensitive_category_ids · processing_activity_ids · source_system_ids · source_account_ids · date_from/to · environment · excluded_sources · excluded_data_categories · requested_format · scope_version · approved_by · status · created/updated_at.
**상태(§16)**: DRAFT/VALIDATING/IDENTITY_REVIEW_REQUIRED/AUTHORIZATION_REVIEW_REQUIRED/PRIVACY_REVIEW_REQUIRED/APPROVAL_REQUIRED/APPROVED/APPROVED_WITH_LIMITS/EXPANSION_REQUESTED/SUSPENDED/EXPIRED/BLOCKED/COMPLETED.
**생성 원칙(§17·§3.1·3.2)**: **★Client 입력(Email/Phone/Customer ID) 직접신뢰 금지** → DSAR Request Scope + Verification Decision(Part 3-3-3-3-2 Token) + Authorization Scope + Customer Identity Registry(EPIC05) + Tenant/Brand/Legal Entity + Request Type + Data Category + Date Range + Processing Activity + Jurisdiction + Retention/Archive/Legal Hold + Privacy Policy 기반 서버생성.

---

## 5. Subject Identifier Set (§18-23)

**Identifier Type(§18, 22종)**: CUSTOMER_PROFILE_ID · PERSON_ID · ACCOUNT_ID · EMAIL · HASHED_EMAIL · PHONE · HASHED_PHONE · DEVICE_ID · COOKIE_ID · ANONYMOUS_ID · CRM_CONTACT_ID · COMMERCE_CUSTOMER_ID · ORDER_CUSTOMER_ID · PAYMENT_CUSTOMER_ID · SUPPORT_CONTACT_ID · PLATFORM_USER_ID · EXTERNAL_CUSTOMER_ID · ADVERTISING_IDENTIFIER · PUSH_TOKEN · CONTRACT_ID · BUSINESS_ACCOUNT_ID · LEGACY_CUSTOMER_ID.
**Set Schema(§19)**: identifier_set_id · request_id · subject_id · **identity_version** · generated_at · source_identity_records · identifiers · excluded/shared/revoked/deleted_identifiers · source_account_mappings · tenant/brand_bindings · trust_level · valid_until · policy_version · lineage_id · audit_reference.
**Search Identifier Schema(§20)**: search_identifier_id · identifier_set_id · identifier_type · normalized_value_reference · hashed_value · tokenized_reference · tenant/brand/source_account_binding · valid_from/to · verification_status · ownership_confidence · identity_confidence · shared_risk · reuse_risk · deleted_status · allowed/prohibited_source_types · sensitivity · priority · search_allowed · reason_codes. **★Raw Identifier 를 Job Payload/로그에 불필요 포함 금지(§3.7)**.
**Trust Level(§21)**: VERIFIED_HIGH/MEDIUM/LOW · UNVERIFIED · SHARED · REUSED · CONFLICT · REVOKED · DELETED · BLOCKED.
**사용 원칙(§22·§3.3)**: High Trust 우선 · Exact ID 우선 · Tenant/Brand Bound 우선 · Source-specific External ID 활용 · **Shared Identifier=보조검색만** · Conflict Identifier=자동 Scope 확장 금지 · Deleted=Tombstone 확인용 제한 · Unverified 단독 Full Search 금지.
**Normalization(§23)**: Email 소문자/공백 · Phone E.164 · External ID=Source Account Binding · Hashed=Algorithm/Version · Device=Platform Scope · Cookie=Domain Scope · Push Token=App/Environment Scope. **★Normalization 오류로 다른 Subject 검색 방지 Golden Test**.

---

## 6. Scope Minimization (§24) & Expansion Governance (§25-26)

**Minimization(§24)**: 필요한 Data Category/Source/기간/Tenant/Brand/Identifier/Environment/Processor/Archive Partition 만. **★Full Platform Scan 기본값 금지**.
**Expansion(§25)**: expansion_request_id · original_scope · requested_expansion · reason · evidence · privacy_risk · wrong_subject_risk · expected_coverage_gain · requester_authorization_impact · approval · status · created_at · audit. **상태(§26)**: REQUESTED/VALIDATING/APPROVED/APPROVED_WITH_LIMITS/REJECTED/MANUAL_REVIEW/EXPIRED/BLOCKED. **★자동 전체 Tenant/전체 기간 확대 금지**.
