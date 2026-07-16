# CANONICAL DSAR — Rebate Eligibility & Qualification (Eligibility·Criteria·Qualification·Measurement·Holdback·Maturity·Disqualification·Evaluation)

> EPIC 06-A Rebate 실행계층 선행설계 R2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Eligibility/Criteria/Qualification/Holdback/Maturity/Disqualification/Evaluation) + [`CANONICAL_DSAR_REBATE_PARTICIPANT_ENROLLMENT_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_PARTICIPANT_ENROLLMENT_GOVERNANCE.md)(Participant/Enrollment/Registration/Verification/Status/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_ELIGIBILITY_QUALIFICATION_ENROLLMENT.md`](../architecture/ADR_DSAR_REBATE_ELIGIBILITY_QUALIFICATION_ENROLLMENT.md).
> 선행: Program Master(4-5-3-1-1 **Participant/Beneficiary/Claimant Scope**)·Type(4-5-3-1-2)·Funding(4-5-3-1-3)·Lifecycle/Versioning(4-5-3-1-4 as-of·in-flight pinning)·**Rule/Tier/Calculation(선행설계 R1 §21 QUALIFICATION Threshold 위임 수령)**·**Segmentation Eligibility Engine(3-2·Unknown≠Eligible Fail-closed)**.
> **범위**: 자격/조건 달성 **판정**만 — Accrual 생성/Claim 승인/Settlement/Payout/Recovery 실행 아님(후속 선행설계 R3~R5). **중복 구현 금지.**

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Eligibility / Qualification / Participant 엔진** | ❌ **부재(grep 0)** — `rebate_eligib/rebate_particip` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **★보상 자격 3단 게이트(실 정본)** | ✅ **REAL** — `Referral`: **PAID_TIERS 구독자 자격**([Referral.php:28](../../backend/src/Handlers/Referral.php)/78·미달 시 `eligible:false` :155-156) → **발급 즉시 잠금 `usable_from = now + RETAIN_DAYS(30)`**(:32/253) → **CouponRedeem이 usable_from + 피추천 활성 여부 이중 검증**(:250-252) → **미유지 시 영구 잠금**("1개월만 쓰고 탈퇴하면 영구 잠금") | **재사용(§20 Holdback·§21 Maturity·§4.2 정본)** |
| **중복 수혜 방지(원자성)** | ✅ **REAL** — **`referral_signup.referred_user_id UNIQUE` + 멱등**("피추천자 1명당 정확히 1회만 보상"·[Referral.php:16](../../backend/src/Handlers/Referral.php)/51/65) · **CouponRedeem `use_count < max_uses` 조건부 UPDATE + rowCount 원자화**([CouponRedeem.php:136](../../backend/src/Handlers/CouponRedeem.php)·"사전체크는 빠른 실패용"·:20/84-85) | **재사용(§25 Duplicate Guard·TOCTOU 정본)** |
| **Enrollment(참여 등록) Store** | ✅ **REAL** — `journey_enrollments`(tenant_id·journey_id·customer_id·session_id·current_node·**status DEFAULT 'active'**·entered_at·completed_at·revenue·[JourneyBuilder.php:42](../../backend/src/Handlers/JourneyBuilder.php)/68·상태별 집계 :243·INSERT :201) | **재사용(Enrollment 문서 §30)** |
| **중앙 자격 게이트(단일 SSOT)** | ✅ **REAL** — `CRM::isMarketingSendAllowed`([CRM.php:1118](../../backend/src/Handlers/CRM.php)·옵트아웃+suppression+quiet+빈도 단일 게이트·Segmentation Eligibility Engine 3-2 정본) | **KEEP_SEPARATE(마케팅 발송 자격≠rebate 자격)·원칙 계승(Unknown≠Eligible·Fail-closed·중앙 단일 게이트)** |
| **자격 무효화 플래그** | ✅ **REAL** — free_coupons `is_revoked`(CouponRedeem.php:64 거부)·`valid_until` 만료(:67-68·NULL=무기한) | **재사용(§23 Disqualification·§4.8)** |
| **Fraud/Abuse 판정** | △ `AnomalyDetection`(4-5-3-1-3 Claim Fraud 인접) | **참조(§24 Abuse Guard)** |
| **Rebate Eligibility Criteria/Qualification/Measurement/Holdback(rebate)/Maturity/Disqualification/Retroactive Eligibility/Evaluation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Eligibility/Qualification 엔진은 부재(NOT_APPLICABLE·grep 0)**. 그러나 **"자격→조건달성→가용" 3단 게이트의 실 정본이 Referral에 존재**: 구독자 자격(PAID_TIERS) → **발급 즉시 잠금(usable_from=+30일)** → **유지조건 이중검증(usable_from + 피추천 활성)** → 미충족 시 영구 잠금. **★핵심 정직: §4.1 Eligibility≠Qualification(참여 가능≠조건 달성)·§4.2 Qualification≠Accrual≠Availability(Referral 정본·Cashback 4-5-2-3 Pending≠Available 대칭)·§4.3 Enrollment≠Eligibility·§4.5 Unknown≠Eligible(Fail-closed·3-2 계승)·§4.6 Holdback/Maturity(Sell-through 확인 전 미확정)**. **기존 isMarketingSendAllowed(KEEP_SEPARATE·중복 게이트 신설 금지)·Referral 잠금 패턴·CouponRedeem 원자성 재사용(중복 금지·§40)**. 지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **Referral의 "미충족 시 영구 잠금"은 Clawback(회수)이 아니라 Availability 차단**(발급된 쿠폰을 회수/역분개하지 않고 usable_from 잠금 유지) — **§4.8 Disqualification≠Clawback의 실 사례**. Rebate도 **미확정 단계 미충족=지급 차단(음수 지급/회수 아님)**·확정 후 사후 취소만 Recovery(선행설계 R5 후속).
- **Referral 자격은 "발급 시점"과 "리딤 시점" 두 번 평가된다**(발급 시 isSubscriber·리딤 시 usable_from+피추천 활성 재검증·:250-252) — **§4.11 as-of 평가·§22 재평가 시점 계약의 실 근거**(1회 평가 후 영구 신뢰 금지).

