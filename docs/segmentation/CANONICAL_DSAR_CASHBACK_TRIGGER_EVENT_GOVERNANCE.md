# CANONICAL DSAR — Cashback Trigger Event Governance (Event·Ingestion·Validation·Dedup·Ordering·Late·Reprocessing·Context·Candidate·Guard·Test)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-2 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_CASHBACK_ELIGIBILITY_MODEL.md`](CANONICAL_DSAR_CASHBACK_ELIGIBILITY_MODEL.md)(Eligibility/Qualification) + 본 문서(Trigger Event/Governance).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_ELIGIBILITY_TRIGGER_GOVERNANCE.md`](../architecture/ADR_DSAR_CASHBACK_ELIGIBILITY_TRIGGER_GOVERNANCE.md).

---

## 1. Trigger Event (§18) · Type (§19) · 상태 (§20) · Version (§21) ★Event Time≠Received Time

- **Trigger Event(§18)**: cashback_trigger_event_id·provider/account·external event id·**canonical event type·source object type/id·subject identity·reward account·tenant·brand·store·merchant·legal entity·event_at·received_at·validated_at·processed_at·sequence·partition reference·idempotency key·schema version·source status·event status**·evidence. **★§4.3 event_at/received_at/validated_at/evaluated_at/qualified_at/processed_at 분리**.
- **Type(§19, 25)**: ORDER_CREATED/PAID/COMPLETED/FULFILLED·**RETURN_WINDOW_COMPLETED·ORDER_CANCELLED/RETURNED**·PAYMENT_AUTHORIZED/CAPTURED/SETTLED/FAILED·REFUND_CREATED/COMPLETED·CHARGEBACK_CREATED·SUBSCRIPTION_STARTED/RENEWED/UPGRADED/CANCELLED·REFERRAL_CREATED/CONVERTED·TIER_ACHIEVED·CAMPAIGN_QUALIFIED·MANUAL_APPROVAL·SCHEDULED_EVALUATION·CUSTOM_EVENT.
- **상태(§20, 19)**: RECEIVED·VALIDATING·VALIDATED·ACCEPTED·REJECTED·**DUPLICATE·OUT_OF_ORDER·LATE**·ELIGIBILITY_PENDING·ELIGIBILITY_EVALUATED·QUALIFICATION_PENDING·QUALIFIED·NOT_QUALIFIED·REPROCESSING·COMPLETED·FAILED·EXPIRED·ARCHIVED·UNKNOWN.
- **Version(§21)**: trigger event version id·event·schema version·previous version·**payload hash·changed fields·corrected·received_at·effective_at·reprocessing required**·evidence. **원문 Payload 최소화·Canonical Field+Hash**.
**현행 실체**: `EventNorm`(canonical event 정규화)·`raw_vendor_event`·PixelTracking·Paddle/ChannelSync webhook·channel_orders/OrderHub(order)·pg_settlement(payment·settlement)·referral_signup(referral)·ReturnsPortal(return window). Cashback Trigger Event Registry(canonical type·event/received time 분리·version)=신설(EventNorm 재사용).

## 2. Ingestion (§22) · Validation (§23) · Deduplication (§24)

- **Ingestion(§22)**: ingestion id·trigger event·source system·**transport·endpoint/topic/file reference·received_at·attempt·batch id·partition·offset·signature verification·schema validation**·status·error·evidence. Transport(9): API·WEBHOOK·MESSAGE_QUEUE·EVENT_STREAM·BATCH·FILE_IMPORT·DATABASE_CDC·INTERNAL_SERVICE·MANUAL. → 현행 webhook(Paddle/ChannelSync)·batch(ChannelSync sync)·CDC(raw_vendor_event)·API(PixelTracking) 인접.
- **Validation(§23)**: Required Field·Provider Account·Tenant·Brand·Source Object·Subject Identity·Currency·Amount·Event Time·Schema Version·**Signature·Source Status·Rule-supported Event Type·Environment·Idempotency Key**. 상태(11): VALID·VALID_WITH_WARNINGS·INVALID_SCHEMA/SIGNATURE/SCOPE/IDENTITY/STATUS/AMOUNT/CURRENCY·UNSUPPORTED_EVENT·MANUAL_REVIEW. → 현행 Paddle webhook signature·auth_tenant scope 인접.
- **Dedup(§24)**: Provider Event ID·External Event ID·**Idempotency Key·Source Object+Event Type+Version·Partition+Offset·Request ID·Content Hash·Order/Payment/Subscription ID+Status Change·Referral Relationship+Conversion**. **★Duplicate 삭제 금지·Duplicate Group+제외 근거 기록**. **현행 정본**: pg_settlement UNIQUE(tenant,provider,txn_id)·Referral referred_user_id UNIQUE·coupon_redemptions UNIQUE=**§4.4 중복 자격 방지 실 패턴 계승**.

