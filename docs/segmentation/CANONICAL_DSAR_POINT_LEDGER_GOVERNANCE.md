# Canonical DSAR Point Ledger Governance — Relationship Graph, Candidate, Balance Calculation, Ledger Integrity, Dedup/Reconciliation, Coverage/Gap/Evidence, Permission, Runtime Guard/Static Lint, Error/Warning, Golden/Legacy Equivalence, Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-3** (2/2) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): point ledger/account 테이블 부재(grep 0)·`point_discount`(마켓 포인트·정산 차감)·`redeem*`(쿠폰 상환)·SecurityAudit · Part 3-3-3-3-3-3-3-3-4-1/4-2 Loyalty·Part 3-3-3-3-3-3-3-2 Order/Payment·Part 3-3-3-3-2 Verification Token·EPIC05 Merge.
> 형제: [`CANONICAL_DSAR_POINT_LEDGER_DISCOVERY.md`](CANONICAL_DSAR_POINT_LEDGER_DISCOVERY.md) · ADR=[`../architecture/ADR_DSAR_POINT_LEDGER_DISCOVERY.md`](../architecture/ADR_DSAR_POINT_LEDGER_DISCOVERY.md)

---

## 1. Relationship Graph (§48) & Candidate (§49-51)

**Relationship Graph(§48)**: Canonical Person → Loyalty Member(grade·4-1) → Point Account(N/A) → Point Ledger(N/A) → Ledger Entry(N/A) · Point Transaction → Order(channel_orders)/Payment/Subscription(paddle)/Campaign(Journey)/Coupon(coupon*)/Reward(마케팅) · Point Earn → Expiration Lot · Point Redemption → Order/Invoice · Point Reversal → Original Transaction · Point Restoration → Original Redemption · Point Transfer → Source/Destination Account · Point Pool → Pool Member · Point Adjustment → Admin/Approval · Balance Snapshot → Ledger Checkpoint. **★현행 실선=Customer→Loyalty Member(grade)·나머지 N/A/전방호환·`point_discount`=마켓 도메인 KEEP_SEPARATE**.
**Candidate(§49-51)**: candidate_id·request/discovery_task_id·provider/provider_account/loyalty_program/loyalty_member/point_account/point_unit_id·balance_summary·ledger_range·transaction_ids·expiration_lots·**subject_roles·shared_account_context**·tenant/brand/store·match_confidence·duplicate_group·evidence. Match 상태(§50)=EXACT_POINT_ACCOUNT/LOYALTY_MEMBER_MATCH·STRONG_CUSTOMER_RELATIONSHIP·VERIFIED_IDENTIFIER·**FAMILY_POOL_MEMBER/ORGANIZATION_POOL_MEMBER/AUTHORIZED_REDEEMER_MATCH·CONTRIBUTOR_ONLY·BENEFICIARY_ONLY**·SHARED_IDENTIFIER·WRONG_POINT_ACCOUNT/TENANT/BRAND·OUT_OF_SCOPE·MANUAL_REVIEW·BLOCKED. Inclusion(§51)=Verified Subject·**Point Account Ownership·Loyalty Member Relationship·Shared Pool Role**·Tenant/Brand·Point Unit·Program Scope·Validity·Transaction Relationship·Family/Corporate Context·Contributor/Redeemer 역할·Provider/Internal Consistency.

---

## 2. Balance Calculation (§52) & Ledger Integrity (§53)

**Balance Calc(§52)**: Opening Balance +Available Earn +Restoration +Transfer In +Positive Adjustment +Conversion In −Redemption −Expiration −Forfeiture −Transfer Out −Negative Adjustment −Conversion Out = **Calculated Available Balance**. Pending/Reserved/Locked 별도 계산. **★Source Balance 단일 신뢰 금지·Ledger 계산과 비교**.
**Ledger Integrity(§53)**: Entry Sequence 연속성·**중복 Idempotency Key·Negative Balance Policy·Missing Reversal·Orphan Transaction·Missing Original Transaction·Expiration Lot 초과 차감·Redemption 초과 사용·Transfer 양방향 불일치·Balance Snapshot 불일치·Deleted Ledger Entry·수정된 Append-only Entry·Timestamp 역전·Cross-account Entry** 검증. **★Ledger Integrity=결제급 무결성 필수(전방호환)**.

