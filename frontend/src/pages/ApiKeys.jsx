import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from '../i18n';
import { getJsonAuth, postJson, delJson } from '../services/apiClient.js';
import { IS_DEMO } from '../utils/demoEnv';
import { handlePlanLimit } from '../utils/planLimit.js';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { getIssuanceGuide } from '../data/issuanceGuide.js';
import CompanyProfileModal from '../components/CompanyProfileModal.jsx';
import { profileMissing } from '../utils/profileComplete.js';
import { tChannelName } from '../utils/tenantStorage.js';

/* [현 차수 S-4] 크로스탭 동기화 발신자 — 자격증명 등록/삭제 시 genie_connector_sync 에 발신.
 *   기존엔 PnL/PerformanceHub/Writeback/PriceOpt/Approvals/DataProduct/AIInsights 7개 페이지가 이 채널의
 *   CHANNEL_REGISTERED/REMOVED 를 구독(수신)만 하고 발신자가 0개라 크로스탭 즉시반영이 죽어 있었다.
 *   동일탭은 refreshConnectorSync()+genie:data-refresh 로 반영되나, 다른 탭(같은 tenant 팀원/멀티탭)은
 *   자기 30초 폴링 전까지 미반영. 발신자 배선으로 죽은 크로스탭 경로 복구(수신자는 이미 존재). */
function publishConnectorSync(type, channelKey) {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel(tChannelName('genie_connector_sync'));
    bc.postMessage({ type, channel: channelKey || null, ts: Date.now() });
    bc.close();
  } catch { /* BroadcastChannel 미지원 환경 무음 */ }
}

/* ═══════════════════════════════════════════════════════════════════
   177차 §4.E TOP 1 본체 + U-177-A: ApiKeys.jsx 실제 ChannelCreds 관리 UI
   • Production: 실 backend /v423/creds + /v423/connectors wire-up
   • Demo: empty list + 시뮬레이션 fallback
   • 절대 cross-contaminate 금지 (운영 → demo 데이터 노출 X)
   ═══════════════════════════════════════════════════════════════════ */
const _IS_DEMO_ENV = IS_DEMO; // 180차: broad includes('demo') 제거 → demoEnv 정본 격리

/* 채널 마스터 — SmartConnect 와 동일 (단순화) */
const CHANNELS = [
  { key: 'meta_ads',         name: 'Meta Ads',          icon: '📘', color: '#1877F2', group: 'global_ad' },
  { key: 'google_ads',       name: 'Google Ads',        icon: '🔵', color: '#4285F4', group: 'global_ad' },
  { key: 'tiktok_business',  name: 'TikTok Business',   icon: '🎶', color: '#010101', group: 'global_ad' },
  // [232차] LINE Ads — JP/TW/TH 핵심 광고매체. 메시징 'line'(아래 own_etc)과 별개 채널.
  { key: 'line_ads',         name: 'LINE Ads',          icon: '💚', color: '#06C755', group: 'global_ad' },
  // [240차] 커넥터 확장 — 신규 광고 데이터소스 실 ingest 어댑터(Connectors::fetch*Rows). REAL_ADAPTER 편입.
  { key: 'snapchat_ads',     name: 'Snapchat Ads',      icon: '👻', color: '#FFFC00', group: 'global_ad' },
  { key: 'linkedin_ads',     name: 'LinkedIn Ads',      icon: '💼', color: '#0A66C2', group: 'global_ad' },
  { key: 'criteo',           name: 'Criteo',            icon: '🟧', color: '#F47521', group: 'global_ad' },
  { key: 'pinterest_ads',    name: 'Pinterest Ads',     icon: '📌', color: '#E60023', group: 'global_ad' },
  // [R-P3-7] 네이티브 광고(콘텐츠 디스커버리) 실 ingest 어댑터 — 자격증명 등록 시 즉시 자동수집.
  { key: 'taboola',          name: 'Taboola',           icon: '🟦', color: '#0480D4', group: 'global_ad' },
  { key: 'outbrain',         name: 'Outbrain',          icon: '🟠', color: '#EE6513', group: 'global_ad' },
  // [240차] 로드맵 → 실 어댑터 승격(Amazon/Microsoft/X Ads). 항목은 아래 로드맵 블록에 정의됨(중복 제거).
  { key: 'microsoft_ads',    name: 'Microsoft Ads (Bing)', icon: '🪟', color: '#00A4EF', group: 'global_ad' },
  { key: 'x_ads',            name: 'X (Twitter) Ads',   icon: '✖️', color: '#000000', group: 'global_ad' },
  { key: 'amazon_ads',       name: 'Amazon Ads',        icon: '📦', color: '#FF9900', group: 'global_ad' },
  // [240차 ⑧-B] 리프라이서 라이브 경쟁가 수집용 — Naver 쇼핑 검색 API(최저가). 연동허브 등록 즉시 경쟁가 자동수집 가능.
  { key: 'naver_shopping',   name: 'Naver 쇼핑 API (경쟁가)', icon: '🟢', color: '#03C75A', group: 'own_etc' },
  // [현 차수] tiktok_shop 실 어댑터(ChannelSync v202309 HMAC+shop_cipher)는 존재했으나 자격증명 등록 UI 진입점이 없었음 → 추가
  { key: 'tiktok_shop',      name: 'TikTok Shop',       icon: '🛍️', color: '#FE2C55', group: 'global_commerce' },
  { key: 'amazon_spapi',     name: 'Amazon SP-API',     icon: '📦', color: '#FF9900', group: 'global_commerce' },
  { key: 'ebay',             name: 'eBay Seller Hub',   icon: '🛍️', color: '#E53238', group: 'global_commerce' },
  { key: 'etsy',             name: 'Etsy',              icon: '🧶', color: '#F1641E', group: 'global_commerce' },
  { key: 'walmart',          name: 'Walmart Marketplace',icon: '🏪', color: '#0071DC', group: 'global_commerce' },
  { key: 'shopee',           name: 'Shopee',            icon: '🦐', color: '#EE4D2D', group: 'global_commerce' },
  { key: 'lazada',           name: 'Lazada',            icon: '🛒', color: '#0F146D', group: 'global_commerce' },
  { key: 'rakuten',          name: 'Rakuten',           icon: '🛒', color: '#BF0000', group: 'global_commerce' },
  { key: 'qoo10',            name: 'Qoo10',             icon: '🟡', color: '#FF6B00', group: 'global_commerce' },
  // [229차] Yahoo! Japan(JP 마켓/오픈API) — 신규
  { key: 'yahoo_japan',      name: 'Yahoo! Japan',      icon: '🟣', color: '#FF0033', group: 'global_commerce' },
  // ── 자사몰 플랫폼(D2C) ──
  { key: 'shopify',          name: 'Shopify',           icon: '🛍', color: '#96BF48', group: 'd2c' },
  { key: 'woocommerce',      name: 'WooCommerce',       icon: '🟣', color: '#96588A', group: 'd2c' },
  { key: 'magento',          name: 'Magento (Adobe Commerce)', icon: '🟧', color: '#EE672F', group: 'd2c' },
  { key: 'cafe24',           name: 'Cafe24',            icon: '☕', color: '#0078FF', group: 'd2c' },
  { key: 'godomall',         name: '고도몰 (godomall)',  icon: '🏯', color: '#1C7ED6', group: 'd2c' },
  // ── SNS 라이브 채널(라이브 커머스 멀티송출) ──
  { key: 'youtube',          name: 'YouTube Live',      icon: '▶️', color: '#FF0000', group: 'sns_live' },
  { key: 'instagram',        name: 'Instagram Live',    icon: '📷', color: '#E1306C', group: 'sns_live' },
  { key: 'facebook',         name: 'Facebook Live',     icon: '👍', color: '#1877F2', group: 'sns_live' },
  { key: 'twitch',           name: 'Twitch',            icon: '🎮', color: '#9146FF', group: 'sns_live' },
  // [현 차수] 그립(Grip) — 국내 대표 라이브 커머스 플랫폼. 파트너 API 키 발급·등록 지원(연동허브).
  { key: 'grip',             name: '그립 (Grip)',        icon: '🛍️', color: '#FF4B4B', group: 'sns_live' },
  { key: 'coupang',          name: 'Coupang Wing',      icon: '🛒', color: '#C02525', group: 'domestic' },
  { key: 'naver_smartstore', name: 'Naver Smart Store', icon: '🟢', color: '#03C75A', group: 'domestic' },
  { key: 'naver_sa',         name: 'Naver Search Ads',  icon: '🟩', color: '#03C75A', group: 'domestic' },
  { key: 'kakao_moment',     name: 'Kakao Moment',      icon: '💛', color: '#FEE500', group: 'domestic' },
  { key: 'st11',             name: '11Street (11번가)',  icon: '🔶', color: '#FA3E2C', group: 'domestic' },
  { key: 'gmarket',          name: 'Gmarket (G마켓)',    icon: '🟡', color: '#0099CC', group: 'domestic' },
  { key: 'auction',          name: 'Auction (옥션)',     icon: '🅰️', color: '#CC0000', group: 'domestic' },
  // [229차] 롯데온 — 백엔드 lotteonFetch/lotteonWrite 실어댑터(api_key+seller_id) 존재하나 등록 UI 부재였음 → 추가
  { key: 'lotteon',          name: '롯데온 (LOTTE ON)',  icon: '🛒', color: '#ED1C24', group: 'domestic' },
  // ── 물류 및 배송(지니고 당일배송) ──
  { key: 'cj',               name: 'CJ대한통운',         icon: '🚛', color: '#7A3A96', group: 'logistics' },
  { key: 'lotte',            name: '롯데글로벌로지스',   icon: '🚚', color: '#DA291C', group: 'logistics' },
  { key: 'hanjin',           name: '한진택배',           icon: '📦', color: '#0067AC', group: 'logistics' },
  { key: 'logen',            name: '로젠택배',           icon: '🚐', color: '#F37021', group: 'logistics' },
  { key: 'epost',            name: '우체국택배',         icon: '📮', color: '#D80027', group: 'logistics' },
  { key: 'smarttracker',     name: '스마트택배(통합 추적)', icon: '📦', color: '#0EA5E9', group: 'logistics' },
  { key: 'ocl_sameday',      name: '지니고 당일배송 ★',  icon: '⚡', color: '#16A34A', group: 'logistics' },
  { key: 'fulfillment',      name: '풀필먼트(3PL)',      icon: '🏭', color: '#0891B2', group: 'logistics' },
  // ── 국제특송 (International Express) ──
  { key: 'dhl',              name: 'DHL Express',        icon: '✈️', color: '#D40511', group: 'global_express' },
  { key: 'fedex',            name: 'FedEx',              icon: '📮', color: '#4D148C', group: 'global_express' },
  { key: 'ups',              name: 'UPS',                icon: '🟤', color: '#351C15', group: 'global_express' },
  { key: 'ems',              name: 'EMS (우체국 국제특송)', icon: '📯', color: '#D80027', group: 'global_express' },
  { key: 'tnt',              name: 'TNT Express',        icon: '🧡', color: '#FF6600', group: 'global_express' },
  { key: 'cj_intl',          name: 'CJ대한통운 국제특송', icon: '🌐', color: '#7A3A96', group: 'global_express' },
  // ── 결제 게이트웨이 (PG) — 내 커머스/라이브의 결제 수단 ──
  { key: 'inicis',           name: 'KG이니시스',         icon: '💳', color: '#E2231A', group: 'payment' },
  { key: 'toss',             name: '토스페이먼츠',       icon: '🟦', color: '#0064FF', group: 'payment' },
  { key: 'kcp',              name: 'NHN KCP',            icon: '💳', color: '#00A0E9', group: 'payment' },
  { key: 'kakaopay',         name: '카카오페이',         icon: '💛', color: '#FFCD00', group: 'payment' },
  { key: 'naverpay',         name: '네이버페이',         icon: '🟢', color: '#03C75A', group: 'payment' },
  { key: 'paypal',           name: 'PayPal',             icon: '🅿️', color: '#003087', group: 'payment' },
  { key: 'stripe',           name: 'Stripe',             icon: '💜', color: '#635BFF', group: 'payment' },
  // [228차] 글로벌 결제 전문 PG — 가장 많이 쓰이는 플랫폼(SaaS·엔터프라이즈·BNPL·신흥시장)
  { key: 'paddle',           name: 'Paddle',             icon: '🏓', color: '#0E0E2C', group: 'payment' },
  { key: 'adyen',            name: 'Adyen',              icon: '💚', color: '#0ABF53', group: 'payment' },
  { key: 'square',           name: 'Square',             icon: '⬛', color: '#1A1A1A', group: 'payment' },
  { key: 'braintree',        name: 'Braintree',          icon: '🌳', color: '#1B6CFF', group: 'payment' },
  { key: 'checkout',         name: 'Checkout.com',       icon: '✳️', color: '#0B7AFF', group: 'payment' },
  { key: 'mollie',           name: 'Mollie',             icon: '💙', color: '#0077FF', group: 'payment' },
  { key: 'razorpay',         name: 'Razorpay',           icon: '🔷', color: '#3395FF', group: 'payment' },
  { key: 'klarna',           name: 'Klarna',             icon: '🛍️', color: '#FFB3C7', group: 'payment' },
  { key: 'ga4',              name: 'Google Analytics 4',icon: '📊', color: '#E37400', group: 'own_etc' },
  { key: 'slack',            name: 'Slack Webhook',     icon: '💬', color: '#4A154B', group: 'own_etc' },
  // [229차] 메시징 채널(알림/메시지) — 신규
  { key: 'kakao_alimtalk',   name: '카카오 알림톡',      icon: '💛', color: '#FEE500', group: 'own_etc' },
  { key: 'line',             name: 'LINE',              icon: '💬', color: '#06C755', group: 'own_etc' },
  // [255차 갭4] Email/WhatsApp 메시징 — 발급허브 discoverability. 등록은 전용 페이지(actual settings 테이블에 저장)로
  //   라우팅(managedPage) → 일반 ConnectModal 의 channel_credential 저장과 분리(실발송 경로 정합·중복 등록 방지).
  { key: 'email',            name: '이메일 발송(SMTP/SES)', icon: '✉️', color: '#0EA5E9', group: 'own_etc', managedPage: '/email-marketing' },
  { key: 'whatsapp',         name: 'WhatsApp Business',  icon: '🟢', color: '#25D366', group: 'own_etc', managedPage: '/whatsapp' },
];

/* 그룹 라벨/정렬 — 208차: 카테고리별 헤더로 가독성 초고도화 */
const GROUP_LABELS = {
  sns_live: 'SNS 라이브 채널', domestic: '국내 오픈마켓', global_commerce: '글로벌 마켓플레이스',
  d2c: '자사몰 플랫폼 (D2C)', payment: '결제 게이트웨이 (PG)', logistics: '물류 및 배송 (지니고 당일배송)', global_express: '국제특송 (International Express)',
  global_ad: '광고 매체',
  // [251차] 전문 인바운드 채널 분리(기존 '분석·기타' 뭉침 해소) — sync_kind 기준 정확 분류.
  web_analytics: '웹 분석 · 측정', esp: '이메일 · SMS (ESP)', support: '고객지원 (CS · 헬프데스크)', review: '리뷰 · 평판',
  own_etc: '분석 · 기타',
};
const GROUP_ORDER = ['sns_live', 'domestic', 'global_commerce', 'd2c', 'payment', 'logistics', 'global_express', 'global_ad', 'web_analytics', 'esp', 'support', 'review', 'own_etc'];
// 저장 직후 즉시 동기화 대상 그룹(커머스) — 자격증명 등록하면 바로 상품/주문 동기화
const COMMERCE_SYNC_GROUPS = ['domestic', 'global_commerce', 'd2c'];

/* 채널별 구조화 자격증명 필드 — 208차: 채널마다 필요한 키(액세스토큰/광고계정/고객ID/광고주ID/Shop도메인 등) 안내 입력 */
const CHANNEL_FIELDS = {
  // SNS 라이브
  youtube:   [{ k: 'api_key', label: 'API 키 (YouTube Data API · client_id/secret 아님)', secret: true }, { k: 'channel_id', label: '채널 ID (UC…)' }],
  instagram: [{ k: 'access_token', label: '액세스 토큰', secret: true }, { k: 'ig_user_id', label: 'IG 비즈니스 계정 ID' }],
  facebook:  [{ k: 'access_token', label: '페이지 액세스 토큰', secret: true }, { k: 'page_id', label: '페이지 ID' }],
  twitch:    [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }, { k: 'login', label: '채널 로그인명 (twitch.tv/ 뒤의 이름)' }],
  // [현 차수] 그립(Grip) 라이브 커머스 — 파트너 API 키 + 셀러/스토어 ID
  grip:      [{ k: 'api_key', label: 'Grip 파트너 API 키', secret: true }, { k: 'seller_id', label: '셀러/스토어 ID (선택)', opt: true }],
  // 국내 오픈마켓
  coupang:   [{ k: 'access_key', label: '액세스 키', secret: true }, { k: 'secret_key', label: '시크릿 키', secret: true }, { k: 'vendor_id', label: '벤더 ID' }],
  naver_smartstore: [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }],
  st11:      [{ k: 'api_key', label: '오픈API 키', secret: true }, { k: 'seller_id', label: '셀러 ID' }],
  gmarket:   [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'seller_id', label: '셀러 ID' }],
  auction:   [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'seller_id', label: '셀러 ID' }],
  lotteon:   [{ k: 'api_key', label: 'OpenAPI 인증키', secret: true }, { k: 'seller_id', label: '판매자(셀러) ID' }],
  // 글로벌 마켓
  amazon_spapi: [{ k: 'refresh_token', label: 'LWA Refresh Token', secret: true }, { k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }, { k: 'marketplace_id', label: 'Marketplace ID (예: ATVPDKIKX0DER=US · A1VC38T7YXB528=JP · A1PA6795UKMFR9=DE)' }, { k: 'seller_id', label: 'Seller ID / Merchant Token (상품등록 필수 · Seller Central > 계정정보)' }],
  ebay:      [{ k: 'access_token', label: 'OAuth 액세스 토큰', secret: true }],
  etsy:      [{ k: 'api_key', label: 'API 키 (keystring · x-api-key)', secret: true }, { k: 'shop_id', label: 'Shop ID' }, { k: 'oauth_token', label: 'OAuth 액세스 토큰 (주문/영수증 수집용 · 선택)', secret: true, opt: true }],
  walmart:   [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }],
  shopee:    [{ k: 'partner_id', label: 'Partner ID' }, { k: 'partner_key', label: 'Partner Key', secret: true }, { k: 'shop_id', label: 'Shop ID' }, { k: 'access_token', label: 'OAuth 액세스 토큰 (파트너 인증 후)', secret: true }],
  lazada:    [{ k: 'app_key', label: 'App Key' }, { k: 'app_secret', label: 'App Secret', secret: true }, { k: 'access_token', label: 'OAuth 액세스 토큰 (인증 후)', secret: true }, { k: 'region', label: '리전 (sg/my/th/id/ph/vn)' }],
  rakuten:   [{ k: 'service_secret', label: 'Service Secret', secret: true }, { k: 'license_key', label: 'License Key', secret: true }, { k: 'shop_url', label: 'Shop URL' }],
  qoo10:     [{ k: 'api_key', label: 'QSM API 키', secret: true }, { k: 'seller_id', label: '셀러 ID' }],
  // [227차] tiktok_shop — 실 어댑터(ChannelSync tiktokFetch v202309 HMAC+shop_cipher)가 요구하는 자격증명.
  //   기존엔 CHANNEL_FIELDS 누락으로 일반 api_key 폴백만 입력돼 등록이 불완전(app_key/app_secret/access_token 미입력)했음.
  tiktok_shop: [{ k: 'app_key', label: 'App Key' }, { k: 'app_secret', label: 'App Secret', secret: true }, { k: 'access_token', label: '액세스 토큰', secret: true }, { k: 'shop_cipher', label: 'Shop Cipher (선택)' }],
  // 자사몰 D2C
  shopify:   [{ k: 'shop_domain', label: 'Shop 도메인 (xxx.myshopify.com)' }, { k: 'access_token', label: 'Admin API 액세스 토큰', secret: true }],
  woocommerce: [{ k: 'site_url', label: '사이트 URL' }, { k: 'consumer_key', label: 'Consumer Key', secret: true }, { k: 'consumer_secret', label: 'Consumer Secret', secret: true }],
  magento:   [{ k: 'base_url', label: '스토어 URL' }, { k: 'access_token', label: 'Integration 토큰', secret: true }],
  cafe24:    [{ k: 'mall_id', label: '몰 ID' }, { k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }, { k: 'refresh_token', label: 'Refresh Token (OAuth2)', secret: true }],
  godomall:  [{ k: 'partner_key', label: '파트너 키', secret: true }, { k: 'api_key', label: 'API 키', secret: true }, { k: 'mall_url', label: '스토어 도메인 (xxx.godomall.com)' }],
  // 물류/배송
  cj:          [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'cust_code', label: '고객(계약) 코드' }],
  lotte:       [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'cust_code', label: '고객(계약) 코드' }],
  hanjin:      [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'cust_code', label: '고객(계약) 코드' }],
  logen:       [{ k: 'api_key', label: '스마트택배 추적 API 키', secret: true }, { k: 'cust_code', label: '고객(계약) 코드' }],
  epost:       [{ k: 'api_key', label: '스마트택배 추적 API 키 (우체국택배)', secret: true }, { k: 'cust_code', label: '계약(고객) 코드' }],
  smarttracker:[{ k: 'api_key', label: '스마트택배 t_key (전 택배사 통합 추적)', secret: true }],
  ocl_sameday: [{ k: 'api_key', label: '지니고 당일배송 API 키', secret: true }, { k: 'merchant_id', label: '머천트 ID' }, { k: 'region', label: '서비스 권역(예: 수도권)' }],
  fulfillment: [{ k: 'api_key', label: '3PL API 키', secret: true }, { k: 'warehouse_id', label: '창고 ID' }],
  // 국제특송
  dhl:       [{ k: 'api_key', label: 'DHL API 키', secret: true }, { k: 'account_number', label: '계정 번호(Account)' }],
  fedex:     [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'api_secret', label: 'API Secret', secret: true }, { k: 'account_number', label: '계정 번호' }],
  ups:       [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }, { k: 'account_number', label: '계정 번호' }],
  ems:       [{ k: 'api_key', label: '우체국 API 키', secret: true }, { k: 'cust_code', label: '고객(계약) 코드' }],
  // [229차] TNT는 FedEx에 인수(2016)되어 FedEx Developer Portal/스킴 사용 → fedex와 동일 자격증명.
  tnt:       [{ k: 'api_key', label: 'API Key (Client ID)', secret: true }, { k: 'api_secret', label: 'API Secret (Client Secret)', secret: true }, { k: 'account_number', label: '계정 번호' }],
  cj_intl:   [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'cust_code', label: '고객(계약) 코드' }],
  // 결제 게이트웨이(PG)
  inicis:    [{ k: 'mid', label: '상점 ID(MID)' }, { k: 'sign_key', label: '사인키(SignKey)', secret: true }, { k: 'api_key', label: 'API 키', secret: true }],
  toss:      [{ k: 'client_key', label: '클라이언트 키' }, { k: 'secret_key', label: '시크릿 키', secret: true }],
  kcp:       [{ k: 'site_cd', label: '사이트 코드' }, { k: 'site_key', label: '사이트 키', secret: true }],
  // [229차] 신 카카오페이 개발자센터(developers.kakaopay.com)는 Secret Key(Authorization: SECRET_KEY)+CID 방식. 구 admin_key(KakaoAK) 폐기.
  kakaopay:  [{ k: 'cid', label: '가맹점 코드(CID)' }, { k: 'secret_key', label: 'Secret Key (Authorization: SECRET_KEY)', secret: true }],
  naverpay:  [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }, { k: 'chain_id', label: 'Chain ID' }],
  paypal:    [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Secret', secret: true }],
  stripe:    [{ k: 'publishable_key', label: 'Publishable Key' }, { k: 'secret_key', label: 'Secret Key', secret: true }],
  // [228차] 글로벌 결제 전문 PG 자격증명
  // [229차] 백엔드 Paddle.php는 Billing v2(api.paddle.com·Bearer) → 단일 API 키(pdl_live_…). 구 Classic(vendor_id+auth_code) 폐기.
  paddle:    [{ k: 'api_key', label: 'API 키 (Billing v2 · Bearer pdl_live_…)', secret: true }],
  adyen:     [{ k: 'api_key', label: 'API 키 (X-API-Key)', secret: true }, { k: 'merchant_account', label: 'Merchant Account' }, { k: 'batch_start', label: '시작 정산배치 번호 (정산 첫 수집용 · CA의 최근 settlement batch 번호)', opt: true }],
  square:    [{ k: 'access_token', label: 'Access Token', secret: true }, { k: 'location_id', label: 'Location ID' }],
  braintree: [{ k: 'merchant_id', label: 'Merchant ID' }, { k: 'public_key', label: 'Public Key' }, { k: 'private_key', label: 'Private Key', secret: true }],
  checkout:  [{ k: 'secret_key', label: 'Secret Key (sk_)', secret: true }, { k: 'public_key', label: 'Public Key (pk_)' }],
  mollie:    [{ k: 'api_key', label: 'Live API 키 (live_)', secret: true }],
  razorpay:  [{ k: 'key_id', label: 'Key ID (rzp_live_)' }, { k: 'key_secret', label: 'Key Secret', secret: true }],
  klarna:    [{ k: 'username', label: 'API Username (MID/PID)' }, { k: 'password', label: 'API Password', secret: true }, { k: 'region', label: '리전 (eu / na / oc)' }],
  // 광고 매체
  meta_ads:  [{ k: 'access_token', label: '액세스 토큰', secret: true }, { k: 'ad_account_id', label: '광고 계정 ID (act_)' }, { k: 'page_id', label: '페이지 ID (광고 소재 게재용)', opt: true }, { k: 'pixel_id', label: '픽셀 ID (서버전환 CAPI·선택)', opt: true }, { k: 'capi_token', label: 'CAPI 토큰 (미입력 시 액세스 토큰 사용·선택)', secret: true, opt: true }],
  google_ads: [{ k: 'developer_token', label: '개발자 토큰', secret: true }, { k: 'access_token', label: '액세스 토큰', secret: true }, { k: 'customer_id', label: '고객 ID (10자리)' }, { k: 'conversion_action', label: '전환 액션 ID (서버전환 업로드·선택)', opt: true }],
  tiktok_business: [{ k: 'access_token', label: '액세스 토큰', secret: true }, { k: 'advertiser_id', label: '광고주 ID' }, { k: 'pixel_code', label: '픽셀 코드 (Events API 서버전환·선택)', opt: true }, { k: 'identity_id', label: '아이덴티티 ID (광고 소재 완성·선택)', opt: true }, { k: 'video_id', label: '영상 소재 ID (선택)', opt: true }, { k: 'image_id', label: '이미지 소재 ID (선택)', opt: true }],
  naver_sa:  [{ k: 'api_key', label: 'API 키', secret: true }, { k: 'api_secret', label: '비밀키', secret: true }, { k: 'customer_id', label: '고객 ID' }],
  kakao_moment: [{ k: 'access_token', label: '액세스 토큰', secret: true }, { k: 'ad_account_id', label: '광고계정 ID' }],
  // [232차] LINE Ads Platform — Ad Manager > Group 페이지에서 발급(access key/secret key) + Group ID. JWS 인증.
  line_ads:  [{ k: 'access_key', label: 'Access Key (Ad Manager > Group)', secret: true }, { k: 'secret_key', label: 'Secret Key', secret: true }, { k: 'group_id', label: 'Group ID (광고 그룹/계정 ID)' }],
  // [240차] 커넥터 확장 — 신규 광고 데이터소스(실 ingest). spend 통화 stamp 위해 currency 입력(미입력 시 USD).
  snapchat_ads: [{ k: 'access_token', label: '액세스 토큰 (Marketing API)', secret: true }, { k: 'ad_account_id', label: '광고계정 ID' }, { k: 'currency', label: '과금 통화 (예: USD · 미입력 시 USD)', opt: true }],
  naver_shopping: [{ k: 'client_id', label: 'Client ID (네이버 개발자센터 검색 API)' }, { k: 'client_secret', label: 'Client Secret', secret: true }], // [240차 ⑧-B] 리프라이서 경쟁가
  linkedin_ads: [{ k: 'access_token', label: '액세스 토큰 (Marketing API)', secret: true }, { k: 'ad_account_id', label: 'Sponsored Account ID (숫자)' }, { k: 'currency', label: '과금 통화 (예: USD · 미입력 시 USD)', opt: true }],
  criteo:    [{ k: 'client_id', label: 'API Client ID' }, { k: 'client_secret', label: 'API Client Secret', secret: true }, { k: 'currency', label: '과금 통화 (예: USD · 미입력 시 USD)', opt: true }],
  pinterest_ads: [{ k: 'access_token', label: '액세스 토큰 (Ads API v5)', secret: true }, { k: 'ad_account_id', label: '광고계정 ID' }, { k: 'currency', label: '과금 통화 (예: USD · 미입력 시 USD)', opt: true }],
  // [240차] 로드맵(연동 예정) — 자격증명 저장은 되나 전용 어댑터 준비 중.
  microsoft_ads: [{ k: 'refresh_token', label: '리프레시 토큰', secret: true }, { k: 'client_id', label: '앱(클라이언트) ID' }, { k: 'client_secret', label: '클라이언트 시크릿', secret: true }, { k: 'developer_token', label: '개발자 토큰', secret: true }, { k: 'customer_id', label: '고객(Customer) ID' }, { k: 'account_id', label: '광고계정 ID' }], // [251차] 백엔드 요구 customer_id·account_id 누락 보강
  x_ads:     [{ k: 'consumer_key', label: 'Consumer Key', secret: true }, { k: 'consumer_secret', label: 'Consumer Secret', secret: true }, { k: 'access_token', label: 'Access Token', secret: true }, { k: 'access_token_secret', label: 'Access Token Secret', secret: true }, { k: 'account_id', label: '광고계정 ID' }],
  amazon_ads: [{ k: 'client_id', label: 'LWA Client ID' }, { k: 'client_secret', label: 'LWA Secret', secret: true }, { k: 'refresh_token', label: 'Refresh Token', secret: true }, { k: 'profile_id', label: '프로필 ID' }],
  // [251차] taboola/outbrain — 기존엔 필드가 레지스트리에서만 와서 로드 실패 시 단일 api_key 로 degrade(연동불가). 하드코딩 보강.
  taboola: [{ k: 'access_token', label: 'Access Token', secret: true }, { k: 'account_id', label: '계정 ID' }, { k: 'currency', label: '통화(선택)' }],
  outbrain: [{ k: 'ob_token', label: 'OB-TOKEN', secret: true }, { k: 'marketer_id', label: 'Marketer ID' }, { k: 'currency', label: '통화(선택)' }],
  // 분석/기타
  ga4: [{ k: 'property_id', label: 'GA4 속성 ID' }, { k: 'service_account_json', label: '서비스 계정 JSON', secret: true }, { k: 'currency', label: '보고 통화(예: KRW·USD, 선택)', opt: true }],
  slack:     [{ k: 'webhook_url', label: 'Webhook URL', secret: true }],
  // [229차] 신규 채널
  yahoo_japan: [{ k: 'client_id', label: 'Client ID' }, { k: 'client_secret', label: 'Client Secret', secret: true }, { k: 'access_token', label: 'OAuth Access Token', secret: true }, { k: 'seller_id', label: '스토어(셀러) ID' }],
  // [255차 갭3] 실제 알림톡 발송(KakaoChannel::callKakaoAPI)은 sender_key + api_key(KakaoAK REST 키)만 사용 →
  //   존재하지 않는 api_secret 요구 제거(가입 차단·혼선 방지). 등록 전용 페이지(KakaoChannel)와 필드 정합.
  kakao_alimtalk: [{ k: 'sender_key', label: '발신 프로필 키 (sender_key)' }, { k: 'api_key', label: 'REST API Key', secret: true }, { k: 'channel_id', label: '카카오 채널 ID' }, { k: 'channel_name', label: '채널명' }],
  line:      [{ k: 'channel_secret', label: 'Channel Secret', secret: true }, { k: 'channel_access_token', label: 'Channel Access Token', secret: true }],
};
const DEFAULT_FIELDS = [{ k: 'api_key', label: 'API 키 / 액세스 토큰', secret: true }];

