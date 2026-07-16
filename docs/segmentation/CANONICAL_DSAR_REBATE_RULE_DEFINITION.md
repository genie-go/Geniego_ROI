# CANONICAL DSAR — Rebate Rule Definition (Rule·Condition·Operator·DSL·Scope Precedence·Stacking·Evaluation)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 정본 쌍: 본 문서(Rule/Condition/Operator/DSL/Scope Precedence/Stacking/Evaluation) + [`CANONICAL_DSAR_REBATE_TIER_CALCULATION_GOVERNANCE.md`](CANONICAL_DSAR_REBATE_TIER_CALCULATION_GOVERNANCE.md)(Tier/Threshold/Basis/Method/Cap/Floor/Rounding/Proration/Reconciliation/Guard).
> ADR: [`../architecture/ADR_DSAR_REBATE_RULE_TIER_THRESHOLD_CALCULATION.md`](../architecture/ADR_DSAR_REBATE_RULE_TIER_THRESHOLD_CALCULATION.md).
> 선행: Program Master(4-5-3-1-1 **§6.1 "Program≠Rule·Rule=후속" 위임 수령**)·Type/Classification(4-5-3-1-2 **Calculation Basis 33·Structure 18=분류축**)·Funding(4-5-3-1-3)·**Lifecycle/Versioning(4-5-3-1-4 as-of·in-flight pinning)**·Segmentation Canonical DSL(3-2).
> **범위**: Rule **정의(Definition)**만 — Eligibility 판정/Accrual 생성/Claim 승인/Settlement/Payout 실행 아님(후속 4-5-3-1-6~9). **중복 구현 금지.**

---

## 0. 실측 요약 — 현행 대비(실측 → Canonical) ★정직 최우선

| 프롬프트 요구 | 현행 실측(코드 근거) | Canonical 분류 |
|---|---|---|
| **Rebate Rule / Tier / Threshold 엔진** | ❌ **부재(grep 0)** — `rebate_rule/rebate_tier/volume_tier/tier_threshold/scan_back/bill_back` 전무 | **NOT_APPLICABLE → 신설(전방호환)** |
| **Rule Definition(조건·연산자·액션) Store** | ✅ **REAL** — `rule_engine`(**metric VARCHAR(40)·op VARCHAR(8)·threshold REAL·target·action·action_params·enabled**·[RuleEngine.php:41-45](../../backend/src/Handlers/RuleEngine.php))·**화이트리스트 검증**(METRICS 6·OPS 5·ACTIONS 4·:32-34·미등록 값 **422 거부** :120-121) | **재사용(§6 Rule·§8 Operator 화이트리스트)** |
| **Rule Evaluation Evidence** | ✅ **REAL** — `rule_engine_log`(**metric·observed·threshold** 동시 기록·:47-49)·`computeMetric`(:204) | **재사용(§13 Evaluation Evidence)** |
| **중첩 Condition Tree DSL** | ✅ **REAL** — `Alerting` **condition_tree `{op:"AND", children:[{metric,op,threshold}]}`**([Alerting.php:71](../../backend/src/Handlers/Alerting.php))·alert_policy(metric/operator/threshold/policy_json :103)·평가 breaches(:387-393) | **재사용(§7 Condition Tree)** |
| **Segment Rule DSL(6 operator)** | ✅ **REAL** — crm_segments `rules=[{field,op,value}]`·**op match: gte/lte/gt/lt/eq/ne(6)·AND 암묵**([CRM.php:1571](../../backend/src/Handlers/CRM.php)·시드 :1440-1448) | **재사용·정합(Segmentation Canonical DSL 3-2 상위호환)** |
| **계산 Rule(전략·가드) 실 사례** | ✅ **REAL** — PriceOpt `price_rule`(**mode DEFAULT 'min_price'·channel DEFAULT '\*'(와일드카드)**·[PriceOpt.php:123](../../backend/src/Handlers/PriceOpt.php))·per-rule 파라미터(**beat_by REAL 1.0·min_price·max_price(사용자 가드)·comp_max_age_hours(데이터 신선도)**·:126-128) | **재사용(§9 Scope Precedence·§11 Guard·Tier 문서 §Cap/Floor)** |
| **요율·임계 기반 계산** | ✅ **REAL** — kr_fee_rule(**platform_fee_rate·ad_fee_rate·free_ship_threshold**(:123 임계 기반 무료배송)·vat_rate·[KrChannel.php:127-128](../../backend/src/Handlers/KrChannel.php))·`$expectedFee=$gross*$feeRate`(:471) | **참조(Tier 문서 §Basis·Rate)** |
| **Tier 구조** | ✅ **REAL** — plan_period_pricing(**seat_tier·period_months·price_usd·discount_pct**·[AdminPlans.php:406](../../backend/src/Handlers/AdminPlans.php)/414)·plan_config.seat_tiers_json(:34/431) | **참조(Tier 문서 §20 구간 구조·rebate 아님)** |
| **Rebate Rule/Condition/Operator(rebate)/DSL/Scope Precedence/Stacking/Exclusivity/Evaluation/Simulation** | ❌ 부재 | **NOT_APPLICABLE → 신설** |

