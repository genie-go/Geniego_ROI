# Canonical DSAR Subscription Discovery Lifecycle — Trial/Conversion, Renewal/Schedule, Change/Upgrade/Downgrade/Scheduled/Quantity/Seat, Pause/Resume, Cancellation/Expiration, Reactivation/Resubscription, Status History, Relationship Graph & Candidate

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `paddle_subscriptions`(status·current_period_end·cancelled_at)·`paddle_events`(webhook)·`app_user`(trial·TRIAL_DAYS·plan_change·expires_at)·`UserAuth`(plan.upgrade·plan.refund·recordSubscriptionStart)·plan_pricing · Part 3-3-3-3-3-3-3-1 Subscription Account·Part 3-3-3-3-2 Verification Token·EPIC05 Merge.
> **★정직**: Pause/Resume·Scheduled Change·Quantity Change 이력=대부분 NOT_APPLICABLE/GAP(paddle 현재상태·pause 컬럼 부재·app_user current-state). Plan/Price Version History=GAP. Reactivation/Resubscription=paddle_subscription_id 기준 구분.
> 형제: [`CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_SUBSCRIPTION_FOUNDATION.md`](../architecture/ADR_DSAR_SUBSCRIPTION_FOUNDATION.md)

---

## 1. Trial (§23-25) & Conversion (§26-27)

**Trial(§23·=app_user trial/TRIAL_DAYS/TrialPlan)**: trial_id · subscription_id · subscription_customer_id · plan_id · price_id · trial_type · started/expected_end/actual_end_at · status · payment_method_required 여부 · payment_customer_reference · conversion_status · cancellation_status · extension_count · promotion_reference · consent_reference · source(trial_source) · evidence. **Type(§24)**: STANDARD/EXTENDED/PROMOTIONAL/SALES_ASSISTED/ENTERPRISE_PILOT/PAYMENT_METHOD_REQUIRED/PAYMENT_METHOD_NOT_REQUIRED_TRIAL·COMPLIMENTARY_PERIOD·OTHER. **상태(§25)**: SCHEDULED/ACTIVE/EXTENDED/CONVERTED/EXPIRED/CANCELLED/PAYMENT_FAILED/REVOKED/ABANDONED/UNKNOWN. **★Trial ≠ Free Plan/Grace Period/Complimentary(§5.5)**.
**Conversion(§26·=trial→paid via Paddle)**: trial_conversion_id · trial_id · subscription_id · from/to_plan · from/to_price · conversion_time · conversion_type · payment_status · invoice_reference · promotion_reference · actor · evidence. **Type(§27)**: AUTOMATIC/MANUAL_PAID_CONVERSION·FREE_PLAN_CONVERSION·ENTERPRISE_CONTRACT_CONVERSION·FAILED_CONVERSION·CANCELLED_BEFORE_CONVERSION·EXPIRED_WITHOUT_CONVERSION.

---

## 2. Renewal (§28-30)

**Renewal(§28·=Paddle billing_cycle/current_period_end·paddle_events)**: renewal_id · subscription_id · previous/new_period_start · previous/new_period_end · renewal_scheduled/attempted/completed_at · plan_id · price_id · quantity · currency · amount_reference · invoice_reference · payment_reference · status · failure_reason · retry_reference · evidence. **상태(§29)**: SCHEDULED/PENDING/PROCESSING/SUCCEEDED/PARTIALLY_SUCCEEDED/PAYMENT_FAILED/RETRYING/CANCELLED/SKIPPED/ENDED/UNKNOWN. **Schedule(§30)**: renewal_schedule_id · subscription_id · next_renewal_date(current_period_end) · billing_timezone · billing_anchor · interval · auto_renewal_enabled · cancellation_deadline · notice_scheduled · grace_period · retry_policy_reference · scheduled_plan/quantity_change(N/A) · status · evidence.

---

## 3. Change (§31-37) — Upgrade/Downgrade real, Scheduled/Quantity 대부분 GAP

