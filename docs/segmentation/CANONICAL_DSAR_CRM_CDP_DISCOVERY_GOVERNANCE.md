# Canonical DSAR CRM & CDP Discovery Governance — Search/Bulk API, Candidate/Dedup, Reconciliation, Coverage/Gap, Evidence/Explain, API/Permission, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-2** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): 내부 CRM/CDP(crm_customers/activities/segments/channel_prefs/email_suppression/crm_identity/merge_link/CustomerAI)·Dsar::collectSubjectData(이 테이블들 실제 검색)·SecurityAudit · Part 3-3-3-3-3-1 Coverage/Gap · Part 3-3-3-3-3-2 Structured Scope Predicate · Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_CRM_CDP_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_CRM_CDP_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_CRM_CDP_DISCOVERY_OBJECTS.md`](CANONICAL_DSAR_CRM_CDP_DISCOVERY_OBJECTS.md) · ADR=[`../architecture/ADR_DSAR_CRM_CDP_DATA_DISCOVERY.md`](../architecture/ADR_DSAR_CRM_CDP_DATA_DISCOVERY.md)

---

## 1. Search API (§49) · Bulk Export (§50-51) · Candidate/Dedup (§52-53)

**Search API(§49)**: Provider Account Binding(=tenant)·Workspace/Business Unit Binding·Object Allowlist·Verified Identifier·Typed Filter·Date Range·Status Filter·Deleted Inclusion·Pagination·Result Limit·Rate Limit·Audit. (내부=Part 3-3-3-3-3-2 Query Template·Scope Predicate 재사용.)
**Bulk Export(§50)**: Exact Search 부족·Historical Coverage·Object 다수·Server-side Filter 가능·단일 Tenant/Brand 안전매핑·Approval·Result Encryption·Temporary Retention·Row-level Candidate Validation **조건에서만**. **★전체 CRM/CDP Account Export 기본값 금지**. **파일 검증(§51)**: Provider Account·Workspace·Export Job ID·Filter·Object·Schema·Row Count·Checksum·File Size·Encryption·Expiry·Malware Scan·Tenant/Brand 확인·Pagination/Chunk 완료·Cleanup.
**Dedup(§52)**: Provider Record ID·CRM Contact/Lead Conversion Mapping(N/A)·Contact Merge Alias(merge_link)·CDP Profile Merge Alias·Canonical Person ID·External ID·Content Hash·Activity ID·Event ID·Internal Sync Record ID·Warehouse Load ID. **Cross-system(§53)**: CRM Contact↔CDP Source Profile · CRM Lead↔CDP Anonymous(N/A) · CRM Campaign Member↔CDP Audience Membership · CRM Consent↔CDP Consent · CRM Activity↔CDP Event — **동일 원천 vs 별도 처리 Lineage 확인**(현행 crm_customers=CRM+CDP source 동일·중복 과다계산 금지).

---

## 2. Reconciliation (§54-55) · Coverage (§56) · Gap (§57-58)

**Reconciliation(§54)**: CRM Provider vs Internal CRM Sync(내부=동일)·CRM Provider vs CDP Source Profile·CDP Provider vs Internal CDP Sync·CRM Contact vs Canonical Customer·CRM Lead Conversion vs Contact(N/A)·**CRM Consent vs Canonical Consent·CRM Suppression vs Canonical Suppression**·CDP Identity vs Canonical Identity·CDP Audience vs Internal Audience·**CDP Destination Membership vs Provider Destination**(AdAdapters·SEG-H2)·Deleted CRM/CDP vs Internal Active Copy. **상태(§55)**: MATCH/CRM_INTERNAL_STALE/CDP_INTERNAL_STALE/CONTACT_IDENTITY_MISMATCH/LEAD_CONVERSION_MISMATCH(N/A)/MERGE_HISTORY_MISMATCH/CONSENT_MISMATCH/SUPPRESSION_MISMATCH/AUDIENCE_MISMATCH/DESTINATION_MISMATCH/DELETION_MISMATCH/ACCOUNT_SCOPE_MISMATCH/MANUAL_REVIEW/BLOCKED.
**Coverage(§56)**: CRM(Contact·Lead(N/A)·Person Account(N/A)·Account Relationship(N/A)·Activity·Email/Call/Meeting·Note·Campaign Member·Consent·Suppression·Deleted Record·Audit History·Custom Object) · CDP(Unified/Source Profile·Identity·Anonymous·Event·Trait·Prediction·Audience·Destination·Consent·Suppression·Merge/Split·Source Contribution·Deleted Profile). **Matrix(§82)**: | Request | Contact | Lead | Activity | Custom Object | Deleted | CDP Profile | Event | Trait | Audience | Consent | Overall |
**Gap Type(§57, 23종)**: CRM_CONTACT/LEAD/PERSON_ACCOUNT/ACTIVITY/CUSTOM_OBJECT/CUSTOM_FIELD/DELETED_RECORD/FIELD_HISTORY/CONVERSION_HISTORY/MERGE_HISTORY/CONSENT · CDP_PROFILE/IDENTITY_NAMESPACE/ANONYMOUS_PROFILE/EVENT/TRAIT/PREDICTION/AUDIENCE_HISTORY/DESTINATION_MEMBERSHIP/MERGE_HISTORY/SOURCE_CONTRIBUTION · CRM_CDP_ACCOUNT_SCOPE_RISK/INTERNAL_SYNC_DRIFT. **★HIGH/CRITICAL(§58)**: CRM Account 다중 Tenant 오연결·Contact만 검색·CDP Unified만 검색·Converted Lead 누락(N/A)·Losing Merge Record 누락·Deleted 검색불가·Custom Object 민감정보 미등록·CDP Audience/Prediction 미검색·Consent 불일치·**Wrong Contact Match·Shared Email 다중 Contact 자동포함**.

