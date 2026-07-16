# Canonical Suppression Schema — Entity, Type, Priority, Scope, Complaint/Bounce/Opt-out, Blocks, Frequency & Quiet Hours

> **EPIC 06-A Part 3-3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(실 suppression=`email_suppression` EmailMarketing:67·bounceWebhook 405-407·`isFrequencyCapped` CRM:1025·`isQuietNow` PreferenceCenter·phone DNC 부재 SEG-C4) · Part 3-3-1 Consent(Consent≠Suppression §3.4)
> 형제: [`CANONICAL_PREFERENCE_REVOCATION.md`](CANONICAL_PREFERENCE_REVOCATION.md) · [`CANONICAL_SUPPRESSION_GOVERNANCE.md`](CANONICAL_SUPPRESSION_GOVERNANCE.md) · ADR=[`../architecture/ADR_CANONICAL_SUPPRESSION_AND_PREFERENCE_PLATFORM.md`](../architecture/ADR_CANONICAL_SUPPRESSION_AND_PREFERENCE_PLATFORM.md)
> **성격**: 목표 계약. Privacy/Retention/DSAR 전체=Part 3-3-3. 실 스토어/Provider Removal 구현은 후속 승인 세션.

---

## 0. 현행 대비 (Part 1 실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `email_suppression`(tenant,email,reason,source) — 실 pre-send 필터·bounce/complaint/unsubscribe | **SUPPRESSION_RECORD**(Subject/Identifier/Type/Scope/Priority/Evidence/Version) — email 만→전 채널·Boolean→Record |
| `EmailMarketing::bounceWebhook`(HMAC·hard/complaint/spam/block/unsubscribe 자동 영구 suppression) | Complaint/Hard/Soft Bounce 분리 처리(§25-27) |
| `crm_channel_prefs` opt-out | Channel Suppression(Consent 와 분리 §3.4) |
| `CRM::isFrequencyCapped`(crm_activities *_sent·cross-channel 4/7d·cid>0) | **CANONICAL_FREQUENCY_ENGINE**(예약·동시성 §35-37 확장) |
| `PreferenceCenter::isQuietNow`+STO | Quiet Hours Policy(§38-39) |
| **phone DNC 부재(SEG-C4)** | PHONE_DO_NOT_CALL/SMS_OPT_OUT Type + Identifier Suppression |
| **AdAdapters Removal/Reconciliation 부재(SEG-H2/H5)** | Destination Removal(Part 3-3-2 §2) |

**무후퇴**: `email_suppression`·`isFrequencyCapped`·`isQuietNow`·bounceWebhook 은 **정본 — 재구현 금지, Suppression Engine 으로 확장**. 채널별 자체 Suppression Engine 신설 금지(§3.10).

---

## 1. Entity Model (§4) & Subject (§5-6)

Entity: `SUPPRESSION_SUBJECT` · `SUPPRESSION_RECORD(_VERSION)` · `SUPPRESSION_POLICY(_VERSION)` · `SUPPRESSION_TYPE` · `SUPPRESSION_SCOPE` · `SUPPRESSION_EVIDENCE` · `SUPPRESSION_SOURCE` · `SUPPRESSION_EVALUATION` · `SUPPRESSION_PROJECTION` · `SUPPRESSION_OVERRIDE` · `SUPPRESSION_REMOVAL_REQUEST` · `SUPPRESSION_PROPAGATION_JOB` · `PREFERENCE_*`(Part 3-3-2 §2) · `CONTACT_FREQUENCY_COUNTER` · `QUIET_HOURS_POLICY` · `RECENT_CONTACT_RECORD` · `DESTINATION_REMOVAL_JOB/RESULT` · `SUPPRESSION_RECONCILIATION`. (현행 등가=email_suppression·isFrequencyCapped·crm_channel_prefs → 확장·나머지 신규.)

**Subject(§5)**: PERSON/CUSTOMER_PROFILE/ACCOUNT_CONTACT/IDENTIFIER/EMAIL_ADDRESS/PHONE_NUMBER/PUSH_TOKEN/DEVICE/ANONYMOUS_VISITOR/HOUSEHOLD/COMPANY_CONTACT/DESTINATION_MEMBER/EXTERNAL_CONTACT.
**필드(§6)**: suppression_subject_id · subject_type · canonical_subject_reference · customer_profile_id · person_id · identifier_id · tenant/ws/brand · source_system · source_account_id · destination_account_id · environment · created/updated/deleted_at · lineage_id.

