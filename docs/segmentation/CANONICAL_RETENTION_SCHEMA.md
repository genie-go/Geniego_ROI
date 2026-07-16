# Canonical Retention Schema — Data Asset, Retention Policy/Class/Trigger, Calculation, Legal Hold & Exception

> **EPIC 06-A Part 3-3-3-2** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: 기존 인프라(MySQL/SQLite·install_crontab cron·email_suppression DSAR 보존 Part1·Dsar 삭제·**dist.bak 누적 FS 100% 트랩 278차**·ai_settings) · Part 3-3-3-1 Privacy(Retention Class·Purpose 종료)
> 형제: [`CANONICAL_RETENTION_DOMAIN_STORAGE.md`](CANONICAL_RETENTION_DOMAIN_STORAGE.md) · [`CANONICAL_RETENTION_ENFORCEMENT.md`](CANONICAL_RETENTION_ENFORCEMENT.md) · ADR=[`../architecture/ADR_RETENTION_ARCHIVAL_DATA_LIFECYCLE.md`](../architecture/ADR_RETENTION_ARCHIVAL_DATA_LIFECYCLE.md)
> **성격**: 목표 계약. DSAR/RTBF/Cross-border=Part 3-3-3-3~6. 실 Registry/Job 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| 정식 Retention Registry/TTL Manager **부재**(테이블별 산발적·cron 일부) | Data Asset Registry + Retention Policy/Class/Trigger 신설 |
| Dsar 삭제(crm_customers+members+prefs)·email_suppression 보존(Part1) | Deletion Eligibility·Suppression Retention(Hash 최소화) 형식화 |
| **dist.bak 누적 FS 100%(278차 트랩)** | Backup/Snapshot Retention·Orphan/Shadow 탐지(재발방지) |
| ai_settings·AI prompt(ClaudeAI/AiGenerate) | AI Prompt/Output/Dataset Retention(§Domain) |
| install_crontab.sh cron(SMS 예약워커 286차 등) | Retention Expiry Job 형식화 |
| DataPlatform 출처·계보(272차) | Data Asset Lineage 편입 |

**무후퇴**: 기존 cron cleanup·backup·restore·email_suppression 보존·Db.sqlite fallback 은 **정본 — 재구현 금지, Lifecycle Governance 로 확장**. 기능/채널/Storage별 독립 Retention Engine 신설 금지(§126).

---

## 1. Canonical Data Lifecycle Entity Model (§4)

Entity: `DATA_ASSET(_VERSION/_LOCATION)` · `RETENTION_POLICY(_VERSION)` · `RETENTION_CLASS` · `RETENTION_TRIGGER` · `RETENTION_CALCULATION` · `LIFECYCLE_STATE` · `LIFECYCLE_TRANSITION` · `ARCHIVE_POLICY/OBJECT/MANIFEST/ACCESS_REQUEST/RESTORE_REQUEST` · `DELETION_ELIGIBILITY_RESULT` · `RETENTION_EXCEPTION` · `LEGAL_HOLD` · `INCIDENT_HOLD` · `DISPUTE_HOLD` · `RETENTION_EXPIRY_JOB` · `RETENTION_ACTION_RESULT` · `BACKUP_RETENTION_POLICY` · `BACKUP_DELETION_REPLAY` · `RETENTION_RECONCILIATION` · `ORPHAN_DATA_FINDING` · `SHADOW_COPY_FINDING` · `RETENTION_AUDIT_EVENT`. (기존 등가=cron/backup 부분 → 확장·나머지 신규.)

---

## 2. Data Asset Registry (§5-7)

**Schema(§5)**: data_asset_id · name · asset_type · canonical_entity · source_of_truth_status · tenant/ws/brand_scope · environment · region · storage_system · storage_location · schema_version · data_categories · sensitive_categories · purposes · consumers · processors · owner · retention_policy_id · retention_class_id · encryption/backup/archive_status · deletion/anonymization/restoration_capability · status · created/updated/last_reviewed_at · certification_status.
**Asset Type(§6, 31종)**: PRIMARY/SECONDARY_TABLE · EVENT/IDENTITY/CONSENT/SUPPRESSION/MEMBERSHIP/AUDIENCE_STORE · ANALYTICS_TABLE · MATERIALIZED_VIEW · CACHE · SEARCH_INDEX · GRAPH_STORE · QUEUE · DLQ · OBJECT_STORAGE · EXPORT_FILE · TEMPORARY_FILE · LOG · AUDIT_LOG · SECURITY_LOG · BACKUP · SNAPSHOT · REPLICA · ARCHIVE · MODEL_DATASET · FEATURE_STORE · VECTOR_STORE · AI_PROMPT_LOG · AI_OUTPUT_STORE · THIRD_PARTY_DESTINATION.
**Source of Truth 상태(§7)**: CANONICAL_SOURCE_OF_TRUTH · AUTHORIZED_REPLICA · DERIVED_PROJECTION · CACHE · INDEX · ANALYTICS_COPY · ARCHIVE_COPY · BACKUP_COPY · TEMPORARY_COPY · EXTERNAL_COPY · LEGACY_SOURCE · UNVERIFIED · **ORPHAN · SHADOW_COPY**.
**Matrix(§119)**: | Asset ID | Asset Type | Source of Truth | Data Categories | Purpose | Storage | Region | Retention Policy | Hold | Lifecycle State | Owner |

