# Canonical DSAR Loyalty Governance — Coverage/Gap/Evidence, Reconciliation, Permission, Runtime Guard/Static Lint, Error/Warning, Golden/Legacy Equivalence, Audit & Existing-Impl Classification

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-1** (2/2) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): `crm_customers.grade`(normal/new/bronze/silver/gold)·vip_upgrade Journey·reward coupon·point_discount(마켓 정산)·SecurityAudit · Part 3-3-3-3-3-3-2 CRM/CDP·Part 3-3-3-3-2 Verification Token.
> 형제: [`CANONICAL_DSAR_LOYALTY_DISCOVERY.md`](CANONICAL_DSAR_LOYALTY_DISCOVERY.md) · ADR=[`../architecture/ADR_DSAR_LOYALTY_FOUNDATION.md`](../architecture/ADR_DSAR_LOYALTY_FOUNDATION.md)

---

## 1. Coverage & Gap

**Coverage Dimension**: Loyalty Provider(N/A)·Loyalty Account(N/A)·Loyalty Profile·**Level(grade) Coverage**·Tier(N/A 승급)·Status·Enrollment(N/A)·Tier Change(N/A)·Expiration(N/A)·Suspension(N/A)·Merge·Relationship·Customer/Subscription/Organization/Store/Brand/Tenant Mapping·Evidence Coverage. **Matrix**: | Request | Customer | Level(grade) | Tier | Program | Enrollment | Status History | Relationship | Deleted | Overall |
**Gap Type**: LOYALTY_PROGRAM_UNREGISTERED(N/A)·LOYALTY_ACCOUNT_MAPPING_MISSING(N/A)·**LOYALTY_LEVEL_UNMAPPED(grade 미매핑)**·TIER_PROGRESSION_UNAVAILABLE(N/A·승급엔진 부재)·**ENROLLMENT_HISTORY_MISSING(N/A)·TIER_CHANGE_HISTORY_MISSING(N/A)·STATUS_HISTORY_INCOMPLETE(N/A·grade 이력 부재)**·EXPIRATION/SUSPENSION_HISTORY_MISSING(N/A)·CUSTOMER/SUBSCRIPTION/ORGANIZATION_MAPPING_MISSING·RELATIONSHIP_UNMAPPED·DELETED_LOYALTY_UNSEARCHABLE·PROVIDER_INTERNAL_LOYALTY_DRIFT. **★Critical**: grade 잘못된 Tenant·Loyalty Account 다른 Subject 귀속(N/A)·grade 를 CRM Discovery 에서 누락·Merge 시 grade 오승계·마켓 point_discount 를 로열티 포인트로 오분류. **★Loyalty Program 부재는 Gap 아님 — `PROVIDER_LIMITATION`/NOT_APPLICABLE 명시**(NO_DATA/오탐 금지).

---

## 2. Evidence · Reconciliation

**Evidence**: request/discovery_task_id·provider_id·customer_id·grade(Level)·tier·scope/identifier_version·subject_role·tenant/brand/store·date_range·result/candidate/excluded_count·error·started/completed_at·result_hash·audit_reference.
**Reconciliation**: crm_customers.grade vs CRM/CDP Profile · grade vs Segment Membership(crm_segment_members) · **grade vs 마켓 point_discount(별개·오혼입 방지)** · Loyalty Merge vs Customer Merge(EPIC05·grade 승계) · Deleted Customer vs grade 속성. **상태**: MATCH · LEVEL_GRADE_MISMATCH · CUSTOMER_IDENTITY_MISMATCH · MERGE_GRADE_MISMATCH · POINT_DOMAIN_MISCLASSIFICATION(마켓 point↔로열티) · DELETION_MISMATCH · MANUAL_REVIEW · BLOCKED.

---

## 3. Permission · Runtime Guard · Static Lint

