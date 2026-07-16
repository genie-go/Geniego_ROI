# ADR — DSAR Loyalty Member, Enrollment, Tier Progression & Membership Lifecycle Discovery (EPIC 06-A Part 3-3-3-3-3-3-3-3-4-2)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Loyalty Membership Lifecycle Discovery Governance 계약 명세 확정. 비파괴 — 코드변경 0). 실 Loyalty Membership/Adapter/Tier History/Status History/CI 가드 구현은 **Loyalty Membership 엔진 도입 시** 후속 승인 세션. **grade 를 로열티 Member/Enrollment 로 확정·journey enrollment 를 로열티 Enrollment 로 매핑·CRM 휴면 segment 를 로열티 Dormant 로 매핑·Tier 변경 시 이전 Tier 삭제(History 미보존)·Membership 상태 현재값만 저장·Cross-Tenant Membership 연결·Loyalty Membership 부재를 NO_DATA/오탐 처리 금지.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md`](../segmentation/CANONICAL_DSAR_LOYALTY_MEMBERSHIP_LIFECYCLE.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_LOYALTY_MEMBERSHIP_GOVERNANCE.md) · **loyalty membership/enrollment/tier history/progression/event 전용 구현 부재(grep 0)** · `crm_customers.grade`(현재값·이력 미보존) · `journey_enrollments`(enrollByTrigger·JourneyBuilder·마케팅) · CRM 휴면 고객 Segment(recency≥180·RFM) · reactivate/self-recover(여정/계정 복구) · Part 3-3-3-3-3-3-3-3-4-1 Loyalty Foundation · Part 3-3-3-3-3-3-2 CRM/CDP · Part 3-3-3-3-2 Verification Token · EPIC05 Merge.

## 결정 (핵심)

1. **★실측 정직·엔진 부재 명시**: **GeniegoROI Loyalty Membership Lifecycle 엔진 미보유** — **Enrollment(로열티)·Membership·Tier Assignment History/Progression/Upgrade·Downgrade Rule·Membership Event/History·Suspension/Freeze/Dormant(로열티)/Reactivation/Transfer/Merge/Split/Termination 전부 NOT_APPLICABLE**(전용 구현 grep 0). **유일 실 datum=`crm_customers.grade`**(현재 등급값·**변경 이력 미보존=GAP**). 지어내기 금지·본 Lifecycle=전방호환 계약. 기존 grade/journey_enrollments/CRM 휴면 segment=정본·확장.

2. **grade ≠ 로열티 Member/Enrollment·journey/dormant 도메인 분리**: grade=CRM 속성(승급엔진/원장/Enrollment 없음)→로열티 Member/Enrollment/Tier Progression 확정 금지. **`journey_enrollments`(enrollByTrigger)=마케팅 여정 Enrollment·로열티 아님(KEEP_SEPARATE)**. **CRM 휴면 고객 Segment(recency≥180)=RFM/churn 분석·로열티 Dormant Membership 아님(KEEP_SEPARATE)**. reactivate/self-recover=여정/계정 복구·로열티 Reactivation 아님. **오혼입=Static Lint/Runtime Guard 차단**.

3. **★Tier/Status History Append-only·삭제 금지(요청 핵심·전방호환)**: 현행 grade 변경=단순 crm_customers UPDATE·**이전 Tier/상태 이력 상실(GAP)**. 로열티 도입 시 **Tier 변경 시 이전 Tier 삭제 금지·Tier History/Status History 반드시 Append-only 보존**. Membership 상태 현재값만 저장 금지·변경 이력 전부 추적. Membership Event(ENROLLED~ARCHIVED 14종) Append-only.

4. **Program/Brand/Tenant 변경 시 Membership 관계 유지·Cross-Tenant 차단(요청)**: Program/Brand/Tenant 변경 시 기존 Membership 관계 재생성 금지·유지(향후 계약). **★Cross-Tenant Membership 연결 차단(Runtime Guard)**. Customer Merge 시 grade/Membership 관계 승계(EPIC05 정합·상실 금지).

5. **Loyalty Membership 부재 ≠ Gap·NO_DATA 금지**: Membership 엔진 부재=결함 아니라 **`PROVIDER_LIMITATION`/NOT_APPLICABLE 명시**. NO_DATA/오탐 금지. Membership Lifecycle Discovery=grade 현재값 조회(CRM Discovery 재사용)·이력 부재는 GAP 명시.

6. **정직·무후퇴·Coverage/Gap**: Loyalty Member/Enrollment/Membership/Tier History/Status History/Event=현행 부재→전방호환 목표계약. Coverage 다차원·Critical Gap(Cross-Tenant Membership·grade 이력 상실·CRM Discovery grade 누락·Merge Membership 상실·journey/dormant 오분류) 시 Access Review 차단. grade/journey_enrollments/CRM 휴면 segment 보존(Legacy Equivalence·API Compatibility). UNEXPLAINED·LEGACY_WRONG_SUBJECT_RISK·LEGACY_TIER_HISTORY_LOSS·고객영향 LEGACY_DISCOVERY_GAP·CANONICAL_LOYALTY_MEMBERSHIP_DEFECT·Cross-Tenant→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙
신규 Loyalty Membership/Enrollment/Tier Progression/Event 도입 전: Customer Identity(EPIC05)·grade·Tenant/Brand/Store Scope·Subject Role·Membership↔Customer↔Subscription Mapping·journey/CRM 휴면 도메인 분리·**Tier/Status History Append-only(삭제 금지)**·Cross-Tenant 차단·Candidate/Reconciliation/Coverage 정의 → Golden/Conformance·Lint/Guard·중복/후퇴·ADR/PM 기록. **grade↔journey enrollment↔CRM 휴면 오혼입 금지·Cross-Tenant Membership 연결 금지·Membership별 독립 Registry/Candidate Store 중복 생성 금지.**

## 결과
Loyalty Membership Entity(13)·**Member/Enrollment/Membership/Event/History=NOT_APPLICABLE**·**Tier Assignment=crm_customers.grade(현재값)**·**Tier History/Status History=신설 필수(Append-only·삭제 금지·현행 GAP)**·Tier Progress/Eligibility=N/A·Status(12)/Event(14 향후)·Reactivation/Lifecycle=N/A(≠journey/CRM 휴면 KEEP_SEPARATE)·Relationship Graph(Customer→Tier(grade)/Journey/AI Segment/Customer360 실선)·Mapping(7)·Coverage/Gap(Tier/Status History 핵심 GAP)·Evidence/Reconciliation(Merge 승계·Cross-Tenant 차단)·Permission/Guard/Lint·Error/Warning·Golden/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_LOYALTY_MEMBERSHIP_{LIFECYCLE,GOVERNANCE}.md. **★Membership Lifecycle 엔진 부재·grade 만 실(이력 미보존 GAP)·journey/CRM 휴면=KEEP_SEPARATE·Tier/Status History Append-only 필수·Cross-Tenant 차단 정직표기**. 후속 Part 입력 준비 완료.
