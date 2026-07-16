# EPIC 04-D Part 2 — AI Memory Production Readiness, Canary, Cutover, Rollback & DR (정식 마스터)

> **근거**: Part 1 [`AI_MEMORY_FINAL_AUDIT_REPORT.md`](AI_MEMORY_FINAL_AUDIT_REPORT.md)(Blocker) + GeniegoROI 실 인프라. **비파괴**: 전환 프레임워크·Runbook·정책만. 코드변경 0. 전체 Memory 일괄활성·Legacy 삭제·Rollback 없는 전환 없음(§65).
> **§66 통합**: ~53개 파편 대신 본 마스터가 Readiness Matrix·Risk·Feature Flag/Version Routing·Ingestion/Retrieval/Context Shadow·Canary·Limited Production·Vector/Graph/Search/Cache Cutover·User Control/Consent/Deletion 운영검증·AI/Recommendation/Automation Cutover·Kill Switch·Rollback·Compensating·Monitoring/SLO/Privacy SLO/Error Budget·Incident/Privacy Incident·DR·RPO/RTO·Backup·안정화·Legacy를 통합. ADR=[`../architecture/ADR_AI_MEMORY_PRODUCTION_CUTOVER.md`](../architecture/ADR_AI_MEMORY_PRODUCTION_CUTOVER.md).

---

## 0. ★정직 프레이밍
Part 1: **AI Memory Engine 미구현** → 운영 전환할 대상 없음. 본 Part 2 = (a)전환 프레임워크 실 인프라 매핑 설계, (b)전 항목 `AUDIT_COMPLETE`/`BLOCKED_PENDING_IMPLEMENTATION`(**Production Active 0·Shadow/Canary 통과 0**). 허구 전환 보고 금지(§3.7 등).

## 1. GeniegoROI 실 인프라 매핑
| Part2 개념 | 실체 | 갭 |
|---|---|---|
| Version Routing | `/vNNN` API 접두(신 Memory=신 버전, Legacy 병존) | 신설 |
| 환경 분리 | 운영 genieroi.com + 데모 demo.genieroi.com | Canary(데모 단독 금지 §13) |
| Rollback | dist.bak 스왑백·백엔드 원복(검증됨) | Memory 범위별 Rollback=신설 |
| Job | install_crontab.sh cron | Ingestion/Reconciliation Job 신설 |
| **Feature Flag/Kill Switch/Vector/Personalization Switch** | **전부 부재** | ★신설(구현 선결) |
| 삭제 전파 | Dsar.php(AI 저장소 미편입) + OpenPlatform outbox 패턴 | DSAR 편입+전파 워커 신설 |

## 2. Production Readiness Matrix (§4/§5/§67) — 현 상태
| Target | Type | Risk | Shadow | Privacy | Deletion | Status |
|---|---|---|---|---|---|---|
| User Preference(신설) | Store | LOW | 미실행 | 설계 | 설계 | BLOCKED_PENDING_IMPLEMENTATION |
| AI Insight Context | Consumer | MEDIUM | 미실행 | 설계 | — | BLOCKED_PENDING_IMPLEMENTATION |
| Recommendation Memory | Consumer | HIGH | — | — | — | BLOCKED_PENDING_IMPLEMENTATION |
| Automation Memory Execution | Consumer | **CRITICAL** | — | — | — | BLOCKED_PENDING_IMPLEMENTATION |
| ai_analyses/business_profile | Store | — | — | **✗ DSAR** | ✗ | BLOCKED_PRIVACY |
| Canonical Memory Engine | Engine | — | — | — | — | BLOCKED_PENDING_IMPLEMENTATION |

**Production Active 0.**

## 3. 위험 등급 & 전환 순서 (§6/§3.2)
- LOW(언어/화면 선호·Read-only·Explain)→MEDIUM(AI Insight/Summary·Recommendation Preview·Vector)→HIGH(Decision Support·공용 Memory·장기 Outcome 추천)→**CRITICAL(광고 예산 자동조정·캠페인 중지재개·CRM 발송·Retargeting·Audience·고객상태·Billing/권한/보안·민감 PII Memory)**.
- **순서**: 내부 Read-only 감사→사용자/Workspace 설정 조회→Goal/Policy→**Shadow 비교**→AI Insight→Report 개인화→Recommendation Preview→Decision Support→Automation Preview→승인형→제한 자동실행.
- **★Write Path와 Read Path 분리 전환(§3.3)**·**Fact/Inference 정책 Cutover 중 고정(§3.4)**.

## 4. Feature Flag / Version Routing (§7/§8)
- **Flag Scope**: Environment/Tenant/Workspace/User/Role/Memory Type/Ingestion Source/Retrieval Type/Consumer/Purpose/AI Model/Automation Workflow/Percentage. (부재→app_setting 기반 신설). Flag: Memory Ingestion·Long-Term Memory·Vector Retrieval·Graph Memory·Context Personalization·Recommendation Memory·Automation Memory Preview/Execution.
- **Version Routing**: Memory Schema/Policy/Retrieval Policy/Context Builder/Embedding Model/Consumer/AI Model/Automation Policy Version 추적·**비호환 Version 설명없이 혼합 금지**.

