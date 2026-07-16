# Canonical DSAR Loyalty Membership Governance — Relationship Graph/Mapping, Coverage/Gap/Evidence, Reconciliation, Permission, Runtime Guard/Static Lint, Error/Warning, Golden/Legacy Equivalence, Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-2** (2/2) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `crm_customers.grade`(현재값·이력 미보존)·`journey_enrollments`(마케팅)·CRM 휴면 segment·reactivate·SecurityAudit · Part 3-3-3-3-3-3-3-3-4-1 Loyalty Foundation·Part 3-3-3-3-3-3-2 CRM/CDP·Part 3-3-3-3-2 Verification Token·EPIC05 Merge.
> 형제: [`CANONICAL_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md`](CANONICAL_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md) · ADR=[`../architecture/ADR_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md`](../architecture/ADR_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md)

---

## 1. Relationship Graph & Mapping

**Relationship Graph(요청)**: Customer(crm_customers) → Membership(N/A) → Enrollment(N/A) → Tier(grade) → Status(N/A lifecycle) → Wallet(BillingMethod·N/A loyalty wallet) → Reward(마케팅 coupon·KEEP_SEPARATE) → Coupon(coupon*) → Journey(journey_enrollments) → AI Segment(crm_segments/CustomerAI) → Customer360(crm_identity 269+270차). **★현행 실선=Customer→Tier(grade)·Customer→Journey/AI Segment/Customer360(CRM 정합)·나머지 N/A/KEEP_SEPARATE/미래**.
**Mapping(요청)**: Customer(=crm_customers·EPIC05) · Subscription(=paddle·Part3-3-1) · Wallet(=BillingMethod·N/A loyalty) · Reward(=coupon 자동화·KEEP_SEPARATE) · Campaign(=Journey) · Journey(=journey_enrollments) · AI Segment(=crm_segments/CustomerAI). **★journey_enrollments/CRM segment=마케팅·로열티 Membership 아님(오혼입 금지)**.

---

## 2. Coverage & Gap

**Coverage Dimension**: Loyalty Member(N/A)·Enrollment(N/A)·Membership(N/A)·**Tier Assignment(grade) Coverage**·**Tier History Coverage(현행 GAP)**·Tier Progress(N/A)·Eligibility(N/A)·**Status History Coverage(현행 GAP)**·Membership Event(N/A)·Reactivation(N/A)·Lifecycle·Relationship·Customer/Subscription/Journey/AI Segment Mapping·Evidence Coverage. **Matrix**: | Request | Customer | Tier(grade) | Tier History | Status History | Enrollment | Events | Relationship | Deleted | Overall |
**Gap Type**: LOYALTY_MEMBER/ENROLLMENT/MEMBERSHIP_UNAVAILABLE(N/A)·**TIER_HISTORY_MISSING(현행 grade 변경 이력 미보존·★핵심 GAP)**·TIER_PROGRESSION_UNAVAILABLE(N/A)·ELIGIBILITY_UNMAPPED(N/A)·**STATUS_HISTORY_INCOMPLETE(현행 이력 부재·★핵심 GAP)**·MEMBERSHIP_EVENT_MISSING(N/A)·REACTIVATION_HISTORY_MISSING(N/A)·CUSTOMER/SUBSCRIPTION_MAPPING_MISSING·RELATIONSHIP_UNMAPPED·DELETED_MEMBERSHIP_UNSEARCHABLE·PROVIDER_INTERNAL_MEMBERSHIP_DRIFT. **★Critical**: grade 잘못된 Tenant·**Cross-Tenant Membership 연결**·grade 변경 이력 상실(과거 Tier 복구 불가)·CRM Discovery 에서 grade 누락·Merge 시 grade/Membership 관계 상실·journey enrollment 를 로열티 Enrollment 로 오분류·CRM 휴면 segment 를 로열티 Dormant 로 오분류. **★Loyalty Membership 부재≠Gap→PROVIDER_LIMITATION/NOT_APPLICABLE(NO_DATA/오탐 금지)**.

