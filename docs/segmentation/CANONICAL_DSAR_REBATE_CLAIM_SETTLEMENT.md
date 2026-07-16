# CANONICAL DSAR — Rebate Claim & Settlement (Claim·Intake·Validation·Approval·Dispute·Settlement·Estimated vs Confirmed·Credit Memo·Reconciliation)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-8 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Claim/Intake/Validation/Approval/Dispute/Settlement/Credit Memo) + [`CANONICAL_DSAR_REBATE_PAYOUT_EXECUTION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_PAYOUT_EXECUTION_GOVERNANCE.md)(Payout/Method/Execution/Honest State/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_CLAIM_SETTLEMENT_PAYOUT.md`](../architecture/ADR_DSAR_REBATE_CLAIM_SETTLEMENT_PAYOUT.md).
> 선행: Type(4-5-3-1-2 **Claim Model 19·Requirement 21·Settlement Method 22 분류축**)·Funding(4-5-3-1-3 **§18~§26 Responsibility·Operator≠Funder**)·Rule(4-5-3-1-5)·Eligibility(4-5-3-1-6)·**Accrual/Ledger(4-5-3-1-7 §41b CLAIM_LINK/SETTLEMENT_LINK·Idempotency 3층 위임 수령)**.
> **범위**: 청구·정산 실행만 — Recovery/Clawback/Dispute 사후 회수 아님(후속 4-5-3-1-9). **중복 구현 금지.**

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Claim / Settlement / Payout 엔진** | ❌ **부재(grep 0)** — `rebate_claim/rebate_settle/rebate_payout` 전무·`payout` 히트는 전부 **`net_payout`(inbound 정산)** | **NOT_APPLICABLE → 신설(전방호환)** |
| **Claim 적재·멱등(실 정본)** | ✅ **REAL** — `ChannelSync::recordClaim`(**멱등 `CLM-` 키**·[ChannelSync.php:4790](../../backend/src/Handlers/ChannelSync.php)·활성→취소/반품 전이 **최초 1회** :4396/4405)·`OrderHub::ingestClaims`(자체 `clm_hash` 적재+정산 재롤업·:4781)·"전부 멱등(recordClaim=CLM-·recordCrmRefund=order_id·restock=CHR-)"(:4756) | **재사용(§64 Claim Intake·멱등)** |
| **★Estimated≠Confirmed(추정 미덮어쓰기)** | ✅ **REAL** — **"실 정산(status!='estimated', 예: ingest 된 confirmed/pending)이 이미 있으면 추정 스킵(정합 보존)"**·`if ($exStatus !== '' && $exStatus !== 'estimated') continue;`([OrderHub.php:1268-1271](../../backend/src/Handlers/OrderHub.php)) · zero-out도 **"실 정산은 보존 — estimated 행만 0 처리"**(:1297/1305) · `ingestSettlementRows(..., $defaultStatus='confirmed')`(:1117-1121) | **재사용(§68 Settlement Status·★§4.3 정본)** |
| **★가짜집행 근절(fake-looks-real)** | ✅ **REAL** — **"[287차 가짜집행 근본수정] 종전엔 `status='executed'` 로만 바꾸고 어떤 외부 API 도 호출하지 않아, 프론트는 '실행 완료'를 표시하나 실제 광고 캠페인은 그대로 소진되던 fake-looks-real 이었다"**([Alerting.php:608-611](../../backend/src/Handlers/Alerting.php)) · 정정: **"집행 결과에 따라 상태를 정직하게 기록한다(executed=실집행성공 / failed=실패 / approved_manual=자동집행 불가)"** | **재사용(Payout 문서 §72·★§4.4 정본)** |
| **자격증명 게이트(정직)** | ✅ **REAL** — **"각 어댑터는 해당 매체 자격증명이 없으면 `no_credentials` 반환(실 API 호출 안 함)"**([AdAdapters.php:19](../../backend/src/Handlers/AdAdapters.php)) · **"★미검증 고지: 실 쓰기 자격증명으로 라이브 검증 후 운영 권장"**(:25) | **재사용(Payout 문서 §73·§4.5)** |
| **정산 원장(inbound)** | ✅ **REAL** — orderhub_settlements(gross_sales·net_payout·platform_fee·ad_fee·coupon_discount·return_fee·orders/returns_count·**status estimated/confirmed/pending**·OrderHub.php:883/1283/1305)·kr_settlement_line(마켓 수수료 이중차감)·pg_settlement(fee) | **참조(inbound 정산≠outbound payout·§4.9 복제 금지)** |
| **취소수수료 처리** | ✅ **REAL** — "취소는 매출 제외로만 처리(P&L 영향 0), **실제 취소수수료는 실 정산 ingest(status!='estimated')가 반영**"(OrderHub.php:1233) | **참조(추정 단계 비용 날조 금지)** |
| **Credit Memo / AP·AR Offset** | ❌ **부재**(4-5-3-1-2 Settlement Method 22 분류축만·실 엔진 없음) | **NOT_APPLICABLE → 신설** |
| **Rebate Claim Intake/Validation/Approval/Dispute/Settlement(rebate)/Credit Memo/Reconciliation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Claim/Settlement/Payout 엔진은 부재(NOT_APPLICABLE·grep 0·`payout` 히트는 전부 inbound `net_payout`)**. 실 인접=Claim 멱등 적재(recordClaim `CLM-`·ingestClaims clm_hash)·**Estimated≠Confirmed 추정 미덮어쓰기(OrderHub 정본)**·**가짜집행 근절 3-state 정직(Alerting 287차 정본)**·자격증명 게이트(AdAdapters `no_credentials`)·정산 원장(orderhub_settlements/kr/pg·**inbound**). **★핵심 정직: §4.1 Claim≠Accrual·§4.2 Approval≠Settlement≠Payout·★§4.3 Estimated≠Confirmed(추정이 실 정산 덮어쓰기 금지)·★§4.4 외부 미호출인데 '집행완료' 금지(fake-looks-real·287/288차 실 사고)**. **기존 Claim 멱등/정산 상태 패턴 재사용(중복 금지·§40)·inbound 정산 원장을 outbound payout으로 복제 금지**·지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **현행 "claim"은 주문 취소/반품 클레임**(고객→판매자)이고 **Rebate claim은 리베이트 청구**(참여자→스폰서). **동음이의·도메인 상이 — recordClaim/ingestClaims를 rebate claim으로 재사용 금지**(멱등 키 설계·전이 1회 패턴만 계승·4-5-3-1-2 §Instrument Boundary "Refund≠Rebate" 정합).
- **287차 교훈의 일반형**: 상태 필드는 **의도(승인)가 아니라 실 집행 결과**를 기록해야 한다. 288차 ChannelSync 가짜녹색(하드실패 `ok=>true` 위장 14채널 18개소→`ok=>false` 통일)도 동일 클래스 — **Rebate Payout은 이 저장소가 두 번 사고 낸 지점**이라 §4.4를 최우선 계약으로 승격.