**Permission**: VIEW_LOYALTY_DISCOVERY_PROFILE · VIEW_LOYALTY_PROFILE · VIEW_LOYALTY_LEVEL · VIEW_LOYALTY_TIER · VIEW_LOYALTY_STATUS · RUN_LOYALTY_DISCOVERY · RUN_LOYALTY_HISTORY_DISCOVERY(N/A) · VIEW_LOYALTY_RELATIONSHIP · RUN_LOYALTY_RECONCILIATION · VIEW_LOYALTY_COVERAGE · MANAGE_LOYALTY_GAP · VIEW_LOYALTY_EVIDENCE · VIEW_LOYALTY_AUDIT · ADMIN_LOYALTY_DISCOVERY_OVERRIDE. **★Loyalty 등급 변경/Point 적립/Reward 발급 실행 권한 미포함**.
**Runtime Guard**: Invalid Verification Token · Closed/Withdrawn Request · Wrong Tenant/Brand Loyalty · Cross-Tenant · Subject Role 미해결 · Shared Identifier Broad Match · **마켓 point_discount 를 로열티 포인트로 조회** · Loyalty Account Scope 초과(N/A) · Deleted Loyalty Endpoint 미승인 · Scope 초과 Export · Kill Switch.
**Static Lint**: Customer Binding 없는 Loyalty Query · **grade 를 Loyalty Program Member 로 확정(엔진 없음)** · **Tier 승급 이력 조작(부재)** · point_discount 를 로열티 포인트로 매핑 · reward coupon 을 로열티 적립으로 매핑 · Loyalty Status History 조작(부재) · Merge 시 grade 오승계 · CRM Discovery 에서 grade 누락 · Internal 만으로 Complete · Evidence 누락.

---

## 4. Error · Warning

**Error(`LOYALTY_` 접두)**: PROVIDER_NOT_REGISTERED(N/A)·PROFILE_NOT_FOUND·LEVEL_UNMAPPED·TIER_PROGRESSION_UNAVAILABLE(N/A)·STATUS_HISTORY_MISSING(N/A)·CUSTOMER_MAPPING_MISSING·SUBSCRIPTION_MAPPING_MISSING·ORGANIZATION_MAPPING_MISSING·MERGE_UNRESOLVED·RECONCILIATION_FAILED·COVERAGE_INCOMPLETE·CRITICAL_GAP·PERMISSION_DENIED·RUNTIME_BLOCKED.
**Warning**: MULTIPLE_CUSTOMER_MATCH·SHARED_IDENTIFIER·GRADE_VALUE_NONSTANDARD·TIER_MAPPING_WARNING·POINT_DOMAIN_WARNING(마켓 point)·REWARD_DOMAIN_WARNING(마케팅 coupon)·MERGE_GRADE_WARNING·PROVIDER_INTERNAL_LOYALTY_DRIFT·MANUAL_REVIEW_REQUIRED·PROVIDER_LIMITATION(Loyalty Program 부재).

---

## 5. Golden Dataset · Legacy Equivalence · Conformance

**Golden(테스트 전용·N/A 표기)**: Exact Customer grade 조회(normal/new/bronze/silver/gold)·grade 미분류(normal/new)·grade nonstandard 값·Multiple Customer Match·Shared Email·Wrong Tenant/Cross-Tenant 차단·Customer Merge 시 grade 승계·**마켓 point_discount 로열티 포인트 오분류 차단·reward coupon 로열티 적립 오분류 차단**·(Loyalty Program/Enrollment/Tier 승급/Points 원장=N/A 전 시나리오·PROVIDER_LIMITATION)·CRM Discovery 에서 grade 포함·Coverage Complete/Critical Gap·Override 허용/금지.
**Conformance**: Loyalty Profile·Level(grade)·Tier·Status·Relationship·Mapping·Candidate·Reconciliation·Coverage·Evidence·Audit 에 동일 Contract(Tenant/Brand Scope·Subject Role·Identifier·Relationship·Candidate·Reconciliation·Coverage·Evidence·Audit).
**Legacy Equivalence**: 기존 CRM grade 조회(CRM.php·grade 필터)·segment(grade) 와 비교(Customer Count·grade 분포·Segment Membership·Merge·Error·Warning·Latency·Audit). **Difference**: MATCH·EXPECTED_LEVEL_MAPPING_CORRECTION·EXPECTED_CUSTOMER_IDENTITY_CORRECTION·EXPECTED_POINT_DOMAIN_CORRECTION·LEGACY_PRIVACY_DEFECT·LEGACY_DISCOVERY_GAP·LEGACY_WRONG_SUBJECT_RISK·CANONICAL_LOYALTY_DEFECT·PROVIDER_LIMITATION·MANUAL_REVIEW·UNEXPLAINED·BLOCKED. **★`UNEXPLAINED`·`LEGACY_WRONG_SUBJECT_RISK`·고객영향 `LEGACY_DISCOVERY_GAP`·Cross-Tenant=운영전환 차단**.