## 5. Shadow / Canary / Limited Production (§9~17)
- **Ingestion Shadow(§9/§10)**: Canonical Pipeline 결정 기록(Primary Write 미변경)·비교(Legacy 저장/Candidate/Type/Scope/Consent/PII/Duplicate/TTL/Eligibility). Exit=Duplicate/Conflict 정확도·**Secret 차단 성공률·Scope/Consent 오류 0·Unexplained Decision 0·기존 Memory 손실 0**.
- **Retrieval/Context Shadow(§11/§12)**: Legacy Context 제공+Canonical 병렬. **Exit=Cross-Tenant 0·삭제 Memory 0·Consent 철회 0·Secret 노출 0·Fact/Inference 혼동 0·Unexplained 0·기존 필수 개인화 유지**.
- **Canary(§13~16)**: **대표성 실 운영 Tenant + User Cohort(동의)**·Demo 단독 금지. 단계=Read-only Preference→Goal/Policy→AI Insight→Summary→Recommendation Preview→Decision→Automation Preview→승인형→제한 실행. Critical Incident 시 즉시 Rollback.
- **Limited Production(§17)**: 특정 Tenant/Workspace/User Cohort/Memory Type/Read-only/Consumer/비율.

## 6. Vector/Graph/Search/Cache Cutover (§18~21) — 별도
- **Vector(§18)**: Namespace·Metadata Filter·Embedding Version·Reindex·삭제 잔존 0·Consent/Expiry 반영·Cross-Tenant 테스트·Fallback. (벡터 부재→신설 시 격리 필수).
- **Graph(§19)**: Node/Edge/Path/Payload 권한·Deleted Edge 제거·Traversal Limit·Fallback.
- **Search(§20)**: Tenant Partition·삭제/Consent/Expiry 반영·Sensitive 제외·Reindex.
- **Context Cache(§21)**: 신 Namespace·Key=tenant/workspace/user/consumer/purpose/permission_version/consent_version/memory_version_set/policy/context_builder/model_version·**Legacy Cache 혼합 금지**.

## 7. User Control / Consent / Deletion 운영검증 (§22~24) — ★Cutover 선결
- **User Control(§22)**: Consumer 전환보다 **먼저/동시** 검증(조회·Source·정정·삭제·비활성·개인화 중지·유형별 제한·Consent 철회·Export). **사용자 제어 불가 장기 개인화 Memory=운영 확대 제한**.
- **Consent(§23)**·**Deletion(§24)**: 삭제→Retrieval 즉시차단·Primary·Projection Purge·Cache·Backup Suppression·완료확인·실패 Alert. ★**04-A/B DSAR GAP(ai_analyses/ai_generate_log/business_profile/rule_engine) 실 전파 테스트가 Cutover 선결**.

## 8. AI / Recommendation / Automation Cutover (§25~30)
- **AI Insight(§25)/Summary(§26)**: Internal→Admin Preview→Limited Cohort→Tenant→확대. Context에 Memory ID/Version/Fact·Inference Label/Freshness/Confidence/Warning/Limitations. Summary=Source Version·삭제/정정 전파·왜곡 없음·타 User/Tenant 정보 없음.
- **Recommendation(§27)/Decision(§28)**: 기존 대비 차이·사용/제외 Memory·거절 이력·Outcome 인과한계·고위험=승인형.
- **Automation Preview(§29)→Execution(§30)**: AUTOMATION_ALLOWED·최신 Consent/Policy·Scope·**Fact 또는 충분 검증 Memory**·Conflict 없음·Q/T/C·Preview·승인·Idempotency·Frequency/Budget/Suppression·**Kill Switch·Audit·Rollback/보상**.

## 9. Kill Switch (§31/§32)
- **Memory Kill Switch(§31)**: 전체/장기/Tenant/Workspace/User/Memory Type/Ingestion Source/Vector/Graph/Consumer/Purpose/Recommendation/Automation Preview/Execution 즉시중단(신설).
- **★Personalization Kill Switch(§32)**: AI 개인화만 별도 중지→User Memory Retrieval 차단·Context Cache 무효화·신규 개인 Memory Ingestion 차단·비개인화 Fallback·사용자 상태 표시·Audit.

## 10. Rollback (§33~41)
- **즉시 Rollback**: Cross-Tenant/Cross-User Memory 노출·Secret·Consent 철회 Memory 사용·삭제 Memory 사용·PII·Fact/Inference 심각 혼용·잘못된 고위험 Automation·데이터 손실·삭제 전파 불능.
- **범위(§34)**: Request/User/Workspace/Tenant/Memory Type/Ingestion Source/Retrieval/Context Builder/Consumer/**AI Personalization만/Recommendation만/Automation만**/전체.
- **절차(§35)**: Incident→Kill Switch→Flag off→Legacy Route 복구→Cache Purge→Vector/Graph/Search Routing 복구→Ingestion/Automation 중지→영향 식별→삭제/정정→증거보존→RCA→PM/Problem History.
- **Vector/Graph/Search/Cache/Ingestion Rollback(§36~40)**: 이전 Version·Reindex·삭제 잔존 Purge·Legacy 복구. **보상조치(§41)**: 잘못된 Memory 사용 시 Restrict/Delete/Corrected Version/Context 재생성/Recommendation 취소/자동화 중단/Reverse·Compensating Action/사용자 안내/재발방지 테스트.