## 3. Ordering (§25) · Late Event (§26) · Reprocessing (§27) · Context (§28)

- **Ordering(§25)**: ordering id·source object·**expected/received sequence·previous/next event·event time·received time·out-of-order·resolution policy·resolved_at**·status·evidence. Resolution(7): WAIT_FOR_PREVIOUS·PROCESS_WITH_WARNING·REORDER·REPROCESS_CHAIN·IGNORE_STALE_EVENT·MANUAL_REVIEW·CUSTOM.
- **Late Event(§26)**: late event id·trigger event·**original event time·received time·lateness duration·original/current evaluation window·affected rule/qualification/limit·reevaluation required·correction required**·status·evidence.
- **Reprocessing(§27)**: reprocessing id·trigger event·reason·**previous result·target rule/policy/identity version·requested/started/completed_at·result·affected evaluations/qualifications·duplicate prevention reference**·evidence. **★Reprocessing으로 중복 Accrual 생성 금지**.
- **Eligibility Context(§28)**: context id·subject·trigger event·**identity version·customer/membership status·loyalty tier·segment memberships·subscription status·purchase/payment/refund summary·referral state·consent/suppression/fraud state·account/member/global limit usage·budget state·timezone·evaluated_at**·evidence. **★§4.5 현재 Customer State로 과거 Eligibility 재계산 금지(당시 Snapshot 보존)**.
→ 전부 부재·신설. **현행 인접**: EventNorm(정규화)·pg UNIQUE(dedup)·crm_segments(segment·**version 부재 SEG-H4**)·AnomalyDetection(fraud). segment version 미보존=Context Snapshot GAP.

## 4. Candidate (§40) · Reconciliation (§41·§42)

- **Candidate(§40)**: candidate id·request id·subject·reward account·program·rule·**rule version·policy·policy version·trigger event·eligibility context·qualification·condition results·exclusion reasons·tenant·brand·store·merchant·currency·shared account context·identity confidence·result·manual review requirement**·evidence.
- **Reconciliation(§41)**: Provider Eligibility↔Internal·**Trigger Event↔Source Object Status**·Customer Status↔Eligibility·Membership Tier↔Rule Requirement·Segment Version↔Evaluation·Subscription↔Eligibility·Purchase Amount↔Threshold·Payment Status↔Qualification·**Refund State↔Eligibility·Consent State↔Processing Purpose·Suppression State↔Reward Entitlement·Fraud State↔Hold/Block**·Member/Shared Account Limit↔Evaluation·Rule Version↔Decision·**Event Reprocessing↔Duplicate Accrual Risk**. 상태(19): MATCH·TRIGGER_STATUS/CUSTOMER_STATUS/MEMBERSHIP/SEGMENT/SUBSCRIPTION/PURCHASE_THRESHOLD/PAYMENT_STATUS/REFUND_STATE/CONSENT/SUPPRESSION/FRAUD_STATE/LIMIT/SHARED_ACCOUNT/RULE_VERSION_MISMATCH·**EVENT_DUPLICATION_RISK**·PROVIDER_INTERNAL_ELIGIBILITY_DRIFT·MANUAL_REVIEW·BLOCKED.

## 5. Coverage (§43) · Gap (§44·§45)

