# ADR — Semantic Query Layer & Metric Execution (EPIC 03-C)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (실행 계층 설계·Resolver·Gate·Enforcement 확정. 비파괴 — 코드변경 0). 실 구현·Consumer 전환은 후속 Shadow→Read Compare→Golden→회귀→Canary→Production 게이트 후.
- **근거**: [`../semantic/SEMANTIC_QUERY_ARCHITECTURE.md`](../semantic/SEMANTIC_QUERY_ARCHITECTURE.md) + 03-A/B + 실코드 계산경로/소비처.

## 결정 (핵심)
1. **Semantic Query Layer(24계층) = Metric ID+Version 단일 진입점**. Consumer(UI/API/Report/AI/Automation)의 DB/Graph 직접조회·자체 산식 금지(§3.1)·하드코딩 금지→Formula Registry 참조.
2. **Calculation Layer=기존 확장**(Rollup/Pnl/AutoCampaign truthRatio/OrderHub/CRM=CANONICAL_SOURCE/EXECUTOR). **신규 Metric Engine 신설 금지**. Resolver 11(Metric/Measure/Dimension/Formula/Grain/Aggregation/Filter/Eligibility/Time/Currency/Refund)이 기존 SSOT 래핑.
3. **비율 지표=재집계(ratio-of-sums)**·Consumer Aggregation 임의변경 금지 → 프론트 blendedRoas avg-of-ratios(GlobalDataContext:1796) 버그 차단.
4. **Q/T/C Gate 실행단 강제**(DataPlatform dataQuality·truthRatio·Vol3 재사용). 미달→경고/Partial/Block/Approval.
5. **Cross-Layer Enforcement + Semantic Linting(CI)**: Registry 없는 Metric·UI 자체계산·Tenant Scope 없는 Query·Currency 미지정·Version 미지정 Automation·Test 없는 Formula 차단.
6. **점진 전환**(Internal→Shadow→Admin→Canary→Limited→Default→Deprecated)·**Shadow/Read Compare 필수**·Fallback=기존 검증 경로(오래된 값 최신인 척 금지).
7. **무후퇴**: 기존 계산경로 즉시삭제 금지·API 무통보 변경 금지·자동화 Version 자동교체 금지·Golden/회귀 없는 전환 금지·미검증 Metric AI/자동화 사용 금지.

## 무후퇴·영구 규칙(§59)
새 분석 Query/Dashboard 지표/Report Column/Export/AI 입력/자동화 조건 전: Term/Metric Contract/Consumer Contract·Version·지원 Dimension/Grain·Time/Currency/Refund·Q/T/C Gate·Tenant/Permission·**공식 Semantic Query Layer 사용**·Golden/회귀 → ADR/PM. Layer 우회 재계산 금지.

## 결과
Semantic Query Layer·실행 계층 설계 확정(Resolver 11·Cross-Layer Violation 5·CRITICAL 2). Production 승인 0(구현·검증 전). 다음 **EPIC 03-D — Semantic Layer Final Validation, Regression Certification & Production Governance** 입력 준비 완료. 코드변경 0.
