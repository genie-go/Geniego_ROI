# EPIC 04-A — Enterprise AI Memory Inventory, Scope, Privacy & Architecture Baseline (정식 마스터)

> **근거**: EPIC 00~03(Metadata·CE/REL·KG·Semantic·Certification) + 288차 **기억성 저장소 전수조사**(실코드). **비파괴**: Inventory·Scope·Privacy·Architecture Baseline·Risk만. 코드변경 0. 신규 Memory Engine 구축·History 삭제·Vector 도입·AI 장기기억 활성·Memory 기반 자동화 없음(§43/§45).
> **§46 통합**: 29개 파편 대신 본 마스터가 Inventory·Store/Consumer/Type/Scope/Source/Status Registry·Trust/Freshness/Conflict/Priority·Privacy/Consent/Classification·User Control·Lineage·Recommendation/Automation Gate·Vector/Cache Audit·SoT·Storage Options·Architecture Baseline·Risk·Unverified를 통합. ADR=[`../architecture/ADR_AI_MEMORY_BASELINE.md`](../architecture/ADR_AI_MEMORY_BASELINE.md).

---

## 0. 요약 판정
- **벡터/임베딩/문서 스토어 부재 재확인**(grep 0·02-A 일치). 챗봇 **서버 stateless**(history 매 턴 클라 전송)·대화 스레드 테이블 없음. 기억성 자산은 존재하나 **파편화**(정책·결정·선호). AI Memory=SoT 참조 개인화/문맥 계층(§3.7).

## 1. Memory Inventory Matrix (§47)

| Memory 자산 | Type | Scope | Source | Store | 민감도 | 격리 | 삭제(DSAR) | 근거 |
|---|---|---|---|---|---|---|---|---|
| tenant_business_profile | Configuration/Goal | TENANT | USER_APPROVED | RDB | 중(사업자번호) | ✅ | **미대상(GAP)** | DataPlatform:53 |
| tenant_kv(설정/피드백) | Configuration | TENANT | WORKSPACE_CONFIG | RDB KV | 저 | ✅ PK | 부분 | WorkspaceState:28 |
| rule_engine(+daypart/frequency) | Configuration(정책) | TENANT | USER_APPROVED | RDB | 저 | ✅ | 미대상 | RuleEngine:41 |
| channel_learned_prior | Learning | TENANT | OUTCOME_ANALYSIS | RDB | 저 | ✅ | 미대상 | AutoRecommend:185 |
| journey_decision_arm | Learning(밴딧) | TENANT | OUTCOME_ANALYSIS | RDB | 저 | ✅ | 미대상 | JourneyBuilder:73 |
| action_request | Decision/Execution | TENANT(사후·NULL 허용) | DECISION | RDB | 중(페이로드) | ⚠️ 레거시 NULL | 미대상 | Db:589·Alerting:545 |
| journey_enrollments/logs | Execution/Outcome | TENANT | AUTOMATION_EXECUTION | RDB | 중 | ✅ | ✅ DSAR | JourneyBuilder:42 |
| ai_analyses | Context(분석이력) | TENANT(사후·기본 'unknown') | AI_INFERENCE/METRIC | RDB | 중(snapshot) | ⚠️ 레거시 'unknown' | **미대상(GAP)** | ClaudeAI:469 |
| ai_generate_log | Context(prompt+result) | TENANT | AI_INFERENCE | RDB | 중(prompt) | ✅ | **미대상(GAP)** | AiGenerate:59 |
| crm_customers/prefs | (고객 SoT·AI Memory 아님) | TENANT | CANONICAL_DATA | RDB | **高 PII** | ✅ | ✅ DSAR | CRM:48 |
| ai_settings(api_key) | (Provider·Secret) | TENANT | CONFIG | RDB | **SECRET** | ✅ | — | Db:372 |
| app_setting | (전역 시스템·AI Memory 금지) | GLOBAL | SYSTEM | RDB | Secret 포함 | ❌ 미격리 | — | Db:315 |
| audit_log 외 7 | Audit | TENANT | AUDIT_LOG | RDB | 중 | 대부분 ✅ | — | Db:540 |

## 2. Memory Consumer Matrix (§48) & Store Matrix (§49)
- **Consumer**: ClaudeAI 챗봇(Context·stateless)·AutoRecommend(learned_prior)·JourneyBuilder(bandit arm)·Alerting(action_request)·AdAdapters/AutoCampaign(business_profile)·RuleEngine(정책). 각 목적·Scope·Freshness.
- **Store**: RDB(SQLite/MySQL)만. **Vector/Document Store 부재**. Cache=tenant 격리 있으나 memory_version/scope 키 없음. 삭제전파=Primary만(Cache/파생 미전파).

