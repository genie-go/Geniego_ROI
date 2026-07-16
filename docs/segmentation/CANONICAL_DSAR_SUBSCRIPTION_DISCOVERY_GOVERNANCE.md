# Canonical DSAR Subscription Discovery Governance — Dedup/Reconciliation, Coverage/Gap, Evidence/Explain, Permission, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-1** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): paddle_subscriptions/events/audit_log·app_user(plan/trial/team)·plan_pricing·UserAuth(plan.upgrade/refund)·SecurityAudit · Part 3-3-3-3-3-3-3-1 Reconciliation/Coverage/Gap·Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_LIFECYCLE.md`](CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_LIFECYCLE.md) · ADR=[`../architecture/ADR_DSAR_SUBSCRIPTION_FOUNDATION.md`](../architecture/ADR_DSAR_SUBSCRIPTION_FOUNDATION.md)

---

## 1. Dedup (§56-57) · Reconciliation (§58-59)

**Dedup(§56)**: Provider Subscription(paddle)·Internal Subscription Record(app_user.plan)·Commerce Platform Subscription·Billing Platform Subscription·Payment Provider Recurring Object·Warehouse Copy·CRM Subscription Snapshot·CDP Trait/Audience Representation·Webhook Event(paddle_events)·Export Snapshot·Audit Event(paddle_audit_log). **Key(§57)**: External Subscription ID(paddle_subscription_id)+Provider Account·Subscription Customer ID·Internal Subscription ID(app_user)·Product/Plan/Price·Current Period·Created At·Subscription Version·Webhook Event ID·Content Hash·Source Lineage.
**Reconciliation(§58)**: **Provider Subscription(paddle) vs Internal(app_user.plan)**·Subscription Customer vs Commerce Customer·vs Payment Customer·Subscription Status vs Payment Status·Subscription Period vs Invoice Period·Subscription Plan vs Entitlement·Scheduled Change vs Applied State(N/A)·Trial Conversion vs Paid Subscription·Cancellation vs Provider Active State·Pause vs Billing Continuation(N/A)·Expired Subscription vs Active Entitlement·Deleted Subscription vs Warehouse Active Copy. **상태(§59)**: MATCH/CUSTOMER_IDENTITY/**PROVIDER_INTERNAL_STATUS**/PLAN/PRICE/PERIOD/TRIAL_CONVERSION/RENEWAL/SCHEDULED_CHANGE/PAUSE_BILLING/CANCELLATION/EXPIRATION/ENTITLEMENT/DELETION_MISMATCH·MANUAL_REVIEW/BLOCKED. **★paddle vs app_user.plan drift=핵심 Reconciliation**(paddle_sync_status 정합).

---

## 2. Coverage (§60) · Gap (§61-62)

**Coverage Dimension(§60, 26종)**: Provider/Subscription Account·Subscription Customer·Identity Mapping·Subject Role·Current/Historical Subscription·Subscription Item·Plan·Price·Plan/Price Version(GAP)·Trial·Trial Conversion·Renewal·Change History·Scheduled Change(N/A)·Quantity/Seat Change(GAP)·Pause/Resume(N/A)·Cancellation·Expiration·Reactivation·Resubscription·Status History·Deleted/Archived·Relationship·Evidence Coverage. **Matrix(§85)**: | Request | Customer | Current | Historical | Plan·Price | Trial | Renewal | Change | Pause | Cancellation | Deleted | Overall |
**Gap Type(§61, 27종)**: SUBSCRIPTION_PROVIDER/ACCOUNT_UNREGISTERED·SUBSCRIPTION/PAYMENT/COMMERCE_CUSTOMER_MAPPING_MISSING·SUBJECT_ROLE_UNRESOLVED·**HISTORICAL_SUBSCRIPTION_UNSEARCHED**·SUBSCRIPTION_ITEM_UNSEARCHED·PLAN/PRICE_UNREGISTERED·**PLAN_PRICE_VERSION_MISSING**·TRIAL_HISTORY/TRIAL_CONVERSION/RENEWAL_HISTORY_MISSING·SCHEDULED_CHANGE_MISSING(N/A)·PLAN_CHANGE_HISTORY/QUANTITY_CHANGE/SEAT_CHANGE_MISSING·PAUSE/RESUME_HISTORY_MISSING(N/A)·CANCELLATION/EXPIRATION/REACTIVATION_HISTORY_MISSING·RESUBSCRIPTION_LINK_MISSING·STATUS_HISTORY_INCOMPLETE·DELETED_SUBSCRIPTION_UNSEARCHABLE·**PROVIDER_INTERNAL_SUBSCRIPTION_DRIFT**. **★Critical(§62)**: Subscription Account 잘못된 Tenant·Payment Customer ID Account Binding 없음·현재 Active만 검색·Trial/Renewal/Cancellation 이력 누락·Plan/Price 변경 이력 누락·**Cancelled 인데 Provider Active·Expired 인데 Entitlement 유지·Pause 중 Billing 지속 미기록**·**Seat User→Account Owner 오확정·Billing Contact 에 전체 Org 데이터**·Deleted 검색불가·Provider/Internal 불일치·Scheduled Downgrade 누락.

