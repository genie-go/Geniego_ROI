# EPIC 03-A — Enterprise Semantic Layer Inventory & Canonical Business Vocabulary (정식 마스터)

> **근거**: EPIC 00~02(Metadata·CE/REL·KG Foundation) + 01-D(ROAS/LTV 검증) + 288차 **지표·차원·용어 전수조사**(실코드). **비파괴**: 인벤토리·Registry·통합계획만. 코드변경 0. 산식 변경·API/Report 필드 삭제·데드코드 삭제 없음(§35).
> **§36 통합**: 19개 파편 대신 본 마스터가 Term Registry·Metric/Measure/Dimension/KPI·Formula·Alias·Name Collision·Event·Status·Channel Taxonomy·Time/Currency Policy·Cross-Layer Mismatch·Regression·Unverified를 통합. ADR=[`../architecture/ADR_SEMANTIC_LAYER_BASELINE.md`](../architecture/ADR_SEMANTIC_LAYER_BASELINE.md).
> **작업초안 흡수**: `docs/semantic-layer/SEMANTIC_LAYER_INVENTORY_AND_VOCABULARY.md`(선작성)를 본 정식 마스터가 흡수·확장. 증거 없는 항목=UNVERIFIED. 미검증 Entity 의존 용어=UNVERIFIED 유지.

---

## 0. 요약 판정
- **선언적 Metric/Term 카탈로그 부재**(지표=코드 산식 흩어짐). GeniegoGlossary 50선=설명문 SSOT(공식 아님). SSOT 통합 로직은 진행 중(취소토큰·COGS·truthRatio·VAT·FX·기간버킷)이나 **채널 정규화 방향 상충**·**ROAS 3+ 산식**이 최대 리스크.

## 1. Canonical Business Term Matrix (§37 — TERM ID 영구부여)

| Term ID | Canonical Name | 한국어 | Category | Definition/SSOT | Entity/Metric | Aliases | Status |
|---|---|---|---|---|---|---|---|
| TERM-ORG-000001 | Tenant | 테넌트 | ORG | 구독 격리 경계 | CE-ORG | account, org | CANONICAL |
| TERM-ORG-000002 | Plan | 플랜 | ORG | 요금제 정의(plan_config)+상태(app_user.plan) | CE-BIZ-Plan | tier, package | CANONICAL |
| TERM-USR-000001 | User | 사용자 | ORG | app_user | CE-USR | Member, Subscriber(=alias) | CANONICAL |
| TERM-CUS-000001 | Customer | 고객 | CUS | crm_customers(SSOT) | CE-CUS | **Buyer, Shopper, Contact(=alias)** | CANONICAL |
| TERM-CUS-000002 | New/Returning/Churned Customer | 신규/재구매/이탈고객 | CUS | 판정조건 정의필요 | — | — | PARTIALLY_VERIFIED |
| TERM-CUS-000003 | Segment | 세그먼트 | CUS | crm_segment | CE-CUS-Segment | Cohort(≠) | CANONICAL |
| TERM-PRD-000001 | Product/SKU | 상품/SKU | PRD | catalog/channel_products | CE-PRD/SKU | Variant(하위) | CANONICAL |
| TERM-ORD-000001 | Order | 주문 | ORD | channel_orders(SSOT·단일상품행) | CE-ORD | Transaction | CANONICAL |
| TERM-ORD-000002 | Net Revenue | 순매출 | ORD | SUM(total_price) NOT cancelExclusion(post-coupon) Pnl:100 | SM-REV-001 | Sales(모호) | **CANONICAL** |
| TERM-ORD-000003 | Cancellation/Refund/Return | 취소/환불/반품 | ORD | OrderHub CANCEL/RETURN/EXCHANGE_TOKENS:85 | — | — | CANONICAL |
| TERM-MKT-000001 | Channel | 채널 | MKT | ★정규화 방향 상충(§Alias) | CE-CHN | platform(계층 혼용) | **NAME_COLLISION** |
| TERM-MKT-000002 | Ad Spend | 광고비 | MKT | performance_metrics.spend(계정통화→KRW) | SM-COST | Media Cost, Ad Cost | CANONICAL |
| TERM-MKT-000003 | Conversion | 전환 | MKT | ★구매/가입/리드 혼용 | — | Purchase/Order/Lead | **NAME_COLLISION** |
| TERM-MKT-000004 | Campaign | 캠페인 | MKT | 광고/CRM/자동화 문맥별 | CE-CMP(5분리) | — | **NAME_COLLISION** |
| TERM-ANA-000001 | ROAS | ROAS | ANA | ★3+ 산식(§16) | SM-ROAS | reported/blended/incremental | **FORMULA_CONFLICT** |
| TERM-ANA-000002 | adj_roas(진실 ROAS) | 보정 ROAS | ANA | rev*truthRatio/spend clamp0.2~1.2 AutoCampaign:680 | SM-ADJROAS | — | **CANONICAL(정본)** |
| TERM-ANA-000003 | CAC | CAC | ANA | spend/신규고객 Rollup:413 | SM-CAC | — | PARTIALLY_VERIFIED |
| TERM-ANA-000004 | LTV(역사)/Predicted CLV | 생애가치 | ANA | SUM(purchase-refund) CRM:288 / BG-NBD CRM:388 | SM-LTV/CLV | — | CANONICAL |
| TERM-ANA-000005 | Contribution/Gross/Net Margin | 마진 | ANA | Pnl:218-287 | SM-MGN | — | CANONICAL(이원) |
| TERM-ANA-000006 | Attribution/Touchpoint | 귀속/터치포인트 | ANA | AttributionEngine markov/shapley | — | Credit(≠인과) | CANONICAL |
| TERM-ANA-000007 | Trust/Quality/Confidence Score | 신뢰/품질/신뢰도 | ANA | Vol3 DataPlatform(혼용 금지) | — | reliability | PARTIALLY_VERIFIED |
| TERM-DAT-000001 | Raw/Normalized/Canonical Data | 원천/정규화/정본 | DAT | raw_vendor_event→normalized→canonical | CE-DAT | — | CANONICAL(normalized 고아) |
| TERM-AUT-000001 | Workflow/Journey/Trigger/Action | 자동화 | AUT | journeys·rule_engine | CE-AUT | — | CANONICAL |

