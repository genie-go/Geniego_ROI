# Canonical DSAR Discovery Governance — Evidence/Explain/Lineage, API/Permission/Security, Override, Lint/Guard, Error/Warning, Golden/Conformance/Equivalence, Observability/Alert/Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-1** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `Dsar::collectSubjectData`·`DataPlatform.data_source`/dataLineage·`Connectors`/connector_sync_log·`DataExport`·`CRM`/`CustomerAI`·SecurityAudit · Part 3-3-3-3-1/2 DSAR Registry/Verification Token.
> 형제: [`CANONICAL_DSAR_DISCOVERY_SCHEMA.md`](CANONICAL_DSAR_DISCOVERY_SCHEMA.md) · [`CANONICAL_DSAR_DISCOVERY_PLANNER.md`](CANONICAL_DSAR_DISCOVERY_PLANNER.md) · ADR=[`../architecture/ADR_DSAR_ENTERPRISE_DATA_DISCOVERY_ARCHITECTURE.md`](../architecture/ADR_DSAR_ENTERPRISE_DATA_DISCOVERY_ARCHITECTURE.md)

---

## 1. Discovery Evidence (§65) · Explain (§66) · Lineage (§67)

**Evidence(§65)**: 각 Source 검색에 Source ID·Source Account·Query Template Version·Scope Version·Identifier Set Version·Search Time·Search Strategy·Result/Candidate/Exclusion Count·Pagination 완료·Error·Checkpoint·Coverage·Adapter Version·Actor/Service·Integrity Hash. **★Raw Query Parameter·PII·OTP·Verification Evidence·신분증·Credential 최소화·마스킹(§3.7)**.
**Explain(§66)**: 어떤 Source 검색/선택이유/제외이유·어떤 Identifier/Strategy·어떤 기간·어떤 Candidate 발견·포함/제외 사유·어떤 Source 실패·Coverage 수준·남은 Gap·Manual/Processor 작업·재시도 시점 설명 가능.
**Lineage(§67)**: DSAR Request → Verification Decision → Search Scope → Subject Identifier Set → Discovery Plan → Discovery Task → Query Template/Adapter → Source Record Candidate → Match Result → Exclusion/Deduplication → Coverage Result → Access Review. 각 단계 ID·Version·Scope·Time 기록. (DataPlatform dataLineage 확장.)

---

## 2. API (§68) · Security (§69) · Permission (§70) · Override (§71)

**API(§68)**: Source Registry/Capability/Health 조회 · Search Scope 생성/검증 · Scope Expansion 요청 · Identifier Set 생성/조회 · Discovery Plan 생성/검증/승인 · Discovery Job 실행/Pause/Resume/Cancel · Task 조회 · Candidate 조회 · Match 검토 · Exclusion 등록 · Coverage/Gap 조회 · Retry · Explain · Lineage · Audit 조회. **★신규 실배선 `/api` 접두 필수**.
**Security(§69)**: Actor 인증 · DSAR Request Binding · **Verification Token 검증** · Tenant/Workspace/Brand Scope · Subject Binding · Authorization Scope · Purpose Binding · Source Permission · Sensitive Metadata Masking · Query Rate Limit · Result Size Limit · Enumeration 방지 · Idempotency · Audit · Environment 분리.
**Permission(§70, 24종)**: VIEW/MANAGE_DISCOVERY_SOURCE · VIEW_DISCOVERY_CAPABILITY · VIEW_DISCOVERY_SOURCE_HEALTH · CREATE/APPROVE_DISCOVERY_SCOPE · REQUEST/APPROVE_SCOPE_EXPANSION · GENERATE/VIEW_IDENTIFIER_SET · CREATE/APPROVE_DISCOVERY_PLAN · RUN/PAUSE/CANCEL_DISCOVERY_JOB · RETRY_DISCOVERY_TASK · VIEW_DISCOVERY_CANDIDATE · REVIEW_DISCOVERY_MATCH · CREATE_DISCOVERY_EXCLUSION · VIEW_DISCOVERY_COVERAGE · MANAGE_DISCOVERY_GAP · VIEW_DISCOVERY_EVIDENCE · VIEW_DISCOVERY_AUDIT · ADMIN_DISCOVERY_OVERRIDE.
**Override(§71)**: override_id · request_id · source_or_scope · original_decision · requested_change · reason · expected_benefit · privacy_risk · wrong_subject_risk · evidence · approvers · effective_time · expiry · audit. **금지**: Cross-Tenant Search · Wrong Brand Search · Verification Scope 초과 · Agent Authorization Scope 초과 · Production/Test 혼합 · Raw Full Platform Scan · Security Secret Search · Identity Conflict 미해결 확대 · Audit 없는 Manual Search.