---

## 3. Dedup (§54-55) · Reconciliation (§56-57)

**Dedup(§54)**: Loyalty Provider Transaction·Internal Point Ledger Entry·Commerce Point History·Order Reward Record·Campaign Reward·CRM Point Snapshot·CDP Point Trait·Warehouse Ledger Copy·Webhook Event·Export Snapshot·Admin Adjustment. **Key(§55)**: External Point Transaction ID·Point Account+Idempotency Key·Source Object+Source Event ID·Ledger Sequence·Earn Lot ID·Redemption/Transfer/Expiration ID·Adjustment Ticket·Content Hash·Source Lineage.
**Reconciliation(§56)**: **Source Balance vs Ledger-calculated Balance**·Available vs Pending/Reserved·Earn vs Order/Payment Status·Redemption vs Order Discount·**Refund vs Point Restoration·Cancelled Order vs Earn Reversal·Returned Order vs Pending Cancellation**·Expiration Schedule vs Actual·Point Pool Total vs Member Contribution·**Transfer Out vs Transfer In**·Campaign Reward vs Earn·Tier Bonus Rule vs Actual·Provider vs Internal Ledger·Warehouse vs Current Balance. **상태(§57)**: MATCH/BALANCE/PENDING/RESERVATION/EARN/REDEMPTION/REVERSAL/RESTORATION/EXPIRATION/TRANSFER/POOL_BALANCE/ADJUSTMENT/CAMPAIGN_RELATIONSHIP/ORDER_RELATIONSHIP/PROVIDER_INTERNAL_MISMATCH·MANUAL_REVIEW/BLOCKED. **★`point_discount`(마켓 정산) vs 로열티 포인트 오혼입 차단**.

---

## 4. Coverage (§58) · Gap (§59-60)

**Coverage Dimension(§58, 25종)**: Point Program/Unit/Account·Account Relationship·Current/Historical Balance·Ledger·Earn/Pending/Reservation/Redemption/Reversal/Restoration·Expiration/Lot/Forfeiture·Transfer/Pool·Adjustment/Correction/Conversion·Order/Subscription/Campaign Relationship·Evidence Coverage. **Matrix(§83)**: | Request | Account | Balance | Ledger | Earn | Pending | Redeem | Expire | Transfer | Adjustment | Shared | Overall |
**Gap Type(§59, 25종)**: POINT_PROGRAM/UNIT/ACCOUNT_UNREGISTERED·ACCOUNT_MAPPING_MISSING·SHARED_ACCOUNT_ROLE_UNRESOLVED·**CURRENT_BALANCE_UNAVAILABLE·LEDGER_HISTORY_INCOMPLETE·OPENING_BALANCE_UNKNOWN**·EARN/PENDING/RESERVATION/REDEMPTION/REVERSAL/RESTORATION_HISTORY_MISSING·EXPIRATION_POLICY_UNKNOWN·EXPIRATION_LOT_MISSING·FORFEITURE/TRANSFER_HISTORY_MISSING·POOL_RELATIONSHIP_UNMAPPED·ADJUSTMENT/CORRECTION_HISTORY_MISSING·**BALANCE_CALCULATION_MISMATCH**·ORDER/CAMPAIGN_POINT_RELATIONSHIP_MISSING·PROVIDER_INTERNAL_POINT_DRIFT. **★Critical(§60)**: Point Account 잘못된 Tenant·**Shared Family Point 개인 전부 포함**·현재 Balance만·Balance vs Ledger 불일치·**동일 Order 중복 지급·동일 Redemption 이중 차감·취소 Order Earn 미회수·환불 Order Point 미복구**·Expiration Lot 누락·Transfer Out/In 불일치·**Adjustment Actor/Approval 없음·Ledger Entry 삭제/수정**·Tier Qualification Point 를 사용가능 Point 처리·Cross-brand Point 오합산·Provider/Internal Balance 불일치. **★Point System 부재≠Gap→PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지)**.

---

