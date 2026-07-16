# Canonical DSAR Transaction Discovery — Customer/Guest/Alias, Address/Contact Role, Cart/Checkout/Quote & Order/Item/Adjustment/History/Note

> **EPIC 06-A Part 3-3-3-3-3-3-3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `channel_orders`(마켓주문 동기화·**buyer_email/buyer_name**·shipping·**product_name/sku/qty/total_price/cancel** — 주문 1행에 상품 flatten)·`OrderHub`(집계·취소 역분개 268차·refund/refunded)·`Omnichannel`·`Pnl`·`CouponAdmin`/`CouponRedeem`·crm_customers(Customer) · Part 3-3-3-3-3-3-3-1 Commerce Foundation(Subject Role/Store/Merchant/Identifier)·Part 3-3-3-3-3-3-2 CRM/CDP·Part 3-3-3-3-2 Verification Token·EPIC05 Merge.
> **★정직(§실측·핵심)**: **① Cart/Checkout/Abandoned Cart/Checkout Session/Quote = NOT_APPLICABLE**(grep 0 — 마켓플레이스(11번가/쿠팡/네이버)가 구매전 퍼널 소유·GeniegoROI 는 **완료주문만** 동기화). **② Order Item(다품목) = KNOWN GAP**(channel_orders 는 product_name/sku/qty 를 주문행에 flatten·288차 "OrderItem 다품목 유실" 확정·별도 line-item 스토어 부재). 지어내기 금지.
> 형제: [`CANONICAL_DSAR_TRANSACTION_DISCOVERY_PAYMENT.md`](CANONICAL_DSAR_TRANSACTION_DISCOVERY_PAYMENT.md) · [`CANONICAL_DSAR_TRANSACTION_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_TRANSACTION_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_COMMERCE_TRANSACTION_DISCOVERY.md`](../architecture/ADR_DSAR_COMMERCE_TRANSACTION_DISCOVERY.md)

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `channel_orders`(buyer·shipping·product_name/sku/qty·cancel) | Order Candidate·Subject Role·Status·Deleted 형식화 |
| product_name/sku/qty 를 주문행에 flatten(**다품목 유실**) | Order Item Candidate 신설 → **현행 KNOWN GAP 명시**(ORDER_ITEM_UNSEARCHED·별도 스토어 부재) |
| `OrderHub`/`Pnl`(취소 역분개 268차·refund/refunded) | Order Status History·Refund Relationship·Reconciliation |
| crm_customers(Customer)·channel buyer | Commerce Customer/Guest Candidate·Alias(EPIC05 Merge) |
| `CouponAdmin`/`CouponRedeem` | Order Adjustment(COUPON/LOYALTY) |
| **Cart/Checkout/Abandoned Cart/Quote** | **NOT_APPLICABLE**(마켓 구매전 퍼널·완료주문만 동기화·지어내기 금지) |
| Customer↔Order 관계·Contact Role·Guest Identity·Order Item·Status History·Note Governance·Candidate/Coverage/Gap 부재 | 신설 |

**무후퇴**: channel_orders/OrderHub/Omnichannel/Pnl/Coupon·crm_customers 는 **정본 — 재구현 금지, Canonical Transaction Discovery 아래 통합**. Customer/Order/Payment별 독립 Candidate Store 신설 금지(§89).

---

## 1. Transaction Discovery Entity Model (§4)