---

## 1. Canonical Entity (19) — §5 (이번 블록)

REBATE_CLAIM·CLAIM_LINE·CLAIM_INTAKE·CLAIM_SOURCE·CLAIM_VALIDATION·VALIDATION_RULE·CLAIM_APPROVAL·CLAIM_REJECTION·CLAIM_DISPUTE·DISPUTE_RESOLUTION·REBATE_SETTLEMENT·SETTLEMENT_LINE·SETTLEMENT_STATUS·CREDIT_MEMO·DEBIT_MEMO·AP_AR_OFFSET·SETTLEMENT_RECONCILIATION·CLAIM_EVIDENCE·CLAIM_AUDIT_EVENT.
**후속 블록(4-5-3-1-9)**: RECOVERY·CLAWBACK·WRITE_OFF·DISPUTE 사후 회수(**이번 블록 중복 구현 금지·Reference Field만 준비**).
**현행 실체**: Claim 멱등 적재(recordClaim/ingestClaims·**도메인 상이·패턴만**)·Settlement Status(estimated/confirmed/pending)·추정 미덮어쓰기(OrderHub) = REAL 재사용. Rebate Claim/Credit Memo = **신설**.

## 2. Claim (§63) · Intake (§64) · Source (§64b) ★Claim≠Accrual

- **Claim(§63)**: rebate_claim_id·program·participant(**claimant role·4-5-3-1-6 §28**)·**pinned program/rule version·claim_period·claimed_amount(정수 minor unit 또는 Decimal·4-5-3-1-7 §43)·currency·supporting accrual reference(4-5-3-1-7 §41b CLAIM_LINK)·claim_model(4-5-3-1-2 §Claim Model 19 연결·재정의 금지)·submitted_at·deadline·state·idempotency_key·evidence reference**·audit. **★§4.1 Claim≠Accrual — Accrual(발생)은 우리 산출·Claim(청구)은 참여자 주장**. **Accrual 없는 Claim=검증 대상(자동 거절 아님·§66 Validation)·Claim 없는 자동 지급 여부는 Program 정책(NO_CLAIM_REQUIRED)·묵시적 가정 금지**.
- **Claim Line(§63b)**: 거래/SKU/기간별 명세·**라인 합계=claimed_amount 검증**·라인별 검증 결과(부분 승인 지원·§67).
- **Intake(§64)**: intake_id·claim·**channel(PORTAL/API/EMAIL/CSV_IMPORT/EDI/MANUAL)·수신 시각·원본 payload reference·파서 버전·중복 검사 결과·idempotency_key**·evidence. **★현행 패턴 재사용(도메인 상이·§0 관찰)**: recordClaim **멱등 `CLM-` 키**·"활성→취소/반품 전이 **최초 1회**"(ChannelSync.php:4396/4405/4790)·ingestClaims `clm_hash`(:4781) = **동일 청구 중복 접수 차단(4-5-3-1-7 §44 Idempotency 3층 계승)**.
- **Source(§64b)**: 참여자 제출·Provider 리포트·내부 산출(자동 Claim)·제3자 감사 — **source별 신뢰도 상이·Provider 리포트를 무검증 신뢰 금지**(헌법 Vol3 Cross Validation).

