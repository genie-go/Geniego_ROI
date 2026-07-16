# Canonical DSAR Transaction Discovery Governance — Dedup/Reconciliation, Coverage/Gap, Evidence/Explain, Permission, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-3-2** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): channel_orders·OrderHub(취소 역분개 268차·정산 zero-out 288차)·Pnl·Payment(Toss)·Paddle(MoR)·PgSettlement·Coupon·SecurityAudit · Part 3-3-3-3-3-3-3-1 Foundation Reconciliation/Coverage/Gap · Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_TRANSACTION_DISCOVERY_CUSTOMER_ORDER.md`](CANONICAL_DSAR_TRANSACTION_DISCOVERY_CUSTOMER_ORDER.md) · [`CANONICAL_DSAR_TRANSACTION_DISCOVERY_PAYMENT.md`](CANONICAL_DSAR_TRANSACTION_DISCOVERY_PAYMENT.md) · ADR=[`../architecture/ADR_DSAR_COMMERCE_TRANSACTION_DISCOVERY.md`](../architecture/ADR_DSAR_COMMERCE_TRANSACTION_DISCOVERY.md)

---

## 1. Dedup (§56-57) · Reconciliation (§58-59)

**Cross-system Dedup(§56)**: Commerce Provider Order·Internal OMS Order(OrderHub)·ERP Sales Order·Warehouse Order Copy(WMS)·Invoice Platform Invoice(Paddle)·Payment Provider Charge·Internal Payment Transaction(PgSettlement)·Accounting Payment Entry(Pnl)·Refund Provider Record·Internal Refund·Dispute Provider Record(Paddle·N/A)·Webhook Event(paddle_events)·Export Snapshot. **Key(§57)**: Provider Object ID·Store-bound Order ID·Order Number+Store·Invoice Number+Legal Entity·Payment ID+Merchant Account·Charge/Authorization/Capture/Refund/Dispute/Chargeback ID·Content Hash·Version·Webhook Event ID·Source Lineage.
**Reconciliation(§58)**: Commerce Customer vs CRM/CDP·Guest vs Converted Account·Cart/Checkout vs Order(N/A)·Order vs OMS·Order vs ERP·**Order Total vs Invoice Total·Order Payment Status vs Payment Provider·Internal Payment vs Provider Charge**·Refund vs Credit Note·Dispute vs Chargeback(N/A)·**Cancelled Order vs Captured Payment·Refunded Order vs Outstanding Invoice**·Deleted Customer vs Active Order Contact·Archived Order vs Warehouse Copy. **상태(§59)**: MATCH/CUSTOMER/GUEST_CONVERSION/CART_ORDER/CHECKOUT_ORDER/ORDER_STATUS/ORDER_AMOUNT/INVOICE_AMOUNT/PAYMENT_STATUS/PAYMENT_AMOUNT/REFUND/DISPUTE/CHARGEBACK/DELETION/ARCHIVE_MISMATCH·MANUAL_REVIEW/BLOCKED. (288차 정산 zero-out·268차 취소 역분개 정합.)

---

## 2. Coverage (§60) · Gap (§61-62)