- **Coverage(§43, 28)**: Eligibility Profile·Policy·Policy Version·Condition·Condition Result·Exclusion Reason·Evaluation·Qualification·Progress·Trigger Event·Event Version·Ingestion·Validation·Deduplication·Ordering·Late Event·Reprocessing·Customer/Segment/Subscription/Purchase/Payment/Referral Eligibility·Consent·Suppression·Fraud·Shared Account·Evidence.
- **Gap(§44, 23)**: ELIGIBILITY_POLICY(_VERSION)_MISSING·CONDITION_EVIDENCE/EXCLUSION_REASON_MISSING·TRIGGER_EVENT_MISSING·EVENT_SCHEMA_UNKNOWN·**IDEMPOTENCY_MISSING·EVENT_DEDUPLICATION_MISSING·EVENT_ORDERING_UNKNOWN·LATE_EVENT/REPROCESSING_POLICY_MISSING**·IDENTITY/SEGMENT_VERSION_MISSING·SUBSCRIPTION/PAYMENT/REFUND/CONSENT/SUPPRESSION/FRAUD_STATE_MISSING·LIMIT_SNAPSHOT/SHARED_ACCOUNT_CONTEXT_MISSING·QUALIFICATION_HISTORY_MISSING·PROVIDER_INTERNAL_ELIGIBILITY_DRIFT.
- **Critical Gap(§45)**: **잘못된 Customer Eligibility·Cross-Tenant Trigger Event·동일 Event 중복 Eligibility/Qualification·Payment 실패 거래 Eligible·취소/환불 주문 Eligible 유지·Return Window 전 확정·Rule/Identity Version 없이 평가·Consent/Suppression 오해석·Fraud Block 고객 Eligible·Shared Account Limit 중복 계산·Referrer/Referee 반전·Late Event 재처리 중복 Accrual·Provider↔Internal 불일치·Historical Context 없이 과거 재계산**.
**현행 정직 GAP**: Cashback Eligibility 엔진 부재=PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지). 실 GAP=①Financial Entitlement Suppression 구분 부재(Communication 중심) ②segment version 미보존(SEG-H4) ③Eligibility Context Snapshot 부재. Critical Gap 시 Access Review 차단.

## 6. Static Lint (§46) · Runtime Guard (§47)

**Lint(§46)**: **Trigger Event 없는 Evaluation·Rule/Policy/Identity Version 없는 Evaluation·Event Time↔Received Time 혼용·Idempotency Key 없는 Event·Duplicate Event 삭제·Condition Result 없는 Eligibility Result·Exclusion Reason 없는 Not Eligible·Fraud Hold↔Not Eligible 혼용·Consent↔Suppression 혼용·Current Segment로 과거 평가 덮어쓰기·Shared Account Context 누락·Reprocessing 시 Duplicate Prevention 누락·Cross-Tenant Event 처리·기존 Eligibility Engine 중복 생성·Evidence 없는 Manual Review**.
**Guard(§47)**: Wrong Subject/Reward Account·**Cross-Tenant Event**·Wrong Brand/Store/Merchant·Invalid Event Schema/Signature·**Duplicate Event·Stale Event·Unsupported Event Type**·Expired Rule·Invalid Rule/Policy Version·Identity Confidence Low·**Payment Not Completed·Order Cancelled·Refund Completed·Fraud Blocked**·Limit Exceeded·Cooldown Active·**Shared Account Scope Exceeded·Reprocessing Duplicate Risk**·Critical Eligibility Drift·Kill Switch.
**현행 실증**: pg_settlement UNIQUE(Duplicate 차단)·auth_tenant(Cross-Tenant 차단)·Paddle signature·AnomalyDetection(fraud)·OrderHub 취소/환불 상태·isMarketingSendAllowed(consent) 재사용.

## 7. Error (§48) · Warning (§49)

