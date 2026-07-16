# CANONICAL DSAR — Rebate Payout Execution Governance (Payout·Method·Instruction·Execution·★Honest State·Credential Gate·Idempotency·Reconciliation·Guard)

> EPIC 06-A Rebate 실행계층 선행설계 R4 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_CLAIM_SETTLEMENT.md`](CANONICAL_DSAR_REBATE_CLAIM_SETTLEMENT.md)(Claim/Intake/Validation/Approval/Dispute/Settlement/Credit Memo) + 본 문서(Payout/Method/Execution/Honest State/Credential Gate/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_CLAIM_SETTLEMENT_PAYOUT.md`](../architecture/ADR_DSAR_REBATE_CLAIM_SETTLEMENT_PAYOUT.md).
> 선행: Funding(4-5-3-1-3 **§20 Payout Responsibility·Operator≠Funder**·Recipient Verification 부재)·Eligibility(선행설계 R2 **미검증 Payee 지급 금지**)·**Accrual/Ledger(선행설계 R3 §44 결정적 Idempotency 3층·§46 고아 회수·§4.8 외부 원장이 진실 위임 수령)**.
> **범위**: 지급 실행만 — Recovery/Clawback/과지급 회수 아님(후속 선행설계 R5).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Payout(outbound 지급) 엔진** | ❌ **부재(grep 0)** — `payout` 히트는 전부 **`net_payout`(inbound 정산 수취액)**·**outbound 지급/송금/Withdrawal 전무**(4-5-3-1-1/1-3 확정) | **NOT_APPLICABLE → 신설(전방호환)** |
| **★가짜집행 근절(fake-looks-real)** | ✅ **REAL** — **"[287차 가짜집행 근본수정] 종전엔 `status='executed'` 로만 바꾸고 어떤 외부 API 도 호출하지 않아, 프론트는 '실행 완료'를 표시하나 실제 광고 캠페인은 그대로 소진되던 fake-looks-real 이었다"**([Alerting.php:608-609](../../backend/src/Handlers/Alerting.php)) → **"실 액추에이터(AdAdapters, 자격증명 게이트·감사로그 내장)로 집행하고 집행 결과에 따라 상태를 정직하게 기록한다(`executed`=실집행성공 / `failed`=실패 / `approved_manual`=자동집행 불가)"**(:610-611) | **재사용(§72 Honest State·★§4.4 정본)** |
| **★자격증명 게이트(정직)** | ✅ **REAL** — **"각 어댑터는 해당 매체 자격증명이 없으면 `no_credentials` 반환(실 API 호출 안 함)"**([AdAdapters.php:19](../../backend/src/Handlers/AdAdapters.php)) · **"★미검증 고지: 실 쓰기 자격증명으로 라이브 검증 후 운영 권장. 문서 스펙 기준 구현"**(:25) | **재사용(§73 Credential Gate·§4.5)** |
| **★집행 실패 시 상태 미변경** | ✅ **REAL** — AutoCampaign kill-switch: **플랫폼 push 실패 시 DB 상태를 바꾸지 않고 502**("'paused' 표기인데 플랫폼은 계속 집행(광고비 누수)"·[AutoCampaign.php:602-609](../../backend/src/Handlers/AutoCampaign.php)·233차 P1) | **재사용(§72b·4-5-3-1-4 §4.3 정합)** |
| **★결정적 Key·UNIQUE 선점·외부 최후 방어선** | ✅ **REAL** — 결정적 orderId(**microtime 금지**·"Toss 가 최후의 방어선"·[BillingMethod.php:456-460](../../backend/src/Handlers/BillingMethod.php))·`UNIQUE uq_asl_order(tenant_id, order_id)`(:151)·고아 회수(CLAIM_STALE_SEC 600·:29)·**"우리 DB 가 아니라 매입사 원장이 진실"**(:549) | **재사용(§75 Idempotency·§77 Reconciliation·선행설계 R3 위임 수령)** |
| **외부 결제 실행(inbound)** | ✅ **REAL** — Toss(카드 청구·BillingMethod)·Paddle(구독 결제·웹훅) | **참조(inbound 수납≠outbound 지급·§4.9 복제 금지)** |
| **Recipient Verification(KYC)·은행계좌·송금** | ❌ **부재**(4-5-3-1-1/1-3/1-6 확정) | **NOT_APPLICABLE → 신설** |
| **Rebate Payout Method/Instruction/Execution/Batch/Return·Bounce** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Payout(outbound) 엔진은 부재(NOT_APPLICABLE·grep 0)** — 이 저장소에 **outbound 지급 경로 자체가 없다**(Toss/Paddle은 inbound 수납). 실 인접=**가짜집행 근절 3-state 정직(Alerting 287차)**·**자격증명 게이트(AdAdapters `no_credentials`)**·**집행 실패 시 상태 미변경(AutoCampaign 233차)**·결정적 Key/UNIQUE/고아 회수/외부 원장 진실(BillingMethod). **★핵심 정직: ★§4.4 외부 미호출인데 '지급완료' 금지(fake-looks-real — 이 저장소가 287·288차 두 번 사고 낸 클래스)·§4.5 자격증명 없으면 실 호출 없이 정직 상태·§4.6 Payout Operator≠Funder·§4.7 결정적 Payout Key(외부 PG/은행이 최후 방어선)·§4.8 미검증 Payee 지급 금지**. **inbound 수납 경로를 outbound 지급으로 복제 금지**·지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **가짜집행은 이 저장소의 재발 클래스**: 287차 `Alerting::executeAction`(외부 API 미호출인데 'executed') + 288차 ChannelSync **하드실패 `ok=>true` 위장 14채널 18개소**(→`ok=>false` 통일). **Payout은 돈이 실제로 나가는 경로**라 동일 클래스 재발 시 피해가 최대 → **§4.4를 본 파트 최우선 계약으로 승격**하고 CI 가드(§79) 대상으로 지정.
- **AdAdapters `no_credentials`(실 API 호출 안 함)는 "실패"가 아니라 "미집행"의 정직한 표기** — Rebate Payout도 **미집행(자격증명/검증/자금 부재)과 실패(호출했으나 거절)를 구분**해야 한다(§72 3-state 이상).

