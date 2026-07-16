# Canonical DSAR CRM & CDP Discovery Objects — Contact/Lead/Account/Merge, Activity/Email/Note, Campaign/Consent/Suppression/Deleted, CDP Profile/Identity/Anonymous, Event/Trait/Prediction, Audience/Destination, Merge/Split/Source Contribution

> **EPIC 06-A Part 3-3-3-3-3-3-2** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): 내부 CRM/CDP — crm_customers·crm_activities·crm_segments/_members·crm_channel_prefs·crm_customer_prefs·email_suppression·crm_identity/merge_link·CustomerAI·GdprConsent·AdAdapters audience · EPIC05 Merge/Unmerge · Part 3-3-1 Consent·Part 3-3-2 Suppression.
> **★N/A 표기**: Lead/Person Account/Lead Conversion/Business Account Contact Role=외부 CRM(Salesforce) 개념·GeniegoROI B2C 미해당(지어내기 금지·전방호환 계약만).
> 형제: [`CANONICAL_DSAR_CRM_CDP_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_CRM_CDP_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_CRM_CDP_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_CRM_CDP_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_CRM_CDP_DATA_DISCOVERY.md`](../architecture/ADR_DSAR_CRM_CDP_DATA_DISCOVERY.md)

---

## 1. Contact Discovery (§9) & Lead/Person Account/Business Account (§10-14·대부분 N/A)

**Contact(§9·=crm_customers)**: 검색순서 ①Exact Contact ID(customer_id) ②Source Account-bound External ID(channel customer_id) ③Verified Email ④Verified Phone ⑤(Account Relationship·N/A) ⑥Alternate Email/Phone ⑦Merge Alias(crm_identity_merge_link) ⑧Deleted Contact(tombstone) ⑨Field History ⑩Manual Review. Candidate=provider_contact_id·account_id·tenant/brand_match·identifier_match·active_status·marketing_status(crm_channel_prefs)·consent_references·owner_reference·created/updated_date·deleted_status·merge_status·match_confidence·evidence. **★Contact만 검색하고 완료선언 금지(§3.1)** — Activity/Consent/Suppression/Segment/Merge/Deleted 동반.
**Lead(§10)·Conversion(§11)·Person Account(§12)·Business Account Relationship(§13)·Account Contact Role(§14)**: **★NOT_APPLICABLE**(GeniegoROI B2C 커머스·Salesforce식 Lead/Person Account/Contact Role 미존재). 외부 CRM SaaS 통합 시 계약 활성화. §3.2(Lead≠Contact)·§3.3(Business Account 전체 자동포함 금지)=외부 CRM 도입 시 강제.

---

## 2. Contact/Account Merge (§15-16) — 내부 Identity Merge

**Contact Merge(§15·=crm_identity_merge_link)**: Winning Contact·Losing Contact·Merge Time·Merge Actor·Migrated Fields/Activities/Campaign Membership·Alias ID·Deleted Losing Record·Audit·Internal Mapping. **★Losing Contact ID 로 검색된 데이터도 Winning Record 와 연결**(EPIC05 Merge Orchestrator 정합). **Account Merge(§16)**: N/A(Business Account 없음) — 외부 CRM 도입 시.

---

## 3. Activity (§17-18) · Email (§19) · Call/Meeting (§20) · Note (§21)

**Activity(§17·=crm_activities)**: Task/Event/Meeting/Call/Email/Note/Interaction/Timeline Entry. 검색기준=Who(Contact Reference·customer_id)·What(Account/Order Reference)·Owner·Participant·Email Address·Date Range·Subject Link·Provider Contact ID. **Inclusion Policy(§18)**: 포함=Subject 발신/수신/참석·Subject Contact 직접연결·Subject 요청처리 관련. 검토=Account만 연결·다중 Contact Meeting·내부 Note·Legal/Security Activity·다른 고객 포함 Email Thread.
**Email(§19·=email_sends)**: Email Message Object·Activity Email·Provider Tracking·Template Reference·Sender·Recipient·CC/BCC·Subject·Sent Time·Delivery Status·Open/Click·Bounce·Complaint·Unsubscribe·Conversation Thread·Attachment Reference. **★Email Body=별도 Review/Redaction**(§3.4).
**Call/Meeting(§20)**: call/meeting_id·participant·organizer·date·duration·subject·disposition·recording/transcript/note_reference·consent_relevance·third_party_presence·inclusion_status(Recording/Transcript 원문=후속 File/Communication Discovery). **Note(§21)**: note_id·parent_record·author·created/modified_date·subject_relevance·free-text_classification·**third_party_data_risk·privilege_review·security_review**·attachment_reference·export_review_status·evidence. **★Free Text=다른 사람 정보/Privilege/Security/Trade Secret 가능 → 직접 Export 금지·Review/Redaction(§3.4)**.