---

## 1. Canonical Entity (18) — §5 (이번 블록)

REBATE_ELIGIBILITY_POLICY·ELIGIBILITY_CRITERION·ELIGIBILITY_EVALUATION·QUALIFICATION_DEFINITION·QUALIFICATION_MEASUREMENT·QUALIFICATION_PROGRESS·QUALIFICATION_ACHIEVEMENT·HOLDBACK_POLICY·MATURITY_POLICY·MATURITY_TRACKER·DISQUALIFICATION·DISQUALIFICATION_REASON·RETROACTIVE_ELIGIBILITY_POLICY·ABUSE_GUARD·ELIGIBILITY_DECISION·ELIGIBILITY_RECONCILIATION·ELIGIBILITY_EVIDENCE·ELIGIBILITY_AUDIT_EVENT.
**후속 블록(선행설계 R3~R5)**: ACCRUAL·CLAIM·SETTLEMENT·PAYOUT·RECOVERY/CLAWBACK(**이번 블록 중복 구현 금지·Reference Field만 준비**).
**현행 실체**: 자격 게이트(Referral PAID_TIERS)·Holdback(usable_from 잠금)·Maturity(RETAIN_DAYS+활성 재검증)·중복 방지(UNIQUE+조건부 UPDATE rowCount)·무효화(is_revoked/valid_until)·중앙 게이트(isMarketingSendAllowed·KEEP_SEPARATE) = REAL 재사용/참조. 나머지 = **신설**.

## 2. Eligibility Policy (§18) · Criterion (§19) ★Eligibility≠Qualification

- **Policy(§18)**: eligibility_policy_id·program·**program version pin·participant type·enrollment 요구 여부(§4.3)·criteria set·평가 시점(§22)·기본 동작(no-match)·retroactive policy·재평가 주기**·effective_from/to·approval·status·evidence. **★no-match 기본=INELIGIBLE(fail-closed·Unknown≠Eligible·3-2 계승·선행설계 R1 §6b no-match 기본 지급 금지 정합)**.
- **Criterion(§19, 18)**: PARTICIPANT_TYPE·CONTRACT_ACTIVE·ENROLLMENT_REQUIRED·**SUBSCRIPTION/PLAN_TIER**(현행 인접: Referral PAID_TIERS·Referral.php:28/78)·ACCOUNT_STANDING·CREDIT_STANDING·PAYMENT_TERM_COMPLIANCE·MINIMUM_PURCHASE·MINIMUM_PERIOD·PRODUCT/CATEGORY_SCOPE·CHANNEL_SCOPE·REGION/COUNTRY·LEGAL_ENTITY·CERTIFICATION/TRAINING·**RETENTION**(현행 정본: RETAIN_DAYS 30·:32)·NO_ACTIVE_DISPUTE·NOT_SUSPENDED·CUSTOM. 필드: criterion_id·policy·**criterion_type·operator(선행설계 R1 §8 화이트리스트 재사용)·operand(Canonical Reference)·value·unit·as-of source·required/optional·weight**·evidence.
**★§4.1 Eligibility≠Qualification — Eligibility=참여 가능 여부(정적·사전·자격 요건)·Qualification=실적/조건 달성(동적·사후·§20)**. 자격 있어도 실적 미달=미지급·실적 달성해도 자격 없음=미지급(**둘 다 필요·어느 하나로 다른 하나 추정 금지**).

