# Canonical DSAR Billing Discovery Governance — Dedup/Reconciliation, Coverage/Gap, Evidence/Explain, Permission, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-2** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): paddle_subscriptions/events·BillingMethod/ad_spend_ledger·pg_settlement·ai_usage_quota·SecurityAudit · Part 3-3-3-3-3-3-3-3-1 Subscription Reconciliation·Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_BILLING_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_BILLING_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_BILLING_DISCOVERY_INVOICE_USAGE.md`](CANONICAL_DSAR_BILLING_DISCOVERY_INVOICE_USAGE.md) · ADR=[`../architecture/ADR_DSAR_BILLING_USAGE_METERING_DISCOVERY.md`](../architecture/ADR_DSAR_BILLING_USAGE_METERING_DISCOVERY.md)

---

## 1. Dedup (§65-66) · Reconciliation (§67-68)

**Dedup(§65)**: Provider Invoice(Paddle)·Internal Billing Invoice(ad_spend_ledger)·Subscription Provider Invoice·Payment Provider Invoice·ERP Invoice·Accounting Entry·Warehouse Invoice Copy·PDF Invoice Document·Webhook Event(paddle_events)·Export Snapshot·Usage Aggregate Copy(N/A)·Rating Result Copy(N/A). **Key(§66)**: External Invoice ID(paddle transaction)+Provider Account·Invoice Number+Legal Entity·Billing Account+Billing Period·Subscription+Service Period·Invoice Version·Usage Aggregate ID(N/A)·Rating Result ID(N/A)·Billing Run ID(N/A)·Webhook Event ID·Content Hash·Source Lineage.
**Reconciliation(§67)**: Subscription Period vs Invoice Period·Plan/Price vs Invoice Item·**Subscription Quantity vs Billed Quantity·Seat Count vs Billed Seat Count**·Raw Usage vs Aggregate(N/A)·Aggregate vs Rated(N/A)·Rated vs Invoice Item(N/A)·Proration Result vs Invoice Adjustment·**Invoice Total vs Payment Amount**·Invoice Credit vs Credit Balance·Tax Result vs Invoice Tax·Payment Failure vs Dunning Stage·**Paused Subscription vs New Invoice·Cancelled Subscription vs Future Invoice·Void Invoice vs Accounting Entry·Written-off Invoice vs Active Collection**·Provider Invoice vs Internal Invoice. **상태(§68)**: MATCH/BILLING_ACCOUNT/BILLING_PERIOD/PLAN_PRICE/QUANTITY/SEAT_COUNT/USAGE_EVENT(N/A)/USAGE_AGGREGATION(N/A)/RATING(N/A)/PRORATION/INVOICE_TOTAL/PAYMENT_AMOUNT/TAX/CREDIT/DUNNING/SUBSCRIPTION_STATUS/ACCOUNTING/DELETION_MISMATCH·MANUAL_REVIEW/BLOCKED. **★paddle vs 내부 reference drift·Cancelled인데 Future Invoice=핵심 Reconciliation**.

---

## 2. Coverage (§69) · Gap (§70-71)