/* [현 차수 P0] 필드 선택여부 판정 — 명시 opt:true 또는 라벨에 '선택/optional' 포함 시 선택(미입력 허용).
   그 외는 필수. 부분 입력 저장으로 sync 가 무음 실패하는 것을 ConnectModal 에서 사전 차단. */
const isOptionalField = (f) => f?.opt === true || /선택|optional/i.test(String(f?.label || ''));

/* [229차] 채널별 발급 매뉴얼(레이어 팝업·iframe). public/api_manuals/<key>.html 정적 서빙.
   youtube=큐레이트, 나머지=issuanceGuide 단계 기반 생성. 이 집합의 채널만 '📖 발급 매뉴얼' 버튼 노출. */
const MANUAL_KEYS = new Set(['adyen','amazon_spapi','auction','braintree','cafe24','checkout','coupang','dhl','ebay','etsy','fedex','gmarket','godomall','google_ads','ga4','inicis','kakaopay','kcp','klarna','lazada','lotteon','magento','meta_ads','mollie','naver_sa','naver_smartstore','paddle','paypal','qoo10','rakuten','razorpay','shopee','shopify','slack','smarttracker','square','st11','stripe','tiktok_business','tiktok_shop','toss','twitch','ups','walmart','woocommerce','youtube',
  // [229차] Instagram/Facebook(자가발급·큐레이트본 ko) + 안내형(대행사/계약형) 채널 매뉴얼 추가
  'instagram','facebook','kakao_moment','naverpay','cj','lotte','hanjin','logen','epost','ocl_sameday','fulfillment','ems','cj_intl','tnt',
  // [229차] 신규 채널(사용자 큐레이트 매뉴얼)
  'amazon_spapi','yahoo_japan','kakao_alimtalk','line']);
// [229차] 15개국 현지 자연어 매뉴얼 — public/api_manuals/<lang>/<key>.html. 미지원 언어는 en 폴백.
const MANUAL_LANGS = new Set(['ko','en','ja','zh','zh-TW','de','th','vi','id','ar','es','fr','hi','pt','ru']);
const manualUrl = (key, lang) => `/api_manuals/${MANUAL_LANGS.has(lang) ? lang : 'en'}/${key}.html`;

/* ─── [현 차수] 채널별 자격증명 발급 메타 ─────────────────────────────────
   요청2: "자동 등록 가능한 것은 시스템이 발급·등록, 아이디/비번은 사용자가 직접 저장 → 즉시 연동".
   ① OAUTH_PROVIDER: OAuth 2.0 으로 토큰을 자동 발급·자동 저장 가능한 채널(원클릭 연결).
      백엔드 OAuth.php(/v425/oauth/{provider}) 가 code→token 교환 후 channel_credential 에
      자동 암호화 저장하고 ?oauth=success 로 복귀 → 즉시 동기화. (provider: google/meta/facebook/tiktok/kakao/naver)
   ② ISSUANCE_URL: 프로그래매틱 발급 불가, 셀러/개발자 콘솔에서 직접 발급하는 채널 → 콘솔 딥링크 + 붙여넣기.
   ③ 둘 다 없는 채널(계약형 물류 등): 발급 신청(ApplyModal) → 영업/발급 후 자동 연동.
   ※ ID/PW·수동 키 채널은 ConnectModal 로 직접 입력·저장 시 백엔드가 즉시 동기화(ChannelCreds.upsert auto_sync). */
const OAUTH_PROVIDER = {
  meta_ads: 'meta', facebook: 'facebook', instagram: 'facebook',
  google_ads: 'google', ga4: 'google',
  tiktok_business: 'tiktok',
  kakao_moment: 'kakao',
  naver_sa: 'naver', naver_smartstore: 'naver', naverpay: 'naver',
};
/* [227차] OAuth 인가로 자동 발급·저장되는 토큰성 필드 — OAuth 직후 ConnectModal에서 "자동 등록됨"으로 표시.
   회원은 계정 ID 등 잔여 필드만 입력하면 즉시 연동 완료(OAuth 토큰은 백엔드 loadCred 별칭 폴백으로 어댑터가 자동 사용). */
const OAUTH_COVERED_KEYS = new Set(['access_token', 'oauth_access_token', 'refresh_token']);
/* [현 차수] 실 동기화 어댑터(라이브 fetch/ingest)가 구현된 채널 — 백엔드 ChannelCreds.hasRealAdapter 미러.
   이 집합에 없는 채널은 자격증명 저장은 되나 전용 어댑터 미연동(데이터 동기화 X) → 카드에 "연동 예정" 정직 표기. */
const REAL_ADAPTER = new Set([
  'meta_ads', 'google_ads', 'tiktok_business', 'naver_sa', 'kakao_moment', 'line_ads',
  // [240차] 커넥터 확장 — 신규 광고 데이터소스 실 ingest 어댑터(Connectors::fetch*Rows). amazon/microsoft/x_ads 승격(게이트+OAuth 인증취득, 라이브 검증 후 매핑).
  'snapchat_ads', 'linkedin_ads', 'criteo', 'pinterest_ads', 'amazon_ads', 'microsoft_ads', 'x_ads',
  // [현 차수 감사 F-2] 롱테일 광고 5종 — Connectors fetch*Rows 실어댑터 보유에도 set 누락으로 "연동 예정" 거짓 언더클레임이던 결함 해소(F-1 AD_SHORT와 동반).
  'reddit_ads', 'apple_search_ads', 'amazon_dsp', 'quora_ads', 'spotify_ads',
  'taboola', 'outbrain', // [R-P3-7] 네이티브 광고 실어댑터(Connectors::fetchTaboolaRows/fetchOutbrainRows)
  'shopify', 'amazon_spapi', 'coupang', 'naver_smartstore', 'ebay', 'rakuten', 'cafe24', 'tiktok_shop',
  'st11', '11st', 'gmarket', 'auction', 'lotteon', // [현 차수] 국내 오픈마켓 4종 실어댑터(11번가 XML·ESM·롯데온)
  // [232차 Sprint2] 글로벌 커머스 실어댑터 9종(ChannelSync fetch) — 거짓 '데이터 미수집' 사전고지 제거.
  'woocommerce', 'magento', 'walmart', 'etsy', 'shopee', 'lazada', 'qoo10', 'yahoo_japan', 'godomall',

  // [현 차수] v427 물류 배송추적 실어댑터(Logistics.php): 국내 택배(스마트택배 통합) + DHL.
  'epost', 'cj', 'lotte', 'hanjin', 'logen', 'smarttracker', 'dhl',
  // [232차] FedEx/UPS 실 추적(OAuth2) + PG 정산 Klarna/Checkout 추가.
  'fedex', 'ups', 'klarna', 'checkout',
  // [현 차수] v427 PG 정산 실어댑터(PgSettlement.php): Stripe·토스페이먼츠·PayPal.
  'stripe', 'toss', 'paypal',
  // [228차] Adyen 정산 실 수집 어댑터(Settlement Detail Report CSV).
  'adyen',
  // [현 차수] 감사 A-1: PG 4종 REAL_ADAPTER 누락 해소 — PgSettlement.php live=true+fetchLive 실배선됨에도
  //   set 누락으로 "연동 예정" 오표기되던 언더클레임 수정(klarna/checkout와 동일 PG 실어댑터군).
  'paddle', 'square', 'mollie', 'razorpay',
  // [현 차수 감사 P2] 레지스트리 커넥터 16종 — 백엔드 실 자동sync(ChannelCreds::upsert analytics/cs/esp/review + AD_SHORT)
  //   보유에도 REAL_ADAPTER 누락으로 "연동 예정" 거짓 언더클레임이던 결함 해소(245차 F-2와 동일 클래스). 246/248차 배치 누락분.
  'ga4', 'adobe_analytics',                                   // 웹분석 인바운드(fetchGa4Rows/fetchAdobeAnalyticsRows)
  'zendesk', 'intercom', 'freshdesk', 'gorgias',              // CS(syncCsOnSave·CS_SOURCES)
  'mailchimp', 'klaviyo', 'sendgrid',                         // ESP(syncEspOnSave·ESP_SOURCES)
  'trustpilot', 'yotpo', 'google_business',                   // 리뷰(Reviews collectForTenant·REVIEW_CHANNELS)
  'applovin', 'mintegral', 'yandex_ads', 'yahoo_jp_ads',      // 롱테일 광고(AD_SHORT + runSync fetchers)
  // [현 차수] SNS 라이브 채널 통계 동기화(Connectors::syncSnsLiveOnSave) — 등록 즉시 채널 통계(구독자/조회수/팔로워) 수집.
  //   Twitch 는 브로드캐스터 OAuth 스코프 필요로 미편입(honest pending).
  'youtube', 'instagram', 'facebook', 'twitch',               // YouTube Data API / Instagram·Facebook Graph API / Twitch Helix
]);
/* [현 차수] ★연결 테스트가 '실제 발급 검증'(라이브 채널 API 호출로 키 유효성 확인)인 채널 — 백엔드 hasLiveVerify 정합.
   '발급 확인됨' 배지는 이 채널들의 test_status==='ok'(실검증 통과)에만 표기한다(임의 표기 금지).
   저장만 확인하는 soft-ok 채널(amazon/naver/coupang 등)은 '등록됨'으로만 표기. */
const LIVE_VERIFY_CHANNELS = new Set([
  'meta_ads', 'meta', 'tiktok', 'tiktok_business', 'google_ads', 'google', 'kakao', 'kakao_moment', 'youtube',
]);
const ISSUANCE_URL = {
  // 국내 오픈마켓 — [현 차수] 웹 검증(2026-06) 반영: 11번가 오픈API센터/ESM Trading API/네이버 커머스·검색광고 콘솔로 정정
  coupang: 'https://wing.coupang.com', st11: 'https://openapi.11st.co.kr/openapi/OpenApiFrontMain.tmall',
  gmarket: 'https://etapi.gmarket.com', auction: 'https://etapi.gmarket.com',
  naver_smartstore: 'https://apicenter.commerce.naver.com', naver_sa: 'https://manage.searchad.naver.com',
  lotteon: 'https://store.lotteon.com', // [229차] 롯데온 셀러 스토어센터(판매자정보>OpenAPI관리>정보설정>키발급)
  // 글로벌 마켓
  amazon_spapi: 'https://sellercentral.amazon.com/sellingpartner/developerconsole', ebay: 'https://developer.ebay.com/my/keys',
  tiktok_shop: 'https://partner.tiktokshop.com', // [227차] TikTok Shop Partner Center(앱 생성→app_key/secret/token 발급)
  etsy: 'https://www.etsy.com/developers/your-apps', walmart: 'https://developer.walmart.com', shopee: 'https://open.shopee.com',
  // [229차] rakuten: webservice.rakuten.co.jp는 제휴/상품검색 API 포털 — 판매자 RMS 키 발급처가 아님.
  //   어댑터가 api.rms.rakuten.co.jp(ESA 인증) 사용 → RMS(R-Login) 포털로 정정.
  lazada: 'https://open.lazada.com', rakuten: 'https://glogin.rms.rakuten.co.jp', qoo10: 'https://qsm.qoo10.jp',
  // 자사몰 D2C
  shopify: 'https://www.shopify.com/admin/settings/apps', cafe24: 'https://developers.cafe24.com', godomall: 'https://devcenter.nhn-commerce.com', // [229차] godomall: NHN커머스 개발자센터(구 godo.co.kr/api_form.php 폐기)
  woocommerce: 'https://woocommerce.com/document/woocommerce-rest-api/', magento: 'https://developer.adobe.com/commerce/webapi/rest/',
  // 물류 배송추적 — 통합 추적 키(스마트택배) / 우체국
  smarttracker: 'https://tracking.sweettracker.co.kr', epost: 'https://service.epost.go.kr',
  // 국제특송 (개발자 포털 self-serve)
  dhl: 'https://developer.dhl.com', fedex: 'https://developer.fedex.com', ups: 'https://developer.ups.com', tnt: 'https://developer.dhl.com',
  // 결제 게이트웨이(PG)
  inicis: 'https://iniweb.inicis.com', toss: 'https://dashboard.tosspayments.com', kcp: 'https://admin8.kcp.co.kr', // [229차] inicis: 마케팅사이트(www)→상점관리자(iniweb)
  kakaopay: 'https://developers.kakaopay.com', paypal: 'https://developer.paypal.com', stripe: 'https://dashboard.stripe.com/apikeys',
  // [228차] 글로벌 결제 전문 PG 콘솔
  paddle: 'https://vendors.paddle.com', adyen: 'https://ca-live.adyen.com', square: 'https://developer.squareup.com/apps',
  braintree: 'https://www.braintreegateway.com', checkout: 'https://dashboard.checkout.com', mollie: 'https://my.mollie.com/dashboard/developers/api-keys',
  razorpay: 'https://dashboard.razorpay.com/app/keys', klarna: 'https://portal.klarna.com',
  // SNS 라이브 — self-serve 개발자 콘솔(youtube=Google Cloud, twitch=Twitch Dev)
  // [229차] bare /apis/credentials 는 Google 이 브라우저 활성 프로젝트를 임의 자동선택(예: 다른 사용자 프로젝트)
  //   → projectselector2 로 변경해 사용자가 본인 GCP 프로젝트를 직접 선택/생성하도록 강제(잘못된 프로젝트 부착 방지).
  //   여기 발급할 자격증명 = YouTube Data API '키'(api_key) + 채널 ID. client_id/secret(OAuth) 아님.
  youtube: 'https://console.cloud.google.com/projectselector2/apis/credentials',
  twitch: 'https://dev.twitch.tv/console/apps',                 // [227차] Twitch 앱 등록→client_id/secret 발급
  // [240차] 커넥터 확장 — 신규 광고 데이터소스 개발자 콘솔(자격증명 발급처)
  snapchat_ads: 'https://business.snapchat.com', linkedin_ads: 'https://www.linkedin.com/developers/apps',
  naver_shopping: 'https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md',
  criteo: 'https://developers.criteo.com', pinterest_ads: 'https://developers.pinterest.com/apps',
  microsoft_ads: 'https://developers.ads.microsoft.com', x_ads: 'https://developer.twitter.com/en/portal/dashboard',
  amazon_ads: 'https://advertising.amazon.com/API/docs/en-us/index.html',
  // 분석/기타
  slack: 'https://api.slack.com/apps',
  // [229차] 신규 채널 콘솔
  yahoo_japan: 'https://e.developer.yahoo.co.jp/', kakao_alimtalk: 'https://business.kakao.com/', line: 'https://developers.line.biz/console/',
};

/* [현 차수] 채널 계정 "가입(회원/셀러/개발자 등록)" 바로가기 — 발급(ISSUANCE_URL)과 별개로
   "아직 계정이 없는" 이용자가 곧바로 가입하도록 안내. 모든 호스트 DNS 실재 검증(2026-06).
   미정의 채널은 SIGNUP_URL[key] || ISSUANCE_URL[key] 폴백(콘솔에서 가입 겸용). 계약형 물류/PG는 가입 URL 없음(영업 문의). */
const SIGNUP_URL = {
  // 국내 오픈마켓 — 판매자 회원가입
  coupang: 'https://wing.coupang.com', st11: 'https://soffice.11st.co.kr',
  gmarket: 'https://www.esmplus.com', auction: 'https://www.esmplus.com',
  naver_smartstore: 'https://sell.smartstore.naver.com', naver_sa: 'https://searchad.naver.com',
  lotteon: 'https://store.lotteon.com', godomall: 'https://www.nhn-commerce.com',
  // 글로벌 마켓 — 셀러 가입 (shopee/tiktok_shop은 지역별 서브도메인 → ISSUANCE_URL 폴백)
  amazon_spapi: 'https://sell.amazon.com', ebay: 'https://www.ebay.com/sl/sell', etsy: 'https://www.etsy.com/sell',
  walmart: 'https://marketplace.walmart.com', lazada: 'https://www.lazada.com', rakuten: 'https://www.rakuten.co.jp',
  qoo10: 'https://www.qoo10.jp', yahoo_japan: 'https://business.yahoo.co.jp',
  // 자사몰 D2C
  shopify: 'https://www.shopify.com', woocommerce: 'https://woocommerce.com', magento: 'https://business.adobe.com', cafe24: 'https://www.cafe24.com',
  // 광고 매체 — 계정/비즈니스 가입
  meta_ads: 'https://business.facebook.com', google_ads: 'https://ads.google.com', tiktok_business: 'https://ads.tiktok.com',
  ga4: 'https://analytics.google.com', kakao_moment: 'https://business.kakao.com',
  // [240차] 커넥터 확장 — 신규 광고 데이터소스 계정/비즈니스 가입
  snapchat_ads: 'https://forbusiness.snapchat.com', linkedin_ads: 'https://business.linkedin.com/marketing-solutions',
  naver_shopping: 'https://developers.naver.com/apps/#/register',
  criteo: 'https://www.criteo.com', pinterest_ads: 'https://ads.pinterest.com', microsoft_ads: 'https://ads.microsoft.com',
  x_ads: 'https://ads.x.com', amazon_ads: 'https://advertising.amazon.com',
  // 결제 게이트웨이(PG)
  stripe: 'https://dashboard.stripe.com/register', paypal: 'https://www.paypal.com/bizsignup', toss: 'https://www.tosspayments.com',
  inicis: 'https://www.inicis.com', kcp: 'https://www.kcp.co.kr', kakaopay: 'https://biz.kakaopay.com',
  paddle: 'https://www.paddle.com', adyen: 'https://www.adyen.com', square: 'https://squareup.com',
  braintree: 'https://www.braintreepayments.com', checkout: 'https://www.checkout.com', mollie: 'https://www.mollie.com',
  razorpay: 'https://razorpay.com', klarna: 'https://www.klarna.com',
  // 물류 — 통합추적/우체국(자가 가입)
  smarttracker: 'https://tracking.sweettracker.co.kr', epost: 'https://service.epost.go.kr',
  // SNS 라이브 — 계정 가입
  youtube: 'https://accounts.google.com/signup', twitch: 'https://www.twitch.tv/signup',
  instagram: 'https://www.instagram.com', facebook: 'https://www.facebook.com', line: 'https://account.line.biz', slack: 'https://slack.com/get-started',
};
/* 계정 가입 바로가기 — 채널 가입 페이지 우선, 없으면 발급 콘솔(가입 겸용)로 폴백. */
const signupUrl = (key) => SIGNUP_URL[key] || ISSUANCE_URL[key] || '';

/* [현 차수] 요청2: 채널별 "API 키 발급에 필요한 정보" 입력 필드 — 발급 신청 시 해당 채널이 요구하는
   계정/식별 정보를 전부 등록하도록 한다(신청 접수의 완결성). 재사용 라벨로 정의해 15개국 i18n 부담 최소화. */
