# EPIC 01-A — Enterprise Entity Inventory (Master)

> **조사 일시**: 288차 (2026-07-16). **방법**: 6개 도메인 병렬 발견 에이전트가 `backend/src/Db.php`(CREATE TABLE 백본)·102 Handlers·routes.php(1473)·frontend pages·33 cron을 직접 Read/Grep(추측 금지·비파괴·무편집). 스테일 워크트리(`_be_*`·clean_src) 제외.
> **§17 통합 원칙**: 12개 파편 문서 대신 본 마스터가 인벤토리·중복·Alias·이름충돌·격리·목데이터·회귀·고아·UNVERIFIED·관계후보를 **통합 인덱스**로 보관(EPIC 00 §2.2 중복금지 준수). 기존 `docs/registry/`(19 레지스트리)와 매핑, 재보관 안 함.
> **범위 제한**: 코드 배선 근거만. 라이브 데이터 진위·다품목 영향도 등은 UNVERIFIED로 명시. **본 단계는 발견·기록만 — 삭제/병합/통합 없음(EPIC 01-B에서 Canonical 확정).**

---

## 0. 요약 통계

| 도메인 | 발견 엔티티(약) | 근거 |
|---|---|---|
| 조직/접근/운영·보안 | ~45 | app_user·tenant·team·acl·session·credential·audit·rate limit |
| 비즈니스/고객 | ~42 | crm_customers·plan·subscription·segment·identity |
| 상품/커머스 | ~60 | channel_orders·wms_stock·catalog·settlement·coupon |
| 마케팅/크리에이터 | ~55 | performance_metrics·pixel·campaign·creative·influencer |
| 데이터/연동·분석 | ~37 | channel_credential·raw/normalized event·attribution·mmm |
| 자동화 | ~55 | journeys·rule_engine·alert·action_request·messaging queue |
| **합계(중복 제외 전)** | **~290 엔티티/테이블** | — |

**핵심 SSOT 엔티티(Canonical 후보 확정)**: `app_user`(User/Member/Subscriber 단일) · `tenant_id`(격리경계) · `crm_customers`(Customer, buyer→customer alias) · `channel_orders`(Order) · `wms_stock`(물리재고) · `channel_credential`(자격증명) · `channel_registry`(채널 카탈로그·group_type 구분) · `journeys`(Workflow) · `rule_engine`(크로스도메인 룰) · `OrderHub::cancelExclusion`(취소제외 2축 술어) · `CRM::isMarketingSendAllowed`(발송 동의 게이트).

---

## 1. ★고아(ORPHANED) — 최우선 (생산자/소비자 부재)

| 엔티티 | 유형 | 결함 | 근거 | 판정 |
|---|---|---|---|---|
| **action_request** | Approval/Execution | INSERT 생산자 **전무**. Approvals UI(3중 라우트 /v410·/v423·/api)가 빈 테이블 위 동작 | Db.php:592, Alerting.php:546 | 287~288차 재확정. ★"생산자 신설 활성화" vs "죽은 스켈레톤 제거" — 제품결정 필요(재구현 금지) |
| **normalized_activity_event** | RawRecord Layer2 | ingest/normalize는 배선되나 하류 분석(Rollup/Attribution/Mmm/Pnl/Decisioning) **소비 부재** — 실 분석은 별도 ingest 테이블 사용 | Db.php:1037, EventNorm.php:446 | 288차 재확정. "표시 전용 섬" |
| connector_config | Connector설정 | CREATE만·읽기/쓰기 0 | Db.php:510 | 완전 고아 |
| line_sends | Queue | CREATE+DELETE만·INSERT 없음 | Line.php | 죽은 스캐폴딩(Line은 동기 브로드캐스트만) |
| catalog_writeback_approval | Approval | 읽기/쓰기 0("승인 블랙홀" 자인). 실 SSOT=catalog_writeback_job | Catalog.php | 고아 |
| returns_automation | Automation | 생산자 전무. 실 반품자동화는 updateStatus 하드코딩 | ReturnsPortal.php | 고아 |
| sc_risk_rules | Rule | CRUD+toggle만·평가엔진/cron 없음 | SupplyChain.php | 고아(표시만) |
| merchant_promotion(enforce) | Rule | used 미증가·쿠폰검증 미참조(저장전용) | Promotion.php | enforcement 고아 |
| frequency_event | FrequencyCap | RuleEngine 생성했으나 CRM SSOT는 crm_activities 사용 | RuleEngine.php:66 | inert |

