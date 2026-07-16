# Canonical Suppression Governance — Projection, Evaluation, Release/Override, Reconciliation, Merge/Delete, Lint/Guard & Test

> **EPIC 06-A Part 3-3-2** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(AdAdapters Reconciliation 부재 SEG-H5·Dsar 삭제 시 email_suppression 보존·push 미도달 SEG-H3·286차 Wrong Account) · 형제: [`CANONICAL_SUPPRESSION_SCHEMA.md`](CANONICAL_SUPPRESSION_SCHEMA.md) · [`CANONICAL_PREFERENCE_REVOCATION.md`](CANONICAL_PREFERENCE_REVOCATION.md) · ADR=[`../architecture/ADR_CANONICAL_SUPPRESSION_AND_PREFERENCE_PLATFORM.md`](../architecture/ADR_CANONICAL_SUPPRESSION_AND_PREFERENCE_PLATFORM.md)
> **성격**: 거버넌스 계약. 실 구현·CI 가드는 후속 승인 세션.

---

## 1. Projection (§76-78) & Cache (§79-80)
**Projection(§76)**: global_contact_suppressed · email/sms/push/ads/retargeting_suppressed · crm_write_suppressed · legal_blocked · fraud_blocked · quiet_hours_active · frequency_cap_reached.
**Schema(§77)**: suppression_projection_id · subject/profile/person · tenant/ws/brand · purpose/channel · destination_account_id · projected_status · **selected_record_ids** · policy_version · computed_at · valid_until · stale_after · conflict_status · lineage_id · audit_reference.
**원칙(§78)**: 원본 Record 대체 금지 · Source Record Version 연결 · Priority 적용 · Scope 유지 · Expiry/Release 반영 · **Withdrawal/Complaint 즉시 갱신** · Merge/Unmerge 재계산 · Execution Recheck 필요 · Historical 재현.
**Cache(§79-80)**: Key=tenant/ws/brand · subject/profile/person/identifier · purpose/channel · destination_account_id · suppression_policy_version · record_version_set · identity_version · evaluation_stage · environment. **무효화(§80)**: Suppression 생성/Release/Expiry · Unsubscribe/Complaint/Bounce · Preference 변경 · Consent Withdrawal · Profile 삭제 · Merge/Unmerge · Identifier/Destination 변경 · Policy 변경 · Frequency Counter/Quiet Hours 변경 · Manual Override · Provider Feedback.

---

## 2. Evaluation (§81-82) & Explain (§83) & Release (§84) & Override (§85)
**Request(§81)**: evaluation_id · subject/profile/person/identifier · tenant/ws/brand · purpose/channel · destination_account_id · campaign/journey_id · evaluation_stage · evaluation_time · as_of_time · policy_version · actor · correlation_id · environment.
**Result(§82)**: result_id · suppressed · effective_status · selected_record_ids · **highest_priority_type** · scope_match · reasons · warnings · frequency_status · quiet_hours_status · recent_contact_status · provider_status · evaluated_at · valid_until · recheck_required_at · override_allowed · lineage_id · audit_reference.
**Explain(§83)**: 왜 차단 · 어느 Record 우선 · 어느 Scope · 시작/만료 · 어느 Source 생성 · Evidence · 영향 Audience/Campaign/Journey · 필요 Destination 제거 · Release 가능 · 재평가 시점.
**Release Workflow(§84)**: Subject 검증 → Record 조회 → Type별 Release 권한 → Evidence → Release Reason → Approval → 새 Version → Projection 재계산 → Cache 무효화 → Audience Re-evaluation → Destination 재추가 정책 → Audit. **해제=자동 재마케팅 금지**.
**Override(§85)**: override_id · 대상 Subject/Type/Scope · 원래/Override 상태/범위 · 사유 · Evidence · 유효기간 · 승인자 · 재검토 시점 · Audit. **일반 Override 금지(§3.8)**: Legal Block · Explicit Global DNC · Spam Complaint · Active Deletion Block · Cross-Tenant · Critical Safety · Privacy Withdrawal.

---

