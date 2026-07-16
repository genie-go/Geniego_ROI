# CANONICAL DSAR — Rebate Overpayment·Dispute·Chargeback·Write-off Resolution Governance (Overpayment·Dispute·Resolution·Chargeback·Write-off·Closure·Reconciliation·Guard)

> EPIC 06-A Rebate 실행계층 선행설계 R5 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0 · ★실행계층 선행설계 최종(R5)**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_RECOVERY_CLAWBACK.md`](CANONICAL_DSAR_REBATE_RECOVERY_CLAWBACK.md)(Recovery/Trigger/Type/Scope/Period/Entitlement/Netting/Execution) + 본 문서(Overpayment/Dispute/Chargeback/Write-off/Resolution/Closure/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_RECOVERY_CLAWBACK_DISPUTE.md`](../architecture/ADR_DSAR_REBATE_RECOVERY_CLAWBACK_DISPUTE.md).
> 선행: Eligibility(선행설계 R2 §24 Abuse)·Accrual/Ledger(선행설계 R3 §60 Discrepancy·§49 hash-chain)·**Claim/Payout(선행설계 R4 §67c Dispute 위임 수령·§79 가짜집행 CI 가드)**·Recovery(짝 문서).
> **범위**: 과지급·분쟁·회수 종결만 — 지급 실행 아님(선행설계 R4).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Overpayment / Dispute / Write-off 엔진** | ❌ **부재(grep 0)** — `clawback/overpayment/write-off` 전무(단어 경계 확인) | **NOT_APPLICABLE → 신설** |
| **★Chargeback=기정사실 취급(실 정본)** | ✅ **REAL** — `$isFull = in_array($action, ['full','chargeback'], true)`([Paddle.php:724](../../backend/src/Handlers/Paddle.php)·**chargeback을 full 환불과 동일 즉시 반영**·분쟁 대기 아님)·사유 기록 `'refund_' . $action`(:739) | **재사용(§91 Chargeback·§4.5)** |
| **★이중지급 방지(과지급 예방)** | ✅ **REAL** — 결정적 orderId(**microtime 금지**·"Toss 가 최후의 방어선"·[BillingMethod.php:456-460](../../backend/src/Handlers/BillingMethod.php))·`UNIQUE uq_asl_order`(:151)·**in-flight 포함 집계**("빠지면 … 같은 delta 를 다시 청구 = 이중청구의 원인이었다"·:445-447) | **재사용(§90b 예방 우선·선행설계 R3 위임)** |
| **★크래시 과지급 회수(실 정본)** | ✅ **REAL** — `CLAIM_STALE_SEC 600` 고아 선점 회수(:29-30)·**Toss 주문조회로 "실제로 돈이 나갔는지" 매입사 원장에서 확인 후 정정**(:476)·`finalizeLedger(..., 'charged', ..., '중복 청구 차단 — 기청구 확인(회수)')`(:536) | **재사용(§92 확인 후 정정)** |
| **★외부 원장이 진실** | ✅ **REAL** — **"우리 DB 가 아니라 매입사 원장이 진실이다. 회수 자체도 원자적 상태전이로 단일 프로세스만 수행"**([BillingMethod.php:549](../../backend/src/Handlers/BillingMethod.php)) | **재사용(§95 Reconciliation·§4.11)** |
| **분쟁/이의 제기 경로** | △ `UserAuth::refundRequest`(:2028·사용자 환불 요청)·Paddle 웹훅 | **참조(inbound·rebate dispute 아님)** |
| **Discrepancy 조용한 보정 금지** | ✅ **REAL(원칙)** — 선행설계 R3 §60(잔액 차이=승인된 Correction Entry로만 해소)·Rollup/OrderHub 정정 이력 | **재사용(§94 Resolution)** |
| **Rebate Overpayment/Dispute/Resolution/Write-off/시효/Closure** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Overpayment/Dispute/Write-off 엔진은 부재(NOT_APPLICABLE·grep 0)**. 실 인접=**Chargeback 기정사실 취급(Paddle)**·**이중지급 예방 3층(결정적 Key·UNIQUE·in-flight 집계)**·**크래시 과지급의 외부 원장 확인 후 정정(BillingMethod)**·**외부 원장이 진실**. **★핵심 정직: §4.5 Chargeback≠Dispute(외부 강제 기정사실≠진행중 쟁송)·★§4.9 Write-off≠회수 성공(손실 확정·상위 승인)·§4.10 회수 실행도 가짜집행 금지(선행설계 R4 계승)·§4.11 분쟁 중 회수/지급 보류·§4.12 예방>회수(과지급은 §90b 3층 방어로 막는 게 정본·사후 회수는 최후 수단)**. 지어내기·NO_DATA/오탐 금지·전방호환 계약. **★본 문서로 실행계층 선행설계 R1~R5 완결(§99) — 단 이는 정본 9분할 슬롯이 아니다**: 정본 로드맵(Part 1 `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7` 기록)=1-1(Master/Scope)→1-2(Type)→1-3(Funding)→1-4(Lifecycle/Versioning/Migration)→**1-5(Permission·Approval·Operational)**→1-6(Coverage/Gap)→1-7(Lint/Guard Certification)→1-8(Golden Dataset)→1-9(Legacy Equivalence/Production Certification)·**현재 1-1~1-4 완료(4/9)**. R1~R5는 실 Rebate 엔진 도입 대비 예비 설계.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **현행 `refundRequest`(UserAuth.php:2028)·Paddle 분쟁은 전부 inbound**(우리가 받은 돈에 대한 고객 이의) — **Rebate dispute는 참여자가 "덜 받았다/부당 회수당했다"고 주장하는 outbound 쟁송**. **방향·주체가 반대라 복제 금지**(선행설계 R4 §0 정합).
- **BillingMethod의 회수는 "우리가 잘못 낸 돈"이 아니라 "크래시로 상태가 불명한 청구"의 정정** — Rebate 과지급 회수(상대방이 받은 돈을 되받기)와 성격이 다르다. **"외부 원장 확인 후 정정" 원칙만 계승·회수 수단은 Netting/Debit Memo 신설**(짝 문서 §86).