---

## 1. Canonical Entity (16) — §5 (이번 블록)

REBATE_PAYOUT·PAYOUT_METHOD·PAYOUT_INSTRUCTION·PAYOUT_BATCH·PAYOUT_EXECUTION·EXECUTION_ATTEMPT·EXECUTION_STATE·PROVIDER_RESPONSE·PAYOUT_IDEMPOTENCY_KEY·PAYEE_ACCOUNT_REFERENCE·PAYOUT_RETURN·PAYOUT_FEE·PAYOUT_FX·PAYOUT_RECONCILIATION·PAYOUT_EVIDENCE·PAYOUT_AUDIT_EVENT.
**후속 블록(선행설계 R5)**: RECOVERY·CLAWBACK·OVERPAYMENT_RECOVERY(**이번 블록 중복 구현 금지·Reference Field만 준비**).
**현행 실체**: Honest State(Alerting)·Credential Gate(AdAdapters)·실패 시 상태 미변경(AutoCampaign)·결정적 Key/UNIQUE/고아 회수/외부 진실(BillingMethod) = REAL 재사용(패턴). Payout 실체 = **전부 신설**.

## 2. Payout (§72a) · Method (§74) · Instruction (§74b) ★Operator≠Funder

- **Payout(§72a)**: rebate_payout_id·program·participant(**payee role**)·**settlement reference·payout_amount(정수 minor unit 또는 Decimal·선행설계 R3 §43)·currency·FX reference(§78)·fee 부담 주체(§78b)·payout_method·payee account reference·funding party(4-5-3-1-3)·payout operator·scheduled_at·state·settlement_point·idempotency_key·ledger entry reference(PAYOUT_LINK·선행설계 R3 §41b)**·evidence. **★§4.6 Payout Operator≠Funder≠Sponsor**(4-5-3-1-3 §4.2/§20 계승·집행 주체와 비용 부담 주체 분리).
- **Method(§74, 12)**: BANK_TRANSFER·**CREDIT_MEMO**(★현금 이동 없음·Claim 문서 §69·"지급"으로 표기 금지)·**AP_AR_OFFSET**(상계)·INVOICE_DEDUCTION·PG_PAYOUT·WALLET_CREDIT·CHECK·GIFT_CARD/VOUCHER·PLAN_CREDIT(현행 인접: Referral 1개월 PRO 부여)·POINT_CREDIT·MANUAL·OTHER. **★Method별 "지급 완료"의 의미가 다르다 — 현금 이동 없는 Method를 Cash Paid로 표기 금지(§4.9)**.
- **Instruction(§74b)**: instruction_id·payout·**지시 생성 시각·승인 reference·payee account snapshot(불변)·금액/통화 확정·실행 창(window)·취소 가능 시점·batch reference**·evidence. **★Instruction 생성≠실행(§4.2 Approval≠Settlement≠Payout 계승)·실행 전 취소 가능·실행 후 취소는 Recovery(선행설계 R5)**.

## 3. ★Execution (§72) · Honest State — Alerting 287차 정본 승격

