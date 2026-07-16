# CANONICAL DSAR — Rebate Tier·Threshold·Calculation Definition Governance (Tier·Threshold·Basis·Method·Cap·Floor·Rounding·Proration·Reconciliation·Guard)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: [`CANONICAL_DSAR_REBATE_RULE_DEFINITION.md`](CANONICAL_DSAR_REBATE_RULE_DEFINITION.md)(Rule/Condition/Operator/DSL/Scope/Stacking/Evaluation) + 본 문서(Tier/Threshold/Basis/Method/Cap/Floor/Rounding/Proration/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_RULE_TIER_THRESHOLD_CALCULATION.md`](../architecture/ADR_DSAR_REBATE_RULE_TIER_THRESHOLD_CALCULATION.md).
> 선행: Type/Classification(4-5-3-1-2 **Calculation Basis 33·Structure 18=분류축**·본 문서=**실행 정의**)·Funding(4-5-3-1-3 Float 금지·Percentage+Amount)·Lifecycle/Versioning(4-5-3-1-4 as-of·Backfill≠Recalculation).
> **범위**: 계산 **정의(Definition)**만 — Accrual 생성/Claim 승인/Settlement/Payout 실행 아님(후속 4-5-3-1-6~9).

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Tier / Threshold / Calculation 엔진** | ❌ **부재(grep 0)** — `rebate_tier/volume_tier/tier_threshold` 전무 | **NOT_APPLICABLE → 신설** |
| **Tier 구간 구조** | ✅ **REAL** — plan_period_pricing(**seat_tier·period_months·price_usd·discount_pct·is_active**·[AdminPlans.php:406](../../backend/src/Handlers/AdminPlans.php)/414)·plan_config `seat_tiers_json`(:34/431)·**라이브 SHOW COLUMNS 판정**(:405) | **참조(§20 구간 구조·요금제 티어≠rebate·KEEP_SEPARATE)** |
| **Rate 기반 계산** | ✅ **REAL** — kr_fee_rule(**platform_fee_rate·ad_fee_rate·vat_rate**·[KrChannel.php:127-128](../../backend/src/Handlers/KrChannel.php))·`$expectedFee = $gross * $feeRate`(:471) | **재사용(§22 PERCENTAGE_OF_BASIS)** |
| **Threshold 기반 혜택** | ✅ **REAL** — kr_fee_rule **`free_ship_threshold`**(임계 초과 시 무료배송·[KrChannel.php:123](../../backend/src/Handlers/KrChannel.php) 멱등 ALTER) | **재사용(§21 Threshold·§4.4 대비 사례)** |
| **Floor / Cap(가드)** | ✅ **REAL** — PriceOpt price_rule **`min_price`/`max_price`(사용자 가드)**·[PriceOpt.php:126-128](../../backend/src/Handlers/PriceOpt.php)·**원가 플로어** `$minPrice = $cost / (1 - $targetMargin)`(:218/775)·**floor 적용** `max($minPrice, round($p,0))`(:301) | **재사용(§25 Floor·Cap)** |
| **Rounding 정책** | ✅ **REAL** — PriceOpt `round($best['price'], -2)`(**100원 단위**·:245/786-787)·`round($p, 0)`(:301)·kr `round($gross*$feeRate, 0)`(KrChannel.php:471) | **재사용(§26 Rounding·단위/방향 명시)** |
| **데이터 신선도 가드** | ✅ **REAL** — PriceOpt `comp_max_age_hours`(:128·경쟁가 신선도 임계) | **재사용(§28 Guard·Stale 계산 금지)** |
| **Offset(언더컷) 파라미터** | ✅ **REAL** — PriceOpt `beat_by REAL DEFAULT 1.0`(:128·%) | **참조(§22 Offset 유형)** |
| **Rebate Tier/Threshold/Basis(rebate)/Method/Cap/Floor/Rounding/Proration/Currency/Reconciliation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Tier/Threshold/Calculation 엔진은 부재(NOT_APPLICABLE·grep 0)**. 실 인접=Tier 구간(plan seat_tier·**요금제 티어=KEEP_SEPARATE·rebate 아님**)·Rate 계산(kr_fee_rule platform_fee_rate×gross)·Threshold 혜택(free_ship_threshold)·**Floor/Cap(PriceOpt min/max_price·원가 플로어)**·**Rounding(round -2/0)**·신선도 가드(comp_max_age_hours). **★핵심 정직: §4.3 Tier≠Threshold·★§4.4 Cumulative(소급형)≠Incremental(증분형) Tier — 금액이 근본적으로 달라짐·§4.5 Basis≠Method·§4.9 Float 금지(Decimal)**. **기존 kr_fee_rule/PriceOpt 가드 패턴 재사용(중복 금지·§40)**·지어내기·NO_DATA/오탐 금지·전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **현행 계산·임계는 전부 Float**(kr_fee_rule `DOUBLE`·PriceOpt `REAL`·rule_engine `threshold REAL`). 가격 제안/알림 임계에선 수용되나 **Rebate 금액 계산에 Float 복제 금지**(§4.9·Decimal·4-5-1-4 §33·4-5-3-1-3 §33 계승).
- **현행 인접에 Cumulative/Incremental Tier 개념 자체가 없다**(free_ship_threshold=단일 임계 on/off·seat_tier=가격표 조회). **§4.4는 현행에서 유래할 수 없는 신설 계약** — 지어내기 아님을 명시(볼륨 리베이트 도입 시 최초 정의).

