# Canonical DSAR Subscription Discovery Schema — Entity, Discovery Profile, Customer/Alias, Subject Role, Subscription/Item & Plan/Price/Version

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): **구독=GeniegoROI 자체 SaaS 요금제**(구독사=Subscriber) — `paddle_subscriptions`(**Paddle MoR**·user_email·paddle_subscription_id·paddle_customer_id·price_id·product_id·plan_name·**status**·billing_cycle[monthly/annual]·current_period_end·currency·unit_price·cancelled_at·last_event_at)·`paddle_events`/`paddle_audit_log` · `app_user`(구독사·plan/plans·expires_at·billing_cycle·**parent_user_id·team_role**=Team/Seat 231차 RBAC·**trial**·TRIAL_DAYS·trial_source·TrialPlan) · `plan_pricing`(price_id·price_usd·price_annual·5티어 246차)·`AdminPlans` · `UserAuth`(plan.upgrade·plan.refund·plan_change·recordSubscriptionStart) · Part 3-3-3-3-3-3-3-1 Subscription Account/PCI·Part 3-3-3-3-3-3-3-2 Payment(billing_key)·Part 3-3-3-3-2 Verification Token·EPIC05 Identity.
> **★정직(§실측·핵심)**: **① 구독 Provider=Paddle 단일(MoR)**·외부 다중 구독 Provider 부재. **② 구독=SaaS 청구**(구독사가 GeniegoROI 구독)·구독사의 자기 고객 구독상품 관리 아님. **③ Pause/Resume·Scheduled Change·Plan/Price Version History·Quantity Change 이력=대부분 NOT_APPLICABLE/GAP**(paddle_subscriptions=현재상태·pause 컬럼 부재·app_user.plan=current-state·plan_change 부분). Seat=parent_user_id/team_role(실). 지어내기 금지.
> 형제: [`CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_LIFECYCLE.md`](CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_LIFECYCLE.md) · [`CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_SUBSCRIPTION_FOUNDATION.md`](../architecture/ADR_DSAR_SUBSCRIPTION_FOUNDATION.md)
> **성격**: 목표 계약. Billing/Recurring Invoice/Usage/Metering=Part 3-3-3-3-3-3-3-3-2. 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `paddle_subscriptions`(status·billing_cycle·current_period_end·cancelled_at·unit_price) | Subscription Entity·Status Registry·현재 period 형식화 |
| `paddle_customer_id`(Paddle) + app_user(email-keyed 구독사) | Subscription Customer·Identity Mapping(paddle↔app_user↔Payment·via user_email) |
| `app_user`(plan/plans·expires_at·parent_user_id·team_role) | Subscriber·Account Owner·**Seat/Team(parent_user_id)** Subject Role |
| `plan_pricing`(price_id·price_usd·price_annual·5티어)·Paddle product/price | Plan/Price Registry(ID 기준·이름 아님) |
| `app_user.trial`/TRIAL_DAYS/TrialPlan/trial_source | Trial Discovery(Free Plan 구분) |
| `UserAuth` plan.upgrade/plan_change/plan.refund | Change/Upgrade/Downgrade·Cancellation Discovery |
| `paddle_events`(webhook)·paddle_audit_log | Status History·Reconciliation·Webhook Correlation |
| **Pause/Resume·Scheduled Change·Plan/Price Version History·Quantity Change 이력** | **NOT_APPLICABLE/GAP**(paddle 현재상태·app_user current-state·지어내기 금지) |
| 외부 다중 구독 Provider | **NOT_APPLICABLE**(Paddle 단일 MoR) |
| Subscription↔Customer↔Payment Mapping·Subject Role·Candidate/Coverage/Gap 부재 | 신설 |

**무후퇴**: paddle_subscriptions/events/audit_log·app_user plan/trial/team·plan_pricing·UserAuth plan.upgrade/refund 는 **정본 — 재구현 금지, Canonical Subscription Foundation 아래 통합**. Provider별·Object별 독립 Candidate Store 신설 금지(§89).

---

## 1. Subscription Discovery Entity Model (§6)

