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
        self::ensureSeed($pdo);
    }

    /** 최초 1회 기본 카탈로그 시드(빈 테이블일 때만). 기존 하드코딩 채널을 보존. */
    private static function ensureSeed(\PDO $pdo): void
    {
        try { if ((int)$pdo->query("SELECT COUNT(*) FROM channel_registry")->fetchColumn() > 0) return; }
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
            // [240차] 로드맵(연동 예정) — 전용 어댑터 준비 중(REAL_ADAPTER 미포함 → UI '연동 예정' 정직 표기).
            ['microsoft_ads','Microsoft Ads (Bing)','marketing','🪟','#00a4ef','none',[$ftext('developer_token','개발자 토큰'),$ftext('access_token','액세스 토큰'),$ftext('account_id','계정 ID',false)]],
            ['x_ads','X (Twitter) Ads','marketing','✖️','#000000','none',[$ftext('consumer_key','Consumer Key'),$ftext('consumer_secret','Consumer Secret'),$ftext('access_token','Access Token'),$ftext('access_token_secret','Access Token Secret'),$ftext('account_id','광고계정 ID',false)]],
            ['amazon_ads','Amazon Ads (Sponsored)','marketing','📦','#ff9900','none',[$ftext('client_id','LWA Client ID',false),$ftext('client_secret','LWA Secret'),$ftext('refresh_token','Refresh Token'),$ftext('profile_id','프로필 ID',false)]],
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
            ['woocommerce','WooCommerce','sales','🟪','#96588a','commerce',[$ftext('store_url','상점 URL',false),$ftext('consumer_key','Consumer Key'),$ftext('consumer_secret','Consumer Secret')]],
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
            try { $ins->execute([$c[0], $c[1], $c[2], $c[3], $c[4], json_encode($c[6], JSON_UNESCAPED_UNICODE), $c[5], (++$i) * 10, $now, $now]); }
            catch (\Throwable $e) {}
        }
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
        ];
        $exists = $pdo->prepare("SELECT 1 FROM channel_registry WHERE channel_key=:k"); $exists->execute([':k' => $key]);
        if ($exists->fetchColumn()) {
            $pdo->prepare("UPDATE channel_registry SET name=:n,group_type=:g,icon=:ic,color=:co,fields_json=:fj,sync_kind=:sk,is_active=:ia,display_order=:do,updated_at=:now WHERE channel_key=:k")->execute($vals);
        } else {
            $vals[':ca'] = $now;
            $pdo->prepare("INSERT INTO channel_registry(channel_key,name,group_type,icon,color,fields_json,sync_kind,is_active,display_order,created_at,updated_at) VALUES(:k,:n,:g,:ic,:co,:fj,:sk,:ia,:do,:ca,:now)")->execute($vals);
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