---

## 1. Canonical Entity (19) — §5 (이번 블록)

REBATE_TIER_SCHEDULE·REBATE_TIER·TIER_THRESHOLD·TIER_BOUNDARY_POLICY·TIER_PROGRESSION_MODEL·CALCULATION_DEFINITION·CALCULATION_BASIS_BINDING·CALCULATION_METHOD·CALCULATION_PERIOD·MEASUREMENT_WINDOW·CAP_POLICY·FLOOR_POLICY·ROUNDING_POLICY·PRORATION_POLICY·CURRENCY_POLICY·CALCULATION_INPUT_BINDING·CALCULATION_RECONCILIATION·CALCULATION_EVIDENCE·CALCULATION_AUDIT_EVENT.
**현행 실체**: Rate(kr_fee_rule)·Threshold(free_ship_threshold)·Floor/Cap(PriceOpt min/max_price)·Rounding(round -2/0)·신선도(comp_max_age_hours) = REAL 재사용. 나머지 = **신설**.

## 2. Tier Schedule (§20) · Tier (§20b) · Threshold (§21) ★Tier≠Threshold

- **Tier Schedule(§20)**: tier_schedule_id·rule·**program version pin·tier progression model·measurement basis·measurement window·tiers·boundary policy·currency·통화 환산 시점**·effective_from/to·status·evidence.
- **Tier(§20b)**: tier_id·schedule·**tier_index·tier_label·lower_bound·upper_bound·bound inclusivity(§21b)·rate(Decimal)·fixed_amount(Decimal)·calculation method·cap·floor·조건 reference**·evidence. **★Tier=구간(범위)·Threshold=경계값(단일 수치)** — **§4.3 혼동 금지**(Tier는 [lower, upper) 구간·Threshold는 그 경계). 현행 인접: plan seat_tier(가격표 구간·AdminPlans.php:406·**KEEP_SEPARATE**)·free_ship_threshold(단일 경계 on/off·KrChannel.php:123).
- **Threshold(§21)**: threshold_id·**threshold_type·value(Decimal)·unit·measurement basis·비교 연산자(Rule 문서 §8 화이트리스트)·달성 판정 시점**·evidence. Type(9): QUALIFICATION(최소 자격)·TIER_ENTRY·TIER_EXIT·CAP_TRIGGER·GROWTH·MIX_RATIO·PAYMENT_TERM·PENALTY·CUSTOM.
- **Boundary Policy(§21b)**: **lower_inclusive/upper_exclusive 기본**([lower, upper))·**★경계 중첩(overlap)·공백(gap) 금지=Critical**(동일 측정값이 2개 Tier에 매치되거나 어느 Tier에도 매치되지 않는 스케줄 발행 금지)·경계값 자체의 귀속 명시(예: 정확히 1,000,000 = 상위 Tier)·단위·통화 일치 검증.

