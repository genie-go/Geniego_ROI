# Canonical Retention — Storage Tiers, Archive, Domain Retention & Backup/Provider Lifecycle

> **EPIC 06-A Part 3-3-3-2** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: 실 도메인 스토어(crm_customers/activities·crm_segment_members·email/sms_suppression·audience(AdAdapters)·performance_metrics·ai_settings·MySQL/SQLite·backup·dist.bak 278차) · 형제: [`CANONICAL_RETENTION_SCHEMA.md`](CANONICAL_RETENTION_SCHEMA.md) · [`CANONICAL_RETENTION_ENFORCEMENT.md`](CANONICAL_RETENTION_ENFORCEMENT.md)
> **성격**: 목표 계약. 실 구현은 후속 승인 세션.

---

## 1. Storage Tier (§19-20) & Archive (§21-31)

- **Active(§19)**: 현재 운영 목적 필요분만 — Consumer·Query 빈도·Customer 기능 의존·목적 유효성·접근권한·성능·비용·Archive/삭제 가능성·민감도 확인.
- **Cold(§20)**: 운영 Query 감소·Customer 기능 직접의존 없음·Historical/Compliance 유지·즉시접근 불필요·Retention 미만료 → 암호화·접근제한·Lifecycle 상태·복원 SLA·비용·Audit·만료후 삭제.
- **Archive Policy(§21)**: archive_policy_id · applicable_assets · archive_trigger · format · compression · encryption · key_policy · integrity_method · manifest_requirement · partitioning · region · access/restore_policy · archive_retention · deletion_method · owner · version · status.
- **★Archive 금지(§22)**: Temporary Queue Payload · Expired Cache · Raw Session · 불필요 Full PII Export · Auth Secret · Payment Credential · **삭제 Subject 재식별 데이터** · Test/Demo · **Duplicate Shadow Copy**(dist.bak 278차) · Stale Provider Payload.
- **Archive Object(§23) & Manifest(§24) & 무결성(§25)**: object_id · source/archive_location · scope · data_categories · schema_version · record_count · **checksum** · encryption_key_reference · archived_at · retention_until · legal_hold_status · restore/deletion_status · manifest_id. Manifest=object list·schema·record count·partition·time range·scope·checksum·encryption·retention·hold·validation·lineage. 무결성=Checksum·Record Count·Schema·Partition·Scope·Encryption·Manifest·Source↔Archive 비교·Sample Read·Restore Test·Tampering Detection.
- **Archive 접근(§26)**: Active 보다 강화 — Purpose·Activity·Actor·Approval·Data Category·Subject Scope·Time Range·PII Level·Download 제한·Access Expiry·Audit·Post-access Cleanup. **Search(§27)**: 전체복원 없이 최소범위(Subject/Tenant/Brand/Category/Time/Activity/Legal Case/DSAR/Incident), 검색 Index 자체도 Retention.
- **Restore(§28-31)**: Request=restore_request_id·archive_object_id·purpose·requester·scope·subject·time_range·destination·restore_mode·approval·retention_after_restore·deletion_after_use·status. **Mode(§29)**: TEMPORARY_READ_ONLY/CASE_SPECIFIC/PARTIAL/FULL/DISASTER_RECOVERY/ANALYTICS_REPRODUCTION/LEGAL_RESPONSE — **운영편의 Full Restore 금지**. Validation(§30)=Purpose·Approval·Legal Hold·**Deletion Tombstone**·Consent/Suppression·Scope·Schema·Security·Retention·Post-use Delete·Re-ingestion Risk. **★재등장 방지(§31·§3.5)**: Deletion Tombstone Join · Consent/Suppression Recheck · Subject Status Recheck · Re-ingestion Prevention · Restore Filter · Post-restore Reconciliation · Audit.

---