**★결론(정직)**: **Rebate Rule/Tier/Threshold 엔진은 부재(NOT_APPLICABLE·grep 0)**. 실 인접=Rule Store(rule_engine metric·op·threshold+**화이트리스트 422 거부**)·Evaluation Evidence(rule_engine_log observed↔threshold)·중첩 DSL(Alerting condition_tree)·Segment DSL(CRM 6 operator·AND 암묵)·계산 가드(PriceOpt mode/beat_by/min·max_price/comp_max_age_hours/channel '\*')·요율·임계(kr_fee_rule). **기존 DSL 재사용·중복 금지(§40·★§4.14)**.

### ★핵심 정직 — DSL 3종 병존·operator 집합 불일치(실측)
현행에 **Rule DSL이 3종 병존**하고 **operator 집합이 서로 다르다**: ①`RuleEngine` 5 op(`lt/lte/gt/gte/eq`·**ne 없음**·평면 단일조건·RuleEngine.php:33) ②`crm_segments` **6 op**(`gte/lte/gt/lt/eq/ne`·AND 암묵·CRM.php:1571) ③`Alerting` condition_tree(**문자열 op `">"` 직접**·중첩 AND/children·Alerting.php:71/387). **★§4.14: Rebate는 4번째 DSL을 난립시키지 않는다** — Canonical Rebate Rule DSL은 **Segmentation Canonical DSL(3-2·6 operator·AND 상위호환)에 정합**하고, 기존 3종을 **대체하지 않고 참조/확장**(헌법 Vol4 "Intelligence Layer는 하나·중복엔진 금지"·Golden Rule=Replace 아니라 Extend). 지어내기·NO_DATA/오탐 금지·본 Rule=멀티테넌트 고객용 미래 rebate 전방호환 계약.

### ★인접 관찰(설계 근거·본 세션 코드변경 0)
- **현행 Rule/계산 저장은 Float**(rule_engine `threshold REAL`·PriceOpt `beat_by/min_price/max_price REAL`·kr_fee_rule `DOUBLE`·Alerting `(float)`). 알림 임계/가격 제안 용도에선 수용 가능하나, **Rebate 금액 계산은 Decimal 강제**(§4.9·4-5-1-4 §33·4-5-3-1-3 §33 계승) — **현행 Float 패턴을 money 계산에 그대로 복제 금지**.

---

## 1. Canonical Entity (20) — §5 (이번 블록)

