# EPIC 04-C — AI Memory Ingestion, Retrieval, Context Assembly & Usage Enforcement (정식 마스터)

> **근거**: 04-A(Inventory)·04-B [`CANONICAL_AI_MEMORY_SCHEMA.md`](CANONICAL_AI_MEMORY_SCHEMA.md)(Schema·Eligibility) + 기존 ClaudeAI 문맥 경로. **비파괴**: Pipeline·Service·Gate·통합계획 설계만. 코드변경 0. 모든 대화 장기저장·전체 Embedding·Legacy 즉시삭제·Inference 자동 Fact 승격·Memory 기반 자동화 없음(§57).
> **§58 통합**: 40개 파편 대신 본 마스터가 Ingestion Architecture/Contract/Pipeline·Candidate·Idempotency·Duplicate/Conflict·PII/Secret Filter·Normalization·Projection·Retrieval Architecture/Contract/Purpose·Structured/Vector/Graph/Hybrid·Ranking·Context Assembly/Budget/Compression/Labeling·Prompt Injection/Poisoning Defense·AI/Recommendation/Decision/Automation Gate·User Control 전파·Cache/Index Reconciliation·Observability·Existing Context 통합을 통합. ADR=[`../architecture/ADR_AI_MEMORY_INGESTION_RETRIEVAL.md`](../architecture/ADR_AI_MEMORY_INGESTION_RETRIEVAL.md).

---

## 0. ★정직 프레이밍
**AI Memory Engine 미구현**. 실 운영 챗봇=ClaudeAI **stateless**(history 클라 전송·HIST_MAX 캡·tool_use 재주입 차단 ClaudeAI:878)·GeniegoKnowledge 정적 grounding·벡터 부재. 본 04-C는 Ingestion/Retrieval/Context/Enforcement를 **기존 ClaudeAI 문맥 빌더 확장으로 설계**하되 구현=**PLANNED**(04-A Critical Risk 해소·04-B 신설 Store 선결). 허구 실행 보고 금지(§3.2).

## 1. Ingestion Source Matrix (§4/§59)

| Source | Allowed Memory Types | Scope | Consent | Validation | Decision 기본 |
|---|---|---|---|---|---|
| User Explicit/Preference | PREF·GOAL·CONFIG | USER/WORKSPACE | 명시 | 설정 이벤트 | ACCEPTED |
| Workspace Config/Tenant Policy | CONFIG | WORKSPACE/TENANT | 승인 | Version | ACCEPTED_NEW_VERSION |
| Approved Recommendation/Decision | DECISION/STRATEGY | WORKSPACE | — | Approval Record | ACCEPTED(승인 후) |
| Automation Execution/Outcome | EXEC/OUTCOME | WORKSPACE | — | 실행 Ref+Metric | ACCEPTED |
| Feedback | FEEDBACK | USER/WORKSPACE | — | 대상 추천 Ref | ACCEPTED(해석 제한) |
| Canonical Data/Semantic Metric/KG | FACT/SUMMARY | TENANT | — | Reference | 참조(복제 최소) |
| **AI Inference/Summary** | INFER/SUMMARY | 세션→검증 후 | — | Model Version | **ACCEPTED_INFERENCE(FACT 아님)** |
| Support/Import/Migration | 다양 | 승인 | — | 승인 | REQUIRES_APPROVAL |

## 2. Ingestion Pipeline (§5/§6 — 22단계) & Candidate/Decision (§7/§8)
- **Contract(§5)**: ingestion_event_id·request_id·source_*·actor_type/id·tenant/workspace/team/user·subject·candidate_memory_type·payload/evidence_reference·occurred/received_at·consent_reference·processing_purpose·environment·**idempotency_key**.
- **22단계(§6)**: 인증→Source 인증→Schema Validation→Idempotency→**Scope 검증**→Subject/Owner/Actor Resolution→Canonical Entity Resolution→**Consent/Purpose**→Data Classification→**Secret/PII 탐지**→Type Resolution→**Candidate Eligibility**→Source/Evidence/Lineage→Duplicate→Conflict→Freshness/TTL→Trust/Confidence→AI/Automation Eligibility→저장 또는 차단→Projection Event→Audit→Metrics.
- **Candidate Eligibility(§7)**: 장기 가치·과잉저장 여부·Source 검증 가능·중복·기존 Version·PII 최소화·보존 근거·사용자 제어·AI/Automation 필요·**Canonical Reference로 대체 가능**·Working Memory로 충분. → 통과분만 저장.
- **Decision(§8)**: ACCEPTED_NEW/VERSION/INFERENCE·MERGED·DUPLICATE_SKIPPED·CONFLICT_CREATED·SESSION_ONLY·WORKING_MEMORY_ONLY·REQUIRES_USER_CONFIRMATION/ADMIN_APPROVAL·REJECTED_NO_VALUE/SCOPE/CONSENT/PRIVACY/**SECRET**/SOURCE·BLOCKED_SECURITY.

