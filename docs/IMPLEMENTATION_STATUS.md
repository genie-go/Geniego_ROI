# GeniegoROI 구현 완료 이력 (IMPLEMENTATION STATUS LEDGER)

> **최종 갱신: 2026-07-01** · 이 문서는 "이미 구현된 기능"의 정본 이력입니다.
>
> ## ⚠️ 감사·검증 에이전트 필독 (오탐 방지)
> **모든 전수감사·재검증·경쟁사 갭분석 착수 전 이 문서를 먼저 읽으십시오.**
> 아래 "✅ 구현됨" 항목은 **file:line 실증으로 이미 구현·배포된 기능**입니다.
> - 이 목록의 기능을 **"미구현·갭"으로 재플래그하지 마십시오** (반복 오탐의 주원인).
> - 진짜 신규 갭만 보고하되, 반드시 이 문서에 없음을 먼저 확인하십시오.
> - 매 검증 후 새로 구현·확인된 것은 이 문서에 **추가 갱신**하십시오(이력 보존).
> - 상태 표기: ✅ 구현·배포됨 · 🔧 진행중 · ⏳ 보류(외부 크리덴셜/인프라 필요)
>
> ## ★ 사용자 지시(2026-07 257차) — 초고도화 중복 방지 정책
> **초고도화 착수 전, 대상 기능이 이 문서에 이미 "✅ 구현됨"으로 있는지 먼저 확인**한다. 이미 있으면 **재구현 금지** — "다음에 초고도화가 진짜 필요할 때만 기존 구현을 심화(enhance)"한다. 새로 구현하거나 재확인한 것은 즉시 이 문서에 기록해, 다음 세션이 같은 것을 다시 만들지 않도록 이력을 남긴다. (예: 257차에 CRM 예측세그 자동화·Onsite 노코드 체인지셋이 이미 구현돼 있음을 확인 → 재구현 대신 Onsite 빌더 UI만 추가.)

---

## 1) 판매·마케팅 채널 연동 (Channel Integration)  — ✅ 5단계 전 채널 완비
- 자동연동 SSOT 훅: `ChannelCreds::upsert`(POST /v423/creds) — 저장 즉시 채널유형별 자동 sync 디스패치(ad/commerce/analytics/cs/esp/pg/logistics/sns-live/review). `ChannelCreds.php:351-407`
- 레지스트리 기반 자동합류: admin 채널 추가 시 코드수정 없이 sync 편입. `Connectors.php:800`, `ChannelSync.php:3378`
- 커머스 20+ 실 어댑터(fetch)+writeback+정산: shopify/amazon/coupang/naver/ebay/tiktok_shop/rakuten/cafe24/11st/gmarket/auction/lotteon/woo/magento/shopee/lazada/walmart/etsy/qoo10/yahoo_jp/godomall. `ChannelSync.php:1699,1959,3446`
- 광고 6채널 실집행 어댑터: meta/google/tiktok/naver_sa/kakao_moment/line_ads(create/deliver/activate/pause). `AdAdapters.php:203-211,415,459,733,783,824,877`
- 광고 20+ 리포팅 인제스트: snapchat/linkedin/criteo/pinterest/amazon_ads/microsoft/x/reddit/apple_search/amazon_dsp/quora/spotify/taboola/outbrain/applovin/mintegral/yandex 등. `Connectors.php`(각 fetch)
- PG 15 실 정산: stripe/toss/paypal/adyen/paddle/square/mollie/razorpay/klarna/checkout/inicis/kcp/kakaopay/naverpay. `PgSettlement.php:285,519+`
- 물류 추적, SNS-live(youtube/ig/fb), CS(zendesk/intercom/freshdesk/gorgias), ESP(mailchimp/klaviyo/sendgrid), 리뷰(trustpilot/yotpo/google_business) — 전부 실 어댑터+동기화.
- 어댑터 없는 채널 = 정직한 pending(genericFetch, 가짜데이터 없음). `ChannelSync.php:1508`
- **★리뷰 AI 감성/토픽 분석 = 이미 구현(재구현 금지)**: R1 규칙기반(평점→감성)+**R2 ClaudeAI 텍스트 분석**(POST /v428/reviews/analyze=본문 감성+키워드+aspect·sentiment_src='ai'·ai_topics)+채널별 긍/부정 집계+AI 부정키워드. 프론트 ReviewsUGC "✨ AI 리뷰 분석" 버튼 배선. `Reviews.php:85,320`·`ReviewsUGC.jsx:541`
- **CH-3(2026-07 완료)**: Kakao/LINE 전용페이지 자격증명 → 허브 연결상태 반영. `ChannelCreds.php:summary` read-side 병합.