const APPLY_FIELD_DEFS = {
  account_id:        { i18n: 'ak.afAccountId',        def: '채널 계정 / 판매자 ID' },
  account_email:     { i18n: 'ak.afAccountEmail',     def: '콘솔 로그인 이메일 (해당 채널 계정)' },
  merchant_id:       { i18n: 'ak.afMerchantId',       def: '가맹점 ID (MID)' },
  contract_code:     { i18n: 'ak.afContractCode',     def: '계약 고객 코드' },
  account_number:    { i18n: 'ak.afAccountNumber',    def: '계정 번호 (Account)' },
  site_url:          { i18n: 'ak.afSiteUrl',          def: '스토어 / 사이트 URL' },
  marketplace:       { i18n: 'ak.afMarketplace',      def: '마켓플레이스 (국가/지역)' },
  shop_domain:       { i18n: 'ak.afShopDomain',       def: '스토어 도메인' },
  channel_url:       { i18n: 'ak.afChannelUrl',       def: '채널 / 페이지 URL' },
  store_name:        { i18n: 'ak.afStoreName',        def: '상점명 / 브랜드명' },
  vendor_id:         { i18n: 'ak.afVendorId',         def: '판매자(벤더) 코드' },
  ad_account_id:     { i18n: 'ak.afAdAccountId',      def: '광고 계정 ID' },
  partner_id:        { i18n: 'ak.afPartnerId',        def: '파트너 / 제휴 ID' },
  app_name:          { i18n: 'ak.afAppName',          def: '생성할 앱 이름 (개발자 콘솔)' },
  developer_account: { i18n: 'ak.afDeveloperAccount', def: '개발자 콘솔 계정 (이메일/ID)' },
};
/* [현 차수] ★채널별 "API 키 발급에 필요한 정보"를 전부 등록 — 각 채널이 실제로 발급/연동에 요구하는
   계정·식별 정보를 빠짐없이 입력받아 정상적으로 발급 신청이 되도록 한다(채널별 완결성).
   ※ 여기 항목은 '키를 받기 위해 필요한 식별 정보'(키 자체 X). 결과 키/토큰은 발급 후 [등록]에서 입력. */
const CHANNEL_APPLY_FIELDS = {
  // ── 광고 매체 — 광고계정/콘솔 계정 식별
  meta_ads: ['account_email', 'ad_account_id'], google_ads: ['account_email', 'ad_account_id'], tiktok_business: ['account_email', 'ad_account_id'],
  naver_sa: ['account_id', 'account_email'], kakao_moment: ['account_id', 'ad_account_id'],
  // ── 국내 오픈마켓 — 판매자 계정 식별
  coupang: ['account_id', 'account_email'], naver_smartstore: ['account_id', 'account_email', 'store_name'],
  st11: ['account_id', 'account_email'], gmarket: ['account_id', 'account_email'], auction: ['account_id', 'account_email'],
  lotteon: ['account_id', 'account_email'],
  // ── 글로벌 마켓플레이스 — 판매자/마켓 식별
  amazon_spapi: ['account_id', 'marketplace', 'account_email'], ebay: ['account_id', 'account_email'], qoo10: ['account_id', 'account_email'],
  tiktok_shop: ['account_id', 'store_name', 'account_email'], etsy: ['store_name', 'account_email'], walmart: ['account_id', 'account_email'],
  shopee: ['account_id', 'marketplace', 'account_email'], lazada: ['account_id', 'marketplace', 'account_email'], rakuten: ['account_id', 'site_url'],
  // ── 자사몰 D2C — 스토어 식별 + 개발자 계정
  shopify: ['shop_domain', 'account_email'], cafe24: ['shop_domain', 'account_email'], godomall: ['site_url', 'account_email'],
  woocommerce: ['site_url', 'account_email'], magento: ['site_url', 'account_email'],
  // ── SNS 라이브 — 채널 URL + 콘솔(구글/개발자) 계정
  youtube: ['channel_url', 'developer_account'], instagram: ['channel_url', 'account_email'],
  facebook: ['channel_url', 'account_email'], twitch: ['channel_url', 'developer_account'],
  // ── 결제 게이트웨이(PG) — 가맹점 식별
  inicis: ['merchant_id', 'account_email'], toss: ['merchant_id', 'account_email'], kcp: ['merchant_id', 'account_email'],
  kakaopay: ['merchant_id', 'account_email'], naverpay: ['merchant_id', 'account_email'], paypal: ['merchant_id', 'account_email'], stripe: ['merchant_id', 'account_email'],
  // [228차] 글로벌 결제 전문 PG
  paddle: ['merchant_id', 'account_email'], adyen: ['merchant_id', 'account_email'], square: ['merchant_id', 'account_email'], braintree: ['merchant_id', 'account_email'],
  checkout: ['merchant_id', 'account_email'], mollie: ['merchant_id', 'account_email'], razorpay: ['merchant_id', 'account_email'], klarna: ['merchant_id', 'account_email'],
  // ── 물류/배송 — 계약 식별
  cj: ['contract_code', 'account_email'], lotte: ['contract_code', 'account_email'], hanjin: ['contract_code', 'account_email'],
  logen: ['contract_code', 'account_email'], epost: ['contract_code', 'account_email'], smarttracker: ['account_email'],
  ocl_sameday: ['contract_code', 'merchant_id'], fulfillment: ['contract_code', 'account_email'],
  // ── 국제특송 — 계정번호/계약
  dhl: ['account_number', 'account_email'], fedex: ['account_number', 'account_email'], ups: ['account_number', 'account_email'],
  ems: ['contract_code', 'account_email'], tnt: ['account_number', 'account_email'], cj_intl: ['contract_code', 'account_email'],
  // ── 분석/기타
  ga4: ['account_id', 'account_email'], slack: ['site_url', 'account_email'],
  // [229차] 신규 채널
  yahoo_japan: ['account_id', 'account_email'], kakao_alimtalk: ['channel_url', 'account_email'], line: ['channel_url', 'account_email'],
};
/* 하드코딩에 없는(향후 추가) 채널 기본 발급 정보 — 계정 식별자 + 콘솔 이메일. */
const DEFAULT_APPLY_FIELDS = ['account_id', 'account_email'];

/* [현 차수] ★채널별 발급 제약·안내문 (2026-06 웹 검증 반영) — 신청 모달에 표기해 발급 실패/지연을 사전 예방.
   hard:true = 일반 사용자가 직접 발급 불가하거나 승인/요건이 까다로운 채널(경고 강조). */
const CHANNEL_APPLY_NOTE = {
  // ── 광고 매체
  meta_ads:        { hard: false, note: 'Meta 비즈니스 앱 생성 후 시스템 사용자 토큰 발급. 본인 비즈니스 외 데이터 접근 시 앱 심사(App Review)가 필요합니다.' },
  google_ads:      { hard: false, note: 'Google Ads 관리자(MCC) 계정의 API 센터에서 개발자 토큰 발급(기본 액세스는 Google 심사) + Google Cloud에서 OAuth 클라이언트(client_id·secret) 생성·인증 후 refresh_token 을 획득해 [액세스 토큰] 칸에 입력합니다.' },
  tiktok_business: { hard: false, note: 'developers.tiktok.com에서 앱 생성(app_id/secret). 신규 앱은 샌드박스→운영 전환 시 심사가 필요합니다.' },
  naver_sa:        { hard: false, note: '검색광고 관리도구 > 도구 > [API 사용 관리]에서 신청 → CUSTOMER_ID·액세스라이선스·비밀키가 발급됩니다.' },
  kakao_moment:    { hard: true,  note: '카카오모먼트 오픈API 권한은 카카오 공식 광고대행사에 한해 부여됩니다. 앱을 비즈 앱으로 전환 후 [추가기능 신청]이 필요합니다.' },
  // ── SNS 라이브
  youtube:   { hard: false, note: 'Google Cloud Console에서 YouTube Data API v3 사용 설정 후 [API 키]를 발급해 채널 ID와 함께 등록하세요(공개 라이브/채널 데이터는 API 키로 충분). ★OAuth 클라이언트 ID/비밀번호(client_id·secret)는 이 등록 칸에 넣는 값이 아닙니다 — 라이브 제어 등 쓰기 작업 시에만 사용합니다. 운영팀 대행 발급 불가(자가 발급).' },
  instagram: { hard: false, note: 'Meta 앱 + IG 비즈니스 계정 연결 + 앱 심사가 필요합니다. (자가 발급)' },
  facebook:  { hard: false, note: 'Meta 앱 + 페이지 액세스 토큰 + 앱 심사가 필요합니다. (자가 발급)' },
  twitch:    { hard: false, note: 'dev.twitch.tv 콘솔에서 앱 등록 → client_id/secret을 발급합니다. (자가 발급)' },
  grip:      { hard: false, note: '그립(Grip) 파트너/셀러 센터에서 파트너 API 키를 발급받아 등록하세요. 라이브 커머스 방송·상품·주문 연동에 사용됩니다. (자가 발급 · 그립컴퍼니 파트너 지원 문의)' },
  // ── 국내 오픈마켓
  coupang:          { hard: false, note: 'WING 판매자(사업자 인증) 계정에서 즉시 발급됩니다. 발급 시 회사명·홈페이지 URL·접근 IP(최대 10개)를 입력합니다.' },
  naver_smartstore: { hard: true,  note: '커머스API센터에서 애플리케이션을 등록합니다. 발급은 통합매니저 계정만 가능하며 호출 IP 등록·주기적 인증이 필수입니다.' },
  st11:    { hard: false, note: '11번가 오픈API센터에 셀러 로그인 → 서비스 등록 → 접근 IP 등록 후 API Key가 발급됩니다.' },
  gmarket: { hard: true,  note: 'ESM Trading API는 승인제(거절 가능)입니다. 옥션 판매자ID·G마켓 판매자ID·ESM 마스터ID가 필요합니다.' },
  auction: { hard: true,  note: 'ESM Trading API는 승인제(거절 가능)입니다. 옥션 판매자ID·G마켓 판매자ID·ESM 마스터ID가 필요합니다.' },
  lotteon: { hard: true,  note: '롯데온 입점(사업자 인증) 후 셀러 스토어센터(store.lotteon.com) > 판매자정보 > [OpenAPI관리] > [정보설정]에서 서버 IP를 등록하고 [키발급]으로 OpenAPI 인증키를 발급합니다. 사업자 인증 미완료 시 발급 불가.' },
  // ── 글로벌 마켓플레이스
  amazon_spapi: { hard: true,  note: '프로페셔널 셀러 계정이 필수입니다. Seller Central > 앱 개발에서 개발자 프로필 등록 후 앱을 생성합니다.' },
  ebay:    { hard: false, note: 'developer.ebay.com에서 keyset(DevID/AppID/CertID)을 생성합니다. 운영 keyset은 계정 삭제 알림 구독/거부 절차가 필요합니다.' },
  etsy:    { hard: false, note: 'Etsy 개발자 포털에서 앱 등록 → API 키를 발급합니다.' },
  walmart: { hard: false, note: 'Walmart 마켓플레이스 셀러센터(개발자)에서 client_id/secret을 발급합니다.' },
  shopee:  { hard: false, note: 'Shopee Open Platform 개발자 등록·승인 후 앱 생성 → partner_id/partner_key. 샵 인가가 필요합니다.' },
  lazada:  { hard: false, note: 'Lazada Open Platform에서 앱 등록 → app_key/secret을 발급합니다.' },
  rakuten: { hard: false, note: '판매자(이치바) 키는 RMS R-Login(glogin.rms.rakuten.co.jp) > RMS Web Service에서 serviceSecret·licenseKey를 발급합니다(90일 만료·재발급). ★제휴/상품검색용 webservice.rakuten.co.jp와 다릅니다.' },
  qoo10:   { hard: false, note: 'Qoo10 QSM에서 API 키를 발급합니다.' },
  tiktok_shop: { hard: false, note: 'partner.tiktokshop.com에서 앱 생성(app_key/secret/service_id) → 샵 인가. 운영 전환 시 심사가 필요합니다.' },
  // ── 자사몰 D2C
  shopify:     { hard: false, note: 'Shopify Admin > 설정 > 앱 및 판매채널 > 앱 개발에서 커스텀 앱 생성 → Admin API 토큰을 발급합니다.' },
  woocommerce: { hard: false, note: 'WooCommerce > 설정 > 고급 > REST API에서 Consumer Key/Secret을 발급합니다.' },
  magento:     { hard: false, note: 'Magento 관리자 > 시스템 > 통합(Integration)에서 액세스 토큰을 발급합니다.' },
  cafe24:      { hard: false, note: '카페24 개발자센터에서 개발자 등록 → 앱 등록 → client_id/secret(OAuth 2.0)을 발급합니다.' },
  godomall:    { hard: false, note: 'NHN커머스 개발자센터(devcenter.nhn-commerce.com)에 회원·개발자 등록 후 [오픈API > 키발급 신청]에서 신청합니다.' },
  // ── 결제 게이트웨이(PG) — 가맹점 계약 후 발급
  inicis:   { hard: false, note: '이니시스 상점관리자 > 상점정보 > 계약정보 > 부가정보에서 INIAPI Key·웹표준 사인키를 발급합니다. (가맹점 계약 필요)' },
  toss:     { hard: false, note: '토스페이먼츠 상점관리자 > 개발자센터에서 클라이언트 키·시크릿 키를 확인합니다. (가맹점 계약 필요)' },
  kcp:      { hard: false, note: 'NHN KCP 가맹점 관리자에서 사이트코드·사이트키를 발급합니다. (가맹점 계약 필요)' },
  kakaopay: { hard: false, note: '카카오페이 개발자센터(developers.kakaopay.com)에서 애플리케이션 생성 → Client ID·Secret Key·CID를 발급합니다(인증 헤더 Authorization: SECRET_KEY). 가맹점 계약 필요.' },
  naverpay: { hard: true,  note: '네이버페이 가맹점 가입(계약) 완료 후 파트너ID·Client ID/Secret이 전달됩니다. 일반 자가 발급이 아닙니다.' },
  paypal:   { hard: false, note: 'developer.paypal.com에서 앱 생성 → client_id/secret을 발급합니다.' },
  stripe:   { hard: false, note: 'dashboard.stripe.com > 개발자 > API 키에서 발급합니다.' },
  // [228차] 글로벌 결제 전문 PG
  paddle:   { hard: false, note: 'Paddle은 SaaS·디지털 상품용 Merchant of Record형 결제 플랫폼입니다. Paddle 대시보드 > Developer Tools > Authentication > API keys에서 Billing(v2) API 키(Bearer, pdl_live_…)를 발급합니다(구 Classic vendor_id/auth_code 아님).' },
  adyen:    { hard: true,  note: 'Adyen은 엔터프라이즈 글로벌 PG로 가맹 계약·심사가 필요합니다. 승인 후 Customer Area > Developers > API credentials에서 API 키와 Merchant Account를 발급합니다.' },
  square:   { hard: false, note: 'Square 계정 생성 후 developer.squareup.com > Apps에서 앱 생성 → Access Token·Location ID를 발급합니다. (Production 토큰 사용)' },
  braintree:{ hard: true,  note: 'Braintree(PayPal)는 가맹 계정 승인이 필요합니다. Control Panel > Settings > API Keys에서 Merchant ID·Public/Private Key를 발급합니다.' },
  checkout: { hard: true,  note: 'Checkout.com은 가맹 계약·심사가 필요합니다. 승인 후 Dashboard > Developers > Keys에서 Secret/Public Key(sk_/pk_)를 발급합니다.' },
  mollie:   { hard: false, note: 'Mollie 계정(유럽 중심)에서 Dashboard > Developers > API keys의 Live API 키(live_)를 발급합니다.' },
  razorpay: { hard: false, note: 'Razorpay(인도 중심) Dashboard > Settings > API Keys에서 Key ID·Key Secret을 발급합니다. (Live 모드)' },
  klarna:   { hard: true,  note: 'Klarna(BNPL)는 가맹 계약이 필요합니다. Merchant Portal > Settings > Klarna API credentials에서 API username·password를 발급하고, 리전(eu/na/oc)을 확인합니다.' },
  // ── 물류/배송
  cj:          { hard: true,  note: 'CJ대한통운 계약(고객) 코드가 필요합니다. 국내 통합 배송추적은 스마트택배(스윗트래커) 통합 키로도 가능합니다.' },
  lotte:       { hard: true,  note: '롯데글로벌로지스 계약(고객) 코드가 필요합니다. 통합 추적은 스마트택배 키로도 가능합니다.' },
  hanjin:      { hard: true,  note: '한진택배 계약(고객) 코드가 필요합니다. 통합 추적은 스마트택배 키로도 가능합니다.' },
  logen:       { hard: false, note: '로젠택배는 스마트택배(스윗트래커) 통합 추적 키로 연동됩니다. 이 채널 대신 [스마트택배(통합 추적)] 채널에 t_key 를 등록하세요.' },
  epost:       { hard: false, note: '우체국택배는 스마트택배(스윗트래커) 통합 추적 키로 연동됩니다. 이 채널 대신 [스마트택배(통합 추적)] 채널에 t_key 를 등록하세요.' },
  smarttracker:{ hard: false, note: '스윗트래커(tracking.sweettracker.co.kr)에 가입 후 t_key(전 택배사 통합 추적 키)를 발급합니다.' },
  ocl_sameday: { hard: true,  note: '지니고 당일배송 계약 후 머천트 ID·API 키가 발급됩니다. (운영팀 계약 필요)' },
  fulfillment: { hard: true,  note: '3PL 풀필먼트 계약 후 창고 ID·API 키가 발급됩니다. (운영팀 계약 필요)' },
  // ── 국제특송
  dhl:    { hard: false, note: 'developer.dhl.com에서 가입 → [Get Access]로 고객정보 등록·자격증명 신청(영업일 익일 승인). 계정번호가 필요합니다.' },
  fedex:  { hard: false, note: 'developer.fedex.com에서 프로젝트 생성 → API Key/Secret + 계정번호를 등록합니다.' },
  ups:    { hard: false, note: 'developer.ups.com에서 앱 생성 → client_id/secret + 계정번호를 등록합니다.' },
  ems:    { hard: true,  note: '우체국 국제특송(EMS)은 계약(고객) 코드 기반입니다. (계약 필요)' },
  tnt:    { hard: false, note: 'TNT는 FedEx에 인수되어 FedEx Developer Portal(developer.fedex.com)에서 자격증명(API Key/Secret)을 발급합니다. 별도 TNT 개발자 포털은 없으며 FedEx 계정번호가 필요합니다.' },
  cj_intl:{ hard: true,  note: 'CJ대한통운 국제특송 계약(고객) 코드가 필요합니다. (계약 필요)' },
  // ── 분석/기타
  ga4: { hard: false, note: 'GA4 > 관리 > 속성 설정에서 속성 ID를 확인하고, Google Cloud 서비스 계정 JSON(Analytics Data API 권한 부여)을 등록하면 웹분석 지표가 자동 수집됩니다. (전환 이벤트 송신=Measurement Protocol은 픽셀 페이지에서 설정)' },
  slack:            { hard: false, note: 'api.slack.com/apps에서 앱 생성 → Incoming Webhook URL을 발급합니다.' },
  // [229차] 신규 채널
  yahoo_japan:      { hard: false, note: 'Yahoo!デベロッパー(e.developer.yahoo.co.jp)에서 애플리케이션을 등록해 Client ID·Client Secret을 발급하고, OAuth 2.0 인가로 Access Token을 발급합니다.' },
  kakao_alimtalk:   { hard: true,  note: '카카오톡 채널 비즈니스 인증 + 발신 프로필 검수 + 알림톡 템플릿 승인이 선행되어야 합니다. 발송 대행사/플랫폼(비즈메시지)에서 발신 프로필 키(sender_key)·API Key/Secret을 발급합니다.' },
  line:             { hard: false, note: 'developers.line.biz 콘솔에서 Messaging API 채널 생성 → Channel Secret·Channel Access Token을 발급합니다.' },
};

/* [현 차수] ★발급 "따라하기" — 그대로 따라하면 키를 발급받을 수 있는 단계별 핵심 가이드(2026-06 웹 검증 반영).
   ※ 카카오모먼트는 공식 광고대행사 전용이라 자가 발급 단계를 제공하지 않음(CHANNEL_APPLY_NOTE 안내로 대체). */
const CHANNEL_APPLY_STEPS = {
  meta_ads: [
    'business.facebook.com에서 비즈니스 계정 생성·인증',
    'developers.facebook.com > 내 앱 > [앱 만들기](비즈니스 유형) → Marketing API 추가',
    '비즈니스 설정 > 시스템 사용자 생성 → 광고계정 권한 할당',
    '시스템 사용자 액세스 토큰 생성(ads_read/ads_management) → 토큰 복사',
    '광고계정 ID(act_) 확인 → [등록]에 토큰·ad_account_id 입력',
  ],
  google_ads: [
    'Google Ads 관리자(MCC) 계정 준비',
    'MCC > 도구 > API 센터에서 개발자 토큰 신청(기본 액세스는 Google 심사)',
    'console.cloud.google.com에서 OAuth 동의화면 + OAuth 클라이언트 ID/Secret 생성(scope: adwords)',
    'OAuth 인증으로 refresh token 발급',
    '대상 계정 10자리 customer_id 확인 → [등록]에 개발자토큰·client_id/secret·refresh_token·customer_id 입력',
  ],
  tiktok_business: [
    'developers.tiktok.com 개발자 등록(조직 인증)',
    'My Apps > Create an App → 용도 설명 입력',
    '앱 상세에서 App ID·Secret 확인',
    '광고주 인가 → auth_code로 access_token 교환',
    'advertiser_id 확인 → [등록]에 access_token·advertiser_id 입력',
  ],
  naver_sa: [
    'searchad.naver.com 광고계정 로그인',
    '도구 > [API 사용 관리] → [네이버 검색광고 API 서비스 신청]',
    'CUSTOMER_ID·액세스라이선스·비밀키 확인',
    '[등록]에 api_key(액세스라이선스)·api_secret(비밀키)·customer_id 입력',
  ],
  youtube: [
    'console.cloud.google.com에서 프로젝트 생성(또는 선택)',
    'API 및 서비스 > 라이브러리 → "YouTube Data API v3" 사용 설정',
    '사용자 인증 정보 > [사용자 인증 정보 만들기] → ★[API 키] 선택 → API 키 복사 (공개 라이브/채널 데이터는 API 키면 충분 — OAuth 클라이언트 ID 불필요)',
    '채널 ID 확보: YouTube Studio > 설정 > 채널 > 고급 설정 → 채널 ID(UC…로 시작) 복사',
    '[등록]에 ① API 키 ② 채널 ID 입력 후 저장 (★client_id/secret 아님)',
  ],
  twitch: [
    'dev.twitch.tv/console 로그인 > Applications > [Register Your Application]',
    'OAuth Redirect URL 입력 → 생성',
    'Client ID·Client Secret 확인 → [등록]에 입력',
  ],
  coupang: [
    'WING(wing.coupang.com)에 판매자(사업자 인증) 로그인',
    'OPEN API 메뉴 → Open API Key 발급',
    '회사명·홈페이지 URL·접근 IP(최대 10개) 입력',
    'Access Key·Secret Key·Vendor ID 확인 → [등록]에 입력',
  ],
  naver_smartstore: [
    '통합매니저 계정으로 apicenter.commerce.naver.com 접속',
    '[계정생성] → 개발업체 정보·장애대응 연락처 입력·약관 동의',
    '[내 스토어 애플리케이션] 등록 → 애플리케이션 ID/Secret 발급',
    '호출 IP 등록 + 주기적 애플리케이션 인증',
    '[등록]에 client_id·client_secret 입력',
  ],
  st11: [
    'openapi.11st.co.kr에 셀러 아이디 로그인',
    '[서비스 등록·확인] → 셀러 정보 입력·약관 동의',
    'Seller API 정보 > 접근 가능 서버 IP 등록',
    '발급된 API Key 복사 → [등록]에 api_key·seller_id 입력',
  ],
  gmarket: [
    '옥션·G마켓 각 판매자 회원가입 + ESM Plus 로그인하여 ESM 마스터 ID 생성',
    'etapi.gmarket.com(ESM Trading API)에서 API 사용 신청(승인제)',
    '옥션 판매자ID·G마켓 판매자ID·ESM 마스터ID 제출',
    '승인 후 키 발급 → [등록]에 입력 (거절 가능 시 etapihelp@gmail.com 문의)',
  ],
  auction: [
    '옥션·G마켓 각 판매자 회원가입 + ESM Plus 로그인하여 ESM 마스터 ID 생성',
    'etapi.gmarket.com(ESM Trading API)에서 API 사용 신청(승인제)',
    '옥션 판매자ID·G마켓 판매자ID·ESM 마스터ID 제출',
    '승인 후 키 발급 → [등록]에 입력 (거절 가능 시 etapihelp@gmail.com 문의)',
  ],
  amazon_spapi: [
    '프로페셔널 셀러 계정 준비(개인 계정 불가)',
    'Seller Central > 앱 및 서비스 > 앱 개발(Develop Apps)',
    '개발자 프로필 등록(조직·데이터 사용 정보 제출)',
    '앱 생성 → LWA client_id/secret + refresh token 발급',
    'Marketplace ID·Seller ID 확인 → [등록]에 입력',
  ],
  ebay: [
    'developer.ebay.com 개발자 가입',
    'Application Keys → Production [Create a keyset]',
    '마켓플레이스 계정 삭제 알림 구독/거부 절차 완료(비활성 시)',
    'DevID·AppID·CertID + OAuth 토큰 확인 → [등록]에 입력',
  ],
  shopee: [
    'Shopee Open Platform 개발자 등록·승인',
    'App Management > App List → 앱 생성 → partner_id·partner_key',
    '샵 인가 링크 생성 → 인가 → access_token',
    '[등록]에 partner_id·partner_key·shop_id 입력',
  ],
  lazada: [
    'Lazada Open Platform 개발자 등록',
    '앱 생성 → app_key·app_secret 발급',
    '샵 인가 → access_token → [등록]에 입력',
  ],
  tiktok_shop: [
    'partner.tiktokshop.com 개발자 등록',
    'App & Service > Create App → app_key·app_secret·service_id 확인',
    '필요한 API 권한 활성화(Shop/Product/Order)',
    'Get shop authorization → 샵 인가 → access_token',
    '[등록]에 app_key·app_secret·access_token 입력',
  ],
  etsy: [
    'etsy.com/developers > [Create a New App]',
    '앱 정보 입력 → API Key(keystring) 발급',
    'OAuth 인가 → access token → [등록]에 입력',
  ],
  walmart: [
    'Walmart 마켓플레이스 셀러센터 > Developer Portal',
    'API Key(client_id)·Secret 생성',
    '[등록]에 client_id·client_secret 입력',
  ],
  qoo10: [
    'Qoo10 QSM 로그인 > API 관리',
    'API 인증키 발급 → [등록]에 api_key·seller_id 입력',
  ],
  rakuten: [
    'Rakuten 개발자 포털(RMS/Webservice) 로그인',
    'Service Secret·License Key 발급',
    '[등록]에 service_secret·license_key·shop_url 입력',
  ],
  shopify: [
    'Shopify Admin > 설정 > 앱 및 판매채널 > 앱 개발 > [앱 만들기]',
    'Admin API 범위(scope) 선택 → 앱 설치',
    'Admin API 액세스 토큰 발급(1회 노출 — 즉시 복사)',
    '[등록]에 shop_domain·access_token 입력',
  ],
  woocommerce: [
    'WooCommerce > 설정 > 고급 > REST API > [키 추가]',
    '권한(읽기/쓰기) 선택 → Consumer Key/Secret 발급',
    '[등록]에 site_url·consumer_key·consumer_secret 입력',
  ],
  magento: [
    'Magento 관리자 > 시스템 > 통합(Integration) > Add New Integration',
    '리소스 권한 설정 → Activate → 액세스 토큰 발급',
    '[등록]에 base_url·access_token 입력',
  ],
  cafe24: [
    'developer.cafe24.com 개발자 등록',
    '앱 > 앱 등록 → client_id/secret 발급',
    'OAuth 2.0 인가 → access/refresh token',
    '[등록]에 mall_id·client_id·client_secret·refresh_token 입력',
  ],
  godomall: [
    'NHN커머스 개발자센터(devcenter.nhn-commerce.com) 개발자 등록·승인',
    '오픈API > [키발급 신청] → 신청폼 작성',
    '발급된 오픈API 키 → [등록]에 입력',
  ],
  inicis: [
    '이니시스 가맹점 계약·상점관리자 로그인',
    '상점정보 > 계약정보 > 부가정보',
    'INIAPI Key 생성 + 웹표준 사인키(SignKey) 생성',
    '[등록]에 MID·sign_key·api_key 입력',
  ],
  toss: [
    '토스페이먼츠 가맹점 계약·로그인',
    '상점관리자 좌측 하단 [개발자센터]',
    '클라이언트 키·시크릿 키 확인(테스트/라이브 구분)',
    '[등록]에 client_key·secret_key 입력',
  ],
  kcp: [
    'NHN KCP 가맹점 계약·관리자 로그인',
    '사이트코드(site_cd)·사이트키 발급',
    '[등록]에 site_cd·site_key 입력',
  ],
  kakaopay: [
    '카카오페이 가맹점 계약 + developers.kakaopay.com 개발자센터 가입',
    '애플리케이션 생성 → Client ID·Secret Key·CID 발급(인증 헤더 Authorization: SECRET_KEY)',
    '[등록]에 cid·secret_key 입력',
  ],
  paypal: [
    'developer.paypal.com 로그인 > Apps & Credentials',
    'Live 앱 생성 → client_id/secret 발급',
    '[등록]에 client_id·client_secret 입력',
  ],
  stripe: [
    'dashboard.stripe.com 로그인',
    '개발자 > API 키',
    'Publishable/Secret 키 확인 → [등록]에 입력',
  ],
  smarttracker: [
    'tracking.sweettracker.co.kr 가입·로그인',
    't_key(전 택배사 통합 추적 키) 발급 신청',
    '[등록]에 t_key 입력',
  ],
  dhl: [
    'developer.dhl.com 가입(이메일 인증)',
    '[Get Access] → 고객정보 등록·자격증명 신청',
    '영업일 익일 Test/Production 승인 메일 수신',
    '포털에서 API Key·Secret 확인 → [등록]에 api_key·account_number 입력',
  ],
  fedex: [
    'developer.fedex.com 가입 → 프로젝트 생성',
    'API Key·Secret Key 발급',
    '계정번호 등록 → [등록]에 api_key·api_secret·account_number 입력',
  ],
  ups: [
    'developer.ups.com 가입 → 앱 생성',
    'client_id/secret 발급',
    '계정번호 등록 → [등록]에 client_id·client_secret·account_number 입력',
  ],
  ga4: [
    'GA4 > 관리 > 속성 설정에서 속성 ID 확인',
    'Google Cloud Console > 서비스 계정 생성 → 키(JSON) 발급',
    'GA4 속성에 해당 서비스 계정을 뷰어로 추가(Analytics Data API 권한)',
    '[등록]에 property_id·service_account_json 입력 → 웹분석 지표 자동 수집',
  ],
  slack: [
    'api.slack.com/apps > [Create New App]',
    'Incoming Webhooks 활성화 → [Add New Webhook]',
    'Webhook URL 복사 → [등록]에 입력',
  ],
};