**준고아(SEED-ONLY)**: connector_health·ingestion_run_log(Risk 시드 스텁, 실상태=connector_sync_log — 이중 스키마). settlement(Db.php:529, writer 미관측 死테이블).

---

## 2. ★중복 후보(DUPLICATE_CANDIDATE) — 삭제 금지·EPIC 01-B에서 Canonical 결정

| # | 중복군 | 상세 | 근거 |
|---|---|---|---|
| 1 | **Plan 카탈로그 4중** | plan_config(실정본·PlanLimits강제) / billing_plan / plan_pricing / subscription_packages+menu_tier_pricing | AdminPlans.php:39·Db.php:492,1190·Payment.php:972,1338 |
| 2 | **app_user.plan / plans 이중컬럼** | 동기화 부채 | Db.php:1104,1125 |
| 3 | **ROAS/CAC/LTV 계산 이원** | 백엔드 PHP(Rollup 8×·Attribution·Reports…) + 프론트 JS derive(DashMarketing·productPerf 등) — 공용헬퍼 없음·SSOT 미성립 | Rollup.php:251; DashChannelKPI:209 |
| 4 | **Settlement 4중** | orderhub_settlements(rollup) / kr_settlement_line(line·UNIQUE없음) / pg_settlement(PG) / settlement(死) + payment_history(SaaS) | Db.php:854,529; PgSettlement.php:81 |
| 5 | **Coupon(SaaS빌링) 이중구현** | free_coupons(duration_days) vs subscription_coupon(months) — 별도 테이블·flow | Db.php:337,1239 |
| 6 | channel_products vs catalog_listing | 수집 vs 송출, FK없음·sku만 느슨연결 | ChannelSync.php:205; Catalog.php:50 |
| 7 | returns(포탈) vs orderhub_claims(type=return) | 병렬 쓰기 triple-store | ReturnsPortal.php:177 |
| 8 | **Audit 6테이블** | audit_log·security_audit_log·auth_audit_log·menu_audit_log·paddle_audit_log·dsar_audit_log(목적·스코프 상이 → 통합보다 문서화) | Db.php:540 등 |
| 9 | channel_inventory 이중차감 | 주문 hot-path가 wms_stock+channel_inventory 독립 차감 | ChannelSync.php:4363,4369 |
| 10 | coupon_rules 4곳 CREATE | 동일 스키마 중복 정의 | CouponEngine·UserAdmin |

---

## 3. ★이름충돌(NAME_COLLISION) — 통합 금지·의미 분리 유지

| 단어 | 의미들 |
|---|---|
| **Channel** | ①판매채널(kr_channel·channel_products) ②광고채널(performance_metrics.channel) ③발송채널(email/sms/kakao/line/omni). 구분자=`channel_registry.group_type` |
| **Account** | ①사용자계정(app_user) ②광고계정(account_id/connector) ③결제계정(billing_method/pg_config) ④대행사(agency_account) ⑤파트너(partner_account) |
| **Session** | user_session(고객) / agency_session / partner_session / oauth_state·sso_state(임시 CSRF) |
| **Role** | app_user.team_role(테넌트내) / admin_roles+user_roles(플랫폼) / acl_permission(메뉴) / sso_group_role_map(IdP) / api_key.role(RBAC) |
| **Campaign** | 광고(auto_campaign) / 발송(email·sms·kakao·line·omni) / 성장(admin_growth_campaign) / 프로모션(merchant_promotion) / 팝업(web_popup) |
| **Segment** | crm_segments(고객) / Decisioning(광고 집계 코호트) / admin_growth_segment(B2B 타겟) |
| **Brand** | catalog_brand(상품) / brand_asset(크리에이티브) / tenant_business_profile.brand_name(회사) |
| **Creative** | creative_asset / creative_variant / ad_design / brand_asset / creative_sku_map (5테이블 분산) |
| **grade/tier/VIP** | crm_customers.grade(champions/loyal…) / CustomerAI tier(diamond/gold…) / churn(high/med/low) — 동일고객 3체계 병존·SSOT 부재 |
| **Coupon/Bundle/Lead/Payment** | Coupon 3도메인 / Bundle(product_addon_pack=과금팩≠번들) / Lead(admin_growth_lead=플랫폼영업≠테넌트고객) / Payment(SaaS≠커머스) |