---

## 3. Evidence · Reconciliation

**Evidence**: request/discovery_task_id·provider_id·customer_id·grade(Tier)·tier/status_history_available 여부(현행 false)·subject_role·tenant/brand/store·date_range·result/candidate/event_count·error·started/completed_at·result_hash·audit_reference.
**Reconciliation**: grade vs CRM/CDP Profile · grade vs AI Segment(crm_segments) · **Customer Merge vs grade/Membership 관계 승계(EPIC05)** · Program/Brand/Tenant 변경 vs Membership 관계 유지(N/A) · journey enrollment vs 로열티 Enrollment(도메인 분리) · CRM 휴면 vs 로열티 Dormant(도메인 분리) · Deleted Customer vs Membership. **상태**: MATCH · TIER_GRADE_MISMATCH · **TIER_HISTORY_LOSS** · CUSTOMER_IDENTITY_MISMATCH · MERGE_MEMBERSHIP_LOSS · ENROLLMENT_DOMAIN_MISCLASSIFICATION(journey↔loyalty) · DORMANT_DOMAIN_MISCLASSIFICATION(CRM↔loyalty) · CROSS_TENANT_MEMBERSHIP · DELETION_MISMATCH · MANUAL_REVIEW · BLOCKED.

---

## 4. Permission · Runtime Guard · Static Lint

**Permission**: VIEW_LOYALTY_MEMBER · VIEW_LOYALTY_ENROLLMENT · VIEW_LOYALTY_MEMBERSHIP · VIEW_LOYALTY_TIER_ASSIGNMENT · VIEW_LOYALTY_TIER_HISTORY · VIEW_LOYALTY_TIER_PROGRESS · VIEW_LOYALTY_ELIGIBILITY · VIEW_LOYALTY_STATUS_HISTORY · VIEW_LOYALTY_MEMBERSHIP_EVENT · VIEW_LOYALTY_REACTIVATION · RUN_LOYALTY_MEMBERSHIP_DISCOVERY · RUN_LOYALTY_MEMBERSHIP_RECONCILIATION · VIEW_LOYALTY_MEMBERSHIP_COVERAGE · MANAGE_LOYALTY_MEMBERSHIP_GAP · VIEW_LOYALTY_MEMBERSHIP_EVIDENCE · VIEW_LOYALTY_MEMBERSHIP_AUDIT · ADMIN_LOYALTY_MEMBERSHIP_OVERRIDE. **★Enrollment/Tier 변경/승급/Reward 발급 실행 권한 미포함**.
**Runtime Guard**: Invalid Verification Token · Closed/Withdrawn Request · Wrong Tenant/Brand Membership · **Cross-Tenant Membership 연결(요청 핵심)** · Subject Role 미해결 · Shared Identifier Broad Match · **journey enrollment 를 로열티 Enrollment 로 조회 · CRM 휴면 segment 를 로열티 Dormant 로 조회** · **Tier 변경 시 이전 Tier 삭제(History 미보존)** · Membership 상태 이력 미기록 · Deleted Membership Endpoint 미승인 · Scope 초과 Export · Kill Switch.
**Static Lint**: Customer Binding 없는 Membership Query · **grade 를 로열티 Member/Enrollment 로 확정(엔진 없음)** · **Tier 변경 시 이전 Tier 삭제·History 미보존** · Membership 상태 현재값만 저장(이력 없음) · journey enrollment 를 로열티 Enrollment 로 매핑 · CRM 휴면 segment 를 로열티 Dormant 로 매핑 · **Cross-Tenant Membership 연결** · Program/Brand/Tenant 변경 시 Membership 관계 재생성(관계 상실) · Merge 시 grade/Membership 관계 상실 · CRM Discovery 에서 grade 누락 · Internal 만으로 Complete · Evidence 누락.

---

## 5. Error · Warning