---

## 1. Canonical Entity (16) — §5 (이번 블록·최종)

REBATE_OVERPAYMENT·OVERPAYMENT_DETECTION·OVERPAYMENT_CAUSE·REBATE_DISPUTE·DISPUTE_PARTY·DISPUTE_CLAIM_BASIS·DISPUTE_EVIDENCE_PACKAGE·DISPUTE_STATE·DISPUTE_RESOLUTION·RESOLUTION_OUTCOME·CHARGEBACK_EVENT·WRITE_OFF·WRITE_OFF_APPROVAL·RECOVERY_CLOSURE·DISPUTE_RECONCILIATION·DISPUTE_AUDIT_EVENT.
**현행 실체**: Chargeback 즉시 반영(Paddle)·이중지급 예방 3층·외부 확인 후 정정(BillingMethod) = REAL 재사용. Dispute/Write-off/Closure(rebate) = **신설**.

## 2. Overpayment (§90) · ★예방 우선 (§90b) · Cause (§90c)

- **Overpayment(§90)**: rebate_overpayment_id·program·participant·**target payout reference·과지급 금액(Decimal/정수)·통화·detected_at·detection method·cause·recovery reference(짝 문서 §80)·state**·evidence.
- **★§4.12 예방>회수(§90b)**: **과지급은 사후 회수가 아니라 지급 전 3층 방어로 막는 것이 정본**(선행설계 R3 §44/§53 위임 수령) — ①**결정적 Payout Key**(★microtime 금지·"같은 정산지점은 언제 몇 번 실행하든 같은 orderId"·BillingMethod.php:456-460) ②**`UNIQUE(settlement point)` 선점**(:151) ③**in-flight 포함 잔액 집계**(**"빠지면 동시 실행 프로세스가 '아직 아무것도 청구 안 됨'으로 읽고 같은 delta 를 다시 청구하려 든다(=이중청구의 원인이었다)"**·:445-447). **★Rebate 이중지급은 이 3층이 뚫렸을 때만 발생 — 회수 로직 신설이 예방 부재를 대체하지 못한다**.
- **Cause(§90c, 10)**: DUPLICATE_EXECUTION(3층 실패)·CALCULATION_ERROR·**TIER_MISAPPLIED**(선행설계 R1 §22a Progression Model 오적용)·WRONG_VERSION(as-of 미사용)·ELIGIBILITY_ERROR·FX_ERROR·**STALE_DATA**(선행설계 R1 §28)·PROVIDER_DATA_ERROR·MANUAL_ENTRY_ERROR·FRAUD. **★Cause 미규명 회수 금지(원인 불명이면 동일 과지급 재발)·Cause별 재발 방지 조치 기록 필수**.

## 3. ★Chargeback (§91) · 외부 확인 후 정정 (§92)