## 3. Memory Type / Scope / Source / Status Registry (§5~8)
- **Type(14)**: Session·Working·Preference·Configuration·Goal·Decision·Execution·Outcome·Strategy·Learning Feedback·Problem·Compliance·**Inferred**·Shared Organizational. 매핑: business_profile=Config/Goal·rule_engine=Config·learned_prior/arm=Learning·action_request=Decision·journey=Execution/Outcome·ai_analyses/generate_log=Context(Inferred 주의).
- **Scope(§6)**: SESSION/USER/TEAM/WORKSPACE/TENANT/SYSTEM_INTERNAL/GLOBAL_REFERENCE/ANONYMIZED_BENCHMARK. **GLOBAL/BENCHMARK=고객식별 분리**(channel_benchmark=전역·비식별).
- **Source(§7)**: USER_EXPLICIT/APPROVED·ADMIN·WORKSPACE_CONFIG·CANONICAL_DATA·SEMANTIC_METRIC·KNOWLEDGE_GRAPH·RECOMMENDATION·DECISION·AUTOMATION·OUTCOME·AUDIT·**AI_INFERENCE**·EXTERNAL·IMPORT·MIGRATION. Source별 신뢰/제한 차등.
- **Status(§8)**: ACTIVE/PENDING/VERIFIED/**INFERRED**/USER_CONFIRMED/REJECTED/CONFLICTING/STALE/EXPIRED/RESTRICTED/BLOCKED/DELETED/ANONYMIZED/ARCHIVED/SUPERSEDED. 삭제≠비활성 구분.

## 4. Trust / Freshness / Conflict / Priority (§9~12)
- **Trust**: Source Reliability·Verification·Freshness·User Confirmation·Cross-Source·Model Version. Quality/Trust/Confidence Score. **점수만으로 FACT 승격 금지**.
- **Freshness/TTL(§10)**: 언어선호 장기·예산한도 자주재검토·Goal 목표기간·성공패턴 감쇠·채널상태 최신동기화·**AI 추론 짧은 TTL/승인전용**. 오래된 기억 최신 사실화 금지.
- **Conflict(§11)**: RESOLVED_BY_USER/POLICY·LATEST_VERIFIED_WINS·HIGHER_AUTHORITY_WINS·SOURCE_OF_TRUTH_WINS·MANUAL_REVIEW·KEEP_BOTH.
- **Priority(§12)**: 1.법적/보안/처리제한→2.Tenant/Workspace 정책→3.사용자 최신 명시→4.Canonical SoT→5.승인 결정→6.검증 성과→7.Semantic Metric→8.KG→9.검증 추천→10.**AI 추론(최하)**.

## 5. Privacy / Consent / Classification / User Control (§13~16)
- **비기억 대상(§13)**: Secret/Token/Password/원본 PII/대화 전문/근거없는 추측/Raw Payload/타 Tenant/보존근거 없는 로그. **Secret은 Secret Reference ID만**(§3.3).
- **분류(§14)**: PUBLIC~SECURITY_SECRET. 분류별 저장/암호화/Masking/권한/AI Context/Export/보존/삭제/Audit.
- **Consent(§15)**: 유형별 명시동의·필수/선택·철회가능·동의 Version/시각·목적·공유범위·보존. 법적 판단=별도 검토 표시.
- **User Control(§16)**: 조회·출처확인·사용된 추천확인·정정·삭제·비활성·유형별 저장거부·AI 개인화 중지·개인/조직 구분·Export·처리제한·동의철회.

## 6. Lineage / Recommendation / Automation Gate (§17~20)
- **Lineage(§17)**: Source→Validation→CE/Metric→Memory 생성→사용→Recommendation/Decision→Automation→Outcome→Feedback(각 ID/Version).
- **Recommendation(§18)**: 사용 Memory ID/유형/상태/최신성/신뢰도/영향·제외 기억. "과거 성공"으로 최신 데이터 무시 금지.
- **Automation Gate(§20)**: Memory VERIFIED/승인·최신성·정책 미충돌·자동실행 허용 유형·Lineage·Kill Switch·Audit·삭제/철회 반영. ★**INFERRED만으로 고위험 자동화 금지**(§41).

## 7. Vector / Cache Audit (§28/§29)
- **Vector=부재**(Critical Risk 0 현재). ★신설 시 **tenant_id 파티션·행수준 필터·Scope Filter 없는 Vector Search=Critical**·Deletion Propagation·Embedding Version·PII Masking·Demo/Prod 분리·Cross-Tenant Retrieval 테스트 필수.
- **Cache**: Memory Cache Key에 tenant/workspace/user/memory_scope/memory_type/permission_version/memory_version/environment 포함(현 미존재→신설). 개인 Memory를 Tenant 공용 Cache 저장 금지.

## 8. Source of Truth & Storage Options (§30/§31)
- **SoT**: 언어선호=User Settings(신설)·Workspace 목표=business_profile·Metric=Semantic Layer·관계=KG·승인=Decision/Audit·자동화=journey/action_request·결과=Analytics·AI 요약=Derived Memory. **동일 사실 복수 SoT 금지**.
- **저장 옵션**: RDB(구조/감사/삭제 중요)·Document(가변 요약)·**Vector(승인 비민감 의미검색·신설 시 격리 필수)**·KG(관계기억)·Event(결정/실행 이력)·Cache(단기 Working). **하나의 거대 Store 금지**·유형별 최적.