---

## 4. ★Alias 후보(ALIAS_CANDIDATE) — 동일 엔티티 다른 명칭

- **Buyer = Customer**(확정): channel_orders.buyer_email/name → recordCrmPurchase → crm_customers.email. 이메일 부재 시 `이름@{channel}.noemail` 합성키. ChannelSync.php:4667.
- **User ≡ Member ≡ app_user**(확정): 단일 테이블, parent_user_id/team_role 구분. 별도 members 테이블 없음.
- **Creator = Influencer**(확정): influencer_store가 둘 다 담음(kind='creators').
- **AdSet = AdGroup**(확정): ad_audience_breakdowns.adset_id 단일 컬럼 흡수(Meta=adset, Google/TikTok/Naver=adgroup).
- **채널 광고 Alias**: 벤더 campaign_id→`campaign_ext_id`, ad_id→`ad_ext_id`, campaign_name→`account`(12+ 채널 fetch*Rows).
- **채널키 Alias**: CHANNEL_ALIASES(ChannelSync.php:5123) amazon_spapi→amazon·naver_smartstore→naver·tiktok_shop→tiktok·st11→11st 등.
- **SKU 키잉 채널별 상이**: Shopify variants[0].sku / eBay·Rakuten channel_product_id / Coupang externalVendorSku / Naver sellerManagementCode.
- **CustomerIdentity 2계층 미연결**: CRM 병합(crm_identity_merge_link) vs Attribution 익명(attribution_identity_link) — 상호 연결 로직 미확인(통합 여지).

---

## 5. ★테넌트 격리 위험(DATA_ISOLATION_RISK)

| 위험 | 상세 | 판정 |
|---|---|---|
| **tenant_id DEFAULT 'demo'** | 다수 테이블(crm_customers·channel_orders·pixel_* 등) — caller가 tenant 누락 시 실데이터가 demo 버킷 낙하 | 코드상 tenant 명시주입 확인됨. 방향성 위험(real→demo 미차단) |
| pg_config | 전역 UNIQUE(provider) — 멀티머천트 단일키 가정 | 격리 부재(Payment 소유·스코프외) |
| kr_channel | tenant_id 없음(전역 채널사전) | 설계상 카탈로그 |
| payment_history | user_id 스코프(SaaS 빌링) | 커머스 아님 |
| ads_mapping | tenant_id 없음·전역 공유(레거시. mapping_entry는 격리됨) | 레거시 잔존 |
| creative_asset | 스코프 컬럼 user_id(≠tenant_id 규약) | 명명 불일치 |
| wh_id='default' | 고스트 재고 파편화(consolidateOrphanStock 병합·실창고 0개면 no-op) | 286차 관련 |
| admin_growth_* / event_popups / CouponEngine | 전역/platform_growth 스코프 | 설계상(단 286차 act-as 하이재킹 표면 — 재확인 권장) |

> **신규 실 격리 결함 0건** — 격리대상 핸들러(TeamPermissions·EnterpriseAuth·Agency·Partner·ChannelCreds·Alerting 등)는 전부 `WHERE tenant_id=?` fail-closed. 위 항목은 의도된 전역이거나 레거시·명명 이슈.

---

## 6. 목데이터 연계(MOCK) · 보안

