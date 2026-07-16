# EPIC 04-D Part 3 — AI Memory Enterprise Certification, Governance, Sign-off & Permanent Recurrence Prevention (정식 마스터)

> **근거**: Part 1(Final Audit)·Part 2(Cutover/DR) + 04-A/B/C + 기존 거버넌스(docs/registry·`CHANGE_GATE.md`·`CONSTITUTION.md`·`RepeatedDefectHistory.md`). **비파괴**: 인증·거버넌스·재발방지·Sign-off만. 코드변경 0.
> **§54 통합**: ~44개 파편 대신 본 마스터가 Certification Policy/Registry/Levels/Approval·Sign-off·Version Lock·Change/New Type/Source/Retrieval/Consumer Gate·Usage Expansion·Duplicate/Regression Gate·CI/Release Gate·Suspension/Recert·Legacy/Migration Gate·History/Agent/Repeat Problem·Root Cause·Drift·Health·Dashboard·Doc/PM/Evidence Governance·최종 패키지를 통합. ADR=[`../architecture/ADR_AI_MEMORY_ENTERPRISE_CERTIFICATION.md`](../architecture/ADR_AI_MEMORY_ENTERPRISE_CERTIFICATION.md).
> **중복금지 배선**: 병렬 거버넌스 신설 금지 → 기존 `docs/registry/`(DuplicatePreventionLog·RepeatedDefectHistory·RootCauseAnalysis·DecisionLog·PMApprovalHistory)·`CHANGE_GATE.md`·`PM_CHANGE_HISTORY.md`에 AI Memory Governance 편입.

---

## 0. ★정직 프레이밍 (인증 정점)
Part 1/2: **AI Memory Engine 미구현**. 따라서:
- **어떤 Memory Type/Store/Consumer도 ENTERPRISE_CERTIFIED(Level 6) 불가**. 기존 저장소 최대 **Level 1(SCHEMA, 문서)** 또는 **Level 2 부분**(실존). ai_analyses/business_profile=**BLOCKED_PRIVACY**(DSAR GAP). Golden/Shadow/Canary 미실행이라 Level 3+ 불가.
- **EPIC 04 = AI Memory Governance Framework 완성으로 Sign-off**. **Production AI Memory=BLOCKED_PENDING_IMPLEMENTATION**.
- 실질 가치 = **Version Lock·Change/New Gate·재발방지·영구 Claude Code 규칙**(즉시 유효·기존 코드에도 적용).

## 1. Certification Registry Matrix (§55 — 정직 수준)

| Cert ID | Target | Level | Status | Privacy | 비고 |
|---|---|---|---|---|---|
| CERT-MEMSTORE-000001 | tenant_business_profile | L2 부분 | **BLOCKED_PRIVACY** | DSAR GAP | 실존이나 삭제경로 부재 |
| CERT-MEMSTORE-000002 | ai_analyses | L2 부분 | **BLOCKED_PRIVACY·BLOCKED_SCOPE** | DSAR GAP·'unknown' | — |
| CERT-MEMSTORE-000003 | tenant_kv/rule_engine/learned_prior/journey | L2 | CONDITIONALLY_CERTIFIED | tenant 격리 ✅ | 삭제경로 부분 |
| CERT-MEMTYPE-* | 13 Type | L1 | NOT_CERTIFIED(설계) | — | Engine 미구현 |
| CERT-RETRIEVAL/CONTEXT-* | Retrieval/Context | L1 | NOT_CERTIFIED | — | 미구현 |
| CERT-AI/REC/AUT-* | Consumer | L1 | NOT_CERTIFIED | — | 미구현 |
| CERT-RELEASE-000001 | EPIC04 Governance Framework | — | **FRAMEWORK_SIGNED_OFF** | — | 거버넌스만 |

**Enterprise Certified 0 · Production Certified 0 · Conditionally Certified(L2) 4.**