---

## 2. Record (§7) & Version (§8) & 상태 (§9)

```
suppression_record_id, suppression_record_version_id, suppression_subject_id, customer_profile_id, person_id,
identifier_id, tenant_id, workspace_id, brand_id, store_id, source_system, source_account_id, destination_account_id,
suppression_type, purpose_id, channel_id, scope_id, status, priority, reason_code, reason_detail_reference,
evidence_id, policy_id, policy_version, jurisdiction, effective_from, effective_to, expires_at,
released_at, release_reason, created_by, created_at, updated_at, lineage_id, audit_reference
```
**Version(§8)**: 이력 보존(덮어쓰기 금지). **상태(§9)**: PENDING/ACTIVE/TEMPORARY/PERMANENT/EXPIRED/RELEASE_PENDING/RELEASED/INVALID/CONFLICT/UNDER_REVIEW/DELETION_PENDING/DELETED/BLOCKED.
**★§3.2 Boolean 금지**: `suppressed=true`·`unsubscribed=true` 금지 → Subject+Identifier+Purpose+Channel+Brand+Destination+Type+Scope+Priority+Source+Effective+Expiry+Evidence+Reason+Status+Audit. 현행 email_suppression 은 email-only Boolean-ish → Record 로 확장.
**Matrix(§113)**: | Record ID | Subject | Type | Scope | Priority | Channel | Brand | Destination | Effective | Expiry | Status | Evidence |

---

## 3. Type Registry (§10-11) & Priority (§12)

**Type(§10, 33종)**: GLOBAL_DO_NOT_CONTACT · LEGAL_BLOCK · PRIVACY_BLOCK · SAFETY_BLOCK · FRAUD_BLOCK · SPAM_COMPLAINT · HARD_BOUNCE · SOFT_BOUNCE · EMAIL_UNSUBSCRIBE · SMS_OPT_OUT · PUSH_OPT_OUT · PHONE_DO_NOT_CALL · DIRECT_MAIL_OPT_OUT · BRAND_UNSUBSCRIBE · CHANNEL_UNSUBSCRIBE · PURPOSE_RESTRICTION · DESTINATION_BLOCK · PROVIDER_BLOCK · INVALID_IDENTIFIER · EXPIRED_IDENTIFIER · TEMPORARY_SUPPRESSION · FREQUENCY_CAP · QUIET_HOURS · RECENT_CONTACT · CAMPAIGN_EXCLUSION · JOURNEY_EXCLUSION · HOLDOUT · MANUAL_SAFETY_BLOCK · DELETION_BLOCK · ANONYMIZATION_BLOCK · TEST_DATA_BLOCK · DEMO_DATA_BLOCK.
**Type 필수(§11)**: suppression_type_id · name · category · default_priority · default_scope · allowed_channels/purposes · permanent 여부 · expiry 가능 · override 가능 · release/evidence/propagation requirement · execution-time recheck · owner · version · status.
**Priority(§12)**: ①DELETION_BLOCK ②LEGAL_BLOCK ③PRIVACY_BLOCK ④GLOBAL_DO_NOT_CONTACT ⑤SAFETY ⑥FRAUD ⑦SPAM_COMPLAINT ⑧HARD_BOUNCE ⑨Channel Unsubscribe ⑩Brand Unsubscribe ⑪Provider Block ⑫Invalid/Expired Identifier ⑬Temporary ⑭FREQUENCY_CAP ⑮QUIET_HOURS ⑯RECENT_CONTACT ⑰Campaign/Journey Exclusion ⑱Holdout.
**★§3.3 최제한 우선**: 낮은 우선순위 허용이 높은 우선순위 차단 덮어쓰기 금지. **§3.1 Consent Granted 가 Suppression 무효화 금지**(GRANTED 여도 Global/Complaint/Bounce/Legal/Freq/Quiet 차단).

---

## 4. Scope (§13-14) & Global/Brand/Channel/Identifier/Destination (§15-19)