Entity: `COMMERCE_CUSTOMER_CANDIDATE` · `COMMERCE_GUEST_CUSTOMER_CANDIDATE` · `COMMERCE_CUSTOMER_ALIAS` · `COMMERCE_ADDRESS_CANDIDATE` · `COMMERCE_CONTACT_ROLE_CANDIDATE` · `CART_CANDIDATE`(N/A) · `CART_ITEM_CANDIDATE`(N/A) · `CHECKOUT_CANDIDATE`(N/A) · `CHECKOUT_SESSION_CANDIDATE`(N/A) · `QUOTE_CANDIDATE`(N/A) · `ORDER_CANDIDATE` · `ORDER_ITEM_CANDIDATE`(GAP) · `ORDER_ADJUSTMENT_CANDIDATE` · `ORDER_STATUS_HISTORY_CANDIDATE` · `ORDER_NOTE_CANDIDATE` · `INVOICE_CANDIDATE` · `INVOICE_ITEM_CANDIDATE` · `RECEIPT_CANDIDATE` · `CREDIT_NOTE_CANDIDATE` · `TAX_RECORD_CANDIDATE` · `PAYMENT_INTENT_CANDIDATE` · `PAYMENT_AUTHORIZATION_CANDIDATE` · `PAYMENT_CAPTURE_CANDIDATE` · `PAYMENT_CHARGE_CANDIDATE` · `PAYMENT_TRANSACTION_CANDIDATE` · `PAYMENT_REFUND_CANDIDATE` · `PAYMENT_REVERSAL_CANDIDATE` · `PAYMENT_DISPUTE_CANDIDATE`(N/A) · `PAYMENT_CHARGEBACK_CANDIDATE`(N/A) · `PAYMENT_REPRESENTMENT_CANDIDATE`(N/A) · `PAYMENT_EVIDENCE_REFERENCE` · `TRANSACTION_RELATIONSHIP` · `TRANSACTION_DUPLICATE_GROUP` · `TRANSACTION_RECONCILIATION` · `TRANSACTION_COVERAGE_RESULT` · `TRANSACTION_DISCOVERY_GAP` · `TRANSACTION_DISCOVERY_EVIDENCE` · `TRANSACTION_AUDIT_EVENT`.

---

## 2. Commerce Customer (§5-8) · Guest (§9-10)

**Customer Candidate(§5·=crm_customers/channel buyer)**: candidate_id · provider/provider_account/store_id · customer_external_id · account_id · canonical_person_candidate · CRM_contact/CDP_profile_reference · email/phone/address_references · created/updated_at · status · deleted_state · merge_state · alias_ids · order_count · subscription_reference · consent/suppression_reference · tenant/brand_match · identity_confidence · evidence. **상태(§6)**: ACTIVE/INACTIVE/GUEST/PROSPECT/SUSPENDED/CLOSED/ARCHIVED/SOFT_DELETED/HARD_DELETED/ANONYMIZED/MERGED/DUPLICATE/BLOCKED/UNKNOWN. **검색순서(§7)**: ①Exact Commerce Customer ID ②Store-bound External ID ③CRM/CDP Mapping ④Verified Email(buyer_email) ⑤Verified Phone ⑥Account Relationship ⑦Order Relationship ⑧Payment Customer Relationship ⑨Alias/Merged ID ⑩Deleted Customer ⑪Manual Review. **Alias/Merge(§8·=EPIC05 crm_identity_merge_link)**: winning/losing_customer_id · alias_ids · merge_time/reason · migrated_orders/addresses/subscriptions · consent/suppression_conflict · payment_customer_mappings · rollback_status · evidence.
**Guest(§9·=channel_orders 비회원 buyer)**: guest_candidate_id · store/site_id · channel · guest_reference · cart_id(N/A) · checkout_id(N/A) · order_ids · email(buyer_email) · phone · device/session_reference · billing/shipping_contact · created_at · last_seen · converted_customer_id · identity_confidence · shared_identifier_risk · status · evidence. **Match 상태(§10)**: EXACT_GUEST_REFERENCE/STRONG_RELATIONSHIP/VERIFIED_IDENTIFIER/PARTIAL/SHARED_IDENTIFIER/MULTIPLE_CUSTOMER/CONVERSION_MATCH·**WRONG_SUBJECT_RISK**/MANUAL_REVIEW/BLOCKED. **★Guest Order 를 Email 만으로 자동귀속 금지(§3.2)** — Order/Checkout/Guest Ref/Verified Email/Phone/Device/Billing/Shipping/Payment Customer/Conversion/Date/Store/Shared Risk 종합.

---

## 3. Address (§11) · Contact Role (§12)

**Address Candidate(§11)**: address_candidate_id · source_object · source_record_id · address_type · associated_subject_role · customer/order/invoice_id · provider_account · store · valid_from/to · normalized_components · country · verification_status · **shared_household_risk · third_party_risk** · inclusion_status · evidence. **★주소 전체값 최소화·마스킹**. (현행 channel_orders shipping_address.)
**Contact Role(§12, 13종)**: ACCOUNT_OWNER · PURCHASER · BILLING_CONTACT · SHIPPING_CONTACT · RECIPIENT · GIFT_RECIPIENT · INVOICE_CONTACT · PAYMENT_METHOD_HOLDER · CORPORATE_BUYER · AUTHORIZED_BUYER · ORDER_CREATOR · ORDER_APPROVER · UNKNOWN. **★Customer Account ≠ 주문 Contact(§3.1)**·역할별 Field Scope 분리.