## 3. ★Tier Progression Model (§22a) — Cumulative≠Incremental (핵심)

- **Progression Model(6)**: **CUMULATIVE_RETROACTIVE**(임계 달성 시 **전체 물량에 상위 요율 소급**·"whole-volume")·**INCREMENTAL_MARGINAL**(**초과분에만 상위 요율**·"marginal/stairstep")·**FLAT_PER_TIER**(도달 Tier 단일 요율·소급/증분 아님)·**FIXED_AMOUNT_PER_TIER**(구간별 정액)·**HYBRID**(구간별 상이·명시)·CUSTOM.
- **★§4.4 — 동일 Tier 표에서 Progression Model만 다르면 금액이 근본적으로 달라진다.** 예(계약 명세용 예시·실 데이터 아님): 구간 0~100(2%)·100~200(3%)·실적 150 →
  - CUMULATIVE_RETROACTIVE = 150 × 3% = **4.5**
  - INCREMENTAL_MARGINAL = (100 × 2%) + (50 × 3%) = **3.5**
  - **모델 미지정 시 계산 불가** → **★Progression Model 없는 Tier Schedule 발행 금지(기본값 추정 금지·fail-closed)**. 계약 원문 해석은 Authorized Reference(4-5-3-1-3 §9)로 근거화·**추정 금지**.
- **Retroactive True-up(§22b)**: CUMULATIVE_RETROACTIVE에서 상위 Tier 달성 시 **기 발생 Accrual과의 차액(true-up)** 발생 → **기존 Accrual UPDATE 금지·차액을 신규 Append-only 항목으로 생성**(4-5-3-1-4 §32 Backfill≠Recalculation·OrderHub 역분개/4-5-2-5 Reversal 정합). **하향(미달) 시 clawback 판정=4-5-3-1-9 후속**.

## 4. Calculation Definition (§22) · Basis Binding (§23) · Method (§24) ★Basis≠Method

- **Calculation Definition(§22)**: calculation_definition_id·rule/tier·**basis binding·method·rate(Decimal)·fixed_amount(Decimal)·offset·period·measurement window·cap/floor/rounding/proration/currency policy·input binding·version pin**·evidence.
- **Basis Binding(§23)**: **무엇에 대해 계산하는가** — 4-5-3-1-2 **Calculation Basis(33) 분류축을 실행 바인딩으로 연결**(재정의 금지·중복 금지). 필수: **basis_source(Canonical Reference·거래/정산/집계)·net/gross 여부·취소/반품 제외 술어(★현행 SSOT: 취소제외 2축 통일·286차)·VAT 포함 여부(Pnl VAT 넷팅 정합)·통화·as-of**. **★Gross≠Net·VAT 포함/제외 미지정 계산 금지**.
- **Method(§24, 12)**: PERCENTAGE_OF_BASIS(현행 인접: `$gross*$feeRate`·KrChannel.php:471)·FIXED_AMOUNT·PER_UNIT·PER_UNIT_TIERED·TIERED_PERCENTAGE·TIERED_FIXED·GROWTH_OVER_BASELINE·MIX_RATIO_BASED·PRICE_DIFFERENCE(scan-back/price protection)·OFFSET_BASED(현행 인접: PriceOpt `beat_by`·:128)·FORMULA(화이트리스트 연산자만·**임의 eval 금지**)·CUSTOM.
**★§4.5 Basis≠Method(기준=무엇에 대해·방법=어떻게)·§4.2 Definition≠Evaluation(Rule 문서 §13)**.

