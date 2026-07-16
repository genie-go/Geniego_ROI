# EPIC 01-B — Canonical Entity Registry (Master)

> **근거**: [`ENTITY_INVENTORY.md`](ENTITY_INVENTORY.md)(EPIC 01-A, ~290 엔티티) + `docs/registry/DatabaseRegistry`·`ComponentRegistry`. **비파괴**: 본 단계는 Canonical 확정·매핑·계획만(문서·CE ID 메타데이터). **DB 병합/삭제/API 교체 없음** — 실 통합은 후속 단계 계획·회귀테스트 후(§20).
> **§21 통합**: 12개 파편 대신 본 마스터가 Registry·Matrix·Alias·Name Collision·External Mapping·식별자/스코프/민감도 정책·중복처리·생성게이트를 통합 보관(EPIC 00 §2.2 준수). ADR=[`../architecture/ADR_ENTITY_CANONICALIZATION.md`](../architecture/ADR_ENTITY_CANONICALIZATION.md).
> **CE ID 규칙**: 영구·불변·재사용 금지. Alias는 자체 ID 없이 대상 CE 참조. 외부 채널 ID와 혼용 금지.

## 상태 범례 (§11)
`CANONICAL_SELECTED` 표준선정 · `ALIAS_ONLY` 별칭 · `SPECIALIZED_SUBTYPE` 하위타입 · `LEGACY_COMPATIBILITY` 호환유지 · `CONSOLIDATION_PLANNED` 통합예정 · `MIGRATION_REQUIRED` 마이그레이션필요 · `KEEP_SEPARATE` 의미분리유지 · `BLOCKED_PENDING_EVIDENCE` 근거대기 · `ABSENT` 부재

## 스코프 범례: Global · Tenant · Workspace · User · System · PublicRef
## 민감도: PUBLIC · INTERNAL · CONFIDENTIAL · RESTRICTED · SENSITIVE_PERSONAL · FINANCIAL · SECURITY_SECRET

---

## 1. 조직·계정·접근 (CE-ORG / CE-USR / CE-SEC)

| CE ID | Canonical Name | 정의(포함/제외) | Canonical DB·Service | Scope | 민감도 | Aliases→ | 상태 |
|---|---|---|---|---|---|---|---|
| CE-ORG-000001 | **Tenant** | 격리 경계(owner=`acct_<id>`). 제외: 조직도 | `tenant_id`(문자열키)·UserAuth::resolveTenantId | System | INTERNAL | Workspace(kv상태는 별) | CANONICAL_SELECTED |
| CE-ORG-000002 | **Workspace** | 테넌트 KV 상태/설정 | tenant_kv·WorkspaceState | Tenant | INTERNAL | — | CANONICAL_SELECTED |
| CE-USR-000001 | **User** | 로그인 주체(구독회원). 포함: Member(팀원)·Subscriber(구독속성). 제외: Customer(최종구매자)·광고계정 | app_user·UserAuth | Tenant(owner/child) | SENSITIVE_PERSONAL | **Member→User(team_role subtype)** · **Subscriber→User(plan 속성)** | CANONICAL_SELECTED |
| CE-USR-000002 | **Membership** | User의 팀 소속(parent_user_id·team_role) | app_user 컬럼·TeamPermissions | Tenant | INTERNAL | — | SPECIALIZED_SUBTYPE(of User) |
| CE-ORG-000003 | **Team** | 팀/부서 | team·TeamPermissions | Tenant | INTERNAL | Department→Team | CANONICAL_SELECTED |
| CE-SEC-000001 | **Role** | ★이름충돌 분리: 아래 4 CE로 분화 | — | — | — | NAME_COLLISION |
| CE-SEC-000002 | **TenantRole** | 테넌트내 owner/manager/member | app_user.team_role | Tenant | INTERNAL | — | KEEP_SEPARATE |
| CE-SEC-000003 | **PlatformRole** | 플랫폼 admin 역할 | admin_roles·user_roles | Global | RESTRICTED | — | KEEP_SEPARATE |
| CE-SEC-000004 | **MenuPermission** | 메뉴 RBAC/ABAC | acl_permission·data_scope | Tenant | INTERNAL | — | KEEP_SEPARATE |
| CE-SEC-000005 | **Permission(ACL)** | 주체×메뉴×액션 | acl_permission·TeamPermissions | Tenant | INTERNAL | — | CANONICAL_SELECTED |
| CE-USR-000003 | **Invitation** | SCIM/초대 프로비저닝 | app_user(scim_external_id)·EnterpriseAuth | Tenant | SENSITIVE_PERSONAL | — | CANONICAL_SELECTED |
| CE-SEC-000006 | **Session** | ★이름충돌: 신원평면별 분리 | — | — | — | NAME_COLLISION |
| CE-SEC-000007 | **UserSession** | 고객 로그인 세션 | user_session | User | SECURITY_SECRET | oauth_state/sso_state(임시) | CANONICAL_SELECTED |
| CE-SEC-000008 | **AgencySession** | 대행사 세션 | agency_session | Global(agt_) | SECURITY_SECRET | — | KEEP_SEPARATE |
| CE-SEC-000009 | **PartnerSession** | 파트너 세션 | partner_session | Tenant | SECURITY_SECRET | — | KEEP_SEPARATE |

