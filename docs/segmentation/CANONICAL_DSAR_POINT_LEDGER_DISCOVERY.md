# Canonical DSAR Point Ledger Discovery — Entity, Discovery Profile, Point Unit/Account/Balance, Ledger/Entry/Transaction, Earn/Pending/Redemption/Reversal/Restoration, Expiration/Lot/Forfeiture, Transfer/Pool, Adjustment/Correction/Conversion

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-3** (1/2) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): **point account/ledger/balance/earn/redemption/expiration 테이블 부재**(grep 0). 유일한 "point" datum=**`point_discount`**(=마켓플레이스 포인트·buyer 가 체크아웃서 사용·`KrChannel`/`Rollup`/`PgSettlement` 정산 차감 라인 `vat·coupon_discount·point_discount·other_deductions·net_payout`·읽기전용 import·**GeniegoROI 포인트 원장 아님**). `redeem*`(redeemed_at·redeemCoupon·redeemer_email)=**쿠폰 상환**(CouponRedeem·포인트 아님). 마일리지 없음. `적립금`=정산 라벨. · Part 3-3-3-3-3-3-3-3-4-1/4-2 Loyalty(grade·엔진 부재)·Part 3-3-3-3-3-3-2 CRM/CDP·Part 3-3-3-3-2 Verification Token·EPIC05 Identity.
> **★정직(§실측·핵심)**: **GeniegoROI Point System 엔진 미보유** — **Point Program/Unit/Account/Balance/Ledger/Earn/Pending/Redemption/Reversal/Restoration/Expiration/Lot/Forfeiture/Transfer/Pool/Adjustment/Correction/Conversion 전부 NOT_APPLICABLE**. 유일 "point"=`point_discount`(마켓 포인트·정산 차감·KEEP_SEPARATE·읽기전용). `redeem*`=쿠폰 상환(KEEP_SEPARATE·Coupon Part). **본 Point Ledger=멀티테넌트 고객용 미래 제품 계약(전방호환)·지어내기 금지**.
> 형제: [`CANONICAL_DSAR_POINT_LEDGER_GOVERNANCE.md`](CANONICAL_DSAR_POINT_LEDGER_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_POINT_LEDGER_DISCOVERY.md`](../architecture/ADR_DSAR_POINT_LEDGER_DISCOVERY.md) · 상위=[`CANONICAL_DSAR_LOYALTY_DISCOVERY.md`](CANONICAL_DSAR_LOYALTY_DISCOVERY.md)
> **성격**: 목표 계약(전부 미래·Point System 도입 시 활성화). 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| **`point_discount`**(마켓 포인트·정산 차감 라인·읽기전용) | `KEEP_SEPARATE`(마켓플레이스 소유·GeniegoROI 원장 아님·정산 라인 보존) |
| `redeem*`(redeemed_at·redeemCoupon)=쿠폰 상환 | `KEEP_SEPARATE`(Coupon Part·포인트 상환 아님) |
| `적립금`(정산 라벨) | `KEEP_SEPARATE`(마켓 store credit·정산) |
| **Point Program/Unit/Account/Balance/Ledger/Transaction/Earn/Redeem/Expire/Transfer/Pool/Adjustment 엔진** | **NOT_APPLICABLE**(엔진 부재·지어내기 금지·도입 시 등록·전방호환 계약) |
| Point Ledger↔Customer↔Order Mapping·Candidate/Coverage/Gap 부재 | 신설(전방호환) |

**무후퇴**: point_discount(정산)·redeem 쿠폰 상환·적립금 정산 라벨 은 **정본 — 재구현 금지·KEEP_SEPARATE**. Point Program별 독립 Ledger/Candidate Store 신설 금지(§Governance).

---

## 1. Canonical Point Discovery Entity Model (§6) — 전방호환

Entity: `POINT_DISCOVERY_PROFILE` · `POINT_UNIT(_VERSION)`(N/A) · `POINT_ACCOUNT(_ALIAS/_RELATIONSHIP)`(N/A) · `POINT_BALANCE(_SNAPSHOT)`(N/A) · `POINT_LEDGER` · `POINT_LEDGER_ENTRY` · `POINT_TRANSACTION`(N/A) · `POINT_EARN` · `POINT_PENDING` · `POINT_AVAILABILITY_EVENT` · `POINT_RESERVATION` · `POINT_REDEMPTION` · `POINT_REVERSAL` · `POINT_RESTORATION` · `POINT_EXPIRATION(_SCHEDULE/_LOT)` · `POINT_FORFEITURE` · `POINT_TRANSFER` · `POINT_POOL(_MEMBER)` · `POINT_ADJUSTMENT` · `POINT_CORRECTION` · `POINT_CONVERSION` · `POINT_{CAMPAIGN/ORDER/SUBSCRIPTION/REWARD}_RELATIONSHIP` · `POINT_CANDIDATE` · `POINT_DUPLICATE_GROUP` · `POINT_RECONCILIATION` · `POINT_COVERAGE_RESULT` · `POINT_DISCOVERY_GAP` · `POINT_DISCOVERY_EVIDENCE` · `POINT_AUDIT_EVENT`. **★전부 N/A(엔진 부재)·전방호환 계약·`point_discount`=별도 마켓 도메인**.

---

## 2. Discovery Profile · Point Unit (§7-9) · Account (§10-12) — N/A

**Discovery Profile(§7)**: point_discovery_profile_id · provider_id(=미래 Loyalty Point Provider) · provider_account_id · loyalty_program_id · tenant/brand/store/legal_entity_id · environment · region · supported_point_units · account/pending/expiration/redemption/transfer/adjustment/balance_calculation_model · source_of_truth · API/bulk_export/webhook_support · historical_coverage · deleted_account_support · owner · version · status · certification_status. **★현행=Point System 부재(멀티테넌트 고객 도입 시 등록)**.
**Point Unit(§8-9·N/A)**: point_unit_id·loyalty_program_id·external_unit_id·unit_name/symbol/category·precision·monetary_conversion·currency/brand/region_scope·transferability·expiry/pooling_support·status·version. Type=LOYALTY_POINT·MILEAGE·BONUS·PROMOTIONAL·**TIER_POINT/QUALIFYING_POINT(≠사용가능)**·PARTNER·REFERRAL·EVENT·GAMIFICATION·CUSTOM. **★Tier Qualification Point ≠ Redeemable Point(§9)**.
**Point Account(§10-12·N/A)**: point_account_id·loyalty_program/member_id·external_point_account_id·**account_owner_type**·tenant/brand·point_unit·status·opened/closed/deleted_at·merged_into·alias_ids·**shared_account 여부**·evidence. 상태=PENDING/ACTIVE/SUSPENDED/FROZEN/CLOSED/ARCHIVED/SOFT/HARD_DELETED/MERGED/SPLIT/TRANSFERRED/FRAUD_HOLD/UNKNOWN. Relationship=CUSTOMER/LOYALTY_MEMBER/FAMILY/ORGANIZATION_OWNER·HOUSEHOLD/ORGANIZATION_MEMBER·**CONTRIBUTOR/REDEEMER/BENEFICIARY/AUTHORIZED_USER**·ADMIN·UNKNOWN. **★Point Account ≠ Customer 자동동일시 금지(§5.1)·Shared Point ≠ 개인 Point(§5.9)**.

---

## 3. Balance (§13-15) · Ledger (§16-18) · Transaction (§19-20) — N/A·★전방호환 무결성

**Balance(§13-15·N/A)**: point_balance_id·point_account_id·point_unit_id·**available/pending/reserved/locked/expiring/expired/forfeited_balance·lifetime_earned/redeemed/expired/adjusted**·calculated_at·source_balance_reference·**ledger_calculated_balance·difference**·status·evidence. 상태=MATCHED/SOURCE_ONLY/LEDGER_ONLY/MISMATCH/NEGATIVE/STALE/RECALCULATING/FROZEN/UNKNOWN. Snapshot=snapshot_at·available/pending/reserved·ledger_checkpoint·transaction_high_water_mark·difference·checksum. **★현재 Balance만 저장·완료선언 금지(§5.2)·Source Balance 단일 신뢰 금지(§5.6·Ledger 비교)**.
**Ledger(§16-18·★Append-only)**: point_ledger_id·point_account_id·point_unit_id·opening_date·current_checkpoint·last_reconciled_at·status·version. Entry=point_ledger_entry_id·point_ledger_id·point_transaction_id·**entry_sequence**·entry_type·debit/credit_quantity·**balance_after·pending/reserved_balance_after**·effective/recorded_at·source_event_id·**idempotency_key**·reversal/correction/expiration_lot_reference·evidence. Entry Type(20종)=OPENING_BALANCE·EARN·PENDING_EARN·AVAILABILITY_RELEASE·RESERVE·RESERVATION_RELEASE·REDEEM·REVERSE·RESTORE·EXPIRE·FORFEIT·TRANSFER_IN/OUT·ADJUSTMENT_CREDIT/DEBIT·CORRECTION·CONVERSION_IN/OUT·CLOSING_BALANCE. **★Ledger=Append-only·Entry 수정/삭제 금지(§46)·Idempotency 필수**.
**Transaction(§19-20·N/A)**: point_transaction_id·point_account_id·point_unit_id·transaction_type·quantity·available/pending/reserved_impact·status·source_object_type/id·order/payment/subscription/campaign/reward/coupon_reference·actor·requested/effective/completed/expires_at·**idempotency_key**·related_transaction·evidence. 상태=CREATED/PENDING/PROCESSING/COMPLETED/PARTIALLY_COMPLETED/RESERVED/RELEASED/REVERSED/CANCELLED/EXPIRED/FAILED/BLOCKED/MANUAL_REVIEW/UNKNOWN.

---

## 4. Earn/Pending/Availability (§21-25) · Reservation/Redemption (§26-29) — N/A

**★Earn ≠ Available(§5.4)**: Earned→Pending→Confirmed→Available→Reserved→Redeemed→Reversed/Expired.
**Earn(§21-22·N/A)**: point_earn_id·point_transaction_id·quantity·earn_type·source_order/subscription/campaign/referral·tier_bonus·base/bonus_earn·**pending_until·available_at·expiration_policy·expiration_date**·status·evidence. Type=PURCHASE/SUBSCRIPTION/RENEWAL/CAMPAIGN/PROMOTION/REFERRAL/SIGNUP/REVIEW/ENGAGEMENT/TIER_BONUS/PARTNER/MANUAL/SERVICE_RECOVERY/EVENT/OTHER.
**Pending(§23-24)/Availability(§25·N/A)**: pending_point_id·earn_transaction·quantity·pending_reason·created_at·expected/actual_release_at·order_completion_reference·return_window·fraud_review·status. 상태=PENDING/WAITING_ORDER_COMPLETION/RETURN_WINDOW/PAYMENT/FRAUD_REVIEW/AVAILABLE/CANCELLED/REVERSED/EXPIRED/FAILED.
**Reservation(§26-27)/Redemption(§28-29·N/A)**: reservation=order/cart/checkout_reference·reserved/expires/committed/released_at·**idempotency_key**·status(CREATED/RESERVED/COMMITTED/PARTIALLY_COMMITTED/RELEASED/EXPIRED/CANCELLED/FAILED). Redemption=redemption_id·point_transaction·quantity·point_unit·**conversion_rate_reference·monetary_value·currency**·order/invoice/reward_reference·redemption_channel·redeemed_at·partial 여부·reversed/restored_quantity·evidence. **★사용 Point ≠ 할인 금액(§5.5·수량/Unit/환산율/금액 별도)**. Type=ORDER_DISCOUNT/INVOICE_CREDIT/REWARD_EXCHANGE/SHIPPING/SUBSCRIPTION_BENEFIT/PARTNER/DONATION/TRANSFER/EVENT_ENTRY/OTHER.

---

## 5. Reversal/Restoration (§30-32) · Expiration/Lot/Forfeiture (§33-38) · Transfer/Pool (§39-43) · Adjustment/Correction/Conversion (§44-47) — N/A

**Reversal(§30-31)/Restoration(§32·N/A)**: reversal=original_transaction·reversal_type·quantity·reason·order_cancellation/refund/dispute_reference·reversed_at·actor·evidence(Type=EARN/REDEMPTION/RESERVATION/TRANSFER/ADJUSTMENT/EXPIRATION/FRAUD/DUPLICATE_REVERSAL). Restoration=original_redemption·original_point_lots·restored_quantity·**restored_expiration_dates**·order/refund_reference·evidence. **★원래 만료일 유지 vs 새 만료일 부여 정책 기록**.
**Expiration(§33-37)/Forfeiture(§38·N/A·★삭제 금지 §5.7)**: expiration=expiration_lot·source_earn_transactions·quantity·scheduled/expired_at·expiration_policy·notice_references·grace_period·restored 여부·evidence(상태 SCHEDULED/NOTICE_PENDING/SENT/GRACE_PERIOD/EXPIRED/PARTIALLY_EXPIRED/CANCELLED/RESTORED/FAILED/UNKNOWN). Lot=source_earn_transaction·**original/remaining_quantity·earned/available/expires_at·priority**·restricted_usage·campaign_reference·status. **차감 우선순위(§37)**: FIFO/LIFO/EARLIEST_EXPIRY_FIRST/LATEST_EXPIRY_FIRST/PROMOTIONAL_FIRST/STANDARD_FIRST/RESTRICTED_FIRST/CUSTOM(**Policy Version → Ledger Entry 연결**). Forfeiture(§38)=membership_termination/fraud/policy_violation/account_closure/inactivity/legal·approval. **★만료 Point 삭제 금지·만료 이력 보존**.
**Transfer(§39-40)/Pool(§41-43·N/A)**: transfer=source/destination_point_account·source/destination_member·conversion_rate·fee·authorization·**relationship_requirement**·양방향 Entry·evidence. Pool=pool_type(FAMILY/HOUSEHOLD/ORGANIZATION/TEAM/CORPORATE/PARTNER/CAMPAIGN/CUSTOM)·owner·contribution/redemption_policy·member_limit. Pool Member=role·contribution/redemption/transfer_permission·joined/left_at. **★Shared Pool Role 검증(§5.9)**.
**Adjustment(§44-45)/Correction(§46)/Conversion(§47·N/A)**: adjustment=adjustment_type·quantity·reason_category·free_text_reason_reference·**requested_by·approved_by·ticket_reference**·effective_at·expiration_behavior·evidence(Type=MANUAL_CREDIT/DEBIT/CUSTOMER_SERVICE/SERVICE_RECOVERY/CAMPAIGN/FRAUD/MIGRATION/BALANCE_CORRECTION/EXPIRATION_RESTORATION/DUPLICATE_REMOVAL/LEGAL/OTHER). **★관리자 Adjustment=Actor/Approval/Ticket/Audit 강제(§5.8)·일반 적립으로 숨김 금지**. **Correction(§46)**: affected_ledger_entries·incorrect/corrected_value·correction_method·approval·**★기존 Entry 삭제 금지·Correction Entry 추가**. Conversion=source/destination_unit·conversion_rate·rate_version·fee.