---

## 4. Custom Object (§22-23) · Campaign (§24) · Marketing Status (§25) · Consent (§26) · Suppression (§27)

**Custom Object(§22)**: ①Schema Scan ②Owner 확인 ③Canonical Entity 후보 ④Personal Data Field 탐지 ⑤Subject Identifier Field ⑥Tenant/Brand Scope ⑦Relationship Mapping ⑧Search Template ⑨Golden Test ⑩Certification. **★Owner/Purpose/Scope 불명 Custom Object=Gap 생성(§3.9)**. **Custom Field(§23)**: 이름/값 기반 PII 후보·Email/Phone/Address·External/Government ID·Sensitive·Free Text·Consent/Suppression Flag·AI/Risk Score·Preference·Legacy Identifier(**자동분류=Data Owner 검토**).
**Campaign Member(§24·=journey_enrollments/email_sends)**: campaign_id·campaign_member_id·contact_id·member_status·joined/responded_at·source·**consent_status_at_execution·suppression_status_at_execution**·delivery_history_reference·audience_reference·deletion_status·evidence.
**Marketing Status(§25)**: Email/Phone/SMS Opt-in·Do Not Call/Email·Unsubscribed·Hard Bounce·Complaint·Invalid Address·CRM Marketing Eligible·Provider/Internal Suppressed. **★Provider 상태 vs Canonical Consent/Suppression 비교**.
**CRM Consent(§26·=crm_channel_prefs)**: provider_consent_record_id·contact_id·purpose·channel·status·source·captured/updated/withdrawal_at·policy_version·evidence_reference·provider_account·**canonical_consent_mapping·conflict_status**. (Part 3-3-1 Consent 정합.) **CRM Suppression(§27·=email_suppression)**: Do-not-contact·Hard Bounce·Complaint·Legal Hold·Global/Channel Suppression·Invalid Contact·Deleted Contact Tombstone·Provider Blocklist. (Part 3-3-2 Suppression 정합.) **★Consent≠Marketing Status(§3.8)**.

---

## 5. Deleted Record (§28) · Field History/Audit (§29)

**Deleted(§28)**: Recycle Bin(N/A·미지원)·Deleted Object Endpoint·Archived Record·Soft Delete Flag·Audit Log·Merge Losing Record·Hard Delete Event·**Tombstone(Dsar erasure anonymize)**·Internal Sync Residue·Warehouse Residue. **★Deleted API 미지원=Provider Limitation 명시**(현행 erasure=anonymize·recycle bin 부재). **Field History/Audit(§29)**: Field History·Record Change·Owner Change·Consent Change·Marketing Status Change·Merge/Conversion/Delete/Restore/Export/Admin Access Event. Audit 보존기간·검색범위 기록(현행 dsar_audit_log/security_audit 부분).

---

## 6. CDP Unified Profile (§32) · Alias (§34) · Anonymous (§35)