- **Chargeback(§91)**: chargeback_event_id·**외부 주체(카드사/은행/PG)·강제 집행 금액·통보 수신 시각·사유 코드·이의 제기 가능 여부/기한·수수료**·evidence. **★§4.5 Chargeback≠Dispute** — **현행 정본**: `$isFull = in_array($action, ['full','chargeback'], true)`(Paddle.php:724)가 **chargeback을 full 환불과 동일하게 즉시 반영**(분쟁 대기 아님)·`status='refunded'`+`setUserPlan 'demo'`+`recordChurn('refund_'.$action)`(:737-739). **★Rebate: chargeback은 이미 집행된 기정사실 → 원장에 즉시 반영(Append-only Entry)·"분쟁 중"으로 보류 금지·이의 제기는 별도 Dispute로 병행**.
- **★확인 후 정정(§92)**: **추정으로 회수/정정 금지 — 외부 원장 조회로 실제 자금 이동을 확인한 뒤 정정**. **현행 정본**: 고아 선점 회수 시 **Toss 주문조회로 "실제로 돈이 나갔는지"를 매입사 원장에서 확인 후 정정**(BillingMethod.php:476)·`finalizeLedger(..., 'charged', ..., '중복 청구 차단 — 기청구 확인(회수)')`(:536)·**"우리 DB 가 아니라 매입사 원장이 진실이다. 회수 자체도 원자적 상태전이로 단일 프로세스만 수행"**(:549). **★Rebate: 과지급 의심 시 외부 지급 원장에서 실 이체 확인 후에만 Recovery 개시(내부 기록만으로 회수 금지 — 미이체 건을 회수하면 이중 손실)**.

## 4. Dispute (§93) · State (§93b) · Evidence (§93c)

- **Dispute(§93)**: rebate_dispute_id·program·**제기 주체(참여자/스폰서/우리·§Party)·대상(claim/settlement/payout/recovery)·쟁점 유형·주장 금액·제기 시각·기한·중재 절차·상태·해결 reference**·evidence. **Claim Basis(§93d, 9)**: UNDERPAYMENT·NON_PAYMENT·CALCULATION_DISPUTE·**TIER_DISPUTE**·ELIGIBILITY_DISPUTE·**UNFAIR_RECOVERY**(회수 이의)·CONTRACT_INTERPRETATION·DATA_DISCREPANCY·TIMING_DISPUTE.
- **State(§93b, 8)**: OPEN·UNDER_REVIEW·EVIDENCE_REQUESTED·**PENDING_COUNTERPARTY**·ESCALATED·RESOLVED_UPHELD(우리 입장 유지)·RESOLVED_ADJUSTED(조정)·WITHDRAWN. **★§4.11 분쟁 중 해당 건 지급·회수 보류**(선행설계 R2 §19 NO_ACTIVE_DISPUTE·선행설계 R4 §67c 위임 수령)·**단 Chargeback은 보류 대상 아님(§4.5 기정사실)**.
- **Evidence Package(§93c)**: 계약 reference(**원문 복제 금지**·4-5-3-1-3 §9)·rule/tier version snapshot(4-5-3-1-4 §22)·**evaluation trace(선행설계 R1 §13c·입력값/임계/연산자/매치 경로)**·ledger entries·**hash-chain 검증 결과(선행설계 R3 §49)**·통신 이력. **★Evidence 없는 분쟁 대응 불가 — 이것이 앞선 8개 파트가 Evidence/Trace/Version pin/hash-chain을 강제한 이유(분쟁 시점에 "왜 이 금액인지" 재현 가능해야 함·헌법 Vol4 Explainable)**.

## 5. Resolution (§94) · Write-off (§96) · Closure (§97) ★Write-off≠회수 성공

- **Resolution(§94)**: dispute_resolution_id·dispute·**outcome·조정 금액·근거·중재자·합의 문서 reference·결정 시각·이행 기한·이행 Entry reference**·evidence. Outcome(7): UPHELD·ADJUSTED_UP(추가 지급)·ADJUSTED_DOWN(회수)·SPLIT·WITHDRAWN·ESCALATED_EXTERNAL·**SETTLED_COMMERCIALLY**(상업적 합의). **★조정 결과도 Append-only Entry(선행설계 R3 §41b·조용한 금액 수정 금지·§60 "Discrepancy 조용한 보정 금지" 계승)·조정 사유/근거 없는 금액 변경=Critical**.
- **★Write-off(§96)**: write_off_id·recovery·**사유(시효 경과·소액·회수 불능·상업적 판단·법적 제약)·금액·손실 인식 법인(4-5-3-1-3 §Accounting)·승인자(★상위 승인)·승인 시각·회계 처리**·evidence. **★§4.9 Write-off≠회수 성공 — 손실 확정**(짝 문서 §82 WRITE_OFF_CANDIDATE·§88 State `WRITTEN_OFF`). **★Write-off를 RECOVERED로 표기 금지(가짜 회수·287/288차 fake-looks-real 클래스 정합)·write-off 남용 방지(상위 승인+사유+한도)**.
- **Closure(§97)**: recovery_closure_id·recovery·**종결 유형(FULLY_RECOVERED/PARTIALLY_RECOVERED_CLOSED/WRITTEN_OFF/DISPUTE_RESOLVED/TIME_BARRED)·잔여 금액·종결 승인·종결 시각**·evidence. **★잔여 금액이 있는데 FULLY_RECOVERED 표기 금지·종결도 Entry·종결 후 재개는 새 Recovery(원본 보존)**.

