# Canonical DSAR SaaS Discovery Retrieval — Search Capability/Mode/Strategy/Policy, Endpoint/API Version, Retrieval/Pagination/Rate Limit/Retry/Circuit Breaker, Async/Webhook, Manual Portal, Deleted/Historical, Candidate/Dedup

> **EPIC 06-A Part 3-3-3-3-3-3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `AdAdapters`(Meta v19.0/Google v17·페이지네이션/레이트리밋 관행)·`Connectors`(채널 API·env+DB credential)·`OAuth`(token refresh)·`Webhooks`·`connector_sync_log` · **DSAR Subject Retrieval 미존재(ingest/outbound만)→본 계약 신설** · Part 3-3-3-3-3-1 Candidate/Duplicate/Coverage.
> 형제: [`CANONICAL_DSAR_SAAS_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_SAAS_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_SAAS_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_SAAS_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_SAAS_DISCOVERY_FOUNDATION.md`](../architecture/ADR_DSAR_SAAS_DISCOVERY_FOUNDATION.md)

---

## 1. Search Capability (§30) · Mode (§31) · Policy (§32) · Strategy (§33-34)

**Capability(§30, 20종)**: EXACT_ID_LOOKUP · EMAIL/PHONE/HASHED_IDENTIFIER/EXTERNAL_ID/ACCOUNT_LOOKUP · DATE_RANGE/STATUS_FILTER · DELETED/ARCHIVED_RECORD_LOOKUP · FULL_TEXT_SEARCH · BULK/ASYNC_EXPORT · AUDIT_LOG_SEARCH · WEBHOOK_HISTORY · MANUAL_PORTAL_SEARCH · SUBJECT_EXPORT/DELETE/RECTIFICATION/RESTRICTION.
**Mode(§31)**: REALTIME_EXACT_LOOKUP/REALTIME_FILTERED_SEARCH/PAGINATED_LIST_FILTER/BULK_EXPORT/ASYNC_JOB/REPORT_GENERATION/WEBHOOK_REPLAY/AUDIT_LOG_QUERY/FILE_EXPORT/MANUAL_PORTAL_SEARCH/SUPPORT_REQUEST_TO_PROVIDER/UNSUPPORTED.
**Policy(§32)**: saas_discovery_policy_id · provider_categories/ids · request_types · object_categories · search_strategies · identifier_requirements · account_scope_requirements · deleted_record/archive/historical_coverage_requirements · manual_fallback · processor_request_requirement · maximum_api_calls/objects/date_range · partial_result_policy · retry_policy · SLA_policy · owner · version · status.
**Strategy(§33, 12종)**: Provider External ID Exact Lookup · Canonical External Mapping Lookup · Verified Email/Phone Lookup · Account Relationship Lookup · Paginated Filtered Search · Bulk Export(Server-side Filter) · Async Subject Export · Audit Log Search · Deleted/Archived Search · Manual Portal Search · Provider Support Request · Internal Sync Reconciliation. **우선순위(§34)**: ①Provider-specific Exact ID ②Source Account-bound External ID ③Verified Identifier ④Provider-native Subject Export ⑤Filtered Object Search ⑥Bulk Export ⑦Internal Sync + Provider Reconciliation ⑧Manual Portal ⑨Support Request. **★Broad Export=승인 Scope·최소 Object 만**.

---

## 2. Endpoint (§35-36) · API Version (§37-38)

**Endpoint(§35)**: endpoint_id · provider_id · connector_id · endpoint_name · HTTP_method · path_template · API_version · supported_objects/identifiers/filters · pagination_mode · rate_limit_profile · async 여부 · required_scopes/roles · result_schema · error_schema · deletion_state_behavior · historical_behavior · deprecation_date · status · version · test_cases. **★금지(§36)**: Provider Account ID 미검증 · Dynamic Base URL 무검증 · **Client 입력 Path 직접사용** · Raw Query String 결합 · Credential URL 포함 · Unbounded List Endpoint · Filter 없는 Bulk Export · Sandbox Endpoint Production 사용 · Deprecated Endpoint 신규사용 · Raw Response 전체 로그.
**API Version(§37)**: version_id · provider_id · version_name · release/deprecation/sunset_date · supported_endpoints · schema/permission/pagination/rate_limit_changes · migration_status · owner · status. **상태(§38)**: CURRENT/SUPPORTED/MIGRATION_REQUIRED/DEPRECATED/SUNSET_PENDING/SUNSET/BLOCKED/UNKNOWN. **★Sunset Endpoint 신규 DSAR 검색 사용 금지**. (현행 Meta v19/Google v17 버전관리 정합.)