---

## 3. Lifecycle 상태 (§8)
CREATED/ACTIVE/WARM/INACTIVE/COLD/ARCHIVE_PENDING/ARCHIVED/RESTRICTED/HOLD/EXPIRY_PENDING/DELETION_ELIGIBLE/DELETION_PENDING/ANONYMIZATION_PENDING/DELETED/ANONYMIZED/RESTORE_PENDING/RESTORED/FAILED/BLOCKED/UNDER_REVIEW. **Transition Matrix(§121)**: | Current State | Trigger | Next State | Required Approval | Validation | Action | Rollback | Evidence |

---

## 4. Retention Policy (§9-10) & Class (§11-12) & Trigger (§13-15)

**Policy(§9)**: retention_policy_id · policy_name/type · applicable_assets/data_categories/purposes/subject_types · jurisdiction/tenant/brand/environment_scope · retention_trigger_id · active_period · inactive_period · archive_period · **total_max_period** · grace_period · action_on_expiry · anonymization/aggregation_rule · legal_hold/backup/restore_behavior · exception_policy · review_frequency · owner · approvers · version · status · effective_from/to. **상태(§10)**: DRAFT/REVIEW_REQUIRED/APPROVED/ACTIVE/RESTRICTED/SUPERSEDED/SUSPENDED/REVOKED/EXPIRED/BLOCKED. **Matrix(§120)**: | Policy ID | Data Category | Purpose | Trigger | Active Period | Archive Period | Final Action | Hold Behavior | Backup Rule | Version | Status |
**Class(§11-12)**: TRANSIENT/SESSION/SHORT_TERM/OPERATIONAL/CUSTOMER_RELATIONSHIP/CONTRACTUAL/TRANSACTIONAL/COMPLIANCE/SECURITY/CONSENT_EVIDENCE/SUPPRESSION_PROTECTION/ANALYTICS_LIMITED/ARCHIVAL/LEGAL_HOLD/BACKUP_LIMITED/MODEL_DATASET_LIMITED/PERMANENTLY_PROHIBITED. **★`PERMANENT` 를 일반 Class 로 사용 금지**. 필드: default_trigger/period · maximum_period · archive/anonymization/legal_hold_allowed · backup_rule.
**Trigger(§13)**: RECORD_CREATED · LAST_UPDATED · LAST_ACCESSED · CUSTOMER_RELATIONSHIP_ENDED · CONTRACT_ENDED · TRANSACTION/DELIVERY/REFUND/CAMPAIGN/JOURNEY_COMPLETED · CONSENT_WITHDRAWN/EXPIRED · SUPPRESSION_RELEASED · IDENTIFIER_INVALIDATED · ACCOUNT_CLOSED · SUBSCRIPTION_ENDED · PROFILE_DELETED · LAST_INTERACTION · MODEL_VERSION_RETIRED · DATASET_REPLACED · POLICY_SUPERSEDED · INCIDENT_CLOSED · LEGAL_HOLD_RELEASED · EXPORT/TEMPORARY_JOB_COMPLETED · SNAPSHOT_SUPERSEDED.
**Trigger Contract(§14)**: trigger_id · source_event · trigger_time · authoritative/fallback source · missing_trigger_policy · correction/backfill_policy · timezone · idempotency · audit. **★Missing Trigger(§15)**: MANUAL_REVIEW/CONSERVATIVE_MAX/MIN_RETENTION/BLOCK_DELETION/RECONSTRUCT_FROM_AUDIT/USE_CREATED_AT_WITH_WARNING. **고위험 데이터 임의날짜 추정 금지**(임의숫자 금지 원칙 정합).

---

