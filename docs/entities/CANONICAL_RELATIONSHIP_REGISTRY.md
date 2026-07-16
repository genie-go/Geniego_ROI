# EPIC 01-C — Canonical Relationship Registry (Master)

> **근거**: [`CANONICAL_ENTITY_REGISTRY.md`](CANONICAL_ENTITY_REGISTRY.md)(CE ID) + [`ENTITY_INVENTORY.md`](ENTITY_INVENTORY.md)(FK·join·sync·analytics·automation 증거). **비파괴**: REL ID·메타데이터·문서만. **FK/Join/Cascade 변경, 데이터 마이그레이션 없음**(§20) — 실 구조변경은 후속 계획·회귀테스트 후.
> **§21 통합**: 12개 파편 대신 본 마스터가 Relationship Registry·Matrix·Cardinality·Tenant Scope·Permission·Data Lineage·Duplicate·Conflict·Orphan·Cycle·External Mapping을 통합(EPIC 00 §2.2 준수). ADR=[`../architecture/ADR_ENTITY_RELATIONSHIPS.md`](../architecture/ADR_ENTITY_RELATIONSHIPS.md).
> **REL ID**: 영구·불변·재사용 금지. 방향 다르면 별도 ID 가능하나 의미중복 회피.
> **상태**(§23): VERIFIED(코드근거) · PARTIALLY_VERIFIED · RELATIONSHIP_CANDIDATE · UNVERIFIED · ORPHANED · CONFLICTING · CYCLE_RISK · TENANT_SCOPE_RISK · MIGRATION_REQUIRED.
> **삭제정책**: CASCADE / SOFT_DELETE / RESTRICT / SET_NULL / ARCHIVE_CHILD / RETAIN_FOR_AUDIT / ANONYMIZE_CHILD.

---

## 1. 조직·접근 관계 (REL-ORG / REL-SEC)

| REL ID | Source→Target | 관계 | Cardinality | Scope | 근거 | 삭제정책 | 상태 |
|---|---|---|---|---|---|---|---|
| REL-ORG-000001 | Tenant→Workspace(tenant_kv) | owns | ONE_TO_MANY | Tenant | tenant_kv PK(tenant_id,skey) | RESTRICT | VERIFIED |
| REL-ORG-000002 | Tenant→User(app_user) | contains | ONE_TO_MANY | Tenant | app_user.tenant_id(owner=acct_) | RETAIN_FOR_AUDIT | VERIFIED |
| REL-USR-000001 | User→Membership(team_role) | member_of | MANY_TO_ONE | Tenant | app_user.parent_user_id/team_id | SET_NULL | VERIFIED |
| REL-ORG-000003 | Team→User | manages | ONE_TO_MANY | Tenant | team.manager_user_id·acl | ARCHIVE_CHILD | VERIFIED |
| REL-SEC-000001 | Membership→Permission(acl) | scoped_to | ONE_TO_MANY | Tenant | acl_permission(subject_id,menu_key) | CASCADE | VERIFIED |
| REL-SEC-000002 | Permission→DataScope | refined_by | ONE_TO_MANY | Tenant | data_scope(subject) fail-closed | CASCADE | VERIFIED |
| REL-SEC-000003 | User→UserSession | authenticated_by | ONE_TO_MANY | User | user_session.user_id | CASCADE | VERIFIED |
| REL-ORG-000004 | Agency→ClientTenant(link) | delegated_to | MANY_TO_MANY | Global(agt_) | agency_client_link(status='approved' 재검증) | RESTRICT | VERIFIED |
| REL-ORG-000005 | Partner→Tenant | belongs_to | MANY_TO_ONE | Tenant | partner_account.tenant_id | RESTRICT | VERIFIED |