## 3. Idempotency / Duplicate / Conflict / PII·Secret / Normalization (§9~15)
- **Idempotency(§9)**: tenant+source_type/system/record/version+candidate_type+subject+event_id(동일 이벤트 재수신 중복 Version 방지).
- **Duplicate(§10)**: 동일 Source Record/Memory Key/Subject·Type·Value/의미 동일 Preference/Decision/Outcome/Problem/Inference/Summary/Vector Chunk → 기존 Memory 연결.
- **Conflict(§11)**: Preference Key 상이값·개인 vs Workspace·최신 vs 과거 Fact·Source 간·**Inference vs Canonical**·Decision vs Strategy·삭제요청 vs 신규·**Consent 철회 후 재수집**.
- **PII/Secret Detection(§13)**: API Key/Token/Password/Private Key/Auth Header/Cookie/카드/계좌/민감 PII/원본 주소·전화·이메일 → Masking/Redaction/Reference. ★**Secret 탐지 시 저장 차단+보안 이벤트**.
- **Normalization(§14)**: Canonical Type/Subject/Scope/Status/Time/Language/Currency/Enum/Source/Evidence/Usage Policy. **Version 처리(§15)**: 기존 변경=신 Version/Supersession(중복 생성 금지).

## 4. Retrieval Service (§17 — 19계층) & Contract (§18)
계층: Auth→Actor Context→**Purpose Resolution**→Scope Resolution→Permission→**Consent**→Retrieval Policy→Query Planning→**Structured Retrieval**→Vector Retrieval→Graph Retrieval→Result Merge→Duplicate Removal→Conflict Handling→Ranking→**Masking**→Context Eligibility→Audit→Response Contract. **UI/AI/Recommendation/Automation의 Primary/Vector/Graph 직접조회 금지**.
- **Contract(§18)**: retrieval_request_id·consumer·purpose·tenant/workspace/team/user·subject_types/ids·memory_types·scope_types·query_text·structured_filters·time_range·max_results·max_context_tokens·min quality/trust/confidence·freshness·include_inferred/conflicting·include_explain. **클라 Scope/권한 불신**.

## 5. Retrieval 목적/Scope/유형별 (§19~24)
- **Purpose Policy(§19/§60)**: USER_ASSISTANCE(개인 선호)·DASHBOARD(표시/정렬)·AI_INSIGHT(검증 Goal/Strategy/Outcome)·RECOMMENDATION(검증 Pref/Strategy/Decision/Feedback)·DECISION_SUPPORT(승인정책/과거결정/성과)·AUTOMATION_PREVIEW/EXECUTION(가장 엄격)·SUPPORT/AUDIT(최소·별도 권한).
- **★Scope Retrieval(§20/§3.6)**: tenant/workspace/user/team/environment 강제 — **검색 쿼리·Vector Metadata Filter·Graph Query·DB·Cache Key 모두 강제**. **검색 후 후처리 필터만으로 보안 보장 금지**.
- **Structured 우선(§21)**: Preference/Config/Goal/Decision/Approval/Consent/Compliance/Problem/Automation Eligibility/Active Strategy=RDB 정확 조회(의미검색으로 권위 설정 조회 금지).
- **Vector(§22)**: 의미 유사(승인 전략설명·과거 유사문제·확인 요약·Outcome 해석)만. **부적합=권한정책/예산한도/Consent/Metric값/Credential/삭제상태/법적제한**. ★벡터 부재→도입 시 격리 필수·현재 Structured/Graph만.
- **Graph(§23)**: KG 관계(Campaign↔Decision/Outcome·Problem↔Past Fix). **Graph 관계만으로 Payload 접근권 자동부여 금지**.
- **Hybrid(§24)**: Scope/Permission Filter→Structured Candidate→Vector/Graph Expansion→Status/Consent/Expiry→Duplicate→Conflict→Ranking→Masking. **Vector 후 Scope Filter 구조 금지**.