## 2. Certification Level / Status / 승인체계 (§7~11)
- L0 DOCUMENTED→L1 SCHEMA→L2 IMPLEMENTATION→L3 SECURITY&PRIVACY→L4 REGRESSION&RESILIENCE→L5 PRODUCTION→**L6 ENTERPRISE_CERTIFIED**. 자동실행 최소레벨=L6+AUTOMATION_ALLOWED. 현 최고=**L2 부분**.
- **승인체계(§10/§11)**: Architecture/Data/Privacy/Security/QA/AI·Model/PM/Automation Risk/Operations 관점을 Claude Code 증거 제시→**PM(사용자) 최종 Sign-off**. 형식 단독승인 금지.

## 3. 최종 Sign-off Gate (§12) — 현 판정
| 게이트 | 상태 |
|---|---|
| Canonical Schema/Scope/Consent 실구현 | ✗(Engine 미구현) |
| Privacy/Deletion/User Control 통과 | ✗(DSAR GAP) |
| Golden/Historical Regression/Shadow/Canary | ✗ 미실행 |
| Cross-Tenant/Cross-User/Deleted Retrieval 0 | 설계·미테스트 |
→ **Enterprise Certification 미부여**(정직). 거버넌스 프레임워크만 Sign-off.

## 4. Schema·Policy·Version Lock (§13)
- Lock 대상: Memory Type ID·Schema Version·Scope Policy·Consent/Purpose/Retention·**Fact·Inference 승격 정책**·Retrieval/Ranking Policy·Context Builder Version·Vector Metadata/Graph Schema·Cache Key·AI/Automation Eligibility·Kill Switch 정책. **현 Lock 후보**: L2 실존 저장소(business_profile/tenant_kv/rule_engine/learned_prior)를 Version Lock 등재(변경 시 Change Request 강제).

## 5. Change Governance (§14~16) — CHANGE_GATE 편입
- **Change Request** 필수(대상·현/제안 Version·Privacy/Consent/Deletion/Fact·Inference/AI/Automation 영향·Migration/Reindex/Cache Purge/Rollback/테스트/승인). **분류**: PATCH·MINOR·**MAJOR(의미/Scope/Consent/Retention/Deletion/Fact 승격기준/SoT/Retrieval/Vector Metadata/Context/Automation Eligibility=신 Version)**. **Emergency**(Cross-Tenant/Cross-User/PII·Secret/삭제실패/Consent 미반영/Injection/Poisoning/잘못된 고위험 Automation/데이터손실)=Change ID+Incident ID+Kill Switch+사후 ADR+재인증. → 기존 CHANGE_GATE.md/DecisionLog 편입.

## 6. New Type/Source/Retrieval/Consumer + Usage Expansion Gate (§17~22)
- **New Memory Type**(§17): Registry 검색→기존 Type 확장→Alias→SoT 표현 가능→장기 필요→Session/Working 충분→Scope/Subject/Owner/Actor→Consent/Purpose/Classification/Retention/Deletion→Fact·Inference→AI/Automation→Golden→ADR→PM. 하나 불충분=생성 금지.
- **New Source/Retrieval/Consumer**(§18~20): 인증·Scope Mapping·Consent·PII/Secret Filter·Idempotency·**Canonical Retrieval Service 우회 금지**·Fact·Inference Label·Golden·Owner.
- **Usage Expansion(§21/§22)**: AI/Recommendation/Automation Memory 사용 확대 전 기존 결과·Golden·Shadow·Canary·Privacy·User Control·Drift·Rollback. 고위험 Automation=AUTOMATION_ALLOWED·Fact 중심·Inference 의존제한·Preview·Approval·Kill Switch·보상·제한 Canary·재인증.

## 7. 중복/기능후퇴 방지 & CI/Release Gate (§23~32)
- **중복 방지(§23)**·**기능 후퇴 Gate(§25)**: Registry 외 Type/비공식 Store/Context Store·중복 Preference/History/Vector/Retrieval/Context Builder/Consent Check/Deletion Workflow/Scope Resolver·직접 Store 조회·Inference의 Fact 승격·User Control/Consent/삭제/Fact·Inference Label/Scope Filter/Kill Switch/Fallback/Test 감소 → 탐지·Merge 차단.
- **CI Merge Gate(§29)**: Memory Registry/Schema Validation·Duplicate Store/Context Scan·Direct Store Access Scan·Scope/Consent/Privacy/Secret Filter/Fact·Inference/Deletion Propagation/Golden/Prompt Injection/Poisoning/Automation Gate/Regression Test·PM Change Entry·**Repeat Problem Reference Check**. ★**현실**: CI 시크릿 미등록 inert+Memory Lint 미구현 → **PLANNED**(deploy.yml 확장·중복 워크플로 금지).
- **Release Gate(§31)**+**Post-Release Audit(§32)**: Merge Gate·Certification·Flag·Shadow/Canary·User Control/Consent/Deletion 준비·Kill Switch·Rollback·**Privacy Alert**·PM Sign-off / Release 후 실 Version·Scope Filter·Consent·삭제상태·Fact·Inference·Privacy SLO 검증.