**Scope(§13)**: tenant/ws/brand/store · purpose/channel/identifier · destination_account_id · source_account_id · campaign/journey/automation_id · jurisdiction · environment. **유형(§14)**: GLOBAL/TENANT/WORKSPACE/BRAND/STORE/PURPOSE/CHANNEL/IDENTIFIER/DESTINATION_ACCOUNT/CAMPAIGN/JOURNEY/AUTOMATION/TEMPORAL/JURISDICTION.
- **Global(§15)**: 모든 비필수 접촉 차단(Transactional 예외 명시)·전 Consumer 전파. "Email Unsubscribe ≠ Global".
- **Brand(§16)**: Brand별/Brand-Channel·Parent-Child·Multi-brand·Franchise/Partner Scope·Brand 이동/통합 영향. Brand 간 자동적용/무시 금지.
- **Channel(§17)**: EMAIL/SMS/PUSH/PHONE/DIRECT_MAIL/CRM/PERSONALIZED_ADS/RETARGETING/ONSITE/APP/THIRD_PARTY_EXPORT — Channel별 Scope/Purpose 분리.
- **Identifier-level(§18)**: 특정 Email Hard Bounce·Phone 재사용·Push Token 만료·Device Complaint·Hashed Identifier Provider Block. **Person 전체 차단으로 자동확대 금지**(단 Complaint/Legal 은 Person-level 승격 가능). ★SEG-C4 phone DNC 여기 포함.
- **Destination-specific(§19)**: 특정 광고계정/CRM/Email/SMS Provider/Push App/Platform Audience 차단. Destination ID+External Account ID 고정(286차 Wrong Account 방지).

---

## 5. Policy (§20-21) & Source (§22) & Evidence (§23-24)

**Policy(§20)**: suppression_policy_id · policy_name/type · suppression_types · scope/priority/release/expiry rules · evidence_requirements · propagation_rules · execution_recheck · provider_sync_rules · failure_policy · owner · approvers · version · status · effective_from/to. **Versioning(§21)**: Priority/Scope/Release/Expiry/Provider Sync/Execution Recheck/Transactional 예외/Identifier 승격/Global 범위/Failure/Override 변경=새 Version. Published 직접수정 금지.
**Source Registry(§22)**: Preference Center · Email/SMS Provider Webhook · Push Feedback · CRM · Customer Support · Legal · Fraud · Security · Deletion Workflow · Manual Admin · External Platform · Import · Campaign Frequency Engine · Journey Engine — 각 Authority/Trust/Scope/Evidence Capability.
**Evidence(§23)**: evidence_id · suppression_record_id · evidence_type · source · source/provider_event_id · provider_message_id · identifier_reference · reason_code · payload_hash · captured/received_at · verification/integrity_status · retention_policy · audit_reference. **원본 Provider Payload=보안/PII 별도 보호**. **Type(§24)**: USER_UNSUBSCRIBE/OPT_OUT_KEYWORD · SPAM_COMPLAINT · HARD/SOFT_BOUNCE_EVENT · PROVIDER_REJECTION · LEGAL_REQUEST · FRAUD/SAFETY_DECISION · CUSTOMER_SUPPORT_REQUEST · PREFERENCE_CENTER_CHANGE · DELETION_REQUEST · MANUAL_ADMIN_ACTION · FREQUENCY_CAP_EVENT · QUIET_HOURS_POLICY · CAMPAIGN/JOURNEY_EXCLUSION.

---

## 6. Complaint/Bounce/Unsubscribe/Opt-out (§25-31) — ★§3.7 혼용 금지