## 2) 데이터 수집·정합 (Data Collection & Sync) — ✅ CLEAN
- ingest 멱등(자연키 upsert)·fxToKrw 단일 정규화·raw_json 원통화 보존·active→cancel 1회 side-effect. `ChannelSync.php:2664-2771`
- 정산 서버집계(SQL GROUP BY·캡 없음)·취소제외 SSOT·실정산 우선. `OrderHub.php:1075-1121`
- 주문수=행수(SUM(qty) 아님)·취소토큰 SSOT. `Rollup.php:628,77-82`
- ROAS 진실 대사(매체보고 vs 실주문, truthRatio). `Connectors.php:883-941`
- **#2(2026-07 완료)**: 정산 취소 이중차감 해소 — returnFee=반품만. `OrderHub.php:1092`
- **★257차(2026-07 완료) 자동경로 크로스먼스 취소/반품 원월 재롤업**: 폴링(saveOrders)·웹훅 기존주문 전이가 당월만 롤업해 과거월 주문이 자동경로로 취소/반품되면 그 달 정산(gross/returnFee/net_payout)이 stale 과대로 남던 결함 수정. saveOrders 가 취소/반품 전이 영향 과거월을 수집→배치 끝 원월 재롤업, 웹훅은 `$existing.ordered_at` 월을 rollMonths 에 편입(수동 setOrderStatus 와 동일 SSOT·멱등). `ChannelSync.php:saveOrders,webhook`

