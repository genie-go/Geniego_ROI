# EPIC 03-B — Canonical Semantic Model, Metric Contract & Formula Governance (정식 마스터)

> **근거**: 03-A [`CANONICAL_BUSINESS_VOCABULARY.md`](CANONICAL_BUSINESS_VOCABULARY.md)(Term/Metric/Alias/Collision·산식 file:line) + EPIC 01/02(CE/REL/KG) + 실코드 산식. **비파괴**: Contract·Registry·통합계획만. 코드변경 0. 산식 일괄교체·API 필드 삭제·리포트 결과 무통보 변경·자동화 임계 자동전환 없음(§45).
> **§46 통합**: 28개 파편 대신 본 마스터가 Semantic Model·Metric/Measure/Dimension/KPI Contract·Formula Governance·Grain/Aggregation/Filter·Time/Currency/Refund·Null/Zero/Late·Quality/Trust/Confidence Gate·Consumer/UI/API/AI/Automation Contract·Duplicate Audit·Calculation Layer·Versioning·Golden Dataset·Regression·Test를 통합. ADR=[`../architecture/ADR_CANONICAL_SEMANTIC_MODEL.md`](../architecture/ADR_CANONICAL_SEMANTIC_MODEL.md).
> **승인 데이터만**: 03-A BLOCKED_AMBIGUITY(ROAS)·UNVERIFIED(재고회전)은 Production 승인 금지. 하드코딩 산식 금지 — Formula Registry 참조.

---

## 1. Canonical Semantic Model 구조 (§4)
Entity → Relationship → Business Term → **Measure** → **Dimension** → **Metric** → KPI → **Formula** → Filter → Time/Currency/Quality/Confidence Policy → **Consumer Contract** → Version → Evidence. 모든 Metric은 기반 CE/REL 연결.

## 2. Metric Contract Matrix (§47 — MET ID 영구부여)

| Metric ID | Ver | Name | Formula | Measures | Grain | Time | Currency | Refund | Quality Gate | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| MET-REV-000001 | v1 | Net Revenue | SUM(total_price) NOT cancelExcl | MEA-REVENUE | tenant×채널×date | order_time | KRW | 취소제외·post-coupon | READY(Pnl:100) | FORMULA_VERIFIED |
| MET-REV-000002 | v1 | Gross(정산) Revenue | settlementGross | MEA-SETTLE | tenant×기간 | 정산일 | KRW | — | READY(Pnl:204) | FORMULA_VERIFIED |
| MET-CST-000001 | v1 | Media Spend | SUM(spend) | MEA-SPEND | 채널×캠페인 | event_time | 계정→KRW | — | READY | FORMULA_VERIFIED |
| MET-COGS-000001 | v1 | COGS | FEFO→WAC | MEA-COGS | sku | order_time | KRW | — | READY(OrderHub:160) | FORMULA_VERIFIED |
| MET-PROF-000001 | v1 | Operating Profit | rev-cogs-adSpend-fees | 다수 | tenant×기간 | order_time | KRW | 반영 | READY(Pnl:218) | FORMULA_VERIFIED |
| MET-PROF-000002 | v1 | Net Profit | netPayout-cogs-adSpend-... | 다수 | tenant×기간 | 정산 | KRW | 반영 | READY(Pnl:226) | FORMULA_VERIFIED |
| MET-MGN-000001 | v1 | Operating Margin | op/rev*100 | — | tenant×기간 | order_time | KRW | 반영 | READY(Pnl:286) | FORMULA_VERIFIED |
| MET-ROAS-000001 | v1 | **Platform ROAS** | 매체보고매출/spend | MEA-SPEND | 채널×캠페인 | event_time | 계정 | 미반영 | 라벨필수 | FORMULA_VERIFIED(Rollup:665) |
| MET-ROAS-000002 | v1 | **Attributed ROAS** | order-match 매출/spend | — | 채널 | order_time | KRW | 취소제외 | 라벨필수 | FORMULA_VERIFIED |
| MET-ROAS-000003 | v1 | **Blended ROAS** | **SUM(rev)/SUM(spend)**(ratio-of-sums) | — | tenant×기간 | order_time | KRW | 취소제외 | ★avg-of-ratios 금지 | CONSOLIDATION(프론트 산식 상이) |
| MET-ROAS-000004 | v1 | Incremental ROAS | incRev/spend | — | 채널 | — | KRW | — | MMM/실험근거 | FORMULA_VERIFIED(AttrEngine:203) |
| MET-ROAS-000005 | v1 | Net Revenue ROAS | NetRev/spend | — | 채널 | order_time | KRW | 취소/환불 | — | CANDIDATE |
| MET-ROAS-000006 | v1 | **adj ROAS(정본 기본)** | rev*truthRatio/spend clamp0.2~1.2 | — | 채널 | order_time | KRW | 반영 | MIN_CONV5 | **FORMULA_VERIFIED(정본·AutoCampaign:680)** |
| MET-CAC-000001 | v1 | Paid CAC | spend/conversions | MEA-SPEND | 채널 | conv_time | KRW | — | 신규고객 정의필요 | SOURCE_VERIFIED(Rollup:413) |
| MET-CAC-000002 | v1 | New Customer CAC | spend/신규고객수 | — | 채널 | order_time | KRW | — | 신규판정 | CANDIDATE |
| MET-LTV-000001 | v1 | Historical LTV | SUM(purchase-refund) | — | customer | order_time | KRW | 차감 | READY(CRM:288) | FORMULA_VERIFIED |
| MET-LTV-000002 | v1 | Predicted CLV | BG/NBD×GG | — | customer | — | KRW | — | model_ver·conf | FORMULA_VERIFIED(CRM:388) |
| MET-CVR-000001 | v1 | Conversion Rate | conv/clicks*100(RATIO) | — | 캠페인 | event_time | — | — | — | FORMULA_VERIFIED(Rollup:666) |
| MET-AOV-000001 | v1 | AOV | rev/orders(RATIO) | — | 채널 | order_time | KRW | — | — | FORMULA_VERIFIED |
| MET-RET-000001 | v1 | Return Rate | returns/orders*100 | — | sku/채널 | order_time | — | — | 분모검증 | 검증권장(Rollup:332) |
| MET-VAT-000001 | v1 | VAT | output-input | — | tenant×기간 | 정산 | KRW | — | READY | FORMULA_VERIFIED(Pnl:444) |
| MET-ATTR-000001 | v1 | Attribution Credit | markov/shapley | — | 채널×캠페인 | conv_time | — | 역분개 | Credit≠인과 | FORMULA_VERIFIED |
| MET-MMM-000001 | v1 | MMM Contribution | Mmm posterior | — | 채널 | 기간 | — | — | data sufficiency | PARTIALLY_VERIFIED |
| MET-INV-TURN-000001 | — | 재고회전 | (미발견) | — | — | — | — | — | — | **BLOCKED_SOURCE(부재)** |