- **Execution(§72)**: payout_execution_id·payout·instruction·**attempt 번호·요청 payload reference·provider response reference·http/에러 코드·시작/종료 시각·수행 프로세스·state·idempotency_key**·evidence.
- **★State(§72c, 8) — 정직 3-state 이상**: **`PENDING`**(미집행)·**`NOT_EXECUTED_NO_CREDENTIALS`**(자격증명 부재·**실 호출 안 함**)·**`NOT_EXECUTED_NOT_VERIFIED`**(Payee 미검증·선행설계 R2 §34)·**`NOT_EXECUTED_NO_FUNDING`**(Commitment/자금 부재·4-5-3-1-3 §16)·**`APPROVED_MANUAL`**(자동집행 불가·수동 처리 필요)·**`EXECUTING`**(in-flight·★선행설계 R3 §53 잔액 집계 포함 필수)·**`EXECUTED`**(**실 집행 성공만**)·**`FAILED`**(호출했으나 거절/오류). **★현행 정본 재사용**: Alerting **"집행 결과에 따라 상태를 정직하게 기록(`executed`=실집행성공 / `failed`=실패 / `approved_manual`=자동집행 불가)"**(Alerting.php:610-611).
- **★§4.4 최우선 계약 — 외부 미호출인데 EXECUTED 금지**: **"종전엔 `status='executed'` 로만 바꾸고 어떤 외부 API 도 호출하지 않아, 프론트는 '실행 완료'를 표시하나 실제 광고 캠페인은 그대로 소진되던 fake-looks-real 이었다"**(Alerting.php:608-609·287차). **Payout은 돈이 실제 나가는 경로 → 동일 클래스 재발 시 피해 최대**. **EXECUTED 전이는 반드시 ①외부 호출 실행 ②응답 수신 ③성공 판정 ④Provider Response 근거 저장을 모두 충족**. **★미집행(자격증명/검증/자금 부재)과 실패(호출 후 거절)를 구분**(§0 관찰·`no_credentials`는 실패 아님).
- **§72b 실패 시 상태 미변경**: **현행 정본 재사용** — AutoCampaign kill-switch가 **플랫폼 push 실패 시 DB 상태를 바꾸지 않고 502**(AutoCampaign.php:602-609·"'paused' 표기인데 플랫폼은 계속 집행(광고비 누수)" 방지·233차 P1). **★Rebate: 외부 지급 결과 불명(타임아웃/네트워크 오류) 시 EXECUTED/FAILED 임의 단정 금지 → `EXECUTING` 유지 후 §77 조회 정합(고아 회수·선행설계 R3 §46)**.

## 4. Credential Gate (§73) · Payee Account (§73b) · Batch (§76)

- **★Credential Gate(§73)**: **자격증명/권한 없으면 실 호출 없이 `NOT_EXECUTED_NO_CREDENTIALS` 반환**. **현행 정본 재사용**: **"각 어댑터는 해당 매체 자격증명이 없으면 `no_credentials` 반환(실 API 호출 안 함)"**(AdAdapters.php:19)·**"★미검증 고지: 실 쓰기 자격증명으로 라이브 검증 후 운영 권장"**(:25)=**미검증 어댑터를 검증된 것으로 표기 금지**. **★Rebate Payout 어댑터도 라이브 검증 전에는 미검증 고지 유지(문서 스펙 기준 구현을 검증 완료로 표기 금지·288차 가짜녹색 정합)**.
- **Payee Account(§73b)**: payee_account_reference_id·participant·**account type·토큰화 참조(★계좌번호 원문 저장 금지·4-5-3-1-3 §9 Authorized Reference 계승·헌법 No-PII)·verification reference(선행설계 R2 §34)·통화·법인·유효성**·evidence. **★§4.8 미검증 Payee 지급 금지(fail-closed)·검증 만료 시 지급 차단·Instruction의 account snapshot은 불변(실행 중 계좌 변경 반영 금지=사기 벡터)**.
- **Batch(§76)**: batch_id·**대상 payouts·총액·통화·생성/실행 시각·부분 실패 처리 정책·batch idempotency_key**·evidence. **★부분 실패 시 batch 전체를 성공/실패로 뭉뚱그리기 금지 — 건별 상태 기록**(288차 가짜녹색 정합)·**batch 재실행 시 건별 결정적 Key로 중복 지급 차단**(§75).

## 5. ★Idempotency (§75) · Return/Bounce (§77b) · FX/Fee (§78)

