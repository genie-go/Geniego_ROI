# Canonical DSAR Discovery Planner — Policy/Strategy/Priority, Planner/Plan/Task/Dependency, Query Template/Adapter, Job/Checkpoint/Retry/Idempotency/Cancellation, Candidate/Match/Exclusion, Duplicate/Partial, Coverage & Gap

> **EPIC 06-A Part 3-3-3-3-3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `Dsar::collectSubjectData`(하드코딩 8테이블·Candidate/Coverage/Gap 부재) · `DataPlatform.data_source`(source_priority) · `Connectors`/connector_sync_log · Db.php(MySQL+SQLite) · Part 3-3-3-3-1 DSAR Fulfillment Job/Dependency · Part 3-3-3-3-2 Verification Token/Identity Match · EPIC05 Identity Graph/Merge·Unmerge.
> 형제: [`CANONICAL_DSAR_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_ENTERPRISE_DATA_DISCOVERY_ARCHITECTURE.md`](../architecture/ADR_DSAR_ENTERPRISE_DATA_DISCOVERY_ARCHITECTURE.md)

---

## 1. Discovery Policy (§27-28) · Strategy (§29-30) · Source Priority (§31)

**Policy Schema(§27)**: discovery_policy_id · policy_name · applicable_request_types · subject_types · data_categories · source_types · search_strategies · identifier_trust_requirements · source_priority_rules · archive/backup/processor/manual_source_inclusion · maximum_scope · timeout/retry/partial_result_policy · gap_handling · approval_requirement · owner · version · status · effective_from/to. **상태(§28)**: DRAFT/REVIEW_REQUIRED/APPROVED/ACTIVE/RESTRICTED/SUSPENDED/SUPERSEDED/EXPIRED/BLOCKED.
**Strategy(§29, 15종)**: EXACT_CANONICAL_ID · EXACT_SOURCE_ID · VERIFIED_IDENTIFIER · HASHED_IDENTIFIER · ACCOUNT_RELATIONSHIP · IDENTITY_GRAPH_TRAVERSAL · DATE_BOUNDED_EVENT_SEARCH · PROCESSING_ACTIVITY_SEARCH · DATA_CATEGORY_SEARCH · ARCHIVE_PARTITION_SEARCH · BACKUP_MANIFEST_SEARCH · FULL_TEXT_REVIEW · PROCESSOR_REQUEST · MANUAL_SOURCE_REVIEW · GAP_RECONCILIATION. **우선순위(§30)**: ①Canonical Person/Profile ID ②Source-specific External ID ③Verified Tenant-bound Identifier ④Account Relationship ⑤Identity Graph ⑥Verified Hashed Identifier ⑦**Shared/Low-trust=보조검색** ⑧Full-text/Manual ⑨Broad Search=승인 후 제한적.
**Source Priority(§31)**: Source of Truth·Data Authority·Schema Certification·Temporal Accuracy·Data Completeness/Quality·Identity Binding·Auditability·Retention Status·Processor Response·Replica Lag·Manual Evidence 고려. (DataPlatform source_priority 확장.)

---

## 2. Discovery Planner (§32-35)