Entity: `SUBSCRIPTION_DISCOVERY_PROFILE` · `SUBSCRIPTION_CUSTOMER` · `SUBSCRIPTION_CUSTOMER_ALIAS` · `SUBSCRIPTION_SUBJECT_ROLE` · `SUBSCRIPTION` · `SUBSCRIPTION_ITEM` · `SUBSCRIPTION_PLAN(_VERSION)` · `SUBSCRIPTION_PRICE(_VERSION)` · `SUBSCRIPTION_TRIAL(_CONVERSION)` · `SUBSCRIPTION_RENEWAL(_SCHEDULE)` · `SUBSCRIPTION_CHANGE` · `SUBSCRIPTION_SCHEDULED_CHANGE`(N/A) · `SUBSCRIPTION_QUANTITY_CHANGE`(GAP) · `SUBSCRIPTION_SEAT_CHANGE` · `SUBSCRIPTION_PAUSE`(N/A) · `SUBSCRIPTION_RESUME`(N/A) · `SUBSCRIPTION_CANCELLATION` · `SUBSCRIPTION_EXPIRATION` · `SUBSCRIPTION_REACTIVATION` · `SUBSCRIPTION_RESUBSCRIPTION` · `SUBSCRIPTION_STATUS_HISTORY` · `SUBSCRIPTION_RELATIONSHIP` · `SUBSCRIPTION_CANDIDATE` · `SUBSCRIPTION_DUPLICATE_GROUP` · `SUBSCRIPTION_RECONCILIATION` · `SUBSCRIPTION_COVERAGE_RESULT` · `SUBSCRIPTION_DISCOVERY_GAP` · `SUBSCRIPTION_DISCOVERY_EVIDENCE` · `SUBSCRIPTION_AUDIT_EVENT`.

---

## 2. Subscription Discovery Profile (§7)

**Schema**: subscription_discovery_profile_id · provider_id(=`paddle`) · provider_account_id · subscription_account_id · **tenant_id · brand_id · store_ids · merchant_account_ids · legal_entity_id** · environment · region · supported_currencies · customer/subscription/plan/price/trial/renewal/pause/cancellation/deletion/archive_model · history/webhook/search_API/bulk_export_capability · owner · version · status · certification_status · last_verified_at. **★Provider=Paddle 단일(MoR)**.

---

## 3. Subscription Customer (§8-10) & Alias

**Customer(§8·=paddle_customer_id↔app_user via user_email)**: subscription_customer_id · provider_id · provider_account_id · subscription_account_id · **provider_customer_id(paddle_customer_id)** · commerce_customer_id · payment_customer_id · CRM_contact/CDP_profile_reference · canonical_person_candidate · account_id(app_user) · tenant/brand/store/legal_entity_id · environment · email_references(user_email) · phone_references · status · created/updated/deleted_at · alias_ids · active/historical_subscription_count · identity_confidence · evidence_reference. **★Payment Customer ID ≠ Subscription Customer ID 자동간주 금지(§5.2)** — Provider/Merchant/Subscription Account/Store/Tenant/Brand/Environment/Validity 검증.
**상태(§9)**: ACTIVE/INACTIVE/PROSPECT/TRIAL_ONLY/SUSPENDED/CLOSED/ARCHIVED/SOFT_DELETED/HARD_DELETED/ANONYMIZED/MERGED/DUPLICATE/UNKNOWN.
**검색순서(§10)**: ①Exact Subscription Customer ID ②Provider Account-bound External ID(paddle_customer_id) ③Commerce Customer Mapping ④Payment Customer Mapping ⑤CRM/CDP Mapping ⑥Verified Email(user_email) ⑦Verified Phone ⑧Account Relationship(app_user) ⑨Subscription Relationship ⑩Alias/Merged ID(EPIC05) ⑪Deleted Customer ⑫Manual Review.

---

## 4. Subject Role (§11-12)

**Role(§11, 14종)**: SUBSCRIPTION_ACCOUNT_OWNER · SUBSCRIBER · BILLING_CONTACT · PAYMENT_METHOD_HOLDER · AUTHORIZED_PURCHASER · **TEAM_ADMIN**(=parent_user_id) · ORGANIZATION_ADMIN · **SEAT_USER**(=team_role 하위) · BENEFICIARY · GIFT_SUBSCRIPTION_RECIPIENT · CONTRACT_CONTACT · INVOICE_CONTACT · SUPPORT_CONTACT · UNKNOWN. (현행 app_user parent_user_id/team_role=Team Admin/Seat User 실체·231차 RBAC.)
**Scope(§12·핵심)**: **★Billing Contact/Seat User 라는 이유만으로 전체 Organization 데이터 포함 금지(§5.1)**. Account Owner=Account/구독계약/관리이력·Subscriber=본인 구독/권한·Billing Contact=Billing/Invoice 관계만·**Seat User=자신의 Seat Assignment/Entitlement/직접연결 구독만**(전체 Org Billing 미포함).

---

## 5. Subscription (§13-14) & Item (§15-16)