**Error(23)**: CASHBACK_ELIGIBILITY_POLICY_NOT_FOUND·POLICY_VERSION_MISSING·CONDITION_FAILED·TRIGGER_EVENT_NOT_FOUND/INVALID/**DUPLICATE/OUT_OF_ORDER/LATE**·TRIGGER_IDEMPOTENCY_MISSING·SUBJECT_IDENTITY_UNRESOLVED·QUALIFICATION_INCOMPLETE·**PAYMENT_NOT_COMPLETED·ORDER_NOT_COMPLETED·RETURN_WINDOW_INCOMPLETE**·CONSENT_BLOCKED·SUPPRESSED·**FRAUD_HOLD·FRAUD_BLOCKED**·LIMIT_REACHED·COOLDOWN_ACTIVE·SHARED_ACCOUNT_SCOPE_EXCEEDED·ELIGIBILITY_RECONCILIATION_FAILED·ELIGIBILITY_RUNTIME_BLOCKED.
**Warning(15)**: ELIGIBILITY_DATA_STALE·TRIGGER_LATE·TRIGGER_ORDERING·TRIGGER_REPROCESSING·IDENTITY_CONFIDENCE·SEGMENT_VERSION·SUBSCRIPTION_STATE·PAYMENT_STATE·REFUND_STATE·CONSENT·SUPPRESSION·FRAUD_REVIEW·SHARED_ACCOUNT_WARNING·PROVIDER_INTERNAL_ELIGIBILITY_DRIFT·ELIGIBILITY_MANUAL_REVIEW_REQUIRED.

## 8. Golden Dataset (§50) · Conformance (§51) · Legacy Equivalence (§52)

**Golden(§50)**: Trigger Event(Order Created/Paid/Completed/Fulfilled·Return Window Completed·Payment Captured/Settled·Subscription Renewed·Referral Converted·Tier Achieved·**Duplicate·Out-of-order·Late·Invalid Signature/Schema·Reprocessed**) · Customer/Membership(Active/Inactive/Verified/New/Existing/First Purchase/Member/Non-member/Eligible·Ineligible Tier/Dormant/Reactivated) · Purchase/Payment(Min Met/Not Met·Net Paid·Partial/Split·Failed·Captured Not Settled·**Cancelled·Partial/Full Refund·Return Window Pending/Completed**) · Segment/Subscription(Eligible·Ineligible·**Version Change**·Active/Trial/Past-due/Paused/Cancelled/Renewal Qualified) · Consent/Suppression/Fraud(**Marketing Consent 없음·권리 지급 가능·Communication Suppression·Reward Issuance Suppression**·Fraud Clear/Hold/Block·Manual Review·Legal Restriction) · Frequency/Limit(First·Daily/Monthly/Lifetime·Cooldown·**Pending 포함·Reversed 제외**·Global·Shared) · Referral/Shared(Referrer/Referee Eligible·**반전 차단**·Family/Organization·Authorized/Unauthorized·Duplicate Benefit·Shared Limit Exceeded) · Historical(Rule/Policy/Identity Version Snapshot·Historical Tier/Segment/Consent·Provider Match/Drift·**Missing Evidence/Cross-Tenant Block**).
**실 회귀 시드**: pg UNIQUE 중복 차단·Referral referrer≠referee·OrderHub 취소/환불·isMarketingSendAllowed·AnomalyDetection·ReturnsPortal return window — 즉시 Golden 등록 가능.
**Conformance(§51)**: Customer/Membership/Tier/Segment/Purchase/Payment/Product/Category/Merchant/Subscription/Referral/Region/Consent/Suppression/Fraud/Frequency/Shared Account Eligibility에 동일 Contract(Trigger·Rule/Policy/Identity Version·Condition·Result·Exclusion·Qualification·Historical Context·Dedup·Ordering·Reprocessing·Reconciliation·Coverage·Evidence·Audit).
**Legacy Equivalence(§52)**: 기존 Consent 게이트·Fraud·Segment·Event(EventNorm/pg)·Referral 결과와 Trigger/Eligible/Not Eligible/Conditional/Qualification/Duplicate/Late/Fraud Hold/Limit/Shared·Exclusion·Version·Historical·Error·Warning·Latency·Audit 비교. **UNEXPLAINED·잘못된 Customer·Cross-Tenant→전환차단**.

## 9. 기존 구현 분류 (§53) · 중복 감사 (§54)

| 구현 | 분류 | 근거 |
|---|---|---|
| `EventNorm`·`raw_vendor_event`·PixelTracking | **VALIDATED_LEGACY** | Canonical event 정규화·event store. Trigger Event ingestion 재사용 |
| pg_settlement/Referral/coupon_redemptions UNIQUE | **VALIDATED_LEGACY(Idempotency 정본)** | §4.4 중복 자격 방지 실 패턴 |
| `isMarketingSendAllowed`/`email_suppression`/`Compliance`/`PreferenceCenter`/crm_channel_prefs | **VALIDATED_LEGACY** | Consent/Suppression(**Communication 중심**·Financial Entitlement 구분 신설) |
| `AnomalyDetection`/DataTrust | **VALIDATED_LEGACY** | Fraud eligibility(Hold≠Block·신호 원문 미복제) |
| `crm_segments`/`crm_segment_members`·`RuleEngine` | **VALIDATED_LEGACY** | Segment/조건 평가(segment version 부재 SEG-H4 GAP) |
| `OrderHub`/`Paddle`/`referral_signup`/`ReturnsPortal`/kr return_fee | **VALIDATED_LEGACY** | Trigger source object(order/payment/subscription/referral/return window) |
| Cashback Eligibility Policy/Evaluation/Condition/Qualification/Progress·Trigger Event Registry(cashback)·Event Version/Ordering/Late/Reprocessing·Eligibility Context Snapshot | **UNVERIFIED → NOT_APPLICABLE** | 부재(grep 0)·신설 |

**중복 감사(§54)**: **Event 정규화=EventNorm 단일·Idempotency=UNIQUE 정본·Consent=isMarketingSendAllowed 중앙 게이트·Fraud=AnomalyDetection·Segment=crm_segments**. ★도입 시 **Provider별 독립 Eligibility Model 금지·기존 EventNorm/Consent/Fraud/Segment 재사용(중복 엔진 금지)·Communication Suppression↔Financial Entitlement Suppression 오혼용 금지**.

## 10. 기능 후퇴 방지 · 검증 게이트 (§60) · 영구 규칙

**후퇴 방지**: EventNorm·raw_vendor_event·isMarketingSendAllowed·email_suppression·AnomalyDetection·crm_segments·OrderHub·Paddle·referral_signup·ReturnsPortal·`/coupon/*`·Existing Rule/Event/Fraud/Segment/Consent/Referral 기능 보존(회귀 0).
**게이트(§60)**: Eligibility Policy/Version·각 Condition 입력/결과 보존·**Eligibility≠Qualification**·Trigger Canonical Type·**Event Time≠Received Time**·Schema/Signature/Scope 검증·**Idempotency/Dedup**·Out-of-order/Late/Reprocessing(중복 방지)·**Identity/Tier/Segment/Subscription Version 보존**·Purchase/Payment/Refund 상태·**Consent≠Suppression·Communication Suppression≠Reward Issuance Suppression·Fraud Hold≠Block**·Shared Account Scope·Referrer≠Referee·Candidate 판단근거·Reconciliation·Coverage/Gap/Evidence·Lint/Guard·**기존 Engine 중복 없음**·회귀 0·ADR/PM/Repeat Problem/Agent History.
**영구 규칙(§63)**: 신규 Cashback Eligibility 도입 전 **기존 EventNorm/Idempotency/Consent/Suppression/Fraud/Segment 재사용(중복 엔진 금지)** · **Eligibility/Qualification/Trigger Event/Accrual 별도 Lifecycle** · Trigger 수신≠자격 확정 · Canonical Trigger Type(EventNorm) · Event Time≠Received Time · Idempotency/Dedup(Duplicate 삭제 금지·Group 기록) · Out-of-order/Late/Reprocessing 중복 Accrual 차단 · **당시 Version Snapshot 보존(현재 State 재계산 금지)** · Condition 입력/결과 보존 · Order Cancelled/Payment Failed/Refund/Chargeback 반영·Return Window 전 확정 금지 · **Marketing Consent 없다고 계약 권리 자동 차단 금지·Financial Entitlement 구분·Communication Suppression≠Reward Issuance Suppression** · **Fraud Hold≠Block** · Referrer≠Referee 독립 평가 · Shared Account Limit(개인 자동 계산 금지) · Reconciliation/Coverage · Lint/Guard · 중복/후퇴 검사 · ADR/PM 기록. **Communication Suppression↔Financial Entitlement·현재 State↔Historical Context·Provider별 독립 Eligibility Model 오혼입/중복 금지.**

## 11. Trigger Event Matrix (§58) — 현행

| Event | Source Object | Event Time | Received Time | Sequence | Duplicate | Late | Validation | Processing | Status |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Trigger) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 인접(재사용): PG 정산 | pg_settlement(txn_id) | txn_at | created_at | N/A | UNIQUE 차단 | N/A | provider resp | upsert | inbound settled |
| 인접: 추천 전환 | referral_signup | 가입시점 | 가입시점 | N/A | referred UNIQUE | N/A | isSubscriber | applyOnSignup | granted |