## 5. Evidence (§61) · Explain (§62) · Permission (§63)

**Evidence(§61)**: request/discovery_task_id·provider/provider_account/loyalty_program/loyalty_member/point_account/point_unit_id·endpoint/query_template·API_version·scope/identifier_version·subject_role·shared_account_context·date_range·transaction_type_filters·deleted/archived_inclusion·pagination·async_job·balance/ledger_entry/earn/redemption/expiration/transfer/adjustment/duplicate/excluded_count·error·started/completed_at·result_hash·audit_reference.
**Explain(§62)**: 어떤 Program/Unit·Point Account(개인 vs Shared)·현재 Available/Pending/Reserved Balance·Point 적립 시점/사유·사용가능 전환·사용처·취소/복구·만료·이전/합산·관리자 조정·Balance vs Ledger 일치·Provider/Internal 중복제거·남은 Coverage Gap 설명.
**Permission(§63, 27종)**: VIEW_POINT_DISCOVERY_PROFILE/UNIT/ACCOUNT·MANAGE_POINT_ACCOUNT_MAPPING·VIEW_POINT_ACCOUNT_RELATIONSHIP/BALANCE/BALANCE_SNAPSHOT/LEDGER·RUN_POINT_TRANSACTION_DISCOVERY·VIEW_POINT_EARN/PENDING/RESERVATION/REDEMPTION/REVERSAL/RESTORATION/EXPIRATION/EXPIRATION_LOT/TRANSFER/POOL/ADJUSTMENT/CORRECTION·RUN_POINT_RECONCILIATION·VIEW_POINT_COVERAGE·MANAGE_POINT_GAP·VIEW_POINT_EVIDENCE/AUDIT·ADMIN_POINT_DISCOVERY_OVERRIDE. **★Point 발급/차감/이전/조정 실행 권한 미포함**.

---

## 6. Static Lint (§64) & Runtime Guard (§65)

**Static Lint(§64)**: **현재 Balance만 검색** · Ledger History 누락 · Point Account Binding 없는 Query · **Shared Point 개인 자동확정 · Tier Point/Redeemable Point 혼용 · Pending/Available 혼용 · Earn/Availability 혼용 · Redemption/Discount Amount 혼용** · **Expired Entry 삭제 · Ledger Entry Update/Delete · Idempotency Key 누락 · Expiration Lot 누락** · Reversal 원 Transaction 누락 · Transfer Source/Destination 불일치 · **Adjustment Actor/Approval 누락** · Balance 계산 없이 Source Balance 신뢰 · Order/Campaign Relationship 누락 · Internal 만으로 Complete · **point_discount(마켓) 를 로열티 포인트로 매핑** · Pagination 미완료 · Evidence 누락.
**Runtime Guard(§65)**: Invalid Verification Token · Closed/Withdrawn Request · Wrong Provider Account/Loyalty Program/Point Account · **Cross-Tenant Point Account** · Wrong Brand · Subject Role 미해결 · **Shared Pool Scope 초과 · Tier Point 오분류 · Duplicate Earn · Double Redemption · Expiration Lot 초과 차감 · Negative Balance 정책 위반 · Transfer Account Scope 불일치 · Unapproved Adjustment** · Scope 초과 Ledger Export · Pagination 미완료 Complete · Critical Schema Drift · **Kill Switch**.

---

## 7. Error (§66) · Warning (§67)