REBATE_RULE·RULE_SET·RULE_CONDITION·CONDITION_TREE·CONDITION_OPERAND·RULE_OPERATOR_REGISTRY·RULE_SCOPE_BINDING·SCOPE_PRECEDENCE_POLICY·RULE_PRIORITY·STACKING_POLICY·EXCLUSIVITY_GROUP·RULE_VERSION_PIN·RULE_EVALUATION·EVALUATION_INPUT_SNAPSHOT·EVALUATION_TRACE·RULE_SIMULATION·RULE_DECISION·RULE_RECONCILIATION·RULE_EVIDENCE·RULE_AUDIT_EVENT.
**후속 블록(4-5-3-1-6~9)**: ELIGIBILITY·ACCRUAL·CLAIM·SETTLEMENT·PAYOUT·RECOVERY(**이번 블록 중복 구현 금지·Reference Field만 준비**).
**현행 실체**: Rule Store(rule_engine)·Operator 화이트리스트(METRICS/OPS/ACTIONS)·Condition Tree(Alerting)·Segment DSL(CRM)·Evaluation Evidence(rule_engine_log)·Scope 와일드카드/가드(PriceOpt) = REAL 재사용. 나머지 = **신설**.

## 2. Rule (§6) · Rule Set (§6b) ★Definition≠Evaluation

- **Rule(§6)**: rebate_rule_id·program·**rebate_program_version_id(4-5-3-1-4 as-of pin)·rule_code·rule_name·rule_type·condition_tree reference·calculation reference(Tier 문서 §21)·scope binding·priority·stacking policy·exclusivity group·effective_from/to·enabled·approval reference·author**·status·version·evidence. Type(12): QUALIFICATION·VOLUME_TIER·GROWTH·MIX/ASSORTMENT·PRICE_PROTECTION·SCAN_BACK·BILL_BACK·MDF/COOP·PERFORMANCE·PAYMENT_TERM·EXCEPTION·CUSTOM.
- **Rule Set(§6b)**: rule_set_id·program·version·**rules·평가 순서·기본 동작(no-match)·충돌 해소 정책**·evidence. **★no-match 시 기본 지급 금지(fail-closed·Unknown≠Eligible·4-5-3-1-2 계승)**.
**★§4.1 Program≠Rule(4-5-3-1-1 §6.1 계승·Program=계약 단위·Rule=계산 조건)·★§4.2 Rule Definition≠Rule Evaluation(정의 저장≠평가 결과·평가는 §13 Evaluation Entity로 별도 기록·rule_engine/rule_engine_log 분리 패턴 재사용)·★§4.12 Rule은 Program Version에 pin(as-of·in-flight는 발생 시점 Rule로 완결·4-5-3-1-4 §19)**. → Rule Store=신설(rule_engine 구조 재사용).

## 3. Condition (§7) · Operator Registry (§8) ★화이트리스트

- **Condition Tree(§7)**: condition_tree_id·rule·**node type(GROUP/LEAF)·boolean operator(AND/OR/NOT)·children·depth 제한**·evidence. **Leaf**: condition_id·**operand(좌변)·operator·value(우변)·value_type·unit·currency·as-of source**·evidence. **★현행 재사용**: Alerting condition_tree(`{op:"AND", children:[...]}`·Alerting.php:71/387-393)=**중첩 정본**·crm_segments `[{field,op,value}]`(AND 암묵)=**평면 정본**. Canonical=**중첩(AND/OR/NOT) 상위호환·평면 규칙은 단일 AND 그룹으로 무손실 승격**.
- **Operand(§7b, 20)**: PURCHASE_AMOUNT·PURCHASE_QUANTITY·NET_SALES·GROSS_SALES·UNIT_COUNT·GROWTH_RATE·PERIOD·PRODUCT/SKU/CATEGORY·BRAND·CHANNEL·REGION/COUNTRY·MERCHANT/SELLER·VENDOR/SUPPLIER·CUSTOMER_SEGMENT·PAYMENT_TERM·CONTRACT_REFERENCE·CLAIM_ATTRIBUTE·CUSTOM. **★Operand=Canonical Reference(4-5-3-1-1 §14 Scope Dimension 정합)·문자열 자유입력 금지**.
- **Operator Registry(§8, 14)**: EQ·NE·GT·GTE·LT·LTE·IN·NOT_IN·BETWEEN·CONTAINS·STARTS_WITH·IS_NULL·IS_NOT_NULL·MATCHES_SCOPE. **★§4.14 화이트리스트 강제·임의 표현식/eval/raw SQL 금지** — **현행 정본 재사용**: RuleEngine이 METRICS/OPS/ACTIONS 미등록 값을 **422로 거부**(RuleEngine.php:120-121)·OPS 매핑 테이블(:33). **★Segmentation Canonical DSL(3-2) 6 operator(gte/lte/gt/lt/eq/ne) 상위집합으로 정합**(신규 8종=IN/NOT_IN/BETWEEN/CONTAINS/STARTS_WITH/IS_NULL/IS_NOT_NULL/MATCHES_SCOPE는 **추가만·기존 6종 의미 변경 금지**). **★DSL 4번째 난립 금지(§0)**.

