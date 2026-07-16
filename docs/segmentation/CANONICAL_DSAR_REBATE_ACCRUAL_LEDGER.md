# CANONICAL DSAR — Rebate Accrual & Ledger (Accrual·Ledger Entry·State·Idempotency·Reservation·Reversal·Immutability·Hash Chain)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-7 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Accrual/Ledger/Entry/State/Idempotency/Reservation/Reversal/Immutability) + [`CANONICAL_DSAR_REBATE_BALANCE_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_BALANCE_GOVERNANCE.md)(Balance/Aggregation/in-flight/Statement/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_ACCRUAL_LEDGER_BALANCE.md`](../architecture/ADR_DSAR_REBATE_ACCRUAL_LEDGER_BALANCE.md).
> 선행: Funding(4-5-3-1-3 **§16 Commitment/§17 Reservation 위임 수령**)·Lifecycle(4-5-3-1-4 in-flight pinning·Backfill≠Recalculation)·**Rule/Tier(4-5-3-1-5 §22b true-up=Append-only 위임 수령)**·**Eligibility(4-5-3-1-6 Qualification≠Accrual≠Availability 위임 수령)**·Cashback Ledger(4-5-2-4).
> **범위**: 발생(Accrual)·원장·잔액 구조만 — Claim 승인/Settlement/Payout/Recovery 실행 아님(후속 4-5-3-1-8~9). **중복 구현 금지.**

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Accrual / Ledger / Balance 엔진** | ❌ **부재(grep 0)** — `rebate_accrual/rebate_ledger/rebate_balance/accrual` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **★금전 원장 상태기계(실 정본)** | ✅ **REAL** — `ad_spend_ledger`(tenant_id·ym·campaign_id·channel·**amount BIGINT**·billing_method_id·payment_key·**order_id**·**status DEFAULT 'pending'**·reason·[BillingMethod.php:133-147](../../backend/src/Handlers/BillingMethod.php)) · 상태 **pending→charging→charged**(+`reconciling`) | **재사용(§40 Ledger·§42 State)** |
| **★청구 선점 UNIQUE(동시 이중 생성 차단)** | ✅ **REAL** — **`CREATE UNIQUE INDEX uq_asl_order ON ad_spend_ledger(tenant_id, order_id)`**([:151](../../backend/src/Handlers/BillingMethod.php)/182·"같은 정산지점은 단 한 행만 → 동시에 도는 크론/수동이 같은 금액을 카드에 두 번 청구할 수 없다") | **재사용(§44 Idempotency·§45 선점)** |
| **★결정적 Idempotency Key** | ✅ **REAL** — "정산지점(settlement point) → **결정적 orderId**"·**"★microtime 을 쓰면 안 된다"**(두 프로세스가 각자 다른 orderId → PG가 중복 못 걸러 **카드에 두 번**)·"같은 (테넌트·월·캠페인·목표누적액)은 언제 몇 번 실행하든 같은 orderId"([:456-460](../../backend/src/Handlers/BillingMethod.php)) | **재사용(§44·§4.5 정본)** |
| **★고아 선점 회수(크래시 복구)** | ✅ **REAL** — `CLAIM_STALE_SEC = 600`("'charging' 선점이 이 초 이상 방치되면 크래시로 보고 Toss 조회 후 회수"·[:29-30](../../backend/src/Handlers/BillingMethod.php))·**"방치된 선점 회수를 '누적액 계산 전에' 수행"**(:485)·finalizeLedger 'charged' "중복 청구 차단 — 기청구 확인(회수)"(:536) | **재사용(§46 Orphan Reclaim)** |
| **★외부 원장이 진실** | ✅ **REAL** — **"우리 DB 가 아니라 매입사 원장이 진실이다. 회수 자체도 원자적 상태전이로 단일 프로세스만 수행"**([:549](../../backend/src/Handlers/BillingMethod.php))·Toss 주문조회로 "실제로 돈이 나갔는지" 매입사 원장 확인 후 정정(:476) | **재사용(§48 Reconciliation·§4.8 정본)** |
| **★금전 표현(Float 아님)** | ✅ **REAL** — ad_spend_ledger `amount **BIGINT**`(정수 minor unit·:138) · subscription_ledger `unit_price **DECIMAL(10,2)**`([UserAuth.php:1970-1976](../../backend/src/Handlers/UserAuth.php)) | **재사용(§43 Amount·§4.10 Decimal/정수 강제 실 근거)** |
| **정직 기록(미설정 시)** | ✅ **REAL** — "미설정 시 원장은 **'pending'으로 정직 기록(실청구 0)**"(BillingMethod.php:13) | **재사용(§4.11 정직 상태)** |
| **역분개(Reversal)·멱등** | ✅ **REAL** — ChannelSync 활성→취소/반품 전이 **1회·멱등**(재고복원·claim·**CRM LTV 역분개**·정산 재롤업·[ChannelSync.php:675](../../backend/src/Handlers/ChannelSync.php)/684/4406-4407)·멱등 키 접두 `CHS-`/`CHR-`(:4415) | **재사용(§47 Reversal·4-5-2-5 정합)** |
| **hash-chain Ledger(변조 방지)** | ❌ **부재**(4-5-1-1 확정) | **NOT_APPLICABLE → 신설** |
| **Rebate Accrual/Entry/Reservation(rebate)/Reversal/Balance/Statement** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Accrual/Ledger/Balance 엔진은 부재(NOT_APPLICABLE·grep 0)**. 그러나 **완성된 금전 원장 거버넌스 선례가 `BillingMethod::ad_spend_ledger`에 존재**(278차 이중청구 3중 방어): 상태기계(pending→charging→charged/reconciling)·**UNIQUE 선점**·**결정적 Idempotency Key(microtime 금지)**·**고아 선점 회수(외부 원장 조회)**·**외부 원장이 진실**·**정수 금액(BIGINT)**·정직 pending 기록. **★핵심 정직: §4.1 Accrual≠Payout·§4.2 Ledger=Append-only(UPDATE 금지·정정=역분개)·§4.3 Balance=파생값(원장이 SSOT)·★§4.4 in-flight 상태 제외 금지(이중지급 원인)·§4.9 Reversal≠Deletion**. **기존 ad_spend_ledger 패턴 재사용(중복 원장 엔진 신설 금지·§40)**·hash-chain 부재(신설)·지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **`ad_spend_ledger`는 outbound 지급이 아니라 inbound 청구 원장**(테넌트 카드 과금·4-5-3-1-3 §"pg_settlement inbound 정산≠outbound payout" 계승). **구조·원자성 패턴은 재사용하되 방향(Rebate=outbound payable)을 동일시 금지**·이름만 바꿔 복제 금지.
- **`amount BIGINT`(정수 원)와 `unit_price DECIMAL(10,2)`가 공존** — 이 저장소의 금전 표현은 **이미 Float를 쓰지 않는다**(4-5-3-1-5 §0 관찰의 Float는 알림 임계/가격 제안 계열). Rebate 원장=**정수 minor unit 또는 Decimal 택1 후 전 계층 일관(혼용 금지)**.

