# Canonical Audience Governance — Approval, API/UI, Queue/Cache, Rollback, Lint/Guard, Static-List Security & Test

> **EPIC 06-A Part 3-1** (3/3) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거: Part 1(AdAdapters 아웃바운드·소비자 4중복·SEG-H1/H2/H3/H5) · 형제: [`CANONICAL_AUDIENCE_SCHEMA.md`](CANONICAL_AUDIENCE_SCHEMA.md) · [`CANONICAL_AUDIENCE_BUILD_PIPELINE.md`](CANONICAL_AUDIENCE_BUILD_PIPELINE.md) · ADR=[`../architecture/ADR_CANONICAL_AUDIENCE_BUILDER.md`](../architecture/ADR_CANONICAL_AUDIENCE_BUILDER.md)
> **성격**: 거버넌스 계약. 실 CI 가드·구현은 후속 승인 세션.

---

## 1. Approval (§47-48)

**수준(§47)**: No / Owner / Marketing / Data Owner / Privacy / Destination Account / Automation Risk / Multi-party Approval.
**강화 승인 필수(§48)**: PII 포함 · External Export 예정 · Advertising/CRM Write/Email·SMS·Push 예정 · Predictive/Lookalike Source · 대규모 Audience · 큰 Version Diff · Sensitive Attribute · Static Vendor List · High Wrong-target Risk · Low Identity Confidence 포함 요청. (MARKETING_INTELLIGENCE_AUTOMATION 헌법 안전자동화 정합.)

---

## 2. API (§59-60) & UI (§61-62)

### 2.1 Audience Query API (§59)
Definition/Version 조회 · Build 요청 · Preview · Count · Sample · Diff · Snapshot 조회 · Member 조회 · Exclusion 조회 · Explain · Lineage · Approval · Cancel · Rebuild · Archive · Delete.
**Scope/Permission(§60)**: Actor 인증 · Tenant/Workspace/Brand Scope · Audience Ownership · Permission · **PII Masking** · Rate Limit · Pagination · Audit · Idempotency · Error Contract. (신규 API 는 `/api` 접두 필수 — reference_api_prefix_routing.)

### 2.2 UI (§61) & 금지 (§62)
UI: Audience 목록/생성 · Purpose/Segment Version 선택 · Inclusion/Exclusion Source · Identity/Consent/Suppression/Refresh 정책 · Preview/Count/Sample · **Exclusion Breakdown** · Diff · Approval · Build Status · Snapshot History · Explain · Audit · Archive/Delete.
**금지(§62)**: Published Segment "현재값"만 선택 · Destination Account 자동추정 · **Consent Filter 숨김** · Exclusion 결과 미표시 · Approximate Count 를 Exact 처럼 표시 · PII 무단 Sample · **Build 실패를 성공으로 표시**(가짜녹색 — Part1 정합) · Partial Snapshot 을 실행가능으로 표시 · Test↔Production Audience 혼합.

---

## 3. Queue (§63-64) & Cache (§65-66)

- **Queue Payload(§63)**: build_job_id·tenant/ws/brand·audience_version_id·source_version_set·evaluation_time·policy_version_set·environment·checkpoint·retry_count·correlation_id. **Customer PII 원문 Queue 불포함**(SEG-H1 정합·해시/참조만).
- **Queue 격리(§64)**: Tenant Partition · Environment 분리 · Retry/DLQ Scope · Poison Message · Duplicate Delivery · Out-of-order Job · Cancelled Build 차단 · Version 변경 후 오래된 Job 차단.
- **Cache Key(§65)**: tenant/ws/brand·audience_id·audience_version_id·snapshot_id·build_mode·정책 versions·evaluation_time·permission_version·environment.
- **무효화(§66)**: Definition/Segment Version/Membership/Merge-Unmerge/Consent/Suppression/삭제/Static-List/Policy/Permission 변경·Snapshot 만료 시.

---

## 4. Rollback Foundation (§67) & 삭제 (§68-69)

- **Rollback(§67)**: 이전 Audience Version 복구 · 이전 Snapshot 사용 · Build 취소 · Partial Build 폐기 · 잘못된 Snapshot 무효화 · Cache Purge · Source Version 복구 · Approval 취소 · **Destination 실행 차단**. 외부 Destination Rollback 은 후속(Part 3-3). 현행 인프라: dist.bak/파일원복(288차 등가) + 버전 previous_version_id.
- **Audience 삭제(§68)**: Active Snapshot · Approval · Destination 사용 · Campaign/Journey/Automation/Report 참조 · Child Composite · Static List 참조 확인 후 · **Soft Delete/Archive 우선**.
- **Static List 삭제(§69)**: File Reference/Parsed Member 삭제 · Derived Audience 영향 · Snapshot 보존정책 · PII Retention · Download Link 무효화 · Cache Purge · Audit.