**계정(Account) 이름충돌 → 5 Canonical 분리(§3.2)**:

| CE ID | Canonical Name | DB·Service | Scope | 상태 |
|---|---|---|---|---|
| CE-USR-000004 | **UserAccount** | app_user | Tenant | KEEP_SEPARATE |
| CE-MKT-000010 | **AdAccount** | performance_metrics.account/ad_ext account_id·connector | Tenant | KEEP_SEPARATE |
| CE-BIZ-000010 | **BillingAccount** | app_user+tenant_subscription+billing_method | Tenant/User | KEEP_SEPARATE(전용테이블 ABSENT) |
| CE-ORG-000004 | **AgencyAccount** | agency_account·AgencyPortal | Global | KEEP_SEPARATE |
| CE-ORG-000005 | **PartnerAccount** | partner_account·PartnerPortal | Tenant | KEEP_SEPARATE |

---

## 2. 고객 (CE-CUS)

| CE ID | Canonical Name | 정의 | Canonical DB·Service | Scope | 민감도 | Aliases→ | 상태 |
|---|---|---|---|---|---|---|---|
| CE-CUS-000001 | **Customer** | 테넌트 최종구매고객(SSOT). 포함: Buyer·LoyaltyProfile(grade)·VIP·ChurnRisk(속성/파생). 제외: User(구독회원) | crm_customers·CRM | Tenant | SENSITIVE_PERSONAL | **Buyer→Customer**(channel_orders.buyer_email·recordCrmPurchase) · Member(loyalty)→Customer.grade · Shopper→Customer | CANONICAL_SELECTED |
| CE-CUS-000002 | **CustomerIdentity** | 다중연락처 canonical 통합 | crm_customers.identity_id·crm_identity_merge_link·CRM | Tenant | SENSITIVE_PERSONAL | — | CANONICAL_SELECTED |
| CE-CUS-000003 | **AnonymousIdentity** | 익명 세션 크로스디바이스(PII 미저장 해시) | attribution_identity_link·attribution_device_sig | Tenant | CONFIDENTIAL | — | KEEP_SEPARATE(↔CustomerIdentity 통합 UNVERIFIED) |
| CE-CUS-000004 | **CustomerActivity** | 구매/환불 이력(LTV 역분개) | crm_activities | Tenant | FINANCIAL | — | CANONICAL_SELECTED |
| CE-CUS-000005 | **CustomerSegment** | 테넌트 고객 세그먼트 | crm_segments·crm_segment_members | Tenant | INTERNAL | — | CANONICAL_SELECTED |
| CE-CUS-000006 | **PreferenceProfile** | 채널/토픽 수신동의 | crm_channel_prefs·crm_customer_prefs·PreferenceCenter | Tenant | SENSITIVE_PERSONAL | — | CANONICAL_SELECTED |
| CE-CUS-000007 | **Consent/DSAR** | 동의·정보주체 요청 | gdpr_consents·dsar_request | Tenant/Visitor | SENSITIVE_PERSONAL | — | CANONICAL_SELECTED |
| CE-CUS-000008 | **LoyaltyGrade** | ★grade/tier/VIP 3체계 → 단일화 대상 | crm_customers.grade(SSOT후보)·CustomerAI tier·churn | Tenant | INTERNAL | tier→grade·VIP→grade | CONSOLIDATION_PLANNED(3체계 SSOT 부재) |
| (CE-CUS-*) | Contact·Prospect·Persona·Cohort·LoyaltyMember | 테넌트 고객용 전용테이블 부재(파생/집계) | — | — | — | ABSENT |