---

## 3. Static Lint (§72) & Runtime Guard (§73)

**Static Lint(§72)**: Registry 없는 Source Adapter · Tenant Filter 없는 Query Template · Brand Scope 없는 Source Query · Verification Token 없는 Discovery · **Client 입력 Identifier 직접사용** · Unbounded Date Range · Full Table Scan 기본값 · Raw SQL String Concatenation · Query Template Version 누락 · Result Schema 누락 · PII Query Log · Test Environment 포함 · **Search Result 직접 Export** · Candidate Match 검증누락 · Coverage 계산누락 · **Gap 없이 Complete 처리** · Idempotency 없는 Task · Manual/Processor Source 누락 · Source of Truth 분류누락 · Audit 없는 Scope Expansion.
**Runtime Guard(§73)**: Verification Token Invalid/Expired · Request Closed/Withdrawn · Scope Expired · Authorization Scope 초과 · Cross-Tenant Query · Wrong Brand Query · Wrong Source Account · Test/Demo Data 혼입 · Source Permission 없음 · Tenant Filter 미적용 · Unbounded Query · Result Size 초과 · Identity Conflict High · Shared Identifier 단독 Broad Search · Source Health Critical · Schema Drift Critical · Query Template Version 불일치 · Scope Expansion 미승인 · **Kill Switch**.

---

## 4. Error (§74) & Warning (§75)

**Error(§74, 27종)**: SOURCE_NOT_REGISTERED · SOURCE_NOT_READY · SOURCE_HEALTH_UNKNOWN · CAPABILITY_NOT_SUPPORTED · SCOPE_INVALID · SCOPE_EXPIRED · SCOPE_EXPANSION_REQUIRED · IDENTIFIER_SET_INVALID · IDENTIFIER_UNTRUSTED · PLAN_INVALID · PLAN_NOT_APPROVED · TASK_DEPENDENCY_BLOCKED · QUERY_TEMPLATE_INVALID · QUERY_SCOPE_VIOLATION · CROSS_TENANT_BLOCKED · WRONG_BRAND_BLOCKED · SOURCE_ACCOUNT_MISMATCH · RESULT_LIMIT_EXCEEDED · SCHEMA_DRIFT · SOURCE_TIMEOUT · PROCESSOR_PENDING · MANUAL_SOURCE_PENDING · COVERAGE_INCOMPLETE · CRITICAL_GAP · PERMISSION_DENIED · JOB_CANCELLED · RUNTIME_BLOCKED (모두 `DISCOVERY_` 접두).
**Warning(§75, 16종)**: SOURCE_DEGRADED · SOURCE_MANUAL_ONLY · CONNECTOR_EXPIRING · SCHEMA_WARNING · IDENTIFIER_LOW_TRUST · SHARED_IDENTIFIER_WARNING · PARTIAL_RESULT · ARCHIVE_PENDING · PROCESSOR_DELAY · MANUAL_REVIEW_REQUIRED · COVERAGE_WARNING · GAP_WARNING · REPLICA_DUPLICATE_WARNING · LEGACY_SOURCE_USED · COST_WARNING · SLA_RISK.

---

## 5. Golden Dataset (§76) · Planning Conformance (§77) · Equivalence (§78-79)

