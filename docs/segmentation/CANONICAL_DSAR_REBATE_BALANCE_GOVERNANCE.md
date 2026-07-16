# CANONICAL DSAR — Rebate Balance Governance (Balance·Aggregation·In-flight·Statement·Aging·Expiry·Reconciliation·Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-7 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_ACCRUAL_LEDGER.md`](CANONICAL_DSAR_REBATE_ACCRUAL_LEDGER.md)(Accrual/Ledger/Entry/State/Idempotency/Reservation/Reversal/Immutability) + 본 문서(Balance/Aggregation/In-flight/Statement/Aging/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_ACCRUAL_LEDGER_BALANCE.md`](../architecture/ADR_DSAR_REBATE_ACCRUAL_LEDGER_BALANCE.md).
> 선행: Funding(4-5-3-1-3 Commitment/Reservation)·Lifecycle(4-5-3-1-4)·Rule/Tier(4-5-3-1-5)·Eligibility(4-5-3-1-6 Holdback/Maturity).
> **범위**: 잔액 파생/집계/정합만 — Claim/Settlement/Payout/Recovery 실행 아님(후속 4-5-3-1-8~9).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Balance / Statement 엔진** | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 신설** |
| **★잔액=원장 집계(파생값) 정본** | ✅ **REAL** — `mtdCharged`가 **잔액을 저장하지 않고 원장 SUM으로 파생**(`SELECT COALESCE(SUM(amount),0) FROM ad_spend_ledger WHERE tenant_id=? AND ym=?`·[BillingMethod.php:449-451](../../backend/src/Handlers/BillingMethod.php)) | **재사용(§51 Balance=파생·§4.3 정본)** |
| **★★in-flight 상태 포함 의무(이중지급 방지)** | ✅ **REAL** — `status IN('charged','**pending**','**charging**','**reconciling**')`([:451](../../backend/src/Handlers/BillingMethod.php)) · 주석: **"★'charging'/'reconciling'(진행중 청구) 도 반드시 포함해야 한다 — 빠지면 동시 실행 프로세스가 '아직 아무것도 청구 안 됨'으로 읽고 같은 delta 를 다시 청구하려 든다(=이중청구의 원인이었다)"**(:445-447) | **재사용(§53 In-flight·★§4.4 정본)** |
| **회수 선행 순서** | ✅ **REAL** — **"방치된 선점 회수를 '누적액 계산 전에' 수행"**([:485](../../backend/src/Handlers/BillingMethod.php)·안 하면 크래시로 남은 charging 행이 누적액 왜곡) | **재사용(§54 계산 순서)** |
| **Budget/Cap 대비 잔여** | ✅ **REAL** — monthly_budget MTD cap·`SUM(budget) FROM auto_campaign WHERE status IN('active','pending','running')`(:437)·enforceBudgetCaps 97%(284차) | **재사용(§55 Cap 대비 잔여·4-5-3-1-5 §25c)** |
| **집계 정합 원칙(ratio-of-sums)** | ✅ **REAL** — Rollup avg_return_rate **average-of-ratios→ratio-of-sums 정정**(268차·저볼륨 허위경보 해소) | **참조(§52 Aggregation·평균의 평균 금지)** |
| **취소 제외 술어 SSOT** | ✅ **REAL** — 취소제외 **2축 통일**(Attribution 전환집합·배송비 OrderHub/Pnl·CRM affinity·286차) | **재사용(§52 Basis 정합·4-5-3-1-5 §23)** |
| **Aging / Expiry** | △ free_coupons `valid_until`(만료·CouponRedeem.php:67-68·NULL=무기한) | **참조(§57 Expiry)** |
| **Rebate Balance/State별 잔액/Statement/Aging/Reconciliation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Balance 엔진은 부재(NOT_APPLICABLE·grep 0)**. 그러나 **"잔액=원장 파생"과 "in-flight 포함 의무"의 실 정본이 `BillingMethod::mtdCharged`에 존재** — 그리고 그 주석은 **in-flight를 빠뜨린 것이 실제 이중청구의 원인이었다**고 명시(278차 이중청구 3중 방어). **★핵심 정직: §4.3 Balance=파생값(원장이 SSOT·독립 저장 시 재계산 검증 필수)·★§4.4 in-flight 상태 제외 금지(=이중지급 원인·실 사고 근거)·§4.5 회수 선행 후 집계·§4.6 평균의 평균 금지(ratio-of-sums)**. **기존 mtdCharged 패턴 재사용(중복 집계기 신설 금지·§40)**·지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **BillingMethod의 in-flight 포함은 "이중청구(inbound)" 방지였지만, Rebate에선 "이중지급(outbound)" 방지로 방향만 바뀌고 원리는 동일** — 진행중 지급을 잔액에서 빼지 않으면 **같은 금액을 두 번 지급**한다. 방향(inbound≠outbound)은 다르나 **불변식은 동일(§0 Ledger 문서 관찰과 정합)**.
- **현행 `mtdCharged`는 잔액을 캐시/컬럼에 저장하지 않는다**(매번 SUM) — Rebate에서 성능상 Balance Snapshot을 둘 경우 **원장 SUM과의 정합 검증(§56)이 필수**이며, **Snapshot을 SSOT로 승격 금지**.

