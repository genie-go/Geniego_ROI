# CANONICAL DSAR — Cashback Eligibility & Qualification Model (Profile·Policy·Condition·Evaluation·Qualification·Exclusion)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-2-2 · 289차(2026-07-16) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Eligibility/Policy/Condition/Qualification) + [`CANONICAL_DSAR_CASHBACK_TRIGGER_EVENT_GOVERNANCE.md`](CANONICAL_DSAR_CASHBACK_TRIGGER_EVENT_GOVERNANCE.md)(Trigger Event·Ingestion·Dedup·Ordering·Late·Reprocessing·Context·Guard·Test).
> ADR: [`../architecture/ADR_DSAR_CASHBACK_ELIGIBILITY_TRIGGER_GOVERNANCE.md`](../architecture/ADR_DSAR_CASHBACK_ELIGIBILITY_TRIGGER_GOVERNANCE.md).
> 선행: Cashback Program/Rule Registry(4-5-2-1)·Identity(4-5-1-3)·Value(4-5-1-4)·Consent/Suppression(EPIC06 Part1)·Segmentation.
> **범위**: Cashback 금액 적립/지급 아님 — 자격·조건 충족·Trigger Event **판단 기반**(다음 Part 4-5-2-3 Accrual).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Cashback Eligibility / Qualification 엔진** | ❌ **부재(grep 0)** — `cashback eligib` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Idempotency / 중복 자격 방지** | ✅ **REAL 정본** — `pg_settlement` UNIQUE(tenant,provider,txn_id)·`Referral` referred_user_id UNIQUE·coupon_redemptions UNIQUE(coupon,user) | **VALIDATED_LEGACY**(§4.4 중복 방지 정본 계승) |
| **Trigger Event 정규화 / Event Store** | ✅ **REAL** — `EventNorm`(canonical event 정규화)·`raw_vendor_event`·`PixelTracking`(events)·Paddle/ChannelSync webhook | **VALIDATED_LEGACY**(Trigger Event ingestion·canonical type 참조) |
| **Consent / Suppression** | △ **REAL(Communication 중심)** — `isMarketingSendAllowed`(중앙 게이트)·`email_suppression`·`crm_channel_prefs`·`Compliance`·`PreferenceCenter` | **VALIDATED_LEGACY** · **★Financial Entitlement Suppression(cashback 권리) 구분 부재=GAP(§4.7·4.8)** |
| **Fraud Eligibility** | △ **REAL 인접** — `AnomalyDetection`·DataTrust(V3 신뢰검증) | **VALIDATED_LEGACY**(Fraud Hold≠Block §4.9·신호 원문 미복제) |
| **Segment / Rule Evaluation** | △ **REAL 인접** — `crm_segments`/`crm_segment_members`(segment version 부재 SEG-H4)·`RuleEngine`(자동화 규칙) | **VALIDATED_LEGACY**(Segment/조건 평가 참조·segment version GAP) |
| **Order/Payment/Subscription/Referral/Return Window Event** | ✅ **REAL** — `channel_orders`/`OrderHub`·`pg_settlement`·`Paddle`·`referral_signup`·`ReturnsPortal`(return window)·kr_settlement_line return_fee | **VALIDATED_LEGACY**(Trigger source object) |
| **Eligibility Policy/Condition/Evaluation/Result/Exclusion·Qualification/Progress/Milestone·Eligibility Context Snapshot·Event Version/Ordering/Late/Reprocessing** | ❌ 부재(cashback-specific) | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Cashback Eligibility/Qualification 엔진은 부재(NOT_APPLICABLE)**. 그러나 판단 재료의 **실 인접 엔진이 풍부**: Idempotency(pg/Referral UNIQUE·**중복 방지 정본**)·Event 정규화(EventNorm·raw_vendor_event)·Consent/Suppression(isMarketingSendAllowed·email_suppression·**Communication 중심**)·Fraud(AnomalyDetection)·Segment(crm_segments)·Order/Payment/Subscription/Referral/Return(OrderHub/pg/Paddle/referral_signup/ReturnsPortal). **★핵심 정직: 현행 consent/suppression은 Communication(마케팅 발송) 중심 → §4.7/4.8 Financial Entitlement Suppression(cashback 권리) 구분 부재=GAP → Marketing Consent 없다고 cashback 계약 권리 자동 차단 금지·Communication Suppression≠Reward Issuance Suppression**. **기존 EventNorm/Idempotency/Consent/Fraud/Segment 재사용(중복 엔진 금지)**·지어내기·NO_DATA/오탐 금지·본 Eligibility=멀티테넌트 고객용 미래 cashback 전방호환 계약.

---

## 1. Canonical Entity (26) — §5