**Golden(§76·50+ 시나리오)**: Canonical Person ID/Customer Profile ID/Verified Email/Hashed Email/Verified Phone/Source-specific CRM ID/Commerce ID/Support ID Search · Shared Email 보조검색 · Recycled Phone 제한 · Multiple Profile Match · Identity Conflict · Merge/Unmerge In Progress · Cross-Tenant/Wrong Brand/Wrong Source Account 차단 · Test Data 자동제외 · SoT+Replica/Search Index Copy 중복 · Archive 포함 · Backup 승인필요 · Manual/Processor Source 포함 · Disconnected Connector/Credential Expired/Schema Drift/Permission Denied/Rate Limited/Source Timeout · Partial Result · Scope Expansion 요청/거부 · Unbounded Query/Full Scan 차단 · Candidate Exact/Shared/Wrong Subject/Out of Scope/Duplicate · Coverage Complete/Partial · Critical Gap · Unregistered Source/Shadow Copy Gap · Job Retry/Checkpoint Resume/Cancellation · Withdrawal 중 Cancel · Historical As-of · Override 허용/금지.
**Conformance(§77)**: Database·Warehouse·SaaS·Object Storage·Archive·Backup·Search Index·Graph·Vector Store·Processor·Manual Source 에 동일 Planning 기반(Registry·Capability·Health·Scope·Identifier·Strategy·Query Template·Task·Candidate·Match·Coverage·Gap·Evidence·Audit) 적용.
**Equivalence(§78)**: 기존 `collectSubjectData`·`DataPlatform` dataLineage·CustomerAI 360 와 비교(Source Coverage·Identifier Coverage·Tenant/Brand Scope·Result Count·Candidate Match·Duplicate·Archive/Processor/Manual Coverage·Error·Warning·Latency·Audit). **Difference(§79)**: MATCH·EXPECTED_{SOURCE_COVERAGE/SCOPE/IDENTIFIER/DUPLICATE/ARCHIVE/PROCESSOR/SECURITY}_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_SECURITY_DEFECT·**LEGACY_DISCOVERY_GAP·LEGACY_WRONG_SUBJECT_RISK**·CANONICAL_DISCOVERY_DEFECT·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_SUBJECT_RISK`·고객영향 `LEGACY_DISCOVERY_GAP` = 운영전환 차단**.

---

## 6. Observability (§80) · Alert (§81) · Audit (§82)

**Metrics(§80)**: Registered/Ready/Degraded/Unverified Source·Plan/Job/Task Count·Source Success/Failure·Connector Failure·Credential Expiry·Schema Drift·Rate Limit·Query Timeout·Candidate·Exact/Partial Match·Wrong-subject Block·Cross-Tenant Block·Duplicate·Exclusion·Coverage Complete/Partial·Gap/Critical Gap·Manual/Processor Pending·Retry·Cancellation·Legacy Usage·P50/P95/P99.
**Alert(§81)**: Required Source 미등록/Disconnected·Credential Expired·Schema Drift Critical·Tenant Filter 없는 Source·Cross-Tenant/Wrong Brand Query 시도·Full Scan 시도·Result Limit 초과·Wrong-subject Candidate 급증·Shared Identifier 자동승인·Processor 미응답·Manual Source SLA 초과·Coverage Complete 오표시 위험·Critical Gap·Shadow Copy 발견·Job 반복실패·Legacy 신규사용·Audit Evidence 누락.
**Audit Event(§82, 29종)**: SOURCE_REGISTERED/VERSIONED/HEALTH_CHECKED · CAPABILITY_VALIDATED · SCOPE_CREATED/APPROVED · SCOPE_EXPANSION_REQUESTED/APPROVED · IDENTIFIER_SET_CREATED · PLAN_CREATED/APPROVED · JOB_STARTED · TASK_STARTED/COMPLETED/FAILED/RETRIED · CANDIDATE_CREATED · MATCH_EVALUATED · CANDIDATE_EXCLUDED · DUPLICATE_GROUPED · COVERAGE_CALCULATED · GAP_DETECTED · JOB_PAUSED/CANCELLED/COMPLETED · RUNTIME_BLOCKED · OVERRIDE_REQUESTED/APPROVED/REVOKED (모두 `DISCOVERY_` 접두·SecurityAudit 확장).

---

## 7. Existing Implementation Classification (§83) & Duplicate Audit (§84) & Regression Gate (§85)

**분류(§83)**: 실측 결과 —
| 구현 | 분류 | 근거 |
|---|---|---|
| `Dsar::collectSubjectData`(하드코딩 8테이블 subject lookup) | `MIGRATION_REQUIRED` → `CANONICAL_DISCOVERY_PLANNER`/`CANDIDATE_STORE` | Registry/Coverage/Gap/SoT 부재 → 등록기반 Planner·Candidate 로 형식화(기능 보존) |
| `DataPlatform.data_source`(source_type/channel/account/credential/priority) | `CONSOLIDATION_REQUIRED` → `CANONICAL_DISCOVERY_SOURCE_REGISTRY` | 분석수집 Source Registry → DSAR discovery 소스 편입·중복 신설 금지 |
| `DataPlatform` reliability/dataQuality/dataLineage(272차) | `VALIDATED_LEGACY` → Source Health/Coverage/Lineage 편입 | 정상·확장 |
| `Connectors`+connector_sync_log(채널 자격/상태) | `LEGACY_ADAPTER` → Source Health/Credential Binding | 재사용 |
| `CRM`/`CustomerAI`(customer 360 search) | `VALIDATED_LEGACY` | Customer Identity 검색·Candidate 소스 |
| `DataExport`(data_export_destination/run·아웃바운드) | `KEEP_SEPARATE_WITH_REASON` | 아웃바운드 Export≠DSAR Subject Discovery(Part 3-3-3-3-4 연계) |
| `Catalog`(상품 카탈로그) | `KEEP_SEPARATE_WITH_REASON` | 고객 데이터 아님 |
| **Discovery Scope/Identifier Set/Planner/Query Template/Candidate/Coverage/Gap 부재** | 신설 | 현행 부재 |
**Duplicate Audit(§84)**: 실측 — Source Registry=`DataPlatform.data_source` 단일(분석용)·DSAR discovery=`collectSubjectData` 단일(하드코딩)·연결상태=`connector_sync_log` 단일. **중복 Registry/Search/Planner/Candidate Store 신설 위험만 차단**(§96 Source별·Request Type별 독립 Discovery Planner 금지).
**Regression Gate(§85)**: 변경 전후 Source Coverage·Customer/Email/Phone/External ID Search·Tenant/Brand Filter·Date Range·Archive/Backup/Processor/Manual Search·Retry·Checkpoint·Cancellation·Duplicate·Candidate Match·Coverage·Gap·Explain·Lineage·Audit·**Existing API Compatibility**(collectSubjectData/DataPlatform/DataExport/CRM 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 8. 완료 상태 요약

Discovery Entity 25 · Source Type 41 · Source of Truth 15 · Capability 26 · Search Mode 10 · Health 13상태/Readiness Gate · Search Scope(Verification Token 기반)/16상태 · Subject Identifier Type 22/Trust 10/Normalization · Scope Minimization/Expansion 8상태 · Discovery Policy(Version) · Search Strategy 15/우선순위 · Source Priority · Planner/Plan 15상태/Guards · Task Type 18/16상태/Dependency 13 · Query Template(tenant filter 강제)/금지 12 · Adapter Contract 13 · Job 15상태/Checkpoint/Idempotency/Retry/Timeout/Cancellation · Candidate/Match 15상태/Confidence 5/13차원·Exclusion Type 18 · Duplicate/Partial 11 · Coverage 12차원/7상태·Gap 17유형/5 Severity · Evidence/Explain/Lineage · Permission 24/Override · Static Lint 21/Runtime Guard 19 · Error 27/Warning 16 · Golden 50+/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **실 Source Registry·Planner·Adapter(SQL/NoSQL/Warehouse/SaaS/File/Archive/Processor)·Candidate/Coverage/CI가드 구현 = Part 3-3-3-3-3-2~8(후속 승인 세션·verify+배포승인).**
