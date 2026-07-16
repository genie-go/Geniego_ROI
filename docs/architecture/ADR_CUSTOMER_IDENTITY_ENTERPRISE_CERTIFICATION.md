# ADR — Customer Identity Enterprise Certification & Governance (EPIC 05-D Part 3)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (거버넌스·인증 프레임워크 Sign-off. 비파괴 — 코드변경 0). Canonical Production Certification은 실 구현 후.
- **근거**: [`../customer-profile/EPIC_05_FINAL_CERTIFICATION_PACKAGE.md`](../customer-profile/EPIC_05_FINAL_CERTIFICATION_PACKAGE.md) + Part 1/2 + 기존 거버넌스.

## 결정 (핵심)
1. **정직 인증**: 라이브 엔진 일부 L2-3(crm_customers/Union-Find/확률병합+Unmerge)=CONDITIONALLY_CERTIFIED·**Enterprise Certified 0**(Canonical 미완·Identity Accuracy 미측정·05-B Critical 미해소). **EPIC 05=Governance Framework Sign-off, Canonical Production=BLOCKED_PENDING_IMPLEMENTATION**.
2. **Schema·Rule·Policy·Version Lock**: 라이브 L2-3 3종(crm_customers·Union-Find rule·isMarketingSendAllowed·Unmerge) Lock(변경=신 Version+Change Request).
3. **Change Governance = 기존 CHANGE_GATE/DecisionLog 편입**. MAJOR(의미/Identifier/Normalization/Match/Auto Merge 기준/Golden/Consent/Query/Automation)=신 Version. Emergency=Incident+Kill Switch+사후 ADR+재인증.
4. **New Source/Identifier/Rule/Model/Auto Merge/Consumer Gate·Expansion Gate·중복/기능후퇴 방지·CI Merge Gate**: 정의. CI inert+Lint 미구현→PLANNED.
5. **재발방지 = RepeatedDefectHistory/RootCauseAnalysis 편입**: 288차 확정 고객 결함 6건(동의확대·합성 buyer_email·PII 무마스킹·정규화 3종·DSAR 병합형제·라이브 자동병합 Kill Switch 부재) 등재.
6. **영구 규칙(§63/§64)**: 신규 Customer Source/Identifier/Rule 등 전 Customer Identity Governance 통과·에이전트 Customer 작업 전 18 Registry 조회 → CLAUDE.md/CONSTITUTION/registry README 배선.
7. **★핵심 잔여 결함=실코드 백로그**: 동의확대·합성 buyer_email·PII 무마스킹·정규화·DSAR 병합형제·라이브 자동병합 Kill Switch = Canonical CDP 구현과 별개로도 우선 처리 백로그. **라이브 crm_customers/CRM은 legacy 계속 운영**.

## 무후퇴·영구 규칙
Certified 기능 단순화/교체/삭제 금지·Legacy+Canonical 동시 장기 Write 금지·조회 없는 동일기능 재구현 금지·전체 일괄 Merge·Precision 미검증 자동 Merge 확대 금지. 모든 변경=증거·테스트·이력·승인.

## 결과 — EPIC 05 완결(거버넌스 수준)
Customer Identity Governance Framework 완성·Sign-off(비파괴·코드변경 0). Canonical Production CDP는 후속 구현 EPIC(승인 시). 다음 권장 **EPIC 06-A — Enterprise Segmentation, Audience & Cohort Inventory, Eligibility, Consent, Channel Mapping & Data Isolation Baseline**.
