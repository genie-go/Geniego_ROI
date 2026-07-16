# Canonical DSAR Loyalty Discovery — Entity, Discovery Profile, Program/Member/Account/Tier/Status/Level, Lifecycle, Relationship Graph & Mapping

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-1** (1/2) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): **loyalty/membership/tier/reward/point 전용 핸들러 부재**(grep 0). 유일한 loyalty-tier 구조=`crm_customers.grade`(VARCHAR default 'normal'·값 **normal/new/bronze/silver/gold**·머천트 분류·segmentation/targeting) · `vip_upgrade`(👑 VIP 전환 여정=마케팅 Journey 템플릿·upsell) · reward coupon(`REWARD_PLAN`/`reward_coupon`=추천/보상 쿠폰 자동화·마케팅) · `membershipLifeSpan`(=crm_segment_members TTL·Audience) · **`point_discount`=마켓플레이스 포인트**(11번가/쿠팡/네이버·`KrChannel`/`Rollup`/`PgSettlement` 정산 차감 라인·GeniegoROI 로열티 포인트 아님) · Part 3-3-3-3-3-3-2 CRM/CDP(crm_customers)·Part 3-3-3-3-2 Verification Token·EPIC05 Identity.
> **★정직(§실측·핵심)**: **GeniegoROI 는 소비자 Loyalty Program 엔진 미보유** — **Points 원장·Tier 승급/강등 엔진·Enrollment·Membership·Merge/Split·Reward 적립/사용 원장 전부 NOT_APPLICABLE**. 유일한 실 loyalty 표면=**`crm_customers.grade`**(고객 등급 속성·CRM Discovery Part 3-3-3-3-3-3-2 이미 포함). `point_discount`=마켓 포인트(정산·KEEP_SEPARATE). VIP/reward=마케팅 자동화(KEEP_SEPARATE). 지어내기 금지·본 Foundation=전방호환 계약.
> 형제: [`CANONICAL_DSAR_LOYALTY_GOVERNANCE.md`](CANONICAL_DSAR_LOYALTY_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_LOYALTY_FOUNDATION.md`](../architecture/ADR_DSAR_LOYALTY_FOUNDATION.md)
> **성격**: 목표 계약(대부분 미래·Loyalty Program 도입 시 활성화). 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| **`crm_customers.grade`**(normal/new/bronze/silver/gold·머천트 분류) | Loyalty Level/Tier 속성(CRM Discovery 정합·Discovery=grade 조회) |
| `vip_upgrade` Journey·reward coupon(REWARD_PLAN) | `KEEP_SEPARATE`(마케팅 자동화·Journey/Coupon Part 연계·로열티 아님) |
| `point_discount`(마켓 포인트·정산 차감) | `KEEP_SEPARATE`(마켓플레이스 소유·GeniegoROI 로열티 포인트 아님) |
| `membershipLifeSpan`(crm_segment_members TTL) | Audience Membership(Part1 정합·로열티 Membership 아님) |
| **Loyalty Program/Member/Account/Points 원장/Tier 승급/Enrollment/Merge/Split/Reward 적립** | **NOT_APPLICABLE**(엔진 부재·지어내기 금지·도입 시 등록) |
| Loyalty↔Customer↔Subscription Mapping·Candidate/Coverage/Gap 부재 | 신설(전방호환) |

**무후퇴**: crm_customers.grade·vip_upgrade Journey·reward coupon·point_discount(정산)·membershipLifeSpan 은 **정본 — 재구현 금지, Canonical Loyalty Discovery 아래 grade 매핑·나머지 KEEP_SEPARATE/미래**. Loyalty Program별 독립 Candidate Store 신설 금지(§Governance §9).

---

## 1. Canonical Loyalty Discovery Entity Model

Entity: `LOYALTY_DISCOVERY_PROFILE` · `LOYALTY_PROGRAM`(N/A) · `LOYALTY_MEMBER`(N/A) · `LOYALTY_ACCOUNT`(N/A) · `LOYALTY_PROFILE` · **`LOYALTY_LEVEL`(=crm_customers.grade·실)** · `LOYALTY_TIER`(N/A 승급엔진) · `LOYALTY_STATUS` · `LOYALTY_ENROLLMENT`(N/A) · `LOYALTY_TIER_CHANGE`(N/A) · `LOYALTY_EXPIRATION`(N/A) · `LOYALTY_SUSPENSION`(N/A) · `LOYALTY_MERGE`(N/A) · `LOYALTY_SPLIT`(N/A) · `LOYALTY_RELATIONSHIP` · `LOYALTY_STATUS_HISTORY`(N/A) · `LOYALTY_CANDIDATE` · `LOYALTY_DUPLICATE_GROUP` · `LOYALTY_RECONCILIATION` · `LOYALTY_COVERAGE_RESULT` · `LOYALTY_DISCOVERY_GAP` · `LOYALTY_DISCOVERY_EVIDENCE` · `LOYALTY_AUDIT_EVENT`. (기존 등가=crm_customers.grade → Level 매핑·나머지 N/A/신규.)

---

## 2. Loyalty Discovery Profile

**Schema**: loyalty_discovery_profile_id · provider_id(=`__internal_crm_grade__`·Loyalty Program 도입 시 외부 Provider) · provider_account_id · loyalty_account_scope · **tenant_id · brand_id · store_ids · legal_entity_id** · environment · region · program_model(=grade attribute·프로그램 엔진 부재) · member_model · tier_model(=grade values) · point_model(=N/A) · reward_model(=마케팅 coupon·KEEP_SEPARATE) · enrollment_model(=N/A) · deletion/archive_model · history_capability · webhook_capability · search_API_capability · owner · version · status · certification_status · last_verified_at. **★현행=내부 grade 속성(프로그램/원장 부재)**.

---

## 3. Loyalty Program (N/A) · Member (N/A) · Account (N/A) · Profile · Level (실) · Tier (N/A) · Status

**★Program/Member/Account=NOT_APPLICABLE**(Loyalty Program 엔진·Enrollment·Membership 부재). 향후 활성화 계약.
**Loyalty Profile**: loyalty_profile_id · customer_id(=crm_customers.id) · canonical_person_candidate · CRM/CDP_reference · **grade(=Level)** · tenant/brand/store_id · created/updated_at · status · evidence. (crm_customers grade 속성 조회.)
**★Loyalty Level(§=crm_customers.grade·실)**: 현행 값 **normal · new · bronze · silver · gold**(머천트 정의·확장가능). Canonical Tier 표준(요청): BRONZE · SILVER · GOLD · PLATINUM · VIP · CORPORATE · ENTERPRISE · CUSTOM → **현행 grade 값을 Canonical Tier 로 매핑**(normal/new=미분류·bronze/silver/gold=매핑·platinum/vip/corporate/enterprise=미사용→미래). **★grade 는 CRM 속성(승급엔진·이력 없음)** — Tier 승급/강등/Enrollment=NOT_APPLICABLE.
**Loyalty Status(요청 8종)**: ACTIVE · PENDING · SUSPENDED · EXPIRED · ARCHIVED · MERGED · DELETED · UNKNOWN. (현행 grade=단순 속성·상태 lifecycle 부재→ACTIVE/UNKNOWN 만 실효·나머지 미래.)

---

## 4. Lifecycle — Enrollment/Upgrade/Downgrade/Expiration/Suspension/Merge/Split (대부분 N/A)

**★NOT_APPLICABLE(§실측)**: grade 는 머천트가 설정하는 속성·**Enrollment/Upgrade/Downgrade/Expiration/Suspension/Merge/Split lifecycle 이벤트 이력 부재**(승급엔진·원장 없음). grade 변경 시 crm_customers.updated_at 만·전용 이력 없음.
- `LOYALTY_ENROLLMENT`(N/A) · `LOYALTY_TIER_CHANGE`(N/A·grade 변경=단순 UPDATE) · `LOYALTY_EXPIRATION`(N/A) · `LOYALTY_SUSPENSION`(N/A) · `LOYALTY_MERGE`(=EPIC05 Customer Merge 시 grade 승계) · `LOYALTY_SPLIT`(N/A) · `LOYALTY_STATUS_HISTORY`(N/A·Append-only 이력 부재→GAP).
- 향후 Loyalty Program 도입 시: Enrollment/Tier Change/Expiration/Suspension 이력 Append-only·근거·Actor·effective time 보존 계약.

---

## 5. Relationship Graph & Mapping

**Relationship Graph(요청)**: Customer(crm_customers) → Loyalty Account(N/A·현행 grade 속성) → Tier(grade) → Program(N/A) → Organization(app_user/tenant) → Subscription(paddle) → Wallet(BillingMethod·N/A loyalty wallet) → Reward(마케팅 coupon·KEEP_SEPARATE) → Point(마켓 point_discount·KEEP_SEPARATE) → Campaign(Journey) → Coupon(coupon*) → Journey(journey_enrollments). **★현행 실선=Customer→Level(grade)·나머지=N/A/KEEP_SEPARATE/미래**.
**Mapping(요청)**: Customer Mapping(=crm_customers.id·EPIC05 Identity) · Subscription Mapping(=paddle·Part3-3-1) · Organization Mapping(=app_user parent_user_id/tenant) · Store Mapping(=store_id) · Brand Mapping(=brand_id) · Tenant Mapping(=tenant_id) · Role Mapping(=Subject Role·Account Owner/Seat User). **Relationship Schema**: relationship_id · source/target_entity_type · source/target_entity_id · relationship_type · provider/loyalty_account · tenant/brand/store · valid_from/to · confidence · source · status · evidence.

---

## 6. Loyalty Candidate

**Candidate**: candidate_id · request/discovery_task_id · provider_id · loyalty_account_id(N/A) · customer_id(=crm_customers) · **grade(=Level)** · tier(=Canonical 매핑) · program_id(N/A) · subject_roles · tenant/brand/store · status · match_confidence · duplicate_group · review_requirements · evidence_reference. **Match 상태**: EXACT_CUSTOMER_MATCH · GRADE_ATTRIBUTE_MATCH · STRONG_IDENTITY_MATCH · SHARED_IDENTIFIER_MATCH · MULTIPLE_CUSTOMER_MATCH · WRONG_TENANT/BRAND · OUT_OF_SCOPE · MANUAL_REVIEW · BLOCKED. **Inclusion**: Verified Subject · Subject Role · Customer Mapping · Tenant/Brand/Store · grade 속성 · Provider/Internal Consistency. **★현행 Loyalty Discovery = crm_customers.grade 조회**(별도 Loyalty 엔진 검색 불필요·CRM Discovery 재사용·중복 Candidate Store 금지).