## 3. Reconciliation (§86-88) — ★SEG-H5 (현행 부재)
**비교(§86)**: Internal Suppression vs Email/SMS/CRM/Push Provider·Ads Audience · Preference Center vs Consent/Suppression Record · Audience Snapshot vs Current Suppression · Queue vs Current Suppression · Frequency Counter vs Contact History · Destination Removal vs Provider State.
**상태(§87)**: MATCH/INTERNAL_MISSING/PROVIDER_MISSING/PROVIDER_EXTRA/STALE_INTERNAL/STALE_PROVIDER/REMOVAL_PENDING/REMOVAL_FAILED/**READD_RISK**/WRONG_ACCOUNT_RISK/MANUAL_REVIEW/BLOCKED.
**Re-add 방지(§88)**: Removal 후 Scheduled Full Refresh/Retry Job/Old Snapshot/Queue Replay/Legacy Sync/CRM Reimport/Connector Backfill/Audience Clone/Backup Restore 로 재추가 금지 → **Suppression Tombstone 또는 Live Eligibility Check**. (현행 AdAdapters refresh 마다 신규생성 SEG-L4 관련.)

---

## 4. Merge/Unmerge/Delete/Correction (§89-92) — ★§3.9
- **Merge(§89)**: 모든 Suppression Record 보존 · Identifier-level 보존 · Person-level Scope 재평가 · Global 유지 · Complaint/Bounce 유지 · Preference Version 보존 · Projection 재계산 · Audience 무효화 · Destination Removal 검토 · Cache 무효화 · Audit. **더 활성 Profile 이 차단상태 덮어쓰기 금지**(EPIC05 정합).
- **Unmerge(§90)**: 원본 Suppression 귀속 복원 · Identifier-level 복원 · 잘못 확장된 Person-level 정정 · Preference 복원 · Projection 재계산 · Audience Rebuild · Destination Removal/Re-add 영향 검토 · Audit.
- **Deletion(§91)**: 즉시 **Deletion Block** 생성 · 신규 Audience 포함 차단 · Active Queue 차단 · Destination Removal · CRM/Provider 삭제/Suppression · Cache 무효화 · **Re-ingestion Tombstone** · Completion Verification · Audit. (현행 Dsar 는 email_suppression 보존·push/line/instagram/onsite/popup 미도달 SEG-H3 → Deletion Block+Removal 로 보완.)
- **Correction(§92)**: 이전 Identifier Suppression 보존 · 신규 Identifier 상태 검증 · **Complaint/Bounce 상속 금지 여부 검토** · Person-level 적용 · Destination 영향 · Audience 재평가 · Audit.

---

## 5. API (§93-94) & Permission (§95)
**API(§93)**: Suppression 생성/조회/Current 평가/History/Evidence · Release/Override 요청 · Preference 조회/변경 · Frequency/Quiet Hours 조회 · Removal 요청 · Propagation/Reconciliation 조회 · Explain/Audit.
**보안(§94)**: Actor 인증 · Tenant/ws/brand Scope · Subject 권한 · Evidence 접근 제한 · Override/Release/Destination 권한 · PII Masking · Rate Limit · Enumeration 방지 · Idempotency · Audit · Environment. (신규 API `/api` 접두.)
**Permission(§95)**: VIEW_SUPPRESSION(/HISTORY/EVIDENCE) · CREATE/RELEASE/OVERRIDE_SUPPRESSION · MANAGE_GLOBAL_SUPPRESSION · MANAGE_LEGAL/FRAUD_BLOCK · MANAGE_PREFERENCE · VIEW_FREQUENCY_COUNTER · MANAGE_QUIET_HOURS · REQUEST_DESTINATION_REMOVAL · RETRY_PROPAGATION · VIEW_RECONCILIATION · VIEW_AUDIT.

---

