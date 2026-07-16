# Canonical DSAR Commerce & Payment Discovery Schema — Entity, Provider/Store/Merchant/Marketplace/Subscription/Payment Account Registry, Scope Hierarchy, Identity Mapping & Subject Role

> **EPIC 06-A Part 3-3-3-3-3-3-3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): **커머스** `channel_orders`(마켓플레이스 주문 동기화·**buyer_email·buyer_name**·shipping_address/no·phone)·`OrderHub`(채널 집계)·`Omnichannel`·`Pnl`(P&L) · **결제** `Payment`(**Toss PG**·billing_key 토큰)·`BillingMethod`(광고비 카드·billing_key 청구)·`PgSettlement`·`Paddle`(**Merchant of Record** SaaS 구독·paddle_subscriptions·paddle_customer_id·paddle_events webhook) · **구독** app_user.plan/plans·`AdminPlans` · **쿠폰** `CouponAdmin`/`CouponRedeem`(coupon/coupon_code/coupon_discount) · Provider=마켓플레이스 채널(11번가/쿠팡/네이버스토어/Amazon/TikTok Shop/Kakao·Part 3-3-3-3-3-3-1 SaaS Foundation) · Part 3-3-3-3-3-2 Structured(channel_orders MySQL)·Part 3-3-3-3-3-3-2 CRM/CDP(crm_customers)·Part 3-3-3-3-2 Verification Token·EPIC05 Identity.
> **★정직(§실측·핵심)**: **① PAN/CVV/PIN 등 카드 원문 저장 0**(grep=Catalog/AutoCampaign UI "card"뿐) — 결제=Toss PG(billing_key 토큰)+Paddle MoR → **PCI 대부분 OUT_OF_SCOPE·카드 Vault 없음·PAN/CVV/Detokenization=NOT_APPLICABLE**. **② Marketplace Seller/Vendor/Payout/Commission=NOT_APPLICABLE**(GeniegoROI=구독사 마켓주문 집계·다면 마켓플레이스 운영 아님). ③ 결제 도메인 2종 구분: **구독사 e커머스(channel_orders buyer)** vs **GeniegoROI 자체 SaaS 청구(Paddle/Toss)**. 지어내기 금지.
> 형제: [`CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_OBJECTS.md`](CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_OBJECTS.md) · [`CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_COMMERCE_PAYMENT_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_COMMERCE_MARKETPLACE_PAYMENT_DISCOVERY_FOUNDATION.md`](../architecture/ADR_DSAR_COMMERCE_MARKETPLACE_PAYMENT_DISCOVERY_FOUNDATION.md)
> **성격**: 목표 계약. 세부(Customer/Order/Cart/Invoice/Refund·Subscription/Coupon·Marketplace·Payment Method/PCI/Fraud)=Part 3-3-3-3-3-3-3-2~7. 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `channel_orders`(buyer_email/name·shipping·주문상태·마켓플레이스 동기화) | Commerce Object(ORDER/CUSTOMER)·Store/Channel Mapping·Subject Role(Purchaser/Recipient) |
| `OrderHub`·`Omnichannel`·`Pnl`(주문 집계/취소·정산) | Order·Payment Relationship Graph·Reconciliation 편입 |
| `Payment`(Toss PG·billing_key)·`BillingMethod`(광고비 카드·빌링키) | Payment Object·**Token Reference(billing_key)**·PCI Masked Metadata(PAN 없음) |
| `Paddle`(MoR SaaS 구독·paddle_subscriptions/customer_id/events) | Subscription/Payment Provider Profile·Webhook Correlation·Merchant Binding |
| app_user.plan/plans·`AdminPlans` | Subscription Account(SaaS 청구·구독사=Subject) |
| `CouponAdmin`/`CouponRedeem`·`PgSettlement` | Commerce Object(COUPON/SETTLEMENT) |
| 채널 커넥터(11번가/쿠팡/네이버/Amazon) | Commerce/Marketplace Provider Profile(Part 3-3-3-3-3-3-1 확장) |
| **PAN/CVV/카드 Vault·Marketplace Seller/Vendor/Payout** | **NOT_APPLICABLE**(카드저장 0·MoR·마켓플레이스 미운영·지어내기 금지) |
| Store↔Merchant Account·Guest Identity·Order↔Payment Graph·Subject Role·PCI Classification·Candidate/Coverage/Gap 부재 | 신설 |