---

## 1. Canonical Entity (20) — §5 (이번 블록)

REBATE_ACCRUAL·ACCRUAL_LINE·REBATE_LEDGER·LEDGER_ENTRY·LEDGER_ENTRY_TYPE·LEDGER_STATE·STATE_TRANSITION·IDEMPOTENCY_KEY·SETTLEMENT_POINT·RESERVATION·RESERVATION_RECLAIM·REVERSAL·TRUE_UP_ENTRY·ADJUSTMENT·IMMUTABILITY_SEAL·HASH_CHAIN_LINK·ACCRUAL_SOURCE_BINDING·LEDGER_RECONCILIATION·LEDGER_EVIDENCE·LEDGER_AUDIT_EVENT.
**후속 블록(4-5-3-1-8~9)**: CLAIM·SETTLEMENT·PAYOUT·RECOVERY/CLAWBACK(**이번 블록 중복 구현 금지·Reference Field만 준비**).
**현행 실체**: 상태기계·UNIQUE 선점·결정적 Key·고아 회수·외부 원장 정합·정수 금액(ad_spend_ledger)·역분개 멱등(ChannelSync) = REAL 재사용. hash-chain/Rebate Accrual = **신설**.

## 2. Accrual (§38) · Source Binding (§39) ★Accrual≠Payout

- **Accrual(§38)**: rebate_accrual_id·program·participant·**pinned program/rule/tier version(4-5-3-1-4·4-5-3-1-5)·qualification/eligibility evaluation reference(4-5-3-1-6)·calculation definition reference·accrued_amount(정수 minor unit 또는 Decimal)·currency·FX reference·accrual_basis_period·measurement window·accrued_at·as-of date·state·holdback/maturity reference·funding allocation reference(4-5-3-1-3)·commitment/reservation reference·idempotency_key·evidence**·status·audit. **★§4.1 Accrual≠Availability≠Claim≠Settlement≠Payout(발생·가용·청구·정산·지급 각각 별개 단계·4-5-3-1-6 §4.2 계승)**.
- **Accrual Line(§38b)**: 거래/SKU/Tier 구간별 명세(**Tier 구간별 분해=4-5-3-1-5 §22a Progression Model 산출**·라인 합계=Accrual 총액 검증).
- **Source Binding(§39)**: accrual_source_binding_id·accrual·**source transaction/settlement/claim reference·source system·input snapshot reference(불변·4-5-3-1-5 §13b)·trust/freshness**·evidence. **★Source 없는 Accrual 생성 금지(근거 없는 금전 발생 금지)·동일 Source 다중 Accrual 귀속 금지(§44 Idempotency·4-5-3-1-3 §4.10 Double Funding 대칭)**.

