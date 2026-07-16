# EPIC 04-D Part 1 — AI Memory Final Audit, Security Validation & Regression Certification Baseline (정식 마스터)

> **근거**: 04-A(Inventory)·04-B(Schema)·04-C(Ingestion/Retrieval 설계) + 실코드 기억성 저장소. **비파괴**: 감사·인증·Baseline만. 코드변경 0. 운영 전환·Legacy 삭제·미검증 Memory 활성 없음(§56).
> **§57 통합**: ~45개 파편 대신 본 마스터가 Registry Cross-Check·Store/Service Audit·Schema Gap·Ingestion/Retrieval Validation·Secret/PII·Fact/Inference·Scope/Consent/Memory/Version Drift·Vector/Graph/Context Audit·Injection/Poisoning·Consumer Validation·User Control·삭제/정정 전파·Shadow·Golden·Security/Privacy/Performance Baseline·Legacy 분류·Certification Matrix·Blockers를 통합. ADR=[`../architecture/ADR_AI_MEMORY_FINAL_AUDIT.md`](../architecture/ADR_AI_MEMORY_FINAL_AUDIT.md). 재발 이력=기존 `../registry/RepeatedDefectHistory.md` 편입.

---

## 0. ★정직 프레이밍
**AI Memory Engine 미구현**(04-B/C 설계). 기억성 저장소(tenant_business_profile·ai_analyses 등)는 존재하나 Canonical Memory Engine·Retrieval Service·Context Builder(ClaudeAI stateless 외)·벡터 부재. 따라서:
1. **기존 저장소를 Canonical Schema와 대조한 감사**(완료).
2. **Golden Dataset/Historical Regression/Shadow Compare는 Engine 미구현이라 실행 불가**→BLOCKED_PENDING_IMPLEMENTATION(허구 통과 금지 §3.2).
3. **Production Ready 0**. Part 1 = 감사·Baseline 사양·Blocker 완성.

## 1. Registry Cross-Check (§4)
- Memory Type(13)·Scope(8)·Source(16)·Status·Purpose·Consent·Retention·Ingestion Source·Retrieval Purpose·AI/Automation Eligibility·Vector/Graph Projection Registry = **04-B 문서 확정**이나 **실 코드가 Memory ID/Type으로 저장·조회하지 않음**(기존 저장소는 자체 스키마). → 전 항목 문서 CONTRACT 존재·실행 미연결.

## 2. Schema Implementation Gap (§5) — 대부분 미구현
- Canonical Item 필수필드 ~50 중 기존 저장소 보유=tenant_id/일부 timestamp/일부 status. **미구현(SCHEMA_IMPLEMENTATION_GAP)**: memory_id/version_id·scope_type·subject/owner/actor·evidence/lineage·verification_status·trust/confidence/quality·consent_id·processing_purpose·retention_class·ai/automation_eligibility·데이터 classification. → **AI Memory Engine 신설 시 구현**.

## 3. Store Audit Matrix (§7/§60) & Service (§8)

| Store | Canonical Role | Scope | Deletion(DSAR) | Status |
|---|---|---|---|---|
| tenant_business_profile | CANONICAL_PRIMARY(Config/Goal) | tenant ✅ | **미대상 GAP** | MIGRATION_REQUIRED |
| tenant_kv | CANONICAL_PRIMARY(Config) | tenant ✅ | 부분 | VALIDATED_LEGACY |
| rule_engine | CANONICAL_PRIMARY(정책) | tenant ✅ | **미대상 GAP** | VALIDATED_LEGACY |
| channel_learned_prior/journey_decision_arm | CANONICAL_PRIMARY(Learning) | tenant ✅ | 미대상 | VALIDATED_LEGACY |
| action_request | CANONICAL_PRIMARY(Decision) | ⚠️ NULL 허용 | 미대상 | MIGRATION_REQUIRED |
| journey_enrollments | CANONICAL_PRIMARY(Execution) | tenant ✅ | ✅ DSAR | VALIDATED_LEGACY |
| ai_analyses | CANONICAL_PRIMARY(Context/Inference) | ⚠️ 'unknown' | **미대상 GAP** | MIGRATION_REQUIRED·BLOCKED_PRIVACY(DSAR) |
| ai_generate_log | CANONICAL_PRIMARY(Context) | tenant ✅ | **미대상 GAP** | MIGRATION_REQUIRED·BLOCKED_PRIVACY |
| ai_settings(api_key) | KEEP_SEPARATE(Secret) | tenant ✅ | — | ⚠️ 평문 UNVERIFIED |
| app_setting | BLOCKED_PRIVACY(AI Memory 금지) | 전역 | — | 전역 |
| Vector/Document/Search Store | (부재) | — | — | UNUSED(신설 대상) |