---

## 3. Evidence (§59) · Explain (§60) · API (§61) · Permission (§62)

**Evidence(§59)**: request/discovery_task_id·provider/provider_account_id·workspace/business_unit·connector_id/version·object_id·endpoint_id·API_version·search_strategy·identifier_set/scope_version·deleted/archived_inclusion·date_range·pagination_status·bulk_job_id·result/candidate/duplicate/excluded_count·schema_version·error·started/completed_time·result_hash·audit_reference.
**Explain(§60)**: 어떤 CRM/CDP Account·Contact/Lead/Profile·Converted/Merged/Deleted·Activity/Event/Trait·Consent/Suppression·Audience/Destination·Custom Object·Source Contribution·중복제거·남은 Gap/Provider Limitation 설명.
**API(§61)**: CRM Discovery Profile/Object/Field Mapping · Contact/Lead/Person Account/Account Relationship/Activity/Campaign Member/Consent/Suppression/Deleted/Merge·Conversion/Custom Object 검색 · CDP Discovery Profile · Unified Profile/Identity Alias/Anonymous/Event/Trait·Prediction/Audience/Destination/Consent/Merge·Split/Source Contribution 검색 · Reconciliation · Coverage/Gap · Explain/Lineage/Audit. **★`/api` 접두 필수**.
**Permission(§62, 26종)**: VIEW_CRM_DISCOVERY_PROFILE · MANAGE_CRM_OBJECT/FIELD_MAPPING · RUN_CRM_CONTACT/LEAD/ACTIVITY/DELETED_DISCOVERY · VIEW_CRM_CONVERSION/MERGE_HISTORY · RUN_CRM_CUSTOM_OBJECT_DISCOVERY · VIEW_CRM_CONSENT_DISCOVERY · VIEW_CDP_DISCOVERY_PROFILE · MANAGE_CDP_OBJECT/NAMESPACE_MAPPING · RUN_CDP_PROFILE/EVENT/TRAIT/AUDIENCE/DESTINATION_DISCOVERY · VIEW_CDP_MERGE_HISTORY · RUN_CRM_CDP_RECONCILIATION · VIEW_CRM_CDP_COVERAGE · MANAGE_CRM_CDP_GAP · VIEW_CRM_CDP_EVIDENCE · VIEW_CRM_CDP_AUDIT · ADMIN_CRM_CDP_OVERRIDE.

---

## 4. Static Lint (§63) & Runtime Guard (§64)