**★플랫폼 B2B(테넌트 고객과 분리)**: `admin_growth_lead`(Lead)·`admin_growth_segment`(B2B타겟) = **CE-SEC/OPS 별도**(platform_growth 전역). Lead≠테넌트 고객리드(NAME_COLLISION).

---

## 3. 상품·커머스 (CE-PRD / CE-SKU / CE-ORD / CE-INV)

| CE ID | Canonical Name | 정의 | Canonical DB·Service | Scope | Aliases/외부 | 상태 |
|---|---|---|---|---|---|---|
| CE-PRD-000001 | **Product** | 채널 상품(수집) | channel_products·ChannelSync | Tenant | Shopify product·item→Product | CANONICAL_SELECTED |
| CE-PRD-000002 | **Listing** | 송출 상품(등록) | catalog_listing·Catalog | Tenant | — | SPECIALIZED_SUBTYPE(vs Product·FK없음 → CONSOLIDATION_PLANNED) |
| CE-SKU-000001 | **SKU** | 상품 식별키(채널별 키잉 상이) | channel_products.sku 등 | Tenant | variants[0].sku/externalVendorSku/sellerManagementCode | CANONICAL_SELECTED(ALIAS 다수) |
| CE-PRD-000003 | **Variant** | 옵션 변형 | variants_json(FLAT) | Tenant | — | ABSENT(정규화 모델 없음)·MIGRATION_REQUIRED |
| CE-PRD-000004 | **Category** | 채널 카테고리 매핑 | channel_category_map·catalog | Tenant | — | CANONICAL_SELECTED |
| CE-PRD-000005 | **Brand** | 상품 브랜드 | catalog_brand·Catalog | Tenant | (brand_asset·회사brand는 별 CE) | CANONICAL_SELECTED(NAME_COLLISION 분리) |
| CE-ORD-000001 | **Order** | 주문(SSOT·전 채널) | channel_orders·OrderHub | Tenant | shopify/coupang/naver order→Order·live_orders(승격) | CANONICAL_SELECTED |
| CE-ORD-000002 | **OrderItem** | 주문 라인아이템 | **부재(flatten·line_items[0]만)** | Tenant | — | **ABSENT·MIGRATION_REQUIRED(다품목 유실 — 최우선)** |
| CE-ORD-000003 | **Claim** | 취소/반품/교환 이벤트원장(SSOT) | orderhub_claims·OrderHub | Tenant | returns(포탈)→Claim(type=return) | CANONICAL_SELECTED |
| CE-ORD-000004 | **Cancellation/Return/Exchange** | 클레임 하위유형 + 취소제외 2축 술어 | OrderHub::cancelExclusion/observedExclusion | Tenant | — | SPECIALIZED_SUBTYPE(of Claim) |
| CE-ORD-000005 | **Shipment** | 배송 추적 | shipment_tracking·Logistics | Tenant | — | CANONICAL_SELECTED |
| CE-INV-000001 | **Inventory(물리)** | 물리재고 SSOT(창고별) | wms_stock.on_hand·Wms | Tenant | — | CANONICAL_SELECTED |
| CE-INV-000002 | **ChannelInventory** | 채널 노출 투영 | channel_inventory.available | Tenant | — | SPECIALIZED_SUBTYPE(투영·이중차감 MIGRATION_REQUIRED) |
| CE-INV-000003 | **Warehouse/Lot/Bin** | 창고·로트(FEFO)·빈 | wms_warehouses·wms_lots·wms_bins | Tenant | — | CANONICAL_SELECTED |
| CE-INV-000004 | **SupplyOrder** | 발주 | wms_supply_orders(Db::ensure SSOT) | Tenant | — | CANONICAL_SELECTED |
| CE-PRD-000006 | **ProductCost** | 원가(FEFO→WAC 계층) | wms_lots.cost→channel_inventory.cost→OrderHub::aggregateCogs | Tenant | — | CANONICAL_SELECTED(의도된 SSOT 체인) |
| CE-PRD-000007 | **Price/PriceHistory** | 판매가·변경이력 | price_history·Catalog | Tenant | — | CANONICAL_SELECTED |
| (CE-ORD-*) | Cart·Checkout·Collection·Option·Bundle | 커머스 엔티티 부재(주문은 채널 완성형 유입) | — | — | — | ABSENT |

**정산/결제(NAME_COLLISION·중복)**:

