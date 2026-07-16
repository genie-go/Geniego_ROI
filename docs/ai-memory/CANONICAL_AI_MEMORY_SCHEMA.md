# EPIC 04-B — Canonical AI Memory Schema, Identity, Scope & Lifecycle Governance (정식 마스터)

> **근거**: 04-A [`AI_MEMORY_ARCHITECTURE_BASELINE.md`](AI_MEMORY_ARCHITECTURE_BASELINE.md)(기존 Store·Risk·DSAR GAP) + EPIC 01~03(CE/REL/KG/Semantic). **비파괴**: Schema·Registry·Lifecycle·통합계획만. 코드변경 0. 신규 Store 무조건 추가·History 삭제·Vector 도입·Memory 기반 자동화 없음.
> **§54 통합**: 36개 파편 대신 본 마스터가 Type Registry·Item Schema·ID/Version·Subject/Owner/Actor·Scope Enforcement·Source/Evidence·Lifecycle/Status·Conflict/Supersession/Duplicate·Consent/Purpose/Retention/Deletion/Anonymization·Vector/Graph Projection·AI/Automation Eligibility·Validator/Runtime Guard/Lint·Existing Store 분류/Migration을 통합. ADR=[`../architecture/ADR_CANONICAL_AI_MEMORY_SCHEMA.md`](../architecture/ADR_CANONICAL_AI_MEMORY_SCHEMA.md).
> **Critical 선결**: 04-A Risk(벡터 Scope·Secret·레거시 tenant·DSAR GAP) 해소 전 Canonical 저장경로 승인 금지.

---

## 1. Canonical Memory Type Registry (§4 — MT ID 영구)

| Type ID | Category | 필수 정책 | 기존 매핑 | AI Use | Automation |
|---|---|---|---|---|---|
| MT-FACT-000001 | FACT | 검증 Source 필수 | (신설) | ALLOWED | APPROVAL |
| MT-PREF-000001 | PREFERENCE | 명시 vs 추론 구분 | (신설 user_settings) | ALLOWED | PREVIEW |
| MT-CONFIG-000001 | CONFIGURATION | Workspace/Tenant 승인+Version | tenant_kv·rule_engine·business_profile | ALLOWED | ALLOWED |
| MT-GOAL-000001 | GOAL | 기간·KPI·Owner·Review | business_profile(부분·신설) | ALLOWED | PREVIEW |
| MT-DEC-000001 | DECISION | 대안·승인자·근거 | action_request | SUMMARY_ONLY | APPROVAL |
| MT-EXEC-000001 | EXECUTION | 실행 Ref+Idempotency | journey_enrollments·ad_execution_log | RESTRICTED | ALLOWED |
| MT-OUTCOME-000001 | OUTCOME | 예상/실제/Attribution 제한 | journey outcome·channel_learned_prior | ALLOWED | PREVIEW |
| MT-STRATEGY-000001 | STRATEGY | 승인·범위·유효기간 | (신설) | ALLOWED | APPROVAL |
| MT-FEEDBACK-000001 | FEEDBACK | 대상·응답·강도·해석제한 | journey_decision_arm·(신설 rating) | SUMMARY_ONLY | BLOCKED |
| MT-PROBLEM-000001 | PROBLEM | Root Cause·재발·예방테스트 | RepeatedDefectHistory | ALLOWED | BLOCKED |
| MT-COMPLIANCE-000001 | COMPLIANCE | 동의·처리제한·삭제·보존 | gdpr_consents·dsar | RESTRICTED | BLOCKED |
| MT-INFER-000001 | INFERENCE | Model Version·Confidence·만료·검증 | ai_analyses | CONFIRMATION_REQUIRED | BLOCKED(고위험) |
| MT-SUMMARY-000001 | SUMMARY | 비민감·출처 | ai_analyses·ai_generate_log | SUMMARY_ONLY | PREVIEW |

**★INFERENCE/SUMMARY를 FACT처럼 사용 금지**(§3.2).

## 2. ID / Version (§5/§6)
- **memory_id** = UUID/ULID(충돌안전·외부 Source ID 분리·Tenant Scope 별도). **외부 채널 Record ID를 Primary ID 사용 금지**. 논리 Memory 유지 시 memory_id 동일, 변경마다 **memory_version_id**(previous/supersedes·effective_from/to·change_reason·change_request_id). 기존 Version 덮어쓰기 금지.