**Coverage Dimension(§60, 28종)**: Customer·Guest·Alias/Merge·Address·Contact Role·Cart(N/A)·Abandoned Cart(N/A)·Checkout(N/A)·Quote(N/A)·Order·**Order Item(GAP)**·Adjustment·Status History·Invoice·Receipt·Credit Note·Tax·Payment Intent·Authorization·Capture·Charge·Transaction·Refund·Reversal·Dispute(N/A)·Chargeback(N/A)·Evidence·Deleted/Archived Coverage. **Matrix(§85)**: | Request | Customer | Guest | Cart | Checkout | Order | Invoice | Payment | Refund | Dispute | Archived | Overall |
**Gap Type(§61, 25종)**: CUSTOMER_SEARCH_INCOMPLETE·GUEST_IDENTITY_UNRESOLVED·CUSTOMER_ALIAS_HISTORY_MISSING·CONTACT_ROLE_UNMAPPED·CART/ABANDONED_CART/CHECKOUT_UNSEARCHABLE(N/A=PROVIDER_LIMITATION)·**ORDER_ITEM_UNSEARCHED(현행 다품목 유실)**·ORDER_STATUS_HISTORY_MISSING·ORDER_NOTE_UNCLASSIFIED·INVOICE/CREDIT_NOTE_UNSEARCHABLE·TAX_RECORD_UNMAPPED·PAYMENT_INTENT_UNSEARCHED·AUTHORIZATION/CAPTURE_HISTORY_MISSING·PAYMENT_TRANSACTION_MISSING·REFUND_RELATIONSHIP_MISSING·REVERSAL_UNSEARCHED·DISPUTE/CHARGEBACK_UNSEARCHABLE(N/A)·REPRESENTMENT_EVIDENCE_UNMAPPED·DELETED_CUSTOMER/ARCHIVED_ORDER_UNSEARCHABLE·PROVIDER_INTERNAL_TRANSACTION_DRIFT. **★Critical(§62)**: Guest Email 만으로 여러 고객 주문 포함·**Purchaser/Recipient 미구분**·Order Item 미검색(다품목)·Payment-Order 관계 누락·**Captured Payment 내부 Order 부재·Refund 원 Charge 미연결**·Chargeback Evidence PCI Secret·Deleted Customer/Archived Order 검색불가·Wrong Merchant Payment·Provider/Internal Payment 불일치·Full Raw Payment Response Candidate 저장.

---

## 3. Evidence (§63) · Explain (§64) · Permission (§65)

**Evidence(§63)**: request/task_id·provider/provider_account/store/merchant_account_id·object_type·endpoint/query_template·API_version·scope/identifier_version·subject_role·date_range·status_filters·deleted/archived_inclusion·**PCI_exclusion_profile**·pagination_status·async_job_id·result/candidate/excluded/duplicate/relationship_count·error·started/completed_at·result_hash·audit_reference.
**Explain(§64)**: 어떤 Customer/Guest·Cart/Checkout(N/A)·Order/Item·Subject Contact Role·Invoice/Receipt/Credit Note·Payment/Authorization/Capture·Refund/Reversal/Dispute(N/A)/Chargeback(N/A)·Payment Credential 최소화·Free-text/Evidence Review·Provider/Internal 중복제거·남은 Gap 설명.
**Permission(§65, 21종)**: VIEW_COMMERCE_CUSTOMER_DISCOVERY·RUN_GUEST_CUSTOMER/CART/CHECKOUT/ORDER/ORDER_HISTORY/INVOICE/PAYMENT_INTENT/PAYMENT_CHARGE/REFUND/DISPUTE/CHARGEBACK_DISCOVERY·VIEW_PAYMENT_EVIDENCE_REFERENCE·**REVIEW_ORDER_FREE_TEXT·REVIEW_DISPUTE_EVIDENCE**·RUN_TRANSACTION_RECONCILIATION·VIEW_TRANSACTION_COVERAGE·MANAGE_TRANSACTION_GAP·VIEW_TRANSACTION_EVIDENCE·VIEW_TRANSACTION_AUDIT·ADMIN_TRANSACTION_DISCOVERY_OVERRIDE. **★Vault Detokenization/Full Payment Credential 조회 권한 미포함**.

---

## 4. Static Lint (§66) & Runtime Guard (§67)

**Static Lint(§66)**: **Customer Account만 검색하고 Guest 누락** · Guest Email 직접 Person 확정 · Purchaser/Recipient 미구분 · Cart/Checkout 누락(N/A 시 스킵) · **Order Header만 검색 · Order Item 누락(다품목)** · Order Status History 누락 · **Order Note 자동 Export** · Invoice/Credit Note 누락 · **Payment Intent와 Charge 혼용** · Authorization/Capture 누락 · Order-Payment 관계 누락 · **Refund 원 Charge 관계 누락** · Dispute/Chargeback 누락(N/A) · Payment Evidence Raw Payload 저장 · **Full PAN/CVV 저장** · Merchant Account Binding 누락 · Pagination 미완료 · Archived/Deleted 검색 누락 · Internal Copy만으로 Complete · Evidence 누락.
**Runtime Guard(§67)**: Invalid Verification Token · Wrong Store/Merchant · Cross-Tenant Customer · Guest Identity 미검증 · Shared Email Broad · Contact Role 미해결 · **Gift Recipient→Purchaser 자동확정 · Payment Method Holder→Buyer 자동확정** · Order-Payment Relationship 미검증 · **PCI Prohibited Field · Raw Payment Secret 조회 · Dispute Evidence 무승인 조회** · Scope 초과 Bulk Export · Pagination 미완료 Complete · Critical Schema Drift · Request Closed/Withdrawn · **Kill Switch**.

