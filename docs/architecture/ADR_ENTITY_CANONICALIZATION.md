# ADR — Entity Canonicalization (EPIC 01-B)

- **일자**: 288차 (2026-07-16)
- **상태**: Accepted (비파괴 문서·메타데이터 단계). 실 통합/마이그레이션은 후속 단계 계획·회귀테스트 후.
- **근거**: [`../entities/ENTITY_INVENTORY.md`](../entities/ENTITY_INVENTORY.md) · [`../entities/CANONICAL_ENTITY_REGISTRY.md`](../entities/CANONICAL_ENTITY_REGISTRY.md) · `../registry/DatabaseRegistry.md`.
- **상위 헌법**: `../CONSTITUTION.md`(Golden Rule: Replace가 아니라 Extend) · `../DATA_INTELLIGENCE_CONSTITUTION.md`(No Duplicate Intelligence).

## 맥락
GeniegoROI(~290 엔티티)에 이름-의미 불일치가 다수 존재: 같은 의미 다른 이름(Buyer=Customer 등), 같은 이름 다른 의미(Account 5·Channel 3·Campaign 5 등), 중복 저장·이원 계산(Plan 4중·ROAS/CAC/LTV PHP+JS). EPIC 01-A 인벤토리를 근거로 Canonical Entity를 확정한다.

## 결정 (핵심)
1. **하나의 비즈니스 의미 = 하나의 Canonical Entity + 영구 CE ID**. Alias는 자체 ID 없이 대상 CE 참조.
2. **이름충돌은 통합하지 않고 분리**:
   - Account → UserAccount·AdAccount·BillingAccount·AgencyAccount·PartnerAccount (5).
   - Channel → ChannelRegistry(SSOT)·SalesChannel·AdChannel·MessagingChannel (group_type 구분자).
   - Campaign → AdCampaign·MessagingCampaign·GrowthCampaign·PopupCampaign·(MerchantPromotion).
   - Session → UserSession·AgencySession·PartnerSession. Role → TenantRole·PlatformRole·MenuPermission. Segment → CustomerSegment·DecisioningSegment·GrowthSegment.
3. **Alias 확정**: Buyer=Customer(crm_customers) · User=Member=Subscriber=app_user(subtype/속성) · Creator=Influencer(influencer_store) · AdSet=AdGroup(adset_id 흡수) · 채널키(amazon_spapi→amazon 등).
4. **SSOT 지정**: Customer=crm_customers · Order=channel_orders · Inventory=wms_stock · Credential=channel_credential · Plan=plan_config · Workflow=journeys · Rule=rule_engine · 취소제외=OrderHub::cancelExclusion · 발송게이트=CRM::isMarketingSendAllowed · ProductCost=FEFO→WAC→aggregateCogs 체인.
5. **식별자 정책**: 복합키 `tenant_id + source_system + source_account_id + external_object_id`. 외부 ID를 PK로 직접 사용 금지.
6. **비파괴**: 중복/고아 즉시 삭제 금지. 상태(CONSOLIDATION_PLANNED/BLOCKED_PENDING_EVIDENCE 등) 부여 후 후속 계획.

## 통합/마이그레이션 계획 (후속 단계 — 아직 미실행)
| 대상 | 계획 | 위험 | 우선 |
|---|---|---|---|
| Plan 4중(billing_plan/plan_pricing/subscription_packages→plan_config) | 읽기 어댑터 → plan_config 단일화, 나머지 LEGACY read-only | 결제/게이팅 회귀 CRITICAL | 高 |
| ROAS/CAC/LTV 이원(PHP+JS) | 프론트가 백엔드 산출 소비(공용 헬퍼), JS derive 제거 | 대시보드 수치 변동 HIGH | 高 |
| **OrderItem 부재**(다품목 유실) | order_item 테이블 신설(단, 채널 어댑터 line_items 전체 수집 필요) | COGS/귀속 정확도 CRITICAL·라이브검증 필요 | 高(제품결정) |
| subscription_coupon→free_coupons | 통합 | 구독쿠폰 회귀 MEDIUM | 中 |
| grade/tier/VIP 3체계 | 단일 등급 SSOT(crm_customers.grade) | 세그먼트/자동화 MEDIUM | 中 |
| TrustScore/QualityScore/DataLineage | 실보관 테이블 신설(Vol3) | 신규(무후퇴) | 中 |
| normalized_activity_event(고아) | 하류 배선 or 명시 라벨 | 라이브검증 필요 | 中(제품결정) |
| action_request(고아) | 생산자 신설 or 스켈레톤 제거 | 승인루프 활성화 결정 | 中(제품결정) |
| connector_config·line_sends·settlement(死) 등 | 사용경로 재확인 후 DEPRECATION | 낮음 | 低 |

## 무후퇴·영구 규칙
- Breaking Change 기본 금지. Canonical 의미/ID/PK/스코프/권한 변경은 영향분석+ADR+회귀테스트+PM 기록 필요.
- 모든 신규 엔티티는 CANONICAL_ENTITY_REGISTRY §10 생성 게이트 통과 후에만.

## 결과
Canonical Entity Registry 확정. 다음 단계 **EPIC 01-C Entity Relationship Mapping**의 입력자료 준비 완료.
