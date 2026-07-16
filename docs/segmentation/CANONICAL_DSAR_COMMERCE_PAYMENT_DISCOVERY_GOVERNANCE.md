# Canonical DSAR Commerce & Payment Discovery Governance — Webhook/Candidate/Exclusion, Dedup/Reconciliation, Coverage/Gap, Evidence/Explain, Permission/Override, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-3-1** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): channel_orders/OrderHub/Pnl·Payment(Toss)/BillingMethod/PgSettlement·Paddle(paddle_events webhook·paddle_audit_log)·Coupon·app_user.plan·SecurityAudit · Part 3-3-3-3-3-3-1 SaaS Webhook/Reconciliation · Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_OBJECTS.md`](CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_OBJECTS.md) · ADR=[`../architecture/ADR_DSAR_COMMERCE_MARKETPLACE_PAYMENT_DISCOVERY_FOUNDATION.md`](../architecture/ADR_DSAR_COMMERCE_MARKETPLACE_PAYMENT_DISCOVERY_FOUNDATION.md)

---

## 1. Webhook (§51) · Candidate (§52-55)

**Webhook Correlation(§51·=paddle_events)**: Customer Created/Updated/Deleted·Cart Created/Abandoned·Checkout Completed·Order Created/Updated/Cancelled·Payment Authorized/Captured/Failed·Refund Created·Dispute Created/Updated·Subscription Created/Renewed/Cancelled·Invoice Created/Paid/Failed·Shipment·Return·Seller/Vendor(N/A) 를 관계 Graph 연결. **★Webhook 만으로 현재상태 확정 금지(§3.9)**.
**Commerce Candidate(§52)**: candidate_id · request_id · provider/provider_account/store_id · site/channel · object_id · provider_record_id · canonical_entity_candidate · **subject_roles** · customer_identifier_matches · tenant/brand/store/date_match · status · deletion_state · personal_data_categories · sensitivity · related_object_references · match_confidence · duplicate_group · review_requirements · evidence_reference.
**Payment Candidate(§53)**: payment_candidate_id · request_id · provider/merchant_account/payment_account_id · payment_object_id · provider_record_id · customer/order/invoice_reference · **payment_method_token_reference(billing_key)** · masked_payment_metadata · amount/currency · status · refund/dispute_relationship · tenant/brand/store_match · subject_role · **PCI_classification · prohibited_field_detected 여부** · match_confidence · duplicate_group · review_requirements · evidence_reference.
**포함 검증(§54)**: Subject Role · Store/Merchant Scope · Customer Identifier · Order/Payment Relationship · Date Range · Tenant/Brand · Shared Identifier Risk · Gift/Recipient · Buyer/Seller(N/A) · Payment Method Holder · Third-party Data Risk. **Exclusion(§55, 19종)**: WRONG_CUSTOMER · WRONG_ORDER · WRONG_STORE · WRONG_MERCHANT · WRONG_BRAND · CROSS_TENANT · **BILLING_CONTACT_ONLY · SHIPPING_RECIPIENT_ONLY · GIFT_RECIPIENT_ONLY** · SELLER/BUYER_DATA_OUT_OF_SCOPE(N/A) · THIRD_PARTY_PAYMENT_METHOD_HOLDER · **PCI_PROHIBITED_FIELD** · TEST_DATA · DUPLICATE_PROVIDER_COPY · OUT_OF_DATE_RANGE · UNVERIFIED_GUEST_MATCH · SHARED_EMAIL_MATCH · MANUAL_REVIEW.

---

## 2. Dedup (§56-57) · Reconciliation (§58-59)

