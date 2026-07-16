# ADR — Semantic Layer Final Audit & Regression Certification (EPIC 03-D Part 1)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (최종 감사·Drift·Certification Baseline. 비파괴 — 코드변경 0). Production Certification은 실 구현+Golden+회귀+Shadow 후.
- **근거**: [`../semantic/SEMANTIC_FINAL_AUDIT_REPORT.md`](../semantic/SEMANTIC_FINAL_AUDIT_REPORT.md) + 03-A/B/C + 실코드 Drift.

## 결정 (핵심)
1. **정직 인증(§3.2)**: Semantic Query Layer는 설계 문서·실 구현 미존재 → **Golden/Historical Regression/Shadow/Read Compare 실행 불가=BLOCKED_PENDING_IMPLEMENTATION**. 허구 통과 보고 금지. **Production Ready 0**.
2. **Drift 확정**: Formula Drift 4·Metric Drift 1·Semantic Drift 2. CRITICAL 3: ①프론트 ROAS **avg-of-ratios=확정 버그**(LEGACY_FORMULA_ERROR·ratio-of-sums 정정)·②ROAS 3산식(별도 Metric 분리+UI 기본 adj)·③채널 정규화 방향 상충(단일 SSOT·PM 방향 결정 필요).
3. **Unexplained Difference 0**: 모든 기존↔Canonical 차이를 원인분류(LEGACY_FORMULA_ERROR/의도적 이원/데드코드 등). Unexplained 없음(→Part2 진행 가능하되 구현 선결).
4. **Consumer**: Unmanaged 3(프론트 대시보드/GDC 자체계산·AI Context 부재). 백엔드 API/Report는 SSOT 사용하나 metric_id/version 미부착.
5. **Tenant Isolation=PASS**(01-D 승계). Legacy 분류(Rollup/Pnl/OrderHub/AutoCampaign/CRM=CANONICAL·프론트=CONSOLIDATION·RoiService=DEPRECATION).
6. **무후퇴**: Legacy 즉시삭제·Formula Conflict 근거없는 해결·미검증 Cache·Blocked Metric 자동화·Rollback 없는 전환 금지.

## Production Blockers (§35)
Semantic Query Layer 미구현(최상위)·ROAS 프론트 버그·채널 방향·metric_id/version 미부착·AI Context·Lint 미배선·metric_version Cache·재고회전 부재·Golden/회귀 미실행.

## 무후퇴·영구 규칙(§45)
Semantic Layer 최종 감사(Drift·Golden·회귀·Security·Performance·Consumer 회귀) 없이 Metric Formula/Version 변경·Consumer 전환·Cache 구조 변경·Legacy 제거·Production Certification 금지.

## 결과
Final Audit·Regression Certification Baseline 확정(Drift 7·Blocker 다수·Production Ready 0·Unexplained 0). 다음 **EPIC 03-D Part 2 — Production Readiness, Canary, Cutover, Rollback & DR** 입력 준비 완료(단 실 구현이 Production 선결). 코드변경 0.