const STATUS_COLORS = {
  ok:    { bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  fg: '#16a34a' },
  error: { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  fg: '#dc2626' },
  pending:{bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.25)', fg: '#ca8a04' },
  none:  { bg: 'rgba(148,163,184,0.10)',border: 'rgba(148,163,184,0.25)',fg: '#64748b' },
};

/* ─── Toast — 운영 UX 보조 (간단 inline) ───────────────────────── */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((type, msg) => {
    setToast({ type, msg, id: Date.now() });
    setTimeout(() => setToast(null), 3200);
  }, []);
  return { toast, show };
}

/* ─── Error Boundary — 잠재 결함 격리 ───────────────────────────── */
function ErrorFallback({ error, onRetry, t }) {
  return (
    <div role="alert" style={{
      padding: '40px 28px', textAlign: 'center', borderRadius: 16,
      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', margin: '20px 0'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#ef4444', marginBottom: 8 }}>
        {t('ak.errorTitle', 'An error occurred')}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', marginBottom: 16,
        padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)',
        fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 500, margin: '0 auto 16px'
      }}>{error?.message || 'Unknown error'}</div>
      <button onClick={onRetry} aria-label={t('ak.retry','Retry')} style={{
        padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12
      }}>🔄 {t('ak.retry','Retry')}</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════ */