## 8. Suspension / 재인증 / 정기검토 / Legacy / Migration (§33~39)
- **Suspension/Revocation(§33)**: Scope/Consent Drift·Deletion 실패·Secret·Cross-Tenant/User·Fact·Inference 혼용·Golden 실패·Injection/Poisoning 취약·Privacy SLO 위반·Automation 오실행·Evidence 손상·**반복 재발**.
- **재인증(§34)**: Schema MAJOR·Scope/Consent/Retention/Deletion/Fact 승격기준/Source/Ingestion/Retrieval/Embedding/Vector/Graph/Context/AI Model/Recommendation/Automation/Cache/User Control/Backup 변경.
- **정기검토(§35)/만료(§36)**: 위험등급별(민감 PII/Consent 의존/Decision/Automation/Billing 짧게). 만료 인증 고위험 실행 금지.
- **Legacy(§37/§38)/Migration(§39)**: 제거 전 모든 Consumer 전환·**User Control/Consent/Deletion 재현**·Rollback·Backup·Removal/Regression Test. **현 Legacy 제거 금지**(Engine 미구현·Fallback 필수).

## 9. 재발방지 & 이력 (§40~44) — 기존 Registry 편입
- **History 영구보존(§40)**: Memory Type/Schema/Scope/Consent/Deletion/Fact·Inference Policy/Certification/Suspension/Incident/Privacy Incident/Rollback/Recovery/Legacy History·Evidence·ADR·PM. 삭제/덮어쓰기 금지.
- **Agent Execution History(§41)**: 본 288차 AI Memory EPIC 작업 = PM_CHANGE_HISTORY+본 문서 기록.
- **Repeat Problem(§42)/Root Cause(§43)/Recurrence Test(§44)**: → 기존 `docs/registry/RepeatedDefectHistory.md`·`RootCauseAnalysis.md` 편입. ★**등재 대상(288차 AI Memory 확정 결함)**: **DSAR 삭제경로 누락(Root=Deletion Orchestrator 부재·신규 저장소 DSAR 미편입 관행)**·**크로스테넌트 레거시 tenant 'unknown'/NULL(Root=사후 tenant_id 추가·기본값 오설정)**. 재발 방지 테스트=구현 시 Deletion Propagation/Scope Test 연결.

## 10. Drift / Health / Dashboard / Doc·PM·Evidence Governance (§45~52)
- **Drift 상시탐지(§45)**: Schema/Type/Scope/Consent/Retention/Deletion/Status/Version/Store/Vector/Graph/Search/Cache/Context/Fact·Inference/Consumer/Recommendation/Automation/User Control/Doc Drift → 인증 재평가.
- **Registry Health(§46)·Governance Dashboard(§47)·Alert(§48)**: Certified·Level 분포·Expiring·Drift·Deprecated·Legacy·Blocker·Repeat Problem·Incident/Privacy Incident·SLO/Privacy SLO·PM 승인대기. Critical=점수 무관 차단.
- **Doc/PM/ADR/Evidence Governance(§49~52)**: 문서 실코드 일치·중복 통합·PM(§50)·ADR(§51 MAJOR 필수)·Evidence 보존(§52).