## 6. Reconciliation (§95) · Guard/Error (§98) · ★선행설계 R1~R5 완결 (§99)

- **Reconciliation(§95, 12)**: **내부 회수 state↔외부 지급/매입 원장(★"우리 DB 가 아니라 매입사 원장이 진실"·불일치 시 외부 우선)**·Overpayment↔Cause↔재발 방지 조치·Recovery↔원 Payout(금액/기간/Version)·**부분 회수↔Entitlement 재평가(§4.3 과다역분개 방지)**·Netting↔실 상계 Entry(양방)·Chargeback↔외부 통보↔원장 반영·Dispute↔보류 상태↔Evidence·Resolution↔이행 Entry·Write-off↔승인↔회계 인식·Closure↔잔여 금액·시효↔개시 시점·hash-chain 무결성.
- **Guard/Error(§98, 16)**: **`RECOVERY_WITHOUT_TRIGGER`**·`CAUSE_UNIDENTIFIED_RECOVERY`·**`PARTIAL_TREATED_AS_FULL`**(★과다역분개·Paddle 272차 클래스)·`FULL_TREATED_AS_PARTIAL`·**`RECOVERY_PERIOD_MISATTRIBUTED`**(회수일 귀속·§84)·**`RECOVERED_WITHOUT_EXTERNAL_CONFIRMATION`**(§92 위반)·**`WRITE_OFF_MARKED_AS_RECOVERED`**(★§4.9)·`RECOVERED_WITHOUT_EXECUTION`(가짜집행·선행설계 R4 §79 클래스)·`DUPLICATE_RECOVERY`(멱등 위반)·**`RECOVERY_AMOUNT_RECALCULATED_WITH_CURRENT_VERSION`**(as-of 위반)·`DISPUTE_OPEN_RECOVERY_EXECUTED`·`NETTING_WITHOUT_NOTICE`·`NETTING_NEGATIVE_PAYOUT`·`TIME_BARRED_RECOVERY_ATTEMPTED`·`ORIGINAL_ENTRY_MODIFIED`(Append-only 위반)·`CROSS_TENANT_RECOVERY`. → Critical 시 **Access Review 차단·자동 회수/지급 중지**.
- **★§99 실행계층 선행설계(R1~R5) 완결 — ★정본 9분할과 구별(정직)**: 본 R1~R5는 **정본 9분할 슬롯이 아니다**. **정본 로드맵**(전 세션 Part 1 [`CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7`](CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md) 기록)=**4-5-3-1-1**(Master/Scope)→**1-2**(Type)→**1-3**(Funding)→**1-4**(Lifecycle/Versioning/Migration)→**1-5(Permission·Approval·Operational)**→**1-6**(Coverage/Gap)→**1-7**(Lint/Guard Certification)→**1-8**(Golden Dataset)→**1-9**(Legacy Equivalence/Production Certification). **현재 진척=1-1~1-4 완료(4/9)**. 본 **선행설계 R1**(Rule/Tier/Calculation)→**R2**(Eligibility/Enrollment)→**R3**(Accrual/Ledger/Balance)→**R4**(Claim/Settlement/Payout)→**R5**(Recovery/Clawback/Dispute·본 문서)는 정본 9분할에 없는 **실 Rebate 엔진 도입 대비 실행계층 예비 설계**이며, 향후 정본 스펙 수령 시 해당 번호에 편입한다. **전 R1~R5 비파괴·코드변경 0·실측 file:line 근거·NOT_APPLICABLE 정직 표기. 실 엔진 구현=고객 Rebate 기능 도입 시 후속 승인 세션(Golden Rule=Extend·중복 구현 금지·무후퇴).**

## 7. Dispute/Recovery Closure Matrix (§100) — 현행

| 항목 | 현행 | Canonical |
|---|---|---|
| Chargeback | **full과 동일 즉시 반영**(Paddle.php:724·분쟁 대기 아님) | **재사용(기정사실·§4.5)** |
| 과지급 예방 | **결정적 Key + UNIQUE + in-flight 집계 3층**(BillingMethod) | **재사용(★예방>회수·§4.12)** |
| 과지급 정정 | **외부 원장 확인 후 정정**(:476/536·"매입사 원장이 진실" :549) | **재사용(§92)** |
| 부분 처리 | **partial=MRR 역분개 제외("서비스 유지")**(Paddle.php:738) | **재사용(§4.3 과다역분개 방지)** |
| Dispute(outbound 쟁송) | **부재**(refundRequest/Paddle=inbound·복제 금지) | **신설** |
| Write-off·시효·Netting·Closure | **부재** | **신설(★Write-off≠회수 성공)** |
