# ADR — AI Memory Production Cutover, Rollback & DR (EPIC 04-D Part 2)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (전환 프레임워크·Rollback·DR 설계. 비파괴 — 코드변경 0). 실 Cutover는 AI Memory Engine+Feature Flag+Kill Switch+Vector+DSAR 편입 구현 후.
- **근거**: [`../ai-memory/AI_MEMORY_PRODUCTION_READINESS.md`](../ai-memory/AI_MEMORY_PRODUCTION_READINESS.md) + Part 1 + GeniegoROI 실 인프라.

## 결정 (핵심)
1. **정직**: AI Memory Engine 미구현 → 전환 대상 없음 → **전 항목 BLOCKED_PENDING_IMPLEMENTATION·Production Active 0**. 허구 전환 보고 금지.
2. **실 인프라 매핑**: Version Routing=/vNNN 접두·Rollback=dist.bak 스왑백·**Feature Flag/Kill Switch/Personalization Switch/Vector=부재→신설**(구현 선결).
3. **일괄 활성 금지**(§3.1): Memory Type/Source/Store/Retrieval/Consumer/Tenant/User/Purpose/Automation 단위 분리·낮은 위험부터. **Write/Read Path 분리 전환**·Fact/Inference 정책 Cutover 중 고정.
4. **User Control/Consent/Deletion Cutover 선결**(§3.7): DSAR GAP(ai_analyses/ai_generate_log/business_profile/rule_engine) 실 전파 검증 없이 전환 금지.
5. **Canary=대표성 실 Tenant+User Cohort(동의)**·Demo 단독 금지. Shadow Exit=Cross-Tenant/삭제/Consent 철회/Secret/Unexplained 0.
6. **자동화 최후**·Kill Switch(Memory+Personalization+Automation)·보상조치·**Privacy SLO(Cross-Tenant/Secret/Deleted=0)는 성능보다 우선·별도 Critical Incident**.
7. **DR/Backup 실제 테스트**(Backup 복원 후 삭제 Memory 억제 포함)·Consent/삭제 상태 RPO/RTO 엄격.

## 무후퇴·영구 규칙(§74)
전환 순서: Final Audit→Readiness→Ingestion/Retrieval/Context Shadow→Canary→User Control/Consent/Deletion 검증→Limited Production→AI/Recommendation→Automation Preview→제한 실행→Stabilization→Final Certification→Legacy Deprecation. Schema/Scope/Consent/Fact 정책 변경+Cutover 동시 금지. Legacy 즉시삭제·Kill Switch 없는 Automation 금지.

## 결과
전환 프레임워크·Rollback·DR 설계 확정(Production Active 0·구현 선결). 다음 **EPIC 04-D Part 3 — Enterprise Certification, Governance, Sign-off & Recurrence Prevention** 입력 준비 완료. 코드변경 0.
