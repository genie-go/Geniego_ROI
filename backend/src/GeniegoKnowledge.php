<?php
namespace Genie;

/**
 * GeniegoROI 챗봇 지식베이스(KO 원본) — "무엇이든 물어보세요" 상담 챗봇이 메뉴 이용법·채널 API 키 발급·
 *  플랫폼 소개를 초보자도 따라할 수 있게 아주 상세히(순서·링크 포함) 안내하기 위한 SSOT.
 *  - 발급가이드: frontend/src/data/issuanceGuide.js (ISSUANCE_GUIDE_KO, 71채널) 파싱 산출물.
 *  - 메뉴가이드: frontend/src/lib/guideSpecs.js (GUIDE) 파싱 산출물.
 *  - AI 가 응답 언어(15개국)로 현지 자연어 렌더. 임의 변경 금지(원본=프론트 데이터).
 */
final class GeniegoKnowledge {
    /** 채널별 API 키 발급 따라하기(번호 단계 + 공식 링크). */
    public static function issuance(): string {
        return <<<'TXT'
■ naver_shopping [naver_shopping]
   1. 준비물: 네이버 계정. (리프라이서 라이브 경쟁가 수집에 사용됩니다.)
   2. developers.naver.com 접속 → 로그인 → 상단 [Application] > [애플리케이션 등록]을 클릭합니다.
   3. 애플리케이션 이름 입력 → 사용 API에서 "검색"을 선택 → 비로그인 오픈 API 환경(WEB)을 추가하고 등록합니다.
   4. 등록 완료 후 [내 애플리케이션]에서 "Client ID"와 "Client Secret"을 확인합니다.
   5. GenieGo 연동허브 > "Naver 쇼핑 API (경쟁가)" [등록]에 Client ID / Client Secret을 붙여넣고 저장하면, 최적 가격(리프라이서) 메뉴에서 [라이브 경쟁가 수집]이 즉시 동작합니다.

■ amazon_ads [amazon_ads]
   1. 준비물: Amazon 광고를 집행 중인 셀러/벤더 계정과 Login with Amazon(LWA) 앱이 필요합니다.
   2. advertising.amazon.com 의 Amazon Ads API 사용 신청(승인 필요) 후, developer.amazon.com 에서 LWA 보안 프로필(앱)을 만들어 client_id / client_secret을 발급받습니다.
   3. LWA OAuth 동의 절차로 refresh_token을 발급받습니다(scope: advertising::campaign_management).
   4. Profiles API로 광고 프로파일 ID(profile_id)를 확인합니다.
   5. GenieGo [등록]에 LWA 리프레시 토큰 / 클라이언트 ID / 클라이언트 시크릿 / 프로파일 ID를 입력해 저장합니다.

■ microsoft_ads [microsoft_ads]
   1. 준비물: Microsoft Advertising(Bing Ads) 광고 계정이 필요합니다.
   2. ads.microsoft.com 에서 개발자 토큰(Developer Token)을 신청합니다.
   3. portal.azure.com(Azure AD) 에서 앱을 등록하고 client_id / client_secret을 발급받습니다(리디렉션 URI 설정 포함).
   4. OAuth2 동의 절차로 refresh_token을 발급받습니다(scope: https://ads.microsoft.com/msads.manage offline_access).
   5. GenieGo [등록]에 리프레시 토큰 / 앱(클라이언트) ID / 클라이언트 시크릿 / 개발자 토큰을 입력해 저장합니다.

■ x_ads [x_ads]
   1. 준비물: X(트위터) 광고 계정과 승인된 개발자 계정이 필요합니다.
   2. developer.x.com 에서 앱(Project/App)을 만들고 consumer_key(API Key) / consumer_secret을 발급받습니다.
   3. OAuth 1.0a 사용자 인증으로 access_token / access_token_secret을 발급받고, ads.x.com 에서 광고계정 ID를 확인합니다.
   4. X Ads API 사용 신청(Ads API access)을 완료합니다(승인 필요).
   5. GenieGo [등록]에 컨슈머 키 / 컨슈머 시크릿 / 액세스 토큰 / 액세스 토큰 시크릿 / 광고계정 ID를 입력해 저장합니다.

■ snapchat_ads [snapchat_ads]
   1. 준비물: Snapchat 비즈니스 광고 계정이 필요합니다.
   2. business.snapchat.com 에서 Business Details로 OAuth 앱(클라이언트)을 만들고 Marketing API access_token을 발급받습니다.
   3. Ads Manager에서 광고계정 ID(ad_account_id)를 확인합니다.
   4. GenieGo [등록]에 액세스 토큰 / 광고계정 ID(필요 시 과금 통화)를 입력해 저장합니다.

■ linkedin_ads [linkedin_ads]
   1. 준비물: LinkedIn 광고 계정과 LinkedIn 개발자 앱이 필요합니다.
   2. linkedin.com/developers/apps 에서 앱을 만들고 Marketing Developer Platform(광고 API) 사용 권한을 신청합니다(승인 필요).
   3. OAuth2 동의로 access_token을 발급받고, 광고계정 URN(또는 ID)을 확인합니다.
   4. GenieGo [등록]에 액세스 토큰 / 광고계정 ID를 입력해 저장합니다.

■ criteo [criteo]
   1. 준비물: Criteo 광고주 계정이 필요합니다.
   2. Criteo Management Center > API 설정에서 API 자격증명(client_id / client_secret)을 발급받습니다(OAuth2 client_credentials).
   3. 대상 광고주 계정 ID(advertiser_id)를 확인합니다.
   4. GenieGo [등록]에 client_id / client_secret / advertiser_id를 입력해 저장합니다.

■ pinterest_ads [pinterest_ads]
   1. 준비물: Pinterest 비즈니스 계정과 광고 계정이 필요합니다.
   2. developers.pinterest.com 에서 앱을 만들고 광고(Ads) 권한 access_token을 발급받습니다.
   3. Ads Manager에서 광고계정 ID(ad_account_id)를 확인합니다.
   4. GenieGo [등록]에 액세스 토큰 / 광고계정 ID를 입력해 저장합니다.

■ Meta(페이스북·인스타그램) 광고 [meta_ads]
   1. 준비물: Facebook 개인 계정과, 광고를 집행 중인 Meta 광고 계정이 필요합니다.
   2. 브라우저에서 business.facebook.com 에 접속해 로그인하고, [비즈니스 만들기]로 비즈니스 계정을 만든 뒤 이메일 인증을 완료합니다.
   3. developers.facebook.com 에 접속 → 우측 상단 [내 앱] → [앱 만들기]를 누르고, 유형은 "비즈니스"를 선택해 앱을 만듭니다.
   4. 앱 대시보드에서 "Marketing API" 카드를 찾아 [설정]을 눌러 제품으로 추가합니다.
   5. 비즈니스 설정(business.facebook.com/settings) → [사용자] > [시스템 사용자] → [추가]로 시스템 사용자를 만들고, [자산 할당]에서 광고 계정에 대한 권한을 줍니다.
   6. 같은 화면에서 [토큰 생성]을 눌러 앱을 선택하고 권한(ads_read, ads_management)을 체크한 뒤 토큰을 생성하고 그 값을 복사합니다.
   7. 광고 계정 관리자(adsmanager.facebook.com)에서 광고 계정 ID(act_로 시작하는 숫자)를 확인합니다.
   8. GenieGo 연동허브 > 해당 채널 [등록]을 눌러 "액세스 토큰"과 "광고 계정 ID(act_)"를 붙여넣고 저장하면 연동 완료입니다.

■ Google Ads [google_ads]
   1. 준비물: Google Ads 관리자(MCC) 계정과 Google 계정이 필요합니다. (없으면 ads.google.com 에서 관리자 계정을 먼저 만드세요.)
   2. Google Ads 관리자 계정에 로그인 → 상단 [도구 및 설정] > [설정] > [API 센터]로 이동합니다.
   3. API 센터에서 [개발자 토큰]을 신청합니다. 기본(Basic) 액세스는 Google 심사를 거쳐 승인되며, 승인 전에는 테스트 계정만 호출됩니다.
   4. console.cloud.google.com 에 접속해 프로젝트를 만들고, [API 및 서비스] > [OAuth 동의 화면]을 구성합니다.
   5. [사용자 인증 정보] > [사용자 인증 정보 만들기] > [OAuth 클라이언트 ID]를 만들어 client_id와 client_secret을 발급받습니다(범위 scope: adwords).
   6. OAuth 인증 절차로 refresh token을 발급받습니다.(Google OAuth Playground 또는 자체 인증 사용)
   7. 호출 대상 광고 계정의 10자리 고객 ID(customer_id)를 확인합니다.
   8. GenieGo [등록]에 개발자 토큰, client_id, client_secret, refresh_token, customer_id를 입력해 저장합니다.

■ TikTok 광고 [tiktok_business]
   1. 준비물: TikTok For Business 광고 계정이 필요합니다.
   2. developers.tiktok.com (TikTok for Business 개발자 포털)에 로그인하고 개발자(조직) 등록을 완료합니다.
   3. [My Apps] > [Create an App]을 눌러 앱 이름과 용도 설명을 입력하고 앱을 만듭니다.
   4. 앱 상세 페이지에서 App ID와 Secret을 확인합니다.
   5. 광고주 인가(authorization) 링크로 광고 계정 접근을 승인하면 auth_code가 발급됩니다.
   6. auth_code를 access_token으로 교환합니다(앱이 자동 처리하거나 포털 가이드 참고).
   7. 연결된 advertiser_id(광고주 ID)를 확인합니다.
   8. GenieGo [등록]에 access_token과 advertiser_id를 입력해 저장합니다.

■ 네이버 검색광고 [naver_sa]
   1. 준비물: 네이버 검색광고 광고주 계정이 필요합니다.
   2. searchad.naver.com 에 광고주 계정으로 로그인합니다.
   3. 상단 [도구] 메뉴 > [API 사용 관리]로 이동합니다.
   4. [네이버 검색광고 API 서비스 신청] 버튼을 눌러 신청합니다.
   5. 발급된 CUSTOMER_ID, 액세스라이선스, 비밀키를 확인합니다.
   6. GenieGo [등록]에 api_key(액세스라이선스), api_secret(비밀키), customer_id를 입력해 저장합니다.

■ YouTube Data API [youtube]
   1. 준비물: Google 계정이 필요합니다. (운영팀이 대신 발급할 수 없는 자가 발급 채널입니다.)
   2. console.cloud.google.com 에 로그인 → 상단에서 프로젝트 선택 또는 [새 프로젝트]를 만듭니다.
   3. [API 및 서비스] > [라이브러리]에서 "YouTube Data API v3"를 검색해 [사용 설정]을 누릅니다.
   4. [사용자 인증 정보] > [사용자 인증 정보 만들기] → ★[API 키]를 선택해 생성된 API 키를 복사합니다. (공개 라이브/채널 데이터는 API 키면 충분 — OAuth 클라이언트 ID는 만들 필요가 없습니다.)
   5. 채널 ID 확보: YouTube Studio > 설정 > 채널 > 고급 설정에서 채널 ID(UC…로 시작)를 복사합니다.
   6. GenieGo [등록]의 ① API 키 칸에 복사한 API 키, ② 채널 ID 칸에 채널 ID를 입력해 저장합니다. (★OAuth 클라이언트 ID·비밀번호 client_id/secret 은 이 칸에 넣는 값이 아닙니다.)

■ Twitch [twitch]
   1. 준비물: Twitch 계정이 필요합니다.
   2. dev.twitch.tv/console 에 로그인합니다.
   3. [Applications] > [Register Your Application]을 누릅니다.
   4. 앱 이름과 OAuth Redirect URL을 입력하고 카테고리를 선택해 생성합니다.
   5. 생성된 앱에서 Client ID를 확인하고 [New Secret]으로 Client Secret을 발급합니다.
   6. GenieGo [등록]에 client_id와 client_secret을 입력해 저장합니다.

■ 쿠팡(WING) [coupang]
   1. 준비물: 쿠팡 WING 판매자 계정(사업자 인증 완료)이 필요합니다. 일반 회원은 발급할 수 없습니다.
   2. wing.coupang.com 에 판매자 계정으로 로그인합니다.
   3. 상단/설정 영역의 [Open API] 또는 [API 인증키 관리] 메뉴로 이동합니다.
   4. [Open API Key 발급]을 누르고, 회사명과 홈페이지/서비스 URL(없으면 wing.coupang.com), 접근 IP(최대 10개)를 입력합니다.
   5. 발급 완료 화면에서 Access Key와 Secret Key를 확인하고, 판매자(Vendor) ID도 함께 확인합니다.
   6. GenieGo [등록]에 access_key, secret_key, vendor_id를 입력해 저장합니다.

■ 네이버 스마트스토어 [naver_smartstore]
   1. 준비물: 스마트스토어 판매자 계정의 "통합매니저" 권한이 필요합니다(통합매니저만 발급 가능).
   2. apicenter.commerce.naver.com (네이버 커머스 API 센터)에 접속합니다.
   3. 우측 상단 [계정생성]을 눌러 개발업체 계정명·장애대응 연락처를 입력하고 약관에 동의해 가입합니다.
   4. [내 스토어 애플리케이션]에서 애플리케이션을 등록하면 애플리케이션 ID와 Secret이 발급됩니다.
   5. API를 호출할 서버 IP를 등록하고, 안내에 따라 주기적으로 애플리케이션 인증을 갱신합니다.
   6. GenieGo [등록]에 client_id, client_secret을 입력해 저장합니다.

■ 11번가 [st11]
   1. 준비물: 11번가 셀러(판매자) 계정이 필요합니다.
   2. openapi.11st.co.kr 에 셀러 아이디로 로그인합니다.
   3. 메뉴에서 [서비스 등록·확인]을 눌러 셀러 정보를 입력하고 약관에 동의해 등록합니다.
   4. [Seller API 정보] > [수정]에서 API 접근이 가능한 서버 IP를 등록합니다.
   5. 발급된 API Key를 복사합니다.
   6. GenieGo [등록]에 api_key와 seller_id(셀러 ID)를 입력해 저장합니다.

■ G마켓 [gmarket]
   1. 준비물: 옥션·G마켓 각각의 판매자 계정과 ESM Plus 마스터 ID가 필요합니다.
   2. 옥션과 G마켓에 각각 판매자로 가입한 뒤, ESM Plus(esmplus.com)에 로그인해 마스터 ID를 생성합니다.
   3. etapi.gmarket.com (ESM Trading API)에 접속해 API 사용을 신청합니다. (승인제 — 거절될 수 있습니다.)
   4. 신청 시 옥션 판매자ID, G마켓 판매자ID, ESM 마스터 ID 3가지를 제출합니다.
   5. 승인되면 API 키가 발급됩니다. (문의: etapihelp@gmail.com)
   6. GenieGo [등록]에 발급받은 api_key와 seller_id를 입력해 저장합니다.

■ 롯데온 [lotteon]
   1. 준비물: 롯데온 입점(사업자 인증 완료) 셀러 계정이 필요합니다.
   2. 롯데온 셀러 스토어센터(store.lotteon.com)에 로그인합니다.
   3. [판매자정보] > [OpenAPI관리] > [정보설정]에서 호출 서버 IP를 등록합니다.
   4. [키발급] 버튼을 눌러 OpenAPI 인증키를 발급하고 판매자(셀러) ID를 확인합니다.
   5. GenieGo [등록]에 api_key(OpenAPI 인증키)와 seller_id를 입력해 저장합니다.

■ 옥션 [auction]
   1. 준비물: 옥션·G마켓 각각의 판매자 계정과 ESM Plus 마스터 ID가 필요합니다.
   2. 옥션과 G마켓에 각각 판매자로 가입한 뒤, ESM Plus(esmplus.com)에 로그인해 마스터 ID를 생성합니다.
   3. etapi.gmarket.com (ESM Trading API)에 접속해 API 사용을 신청합니다. (승인제 — 거절될 수 있습니다.)
   4. 신청 시 옥션 판매자ID, G마켓 판매자ID, ESM 마스터 ID 3가지를 제출합니다.
   5. 승인되면 API 키가 발급됩니다. (문의: etapihelp@gmail.com)
   6. GenieGo [등록]에 발급받은 api_key와 seller_id를 입력해 저장합니다.

■ Amazon SP-API [amazon_spapi]
   1. 준비물: Amazon 프로페셔널(Professional) 셀러 계정이 필요합니다. 개인(Individual) 계정은 불가합니다.
   2. Seller Central에 로그인 → 상단 메뉴 [앱 및 서비스] > [앱 개발(Develop Apps)]로 이동합니다.
   3. [개발자 프로필 등록]을 진행해 조직 정보와 데이터 사용 목적·보안 정보를 제출합니다(승인 필요).
   4. 개발자 콘솔에서 [앱 등록]을 눌러 앱을 만들면 LWA(client_id/client_secret)가 발급됩니다.
   5. 셀프 인증(self-authorize)으로 refresh token을 발급받습니다.
   6. 판매 대상 Marketplace ID와 Seller ID를 확인합니다.
   7. GenieGo [등록]에 refresh_token, client_id, client_secret, marketplace_id, seller_id를 입력해 저장합니다.

■ eBay [ebay]
   1. 준비물: eBay 계정이 필요합니다.
   2. developer.ebay.com 에 접속해 개발자 프로그램에 가입합니다.
   3. [Application Keys] 페이지에서 Production 항목의 [Create a keyset]을 누릅니다.
   4. "Your Keyset is currently disabled" 안내가 보이면 링크를 눌러 마켓플레이스 계정 삭제 알림 구독/거부 절차를 완료합니다.
   5. 발급된 DevID, AppID, CertID를 확인하고 OAuth 사용자 토큰을 생성합니다.
   6. GenieGo [등록]에 OAuth 액세스 토큰을 입력해 저장합니다.

■ Shopee [shopee]
   1. 준비물: Shopee 판매자 계정이 필요합니다.
   2. Shopee Open Platform(open.shopee.com)에서 개발자로 등록하고 승인을 기다립니다.
   3. [App Management] > [App List]에서 앱을 만들면 Partner ID와 Partner Key가 발급됩니다.
   4. 샵 인가(authorization) 링크를 생성해 판매자 샵을 인가하면 code가 발급됩니다.
   5. code로 access_token을 발급받습니다(access_token은 4시간마다 갱신).
   6. GenieGo [등록]에 partner_id, partner_key, shop_id를 입력해 저장합니다.

■ Lazada [lazada]
   1. 준비물: Lazada 판매자 계정이 필요합니다.
   2. Lazada Open Platform(open.lazada.com)에 개발자로 등록합니다.
   3. 앱을 생성하면 App Key와 App Secret이 발급됩니다.
   4. 샵 인가를 진행해 access_token을 발급받습니다.
   5. GenieGo [등록]에 app_key, app_secret을 입력해 저장합니다.

■ TikTok Shop [tiktok_shop]
   1. 준비물: TikTok Shop 판매자 계정이 필요합니다.
   2. partner.tiktokshop.com (Partner Center)에 개발자로 등록합니다.
   3. [App & Service] > [Create App]으로 앱을 만들고 App Key, App Secret, Service ID를 확인합니다.
   4. 앱 설정에서 필요한 API 권한(Shop Authorized Information, Product, Order)을 활성화합니다.
   5. [Get shop authorization]에서 지역(Region)을 선택해 판매자 샵을 인가하면 access_token이 발급됩니다.
   6. GenieGo [등록]에 app_key, app_secret, access_token을 입력해 저장합니다.

■ Etsy [etsy]
   1. 준비물: Etsy 셀러 계정이 필요합니다.
   2. etsy.com/developers 에 접속해 [Create a New App]을 누릅니다.
   3. 앱 정보를 입력하면 API Key(keystring)가 발급됩니다.
   4. OAuth 인가를 거쳐 access token을 발급받습니다.
   5. GenieGo [등록]에 api_key와 shop_id를 입력해 저장합니다.

■ Walmart [walmart]
   1. 준비물: Walmart 마켓플레이스 셀러 계정이 필요합니다.
   2. Walmart 셀러센터 > Developer Portal에 접속합니다.
   3. API Key(client_id)와 Client Secret을 생성합니다.
   4. GenieGo [등록]에 client_id, client_secret을 입력해 저장합니다.

■ Qoo10 [qoo10]
   1. 준비물: Qoo10 판매자(QSM) 계정이 필요합니다.
   2. Qoo10 QSM에 로그인 → API 관리 메뉴로 이동합니다.
   3. API 인증키를 발급받습니다.
   4. GenieGo [등록]에 api_key와 seller_id를 입력해 저장합니다.

■ Rakuten [rakuten]
   1. 준비물: Rakuten 판매자 계정이 필요합니다.
   2. Rakuten 개발자 포털(RMS/Webservice)에 로그인합니다.
   3. Service Secret과 License Key를 발급받습니다.
   4. GenieGo [등록]에 service_secret, license_key, shop_url을 입력해 저장합니다.

■ Shopify [shopify]
   1. 준비물: Shopify 스토어 관리자 권한이 필요합니다.
   2. Shopify 관리자(Admin) > [설정] > [앱 및 판매 채널]로 이동합니다.
   3. [앱 개발] > [앱 만들기]를 눌러 커스텀 앱을 만듭니다.
   4. Admin API 범위(scope)를 선택하고 앱을 설치합니다.
   5. 설치 후 표시되는 Admin API 액세스 토큰을 즉시 복사합니다(한 번만 표시됨).
   6. GenieGo [등록]에 shop_domain(xxx.myshopify.com)과 access_token을 입력해 저장합니다.

■ WooCommerce [woocommerce]
   1. 준비물: WordPress/WooCommerce 관리자 권한이 필요합니다.
   2. WooCommerce > [설정] > [고급] > [REST API]로 이동합니다.
   3. [키 추가]를 눌러 설명과 권한(읽기/쓰기)을 선택하고 생성합니다.
   4. 발급된 Consumer Key와 Consumer Secret을 복사합니다.
   5. GenieGo [등록]에 site_url, consumer_key, consumer_secret을 입력해 저장합니다.

■ Magento [magento]
   1. 준비물: Magento(Adobe Commerce) 관리자 권한이 필요합니다.
   2. Magento 관리자 > [시스템] > [통합(Integration)]으로 이동합니다.
   3. [Add New Integration]으로 통합을 만들고 리소스 권한을 설정합니다.
   4. [Activate]를 눌러 액세스 토큰을 발급받습니다.
   5. GenieGo [등록]에 base_url(스토어 URL)과 access_token을 입력해 저장합니다.

■ Cafe24 [cafe24]
   1. 준비물: 카페24 쇼핑몰 운영자 계정이 필요합니다.
   2. developer.cafe24.com 에 접속해 개발자로 등록합니다.
   3. [앱] > [앱 등록]으로 앱을 만들면 Client ID와 Client Secret이 발급됩니다.
   4. OAuth 2.0 인가를 거쳐 access token과 refresh token을 발급받습니다.
   5. GenieGo [등록]에 mall_id, client_id, client_secret, refresh_token을 입력해 저장합니다.

■ 고도몰 [godomall]
   1. 준비물: 고도몰(NHN커머스) 쇼핑몰 운영자 계정이 필요합니다.
   2. NHN커머스 개발자센터(devcenter.nhn-commerce.com)에 개발자로 등록하고 승인을 받습니다.
   3. [오픈API] > [키발급 신청]에서 신청폼을 작성해 제출합니다.
   4. 발급된 오픈API 키(파트너키/API키)를 확인합니다.
   5. GenieGo [등록]에 partner_key, api_key를 입력해 저장합니다.

■ 이니시스 [inicis]
   1. 준비물: KG이니시스 가맹점 계약과 상점관리자 계정이 필요합니다.
   2. 이니시스 상점관리자에 로그인합니다.
   3. [상점정보] > [계약정보] > [부가정보]로 이동합니다.
   4. INIAPI Key를 생성하고, [웹결제 signkey 생성]으로 웹표준 사인키도 발급합니다.
   5. GenieGo [등록]에 MID(상점 ID), sign_key, api_key를 입력해 저장합니다.

■ 토스페이먼츠 [toss]
   1. 준비물: 토스페이먼츠 가맹점 계약이 필요합니다.
   2. 토스페이먼츠 상점관리자에 로그인합니다.
   3. 좌측 하단 [개발자센터]로 이동합니다.
   4. 테스트/라이브를 선택해 클라이언트 키와 시크릿 키를 확인합니다(세트로 사용).
   5. GenieGo [등록]에 client_key, secret_key를 입력해 저장합니다.

■ KCP [kcp]
   1. 준비물: NHN KCP 가맹점 계약이 필요합니다.
   2. NHN KCP 가맹점 관리자에 로그인합니다.
   3. 사이트코드(site_cd)와 사이트키를 발급/확인합니다.
   4. GenieGo [등록]에 site_cd, site_key를 입력해 저장합니다.

■ 카카오페이 [kakaopay]
   1. 준비물: 카카오페이 가맹점 계약이 필요합니다.
   2. 카카오페이 개발자센터(developers.kakaopay.com)에 가입·로그인합니다.
   3. 애플리케이션을 생성해 가맹점 코드(CID)와 Secret Key를 발급/확인합니다(인증 헤더 Authorization: SECRET_KEY).
   4. GenieGo [등록]에 cid, secret_key를 입력해 저장합니다.

■ PayPal [paypal]
   1. 준비물: PayPal 비즈니스 계정이 필요합니다.
   2. developer.paypal.com 에 로그인 → [Apps & Credentials]로 이동합니다.
   3. [Live] 탭에서 [Create App]으로 앱을 만듭니다.
   4. 발급된 Client ID와 Secret을 확인합니다.
   5. GenieGo [등록]에 client_id, client_secret을 입력해 저장합니다.

■ Stripe [stripe]
   1. 준비물: Stripe 계정이 필요합니다.
   2. dashboard.stripe.com 에 로그인합니다.
   3. [개발자(Developers)] > [API 키(API keys)]로 이동합니다.
   4. Publishable key와 Secret key를 확인합니다(라이브 키 사용).
   5. GenieGo [등록]에 publishable_key, secret_key를 입력해 저장합니다.

■ Paddle [paddle]
   1. 준비물: Paddle 계정이 필요합니다(SaaS·디지털 상품 Merchant of Record · Billing v2).
   2. Paddle 대시보드에 로그인합니다.
   3. [Developer Tools] > [Authentication] > [API keys]에서 Billing API 키(Bearer, pdl_live_…)를 생성합니다(구 Classic vendor_id/auth_code 아님).
   4. GenieGo [등록]에 api_key를 입력해 저장합니다.

■ Adyen [adyen]
   1. 준비물: Adyen 가맹 계약·심사 승인이 필요합니다(엔터프라이즈 글로벌 PG).
   2. ca-live.adyen.com (Customer Area)에 로그인합니다.
   3. [Developers] > [API credentials]에서 API 키(X-API-Key)를 생성하고 Merchant Account명을 확인합니다.
   4. GenieGo [등록]에 api_key, merchant_account, batch_start를 입력해 저장합니다.

■ Square [square]
   1. 준비물: Square 계정이 필요합니다.
   2. developer.squareup.com/apps 에서 앱을 생성합니다.
   3. Production 탭에서 Access Token을, [Locations]에서 Location ID를 확인합니다.
   4. GenieGo [등록]에 access_token, location_id를 입력해 저장합니다.

■ Braintree [braintree]
   1. 준비물: Braintree(PayPal) 가맹 계정 승인이 필요합니다.
   2. Control Panel(braintreegateway.com)에 로그인합니다.
   3. [Settings] > [API Keys]에서 Merchant ID·Public Key·Private Key를 확인합니다(Production).
   4. GenieGo [등록]에 merchant_id, public_key, private_key를 입력해 저장합니다.

■ Checkout.com [checkout]
   1. 준비물: Checkout.com 가맹 계약·심사 승인이 필요합니다.
   2. dashboard.checkout.com 에 로그인합니다.
   3. [Developers] > [Keys]에서 Secret Key(sk_)와 Public Key(pk_)를 확인합니다(Live).
   4. GenieGo [등록]에 secret_key, public_key를 입력해 저장합니다.

■ Mollie [mollie]
   1. 준비물: Mollie 계정이 필요합니다(유럽 중심).
   2. my.mollie.com 대시보드 > [Developers] > [API keys]로 이동합니다.
   3. Live API 키(live_로 시작)를 확인합니다.
   4. GenieGo [등록]에 api_key를 입력해 저장합니다.

■ Razorpay [razorpay]
   1. 준비물: Razorpay 계정이 필요합니다(인도 중심).
   2. dashboard.razorpay.com > [Settings] > [API Keys]로 이동합니다.
   3. Live 모드에서 Key ID와 Key Secret을 생성·확인합니다.
   4. GenieGo [등록]에 key_id, key_secret을 입력해 저장합니다.

■ Klarna [klarna]
   1. 준비물: Klarna 가맹 계약이 필요합니다(BNPL).
   2. Merchant Portal(portal.klarna.com)에 로그인합니다.
   3. [Settings] > [Klarna API credentials]에서 API username·password를 생성하고 리전(eu/na/oc)을 확인합니다.
   4. GenieGo [등록]에 username, password, region을 입력해 저장합니다.

■ 스마트택배 [smarttracker]
   1. 준비물: 별도 계약 없이 가입만으로 사용 가능한 통합 배송추적 서비스입니다.
   2. tracking.sweettracker.co.kr 에 접속해 가입하고 로그인합니다.
   3. t_key(전 택배사 통합 추적 키) 발급을 신청합니다.
   4. GenieGo [등록]에 t_key(api_key)를 입력하면 모든 택배사 배송추적이 연동됩니다.

■ DHL [dhl]
   1. 준비물: DHL Express 고객 계정번호가 있으면 좋습니다.
   2. developer.dhl.com 에 접속해 이메일로 가입하고 인증합니다.
   3. 로그인 후 [Get Access] 섹션에서 고객 정보를 등록하고 자격증명을 신청합니다.
   4. 보통 영업일 다음 날 Test/Production 승인 메일을 받습니다.
   5. 포털에서 본인 앱(회사명) > [Show Key]로 API Key와 Secret을 확인합니다.
   6. GenieGo [등록]에 api_key와 account_number(계정번호)를 입력해 저장합니다.

■ FedEx [fedex]
   1. 준비물: FedEx 계정번호가 필요합니다.
   2. developer.fedex.com 에 가입하고 로그인합니다.
   3. 프로젝트를 생성하면 API Key와 Secret Key가 발급됩니다.
   4. GenieGo [등록]에 api_key, api_secret, account_number를 입력해 저장합니다.

■ UPS [ups]
   1. 준비물: UPS 계정번호가 필요합니다.
   2. developer.ups.com 에 가입하고 앱을 생성합니다.
   3. client_id와 client_secret을 발급받습니다.
   4. GenieGo [등록]에 client_id, client_secret, account_number를 입력해 저장합니다.

■ Google Analytics(GA4) [google_analytics]
   1. 준비물: GA4 속성 관리 권한이 필요합니다.
   2. Google Analytics(analytics.google.com) > [관리] > [데이터 스트림]으로 이동합니다.
   3. 웹 스트림을 선택해 측정 ID(G-로 시작)를 확인합니다.
   4. 같은 화면에서 [Measurement Protocol API secret]을 생성합니다.
   5. GenieGo [등록]에 measurement_id, api_secret을 입력해 저장합니다.

■ Instagram [instagram]
   1. 준비물: Meta(Facebook) 개발자 계정 + 페이스북 페이지에 연결된 Instagram 비즈니스/크리에이터 계정이 필요합니다.
   2. developers.facebook.com > [내 앱] > [앱 만들기]에서 비즈니스 유형 앱을 생성합니다.
   3. [Instagram Graph API] 제품을 추가하고 앱 검수(App Review)로 instagram_basic 등 권한을 신청합니다.
   4. 시스템 사용자/페이지 토큰으로 액세스 토큰을 발급하고 IG 비즈니스 계정 ID를 확인합니다.
   5. GenieGo [등록]에 access_token, ig_user_id 를 입력해 저장합니다.

■ Facebook [facebook]
   1. 준비물: Meta(Facebook) 개발자 계정 + 관리 권한이 있는 페이스북 페이지가 필요합니다.
   2. developers.facebook.com > [내 앱] > [앱 만들기]에서 비즈니스 유형 앱을 생성합니다.
   3. [페이지]/[Facebook 로그인] 제품을 추가하고 앱 검수로 pages_read_engagement 등 권한을 신청합니다.
   4. 그래프 API 탐색기 또는 시스템 사용자로 페이지 액세스 토큰을 발급하고 페이지 ID를 확인합니다.
   5. GenieGo [등록]에 access_token(페이지 토큰), page_id 를 입력해 저장합니다.

■ 카카오모먼트 [kakao_moment]
   1. 준비물: 카카오모먼트 광고계정 + 카카오 비즈니스 채널. ★오픈API 권한은 카카오 공식 광고대행사에만 부여됩니다(일반 광고주 자가발급 불가).
   2. developers.kakao.com 에서 앱을 생성하고 [비즈니스 앱]으로 전환합니다.
   3. 카카오모먼트 오픈API [추가기능 신청] — 공식 대행사 자격 검토 후 권한이 부여됩니다.
   4. 권한 승인 후 OAuth 인가로 액세스 토큰을 발급하고 광고계정 ID를 확인합니다(연동허브 OAuth 원클릭 가능).
   5. GenieGo [등록]에 access_token, ad_account_id 를 입력해 저장합니다.

■ 네이버페이 [naverpay]
   1. 준비물: 네이버페이 가맹점 가입(계약)이 완료되어야 합니다. ★자가발급이 아니라 계약 후 자격증명이 전달됩니다.
   2. 네이버페이 비즈니스 센터에서 가맹 계약을 신청·완료합니다.
   3. 심사·계약 완료 후 담당자로부터 Client ID·Client Secret·Chain ID 를 전달받습니다.
   4. GenieGo [등록]에 client_id, client_secret, chain_id 를 입력해 저장합니다.

■ CJ대한통운 [cj]
   1. 준비물: CJ대한통운 계약(고객) 코드가 필요합니다(계약형).
   2. ★배송 추적만 필요하면 [스마트택배(통합 추적)] 채널에 t_key 하나로 전 택배사를 연동할 수 있습니다(권장).
   3. CJ대한통운 전용 API가 필요하면 영업 담당으로 계약(고객) 코드와 API 키를 발급받습니다.
   4. GenieGo [등록]에 api_key, cust_code 를 입력해 저장합니다.

■ 롯데택배 [lotte]
   1. 준비물: 롯데글로벌로지스 계약(고객) 코드가 필요합니다(계약형).
   2. ★배송 추적만 필요하면 [스마트택배(통합 추적)] 채널에 t_key 하나로 전 택배사를 연동할 수 있습니다(권장).
   3. 전용 API가 필요하면 영업 담당으로 계약(고객) 코드와 API 키를 발급받습니다.
   4. GenieGo [등록]에 api_key, cust_code 를 입력해 저장합니다.

■ 한진택배 [hanjin]
   1. 준비물: 한진택배 계약(고객) 코드가 필요합니다(계약형).
   2. ★배송 추적만 필요하면 [스마트택배(통합 추적)] 채널에 t_key 하나로 전 택배사를 연동할 수 있습니다(권장).
   3. 전용 API가 필요하면 영업 담당으로 계약(고객) 코드와 API 키를 발급받습니다.
   4. GenieGo [등록]에 api_key, cust_code 를 입력해 저장합니다.

■ 로젠택배 [logen]
   1. 준비물: 별도 발급 없이 스마트택배(스윗트래커) 통합 추적 키로 연동됩니다.
   2. tracking.sweettracker.co.kr 에 가입해 t_key 를 발급합니다.
   3. 연동허브에서 [스마트택배(통합 추적)] 채널을 선택합니다(로젠택배 채널 대신).
   4. GenieGo [등록]에 t_key(api_key)를 입력하면 로젠택배 배송추적이 연동됩니다.

■ 우체국택배 [epost]
   1. 준비물: 별도 발급 없이 스마트택배(스윗트래커) 통합 추적 키로 연동됩니다.
   2. tracking.sweettracker.co.kr 에 가입해 t_key 를 발급합니다.
   3. 연동허브에서 [스마트택배(통합 추적)] 채널을 선택합니다(우체국택배 채널 대신).
   4. GenieGo [등록]에 t_key(api_key)를 입력하면 우체국택배 배송추적이 연동됩니다.

■ 당일배송 [ocl_sameday]
   1. 준비물: 지니고 당일배송 서비스 계약이 필요합니다(운영팀).
   2. 운영팀에 당일배송 이용을 신청·계약합니다.
   3. 계약 완료 후 머천트 ID·API 키·서비스 권역을 발급받습니다.
   4. GenieGo [등록]에 api_key, merchant_id, region 을 입력해 저장합니다.

■ 풀필먼트 [fulfillment]
   1. 준비물: 3PL 풀필먼트 입출고 위탁 계약이 필요합니다.
   2. 풀필먼트 사업자/운영팀과 위탁 계약을 체결합니다.
   3. 계약 완료 후 창고 ID·3PL API 키를 발급받습니다.
   4. GenieGo [등록]에 api_key, warehouse_id 를 입력해 저장합니다.

■ EMS [ems]
   1. 준비물: 우체국 국제특송(EMS) 계약(고객) 코드가 필요합니다(계약형).
   2. 인터넷우체국/계약창구에서 EMS 계약을 진행합니다.
   3. 계약 완료 후 고객(계약) 코드와 우체국 API 키를 발급받습니다.
   4. GenieGo [등록]에 api_key, cust_code 를 입력해 저장합니다.

■ CJ국제특송 [cj_intl]
   1. 준비물: CJ대한통운 국제특송 계약(고객) 코드가 필요합니다(계약형).
   2. CJ대한통운 국제특송 영업 담당과 계약을 진행합니다.
   3. 계약 완료 후 고객(계약) 코드와 API 키를 발급받습니다.
   4. GenieGo [등록]에 api_key, cust_code 를 입력해 저장합니다.

■ TNT [tnt]
   1. 준비물: TNT는 FedEx에 통합되어 FedEx Developer Portal 자격증명을 사용합니다.
   2. developer.fedex.com 에 가입하고 프로젝트를 생성합니다.
   3. API Key/Secret 을 발급하고 FedEx 계정번호를 확인합니다.
   4. GenieGo [등록]에 api_key, api_secret, account_number 를 입력해 저장합니다.

■ Yahoo! Japan [yahoo_japan]
   1. 준비물: Yahoo! JAPAN 비즈니스 ID + Yahoo!デベロッパー 애플리케이션이 필요합니다.
   2. e.developer.yahoo.co.jp 에서 애플리케이션을 등록해 Client ID·Client Secret을 발급합니다.
   3. OAuth 2.0 인가 절차로 Access Token(OAuth Token)을 발급받습니다.
   4. GenieGo [등록]에 client_id, client_secret, access_token 을 입력해 저장합니다.

■ 카카오 알림톡 [kakao_alimtalk]
   1. 준비물: 카카오톡 채널(비즈니스 인증) + 발송 대행사/플랫폼 계정. ★채널 비즈니스 인증·발신 프로필 검수·알림톡 템플릿 승인이 선행되어야 합니다.
   2. 카카오톡 채널을 개설하고 비즈니스 인증을 완료합니다.
   3. 발송 대행사/플랫폼(비즈메시지)에 발신 프로필(sender_key)을 등록하고 알림톡 템플릿 승인을 받습니다.
   4. 발송 플랫폼에서 API Key·Secret을 확인합니다.
   5. GenieGo [등록]에 sender_key, api_key, api_secret 을 입력해 저장합니다.

■ LINE [line]
   1. 준비물: LINE Developers 계정 + LINE 공식 계정(Messaging API 채널)이 필요합니다.
   2. developers.line.biz 콘솔에서 프로바이더와 Messaging API 채널을 생성합니다.
   3. [Basic settings]에서 Channel Secret을, [Messaging API]에서 Channel Access Token을 발급합니다.
   4. GenieGo [등록]에 channel_secret, channel_access_token 을 입력해 저장합니다.

■ Slack [slack]
   1. 준비물: Slack 워크스페이스 관리 권한이 필요합니다.
   2. api.slack.com/apps 에서 [Create New App]을 누릅니다.
   3. [Incoming Webhooks]를 활성화하고 [Add New Webhook to Workspace]를 누릅니다.
   4. 채널을 선택하면 Webhook URL이 생성됩니다.
   5. GenieGo [등록]에 webhook_url을 입력해 저장합니다.
TXT;
    }
    /** 메뉴별 초보자 이용가이드(기능·역할·따라하기·활용). */
    public static function menuGuides(): string {
        return <<<'TXT'
● 메뉴: line
   - 이게 무슨 기능인가요?: LINE 공식계정 친구들에게 알림·마케팅 메시지를 보내는 메뉴입니다. 메시지 양식(템플릿)을 만들어 두고, 캠페인으로 한 번에 발송(브로드캐스트)합니다.
   - 어떤 역할을 하나요?: 카카오·이메일·SMS처럼 LINE을 하나의 고객 소통 채널로 통합 관리합니다. 발송 결과는 CRM·대시보드와 자동 동기화되어 채널별 성과로 합산됩니다.
   - 따라하기:
       ① 연동 설정 탭에서 LINE 채널 자격증명 입력 → Channel Access Token 등 발급 정보를 넣고 저장하면 실제 발송이 활성화됩니다.
       ② 템플릿 탭에서 메시지 양식 만들기 → 자주 쓰는 안내문(예: 신상품, 쿠폰)을 미리 저장합니다.
       ③ 캠페인 탭에서 새 캠페인 생성 → 발송 → 템플릿을 골라 캠페인을 만들고 발송 버튼을 누르면 친구들에게 전송됩니다.
   - 이 정보로 무엇을 할 수 있나요?: 발송·도달·클릭 통계를 보고 어떤 메시지가 반응이 좋은지 파악해, 다음 캠페인 문구와 발송 시점을 개선하세요. (미연동 상태면 통계는 "—"로 표시됩니다)

● 메뉴: whatsapp
   - 이게 무슨 기능인가요?: WhatsApp Business로 고객에게 주문확인·배송알림 같은 메시지를 1:1 또는 여러 명에게 한 번에 보내는 메뉴입니다.
   - 어떤 역할을 하나요?: WhatsApp은 승인된 템플릿(UTILITY 등)으로만 발송이 가능합니다. 이 메뉴에서 템플릿을 관리하고, 실제 발송·이력을 한곳에서 다룹니다.
   - 따라하기:
       ① 연동 설정에서 API 자격증명 입력 → WhatsApp Business API 토큰을 저장하면 발송이 활성화됩니다.
       ② 1:1 발송: 받는 번호 + 메시지 입력 후 전송 → 번호는 국가코드 포함(예: 821012345678) 형식으로 입력합니다.
       ③ 일괄 발송: 여러 번호를 줄바꿈으로 입력 후 전송 → 여러 고객에게 동일 메시지를 한 번에 보냅니다.
   - 이 정보로 무엇을 할 수 있나요?: 발송 이력·통계로 도달·실패를 확인하고, 실패가 잦으면 번호 품질·템플릿 승인 상태를 점검하세요.

● 메뉴: igdm
   - 이게 무슨 기능인가요?: Instagram·Facebook Messenger의 DM(다이렉트 메시지)을 한곳에서 관리하는 메뉴입니다. 대화 확인, DM 발송, 단체 발송, 자동 응답을 할 수 있습니다.
   - 어떤 역할을 하나요?: Page Access Token 1개만 입력하면 즉시 연동됩니다. 광고로 유입된 고객 문의를 빠르게 응대하고, 자동 응답 규칙으로 반복 문의를 자동 처리합니다.
   - 따라하기:
       ① 연동 설정 탭에서 Page Access Token 입력 → 토큰 1개 저장으로 Instagram + Facebook Messenger가 연동됩니다.
       ② 대화 탭에서 들어온 DM 확인·답장 → 고객별 대화를 보고 직접 답장합니다.
       ③ 단체 발송 탭에서 여러 고객에게 메시지 → 최근 24시간 내 문의(inbound)한 고객에게 일괄 발송할 수 있습니다(정책 윈도우).
       ④ 자동 응답 규칙 설정(선택) → 특정 키워드에 자동으로 답하도록 규칙을 만들 수 있습니다.
   - 이 정보로 무엇을 할 수 있나요?: 응답 속도·발송 KPI를 보고 고객 응대 품질을 관리하세요. 자주 묻는 질문은 자동 응답으로 옮겨 응대 부담을 줄입니다.

● 메뉴: reportBuilder
   - 이게 무슨 기능인가요?: 원하는 지표를 골라 나만의 리포트를 만들고, 정해진 주기(매일/매주 등)에 이메일로 자동 발송하는 메뉴입니다.
   - 어떤 역할을 하나요?: 매번 수동으로 성과를 정리하지 않아도, 경영진·팀에게 정기 리포트가 자동으로 전달되게 합니다.
   - 따라하기:
       ① 리포트 이름 입력 → 예: "주간 KPI 요약".
       ② 받는 사람 이메일 입력 → 쉼표로 여러 명(예: a@x.com, b@y.com).
       ③ 발송 주기 설정 후 저장 → 저장하면 예약 목록에 등록되어 자동 발송됩니다.
       ④ 이력 탭에서 발송 기록 확인 → 언제 누구에게 발송됐는지 추적합니다.
   - 이 정보로 무엇을 할 수 있나요?: 정기 리포트로 성과 추세를 놓치지 않고, 수치가 나빠진 항목을 빠르게 발견해 대응하세요.

● 메뉴: dataTrust
   - 이게 무슨 기능인가요?: 플랫폼이 사용하는 데이터가 얼마나 믿을 만한지 점수·계보(어디서 왔는지)·품질 규칙·개인정보 컴플라이언스로 보여주는 메뉴입니다.
   - 어떤 역할을 하나요?: 대시보드의 숫자를 신뢰하려면 그 바탕 데이터가 정확해야 합니다. 이 메뉴는 데이터 소스 연결 상태·결측·규칙 위반을 한눈에 점검하게 해줍니다.
   - 이 정보로 무엇을 할 수 있나요?: "점검 필요"로 표시된 소스가 있으면 연동 허브에서 재연결하거나 규칙을 손보세요. 신뢰도 점수가 낮을 때는 그 데이터에 기반한 의사결정을 보류하는 게 안전합니다.

● 메뉴: audit
   - 이게 무슨 기능인가요?: 누가·언제·무엇을 변경했는지 기록한 보안 감사 로그를 조회·검색하는 메뉴입니다. (가격 변경, 권한 부여, 설정 수정 등)
   - 어떤 역할을 하나요?: 은행급 보안을 위해 모든 중요한 변경을 추적합니다. 문제가 생겼을 때 원인과 책임 소재를 정확히 확인할 수 있습니다.
   - 따라하기:
       ① 검색창에 키워드 입력 → 사용자, 액션, 대상 등으로 기록을 찾습니다.
       ② 필터로 기간·유형 좁히기 → 원하는 시점·종류의 변경만 모아 봅니다.
   - 이 정보로 무엇을 할 수 있나요?: 예상치 못한 변경(권한 상승·대량 삭제 등)이 보이면 즉시 담당자를 확인하고 조치하세요. 정기적으로 훑어보는 것만으로 내부 통제가 강화됩니다.

● 메뉴: developerHub
   - 이게 무슨 기능인가요?: 외부 시스템·개발자와 연동하기 위한 도구 모음입니다. API 키 발급, 웹훅 구독, 데이터 내보내기(익스포트), 알림 라우팅을 설정합니다.
   - 어떤 역할을 하나요?: 우리 데이터를 사내 BI·데이터웨어하우스·Slack 등으로 자동으로 흘려보내거나, 이벤트가 생기면 외부에 알리도록 연결하는 "연결 콘센트" 역할입니다.
   - 이 정보로 무엇을 할 수 있나요?: 반복 수작업(데이터 다운로드·복사)을 자동화하세요. 키는 외부 노출 시 즉시 회전(재발급)하고, 웹훅 전달 실패 로그를 주기적으로 점검합니다.

● 메뉴: aiRuleEngine
   - 이게 무슨 기능인가요?: "조건이 되면 자동으로 행동"하는 규칙을 만드는 메뉴입니다. 예: "어떤 채널의 ROAS가 1.5 미만이면 알림을 보내라".
   - 어떤 역할을 하나요?: 사람이 계속 지켜보지 않아도, 정해둔 조건(IF)을 시스템이 자동 감시하다가 충족되면 약속한 동작(THEN)을 실행합니다. 놓치기 쉬운 문제를 자동으로 잡아줍니다.
   - 따라하기:
       ① 규칙 이름 입력 → 예: "저ROAS 채널 알림".
       ② 조건(메트릭·연산자·임계값) 설정 → 예: channel_roas < 1.5. 대상(target)에 채널/SKU 지정.
       ③ 동작 선택 → 알림 / 웹훅 / 채널 일시정지 / 재주문 중 선택해 저장하면 활성화됩니다.
       ④ 로그 탭에서 트리거 이력 확인 → 언제 어떤 규칙이 작동했는지 봅니다.
   - 이 정보로 무엇을 할 수 있나요?: 오늘 트리거 수·성공률을 보고 규칙이 잘 작동하는지 점검하세요. 데이터가 없으면 규칙은 평가를 보류하므로 거짓 알림이 발생하지 않습니다.

● 메뉴: paymentMethods
   - 이게 무슨 기능인가요?: 광고비·구독 결제에 쓸 결제수단(카드 등)을 등록·관리하고, 결제 내역을 확인하는 메뉴입니다.
   - 어떤 역할을 하나요?: 플랫폼 이용료와 광고 집행 비용 결제의 중심입니다. 관리형 지출(월 예산 한도) 설정으로 과지출을 방지할 수 있습니다.
   - 따라하기:
       ① 결제수단 등록 → 안내에 따라 카드/결제 수단을 연결합니다(토스페이먼츠 등).
       ② 결제 내역·기간 조회 → 기간 필터로 언제 얼마가 결제됐는지 확인합니다.
   - 이 정보로 무엇을 할 수 있나요?: 월별 지출 추세를 보고 예산 한도를 조정하세요. 결제 실패가 있으면 수단을 갱신해 서비스·광고 중단을 예방합니다.

● 메뉴: feedback
   - 이게 무슨 기능인가요?: 고객·팀이 남긴 의견(피드백)을 모아 보고, 긍정/부정 감성으로 분석하며, 후속 액션을 관리하는 메뉴입니다.
   - 어떤 역할을 하나요?: 여러 채널(웹·앱·리뷰·이메일·카카오)에서 들어온 목소리(VOC)를 한곳에 모아 제품·서비스 개선의 우선순위를 정하게 해줍니다.
   - 따라하기:
       ① 대시보드에서 전체 현황 파악 → 총 피드백·긍정 비율 등 KPI를 봅니다.
       ② 최근 피드백 탭에서 개별 의견 확인 → 채널·평점·내용을 살펴봅니다.
       ③ 감성 분석·액션 탭에서 대응 → 부정 피드백을 액션 항목으로 옮겨 처리 상태를 관리합니다.
   - 이 정보로 무엇을 할 수 있나요?: 부정 비율이 오르거나 같은 불만이 반복되면 우선 개선 과제로 삼으세요. 자주 나오는 요청은 제품 로드맵에 반영합니다.

● 메뉴: pmOverview
   - 이게 무슨 기능인가요?: 마케팅·운영 프로젝트들의 진행 현황을 한눈에 보는 메뉴입니다. 진행 중·지연·완료 상태를 카드로 요약합니다.
   - 어떤 역할을 하나요?: 캠페인·연동·개선 작업을 "프로젝트"로 묶어 누가 무엇을 언제까지 하는지 추적합니다. 일이 흩어지지 않게 중심을 잡아줍니다.
   - 이 정보로 무엇을 할 수 있나요?: 지연된 프로젝트를 먼저 확인해 담당자·일정을 조정하세요. 상세 진입 시 보드·간트·태스크로 더 깊게 관리할 수 있습니다.

● 메뉴: pmPortfolio
   - 이게 무슨 기능인가요?: 여러 프로젝트를 상위 단위(포트폴리오·프로그램)로 묶어 큰 그림에서 보는 메뉴입니다.
   - 어떤 역할을 하나요?: 개별 프로젝트가 많아질 때, 목표·예산·우선순위 기준으로 묶어 어디에 자원을 집중할지 판단하게 해줍니다.
   - 이 정보로 무엇을 할 수 있나요?: 성과가 낮거나 중복되는 프로그램을 정리하고, 핵심 목표에 자원을 재배분하세요.

● 메뉴: pmResources
   - 이게 무슨 기능인가요?: 팀원별 가용 시간과 업무량(워크로드)을 보여주는 메뉴입니다. 누가 여유가 있고 누가 과부하인지 확인합니다.
   - 어떤 역할을 하나요?: 일을 사람에게 배정할 때 특정 인원에게 과중되지 않도록 균형을 잡아줍니다.
   - 이 정보로 무엇을 할 수 있나요?: 과부하인 팀원의 업무를 여유 있는 팀원에게 재배분하거나 일정을 조정해 번아웃·지연을 예방하세요.

● 메뉴: rulesEditorV2 (규칙 에디터 v2 · 피드 템플릿 버전관리 /rules-editor-v2)
   - 이게 무슨 기능인가요?: 판매 채널(Shopee·Qoo10·Rakuten·Amazon 등)에 상품을 내보낼 때 쓰는 "피드 템플릿(속성 매핑 규칙)"을 드래그&드롭으로 편집하고, 초안→제출→승인→배포의 버전 관리 워크플로우로 안전하게 관리하는 메뉴입니다. ★있는 기능입니다(피드 템플릿 버전관리·승인·배포 전담).
   - 어떤 역할을 하나요?: 내부 상품 필드(sku·title·price 등)를 각 채널이 요구하는 필드로 매핑하는 규칙을, 실수 없이 검토·승인 후에만 실제 반영되도록 합니다. 채널당 "현재 배포본"은 1개만 유지됩니다.
   - 따라하기:
       ① 상단에서 채널 선택(Shopee/Qoo10/Rakuten/Amazon) → 그 채널의 현재 배포본과 버전 목록이 로드됩니다.
       ② [초안 생성] 클릭 → 편집 가능한 새 초안(draft)이 만들어집니다(직전 배포본을 씨앗으로 복사).
       ③ 왼쪽 "내부 필드"를 오른쪽 "매핑" 영역으로 드래그 → 각 내부 필드를 채널 필드로 연결(클릭해 대상 수정·삭제 가능).
       ④ [저장]으로 초안 저장 → [제출]로 검토 요청 → [승인] → [배포] 순으로 진행하면 그 버전이 "현재 배포본"이 됩니다(이전 배포본은 자동 보관).
   - 이 정보로 무엇을 할 수 있나요?: 채널 피드 오류(필수 필드 누락 등)를 배포 전에 잡고, 문제가 생기면 이전 버전으로 되돌릴 근거(버전 이력)를 남기세요. 상태(초안/제출/승인/배포)로 누가 무엇을 언제 반영했는지 추적됩니다.
TXT;
    }
    /** "GeniegoROI는 뭐야?" 플랫폼 강점 소개. */
    public static function platformPitch(): string {
        return <<<'TXT'
GeniegoROI는 "광고 ROI 측정 + 커머스 운영(주문·정산) + 물류(WMS·수요예측·반품) + CRM/리텐션 + 라이브커머스 + AI"를 하나로 통합한 멀티테넌트 이커머스 순이익(ROI) 분석 플랫폼입니다(www.genieroi.com, 15개국 지원).

핵심 강점(경쟁사 대비):
1) 실제 순이익(Net Profit) 산출 — 단순 매출/ROAS가 아니라 광고비·원가(COGS)·물류비·반품비·결제수수료·다통화를 모두 반영한 "진짜 순이익 ROI"를 광고~주문~물류~정산 전 경로에서 단일 기준(SSOT)으로 계산. 데이터 한 건도 누락 없이 집계.
2) 완전 통합 — 경쟁사(예: 어트리뷰션만, 광고만, CRM만)는 특정 영역만 보여주지만, GeniegoROI는 모든 채널·도메인을 한 화면에 통합해 상품별/채널별/국가별/캠페인별로 끊김 없이 분석.
3) 정밀 어트리뷰션 — 6모델(라스트/퍼스트/선형/시간감쇠/포지션/마르코프) + Exact Shapley + 채널 시너지 + 베이지안 MMM + 증분성(업리프트)까지, 매출이 아닌 순이익 기여도로.
4) AI 중심 — 측정→분석→의사결정→실행→학습 AI Profit OS, 자동 추천·자동 캠페인·룰엔진·AI 쇼호스트·크리에이티브 생성·전체 용어 챗봇(15개국).
5) 커머스·물류 깊이 — 12채널 양방향 연동(리스팅·주문·재고·writeback)·WMS(LOT/FEFO·피킹·발주)·수요예측·반품 포털·리프라이서 승인큐.
6) 글로벌·엔터프라이즈 — 15개국 현지 자연어·다통화·SSO/SCIM·ABAC·GDPR·은행급 보안.

"자격증명만 등록하면 즉시 실행"되도록 채널/PG/물류 연동이 코드로 완비되어 있습니다.
TXT;
    }
}