**Coverage Dimension(§69, 29종)**: Billing Provider/Account/Profile/Contact Role·Billing Cycle/Anchor·Invoice Schedule·Billing Run(N/A)·Draft/Final Invoice·Invoice Item·Invoice History/Delivery·Usage Meter(N/A)·Raw Usage/Aggregate/Correction/Late Usage(N/A)·Rating(N/A)·Proration·Adjustment·Credit/Debit·Tax·Collection Attempt·Dunning·Write-off·Deleted/Archived Invoice·Relationship·Evidence Coverage. **Matrix(§94)**: | Request | Account | Cycle | Invoice | Items | Usage | Rating | Proration | Collection | Dunning | Archived | Overall |
**Gap Type(§70, 31종)**: BILLING_PROVIDER/ACCOUNT_UNREGISTERED·BILLING_ACCOUNT_MAPPING/PROFILE_MISSING·CONTACT_ROLE_UNRESOLVED·BILLING_CYCLE/ANCHOR_UNKNOWN·INVOICE_SCHEDULE/BILLING_RUN_HISTORY_MISSING·DRAFT/FINAL_INVOICE_UNSEARCHABLE·INVOICE_ITEM_COVERAGE_INCOMPLETE·INVOICE_STATUS/DELIVERY_HISTORY_MISSING·USAGE_METER_UNREGISTERED(N/A)·USAGE_SUBJECT_KEY_UNMAPPED(N/A)·USAGE_EVENT_COVERAGE/DEDUPLICATION/CORRECTION(N/A)·LATE_USAGE_POLICY_UNKNOWN(N/A)·USAGE_AGGREGATE/RATING_RESULT_MISSING(N/A)·PRORATION_HISTORY_MISSING·BILLING_ADJUSTMENT_UNMAPPED·CREDIT_DEBIT/TAX_RESULT/COLLECTION_ATTEMPT/DUNNING/WRITE_OFF_HISTORY_MISSING·DELETED_INVOICE_UNSEARCHABLE·**PROVIDER_INTERNAL_BILLING_DRIFT**. **★Critical(§71)**: Billing Account 잘못된 Tenant·**Invoice Recipient/Data Subject 역할 혼동**·현재 Invoice만 검색(Draft/Void/Archived 누락)·**Subscription Quantity vs Billed Quantity 불일치**·Usage 다른 Account 귀속(N/A)·Late Usage 잘못된 Period(N/A)·Rating vs Invoice Item 불일치(N/A)·Proration 이력 누락·**Paused Subscription Invoice 생성·Cancelled Subscription Future Invoice·Written-off Invoice Collection 지속**·Tax Identifier 전체값 저장·**Provider/Internal Invoice Total 불일치**.

---

## 3. Evidence (§72) · Explain (§73) · Permission (§74)

**Evidence(§72)**: request/discovery_task_id·provider/provider_account/billing_account_id·subscription_id·invoice_ids·billing_run_ids(N/A)·meter_ids(N/A)·endpoint/query_template·API_version·scope/identifier_set_version·subject_role·billing/service_period·status_filters·deleted/archived_inclusion·pagination·async_job·usage_event/aggregate_count(N/A)·invoice/invoice_item/collection_attempt_count·duplicate/excluded_count·error·started/completed_at·result_hash·audit_reference.
**Explain(§73)**: 어떤 Billing Provider/Account·Billing Profile/Contact Role·Cycle/Anchor·Invoice Schedule/Billing Run(N/A)·Draft/Final/Paid/Void/Written-off Invoice·Invoice Item 원천(Subscription/Usage(N/A)/Adjustment)·Usage Meter/Event(N/A)·Aggregate/Rating(N/A)·Late Usage/Correction(N/A)·Proration/Credit/Debit·Collection Attempt/Dunning·Provider/Internal 중복제거·Reconciliation Mismatch·남은 Coverage Gap 설명.
**Permission(§74, 29종)**: VIEW_BILLING_DISCOVERY_PROFILE·VIEW_BILLING_ACCOUNT·MANAGE_BILLING_ACCOUNT_MAPPING·VIEW_BILLING_PROFILE/CONTACT_ROLE/CYCLE·VIEW_INVOICE_SCHEDULE/BILLING_RUN·RUN_INVOICE/INVOICE_HISTORY_DISCOVERY·VIEW_INVOICE_ITEM/INVOICE_DELIVERY_HISTORY·VIEW_USAGE_METER·RUN_USAGE_DISCOVERY·VIEW_USAGE_AGGREGATE/USAGE_RATING_RESULT/PRORATION_RESULT/BILLING_ADJUSTMENT/BILLING_CREDIT_DEBIT/TAX_RESULT/COLLECTION_ATTEMPT/DUNNING_CASE/WRITE_OFF·RUN_BILLING_RECONCILIATION·VIEW_BILLING_COVERAGE·MANAGE_BILLING_GAP·VIEW_BILLING_EVIDENCE/AUDIT·ADMIN_BILLING_DISCOVERY_OVERRIDE. **★Invoice 수정/청구 실행/Payment Retry 실행/Tax Identifier 원문 조회 권한 미포함**.

---

## 4. Static Lint (§75) & Runtime Guard (§76)