## 2. Customer/Identity/Consent/Suppression Retention (§39-44)
- **Customer Profile(§39-40)**: Active/Lead/Prospect/Anonymous/Churned/Closed/Deleted/Anonymized/Fraud투자/Support-only/B2B 각각 Purpose·Trigger·기간·Action. Relationship 종료 후 불필요/민감 Attribute·Predictive Score·Segment Membership·AI Summary 제거·Marketing History 최소화·Transaction/Consent Evidence 유지검토·Pseudonymize/Archive/Delete.
- **Identifier(§41)**: Email/Phone/Device/Advertising/Cookie/Push Token/CRM/External/Hashed/**Deleted Tombstone** — Invalid/Expired Identifier 운영 Profile 무기한 유지 금지. **Identity Link(§42)**: Unmerge 가능성·Audit·Wrong-target 조사·Deletion·재사용 위험·Source Account Scope·Tombstone·Pseudonymize·Expiry.
- **Consent(§43)**: Current Operational vs Historical vs Withdrawal Evidence vs Policy Version vs Disclosure vs Conflict vs Correction 분리. **철회 후 마케팅 대상 데이터 제거·철회 사실+최소 Evidence 는 제한 보존**(현행 email_suppression DSAR 보존 정합). **Suppression(§44)**: Global Opt-out/Complaint/Hard Bounce/Legal Block/Deletion Tombstone/Provider Removal Evidence 필요기간 — **Full PII 대신 Hash/Reference/Scope 최소화** 검토.

## 3. Segment/Audience/CRM/Automation Retention (§45-51)
- **Segment Definition(§45)**: Definition/Operator Version·Purpose·Owner·Approval·Audit·Dependency·Campaign Reference 보존 — **삭제 Segment 의 전체 Member List 무기한 보존 금지**. **Membership(§46)**: Current vs Historical Snapshot vs Campaign Evidence vs Experiment vs Holdout vs Audit Sample — 목적종료 후 Member-level→Aggregate 전환 검토.
- **Audience Snapshot(§47)**: Campaign/Automation 재현·Wrong-target 조사·Consent/Suppression Evidence·Destination Sync·Removal Evidence·Member-level PII·**Hash-only Retention**·Expiry·Archive·Delete. **Static List(§48)**: Source File/Parsed Member/Temporary/Download Link Expiry·Malware Artifact·Consent Evidence·Derived Snapshot·Delete Verification(짧은 Retention). **Destination Export(§49)**: 최소보존·암호화·One-time Access·Job 완료후 삭제·Retry 기간·Provider Ack·Audit·Cleanup Verification.
- **CRM/Campaign/Journey(§50)**: Campaign Definition/Template/Audience Reference/Execution Result/Delivery Event/Contact History/**Message Body/Personalization Payload**/Provider Response/Error Log/Retry Payload — Full Message Payload+PII 를 동일기간 보존 금지. **Automation(§51)**: Journey State·Pending/Completed/Cancelled Action·Eligibility Decision·Consent/Suppression Version·Frequency Reservation·Wrong-target Block·Compensation·Audit.

## 4. Event/Metric/Attribution/AI Retention (§52-60)
- **Event(§52-53)**: Raw/Normalized/Deduplicated/Aggregated/Derived Metric/Attribution Input·Output/Error/Invalid/DLQ — **Raw Event 무기한 금지·Aggregate 전환**. Event Time·Processing Time·Late Arrival·Correction·Attribution·Refund/Return Window·Identity Re-resolution·Compliance·재현·Cost·Privacy 고려.
- **Metric(§54)**: Definition/Calculation Version/Raw Input/Intermediate/Final Aggregate/**Customer-level vs Cohort-level**/Model Feature — Customer-level 은 Purpose 종료 후 Aggregate/Delete. **Attribution(§55)**: Touchpoint/Conversion/Model Version/Contribution/Experiment/Holdout/Bootstrap/Explain Trace — 개인별 History vs Aggregate Report 기간 분리.
- **AI Prompt(§56)**: Prompt Template/Input/**PII Masking**/Provider Logging/Internal Log/Response/Tool Output/Conversation Memory/Error Trace/Evaluation Dataset — **Raw Prompt Context 기본 무기한 금지**. **AI Output(§57)**: Temporary/Customer-facing/Internal Summary/Recommendation/Prediction/Decision Support/Automation Instruction/Audit Evidence/Evaluation — 고객영향·재현성별 기간.
- **Training Dataset(§58)**: dataset_id·version·purpose·source_data·subject_scope·**de-identification**·consent/basis·training/evaluation_period·model_versions·**deletion_propagation**·archive·expiry·owner·approval. **Feature Store(§59)**: feature_id·source·purpose·subject·generated_at·freshness·expiry·model_consumers·online/offline_retention·deletion/backfill_behavior·lineage. **Vector Store(§60)**: Source Document/Subject/Tenant/Purpose/Model Version/Created/Expiry/**Deletion Propagation**/Re-embedding/Index Cleanup/Backup/Restore/Access. **★Embedding 을 익명 데이터로 자동간주 금지**.