**Metric ID 규칙**: 영구·Formula Breaking=Version↑·Alias 별도 ID 금지·Deprecated 재사용 금지.

## 3. Measure / Dimension / KPI Contract (§6/§8/§9/§10)
- **Measure**(MEA-): REVENUE(total_price)·SPEND·ORDER(count)·CLICK·IMPRESSION·CONVERSION·CUSTOMER(distinct)·REFUND·QTY·COGS. 각 Source Field·Aggregation·Dedup Key·Negative 허용·Null 정책.
- **Dimension**(DIM-): DATE(UTC·daily~yearly)·**CHANNEL(★단일 정규화 SSOT 필요)**·CAMPAIGN·PRODUCT·SKU·CUSTOMER·COUNTRY·CREATOR·CURRENCY. Hierarchy(Channel Category>Channel>Platform>Account>Campaign>AdGroup>Ad). SCD(Segment/Category/Role=Slowly Changing→Temporal).
- **KPI**(KPI-): ROAS(adj)·Net Margin·CAC·LTV·전환율 — Business Goal·Target·Warning/Critical Threshold·Direction·Evaluation Period·tenant별 설정. **KPI≠Metric 복제**(목표 연결).

## 4. Aggregation & Grain Governance (§11/§12) — ★비율지표 재집계
- **비율 지표(ROAS/CVR/CAC/Margin/AOV/CTR/CPC/CPA)=RATIO Aggregation**: 상위 Grain에서 **분자·분모를 각각 SUM 후 나눗셈(ratio-of-sums)**. **average-of-ratios 금지**(=MET-ROAS-000003 프론트 blendedRoas GlobalDataContext:1796 버그). 
- **Grain**: ROAS 최소=Ad/Campaign·기본=Campaign×Date·지원=Channel/Product/SKU/Creator·제한=Customer(Attribution 근거). Grain 변환 시 재집계 필수.
- **Additive/Semi/Non**: Revenue=Additive·Inventory 스냅샷=Semi-Additive·Rate=Non-Additive(재계산).