## 6. Static Lint (§96) & Runtime Guard (§97) & Error/Warning (§98-99)
**Static Lint(§96, CI 신규 G-가드 후보)**: Suppression Boolean 직접사용 · **Consent Granted 만으로 실행** · Suppression Engine 우회 · 채널별 자체 Suppression 구현 · Global 미검증 · Complaint/Hard Bounce 무시 · **Preference 변경 미전파** · Destination Removal 누락 · Execution Recheck 누락 · Queue Payload Version 누락 · Frequency Cap/Quiet Hours 우회 · Provider Account Scope 누락 · Direct Suppression Store Write · **Direct Provider Re-add** · Version 없는 Policy · Audit 없는 Release/Override · Test/Demo Production · Raw PII 로그.
- **★현행 직접 대상**: 발송 게이트 미호출(SEG-C1~C4)가 "Consent Granted 만으로 실행"·"Execution Recheck 누락"에 해당 → 선행 P0(SEG-C1~C3 이미 수정)·SEG-C4 잔여.
**Runtime Guard(§97)**: Global Suppressed/Legal Block/Complaint/Hard Bounce/SMS Opt-out/Push Opt-out/Ads Opt-out 대상 실행 · Frequency Cap 초과 · Quiet Hours/Recent Contact 위반 · Deleted Profile · Cross-Tenant Suppression · **Wrong Destination Account** · Stale Projection · Preference 미반영 · Invalid Queue Version · **Removal Pending 재추가** · Test/Demo Production · Override 권한 부족 · Kill Switch → 차단.
**Error(§98)** / **Warning(§99)**: GLOBAL_SUPPRESSION_ACTIVE · LEGAL/PRIVACY_BLOCK_ACTIVE · SPAM_COMPLAINT_ACTIVE · HARD_BOUNCE_ACTIVE · CHANNEL/BRAND_UNSUBSCRIBE_ACTIVE · FREQUENCY_CAP_EXCEEDED · QUIET_HOURS_ACTIVE · RECENT_CONTACT_SUPPRESSION_ACTIVE · DESTINATION_BLOCK_ACTIVE · RELEASE/OVERRIDE_NOT_ALLOWED · REVOCATION_PROPAGATION_FAILED · DESTINATION_REMOVAL_FAILED · EXECUTION_SUPPRESSION_RECHECK_FAILED · PROVIDER_ACCOUNT_SCOPE_VIOLATION / (Warn) READD_RISK_DETECTED · PROVIDER_REMOVAL_UNVERIFIABLE · SUPPRESSION_PROJECTION_STALE_WARNING · LEGACY_SUPPRESSION_USED 등.

---

## 7. Golden Dataset (§100) · Conformance (§101) · Equivalence (§102-103)
**Golden Suppression Dataset(§100, 운영 Customer 미사용)**: 45+ 시나리오 — Global DNC · Brand/Email Unsubscribe · SMS STOP · Push/Ads Opt-out · Spam Complaint · Hard Bounce · 반복 Soft Bounce · Invalid Email · Expired Push Token · Legal/Fraud/Safety Block · Temporary · Frequency Cap · **Combined Channel Cap** · Quiet Hours · Unknown Timezone · Recent Contact · Campaign/Journey Exclusion · Holdout · Preference Email/All-Marketing Off · **Preference 변경 후 Queue 차단** · **Withdrawal 후 Snapshot 무효화** · **Withdrawal 후 Destination Removal** · Provider Removal 실패 · Removal Retry · Reconciliation Drift · **Removed Member Re-add 차단** · Merge 후 보존 · Unmerge 후 복원 · Identifier Correction · Profile Delete · Test 차단 · **Cross-Tenant/Wrong Destination Account 차단** · **Execution-time Live Block** · Override 허용/금지 · Historical As-of.
**Conformance(§101)**: Audience Builder/Eligibility/CRM/Email/SMS/Push/Advertising/Retargeting/Journey/Campaign/Automation/Personalization/Export 에 **동일 Suppression 의미**(Subject/Type/Scope/Priority/Effective/Expiry/Removal/Execution Recheck/Reason/Audit).
**Equivalence(§102-103)**: 기존(email_suppression+isMarketingSendAllowed+bounceWebhook) vs Canonical — Current Suppression/Global/Channel/Brand/Identifier/Complaint/Bounce/Frequency/Quiet Hours/Audience Eligible/Queue 차단/Provider Removal/Reconciliation/Explain. 상태: MATCH/EXPECTED_{SCOPE,PRIORITY,COMPLAINT,BOUNCE,PREFERENCE,REMOVAL,FREQUENCY}_CORRECTION/**LEGACY_PRIVACY_DEFECT**/**LEGACY_WRONG_TARGET_RISK**/CANONICAL_SUPPRESSION_DEFECT/PROVIDER_LIMITATION/UNSUPPORTED_LEGACY_STATE/MANUAL_REVIEW/**UNEXPLAINED**/BLOCKED. **UNEXPLAINED·LEGACY_WRONG_TARGET_RISK → 운영 전환 차단.**

---

