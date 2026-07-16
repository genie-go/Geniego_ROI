# Canonical DSAR SaaS Discovery Governance — Health, Permission/Credential/Schema Drift, Reconciliation, Coverage/Gap, Evidence/Explain/Lineage, API/Permission/Override, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-1** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `connector_sync_log`(동기화 상태·285차 가짜녹색 systemic ok=>false 통일 교훈)·`channel_credential`(Crypto)·`OAuth` refresh·`AdAdapters` 버전·SecurityAudit · Part 3-3-3-3-3-1 Coverage/Gap · Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_SAAS_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_SAAS_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_SAAS_DISCOVERY_RETRIEVAL.md`](CANONICAL_DSAR_SAAS_DISCOVERY_RETRIEVAL.md) · ADR=[`../architecture/ADR_DSAR_SAAS_DISCOVERY_FOUNDATION.md`](../architecture/ADR_DSAR_SAAS_DISCOVERY_FOUNDATION.md)

---

## 1. Connector Health (§66-67) & Drift (§68-72)

**Health(§66)**: health_id · connector_id · provider_account_id · authentication/credential/permission/endpoint/rate_limit/webhook/async_job/schema_status · last_success/failure · error_rate · latency · backlog · health_status · blockers · checked_at. **상태(§67)**: HEALTHY/HEALTHY_WITH_WARNINGS/DEGRADED/RATE_LIMITED/CREDENTIAL_EXPIRING/CREDENTIAL_EXPIRED/PERMISSION_INSUFFICIENT/API_DEPRECATED/SCHEMA_DRIFT/WEBHOOK_FAILURE/ASYNC_JOB_DELAY/DISCONNECTED/UNKNOWN/BLOCKED. **★285차 가짜녹색 교훈**: 자격있는데 4xx 거부해도 ok 위장 금지 → 하드실패=`ok=false`+error(connector_sync_log 정본 정합).
**Permission Drift(§68-69)**: Registry Required Scope vs Configured vs Token Actual vs Provider Role vs Endpoint Required · Object/Export/Deleted/Audit Access · Write/Admin Excess 비교. 상태=MATCH/MISSING_REQUIRED_PERMISSION/PARTIAL_PERMISSION/**EXCESSIVE_PERMISSION**/REVOKED_PERMISSION/UNKNOWN_PERMISSION/ACCOUNT_ROLE_MISMATCH/BLOCKED.
**Credential Drift(§70)**: 만료일 불일치·Vault Reference 변경·Rotation 누락·Provider Account 변경·Sandbox Credential 사용·직원 개인 Token·Scope 변경·Refresh 실패·Token Revocation·Secret 노출 Incident.
**API/Schema Drift(§71-72)**: Endpoint 제거·API Version 변경·Field 추가/삭제·Type 변경·Pagination/Error Schema/Permission/Deleted Behavior/Rate Limit/Export Format/Webhook Event/Object Name 변경. **대응**: ①Connector 상태 변경 ②영향 Endpoint 중지 ③Provider Change Log 확인 ④Schema 비교 ⑤Field Mapping 재검토 ⑥Connector Version 생성 ⑦Golden Test ⑧재승인 ⑨Coverage 재계산 ⑩Audit. (현행 self-healing/버전차이 정합.)

---

## 2. Reconciliation (§80-81)

**비교(§80)**: Provider API vs Internal Sync · Provider Export vs Warehouse · Provider Current vs Webhook History · Provider Account Registry vs 실제 Account · OAuth Registry vs Token Actual Scope · Object Registry vs API Schema · Deleted Record vs Internal Active Copy · Provider Suppression vs Internal Suppression · Provider Retention vs Registry · Provider User/Contact Mapping vs Customer Identity. **상태(§81)**: MATCH/INTERNAL_MISSING/PROVIDER_MISSING/INTERNAL_STALE/PROVIDER_STALE/FIELD_MISMATCH/IDENTITY_MISMATCH/ACCOUNT_SCOPE_MISMATCH/PERMISSION_MISMATCH/DELETION_MISMATCH/HISTORICAL_MISMATCH/MANUAL_REVIEW/BLOCKED. (Part 3-3-2 Suppression Reconciliation·SEG-H2/H5 정합.)