---

## 5. Static List Security Governance (§28-29 상세)
업로드 경로: Malware Scan · Encoding/Header/Identifier Validation · Tenant Scope · **Consent Evidence 필수(마케팅 List)** · Suppression 대조 · Data Classification(RESTRICTED) · Retention/Expiry · Download 권한/제한 · Delete · Audit. **금지**: Public URL Import · 평문 PII 장기보관 · Tenant 없는 파일 · Consent 근거없는 List · 미검증 Vendor List · Hardcoded Customer ID · 만료없는 임시 List. (현행 Static List 기능 부재 → 신설 시 본 거버넌스 준수.)

---

## 6. Static Lint (§73) & Runtime Guard (§74)

### 6.1 Static Lint (CI 신규 G-가드 후보 — 구현은 승인세션)
탐지: Segment Version 없는 Audience · Snapshot 없이 실행 참조 · Tenant Scope 없는 Build · **Destination Intent 없는 Audience** · Direct Customer ID List · **Hardcoded Customer List** · Consent/Suppression Policy 누락 · Static List Consent Evidence 누락 · Published Snapshot 직접수정 · Direct Audience Member Write · **Audience Builder 우회** · Test/Demo Audience 운영사용 · Audit 없는 Approval · Version 없는 Composite · Circular Audience Reference · **PII Queue Payload** · Raw PII Cache. (기존 G9/G10/G11 패턴·오탐 검증 후 도입.)

### 6.2 Runtime Guard (§74)
차단: **Cross-Tenant/Cross-Workspace/Cross-Brand Audience Source** · Unpublished Segment Version · Invalid Static List · Deleted Source Profile · Deleted Segment · **Expired Snapshot** · Identity Conflict · Low Identity Confidence · Consent/Suppression Policy Missing · **Partial Build 실행** · Invalid Checksum · **Unapproved Snapshot** · Test/Demo 의 Production 사용 · Circular Composite · Stale Source Version · Cancelled Build 재개. (286차 platform_growth act-as 하이재킹 클래스 회귀방지 포함.)

---

## 7. Error (§75) & Warning (§76)
**Error**: AUDIENCE_DEFINITION_INVALID · AUDIENCE_VERSION_NOT_{FOUND,PUBLISHED} · AUDIENCE_SOURCE_INVALID · SEGMENT_VERSION_REQUIRED · STATIC_LIST_INVALID · AUDIENCE_SCOPE_VIOLATION · AUDIENCE_BUILD_{DUPLICATE,LOCKED,FAILED,PARTIAL} · AUDIENCE_SNAPSHOT_{INVALID,EXPIRED,NOT_APPROVED} · IDENTITY_POLICY_FAILED · CONSENT_POLICY_REQUIRED · SUPPRESSION_POLICY_REQUIRED · AUDIENCE_PERMISSION_DENIED · **TEST_AUDIENCE_PRODUCTION_BLOCKED** · AUDIENCE_REFERENCE_CYCLE · AUDIENCE_CHECKSUM_MISMATCH.
**Warning**: APPROXIMATE_AUDIENCE_COUNT · STALE_SEGMENT_MEMBERSHIP · HIGH_DUPLICATE_RATE · SHARED_IDENTIFIER_DETECTED · LOW_IDENTITY_CONFIDENCE_EXCLUDED · CONSENT/SUPPRESSION_RECHECK_REQUIRED · LARGE_AUDIENCE_DIFF · HIGH_BUILD_COST · PARTIAL_SOURCE_WARNING · LEGACY_AUDIENCE_SOURCE_USED · STATIC_LIST_EXPIRING · SNAPSHOT_EXPIRING · MANUAL_REVIEW_RECOMMENDED.

---

## 8. Golden Dataset (§77) & Build Equivalence (§78-79)

**Golden Audience Dataset(§77, 운영 Customer 미사용)**: 35+ 시나리오 — 단일/Union/Intersection/Difference Segment · Static Inclusion/Exclusion · Global Suppression · Deleted/Anonymized Profile · Low Confidence · Identity Conflict · Duplicate Profile/Person/Identifier · Shared Email/Phone · Merge/Unmerge 직후 · Consent Granted/Unknown/Withdrawn · Stale Membership · Expired Snapshot · Partial Build · Build Retry/Cancellation · Idempotent Rebuild · Snapshot Checksum · Version Diff · **Cross-Tenant/Cross-Brand Source 차단** · **Demo Audience 차단** · Static List 만료 · **Composite Cycle 차단** · Previous Snapshot Rollback.