---

## 5. Error (§68) · Warning (§69)

**Error(§68, 27종)**: COMMERCE_CUSTOMER_NOT_FOUND·CUSTOMER_ALIAS_UNRESOLVED·GUEST_CUSTOMER_IDENTITY_UNRESOLVED·CONTACT_ROLE_UNRESOLVED·CART/CHECKOUT/ORDER_DISCOVERY_FAILED(N/A)·ORDER_ITEM_DISCOVERY_INCOMPLETE·ORDER_STATUS_HISTORY_UNAVAILABLE·ORDER_NOTE_REVIEW_REQUIRED·INVOICE/CREDIT_NOTE_DISCOVERY_FAILED·TAX_RECORD_MAPPING_MISSING·PAYMENT_INTENT_DISCOVERY_FAILED·PAYMENT_AUTHORIZATION/CAPTURE_HISTORY_MISSING·PAYMENT_CHARGE/TRANSACTION_NOT_FOUND·REFUND_RELATIONSHIP_UNRESOLVED·REVERSAL/DISPUTE/CHARGEBACK_DISCOVERY_FAILED·PAYMENT_EVIDENCE_REVIEW_REQUIRED·TRANSACTION_RECONCILIATION_FAILED·COVERAGE_INCOMPLETE·CRITICAL_GAP·RUNTIME_BLOCKED.
**Warning(§69, 17종)**: COMMERCE_MULTIPLE_CUSTOMER_MATCH·GUEST_SHARED_IDENTIFIER·CONTACT_ROLE_CONFLICT·ABANDONED_CART_COVERAGE(N/A)·CHECKOUT_PARTIAL(N/A)·ORDER_ARCHIVE·ORDER_NOTE_SENSITIVE·INVOICE_HISTORY·PAYMENT_MULTIPLE_TENDER·PAYMENT_PARTIAL_CAPTURE·REFUND_PARTIAL·REFUND_DESTINATION·DISPUTE_EVIDENCE(N/A)·CHARGEBACK_HISTORY(N/A)·PROVIDER_INTERNAL_TRANSACTION_DRIFT·MANUAL_REVIEW_REQUIRED·SLA_RISK.

---

## 6. Golden (§70) · Conformance (§71) · Equivalence (§72-73)

