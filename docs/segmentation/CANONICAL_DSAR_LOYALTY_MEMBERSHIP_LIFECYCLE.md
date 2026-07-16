# Canonical DSAR Loyalty Membership Lifecycle — Member/Enrollment/Membership/History/Event, Tier Assignment/Progress/Eligibility, Status History, Reactivation & Lifecycle Discovery

> **EPIC 06-A Part 3-3-3-3-3-3-3-3-4-2** (1/2) · 289차 (2026-07-16) · **비파괴 설계 명세(코드변경 0)**
> 근거(실측): **loyalty membership/enrollment/tier history/progression/event 전용 구현 부재**(grep: membership_event/tier_history/tier_progress/upgrade_rule/membership_history=0). 관련성 있어 보이나 로열티 아님 — **`enrollment`/`enrolled_at`/`enrollByTrigger`=Journey Enrollment**(`journey_enrollments`·JourneyBuilder·마케팅 여정) · **`dormant`/휴면 고객=CRM Segment**(recency≥180일·RFM/churn 분석) · `reactivate`/reactivate_selfrecover=여정/계정 복구(273차). 유일 실 loyalty=`crm_customers.grade`(4-1·현재값만·이력 미보존) · Part 3-3-3-3-3-3-3-3-4-1 Loyalty Foundation·Part 3-3-3-3-3-3-2 CRM/CDP·Part 3-3-3-3-2 Verification Token·EPIC05 Merge.
> **★정직(§실측·핵심)**: **GeniegoROI Loyalty Membership Lifecycle 엔진 미보유** — **Enrollment(로열티)·Membership·Tier Assignment/Progression/Upgrade/Downgrade Rule·Membership Event/History·Suspension/Freeze/Dormant(로열티)/Reactivation/Transfer/Merge/Split/Termination 전부 NOT_APPLICABLE**. 유일 실 datum=`crm_customers.grade`(현재값·**변경 이력 미보존=GAP**). Journey enrollment·CRM dormant segment·account reactivate=**KEEP_SEPARATE**(로열티 아님). 지어내기 금지·본 Lifecycle=전방호환 계약.
> 형제: [`CANONICAL_DSAR_LOYALTY_MEMBERSHIP_GOVERNANCE.md`](CANONICAL_DSAR_LOYALTY_MEMBERSHIP_GOVERNANCE.md) · ADR=[`../architecture/ADR_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md`](../architecture/ADR_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md) · 상위=[`CANONICAL_DSAR_LOYALTY_DISCOVERY.md`](CANONICAL_DSAR_LOYALTY_DISCOVERY.md)
> **성격**: 목표 계약(대부분 미래·Loyalty Membership 도입 시 활성화). 실 Registry 구현은 후속 승인 세션.

---

## 0. 현행 대비 (실측 → Canonical)

| 현행 | Canonical 목표 |
|---|---|
| `crm_customers.grade`(현재 등급값·이력 미보존) | Loyalty Tier Assignment(현재)·**Tier History=신설 필수(현행 GAP)** |
| `journey_enrollments`(Journey Enrollment·enrollByTrigger) | `KEEP_SEPARATE`(마케팅 여정·로열티 Enrollment 아님) |
| CRM 휴면 고객 Segment(recency≥180) | `KEEP_SEPARATE`(RFM 분석·로열티 Dormant Membership 아님) |
| reactivate/self-recover(여정/계정 복구) | `KEEP_SEPARATE`(로열티 Reactivation 아님) |
| **Loyalty Member/Enrollment/Membership/Tier Progression/Event/History/Dormant/Reactivation 엔진** | **NOT_APPLICABLE**(엔진 부재·지어내기 금지·도입 시 등록) |
| **grade 변경 이력·Membership 상태 이력·Tier 변경 이력 부재** | **Append-only History 신설 필수(전방호환·삭제 금지)** |

**무후퇴**: crm_customers.grade·journey_enrollments·CRM 휴면 segment·reactivate 는 **정본 — 재구현 금지, grade 만 Loyalty Tier 매핑·나머지 KEEP_SEPARATE/미래**. Loyalty Program별 독립 Candidate/Membership Store 신설 금지(§Governance).

---

## 1. Canonical Loyalty Membership Lifecycle Entity Model

Entity: `LOYALTY_MEMBER`(N/A) · `LOYALTY_ENROLLMENT`(N/A) · `LOYALTY_MEMBERSHIP`(N/A) · `LOYALTY_MEMBERSHIP_HISTORY`(N/A·Append-only) · `LOYALTY_MEMBERSHIP_EVENT`(N/A) · **`LOYALTY_TIER_ASSIGNMENT`(=crm_customers.grade 현재·실)** · `LOYALTY_TIER_HISTORY`(N/A·**필수 신설**) · `LOYALTY_TIER_PROGRESS`(N/A·승급엔진 부재) · `LOYALTY_ELIGIBILITY`(N/A) · `LOYALTY_STATUS_HISTORY`(N/A·Append-only) · `LOYALTY_REACTIVATION`(N/A) · `LOYALTY_LIFECYCLE`(N/A) · `LOYALTY_DISCOVERY_EVIDENCE`. (기존 등가=grade → Tier Assignment 현재값·나머지 N/A/신규.)

---

## 2. Member (N/A) · Enrollment (N/A) · Membership (N/A)

