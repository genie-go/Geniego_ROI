# ADR — DSAR Enterprise Data Discovery Architecture, Source Registry, Search Scope & Discovery Planner (EPIC 06-A Part 3-3-3-3-3-1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Enterprise Data Discovery Architecture·Source Registry·Search Scope·Discovery Planner 계약 명세 확정. 비파괴 — 코드변경 0). 실 Source Adapter(SQL/NoSQL/Warehouse/SaaS/File/Archive/Processor)·Planner·Candidate/Coverage Engine·CI 가드 구현은 후속 승인 세션(Golden Discovery Dataset+Planning Conformance+Legacy Equivalence+verify+배포승인). **무검증 Full Platform Scan·Cross-Tenant 검색·Client Identifier 직접신뢰·Search Result 직접 Export·Test/Prod 혼합·Coverage 불완전 Complete 선언 금지. 세부 Adapter=Part 3-3-3-3-3-2~5, Export=Part 3-3-3-3-4.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_DISCOVERY_SCHEMA.md`](../segmentation/CANONICAL_DSAR_DISCOVERY_SCHEMA.md) · [`PLANNER`](../segmentation/CANONICAL_DSAR_DISCOVERY_PLANNER.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_DISCOVERY_GOVERNANCE.md) · 기존 `Dsar::collectSubjectData`(하드코딩 8테이블)·`DataPlatform.data_source`(source_type/priority·272차)·`Connectors`/connector_sync_log·`DataExport`·`CRM`/`CustomerAI`·Db.php(MySQL+SQLite) · Part 3-3-3-3-1 DSAR Scope/Fulfillment Job · Part 3-3-3-3-2 Verification Token/Identity Match · EPIC05 Customer Identity Graph.

## 결정 (핵심)

1. **기존 Discovery/Registry 확장(재구현 금지)**: `Dsar::collectSubjectData` discovery·`DataPlatform.data_source` Registry·`Connectors`/connector_sync_log·`CRM`/`CustomerAI` 360·`DataExport`·Db fallback 은 **정본 — Canonical Discovery Planner·Source Adapter 아래 통합**. Source별(DB/SaaS/Archive/Processor)·Request Type별(Access/Export/Correction/Restriction/Erasure) 독립 Discovery Planner 신설 금지(§96). Search Scope·Subject Identifier Set·Planner/Plan/Task·Query Template·Candidate/Match·Coverage/Gap·Checkpoint 는 현행 부재→신설.

2. **무차별 검색 금지(§3.1)**: DSAR 접수만으로 전체 Tenant/Warehouse/Object Storage/Provider 검색 금지 → Verified Subject·Requester·Authorized Scope·Tenant/Workspace/Brand/Legal Entity·Request Type·Data Category·Date Range·Processing Activity·Jurisdiction·Source Account·Environment·Verification Token 로 제한. Full Platform Scan 기본값 금지·Scope Minimization.

3. **Client 입력 직접신뢰 금지·서버 Scope 생성(§3.2)**: Requester/Frontend Email·Phone·Customer ID 그대로 신뢰 금지 → Canonical Customer Identity Registry(EPIC05) + Verification Decision(Token) 로 서버에서 Search Identifier Set 생성. Identity Version·Trust Level·Shared/Reuse Risk·Tenant/Brand Binding 기록.

4. **1 Identifier 결과 ≠ Subject 전체데이터(§3.3)**: Email/Phone/Device/Cookie/CRM ID=공유/재사용/오입력/Legacy 중복 가능 → 검색결과=Candidate(즉시확정 아님)·Identity Match+Scope 검증 필수. Shared/Conflict Identifier=보조검색/자동 Scope 확장 금지. Merge/Unmerge 진행중=Wrong-subject Risk·Reconciliation까지 중지.

5. **Source of Truth ≠ Replica(§3.4)**: 동일 데이터 다시스템 존재 시 Canonical SoT·Domain SoT·Replica·Projection·Cache·Index·Analytics·Archive·Backup·External Copy·Legacy 구분. Duplicate 그룹화·대표 Record 선정·Replica 는 Lineage 유지(중복 과다계산 금지). Orphan/Shadow Source 별도 Gap.

6. **미검색 ≠ NO_DATA·Discovery≠Export(§3.5·3.6)**: Source Coverage·Connector Health·Query Capability·Scope·Identifier·Archive·Processor Coverage·Error·Permission·Timeout·Schema Drift·Manual Source 확인 전 `NO_DATA` 선언 금지. Partial 을 `COMPLETE`/`NO_DATA` 표시 금지. Discovery 결과 Raw Payload 를 Requester 직전달 금지(Search→Candidate→Identity Validation→Classification→Dedup→Review→Redaction→Export Packaging→Delivery 분리).

7. **최소 Identifier·환경격리·Manual Source 포함(§3.7·3.8·3.9)**: 필요이상 PII/Verification Evidence/신분증 원문 Query 포함 금지·Raw PII 로그 금지. Production/Test/Demo 혼합 금지(단 Prod→Test 오복제=별도 Privacy Finding). 자동 API 없는 Spreadsheet/Shared Drive/Vendor Portal/수동 Archive 도 Source Registry·책임자 관리(누락 금지).

8. **정직·무후퇴·Coverage/Gap 강제**: Search Scope/Identifier Set/Planner/Plan/Task/Query Template/Candidate/Coverage/Gap=현행 부재→목표계약. Coverage 다차원 계산·Critical Gap/Unknown Completeness 있으면 Access Fulfillment Review 차단. collectSubjectData/DataPlatform/DataExport/CRM/Connectors 보존(Legacy Equivalence·API Compatibility). UNEXPLAINED·LEGACY_WRONG_SUBJECT_RISK·고객영향 LEGACY_DISCOVERY_GAP→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§96)
신규 Database/SaaS/Storage/Processor/Archive/Manual Source 를 Discovery 대상 추가 전: Data Asset Registry·Discovery Source Registry 등록 → Source Type/Source of Truth·Tenant/Brand/Environment Scope·Source Account·Data Category/Purpose·Searchable Identifier·Discovery Capability·Source Health/Credential·Query Template/Adapter·Search Scope/Identity Risk·Coverage 영향 정의 → Golden/Conformance·Lint/Guard·중복/후퇴·ADR/PM 기록. **Source별·Request Type별 독립 DSAR Discovery Planner 중복 생성 금지.**

## 결과
Discovery Entity(25)·Source Registry/Type(41)/SoT(15)/상태·Capability(26)/Health(13)/Readiness Gate·Search Scope(Verification Token 기반)/Identifier Set(22 Type/Trust 10/Normalization)/Minimization/Expansion·Discovery Policy/Strategy(15)/Priority·Planner/Plan(15상태)/Task(18)/Dependency·Query Template(tenant filter 강제)/Adapter Contract·Job(15상태)/Checkpoint/Idempotency/Retry/Timeout/Cancellation·Candidate/Match(15상태·13차원)/Exclusion(18)/Duplicate/Partial·Coverage(12차원)/Gap(17유형/5 Severity)·Evidence/Explain/Lineage·API/Permission(24)/Override·Lint(21)/Guard(19)·Error(27)/Warning(16)·Golden(50+)/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_DISCOVERY_{SCHEMA,PLANNER,GOVERNANCE}.md(§88 90여 문서 통합). 다음 **EPIC 06-A Part 3-3-3-3-3-2 — Structured Data Discovery: SQL·NoSQL·Warehouse·Lakehouse·Time-series·Vector Database** 입력 준비 완료.