**Error(`LOYALTY_MEMBERSHIP_` 접두)**: MEMBER_NOT_FOUND(N/A)·ENROLLMENT_NOT_FOUND(N/A)·MEMBERSHIP_NOT_FOUND(N/A)·TIER_ASSIGNMENT_MISSING·**TIER_HISTORY_MISSING**·TIER_PROGRESSION_UNAVAILABLE(N/A)·ELIGIBILITY_UNAVAILABLE(N/A)·**STATUS_HISTORY_MISSING**·EVENT_HISTORY_MISSING(N/A)·REACTIVATION_UNRESOLVED(N/A)·CUSTOMER_MAPPING_MISSING·CROSS_TENANT_MEMBERSHIP_BLOCKED·RECONCILIATION_FAILED·COVERAGE_INCOMPLETE·CRITICAL_GAP·PERMISSION_DENIED·RUNTIME_BLOCKED.
**Warning**: MULTIPLE_CUSTOMER_MATCH·SHARED_IDENTIFIER·TIER_HISTORY_LOSS_WARNING·STATUS_HISTORY_INCOMPLETE_WARNING·ENROLLMENT_DOMAIN_WARNING(journey)·DORMANT_DOMAIN_WARNING(CRM segment)·MERGE_MEMBERSHIP_WARNING·PROGRAM_BRAND_TENANT_CHANGE_WARNING·PROVIDER_INTERNAL_MEMBERSHIP_DRIFT·MANUAL_REVIEW_REQUIRED·PROVIDER_LIMITATION(Membership 엔진 부재).

---

## 6. Golden · Legacy Equivalence · Conformance · Audit