## 6. Ranking / Conflict / Stale / Response (§25~29)
- **Ranking(§25/§26)**: 우선순위 1.법적/보안/조직정책→2.최신 사용자 명시→3.Workspace Goal→4.Canonical Fact→5.승인 Decision/Strategy→6.검증 Outcome→7.사용자 확인 Feedback→8.Problem→**9.AI Inference(최하)**. Conflict/Inference/Sensitive Exposure Penalty. **유사도만으로 최상위 선택 금지**.
- **Conflict(§27)**: 권위 Memory만/최신검증/모두 제외+사용자 확인/Context에 충돌 명시/Automation 차단. **충돌 숨기고 임의 선택 금지**.
- **Stale/Expired(§28)**: STALE=경고+낮은 가중치·EXPIRED=제외·Consent Withdrawn=즉시 차단·**Deleted=절대 반환 금지**.

## 7. Context Assembly / Budget / Compression / Labeling (§30~33)
- **순서(§30)**: System/Security Policy→Tenant/Workspace Policy→User Request→Task State→Canonical Facts→Goals/Constraints→승인 Decisions/Strategies→Outcomes/Feedback→Problems/Prevention→**Limited Inferences**→Warnings/Limitations.
- **Budget(§31)**: Max Memory Items/Tokens·Type별/Scope별 한도·Sensitive 한도·**Inference 비율 한도**·Historical 기간·Consumer 비용.
- **Compression(§32)**: Canonical Summary/Structured Facts/Key Decisions/Outcome Stats/Problem-Fix/Timeline. Summary의 Source/Version 추적·**원본 왜곡 검증**.
- **★Labeling(§33)**: 정책/검증된 사실/사용자 선호/과거 결정/분석결과/**AI 추론**/경고/금지조건 명시 구분 → **AI가 추론을 사실로 오인 방지**.

## 8. Prompt Injection / Poisoning / Rate Limit (§34~36)
- **Prompt Injection 방어(§34)**: Content/Instruction 분리·Source Trust·Sanitization·Allowed Tool Policy·High-Risk Instruction 차단·Embedded Secret 탐지·외부 Injection 패턴·Retrieval Content 권한검증·**Model Context Labeling**. ★**기존 선례 재사용**: ClaudeAI:878 tool_use 재주입 차단·text-only 재구성.
- **Poisoning 방어(§35)**: 반복 입력 Preference 조작·외부 채널 허위·Bot/Spam Feedback·위조 Approval·조작 Outcome·비정상 대량 Memory·**Cross-Tenant ID 주입**·악성 문서 Embedding·권한 벗어난 조직정책 입력 탐지.
- **Rate Limit(§36)**: User/Tenant/Workspace/Source/Type/AI Agent/Import/External Channel·폭증 시 자동 차단.

## 9. Usage Gates (§37~42) — Consumer별 차등
- **AI Context Gate(§37)**: AI_ALLOWED·목적/Consumer 허용·Scope·Consent·Status·Freshness·Confidence·Masking·Conflict·Token Budget·Audit.
- **AI 응답 규칙(§38)**: 오래된 정보 경고·**추론은 추론 표시**·충돌 시 단정 금지·근거없는 개인특성 생성 금지·삭제 Memory 암시 금지·**타 Tenant 사례 식별가능 언급 금지**·정정된 이전 정보 사용 금지.
- **Recommendation Gate(§39)**: 최신성·Goal·금지조건·과거 결과·Outcome 인과 한계·Confidence·정책충돌·거절 이력·반복실패. **단일 과거성공 과대일반화 금지**.
- **Decision Support(§40)**: Goal·제약·과거 Decision/Outcome·Metric·사용/제외 Memory 명시.
- **Automation Preview(§41)**→**Execution(§42)**: Memory AUTOMATION_ALLOWED·Source/Evidence·Freshness·Conflict 없음·Consent·Scope·Q/T/C·Goal/Policy·Preview 성공·Approval·Idempotency·**Kill Switch·Audit·Rollback/보상**. ★**INFERRED/STALE/CONFLICTING/EXPIRED/LOW_CONFIDENCE/CONSENT_UNKNOWN=고위험 자동화 금지**(§3.8).