---

## 3. Coverage (§73-74) & Gap (§75-76)

**Coverage Dimension(§73)**: Provider·Provider Account·Application·Connector·Object·Identifier·Historical·Deleted Record·Archived Record·Audit Log·Manual Portal·Async Export·Webhook Evidence·Internal Sync Reconciliation·Evidence Coverage. **상태(§74)**: COMPLETE/COMPLETE_WITH_WARNINGS/PARTIAL/MAJOR_GAPS/**PROVIDER_LIMITATION**/MANUAL_PENDING/PROCESSOR_PENDING/UNKNOWN/BLOCKED.
**Gap Type(§75, 23종)**: PROVIDER/PROVIDER_ACCOUNT_UNREGISTERED · ACCOUNT_MAPPING_UNKNOWN · CONNECTOR_MISSING/DISCONNECTED · CREDENTIAL_EXPIRED · PERMISSION_INSUFFICIENT · OAUTH_SCOPE_UNKNOWN · OBJECT_UNMAPPED · FIELD/IDENTIFIER_MAPPING_MISSING · API_ENDPOINT_MISSING · API_VERSION_DEPRECATED · PAGINATION_UNVERIFIED · RATE_LIMIT_BLOCKED · DELETED_RECORD_UNSEARCHABLE · HISTORICAL_COVERAGE_UNKNOWN · MANUAL_PORTAL_UNDOCUMENTED · ASYNC_EXPORT_FAILED · WEBHOOK_GAP · INTERNAL_SYNC_DRIFT · PROVIDER_RETENTION_UNKNOWN · PROVIDER_ACCOUNT_SCOPE_RISK. **Severity(§76)**: INFORMATIONAL/LOW/MEDIUM/HIGH/CRITICAL. **★HIGH/CRITICAL**: Wrong Provider Account 가능성·Cross-Tenant Account Mapping·Required Provider 미검색·Deleted Record 검색불가·Sensitive Object 미검색·Pagination 미완료·Provider Account 일부 누락·개인계정 의존·Deprecated API 누락·Provider Result Complete 오표시 위험. **★`PROVIDER_LIMITATION`을 `COMPLETE`/`NO_DATA`로 숨김 금지**.

---

## 4. Evidence (§77) · Explain (§78) · Lineage (§79)

**Evidence(§77)**: request/task_id · provider/application/provider_account/connector_id · connector_version · credential_binding_reference · OAuth_Scope_snapshot · endpoint_id · API_version · object_id · scope/identifier_set_version · request_parameter_hash · **pagination_evidence · async_job_evidence** · response_schema_version · result/candidate/duplicate/deleted_count · error · rate_limit_state · started/completed_at · result_hash · audit_reference. (**Raw Identifier/OTP/Credential 미기록·Hash/Reference**.)
**Explain(§78)**: 어떤 Provider/Account/Workspace·선택이유·Connector/Credential·Object·Identifier·API/Version·Pagination 완료·Deleted/Archived 검색·Provider 제한·Candidate·중복제거·남은 Gap·Manual/Support 작업 설명.
**Lineage(§79)**: DSAR Request → Verification Token → Search Scope → Provider → Application → Provider Account → Connector/Credential → Endpoint/Object → Retrieval Request → Page/Async Job/Webhook → Provider Candidate → Internal Sync Candidate → Deduplication → Coverage/Gap. 각 단계 ID·Version·Scope·Time.

---

## 5. API (§82-83) · Permission (§84) · Override (§85)

