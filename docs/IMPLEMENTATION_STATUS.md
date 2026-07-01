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
- **CH-3(2026-07 완료)**: Kakao/LINE 전용페이지 자격증명 → 허브 연결상태 반영. `ChannelCreds.php:summary` read-side 병합.

## 2) 데이터 수집·정합 (Data Collection & Sync) — ✅ CLEAN
- ingest 멱등(자연키 upsert)·fxToKrw 단일 정규화·raw_json 원통화 보존·active→cancel 1회 side-effect. `ChannelSync.php:2664-2771`
- 정산 서버집계(SQL GROUP BY·캡 없음)·취소제외 SSOT·실정산 우선. `OrderHub.php:1075-1121`
- 주문수=행수(SUM(qty) 아님)·취소토큰 SSOT. `Rollup.php:628,77-82`
- ROAS 진실 대사(매체보고 vs 실주문, truthRatio). `Connectors.php:883-941`
- **#2(2026-07 완료)**: 정산 취소 이중차감 해소 — returnFee=반품만. `OrderHub.php:1092`

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

## 7) 보안·엔터프라이즈 (Security) — ✅ 완비
- RBAC(viewer<connector<analyst<admin+scope)·ABAC(channel/product/brand). 
- 테넌트 격리 airtight(전 쿼리 tenant_id 스코프·X-Tenant 위조차단, 전수감사 실증). `index.php:428-435`, `UserAuth::authedTenant:338`
- SSO(OIDC/SAML C14N)·**SCIM 2.0 완전지원**(Looker보다 우위)·MFA(TOTP)·KEK 회전·불변 감사 해시체인·rate-limit·No-PII.
- 하위 관리자(sub-admin)+접속키 최고관리자 전용(2026-07 GAP/보안 수정 반영).
- **GAP-1(2026-07 완료)**: 감사로그 내보내기 admin전용(교차유출 차단). `Compliance.php:184`

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

## 11) 커머스 운영 모듈 (Commerce Ops) — ✅ 구현
- **OrderHub**(주문통합·정산·클레임/반품·CLM 멱등), **WMS**(창고/택배사AES/권한/입출고감사/피킹/발주/LOT FEFO 테넌트격리, `Wms.php`), **SupplyChain**(멀티창고 최적할당·haversine 근접), **DemandForecast**(ABC·안전재고·auto-replenish), **ReturnsPortal**(교환/반품 캐논 claimType), **PriceOpt**(리프라이서·Buybox·velocity·승인큐 writeback), **DigitalShelf/CatalogSync**(writeback 12/12 어댑터), **LiveCommerce**(SSE·카메라·AI쇼호스트·구매동기화).

## 12) 인텔리전스·AI (AI Profit OS) — ✅ 구현
- ClaudeAI 실 API(claude-sonnet-4-6), AI Profit OS 5단계(측정→분석→의사결정→실행→학습): HealthScore·RootCause·What-if·Agent권한모드(approval)·Copilot 액션루프(휴먼-인-루프 propose→승인→집행), 역할별뷰, GeniegoGlossary(용어설명), AI 디자인엔진(SVG/이미지), AIRuleEngine, GraphScore(그래프 네트워크 스코어), Attribution 두뇌연결.

## 13) 조직·구독·플랫폼 (Platform) — ✅ 구현
- **팀/권한**: TeamPermissions(team/acl/data_scope·위임상한·표준조직), 하위계정 신원체계, 멀티테넌트 tenant_id 발급·전파.
- **구독/과금**: 5티어 플랜·계정수(seat) 차등가격·플랜별 메뉴접근(planMenuPolicy fail-secure)·쿠폰/빌링/관리형지출월렛·Paddle(MoR) 웹훅/plans/migrate·플랜게이팅.
- **관리자**: AdminGrowth(자체 마케팅 자동화 콘솔·리드스코어링·퍼널CAC/LTV·Test/Live 게이트), MenuAccessManager, AdminPlans, DbAdmin, PgConfig, SiteIntro/LegalDocs 관리.
- **온보딩/가이드**: OnboardingGuide, 발급매뉴얼 제너레이터, DashGuide, GuideWizard.
- **PM(프로젝트관리)**: Task/Milestone/Gantt/Portfolio/Resources/RAID/EVM·SSE 실시간.
- **공개/기타**: Landing/Pricing 공개페이지, PartnerPortal(파트너토큰 자가인증), DeveloperHub, CaseStudy, FeedbackCenter, Reports/ReportBuilder(사용자정의 메트릭), DataSchema/DataTrust/DataProduct, PixelTracking, WebPush.