## 3. Ledger (§40) · Entry (§41) · Entry Type (§41b) ★Append-only

- **Ledger(§40)**: rebate_ledger_id·program·participant·**currency·legal entity·accounting entity(4-5-3-1-3 §Accounting)·opening reference·환산 정책**·status·evidence. **★현행 구조 재사용**: ad_spend_ledger(tenant_id·ym·**amount BIGINT**·status·order_id·reason·created_at·인덱스 idx_asl_tenant_ym·BillingMethod.php:133-147) — **단 방향(inbound 청구)이 다름(§0 관찰·복제 금지)**.
- **Entry(§41)**: ledger_entry_id·ledger·accrual reference·**entry_type·amount(부호 명시)·currency·state·settlement_point·idempotency_key·related_entry_id(역분개 대상)·reason·created_at·created_by·pinned version·evidence·hash_chain_link**. **★§4.2 Ledger=Append-only·Immutable — 기존 Entry UPDATE/DELETE 금지**(4-5-3-1-4 §32·4-5-3-1-5 §22b true-up=신규 Entry 계승). **상태 전이만 허용**(§42·전이도 원자적 조건부 UPDATE).
- **Entry Type(§41b, 14)**: ACCRUAL·TRUE_UP(§4.4 소급형 차액·**4-5-3-1-5 §22b 위임 수령**)·DOWN_TRUE_UP·ADJUSTMENT·CORRECTION(4-5-3-1-4 §26b 승인+영향목록 필수)·REVERSAL·CLAWBACK_REFERENCE(**실행은 4-5-3-1-9**)·EXPIRY·WRITE_OFF·CLAIM_LINK·SETTLEMENT_LINK·PAYOUT_LINK·FX_ADJUSTMENT·ROUNDING_RESIDUAL(4-5-3-1-5 §26 잔차 소유자).

## 4. State (§42) · Transition (§42b) · Amount (§43)

- **State(§42, 10)**: PENDING·**RESERVED**·ACCRUED·LOCKED(Holdback·4-5-3-1-6 §20d)·AVAILABLE·CLAIMED·SETTLING·SETTLED·PAID·REVERSED. **★현행 정본 재사용**: ad_spend_ledger `pending→charging→charged`(+`reconciling`)·**"미설정 시 원장은 'pending'으로 정직 기록(실청구 0)"**(BillingMethod.php:13)=**§4.11 미집행을 성공으로 위장 금지(287/288차 가짜녹색 근절 정합)**.
- **Transition(§42b)**: **원자적 조건부 UPDATE + rowCount로만 전이**(4-5-3-1-6 §32·CouponRedeem 정본 계승)·전이 이력 Append-only·**단일 프로세스만 수행**("회수 자체도 원자적 상태전이로 단일 프로세스만 수행"·BillingMethod.php:549)·Terminal(PAID/REVERSED) 재전이 금지(4-5-3-1-4 §10).
- **Amount(§43)**: **정수 minor unit(현행 정본: ad_spend_ledger `amount BIGINT`) 또는 DECIMAL(현행 정본: subscription_ledger `unit_price DECIMAL(10,2)`) 택1 후 전 계층 일관 — ★Float 금지·혼용 금지**(4-5-3-1-5 §4.9·4-5-1-4 §33 계승). 부호 규약 명시(Accrual=+·Reversal=−)·**금액 0 Entry 허용 여부 명시**·통화별 minor unit exponent(KRW=0·USD=2) 선언.

## 5. ★Idempotency (§44) · Settlement Point (§44b) · 선점 UNIQUE (§45) — BillingMethod 정본

- **★Settlement Point(§44b)**: **"이 지점에서 얼마가 발생/지급되어야 하는가"를 결정하는 불변 좌표**(예: 테넌트·기간·프로그램·참여자·목표누적액). **현행 정본**: "정산지점(settlement point) → **결정적 orderId**"(BillingMethod.php:456-460).
- **★Idempotency Key(§44)**: **Settlement Point의 결정적 해시** — **★`microtime`/난수/타임스탬프 금지**("★microtime 을 쓰면 안 된다: 같은 정산지점을 두 프로세스가 각자 다른 orderId 로 청구하면 Toss 가 중복을 걸러줄 수 없어 **카드에 두 번 긁힌다**. 같은 (테넌트·월·캠페인·목표누적액)은 **언제 몇 번 실행하든 같은 orderId**를 만들어야 하고, 그러면 Toss 가 **최후의 방어선**이 된다"·BillingMethod.php:456-460). **★Rebate Payout Key도 결정적이어야 외부 PG/은행이 최후 방어선 역할 가능(4-5-3-1-8 위임)**.
- **★선점 UNIQUE(§45)**: **`UNIQUE(ledger, settlement_point)`** — **현행 정본**: `CREATE UNIQUE INDEX uq_asl_order ON ad_spend_ledger(tenant_id, order_id)`(:151/182·"같은 정산지점은 **단 한 행만** 존재 → 동시에 도는 크론/수동 optimize 가 같은 금액을 카드에 **두 번 청구할 수 없다**"). **★사전 SELECT 체크만으로 중복 방지 금지(TOCTOU·4-5-3-1-6 §32 계승)·3층 방어=①결정적 Key ②UNIQUE 선점 ③외부 원장 최후 방어선**.

