# Canonical DSAR Billing Discovery Schema — Entity, Discovery Profile, Billing Account/Alias/Profile/Contact Role, Cycle/Anchor/Service Period & Invoice Schedule

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): **① SaaS 구독 청구=Paddle(MoR)** — Paddle 이 Invoice 생성·Tax·Dunning·Collection·Proration·Write-off 소유·내부는 `paddle_subscriptions`(status·current_period_end·billing_cycle)+`paddle_events`/`paddle_audit_log`(webhook·transaction·tax reference)만. **② 광고비 관리형 월렛=`BillingMethod`(billing_key 카드토큰)+`ad_spend_ledger`(청구 원장)** — Toss billing_key 로 광고비 반복청구(내부 실 recurring billing). **③ 정산=`pg_settlement`/`orderhub_settlements`/`creator_settlements`**(구독사 e커머스 payout·별개). **④ `ai_usage_quota`**(AI 사용 quota·한도·과금 아님) · Part 3-3-3-3-3-3-3-3-1 Subscription Foundation·Part 3-3-3-3-3-3-3-2 Invoice/Payment(billing_key)·Part 3-3-3-3-2 Verification Token·EPIC05 Identity.
> **★정직(§실측·핵심)**: **① 내부 Billing Engine 부재**(SaaS=Paddle MoR·Invoice/Tax/Dunning/Billing Run/Proration/Write-off=Paddle-owned·Provider Retrieval·`PROVIDER_LIMITATION`). **② Usage Metering/Rating/Meter/Aggregation=NOT_APPLICABLE**(SaaS=flat seat/tier 요금제·metered 과금 아님·ai_usage_quota=한도). **③ 내부 실 recurring billing=광고비 wallet**(BillingMethod+ad_spend_ledger·billing_key). **④ Settlement=구독사 commerce payout(KEEP_SEPARATE)**. 지어내기 금지.
> 형제: [`CANONICAL_DSAR_BILLING_DISCOVERY_INVOICE_USAGE.md`](CANONICAL_DSAR_BILLING_DISCOVERY_INVOICE_USAGE.md) · [`CANONICAL_DSAR_BILLING_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_BILLING_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_BILLING_USAGE_METERING_DISCOVERY.md`](../architecture/ADR_DSAR_BILLING_USAGE_METERING_DISCOVERY.md)
> **성격**: 목표 계약. Coupon/Promotion/Discount=Part 3-3-3-3-3-3-3-3-3. 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `paddle_subscriptions`+`paddle_events`(status·period·transaction·tax reference·MoR) | Billing Account/Cycle/Invoice Reference(**Paddle Provider Retrieval**·내부는 reference만) |
| **`BillingMethod`(billing_key·card_last4/issuer)+`ad_spend_ledger`(청구 원장)** | **광고비 Billing Account·Collection Attempt·Recurring Charge(내부 실 billing)** |
| `pg_settlement`/`orderhub_settlements`/`creator_settlements` | `KEEP_SEPARATE`(구독사 commerce payout·SaaS 청구 아님) |
| `ai_usage_quota`(AI 한도) | Usage Meter(**과금 아님·quota만·NOT_APPLICABLE billed usage**) |
| **내부 Billing Engine·Invoice Store·Dunning·Billing Run·Proration·Write-off·Usage Metering/Rating** | **NOT_APPLICABLE**(Paddle MoR·flat 요금제·지어내기 금지·도입 시 등록) |
| Billing Account↔Subscription↔Payment Mapping·Contact Role·Candidate/Coverage/Gap 부재 | 신설 |

**무후퇴**: paddle_subscriptions/events·BillingMethod/ad_spend_ledger·pg_settlement·ai_usage_quota 는 **정본 — 재구현 금지, Canonical Billing Discovery Foundation 아래 통합**. Provider별 독립 Candidate Store 신설 금지(§98).

---

## 1. Canonical Billing Discovery Entity Model (§6)

Entity: `BILLING_DISCOVERY_PROFILE` · `BILLING_ACCOUNT(_ALIAS)` · `BILLING_PROFILE` · `BILLING_CONTACT_ROLE` · `BILLING_CYCLE` · `BILLING_ANCHOR` · `SERVICE_PERIOD` · `INVOICE_SCHEDULE`(Paddle) · `BILLING_RUN`(N/A) · `BILLING_BATCH`(N/A) · `BILLING_JOB`(N/A) · `BILLING_RUN_ITEM`(N/A) · `RECURRING_INVOICE`(Paddle/ad_spend) · `INVOICE`(Paddle) · `INVOICE_ITEM`(Paddle) · `INVOICE_STATUS_HISTORY` · `INVOICE_DELIVERY_HISTORY` · `USAGE_METER`(N/A) · `USAGE_METER_VERSION`(N/A) · `USAGE_EVENT`(N/A) · `USAGE_EVENT_CORRECTION`(N/A) · `USAGE_AGGREGATE`(N/A) · `USAGE_RATING_RESULT`(N/A) · `USAGE_RATING_TIER`(N/A) · `PRORATION_RESULT`(Paddle) · `BILLING_ADJUSTMENT` · `BILLING_CREDIT` · `BILLING_DEBIT`(ad_spend_ledger) · `TAX_RESULT`(Paddle) · `COLLECTION_ATTEMPT`(ad_spend/Paddle) · `DUNNING_CASE`(Paddle) · `DUNNING_ACTION`(Paddle) · `WRITE_OFF`(Paddle) · `UNCOLLECTIBLE_EVENT`(Paddle) · `BILLING_RELATIONSHIP` · `BILLING_CANDIDATE` · `BILLING_DUPLICATE_GROUP` · `BILLING_RECONCILIATION` · `BILLING_COVERAGE_RESULT` · `BILLING_DISCOVERY_GAP` · `BILLING_DISCOVERY_EVIDENCE` · `BILLING_AUDIT_EVENT`.

