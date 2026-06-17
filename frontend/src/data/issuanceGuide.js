/* [현 차수] ★채널별 API 키 "발급 따라하기" — 초보자가 그대로 따라하면 발급받을 수 있는 아주 상세한 단계 가이드.
 *  - 거대 로케일 파일(ko.js 등) 오염을 피하기 위해 전용 데이터 모듈로 분리(ApiKeys 청크에서 사용).
 *  - 구조: ISSUANCE_GUIDE[channelKey][lang] = [ "1단계 상세설명", ... ]
 *  - 2026-06 웹 검증(공식 개발자 포털) 반영. 카카오모먼트는 공식 광고대행사 전용이라 자가 발급 단계 미제공.
 *  - 번역(15개국)은 ko 원본을 기준으로 생성. lang 미존재 시 en → ko 순 폴백.
 *  - 지원 언어: ko, en, ja, zh, zh-TW, de, th, vi, id, ar, es, fr, hi, pt, ru
 */

import en from './issuanceGuide.en.js';
import ja from './issuanceGuide.ja.js';
import zh from './issuanceGuide.zh.js';
import zhTW from './issuanceGuide.zh-TW.js';
import de from './issuanceGuide.de.js';
import th from './issuanceGuide.th.js';
import vi from './issuanceGuide.vi.js';
import id from './issuanceGuide.id.js';
import ar from './issuanceGuide.ar.js';
import es from './issuanceGuide.es.js';
import fr from './issuanceGuide.fr.js';
import hi from './issuanceGuide.hi.js';
import pt from './issuanceGuide.pt.js';
import ru from './issuanceGuide.ru.js';

export const GUIDE_LANGS = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'hi', 'pt', 'ru'];

