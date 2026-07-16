# Canonical DSAR CRM & CDP Discovery Schema — Entity Model, CRM/CDP Discovery Profile, Object/Field/Identifier Registry (Internal CRM·CDP Reality)

> **EPIC 06-A Part 3-3-3-3-3-3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): **GeniegoROI CRM/CDP = 내부 DB**(외부 SaaS 아님) — `crm_customers`(Contact/Customer·identity_id)·`crm_activities`(Activity)·`crm_segments`+`crm_segment_members`(Segment/Audience Membership)·`crm_channel_prefs`+`crm_customer_prefs`(Consent/Preference)·`email_suppression`(Suppression)·**`crm_identity`+`crm_identity_merge_link`**(CDP-형 Identity/Merge·269+270차 CRM Identity 360)·`CustomerAI`(RFM 이탈/LTV/Affinity=Trait/Prediction)·`GdprConsent`(쿠키동의)·AdAdapters audience sync(Destination Membership) · Part 3-3-3-3-3-2 Structured Discovery(이 내부테이블들이 이미 MySQL Source)·Part 3-3-3-3-3-3-1 SaaS Foundation·EPIC05 Customer Identity·Part 3-3-1/3-3-2 Consent/Suppression.
> **★정직(§실측·핵심)**: **외부 CRM/CDP SaaS(Salesforce/HubSpot/Segment/Klaviyo/Braze) 미통합** — Klaviyo(33)/Braze(13)/Salesforce(1)/HubSpot(1) grep=**주석 내 경쟁 벤치마크**("Klaviyo 수준 이상"), 커넥터 아님. 따라서 본 Part=**내부 CRM/CDP 도메인 시맨틱 계층**(Structured Discovery 위). **Lead/Person Account/Lead Conversion/Business Account Contact Role=NOT_APPLICABLE**(GeniegoROI=B2C 커머스 ROI·Salesforce식 Lead 개념 없음). 지어내기 금지.
> 형제: [`CANONICAL_DSAR_CRM_CDP_DISCOVERY_OBJECTS.md`](CANONICAL_DSAR_CRM_CDP_DISCOVERY_OBJECTS.md) · [`CANONICAL_DSAR_CRM_CDP_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_CRM_CDP_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_CRM_CDP_DATA_DISCOVERY.md`](../architecture/ADR_DSAR_CRM_CDP_DATA_DISCOVERY.md)

---

## 0. 현행 대비 (실측 → Canonical)

| 현행(내부 CRM/CDP) | Canonical 목표 |
|---|---|
| `crm_customers`(identity_id·이메일/전화·마케팅상태) | CRM Contact/Customer Discovery(Object Mapping·Candidate) |
| `crm_activities`(고객 활동/이벤트) | CRM Activity + CDP Event Discovery |
| `crm_segments`+`crm_segment_members`(SoT·version/snapshot 부재 289차 Part1) | CDP Audience/Segment Membership Discovery |
| `crm_channel_prefs`+`crm_customer_prefs`(채널 동의/선호) | CRM/CDP Consent·Preference Discovery(Part 3-3-1 정합) |
| `email_suppression`(발송억제·DSAR 보존) | CRM/CDP Suppression Discovery(Part 3-3-2 정합) |
| **`crm_identity`+`crm_identity_merge_link`**(내부 Identity/Merge 360) | CDP Unified Profile·Identity Namespace·Merge History Discovery |
| `CustomerAI`(RFM 이탈/LTV/Affinity) | CDP Trait·Computed Trait·Prediction Discovery |
| `GdprConsent`(쿠키 anonymous) | CDP Anonymous/Consent Discovery |
| AdAdapters audience(Meta/Google/TikTok) | CDP Destination Membership(Part 3-3-3-3-3-3-4 연계) |
| **외부 CRM/CDP SaaS·Lead/Person Account/Conversion·Business Account Contact Role** | **NOT_APPLICABLE**(미통합·B2C·지어내기 금지) |
| Contact/Activity/Audience/Consent 별 **완전성/Merge alias/Deleted/Reconciliation Discovery 부재** | 신설 |

