# ADR — Enterprise Semantic Layer Baseline (EPIC 03-A)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (인벤토리·Canonical Vocabulary 베이스라인. 비파괴 — 코드변경 0). 실 카탈로그 구현·산식 단일화는 후속 승인·회귀 후. 정식 03-A 스펙 수령 시 정합.
- **근거**: [`../semantic-layer/SEMANTIC_LAYER_INVENTORY_AND_VOCABULARY.md`](../semantic-layer/SEMANTIC_LAYER_INVENTORY_AND_VOCABULARY.md) + 288차 지표/차원/용어 전수조사(실코드) + Entity Foundation(Metric=CE-ANA).

## 맥락
Entity Foundation 위에 비즈니스 시맨틱 레이어(지표·차원·용어의 단일 정의)를 세우기 전, 기존 정의의 소재·중복·불일치를 전수 조사한다.

## 결정 (핵심)
1. **선언적 Metric 카탈로그는 부재 확인** — 지표는 코드 산식으로만 존재, GeniegoGlossary는 설명문 SSOT(공식 아님). 카탈로그 신설하되 **계산은 기존 SSOT 함수 참조**(재구현 금지).
2. **하나의 지표 = 하나의 Canonical 정의**(Metric ID·공식·단위·차원·SSOT 함수·취소제외·통화·기간·신뢰조건).
3. **★CRITICAL 통합 2건**: ①**ROAS 3+ 산식**(주문매출/광고기여매출/spend가중/ratio-of-sums)→정본 adj_roas(truthRatio) 또는 명시 라벨, 공용헬퍼 단일화(01-D 계획). ②**채널 canonical 방향 상충**(ChannelSync meta→meta_ads 확장 vs Connectors meta_ads→meta 축약, 5+ 함수)→단일 방향 SSOT+어댑터.
4. **재사용(신설 금지)**: OrderHub 취소토큰/cancelExclusion·aggregateCogs·AutoCampaign truthRatio/adj_roas·Pnl VAT·FX·Rollup 기간버킷·GeniegoGlossary.
5. **신설**: 선언적 Metric 카탈로그·단일 채널 정규화 SSOT·15개국 지표 용어 정적 번역·재고회전 지표(UNVERIFIED 부재).
6. **무후퇴**: 기존 산식/응답/대시보드 보존·데드코드(RoiService)·이원(P&L)도 즉시삭제 금지→통합계획. 임의 숫자 금지(SSOT 파생).

## 무후퇴·영구 규칙
새 지표/차원/용어 정의 전: Metric 카탈로그·기존 SSOT 함수·중복/불일치·차원 정규화·취소제외/통화/기간 술어·신뢰조건(Vol3) 확인 → ADR/PM. 동일 지표 복수 산식 신설 금지.

## 결과
Semantic Layer Inventory·Canonical Vocabulary 베이스라인 확정(Metric 후보 14·Dimension 6·Glossary 50·Conflict 6). 다음 **EPIC 03-B — Canonical Metric & Dimension Definition** 입력 준비 완료. 코드변경 0.