**Change Entity(§31·=UserAuth plan.upgrade/plan_change·단일 Canonical History)**: subscription_change_id · subscription_id · change_type · previous/new_plan · previous/new_price · previous/new_quantity · previous/new_seat_count · requested/effective/applied_at · actor · source · reason · immediate 여부 · proration_reference · invoice_reference · payment_impact_reference · status · rollback_reference · evidence. **Type(§32, 16종)**: UPGRADE·DOWNGRADE·PLAN_CHANGE·PRICE_CHANGE·QUANTITY_INCREASE/DECREASE·SEAT_ADD/REMOVE·BILLING_INTERVAL_CHANGE·CURRENCY_CHANGE·PRODUCT_CHANGE·ADD_ON_ADD/REMOVE·CONTRACT_MIGRATION·LEGACY_PLAN_MIGRATION·OTHER. **상태(§33)**: REQUESTED/SCHEDULED/PENDING_APPROVAL/PENDING_PAYMENT/APPLIED/PARTIALLY_APPLIED/FAILED/CANCELLED/ROLLED_BACK/EXPIRED/UNKNOWN. **★변경 결과만 저장 금지(§5.7)** — 변경 전후 Plan/Price/Quantity/적용시점/Proration/이유/Actor 보존.
**Upgrade(§34)/Downgrade(§35)**: 상위/하위 Plan 여부·즉시/다음주기 적용·Quantity/Seat 증감·Entitlement 차이·Proration·Credit/Refund·Promotion·Actor. **★Plan 이름만으로 Upgrade 판단 금지 — Plan Version/Entitlement 차이 확인**.
**Scheduled Change(§36)**: **★대부분 NOT_APPLICABLE**(현행 즉시 적용·paddle scheduled change 미내부화). scheduled_change_id·subscription_id·change_type·requested/target_state·requested/effective_at·created_by·status·superseded_by·cancelled/applied_at·failure_reason·evidence 신설 → **현재상태와 예약상태 혼동 금지**. **Quantity/Seat Change(§37·=parent_user_id/team_role)**: change_id·subscription_item·previous/new_quantity·previous/new_seat_count·assigned/unassigned_seat_count·effective_time·billing/entitlement_impact·actor·reason·evidence. **★Quantity 변경 이력=GAP(app_user current-state)·Seat User 개인정보=Relationship Graph 별도 Scope**.

---

## 4. Pause (§38-40) · Resume (§41) — 대부분 N/A

**★NOT_APPLICABLE(§실측)**: paddle_subscriptions 에 pause 컬럼 부재·내부 Pause/Resume 워크플로우 미구현(Paddle-side collection pause 만 존재 가능). 향후 활성화 계약.
**Pause(§38-40)**: pause_id·subscription_id·pause_type·requested/effective/expected_resume/actual_resume_at·billing/entitlement/data_access_behavior·reason·actor·status·evidence. Type=FULL/BILLING/SERVICE/COLLECTION_PAUSE·TEMPORARY/ADMIN_SUSPENSION·CUSTOMER_REQUESTED/PAYMENT_FAILURE_PAUSE. 상태=REQUESTED/SCHEDULED/ACTIVE/RESUME_SCHEDULED/RESUMED/CANCELLED/EXPIRED/FAILED/UNKNOWN. **Resume(§41)**: resume_id·subscription_id·pause_id·requested/scheduled/resumed_at·resumed_plan/price·billing_anchor_behavior·entitlement_restoration·payment_requirement·actor·status·evidence.

---

## 5. Cancellation (§42-45) · Expiration (§46-47) · Reactivation (§48) · Resubscription (§49)