**Static Lint(§75)**: Billing Account Binding 없는 Invoice Query · **Billing Contact→Account Owner 직접확정 · Invoice Recipient 에 전체 Org 데이터** · **Draft/Final Invoice 혼용 · Current Invoice만 검색** · Invoice Item 누락 · Service Period 누락 · **Billing Period/Service Period 혼용** · Usage Subject Key 누락(N/A) · Meter Version 누락(N/A) · Usage Deduplication Key 누락(N/A) · **Event Time/Ingestion Time 혼용(N/A)** · **Raw Usage→Invoice Amount 직접사용(N/A)** · Late Usage Policy 누락(N/A) · Rating Result 누락(N/A) · Proration History 누락 · Collection Attempt/Dunning History 누락 · **Tax Identifier 원문 저장** · Internal Billing DB만으로 Complete · Pagination 미완료 · Evidence 누락.
**Runtime Guard(§76)**: Invalid Verification Token · Closed/Withdrawn Request · Wrong Provider/Billing Account · Cross-Tenant Billing · Wrong Brand/Legal Entity · Subject Role 미해결 · **Billing Contact/Invoice Recipient Scope 초과** · Usage Subject Mapping 미검증(N/A) · Meter Version 불일치(N/A) · **Duplicate Usage 재청구 위험(N/A)** · Scope 초과 Invoice Export · **Tax Identifier 원문 조회** · Deleted Invoice Endpoint 미승인 · Pagination 미완료 Complete · Critical Schema Drift · **Kill Switch**.

---

## 5. Error (§77) · Warning (§78)

**Error(§77, 33종·`BILLING_/USAGE_` 접두)**: BILLING_PROVIDER/ACCOUNT_NOT_REGISTERED·BILLING_ACCOUNT_SCOPE_MISMATCH·BILLING_PROFILE_NOT_FOUND·CONTACT_ROLE_UNRESOLVED·BILLING_CYCLE/ANCHOR_UNKNOWN·INVOICE_SCHEDULE_NOT_FOUND·BILLING_RUN_HISTORY_MISSING(N/A)·INVOICE_NOT_FOUND·INVOICE_HISTORY_INCOMPLETE·INVOICE_ITEM_COVERAGE_INCOMPLETE·INVOICE_DELIVERY_HISTORY_MISSING·USAGE_METER_NOT_REGISTERED(N/A)·USAGE_SUBJECT_MAPPING_MISSING(N/A)·USAGE_EVENT_DISCOVERY_FAILED(N/A)·USAGE_DUPLICATION_RISK(N/A)·USAGE_CORRECTION_HISTORY_MISSING(N/A)·LATE_USAGE_POLICY_UNKNOWN(N/A)·USAGE_AGGREGATION_FAILED(N/A)·USAGE_RATING_RESULT_MISSING(N/A)·PRORATION_RESULT_MISSING·BILLING_ADJUSTMENT_UNMAPPED·BILLING_CREDIT_HISTORY_MISSING·TAX_RESULT_MISSING·COLLECTION_ATTEMPT/DUNNING/WRITE_OFF_HISTORY_MISSING·BILLING_RECONCILIATION_FAILED·COVERAGE_INCOMPLETE·CRITICAL_GAP·PERMISSION_DENIED·RUNTIME_BLOCKED.
**Warning(§78, 20종)**: MULTIPLE_ACCOUNT_MATCH·CONTACT_ROLE·BILLING_PERIOD·INVOICE_DRAFT·INVOICE_ARCHIVE·INVOICE_DELIVERY·USAGE_SUBJECT(N/A)·USAGE_LATE_EVENT(N/A)·USAGE_DUPLICATE(N/A)·USAGE_CORRECTION(N/A)·USAGE_RATING(N/A)·PRORATION·BILLING_CREDIT·TAX_MAPPING·COLLECTION_RETRY·DUNNING_SLA·WRITE_OFF·PROVIDER_INTERNAL_BILLING_DRIFT·MANUAL_REVIEW_REQUIRED·SLA_RISK.

---

## 6. Golden (§79) · Conformance (§80) · Equivalence (§81-82)