## 11. Monitoring / SLO / Privacy SLO / Error Budget (§42~47)
- **Monitoring(§42)/Alert(§43)**: Ingestion/Rejection/Duplicate/Conflict/**Secret Block/Consent Block/Cross-Tenant Block**/Retrieval/Stale/**Deleted Memory Block**/Vector Latency/Context Token/Index Drift/**Deletion Propagation Lag**/Personalization Disable/Automation Block/Fallback.
- **SLO(§45)**·**★Privacy SLO(§46)**: **Cross-Tenant Exposure=0·Cross-User=0·Secret=0·Deleted Memory Retrieval=0·Withdrawn Consent Usage=0·Scope Enforcement Failure=0**·Deletion Propagation 기한·User Control 반영 기한. 정확성/Privacy SLO를 성능보다 낮게 취급 금지.
- **Error Budget(§47)**: 잘못된/Stale Memory·Scope/Consent Block·Deletion 지연·Context Regression·Fallback·Automation 오실행·Index Drift. ★**Privacy/Security 사고는 일반 Error Budget 상쇄 금지→별도 Critical Incident**.

## 12. Incident / Privacy Incident / DR (§48~58)
- **Incident(§48/§49)**: SEV1(Cross-Tenant/Cross-User 노출·Secret/PII·삭제/동의철회 Memory 대규모·잘못된 고위험 Automation·데이터 손실·대규모 Poisoning)~SEV4. Runbook 20단계(탐지→Kill Switch→Personalization/Automation Kill Switch→Rollback→RCA→Postmortem→PM/Problem History).
- **★Privacy Incident Runbook(§50)**: 타 Tenant/User Memory 노출·Secret 저장·삭제 실패·동의 철회 미반영·민감정보 Embedding·**Backup 복원 후 삭제 Memory 재등장**·Export에 삭제 Memory 포함. 법적 신고=관할/법무 검토 차단 표시.
- **DR(§51~58)**: Primary/Vector/Graph/Search/Cache/Consent Registry/Deletion Queue/Audit 장애. 복구=Legacy Route/User Settings 직접조회/Snapshot/Registry Version 복구/PITR/Vector·Graph·Search Rebuild/Deletion Queue Replay/Consent 재동기화. **모든 Projection 재구축 가능**(SoT). RPO/RTO(§54)=**Consent·삭제 상태 엄격**. Backup(§55/§56)=암호화·Tenant 식별·**Restore Suppression**·Demo/Prod 분리. **복구 실제 테스트(§57)=문서만 준비완료 아님**(단일 Tenant/User 복구·Consent/Deletion 상태 복구·**Backup Restore 후 삭제 Memory 억제**).

## 13. 안정화 / Legacy (§60~63)
- **안정화(§60/§61)**: Legacy Fallback 유지·강화 모니터링. 통과=**SEV1/2 0·Cross-Tenant/User 노출 0·Secret 0·삭제 Memory 사용 0·Consent 철회 Memory 사용 0·Unexplained 0·Golden 지속통과·Privacy SLO·Automation 오실행 0**.
- **Legacy(§62/§63)**: Fallback/Shadow/Historical/Incident 용도 유지. **제거 금지 조건**: Fallback/삭제·동의 상태 재현/Rollback 미검증·Consumer 미전환·Tenant 의존·안정화 미완·User Control 의존·미설명 차이. 무기한 금지·Part3 인증 후 Deprecated.

## 14. §72 완료 보고 수치
Production Readiness 대상=Memory Type 13+Consumer 6 · **Ingestion/Retrieval/Context Shadow 통과 0·Canary 통과 0·Limited Production 0·Production Active 0·Stable 0·Rolled Back 0**(구현 전) · Blocked=전부(BLOCKED_PENDING_IMPLEMENTATION+BLOCKED_PRIVACY DSAR+BLOCKED_SECURITY Secret) · Vector/Graph/Search Cutover 0(부재/미적재) · AI Consumer/Recommendation/Automation 전환 0 · User Control/Consent/Deletion 운영검증=DSAR 편입 사양(구현 후) · Incident 0(전환 없음) · Rollback 테스트=dist.bak 절차 검증(기존)·Memory Rollback 미실행 · DR 테스트=미실행(사양) · **Privacy SLO=사양 정의(Cross-Tenant/Secret/Deleted=0 목표)** · Error Budget=사양 · 문서=본 마스터+ADR+PM · ★**남은리스크=AI Memory Engine+Feature Flag+Kill Switch+Vector+DSAR 편입 구현이 모든 전환의 선결** · **EPIC04-D Part3(Enterprise Certification·Governance·Sign-off·Recurrence Prevention) 준비 완료(단 실 구현 선결)**. 코드변경 0.