## 5. Time / Currency / Tax·Fee·Refund 정책 (§13~16)
- **Time**: Metric별 기준시간 명시(Order/Payment/Conversion/Refund/Sync/Report)·**UTC 강제**(Rollup:89)·tenant 타임존(UNVERIFIED)·Attribution/Late Window. 동일 리포트 내 기준시간 혼용 금지.
- **Currency**: base KRW·ingest fxToKrw·보고통화 환산(daily rate)·환율출처/날짜 없는 환산=신뢰경고·**통화 단순합산 금지**·Rounding.
- **Tax/Fee/Discount**: Metric별 포함여부 명시. Net Revenue=post-coupon(할인차감)·VAT=마진 미반영. ROAS 분모=media spend(fee 미포함). 매출≠이익 비용포함 기준 혼용 금지.
- **Refund/Cancel**(§16): Full/Partial Refund·결제전/후 취소·Return·Exchange·Chargeback·Pending/Completed 구분. OrderHub 토큰 SSOT·원거래 연결.

## 6. Dedup / Null / Zero / Late (§17~19)
- **Dedup**: Order=`tenant+source_system+source_account+external_order_id`(UNIQUE 승계)·Conversion=`tenant+conversion_event_id+source+window`·Click=Unique vs Total 구분. 지표마다 임의 상이 금지.
- **Null/Zero**: NULL(부재)≠ZERO(실0)≠UNKNOWN≠NOT_APPLICABLE≠NOT_READY≠BLOCKED. **분모 0 비율지표를 무조건 0 반환 금지**→상태+경고.
- **Late Data**: Late Window·Recalc 범위·Backfill·Report Version·Locked Period·Reconciliation. 자동화 실행 후 과거지표 변경=감사가능.

## 7. Revenue / Cost / ROAS / CAC / LTV / Conversion Contract (§23~28)
- **Revenue**: Gross/Net(실사용)·Refunded/Cancelled·Recognized/Collected(미사용→활성 금지)·Contribution·Gross/Net Profit·Contribution Margin — 각 포함/제외 명시.
- **Cost**: Media Spend·Platform/Agency/Creator Fee·Production·Shipping·Return·Total Marketing·Fully-loaded.
- **ROAS 체계(§25)**: 6 변형 **각 별도 MET ID**(Platform/Attributed/Blended/Incremental/Net/adj) — **분리로 충돌 해소**(§3.2). **UI 기본 "ROAS"=adj ROAS(MET-ROAS-000006, net·truthRatio)** + Tooltip에 Contract ID. 단순 "ROAS" 라벨 금지.
- **CAC(§26)**: Paid/Blended/New/Incremental/Fully-loaded/Cohort — 분모(고객수) 정의·비용범위.
- **LTV(§27)**: Historical Revenue/Margin·Predicted Revenue/Contribution·Cohort·Subscription. 예측=Model Version·Horizon·Confidence·Calibration·Drift.
- **Conversion(§28)**: Total vs **Unique Converting Customer**(혼용 금지)·Purchase/Lead/Signup/Attributed/Assisted/Incremental/Valid/Invalid/Duplicate.

## 8. Attribution / MMM / Quality·Trust·Confidence Contract (§29~31)
- **Attribution(§29)**: Model ID·Touchpoint Eligibility·Window·Identity Resolution·Credit Allocation·Refund Reversal·Late Conversion·Confidence·**Credit≠Incremental Effect**.
- **MMM(§30)**: Model Version·Training Period·Channels·Control·Seasonality·Adstock·Saturation·Posterior·Contribution·Baseline·Credible Interval·Holdout·Data Sufficiency·Limitations.
- **Q/T/C(§31)**: **Quality**(데이터 완전성/유효성/일관성)≠**Trust**(출처/수집 신뢰)≠**Confidence**(결과 불확실성). 각 산식·목적 별도 Contract. 혼용 금지(Vol3).

## 9. Consumer / UI / API / AI / Automation Contract (§32~36)
- **Consumer**: Dashboard·API·Export·Report·Alert·AI·Recommendation·Automation·Billing·External. 각 Metric ID·Version·Allowed Dimensions·Default Filters·Freshness·Confidence·Fallback·Compatibility Period.
- **UI**: Metric ID·Version·Tooltip·Formula 설명·포함/제외·기간·Currency·Freshness·Confidence·Warning. 의미 숨김 금지.
- **API**: metric_id·metric_version·value·unit·currency·grain·filters·quality/trust/confidence·freshness·warning·formula_reference(점진 적용·기존 호환).
- **AI(§36)**: 단순 숫자만 금지→Metric ID·Version·Definition·Grain·Confidence·Quality·Trust·Warning·Lineage·Limitations.
- **Automation(§35)**: Metric ID·최소 Version·Grain·기간·Threshold·Quality/Trust/Confidence Threshold·Freshness·Drift·Dry Run·Approval·Rollback. **의미 변경 시 자동전환 금지**.