CASHBACK_ELIGIBILITY_PROFILE·POLICY·POLICY_VERSION·CONDITION·EVALUATION·CONDITION_RESULT·DECISION·EXCLUSION·QUALIFICATION·QUALIFICATION_PROGRESS·QUALIFICATION_MILESTONE·TRIGGER_EVENT·TRIGGER_EVENT_VERSION·TRIGGER_EVENT_INGESTION·TRIGGER_EVENT_VALIDATION·TRIGGER_EVENT_DUPLICATE_GROUP·TRIGGER_EVENT_ORDERING·LATE_TRIGGER_EVENT·TRIGGER_REPROCESSING·ELIGIBILITY_CONTEXT·ELIGIBILITY_CANDIDATE·ELIGIBILITY_RECONCILIATION·ELIGIBILITY_COVERAGE·ELIGIBILITY_GAP·ELIGIBILITY_EVIDENCE·ELIGIBILITY_AUDIT_EVENT.
**현행 실체**: TRIGGER_EVENT(EventNorm/raw_vendor_event)·Idempotency(pg/Referral UNIQUE)·CONDITION(Consent/Fraud/Segment 인접) = REAL. 나머지 = **신설**.

## 2. Eligibility Profile (§6) · Policy (§7) · Version (§8)

- **Profile(§6)**: cashback_eligibility_profile_id·provider/account·program·tenant·brand·store/merchant·legal_entity·environment·supported trigger types/eligibility conditions/qualification types·**event source/deduplication/ordering/late event/reprocessing model·identity/segment/consent/suppression/fraud/shared account model**·historical coverage·source of truth·owner·version·status·evidence. → 부재·신설.
- **Policy(§7)**: eligibility_policy_id·cashback rule·name·**policy type·subject type·logical operator·condition references·exclusion references·evaluation timing·reevaluation policy·manual review policy**·valid from/to·timezone·status·version·owner·evidence. Type(22): CUSTOMER·MEMBERSHIP·SEGMENT·SUBSCRIPTION·PURCHASE·PAYMENT·PRODUCT·CATEGORY·MERCHANT·STORE·REGION·COUNTRY·REFERRAL·TIER·FREQUENCY·LIMIT·CONSENT·SUPPRESSION·FRAUD·SHARED_ACCOUNT·COMPOSITE·CUSTOM. Operator(8): ALL·ANY·NONE·AT_LEAST·EXACTLY·WEIGHTED·EXPRESSION·CUSTOM.
- **Policy Version(§8)**: policy version id·policy·previous·**changed conditions/exclusions/logical operator·effective from/to·affected rules·affected pending evaluations·migration behavior·rollback reference**·actor·approval·evidence.
→ 부재·신설. **현행 인접**: RuleEngine(logical rule·자동화)·crm_segments(segment 조건). **★§4.1 Eligibility(대상 가능)≠Qualification(조건 충족 진행)**.

## 3. Condition (§9) · Evaluation (§10·§11) · Result (§12) · Exclusion (§13)

- **Condition(§9)**: condition_id·policy·**condition type·data source·field reference·operator·expected value reference·comparison currency·timezone·null behavior·stale data behavior·condition priority**·valid from/to·version·evidence. Operator(20): EQUALS·NOT_EQUALS·IN·NOT_IN·GREATER_THAN(_OR_EQUAL)·LESS_THAN(_OR_EQUAL)·BETWEEN·EXISTS·NOT_EXISTS·CONTAINS·MATCHES·BEFORE·AFTER·WITHIN_WINDOW·COUNT_AT_LEAST·SUM_AT_LEAST·FIRST_OCCURRENCE·CUSTOM.
- **Evaluation(§10)**: eligibility_evaluation_id·subject identity·reward account·program·rule·**rule version·policy·policy version·trigger event·evaluation context·evaluated_at·effective_at·identity/membership/segment/subscription/consent/suppression/fraud version·limit/budget snapshot·result·confidence·exclusion reasons·manual review requirement**·evidence.
- **Result(§11, 22)**: ELIGIBLE·CONDITIONALLY_ELIGIBLE·NOT_ELIGIBLE·WAITING_TRIGGER/QUALIFICATION/PAYMENT/ORDER_COMPLETION/**RETURN_WINDOW**/SETTLEMENT/APPROVAL/DATA·LIMIT_REACHED·COOLDOWN_ACTIVE·CONSENT_BLOCKED·SUPPRESSED·**FRAUD_HOLD·FRAUD_BLOCKED**·SCOPE_MISMATCH·EXPIRED_POLICY·MANUAL_REVIEW·BLOCKED·UNKNOWN.
- **Condition Result(§12)**: condition result id·evaluation·condition·actual/expected value reference·**source timestamp·data freshness·result·reason·confidence**·evidence. Result(8): PASSED·FAILED·NOT_APPLICABLE·UNKNOWN·DATA_MISSING·DATA_STALE·CONFLICTED·MANUAL_REVIEW.
- **Exclusion Reason(§13, 37)**: WRONG_TENANT/BRAND/STORE/MERCHANT/REGION/COUNTRY·CUSTOMER/MEMBERSHIP_INACTIVE·TIER/SEGMENT_NOT_ELIGIBLE·SUBSCRIPTION_INACTIVE·FIRST_PURCHASE_REQUIRED·MINIMUM_PURCHASE_NOT_MET·PAYMENT_NOT_COMPLETED·PAYMENT_METHOD_NOT_ELIGIBLE·**ORDER_CANCELLED·ORDER_REFUNDED**·PRODUCT/CATEGORY/MERCHANT_EXCLUDED·EMPLOYEE_EXCLUDED·INTERNAL/TEST_ACCOUNT·**CONSENT_MISSING·SUPPRESSED·FRAUD_RISK**·PREVIOUS_CASHBACK_LIMIT·FREQUENCY_LIMIT·COOLDOWN_ACTIVE·ACCOUNT/GLOBAL_LIMIT·BUDGET_EXHAUSTED·**EVENT_DUPLICATE·EVENT_EXPIRED·RULE_EXPIRED**·OTHER.
**★§4.6 결과만 저장 금지(각 Condition 입력값·판단·데이터 시점·제외 이유 보존)·§4.9 Fraud Hold≠Not Eligible**. **현행 인접**: AnomalyDetection(fraud)·isMarketingSendAllowed(consent)·crm_segments(segment)·OrderHub(order/refund state)·kr return_fee(return window).

