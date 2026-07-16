# Canonical Preference Center, Revocation Propagation, Destination Removal & Execution-time Validation

> **EPIC 06-A Part 3-3-2** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(PreferenceCenter=crm_channel_prefs/crm_customer_prefs·AdAdapters Removal 부재 SEG-H2·발송루프 execution 게이트=선행 P0) · 형제: [`CANONICAL_SUPPRESSION_SCHEMA.md`](CANONICAL_SUPPRESSION_SCHEMA.md) · [`CANONICAL_SUPPRESSION_GOVERNANCE.md`](CANONICAL_SUPPRESSION_GOVERNANCE.md)
> **성격**: 목표 계약. 실 Provider Removal/Propagation 구현은 후속 승인 세션.

---

## 1. Preference Center (§41-50)

- **Entity(§41)**: `PREFERENCE_PROFILE` · `PREFERENCE_CATEGORY` · `PREFERENCE_OPTION` · `PREFERENCE_RECORD` · `PREFERENCE_VERSION` · `PREFERENCE_CHANGE_EVENT` · `PREFERENCE_POLICY` · `PREFERENCE_UI_CONFIGURATION` · `PREFERENCE_AUTH_SESSION` · `PREFERENCE_CONFIRMATION`. **현행 PreferenceCenter(crm_channel_prefs·crm_customer_prefs quiet)=CANONICAL_PREFERENCE_CENTER 확장 승격.**
- **Profile(§42)**: preference_profile_id · consent_subject_id · customer_profile_id · person_id · tenant/ws/brand · locale · timezone · current_version · status · created/updated/last_confirmed_at · lineage_id.
- **Category(§43)**: Email/SMS/Push Marketing · Product Updates · Promotions · Surveys · Personalized Ads · Retargeting · Recommendations · Third-party Sharing · Frequency Preference · Quiet Hours · Preferred Channel — **Purpose Registry(Part 3-3-1) 연결**.
- **Record(§44)**: preference_record_id · preference_profile_id · category/option/purpose/channel/brand · value · status · source · policy_version · effective_from/to · changed_by/at · evidence_id · audit_reference.
- **★Preference ≠ Consent(§45)**: 법적 Consent ≠ Communication/Frequency/Channel/Content/Product/Quiet Hours/Personalization Preference. **Preference 가 법적 Consent 자동생성/Withdrawal 무효화 금지**.
- **인증(§46)**: 로그인/Signed Token/One-time Link/Email/SMS Verification/Support Assisted/Anonymous Cookie — Token Expiry · Subject/Brand Binding · Replay/CSRF 방지 · Rate Limit · Audit · PII 최소노출.
- **UI(§47)**: 현재 Preference · Purpose별 설명 · Channel/Brand별 선택 · 전체/개별 해제 · Frequency · Quiet Hours · 변경 효력시점 · 저장결과 · 재시도 · 오류 · History/확인 · Privacy Notice Version · Locale.
- **UI 금지(§48)**: 해제 옵션 숨김 · 여러 Consent 모호 Toggle 묶음 · 사전선택 Checkbox 무조건 · **저장실패를 성공으로 표시**(가짜녹색 금지) · Brand Scope 숨김 · Marketing/Transactional 혼용 · **철회 후 재동의 Dark Pattern** · 실행반영 지연 미표시 · Evidence 없는 상태변경.
- **변경 Pipeline(§49)**: Subject 인증 → Scope → Current 조회 → Requested Change 검증 → Consent/Suppression 영향 계산 → Preference Version 생성 → Consent Withdrawal/Grant Event 생성 → Suppression 생성/해제 → Projection 갱신 → Audience 영향 계산 → **Propagation Job 생성** → Cache 무효화 → 결과 반환 → Audit.
- **Versioning(§50)**: previous version · change set · actor · source · effective time · policy version · evidence · propagation status · audit. **Matrix(§114)**: | Preference Profile | Category | Purpose | Channel | Brand | Value | Version | Effective | Consent Impact | Suppression Impact |

---