**Static Lint(§63)**: **Contact만 검색하는 CRM Discovery** · Converted Lead 누락(N/A 시 스킵) · Merge Alias 검색 누락 · Provider Account Binding 없는 CRM Query · Custom Object Registry 누락 · Custom Field Classification 누락 · Activity Search 누락 · Deleted Record Search 누락 · **CRM Consent 를 Canonical Consent 로 직접확정** · **CDP Unified Profile 만 검색** · CDP Event Search 누락 · Trait/Prediction 누락 · Audience Membership 누락 · CDP Namespace Binding 누락 · **Anonymous ID 를 Person ID 로 직접확정** · **Shared Email Contact 자동포함** · Business Account 전체 자동포함(N/A) · **Free Text Note 직접 Export** · Pagination 미완료 · Raw CRM/CDP Response 로그 · Full Account Bulk Export · Evidence 누락.
**Runtime Guard(§64)**: Invalid Verification Token · **Wrong CRM Organization · Wrong CDP Workspace · Cross-Tenant Provider Account · Wrong Brand Business Unit** · Shared Identifier Broad Match · Converted Lead Mapping 미검증(N/A) · Merge Conflict 미해결 · Business Account 전체 확장(N/A) · Custom Object Scope 미확인 · Deleted Record Endpoint 미승인 · CDP Identity Conflict · Anonymous Profile Control 미확인 · CDP Event Full Export · Free Text Note 무승인 조회 · Pagination 미완료 Complete · Bulk Export Scope 초과 · Critical Schema Drift · **Kill Switch**.

---

## 5. Error (§65) · Warning (§66)

**Error(§65, 27종)**: CRM_PROVIDER_ACCOUNT_SCOPE_MISMATCH · CRM_CONTACT_NOT_FOUND · CRM_LEAD_CONVERSION_UNRESOLVED(N/A) · CRM_CONTACT_MERGE_UNRESOLVED · CRM_ACCOUNT_RELATION_SCOPE_UNSAFE(N/A) · CRM_ACTIVITY_SEARCH_FAILED · CRM_CUSTOM_OBJECT_UNMAPPED · CRM_CUSTOM_FIELD_UNCLASSIFIED · CRM_DELETED_RECORD_UNAVAILABLE · CRM_CONSENT/SUPPRESSION_MAPPING_MISSING · CDP_WORKSPACE_SCOPE_MISMATCH · CDP_PROFILE_NOT_FOUND · CDP_IDENTITY_NAMESPACE_UNMAPPED · CDP_IDENTITY_CONFLICT · CDP_ANONYMOUS_PROFILE_UNVERIFIED · CDP_EVENT_SEARCH_FAILED · CDP_TRAIT/PREDICTION_MAPPING_MISSING · CDP_AUDIENCE_HISTORY_UNAVAILABLE · CDP_DESTINATION_MEMBERSHIP_UNAVAILABLE · CDP_MERGE_HISTORY_UNAVAILABLE · CRM_CDP_RECONCILIATION_FAILED · COVERAGE_INCOMPLETE · CRITICAL_GAP · PERMISSION_DENIED · RUNTIME_BLOCKED.
**Warning(§66, 20종)**: CRM_MULTIPLE_CONTACT_MATCH · CRM_SHARED_EMAIL_WARNING · CRM_CONVERTED_LEAD_WARNING(N/A) · CRM_MERGED_RECORD_WARNING · CRM_ACTIVITY_PARTIAL_WARNING · CRM_CUSTOM_OBJECT_WARNING · CRM_DELETED_DATA_WARNING · CRM_FIELD_HISTORY_WARNING · CRM_CONSENT_CONFLICT_WARNING · CDP_MULTIPLE_PROFILE_MATCH · CDP_SHARED_IDENTITY_WARNING · CDP_ANONYMOUS_PROFILE_WARNING · CDP_EVENT_COVERAGE_WARNING · CDP_TRAIT_PROXY_WARNING · CDP_PREDICTION_WARNING · CDP_AUDIENCE_HISTORY_WARNING · CDP_SOURCE_CONTRIBUTION_WARNING · CRM_CDP_INTERNAL_SYNC_DRIFT · MANUAL_REVIEW_REQUIRED · SLA_RISK.

---

## 6. Golden Dataset (§67) · Conformance (§68) · Equivalence (§69-70)

