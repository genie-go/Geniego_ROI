# ADR — Enterprise Semantic Layer Baseline (EPIC 03-A 정식)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (정식 인벤토리·Canonical Vocabulary 확정. 비파괴 — 코드변경 0). 실 카탈로그 구현·산식 단일화는 후속 승인·회귀 후.
- **근거**: [`../semantic/CANONICAL_BUSINESS_VOCABULARY.md`](../semantic/CANONICAL_BUSINESS_VOCABULARY.md) + 288차 지표/차원/용어 전수조사(실코드) + EPIC 00~02.
- **선행 흡수**: 작업초안 `../semantic-layer/SEMANTIC_LAYER_INVENTORY_AND_VOCABULARY.md`·구 ADR `ADR_SEMANTIC_LAYER.md`를 본 정식본이 흡수(재라벨·비파괴 보존).

## 결정 (핵심)
1. **하나의 의미 = 하나의 Canonical Term + 영구 TERM ID**. Alias는 대상 Term 참조·다국어는 동일 ID. 의미 다르면 분리(Revenue/Account/Conversion/Campaign/Channel/Segment Name Collision 6).
2. **선언적 Metric/Term 카탈로그 신설**(부재 확인) — **계산은 기존 SSOT 함수 참조**(OrderHub/Pnl/AutoCampaign/CRM/Rollup, 재구현 금지).
3. **★CRITICAL 2**: ①ROAS 3+ 산식(Platform/Blended/Attributed/Incremental/adj)→**정본=adj_roas(truthRatio)** 또는 목적별 명시 라벨·공용헬퍼(BLOCKED_AMBIGUITY 해소). ②채널 정규화 방향 상충(ChannelSync meta→meta_ads 확장 vs Connectors meta_ads→meta 축약, 5+ 함수)→단일 canonical 방향 SSOT+어댑터.
4. **개념 분리**: 전환 건수≠전환 고객수·Credit≠인과·Trust≠Quality≠Confidence·통화 단순합산 금지·매출 개념(Gross/Net/Refunded/Cancelled) 분리.
5. **무후퇴**: 기존 산식/API/Report/자동화/다국어 보존. RoiService 데드코드·P&L 이원 즉시삭제 금지→통합계획. 기존 결과 설명없이 변경 금지·미검증=UNVERIFIED.

## 무후퇴·영구 규칙(§43)
새 Metric/KPI/Dimension/Event/Status/Term 전: Term Registry·Metric/Measure/Dimension Registry·Alias/Collision·기존 Formula·SoT·Grain/Time/Currency·UI/API/DB/Analytics/Automation 영향·Version/Compatibility·테스트 → ADR/PM. 동일 의미 지표 복수 이름 금지·같은 이름 문맥없이 다의 사용 금지.

## 결과
Semantic Baseline 확정(Term 22·Metric 12·Collision 6·Cross-Layer Mismatch 4·Formula Conflict 1). 다음 **EPIC 03-B — Canonical Semantic Model, Metric Contract & Formula Governance** 입력 준비 완료. Critical Regression Risk 2(ROAS 단일화·채널방향)·코드변경 0.