**규칙**: Term ID 영구·Alias는 대상 Term 참조(자체 ID 없음)·다국어는 동일 ID 연결·의미 다르면 분리.

## 2. Metric Matrix (§38)

| Metric ID | Name | Formula | Numerator | Denominator | Grain | Time Field | Currency | Refund | Source | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| SM-REV-001 | Net Revenue | SUM(total_price) NOT cancelExcl | total_price | — | tenant×채널×기간 | order_time | KRW | 취소제외 | Pnl:100 | FORMULA_VERIFIED |
| SM-COGS-001 | COGS | FEFO→WAC | lot원가 | — | sku | order_time | KRW | — | OrderHub:160 | FORMULA_VERIFIED |
| SM-MGN-001 | Operating Margin | op/rev*100 | operatingProfit | revenue | tenant×기간 | order_time | KRW | 반영 | Pnl:286 | FORMULA_VERIFIED(이원) |
| SM-ROAS-001 | ROAS | ★3+ | rev(3종) | spend | 채널×캠페인 | 상이 | 상이 | 상이 | 6+ 위치 | **BLOCKED_AMBIGUITY** |
| SM-ADJROAS-001 | adj ROAS | rev*truthRatio/spend | adjRev | spend | 채널 | order_time | KRW | 반영 | AutoCampaign:726 | FORMULA_VERIFIED(정본) |
| SM-CAC-001 | CAC | spend/conv | spend | conversions | 채널 | conv_time | KRW | — | Rollup:413 | SOURCE_VERIFIED |
| SM-LTV-001 | Historical LTV | SUM(purchase-refund) | 누적 | — | customer | order_time | KRW | 차감 | CRM:288 | FORMULA_VERIFIED |
| SM-CLV-001 | Predicted CLV | BG/NBD×GG | E[Y]·E[M] | — | customer | — | KRW | — | CRM:388 | FORMULA_VERIFIED |
| SM-VAT-001 | VAT | output-input | 정산 vat | 매입세액 | tenant×기간 | 정산일 | KRW | — | Pnl:444 | FORMULA_VERIFIED |
| SM-CTR/CPC/CPA/CVR | 광고효율 | clicks/impr 등 | — | — | 캠페인 | event_time | — | — | Rollup:565 | FORMULA_VERIFIED |
| SM-RET-001 | 반품률 | returns/orders*100 | returns | orders | sku/채널 | order_time | — | — | Rollup:332 | 검증권장(분모 이력) |
| SM-INV-TURN | 재고회전 | (미발견) | — | — | — | — | — | — | — | **UNVERIFIED(부재)** |

## 3. Measure / Dimension / KPI (§8/§9)
- **Measure**(집계원): Revenue·Cost/Spend·Orders·Clicks·Impressions·Conversions·Refunds·Qty.
- **Dimension**(§24 채널 계층): Channel Category > Channel > Platform > Account > Campaign > AdGroup > Ad > Placement > Device > Source/Medium. + Period(daily~yearly UTC Rollup:85)·Country(CHANNEL_COUNTRY KR/JP/US/SEA/CN/ETC)·Currency(base KRW)·Segment·SKU·Creator·Tenant.
- **KPI**(목표연결): ROAS·adj_roas·Net Margin·CAC·LTV·전환율. Metric과 목적 구분(무조건 동시정의 금지).