- **Complaint(§25)**: Provider Event 인증 → Tenant/Destination Account 확인 → Message/Recipient/Identifier/Profile Mapping → Complaint Suppression 생성 → 관련 Marketing Channel 차단 → Audience 제거 Trigger → Queue 대기 Action 차단 → Provider 상태 저장 → Cache 무효화 → Audit → Reconciliation 예약. **Soft Bounce처럼 처리 금지**. (현행 bounceWebhook 이 complaint→영구 suppression, Audience 제거/Reconciliation 은 부재 SEG-H2/H5.)
- **Hard Bounce(§26)**: Provider 인증 · Bounce Type 검증 · Identifier 확인 · Message Correlation · Identifier Invalid/Suppressed · Email Marketing 차단 · Transactional 정책 검토 · 대체 Identifier · Audience Removal · Cache 무효화 · Retry 차단 · Audit.
- **Soft Bounce(§27)**: bounce count/기간/provider code/temporary/retry limit/cooldown/**hard 승격 조건**/manual review/alternate channel. **단일 Soft Bounce 로 영구 Suppression 금지**.
- **Email Unsubscribe(§28)**: Subject/Email/Brand/Purpose/Channel/Campaign/Message/Method/Occurred/Effective/Source/Evidence/Scope/Audit. One-click/Preference Center/Reply-based 구분. (현행 List-Unsubscribe·public unsubscribe HMAC 존재.)
- **SMS Opt-out(§29)**: STOP Keyword · Provider Native · Preference Center · Support · Jurisdiction Keyword · Brand/Number/Short-code Scope · Effective Time · Confirmation · Audit. **★SEG-C4 인바운드 STOP 처리=여기(현행 부재).**
- **Push Opt-out(§30)**: OS Permission Denied/App Preference Off/Token Invalid/Logout/Device Removed/Marketing Off/Transactional 유지/App-Env Scope.
- **Advertising(§31)**: Personalized/Retargeting Opt-out · Lookalike 제한 · Platform Audience Removal · Hashed Identifier Suppression · Destination Scope · Region · Provider 정책 · Removal Lag · Reconciliation. (현행 AdAdapters Removal 부재 SEG-H2.)

---

## 7. Blocks (§32-33) & Temporary (§34)
- **Legal/Privacy Block(§32)**: 근거 Reference · Subject/Scope/Jurisdiction/Effective · **Release Authority** · Expiry 여부 · Allowed/Prohibited Processing · Audit · Access 제한. **일반 Marketing 관리자 해제권 없음(§3.8)**.
- **Fraud/Safety Block(§33)**: Fraud Marketing Exclusion / Account Security / Payment Risk / Abuse Safety / Manual Investigation 분리. Fraud 의심을 전 개인정보권리 차단/법적 Consent 로 오해 금지.
- **Temporary(§34)**: start/end · reason · affected channels/purposes · release trigger · owner · auto-expiry · re-evaluation · audit.

---

## 8. Frequency Cap (§35-37) & Quiet Hours (§38-39) & Recent Contact (§40)

- **Frequency Counter(§35)**: frequency_counter_id · customer_profile_id · person_id · tenant/brand · purpose/channel · campaign/journey_id · period_start/end · contact_count · allowed_count · **pending_count** · last_contact_at · version · status. **Policy(§36)**: 시간/일/주/월·Campaign/Journey/Brand/Channel/전체Marketing/Destination별. Pending Queue Action 도 Count 반영.
- **동시성(§37)**: 여러 Worker 동시발송 · Email/SMS Combined Cap · Queue Retry 이중 Count · 실패 Action 영구 Count · Pending Reservation 누락 · Rollback 후 불일치 방지 → **Reservation·Commit·Release 모델**(§Part2 §74). 현행 isFrequencyCapped 는 카운트-only(예약 없음) → 확장.
- **Quiet Hours(§38-39)**: Customer/Brand Timezone · Jurisdiction · Channel · Start/End · Day of Week · Holiday · Emergency/Transactional 예외 · Reschedule · Expiry · Audit. TZ 우선순위: 검증 Customer TZ > Region > Shipping/Billing > Brand Default > Tenant > UTC. **TZ Unknown=보수적 차단**. (현행 isQuietNow 존재·TZ 정교화 SEG-M2 정합.)
- **Recent Contact(§40)**: 최근 Email/SMS/Push/CRM/광고노출/Support/Campaign 접촉 — Purpose/Channel별 최소 간격.

---

## 9. 완료 조건 대응 (본 문서)
§119의 1-12(Entity/Subject/Record·Version·Type/Scope/Priority·Global/Brand/Channel/Identifier/Destination·Complaint/Bounce·Opt-out·Legal/Fraud/Safety·Temporary·Frequency·Quiet Hours·Recent Contact). Preference/Revocation/Removal=[`CANONICAL_PREFERENCE_REVOCATION.md`](CANONICAL_PREFERENCE_REVOCATION.md). Projection/Reconcile/Governance=[`CANONICAL_SUPPRESSION_GOVERNANCE.md`](CANONICAL_SUPPRESSION_GOVERNANCE.md). **코드변경 0** — email_suppression 확장·phone DNC·Provider Removal 실 구현은 후속 승인 세션(선행 P0 SEG-C4·SEG-H2).