**Input(§32)**: DSAR Request·Verified Subject·Verification Token·Authorization·Search Scope·Identifier Set·Source Registry·Source Health·Discovery Capability·Data Category·Request Type·Date Range·Retention/Archive·Processor Registry·SLA·Risk·Policy Version.
**Plan Schema(§33)**: discovery_plan_id · plan_version_id · request_id · fulfillment_job_id · discovery_scope_id · identifier_set_id · policy_id · selected/excluded_sources · source_priority · search_strategies · task_graph · parallel_groups · sequential_dependencies · archive/processor/manual_tasks · timeout · retry · checkpoints · expected_coverage · expected_latency · expected_cost · privacy_risk · wrong_subject_risk · approval_status · status · created/approved_at · audit_reference. **상태(§34)**: DRAFT/PLANNING/VALIDATING/APPROVAL_REQUIRED/APPROVED/READY/RUNNING/PARTIAL/PAUSED/CANCELLED/COMPLETED/FAILED/GAP_DETECTED/MANUAL_REVIEW/BLOCKED. **Matrix(§90)**: | Plan ID | Request | Scope Version | Sources | Strategies | Tasks | Expected Coverage | Risk | Approval | Status |
**★Planner 절대규칙(§35)**: Source Health Unknown 이면 Critical Source 자동완료 금지 · Tenant Filter 미지원 Source=별도 안전 Strategy · **Scope 보다 넓은 Query 금지** · Search Result 를 Export Result 로 직접사용 금지 · Manual/Processor Source 누락 금지 · Archive 가능성 검토 · Backup 검색=별도 승인·정책 · **Test 환경 자동제외** · Wrong-subject Risk High=Plan 차단.

---

## 3. Discovery Task (§36-38) & Dependency Graph (§39)

**Task Schema(§36)**: discovery_task_id · discovery_plan_id · source_id · source_account_id · adapter_id · task_type · query_template_id · identifier_subset · scope_subset · dependency_ids · priority · execution_mode · status · started/completed/timeout_at · checkpoint_id · attempt_count · result/candidate/exclusion_count · error_code · evidence_reference · audit_reference. **Type(§37, 18종)**: SOURCE_HEALTH_CHECK · CAPABILITY_CHECK · SCHEMA_VALIDATE · EXACT_ID_SEARCH · IDENTIFIER_SEARCH · ACCOUNT_SEARCH · EVENT_SEARCH · ARCHIVE_SEARCH · BACKUP_MANIFEST_SEARCH · PROCESSOR_REQUEST · MANUAL_SEARCH · RESULT_NORMALIZE · MATCH_VALIDATE · DEDUPLICATE · CLASSIFY · COVERAGE_VALIDATE · GAP_ANALYZE · EVIDENCE_GENERATE. **상태(§38)**: NOT_STARTED/READY/BLOCKED_BY_DEPENDENCY/RUNNING/WAITING_SOURCE/WAITING_PROCESSOR/WAITING_MANUAL_REVIEW/PARTIAL/COMPLETED/FAILED/RETRYING/TIMED_OUT/RATE_LIMITED/CANCELLED/SKIPPED_WITH_REASON/BLOCKED.
**Dependency(§39)**: Verification Token·Scope Approval·Identifier Set·Source Health·Connector Credential·Schema Validation·Archive Restore·Processor Response·Manual Review·Identity Match·Deduplication·Data Classification·Coverage Validation. **★순환 Dependency 탐지·차단**.

---

## 4. Query Template (§40-41) & Adapter Contract (§42-43)

**Template Schema(§40)**: query_template_id · source_type · source_id · operation · supported_identifiers · supported_filters · **required_tenant_filter · required_brand_filter · required_environment_filter** · date_range_support · parameter_schema · result_schema · pagination · maximum_result_size · timeout · privacy_review · security_review · version · status · test_cases. **★금지(§41)**: Raw String Concatenation · Tenant Filter 누락 · Scope 외 Wildcard · Unbounded Date Range · Select All Full Payload 기본값 · Credential 포함 · Verification Evidence 포함 · Raw PII 로그 · Client 제공 Table Name 직접사용 · Dynamic SQL 무검증 · Path Traversal · Unsupported Full Scan.
**Adapter Contract(§42)**: health_check · validate_scope · validate_identifiers · estimate_query · execute_search · paginate · normalize_result · produce_evidence · checkpoint · retry · cancel · reconcile · explain_error. **보안(§43)**: Tenant/Brand Scope · Credential Vault · Least Privilege · **Parameterized Query** · Rate Limit · Timeout · Result Size Limit · PII Redaction in Logs · Idempotency · Cancellation · Audit · Environment Isolation · Connector Account Binding. (세부 Adapter=Part 3-3-3-3-3-2~5.)