## 10. Duplicate Calculation Audit & Formula Conflict Matrix (§37/§49)

| Metric | Location A | Location B | Difference | Severity | Canonical Decision |
|---|---|---|---|---|---|
| ROAS | Rollup:665(광고기여) | GlobalDataContext:1796(spend가중avg) | avg-of-ratios vs ratio-of-sums | **CRITICAL** | ratio-of-sums 정본·adj 기본·6변형 분리 |
| ROAS | RoiService:79(데드코드) | 각 소비처 | 유령 | LOW | 통합 시 재사용 or DEPRECATE |
| Channel norm | ChannelSync:5119(meta→meta_ads) | Connectors:888(meta_ads→meta) | 방향 상충 | **CRITICAL** | 단일 canonical 방향 SSOT+어댑터 |
| P&L margin | Pnl:286(백엔드) | pnlStats(프론트) | 이원(의도적) | HIGH | server-first·프론트 fallback 점진제거 |
| 반품률 | Rollup:332 | 과거 분모 | 12% vs 10.7% | MED | 총주문 분모 수렴 검증 |

**중복 분류**: ROAS 프론트 재계산=CONSOLIDATION_REQUIRED·RoiService=DEPRECATION_PLANNED·P&L 프론트=LEGACY_ADAPTER(fallback)·채널 norm 5함수=CONSOLIDATION_REQUIRED.

## 11. Canonical Calculation Layer (§38 — 기존 확장)
- **신규 계산 엔진 신설 금지**. 확장: **Rollup**(집계 SSOT)·**Pnl**(P&L/VAT SSOT)·**AutoCampaign::truthRatio**(adj SSOT)·**OrderHub**(취소/COGS SSOT)·**CRM**(LTV SSOT)를 Metric Registry + Formula Resolver로 표준화. Filter/Time/Currency/Quality Resolver는 기존 로직 래핑.
- 프론트 재계산(GlobalDataContext/rollupDemoDerive)은 **백엔드 산출 소비**로 전환(공용 계층), 데모만 파생 유지.

## 12. Versioning / Cache / Golden Dataset / Regression / Test (§30/§39~42)
- **Versioning**: Formula Breaking=Version↑+ADR+Migration+Compatibility 기간. 기존 소비자 보호(Shadow Calculation·Read Compare).
- **Cache Key**: tenant+workspace+metric_id+metric_version+grain+normalized_dimensions+normalized_filters+time_range+currency+attribution_model+data_version(혼합 방지).
- **Golden Dataset(§41)**: 정상/부분환불/전체환불/취소/다중통화/세금/광고비/신규·재구매/중복전환/지연전환/Attribution/MMM입력/누락/Zero분모 시나리오+기대값. **운영 노출 금지**(테스트 전용).
- **Regression Baseline(§40)**: Revenue/NetRev/Spend/ROAS/CAC/LTV/CVR/Attribution/MMM/Cohort/Retention/Churn/Profit/Margin — 동일 기간/Tenant/Currency/Grain/Filter/Snapshot 전후 비교.
- **Test(§42)**: 단위(Formula/Filter/Grain/Null/Zero/Refund/Currency/TZ/Dedup)·통합(DB→Measure→Metric→API/UI/AI/Automation)·회귀·계약(Version/Consumer Compat)·보안(Tenant/Workspace/Sensitive Dimension).

## 13. §51 완료 보고 수치
조사 Metric 다수 · Canonical Metric 23(MET-*) · Measure 10 · Dimension 9 · KPI 5 · Formula Contract 23 · **Formula Conflict 5**(CRITICAL 2=ROAS·Channel) · Duplicate Calculation 5 · Production Ready 0(회귀 baseline·Golden 검증 전) · FORMULA_VERIFIED 14 · AI Ready 0(검증 전)·Automation Ready 0 · **Blocked Formula 1**(ROAS 기본·BLOCKED_AMBIGUITY→adj 정본으로 해소 제안) · Blocked Source 1(재고회전) · Regression Difference=ROAS/채널 통일 시 예상(Baseline 필수) · Golden Dataset=스펙 작성(구현 후 검증) · 문서=본 마스터+ADR+PM · 남은리스크=ROAS 정본 확정·채널방향·프론트 재계산 전환·재고회전 · **EPIC03-C(Semantic Query Layer·Metric Execution·Cross-Layer Enforcement) 준비 완료**. 코드변경 0.