export default function ApiKeys() {
  const { t } = useI18n();
  const { user } = useAuth(); // [현 차수] 발급 신청 폼 자동완성용 로그인(구독 회원) 정보
  const { toast, show } = useToast();
  // 자격증명 저장/삭제 직후 전역 연결상태(connectedChannels)를 즉시 재조회 →
  //   Dashboard/PriceOpt/OmniChannel 등이 5분 폴링을 기다리지 않고 바로 반영(stale 윈도우 제거).
  const { refresh: refreshConnectorSync } = useConnectorSync();

  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    t('ak.tabOverview','Overview'),
    t('ak.tabActive','Active Keys'),
    t('ak.tabHistory','Rotation Log'),
    t('ak.tabSettings','Settings'),
    t('ak.tabTracking','배송추적'),
    t('ak.tabPg','정산'),
    t('ak.tabWebhook','실시간 Webhook'),
    t('ak.tabGuide','이용 가이드'),
  ];

  /* state */
  const navigate = useNavigate(); // [255차 갭4] managedPage 채널(email/whatsapp) 전용 등록페이지 라우팅
  const [creds, setCreds]       = useState([]);   // GET /v423/creds
  const [summary, setSummary]   = useState({});   // GET /v423/creds/summary
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(null); // channel object or null
  const [showManual, setShowManual] = useState(null); // [229차] 발급 매뉴얼 레이어 팝업 채널 or null
  const [applyRefresh, setApplyRefresh] = useState(0); // [현 차수] ③ 발급 신청 현황 새로고침 키
  const [applyDone, setApplyDone] = useState(null);    // [현 차수] 발급 신청 완료 확인(영구 모달 — 토스트 놓침 방지)
  const [showConnectModal, setShowConnectModal] = useState(null); // 208차: 채널 구조화 등록 모달
  const [connectPostOauth, setConnectPostOauth] = useState(false); // [227차] OAuth 직후 잔여 계정정보 입력 모드
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // [현 차수] 통합 채널 레지스트리(DB 동적) — 하드코딩에 없는 신규 채널을 등록 UI에 자동 노출.
  const [regChannels, setRegChannels] = useState([]);
  const [regFields, setRegFields] = useState({});
  const loadRegistry = useCallback(() => {
    getJsonAuth('/api/v426/channels').then(r => {
      if (!r?.ok || !Array.isArray(r.channels)) return;
      // 212차 #6: group_type 이 이미 fine 카테고리(8종 프론트 그룹)면 그대로 사용(자동 정확분류),
      //   아니면 coarse(sales/marketing/...) → fine 매핑. admin 추가 채널이 올바른 카테고리 섹션에 자동 배치.
      const G2A = { marketing: 'global_ad', sales: 'domestic', logistics: 'logistics', pg: 'payment', messaging: 'own_etc' };
      const FINE = new Set(GROUP_ORDER); // sns_live/domestic/global_commerce/d2c/payment/logistics/global_express/global_ad/own_etc
      const existing = new Set(CHANNELS.map(c => c.key));
      // [251차] 레지스트리 키 ↔ 하드코딩 키 별칭 — 동일 플랫폼이 키 불일치로 카드 2개로 중복 노출되던 혼란 제거.
      //   (amazon=amazon_spapi · yahoo_jp=yahoo_japan · kakao=kakao_alimtalk · tosspayments=toss). 정규화 후 중복 카드 스킵.
      const REG_ALIAS = { amazon: 'amazon_spapi', yahoo_jp: 'yahoo_japan', kakao: 'kakao_alimtalk', tosspayments: 'toss' };
      // [251차] 전문 인바운드는 sync_kind 로 정확 분류(group_type='marketing' 인 ga4/mailchimp 가 광고매체로 오분류되던 것·
      //   support 가 '분석·기타'로 뭉치던 것 해소). sync_kind 우선 → 없으면 group_type fine/coarse 매핑.
      const SK2G = { analytics: 'web_analytics', cs: 'support', esp: 'esp', review: 'review' };
      const extra = [], ef = {};
      for (const c of r.channels) {
        const canon = REG_ALIAS[c.channel_key] || c.channel_key;
        if (Array.isArray(c.fields) && c.fields.length) ef[c.channel_key] = c.fields.map(f => ({ k: f.k, label: f.label, secret: f.secret !== false }));
        const grp = SK2G[c.sync_kind] || (FINE.has(c.group_type) ? c.group_type : (G2A[c.group_type] || 'own_etc'));
        if (!existing.has(canon)) extra.push({ key: c.channel_key, name: c.name, icon: c.icon || '🔗', color: c.color || '#6366f1', group: grp });
      }
      setRegChannels(extra); setRegFields(ef);
    }).catch(() => {});
  }, []);
  useEffect(() => { loadRegistry(); }, [loadRegistry]);
  const allChannels = useMemo(() => [...CHANNELS, ...regChannels], [regChannels]);
  // 212차 #6: admin 채널 추가 — 카테고리(8종) 선택 모달. 선택 카테고리(fine group)를 레지스트리에 저장 →
  //   loadRegistry pass-through 로 해당 카테고리 섹션에 자동 분류 노출. sync_kind 는 카테고리에서 추론.
  const [showRegAdd, setShowRegAdd] = useState(false);
  const submitRegistryChannel = useCallback(async (form) => {
    const key = String(form.key || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const name = String(form.name || '').trim();
    if (!key || !name) { show('error', '채널 키와 표시명을 입력하세요.'); return; }
    const group = form.group || 'own_etc';
    // [현 차수] 카테고리 → 동기화 종류 추론 완비. 기존엔 커머스/광고 3종만 매핑돼 web_analytics/support/esp/
    //   review/payment/logistics 카테고리로 추가한 채널이 sync_kind='none'(보관전용)로 떨어져 자동수집에
    //   편입되지 못했다(백엔드 ChannelRegistry·isXxxSource 는 대칭 지원). SK2G(위 read-side 역매핑)와 정합되게
    //   forward 매핑을 확장 → admin 이 UI 로 추가한 인바운드 채널도 저장 즉시 자동 sync 대상.
    const GROUP_TO_SYNC = {
      domestic: 'commerce', global_commerce: 'commerce', d2c: 'commerce',
      global_ad: 'ad',
      web_analytics: 'analytics', support: 'cs', esp: 'esp', review: 'review',
      payment: 'pg', logistics: 'logistics', global_express: 'logistics',
    };
    const sync_kind = GROUP_TO_SYNC[group] || 'none'; // sns_live/own_etc = 전용 어댑터 필요 → 보관전용(정직)
    const fields = String(form.fields || 'api_key').split(',').map(s => s.trim()).filter(Boolean).map(k => ({ k, label: k, secret: true }));
    try {
      const r = await postJson('/api/v426/admin/channels', { channel_key: key, name, group_type: group, icon: form.icon || '🔗', color: form.color || '#6366f1', fields, sync_kind, is_active: 1 });
      if (r?.ok) {
        const SK_HINT = { ad: '광고 성과 자동수집', commerce: '주문/정산 자동수집', analytics: '웹분석 자동수집', cs: 'CS 지표 자동수집', esp: '이메일/SMS 자동수집', review: '리뷰 자동수집', pg: '결제 정산 자동수집', logistics: '배송 추적 자동수집' };
        show('success', `채널 추가됨: ${name} → ${GROUP_LABELS[group] || group} · 자격증명 저장 시 ${SK_HINT[sync_kind] || '보관 전용(전용 어댑터 연동 후 수집)'}`);
        setShowRegAdd(false); loadRegistry();
      }
      else show('error', r?.error || '추가 실패(관리자 권한 필요)');
    } catch (e) { show('error', String(e?.message || e)); }
  }, [show, loadRegistry]);

  /* 운영 - 실 backend load; demo - 빈 list */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      if (_IS_DEMO_ENV) {
        // 179차 — 데모 가상 자격증명(체험용, 운영 DB 무저장). 가상으로 API 연동된 상태로 표시해 실제처럼 체험.
        const _d = (h) => new Date(Date.now() - h * 3600000).toISOString();
        const DEMO_CREDS = [
          { id: 'demo-coupang',     channel: 'coupang',          cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(2) },
          { id: 'demo-naver',       channel: 'naver_smartstore', cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(3) },
          { id: 'demo-naversa',     channel: 'naver_sa',         cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(5) },
          { id: 'demo-meta',        channel: 'meta_ads',         cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(1) },
          { id: 'demo-google',      channel: 'google_ads',       cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(4) },
          { id: 'demo-tiktok',      channel: 'tiktok_business',  cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(8) },
          { id: 'demo-kakao',       channel: 'kakao_moment',     cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(6) },
          { id: 'demo-amazon',      channel: 'amazon_spapi',     cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(12) },
          { id: 'demo-ga4',         channel: 'ga4',              cred_type: 'oauth',   is_active: 1, test_status: 'ok',    last_tested_at: _d(7) },
          { id: 'demo-sendgrid',    channel: 'sendgrid',         cred_type: 'api_key', is_active: 1, test_status: 'ok',    last_tested_at: _d(9) },
          { id: 'demo-11st',        channel: 'st11',             cred_type: 'api_key', is_active: 1, test_status: 'error', last_tested_at: _d(20) },
        ];
        const DEMO_SUMMARY = {};
        DEMO_CREDS.forEach(c => { DEMO_SUMMARY[c.channel] = { keyCount: c.channel === 'meta_ads' ? 2 : 1, hasRequired: true, is_active: c.is_active, test_status: c.test_status }; });
        if (!cancelled) { setCreds(DEMO_CREDS); setSummary(DEMO_SUMMARY); setLoading(false); }
        return;
      }
      try {
        const [credsRes, sumRes] = await Promise.all([
          getJsonAuth('/v423/creds'),
          getJsonAuth('/v423/creds/summary'),
        ]);
        if (cancelled) return;
        setCreds(Array.isArray(credsRes?.creds) ? credsRes.creds : []);
        setSummary(sumRes?.channels || {});
      } catch (e) {
        if (!cancelled) setLoadError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadTick]);

  const reload = useCallback(() => setReloadTick(x => x + 1), []);

  /* [228차] 발급 신청 현황 — 개요 카드 표기 + 자동 폴링(실시간 발급상태 반영).
     Google 등은 발급을 플랫폼에 통보하지 않으므로, 사용자가 키를 등록→실검증→자동 완료되는
     상태변화를 수동 새로고침 없이 즉시 반영하기 위해 25초 폴링한다. */
  const [applies, setApplies] = useState([]);
  const loadApplies = useCallback(() => {
    if (_IS_DEMO_ENV) { setApplies([]); return; }
    getJsonAuth('/v423/connectors/apply/list')
      .then(d => setApplies(Array.isArray(d?.applies) ? d.applies : []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadApplies();
    const iv = setInterval(loadApplies, 25000);
    return () => clearInterval(iv);
  }, [loadApplies, applyRefresh, reloadTick]);

  /* KPI 집계 — 실 데이터 기반 */
  const kpis = useMemo(() => {
    const total   = creds.length;
    const active  = creds.filter(c => Number(c.is_active) === 1).length;
    const errored = creds.filter(c => c.test_status === 'error').length;
    const ok      = creds.filter(c => c.test_status === 'ok').length;
    return [
      { emoji: '🔑', label: t('ak.kpiTotal','Total Keys'),        val: total },
      { emoji: '✅', label: t('ak.kpiActive','Active'),            val: active },
      { emoji: '🟢', label: t('ak.kpiOk','Tested OK'),             val: ok },
      { emoji: '🔴', label: t('ak.kpiErrored','Failed Tests'),     val: errored },
    ];
  }, [creds, t]);

  /* ────────────────────────────── handlers */

  // POST /v423/creds — upsert
  const handleSaveCred = useCallback(async (form) => {
    if (_IS_DEMO_ENV) {
      show('info', t('ak.demoLocked','Demo mode — saving disabled'));
      return false;
    }
    try {
      const r = await postJson('/v423/creds', form);
      if (!r?.ok) throw new Error(r?.error || 'save failed');
      show('success', t('ak.saved','Credential saved'));
      reload();
      refreshConnectorSync();
      try { window.dispatchEvent(new Event('genie:data-refresh')); } catch {} // [정밀감사 F] 대시보드 즉시 반영
      return true;
    } catch (e) {
      show('error', String(e?.message || e));
      return false;
    }
  }, [show, t, reload, refreshConnectorSync]);

  /* 208차: 채널 구조화 등록 — 필드별 다중 저장(AdChannelConnect 패턴). 입력한 값만 upsert. */
  const handleConnectSave = useCallback(async (channelKey, channelName, values) => {
    if (_IS_DEMO_ENV) {
      show('info', t('ak.demoLocked','Demo mode — saving disabled'));
      return false;
    }
    const entries = Object.entries(values).filter(([, v]) => String(v || '').trim() !== '');
    if (entries.length === 0) { show('info', t('ak.noInput','입력된 값이 없습니다')); return false; }
    try {
      let saved = 0;
      for (const [k, v] of entries) {
        const r = await postJson('/v423/creds', { channel: channelKey, key_name: k, key_value: String(v).trim(), label: channelName, cred_type: 'api_key' });
        if (r?.ok) saved++;
      }
      show('success', `${channelName}: ${saved}${t('ak.savedSuffix','개 항목 저장됨')}`);
      reload();
      // 208차: 자격증명 등록 즉시 동기화 — 커머스 채널은 저장 직후 sync 트리거.
      //   테넌트는 백엔드 세션(authedTenant)만 사용 → 타 테넌트 계정 유입 구조적 불가.
      if (saved > 0) {
        const ch = CHANNELS.find(c => c.key === channelKey);
        if (ch && COMMERCE_SYNC_GROUPS.includes(ch.group)) {
          try {
            show('info', `${channelName} ${t('ak.syncing','동기화 중...')}`);
            const sr = await postJson(`/api/channel-sync/${encodeURIComponent(channelKey)}/sync`, {});
            // [현 차수] H1: stub(전용 어댑터 미지원) 채널은 "동기화 완료" 거짓양성 대신 "연동 준비중" 정직 표기.
            if (sr?.pending) show('info', `${channelName} ${t('ak.syncPending','저장됨 — 전용 어댑터 연동 준비 중입니다 (정산 CSV 업로드 또는 어댑터 추가 시 동기화)')}`);
            else if (sr?.ok) show('success', `${channelName} ${t('ak.syncDone','동기화 완료')} — ${t('ak.products','상품')} ${sr.product_count ?? 0} · ${t('ak.orders','주문')} ${sr.order_count ?? 0}`);
            else show('info', `${channelName} ${t('ak.syncQueued','저장됨 — 동기화는 자동 폴링으로 반영됩니다')}`);
            reload();
          } catch { /* 저장 성공, 동기화는 cron 폴링이 백업 */ }
        }
        // 212차 #1: 광고매체(AdChannelConnect 흡수) — 자격증명 등록 즉시 성과 ingest 트리거.
        //   /v423/connectors/sync(meta/google/tiktok/naver) → performance_metrics 적재.
        // [현 차수] kakao_moment 추가 — 백엔드 adShortCodes/AD_SHORT 는 kakao 를 포함하나 저장직후 트리거 맵에 누락돼 있었음.
        // [240차] 신규 광고 데이터소스 4종 — 저장직후 ingest 트리거 동기화(백엔드 AD_SHORT 정합). pending 3종은 어댑터 없어 제외.
        const AD_SYNC = { meta_ads: 'meta', google_ads: 'google', tiktok_business: 'tiktok', naver_sa: 'naver', kakao_moment: 'kakao', line_ads: 'line', snapchat_ads: 'snapchat', linkedin_ads: 'linkedin', criteo: 'criteo', pinterest_ads: 'pinterest', amazon_ads: 'amazon_ads', microsoft_ads: 'microsoft_ads', x_ads: 'x_ads' };
        if (AD_SYNC[channelKey]) {
          try {
            show('info', `${channelName} ${t('ak.syncing','동기화 중...')}`);
            const ar = await postJson('/v423/connectors/sync', { channels: AD_SYNC[channelKey] });
            show(ar?.ok ? 'success' : 'info', `${channelName} ${ar?.ok ? t('ak.syncDone','동기화 완료') : t('ak.syncQueued','저장됨 — 동기화는 자동 폴링으로 반영됩니다')}`);
            reload();
          } catch { /* 저장 성공, ingest 는 cron 폴링이 백업 */ }
        }
        // [227차] 동기화가 없는 채널(PG·물류·국제특송 등)도 등록 직후 즉시 검증 피드백 — "바로 진행" 확신.
        //   커머스/광고는 위 동기화가 검증을 겸하므로 제외. test 가 stub/미지원이면 조용히 넘어감.
        if (!(ch && COMMERCE_SYNC_GROUPS.includes(ch.group)) && !AD_SYNC[channelKey]) {
          try {
            const vr = await postJson(`/v423/connectors/${encodeURIComponent(channelKey)}/test`, {});
            if (vr?.ok) show('success', `${channelName} ${t('ak.verifyOk','연결 검증 완료 — 바로 사용할 수 있습니다')}`);
          } catch { /* 저장 성공 우선 — 검증 실패는 무음 */ }
        }
        // 저장+동기화 후 전역 연결상태 즉시 재조회(타 페이지 stale 윈도우 제거).
        refreshConnectorSync();
        try { window.dispatchEvent(new Event('genie:data-refresh')); } catch {} // [정밀감사 F] 대시보드/P&L 즉시 반영(30초 폴링 대기 제거)
        publishConnectorSync('CHANNEL_REGISTERED', channelKey); // [현 차수 S-4] 다른 탭(같은 tenant) 즉시 반영
      }
      return saved > 0;
    } catch (e) {
      // 212차 #3: 채널 한도 초과(402) → 업그레이드 안내 모달.
      if (handlePlanLimit(e)) return false;
      show('error', String(e?.message || e));
      return false;
    }
  }, [show, t, reload, refreshConnectorSync]);

  // DELETE /v423/creds/{id}
  const handleDelete = useCallback(async (id) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked','Demo mode — deletion disabled')); return; }
    if (!window.confirm(t('ak.confirmDelete','Delete this credential?'))) return;
    setDeletingId(id);
    try {
      const base = import.meta.env.VITE_API_BASE || '';
      const tok  = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
      const res = await fetch(`${base}/v423/creds/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tok}`, 'X-Tenant-ID': localStorage.getItem('tenantId') || '' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      show('success', t('ak.deleted','Credential deleted'));
      reload();
      refreshConnectorSync();
      try { window.dispatchEvent(new Event('genie:data-refresh')); } catch {} // [현 차수 P2] 삭제도 저장경로와 대칭 — 채널 해제 시 운영 P&L 서버통계 즉시 갱신
      publishConnectorSync('CHANNEL_REMOVED'); // [현 차수 S-4] 크로스탭 즉시 반영
    } catch (e) {
      show('error', String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  }, [show, t, reload, refreshConnectorSync]);

  // POST /v423/creds/{id}/test
  const handleTest = useCallback(async (id) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked','Demo mode — test disabled')); return; }
    setTestingId(id);
    try {
      const r = await postJson(`/v423/creds/${id}/test`, {});
      const msg = r?.message || (r?.ok ? 'OK' : 'Failed');
      show(r?.ok ? 'success' : 'error', `[${r?.channel || '?'}] ${msg}`);
      reload();
    } catch (e) {
      show('error', String(e?.message || e));
    } finally {
      setTestingId(null);
    }
  }, [show, t, reload]);

  // POST /v423/connectors/{channel}/test — 채널 ping
  const handleChannelTest = useCallback(async (channelKey) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked','Demo mode — channel ping disabled')); return; }
    setTestingId(`ch_${channelKey}`);
    try {
      const r = await postJson(`/v423/connectors/${encodeURIComponent(channelKey)}/test`, {});
      show(r?.ok ? 'success' : 'error', `[${channelKey}] ${r?.message || (r?.ok ? 'OK' : 'Failed')}`);
      reload();
    } catch (e) {
      show('error', String(e?.message || e));
    } finally {
      setTestingId(null);
    }
  }, [show, t, reload]);

  /* ── [현 차수] 요청2: OAuth 원클릭 연결(자동 발급·자동 등록) ──────────────────
     OAuth 가능 채널은 사용자가 키를 수기 입력할 필요 없이 인가만 하면 백엔드가 토큰을
     자동 발급·암호화 저장하고 ?oauth=success 로 복귀 → 즉시 동기화. (관리자 OAuth 앱 설정 필요) */
  const connectOAuth = useCallback(async (provider, channelKey) => {
    if (_IS_DEMO_ENV) { show('info', t('ak.demoLocked', 'Demo mode — saving disabled')); return; }
    try {
      const tok = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
      // [228차] 인가를 시작한 레지스트리 채널키를 백엔드로 전달 → 콜백이 registry 채널 반영·발급신청 완료.
      const r = await fetch(`/api/v425/oauth/${provider}/authorize?channel=${encodeURIComponent(channelKey || '')}`, { headers: { Authorization: `Bearer ${tok}` } });
      const d = await r.json().catch(() => ({}));
      // [227차] OAuth 복귀 후 잔여 계정정보 입력을 자동 안내하기 위해 클릭한 채널을 보관.
      if (d.ok && d.authorize_url) { try { sessionStorage.setItem('gg_oauth_ch', channelKey || ''); } catch {} window.location.href = d.authorize_url; return; }
      // configured=false → 관리자 OAuth 앱 미설정. 수동 등록을 안내(info).
      show(d.configured === false ? 'info' : 'error',
        d.error || t('ak.oauthNotConfigured', '이 채널의 OAuth 자동연결이 아직 설정되지 않았습니다. [등록]으로 키를 직접 입력하세요.'));
    } catch (e) { show('error', String(e?.message || e)); }
  }, [show, t]);

  /* OAuth 콜백 복귀 처리: /integration-hub?oauth=success&provider=X → 토스트 + 즉시 재조회 + URL 정리. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const o = params.get('oauth');
    if (!o) return;
    const prov = (params.get('provider') || '').toUpperCase();
    if (o === 'success') {
      show('success', `${prov ? prov + ' ' : ''}${t('ak.oauthSuccess', 'OAuth 연결 완료 — 자격증명이 자동 등록되고 동기화가 시작됩니다.')}`);
      reload(); refreshConnectorSync();
      // [227차] 발급(OAuth)→자격등록(잔여 계정정보)→즉시 진행: 토큰은 자동 저장됐고, 동기화에 필요한
      //   계정 ID(ad_account_id/customer_id/advertiser_id 등)만 남았으면 입력 모달을 자동으로 띄운다.
      let pendingCh = '';
      try { pendingCh = sessionStorage.getItem('gg_oauth_ch') || ''; sessionStorage.removeItem('gg_oauth_ch'); } catch {}
      const chObj = CHANNELS.find(c => c.key === pendingCh);
      if (chObj) {
        const need = (CHANNEL_FIELDS[chObj.key] || []).some(f => !OAUTH_COVERED_KEYS.has(f.k));
        if (need) { setConnectPostOauth(true); setShowConnectModal(chObj); }
      }
    } else {
      show('error', t('ak.oauthFail', 'OAuth 연결 실패 — 다시 시도하거나 키를 직접 등록하세요.'));
    }
    // 쿼리 제거(새로고침 시 토스트 반복·state 노출 방지)
    try { window.history.replaceState({}, '', window.location.pathname); } catch { /* noop */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // POST /v423/connectors/apply
  const handleApplySubmit = useCallback(async (channelKey, memberInfo) => {
    // [현 차수] 체험 데모 모드: 발급 신청 차단 + 명확한 안내(데모에서는 실제 신청 안 됨).
    if (_IS_DEMO_ENV) { show('info', t('ak.applyDemoBlocked','체험 데모 모드에서는 API 키 발급 신청이 되지 않습니다. 실제 계정으로 로그인 후 신청해 주세요.')); return false; }
    try {
      const r = await postJson('/v423/connectors/apply', {
        channel: channelKey,
        member_name:  memberInfo.name    || '',
        member_email: memberInfo.email   || '',
        business_number: memberInfo.businessNumber || '',
        ceo_name: memberInfo.ceoName || '', // [255차 갭1] 사업자 인증 신청에 필요
        phone:   memberInfo.phone   || '',
        company: memberInfo.company || '',
        address: memberInfo.address || '', // [255차 갭1] 사업장 주소(사업자 인증)
        extra:   memberInfo.extra   || {}, // [현 차수] 채널별 발급 필요 정보(계정/식별)
        requested_at: new Date().toISOString(),
      });
      // 백엔드 데모 차단(이중 방어) — demo 플래그면 안내만 표시(에러 아님).
      if (r?.demo) { show('info', r?.message || t('ak.applyDemoBlocked','체험 데모 모드에서는 API 키 발급 신청이 되지 않습니다. 실제 계정으로 로그인 후 신청해 주세요.')); return false; }
      if (!r?.ok) throw new Error(r?.error || 'apply failed');
      // 발급 신청 접수(서버가 신청자 확인 메일 발송) — 백엔드 message 우선.
      show('success', r?.message || t('ak.applied', { ticket: r?.ticket_id || r?.ticketId || '', defaultValue: `발급 신청 접수됨 (티켓 ${r?.ticket_id || r?.ticketId || ''})` }));
      setShowApplyModal(null);
      setApplyRefresh(k => k + 1); // ③ 발급 신청 현황 즉시 갱신
      // [현 차수] 영구 확인 모달(성공) — 토스트 자동소멸 보완. 티켓·통지여부·다음 절차를 확실히 인지.
      setApplyDone({ ok: true, ticket: r?.ticket_id || r?.ticketId || '', channel: channelKey, notified: !!r?.notified, message: r?.message || '' });
      return true;
    } catch (e) {
      const msg = String(e?.message || e);
      show('error', msg);
      // [현 차수] 영구 확인 모달(실패) — 실패 사실/원인/재시도 안내를 확실히 인지(토스트 자동소멸 보완).
      setApplyDone({ ok: false, channel: channelKey, error: msg });
      return false;
    }
  }, [show, t]);

  /* ────────────────────────────── render */

  if (loadError) return <ErrorFallback error={{ message: loadError }} onRetry={reload} t={t} />;

  return (
    <div style={{ padding: 24, minHeight: '100%', color: 'var(--text-1, #1e293b)' }}>
      {/* Hero */}
      <div style={{
        borderRadius: 18, padding: '28px 32px', marginBottom: 22,
        background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))',
        border: '1px solid rgba(79,142,247,0.12)', backdropFilter: 'blur(16px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 32 }} aria-hidden>🔑</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{t('ak.heroTitle','API Key Manager')}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3, #64748b)', marginTop: 2 }}>
                {t('ak.heroDesc','Manage all channel credentials, run ping tests, and apply for new keys')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={_IS_DEMO_ENV}
              aria-label={t('ak.addBtn','Add new credential')}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: _IS_DEMO_ENV ? 'not-allowed' : 'pointer',
                background: _IS_DEMO_ENV ? 'rgba(148,163,184,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                color: '#fff', fontWeight: 700, fontSize: 12, opacity: _IS_DEMO_ENV ? 0.6 : 1
              }}>➕ {t('ak.addBtn','Add Key')}</button>
            <button onClick={reload} aria-label={t('ak.reload','Reload')} style={{
              padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(79,142,247,0.25)', cursor: 'pointer',
              background: 'rgba(79,142,247,0.05)', color: 'var(--text-2)', fontWeight: 600, fontSize: 12
            }}>🔄 {t('ak.reload','Reload')}</button>
          </div>
        </div>

        {_IS_DEMO_ENV && (
          <div role="status" style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)',
            fontSize: 11, color: '#ca8a04', fontWeight: 600
          }}>
            ⚠️ {t('ak.demoBanner','Demo mode — credentials are not persisted to production database')}
          </div>
        )}
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            borderRadius: 14, padding: '18px 20px',
            background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)'
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }} aria-hidden>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{loading ? '…' : k.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div role="tablist" style={{
        display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12,
        background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)'
      }}>
        {tabs.map((tab, i) => (
          <button key={i} role="tab" aria-selected={activeTab === i} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12, transition: 'all 0.2s',
            background: activeTab === i ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
            color: activeTab === i ? '#fff' : 'var(--text-2)'
          }}>{tab}</button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 0 && !_IS_DEMO_ENV && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={() => setShowRegAdd(true)} title={t('ak.regAddChannelTitle','관리자: 새 채널을 레지스트리에 추가 (코드 수정 불필요, 카테고리 자동 분류·즉시 등록 UI 반영)')}
            style={{ padding: '6px 13px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            + {t('ak.regAddChannelBtn','채널 추가 (관리자)')}
          </button>
        </div>
      )}
      {activeTab === 0 && (
        <OverviewTab
          channels={allChannels}
          summary={summary}
          creds={creds}
          applies={applies}
          loading={loading}
          onChannelTest={handleChannelTest}
          onConnect={(ch) => { if (ch?.managedPage) { navigate(ch.managedPage); return; } setShowConnectModal(ch); }}
          onApply={(ch) => { if (ch?.managedPage) { navigate(ch.managedPage); return; } setShowApplyModal(ch); }}
          onOAuth={connectOAuth}
          onManual={(ch) => setShowManual(ch)}
          testingId={testingId}
          t={t}
        />
      )}
      {(activeTab === 0 || activeTab === 1) && !_IS_DEMO_ENV && <ApplyStatusPanel applies={applies} onRefresh={loadApplies} t={t} />}
      {activeTab === 1 && (
        <ActiveKeysTab
          creds={creds}
          channels={allChannels}
          loading={loading}
          onTest={handleTest}
          onDelete={handleDelete}
          onAddClick={() => setShowAddModal(true)}
          testingId={testingId}
          deletingId={deletingId}
          t={t}
        />
      )}
      {activeTab === 2 && (<HistoryTab creds={creds} loading={loading} t={t} />)}
      {activeTab === 3 && (<SettingsTab t={t} />)}
      {activeTab === 4 && (<TrackingTab t={t} show={show} />)}
      {activeTab === 5 && (<SettlementTab t={t} show={show} />)}
      {activeTab === 6 && (<WebhookTab t={t} show={show} />)}
      {activeTab === 7 && (() => {
        // 184차 #5: enterprise 패턴 렌더러(CRM/OmniChannel/PriceOpt/Kakao/Email/CampaignMgr/JourneyBuilder 정본 동일, NS=ak).
        const g = (k) => { const v = t('ak.' + k, ''); return (v && !String(v).includes('ak.')) ? v : ''; };
        const COLORS = ['#4f8ef7','#22c55e','#a855f7','#f59e0b','#06b6d4','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48'];
        const ICONS = ['🔗','🪪','🔌','🔑','🧪','✅','🔄','📊','🛡️','📜','⚙️','🔐'];
        const steps = []; for (let i = 1; i <= 12; i++) { const title = g('guideStep' + i + 'Title'); if (title) steps.push({ title, desc: g('guideStep' + i + 'Desc'), phase: g('guideStep' + i + 'Phase'), icon: ICONS[(i - 1) % ICONS.length], color: COLORS[(i - 1) % COLORS.length], n: i }); }
        const tips = []; for (let i = 1; i <= 10; i++) { const tip = g('guideTip' + i); if (tip) tips.push(tip); }
        const faqs = []; for (let i = 1; i <= 8; i++) { const q = g('guideFaq' + i + 'Q'); if (q) faqs.push({ q, a: g('guideFaq' + i + 'A') }); }
        const badges = [{ i: '🔰', k: 'guideBeginnerBadge', c: '#22c55e' }, { i: '⏱️', k: 'guideTimeBadge', c: '#4f8ef7' }, { i: '🌐', k: 'guideLangBadge', c: '#a855f7' }];
        const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20 };
        const secTitle = { fontWeight: 900, fontSize: 15, color: '#1e293b', marginBottom: 12, WebkitTextFillColor: '#1e293b' };
        const pre = { whiteSpace: 'pre-line', fontSize: 12.5, color: '#374151', lineHeight: 1.9, WebkitTextFillColor: '#374151' };
        return (
        <div style={{ display: 'grid', gap: 18, color: '#1e293b' }}>
          <div style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderRadius: 16, border: '1px solid #c7d2fe', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔗</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: '#1e293b', marginBottom: 6, letterSpacing: '-0.02em', WebkitTextFillColor: '#1e293b' }}>{t('ak.guideTitle')}</div>
            <div style={{ fontSize: 13, color: '#1e293b', lineHeight: 1.7, fontWeight: 600, maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{t('ak.guideSub')}</div>
            {g('guideBeginnerBadge') && <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              {badges.map((b, i) => g(b.k) ? <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: `${b.c}18`, color: b.c, fontSize: 12, fontWeight: 800, WebkitTextFillColor: b.c }}>{b.i} {g(b.k)}</span> : null)}
            </div>}
          </div>
          {g('guideLearnTitle') ? <div style={{ ...card, background: 'rgba(79,142,247,0.04)', borderColor: 'rgba(79,142,247,0.2)' }}><div style={secTitle}>🎯 {g('guideLearnTitle')}</div><div style={pre}>{g('guideLearnDesc')}</div></div> : null}
          {steps.length > 0 && <div style={card}>
            {g('guideStepsTitle') ? <div style={secTitle}>🚀 {g('guideStepsTitle')}</div> : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {steps.map((s) => (
                <div key={s.n} style={{ padding: '16px 18px', borderRadius: 14, background: s.color + '08', border: '1px solid ' + s.color + '22', display: 'flex', gap: 14, alignItems: 'start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color + '15', border: '1px solid ' + s.color + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                  <div>
                    {s.phase ? <div style={{ fontSize: 10, fontWeight: 800, color: s.color, marginBottom: 4, opacity: 0.85, WebkitTextFillColor: s.color }}>{s.phase}</div> : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: s.color, background: s.color + '20', padding: '2px 8px', borderRadius: 20, WebkitTextFillColor: s.color }}>STEP {s.n}</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: s.color, WebkitTextFillColor: s.color }}>{s.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line', WebkitTextFillColor: '#374151' }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>}
          {tips.length > 0 && <div style={{ ...card, background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.25)' }}>
            <div style={secTitle}>💡 {t('ak.guideTipsTitle')}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {tips.map((tip, i) => (<div key={i} style={{ display: 'flex', gap: 10, alignItems: 'start', fontSize: 12.5, color: '#374151', lineHeight: 1.7, WebkitTextFillColor: '#374151' }}><span style={{ color: '#22c55e', fontWeight: 900, WebkitTextFillColor: '#22c55e' }}>✓</span><span>{tip}</span></div>))}
            </div>
          </div>}
          {faqs.length > 0 && <div style={card}>
            <div style={secTitle}>❓ {t('ak.guideFaqTitle')}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {faqs.map((f, i) => (<div key={i} style={{ borderBottom: i < faqs.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: 10 }}><div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 4, WebkitTextFillColor: '#1e293b' }}>Q. {f.q}</div><div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.7, WebkitTextFillColor: '#475569' }}>{f.a}</div></div>))}
            </div>
          </div>}
          {g('guideSecurityTitle') ? <div style={{ ...card, background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}><div style={secTitle}>🔒 {g('guideSecurityTitle')}</div><div style={pre}>{g('guideSecurityDesc')}</div></div> : null}
          {g('guideOpsTitle') ? <div style={card}><div style={secTitle}>🛠️ {g('guideOpsTitle')}</div><div style={pre}>{g('guideOpsDesc')}</div></div> : null}
          {g('guideReadyTitle') ? <div style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', borderRadius: 16, border: '1px solid #c7d2fe', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 17, color: '#1e293b', marginBottom: 8, WebkitTextFillColor: '#1e293b' }}>🎉 {g('guideReadyTitle')}</div>
            <div style={{ fontSize: 12.5, color: '#1e293b', lineHeight: 1.8, fontWeight: 500, whiteSpace: 'pre-line', maxWidth: 720, margin: '0 auto', WebkitTextFillColor: '#1e293b' }}>{g('guideReadyDesc')}</div>
          </div> : null}
        </div>
        );
      })()}

      {/* Modals */}
      {showAddModal && (
        <AddCredModal channels={allChannels} onClose={() => setShowAddModal(false)} onSubmit={handleSaveCred} t={t} />
      )}
      {showApplyModal && (
        <ApplyModal channel={showApplyModal} currentUser={user} onClose={() => setShowApplyModal(null)} onSubmit={handleApplySubmit}
          onRegister={(ch) => { setShowApplyModal(null); setConnectPostOauth(false); setShowConnectModal(ch); }} t={t} />
      )}
      {showConnectModal && (
        <ConnectModal channel={showConnectModal} postOauth={connectPostOauth} onClose={() => { setShowConnectModal(null); setConnectPostOauth(false); }} onSubmit={handleConnectSave} t={t} extraFields={regFields}
          registeredKeys={new Set((creds || []).filter(c => c && Number(c.is_active) !== 0 && c.channel === showConnectModal.key && c.key_name && !String(c.key_name).startsWith('__')).map(c => String(c.key_name)))}
          verifiedKeys={new Set((creds || []).filter(c => c && Number(c.is_active) !== 0 && c.channel === showConnectModal.key && c.test_status === 'ok' && c.key_name && !String(c.key_name).startsWith('__')).map(c => String(c.key_name)))} />
      )}
      {showRegAdd && (
        <RegistryAddModal onClose={() => setShowRegAdd(false)} onSubmit={submitRegistryChannel} />
      )}
      {showManual && (
        <ManualModal channel={showManual} onClose={() => setShowManual(null)} t={t} />
      )}

      {/* [현 차수] 발급 신청 완료/실패 확인 모달 — 사용자가 결과(성공·실패·티켓·다음 절차)를 확실히 인지. */}
      {applyDone && (
        <div role="dialog" aria-modal="true" onClick={() => setApplyDone(null)} style={{
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)'
        }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 440, width: '90%', padding: 28, borderRadius: 16, background: 'var(--card-bg,#fff)', border: '1px solid rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }} aria-hidden>{applyDone.ok ? '✅' : '⚠️'}</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, color: applyDone.ok ? '#16a34a' : '#dc2626' }}>
              {applyDone.ok ? t('ak.applyDoneTitle', '발급 신청이 접수되었습니다') : t('ak.applyFailTitle', '발급 신청에 실패했습니다')}
            </div>
            {applyDone.ok ? (
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7, textAlign: 'left', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                {applyDone.ticket && <div>· {t('ak.ticketNo','티켓 번호')}: <b style={{ fontFamily: 'monospace' }}>{applyDone.ticket}</b></div>}
                <div>· {t('ak.statusLabel','상태')}: <b style={{ color: '#ca8a04' }}>{t('ak.statusPending','접수(처리 대기)')}</b></div>
                <div>· {t('ak.mailNotice','확인 메일')}: {applyDone.notified ? t('ak.mailSent','신청자 이메일로 발송됨') : t('ak.mailSkip','메일 미발송 — 진행상황은 아래 [발급 신청 현황]에서 확인')}</div>
                <div style={{ marginTop: 8, color: 'var(--text-3)' }}>{t('ak.applyNext','운영팀 발급 후 등록 즉시 자동 연동됩니다. 진행 상황은 화면 하단의 「API 키 발급 신청 현황」에서 언제든 확인할 수 있습니다.')}</div>
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7, textAlign: 'left', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div>{t('ak.applyFailDesc','신청이 접수되지 않았습니다. 네트워크 또는 로그인 상태를 확인한 뒤 다시 시도해 주세요.')}</div>
                {applyDone.error && <div style={{ marginTop: 8, fontSize: 10.5, color: '#dc2626', fontFamily: 'monospace', wordBreak: 'break-all' }}>{applyDone.error}</div>}
              </div>
            )}
            <button onClick={() => setApplyDone(null)} style={{ width: '100%', padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 13 }}>
              {t('ak.confirm','확인')}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999, maxWidth: 360,
          padding: '12px 18px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(79,142,247,0.95)',
          color: '#fff', fontSize: 12, fontWeight: 700, boxShadow: '0 12px 36px rgba(0,0,0,0.3)'
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: 실시간 Webhook — 채널별 수신 토큰 발급/조회/폐기
   webhook URL 을 채널 콘솔에 등록하면 주문/취소/반품이 실시간 동기화된다.
   (백엔드: ChannelSync::listWebhookTokens/createWebhookToken/deleteWebhookToken)
   ═══════════════════════════════════════════════════════════════════ */
const WEBHOOK_CHANNELS = [
  { id: 'shopify',     name: 'Shopify' },
  { id: 'amazon',      name: 'Amazon SP-API' },
  { id: 'coupang',     name: '쿠팡 Wing' },
  { id: 'naver',       name: '네이버 스마트스토어' },
  { id: 'ebay',        name: 'eBay' },
  { id: 'tiktok_shop', name: 'TikTok Shop' },
  { id: 'rakuten',     name: 'Rakuten' },
  { id: 'cafe24',      name: 'Cafe24' },
];

function WebhookTab({ t, show }) {
  const [tokens, setTokens]     = useState([]);
  const [baseUrl, setBaseUrl]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [channel, setChannel]   = useState('shopify');
  const [label, setLabel]       = useState('');
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(null); // 발급 직후 1회 전체 토큰 노출

  const load = useCallback(() => {
    setLoading(true);
    getJsonAuth('/api/channel-sync/webhook-tokens')
      .then(r => { if (r?.ok) { setTokens(r.tokens || []); setBaseUrl(r.base_url || ''); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const copy = (txt) => {
    try { navigator.clipboard?.writeText(String(txt)); show('success', t('ak.whCopied', '클립보드에 복사되었습니다')); }
    catch { show('error', t('ak.whCopyFail', '복사 실패 — 직접 선택해 복사하세요')); }
  };

  const create = async () => {
    if (!channel) return;
    setCreating(true);
    try {
      const r = await postJson('/api/channel-sync/webhook-tokens', { channel, label });
      if (r?.ok) {
        setJustCreated(r);
        setLabel('');
        show('success', t('ak.whCreated', '웹훅 토큰이 발급되었습니다'));
        load();
      } else {
        show('error', r?.message || t('ak.whErr', '발급에 실패했습니다'));
      }
    } catch (e) {
      const msg = String(e?.message || e);
      show('error', msg.includes('403') ? t('ak.whDemoBlock', '데모 환경에서는 발급할 수 없습니다') : msg);
    } finally { setCreating(false); }
  };

  const remove = async (id) => {
    if (!window.confirm(t('ak.whDelConfirm', '이 웹훅 토큰을 폐기할까요? 해당 채널의 실시간 수신이 중단됩니다.'))) return;
    try {
      await delJson('/api/channel-sync/webhook-tokens/' + id);
      if (justCreated?.id === id) setJustCreated(null);
      show('success', t('ak.whDeleted', '폐기되었습니다'));
      load();
    } catch (e) { show('error', String(e?.message || e)); }
  };

  const card  = { background: 'var(--surface-1,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 14, padding: 18 };
  const input = { padding: '9px 11px', borderRadius: 9, border: '1px solid var(--border,#cbd5e1)', background: 'var(--surface-2,#fff)', color: 'var(--text-1,#0f172a)', fontSize: 13 };
  const codeBox = { fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', background: 'var(--surface-2,#f1f5f9)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-1,#0f172a)' };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 안내 */}
      <div style={{ ...card, background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', border: '1px solid #c7d2fe' }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: '#1e293b', WebkitTextFillColor: '#1e293b', marginBottom: 6 }}>
          🔔 {t('ak.whTitle', '실시간 Webhook 수신')}
        </div>
        <div style={{ fontSize: 12.5, color: '#475569', WebkitTextFillColor: '#475569', lineHeight: 1.8 }}>
          {t('ak.whIntro', '채널별 수신 토큰을 발급해 아래 Webhook URL 을 각 판매채널 콘솔(주문 알림/웹훅 설정)에 등록하세요. 등록하면 주문·취소·반품·재고 변경이 폴링 주기를 기다리지 않고 실시간으로 동기화됩니다. 토큰이 없으면 채널이 보낸 webhook 은 보안상 무시됩니다(주입 차단).')}
        </div>
      </div>

      {/* 발급 폼 */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text-1)' }}>{t('ak.whIssue', '토큰 발급')}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--text-2)' }}>{t('ak.whChannel', '채널')}</label>
            <select value={channel} onChange={e => setChannel(e.target.value)} style={{ ...input, minWidth: 200 }}>
              {WEBHOOK_CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 4, flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: 'var(--text-2)' }}>{t('ak.whLabel', '메모(선택)')}</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t('ak.whLabelPh', '예: 본 매장 운영용')} style={input} />
          </div>
          <button onClick={create} disabled={creating} style={{
            padding: '10px 18px', borderRadius: 9, border: 'none', cursor: creating ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 13,
          }}>{creating ? t('ak.whIssuing', '발급 중…') : t('ak.whIssueBtn', '+ 토큰 발급')}</button>
        </div>

        {/* 발급 직후 — 전체 토큰/URL 1회 노출 */}
        {justCreated && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: '1px dashed #22c55e', background: 'rgba(34,197,94,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#15803d', WebkitTextFillColor: '#15803d', marginBottom: 8 }}>
              ✅ {t('ak.whNew', '발급 완료 — 아래 Webhook URL 을 채널 콘솔에 등록하세요')}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>Webhook URL</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ ...codeBox, flex: 1 }}>{justCreated.webhook_url}</div>
                  <button onClick={() => copy(justCreated.webhook_url)} style={miniBtn}>{t('ak.whCopy', '복사')}</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 3 }}>{t('ak.whHeaderAlt', '또는 헤더 방식')}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ ...codeBox, flex: 1 }}>{justCreated.header_hint}</div>
                  <button onClick={() => copy(justCreated.header_hint)} style={miniBtn}>{t('ak.whCopy', '복사')}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 발급된 토큰 목록 */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: 'var(--text-1)' }}>
          {t('ak.whList', '발급된 토큰')} {tokens.length > 0 && <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>({tokens.length})</span>}
        </div>
        {loading ? (
          <div style={{ color: 'var(--text-2)', fontSize: 13, padding: 12 }}>{t('common.loading', '불러오는 중…')}</div>
        ) : tokens.length === 0 ? (
          <div style={{ color: 'var(--text-2)', fontSize: 13, padding: 16, textAlign: 'center' }}>{t('ak.whEmpty', '아직 발급된 웹훅 토큰이 없습니다.')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {tokens.map(tk => {
              const chName = WEBHOOK_CHANNELS.find(c => c.id === tk.channel)?.name || tk.channel;
              return (
                <div key={tk.id} style={{ border: '1px solid var(--border,#e5e7eb)', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-1)' }}>{chName}</span>
                      {tk.label && <span style={{ fontSize: 11, color: 'var(--text-2)' }}>· {tk.label}</span>}
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-2)' }}>{tk.token_masked}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: tk.last_used_at ? '#22c55e' : 'var(--text-3,#94a3b8)' }}>
                        {tk.last_used_at ? `${t('ak.whLastUsed', '최근 수신')}: ${tk.last_used_at}` : t('ak.whNeverUsed', '수신 이력 없음')}
                      </span>
                      <button onClick={() => copy(tk.webhook_url)} style={miniBtn}>{t('ak.whCopyUrl', 'URL 복사')}</button>
                      <button onClick={() => remove(tk.id)} style={{ ...miniBtn, color: '#ef4444', borderColor: '#fca5a5' }}>{t('ak.whRevoke', '폐기')}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
const miniBtn = { padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border,#cbd5e1)', background: 'var(--surface-2,#fff)', color: 'var(--text-1,#334155)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };

/* ═══════════════════════════════════════════════════════════════════
   Tab: 정산 — v427 PG 정산 실어댑터(Stripe·토스페이먼츠·PayPal)
   ═══════════════════════════════════════════════════════════════════ */
function SettlementTab({ t, show }) {
  const [providers, setProviders] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ count: 0, gross: 0, fee: 0, net: 0 });
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, se] = await Promise.all([getJsonAuth('/v427/pg/providers'), getJsonAuth('/v427/pg/settlements')]);
      setProviders(Array.isArray(pr?.providers) ? pr.providers : []);
      setRows(Array.isArray(se?.settlements) ? se.settlements : []);
      setSummary(se?.summary || { count: 0, gross: 0, fee: 0, net: 0 });
    } catch { /* 빈 상태 */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sync = async (provider) => {
    setBusy(provider);
    try {
      const r = await postJson('/v427/pg/sync', { provider });
      if (r?.configured === false) show('info', r?.note || t('ak.pgPending', '자격증명 미등록 — [등록]에서 PG 키를 먼저 등록하세요'));
      else if (r?.ok) show('success', `${provider}: ${t('ak.pgSynced', '거래 수집')} ${r?.synced ?? 0}`);
      else show('error', r?.note || t('ak.pgFail', '수집 실패'));
      load();
    } catch (e) { show('error', String(e?.message || e)); }
    finally { setBusy(''); }
  };
  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 12, color: 'var(--text-2)' }}>
        💳 {t('ak.pgHint', 'PG 자격증명을 [등록]한 뒤 아래에서 결제·정산 거래를 수집하면 매출/수수료/순액이 집계됩니다. (Stripe·토스페이먼츠·PayPal 실연동, 그 외 연동 예정)')}
      </div>
      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[['🧾', t('ak.pgCount', '거래'), summary.count], ['💰', t('ak.pgGross', '총액'), fmt(summary.gross)], ['✂️', t('ak.pgFee', '수수료'), fmt(summary.fee)], ['💵', t('ak.pgNet', '순액'), fmt(summary.net)]].map((k, i) => (
          <div key={i} style={{ borderRadius: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 18 }}>{k[0]}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{loading ? '…' : k[2]}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{k[1]}</div>
          </div>
        ))}
      </div>
      {/* PG 수집 버튼 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
        {providers.map(p => (
          <button key={p.key} onClick={() => sync(p.key)} disabled={busy === p.key || !p.live} title={p.live ? '' : t('ak.pgPlanned', '연동 예정')} style={{
            padding: '8px 14px', borderRadius: 9, border: '1px solid ' + (p.connected ? 'rgba(34,197,94,0.4)' : 'rgba(99,102,241,0.25)'),
            cursor: (busy === p.key || !p.live) ? 'not-allowed' : 'pointer', background: p.connected ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.06)',
            color: p.connected ? '#16a34a' : '#6366f1', fontWeight: 700, fontSize: 12, opacity: p.live ? 1 : 0.5,
          }}>{busy === p.key ? '⏳' : (p.connected ? '✓' : '🔄')} {p.label}{!p.live ? ' (예정)' : ''}</button>
        ))}
      </div>
      {/* 거래 목록 */}
      <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading', 'Loading…')}</div>
          : rows.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>🧾 {t('ak.pgEmpty', '수집된 정산 거래가 없습니다. 위에서 PG를 선택해 수집하세요.')}</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: 'rgba(99,102,241,0.06)', textAlign: 'left' }}>
                {[t('ak.pgColProvider', 'PG'), t('ak.pgColTxn', '거래ID'), t('ak.pgColType', '유형'), t('ak.pgGross', '총액'), t('ak.pgFee', '수수료'), t('ak.pgNet', '순액'), t('ak.pgColDate', '일시')].map((h, i) => <th key={i} style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-2)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '9px 14px', fontWeight: 700 }}>{r.provider}</td>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: 'var(--text-3)' }}>{String(r.txn_id).slice(0, 18)}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-3)' }}>{r.type}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 700 }}>{fmt(r.gross)} <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{r.currency}</span></td>
                    <td style={{ padding: '9px 14px', color: '#dc2626' }}>{fmt(r.fee)}</td>
                    <td style={{ padding: '9px 14px', color: '#16a34a', fontWeight: 700 }}>{fmt(r.net)}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-3)', fontSize: 11 }}>{(r.txn_at || '').slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: 배송추적 — v427 Logistics 실어댑터(국내 택배 통합 + 우체국택배 + DHL)
   ═══════════════════════════════════════════════════════════════════ */