- **Service(§8)**: ClaudeAI(Context stateless)·AutoRecommend·JourneyBuilder·RuleEngine·AiGenerate·DataPlatform. **MemoryService/RetrievalService/VectorSearch=부재**(신설 대상).

## 4. Secret·PII / 과잉수집 감사 (§10/§11)
- ★**Secret**: ai_settings.api_key(TEXT·**평문 여부 UNVERIFIED**·Crypto.php 존재하나 미검증)→CRITICAL Blocker(암호화 검증·AI Memory 혼입 금지). app_setting cred_enc_key/admin_access_key_hash=전역(AI Memory 금지).
- **과잉수집**: 챗봇 stateless라 대화 전문 장기저장 없음(양호). ai_generate_log는 prompt+result 영속(PII 유입 시 과잉·DSAR 필요). **DATA_MINIMIZATION_VIOLATION 명백 사례 0**(챗봇 stateless가 방지).

## 5. Fact·Inference / Drift 감사 (§12~16)
- **Fact·Inference(§12)**: 현 ai_analyses는 분석 로그(INFERENCE 성격)이나 **명시적 INFERENCE 상태 라벨 없음**·Confidence/Model Version 부분·Expiry 없음 → Engine 신설 시 분리 필수. UI가 Inference를 사실로 표시하는지=현재 챗봇 응답 내 grounding(GeniegoKnowledge 정적)이라 위험 낮으나 미검증.
- **Scope Drift(§13)**: ai_analyses 'unknown'·action_request NULL 레거시 = 잠재 크로스테넌트(CRITICAL). app_setting 전역을 개인화에 쓰면 Drift.
- **Consent Drift(§14)**: 동의 스키마 미구현(gdpr_consents는 CRM용)·AI Memory Consent 없음 → Engine 신설 시 정의.
- **Memory/Version Drift(§15/§16)**: 기존 저장소 간 Schema 상이(정본 미존재)·Vector/Cache 부재라 Version Drift 현재 없음(구현 후 관리).

## 6. Retrieval / Vector / Graph / Context 감사 (§17~25)
- **Retrieval(§17)**: Canonical Retrieval Service 부재. 현 조회=각 핸들러 tenant WHERE(fail-closed·01-D 승계). Purpose/Consent/Eligibility Filter 없음(Engine 신설 시).
- **Vector(§19)**: 부재→Scope Filter 누락 위험 0(현재)·신설 시 CRITICAL 강제. **Graph(§20)**: KG 미적재(02-C)라 Memory Graph Retrieval 없음.
- **Context(§23/§24)**: ClaudeAI Context Builder=stateless(history 클라·GeniegoKnowledge 정적)·**최소화 양호**(전체 대화 미저장). Fact/Inference/Preference **Label 없음**(Engine 신설 시).

## 7. Injection / Poisoning / Consumer (§26~32)
- **Injection(§26)**: ★기존 방어 선례=ClaudeAI:878 **tool_use 재주입 차단·text-only 재구성·HIST_MAX 캡**(부분 방어). Content/Instruction 완전 분리·Memory Text 지시 무력화=Engine 신설 시 강화.
- **Poisoning(§27)**: 반복입력 Preference 조작·Cross-Tenant ID 주입=현재 Memory Engine 없어 표면 위험 낮으나, learned_prior/journey_arm은 outcome 학습이라 조작 가능성 검토 필요(tenant 격리로 cross-tenant 차단됨).
- **Consumer(§28~32)**: Chat Assistant(ClaudeAI)·AutoRecommend·AutoCampaign automation. 공식 Retrieval Service 미사용(부재)→Engine 신설 시 편입.

## 8. User Control / 삭제·정정·동의 전파 (§33~36) — ★DSAR GAP 확정
- **User Control(§33)**: DSAR 핸들러(Dsar.php) 존재(조회/삭제)이나 **AI 기억성 저장소 미편입**(USER_CONTROL_IMPLEMENTATION_GAP).
- **삭제 전파(§35)**: ★**ai_analyses/ai_generate_log/business_profile/rule_engine이 Dsar.php erase 경로 부재(04-A/B 확정)**→삭제 전파 실패=Production Blocker.
- **동의 철회(§36)**: AI Memory Consent 미구현→철회 차단 경로 없음(Engine 신설 시).

