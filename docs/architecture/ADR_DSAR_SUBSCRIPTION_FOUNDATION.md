# ADR — DSAR Subscription Foundation (Customer/Subscription/Plan/Price/Trial/Renewal/Change/Cancellation Discovery) (EPIC 06-A Part 3-3-3-3-3-3-3-3-1)

- **일자**: 289차 (2026-07-16)
- **상태**: Accepted (Subscription Discovery Foundation 계약 명세 확정. 비파괴 — 코드변경 0). 실 Adapter·Plan/Price Version History 스토어·Reconciliation·CI 가드 구현은 후속 승인 세션(Golden Subscription Dataset+Conformance+Legacy Equivalence+verify+배포승인). **현재 Active Subscription만 검색·Payment Customer ID 단독 Person 확정·Subscription Customer=Account Owner 자동동일시·Seat User Scope 확대·Plan 이름 기반 식별·Trial/Free Plan·Cancelled/Expired·Reactivation/Resubscription 혼용·Deleted 누락 금지. Billing/Recurring Invoice/Usage/Metering=Part 3-3-3-3-3-3-3-3-2.**
- **근거(실측)**: [`../segmentation/CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_SCHEMA.md`](../segmentation/CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_SCHEMA.md) · [`LIFECYCLE`](../segmentation/CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_LIFECYCLE.md) · [`GOVERNANCE`](../segmentation/CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_GOVERNANCE.md) · **Paddle** `paddle_subscriptions`(user_email·paddle_subscription_id·paddle_customer_id·status·billing_cycle·current_period_end·cancelled_at·unit_price)·`paddle_events`/`paddle_audit_log` · `app_user`(plan/plans·expires_at·**parent_user_id·team_role**·trial/TRIAL_DAYS/TrialPlan) · `plan_pricing`(5티어)·`AdminPlans` · `UserAuth`(plan.upgrade/plan_change/plan.refund) · Part 3-3-3-3-3-3-3-1 Subscription Account · Part 3-3-3-3-2 Verification Token · EPIC05 Merge.

## 결정 (핵심)

1. **★실측 정직·인프라 부재·GAP 명시**: **① 구독=GeniegoROI 자체 SaaS 요금제**(구독사=Subscriber·Paddle MoR)·구독사의 자기 고객 구독상품 관리 아님. **② 구독 Provider=Paddle 단일(MoR)·외부 다중 구독 Provider 부재**. **③ Pause/Resume·Scheduled Change·Quantity Change 이력·Plan/Price Version History=대부분 NOT_APPLICABLE/GAP**(paddle_subscriptions=현재상태·pause 컬럼 부재·app_user.plan=current-state·plan_pricing 과거이력 미보존). Seat=parent_user_id/team_role(실·231차). 지어내기 금지. 기존 paddle/app_user/plan_pricing/UserAuth plan=정본·확장·Provider별 독립 Registry 금지(§89).

2. **Subscription Customer ≠ 실제 사용자·Payment Customer ID ≠ Subscription Customer ID(§5.1·5.2)**: Account Owner/Subscriber/Billing Contact/Payment Method Holder/**Team Admin(parent_user_id)/Seat User(team_role)**/Gift Recipient 역할 분리(14종). **Billing Contact/Seat User 라는 이유만으로 전체 Org 데이터 포함 금지**. Payment Customer ID(paddle_customer_id) ≠ Subscription Customer ID 자동간주 금지(Provider/Merchant/Subscription Account/Store/Tenant/Brand/Environment/Validity 검증).

3. **현재 Subscription ≠ 완료(§5.3)**: Trialing/Active/Past Due/Paused(N/A)/Cancel-at-period-end/Cancelled/Expired/Archived/Deleted/Historical/Duplicate 모두 조사. Subscription↔Item 분리(현행 단일 plan·다품목 Item=GAP).

4. **Plan 이름 ≠ Identity·Version 보존(§5.4)**: Plan ID/Price ID/Version 기준(현행 5티어 plan_pricing). **현재 Plan/Price 만 저장·과거 가격이력 상실 금지** → Version History 신설(현행 GAP·247차 seat 가격이력 정합).

