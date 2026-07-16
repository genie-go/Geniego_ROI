# ADR — AI Memory Ingestion, Retrieval & Usage Enforcement (EPIC 04-C)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (Pipeline·Service·Gate 설계. 비파괴 — 코드변경 0). 실 구현·Consumer 전환은 후속 승인·Shadow·회귀 후.
- **근거**: [`../ai-memory/AI_MEMORY_INGESTION_RETRIEVAL.md`](../ai-memory/AI_MEMORY_INGESTION_RETRIEVAL.md) + 04-A/B + 기존 ClaudeAI 문맥 경로.

## 결정 (핵심)
1. **정직**: AI Memory Engine 미구현(챗봇 stateless·벡터 부재) → 실행 계층 설계·구현 PLANNED. Candidate/Retrieval/Context/Gate = 설계 확정, 실 배선 없음.
2. **수집≠사실 승격**(§3.2): Candidate Eligibility 통과분만 저장·AI Inference/Summary=ACCEPTED_INFERENCE(FACT 아님)·Labeling으로 Context에서 추론/사실 구분.
3. **Retrieval Service 단일 진입점**: UI/AI/Recommendation/Automation의 Primary/Vector/Graph 직접조회 금지. **Scope는 검색 쿼리·Vector Metadata·Graph·DB·Cache Key 모두 강제**(후처리 필터만 의존 금지).
4. **Structured 우선**(권위 설정=RDB 정확조회, 의미검색 금지)·Vector 부재→도입 시 격리 필수·Graph 관계만으로 Payload 접근권 자동부여 금지.
5. **Ranking 우선순위 AI Inference 최하**·Conflict 숨기고 임의선택 금지·Deleted 절대 반환 금지·삭제/철회 물리삭제 전에도 즉시 차단(§3.7).
6. **Usage Gate Consumer별 차등**: 고위험 자동화는 AUTOMATION_ALLOWED+Preview+Approval+Kill Switch+Rollback. **INFERRED/STALE/CONFLICTING/EXPIRED=고위험 자동화 금지**(§3.8).
7. **Prompt Injection 방어**: ClaudeAI:878 tool_use 재주입 차단 선례 재사용·Content/Instruction 분리·Labeling. Poisoning 방어(Cross-Tenant ID 주입·위조 Approval·Bot Feedback).
8. **무후퇴**: 기존 Context/History/Preference/Recommendation 즉시삭제 금지(Adapter 점진·Shadow Compare).

## 무후퇴·영구 규칙(§65)
새 Ingestion Source/Retrieval Path/Context Builder/Vector 전: Memory Type/Ingestion Source/Retrieval Purpose Registry·Scope/Consent/Purpose·Secret/PII·Duplicate/Conflict·Status/Freshness·Context Budget/Masking·AI/Automation Eligibility·Deletion 전파 → ADR/PM. **Canonical Retrieval Service 우회 직접조회 금지**.

## 결과
Ingestion/Retrieval/Context/Enforcement 설계 확정(Source 8·Retrieval 3유형·Gate Consumer별). 구현 PLANNED. 다음 **EPIC 04-D — AI Memory Final Validation, Production Certification, Governance & Recurrence Prevention** 입력 준비 완료. 코드변경 0.