---

## 1. Canonical Entity (14) — §5 (이번 블록)

REBATE_BALANCE_VIEW·BALANCE_BY_STATE·BALANCE_SNAPSHOT·AGGREGATION_DEFINITION·IN_FLIGHT_POLICY·BALANCE_STATEMENT·STATEMENT_LINE·AGING_BUCKET·EXPIRY_POLICY·CARRY_FORWARD_POLICY·BALANCE_RECONCILIATION·BALANCE_DISCREPANCY·BALANCE_EVIDENCE·BALANCE_AUDIT_EVENT.
**현행 실체**: Balance=원장 SUM 파생(mtdCharged)·in-flight 포함·회수 선행·Cap 대비 잔여(monthly_budget) = REAL 재사용. Statement/Aging/Snapshot/Reconciliation(rebate) = **신설**.

## 2. Balance (§51) · Aggregation (§52) ★Balance=파생값

- **Balance View(§51)**: **저장 엔티티가 아니라 원장 파생 View** — balance_view_id·ledger·participant·program·period·**currency·as-of timestamp·산출 정의(§52)·산출 근거 Entry 집합**. **★§4.3 Balance는 SSOT 아님 — 원장(Entry)이 SSOT**. **현행 정본**: `mtdCharged`가 잔액을 저장하지 않고 **매번 원장 SUM**(BillingMethod.php:449-451).
- **Aggregation Definition(§52)**: **포함 state 집합(§53)·포함 entry type·부호 규약·통화/FX 시점(4-5-3-1-5 §28a)·기간 경계·취소/반품 제외 술어(★현행 2축 SSOT 재사용·286차)·Gross/Net·VAT**·evidence. **★§4.6 평균의 평균 금지(ratio-of-sums)** — 비율 지표는 SUM(분자)/SUM(분모)(현행 정본: Rollup avg_return_rate 268차 정정). **★집계 정의 없는 Balance 표시 금지(무엇을 더했는지 불명=근거 없는 숫자·헌법 Vol4 Explainable)**.
- **Balance by State(§53b, 8)**: PENDING·RESERVED·ACCRUED·**LOCKED(Holdback)**·AVAILABLE·CLAIMED·SETTLED·PAID·REVERSED **각각 분리 표시**. **★§4.7 단일 "잔액" 숫자 금지 — 상태별 분리 필수**(Locked를 Available로 합산 표시=허위 가용잔액·4-5-3-1-6 §4.2 Qualification≠Availability 계승·Cashback 4-5-2-3 Pending≠Available 대칭).