## 5. Period (§25a) · Measurement Window (§25b) · Proration (§27)

- **Period(§25a)**: 계산 주기(MONTHLY/QUARTERLY/ANNUAL/CONTRACT_TERM/CAMPAIGN/CUSTOM)·**period 경계·타임존(현행 DEFAULT_TZ 'Asia/Seoul' 정합·RuleEngine.php:35)·마감 시점**.
- **Measurement Window(§25b)**: 실적 집계 창(**period와 불일치 가능**·rolling/calendar/anniversary)·**지연 도착 데이터 처리(late-arriving·Backfill 계약·4-5-3-1-4 §31)**·**★측정 창과 계산 주기 혼동 금지**.
- **Proration(§27, 6)**: NONE·DAILY·MONTHLY·BY_VOLUME·BY_PERIOD_OVERLAP·CUSTOM. **★기간 중 Program/Rule Version 전환·중도 가입/탈퇴·Suspension 기간(4-5-3-1-4 §13) 시 안분 정책 필수**·미지정 시 계산 금지(fail-closed).

## 6. Cap (§25c) · Floor (§25d) · Rounding (§26) · Currency (§28a)

- **Cap Policy(§25c)**: cap_type(PER_TRANSACTION/PER_PERIOD/PER_PARTICIPANT/PER_PROGRAM/BUDGET_LINKED)·**cap_amount(Decimal)·cap 도달 시 동작(STOP/PARTIAL/QUEUE)·Commitment 연동(4-5-3-1-3 §16 부족 시 Accrual 금지)**·evidence. **현행 인접 재사용**: PriceOpt `max_price`(사용자 가드·:128)·BillingMethod MTD budget cap.
- **Floor Policy(§25d)**: floor_type(MIN_AMOUNT/MIN_QUALIFICATION/COST_FLOOR)·floor_amount(Decimal)·미달 시 동작(ZERO/CARRY_FORWARD/REJECT). **현행 정본 재사용**: PriceOpt **원가 플로어**(`$minPrice=$cost/(1-$targetMargin)`·:218/775)·**floor 강제 적용**(`max($minPrice, round($p,0))`·:301)=**계산 결과에 floor를 최종 적용하는 순서 정본**.
- **Rounding(§26)**: **rounding_unit(1/10/100…)·direction(HALF_UP/HALF_EVEN/UP/DOWN/TRUNCATE)·적용 시점(per-line/per-tier/최종 1회)·잔차 귀속(4-5-3-1-3 §14 rounding difference owner)**. **현행 인접**: `round($price, -2)`(100원 단위·PriceOpt.php:245)·`round($gross*$feeRate, 0)`(KrChannel.php:471). **★§4.6 Rounding 미지정 금지·적용 시점 명시 필수(라인별 반올림 합계≠합계 반올림)·잔차 소유자 명시**.
- **Currency(§28a)**: calculation/basis/accrual/settlement currency·**FX Stage별(4-5-3-1-3 §FX Stage 10 계승)·rate version(fxToKrw GAP)·환산 시점 명시**. **★혼합 통화 basis를 단일 요율로 계산 금지**.

## 7. Guard (§28) · Reconciliation (§29) · Critical Gap (§30) · Error/Warning (§31)

