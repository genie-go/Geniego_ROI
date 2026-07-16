# ADR — Enterprise AI Memory Baseline (EPIC 04-A)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Inventory·Scope·Privacy·Architecture Baseline. 비파괴 — 코드변경 0). 실 Memory Engine·Vector·대화메모리는 후속 승인 후.
- **근거**: [`../ai-memory/AI_MEMORY_ARCHITECTURE_BASELINE.md`](../ai-memory/AI_MEMORY_ARCHITECTURE_BASELINE.md) + 288차 기억성 저장소 전수조사 + EPIC 00~03.

## 결정 (핵심)
1. **AI Memory=SoT 참조 개인화/문맥 계층**(§3.7). Canonical Data/KG/Semantic/Audit 대체 금지. 주문/결제/광고비/권한/자격증명의 유일 저장소 금지.
2. **재사용(신설 금지)**: tenant_business_profile(브랜드/목표)·tenant_kv(설정 KV)·rule_engine(정책)·channel_learned_prior/journey_decision_arm(학습·밴딧)·ai_analyses(분석이력)·crm_*(read-only)·ai_settings(provider).
3. **신설 정당(부재 확인)**: 대화/스레드 메모리(서버 stateless)·사용자 선호 테이블(user_settings 부재·app_user 언어/통화/TZ 컬럼 없음)·통합 정책 스토어(파편)·통합 decision/outcome 원장(파편)·Vector Store(보류·도입 시 격리 필수).
4. **AI 추론=INFERRED**(§3.1). 검증 없이 FACT 승격 금지·우선순위 최하·INFERRED만으로 고위험 자동화 금지.
5. **Privacy**: Secret/Token/원본 PII AI Memory 저장 금지(Secret Reference만). 벡터 신설 시 tenant 파티션·Scope Filter 없는 Vector Search=CRITICAL.
6. **★DSAR GAP 확정**: ai_analyses/ai_generate_log/business_profile/rule_engine이 DSAR erase 경로 부재 → **신설 Memory Engine은 DSAR erase 편입 필수**.
7. **Cross-Tenant 위험**: ai_analyses(기본 'unknown')·action_request(NULL 허용) 레거시 행 → 정정(비파괴 격리).

## Risk (§40)
CRITICAL 4: Vector Scope 누락(신설 시)·Secret 혼입(ai_settings.api_key 평문 UNVERIFIED)·레거시 tenant 'unknown'/NULL·DSAR 삭제경로 누락. HIGH: app_setting 재사용·AI 추론 FACT 승격.

## 무후퇴·영구 규칙(§53)
새 Memory/Context/Preference/History/Vector 전: Store Registry·Type/Scope Registry·SoT·Privacy/Consent·Classification·Retention/Deletion·Tenant/Workspace/User Scope·Vector/Cache 삭제전파·Consumer·Recommendation/Automation 제한 → ADR/PM. 동일 기억 복수 Store 금지·AI 추론 사실화 금지.

## 결과
AI Memory Inventory·Architecture Baseline 확정(Store 13·Type 14·Risk CRITICAL 4·DSAR GAP 3). 다음 **EPIC 04-B — Canonical AI Memory Schema, Identity, Scope & Lifecycle Governance** 입력 준비 완료. 코드변경 0.