| CE ID | Canonical Name | DB | 상태 |
|---|---|---|---|
| CE-ORD-000006 | **Settlement(채널)** | orderhub_settlements(rollup·SSOT) | CANONICAL_SELECTED |
| CE-ORD-000007 | SettlementLine(KR) | kr_settlement_line(UNIQUE없음) | CONSOLIDATION_PLANNED(재적재 중복위험) |
| CE-FIN-000001 | **PGSettlement** | pg_settlement·PgSettlement | KEEP_SEPARATE(결제사 도메인) |
| (死) | settlement | Db.php:529(writer 미관측) | DEPRECATION_PLANNED |
| CE-FIN-000002 | **SaaSPayment** | payment_history·Payment(Toss)·Paddle | KEEP_SEPARATE(SaaS≠커머스) |

**쿠폰/프로모션(NAME_COLLISION·중복)**:

| CE ID | Canonical Name | DB | 상태 |
|---|---|---|---|
| CE-BIZ-000020 | **BillingCoupon(SaaS)** | free_coupons(SSOT후보)·CouponEngine | CANONICAL_SELECTED |
| (dup) | subscription_coupon | Payment(months) | **CONSOLIDATION_PLANNED→free_coupons 통합** |
| CE-MKT-000030 | **MerchantPromotion** | merchant_promotion·Promotion | CANONICAL_SELECTED(단 enforcement ORPHANED) |
| CE-MKT-000031 | **AttributionCode** | attribution_coupon(할인아님·추적) | KEEP_SEPARATE |

---

## 4. 마케팅·크리에이터 (CE-CHN / CE-CMP / CE-MKT)

**Channel 이름충돌 → 3 Canonical(§3.2)**:

| CE ID | Canonical Name | DB | Scope | 상태 |
|---|---|---|---|---|
| CE-CHN-000001 | **ChannelRegistry** | channel_registry(group_type 구분자·SSOT) | Global | CANONICAL_SELECTED |
| CE-CHN-000002 | **SalesChannel** | kr_channel·channel_products(group=sales) | Global/Tenant | KEEP_SEPARATE |
| CE-CHN-000003 | **AdChannel** | performance_metrics.channel(group=marketing) | Tenant | KEEP_SEPARATE |
| CE-CHN-000004 | **MessagingChannel** | email/sms/kakao/line/omni(group=messaging) | Tenant | KEEP_SEPARATE |

**Campaign 이름충돌 → 5 Canonical**:

| CE ID | Canonical Name | DB | 상태 |
|---|---|---|---|
| CE-CMP-000001 | **AdCampaign** | auto_campaign + performance_metrics.campaign_ext_id | CANONICAL_SELECTED |
| CE-CMP-000002 | **MessagingCampaign** | email/sms/kakao/line/omni_campaigns | KEEP_SEPARATE |
| CE-CMP-000003 | **GrowthCampaign** | admin_growth_campaign(플랫폼 자사) | KEEP_SEPARATE(Global) |
| CE-CMP-000004 | **PopupCampaign** | web_popup·web_popup_variant | KEEP_SEPARATE |
| (→CE-MKT-000030) | Promotion | merchant_promotion | (상품/커머스 참조) |

| CE ID | Canonical Name | DB | Aliases/외부 | 상태 |
|---|---|---|---|---|
| CE-MKT-000001 | **AdPerformance** | performance_metrics(일일·channel/account/campaign_ext_id) | Meta/Google/TikTok fetch*Rows | CANONICAL_SELECTED |
| CE-MKT-000002 | **AdInsight** | ad_insight_agg·ad_audience_breakdowns(계층 세그) | — | CANONICAL_SELECTED |
| CE-MKT-000003 | **AdGroup** | ad_audience_breakdowns.adset_id | **AdSet=AdGroup**(Meta adset·Google/TikTok adgroup) | CANONICAL_SELECTED(ALIAS) |
| CE-MKT-000004 | **Ad** | ad_ext_id | ad_id→ad_ext_id | CANONICAL_SELECTED |
| CE-MKT-000005 | **Keyword** | keyword_insight·digital_shelf_keyword | — | CANONICAL_SELECTED |
| CE-MKT-000006 | **Creative** | ★5테이블 분산 → 계층 정의 | creative_variant(A/B)·ad_design(AI)·creative_asset(팝업·user_id!)·brand_asset·creative_sku_map | — | CONSOLIDATION_PLANNED |
| CE-MKT-000007 | **ConversionEvent(Pixel)** | pixel_events(1st-party·UTM·PII해시) | GA4 event→ConversionEvent | CANONICAL_SELECTED |
| CE-MKT-000008 | **PixelConfig** | pixel_configs(CAPI 목적지) | — | CANONICAL_SELECTED |
| CE-MKT-000009 | **AttributionTouch** | attribution_touch·attribution_deeplink | UTM/TrackingLink→Touch | CANONICAL_SELECTED |
| CE-MKT-000011 | **Experiment** | ab_test·onsite_experiment·holdout_experiment | — | KEEP_SEPARATE(도메인별) |
| CE-MKT-000012 | **Feed** | feed_template·FeedTransform | — | CANONICAL_SELECTED |
| (CE-MKT-*) | Bid·Placement·Offer·CTA·Caption·Hashtag | 독립 엔티티 부재(raw_json/속성 흡수) | — | — | ABSENT |