const TRACK_CARRIERS = [
  { key: 'epost', name: '우체국택배' }, { key: 'cj', name: 'CJ대한통운' }, { key: 'hanjin', name: '한진택배' },
  { key: 'logen', name: '로젠택배' }, { key: 'lotte', name: '롯데택배' }, { key: 'dhl', name: 'DHL Express' },
];
const SHIP_STATUS = {
  delivered: { label: '배송완료', bg: 'rgba(34,197,94,0.12)', fg: '#16a34a' },
  in_transit: { label: '배송중', bg: 'rgba(79,142,247,0.12)', fg: '#4f8ef7' },
  pending: { label: '연동 준비중', bg: 'rgba(148,163,184,0.12)', fg: '#64748b' },
  error: { label: '조회 오류', bg: 'rgba(239,68,68,0.12)', fg: '#dc2626' },
};
function TrackingTab({ t, show }) {
  const [carrier, setCarrier] = useState('epost');
  const [trackNo, setTrackNo] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, in_transit: 0, delivered: 0 });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getJsonAuth('/v427/logistics/shipments');
      setRows(Array.isArray(r?.shipments) ? r.shipments : []);
      setSummary(r?.summary || { total: 0, in_transit: 0, delivered: 0 });
    } catch { /* 빈 상태 */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const track = async () => {
    if (!trackNo.trim()) { show('info', t('ak.trkNoRequired', '송장번호를 입력하세요')); return; }
    setBusy(true);
    try {
      const r = await postJson('/v427/logistics/track', { carrier, tracking_no: trackNo.trim(), order_ref: orderRef.trim() });
      if (r?.configured === false) show('info', r?.note || t('ak.trkPending', '추적 키 미등록 — [등록]에서 추적 키를 먼저 등록하세요'));
      else if (r?.ok) show('success', `${stLabel(r?.status) || ''} — ${r?.status_text || ''}`);
      else show('error', r?.note || t('ak.trkFail', '조회 실패'));
      setTrackNo(''); setOrderRef('');
      load();
    } catch (e) { show('error', String(e?.message || e)); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    setBusy(true);
    try { const r = await postJson('/v427/logistics/refresh', {}); show('success', `${t('ak.trkRefreshed', '갱신됨')}: ${r?.refreshed ?? 0}`); load(); }
    catch (e) { show('error', String(e?.message || e)); } finally { setBusy(false); }
  };
  const del = async (id) => {
    try { await delJson(`/v427/logistics/shipments/${id}`); load(); } catch { /* noop */ }
  };

  const stLabel = (s) => t('ak.trkSt_' + s, SHIP_STATUS[s]?.label || s);
  const inp = { padding: '9px 11px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', fontSize: 12, background: 'rgba(255,255,255,0.95)', color: 'var(--text-1)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)', fontSize: 12, color: 'var(--text-2)' }}>
        📦 {t('ak.trkHint', '택배사를 선택하고 송장번호를 입력하면 실시간 배송 상태를 조회합니다. 국내 택배는 통합 추적 키(스마트택배), DHL은 DHL API 키를 [등록] 탭에서 먼저 등록하세요.')}
      </div>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {[['📦', t('ak.trkTotal', '전체'), summary.total], ['🚚', t('ak.trkInTransit', '배송중'), summary.in_transit], ['✅', t('ak.trkDelivered', '배송완료'), summary.delivered]].map((k, i) => (
          <div key={i} style={{ borderRadius: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 18 }}>{k[0]}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{loading ? '…' : k[2]}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{k[1]}</div>
          </div>
        ))}
      </div>
      {/* 송장 등록 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <select value={carrier} onChange={e => setCarrier(e.target.value)} style={{ ...inp, minWidth: 130 }}>
          {TRACK_CARRIERS.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
        <input value={trackNo} onChange={e => setTrackNo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') track(); }} placeholder={t('ak.trkNoPh', '송장번호')} style={{ ...inp, flex: 1, minWidth: 160, fontFamily: 'monospace' }} />
        <input value={orderRef} onChange={e => setOrderRef(e.target.value)} placeholder={t('ak.trkOrderPh', '주문번호(선택)')} style={{ ...inp, width: 140 }} />
        <button onClick={track} disabled={busy} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', cursor: busy ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12, opacity: busy ? 0.6 : 1 }}>🔍 {t('ak.trkBtn', '추적')}</button>
        <button onClick={refresh} disabled={busy} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.25)', cursor: 'pointer', background: 'rgba(79,142,247,0.05)', color: 'var(--text-2)', fontWeight: 700, fontSize: 12 }}>🔄 {t('ak.trkRefresh', '전체 갱신')}</button>
      </div>
      {/* 목록 */}
      <div style={{ borderRadius: 12, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading', 'Loading…')}</div>
          : rows.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>📭 {t('ak.trkEmpty', '추적 중인 송장이 없습니다. 위에서 송장번호를 등록하세요.')}</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: 'rgba(79,142,247,0.06)', textAlign: 'left' }}>
                {[t('ak.trkColCarrier', '택배사'), t('ak.trkColNo', '송장번호'), t('ak.trkColStatus', '상태'), t('ak.trkColRecipient', '수취인'), t('ak.trkColLast', '최근 이벤트'), ''].map((h, i) => <th key={i} style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-2)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(r => {
                  const sc = SHIP_STATUS[r.status] || SHIP_STATUS.pending;
                  const cn = TRACK_CARRIERS.find(c => c.key === r.carrier)?.name || r.carrier;
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '9px 14px', fontWeight: 700 }}>{cn}</td>
                      <td style={{ padding: '9px 14px', fontFamily: 'monospace' }}>{r.tracking_no}{r.order_ref ? <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>· {r.order_ref}</span> : null}</td>
                      <td style={{ padding: '9px 14px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.fg, fontWeight: 700 }}>{stLabel(r.status)}</span> <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{r.status_text}</span></td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-3)' }}>{r.recipient || '—'}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-3)', fontSize: 11 }}>{r.last_event_at || '—'}</td>
                      <td style={{ padding: '9px 14px', textAlign: 'right' }}><button onClick={() => del(r.id)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: 10, fontWeight: 700 }}>🗑️</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

/* [현 차수] ③ 발급 신청 현황 — 신청한 API 키 발급 진행 상태(접수→처리중→완료/반려) 추적·표시.
   발급 완료 시 '발급 완료' 배지 + 안내가 떠 "발급완료 정보를 받아올 수 있는지"를 충족한다.
   자격증명 등록 시 백엔드가 해당 채널 신청을 자동 '완료' 처리한다. */