---

## 5. Search Candidate (§44) · Match (§45-47) · Exclusion (§48-49)

**★검색 결과 = 즉시 확정데이터 아님 → Candidate(§3.3·3.6)**. **Schema(§44)**: candidate_id · request_id · discovery_task_id · source_id · source_account_id · data_asset_id · source_record_reference · source_record_version · canonical_entity_candidate · subject_identifier_matches · tenant/brand/account_match · date_range_match · data_category · sensitivity · processing_activity · source_of_truth_status · match_confidence · match_status · duplicate_group · exclusion_status · discovered/normalized_at · lineage_id · evidence_reference. **Matrix(§91)**: | Candidate | Source | Subject Match | Tenant Match | Brand Match | Data Category | Confidence | Duplicate Group | Exclusion | Status |
**Match 상태(§45)**: EXACT_SUBJECT_MATCH/STRONG/PARTIAL/POSSIBLE_MATCH·SHARED_IDENTIFIER_MATCH·MULTIPLE_SUBJECT_MATCH·TENANT_MISMATCH·BRAND_MISMATCH·DATE_RANGE_MISMATCH·OUT_OF_SCOPE·IDENTITY_CONFLICT·DUPLICATE·EXCLUDED·MANUAL_REVIEW·BLOCKED. **Confidence(§46)**: VERY_HIGH/HIGH/MEDIUM/LOW/UNKNOWN — **단독 확정 금지**. **평가 Dimension(§47)**: Canonical/Source ID Match·Verified Identifier·Tenant/Brand·Account Relationship·Temporal·Identity Graph·Shared Identifier Risk·Source Authority·Record Ownership·Merge/Unmerge·Deleted Subject 상태.
**Exclusion(§48)**: exclusion_id · candidate_id/source_scope · exclusion_type · reason_code · legal_basis_reference · policy_version · excluded_by/at · review_required · override_allowed · evidence · audit. **Type(§49, 18종)**: WRONG_SUBJECT · CROSS_TENANT · WRONG_BRAND · OUT_OF_DATE_RANGE · OUT_OF_REQUEST_SCOPE · NON_PERSONAL_DATA · TEST_DATA · DEMO_DATA · DUPLICATE_REPLICA · SECURITY_SECRET · THIRD_PARTY_DATA · LEGAL_PRIVILEGE_REVIEW · TRADE_SECRET_REVIEW · DELETED_DATA_TOMBSTONE · UNVERIFIED_MATCH · CORRUPTED_RECORD · RETENTION_EXPIRED · MANUAL_REVIEW.

---

## 6. Duplicate/Replica (§50) & Partial Result (§51)

**Duplicate(§50)**: Canonical Record ID·Source Record ID·Event ID·Content Hash·Timestamp·Source Lineage·Replica Relationship·Warehouse Load ID·Archive Manifest·Provider External ID 로 그룹화 → **Source of Truth 기준 대표 Record 선정·Replica 존재는 Lineage 유지**(§3.4 중복 과다계산 금지). (Db.php MySQL/SQLite·DataPlatform replica 정합.)
**Partial Result(§51)**: COMPLETE/COMPLETE_WITH_WARNINGS/PARTIAL_SOURCE_FAILURE/PARTIAL_IDENTIFIER_COVERAGE/PARTIAL_DATE_COVERAGE/PROCESSOR_PENDING/ARCHIVE_PENDING/MANUAL_SOURCE_PENDING/PERMISSION_BLOCKED/SCHEMA_DRIFT/UNKNOWN_COMPLETENESS. **★Partial 을 `NO_DATA`/`COMPLETE` 로 표시 금지(§3.5)**.

---

## 7. Discovery Job (§52-53) · Checkpoint (§54) · Idempotency (§55) · Retry (§56) · Timeout (§57) · Cancellation (§58)

