# Canonical DSAR Commerce & Payment Discovery Objects — Commerce/Marketplace/Subscription/Payment Object & Field Registry, PCI Classification, Token/Vault, Order-Payment Graph, Search Capability/Strategy & Retrieval Contract

> **EPIC 06-A Part 3-3-3-3-3-3-3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `channel_orders`(buyer/shipping)·`OrderHub`·`Pnl`·`Payment`(Toss billing_key)·`BillingMethod`·`Paddle`(paddle_subscriptions/events)·`CouponAdmin`·`PgSettlement`·app_user.plan · Part 3-3-3-3-3-3-1 SaaS Endpoint/Pagination · Part 3-3-3-3-2 Verification Token.
> **★정직**: PAN/CVV/카드 Vault·Marketplace Seller/Vendor/Payout=NOT_APPLICABLE(카드저장 0·MoR·마켓플레이스 미운영). PCI=Toss billing_key 토큰 참조만.
> 형제: [`CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_COMMERCE_MARKETPLACE_PAYMENT_DISCOVERY_FOUNDATION.md`](../architecture/ADR_DSAR_COMMERCE_MARKETPLACE_PAYMENT_DISCOVERY_FOUNDATION.md)

---

## 1. Object Registry — Commerce (§22) · Marketplace (§23·N/A) · Subscription (§24) · Payment (§25)

**Commerce Object(§22, 30종)**: CUSTOMER · CUSTOMER_ACCOUNT · GUEST_CUSTOMER · ADDRESS · CONTACT · CART · CART_ITEM · CHECKOUT · CHECKOUT_SESSION · QUOTE · **ORDER(=channel_orders)** · ORDER_ITEM · ORDER_ADJUSTMENT · ORDER_NOTE · ORDER_STATUS_HISTORY · INVOICE · CREDIT_NOTE · TAX_RECORD · PAYMENT_REFERENCE · REFUND_REFERENCE(=refund) · SHIPMENT_REFERENCE(=shipping_no·WMS) · RETURN_REFERENCE · DISCOUNT · **COUPON(=coupon/coupon_code)** · PROMOTION · LOYALTY_ACCOUNT · GIFT_CARD_REFERENCE · WALLET_REFERENCE · CUSTOM_OBJECT. (현행 핵심=ORDER·REFUND·COUPON·SHIPMENT.)
**Marketplace Object(§23)**: **★NOT_APPLICABLE**(BUYER 만 channel_orders 로 존재·SELLER/VENDOR/COMMISSION/PAYOUT/SETTLEMENT/LISTING/DISPUTE=마켓플레이스 미운영). 향후 활성화 계약.
**Subscription Object(§24, 22종·=Paddle+app_user)**: SUBSCRIPTION_CUSTOMER(paddle_customer_id) · SUBSCRIPTION(paddle_subscriptions) · SUBSCRIPTION_ITEM · PLAN(app_user.plans) · PRICE(paddle_price_id) · BILLING_ACCOUNT · BILLING_PROFILE · BILLING_CYCLE · INVOICE · INVOICE_ITEM · CREDIT_NOTE · USAGE_RECORD · METERED_USAGE · TRIAL · PAUSE · CANCELLATION · RENEWAL · DUNNING_EVENT · COUPON · PROMOTION · ENTITLEMENT · CUSTOM_OBJECT.
**Payment Object(§25, 27종)**: PAYMENT_CUSTOMER · PAYMENT_INTENT · PAYMENT · CHARGE · AUTHORIZATION · CAPTURE · REFUND · REVERSAL · DISPUTE · CHARGEBACK · **PAYMENT_METHOD**(billing_key·masked) · **PAYMENT_TOKEN**(billing_key) · BANK_ACCOUNT_REFERENCE · WALLET_REFERENCE · SETUP_INTENT · MANDATE · INVOICE_PAYMENT · PAYOUT · TRANSFER · BALANCE_TRANSACTION · FEE · RISK_RESULT · FRAUD_CASE(N/A) · KYC_REFERENCE(N/A) · AUDIT_EVENT(paddle_audit_log) · DELETED_CUSTOMER · CUSTOM_METADATA. **Object Mapping(§26)** & **상태(§45)**: Commerce(ACTIVE/CANCELLED/REFUNDED/ARCHIVED/DELETED…)·Order(DRAFT/CONFIRMED/FULFILLED/CANCELLED/REFUNDED/RETURNED…)·Payment(AUTHORIZED/CAPTURED/SUCCEEDED/REFUNDED/DISPUTED/CHARGEBACK…). **Matrix(§85)**: | Object | Domain | Provider Object | Subject Roles | Customer ID | Order Link | Payment Link | PCI Class | Deleted Search | Status |

