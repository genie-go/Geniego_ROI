# ADR — Semantic Enterprise Certification & Governance (EPIC 03-D Part 3)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (거버넌스·인증 프레임워크 Sign-off. 비파괴 — 코드변경 0). Production Certification은 실 구현 후.
- **근거**: [`../semantic/EPIC_03_FINAL_CERTIFICATION_PACKAGE.md`](../semantic/EPIC_03_FINAL_CERTIFICATION_PACKAGE.md) + Part 1/2 + 기존 거버넌스(docs/registry·CHANGE_GATE·CONSTITUTION).

## 결정 (핵심)
1. **정직 인증**: Semantic Query Layer 미구현 → **Enterprise Certified 0·Production Certified 0**. 최고 도달=L2(기존 SSOT 실존: adj_roas/Net Revenue/COGS/LTV/VAT). Golden/회귀/Shadow 미실행이라 L3+ 불가. **EPIC 03 = 거버넌스/설계 프레임워크로 Sign-off, Production은 BLOCKED_PENDING_IMPLEMENTATION**.
2. **Formula Version Lock**: L2 SSOT 5종 Lock 등재(변경=신 Version+Change Request). 기존 산식 직접수정 금지.
3. **Change Governance = 기존 CHANGE_GATE/DecisionLog 편입**(병렬 신설 금지). MAJOR(Formula/Grain/의미/Source/Currency/Time/Attribution)=신 Version. Emergency=Incident+사후 ADR+재인증.
4. **New Metric/Consumer Gate**·**Duplicate/기능후퇴 방지 Gate**·**CI Merge Gate**: 정의. CI는 시크릿 미등록 inert+Semantic Lint 미구현 → **PLANNED**(deploy.yml 확장·중복 워크플로 금지).
5. **재발방지 = 기존 RepeatedDefectHistory/RootCauseAnalysis 편입**: 288차 확정 재발성 2건(ROAS 산식 분산·채널 정규화 방향 상충) 등재. Root Cause=Formula 분산·Registry 미조회·Consumer 자체계산.
6. **영구 규칙(§56/§57)**: 신규 Metric/Formula/Version 등 15종 전 Semantic Governance 통과·모든 Claude Code 에이전트 작업 전 12 Registry 조회 → CLAUDE.md/CONSTITUTION/registry README 배선 대상.
7. **Legacy 제거 금지**(Semantic 미구현·Fallback 필수). History/Evidence 영구보존.

## 무후퇴·영구 규칙
Certified 기능 단순화/교체/삭제 금지·Legacy+Canonical 동시 쓰기 금지·조회 없는 동일기능 재구현 금지. 모든 변경=증거·테스트·이력·승인.

## 결과 — EPIC 03 완결(거버넌스 수준)
Semantic Layer Enterprise Governance Framework 완성·Sign-off(비파괴·코드변경 0). Production Semantic Layer는 후속 구현 EPIC(승인 시). 다음 권장 **EPIC 04-A — Enterprise AI Memory Inventory, Scope, Privacy & Architecture Baseline**.