## 3. Qualification (§20) · Measurement (§20b) · Progress (§20c)

- **Qualification Definition(§20)**: qualification_definition_id·program·rule/tier reference(**선행설계 R1 §21 QUALIFICATION Threshold 연결·재정의 금지**)·**measurement basis(선행설계 R1 §23 Basis Binding 재사용·Gross/Net·취소반품 제외·VAT)·measurement window(§25b 재사용)·threshold·달성 판정 시점·부분 달성 처리·미달 시 동작(ZERO/CARRY_FORWARD/REJECT)**·evidence.
- **Measurement(§20b)**: qualification_measurement_id·participant·definition·**window·측정값(Decimal·★Float 금지)·input snapshot reference(선행설계 R1 §13b 불변)·source·trust/freshness·measured_at·as-of**·evidence. **★Stale 입력 판정 금지(comp_max_age_hours 패턴·헌법 Vol3 Trust READY)**.
- **Progress(§20c)**: 진행률(현재 실적/임계)·예상 도달 Tier·**표시용 진행률과 확정 실적 구분(§4.2 — 진행률은 Accrual 근거 아님)**·다음 Tier까지 잔여.
**★§4.2 Qualification≠Accrual≠Availability** — 조건 달성 판정이 곧 지급 가능이 아니다(**Holdback/Maturity(§20~§21) 통과 후 Available**·Cashback 4-5-2-3 Pending≠Available·Approval≠Availability 대칭).

## 4. ★Holdback (§20d) · Maturity (§21) — Referral 정본 승격

- **Holdback Policy(§20d)**: holdback_policy_id·program·**holdback_type·holdback 기간/비율·잠금 해제 조건·해제 시 동작·미충족 시 동작(§4.8)**·evidence. Type(8): RETENTION_PERIOD·SELL_THROUGH_CONFIRMATION·RETURN_WINDOW·PAYMENT_RECEIPT·CONTRACT_MILESTONE·AUDIT_CLEARANCE·DISPUTE_RESOLUTION·CUSTOM. **★현행 정본 재사용**: Referral **`usable_from = now + RETAIN_DAYS(30)`**(발급 즉시 잠금·Referral.php:253)·"먹튀방지"(:32/250).
- **Maturity Policy(§21)**: maturity_policy_id·holdback·**성숙 조건(기간 경과 + 상태 유지)·재검증 항목·성숙 판정 시점·성숙 실패 시 동작**·evidence. **★현행 정본 재사용**: **CouponRedeem이 `usable_from` + 피추천 활성 여부를 이중 검증**(Referral.php:250-252) — **기간 경과만으로 성숙 아님(상태 유지 재검증 필수)**. Rebate: **Sell-through 미확인·반품 창 미경과·정산 미수령 상태에서 Available 전환 금지**.
- **Maturity Tracker(§21b)**: participant·holdback·**locked_until·재검증 결과 이력·현재 상태(LOCKED/MATURING/MATURED/FAILED_PERMANENT)**·evidence. **★"1개월만 쓰고 탈퇴하면 영구 잠금"(Referral.php:252) = FAILED_PERMANENT 실 정본**.

## 5. Disqualification (§23) · Retroactive Eligibility (§22b) · Abuse Guard (§24)