**무후퇴**: channel_orders/OrderHub/Omnichannel/Pnl·Payment(Toss)/BillingMethod/PgSettlement·Paddle(MoR)·app_user plans·Coupon·채널커넥터 는 **정본 — 재구현 금지, Canonical Commerce·Payment Discovery Foundation 아래 통합**. Store/Order/Payment/Subscription별 독립 DSAR Registry/Candidate Store 신설 금지(§91).

---

## 1. Canonical Commerce Discovery Entity Model (§4)

Entity: `COMMERCE_PROVIDER_PROFILE` · `MARKETPLACE_PROVIDER_PROFILE` · `SUBSCRIPTION_PROVIDER_PROFILE` · `PAYMENT_PROVIDER_PROFILE` · `COMMERCE_STORE` · `COMMERCE_SITE` · `COMMERCE_CHANNEL` · `MERCHANT_ACCOUNT` · `MARKETPLACE_ACCOUNT`(N/A) · `SELLER_ACCOUNT`(N/A) · `VENDOR_ACCOUNT`(N/A) · `SUBSCRIPTION_ACCOUNT` · `PAYMENT_ACCOUNT` · `COMMERCE_SCOPE_NODE` · `COMMERCE_OBJECT_MAPPING` · `MARKETPLACE_OBJECT_MAPPING`(N/A) · `SUBSCRIPTION_OBJECT_MAPPING` · `PAYMENT_OBJECT_MAPPING` · `COMMERCE_FIELD_MAPPING` · `PAYMENT_FIELD_MAPPING` · `COMMERCE_SUBJECT_IDENTIFIER_MAPPING` · `PAYMENT_SUBJECT_IDENTIFIER_MAPPING` · `COMMERCE_RELATIONSHIP_MAPPING` · `ORDER_PAYMENT_RELATIONSHIP` · `PAYMENT_TOKEN_REFERENCE`(billing_key) · `PAYMENT_VAULT_REFERENCE`(N/A) · `PCI_DATA_CLASSIFICATION` · `COMMERCE_SEARCH_CAPABILITY` · `PAYMENT_SEARCH_CAPABILITY` · `COMMERCE_RETRIEVAL_REQUEST` · `PAYMENT_RETRIEVAL_REQUEST` · `COMMERCE_PROVIDER_CANDIDATE` · `PAYMENT_PROVIDER_CANDIDATE` · `COMMERCE_PAYMENT_DUPLICATE_GROUP` · `COMMERCE_PAYMENT_RECONCILIATION` · `COMMERCE_PAYMENT_COVERAGE_RESULT` · `COMMERCE_PAYMENT_DISCOVERY_GAP` · `COMMERCE_PAYMENT_DISCOVERY_EVIDENCE` · `COMMERCE_PAYMENT_AUDIT_EVENT`. (기존 등가=channel_orders/Paddle/Payment → 확장·N/A 표기.)

---

## 2. Provider Profile (§5) & Category (§6)