## 4. Qualification (§14·§15) · Progress (§16) · Milestone (§17)

- **Qualification(§14)**: cashback_qualification_id·subject·rule·eligibility evaluation·trigger event·**qualification type·required threshold·current progress·progress unit·started/updated/completed/expires_at**·status·milestone references·evidence. Type(15): SINGLE_EVENT·ORDER_COMPLETION·PAYMENT_SETTLEMENT·**RETURN_WINDOW_COMPLETION**·PURCHASE_AMOUNT·ORDER_COUNT·PRODUCT_QUANTITY·SUBSCRIPTION_RENEWAL·REFERRAL_CONVERSION·TIER_ACHIEVEMENT·MULTI_STEP·STREAK·TIME_BASED·MANUAL_APPROVAL·CUSTOM.
- **상태(§15, 14)**: NOT_STARTED·IN_PROGRESS·CONDITION_MET·COMPLETED·WAITING_CONFIRMATION·WAITING_RETURN_WINDOW·WAITING_SETTLEMENT·FAILED·CANCELLED·EXPIRED·REVOKED·MANUAL_REVIEW·BLOCKED·UNKNOWN.
- **Progress(§16)**: progress id·qualification·**progress source·source object·previous progress·progress delta·current/required progress·progress unit·recorded_at·event reference·correction**·evidence.
- **Milestone(§17)**: milestone id·qualification·milestone sequence·milestone type·threshold·completed_at·trigger event·reward impact·status·evidence.
→ 부재·신설. **★§4.2 Trigger 수신≠자격 확정(Return Window 전 확정 금지)**. 현행 인접: ReturnsPortal·pg_settlement(settlement)·Paddle(renewal).

## 5. Eligibility Domain 조건 (§29~§39)

Customer/Membership(§29)·Segment(§30·version 보존·holdout)·Subscription(§31)·Purchase(§32·Net Paid·Return Window)·Payment(§33·Authorized/Captured/Settled)·Region/Country(§34)·Referral(§35·**Referrer≠Referee**)·Frequency/Cooldown(§36·Pending/Reversed/Shared 포함 Version)·**Consent/Suppression(§37)**·Fraud(§38·CLEAR/HOLD/BLOCKED)·Shared Account(§39·Owner/Member/Household/Organization Limit·Duplicate Benefit Risk).
**★§37 Consent/Suppression 핵심(현행 GAP)**: Marketing Consent·Personalization Consent·**Financial Entitlement Processing·Contractual Processing** 구분 · Communication Suppression·**Reward Issuance Suppression**·Fraud Suppression·Legal Restriction 구분. **Cashback 권리≠프로모션 메시지 수신**. 현행 isMarketingSendAllowed/email_suppression=Communication 중심→Financial Entitlement 구분 신설. **§4.10 Shared Account 한도를 개인별로 자동 계산 금지**.

## 6. Eligibility Matrix (§57) · Qualification Matrix (§59) — 현행

| Subject | Rule | Trigger | Policy Version | Identity Version | Conditions | Exclusions | Qualification | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback 자격 평가) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): consent 게이트 | isMarketingSendAllowed | 발송시점 | 없음 | crm identity | consent/suppression | email_suppression | N/A | 발송 허용/차단(Communication) | crm_channel_prefs |

| Subject | Qualification | Required | Current | Milestones | Started | Completed | Expiry | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Cashback Qualification) | — | — | — | — | — | — | — | — | **N/A(신설)** |
| 인접: 추천 유지 | RETAIN(referredRetained) | 30일 유지 | usable_from | N/A | 발급 | 30일 경과+활성 | valid_until | granted→usable | referral_signup |