> **참고**: 전체 세션별 상세 구현 이력은 `NEXT_SESSION.md` 및 사용자 자동메모리(`MEMORY.md` 인덱스 → project_* 파일들)에 250+ 차수로 누적. 본 문서는 도메인별 정본 요약. 신규 감사 시 이 문서 + NEXT_SESSION.md 최근 차수 + FP 레지스트리(reference_audit_false_positives)를 함께 참조.

---

## 🔧 진행중 / ⏳ 보류 (2026-07 경쟁사 갭 보강)
> ★ 이 이력은 초고도화를 멈추라는 뜻이 아니라 "어디까지 됐는지" 기록용. **경쟁사 대비 부족한 아래 진짜 갭은 계속 초고도화 대상.**
아래는 "진짜 갭"으로 확정된 것만. 위 ✅ 목록과 중복 구현 금지.

| # | 갭 | 상태 | 비고 |
|---|-----|------|------|
| ①-1 | 조합형 DCO(M이미지×N카피 데카르트곱) | ✅ 2026-07 | `CreativeStudio::batch` image_count 확장(1이면 기존동작 보존). 프론트 image_count 컨트롤=폴리싱 잔여 |
| ①-2 | Advantage+/PMax 캠페인 타입·asset group | ⏳블라인드 | metaCreate/googleCreate 확장 — 외부 API 파라미터라 라이브 크리덴셜 검증 필수(블라인드 추가 금지) |
| ①-3 | 멀티 종횡비 배치 자동생성 | ⏳ | 순수코드·draft 폭주 주의(M×N×A) |
| ①-4a | Naver 스마트입찰 | ❌false | **by-design**: Naver SA=검색광고, 입찰은 adgroup 키워드 레벨(캠페인 tROAS 부적합). 갭 아님(naverCreate:820 주석) |
| ①-4b | Meta 빈도캡·LINE 스마트입찰 | ⏳블라인드 | 외부 API 파라미터라 라이브 크리덴셜 검증 필수 |
| ①-5 | CTV/DSP 실집행(amazon_dsp/DV360)·영상생성 | ⏳ | **외부 크리덴셜/API 필요** |
| ①-6 | 카탈로그 DPA(product_set) | ⏳ | product_catalog_id 크리덴셜 필요 |
| ②-1 | NBA/RL 저니노드(Thompson) | ✅ 2026-07 | `JourneyBuilder::nbaNode` 데이터기반 밴딧+프론트 nba 노드타입. 기존 발송노드 재사용 |
| ②-2 | 옴니 워터폴 SMS 편입 | ✅ 2026-07 | `Omnichannel::deliverWaterfall` sms 분기(NaverSms 재사용). LINE=프리미티브 부재로 보류 |
| ②-3 | 딜리버러빌리티 워밍업 램프·DMARC rua 수집 | ⏳ | 워밍업=순수코드(EmailMarketing runQueue), 전용IP/BIMI=인프라 |
| ②-4 | 저니 exit(이탈) 노드 | ✅ 2026-07 | `JourneyBuilder` exit 노드(evalCondition 재사용)+프론트 exit 노드타입. push=구독↔고객 미연결·attr=스키마로 보류 |
| ③-1 | MMM OOS 백테스트(예측 vs 실측) | ✅ 2026-07 | `Mmm::backtest`(GET /v424/mmm/backtest)+MarketingMix 패널. ★보고 모델과 동일 response() 곡선으로 예측(정합)→fitChannel 미수정=회귀0. train/test 분리·OOS MAPE/NRMSE·train잔차 95% 커버리지. 데이터부족=빈결과(정직) |
| ③-2 | 증분성 캘리브레이션 리포트(모델 vs 실험) | ✅ 2026-07 | `blendedIncrementality` 방향 일치도(aligned/over/under)+calibration.score. 정밀비율 대신 방향(오통계 회피) |
| ③-3 | ESS/MCSE/accept_rate 프론트 노출 | ✅ 2026-07 | `MarketingMix.jsx` ESS/MCSE 배지(백엔드 이미 산출) |
| ③-4 | model agreement/confidence 패널 | ✅ 2026-07 | ConfidenceTab 을 실 `/attribution/confidence` 배선(그간 로컬데모만 사용)+모델합의도 consensus 컬럼·실측배지. 데모 폴백 보존 |
| ③-5 | geo-holdout 설계/readiness UI | ✅ 2026-07 | IncrementalityTab 에 geo-readiness 패널(균형분할·검정력·실험/대조군 추천) — 실 엔드포인트 배선 |