**크리에이터**:

| CE ID | Canonical Name | DB | Aliases | 상태 |
|---|---|---|---|---|
| CE-MKT-000020 | **Creator** | influencer_store(kind='creators') | **Influencer=Creator** | CANONICAL_SELECTED |
| CE-MKT-000021 | **CreatorContent(UGC)** | influencer_store(kind='ugc')·ContentCalendar·product_review | Post/Video/Image→UGC | CANONICAL_SELECTED(분산·CONSOLIDATION_PLANNED) |
| CE-MKT-000022 | **Commission/Settlement** | creator_settlements | — | CANONICAL_SELECTED |
| CE-MKT-000023 | **Affiliate/Referral** | referral_code·referral_signup(+OrderHub creator_id) | Affiliate→Referral | CANONICAL_SELECTED(전용 Affiliate 테이블 없음) |
| CE-ORG-000006 | **Partner** | partner_account | — | CANONICAL_SELECTED |
| CE-ORG-000007 | **Agency** | agency_account·agency_client_link | — | CANONICAL_SELECTED |
| CE-MKT-000024 | **Review** | product_review·review_request/widget | — | CANONICAL_SELECTED |

---

## 5. 데이터·연동 (CE-DAT)

| CE ID | Canonical Name | DB·Service | Scope | 민감도 | 상태 |
|---|---|---|---|---|---|
| CE-DAT-000001 | **Credential** | channel_credential(SSOT·AES-GCM·마스킹)·ChannelCreds | Tenant | SECURITY_SECRET | CANONICAL_SELECTED |
| CE-DAT-000002 | **OAuthToken** | connector_token·channel_credential(oauth_*)·OAuth | Tenant | SECURITY_SECRET | CANONICAL_SELECTED |
| CE-DAT-000003 | **MessagingCredential** | kakao_settings·line_settings(전용) | Tenant | SECURITY_SECRET | LEGACY_COMPATIBILITY(read-bridge to Credential) |
| CE-DAT-000004 | **Connector** | channel_registry(정의) | Global | — | CANONICAL_SELECTED |
| CE-DAT-000005 | **SyncRun** | connector_sync_log(실)·catalog_sync_job | Tenant | INTERNAL | CANONICAL_SELECTED |
| (준고아) | connector_health·ingestion_run_log | Risk 시드 스텁 | — | — | DEPRECATION_PLANNED(→SyncRun) |
| (고아) | connector_config | CREATE만 | — | — | BLOCKED_PENDING_EVIDENCE |
| CE-DAT-000006 | **RawRecord(L1)** | raw_vendor_event·EventNorm | Tenant | CONFIDENTIAL | CANONICAL_SELECTED |
| CE-DAT-000007 | **NormalizedRecord(L2)** | normalized_activity_event | Tenant | CONFIDENTIAL | **ORPHANED(하류소비0)·BLOCKED_PENDING_EVIDENCE** |
| CE-DAT-000008 | **MappingRule** | mapping_entry·mapping_change_request·mapping_validation_rule | Tenant | INTERNAL | CANONICAL_SELECTED |
| CE-DAT-000009 | **WebhookEvent** | (in→raw_vendor_event)·webhook_endpoint/delivery(out) | Tenant | INTERNAL | CANONICAL_SELECTED |
| CE-DAT-000010 | **DataSource** | data_source(source_account)·DataPlatform | Tenant | INTERNAL | CANONICAL_SELECTED |
| CE-DAT-000011 | **SchemaVersion** | schema_migrations | Global | INTERNAL | CANONICAL_SELECTED |
| (ABSENT) | ImportJob·SourceObject(독립) | — | — | — | ABSENT |