**무후퇴**: crm_customers/activities/segments/channel_prefs/email_suppression/crm_identity/merge_link·CustomerAI·GdprConsent·AdAdapters audience·Customer 360(269+270차) 는 **정본 — 재구현 금지, Canonical CRM/CDP Discovery 아래 통합**. Contact/Activity/Profile별 독립 Case Registry/Candidate Store 신설 금지(§86).

---

## 1. CRM·CDP Discovery Entity Model (§4)

Entity: `CRM_DISCOVERY_PROFILE` · `CRM_OBJECT_MAPPING` · `CRM_FIELD_MAPPING` · `CRM_RELATIONSHIP_MAPPING` · `CRM_CONTACT_CANDIDATE` · `CRM_LEAD_CANDIDATE`(N/A) · `CRM_ACCOUNT_RELATION_CANDIDATE`(N/A) · `CRM_ACTIVITY_CANDIDATE` · `CRM_CAMPAIGN_MEMBER_CANDIDATE` · `CRM_CONSENT_CANDIDATE` · `CRM_DELETED_RECORD_CANDIDATE` · `CRM_CONVERSION_HISTORY`(N/A) · `CRM_MERGE_HISTORY` · `CRM_AUDIT_HISTORY_CANDIDATE` · `CDP_DISCOVERY_PROFILE` · `CDP_OBJECT_MAPPING` · `CDP_IDENTITY_NAMESPACE` · `CDP_IDENTITY_ALIAS` · `CDP_PROFILE_CANDIDATE` · `CDP_EVENT_CANDIDATE` · `CDP_TRAIT_CANDIDATE` · `CDP_PREDICTION_CANDIDATE` · `CDP_AUDIENCE_MEMBERSHIP_CANDIDATE` · `CDP_DESTINATION_MEMBERSHIP_CANDIDATE` · `CDP_CONSENT_CANDIDATE` · `CDP_PROFILE_MERGE_HISTORY` · `CDP_SOURCE_CONTRIBUTION` · `CRM_CDP_DISCOVERY_EVIDENCE` · `CRM_CDP_RECONCILIATION` · `CRM_CDP_COVERAGE_RESULT` · `CRM_CDP_DISCOVERY_GAP` · `CRM_CDP_AUDIT_EVENT`. (기존 등가=crm_*/crm_identity/CustomerAI → 확장·N/A 표기·나머지 신규.)

---

## 2. CRM Discovery Profile (§5) — 내부 도메인

**Schema(§5)**: crm_discovery_profile_id · provider_id(=`__internal_crm__`) · provider_account_id · organization_id · business_unit_id · workspace_id · **tenant_id · brand_id · legal_entity_id** · environment · region · person_account_enabled(=false·N/A) · lead_enabled(=false·N/A) · activity_model(=crm_activities) · email_history_model · consent_model(=crm_channel_prefs) · deletion_model(=Dsar erasure/anonymize) · recycle_bin_support(=false·soft delete 산발) · audit_history_support(=dsar_audit_log/부분) · bulk/search_API_support · custom_object_support · owner · version · status · certification_status. **★provider=내부**(외부 Account Scope 대신 tenant_id 격리·Part 3-3-3-3-3-2 Structured 정합).

---

## 3. CRM Object Registry (§6-8) — 내부 매핑