- **하드코딩 자격증명 0건** — 전 비밀 getenv/app_setting/Crypto(AES-256-GCM, 평문거부 fail-closed). api_key=SHA-256.
- **목데이터 게이트 견고**: ChannelSync saveProducts/saveOrders chokepoint(demo/structured/DEMO-·B0AMDEMO 접두 거부), recordCrmPurchase/enrichBacklog는 tenant==='demo' 조기return. ModelMonitor/AnomalyDetection.demoScan/WhatsApp rand()는 isDemo 게이트 뒤 → 실테넌트는 정직-빈/계산전용.
- **주의 라벨**: AnomalyDetection.demoScan이 `data_driven=true` 라벨 — 데모 합성이상이나 오해소지(경미).

---

## 7. 관계 후보(RELATIONSHIP_CANDIDATE) — EPIC 01-B 입력(확정 아님)

- app_user `owns` tenant / `member_of` team / `belongs_to` agency-link(client).
- crm_customers `part_of` crm_segments / `has` crm_activities(purchase/refund) / `merged_by` crm_identity_merge_link.
- channel_orders `belongs_to` channel / `attributed_to` attribution_result / `refunded_by` orderhub_claims / `shipped_by` shipment_tracking / `deducts` wms_stock+channel_inventory.
- channel_products `listed_on` catalog_listing / `costed_by` channel_inventory.cost·wms_lots / `mapped_by` creative_sku_map.
- performance_metrics `channel` `attributed_via` attribution_result / `optimized_by` auto_campaign / `aggregated_by` Rollup.
- journeys `enrolls` journey_enrollments `executes` Action(email/sms/kakao/push) `gated_by` CRM::isMarketingSendAllowed.

---

## 8. 부재(ABSENT) · UNVERIFIED

- **ABSENT**: OrderItem(flatten·line_items[0]만) · Cart · Checkout · Collection · Option(정규화) · Bid · Placement · Offer · CTA · Caption · Hashtag · Scenario · Opportunity · ImportJob · Invoice/BillingAccount 전용테이블 · Contact/Prospect/Persona/Cohort/LoyaltyMember 전용테이블 · 전역 Metric 시맨틱레이어(report_metric_def는 Report Builder 한정).
- **Vol3 헌법 갭**: TrustScore/QualityScore/DataLineage 실보관 테이블 없음(전부 요청시 계산·비영속).
- **진짜 ML 없음**: 전 "model/score/prediction"은 결정식(Holt-Winters·SPC·로지스틱 고정가중·그래프 가중합·empirical Bayes/UCB). ModelMonitor 스스로 훈련/추론 부재 코드주석 명시.
- **UNVERIFIED(라이브 검증 필요)**: ★OrderItem 부재로 다품목 주문의 SKU별 COGS/귀속 정확도 유실(코드 확인·영향도 미측정) · attribution↔crm identity 통합 여부 · RuleEngine reorder/sc_risk_rules 최종배선 · 각 채널 30+어댑터 필드매핑 정합.

---

## 9. 기존 19 레지스트리 매핑(중복 방지)

본 인벤토리는 `docs/registry/`(DatabaseRegistry·ComponentRegistry·ChannelRegistry·IntegrationRegistry 등)의 **엔티티 관점 횡단 뷰**다. 개별 정본은 registry가 유지. EPIC 01-B(Canonical Entity Registry)는 본 인벤토리 + DatabaseRegistry를 입력으로 Canonical Entity ID·Owner를 확정한다.

---

## 10. Chapter 완료 조건 대조 (§22)

- [x] 전 도메인 엔티티 전수조사(6 에이전트) · [x] 코드·DB·API·UI 위치 기록 · [x] 데이터 출처 · [x] 테넌트/권한 범위 · [x] 분석/자동화 사용 · [x] 중복후보 · [x] Alias · [x] 이름충돌 · [x] 관계후보 · [x] 목/테스트 데이터 연계 · [x] 기능후퇴 위험 · [x] UNVERIFIED 숨김 없이 기록 · [x] 기존 문서 중복생성 없음(§17 통합) · [x] PM Change History 갱신(별도) · [x] 실기능 삭제/통합/후퇴 없음(비파괴).