## 3. ★In-flight Policy (§53) — mtdCharged 정본 승격

- **In-flight Policy(§53)**: in_flight_policy_id·aggregation·**포함 필수 state 목록·제외 금지 state 목록·근거**. **★§4.4 — 진행중(in-flight) 상태를 잔액 집계에서 제외 금지**.
- **★현행 정본(실 사고 근거)**: `mtdCharged`가 `status IN('charged','pending','charging','reconciling')`로 집계하며 주석이 명시 — **"★'charging'/'reconciling'(진행중 청구) 도 반드시 포함해야 한다 — 빠지면 동시 실행 프로세스가 '아직 아무것도 청구 안 됨'으로 읽고 같은 delta 를 다시 청구하려 든다(=이중청구의 원인이었다)"**(BillingMethod.php:445-447/451).
- **★Rebate 적용(방향만 반대·원리 동일)**: **진행중 지급(SETTLING)·예약(RESERVED)·청구중(CLAIMED)을 가용/잔여 계산에서 제외하면 같은 금액을 두 번 지급**. 따라서 **"지급 가능액 = 원장 SUM(AVAILABLE) − SUM(in-flight: RESERVED/CLAIMED/SETTLING)"을 계약으로 강제**·**Commitment 잔여도 동일**(4-5-3-1-3 §16 "Commitment 부족 시 Accrual 금지"가 in-flight 누락으로 무력화되지 않도록).
- **§54 계산 순서**: **①고아 선점 회수(Ledger §46) → ②잔액 집계** — **현행 정본**: "방치된 선점 회수를 **'누적액 계산 전에'** 수행"(BillingMethod.php:485·안 하면 크래시로 남은 charging 행이 누적액 왜곡). **★순서 역전 금지**.

## 4. Cap 대비 잔여 (§55) · Snapshot (§56) · Statement (§58)

- **Cap 대비 잔여(§55)**: 잔여 = **Cap/Commitment − (확정 + in-flight)**(4-5-3-1-5 §25c Cap·4-5-3-1-3 §16 Commitment 연결). **현행 재사용**: monthly_budget MTD cap·`SUM(budget) FROM auto_campaign WHERE status IN('active','pending','running')`(:437·**진행중 status 포함=§4.4 동일 원리**)·enforceBudgetCaps 97%(284차). **★잔여 음수 시 Accrual/Payout 생성 금지(fail-closed)**.
- **Snapshot(§56)**: balance_snapshot_id·ledger·**as-of·상태별 금액·산출 정의 버전·원장 최종 Entry id/hash(Ledger §49 chain)·검증 결과**·evidence. **★Snapshot은 성능/감사용 파생 캐시 — SSOT 승격 금지(§4.3)·생성 시 원장 SUM과 정합 검증 필수·불일치=Critical**(§0 관찰: 현행은 캐시 없이 매번 SUM).
- **Statement(§58)**: statement_id·participant·period·**opening balance·기간 내 Entry(§Line)·closing balance·상태별 소계·통화·발행일·정정 이력**·evidence. **Line**: entry reference·일자·유형·금액·잔고 누계·근거. **★Statement 발행 후 재발행 시 원본 보존(Append-only·정정=새 버전·4-5-3-1-4 §26b 계승)·opening+Σ변동=closing 항등식 검증 필수**.

## 5. Aging (§57a) · Expiry (§57) · Carry-forward (§57b)