## 4. Semantic Formula Registry (§27) — 핵심
- **SM-ADJROAS-001**(정본): adjRev=rev*clamp(0.2,1.2, 실귀속/매체보고), MIN_CONV=5 미만 무보정. Null=무보정·Zero spend=제외. Refund=취소제외 술어. Attribution=order-match. Confidence=MIN_CONV 충족.
- **SM-REV-001**: Filter=NOT cancelExclusion(2축)·정산 gross 우선. post-coupon. Zero=0 반환.
- **SM-VAT-001**: input=국내 매입세액만(해외광고비 제외)·마진 미반영(이중계상 방지).

## 5. 매출/광고비/전환/고객 개념 표준 (§12~15)
- **매출**(§12): Gross(정산전)·Net Revenue(취소제외 post-coupon=SM-REV-001 실사용)·Refunded·Cancelled·Recognized/Collected(미사용→활성화 금지). 실사용=Net Revenue·정산 gross.
- **광고비**(§13): Spend(media)·Platform Fee·Creator Fee 구분. ROAS 분모=media spend(fully-loaded 아님).
- **Conversion**(§14): ★구매/가입/리드 혼용(NAME_COLLISION)→Event Type별 분리. **전환 건수≠전환 고객수** 혼용 금지.
- **Customer**(§15): New/Returning/Active/Churned/Reactivated 판정조건·기간 정의 필요(PARTIALLY_VERIFIED).

## 6. ROAS/CAC/LTV 변형 정의 (§16~18)
- **ROAS 변형**(§16): Platform(매체보고 rollup Rollup:665)·Blended(GlobalDataContext:1796 spend가중)·Attributed(order-match)·Incremental(AttributionEngine:203)·**adj(truthRatio 정본)**. 각 분자/분모/Attribution/Revenue/Cost/기간/통화/Refund 상이 → **하나의 ROAS를 모든 목적에 쓰지 말 것**.
- **CAC 변형**(§17): Paid/Blended/New Customer/Incremental/Fully-loaded — 현 Rollup:413=spend/conversions(전환수, 신규고객 아님·검증 필요).
- **LTV 변형**(§18): Historical(CRM:288)·Predicted(CRM:388 BG/NBD)·Revenue vs Margin LTV 구분·할인율/이탈/모델버전/Confidence.

## 7. Attribution/MMM/품질 용어 (§19~21)
- **Attribution**(§19): Touchpoint·First/Last/Linear/TimeDecay/Position/DataDriven/Markov/Shapley·Window·**Credit≠인과효과**(혼용 금지).
- **MMM/Incrementality**(§20): Baseline·Incremental·Adstock·Saturation·Carryover·Elasticity·Lift·Holdout·Significance·Credible/Confidence Interval(Mmm.frontier).
- **품질**(§21): Completeness/Accuracy/Consistency/Timeliness/Freshness/Uniqueness·**Trust≠Quality≠Confidence Score**(혼용 금지·Vol3).

## 8. Alias Registry (§25) — ★채널 정규화 상충

| Source | Source Term | Canonical | Mapping | Status |
|---|---|---|---|---|
| ChannelSync | meta | **meta_ads**(확장) | normalizeChannelKey:5119 "SSOT표방" | **CONFLICT** |
| Connectors | meta_ads | **meta**(축약·역방향) | normAdCh:888 | **CONFLICT** |
| AutoCampaign | facebook/instagram/meta_ads | meta(패밀리) | chFamily:626 | 분산 |
| Rollup/Wms/Catalog | facebook/instagram | meta | normCh:387·1959·420 | 분산 |
| Meta Ads | spend | Media Spend(계정통화) | — | VERIFIED |
| Shopify | total_price | Net Revenue(post-coupon) | — | VERIFIED |
| CRM | contact | Customer | 판정조건 | PARTIALLY_VERIFIED |
| Buyer/Shopper | — | Customer(TERM-CUS-000001) | — | ALIAS |

→ ★**5+ 함수·방향 상충**(확장 vs 축약). 단일 canonical 방향 SSOT 신설(비파괴 어댑터) = **최우선**.

## 9. Name Collision Registry (§26)