- **★Idempotency(§75)**: **선행설계 R3 §44 3층 방어 위임 수령** — ①**Settlement Point의 결정적 Payout Key**(★`microtime`/난수 금지·"같은 정산지점은 언제 몇 번 실행하든 같은 orderId"·BillingMethod.php:456-460) ②**`UNIQUE(payout, settlement_point)` 선점**(현행 정본 `uq_asl_order(tenant_id, order_id)`·:151) ③**외부 PG/은행이 최후 방어선**("그러면 Toss 가 최후의 방어선이 된다"). **★비결정적 Key로 지급하면 외부가 중복을 못 걸러 두 번 송금**(inbound 카드 이중청구의 outbound 대칭·§0 Ledger 문서 정합).
- **Return/Bounce(§77b)**: 반송/실패 사유(계좌 오류·수취 거절·은행 반송)·**반송 시 Ledger는 REVERSAL Entry(선행설계 R3 §47·원본 삭제 금지)**·재시도 정책(**동일 결정적 Key 유지**)·재시도 한도·수동 전환.
- **FX/Fee(§78)**: 지급 통화≠원장 통화 시 **FX Stage 명시**(4-5-3-1-3 §FX Stage·rate version)·**Fee 부담 주체 명시**(§78b·송금 수수료를 수취인/지급인 중 누가 부담하는지·4-5-3-1-3 §Fee Responsibility)·**Fee/FX도 Entry로 기록(선행설계 R3 §41b FX_ADJUSTMENT)·차액을 조용히 흡수 금지**.

## 6. Reconciliation (§77) · Guard/Error (§79)

- **Reconciliation(§77, 12)**: **내부 Payout state↔외부 지급 원장(★"우리 DB 가 아니라 매입사 원장이 진실"·BillingMethod.php:549 계승·불일치 시 외부 우선)**·EXECUTING 방치↔외부 조회 정정(**고아 회수·CLAIM_STALE_SEC 패턴·"잔액 계산 전에" 선행**·선행설계 R3 §46/§54)·Payout↔Settlement↔Claim↔Accrual 체인·Payout↔Ledger PAYOUT_LINK·Batch 합계↔건별 합계·Payee account↔verification·FX↔rate version·Fee↔부담 주체·Return↔REVERSAL Entry·Method↔현금 이동 여부·Funding party↔실 자금 출처·Historical↔Applied.
- **Guard/Error(§79, 16)**: **★`EXECUTED_WITHOUT_PROVIDER_CALL`(가짜집행·287차 클래스·CI 가드 대상)**·**`PROVIDER_RESPONSE_MISSING`**·`NOT_EXECUTED_MARKED_SUCCESS`(288차 `ok=>true` 위장 클래스)·**`NON_DETERMINISTIC_PAYOUT_KEY`**·`UNIQUE_SETTLEMENT_POINT_MISSING`·**`PAYEE_NOT_VERIFIED`**·`PAYEE_ACCOUNT_CHANGED_MID_EXECUTION`·**`CREDIT_MEMO_MARKED_AS_CASH_PAID`**·`BATCH_AGGREGATE_STATUS_ONLY`·**`EXECUTING_EXCLUDED_FROM_BALANCE`**(선행설계 R3 §4.4)·`TIMEOUT_ASSUMED_SUCCESS`·`TIMEOUT_ASSUMED_FAILURE`·`FUNDING_UNAVAILABLE_EXECUTED`·`UNVERIFIED_ADAPTER_MARKED_VERIFIED`·`FEE_FX_SILENTLY_ABSORBED`·`CROSS_TENANT_PAYOUT`. → Critical 시 **Access Review 차단·자동 지급 즉시 중지**.

## 7. Payout Matrix (§80) — 현행

| 실행 | 방향 | 자격증명 게이트 | 정직 상태 | 실패 시 | 결정적 Key | 외부 진실 | Evidence |
|---|---|---|---|---|---|---|---|
| (Rebate Payout) | **outbound** | — | — | — | — | — | **NOT_APPLICABLE(전부 신설)** |
| **인접(정본): 액션 집행** | 광고 API | **AdAdapters 내장** | **★executed/failed/approved_manual**(:610-611) | failed 기록 | N/A | N/A | Alerting(287차 :608-611) |
| **인접(정본): 매체 어댑터** | 광고 API | **★`no_credentials`(실 호출 안 함)**(:19) | **미검증 고지**(:25) | 어댑터 응답 | N/A | N/A | AdAdapters |
| **인접(정본): kill-switch** | 광고 API | 자격증명 | — | **★DB 상태 미변경·502**(:602-609) | N/A | 플랫폼 | AutoCampaign(233차) |
| **인접(정본): 카드 청구** | **inbound(복제 금지)** | Toss 키 | pending/charging/charged | 회수 | **★결정적 orderId**(:456-460) | **★매입사 원장**(:549) | BillingMethod(278차) |
| (Rebate Payee 계좌·KYC·송금·Batch·Return) | — | — | — | — | — | — | **부재→신설** |