## 10. User Control / Cache / Reconciliation / Observability (§43~48)
- **User Control 전파(§43)**: 정정/삭제/비활성화/동의철회 → Retrieval 즉시 제외·Context Cache 무효화·Vector/Search Index·Graph Projection·Recommendation/Automation Eligibility 재평가·Derived Summary 재생성·Audit. ★**물리삭제 완료 전에도 Retrieval/Context 단계 즉시 차단**(§3.7).
- **Context Cache(§44)**: Key=tenant/workspace/user/consumer/purpose/permission_version/memory_version_set/consent_version/policy_version/model_context_version/environment(타 사용자/Tenant 재사용 금지). 무효화(§45)=수정/Supersession/Conflict/Expiry/Deletion/Consent/Scope/Permission/Goal/Policy 변경.
- **Index Reconciliation(§46)**: Missing/Extra/Stale Vector·Deleted 잔존·Wrong Tenant/Scope Metadata·Expired·Missing Graph Edge·Embedding Version·Cache Drift.
- **Observability(§47)/Audit(§48)**: Ingestion/Accepted/Rejected/Duplicate/Conflict/**Secret Block/Cross-Tenant Block**/Retrieval/Latency/Stale/Low Confidence/Context Token/Cache Hit/**Automation Block**/Deletion Lag/Index Drift. Audit=memory_ids/versions/sources/excluded_reasons/masking/AI_usage/recommendation/automation_run(민감 Payload 복제 금지).

## 11. Existing Context 경로 분류 (§49/§50)

| 경로 | Canonical Role | 비고 |
|---|---|---|
| ClaudeAI Prompt Builder(:162 글로서리·:878 history) | **CANONICAL_CONTEXT_BUILDER**(확장) | tool_use 재주입 차단=Injection 방어 선례 |
| GeniegoKnowledge 정적 grounding | CANONICAL_SOURCE_ADAPTER | 정적 지식(벡터 아님) |
| business_profile/tenant_kv Loader | VALIDATED_LEGACY | Config Memory |
| AutoRecommend Context | CONSOLIDATION_REQUIRED | Memory Gate 편입 |
| Automation Context(AutoCampaign) | VALIDATED_LEGACY | adj_roas·isMarketingSendAllowed 안전장치 |
| (신설) Retrieval Service·Ingestion Pipeline·Vector | UNVERIFIED(설계) | 구현 PLANNED |

**보존(§50)**: 사용자 설정·과거 대화 문맥·Workspace 목표·승인 정책·추천/Decision/Automation 이력·다국어·삭제/정정·관리자 감사. 즉시삭제 금지·Adapter 점진.

## 12. Fallback / Error / Test (§51~55)
- **Fallback(§54)**: Retrieval 장애→Canonical Settings 직접조회/Current Request만/최근 검증 비민감 Snapshot/개인화 없이 응답/Recommendation 제한/**Automation 차단**·경고. 오래된 Context 최신인 척 금지.
- **Error(§55)**: MEMORY_SCOPE_VIOLATION·CONSENT_REQUIRED·MEMORY_DELETED/EXPIRED·**SECRET_DETECTED**·CROSS_TENANT_BLOCKED·CONTEXT_BUDGET_EXCEEDED. Warning: STALE/LOW_CONFIDENCE/CONFLICTING/INFERRED_INCLUDED/CONSENT_EXPIRING.
- **Test/Golden(§51/§52)**: 보안(Cross-Tenant Structured/Vector/Graph·타 User·Prompt Injection·Secret Ingestion·Scope Filter 우회)·AI(Fact vs Inference·Stale Warning·Deleted 미사용·타 Tenant 미노출)·Automation(Inferred/Stale/Consent 철회 차단)·회귀(기존 AI Context/Preference/Recommendation/User Control). Golden 16 시나리오.

## 13. §63 완료 보고 수치
조사 기존 Context/Retrieval 경로 6(ClaudeAI Prompt Builder·GeniegoKnowledge·business_profile/tenant_kv Loader·AutoRecommend·Automation·(신설)) · Ingestion Source 8군 · 수집 Candidate=0(미구현) · Canonical Retrieval 유형 3(Structured 우선·Vector 부재·Graph 미적재) · Context Consumer 6 · AI Usage 승인 0(구현 전)·Recommendation 0·Automation Preview 0·Execution 0 · **Cross-Tenant Block 테스트=사양(01-04B fail-closed 승계·구현 후 실행)** · Prompt Injection 테스트=ClaudeAI:878 선례 有·사양 · Deletion Propagation=DSAR 편입 사양 · Retrieval P95/P99=구현 후 · 기존 Context 비교=Shadow 계획 · 문서=본 마스터+ADR+PM · 남은리스크=AI Memory Engine·Retrieval Service·Vector 구현이 선결·04-A Critical(DSAR/Secret/레거시 tenant) 해소 · **EPIC04-D(Final Validation·Production Certification·Governance·Recurrence Prevention) 준비 완료(단 실 구현 선결)**. 코드변경 0.