## 9. Baseline / Shadow / Golden (§39~45)
- **Shadow/Golden/Historical Regression=Engine 미구현이라 실행 불가**→BLOCKED_PENDING_IMPLEMENTATION. **대신 사양 완성**(Golden 26 시나리오·Cross-Tenant/Injection/Poisoning/삭제 전파 테스트 절차).
- **Security Baseline(§43)**: 기존 tenant 격리=PASS(01-D 승계)·Cross-Tenant Vector/Graph=부재(N/A)·Secret 차단=미구현(ai_settings 평문 위험). **Privacy Baseline(§44)**: DSAR 조회/삭제 존재하나 AI 저장소 GAP·동의/Retention/Anonymization 미구현. **Performance**: 구현 후.

## 10. Legacy 분류 / Duplicate / Lint·Guard (§47~50)
- **Legacy 분류(§47)**: business_profile/tenant_kv/rule_engine/learned_prior/journey/ai_analyses=CANONICAL_PRIMARY·ClaudeAI Context=CANONICAL_CONTEXT_BUILDER·GeniegoKnowledge=SOURCE_ADAPTER·app_setting=BLOCKED_PRIVACY.
- **Duplicate(§48)**: 정책 파편(rule_engine+per-request guardrails+channel_kpi_config)·decision 파편(action_request/journey/ad_execution_log). 통합 스토어 신설 계획.
- **Static Lint/Runtime Guard(§49/§50)**: **미구현(PLANNED)**·CI inert. Scope 없는 저장·Secret 저장·Deleted 사용·Inference Fact 승격 차단 규칙=신설.

## 11. Certification Matrix (§58) & Production Blockers (§53)

| Target | Schema | Scope | Privacy | Security | Deletion | Status |
|---|---|---|---|---|---|---|
| tenant_business_profile | 부분 | ✅ | GAP | ✅ | **✗ DSAR** | BLOCKED_PRIVACY |
| ai_analyses | 부분 | ⚠️'unknown' | GAP | ⚠️ | **✗ DSAR** | BLOCKED_PRIVACY·BLOCKED_SCOPE |
| ai_settings.api_key | — | ✅ | Secret | ⚠️ 평문? | — | BLOCKED_SECURITY(미검증) |
| Canonical Memory Engine | 미구현 | — | — | — | — | **BLOCKED_PENDING_IMPLEMENTATION** |

**Production Ready = 0.** Blockers: ①AI Memory Engine 미구현(최상위)②**ai_analyses/ai_generate_log/business_profile/rule_engine DSAR 삭제경로 누락**③ai_analyses 'unknown'/action_request NULL 크로스테넌트 레거시④ai_settings.api_key 평문 여부 미검증⑤Vector/Retrieval Service/Context Builder(Canonical)/Static Lint/Runtime Guard 미구현⑥Consent/Retention/Anonymization 미구현⑦Golden/Shadow 미실행.

## 12. §62 완료 보고 수치
Memory Type 13 · Store ~13(RDB·Vector 0) · Service ~6(MemoryService 부재) · Ingestion Source 8(구현 0) · Retrieval Path=기존 핸들러 조회(Canonical 0) · Context Consumer 6 · **Schema Implementation Gap 다수**(~40필드) · Scope Drift 2(레거시)·Consent Drift(스키마 부재)·Memory/Version Drift 0(정본 부재·Vector 부재) · **Secret/PII Risk 1**(ai_settings 평문) · Over-Collection 0(챗봇 stateless) · Cross-Tenant 차단=기존 tenant 격리 PASS(01-D)·Vector N/A · Injection=ClaudeAI:878 선례 부분 · Poisoning=현재 표면위험 낮음 · **삭제 전파 실패=DSAR GAP 4** · 동의 철회=미구현 · Golden/Shadow=실행 불가(사양) · Unexplained Difference 0 · Security Verified=부분(tenant 격리)·Privacy Verified 0·Regression 0 · **Production Ready 0** · Legacy Fallback 다수 · Duplicate 2(정책/결정 파편) · 문서=본 마스터+ADR+PM · 남은리스크=**AI Memory Engine 구현이 모든 Production 선결**·DSAR 편입·레거시 tenant 정정·Secret 암호화 · **EPIC04-D Part2(Production Readiness·Canary·Rollback·DR) 준비 완료(단 실 구현 선결)**. 코드변경 0.
