# ADR — DSAR Structured Data Discovery (SQL/NoSQL/Warehouse/Lakehouse/Time-series/Graph/Vector) (EPIC 06-A Part 3-3-3-3-3-2)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Structured Data Discovery Adapter·Query Governance 계약 명세 확정. 비파괴 — 코드변경 0). 실 SQL/NoSQL/Warehouse/Graph/Vector Adapter·Query Template·Candidate·CI 가드 구현은 후속 승인 세션(Golden Structured Dataset+Adapter Conformance+Legacy Equivalence+verify+배포승인). **운영 DB 무제한 Full Scan·Read-write Credential·Tenant Predicate 없는 Query·Raw SQL 결합·Client Table Name·Search Result 직접 Export·Vector Similarity만으로 Subject Match·무제한 Graph Traversal·Test/Prod 혼합 금지. SaaS=Part 3-3-3-3-3-3, File/Object/Backup=3-3-3-3-3-4.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_STRUCTURED_DISCOVERY_SCHEMA.md`](../segmentation/CANONICAL_DSAR_STRUCTURED_DISCOVERY_SCHEMA.md) · [`QUERY`](../segmentation/CANONICAL_DSAR_STRUCTURED_DISCOVERY_QUERY.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_STRUCTURED_DISCOVERY_GOVERNANCE.md) · 기존 `Db.php`(MySQL geniego_roi + SQLite fallback·isMysql 이중방언·self-healing ensureTables)·priceopt/returns/supplychain.sqlite·`Dsar::collectSubjectData`(하드코딩 8테이블)·2677 tenant_id 필터·GraphScore · Part 3-3-3-3-3-1 Discovery Registry/Planner · Part 3-3-3-3-2 Verification Token · EPIC05 Identity Graph.

## 결정 (핵심)

1. **기존 DB 계층 확장(재구현 금지)·인프라 정직**: `Db.php`(MySQL+SQLite 이중방언·PDO prepared)·도메인 SQLite·`collectSubjectData`·tenant_id 필터·ensureTables·GraphScore 는 **정본 — Canonical Structured Discovery Adapter 아래 통합**. **★현행 Warehouse/Lakehouse/Graph DB/Vector DB/Feature Store/Read Replica 실인프라 부재**(grep 확인) → 해당 Source Type/Adapter=NOT_APPLICABLE/미래목표(**지어내기 금지**·도입 시 등록). Engine별·Request Type별 독립 Planner/Candidate Store 신설 금지(§105).

2. **운영 DB 무제한 Full Scan 금지(§3.1)**: Tenant Filter 없는 Scan·Date Range 없는 대형 Event Scan·Index 없는 Wildcard·모든 JSON/Partition/Tenant Scan·`SELECT *` 대량·결과 제한없는 Query·Client 임의 Table 검색 금지 → 승인된 Batch/Replica(미래) 사용.

3. **Read-only·불변 검색(§3.2)**: Discovery Query 가 Row/Document/Index/Lock/Transaction/Sequence/Trigger/Session 변경 금지. 최소권한 Read-only Credential(INSERT/UPDATE/DELETE/DDL/GRANT/COPY External 금지).

4. **ORM/RLS Tenant Scope 미신뢰·Scope Predicate Verification(§3.3)**: native RLS 부재(현행 2677 애플리케이션 필터)→ Query Plan/AST 검사로 Tenant/Brand/Subject/Date/Environment Predicate 실존 확인·**Join/Subquery/Union/CTE/View 내부 Scope 유지** 검증. `SELECT *` 기본 금지·Candidate 단계 최소 Column.

5. **Warehouse Copy ≠ SoT·Soft Delete 탐색(§3.5·3.6)**: Warehouse/Replica=Load Lag/Deleted 잔존/중복/Transformation/Masking 가능 → Canonical Source·Lineage 확인·중복 그룹화. Active Table 부재 ≠ 데이터 부존재 → deleted_at/is_deleted/status/tombstone/audit/history/temporal/archive/CDC 확인. Tombstone=최소 개인데이터(Candidate 기록).

6. **Vector Similarity ≠ Identity·Graph Traversal 제한(§3.7·3.8)**: (미래 인프라) Vector=Metadata/Source Document/Subject/Tenant Exact Match 우선·Similarity=보조만·Source 삭제 후 Vector 잔존=Privacy Gap. Graph=Verified Node 시작·Edge/Depth/Tenant Predicate 제한·**Shared Email/Phone/Device/Household/Company Node 통한 다른 Person 자동포함 금지**.

7. **Query 실패 ≠ 데이터 없음·Cost 통제(§3.9)**: No Match/Permission Failure/Timeout/Schema Drift/Query Invalid/Partition Missing/Replica Lag/Degraded/Corruption/Unsupported 구분. Query Cost 실행 전 계산·`PROHIBITIVE`/`UNKNOWN`=운영 DB 자동실행 차단(Scope 축소/Replica/Warehouse/Batch/Manual). Result Limit·Keyset Pagination·Timeout/Cancellation.

8. **정직·무후퇴·Evidence/Coverage**: Query Template/Field Mapping/Candidate/Coverage/Gap/Schema Drift=현행 부재→목표계약. Query Text PII 미포함(Parameterized·Parameter Hash). Coverage 다차원·Critical Gap 시 Access Review 차단. Db/collectSubjectData/CRM/CustomerAI/priceopt.sqlite 보존(Legacy Equivalence·API Compatibility·RLS/Index/Replica 즉시제거 금지). UNEXPLAINED·고객영향 LEGACY_SECURITY_DEFECT·LEGACY_DISCOVERY_GAP→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§105)
신규 Table/Collection/Warehouse Dataset/Graph Label/Vector Index/Feature Group 을 DSAR 검색대상 추가 전: Discovery Source Registry·Structured Source Profile·Object Registry 등록 → Canonical Entity·Identifier Field·Tenant/Brand Scope Field·Temporal/Deletion Field·Personal/Sensitive Mapping·Query Template·Parameterization/Scope Guard·Cost/Limit/Timeout·Candidate/Evidence/Coverage 정의 → Golden/Conformance·Lint/Guard·중복/후퇴·ADR/PM 기록. **Database Engine별 독립 DSAR Planner/Candidate Store 중복 생성 금지.**

## 결과
Structured Entity(20)·Source Profile/DB Type(19·현행 MySQL/SQLite)/Isolation(10·현행 ROW_LEVEL/SHARED_APP)·Object(22)/Field Mapping/Identifier(21)/Scope/Temporal(15)/Deletion(10)·Personal/Sensitive Mapping·Query Template(이중방언)/Parameterization/Dynamic Object·Scope Predicate Verification·Projection/Minimization·Date/Partition/Index·Cost(6)/Limit/Pagination(6)/Timeout·Read-only/Replica(7)/Isolation·Temporal/Soft Delete/Tombstone·JSON/NoSQL/KV/Wide-column·Warehouse/Lakehouse/Event/Time-series(미래)·Graph/Vector/Feature(미래)/Dedup/Search Index·Candidate·Evidence·Coverage(14)/Gap(21)·Schema Drift·Lint(21)/Guard(18)·Error(23)/Warning(14)·Golden(55+)/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_STRUCTURED_DISCOVERY_{SCHEMA,QUERY,GOVERNANCE}.md(§97 90여 문서 통합). **★미존재 인프라=NOT_APPLICABLE 정직표기**. 다음 **EPIC 06-A Part 3-3-3-3-3-3 — SaaS Data Discovery: CRM·Commerce·Payment·Marketing·Analytics·Support·Identity Provider** 입력 준비 완료.