**Golden(§70·70+ 시나리오·N/A 표기)**: Active/Deleted Commerce Customer·Merged Alias·Guest Exact/Verified Email/Shared Email·Guest-to-known Conversion·Account Owner·Purchaser=Recipient/Purchaser≠Recipient·Billing≠Shipping·Gift Recipient·Payment Method Holder≠Buyer·(Cart/Checkout/Quote=N/A PROVIDER_LIMITATION)·Active/Cancelled/Archived/Soft-deleted Order·**Multiple Order Items(다품목 GAP)**·Order Discount·Loyalty Redemption·Order Status History·Customer Note/Gift Message/Internal Fraud Note·Invoice Open/Paid/Void·Receipt·Credit Note·Tax Record·Payment Intent Pending/Succeeded·Authorization·Reversal·Partial/Multiple Capture·Charge·Multiple Tender·Partial Payment·Full/Partial/Item-level Refund·Alternate Refund Destination·Reversal·(Dispute/Chargeback/Representment/Evidence=N/A Paddle MoR)·PCI Secret 차단·Wrong Store/Merchant/Cross-Tenant 차단·Pagination 완료/미완료 차단·Provider·OMS Order Duplicate·Provider·Internal Payment Duplicate·Order·Invoice Amount Mismatch·Order·Payment Status Mismatch·Refund·Credit Note Mismatch·Coverage Complete/Critical Gap·Override 허용/금지.
**Conformance(§71)**: Customer·Guest·Cart(N/A)·Checkout(N/A)·Quote(N/A)·Order·Order Item·Invoice·Receipt·Credit Note·Payment Intent·Authorization·Capture·Charge·Transaction·Refund·Reversal·Dispute(N/A)·Chargeback(N/A)·Representment(N/A) 에 동일 Contract(Account Scope·Subject Role·Identifier·Relationship·Status·Deleted/Archived·Candidate·PCI Minimization·Deduplication·Reconciliation·Coverage·Evidence·Audit).
**Equivalence(§72)**: 기존 Order Search(channel_orders/OrderHub)·Payment Lookup(Payment/Paddle)·Refund(OrderHub) 와 비교(Customer/Guest/Cart(N/A)/Checkout(N/A)/Order/Order Item/Invoice/Payment/Authorization/Capture/Refund/Dispute(N/A)/Chargeback(N/A) Count·Subject Role·Archived/Deleted·Provider/Internal Match·Error·Warning·Latency·Audit). **Difference(§73)**: MATCH·EXPECTED_{CUSTOMER/GUEST/ROLE/CART_CHECKOUT/ORDER_ITEM/INVOICE/PAYMENT_RELATIONSHIP/REFUND/DISPUTE/PCI_MINIMIZATION/ARCHIVE}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_PCI_DEFECT·LEGACY_DISCOVERY_GAP·LEGACY_WRONG_ORDER_RISK**·CANONICAL_TRANSACTION_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_PCI_DEFECT`·`LEGACY_WRONG_ORDER_RISK`·고객영향 `LEGACY_DISCOVERY_GAP`=운영전환 차단**.

---

## 7. Observability (§74) · Alert (§75) · Audit (§76)

**Metrics(§74)**: Customer/Guest/Alias/Contact Role Conflict·Cart(N/A)/Abandoned Cart(N/A)/Checkout(N/A)·Order/Order Item/Archived/Deleted Order·Invoice/Credit Note·Payment Intent/Authorization/Capture/Charge/Transaction·Refund/Reversal·Dispute(N/A)/Chargeback(N/A)/Representment(N/A)·**PCI Block·Wrong Store/Merchant Block**·Duplicate Group·Reconciliation Mismatch·Coverage Gap·Legacy Usage·P50/P95/P99.
**Alert(§75)**: Guest 자동 Person Match·Contact Role Conflict 급증·**Order Item Coverage 급감(다품목)**·Order Status History 누락·Archived Order 검색실패·Authorization/Capture 누락·Order-Payment Relationship 오류·**Refund 원 Charge Mapping 누락·Chargeback Evidence PCI(N/A)**·Wrong Merchant Payment·Provider/Internal Payment Drift·**Cancelled Order Captured Payment·Refunded Order Outstanding Invoice**·Dispute Search 장애(N/A)·Critical Gap·Legacy 신규사용·Evidence 누락.
**Audit Event(§76, 29종)**: COMMERCE_CUSTOMER/GUEST_CUSTOMER_DISCOVERED·CUSTOMER_ALIAS_LINKED·CONTACT_ROLE_RESOLVED·CART/ABANDONED_CART/CHECKOUT/QUOTE_DISCOVERED(N/A)·ORDER/ORDER_ITEM/ORDER_STATUS_HISTORY_DISCOVERED·ORDER_NOTE_REVIEW_REQUESTED·INVOICE/RECEIPT/CREDIT_NOTE/TAX_RECORD_DISCOVERED·PAYMENT_INTENT/AUTHORIZATION/CAPTURE/CHARGE/TRANSACTION/REFUND/REVERSAL/DISPUTE(N/A)/CHARGEBACK(N/A)/REPRESENTMENT(N/A)_DISCOVERED·DUPLICATE_GROUPED·RECONCILIATION_COMPLETED·GAP_DETECTED·RUNTIME_BLOCKED (SecurityAudit·paddle_audit_log 확장).

---

## 8. Existing Impl Classification (§77) · Duplicate Audit (§78) · Regression Gate (§79)

**분류(§77)**: 실측 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `channel_orders`(주문·buyer·product/sku/qty flatten·cancel) | `MIGRATION_REQUIRED` → `CANONICAL_ORDER_DISCOVERY_ADAPTER` | Order Candidate·Subject Role·**Order Item(다품목 GAP)** |
| `OrderHub`/`Pnl`(취소 역분개·refund/refunded) | `CONSOLIDATION_REQUIRED` → Order Status History/Refund Relationship/Reconciliation | 268차·288차 정합 |
| crm_customers(Customer)·crm_identity_merge_link(Alias) | `LEGACY_ADAPTER` → Customer/Alias Adapter | EPIC05 Merge |
| `Payment`(Toss·billing_key)/`PgSettlement`/`BillingMethod` | `LEGACY_ADAPTER` → Payment Intent/Charge/Transaction(Provider) | billing_key Token·PAN 없음 |
| `Paddle`(MoR·paddle_events·Dispute) | `LEGACY_ADAPTER` → Invoice/Payment(SaaS)·Dispute(Provider) | MoR |
| `CouponAdmin`/`CouponRedeem` | `VALIDATED_LEGACY` → Order Adjustment | TOCTOU 288차 |
| **Cart/Checkout/Abandoned Cart/Quote** | `UNVERIFIED`(NOT_APPLICABLE) | **마켓 구매전 퍼널·완료주문만 동기화·지어내기 금지** |
| **내부 Dispute/Chargeback/Representment 관리** | `UNVERIFIED`(NOT_APPLICABLE) | **Paddle MoR/마켓 소유·내부 부재** |
| Order Item(다품목)·Contact Role·Guest Identity·Transaction Graph·Candidate/Coverage/Gap 부재 | 신설 | 현행 부재/GAP |
**Duplicate Audit(§78)**: 실측 — Order=`channel_orders`/`OrderHub` 단일 SoT·Refund=`refund`/`refunded` 단일·Payment=Toss+Paddle 도메인분리(중복 아님)·Coupon=`coupon*` 단일. **중복 Order/Payment/Refund Search·Candidate Store 신설 위험만 차단**(§89 Object별 독립 Registry 금지).
**Regression Gate(§79)**: 변경 전후 Customer/Guest/Alias/Cart(N/A)/Checkout(N/A)/Order/Order Item/Status History/Invoice/Receipt/Credit Note/Payment Intent/Authorization/Capture/Charge/Transaction/Refund/Reversal/Dispute(N/A)/Chargeback(N/A)·Archived/Deleted·Payment Masking·Dedup·Reconciliation·Coverage·Explain·Audit·**Existing API Compatibility**(channel_orders/OrderHub/Payment/Paddle/Coupon 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 9. 완료 상태 요약

Transaction Entity 37 · Customer(14상태)/Guest(10)/Alias(EPIC05)·Address/Contact Role 13 · **Cart/Checkout/Abandoned/Quote=NOT_APPLICABLE(마켓 소유)** · Order(19상태)/**Order Item=KNOWN GAP(다품목 유실)**/Adjustment 12/Status History/Note 8 · Invoice 12상태/Receipt/Credit Note/Tax(토큰) · Payment Intent/Authorization/Capture/Charge/Transaction(Provider 소유)·Multiple Tender/Partial · Refund 10상태/Relationship/Reversal · **Dispute/Chargeback/Representment=NOT_APPLICABLE(Paddle MoR)** · Evidence Reference/Relationship Graph 20/Candidate 17상태/Inclusion/Free-text Review · Dedup/Reconciliation 17상태 · Coverage 28차원/Gap 25유형 · Evidence/Explain · Permission 21 · Lint/Guard · Error 27/Warning 17 · Golden 70+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★Cart/Checkout/Dispute/Chargeback=NOT_APPLICABLE·Order Item 다품목=KNOWN GAP·PAN/CVV/Vault=N/A 정직표기**. **실 Adapter/Retrieval/Reconciliation/Order Item 스토어/CI가드 구현=Part 3-3-3-3-3-3-3-3~7(후속 승인 세션·verify+배포승인).**