## 2. 자격증명·연동 관계 (REL-DAT)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 삭제정책 | 상태 |
|---|---|---|---|---|---|---|
| REL-DAT-000001 | Tenant→Credential | owns | ONE_TO_MANY | channel_credential.tenant_id(denyAnon) | RETAIN_FOR_AUDIT | VERIFIED |
| REL-DAT-000002 | Connector→Credential | authenticated_by | MANY_TO_ONE | ChannelCreds·loadCred(channel별) | RESTRICT | VERIFIED |
| REL-DAT-000003 | Connector→SyncRun | executes | ONE_TO_MANY | connector_sync_log(tenant,channel) | RETAIN_FOR_AUDIT | VERIFIED |
| REL-DAT-000004 | SyncRun→RawRecord | collects | ONE_TO_MANY | raw_vendor_event(EventNorm) | RETAIN_FOR_AUDIT | VERIFIED |
| REL-DAT-000005 | RawRecord→NormalizedRecord | normalized_from | ONE_TO_ONE | normalized_activity_event | RETAIN | **ORPHANED(하류 소비 0)** |
| REL-DAT-000006 | MappingRule→CanonicalField | maps_to | MANY_TO_ONE | mapping_entry(platform,field→canonical) | SOFT_DELETE | VERIFIED |
| REL-DAT-000007 | DataSource→Credential | derived_from | MANY_TO_ONE | data_source(external→channel_credential 자동유도) | SET_NULL | VERIFIED |
| REL-DAT-000008 | OAuthToken→Credential | provisions | ONE_TO_ONE | OAuth callback→channel_credential(oauth_*) | CASCADE | VERIFIED |

## 3. 고객 관계 (REL-CUS)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 삭제정책 | 상태 |
|---|---|---|---|---|---|---|
| REL-CUS-000001 | Customer→Order | purchased | ONE_TO_MANY | channel_orders.buyer_email→crm_customers(recordCrmPurchase, ChannelSync:4667) | ANONYMIZE_CHILD(DSAR)·RETAIN | VERIFIED |
| REL-CUS-000002 | Customer→CustomerActivity | has | ONE_TO_MANY | crm_activities.customer_id(purchase/refund) | RETAIN_FOR_AUDIT | VERIFIED |
| REL-CUS-000003 | Customer→CustomerSegment | member_of | MANY_TO_MANY | crm_segment_members | CASCADE(member) | VERIFIED |
| REL-CUS-000004 | Customer→CustomerIdentity | merged_by | MANY_TO_ONE | crm_customers.identity_id·crm_identity_merge_link(자동병합 금지) | RESTRICT | VERIFIED |
| REL-CUS-000005 | Customer→PreferenceProfile | governed_by | ONE_TO_ONE | crm_channel_prefs·crm_customer_prefs | CASCADE | VERIFIED |
| REL-CUS-000006 | Customer→LoyaltyGrade | scored_as | ONE_TO_ONE | crm_customers.grade(LTV 파생, 3체계 SSOT 대기) | — | PARTIALLY_VERIFIED |
| REL-CUS-000007 | AnonymousIdentity→Customer | resolves_to | OPTIONAL_ONE | attribution_identity_link↔crm identity **미연결** | SET_NULL | **UNVERIFIED(통합 여지)** |
| REL-CUS-000008 | Customer→Consent/DSAR | subject_of | ONE_TO_MANY | gdpr_consents·dsar_request(buyer_email 역참조) | RETAIN_FOR_AUDIT | VERIFIED |