**Cross-system Dedup(§56)**: Commerce Provider Customer vs Internal(channel_orders)·Commerce Order vs OMS(OrderHub)·vs ERP·Order Payment Reference vs Payment Provider Charge·Subscription Invoice vs Payment·Refund vs Credit Note·Marketplace Order vs Seller Order(N/A)·Shipping Reference vs Logistics(WMS)·Provider Webhook vs Current Object·Warehouse Copy vs Provider Source. **Key(§57)**: Provider Record ID · Store/Merchant-bound External ID · Order Number+Store · Payment ID+Merchant Account · Charge/Refund/Dispute/Subscription/Invoice ID · Content Hash · Object Version · Webhook Event ID · Internal Sync ID · Source Lineage.
**Reconciliation(§58)**: Commerce Customer vs CRM/CDP·Commerce Order vs OMS·Order Payment vs Payment Provider·Refund vs Provider Refund·Subscription Invoice vs Payment·Marketplace Buyer vs Identity·Seller/Vendor(N/A)·Payment Customer vs Commerce Customer·Deleted Provider Customer vs Internal Active·Cancelled Order vs Internal Active·Provider Token Metadata vs Internal Token(billing_key)·Provider Merchant Account vs Store. **상태(§59)**: MATCH/CUSTOMER_IDENTITY/GUEST/STORE/MERCHANT_MAPPING_MISMATCH·ORDER/PAYMENT_MISSING_INTERNAL/PROVIDER·REFUND/DISPUTE/SUBSCRIPTION_MISMATCH·DELETION/STATUS/AMOUNT_CURRENCY/TOKEN_REFERENCE_MISMATCH·MANUAL_REVIEW/BLOCKED. (268차 OrderHub 취소 역분개·정산 zero-out 288차 정합.)

---

## 3. Coverage (§60) · Gap (§61-62) · Evidence (§63) · Explain (§64)

**Coverage(§60)**: Commerce(Customer/Guest/Address/Cart/Checkout/Order/Order Item/Invoice/Credit Note/Deleted/Archived/Custom)·Payment(Payment Customer/Payment/Charge/Auth/Capture/Refund/Dispute/Payment Method Metadata/Token/Payout/Balance/Audit)·Subscription(Customer/Subscription/Invoice/Usage/Cancellation/Renewal/Dunning/Payment Ref)·Marketplace(N/A). **Matrix(§87)**: | Request | Customer | Guest | Order | Invoice | Payment | Refund | Dispute | Subscription | Marketplace | Deleted | Overall |
**Gap Type(§61, 27종)**: COMMERCE_PROVIDER/STORE/MERCHANT_ACCOUNT/MARKETPLACE_ACCOUNT/SUBSCRIPTION_ACCOUNT/PAYMENT_ACCOUNT_UNREGISTERED · STORE_BRAND/MERCHANT_STORE_MAPPING_UNKNOWN · SELLER/VENDOR_SCOPE_UNMAPPED(N/A) · CUSTOMER_IDENTIFIER_MAPPING_MISSING · GUEST_IDENTITY_UNRESOLVED · BILLING_SHIPPING_ROLE_UNMAPPED · COMMERCE/PAYMENT_OBJECT_UNMAPPED · **PCI_CLASSIFICATION_UNKNOWN · TOKEN_VAULT_MAPPING_MISSING** · ORDER_PAYMENT_RELATIONSHIP_MISSING · DELETED_CUSTOMER/ARCHIVED_ORDER_UNSEARCHABLE · PAYMENT_HISTORY_INCOMPLETE · REFUND/DISPUTE_DISCOVERY_UNAVAILABLE · SUBSCRIPTION_HISTORY_UNKNOWN · PROVIDER_INTERNAL_SYNC_DRIFT · **WRONG_MERCHANT_RISK · CROSS_TENANT_SCOPE_RISK**. **★Critical(§62)**: Merchant Account 잘못된 Tenant/Brand·Payment Customer ID Merchant Binding 없음·**Guest Email 만으로 Subject 확정**·Billing/Shipping Role 미구분·**Full Payment Credential Candidate 저장·PCI Unknown**·Order-Payment 연결 불가·Refund/Dispute 검색불가·Deleted Customer 검색불가·Buyer/Seller Scope 혼합·Prod/Sandbox 혼합·Provider vs Internal Payment 불일치.
**Evidence(§63)**: request/discovery_task_id · provider/provider_account/store/merchant_account/marketplace_account/subscription_account_id · connector_id/version · endpoint_id · API_version · object_id · **subject_role** · scope/identifier_version · date_range · deleted/archived_inclusion · **PCI_exclusion_profile** · pagination · async_job · result/candidate/excluded/duplicate_count · error · started/completed_time · result_hash · audit_reference.
**Explain(§64)**: 어떤 Store/Merchant·Commerce/Payment Provider·Customer/Guest Identifier·Subject 역할(Purchaser/Recipient/Billing)·Order/Payment/Refund 관계·Payment Credential 최소화 방식·Marketplace Buyer/Seller Scope(N/A)·Deleted/Archived·Provider/Internal 중복제거·남은 Coverage Gap 설명.