**Error(§66, 26종·`POINT_` 접두)**: PROGRAM/UNIT_NOT_REGISTERED·ACCOUNT_NOT_FOUND·ACCOUNT_SCOPE_MISMATCH·ACCOUNT_RELATIONSHIP_UNRESOLVED·BALANCE_UNAVAILABLE·LEDGER_INCOMPLETE·OPENING_BALANCE_UNKNOWN·EARN/PENDING/RESERVATION/REDEMPTION/REVERSAL/RESTORATION_HISTORY_MISSING·EXPIRATION_POLICY_UNKNOWN·EXPIRATION_LOT_MISSING·TRANSFER_HISTORY_MISSING·POOL_MAPPING_MISSING·ADJUSTMENT_HISTORY_MISSING·**LEDGER_INTEGRITY_FAILED·BALANCE_MISMATCH**·RECONCILIATION_FAILED·COVERAGE_INCOMPLETE·CRITICAL_GAP·PERMISSION_DENIED·RUNTIME_BLOCKED.
**Warning(§67, 17종)**: MULTIPLE_ACCOUNT_MATCH·SHARED_ACCOUNT·BALANCE_STALE·PENDING·RESERVATION·**DUPLICATE_EARN**·REDEMPTION·RESTORATION·EXPIRATION·TRANSFER·POOL·ADJUSTMENT·**NEGATIVE_BALANCE·LEDGER_SEQUENCE**·PROVIDER_INTERNAL_DRIFT·MANUAL_REVIEW_REQUIRED·SLA_RISK.

---

## 8. Golden (§68) · Conformance (§69) · Equivalence (§70-71) · Audit (§74)