**★NOT_APPLICABLE(§실측)**: Loyalty Member/Enrollment/Membership 엔진 부재.
**Enrollment(§N/A·향후 계약)**: enrollment_id · member_id · program_id · **enrollment_channel**(WEB/APP/POS/CALL_CENTER/MARKETPLACE/IMPORT/ADMIN/PARTNER) · **enrollment_source**(SIGNUP/PURCHASE/CAMPAIGN/REFERRAL/MIGRATION/MANUAL) · enrolled_at · consent_reference · initial_tier · eligibility_reference · status · evidence. **★journey_enrollments(마케팅) 와 혼동 금지(KEEP_SEPARATE)**.
**Membership(§N/A)**: membership_id · customer_id · program_id · current_tier · current_status · start/end_at · renewal_at · tenant/brand/store_id · payment/subscription_reference · evidence.

---

## 3. Tier Assignment (실·grade) · Tier History (GAP·필수) · Tier Progress (N/A) · Eligibility (N/A)

**Tier Assignment(§=crm_customers.grade·실)**: tier_assignment_id · customer_id(=crm_customers.id) · **grade(=current tier)** · canonical_tier(BRONZE~CUSTOM 매핑) · assigned_at(=updated_at·정밀 이력 없음) · source · tenant/brand/store · status · evidence. **★현행 grade=현재값만**.
**Tier History(§N/A·★필수 신설·요청 핵심)**: tier_history_id · customer_id · previous_tier · new_tier · changed_at · effective_at · change_type(UPGRADE/DOWNGRADE/MIGRATION/MANUAL) · reason · actor · trigger_reference · evidence. **★Tier 변경 시 이전 Tier 삭제 금지·History 반드시 보존**(현행 grade UPDATE=이력 상실 GAP → 로열티 도입 시 Append-only 필수). **Append-only·불변**.
**Tier Progress(§N/A·승급엔진 부재)**: progress_id · membership_id · target_tier · qualifying_metric(spend/points/orders/tenure) · current_value · threshold · window · projected_tier · calculated_at · evidence.
**Eligibility(§N/A)**: eligibility_id · customer_id · program_id · tier · eligible 여부 · criteria_reference · qualifying/disqualifying_signals · valid_from/to · evidence.

---

## 4. Membership Event (N/A·14종) · Status (N/A·12종) · Status History (Append-only)

**★NOT_APPLICABLE(§실측)**: Membership Event/Status lifecycle 부재.
**Event(요청 14종·향후 계약·Append-only)**: ENROLLED · UPGRADED · DOWNGRADED · RENEWED · REACTIVATED · EXPIRED · SUSPENDED · FROZEN · UNFROZEN · TRANSFERRED · MERGED · SPLIT · TERMINATED · ARCHIVED. Event Schema: membership_event_id · membership_id · event_type · occurred_at · effective_at · previous/new_state · source · actor · reason · related_reference(subscription/payment/campaign) · evidence.
**Status(요청 12종)**: PENDING · ACTIVE · GRACE_PERIOD · SUSPENDED · FROZEN · DORMANT · EXPIRED · CANCELLED · TERMINATED · ARCHIVED · MERGED · UNKNOWN. (현행 grade=속성·상태 lifecycle 부재→ACTIVE/UNKNOWN 만 실효.)
**Status History(§Append-only·★요청 핵심)**: status_history_id · membership_id · previous_status · new_status · provider_raw_status · changed_at · effective_at · source · actor · reason · event_reference · evidence. **★Membership 상태 현재값만 저장 금지·변경 이력 전부 추적**(현행 GAP → 로열티 도입 시 필수).

---

## 5. Lifecycle 이벤트 — Renewal/Suspension/Freeze/Dormant/Reactivation/Transfer/Merge/Split/Termination (대부분 N/A)

**★NOT_APPLICABLE(§실측)**: 로열티 lifecycle 이벤트 엔진 부재. (CRM 휴면 segment·journey reactivate 는 KEEP_SEPARATE·로열티 아님.)
- **Renewal/Expiration**(N/A) · **Suspension/Freeze/Unfreeze**(N/A) · **Dormant**(N/A·≠CRM 휴면 segment) · **Reactivation**(§N/A): reactivation_id·membership_id·previous_ended_state·requested/reactivated_at·restored_tier·restored_entitlements·actor·status·evidence(≠journey/account reactivate).
- **Transfer/Merge/Split/Termination/Archive**(N/A): **★Customer Merge 시 grade 승계·Membership 관계 유지(EPIC05 정합)**. **★Program/Brand/Tenant 변경 시 기존 Membership 관계 유지**(재생성 금지·향후 계약). **★Cross-Tenant Membership 연결 차단**(Runtime Guard).
- **Lifecycle**(N/A): lifecycle_id·membership_id·enrollment→tier assignments→status transitions→renewals→suspension→reactivation→termination 단계 ID/Version/Actor/Time/근거 추적(Append-only).

---

## 6. Discovery Evidence & Candidate

**Evidence**: request/discovery_task_id·provider_id·customer_id·**grade(current tier)**·tier_history_available 여부(현행 false·GAP)·membership_id(N/A)·scope/identifier_version·subject_role·tenant/brand/store·date_range·result/candidate/event_count·error·started/completed_at·result_hash·audit_reference. **★현행 Membership Lifecycle Discovery=grade 현재값 조회(CRM Discovery)·이력 부재는 GAP 명시(NO_DATA 아님)**.
**Candidate(향후)**: candidate_id·request_id·customer_id·membership_id(N/A)·current_tier(grade)·tier_history_ids(N/A)·status_history_ids(N/A)·event_ids(N/A)·subject_roles·tenant/brand/store·match_confidence·duplicate_group·evidence. **★Loyalty Membership 부재 시 grade Tier Assignment 만 반환·나머지 PROVIDER_LIMITATION/NOT_APPLICABLE**.