## 2. Revocation Propagation (§51-54) — ★§3.4 즉시 반영

- **Entity(§51)**: propagation_job_id · trigger_event_id · subject/profile/person · tenant/brand · purpose/channel · previous/current_status · source_record_id · affected_systems/audiences/destinations · status · priority · created/started/completed/failed_at · retry_count · audit_reference.
- **대상(§52)**: Consent/Suppression Projection · Audience Eligibility/Snapshot · Active Audience Build · CRM Contact Preference · Email/SMS Provider List · Push Provider · **Meta/Google/TikTok Audience** · Journey State · Campaign/Automation Queue · Recommendation/Personalization Cache · Search Index · Customer 360 · Export/Data Share Job.
- **우선순위(§53)**: Explicit Withdrawal · Global DNC · Spam Complaint · Legal Block · Profile Deletion · Data Sharing Withdrawal · Personalized Ads Withdrawal · **SMS STOP** · Hard Bounce = **일반 Refresh Job 보다 우선**.
- **상태(§54)**: REQUESTED/PRIORITIZED/PROCESSING/PARTIAL/COMPLETED/FAILED/RETRYING/MANUAL_REVIEW/COMPENSATION_REQUIRED/BLOCKED.
- **★§3.4**: 고객 Preference 변경 후 Audience Snapshot·Campaign Queue·Journey State·Automation Queue·CRM List·Email/SMS/Push Provider·Ads/Retargeting Audience·Cache·Search Index·Eligibility Projection 에 **오래된 값 잔존 금지**. **현행=Revocation Propagation 부재**(unsubscribe→email_suppression 만·Audience 미제거 SEG-H2) → 신규.
- **Matrix(§115)**: | Trigger | Subject | Affected System | Action | Priority | Started | Completed | Result | Retry | Evidence |

---

## 3. Audience Snapshot Invalidation (§55-57)
- **무효화(§55)**: 영향 Snapshot 식별 · 영향 Member 표시 · Snapshot 상태 갱신 · 신규 실행 차단 · Destination Removal Trigger · 새 Snapshot 필요 · Active Campaign 영향 · Audit. **불변 Snapshot 자체 수정 대신 Overlay/새 Snapshot**(Part 3-1 불변성 정합).
- **Eligibility Overlay(§56)**: snapshot_id · member_id · live_eligibility_status · consent_status · suppression_status · invalidated_at · reason · policy_version · valid_until. 원본 Snapshot 이력 보존.
- **Active Build(§57)**: Event 수신 · Candidate/Member 재평가 · 대상 제외 · Build Checkpoint 갱신 · 최종 Snapshot 검증 · Race Condition Audit.

---

## 4. Destination Removal (§58-66) — ★SEG-H2 (현행 부재)

- **Request(§58)**: removal_request_id · subject · identifier reference · audience_snapshot_id · destination_channel · destination_account_id · external_audience_id · reason · source_event_id · priority · requested_at · required_by · idempotency_key · status · audit_reference.
- **상태(§59)**: REQUESTED/VALIDATING/QUEUED/SENT/ACCEPTED/PROCESSING/REMOVED/PARTIAL/FAILED/RETRYING/UNVERIFIABLE/RECONCILIATION_REQUIRED/CANCELLED. **★§3.6 Provider 200 OK ≠ Removed** — Requested/Accepted/Processing/Removed/Failed/Partial/Unverifiable/Reconciliation 구분.
- **Idempotency(§60)**: tenant + destination_account_id + external_audience_id + subject/identifier + suppression event + reason + environment. 중복요청 재추가/오류 방지.
- **Provider Adapter Contract(§61)**: Add/Remove/Replace/Suppression List 지원 · Incremental Update · Async Status · Webhook/Polling · Identifier Format/Hash Version · Rate Limit · Retry · Idempotency · Error Mapping · Reconciliation · Removal SLA.
- **채널 연계(§62-66)**: Email Provider(Global/List/Brand Unsubscribe·Complaint·Hard Bounce·Suppression List·Webhook Auth·Reconciliation) · SMS(STOP·Provider Opt-out·Invalid/Carrier Rejection·Country·Sender/Short-code Scope) · Push(Invalid/Expired Token·Permission Off·Logout·Feedback·Token Cleanup) · CRM(Do Not Email/Call/SMS·Contact Delete·Sync Loop 방지·Source Priority·Conflict) · 광고(Member/Audience Removal·Hashed Identifier·Personalized/Retargeting Withdrawal·Lookalike 제한·Account Scope·Provider Delay·Removal Verification·Reconciliation). **현행 AdAdapters=Add만·Remove 없음**(SEG-H2 구현 대상).
- **Matrix(§116)**: | Destination | Account | External Audience | Subject/Identifier | Reason | Requested | Accepted | Removed | Reconciled | Status |

