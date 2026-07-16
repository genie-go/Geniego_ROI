# ADR — DSAR CRM & CDP Data Discovery (Internal CRM/CDP Reality) (EPIC 06-A Part 3-3-3-3-3-3-2)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (CRM & CDP Data Discovery 계약 명세 확정. 비파괴 — 코드변경 0). 실 CRM/CDP Adapter·Merge/Deleted Discovery·Reconciliation·CI 가드 구현은 후속 승인 세션(Golden CRM·CDP Dataset+Conformance+Legacy Equivalence+verify+배포승인). **Contact만 검색하고 완료선언·CDP Unified Profile만 검색·Anonymous ID를 Person ID 자동확정·Shared Email 다중 Contact 자동포함·Free Text Note 직접 Export·Consent와 Marketing Status 혼용·전체 Account Bulk Export 금지.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_CRM_CDP_DISCOVERY_SCHEMA.md`](../segmentation/CANONICAL_DSAR_CRM_CDP_DISCOVERY_SCHEMA.md) · [`OBJECTS`](../segmentation/CANONICAL_DSAR_CRM_CDP_DISCOVERY_OBJECTS.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_CRM_CDP_DISCOVERY_GOVERNANCE.md) · **내부 CRM/CDP** crm_customers·crm_activities·crm_segments/_members·crm_channel_prefs·crm_customer_prefs·email_suppression·**crm_identity+crm_identity_merge_link**·CustomerAI·GdprConsent·AdAdapters audience·Dsar::collectSubjectData · Part 3-3-3-3-3-1/2 Discovery/Structured · Part 3-3-3-3-2 Verification Token · EPIC05 Identity/Merge·Part 3-3-1/3-3-2 Consent/Suppression.

## 결정 (핵심)

1. **★내부 CRM/CDP·외부 SaaS 미통합 정직(§실측)**: GeniegoROI CRM/CDP=**내부 DB**(crm_customers/activities/segments/channel_prefs/email_suppression/crm_identity/merge_link/CustomerAI/GdprConsent). **외부 CRM/CDP SaaS(Salesforce/HubSpot/Segment/Klaviyo/Braze) 미통합** — Klaviyo(33)/Braze(13)/Salesforce(1)/HubSpot(1)=주석 내 **경쟁 벤치마크**("Klaviyo 수준 이상")·커넥터 아님. 본 Part=내부 CRM/CDP **도메인 시맨틱 계층**(Part 3-3-3-3-3-2 Structured 위). **Lead/Person Account/Lead Conversion/Business Account Contact Role=NOT_APPLICABLE**(B2C 커머스·지어내기 금지). 기존 crm_*/CustomerAI/GdprConsent/Customer 360=정본·확장·Object별 독립 Case Registry 금지(§86).

2. **Contact만 ≠ CRM 완료(§3.1)**: Contact(crm_customers) 외 Activity(crm_activities)·Consent(crm_channel_prefs)·Suppression(email_suppression)·Audience Membership(crm_segment_members)·Merge(merge_link)·Deleted(tombstone)·Custom Object·Field History 동반 검색.

3. **Merge Alias·Losing Record(§15·EPIC05)**: crm_identity_merge_link Winning/Losing·Alias·Migrated Fields/Activities 추적 → **Losing Contact ID 로 검색된 데이터도 Winning Record 연결**. (Business Account/Lead Conversion Merge=N/A.)

4. **Free Text Note·Business Account(§3.3·3.4)**: Note/Email Body/Free Text=다른 사람 정보/Privilege/Security/Trade Secret 가능 → 직접 Export 금지·Review/Redaction. Business Account 전체 자동포함 금지(N/A·외부 CRM 도입 시 강제).

