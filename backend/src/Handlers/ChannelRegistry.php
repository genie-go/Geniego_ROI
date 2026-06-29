<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * [현 차수] 통합 채널 레지스트리 (DB 동적) — 기존 4곳 하드코딩(ApiKeys/OmniChannel/AdChannelConnect/ConnectorSync)
 *   대체 SSOT. 플랫폼 전역 카탈로그(테넌트 무관)로 admin 이 코드 수정 없이 채널을 추가/수정/비활성.
 *   각 채널: channel_key·name·group(sales/marketing/logistics/pg/messaging)·fields(자격증명 입력필드)·sync_kind.
 *   프론트 등록 UI 는 GET /v426/channels 로 동적 로드(하드코딩 폴백과 병합). 신규 채널은 자동 노출.
 *   admin CRUD 는 UserAuth::requirePlan('admin'). list 는 requirePro(전 구독자 등록 UI 사용).
 */
class ChannelRegistry
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function ensureTable(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_registry (
                id INT AUTO_INCREMENT PRIMARY KEY,
                channel_key VARCHAR(60) NOT NULL,
                name VARCHAR(120) NOT NULL,
                group_type VARCHAR(40) NOT NULL DEFAULT 'sales',
                icon VARCHAR(16), color VARCHAR(16),
                fields_json TEXT, sync_kind VARCHAR(20) NOT NULL DEFAULT 'none',
                is_active TINYINT NOT NULL DEFAULT 1, display_order INT DEFAULT 100,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_channel_registry_key (channel_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_registry (
                id INTEGER PRIMARY KEY AUTOINCREMENT, channel_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                group_type TEXT NOT NULL DEFAULT 'sales', icon TEXT, color TEXT, fields_json TEXT,
                sync_kind TEXT NOT NULL DEFAULT 'none', is_active INTEGER NOT NULL DEFAULT 1,
                display_order INTEGER DEFAULT 100, created_at TEXT, updated_at TEXT)");
        }
        // [초고도화 #4] 제네릭 어댑터 스펙(REST 선언) — admin 이 fetch_spec(JSON) 선언만으로 전용 코드 없이 채널 연동.
        //   Channable/Linnworks 식 스펙 구동. 멱등 ALTER.
        try { $pdo->exec("ALTER TABLE channel_registry ADD COLUMN fetch_spec TEXT"); } catch (\Throwable $e) {}
        self::ensureSeed($pdo);
    }

    /** [초고도화 #4] 채널의 제네릭 fetch 스펙(JSON 디코드) — 없으면 null. ChannelSync::specFetch 가 소비. */
    public static function fetchSpecFor(string $channel): ?array
    {
        try {
            $st = self::db()->prepare("SELECT fetch_spec FROM channel_registry WHERE channel_key=? AND is_active=1 LIMIT 1");
            $st->execute([strtolower(trim($channel))]);
            $raw = (string)($st->fetchColumn() ?: '');
            if ($raw === '') return null;
            $spec = json_decode($raw, true);
            return is_array($spec) ? $spec : null;
        } catch (\Throwable $e) { return null; }
    }

    /** 최초 1회 기본 카탈로그 시드(빈 테이블일 때만). 기존 하드코딩 채널을 보존. */
    private static function ensureSeed(\PDO $pdo): void
    {
        // [현 차수] 누락분 top-up — 기존엔 비었을 때만 시드해 신규 채널이 기존 registry 에 영영 미노출이었다.
        //   이미 있는 키(존재 집합)는 건너뛰고 누락된 시드 채널만 INSERT(멱등). 사용자 admin 커스터마이징은 보존.
        $have = [];
        try { foreach ($pdo->query("SELECT channel_key FROM channel_registry")->fetchAll(\PDO::FETCH_COLUMN) as $k) $have[(string)$k] = true; }
        catch (\Throwable $e) { return; }
        $F = fn(...$f) => $f; // 필드 라벨 배열 헬퍼
        $ftext = fn($k, $l, $s = true) => ['k' => $k, 'label' => $l, 'secret' => $s];
        // group: sales/marketing/logistics/pg/messaging | sync_kind: commerce/ad/messaging/none
        $cat = [
            // ── 마케팅(광고) ──
            ['meta_ads','Meta (FB·IG) 광고','marketing','📘','#1877f2','ad',[$ftext('access_token','액세스 토큰'),$ftext('ad_account_id','광고 계정 ID(act_)',false)]],
            ['google_ads','Google Ads','marketing','🔍','#4285f4','ad',[$ftext('developer_token','개발자 토큰'),$ftext('access_token','액세스 토큰'),$ftext('customer_id','고객 ID',false)]],
            ['tiktok_business','TikTok Ads','marketing','🎵','#ff0050','ad',[$ftext('access_token','액세스 토큰'),$ftext('advertiser_id','광고주 ID',false)]],
            ['naver_sa','Naver 검색광고','marketing','🟩','#03c75a','ad',[$ftext('api_key','API 키'),$ftext('api_secret','비밀키'),$ftext('customer_id','고객 ID',false)]],
            ['kakao_moment','Kakao Moment','marketing','💬','#fee500','ad',[$ftext('access_token','액세스 토큰'),$ftext('account_id','광고계정 ID',false)]],
            // [240차] 커넥터 확장 — 신규 광고/분석 데이터소스. 실 ingest 어댑터(Connectors::fetch*Rows): snapchat/linkedin/criteo/pinterest.
            ['snapchat_ads','Snapchat Ads','marketing','👻','#fffc00','ad',[$ftext('access_token','액세스 토큰'),$ftext('ad_account_id','광고계정 ID',false),$ftext('currency','과금 통화(예: USD)',false)]],
            ['linkedin_ads','LinkedIn Ads','marketing','💼','#0a66c2','ad',[$ftext('access_token','액세스 토큰'),$ftext('ad_account_id','Sponsored Account ID',false),$ftext('currency','과금 통화(예: USD)',false)]],
            ['criteo','Criteo','marketing','🟧','#f47521','ad',[$ftext('client_id','API Client ID',false),$ftext('client_secret','API Client Secret'),$ftext('currency','과금 통화(예: USD)',false)]],
            ['pinterest_ads','Pinterest Ads','marketing','📌','#e60023','ad',[$ftext('access_token','액세스 토큰'),$ftext('ad_account_id','광고계정 ID',false),$ftext('currency','과금 통화(예: USD)',false)]],
            // [현 차수 감사] 실 fetch 어댑터(Connectors fetch*Rows·AD_SHORT) 보유 + REAL_ADAPTER 등재 → sync_kind 'none'→'ad'
            //   정합화(기존 stale 'none'·"연동 예정" 주석 정정). 자격증명 등록 시 즉시 자동 동기화(이미 AD_SHORT로 동작 중).
            ['microsoft_ads','Microsoft Ads (Bing)','marketing','🪟','#00a4ef','ad',[$ftext('developer_token','개발자 토큰'),$ftext('access_token','액세스 토큰'),$ftext('account_id','계정 ID',false)]],
            ['x_ads','X (Twitter) Ads','marketing','✖️','#000000','ad',[$ftext('consumer_key','Consumer Key'),$ftext('consumer_secret','Consumer Secret'),$ftext('access_token','Access Token'),$ftext('access_token_secret','Access Token Secret'),$ftext('account_id','광고계정 ID',false)]],
            ['amazon_ads','Amazon Ads (Sponsored)','marketing','📦','#ff9900','ad',[$ftext('client_id','LWA Client ID',false),$ftext('client_secret','LWA Secret'),$ftext('refresh_token','Refresh Token'),$ftext('profile_id','프로필 ID',false)]],
            // [현 차수] 롱테일 광고 커넥터 5종 — 실 fetch 어댑터(Connectors::fetch*Rows) 신용게이트. 자격증명 등록 시 즉시 동작.
            ['reddit_ads','Reddit Ads','marketing','🟠','#ff4500','ad',[$ftext('access_token','액세스 토큰'),$ftext('ad_account_id','광고계정 ID',false),$ftext('currency','과금 통화(예: USD)',false)]],
            ['apple_search_ads','Apple Search Ads','marketing','','#000000','ad',[$ftext('access_token','액세스 토큰'),$ftext('org_id','조직 ID(orgId)',false),$ftext('currency','과금 통화(예: USD)',false)]],
            ['amazon_dsp','Amazon DSP','marketing','📦','#232f3e','ad',[$ftext('access_token','액세스 토큰'),$ftext('client_id','LWA Client ID',false),$ftext('profile_id','프로필 ID',false),$ftext('advertiser_id','광고주 ID',false),$ftext('currency','과금 통화(예: USD)',false)]],
            ['quora_ads','Quora Ads','marketing','🅠','#b92b27','ad',[$ftext('access_token','액세스 토큰'),$ftext('account_id','광고계정 ID',false),$ftext('currency','과금 통화(예: USD)',false)]],
            ['spotify_ads','Spotify Ads','marketing','🎧','#1db954','ad',[$ftext('access_token','액세스 토큰'),$ftext('ad_account_id','광고계정 ID',false),$ftext('currency','과금 통화(예: USD)',false)]],
            // [현 차수 감사] 네이티브 광고 2종 — 실 fetch 어댑터(fetchTaboolaRows/fetchOutbrainRows)·AD_SHORT·REAL_ADAPTER
            //   보유인데 레지스트리 시드 부재로 ConnectModal UI 미노출(등록 불가)이던 갭 해소.
            ['taboola','Taboola','marketing','🟧','#0668e1','ad',[$ftext('access_token','액세스 토큰'),$ftext('account_id','계정 ID(account_id)',false),$ftext('currency','과금 통화(예: USD)',false)]],
            ['outbrain','Outbrain','marketing','🟢','#ee6c4d','ad',[$ftext('ob_token','OB-TOKEN'),$ftext('marketer_id','마케터 ID(marketer_id)',false),$ftext('currency','과금 통화(예: USD)',false)]],
            // [246차 P3] 글로벌 퍼포먼스/앱 광고 4종 + 분석 데이터소스 2종(creds 등록 즉시 자동 동기화).
            ['applovin','AppLovin','marketing','🅰️','#ff3b30','ad',[$ftext('api_key','Report API Key'),$ftext('currency','과금 통화(예: USD)',false)]],
            ['mintegral','Mintegral','marketing','🟩','#00c389','ad',[$ftext('access_key','Access Key',false),$ftext('api_key','API Key'),$ftext('currency','과금 통화(예: USD)',false)]],
            ['yandex_ads','Yandex Direct','marketing','🟥','#ffcc00','ad',[$ftext('oauth_token','OAuth 토큰'),$ftext('client_login','클라이언트 로그인',false),$ftext('currency','과금 통화(예: RUB)',false)]],
            ['yahoo_jp_ads','Yahoo! JAPAN Ads','marketing','🟪','#ff0033','ad',[$ftext('access_token','액세스 토큰'),$ftext('account_id','계정 ID',false)]],
            // [P1 커넥터 폭] GA4·Adobe = 웹 분석 인바운드(sync_kind='analytics'). 실 fetcher(Connectors::fetchGa4Rows/fetchAdobeAnalyticsRows)
            //   → web_analytics_metrics(광고 performance_metrics 와 분리). currency 선택(미지정=KRW, 무변환).
            ['ga4','Google Analytics 4','marketing','📈','#e37400','analytics',[$ftext('property_id','GA4 속성 ID',false),$ftext('service_account_json','서비스 계정 JSON'),$ftext('currency','보고 통화(예: KRW·USD)',false)]],
            ['adobe_analytics','Adobe Analytics','marketing','🅰','#fa0f00','analytics',[$ftext('company_id','Company ID',false),$ftext('client_id','API Client ID',false),$ftext('client_secret','Client Secret'),$ftext('report_suite_id','Report Suite ID',false),$ftext('currency','보고 통화(예: KRW·USD)',false)]],
            // [P1 커넥터 폭] CS/헬프데스크 인바운드(sync_kind='cs') → cs_metrics. 티켓/CSAT/응답시간.
            ['zendesk','Zendesk','support','🎧','#03363d','cs',[$ftext('subdomain','서브도메인(=xxx.zendesk.com)',false),$ftext('email','에이전트 이메일',false),$ftext('api_token','API 토큰')]],
            ['intercom','Intercom','support','💬','#1f8ded','cs',[$ftext('access_token','액세스 토큰')]],
            ['freshdesk','Freshdesk','support','🌿','#25c16f','cs',[$ftext('domain','도메인(=xxx.freshdesk.com)',false),$ftext('api_key','API 키')]],
            ['gorgias','Gorgias','support','🛟','#ff6f61','cs',[$ftext('domain','도메인(=xxx.gorgias.com)',false),$ftext('username','사용자명(이메일)',false),$ftext('api_key','API 키')]],
            // [P1 커넥터 폭] 외부 ESP(이메일) 인바운드(sync_kind='esp') → esp_metrics. 발송/오픈/클릭/매출.
            ['mailchimp','Mailchimp','marketing','🐵','#ffe01b','esp',[$ftext('api_key','API 키(-dcNN 접미 포함)')]],
            ['klaviyo','Klaviyo','marketing','📧','#000000','esp',[$ftext('private_key','Private API Key(pk_)')]],
            ['sendgrid','SendGrid (Twilio)','marketing','📨','#1a82e2','esp',[$ftext('api_key','API 키')]],
            // [P1 커넥터 폭] 리뷰 플랫폼 확대(sync_kind='review') → product_review(Reviews 수집기 공용).
            ['trustpilot','Trustpilot','support','⭐','#00b67a','review',[$ftext('business_unit_id','Business Unit ID',false),$ftext('api_key','API 키')]],
            ['yotpo','Yotpo','support','🌟','#0042e4','review',[$ftext('app_key','App Key',false),$ftext('api_secret','API Secret')]],
            ['google_business','Google Business 리뷰','support','📍','#4285f4','review',[$ftext('account_id','Account ID',false),$ftext('location_id','Location ID',false),$ftext('access_token','OAuth 액세스 토큰')]],
            // ── 판매(커머스) ──
            ['shopify','Shopify','sales','🛍','#95bf47','commerce',[$ftext('shop_domain','상점 도메인',false),$ftext('access_token','Admin API 토큰')]],
            ['amazon','Amazon SP-API','sales','📦','#ff9900','commerce',[$ftext('client_id','LWA Client ID',false),$ftext('client_secret','LWA Secret'),$ftext('refresh_token','Refresh Token'),$ftext('marketplace_id','마켓플레이스',false)]],
            ['ebay','eBay','sales','🏷','#e53238','commerce',[$ftext('access_token','OAuth 토큰')]],
            ['coupang','Coupang Wing','sales','🚀','#ef4444','commerce',[$ftext('access_key','액세스 키'),$ftext('secret_key','시크릿 키'),$ftext('vendor_id','벤더 ID',false)]],
            ['naver_smartstore','Naver 스마트스토어','sales','🟢','#03c75a','commerce',[$ftext('client_id','Client ID',false),$ftext('client_secret','Client Secret')]],
            ['st11','11번가','sales','1️⃣','#ff0038','commerce',[$ftext('api_key','API 키')]],
            ['gmarket','Gmarket','sales','🟡','#00a862','commerce',[$ftext('esm_id','ESM PLUS ID',false),$ftext('api_key','API 키')]],
            ['auction','Auction','sales','🅰','#ff5e00','commerce',[$ftext('esm_id','ESM PLUS ID',false),$ftext('api_key','API 키')]],
            ['cafe24','Cafe24','sales','🛒','#0078ff','commerce',[$ftext('mall_id','몰 ID',false),$ftext('client_id','Client ID',false),$ftext('client_secret','Client Secret')]],
            ['lotteon','Lotte ON','sales','🛍','#da0f2b','commerce',[$ftext('api_key','API 키')]],
            ['tiktok_shop','TikTok Shop','sales','🎵','#000000','commerce',[$ftext('app_key','App Key',false),$ftext('app_secret','App Secret'),$ftext('access_token','액세스 토큰')]],
            ['rakuten','Rakuten','sales','🔴','#bf0000','commerce',[$ftext('service_secret','Service Secret'),$ftext('license_key','License Key')]],
            ['yahoo_jp','Yahoo! Japan','sales','🟣','#ff0033','commerce',[$ftext('app_id','App ID',false),$ftext('access_token','액세스 토큰')]],
            ['woocommerce','WooCommerce','sales','🟪','#96588a','commerce',[$ftext('site_url','상점 URL',false),$ftext('consumer_key','Consumer Key'),$ftext('consumer_secret','Consumer Secret')]],
            ['shopee','Shopee','sales','🟠','#ee4d2d','commerce',[$ftext('partner_id','Partner ID',false),$ftext('partner_key','Partner Key'),$ftext('shop_id','Shop ID',false)]],
            ['lazada','Lazada','sales','🔵','#0f146d','commerce',[$ftext('app_key','App Key',false),$ftext('app_secret','App Secret'),$ftext('access_token','액세스 토큰')]],
            ['qoo10','Qoo10','sales','🐧','#ff5e00','commerce',[$ftext('api_key','API 키'),$ftext('seller_id','Seller ID',false)]],
            // ── 메시징 ──
            ['kakao','Kakao 알림톡','messaging','💛','#fee500','messaging',[$ftext('sender_key','발신프로필 키'),$ftext('api_key','API 키')]],
            ['line','LINE','messaging','💚','#06c755','messaging',[$ftext('channel_secret','Channel Secret'),$ftext('access_token','액세스 토큰')]],
            // ── 물류(배송추적 실어댑터 v427) ──
            ['cj','CJ대한통운','logistics','🚚','#e3002b','tracking',[$ftext('api_key','스마트택배 추적 API 키'),$ftext('cust_code','고객(계약) 코드',false)]],
            ['epost','우체국택배','logistics','📮','#d80027','tracking',[$ftext('api_key','스마트택배 추적 API 키'),$ftext('cust_code','계약(고객) 코드',false)]],
            ['smarttracker','스마트택배(통합 추적)','logistics','📦','#0ea5e9','tracking',[$ftext('api_key','스마트택배 t_key(전 택배사 통합)')]],
            ['fulfillment','3PL 풀필먼트','logistics','🏭','#6366f1','none',[$ftext('api_key','API 키'),$ftext('warehouse_code','창고 코드',false)]],
            // ── PG(결제) ──
            ['tosspayments','토스페이먼츠','pg','💳','#3182f6','none',[$ftext('secret_key','시크릿 키'),$ftext('client_key','클라이언트 키',false)]],
            ['stripe','Stripe','pg','💳','#635bff','none',[$ftext('secret_key','Secret Key'),$ftext('publishable_key','Publishable Key',false)]],
        ];
        $now = self::now(); $i = 0;
        $ins = $pdo->prepare("INSERT INTO channel_registry(channel_key,name,group_type,icon,color,fields_json,sync_kind,is_active,display_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?,?)");
        foreach ($cat as $c) {
            $i++;
            if (isset($have[$c[0]])) continue; // 이미 존재(사용자 커스터마이징 포함) → 보존
            try { $ins->execute([$c[0], $c[1], $c[2], $c[3], $c[4], json_encode($c[6], JSON_UNESCAPED_UNICODE), $c[5], $i * 10, $now, $now]); }
            catch (\Throwable $e) {}
        }
        // [P1 커넥터 폭] 마이그레이션 — 기존 시드(sync_kind='none')로 들어간 GA4·Adobe 를 'analytics' 로 승격.
        //   시드는 누락분만 INSERT 하므로 기존 행은 갱신되지 않아, 실 fetcher 도입 후 sync_kind 정합을 위해 1회 UPDATE.
        //   currency 필드가 빠진 기존 fields_json 도 시드값으로 갱신(자격증명 입력폼에 보고통화 노출). 멱등(이미 analytics 면 no-op 효과).
        try {
            $up = $pdo->prepare("UPDATE channel_registry SET sync_kind='analytics', fields_json=?, updated_at=? WHERE channel_key=? AND sync_kind<>'analytics'");
            foreach ($cat as $c) {
                if ($c[5] !== 'analytics') continue;
                $up->execute([json_encode($c[6], JSON_UNESCAPED_UNICODE), $now, $c[0]]);
            }
        } catch (\Throwable $e) {}
    }

    /* GET /v426/channels — 활성 채널 카탈로그(등록 UI용, 전 구독자). */
    public static function listChannels(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTable();
        $rows = self::db()->query("SELECT channel_key,name,group_type,icon,color,fields_json,sync_kind,is_active,display_order FROM channel_registry WHERE is_active=1 ORDER BY display_order,channel_key")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['fields'] = json_decode($r['fields_json'] ?? '[]', true) ?: []; unset($r['fields_json']); $r['is_active'] = (int)$r['is_active']; }
        return self::json($res, ['ok' => true, 'channels' => $rows]);
    }

    /* GET /v426/admin/channels — 전체(비활성 포함, admin). */
    public static function adminList(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
        self::ensureTable();
        $rows = self::db()->query("SELECT * FROM channel_registry ORDER BY display_order,channel_key")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['fields'] = json_decode($r['fields_json'] ?? '[]', true) ?: []; $r['is_active'] = (int)$r['is_active']; }
        return self::json($res, ['ok' => true, 'channels' => $rows]);
    }

    /* POST /v426/admin/channels — 채널 추가/수정(admin). body: {channel_key,name,group_type,icon,color,fields[],sync_kind,is_active,display_order} */
    public static function upsert(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
        self::ensureTable();
        $pdo = self::db();
        $b = (array)$req->getParsedBody();
        $key = preg_replace('/[^a-z0-9_]/', '', strtolower(trim((string)($b['channel_key'] ?? ''))));
        $name = trim((string)($b['name'] ?? ''));
        if ($key === '' || $name === '') return self::json($res, ['ok' => false, 'error' => 'channel_key/name required'], 400);
        $now = self::now();
        $fields = is_array($b['fields'] ?? null) ? $b['fields'] : [];
        $vals = [
            ':k' => $key, ':n' => $name, ':g' => (string)($b['group_type'] ?? 'sales'),
            ':ic' => (string)($b['icon'] ?? '🔗'), ':co' => (string)($b['color'] ?? '#6366f1'),
            ':fj' => json_encode($fields, JSON_UNESCAPED_UNICODE), ':sk' => (string)($b['sync_kind'] ?? 'none'),
            ':ia' => (int)($b['is_active'] ?? 1), ':do' => (int)($b['display_order'] ?? 999), ':now' => $now,
            // [초고도화 #4] 제네릭 어댑터 스펙(JSON) — 유효 JSON만 저장(검증), 부재 시 NULL.
            ':fs' => (is_array($b['fetch_spec'] ?? null) ? json_encode($b['fetch_spec'], JSON_UNESCAPED_UNICODE)
                       : (is_string($b['fetch_spec'] ?? null) && json_decode($b['fetch_spec'], true) !== null ? $b['fetch_spec'] : null)),
        ];
        $exists = $pdo->prepare("SELECT 1 FROM channel_registry WHERE channel_key=:k"); $exists->execute([':k' => $key]);
        if ($exists->fetchColumn()) {
            $pdo->prepare("UPDATE channel_registry SET name=:n,group_type=:g,icon=:ic,color=:co,fields_json=:fj,sync_kind=:sk,is_active=:ia,display_order=:do,fetch_spec=:fs,updated_at=:now WHERE channel_key=:k")->execute($vals);
        } else {
            $vals[':ca'] = $now;
            $pdo->prepare("INSERT INTO channel_registry(channel_key,name,group_type,icon,color,fields_json,sync_kind,is_active,display_order,fetch_spec,created_at,updated_at) VALUES(:k,:n,:g,:ic,:co,:fj,:sk,:ia,:do,:fs,:ca,:now)")->execute($vals);
        }
        return self::json($res, ['ok' => true, 'channel_key' => $key]);
    }

    /* DELETE /v426/admin/channels/{key} — 채널 삭제(admin). */
    public static function remove(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'admin')) return $err;
        self::ensureTable();
        $key = preg_replace('/[^a-z0-9_]/', '', strtolower((string)($args['key'] ?? '')));
        self::db()->prepare("DELETE FROM channel_registry WHERE channel_key=:k")->execute([':k' => $key]);
        return self::json($res, ['ok' => true]);
    }
}