---

## 3. Retrieval Request (§39-41) · Pagination (§42-44)

**Request(§39)**: retrieval_request_id · dsar_request_id · discovery_task_id · provider_id · provider_account_id · connector_id · endpoint_id · object_id · identifier_subset · scope_subset · date_range · status_filters · deleted/archived_inclusion · pagination_state · requested_at · idempotency_key · timeout · status · audit_reference. **상태(§40)**: CREATED/VALIDATING/READY/SENT/RUNNING/PAGINATING/WAITING_ASYNC_JOB/WAITING_WEBHOOK/PARTIAL/COMPLETED/COMPLETED_WITH_WARNINGS/RATE_LIMITED/RETRYING/FAILED/CANCELLED/BLOCKED. **보안(§41)**: Verified Request Binding · Provider Account Binding · Tenant/Brand Scope · Credential Binding · Required Scope Verification · Endpoint Allowlist · Typed Parameter · Date Range/Page Size/Response Size Limit · Timeout · Idempotency · PII-safe Logging · Audit.
**Pagination Mode(§42)**: OFFSET_LIMIT/PAGE_NUMBER/CURSOR/CONTINUATION_TOKEN/NEXT_LINK/CREATED_AT_CURSOR/UPDATED_AT_CURSOR/OBJECT_ID_CURSOR/ASYNC_FILE_CHUNK/NONE. **Contract(§43)**: initial_page_request · page_size · next_token_extraction · terminal_condition · token_expiry · token_scope_binding · duplicate/missing_page_detection · ordering_stability · retry_behavior · maximum_pages · total_count_reliability · evidence. **★완료 조건(§44)**: next_token 없음·has_more=false·next_link 없음·retrieved=confirmed_total·async 모든 Chunk 완료·end_cursor 도달·terminal_job_status 중 Provider 정의 검증. **★첫 페이지 성공을 전체 완료로 표시 금지(§3.4)**.

---

## 4. Rate Limit (§45-46) · Retry (§47) · Circuit Breaker (§48)

**Rate Limit Profile(§45)**: limit_scope · per-second/minute/hour_limit · daily_quota · burst_capacity · concurrent_request_limit · object/account-specific_limit · retry-after_support · quota_reset · priority_policy · shared_connector_impact. **대응(§46)**: Provider Header 확인 · Retry-After 준수 · Exponential Backoff · Jitter · Account별 Queue · Object별 Throttling · DSAR SLA Priority · Background Sync 분리 · Bulk API 전환 · Checkpoint · Partial 상태 · Alert.
**Retry(§47)**: 가능=Transient 5xx/Network Timeout/Rate Limit/Temporary Provider Error/Access Token 정상 Refresh/Async Job Pending/Temporary Lock. **금지·Manual Review**=Invalid Scope/Permission Denied/**Wrong Provider Account**/Invalid Identifier/Schema Incompatible/Object Unsupported/Authorization Failure/Provider Contract Restriction/Permanent 4xx/Cross-Tenant Risk.
**Circuit Breaker(§48)**: CLOSED/OPEN/HALF_OPEN/MANUAL_HOLD/BLOCKED. Trigger=연속실패·높은 Error Rate·Permission Error 급증·Schema Drift·Credential Failure·Wrong-account 응답·Provider Incident·Rate Limit 지속. (285차 11번가 -997·N+1 장애 교훈 정합.)

---

## 5. Async Export (§49-51) · Webhook (§52-54)

**Async Job(§49)**: async_job_id · retrieval_request_id · provider_job_id · provider_account_id · object_scope · requested_format · filter_summary · requested/accepted_at · status · progress · expected_completion · result_location · result_checksum · result_expiry · polling_interval · webhook_correlation · completed/failed_at · error · audit. **상태(§50)**: REQUESTED/ACCEPTED/QUEUED/PROCESSING/PARTIAL/COMPLETED/COMPLETED_WITH_WARNINGS/FAILED/EXPIRED/CANCELLED/UNKNOWN/MANUAL_REVIEW. **Result 보안(§51)**: **Signed URL 검증·URL Host Allowlist**·짧은 Expiry·One-time Download·TLS·Checksum·Malware Scan·File Size Limit·Encryption·Temporary Storage·Scope 검증·Download 후 Cleanup·Audit.
**Webhook Correlation(§52)**: provider_id · provider_account_id · application_id · event_id · job_id · object_id · correlation_id · signature · event_time · delivery_time · attempt · payload_hash. **보안(§53)**: **Signature/Timestamp 검증·Replay 방지**·Provider Account 확인·Event ID Dedup·Payload Size Limit·Schema Validation·Secret Rotation·IP Allowlist·Raw Payload 최소보존·Audit. **★불일치(§54)**: Webhook 완료/API Pending·Webhook 실패/API Completed·Account/Object/Job ID 불일치·Result URL 만료·중복/늦은 Webhook → **Provider Reconciliation 실행**(§3.7 Webhook=Event Evidence·현재상태≠확정). (현행 Webhooks.php 정합.)

