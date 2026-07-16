# Canonical DSAR SaaS Discovery Schema — Entity Model, Provider/Application/Account Registry, Scope Hierarchy, Connector/Credential/OAuth, Object/Field/Identifier Mapping

> **EPIC 06-A Part 3-3-3-3-3-3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): 기존 SaaS/커넥터 인프라 — `channel_credential`(tenant_id·channel·key_name·key_value·is_active·Crypto 암호화·Vault성) · `connector_sync_log`(동기화 이력/상태) · `OAuth`(meta/google/tiktok_business·TikTok Shop 288차 콜백·oauth_access_token) · `AdAdapters`(Meta v19.0/Google v17/TikTok·**키 별칭 meta_ads/meta/facebook·OAuth vs 수동등록 2경로**) · `Connectors`/`ChannelRegistry`/`ChannelContract`/`ChannelSync`/`ChannelCreds` · 커머스 `KrChannel`(11번가/쿠팡/네이버/스토어)·`KakaoChannel`·`Line`·`Omnichannel`·Amazon · 결제 `Paddle`(+Stripe 보류) · 메시징 `SmsMarketing`(NaverSms SENS) · `Webhooks` · `DataPlatform.data_source`(external_channel=부분 Account Registry) · Part 3-3-3-3-3-1 Discovery Source Registry/Planner · Part 3-3-3-3-2 Verification Token · EPIC05 Identity.
> **★정직(§실측)**: 현행 외부 SaaS=**커머스채널·광고플랫폼·결제·메시징(ingest/outbound)** 중심 — **DSAR Subject 단위 Retrieval 은 미존재**(동기화/집행/발송용). CRM/CDP=**내부 DB**(crm_customers·Part 3-3-3-3-3-2 Structured). 따라서 외부 CRM/CDP/Support SaaS/Identity Provider Provider Category=대부분 NOT_APPLICABLE(GeniegoROI 자체가 CRM/CDP·EnterpriseAuth SSO=inbound). 지어내기 금지.
> 형제: [`CANONICAL_DSAR_SAAS_DISCOVERY_RETRIEVAL.md`](CANONICAL_DSAR_SAAS_DISCOVERY_RETRIEVAL.md) · [`CANONICAL_DSAR_SAAS_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_SAAS_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_SAAS_DISCOVERY_FOUNDATION.md`](../architecture/ADR_DSAR_SAAS_DISCOVERY_FOUNDATION.md)
> **성격**: 목표 계약. 도메인별 Object Mapping(CRM/Commerce/Payment/Marketing/Support/Identity/Analytics/ERP)=Part 3-3-3-3-3-3-2~10. 실 Registry/Retrieval 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `channel_credential`(tenant·channel·key_name·key_value·is_active·Crypto) | Credential Binding(Vault Reference)·Provider Account 연결 형식화 |
| `AdAdapters` 키 별칭(meta_ads/meta/facebook·OAuth vs 수동 2경로) | **동일 Provider 다중 Account/Credential Alias** 정규화(§3.1)·Provider Account Registry |
| `OAuth`(meta/google/tiktok_business·TikTok Shop 콜백·oauth_access_token) | OAuth Scope Registry·Application Registry·Redirect URI |
| `connector_sync_log`(동기화 이력) | Connector Health·Reconciliation 편입 |
| `Connectors`/`ChannelRegistry`/`ChannelContract`/`ChannelSync` | Connector Registry·Endpoint·API Version Governance |
| `DataPlatform.data_source`(external_channel·source_account·priority) | Provider Account Registry(tenant/brand/env binding) 확장 |
| 커머스(11번가/쿠팡/네이버/Amazon)·광고(Meta/Google/TikTok)·결제(Paddle)·메시징(NaverSms) | Provider Registry(역할/Region/Export·Delete 지원) |
| **DSAR Subject 단위 Retrieval/Pagination 완료검증/Async Job/Webhook Correlation/Deleted Record Discovery/Reconciliation/Coverage/Gap 부재**(ingest/outbound만) | 신설 |
| 외부 CRM/CDP/Support SaaS/Identity Provider | **NOT_APPLICABLE**(내부 CRM·SSO inbound·지어내기 금지) |