---

## 3. Evidence (§63) · Explain (§64) · Permission (§65)

**Evidence(§63)**: request/discovery_task_id·provider/provider_account/subscription_account_id·endpoint/query_template·API_version·scope/identifier_set_version·subject_role·search_strategy·date_range·status_filters·deleted/archived_inclusion·pagination_status·async_job·result/subscription/item/trial/renewal/change/cancellation/duplicate/excluded_count·error·started/completed_at·result_hash·audit_reference.
**Explain(§64)**: 어떤 Provider/Account·Subscription Customer·Subject 역할(Owner/Subscriber/Seat User)·현재/과거 Subscription·Plan/Price·Trial 시작/종료/전환·Renewal 시도/성공/실패·Upgrade/Downgrade·예약변경(N/A)·Pause/Resume(N/A)·Cancellation/Expiration·Reactivation vs Resubscription·Provider/Internal 중복제거·남은 Coverage Gap 설명.
**Permission(§65, 23종)**: VIEW_SUBSCRIPTION_DISCOVERY_PROFILE·VIEW_SUBSCRIPTION_CUSTOMER·MANAGE_SUBSCRIPTION_CUSTOMER_MAPPING·VIEW_SUBSCRIPTION_SUBJECT_ROLE·RUN_SUBSCRIPTION/SUBSCRIPTION_HISTORY_DISCOVERY·VIEW_SUBSCRIPTION_ITEM/PLAN/PRICE/TRIAL/RENEWAL/CHANGE_HISTORY/SCHEDULED_CHANGE/PAUSE_RESUME/CANCELLATION/EXPIRATION/REACTIVATION·RUN_SUBSCRIPTION_RECONCILIATION·VIEW_SUBSCRIPTION_COVERAGE·MANAGE_SUBSCRIPTION_GAP·VIEW_SUBSCRIPTION_EVIDENCE·VIEW_SUBSCRIPTION_AUDIT·ADMIN_SUBSCRIPTION_DISCOVERY_OVERRIDE. **★Subscription 변경/취소/결제 실행 권한 미포함**.

---

## 4. Static Lint (§66) & Runtime Guard (§67)

**Static Lint(§66)**: **현재 Active Subscription만 검색** · Provider Account Binding 없는 Query · **Payment Customer ID 직접 Person 확정** · Subscription Customer=Account Owner 자동동일시 · **Seat User→Account Owner 확정 · Billing Contact 에 전체 Org 데이터** · **Plan 이름만으로 Identity 결정** · Plan/Price 혼용 · **Trial/Free Plan 혼용 · Cancelled/Expired 혼용 · Reactivation/Resubscription 혼용** · Scheduled Change 누락(N/A 시 스킵) · Upgrade/Downgrade 이전상태 누락 · **Plan/Price Version History 누락** · Renewal/Pause/Resume(N/A) History 누락 · Deleted Subscription Search 누락 · Internal DB만으로 Complete · Pagination 미완료 · Evidence 누락.
**Runtime Guard(§67)**: Invalid Verification Token · Closed/Withdrawn Request · Wrong Provider/Subscription Account · Cross-Tenant Subscription · Wrong Brand · Prod/Sandbox 혼합 · Subscription Customer Mapping 미검증 · Subject Role 미해결 · Shared Email Broad Match · **Seat User Scope 초과 · Billing Contact Scope 초과** · Plan/Price Mapping 불명확 · Deleted Subscription Endpoint 미승인 · Scope 초과 Bulk Export · Pagination 미완료 Complete · Critical Schema Drift · **Kill Switch**.

