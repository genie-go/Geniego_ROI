# ADR — Canonical AI Memory Schema & Lifecycle Governance (EPIC 04-B)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Schema·Lifecycle·통합 분류 확정. 비파괴 — 코드변경 0). 실 Store 신설·Migration·Validator는 후속 승인·회귀 후.
- **근거**: [`../ai-memory/CANONICAL_AI_MEMORY_SCHEMA.md`](../ai-memory/CANONICAL_AI_MEMORY_SCHEMA.md) + 04-A + EPIC 01~03.

## 결정 (핵심)
1. **Memory Type Registry 13(MT-*)·memory_id(UUID/ULID)+memory_version_id**(외부 Record ID Primary 금지·Version 덮어쓰기 금지). Item 필수필드 ~50.
2. **Fact vs Inference 분리**(§3.2): INFERENCE/SUMMARY를 FACT처럼 사용 금지. AI_AGENT 생성 Memory=INFERRED(자동 사실화 금지). 충돌 우선순위 AI 추론 최하.
3. **Subject≠Owner≠Actor 분리**·**Scope 강제**(불명확=BLOCKED_SCOPE_UNRESOLVED·저장 금지)·Cross-Scope 자동승격 금지.
4. **기존 Store 분류**: business_profile/tenant_kv/rule_engine/learned_prior/journey/action_request/ai_analyses=CANONICAL_PRIMARY·crm_*/ai_settings=KEEP_SEPARATE·app_setting=BLOCKED_PRIVACY. **신설 5**(user_settings·conversation·통합 정책·decision/outcome 원장·vector).
5. **MIGRATION_REQUIRED 3**: business_profile·action_request(tenant NULL 정정)·ai_analyses(tenant 'unknown' 정정+DSAR 편입).
6. **★DSAR 편입 필수**: 삭제 전파(Primary+Cache+Vector+Search+KG+Derived+Recommendation Cache+Automation Eligibility+Backup Suppression). ai_analyses/ai_generate_log/business_profile/rule_engine을 Dsar.php erase에 편입.
7. **Privacy**: SECURITY_SECRET AI Memory 저장 금지·Consent 철회=즉시 사용제한+삭제/익명화·Retention Class. Runtime Guard/Static Lint로 Secret/Cross-Tenant/미등록 Type/INFERRED 자동화 차단.

## Risk / 무후퇴
04-A Critical(벡터 Scope·Secret·레거시 tenant·DSAR GAP) 해소 전 Canonical 저장경로 승인 금지. 기존 Preference/History/Recommendation/Decision/Conversation API·사용자 제어 즉시제거 금지(Adapter 점진). 동일 기억 복수 Store 금지·AI 추론 사실화 금지.

## 결과
Canonical AI Memory Schema·Lifecycle 확정(Type 13·필드 50·Migration 3·신설 5). 다음 **EPIC 04-C — AI Memory Ingestion, Retrieval, Context Assembly & Usage Enforcement** 입력 준비 완료. 코드변경 0.
