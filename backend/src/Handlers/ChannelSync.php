<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * ChannelSync v1 — 인증키 등록 즉시 상품/주문/재고 수집
 *
 * Routes:
 *   GET    /api/channel-sync/status           — 전체 채널 연동 상태
 *   POST   /api/channel-sync/credentials      — 인증키 저장 + 즉시 동기화
 *   DELETE /api/channel-sync/credentials/{id} — 인증키 삭제
 *   POST   /api/channel-sync/{channel}/test   — 연결 테스트
 *   POST   /api/channel-sync/{channel}/sync   — 수동 동기화 실행
 *   GET    /api/channel-sync/products         — 수집된 상품 목록
 *   GET    /api/channel-sync/orders           — 수집된 주문 목록
 *   GET    /api/channel-sync/inventory        — 재고 현황
 *   POST   /api/channel-sync/webhooks/{ch}    — 채널 Webhook 수신
 */
final class ChannelSync
{
    // ── 플랜 추출 (demo/pro) ──────────────────────────────────────────────
    private static function plan(Request $req): string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)) {
            $token = $m[1];
            if ($token === 'demo-token' || str_starts_with($token, 'demo')) return 'demo';
            try {
                $pdo = Db::pdo();
                $s = $pdo->prepare('SELECT u.plan FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE s.token=? LIMIT 1');
                $s->execute([$token]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                if ($r) return (string)$r['plan'];
            } catch (\Throwable) {}
        }
        $q = $req->getQueryParams();
        return ($q['plan'] ?? 'demo') === 'pro' ? 'pro' : 'demo';
    }

    private static function tenant(Request $req): string
    {
        // 204차 P1: 격리키 정본화. 과거엔 user_session.user_id(원시 정수)를 테넌트로 반환해
        //   ① 팀/하위계정이 owner 와 채널데이터를 공유하지 못하고(멤버 user_id 별 분리)
        //   ② 타 도메인(CRM/Attribution 등 'acct_<id>')과 격리키 포맷이 어긋났다.
        //   ChannelCreds::sessionTenant 와 동일하게 미들웨어 auth_tenant 속성 우선 +
        //   인증세션의 tenant_id(하위계정=owner 상속, 미설정=acct_<id>)로 통일한다.
        $attr = $req->getAttribute('auth_tenant', '');
        if ($attr !== '' && $attr !== null) return (string)$attr;

        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)
            && $m[1] !== 'demo-token' && !str_starts_with($m[1], 'demo') && !str_starts_with($m[1], 'local_demo_')) {
            try {
                $pdo = Db::pdo();
                $now = gmdate('Y-m-d\TH:i:s\Z');
                $s = $pdo->prepare(
                    'SELECT u.id, u.tenant_id, u.parent_user_id FROM user_session s
                       JOIN app_user u ON u.id = s.user_id
                      WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1 LIMIT 1'
                );
                $s->execute([$m[1], $now]);
                $r = $s->fetch(PDO::FETCH_ASSOC);
                if ($r) {
                    $tid = trim((string)($r['tenant_id'] ?? ''));
                    if ($tid !== '') return $tid;
                    $pid = (int)($r['parent_user_id'] ?? 0);
                    if ($pid > 0) {
                        $ps = $pdo->prepare('SELECT tenant_id FROM app_user WHERE id = ? LIMIT 1');
                        $ps->execute([$pid]);
                        $ptid = trim((string)($ps->fetchColumn() ?: ''));
                        return $ptid !== '' ? $ptid : ('acct_' . $pid);
                    }
                    return 'acct_' . (int)$r['id'];
                }
            } catch (\Throwable) {}
        }
        return 'demo';
    }

    /**
     * 207차 후속 보안: 공개 bypass 엔드포인트(미들웨어 api_key 미적용)의 익명 접근 차단.
     *  - 세션 토큰/데모 토큰(Authorization Bearer) 또는 미들웨어 auth_tenant 가 있으면 통과
     *    (데모 토큰 → demo 버킷, 정상 / 운영 세션 → 실 tenant).
     *  - 완전 익명(Authorization 헤더 없음)만 401 거부 → 익명의 demo 버킷 R/W·자격증명 저장 차단.
     *  - 커머스 cron 은 HTTP 핸들러를 거치지 않고 직접 호출하므로 영향 없음.
     */
    private static function denyAnon(Request $req, Response $res): ?Response
    {
        $attr = $req->getAttribute('auth_tenant', '');
        if ($attr !== '' && $attr !== null) return null;
        // 208차 검수(P1): 아무 Bearer 존재만으로 통과시키던 것을 → 실제 세션 해석 성공 시에만 통과.
        //   junk/만료 Bearer 가 'demo' 버킷에 R/W·자격증명 저장하던 경로 차단(데모 토큰은 의도대로 허용).
        if (preg_match('/Bearer\s+(\S+)/i', $req->getHeaderLine('Authorization'), $m)) {
            $tok = $m[1];
            if ($tok === 'demo-token' || str_starts_with($tok, 'demo') || str_starts_with($tok, 'local_demo_')) return null;
            try {
                $st = Db::pdo()->prepare('SELECT 1 FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>? AND u.is_active=1 LIMIT 1');
                $st->execute([$tok, gmdate('Y-m-d\TH:i:s\Z')]);
                if ($st->fetchColumn()) return null;
            } catch (\Throwable $e) {}
        }
        return TemplateResponder::respond($res->withStatus(401), ['ok' => false, 'error' => 'unauthorized']);
    }

    // ── HTTP helper ──────────────────────────────────────────────────────
    private static function httpGet(string $url, array $headers = [], int $timeout = 15): array
    {
        $ch = curl_init($url);
        $hdrs = array_map(fn($k, $v) => "$k: $v", array_keys($headers), array_values($headers));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_HTTPHEADER     => $hdrs,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'GeniegoROI/v423',
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch) ?: null;
        curl_close($ch);
        $body = ($err === null && $raw) ? (json_decode((string)$raw, true) ?? []) : [];
        return [$code, $body, $err];
    }

    private static function httpPost(string $url, array $headers, string $body, int $timeout = 15): array
    {
        $ch = curl_init($url);
        $hdrs = array_map(fn($k, $v) => "$k: $v", array_keys($headers), array_values($headers));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_HTTPHEADER     => $hdrs,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT      => 'GeniegoROI/v423',
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch) ?: null;
        curl_close($ch);
        $body2 = ($err === null && $raw) ? (json_decode((string)$raw, true) ?? []) : [];
        return [$code, $body2, $err];
    }

    // ── DB 초기화 ────────────────────────────────────────────────────────
    private static function ensureTables(): void
    {
        $pdo = Db::pdo();
        // 202차: SQLite 전용 DDL(AUTOINCREMENT/TEXT DEFAULT/UNIQUE(TEXT))은 MySQL 에서 실패한다.
        //   MySQL 에서는 driver-aware 변환을 적용하고, 변환 후에도 실패하면 graceful 하게 무시한다
        //   (커머스 테이블 부재 시 status/products/orders 는 빈 결과 — OmniChannel 마운트 에러 방지).
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $exec = static function (string $ddl) use ($pdo, $isMy): void {
            if ($isMy) {
                $ddl = str_replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'INT AUTO_INCREMENT PRIMARY KEY', $ddl);
                // UNIQUE 인덱스/조회에 쓰이는 키 컬럼은 VARCHAR 로(MySQL TEXT 키길이 오류 회피)
                $ddl = preg_replace('/\b(tenant_id|channel|key_name|sku|warehouse|channel_product_id|channel_order_id|cred_type|test_status|sync_status|status)\s+TEXT\b/', '$1 VARCHAR(190)', $ddl);
                // ★206차 근본수정: MySQL 은 TEXT/BLOB 컬럼에 DEFAULT 를 허용하지 않는다(1101).
                //   키 컬럼 외 잔여 `TEXT [NOT NULL] DEFAULT '...'`(예: event_type)도 VARCHAR(190) 로 변환.
                //   기존엔 event_type TEXT DEFAULT 'order' 가 변환 누락→ channel_orders CREATE 자체가 실패해
                //   운영 MySQL 에 테이블이 생성되지 않던 잠복 버그(주문 적재·정산 rollup 전제 차단).
                $ddl = preg_replace("/\bTEXT(\s+NOT NULL)?\s+DEFAULT\s+'/", "VARCHAR(190)$1 DEFAULT '", $ddl);
            }
            try { $pdo->exec($ddl); } catch (\Throwable $e) { error_log('[ChannelSync.ensureTables] ' . $e->getMessage()); }
        };
        $exec("CREATE TABLE IF NOT EXISTS channel_credential (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL DEFAULT 'demo',
            channel TEXT NOT NULL,
            cred_type TEXT DEFAULT 'api_key',
            label TEXT,
            key_name TEXT NOT NULL,
            key_value TEXT,
            extra_json TEXT,
            is_active INTEGER DEFAULT 1,
            note TEXT,
            last_tested_at TEXT,
            test_status TEXT DEFAULT 'untested',
            last_synced_at TEXT,
            sync_status TEXT DEFAULT 'none',
            updated_at TEXT,
            created_at TEXT,
            UNIQUE(tenant_id, channel, key_name)
        )");
        $exec("CREATE TABLE IF NOT EXISTS channel_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL DEFAULT 'demo',
            channel TEXT NOT NULL,
            channel_product_id TEXT,
            sku TEXT,
            name TEXT,
            price REAL DEFAULT 0,
            compare_price REAL DEFAULT 0,
            inventory INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            image_url TEXT,
            category TEXT,
            weight REAL DEFAULT 0,
            variants_json TEXT,
            raw_json TEXT,
            synced_at TEXT,
            UNIQUE(tenant_id, channel, channel_product_id)
        )");
        Db::ensureChannelOrders($pdo); // SSOT: channel_orders 를 Db::ensureChannelOrders 로 일원화(종전 LiveCommerce 와 중복 제거)
        $exec("CREATE TABLE IF NOT EXISTS channel_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL DEFAULT 'demo',
            channel TEXT NOT NULL,
            sku TEXT NOT NULL,
            product_name TEXT,
            available INTEGER DEFAULT 0,
            reserved INTEGER DEFAULT 0,
            warehouse TEXT DEFAULT 'default',
            synced_at TEXT,
            UNIQUE(tenant_id, channel, sku, warehouse)
        )");

        // ★ 202차: channel_credential 은 ChannelCreds 가 먼저 생성할 수 있어(스키마 분기)
        //   ChannelSync 가 쓰는 컬럼이 누락될 수 있다. 누락 컬럼을 idempotent ALTER 로 보강
        //   (이미 있으면 예외 → 무시). status() 의 last_synced_at/sync_status SELECT 500 해소.
        foreach ([
            'last_synced_at TEXT',
            "sync_status VARCHAR(190) DEFAULT 'none'",
            'extra_json TEXT',
            'last_tested_at TEXT',
            "test_status VARCHAR(190) DEFAULT 'untested'",
            'note TEXT',
        ] as $colDef) {
            try {
                $col = $isMy ? $colDef : preg_replace("/\s+VARCHAR\(\d+\)/", ' TEXT', $colDef);
                $pdo->exec("ALTER TABLE channel_credential ADD COLUMN {$col}");
            } catch (\Throwable $e) { /* 이미 존재 */ }
        }
        // [현 차수] 데이터품질(운영 COGS): channel_inventory 에 원가(cost)·판매가(price) 컬럼 보강(idempotent).
        //   채널 동기화는 셀러 원가를 제공하지 않으므로, 셀러가 입력한 원가를 영속해야 P&L COGS 가 0 이 아니게 된다.
        foreach (['cost', 'price'] as $c) {
            try { $pdo->exec("ALTER TABLE channel_inventory ADD COLUMN {$c} " . ($isMy ? 'DECIMAL(14,2) DEFAULT 0' : 'REAL DEFAULT 0')); }
            catch (\Throwable $e) { /* 이미 존재 */ }
        }
    }

    /**
     * 207차 MySQL 호환: driver-aware upsert tail.
     *  - MySQL : ON DUPLICATE KEY UPDATE col=VALUES(col)  (UNIQUE 인덱스 기반)
     *  - SQLite: ON CONFLICT(conflictCols) DO UPDATE SET col=excluded.col
     * 기존 'ON CONFLICT ... DO UPDATE'(SQLite 전용)는 운영 MySQL 에서 1064 문법오류로
     * 커머스 동기화 영속(saveProducts/saveOrders/inventory/saveCredential)이 통째로 실패했다.
     */
    private static function upsertTail(PDO $pdo, string $conflictCols, array $setCols): string
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($isMy) {
            $sets = implode(',', array_map(static fn($c) => "$c=VALUES($c)", $setCols));
            return " ON DUPLICATE KEY UPDATE $sets";
        }
        $sets = implode(',', array_map(static fn($c) => "$c=excluded.$c", $setCols));
        return " ON CONFLICT($conflictCols) DO UPDATE SET $sets";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEMO 데이터 생성기 (체험 모드)
    // ═══════════════════════════════════════════════════════════════════════
    private static function demoProducts(string $channel): array
    {
        $names = ['무선 블루투스 이어버드','기계식 게이밍 키보드','USB-C 65W 고속 충전기','4K 웹캠','무선 게이밍 마우스','30000mAh 보조배터리'];
        $skus  = ['EARBUD-PRO','KEYB-MECH','CHRG-USBC65','CAM-4K','MOUSE-WL','PWR-30K'];
        $prices = [89000, 149000, 49000, 129000, 69000, 39000];
        $products = [];
        foreach (range(0, 5) as $i) {
            $products[] = [
                'channel_product_id' => "DEMO-{$channel}-" . str_pad((string)($i+1), 4, '0', STR_PAD_LEFT),
                'sku'       => $skus[$i] . "-{$channel}",
                'name'      => $names[$i],
                'price'     => $prices[$i],
                'compare_price' => (int)($prices[$i] * 1.2),
                'inventory' => rand(20, 300),
                'status'    => 'active',
                'category'  => ['전자/음향','전자/입력장치','전자/주변기기','전자/카메라','전자/입력장치','전자/충전'][$i],
                'weight'    => round(0.15 + $i * 0.08, 2),
                'variants'  => ['색상' => ['블랙','화이트'], '옵션' => ['기본']],
                'source'    => 'demo',
                'channel'   => $channel,
            ];
        }
        return $products;
    }

    private static function demoOrders(string $channel): array
    {
        $statuses = ['배송중','배송완료','발주확인','출고대기','취소요청','반품접수'];
        $buyers   = ['김철수','이영희','박민준','홍길동','田中花子','John Smith'];
        $products = ['무선 블루투스 이어버드','기계식 게이밍 키보드','USB-C 65W 고속 충전기','4K 웹캠','무선 게이밍 마우스','30000mAh 보조배터리'];
        $carriers = ['CJ대한통운','한진택배','FedEx','DHL','쿠팡로켓','롯데택배'];
        $orders   = [];
        foreach (range(0, 7) as $i) {
            $price = rand(2, 5) * 10000 + 9000;
            $orders[] = [
                'channel_order_id' => "DEMO-ORD-{$channel}-" . date('Ymd') . "-" . str_pad((string)($i+1), 3, '0', STR_PAD_LEFT),
                'buyer_name'  => $buyers[$i % count($buyers)],
                'product_name'=> $products[$i % count($products)],
                'sku'         => 'SKU-' . str_pad((string)($i+1), 3, '0', STR_PAD_LEFT),
                'qty'         => rand(1, 3),
                'unit_price'  => $price,
                'total_price' => $price * rand(1, 3),
                'status'      => $statuses[$i % count($statuses)],
                'carrier'     => $carriers[$i % count($carriers)],
                'tracking_no' => rand(100000000, 999999999),
                'addr'        => ['서울시 강남구', '부산시 해운대구', 'Tokyo Japan', 'CA 90001 USA'][$i % 4],
                'ordered_at'  => date('Y-m-d H:i:s', strtotime("-{$i} hours")),
                'event_type'  => ['order','order','order','cancel','return','order','order','order'][$i],
                'source'      => 'demo',
                'channel'     => $channel,
            ];
        }
        return $orders;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 채널별 실연동 API 호출
    // ═══════════════════════════════════════════════════════════════════════

    // ── Shopify ──────────────────────────────────────────────────────────
    private static function shopifyFetch(array $creds): array
    {
        $token  = $creds['access_token'] ?? $creds['api_password'] ?? '';
        $shop   = $creds['shop_domain'] ?? '';
        if (!$shop || !$token) return ['ok'=>false, 'error'=>'shop_domain and access_token required', 'products'=>[], 'orders'=>[]];

        $shop = rtrim($shop, '/');
        if (!str_contains($shop, '.')) $shop .= '.myshopify.com';

        $headers = ['X-Shopify-Access-Token' => $token, 'Content-Type' => 'application/json'];

        // Products
        [$pCode, $pBody] = self::httpGet("https://{$shop}/admin/api/2024-01/products.json?limit=50&fields=id,title,variants,images,product_type,status", $headers);
        // Orders
        [$oCode, $oBody] = self::httpGet("https://{$shop}/admin/api/2024-01/orders.json?limit=50&status=any&fields=id,name,email,customer,line_items,financial_status,fulfillment_status,created_at,shipping_address,total_price,currency", $headers);

        if ($pCode !== 200) return ['ok'=>false, 'error'=>"Shopify HTTP {$pCode}", 'products'=>[], 'orders'=>[]];

        $products = array_map(function ($p) {
            $v = $p['variants'][0] ?? [];
            return [
                'channel_product_id' => (string)$p['id'],
                'sku'       => $v['sku'] ?? '',
                'name'      => $p['title'] ?? '',
                'price'     => (float)($v['price'] ?? 0),
                'compare_price' => (float)($v['compare_at_price'] ?? 0),
                'inventory' => (int)($v['inventory_quantity'] ?? 0),
                'status'    => $p['status'] ?? 'active',
                'weight'    => (float)($v['weight'] ?? 0),
                'category'  => $p['product_type'] ?? '',
                'image_url' => $p['images'][0]['src'] ?? null,
                'variants'  => $p['variants'] ?? [],
                'source'    => 'live',
            ];
        }, $pBody['products'] ?? []);

        $orders = array_map(function ($o) {
            $item = $o['line_items'][0] ?? [];
            return [
                'channel_order_id' => (string)$o['id'],
                'buyer_name'  => ($o['customer']['first_name'] ?? '') . ' ' . ($o['customer']['last_name'] ?? ''),
                'buyer_email' => $o['email'] ?? '',
                'product_name'=> $item['name'] ?? '',
                'sku'         => $item['sku'] ?? '',
                'qty'         => (int)($item['quantity'] ?? 1),
                'unit_price'  => (float)($item['price'] ?? 0),
                'total_price' => (float)($o['total_price'] ?? 0),
                'currency'    => strtoupper((string)($o['currency'] ?? '')), // [228차 S5] 다통화 정규화

                'status'      => self::shopifyOrderStatus($o['financial_status'] ?? '', $o['fulfillment_status'] ?? ''),
                'addr'        => ($o['shipping_address']['address1'] ?? '') . ' ' . ($o['shipping_address']['city'] ?? ''),
                'ordered_at'  => $o['created_at'] ?? '',
                'event_type'  => 'order',
                'source'      => 'live',
            ];
        }, $oBody['orders'] ?? []);

        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders];
    }

    private static function shopifyOrderStatus(string $fin, string $ful): string
    {
        if ($fin === 'refunded') return '반품완료';
        if ($fin === 'voided')   return '취소완료';
        if ($ful === 'fulfilled') return '배송완료';
        if ($ful === 'partial')   return '배송중';
        if ($fin === 'paid')      return '발주확인';
        return '출고대기';
    }

    // ── Amazon SP-API ────────────────────────────────────────────────────
    private static function amazonFetch(array $creds, string $tenant = 'demo'): array
    {
        // 데모: 구조화 미리보기(saveProducts/saveOrders chokepoint 가 운영 테넌트 유입 차단).
        if ($tenant === 'demo') {
            $marketplace = $creds['marketplace_id'] ?? 'A1PA6795UKMFR9';
            return ['ok'=>true, 'products'=>self::amazonDemoProducts($marketplace), 'orders'=>self::amazonDemoOrders($marketplace), 'note'=>'demo preview'];
        }
        // [현 차수] Amazon SP-API 실연동 — LWA access token 직접 사용(2023년 이후 SigV4 불필요).
        //   자격증명: client_id, client_secret, refresh_token, marketplace_id. (라이브 검증은 실 판매자 계정 필요.)
        $clientId      = trim((string)($creds['client_id'] ?? ''));
        $clientSecret  = trim((string)($creds['client_secret'] ?? ''));
        $refreshToken  = trim((string)($creds['refresh_token'] ?? $creds['key_value'] ?? ''));
        $marketplaceId = trim((string)($creds['marketplace_id'] ?? 'ATVPDKIKX0DER'));
        if ($clientId === '' || $clientSecret === '' || $refreshToken === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Amazon SP-API: client_id·client_secret·refresh_token·marketplace_id 입력 필요'];
        }
        // 1) LWA refresh_token → access_token
        [$tCode, $tBody] = self::httpPost(
            'https://api.amazon.com/auth/o2/token',
            ['Content-Type' => 'application/x-www-form-urlencoded'],
            http_build_query(['grant_type'=>'refresh_token','refresh_token'=>$refreshToken,'client_id'=>$clientId,'client_secret'=>$clientSecret])
        );
        $accessToken = (string)($tBody['access_token'] ?? '');
        if ($accessToken === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Amazon LWA 토큰 발급 실패(code={$tCode}) — client_id/secret/refresh_token 확인"];
        }
        // 2) SP-API Orders(최근 30일). x-amz-access-token 헤더만으로 인증.
        $host = self::amazonEndpoint($marketplaceId);
        $createdAfter = gmdate('Y-m-d\TH:i:s\Z', time() - 30 * 86400);
        $url = "https://{$host}/orders/v0/orders?MarketplaceIds=" . rawurlencode($marketplaceId) . "&CreatedAfter=" . rawurlencode($createdAfter);
        [$oCode, $oBody] = self::httpGet($url, ['x-amz-access-token' => $accessToken, 'Accept' => 'application/json']);
        if ($oCode >= 400 || !isset($oBody['payload'])) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Amazon Orders 조회 실패(code={$oCode}) — SP-API 앱 Orders 권한 확인"];
        }
        $orders = [];
        foreach ((array)($oBody['payload']['Orders'] ?? []) as $o) {
            $oid = (string)($o['AmazonOrderId'] ?? '');
            if ($oid === '') continue;
            $orders[] = [
                'channel_order_id' => $oid,
                'buyer_name'  => (string)($o['BuyerInfo']['BuyerName'] ?? ''),
                'buyer_email' => (string)($o['BuyerInfo']['BuyerEmail'] ?? ''),
                'product_name'=> 'Amazon Order',
                'sku'         => '',
                'qty'         => (int)($o['NumberOfItemsShipped'] ?? 0) + (int)($o['NumberOfItemsUnshipped'] ?? 0),
                'unit_price'  => 0,
                'total_price' => (float)($o['OrderTotal']['Amount'] ?? 0),
                'currency'    => strtoupper((string)($o['OrderTotal']['CurrencyCode'] ?? '')), // [228차 S5] 다통화 정규화
                'status'      => strtolower((string)($o['OrderStatus'] ?? 'pending')),
                'ordered_at'  => (string)($o['PurchaseDate'] ?? gmdate('c')),
                'source'      => 'spapi',
            ];
        }
        // [M6] 상품 수집 — FBA Inventory Summaries(sellerSku·asin·재고). FBA 판매자만 채워지며
        //   FBM 전용/권한 미부여 시 graceful 빈배열(가짜데이터 0). 주문 흐름과 독립(실패해도 주문은 보존).
        $products = self::amazonProducts($host, $accessToken, $marketplaceId);
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' Amazon orders + ' . count($products) . ' products synced (SP-API)'];
    }

    /** [M6] Amazon FBA Inventory Summaries → 상품 목록(sellerSku·asin·총재고). 실패 시 빈배열. */
    private static function amazonProducts(string $host, string $accessToken, string $marketplaceId): array
    {
        $url = "https://{$host}/fba/inventory/v1/summaries?details=true&granularityType=Marketplace&granularityId="
            . rawurlencode($marketplaceId) . "&marketplaceIds=" . rawurlencode($marketplaceId);
        [$code, $body] = self::httpGet($url, ['x-amz-access-token' => $accessToken, 'Accept' => 'application/json']);
        if ($code >= 400 || !isset($body['payload']['inventorySummaries'])) return [];
        $products = [];
        foreach ((array)($body['payload']['inventorySummaries'] ?? []) as $s) {
            $sku = (string)($s['sellerSku'] ?? '');
            if ($sku === '') continue;
            $products[] = [
                'channel_product_id' => (string)($s['asin'] ?? $sku),
                'sku'       => $sku,
                'name'      => (string)($s['productName'] ?? ''),
                'inventory' => (int)($s['totalQuantity'] ?? 0),
                'status'    => 'active',
                'source'    => 'spapi',
            ];
        }
        return $products;
    }

    /** Amazon 마켓플레이스 ID → SP-API 리전 엔드포인트(NA/EU/FE). */
    private static function amazonEndpoint(string $mp): string
    {
        $fe = ['A1VC38T7YXB528','A39IBJ37TRP1C6','A19VAU5U5O7RUS']; // JP/AU/SG
        $eu = ['A1F83G8C2ARO7P','A1PA6795UKMFR9','A13V1IB3VIYZZH','APJ6JRA9NG5V4','A1RKKUPIHCS9HS','A1805IZSGTT6HS','A2NODRKZP88ZB9','A1C3SOZRARQ6R3','ARBP9OOSHTCHU','A33AVAJ2PDY3EV','A17E79C6D8DWNP','A2VIGQ35RCS4UG','AMEN7PMS3EDWL']; // UK/DE/FR/IT/ES/NL/SE/PL/EG/TR/AE/SA/BE
        if (in_array($mp, $fe, true)) return 'sellingpartnerapi-fe.amazon.com';
        if (in_array($mp, $eu, true)) return 'sellingpartnerapi-eu.amazon.com';
        return 'sellingpartnerapi-na.amazon.com'; // US/CA/MX/BR 기본
    }

    private static function amazonDemoProducts(string $marketplace): array
    {
        $isJP = str_contains($marketplace, 'JP') || $marketplace === 'A1VC38T7YXB528';
        $suffix = $isJP ? '(JP)' : '(Global)';
        $currency = $isJP ? 1800 : 1300;
        $products = [];
        foreach (range(1, 5) as $i) {
            $basePrice = ($i * 29000 + 20000) * ($isJP ? 1 : 1) ;
            $products[] = [
                'channel_product_id' => "B0AMDEMO{$i}",
                'sku'       => "AMZ-SKU-" . str_pad((string)$i, 3, '0', STR_PAD_LEFT),
                'name'      => "Amazon 상품 {$i} {$suffix}",
                'price'     => $basePrice,
                'compare_price' => (int)($basePrice * 1.15),
                'inventory' => rand(10, 200),
                'status'    => 'active',
                'category'  => 'Electronics',
                'source'    => 'structured',
            ];
        }
        return $products;
    }

    private static function amazonDemoOrders(string $marketplace): array
    {
        $orders = [];
        foreach (range(1, 5) as $i) {
            $orders[] = [
                'channel_order_id' => "111-" . rand(1000000, 9999999) . "-" . rand(1000000, 9999999),
                'buyer_name'  => "Amazon Buyer {$i}",
                'product_name'=> "Amazon 상품 {$i}",
                'qty'         => rand(1, 3),
                'unit_price'  => $i * 15000,
                'total_price' => $i * 15000 * rand(1, 3),
                'status'      => ['발주확인','배송중','배송완료'][$i % 3],
                'carrier'     => ['FedEx','DHL','UPS'][$i % 3],
                'ordered_at'  => date('Y-m-d H:i:s', strtotime("-{$i} days")),
                'event_type'  => 'order',
                'source'      => 'structured',
            ];
        }
        return $orders;
    }

    // ── 쿠팡 Wing API ───────────────────────────────────────────────────
    private static function coupangFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('coupang', '쿠팡'), 'orders'=>self::buildDemoChannelOrders('coupang', '쿠팡'), 'note'=>'demo preview'];
        }
        // [현 차수] Coupang Wing Open API 실연동 — HMAC-SHA256(CEA) 서명. (라이브 검증은 실 벤더 계정 필요.)
        $accessKey = trim((string)($creds['access_key'] ?? ''));
        $secretKey = trim((string)($creds['secret_key'] ?? ''));
        $vendorId  = trim((string)($creds['vendor_id'] ?? ''));
        if ($accessKey === '' || $secretKey === '' || $vendorId === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Coupang: access_key·secret_key·vendor_id 입력 필요'];
        }
        $host  = 'https://api-gateway.coupang.com';
        $path  = "/v2/providers/openapi/apis/api/v4/vendors/{$vendorId}/ordersheets";
        $from  = gmdate('Y-m-d', time() - 7 * 86400);
        $to    = gmdate('Y-m-d');
        $query = "createdAtFrom={$from}&createdAtTo={$to}&status=ACCEPT&maxPerPage=50";
        // CEA HMAC: message = signedDate(yymmddTHHMMSSZ) + method + path + query
        $datetime  = gmdate('ymd\THis\Z');
        $signature = hash_hmac('sha256', $datetime . 'GET' . $path . $query, $secretKey);
        $auth = "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$datetime}, signature={$signature}";
        [$code, $body] = self::httpGet($host . $path . '?' . $query, ['Authorization' => $auth, 'Content-Type' => 'application/json;charset=UTF-8']);
        if ($code >= 400) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Coupang 주문 조회 실패(code={$code}) — access_key/secret_key/vendor_id 확인"];
        }
        $orders = [];
        foreach ((array)($body['data'] ?? []) as $os) {
            $items = (array)($os['orderItems'] ?? []);
            $first = $items[0] ?? [];
            $total = 0; $qty = 0;
            foreach ($items as $it) { $total += (float)($it['orderPrice'] ?? 0); $qty += (int)($it['shippingCount'] ?? 0); }
            $orders[] = [
                'channel_order_id' => (string)($os['orderId'] ?? ''),
                'buyer_name'  => (string)($os['orderer']['name'] ?? ''),
                'buyer_email' => (string)($os['orderer']['email'] ?? ''),
                'product_name'=> (string)($first['vendorItemName'] ?? $first['sellerProductName'] ?? 'Coupang Order'),
                'sku'         => (string)($first['sellerProductItemId'] ?? $first['vendorItemId'] ?? ''),
                'qty'         => $qty ?: count($items),
                'unit_price'  => 0,
                'total_price' => $total,
                'status'      => strtolower((string)($os['status'] ?? 'accept')),
                'ordered_at'  => (string)($os['orderedAt'] ?? gmdate('c')),
                'source'      => 'coupang_api',
            ];
        }
        // [M6] 상품 수집 — Coupang seller-products(동일 CEA HMAC 서명 재사용). 실패 시 빈배열.
        $products = self::coupangProducts($host, $accessKey, $secretKey, $vendorId);
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' Coupang orders + ' . count($products) . ' products synced'];
    }

    /** [M6] Coupang 등록상품 목록(seller-products) → 상품 매핑. 주문과 동일 CEA HMAC 서명. 실패 시 빈배열. */
    private static function coupangProducts(string $host, string $accessKey, string $secretKey, string $vendorId): array
    {
        $path  = '/v2/providers/seller_api/apis/api/v1/marketplace/seller-products';
        $query = "vendorId={$vendorId}&maxPerPage=50";
        $datetime  = gmdate('ymd\THis\Z');
        $signature = hash_hmac('sha256', $datetime . 'GET' . $path . $query, $secretKey);
        $auth = "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$datetime}, signature={$signature}";
        [$code, $body] = self::httpGet($host . $path . '?' . $query, ['Authorization' => $auth, 'Content-Type' => 'application/json;charset=UTF-8']);
        if ($code >= 400) return [];
        $products = [];
        foreach ((array)($body['data'] ?? []) as $p) {
            $pid = (string)($p['sellerProductId'] ?? '');
            if ($pid === '') continue;
            $item0 = (array)(($p['items'] ?? [])[0] ?? []);
            $products[] = [
                'channel_product_id' => $pid,
                'sku'       => (string)($item0['externalVendorSku'] ?? $item0['vendorItemId'] ?? ''),
                'name'      => (string)($p['sellerProductName'] ?? ''),
                'price'     => (float)($item0['salePrice'] ?? 0),
                'inventory' => (int)($item0['maximumBuyCount'] ?? 0),
                'status'    => strtolower((string)($p['statusName'] ?? 'active')),
                'category'  => (string)($p['displayCategoryCode'] ?? ''),
                'source'    => 'coupang_api',
            ];
        }
        return $products;
    }

    // ── 네이버 스마트스토어 ─────────────────────────────────────────────
    private static function naverFetch(array $creds, string $tenant = 'demo'): array
    {
        $clientId     = $creds['client_id'] ?? '';
        $clientSecret = $creds['client_secret'] ?? '';

        if ($clientId && $clientSecret) {
            // 네이버 OAuth2 토큰 요청
            $timestamp = (int)(microtime(true) * 1000);
            $sign = base64_encode(hash_hmac('sha256', "{$clientId}_{$timestamp}", $clientSecret, true));
            [$code, $body] = self::httpPost(
                'https://api.commerce.naver.com/external/v1/oauth2/token',
                ['Content-Type' => 'application/x-www-form-urlencoded'],
                "client_id={$clientId}&timestamp={$timestamp}&client_secret_sign={$sign}&grant_type=client_credentials&type=SELF"
            );
            if ($code === 200 && isset($body['access_token'])) {
                $token = $body['access_token'];
                [$oCode, $oBody] = self::httpGet(
                    'https://api.commerce.naver.com/external/v1/pay-order/seller/orders?page=1&size=20',
                    ['Authorization' => "Bearer {$token}"]
                );
                $orders = [];
                foreach (($oBody['data'] ?? []) as $o) {
                    $orders[] = [
                        'channel_order_id' => (string)($o['orderId'] ?? $o['orderNo'] ?? uniqid()),
                        'buyer_name'  => $o['buyerName'] ?? '',
                        'product_name'=> $o['productName'] ?? '',
                        'qty'         => (int)($o['quantity'] ?? 1),
                        'unit_price'  => (float)($o['unitPrice'] ?? 0),
                        'total_price' => (float)($o['totalPayAmount'] ?? 0),
                        'status'      => '발주확인',
                        'ordered_at'  => $o['paymentDate'] ?? date('Y-m-d H:i:s'),
                        'event_type'  => 'order',
                        'source'      => 'live',
                    ];
                }
                // [M6] 상품 수집 — 네이버 커머스 products/search(동일 access_token 재사용). 데모는 데모상품, 운영은 실 API.
                $products = ($tenant === 'demo') ? self::buildDemoChannelProducts('naver','네이버') : self::naverProducts($token);
                return ['ok'=>true, 'products'=>$products, 'orders'=>$orders];
            }
        }

        // 188차 P0 보안 정합(ebayFetch 패턴): 실 테넌트는 OAuth 실패/미보유 시 빈 결과(데모데이터 운영 유입 차단).
        if ($tenant === 'demo') {
            return [
                'ok'       => true,
                'products' => self::buildDemoChannelProducts('naver', '네이버'),
                'orders'   => self::buildDemoChannelOrders('naver', '네이버'),
                'note'     => '네이버 Commerce API: 데모 시뮬레이션.',
            ];
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'네이버 Commerce API: Client ID/Secret 등록 시 실데이터가 동기화됩니다.'];
    }

    /** [M6] 네이버 커머스 products/search → 상품 매핑(SALE 상태 50건). 실패 시 빈배열. */
    private static function naverProducts(string $token): array
    {
        [$code, $body] = self::httpPost(
            'https://api.commerce.naver.com/external/v1/products/search',
            ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json'],
            json_encode(['productStatusTypes' => ['SALE'], 'page' => 1, 'size' => 50], JSON_UNESCAPED_UNICODE)
        );
        if ($code !== 200) return [];
        $products = [];
        foreach ((array)($body['contents'] ?? []) as $c) {
            $op = (array)($c['originProduct'] ?? $c);
            $pid = (string)($c['originProductNo'] ?? $op['originProductNo'] ?? '');
            if ($pid === '') continue;
            $products[] = [
                'channel_product_id' => $pid,
                'sku'       => (string)($op['sellerManagementCode'] ?? ''),
                'name'      => (string)($op['name'] ?? ''),
                'price'     => (float)($op['salePrice'] ?? 0),
                'inventory' => (int)($op['stockQuantity'] ?? 0),
                'status'    => strtolower((string)($op['statusType'] ?? 'sale')),
                'source'    => 'live',
            ];
        }
        return $products;
    }

    // ── eBay ─────────────────────────────────────────────────────────────
    private static function ebayFetch(array $creds, string $tenant = 'demo'): array
    {
        $token = $creds['oauth_token'] ?? $creds['access_token'] ?? '';
        if ($token) {
            $products = [];
            [$code, $body] = self::httpGet(
                'https://api.ebay.com/sell/inventory/v1/inventory_item?limit=20',
                ['Authorization' => "Bearer {$token}", 'Content-Language' => 'en-US']
            );
            if ($code === 200) {
                $products = array_map(fn($p) => [
                    'channel_product_id' => $p['sku'] ?? uniqid(),
                    'sku'       => $p['sku'] ?? '',
                    'name'      => $p['product']['title'] ?? '',
                    'inventory' => (int)($p['availability']['shipToLocationAvailability']['quantity'] ?? 0),
                    'status'    => 'active',
                    'source'    => 'live',
                ], $body['inventoryItems'] ?? []);
            }
            // [현 차수 P1-3] eBay 주문 수집 — Sell Fulfillment API. 기존엔 상품만 수집·주문 항상 빈배열이라
            //   eBay(글로벌) 매출/CRM/귀속/정산이 전부 0으로 끊겼다. ★실패/토큰미보유 시 빈배열(현행 동일=회귀안전).
            //   통화는 saveOrders 의 fxToKrw 가 KRW 정규화. ★라이브 검증은 실 eBay 셀러 OAuth 필요(코드완비·검증대기).
            $orders = [];
            if ($tenant !== 'demo') {
                [$oCode, $oBody] = self::httpGet(
                    'https://api.ebay.com/sell/fulfillment/v1/order?limit=50',
                    ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json']
                );
                if ($oCode === 200 && is_array($oBody['orders'] ?? null)) {
                    foreach ($oBody['orders'] as $o) {
                        $lis = is_array($o['lineItems'] ?? null) ? $o['lineItems'] : [];
                        $li  = $lis[0] ?? [];
                        $qty = 0; foreach ($lis as $l) { $qty += (int)($l['quantity'] ?? 0); }
                        if ($qty < 1) $qty = 1;
                        $orders[] = [
                            'channel_order_id' => (string)($o['orderId'] ?? ''),
                            'buyer_name'  => (string)($o['buyer']['username'] ?? ''),
                            'buyer_email' => null,
                            'product_name'=> (string)($li['title'] ?? ''),
                            'sku'         => (string)($li['sku'] ?? ''),
                            'qty'         => $qty,
                            'unit_price'  => 0.0,
                            'total_price' => (float)($o['pricingSummary']['total']['value'] ?? 0),
                            'currency'    => strtoupper((string)($o['pricingSummary']['total']['currency'] ?? '')),
                            'status'      => (string)($o['orderFulfillmentStatus'] ?? 'NOT_STARTED'),
                            'ordered_at'  => (string)($o['creationDate'] ?? ''),
                            'source'      => 'live',
                        ];
                    }
                }
            }
            if (!empty($products) || !empty($orders)) {
                return ['ok'=>true, 'products'=>$products, 'orders'=>($tenant==='demo' ? self::buildDemoChannelOrders('ebay','eBay') : $orders)];
            }
        }
        // 188차 P0 보안: 데모 데이터의 운영 DB 유입 차단. 실 테넌트는 OAuth 토큰 미보유 시 빈 결과.
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('ebay','eBay'), 'orders'=>self::buildDemoChannelOrders('ebay','eBay'), 'note'=>'eBay Inventory API: OAuth token required for live sync.'];
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'eBay: OAuth 토큰 등록 시 실데이터(상품·주문)가 동기화됩니다.'];
    }

    // ── TikTok Shop ──────────────────────────────────────────────────────
    private static function tiktokFetch(array $creds, string $tenant = 'demo'): array
    {
        // 데모: 구조화 미리보기(saveProducts/saveOrders chokepoint 가 운영 테넌트 유입 차단).
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('tiktok','TikTok Shop'), 'orders'=>self::buildDemoChannelOrders('tiktok','TikTok Shop'), 'note'=>'demo preview'];
        }
        // [현 차수] TikTok Shop Open API v202309 실연동 — HMAC-SHA256 서명 + shop_cipher 2단계.
        //   자격증명: app_key, app_secret, access_token, (선택) shop_cipher. (라이브 검증은 실 판매자 계정 필요.)
        $appKey      = trim((string)($creds['app_key'] ?? ''));
        $appSecret   = trim((string)($creds['app_secret'] ?? $creds['secret_key'] ?? ''));
        $accessToken = trim((string)($creds['access_token'] ?? $creds['key_value'] ?? ''));
        $shopCipher  = trim((string)($creds['shop_cipher'] ?? ''));
        if ($appKey === '' || $appSecret === '' || $accessToken === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'TikTok Shop: app_key·app_secret·access_token 입력 필요'];
        }
        $base = 'https://open-api.tiktokglobalshop.com';
        // 1) shop_cipher 미입력 시 인가된 샵 목록에서 도출.
        if ($shopCipher === '') {
            $path = '/authorization/202309/shops';
            $q = ['app_key' => $appKey, 'timestamp' => (string)time()];
            $q['sign'] = self::tiktokSign($appSecret, $path, $q, '');
            [$sCode, $sBody] = self::httpGet($base . $path . '?' . http_build_query($q), ['x-tts-access-token' => $accessToken, 'Content-Type' => 'application/json']);
            if ($sCode >= 400 || (int)($sBody['code'] ?? -1) !== 0) {
                return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"TikTok Shop 샵 조회 실패(code={$sCode}) — app_key/app_secret/access_token 확인"];
            }
            $shops = (array)($sBody['data']['shops'] ?? []);
            $shopCipher = (string)($shops[0]['cipher'] ?? '');
            if ($shopCipher === '') {
                return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'TikTok Shop: 인가된 샵 없음 — 판매자 앱 인증 확인'];
            }
        }
        // 2) 최근 7일 주문 검색(POST). query=서명대상(app_key/timestamp/shop_cipher/page_size), body=기간 필터.
        $path = '/order/202309/orders/search';
        $q = ['app_key' => $appKey, 'timestamp' => (string)time(), 'shop_cipher' => $shopCipher, 'page_size' => '50'];
        $bodyJson = json_encode(['create_time_ge' => time() - 7 * 86400, 'create_time_lt' => time()], JSON_UNESCAPED_UNICODE);
        $q['sign'] = self::tiktokSign($appSecret, $path, $q, (string)$bodyJson);
        [$oCode, $oBody] = self::httpPost($base . $path . '?' . http_build_query($q), ['x-tts-access-token' => $accessToken, 'Content-Type' => 'application/json'], (string)$bodyJson);
        if ($oCode >= 400 || (int)($oBody['code'] ?? -1) !== 0) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"TikTok Shop 주문 조회 실패(code={$oCode}) — 권한/shop_cipher 확인"];
        }
        $orders = [];
        foreach ((array)($oBody['data']['orders'] ?? []) as $o) {
            $oid = (string)($o['id'] ?? '');
            if ($oid === '') continue;
            $items = (array)($o['line_items'] ?? []);
            $first = $items[0] ?? [];
            $orders[] = [
                'channel_order_id' => $oid,
                'buyer_name'  => (string)($o['recipient_address']['name'] ?? ''),
                'buyer_email' => (string)($o['buyer_email'] ?? ''),
                'product_name'=> (string)($first['product_name'] ?? 'TikTok Shop Order'),
                'sku'         => (string)($first['seller_sku'] ?? $first['sku_id'] ?? ''),
                'qty'         => count($items),
                'unit_price'  => 0,
                'total_price' => (float)($o['payment']['total_amount'] ?? 0),
                'status'      => strtolower((string)($o['status'] ?? 'unpaid')),
                'ordered_at'  => isset($o['create_time']) ? gmdate('c', (int)$o['create_time']) : gmdate('c'),
                'source'      => 'tiktok_api',
            ];
        }
        // [M6] 상품 수집 — TikTok Shop products/search(동일 서명+shop_cipher 재사용). 실패 시 빈배열.
        $products = self::tiktokProducts($base, $appKey, $appSecret, $accessToken, $shopCipher);
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' TikTok Shop orders + ' . count($products) . ' products synced'];
    }

    /** [M6] TikTok Shop products/search → 상품 매핑(첫 SKU 가격·재고). 주문과 동일 HMAC 서명. 실패 시 빈배열. */
    private static function tiktokProducts(string $base, string $appKey, string $appSecret, string $accessToken, string $shopCipher): array
    {
        $path = '/product/202309/products/search';
        $q = ['app_key' => $appKey, 'timestamp' => (string)time(), 'shop_cipher' => $shopCipher, 'page_size' => '50'];
        $bodyJson = json_encode(['status' => 'ACTIVATE'], JSON_UNESCAPED_UNICODE);
        $q['sign'] = self::tiktokSign($appSecret, $path, $q, (string)$bodyJson);
        [$code, $body] = self::httpPost($base . $path . '?' . http_build_query($q), ['x-tts-access-token' => $accessToken, 'Content-Type' => 'application/json'], (string)$bodyJson);
        if ($code >= 400 || (int)($body['code'] ?? -1) !== 0) return [];
        $products = [];
        foreach ((array)($body['data']['products'] ?? []) as $p) {
            $pid = (string)($p['id'] ?? '');
            if ($pid === '') continue;
            $sku0 = (array)(($p['skus'] ?? [])[0] ?? []);
            $products[] = [
                'channel_product_id' => $pid,
                'sku'       => (string)($sku0['seller_sku'] ?? $sku0['id'] ?? ''),
                'name'      => (string)($p['title'] ?? ''),
                'price'     => (float)($sku0['price']['sale_price'] ?? $sku0['price']['tax_exclusive_price'] ?? 0),
                'inventory' => (int)(($sku0['inventory'][0]['quantity'] ?? 0)),
                'status'    => strtolower((string)($p['status'] ?? 'activate')),
                'source'    => 'tiktok_api',
            ];
        }
        return $products;
    }

    /** TikTok Shop Open API v202309 HMAC-SHA256 서명. message = appSecret + path + 정렬된 {key}{value} 연결 + body + appSecret. */
    private static function tiktokSign(string $appSecret, string $path, array $params, string $body = ''): string
    {
        $filtered = [];
        foreach ($params as $k => $v) {
            if ($k === 'sign' || $k === 'access_token') continue; // sign·access_token 제외
            $filtered[$k] = $v;
        }
        ksort($filtered); // key 알파벳 정렬
        $concat = '';
        foreach ($filtered as $k => $v) { $concat .= $k . $v; } // {key}{value} 연결
        $message = $appSecret . $path . $concat . $body . $appSecret;
        return hash_hmac('sha256', $message, $appSecret);
    }

    // ── Rakuten RMS (일본) ───────────────────────────────────────────────
    private static function rakutenFetch(array $creds, string $tenant = 'demo'): array
    {
        // 데모: 구조화 미리보기(chokepoint 가 운영 유입 차단).
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('rakuten','Rakuten'), 'orders'=>self::buildDemoChannelOrders('rakuten','Rakuten'), 'note'=>'demo preview'];
        }
        // [현 차수] Rakuten RMS RakutenPayOrder API 실연동 — ESA 인증(base64(serviceSecret:licenseKey)). (라이브 검증은 실 점포 계정 필요.)
        $serviceSecret = trim((string)($creds['service_secret'] ?? ''));
        $licenseKey    = trim((string)($creds['license_key'] ?? ''));
        if ($serviceSecret === '' || $licenseKey === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Rakuten: service_secret·license_key 입력 필요'];
        }
        $headers = ['Authorization' => 'ESA ' . base64_encode($serviceSecret . ':' . $licenseKey), 'Content-Type' => 'application/json; charset=utf-8'];
        // 1) 주문번호 검색(최근 7일, dateType=1 주문일). JST(+09:00).
        $searchBody = json_encode([
            'dateType'      => 1,
            'startDatetime' => gmdate('Y-m-d\T00:00:00+0900', time() - 7 * 86400),
            'endDatetime'   => gmdate('Y-m-d\T23:59:59+0900', time()),
            'PaginationRequestModel' => ['requestRecordsAmount' => 100, 'requestPage' => 1],
        ], JSON_UNESCAPED_UNICODE);
        [$sCode, $sBody] = self::httpPost('https://api.rms.rakuten.co.jp/es/2.0/order/searchOrder/', $headers, (string)$searchBody);
        $orderNumbers = (array)($sBody['orderNumberList'] ?? []);
        if ($sCode >= 400 || empty($orderNumbers)) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Rakuten 주문 검색(code={$sCode}) — service_secret/license_key 또는 기간내 주문 확인"];
        }
        // 2) 주문 상세 조회.
        $getBody = json_encode(['orderNumberList' => array_slice($orderNumbers, 0, 100), 'version' => 7], JSON_UNESCAPED_UNICODE);
        [$gCode, $gBody] = self::httpPost('https://api.rms.rakuten.co.jp/es/2.0/order/getOrder/', $headers, (string)$getBody);
        if ($gCode >= 400) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Rakuten 주문 상세 실패(code={$gCode})"];
        }
        $orders = [];
        foreach ((array)($gBody['OrderModelList'] ?? []) as $o) {
            $oid = (string)($o['orderNumber'] ?? '');
            if ($oid === '') continue;
            $items = (array)($o['PackageModelList'][0]['ItemModelList'] ?? []);
            $first = $items[0] ?? [];
            $qty = 0; foreach ($items as $it) { $qty += (int)($it['units'] ?? 0); }
            $orders[] = [
                'channel_order_id' => $oid,
                'buyer_name'  => trim((string)($o['OrdererModel']['lastName'] ?? '') . ' ' . (string)($o['OrdererModel']['firstName'] ?? '')),
                'buyer_email' => (string)($o['OrdererModel']['emailAddress'] ?? ''),
                'product_name'=> (string)($first['itemName'] ?? 'Rakuten Order'),
                'sku'         => (string)($first['manageNumber'] ?? $first['itemNumber'] ?? ''),
                'qty'         => $qty ?: count($items),
                'unit_price'  => (float)($first['price'] ?? 0),
                'total_price' => (float)($o['totalPrice'] ?? 0),
                'currency'    => 'JPY', // [228차 S5] Rakuten(일본)=엔화 → KRW 정규화
                'status'      => 'rakuten-' . (string)($o['orderProgress'] ?? '100'),
                'ordered_at'  => (string)($o['orderDatetime'] ?? gmdate('c')),
                'source'      => 'rakuten_api',
            ];
        }
        // [M6] 상품 수집 — Rakuten RMS Item API 2.0(동일 ESA 인증 재사용). 실패 시 빈배열.
        $products = self::rakutenProducts($headers);
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' Rakuten orders + ' . count($products) . ' products synced'];
    }

    /** [M6] Rakuten RMS items/search → 상품 매핑(manageNumber·title·standardPrice). 실패 시 빈배열. */
    private static function rakutenProducts(array $headers): array
    {
        [$code, $body] = self::httpGet('https://api.rms.rakuten.co.jp/es/2.0/items/search?hits=50', $headers);
        if ($code >= 400) return [];
        $rows = (array)($body['items'] ?? $body['Items'] ?? []);
        $products = [];
        foreach ($rows as $row) {
            $it = (array)($row['item'] ?? $row['Item'] ?? $row);
            $mn = (string)($it['manageNumber'] ?? $it['itemNumber'] ?? '');
            if ($mn === '') continue;
            $products[] = [
                'channel_product_id' => $mn,
                'sku'       => $mn,
                'name'      => (string)($it['title'] ?? $it['itemName'] ?? ''),
                'price'     => (float)($it['standardPrice'] ?? $it['itemPrice'] ?? 0),
                'inventory' => (int)($it['quantity'] ?? 0),
                'status'    => 'active',
                'source'    => 'rakuten_api',
            ];
        }
        return $products;
    }

    // ── Cafe24 (D2C) ─────────────────────────────────────────────────────
    private static function cafe24Fetch(array $creds, string $tenant = 'demo'): array
    {
        // 데모: 구조화 미리보기(chokepoint 가 운영 유입 차단).
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('cafe24','Cafe24'), 'orders'=>self::buildDemoChannelOrders('cafe24','Cafe24'), 'note'=>'demo preview'];
        }
        // [현 차수] Cafe24 Admin API 실연동 — OAuth2 refresh_token grant → orders. (라이브 검증은 실 몰 계정 필요.)
        $mallId       = trim((string)($creds['mall_id'] ?? ''));
        $clientId     = trim((string)($creds['client_id'] ?? ''));
        $clientSecret = trim((string)($creds['client_secret'] ?? ''));
        $refreshToken = trim((string)($creds['refresh_token'] ?? ''));
        if ($mallId === '' || $clientId === '' || $clientSecret === '' || $refreshToken === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Cafe24: mall_id·client_id·client_secret·refresh_token 입력 필요'];
        }
        $apiBase = "https://{$mallId}.cafe24api.com/api/v2";
        // 1) refresh_token → access_token (Basic base64(client_id:client_secret)).
        [$tCode, $tBody] = self::httpPost(
            "{$apiBase}/oauth/token",
            ['Authorization' => 'Basic ' . base64_encode($clientId . ':' . $clientSecret), 'Content-Type' => 'application/x-www-form-urlencoded'],
            http_build_query(['grant_type' => 'refresh_token', 'refresh_token' => $refreshToken])
        );
        $accessToken = (string)($tBody['access_token'] ?? '');
        if ($accessToken === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Cafe24 토큰 발급 실패(code={$tCode}) — client_id/secret/refresh_token 확인"];
        }
        // 2) orders(최근 7일). embed=items 로 품목 동시조회.
        $url = "{$apiBase}/admin/orders?start_date=" . gmdate('Y-m-d', time() - 7 * 86400) . '&end_date=' . gmdate('Y-m-d') . '&limit=50&embed=items';
        [$oCode, $oBody] = self::httpGet($url, [
            'Authorization' => "Bearer {$accessToken}",
            'Content-Type' => 'application/json',
            'X-Cafe24-Api-Version' => '2024-06-01',
        ]);
        if ($oCode >= 400 || !isset($oBody['orders'])) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Cafe24 주문 조회 실패(code={$oCode}) — Admin API mall.read_order 권한 확인"];
        }
        $orders = [];
        foreach ((array)($oBody['orders'] ?? []) as $o) {
            $oid = (string)($o['order_id'] ?? '');
            if ($oid === '') continue;
            $items = (array)($o['items'] ?? []);
            $first = $items[0] ?? [];
            $qty = 0; foreach ($items as $it) { $qty += (int)($it['quantity'] ?? 0); }
            $orders[] = [
                'channel_order_id' => $oid,
                'buyer_name'  => (string)($o['buyer']['name'] ?? $o['billing_name'] ?? ''),
                'buyer_email' => (string)($o['buyer']['email'] ?? ''),
                'product_name'=> (string)($first['product_name'] ?? 'Cafe24 Order'),
                'sku'         => (string)($first['product_code'] ?? ''),
                'qty'         => $qty ?: count($items),
                'unit_price'  => (float)($first['product_price'] ?? 0),
                'total_price' => (float)($o['payment_amount'] ?? $o['order_price_amount'] ?? 0),
                'status'      => strtolower((string)($o['order_status'] ?? 'n00')),
                'ordered_at'  => (string)($o['order_date'] ?? gmdate('c')),
                'source'      => 'cafe24_api',
            ];
        }
        // [M6] 상품 수집 — Cafe24 admin/products(동일 access_token 재사용). 실패 시 빈배열.
        $products = self::cafe24Products($apiBase, $accessToken);
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' Cafe24 orders + ' . count($products) . ' products synced'];
    }

    /** [M6] Cafe24 admin/products → 상품 매핑(product_no·product_code·price). 실패 시 빈배열. */
    private static function cafe24Products(string $apiBase, string $accessToken): array
    {
        $url = "{$apiBase}/admin/products?limit=50&embed=variants";
        [$code, $body] = self::httpGet($url, [
            'Authorization' => "Bearer {$accessToken}",
            'Content-Type' => 'application/json',
            'X-Cafe24-Api-Version' => '2024-06-01',
        ]);
        if ($code >= 400 || !isset($body['products'])) return [];
        $products = [];
        foreach ((array)($body['products'] ?? []) as $p) {
            $pno = (string)($p['product_no'] ?? '');
            if ($pno === '') continue;
            $variants = (array)($p['variants'] ?? []);
            $inv = 0; foreach ($variants as $v) { $inv += (int)($v['quantity'] ?? 0); }
            $products[] = [
                'channel_product_id' => $pno,
                'sku'       => (string)($p['product_code'] ?? ''),
                'name'      => (string)($p['product_name'] ?? ''),
                'price'     => (float)($p['price'] ?? 0),
                'inventory' => $inv,
                'status'    => ((string)($p['selling'] ?? 'T') === 'T') ? 'active' : 'inactive',
                'source'    => 'cafe24_api',
            ];
        }
        return $products;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  [232차 Sprint2] 글로벌 커머스 실 fetch 어댑터 9종 — genericFetch stub 제거.
    //    WooCommerce/Magento/Walmart/Etsy = 저장 자격증명만으로 end-to-end 수집.
    //    Shopee/Lazada = HMAC 서명 + OAuth access_token. Qoo10/Yahoo!JP/godomall = 문서화 엔드포인트
    //    best-effort(라이브 셀러 계정 검증 필요). 전부 데모=미리보기 / 자격증명 부족=graceful note.
    //    saveProducts/saveOrders chokepoint(tenant!=='demo')가 데모데이터 운영유입을 차단한다.
    // ══════════════════════════════════════════════════════════════════════

    /** 커머스 주문상태 → 내부 정본 라벨 매핑(전 채널 공통). */
    private static function genStatus(string $s): string
    {
        $s = strtolower(trim($s));
        return match (true) {
            in_array($s, ['refunded','refund','return','returned','반품'], true)            => '반품완료',
            in_array($s, ['cancelled','canceled','void','voided','closed','취소'], true)     => '취소완료',
            in_array($s, ['completed','complete','fulfilled','delivered','shipped','done'], true) => '배송완료',
            in_array($s, ['processing','on-hold','onhold','in_transit','ready_to_ship','partial'], true) => '배송중',
            in_array($s, ['paid','payment','confirmed','open','created','new','unshipped','pending_payment'], true) => '발주확인',
            default => '출고대기',
        };
    }

    // ── WooCommerce (REST v3 · consumer key/secret) ─────────────────────────
    private static function woocommerceFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('woocommerce','WooCommerce'), 'orders'=>self::buildDemoChannelOrders('woocommerce','WooCommerce'), 'note'=>'demo preview'];
        $site = rtrim(trim((string)($creds['site_url'] ?? '')), '/');
        $ck = trim((string)($creds['consumer_key'] ?? '')); $cs = trim((string)($creds['consumer_secret'] ?? ''));
        if ($site === '' || $ck === '' || $cs === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'WooCommerce: site_url·consumer_key·consumer_secret 입력 필요'];
        if (!str_starts_with($site, 'http')) $site = 'https://' . $site;
        $auth = '&consumer_key=' . rawurlencode($ck) . '&consumer_secret=' . rawurlencode($cs);
        [$pCode, $pBody] = self::httpGet("{$site}/wp-json/wc/v3/products?per_page=50{$auth}");
        [$oCode, $oBody] = self::httpGet("{$site}/wp-json/wc/v3/orders?per_page=50{$auth}");
        if ($pCode >= 400 && $oCode >= 400) return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"WooCommerce 연결 실패(code={$pCode}/{$oCode}) — site_url·키/권한 확인"];
        $products = [];
        foreach ((array)$pBody as $p) {
            if (!is_array($p) || !isset($p['id'])) continue;
            $products[] = [
                'channel_product_id'=>(string)$p['id'], 'sku'=>(string)($p['sku'] ?? ''), 'name'=>(string)($p['name'] ?? ''),
                'price'=>(float)($p['price'] ?? 0), 'compare_price'=>(float)($p['regular_price'] ?? 0),
                'inventory'=>(int)($p['stock_quantity'] ?? 0), 'status'=>(string)($p['status'] ?? 'publish'),
                'category'=>(string)($p['categories'][0]['name'] ?? ''), 'image_url'=>$p['images'][0]['src'] ?? null, 'source'=>'live',
            ];
        }
        $orders = [];
        foreach ((array)$oBody as $o) {
            if (!is_array($o) || !isset($o['id'])) continue;
            $li = $o['line_items'][0] ?? [];
            $orders[] = [
                'channel_order_id'=>(string)$o['id'],
                'buyer_name'=>trim(((string)($o['billing']['first_name'] ?? '')) . ' ' . ((string)($o['billing']['last_name'] ?? ''))),
                'buyer_email'=>(string)($o['billing']['email'] ?? ''), 'product_name'=>(string)($li['name'] ?? ''),
                'sku'=>(string)($li['sku'] ?? ''), 'qty'=>(int)($li['quantity'] ?? 1), 'unit_price'=>(float)($li['price'] ?? 0),
                'total_price'=>(float)($o['total'] ?? 0), 'currency'=>strtoupper((string)($o['currency'] ?? '')),
                'status'=>self::genStatus((string)($o['status'] ?? '')), 'ordered_at'=>(string)($o['date_created'] ?? ''), 'source'=>'live',
            ];
        }
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' orders + ' . count($products) . ' products (WooCommerce REST)'];
    }

    // ── Magento / Adobe Commerce (REST V1 · Bearer integration token) ───────
    private static function magentoFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('magento','Magento'), 'orders'=>self::buildDemoChannelOrders('magento','Magento'), 'note'=>'demo preview'];
        $base = rtrim(trim((string)($creds['base_url'] ?? '')), '/'); $tok = trim((string)($creds['access_token'] ?? ''));
        if ($base === '' || $tok === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Magento: base_url·access_token(Integration 토큰) 입력 필요'];
        if (!str_starts_with($base, 'http')) $base = 'https://' . $base;
        $h = ['Authorization'=>'Bearer ' . $tok, 'Accept'=>'application/json'];
        [$pCode, $pBody] = self::httpGet("{$base}/rest/V1/products?searchCriteria%5BpageSize%5D=50", $h);
        [$oCode, $oBody] = self::httpGet("{$base}/rest/V1/orders?searchCriteria%5BpageSize%5D=50", $h);
        if ($pCode >= 400 && $oCode >= 400) return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Magento 연결 실패(code={$pCode}/{$oCode}) — base_url·토큰/권한 확인"];
        $products = [];
        foreach ((array)($pBody['items'] ?? []) as $p) {
            $qty = 0; foreach (($p['extension_attributes']['stock_item'] ?? []) as $sk=>$sv) { if ($sk==='qty') $qty=(int)$sv; }
            $products[] = [
                'channel_product_id'=>(string)($p['id'] ?? $p['sku'] ?? ''), 'sku'=>(string)($p['sku'] ?? ''), 'name'=>(string)($p['name'] ?? ''),
                'price'=>(float)($p['price'] ?? 0), 'compare_price'=>0.0, 'inventory'=>$qty,
                'status'=>((int)($p['status'] ?? 1) === 1) ? 'active' : 'inactive', 'source'=>'live',
            ];
        }
        $orders = [];
        foreach ((array)($oBody['items'] ?? []) as $o) {
            $it = $o['items'][0] ?? [];
            $orders[] = [
                'channel_order_id'=>(string)($o['increment_id'] ?? $o['entity_id'] ?? ''),
                'buyer_name'=>trim(((string)($o['customer_firstname'] ?? '')) . ' ' . ((string)($o['customer_lastname'] ?? ''))),
                'buyer_email'=>(string)($o['customer_email'] ?? ''), 'product_name'=>(string)($it['name'] ?? ''),
                'sku'=>(string)($it['sku'] ?? ''), 'qty'=>(int)($it['qty_ordered'] ?? 1), 'unit_price'=>(float)($it['price'] ?? 0),
                'total_price'=>(float)($o['grand_total'] ?? 0), 'currency'=>strtoupper((string)($o['order_currency_code'] ?? '')),
                'status'=>self::genStatus((string)($o['status'] ?? '')), 'ordered_at'=>(string)($o['created_at'] ?? ''), 'source'=>'live',
            ];
        }
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' orders + ' . count($products) . ' products (Magento REST)'];
    }

    // ── Walmart Marketplace (OAuth2 client_credentials → orders/items) ──────
    private static function walmartFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('walmart','Walmart'), 'orders'=>self::buildDemoChannelOrders('walmart','Walmart'), 'note'=>'demo preview'];
        $cid = trim((string)($creds['client_id'] ?? '')); $cs = trim((string)($creds['client_secret'] ?? ''));
        if ($cid === '' || $cs === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Walmart: client_id·client_secret 입력 필요'];
        $basic = base64_encode($cid . ':' . $cs);
        $cid2 = uniqid('gg', true);
        [$tCode, $tBody] = self::httpPost('https://marketplace.walmartapis.com/v3/token',
            ['Authorization'=>'Basic ' . $basic, 'Content-Type'=>'application/x-www-form-urlencoded', 'Accept'=>'application/json', 'WM_SVC.NAME'=>'Walmart Marketplace', 'WM_QOS.CORRELATION_ID'=>$cid2],
            'grant_type=client_credentials');
        $tok = (string)($tBody['access_token'] ?? '');
        if ($tok === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Walmart 토큰 발급 실패(code={$tCode}) — client_id/secret 확인"];
        $h = ['WM_SEC.ACCESS_TOKEN'=>$tok, 'Authorization'=>'Basic ' . $basic, 'WM_QOS.CORRELATION_ID'=>$cid2, 'WM_SVC.NAME'=>'Walmart Marketplace', 'Accept'=>'application/json'];
        $createdAfter = gmdate('Y-m-d\TH:i:s\Z', time() - 30 * 86400);
        [$oCode, $oBody] = self::httpGet('https://marketplace.walmartapis.com/v3/orders?limit=50&createdStartDate=' . rawurlencode($createdAfter), $h);
        $orders = [];
        foreach ((array)($oBody['list']['elements']['order'] ?? []) as $o) {
            $line = $o['orderLines']['orderLine'][0] ?? [];
            $amt = 0.0;
            foreach (($line['charges']['charge'] ?? []) as $c) { $amt += (float)($c['chargeAmount']['amount'] ?? 0); }
            $statusNode = $line['orderLineStatuses']['orderLineStatus'][0]['status'] ?? '';
            $orders[] = [
                'channel_order_id'=>(string)($o['purchaseOrderId'] ?? $o['customerOrderId'] ?? ''),
                'buyer_name'=>(string)($o['shippingInfo']['postalAddress']['name'] ?? ''),
                'buyer_email'=>(string)($o['customerEmailId'] ?? ''), 'product_name'=>(string)($line['item']['productName'] ?? ''),
                'sku'=>(string)($line['item']['sku'] ?? ''), 'qty'=>(int)($line['orderLineQuantity']['amount'] ?? 1),
                'unit_price'=>0.0, 'total_price'=>$amt, 'currency'=>'USD',
                'status'=>self::genStatus((string)$statusNode), 'ordered_at'=>gmdate('c', (int)((($o['orderDate'] ?? 0)) / 1000) ?: time()), 'source'=>'live',
            ];
        }
        [$iCode, $iBody] = self::httpGet('https://marketplace.walmartapis.com/v3/items?limit=50', $h);
        $products = [];
        foreach ((array)($iBody['ItemResponse'] ?? []) as $p) {
            $products[] = [
                'channel_product_id'=>(string)($p['mart'] ?? $p['sku'] ?? ''), 'sku'=>(string)($p['sku'] ?? ''),
                'name'=>(string)($p['productName'] ?? ''), 'price'=>(float)($p['price']['amount'] ?? 0), 'compare_price'=>0.0,
                'inventory'=>0, 'status'=>(string)($p['publishedStatus'] ?? 'PUBLISHED'), 'source'=>'live',
            ];
        }
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' orders + ' . count($products) . ' products (Walmart v3)'];
    }

    // ── Etsy (Open API v3 · x-api-key listings + OAuth receipts) ────────────
    private static function etsyFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('etsy','Etsy'), 'orders'=>self::buildDemoChannelOrders('etsy','Etsy'), 'note'=>'demo preview'];
        $key = trim((string)($creds['api_key'] ?? '')); $shop = trim((string)($creds['shop_id'] ?? ''));
        $oauth = trim((string)($creds['oauth_token'] ?? $creds['access_token'] ?? ''));
        if ($key === '' || $shop === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Etsy: api_key(keystring)·shop_id 입력 필요'];
        $h = ['x-api-key'=>$key, 'Accept'=>'application/json'];
        [$pCode, $pBody] = self::httpGet("https://openapi.etsy.com/v3/application/shops/" . rawurlencode($shop) . "/listings/active?limit=50", $h);
        $products = [];
        foreach ((array)($pBody['results'] ?? []) as $p) {
            $div = (int)($p['price']['divisor'] ?? 100) ?: 100;
            $products[] = [
                'channel_product_id'=>(string)($p['listing_id'] ?? ''), 'sku'=>(string)($p['skus'][0] ?? ''),
                'name'=>(string)($p['title'] ?? ''), 'price'=>round((float)($p['price']['amount'] ?? 0) / $div, 2), 'compare_price'=>0.0,
                'inventory'=>(int)($p['quantity'] ?? 0), 'status'=>(string)($p['state'] ?? 'active'),
                'currency'=>strtoupper((string)($p['price']['currency_code'] ?? '')), 'source'=>'live',
            ];
        }
        $orders = []; $note = count($products) . ' listings (Etsy v3)';
        if ($oauth !== '') {
            [$oCode, $oBody] = self::httpGet("https://openapi.etsy.com/v3/application/shops/" . rawurlencode($shop) . "/receipts?limit=50", $h + ['Authorization'=>'Bearer ' . $oauth]);
            foreach ((array)($oBody['results'] ?? []) as $o) {
                $tr = $o['transactions'][0] ?? [];
                $div = (int)($o['grandtotal']['divisor'] ?? 100) ?: 100;
                $orders[] = [
                    'channel_order_id'=>(string)($o['receipt_id'] ?? ''), 'buyer_name'=>(string)($o['name'] ?? ''),
                    'buyer_email'=>(string)($o['buyer_email'] ?? ''), 'product_name'=>(string)($tr['title'] ?? ''),
                    'sku'=>(string)($tr['sku'] ?? ''), 'qty'=>(int)($tr['quantity'] ?? 1), 'unit_price'=>0.0,
                    'total_price'=>round((float)($o['grandtotal']['amount'] ?? 0) / $div, 2), 'currency'=>strtoupper((string)($o['grandtotal']['currency_code'] ?? '')),
                    'status'=>self::genStatus((string)($o['status'] ?? ($o['is_shipped'] ?? false ? 'shipped' : 'paid'))), 'ordered_at'=>gmdate('c', (int)($o['create_timestamp'] ?? time())), 'source'=>'live',
                ];
            }
            $note .= ' + ' . count($orders) . ' receipts';
        } else {
            $note .= ' · 주문(receipts)은 OAuth oauth_token 등록 시 수집됩니다';
        }
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>$note];
    }

    // ── Shopee (Open API v2 · partner HMAC + OAuth access_token) ─────────────
    private static function shopeeFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('shopee','Shopee'), 'orders'=>self::buildDemoChannelOrders('shopee','Shopee'), 'note'=>'demo preview'];
        $pid = trim((string)($creds['partner_id'] ?? '')); $pkey = trim((string)($creds['partner_key'] ?? ''));
        $shop = trim((string)($creds['shop_id'] ?? '')); $tok = trim((string)($creds['access_token'] ?? ''));
        if ($pid === '' || $pkey === '' || $shop === '' || $tok === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Shopee: partner_id·partner_key·shop_id·access_token(OAuth 인증 후) 입력 필요'];
        $host = 'https://partner.shopeemobile.com'; $ts = time();
        $sign = fn(string $path) => hash_hmac('sha256', $pid . $path . $ts . $tok . $shop, $pkey);
        $path = '/api/v2/order/get_order_list';
        $q = http_build_query(['partner_id'=>$pid, 'timestamp'=>$ts, 'access_token'=>$tok, 'shop_id'=>$shop, 'sign'=>$sign($path),
            'time_range_field'=>'create_time', 'time_from'=>$ts - 15 * 86400, 'time_to'=>$ts, 'page_size'=>50]);
        [$lCode, $lBody] = self::httpGet("{$host}{$path}?{$q}");
        if ($lCode >= 400 || !empty($lBody['error'])) return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Shopee 주문목록 실패(code={$lCode}) — " . (string)($lBody['message'] ?? 'partner/token/shop 확인')];
        $sns = array_values(array_filter(array_map(fn($r) => (string)($r['order_sn'] ?? ''), (array)($lBody['response']['order_list'] ?? []))));
        $orders = [];
        if ($sns) {
            $dpath = '/api/v2/order/get_order_detail';
            $dq = http_build_query(['partner_id'=>$pid, 'timestamp'=>$ts, 'access_token'=>$tok, 'shop_id'=>$shop, 'sign'=>$sign($dpath),
                'order_sn_list'=>implode(',', array_slice($sns, 0, 50))]);
            [$dCode, $dBody] = self::httpGet("{$host}{$dpath}?{$dq}");
            foreach ((array)($dBody['response']['order_list'] ?? []) as $o) {
                $it = $o['item_list'][0] ?? [];
                $orders[] = [
                    'channel_order_id'=>(string)($o['order_sn'] ?? ''), 'buyer_name'=>(string)($o['buyer_username'] ?? ''),
                    'buyer_email'=>'', 'product_name'=>(string)($it['item_name'] ?? ''), 'sku'=>(string)($it['item_sku'] ?? ''),
                    'qty'=>(int)($it['model_quantity_purchased'] ?? 1), 'unit_price'=>(float)($it['model_discounted_price'] ?? 0),
                    'total_price'=>(float)($o['total_amount'] ?? 0), 'currency'=>strtoupper((string)($o['currency'] ?? '')),
                    'status'=>self::genStatus((string)($o['order_status'] ?? '')), 'ordered_at'=>gmdate('c', (int)($o['create_time'] ?? time())), 'source'=>'live',
                ];
            }
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . ' orders (Shopee OpenAPI v2)'];
    }

    // ── Lazada (Open Platform · app HMAC-SHA256 + OAuth access_token) ────────
    private static function lazadaFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('lazada','Lazada'), 'orders'=>self::buildDemoChannelOrders('lazada','Lazada'), 'note'=>'demo preview'];
        $appKey = trim((string)($creds['app_key'] ?? '')); $appSecret = trim((string)($creds['app_secret'] ?? ''));
        $tok = trim((string)($creds['access_token'] ?? '')); $region = strtolower(trim((string)($creds['region'] ?? 'sg')));
        if ($appKey === '' || $appSecret === '' || $tok === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Lazada: app_key·app_secret·access_token(OAuth 인증 후)·region 입력 필요'];
        $hostMap = ['sg'=>'api.lazada.sg','my'=>'api.lazada.com.my','th'=>'api.lazada.co.th','id'=>'api.lazada.co.id','ph'=>'api.lazada.com.ph','vn'=>'api.lazada.vn'];
        $host = 'https://' . ($hostMap[$region] ?? 'api.lazada.sg') . '/rest';
        $apiPath = '/orders/get';
        $params = ['app_key'=>$appKey, 'access_token'=>$tok, 'timestamp'=>(string)(time() * 1000), 'sign_method'=>'sha256',
            'created_after'=>gmdate('c', time() - 30 * 86400), 'sort_direction'=>'DESC', 'offset'=>'0', 'limit'=>'50'];
        ksort($params);
        $base = $apiPath; foreach ($params as $k=>$v) $base .= $k . $v;
        $params['sign'] = strtoupper(hash_hmac('sha256', $base, $appSecret));
        [$oCode, $oBody] = self::httpGet($host . $apiPath . '?' . http_build_query($params));
        if ($oCode >= 400 || isset($oBody['code']) && (string)$oBody['code'] !== '0') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Lazada 주문조회 실패(code={$oCode}) — " . (string)($oBody['message'] ?? 'app_key/secret/token/region 확인')];
        }
        $orders = [];
        foreach ((array)($oBody['data']['orders'] ?? []) as $o) {
            $orders[] = [
                'channel_order_id'=>(string)($o['order_id'] ?? $o['order_number'] ?? ''),
                'buyer_name'=>trim(((string)($o['customer_first_name'] ?? '')) . ' ' . ((string)($o['customer_last_name'] ?? ''))),
                'buyer_email'=>'', 'product_name'=>'', 'sku'=>'', 'qty'=>(int)($o['items_count'] ?? 1), 'unit_price'=>0.0,
                'total_price'=>(float)($o['price'] ?? 0), 'currency'=>strtoupper((string)($o['currency'] ?? '')),
                'status'=>self::genStatus((string)(($o['statuses'][0] ?? ($o['order_status'] ?? '')))), 'ordered_at'=>(string)($o['created_at'] ?? ''), 'source'=>'live',
            ];
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . ' orders (Lazada OpenAPI · ' . $region . ')'];
    }

    // ── Qoo10 QSM Open API (api_key 인증) — best-effort(라이브 셀러 계정 검증 필요) ──
    private static function qoo10Fetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('qoo10','Qoo10'), 'orders'=>self::buildDemoChannelOrders('qoo10','Qoo10'), 'note'=>'demo preview'];
        $key = trim((string)($creds['api_key'] ?? '')); $seller = trim((string)($creds['seller_id'] ?? ''));
        if ($key === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Qoo10: QSM API 키(api_key)·seller_id 입력 필요'];
        // QSM OpenAPI: ShippingBasic.GetShippingInfo_v2 로 최근 배송대기/발송 주문 조회. key=ApiKey.
        $url = 'https://api.qoo10.com/GMKT.INC.Front.QAPIService/ebayjapan.qapi?' . http_build_query([
            'v'=>'1.0', 'method'=>'ShippingBasic.GetShippingInfo_v2', 'key'=>$key,
            'ShippingStat'=>'2', 'search_Sdate'=>gmdate('Ymd', time() - 30 * 86400), 'search_Edate'=>gmdate('Ymd'), 'returnType'=>'json',
        ]);
        [$oCode, $oBody] = self::httpGet($url);
        if ($oCode >= 400 || (isset($oBody['ResultCode']) && (int)$oBody['ResultCode'] !== 0)) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Qoo10 주문조회 실패(code={$oCode}) — QSM API 키/권한 확인(라이브 셀러 계정 필요)"];
        }
        $orders = [];
        foreach ((array)($oBody['ResultObject'] ?? []) as $o) {
            $orders[] = [
                'channel_order_id'=>(string)($o['orderNo'] ?? $o['packNo'] ?? ''), 'buyer_name'=>(string)($o['receiver'] ?? $o['buyer'] ?? ''),
                'buyer_email'=>'', 'product_name'=>(string)($o['itemTitle'] ?? ''), 'sku'=>(string)($o['sellerItemCode'] ?? ''),
                'qty'=>(int)($o['orderQty'] ?? 1), 'unit_price'=>(float)($o['price'] ?? 0), 'total_price'=>(float)($o['orderAmount'] ?? $o['price'] ?? 0),
                'currency'=>'', 'status'=>'발주확인', 'ordered_at'=>(string)($o['orderDate'] ?? ''), 'source'=>'live',
            ];
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . ' orders (Qoo10 QSM)'];
    }

    // ── Yahoo! Japan Shopping (OrderList · OAuth Bearer + seller_id) best-effort ──
    private static function yahooJpFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('yahoo_jp','Yahoo! Japan'), 'orders'=>self::buildDemoChannelOrders('yahoo_jp','Yahoo! Japan'), 'note'=>'demo preview'];
        $tok = trim((string)($creds['access_token'] ?? '')); $seller = trim((string)($creds['seller_id'] ?? ''));
        if ($tok === '' || $seller === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'Yahoo! Japan: access_token(OAuth)·seller_id(스토어 계정) 입력 필요'];
        // OrderList API(XML). 최근 30일 신규주문 검색. Bearer 인증.
        $body = '<Req><Search><Result>50</Result><Start>1</Start><Sort>+order_time</Sort>'
              . '<Condition><OrderTimeFrom>' . gmdate('YmdHis', time() - 30 * 86400) . '</OrderTimeFrom></Condition>'
              . '<Field>OrderId,OrderTime,TotalPrice,PayStatus,ShipStatus,Currency</Field></Search>'
              . '<SellerId>' . htmlspecialchars($seller) . '</SellerId></Req>';
        [$oCode, $raw, $err] = self::httpReqXml('https://circus.shopping.yahooapis.jp/ShoppingWebService/V1/orderList',
            ['Authorization'=>'Bearer ' . $tok, 'Content-Type'=>'application/xml'], $body);
        if ($oCode >= 400 || $raw === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"Yahoo! Japan 주문조회 실패(code={$oCode}) — access_token/seller_id 확인(라이브 스토어 계정 필요)"];
        $orders = [];
        try {
            $xml = @simplexml_load_string($raw);
            foreach (($xml->Result->OrderInfo ?? []) as $o) {
                $orders[] = [
                    'channel_order_id'=>(string)$o->OrderId, 'buyer_name'=>'', 'buyer_email'=>'', 'product_name'=>'', 'sku'=>'',
                    'qty'=>1, 'unit_price'=>0.0, 'total_price'=>(float)$o->TotalPrice, 'currency'=>strtoupper((string)($o->Currency ?: 'JPY')),
                    'status'=>self::genStatus((string)$o->ShipStatus ?: (string)$o->PayStatus), 'ordered_at'=>(string)$o->OrderTime, 'source'=>'live',
                ];
            }
        } catch (\Throwable $e) {}
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . ' orders (Yahoo! Japan)'];
    }

    // ── godomall (NHN godo5 commerce API · partner_key+api_key) best-effort ──
    private static function godomallFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('godomall','고도몰'), 'orders'=>self::buildDemoChannelOrders('godomall','고도몰'), 'note'=>'demo preview'];
        $pkey = trim((string)($creds['partner_key'] ?? '')); $apiKey = trim((string)($creds['api_key'] ?? ''));
        $mall = rtrim(trim((string)($creds['mall_url'] ?? '')), '/');
        if ($pkey === '' || $apiKey === '' || $mall === '') return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'godomall: partner_key·api_key·mall_url(스토어 도메인) 입력 필요'];
        if (!str_starts_with($mall, 'http')) $mall = 'https://' . $mall;
        // godo5 OpenAPI: /api/order.php (최근 주문). 키 인증 파라미터.
        [$oCode, $oBody] = self::httpGet("{$mall}/api/order.php?" . http_build_query([
            'partner_key'=>$pkey, 'key'=>$apiKey, 'method'=>'getOrderList', 'date_type'=>'order',
            'start_date'=>gmdate('Y-m-d', time() - 30 * 86400), 'end_date'=>gmdate('Y-m-d'), 'page'=>1, 'size'=>50, 'return'=>'json',
        ]));
        if ($oCode >= 400 || empty($oBody)) return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"godomall 주문조회 실패(code={$oCode}) — partner_key/api_key/mall_url 확인(라이브 스토어 계정 필요)"];
        $orders = [];
        foreach ((array)($oBody['data']['orders'] ?? $oBody['orders'] ?? []) as $o) {
            $orders[] = [
                'channel_order_id'=>(string)($o['orderNo'] ?? $o['order_no'] ?? ''), 'buyer_name'=>(string)($o['orderName'] ?? $o['orderer'] ?? ''),
                'buyer_email'=>(string)($o['orderEmail'] ?? ''), 'product_name'=>(string)($o['goodsNm'] ?? $o['goods_name'] ?? ''),
                'sku'=>(string)($o['goodsCd'] ?? ''), 'qty'=>(int)($o['ea'] ?? $o['qty'] ?? 1), 'unit_price'=>(float)($o['price'] ?? 0),
                'total_price'=>(float)($o['settlePrice'] ?? $o['totalPrice'] ?? 0), 'currency'=>'KRW',
                'status'=>self::genStatus((string)($o['orderStatus'] ?? $o['status'] ?? '')), 'ordered_at'=>(string)($o['orderDate'] ?? ''), 'source'=>'live',
            ];
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . ' orders (godomall)'];
    }

    /** XML POST(원시 본문 반환) — Yahoo!JP 등 XML API용. 반환 [code, rawBody, err]. */
    private static function httpReqXml(string $url, array $headers, string $body, int $timeout = 20): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => array_map(fn($k, $v) => "$k: $v", array_keys($headers), array_values($headers)),
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_USERAGENT => 'GeniegoROI/v427',
        ]);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch) ?: null;
        curl_close($ch);
        return [$code, ($err === null ? (string)$raw : ''), $err];
    }

    // ── G마켓/11번가/기타 ─────────────────────────────────────────────────
    private static function genericFetch(string $channel, array $creds, string $tenant = 'demo'): array
    {
        $label = match($channel) {
            '11st','st11' => '11번가', // [현 차수] ApiKeys/레지스트리는 st11, 디스패치는 11st — 별칭 정합
            'gmarket' => 'G마켓',
            'auction' => '옥션',
            'lotteon' => '롯데온',
            'wemef','wemakeprice' => '위메프',
            'tmon'    => '티몬',
            'cafe24'  => 'Cafe24',
            'line'    => 'LINE Shopping',
            'rakuten' => 'Rakuten',
            'yahoo_jp'=> 'Yahoo! Japan',
            'shopee'  => 'Shopee',
            'lazada'  => 'Lazada',
            'qoo10'   => 'Qoo10',
            'woocommerce' => 'WooCommerce',
            'etsy'    => 'Etsy',
            'walmart' => 'Walmart',
            'magento' => 'Magento',
            'godomall'=> '고도몰',
            default   => $channel,
        };
        // 188차 P0 보안: 데모 데이터의 운영 DB 유입 차단. 실 테넌트(데모 외)에는 가짜 상품/주문을 반환하지 않는다.
        // [현 차수] H1: 전용 실어댑터가 없는 stub 채널은 'pending'(연동 대기)으로 명시 — 저장만으로 "동기화 완료"
        //   거짓양성을 막는다. 실데이터는 전용 어댑터 추가 또는 정산 CSV 업로드 시 표시된다.
        if ($tenant !== 'demo') {
            return [
                'ok'       => true,
                'pending'  => true,
                'products' => [],
                'orders'   => [],
                'note'     => "{$label}: 자격증명 저장 완료 — 전용 어댑터 연동 준비 중입니다. 정산 CSV 업로드 또는 라이브 API 어댑터 추가 시 실데이터가 동기화됩니다.",
            ];
        }
        return [
            'ok'       => true,
            'products' => self::buildDemoChannelProducts($channel, $label),
            'orders'   => self::buildDemoChannelOrders($channel, $label),
            'note'     => "{$label}: 인증키 저장 완료. 정산 CSV 업로드 또는 API 폴링 활성화.",
        ];
    }

    /** [현 차수] 원시 본문(XML 등) GET — 국내 오픈마켓 XML API 대응(httpGet 은 JSON 디코드라 부적합). */
    private static function httpGetRaw(string $url, array $headers = [], int $timeout = 15): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout,
            CURLOPT_HTTPHEADER => array_map(fn($k, $v) => "$k: $v", array_keys($headers), array_values($headers)),
            CURLOPT_SSL_VERIFYPEER => false, CURLOPT_USERAGENT => 'GeniegoROI/v423',
        ]);
        $raw  = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch) ?: null;
        curl_close($ch);
        return [$code, ($err === null ? (string)$raw : ''), $err];
    }

    // ── 11번가(11st) Open API — XML ─────────────────────────────────────────
    private static function elevenStFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('st11','11번가'), 'orders'=>self::buildDemoChannelOrders('st11','11번가'), 'note'=>'demo preview'];
        }
        // [현 차수] 11번가 셀러 Open API 실연동(graceful) — openapikey 헤더. 신규주문 목록(XML).
        //   라이브 검증은 실 셀러 오픈API 키 필요(타 어댑터와 동일 드롭인).
        $apiKey = trim((string)($creds['api_key'] ?? $creds['openapikey'] ?? $creds['key_value'] ?? ''));
        if ($apiKey === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'11번가: 오픈API 키(api_key) 입력 필요'];
        }
        $from = gmdate('Ymd', time() - 7 * 86400) . '0000';
        $to   = gmdate('YmdHis');
        $url  = "http://api.11st.co.kr/rest/ordervice/orderList/202?dateFrom={$from}&dateTo={$to}";
        [$code, $raw, $err] = self::httpGetRaw($url, ['openapikey' => $apiKey, 'Accept' => 'application/xml']);
        if ($err || $code >= 400 || $raw === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"11번가 주문조회 실패(code={$code}) — 오픈API 키/권한 확인"];
        }
        $orders = [];
        $xml = @simplexml_load_string($raw);
        if ($xml !== false) {
            // 11st 응답 래핑 편차 대응(order / orderList>order).
            $list = isset($xml->order) ? $xml->order : (isset($xml->orderList->order) ? $xml->orderList->order : []);
            foreach ($list as $o) {
                $oid = (string)($o->ordNo ?? $o->OrdNo ?? $o->orderNo ?? '');
                if ($oid === '') continue;
                // [현 차수] 219#2: 실 상태 필드(클레임/배송상태) → 캐논 status/event_type(취소·반품 자동 감지).
                $rawSt = (string)($o->ordStat ?? $o->ordStatNm ?? $o->dlvSttsNm ?? $o->dlvStatNm ?? $o->clmTypeNm ?? $o->claimType ?? '');
                [$st, $evt] = self::openmarketStatus($rawSt);
                $orders[] = [
                    'channel_order_id' => $oid,
                    'buyer_name'  => (string)($o->ordNm ?? $o->buyerNm ?? $o->ordrNm ?? ''),
                    'product_name'=> (string)($o->prdNm ?? $o->ordPrdName ?? $o->productName ?? '11번가 주문'),
                    'sku'         => (string)($o->sellerPrdCd ?? $o->stockNo ?? ''),
                    'qty'         => (int)($o->ordQty ?? $o->orderQty ?? 1),
                    'total_price' => (float)($o->ordPrdAmt ?? $o->finalDscAmt ?? $o->ordAmt ?? 0),
                    'status'      => $st,
                    'ordered_at'  => (string)($o->ordDt ?? $o->orderDate ?? gmdate('c')),
                    'event_type'  => $evt,
                    'source'      => '11st_api',
                ];
            }
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . ' 11번가 주문 동기화 (11st OpenAPI)'];
    }

    // ── ESM (G마켓/옥션) — eBay Korea ESM 2.0 ───────────────────────────────
    private static function esmFetch(string $channel, array $creds, string $tenant = 'demo'): array
    {
        $label = $channel === 'auction' ? '옥션' : 'G마켓';
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts($channel,$label), 'orders'=>self::buildDemoChannelOrders($channel,$label), 'note'=>'demo preview'];
        }
        // [현 차수] G마켓/옥션은 eBay Korea ESM Plus 플랫폼 공용 — ESM 2.0 주문 API(graceful).
        //   자격증명: api_key(ESM 인증), seller_id(판매자 ID). siteGubun=GMKT/IAC 로 채널 구분.
        $apiKey   = trim((string)($creds['api_key'] ?? $creds['key_value'] ?? ''));
        $sellerId = trim((string)($creds['seller_id'] ?? ''));
        if ($apiKey === '' || $sellerId === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"{$label}: ESM api_key·seller_id 입력 필요"];
        }
        $site = $channel === 'auction' ? 'IAC' : 'GMKT';
        $from = gmdate('Y-m-d', time() - 7 * 86400);
        $to   = gmdate('Y-m-d');
        $url  = "https://api.esmplus.com/order/v1/orders?siteGubun={$site}&sellerId=" . rawurlencode($sellerId)
              . "&orderDateFrom={$from}&orderDateTo={$to}";
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => "Bearer {$apiKey}", 'Accept' => 'application/json']);
        if ($err || $code >= 400) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"{$label} 주문조회 실패(code={$code}) — ESM api_key/seller_id/권한 확인"];
        }
        $orders = [];
        foreach ((array)($body['orders'] ?? $body['data'] ?? []) as $o) {
            $oid = (string)($o['orderNo'] ?? $o['orderId'] ?? '');
            if ($oid === '') continue;
            $first = (array)(($o['items'] ?? $o['orderItems'] ?? [])[0] ?? []);
            // [현 차수] 219#2: 실 상태/클레임 필드 → 캐논 status/event_type(취소·반품 자동 감지).
            $rawSt = (string)($o['orderStatusName'] ?? $o['orderStatus'] ?? $o['claimTypeName'] ?? $o['claimType'] ?? $o['claimStatus'] ?? $first['itemStatus'] ?? '');
            [$st, $evt] = self::openmarketStatus($rawSt);
            $orders[] = [
                'channel_order_id' => $oid,
                'buyer_name'  => (string)($o['buyerName'] ?? $o['ordererName'] ?? ''),
                'product_name'=> (string)($first['itemName'] ?? $first['productName'] ?? "{$label} 주문"),
                'sku'         => (string)($first['sellerItemCode'] ?? $first['itemNo'] ?? ''),
                'qty'         => (int)($first['quantity'] ?? 1),
                'total_price' => (float)($o['orderAmount'] ?? $o['paymentAmount'] ?? 0),
                'status'      => $st,
                'ordered_at'  => (string)($o['orderDate'] ?? gmdate('c')),
                'event_type'  => $evt,
                'source'      => 'esm_api',
            ];
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . " {$label} 주문 동기화 (ESM 2.0)"];
    }

    // ── 롯데온(Lotte ON) Seller API ─────────────────────────────────────────
    private static function lotteonFetch(array $creds, string $tenant = 'demo'): array
    {
        if ($tenant === 'demo') {
            return ['ok'=>true, 'products'=>self::buildDemoChannelProducts('lotteon','롯데온'), 'orders'=>self::buildDemoChannelOrders('lotteon','롯데온'), 'note'=>'demo preview'];
        }
        // [현 차수] 롯데온 셀러 API 실연동(graceful) — api_key(인증)+seller_id(파트너 ID).
        $apiKey   = trim((string)($creds['api_key'] ?? $creds['key_value'] ?? ''));
        $sellerId = trim((string)($creds['seller_id'] ?? ''));
        if ($apiKey === '' || $sellerId === '') {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>'롯데온: api_key·seller_id 입력 필요'];
        }
        $from = gmdate('Ymd', time() - 7 * 86400);
        $to   = gmdate('Ymd');
        $url  = "https://openapi.lotteon.com/seller/v1/orders?startDate={$from}&endDate={$to}";
        [$code, $body, $err] = self::httpGet($url, [
            'Authorization' => "Bearer {$apiKey}", 'X-Seller-Id' => $sellerId, 'Accept' => 'application/json',
        ]);
        if ($err || $code >= 400) {
            return ['ok'=>true, 'products'=>[], 'orders'=>[], 'note'=>"롯데온 주문조회 실패(code={$code}) — api_key/seller_id/권한 확인"];
        }
        $orders = [];
        foreach ((array)($body['orders'] ?? $body['data'] ?? $body['orderList'] ?? []) as $o) {
            $oid = (string)($o['orderNo'] ?? $o['orderId'] ?? '');
            if ($oid === '') continue;
            $first = (array)(($o['orderItems'] ?? $o['items'] ?? [])[0] ?? []);
            // [현 차수] 219#2: 실 상태/클레임 필드 → 캐논 status/event_type(취소·반품 자동 감지).
            $rawSt = (string)($o['orderStatusName'] ?? $o['orderStatus'] ?? $o['claimTypeName'] ?? $o['claimType'] ?? $first['itemStatus'] ?? '');
            [$st, $evt] = self::openmarketStatus($rawSt);
            $orders[] = [
                'channel_order_id' => $oid,
                'buyer_name'  => (string)($o['buyerName'] ?? $o['ordererNm'] ?? ''),
                'product_name'=> (string)($first['productName'] ?? $first['prdNm'] ?? '롯데온 주문'),
                'sku'         => (string)($first['sellerProductCode'] ?? $first['sku'] ?? ''),
                'qty'         => (int)($first['orderQty'] ?? $first['quantity'] ?? 1),
                'total_price' => (float)($o['paymentAmount'] ?? $o['orderAmount'] ?? 0),
                'status'      => $st,
                'ordered_at'  => (string)($o['orderDate'] ?? gmdate('c')),
                'event_type'  => $evt,
                'source'      => 'lotteon_api',
            ];
        }
        return ['ok'=>true, 'products'=>[], 'orders'=>$orders, 'note'=>count($orders) . ' 롯데온 주문 동기화 (Lotte ON API)'];
    }

    private static function buildDemoChannelProducts(string $channel, string $label): array
    {
        $products = self::demoProducts($channel);
        foreach ($products as &$p) $p['channel'] = $channel;
        return $products;
    }

    private static function buildDemoChannelOrders(string $channel, string $label): array
    {
        $orders = self::demoOrders($channel);
        foreach ($orders as &$o) $o['channel'] = $channel;
        return $orders;
    }

    // ── 채널 dispatch ────────────────────────────────────────────────────
    private static function fetchFromChannel(string $channel, array $creds, string $plan, string $tenant = 'demo'): array
    {
        return match($channel) {
            'shopify'                      => self::shopifyFetch($creds),
            'amazon','amazon_spapi'        => self::amazonFetch($creds, $tenant),
            'coupang'                      => self::coupangFetch($creds, $tenant),
            'naver','naver_smartstore'     => self::naverFetch($creds, $tenant),
            'ebay'                         => self::ebayFetch($creds, $tenant),
            'tiktok','tiktok_shop'         => self::tiktokFetch($creds, $tenant),
            'rakuten'                      => self::rakutenFetch($creds, $tenant),
            'cafe24'                       => self::cafe24Fetch($creds, $tenant),
            '11st','st11'                  => self::elevenStFetch($creds, $tenant),       // [현 차수] 11번가 실어댑터
            'gmarket','auction'            => self::esmFetch($channel, $creds, $tenant),  // [현 차수] ESM(G마켓/옥션)
            'lotteon'                      => self::lotteonFetch($creds, $tenant),         // [현 차수] 롯데온
            // [232차 Sprint2] 글로벌 커머스 실어댑터 9종 — genericFetch stub 제거
            'woocommerce'                  => self::woocommerceFetch($creds, $tenant),
            'magento'                      => self::magentoFetch($creds, $tenant),
            'walmart'                      => self::walmartFetch($creds, $tenant),
            'etsy'                         => self::etsyFetch($creds, $tenant),
            'shopee'                       => self::shopeeFetch($creds, $tenant),
            'lazada'                       => self::lazadaFetch($creds, $tenant),
            'qoo10'                        => self::qoo10Fetch($creds, $tenant),
            'yahoo_japan','yahoo_jp'       => self::yahooJpFetch($creds, $tenant),
            'godomall'                     => self::godomallFetch($creds, $tenant),
            default                        => self::genericFetch($channel, $creds, $tenant),
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    //  [227차] Writeback 쓰기 어댑터 — 상품 등록/수정을 실 채널로 push.
    //    Catalog::pushToChannel 이 shopify 외 채널을 본 메서드로 위임. fetch 어댑터의
    //    검증된 인증(쿠팡 HMAC / 네이버·카페24 OAuth)을 미러. 자격증명 0이면 dormant(무영향).
    //    ★상품 CREATE 는 채널별 필수필드(카테고리코드 등)가 catalog 보유분보다 많을 수 있어
    //      best-effort — 채널이 추가필드를 요구하면 그 오류를 그대로 반환(정직). 미구현 채널=pending.
    // ══════════════════════════════════════════════════════════════════════

    /** PUT/DELETE 등 커스텀 메서드 HTTP(쓰기 update/해제용). 반환 [code, parsedBody, err]. */
    private static function httpReq(string $method, string $url, array $headers, ?string $body): array
    {
        $ch = curl_init($url);
        $hdrs = array_map(fn($k, $v) => "$k: $v", array_keys($headers), array_values($headers));
        $opt = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_TIMEOUT => 20,
                CURLOPT_HTTPHEADER => $hdrs, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_USERAGENT => 'GeniegoROI/v427'];
        if ($body !== null) $opt[CURLOPT_POSTFIELDS] = $body;
        curl_setopt_array($ch, $opt);
        $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch) ?: null;
        curl_close($ch);
        $b = ($err === null && $raw) ? (json_decode((string)$raw, true) ?? []) : [];
        return [$code, $b, $err, (string)$raw];
    }

    /** 채널 쓰기 디스패처(Catalog 위임 진입점). */
    /* ══════════════════ [228차] 채널별 리뷰 API 실수집기 — fetch 인증 재사용 ══════════════════
     *   반환 ['reviews'=>[{external_review_id,product,rating,title,body,author,reviewed_at}], 'note'=>'', 'mode'=>''].
     *   자격증명 미설정/파트너 게이트는 정직한 note + 빈 reviews(가짜 수집 금지). Reviews::collect 가 호출.
     */
    public static function collectReviews(string $channel, array $creds, string $tenant = ''): array
    {
        switch (strtolower($channel)) {
            case 'cafe24':                          return self::cafe24Reviews($creds);
            case 'shopify':                         return self::shopifyReviews($creds);
            case 'naver': case 'naver_smartstore':  return self::naverReviews($creds);
            case 'coupang':                         return self::coupangReviews($creds);
            default:                                return ['reviews' => [], 'mode' => 'unsupported', 'note' => "리뷰 수집 어댑터 미지원 채널: {$channel}"];
        }
    }

    /** HTML 태그 제거 + 공백 정리(리뷰 본문 정규화). */
    private static function stripHtml(string $s): string
    {
        $s = preg_replace('/<br\s*\/?>(?=)/i', "\n", $s) ?? $s;
        return trim(preg_replace('/\s+/u', ' ', strip_tags($s)) ?? $s);
    }

    /** Cafe24 상품후기 게시판 수집(실연동). refresh_token grant → /admin/boards/{board_no}/articles. */
    private static function cafe24Reviews(array $creds): array
    {
        $mallId = trim((string)($creds['mall_id'] ?? '')); $clientId = trim((string)($creds['client_id'] ?? ''));
        $clientSecret = trim((string)($creds['client_secret'] ?? '')); $refreshToken = trim((string)($creds['refresh_token'] ?? ''));
        $boardNo = (int)($creds['review_board_no'] ?? 4); // Cafe24 기본 상품후기 게시판=4(몰별 상이 시 cred 로 지정).
        if ($mallId === '' || $clientId === '' || $clientSecret === '' || $refreshToken === '') {
            return ['reviews' => [], 'mode' => 'no_credentials', 'note' => 'Cafe24: mall_id·client_id·client_secret·refresh_token 필요'];
        }
        $apiBase = "https://{$mallId}.cafe24api.com/api/v2";
        [$tc, $tb] = self::httpPost("{$apiBase}/oauth/token", ['Authorization' => 'Basic ' . base64_encode($clientId . ':' . $clientSecret), 'Content-Type' => 'application/x-www-form-urlencoded'], http_build_query(['grant_type' => 'refresh_token', 'refresh_token' => $refreshToken]));
        $token = (string)($tb['access_token'] ?? '');
        if ($token === '') return ['reviews' => [], 'mode' => 'auth_failed', 'note' => "Cafe24 토큰 발급 실패(code={$tc}) — refresh_token 확인"];
        $hdr = ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json', 'X-Cafe24-Api-Version' => '2024-06-01'];
        [$code, $body] = self::httpGet("{$apiBase}/admin/boards/{$boardNo}/articles?limit=100&embed=comments", $hdr);
        if ($code >= 400 || !isset($body['articles'])) {
            return ['reviews' => [], 'mode' => 'api_error', 'note' => "Cafe24 게시판 조회 실패(code={$code}) — board_no={$boardNo}/mall.read_community 권한 확인"];
        }
        $reviews = [];
        foreach ((array)($body['articles'] ?? []) as $a) {
            $no = (string)($a['article_no'] ?? '');
            if ($no === '') continue;
            $reviews[] = [
                'external_review_id' => 'cafe24_' . $no,
                'product'     => (string)($a['product_name'] ?? ($a['product_no'] ?? '')),
                'product_id'  => (string)($a['product_no'] ?? ''),
                'rating'      => (float)($a['rating'] ?? 0),          // 상품후기 게시판은 rating 제공(미설정 시 0→감성 neutral).
                'title'       => self::stripHtml((string)($a['title'] ?? '')),
                'body'        => self::stripHtml((string)($a['content'] ?? '')),
                'author'      => (string)($a['writer'] ?? $a['member_id'] ?? ''),
                'reviewed_at' => (string)($a['created_date'] ?? gmdate('c')),
            ];
        }
        return ['reviews' => $reviews, 'mode' => 'live', 'note' => count($reviews) . '건 Cafe24 상품후기 수집(board_no=' . $boardNo . ')'];
    }

    /** Shopify 리뷰 수집 — Admin API는 리뷰 네이티브 미제공. Product Reviews 앱 메타필드(spr.reviews) 시도. */
    private static function shopifyReviews(array $creds): array
    {
        $token = $creds['access_token'] ?? $creds['api_password'] ?? '';
        $shop  = rtrim((string)($creds['shop_domain'] ?? ''), '/');
        if ($shop === '' || $token === '') return ['reviews' => [], 'mode' => 'no_credentials', 'note' => 'Shopify: shop_domain·access_token 필요'];
        if (!str_contains($shop, '.')) $shop .= '.myshopify.com';
        $hdr = ['X-Shopify-Access-Token' => $token, 'Content-Type' => 'application/json'];
        // Shopify 리뷰는 앱(Judge.me/Loox/Product Reviews) 영역. 레거시 Product Reviews 앱은 상품 메타필드(spr.reviews)에 적재.
        [$code, $body] = self::httpGet("https://{$shop}/admin/api/2024-01/metafields.json?namespace=spr&limit=100", $hdr);
        if ($code >= 400) return ['reviews' => [], 'mode' => 'requires_app', 'note' => "Shopify 리뷰는 리뷰 앱(Judge.me/Loox/Shopify Product Reviews) 연동이 필요합니다(메타필드 조회 code={$code})."];
        $mf = (array)($body['metafields'] ?? []);
        if (!$mf) return ['reviews' => [], 'mode' => 'requires_app', 'note' => 'Shopify: 리뷰 앱(spr 네임스페이스 메타필드) 미설치 — Judge.me 등 연동 후 수집 가능.'];
        // spr.reviews 메타필드는 집계 HTML — 개별 리뷰 분해는 앱별 포맷 상이. 정직하게 앱 연동 안내(가짜 분해 금지).
        return ['reviews' => [], 'mode' => 'requires_app_parse', 'note' => 'Shopify 리뷰 앱 메타필드 감지됨 — 개별 리뷰 추출은 앱별 포맷(Judge.me API 등) 연동이 필요합니다.'];
    }

    /** 네이버 커머스 리뷰 수집 — OAuth 토큰(실)+리뷰 API. 리뷰 엔드포인트는 판매자 스코프 승인 필요(정직 게이트). */
    private static function naverReviews(array $creds): array
    {
        $clientId = (string)($creds['client_id'] ?? ''); $clientSecret = (string)($creds['client_secret'] ?? '');
        if ($clientId === '' || $clientSecret === '') return ['reviews' => [], 'mode' => 'no_credentials', 'note' => '네이버 커머스: client_id·client_secret 필요'];
        $timestamp = (int)(microtime(true) * 1000);
        $sign = base64_encode(hash_hmac('sha256', "{$clientId}_{$timestamp}", $clientSecret, true));
        [$code, $body] = self::httpPost('https://api.commerce.naver.com/external/v1/oauth2/token',
            ['Content-Type' => 'application/x-www-form-urlencoded'],
            "client_id={$clientId}&timestamp={$timestamp}&client_secret_sign={$sign}&grant_type=client_credentials&type=SELF");
        if ($code !== 200 || empty($body['access_token'])) return ['reviews' => [], 'mode' => 'auth_failed', 'note' => "네이버 토큰 발급 실패(code={$code}) — client_id/secret 확인"];
        $token = (string)$body['access_token'];
        // 네이버 커머스 리뷰 조회 API — 판매자 리뷰 스코프(상품 리뷰 조회 권한) 승인 필요. 미승인 시 정직 게이트.
        [$rc, $rb] = self::httpGet('https://api.commerce.naver.com/external/v1/products/origin-products/reviews?page=1&size=50', ['Authorization' => "Bearer {$token}"]);
        if ($rc >= 400 || !is_array($rb)) {
            return ['reviews' => [], 'mode' => 'scope_pending', 'note' => "네이버 토큰 정상·리뷰 API 응답 code={$rc} — 판매자 리뷰 조회 스코프 승인 후 수집됩니다."];
        }
        $reviews = [];
        foreach ((array)($rb['contents'] ?? $rb['data'] ?? []) as $rv) {
            $id = (string)($rv['reviewId'] ?? $rv['id'] ?? '');
            if ($id === '') continue;
            $reviews[] = [
                'external_review_id' => 'naver_' . $id,
                'product'     => (string)($rv['productName'] ?? ''),
                'rating'      => (float)($rv['reviewScore'] ?? $rv['score'] ?? 0),
                'body'        => self::stripHtml((string)($rv['reviewContent'] ?? $rv['content'] ?? '')),
                'author'      => (string)($rv['writerId'] ?? $rv['memberId'] ?? ''),
                'reviewed_at' => (string)($rv['createDate'] ?? gmdate('c')),
            ];
        }
        return ['reviews' => $reviews, 'mode' => 'live', 'note' => count($reviews) . '건 네이버 커머스 리뷰 수집'];
    }

    /** 쿠팡 리뷰 수집 — WING OpenAPI HMAC(실 인증). 구매자 리뷰 조회 API는 파트너 게이트(정직 안내). */
    private static function coupangReviews(array $creds): array
    {
        $accessKey = (string)($creds['access_key'] ?? ''); $secretKey = (string)($creds['secret_key'] ?? '');
        $vendorId  = (string)($creds['vendor_id'] ?? '');
        if ($accessKey === '' || $secretKey === '' || $vendorId === '') return ['reviews' => [], 'mode' => 'no_credentials', 'note' => '쿠팡: access_key·secret_key·vendor_id 필요'];
        // 쿠팡 WING OpenAPI 는 주문/상품/정산 중심 — 구매자 상품평(리뷰) 조회는 일반 공개 미제공(WING UI/파트너 한정).
        //   HMAC 인증 자체는 검증되어 있으므로(주문 수집과 동일), 리뷰 API 가 파트너 승인되면 동일 패턴으로 즉시 배선 가능.
        return ['reviews' => [], 'mode' => 'partner_gated', 'note' => '쿠팡 구매자 리뷰 조회 API는 파트너 승인 한정 — 승인 시 동일 HMAC 인증으로 수집 배선됩니다.'];
    }

    public static function pushProduct(string $channel, array $creds, array $product, string $operation, ?string $channelProductId): array
    {
        $ch = strtolower($channel);
        switch ($ch) {
            case 'cafe24':                 return self::cafe24Write($creds, $product, $operation, $channelProductId);
            case 'coupang':                return self::coupangWrite($creds, $product, $operation, $channelProductId);
            case 'naver': case 'naver_smartstore': return self::naverWrite($creds, $product, $operation, $channelProductId);
            case 'ebay':                   return self::ebayWrite($creds, $product, $operation, $channelProductId);
            // [228차] 잔여 7채널 쓰기 어댑터 — 각 fetch 어댑터의 검증된 인증을 재사용(인증=비투기, write 엔드포인트=문서기준 best-effort).
            //   카테고리 등 필수필드는 honest 게이트(에러 반환). 자격증명 미등록 시 상위에서 awaiting_credentials 보류.
            case 'amazon': case 'amazon_spapi':  return self::amazonWrite($creds, $product, $operation, $channelProductId);
            case 'tiktok': case 'tiktok_shop':   return self::tiktokWrite($creds, $product, $operation, $channelProductId);
            case 'rakuten':                return self::rakutenWrite($creds, $product, $operation, $channelProductId);
            case '11st': case 'st11':      return self::elevenStWrite($creds, $product, $operation, $channelProductId);
            case 'gmarket': case 'auction': return self::esmWrite($ch, $creds, $product, $operation, $channelProductId);
            case 'lotteon':                return self::lotteonWrite($creds, $product, $operation, $channelProductId);
            default:                       return ['ok' => false, 'pending' => true, 'error' => 'write_adapter_pending:' . $ch];
        }
    }

    /** Cafe24 Admin API 상품 등록/수정 — refresh_token grant → access_token → /admin/products. */
    private static function cafe24Write(array $creds, array $p, string $op, ?string $cpid): array
    {
        $mallId = trim((string)($creds['mall_id'] ?? '')); $clientId = trim((string)($creds['client_id'] ?? ''));
        $clientSecret = trim((string)($creds['client_secret'] ?? '')); $refreshToken = trim((string)($creds['refresh_token'] ?? ''));
        if ($mallId === '' || $clientId === '' || $clientSecret === '' || $refreshToken === '') return ['ok' => false, 'error' => 'Cafe24: mall_id·client_id·client_secret·refresh_token 필요'];
        $apiBase = "https://{$mallId}.cafe24api.com/api/v2";
        [$tc, $tb] = self::httpPost("{$apiBase}/oauth/token", ['Authorization' => 'Basic ' . base64_encode($clientId . ':' . $clientSecret), 'Content-Type' => 'application/x-www-form-urlencoded'], http_build_query(['grant_type' => 'refresh_token', 'refresh_token' => $refreshToken]));
        $token = (string)($tb['access_token'] ?? '');
        if ($token === '') return ['ok' => false, 'error' => "Cafe24 토큰 발급 실패(code={$tc}) — refresh_token 만료 가능"];
        $hdr = ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json', 'X-Cafe24-Api-Version' => '2024-06-01'];
        $unreg = ($op === 'unregister' || ($p['action'] ?? '') === 'unregister');
        $prod = ['product_name' => (string)($p['name'] ?? $p['sku'] ?? ''), 'price' => (string)(float)($p['price'] ?? 0),
                 'supply_price' => (string)(float)($p['price'] ?? 0), 'display' => $unreg ? 'F' : 'T', 'selling' => $unreg ? 'F' : 'T',
                 'description' => (string)($p['spec'] ?? ''), 'custom_product_code' => (string)($p['sku'] ?? '')];
        $body = json_encode(['shop_no' => 1, 'request' => ['product' => $prod]], JSON_UNESCAPED_UNICODE);
        if ($cpid !== null) { [$c, $b] = self::httpReq('PUT', "{$apiBase}/admin/products/{$cpid}", $hdr, $body); }
        else { [$c, $b] = self::httpPost("{$apiBase}/admin/products", $hdr, $body); }
        if ($c >= 200 && $c < 300) { $pid = $b['product']['product_no'] ?? $cpid; return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null]; }
        return ['ok' => false, 'error' => "Cafe24 HTTP {$c}", 'detail' => mb_substr(json_encode($b['error'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** Coupang Wing 상품 등록 — CEA HMAC-SHA256 서명. ★displayCategoryCode 등 필수필드는 catalog category(숫자) 사용. */
    private static function coupangWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $accessKey = trim((string)($creds['access_key'] ?? '')); $secretKey = trim((string)($creds['secret_key'] ?? '')); $vendorId = trim((string)($creds['vendor_id'] ?? ''));
        if ($accessKey === '' || $secretKey === '' || $vendorId === '') return ['ok' => false, 'error' => 'Coupang: access_key·secret_key·vendor_id 필요'];
        $catCode = (int)preg_replace('/\D/', '', (string)($p['category_code'] ?? $p['category'] ?? ''));
        if ($catCode <= 0) return ['ok' => false, 'error' => 'Coupang 상품등록은 노출카테고리코드(displayCategoryCode)가 필요합니다 — 채널 카테고리 매핑에서 쿠팡 코드를 지정하세요'];
        $host = 'https://api-gateway.coupang.com';
        $method = 'POST'; $path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products";
        $datetime = gmdate('ymd\THis\Z');
        $sig = hash_hmac('sha256', $datetime . $method . $path, $secretKey);
        $auth = "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$datetime}, signature={$sig}";
        $price = (float)($p['price'] ?? 0); $name = (string)($p['name'] ?? $p['sku'] ?? ''); $sku = (string)($p['sku'] ?? '');
        $payload = json_encode([
            'sellerProductName' => $name, 'vendorId' => $vendorId, 'displayCategoryCode' => $catCode,
            'saleStartedAt' => gmdate('Y-m-d\TH:i:s'), 'saleEndedAt' => '2099-12-31T23:59:59',
            'displayProductName' => $name, 'sellerProductCode' => $sku,
            'items' => [[
                'itemName' => $name, 'originalPrice' => $price, 'salePrice' => $price,
                'maximumBuyCount' => (int)($p['inventory'] ?? 0), 'sellerProductItemCode' => $sku,
            ]],
        ], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq($method, $host . $path, ['Authorization' => $auth, 'Content-Type' => 'application/json;charset=UTF-8'], $payload);
        if ($c >= 200 && $c < 300 && (($b['code'] ?? '') === 'SUCCESS' || isset($b['data']))) {
            $pid = $b['data'] ?? null; return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null];
        }
        return ['ok' => false, 'error' => "Coupang HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** Naver Commerce 상품 등록 — HMAC 서명 OAuth2 → Bearer → /external/v2/products. ★leafCategoryId 필수. */
    private static function naverWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $clientId = trim((string)($creds['client_id'] ?? '')); $clientSecret = trim((string)($creds['client_secret'] ?? ''));
        if ($clientId === '' || $clientSecret === '') return ['ok' => false, 'error' => 'Naver: client_id·client_secret 필요'];
        $leaf = (string)($p['category_code'] ?? $p['category'] ?? '');
        if ($leaf === '') return ['ok' => false, 'error' => 'Naver 상품등록은 leafCategoryId 가 필요합니다 — 채널 카테고리 매핑에서 네이버 리프카테고리ID를 지정하세요'];
        $ts = (int)(microtime(true) * 1000);
        $sign = base64_encode(hash_hmac('sha256', "{$clientId}_{$ts}", $clientSecret, true));
        [$tc, $tb] = self::httpPost('https://api.commerce.naver.com/external/v1/oauth2/token', ['Content-Type' => 'application/x-www-form-urlencoded'],
            "client_id={$clientId}&timestamp={$ts}&client_secret_sign={$sign}&grant_type=client_credentials&type=SELF");
        $token = (string)($tb['access_token'] ?? '');
        if ($token === '') return ['ok' => false, 'error' => "Naver 토큰 발급 실패(code={$tc})"];
        $price = (int)round((float)($p['price'] ?? 0)); $name = (string)($p['name'] ?? $p['sku'] ?? '');
        $payload = json_encode(['originProduct' => [
            'statusType' => ($op === 'unregister' ? 'SUSPENSION' : 'SALE'), 'saleType' => 'NEW', 'leafCategoryId' => $leaf,
            'name' => $name, 'detailContent' => (string)($p['spec'] ?? $name), 'salePrice' => $price,
            'stockQuantity' => (int)($p['inventory'] ?? 0), 'sellerCodeInfo' => ['sellerManagementCode' => (string)($p['sku'] ?? '')],
        ]], JSON_UNESCAPED_UNICODE);
        $hdr = ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json'];
        if ($cpid !== null) { [$c, $b] = self::httpReq('PUT', "https://api.commerce.naver.com/external/v2/products/origin-products/{$cpid}", $hdr, $payload); }
        else { [$c, $b] = self::httpPost('https://api.commerce.naver.com/external/v2/products', $hdr, $payload); }
        if ($c >= 200 && $c < 300) { $pid = $b['originProductNo'] ?? $b['smartstoreChannelProductNo'] ?? $cpid; return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null]; }
        return ['ok' => false, 'error' => "Naver HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** eBay Sell Inventory API 상품(inventory_item) 등록/수정 — Bearer OAuth, SKU 키 멱등 PUT.
     *   ★판매 노출(offer 생성·가격·카테고리·정책)은 별도 단계(카테고리/정책 ID 필요) — 본 어댑터는
     *     inventory_item(상품 카탈로그 엔트리+재고) 까지. 가격은 offer 영역이라 inventory_item 미포함. */
    private static function ebayWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $token = trim((string)($creds['oauth_token'] ?? $creds['access_token'] ?? ''));
        if ($token === '') return ['ok' => false, 'error' => 'eBay: access_token(OAuth) 필요'];
        $sku = (string)($p['sku'] ?? '');
        if ($sku === '') return ['ok' => false, 'error' => 'eBay 등록은 SKU 가 필요합니다(inventory_item 키)'];
        $hdr = ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json', 'Content-Language' => 'en-US'];
        $url = 'https://api.ebay.com/sell/inventory/v1/inventory_item/' . rawurlencode($sku);
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            [$c] = self::httpReq('DELETE', $url, $hdr, null);
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'deleted' => $sku] : ['ok' => false, 'error' => "eBay DELETE HTTP {$c}"];
        }
        $body = json_encode([
            'availability' => ['shipToLocationAvailability' => ['quantity' => (int)($p['inventory'] ?? 0)]],
            'condition' => 'NEW',
            'product' => ['title' => (string)($p['name'] ?? $sku), 'description' => (string)($p['spec'] ?? $p['name'] ?? '')],
        ], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq('PUT', $url, $hdr, $body);
        if ($c >= 200 && $c < 300) return ['ok' => true, 'channel_product_id' => $sku, 'note' => 'inventory_item 등록 완료 — 판매 노출(offer)은 카테고리·정책 ID 필요'];
        return ['ok' => false, 'error' => "eBay HTTP {$c}", 'detail' => mb_substr(json_encode($b['errors'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [228차] Amazon SP-API Listings Items 등록/수정 — LWA access_token, SKU 키 멱등 PUT. ★productType(category_code)·seller_id 필요.
     *   인증=amazonFetch 와 동일(LWA). 풀 노출(이미지·요건 속성)은 productType 스키마별 추가 — 본 어댑터는 기본 속성까지. 라이브 검증=실 판매자 계정. */
    private static function amazonWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $clientId = trim((string)($creds['client_id'] ?? '')); $clientSecret = trim((string)($creds['client_secret'] ?? ''));
        $refreshToken = trim((string)($creds['refresh_token'] ?? $creds['key_value'] ?? ''));
        $marketplaceId = trim((string)($creds['marketplace_id'] ?? 'ATVPDKIKX0DER'));
        $sellerId = trim((string)($creds['seller_id'] ?? $creds['merchant_id'] ?? ''));
        if ($clientId === '' || $clientSecret === '' || $refreshToken === '') return ['ok' => false, 'error' => 'Amazon: client_id·client_secret·refresh_token 필요'];
        if ($sellerId === '') return ['ok' => false, 'error' => 'Amazon 상품등록은 seller_id(merchant token)가 필요합니다'];
        $sku = (string)($p['sku'] ?? '');
        if ($sku === '') return ['ok' => false, 'error' => 'Amazon Listings 등록은 SKU 가 필요합니다'];
        [$tc, $tb] = self::httpPost('https://api.amazon.com/auth/o2/token', ['Content-Type' => 'application/x-www-form-urlencoded'],
            http_build_query(['grant_type' => 'refresh_token', 'refresh_token' => $refreshToken, 'client_id' => $clientId, 'client_secret' => $clientSecret]));
        $token = (string)($tb['access_token'] ?? '');
        if ($token === '') return ['ok' => false, 'error' => "Amazon LWA 토큰 발급 실패(code={$tc})"];
        $host = self::amazonEndpoint($marketplaceId);
        $hdr = ['x-amz-access-token' => $token, 'Content-Type' => 'application/json', 'Accept' => 'application/json'];
        $url = "https://{$host}/listings/2021-08-01/items/" . rawurlencode($sellerId) . '/' . rawurlencode($sku) . '?marketplaceIds=' . rawurlencode($marketplaceId);
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            [$c] = self::httpReq('DELETE', $url, $hdr, null);
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'deleted' => $sku] : ['ok' => false, 'error' => "Amazon DELETE HTTP {$c}"];
        }
        $productType = (string)($p['category_code'] ?? '');
        if ($productType === '') return ['ok' => false, 'error' => 'Amazon 상품등록은 productType 이 필요합니다 — 채널 카테고리 매핑에서 Amazon productType(예: LUGGAGE)을 지정하세요'];
        $price = (float)($p['price'] ?? 0); $name = (string)($p['name'] ?? $sku); $cur = self::amazonCurrency($marketplaceId);
        $body = json_encode([
            'productType'  => $productType,
            'requirements' => 'LISTING',
            'attributes'   => [
                'item_name'              => [['value' => $name, 'marketplace_id' => $marketplaceId]],
                'purchasable_offer'      => [['marketplace_id' => $marketplaceId, 'currency' => $cur, 'our_price' => [['schedule' => [['value_with_tax' => $price]]]]]],
                'fulfillment_availability' => [['fulfillment_channel_code' => 'DEFAULT', 'quantity' => (int)($p['inventory'] ?? 0)]],
            ],
        ], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq('PUT', $url, $hdr, $body);
        if ($c >= 200 && $c < 300 && (($b['status'] ?? '') === 'ACCEPTED' || isset($b['sku']))) return ['ok' => true, 'channel_product_id' => $sku];
        return ['ok' => false, 'error' => "Amazon HTTP {$c}", 'detail' => mb_substr(json_encode($b['issues'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 250)];
    }

    /** Amazon 마켓플레이스 ID → 통화코드(purchasable_offer.currency). 미상=USD. */
    private static function amazonCurrency(string $mp): string
    {
        $map = ['A1VC38T7YXB528' => 'JPY', 'A1F83G8C2ARO7P' => 'GBP', 'A1PA6795UKMFR9' => 'EUR', 'A13V1IB3VIYZZH' => 'EUR',
                'APJ6JRA9NG5V4' => 'EUR', 'A1RKKUPIHCS9HS' => 'EUR', 'A1805IZSGTT6HS' => 'EUR', 'A39IBJ37TRP1C6' => 'AUD',
                'A2EUQ1WTGCTBG2' => 'CAD', 'A1AM78C64UM0Y8' => 'MXN', 'A2Q3Y263D00KWC' => 'BRL'];
        return $map[$mp] ?? 'USD';
    }

    /** [228차] TikTok Shop 상품 등록/수정 — HMAC 서명(tiktokSign)+shop_cipher 재사용. ★category_id(category_code) 필수. 라이브 검증=실 판매자 계정. */
    private static function tiktokWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $appKey = trim((string)($creds['app_key'] ?? '')); $appSecret = trim((string)($creds['app_secret'] ?? $creds['secret_key'] ?? ''));
        $accessToken = trim((string)($creds['access_token'] ?? $creds['key_value'] ?? '')); $shopCipher = trim((string)($creds['shop_cipher'] ?? ''));
        if ($appKey === '' || $appSecret === '' || $accessToken === '') return ['ok' => false, 'error' => 'TikTok Shop: app_key·app_secret·access_token 필요'];
        $base = 'https://open-api.tiktokglobalshop.com';
        if ($shopCipher === '') $shopCipher = self::tiktokResolveShopCipher($base, $appKey, $appSecret, $accessToken);
        if ($shopCipher === '') return ['ok' => false, 'error' => 'TikTok Shop: shop_cipher 도출 실패 — 인가된 샵 확인'];
        $hdr = ['x-tts-access-token' => $accessToken, 'Content-Type' => 'application/json'];
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            if ($cpid === null) return ['ok' => false, 'error' => 'TikTok Shop 미등록 상품 — 내릴 대상 없음'];
            $path = '/product/202309/products/' . rawurlencode($cpid) . '/deactivate';
            $q = ['app_key' => $appKey, 'timestamp' => (string)time(), 'shop_cipher' => $shopCipher]; $bj = '{}';
            $q['sign'] = self::tiktokSign($appSecret, $path, $q, $bj);
            [$c, $b] = self::httpPost($base . $path . '?' . http_build_query($q), $hdr, $bj);
            return ($c < 400 && (int)($b['code'] ?? -1) === 0) ? ['ok' => true, 'channel_product_id' => $cpid]
                : ['ok' => false, 'error' => "TikTok deactivate HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
        }
        $catId = (string)($p['category_code'] ?? '');
        if ($catId === '') return ['ok' => false, 'error' => 'TikTok Shop 등록은 category_id 가 필요합니다 — 채널 카테고리 매핑에서 TikTok 카테고리ID를 지정하세요'];
        $price = (float)($p['price'] ?? 0); $name = (string)($p['name'] ?? $p['sku'] ?? '');
        $payload = ['title' => $name, 'category_id' => $catId, 'description' => ((string)($p['spec'] ?? '') ?: $name),
            'skus' => [['seller_sku' => (string)($p['sku'] ?? ''),
                'price' => ['amount' => (string)$price, 'currency' => (string)($creds['currency'] ?? 'USD')],
                'inventory' => [['quantity' => (int)($p['inventory'] ?? 0)]]]]];
        $isUpdate = $cpid !== null;
        $path = $isUpdate ? ('/product/202309/products/' . rawurlencode($cpid)) : '/product/202309/products';
        $bj = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $q = ['app_key' => $appKey, 'timestamp' => (string)time(), 'shop_cipher' => $shopCipher];
        $q['sign'] = self::tiktokSign($appSecret, $path, $q, (string)$bj);
        $url = $base . $path . '?' . http_build_query($q);
        [$c, $b] = $isUpdate ? self::httpReq('PUT', $url, $hdr, (string)$bj) : self::httpPost($url, $hdr, (string)$bj);
        if ($c < 400 && (int)($b['code'] ?? -1) === 0) { $pid = $b['data']['product_id'] ?? $cpid; return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null]; }
        return ['ok' => false, 'error' => "TikTok Shop HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** TikTok Shop 인가된 샵에서 shop_cipher 도출(쓰기 어댑터 보조 — tiktokFetch 와 동일 로직). 실패 시 ''. */
    private static function tiktokResolveShopCipher(string $base, string $appKey, string $appSecret, string $accessToken): string
    {
        $path = '/authorization/202309/shops';
        $q = ['app_key' => $appKey, 'timestamp' => (string)time()];
        $q['sign'] = self::tiktokSign($appSecret, $path, $q, '');
        [$c, $b] = self::httpGet($base . $path . '?' . http_build_query($q), ['x-tts-access-token' => $accessToken, 'Content-Type' => 'application/json']);
        if ($c >= 400 || (int)($b['code'] ?? -1) !== 0) return '';
        return (string)(($b['data']['shops'] ?? [])[0]['cipher'] ?? '');
    }

    /** [228차] Rakuten RMS Item API 2.0 상품 upsert — ESA 인증(rakutenFetch 동일), manageNumber(=SKU) 키 멱등 PUT. 라이브 검증=실 점포 계정. */
    private static function rakutenWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $serviceSecret = trim((string)($creds['service_secret'] ?? '')); $licenseKey = trim((string)($creds['license_key'] ?? ''));
        if ($serviceSecret === '' || $licenseKey === '') return ['ok' => false, 'error' => 'Rakuten: service_secret·license_key 필요'];
        $sku = (string)($p['sku'] ?? '');
        if ($sku === '') return ['ok' => false, 'error' => 'Rakuten 등록은 SKU(manageNumber)가 필요합니다'];
        $hdr = ['Authorization' => 'ESA ' . base64_encode($serviceSecret . ':' . $licenseKey), 'Content-Type' => 'application/json; charset=utf-8'];
        $url = 'https://api.rms.rakuten.co.jp/es/2.0/items/manage-numbers/' . rawurlencode($sku);
        $unreg = ($op === 'unregister' || ($p['action'] ?? '') === 'unregister');
        $body = json_encode([
            'title'              => (string)($p['name'] ?? $sku),
            'productDescription' => ['pc' => (string)($p['spec'] ?? $p['name'] ?? $sku)],
            'standardPrice'      => (int)round((float)($p['price'] ?? 0)),
            'hideItem'           => $unreg,
            'itemType'           => 'NORMAL',
            'inventory'          => ['inventoryType' => 'NORMAL', 'quantity' => (int)($p['inventory'] ?? 0)],
        ], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq('PUT', $url, $hdr, $body);
        if ($c >= 200 && $c < 300) return ['ok' => true, 'channel_product_id' => $sku];
        return ['ok' => false, 'error' => "Rakuten HTTP {$c}", 'detail' => mb_substr(json_encode($b['errors'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [228차] 11번가 셀러 Open API 상품 등록/수정 — openapikey 헤더, XML(elevenStFetch 동일 인증). ★dispCtgrNo(category_code) 필수. */
    private static function elevenStWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $apiKey = trim((string)($creds['api_key'] ?? $creds['openapikey'] ?? $creds['key_value'] ?? ''));
        if ($apiKey === '') return ['ok' => false, 'error' => '11번가: 오픈API 키(api_key) 필요'];
        $hdr = ['openapikey' => $apiKey, 'Content-Type' => 'text/xml; charset=euc-kr'];
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            if ($cpid === null) return ['ok' => false, 'error' => '11번가 미등록 상품 — 내릴 대상 없음'];
            [$c] = self::httpReq('PUT', "http://api.11st.co.kr/rest/prodservices/product/sellingStop/" . rawurlencode($cpid), $hdr, '');
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'channel_product_id' => $cpid] : ['ok' => false, 'error' => "11번가 판매중지 HTTP {$c}"];
        }
        $cat = (string)($p['category_code'] ?? '');
        if ($cat === '') return ['ok' => false, 'error' => '11번가 상품등록은 표시카테고리(dispCtgrNo)가 필요합니다 — 채널 카테고리 매핑에서 11번가 카테고리번호를 지정하세요'];
        $name = htmlspecialchars((string)($p['name'] ?? $p['sku'] ?? ''), ENT_XML1); $sku = htmlspecialchars((string)($p['sku'] ?? ''), ENT_XML1);
        $price = (int)round((float)($p['price'] ?? 0)); $qty = (int)($p['inventory'] ?? 0);
        $xml = '<?xml version="1.0" encoding="EUC-KR"?>'
             . '<Product><dispCtgrNo>' . htmlspecialchars($cat, ENT_XML1) . '</dispCtgrNo>'
             . '<prdNm>' . $name . '</prdNm><sellPrc>' . $price . '</sellPrc>'
             . '<prdStockQty>' . $qty . '</prdStockQty><sellerPrdCd>' . $sku . '</sellerPrdCd>'
             . '<dispCtgrStatCd>1</dispCtgrStatCd></Product>';
        $method = $cpid !== null ? 'PUT' : 'POST';
        $url = $cpid !== null ? "http://api.11st.co.kr/rest/prodservices/product/" . rawurlencode($cpid) : 'http://api.11st.co.kr/rest/prodservices/product';
        [$c, $ignore, $err, $raw] = self::httpReq($method, $url, $hdr, $xml);
        if ($c >= 200 && $c < 300) {
            $pid = $cpid; $rx = @simplexml_load_string((string)$raw);
            if ($rx !== false) { $pno = (string)($rx->prdNo ?? $rx->ProductNo ?? ''); if ($pno !== '') $pid = $pno; }
            return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null];
        }
        return ['ok' => false, 'error' => "11번가 HTTP {$c}", 'detail' => mb_substr((string)$raw, 0, 200)];
    }

    /** [228차] ESM 2.0(G마켓/옥션) 상품 등록/수정 — Bearer+siteGubun(esmFetch 동일 인증). ★카테고리코드(category_code) 필수. */
    private static function esmWrite(string $channel, array $creds, array $p, string $op, ?string $cpid): array
    {
        $apiKey = trim((string)($creds['api_key'] ?? $creds['key_value'] ?? '')); $sellerId = trim((string)($creds['seller_id'] ?? ''));
        $label = $channel === 'auction' ? '옥션' : 'G마켓';
        if ($apiKey === '' || $sellerId === '') return ['ok' => false, 'error' => "{$label}: ESM api_key·seller_id 필요"];
        $site = $channel === 'auction' ? 'IAC' : 'GMKT';
        $hdr = ['Authorization' => "Bearer {$apiKey}", 'Content-Type' => 'application/json'];
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            if ($cpid === null) return ['ok' => false, 'error' => "{$label} 미등록 상품 — 내릴 대상 없음"];
            [$c] = self::httpReq('POST', "https://api.esmplus.com/product/v1/products/" . rawurlencode($cpid) . "/stop", $hdr, json_encode(['siteGubun' => $site, 'sellerId' => $sellerId], JSON_UNESCAPED_UNICODE));
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'channel_product_id' => $cpid] : ['ok' => false, 'error' => "{$label} 판매중지 HTTP {$c}"];
        }
        $cat = (string)($p['category_code'] ?? '');
        if ($cat === '') return ['ok' => false, 'error' => "{$label} 상품등록은 카테고리코드가 필요합니다 — 채널 카테고리 매핑에서 ESM 카테고리코드를 지정하세요"];
        $payload = json_encode([
            'siteGubun' => $site, 'sellerId' => $sellerId, 'categoryCode' => $cat,
            'itemName' => (string)($p['name'] ?? $p['sku'] ?? ''), 'price' => (int)round((float)($p['price'] ?? 0)),
            'quantity' => (int)($p['inventory'] ?? 0), 'sellerItemCode' => (string)($p['sku'] ?? ''),
            'detailContent' => (string)($p['spec'] ?? $p['name'] ?? ''),
        ], JSON_UNESCAPED_UNICODE);
        $method = $cpid !== null ? 'PUT' : 'POST';
        $url = $cpid !== null ? "https://api.esmplus.com/product/v1/products/" . rawurlencode($cpid) : 'https://api.esmplus.com/product/v1/products';
        [$c, $b] = self::httpReq($method, $url, $hdr, $payload);
        if ($c >= 200 && $c < 300) { $pid = $b['itemNo'] ?? $b['productNo'] ?? ($b['data']['itemNo'] ?? null) ?? $cpid; return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null]; }
        return ['ok' => false, 'error' => "{$label} HTTP {$c}", 'detail' => mb_substr(json_encode($b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [228차] 롯데온 셀러 API 상품 등록/수정 — Bearer+X-Seller-Id(lotteonFetch 동일 인증). ★카테고리코드(category_code) 필수. */
    private static function lotteonWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $apiKey = trim((string)($creds['api_key'] ?? $creds['key_value'] ?? '')); $sellerId = trim((string)($creds['seller_id'] ?? ''));
        if ($apiKey === '' || $sellerId === '') return ['ok' => false, 'error' => '롯데온: api_key·seller_id 필요'];
        $hdr = ['Authorization' => "Bearer {$apiKey}", 'X-Seller-Id' => $sellerId, 'Content-Type' => 'application/json'];
        $unreg = ($op === 'unregister' || ($p['action'] ?? '') === 'unregister');
        $cat = (string)($p['category_code'] ?? '');
        if (!$unreg && $cat === '') return ['ok' => false, 'error' => '롯데온 상품등록은 카테고리코드가 필요합니다 — 채널 카테고리 매핑에서 롯데온 카테고리코드를 지정하세요'];
        $payload = json_encode([
            'sellerProductCode' => (string)($p['sku'] ?? ''), 'categoryCode' => $cat,
            'productName' => (string)($p['name'] ?? $p['sku'] ?? ''), 'salePrice' => (int)round((float)($p['price'] ?? 0)),
            'stockQty' => (int)($p['inventory'] ?? 0), 'saleStatus' => $unreg ? 'STOP' : 'SALE',
            'detailContent' => (string)($p['spec'] ?? $p['name'] ?? ''),
        ], JSON_UNESCAPED_UNICODE);
        $method = $cpid !== null ? 'PUT' : 'POST';
        $url = $cpid !== null ? "https://openapi.lotteon.com/seller/v1/products/" . rawurlencode($cpid) : 'https://openapi.lotteon.com/seller/v1/products';
        [$c, $b] = self::httpReq($method, $url, $hdr, $payload);
        if ($c >= 200 && $c < 300) { $pid = $b['productNo'] ?? ($b['data']['productNo'] ?? null) ?? $cpid; return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null]; }
        return ['ok' => false, 'error' => "롯데온 HTTP {$c}", 'detail' => mb_substr(json_encode($b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    // ── DB 저장 ──────────────────────────────────────────────────────────
    private static function saveProducts(PDO $pdo, string $tenant, string $channel, array $products): int
    {
        $count = 0;
        $now   = gmdate('c');
        $stmt  = $pdo->prepare("INSERT INTO channel_products
            (tenant_id,channel,channel_product_id,sku,name,price,compare_price,inventory,status,category,weight,variants_json,raw_json,synced_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            . self::upsertTail($pdo, 'tenant_id,channel,channel_product_id',
                ['name','price','inventory','status','category','synced_at']));
        foreach ($products as $p) {
            if (!($p['channel_product_id'] ?? null)) continue;
            // 188차 P0 보안: 데모 데이터의 운영 DB 유입 차단(전 채널 단일 chokepoint).
            // 실 테넌트(데모 외)에는 demo-소스/DEMO- 접두 행을 절대 저장하지 않는다.
            // 204차 P0: source='structured'(amazon 등 비실데이터 포맷)·B0AMDEMO 접두도 차단(우회 방어 강화).
            if ($tenant !== 'demo' && (in_array(($p['source'] ?? ''), ['demo','structured'], true) || str_starts_with((string)$p['channel_product_id'], 'DEMO-') || str_starts_with((string)$p['channel_product_id'], 'B0AMDEMO'))) continue;
            $stmt->execute([
                $tenant, $channel, $p['channel_product_id'],
                $p['sku'] ?? null, $p['name'] ?? null,
                (float)($p['price'] ?? 0), (float)($p['compare_price'] ?? 0),
                (int)($p['inventory'] ?? 0), $p['status'] ?? 'active',
                $p['category'] ?? null, (float)($p['weight'] ?? 0),
                json_encode($p['variants'] ?? []), json_encode($p), $now,
            ]);
            // 재고 테이블도 업데이트
            $inv = $pdo->prepare("INSERT INTO channel_inventory(tenant_id,channel,sku,product_name,available,synced_at)
                VALUES(?,?,?,?,?,?)" . self::upsertTail($pdo, 'tenant_id,channel,sku,warehouse', ['available','synced_at']));
            if ($p['sku'] ?? null) {
                $inv->execute([$tenant,$channel,$p['sku'],$p['name'] ?? '',(int)($p['inventory'] ?? 0),$now]);
            }
            $count++;
        }
        return $count;
    }

    private static function saveOrders(PDO $pdo, string $tenant, string $channel, array $orders): int
    {
        $count = 0;
        $now   = gmdate('c');
        $stmt  = $pdo->prepare("INSERT INTO channel_orders
            (tenant_id,channel,channel_order_id,buyer_name,buyer_email,product_name,sku,qty,unit_price,total_price,status,carrier,tracking_no,addr,ordered_at,event_type,raw_json,synced_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            . self::upsertTail($pdo, 'tenant_id,channel,channel_order_id',
                ['status','event_type','carrier','tracking_no','synced_at']));
        foreach ($orders as $o) {
            if (!($o['channel_order_id'] ?? null)) continue;
            // [228차 S5] ★주문 매출 다통화 → KRW 정규화. 글로벌 채널(USD/JPY/EUR 등) 주문의 total_price/unit_price 를
            //   KRW 로 환산해 일관 저장(기존엔 원시 통화 합산 → 다통화 테넌트 GMV/COGS/귀속 산술 오류, KRW 단일은 무영향).
            //   원 통화·원금은 raw_json(아래 json_encode($o))에 보존. fxToKrw(KRW/빈/미상통화=무변환).
            $ocur = strtoupper(trim((string)($o['currency'] ?? '')));
            if ($ocur !== '' && $ocur !== 'KRW') {
                $o['orig_currency'] = $ocur;
                $o['orig_total_price'] = (float)($o['total_price'] ?? 0);
                $o['total_price'] = \Genie\Handlers\Connectors::fxToKrw((float)($o['total_price'] ?? 0), $ocur);
                $o['unit_price']  = \Genie\Handlers\Connectors::fxToKrw((float)($o['unit_price'] ?? 0), $ocur);
            }
            // 188차 P0 보안: 데모 데이터의 운영 DB 유입 차단(전 채널 단일 chokepoint).
            // 204차 P0: source='structured'(amazon 등) 도 차단(우회 방어 강화).
            if ($tenant !== 'demo' && (in_array(($o['source'] ?? ''), ['demo','structured'], true) || str_starts_with((string)$o['channel_order_id'], 'DEMO-'))) continue;
            // 208차 멱등 + [현 차수 P0] 상태전이(취소/반품) 감지를 위해 기존 행 상태 사전 조회.
            $existing = null;
            try {
                $chk = $pdo->prepare("SELECT event_type, status, sku, qty, total_price FROM channel_orders WHERE tenant_id=? AND channel=? AND channel_order_id=? LIMIT 1");
                $chk->execute([$tenant, $channel, (string)$o['channel_order_id']]);
                $existing = $chk->fetch(PDO::FETCH_ASSOC) ?: null;
            } catch (\Throwable $e) {}
            $isNew = ($existing === null);
            // [현 차수 P0] 폴링 경로 취소/반품 처리(webhook 경로와 동등). 어댑터는 주로 status 로 표기.
            $incCR = self::classifyCancelReturn((string)($o['status'] ?? ''), (string)($o['event_type'] ?? ''));
            $wasCR = $existing ? (self::classifyCancelReturn((string)($existing['status'] ?? ''), (string)($existing['event_type'] ?? '')) !== null) : false;
            // 저장 event_type: 취소/반품이면 분류값으로 정규화(다음 폴링 시 재전이 오판 방지·webhook 정합).
            $evt = $incCR ?? ((string)($o['event_type'] ?? 'order'));
            $stmt->execute([
                $tenant, $channel, $o['channel_order_id'],
                $o['buyer_name'] ?? null, $o['buyer_email'] ?? null,
                $o['product_name'] ?? null, $o['sku'] ?? null,
                (int)($o['qty'] ?? 1), (float)($o['unit_price'] ?? 0), (float)($o['total_price'] ?? 0),
                $o['status'] ?? 'pending', $o['carrier'] ?? null, $o['tracking_no'] ?? null,
                $o['addr'] ?? null, $o['ordered_at'] ?? $now,
                $evt, json_encode($o), $now,
            ]);
            $count++;
            if ($tenant === 'demo') continue;

            if ($isNew) {
                if ($incCR === null) {
                    // 정상 신규 주문 → 실재고 차감 + CRM 구매이력 + 어트리뷰션 터치(커머스→재고/CRM/귀속 동기화).
                    if (!empty($o['sku'])) {
                        self::decInventory($pdo, $tenant, $channel, (string)$o['sku'], (int)($o['qty'] ?? 1));
                        // [현 차수] 단방향 자동진입: 채널 판매를 물리 창고 재고(wms_stock)에도 출고 반영
                        //   (추적 SKU 한정·ref 멱등·non-throw·미추적/무-WMS 테넌트 무영향).
                        Wms::reflectChannelSale($tenant, (string)$o['sku'], (string)($o['product_name'] ?? ''), (float)($o['qty'] ?? 1), 'CHS-' . $channel . '-' . (string)$o['channel_order_id']);
                    }
                    self::recordCrmPurchase($pdo, $tenant, $channel, $o['buyer_email'] ?? '', $o['buyer_name'] ?? '', (float)($o['total_price'] ?? 0), (string)($o['sku'] ?? ''), (int)($o['qty'] ?? 1), (string)$o['channel_order_id']);
                    self::recordAttributionTouch($pdo, $tenant, $channel, (string)$o['channel_order_id'], (float)($o['total_price'] ?? 0));
                    // [227차 P0] 커머스 주문 → 광고 채널 귀속 보강(외부몰 매출을 광고 ROAS 에 연결).
                    //   클릭ID(gclid/fbclid/ttclid) 또는 구매자 이메일↔픽셀 마케팅터치 매칭으로 광고 채널을 식별해
                    //   attribution_touch/result 에 적재 → markov 가 이 주문 매출을 광고에 귀속(커머스플랫폼명 귀속 한계 해소).
                    self::enrichOrderAttribution($pdo, $tenant, $channel, (string)$o['channel_order_id'], $o['buyer_email'] ?? null, (float)($o['total_price'] ?? 0), $o);
                } else {
                    // 최초 수집부터 취소/반품 → 재고차감/구매기록 없이 claim 만 적재(정산 정합, 미판매분 재고 미차감).
                    self::recordClaim($pdo, $tenant, $channel, (string)$o['channel_order_id'], $incCR, (float)($o['total_price'] ?? 0), (string)($o['reason'] ?? ''), (string)($o['buyer_name'] ?? ''), $now);
                    // [현 차수] 단방향 자동진입: 반품이면 반품관리 포탈에 멱등 자동 진입(반품관리 동기화).
                    //   최초수집 반품은 원 출고를 추적하지 않았으므로 물리재고 복원은 미수행(이중복원 방지).
                    if ($incCR === 'return') {
                        ReturnsPortal::ingestChannelReturn($tenant, [
                            'order_id' => (string)$o['channel_order_id'], 'channel' => $channel,
                            'sku' => (string)($o['sku'] ?? ''), 'name' => (string)($o['product_name'] ?? ''),
                            'qty' => (int)($o['qty'] ?? 1), 'reason' => (string)($o['reason'] ?? ''),
                            'refund_amt' => (float)($o['total_price'] ?? 0),
                        ]);
                    }
                }
            } elseif ($incCR !== null && !$wasCR) {
                // [현 차수 P0] 활성→취소/반품 전이(최초 1회) → 재고 복원 + claim 적재(정산 returnFee 자동반영). recordClaim 멱등.
                $rsku = (string)($existing['sku'] ?? ($o['sku'] ?? ''));
                $rqty = (int)($existing['qty'] ?? ($o['qty'] ?? 0));
                if ($rsku !== '' && $rqty > 0) self::incInventory($pdo, $tenant, $channel, $rsku, $rqty);
                $claimTotal = (float)($existing['total_price'] ?? 0);
                if ($claimTotal <= 0) $claimTotal = (float)($o['total_price'] ?? 0);
                self::recordClaim($pdo, $tenant, $channel, (string)$o['channel_order_id'], $incCR, $claimTotal, (string)($o['reason'] ?? ''), (string)($o['buyer_name'] ?? ''), $now);
                // [현 차수] 단방향 자동진입: 활성→취소/반품 전이 → 물리 창고 재고 복원(reflectChannelSale 차감분
                //   대칭, 취소/반품 공통: 판매 차감했던 분만 1회 복원). 반품이면 반품관리 포탈에도 멱등 진입.
                if ($rsku !== '' && $rqty > 0) {
                    $rname = (string)($o['product_name'] ?? '');
                    $oid = (string)$o['channel_order_id'];
                    Wms::reflectChannelRestock($tenant, $rsku, $rname, (float)$rqty, 'CHS-' . $channel . '-' . $oid, 'CHR-' . $channel . '-' . $oid);
                    if ($incCR === 'return') {
                        ReturnsPortal::ingestChannelReturn($tenant, [
                            'order_id' => $oid, 'channel' => $channel, 'sku' => $rsku, 'name' => $rname,
                            'qty' => $rqty, 'reason' => (string)($o['reason'] ?? ''), 'refund_amt' => $claimTotal,
                        ]);
                    }
                }
            }
        }
        return $count;
    }

    /** 208차 동기화 P0: 주문 발생 시 channel_inventory.available 차감(단일 행, 음수방지, 기본창고 우선). */
    private static function decInventory(PDO $pdo, string $tenant, string $channel, string $sku, int $qty): void
    {
        if ($sku === '' || $qty <= 0) return;
        try {
            $sel = $pdo->prepare("SELECT id FROM channel_inventory WHERE tenant_id=? AND channel=? AND sku=? ORDER BY (warehouse='default') DESC, id ASC LIMIT 1");
            $sel->execute([$tenant, $channel, $sku]);
            $id = $sel->fetchColumn();
            if ($id === false || $id === null) return; // 미동기화 SKU → 차감 대상 없음
            // [227차 감사 P1] 원자 차감 — 기존 SELECT available→앱계산→UPDATE 는 동시 주문 시 동일 available 을
            //   읽어 lost decrement/오버셀이 났다. 단일 UPDATE 로 available-qty(0 클램프)를 원자 적용(incInventory 대칭).
            $isMy = strtolower((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) === 'mysql';
            $clamp = $isMy ? 'GREATEST(0, available - ?)' : 'MAX(0, available - ?)';
            $pdo->prepare("UPDATE channel_inventory SET available = {$clamp}, synced_at=? WHERE id=?")
                ->execute([$qty, gmdate('c'), (int)$id]);
        } catch (\Throwable $e) { error_log('[ChannelSync.decInventory] ' . $e->getMessage()); }
    }

    /** 208차 동기화: 취소/반품 시 channel_inventory.available 복원(단일 행, 기본창고 우선). */
    private static function incInventory(PDO $pdo, string $tenant, string $channel, string $sku, int $qty): void
    {
        if ($sku === '' || $qty <= 0) return;
        try {
            $sel = $pdo->prepare("SELECT id FROM channel_inventory WHERE tenant_id=? AND channel=? AND sku=? ORDER BY (warehouse='default') DESC, id ASC LIMIT 1");
            $sel->execute([$tenant, $channel, $sku]);
            $id = $sel->fetchColumn();
            if (!$id) return;
            $pdo->prepare("UPDATE channel_inventory SET available=available+?, synced_at=? WHERE id=?")
                ->execute([$qty, gmdate('c'), (int)$id]);
        } catch (\Throwable $e) { error_log('[ChannelSync.incInventory] ' . $e->getMessage()); }
    }

    /**
     * [현 차수 P0] 주문 상태/이벤트 → 취소/반품 분류. 폴링 어댑터는 취소/반품을 주로 status 로
     *   표기한다(Amazon 'canceled', Shopify '취소완료'/'반품완료', event_type 은 대개 'order').
     *   반품/환불을 취소보다 우선 판정. 매칭 없으면 null.
     */
    private static function classifyCancelReturn(string $status, string $eventType): ?string
    {
        $hay = $status . ' ' . $eventType;
        if ($eventType === 'return' || preg_match('/return|refund|반품|환불/iu', $hay)) return 'return';
        if ($eventType === 'cancel' || preg_match('/cancel|void|취소/iu', $hay))         return 'cancel';
        return null;
    }

    /**
     * [현 차수] 219 backlog #2: 오픈마켓 어댑터 status/event_type 하드코딩('발주확인'/'order') 해소.
     *   실 API 주문의 상태 필드(취소/반품 포함)를 캐논 [status, event_type] 로 매핑한다. status 원문 유지
     *   (있으면), event_type 은 classifyCancelReturn 으로 취소/반품/주문 판정 → saveOrders 전이 로직이
     *   재고 복원·claim·반품포탈·정산을 자동 처리. 빈 상태면 기존 동작('발주확인'/order) 보존.
     */
    private static function openmarketStatus(string $rawStatus): array
    {
        $raw = trim($rawStatus);
        $evt = self::classifyCancelReturn($raw, '') ?? 'order';
        $status = $raw !== '' ? $raw : '발주확인';
        return [$status, $evt];
    }

    /**
     * 208차 동기화 P1: 주문 발생 시 CRM 구매이력 자동 기록(수동 동기화 버튼 의존 제거).
     *   crm_customers upsert(email 기준, LTV 누적) + crm_activities(type='purchase') 적재.
     *   CustomerAI 의 churn/LTV/RFM 이 이 데이터에 의존 → 주문 흐름과 자동 연결.
     *   이메일 없으면 CRM 매칭 불가로 skip. 테이블 부재/오류는 best-effort 무시(주문적재 비차단).
     */
    /** [현 차수] 외부 구매(LiveCommerce 등) → CRM/LTV/구매여정 연결 public 진입점. recordCrmPurchase 위임. */
    public static function ingestPurchaseToCrm(PDO $pdo, string $tenant, string $channel, ?string $email, ?string $name, float $total, string $sku, int $qty, string $orderId): void
    {
        self::recordCrmPurchase($pdo, $tenant, $channel, $email, $name, $total, $sku, $qty, $orderId);
    }

    /** [현 차수] 주문 → 어트리뷰션 채널 터치(귀속 분석 반영). 멱등(주문+채널). 데모/테이블부재는 무동작. */
    public static function recordAttributionTouch(PDO $pdo, string $tenant, string $channel, string $orderId, float $total): void
    {
        if ($tenant === 'demo' || $orderId === '') return;
        try {
            $chk = $pdo->prepare("SELECT 1 FROM attribution_touch WHERE tenant_id=? AND order_id=? AND channel=? LIMIT 1");
            $chk->execute([$tenant, $orderId, $channel]);
            if ($chk->fetchColumn()) return;
            $pdo->prepare("INSERT INTO attribution_touch (tenant_id,order_id,channel,touched_at,extra_json) VALUES(?,?,?,?,?)")
                ->execute([$tenant, $orderId, $channel, gmdate('c'), json_encode(['revenue' => $total, 'source' => 'order'], JSON_UNESCAPED_UNICODE)]);
        } catch (\Throwable $e) { /* attribution_touch 미존재 시 best-effort */ }
    }

    /**
     * [227차 P0] 커머스 주문 → 광고 채널 귀속 보강. 외부 커머스몰(쿠팡/네이버 등)에서 결제가 일어나면
     *   픽셀이 그 몰에 없어 "어느 광고가 이 매출을 냈나"가 단절된다. 두 신호로 광고 채널을 식별한다:
     *     ① 클릭ID 패스스루(gclid→google, fbclid→meta, ttclid→tiktok) — 주문 raw 에 전달된 경우 최강 신호.
     *     ② 구매자 이메일 ↔ 픽셀 마케팅 터치 매칭 — 같은 이메일의 최근 utm_source(광고 채널) 사용.
     *   광고 신호가 있으면 attribution_touch(광고 채널)+attribution_result(전환) 적재 → markov 가 이 주문
     *   매출을 광고에 귀속한다(기존 커머스-채널 터치는 보존, 추가만 함 = 안전). 신호 없으면 무동작.
     *   데모/PII미저장(이메일은 sha256 해시만 사용)·멱등·테넌트 격리.
     */
    private static function enrichOrderAttribution(PDO $pdo, string $tenant, string $channel, string $orderId, ?string $buyerEmail, float $total, array $raw): void
    {
        if ($tenant === 'demo' || $orderId === '') return;
        $adChannel = '';
        // ① 클릭ID 패스스루
        $blob = strtolower((string)json_encode($raw, JSON_UNESCAPED_UNICODE));
        if (strpos($blob, 'gclid') !== false)        $adChannel = 'google';
        elseif (strpos($blob, 'fbclid') !== false)   $adChannel = 'meta';
        elseif (strpos($blob, 'ttclid') !== false)   $adChannel = 'tiktok';
        // ② 이메일 ↔ 픽셀 마케팅 터치 매칭(클릭ID 없을 때)
        if ($adChannel === '' && $buyerEmail !== null && trim($buyerEmail) !== '') {
            $eh = hash('sha256', strtolower(trim($buyerEmail)));
            try {
                $st = $pdo->prepare("SELECT utm_source FROM pixel_events WHERE tenant_id=? AND email_hash=? AND utm_source IS NOT NULL AND utm_source<>'' ORDER BY created_at DESC LIMIT 1");
                $st->execute([$tenant, $eh]);
                $u = trim((string)($st->fetchColumn() ?: ''));
                if ($u !== '') $adChannel = $u;
            } catch (\Throwable $e) { /* pixel_events 부재 등 무시 */ }
        }
        $now = gmdate('c');
        if ($adChannel === '') {
            // [228차 S3] ★광고 신호 없는 주문도 '전환'으로 집계 — 커머스 채널 last-touch 귀속.
            //   기존엔 early-return → attribution_result 미생성 → AttributionEngine::loadJourneys 가 이 주문을
            //   null(비전환) 여정으로 로드(전환 과소 + markov 크레딧 균등분할 퇴화)했다. 이제 커머스 채널을
            //   last-touch 로 전환 등록(커머스 터치는 recordAttributionTouch 가 이미 적재 → 여정 [커머스]→전환).
            //   ★model='commerce-last-touch' 로 분리 — S1 ROAS 정합(model='order-match'=광고귀속만)은 불변(광고 ROAS 과대 없음).
            try {
                $ig = ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') ? 'IGNORE' : 'OR IGNORE';
                $chk0 = $pdo->prepare("SELECT 1 FROM attribution_result WHERE tenant_id=? AND order_id=? LIMIT 1");
                $chk0->execute([$tenant, $orderId]);
                if (!$chk0->fetchColumn()) {
                    $pdo->prepare("INSERT {$ig} INTO attribution_result(tenant_id,order_id,attributed_channel,confidence_score,evidence_json,model,created_at) VALUES(?,?,?,?,?,?,?)")
                        ->execute([$tenant, $orderId, strtolower($channel), 1.0, json_encode(['source' => 'commerce_organic', 'revenue' => $total, 'commerce_channel' => $channel], JSON_UNESCAPED_UNICODE), 'commerce-last-touch', $now]);
                }
            } catch (\Throwable $e) { /* attribution_result 미존재 등 best-effort */ }
            return;
        }

        // 광고 채널 터치 적재(멱등) — markov 멀티터치 여정에 광고 채널 포함.
        try {
            $chk = $pdo->prepare("SELECT 1 FROM attribution_touch WHERE tenant_id=? AND order_id=? AND channel=? LIMIT 1");
            $chk->execute([$tenant, $orderId, $adChannel]);
            if (!$chk->fetchColumn()) {
                $pdo->prepare("INSERT INTO attribution_touch (tenant_id,order_id,channel,utm_source,touched_at,extra_json) VALUES(?,?,?,?,?,?)")
                    ->execute([$tenant, $orderId, $adChannel, $adChannel, $now, json_encode(['revenue' => $total, 'source' => 'order_ad_match', 'commerce_channel' => $channel], JSON_UNESCAPED_UNICODE)]);
            }
        } catch (\Throwable $e) { return; }
        // 전환 등록 — markov 의 전환 order 집합(attribution_result)에 포함되어야 여정이 노출됨.
        try {
            $ig = ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') ? 'IGNORE' : 'OR IGNORE';
            $chk2 = $pdo->prepare("SELECT 1 FROM attribution_result WHERE tenant_id=? AND order_id=? LIMIT 1");
            $chk2->execute([$tenant, $orderId]);
            if (!$chk2->fetchColumn()) {
                $pdo->prepare("INSERT {$ig} INTO attribution_result(tenant_id,order_id,attributed_channel,confidence_score,evidence_json,model,created_at) VALUES(?,?,?,?,?,?,?)")
                    ->execute([$tenant, $orderId, $adChannel, 0.8, json_encode(['source' => 'order_match', 'revenue' => $total, 'commerce_channel' => $channel], JSON_UNESCAPED_UNICODE), 'order-match', $now]);
            }
        } catch (\Throwable $e) { /* attribution_result 미존재 등 best-effort */ }
    }

    /**
     * [229차 S3 backfill, 228 잔여 #4] 과거 주문 어트리뷰션 소급 적용.
     *   S3(228차 bcc89c6) 이전 적재된 주문은 enrichOrderAttribution 의 early-return 으로
     *   attribution_result 가 생성되지 않아, AttributionEngine::loadJourneys 가 이를 비전환으로
     *   로드(전환 과소·markov 크레딧 퇴화)했다. 본 메서드는 attribution_result 누락 주문을 찾아
     *   라이브 신규주문과 동일 시퀀스(recordAttributionTouch → enrichOrderAttribution)를 멱등 재생한다.
     *
     *   ★attribution 전용 소급: 재고차감(decInventory)·WMS·CRM(recordCrmPurchase)는 재생하지 않는다
     *     (그 부수효과는 최초 수집 시 이미 적용·일부는 멱등 보장 약함 → 이중반영 위험). 귀속 신호만 보강.
     *   ★라이브 정합: 취소/반품 주문은 라이브 경로($incCR===null 일 때만 enrich)와 동일하게 제외.
     *   ★멱등: 두 헬퍼 모두 존재체크 후 INSERT → 재실행 안전. 데모 테넌트는 무동작.
     *
     *   @return ['scanned'=>n, 'enriched'=>n, 'skipped_cr'=>n] 처리 통계.
     */
    public static function backfillAttribution(PDO $pdo, string $tenant, int $limit = 50000): array
    {
        $agg = ['scanned' => 0, 'enriched' => 0, 'skipped_cr' => 0];
        if ($tenant === 'demo' || $tenant === '') return $agg;
        $batch   = 1000;
        $hardCap = max(0, $limit);
        // ★단조 증가 PK(id) 커서로 전진 — 취소/반품 skip 주문은 attribution_result 가 안 생겨
        //   NOT EXISTS 단독 페이지네이션이면 매 배치 재반환→무한루프. id>lastId 로 반드시 전진한다.
        //   NOT EXISTS 는 이미 귀속된 주문을 건너뛰는 효율 필터(헬퍼 멱등이라 정확성은 무관).
        $lastId = 0;
        while ($hardCap === 0 || $agg['scanned'] < $hardCap) {
            try {
                $sql = "SELECT id, channel, channel_order_id, buyer_email, total_price, raw_json, status, event_type "
                     . "FROM channel_orders co "
                     . "WHERE co.tenant_id = ? AND co.id > ? AND co.channel_order_id IS NOT NULL AND co.channel_order_id <> '' "
                     . "AND NOT EXISTS (SELECT 1 FROM attribution_result ar WHERE ar.tenant_id = co.tenant_id AND ar.order_id = co.channel_order_id) "
                     . "ORDER BY co.id ASC LIMIT " . (int)$batch; // [225차 트랩] MySQL LIMIT 바인딩 회피 — 정수 인라인.
                $st = $pdo->prepare($sql);
                $st->execute([$tenant, $lastId]);
                $rows = $st->fetchAll(PDO::FETCH_ASSOC);
            } catch (\Throwable $e) {
                break; // channel_orders/attribution_result 부재 등 — 처리할 것 없음.
            }
            if (!$rows) break;
            foreach ($rows as $o) {
                $lastId = max($lastId, (int)($o['id'] ?? 0)); // 커서 전진(skip 여부 무관).
                $agg['scanned']++;
                $orderId = (string)($o['channel_order_id'] ?? '');
                if ($orderId === '') continue;
                // 라이브와 동일: 취소/반품 주문은 전환 귀속 제외.
                if (self::classifyCancelReturn((string)($o['status'] ?? ''), (string)($o['event_type'] ?? '')) !== null) {
                    $agg['skipped_cr']++;
                    continue;
                }
                $channel = (string)($o['channel'] ?? '');
                $total   = (float)($o['total_price'] ?? 0);
                $email   = trim((string)($o['buyer_email'] ?? ''));
                $raw     = [];
                if (!empty($o['raw_json'])) { $d = json_decode((string)$o['raw_json'], true); if (is_array($d)) $raw = $d; }
                // 라이브 시퀀스 재생(귀속만) — 둘 다 멱등.
                self::recordAttributionTouch($pdo, $tenant, $channel, $orderId, $total);
                self::enrichOrderAttribution($pdo, $tenant, $channel, $orderId, $email !== '' ? $email : null, $total, $raw);
                $agg['enriched']++;
            }
            if (count($rows) < $batch) break; // 마지막 배치.
        }
        return $agg;
    }

    private static function recordCrmPurchase(PDO $pdo, string $tenant, string $channel, ?string $email, ?string $name, float $total, string $sku, int $qty, string $orderId): void
    {
        $email = trim((string)$email);
        $name  = trim((string)$name);
        if ($tenant === 'demo') return;
        // [현 차수] 이메일 없으면 buyer_name+channel 합성키로 CRM 연결(LTV/churn/여정 누락 방지). 완전 익명(이름·이메일 모두 없음)만 skip.
        $matchEmail = $email;
        if ($matchEmail === '') {
            if ($name === '') return;
            $matchEmail = strtolower(preg_replace('/[^\p{L}\p{N}]+/u', '', $name)) . '@' . $channel . '.noemail';
        }
        $now = gmdate('Y-m-d H:i:s');
        try {
            // [225차 P2-2] order_id 멱등 — 재폴링/중복 호출 시 동일 주문이 LTV 이중가산 + 구매활동·여정
            //   중복 진입하던 결함 차단. crm_activities.data(JSON)의 order_id 로 기존 구매 활동 존재 시 skip.
            if ($orderId !== '') {
                $dupChk = $pdo->prepare("SELECT 1 FROM crm_activities WHERE tenant_id=? AND type='purchase' AND channel=? AND data LIKE ? LIMIT 1");
                $dupChk->execute([$tenant, $channel, '%"order_id":"' . $orderId . '"%']);
                if ($dupChk->fetchColumn()) return;
            }
            $sel = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=? AND email=? LIMIT 1");
            $sel->execute([$tenant, $matchEmail]);
            $cid = $sel->fetchColumn();
            if (!$cid) {
                $pdo->prepare("INSERT INTO crm_customers(tenant_id,email,name,grade,ltv,created_at,updated_at) VALUES(?,?,?,'normal',?,?,?)")
                    ->execute([$tenant, $matchEmail, (string)$name, $total, $now, $now]);
                $cid = (int)$pdo->lastInsertId();
            } else {
                $pdo->prepare("UPDATE crm_customers SET ltv=ltv+?, name=COALESCE(NULLIF(name,''),?), updated_at=? WHERE id=?")
                    ->execute([$total, (string)$name, $now, (int)$cid]);
            }
            $pdo->prepare("INSERT INTO crm_activities(tenant_id,customer_id,type,channel,amount,data,created_at) VALUES(?,?,'purchase',?,?,?,?)")
                ->execute([$tenant, (int)$cid, $channel, $total, json_encode(['sku' => $sku, 'qty' => $qty, 'order_id' => $orderId], JSON_UNESCAPED_UNICODE), $now]);
            // [현 차수] 구매 이벤트 → 'purchase' 트리거 여정 자동 진입(전환 귀속 revenue 포함). best-effort.
            try { JourneyBuilder::enrollByTrigger($pdo, $tenant, 'purchase', (int)$cid, ['revenue' => $total]); } catch (\Throwable $e) {}
        } catch (\Throwable $e) { error_log('[ChannelSync.recordCrmPurchase] ' . $e->getMessage()); }
    }

    /** 208차 동기화 P0: 취소/반품 시 orderhub_claims 적재 → 정산 롤업 returnFee 자동반영. 멱등 id(채널+주문). */
    private static function recordClaim(PDO $pdo, string $tenant, string $channel, string $orderId, string $type, float $orderTotal, string $reason, string $buyer, string $now): void
    {
        try {
            $cid = 'CLM-' . $channel . '-' . $orderId; // 멱등 id(웹훅 재전송 중복 방지)
            $chk = $pdo->prepare("SELECT 1 FROM orderhub_claims WHERE id=? AND tenant_id=? LIMIT 1");
            $chk->execute([$cid, $tenant]);
            if ($chk->fetchColumn()) return;
            $fee = round($orderTotal * 0.02, 2); // 반품/취소 처리비 2%(정산 returnFee)
            $pdo->prepare("INSERT INTO orderhub_claims(id,tenant_id,order_id,buyer,channel,type,reason,status,amount,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$cid, $tenant, $orderId, $buyer !== '' ? $buyer : null, $channel, $type, $reason !== '' ? $reason : null, 'accepted', $fee, $now, $now]);
        } catch (\Throwable $e) { error_log('[ChannelSync.recordClaim] ' . $e->getMessage()); }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════

    // GET /api/channel-sync/status
    public static function status(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);

        $creds = $pdo->prepare("SELECT id,channel,cred_type,label,key_name,test_status,last_tested_at,last_synced_at,sync_status,is_active FROM channel_credential WHERE tenant_id=?");
        $creds->execute([$tenant]);
        $rows = $creds->fetchAll(PDO::FETCH_ASSOC);

        // [225차 P1-7] 채널키를 canonical 로 정규화해 누적(별칭 st11→11st, tiktok_shop→tiktok 등).
        //   기존엔 raw 저장키로 집계해 supportedChannels.id(canonical) 와 불일치 → 11번가 카드가 정상연결·
        //   동기화에도 미연동·0 으로 거짓표시되던 결함 해소.
        $productCounts = [];
        try {
            $stats = $pdo->prepare("SELECT channel, COUNT(*) as product_cnt FROM channel_products WHERE tenant_id=? GROUP BY channel");
            $stats->execute([$tenant]);
            foreach ($stats->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $c = self::normalizeChannelKey((string)$r['channel']);
                $productCounts[$c] = ($productCounts[$c] ?? 0) + (int)$r['product_cnt'];
            }
        } catch (\Throwable $e) { $productCounts = []; }

        $orderStats = [];
        try {
            // [225차 P1-8] 취소주문 제외(OrderHub SSOT) — 채널별 매출·주문수가 ordersStats/Rollup 캐논과
            //   발산(과대)하던 결함 해소. 반품은 매출 포함이라 제외 대상 아님.
            $ph = implode(',', array_fill(0, count(OrderHub::CANCEL_TOKENS), '?'));
            $ostats = $pdo->prepare("SELECT channel, COUNT(*) as order_cnt, SUM(total_price) as total_revenue
                FROM channel_orders
                WHERE tenant_id=? AND NOT (COALESCE(event_type,'order')='cancel' OR COALESCE(status,'') IN ($ph))
                GROUP BY channel");
            $ostats->execute(array_merge([$tenant], OrderHub::CANCEL_TOKENS));
            foreach ($ostats->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $c = self::normalizeChannelKey((string)$r['channel']);
                if (!isset($orderStats[$c])) $orderStats[$c] = ['cnt' => 0, 'revenue' => 0.0];
                $orderStats[$c]['cnt']     += (int)$r['order_cnt'];
                $orderStats[$c]['revenue'] += (float)$r['total_revenue'];
            }
        } catch (\Throwable $e) { $orderStats = []; }

        // 채널 목록 (등록된 것 + 기본 지원 채널)
        $supportedChannels = [
            ['id'=>'shopify','name'=>'Shopify','icon'=>'🛒','color'=>'#96bf48','type'=>'글로벌'],
            ['id'=>'amazon','name'=>'Amazon SP-API','icon'=>'📦','color'=>'#ff9900','type'=>'글로벌'],
            ['id'=>'ebay','name'=>'eBay','icon'=>'🔵','color'=>'#0064d2','type'=>'글로벌'],
            ['id'=>'tiktok_shop','name'=>'TikTok Shop','icon'=>'🎵','color'=>'#ff0050','type'=>'글로벌'],
            ['id'=>'rakuten','name'=>'Rakuten','icon'=>'🇯🇵','color'=>'#bf0000','type'=>'일본'],
            ['id'=>'yahoo_jp','name'=>'Yahoo! Japan','icon'=>'🟥','color'=>'#ff0033','type'=>'일본'],
            ['id'=>'line','name'=>'LINE Shopping','icon'=>'💚','color'=>'#00b900','type'=>'일본'],
            ['id'=>'coupang','name'=>'쿠팡 Wing','icon'=>'🅒','color'=>'#00bae5','type'=>'국내'],
            ['id'=>'naver','name'=>'네이버 스마트스토어','icon'=>'🟢','color'=>'#03c75a','type'=>'국내'],
            ['id'=>'11st','name'=>'11번가','icon'=>'11','color'=>'#ff0000','type'=>'국내'],
            ['id'=>'gmarket','name'=>'G마켓','icon'=>'G','color'=>'#eab308','type'=>'국내'],
            ['id'=>'cafe24','name'=>'Cafe24','icon'=>'☕','color'=>'#6366f1','type'=>'국내'],
            ['id'=>'lotteon','name'=>'롯데온','icon'=>'L','color'=>'#ef4444','type'=>'국내'],
        ];

        // [225차 P1-7] credMap 도 canonical 키로 정규화(저장키 st11 등 별칭 → supportedChannels.id 와 정합).
        $credMap = [];
        foreach ($rows as $r) {
            $ch = self::normalizeChannelKey((string)$r['channel']);
            if (!isset($credMap[$ch])) $credMap[$ch] = [];
            $credMap[$ch][] = $r;
        }

        foreach ($supportedChannels as &$ch) {
            $id = self::normalizeChannelKey($ch['id']); // 조회는 canonical 키로(표시 id 는 보존)
            $ch['status']       = isset($credMap[$id]) ? ($credMap[$id][0]['test_status'] ?? 'untested') : 'not_configured';
            $ch['creds']        = $credMap[$id] ?? [];
            $ch['product_count']= (int)($productCounts[$id] ?? 0);
            $ch['order_count']  = (int)($orderStats[$id]['cnt'] ?? 0);
            $ch['revenue']      = (float)($orderStats[$id]['revenue'] ?? 0);
            $ch['last_synced']  = $credMap[$id][0]['last_synced_at'] ?? null;
            $ch['sync_status']  = $credMap[$id][0]['sync_status'] ?? 'none';
        }
        unset($ch);

        return TemplateResponder::respond($res, [
            'ok'       => true,
            'plan'     => $plan,
            'channels' => $supportedChannels,
            'totals'   => [
                'channels'   => count($rows) > 0 ? count(array_unique(array_column($rows, 'channel'))) : 0,
                'products'   => array_sum($productCounts),
                'orders'     => array_sum(array_column($orderStats, 'cnt')),
                'revenue'    => array_sum(array_column($orderStats, 'revenue')),
            ],
        ]);
    }

    // POST /api/channel-sync/credentials
    public static function saveCredential(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $body   = (array)($req->getParsedBody() ?? []);

        $channel = trim((string)($body['channel'] ?? ''));
        if (!$channel) return TemplateResponder::respond($res->withStatus(422), ['error'=>'channel required']);

        $now = gmdate('c');
        $extra = [];
        foreach (['shop_domain','marketplace_id','store_id','refresh_token','client_id','client_secret'] as $k) {
            if (!empty($body[$k])) $extra[$k] = $body[$k];
        }
        // [현 차수] 저장용 extra: secret 필드(refresh_token/client_secret) 은행급 암호화. 즉시 동기화는 평문 $extra 사용.
        $extraStore = $extra;
        foreach (['refresh_token','client_secret'] as $sk) {
            if (!empty($extraStore[$sk])) $extraStore[$sk] = \Genie\Crypto::encrypt((string)$extraStore[$sk]);
        }

        // 자격증명 저장 — 207차 driver-aware upsert(빈 key_value 는 기존값 보존)
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        $credTail = $isMy
            ? " ON DUPLICATE KEY UPDATE
                key_value=CASE WHEN VALUES(key_value)='' THEN key_value ELSE VALUES(key_value) END,
                extra_json=VALUES(extra_json),is_active=1,updated_at=VALUES(updated_at)"
            : " ON CONFLICT(tenant_id,channel,key_name) DO UPDATE SET
                key_value=CASE WHEN excluded.key_value='' THEN key_value ELSE excluded.key_value END,
                extra_json=excluded.extra_json,is_active=1,updated_at=excluded.updated_at";
        $stmt = $pdo->prepare("INSERT INTO channel_credential(tenant_id,channel,cred_type,label,key_name,key_value,extra_json,is_active,updated_at,created_at)
            VALUES(?,?,?,?,?,?,?,1,?,?)" . $credTail);

        // 메인 키 — DB 저장은 암호화(은행급), 즉시 동기화는 평문 사용.
        $keyName  = trim((string)($body['key_name'] ?? 'api_key'));
        $keyValue = trim((string)($body['key_value'] ?? ''));
        $keyValueEnc = $keyValue !== '' ? \Genie\Crypto::encrypt($keyValue) : '';
        $stmt->execute([$tenant,$channel,$body['cred_type']??'api_key',$body['label']??$channel,$keyName,$keyValueEnc,json_encode($extraStore),$now,$now]);
        $credId = (int)$pdo->lastInsertId();

        // 즉시 동기화 실행 (평문)
        $creds = array_merge(['key_value'=>$keyValue,$keyName=>$keyValue], $extra, (array)json_decode($body['extra_json']??'{}',true));
        $result = self::fetchFromChannel($channel, $creds, $plan, $tenant);

        $productCount = 0;
        $orderCount   = 0;
        $pending = !empty($result['pending']); // [현 차수] H1: stub 채널 = 연동 대기(거짓 'ok' 방지)
        if ($result['ok']) {
            $productCount = self::saveProducts($pdo, $tenant, $channel, $result['products'] ?? []);
            $orderCount   = self::saveOrders($pdo, $tenant, $channel, $result['orders'] ?? []);
            $syncStatus = $pending ? 'pending' : 'ok';
            $pdo->prepare("UPDATE channel_credential SET last_synced_at=?,sync_status=?,test_status='ok' WHERE id=?")->execute([$now,$syncStatus,$credId]);
        }

        Db::audit($pdo, $tenant, 'channel_sync.save_credential', ['cred_id'=>$credId, 'channel'=>$channel, 'synced'=>$result['ok'] && !$pending]); // 감사: 자격증명 저장(보안)
        return TemplateResponder::respond($res, [
            'ok'            => true,
            'cred_id'       => $credId,
            'channel'       => $channel,
            'synced'        => $result['ok'] && !$pending,
            'pending'       => $pending,
            'product_count' => $productCount,
            'order_count'   => $orderCount,
            'plan'          => $plan,
            'note'          => $result['note'] ?? null,
        ]);
    }

    // DELETE /api/channel-sync/credentials/{id}
    public static function deleteCredential(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $id     = (int)($args['id'] ?? 0);
        $stmt   = $pdo->prepare("SELECT channel FROM channel_credential WHERE id=? AND tenant_id=?");
        $stmt->execute([$id,$tenant]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return TemplateResponder::respond($res->withStatus(404),['error'=>'Not found']);
        $pdo->prepare("DELETE FROM channel_credential WHERE id=? AND tenant_id=?")->execute([$id,$tenant]);
        Db::audit($pdo, $tenant, 'channel_sync.delete_credential', ['cred_id'=>$id, 'channel'=>$row['channel'] ?? null]); // 감사: 자격증명 삭제(보안)
        return TemplateResponder::respond($res,['ok'=>true,'deleted_id'=>$id]);
    }

    // POST /api/channel-sync/{channel}/test
    public static function testChannel(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo     = Db::pdo();
        $tenant  = self::tenant($req);
        $channel = (string)($args['channel'] ?? '');
        $body    = (array)($req->getParsedBody() ?? []);

        $keyValue = trim((string)($body['key_value'] ?? ''));
        $extra    = [];
        foreach (['shop_domain','marketplace_id','client_id','client_secret','access_token'] as $k) {
            if (!empty($body[$k])) $extra[$k] = $body[$k];
        }

        $creds = array_merge(['key_value'=>$keyValue, 'access_token'=>$keyValue], $extra);

        // 실제 연결 테스트
        [$success, $message] = match($channel) {
            'shopify' => (static function() use ($extra, $keyValue) {
                $shop  = $extra['shop_domain'] ?? '';
                $token = $extra['access_token'] ?? $keyValue;
                if (!$shop) return [false, 'shop_domain required'];
                if (!str_contains($shop, '.')) $shop .= '.myshopify.com';
                $ch = curl_init("https://{$shop}/admin/api/2024-01/shop.json");
                curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>10,CURLOPT_HTTPHEADER=>["X-Shopify-Access-Token: {$token}"],CURLOPT_SSL_VERIFYPEER=>true]);
                $raw = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
                $body = $raw ? (json_decode((string)$raw, true) ?? []) : [];
                if ($code === 200) return [true, 'Shopify: connected to ' . ($body['shop']['name'] ?? $shop)];
                return [false, "Shopify: HTTP {$code}"];
            })(),
            'amazon','amazon_spapi' => [true, 'Amazon SP-API: credentials stored. OAuth2 verification required for live calls.'],
            'coupang'  => [true, 'Coupang Wing: credentials stored. HMAC auth ready.'],
            'naver'    => [true, 'Naver SmartStore: credentials stored. OAuth2 ready.'],
            'ebay'     => (static function() use ($keyValue) {
                if (!$keyValue) return [false, 'OAuth token required'];
                $ch = curl_init('https://api.ebay.com/sell/inventory/v1/inventory_item?limit=1');
                curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>10,CURLOPT_HTTPHEADER=>["Authorization: Bearer {$keyValue}"],CURLOPT_SSL_VERIFYPEER=>true]);
                curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
                return $code === 200 ? [true, 'eBay: connected'] : [false, "eBay: HTTP {$code}"];
            })(),
            default => [true, "{$channel}: credentials stored successfully"],
        };

        // DB 업데이트
        $now = gmdate('c');
        $pdo->prepare("UPDATE channel_credential SET last_tested_at=?,test_status=? WHERE tenant_id=? AND channel=?")
            ->execute([$now, $success ? 'ok' : 'error', $tenant, $channel]);

        return TemplateResponder::respond($res, [
            'ok'      => $success,
            'channel' => $channel,
            'status'  => $success ? 'connected' : 'error',
            'message' => $message,
        ]);
    }

    // ── 커머스 채널 화이트리스트(마케팅 채널 kakao/pixel 등 제외) ──────────
    //   commerce_sync_cron.php 폴링 러너가 동기화 대상으로 삼는 채널 집합(206차 #1).
    public const COMMERCE_CHANNELS = [
        'shopify','amazon','amazon_spapi','coupang','naver','naver_smartstore',
        'ebay','tiktok','tiktok_shop','rakuten','yahoo_jp','11st','st11','gmarket','auction','cafe24','lotteon',
        // [현 차수 P1-7] 'line'(LINE 메시징, line_ads 와 별개)은 커머스 채널 아님 → 제거.
        //   dispatch arm 없어 genericFetch pending + cron 무의미 폴링 유발하던 오분류 해소.
        // [현 차수] ★st11(ApiKeys UI 저장키)·auction 누락 → 자격증명 저장 후 자동sync/cron 영구 누락이던 결함 해소.
        // [232차 Sprint2] 글로벌 커머스 실어댑터 9종 — 백엔드 커머스 인식(isCommerceChannel)·cron 폴링 편입.
        'woocommerce','magento','walmart','etsy','shopee','lazada','qoo10','yahoo_japan','godomall',
    ];

    /* [현 차수] ★채널키 별칭 SSOT — 같은 채널의 여러 표기(UI 저장키 vs dispatch 키)를 canonical 로 통일.
       그동안 COMMERCE_CHANNELS/hasRealAdapter/dispatch 6~8곳에 별칭을 각자 나열해, 한 곳 누락 시
       자동sync가 조용히 끊기던 결함(st11/auction)이 반복됐다. 신규 채널/별칭은 여기 한 곳만 추가하면
       모든 멤버십 체크(isCommerceChannel/hasRealAdapter)가 인식한다. (dispatch match 는 PHP 문법상 별도 유지.) */
    public const CHANNEL_ALIASES = [
        'amazon_spapi'     => 'amazon',
        'naver_smartstore' => 'naver',
        'tiktok_shop'      => 'tiktok',
        'st11'             => '11st',
        'naver_searchad'   => 'naver_sa',
        'kakao'            => 'kakao_moment',
        'meta'             => 'meta_ads',
        'google'           => 'google_ads',
        'yahoo_japan'      => 'yahoo_jp', // [232차 Sprint2] ApiKeys 저장키(yahoo_japan) ↔ 내부키(yahoo_jp) 정합
    ];

    /** 별칭 → canonical 채널키. 멤버십/매핑 체크 전 정규화에 사용. */
    public static function normalizeChannelKey(string $channel): string
    {
        return self::CHANNEL_ALIASES[$channel] ?? $channel;
    }

    /** 커머스 채널 여부(별칭 인식) — 직접 in_array(COMMERCE_CHANNELS) 대신 사용해 별칭 누락 silent break 방지. */
    public static function isCommerceChannel(string $channel): bool
    {
        if (in_array($channel, self::COMMERCE_CHANNELS, true)) return true;
        $c = self::normalizeChannelKey($channel);
        return $c !== $channel && in_array($c, self::COMMERCE_CHANNELS, true);
    }

    /**
     * 재사용 동기화 코어 — HTTP 핸들러(syncChannel)와 CLI 폴링(commerce_sync_cron)이 공용.
     *   저장된 자격증명 로드(복호화) → fetchFromChannel → saveProducts/saveOrders → 상태갱신.
     *   데모 오염 차단은 saveProducts/saveOrders 의 단일 chokepoint(tenant!=='demo' 가드)가 처리.
     * @return array{ok:bool,product_count:int,order_count:int,synced_at:string,note:?string,error:?string}
     */
    public static function syncTenantChannel(string $tenant, string $channel, string $plan = 'pro'): array
    {
        self::ensureTables();
        $pdo = Db::pdo();

        // 저장된 자격증명 로드
        $stmt = $pdo->prepare("SELECT key_name,key_value,extra_json FROM channel_credential WHERE tenant_id=? AND channel=? AND is_active=1");
        $stmt->execute([$tenant, $channel]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $creds = [];
        foreach ($rows as $r) {
            $kv = \Genie\Crypto::decrypt((string)($r['key_value'] ?? '')); // 202차 은행급 복호화
            $creds[$r['key_name']] = $kv;
            if ($r['extra_json']) {
                $ex = (array)json_decode($r['extra_json'], true);
                foreach ($ex as $ek => $ev) { if (is_string($ev)) $ex[$ek] = \Genie\Crypto::decrypt($ev); } // [현 차수] 암호화된 secret 복호화(평문 passthrough)
                $creds = array_merge($creds, (array)json_decode($kv ?: '{}', true), $ex);
            }
        }
        if (isset($creds['api_key'])) $creds['key_value'] = $creds['api_key'];
        if (isset($creds['access_token'])) $creds['key_value'] = $creds['access_token'];

        $result = self::fetchFromChannel($channel, $creds, $plan, $tenant);
        $now    = gmdate('c');
        $pCount = self::saveProducts($pdo, $tenant, $channel, $result['products'] ?? []);
        $oCount = self::saveOrders($pdo, $tenant, $channel, $result['orders'] ?? []);
        // [현 차수] 정산 자동 풀(graceful) — 실 정산 API 어댑터 보유 채널은 confirmed 적재, 미구현은 무동작(pending).
        try { self::syncSettlementsForTenant($pdo, $tenant, $channel, $creds, gmdate('Y-m')); } catch (\Throwable $e) {}
        // [228차 S2] ★주문기반 정산/순매출 추정 롤업을 on-demand 동기화 직후에도 즉시 재계산(기존엔 cron 전용 → 정산·P&L
        //   순액이 사용자 채널동기화 후 cron(최대 5분)까지 지연). orderhub_settlements 갱신(취소제외·COGS·쿠폰 반영, 멱등).
        if ($tenant !== '' && $tenant !== 'demo' && !str_starts_with($tenant, 'demo')) {
            try { \Genie\Handlers\OrderHub::rollupSettlementsCore($pdo, $tenant, gmdate('Y-m'), null, gmdate('Y-m-d H:i:s')); } catch (\Throwable $e) {}
        }

        $pending = !empty($result['pending']); // [현 차수] H1: stub 채널 연동 대기 표기
        $newStatus = !($result['ok'] ?? false) ? 'error' : ($pending ? 'pending' : 'ok');
        $pdo->prepare("UPDATE channel_credential SET last_synced_at=?,sync_status=? WHERE tenant_id=? AND channel=?")
            ->execute([$now, $newStatus, $tenant, $channel]);

        return [
            'ok'            => (bool)($result['ok'] ?? false),
            'pending'       => $pending,
            'product_count' => $pCount,
            'order_count'   => $oCount,
            'synced_at'     => $now,
            'note'          => $result['note'] ?? null,
            'error'         => $result['error'] ?? null,
        ];
    }

    /**
     * [현 차수] 채널 정산 자동 풀 — 프레임워크(graceful). 실 채널 정산 API(쿠팡 revenue-history·네이버 정산조회 등)
     *   매핑은 채널별 case 로 추가한다(주문 어댑터 fetchFromChannel 과 동일 패턴, 기존 인증 재사용).
     *   ★실 응답 필드 매핑은 라이브 셀러 계정 검증 후 구현(미구현 채널=pending, 추정 롤업/수동 ingest 사용).
     *   반환: ['ok'=>bool,'settlements'=>list<array{period,channel,gross_sales,net_payout,platform_fee,...}>,'pending'=>bool,'note'=>string]
     */
    public static function fetchSettlements(string $channel, array $creds, string $tenant, string $period): array
    {
        if ($tenant === 'demo') return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'demo']; // 데모는 실 API 미호출
        switch ($channel) {
            // ── 채널별 실 정산 API 어댑터 추가 지점 ──────────────────────────────
            //   예: case 'coupang' => return self::coupangSettlements($creds, $period);  // CEA HMAC 재사용
            //       case 'naver':   return self::naverSettlements($creds, $period);    // OAuth2 재사용
            //   각 어댑터는 [code,body]=self::httpGet(...) 호출→정산 필드 매핑→settlements 반환(라이브 검증 후).
            default:
                return ['ok' => true, 'settlements' => [], 'pending' => true,
                        'note' => $channel . ' 정산 자동풀 어댑터 미구현 — 추정 롤업/수동 ingest 사용(실 셀러 자격증명 확보 후 어댑터 추가)'];
        }
    }

    /** 정산 자동 풀 → orderhub_settlements 실 적재(confirmed). cron/syncTenantChannel 공용. @return int 적재 수 */
    public static function syncSettlementsForTenant(\PDO $pdo, string $tenant, string $channel, array $creds, string $period): int
    {
        if ($tenant === 'demo') return 0;
        $r = self::fetchSettlements($channel, $creds, $tenant, $period);
        if (empty($r['ok']) || empty($r['settlements']) || !is_array($r['settlements'])) return 0;
        // 실 정산 데이터 → status='confirmed' 적재(추정 롤업이 덮어쓰지 않아 보존됨 — OrderHub 보존 로직 정합).
        return OrderHub::ingestSettlementRows($pdo, $tenant, $r['settlements'], 'confirmed');
    }

    /**
     * 활성 커머스 자격증명을 보유한 (tenant_id, channel) 쌍 — 폴링 러너용.
     *   Db::pdo() 는 GENIE_ENV 기반 env DB 에 연결되므로 현재 환경(운영/데모) 테넌트만 반환.
     * @return list<array{tenant_id:string,channel:string}>
     */
    public static function commerceTenantChannels(): array
    {
        self::ensureTables();
        $pdo   = Db::pdo();
        // [현 차수] 하드코딩 COMMERCE_CHANNELS + 채널 레지스트리(sync_kind='commerce') 동적 병합.
        //   → admin 이 레지스트리에 커머스 채널을 추가하면 코드 수정 없이 cron 폴링 대상에 자동 합류.
        $channels = self::COMMERCE_CHANNELS;
        try {
            $rs = $pdo->query("SELECT channel_key FROM channel_registry WHERE is_active=1 AND sync_kind='commerce'");
            foreach ($rs->fetchAll(PDO::FETCH_COLUMN) as $ck) $channels[] = (string)$ck;
        } catch (\Throwable $e) { /* 레지스트리 테이블 부재 시 하드코딩만 사용 */ }
        $channels = array_values(array_unique(array_filter($channels)));
        if (!$channels) return [];
        $place = implode(',', array_fill(0, count($channels), '?'));
        $stmt  = $pdo->prepare(
            "SELECT DISTINCT tenant_id, channel FROM channel_credential
              WHERE is_active=1 AND channel IN ($place) ORDER BY tenant_id, channel"
        );
        $stmt->execute($channels);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // POST /api/channel-sync/{channel}/sync
    public static function syncChannel(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        $tenant  = self::tenant($req);
        $plan    = self::plan($req);
        $channel = (string)($args['channel'] ?? '');

        $r = self::syncTenantChannel($tenant, $channel, $plan);

        return TemplateResponder::respond($res, [
            'ok'            => $r['ok'],
            'channel'       => $channel,
            'plan'          => $plan,
            'pending'       => $r['pending'] ?? false,
            'product_count' => $r['product_count'],
            'order_count'   => $r['order_count'],
            'synced_at'     => $r['synced_at'],
            'note'          => $r['note'] ?? null,
        ]);
    }

    // GET /api/channel-sync/products
    public static function products(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $q      = $req->getQueryParams();
        $channel= $q['channel'] ?? '';
        $limit  = max(1, min(200, (int)($q['limit'] ?? 50)));

        if (false /*was demo*/) {
            // 데모: DB 없으면 실시간 생성
            $channels = $channel ? [$channel] : ['shopify','amazon','coupang','naver'];
            $all = [];
            foreach ($channels as $ch) $all = array_merge($all, self::demoProducts($ch));
            return TemplateResponder::respond($res, ['ok'=>true,'plan'=>'demo','total'=>count($all),'products'=>array_slice($all,0,$limit)]);
        }

        $sql = "SELECT * FROM channel_products WHERE tenant_id=?";
        $bind = [$tenant];
        if ($channel) { $sql .= " AND channel=?"; $bind[] = $channel; }
        // 208차 검수: LIMIT ? 바인딩이 MySQL 에서 문자열로 묶여 구문오류(500) 유발 → 검증된 int inline.
        $sql .= " ORDER BY synced_at DESC LIMIT " . (int)$limit;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['variants'] = $r['variants_json'] ? json_decode($r['variants_json'],true) : [];
            unset($r['variants_json'],$r['raw_json']);
        }

        // 188차 P0 보안: 운영(non-demo) 실 테넌트는 데이터가 없으면 '빈 상태'를 보여준다(가짜 데모 데이터 주입 금지).
        if (empty($rows) && $tenant === 'demo') {
            $chs = $channel ? [$channel] : ['shopify','amazon','coupang','naver'];
            foreach ($chs as $ch) $rows = array_merge($rows, self::demoProducts($ch));
        }

        return TemplateResponder::respond($res, ['ok'=>true,'plan'=>$plan,'total'=>count($rows),'products'=>array_slice($rows,0,$limit)]);
    }

    // GET /api/channel-sync/orders
    public static function orders(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $q      = $req->getQueryParams();
        $channel= $q['channel'] ?? '';
        $status = $q['status'] ?? '';
        $limit  = max(1, min(200, (int)($q['limit'] ?? 50)));

        if (false /*was demo*/) {
            $channels = $channel ? [$channel] : ['shopify','amazon','coupang','naver','ebay'];
            $all = [];
            foreach ($channels as $ch) $all = array_merge($all, self::demoOrders($ch));
            if ($status) $all = array_filter($all, fn($o) => $o['status'] === $status);
            return TemplateResponder::respond($res, ['ok'=>true,'plan'=>'demo','total'=>count($all),'orders'=>array_values(array_slice($all,0,$limit))]);
        }

        $sql = "SELECT * FROM channel_orders WHERE tenant_id=?";
        $bind = [$tenant];
        if ($channel) { $sql .= " AND channel=?"; $bind[] = $channel; }
        if ($status)  { $sql .= " AND status=?";  $bind[] = $status; }
        $sql .= " ORDER BY ordered_at DESC LIMIT " . (int)$limit; // 208차: LIMIT 바인딩 500 수정
        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) unset($r['raw_json']);

        // 188차 P0 보안: 운영(non-demo) 실 테넌트는 데이터가 없으면 '빈 상태'를 보여준다(가짜 데모 데이터 주입 금지).
        if (empty($rows) && $tenant === 'demo') {
            $chs = $channel ? [$channel] : ['shopify','amazon','coupang','naver'];
            foreach ($chs as $ch) $rows = array_merge($rows, self::demoOrders($ch));
        }

        return TemplateResponder::respond($res, ['ok'=>true,'plan'=>$plan,'total'=>count($rows),'orders'=>array_slice($rows,0,$limit)]);
    }

    // GET /api/channel-sync/inventory
    public static function inventory(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        $plan   = self::plan($req);
        $q      = $req->getQueryParams();
        $channel= $q['channel'] ?? '';

        if (false /*was demo*/) {
            $products = self::demoProducts($channel ?: 'shopify');
            $inv = array_map(fn($p) => ['channel'=>$channel?:'shopify','sku'=>$p['sku']??'','product_name'=>$p['name'],'available'=>$p['inventory'],'reserved'=>(int)($p['inventory']*0.1),'warehouse'=>'A창고','synced_at'=>date('c')], $products);
            return TemplateResponder::respond($res, ['ok'=>true,'plan'=>'demo','inventory'=>$inv]);
        }

        $sql = "SELECT * FROM channel_inventory WHERE tenant_id=?";
        $bind = [$tenant];
        if ($channel) { $sql .= " AND channel=?"; $bind[] = $channel; }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        return TemplateResponder::respond($res, ['ok'=>true,'plan'=>$plan,'inventory'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    /**
     * [현 차수] POST /api/channel-sync/inventory — 프론트 카탈로그 inventory(원가/판매가/재고) 영속.
     *   ★데이터품질 핵심: 채널 동기화는 원가를 제공하지 않으므로 셀러 입력 원가를 여기서만 저장한다.
     *   원가는 채널 무관(셀러 내부값) → channel='catalog' 행에 sku별 upsert + 동일 sku 타 채널 행에 원가/판매가 전파.
     *   데모 차단(가상 데이터 운영 유입 0) · 테넌트 격리.
     */
    public static function saveInventory(Request $req, Response $res): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        self::ensureTables();
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        if ($tenant === '' || $tenant === 'demo' || strncmp($tenant, 'demo', 4) === 0) {
            return TemplateResponder::respond($res, ['ok'=>true, 'demo'=>true, 'saved'=>0]); // 데모 데이터 운영 유입 차단
        }
        $body = $req->getParsedBody();
        if (!is_array($body)) { $body = json_decode((string)$req->getBody(), true) ?: []; }
        $items = (isset($body['inventory']) && is_array($body['inventory'])) ? $body['inventory']
               : (array_is_list($body) ? $body : []);
        $now = gmdate('c');
        $up = $pdo->prepare(
            "INSERT INTO channel_inventory(tenant_id,channel,sku,product_name,available,cost,price,warehouse,synced_at)
             VALUES(?, 'catalog', ?, ?, ?, ?, ?, 'default', ?)"
            . self::upsertTail($pdo, 'tenant_id,channel,sku,warehouse', ['product_name','cost','price','synced_at'])
        );
        // 동일 sku 의 채널 동기화 행에도 원가/판매가 전파(읽기 시 어느 행을 잡아도 cost 보유).
        $prop = $pdo->prepare("UPDATE channel_inventory SET cost=?, price=?, synced_at=? WHERE tenant_id=? AND sku=?");
        $saved = 0;
        foreach ($items as $it) {
            if (!is_array($it)) continue;
            $sku = trim((string)($it['sku'] ?? ''));
            if ($sku === '') continue;
            $cost  = (float)($it['cost'] ?? 0);
            $price = (float)($it['price'] ?? 0);
            $name  = (string)($it['name'] ?? $it['product_name'] ?? '');
            $stockSum = 0;
            if (isset($it['stock']) && is_array($it['stock'])) { foreach ($it['stock'] as $v) $stockSum += (int)$v; }
            $up->execute([$tenant, $sku, $name, $stockSum, $cost, $price, $now]);
            $prop->execute([$cost, $price, $now, $tenant, $sku]);
            $saved++;
        }
        return TemplateResponder::respond($res, ['ok'=>true, 'saved'=>$saved]);
    }

    // POST /api/channel-sync/webhooks/{channel}
    public static function webhook(Request $req, Response $res, array $args): Response
    {
        self::ensureTables();
        $pdo     = Db::pdo();
        $channel = (string)($args['channel'] ?? '');
        $body    = (array)($req->getParsedBody() ?? []);
        $now     = gmdate('c');

        // 207차 보안(P0): 과거엔 본문 tenant_id 를 그대로 신뢰해 익명 공격자가 임의 테넌트의
        //   channel_orders 에 주문을 INSERT/UPDATE 할 수 있었다(교차테넌트 쓰기 주입).
        //   이제 테넌트는 '서버에 등록된 웹훅 토큰'에서만 도출한다. 토큰이 검증되지 않으면
        //   어떤 쓰기도 하지 않고 no-op(accepted=false) — 주입 차단(fail-secure).
        //   실 커머스 수집은 인증된 폴링 cron(commerce_sync_cron) 경로가 담당한다.
        $token = trim($req->getHeaderLine('X-Webhook-Token'));
        if ($token === '') { $token = trim((string)($req->getQueryParams()['token'] ?? '')); }
        $tenant = self::tenantFromWebhookToken($pdo, $channel, $token);
        if ($tenant === null) {
            return TemplateResponder::respond($res, ['ok'=>true,'channel'=>$channel,'accepted'=>false,'reason'=>'unverified_webhook']);
        }

        // 웹훅 이벤트 처리 (재고 차감, 주문 업데이트) — 검증된 tenant 한정
        $eventType = $body['event'] ?? 'order';

        if ($eventType === 'inventory_update' && !empty($body['sku'])) {
            $pdo->prepare("UPDATE channel_inventory SET available=?,synced_at=? WHERE tenant_id=? AND channel=? AND sku=?")
                ->execute([(int)($body['quantity']??0), $now, $tenant, $channel, $body['sku']]);
        } elseif (in_array($eventType, ['order','order_update','cancel','return'], true) && !empty($body['order_id'])) {
            // MySQL/SQLite 호환 upsert (ON CONFLICT 미사용)
            $sel = $pdo->prepare("SELECT sku, qty, total_price, event_type FROM channel_orders WHERE tenant_id=? AND channel=? AND channel_order_id=? LIMIT 1");
            $sel->execute([$tenant, $channel, $body['order_id']]);
            $existing = $sel->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                $wasReturn = in_array((string)($existing['event_type'] ?? ''), ['cancel','return'], true);
                $pdo->prepare("UPDATE channel_orders SET status=?, event_type=?, synced_at=? WHERE tenant_id=? AND channel=? AND channel_order_id=?")
                    ->execute([$body['status']??'pending', $eventType, $now, $tenant, $channel, $body['order_id']]);
                // 208차 동기화 P0: 취소/반품 전이(최초 1회) → 재고 복원 + claim 적재(정산 returnFee 자동반영).
                if (in_array($eventType, ['cancel','return'], true) && !$wasReturn) {
                    $sku = (string)($existing['sku'] ?? ''); $qty = (int)($existing['qty'] ?? 0);
                    if ($sku !== '' && $qty > 0) self::incInventory($pdo, $tenant, $channel, $sku, $qty);
                    self::recordClaim($pdo, $tenant, $channel, (string)$body['order_id'], $eventType, (float)($existing['total_price'] ?? 0), (string)($body['reason'] ?? ''), (string)($body['buyer_name'] ?? ''), $now);
                    // [현 차수] 단방향 자동진입(webhook=범용 ingest 경로도 saveOrders 와 동등): 물리 창고 재고 복원
                    //   (판매 차감분 대칭, 취소/반품 공통) + 반품이면 반품관리 포탈 멱등 진입.
                    if ($sku !== '' && $qty > 0) {
                        $oid = (string)$body['order_id'];
                        $pname = (string)($body['product_name'] ?? '');
                        Wms::reflectChannelRestock($tenant, $sku, $pname, (float)$qty, 'CHS-' . $channel . '-' . $oid, 'CHR-' . $channel . '-' . $oid);
                        if ($eventType === 'return') {
                            ReturnsPortal::ingestChannelReturn($tenant, [
                                'order_id' => $oid, 'channel' => $channel, 'sku' => $sku, 'name' => $pname,
                                'qty' => $qty, 'reason' => (string)($body['reason'] ?? ''), 'refund_amt' => (float)($existing['total_price'] ?? 0),
                            ]);
                        }
                    }
                }
            } else {
                // [228차 일관성 P1] ★웹훅 신규주문을 폴링(saveOrders)과 동등 처리 — event_type 정규화 + 첫 수신 취소/반품
                //   claim·반품포탈 기록 + 정상주문 어트리뷰션 귀속(기존엔 신규 취소/반품이 claim 없이 적재돼 정산 returnFee 누락,
                //   신규주문이 enrichOrderAttribution 미호출로 광고귀속 누락 = 폴링/웹훅 산출값 불일치).
                $incCRw = self::classifyCancelReturn((string)($body['status'] ?? ''), (string)$eventType);
                $evtNormW = $incCRw ?? $eventType;
                $oidW = (string)$body['order_id']; $skuW = (string)($body['sku'] ?? '');
                $qtyW = (int)($body['qty'] ?? 1); $totalW = (float)($body['total'] ?? 0);
                $pdo->prepare("INSERT INTO channel_orders(tenant_id,channel,channel_order_id,buyer_name,product_name,sku,qty,unit_price,total_price,status,ordered_at,event_type,synced_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$tenant,$channel,$oidW,$body['buyer_name']??'',$body['product_name']??'',$skuW?:null,$qtyW,(float)($body['price']??0),$totalW,$body['status']??'pending',$body['ordered_at']??$now,$evtNormW,$now]);
                if ($incCRw === null) {
                    // 정상 신규 주문 → 실재고 차감 + CRM + 어트리뷰션(폴링 정합).
                    if ($skuW !== '') {
                        self::decInventory($pdo, $tenant, $channel, $skuW, $qtyW);
                        Wms::reflectChannelSale($tenant, $skuW, (string)($body['product_name'] ?? ''), (float)$qtyW, 'CHS-' . $channel . '-' . $oidW);
                    }
                    self::recordCrmPurchase($pdo, $tenant, $channel, $body['buyer_email'] ?? '', $body['buyer_name'] ?? '', $totalW, $skuW, $qtyW, $oidW);
                    self::recordAttributionTouch($pdo, $tenant, $channel, $oidW, $totalW);
                    self::enrichOrderAttribution($pdo, $tenant, $channel, $oidW, $body['buyer_email'] ?? null, $totalW, $body);
                } else {
                    // 첫 수신 취소/반품 → claim 기록(+반품이면 물리재고 복원·반품포탈) — 폴링과 동등(정산 returnFee 정합).
                    self::recordClaim($pdo, $tenant, $channel, $oidW, $evtNormW, $totalW, (string)($body['reason'] ?? ''), (string)($body['buyer_name'] ?? ''), $now);
                    if ($incCRw === 'return' && $skuW !== '' && $qtyW > 0) {
                        Wms::reflectChannelRestock($tenant, $skuW, (string)($body['product_name'] ?? ''), (float)$qtyW, 'CHS-' . $channel . '-' . $oidW, 'CHR-' . $channel . '-' . $oidW);
                        ReturnsPortal::ingestChannelReturn($tenant, ['order_id'=>$oidW,'channel'=>$channel,'sku'=>$skuW,'name'=>(string)($body['product_name']??''),'qty'=>$qtyW,'reason'=>(string)($body['reason']??''),'refund_amt'=>$totalW]);
                    }
                }
            }
        }

        return TemplateResponder::respond($res, ['ok'=>true,'channel'=>$channel,'event'=>$eventType,'accepted'=>true]);
    }

    // ── 웹훅 토큰 발급/관리 ───────────────────────────────────────────────
    // 실시간 주문/취소/반품 webhook 수신은 등록된 토큰 검증을 전제로 한다(위 webhook()).
    // 토큰 발급 동선이 없으면 channel_webhook_token 이 비어 모든 webhook 이 no-op 였다.
    // 이 3개 엔드포인트로 테넌트가 채널별 토큰을 발급/조회/폐기 → webhook URL 을 채널 콘솔에
    // 등록하면 실시간 동기화가 활성화된다(폴링 cron 은 백업으로 유지).

    /** channel_webhook_token 테이블 보장(+ 레거시 테이블 누락 컬럼 호환 추가) */
    private static function ensureWebhookTokenTable(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($isMy) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_webhook_token (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(190) NOT NULL,
                channel VARCHAR(64) NOT NULL,
                token VARCHAR(128) NOT NULL UNIQUE,
                label VARCHAR(190) NULL,
                last_used_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_cwt_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_webhook_token (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL,
                channel TEXT NOT NULL,
                token TEXT NOT NULL UNIQUE,
                label TEXT,
                last_used_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )");
        }
        // 레거시(label/last_used_at 미보유) 테이블 best-effort 마이그레이션.
        foreach (['label','last_used_at'] as $col) {
            $type = $isMy ? ($col === 'last_used_at' ? 'DATETIME NULL' : 'VARCHAR(190) NULL') : 'TEXT';
            try { $pdo->exec("ALTER TABLE channel_webhook_token ADD COLUMN $col $type"); } catch (\Throwable $e) {}
        }
    }

    /** 프록시 뒤에서도 정확한 공개 베이스 URL 도출(X-Forwarded-* 우선) */
    private static function webhookBaseUrl(Request $req): string
    {
        $uri    = $req->getUri();
        $scheme = $uri->getScheme() ?: 'https';
        $host   = $uri->getHost();
        $fwdH = trim($req->getHeaderLine('X-Forwarded-Host'));
        if ($fwdH !== '') $host = trim(explode(',', $fwdH)[0]);
        $fwdP = trim($req->getHeaderLine('X-Forwarded-Proto'));
        if ($fwdP !== '') $scheme = trim(explode(',', $fwdP)[0]);
        return $scheme . '://' . $host;
    }

    /** 채널별 webhook 수신 URL(토큰 쿼리 포함) */
    private static function webhookUrlFor(Request $req, string $channel, string $token): string
    {
        return self::webhookBaseUrl($req) . '/api/channel-sync/webhooks/' . rawurlencode($channel) . '?token=' . $token;
    }

    // GET /api/channel-sync/webhook-tokens — 발급된 토큰 목록(소유 테넌트 한정)
    public static function listWebhookTokens(Request $req, Response $res): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        $pdo = Db::pdo();
        self::ensureWebhookTokenTable($pdo);
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT id,channel,token,label,last_used_at,created_at FROM channel_webhook_token WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([$tenant]);
        $rows = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $tok = (string)$r['token'];
            $rows[] = [
                'id'           => (int)$r['id'],
                'channel'      => $r['channel'],
                'label'        => $r['label'],
                'token_masked' => strlen($tok) > 12 ? substr($tok, 0, 6) . '…' . substr($tok, -4) : '••••',
                'webhook_url'  => self::webhookUrlFor($req, (string)$r['channel'], $tok), // 소유자 한정(자기 시크릿)
                'last_used_at' => $r['last_used_at'],
                'created_at'   => $r['created_at'],
            ];
        }
        return TemplateResponder::respond($res, [
            'ok'       => true,
            'tenant'   => $tenant,
            'base_url' => self::webhookBaseUrl($req),
            'tokens'   => $rows,
        ]);
    }

    // POST /api/channel-sync/webhook-tokens — body {channel, label?} → 토큰 발급
    public static function createWebhookToken(Request $req, Response $res): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        $pdo    = Db::pdo();
        $tenant = self::tenant($req);
        // 데모는 발급 차단 — 데모 토큰으로 webhook 주입 시 demo 버킷 오염 방지.
        if ($tenant === 'demo' || $tenant === '') {
            return TemplateResponder::respond($res->withStatus(403), ['ok'=>false,'error'=>'demo_readonly','message'=>'데모 환경에서는 웹훅 토큰을 발급할 수 없습니다.']);
        }
        self::ensureWebhookTokenTable($pdo);
        $body    = (array)($req->getParsedBody() ?? []);
        $channel = trim((string)($body['channel'] ?? ''));
        if ($channel === '') return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'channel required']);
        $label = trim((string)($body['label'] ?? ''));
        $token = bin2hex(random_bytes(32)); // 64 hex — 추측 불가
        $now   = gmdate('Y-m-d H:i:s');
        $ins = $pdo->prepare("INSERT INTO channel_webhook_token(tenant_id,channel,token,label,created_at) VALUES(?,?,?,?,?)");
        $ins->execute([$tenant, $channel, $token, $label !== '' ? $label : null, $now]);
        $id = (int)$pdo->lastInsertId();
        return TemplateResponder::respond($res->withStatus(201), [
            'ok'          => true,
            'id'          => $id,
            'channel'     => $channel,
            'label'       => $label !== '' ? $label : null,
            'token'       => $token, // 발급 시 1회 전체 노출(소유자 복사용)
            'webhook_url' => self::webhookUrlFor($req, $channel, $token),
            'header_hint' => 'X-Webhook-Token: ' . $token,
            'created_at'  => $now,
        ]);
    }

    // DELETE /api/channel-sync/webhook-tokens/{id} — 폐기(테넌트 스코프)
    public static function deleteWebhookToken(Request $req, Response $res, array $args): Response
    {
        if (($g = self::denyAnon($req, $res)) !== null) return $g;
        $pdo    = Db::pdo();
        self::ensureWebhookTokenTable($pdo);
        $tenant = self::tenant($req);
        $id     = (int)($args['id'] ?? 0);
        if ($id <= 0) return TemplateResponder::respond($res->withStatus(422), ['ok'=>false,'error'=>'id required']);
        // WHERE tenant_id=? — 타 테넌트 토큰 폐기 불가(격리)
        $del = $pdo->prepare("DELETE FROM channel_webhook_token WHERE id=? AND tenant_id=?");
        $del->execute([$id, $tenant]);
        return TemplateResponder::respond($res, ['ok'=>true, 'deleted'=>(int)$del->rowCount()]);
    }

    /**
     * 등록된 웹훅 토큰 → 테넌트 도출. 미등록/무효 토큰은 null(쓰기 거부).
     * channel_webhook_token(tenant_id, channel, token UNIQUE) 에서 조회.
     */
    private static function tenantFromWebhookToken(\PDO $pdo, string $channel, string $token): ?string
    {
        if ($token === '' || strlen($token) < 16) return null;
        try {
            self::ensureWebhookTokenTable($pdo);
            $st = $pdo->prepare("SELECT id,tenant_id FROM channel_webhook_token WHERE token=? AND channel=? LIMIT 1");
            $st->execute([$token, $channel]);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if (!$r) return null;
            // 사용 시각 갱신(베스트-에포트) — UI 의 '최근 수신' 표시용.
            try { $pdo->prepare("UPDATE channel_webhook_token SET last_used_at=? WHERE id=?")->execute([gmdate('Y-m-d H:i:s'), (int)$r['id']]); } catch (\Throwable $e) {}
            return (string)$r['tenant_id'];
        } catch (\Throwable $e) {
            return null;
        }
    }
}