---

## 6. 분석·AI (CE-ANA)

| CE ID | Canonical Name | DB·Service | 상태 |
|---|---|---|---|
| CE-ANA-000001 | **Metric(ROAS/CAC/LTV)** | ★이원계산 — 백엔드 Rollup(SSOT후보)+프론트 JS derive | **CONSOLIDATION_PLANNED(공용헬퍼로 SSOT화)** |
| CE-ANA-000002 | **AttributionResult** | attribution_result·Attribution | CANONICAL_SELECTED |
| CE-ANA-000003 | **MMMResult** | 비저장(COMPUTED)·Mmm | KEEP_SEPARATE(비영속) |
| CE-ANA-000004 | **Forecast** | 비저장·DemandForecast(실 Holt-Winters) | CANONICAL_SELECTED(COMPUTED) |
| CE-ANA-000005 | **Insight** | 비저장·Insights | CANONICAL_SELECTED(COMPUTED) |
| CE-ANA-000006 | **DecisionProposal** | 비저장·Decisioning(집계세그) | CANONICAL_SELECTED(COMPUTED) |
| CE-ANA-000007 | **Anomaly** | 비저장·AnomalyDetection(SPC)·demoScan(mock) | CANONICAL_SELECTED(탐지전용·자동화 미연결) |
| CE-ANA-000008 | **Recommendation** | 비저장·AutoRecommend(empirical Bayes/UCB) | CANONICAL_SELECTED |
| CE-ANA-000009 | **Benchmark** | channel_benchmark(전역)·channel_learned_prior(테넌트) | CANONICAL_SELECTED |
| CE-ANA-000010 | **GraphScore** | graph_node·graph_edge·GraphScore | CANONICAL_SELECTED |
| CE-ANA-000011 | **RiskPrediction** | risk_prediction·risk_model_registry | CANONICAL_SELECTED(결정식) |
| CE-ANA-000012 | **ModelVersion** | ml_models·ml_model_metrics(실테넌트 빈·데모 mock) | BLOCKED_PENDING_EVIDENCE(실 훈련/추론 부재) |
| CE-ANA-000013 | **TrustScore/QualityScore/DataLineage** | ★실보관 테이블 없음(COMPUTED) — Vol3 헌법 갭 | **CONSOLIDATION_PLANNED(영속화)** |
| (ABSENT) | Scenario·Opportunity·전역 Metric 시맨틱레이어 | — | ABSENT |

---

## 7. 자동화 (CE-AUT)

| CE ID | Canonical Name | DB·Service | 상태 |
|---|---|---|---|
| CE-AUT-000001 | **Workflow(Journey)** | journeys·JourneyBuilder | CANONICAL_SELECTED |
| CE-AUT-000002 | **Enrollment/Run** | journey_enrollments(원자선점) | CANONICAL_SELECTED |
| CE-AUT-000003 | **Rule** | rule_engine·RuleEngine(크로스도메인) | CANONICAL_SELECTED |
| CE-AUT-000004 | **Action** | Node send·execAction(email/sms/kakao/push/webhook/pause) | CANONICAL_SELECTED(reorder는 약배선) |
| CE-AUT-000005 | **SendOnce/Idempotency** | journey_node_sent | CANONICAL_SELECTED |
| CE-AUT-000006 | **Schedule/Daypart** | daypart_schedule·cron(33개) | CANONICAL_SELECTED |
| CE-AUT-000007 | **FrequencyCap** | ★3중 → CRM SSOT | CRM::isMarketingSendAllowed(SSOT)·frequency_window(설정)·RuleEngine checkFrequencyCap(@deprecated) | CONSOLIDATION_PLANNED |
| CE-AUT-000008 | **Suppression** | email_suppression + PreferenceCenter → CRM SSOT | CANONICAL_SELECTED |
| CE-AUT-000009 | **MessagingQueue/Outbox** | email_sends·kakao_sends·sms_messages·omni_outbox | CANONICAL_SELECTED |
| CE-AUT-000010 | **Alert** | alert_policy·alert_instance·Alerting(생산자 존재) | CANONICAL_SELECTED |
| CE-AUT-000011 | **ActionRequest(Approval)** | action_request·Alerting(소비만) | **ORPHANED(생산자0)·BLOCKED_PENDING_EVIDENCE** |
| CE-AUT-000012 | **Experiment(A/B/DCO)** | ab_test·ab_variant | CANONICAL_SELECTED |
| (고아) | line_sends·catalog_writeback_approval·returns_automation·sc_risk_rules·frequency_event | — | BLOCKED_PENDING_EVIDENCE |