**Cancellation(§42·=paddle cancelled_at·cancel_at_period_end·UserAuth plan.refund)**: cancellation_id · subscription_id · cancellation_type · requested/effective/cancelled_at · cancel_at_period_end 여부 · cancellation_reason · reason_category · requested_by · actor_type · retention_offer_reference · refund_reference · credit_reference · entitlement_end · data_access_end · status · revocation/undo_reference · evidence. **Type(§43)**: IMMEDIATE·END_OF_PERIOD·SCHEDULED·NON_PAYMENT·CUSTOMER_REQUESTED·ADMIN_INITIATED·FRAUD·POLICY_VIOLATION·CONTRACT_END·MIGRATION·DUPLICATE_SUBSCRIPTION·TRIAL_CANCEL·OTHER. **상태(§44)**: REQUESTED/SCHEDULED/PENDING/COMPLETED/REVOKED/FAILED/SUPERSEDED/EXPIRED/UNKNOWN. **Reason Governance(§45)**: Free-text Cancellation Reason=PII Classification·Sensitive Inference·Support Note 분리·Third-party Review·Export Review·Redaction·Retention·Evidence.
**Expiration(§46·=app_user expires_at)**: expiration_id · subscription_id · expiration_reason · expected/actual_expiration · last_active_period · unpaid_invoice/payment_failure_reference · grace_period · entitlement_end · archive_state · reactivation_eligibility · status · evidence. **Type(§47)**: NATURAL_TERM_END·TRIAL_EXPIRATION·PAYMENT_FAILURE·CONTRACT_EXPIRATION·NON_RENEWAL·PROVIDER_TERMINATION·DATA_MIGRATION·UNKNOWN. **★Cancelled ≠ Expired ≠ Revoked ≠ Failed ≠ Incomplete(§5.6)** — 상태/이유 별도.
**Reactivation(§48·동일 subscription_id 재활성)**: reactivation_id·subscription_id·previous_ended_state·requested/reactivated_at·plan·price·billing_anchor·payment_requirement·restored_entitlements·actor·status·evidence.
**Resubscription(§49·새 subscription_id)**: resubscription_id·previous_subscription_id·new_subscription_id·customer_id·gap_period·previous/new_plan·previous_cancellation_reason·resubscription_source·promotion_reference·created_at·identity_confidence·evidence. **★Reactivation ≠ Resubscription 혼동 금지**(동일 ID 재활성 vs 새 ID 생성).

---

## 6. Status History (§50) · Relationship Graph (§51-52) · Candidate (§53-55)

**Status History(§50·Append-only·=paddle_events/last_event_at)**: status_history_id · subscription_id · previous/new_status · **provider_raw_status(paddle status)** · changed/effective_at · source · actor · reason · related_event · webhook_reference(paddle_events) · invoice/payment_reference · evidence. **★모든 상태변화 Append-only 보존**. **Matrix(§84)**: | Subscription | Start | Trial End | Renewal | Upgrade·Downgrade | Pause·Resume | Cancellation | Expiration | Reactivation | Status |
**Relationship Graph(§51)**: Canonical Person→Subscription Customer · Commerce/Payment Customer→Subscription Customer · CRM/CDP→Subscription Customer · Subscription Customer→Subscription · Account(app_user)→Subscription · Subscription→Item/Plan · Item→Price · Subscription→Trial/Renewal/Change/Pause(N/A)/Cancellation · Subscription→Invoice/Payment/Entitlement/Seat Assignment(parent_user_id) Reference · Previous Subscription→New Subscription. **Schema(§52)**: relationship_id·source/target_entity_type·source/target_entity_id·relationship_type·provider/subscription_account·tenant/brand/store·valid_from/to·confidence·source·status·evidence.
**Candidate(§53)**: candidate_id·request/discovery_task_id·provider/provider_account/subscription_account_id·external_subscription_id·subscription_customer_id·account_id·tenant/brand/store_id·**subject_roles**·plan_id·price_id·status·current_period·trial/renewal/cancellation/pause_state·payment_customer_reference·invoice_references·identity_matches·match_confidence·duplicate_group·review_requirements·evidence_reference. **Match 상태(§54)**: EXACT_SUBSCRIPTION_ID/EXACT_SUBSCRIPTION_CUSTOMER_MATCH·STRONG_COMMERCE/PAYMENT_CUSTOMER_MATCH·VERIFIED_IDENTIFIER·ACCOUNT_RELATIONSHIP·**SEAT_USER_MATCH·BILLING_CONTACT_ONLY**·GIFT_RECIPIENT/SHARED_IDENTIFIER/MULTIPLE_CUSTOMER_MATCH·WRONG_ACCOUNT/TENANT/BRAND·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED. **Inclusion(§55)**: Verified Subject·Subject Role·Provider/Subscription Account·Tenant/Brand/Store·Subscription/Commerce/Payment Customer·Account Relationship·Validity Period·Shared Identifier Risk·Team/Org Context·Gift/Beneficiary·Deleted/Archived·Provider/Internal Consistency.