---

## 2. Field Mapping — Commerce (§27) & Payment (§28)

**Commerce Field(§27)**: provider_field · canonical_field · data_type · object_category · personal_data_category · sensitivity · subject_role · identifier/contact/order/address/date/amount/currency/status/deletion_role · free-text 여부 · exportable 여부 · correction/deletion_support · masking_policy · version · status.
**Payment Field(§28)**: provider_field · canonical_field · payment_object_category · **PCI_classification** · personal_data_category · sensitivity · customer_identifier/merchant_account/order_reference/payment_method/token/amount/currency/risk/dispute_role · exportable 여부 · masking_requirement · **prohibited_payload 여부** · retention_policy · version · status.

---

## 3. PCI Classification (§32-35) · Token (§36) · Vault (§37-38)

**★현행 PCI 핵심**: 카드 PAN/CVV 저장 0(Toss PG billing_key 토큰·Paddle MoR) → 대부분 `PCI_OUT_OF_SCOPE`, 결제참조=`PCI_TOKENIZED_REFERENCE`(billing_key).
**Class(§32, 7종)**: `PCI_PROHIBITED_SECRET`(N/A·미저장) · `PCI_HIGHLY_RESTRICTED`(N/A) · `PCI_TOKENIZED_REFERENCE`(=billing_key) · `PCI_MASKED_METADATA`(brand/last4/expiry) · `PCI_NON_CARD_PAYMENT_REFERENCE` · `PCI_OUT_OF_SCOPE`(대부분) · `PCI_CLASSIFICATION_UNKNOWN`.
**Prohibited Secret(§33)**: CVV/PIN/Magnetic Stripe/Full Auth Secret/Unencrypted PAN/Private Tokenization Secret/Wallet Private/Bank Login/Secret Key → **DSAR Candidate/Export/로그 포함 금지·발견 시 Security Incident 후보**. (현행 미저장 → 발견 자체가 이상신호.)
**Highly Restricted(§34)**: Full PAN/Bank Account/Routing Number/Sensitive Auth Result/payment-linked ID Document/Raw Provider Evidence → Security/Legal Review 없이 조회 금지.
**Masked Metadata(§35)**: Payment Method Type · Card Brand · **Last Four** · Expiry Month/Year · Funding Type · Issuer Country · Wallet Type · Token Provider · Created At · Status · Verification Summary(Policy Registry 제한).
**Token Reference(§36·=billing_key/paddle token)**: token_reference_id · provider_id · merchant_account_id · provider_token_id(billing_key) · token_type · payment_method_type · customer_reference · account/store_binding · environment · masked_metadata · created/updated/expired/revoked_at · status · vault_reference · export/deletion_policy · audit_reference. **★Token 원문/Reusable Credential Candidate 저장 금지**.
**Vault(§37-38)**: **★NOT_APPLICABLE**(자체 카드 Vault 없음·Toss/Paddle 외부 토큰화). 절대원칙(향후): **DSAR Discovery Service 에 Detokenization 권한 금지**·Vault Secret 로그 금지·Token≠PAN·Prod/Sandbox Vault 분리·Merchant 간 Token 재사용 가정 금지·Vault 전체 Export 금지·Provider Token 을 Canonical Payment Credential 로 저장 금지.

---

## 4. Order-Payment Relationship Graph (§39-40)

**관계(§39)**: Customer→Cart→Checkout→Order · Order→Order Item · Order→Invoice · Order→Payment · Payment→Charge/Authorization/Capture · Charge→Refund · Charge→Dispute · Dispute→Chargeback · Subscription→Invoice · Invoice→Payment · Marketplace Order→Seller Order(N/A) · Order→Shipment(shipping_no·WMS) · Order→Return · Order→Customer Contact Roles · Payment Customer→Payment Method Token(billing_key). **Mapping(§40)**: relationship_mapping_id · source/target_object · source/target_field · provider_account/store/merchant_binding · relationship_type · cardinality · temporal_validity · optional 여부 · confidence · status · version. (현행 channel_orders↔refund↔settlement↔shipping_no 연결·OrderHub 취소 역분개 268차 정합.)