---

## 4. Permission (§65) · Override (§66) · Static Lint (§67) · Runtime Guard (§68)

**Permission(§65, 24종)**: VIEW_COMMERCE_PROVIDER_PROFILE · MANAGE_COMMERCE_STORE_MAPPING · VIEW_MERCHANT_ACCOUNT · MANAGE_MERCHANT_STORE_MAPPING · VIEW_MARKETPLACE_ACCOUNT · MANAGE_SELLER_VENDOR_MAPPING(N/A) · VIEW_SUBSCRIPTION/PAYMENT_ACCOUNT · MANAGE_COMMERCE/PAYMENT_OBJECT_MAPPING · MANAGE_COMMERCE/PAYMENT_IDENTIFIER_MAPPING · VIEW_PCI_CLASSIFICATION · VIEW_PAYMENT_TOKEN_REFERENCE · RUN_COMMERCE/PAYMENT/SUBSCRIPTION/MARKETPLACE_DISCOVERY · RUN_COMMERCE_PAYMENT_RECONCILIATION · VIEW_COMMERCE_PAYMENT_COVERAGE · MANAGE_COMMERCE_PAYMENT_GAP · VIEW_COMMERCE_PAYMENT_EVIDENCE · VIEW_COMMERCE_PAYMENT_AUDIT · ADMIN_COMMERCE_PAYMENT_OVERRIDE. **★DSAR Discovery 권한 ≠ Vault Detokenization 권한**.
**Override(§66)**: override_id · request_id · provider · store/merchant_account · original_scope · requested_change · subject_role · reason · expected_coverage_gain · privacy/PCI/wrong_customer_risk · evidence · approvers · expiry · audit. **금지**: Cross-Tenant Store · Wrong Merchant Account · **Vault Detokenization · PCI Secret 조회 · Payment Credential 전체 Export** · Shared Email Broad Search · Marketplace Buyer/Seller 혼합(N/A) · Prod/Sandbox 혼합 · Agent Authorization Scope 초과 · 전체 Merchant Account Export.
**Static Lint(§67)**: Store Binding 없는 Commerce Query · Merchant Binding 없는 Payment Query · **Payment Customer ID Account Binding 누락** · Guest Email 직접 Person 확정 · Billing/Shipping Role 미구분 · Commerce Customer=Recipient 자동동일시 · Provider/Merchant 전체 Export · PCI Field Classification 누락 · **Full PAN/CVV Field Candidate 저장 · Vault Detokenization 호출 · Token 원문 로그** · Payment Raw Response 장기저장 · Marketplace Buyer/Seller Scope 누락(N/A) · Order-Payment Relationship 누락 · Deleted/Archived Search 누락 · Pagination 미구현 · Evidence 누락 · Test Store 포함 · Internal Sync 만으로 Complete.
**Runtime Guard(§68)**: Invalid Verification Token · Wrong Store/Merchant Account · Cross-Tenant · Wrong Brand/Marketplace · Guest Identity 미검증 · Shared Email Broad · **Billing Contact→Purchaser 자동확정 · Shipping Recipient→Account Owner 자동확정** · Payment Customer Account Binding 불일치 · **PCI Prohibited Field 조회 · Vault Detokenization · Payment Credential Export** · Scope 초과 Bulk Export · Sandbox Account · Critical Schema Drift · Kill Switch.

---

## 5. Error (§69) · Warning (§70)

