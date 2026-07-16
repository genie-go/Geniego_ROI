# ADR — DSAR Point Ledger, Point Transaction, Point Expiration & Point Governance Discovery (EPIC 06-A Part 3-3-3-3-3-3-3-3-4-3)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Point Ledger·Transaction·Expiration·Governance Discovery 계약 명세 확정. 비파괴 — 코드변경 0). 실 Point Ledger/Adapter/CI 가드 구현은 **Point System(멀티테넌트 고객 로열티 포인트) 도입 시** 후속 승인 세션. **현재 Balance만 검색·Shared Point 개인 자동귀속·Tier Point/Redeemable 혼용·Ledger Entry 수정/삭제·Idempotency 없는 Earn/Redemption·Expiration Lot 없는 만료·Approval 없는 Adjustment·만료 Point 삭제·point_discount(마켓)를 로열티 포인트로 매핑·Point System 부재를 NO_DATA/오탐 처리 금지.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_POINT_LEDGER_DISCOVERY.md`](../segmentation/CANONICAL_DSAR_POINT_LEDGER_DISCOVERY.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_POINT_LEDGER_GOVERNANCE.md) · **point account/ledger/balance/earn/redemption/expiration 테이블 부재(grep 0)** · `point_discount`(마켓 포인트·KrChannel/Rollup/PgSettlement 정산 차감 라인 `vat·coupon_discount·point_discount·other_deductions·net_payout`·읽기전용) · `redeem*`(redeemed_at·redeemCoupon·CouponRedeem=쿠폰 상환) · `적립금`(정산 라벨) · Part 3-3-3-3-3-3-3-3-4-1/4-2 Loyalty · Part 3-3-3-3-3-3-3-2 Order/Payment · Part 3-3-3-3-2 Verification Token · EPIC05 Merge.

## 결정 (핵심)

1. **★실측 정직·엔진 부재 명시**: **GeniegoROI Point System 엔진 미보유** — **Point Program/Unit/Account/Balance/Ledger/Earn/Pending/Redemption/Reversal/Restoration/Expiration/Lot/Forfeiture/Transfer/Pool/Adjustment/Correction/Conversion 전부 NOT_APPLICABLE**(테이블 grep 0). 유일 "point"=**`point_discount`**(마켓플레이스 포인트·buyer 체크아웃 사용·정산 차감 라인·읽기전용·**GeniegoROI 원장 아님·KEEP_SEPARATE**). `redeem*`=쿠폰 상환(CouponRedeem·포인트 아님·Coupon Part). 지어내기 금지·**본 Point Ledger=멀티테넌트 고객용 미래 제품 계약(전방호환)**. 기존 point_discount/redeem/적립금=정본·KEEP_SEPARATE.

2. **Point Account ≠ Customer·Shared Point ≠ 개인(§5.1·5.9)**: (도입 시) Individual/Family/Household/Corporate/Organization Shared Account 구분·Owner/Contributor/Redeemer/Beneficiary/Authorized User 역할 검증. Shared Family/Corporate Point 를 한 개인에게 자동귀속 금지.

3. **현재 Balance ≠ 완료·Source Balance ≠ 신뢰(§5.2·5.6)**: 현재 Balance만 검색 금지 → Opening/Earn/Pending/Availability/Reservation/Redemption/Reversal/Restoration/Expiration/Forfeiture/Transfer/Adjustment/Correction 전체 Ledger 조사. **Source Balance 단일 신뢰 금지 → Ledger-calculated Balance(Opening+Earn+Restore+Transfer In+Adjustment−Redemption−Expiration−Transfer Out−Adjustment) 비교**.

4. **Earn ≠ Available·사용 Point ≠ 할인금액·Tier Point ≠ Redeemable(§5.4·5.5·§9)**: Earned→Pending→Confirmed→Available→Reserved→Redeemed→Reversed/Expired. Redemption=수량/Unit/환산율/할인금액/Currency/Order 별도 기록. Tier Qualification Point 를 사용가능 Point 로 처리 금지.