**API(§82)**: Provider/Application/Provider Account/Scope Hierarchy 조회 · Connector/Credential Binding 상태/OAuth Scope/Provider Permission 조회 · Data Object/Field/Identifier Mapping/Search Capability/Endpoint 조회 · Retrieval Request 생성/상태 · Async Job/Manual Search Task/Candidate/Connector Health/Permission Drift/Schema Drift/Coverage/Gap 조회 · Reconciliation · Explain · Lineage · Audit. **★`/api` 접두 필수**.
**Security(§83)**: Actor 인증 · DSAR Request Binding · Verification Token · Tenant/Workspace/Brand Scope · **Provider Account Scope** · Connector Permission · Credential Reference 보호 · OAuth Scope Masking · PII Masking · Rate/Result Limit · Enumeration 방지 · Idempotency · Audit · Environment 분리.
**Permission(§84, 24종)**: VIEW/MANAGE_SAAS_PROVIDER · VIEW_SAAS_APPLICATION · VIEW_PROVIDER_ACCOUNT · MANAGE_PROVIDER_ACCOUNT_MAPPING · VIEW/MANAGE_SAAS_CONNECTOR · VIEW_CREDENTIAL_BINDING_STATUS · VIEW_OAUTH_SCOPE · REVIEW_PROVIDER_PERMISSION · VIEW_SAAS_OBJECT · MANAGE_SAAS_FIELD/IDENTIFIER_MAPPING · RUN/CANCEL/RETRY_SAAS_RETRIEVAL · VIEW_SAAS_CANDIDATE · RUN_SAAS_RECONCILIATION · MANAGE_SAAS_MANUAL_TASK · VIEW_SAAS_COVERAGE · MANAGE_SAAS_GAP · VIEW_SAAS_EVIDENCE · VIEW_SAAS_AUDIT · ADMIN_SAAS_DISCOVERY_OVERRIDE.
**Override(§85)**: override_id · request_id · provider · provider_account · original_decision · requested_change · reason · privacy_risk · wrong_account_risk · expected_coverage_gain · evidence · approvers · effective_time · expiry · audit. **금지**: Cross-Tenant Provider Account · Wrong Brand Account · Personal Employee Credential · Verification Scope 초과 · Agent Authorization Scope 초과 · Production/Sandbox 혼합 · Deprecated API 무검증 강제 · 전체 Provider Account Export · Credential 노출 · Audit 없는 Manual Portal.

---

## 6. Static Lint (§86) & Runtime Guard (§87)

**Static Lint(§86)**: Registry 없는 Connector · **Provider Account Binding 없는 API 호출** · Tenant/Brand Mapping 없는 Account · Vault Reference 없는 Credential · **코드 내 Credential** · OAuth Scope Registry 누락 · 과도한 Admin Scope · Endpoint Registry 없는 호출 · Deprecated API 신규사용 · Pagination 미구현 · 첫 페이지만 Complete · Rate Limit Handler 누락 · Retry 무한반복 · Idempotency 없는 Async Job · Webhook Signature 검증누락 · Raw Provider Response 로그 · Full Payload Candidate 저장 · Manual Portal Procedure 누락 · Deleted Record Search 누락 · **Internal Sync만으로 Provider Complete** · Test Account 검색 · Provider Account Scope 없는 Query · Evidence 생성누락.
**Runtime Guard(§87)**: Invalid Verification Token · Request Closed/Withdrawn · **Wrong Provider Account · Cross-Tenant Account · Wrong Brand Account** · Credential Expired · Permission Insufficient · Excessive Admin Credential · Endpoint 미승인 · API Version Sunset · Scope보다 넓은 Export · Pagination 미완료 Complete · Rate Limit 초과 · Async Job Result Scope 불일치 · Webhook Signature Invalid · Result URL Host 불일치 · Manual Portal 미승인 · Test/Sandbox Account · Provider Schema Drift Critical · **Kill Switch**.

---

## 7. Error (§88) · Warning (§89)