| Term | 의미 A | 의미 B | 의미 C | Resolution |
|---|---|---|---|---|
| Revenue | 주문매출 | 결제/정산매출 | (회계인식 미사용) | 별도 Term(Net Revenue 실사용) |
| Account | 사용자계정 | 광고계정 | 결제/대행사 | Entity별 분리(01-B Account 5) |
| Conversion | 구매 | 회원가입 | 리드 | Event Type별 분리 |
| Campaign | 광고 | CRM/메시징 | 자동화/Growth | Context별 분리(01-B Campaign 5) |
| Channel | Registry | Sales | Ad/Messaging | group_type 분리(01-B) |
| Segment | Customer | Decisioning | Growth | 분리(01-B) |

## 10. Event / Status / Time / Currency (§22/§23/§10/§11)
- **Event**(§22): OpenPlatform::emit('order.created'/'cancelled')·픽셀 이벤트·정규화 이벤트. Canonical Event Name·Idempotency Key·Conversion/Analytics/Automation Eligibility. 채널별 다른 이름 중복관리 금지.
- **Status**(§23): 취소/주문/자동화 상태값 전수→Canonical Status+Alias(OrderHub CANCEL_TOKENS 9개 이미 통합). ACTIVE/ENABLED/RUNNING/LIVE 의미동일 검토.
- **Time**(§10): Event/Order/Payment/Conversion/Refund/Sync/Report Time 구분. **UTC(gmdate) 강제**(Rollup:89)·tenant 타임존 UNVERIFIED·Attribution Window.
- **Currency**(§11): base KRW·ingest fxToKrw·보고통화 환산(Pnl:247)·Tax/Fee/Discount/Refund 포함여부 명시·**통화 단순합산 금지**.

## 11. Cross-Layer Mismatch Matrix (§39)

| Term/Metric | UI | API | DB | Service | Analytics | Automation | Mismatch | Severity |
|---|---|---|---|---|---|---|---|---|
| ROAS | blendedRoas(spend가중) | /v424 미반환 | — | Rollup ratio-of-sums | 광고기여매출 | adj_roas | **산식 4종 상이** | CRITICAL |
| Channel | 표시명 | 채널키 | channel 컬럼 | ChannelSync(확장) | Connectors(축약) | chFamily | **방향 상충** | CRITICAL |
| P&L margin | pnlStats(프론트) | Pnl.php | — | Pnl:286 | 이원 | — | 이원(의도적) | HIGH |
| 반품률 | — | — | — | Rollup:332 | 분모 이력차 | — | 과거 12%vs10.7% | MED |

## 12. Semantic Versioning / New Term Gate / Readiness (§30/§32/§33)
- **Versioning**: Definition/Formula/Filter/Grain/Source/Currency/Timezone/Attribution 변경=버전+ADR+Migration+Compatibility. Breaking Semantic Change는 리포트/API/자동화 영향분석 필수(§31).
- **New Term Gate**(§32): 기존 Term 불가·Alias 아님·하위유형 불가·중복지표 없음·의미 명확·SoT·Owner·테스트·영향정의 → Registry 등재.
- **Readiness**(§33): SM-ADJROAS/REV/COGS/LTV/VAT=FORMULA_VERIFIED·**SM-ROAS-001=BLOCKED_AMBIGUITY**·SM-INV-TURN=NOT_READY(부재)·채널정규화=BLOCKED_SOURCE_MISMATCH. AI Ready≠Automation Ready 구분.

## 13. 통합 vs 신설 (무후퇴)
- **재사용(신설금지)**: OrderHub 취소토큰/cancelExclusion·aggregateCogs·truthRatio/adj_roas·Pnl VAT·FX·Rollup 기간버킷·GeniegoGlossary.
- **신설**: 선언적 Metric/Term 카탈로그·단일 채널 정규화 SSOT·15개국 지표용어 정적번역·재고회전 지표.
- **무후퇴**: RoiService 데드코드·P&L 이원 즉시삭제 금지→통합계획. 기존 결과 설명없이 변경 금지.

## 14. §41 완료 보고 수치
조사 Term 다수 · Canonical Term 후보 22(TERM-*) · Metric 12(SM-*) · Measure 8 · Dimension 10 · KPI 6 · Formula 12 · Alias(채널 5+·Buyer/Contact 등) · **Name Collision 6**(Revenue/Account/Conversion/Campaign/Channel/Segment) · **Cross-Layer Mismatch 4**(CRITICAL 2=ROAS·Channel) · **Formula Conflict 1**(ROAS 3+) · Unverified 2(재고회전·tenant 타임존) · **Critical Regression Risk 2**(ROAS 단일화·채널방향 통일 시 대시보드/자동화 대상 변동) · 문서=본 마스터+ADR+PM · 테스트=Semantic Validation 계획 · 남은리스크=ROAS 정본 확정·채널방향·15국 용어·재고회전 · **EPIC03-B(Canonical Semantic Model·Metric Contract·Formula Governance) 준비 완료**. 코드변경 0.