## 3) 어트리뷰션·측정 (Attribution) — ✅ 연구급, 대부분 구현·노출
- 6-모델 MTA(last/first/linear/time-decay/position/**Markov removal-effect 데이터기반**). `AttributionEngine.php:1085-1243`
- Shapley-exact(zeta transform). `AttributionEngine.php:920-961`
- **MMM MCMC**(Metropolis-within-Gibbs, 2체인, adstock+Hill saturation). `Mmm.php:470-622`
- **95% 신뢰구간(credible interval)** 산출+렌더. `Mmm.php:607`, `MarketingMix.jsx:326`
- **R-hat(Gelman-Rubin) 수렴** 산출+배지. `Mmm.php:567-578`, `MarketingMix.jsx:334`
- ESS/MCSE/accept_rate **산출됨**(프론트 미노출=갭). `Mmm.php:617-619`
- geo-holdout 자동화(균형분할·일일검증·가드레일·자동종결)+cron. `AttributionEngine.php:499-654`, `AutoCampaign.php:1290`
- lift test(2-proportion z, CI, p-value), 증분성 스코어카드, 블렌디드(Markov+MMM+Holdout 신뢰가중), holdout power/MDE. `AttributionEngine.php:131-410,206-301,870-897`
- DECOMP.RSSD(Robyn)+spend-weighted R²/NRMSE. `Mmm.php:710-736`
- 부트스트랩 CI+model agreement(**엔드포인트 있음·프론트 미소비=갭**). `AttributionEngine.php:1247-1302`
- **ATT-1/2(2026-07 완료)**: 전환셋 취소제외+결정정렬. `AttributionEngine.php:987`

## 4) 마케팅 자동화·실집행 (Marketing Automation) — ✅ Smartly 근접
- propose→승인→집행→학습 폐루프 실 매체 API 배선(자격증명 등록 즉시 실집행). 
- AutoRecommend: 다목표·경험적베이즈·UCB밴딧·포화곡선 water-filling·증분성보정. `AutoRecommend.php:501-774`
- AutoCampaign: PAUSED생성→결제게이트→activateDelivery 캐스케이드·킬스위치·페이싱·가드레일·적응형 cadence. `AutoCampaign.php:140,478,772,949-995,1064`
- **tCPA/tROAS 스마트입찰**(meta/google/tiktok/kakao). `AdAdapters.php:441,529,1367,1428`
- 서버측 전환API(Meta CAPI/Google offline/TikTok Events). `AdAdapters.php:598,664,690`
- 빈도캡(google/tiktok), 데이파팅(withinAdSchedule 자동정지/재개), A/B 베이지안+승자예산집중. `AdAdapters.php:546,1371`; `AutoCampaign.php:826,910`; `AbTesting.php:51,323`
- **DCO 피로도 회전 루프**(CTR감쇠 감지→신규변형 교체)+생성형DCO(ClaudeAI). `AbTesting.php:187-262`
- 이미지 DCO(generateImage→svg→media upload)·copy-DCO batch. `ClaudeAI.php:2124`, `CreativeStore.php:104`
- Creative Insights/Cockpit(피로도/스코어/롤업). `CreativeStore.php:214,296`
- 오디언스 동기화(customer-list+lookalike)+cron 자동갱신. `AdAdapters.php:1570,1589`, `AutoCampaign.php:1292`
- **MKT-1(2026-07 완료)**: RuleEngine pause_channel 실동작. `AdAdapters.php:pauseChannel`

## 5) 정산·손익 P&L (Settlement) — 🏆 best-in-class(멀티채널·멀티테넌트)
- rollupSettlementsCore(서버집계·kr_fee_rule·취소제외·실정산우선·늦은반품 원월귀속). `OrderHub.php:1075-1131`
- COGS·PnL(정산우선)·PG 대사(15 provider, `PgSettlement::reconcile`).
- **잔여정리(2026-07)**: PG대사 최신순(DESC) 5000캡. `PgSettlement.php:207,212`

## 6) CRM·옴니채널 (CRM) — ✅ Braze 근접(대부분 구현)
- **비주얼 저니빌더 전 노드타입**: trigger/email/kakao/sms/delay/**wait(event/date+timeout분기)**/condition/**split(A-B)**/webhook/goal. `JourneyCanvas.jsx:9-20`, `JourneyBuilder.php:426-539`
- 이벤트 자동진입(signup/purchase/churn/segment/cart-abandon)+인바운드 웹훅 트리거. `JourneyBuilder.php:251-368,696-726`
- 크로스채널 빈도캡+조용시간(발송노드별 강제). `JourneyBuilder.php:735-779`, `CRM.php:414-515`
- 옴니채널 워터폴(whatsapp→kakao→email 폴백)+멱등 async outbox+cron. `Omnichannel.php` 전체
- 이메일 딜리버러빌리티: suppression/unsub/bounce·**STO**(수신자별 최적시각)·**베이지안 A/B**(전환기반)·평판(bounce/complaint/reputation)·**라이브 SPF/DMARC DNS 검사**·일일 평판 스냅샷+경보. `EmailMarketing.php:112-956`
- DKIM 서명 인프라(OpenDKIM, selector geniemail). `reference_mail_sms_infra`(라이브 재확인 권장)
- **ISO-1(2026-07 완료)**: WhatsApp/SMS plan() 폴백 안전화.
- **★반품 사유 분석 심화[257차]**: 기존 ReturnsPortal AnalyticsTab(클라 배열 사유/채널 카운트) 위에 `ReturnsPortal::reasonAnalysis`(GET /v420/returns/reason-analysis)=**서버 전수 집계**(사유별 건수·환불액·비율 + **반품 유발 상품 Top(SKU·환불·불량)** + 채널별 + 불량률). AnalyticsTab에 서버 카드 additive(기존 클라 카드 폴백/데모 유지=회귀0). 품질/CS 개선 신호.
- **★고객 360° 뷰 = 이미 구현(재구현 금지)**: `CRM::getCustomer`(GET /crm/customers/{id})=고객+활동50건+세그먼트 반환·프론트 CustomerPanel(고객행 클릭 상세). **257차 심화=전체 활동 타임라인**(기존 패널은 구매만 표시→백엔드가 반환하던 전 활동유형[이메일/카카오/SMS/세그먼트/가입/반품]을 유형별 아이콘 시간순 타임라인으로 노출·프론트 전용·백엔드 무변경).
- **★상품 연관분석(함께 구매)[257차 net-new]**: `CRM::productAffinity`(GET /crm/product-affinity)=동일 고객(buyer_email) 동시구매 SKU 쌍의 support/confidence(A→B·B→A)/lift 산출(크로스셀·번들 근거). channel_orders 주문당1행→고객레벨 co-occurrence. 폭주가드(고객당 SKU 200캡). CRM RFM탭 ProductAffinityPanel(코호트 옆). 실데이터만·테넌트스코프.
- **★예측형 CDP·예측세그먼트 자동화 = 이미 구현(재구현 금지)**: churn_prob/predicted_clv 생존모델(`CRM::addPredictiveScores`, 240차)·예측 세그먼트 템플릿(고가치예측/이탈위험예측)·**자동 재편입 cron 배선 완료**(`CRM::autoRefreshPredictiveSegments` ← `bin/crm_email_daily_cron.php:57` 일일 호출). CRM.php:662 "[차기 P2]" 주석은 stale(배선은 이미 됨). 심화 여지=예측 정밀도·in-app/웹푸시 옴니뿐.

## 7) 보안·엔터프라이즈 (Security) — ✅ 완비
- RBAC(viewer<connector<analyst<admin+scope)·ABAC(channel/product/brand). 
- 테넌트 격리 airtight(전 쿼리 tenant_id 스코프·X-Tenant 위조차단, 전수감사 실증). `index.php:428-435`, `UserAuth::authedTenant:338`
- SSO(OIDC/SAML C14N)·**SCIM 2.0 완전지원**(Looker보다 우위)·MFA(TOTP)·KEK 회전·불변 감사 해시체인·rate-limit·No-PII.
- 하위 관리자(sub-admin)+접속키 최고관리자 전용(2026-07 GAP/보안 수정 반영).
- **GAP-1(2026-07 완료)**: 감사로그 내보내기 admin전용(교차유출 차단). `Compliance.php:184`
- **★257차(2026-07 완료) 컴플라이언스 posture 테넌트 스코프**: `Compliance::posture` 의 gdpr/email_suppression COUNT 가 `WHERE tenant_id` 누락으로 플랫폼 전역 건수(숫자만·PII/행 무유출)를 임의 Pro 테넌트 카드에 노출하던 것 수정(형제 sso_config 는 정상 스코프였음). 레거시 무-tenant 컬럼 테이블은 예외 시 집계 제외(fail-closed). `Compliance.php:68-76`

## 8) SOC2/ISO 컴플라이언스 — ✅ 준비도 대시보드 완비(코드 완료)
- `Compliance::posture` — 15개 통제를 SOC2 TSC + ISO 27001:2022 Annex A 매핑·실측 introspection·준비도% 산출. `Compliance.php:53-114`
- audit-export(JSON/NDJSON/**CEF SIEM**)·SIEM forward. `Compliance.php:182,298`
- **★ 실제 인증(SOC2 Type II·ISO 27001 심사)은 외부 감사 프로세스 — 코드 재구축 불필요.**

## 9) 글로벌·현지화 (Global) — 🏆 best-in-class 폭
- 15개국 i18n·다통화(fxToKrw)·한국+글로벌 채널 단일 플랫폼.
- **geo-IP 국가 언어 자동감지(2026-07)**: 동일출처 백엔드+다중제공자 페일오버+해시캐시. `Geo.php`

## 10) 데모/운영 격리 — ✅ 오염 0(3중 격리)
- build-time(VITE_DEMO_MODE)+runtime host allowlist+data-layer backstop. `demoEnv.js`, `GlobalDataContext.jsx:54-69`
- authedTenant는 인증 사용자에게 'demo'를 반환하지 않음(구조적 격리). `UserAuth.php:338`
- **ISO-2(2026-07 완료)**: 데모 API키 env=demo 게이트+운영 시드분 삭제. `Db.php:955`
- **★257차(2026-07 완료) AI 세그먼트 폴백 가짜지표 운영 차단**: `AiGenerate::generateSegment` 이 기준 미입력/AI미설정/파싱실패 시 운영 테넌트에도 demoSegmentSamples(₩820,000·12.4% 등 지표성 가짜값)를 반환하던 것을 데모=샘플 유지·운영=정직 응답(빈결과/설정안내)으로 분기(동일 파일 타 EP 는 이미 게이트됨). `AiGenerate.php:195-215`

## 11) 커머스 운영 모듈 (Commerce Ops) — ✅ 구현
- **OrderHub**(주문통합·정산·클레임/반품·CLM 멱등), **WMS**(창고/택배사AES/권한/입출고감사/피킹/발주/LOT FEFO 테넌트격리, `Wms.php`), **SupplyChain**(멀티창고 최적할당·haversine 근접), **DemandForecast**(ABC·안전재고·auto-replenish·**★재고 노후/악성재고 분석[257차 net-new]**=현재고×실판매(취소제외)로 악성(90일+무판매)/저회전(30일+) 분류·묶인자본·회전일수·권장액션, GET /api/demand/dead-stock·수요예측 "재고 노후" 탭), **ReturnsPortal**(교환/반품 캐논 claimType), **PriceOpt**(리프라이서·Buybox·velocity·승인큐 writeback), **DigitalShelf/CatalogSync**(writeback 12/12 어댑터), **LiveCommerce**(SSE·카메라·AI쇼호스트·구매동기화·**인터랙티브 오버레이=투표(live_polls)/이모지반응/실시간 presence 동시시청·peak** 246차). 심화 여지=실 SFU 미디어평면(외부 인프라)뿐.
- **★257-B 검증 스윕(재구현 금지)**: 경쟁 재평가(docs/COMPETITIVE_REVALIDATION_257.md)의 "코드로 가능한 심화" 후보가 grep 전수확인 결과 **전부 이미 구현**됨 — ①CRM 딜리버러빌리티 시계열/평판 대시보드(computeDeliverability·email_reputation_daily·snapshotReputation cron·GET /email/deliverability/history·프론트 추이차트, 246차) ②CRM 예측세그 자동화(cron 배선) ③라이브 인터랙티브 오버레이(투표/반응/presence) ④가격 실시간 경쟁가 자동수집(competitorHarvestCore·harvestCompetitorAllTenants·competitor_price_cron 30분·신선도가드·Buybox, 255차). **남은 것은 외부의존(Naver쇼핑 실키·실 SFU·광고 실계정·SOC2 인증)·성숙도(연차/규모)뿐 — 코드 net-new 갭 아님.** 신규 초고도화 착수 전 반드시 이 문서 확인.

## 12) 인텔리전스·AI (AI Profit OS) — ✅ 구현
- ClaudeAI 실 API(claude-sonnet-4-6), AI Profit OS 5단계(측정→분석→의사결정→실행→학습): HealthScore·RootCause·What-if·Agent권한모드(approval)·Copilot 액션루프(휴먼-인-루프 propose→승인→집행), 역할별뷰, GeniegoGlossary(용어설명), AI 디자인엔진(SVG/이미지), AIRuleEngine, GraphScore(그래프 네트워크 스코어), Attribution 두뇌연결.

## 13) 조직·구독·플랫폼 (Platform) — ✅ 구현
- **팀/권한**: TeamPermissions(team/acl/data_scope·위임상한·표준조직), 하위계정 신원체계, 멀티테넌트 tenant_id 발급·전파.
- **구독/과금**: 5티어 플랜·계정수(seat) 차등가격·플랜별 메뉴접근(planMenuPolicy fail-secure)·쿠폰/빌링/관리형지출월렛·Paddle(MoR) 웹훅/plans/migrate·플랜게이팅.
- **관리자**: AdminGrowth(자체 마케팅 자동화 콘솔·리드스코어링·퍼널CAC/LTV·Test/Live 게이트), MenuAccessManager, AdminPlans, DbAdmin, PgConfig, SiteIntro/LegalDocs 관리.
- **온보딩/가이드**: OnboardingGuide, 발급매뉴얼 제너레이터, DashGuide, GuideWizard.
- **PM(프로젝트관리)**: Task/Milestone/Gantt/Portfolio/Resources/RAID/EVM·SSE 실시간.
- **★파트너/거래처/공급처 스코프 포털(재구현 금지·보안 확정)**: 파트너(supplier/logistics/warehouse)는 **별도 계정(partner_account)·별도 로그인(/partner/login)·별도 세션(partner_session≠user_session)·별도 토큰(localStorage partner_token)·독립 페이지(/partner, 메인 RequireAuth/AppLayout 밖=사이드바·매출/고객 메뉴 없음)**. `/partner/data`는 **본인 스코프만**(발주/배송/창고재고)·서버세션서 스코프 도출·**매출/수익/고객/사용자/PII 미포함**. 파트너 토큰은 user_session 불일치라 메인 엔드포인트(주문/매출/P&L) **401**(구조적 격리·라이브 실증). 계정 CRUD는 requirePro+테넌트스코프. `PartnerPortal.php`·`App.jsx:730`·index.php `/partner/` bypass. 257차 전수 검증(누출 0).
- **공개/기타**: Landing/Pricing 공개페이지, PartnerPortal(파트너토큰 자가인증), DeveloperHub, CaseStudy, FeedbackCenter, Reports/ReportBuilder(사용자정의 메트릭), DataSchema/DataTrust/DataProduct, PixelTracking, WebPush.
- **★온사이트 CRO 라이브 WYSIWYG 오버레이 에디터[257차 net-new]**: 크로스오리진(머천트 라이브사이트)이라 북마클릿이 GeniegoROI 서빙 독립 에디터(`frontend/public/cro-editor.js`) 주입 → 요소 클릭선택·CSS셀렉터 생성·액션(텍스트/숨기기/CSS/HTML)·단기 edit-token 저장(`Onsite::editToken`/`editSave`·onsite_edit_token)→변형B changes 갱신(applyChanges 정합). OnsiteCro "🎨 비주얼 에디터" 버튼+북마클릿. ★부수: /v424/cro/experiments 세션게이트 편입(실 테넌트 401 잠재버그 수정).
- **온사이트 CRO(`/onsite-cro`, OnsiteCro.jsx·Onsite.php)**: 실험 CRUD·결정론 버킷팅·z검정 승자·세그먼트 타겟(기기/방문자)·비콘 metric-poisoning 방어(배정원장+레이트리밋). **노코드 변경(체인지셋 selector→text/html/css/hide/redirect)**: 백엔드 저장(variants_json)+비콘 반환+**클라 자동적용**(`lib/onsiteCro.js applyChanges`·`assignVariant(key,{autoApply})`) = 246차 완료. **★257차 추가=노코드 변경 빌더 UI**(생성폼에서 코드 없이 체인지셋 작성). 심화 여지=라이브 페이지 WYSIWYG 오버레이 에디터(브라우저확장급·외부).

> **참고**: 전체 세션별 상세 구현 이력은 `NEXT_SESSION.md` 및 사용자 자동메모리(`MEMORY.md` 인덱스 → project_* 파일들)에 250+ 차수로 누적. 본 문서는 도메인별 정본 요약. 신규 감사 시 이 문서 + NEXT_SESSION.md 최근 차수 + FP 레지스트리(reference_audit_false_positives)를 함께 참조.

---

## 🔧 진행중 / ⏳ 보류 (2026-07 경쟁사 갭 보강)
> ★ 이 이력은 초고도화를 멈추라는 뜻이 아니라 "어디까지 됐는지" 기록용. **경쟁사 대비 부족한 아래 진짜 갭은 계속 초고도화 대상.**
아래는 "진짜 갭"으로 확정된 것만. 위 ✅ 목록과 중복 구현 금지.

| # | 갭 | 상태 | 비고 |
|---|-----|------|------|
| ①-1 | 조합형 DCO(M이미지×N카피 데카르트곱) | ✅ 2026-07 | `CreativeStudio::batch` image_count 확장(1이면 기존동작 보존)+**프론트 image_count 컨트롤(CreativeStudioTab)** |
| ①-2 | Advantage+/PMax 캠페인 타입·asset group | ⏳블라인드 | metaCreate/googleCreate 확장 — 외부 API 파라미터라 라이브 크리덴셜 검증 필수(블라인드 추가 금지) |
| ①-3 | 멀티 종횡비 배치 자동생성 | ✅ 2026-07 | `CreativeStudio::batch` ratios 파라미터 — 이미지 슬롯에 비율 분산(총 이미지수 불변·캡16 유지→폭주0). aspect 태깅. ratios 미제공=기존 단일비율(회귀0)+**프론트 ratios 체크박스(CreativeStudioTab)** |
| ①-4a | Naver 스마트입찰 | ❌false | **by-design**: Naver SA=검색광고, 입찰은 adgroup 키워드 레벨(캠페인 tROAS 부적합). 갭 아님(naverCreate:820 주석) |
| ①-4b | Meta 빈도캡·LINE 스마트입찰 | ⏳블라인드 | 외부 API 파라미터라 라이브 크리덴셜 검증 필수 |
| ①-5 | CTV/DSP 실집행(amazon_dsp/DV360)·영상생성 | ⏳ | **외부 크리덴셜/API 필요** |
| ①-6 | 카탈로그 DPA(product_set) | ⏳ | product_catalog_id 크리덴셜 필요 |
| ②-1 | NBA/RL 저니노드(Thompson) | ✅ 2026-07 | `JourneyBuilder::nbaNode` 데이터기반 밴딧+프론트 nba 노드타입. 기존 발송노드 재사용 |
| ②-2 | 옴니 워터폴 SMS 편입 | ✅ 2026-07 | `Omnichannel::deliverWaterfall` sms 분기(NaverSms 재사용). LINE=프리미티브 부재로 보류 |
| ②-3 | 딜리버러빌리티 워밍업 램프 | ✅ 2026-07 | opt-in(email_warmup·기본 OFF→runQueue 불변=회귀0). 14일 표준 일일한도 램프·실발송만 카운트. GET/POST /email/warmup+**프론트 토글(EmailMarketing 딜리버러빌리티)**. (DMARC rua·전용IP/BIMI=인프라 별개) |
| ②-4 | 저니 exit(이탈) 노드 | ✅ 2026-07 | `JourneyBuilder` exit 노드(evalCondition 재사용)+프론트 exit 노드타입. push=구독↔고객 미연결·attr=스키마로 보류 |
| ③-1 | MMM OOS 백테스트(예측 vs 실측) | ✅ 2026-07 | `Mmm::backtest`(GET /v424/mmm/backtest)+MarketingMix 패널. ★보고 모델과 동일 response() 곡선으로 예측(정합)→fitChannel 미수정=회귀0. train/test 분리·OOS MAPE/NRMSE·train잔차 95% 커버리지. 데이터부족=빈결과(정직) |
| ③-2 | 증분성 캘리브레이션 리포트(모델 vs 실험) | ✅ 2026-07 | `blendedIncrementality` 방향 일치도(aligned/over/under)+calibration.score. 정밀비율 대신 방향(오통계 회피) |
| ③-3 | ESS/MCSE/accept_rate 프론트 노출 | ✅ 2026-07 | `MarketingMix.jsx` ESS/MCSE 배지(백엔드 이미 산출) |
| ③-4 | model agreement/confidence 패널 | ✅ 2026-07 | ConfidenceTab 을 실 `/attribution/confidence` 배선(그간 로컬데모만 사용)+모델합의도 consensus 컬럼·실측배지. 데모 폴백 보존 |
| ③-5 | geo-holdout 설계/readiness UI | ✅ 2026-07 | IncrementalityTab 에 geo-readiness 패널(균형분할·검정력·실험/대조군 추천) — 실 엔드포인트 배선 |

## 🔺 남은 약점 보강 라운드2 (2026-07) — ⑥ CRM 심도(Braze 격차 축소)
| 갭 | 상태 | 비고 |
|-----|------|------|
| ⑥ STO ML 정밀화 | ✅ 2026-07 | `optimalHourFor` 최근 오픈 지수감쇠 가중(Braze Intelligent Timing식). 반환=시각(0~23) 불변→큐정합·회귀0 |
| ⑥ 저니 속성(attr) 노드 | ✅ 2026-07 | 여정 중 crm_customers.tags 갱신(Braze Update Attribute). tags만(RFM grade 미충돌·중복0·상한30)+프론트 attr 노드타입 |

### ❌ 코드로 안전하게 보강 불가(정직 — 무리한 블라인드 구현 금지)
- **④ 영상 DCO·CTV/DSP 실집행·PMax**: 외부 text-to-video API·DSP/광고 크리덴셜 필요. 검증 불가한 블라인드 구현은 라이브 시 오류 유발 → **키 등록 후** 검증과 함께.
- **⑦ SOC2 Type II·ISO 27001 인증**: 외부 감사 프로세스(코드 아님). 준비도 대시보드(posture)는 완비.
- **① 원시 국내마켓 채널 수(사방넷 650)**: 각 벤더 실 API·크리덴셜 필요. 미보유 채널은 genericFetch 정직 pending 으로 커버.
- **④⑥ 엔터프라이즈 검증 연차·발신 규모**: 시간/운영 축적 항목(코드 불가).