## 6. Reservation (§46a) · ★Orphan Reclaim (§46) · Reversal (§47) · Immutability/Hash Chain (§49)

- **Reservation(§46a)**: reservation_id·accrual·commitment reference(**4-5-3-1-3 §16/§17 위임 수령**)·requested/reserved amount·**reserved_at·expires_at·released_at·state**·evidence. **★Commitment/Reservation 부족 시 Accrual 생성 금지(4-5-3-1-3 §6 Enforcement Hook 계승)**.
- **★Orphan Reclaim(§46)**: reclaim_id·**stale 임계(현행 정본 `CLAIM_STALE_SEC = 600`·BillingMethod.php:29-30 "'charging' 선점이 이 초 이상 방치되면 크래시로 보고 Toss 조회 후 회수")·외부 원장 조회 결과·정정 결과·수행 프로세스**·evidence. **★현행 정본 2건**: ①**"방치된 선점 회수를 '누적액 계산 전에' 수행"**(:485 — 안 하면 크래시로 남은 charging 행이 누적액을 왜곡) ②**"우리 DB 가 아니라 매입사 원장이 진실"**(:549·:476 Toss 주문조회로 실제 출금 확인 후 정정·:536 "중복 청구 차단 — 기청구 확인(회수)"). **★Rebate: 진행중(SETTLING) 상태 방치 시 외부 지급 원장 조회로 정정·잔액 계산 전에 회수 선행·회수도 원자적 단일 프로세스**.
- **Reversal(§47)**: reversal_id·target entry·**사유·역분개 Entry(부호 반대·신규 Append)·멱등 키·원본 보존**·evidence. **★§4.9 Reversal≠Deletion — 원본 Entry 삭제/수정 금지·부호 반대 신규 Entry 생성**. **현행 정본 재사용**: ChannelSync 활성→취소/반품 전이 **1회·멱등**(CRM LTV 역분개·재고복원·정산 재롤업·ChannelSync.php:675/4406-4407)·**멱등 키 접두 `CHS-`/`CHR-`**(:4415)=**역분개 이중 적용 차단**. 부분 역분개 시 과다역분개 금지(4-5-3-1-3 §"부분클레임 과다역분개 수정" 계승).
- **Immutability/Hash Chain(§49)**: immutability_seal_id·entry·**prev_entry_hash·entry_hash·sealed_at·chain segment**·evidence. **★부재→신설(4-5-1-1 확정)** — Append-only만으론 사후 변조 탐지 불가 → **hash-chain(prev hash 연결)으로 tamper-evidence**·주기적 seal·검증 Job. **★hash 검증 실패=Critical(Access Review 차단)**.

## 7. Ledger Matrix (§50) — 현행

| 원장 | 금액 표현 | 상태 | 선점 UNIQUE | Idempotency Key | 고아 회수 | 외부 진실 | Append-only | Evidence |
|---|---|---|---|---|---|---|---|---|
| (Rebate Ledger) | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| **인접(정본): 광고비 청구** | **BIGINT(정수 원)** | **pending→charging→charged/reconciling** | **UNIQUE(tenant_id, order_id)**(:151) | **결정적 orderId(microtime 금지)**(:456-460) | **CLAIM_STALE_SEC 600·누적 계산 전 선행**(:29/485) | **매입사 원장이 진실**(:549) | (상태 전이) | ad_spend_ledger(:133-147) |
| 인접(참조): 구독 | **DECIMAL(10,2)** | started/expires/ended | N/A | N/A | N/A | N/A | N/A | subscription_ledger(UserAuth.php:1970) |
| 인접(재사용): 취소/반품 | (주문 금액) | 활성→취소/반품 | N/A | **`CHS-`/`CHR-` 접두 멱등**(:4415) | N/A | 채널 | **역분개(1회·멱등)**(:4406) | ChannelSync |
| (Rebate hash-chain) | — | — | — | — | — | — | **부재→신설** | — |