- **Disqualification(§23)**: disqualification_id·participant·program·**reason·감지 시점·적용 범위(전체/특정 기간/특정 거래)·기 발생 Accrual 처리(BLOCK_FUTURE_ONLY/BLOCK_PENDING/RECOVER)·가역 여부·복권 조건·approval**·evidence. Reason(12): NOT_ELIGIBLE_AT_AS_OF·CONTRACT_TERMINATED·PLAN_DOWNGRADED·RETENTION_FAILED·FRAUD_DETECTED·ABUSE_DETECTED·DUPLICATE_PARTICIPATION·PAYMENT_DEFAULT·DISPUTE_OPEN·COMPLIANCE_BLOCK·**REVOKED**(현행 인접: free_coupons `is_revoked`·CouponRedeem.php:64)·**EXPIRED**(valid_until·:67-68). **★§4.8 Disqualification≠Termination≠Clawback** — 미확정 단계 미충족=**Availability 차단(음수 지급/회수 아님·Referral 영구 잠금 정본)**·확정 후 사후 취소만 Recovery/Clawback(선행설계 R5 후속·**본 블록에서 Recovery 구현 금지**).
- **Retroactive Eligibility(§22b)**: retroactive_policy_id·program·**Enrollment 이전 거래 인정 여부·소급 인정 기간·소급 판정 as-of Version·승인**·evidence. **★소급 인정 여부 미지정 시 기본=인정 안 함(fail-closed)·소급 인정 시 반드시 as-of Version 사용(현재 Rule로 과거 재계산 금지·4-5-3-1-4 §32 계승)**.
- **Abuse Guard(§24, 9)**: SELF_DEALING(자기 추천/자기 거래)·CIRCULAR_PARTICIPATION·DUPLICATE_IDENTITY·**CHURN_AND_RETURN**(현행 정본: Referral 먹튀방지·:32/250-252)·WASH_TRADING·RETURN_ABUSE·THRESHOLD_GAMING(임계 직전 인위적 거래)·COLLUSION·CUSTOM. → AnomalyDetection 재사용(4-5-3-1-3 Claim Fraud 정합)·**Guard 발동 시 자동 지급 금지→Manual Review(헌법 Vol3 신뢰도 미달 시 자동화 제외 정합)**.

## 6. Evaluation (§22) · 재평가 시점 ★as-of·1회 평가 영구신뢰 금지

- **Evaluation(§22)**: eligibility_evaluation_id·participant·policy·**pinned program/rule version·evaluated_at·as-of date·criteria별 판정(충족/미충족/UNKNOWN)·종합 결과(ELIGIBLE/INELIGIBLE/PENDING_VERIFICATION/UNKNOWN)·미충족 사유·input snapshot·trace·idempotency_key**·evidence. **★UNKNOWN=INELIGIBLE 취급(fail-closed·3-2 계승)·판정 근거(criteria별 실측값·임계·연산자) 없는 Accrual 금지**(선행설계 R1 §13 rule_engine_log 정본 계승).
- **평가 시점(§22a, 6)**: AT_ENROLLMENT·AT_TRANSACTION(as-of 거래 시점)·AT_QUALIFICATION·**AT_AVAILABILITY(성숙 재검증)**·AT_CLAIM·PERIODIC. **★현행 정본 재사용**: Referral이 **발급 시점(isSubscriber)과 리딤 시점(usable_from+피추천 활성) 두 번 평가**(:155/250-252) = **1회 평가 후 영구 신뢰 금지**. Rebate: **거래 시점 자격(as-of)과 지급 시점 자격을 각각 평가·둘 중 하나로 다른 하나 대체 금지**.

## 7. Eligibility Matrix (§43) · Qualification Matrix (§44) — 현행

| Program | Participant | Eligibility 기준 | 평가 시점 | Holdback | Maturity 재검증 | 미충족 시 | 중복 방지 | Evidence |
|---|---|---|---|---|---|---|---|---|
| (Rebate Eligibility) | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| **인접(정본): 추천보상** | referrer(구독자) | **PAID_TIERS isSubscriber**(:78) | **발급 + 리딤 2회**(:155/250) | **usable_from=+30일**(:253) | **usable_from + 피추천 활성 이중검증**(:252) | **영구 잠금(회수 아님)** | **referred_user_id UNIQUE + 멱등**(:16/51) | referral_signup |
| 인접(재사용): 쿠폰 리딤 | 쿠폰 보유자 | is_revoked·valid_until·usable_from | 리딤 시 | usable_from | N/A | 거부(4xx) | **use_count<max_uses 조건부 UPDATE + rowCount**(:136) | free_coupons |
| 인접(재사용): 저니 | customer | (저니 조건) | 진입 시 | N/A | N/A | 미진입 | N/A | journey_enrollments(status) |
| 인접(KEEP_SEPARATE): 마케팅 발송 | customer | **isMarketingSendAllowed**(옵트아웃+suppression+quiet+빈도) | 발송 시 | quiet defer | N/A | 차단 | N/A | CRM(:1118) |
