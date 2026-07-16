# Canonical DSAR Verification Workflow — Email/Phone/MFA/Step-up, Document/Vendor, Manual/Four-eyes, Identity Match/Conflict/Shared/Merge, Deleted/Anonymous, Agent/Guardian/Legal/Company Representative, Authorization Scope/Version/Revocation & Decision/Reverification

> **EPIC 06-A Part 3-3-3-3-2** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `UserAuth` MFA/OTP·`AgencyPortal` agency_client_link(위임·revoke·scope) · `Dsar::verify` 이메일 · Customer Identity Graph(EPIC05 person_id·Merge/Unmerge Orchestrator) · Part 3-3-2 Suppression·Deletion Tombstone(Part 3-3-3-2) · Part 3-3-3-3-1 DSAR Registry.
> 형제: [`CANONICAL_DSAR_VERIFICATION_SCHEMA.md`](CANONICAL_DSAR_VERIFICATION_SCHEMA.md) · [`CANONICAL_DSAR_VERIFICATION_GOVERNANCE.md`](CANONICAL_DSAR_VERIFICATION_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_IDENTITY_VERIFICATION_AUTHORIZATION.md`](../architecture/ADR_DSAR_IDENTITY_VERIFICATION_AUTHORIZATION.md)

---

## 1. Email (§18-19) · Phone (§20-21) Ownership Verification

**Email(§18)**: email_identifier_reference · normalized_email_hash · verification_challenge_id · sent_at · expiry · attempt_count · success_at · bounce_status · complaint_status · shared_email_risk · account_relationship · verification_result · audit. **금지(§19)**: OTP 평문로그 · 만료없는 Link · 재사용 Link · 다른 Brand/Request Link 재사용 · Subject 무관 Email 사용 · Redirect URL 미검증 · Link Token Query 장기보존 · **Shared Email 을 Person Identity 로 자동확정**.
**Phone(§20)**: phone_identifier_reference · normalized_phone_hash · country_code · verification_challenge · sent_at · expiry · attempt_count · success_at · carrier_risk · reused_number_risk · shared_phone_risk · SMS_capability · verification_result · audit. **금지(§21)**: OTP 평문저장 · 번호존재 노출 · 무제한 재시도 · 국가코드 무시 · Recycled Number 무시 · **Family Shared Number 자동 Person Match** · Provider 성공만으로 실제수신 확정 · 다른 Request OTP 재사용.
**★핵심(§3.3)**: Email/Phone Verification = **Identifier Control Evidence 이지 항상 Person Identity Proof 아님**(Shared/Family/Company/Recycled/Forwarding/Alias/Compromised/Shared Device 고려).

---

## 2. MFA (§25) · Verified Device (§26) · Knowledge-based 제한 (§27)

**MFA(§25)**: TOTP·Push·Passkey·Hardware Key·SMS OTP·Email OTP·Recovery Code. 고위험 Request 에서 **SMS/Email 단일 Factor 충분 여부 Policy 제한**. (현행 mfa_method totp/sms/email 확장.)
**Verified Device(§26)**: device_id·binding·first/last_seen·authentication_history·compromise_status·logout_status·shared_device_risk·browser_storage_risk·environment·valid_until. **★Device Trust 만으로 고위험 DSAR Fulfillment 승인 금지**.
**Knowledge-based 제한(§27·§3.4)**: 보조질문(제한 Account 정보·과거 Interaction·일부 거래 Context·계약관계)만 보조신호. **금지**: 전체 주민번호·전체 결제카드·Password·Secret Question 평문·타고객 공유가능 정보·공개검색 가능정보만으로 고신뢰 판정.

---

## 3. Document Verification (§28-34)

**Trigger(§28·최소수집 §3.5)**: Account 접근불가·Verified Identifier 접근불가·Authorized Agent·Guardian/Parent·Legal Representative·Identity Conflict·High Sensitive Export·Regulator/Legal·Manual Review 결정 **시에만**.
**Type(§29, 12종)**: GOVERNMENT_ID·PASSPORT·DRIVER_LICENSE·RESIDENCE_DOCUMENT·GUARDIANSHIP_DOCUMENT·POWER_OF_ATTORNEY·LEGAL_REPRESENTATIVE_DOCUMENT·EXECUTOR_DOCUMENT·COMPANY_AUTHORITY_DOCUMENT·COURT_ORDER·REGULATOR_DOCUMENT·CONTRACT_EVIDENCE. 불필요 Type 무분별 요구 금지.
**Evidence Schema(§30)**: document_evidence_id·request_id·verification_session_id·document_type·issuing_jurisdiction·holder_reference·**document_number_tokenized_reference**·issue/expiry_date·extracted_attributes·redaction_status·authenticity_status·match_status·provider_reference·content_hash·stored_object_reference·retention_until·deletion_status·access_policy·audit_reference.
**Minimization(§31·§3.6)**: 필요한 면만·불필요 필드 Redaction·Number Tokenization·해상도 제한·Metadata/EXIF 제거·Face Image 제한·**원본 짧은 Retention·Verification Result 장기 최소보존**·Download 금지/제한·Watermark·Access Audit. (Part 3-3-3-2 Retention 정합.)
**결과(§32)**: VERIFIED/VERIFIED_WITH_WARNINGS/PARTIAL_MATCH/MISMATCH/EXPIRED_DOCUMENT/UNSUPPORTED_DOCUMENT/TAMPER_SUSPECTED/LOW_QUALITY/MANUAL_REVIEW_REQUIRED/BLOCKED.
**Provider Adapter(§33-34)**: provider_id·service·supported_documents/regions·data_categories·retention·provider_logging·subprocessor·verification_response·confidence·webhook·polling·deletion_API·incident_process·agreement·certification·status·version. **★Provider 결과를 최종진실로 사용 금지** → DSAR Subject Match·Tenant/Brand·Scope·Confidence·Expiry·Duplicate Identity·Existing Customer Identity·Fraud·Manual Review 추가평가. (Part 3-3-3-1 Processor Registry 정합.)

---

## 4. Manual Review (§35) · Four-eyes (§36)

**Manual Review(§35)**: manual_review_id·request_id·verification_session_id·reviewer·review_reason·available/conflicting_evidence·privacy_risk·security_risk·decision·conditions·reviewed_at·valid_until·second_review_required·audit_reference.
**Four-eyes(§36·2인검토)**: 매우민감 Export·Agent Full Export·Identity Conflict·Guardian/Minor·Deceased Subject·High Fraud·Cross-border Delivery·Document Tampering 의심·Manual Override·Verification 실패후 예외승인.

---

## 5. Identity Match (§42-44) · Conflict (§45-46) · Merge/Unmerge (§47) · Shared (§48) · Deleted (§49) · Anonymous (§50)

**Match Contract(§42)**: Request Subject·Customer Profile·Person ID·Account ID·Verified Email/Phone·Name·Address·Contract Relationship·External Customer ID·Device·Document Attribute·Identity Graph·Merge/Unmerge History 비교. (EPIC05 Customer Identity Graph 연결.) **상태(§43)**: EXACT/STRONG/PARTIAL/POSSIBLE_MATCH·CONFLICT·NO_MATCH·SHARED_IDENTIFIER·MULTIPLE_SUBJECTS·MANUAL_REVIEW·BLOCKED. **Score 정책(§44)**: **Score 만으로 자동승인 금지** → Identifier Control·Account Authentication·Biographical·Relationship·Document·Device·Historical Consistency·Fraud·Shared Identifier·Merge/Unmerge Dimension 별도평가.
**Conflict Handling(§45)**: 동일 Email 여러 Profile·동일 Phone 여러 Person·Merge/Unmerge 진행중·Account-Person 불일치·Deleted vs Active·Shared Household/Company Contact·Recycled Phone·Wrong External ID·Legacy Duplicate. **상태(§46)**: SAFE_TO_PROCEED/SCOPE_LIMITED/ADDITIONAL_VERIFICATION_REQUIRED/MANUAL_REVIEW_REQUIRED/CUSTOMER_IDENTITY_RECONCILIATION_REQUIRED/**WRONG_SUBJECT_RISK**/BLOCKED.
**Merge/Unmerge(§47)**: 현재 Canonical Person·원본 Profile·**접수시점 Identity Version vs 현재 Version**·Consent/Suppression·Authorization Subject·Scope·데이터 분리가능성·Wrong-subject Risk 확인 → 필요 시 Identity Reconciliation 완료까지 Fulfillment 중지. (EPIC05 Merge/Unmerge Orchestrator 정합.)
**Shared Identifier(§48)**: 공유 Identifier 만으로 Full DSAR 권한 금지 → Account Login·Individual Name·Transaction Relationship·Device·Secondary Identifier·Document·Manual Review·Data 범위 추가확인.
**Deleted Subject(§49)**: Deletion Tombstone·최소 식별 Reference·이전 Account Evidence·Requester 보유 Evidence·Retained Compliance Data·Suppression·Archive·Verification 가능범위·**존재 여부 노출 위험**. (Part 3-3-3-2 Tombstone 정합.)
**Anonymous(§50)**: Cookie/Device Control·Browser Storage Token·Signed Identifier·Domain/App Scope·Session·Expiry·Known Person 연결·Shared Device Risk·Data Availability.

---

## 6. Authorized Agent (§51) · Authorization (§52-55) · Subject Confirmation (§56) · Guardian/Legal/Company/Deceased (§57-60)

**Agent Identity(§51)**: Agent Identity·Contact·Organization·Account·Jurisdiction·Fraud History·Authorization Evidence·Delivery Channel·Validity. **★Agent 본인 검증만으로 불충분(§3.8)** — Agent Identity + Subject Identity + 관계 + Authorization Evidence + Type + Scope + Validity + Revocation + Delivery 권한 각각 검증.
**Authorization Record(§52)**: authorization_record_id·authorization_version_id·request_id·subject_id·requester_id·representative_id·authorization_type·authority_source·allowed_request_types·allowed_data_categories·allowed_actions·allowed_delivery·scope·valid_from/until·status·evidence_ids·revoked_at·revocation_reason·created/updated_at·audit_reference. **Type(§53, 10종)**: SUBJECT_SIGNED_AUTHORIZATION·POWER_OF_ATTORNEY·PARENTAL_AUTHORITY·GUARDIANSHIP·LEGAL_REPRESENTATION·EXECUTOR_AUTHORITY·COMPANY_AUTHORITY·COURT_ORDER·REGULATORY_AUTHORITY·INTERNAL_DELEGATION. **상태(§54)**: DRAFT/PENDING_VERIFICATION/VERIFIED/VERIFIED_WITH_LIMITS/EXPIRED/REVOKED/INVALID/INSUFFICIENT/DISPUTED/MANUAL_REVIEW/BLOCKED. **Scope(§55)**: Request Type·Data Category·Date Range·Brand·Tenant·Account·Delivery Method·Export 수령·Correction·Restriction·Erasure·Appeal·Communication 권한 제한. **Matrix(§101)**: | Authorization ID | Subject | Representative | Type | Request Types | Scope | Valid From | Valid Until | Evidence | Status |
**Subject Confirmation(§56)**: Agent 요청 시 Subject 에게 별도확인(Agent Identity·Type·Scope·Delivery·Validity·Revocation 방법). Subject 연락이 위험/부적절하면 Legal Review.
**Guardian(§57)**: Requester/Minor Identity·관계·보호자권한·Jurisdiction·Age·Validity·Scope·다른 Guardian Conflict·Court Restriction·Subject 권리/의사·Evidence·Manual Review. **Legal Rep(§58)**: Representative Identity·Legal Document·Issuing Authority·Scope·Validity·Jurisdiction·Revocation·Specific Request/Delivery/Appeal 권한. **Company Rep(§59)**: 개인 Subject vs 회사 Account Data 구분·회사권한·Domain·Contract·Account Role·Personal Data Scope·다른 직원 데이터·회사 Secret vs 개인권리. **★회사대표 권한 ≠ 다른 직원 개인데이터 전체공개**. **Deceased/Executor(§60)**: 사망 Evidence·Executor Identity/권한·Jurisdiction·허용권리·Account Content·Third-party Rights·Sensitive·Legal Review·Scope·Delivery.

---

## 7. Authorization Versioning (§61) · Revocation (§62) · Verification Evidence (§63-64) · Decision (§65-66) · Validity (§67) · Reverification (§68)

**Versioning(§61)**: Scope/Request Type/Validity/Representative/Evidence/Subject Confirmation/Delivery 권한 변경·Revocation·Legal Review 결과 변경 시 새 Version.
**Revocation(§62)**: revocation_id·authorization_record_id·revoked_by·source·reason·effective_at·affected_requests·affected_jobs·delivery_links·notifications·audit. **★Revocation 후 신규 Fulfillment/Delivery 즉시 차단**. (AgencyPortal revoke 즉시 403 패턴 정합.)
**Evidence(§63)**: verification_evidence_id·verification_session_id·request_id·requester_id·subject_id·evidence_type·source·source_reference·content_hash·extracted_claims·verification_result·trust_level·classification·captured_at·valid_until·retention_until·deletion_status·access_policy·audit_reference. **Trust Level(§64)**: HIGH/MEDIUM/LOW/UNVERIFIED/INVALID — **하나만으로 최종확정 금지**.
**Decision(§65)**: verification_decision_id·request_id·verification_session_id·requester_id·subject_id·required/achieved_assurance_level·identity_match_status·authentication_status·authorization_status·risk_level·decision·allowed/prohibited_scope·required_controls·reasons·warnings·decided_by·decided_at·valid_until·reverification_required_at·policy_versions·lineage_id·audit_reference. **Type(§66)**: VERIFIED/VERIFIED_WITH_LIMITS/ADDITIONAL_VERIFICATION_REQUIRED/MANUAL_REVIEW_REQUIRED/AUTHORIZATION_REQUIRED/IDENTITY_CONFLICT/FAILED/EXPIRED/BLOCKED/ERROR. **Matrix(§100)**: | Request | Requester | Subject | Required Level | Achieved Level | Identity Match | Authorization | Risk | Valid Until | Decision |
**Validity(§67)**: Request Type·Data Sensitivity·Method·Assurance Level·Session Age·Account Risk·Agent 여부·Authorization Validity·Identity Version·Delivery 시점·Policy Version 따라 유효기간 결정. **★영구 신뢰 금지**.
**Reverification Trigger(§68)**: Fulfillment 시작·Scope 확대·Export 생성·Delivery Link 발급·Delivery Channel 변경·장기지연·Session 만료·Result 만료·Credential 변경·MFA 변경·Email/Phone 변경·Account Recovery·Merge/Unmerge·Authorization 변경/만료·Fraud 상승·New Device/Location·Request Reopen.