## 5. Log/Cache/Index/Graph/Queue Retention (§61-69)
- **Log(§61)**: Application/Access/Audit/Security/Database/Queue/Provider/AI Trace/Error/Debug 분리. **Debug Log=짧은기간+강화 PII Redaction**. **Audit(§62·§3.7)**: 장기보존 가능하나 **Payload 최소화**(Actor/Action/Target Reference/Scope/Purpose/Policy Version/Timestamp/Result/Reason Code/Evidence Reference). **Security(§63)**: 탐지/조사 기간·Incident Hold·Legal·Threat Intel·PII 최소·Access 제한·Integrity·Chain of Custody·Expiry 후 삭제.
- **Cache(§64)**: Primary보다 짧은 TTL·Key(Tenant/ws/brand/subject/purpose/consumer/policy/data/permission version/env). **Search Index(§65)**: Source 삭제 반영·Tombstone·Refresh/Reindex·Old Index 제거·Alias 전환·Snapshot·Cache·PII Field·Historical — **Blue/Green 전환 후 Old Index 무기한 유지 금지**. **Graph(§66)**: Node/Edge 삭제·Derived Relationship·Identity Link·Archived Node·**Orphan Edge**·Projection·Snapshot·Traversal Cache·Reconciliation.
- **Queue(§67)**: Pending/In-flight/Completed/Failed/Retry/DLQ/Cancelled/Expired 짧은 명확 Retention·**PII 원문 불필요 포함 금지**. **DLQ(§68)**: 최대기간·PII 최소·Retry·Manual Review·Incident·Poison·Cleanup·Audit — **무기한 저장소 사용 금지**. **Temporary File(§69)**: Upload/Export Staging·Import Parse·Provider Chunk·Report·Archive Restore·DSAR Prep·Debug Dump — Job 완료/실패/취소 후 Cleanup 보장.

## 6. Backup/Snapshot/Replica/Provider Retention (§70-78)
- **Backup(§70-73)**: policy_id·asset·backup_type·frequency·retention·region·encryption·immutable_period·legal_hold·**deletion_replay**·restore_test·owner. Type: FULL/INCREMENTAL/DIFFERENTIAL/SNAPSHOT/POINT_IN_TIME/TRANSACTION_LOG/OBJECT_VERSION/CONFIGURATION/ARCHIVE. **원칙(§72)**: 운영보다 무조건 길게 금지·명확 DR 목적·Restore Test·Encryption·Access/Region 제한·Expiry·**삭제 Subject 재등장 방지**·Old Key 관리·Audit. **Deletion Replay(§73)**: Restore 후 Customer Deletion Tombstone·Consent Withdrawal·Suppression·Identifier Revocation·Destination Removal·Retention Expiry·Legal Hold·Policy 변경 재적용.
- **Snapshot(§74)**: 목적·Scope·Retention·Region·Encryption·Restore 권한·Expiry·Deletion Replay·Audit — **개발편의 Snapshot 운영 장기보존 금지**(dist.bak 278차 교훈). **Replica(§75)**: 제거 시 Replication 중지·Lag·Consumer 전환·Backup/Snapshot·Secure Delete·DNS/Connection/Credential 제거·Audit·Reconciliation.
- **Third-party(§76)**: Provider Retention·Config 가능·Delete/Remove API·Backup/Log 정책·Subprocessor·계약·Evidence·Reconciliation·종료시 삭제 — **내부 삭제만으로 전체 Lifecycle 완료 선언 금지**(SEG-H2/H5 Provider Removal/Reconciliation 정합).
- **Processing 종료(§77)**: 신규수집/Consumer접근/Queue 중지 · Cache 무효화 · Destination 중지 · Active Data 분류 · Archive 검토 · Retention 재계산 · Delete/Anonymize · Provider 삭제 · Backup 반영 · Audit · Certification. **Policy 변경 재계산(§78)**: Purpose/Data Category/Jurisdiction/Contract/Consent/Retention 단축·연장/Processor/Relationship 종료/Model Retirement/Legal Hold Release/Privacy Review 결과 시 영향 Asset 재평가.

---

## 7. 완료 조건 대응 (본 문서)
§125의 7-24(Active/Cold/Archive·Manifest/Integrity·Search/Access/Restore·Domain Retention Customer/Consent/Suppression/Segment/Audience/Event/Metric/AI/Log·Storage Cache/Index/Graph/Queue/DLQ·Backup/Snapshot/Replica·Provider·Processing 종료). Job/Delete/Enforcement=[`CANONICAL_RETENTION_ENFORCEMENT.md`](CANONICAL_RETENTION_ENFORCEMENT.md). **코드변경 0** — Domain/Storage Retention 실 구현은 Storage Conformance+Legacy Equivalence+verify+배포승인 후.