---

## 4. Cart (§13-16) · Checkout (§17-19) · Quote (§20) — 대부분 N/A

**★NOT_APPLICABLE(§실측)**: GeniegoROI 는 마켓플레이스(11번가/쿠팡/네이버) **완료주문만 동기화** — Cart/Cart Item/Abandoned Cart/Checkout/Checkout Session/Quote 스토어 부재(grep 0). 구매전 퍼널=마켓플레이스 소유. Cart 상태(§14 ACTIVE/ABANDONED/CONVERTED…)·Checkout 상태(§18)·Checkout Session Security(§19 Token 원문 저장 금지)·Abandoned Cart(§16 recovery/consent)=**향후 자체 스토어/픽셀(280차 CAPI cart event) 도입 시 활성화 계약**. 현행 Coverage=`PROVIDER_LIMITATION`(마켓 소유·GeniegoROI 미보유) 명시(NO_DATA 아님).

---

## 5. Order (§21-23) · Order Item (§24·GAP) · Adjustment (§25) · Status History (§26) · Note (§27)

**Order Candidate(§21·=channel_orders)**: order_candidate_id · provider/provider_account/store_id · site/channel · order_external_id · order_number(channel_order_id) · customer_id · guest_id · **subject_roles** · billing/shipping/invoice_contact_reference · currency · subtotal · discounts · tax · shipping_amount · total_amount(total_price) · order_status · payment_status(buyer_paid) · fulfillment_status · return_status · created/updated/cancelled/archived/deleted_at · invoice/payment/refund/shipment/return_references · match_confidence · evidence. **상태(§22)**: DRAFT/PENDING/AWAITING_PAYMENT/CONFIRMED/PROCESSING/PARTIALLY_FULFILLED/FULFILLED/COMPLETED/ON_HOLD/CANCELLED/PARTIALLY_REFUNDED/REFUNDED/PARTIALLY_RETURNED/RETURNED/ARCHIVED/SOFT_DELETED/HARD_DELETED/FRAUD_BLOCKED/UNKNOWN. **Match(§23)**: Exact Order ID·Store·Customer ID·Guest Ref·Purchaser·Verified Contact·Payment Customer·Invoice Contact·Date·Currency·Tenant/Brand·Gift/Recipient·Corporate 종합. **★Order Header 만 검색 완료선언 금지(§3.4)**. **Matrix(§83)**: | Customer·Guest | Store | Subject Role | Cart | Checkout | Order | Invoice | Payment | Identity Confidence | Status |
**Order Item(§24)**: **★KNOWN GAP** — channel_orders 는 product_name/sku/qty 를 주문행에 flatten(다품목 유실 288차). Candidate=order_item_id·order_id·product/variant_reference·seller/vendor_reference(N/A)·quantity·unit_price·currency·tax·discount·personalization·gift_message·fulfillment/return_status·refunded_quantity·shipment_reference·subject_relevance·evidence. **현행 다품목 미보유 → `ORDER_ITEM_UNSEARCHED` Gap 명시**. Product Catalog 상세=별도 Source Reference(과다복제 금지).
**Adjustment(§25, 12종·=Coupon)**: DISCOUNT/COUPON(coupon*)/PROMOTION/SHIPPING/TAX/MANUAL_ADJUSTMENT/LOYALTY_REDEMPTION/STORE_CREDIT/REFUND_ADJUSTMENT/FEE/COMMISSION/OTHER — 개인화 Coupon/Loyalty ID 개인데이터 분류.
**Status History(§26·=OrderHub 취소 역분개)**: history_id·order_id·previous/current_status·changed_at/by·source_system·reason·customer_notification·payment/fulfillment_impact·evidence.
**Note(§27, 8종)**: CUSTOMER_NOTE·GIFT_MESSAGE·DELIVERY_INSTRUCTION·INTERNAL_NOTE·FRAUD_NOTE·SUPPORT_NOTE·SELLER_NOTE·WAREHOUSE_NOTE → **Free-text Classification·Third-party/Security/Privilege/Sensitive Review·Redaction·Export Eligibility·Evidence**. **★Order Note 자동 Export 금지**.
