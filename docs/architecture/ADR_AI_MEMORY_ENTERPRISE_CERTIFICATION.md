# ADR — AI Memory Enterprise Certification & Governance (EPIC 04-D Part 3)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (거버넌스·인증 프레임워크 Sign-off. 비파괴 — 코드변경 0). Production Certification은 실 구현 후.
- **근거**: [`../ai-memory/EPIC_04_FINAL_CERTIFICATION_PACKAGE.md`](../ai-memory/EPIC_04_FINAL_CERTIFICATION_PACKAGE.md) + Part 1/2 + 기존 거버넌스(docs/registry·CHANGE_GATE·CONSTITUTION).

## 결정 (핵심)
1. **정직 인증**: AI Memory Engine 미구현 → **Enterprise Certified 0·Production Certified 0**. 최고 도달=L2 부분(기존 저장소 실존). ai_analyses/business_profile=BLOCKED_PRIVACY(DSAR GAP). **EPIC 04=Governance Framework로 Sign-off, Production은 BLOCKED_PENDING_IMPLEMENTATION**.
2. **Schema·Policy·Version Lock**: L2 실존 저장소 4종(business_profile/tenant_kv/rule_engine/learned_prior) Lock 등재(변경=신 Version+Change Request).
3. **Change Governance = 기존 CHANGE_GATE/DecisionLog 편입**(병렬 신설 금지). MAJOR(의미/Scope/Consent/Retention/Deletion/Fact 승격/SoT/Retrieval/Context/Automation Eligibility)=신 Version. Emergency=Incident+Kill Switch+사후 ADR+재인증.
4. **New Type/Source/Retrieval/Consumer Gate·중복/기능후퇴 방지 Gate·CI Merge Gate**: 정의. CI inert+Lint 미구현→PLANNED.
5. **재발방지 = 기존 RepeatedDefectHistory/RootCauseAnalysis 편입**: 288차 확정 결함 2건(DSAR 삭제경로 누락 Root=Deletion Orchestrator 부재·신규 저장소 DSAR 미편입 관행·크로스테넌트 레거시 tenant 'unknown'/NULL Root=사후 tenant_id 추가·기본값 오설정) 등재.
6. **영구 규칙(§61/§62)**: 신규 Memory Type/Store/Vector 등 18종 전 AI Memory Governance 통과·모든 Claude Code 에이전트 AI Memory 작업 전 16 Registry 조회 → CLAUDE.md/CONSTITUTION/registry README 배선.
7. **★핵심 잔여 결함**: DSAR 삭제경로 누락·크로스테넌트 레거시·Secret 평문 = AI Memory 구현과 별개로도 **실코드 백로그**(구현·자격증명 시 우선 처리).

## 무후퇴·영구 규칙
Certified 기능 단순화/교체/삭제 금지·Legacy+Canonical 동시 장기 Write 금지·조회 없는 동일기능 재구현 금지. 모든 변경=증거·테스트·이력·승인.

## 결과 — EPIC 04 완결(거버넌스 수준)
Enterprise AI Memory Governance Framework 완성·Sign-off(비파괴·코드변경 0). Production AI Memory는 후속 구현 EPIC(승인 시). 다음 권장 **EPIC 05-A — Enterprise Customer & Unified Profile Inventory, Identity Resolution, Consent & Data Isolation Baseline**.