5. **★Append-only Ledger·수정/삭제 금지·Idempotency·만료 Point 삭제 금지(§5.7·§46·§53)**: 모든 Ledger Entry Append-only·Sequence·Idempotency Key·Balance After 기록. **기존 Entry 수정/삭제 금지 → Correction Entry 추가**. 만료 Point 삭제 금지·만료 이력/Policy/Lot 보존. Expiration Lot·차감 우선순위(FIFO/Earliest-expiry) Policy Version→Entry 연결. Ledger Integrity=중복 Idempotency/Missing Reversal/Orphan/초과 차감/Timestamp 역전/Cross-account 검증.

6. **관리자 Adjustment 투명·Reversal/Restoration 연결(§5.8·§30-32)**: 관리자 Adjustment=Actor/Approval/Ticket/Audit 강제·일반 적립으로 숨김 금지. Earn Reversal/Redemption Reversal=Original Transaction 연결. 취소 Order Earn Reversal·환불 Order Point Restoration 구분·원 만료일 유지 vs 새 만료일 Policy 기록.

7. **Point System 부재 ≠ Gap·오혼입 차단**: Point System 부재=결함 아니라 **`PROVIDER_LIMITATION`/NOT_APPLICABLE 명시**(NO_DATA/오탐 금지). **point_discount(마켓 정산)를 로열티 포인트로 매핑·redeem(쿠폰)을 포인트 상환으로 매핑 금지**(Static Lint/Runtime Guard). Cross-Tenant Point Account/Duplicate Earn/Double Redemption 차단.

8. **정직·무후퇴·Coverage/Gap**: Point Ledger↔Customer↔Order Mapping·Candidate/Coverage/Gap=현행 부재→전방호환 목표계약. Coverage 다차원·Critical Gap(Balance vs Ledger 불일치·중복 지급·이중 차감·취소 Earn 미회수·환불 미복구·Adjustment Approval 없음·Ledger 수정) 시 Access Review 차단. point_discount/redeem/적립금 보존(Legacy Equivalence·API Compatibility). UNEXPLAINED·LEGACY_WRONG_MEMBER_RISK·Balance 영향 LEGACY_LEDGER_DEFECT·고객영향 LEGACY_DISCOVERY_GAP·CANONICAL_POINT_DEFECT·Cross-Tenant→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙
신규 Point Program/Unit/Account/Ledger 도입 전: Customer Identity(EPIC05)·Loyalty Member(grade)·Tenant/Brand/Program Scope·Subject Role·Point Account Ownership·Shared Pool Role·마켓 point_discount/쿠폰 redeem 도메인 분리·**Append-only Ledger·Idempotency·Expiration Lot·Balance=Ledger Reconciliation·Adjustment Approval·Cross-Tenant 차단**·Candidate/Coverage 정의 → Golden/Conformance·Lint/Guard·중복/후퇴·ADR/PM 기록. **point_discount↔로열티 포인트↔쿠폰 redeem 오혼입 금지·Program별 독립 Ledger/Candidate Store 중복 생성 금지.**

## 결과
Point Entity(38)·**Program/Unit/Account/Balance/Ledger/Transaction/Earn/Pending/Redemption/Reversal/Restoration/Expiration/Lot/Forfeiture/Transfer/Pool/Adjustment/Correction/Conversion=전부 NOT_APPLICABLE(엔진 부재)**·유일 point=`point_discount`(마켓 정산·KEEP_SEPARATE)·redeem=쿠폰(KEEP_SEPARATE)·Ledger Entry Type(20)/Earn Type(15)/Deduction Priority(8)/Pool Type(8)/Adjustment Type(12)·**전방호환 무결성(Append-only·수정/삭제 금지·Idempotency·만료 삭제 금지·Balance=Ledger Reconciliation·Adjustment Approval·Shared Pool Role·Cross-Tenant 차단)**·Relationship Graph(Customer→Loyalty Member(grade) 실선)·Candidate(17)·Balance Calc/Ledger Integrity(13)·Dedup/Reconciliation(17)·Coverage(25)/Gap(25)·Evidence/Explain·Permission(27)·Lint/Guard·Error(26)/Warning(17)·Golden(80+)/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_POINT_LEDGER_{DISCOVERY,GOVERNANCE}.md. **★Point System 엔진 부재·point_discount=마켓 정산(KEEP_SEPARATE)·전방호환 무결성 계약 정직표기**. 다음 **Reward Rule·Reward Event·Reward Eligibility·Reward Issuance·Reward Redemption Discovery** 입력 준비 완료.