## 4. Scope Binding (§9) · Precedence (§10) · Guard (§11)

- **Scope Binding(§9)**: rule_scope_binding_id·rule·**scope dimension·canonical entity reference·inclusion mode·wildcard 허용 여부**·valid from/to·evidence. **★현행 재사용**: PriceOpt price_rule `channel DEFAULT '*'`(와일드카드=전체 적용·PriceOpt.php:123)·`sku` 특정 지정. 4-5-3-1-1 §14 Scope Dimension(31)·§15 Relationship 재사용(**Scope=문자열 배열 금지**).
- **Precedence(§10, 7)**: SPECIFICITY(구체성 우선·SKU > CATEGORY > BRAND > '\*')·EXPLICIT_PRIORITY(rule.priority)·CONTRACT_OVERRIDE·LONGEST_MATCH·FIRST_MATCH·LAST_MATCH·CUSTOM. **★동일 구체성 다중 매치 시 결정 규칙 필수(비결정적 매치 금지)·Precedence 미정의 Rule Set 발행 금지**.
- **Guard(§11, 12)**: 승인 없는 Rule 발행 금지·Version pin 없는 Rule 평가 금지·Operator 화이트리스트 위반 거부(422 패턴)·Operand Canonical Reference 강제·**Stale 데이터 계산 금지**(PriceOpt `comp_max_age_hours` 재사용·:128 — **신선도 임계 초과 데이터로 Rebate 계산 금지**·헌법 Vol3 Trust READY 정합)·Float 금지(§4.9)·Cross-Tenant/Wrong Legal Entity 차단·no-match 기본 지급 금지·Terminal/Inactive Program Rule 평가 금지(4-5-3-1-4 §10)·Funding/Commitment 없는 Rule 활성 금지(4-5-3-1-3 §16)·순환 참조 금지·depth 상한.

## 5. Priority (§12a) · Stacking (§12b) · Exclusivity (§12c) ★중복 적용

- **Priority(§12a)**: rule.priority(정수·낮을수록 우선)·동률 시 §10 Precedence.
- **Stacking Policy(§12b, 8)**: NONE(단일 Rule만)·ADDITIVE(합산)·SEQUENTIAL(순차 적용·이전 결과가 다음 기준)·BEST_ONLY(최대 1건)·WORST_ONLY·PRIORITY_FIRST·CAPPED_ADDITIVE(합산 후 상한)·CUSTOM. **★§4.7 Stacking 정책 미지정 시 기본=NONE(fail-closed·묵시적 중복 적용 금지)·SEQUENTIAL은 적용 순서 명시 필수(순서가 금액을 바꾼다)**.
- **Exclusivity Group(§12c)**: exclusivity_group_id·rules·**상호 배타 사유·선택 규칙(BEST_ONLY 등)**·evidence. **★동일 거래에 배타 Rule 2건 동시 적용=Critical**.
**★4-5-3-1-2 Instrument Boundary 계승**: Rebate Stacking은 **Discount(coupon)/Cashback/Commission과의 중복 적용이 아님** — 타 Instrument와의 상호작용은 각 도메인 정책(혼동·교차 스태킹 금지).

