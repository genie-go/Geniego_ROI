# EPIC 03-A — Enterprise Semantic Layer Inventory & Canonical Business Vocabulary (마스터)

> **근거**: Entity Foundation(CE Registry, Metric=CE-ANA) + 01-D(ROAS/LTV 검증) + 288차 **비즈니스 지표·차원·용어 전수조사**(실코드). **비파괴**: 인벤토리·Canonical Vocabulary 베이스라인·통합계획만. 코드변경 0. 산식 변경·데드코드 삭제·프론트 fallback 제거 없음.
> **⚠️ 흡수됨(288차)**: 정식 03-A 핸드북 스펙 수령 후 **정식 정본=[`../semantic/CANONICAL_BUSINESS_VOCABULARY.md`](../semantic/CANONICAL_BUSINESS_VOCABULARY.md)**(TERM ID·Metric Matrix·Alias/Collision·Cross-Layer Mismatch 완비)가 본 작업초안을 흡수·확장. 본 문서는 비파괴 보존(초기 인벤토리 근거). 최신 정본은 정식 마스터 참조.
> **작업 상태**: 초기 작업 베이스라인(증거기반·비파괴).
> **상위 헌법**: `../CONSTITUTION.md`(Extend not Replace) · `../DATA_INTELLIGENCE_CONSTITUTION.md`(임의 숫자 금지·SSOT 파생) · `../MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md`. ADR=[`../architecture/ADR_SEMANTIC_LAYER.md`](../architecture/ADR_SEMANTIC_LAYER.md).

---

## 0. 요약 판정 (정직)
- **선언적 Metric 카탈로그(단일 지표 정의 레지스트리)는 부재**. 지표는 "코드에 흩어진 계산식"으로만 존재. GeniegoGlossary 50선은 **설명문 SSOT**(공식 아님, 45번이 "메트릭 카탈로그"를 지향으로만 서술 = 실카탈로그 부재 방증).
- 같은 지표(특히 **ROAS**)가 3+ 근본 산식으로 공존(01-D "ROAS 이원"은 실제 그 이상).
- SSOT 통합 노력은 진행 중(OrderHub 취소토큰·aggregateCogs·truthRatio·Pnl VAT/FX·Rollup 기간버킷)이나 **채널명 정규화는 5+ 함수 분산·방향 상충**.

## 1. Metric Inventory & Canonical Registry 후보 (§공식·위치·SSOT)

| Metric ID | 지표 | Canonical 정의(제안) | SSOT 함수(재사용) | 현 분산/불일치 | 상태 |
|---|---|---|---|---|---|
| SM-REV-001 | Net Revenue(주문매출) | `SUM(total_price) WHERE NOT cancelExclusion`(post-coupon) | Pnl:100·OrderHub::cancelExclusion | 정산 gross 우선(Pnl:204) | **SSOT 존재** |
| SM-COGS-001 | COGS | FEFO lot 실원가→WAC 폴백 | OrderHub::aggregateCogs:160 | — | **SSOT 존재** |
| SM-MGN-001 | Gross/Operating/Net Margin | grossProfit=rev-cogs·op=gross-adSpend-fees·margin=op/rev*100 | Pnl:218-287 | 프론트 pnlStats 이원(의도적·Pnl:22) | **SSOT+이원** |
| SM-ROAS-001 | ROAS | **정본 채택 필요** — adj_roas(truthRatio 보정) 권고 | AutoCampaign::truthRatioForChannel:680 | ★**3+ 산식**(주문매출/광고기여매출/spend가중/ratio-of-sums) | **CONFLICT(최우선)** |
| SM-ROI-001 | ROI | `(rev-spend)/spend*100` | (RoiService 데드코드) | RoiService 유령(호출0) | UNVERIFIED(데드코드) |
| SM-CAC-001 | CAC | `spend/conversions`(신규고객) | Rollup:413 | 선언정의 없음·글로서리 설명만 | 부분 |
| SM-LTV-001 | LTV(역사적) | `SUM(purchase − refund)` | CRM:288 | — | **SSOT 존재** |
| SM-CLV-001 | Predicted CLV | BG/NBD×Gamma-Gamma+휴리스틱 폴백 | CRM:388-462 | — | **SSOT 존재** |
| SM-AOV-001 | AOV | `revenue/orders` | Rollup:335,731 | — | SSOT 존재 |
| SM-CTR/CPC/CPA/CVR | 광고효율 | CTR=clicks/impr·CPC=spend/clicks·CPA=spend/conv·CVR=conv/clicks | Rollup:565,665 | 프론트 rollupDemoDerive 이원(데모) | SSOT 존재 |
| SM-RET-001 | 반품률 | `returns/orders*100`(총주문 분모) | Rollup:332·OrderHub | 과거 분모 불일치(12% vs 10.7%, Rollup:482) | 검증 권장 |
| SM-VAT-001 | VAT(부가세) | output(정산 실캡처)−input(국내 매입세액) | Pnl::vat:444-573 | 마진 미반영(이중계상 방지) | **SSOT 존재** |
| SM-ADJROAS-001 | 진실 ROAS | `rev*truthRatio/spend`(clamp 0.2~1.2·MIN_CONV5) | AutoCampaign:680-742 | — | **SSOT 존재(정본)** |
| SM-INV-TURN | 재고회전 | (미발견) | — | — | **UNVERIFIED(부재)** |