**무후퇴**: channel_credential·OAuth·AdAdapters·connector_sync_log·Connectors/ChannelRegistry·KrChannel/Kakao/Line·Paddle·SmsMarketing·Webhooks·DataPlatform.data_source 는 **정본 — 재구현 금지, Canonical SaaS Discovery Foundation 아래 통합**. Provider별·Request Type별 독립 SaaS Discovery Engine/Candidate Store 신설 금지(§110).

---

## 1. Canonical SaaS Discovery Entity Model (§4)

Entity: `SAAS_PROVIDER(_VERSION)` · `SAAS_APPLICATION` · `SAAS_PROVIDER_ACCOUNT` · `SAAS_SCOPE_NODE` · `SAAS_CONNECTOR(_VERSION)` · `SAAS_CREDENTIAL_BINDING` · `SAAS_OAUTH_SCOPE` · `SAAS_PROVIDER_PERMISSION` · `SAAS_DATA_OBJECT(_VERSION)` · `SAAS_FIELD_MAPPING` · `SAAS_SUBJECT_IDENTIFIER_MAPPING` · `SAAS_SEARCH_CAPABILITY` · `SAAS_SEARCH_POLICY` · `SAAS_SEARCH_STRATEGY` · `SAAS_API_ENDPOINT(_VERSION)` · `SAAS_RETRIEVAL_REQUEST` · `SAAS_RETRIEVAL_PAGE` · `SAAS_ASYNC_JOB` · `SAAS_WEBHOOK_CORRELATION` · `SAAS_MANUAL_SEARCH_TASK` · `SAAS_RESULT_CANDIDATE` · `SAAS_RESULT_DUPLICATE_GROUP` · `SAAS_CONNECTOR_HEALTH` · `SAAS_PERMISSION_DRIFT` · `SAAS_SCHEMA_DRIFT` · `SAAS_COVERAGE_RESULT` · `SAAS_DISCOVERY_GAP` · `SAAS_RECONCILIATION` · `SAAS_DISCOVERY_EVIDENCE` · `SAAS_DISCOVERY_AUDIT_EVENT`. (기존 등가=channel_credential/OAuth/connector_sync_log/data_source → 확장·나머지 신규.)

---

## 2. Provider Registry (§5-7)

**Schema(§5)**: saas_provider_id · provider_name · legal_entity_name · service_category · service_description · processor_role · controller_role · joint_controller 여부 · supported_regions · data_residency_options · subprocessors · security/privacy_status · agreement_reference · DPA_reference · supported_authentication_types · supported_api_versions · supported_webhooks · export/deletion/rectification/restriction_support · historical_search_support · manual_portal_support · owner · vendor_manager · privacy/security_owner · version · status · certification_status · last_reviewed_at. **Matrix(§103)**: | Provider | Category | Role | Regions | Accounts | Applications | API Versions | Export | Delete | Status |
**Service Category(§6, 34종)**: CRM · CDP · COMMERCE · MARKETPLACE · SUBSCRIPTION · PAYMENT · ACCOUNTING · MARKETING_AUTOMATION · EMAIL · SMS · PUSH · ADVERTISING · SOCIAL_MEDIA · CUSTOMER_SUPPORT · LIVE_CHAT · SURVEY · IDENTITY_PROVIDER · AUTHENTICATION · ANALYTICS · BUSINESS_INTELLIGENCE · EXPERIMENTATION · FEATURE_FLAG · ERP · SHIPPING · LOGISTICS · DOCUMENT · FILE_SHARING · FRAUD · KYC · AI_PROVIDER · DATA_ENRICHMENT · AFFILIATE · PARTNER_PORTAL · OTHER. (현행 활성=COMMERCE/MARKETPLACE·ADVERTISING·PAYMENT·SMS·AI_PROVIDER·SHIPPING. **CRM/CDP/SUPPORT/IDENTITY_PROVIDER=NOT_APPLICABLE(내부/inbound)**.)
**Provider 상태(§7)**: PROPOSED/REVIEW_REQUIRED/APPROVED/ACTIVE/ACTIVE_WITH_WARNINGS/RESTRICTED/SUSPENDED/DEPRECATED/TERMINATING/TERMINATED/BLOCKED/UNVERIFIED.

---