## 8. Observability (§104) · Alert (§105) · Audit (§106) · 분류 (§107) · 중복 (§108) · 후퇴 (§109)
- **Observability(§104)**: Active/Global Suppression · Unsubscribe/Complaint/Hard-Soft Bounce · Preference Change · Frequency/Quiet Hours/Execution Block · Queue Cancel · Propagation Job/Failure · Destination Removal/Failure/**Lag** · Reconciliation Drift · **Re-add Block** · Override · Cache Invalidation · Cross-Tenant/Wrong-account Block · Legacy Usage · P50/95/99.
- **Alert(§105)**: Complaint 전파실패 · Global 미반영 · Withdrawal Queue 차단실패 · **Hard Bounce 재발송** · Removal SLA 초과 · Provider Removal 실패 · **Removed Member 재추가** · Frequency/Quiet Hours 우회 · Cross-Tenant · Wrong Account · Preference 저장실패 급증 · Projection Stale · Reconciliation Drift 급증 · Execution Recheck 실패 · Legacy 신규사용.
- **Audit(§106)**: SUPPRESSION_CREATED/ACTIVATED/EXPIRED/RELEASE_REQUESTED/RELEASED/OVERRIDE_* · COMPLAINT/HARD_BOUNCE/SOFT_BOUNCE/UNSUBSCRIBE/SMS_OPT_OUT/PUSH_OPT_OUT_RECEIVED · PREFERENCE_CHANGED/VERSION_CREATED · REVOCATION_PROPAGATION_STARTED/COMPLETED/FAILED · AUDIENCE_SNAPSHOT_INVALIDATED · DESTINATION_REMOVAL_REQUESTED/COMPLETED/FAILED · EXECUTION_BLOCKED_BY_SUPPRESSION · FREQUENCY_CAP_RESERVED/COMMITTED/RELEASED · QUIET_HOURS_RESCHEDULED · RECONCILIATION_STARTED/COMPLETED · CACHE_INVALIDATED. → AuditRegistry/ModelMonitor 확장.
- **분류(§107)**: `email_suppression`=**VALIDATED_LEGACY→CANONICAL_SUPPRESSION_STORE 승격**(email) · bounceWebhook=Complaint/Bounce 처리(Suppression Source) · `isFrequencyCapped`=**CANONICAL_FREQUENCY_ENGINE** · `isQuietNow`=Quiet Hours · PreferenceCenter=**CANONICAL_PREFERENCE_CENTER** · isMarketingSendAllowed=Execution Recheck · AdAdapters Removal/Reconciliation·phone DNC=**부재(신규·SEG-H2/C4)**.
- **중복(§108)**: 현행 **Suppression 단일 경로**(email_suppression·isMarketingSendAllowed) — 채널별 자체 Suppression 다중 없음(양호). 통합=단일 Core+Provider Adapter(§3.10·§120 채널별 독립 Engine 금지).
- **후퇴 방지(§109)**: Global/Brand/Channel Unsubscribe·Complaint·Hard/Soft Bounce·SMS/Push/Ads Opt-out·Frequency Cap·Quiet Hours·Recent Contact·Preference Center/History·Audience Invalidation·Queue Cancellation·Destination Removal·Retry·Reconciliation·Re-add Prevention·Merge/Unmerge·Delete·Explain·Override·Audit·**기존 API Compatibility** 비교. 승인 안 된 감소 시 전환 차단. email_suppression·isFrequencyCapped(4/7d)·isQuietNow·bounceWebhook(hard/complaint 자동 suppression)·List-Unsubscribe 보존 필수.

---

## 9. 완료 조건 대응 (본 문서)
§119의 27-38(Projection/Cache·Evaluation/Explain·Release/Override·Reconciliation·Re-add Prevention·Merge/Unmerge/Delete/Correction·API/Permission·Lint/Guard·Golden/Conformance/Equivalence·분류/중복/후퇴·ADR/PM). **코드변경 0** — Projection/Reconciliation/Removal/CI가드 실 구현은 Golden+Conformance+Equivalence+verify+배포승인 후.

**다음**: EPIC 06-A Part 3-3-3 — Purpose Limitation, Privacy Governance, Retention, Cross-border, Deletion & DSAR. **선행 P0/P1(구현세션)**: SEG-C4(phone DNC/SMS STOP=SMS_OPT_OUT Type+Identifier Suppression)·SEG-H2(Audience Removal=Destination Removal)·SEG-H3(DSAR push/line/instagram 미도달=Deletion Block+Removal)·SEG-H5(Reconciliation).