**원칙**: 하나의 지표 = 하나의 Canonical 정의 + 공식 + **SSOT 함수 매핑** + 허용 차원. 신 카탈로그는 **기존 SSOT 함수 참조**(재구현 금지).

## 2. Dimension 표준 (§차원)

| Dimension | Canonical | SSOT/위치 | 이슈 |
|---|---|---|---|
| Period(기간) | daily/weekly/monthly/seasonal/yearly, 라벨 YYYY-MM-DD/Www/MM/Qn/YYYY, **UTC** | Rollup::dates/bucketLabel:85-149 | tenant 타임존 처리 UNVERIFIED |
| Channel | **정본 방향 확정 필요** | ★5+ 함수 분산 | ★**방향 상충**(§3) |
| Currency | base=**KRW**·ingest fxToKrw·보고통화 환산 | Pnl:245·Connectors::fxToKrw | — |
| Rollup 축 | SKU/Campaign/Creator/Platform | Rollup:12 | Creator 적재원 없어 빈결과(Rollup:575) |
| Channel→국가 | KR/JP/US/SEA/CN/ETC | Rollup::CHANNEL_COUNTRY:26 | — |
| Tenant | 세션토큰→tenant(미인증=demo)·auth_tenant | Rollup:39·Pnl:51 | demo/prod 격리 |

## 3. ★채널명 정규화 상충 (최우선 통합)
| 함수 | 방향 | 위치 |
|---|---|---|
| ChannelSync::normalizeChannelKey | `meta→meta_ads`·`amazon_spapi→amazon`(**확장**·"채널키 SSOT 표방") | ChannelSync:5119-5139 |
| Connectors::normAdCh | `meta_ads→meta`·`google_ads→google`(**축약·역방향!**) | Connectors:888 |
| Connectors::OAUTH_CHANNEL_ALIAS | meta_ads→meta | Connectors:755 |
| AutoCampaign::chFamily | facebook/instagram/meta_ads→meta(패밀리) | AutoCampaign:626 |
| Rollup normCh·Wms::channelAliasGroup·Catalog::channelAliases | facebook/instagram→meta 등 | Rollup:387·Wms:1959·Catalog:420 |

→ **ChannelSync(확장)과 Connectors(축약)의 canonical 방향이 정반대**. 시맨틱 레이어 **1순위 통합**(단일 canonical 방향 SSOT). 비파괴=어댑터로 수렴, 즉시삭제 금지.

## 4. Glossary 자산
- **GeniegoGlossary.php:9-71 = 용어집 정본 50선**(구조화 terms()+평문 text(), "임의변경 금지"). ROAS/LTV/CAC/ROI/CTR/CPA/롤업/P&L/메트릭카탈로그(45=지향) 포함. **설명문(공식 아님)**.
- 주입: ClaudeAI:162-187(시스템 프롬프트·50개 한정 아님·동일 depth 확장 지시).
- **15개국 지표 용어=정적 부재**, KO 단일원본→런타임 AI 현지번역(ClaudeAI:182). 정적 i18n은 UI 라벨만.

