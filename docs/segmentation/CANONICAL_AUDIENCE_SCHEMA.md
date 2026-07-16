# Canonical Audience Schema — Entity Model, Definition, Version, Snapshot, Member & Static List

> **EPIC 06-A Part 3-1** (1/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1 인벤토리([`SEGMENTATION_PLATFORM_INVENTORY.md`](SEGMENTATION_PLATFORM_INVENTORY.md) §7 Audience 아웃바운드·§1 Audience Snapshot 부재) · Part 2 Canonical Segment([`CANONICAL_SEGMENT_SCHEMA.md`](CANONICAL_SEGMENT_SCHEMA.md))
> 형제: [`CANONICAL_AUDIENCE_BUILD_PIPELINE.md`](CANONICAL_AUDIENCE_BUILD_PIPELINE.md) · [`CANONICAL_AUDIENCE_GOVERNANCE.md`](CANONICAL_AUDIENCE_GOVERNANCE.md) · ADR=[`../architecture/ADR_CANONICAL_AUDIENCE_BUILDER.md`](../architecture/ADR_CANONICAL_AUDIENCE_BUILDER.md)
> **성격**: 목표 계약. 이번 단계는 **Audience Builder Foundation**(외부 Destination 업로드·발송 아님 §3.9). 실 스토어·파이프라인 구현은 후속 승인 세션(verify+배포승인).

---

## 0. 현행 대비 (Part 1 실측 → Canonical)

| 현행(Part 1) | Canonical 목표 | 비고 |
|---|---|---|
| **Audience Definition/Version/Snapshot/Member 엔티티 전무** | 신설(비파괴) | 현재 발송루프가 멤버십 즉석필터 → 스냅샷 없음(SEG-H4) |
| AdAdapters 즉석 업로드(Meta/Google/TikTok, `app_setting` 에 audience_id만) | Destination Membership(Part 3-3) | 본 단계는 그 **앞단(Builder)** 만 |
| 소스=crm_customers.email+channel_orders.buyer_email(cap 10k) | Inclusion Source=Segment Version + Static List | 모호한 "전 고객" → 명시 소스 |
| Exclusion=email_suppression(email만)·phone DNC 부재(SEG-C4) | Exclusion Source 계약 | Consent/Suppression 상세=Part 3-2/3-3 |
| **Static List 업로드 기능 부재**(Part 1 미발견) | Static List Governance 신설 | 진짜 부재 → 신설 정당 |
| audience_mode(retarget/lookalike/prospect) AutoMarketing | Audience Type/Purpose 로 형식화 | 기존 배선 보존 |

**무후퇴**: AdAdapters 실 아웃바운드·audience_mode·해시전용은 **보존**. Canonical Audience 는 그 앞에 Definition→Snapshot 계층을 **추가**(재구현 아님).

---

## 1. Canonical Audience Entity Model (§4)

기존 동등 엔티티 없음(전부 신규) — CE Registry([`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md)) Audience 계열 등재. Segment 계열(Part 2)과 **명확 분리**.

| Entity | 책임 | 현행 |
|---|---|---|
| `AUDIENCE` | 논리 오디언스(불변 identity) | 부재 |
| `AUDIENCE_DEFINITION` | 정의 컨테이너 | 부재 |
| `AUDIENCE_VERSION` | 불변 정의 리비전 | 부재 |
| `AUDIENCE_BUILD_REQUEST` / `AUDIENCE_BUILD_JOB` | 빌드 요청/작업 | 부재 |
| `AUDIENCE_CANDIDATE` | 수집 후보(제외 전) | 부재 |
| `AUDIENCE_MEMBER` | 자격통과 실행후보 | 부재 |
| `AUDIENCE_EXCLUSION` | 제외 결과+사유 | email_suppression(부분) |
| `AUDIENCE_SNAPSHOT` / `AUDIENCE_SNAPSHOT_MEMBER` | 불변 시점 멤버셋 | **부재(SEG-H4/H5)** |
| `AUDIENCE_REFERENCE` / `AUDIENCE_DEPENDENCY` | 참조/의존성 | 부재 |
| `STATIC_LIST` / `_VERSION` / `_MEMBER` | 수동 리스트 | 부재 |
| `INCLUSION_SOURCE` / `EXCLUSION_SOURCE` | 포함/제외 소스 | 부재 |
| `AUDIENCE_APPROVAL` / `AUDIENCE_DIFF` / `AUDIENCE_BUILD_RESULT` | 승인/차이/결과 | 부재 |

---

## 2. Audience ID 정책 (§5)
`audience_id`(ULID·tenant 별도필드) · `audience_definition_id` · `audience_version_id` · `audience_snapshot_id` · `audience_member_id` · `audience_build_id`. Display name 분리 · 재사용/삭제후재사용 금지 · 복제=새 id · Version 변경 시 audience_id 불변 · Template↔Instance 구분. **외부 채널 audience id(Meta CA 등)는 별도**(Destination, Part 3-3) — audience_id 를 외부 PK 로 쓰지 않음(EPIC01 식별자 정책).

---

## 3. Audience Definition Schema (§6)

```
audience_id, audience_definition_id, tenant_id, workspace_id, brand_id, store_id,
name, description, audience_type, purpose,
source_segment_references, inclusion_sources, exclusion_sources,
identity_policy, eligibility_policy_reference, consent_policy_reference,
suppression_policy_reference, freshness_policy, destination_intent,
retention_policy, refresh_policy, schema_version, definition_version,
status, approval_status, owner, created_by, updated_by, created_at, updated_at,
effective_from, effective_to, archived_at, deleted_at
```

- **purpose 필수(§3.2)**: 목적 없는 Audience 생성 금지. purpose 에 따라 허용 Attribute/Identifier/Consent/Destination 상이.
- **destination_intent**: 의도(예: meta_custom_audience/email_broadcast) — 실 실행은 Part 3-3, 여기선 의도만.
- **source_segment_references**: Part 2 `segment_version_id`/`membership_snapshot_id` 고정(§3.3 "현재 Segment" 모호참조 금지).

---

## 4. Audience Type Registry (§7)

DYNAMIC_SEGMENT · STATIC_LIST · COMPOSITE · EXCLUSION · SUPPRESSION · HOLDOUT · CONTROL · TEST · LOOKALIKE_SOURCE · PREDICTIVE · RETARGETING · CRM · MESSAGE · PERSONALIZATION · EXPORT.

**현행 매핑**: audience_mode(retarget→RETARGETING·lookalike→LOOKALIKE_SOURCE·prospect→PREDICTIVE) · 발송 캠페인 segment_id→MESSAGE/CRM · **TEST/DEMO 는 운영 사용 차단**(Runtime Guard, SEG Mock/Demo 원칙).

---

## 5. Audience Version Schema (§8) & 상태 (§9)

```
audience_version_id, audience_id, version_number, previous_version_id, definition_hash,
source_segment_versions, inclusion_source_versions, exclusion_source_versions,
identity_policy_version, eligibility_policy_version, consent_policy_version,
suppression_policy_version, customer_schema_version, audience_schema_version,
purpose, change_type, change_reason, created_by, created_at,
validated_at, approved_at, published_at, effective_from, effective_to,
status, rollback_target_version
```

상태: DRAFT→VALIDATING→{INVALID|VALID}→REVIEW_REQUIRED→APPROVED→PUBLISHED→ACTIVE→BUILDING→BUILT→SUPERSEDED; 분기 ROLLED_BACK/EXPIRED/ARCHIVED/BLOCKED/DELETED. **정책 버전을 버전에 핀 고정**(재현성 — Part 2 §4 동형).

---

## 6. Candidate / Member / Exclusion Schema (§14-19)

### 6.1 Candidate (§14) & 상태 (§15)
`candidate_id, build_job_id, audience_version_id, source_type, source_reference_id, customer_profile_id, person_id, identity_version, inclusion_reason, source_membership_version, candidate_status, candidate_created_at, candidate_expires_at, scope, lineage_id`. 상태: DISCOVERED/INCLUDED_BY_SEGMENT/INCLUDED_BY_STATIC_LIST/INCLUDED_BY_MANUAL_RULE/DUPLICATE_PENDING/IDENTITY_PENDING/ELIGIBILITY_PENDING/EXCLUDED/BLOCKED/READY/EXPIRED.

### 6.2 Member (§16) & 상태 (§17)
`audience_member_id, audience_snapshot_id, audience_version_id, customer_profile_id, person_id, identity_version, membership_status, included_at, effective_from/to, inclusion_source, inclusion_reason, exclusion_reason, eligibility_status, selected_identifier_type, selected_identifier_reference, quality_status, freshness_status, consent_status_reference, suppression_status_reference, lineage_id, audit_reference`.
- **★식별자 원문 미복제(§16 말미)**: Snapshot 에 외부 Identifier 원문 불필요 복제 금지 → `selected_identifier_reference`(참조/해시)만. 현행 AdAdapters 는 해시전용(정합) — Canonical 도 원문 비영속 유지.
- 상태: CANDIDATE/ELIGIBLE/INCLUDED/EXCLUDED/BLOCKED_{IDENTITY,SCOPE,CONSENT,SUPPRESSION,DELETION,FRESHNESS}/DUPLICATE/EXPIRED/REMOVED/ERROR.

### 6.3 Exclusion (§18) & Type (§19)
`exclusion_id, build_job_id, audience_version_id, customer_profile_id, person_id, exclusion_type, exclusion_source, exclusion_rule_id, exclusion_reason_code, excluded_at, effective_until, policy_version, override_allowed, override_approval_reference, lineage_id, audit_reference`.
Type: LEGAL_BLOCK · GLOBAL_SUPPRESSION · CHANNEL_SUPPRESSION · BRAND_SUPPRESSION · EXPLICIT_EXCLUSION · STATIC_EXCLUSION_LIST · DELETED_PROFILE · ANONYMIZED_PROFILE · IDENTITY_CONFLICT · LOW_IDENTITY_CONFIDENCE · UNVERIFIED_IDENTIFIER · STALE_PROFILE · CONSENT_MISSING · CONSENT_WITHDRAWN · FREQUENCY_CAP · HOLDOUT · TEST_DATA · DEMO_DATA · CROSS_SCOPE · DESTINATION_INELIGIBLE.

---

## 7. Audience Snapshot Schema (§20-22)

```
audience_snapshot_id, audience_id, audience_version_id, build_job_id,
tenant_id, workspace_id, brand_id, purpose, snapshot_version, snapshot_time, evaluation_time,
source_segment_versions, identity_policy_version, eligibility_policy_version,
consent_policy_version, suppression_policy_version,
total_candidate_count, included_count, excluded_count, duplicate_count, blocked_count,
checksum, status, immutable, expires_at, created_by, created_at, lineage_id, approval_reference
```

상태: CREATING/VALIDATING/READY/APPROVAL_REQUIRED/APPROVED/LOCKED/SUPERSEDED/EXPIRED/INVALID/ROLLED_BACK/ARCHIVED/DELETED.

### 7.1 불변성 (§22, §3.4)
승인 Snapshot Member 변경 금지 · 추가/삭제=**새 Snapshot 생성**(version 증가) · Checksum 유지 · Source/정책 Version 보존 · 실행후 감사 보존 · Rollback Reference 보존. **이것이 SEG-H4(과거 대상 재현)·SEG-H5(Reconciliation 기준) 해소의 핵심.**

---

## 8. Inclusion / Exclusion Source (§23-24) & Composite (§26)

### 8.1 Inclusion Source (§23)
Segment Version · Segment Snapshot · Static List Version · Manual Selection · Customer Query Result · Cohort Version · Predictive Segment Version · Holdout Assignment · External Imported List. 각 `source_id, source_version, scope, owner, status, freshness, permission, lineage, allowed_purpose`.

### 8.2 Exclusion Source (§24)
Exclusion Segment · Suppression List · Static Exclusion List · Legal Block List · Holdout Group · Previous Campaign Audience · Recent Contact List · **Customer Deletion Tombstone** · Fraud Block List · Manual Exclusion. **현행=email_suppression 만**(phone/legal/tombstone 부재 SEG-C4/H3) → 신규 소스 유형.

### 8.3 Composite Audience (§26)
UNION/INTERSECTION/DIFFERENCE/MINIMUM_MATCH · source audience/snapshot versions · evaluation time · identity policy · duplicate policy · exclusion priority · version pinning · **circular reference detection**.

---

## 9. Static List Schema (§27-29)

**현행 부재 → 신규**(진짜 부재 확인, 신설 정당). 
```
static_list_id, static_list_version_id, tenant_id, workspace_id, brand_id,
name, purpose, identifier_type, source_file_reference, upload_method, owner,
consent_evidence_reference, retention_policy, status, created_by, created_at,
expires_at, deleted_at, audit_reference
```

- **Validation(§28)**: File Type/Size · **Malware Scan** · Encoding · Header Schema · Identifier Type/Format · Tenant Scope · Duplicate · Invalid Record · **Consent Evidence** · Suppression · Data Classification · Retention · Download 권한 · Delete · Audit.
- **금지(§29)**: Public URL 직접 Import · 평문 PII 장기보관 · Tenant 없는 파일 · Consent 근거없는 마케팅 List · 미검증 Vendor List · 목적불명 · Hardcoded Customer ID · 만료없는 임시 List · Audit 없는 다운로드/재사용.
- 상세 보안 거버넌스=[`CANONICAL_AUDIENCE_GOVERNANCE.md`](CANONICAL_AUDIENCE_GOVERNANCE.md) §Static List Security.

---

## 10. Audience Schema Matrix (§86)

| Entity | Canonical ID | Scope | Version | Immutable | Source | Store | Risk |
|---|---|---|---|---|---|---|---|
| AUDIENCE | audience_id | tenant/ws/brand | via VERSION | — | 신규 | — |
| AUDIENCE_VERSION | audience_version_id | 상속 | 불변 | 정의부 | 신규 | 미도입 시 재현불가 |
| AUDIENCE_SNAPSHOT | audience_snapshot_id | tenant/ws/brand | 불변 | ✔ | 신규 | **SEG-H4/H5 해소 핵심** |
| AUDIENCE_MEMBER | audience_member_id | tenant | snapshot 종속 | ✔ | 신규 | PII(식별자 원문 미복제) |
| STATIC_LIST | static_list_id | tenant/ws/brand | version | 버전불변 | 신규 | PII·Consent Evidence 필수 |

---

## 11. 완료 조건 대응 (본 문서)
§92의 1(Entity Model)·2(Definition/Version)·4(Candidate/Member/Exclusion)·5(Snapshot 불변성)·7(Inclusion/Exclusion Source)·8(Composite)·9(Static List Schema/Validation/Security). Build/Pipeline=[`CANONICAL_AUDIENCE_BUILD_PIPELINE.md`](CANONICAL_AUDIENCE_BUILD_PIPELINE.md). 거버넌스/보안=[`CANONICAL_AUDIENCE_GOVERNANCE.md`](CANONICAL_AUDIENCE_GOVERNANCE.md). **코드변경 0** — 스토어·마이그레이션은 후속 승인 세션.
