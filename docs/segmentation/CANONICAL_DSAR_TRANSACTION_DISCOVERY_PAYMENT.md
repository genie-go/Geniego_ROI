# Canonical DSAR Transaction Discovery — Invoice/Receipt/Credit Note/Tax, Payment Intent/Auth/Capture/Charge/Transaction, Multiple Tender/Partial, Refund/Reversal, Dispute/Chargeback, Evidence, Relationship Graph & Candidate

> **EPIC 06-A Part 3-3-3-3-3-3-3-2** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `channel_orders`(buyer_paid/total_price·cancel)·`OrderHub`(refund/refunded·취소 역분개 268차)·`Pnl`·`Payment`(Toss·billing_key)·`BillingMethod`·`PgSettlement`·`Paddle`(MoR·paddle_subscriptions/events·**Dispute 전용**)·`CouponAdmin` · Part 3-3-3-3-3-3-3-1 PCI Classification/Token·Order-Payment Graph·Part 3-3-3-3-2 Verification Token.
> **★정직**: Dispute/Chargeback/Representment=`Paddle.php` 에만(MoR SaaS 청구)→**내부 마켓주문 Dispute/Chargeback 관리 NOT_APPLICABLE**. Payment Intent/Authorization/Capture 분해=Provider(Paddle/Toss/마켓) 소유·내부 미분해(channel_orders=buyer_paid 단일). PAN/CVV/Vault=NOT_APPLICABLE(billing_key 토큰).
> 형제: [`CANONICAL_DSAR_TRANSACTION_DISCOVERY_CUSTOMER_ORDER.md`](CANONICAL_DSAR_TRANSACTION_DISCOVERY_CUSTOMER_ORDER.md) · [`CANONICAL_DSAR_TRANSACTION_DISCOVERY_GOVERNANCE.md`](CANONICAL_DSAR_TRANSACTION_DISCOVERY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_COMMERCE_TRANSACTION_DISCOVERY.md`](../architecture/ADR_DSAR_COMMERCE_TRANSACTION_DISCOVERY.md)

---

## 1. Invoice (§28-30) · Receipt (§31) · Credit Note (§32) · Tax (§33)

**Invoice Candidate(§28·=Paddle SaaS 청구·마켓주문 invoice=마켓소유)**: invoice_id · provider/account_id · order_id · subscription_id(paddle) · invoice_number · customer_id · billing_contact · legal_entity · currency · subtotal · tax · total · paid/outstanding_amount · issued/due/paid/voided_at · status · payment/credit_note_references · document_reference · evidence. **상태(§29)**: DRAFT/OPEN/ISSUED/PARTIALLY_PAID/PAID/OVERDUE/VOID/UNCOLLECTIBLE/REFUNDED/CREDITED/ARCHIVED/DELETED. **Item(§30)**: invoice_item_id·invoice_id·order_item/subscription_item_reference·description_reference·quantity·unit_amount·tax·discount·period_from/to·seller_reference(N/A)·subject_relevance·evidence.
**Receipt(§31)**: receipt_id·payment/charge/order/invoice_id·recipient·issued_at·delivery_channel·document_reference·**masked_payment_metadata**·amount·currency·status·evidence.
**Credit Note(§32)**: credit_note_id·invoice/order/customer_id·issued_at·amount·currency·reason·item_references·refund_reference·status·evidence.
**Tax(§33)**: Tax Invoice·Calculation·Exemption·VAT/GST Reference·Tax Address·**Tax Identifier Tokenized Reference**·Jurisdiction·Rate·Amount·Provider·Retention·Legal Restriction·Evidence. **★전체 Tax Identifier(사업자/주민번호) Candidate 저장 금지**. (VAT 288차 해외광고비 제외 정합.)

---

## 2. Payment Lifecycle (§34-39) — 대부분 Provider 소유

**★현행 정직**: 마켓주문 결제=마켓플레이스/PG 소유(channel_orders=buyer_paid 단일값). SaaS 청구 결제 lifecycle=Paddle(MoR). Ad-spend=Toss(Payment.php·billing_key). Payment Intent/Authorization/Capture/Charge 분해는 **Provider 객체**(내부 미분해)→Provider Retrieval 로 취득·현행 미보유분=`PROVIDER_LIMITATION`.
**Payment Intent(§34-35)**: payment_intent_id·provider·merchant_account·payment_customer_id·order/invoice_id·amount·currency·status·payment_method_type·token_reference(billing_key)·created/confirmed/cancelled_at·authorization/capture/charge_references·risk_reference·evidence. 상태=CREATED/REQUIRES_*/PROCESSING/AUTHORIZED/PARTIALLY_CAPTURED/CAPTURED/SUCCEEDED/FAILED/CANCELLED/EXPIRED/REFUNDED/DISPUTED/UNKNOWN. **★Payment Intent ≠ Charge(§3.5)**.
**Authorization(§36)**: authorization_id·payment_intent_id·charge_id·merchant_account·payment_method_token_reference·amount·currency·authorized/expires_at·status·verification_summary·issuer_response_category·capture_status·reversal_reference·evidence. **★Issuer Raw Response/Secret 포함 금지**.
**Capture(§37)**: capture_id·authorization_id·payment_intent/charge_id·amount·currency·captured_at·status·partial 여부·sequence·settlement_reference(PgSettlement)·refund_references·evidence.
**Charge(§38)**: charge_id·provider·merchant_account·payment_customer_id·order/invoice/payment_intent_id·payment_method_token_reference·amount·currency·status·created/captured_at·refunded_amount·dispute_status·receipt_reference·balance_transaction_reference·evidence.
**Transaction(§39·=PgSettlement/Pnl ledger)**: transaction_id·transaction_type·provider·merchant_account·order/invoice_reference·payment/charge_reference·customer_reference·amount·currency·created/processed_at·settlement_date·status·fee_reference·payout_reference·reversal_reference·source_of_truth_status·evidence. **Matrix(§84)**: | Payment Intent | Authorization | Capture | Charge | Order | Invoice | Refund | Dispute | Merchant | Status |

---

## 3. Multiple Tender (§40) · Partial (§41) · Refund (§42-44) · Reversal (§45)

**Multiple Tender(§40)**: Card+Gift Card·Wallet+Card·Store Credit+Card·Loyalty+Payment·Multiple Card·Split Corporate·Marketplace Shared — 각 Tender Amount/Currency/Holder/Token Reference/Refund 배분. **Partial(§41)**: Partial Authorization/Capture·Multiple Capture·Incremental Authorization·Partial Settlement·Remaining Balance·Failed Residual.
**Refund Candidate(§42·=refund/refunded·OrderHub 역분개)**: refund_id·provider·merchant_account·**original_payment_intent·original_charge**·order/invoice_id·customer_reference·amount·currency·reason·requested/processed_at·status·full/partial·refunded_item_references·destination_summary·initiated_by·evidence. **상태(§43)**: REQUESTED/PENDING/PROCESSING/SUCCEEDED/PARTIALLY_SUCCEEDED/FAILED/CANCELLED/REVERSED/DISPUTED/UNKNOWN. **★Refund 원 Payment/Charge 연결 필수(§3.7)**·독립거래로만 관리 금지. **대상 관계(§44)**: Order-level/Item-level/Shipping/Tax Refund·Discount Adjustment·Store Credit·Gift Card Credit·Original Payment Method·**Alternate Refund Destination(강화검토)**.
**Reversal(§45)**: reversal_id·authorization/payment_reference·merchant_account·amount·currency·reason·reversed_at·status·settlement_impact·evidence.

---

## 4. Dispute (§46-47) · Chargeback (§48) · Representment (§49) · Evidence (§50) — 내부 N/A(Paddle MoR)

**★NOT_APPLICABLE(§실측)**: Dispute/Chargeback/Representment=`Paddle.php`(MoR SaaS 청구)만·**내부 마켓주문 Dispute/Chargeback 관리 부재**. Paddle(SaaS)·마켓플레이스(buyer 분쟁)가 소유 → Provider Retrieval 로만 취득. 향후 자체 PG 분쟁관리 시 활성화.
**Dispute(§46-47)**: dispute_id·provider·merchant_account·charge/payment/order_id·customer_reference·amount·currency·reason_category·opened_at·due_date·status·evidence_submission_status·resolution·resolved_at·chargeback_reference·evidence_references·**third_party_risk·security_review**·evidence. 상태=WARNING/NEEDS_RESPONSE/UNDER_REVIEW/EVIDENCE_SUBMITTED/WON/LOST/ACCEPTED/WITHDRAWN/EXPIRED/CLOSED/UNKNOWN.
**Chargeback(§48)**: chargeback_id·dispute/charge/order_id·payment_customer·merchant_account·amount·currency·reason·initiated/posted_at·status·fee·recovery_amount·representment_reference·final_decision·evidence.
**Representment(§49)**: representment_id·dispute/chargeback_id·submitted_at/by·evidence_types·document_references·delivery_proof_reference·communication_reference·result·resolved_at·retention·review_status·evidence.
**Evidence Reference(§50)**: PAYMENT_CONFIRMATION·AUTHORIZATION_RESULT·DELIVERY_PROOF·SHIPPING_TRACKING·CUSTOMER_COMMUNICATION·REFUND_CONFIRMATION·DEVICE/IP_RISK_REFERENCE·SIGNATURE_REFERENCE·ORDER_RECEIPT·INVOICE·TERMS_ACCEPTANCE·DISPUTE_DOCUMENT·OTHER. **★원문 아닌 안전 Reference/Classification 우선·Chargeback Evidence 자동공개 금지(§3.8·Security/Legal/Third-party Review)**.

---

## 5. Relationship Graph (§51-52) · Candidate (§53-55)

**Relationship(§51)**: relationship_id·source/target_object_type·source/target_object_id·relationship_type·provider_account·store·merchant_account·amount_allocation·currency·valid_from/to·confidence·source·evidence. **Type(§52, 20종)**: CUSTOMER_TO_CART(N/A)·CART_TO_CHECKOUT(N/A)·CHECKOUT_TO_ORDER(N/A)·CUSTOMER_TO_ORDER·ORDER_TO_ITEM(GAP)·ORDER_TO_INVOICE·ORDER_TO_PAYMENT·PAYMENT_TO_AUTHORIZATION·AUTHORIZATION_TO_CAPTURE·PAYMENT_TO_CHARGE·CHARGE_TO_REFUND·CHARGE_TO_DISPUTE(N/A)·DISPUTE_TO_CHARGEBACK(N/A)·CHARGEBACK_TO_REPRESENTMENT(N/A)·INVOICE_TO_CREDIT_NOTE·ORDER_TO_RECEIPT·ORDER_TO_TAX_RECORD·PAYMENT_TO_TRANSACTION·TRANSACTION_TO_SETTLEMENT·PAYMENT_TO_PAYMENT_METHOD_TOKEN(billing_key).
**Candidate Match 상태(§53)**: EXACT_CUSTOMER/ORDER/PAYMENT_ID_MATCH·STRONG_RELATIONSHIP·VERIFIED_CONTACT·GUEST_CONVERSION·PARTIAL·SHARED_IDENTIFIER·MULTIPLE_CUSTOMER_MATCH·**CONTACT_ROLE_ONLY**·WRONG_SUBJECT/STORE/MERCHANT·CROSS_TENANT·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED. **Inclusion(§54)**: Verified Subject·Subject Role·Store/Brand·Merchant/Provider Account·Customer/Guest ID·Order/Payment Relationship·Date Range·Currency·Shared Identifier Risk·Gift/Corporate·Third-party Contact·Payment Method Holder·Provider/Internal Consistency. **★Amount/Date 만으로 Payment 귀속 금지(§3.6)**.
**Free-text/Document Review(§55·자동 Export 금지)**: Order Note·Gift Message·Delivery Instruction·Invoice Memo·Dispute Narrative·Chargeback Evidence·Support Comment·Internal Fraud Note·Seller Message·Manual Adjustment Reason.