---

## 2. Billing Discovery Profile (§7)

**Schema**: billing_discovery_profile_id · provider_id(=`paddle`/`toss_billing`) · provider_account_id · billing_account_scope · subscription_account_ids · merchant_account_ids · tenant/brand/store/legal_entity_id · environment · region · supported_currencies · billing_model · invoice_model · **usage_billing_support(=false·N/A)** · metering_support(=quota only) · proration_model(Paddle) · tax_model(Paddle) · dunning_model(Paddle) · write_off_model(Paddle) · deleted_invoice_support · historical_coverage · API/bulk_export/webhook_support · owner · version · status · certification_status · last_verified_at. **★2 Provider: Paddle(SaaS MoR) + Toss(광고비 billing_key)**.

---

## 3. Billing Account (§8-9) & Alias

**★2 Billing Account 도메인**: (a) SaaS 구독 청구(Paddle·subscription_customer), (b) 광고비 wallet(BillingMethod·tenant).
**Schema(§8)**: billing_account_id · provider_id · provider_account_id · external_billing_account_id(paddle_customer_id/billing_method_id) · subscription_customer_id · subscription_account_id · commerce_customer_id · payment_customer_id · account_id(app_user) · tenant/brand/store/legal_entity_id · environment · region · default_currency · tax_region · billing_email_references(user_email) · invoice_recipient_references · **payment_method_reference(billing_key)** · status · created/updated/closed/deleted_at · alias_ids · merge_state · evidence. **Matrix(§92)**: | Billing Account | Subscription | Cycle | Invoice Schedule | Invoice | Usage | Rating | Collection | Status | Evidence |
**상태(§9)**: ACTIVE/ACTIVE_WITH_WARNINGS/SUSPENDED/COLLECTION_HOLD/CLOSED/ARCHIVED/SOFT_DELETED/HARD_DELETED/ANONYMIZED/MERGED/DUPLICATE/UNKNOWN. **★Billing Account ≠ Subscription Customer 자동동일시 금지(§5.1)**.

---

## 4. Billing Profile (§10-11) & Contact Role (§12)

**Profile(§10)**: billing_profile_id · billing_account_id · profile_type · invoice_recipient · billing_contact · billing/tax_address_reference · **tax_identifier_token_reference**(원문 금지) · currency · locale · timezone · invoice_delivery_method · payment_terms · collection_method · purchase_order_requirement · legal_entity · valid_from/to · status · evidence. **Type(§11)**: PERSONAL·BUSINESS·ENTERPRISE·CONSOLIDATED·SUBSCRIPTION_SPECIFIC·PROJECT/STORE/MARKETPLACE_SPECIFIC·MANUAL_INVOICE·OTHER.
**Contact Role(§12, 11종)**: BILLING_ACCOUNT_OWNER · BILLING_CONTACT · INVOICE_RECIPIENT · PAYMENT_METHOD_HOLDER · ACCOUNTS_PAYABLE_CONTACT · CONTRACT_CONTACT · TAX_CONTACT · PURCHASE_ORDER_APPROVER · ORGANIZATION_ADMIN · SUBSCRIBER · UNKNOWN. **★Billing Contact/Invoice Recipient 라는 이유만으로 전체 Org Subscription/Usage/Seat 데이터 포함 금지(§5.1)**.

---

## 5. Billing Cycle (§13-14) · Anchor (§15) · Service Period (§16) · Invoice Schedule (§17-18)

**Cycle(§13·=Paddle billing_cycle)**: billing_cycle_id · billing_account_id · subscription_id · cycle_type · interval · interval_count · timezone · anchor_date · period_start/end · cutoff_time · invoice_generation_time · payment_due_offset · grace_period · effective_from/to · status · evidence. **Type(§14)**: CALENDAR_MONTH·ANNIVERSARY_MONTH·WEEKLY·BIWEEKLY·QUARTERLY·SEMIANNUAL·ANNUAL·CUSTOM·EVENT_BASED·USAGE_CUTOFF_BASED(N/A). (현행 Paddle monthly/annual.)
**Anchor(§15)**: billing_anchor_id · subscription_id · billing_account_id · anchor_type · anchor_timestamp · timezone · source · previous_anchor · changed_at · reason · proration_impact · next_invoice_impact · status · evidence.
**Service Period(§16)**: service_period_id · source_object · start/end_at · timezone · inclusive/exclusive_boundary · subscription/usage/invoice_period_reference · correction 여부 · status · evidence. **★Billing Period ≠ Service Period 혼용 금지**.
**Invoice Schedule(§17·=Paddle next_billed_at)**: invoice_schedule_id · billing_account_id · subscription_id · next_invoice_date(current_period_end) · billing_cycle · billing_anchor · collection_method · auto_advance/auto_finalize 여부 · draft_window · usage_cutoff(N/A) · tax_calculation_time · payment_due_date · scheduled_changes · status · version · evidence. **상태(§18)**: SCHEDULED/READY/ON_HOLD/WAITING_USAGE(N/A)/WAITING_TAX/WAITING_APPROVAL/GENERATING/COMPLETED/SKIPPED/CANCELLED/FAILED/UNKNOWN. **★Invoice Schedule 은 Paddle 소유·내부 reference**(auto-generated·Provider Retrieval).