**Error(§69, 26종·`COMMERCE_/PAYMENT_/COMMERCE_PAYMENT_` 접두)**: COMMERCE_PROVIDER/STORE_NOT_REGISTERED · STORE/MERCHANT/MARKETPLACE/SUBSCRIPTION/PAYMENT_ACCOUNT_SCOPE_MISMATCH · COMMERCE_CUSTOMER_MAPPING_MISSING · GUEST_CUSTOMER_IDENTITY_UNRESOLVED · SUBJECT_ROLE_UNRESOLVED · COMMERCE/PAYMENT_OBJECT_NOT_MAPPED · PAYMENT_CUSTOMER_ACCOUNT_BINDING_MISSING · ORDER_PAYMENT_RELATIONSHIP_MISSING · PCI_CLASSIFICATION_UNKNOWN · **PCI_PROHIBITED_DATA_DETECTED** · PAYMENT_TOKEN_REFERENCE_INVALID · **PAYMENT_VAULT_ACCESS_PROHIBITED** · ARCHIVED_DATA_UNAVAILABLE · PAYMENT_HISTORY_INCOMPLETE · RECONCILIATION_FAILED · COVERAGE_INCOMPLETE · CRITICAL_GAP · PERMISSION_DENIED · RUNTIME_BLOCKED.
**Warning(§70, 17종)**: COMMERCE_MULTIPLE_CUSTOMER_MATCH · SHARED_EMAIL_WARNING · GUEST_MATCH_WARNING · BILLING_SHIPPING_CONFLICT · ARCHIVED_DATA_WARNING · MARKETPLACE_ROLE_WARNING(N/A) · PAYMENT_MULTIPLE_CUSTOMER_MATCH · PAYMENT_MERCHANT_MAPPING_WARNING · PAYMENT_MASKED_METADATA_WARNING · PAYMENT_TOKEN_REFERENCE_WARNING · PAYMENT_HISTORY_WARNING · REFUND/DISPUTE_COVERAGE_WARNING · SUBSCRIPTION_HISTORY_WARNING · PROVIDER_INTERNAL_SYNC_DRIFT · MANUAL_REVIEW_REQUIRED · SLA_RISK.

---

## 6. Golden (§71) · Conformance (§72) · Equivalence (§73-74)