**Golden(§68·80+ 시나리오·N/A 표기)**: Exact/Multiple/Wrong/Cross-Tenant Point Account·Brand-specific/**Shared Family/Corporate Pool**·Merge/Split/Deleted·**Tier Point vs Redeemable 구분** · 정상/Pending/Reserved/Locked/Expiring Balance·**Source·Ledger 일치/불일치**·Negative/Stale·Opening Migration · Purchase/Subscription/Renewal/Campaign/Referral/Tier Bonus Earn·Pending/Available Conversion·**Duplicate Earn·취소 Order Earn Reversal·반품 Partial Reversal** · Full/Partial Redemption·Point+Card·Reservation Commit/Release·**Double Redemption 차단·Refund Restoration·원 만료일 유지 vs 새 만료일** · Scheduled/Notice/Grace/Partial/Full Expiration·Restoration·Earliest Expiry/Promotional First·**Expiration Lot 누락 차단** · Member/Family/Corporate Transfer/Pool·Fee/Reversal·Source·Dest 불일치·**Unauthorized Pool Redemption·Contributor-only** · Manual Credit/Debit/CS/Fraud/Migration Correction·**Missing Approval 차단·Ledger Entry 직접수정 차단·Append-only Correction** · Pagination·Provider/Internal Duplicate·Balance Reconciliation·Order/Campaign Mismatch·Coverage Complete/Critical Gap·Override 허용/금지. (**★현행 Point System 부재→전 시나리오 PROVIDER_LIMITATION·미래 검증**.)
**Conformance(§69)**: Point Unit/Account/Balance/Snapshot/Ledger/Entry/Transaction/Earn/Pending/Reservation/Redemption/Reversal/Restoration/Expiration/Lot/Transfer/Pool/Adjustment/Correction/Conversion 에 동일 Contract(Account Scope·Tenant/Brand·Subject Role·Shared Scope·Current/Historical·Relationship·**Ledger Integrity**·Candidate·Deduplication·Reconciliation·Coverage·Evidence·Audit).
**Equivalence(§70)**: 기존 Point Balance/History/Admin(현행=`point_discount` 정산·redeem 쿠폰만) 와 비교(Point Account/Balance/Ledger/Earn/Redemption/Expiration/Transfer/Adjustment/Pool·Order/Campaign Relationship·Provider/Internal·Error/Warning/Latency/Audit). **Difference(§71)**: MATCH·EXPECTED_{ACCOUNT_MAPPING/SHARED_SCOPE/BALANCE/LEDGER/EARN/REDEMPTION/EXPIRATION/RESTORATION/TRANSFER/POOL/ADJUSTMENT}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_LEDGER_DEFECT·LEGACY_DISCOVERY_GAP·LEGACY_WRONG_MEMBER_RISK**·CANONICAL_POINT_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_MEMBER_RISK`·Balance 영향 `LEGACY_LEDGER_DEFECT`·고객영향 `LEGACY_DISCOVERY_GAP`·`CANONICAL_POINT_DEFECT`·Cross-Tenant=운영전환 차단**.
**Audit Event(§74, 29종·`POINT_` 접두)**: DISCOVERY_PROFILE_CREATED·UNIT_REGISTERED·ACCOUNT_DISCOVERED/ALIAS_LINKED/RELATIONSHIP_RESOLVED·BALANCE_DISCOVERED/SNAPSHOT_CREATED·LEDGER/LEDGER_ENTRY_DISCOVERED·EARN/PENDING/AVAILABILITY/RESERVATION/REDEMPTION/REVERSAL/RESTORATION/EXPIRATION/EXPIRATION_LOT/FORFEITURE/TRANSFER/POOL/ADJUSTMENT/CORRECTION/CONVERSION_DISCOVERED·DUPLICATE_GROUPED·**LEDGER_INTEGRITY_CHECKED**·RECONCILIATION_COMPLETED·GAP_DETECTED·RUNTIME_BLOCKED (SecurityAudit 확장).

---

## 9. Existing Impl Classification (§75) · Duplicate Audit (§76) · Regression Gate (§77)

**분류(§75)**: 실측 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `point_discount`(마켓 포인트·KrChannel/Rollup/PgSettlement 정산 차감) | `KEEP_SEPARATE_WITH_REASON` | 마켓플레이스 소유·정산 라인·GeniegoROI 원장 아님 |
| `redeem*`(redeemed_at·redeemCoupon·CouponRedeem) | `KEEP_SEPARATE_WITH_REASON` | 쿠폰 상환·포인트 상환 아님(Coupon Part) |
| `적립금`(정산 라벨) | `KEEP_SEPARATE_WITH_REASON` | 마켓 store credit·정산 |
| **Point Program/Unit/Account/Balance/Ledger/Earn/Redeem/Expire/Transfer/Pool/Adjustment 엔진** | `UNVERIFIED`(NOT_APPLICABLE) | **엔진 부재·멀티테넌트 고객 미래 제품·지어내기 금지** |
| Point Ledger↔Customer↔Order Mapping·Candidate/Coverage/Gap 부재 | 신설(전방호환) | 현행 부재 |
**Duplicate Audit(§76)**: 실측 — point ledger=부재·마켓 point=`point_discount`(정산) 단일·redeem=쿠폰 단일. **중복 Point Ledger/Account Registry·point_discount↔로열티 포인트 오혼입·Candidate Store 신설 위험만 차단**(Program별 독립 Ledger 금지).
**Regression Gate(§77)**: 변경 전후 point_discount(정산 라인 보존)·redeem 쿠폰 상환(보존)·적립금(정산 보존)·(Point System 도입 시 Balance/Ledger/Earn/Redemption/Expiration/Transfer/Adjustment/Ledger Integrity/Reconciliation/Coverage)·Audit·**Existing API Compatibility**(KrChannel/Rollup/PgSettlement/CouponRedeem 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 10. 완료 상태 요약

Point Entity 38 · **Point Program/Unit/Account/Balance/Ledger/Transaction/Earn/Pending/Redemption/Reversal/Restoration/Expiration/Lot/Forfeiture/Transfer/Pool/Adjustment/Correction/Conversion=전부 NOT_APPLICABLE(엔진 부재)** · 유일 "point"=`point_discount`(마켓 포인트·정산 차감·KEEP_SEPARATE)·redeem=쿠폰 상환(KEEP_SEPARATE) · Ledger Entry Type 20·Earn Type 15·Deduction Priority 8·Pool Type 8·Adjustment Type 12 · **★전방호환 무결성=Append-only Ledger·Entry 수정/삭제 금지·Idempotency·만료 Point 삭제 금지·Balance=Ledger Reconciliation·Adjustment Approval·Shared Pool Role·Cross-Tenant 차단** · Relationship Graph(Customer→Loyalty Member(grade) 실선·나머지 N/A)·Candidate 17상태 · Balance Calc/Ledger Integrity(13검증) · Dedup/Reconciliation 17상태 · Coverage 25/Gap 25 · Evidence/Explain·Permission 27·Lint/Guard·Error 26/Warning 17·Golden 80+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★Point System 엔진 부재·point_discount=마켓 정산(KEEP_SEPARATE)·전방호환 무결성 계약 정직표기**. **실 Point Ledger/Adapter/CI가드 구현=Point System 도입 시 후속 승인 세션.**