---

## 5. Search Capability (§41) · Strategy (§42-43) · Historical (§44) · Retrieval (§46-50)

**Capability(§41)**: Commerce(CUSTOMER/GUEST/EMAIL/PHONE/ORDER_ID/CART/CHECKOUT/INVOICE/ADDRESS_LOOKUP·DATE_RANGE_ORDER_SEARCH·DELETED_CUSTOMER/ARCHIVED_ORDER_LOOKUP·ORDER_HISTORY·BULK_ORDER_EXPORT·CUSTOM_OBJECT) · Payment(PAYMENT_CUSTOMER/PAYMENT_ID/CHARGE/REFUND/DISPUTE/PAYMENT_METHOD/TOKEN_METADATA/INVOICE_PAYMENT/PAYOUT/BALANCE_TRANSACTION/DELETED_CUSTOMER_LOOKUP·AUDIT_LOG·BULK/ASYNC_EXPORT) · Subscription(SUBSCRIPTION_CUSTOMER/SUBSCRIPTION/INVOICE/USAGE/CANCELLATION/DUNNING/PAYMENT_METHOD/DELETED_CUSTOMER·BULK).
**Strategy(§42)**: ①Exact Provider Customer ID ②Exact Order/Payment/Subscription ID ③Source Account-bound External ID ④Verified Email/Phone(buyer_email) ⑤CRM/CDP Mapping ⑥Account Relationship ⑦Order Relationship Graph ⑧Payment Customer Relationship ⑨Date-bounded ⑩Deleted/Archived ⑪Bulk/Async ⑫Manual Portal ⑬Internal Sync Reconciliation. **★제한(§43)**: Shared Email 전체 Order 검색 금지·Address 단독 Broad 금지·**Last Four 단독 Payment Match 금지·Amount/Date 만으로 Payment Subject 확정 금지**·Marketplace Seller 전체(N/A)·Merchant 전체 Export 금지·Card Brand/Last Four 만으로 Person 확정 금지·Token Metadata 만으로 Buyer 확정 금지.
**Historical(§44)**: earliest_available_date · current_API/archived/deleted/audit/webhook/export/internal_copy_coverage · provider/legal_retention · confidence · last_verified_at. (channel_orders sync window·마켓플레이스 API 제한 정합.)
**Commerce Retrieval(§46)**: retrieval_request_id · dsar_request_id · discovery_task_id · provider/provider_account/store/site/channel_id · object_id · customer_identifier_subset · order_id_subset · date_range · status_filters · deleted/archived_inclusion · relationship_scope · scope/identifier_version · idempotency_key · pagination · timeout · status · audit_reference.
**Payment Retrieval(§47)**: payment_retrieval_id · dsar_request_id · discovery_task_id · payment_provider/merchant_account/payment_account_id · provider_customer_id · order_reference · payment/charge/refund/dispute_id_subset · payment_method_metadata_inclusion · **PCI_field_exclusion_profile** · date_range · currency · environment · scope/identifier_version · idempotency_key · pagination · timeout · status · audit_reference.
**Runtime 검증(§48)**: Commerce(Provider Account·Store·Brand·Site·Channel·Subject Identifier·Date·Object Scope·Status·Environment) · Payment(Provider/Merchant/Connected Account·Legal Entity·Currency·Environment·Subject Scope·Order Relationship·**PCI Exclusion Profile**).
**Bulk Export(§49-50)**: Exact Lookup 부족·Historical 필요·Object API 제한·Server-side Filter·Store/Merchant 안전격리·승인 Date Range·최소 Object Scope·Encrypted Temp·Candidate Row Validation·Cleanup 조건에서만. **금지**: 전체 Provider/Merchant/Marketplace 무필터 Export·Test/Prod 혼합·**Payment Credential/PCI Secret 포함 Export**·Mapping 미확인·Local PC 저장·Cleanup 없는 장기저장·Raw File 직접 Requester 전달.