## 3. Canonical Memory Item 필수 필드 (§7)
`memory_id·memory_version_id·memory_type_id·memory_category·scope_type·tenant_id·workspace_id·team_id·user_id·subject_entity_type/id·owner_entity_type/id·title·summary·canonical_payload_reference·source_type/id/system/record_id/version·evidence_reference·lineage_id·status·verification_status·trust/confidence/quality_score·freshness_status·valid_from/to·review_at·expires_at·retention_class·data_classification·consent_id·processing_purpose·legal_basis·usage_policy·automation_eligibility·ai_usage_eligibility·vector_index_eligibility·created/updated/deleted_at·created/updated/deleted_by·deletion_reason·schema_version·metadata`.
- **Payload(§8)**: 구조화 필드 or **Canonical/Semantic/KG/Decision/Outcome Reference** or 비민감 Summary or 암호화 Document Ref. 원천 무분별 복제 금지.

## 4. Subject / Owner / Actor (§9~11)
- **Subject**=Canonical Entity 참조(Customer/Product/Campaign/…Registry 없는 Type 저장 금지). **Owner**(관리/공유/삭제 권한)=User/Team/Workspace/Tenant/System(Subject≠Owner 가능). **Actor**=USER/ADMIN/SERVICE/AUTOMATION/**AI_AGENT**/IMPORT/MIGRATION/SYSTEM_JOB. ★**AI_AGENT 생성 Memory는 자동으로 사용자 확정 사실 아님**(INFERRED).

## 5. Scope Enforcement (§12/§13)
- Scope별 필수: USER(tenant+workspace+user)·TEAM(+team)·WORKSPACE·TENANT·SESSION(session_id)·GLOBAL_REFERENCE(고객식별 없음). **Scope 불명확→BLOCKED_SCOPE_UNRESOLVED(저장 금지)**.
- **Cross-Scope 기본 금지**(§13): USER→TENANT·WORKSPACE→GLOBAL·Tenant A→B·Demo→Prod·Support Session→Long-Term·AI Inference→Org Policy 자동승격 금지(승인+근거 필요).

## 6. Source / Evidence / 유형별 정책 (§14~16)
- Source 필드(§14): source_type/system/record/event/metric_id/version/recommendation/decision/automation_run/model_id/version/actor/timestamp. Evidence(§15)=Canonical Record/Semantic Metric/KG Path/User Confirmation/Approval/Outcome/Audit. 유형별 정책(§16): FACT=검증 Source·INFERENCE=Model Version+Confidence+만료·OUTCOME=예상/실제/Attribution 제한 등.

## 7. Lifecycle: Status / Transition / Freshness / TTL / Supersession (§17~22)
- **Status(§17)**: DRAFT/PENDING_VERIFICATION/VERIFIED/ACTIVE/INFERRED/USER_CONFIRMED/USER_REJECTED/CONFLICTING/STALE/EXPIRED/RESTRICTED/BLOCKED/SUPERSEDED/ARCHIVED/DELETION_PENDING/DELETED/ANONYMIZED(임의 문자열 금지).
- **Transition(§18)**: 각 전이 권한+Audit. INFERRED→USER_CONFIRMED/REJECTED. DELETED→복구 금지(정책 기반만).
- **Verification(§19)**: NOT/SOURCE/CROSS_SOURCE/USER/ADMIN/SYSTEM_VERIFIED/MODEL_INFERRED/CONFLICTED. **Freshness(§20)**: FRESH/AGING/STALE/EXPIRED/UNKNOWN.
- **TTL/Review(§21)**: expires_at≠review_at. AI 추론=짧은 TTL/승인전용·Goal=목표종료·법적보존.
- **Supersession(§22)**: 대체 시 삭제 금지→SUPERSEDED+신규 연결·유효시점 기록·과거 재현 위해 이전 Version 유지.

## 8. Conflict / Duplicate / Identity (§23~28)
- **Conflict(§23/§24)**: Conflict Record(conflict_id·memory_ids·type·severity·resolution_policy·resolved). 유형=VALUE/SCOPE/POLICY/SOURCE/VERSION/TIME/USER_VS_WORKSPACE/USER_VS_TENANT/**INFERENCE_VS_FACT**/OLD_VS_NEW/DUPLICATE.
- **해결 우선순위(§25)**: 법적/보안→Tenant→Workspace→사용자 최신 명시→Canonical SoT→관리자 승인→검증 결과→**AI 추론(최하)**. 코드·문서 동일 적용.
- **Duplicate(§26/§27)**: Unique Key 유형별(Preference=tenant+workspace+user+key+period·Config=tenant+workspace+key+version·Decision=decision_id·AI Inference=Subject+Type+Model Version+Window). 상태 UNIQUE/EXACT/SEMANTIC/VERSION_SUCCESSOR/RELATED/CONFLICTING. **Semantic Duplicate 자동삭제 금지**.
- **Identity(§28)**: Subject 다중 Source=Canonical Entity Resolution 참조. Confidence 낮으면 강제 병합 금지.