## 5. SSOT / 정합 로직 인벤토리 (재사용 기반)
- 취소/반품/교환 토큰: OrderHub::CANCEL/RETURN/EXCHANGE_TOKENS:85 + cancelExclusion:111·observedExclusion:122 + claimType:93(교환>취소>반품). Rollup(:72)이 자체 const 제거·OrderHub 단일참조.
- COGS: aggregateCogs(FEFO→WAC). truthRatio/adj_roas: AutoCampaign:680(예산결정 근거·AutoRecommend 재사용). VAT: Pnl::vat. FX/보고통화: Connectors+Pnl. 기간버킷: Rollup::dates.
- 신뢰 대시보드: Connectors::roasReconciliation:902(platformRoas vs realRoas)→DataTrustDashboard/Reconciliation.jsx.

## 6. Duplicate / Conflict Register
| # | 항목 | 심각도 | 통합 방향(비파괴) |
|---|---|---|---|
| 1 | **ROAS 3+ 산식** | CRITICAL | 정본=adj_roas(truthRatio) or 명시 라벨(매체보고 vs 귀속). 공용 헬퍼 단일화(01-D 계획) |
| 2 | **채널 canonical 방향 상충** | CRITICAL | 단일 canonical 방향 SSOT + 어댑터 |
| 3 | P&L 백엔드↔프론트 이원 | HIGH | server-first 유지·프론트 fallback 점진 제거 |
| 4 | ROI 데드코드(RoiService 호출0) | MED | 통합 시 재사용 or DEPRECATE |
| 5 | 반품률 분모(과거 12% vs 10.7%) | MED | 총주문 분모 수렴 검증 |
| 6 | CAC 선언정의 없음 | MED | 카탈로그 등재(spend/신규고객) |

## 7. Canonical Business Vocabulary 베이스라인 (원칙)
1. **하나의 비즈니스 지표 = 하나의 Canonical 정의**(Metric ID·공식·단위·차원·SSOT 함수·취소제외 술어·통화·기간·신뢰조건). 선언적 카탈로그로 등재.
2. **기존 SSOT 함수 참조**(OrderHub/Pnl/AutoCampaign/Rollup/CRM) — 재구현·병렬엔진 금지. 카탈로그는 정의의 SSOT, 계산은 기존 함수.
3. **차원 정규화 단일화**(채널 방향·기간 버킷·통화·타임존). 
4. **무후퇴**: 기존 산식/응답/대시보드 보존하며 카탈로그로 표준화. 데드코드·이원도 즉시삭제 금지→통합계획.
5. **Explainable**: 각 지표 정의에 근거·SSOT·신뢰조건(Vol3 READY) 명시. 임의 숫자 금지.
6. **15개국**: 지표 용어 정적 번역은 신설(현 런타임 AI 번역 보완)·GeniegoGlossary 정본 유지.

## 8. 통합 vs 신설 판정
- **재사용(신설 금지)**: 취소/반품 토큰·cancelExclusion·aggregateCogs·truthRatio/adj_roas·Pnl VAT·FX·기간버킷·GeniegoGlossary.
- **신설 필요**: ①선언적 Metric 카탈로그(지표명·공식·차원·SSOT함수 매핑) ②단일 채널 canonical 정규화 SSOT ③15개국 지표 용어 정적 번역 ④재고회전 지표(UNVERIFIED 부재).

## 9. §완료 보고 수치
조사 Metric 정의처 다수(ROAS 6+·매출/마진/COGS/CAC/LTV/CLV/AOV/CTR/CPC/CPA/CVR/반품률/VAT) · Canonical Metric 후보 14(SM-*) · SSOT 존재 9·CONFLICT 1(ROAS)·UNVERIFIED 2(ROI 데드코드·재고회전) · Dimension 6(Channel 상충) · Glossary=GeniegoGlossary 50선(설명문) · Duplicate/Conflict 6(CRITICAL 2=ROAS·채널방향) · 신설 대상 4 · 코드변경 0 · **EPIC03-B(Canonical Metric & Dimension Definition) 준비 완료**.