## 3. Validation (§66) · Approval (§67) · Rejection·Dispute (§67b)

- **Validation(§66)**: claim_validation_id·claim·**rule set·검증 결과(PASS/FAIL/PARTIAL/UNKNOWN)·항목별 결과·근거(우리 Accrual vs 청구액 차이)·자동/수동·검증자·evidence**. Rule(12): DUPLICATE_CLAIM·ELIGIBILITY(4-5-3-1-6)·QUALIFICATION 달성·**ACCRUAL_MATCH(우리 산출과 대조)**·SCOPE·PERIOD/DEADLINE·SUPPORTING_EVIDENCE·CALCULATION_RECHECK(4-5-3-1-5 as-of Version)·FUNDING/COMMITMENT(4-5-3-1-3 §16)·FRAUD/ABUSE(4-5-3-1-6 §24·AnomalyDetection)·CONTRACT_ACTIVE·CURRENCY/FX. **★UNKNOWN=자동 승인 금지(fail-closed·Unknown≠Eligible 계승)·검증 근거 없는 승인 금지**.
- **Approval(§67)**: claim_approval_id·claim·**approved_amount(≠claimed_amount 가능)·부분 승인 사유·approver·approval_level/quorum·approved_at·만료·delegation·pinned version**·evidence. **★§4.2 Claim Approval≠Settlement≠Payout — 승인은 지급이 아니다**(4-5-3-1-4 §4.5 Approval≠Effectiveness·4-5-3-1-6 §4.2 계승). **★승인 즉시 Ledger에 CLAIM_LINK Entry(4-5-3-1-7 §41b)·Availability 전환은 Holdback/Maturity 통과 후**(4-5-3-1-6 §20d/§21).
- **Rejection(§67b)**: 사유(12·DUPLICATE·NOT_ELIGIBLE·NOT_QUALIFIED·NO_ACCRUAL·SCOPE_MISMATCH·DEADLINE_PASSED·EVIDENCE_INSUFFICIENT·CALCULATION_MISMATCH·FUNDING_UNAVAILABLE·FRAUD_SUSPECTED·CONTRACT_INACTIVE·OTHER)·**거절 근거 통지 필수·재제출 정책·이의 제기 경로(§Dispute)**.
- **Dispute(§67c)**: dispute_id·claim·**제기자·쟁점·제기 시각·상태·중재자·해결 결과·조정 금액**·evidence. **★분쟁 중 지급 보류(4-5-3-1-6 §19 NO_ACTIVE_DISPUTE 정합)·분쟁 해결도 Append-only Entry(조용한 금액 수정 금지·4-5-3-1-7 §60)**. **★사후 회수(Clawback)는 4-5-3-1-9(본 블록 구현 금지)**.

## 4. Settlement (§68) · ★Estimated vs Confirmed (§68b) — OrderHub 정본 승격

- **Settlement(§68)**: rebate_settlement_id·program·participant·**settlement_period·settlement_method(4-5-3-1-2 §Settlement Method 22 연결·재정의 금지)·settled_amount·currency·FX reference·counterparty·settlement account·approved claims·ledger entry reference(SETTLEMENT_LINK)·status·settled_at·idempotency_key**·evidence. **★Settlement Party≠Accounting Party≠Payer**(4-5-3-1-3 §4.3 계승).
- **★Status(§68b, 6)**: **ESTIMATED**(우리 추정)·**PENDING**(확정 대기)·**CONFIRMED**(상대방/외부 확정)·SETTLED·DISPUTED·VOID. **★§4.3 Estimated≠Confirmed — 추정 정산이 실 정산을 덮어쓰기 금지**. **현행 정본 재사용**: **"실 정산(status!='estimated', 예: ingest 된 confirmed/pending)이 이미 있으면 추정 스킵(정합 보존)"**·`if ($exStatus !== '' && $exStatus !== 'estimated') continue;`(OrderHub.php:1268-1271) · zero-out도 **"실 정산은 보존 — estimated 행만 0 처리"**(:1297/1305) · 프로그래매틱 적재 기본값 `'confirmed'`(:1117-1121). **★Rebate: 추정 리베이트 정산은 실 정산 도착 시 보존/스킵·추정을 확정으로 표기 금지·추정 단계에서 비용/수수료 날조 금지**("취소는 매출 제외로만 처리(P&L 영향 0), 실제 취소수수료는 실 정산 ingest가 반영"·:1233 정신 계승).
- **Settlement Line(§68c)**: claim/accrual별 명세·**라인 합계=settled_amount 검증**·차이(우리 산출 vs 상대방 확정) 명시·**차이를 조용히 맞추기 금지(Discrepancy·4-5-3-1-7 §60)**.