**Golden(§71·55+ 시나리오·N/A 표기)**: 단일/다중 Store·Merchant Account · Wrong Store/Merchant/Cross-Tenant/Wrong Brand 차단 · Prod/Sandbox 분리 · Commerce Customer Exact ID · Guest Email/Shared Guest Email · Guest-to-known Conversion · Purchaser=Recipient/Purchaser≠Recipient · Billing≠Shipping Contact · Gift Recipient · Corporate Buyer · Payment Method Holder≠Buyer · (Marketplace Buyer·Seller=N/A) · Commerce Provider Customer ID Mapping · Payment Customer Merchant Binding/Mismatch · Subscription Customer Mapping · Order-Payment/Payment-Refund/Charge-Dispute/Order-Shipment Relationship · Active/Deleted/Archived/Cancelled/Refunded Customer·Order · PCI Masked Metadata · **Full PAN 탐지(이상신호)/CVV 탐지 · Token Reference 정상 · Vault Detokenization 차단** · Payment Raw Response 최소화 · Exact Order/Payment Lookup · Date-bounded · Pagination 완료/미완료 차단 · Bulk Export Scope 제한 · Internal Order Sync 일치/Stale · Provider vs Internal Payment 불일치 · Merchant Mapping Drift · Coverage Complete/Critical Gap · Override 허용/금지.
**Conformance(§72)**: Commerce Platform·Marketplace·OMS·Subscription(Paddle)·Billing·Payment Gateway(Toss)·Payment Processor·Wallet·Fraud·Tax 에 동일 Contract(Provider Profile·Account Scope·Store/Merchant Mapping·Object Registry·Identifier Mapping·Subject Role·PCI Classification·Relationship Graph·Search Capability·Retrieval·Candidate·Reconciliation·Coverage·Evidence·Audit).
**Equivalence(§73)**: 기존 Order Search(channel_orders/OrderHub)·Payment Lookup(Payment/Paddle)·Subscription Lookup(Paddle/app_user) 와 비교(Store/Merchant/Customer Mapping·Guest Matching·Order/Payment/Refund/Subscription Count·Deleted Customer·Archived Order·Subject Role·Payment Metadata·Internal Sync·Error·Warning·Latency·Audit). **Difference(§74)**: MATCH·EXPECTED_{STORE_SCOPE/MERCHANT_SCOPE/CUSTOMER_IDENTITY/GUEST_IDENTITY/SUBJECT_ROLE/ORDER_PAYMENT_LINK/PCI_MINIMIZATION/DELETED_DATA/SYNC}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_PCI_DEFECT·LEGACY_DISCOVERY_GAP·LEGACY_WRONG_CUSTOMER_RISK**·CANONICAL_COMMERCE_PAYMENT_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_PCI_DEFECT`·`LEGACY_WRONG_CUSTOMER_RISK`·고객영향 `LEGACY_DISCOVERY_GAP`=운영전환 차단**.

---

## 7. Observability (§75) · Alert (§76) · Audit (§77)

**Metrics(§75)**: Commerce/Marketplace/Payment/Subscription Provider·Store·Merchant/Marketplace/Seller-Vendor(N/A)/Subscription/Payment Account Count·Store/Merchant Mapping Error·Guest Identity/Shared Identifier·Subject Role Conflict·Commerce/Payment Retrieval·Archived/Deleted Search·**PCI Prohibited Data Block·Vault Access Block**·Candidate·Duplicate·Reconciliation Mismatch·Coverage Gap/Critical Gap·Legacy Usage·P50/P95/P99.
**Alert(§76)**: Store Mapping 누락·Merchant Account 오류·Cross-Tenant Merchant·Payment Customer Account Binding 누락·**Guest Email 자동 Person Match**·Billing/Shipping Role Conflict 급증·**PCI Prohibited Field 발견·Vault Detokenization 시도·Full Payment Credential 로그**·Marketplace Buyer/Seller 혼합(N/A)·Deleted Customer/Archived Order 검색실패·Order-Payment Relationship 누락·Provider/Internal Payment Drift·Prod/Sandbox 혼합·Critical Coverage Gap·Legacy 신규사용.
**Audit Event(§77, 28종·접두별)**: COMMERCE/MARKETPLACE/SUBSCRIPTION/PAYMENT_PROVIDER_PROFILE_CREATED · COMMERCE_STORE/MERCHANT_ACCOUNT/MARKETPLACE_ACCOUNT/SELLER_VENDOR/SUBSCRIPTION/PAYMENT_ACCOUNT_REGISTERED · COMMERCE/PAYMENT_IDENTIFIER_MAPPING_CREATED · COMMERCE/PAYMENT_OBJECT_REGISTERED · PCI_CLASSIFICATION_CREATED · PAYMENT_TOKEN/VAULT_REFERENCE_REGISTERED · ORDER_PAYMENT_RELATIONSHIP_CREATED · COMMERCE/PAYMENT_RETRIEVAL_STARTED · COMMERCE/PAYMENT_CANDIDATE_CREATED · DUPLICATE_GROUPED · RECONCILIATION_COMPLETED · GAP_DETECTED · **PCI_PROHIBITED_DATA_BLOCKED · VAULT_ACCESS_BLOCKED** · RUNTIME_BLOCKED (SecurityAudit·paddle_audit_log 확장).

---

## 8. Existing Impl Classification (§78) · Duplicate Audit (§79) · Regression Gate (§80)

**분류(§78)**: 실측 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `channel_orders`(buyer_email/name·shipping·마켓주문) | `MIGRATION_REQUIRED` → `CANONICAL_COMMERCE_OBJECT_REGISTRY`/Candidate | ORDER/CUSTOMER·Subject Role·Guest·Deleted 형식화 |
| `OrderHub`/`Omnichannel`/`Pnl`(집계·취소 역분개) | `CONSOLIDATION_REQUIRED` → Order-Payment Relationship/Reconciliation | 268차 취소·288차 정산 정합 |
| `Payment`(Toss·billing_key)/`BillingMethod`/`PgSettlement` | `LEGACY_ADAPTER` → `CANONICAL_PAYMENT_OBJECT`/Token Reference | billing_key=Token·PAN 없음 |
| `Paddle`(MoR·paddle_subscriptions/customer_id/events) | `LEGACY_ADAPTER` → Subscription/Payment Provider Profile·Webhook | MoR·카드 미저장 |
| app_user.plan/plans·`AdminPlans` | `VALIDATED_LEGACY` → Subscription Account(SaaS) | 구독사=Subject |
| `CouponAdmin`/`CouponRedeem`(coupon*) | `VALIDATED_LEGACY` → Commerce Object(COUPON) | TOCTOU 288차 정합 |
| 채널 커넥터(11번가/쿠팡/네이버/Amazon) | `KEEP_SEPARATE_WITH_REASON` | Part 3-3-3-3-3-3-1 SaaS Provider(중복 금지) |
| **PAN/CVV/카드 Vault·Marketplace Seller/Vendor/Payout** | `UNVERIFIED`(NOT_APPLICABLE) | **카드저장 0·MoR·마켓플레이스 미운영·지어내기 금지** |
| Store↔Merchant·Guest Identity·Order↔Payment Graph·Subject Role·PCI Classification·Candidate/Coverage/Gap 부재 | 신설 | 현행 부재 |
**Duplicate Audit(§79)**: 실측 — Order=`channel_orders`/`OrderHub` 단일 SoT·Payment=`Payment`(Toss)+`Paddle`(MoR) 도메인분리(중복 아님)·Coupon=`coupon*` 단일·Subscription=`Paddle`+app_user 단일. **중복 Store/Merchant Registry·Order Search·Payment Lookup·Candidate Store 신설 위험만 차단**(§91 Store/Order/Payment별 독립 Registry 금지).
**Regression Gate(§80)**: 변경 전후 Store/Merchant/Customer Mapping·Guest Search·Order/Cart/Checkout/Invoice/Payment/Refund/Dispute/Subscription Search·Marketplace(N/A)·Deleted/Archived·Payment Metadata Masking·Token(billing_key)·**PCI Control**·Bulk Export·Pagination·Reconciliation·Coverage·Explain·Audit·**Existing API Compatibility**(channel_orders/OrderHub/Payment/Paddle/Coupon 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 9. 완료 상태 요약

Commerce/Payment Entity 38 · Provider Profile/Category 18(현행 Marketplace/OMS/Subscription(Paddle)/Payment(Toss)·나머지 선언)·Store 11상태/Site/Channel 13·Merchant Account 13상태·**Marketplace/Seller/Vendor=NOT_APPLICABLE**·Subscription(Paddle+app_user)/Payment Account·Scope Hierarchy·Commerce Identifier 18/Guest/Subject Role 17·Commerce Object 30/Subscription 22/Payment 27·**Marketplace Object=N/A**·Field Mapping·**PCI Classification 7(대부분 OUT_OF_SCOPE·PAN/CVV/Vault=N/A·billing_key Token만)**·Order-Payment Relationship Graph 21·Search Capability/Strategy 13/제한·Historical·Retrieval(Commerce/Payment·PCI Exclusion)·Bulk/Webhook·Candidate/Exclusion 19·Dedup/Reconciliation 18상태·Coverage/Gap 27유형·Evidence/Explain·Permission 24/Override·Lint/Guard·Error 26/Warning 17·Golden 55+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★PAN/CVV/카드 Vault·Marketplace Seller/Vendor=NOT_APPLICABLE 정직표기(Toss billing_key+Paddle MoR)**. **실 Adapter/Retrieval/Reconciliation/CI가드 구현=Part 3-3-3-3-3-3-3-2~7(후속 승인 세션·verify+배포승인).**