---

## 5. Journey/Campaign/Automation 차단 (§67-69) & Execution-time Validation (§70-75)

- **Journey/Campaign(§67)**: 신규 Journey 진입 차단 · Active Journey 중단/안전분기 · Pending Step 취소 · Campaign/Retry Queue 취소 · 예약발송 취소 · 보상조치 · Audit.
- **Automation Queue(§68)**: Message=customer_profile_id · identity_version · purpose · channel · **consent_version · suppression_version** · audience_snapshot_id · action_id · idempotency_key · scheduled_at · environment. 실행 시 최신 Version 비교.
- **오래된 Queue(§69)**: Consent/Suppression/Identity Version 변경 · Profile 삭제 · Snapshot 무효화 · Destination Account 변경 · Kill Switch · Expiry · Duplicate Action · Policy Version 불일치 → 실행 차단.
- **★Execution-time Validation(§70)**: 실행 직전 Live/강한 일관성 — Tenant/ws/brand · Profile 상태 · Identity Version · Purpose/Channel · **Current Consent · Current Suppression** · Identifier · Destination Account · **Frequency Cap · Quiet Hours · Recent Contact** · Snapshot · Kill Switch · Idempotency · Wrong-target Risk. **현행 정본=isMarketingSendAllowed(발송루프)·선행 P0(SEG-C1~C3)로 무게이트 경로 강제** — 이 계약의 실 구현 기반.
- **결과(§71)**: EXECUTION_ALLOWED/ALLOWED_WITH_WARNING/DELAYED/RESCHEDULED/BLOCKED/CANCELLED/RECHECK_REQUIRED/ERROR.
- **Fail-closed(§72)**: Consent/Suppression/Deletion/Identity/Destination/Frequency/Quiet Hours/Kill Switch/Policy Version/Wrong-target 조회 실패 → 실 Marketing 차단.
- **예약 재평가(§73)**: 예약 생성·직전·Queue 소비 직전·Provider 전송 직전. 장기예약=주기 재검증. (현행 SMS 캠페인=워커 없음→STO defer 유실 방지 주석 정합.)
- **Frequency Reservation(§74)**: RESERVED/COMMITTED/RELEASED/EXPIRED/CANCELLED — Provider 실패 시 Release/Count 유지 정책.
- **Quiet Hours Reschedule(§75)**: Consent 유지·Suppression 없음·Campaign/Journey/Snapshot 유효·Frequency Cap·Destination 상태·Max Delay·Customer TZ·Audit 검증 후 재예약.

---

## 6. 완료 조건 대응 (본 문서)
§119의 13-26(Preference Center Entity/API/UI·Preference↔Consent·Versioning·Revocation Propagation·Withdrawal/Complaint/Deletion 우선전파·Snapshot Invalidation/Overlay·Active Build·Destination Removal Idempotent·Provider Remove/Retry/Reconcile·CRM/Email/SMS/Push/Ads 연계·Journey/Campaign/Automation Queue 차단·오래된 Queue Version 차단·Execution-time Live Validation·Fail-closed). **코드변경 0** — Preference/Propagation/Removal/Execution Recheck 실 구현은 Golden+Conformance+Equivalence+verify+배포승인 후.