**Job Schema(§52)**: discovery_job_id · discovery_plan_id · request_id · scope/policy_version · started_at · expected_completion · status · current_checkpoint · completed/failed/pending_tasks · source_counts · candidate_counts · exclusion_counts · coverage_status · gap_count · error_summary · cancellation_status · audit_reference. **상태(§53)**: CREATED/VALIDATING/READY/RUNNING/PARTIAL/WAITING_EXTERNAL/WAITING_MANUAL/PAUSED/RETRYING/COMPLETED/COMPLETED_WITH_GAPS/FAILED/CANCELLED/ROLLED_BACK/BLOCKED.
**Checkpoint(§54)**: checkpoint_id · discovery_job_id · plan_version · completed_task_ids · source_cursors · pagination_tokens · date_partitions · processed_identifiers · candidate/exclusion_count · errors · created/expires_at · integrity_hash · audit_reference.
**Idempotency(§55)**: Key=request_id+discovery_plan_id+plan_version+scope_version+source_id+source_account_id+task_type+identifier_subset_hash+date_range+policy_version+environment. **★Retry 로 동일 Candidate/Evidence 중복생성 금지**.
**Retry(§56)**: Transient Network/Rate Limit/Credential Refresh/Source Timeout/Processor Delay/Schema Drift/Permission Denied/Invalid Query/Identity Conflict/Manual Source 구분. **Retry 불가 오류 무한반복 금지**. **Timeout(§57)**: Connection/Query/Job Timeout·Processor SLA·Manual Search Due·Archive Restore Timeout·Retry Window·Overall Deadline → Timeout=Partial/Gap 명시.
**Cancellation(§58)**: Request Withdrawal/Scope 변경/Security Incident 시 신규 Task 중지·Running Query 취소·Processor Request 취소검토·Temporary Result 정리·Candidate 상태기록·Evidence 보존·Audit·재시작 조건 기록. (Part 3-3-3-3-1 Withdrawal 정합.)

---

## 8. Coverage Model (§59-61) & Gap Detection (§62-64)

**Coverage Dimension(§59)**: Registered/Required Source·Identifier·Data Category·Date Range·Tenant/Brand·Processor·Archive·Manual Source·Search Capability·Source Health·Evidence Coverage. **★단순 검색성공률 아님**. **상태(§60)**: COMPLETE/COMPLETE_WITH_WARNINGS/PARTIAL/MAJOR_GAPS/UNKNOWN/NOT_APPLICABLE/BLOCKED. **Result Schema(§61)**: coverage_result_id · request_id · discovery_job_id · expected/searched/successful/failed/pending/excluded_sources · identifier/data_category/date/archive/processor/manual_source_coverage · overall_status · confidence · calculated_at · policy_version · evidence_reference. **Matrix(§92)**: | Request | Expected Sources | Searched | Successful | Failed | Pending | Identifier Coverage | Archive | Processor | Overall Status |
**Gap Detection(§62)**: Unregistered Source·Source without Owner/Search Capability/Tenant Filter·Disconnected Connector·Credential Expired·Schema Drift·Unsupported Identifier·Missing Date/Archive Coverage·Missing Processor Response·Missing Manual Review·Search Error·Permission Block·Unknown Source of Truth·**Shadow Copy·Orphan Data Asset**. **Gap Schema(§63)**: gap_id · request_id · discovery_job_id · source_or_asset · gap_type · severity · affected_data_categories/date_range/scope · reason · remediation · owner · due_date · status · evidence · audit. **Severity(§64)**: INFORMATIONAL/LOW/MEDIUM/HIGH/CRITICAL. **★HIGH/CRITICAL 후보**: Required Source 미검색·Cross-Tenant Filter 부재·Processor 데이터 미확인·Sensitive Data Source 누락·Shadow Copy·Wrong-subject Candidate·Discovery 완료 오표시 위험.