**Subscription(§13·=paddle_subscriptions)**: subscription_id · provider_id · provider_account_id · subscription_account_id · external_subscription_id(paddle_subscription_id) · subscription_customer_id · account_id(app_user) · tenant/brand/store/legal_entity_id · environment · subject_roles · product_reference(product_id) · plan_id · price_id · currency · billing_interval(billing_cycle) · quantity · **seat_count(team)** · status · lifecycle_status · start_at · trial_start/end_at · current_period_start · current_period_end · next_renewal_at · cancel_at · cancelled_at · ended_at · paused_at(N/A) · resumed_at(N/A) · created/updated/deleted_at · latest_invoice_reference · payment_customer_reference(paddle_customer_id) · payment_method_token_reference(billing_key) · scheduled_change_reference(N/A) · source_of_truth_status · evidence_reference. **Matrix(§83)**: | Subscription | Customer | Subject Role | Plan | Price | Trial | Renewal | Scheduled Change | Status | Evidence |
**상태 Registry(§14, 24종)**: DRAFT/INCOMPLETE/PENDING_ACTIVATION/TRIALING/ACTIVE/ACTIVE_WITH_WARNINGS/PAST_DUE/UNPAID/PAYMENT_FAILED/PAUSED(N/A)/PAUSE_SCHEDULED(N/A)/RESUME_SCHEDULED(N/A)/CANCEL_AT_PERIOD_END/CANCELLATION_SCHEDULED/CANCELLED/EXPIRED/ENDED/REVOKED/FAILED/ARCHIVED/SOFT_DELETED/HARD_DELETED/REACTIVATED/UNKNOWN. **★Provider Raw Status(paddle status) 보존 + Canonical 매핑**.
**Item(§15-16)**: subscription_item_id · subscription_id · external_item_id · product_reference · plan_id · price_id · quantity · seat_count · usage_type · billing_interval · currency · unit_amount_reference(unit_price) · status · start/end/created/updated/deleted_at · evidence. Type: BASE_PLAN·ADD_ON·SEAT·USAGE_COMPONENT·SUPPORT/STORAGE/FEATURE/REGION/SERVICE_PACKAGE·CUSTOM_CONTRACT_ITEM·OTHER. (현행 paddle_subscriptions=단일 plan·다품목 Item 은 GAP.)

---

## 6. Plan (§17-19) · Price (§20-21) · Version History (§22)

**Plan(§17·=plan_pricing/Paddle product)**: subscription_plan_id · provider_id · provider_account_id · external_plan_id(product_id) · product_id · plan_name · description_reference · plan_type · customer_segment · billing_model · default_interval · feature_set/entitlement_reference · region/currency_scope · active_from/to · legacy 여부 · status · version · owner · evidence. **Type(§18, 15종·현행 5티어)**: FREE·TRIAL·INDIVIDUAL·PRO·TEAM·BUSINESS·ENTERPRISE·USAGE_BASED·HYBRID·SEAT_BASED·CONTRACT·CUSTOM·ADD_ON·LEGACY·COMPLIMENTARY. **상태(§19)**: DRAFT/ACTIVE/ACTIVE_WITH_LIMITS/GRANDFATHERED/LEGACY/DEPRECATED/RETIRED/ARCHIVED/DELETED/UNKNOWN. **★Plan 이름만으로 Identity 결정 금지(§5.4)** — Plan ID/Price ID/Version 기준.
**Price(§20·=plan_pricing price_usd/price_annual/Paddle price_id)**: subscription_price_id · provider_id · provider_account_id · external_price_id(price_id) · plan_id · product_id · currency · amount_reference · tax_behavior · billing_interval · interval_count · billing_scheme · usage_type · tiers_reference · min/max_quantity · region · customer_segment · contract_reference · active_from/to · status · version · evidence. **Type(§21)**: FIXED·PER_SEAT·PER_UNIT·TIERED·VOLUME·GRADUATED·USAGE_BASED·METERED·PACKAGE·HYBRID·CUSTOM_CONTRACT·ZERO_PRICE·COMPLIMENTARY. **★Negotiated Contract 조건=접근권한/Legal Review**.
**Version History(§22)**: **★현행 GAP** — plan_pricing/app_user.plan=현재상태만·과거 가격이력 미보존. version_id·plan/price_id·previous/new_version·changed_fields·effective/ended_at·migration_policy·affected_subscriptions·grandfathering_behavior·actor·reason·evidence 신설 → **`PLAN_PRICE_VERSION_MISSING` Gap 명시**. **★현재 Plan 설정만 저장·과거 가격이력 상실 금지(§5.4·247차 seat가격 이력)**.
