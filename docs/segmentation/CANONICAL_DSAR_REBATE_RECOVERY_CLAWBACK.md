# CANONICAL DSAR — Rebate Recovery & Clawback (Recovery·Trigger·Type·Scope·Partial vs Full·Period Attribution·Entitlement·Netting·Execution)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-9 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0 · ★Rebate 9분할 최종**
> 정본 쌍: 본 문서(Recovery/Trigger/Type/Scope/Period/Entitlement/Netting/Execution) + [`CANONICAL_DSAR_REBATE_DISPUTE_RESOLUTION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_DISPUTE_RESOLUTION_GOVERNANCE.md)(Overpayment/Dispute/Chargeback/Write-off/Resolution/Closure/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_RECOVERY_CLAWBACK_DISPUTE.md`](../architecture/ADR_DSAR_REBATE_RECOVERY_CLAWBACK_DISPUTE.md).
> 선행: Funding(4-5-3-1-3 **§26 Recovery Responsibility**)·Lifecycle(4-5-3-1-4)·**Rule/Tier(4-5-3-1-5 §22b 하향 clawback 위임 수령)**·**Eligibility(4-5-3-1-6 §23 Disqualification≠Clawback 위임 수령)**·**Accrual/Ledger(4-5-3-1-7 §47 Reversal)**·**Claim/Payout(4-5-3-1-8 §67c Dispute·§77b Return 위임 수령)**·Cashback Reversal/Clawback(4-5-2-5).
> **범위**: 확정 지급 **이후**의 회수·분쟁만 — 발생/청구/정산/지급 실행 아님(4-5-3-1-7~8). **중복 구현 금지.**

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Recovery / Clawback / Overpayment / Write-off 엔진** | ❌ **부재(grep 0)** — `clawback/overpayment/write-off` 전무(단어 경계 확인·`recoup` 히트는 **`ensu**reCoup**onTables` 부분일치 오탐**) | **NOT_APPLICABLE → 신설(전방호환)** |
| **★Recovery Type 분류(실 정본)** | ✅ **REAL** — `Paddle::onRefunded` **`$action = 'full' \| 'partial' \| 'chargeback'`**([Paddle.php:705](../../backend/src/Handlers/Paddle.php))·**`$isFull = in_array($action, ['full','chargeback'], true)`**(:724·**chargeback을 full과 동일 취급=즉시 다운그레이드**) | **재사용(§82 Type·§4.5 Chargeback)** |
| **★Partial 과다역분개 방지(실 정본)** | ✅ **REAL** — **"[272차 H-P1] full/chargeback 환불 → platform_growth MRR 역분개(**partial 은 서비스 유지라 제외**)"**([Paddle.php:738](../../backend/src/Handlers/Paddle.php)·`AdminGrowth::recordChurn($db, $email, 'refund_'.$action)` :739) | **재사용(§83 Scope·★§4.3 정본)** |
| **★Entitlement 회수(실 정본)** | ✅ **REAL** — full/chargeback 시 `paddle_subscriptions.status='refunded'` + **`setUserPlan($db, $email, 'demo', null)`**(지급된 플랜 권한 회수·[Paddle.php:726-737](../../backend/src/Handlers/Paddle.php)) | **재사용(§85 Entitlement Recovery·§4.6)** |
| **★역분개 기간 귀속(실 정본)** | ✅ **REAL** — 활성→취소/반품 전이 시 **원주문 월 재롤업**(`$am = substr($existing['ordered_at'],0,7)`·`if (... && $am !== $curMonth) $affectedMonths[$am] = true;`·[ChannelSync.php:4401-4402](../../backend/src/Handlers/ChannelSync.php)) | **재사용(§84 Period Attribution·★§4.4 정본)** |
| **역분개 금액=원 거래 기준** | ✅ **REAL** — `$claimTotal = (float)($existing['total_price'] ?? 0);` **원주문 금액 우선**·payload는 폴백(:4403-4404)·recordClaim/recordCrmRefund에 동일 `$claimTotal` 전달(:4405/4407) | **재사용(§83b 금액 기준)** |
| **역분개 멱등·1회** | ✅ **REAL** — "활성→취소/반품 전이 **1회·멱등**"(CRM LTV 역분개 :4406-4407·`CLM-`/`CHR-`/order_id 키·4-5-3-1-7 §47) | **재사용(§88 Idempotency)** |
| **Disqualification≠Clawback(미확정 차단)** | ✅ **REAL** — Referral **영구 잠금**(발급 쿠폰 회수 없이 usable_from 잠금·4-5-3-1-6 §0 관찰)·free_coupons `is_revoked`(발급 후 무효화·CouponRedeem.php:64) | **재사용(§4.2 경계)** |
| **Fraud 판정** | △ AnomalyDetection(4-5-3-1-3/1-6 인접) | **참조(§81 Trigger)** |
| **Rebate Recovery Trigger/Scope/Netting/Write-off/Dispute Resolution/시효** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Recovery/Clawback 엔진은 부재(NOT_APPLICABLE·grep 0)**. 그러나 **사후 회수의 실 정본이 `Paddle::onRefunded`·`ChannelSync` 역분개에 존재**: Type 분류(full/partial/**chargeback**)·**partial 과다역분개 방지("서비스 유지라 제외")**·**Entitlement 회수(setUserPlan demo)**·**원 거래 기간 귀속(원주문 월 재롤업)**·원 거래 금액 기준·멱등 1회. **★핵심 정직: §4.1 Recovery≠Reversal(미확정 원장 정정≠확정 지급 후 회수)·§4.2 Recovery≠Disqualification(4-5-3-1-6 계승·미확정=차단·확정 후=회수)·★§4.3 Partial≠Full(과다역분개 금지)·★§4.4 회수는 원 거래 기간에 귀속(회수일 아님)·§4.9 Write-off≠회수 성공**. **기존 Paddle/ChannelSync 역분개 패턴 재사용(중복 금지·§40)**·지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **현행 refund는 전부 inbound 방향**(우리가 받은 돈을 돌려줌: Paddle 구독료·주문 취소) — **Rebate Recovery는 outbound로 나간 돈을 되받는 것**(4-5-3-1-8 §0 "outbound 지급 경로 자체 부재" 정합). **방향이 반대라 회수 수단도 다르다**(우리는 PG refund API를 쓸 수 없고 → **Netting(차기 지급 상계)·Debit Memo·직접 청구**가 주 수단·§86). **Paddle refund 경로를 Rebate Recovery로 복제 금지**.
- **`$isFull = in_array($action, ['full','chargeback'])`(Paddle.php:724)는 chargeback을 "분쟁"이 아니라 "확정된 전액 회수"로 취급** — Rebate에서도 **Chargeback≠Dispute(진행중 쟁송)**: chargeback은 외부(카드사/은행)가 이미 강제 집행한 **기정사실**(§4.5).

---

## 1. Canonical Entity (18) — §5 (이번 블록·최종)

REBATE_RECOVERY·RECOVERY_TRIGGER·RECOVERY_TYPE·RECOVERY_SCOPE·RECOVERY_AMOUNT_BASIS·RECOVERY_PERIOD_ATTRIBUTION·ENTITLEMENT_RECOVERY·RECOVERY_METHOD·NETTING_INSTRUCTION·RECOVERY_EXECUTION·RECOVERY_ATTEMPT·RECOVERY_SCHEDULE·RECOVERY_LIMITATION_POLICY·RECOVERY_APPROVAL·RECOVERY_LEDGER_LINK·RECOVERY_RECONCILIATION·RECOVERY_EVIDENCE·RECOVERY_AUDIT_EVENT.
**현행 실체**: Type(Paddle full/partial/chargeback)·Partial 제외(Paddle 272차)·Entitlement 회수(setUserPlan)·기간 귀속(ChannelSync 원주문 월)·금액 기준(원 거래)·멱등 1회 = REAL 재사용. Rebate Recovery 실체 = **신설**.

## 2. Recovery (§80) · Trigger (§81) · Type (§82) ★Recovery≠Reversal≠Disqualification

- **Recovery(§80)**: rebate_recovery_id·program·participant·**target payout/settlement/accrual reference·pinned version(4-5-3-1-4)·recovery_type·trigger·scope·recovery_amount(정수 minor unit 또는 Decimal·4-5-3-1-7 §43)·currency·FX reference·period attribution(§84)·method(§86)·approval reference·state·idempotency_key·ledger entry reference(4-5-3-1-7 §41b CLAWBACK_REFERENCE)**·evidence.
- **★§4.1 Recovery≠Reversal**: **Reversal**(4-5-3-1-7 §47)=**미확정/오기록 원장의 정정**(부호 반대 Entry)·**Recovery**=**확정·지급된 금전을 되받는 실행**(외부 상대방 관여·거절 가능·시효 존재). **★§4.2 Recovery≠Disqualification**(4-5-3-1-6 §23 위임 수령·**미확정 단계 미충족=Availability 차단(음수 지급/회수 아님·Referral 영구 잠금 정본)·확정 지급 후에만 Recovery**).
- **Trigger(§81, 12)**: RETURN/CANCELLATION(사후 반품)·**SELL_THROUGH_FAILURE**·QUALIFICATION_REVERSAL(하향·**4-5-3-1-5 §22b 위임 수령**)·CALCULATION_ERROR·DUPLICATE_PAYMENT·OVERPAYMENT·FRAUD_DETECTED(AnomalyDetection)·ELIGIBILITY_REVOKED·CONTRACT_BREACH·AUDIT_FINDING·**CHARGEBACK**(외부 강제)·PROVIDER_CORRECTION. **★Trigger 없는 Recovery 금지·Trigger별 근거(Evidence) 필수**.
- **Type(§82, 6)**: **FULL**·**PARTIAL**·**CHARGEBACK**(★현행 정본 재사용: Paddle `$action='full'|'partial'|'chargeback'`·Paddle.php:705)·TIER_DOWNGRADE_TRUE_UP(하향 차액)·CORRECTION_RECOVERY·WRITE_OFF_CANDIDATE(**회수 포기 후보·§4.9 — 회수 성공 아님**). **★§4.5 Chargeback≠Dispute** — chargeback은 외부(카드사/은행)가 **이미 강제 집행한 기정사실** → **현행 정본**: `$isFull = in_array($action, ['full','chargeback'], true)`(Paddle.php:724·**chargeback을 full과 동일 취급·즉시 반영**). 진행중 쟁송은 Dispute(짝 문서 §90).

## 3. ★Scope (§83) · Amount Basis (§83b) — Partial 과다역분개 방지

- **Scope(§83)**: recovery_scope_id·recovery·**대상 범위(전체 지급/특정 Accrual/특정 기간/특정 SKU·라인)·연쇄 효과 적용 여부(Entitlement/파생 지표/MRR·LTV 등)·부분 회수 시 제외 항목·근거**·evidence.
- **★§4.3 Partial≠Full — 부분 회수에 전체 효과를 적용하면 과다역분개**. **★현행 정본 재사용**: **"[272차 H-P1] full/chargeback 환불 → platform_growth MRR 역분개(**partial 은 서비스 유지라 제외**)"**(Paddle.php:738) — **부분 환불은 서비스가 유지되므로 MRR 전액 역분개 대상이 아니다**. **★Rebate 적용**: 부분 회수 시 **①금액만 부분 차감 ②Entitlement/Tier 자격/파생 지표는 재평가 후 적용(자동 전체 취소 금지) ③Tier 하향 여부는 재계산 결과로만 판정**(4-5-3-1-5 §22a Progression Model as-of). **부분 회수를 전체 취소로 처리 금지·전체 회수를 부분으로 축소 처리 금지**(4-5-3-1-3 "부분클레임 과다역분개" 정합).
- **Amount Basis(§83b)**: **회수 금액은 원 거래/원 지급 금액 기준** — **현행 정본**: `$claimTotal = (float)($existing['total_price'] ?? 0);`(**원주문 금액 우선**·payload는 폴백·ChannelSync.php:4403-4404)·동일 `$claimTotal`을 claim·CRM 역분개에 일관 전달(:4405/4407). **★현재 Rule/Version으로 회수액 재계산 금지 — as-of 원 지급 시점 Version 사용**(4-5-3-1-4 §32·4-5-3-1-5 §32 계승)·**FX는 원 지급 시점 rate version(회수 시점 환율로 재계산 금지·차액은 FX_ADJUSTMENT Entry)**.

## 4. ★Period Attribution (§84) · Entitlement Recovery (§85)

- **★Period Attribution(§84)**: **회수는 "원 거래/원 지급 기간"에 귀속** — 회수 실행일 기간이 아니다. **★현행 정본 재사용**: 활성→취소/반품 전이 시 **원주문 월을 재롤업 대상으로 표시**(`$am = substr($existing['ordered_at'], 0, 7);` · `if (preg_match('/^\d{4}-\d{2}$/', $am) && $am !== $curMonth) $affectedMonths[$am] = true;`·ChannelSync.php:4401-4402) = **과거 기간 지표를 정정하기 위해 그 기간을 다시 롤업**. **★Rebate: 회수를 당월 비용으로만 처리하면 원 기간 리베이트가 과대 잔존**(268차 avg_return_rate·263차 CRM LTV 역분개 정신 계승)·**회계 기간 마감 후 회수는 정책 명시(Prior Period Adjustment vs Current Period·4-5-3-1-2 §Accounting Nature 연결)**.
- **Entitlement Recovery(§85)**: entitlement_recovery_id·recovery·**회수 대상 혜택(플랜/등급/크레딧/쿠폰/포인트)·회수 방식·잔여 사용분 처리·소급 여부**·evidence. **★현행 정본 재사용**: full/chargeback 시 `paddle_subscriptions.status='refunded'` + **`setUserPlan($db, $email, 'demo', null)`**(**지급된 플랜 권한 즉시 회수**·Paddle.php:726-737). **★Rebate: 금전 회수와 혜택 회수는 별개 축**(금액은 회수했는데 Tier 혜택은 유지=손실·역도 성립)·**단 §4.3에 따라 부분 회수 시 자동 전체 혜택 회수 금지**.

## 5. Method (§86) · Netting (§86b) · Schedule·Limitation (§87)

- **Method(§86, 8)**: **NETTING**(차기 지급에서 상계·★outbound 주 수단·§0 관찰)·**DEBIT_MEMO**(4-5-3-1-8 §69b 연결·청구)·AP_AR_OFFSET·DIRECT_INVOICE·BANK_COLLECTION·CREDIT_MEMO_CANCELLATION(미사용 Credit Memo 취소)·ENTITLEMENT_ONLY(금전 회수 없음)·WRITE_OFF(**회수 포기·§4.9**). **★§0 관찰: Rebate는 outbound라 PG refund API를 쓸 수 없다 → Netting/Debit Memo가 현실적 주 수단·Paddle refund 경로 복제 금지**.
- **Netting(§86b)**: netting_instruction_id·recovery·**상계 대상 미래 Accrual/Payout·상계 한도(1회 지급의 N%)·잔여 회수액·상계 순서·참여자 통지**·evidence. **★상계도 Ledger Entry(4-5-3-1-7 §41b)·양방 동시 반영(4-5-3-1-8 §70 계승)·상계로 지급액이 음수가 되지 않도록 한도 필수·무통지 상계 금지**.
- **Schedule(§87a)**: 분할 회수·회수 일정·미이행 시 escalation. **Limitation(§87b)**: **회수 시효(계약/법정 기간)·회수 한도·소액 면제(minimum threshold)·시효 경과 시 WRITE_OFF 전환**. **★시효 경과 후 회수 시도 금지·시효 정책 미지정 시 회수 개시 금지(fail-closed)**.

## 6. Execution (§88) · Approval (§88b) — 4-5-3-1-8 계승

- **Execution(§88)**: recovery_execution_id·recovery·**attempt·요청/응답 reference·state·수행 프로세스·idempotency_key**·evidence. **★4-5-3-1-8 §72 정직 State 계승** — **외부 회수 미실행인데 RECOVERED 표기 금지(fake-looks-real·287/288차 재발 클래스)**·State: PENDING·NOT_EXECUTED_NO_METHOD·**NETTING_SCHEDULED**·EXECUTING(**in-flight·4-5-3-1-7 §53 잔액 포함**)·**RECOVERED**(실 회수 확인만)·**PARTIALLY_RECOVERED**·FAILED·**WRITTEN_OFF**(★회수 성공 아님·§4.9). **★멱등**: 활성→취소/반품 전이 **1회·멱등**(ChannelSync.php:4406-4407·`CLM-`/`CHR-`/order_id 키) 계승 — **중복 회수(이중 차감) 금지**.
- **Approval(§88b)**: 회수 개시 승인(4-5-3-1-4 §11 재사용)·**write-off는 별도 상위 승인**(손실 확정)·**참여자 통지 필수**(무통지 회수 금지·4-5-3-1-4 §24 UNFAVORABLE 통지 정합)·**분쟁 제기 경로 안내**(짝 문서 §90).
- **★Ledger(§88c)**: 회수도 **Append-only Entry**(4-5-3-1-7 §41b CLAWBACK_REFERENCE·**원 Payout Entry 삭제/수정 금지**·§4.7)·부분 회수는 부분 금액 Entry·**Entitlement 회수는 금전 Entry와 별개 기록**.

## 7. Recovery Matrix (§89) — 현행

| 회수 | Type | 부분 처리 | 기간 귀속 | 금액 기준 | Entitlement | 멱등 | 방향 | Evidence |
|---|---|---|---|---|---|---|---|---|
| (Rebate Recovery) | — | — | — | — | — | — | **outbound(신설)** | **NOT_APPLICABLE** |
| **인접(정본): Paddle 환불** | **full/partial/chargeback**(:705) | **★partial=MRR 역분개 제외("서비스 유지")**(:738) | (구독 기간) | adjustment totals | **★setUserPlan 'demo'**(:737) | webhook id | **inbound(복제 금지)** | Paddle(272차 H-P1) |
| **인접(정본): 주문 취소/반품** | 취소/반품 | claimTotal 기준 | **★원주문 월 재롤업**(:4401-4402) | **★원주문 total_price 우선**(:4403) | 재고/LTV 역분개 | **전이 1회·`CLM-`/`CHR-`**(:4406) | inbound | ChannelSync(263차) |
| 인접(경계): 추천 미충족 | — | — | — | — | **영구 잠금(회수 아님)** | — | — | Referral(4-5-3-1-6) |
| (Rebate Netting·Debit Memo·시효·Write-off) | — | — | — | — | — | — | — | **부재→신설** |