**Profile(§5)**: provider_profile_id · provider_id · provider_category · provider_account_id · tenant/workspace/brand/store/legal_entity_id · environment · region · supported_currencies/countries · customer/order/payment/subscription/marketplace_model · deletion/archive_model · historical_coverage · bulk/async_export/webhook/search_API/manual_portal_support · owner · version · status · certification_status. **Matrix(§84)**: | Provider | Store | Site·Channel | Tenant | Brand | Legal Entity | Merchant Account | Environment | Region | Status |
**Category(§6, 18종)**: COMMERCE_PLATFORM · MARKETPLACE_PLATFORM(=11번가/쿠팡/네이버/Amazon 채널) · ORDER_MANAGEMENT_SYSTEM(=OrderHub) · SUBSCRIPTION_PLATFORM(=Paddle) · BILLING_PLATFORM · PAYMENT_GATEWAY(=Toss) · PAYMENT_PROCESSOR · PAYMENT_ORCHESTRATOR · ACQUIRER · DIGITAL_WALLET · TAX_PLATFORM · INVOICE_PLATFORM(=Paddle) · FRAUD_PLATFORM · KYC_PLATFORM · SHIPPING/FULFILLMENT/RETURN_PLATFORM · OTHER. (현행 활성=Marketplace·OMS·Subscription(Paddle)·Payment Gateway(Toss). Acquirer/Wallet/Fraud/KYC=미사용→선언만.)

---

## 3. Store (§7-8) · Site (§9) · Channel (§10) · Merchant Account (§11-12)

**Store(§7)**: commerce_store_id · provider_id · provider_account_id · external_store_id · store_name · tenant/workspace/brand/legal_entity_id · site_ids · channel_ids · merchant_account_ids · subscription_account_ids · region · country · default/supported_currencies · environment · customer/order_namespace · status · version · last_verified_at. **상태(§8)**: ACTIVE/ACTIVE_WITH_WARNINGS/READ_ONLY/MIGRATING/SUSPENDED/CLOSED/ARCHIVED/TERMINATED/WRONG_MAPPING_RISK/UNVERIFIED/BLOCKED. **★Store≠Merchant Account(§3.1)**.
**Site(§9)**: site_id · store_id · external_site_id · domain · locale · country · currency · brand · environment · cookie/customer/checkout_namespace · consent_configuration · status · version.
**Channel(§10, 13종)**: WEB_STORE · MOBILE_APP · **MARKETPLACE**(현행 핵심) · SOCIAL_COMMERCE · LIVE_COMMERCE(208차 라이브커머스) · POS · CALL_CENTER · B2B_PORTAL · PARTNER_PORTAL · MANUAL_ORDER · API_ORDER · SUBSCRIPTION_CHANNEL · OTHER.
**Merchant Account(§11)**: merchant_account_id · payment_provider_id · provider_account_id · external_merchant_id · platform/connected_account_id · merchant_name · tenant/brand/store/legal_entity_id · environment · region · country · settlement/supported_currencies · payout_destination_reference · payment_method_types · credential_binding · **PCI_scope**(대부분 OUT_OF_SCOPE·MoR) · status · version. **상태(§12)**: ACTIVE/ACTIVE_WITH_WARNINGS/READ_ONLY/PARTIAL_ACCESS/ONBOARDING/SUSPENDED/CLOSED/TERMINATED/CREDENTIAL_EXPIRED/PERMISSION_INSUFFICIENT/WRONG_MAPPING_RISK/UNVERIFIED/BLOCKED.

---

## 4. Marketplace (§13·N/A) · Seller/Vendor (§14·N/A) · Subscription (§15) · Payment Account (§16) · Scope Hierarchy (§17)

**Marketplace Account(§13)·Seller/Vendor(§14)**: **★NOT_APPLICABLE** — GeniegoROI 는 구독사의 마켓플레이스(11번가 등) **주문을 집계**할 뿐 다면 마켓플레이스를 운영하지 않음. Buyer=channel_orders 구매자·구독사=판매자(외부 마켓 셀러). §3.7(Buyer/Seller 권리 혼합 금지)=향후 마켓플레이스 운영 시 강제. Buyer DSAR≠Seller 데이터 전체.
**Subscription Account(§15·=Paddle+app_user.plan)**: subscription_account_id · provider_id · provider_account_id · external_account_id(paddle_customer_id) · tenant/brand/store/merchant_account_ids/legal_entity_id · environment · region · currency_model · customer/subscription/invoice/payment_namespace · status · version. **★Subject=SaaS 구독사(app_user)**(구독사 e커머스 buyer 와 별개 도메인).
**Payment Account(§16·=Toss/Paddle)**: payment_account_id · provider_id · merchant_account_id · parent/connected/platform/external_account_id · tenant/brand/legal_entity_id · region · environment · object_scope · permission_scope · status · version.
**Scope Hierarchy(§17)**: Provider → Provider Account → Organization/Platform Account → Store/Marketplace → Site/Channel → Merchant/Seller/Vendor/Subscription Account → Commerce Object. 각 단계 Tenant/Brand/Legal Entity/Environment Binding 검증(상위 권한 하위 전체 DSAR Scope 자동확대 금지).