## 5. Retention Calculation Engine (§16-18)
**Input(§16)**: Data Asset · Data Category · Purpose · Subject Type · Trigger · Trigger Time · Jurisdiction · Contract · Consent/Suppression Status · Customer Relationship · Legal/Incident Hold · Policy Version · Exception · Evaluation Time. **Output**: active_until · archive_eligible_at · delete_eligible_at · anonymize_eligible_at · legal_hold_status · next_action · reason_codes · policy_versions · confidence · manual_review_requirement.
**우선순위(§17)**: ①Legal Hold ②Incident/Dispute Hold ③법적·계약 최소보존 ④명시 삭제/제한 요구 ⑤Purpose 종료 ⑥Consent Withdrawal 효과 ⑦Data Category 최대기간 ⑧Processing Activity 기간 ⑨Archive ⑩Backup ⑪예외 ⑫Default 최소. **법률 충돌 자동확정 금지**(LEGAL_REVIEW_REQUIRED). **Decision 상태(§18)**: RETAIN_ACTIVE/MOVE_TO_COLD/ARCHIVE/RESTRICT_ACCESS/ANONYMIZE/AGGREGATE/DELETE/HOLD/MANUAL_REVIEW/BLOCKED/ERROR.

---

## 6. Legal/Incident/Dispute Hold (§32-36) & Exception (§37-38)
**Hold Entity(§32)**: hold_id · hold_type · case_reference · applicable_subjects/assets/data_categories · tenant/brand_scope · time_range · reason · legal_owner · approved_by · effective_from · review_at · released_at · release_approval · status · audit_reference. **Type(§33)**: LEGAL/LITIGATION/REGULATORY/INCIDENT/SECURITY/FRAUD_INVESTIGATION/DISPUTE/CONTRACT/DSAR_PRESERVATION_HOLD. **상태(§34)**: DRAFT/ACTIVE/REVIEW_REQUIRED/PARTIALLY_RELEASED/RELEASE_PENDING/RELEASED/EXPIRED/INVALID/BLOCKED.
**★적용원칙(§35·§3.4)**: 범위 최소화 · 기간 제한 · 정기 검토 · 접근 제한 · 목적외 사용 금지 · 삭제 Workflow 충돌 명시처리 · Archive 위치 기록 · **Release 후 Retention 재계산** · Audit. **삭제요청 충돌(§36)**: 삭제요청 기록 · Hold 범위만 제한보존 · 비대상 삭제 계속 · 접근/Processing 제한 · 고객응답 상태 · Hold Release 후 삭제 재개 · Audit. **Matrix(§122)**: | Hold ID | Type | Scope | Data Assets | Time Range | Effective From | Review Date | Release | Owner | Status |
**Exception(§37-38)**: exception_id · data_asset · policy · requested/original_period · reason · scope · data_category · risk · requester · approvers · effective_from · expiry · review_date · status · audit. **무기한 예외 금지**. 상태: REQUESTED/REVIEW_REQUIRED/APPROVED/CONDITIONALLY_APPROVED/REJECTED/EXPIRED/REVOKED/BLOCKED.

---

## 7. 절대 원칙 요약 (§3)
①무기한 보존 금지(§3.1) ②전역 단일기간 금지(§3.2) ③Archive≠삭제 대체(§3.3) ④Legal Hold 범위 최소(§3.4) ⑤Backup 있다고 삭제 무시 금지(§3.5 Tombstone/Replay) ⑥Cache/Index/Queue도 Lifecycle 대상(§3.6) ⑦Audit 보존≠Full PII 보존(§3.7 Reference/Hash) ⑧Expiry≠즉시 Hard Delete(§3.8 Delete/Anonymize/Aggregate/Archive/Tombstone) ⑨조기삭제·과도보존 **둘 다 결함**(§3.9) ⑩기존 Lifecycle 후퇴 금지(§3.10).

---

## 8. 완료 조건 대응 (본 문서)
§125의 1-6(Entity/Data Asset/SoT·Lifecycle State/Retention Policy·Versioning/Class·Trigger/Calculation)·11-13(Legal/Incident/Dispute Hold·범위최소·Exception). Domain/Storage=[`CANONICAL_RETENTION_DOMAIN_STORAGE.md`](CANONICAL_RETENTION_DOMAIN_STORAGE.md). Job/Delete/Reconcile/Enforcement=[`CANONICAL_RETENTION_ENFORCEMENT.md`](CANONICAL_RETENTION_ENFORCEMENT.md). **코드변경 0** — Registry/Calculation Engine 실 구현은 후속 승인 세션.