5. **Trial ≠ Free Plan·Cancelled ≠ Expired(§5.5·5.6)**: Trial(app_user.trial/TRIAL_DAYS)/Free Plan/Grace Period/Complimentary 구분. Cancelled(paddle cancelled_at)/Expired(app_user expires_at)/Revoked/Failed/Incomplete 상태·이유 별도. Cancellation Reason Free-text=PII/Sensitive Review/Redaction.

6. **변경 전후 보존·Reactivation ≠ Resubscription(§5.7)**: Upgrade/Downgrade(UserAuth plan.upgrade/plan_change)=변경 전후 Plan/Price/Quantity/적용시점/Proration/이유/Actor 보존·Immediate vs Scheduled(N/A) 구분. 동일 subscription_id 재활성=Reactivation·새 subscription_id=Resubscription(혼동 금지).

7. **Status History Append-only·Provider vs Internal 불일치(§5.8·5.9)**: 모든 상태변화 Append-only(paddle_events/last_event_at)·Provider Raw Status 보존. **paddle vs app_user.plan drift=핵심 Reconciliation**. **Cancelled 인데 Provider Active·Expired 인데 Entitlement 유지·Pause 중 Billing 지속=High-risk Mismatch**. Deleted Subscription=Endpoint/Event/Audit/Warehouse/Tombstone 조사(데이터 없음 처리 금지).

8. **정직·무후퇴·Coverage/Gap**: Subscription↔Customer↔Payment Mapping·Subject Role·Plan/Price Version·Candidate/Coverage/Gap=현행 부재/GAP→목표계약. Coverage 다차원·Critical Gap(현재만 검색·Provider/Internal drift·Seat User 오확정·Version 누락) 시 Access Review 차단. paddle/app_user/plan_pricing/UserAuth plan 보존(Legacy Equivalence·API Compatibility). UNEXPLAINED·LEGACY_WRONG_SUBSCRIBER_RISK·고객영향 LEGACY_DISCOVERY_GAP·CANONICAL_SUBSCRIPTION_DEFECT·Cross-Tenant→전환차단. 기능후퇴 0.

## 무후퇴·영구 규칙 (§89)
신규 Subscription Provider/Plan/Price/Lifecycle 상태 추가 전: Provider/Account Registry·Tenant/Brand/Store Scope·Subscription Customer Mapping·Subject Role·Subscription/Item Object Mapping·Plan/Price Registry·Version/Historical Behavior·Trial/Renewal/Change 영향·Pause/Cancellation/Expiration 영향·Relationship Graph·Candidate/Deduplication·Reconciliation/Coverage 정의 → Golden/Conformance·Lint/Guard·중복/후퇴·ADR/PM 기록. **Provider별 독립 DSAR Registry/Candidate Store/Coverage Engine 중복 생성 금지.**

## 결과
Subscription Entity(30)·Discovery Profile(Paddle 단일)·Customer(13)/Alias·Subject Role(14·Seat=parent_user_id/team_role)·Subscription(24)/Item·Plan(15)/Price·**Version History=GAP**·Trial(9)/Conversion·Renewal(11)/Schedule·Change(16)/Upgrade/Downgrade·**Scheduled/Quantity Change=N/A/GAP**·**Pause/Resume=NOT_APPLICABLE**·Cancellation(13)/Expiration·Reactivation vs Resubscription·Status History(Append-only)/Relationship Graph/Candidate(17)·Dedup/Reconciliation(16·paddle vs app_user drift)·Coverage(26)/Gap(27)·Evidence/Explain·Permission(23)·Lint/Guard·Error(29)/Warning(17)·Golden(75+)/Conformance/Equivalence **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_SUBSCRIPTION_DISCOVERY_{SCHEMA,LIFECYCLE,GOVERNANCE}.md(§82 70여 문서 통합). **★Provider=Paddle 단일·Pause/Resume/Scheduled/Version History=N/A/GAP·외부 구독 Provider=N/A 정직표기**. 다음 **EPIC 06-A Part 3-3-3-3-3-3-3-3-2 — Billing·Recurring Invoice·Billing Run·Usage Billing·Metering Discovery** 입력 준비 완료.