**Golden(§67·60+ 시나리오·N/A 표기)**: CRM Contact Exact ID/Verified Email/Shared Email/Multiple Match · (Lead/Conversion/Person Account/Business Account=N/A) · Contact Merge Winning/Losing Record · CRM Task/Meeting/Call/Email History · Note Third-party Data/Privilege Review · Campaign Member · CRM Consent/Do-not-contact/Hard Bounce/Complaint · CRM Deleted Contact(tombstone)/Field History · Custom Object/Sensitive Field · CDP Unified Profile Exact ID/Verified Email Namespace/Shared Identity · Anonymous Profile/Anonymous-to-known Merge/Device/Cookie · CDP Event/Late Event · Source/Computed/Sensitive Proxy Trait · Churn/LTV Prediction · Current/Historical Audience Membership/Exit · Destination Membership/Removal · CDP Consent/Suppression · CDP Merge/Split History · Source Contribution · Deleted CDP Profile · CRM Contact·CDP Profile Duplicate · CRM Campaign·CDP Audience Relationship · CRM Consent·CDP Consent Conflict · Internal CRM/CDP Sync Stale · Wrong CRM Account/CDP Workspace 차단 · Pagination 완료/누락 차단 · Bulk Export Scope 초과 차단 · Coverage Complete/Critical Gap · Override 허용/금지.
**Conformance(§68)**: Provider Account Scope·Object Registry·Field/Identifier Mapping·Contact·(Lead/Conversion/Merge N/A)·Activity·Custom Object·Consent·Deleted Record·Unified Profile·Identity Namespace·Anonymous·Event·Trait·Prediction·Audience·Destination·Merge/Split·Candidate·Reconciliation·Coverage·Evidence·Audit.
**Equivalence(§69)**: 기존 `Dsar::collectSubjectData`(crm_customers/activities/channel_prefs/email_suppression)·Customer 360(269+270차)·CustomerAI 와 비교(Contact/Activity/Campaign Membership/Consent/Suppression/Deleted Record/CDP Profile/Identity Alias/Event/Trait/Prediction/Audience/Destination/Merge History/Internal Sync·Error·Warning·Latency·Audit). **Difference(§70)**: MATCH·EXPECTED_{CONTACT/LEAD_CONVERSION(N/A)/MERGE/ACTIVITY/CUSTOM_OBJECT/CONSENT/CDP_IDENTITY/EVENT/TRAIT/AUDIENCE/DELETED_DATA}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_DISCOVERY_GAP·LEGACY_WRONG_CONTACT_RISK**·CANONICAL_CRM_CDP_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_CONTACT_RISK`·고객영향 `LEGACY_DISCOVERY_GAP`=운영전환 차단**.

---

## 7. Observability (§71) · Alert (§72) · Audit (§73)

**Metrics(§71)**: CRM Account/CDP Workspace Count·Contact/Lead(N/A)/Converted Lead(N/A)/Person Account(N/A)/Account Relationship(N/A)/Contact Merge/Account Merge(N/A) Candidate·Activity/Email·Call·Meeting/Note Review·Campaign Member·CRM Consent/Suppression·Deleted CRM Record·Custom Object/Unclassified Custom Field·CDP Profile/Identity Alias/Anonymous Profile/Event/Trait/Computed Trait/Prediction/Audience/Historical/Destination Membership·CDP Consent/Suppression·Merge/Split·Reconciliation Mismatch·Wrong Contact Block·Cross-Tenant Block·Coverage Gap·Legacy Usage·P50/P95/P99.
**Alert(§72)**: CRM/CDP Account Mapping 오류·Contact 검색실패 급증·Converted Lead 누락(N/A)·Merge History 누락·Activity Coverage 급감·Custom Object 미등록·Sensitive Custom Field 미분류·Deleted 검색실패·CRM Consent Conflict 급증·CDP Identity Conflict 급증·**Anonymous Profile 자동 Person Match**·CDP Event Coverage 급감·Prediction 미등록·Audience History 누락·Destination Removal Drift·Internal Sync Drift 급증·**Wrong Contact Candidate 급증**·Critical Gap·Legacy 신규사용.
**Audit Event(§73, 31종)**: CRM_DISCOVERY_PROFILE_CREATED · CRM_OBJECT_REGISTERED · CRM_FIELD_MAPPING_CREATED · CRM_CONTACT/LEAD_DISCOVERED · CRM_LEAD_CONVERSION_LINKED(N/A) · CRM_CONTACT_MERGE_LINKED · CRM_ACCOUNT_RELATION_DISCOVERED(N/A) · CRM_ACTIVITY/CAMPAIGN_MEMBER/CONSENT/SUPPRESSION/DELETED_RECORD/CUSTOM_OBJECT_DISCOVERED · CDP_DISCOVERY_PROFILE_CREATED · CDP_NAMESPACE_REGISTERED · CDP_PROFILE/IDENTITY_ALIAS/ANONYMOUS_PROFILE/EVENT/TRAIT/PREDICTION/AUDIENCE_MEMBERSHIP/DESTINATION_MEMBERSHIP/CONSENT_DISCOVERED · CDP_PROFILE_MERGE/SPLIT_LINKED · CRM_CDP_DUPLICATE_GROUPED · RECONCILIATION_COMPLETED · GAP_DETECTED · RUNTIME_BLOCKED (SecurityAudit 확장).

---

## 8. Existing Impl Classification (§74) · Duplicate Audit (§75) · Regression Gate (§76)

**분류(§74)**: 실측 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `crm_customers`(Contact/Customer·identity_id) | `MIGRATION_REQUIRED` → `CANONICAL_CRM_CONTACT_ADAPTER` | Contact Discovery/Candidate 형식화(Merge/Deleted 포함) |
| `crm_activities` | `MIGRATION_REQUIRED` → `CANONICAL_CRM_ACTIVITY_ADAPTER`/`CDP_EVENT_ADAPTER` | Activity+Event 이중매핑 |
| `crm_segments`+`crm_segment_members`(version/snapshot 부재 289차) | `CONSOLIDATION_REQUIRED` → `CANONICAL_CDP_AUDIENCE_ADAPTER` | Membership Discovery·Historical Gap |
| `crm_channel_prefs`/`crm_customer_prefs` | `LEGACY_ADAPTER` → CRM/CDP Consent(Part 3-3-1) | Canonical Consent Reconciliation |
| `email_suppression` | `LEGACY_ADAPTER` → Suppression(Part 3-3-2) | Canonical Suppression Reconciliation |
| **`crm_identity`+`crm_identity_merge_link`**(내부 Identity 360) | `MIGRATION_REQUIRED` → `CANONICAL_CDP_IDENTITY_ADAPTER` | Unified Profile·Namespace·Merge Discovery |
| `CustomerAI`(RFM 이탈/LTV/Affinity) | `LEGACY_ADAPTER` → `CANONICAL_CDP_TRAIT_ADAPTER` | Trait/Prediction Discovery |
| `GdprConsent`(쿠키) | `LEGACY_ADAPTER` → CDP Anonymous/Consent | 재사용 |
| `Dsar::collectSubjectData`(이 테이블 검색) | `MIGRATION_REQUIRED` → CRM/CDP Adapter 통합 | Coverage/Candidate/Merge 확장 |
| **외부 CRM/CDP SaaS·Lead/Person Account/Conversion·Business Account** | `UNVERIFIED`(NOT_APPLICABLE) | **미통합·B2C·Klaviyo/Braze=벤치마크·지어내기 금지** |
**Duplicate Audit(§75)**: 실측 — CRM Contact=`crm_customers` 단일·Identity=`crm_identity`/merge_link 단일·Consent=`crm_channel_prefs` 단일·Suppression=`email_suppression` 단일·Audience=`crm_segments` 단일. **중복 Contact/Identity/Consent/Audience Search·Candidate Store 신설 위험만 차단**(§86 Object별 독립 Case Registry 금지).
**Regression Gate(§76)**: 변경 전후 Contact·Activity·Campaign Member·Consent·Suppression·Deleted Record·Custom Object·Unified Profile·Identity Alias·Anonymous·Event·Trait·Prediction·Audience·Destination·Merge/Split·Source Contribution·Reconciliation·Coverage·Explain·Audit·**Existing API Compatibility**(collectSubjectData·CRM·CustomerAI·GdprConsent 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 9. 완료 상태 요약

CRM/CDP Entity 31 · CRM Discovery Profile(내부)/Object 27(Lead/Person Account/Business Account/Conversion=NOT_APPLICABLE)/Field/Identifier · Contact Discovery(=crm_customers)·Merge(=merge_link)·Activity(=crm_activities)·Email/Call/Note·Custom Object/Field·Campaign/Marketing Status·Consent(=crm_channel_prefs)/Suppression(=email_suppression)·Deleted(=tombstone)/Audit · CDP Discovery Profile(=crm_identity)/Object 23·Unified Profile/Namespace/Alias/Anonymous(=GdprConsent)·Event(=crm_activities)/Trait·Prediction(=CustomerAI)·Audience(=crm_segments)/Destination(=AdAdapters)·Consent/Merge(=merge_link)/Split(=Unmerge)/Source Contribution · Search/Bulk API·Candidate/Dedup/Cross-system·Reconciliation 14상태·Coverage/Gap 23유형·Evidence/Explain·API/Permission 26·Static Lint 23/Runtime Guard 18·Error 27/Warning 20·Golden 60+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★외부 CRM/CDP SaaS·Lead/Person Account/Conversion=NOT_APPLICABLE 정직표기(Klaviyo/Braze=벤치마크)**. **실 Adapter/Reconciliation/CI가드 구현=후속 승인 세션·verify+배포승인**.