---

## 8. 운영·보안 (CE-SEC / CE-OPS)

| CE ID | Canonical Name | DB | Scope | 상태 |
|---|---|---|---|---|
| CE-SEC-000010 | **AuditLog** | ★6테이블 목적별 분리 유지 | audit_log·security_audit_log·auth_audit_log·menu_audit_log·paddle_audit_log·dsar_audit_log | KEEP_SEPARATE(문서화) |
| CE-OPS-000001 | **Alert/Notification** | alert_instance·notification_channel·user_notification | Tenant | CANONICAL_SELECTED |
| CE-SEC-000011 | **APIKey** | api_key(SHA-256·role/scope) | Tenant | SECURITY_SECRET | CANONICAL_SELECTED |
| CE-SEC-000012 | **Secret** | app_setting.cred_enc_key·Crypto(AES-256-GCM) | Global | SECURITY_SECRET | CANONICAL_SELECTED |
| CE-OPS-000002 | **RateLimitPolicy** | api_rate_limit·login_attempt·growth_capture_rl | 다양 | CANONICAL_SELECTED |
| CE-OPS-000003 | **FeatureFlag(플랜게이팅)** | plan_config·plan_menu_access·menu_tree | Global | CANONICAL_SELECTED(전용 flag 테이블 부재) |
| CE-OPS-000004 | **Environment** | Db::env(demo/production sibling mirror) | System | CANONICAL_SELECTED |
| CE-OPS-000005 | **Job** | writeback_job·catalog_sync_job·channel_shipment_job | Tenant | CANONICAL_SELECTED(큐테이블 없음) |

**Plan/Subscription 중복 → Canonical**:

| CE ID | Canonical Name | DB | 상태 |
|---|---|---|---|
| CE-BIZ-000001 | **Plan** | plan_config(SSOT·PlanLimits 강제) | CANONICAL_SELECTED |
| (dup) | billing_plan·plan_pricing·subscription_packages·menu_tier_pricing | — | **CONSOLIDATION_PLANNED→plan_config** |
| CE-BIZ-000002 | **Subscription** | tenant_subscription·app_user.plan | CANONICAL_SELECTED(app_user.plans 컬럼 CONSOLIDATION) |
| CE-BIZ-000003 | **BusinessProfile** | tenant_business_profile(회사·브랜드·업종·국가) | CANONICAL_SELECTED |

---

## 9. 식별자 정책 (§14)

- 복합 자연키 강제: **`tenant_id + source_system + source_account_id + external_object_id`**. 외부 ID를 PK로 직접 사용 금지.
- 이미 준수: channel_orders UNIQUE(tenant,channel,ch_order_id)·channel_products UNIQUE(tenant,channel,product_id)·channel_credential UNIQUE(tenant,channel,key). 
- **미준수(위험)**: kr_settlement_line(UNIQUE 없음)·attribution_coupon(UNIQUE 없음)·attribution_result(앱레벨 dedup만).

## 10. 신규 엔티티 생성 게이트 (§18 — 영구 규칙)
신규 테이블/모델/타입/API/Service 생성 전 본 Registry 조회 + 다음 전부 증명: ①기존 CE로 표현불가 ②확장 불가 ③속성/Subtype 불가 ④Alias 아님 ⑤이름충돌 아님 ⑥독립 생명주기/소유권 ⑦중복저장 없음 ⑧관계/권한 명확 ⑨테스트/문서 계획 ⑩Registry+PM 등록. 하나라도 불충분 시 생성 금지.

## 11. 검증 게이트 대조 (§23)
- [x] 전 Inventory 후보 처리 · [x] 중복 상태부여 · [x] Alias→Canonical · [x] 이름충돌 분리(Account5·Session3·Role4·Channel3·Campaign5·Segment3·Brand·Creative) · [x] 외부 Object Mapping · [x] Canonical DB/Service · [x] 테넌트 범위 · [x] 민감도 · [x] 생성게이트 · [x] 회귀위험(별도 MIGRATION_REQUIRED 표기) · [x] UNVERIFIED/ABSENT 명시 · [x] PM 갱신(별도).