/* 원본(한국어) — 초보자 기준 상세 단계. 번역 모듈이 이 키들을 그대로 미러링한다. */
export const ISSUANCE_GUIDE_KO = {
  meta_ads: [
    '준비물: Facebook 개인 계정과, 광고를 집행 중인 Meta 광고 계정이 필요합니다.',
    '브라우저에서 business.facebook.com 에 접속해 로그인하고, [비즈니스 만들기]로 비즈니스 계정을 만든 뒤 이메일 인증을 완료합니다.',
    'developers.facebook.com 에 접속 → 우측 상단 [내 앱] → [앱 만들기]를 누르고, 유형은 "비즈니스"를 선택해 앱을 만듭니다.',
    '앱 대시보드에서 "Marketing API" 카드를 찾아 [설정]을 눌러 제품으로 추가합니다.',
    '비즈니스 설정(business.facebook.com/settings) → [사용자] > [시스템 사용자] → [추가]로 시스템 사용자를 만들고, [자산 할당]에서 광고 계정에 대한 권한을 줍니다.',
    '같은 화면에서 [토큰 생성]을 눌러 앱을 선택하고 권한(ads_read, ads_management)을 체크한 뒤 토큰을 생성하고 그 값을 복사합니다.',
    '광고 계정 관리자(adsmanager.facebook.com)에서 광고 계정 ID(act_로 시작하는 숫자)를 확인합니다.',
    'GenieGo 연동허브 > 해당 채널 [등록]을 눌러 "액세스 토큰"과 "광고 계정 ID(act_)"를 붙여넣고 저장하면 연동 완료입니다.',
  ],
  google_ads: [
    '준비물: Google Ads 관리자(MCC) 계정과 Google 계정이 필요합니다. (없으면 ads.google.com 에서 관리자 계정을 먼저 만드세요.)',
    'Google Ads 관리자 계정에 로그인 → 상단 [도구 및 설정] > [설정] > [API 센터]로 이동합니다.',
    'API 센터에서 [개발자 토큰]을 신청합니다. 기본(Basic) 액세스는 Google 심사를 거쳐 승인되며, 승인 전에는 테스트 계정만 호출됩니다.',
    'console.cloud.google.com 에 접속해 프로젝트를 만들고, [API 및 서비스] > [OAuth 동의 화면]을 구성합니다.',
    '[사용자 인증 정보] > [사용자 인증 정보 만들기] > [OAuth 클라이언트 ID]를 만들어 client_id와 client_secret을 발급받습니다(범위 scope: adwords).',
    'OAuth 인증 절차로 refresh token을 발급받습니다.(Google OAuth Playground 또는 자체 인증 사용)',
    '호출 대상 광고 계정의 10자리 고객 ID(customer_id)를 확인합니다.',
    'GenieGo [등록]에 개발자 토큰, client_id, client_secret, refresh_token, customer_id를 입력해 저장합니다.',
  ],
  tiktok_business: [
    '준비물: TikTok For Business 광고 계정이 필요합니다.',
    'developers.tiktok.com (TikTok for Business 개발자 포털)에 로그인하고 개발자(조직) 등록을 완료합니다.',
    '[My Apps] > [Create an App]을 눌러 앱 이름과 용도 설명을 입력하고 앱을 만듭니다.',
    '앱 상세 페이지에서 App ID와 Secret을 확인합니다.',
    '광고주 인가(authorization) 링크로 광고 계정 접근을 승인하면 auth_code가 발급됩니다.',
    'auth_code를 access_token으로 교환합니다(앱이 자동 처리하거나 포털 가이드 참고).',
    '연결된 advertiser_id(광고주 ID)를 확인합니다.',
    'GenieGo [등록]에 access_token과 advertiser_id를 입력해 저장합니다.',
  ],
  naver_sa: [
    '준비물: 네이버 검색광고 광고주 계정이 필요합니다.',
    'searchad.naver.com 에 광고주 계정으로 로그인합니다.',
    '상단 [도구] 메뉴 > [API 사용 관리]로 이동합니다.',
    '[네이버 검색광고 API 서비스 신청] 버튼을 눌러 신청합니다.',
    '발급된 CUSTOMER_ID, 액세스라이선스, 비밀키를 확인합니다.',
    'GenieGo [등록]에 api_key(액세스라이선스), api_secret(비밀키), customer_id를 입력해 저장합니다.',
  ],
  youtube: [
    '준비물: Google 계정이 필요합니다. (운영팀이 대신 발급할 수 없는 자가 발급 채널입니다.)',
    'console.cloud.google.com 에 로그인 → 상단에서 프로젝트 선택 또는 [새 프로젝트]를 만듭니다.',
    '[API 및 서비스] > [라이브러리]에서 "YouTube Data API v3"를 검색해 [사용 설정]을 누릅니다.',
    '[사용자 인증 정보] > [사용자 인증 정보 만들기] → ★[API 키]를 선택해 생성된 API 키를 복사합니다. (공개 라이브/채널 데이터는 API 키면 충분 — OAuth 클라이언트 ID는 만들 필요가 없습니다.)',
    '채널 ID 확보: YouTube Studio > 설정 > 채널 > 고급 설정에서 채널 ID(UC…로 시작)를 복사합니다.',
    'GenieGo [등록]의 ① API 키 칸에 복사한 API 키, ② 채널 ID 칸에 채널 ID를 입력해 저장합니다. (★OAuth 클라이언트 ID·비밀번호 client_id/secret 은 이 칸에 넣는 값이 아닙니다.)',
  ],
  twitch: [
    '준비물: Twitch 계정이 필요합니다.',
    'dev.twitch.tv/console 에 로그인합니다.',
    '[Applications] > [Register Your Application]을 누릅니다.',
    '앱 이름과 OAuth Redirect URL을 입력하고 카테고리를 선택해 생성합니다.',
    '생성된 앱에서 Client ID를 확인하고 [New Secret]으로 Client Secret을 발급합니다.',
    'GenieGo [등록]에 client_id와 client_secret을 입력해 저장합니다.',
  ],
  coupang: [
    '준비물: 쿠팡 WING 판매자 계정(사업자 인증 완료)이 필요합니다. 일반 회원은 발급할 수 없습니다.',
    'wing.coupang.com 에 판매자 계정으로 로그인합니다.',
    '상단/설정 영역의 [Open API] 또는 [API 인증키 관리] 메뉴로 이동합니다.',
    '[Open API Key 발급]을 누르고, 회사명과 홈페이지/서비스 URL(없으면 wing.coupang.com), 접근 IP(최대 10개)를 입력합니다.',
    '발급 완료 화면에서 Access Key와 Secret Key를 확인하고, 판매자(Vendor) ID도 함께 확인합니다.',
    'GenieGo [등록]에 access_key, secret_key, vendor_id를 입력해 저장합니다.',
  ],
  naver_smartstore: [
    '준비물: 스마트스토어 판매자 계정의 "통합매니저" 권한이 필요합니다(통합매니저만 발급 가능).',
    'apicenter.commerce.naver.com (네이버 커머스 API 센터)에 접속합니다.',
    '우측 상단 [계정생성]을 눌러 개발업체 계정명·장애대응 연락처를 입력하고 약관에 동의해 가입합니다.',
    '[내 스토어 애플리케이션]에서 애플리케이션을 등록하면 애플리케이션 ID와 Secret이 발급됩니다.',
    'API를 호출할 서버 IP를 등록하고, 안내에 따라 주기적으로 애플리케이션 인증을 갱신합니다.',
    'GenieGo [등록]에 client_id, client_secret을 입력해 저장합니다.',
  ],
  st11: [
    '준비물: 11번가 셀러(판매자) 계정이 필요합니다.',
    'openapi.11st.co.kr 에 셀러 아이디로 로그인합니다.',
    '메뉴에서 [서비스 등록·확인]을 눌러 셀러 정보를 입력하고 약관에 동의해 등록합니다.',
    '[Seller API 정보] > [수정]에서 API 접근이 가능한 서버 IP를 등록합니다.',
    '발급된 API Key를 복사합니다.',
    'GenieGo [등록]에 api_key와 seller_id(셀러 ID)를 입력해 저장합니다.',
  ],
  gmarket: [
    '준비물: 옥션·G마켓 각각의 판매자 계정과 ESM Plus 마스터 ID가 필요합니다.',
    '옥션과 G마켓에 각각 판매자로 가입한 뒤, ESM Plus(esmplus.com)에 로그인해 마스터 ID를 생성합니다.',
    'etapi.gmarket.com (ESM Trading API)에 접속해 API 사용을 신청합니다. (승인제 — 거절될 수 있습니다.)',
    '신청 시 옥션 판매자ID, G마켓 판매자ID, ESM 마스터 ID 3가지를 제출합니다.',
    '승인되면 API 키가 발급됩니다. (문의: etapihelp@gmail.com)',
    'GenieGo [등록]에 발급받은 api_key와 seller_id를 입력해 저장합니다.',
  ],
  auction: [
    '준비물: 옥션·G마켓 각각의 판매자 계정과 ESM Plus 마스터 ID가 필요합니다.',
    '옥션과 G마켓에 각각 판매자로 가입한 뒤, ESM Plus(esmplus.com)에 로그인해 마스터 ID를 생성합니다.',
    'etapi.gmarket.com (ESM Trading API)에 접속해 API 사용을 신청합니다. (승인제 — 거절될 수 있습니다.)',
    '신청 시 옥션 판매자ID, G마켓 판매자ID, ESM 마스터 ID 3가지를 제출합니다.',
    '승인되면 API 키가 발급됩니다. (문의: etapihelp@gmail.com)',
    'GenieGo [등록]에 발급받은 api_key와 seller_id를 입력해 저장합니다.',
  ],
  amazon_spapi: [
    '준비물: Amazon 프로페셔널(Professional) 셀러 계정이 필요합니다. 개인(Individual) 계정은 불가합니다.',
    'Seller Central에 로그인 → 상단 메뉴 [앱 및 서비스] > [앱 개발(Develop Apps)]로 이동합니다.',
    '[개발자 프로필 등록]을 진행해 조직 정보와 데이터 사용 목적·보안 정보를 제출합니다(승인 필요).',
    '개발자 콘솔에서 [앱 등록]을 눌러 앱을 만들면 LWA(client_id/client_secret)가 발급됩니다.',
    '셀프 인증(self-authorize)으로 refresh token을 발급받습니다.',
    '판매 대상 Marketplace ID와 Seller ID를 확인합니다.',
    'GenieGo [등록]에 refresh_token, client_id, client_secret, marketplace_id, seller_id를 입력해 저장합니다.',
  ],
  ebay: [
    '준비물: eBay 계정이 필요합니다.',
    'developer.ebay.com 에 접속해 개발자 프로그램에 가입합니다.',
    '[Application Keys] 페이지에서 Production 항목의 [Create a keyset]을 누릅니다.',
    '"Your Keyset is currently disabled" 안내가 보이면 링크를 눌러 마켓플레이스 계정 삭제 알림 구독/거부 절차를 완료합니다.',
    '발급된 DevID, AppID, CertID를 확인하고 OAuth 사용자 토큰을 생성합니다.',
    'GenieGo [등록]에 OAuth 액세스 토큰을 입력해 저장합니다.',
  ],
  shopee: [
    '준비물: Shopee 판매자 계정이 필요합니다.',
    'Shopee Open Platform(open.shopee.com)에서 개발자로 등록하고 승인을 기다립니다.',
    '[App Management] > [App List]에서 앱을 만들면 Partner ID와 Partner Key가 발급됩니다.',
    '샵 인가(authorization) 링크를 생성해 판매자 샵을 인가하면 code가 발급됩니다.',
    'code로 access_token을 발급받습니다(access_token은 4시간마다 갱신).',
    'GenieGo [등록]에 partner_id, partner_key, shop_id를 입력해 저장합니다.',
  ],
  lazada: [
    '준비물: Lazada 판매자 계정이 필요합니다.',
    'Lazada Open Platform(open.lazada.com)에 개발자로 등록합니다.',
    '앱을 생성하면 App Key와 App Secret이 발급됩니다.',
    '샵 인가를 진행해 access_token을 발급받습니다.',
    'GenieGo [등록]에 app_key, app_secret을 입력해 저장합니다.',
  ],
  tiktok_shop: [
    '준비물: TikTok Shop 판매자 계정이 필요합니다.',
    'partner.tiktokshop.com (Partner Center)에 개발자로 등록합니다.',
    '[App & Service] > [Create App]으로 앱을 만들고 App Key, App Secret, Service ID를 확인합니다.',
    '앱 설정에서 필요한 API 권한(Shop Authorized Information, Product, Order)을 활성화합니다.',
    '[Get shop authorization]에서 지역(Region)을 선택해 판매자 샵을 인가하면 access_token이 발급됩니다.',
    'GenieGo [등록]에 app_key, app_secret, access_token을 입력해 저장합니다.',
  ],
  etsy: [
    '준비물: Etsy 셀러 계정이 필요합니다.',
    'etsy.com/developers 에 접속해 [Create a New App]을 누릅니다.',
    '앱 정보를 입력하면 API Key(keystring)가 발급됩니다.',
    'OAuth 인가를 거쳐 access token을 발급받습니다.',
    'GenieGo [등록]에 api_key와 shop_id를 입력해 저장합니다.',
  ],
  walmart: [
    '준비물: Walmart 마켓플레이스 셀러 계정이 필요합니다.',
    'Walmart 셀러센터 > Developer Portal에 접속합니다.',
    'API Key(client_id)와 Client Secret을 생성합니다.',
    'GenieGo [등록]에 client_id, client_secret을 입력해 저장합니다.',
  ],
  qoo10: [
    '준비물: Qoo10 판매자(QSM) 계정이 필요합니다.',
    'Qoo10 QSM에 로그인 → API 관리 메뉴로 이동합니다.',
    'API 인증키를 발급받습니다.',
    'GenieGo [등록]에 api_key와 seller_id를 입력해 저장합니다.',
  ],
  rakuten: [
    '준비물: Rakuten 판매자 계정이 필요합니다.',
    'Rakuten 개발자 포털(RMS/Webservice)에 로그인합니다.',
    'Service Secret과 License Key를 발급받습니다.',
    'GenieGo [등록]에 service_secret, license_key, shop_url을 입력해 저장합니다.',
  ],
  shopify: [
    '준비물: Shopify 스토어 관리자 권한이 필요합니다.',
    'Shopify 관리자(Admin) > [설정] > [앱 및 판매 채널]로 이동합니다.',
    '[앱 개발] > [앱 만들기]를 눌러 커스텀 앱을 만듭니다.',
    'Admin API 범위(scope)를 선택하고 앱을 설치합니다.',
    '설치 후 표시되는 Admin API 액세스 토큰을 즉시 복사합니다(한 번만 표시됨).',
    'GenieGo [등록]에 shop_domain(xxx.myshopify.com)과 access_token을 입력해 저장합니다.',
  ],
  woocommerce: [
    '준비물: WordPress/WooCommerce 관리자 권한이 필요합니다.',
    'WooCommerce > [설정] > [고급] > [REST API]로 이동합니다.',
    '[키 추가]를 눌러 설명과 권한(읽기/쓰기)을 선택하고 생성합니다.',
    '발급된 Consumer Key와 Consumer Secret을 복사합니다.',
    'GenieGo [등록]에 site_url, consumer_key, consumer_secret을 입력해 저장합니다.',
  ],
  magento: [
    '준비물: Magento(Adobe Commerce) 관리자 권한이 필요합니다.',
    'Magento 관리자 > [시스템] > [통합(Integration)]으로 이동합니다.',
    '[Add New Integration]으로 통합을 만들고 리소스 권한을 설정합니다.',
    '[Activate]를 눌러 액세스 토큰을 발급받습니다.',
    'GenieGo [등록]에 base_url(스토어 URL)과 access_token을 입력해 저장합니다.',
  ],
  cafe24: [
    '준비물: 카페24 쇼핑몰 운영자 계정이 필요합니다.',
    'developer.cafe24.com 에 접속해 개발자로 등록합니다.',
    '[앱] > [앱 등록]으로 앱을 만들면 Client ID와 Client Secret이 발급됩니다.',
    'OAuth 2.0 인가를 거쳐 access token과 refresh token을 발급받습니다.',
    'GenieGo [등록]에 mall_id, client_id, client_secret, refresh_token을 입력해 저장합니다.',
  ],
  godomall: [
    '준비물: 고도몰(NHN커머스) 쇼핑몰 운영자 계정이 필요합니다.',
    'NHN커머스 개발자센터(devcenter.nhn-commerce.com)에 개발자로 등록하고 승인을 받습니다.',
    '[오픈API] > [키발급 신청]에서 신청폼을 작성해 제출합니다.',
    '발급된 오픈API 키(파트너키/API키)를 확인합니다.',
    'GenieGo [등록]에 partner_key, api_key를 입력해 저장합니다.',
  ],
  inicis: [
    '준비물: KG이니시스 가맹점 계약과 상점관리자 계정이 필요합니다.',
    '이니시스 상점관리자에 로그인합니다.',
    '[상점정보] > [계약정보] > [부가정보]로 이동합니다.',
    'INIAPI Key를 생성하고, [웹결제 signkey 생성]으로 웹표준 사인키도 발급합니다.',
    'GenieGo [등록]에 MID(상점 ID), sign_key, api_key를 입력해 저장합니다.',
  ],
  toss: [
    '준비물: 토스페이먼츠 가맹점 계약이 필요합니다.',
    '토스페이먼츠 상점관리자에 로그인합니다.',
    '좌측 하단 [개발자센터]로 이동합니다.',
    '테스트/라이브를 선택해 클라이언트 키와 시크릿 키를 확인합니다(세트로 사용).',
    'GenieGo [등록]에 client_key, secret_key를 입력해 저장합니다.',
  ],
  kcp: [
    '준비물: NHN KCP 가맹점 계약이 필요합니다.',
    'NHN KCP 가맹점 관리자에 로그인합니다.',
    '사이트코드(site_cd)와 사이트키를 발급/확인합니다.',
    'GenieGo [등록]에 site_cd, site_key를 입력해 저장합니다.',
  ],
  kakaopay: [
    '준비물: 카카오페이 가맹점 계약이 필요합니다.',
    '카카오페이 가맹점/개발자 콘솔에 로그인합니다.',
    '가맹점 코드(CID)와 Admin 키를 발급/확인합니다.',
    'GenieGo [등록]에 cid, admin_key를 입력해 저장합니다.',
  ],
  paypal: [
    '준비물: PayPal 비즈니스 계정이 필요합니다.',
    'developer.paypal.com 에 로그인 → [Apps & Credentials]로 이동합니다.',
    '[Live] 탭에서 [Create App]으로 앱을 만듭니다.',
    '발급된 Client ID와 Secret을 확인합니다.',
    'GenieGo [등록]에 client_id, client_secret을 입력해 저장합니다.',
  ],
  stripe: [
    '준비물: Stripe 계정이 필요합니다.',
    'dashboard.stripe.com 에 로그인합니다.',
    '[개발자(Developers)] > [API 키(API keys)]로 이동합니다.',
    'Publishable key와 Secret key를 확인합니다(라이브 키 사용).',
    'GenieGo [등록]에 publishable_key, secret_key를 입력해 저장합니다.',
  ],
  paddle: [
    '준비물: Paddle 셀러(벤더) 계정이 필요합니다(SaaS·디지털 상품 Merchant of Record).',
    'vendors.paddle.com 에 로그인합니다.',
    '[Developer Tools] > [Authentication]에서 Seller ID와 API 키(Auth Code)를 확인·발급합니다.',
    'GenieGo [등록]에 seller_id, api_key를 입력해 저장합니다.',
  ],
  adyen: [
    '준비물: Adyen 가맹 계약·심사 승인이 필요합니다(엔터프라이즈 글로벌 PG).',
    'ca-live.adyen.com (Customer Area)에 로그인합니다.',
    '[Developers] > [API credentials]에서 API 키(X-API-Key)를 생성하고 Merchant Account명을 확인합니다.',
    'GenieGo [등록]에 api_key, merchant_account를 입력해 저장합니다.',
  ],
  square: [
    '준비물: Square 계정이 필요합니다.',
    'developer.squareup.com/apps 에서 앱을 생성합니다.',
    'Production 탭에서 Access Token을, [Locations]에서 Location ID를 확인합니다.',
    'GenieGo [등록]에 access_token, location_id를 입력해 저장합니다.',
  ],
  braintree: [
    '준비물: Braintree(PayPal) 가맹 계정 승인이 필요합니다.',
    'Control Panel(braintreegateway.com)에 로그인합니다.',
    '[Settings] > [API Keys]에서 Merchant ID·Public Key·Private Key를 확인합니다(Production).',
    'GenieGo [등록]에 merchant_id, public_key, private_key를 입력해 저장합니다.',
  ],
  checkout: [
    '준비물: Checkout.com 가맹 계약·심사 승인이 필요합니다.',
    'dashboard.checkout.com 에 로그인합니다.',
    '[Developers] > [Keys]에서 Secret Key(sk_)와 Public Key(pk_)를 확인합니다(Live).',
    'GenieGo [등록]에 secret_key, public_key를 입력해 저장합니다.',
  ],
  mollie: [
    '준비물: Mollie 계정이 필요합니다(유럽 중심).',
    'my.mollie.com 대시보드 > [Developers] > [API keys]로 이동합니다.',
    'Live API 키(live_로 시작)를 확인합니다.',
    'GenieGo [등록]에 api_key를 입력해 저장합니다.',
  ],
  razorpay: [
    '준비물: Razorpay 계정이 필요합니다(인도 중심).',
    'dashboard.razorpay.com > [Settings] > [API Keys]로 이동합니다.',
    'Live 모드에서 Key ID와 Key Secret을 생성·확인합니다.',
    'GenieGo [등록]에 key_id, key_secret을 입력해 저장합니다.',
  ],
  klarna: [
    '준비물: Klarna 가맹 계약이 필요합니다(BNPL).',
    'Merchant Portal(portal.klarna.com)에 로그인합니다.',
    '[Settings] > [Klarna API credentials]에서 API username·password를 생성하고 리전(eu/na/oc)을 확인합니다.',
    'GenieGo [등록]에 username, password, region을 입력해 저장합니다.',
  ],
  smarttracker: [
    '준비물: 별도 계약 없이 가입만으로 사용 가능한 통합 배송추적 서비스입니다.',
    'tracking.sweettracker.co.kr 에 접속해 가입하고 로그인합니다.',
    't_key(전 택배사 통합 추적 키) 발급을 신청합니다.',
    'GenieGo [등록]에 t_key(api_key)를 입력하면 모든 택배사 배송추적이 연동됩니다.',
  ],
  dhl: [
    '준비물: DHL Express 고객 계정번호가 있으면 좋습니다.',
    'developer.dhl.com 에 접속해 이메일로 가입하고 인증합니다.',
    '로그인 후 [Get Access] 섹션에서 고객 정보를 등록하고 자격증명을 신청합니다.',
    '보통 영업일 다음 날 Test/Production 승인 메일을 받습니다.',
    '포털에서 본인 앱(회사명) > [Show Key]로 API Key와 Secret을 확인합니다.',
    'GenieGo [등록]에 api_key와 account_number(계정번호)를 입력해 저장합니다.',
  ],
  fedex: [
    '준비물: FedEx 계정번호가 필요합니다.',
    'developer.fedex.com 에 가입하고 로그인합니다.',
    '프로젝트를 생성하면 API Key와 Secret Key가 발급됩니다.',
    'GenieGo [등록]에 api_key, api_secret, account_number를 입력해 저장합니다.',
  ],
  ups: [
    '준비물: UPS 계정번호가 필요합니다.',
    'developer.ups.com 에 가입하고 앱을 생성합니다.',
    'client_id와 client_secret을 발급받습니다.',
    'GenieGo [등록]에 client_id, client_secret, account_number를 입력해 저장합니다.',
  ],
  google_analytics: [
    '준비물: GA4 속성 관리 권한이 필요합니다.',
    'Google Analytics(analytics.google.com) > [관리] > [데이터 스트림]으로 이동합니다.',
    '웹 스트림을 선택해 측정 ID(G-로 시작)를 확인합니다.',
    '같은 화면에서 [Measurement Protocol API secret]을 생성합니다.',
    'GenieGo [등록]에 measurement_id, api_secret을 입력해 저장합니다.',
  ],
  slack: [
    '준비물: Slack 워크스페이스 관리 권한이 필요합니다.',
    'api.slack.com/apps 에서 [Create New App]을 누릅니다.',
    '[Incoming Webhooks]를 활성화하고 [Add New Webhook to Workspace]를 누릅니다.',
    '채널을 선택하면 Webhook URL이 생성됩니다.',
    'GenieGo [등록]에 webhook_url을 입력해 저장합니다.',
  ],
};

/* 번역 모듈(언어별) — 15개국 현지 자연어. ISSUANCE_GUIDE_I18N[lang][channel] = [steps] */
export const ISSUANCE_GUIDE_I18N = {
  ko: ISSUANCE_GUIDE_KO,
  en, ja, zh, 'zh-TW': zhTW, de, th, vi, id, ar, es, fr, hi, pt, ru,
};

/* 채널·언어별 가이드 조회. lang 미존재 시 en → ko 폴백. */
export function getIssuanceGuide(channelKey, lang) {
  if (!channelKey) return null;
  const tbl = ISSUANCE_GUIDE_I18N[lang];
  if (tbl && Array.isArray(tbl[channelKey]) && tbl[channelKey].length) return tbl[channelKey];
  const en = ISSUANCE_GUIDE_I18N.en;
  if (en && Array.isArray(en[channelKey]) && en[channelKey].length) return en[channelKey];
  return ISSUANCE_GUIDE_KO[channelKey] || null;
}