**Error(§88, 28종)**: PROVIDER/APPLICATION/PROVIDER_ACCOUNT_NOT_REGISTERED · PROVIDER_ACCOUNT_SCOPE_MISMATCH · CONNECTOR_NOT_FOUND/NOT_READY · CREDENTIAL_EXPIRED/INVALID · PERMISSION_INSUFFICIENT · OAUTH_SCOPE_MISMATCH · OBJECT_NOT_MAPPED · IDENTIFIER_MAPPING_MISSING · ENDPOINT_NOT_FOUND · API_VERSION_DEPRECATED · RETRIEVAL_SCOPE_VIOLATION · PAGINATION_INCOMPLETE · RATE_LIMITED · ASYNC_JOB_FAILED · WEBHOOK_INVALID · MANUAL_SEARCH_REQUIRED · DELETED_RECORD_UNAVAILABLE · HISTORICAL_COVERAGE_UNKNOWN · SCHEMA_DRIFT · RECONCILIATION_FAILED · COVERAGE_INCOMPLETE · CRITICAL_GAP · PERMISSION_DENIED · RUNTIME_BLOCKED (모두 `SAAS_` 접두).
**Warning(§89, 17종)**: CONNECTOR_DEGRADED · CREDENTIAL_EXPIRING · PERMISSION_DRIFT · EXCESSIVE_PERMISSION · API_DEPRECATION_WARNING · SCHEMA_WARNING · RATE_LIMIT_WARNING · ASYNC_JOB_DELAY · PAGINATION_WARNING · HISTORICAL_COVERAGE_WARNING · DELETED_DATA_WARNING · MANUAL_PORTAL_PENDING · PROVIDER_LIMITATION · INTERNAL_SYNC_DRIFT · LEGACY_CONNECTOR_USED · SLA_RISK · MANUAL_REVIEW_REQUIRED (모두 `SAAS_` 접두).

---

## 8. Golden Dataset (§90) · Foundation Conformance (§91) · Equivalence (§92-93)