---

## 5. Error (§68) · Warning (§69)

**Error(§68, 29종·`SUBSCRIPTION_` 접두)**: PROVIDER/ACCOUNT_NOT_REGISTERED·ACCOUNT_SCOPE_MISMATCH·CUSTOMER_NOT_FOUND·CUSTOMER_MAPPING_MISSING·SUBJECT_ROLE_UNRESOLVED·NOT_FOUND·HISTORY_INCOMPLETE·ITEM_UNAVAILABLE·PLAN/PRICE_NOT_MAPPED·PLAN_PRICE_VERSION_MISSING·TRIAL_HISTORY_MISSING·TRIAL_CONVERSION_UNRESOLVED·RENEWAL_HISTORY_MISSING·CHANGE_HISTORY_MISSING·SCHEDULED_CHANGE_MISSING·PAUSE/RESUME_HISTORY_MISSING·CANCELLATION/EXPIRATION_HISTORY_MISSING·REACTIVATION_UNRESOLVED·RESUBSCRIPTION_LINK_MISSING·DELETED_RECORD_UNAVAILABLE·RECONCILIATION_FAILED·COVERAGE_INCOMPLETE·CRITICAL_GAP·PERMISSION_DENIED·RUNTIME_BLOCKED.
**Warning(§69, 17종)**: MULTIPLE_CUSTOMER_MATCH·SHARED_IDENTIFIER·ROLE_CONFLICT·HISTORICAL_COVERAGE·LEGACY_PLAN·PRICE_VERSION·TRIAL_CONVERSION·RENEWAL·SCHEDULED_CHANGE·PARTIAL_CHANGE·PAUSE_BILLING·CANCELLATION·EXPIRATION·ENTITLEMENT_MISMATCH·PROVIDER_INTERNAL_SUBSCRIPTION_DRIFT·MANUAL_REVIEW_REQUIRED·SLA_RISK.

---

## 6. Golden (§70) · Conformance (§71) · Equivalence (§72-73)