**Unified Profile(§32·=crm_identity)**: 검색우선 ①CDP Profile ID(identity_id) ②Canonical External ID ③Verified Email/Phone Namespace ④Account ID ⑤Device/Anonymous Alias ⑥Identity Graph(EPIC05) ⑦Merge Alias(merge_link) ⑧Deleted Profile ⑨Manual Export. Candidate=profile_id·workspace·tenant/brand·primary_identity·aliases·source_profiles·created/updated_date·merge_state·deletion_state·audience_count·trait_count·consent_reference·match_confidence·evidence. **★CDP Unified Profile 만 검색하고 완료선언 금지(§3.5)**.
**Alias(§34)**: Email·Phone·CRM Contact ID·Commerce Customer ID·Device/Cookie/Anonymous ID·Advertising ID·Login ID·Legacy ID — 각 Validity/Source/Confidence/Shared Risk/Merge 상태. **★Identity Stitching 결과=절대진실 아님(§3.6)** — Canonical Identity·Namespace·Identifier·Source·Merge Rule·Confidence·Split History 비교.
**Anonymous(§35·=GdprConsent 쿠키/pixel)**: anonymous_id·cookie_id·device_id·session_id·source·domain/app·first/last_seen·known_profile_merge·consent_state·deletion_state·shared_device_risk·expiry·evidence. **★Anonymous ID Control 없으면 Subject Match 확정 금지**.

---

## 7. CDP Event (§36-37) · Trait (§38-40) · Prediction (§41) · Audience (§42-43) · Destination (§44) · Consent (§45) · Merge/Split (§46-47) · Source (§48)

**Event(§36-37·=crm_activities)**: 검색기준 Unified/Source Profile ID·Identity Alias·Anonymous/Device ID·Event Time·Source·Event Type·Workspace·Tenant/Brand. Candidate=event_id·profile_id·source_profile_id·anonymous_id·event_type·event/received_time·source·data_categories·properties_summary·identity_state_at_event·consent_state_at_event·deletion_status·duplicate_id·evidence(**Payload 최소저장**).
**Trait(§38-40·=CustomerAI)**: Source/Normalized/Computed/Aggregate/**Predictive/Sensitive Proxy**/Operational/Consent/Suppression Trait. Candidate=trait_id/name·profile_id·value_reference·source·calculation_reference·generated/updated_at·expiry·purpose·model_id·sensitive_proxy_risk·exportability·correction_support·evidence. Computed Trait Governance=Definition Version·Input Sources/Events·Lookback Window·Calculation Time·Output Type·Purpose·Consumer·Retention·Recalculation·Correction Impact·Deletion Propagation.
**Prediction(§41·=RFM 이탈/LTV/Affinity score)**: Churn/Propensity/LTV/Affinity/Intent/Next Best Action/Risk/Engagement/Custom Model Output — Model ID/Version·Input·Generated At·Confidence·Purpose·Consumer.
**Audience Membership(§42-43·=crm_segment_members)**: membership_id·profile_id·audience_id·**definition_version**·membership_status·entered/exited_at·qualification_reason·snapshot_time·purpose·destination_sync·suppression_exclusion·holdout/experiment_status·evidence. **★Audience Membership=개인데이터(§3.7)**. **Historical(§43)**: Provider Current만 제공 시 Audit/Export Snapshot/Internal Sync/Warehouse/Campaign Execution/Destination Delivery History 조사(현행 crm_segments version/snapshot 부재 289차 Part1→Gap).
**Destination Membership(§44·=AdAdapters Meta/Google/TikTok)**: destination_id·destination_account·profile_id/hashed_identifier·audience_id·sync_status·added/removed_at·last_sync·error·suppression_state·**provider_removal_state**·evidence. (Part 3-3-3-3-3-3-4 Marketing/Ad·SEG-H2 Removal/Reconciliation 정합.)
**CDP Consent(§45)**: Consent by Purpose/Channel·Preference·Subscription·Global/Source-specific Opt-out·Destination Suppression·Deleted Profile Suppression·Consent Conflict·Default/Unknown State(Canonical 비교). **Merge(§46·=merge_link)**: merge_event_id·winning/losing_profiles·merge_reason/rule·identity_namespace·merge_time·source_contributions·traits/audiences_migrated·consent_conflict·deletion_state·actor·evidence. **Split/Unmerge(§47·=EPIC05 Unmerge)**: split_event_id·original/resulting_profiles·split_reason·affected_identities/events/traits/audiences/consent·split_time·actor·evidence. **Source Contribution(§48)**: source_id·source_account·source_profile_id·contributed_identities/traits/events·first/last_contribution·source_status·deletion_propagation·evidence.