**Object Category(§6, 27종·현행 매핑 표기)**: CONTACT(=crm_customers) · **LEAD(N/A)** · **PERSON_ACCOUNT(N/A)** · **BUSINESS_ACCOUNT(N/A)** · **ACCOUNT_CONTACT_ROLE(N/A)** · OPPORTUNITY_CONTACT_ROLE(N/A) · ACTIVITY(=crm_activities) · TASK/EVENT/MEETING/CALL(부분·crm_activities type) · EMAIL_MESSAGE(=email_sends) · NOTE(부분) · ATTACHMENT_REFERENCE · CAMPAIGN/CAMPAIGN_MEMBER(=journey/email 발송) · CONSENT(=crm_channel_prefs) · COMMUNICATION_PREFERENCE(=crm_customer_prefs) · SUPPRESSION(=email_suppression) · CASE_REFERENCE · CUSTOM_OBJECT(부분) · FIELD_HISTORY(부분) · AUDIT_EVENT(=dsar_audit_log/security_audit) · DELETED_RECORD(=Dsar anonymize tombstone) · MERGE_RECORD(=crm_identity_merge_link) · CONVERSION_RECORD(N/A).
**Object Mapping(§7)**: crm_object_mapping_id · provider_id · provider_account_id · provider_object_name · canonical_entity · object_category · primary_external_id · tenant/brand_scope · subject_identifier_fields · parent/child_relationships · date/status/deletion/merge/conversion_fields · personal_data_fields · sensitive_fields · custom_fields · search/bulk_export/deleted_search/history_capability · owner · version · status. **Matrix(§80)**: | Object | Provider Object | Canonical Entity | Subject Fields | Account Scope | Deleted Search | History | Custom Fields | Status |
**Field Mapping(§8)**: provider_field_name · canonical_field_id · data_type · data_category · sensitivity · identifier_role · account_scope_role · relationship_role · date/deletion/merge/conversion_role · free-text 여부 · custom_field 여부 · searchable/exportable 여부 · correction/restriction/deletion_support · masking_policy · version · status.

---

## 4. CDP Discovery Profile (§30) · Object Registry (§31) · Identity Namespace (§33) — 내부 매핑

**★CDP=내부 `crm_identity`/`crm_identity_merge_link`/CustomerAI**(외부 Segment/mParticle 아님).
**CDP Profile(§30)**: cdp_discovery_profile_id · provider_id(=`__internal_cdp__`) · provider_account_id · workspace_external_id · tenant/brand/legal_entity_id · environment · region · profile_model(=crm_identity) · identity_model(=identity_id) · namespace_model · event_model(=crm_activities) · trait_model(=CustomerAI RFM/LTV) · audience_model(=crm_segments) · consent_model(=crm_channel_prefs) · merge_model(=crm_identity_merge_link) · deletion_model · source_count · destination_count(=AdAdapters) · profile/export/historical_API_support · owner · version · status · certification.
**CDP Object(§31, 23종·매핑)**: UNIFIED_PROFILE(=crm_identity) · SOURCE_PROFILE(=crm_customers per-channel) · IDENTITY(=identity_id) · IDENTITY_NAMESPACE(=email/phone/channel_id) · IDENTITY_ALIAS(=merge_link) · ANONYMOUS_PROFILE(=GdprConsent 쿠키·pixel) · DEVICE/COOKIE_PROFILE(부분) · EVENT(=crm_activities) · TRAIT(=CustomerAI) · COMPUTED_TRAIT(=RFM/LTV) · PREDICTION(=churn/LTV score) · SEGMENT/AUDIENCE_MEMBERSHIP(=crm_segment_members) · DESTINATION_MEMBERSHIP(=AdAdapters) · CONSENT(=crm_channel_prefs) · PREFERENCE(=crm_customer_prefs) · SUPPRESSION(=email_suppression) · MERGE_HISTORY(=merge_link) · SPLIT_HISTORY(=EPIC05 Unmerge) · SOURCE_CONTRIBUTION(=channel source) · PROFILE_AUDIT · DELETED_PROFILE(=Dsar tombstone). **Matrix(§81)**: | Object | Workspace | Identifier Namespace | Source | Historical Coverage | Merge Support | Delete Support | Candidate Count | Status |
**Identity Namespace(§33)**: namespace_id · provider_namespace_name · canonical_identifier_type · normalization · case_sensitivity · hash_algorithm/version · tenant/brand/source_binding · shared_identifier_risk · merge_priority · status · version. (현행 email/phone/channel_order_id → Namespace 형식화·EPIC05 Identity Confidence 정합.)