**Golden(§70·75+ 시나리오·N/A 표기)**: Exact Subscription Customer ID·Commerce/Payment/CRM/CDP Mapping·Shared Email·Multiple Customer Match·Wrong Provider Account/Cross-Tenant·Prod/Sandbox·Account Owner/Subscriber/Billing Contact/Payment Method Holder/**Team Admin/Seat User**/Gift Recipient·Subject Role Conflict · Draft/Incomplete/Trialing/Active/Past Due/Paused(N/A)/Cancel-at-period-end/Cancelled/Expired/Archived/Deleted/Multiple Active/Duplicate Subscription · Free/Monthly/Annual/Team/Enterprise/Legacy Plan·Grandfathered/Multi-currency/Seat-based/Usage Price·Plan/Price Version Change(GAP) · Standard/Payment Method Required Trial·Trial Extension/Conversion Success/Failure/Cancellation/Expiration·Free Plan vs Trial · Renewal Scheduled/Success/Payment Failure/Retry/Cancellation/Non-renewal·Renewal Date-Invoice Mismatch · Immediate/Scheduled Upgrade/Downgrade·Quantity Increase/Decrease·Seat Add/Remove·Billing Interval/Add-on Change·Failed/Rolled-back/Superseded Change · Pause/Resume(N/A) · Immediate/End-of-period/Trial/Non-payment/Admin Cancellation·Cancellation Revoked·Natural/Payment Failure/Contract Expiration·**Reactivation vs Resubscription 구분** · Pagination 완료/미완료·Deleted Search·Provider/Internal Duplicate·**Provider/Internal Status Mismatch**·Plan/Entitlement Mismatch·Coverage Complete/Critical Gap·Override 허용/금지.
**Conformance(§71)**: Subscription Customer·Subscription·Item·Plan·Price·Trial·Conversion·Renewal·Scheduled Change(N/A)·Upgrade·Downgrade·Quantity/Seat Change·Pause/Resume(N/A)·Cancellation·Expiration·Reactivation·Resubscription·Status History 에 동일 Contract(Account Scope·Tenant/Brand·Subject Role·Identifier·Current/Historical·Relationship·Candidate·Deduplication·Reconciliation·Coverage·Evidence·Audit).
**Equivalence(§72)**: 기존 Subscription Search(paddle/app_user)·Customer Portal·Admin Lookup(AdminPlans) 와 비교(Customer/Current/Historical Subscription·Plan/Price·Trial/Renewal/Upgrade/Downgrade/Quantity/Seat/Pause(N/A)/Cancellation/Expiration/Reactivation·Deleted·Provider/Internal Match·Error/Warning/Latency/Audit). **Difference(§73)**: MATCH·EXPECTED_{CUSTOMER_IDENTITY/ROLE/HISTORICAL/PLAN_PRICE/TRIAL/RENEWAL/CHANGE_HISTORY/PAUSE_RESUME/CANCELLATION/EXPIRATION/REACTIVATION/DELETED_DATA}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_DISCOVERY_GAP·LEGACY_WRONG_SUBSCRIBER_RISK**·CANONICAL_SUBSCRIPTION_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_SUBSCRIBER_RISK`·고객영향 `LEGACY_DISCOVERY_GAP`·`CANONICAL_SUBSCRIPTION_DEFECT`·Cross-Tenant=운영전환 차단**.

---

## 7. Observability (§74) · Alert (§75) · Audit (§76)

**Metrics(§74)**: Provider/Account/Customer Count·Customer Mapping/Subject Role Conflict·Current/Historical Subscription·Trial/Trial Conversion·Renewal/Renewal Failure·Upgrade/Downgrade·Scheduled Change(N/A)·Seat Change·Pause(N/A)/Resume(N/A)·Cancellation/Expiration·Reactivation/Resubscription·Deleted·Duplicate Group·Reconciliation Mismatch·Coverage Gap·Wrong Account/Cross-Tenant Block·Legacy Usage·P50/P95/P99.
**Alert(§75)**: Subscription Account Mapping 누락·Cross-Tenant·Payment Customer Mapping 누락·**Seat User Scope 초과**·Current Coverage 급감·Historical 검색실패·Plan/Price Mapping 누락·Trial Conversion 불일치·Renewal History 누락·Scheduled Change 누락(N/A)·**Pause 중 Billing 지속·Cancellation 후 Provider Active·Expired Entitlement 유지**·Reactivation/Resubscription 오연결·Deleted 검색실패·**Provider/Internal Drift 급증**·Critical Gap·Legacy 신규사용·Evidence 누락.
**Audit Event(§76, 27종·`SUBSCRIPTION_` 접두)**: DISCOVERY_PROFILE_CREATED·CUSTOMER_DISCOVERED·CUSTOMER_ALIAS_LINKED·SUBJECT_ROLE_RESOLVED·DISCOVERED·ITEM_DISCOVERED·PLAN/PRICE_REGISTERED·PLAN/PRICE_VERSION_DISCOVERED·TRIAL/TRIAL_CONVERSION/RENEWAL/CHANGE/SCHEDULED_CHANGE/QUANTITY_CHANGE/SEAT_CHANGE/PAUSE/RESUME/CANCELLATION/EXPIRATION/REACTIVATION_DISCOVERED·RESUBSCRIPTION_LINKED·DUPLICATE_GROUPED·RECONCILIATION_COMPLETED·GAP_DETECTED·RUNTIME_BLOCKED (SecurityAudit·paddle_audit_log 확장).

---

## 8. Existing Impl Classification (§77) · Duplicate Audit (§78) · Regression Gate (§79)

**분류(§77)**: 실측 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `paddle_subscriptions`(status·period·cancelled_at·Paddle MoR) | `MIGRATION_REQUIRED` → `CANONICAL_SUBSCRIPTION_ADAPTER` | Subscription Entity·Status History·현재 period |
| `paddle_customer_id`↔`app_user`(user_email) | `LEGACY_ADAPTER` → `CANONICAL_SUBSCRIPTION_CUSTOMER_ADAPTER` | Identity Mapping(paddle↔app_user↔Payment) |
| `app_user`(plan/plans·parent_user_id·team_role) | `LEGACY_ADAPTER` → Subscriber/Seat Subject Role | Team/Seat 231차 |
| `plan_pricing`(price_usd/annual·5티어)·`AdminPlans` | `CONSOLIDATION_REQUIRED` → Plan/Price Registry | **Version History=GAP** |
| `app_user.trial`/TRIAL_DAYS/TrialPlan | `LEGACY_ADAPTER` → Trial Adapter | Free Plan 구분 |
| `UserAuth` plan.upgrade/plan_change/plan.refund | `LEGACY_ADAPTER` → Change/Cancellation Adapter | Upgrade/Downgrade/Refund |
| `paddle_events`/paddle_audit_log | `VALIDATED_LEGACY` → Status History/Webhook/Reconciliation | paddle_sync_status 정합 |
| **Pause/Resume·Scheduled Change·Quantity Change 이력·Plan/Price Version History** | `UNVERIFIED`(NOT_APPLICABLE/GAP) | **paddle 현재상태·pause 컬럼 부재·current-state·지어내기 금지** |
| **외부 다중 구독 Provider** | `UNVERIFIED`(NOT_APPLICABLE) | **Paddle 단일 MoR** |
| Subscription↔Customer↔Payment Mapping·Subject Role·Candidate/Coverage/Gap 부재 | 신설 | 현행 부재 |
**Duplicate Audit(§78)**: 실측 — Subscription=`paddle_subscriptions`(Provider)+`app_user.plan`(Internal) 2뷰(중복 아님·Reconciliation 대상)·Plan/Price=`plan_pricing` 단일·Trial=`app_user.trial` 단일. **중복 Subscription Customer Mapping·Plan/Price Registry·Candidate Store 신설 위험만 차단**(§89 Provider별 독립 Registry 금지).
**Regression Gate(§79)**: 변경 전후 Subscription Customer/Current/Historical Search·Item·Plan/Price·Trial/Conversion·Renewal·Upgrade/Downgrade·Scheduled Change(N/A)·Quantity/Seat·Pause/Resume(N/A)·Cancellation/Expiration·Reactivation·Deleted·Relationship·Reconciliation·Coverage·Explain·Audit·**Existing API Compatibility**(paddle/app_user/AdminPlans/UserAuth plan 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 9. 완료 상태 요약

Subscription Entity 30 · Discovery Profile(Paddle 단일)·Customer(13상태)/Alias·Subject Role 14(Seat=parent_user_id/team_role) · Subscription(24상태)/Item · Plan 15/상태·Price 13·**Plan/Price Version History=GAP** · Trial(9상태)/Conversion · Renewal(11상태)/Schedule · Change 16/상태·Upgrade/Downgrade·**Scheduled Change/Quantity Change=N/A/GAP** · **Pause/Resume=NOT_APPLICABLE** · Cancellation 13/상태·Expiration·Reactivation vs Resubscription · Status History(Append-only)·Relationship Graph·Candidate 17상태 · Dedup/Reconciliation 16상태(paddle vs app_user drift) · Coverage 26/Gap 27 · Evidence/Explain·Permission 23·Lint/Guard·Error 29/Warning 17·Golden 75+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★Provider=Paddle 단일·Pause/Resume/Scheduled/Version History=N/A/GAP·외부 구독 Provider=N/A 정직표기**. **실 Adapter/Reconciliation/Version History 스토어/CI가드 구현=Part 3-3-3-3-3-3-3-3-2~(후속 승인 세션·verify+배포승인).**