---

## 5. Commerce Identifier (§18-19) · Guest (§20-21) · Subject Role (§29-31)

**Commerce Customer Identity Mapping(§18, 18 Type)**: COMMERCE_CUSTOMER_ID · STORE_CUSTOMER_ID · MARKETPLACE_BUYER_ID(=channel_orders 구매자) · MARKETPLACE_SELLER_ID(N/A) · SUBSCRIPTION_CUSTOMER_ID(=paddle_customer_id) · PAYMENT_CUSTOMER_ID · BILLING_ACCOUNT_ID · ORDER_CUSTOMER_ID · CHECKOUT_CUSTOMER_ID · GUEST_CHECKOUT_ID · EMAIL(=buyer_email) · PHONE · ACCOUNT_ID(=app_user) · CRM_CONTACT_ID(=crm_customers) · CDP_PROFILE_ID · LOYALTY_MEMBER_ID · EXTERNAL_CUSTOMER_ID · WALLET_CUSTOMER_ID. **Schema(§19)**: mapping_id · provider/provider_account/store/merchant_account_id · identifier_type · external/canonical_identifier_type · normalization · account/store/brand/environment_binding · valid_from/to · shared/reuse_risk · confidence_requirement · search_priority · status · version.
**Guest(§20·=channel_orders 비회원 buyer)**: guest_customer_reference · checkout/order_id · email(buyer_email) · phone · billing/shipping_contact · device/cookie/session_id · site/channel · created_at · converted_customer_id · account_created_after_checkout 여부 · identity_confidence · shared_identifier_risk · evidence. **★Guest Email(§3.2)=Shared/Family/Corporate/Gift/Typo/Forwarding 가능 → 단독 Person 확정 금지**. **Guest-to-known(§21)**: guest_id · account_customer_id · conversion_time/source · linked_orders · identity_evidence · merge_confidence · conflict · rollback · audit.
**Subject Role(§29, 17종)**: ACCOUNT_OWNER · PURCHASER · BUYER · GUEST_BUYER · BILLING_CONTACT · SHIPPING_CONTACT · RECIPIENT · GIFT_RECIPIENT · PAYMENT_METHOD_HOLDER · SUBSCRIBER · SELLER(N/A) · VENDOR_CONTACT(N/A) · STORE_ADMIN · CORPORATE_BUYER · AUTHORIZED_USER · MARKETPLACE_OPERATOR_CONTACT(N/A) · UNKNOWN. **★원칙(§30·§3.3·3.6)**: 동일 Record 다중 Role — **Purchaser≠Recipient·Billing Contact≠Account Owner·Payment Method Holder≠Buyer** 자동 동일시 금지·각 Subject별 Field Scope 분리. **Address(§31)**: BILLING/SHIPPING/ACCOUNT/STORE_PICKUP/RETURN/SELLER/VENDOR/PAYMENT_VERIFICATION/TAX_ADDRESS — **Shipping Address 를 Purchaser 주소로 자동확정 금지**. **Matrix(§86)**: | Identifier | Provider | Account Binding | Store Binding | Merchant Binding | Shared Risk | Priority | Status |
**★Payment Customer ID ≠ Person ID(§3.4)**: Merchant/Region/Currency/Environment/Connected Account 종속 → Provider Account Binding 필수.