5. **CDP Unified Profile만 ≠ 완료·Stitching ≠ 진실(§3.5·3.6)**: crm_identity(Unified) 외 Source Profile·Alias·Anonymous(GdprConsent)·Event(crm_activities)·Trait/Prediction(CustomerAI)·Audience(crm_segments)·Destination(AdAdapters)·Consent·Merge/Split·Source Contribution. Identity Stitching(merge_link) 결과=Canonical Identity(EPIC05)·Namespace·Source·Merge Rule·Confidence·Split History 비교(절대진실 아님).

6. **Anonymous ID ≠ Person·Audience Membership=개인데이터(§3.6·3.7)**: Anonymous/Cookie/Device(GdprConsent pixel) Control Evidence·Subject Binding 없으면 Person 자동확정 금지. Audience Membership(crm_segment_members)=Definition Version/Entry/Exit/Destination Sync/Suppression 포함 개인데이터. crm_segments version/snapshot 부재(289차 Part1)→Historical Membership=Audit/Snapshot/Warehouse Gap 명시.

7. **Consent ≠ Marketing Status·Destination Reconciliation(§3.8)**: Legal Consent/Marketing Opt-in/Subscription/Bounce/Complaint/DNC/Suppression/Unsubscribe 구분·Canonical Consent(Part 3-3-1)/Suppression(Part 3-3-2) Reconciliation. Destination Membership(AdAdapters Meta/Google/TikTok)=provider_removal_state(SEG-H2 Removal/Reconciliation 정합).

8. **정직·무후퇴·Coverage/Gap**: Merge/Deleted/Reconciliation/Coverage/Gap Discovery=현행 부재→목표계약. crm_*/CustomerAI/GdprConsent/AdAdapters/collectSubjectData 보존(Legacy Equivalence·API Compatibility). Contact/Identity/Consent/Audience 각 단일(중복 없음). UNEXPLAINED·LEGACY_WRONG_CONTACT_RISK·고객영향 LEGACY_DISCOVERY_GAP→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§86)
신규 CRM/CDP Object·Custom Field·Identity Namespace·Trait·Audience 를 Discovery 대상 추가 전: Provider Account Scope(내부=tenant)·Object Registry·Canonical Entity·Subject Identifier Field·Tenant/Brand Scope·Personal/Sensitive 분류·Search/Deleted/History Capability·Merge 영향·Consent/Suppression Mapping·Candidate/Dedup·Coverage 정의 → Golden/Conformance·Lint/Guard·중복/후퇴·ADR/PM 기록. **Contact/Activity/Profile별 독립 DSAR Case Registry/Candidate Store 중복 생성 금지.**

## 결과
CRM/CDP Entity(31)·CRM Discovery Profile(내부)/Object(27·Lead/Person Account/Business Account/Conversion=NOT_APPLICABLE)/Field/Identifier·Contact(crm_customers)/Merge(merge_link)/Activity(crm_activities)/Email/Note/Custom Object/Campaign/Marketing Status/Consent(crm_channel_prefs)/Suppression(email_suppression)/Deleted(tombstone)/Audit·CDP Discovery Profile(crm_identity)/Object(23)/Unified Profile/Namespace/Alias/Anonymous(GdprConsent)/Event(crm_activities)/Trait·Prediction(CustomerAI)/Audience(crm_segments)/Destination(AdAdapters)/Consent/Merge/Split/Source Contribution·Search/Bulk API·Candidate/Dedup/Cross-system·Reconciliation(14)·Coverage/Gap(23)·Evidence/Explain·API/Permission(26)·Lint(23)/Guard(18)·Error(27)/Warning(20)·Golden(60+)/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_CRM_CDP_DISCOVERY_{SCHEMA,OBJECTS,GOVERNANCE}.md(§79 70여 문서 통합). **★외부 CRM/CDP SaaS·Lead/Person Account/Conversion=NOT_APPLICABLE 정직표기(Klaviyo/Braze=벤치마크)**. 다음 **EPIC 06-A Part 3-3-3-3-3-3-3 — Commerce·Marketplace·Subscription·Payment Data Discovery** 입력 준비 완료.