## 3. Application (§8) · Provider Account (§9-11) · Scope Hierarchy (§12-13)

**Application(§8)**: saas_application_id · provider_id · application_name · provider_application_id · application_type · environment · tenant/legal_entity_owner · OAuth_client_reference · redirect_URI_registry · webhook_application_reference · API_base_URL · API_version · enabled_features · allowed_provider_accounts · credential_policy · owner · version · status. (현행 OAuth client=meta/google/tiktok app.)
**Provider Account(§9)**: provider_account_id · provider_id · saas_application_id · provider_account_type · provider_account_external_id · account_name · organization/workspace/property/store/project/business_id_external · **tenant_id · workspace_id · brand_id · store_id · legal_entity_id** · environment · region · jurisdiction_scope · source_account_id · processor_role · credential_binding_id · connector_id · status · version · last_verified_at · audit_reference. **★Provider 이름/공통 Business Account 만으로 Scope 확정 금지(§3.1)**. **Type(§10, 17종)**: ORGANIZATION/BUSINESS/WORKSPACE/PROPERTY/STORE/PROJECT/SITE/APP/AD_ACCOUNT/CRM_ACCOUNT/MERCHANT_ACCOUNT/SUBSCRIPTION_ACCOUNT/SUPPORT_WORKSPACE/ANALYTICS_PROPERTY/IDENTITY_TENANT/SHIPPING_ACCOUNT/OTHER. **상태(§11)**: ACTIVE/ACTIVE_WITH_WARNINGS/READ_ONLY/PARTIAL_ACCESS/DISCONNECTED/CREDENTIAL_EXPIRED/PERMISSION_INSUFFICIENT/**WRONG_MAPPING_RISK**/DEPRECATED/TERMINATING/TERMINATED/BLOCKED/UNVERIFIED. **Matrix(§104)**: | Provider Account | Type | Tenant | Brand | Legal Entity | Environment | Region | Connector | Credential | Status |
**Scope Node(§12)**: scope_node_id · provider_id · provider_account_id · parent_scope_node_id · scope_type · external_scope_id · display_name · tenant_id · brand_id · environment · region · allowed_objects · status · version. **원칙(§13)**: 상위 Account 권한 하위 전체 DSAR Scope 자동확대 금지 · 다른 Brand/Store/Property 명시 분리 · **Production/Sandbox/Developer 분리** · Parent/Child 관계·Shared Business Account Tenant Mapping 검증·Account 이동/합병 이력·Terminated Account Historical Data 검토.

---

## 4. Connector (§14-16) · Credential Binding (§17-19)

**Connector(§14)**: saas_connector_id · provider_id · application_id · provider_account_id · connector_type · connector_implementation · connector_version · auth_type · credential_binding_id · API_base_URL · API_version · enabled_endpoints/objects · webhook/polling/bulk_export_support · manual_fallback · rate_limit/retry/timeout_profile · owner · status · certification_status · deployed/last_tested_at. **Type(§15)**: REALTIME/REST/GRAPHQL/SOAP/BULK/ASYNC_EXPORT_API · WEBHOOK · EVENT_STREAM · FILE_EXPORT · SFTP · DATABASE_CONNECTOR · MANUAL_PORTAL · HYBRID. **상태(§16)**: DRAFT/VALIDATING/APPROVED/ACTIVE/ACTIVE_WITH_WARNINGS/DEGRADED/RATE_LIMITED/CREDENTIAL_EXPIRED/PERMISSION_BLOCKED/API_DEPRECATED/SCHEMA_DRIFT/DISCONNECTED/SUSPENDED/RETIRED/BLOCKED. **Matrix(§105)**: | Connector | Provider | Account | Type | API Version | Objects | OAuth Scopes | Pagination | Rate Limit | Health |
**Credential Binding(§17)**: credential_binding_id · provider_id · application_id · provider_account_id · credential_type · **vault_reference**(원문 금지) · credential_owner · scope · issued/expires_at · rotation_due_at · last_rotated/validated_at · environment · status · audit_reference. **Type(§18)**: OAUTH_ACCESS/REFRESH_TOKEN · API_KEY · SERVICE_ACCOUNT · CLIENT_CERTIFICATE · BASIC_AUTH · SIGNED_JWT · HMAC_SECRET · SFTP_KEY · SESSION_CREDENTIAL · MANUAL_PORTAL_CREDENTIAL · OTHER. **★금지(§19)**: 코드/Config 평문 · 로그 출력 · Provider Account 간 재사용 · Production/Sandbox 재사용 · Tenant 간 공유 · 만료없는 임시 Token · **개인 직원 계정 장기사용** · 과도한 Admin Credential · Rotation 없음 · 폐기 Connector Credential 유지. (현행 channel_credential Crypto 암호화 정합·평문노출 회피 정합.)