## 4. 상품·주문 관계 (REL-PRD / REL-ORD / REL-INV)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 삭제정책 | 상태 |
|---|---|---|---|---|---|---|
| REL-PRD-000001 | Brand→Product | brands | ONE_TO_MANY | catalog_brand↔listing.brand | SET_NULL | VERIFIED |
| REL-PRD-000002 | Product→SKU | identified_by | ONE_TO_MANY | channel_products.sku(채널별 키잉 상이) | RESTRICT | VERIFIED |
| REL-PRD-000003 | Product→Listing | listed_as | ONE_TO_MANY | catalog_listing(sku 느슨연결·FK없음) | SOFT_DELETE | PARTIALLY_VERIFIED |
| REL-PRD-000004 | Product→Category | classified_as | MANY_TO_ONE | channel_category_map | SET_NULL | VERIFIED |
| REL-INV-000001 | SKU→Inventory(물리) | stocked_as | ONE_TO_MANY | wms_stock(tenant,sku,wh_id) | RESTRICT | VERIFIED |
| REL-INV-000002 | Warehouse→Inventory | holds | ONE_TO_MANY | wms_stock.wh_id(default 파편화) | ARCHIVE_CHILD | VERIFIED·TENANT_SCOPE 주의(wh_id='') |
| REL-INV-000003 | SKU→ChannelInventory | projected_as | ONE_TO_MANY | channel_inventory.available(투영) | — | VERIFIED·**중복차감 MIGRATION_REQUIRED** |
| REL-PRD-000005 | SKU→ProductCost | costed_by | ONE_TO_ONE | FEFO(wms_lots)→WAC(channel_inventory.cost)→aggregateCogs | — | VERIFIED(SSOT 체인) |
| REL-ORD-000001 | Order→Customer | purchased_by | MANY_TO_ONE | channel_orders.buyer_email→crm_customers | RETAIN_FOR_AUDIT | VERIFIED |
| REL-ORD-000002 | Order→OrderItem | contains_item | ONE_TO_MANY | **부재(line_items[0]만 flatten)** | — | **ABSENT·MIGRATION_REQUIRED(다품목 유실·최우선)** |
| REL-ORD-000003 | Order→Claim | refunded_by | ONE_TO_MANY | orderhub_claims(channel,order_id) | RETAIN_FOR_AUDIT | VERIFIED |
| REL-ORD-000004 | Order→Shipment | shipped_by | ONE_TO_MANY | shipment_tracking(order_ref) | RETAIN | VERIFIED |
| REL-ORD-000005 | Order→Settlement | settled_in | MANY_TO_ONE | orderhub_settlements(period,channel) rollup | RETAIN_FOR_AUDIT | VERIFIED |
| REL-ORD-000006 | Order→AttributionResult | attributed_to | ONE_TO_ONE | attribution_result.order_id→channel_order_id(NOT EXISTS 취소제외) | RETAIN | VERIFIED |
| REL-ORD-000007 | Order→Inventory | deducts | ONE_TO_MANY | reflectChannelSale(wms_stock+channel_inventory **이중차감**) | — | VERIFIED·MIGRATION_REQUIRED |
| REL-ORD-000008 | Order→MerchantPromotion/Coupon | discounted_by | MANY_TO_MANY | coupon_code·setAttribution | SET_NULL | PARTIALLY_VERIFIED(enforcement 고아) |

## 5. 마케팅 관계 (REL-MKT / REL-CMP)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 상태 |
|---|---|---|---|---|---|
| REL-CHN-000001 | AdChannel→AdAccount | has | ONE_TO_MANY | performance_metrics.channel/account | VERIFIED |
| REL-CMP-000001 | AdAccount→AdCampaign | runs | ONE_TO_MANY | campaign_ext_id | VERIFIED |
| REL-CMP-000002 | AdCampaign→AdGroup | contains | ONE_TO_MANY | ad_audience_breakdowns.adset_id(AdSet=AdGroup) | VERIFIED |
| REL-CMP-000003 | AdGroup→Ad | contains | ONE_TO_MANY | ad_ext_id | VERIFIED |
| REL-MKT-000001 | Ad→Creative | uses_creative | MANY_TO_ONE | creative_sku_map·ad_design(ad_ext_id) | PARTIALLY_VERIFIED(Creative 5분산) |
| REL-MKT-000002 | AdCampaign→AdPerformance | measured_by | ONE_TO_MANY | performance_metrics(campaign_ext_id) | VERIFIED |
| REL-MKT-000003 | Creative→SKU | promotes | MANY_TO_MANY | creative_sku_map(신뢰도) | VERIFIED |
| REL-MKT-000004 | ConversionEvent→Session | belongs_to | MANY_TO_ONE | pixel_events→pixel_sessions | VERIFIED |
| REL-MKT-000005 | ConversionEvent→PixelConfig | forwarded_to | MANY_TO_MANY | forwarded_*(Meta/TikTok/GA4/Pinterest/Snap/Reddit/LinkedIn) | VERIFIED |
| REL-MKT-000006 | AttributionTouch→AdCampaign | attributed_to | MANY_TO_ONE | attribution_touch(utm/coupon) | VERIFIED |
| REL-CMP-000004 | AdCampaign→Experiment(A/B) | tests | ONE_TO_MANY | ab_test←AutoCampaign launch | VERIFIED |