**Golden(§79·70+ 시나리오·N/A 표기)**: Exact/Multiple/Consolidated Billing Account·Wrong/Cross-Tenant Billing Account·Personal/Business Profile·Invoice Recipient≠Account Owner·Billing Contact Scope 제한·Account Merge · Calendar/Anniversary/Annual/Custom Cycle·Anchor Change·Schedule Hold·Final Bill · Billing Run(N/A) · Preview/Draft/Finalized/Open/Partially Paid/Paid/Overdue/Void/Uncollectible/Written-off/Credited/Archived/Deleted Invoice·Multiple Subscription/Multi-currency · Recurring Base/Seat/Add-on/Proration Debit/Credit/Tax/Discount/Previous Balance/Manual Adjustment/Credit/Fee Item · **Usage Metering(N/A·전 시나리오)** · Immediate Upgrade/Downgrade Proration·Seat Increase/Decrease·Anchor Change·Cancellation/Manual/SLA Credit·Tax Adjustment · First Attempt Success/Failure·Retry Success/Exhausted·First/Final Notice·Service Restriction·Subscription Pause/Cancellation·Uncollectible·Write-off·**Written-off Active Collection Mismatch** · Pagination 완료/미완료·Provider/Internal Invoice Duplicate·**Subscription/Invoice Period Mismatch·Paused Subscription Invoice·Cancelled Future Invoice**·Coverage Complete/Critical Gap·Override 허용/금지.
**Conformance(§80)**: Billing Account·Profile·Cycle·Invoice Schedule·Billing Run(N/A)·Invoice·Invoice Item·Usage Meter/Event/Aggregate/Correction/Rating(N/A)·Proration·Adjustment·Credit·Tax·Collection Attempt·Dunning·Write-off 에 동일 Contract(Account Scope·Tenant/Brand/Legal Entity·Subject Role·Current/Historical·Relationship·Candidate·Deduplication·Reconciliation·Coverage·Evidence·Audit).
**Equivalence(§81)**: 기존 Billing History(paddle/ad_spend_ledger)·Invoice Search·Usage Dashboard(ai_usage_quota) 와 비교(Billing Account/Invoice/Draft/Final/Invoice Item·Usage(N/A)/Aggregate/Rating·Proration/Credit/Debit/Tax·Collection Attempt/Dunning/Write-off·Archived/Deleted·Provider/Internal Match·Error/Warning/Latency/Audit). **Difference(§82)**: MATCH·EXPECTED_{BILLING_ACCOUNT/ROLE/PERIOD/INVOICE/INVOICE_ITEM/USAGE(N/A)/RATING(N/A)/PRORATION/CREDIT/TAX/COLLECTION/DUNNING/ARCHIVE}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_BILLING_DEFECT·LEGACY_DISCOVERY_GAP·LEGACY_WRONG_ACCOUNT_RISK**·CANONICAL_BILLING_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_ACCOUNT_RISK`·고객영향 `LEGACY_BILLING_DEFECT`·`LEGACY_DISCOVERY_GAP`·`CANONICAL_BILLING_DEFECT`·Cross-Tenant=운영전환 차단**.

---

## 7. Observability (§83) · Alert (§84) · Audit (§85)

**Metrics(§83)**: Billing Provider/Account/Profile Count·Contact Role Conflict·Billing Cycle/Invoice Schedule/Billing Run(N/A)/Run Failure·Draft/Final Invoice·Invoice Item·Invoice Delivery Failure·Usage Meter/Event/Duplicate/Rejected/Late/Correction/Aggregate/Rating(N/A)·Proration·Adjustment·Credit·Tax·Collection Attempt/Failure·Dunning Case·Write-off·Reconciliation Mismatch·Coverage Gap·Cross-Tenant Block·Legacy Usage·P50/P95/P99.
**Alert(§84)**: Billing Account Mapping 누락·Cross-Tenant·Invoice Recipient Scope 초과·Billing Run 실패(N/A)·Draft Invoice 장기잔존·Invoice Item Coverage 급감·Usage Meter 미등록(N/A)·Duplicate/Late Usage 급증(N/A)·Usage Subject Mapping 오류(N/A)·Rating Mismatch(N/A)·Proration 누락·Tax Result 누락·Payment Failure/Dunning 불일치·**Paused Subscription Invoice·Cancelled Future Invoice·Written-off Collection 지속·Provider/Internal Invoice Drift 급증**·Deleted Invoice 검색실패·Critical Gap·Legacy 신규사용·Evidence 누락.
**Audit Event(§85, 33종·`BILLING_/USAGE_` 접두)**: DISCOVERY_PROFILE_CREATED·BILLING_ACCOUNT_DISCOVERED/ALIAS_LINKED·BILLING_PROFILE/CONTACT_ROLE/CYCLE/ANCHOR·INVOICE_SCHEDULE·BILLING_RUN/RUN_ITEM(N/A)·INVOICE/INVOICE_ITEM/INVOICE_STATUS_HISTORY/INVOICE_DELIVERY_HISTORY·USAGE_METER_REGISTERED/EVENT/DUPLICATE_DETECTED/CORRECTION/LATE_USAGE/AGGREGATE/RATING_RESULT(N/A)·PRORATION_RESULT·BILLING_ADJUSTMENT/CREDIT/DEBIT·TAX_RESULT·COLLECTION_ATTEMPT·DUNNING_CASE·WRITE_OFF·DUPLICATE_GROUPED·RECONCILIATION_COMPLETED·GAP_DETECTED·RUNTIME_BLOCKED (SecurityAudit·paddle_audit_log 확장).

---

## 8. Existing Impl Classification (§86) · Duplicate Audit (§87) · Regression Gate (§88)

**분류(§86)**: 실측 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `paddle_subscriptions`/`paddle_events`(Invoice/Tax/transaction·MoR) | `LEGACY_ADAPTER` → Billing Account/Invoice(**Provider Retrieval**) | Paddle 소유·내부 reference·PROVIDER_LIMITATION |
| **`BillingMethod`+`ad_spend_ledger`(billing_key 광고비 청구)** | `MIGRATION_REQUIRED` → `CANONICAL_BILLING_ACCOUNT`/Collection Attempt/Debit | **내부 실 recurring billing** |
| `PgSettlement`/`orderhub_settlements`/`creator_settlements` | `KEEP_SEPARATE_WITH_REASON` | 구독사 commerce payout·SaaS 청구 아님 |
| `ai_usage_quota`(AI 한도) | `KEEP_SEPARATE_WITH_REASON` | quota 한도·과금 아님·Usage Meter N/A |
| **내부 Billing Engine·Invoice Store·Billing Run·Usage Metering/Rating/Meter·Dunning·Write-off** | `UNVERIFIED`(NOT_APPLICABLE) | **Paddle MoR·flat 요금제·지어내기 금지** |
| Billing Account↔Subscription↔Payment Mapping·Contact Role·Reconciliation·Candidate/Coverage/Gap 부재 | 신설 | 현행 부재 |
**Duplicate Audit(§87)**: 실측 — SaaS Invoice=Paddle 단일(Provider)·광고비=ad_spend_ledger 단일·Settlement=pg/orderhub/creator 도메인별(중복 아님)·Quota=ai_usage_quota 단일. **중복 Billing Account Registry·Invoice Search·Collection Store·Candidate Store 신설 위험만 차단**(§98 Provider별 독립 Registry 금지).
**Regression Gate(§88)**: 변경 전후 Billing Account Search·Profile·Cycle·Invoice Schedule·Billing Run(N/A)·Draft/Final Invoice·Invoice Item·Status/Delivery History·Usage(N/A)·Proration·Adjustment·Credit/Debit·Tax·Collection Attempt/Dunning/Write-off·Archived/Deleted·Reconciliation·Coverage·Explain·Audit·**Existing API Compatibility**(paddle/BillingMethod/ad_spend_ledger/pg_settlement 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 9. 완료 상태 요약

Billing Entity 41 · Discovery Profile(Paddle+Toss 2 Provider)·Billing Account(12상태·SaaS Paddle+광고비 wallet 2도메인)/Alias·Profile/Contact Role 11·Cycle/Anchor/Service Period·Invoice Schedule(Paddle) · **Billing Run/Batch/Job=NOT_APPLICABLE(Paddle MoR)** · Invoice(17상태·Paddle)/Item·Status/Delivery History · **Usage Meter/Event/Aggregate/Rating=NOT_APPLICABLE(flat 요금제·ai_usage_quota=한도)** · Proration(Paddle)·Adjustment/Credit/Debit(ad_spend_ledger)·Tax(Paddle) · Collection Attempt/Dunning/Write-off(Paddle·PROVIDER_LIMITATION) · Relationship Graph/Candidate 17상태 · Dedup/Reconciliation 20상태(paddle vs 내부·Cancelled Future Invoice) · Coverage 29/Gap 31 · Evidence/Explain·Permission 29·Lint/Guard·Error 33/Warning 20·Golden 70+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★내부 Billing Engine 부재(Paddle MoR)·Usage Metering/Billing Run/Dunning=NOT_APPLICABLE·내부 실 billing=광고비 ad_spend_ledger·Settlement=commerce payout(KEEP_SEPARATE) 정직표기**. **실 Adapter/Reconciliation/CI가드 구현=후속 승인 세션·verify+배포승인.**