---

## 5. OAuth Scope (§20) · Provider Permission (§21-22) · Object (§23-25) · Field/Identifier Mapping (§26-29)

**OAuth Scope(§20)**: oauth_scope_id · provider_id · scope_name · description · permission_category · read/write/delete/export/admin_capability · supported_objects · risk_level · required/prohibited 여부 · owner · version · status. **Provider Permission(§21)**: READ_CONTACTS/CUSTOMERS/ORDERS/TRANSACTIONS/MESSAGES/AUDIENCES/ANALYTICS/AUDIT · EXPORT_DATA · SEARCH_DELETED · READ_ARCHIVE · DELETE/UPDATE_RECORD · ADMIN_ACCOUNT. **★Discovery Connector=최소 Read/Export 권한만**. **상태(§22)**: REQUIRED/OPTIONAL/GRANTED/PARTIALLY_GRANTED/DENIED/EXPIRED/REVOKED/**EXCESSIVE**/UNKNOWN/BLOCKED.
**Data Object(§23)**: saas_data_object_id · provider_id · provider_account_type · object_name · provider_object_name · object_category · canonical_entity · subject_types · data_categories · sensitive_categories · primary_external_id · parent/child_object · searchable_identifiers · supported_filters · date_fields · deleted/archived_state_support · export/correction/restriction/deletion_support · historical_coverage · retention_behavior · source_of_truth_status · owner · version · status. **Category(§24)**: CONTACT/CUSTOMER/USER/ACCOUNT/LEAD/PROFILE/ORDER/TRANSACTION/PAYMENT/SUBSCRIPTION/MESSAGE/CAMPAIGN/AUDIENCE/EVENT/SESSION/TICKET/CONVERSATION/IDENTITY/LOGIN/DEVICE/CONSENT/SUPPRESSION/FILE/DOCUMENT/SHIPMENT/INVOICE/OTHER. **상태(§25)**: ACTIVE/ACTIVE_WITH_LIMITS/READ_ONLY/HISTORICAL/DEPRECATED/API_REMOVED/MANUAL_ONLY/SCHEMA_DRIFT/UNMAPPED/BLOCKED/UNVERIFIED.
**Field Mapping(§26)**: saas_field_mapping_id · saas_data_object_id · provider_field_name · canonical_field_id · field_type · nested_path · data_category · sensitivity · identifier_type · tenant/brand_scope_role · date/deletion_role · encrypted/hashed 여부 · searchable/exportable 여부 · correction/deletion_support · provider_masking_behavior · owner · version · status.
**Subject Identifier Mapping(§27-29)**: Provider ID Type(PROVIDER_CONTACT/CUSTOMER/USER/ACCOUNT/SUBSCRIBER/ORDER_CUSTOMER/PAYMENT_CUSTOMER/SUPPORT_USER/ANALYTICS_USER_ID·EMAIL/HASHED_EMAIL·PHONE/HASHED_PHONE·EXTERNAL_ID·CLIENT_USER_ID·DEVICE/COOKIE/ADVERTISING_ID·LOGIN_ID). Schema=mapping_id·provider_id·provider_account_id·object_id·provider/canonical_identifier_type·normalization_rule·hash_algorithm/version·case_sensitivity·**source_account_binding·tenant/brand_binding**·confidence_requirement·shared_identifier_policy·search_priority·status·version. **★원칙(§29·§3.6)**: Provider Account Binding 필수·External ID Source Account 명시·Email/Phone Normalize·Hash Algorithm/Version·**Shared Identifier 단독확정 금지·Provider User ID→Person ID 자동변환 금지**·Deleted Provider ID 재사용 위험·Merged Alias 보존·Sandbox/Production ID 분리.