## 6. 크리에이터 관계 (REL-CRT)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 상태 |
|---|---|---|---|---|---|
| REL-CRT-000001 | Creator→CreatorContent | produces | ONE_TO_MANY | influencer_store(creators/ugc) | VERIFIED |
| REL-CRT-000002 | CreatorContent→Product/SKU | promotes | MANY_TO_MANY | OrderHub creator_id 귀속 | PARTIALLY_VERIFIED |
| REL-CRT-000003 | Creator→Commission | earns | ONE_TO_MANY | creator_settlements(committed/realized→Pnl influencerCost) | RETAIN_FOR_AUDIT | VERIFIED |
| REL-CRT-000004 | Creator→Referral | generates | ONE_TO_MANY | referral_code·OrderHub creator_id | VERIFIED |

## 7. 분석 관계 (REL-ANA)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 상태 |
|---|---|---|---|---|---|
| REL-ANA-000001 | Metric(ROAS)→Order+AdPerformance | derived_from | MANY_TO_MANY | Rollup(취소제외 SSOT)+**프론트 JS 재계산** | VERIFIED·DUPLICATE_CANDIDATE(이원) |
| REL-ANA-000002 | AttributionResult→AdCampaign→Order | attributed_to | — | attribution_result(order-match+markov) | VERIFIED |
| REL-ANA-000003 | LTV→Customer+Order+Refund | derived_from | — | CRM.php(역분개) + 프론트 CLV 재파생 | VERIFIED·DUPLICATE_CANDIDATE |
| REL-ANA-000004 | Forecast→SKU | predicts | ONE_TO_MANY | DemandForecast(Holt-Winters)→wms_supply_orders | VERIFIED |
| REL-ANA-000005 | Recommendation→AdChannel | recommends_for | — | AutoRecommend(truthRatio) | VERIFIED |
| REL-ANA-000006 | GraphScore→Influencer/Creative/SKU | scores | — | graph_node/graph_edge(3홉) | VERIFIED |
| REL-ANA-000007 | TrustScore/QualityScore→DataSource | assesses | — | DataPlatform(COMPUTED·비저장) | PARTIALLY_VERIFIED(Vol3 영속화 대기) |

## 8. 자동화 관계 (REL-AUT)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 상태 |
|---|---|---|---|---|---|
| REL-AUT-000001 | Workflow(Journey)→Enrollment | enrolls | ONE_TO_MANY | journey_enrollments(원자선점) | VERIFIED |
| REL-AUT-000002 | Enrollment→Action | executes | ONE_TO_MANY | advanceEnrollment(email/sms/kakao/push 실발송) | VERIFIED |
| REL-AUT-000003 | Action→Customer(via MessagingChannel) | acts_on | MANY_TO_ONE | Node send→Mailer/Kakao/NaverSms/WebPush | VERIFIED |
| REL-AUT-000004 | Action→Suppression/FrequencyCap | gated_by | MANY_TO_ONE | CRM::isMarketingSendAllowed(SSOT) | VERIFIED |
| REL-AUT-000005 | Rule→AdChannel/Order(Action) | acts_on | — | RuleEngine execAction(pause/webhook·reorder는 약배선) | VERIFIED |
| REL-AUT-000006 | Trigger→EntityEvent | triggered_by | — | runTriggerDetectors(churn/segment) | VERIFIED |
| REL-AUT-000007 | Alert→NotificationChannel | notifies | MANY_TO_ONE | alert_instance→notification_channel(Slack/email) | VERIFIED |
| REL-AUT-000008 | ActionRequest→(생산자) | approved_by | — | action_request(소비만·**생산자 0**) | **ORPHANED** |
| REL-AUT-000009 | AutoCampaign→AdCampaign(execute) | executes | — | AdAdapters::createCampaign/optimize | VERIFIED |

## 9. 운영·보안 관계 (REL-SEC / REL-OPS)

| REL ID | Source→Target | 관계 | Cardinality | 근거 | 상태 |
|---|---|---|---|---|---|
| REL-SEC-000010 | AuditLog→Actor+Target | logs | — | audit_log(actor,action,details) 외 5 | VERIFIED(6테이블 KEEP_SEPARATE) |
| REL-SEC-000011 | SecurityEvent→Session | detects | — | auth_audit_log·login_attempt | VERIFIED |
| REL-SEC-000012 | APIKey→Tenant | scoped_to | MANY_TO_ONE | api_key.tenant_id·role/scope | VERIFIED |
| REL-SEC-000013 | Secret→Credential | protects | — | Crypto(AES-GCM)→channel_credential | VERIFIED |
| REL-OPS-000001 | RateLimitPolicy→APIKey | controls | — | api_rate_limit.key_id | VERIFIED |