## 6. Evaluation (§13) · Simulation (§14) ★근거 기록

- **Evaluation(§13)**: rule_evaluation_id·rule·**pinned rule/program version·평가 대상(거래/기간/참여자)·evaluated_at·matched 여부·matched rule·**input snapshot reference**·trace reference·결과(Tier 문서 §21 계산 입력)·decision·idempotency_key**·evidence. **★현행 정본 재사용**: `rule_engine_log`가 **metric·observed·threshold를 함께 기록**(RuleEngine.php:47-49)=**"무엇을·얼마로·어떤 기준과 비교했는지" 재현 가능**. Rebate: **평가 근거(입력값·임계·연산자·매치 경로) 없는 Accrual 생성 금지**(헌법 Vol4 Explainable·근거 없는 결론 금지).
- **Input Snapshot(§13b)**: 평가 시점 입력값 불변 스냅샷(source·as-of·trust score·freshness)·**재계산 시 원본 입력 재사용(현재 값으로 과거 평가 재현 금지·4-5-3-1-4 §32 계승)**.
- **Trace(§13c)**: 노드별 평가 결과(조건·좌변 실측값·우변·판정)·단락 평가 여부·미매치 사유.
- **Simulation(§14)**: rule_simulation_id·rule set·**시뮬레이션 입력·dry-run 결과·영향 건수/금액 추정·비교 대상 Version**·evidence. **★신규/변경 Rule은 발행 전 Simulation(dry-run) 필수**(4-5-3-1-4 §28 migrate dry-run 정신 계승·영향 미확인 발행 금지).

## 7. Rule Matrix (§43) · DSL Matrix (§44) — 현행

| Program | Rule | Type | Condition | Operator | Scope | Priority | Stacking | Version Pin | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| (Rebate Rule) | — | — | — | — | — | — | — | — | **NOT_APPLICABLE(신설)** |
| 인접(재사용): 룰엔진 | rule_engine | alert/pause/reorder | **metric op threshold**(평면 단일) | **OPS 5(화이트리스트·422)** | target | N/A | N/A | N/A | rule_engine_log(observed↔threshold) |
| 인접(재사용): 알림정책 | alert_policy | 알림 | **condition_tree(AND/children)** | 문자열 op ">" | dimension | severity | N/A | N/A | breaches(:393) |
| 인접(재사용): 세그먼트 | crm_segments | 세그 판정 | **[{field,op,value}]**(AND 암묵) | **6(gte/lte/gt/lt/eq/ne)** | tenant | N/A | N/A | N/A | members |
| 인접(재사용): 리프라이서 | price_rule | mode='min_price' | beat_by/min·max_price | N/A | **channel '\*'·sku** | N/A | N/A | N/A | comp_max_age_hours(신선도) |

| DSL | 형태 | Operator | Boolean | 정합 방향 |
|---|---|---|---|---|
| **Canonical Rebate(신설)** | 중첩 Tree | **14(Segment 6 상위집합)** | AND/OR/NOT | **Segmentation Canonical DSL(3-2) 상위호환·4번째 DSL 난립 금지** |
| crm_segments | 평면 배열 | 6 | AND 암묵 | 단일 AND 그룹으로 무손실 승격 |
| Alerting | 중첩 Tree | 문자열 op | AND/children | 구조 재사용(Operator 정규화 필요) |
| RuleEngine | 평면 단일 | 5(ne 없음) | N/A | 화이트리스트 422 패턴 재사용 |