- **Aging(§57a)**: aging_bucket(0-30/31-60/61-90/91-180/180+·기준일=accrued_at 또는 available_at 명시)·**미청구/미지급 잔액 경과 추적**·evidence. **★기준일 미지정 Aging 금지**.
- **Expiry(§57)**: expiry_policy_id·program·**만료 기준(accrual_at+N / period_end+N / 계약 종료)·만료 시 처리(EXPIRE_TO_ZERO/CARRY_FORWARD/FORFEIT)·사전 통지 정책·만료 Entry 생성(§41b EXPIRY)**·evidence. **현행 참조**: free_coupons `valid_until`(**NULL=무기한** 규약·CouponRedeem.php:67-68). **★만료도 Entry로 기록(잔액 조용히 감소 금지)·통지 없는 만료 금지(4-5-3-1-4 §24 UNFAVORABLE 통지 정합)**.
- **Carry-forward(§57b)**: 기간 미달/미청구 잔액의 차기 이월 정책(4-5-3-1-5 §20 "미달 시 CARRY_FORWARD" 연결)·이월 한도·이월 Entry.

## 6. Reconciliation (§59) · Discrepancy (§60) · Guard/Error (§61)

- **Reconciliation(§59, 14)**: **Balance↔원장 SUM(항등식)**·Snapshot↔원장·Statement opening+Σ=closing·**내부 잔액↔외부 지급 원장(★"우리 DB 가 아니라 매입사 원장이 진실"·BillingMethod.php:549 계승)**·Accrual↔Accrual Line 합계·Accrual↔Source·Reversal↔원본·true-up↔기 Accrual(4-5-3-1-5 §22b)·Reserved↔Commitment(4-5-3-1-3 §16)·in-flight↔실제 진행 작업·Locked↔Holdback(4-5-3-1-6 §20d)·통화별 잔액↔FX·hash-chain 무결성(Ledger §49)·Historical↔Applied.
- **Discrepancy(§60)**: discrepancy_id·**유형·발견 시점·금액 차이·원인 후보·조사 상태·정정 Entry reference**·evidence. **★차이 발견 시 조용한 보정(UPDATE) 금지 — 조사 후 승인된 Correction Entry(4-5-3-1-4 §26b)로만 해소**.
- **Guard/Error(§61, 16)**: BALANCE_STORED_AS_SSOT(파생 위반)·**IN_FLIGHT_EXCLUDED**(§4.4 위반)·**RECLAIM_NOT_RUN_BEFORE_AGGREGATION**(§54 순서 위반)·AGGREGATION_DEFINITION_MISSING·**LOCKED_COUNTED_AS_AVAILABLE**·SINGLE_BALANCE_NUMBER(상태 분리 없음)·AVERAGE_OF_RATIOS·CANCELLED_NOT_EXCLUDED·SNAPSHOT_MISMATCH·STATEMENT_IDENTITY_BROKEN·**LEDGER_ENTRY_UPDATE_BLOCKED**(Append-only 위반)·**NON_DETERMINISTIC_IDEMPOTENCY_KEY**(Ledger §44)·UNIQUE_SETTLEMENT_POINT_MISSING·HASH_CHAIN_BROKEN·COMMITMENT_EXCEEDED·FLOAT_AMOUNT. → Critical 시 **Access Review 차단·자동 지급 중지**.

## 7. Balance Matrix (§62) — 현행

| 잔액 | 산출 | in-flight 포함 | 회수 선행 | 상태 분리 | Cap 대비 | 저장 | Evidence |
|---|---|---|---|---|---|---|---|
| (Rebate Balance) | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| **인접(정본): 당월 광고비 청구누적** | **원장 SUM(파생·미저장)**(:449-451) | **★'pending','charging','reconciling' 필수 포함**(:445-447·"빠지면 이중청구") | **★"누적액 계산 전에" 회수**(:485) | status별 | **monthly_budget MTD cap** | **미저장(매번 SUM)** | ad_spend_ledger |
| 인접(재사용): 캠페인 예산 | SUM(budget) | **status IN('active','pending','running')**(:437) | N/A | N/A | enforceBudgetCaps 97% | auto_campaign | BillingMethod |
| 인접(참조): 반품률 | **ratio-of-sums**(268차 정정) | N/A | N/A | N/A | N/A | Rollup | 268차 |
| (Rebate 상태별 잔액·Statement·Aging·hash-chain) | — | — | — | — | — | — | **부재→신설** |