---

## 10. 중복/충돌/고아/순환 관계

**DUPLICATE_CANDIDATE**:
- REL-ANA-000001/003 (ROAS/LTV 백엔드 PHP + 프론트 JS **이원 관계**) — 공용헬퍼로 단일화 계획.
- returns→Order vs Claim(type=return)→Order (병렬 관계).

**CONFLICTING(외견)** — 실은 다른 스코프(충돌 아님·문서화):
- Order `purchased_by` Customer(REL-ORD-000001) vs Order `belongs_to` Tenant(격리) vs Order `settled_in` Settlement — 모두 유효·서로 다른 축.

**ORPHANED_RELATIONSHIP**:
- REL-DAT-000005 NormalizedRecord→(하류 분석 소비 0).
- REL-AUT-000008 ActionRequest→생산자 0.
- creative_asset user_id 스코프(≠tenant) — 관계 스코프 불일치.

**CYCLE_RISK**:
- Journey→Action→(re-enroll) — 순환방지 마커(journey_node_sent·claimSendOnce) 존재 → 안전.
- Campaign→Recommendation→Decision→Campaign — advisory(자동집행 승인정책 게이트) → 무한루프 없음.
- Product→Category→Product — 계층(순환 아님).
- **판정: 위험 순환 0**(전부 멱등/승인 게이트로 차단 확인).

**TENANT_SCOPE_RISK**:
- tenant_id DEFAULT 'demo' 관계군(caller 누락 시 real→demo 낙하 여지).
- ads_mapping(전역·레거시)·pg_config(전역)·kr_channel(전역) — 관계가 tenant 경계 미강제(설계/레거시).
- **신규 실 crosstenant 결함 0** — 격리 핸들러는 WHERE tenant_id=? fail-closed.

---

## 11. 데이터 계보 (Data Lineage) 관계

```
External Channel Object (Shopify/Meta/…)
  → RawRecord(raw_vendor_event) [REL-DAT-000004]
  → NormalizedRecord(normalized_activity_event) [REL-DAT-000005 ★ORPHANED — 하류 미연결]
  ‖ (실 분석 경로는 별도)
  → CanonicalEntity(channel_orders/performance_metrics/ad_insight_agg) [ChannelSync/Connectors ingest]
  → Metric(Rollup ROAS/CAC — 취소제외 SSOT) [REL-ANA-000001]
  → Insight/Recommendation(AutoRecommend) [REL-ANA-000005]
  → DecisionProposal(Decisioning) 
  → AutomationRun(AutoCampaign→AdAdapters 실집행) [REL-AUT-000009]
```
**계보 관측성 갭**: normalized 계층이 실 분석과 단절("표시 전용 섬"). DataLineageRecord는 COMPUTED(비영속). 각 단계 Mapping/Model Version 추적은 부분(Vol3 영속화 대기).

## 12. 외부 채널 관계 매핑 (§15)
- Shopify Order→Customer ⇒ Order `purchased_by` Customer(REL-ORD-000001).
- Meta Ad→AdSet ⇒ Ad `belongs_to` AdGroup(REL-CMP-000003, adset_id 흡수).
- GA4/픽셀 Event→Session ⇒ ConversionEvent `belongs_to` Session(REL-MKT-000004).
- Coupang/Naver Order→Buyer ⇒ Order `purchased_by` Customer(합성 이메일키).
- Stripe/PG PaymentIntent→SaaSPayment(REL 별도·커머스 아님) — UNVERIFIED(구독 결제).

## 13. §25 완료 보고 대조
Canonical Entity ~90 · 조사 Relationship ~55 · Canonical(VERIFIED) ~45 · UNVERIFIED/PARTIAL ~8 · DUPLICATE 2 · CONFLICT(외견) 1군 · ORPHANED 3 · CYCLE_RISK 0(차단확인) · TENANT_SCOPE_RISK 4(설계/레거시) · PERMISSION_RISK 0 · MIGRATION_REQUIRED 3(OrderItem·이중차감·Variant) · CRITICAL Regression Risk: OrderItem 신설(다품목). 코드변경 0(비파괴).
