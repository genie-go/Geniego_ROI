# Canonical Privacy — Purpose Binding, Minimization, Consumer Access, Notice, Processor & Data Sharing Governance

> **EPIC 06-A Part 3-3-3-1** (2/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: No-PII 집계(Decisioning v418.1)·DataPlatform 출처(272차)·AdAdapters 외부공유·데이터 헌법 Vol2(Source Architecture) · 형제: [`CANONICAL_PRIVACY_SCHEMA.md`](CANONICAL_PRIVACY_SCHEMA.md) · [`CANONICAL_PRIVACY_ENFORCEMENT.md`](CANONICAL_PRIVACY_ENFORCEMENT.md)
> **성격**: 목표 계약. 실 구현은 후속 승인 세션.

---

## 1. Purpose Binding (§21) & Mapping (§22-24)

**Binding Contract(§21)**: 모든 처리 요청에 processing_activity_id · purpose_id · subject · data_categories · actor · consumer · destination · tenant/ws/brand · evaluation_stage · policy_version · evaluation_time · correlation_id. **Purpose 없는 데이터 조회/Export/AI 호출/Audience 실행 금지**.
- **Source-to-Purpose(§22)**: source_system · source_account · collected_data_categories · original_purposes · notice_version · consent scope · **allowed_secondary_purposes · prohibited_purposes** · processor_status · sharing_restriction · region · trust_level · certification_status. (DataPlatform data_source 272차 확장.)
- **Purpose-to-Consumer(§23)**: Consumer(Customer360 UI/Admin/Support/CRM/Segment/Audience/Email/SMS/Push/Advertising/Recommendation/AI Assistant/Automation/Analytics/Export/Fraud/Security/Data Science/External API) → 허용 Purpose + 최소 Field Set.
- **Purpose-to-Destination(§24)**: Destination(Internal DB/Warehouse/Search/Graph/Cache/Email/SMS/Push Provider/CRM/Ad Platform/AI Provider/Analytics/Storage/External Export/Partner API) — **내부 처리 승인 ≠ 외부 Destination 공유 승인**(§3.8).

## 2. Purpose Compatibility (§25-26) & Secondary Use (§27-28)
**Compatibility(§25)**: Original/Proposed Purpose · Subject Expectation · Data Category · Sensitivity · Collection Context · Notice · Consent · Lawful Basis · Consumer · Recipient · Consequence · Safeguards · Retention · Profiling · Automated Decision · Cross-border · Minor 영향. **상태(§26)**: COMPATIBLE/COMPATIBLE_WITH_CONTROLS/RECONSENT_REQUIRED/NEW_NOTICE_REQUIRED/PRIVACY_REVIEW_REQUIRED/LEGAL_REVIEW_REQUIRED/INCOMPATIBLE/BLOCKED/**UNKNOWN**. UNKNOWN=신규 Processing 기본 차단.
**Secondary Use Governance(§27)**: Change Request → 기존 Purpose 조회 → Compatibility Assessment → Minimization → Sensitive 검토 → Lawful Basis → Consent/Notice → Consumer/Destination → Privacy Impact Review → Security → Approval → Feature Flag → Audit → 재인증.
**★금지 예(§28·§3.4)**: Support Ticket→광고 Targeting · 배송주소→행동프로파일링 · Fraud Signal→마케팅 최적화 · Payment→추천 Feature · CS 감정분석→가격차별 · Sensitive Inference→Lookalike Source · Consent Record→마케팅 성향 Feature. **Matrix(§95)**: | Original | Proposed | Data Category | Sensitivity | Notice | Consent | Safeguards | Decision | Review | Evidence |

## 3. Data Minimization (§29-32) & Field Policy (§30) & Consumer Contract (§33-35)
**Minimization Profile(§29)**: minimization_profile_id · purpose_id · required/optional/prohibited/derived_fields · aggregation_level · masking_level · pseudonymization_required · retention_class · export_allowed · raw_data_allowed · owner · version · status.
**Field Usage Policy(§30)**: field_id · data_category · sensitivity · allowed/prohibited_purposes · allowed_consumers/destinations · masking/raw_access/aggregation policy · profiling/automated_decision/AI_usage/export allowed · notice/consent requirement · retention_class · owner · version.
**Field Runtime Enforcement(§31)**: Query/Segment/AI/Export 시 Purpose·Consumer·Actor·Scope·Field Allowlist·Classification·Sensitive·Consent·Suppression·Destination·Policy Version·Audit 검사. **Minimization 상태(§32)**: COMPLIANT/EXCESS_DATA_REQUESTED/PROHIBITED_FIELD/SENSITIVE_FIELD_REVIEW/RAW_DATA_NOT_ALLOWED/AGGREGATION_REQUIRED/MASKING_REQUIRED/PSEUDONYMIZATION_REQUIRED/BLOCKED.
**Consumer Data Access Contract(§33)**: consumer_id · purpose_ids · allowed_subject_types/data_categories/fields · prohibited_fields · PII level · masking/aggregation level · export permission · third_party status · destination scope · retention behavior · logging requirement · approval · owner · version · certification.
**★PII Level(§34·§3.7)**: NONE/AGGREGATE_ONLY/PSEUDONYMOUS/MASKED/OPERATIONAL_IDENTIFIER/LIMITED_PII/FULL_PII/HIGHLY_RESTRICTED. **Audience/CRM/AI/Recommendation/Automation 이 동일 Full Profile 받지 않음**(현행 Decisioning AGGREGATE_ONLY·No-PII 정합·확장). **Purpose-bound Token(§35)**: purpose/activity/actor/tenant-brand/consumer/data-category/destination claim · policy version · expiry · correlation · signature. **Client 조작 방지=서버 발급·검증**. **Matrix(§96)**: | Consumer | Purpose | Allowed Fields | PII Level | Masking | Destination | Export | Approval | Version | Status |

## 4. Privacy Notice (§36-39)
**Registry(§36)**: notice_id/version_id · tenant/brand · jurisdiction · locale · subject_types · purposes · data_categories · recipients · processors · third_party_sharing · cross_border · profiling · automated_decision · retention_summary · rights_summary · effective_from/to · published_at · status · content_hash · owner · approvers. **상태(§37)**: DRAFT/REVIEW_REQUIRED/APPROVED/PUBLISHED/ACTIVE/SUPERSEDED/WITHDRAWN/EXPIRED/BLOCKED.
**Alignment(§38·§3.9)**: Processing Activity 가 Notice 의 Purpose/Data Category/Consumer/Recipient/Third-party/Profiling/Automated Decision/Cross-border/Retention/Rights 와 일치하는지 검증. **Notice 없는 Material Processing 자동실행 금지**.
**Disclosure Evidence(§39)**: disclosure_id · subject · notice_version · locale · presentation channel · presented_at · acknowledged · consent evidence reference · session · source · audit. **단순 페이지 존재를 전 Subject 고지 Evidence 로 간주 금지**.

## 5. Processor (§40-42) & Recipient (§43) & Data Sharing (§44-45)
**Processor Registry(§40)**: processor_id · legal_name · service · processing_activities · data_categories · purposes · regions · subprocessors · security/privacy_status · agreement_reference · retention · deletion/DSAR/incident support · audit_capability · owner · status · version · certification. **Subprocessor(§41)**: parent_processor_id · legal_name · service · data_categories · region · purpose · agreement · effective_date · notification_requirement · status. **상태(§42)**: PROPOSED/REVIEW_REQUIRED/APPROVED/ACTIVE/RESTRICTED/SUSPENDED/TERMINATED/BLOCKED.
**Recipient Governance(§43)**: recipient_id · type · legal_entity · purpose · data_categories · sharing_mechanism · consent_requirement · lawful_basis · jurisdiction · region · retention · onward_sharing · deletion/audit support · agreement · owner · approval · status. (외부 광고채널=AdAdapters·CRM Sync·AI Provider 등 실 recipient 등록.)
**Data Sharing Activity(§44)**: sharing_activity_id · processing_activity_id · sender · recipient · purpose · data_categories · fields · subject_types · frequency · mechanism · destination_account · encryption · consent/suppression_policy · retention · removal_capability · reconciliation · approval · status · version.
**Sharing Runtime Gate(§45)**: 외부 공유 전 Approved Sharing Activity · Purpose · Recipient · Destination Account · Data Category · Field Allowlist · Consent · Suppression · Subject Status · Retention · Region · Encryption · Agreement Status · Policy Version · Kill Switch · Audit 검증. (AdAdapters audience 업로드=Data Sharing Activity 로 형식화·Part3-3-2 Removal/Reconciliation 연계 SEG-H2.)

---

## 6. 완료 조건 대응 (본 문서)
§99의 8-20(Purpose Binding/Source·Consumer·Destination Mapping·Compatibility/Secondary Use·Minimization/Field Policy·Consumer Contract/PII Level·Notice/Alignment·Processor/Recipient/Data Sharing). Runtime Enforcement/Profiling/AI=[`CANONICAL_PRIVACY_ENFORCEMENT.md`](CANONICAL_PRIVACY_ENFORCEMENT.md). **코드변경 0** — Purpose 강제·Minimization·Sharing Gate 실 구현은 Golden+Conformance+Equivalence+verify+배포승인 후.