## 5. Credit Memo (§69) · Debit Memo (§69b) · AP/AR Offset (§70) ★현금 지급 아님

- **Credit Memo(§69)**: credit_memo_id·settlement·participant·**memo_number·발행 법인(accounting entity)·금액·통화·발행일·적용 대상(미래 인보이스/미수금)·잔여 금액·만료·상태·회계 처리(4-5-3-1-2 §Accounting Nature 21 연결)**·evidence. **★§4.9 Credit Memo≠Cash Payout — 현금 이동 없음(미래 매입 차감/AR 상계)·"지급 완료"로 표기 금지**(4-5-3-1-2 "Credit Memo→Cash 오분류=Critical" 계승).
- **Debit Memo(§69b)**: 참여자에게 청구(과지급 회수 전 단계·**실 회수 실행은 4-5-3-1-9**).
- **AP/AR Offset(§70)**: offset_id·**상계 대상(미지급금/미수금)·상계 금액·상계 일자·승인·잔여**·evidence. **★상계도 Ledger Entry(4-5-3-1-7 §41b)·상계를 현금 지급으로 표기 금지·양방 잔액 동시 반영(한쪽만 반영 금지)**. **현행 인접**: kr_settlement_line 이중차감(마켓 수수료=테넌트 부담·4-5-3-1-3 §참조)=**상계 성격 인접(rebate 아님)**.

## 6. Reconciliation (§71) · Guard/Error (§71b)

- **Reconciliation(§71, 13)**: Claim↔Accrual(우리 산출)·Claim Line 합계↔claimed_amount·Approved↔Settled·Settlement Line 합계↔settled_amount·**Estimated↔Confirmed(추정 보존)**·내부 Settlement↔**외부/상대방 명세**(★"우리 DB가 아니라 외부 원장이 진실"·4-5-3-1-7 §4.8 계승)·Credit Memo 잔여↔적용 이력·AP/AR 양방 잔액·Funding Allocation↔Settled(4-5-3-1-3)·Claim↔Ledger Entry·Dispute↔조정 금액·통화↔FX Stage·Historical↔Applied.
- **Guard/Error(§71b, 15)**: CLAIM_WITHOUT_VALIDATION·**UNKNOWN_AUTO_APPROVED**·DUPLICATE_CLAIM(멱등 키 위반)·APPROVAL_TREATED_AS_PAID·**ESTIMATED_OVERWROTE_CONFIRMED**·CONFIRMED_MARKED_AS_ESTIMATED·SETTLEMENT_LINE_SUM_MISMATCH·**CREDIT_MEMO_MARKED_AS_CASH_PAID**·OFFSET_ONE_SIDED·CLAIM_AMOUNT_SILENTLY_ADJUSTED·DEADLINE_PASSED_ACCEPTED·FUNDING_UNAVAILABLE_APPROVED·DISPUTE_OPEN_SETTLED·CROSS_TENANT_CLAIM·EVIDENCE_MISSING. → Critical 시 **Access Review 차단·자동 지급 중지**.

## 7. Claim/Settlement Matrix (§74) — 현행

| 대상 | 청구 주체 | 멱등 | 검증 | 승인 | 정산 상태 | 추정 보호 | Evidence |
|---|---|---|---|---|---|---|---|
| (Rebate Claim) | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| **인접(패턴만·도메인 상이)**: 주문 클레임 | 고객→판매자(**리베이트 청구 아님**) | **`CLM-` 키·전이 최초 1회**(:4396/4790) | N/A | N/A | N/A | N/A | recordClaim/ingestClaims(clm_hash) |
| **인접(정본): 채널 정산** | N/A | N/A | N/A | N/A | **estimated / confirmed / pending** | **★실 정산 있으면 추정 스킵**(:1268-1271)·**zero-out은 estimated만**(:1297) | orderhub_settlements |
| 인접(참조): 마켓 수수료 | N/A | N/A | N/A | N/A | 정산기간 | N/A | kr_settlement_line(이중차감=상계 인접) |
| (Rebate Credit Memo·AP/AR Offset·Dispute) | — | — | — | — | — | — | **부재→신설** |