- **Guard(§28, 12)**: **Progression Model 없는 Tier Schedule 금지(§4.4)**·**경계 overlap/gap 금지(§21b)**·Basis(gross/net·취소제외·VAT) 미지정 금지·Rounding/Proration 미지정 금지·**Float 금지(Decimal 강제·§4.9)**·**Stale 입력 계산 금지**(PriceOpt comp_max_age_hours 재사용·헌법 Vol3 Trust READY 미달 시 자동화 제외)·Cap/Commitment 초과 Accrual 금지(4-5-3-1-3 §16)·Version pin 없는 계산 금지(4-5-3-1-4)·**기존 Accrual UPDATE 금지(true-up=Append-only·§22b)**·임의 FORMULA/eval 금지(화이트리스트)·Cross-Tenant/Wrong Legal Entity 차단·계산 근거(Evidence) 없는 결과 금지.
- **Reconciliation(§29, 14)**: Tier↔Threshold 경계·Schedule↔Progression Model·Basis↔실 거래 집합(취소제외 2축 SSOT)·Method↔Basis 단위·Cap↔Commitment↔Budget·Floor↔Cost·Rounding↔잔차 소유자·Period↔Measurement Window·Proration↔Version 전환·Currency↔FX Stage·Definition↔Evaluation(Rule §13)·계산결과↔Provider/계약 상대방 명세·true-up↔기 Accrual·Historical↔Applied.
- **Critical Gap(§30, 13)**: Progression Model 미지정·Tier 경계 overlap/gap·Basis gross/net 미지정·취소/반품 미제외·VAT 처리 미지정·Rounding 미지정·Float 계산·Cap 초과 Accrual·Commitment 없는 계산·Stale 입력·기존 Accrual 덮어쓰기(true-up)·Version pin 부재·Cross-Tenant 계산. → **Access Review 차단**.
- **Error(§31a, 16)**: TIER_PROGRESSION_MODEL_MISSING·TIER_BOUNDARY_OVERLAP·TIER_BOUNDARY_GAP·BASIS_UNDEFINED·GROSS_NET_UNSPECIFIED·VAT_TREATMENT_UNSPECIFIED·ROUNDING_UNDEFINED·PRORATION_UNDEFINED·FLOAT_ARITHMETIC·CAP_EXCEEDED·COMMITMENT_INSUFFICIENT·STALE_INPUT_BLOCKED·ACCRUAL_UPDATE_BLOCKED·VERSION_PIN_MISSING·CURRENCY_MIXED_BASIS·EVIDENCE_MISSING. **Warning(§31b, 10)**: TIER_SCHEDULE_SINGLE_TIER·CAP_NEAR_LIMIT·FLOOR_FREQUENTLY_BINDING·ROUNDING_RESIDUAL_ACCUMULATING·MEASUREMENT_WINDOW_MISALIGNED·LATE_ARRIVING_DATA·TRUE_UP_LARGE·FX_RATE_VERSION_STALE·PRORATION_EDGE_PERIOD·SIMULATION_NOT_RUN.

## 8. Tier Matrix (§45) · Calculation Matrix (§46) — 현행

| Schedule | Tier | Lower/Upper | Progression Model | Rate | Cap | Floor | Rounding | Currency | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Tier) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(참조·KEEP_SEPARATE): 요금제 | seat_tier | 좌석 구간 | N/A(가격표 조회) | price_usd·**discount_pct** | N/A | N/A | N/A | USD | plan_period_pricing(:406) |
| 인접(재사용): 무료배송 | 단일 임계 | **free_ship_threshold** | **N/A(on/off·§4.4 개념 부재)** | N/A | N/A | N/A | N/A | KRW | kr_fee_rule(:123) |

| Calculation | Basis | Method | Offset | Cap | Floor | Rounding | Float? | 현행 정본 |
|---|---|---|---|---|---|---|---|---|
| (Rebate Calculation) | — | — | — | — | — | — | **Decimal 강제** | **N/A(신설)** |
| 인접(재사용): 마켓 수수료 | gross_sales | **PERCENTAGE_OF_BASIS** | N/A | N/A | N/A | **round(…, 0)** | ★DOUBLE | KrChannel(:471) |
| 인접(재사용): 리프라이서 | 경쟁가 | OFFSET_BASED | **beat_by 1.0%** | **max_price** | **원가 플로어**(:218) | **round(…, -2)** | ★REAL | PriceOpt(:245/301) |