---

## 6. Manual Portal (§55-57) · Deleted/Historical (§58-60) · Candidate/Dedup (§61-65)

**Manual Search(§55)**: manual_search_task_id · provider_id · provider_account_id · portal_URL_reference · authorized_role · assigned_owner · request_scope · search_identifiers · search_procedure_version · screenshots_allowed 여부 · evidence_requirement · download_restriction · completion_due_date · review_requirement · status · result_summary · audit_reference. **상태(§56)**: NOT_REQUIRED/READY/ASSIGNED/IN_PROGRESS/WAITING_PROVIDER/REVIEW_REQUIRED/COMPLETED/COMPLETED_WITH_WARNINGS/FAILED/OVERDUE/BLOCKED. **★금지(§57)**: 개인계정 무단사용·다른 Tenant Account 검색·전체 Account Export·Scope 초과 조회·Local PC 장기저장·개인 Email 전달·Evidence 없는 완료·Screenshot 무관 고객노출·Credential 공유·Audit 없는 Download. **★API 없어도 Registry 누락 금지(§3.9)**.
**Deleted/Archived(§58)**: ACTIVE/INACTIVE/ARCHIVED/DELETED_SOFT/DELETED_HARD/ANONYMIZED/MERGED/DUPLICATE/SUPPRESSED/UNSUBSCRIBED/BOUNCED/COMPLAINT/SUSPENDED/CLOSED 조사. **원칙(§59)**: API 기본 제외 여부·Deleted Endpoint 존재·Audit Log 전용·Soft Delete 기간·Hard Delete 후 Tombstone·Internal Sync 잔존·Provider Backup/Retention·Merged Alias·Recreated ID 위험. **Historical Coverage(§60)**: earliest_available_date · default/maximum_query_window · archive_support · audit_log_period · deleted_record_period · export_period · account_creation_date · retention_policy · contract_limitation · confidence · last_verified_at.
**Candidate(§61)**: saas_candidate_id · request_id · discovery_task_id · provider_id · provider_account_id · application_id · connector_id · object_id · provider_record_id · canonical_entity_candidate · identifier_matches · account/tenant/brand/date_match · status · deleted_status · data_categories · sensitivity · match_confidence · duplicate_group · raw_payload_reference · response_version · discovered/normalized_at · lineage_id · evidence_reference. **Match 상태(§62)**: EXACT_PROVIDER_ID/EXACT_EXTERNAL_ID/STRONG_VERIFIED_IDENTIFIER/PARTIAL_IDENTIFIER/SHARED_IDENTIFIER/MULTIPLE_RECORD_MATCH·ACCOUNT/TENANT/BRAND/DATE_RANGE_MISMATCH·DELETED_RECORD/MERGED_RECORD_MATCH·DUPLICATE·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED. **Payload 최소화(§63·§3.8)**: Reference·Minimal Match Fields·Classification·Status·Hash·Response Version·Evidence 우선(Raw=암호화 임시 Review Store 짧은 TTL).
**Dedup(§64-65)**: Provider Record ID·External ID·Canonical Customer Mapping·Account ID·Content Hash·Updated At·Object Version·Internal Sync Record ID·Webhook Event ID·Export File Row ID·Merge Alias 기준. **Provider SoT vs Internal Operational Replica/Warehouse/Search Index/Webhook Event/Export Snapshot/Archive/Manual Evidence 구분** → 대표 Candidate + Lineage Copy(§3.3 내부 Sync 만으로 Provider 전체 대표 금지). **Matrix(§106)**: | Request | Providers | Accounts | Objects | Active | Deleted | Historical | Async | Manual | Internal Sync | Overall |