function ApplyStatusPanel({ applies = [], onRefresh, t }) {
  // [228차] 데이터는 부모(자동 폴링 25초)에서 prop 으로 수신 — 단일 소스. 수동 새로고침은 onRefresh.
  const load = onRefresh || (() => {});
  if (!applies || applies.length === 0) return null;
  const STAT = {
    pending:    { label: t('ak.stPending', '접수 대기'),  c: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    processing: { label: t('ak.stProcessing', '처리 중'), c: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    completed:  { label: t('ak.stCompleted', '발급 완료'), c: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    rejected:   { label: t('ak.stRejected', '반려'),      c: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  };
  return (
    <div style={{ marginTop: 18, borderRadius: 14, border: '1px solid rgba(99,140,255,0.18)', background: 'rgba(255,255,255,0.6)', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>📨 {t('ak.applyStatusTitle', 'API 키 발급 신청 현황')}
          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#16a34a', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 20 }}>⟳ {t('ak.autoRefresh', '실시간 자동 갱신')}</span>
        </div>
        <button onClick={load} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🔄 {t('ak.refresh', '새로고침')}</button>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {applies.map((a, i) => {
          const s = STAT[a.status] || STAT.pending;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #eef2f7' }}>
              <span style={{ fontSize: 13, fontWeight: 800, minWidth: 90 }}>{a.channel}</span>
              <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{a.ticket_id}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: s.c, background: s.bg, padding: '3px 10px', borderRadius: 99 }}>{s.label}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{a.completed_at ? String(a.completed_at).slice(0, 10) : (a.requested_at ? String(a.requested_at).slice(0, 10) : '')}</span>
              {a.status === 'completed' && <span style={{ fontSize: 11, color: '#16a34a', width: '100%' }}>✅ {a.completed_note || t('ak.completeHint', '발급이 완료되었습니다. 발급된 키를 등록하면 즉시 자동 연동됩니다.')}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Overview — 채널별 등록 현황 + Quick actions
   ═══════════════════════════════════════════════════════════════════ */
function OverviewTab({ channels, summary, creds, applies = [], loading, onChannelTest, onConnect, onApply, onOAuth, onManual, testingId, t }) {
  // [238차] ★선행조건: 채널 API 키 발급신청에는 회사정보(사업자번호·주소 등)가 필요(발급 폼에 자동 채워짐).
  //   누락 시 채널 연동 '전에' 회사정보 완성을 먼저 안내(정확한 순서). 완성 기준=profileComplete SSOT.
  const { user } = useAuth();
  const [showCompany, setShowCompany] = useState(false);
  const missingProfile = profileMissing(user);
  const PROFILE_LABELS = { company: t('companyInfo.company', '회사(브랜드)명'), business_number: t('companyInfo.bizNum', '사업자등록번호'), ceo_name: t('companyInfo.ceo', '대표자명'), phone: t('companyInfo.phone', '연락처'), address: t('companyInfo.address', '사업장 주소') };
  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading','Loading…')}</div>;
  }
  // [228차] 채널별 발급 신청 현황 맵 — 개요 카드에 신청 상태 표기(list는 id DESC라 첫 항목=최신).
  const applyByChannel = {};
  (applies || []).forEach(a => { if (a && a.channel && !applyByChannel[a.channel]) applyByChannel[a.channel] = a; });
  const APPLY_STAT = {
    pending:    { label: t('ak.stPending', '접수 대기'),     c: '#d97706', bg: 'rgba(245,158,11,0.12)', bd: 'rgba(245,158,11,0.35)' },
    processing: { label: t('ak.stProcessing', '발급 확인 대기'), c: '#2563eb', bg: 'rgba(37,99,235,0.10)',  bd: 'rgba(37,99,235,0.3)' },
    completed:  { label: t('ak.stCompleted', '발급 완료'),   c: '#16a34a', bg: 'rgba(34,197,94,0.12)',  bd: 'rgba(34,197,94,0.4)' },
    rejected:   { label: t('ak.stRejected', '반려'),         c: '#dc2626', bg: 'rgba(239,68,68,0.10)',  bd: 'rgba(239,68,68,0.3)' },
  };
  // 208차: 자격증명 0건이어도 채널 등록 그리드를 항상 노출(운영에서 등록 화면이 안 보이던 버그 수정).
  const totalKeys = creds.length;
  // 그룹 정렬 — GROUP_ORDER 순, 미정의 그룹은 뒤로
  const grouped = GROUP_ORDER.map(g => ({ g, items: channels.filter(c => c.group === g) }))
    .concat([{ g: '_other', items: channels.filter(c => !GROUP_ORDER.includes(c.group)) }])
    .filter(x => x.items.length > 0);

  // [현 차수] 요청: 채널별로 "실제 등록된 자격증명 키명" 집합 — 일부만 등록(예: API키만, 계정ID 미등록) 판정용.
  //   apply 티켓(__apply__)·비활성 행 제외. 데모(키명 미상)는 summary.hasRequired 로만 판정(부분판정 불가).
  const regKeys = {};
  // [현 차수] ★item 3: 채널별 '실검증 통과(test_status==='ok')' 여부 — 발급 확인됨 배지의 유일 근거(임의 표기 금지).
  const verifiedCh = {};
  creds.forEach(c => {
    if (!c || Number(c.is_active) === 0) return;
    const kn = c.key_name;
    if (!kn || String(kn).startsWith('__')) return;
    (regKeys[c.channel] = regKeys[c.channel] || new Set()).add(kn);
    if (c.test_status === 'ok') verifiedCh[c.channel] = true;
  });

  const renderCard = (ch) => {
    const sum = summary[ch.key] || { keyCount: 0, hasRequired: false };
    // 필요 자격증명 필드 목록(채널별) — 전부 등록되면 'full', 일부면 'partial', 없으면 'none'.
    const reqFields = CHANNEL_FIELDS[ch.key] || DEFAULT_FIELDS;
    const reqCount = reqFields.length;
    const known = regKeys[ch.key];               // 실제 등록된 키명 집합(undefined=데모/요약전용)
    const credCount = known ? known.size : 0;
    let status;
    if (credCount > 0) status = credCount >= reqCount ? 'full' : 'partial';
    else status = sum.hasRequired ? 'full' : 'none';
    const live = status !== 'none';
    // [현 차수] H1: 자격증명은 등록됐으나 전용 어댑터 미지원(stub) → 'pending'(준비중) 구분 표기.
    const pending = status === 'full' && sum.syncStatus === 'pending';
    // 일부 등록 시 미등록 항목(라벨) — "api만 등록, 계정ID 미등록" 식으로 노출.
    const missing = status === 'partial' ? reqFields.filter(f => !known.has(f.k)) : [];
    const shownCount = credCount || sum.keyCount || 0;
    const sc = status === 'none' ? STATUS_COLORS.none
      : status === 'partial' ? { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', fg: '#d97706' }
      : (pending ? STATUS_COLORS.pending : STATUS_COLORS.ok);
    const busy = testingId === `ch_${ch.key}`;
    // [현 차수] 요청2: 발급 방식 분기 — OAuth 가능=원클릭 자동발급 / 그 외=발급 신청하기(폼+콘솔 바로가기).
    const oauthProv = OAUTH_PROVIDER[ch.key];
    // [현 차수] ★item 3: '발급 확인됨'은 연동허브 라이브 실검증(test_status==='ok') 통과에만 표기(임의 조작 금지).
    //   라이브 검증 가능 채널(LIVE_VERIFY) + 실 검증 통과 → isVerified. 등록됐으나 미검증 → needsVerify(애니메이션 유도).
    const canLiveVerify = LIVE_VERIFY_CHANNELS.has(ch.key);
    const isVerified = canLiveVerify && !!verifiedCh[ch.key];
    const needsVerify = live && canLiveVerify && !isVerified;
    // [현 차수 정직성] 키는 실검증 통과했으나 데이터 동기화 어댑터가 없는 채널(예: youtube) — '발급 확인 완료'가
    //   '연동 동작'으로 오해되지 않도록 '키 검증됨·동기화 준비중'으로 정직 표기(키 유효 사실은 보존). youtube 단독 해당.
    const verifiedNoSync = isVerified && !REAL_ADAPTER.has(ch.key);
    // [228차] 이 채널의 발급 신청 현황(개요 카드 표기). pending/processing 이면 다음단계(발급→등록) 안내.
    const apply = applyByChannel[ch.key];
    const applySt = apply ? (APPLY_STAT[apply.status] || APPLY_STAT.pending) : null;
    const applyOpen = apply && (apply.status === 'pending' || apply.status === 'processing');
    return (
      <div key={ch.key} style={{
        borderRadius: 14, padding: 16,
        // [현 차수] 요청: 등록 상태별 카드 배경 틴트(녹=전체등록, 주황=일부등록, 노랑=등록·준비중, 흰=미등록).
        background: status === 'none' ? 'rgba(255,255,255,0.85)'
          : status === 'partial' ? 'rgba(245,158,11,0.06)'
          : (isVerified ? 'rgba(255,224,0,0.12)' : pending ? 'rgba(250,204,21,0.07)' : 'rgba(34,197,94,0.07)'),
        // [229차] 발급 확인 완료=노랑 강조 / 등록완료=녹 / 준비중=노랑 테두리+글로우.
        border: status === 'full'
          ? `2px solid ${isVerified ? '#ffcf00' : pending ? 'rgba(202,138,4,0.55)' : 'rgba(22,163,74,0.6)'}`
          : `1px solid ${status === 'none' ? 'rgba(0,0,0,0.06)' : sc.border}`,
        borderLeft: `4px solid ${ch.color}`,
        boxShadow: status === 'full' ? (isVerified ? '0 0 0 3px rgba(255,207,0,0.28)' : pending ? '0 0 0 3px rgba(234,179,8,0.10)' : '0 0 0 3px rgba(34,197,94,0.12)') : 'none',
      }}>
        {/* [229차] ★등록 완료 강조 배너 — 개요에서 발급·등록된 채널을 한눈에 뚜렷하게 표시. */}
        {status === 'full' && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginBottom: 11, padding: '8px 10px', borderRadius: 9, fontSize: 12, fontWeight: 900, letterSpacing: 0.2,
            // [229차] ★발급 확인 완료 = 노랑 바탕 + 찐한 청색 글자(눈에 확 띄게). 등록/준비중은 녹/노랑 유지.
            color: isVerified ? '#0b2e8a' : '#fff',
            boxShadow: isVerified ? '0 4px 14px rgba(250,204,21,0.55)' : '0 4px 12px rgba(22,163,74,0.26)',
            border: isVerified ? '1.5px solid #0b2e8a' : 'none',
            background: isVerified ? 'linear-gradient(135deg,#ffe600,#ffd400)'
              : pending ? 'linear-gradient(135deg,#facc15,#ca8a04)'
              : 'linear-gradient(135deg,#34d399,#16a34a)',
          }}>
            {verifiedNoSync ? <span>🔑 {t('ak.bannerVerifiedNoSync','키 검증됨 · 동기화 준비중')}</span>
              : isVerified ? <span style={{ animation: 'akVerifiedBlink 1s ease-in-out infinite' }}>🎉 {t('ak.bannerVerified','발급 확인 완료')}</span>
              : pending ? `✅ ${t('ak.bannerPending','등록 완료 · 연동 준비 중')}`
              : `✅ ${t('ak.bannerRegistered','발급·등록 완료')}`}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }} aria-hidden>{ch.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 5 }}>
              {/* 등록 상태 아이콘: 전체=✓(녹), 일부=⚠(주황) */}
              {status === 'full' && <span style={{ color: pending ? '#ca8a04' : '#16a34a', fontSize: 13 }} aria-hidden>✓</span>}
              {status === 'partial' && <span style={{ color: '#d97706', fontSize: 12 }} aria-hidden>⚠️</span>}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
            </div>
            <div style={{ fontSize: 10, color: (ch.managedPage || status === 'none') ? 'var(--text-3)' : sc.fg, marginTop: 2, fontWeight: (ch.managedPage || status === 'none') ? 400 : 700, whiteSpace: 'normal', lineHeight: 1.5 }}>
              {ch.managedPage
                /* [현 차수 감사] email/whatsapp 등 관리형 채널 — 허브 자격증명 입력이 아니라 전용 페이지에서 설정(오해 소지 '미등록' 문구 대체). */
                ? `⚙️ ${t('ak.managedChannel','관리형 채널 · 전용 페이지에서 설정')}`
                : status === 'none'
                  ? t('ak.needKeys', { count: reqCount, defaultValue: `자격증명 ${reqCount}개 필요 · 미등록` })
                  : status === 'partial'
                    ? `🔑 ${credCount}/${reqCount} ${t('ak.registered','등록')} · ${t('ak.missingLabel','미등록')}: ${missing.map(f => f.label).join(', ')}`
                    : `🔑 ${t('ak.keyRegistered', { count: shownCount, defaultValue: `${shownCount}개 키 등록됨` })}`}
            </div>
          </div>
          {/* [현 차수] ★발급 확인 배지 — 실검증 통과 시에만 '발급 확인됨'(녹), 등록·미검증은 '발급 확인 대기'(주황). */}
          {verifiedNoSync ? (
            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.14)', color: '#d97706', border: '1px solid rgba(245,158,11,0.4)', fontWeight: 800, whiteSpace: 'nowrap' }}
              title={t('ak.verifiedNoSyncHint','키는 검증됐으나 전용 동기화 어댑터는 연동 예정입니다(데이터는 아직 수집되지 않습니다).')}>🔑 {t('ak.issuanceVerifiedNoSync','키 검증됨·동기화 준비중')}</span>
          ) : isVerified ? (
            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: '#ffe000', color: '#0b2e8a', border: '1px solid #0b2e8a', fontWeight: 900, whiteSpace: 'nowrap' }}
              title={t('ak.verifiedHint','연동허브가 실제 채널 API로 키 발급을 검증했습니다(임의 표기 아님).')}>🎉 {t('ak.issuanceVerified','발급 확인됨')}</span>
          ) : needsVerify ? (
            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.14)', color: '#d97706', border: '1px solid rgba(245,158,11,0.4)', fontWeight: 800, whiteSpace: 'nowrap' }}
              title={t('ak.needVerifyHint','등록됨 — [발급 확인]을 눌러 실제 발급 여부를 검증하세요.')}>🔎 {t('ak.issuanceWait','발급 확인 대기')}</span>
          ) : (
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 20,
              background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, fontWeight: 700, whiteSpace: 'nowrap',
            }}>{status === 'none' ? t('ak.notRegistered','미등록')
                : status === 'partial' ? `⚠️ ${t('ak.partialRegistered','일부 등록')}`
                : (pending ? `✅ ${t('ak.registeredPending','등록·준비중')}` : `✅ ${t('ak.registered','등록됨')}`)}</span>
          )}
        </div>
        {/* [228차] ★발급 신청 현황 — 개요 카드에 신청 상태 표기(자동 폴링으로 실시간 갱신). pending/처리중이면 다음단계 안내. */}
        {apply && (
          <div style={{ marginBottom: 8, padding: '7px 10px', borderRadius: 8, background: applySt.bg, border: `1px solid ${applySt.bd}`, fontSize: 10, lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, color: applySt.c }}>📨 {t('ak.applyBadge','발급 신청')}: {applySt.label}</span>
              {apply.ticket_id && <span style={{ fontFamily: 'monospace', color: 'var(--text-3)', fontSize: 9 }}>{apply.ticket_id}</span>}
            </div>
            {applyOpen && (
              <div style={{ marginTop: 4, color: 'var(--text-2)' }}>
                {oauthProv ? (
                  /* OAuth 채널 — 인가만 하면 발급된 토큰을 플랫폼이 '자동 가져오기'(수취·암호화 저장). 진짜 자동 가져오기. */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span>🔑 {t('ak.applyNextOauth','발급되면 아래 버튼으로 키(토큰)를 자동으로 가져옵니다 — 인가만 하면 즉시 수취·검증·연동됩니다.')}</span>
                    <button onClick={() => onOAuth(oauthProv, ch.key)} style={{
                      padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 10.5, fontWeight: 800,
                      animation: 'akVerifyPulse 1.6s ease-in-out infinite',
                    }}>⚡ {t('ak.fetchIssuedKey','발급된 키 자동 가져오기')}</button>
                  </div>
                ) : ISSUANCE_URL[ch.key] ? (
                  <>👉 {t('ak.applyNextSelf','콘솔에서 키를 발급한 뒤 아래 [등록]에 입력하면 실시간 검증·자동 연동됩니다.')} {' '}
                    <a href={ISSUANCE_URL[ch.key]} target="_blank" rel="noopener noreferrer" style={{ color: applySt.c, fontWeight: 800 }}>{t('ak.openConsole','발급 콘솔 열기')} ↗</a>
                    <div style={{ marginTop: 3, color: 'var(--text-3)', fontSize: 9.5 }}>🔒 {t('ak.noAutoFetch','보안상 발급된 키는 자동으로 가져올 수 없습니다(사용자 콘솔 내부에만 존재) — 직접 등록해야 합니다.')}</div></>
                ) : (
                  <>👉 {t('ak.applyNextAgent','발급 완료 시 [등록]에 키를 입력하면 실시간 검증·자동 연동됩니다.')}</>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onConnect(ch)} aria-label={t('ak.connectBtn','Register credentials')} style={{
            flex: 1.4, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 11, fontWeight: 700,
          }}>🔑 {live ? t('ak.manageBtn','관리') : t('ak.connectBtn','등록')}</button>
          <button onClick={() => onChannelTest(ch.key)} disabled={busy || !live} aria-label={needsVerify ? t('ak.verifyBtn','발급 확인') : t('ak.testBtn','Ping test')} style={{
            flex: 1, padding: '8px 10px', borderRadius: 8,
            border: `1px solid ${needsVerify ? 'rgba(245,158,11,0.55)' : 'rgba(79,142,247,0.25)'}`,
            cursor: (busy || !live) ? 'not-allowed' : 'pointer',
            background: needsVerify ? 'rgba(245,158,11,0.12)' : 'rgba(79,142,247,0.05)',
            color: needsVerify ? '#b45309' : 'var(--text-2)', fontSize: 11, fontWeight: 800, opacity: (busy || !live) ? 0.55 : 1,
            animation: (needsVerify && !busy) ? 'akVerifyPulse 1.4s ease-in-out infinite' : 'none',
          }}>{busy ? `⏳` : (needsVerify ? `🔎 ${t('ak.verifyBtn','발급 확인')}` : `🔌 ${t('ak.testBtn','Test')}`)}</button>
        </div>
        {/* [229차] 발급 매뉴얼 — 키 발급 과정을 초보자도 따라할 수 있게 레이어 팝업으로 안내. */}
        {MANUAL_KEYS.has(ch.key) && (
          <button onClick={() => onManual(ch)} title={t('ak.manualHint','API 키 발급 과정을 단계별로 안내합니다(레이어 팝업).')} style={{
            marginTop: 6, width: '100%', padding: '7px 10px', borderRadius: 8,
            border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
            background: 'rgba(99,102,241,0.06)', color: '#6366f1', fontSize: 10.5, fontWeight: 800,
          }}>📖 {t('ak.manualBtn','발급 매뉴얼 보기')}</button>
        )}
        {/* [현 차수] ★발급 확인 유도 — 등록됐으나 미검증인 라이브검증 채널: 실 발급 검증을 권유(임의 완료 표기 X). */}
        {needsVerify && !busy && (
          <div style={{ marginTop: 7, fontSize: 9.5, color: '#b45309', textAlign: 'center', fontWeight: 700, lineHeight: 1.45 }}>
            🔎 {t('ak.verifyNudge','등록됨 — [발급 확인]을 눌러 발급된 키가 실제 동작하는지 검증하세요. 확인되면 자동으로 발급 확인됨 표시됩니다.')}
          </div>
        )}
        {isVerified && !verifiedNoSync && (
          <div style={{ marginTop: 7, fontSize: 9.5, color: '#16a34a', textAlign: 'center', fontWeight: 800, lineHeight: 1.4 }}>
            🎉 {t('ak.verifiedNudge','발급 확인됨 — 연동허브가 실제 채널 API로 검증했습니다.')}
          </div>
        )}
        {/* [현 차수] 발급 방식 3분기 — OAuth 원클릭 / 콘솔 자가발급(대행 불가 채널) / 진짜 계약형 발급 대행.
           ★YouTube·Twitch 등 ISSUANCE_URL 채널은 운영팀 대행 발급이 불가(자가 콘솔 발급만 가능) →
             "발급 대행 신청"(연락처 폼)으로 빠지지 않도록 "직접 발급·연결"로 분기. */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {oauthProv ? (
            <button onClick={() => onOAuth(oauthProv, ch.key)} title={t('ak.oauthHint','OAuth 인가만 하면 키가 자동 발급·등록되고 즉시 동기화됩니다.')} style={{
              flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.35)', cursor: 'pointer',
              background: 'rgba(34,197,94,0.08)', color: '#16a34a', fontSize: 10.5, fontWeight: 800,
            }}>⚡ {t('ak.oauthConnect','원클릭 연결')}</button>
          ) : ISSUANCE_URL[ch.key] ? (
            <button onClick={() => onApply(ch)} title={t('ak.issueHint','이 채널은 운영팀 대행 발급이 불가합니다. 개발자 콘솔에서 직접 키를 발급한 뒤 [등록]으로 입력하면 즉시 연동됩니다.')} style={{
              flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.35)', cursor: 'pointer',
              background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: 10.5, fontWeight: 800,
            }}>🔗 {t('ak.issueConnectBtn','직접 발급·연결')}</button>
          ) : (
            <button onClick={() => onApply(ch)} title={t('ak.applyHint','운영팀에 발급 대행을 신청합니다. 발급 후 자동 연동됩니다.')} style={{
              flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.35)', cursor: 'pointer',
              background: 'rgba(245,158,11,0.08)', color: '#d97706', fontSize: 10.5, fontWeight: 800,
            }}>📝 {t('ak.applyBtn','발급 대행 신청')}</button>
          )}
        </div>
        {/* [현 차수] 정직성: 전용 동기화 어댑터가 아직 없는 채널은 "연동 예정" 명시(자격증명 저장은 가능, 데이터 동기화는 추후). */}
        {!REAL_ADAPTER.has(ch.key) && (
          <div style={{ marginTop: 7, fontSize: 9.5, color: 'var(--text-3)', textAlign: 'center', opacity: 0.85, lineHeight: 1.4 }}>
            🔌 {t('ak.adapterPlanned','전용 동기화 어댑터 연동 예정 — 자격증명은 미리 저장됩니다')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* [현 차수] ★발급 확인 유도 펄스 애니메이션(키프레임 1회 주입). */}
      <style>{`@keyframes akVerifyPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.0);transform:translateY(0)}50%{box-shadow:0 0 0 4px rgba(245,158,11,0.18);transform:translateY(-1px)}}@keyframes akVerifiedBlink{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      {/* [238차] ★선행조건 안내(정확한 순서): 회사정보 → 채널 API 키. 누락 시 발급신청 전에 먼저 완성하도록 강조. */}
      {missingProfile.length > 0 ? (
        <div data-onboard-cta="profile-company" data-onboard-hint={t('ak.companyPrereqHint', 'API 키 발급신청 전에 회사정보를 먼저 완성하세요(발급 폼에 자동으로 채워집니다)')}
          style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}>🏢</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>① {t('ak.companyPrereqTitle', '회사정보 완성이 필요합니다')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>
              {t('ak.companyPrereqDesc', 'API 키 발급신청·정산에 회사정보가 필요합니다. 먼저 완성하면 발급 폼에 자동으로 채워집니다.')}
              {' '}<span style={{ color: '#d97706', fontWeight: 700 }}>{t('ak.companyMissing', '누락')}: {missingProfile.map((f) => PROFILE_LABELS[f] || f).join(', ')}</span>
            </div>
          </div>
          <button onClick={() => setShowCompany(true)} style={{ flexShrink: 0, padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', fontWeight: 800, fontSize: 12.5 }}>🏢 {t('ak.companyComplete', '회사정보 완성하기')} →</button>
        </div>
      ) : (
        <div style={{ padding: '10px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>✓</span><span style={{ fontWeight: 700 }}>{t('ak.companyDone', '회사정보 완성됨 — 발급신청 시 자동으로 입력됩니다.')}</span>
          <button onClick={() => setShowCompany(true)} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)', cursor: 'pointer', background: 'transparent', color: '#15803d', fontWeight: 700, fontSize: 11.5 }}>{t('ak.companyEdit', '회사정보 수정')}</button>
        </div>
      )}
      {showCompany && <CompanyProfileModal onClose={() => setShowCompany(false)} onSaved={() => {}} />}
      {totalKeys === 0 && (
        <div data-onboard-cta="channel-connect" data-onboard-hint={t('ak.onboardHint','아래 채널 카드의 [등록] 버튼으로 판매·광고 채널 자격증명을 등록하세요')} style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.18)', fontSize: 12, color: 'var(--text-2)' }}>
          🔑 {t('ak.registerHint','아래 채널 카드의 [등록] 버튼으로 판매·광고·물류 채널의 자격증명(액세스 토큰/광고계정/고객ID/광고주ID 등)을 등록하세요. 등록 즉시 연동 현황·라이브 커머스에 반영됩니다.')}
        </div>
      )}
      {grouped.map(({ g, items }) => (
        <div key={g}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-2)', marginBottom: 10, paddingLeft: 2 }}>
            {GROUP_LABELS[g] ? t('ak.group_' + g, GROUP_LABELS[g]) : t('ak.groupOther','기타')} <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>({items.length})</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {items.map(renderCard)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Active Keys — creds table
   ═══════════════════════════════════════════════════════════════════ */
function ActiveKeysTab({ creds, channels, loading, onTest, onDelete, onAddClick, testingId, deletingId, t }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading','Loading…')}</div>;
  if (creds.length === 0) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center', borderRadius: 16, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>🔑</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t('ak.emptyTitle','No credentials registered yet')}</div>
        <button onClick={onAddClick} style={{
          marginTop: 14, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12
        }}>➕ {t('ak.addBtn','Add Key')}</button>
      </div>
    );
  }

  const chMap = Object.fromEntries(channels.map(c => [c.key, c]));

  return (
    <div style={{ borderRadius: 16, padding: 0, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'rgba(79,142,247,0.06)', textAlign: 'left' }}>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colChannel','Channel')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colKeyName','Key Name')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colValue','Value (masked)')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colStatus','Status')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)' }}>{t('ak.colLastTest','Last Tested')}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-2)', textAlign: 'right' }}>{t('ak.colActions','Actions')}</th>
          </tr>
        </thead>
        <tbody>
          {creds.map(c => {
            const ch = chMap[c.channel] || { name: c.channel, icon: '❓', color: '#94a3b8' };
            // [228차 hotfix] test_status 가 'untested'(DB 디폴트) 등 STATUS_COLORS 미정의 값이면 undefined→sc.bg 크래시.
            //   알 수 없는 상태는 'none' 스타일로 폴백(활성키 탭 System Error 근본수정).
            const sc = STATUS_COLORS[c.test_status] || STATUS_COLORS.none;
            const busyT = testingId === c.id;
            const busyD = deletingId === c.id;
            return (
              <tr key={c.id} style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ marginRight: 6 }} aria-hidden>{ch.icon}</span>
                  <span style={{ fontWeight: 700 }}>{ch.name}</span>
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace' }}>{c.key_name}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--text-3)' }}>{c.key_value_masked || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, fontWeight: 700 }}>
                    {(c.test_status || t('ak.statusUntested','untested')).toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 11 }}>
                  {c.last_tested_at ? new Date(c.last_tested_at).toLocaleString() : '—'}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button onClick={() => onTest(c.id)} disabled={busyT} aria-label={t('ak.testBtn','Ping test')} style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: busyT ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 10, fontWeight: 700,
                    marginRight: 6, opacity: busyT ? 0.6 : 1
                  }}>{busyT ? '⏳' : '🔌'} {t('ak.testBtn','Test')}</button>
                  <button onClick={() => onDelete(c.id)} disabled={busyD} aria-label={t('ak.deleteBtn','Delete credential')} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                    cursor: busyD ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.06)', color: '#dc2626',
                    fontSize: 10, fontWeight: 700, opacity: busyD ? 0.6 : 1
                  }}>{busyD ? '⏳' : '🗑️'} {t('ak.deleteBtn','Delete')}</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Rotation Log — last_tested_at 기반 simple history
   ═══════════════════════════════════════════════════════════════════ */
function HistoryTab({ creds, loading, t }) {
  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>{t('ak.loading','Loading…')}</div>;
  const tested = creds
    .filter(c => c.last_tested_at)
    .slice()
    .sort((a, b) => String(b.last_tested_at).localeCompare(String(a.last_tested_at)))
    .slice(0, 30);
  if (tested.length === 0) {
    return (
      <div style={{ padding: '48px 28px', textAlign: 'center', borderRadius: 16, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>📜</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{t('ak.historyEmpty','No test history yet')}</div>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 16, padding: 18, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>{t('ak.historyTitle','Recent Test History (top 30)')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tested.map(c => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(0,0,0,0.02)', fontSize: 11
          }}>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-3)', minWidth: 140 }}>
              {new Date(c.last_tested_at).toLocaleString()}
            </span>
            <span style={{ fontWeight: 700, flex: 1 }}>{c.channel}</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-3)' }}>{c.key_name}</span>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 6,
              background: (STATUS_COLORS[c.test_status] || STATUS_COLORS.none).bg,
              color:      (STATUS_COLORS[c.test_status] || STATUS_COLORS.none).fg, fontWeight: 700
            }}>{(c.test_status || 'untested').toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab: Settings — placeholder (별도 backend endpoint 미신설)
   ═══════════════════════════════════════════════════════════════════ */
function SettingsTab({ t }) {
  return (
    <div style={{ borderRadius: 16, padding: 28, background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>{t('ak.settingsTitle','Credential Settings')}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
        {t('ak.settingsDesc','Auto-rotation and notification policies for stored credentials')}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: 12, lineHeight: 1.9 }}>
        <li>{t('ak.settingItem1','Auto-rotation scheduling — coming soon (backend endpoint pending)')}</li>
        <li>{t('ak.settingItem2','Expiry alerts — coming soon')}</li>
        <li>{t('ak.settingItem3','Usage analytics per key — coming soon')}</li>
        <li>{t('ak.settingItem4','Revoke & regenerate — coming soon')}</li>
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modal: Add Credential
   ═══════════════════════════════════════════════════════════════════ */
function AddCredModal({ channels, onClose, onSubmit, t }) {
  const [form, setForm] = useState({
    channel: channels[0]?.key || '', cred_type: 'api_key',
    label: '', key_name: '', key_value: '', note: ''
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.channel || !form.key_name) {
      alert(t('ak.requiredFields','Channel and key_name are required'));
      return;
    }
    setBusy(true);
    const ok = await onSubmit(form);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 520, width: '90%', padding: 28, borderRadius: 16,
        background: 'var(--card-bg, #fff)', border: '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>🔑 {t('ak.addModalTitle','Add Credential')}</div>

        <Field label={t('ak.fieldChannel','Channel')}>
          <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })} style={fieldStyle}>
            {channels.map(c => <option key={c.key} value={c.key}>{c.icon} {c.name}</option>)}
          </select>
        </Field>

        <Field label={t('ak.fieldCredType','Type')}>
          <select value={form.cred_type} onChange={e => setForm({ ...form, cred_type: e.target.value })} style={fieldStyle}>
            <option value="api_key">api_key</option>
            <option value="oauth_token">oauth_token</option>
            <option value="hmac">hmac</option>
            <option value="webhook_url">webhook_url</option>
          </select>
        </Field>

        <Field label={t('ak.fieldLabel','Label (optional)')}>
          <input type="text" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={fieldStyle} />
        </Field>

        <Field label={t('ak.fieldKeyName','Key Name *')}>
          <input type="text" value={form.key_name} onChange={e => setForm({ ...form, key_name: e.target.value })} style={fieldStyle} placeholder="ACCESS_TOKEN" />
        </Field>

        <Field label={t('ak.fieldKeyValue','Key Value (stored as plain — masked on read)')}>
          <input type="password" value={form.key_value} onChange={e => setForm({ ...form, key_value: e.target.value })} style={fieldStyle} autoComplete="new-password" />
        </Field>

        <Field label={t('ak.fieldNote','Note (optional)')}>
          <input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={fieldStyle} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, ...btnGhost }}>{t('ak.cancel','Cancel')}</button>
          <button onClick={submit} disabled={busy} style={{ flex: 1, ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? `⏳ ${t('ak.saving','Saving…')}` : `💾 ${t('ak.save','Save')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modal: Registry Add — 212차 #6 관리자 채널 추가(카테고리 자동분류)
   카테고리(8종) 선택 → 해당 섹션에 자동 배치. 코드 수정 없이 신규 채널 등록.
   ═══════════════════════════════════════════════════════════════════ */
function RegistryAddModal({ onClose, onSubmit }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ key: '', name: '', icon: '🔗', color: '#6366f1', group: 'domestic', fields: 'api_key' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = async () => { setBusy(true); await onSubmit(form); setBusy(false); };
  const inp = { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.15)', fontSize: 13, outline: 'none', color: '#1e293b', background: '#fff', boxSizing: 'border-box' };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 4, marginTop: 10 };
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px,92vw)', maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: '#1e293b', marginBottom: 4 }}>+ {t('ak.regAddChannelBtn','채널 추가 (관리자)')}</div>
        <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 8 }}>{t('ak.regAddSub','선택한 카테고리 섹션에 자동 분류되어 즉시 등록 UI 에 노출됩니다.')}</div>
        {/* [228차 S4] ★정직 안내 — 신규 채널은 자격증명 저장은 되나 전용 fetch 어댑터가 없어 '자동 수집'은 안 됨(push 경로만). */}
        {(() => {
          const sk = ['domestic', 'global_commerce', 'd2c'].includes(form.group) ? 'commerce' : (form.group === 'global_ad' ? 'ad' : 'none');
          return (
            <div style={{ margin: '4px 0 8px', padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, lineHeight: 1.65, color: '#92400e' }}>
              ⚠️ <b>정직 안내</b>: 추가된 채널은 <b>자격증명 저장·카드 노출</b>은 되지만, 전용 동기화 어댑터가 구현되기 전까지 <b>자동 데이터 수집은 되지 않습니다</b>(카드에 "🔌 연동 예정" 표기).
              {sk === 'ad' && <><br />· 광고 성과는 <code style={{ fontFamily: 'monospace' }}>POST /v424/connectors/ad-metrics</code> 로 push 하면 즉시 적재됩니다.</>}
              {sk === 'commerce' && <><br />· 주문/상품은 채널 웹훅(<code style={{ fontFamily: 'monospace' }}>/api/channel-sync/webhooks/{form.key || '{channel}'}</code>)으로 push 하면 적재됩니다.</>}
              {sk === 'none' && <><br />· 이 카테고리는 자격증명 보관 전용입니다(동기화 어댑터 별도 구현 필요).</>}
            </div>
          );
        })()}
        <label style={lbl}>{t('ak.regKeyLabel','채널 키 (영문소문자/숫자/_)')}</label>
        <input style={inp} value={form.key} onChange={e => set('key', e.target.value)} placeholder={t('ak.regKeyPh','예: cafe24_global')} />
        <label style={lbl}>{t('ak.regNameLabel','표시명')}</label>
        <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('ak.regNamePh','예: Cafe24 글로벌')} />
        <label style={lbl}>{t('ak.regCategoryLabel','카테고리')}</label>
        <select style={inp} value={form.group} onChange={e => set('group', e.target.value)}>
          {GROUP_ORDER.map(g => <option key={g} value={g}>{t('ak.group_' + g, GROUP_LABELS[g])}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={lbl}>{t('ak.regIconLabel','아이콘(이모지)')}</label><input style={inp} value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="🔗" /></div>
          <div style={{ flex: 1 }}><label style={lbl}>{t('ak.regColorLabel','색상(hex)')}</label><input style={inp} value={form.color} onChange={e => set('color', e.target.value)} placeholder="#6366f1" /></div>
        </div>
        <label style={lbl}>{t('ak.regFieldsLabel','자격증명 필드 키 (쉼표 구분)')}</label>
        <input style={inp} value={form.fields} onChange={e => set('fields', e.target.value)} placeholder={t('ak.regFieldsPh','예: api_key,secret_key')} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{t('ak.regCancelBtn','취소')}</button>
          <button onClick={submit} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? t('ak.regAdding','추가 중...') : t('ak.regAddBtn','추가')}</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modal: Connect — 채널별 구조화 자격증명 등록 (208차)
   ═══════════════════════════════════════════════════════════════════ */
/* [현 차수] 광고 매체(집행 활성화 시 결제수단 필요) 채널 — 단계 가이드의 추가 안내용. */
const AD_EXEC_CHANNELS = new Set(['meta_ads', 'google_ads', 'tiktok_business', 'naver_sa', 'kakao_moment', 'line_ads']);

/* [현 차수] ★초보자용 "3단계 따라하기" 가이드 — 연동허브 ConnectModal 상단에 노출.
   기존 발급 시스템(ISSUANCE_URL 콘솔·MANUAL HTML·hasLiveVerify·OAuth)을 단계 흐름으로 재구성해
   "자격증명만 등록하면 바로 실행"되는 경로를 명확히 안내한다(중복 시스템 신설 아님 — 기존 데이터 재사용). */
function ConnectStepGuide({ channel, t, uiLang }) {
  const consoleUrl = ISSUANCE_URL[channel.key];
  const hasManual = MANUAL_KEYS.has(channel.key);
  const hasOAuth = !!OAUTH_PROVIDER[channel.key];
  const liveVerify = LIVE_VERIFY_CHANNELS.has(channel.key);
  const isAd = AD_EXEC_CHANNELS.has(channel.key);

  const Step = ({ n, title, children }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#4f8ef7)', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-1)', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.55 }}>{children}</div>
      </div>
    </div>
  );
  const linkBtn = (href, label, color) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 6, marginRight: 6, fontSize: 11, fontWeight: 800, color, textDecoration: 'none', padding: '5px 10px', border: `1px solid ${color}55`, borderRadius: 8 }}>{label}</a>
  );

  return (
    <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(79,142,247,0.04))', border: '1px solid rgba(99,102,241,0.2)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 900, color: '#6366f1', marginBottom: 12 }}>
        🚀 {t('ak.csgTitle', '3단계만 따라 하면 연동 완료 — 자격증명만 등록하면 바로 실행됩니다')}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <Step n={1} title={hasOAuth
          ? t('ak.csgStep1Oauth', '발급 콘솔에서 키 발급 (또는 OAuth 원클릭 연결)')
          : t('ak.csgStep1', '발급 콘솔에서 키(자격증명) 발급')}>
          {t('ak.csgStep1Desc', '아래 버튼으로 발급 콘솔을 열고, 매뉴얼을 따라 키를 발급하세요.')}
          <div>
            {consoleUrl && linkBtn(consoleUrl, '🔑 ' + t('ak.openConsole', '발급 콘솔 열기') + ' ↗', '#4f8ef7')}
            {hasManual && linkBtn(manualUrl(channel.key, uiLang), '📖 ' + t('ak.manualBtn', '발급 매뉴얼'), '#6366f1')}
            {signupUrl(channel.key) && linkBtn(signupUrl(channel.key), '🔗 ' + t('ak.signupShort', '가입'), '#9333ea')}
          </div>
        </Step>
        <Step n={2} title={t('ak.csgStep2', '발급받은 값을 아래 칸에 붙여넣고 저장')}>
          {t('ak.csgStep2Desc', '필수(✗ 미등록) 항목을 모두 채우면 됩니다. 값은 AES-256-GCM 암호화 저장됩니다.')}
        </Step>
        <Step n={3} title={t('ak.csgStep3', '저장 즉시 자동 연동·실행')}>
          {liveVerify
            ? t('ak.csgStep3Live', '저장과 동시에 실제 채널 API로 키 유효성을 검증하고, 통과하면 즉시 데이터 수집·동기화가 시작됩니다. 추가 작업이 필요 없습니다.')
            : t('ak.csgStep3Std', '저장과 동시에 자동 동기화가 시작되어 대시보드·정산 등 관련 기능에 바로 반영됩니다.')}
        </Step>
      </div>
      {isAd && (
        <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, color: '#b45309', lineHeight: 1.55 }}>
          💳 {t('ak.csgAdBilling', '광고 매체는 자격증명 등록 후 성과 수집·자동 최적화가 바로 동작합니다. 실제 광고를 켜서 집행하려면 결제수단 등록이 필요합니다 — ')}
          <a href="/payment-methods" style={{ color: '#d97706', fontWeight: 800 }}>{t('ak.csgAdBillingLink', '결제수단 등록 →')}</a>
        </div>
      )}
    </div>
  );
}