## 9. Privacy: Classification / Consent / Purpose / Retention (§29~32)
- **Classification(§29)**: PUBLIC~SECURITY_SECRET. **SECURITY_SECRET=AI Memory 저장 금지**(기본).
- **Consent(§30)**: consent_id/type/version/status·consented/withdrawn_at·purpose·allowed_consumers/scope·retention_limit. **철회 시 즉시 사용제한+삭제/익명화 시작**.
- **Purpose(§31)**: SERVICE/REPORT_PERSONALIZATION·RECOMMENDATION·DECISION_SUPPORT·AUTOMATION_PREVIEW/EXECUTION·SUPPORT·SECURITY·COMPLIANCE·PRODUCT_IMPROVEMENT·ANONYMIZED_BENCHMARK. 목적 외 사용 금지.
- **Retention Class(§32)**: SESSION_ONLY/SHORT/STANDARD/LONG_TERM_USER_CONTROLLED/CONTRACT/LEGAL_HOLD/AUDIT/DELETE_ON_WITHDRAWAL/ANONYMIZE_ON_EXPIRY(실 기간=법무 연결).

## 10. Deletion / Correction / Anonymization (§33~36) — ★DSAR 편입
- **Deletion 상태(§33)**: REQUESTED→VALIDATING_SCOPE→PRIMARY_DELETED→CACHE_PURGED→VECTOR_PURGED→SEARCH_PURGED→DERIVED_PURGED→AUTOMATION_USAGE_DISABLED→BACKUP_SUPPRESSION→COMPLETED.
- **전파 대상(§34)**: Primary/Document/Vector/Search/Cache/**KG Projection**/Derived Summary/AI Context Cache/Recommendation Cache/Automation Eligibility/MV/Export Snapshot/Backup Suppression List. ★**04-A DSAR GAP(ai_analyses/ai_generate_log/business_profile/rule_engine) 반드시 Dsar.php erase 편입**.
- **Correction(§35)**: 권한→Source→신규 Version→기존 Superseded→Conflict→Cache 무효화→Vector Reindex→추천/자동화 영향 재평가→Audit.
- **Anonymization(§36)**: 식별자 제거·재식별 위험 검토·Benchmark 가능성·최소 Lineage·익명화 Version. **익명화 데이터 개인 Memory 복원 금지**.

## 11. Store / Vector / Graph Projection (§37~39)
- **Type별**: Canonical Primary Store·Vector/Graph/Search/Cache/Event 여부·Rebuild Source·Deletion Propagation·Projection Lag SLO.
- **Vector Schema(§38)**: metadata=memory_id/version/type/tenant/workspace/user/scope/subject/status/valid_from/to/expires/classification/consent_status/ai_usage_eligibility/embedding_model_version/source_reference. **민감 원문 그대로 Embedding 금지**·부재 시 신설(격리 필수).
- **Graph Projection(§39)**: Memory↔User/Workspace/Goal/Metric/Campaign/Recommendation/Decision/AutomationRun/Outcome/Problem(관계탐색용·Payload 원천 아님·KG 기존 graph_node/edge 확장).

## 12. AI / Automation Eligibility / Retrieval Filter (§40~43)
- **AI Use(§40)**: AI_ALLOWED/WITH_MASKING/SUMMARY_ONLY/RESTRICTED/BLOCKED/USER_CONFIRMATION_REQUIRED. **기본 차단**: DELETED/EXPIRED/BLOCKED/RESTRICTED/동의없음/Scope 불명확/Secret/Conflict 미해결/낮은 Confidence 고위험 추론.
- **Automation(§41)**: ALLOWED/PREVIEW_ONLY/APPROVAL_REQUIRED/BLOCKED. **INFERENCE/STALE/CONFLICTING=기본 Preview/차단**.
- **Retrieval Filter(§43)**: 모든 조회 강제=tenant/workspace/user(또는 승인 조직 Scope)/purpose/consumer/status/valid time/expiry/consent/classification/permission/AI·Automation Eligibility.

## 13. 기존 Store 분류 (§45 — Classification Matrix)