## 9. Architecture Baseline (§32 — Extend, not Replace)
논리 계층(18): Ingestion→Source Validation→Scope Resolution→Consent/Policy→Data Classification→**Canonical Reference Resolution**→Memory Classification→Conflict Detection→Freshness/TTL→Trust/Confidence→**Store Adapter**→Retrieval Policy→Context Builder→Usage Audit→Update/Correction→**Deletion Propagation**→Monitoring→Governance.
- **재사용(신설 금지)**: tenant_business_profile·tenant_kv·rule_engine·channel_learned_prior·journey_decision_arm·ai_analyses·crm_*(read-only)·ai_settings.
- **신설 정당(부재)**: ①대화/스레드 메모리(서버 stateless)②사용자 선호 테이블(user_settings 부재)③통합 정책 스토어(KPI우선순위/예산한도/금지채널 파편)④통합 decision/outcome 원장(action_request/journey/ad_execution_log 분산)⑤Vector Store(도입 시 격리 필수·보류).
- **Retrieval(§33/§34)**: 목적별(USER_ASSISTANCE~COMPLIANCE) 허용 유형/Scope/최신성/민감도 차등. **최소 Subset만**(전체 Memory AI Context 금지). **Explainable(§35)**: 사용 기억·출처·생성시점·관련성·신뢰도·영향·제외방법.

## 10. Deletion Propagation (§36) — ★DSAR GAP
- 삭제 시 Primary+Cache+Vector+Search+Derived Summary+Recommendation Context+Automation Eligibility+AI Context Cache+MV+Backup(복원 시 재삭제) 전파.
- ★**확정 GAP**: `ai_analyses`(question/data_snapshot)·`ai_generate_log`(prompt/result)·`tenant_business_profile`·`rule_engine`·`learned_prior`가 **DSAR export/erase 경로 부재**(Dsar.php). **신설 AI Memory Engine은 DSAR erase 편입 필수**(고객 PII 유입 시 DSAR 불완전).

## 11. Risk Register (§40)
| 위험 | 등급 | 조치 |
|---|---|---|
| Vector Search Scope 누락(신설 시) | CRITICAL | 도입 전 tenant 파티션·행필터 강제 |
| Secret AI Memory 혼입(ai_settings.api_key 평문 UNVERIFIED) | CRITICAL | Secret Reference만·암호화 검증 |
| ai_analyses/action_request 레거시 tenant 'unknown'/NULL | CRITICAL | 크로스테넌트 잔존·정정 필요(비파괴 격리) |
| **ai_analyses/ai_generate_log DSAR 삭제경로 누락** | CRITICAL | DSAR erase 편입 |
| app_setting 전역을 AI Memory 재사용 | HIGH | 금지(WorkspaceState 경고 준수) |
| AI 추론 FACT 승격 | HIGH | INFERRED 유지·승인 전 사용제한 |
| 정책/결정 파편화 | MEDIUM | 통합 스토어 신설 계획 |
| 대화 스레드 stateless(장기 개인화 부재) | MEDIUM | 대화 메모리 신설(동의·삭제 편입) |

**Security Risk 0(현재)·Cross-Tenant Risk 2(레거시 행)·Vector Risk 0(부재)·DSAR GAP 3·Secret 노출 위험 1(미검증).**

## 12. §51 완료 보고 수치
Memory Store 조사 ~13(RDB) · Memory Service ~7(ClaudeAI/AutoRecommend/JourneyBuilder/Alerting/RuleEngine/AiGenerate/DataPlatform) · Memory Type 14 · Consumer 6군 · USER Scope=선호(신설 대상)·WORKSPACE=tenant_kv·**TENANT Scope 다수**·SYSTEM/GLOBAL=app_setting/benchmark · Sensitive Memory=business_profile/ai_analyses/action_request/crm(PII) · **Consent 불명확=AI 대화/생성 로그**(동의 미정의) · Duplicate Candidate=정책 파편(rule_engine+guardrails+channel_kpi_config)·결정 파편(action_request/journey/ad_execution_log) · Conflict=개인/조직 Scope 미분리 · Stale/Expired=TTL 미정의 · **Cross-Tenant Risk 2**(ai_analyses/action_request 레거시) · **Vector Store Risk 0**(부재) · **Deletion Propagation Risk 3**(DSAR GAP) · Automation Block 대상=INFERRED/action_request NULL · 문서=본 마스터+ADR+PM · 남은리스크=Secret 암호화 미검증·DSAR 편입·통합 스토어 설계 · **EPIC04-B(Canonical AI Memory Schema·Identity·Scope·Lifecycle Governance) 준비 완료**. 코드변경 0.