**Golden(§90·65+ 시나리오)**: Provider Registry 정상 · 동일 Provider 다중 Account/Brand · Parent/Child Workspace · Production/Sandbox 분리 · Wrong Provider/Cross-Tenant/Wrong Brand Account 차단 · OAuth Access/Refresh 정상 · Expired/Revoked Token · Missing/Excessive Scope · API Key Vault Reference · 코드 내 Credential 탐지 · Service Account/Employee Token 차단 · Exact Provider Contact ID/Verified Email/Shared Email 제한 · Provider Customer ID Mapping/Unknown External ID · Active/Archived/Soft-deleted/Merged Alias · First Page/Multi-page Cursor 완료/Duplicate/Missing Page/Token 만료 · Rate Limit Retry-After/Daily Quota/Circuit Breaker Open · Transient 5xx Retry/Permanent 4xx 금지 · Async Export 정상/Partial/Timeout/Signed URL Host 불일치/Checksum 실패 · Webhook Signature/Replay 차단/Webhook·API 불일치 · Manual Portal/Overdue · Internal Sync 일치/Stale/Provider Deleted vs Internal Active Drift · API Deprecated/Sunset · Field/Pagination Schema Drift · Candidate Exact/Account Mismatch/Tenant Mismatch/Provider·Internal Duplicate · Historical Coverage Complete/Unknown · Provider Limitation · Coverage Complete/Critical Gap · Override 허용/금지. (**★현행 미존재 Provider Category 시나리오=NOT_APPLICABLE**.)
**Conformance(§91)**: CRM·Commerce·Payment·Marketing·Advertising·Support·Identity·Analytics·ERP·Logistics·Document·Fraud·AI Provider 에 동일 Foundation Contract(Provider Registry·Account Scope·Connector·Credential·OAuth Scope·Permission·Object·Identifier Mapping·Endpoint·API Version·Pagination·Rate Limit·Async Job·Webhook·Candidate·Evidence·Coverage·Gap·Audit).
**Equivalence(§92)**: 기존 SaaS Sync/Export/Deletion Connector(AdAdapters·Connectors·KrChannel·Paddle) 와 비교(Provider Account Mapping·Credential·Permission·Object Coverage·Identifier Search·Active/Deleted Record·Historical·Pagination·Result Count·Internal Sync·Candidate·Error·Warning·Latency·Audit). **Difference(§93)**: MATCH·EXPECTED_{ACCOUNT_SCOPE/PERMISSION/IDENTIFIER/PAGINATION/DELETED_DATA/HISTORICAL/SYNC/API_VERSION}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_DISCOVERY_GAP·LEGACY_WRONG_ACCOUNT_RISK**·CANONICAL_SAAS_DISCOVERY_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_ACCOUNT_RISK`·고객영향 `LEGACY_DISCOVERY_GAP`=운영전환 차단**.

---

## 9. Observability (§94) · Alert (§95) · Audit (§96)

**Metrics(§94)**: Provider/Account/Connector Count·Healthy/Degraded Connector·Expired Credential·Permission Drift·Excessive Permission·Deprecated API·Schema Drift·Retrieval Count·Success/Failure·API Call·Rate Limit·Retry·Circuit Breaker Open·Pagination Page/Incomplete·Async Job/Failure·Webhook Failure·Manual Search Pending·Candidate·Account Mismatch Block·Cross-Tenant Block·Deleted Record·Internal Sync Drift·Coverage Complete·Critical Gap·Legacy Usage·P50/P95/P99.
**Alert(§95)**: Required Provider 미등록·Account Mapping 누락·Cross-Tenant/Wrong Brand Account·Credential 만료·OAuth Refresh 실패·Excessive Admin Scope·Required Permission 누락·Deprecated Sunset 임박·Pagination 불완전·Rate Limit 지속·Circuit Breaker Open·Async 지연·Webhook Signature 실패·Internal Sync Drift 급증·Deleted Provider Record 내부잔존·Manual SLA 초과·Historical Coverage Unknown·Critical Gap·Legacy 신규사용·Evidence 누락.
**Audit Event(§96, 36종)**: PROVIDER_REGISTERED/VERSIONED · APPLICATION_REGISTERED · PROVIDER_ACCOUNT_REGISTERED/MAPPING_CHANGED · CONNECTOR_REGISTERED/VERSIONED · CREDENTIAL_BOUND/ROTATED · OAUTH_SCOPE_VALIDATED · PERMISSION_DRIFT_DETECTED · OBJECT_REGISTERED · FIELD/IDENTIFIER_MAPPING_CREATED · ENDPOINT_REGISTERED · API_VERSION_DEPRECATION_DETECTED · RETRIEVAL_STARTED/PAGE_COMPLETED/COMPLETED/FAILED · RATE_LIMITED · ASYNC_JOB_CREATED/COMPLETED · WEBHOOK_RECEIVED/REJECTED · MANUAL_SEARCH_ASSIGNED · CANDIDATE_CREATED · DUPLICATE_GROUPED · SCHEMA_DRIFT_DETECTED · COVERAGE_CALCULATED · GAP_DETECTED · RECONCILIATION_COMPLETED · RUNTIME_BLOCKED · OVERRIDE_REQUESTED/APPROVED/REVOKED (모두 `SAAS_` 접두·SecurityAudit 확장).

---

## 10. Existing Impl Classification (§97) · Duplicate Audit (§98) · Regression Gate (§99)

**분류(§97)**: 실측 결과 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `channel_credential`(tenant·channel·key·Crypto·is_active) | `MIGRATION_REQUIRED` → `CANONICAL_SAAS_CREDENTIAL_BINDING` | Vault Reference·Provider Account 연결 형식화 |
| `AdAdapters` 키 별칭(meta_ads/meta/facebook·OAuth vs 수동) | `CONSOLIDATION_REQUIRED` → Provider Account/Credential Alias | 다중 Account/Alias 정규화 |
| `OAuth`(meta/google/tiktok_business·TikTok Shop) | `LEGACY_ADAPTER` → OAuth Scope/Application Registry | 재사용·Scope 등록 |
| `connector_sync_log`(동기화 상태·285차 ok=>false) | `VALIDATED_LEGACY` → Connector Health/Reconciliation | 가짜녹색 근절 정본 정합 |
| `Connectors`/`ChannelRegistry`/`ChannelContract`/`ChannelSync` | `CONSOLIDATION_REQUIRED` → Connector/Endpoint Registry | 채널 추상화 → SaaS Connector Registry |
| `DataPlatform.data_source`(external_channel) | `CONSOLIDATION_REQUIRED` → Provider Account Registry | tenant/brand/env binding 확장 |
| `Webhooks` · 커머스/광고/결제/메시징 Connector | `LEGACY_ADAPTER` | 재사용(ingest/outbound) |
| **DSAR Subject Retrieval/Pagination 완료/Async/Webhook Correlation/Deleted Discovery/Reconciliation/Coverage/Gap 부재** | 신설 | 현행 부재(ingest만) |
| 외부 CRM/CDP/Support SaaS/Identity Provider | `UNVERIFIED`(NOT_APPLICABLE) | **내부 CRM·SSO inbound·지어내기 금지** |
**Duplicate Audit(§98)**: 실측 — Credential=`channel_credential` 단일·OAuth=`OAuth` 단일·동기화상태=`connector_sync_log` 단일·채널추상화=`ChannelRegistry/Contract`(**AdAdapters 키 별칭 2경로=통합대상**). **중복 Provider/Account/Connector Registry·Pagination/Rate Limit Helper 신설 위험만 차단**(§110 Provider별 독립 Registry/Candidate Store 금지).
**Regression Gate(§99)**: 변경 전후 Provider Account Mapping·OAuth Refresh·API Key·Service Account·Permission·Object Coverage·Identifier Search·Pagination·Rate Limit·Retry·Circuit Breaker·Async Export·Webhook·Deleted/Historical Search·Manual Portal·Candidate·Internal Sync Reconciliation·Coverage·Gap·Explain·Audit·**Existing API Compatibility**(AdAdapters/Connectors/OAuth/channel_credential 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 11. 완료 상태 요약

SaaS Entity 30 · Provider Registry/Category 34(현행 Commerce/Ad/Payment/SMS·나머지 NOT_APPLICABLE)/상태 · Application · Provider Account 17 Type/상태/Matrix · Scope Hierarchy · Connector 13 Type/상태 · Credential Binding(Vault) 11 Type/금지 · OAuth Scope/Provider Permission/상태 · Object 27 Category/Field/Identifier Mapping · Search Capability 20/Mode/Strategy 12/Policy · Endpoint/API Version 8상태 · Retrieval 16상태/보안 · Pagination 10 Mode/완료검증 · Rate Limit/Retry/Circuit Breaker 5 · Async Job 12상태/Result 보안 · Webhook Correlation/보안/불일치 · Manual Portal 11상태 · Deleted 14상태/Historical · Candidate 16 Match/Payload/Dedup · Health 14상태/Permission·Credential·Schema Drift/대응 · Reconciliation 13상태 · Coverage 15차원/9상태·Gap 23유형/5 Severity · Evidence/Explain/Lineage · Permission 24/Override · Static Lint 23/Runtime Guard 19 · Error 28/Warning 17 · Golden 65+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★DSAR Subject Retrieval 은 현행 부재(ingest/outbound만)·외부 CRM/CDP/Support/Identity=NOT_APPLICABLE 정직표기**. **실 Retrieval/Connector/Reconciliation/CI가드 구현 = Part 3-3-3-3-3-3-2~10(후속 승인 세션·verify+배포승인).**