function ConnectModal({ channel, onClose, onSubmit, t, extraFields = {}, postOauth = false, registeredKeys, verifiedKeys }) {
  const fields = CHANNEL_FIELDS[channel.key] || extraFields[channel.key] || DEFAULT_FIELDS;
  const { lang: uiLang } = useI18n();
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); // [현 차수 P0] 필수 필드 누락 검증 메시지
  // [227차] OAuth 직후 모드: 토큰성 필드는 "자동 등록됨"으로 표시, 회원은 계정 ID 등 잔여 필드만 입력.
  const remainFields = postOauth ? fields.filter(f => !OAUTH_COVERED_KEYS.has(f.k)) : fields;
  const coveredFields = postOauth ? fields.filter(f => OAUTH_COVERED_KEYS.has(f.k)) : [];
  // [현 차수] ★item 2: 어떤 자격증명이 등록/미등록인지 필드별 표기. registeredKeys=실제 저장된 key_name 집합.
  const reg = registeredKeys instanceof Set ? registeredKeys : new Set();
  const verified = verifiedKeys instanceof Set ? verifiedKeys : new Set();
  const regN = remainFields.filter(f => reg.has(f.k)).length;
  const missList = remainFields.filter(f => !reg.has(f.k));

  const submit = async () => {
    // [현 차수 P0] 채널별 필수 자격증명 검증 — 부분 입력 저장→sync 무음실패→원인불명을 사전 차단.
    //   이미 등록된(reg) 필드는 비워도 유지되므로 충족으로 간주. 선택 필드(opt/'선택')는 제외.
    //   저장 후에도 충족되지 않는 필수 필드가 있으면 어느 항목인지 명시하고 저장 보류.
    const missingRequired = remainFields.filter(f =>
      !isOptionalField(f) && !reg.has(f.k) && !String(vals[f.k] || '').trim()
    );
    if (missingRequired.length > 0) {
      setErr(t('ak.requiredMissing', {
        fields: missingRequired.map(f => f.label).join(', '),
        defaultValue: `다음 필수 항목을 모두 입력해야 정상 연동·동기화됩니다: ${missingRequired.map(f => f.label).join(', ')}`,
      }));
      return;
    }
    setErr('');
    setBusy(true);
    const ok = await onSubmit(channel.key, channel.name, vals);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 520, width: '90%', maxHeight: '88vh', overflowY: 'auto', padding: 28, borderRadius: 16,
        background: 'var(--card-bg, #fff)', border: '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }} aria-hidden>{channel.icon}</span>
          <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>{channel.name} {t('ak.connectTitle','연동 등록')}</div>
          {MANUAL_KEYS.has(channel.key) && (
            <a href={manualUrl(channel.key, uiLang)} target="_blank" rel="noopener noreferrer" title={t('ak.manualHint','API 키 발급 과정을 단계별로 안내합니다.')} style={{ fontSize: 11.5, fontWeight: 800, color: '#6366f1', textDecoration: 'none', padding: '5px 9px', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, whiteSpace: 'nowrap' }}>📖 {t('ak.manualBtn','발급 매뉴얼')}</a>
          )}
          {signupUrl(channel.key) && (
            <a href={signupUrl(channel.key)} target="_blank" rel="noopener noreferrer" title={t('ak.signupHint2','이 채널 계정이 없으면 먼저 가입하세요.')} style={{ fontSize: 11.5, fontWeight: 800, color: '#9333ea', textDecoration: 'none', padding: '5px 9px', border: '1px solid rgba(147,51,234,0.3)', borderRadius: 8, whiteSpace: 'nowrap' }}>🔗 {t('ak.signupShort','가입')}</a>
          )}
        </div>
        {/* [현 차수] ★초보자용 3단계 따라하기 가이드 — 자격증명만 등록하면 바로 실행되는 경로 안내. */}
        <ConnectStepGuide channel={channel} t={t} uiLang={uiLang} />
        {postOauth && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.28)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#16a34a', marginBottom: 4 }}>✅ {t('ak.oauthDoneTitle', { ch: channel.name, defaultValue: `${channel.name} OAuth 인증 완료!` })}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>{t('ak.oauthDoneDesc', '토큰은 자동 등록되었습니다. 동기화를 위해 아래 계정 정보만 입력하면 바로 연동·실행됩니다.')}</div>
            {coveredFields.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {coveredFields.map(f => (
                  <span key={f.k} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(34,197,94,0.14)', color: '#16a34a' }}>✓ {f.label} {t('ak.autoRegistered','자동 등록됨')}</span>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>
          {postOauth
            ? t('ak.connectSubOauth','아래 계정 식별 정보를 입력하세요. 값은 AES-256-GCM으로 암호화 저장됩니다.')
            : t('ak.connectSub','필요한 자격증명을 입력하세요. 값은 AES-256-GCM으로 암호화 저장되며 조회 시 마스킹됩니다. 입력한 항목만 저장됩니다.')}
        </div>
        {/* [현 차수] ★item 2: 등록/미등록 요약 — 일부만 등록한 경우 어느 항목이 등록·미등록인지 명시. */}
        {!postOauth && regN > 0 && (
          <div style={{ marginBottom: 16, padding: '11px 13px', borderRadius: 12,
            background: regN >= remainFields.length ? 'rgba(34,197,94,0.07)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${regN >= remainFields.length ? 'rgba(34,197,94,0.28)' : 'rgba(245,158,11,0.3)'}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: regN >= remainFields.length ? '#16a34a' : '#b45309', marginBottom: missList.length ? 5 : 0 }}>
              {regN >= remainFields.length
                ? `✓ ${t('ak.allFieldsRegistered','모든 자격증명 항목이 등록되어 있습니다')}`
                : `🔑 ${regN}/${remainFields.length} ${t('ak.registered','등록')} — ${t('ak.someMissing','일부 미등록')}`}
            </div>
            {missList.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {t('ak.missingLabel','미등록')}: <b>{missList.map(f => f.label).join(', ')}</b><br/>
                {t('ak.fillMissingHint','아래에서 미등록(✗) 항목을 입력해 저장하면 연동이 완성됩니다. 이미 등록된 항목은 비워두면 유지됩니다.')}
              </div>
            )}
          </div>
        )}
        {remainFields.map(f => {
          const isReg = reg.has(f.k);
          const isVerified = verified.has(f.k);
          return (
            <Field key={f.k} label={(
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{f.label}{f.secret ? ' 🔒' : ''}</span>
                {isReg
                  ? <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', background: 'rgba(34,197,94,0.12)', padding: '1px 8px', borderRadius: 20 }}>✓ {isVerified ? t('ak.fieldVerified','등록·확인됨') : t('ak.fieldRegistered','등록됨')}</span>
                  : <span style={{ fontSize: 10, fontWeight: 800, color: '#d97706', background: 'rgba(245,158,11,0.12)', padding: '1px 8px', borderRadius: 20 }}>✗ {t('ak.fieldMissing','미등록')}</span>}
              </span>
            )}>
              <input type={f.secret ? 'password' : 'text'} value={vals[f.k] || ''} autoComplete="new-password"
                onChange={e => { setVals(v => ({ ...v, [f.k]: e.target.value })); if (err) setErr(''); }} style={fieldStyle}
                placeholder={isReg
                  ? (f.secret ? t('ak.regKeepHint','등록됨 — 변경하려면 새 값 입력(비우면 유지)') : t('ak.regKeepHintPlain','등록됨 — 변경 시에만 입력(비우면 유지)'))
                  : f.k} />
            </Field>
          );
        })}
        {err && (
          <div role="alert" style={{ marginTop: 14, padding: '10px 13px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.32)', fontSize: 12, color: '#dc2626', lineHeight: 1.55, fontWeight: 600 }}>
            ⚠️ {err}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, ...btnGhost }}>{t('ak.cancel','Cancel')}</button>
          <button onClick={submit} disabled={busy} style={{ flex: 1, ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? `⏳ ${t('ak.saving','Saving…')}` : `💾 ${t('ak.save','Save')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   [229차] Modal: 발급 매뉴얼 (레이어 팝업) — public/api_manuals/<key>.html 을 iframe 로 표시.
   매뉴얼은 자체 완결 HTML(전역 CSS 포함)이라 iframe 격리로 앱 스타일 충돌을 방지한다.
   ═══════════════════════════════════════════════════════════════════ */
function ManualModal({ channel, onClose, t }) {
  const { lang } = useI18n();
  const url = manualUrl(channel.key, lang);
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9,5,20,0.86)', backdropFilter: 'blur(10px)', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 980, height: '92vh', display: 'flex', flexDirection: 'column',
        background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#0f172a' }}>
          <span style={{ fontSize: 20 }} aria-hidden>{channel.icon || '📖'}</span>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', flex: 1 }}>{channel.name} {t('ak.manualTitle','발급 매뉴얼')}</div>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', textDecoration: 'none', padding: '6px 10px' }}>{t('ak.openNewTab','새 탭에서 열기')} ↗</a>
          <button onClick={onClose} aria-label={t('ak.close','닫기')} style={{ fontSize: 18, fontWeight: 900, color: '#fff', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer' }}>×</button>
        </div>
        <iframe src={url} title={`${channel.name} manual`} style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Modal: Apply for new key
   ═══════════════════════════════════════════════════════════════════ */
function ApplyModal({ channel, currentUser, onClose, onSubmit, onRegister, t }) {
  // [현 차수] ★발급 따라하기 가이드 — 현재 UI 언어(15개국)로 표시. lang 미존재 시 en→ko 폴백.
  const { lang } = useI18n();
  const guideSteps = getIssuanceGuide(channel.key, lang);
  // [현 차수] ★발급 신청자(구독 회원) 정보 자동 불러오기 — 로그인 프로필에서 선채움 + 수정 가능.
  const fromUser = useCallback((u) => {
    const p = (u && u.profile) || {};
    return {
      name: u?.name || '',
      email: u?.email || '',
      businessNumber: p.business_number || u?.business_number || u?.businessNumber || '',
      phone: p.phone || u?.phone || u?.contact || '',
      company: p.company || u?.company || '',
      // [255차 갭1] 회사정보 5필수(profileComplete SSOT)와 정합 — 대표자명·주소 재사용(쿠팡/롯데온/아마존 사업자인증 신청에 필요).
      ceoName: p.ceo_name || u?.ceo_name || u?.ceoName || '',
      address: p.address || u?.address || '',
    };
  }, []);
  const [info, setInfo] = useState(() => fromUser(currentUser));
  // 모달이 다른 채널로 다시 열리거나 로그인 정보가 늦게 로드되면 자동완성 동기화(사용자가 직접 입력하기 전까지).
  useEffect(() => { setInfo(prev => (prev.name || prev.email || prev.company) ? prev : fromUser(currentUser)); }, [currentUser, fromUser]);
  // [현 차수] 채널별 발급 필요 정보(계정/식별) — 발급 신청 시 함께 접수. 미정의/향후 채널은 기본 세트.
  const applyFieldKeys = CHANNEL_APPLY_FIELDS[channel.key] || DEFAULT_APPLY_FIELDS;
  const [extra, setExtra] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    // [현 차수] ★정보 누락으로 발급 실패가 절대 없도록 — 채널별 필수 발급정보 + 필수 회원정보 전수 검증.
    if (!info.email) { alert(t('ak.emailRequired','이메일은 필수입니다')); return; }
    if (!info.name)  { alert(t('ak.nameRequired','담당자 이름은 필수입니다')); return; }
    if (!info.company) { alert(t('ak.companyRequired','회사명은 필수입니다')); return; }
    // [255차 갭2] "회사정보 완성" 게이트(profileComplete 5필수)와 정합 — 사업자번호·대표자명·연락처·주소 전수 필수.
    //   (발급 콘솔 신청서가 요구하는 사업자 인증 항목 누락으로 신청이 반려되지 않도록 함.)
    const reqCompany = [
      ['businessNumber', t('ak.applyBiznum','사업자 번호')],
      ['ceoName',        t('ak.applyCeo','대표자명')],
      ['phone',          t('ak.applyPhone','연락처')],
      ['address',        t('ak.applyAddress','사업장 주소')],
    ].filter(([k]) => !String(info[k] || '').trim());
    if (reqCompany.length) {
      alert(t('ak.applyMissingCompany', { fields: reqCompany.map(([,l]) => l).join(', '), defaultValue: `다음 회사정보를 입력하세요: ${reqCompany.map(([,l]) => l).join(', ')}` }));
      return;
    }
    const missing = applyFieldKeys.filter(fk => !String(extra[fk] || '').trim());
    if (missing.length) {
      const labels = missing.map(fk => { const d = APPLY_FIELD_DEFS[fk] || { def: fk }; return d.i18n ? t(d.i18n, d.def) : d.def; });
      alert(t('ak.applyMissingFields', { fields: labels.join(', '), defaultValue: `다음 발급 필수 정보를 입력하세요: ${labels.join(', ')}` }));
      return;
    }
    setBusy(true);
    // 채널별 발급 필요 정보를 extra 로 함께 전달.
    await onSubmit(channel.key, { ...info, extra });
    setBusy(false);
  };

  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9,5,20,0.85)', backdropFilter: 'blur(10px)'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 480, width: '90%', padding: 28, borderRadius: 16,
        background: 'var(--card-bg, #fff)', border: '1px solid rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 28 }} aria-hidden>{channel.icon}</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{ISSUANCE_URL[channel.key]
              ? t('ak.issueModalTitle', { ch: channel.name, defaultValue: `${channel.name} API 키 발급·연결` })
              : t('ak.applyModalTitle', { ch: channel.name, defaultValue: `${channel.name} API 키 발급 신청` })}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
              {t('ak.applyModalSub','발급 후 자동 연동됩니다. 이미 키가 있으면 [등록]에서 바로 입력하세요.')}
            </div>
          </div>
        </div>

        {/* [현 차수] 체험 데모 모드: 발급 신청 불가 안내 배너 */}
        {_IS_DEMO_ENV && (
          <div role="status" style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', fontSize: 11.5, color: '#ca8a04', fontWeight: 700 }}>
            ⚠️ {t('ak.applyDemoBlocked','체험 데모 모드에서는 API 키 발급 신청이 되지 않습니다. 실제 계정으로 로그인 후 신청해 주세요.')}
          </div>
        )}

        {/* [현 차수] ★채널별 발급 제약·안내문 (웹 검증 반영) — 발급 실패/지연 사전 예방. hard=경고 강조. */}
        {CHANNEL_APPLY_NOTE[channel.key] && (() => {
          const n = CHANNEL_APPLY_NOTE[channel.key];
          const hard = n.hard;
          return (
            <div role="note" style={{
              marginBottom: 16, padding: '11px 13px', borderRadius: 10, lineHeight: 1.65, fontSize: 11.5,
              background: hard ? 'rgba(239,68,68,0.07)' : 'rgba(245,158,11,0.07)',
              border: `1px solid ${hard ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
              color: hard ? '#b91c1c' : '#b45309', fontWeight: 600,
            }}>
              {hard ? '🚫' : 'ℹ️'} <b>{hard ? t('ak.noteRestrict', '발급 제약 안내') : t('ak.noteGuide', '발급 안내')}</b><br />
              {t('ak.note.' + channel.key, n.note)}
            </div>
          );
        })()}

        {/* [현 차수] 요청: 채널 계정 "바로 가입" — 아직 계정이 없는 이용자가 즉시 가입(회원/셀러/개발자 등록)하도록 안내.
           발급(콘솔) 이전 단계. signupUrl = 가입 페이지 우선, 없으면 발급 콘솔(가입 겸용) 폴백. */}
        {signupUrl(channel.key) && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.22)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#9333ea', marginBottom: 6 }}>
              👤 {t('ak.signupTitle', { ch: channel.name, defaultValue: `${channel.name} 계정이 아직 없으신가요?` })}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 9 }}>
              {t('ak.signupDesc', { ch: channel.name, defaultValue: `API 키를 발급하려면 먼저 ${channel.name} 계정(판매자/개발자 등록)이 필요합니다. 아래 버튼으로 바로 가입하세요.` })}
            </div>
            <button onClick={() => { try { window.open(signupUrl(channel.key), '_blank', 'noopener,noreferrer'); } catch { /* popup 차단 무시 */ } }}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
              🔗 {t('ak.signupBtn', { ch: channel.name, defaultValue: `${channel.name} 가입하러 가기` })} ↗
            </button>
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 7, lineHeight: 1.5 }}>
              {t('ak.signupHint','이미 계정이 있으면 이 단계를 건너뛰고 아래에서 키를 발급·등록하세요.')}
            </div>
          </div>
        )}

        {/* [현 차수] ★발급 따라하기 — 초보자가 그대로 따라하면 발급되는 상세 단계(현재 UI 언어로 표시). */}
        {guideSteps && guideSteps.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.22)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>
              ✅ {t('ak.howToTitle', { ch: channel.name, defaultValue: `${channel.name} 발급 따라하기 (이대로만 따라하면 발급됩니다)` })}
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 7 }}>
              {guideSteps.map((s, i) => (
                <li key={i} style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{s}</li>
              ))}
            </ol>
            {ISSUANCE_URL[channel.key] && (
              <button onClick={() => { try { window.open(ISSUANCE_URL[channel.key], '_blank', 'noopener,noreferrer'); } catch { /* popup 차단 무시 */ } }}
                style={{ width: '100%', marginTop: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                🔗 {t('ak.openConsoleNow', '발급 콘솔 바로 열기')}
              </button>
            )}
          </div>
        )}

        {/* [현 차수] 요청2: 개별 발급 채널 — 해당 채널 발급 콘솔로 바로 접속해 직접 발급(자동접속). */}
        {ISSUANCE_URL[channel.key] && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
              {t('ak.applyDirect', { ch: channel.name, defaultValue: `① ${channel.name} 발급 콘솔에서 직접 발급 (즉시)` })}
            </div>
            <button onClick={() => { try { window.open(ISSUANCE_URL[channel.key], '_blank', 'noopener,noreferrer'); } catch { /* popup 차단 무시 */ } }}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.35)', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontSize: 12, fontWeight: 800 }}>
              🔗 {t('ak.openIssueConsole', { ch: channel.name, defaultValue: `${channel.name} 발급 콘솔 바로가기` })}
            </button>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 7, lineHeight: 1.6 }}>
              {t('ak.applyConsoleHint','콘솔에서 발급한 키를 복사해 [등록] 버튼으로 입력하면 즉시 연동·실행됩니다.')}
            </div>
            {onRegister && (
              <button onClick={() => onRegister(channel)} style={{ width: '100%', marginTop: 9, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
                ✅ {t('ak.alreadyIssued', '발급받았어요 — 키 바로 등록하기')}
              </button>
            )}
          </div>
        )}
        {/* [227차] ISSUANCE_URL 없는 채널(계약형 등)도 이미 키가 있으면 바로 등록 가능 */}
        {!ISSUANCE_URL[channel.key] && onRegister && (
          <button onClick={() => onRegister(channel)} style={{ width: '100%', marginBottom: 14, padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,0.35)', cursor: 'pointer', background: 'rgba(34,197,94,0.08)', color: '#16a34a', fontSize: 12, fontWeight: 800 }}>
            ✅ {t('ak.alreadyHaveKey', '이미 발급받은 키가 있으면 — 바로 등록하기')}
          </button>
        )}

        {/* [현 차수] ★발급 신청 폼 — 모든 채널 공통 노출(요청). 신청자(구독 회원) 정보 자동완성 + 수정 가능.
           ISSUANCE_URL 채널은 위 ① 콘솔 자가발급도 병행 가능. 계정 ID/비밀번호가 아닌 발급받은 키/식별정보를 입력. */}
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
          {ISSUANCE_URL[channel.key]
            ? t('ak.applyOrRequest','② 또는 아래 정보로 발급 대행을 신청하세요 (발급 후 자동 연동)')
            : t('ak.applyRequest','발급 신청 정보를 입력하세요 (발급 후 자동 연동)')}
        </div>

        {/* 해당 채널 API 키 발급에 필요한 정보 입력 */}
        <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(79,142,247,0.05)', border: '1px solid rgba(79,142,247,0.15)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#4f8ef7', marginBottom: 8 }}>
            🔑 {t('ak.applyChannelInfo', { ch: channel.name, defaultValue: `${channel.name} 발급에 필요한 정보` })}
          </div>
          {applyFieldKeys.map(fk => {
            const def = APPLY_FIELD_DEFS[fk] || { i18n: '', def: fk };
            return (
              <Field key={fk} label={(def.i18n ? t(def.i18n, def.def) : def.def) + ' *'}>
                <input type="text" value={extra[fk] || ''} onChange={e => setExtra(v => ({ ...v, [fk]: e.target.value }))} style={fieldStyle} />
              </Field>
            );
          })}
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.5 }}>
            ⚠️ {t('ak.applyAllRequired','* 표시는 모두 필수입니다. 누락 시 발급이 지연·실패할 수 있어 전부 입력해야 신청됩니다.')}
          </div>
        </div>

        {/* [현 차수] ★신청자(구독 회원) 정보 — 로그인 프로필 자동완성 + 수정 가능 + [내 정보 불러오기] */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>{t('ak.applyContactInfo','신청자(회원) 정보')}</div>
          <button type="button" onClick={() => setInfo(fromUser(currentUser))} title={t('ak.loadMyInfoHint','로그인한 회원 정보를 다시 불러옵니다')}
            style={{ padding: '3px 9px', borderRadius: 7, border: '1px solid rgba(79,142,247,0.35)', cursor: 'pointer', background: 'rgba(79,142,247,0.08)', color: '#4f8ef7', fontSize: 10.5, fontWeight: 800 }}>
            👤 {t('ak.loadMyInfo','내 정보 불러오기')}
          </button>
        </div>
        <Field label={t('ak.applyName','담당자 이름') + ' *'}>
          <input type="text" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyEmail','이메일 *')}>
          <input type="email" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyCompany','회사명') + ' *'}>
          <input type="text" value={info.company} onChange={e => setInfo({ ...info, company: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyCeo','대표자명') + ' *'}>
          <input type="text" value={info.ceoName} onChange={e => setInfo({ ...info, ceoName: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyBiznum','사업자 번호') + ' *'}>
          <input type="text" value={info.businessNumber} onChange={e => setInfo({ ...info, businessNumber: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyPhone','연락처') + ' *'}>
          <input type="tel" value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} style={fieldStyle} />
        </Field>
        <Field label={t('ak.applyAddress','사업장 주소') + ' *'}>
          <input type="text" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} style={fieldStyle} />
        </Field>

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, ...btnGhost }}>{t('ak.cancel','Cancel')}</button>
          <button onClick={submit} disabled={busy} style={{ flex: 1, ...btnPrimary, opacity: busy ? 0.6 : 1, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {busy ? `⏳ ${t('ak.applying','Submitting…')}` : `📝 ${t('ak.applySubmit','발급 신청')}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
const fieldStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)', fontSize: 12,
  background: 'rgba(255,255,255,0.95)', color: 'var(--text-1)',
};
const btnPrimary = {
  padding: '10px 18px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 700, fontSize: 12,
};
const btnGhost = {
  padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)',
  background: 'transparent', color: 'var(--text-2)', fontWeight: 700, fontSize: 12, cursor: 'pointer',
};