---

## 6. Audit Event

`LOYALTY_DISCOVERY_PROFILE_CREATED` · `LOYALTY_PROFILE_DISCOVERED` · `LOYALTY_LEVEL_RESOLVED`(grade) · `LOYALTY_TIER_MAPPED` · `LOYALTY_STATUS_RESOLVED` · `LOYALTY_MERGE_LINKED`(=Customer Merge grade 승계) · `LOYALTY_RELATIONSHIP_MAPPED` · `LOYALTY_CANDIDATE_CREATED` · `LOYALTY_DUPLICATE_GROUPED` · `LOYALTY_RECONCILIATION_COMPLETED` · `LOYALTY_GAP_DETECTED` · `LOYALTY_POINT_DOMAIN_MISCLASSIFICATION_BLOCKED` · `LOYALTY_RUNTIME_BLOCKED` (SecurityAudit 확장).

---

## 7. Existing Impl Classification · Duplicate Audit · Regression Gate

**분류(§실측)**:
| 구현 | 분류 | 근거 |
|---|---|---|
| **`crm_customers.grade`**(normal/new/bronze/silver/gold) | `LEGACY_ADAPTER` → `LOYALTY_LEVEL`(CRM Discovery 정합) | 유일한 실 loyalty-tier 속성 |
| `vip_upgrade` Journey·reward coupon(REWARD_PLAN) | `KEEP_SEPARATE_WITH_REASON` | 마케팅 자동화(Journey/Coupon Part)·로열티 아님 |
| `point_discount`(마켓 포인트·정산) | `KEEP_SEPARATE_WITH_REASON` | 마켓플레이스 소유·정산 차감·로열티 포인트 아님 |
| `membershipLifeSpan`(crm_segment_members) | `KEEP_SEPARATE_WITH_REASON` | Audience Membership(Part1)·로열티 아님 |
| **Loyalty Program/Member/Account/Points 원장/Tier 승급/Enrollment/Merge/Split/Reward 적립 엔진** | `UNVERIFIED`(NOT_APPLICABLE) | **엔진 부재·지어내기 금지·도입 시 등록** |
| Loyalty↔Customer↔Subscription Mapping·Candidate/Coverage/Gap 부재 | 신설(전방호환) | 현행 부재 |
**Duplicate Audit**: 실측 — loyalty tier=`crm_customers.grade` 단일·마켓 point=`point_discount`(정산) 단일·reward=coupon 자동화 단일. **중복 Loyalty Registry/Candidate Store·grade↔point 오혼입 신설 위험만 차단**(Loyalty Program별 독립 Registry 금지).
**Regression Gate**: 변경 전후 grade 조회(CRM grade 필터)·grade 분포·Segment Membership·Merge grade 승계·마켓 point_discount(정산 라인 보존)·reward coupon(마케팅 보존)·Relationship·Reconciliation·Coverage·Audit·**Existing API Compatibility**(CRM grade/CustomerAI/coupon/settlement 경로 보존) 비교. 승인없는 기능감소=전환차단.

---

## 8. 완료 상태 요약

Loyalty Entity 23 · Discovery Profile(내부 grade·Program 엔진 부재)·**Program/Member/Account=NOT_APPLICABLE**·Loyalty Profile·**Level=crm_customers.grade(normal/new/bronze/silver/gold·실)**·Tier 표준 8(BRONZE~CUSTOM·grade 매핑·platinum/vip/corporate/enterprise=미사용)·Status 8·**Enrollment/Tier Change/Expiration/Suspension/Merge/Split/Status History=NOT_APPLICABLE(승급엔진·원장 부재·이력 GAP)**·Relationship Graph(Customer→Level 실선·나머지 N/A/KEEP_SEPARATE)·Mapping 7·Candidate·Coverage/Gap·Evidence/Reconciliation·Permission/Guard/Lint·Error/Warning·Golden/Conformance/Equivalence · **계약 명세 확정**(코드변경 0). **★Loyalty Program 엔진·Points 원장·Tier 승급=NOT_APPLICABLE·유일 실 loyalty=grade 속성·마켓 point/reward coupon=KEEP_SEPARATE 정직표기**. **실 Loyalty Program/Adapter/CI가드 구현=도입 시 후속 승인 세션·verify+배포승인.**