**Build Equivalence(§78-79)**: Legacy(현행 발송루프 대상) vs Canonical Build 비교 — Candidate/Unique Profile/Unique Person/Included/Excluded/Duplicate Count · Consent/Suppression/Identity Exclusion · Member Set · Exclusion Reason · Snapshot Version · Build Time · Error/Warning.
Difference: MATCH / EXPECTED_{DEDUPLICATION,SCOPE,IDENTITY,CONSENT,SUPPRESSION,TEST_DATA_REMOVAL}_CORRECTION / LEGACY_SECURITY_DEFECT / **LEGACY_WRONG_TARGET_RISK** / CANONICAL_BUILDER_DEFECT / UNSUPPORTED_FEATURE / **UNEXPLAINED** / BLOCKED.
**게이트**: `UNEXPLAINED` 또는 `LEGACY_WRONG_TARGET_RISK` → Production 전환 **차단**(정직·무음사망 방지).

---

## 9. Performance (§80) & Observability (§81) & Audit (§82)
- **Performance(§80)**: Candidate Collection/Identity/Dedup/Exclusion/Eligibility/Snapshot-Write/Preview/Count/Diff/Static-Parse P50/P95/P99 · Full/Incremental Throughput · Queue Lag · DB Load · Cache Hit · Tenant 간 간섭.
- **Observability(§81)**: Build Requests/Success/Failure/Partial · Candidate/Included/Excluded/Duplicate Count · Identity/Consent/Suppression/Deleted/Test-Data/Cross-Scope Block · Snapshot Count/Expiry · Build Duration · Retry/Cancel · Static List Error · Approval Pending · Large Diff · **Legacy Builder Usage**. → 기존 ModelMonitor/관측 확장(신규 엔진 난립 금지).
- **Audit(§82)**: AUDIENCE_CREATED/VERSION_CREATED/VALIDATED/PUBLISHED · BUILD_REQUESTED/STARTED/COMPLETED/FAILED/CANCELLED · PREVIEW_EXECUTED · DIFF_CREATED · SNAPSHOT_CREATED/APPROVED/LOCKED/INVALIDATED · ROLLED_BACK · STATIC_LIST_UPLOADED/VALIDATED/DELETED · ARCHIVED/DELETED. → 기존 audit_log/AuditRegistry 확장.

---

## 10. 기존 구현 분류 (§70) · 중복 감사 (§71) · 후퇴 방지 (§72)

### 10.1 분류
| 구현 | 분류 |
|---|---|
| AdAdapters syncAudience(Meta/Google/TikTok) | **VALIDATED_LEGACY(Destination)** — Builder 아님, Part 3-3 대상 |
| refreshSegmentForSend + 발송루프 즉석필터 | **CONSOLIDATION_REQUIRED** → Canonical Build+Snapshot 로 대체(발송 앞단) |
| email_suppression(Exclusion Source) | VALIDATED_LEGACY(email) — phone/legal/tombstone 신규 |
| audience_mode(retarget/lookalike/prospect) | LEGACY_ADAPTER → Audience Type 매핑 |
| AISegmentsTab 클라이언트 휴리스틱 | TEST_ONLY/BLOCKED |
| Static List Store | **부재(신규)** |
| Audience Snapshot/Preview/Diff/Approval | **부재(신규 — SEG-H4/H5)** |

### 10.2 중복 감사 (§71)
현행은 **단일 Audience Builder 부재**(AdAdapters 는 Destination). 통합대상=소비자 JOIN 4중복(Kakao/SMS/Email/Omni, SEG-L3)을 단일 Canonical Builder 로 수렴(CRM/광고/Email별 독립 Builder 신설 금지 §3.10·§93). **기존 정상기능·이력 보존**.

### 10.3 기능 후퇴 방지 (§72)
비교: Audience Type·Segment 선택·Inclusion/Exclusion·Static List·Preview/Count/Sample·Exclusion Breakdown·Version/Snapshot/Diff·Approval·Build History·Retry/Cancel/Refresh/Expiry·Archive/Delete·Explain/Lineage·**기존 API Compatibility**. **승인 안 된 감소 시 Canonical 전환 차단**. 현행 AdAdapters 해시전용·10k캡·demo→[]·audience_mode 배선 보존 필수.

---

## 11. 완료 조건 대응 (본 문서)
§92의 18(Queue/Cache/API Scope)·19(Rollback Foundation)·20(기존 분류)·21(중복통합 계획)·22(Lint/Guard)·23(Golden/Equivalence)·24(후퇴방지)·25(ADR/PM/이력). **코드변경 0** — API/UI/Queue/Cache/CI가드 실 구현은 후속 승인 세션.

**다음**: EPIC 06-A Part 3-2 — Audience Eligibility Engine, Identity, Freshness, Purpose & Channel Readiness Governance. **선행 P0(구현세션)**: 발송 게이트 표준화(SEG-C1~C4)·Audience 업로드 consent/Removal/Reconciliation(SEG-H1/H2/H5) — 본 Foundation 의 Snapshot·Exclusion·Consent Resolver 계약이 그 구현 기반.