**Golden(테스트 전용·N/A 표기)**: Exact Customer grade(Tier) 조회·grade 변경 시 Tier History 보존(요청 핵심·현행 GAP 재현)·Membership 상태 이력 추적(GAP)·Customer Merge 시 grade/Membership 승계·**Cross-Tenant Membership 연결 차단·journey enrollment 로열티 오분류 차단·CRM 휴면 로열티 Dormant 오분류 차단·Tier 변경 시 이전 Tier 삭제 차단**·(Member/Enrollment/Membership/Tier Progression/Event=N/A 전 시나리오·PROVIDER_LIMITATION)·Program/Brand/Tenant 변경 시 Membership 관계 유지(N/A)·Coverage Complete/Critical Gap·Override 허용/금지.
**Conformance**: Tier Assignment·Tier History·Status History·(Member/Enrollment/Membership/Event=N/A)·Relationship·Mapping·Candidate·Reconciliation·Coverage·Evidence·Audit 에 동일 Contract(Tenant/Brand Scope·Subject Role·Identifier·**Append-only History**·Relationship·Reconciliation·Coverage·Evidence·Audit).
**Legacy Equivalence**: 기존 CRM grade 조회·grade 변경(단순 UPDATE·이력 없음)·journey enrollment·CRM 휴면 segment 와 비교(Customer/grade 분포·Journey Enrollment·Segment·Merge·Error·Warning·Latency·Audit). **Difference**: MATCH·EXPECTED_TIER_MAPPING/HISTORY_CORRECTION·EXPECTED_CUSTOMER_IDENTITY_CORRECTION·EXPECTED_ENROLLMENT_DOMAIN_CORRECTION·EXPECTED_DORMANT_DOMAIN_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_DISCOVERY_GAP·LEGACY_WRONG_SUBJECT_RISK·**LEGACY_TIER_HISTORY_LOSS**·CANONICAL_LOYALTY_MEMBERSHIP_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_SUBJECT_RISK`·`LEGACY_TIER_HISTORY_LOSS`·고객영향 `LEGACY_DISCOVERY_GAP`·Cross-Tenant=운영전환 차단**.
**Audit Event(`LOYALTY_MEMBERSHIP_` 접두)**: TIER_ASSIGNMENT_RESOLVED(grade)·TIER_HISTORY_DISCOVERED·STATUS_HISTORY_DISCOVERED·MEMBERSHIP_EVENT_DISCOVERED(N/A)·ENROLLMENT_DISCOVERED(N/A)·REACTIVATION_DISCOVERED(N/A)·MERGE_LINKED(grade 승계)·RELATIONSHIP_MAPPED·CANDIDATE_CREATED·RECONCILIATION_COMPLETED·GAP_DETECTED·CROSS_TENANT_MEMBERSHIP_BLOCKED·ENROLLMENT_DOMAIN_MISCLASSIFICATION_BLOCKED·RUNTIME_BLOCKED (SecurityAudit 확장).

---

## 7. Existing Impl Classification · Duplicate Audit · Regression Gate

**분류(§실측)**:
| 구현 | 분류 | 근거 |
|---|---|---|
| **`crm_customers.grade`**(현재 등급값) | `LEGACY_ADAPTER` → `LOYALTY_TIER_ASSIGNMENT`(현재)·**Tier History=신설 GAP** | 유일 실 Tier·이력 미보존 |
| `journey_enrollments`(enrollByTrigger·JourneyBuilder) | `KEEP_SEPARATE_WITH_REASON` | 마케팅 여정 Enrollment·로열티 아님 |
| CRM 휴면 고객 Segment(recency≥180) | `KEEP_SEPARATE_WITH_REASON` | RFM/churn 분석 segment·로열티 Dormant 아님 |
| reactivate/self-recover(여정/계정 복구) | `KEEP_SEPARATE_WITH_REASON` | 로열티 Reactivation 아님 |
| **Loyalty Member/Enrollment/Membership/Tier Progression/Event/History/Dormant/Reactivation 엔진** | `UNVERIFIED`(NOT_APPLICABLE) | **엔진 부재·지어내기 금지·도입 시 등록** |
| **grade/Membership/Status 변경 이력(Append-only)** | 신설(★필수·전방호환·현행 GAP) | 이력 미보존 |
**Duplicate Audit**: 실측 — loyalty tier=`crm_customers.grade` 단일·enrollment=`journey_enrollments`(마케팅) 단일·dormant=CRM segment 단일. **중복 Membership Registry/Candidate Store·grade↔journey↔dormant 오혼입 신설 위험만 차단**.
**Regression Gate**: 변경 전후 grade 조회·grade 변경(마케팅 journey enrollment 보존·CRM 휴면 segment 보존)·Merge grade 승계·Relationship·Reconciliation·Coverage·Audit·**Existing API Compatibility**(CRM grade/JourneyBuilder/segment 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 8. 완료 상태 요약

Loyalty Membership Entity 13 · **Member/Enrollment/Membership/Membership Event/History=NOT_APPLICABLE(엔진 부재)** · **Tier Assignment=crm_customers.grade(현재값·실)**·**Tier History/Status History=신설 필수(현행 GAP·Append-only·삭제 금지)**·Tier Progress/Eligibility=N/A(승급엔진 부재) · Status 12/Event 14(향후 계약) · Reactivation/Lifecycle=N/A(≠journey/CRM 휴면·KEEP_SEPARATE) · Relationship Graph(Customer→Tier(grade)/Journey/AI Segment/Customer360 실선·나머지 N/A) · Mapping 7 · Coverage/Gap(Tier History/Status History 핵심 GAP) · Evidence/Reconciliation(Merge 승계·Cross-Tenant 차단) · Permission/Guard/Lint(Cross-Tenant Membership·이전 Tier 삭제·domain 오혼입 차단) · Error/Warning · Golden/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★Membership Lifecycle 엔진 부재·grade 만 실(이력 미보존 GAP)·journey/CRM 휴면=KEEP_SEPARATE·Tier/Status History Append-only 필수·Cross-Tenant 차단 정직표기**. **실 Loyalty Membership/Adapter/History/CI가드 구현=Loyalty 도입 시 후속 승인 세션.**
