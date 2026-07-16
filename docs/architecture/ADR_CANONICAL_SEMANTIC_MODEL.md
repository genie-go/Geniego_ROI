# ADR — Canonical Semantic Model & Metric Contract (EPIC 03-B)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Metric Contract·Formula Governance 확정. 비파괴 — 코드변경 0). 실 Calculation Layer 배선·산식 단일화는 후속 승인·Golden/회귀 검증 후.
- **근거**: [`../semantic/CANONICAL_SEMANTIC_MODEL.md`](../semantic/CANONICAL_SEMANTIC_MODEL.md) + 03-A Vocabulary + 실코드 산식(file:line).

## 결정 (핵심)
1. **하나의 Metric = 하나의 Canonical Contract + 영구 MET ID**. 하드코딩 산식 금지(Formula Registry 참조). 표시 이름 단순화해도 내부 의미 명시.
2. **ROAS 6 변형을 별도 Contract로 분리**(Platform/Attributed/Blended/Incremental/Net/**adj**) — 충돌을 통합이 아닌 **분리**로 해소(§3.2). **UI 기본 "ROAS"=adj ROAS(truthRatio·net)**+Tooltip Contract ID. ★**Blended는 ratio-of-sums 정본**(프론트 average-of-ratios GlobalDataContext:1796 버그 수정 대상).
3. **비율 지표=RATIO Aggregation**(상위 Grain 재집계, avg-of-ratios 금지). Grain 변환 시 분자/분모 재집계.
4. **채널 정규화 방향 상충**(ChannelSync 확장 vs Connectors 축약)→단일 canonical 방향 SSOT+어댑터(CONSOLIDATION_REQUIRED).
5. **Calculation Layer=기존 확장**(Rollup/Pnl/AutoCampaign truthRatio/OrderHub/CRM). 신규 계산 엔진 금지. 프론트 재계산→백엔드 산출 소비 전환(데모만 파생).
6. **개념 분리**: Revenue(Gross/Net/…)·Cost·Conversion(건수≠고객)·Credit≠인과·Q/T/C. 통화 단순합산·매출/이익 비용포함 혼용 금지.
7. **무후퇴**: 기존 산식/API/Report/자동화 보존. RoiService 데드코드·P&L 이원 즉시삭제 금지. **기존 결과 변경 시 Baseline 비교+원인+영향+Version+PM 승인**(설명없이 변경 금지). 미검증=AI/자동화 사용 금지.

## 무후퇴·영구 규칙(§53)
새 Metric/Measure/Dimension/KPI/Formula 전: Term Registry·Metric Contract Registry·기존 Formula·SoT·Grain/Aggregation·Time/Currency/Refund·Q/T/C·Consumer 영향·Version/Compat·Golden/회귀 → ADR/PM. Contract 없는 산식 하드코딩 금지.

## 결과
Canonical Semantic Model 확정(Metric 23·Formula Conflict 5·CRITICAL 2). 다음 **EPIC 03-C — Semantic Query Layer, Metric Execution & Cross-Layer Enforcement** 입력 준비 완료. 코드변경 0.