## 11. EPIC 04 최종 Certification Package (§53) — 구성 확인
AI Memory Inventory(04-A)·Architecture Baseline(04-A)·Canonical Schema(04-B)·Type Registry(04-B)·Scope/Consent/Retention/Deletion Policy(04-B)·Ingestion Pipeline(04-C)·Retrieval Service(04-C)·Context Assembly(04-C)·User Control/AI/Recommendation/Decision/Automation Gate(04-C)·Final Audit(P1)·Drift Audit(P1)·Golden/Regression 사양(P1)·Injection/Poisoning 사양(P1)·Shadow/Canary/Cutover/Rollback/Kill Switch/DR 프레임워크(P2)·Certification Matrix(P3)·Governance/CI/Release Gate(P3)·Legacy Plan(P3)·Recurrence Prevention(P3)·ADR(9+)·PM History·**Sign-off(프레임워크)**. → **전 구성요소 문서 존재·비파괴·코드변경 0.**

## 12. 영구 규칙 (§61/§62) — CLAUDE.md/CONSTITUTION 배선 대상
**신규 장기 Memory Type/Store/Ingestion Source/Vector Index·Embedding/Graph Memory/Retrieval 정책/Context Builder/AI 개인화 확대/Recommendation·Decision·Automation Memory 확대/Scope·Consent·Retention·Deletion 정책/User Control/Legacy 제거/Migration 전 → AI Memory Governance 통과 필수**. **모든 Claude Code 에이전트 AI Memory 작업 시작 전 §62 16개 Registry 조회**(Metadata·CE·REL·KG·Semantic·Memory Type·Store·Ingestion Source·Retrieval Policy·Consumer·Consent/Retention/Deletion·Certification·Repeat Problem·ADR·PM·Agent Execution History). 조회 없이 동일기능 재구현·Certified 단순화/교체/삭제·Legacy+Canonical 동시 장기 Write 금지. → docs/registry/README SSOT 매핑에 편입.

## 13. §59 완료 보고 수치
전체 인증 대상=Memory Type 13+Store 13+Consumer 6 · L1(설계) 다수 · **L2 부분 4**(business_profile/ai_analyses/tenant_kv/rule_engine 실존) · L3~L5 0 · **Enterprise Certified 0** · Conditionally Certified 4 · Suspended 0·Revoked 0 · Locked Schema/Policy 후보 4 · 신규 Type/Source/Retrieval Gate=정의(차단 도구 PLANNED) · Duplicate Store 탐지=정책 파편 2 · Function Regression Gate=정의(CI PLANNED) · **Open Repeat Problem 2**(DSAR 삭제경로 누락·크로스테넌트 레거시 tenant→RepeatedDefectHistory 편입) · Recurrence Test=구현 종속 · Legacy Deprecation 대상=현 제거 금지(Engine 미구현) · CI Gate=inert/PLANNED · Release Gate=정의 · 문서=본 마스터+ADR+PM · ★**EPIC04 Sign-off=AI Memory Governance Framework SIGNED_OFF·Production AI Memory BLOCKED_PENDING_IMPLEMENTATION** · 다음 권장 EPIC05-A(Customer & Unified Profile). 코드변경 0.

## 14. ★EPIC 04 최종 Sign-off 판정 (정직)
- **SIGNED_OFF**: AI Memory Inventory·Architecture Baseline·Canonical Schema·Type Registry·Scope/Consent/Retention/Deletion Policy·Ingestion/Retrieval/Context 설계·User Control/AI/Automation Gate·Final Audit·Drift·Rollback/DR 프레임워크·Certification 체계·Version Lock·Change/New Gate·재발방지·영구 규칙 = **문서·거버넌스 완성**.
- **BLOCKED(미완)**: AI Memory Engine 실 구현·Golden/Regression 실행·Shadow/Canary/Cutover·CI Lint 배선·**DSAR 삭제경로 편입**·크로스테넌트 레거시 정정·Secret 암호화 검증·Vector Store. → **실 Production AI Memory는 후속 구현 EPIC(승인 시)로 이관**.
- **결론**: EPIC 04는 **"Enterprise AI Memory Governance Framework" 수준에서 완결**(무후퇴·비파괴·코드변경 0). ★**핵심 잔여 결함=DSAR 삭제경로 누락·크로스테넌트 레거시·Secret 평문**은 AI Memory 구현과 별개로도 **실코드 백로그**로 유효(자격증명 등록·구현 시 우선 처리).