| Store | Canonical Role | Migration | Status |
|---|---|---|---|
| tenant_business_profile | CANONICAL_PRIMARY(Config/Goal) | DSAR 편입 | MIGRATION_REQUIRED |
| tenant_kv | CANONICAL_PRIMARY(Config) | 키 화이트리스트 확장 | VALIDATED_LEGACY |
| rule_engine | CANONICAL_PRIMARY(Config 정책) | DSAR 편입 | VALIDATED_LEGACY |
| channel_learned_prior/journey_decision_arm | CANONICAL_PRIMARY(Learning) | — | VALIDATED_LEGACY |
| action_request | CANONICAL_PRIMARY(Decision) | **tenant NULL 정정** | MIGRATION_REQUIRED |
| journey_enrollments | CANONICAL_PRIMARY(Execution) | — | VALIDATED_LEGACY(DSAR 有) |
| ai_analyses/ai_generate_log | CANONICAL_PRIMARY(Context/Inference) | **tenant 'unknown' 정정+DSAR 편입** | MIGRATION_REQUIRED |
| crm_*/ai_settings | KEEP_SEPARATE_WITH_REASON | — | (SoT/Secret) |
| app_setting | BLOCKED_PRIVACY(AI Memory 금지) | — | 전역 |
| (신설) user_settings·conversation·정책 스토어·decision/outcome 원장·vector | CANONICAL_PRIMARY(신규) | 신설 | UNVERIFIED(설계) |

- **Migration(§46)**: Source ID 보존·Scope/Identity/Consent/Classification 검증·Status/Version Mapping·Duplicate/Conflict 검사·TTL·Reindex·Row Count/Checksum·Rollback. **Compatibility(§47)**: 기존 Preference/History/Recommendation/Decision/Conversation API 즉시제거 금지·Adapter 점진.

## 14. Validator / Runtime Guard / Static Lint / Audit (§48~51)
- **Validator(§48)**: 등록 Type·Scope 완전·Subject=Canonical Entity·Owner 유효·Source/Evidence·Status·Consent·민감정보/Secret·TTL·Duplicate·Conflict·Eligibility·Deletion 상태.
- **Runtime Guard(§49)**: Scope 없는 저장·Cross-Tenant Owner·타 User Memory 수정·Secret Payload·Deleted/Expired/Consent 철회 Memory 사용·Blocked AI Context·**INFERRED 고위험 자동화**·미등록 Type 차단.
- **Static Lint(§50)**: Type Registry 우회·Raw Secret 저장·Tenant Filter 없는 Retrieval·Vector Metadata Filter 누락·삭제전파 누락·Expiry/Consent 검사 없는 Consumer·중복 Store Write·Audit 없는 상태변경·Inferred 직접 자동화 사용.
- **Audit(§51)**: CREATE/VERIFY/ACTIVATE/UPDATE/SUPERSEDE/CONFLICT/RESTRICT/EXPIRE/DELETE_REQUEST/DELETE/ANONYMIZE/RETRIEVE/USE_IN_AI/RECOMMENDATION/AUTOMATION/EXPORT.

## 15. Test / Golden Memory Dataset (§52/§53)
- Test: 단위(ID/Scope/Transition/TTL/Conflict/Supersession/Consent/Deletion/Duplicate)·통합(User Setting→Memory·Delete→Cache/Vector 전파·Consent Withdrawal→Block)·**보안(Cross-Tenant/Workspace/타 User/Secret 차단/Vector Namespace 우회)**·회귀(기존 설정/추천/결정/자동화/AI Context/사용자 제어).
- **Golden Memory Dataset**: 명시 선호·Workspace 정책·충돌 선호·AI 추론·확인·오래된·만료·Consent 철회·삭제·Vector 전파·Cross-Tenant 시도·Secret 시도·Problem 재발·Outcome·자동화 Preview/차단(운영 노출 금지).

## 16. §59 완료 보고 수치
Canonical Memory Type 13(MT-*) · Schema 필드 ~50 · Scope 유형 8 · Fact Memory Type 1(+Config/Goal 사실성)·Inference 1(+Summary) · Consent 필요 Type=PREF/FACT(PII)/COMPLIANCE · Sensitive Type=DEC/EXEC/INFER/business_profile · Vector Projection 대상=Summary/Strategy(승인 비민감)·Graph 대상=Decision/Outcome/Problem · Automation Allowed=Config/Execution·Preview=Pref/Goal/Outcome·**Blocked=Feedback/Problem/Compliance/Inference** · Existing Canonical Store 8·Legacy Adapter=tenant_kv/rule_engine/journey·**Migration Required 3**(business_profile/action_request/ai_analyses DSAR·tenant 정정)·신설 5(user_settings/conversation/정책/원장/vector) · Duplicate Candidate=정책·결정 파편 · Conflict Policy 11유형 · Schema Validation Rule ~13 · Security Test=Cross-Tenant/Secret 차단 사양(구현 후) · Deletion Propagation Test=DSAR 편입 사양 · 문서=본 마스터+ADR+PM · 남은리스크=DSAR 편입·레거시 tenant 정정·Secret 암호화·Vector 격리 · **EPIC04-C(Ingestion·Retrieval·Context Assembly·Usage Enforcement) 준비 완료**. 코드변경 0.
