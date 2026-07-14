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

    /**
     * [276차] 네이버 커머스 API 전자서명 — bcrypt(정본). 애플리케이션 시크릿은 그 자체가 bcrypt salt($2a$...)다.
     *   서명 = base64( bcrypt("{애플리케이션ID}_{timestamp(ms)}", salt=애플리케이션시크릿) ).
     *   ★기존 hash_hmac('sha256',...) 은 네이버 정책과 불일치 → 토큰발급 400/"유효하지 않은 데이터". 5곳 공통사용.
     *   시크릿이 bcrypt salt 형식이 아니면 crypt() 가 짧은 문자열을 반환(호출부가 토큰발급 실패로 자연 처리).
     */
    private static function naverSign(string $clientId, string $clientSecret, int $timestamp): string
    {
        return base64_encode(crypt("{$clientId}_{$timestamp}", $clientSecret));
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
        // [277차] 카탈로그 수집이 이미지·상세페이지를 저장할 곳이 없었다(image_url 은 있으나 saveProducts 가
        //   INSERT 목록에서 누락, 상세HTML·추가이미지는 컬럼 자체가 부재). 멱등 ALTER 로 보강 — 이미 존재 시 예외무시.
        //   origin_product_id: 네이버는 수정(PUT)에 originProductNo 를 쓰는데 channel_product_id 는 channelProductNo(다른 번호)다.
        //   이 값이 없으면 기존 상품 정보 변경이 불가능하다(항상 신규등록으로 시도 → 400/중복).
        foreach (['detail_html TEXT', 'images_json TEXT', 'origin_product_id TEXT'] as $col) {
            try { $pdo->exec("ALTER TABLE channel_products ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
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

        // [276차] 대량 카탈로그 백그라운드 수집 잡 — 온디맨드 동기화가 첫 N페이지만 즉시 반영하고,
        //   나머지 페이지를 commerce_sync_cron(::processCatalogJobs)이 나눠 수집·완료 시 알림.
        $exec("CREATE TABLE IF NOT EXISTS catalog_sync_job (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            channel TEXT NOT NULL,
            user_id INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            total_elements INTEGER DEFAULT 0,
            fetched INTEGER DEFAULT 0,
            next_page INTEGER DEFAULT 1,
            page_size INTEGER DEFAULT 100,
            message TEXT,
            created_at TEXT,
            updated_at TEXT,
            UNIQUE(tenant_id, channel)
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
    /**
     * [277차] $coalesceCols — 새 값이 NULL 이면 기존 값을 보존하는 컬럼(이미지·상세HTML 등 '가끔만 채워지는' 필드).
     *   목록수집(대표이미지만)과 상세수집(상세HTML·추가이미지)이 서로 다른 시점에 같은 행을 upsert 하므로,
     *   무조건 excluded.* 로 덮으면 나중 수집이 앞선 수집분을 NULL 로 지운다. $table 은 SQLite 참조용.
     */
    private static function upsertTail(PDO $pdo, string $conflictCols, array $setCols, array $coalesceCols = [], string $table = ''): string
    {
        $isMy = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($isMy) {
            $sets = array_map(static fn($c) => "$c=VALUES($c)", $setCols);
            foreach ($coalesceCols as $c) { $sets[] = "$c=COALESCE(VALUES($c), $c)"; }
            return " ON DUPLICATE KEY UPDATE " . implode(',', $sets);
        }
        $sets = array_map(static fn($c) => "$c=excluded.$c", $setCols);
        foreach ($coalesceCols as $c) { $sets[] = "$c=COALESCE(excluded.$c, {$table}.$c)"; }
        return " ON CONFLICT($conflictCols) DO UPDATE SET " . implode(',', $sets);
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
        [$oCode, $oBody] = self::httpGet("https://{$shop}/admin/api/2024-01/orders.json?limit=50&status=any&fields=id,name,email,customer,line_items,financial_status,fulfillment_status,created_at,cancelled_at,shipping_address,total_price,currency", $headers);

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

                'status'      => self::shopifyOrderStatus($o['financial_status'] ?? '', $o['fulfillment_status'] ?? '', (string)($o['cancelled_at'] ?? '')),
                'addr'        => ($o['shipping_address']['address1'] ?? '') . ' ' . ($o['shipping_address']['city'] ?? ''),
                'ordered_at'  => $o['created_at'] ?? '',
                'event_type'  => 'order',
                'source'      => 'live',
            ];
        }, $oBody['orders'] ?? []);

        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders];
    }

    private static function shopifyOrderStatus(string $fin, string $ful, string $cancelledAt = ''): string
    {
        // [현 차수 감사] 취소(cancelled_at)-but-paid 도 취소로 — financial_status=paid 라도 주문이 취소되면 매출 제외.
        if (trim($cancelledAt) !== '') return '취소완료';
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
                // [현 차수 감사] 상태→event_type 방어매핑(취소 토큰 시 전이). 완전한 취소/반품 수집은 아래 coupangClaims
                //   (returnRequests 별도 폴링)가 담당한다(ordersheets status=ACCEPT 는 취소/반품 미반환).
                'event_type'  => self::classifyCancelReturn((string)($os['status'] ?? ''), '') ?? 'order',
                'source'      => 'coupang_api',
            ];
        }
        // [M6] 상품 수집 — Coupang seller-products(동일 CEA HMAC 서명 재사용). 실패 시 빈배열.
        $products = self::coupangProducts($host, $accessKey, $secretKey, $vendorId);
        // [현 차수] 취소/반품 별도 폴링 — ordersheets(status=ACCEPT)가 미반환하는 취소·반품건을 returnRequests 로 수집.
        //   원 주문과 동일 channel_order_id 의 취소/반품 이벤트 행으로 정규화 → saveOrders 활성→취소/반품 전이
        //   (재고복원·claim·CRM LTV 역분개·정산 재롤업·멱등) 자동 처리. 클레임을 뒤에 배치(전이 순서 보장).
        $claims = self::coupangClaims($host, $accessKey, $secretKey, $vendorId);
        $orders = array_merge($orders, $claims);
        return ['ok'=>true, 'products'=>$products, 'orders'=>$orders, 'note'=>count($orders) . ' Coupang rows (' . count($claims) . ' claims) + ' . count($products) . ' products synced'];
    }

    /**
     * [현 차수] Coupang 취소/반품 수집 — ordersheets(status=ACCEPT)가 미반환하는 취소·반품 클레임을 returnRequests
     *   엔드포인트로 별도 폴링(주문/상품과 동일 CEA HMAC 서명 재사용). 각 클레임을 원 주문과 같은 channel_order_id 의
     *   취소/반품 이벤트 행으로 정규화 → saveOrders 의 활성→취소/반품 전이 로직(재고복원·claim·CRM LTV 역분개·정산
     *   재롤업·멱등)으로 흘려보낸다. 실패/미지원 계정/빈 데이터는 빈배열(비차단). (라이브 검증은 실 벤더 계정 필요.)
     */
    private static function coupangClaims(string $host, string $accessKey, string $secretKey, string $vendorId): array
    {
        $path  = "/v2/providers/openapi/apis/api/v4/vendors/{$vendorId}/returnRequests";
        $from  = gmdate('Y-m-d', time() - 7 * 86400);
        $to    = gmdate('Y-m-d');
        // createdAt 기준 취소/반품 클레임(status=RU: 반품/취소 접수). CEA HMAC = signedDate + method + path + query.
        $query = "createdAtFrom={$from}&createdAtTo={$to}&status=RU&maxPerPage=50";
        $datetime  = gmdate('ymd\THis\Z');
        $signature = hash_hmac('sha256', $datetime . 'GET' . $path . $query, $secretKey);
        $auth = "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$datetime}, signature={$signature}";
        [$code, $body] = self::httpGet($host . $path . '?' . $query, ['Authorization' => $auth, 'Content-Type' => 'application/json;charset=UTF-8']);
        if ($code >= 400) return [];
        $claims = [];
        foreach ((array)($body['data'] ?? []) as $rr) {
            $oid = (string)($rr['orderId'] ?? '');
            if ($oid === '') continue;
            $items = (array)($rr['returnItems'] ?? []);
            $first = $items[0] ?? [];
            $qty = 0;
            foreach ($items as $it) { $qty += (int)($it['purchaseCount'] ?? $it['cancelCount'] ?? 0); }
            // receiptType/returnType: CANCEL(취소)·RETURN(반품)·EXCHANGE(교환→반품 처리). 반품 우선.
            $ctype = strtoupper((string)($rr['receiptType'] ?? $rr['returnType'] ?? 'RETURN'));
            $statusText = ($ctype === 'CANCEL') ? 'cancel' : 'return';
            $claims[] = [
                'channel_order_id' => $oid,
                'buyer_name'  => (string)($rr['requesterName'] ?? ($rr['orderer']['name'] ?? '')),
                'buyer_email' => (string)($rr['orderer']['email'] ?? ''),
                'product_name'=> (string)($first['vendorItemName'] ?? $first['sellerProductName'] ?? ''),
                'sku'         => (string)($first['sellerProductItemId'] ?? $first['vendorItemId'] ?? ''),
                'qty'         => $qty ?: count($items),
                'unit_price'  => 0,
                'total_price' => (float)($rr['refundAmount'] ?? $rr['returnDeliveryCharge'] ?? 0),
                'status'      => $statusText,
                'reason'      => (string)($rr['reason'] ?? $rr['cancelReason'] ?? ($rr['returnReason'] ?? '')),
                'ordered_at'  => (string)($rr['createdAt'] ?? $rr['modifiedAt'] ?? gmdate('c')),
                'event_type'  => self::classifyCancelReturn($statusText, '') ?? $statusText,
                'source'      => 'coupang_api',
            ];
        }
        return $claims;
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
            $sign = self::naverSign($clientId, $clientSecret, $timestamp);
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
                    // [현 차수 감사 P1] 취소/반품 상태 반영 — claimStatus/productOrderStatus 무시하고 '발주확인' 상수면
                    //   취소/반품 네이버 주문이 매출에 잔존. 실 상태 필드(있으면) → classifyCancelReturn 으로 취소/반품 전이.
                    $nvRaw = (string)($o['claimStatus'] ?? ($o['claimType'] ?? '')) ?: (string)($o['productOrderStatus'] ?? ($o['orderStatus'] ?? ''));
                    $nvEvt = self::classifyCancelReturn($nvRaw, '') ?? 'order';
                    $orders[] = [
                        'channel_order_id' => (string)($o['orderId'] ?? $o['orderNo'] ?? uniqid()),
                        'buyer_name'  => $o['buyerName'] ?? '',
                        // [현 차수 감사] sku/buyer_email 매핑 — 누락 시 WMS 재고차감(reflectChannelSale sku 필수)·CRM 구매기록
                        //   (recordCrmPurchase email 필수)이 no-op 이었다. 판매자관리코드 등 방어 매핑(없으면 기존대로 빈값).
                        'buyer_email' => (string)($o['ordererEmail'] ?? ($o['buyerEmail'] ?? '')),
                        'product_name'=> $o['productName'] ?? '',
                        'sku'         => (string)($o['sellerManagementCode'] ?? ($o['sellerProductCode'] ?? ($o['productId'] ?? ($o['merchantProductId'] ?? '')))),
                        'qty'         => (int)($o['quantity'] ?? 1),
                        'unit_price'  => (float)($o['unitPrice'] ?? 0),
                        'total_price' => (float)($o['totalPayAmount'] ?? 0),
                        'status'      => ($nvRaw !== '' ? $nvRaw : '발주확인'),
                        'ordered_at'  => $o['paymentDate'] ?? date('Y-m-d H:i:s'),
                        'event_type'  => $nvEvt,
                        'source'      => 'live',
                    ];
                }
                // [M6/276차] 상품 수집 — 페이지네이션(첫 $cap 페이지 즉시). total_available 로 대량 오버플로 판정
                //   → 상위(syncTenantChannel)가 나머지를 catalog_sync_job 백그라운드로 위임(완료 시 알림).
                if ($tenant === 'demo') {
                    $products = self::buildDemoChannelProducts('naver', '네이버');
                    return ['ok'=>true, 'products'=>$products, 'orders'=>$orders,
                            'total_available'=>count($products), 'total_pages'=>1, 'fetched_pages'=>1, 'page_size'=>max(1, count($products))];
                }
                $cap = 10; $size = 100;
                $first = self::naverProductsPage($token, 1, $size);
                $products = (array)($first['products'] ?? []);
                $totalPages = (int)($first['totalPages'] ?? 1);
                $totalAvail = (int)($first['totalElements'] ?? count($products));
                for ($pg = 2; $pg <= min($totalPages, $cap); $pg++) {
                    $rp = self::naverProductsPage($token, $pg, $size);
                    if ((int)($rp['http'] ?? 0) !== 200) break;
                    $products = array_merge($products, (array)($rp['products'] ?? []));
                }
                return ['ok'=>true, 'products'=>$products, 'orders'=>$orders,
                        'total_available'=>$totalAvail, 'total_pages'=>$totalPages,
                        'fetched_pages'=>min($totalPages, $cap), 'page_size'=>$size];
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

    /**
     * [276차] 네이버 커머스 products/search 한 페이지 조회+매핑.
     *   ★API 응답구조 정정: 상품 상세는 content.channelProducts[0] 에 있다(name/salePrice/discountedPrice/
     *     stockQuantity/statusType). 기존 코드는 존재하지 않는 content.originProduct 를 읽어 이름·가격·재고가
     *     전부 빈값/0 으로 저장 → "동기화 성공인데 상품 없음" 근본원인. sellerManagementCode 는 검색응답에
     *     없어 originProductNo 를 sku 폴백으로 사용.
     *   반환: ['products'=>[], 'totalPages'=>int, 'totalElements'=>int, 'http'=>int]
     */
    private static function naverProductsPage(string $token, int $page, int $size): array
    {
        [$code, $body] = self::httpPost(
            'https://api.commerce.naver.com/external/v1/products/search',
            ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json'],
            json_encode(['productStatusTypes' => ['SALE', 'OUTOFSTOCK', 'SUSPENSION', 'WAIT'], 'page' => $page, 'size' => $size], JSON_UNESCAPED_UNICODE)
        );
        if ($code !== 200) return ['products' => [], 'totalPages' => 0, 'totalElements' => 0, 'http' => $code];
        $products = [];
        foreach ((array)($body['contents'] ?? []) as $c) {
            $cps = (array)($c['channelProducts'] ?? []);
            $cp  = (array)(($cps[0] ?? null) ?: []);
            $pid = (string)($c['originProductNo'] ?? $cp['originProductNo'] ?? '');
            if ($pid === '') continue;
            $products[] = [
                'channel_product_id' => (string)($cp['channelProductNo'] ?? $pid),
                'sku'       => (string)($cp['sellerManagementCode'] ?? $pid), // 검색응답 미포함 → originProductNo 폴백
                'name'      => (string)($cp['name'] ?? ''),
                'price'     => (float)($cp['discountedPrice'] ?? $cp['salePrice'] ?? 0),
                'inventory' => (int)($cp['stockQuantity'] ?? 0),
                'status'    => strtolower((string)($cp['statusType'] ?? 'sale')),
                // [277차] 목록 응답에도 대표이미지가 이미 실려 온다(channelProducts[0].representativeImage.url).
                //   추가 호출 0회인데 종전엔 읽지 않아 버렸다. 상세HTML·추가이미지는 상세 EP 전용 → naverEnrichDetails.
                'image_url' => (string)($cp['representativeImage']['url'] ?? '') ?: null,
                'category'  => (string)($cp['wholeCategoryName'] ?? ''),
                'origin_product_no' => (string)($c['originProductNo'] ?? $pid),
                'source'    => 'live',
            ];
        }
        return [
            'products'      => $products,
            'totalPages'    => (int)($body['totalPages'] ?? 1),
            'totalElements' => (int)($body['totalElements'] ?? count($products)),
            'http'          => 200,
        ];
    }

    /**
     * [277차] 네이버 카테고리 카탈로그 조회 — 신규 상품등록 필수값 `leafCategoryId` 의 유일한 출처.
     *   종전엔 이 API 를 부르는 코드가 없어(부재증명: `external/v1/categories` grep 0건) 사용자가 코드를
     *   손으로 입력할 수밖에 없었고, channel_category_map 이 비어 있으면 모든 신규등록이 거부됐다.
     *   `GET /external/v1/categories` → 5,827건(leaf 5,011건). 실 응답 검증 완료:
     *   `{wholeCategoryName, id, name, last}` — `last=true` 가 리프(등록 가능 카테고리).
     *   @return array<int,array{code:string,name:string,whole:string,leaf:bool}> 실패 시 빈배열
     */
    public static function naverCategoryCatalog(array $creds): array
    {
        $token = self::naverAccessToken($creds);
        if (!$token) return [];
        [$code, $body] = self::httpGet('https://api.commerce.naver.com/external/v1/categories',
            ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json'], 60);
        if ($code !== 200 || !is_array($body)) return [];
        $out = [];
        foreach ($body as $c) {
            $id = (string)($c['id'] ?? '');
            if ($id === '') continue;
            $out[] = [
                'code'  => $id,
                'name'  => (string)($c['name'] ?? ''),
                'whole' => (string)($c['wholeCategoryName'] ?? ''),
                'leaf'  => !empty($c['last']),
            ];
        }
        return $out;
    }

    /**
     * [현 차수] 11번가 전체 카테고리 카탈로그 — 공통(Seller) Open API. **인증키 불필요**.
     *   GET http://api.11st.co.kr/rest/cateservice/category (EUC-KR XML, ~3MB, 약 15,000건).
     *   응답 필드: dispNo(=상품등록 dispCtgrNo), dispNm(이름), parentDispNo(상위·0=최상위), depth(1대/2중/3소/4세), leafYn(Y=리프).
     *   네이버 어댑터(naverCategoryCatalog)와 동일한 반환 포맷 [{code,name,whole,leaf}] 을 지켜,
     *   Catalog 의 조회·검색·선택 파이프라인을 그대로 재사용한다(신규 소비 경로 없음).
     *
     *   whole(전체경로) 은 XML 에 없으므로 parentDispNo 체인을 걸어 "대 > 중 > 소 > 세" 로 직접 구성한다.
     *   메모리: XMLReader 스트리밍으로 노드를 하나씩 읽어 3MB DOM 을 통째로 올리지 않는다(SimpleXML 전량 로드는 OOM).
     */
    public static function elevenStCategoryCatalog(): array
    {
        [$code, $raw] = self::httpGetRaw('http://api.11st.co.kr/rest/cateservice/category', [], 40);
        if ($code !== 200 || $raw === '') return [];

        // EUC-KR → UTF-8 (불량 바이트는 무시). XML 선언의 encoding 도 UTF-8 로 교체해야 파서가 재해석하지 않는다.
        $utf = @iconv('EUC-KR', 'UTF-8//IGNORE', $raw);
        if ($utf === false) $utf = @mb_convert_encoding($raw, 'UTF-8', 'EUC-KR,CP949');
        if (!is_string($utf) || $utf === '') return [];
        $utf = preg_replace('/(<\?xml[^>]*encoding=["\'])[^"\']+(["\'])/i', '${1}UTF-8${2}', $utf, 1);

        // 1패스: dispNo → [name, parent, leaf] 맵 구성(스트리밍).
        $meta = [];
        $reader = new \XMLReader();
        if (!@$reader->XML($utf, 'UTF-8', LIBXML_NOERROR | LIBXML_NOWARNING)) return [];
        try {
            while (@$reader->read()) {
                if ($reader->nodeType !== \XMLReader::ELEMENT || $reader->localName !== 'category') continue;
                $node = @$reader->readOuterXML();
                if (!$node) continue;
                $one = @simplexml_load_string($node);
                if ($one === false) continue;
                $dispNo = trim((string)$one->dispNo);
                if ($dispNo === '') continue;
                $meta[$dispNo] = [
                    'name'   => trim((string)$one->dispNm),
                    'parent' => trim((string)$one->parentDispNo),
                    'leaf'   => (strtoupper(trim((string)$one->leafYn)) === 'Y'),
                ];
            }
        } finally { $reader->close(); }
        if (!$meta) return [];

        // 2패스: parent 체인으로 전체경로(whole) 구성. 순환/과도한 깊이 방어(최대 10단).
        $out = [];
        foreach ($meta as $dispNo => $m) {
            $parts = [$m['name']];
            $p = $m['parent']; $guard = 0;
            while ($p !== '' && $p !== '0' && isset($meta[$p]) && $guard < 10) {
                array_unshift($parts, $meta[$p]['name']);
                $p = $meta[$p]['parent'];
                $guard++;
            }
            $out[] = [
                'code'  => $dispNo,
                'name'  => $m['name'],
                'whole' => implode(' > ', array_filter($parts, fn($x) => $x !== '')),
                'leaf'  => $m['leaf'],
            ];
        }
        return $out;
    }

    /**
     * [277차] 네이버 이미지 업로드 — originProduct.images 는 **공개 URL** 만 받는다.
     *   그런데 상품등록(PriceOpt)은 이미지를 base64 dataURL 로 보관하므로 그대로 push 하면 400 이다.
     *   dataURL 만 네이버 이미지 서버에 업로드해 URL 로 치환하고, 이미 http(s) URL 인 항목은 그대로 통과시킨다.
     *   업로드 실패분은 제외(이미지 없는 등록이 전체 400 보다 낫다 — 부분성공 우선).
     *   @param array $imgs 원본(dataURL 또는 URL) 목록
     *   @return array 공개 URL 목록
     */
    /**
     * [277차] 채널별 이미지 선업로드 — base64 dataURL 을 **공개 URL** 로 바꾼다.
     *   왜 필요한가: 상품등록 폼은 이미지를 dataURL(장당 1~2MB)로 보관하는데, 이를 catalog_listing 에 저장하면
     *   MySQL max_allowed_packet(1MB)·TEXT 한계를 넘겨 HTTP 500 이 난다. 저장 전에 URL 로 치환하면
     *   DB 에는 수백 바이트만 남고, 큐 재시도·수정(PUT) 때도 같은 URL 을 재사용할 수 있다.
     *   업로드를 지원하지 않는 채널은 dataURL 을 **버린다**(가짜 URL 을 만들지 않는다 — 정직).
     *   @return array{urls: array<string>, dropped: int} 공개 URL 목록과 버린 dataURL 수
     */
    public static function uploadImagesForChannel(string $channel, array $creds, array $images): array
    {
        $urls = []; $pending = [];
        foreach ($images as $u) {
            $u = (string)$u;
            if ($u === '') continue;
            if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) $urls[] = $u;
            elseif (str_starts_with($u, 'data:')) $pending[] = $u;
        }
        if (!$pending) return ['urls' => $urls, 'dropped' => 0];

        $ch = strtolower(trim($channel));
        if (in_array($ch, ['naver', 'naver_smartstore'], true)) {
            $token = self::naverAccessToken($creds);
            if ($token) {
                $up = self::naverUploadImages($token, $pending);
                return ['urls' => array_merge($urls, $up), 'dropped' => count($pending) - count($up)];
            }
        }
        // [현 차수] 나머지 전 채널 — 종전엔 여기서 dataURL 을 통째로 버렸다(그래서 naver/shopify 외에는
        //   이미지가 영원히 전송되지 않았다). 채널별 업로드 API 를 추측하는 대신 우리가 공개 URL 을 발급한다.
        //   거의 모든 채널 상품 API 의 공통 계약이 "공개 이미지 URL" 이므로 이 한 지점이 전 채널을 덮는다.
        $host = MediaHost::storeMany($pending);
        return ['urls' => array_merge($urls, $host['urls']), 'dropped' => $host['dropped']];
    }

    private static function naverUploadImages(string $token, array $imgs): array
    {
        $out = [];
        foreach ($imgs as $img) {
            $img = (string)$img;
            if ($img === '') continue;
            if (str_starts_with($img, 'http://') || str_starts_with($img, 'https://')) { $out[] = $img; continue; }
            if (!preg_match('#^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$#s', $img, $m)) continue;
            $bin = base64_decode($m[2], true);
            if ($bin === false || strlen($bin) < 64) continue;
            $mime = $m[1];
            $ext  = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/gif' => 'gif', 'image/webp' => 'webp'][$mime] ?? 'jpg';
            $tmp  = tempnam(sys_get_temp_dir(), 'gnv_');
            if ($tmp === false || @file_put_contents($tmp, $bin) === false) { if ($tmp) @unlink($tmp); continue; }
            $ch = curl_init('https://api.commerce.naver.com/external/v1/product-images/upload');
            curl_setopt_array($ch, [
                CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30,
                CURLOPT_HTTPHEADER => ["Authorization: Bearer {$token}"], // Content-Type 은 curl 이 boundary 와 함께 설정
                CURLOPT_POSTFIELDS => ['imageFiles' => new \CURLFile($tmp, $mime, 'image.' . $ext)],
            ]);
            $resp = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            @unlink($tmp);
            if ($code < 200 || $code >= 300) continue;
            $body = json_decode((string)$resp, true);
            $u = (string)($body['images'][0]['url'] ?? '');
            if ($u !== '') $out[] = $u;
        }
        return $out;
    }

    /**
     * [277차] 네이버 상품 상세 보강 — 상세HTML·추가이미지는 목록(products/search)에 없고
     *   `GET /external/v2/products/origin-products/{originProductNo}` 에만 있다(실 응답 검증 완료).
     *   상품당 1회 호출(N+1)이라 $limit 로 상한. 초과분은 catalog_sync_job 백그라운드가 이어받는다.
     *   실패 건은 조용히 건너뛴다(목록 수집분은 그대로 저장 — 부분성공 우선).
     *   @param array $products naverProductsPage 산출물(origin_product_no 보유)
     */
    private static function naverEnrichDetails(string $token, array $products, int $limit): array
    {
        $hdr = ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json'];
        $done = 0;
        foreach ($products as $i => $p) {
            if ($done >= $limit) break;
            $no = (string)($p['origin_product_no'] ?? '');
            if ($no === '') continue;
            [$code, $body] = self::httpGet("https://api.commerce.naver.com/external/v2/products/origin-products/{$no}", $hdr);
            $done++;
            if ($code !== 200 || !is_array($body)) continue;
            $op = (array)($body['originProduct'] ?? []);
            $detail = (string)($op['detailContent'] ?? '');
            if ($detail !== '') $products[$i]['detail_html'] = $detail;
            $rep = (string)($op['images']['representativeImage']['url'] ?? '');
            if ($rep !== '') $products[$i]['image_url'] = $rep;
            $imgs = [];
            if ($rep !== '') $imgs[] = $rep;
            foreach ((array)($op['images']['optionalImages'] ?? []) as $oi) {
                $u = (string)($oi['url'] ?? '');
                if ($u !== '') $imgs[] = $u;
            }
            if ($imgs) $products[$i]['images'] = $imgs;
        }
        return $products;
    }

    /** [M6/276차] 네이버 상품 수집 — 페이지네이션(최대 $maxPages 페이지×100). 대량 카탈로그는 상위(syncTenantChannel)가
     *   나머지를 catalog_sync_job 백그라운드로 위임한다. 실패 시 빈배열.
     *   [277차] 수집 후 상세(이미지·상세HTML) 보강 — 동기 경로는 $detailLimit 건까지만. */
    private static function naverProducts(string $token, int $maxPages = 10, int $detailLimit = 20): array
    {
        $all = []; $page = 1; $size = 100;
        do {
            $r = self::naverProductsPage($token, $page, $size);
            if (($r['http'] ?? 0) !== 200) break;
            $all = array_merge($all, $r['products']);
            $totalPages = (int)($r['totalPages'] ?? 1);
            $page++;
        } while ($page <= $totalPages && $page <= $maxPages);
        if ($detailLimit > 0 && $all) $all = self::naverEnrichDetails($token, $all, $detailLimit);
        return $all;
    }

    /** [276차] 네이버 액세스 토큰 획득(bcrypt 전자서명). 백그라운드 잡·재사용. 실패 시 null. */
    private static function naverAccessToken(array $creds): ?string
    {
        $cid = trim((string)($creds['client_id'] ?? ''));
        $sec = trim((string)($creds['client_secret'] ?? ''));
        if ($cid === '' || $sec === '') return null;
        $ts   = (int)(microtime(true) * 1000);
        $sign = self::naverSign($cid, $sec, $ts);
        [$code, $body] = self::httpPost(
            'https://api.commerce.naver.com/external/v1/oauth2/token',
            ['Content-Type' => 'application/x-www-form-urlencoded'],
            "client_id={$cid}&timestamp={$ts}&client_secret_sign=" . urlencode($sign) . "&grant_type=client_credentials&type=SELF"
        );
        return ($code === 200 && !empty($body['access_token'])) ? (string)$body['access_token'] : null;
    }

    /** [276차] 대량 카탈로그 백그라운드 잡 적재(tenant+channel 단일 활성 잡, upsert). fetched=이미 즉시반영한 수. */
    private static function enqueueCatalogJob(\PDO $pdo, string $tenant, string $channel, int $userId, int $total, int $fetched, int $nextPage, int $pageSize): void
    {
        try {
            $now = gmdate('c');
            // 이미 done 이 아닌 활성 잡이 있으면 진행상태 보존, 없으면 신규.
            $ex = $pdo->prepare("SELECT id,status FROM catalog_sync_job WHERE tenant_id=? AND channel=?");
            $ex->execute([$tenant, $channel]);
            $row = $ex->fetch(\PDO::FETCH_ASSOC);
            if ($row) {
                // 진행 중이면 그대로 두고, done/error 였으면 재개(next_page 재설정).
                if (in_array((string)$row['status'], ['done', 'error'], true)) {
                    $pdo->prepare("UPDATE catalog_sync_job SET status='pending', user_id=?, total_elements=?, fetched=?, next_page=?, page_size=?, message=?, updated_at=? WHERE id=?")
                        ->execute([$userId, $total, $fetched, $nextPage, $pageSize, '대량 카탈로그 백그라운드 수집 대기', $now, (int)$row['id']]);
                }
            } else {
                $pdo->prepare("INSERT INTO catalog_sync_job(tenant_id,channel,user_id,status,total_elements,fetched,next_page,page_size,message,created_at,updated_at)
                    VALUES(?,?,?,'pending',?,?,?,?,?,?,?)")
                    ->execute([$tenant, $channel, $userId, $total, $fetched, $nextPage, $pageSize, '대량 카탈로그 백그라운드 수집 대기', $now, $now]);
            }
        } catch (\Throwable $e) { /* 잡 적재 실패는 온디맨드 결과에 영향 없음 */ }
    }

    /** [276차] 사용자 알림 적재(user_notification 재사용). userId=0 이면 무동작. */
    private static function notifyUser(\PDO $pdo, int $userId, string $tenant, string $type, string $title, string $body, string $link = ''): void
    {
        if ($userId <= 0) return;
        // 테이블 생성은 driver-aware + INSERT 와 별도 try (CREATE 실패가 INSERT 를 막지 않도록).
        //   ★user_notification 은 운영에선 UserAuth 가 이미 생성. 여기 CREATE 는 fresh DB 안전망.
        $isMy = strtolower((string)$pdo->getAttribute(\PDO::ATTR_DRIVER_NAME)) === 'mysql';
        $idCol = $isMy ? 'id INT AUTO_INCREMENT PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT';
        try { $pdo->exec("CREATE TABLE IF NOT EXISTS user_notification ($idCol, user_id INT, tenant_id VARCHAR(64), type VARCHAR(32), title TEXT, body TEXT, link VARCHAR(255), is_read TINYINT DEFAULT 0, created_at VARCHAR(32))"); } catch (\Throwable $e) {}
        try {
            $pdo->prepare("INSERT INTO user_notification(user_id,tenant_id,type,title,body,link,is_read,created_at) VALUES(?,?,?,?,?,?,0,?)")
                ->execute([$userId, $tenant, $type, $title, $body, $link, gmdate('c')]);
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /**
     * [276차] 백그라운드 카탈로그 잡 처리 — commerce_sync_cron 에서 호출.
     *   pending/running 잡별로 다음 배치(최대 $maxPagesPerRun 페이지) 수집·저장, 진행 갱신.
     *   완료(fetched>=total 또는 페이지 소진) 시 status='done' + 사용자 알림.
     *   현재 네이버(products/search 페이지네이션) 지원. 다른 채널은 무동작(graceful).
     * 반환: ['processed'=>int, 'done'=>int, 'saved'=>int]
     */
    public static function processCatalogJobs(?\PDO $pdo = null, int $maxPagesPerRun = 10): array
    {
        $pdo = $pdo ?: Db::pdo();
        self::ensureTables();
        $processed = 0; $doneCnt = 0; $savedTotal = 0;
        try {
            $jobs = $pdo->query("SELECT * FROM catalog_sync_job WHERE status IN ('pending','running') ORDER BY updated_at ASC")->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return ['processed'=>0,'done'=>0,'saved'=>0,'error'=>$e->getMessage()]; }
        foreach ($jobs as $job) {
            $tenant = (string)$job['tenant_id']; $channel = (string)$job['channel'];
            $c = self::normalizeChannelKey($channel);
            if (!in_array($c, ['naver','naver_smartstore'], true) && !in_array($channel, ['naver','naver_smartstore'], true)) continue; // 미지원 채널 skip
            $processed++;
            $now = gmdate('c');
            // 자격증명 로드 → 토큰
            $st = $pdo->prepare("SELECT key_name,key_value FROM channel_credential WHERE tenant_id=? AND channel=? AND is_active=1");
            $st->execute([$tenant, $channel]);
            $creds = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) { $creds[$r['key_name']] = \Genie\Crypto::decrypt((string)($r['key_value'] ?? '')); }
            $token = self::naverAccessToken($creds);
            if ($token === null) {
                $pdo->prepare("UPDATE catalog_sync_job SET status='error', message=?, updated_at=? WHERE id=?")
                    ->execute(['토큰 발급 실패(자격증명 확인)', $now, (int)$job['id']]);
                continue;
            }
            $pdo->prepare("UPDATE catalog_sync_job SET status='running', updated_at=? WHERE id=?")->execute([$now, (int)$job['id']]);
            $page = (int)$job['next_page']; $size = (int)$job['page_size'] ?: 100;
            $total = (int)$job['total_elements']; $fetched = (int)$job['fetched'];
            $saved = 0; $pagesRun = 0; $lastTotalPages = null;
            while ($pagesRun < $maxPagesPerRun) {
                $r = self::naverProductsPage($token, $page, $size);
                if ((int)($r['http'] ?? 0) !== 200) break;
                $prods = (array)($r['products'] ?? []);
                if (!$prods) { $lastTotalPages = (int)($r['totalPages'] ?? $page); break; }
                // [277차] 백그라운드는 시간 여유가 있으므로 페이지 전량(최대 $size)을 상세 보강해 저장한다.
                //   대표이미지는 목록에 이미 있고, 상세HTML·추가이미지만 상품당 1회 추가 호출.
                $prods = self::naverEnrichDetails($token, $prods, count($prods));
                $saved += self::saveProducts($pdo, $tenant, $channel, $prods);
                $fetched += count($prods);
                $lastTotalPages = (int)($r['totalPages'] ?? $page);
                $page++; $pagesRun++;
                if ($lastTotalPages > 0 && $page > $lastTotalPages) break; // 페이지 소진
            }
            $savedTotal += $saved;
            $complete = ($lastTotalPages !== null && $page > $lastTotalPages) || ($total > 0 && $fetched >= $total);
            if ($complete) {
                $pdo->prepare("UPDATE catalog_sync_job SET status='done', fetched=?, next_page=?, message=?, updated_at=? WHERE id=?")
                    ->execute([$fetched, $page, "완료: {$fetched}개 상품 수집", $now, (int)$job['id']]);
                $doneCnt++;
                self::notifyUser($pdo, (int)$job['user_id'], $tenant, 'catalog_sync',
                    '카탈로그 동기화 완료',
                    self::channelLabel($channel) . " 상품 {$fetched}개 수집이 완료되었습니다.",
                    '/omni-channel');
            } else {
                $pdo->prepare("UPDATE catalog_sync_job SET status='pending', fetched=?, next_page=?, message=?, updated_at=? WHERE id=?")
                    ->execute([$fetched, $page, "진행 중: {$fetched}" . ($total>0?"/{$total}":'') . "개", $now, (int)$job['id']]);
            }
        }
        return ['processed'=>$processed, 'done'=>$doneCnt, 'saved'=>$savedTotal];
    }

    /** 채널 표시명(알림용). 미정의 채널은 원문. */
    private static function channelLabel(string $channel): string
    {
        $map = ['naver'=>'네이버 스마트스토어','naver_smartstore'=>'네이버 스마트스토어','coupang'=>'쿠팡','shopify'=>'Shopify','amazon'=>'Amazon','amazon_spapi'=>'Amazon'];
        return $map[strtolower($channel)] ?? $channel;
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
                        // [현 차수 감사] 취소/환불 상태 반영 — orderFulfillmentStatus 만으론 취소/환불을 못 잡아(별도 필드)
                        //   취소/환불 eBay 주문이 매출에 잔존하던 결함. cancelStatus(CANCELED)·orderPaymentStatus(REFUND)·
                        //   refunds 를 우선 반영해 classifyCancelReturn 이 취소/반품으로 전이 → 매출 제외·재고 복원·정산.
                        //   해당 신호 없으면 기존 fulfillment 상태 보존(graceful).
                        $ebCancel = strtoupper((string)($o['cancelStatus']['cancelState'] ?? ''));
                        $ebPay    = strtoupper((string)($o['orderPaymentStatus'] ?? ''));
                        if ($ebCancel === 'CANCELED') {
                            $ebStatus = 'CANCELED';
                        } elseif (strpos($ebPay, 'REFUND') !== false || !empty($o['paymentSummary']['refunds'])) {
                            $ebStatus = 'REFUNDED';
                        } else {
                            $ebStatus = (string)($o['orderFulfillmentStatus'] ?? 'NOT_STARTED');
                        }
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
                            'status'      => $ebStatus,
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
                // [현 차수 감사 P1] 통화 누락 수정 — saveOrders fxToKrw 정규화가 동작하도록 외화(USD/GBP/SEA) 통화 stamp.
                //   (자매 어댑터 amazon/ebay/rakuten/qoo10/shopee/lazada 전부 currency 설정·TikTok만 누락이던 비대칭.)
                'currency'    => strtoupper((string)($o['payment']['currency'] ?? '')),
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
                // [현 차수 감사 P1] orderProgress 900=キャンセル確定(취소확정) → 취소 전이. 그 외는 진행코드 보존.
                'status'      => ((int)($o['orderProgress'] ?? 100) === 900 ? '취소확정(rakuten-900)' : 'rakuten-' . (string)($o['orderProgress'] ?? '100')),
                'event_type'  => ((int)($o['orderProgress'] ?? 100) === 900 ? 'cancel' : 'order'),
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
                // [현 차수 감사 P1] Cafe24 order_status 코드 — C##=취소·R##=반품(원코드 그대로면 미반영). 첫글자로 전이.
                'status'      => strtolower((string)($o['order_status'] ?? 'n00')),
                'event_type'  => (strncmp(strtolower((string)($o['order_status'] ?? 'n00')), 'c', 1) === 0 ? 'cancel'
                                   : (strncmp(strtolower((string)($o['order_status'] ?? 'n00')), 'r', 1) === 0 ? 'return' : 'order')),
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
                // [현 차수 P1] channel_product_id 를 상품 고유키(wpid/itemId/sku)로 — 기존 'mart'는 마켓 상수(WALMART_US)라
                //   전 상품이 동일값→(tenant,channel,channel_product_id) upsert 로 1행으로 붕괴했다.
                'channel_product_id'=>(string)($p['wpid'] ?? $p['itemId'] ?? $p['sku'] ?? ''), 'sku'=>(string)($p['sku'] ?? ''),
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
                // [현 차수 값정합] Qoo10 QSM(ebayjapan.qapi)=일본 마켓플레이스 → 금액은 JPY. currency='' 면 saveOrders 가
                //   fxToKrw 를 건너뛰어 ¥ 가 ₩ 로 합산(약 9배 과소). Yahoo!JP 패턴처럼 통화필드 우선·없으면 JPY 폴백.
                // [현 차수 감사 P1] 상태 상수('발주확인') → 실 상태필드(있으면) 판독 + 취소/반품 전이(미반영 해소).
                'currency'=>strtoupper((string)($o['currency'] ?? 'JPY')),
                'status'=>((string)($o['orderStatus'] ?? ($o['status'] ?? '')) ?: '발주확인'),
                'event_type'=>self::classifyCancelReturn((string)($o['orderStatus'] ?? ($o['status'] ?? '')), '') ?? 'order',
                'ordered_at'=>(string)($o['orderDate'] ?? ''), 'source'=>'live',
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
    /** dot-path 접근(a.b.0.c) — 배열 안전 탐색. 미존재=null. */
    private static function dotGet($data, string $path)
    {
        if ($path === '') return null;
        $cur = $data;
        foreach (explode('.', $path) as $seg) {
            if (is_array($cur) && array_key_exists($seg, $cur)) $cur = $cur[$seg];
            else return null;
        }
        return (is_scalar($cur) || is_array($cur)) ? $cur : null;
    }

    /**
     * [초고도화 #4] 제네릭 스펙 구동 fetch — ChannelRegistry.fetch_spec(REST 선언)으로 전용 코드 없이 주문 연동.
     *   admin 이 어떤 REST 채널이든 스펙만 선언하면 즉시 연동(Channable/Linnworks 모델 → 채널 폭 무한 확장).
     *   spec = { base_url, auth:{type:bearer|apikey|basic, cred_key, header|param, user_key}, orders:{path,params,list_path,map{...}} }
     *   ★실 HTTP·테넌트 격리·saveOrders chokepoint(fxToKrw·데모유입차단) 그대로 통과. 스펙부재=null(honest pending 폴백).
     */
    private static function specFetch(string $channel, array $creds, string $tenant): ?array
    {
        $spec = \Genie\Handlers\ChannelRegistry::fetchSpecFor($channel);
        if (!is_array($spec) || empty($spec['base_url']) || empty($spec['orders']['path'])) return null;
        $o = (array)$spec['orders'];
        $base = rtrim((string)$spec['base_url'], '/');
        $since = gmdate('Y-m-d', time() - 14 * 86400);
        $params = [];
        foreach ((array)($o['params'] ?? []) as $k => $v) { $params[(string)$k] = str_replace(['{since}', '{tenant}'], [$since, $tenant], (string)$v); }
        $url = $base . (string)$o['path'];
        $headers = [];
        $auth = (array)($spec['auth'] ?? []);
        $type = strtolower((string)($auth['type'] ?? ''));
        $secret = (string)($creds[(string)($auth['cred_key'] ?? 'api_key')] ?? '');
        if ($type === 'bearer') { $headers['Authorization'] = 'Bearer ' . $secret; }
        elseif ($type === 'basic') { $u = (string)($creds[(string)($auth['user_key'] ?? 'username')] ?? ''); $headers['Authorization'] = 'Basic ' . base64_encode($u . ':' . $secret); }
        elseif ($type === 'apikey') { if (!empty($auth['header'])) $headers[(string)$auth['header']] = $secret; else $params[(string)($auth['param'] ?? 'api_key')] = $secret; }
        if ($params) $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($params);
        [$code, $raw, $err] = self::httpGetRaw($url, $headers, 20);
        if ($code < 200 || $code >= 300 || $raw === '') {
            return ['ok' => false, 'pending' => true, 'products' => [], 'orders' => [], 'note' => "제네릭 어댑터 HTTP {$code} — 스펙/자격증명 확인 필요" . ($err ? " ({$err})" : '')];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) return ['ok' => false, 'pending' => true, 'products' => [], 'orders' => [], 'note' => '제네릭 어댑터 응답 JSON 파싱 실패'];
        $list = empty($o['list_path']) ? (is_array($data[0] ?? null) ? $data : [$data]) : (array)(self::dotGet($data, (string)$o['list_path']) ?? []);
        $map = (array)($o['map'] ?? []);
        $orders = [];
        foreach ($list as $item) {
            if (!is_array($item)) continue;
            $row = [];
            foreach ($map as $field => $srcPath) { $v = self::dotGet($item, (string)$srcPath); if ($v !== null && !is_array($v)) $row[(string)$field] = $v; }
            $oid = (string)($row['channel_order_id'] ?? '');
            if ($oid === '') continue;
            $row['source'] = 'generic'; // saveOrders 데모/structured 차단과 무관(실 tenant) — 정상 적재.
            $orders[] = $row;
        }
        return ['ok' => true, 'products' => [], 'orders' => $orders, 'note' => '제네릭 스펙 어댑터: ' . count($orders) . '건 수신'];
    }

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
            // [초고도화 #4] 제네릭 스펙 어댑터 — admin 이 ChannelRegistry.fetch_spec(REST 선언)을 등록한 채널이면
            //   전용 코드 없이 실 주문 연동(Channable/Linnworks 식). 스펙 부재 시 honest pending 폴백.
            $spec = self::specFetch($channel, $creds, $tenant);
            if ($spec !== null) return $spec;
            return [
                'ok'       => true,
                'pending'  => true,
                'products' => [],
                'orders'   => [],
                'note'     => "{$label}: 자격증명 저장 완료 — 전용 어댑터 연동 준비 중입니다. [연동허브>채널추가]에서 REST 스펙(fetch_spec)을 등록하면 코드 없이 즉시 실데이터가 동기화됩니다.",
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
            // [277차 보안] ★TLS 서버 인증서 검증 활성화 — 형제 헬퍼 7종은 전부 true 인데 이 함수만 false 였다.
            //   호출자 specFetch(:1874)는 admin 이 등록한 제네릭 REST 채널에 `Authorization: Bearer <secret>` 를
            //   실어 보낸다. 검증이 꺼져 있으면 능동적 MITM 이 인증서를 위조해 **채널 자격증명을 탈취**할 수 있다.
            //   (다른 호출자 elevenStFetch 는 평문 http 라 TLS 무관 — 이 변경의 영향 없음.)
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_USERAGENT => 'GeniegoROI/v423',
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
            // [P1 커넥터 폭] 리뷰 플랫폼 확대 — 전용 리뷰 SaaS·평판 채널(실 API·graceful 게이트).
            case 'trustpilot':                      return self::trustpilotReviews($creds);
            case 'yotpo':                           return self::yotpoReviews($creds);
            case 'google_business': case 'google':  return self::googleBusinessReviews($creds);
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
        $sign = self::naverSign($clientId, $clientSecret, $timestamp);
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

    /** [P1 커넥터 폭] Trustpilot Business API — 비즈니스 유닛 리뷰. 자격증명: business_unit_id + api_key. */
    private static function trustpilotReviews(array $creds): array
    {
        $buId = trim((string)($creds['business_unit_id'] ?? '')); $apiKey = trim((string)($creds['api_key'] ?? ''));
        if ($buId === '' || $apiKey === '') return ['reviews' => [], 'mode' => 'no_credentials', 'note' => 'Trustpilot: business_unit_id·api_key 필요'];
        $url = 'https://api.trustpilot.com/v1/business-units/' . rawurlencode($buId) . '/reviews?' . http_build_query(['apikey' => $apiKey, 'perPage' => 100, 'orderBy' => 'createdat.desc']);
        [$code, $body, $err] = self::httpGet($url, ['Accept' => 'application/json']);
        if ($err || $code >= 400) return ['reviews' => [], 'mode' => 'api_error', 'note' => "Trustpilot 조회 실패(code={$code}) — business_unit_id/api_key 확인"];
        $reviews = [];
        foreach ((array)($body['reviews'] ?? []) as $r) {
            $id = (string)($r['id'] ?? '');
            if ($id === '') continue;
            $reviews[] = [
                'external_review_id' => 'trustpilot_' . $id,
                'product'     => (string)($r['referenceId'] ?? 'Trustpilot'),
                'product_id'  => (string)($r['referenceId'] ?? ''),
                'rating'      => (float)($r['stars'] ?? 0),
                'title'       => self::stripHtml((string)($r['title'] ?? '')),
                'body'        => self::stripHtml((string)($r['text'] ?? '')),
                'author'      => (string)(($r['consumer']['displayName'] ?? '') ?: ''),
                'reviewed_at' => (string)($r['createdAt'] ?? gmdate('c')),
            ];
        }
        return ['reviews' => $reviews, 'mode' => 'live', 'note' => count($reviews) . '건 Trustpilot 리뷰 수집'];
    }

    /** [P1 커넥터 폭] Yotpo Reviews API — app_key+secret → utoken → /apps/{app_key}/reviews. */
    private static function yotpoReviews(array $creds): array
    {
        $appKey = trim((string)($creds['app_key'] ?? '')); $secret = trim((string)($creds['api_secret'] ?? $creds['secret'] ?? ''));
        if ($appKey === '' || $secret === '') return ['reviews' => [], 'mode' => 'no_credentials', 'note' => 'Yotpo: app_key·api_secret 필요'];
        // utoken 발급(client_credentials).
        [$tc, $tb] = self::httpPost('https://api.yotpo.com/oauth/token', ['Content-Type' => 'application/json'],
            json_encode(['client_id' => $appKey, 'client_secret' => $secret, 'grant_type' => 'client_credentials']));
        $utoken = (string)($tb['access_token'] ?? '');
        if ($utoken === '') return ['reviews' => [], 'mode' => 'auth_failed', 'note' => "Yotpo 토큰 발급 실패(code={$tc}) — app_key/secret 확인"];
        [$code, $body, $err] = self::httpGet('https://api.yotpo.com/v1/apps/' . rawurlencode($appKey) . '/reviews?' . http_build_query(['utoken' => $utoken, 'count' => 100, 'page' => 1]), ['Accept' => 'application/json']);
        if ($err || $code >= 400) return ['reviews' => [], 'mode' => 'api_error', 'note' => "Yotpo 리뷰 조회 실패(code={$code})"];
        $reviews = [];
        foreach ((array)($body['reviews'] ?? []) as $r) {
            $id = (string)($r['id'] ?? '');
            if ($id === '') continue;
            $prod = (array)($r['product'] ?? []);
            $reviews[] = [
                'external_review_id' => 'yotpo_' . $id,
                'product'     => (string)($prod['name'] ?? ''),
                'product_id'  => (string)($prod['external_product_id'] ?? $prod['id'] ?? ''),
                'rating'      => (float)($r['score'] ?? 0),
                'title'       => self::stripHtml((string)($r['title'] ?? '')),
                'body'        => self::stripHtml((string)($r['content'] ?? '')),
                'author'      => (string)(($r['user']['display_name'] ?? '') ?: ''),
                'reviewed_at' => (string)($r['created_at'] ?? gmdate('c')),
            ];
        }
        return ['reviews' => $reviews, 'mode' => 'live', 'note' => count($reviews) . '건 Yotpo 리뷰 수집'];
    }

    /** [P1 커넥터 폭] Google Business Profile 리뷰 — v4 reviews. 자격증명: account_id + location_id + access_token(OAuth2). */
    private static function googleBusinessReviews(array $creds): array
    {
        $acct = trim((string)($creds['account_id'] ?? '')); $loc = trim((string)($creds['location_id'] ?? ''));
        $token = trim((string)($creds['access_token'] ?? ''));
        if ($acct === '' || $loc === '' || $token === '') return ['reviews' => [], 'mode' => 'no_credentials', 'note' => 'Google Business: account_id·location_id·access_token 필요'];
        $url = 'https://mybusiness.googleapis.com/v4/accounts/' . rawurlencode($acct) . '/locations/' . rawurlencode($loc) . '/reviews?pageSize=50';
        [$code, $body, $err] = self::httpGet($url, ['Authorization' => "Bearer {$token}", 'Accept' => 'application/json']);
        if ($err || $code >= 400) return ['reviews' => [], 'mode' => 'api_error', 'note' => "Google Business 리뷰 조회 실패(code={$code}) — OAuth 토큰/위치 ID 확인"];
        $starMap = ['ONE' => 1, 'TWO' => 2, 'THREE' => 3, 'FOUR' => 4, 'FIVE' => 5];
        $reviews = [];
        foreach ((array)($body['reviews'] ?? []) as $r) {
            $id = (string)($r['reviewId'] ?? '');
            if ($id === '') continue;
            $reviews[] = [
                'external_review_id' => 'gbp_' . $id,
                'product'     => 'Google Business',
                'product_id'  => $loc,
                'rating'      => (float)($starMap[(string)($r['starRating'] ?? '')] ?? 0),
                'title'       => '',
                'body'        => self::stripHtml((string)($r['comment'] ?? '')),
                'author'      => (string)(($r['reviewer']['displayName'] ?? '') ?: ''),
                'reviewed_at' => (string)($r['createTime'] ?? gmdate('c')),
            ];
        }
        return ['reviews' => $reviews, 'mode' => 'live', 'note' => count($reviews) . '건 Google Business 리뷰 수집'];
    }

    /**
     * [현 차수] 어댑터 공통 — 상품 이미지의 **공개 URL 목록**.
     *   MediaHost/네이버 업로드를 거친 뒤라 여기 남는 건 http(s) URL 뿐이다. dataURL 이 남아 있으면
     *   그건 호스팅에 실패했다는 뜻이므로 절대 채널에 보내지 않는다(보내면 400·500 이 난다).
     *   @param int $max 채널별 이미지 장수 상한
     */
    public static function imageUrls(array $p, int $max = 10): array
    {
        $src = array_map('strval', (array)($p['images'] ?? []));
        if (!$src && (string)($p['image_url'] ?? '') !== '') $src = [(string)$p['image_url']];
        $out = [];
        foreach ($src as $u) {
            $u = trim($u);
            if ($u === '' || in_array($u, $out, true)) continue;
            if (!str_starts_with($u, 'http://') && !str_starts_with($u, 'https://')) continue;
            $out[] = $u;
            if (count($out) >= $max) break;
        }
        return $out;
    }

    /**
     * [현 차수] 공개 URL → 원본 바이트. 채널이 URL 이 아니라 **파일 본문**을 요구할 때 쓴다
     *   (Shopee/TikTok/Etsy multipart · Magento base64 갤러리).
     *   MediaHost 가 발급한 URL 이면 네트워크를 타지 않고 로컬 파일에서 바로 읽는다(자기 자신에게 HTTP 호출 금지).
     *   @return array{bin:string, mime:string, ext:string}|null
     */
    public static function imageBytes(string $url): ?array
    {
        $local = MediaHost::localPath($url);
        $bin = null;
        if ($local !== null) {
            $bin = @file_get_contents($local);
        } elseif (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3]);
            $r = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($r !== false && $code >= 200 && $code < 300) $bin = (string)$r;
        }
        if ($bin === null || $bin === false || strlen($bin) < 64) return null;
        $info = @getimagesizefromstring($bin);
        if ($info === false || empty($info['mime'])) return null;
        $mime = strtolower((string)$info['mime']);
        $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'][$mime] ?? null;
        if ($ext === null) return null;
        return ['bin' => $bin, 'mime' => $mime, 'ext' => $ext];
    }

    /** multipart/form-data 로 이미지 1장 업로드(채널 미디어 서버). @return array{code:int, body:mixed} */
    private static function uploadMultipart(string $url, array $headers, string $field, array $img, array $extraFields = []): array
    {
        $tmp = tempnam(sys_get_temp_dir(), 'gimg_');
        if ($tmp === false || @file_put_contents($tmp, $img['bin']) === false) { if ($tmp) @unlink($tmp); return ['code' => 0, 'body' => null]; }
        $post = $extraFields;
        $post[$field] = new \CURLFile($tmp, $img['mime'], 'image.' . $img['ext']);
        $hdr = [];
        foreach ($headers as $k => $v) $hdr[] = "$k: $v";   // Content-Type 은 curl 이 boundary 와 함께 설정
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60, CURLOPT_HTTPHEADER => $hdr, CURLOPT_POSTFIELDS => $post]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        @unlink($tmp);
        return ['code' => $code, 'body' => json_decode((string)$resp, true)];
    }

    public static function pushProduct(string $channel, array $creds, array $product, string $operation, ?string $channelProductId): array
    {
        // [현 차수] ★전송 전 계약 검사 — 채널은 오류를 한 번에 하나씩만 알려준다(네이버에서 수정이 반복된 구조적 원인).
        //   빠진 필수 항목을 여기서 **전부** 모아 한 번에 알려주고, 채널 API 는 아예 부르지 않는다
        //   (실패 카운트·페널티·중복 등록 방지). 신규 등록에만 전체 계약을 적용한다.
        //   ★기존 어댑터의 개별 honest-gate 는 그대로 둔다 — 이 검사는 그 앞단의 추가 그물이다.
        $isNew = ($channelProductId === null || $channelProductId === '');
        $pre = ChannelContract::preflight($channel, $product, $isNew ? 'register' : 'update');
        if (!$pre['ok']) return ['ok' => false, 'error' => $pre['error'], 'missing' => $pre['missing'], 'preflight' => true];

        $r = self::pushProductInner($channel, $creds, $product, $operation, $channelProductId);
        // [현 차수] 이미지 규격이 확정되지 않은 채널은 이미지를 빼고 등록하되, 그 사실을 반드시 노출한다.
        //   종전엔 아무 말 없이 이미지 없는 상품이 채널에 올라갔다(사용자 신고의 근원).
        if (!empty($r['ok']) && $operation !== 'unregister') {
            $w = ChannelImage::warning($channel, $product);
            if ($w !== null) $r['warning'] = $w;
        }
        return $r;
    }

    private static function pushProductInner(string $channel, array $creds, array $product, string $operation, ?string $channelProductId): array
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
            // [현 차수] 글로벌 표준 REST 2종 write 보강 — fetch 인증 재사용.
            case 'woocommerce':            return self::woocommerceWrite($creds, $product, $operation, $channelProductId);
            case 'magento':                return self::magentoWrite($creds, $product, $operation, $channelProductId);
            // [237차/235백로그] Shopee·Lazada write 보강 — 각 fetch 어댑터의 검증된 HMAC 인증 재사용.
            //   update=가격/재고/속성 push(writeback 주 용도), unregister=unlist/remove(클린), register=문서기준
            //   add/create(카테고리 등 필수필드는 honest 게이트→미비 시 실에러). 라이브검증 대기(셀러 계정 필요).
            //   (walmart 피드·qoo10/yahoo_jp/godomall 은 write API 피드기반/복잡으로 추정위험 → honest pending 유지.)
            case 'shopee':                 return self::shopeeWrite($creds, $product, $operation, $channelProductId);
            case 'lazada':                 return self::lazadaWrite($creds, $product, $operation, $channelProductId);
            // [현 차수] writeback 5종 신용게이트 실구현(자격증명→즉시 실행 원칙) — 각 fetch 어댑터 검증 인증 재사용.
            //   주 용도=가격/재고 push(update). 신규 등록(register)은 피드/카테고리 필수→honest 게이트. 라이브검증=셀러 계정 필요.
            case 'walmart':                return self::walmartWrite($creds, $product, $operation, $channelProductId);
            case 'qoo10':                  return self::qoo10Write($creds, $product, $operation, $channelProductId);
            case 'yahoo_jp':               return self::yahooJpWrite($creds, $product, $operation, $channelProductId);
            case 'godomall':               return self::godomallWrite($creds, $product, $operation, $channelProductId);
            case 'etsy':                   return self::etsyWrite($creds, $product, $operation, $channelProductId); // [255차 심화] fetch 인증 재사용
            default:                       return ['ok' => false, 'pending' => true, 'error' => 'write_adapter_pending:' . $ch];
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════
       [283차 R2 P0-1] 재고 **전용** 푸시 경로 — 가짜 성공(fake success) 근절.

       ★결함(283차 R1 이 만든 것):
         Wms::enqueueChannelStockSync 가 operation='stock_sync' 잡을 적재했지만, 어댑터에는 stock 전용
         경로가 **한 줄도 없었다**. 잡은 그대로 pushProduct(=상품 전체 upsert)로 흘러갔고,
           ・Shopify: variants[].inventory_quantity 는 Admin REST 2024-01 에서 **read-only** → 재고 불변
           ・Cafe24 : payload(product_name/price/description…)에 **재고 필드 자체가 없다** → 재고 불변
         그런데 채널은 HTTP 200 을 준다 → Catalog 가 status='done' 으로 마감 → **채널 재고는 그대로인데
         "동기화 성공"이 기록**됐다. 초과판매를 막으려던 기능이 초과판매를 은폐한 셈이다.

       ★규약:
         ・성공  : ['ok'=>true, 'op'=>'stock_sync', 'inventory'=>N]  — 채널 재고 API 가 실제로 2xx 를 준 경우만.
         ・보류  : ['ok'=>false,'pending'=>true,'status'=>'no-live-stock-adapter']
                   → 큐에 **보존**된다(done 마감 금지). 어댑터가 추가되는 순간 자동 전송.
         ・실패  : ['ok'=>false,'error'=>…]  — 채널이 거부한 경우(재시도 카운트 소모).
       ★가격을 **절대** 싣지 않는다 — 0원 판매가 유입(P0-3)·기존가 파괴가 이 경로에서 구조적으로 불가능하다.
       ★추측 구현 금지: 재고 API 스펙을 확신할 수 있는 채널만 구현했다. 나머지는 정직하게 보류한다.
       ═══════════════════════════════════════════════════════════════════════════════════════ */

    /** ChannelSync 소관 재고 전용 어댑터(스펙 확정분). 이 목록 밖 = honest pending.
     *  (shopify 는 Catalog 소관 — Catalog::hasStockAdapter 가 합산한다.) */
    public const STOCK_ADAPTERS = ['woocommerce', 'walmart'];

    /** 채널이 재고 전용 실전송 경로를 갖고 있는가(크론 로그·UI 표기용). */
    public static function hasStockAdapter(string $channel): bool
    {
        return in_array(strtolower(trim($channel)), self::STOCK_ADAPTERS, true);
    }

    /**
     * 재고 전용 푸시 디스패치. (shopify 는 Catalog::pushStockToChannel 이 자체 어댑터로 처리한다 —
     *  Shopify 자격증명/URL 규약이 Catalog 쪽에 있기 때문. 여기서는 나머지 채널을 담당.)
     * @param array $p ['sku'=>string, 'inventory'=>int]  ← 가격·상세·이미지는 들어오지 않는다.
     */
    public static function pushStock(string $channel, array $creds, array $p, ?string $channelProductId): array
    {
        $ch  = strtolower(trim($channel));
        $sku = trim((string)($p['sku'] ?? ''));
        if ($sku === '') return ['ok' => false, 'error' => '재고 동기화: SKU 가 없습니다'];
        if (!array_key_exists('inventory', $p) || $p['inventory'] === null || $p['inventory'] === '') {
            return ['ok' => false, 'error' => '재고 동기화: 수량이 없습니다'];
        }
        $qty = max(0, (int)$p['inventory']);
        switch ($ch) {
            case 'woocommerce': return self::woocommerceStock($creds, $sku, $qty, $channelProductId);
            case 'walmart':     return self::walmartStock($creds, $sku, $qty);
            default:
                // honest pending — 어댑터 미보유. done 으로 마감하지 않는다(가짜 성공 0). 외부 호출 0 = 재평가 비용 무시가능.
                return [
                    'ok' => false, 'pending' => true, 'status' => 'no-live-stock-adapter',
                    'error'   => "재고 전용 어댑터 미보유: {$ch} — 이 채널의 재고 API 스펙이 확정되면 큐에 보존된 잡이 자동 전송됩니다(추측 구현으로 가짜 성공을 만들지 않습니다).",
                    'channel' => $ch, 'sku' => $sku, 'inventory' => $qty,
                ];
        }
    }

    /**
     * WooCommerce REST v3 재고 전용 — `PUT /wp-json/wc/v3/products/{id}` 는 **부분 갱신**이다(보낸 필드만 변경).
     *   manage_stock/stock_quantity/stock_status 만 보낸다 → 가격·이름·이미지·상세는 채널의 기존 값 그대로.
     *   (woocommerceWrite 는 전체 upsert 라 재고 잡에 쓰면 가격/상세를 함께 덮어쓴다 — 그래서 별도 경로다.)
     */
    private static function woocommerceStock(array $creds, string $sku, int $qty, ?string $cpid): array
    {
        $site = rtrim(trim((string)($creds['site_url'] ?? '')), '/');
        $ck = trim((string)($creds['consumer_key'] ?? '')); $cs = trim((string)($creds['consumer_secret'] ?? ''));
        if ($site === '' || $ck === '' || $cs === '') return ['ok' => false, 'error' => 'WooCommerce: site_url·consumer_key·consumer_secret 필요'];
        if ($cpid === null || $cpid === '') return ['ok' => false, 'pending' => true, 'status' => 'no-channel-product-id', 'error' => 'WooCommerce 재고: 채널 상품 id 없음 — 상품 등록 후 자동 동기화'];
        if (!str_starts_with($site, 'http')) $site = 'https://' . $site;
        $auth = 'consumer_key=' . rawurlencode($ck) . '&consumer_secret=' . rawurlencode($cs);
        $body = json_encode([
            'manage_stock'   => true,
            'stock_quantity' => $qty,
            'stock_status'   => $qty > 0 ? 'instock' : 'outofstock',
        ], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq('PUT', "{$site}/wp-json/wc/v3/products/" . rawurlencode($cpid) . "?{$auth}", ['Content-Type' => 'application/json'], $body);
        if ($c >= 200 && $c < 300 && isset($b['id'])) {
            return ['ok' => true, 'op' => 'stock_sync', 'channel_product_id' => (string)$b['id'], 'inventory' => $qty];
        }
        return ['ok' => false, 'error' => "WooCommerce 재고 HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /**
     * Walmart Marketplace 재고 전용 — `PUT /v3/inventory?sku=` 는 **재고 전용 엔드포인트**다(가격 무관).
     *   walmartWrite(:3113-3115) 가 이미 쓰고 있는 검증된 경로를 재고 잡에서 단독으로 재사용한다(가격 미전송).
     */
    private static function walmartStock(array $creds, string $sku, int $qty): array
    {
        $cid = trim((string)($creds['client_id'] ?? '')); $cs = trim((string)($creds['client_secret'] ?? ''));
        if ($cid === '' || $cs === '') return ['ok' => false, 'error' => 'Walmart: client_id·client_secret 필요'];
        $basic = base64_encode($cid . ':' . $cs); $corr = uniqid('gg', true);
        [$tc, $tb] = self::httpPost('https://marketplace.walmartapis.com/v3/token',
            ['Authorization' => 'Basic ' . $basic, 'Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json', 'WM_SVC.NAME' => 'Walmart Marketplace', 'WM_QOS.CORRELATION_ID' => $corr],
            'grant_type=client_credentials');
        $tok = (string)($tb['access_token'] ?? '');
        if ($tok === '') return ['ok' => false, 'error' => "Walmart 토큰 발급 실패(code={$tc}) — client_id/secret 확인"];
        $h = ['WM_SEC.ACCESS_TOKEN' => $tok, 'Authorization' => 'Basic ' . $basic, 'WM_QOS.CORRELATION_ID' => $corr, 'WM_SVC.NAME' => 'Walmart Marketplace', 'Accept' => 'application/json', 'Content-Type' => 'application/json'];
        $ip = json_encode(['sku' => $sku, 'quantity' => ['unit' => 'EACH', 'amount' => $qty]], JSON_UNESCAPED_UNICODE);
        [$ic, $ib] = self::httpReq('PUT', 'https://marketplace.walmartapis.com/v3/inventory?sku=' . rawurlencode($sku), $h, $ip);
        if ($ic >= 200 && $ic < 300) return ['ok' => true, 'op' => 'stock_sync', 'channel_product_id' => $sku, 'inventory' => $qty];
        return ['ok' => false, 'error' => "Walmart 재고 HTTP {$ic}", 'detail' => mb_substr(json_encode($ib, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /**
     * [255차 심화] Etsy v3 상품 쓰기 — etsyFetch 인증(api_key=x-api-key·shop_id·oauth_token=Bearer) 재사용.
     *   update=가격/재고 PATCH(listing_id), unregister=state=inactive, register=createDraftListing(필수필드 honest 게이트=taxonomy_id/category).
     *   라이브검증=실 셀러 OAuth 토큰 필요. 자격 미등록 시 상위 awaiting_credentials 보류.
     */
    private static function etsyWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $key = trim((string)($creds['api_key'] ?? '')); $shop = trim((string)($creds['shop_id'] ?? ''));
        $oauth = trim((string)($creds['oauth_token'] ?? $creds['access_token'] ?? ''));
        if ($key === '' || $shop === '' || $oauth === '') return ['ok' => false, 'error' => 'Etsy: api_key(keystring)·shop_id·oauth_token(OAuth Bearer) 필요'];
        $base = "https://openapi.etsy.com/v3/application/shops/" . rawurlencode($shop) . "/listings";
        $h = ['x-api-key' => $key, 'Authorization' => 'Bearer ' . $oauth, 'Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json'];
        $price = round((float)($p['price'] ?? 0), 2);
        $qty   = (int)($p['inventory'] ?? $p['quantity'] ?? 0);
        if ($op === 'unregister') {
            if ($cpid === null || $cpid === '') return ['ok' => false, 'error' => 'Etsy unregister: listing_id 없음'];
            [$c, $b, $err] = self::httpReq('PATCH', $base . '/' . rawurlencode($cpid), $h, http_build_query(['state' => 'inactive']));
            if ($err) return ['ok' => false, 'error' => 'Etsy: ' . $err];
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'channel_product_id' => $cpid, 'op' => 'unregister'] : ['ok' => false, 'error' => 'Etsy unlist 실패(code=' . $c . ')', 'detail' => $b['error'] ?? null];
        }
        if ($cpid !== null && $cpid !== '') { // update — 가격/재고
            $fields = [];
            if ($price > 0) $fields['price'] = $price;
            if ($qty > 0)   $fields['quantity'] = $qty;
            if (!$fields) return ['ok' => false, 'error' => 'Etsy update: 변경할 가격/재고 없음'];
            [$c, $b, $err] = self::httpReq('PATCH', $base . '/' . rawurlencode($cpid), $h, http_build_query($fields));
            if ($err) return ['ok' => false, 'error' => 'Etsy: ' . $err];
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'channel_product_id' => $cpid, 'op' => 'update'] : ['ok' => false, 'error' => 'Etsy update 실패(code=' . $c . ')', 'detail' => $b['error'] ?? null];
        }
        // register — createDraftListing. Etsy 필수: quantity·title·description·price·who_made·when_made·taxonomy_id.
        $taxonomy = (int)($p['category_code'] ?? $p['taxonomy_id'] ?? 0);
        $title = trim((string)($p['name'] ?? '')); $desc = trim((string)($p['description'] ?? $p['name'] ?? ''));
        if ($taxonomy <= 0) return ['ok' => false, 'error' => 'Etsy register: taxonomy_id(카테고리) 필요 — 채널 카테고리 매핑 후 등록'];
        if ($title === '' || $price <= 0) return ['ok' => false, 'error' => 'Etsy register: title·price 필수'];
        $payload = http_build_query([
            'quantity' => max(1, $qty), 'title' => mb_substr($title, 0, 140), 'description' => mb_substr($desc, 0, 2000),
            'price' => self::channelPrice($price, (string)($creds['currency'] ?? 'USD')), 'who_made' => 'i_did', 'when_made' => 'made_to_order', 'taxonomy_id' => $taxonomy, 'type' => 'physical',
        ]);
        [$c, $b, $err] = self::httpReq('POST', $base, $h, $payload);
        if ($err) return ['ok' => false, 'error' => 'Etsy: ' . $err];
        $newId = (string)($b['listing_id'] ?? '');
        if ($c < 200 || $c >= 300 || $newId === '') {
            return ['ok' => false, 'error' => 'Etsy 등록 실패(code=' . $c . ')', 'detail' => $b['error'] ?? null];
        }
        // [현 차수] 이미지 — Etsy 는 상품 생성 payload 에 이미지를 넣을 수 없다. 초안(listing) 을 만든 뒤
        //   listing_id 로 uploadListingImage(multipart) 를 장당 1회 호출해야 한다(2단계).
        //   rank 1 이 대표 이미지. 업로드 실패는 등록 자체를 되돌리지 않는다(초안은 이미 생겼다) —
        //   대신 몇 장이 올라갔는지 결과에 실어 사용자가 즉시 알 수 있게 한다.
        $res = ['ok' => true, 'channel_product_id' => $newId, 'op' => 'register'];
        $imgs = ChannelImage::blobs('etsy', $p);
        if ($imgs) {
            $uploaded = 0;
            $imgUrl = $base . '/' . rawurlencode($newId) . '/images';
            foreach ($imgs as $i => $img) {
                $up = self::uploadMultipart($imgUrl, ['x-api-key' => $key, 'Authorization' => 'Bearer ' . $oauth], 'image', $img, ['rank' => (string)($i + 1)]);
                if ($up['code'] >= 200 && $up['code'] < 300) $uploaded++;
            }
            $res['images_uploaded'] = $uploaded;
            if ($uploaded < count($imgs)) {
                $res['warning'] = '이미지 ' . (count($imgs) - $uploaded) . '/' . count($imgs) . '장이 Etsy 에 업로드되지 않았습니다(상품은 등록됨).';
            }
        }
        return $res;
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
        // [현 차수] 이미지 — Cafe24 는 대표/목록/작은 이미지를 각각 공개 URL 로 받고, 추가 이미지는
        //   additional_image[] 로 받는다. 대표 한 장을 4개 슬롯에 동일 지정해야 목록·상세 어디서도 깨지지 않는다.
        $imgs = self::imageUrls($p, 10);
        if ($imgs) {
            $prod['detail_image'] = $imgs[0];
            $prod['list_image']   = $imgs[0];
            $prod['tiny_image']   = $imgs[0];
            $prod['small_image']  = $imgs[0];
            $extra = array_slice($imgs, 1);
            if ($extra) $prod['additional_image'] = $extra;
        }
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
        $host = 'https://api-gateway.coupang.com';
        $basePath = '/v2/providers/seller_api/apis/api/v1/marketplace/seller-products';
        $sign = function (string $method, string $path) use ($secretKey, $accessKey) {
            $dt = gmdate('ymd\THis\Z');
            $sig = hash_hmac('sha256', $dt . $method . $path, $secretKey);
            return "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$dt}, signature={$sig}";
        };
        // [현 차수 P1] ★op/cpid 분기 — 기존엔 항상 신규등록(POST)만 수행해, 가격/재고 writeback(update)·판매중지
        //   (unregister) 요청마다 쿠팡에 동일 상품이 중복 생성됐다(의도와 정반대).
        if ($op === 'unregister') {
            if ($cpid === null || $cpid === '') return ['ok' => true, 'channel_product_id' => null, 'note' => 'no cpid — skip'];
            $path = $basePath . '/' . rawurlencode((string)$cpid) . '/sales/stop';
            [$c, $b] = self::httpReq('PUT', $host . $path, ['Authorization' => $sign('PUT', $path), 'Content-Type' => 'application/json;charset=UTF-8'], '');
            if ($c >= 200 && $c < 300) return ['ok' => true, 'channel_product_id' => (string)$cpid];
            return ['ok' => false, 'error' => "Coupang stop HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
        }
        $catCode = (int)preg_replace('/\D/', '', (string)($p['category_code'] ?? $p['category'] ?? ''));
        if ($catCode <= 0) return ['ok' => false, 'error' => 'Coupang 상품등록/수정은 노출카테고리코드(displayCategoryCode)가 필요합니다 — 채널 카테고리 매핑에서 쿠팡 코드를 지정하세요'];
        $price = (float)($p['price'] ?? 0); $name = (string)($p['name'] ?? $p['sku'] ?? ''); $sku = (string)($p['sku'] ?? '');
        $item = [
            'itemName' => $name, 'originalPrice' => $price, 'salePrice' => $price,
            'maximumBuyCount' => (int)($p['inventory'] ?? 0), 'sellerProductItemCode' => $sku,
        ];
        // [현 차수] 이미지 — 쿠팡은 item 단위 images[] 를 받는다. 첫 장이 대표(REPRESENTATION), 나머지는 상세(DETAIL).
        //   vendorPath 는 **공개 URL** 이며 쿠팡이 이를 가져가 자체 CDN 에 복사한다. 종전엔 미전송이었다.
        $imgs = self::imageUrls($p, 10);
        if ($imgs) {
            $item['images'] = [];
            foreach ($imgs as $i => $u) {
                $item['images'][] = ['imageOrder' => $i, 'imageType' => $i === 0 ? 'REPRESENTATION' : 'DETAIL', 'vendorPath' => $u];
            }
        }
        $prod = [
            'sellerProductName' => $name, 'vendorId' => $vendorId, 'displayCategoryCode' => $catCode,
            'saleStartedAt' => gmdate('Y-m-d\TH:i:s'), 'saleEndedAt' => '2099-12-31T23:59:59',
            'displayProductName' => $name, 'sellerProductCode' => $sku,
            'items' => [$item],
        ];
        // cpid 있으면 수정(PUT, sellerProductId 동봉), 없으면 신규등록(POST).
        if ($cpid !== null && $cpid !== '') { $method = 'PUT'; $prod['sellerProductId'] = (int)$cpid; }
        else { $method = 'POST'; }
        $payload = json_encode($prod, JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq($method, $host . $basePath, ['Authorization' => $sign($method, $basePath), 'Content-Type' => 'application/json;charset=UTF-8'], $payload);
        if ($c >= 200 && $c < 300 && (($b['code'] ?? '') === 'SUCCESS' || isset($b['data']))) {
            $pid = $b['data'] ?? $cpid; return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null];
        }
        return ['ok' => false, 'error' => "Coupang HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** Naver Commerce 상품 등록 — HMAC 서명 OAuth2 → Bearer → /external/v2/products. ★leafCategoryId 필수. */
    private static function naverWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $clientId = trim((string)($creds['client_id'] ?? '')); $clientSecret = trim((string)($creds['client_secret'] ?? ''));
        if ($clientId === '' || $clientSecret === '') return ['ok' => false, 'error' => 'Naver: client_id·client_secret 필요'];
        $leaf = (string)($p['category_code'] ?? $p['category'] ?? '');
        // [현 차수 P2] leafCategoryId 필수를 '신규등록'에 한정 — 기존엔 update 분기보다 앞서 있어 기존 상품의
        //   가격/재고만 갱신(주용도)할 때도 카테고리코드 없으면 차단됐다. 수정/판매중지는 leaf 없이 진행 허용.
        if ($leaf === '' && $cpid === null && $op !== 'unregister') return ['ok' => false, 'error' => 'Naver 신규 상품등록은 leafCategoryId 가 필요합니다 — 채널 카테고리 매핑에서 네이버 리프카테고리ID를 지정하세요'];
        $ts = (int)(microtime(true) * 1000);
        $sign = self::naverSign($clientId, $clientSecret, $ts);
        [$tc, $tb] = self::httpPost('https://api.commerce.naver.com/external/v1/oauth2/token', ['Content-Type' => 'application/x-www-form-urlencoded'],
            "client_id={$clientId}&timestamp={$ts}&client_secret_sign={$sign}&grant_type=client_credentials&type=SELF");
        $token = (string)($tb['access_token'] ?? '');
        if ($token === '') return ['ok' => false, 'error' => "Naver 토큰 발급 실패(code={$tc})"];
        $price = (int)round((float)($p['price'] ?? 0)); $name = (string)($p['name'] ?? $p['sku'] ?? '');
        // [277차] 상세페이지(HTML)·상품이미지 실림. 종전엔 detailContent 에 spec(규격 한 줄)만 넣고 이미지는
        //   아예 전송하지 않아, 채널에 등록된 상품이 이미지 없는 빈 상세로 올라갔다.
        //   실 API 구조(진단 검증): originProduct.images.{representativeImage:{url}, optionalImages:[{url}]}
        $detail = (string)($p['detail_html'] ?? '');
        if ($detail === '') $detail = (string)($p['spec'] ?? $name);
        $origin = [
            'statusType' => ($op === 'unregister' ? 'SUSPENSION' : 'SALE'), 'saleType' => 'NEW', 'leafCategoryId' => $leaf,
            'name' => $name, 'detailContent' => $detail, 'salePrice' => $price,
            'stockQuantity' => (int)($p['inventory'] ?? 0), 'sellerCodeInfo' => ['sellerManagementCode' => (string)($p['sku'] ?? '')],
        ];
        // 이미지: 첫 장이 대표, 나머지는 추가이미지(네이버 상한 9장).
        //   ★상품등록 폼은 base64 dataURL 로 보관 → 업로드해 공개 URL 로 치환해야 API 가 수용한다.
        $imgs = array_values(array_filter(array_map('strval', (array)($p['images'] ?? [])), static fn($u) => $u !== ''));
        if (!$imgs && (string)($p['image_url'] ?? '') !== '') $imgs = [(string)$p['image_url']];
        if ($imgs) $imgs = self::naverUploadImages($token, $imgs);
        if ($imgs) {
            $origin['images'] = ['representativeImage' => ['url' => $imgs[0]]];
            $extra = array_slice($imgs, 1, 9);
            if ($extra) $origin['images']['optionalImages'] = array_map(static fn($u) => ['url' => $u], $extra);
        }

        // ── [277차] ★신규등록 필수 블록 — 종전 payload 는 이 셋이 전부 빠져 있어 어떤 상품도 등록될 수 없었다.
        //   실 API 400 응답으로 확정: smartstoreChannelProduct(NotNull) · detailAttribute.minorPurchasable(NotNull)
        //   · detailAttribute.productInfoProvidedNotice(NotEmpty). 등록 성공 재현 완료(originProductNo 발급).
        $origin['deliveryInfo'] = self::naverDeliveryInfo($p);
        $origin['detailAttribute'] = self::naverDetailAttribute($p);
        $body = ['originProduct' => $origin, 'smartstoreChannelProduct' => [
            'naverShoppingRegistration'       => (bool)($p['naver_shopping'] ?? false),
            'channelProductDisplayStatusType' => ($op === 'unregister' ? 'SUSPENSION' : 'ON'),
        ]];

        $hdr = ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json'];
        $url = $cpid !== null
            ? "https://api.commerce.naver.com/external/v2/products/origin-products/{$cpid}"
            : 'https://api.commerce.naver.com/external/v2/products';
        $method = $cpid !== null ? 'PUT' : 'POST';

        // ── [277차] ★기존 상품 '정보 변경' — 네이버 PUT 은 originProduct **전체 교체**다.
        //   우리가 만든 payload 만 보내면 채널의 기존 상세·고시·배송·카테고리가 지워지거나(데이터 손실)
        //   leafCategoryId 누락으로 400 이 난다(실증). 그래서 기존 상품을 먼저 조회해 그 위에
        //   **변경 필드만 덮어쓴다**. 가격만 바꾸는 리프라이서도 이 경로라 상세가 보존된다.
        if ($cpid !== null) {
            [$gc, $gb] = self::httpGet($url, $hdr, 30);
            if ($gc === 200 && is_array($gb) && !empty($gb['originProduct'])) {
                $base = (array)$gb['originProduct'];
                // 조회 응답은 값이 없는 객체 필드를 빈 배열 `[]` 로 내려주는데(customerBenefit,
                // detailAttribute.certificationTargetExcludeContent 등 **중첩 포함**), PUT 은 그 자리에 객체를
                // 기대해 역직렬화 400 이 난다(실측: 판매중지·수정 전건 실패). 재귀적으로 제거한다(값 없음 = 미전송).
                $base = self::stripEmptyArrays($base);
                // 우리가 확정적으로 바꾸는 필드만 덮어쓴다(빈 값은 기존 유지 — 값 소실 방지).
                //   ★판매중지(unregister)는 statusType 만 바꾼다. 가격/재고/이름을 함께 보내면 0 으로 덮어써
                //   'salePrice 는 0보다 커야 합니다' 400 이 나고 상품 정보까지 훼손된다(실측).
                $over = ['statusType' => $origin['statusType']];
                if ($op !== 'unregister') {
                    if ($price > 0) $over['salePrice'] = $price;                       // 0/미지정이면 기존 가격 유지
                    if (array_key_exists('inventory', $p)) $over['stockQuantity'] = (int)$p['inventory'];
                    if ($name !== '') $over['name'] = $name;
                    if ((string)($p['detail_html'] ?? '') !== '') $over['detailContent'] = $detail;
                    if (!empty($origin['images'])) $over['images'] = $origin['images'];
                    if ($leaf !== '') $over['leafCategoryId'] = $leaf;
                    if ((string)($p['sku'] ?? '') !== '') $over['sellerCodeInfo'] = $origin['sellerCodeInfo'];
                    // 배송/고시는 사용자가 이번 요청에 값을 실어 보냈을 때만 교체(미전달 시 채널 기존값 보존).
                    if (isset($p['ship_fee_type']) || isset($p['return_ship_fee'])) $over['deliveryInfo'] = $origin['deliveryInfo'];
                    if (!empty($p['notice_category']) || !empty($p['notice_json'])) $over['detailAttribute'] = $origin['detailAttribute'];
                }
                $body['originProduct'] = array_merge($base, $over);
                if (!empty($gb['smartstoreChannelProduct'])) {
                    $body['smartstoreChannelProduct'] = array_merge(
                        self::stripEmptyArrays((array)$gb['smartstoreChannelProduct']),
                        ['channelProductDisplayStatusType' => ($op === 'unregister' ? 'SUSPENSION' : 'ON')]
                    );
                }
            }
        }

        // ★자가치유 재시도 — 상품정보제공고시는 품목마다 필수 필드가 다르고(예: WEAR 는 size·material·manufacturer…),
        //   네이버가 400 invalidInputs 로 누락 필드를 정확히 알려준다. 29품목×수십 필드를 하드코딩하는 대신
        //   응답을 읽어 사용자 고시값(있으면) 또는 법정 허용문구 '상품상세참조'로 채워 재시도한다(최대 2회).
        //   → 네이버가 필드 스펙을 바꿔도 코드 수정 없이 따라간다.
        //   라운드: ①그룹 하위 필수필드 ②조건부 필수(expirationDate 등) ③날짜 포맷 보정 … 여유 있게 6회.
        //   매 라운드 최소 1개 필드가 확정되므로 무한루프는 불가(채울 게 없으면 즉시 break).
        for ($try = 0; $try < 6; $try++) {
            [$c, $b] = self::httpReq($method, $url, $hdr, json_encode($body, JSON_UNESCAPED_UNICODE));
            if ($c >= 200 && $c < 300) {
                $pid = $b['originProductNo'] ?? $b['smartstoreChannelProductNo'] ?? $cpid;
                return ['ok' => true, 'channel_product_id' => $pid !== null ? (string)$pid : null];
            }
            // 날짜 포맷 자가치유 — 네이버는 필드별로 요구 포맷이 다르다(예: cosmetic.expirationDate = 'YYYY-MM').
            //   "날짜 필드[2029-01-01]를 파싱 실패 … at index 7" 을 읽어 값을 index 만큼 잘라 재시도한다.
            //   → 필드별 포맷을 하드코딩하지 않고도 네이버 스펙을 따라간다.
            if (self::naverFixDateFormat($body, (string)($b['message'] ?? ''))) continue;
            $filled = self::naverFillMissingFields($body, (array)($b['invalidInputs'] ?? []), $p);
            if (!$filled) break;   // 채울 게 없으면 재시도 무의미
        }
        // 사용자가 무엇을 고쳐야 하는지 알 수 있도록 네이버의 지적사항을 **행동 가능한 한국어**로 전달한다.
        $detailMsg = $b['message'] ?? $b;
        if (!empty($b['invalidInputs'])) {
            $hints = [];
            foreach ((array)$b['invalidInputs'] as $i) {
                $n = (string)($i['name'] ?? '');
                if ($n === '') { $hints[] = (string)($i['message'] ?? ''); continue; }
                $short = preg_replace('/^originProduct\.(detailAttribute\.)?/', '', $n);
                $hints[] = self::naverFieldHint($short);
            }
            $hints = array_values(array_filter(array_unique($hints)));
            $detailMsg = ($b['message'] ?? '') . ' → ' . implode(' / ', array_slice($hints, 0, 4));
        }
        return ['ok' => false, 'error' => "Naver HTTP {$c}", 'detail' => mb_substr(is_string($detailMsg) ? $detailMsg : json_encode($detailMsg, JSON_UNESCAPED_UNICODE), 0, 300)];
    }

    /**
     * [277차] 네이버 배송정보 — 신규등록 필수. 계정 공통 배송/반품 설정(po_fulfillment, 276차)과 상품별 예외를 반영.
     *   값이 없으면 무료배송·기본 반품/교환비로 안전 기본값(등록 자체가 막히지 않도록).
     */
    private static function naverDeliveryInfo(array $p): array
    {
        $shipFeeType = (string)($p['ship_fee_type'] ?? '');
        $shipFee     = (int)($p['ship_fee'] ?? 0);
        $isFree      = ($shipFeeType === 'free') || $shipFee <= 0;
        return [
            'deliveryType'          => 'DELIVERY',
            'deliveryAttributeType' => 'NORMAL',
            // deliveryCompany 는 네이버 택배사 enum(필수). 사용자가 지정한 반품택배사를 매핑하고, 미지정 시 CJ대한통운.
            'deliveryCompany'       => self::naverCourierCode((string)($p['return_courier'] ?? '')),
            // deliveryFeePayType: 배송비 결제방식(선결제). 신규등록 필수 enum — 조회 응답에는 나오지 않는다.
            'deliveryFee' => $isFree
                ? ['deliveryFeeType' => 'FREE', 'baseFee' => 0, 'deliveryFeePayType' => 'PREPAID']
                : ['deliveryFeeType' => 'PAID', 'baseFee' => $shipFee, 'deliveryFeePayType' => 'PREPAID'],
            'claimDeliveryInfo' => [
                'returnDeliveryFee'   => (int)($p['return_ship_fee'] ?? 3000),
                'exchangeDeliveryFee' => (int)($p['exchange_ship_fee'] ?? 6000),
            ],
        ];
    }

    /** 택배사명(한글/영문) → 네이버 deliveryCompany enum. 미지정·미매핑은 CJ대한통운(국내 점유 1위·안전 기본값). */
    private static function naverCourierCode(string $name): string
    {
        $n = strtolower(str_replace(' ', '', trim($name)));
        if ($n === '') return 'CJGLS';
        static $map = [
            'cj' => 'CJGLS', 'cj대한통운' => 'CJGLS', '대한통운' => 'CJGLS', 'cjgls' => 'CJGLS',
            '한진' => 'HANJIN', '한진택배' => 'HANJIN', 'hanjin' => 'HANJIN',
            '롯데' => 'HYUNDAI', '롯데택배' => 'HYUNDAI', '현대' => 'HYUNDAI', 'hyundai' => 'HYUNDAI',
            '로젠' => 'KGB', '로젠택배' => 'KGB', 'kgb' => 'KGB',
            '우체국' => 'EPOST', '우체국택배' => 'EPOST', 'epost' => 'EPOST',
            '경동' => 'KDEXP', '경동택배' => 'KDEXP', 'kdexp' => 'KDEXP',
            '대신' => 'DAESIN', '일양' => 'ILYANG', '천일' => 'CHUNIL', '건영' => 'KUNYOUNG',
        ];
        return $map[$n] ?? 'CJGLS';
    }

    /** [277차] 네이버 detailAttribute — AS·원산지·미성년자 구매가능·상품정보제공고시(법정). 전부 신규등록 필수. */
    private static function naverDetailAttribute(array $p): array
    {
        $asPhone = trim((string)($p['as_phone'] ?? ''));
        $asGuide = trim((string)($p['as_guide'] ?? ''));
        $minor   = (string)($p['minor_purchase'] ?? '');
        return [
            'afterServiceInfo' => [
                'afterServiceTelephoneNumber' => $asPhone !== '' ? $asPhone : '000-0000-0000',
                'afterServiceGuideContent'    => $asGuide !== '' ? $asGuide : '상품상세참조',
            ],
            'originAreaInfo' => [
                'originAreaCode' => '00',            // 00 = 국산(네이버 코드)
                'content'        => trim((string)($p['origin'] ?? '')) ?: '상품상세참조',
                'plural'         => false,
            ],
            // 'N'/'false' 만 불가로 보고 그 외에는 구매가능(기본값). 276차 폼의 minor_purchase 를 그대로 해석.
            'minorPurchasable' => !in_array(strtolower($minor), ['n', 'no', 'false', '0', '불가'], true),
            // 고시는 {type, <groupKey>:{...}} 구조. 그룹 객체를 미리 만들어 둬야 네이버가 하위 필수필드를
            //   invalidInputs 로 알려주고, 자가치유가 그 필드만 채운다(그룹을 문자열로 채우면 역직렬화 400).
            'productInfoProvidedNotice' => [
                'productInfoProvidedNoticeType' => ($nt = self::naverNoticeType($p)),
                self::naverNoticeGroupKey($nt) => new \stdClass(),
            ],
        ];
    }

    /** 네이버 고시 타입(ENUM) → payload 그룹 키(camelCase). 예: GENERAL_FOOD → generalFood, WEAR → wear. */
    private static function naverNoticeGroupKey(string $type): string
    {
        $parts = explode('_', strtolower($type));
        return $parts[0] . implode('', array_map('ucfirst', array_slice($parts, 1)));
    }

    /** 우리 상품정보제공고시 품목(276차 productNoticeTemplates 29종) → 네이버 productInfoProvidedNoticeType. */
    private static function naverNoticeType(array $p): string
    {
        static $map = [
            'wear' => 'WEAR', 'shoes' => 'SHOES', 'bag' => 'BAG', 'fashion' => 'FASHION_ITEMS',
            'bedding' => 'SLEEPING_GEAR', 'furniture' => 'FURNITURE', 'av' => 'IMAGE_APPLIANCES',
            'homeappliance' => 'HOME_APPLIANCES', 'seasonappliance' => 'SEASON_APPLIANCES',
            'office' => 'OFFICE_APPLIANCES', 'optics' => 'OPTICS_APPLIANCES', 'smallelec' => 'MICROELECTRONICS',
            'mobile' => 'CELLPHONE', 'navigation' => 'NAVIGATION', 'carparts' => 'CAR_ARTICLES',
            'medical' => 'MEDICAL_APPLIANCES', 'kitchen' => 'KITCHEN_UTENSILS', 'cosmetic' => 'COSMETIC',
            'jewelry' => 'JEWELLERY', 'food' => 'GENERAL_FOOD', 'healthfood' => 'HEALTH_FUNCTIONAL_FOOD',
            'baby' => 'KIDS', 'sports' => 'SPORTS_EQUIPMENT', 'instrument' => 'MUSICAL_INSTRUMENT',
            'book' => 'BOOKS', 'chemical' => 'BIOCHEMISTRY', 'biocidal' => 'BIOCIDAL',
            'digitalcontent' => 'GIFT_CARD', 'etc' => 'ETC',
        ];
        $k = strtolower(trim((string)($p['notice_category'] ?? '')));
        return $map[$k] ?? 'ETC';   // 미지정/미매핑은 '기타 재화'(전 품목 공통) — 네이버가 허용하는 안전 기본값
    }

    /**
     * [277차] 400 invalidInputs 를 읽어 누락 필드를 채운다(자가치유). 반환=하나라도 채웠는가.
     *   값 우선순위: ① 사용자가 상품등록에서 입력한 고시값(라벨 유사매칭) ② 법정 허용문구 '상품상세참조'.
     *   ★날조 금지 — 실제 값을 지어내지 않고, 법이 허용하는 참조문구만 사용한다.
     */
    private static function naverFillMissingFields(array &$body, array $invalidInputs, array $product): bool
    {
        if (!$invalidInputs) return false;
        $noticeItems = [];
        $nj = $product['notice_json'] ?? '';
        if (is_string($nj) && $nj !== '') { $d = json_decode($nj, true); if (is_array($d)) $noticeItems = (array)($d['items'] ?? []); }
        elseif (is_array($nj)) { $noticeItems = (array)($nj['items'] ?? []); }

        // enum·코드성 필드는 임의 문자열로 채우면 그대로 다시 400 이다. 자가치유 대상에서 제외하고
        // 정식 매핑(naverDeliveryInfo 등)이 책임진다 — 값을 지어내지 않기 위한 안전장치.
        static $noAutoFill = ['deliveryCompany', 'deliveryType', 'deliveryAttributeType', 'deliveryFeeType',
                              'deliveryFeePayType', 'originAreaCode', 'productInfoProvidedNoticeType',
                              'statusType', 'saleType'];

        $changed = false;
        foreach ($invalidInputs as $iv) {
            $name = (string)($iv['name'] ?? '');
            if ($name === '' || !str_starts_with($name, 'originProduct.')) continue;
            $path = explode('.', substr($name, strlen('originProduct.')));
            $leafKey = (string)end($path);
            if (in_array($leafKey, $noAutoFill, true)) continue;
            // ★그룹/컨테이너 레벨(예: …productInfoProvidedNotice 또는 …productInfoProvidedNotice.wear)은
            //   문자열로 채우면 역직렬화 400 이다. 객체로 만들어 두고 하위 필드 요구를 기다린다.
            $isContainer = ($leafKey === 'productInfoProvidedNotice')
                || (count($path) >= 2 && $path[count($path) - 2] === 'productInfoProvidedNotice');

            $ref = &$body['originProduct'];
            foreach (array_slice($path, 0, -1) as $seg) {
                if (!isset($ref[$seg]) || (!is_array($ref[$seg]) && !($ref[$seg] instanceof \stdClass))) $ref[$seg] = [];
                if ($ref[$seg] instanceof \stdClass) $ref[$seg] = (array)$ref[$seg];
                $ref = &$ref[$seg];
            }
            $cur = $ref[$leafKey] ?? null;
            $empty = ($cur === null || $cur === '' || ($cur instanceof \stdClass) || (is_array($cur) && !$cur));
            $type = (string)($iv['type'] ?? '');
            if ($empty && in_array($type, ['NotNull', 'NotEmpty', 'NotBlank'], true)) {
                if ($isContainer) {
                    if ($cur === null) { $ref[$leafKey] = new \stdClass(); $changed = true; }
                } elseif (preg_match('/(Yn|Check|geneticallyModified|importDeclarationCheck)$/i', $leafKey)) {
                    $ref[$leafKey] = false; $changed = true;   // 불리언성 필드
                } elseif (preg_match('/(date|expiration|expiry|useBy)/i', $leafKey)) {
                    // ★날짜 필드는 '상품상세참조' 문자열을 넣으면 파싱 400 이다. 값을 지어내지도 않는다.
                    //   상품등록 폼의 제조일자/유효기간(276차)에서만 채우고, 없으면 채우지 않아 네이버 오류를
                    //   그대로 사용자에게 노출한다(무엇을 입력해야 하는지 알 수 있게).
                    $d = self::noticeDateValue($leafKey, $product);
                    if ($d !== null) { $ref[$leafKey] = $d; $changed = true; }
                } else {
                    $ref[$leafKey] = self::matchNoticeValue($leafKey, $noticeItems) ?? '상품상세참조';
                    $changed = true;
                }
            }
            unset($ref);
        }
        return $changed;
    }

    /**
     * [277차] 조회 응답의 빈 배열 `[]` 을 **재귀적으로** 제거한다.
     *   네이버 GET 은 값이 없는 객체 필드를 `[]` 로 내려주지만 PUT 은 그 자리에 객체를 기대해 400 이 난다
     *   (customerBenefit, detailAttribute.certificationTargetExcludeContent 등). 값 없음 = 미전송이 정답.
     *   ★리스트 필드(optionalImages 등)의 빈 배열도 제거되지만, 미전송 시 채널 기존값이 유지되므로 안전하다.
     */
    private static function stripEmptyArrays(array $a): array
    {
        foreach ($a as $k => $v) {
            if (is_array($v)) {
                if ($v === []) { unset($a[$k]); continue; }
                $a[$k] = self::stripEmptyArrays($v);
                if ($a[$k] === []) unset($a[$k]);
            }
        }
        return $a;
    }

    /**
     * [277차] 네이버 필드 경로 → 사용자가 무엇을 해야 하는지 알 수 있는 한국어 안내.
     *   자가치유가 채우지 못하는 필드(=사용자 입력이 필요한 값)만 실제로 노출된다.
     */
    private static function naverFieldHint(string $path): string
    {
        $leaf = (string)(explode('.', $path)[count(explode('.', $path)) - 1] ?? $path);
        static $map = [
            'expirationDate' => "상품등록의 '유효일자(사용기한)'를 입력하세요",
            'manufactureDate' => "상품등록의 '제조일자'를 입력하세요",
            'leafCategoryId'  => '채널 카테고리를 선택하세요',
            'deliveryCompany' => "배송/반품 설정의 '택배사'를 지정하세요",
            'images'          => '대표 이미지가 필요합니다 — 상품등록에서 이미지를 추가하세요',
            'representativeImage' => '대표 이미지가 필요합니다 — 상품등록에서 이미지를 추가하세요',
            'salePrice'       => '판매가는 0보다 커야 합니다',
            'stockQuantity'   => '재고 수량을 입력하세요',
            'name'            => '상품명을 입력하세요',
            'afterServiceTelephoneNumber' => "상품등록의 'A/S 전화번호'를 입력하세요",
            'originAreaCode'  => '원산지를 입력하세요',
        ];
        if (isset($map[$leaf])) return $map[$leaf];
        if (str_contains($path, 'productInfoProvidedNotice')) {
            return "상품정보제공고시 항목({$leaf})을 입력하세요";
        }
        return $path;   // 매핑 없는 필드는 원문 그대로(거짓 안내 금지)
    }

    /**
     * [277차] 날짜 포맷 자가치유 — 네이버 400 message 에서 실패한 값과 파싱 중단 위치를 읽어 값을 잘라낸다.
     *   예: "날짜 필드[2029-01-01]를 파싱 실패하였습니다. … unparsed text found at index 7" → '2029-01'.
     *   반환=치환했는가. 값을 지어내지 않고 사용자가 입력한 날짜를 필드가 요구하는 정밀도로 줄일 뿐이다.
     */
    private static function naverFixDateFormat(array &$body, string $message): bool
    {
        if ($message === '' || !str_contains($message, '날짜 필드')) return false;
        if (!preg_match('/날짜 필드\[([^\]]+)\]/u', $message, $m)) return false;
        $bad = $m[1];
        if (!preg_match('/index (\d+)/', $message, $im)) return false;
        $cut = (int)$im[1];
        if ($cut <= 0 || $cut >= mb_strlen($bad)) return false;
        $fixed = mb_substr($bad, 0, $cut);
        $replaced = false;
        $walk = function (&$node) use (&$walk, $bad, $fixed, &$replaced) {
            if (is_array($node)) { foreach ($node as &$v) { $walk($v); } unset($v); return; }
            if (is_string($node) && $node === $bad) { $node = $fixed; $replaced = true; }
        };
        $walk($body);
        return $replaced;
    }

    /**
     * [277차] 고시의 날짜성 필드 값 — 상품등록 폼의 제조일자/유효기간(mfg_date·expiry_date)에서만 가져온다.
     *   임의 날짜를 지어내지 않는다(헌법: 날조 금지). 값이 없으면 null → 네이버 오류를 사용자에게 전달.
     *   네이버는 'YYYY-MM-DD' 를 수용한다.
     */
    private static function noticeDateValue(string $field, array $product): ?string
    {
        $mfg = trim((string)($product['mfg_date'] ?? ''));
        $exp = trim((string)($product['expiry_date'] ?? ''));
        $isMfg = (bool)preg_match('/(manufactur|pack|production)/i', $field);
        $v = $isMfg ? $mfg : ($exp ?: $mfg);
        if ($v === '') return null;
        // 'YYYY.MM.DD' / 'YYYYMMDD' → 'YYYY-MM-DD'
        $v = str_replace(['.', '/'], '-', $v);
        if (preg_match('/^\d{8}$/', $v)) $v = substr($v, 0, 4) . '-' . substr($v, 4, 2) . '-' . substr($v, 6, 2);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
    }

    /** 네이버 필드명(camelCase) 과 사용자 고시 항목(한글 라벨)을 느슨 매칭. 없으면 null. */
    private static function matchNoticeValue(string $field, array $items): ?string
    {
        if (!$items) return null;
        static $hint = [
            'productName' => ['제품명', '상품명'], 'manufacturer' => ['제조자', '제조사', '수입자'],
            'material' => ['소재', '재질'], 'size' => ['치수', '크기', '사이즈'], 'color' => ['색상'],
            'warrantyPolicy' => ['품질보증', '보증'], 'afterServiceDirector' => ['A/S', 'AS', '책임자', '전화'],
            'caution' => ['취급', '주의'], 'modelName' => ['모델', '모델명'], 'itemName' => ['품명'],
            'customerServicePhoneNumber' => ['전화', '연락처'], 'producer' => ['생산자', '제조'],
            'location' => ['소재지', '원산지'], 'ingredients' => ['원재료', '성분'],
            'weight' => ['중량', '용량'], 'amount' => ['수량', '용량'],
        ];
        $cands = $hint[$field] ?? [];
        foreach ($items as $label => $val) {
            $v = trim((string)$val);
            if ($v === '') continue;
            foreach ($cands as $c) { if (mb_strpos((string)$label, $c) !== false) return $v; }
        }
        return null;
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
        $product = ['title' => (string)($p['name'] ?? $sku), 'description' => (string)($p['spec'] ?? $p['name'] ?? '')];
        // [현 차수] 이미지 — eBay inventory_item 은 product.imageUrls 에 **공개 URL 배열**을 받는다(최대 12장).
        //   HTTPS 여야 하며 eBay 가 가져가 자체 호스팅한다. 종전엔 미전송이라 이미지 없는 리스팅이 만들어졌다.
        $imgs = array_values(array_filter(self::imageUrls($p, 12), static fn($u) => str_starts_with($u, 'https://')));
        if ($imgs) $product['imageUrls'] = $imgs;
        $body = json_encode([
            'availability' => ['shipToLocationAvailability' => ['quantity' => (int)($p['inventory'] ?? 0)]],
            'condition' => 'NEW',
            'product' => $product,
        ], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq('PUT', $url, $hdr, $body);
        if ($c >= 200 && $c < 300) return ['ok' => true, 'channel_product_id' => $sku, 'note' => 'inventory_item 등록 완료 — 판매 노출(offer)은 카테고리·정책 ID 필요'];
        return ['ok' => false, 'error' => "eBay HTTP {$c}", 'detail' => mb_substr(json_encode($b['errors'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** Walmart Marketplace 쓰기 — client_credentials 토큰 재사용. update=가격(/v3/price)+재고(/v3/inventory) push(writeback 주용도),
     *   unregister=MP_ITEM_RETIRE 피드. 신규 register 는 MP_ITEM 피드+카테고리/속성 필요 → honest 게이트. */
    private static function walmartWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $cid = trim((string)($creds['client_id'] ?? '')); $cs = trim((string)($creds['client_secret'] ?? ''));
        if ($cid === '' || $cs === '') return ['ok' => false, 'error' => 'Walmart: client_id·client_secret 필요'];
        $sku = (string)($p['sku'] ?? '');
        if ($sku === '') return ['ok' => false, 'error' => 'Walmart 쓰기는 SKU 가 필요합니다'];
        $basic = base64_encode($cid . ':' . $cs); $corr = uniqid('gg', true);
        [$tc, $tb] = self::httpPost('https://marketplace.walmartapis.com/v3/token',
            ['Authorization' => 'Basic ' . $basic, 'Content-Type' => 'application/x-www-form-urlencoded', 'Accept' => 'application/json', 'WM_SVC.NAME' => 'Walmart Marketplace', 'WM_QOS.CORRELATION_ID' => $corr],
            'grant_type=client_credentials');
        $tok = (string)($tb['access_token'] ?? '');
        if ($tok === '') return ['ok' => false, 'error' => "Walmart 토큰 발급 실패(code={$tc}) — client_id/secret 확인"];
        $h = ['WM_SEC.ACCESS_TOKEN' => $tok, 'Authorization' => 'Basic ' . $basic, 'WM_QOS.CORRELATION_ID' => $corr, 'WM_SVC.NAME' => 'Walmart Marketplace', 'Accept' => 'application/json', 'Content-Type' => 'application/json'];
        // [245차 P3-8] 신규 상품 등록(CREATE) — MP_ITEM 피드. productType(category)·productName 필수(카테고리별 필수속성은 셀러센터 스키마).
        if ($op === 'register' || ($p['action'] ?? '') === 'register') {
            $ptype = (string)($p['channel_category'] ?? $p['category'] ?? ''); $name = (string)($p['name'] ?? '');
            if ($ptype === '' || $name === '') return ['ok' => false, 'pending' => true, 'error' => 'Walmart 신규등록(MP_ITEM): productName·productType(category) 필요'];
            $item = ['sku' => $sku, 'productIdentifiers' => [['productIdType' => 'GTIN', 'productId' => (string)($p['gtin'] ?? $p['barcode'] ?? '')]],
                'MPProduct' => ['productName' => $name, 'category' => $ptype], 'price' => (float)($p['price'] ?? 0), 'shippingWeight' => ['value' => 1.0, 'unit' => 'LB']];
            $feed = json_encode(['MPItemFeedHeader' => ['version' => '4.2', 'sellingChannel' => 'marketplace'], 'MPItem' => [$item]], JSON_UNESCAPED_UNICODE);
            [$cc, $cb] = self::httpReq('POST', 'https://marketplace.walmartapis.com/v3/feeds?feedType=MP_ITEM', $h, $feed);
            if ($cc >= 200 && $cc < 300) return ['ok' => true, 'channel_product_id' => (string)($cb['feedId'] ?? $sku), 'note' => 'Walmart MP_ITEM 신규등록 피드 제출(피드 처리 후 활성 — feed status 확인. 카테고리 필수속성 누락 시 피드 거부 가능)'];
            return ['ok' => false, 'error' => "Walmart 신규등록 HTTP {$cc}", 'detail' => mb_substr(json_encode($cb, JSON_UNESCAPED_UNICODE), 0, 200)];
        }
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            $feed = json_encode(['MPItemFeedHeader' => ['version' => '1.0'], 'MPItem' => [['sku' => $sku]]], JSON_UNESCAPED_UNICODE);
            [$c, $b] = self::httpReq('POST', 'https://marketplace.walmartapis.com/v3/feeds?feedType=MP_ITEM_RETIRE', $h, $feed);
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'channel_product_id' => $sku, 'note' => 'Walmart retire 피드 제출'] : ['ok' => false, 'error' => "Walmart retire HTTP {$c}"];
        }
        // 가격/재고 push(writeback 핵심). 둘 중 하나라도 성공하면 ok.
        $price = (float)($p['price'] ?? 0); $qty = (int)($p['inventory'] ?? 0); $okAny = false; $errs = [];
        if ($price > 0) {
            $pp = json_encode(['sku' => $sku, 'pricing' => [['currentPriceType' => 'BASE', 'currentPrice' => ['currency' => 'USD', 'amount' => self::channelPrice($price, 'USD')]]]], JSON_UNESCAPED_UNICODE);
            [$pc] = self::httpReq('PUT', 'https://marketplace.walmartapis.com/v3/price', $h, $pp);
            if ($pc >= 200 && $pc < 300) $okAny = true; else $errs[] = "price HTTP {$pc}";
        }
        $ip = json_encode(['sku' => $sku, 'quantity' => ['unit' => 'EACH', 'amount' => $qty]], JSON_UNESCAPED_UNICODE);
        [$ic] = self::httpReq('PUT', 'https://marketplace.walmartapis.com/v3/inventory?sku=' . rawurlencode($sku), $h, $ip);
        if ($ic >= 200 && $ic < 300) $okAny = true; else $errs[] = "inventory HTTP {$ic}";
        if ($okAny) return ['ok' => true, 'channel_product_id' => $cpid ?? $sku, 'note' => 'Walmart 가격/재고 push 완료(신규 상품등록은 MP_ITEM 피드+카테고리 필요)'];
        return ['ok' => false, 'error' => 'Walmart 쓰기 실패: ' . implode(', ', $errs)];
    }

    /** Qoo10 QSM OpenAPI 쓰기 — ApiKey 재사용. update=가격/수량(ItemsBasic.UpdateGoods), unregister=판매중지.
     *   신규 등록(SetNewGoods)은 카테고리/배송 등 다수 필수필드 → honest 게이트. */
    private static function qoo10Write(array $creds, array $p, string $op, ?string $cpid): array
    {
        $key = trim((string)($creds['api_key'] ?? ''));
        if ($key === '') return ['ok' => false, 'error' => 'Qoo10: QSM API 키(api_key) 필요'];
        $itemCode = (string)($cpid ?? $p['channel_product_id'] ?? '');
        $sellerCode = (string)($p['sku'] ?? '');
        if ($itemCode === '' && $sellerCode === '') return ['ok' => false, 'error' => 'Qoo10 쓰기는 ItemCode(channel_product_id) 또는 SellerCode(sku) 필요'];
        $base = 'https://api.qoo10.com/GMKT.INC.Front.QAPIService/ebayjapan.qapi';
        // [245차 P3-8] 신규 상품 등록(CREATE) — SetNewGoods. 카테고리(SecondSubCat)·상품명·ShippingNo 필수.
        if ($op === 'register' || ($p['action'] ?? '') === 'register') {
            $cate = (string)($p['channel_category'] ?? $p['category'] ?? ''); $name = (string)($p['name'] ?? '');
            $shipNo = (string)($creds['shipping_no'] ?? $p['shipping_no'] ?? '');
            if ($cate === '' || $name === '' || $shipNo === '')
                return ['ok' => false, 'pending' => true, 'error' => 'Qoo10 신규등록(SetNewGoods): 상품명·SecondSubCat(category)·ShippingNo(creds shipping_no) 필요'];
            // [279차 감사 A-1] Qoo10 site 통화(QSM Korea=KRW 기본). creds.currency 지정 시 환산, 미지정=무변환(KRW).
            $q = http_build_query(['v' => '1.1', 'method' => 'ItemsBasic.SetNewGoods', 'key' => $key, 'SecondSubCat' => $cate, 'ItemTitle' => $name,
                'SellPrice' => self::channelPrice((float)($p['price'] ?? 0), (string)($creds['currency'] ?? '')), 'ItemQty' => (int)($p['inventory'] ?? 0), 'SellerCode' => $sellerCode, 'ShippingNo' => $shipNo,
                'AdultYN' => 'N', 'StandardImage' => (string)($p['image'] ?? ''), 'returnType' => 'json']);
            [$cc, $cb] = self::httpGet("{$base}?{$q}");
            if ($cc < 400 && (int)($cb['ResultCode'] ?? -1) === 0) return ['ok' => true, 'channel_product_id' => (string)($cb['ResultObject'] ?? $sellerCode), 'note' => 'Qoo10 신규 상품 등록 완료'];
            return ['ok' => false, 'error' => "Qoo10 신규등록 실패(code={$cc}/" . ($cb['ResultCode'] ?? '?') . ')', 'detail' => mb_substr((string)($cb['ResultMsg'] ?? ''), 0, 150)];
        }
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            $q = http_build_query(['v' => '1.1', 'method' => 'ItemsBasic.UpdateGoodsStatus', 'key' => $key, 'ItemCode' => $itemCode, 'Status' => 'S2', 'returnType' => 'json']);
            [$c, $b] = self::httpGet("{$base}?{$q}");
            return ($c < 400 && (int)($b['ResultCode'] ?? -1) === 0) ? ['ok' => true, 'channel_product_id' => $itemCode] : ['ok' => false, 'error' => "Qoo10 판매중지 실패(code={$c}/{$b['ResultCode']})", 'detail' => mb_substr((string)($b['ResultMsg'] ?? ''), 0, 150)];
        }
        $price = (float)($p['price'] ?? 0); $qty = (int)($p['inventory'] ?? 0);
        $q = http_build_query(['v' => '1.1', 'method' => 'ItemsBasic.UpdateGoods', 'key' => $key,
            'ItemCode' => $itemCode, 'SellerCode' => $sellerCode, 'SellPrice' => $price, 'ItemQty' => $qty, 'returnType' => 'json']);
        [$c, $b] = self::httpGet("{$base}?{$q}");
        if ($c < 400 && (int)($b['ResultCode'] ?? -1) === 0) return ['ok' => true, 'channel_product_id' => $itemCode ?: $sellerCode, 'note' => 'Qoo10 가격/수량 push(신규 등록은 카테고리·배송정보 필요)'];
        return ['ok' => false, 'error' => "Qoo10 쓰기 실패(code={$c}/" . ($b['ResultCode'] ?? '?') . ')', 'detail' => mb_substr((string)($b['ResultMsg'] ?? json_encode($b, JSON_UNESCAPED_UNICODE)), 0, 150)];
    }

    /** Yahoo! Japan Shopping 쓰기 — OAuth Bearer + seller_id 재사용(editItem XML). update=가격/재고, unregister=비공개(available=false).
     *   신규 등록은 카테고리/스펙 다수 필수 → honest 게이트. */
    private static function yahooJpWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $tok = trim((string)($creds['access_token'] ?? '')); $seller = trim((string)($creds['seller_id'] ?? ''));
        if ($tok === '' || $seller === '') return ['ok' => false, 'error' => 'Yahoo! Japan: access_token(OAuth)·seller_id 필요'];
        $itemCode = (string)($cpid ?? $p['channel_product_id'] ?? $p['sku'] ?? '');
        if ($itemCode === '') return ['ok' => false, 'error' => 'Yahoo! Japan 쓰기는 ItemCode(상품코드) 필요'];
        // [245차 P3-8] 신규 상품 등록(CREATE) — addItem. CategoryId(category)·ItemName 필수.
        if ($op === 'register' || ($p['action'] ?? '') === 'register') {
            $cate = (string)($p['channel_category'] ?? $p['category'] ?? ''); $name = (string)($p['name'] ?? '');
            if ($cate === '' || $name === '') return ['ok' => false, 'pending' => true, 'error' => 'Yahoo! Japan 신규등록(addItem): ItemName·CategoryId(category) 필요'];
            $cbody = '<Req><SellerId>' . htmlspecialchars($seller) . '</SellerId><ItemCode>' . htmlspecialchars($itemCode) . '</ItemCode><CategoryId>' . htmlspecialchars($cate) . '</CategoryId><ItemName>' . htmlspecialchars($name) . '</ItemName><Price>' . ((int)self::channelPrice((float)($p['price'] ?? 0), 'JPY')) . '</Price><Quantity>' . ((int)($p['inventory'] ?? 0)) . '</Quantity><Available>true</Available></Req>';
            [$cc, $craw] = self::httpReqXml('https://circus.shopping.yahooapis.jp/ShoppingWebService/V1/addItem', ['Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/xml'], $cbody);
            if ($cc >= 200 && $cc < 300 && stripos((string)$craw, '<Error') === false) return ['ok' => true, 'channel_product_id' => $itemCode, 'note' => 'Yahoo! Japan 신규 상품 등록 완료'];
            return ['ok' => false, 'error' => "Yahoo! Japan 신규등록 실패(code={$cc})", 'detail' => mb_substr((string)$craw, 0, 200)];
        }
        $unreg = ($op === 'unregister' || ($p['action'] ?? '') === 'unregister');
        $price = (int)round((float)($p['price'] ?? 0)); $qty = (int)($p['inventory'] ?? 0);
        $fields = '<SellerId>' . htmlspecialchars($seller) . '</SellerId><ItemCode>' . htmlspecialchars($itemCode) . '</ItemCode>'
            . ($unreg ? '<Available>false</Available>' : ('<Price>' . $price . '</Price><Quantity>' . $qty . '</Quantity><Available>true</Available>'));
        $body = '<Req>' . $fields . '</Req>';
        [$c, $raw] = self::httpReqXml('https://circus.shopping.yahooapis.jp/ShoppingWebService/V1/editItem',
            ['Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/xml'], $body);
        if ($c >= 200 && $c < 300 && stripos((string)$raw, '<Error') === false) return ['ok' => true, 'channel_product_id' => $itemCode, 'note' => 'Yahoo! Japan 가격/재고 push(신규 등록은 카테고리·스펙 필요)'];
        return ['ok' => false, 'error' => "Yahoo! Japan 쓰기 실패(code={$c})", 'detail' => mb_substr((string)$raw, 0, 200)];
    }

    /** godomall(고도5) 쓰기 — partner_key+api_key+mall_url 재사용(/api/goods.php). update=가격/재고, unregister=판매안함.
     *   신규 등록은 카테고리/이미지 등 필수 → honest 게이트. */
    private static function godomallWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $pkey = trim((string)($creds['partner_key'] ?? '')); $apiKey = trim((string)($creds['api_key'] ?? ''));
        $mall = rtrim(trim((string)($creds['mall_url'] ?? '')), '/');
        if ($pkey === '' || $apiKey === '' || $mall === '') return ['ok' => false, 'error' => 'godomall: partner_key·api_key·mall_url 필요'];
        if (!str_starts_with($mall, 'http')) $mall = 'https://' . $mall;
        $goodsNo = (string)($cpid ?? $p['channel_product_id'] ?? '');
        $sku = (string)($p['sku'] ?? '');
        if ($goodsNo === '' && $sku === '') return ['ok' => false, 'error' => 'godomall 쓰기는 goodsNo(channel_product_id) 또는 goodsCd(sku) 필요'];
        $unreg = ($op === 'unregister' || ($p['action'] ?? '') === 'unregister');
        $isCreate = ($op === 'register' || ($p['action'] ?? '') === 'register' || ($goodsNo === '' && $sku === '' && !$unreg));
        // [245차 P3-8] 신규 상품 등록(CREATE) — registGoods. 채널 카테고리코드(category/channel_category)·상품명·가격 필수.
        if ($isCreate) {
            $cate = (string)($p['channel_category'] ?? $p['category'] ?? '');
            $name = (string)($p['name'] ?? '');
            if ($cate === '' || $name === '') return ['ok' => false, 'pending' => true, 'error' => 'godomall 신규등록: 상품명·채널 카테고리코드(category) 필요 — [상품관리]에서 채널 카테고리 매핑 후 등록'];
            $cp = ['partner_key' => $pkey, 'key' => $apiKey, 'method' => 'registGoods', 'goodsNm' => $name, 'cateCd' => $cate,
                'fixedPrice' => (int)round((float)($p['price'] ?? 0)), 'goodsCnt' => (int)($p['inventory'] ?? 0), 'goodsCd' => $sku, 'goodsOpenYn' => 'y', 'return' => 'json'];
            if (!empty($p['image'])) $cp['goodsImg'] = (string)$p['image'];
            [$cc, $cb] = self::httpPost("{$mall}/api/goods.php", ['Content-Type' => 'application/x-www-form-urlencoded'], http_build_query($cp));
            $crc = $cb['code'] ?? $cb['result'] ?? $cb['header']['result_code'] ?? null; $newNo = $cb['goodsNo'] ?? $cb['data']['goodsNo'] ?? null;
            if ($cc >= 200 && $cc < 300 && (string)$crc !== '' && (string)$crc !== '0' && stripos(json_encode($cb, JSON_UNESCAPED_UNICODE), 'error') === false)
                return ['ok' => true, 'channel_product_id' => (string)($newNo ?? $sku), 'note' => 'godomall 신규 상품 등록 완료'];
            return ['ok' => false, 'error' => "godomall 신규등록 실패(code={$cc})", 'detail' => mb_substr(json_encode($cb, JSON_UNESCAPED_UNICODE), 0, 200)];
        }
        $params = ['partner_key' => $pkey, 'key' => $apiKey, 'method' => 'modifyGoods', 'goodsNo' => $goodsNo, 'goodsCd' => $sku, 'return' => 'json'];
        if ($unreg) { $params['goodsOpenYn'] = 'n'; $params['soldOutYn'] = 'y'; }
        else { $params['fixedPrice'] = (int)round((float)($p['price'] ?? 0)); $params['goodsCnt'] = (int)($p['inventory'] ?? 0); $params['goodsOpenYn'] = 'y'; }
        [$c, $b] = self::httpPost("{$mall}/api/goods.php", ['Content-Type' => 'application/x-www-form-urlencoded'], http_build_query($params));
        $rc = $b['code'] ?? $b['result'] ?? $b['header']['result_code'] ?? null;
        if ($c >= 200 && $c < 300 && (string)$rc !== '' && (string)$rc !== '0' && stripos(json_encode($b, JSON_UNESCAPED_UNICODE), 'error') === false) {
            return ['ok' => true, 'channel_product_id' => $goodsNo ?: $sku, 'note' => 'godomall 가격/재고 push(신규 등록은 카테고리·이미지 필요)'];
        }
        return ['ok' => ($c >= 200 && $c < 300), 'channel_product_id' => $goodsNo ?: $sku, 'error' => ($c >= 200 && $c < 300) ? null : "godomall 쓰기 실패(code={$c})", 'detail' => mb_substr(json_encode($b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [현 차수] WooCommerce REST v3 상품 등록/수정/내림 — woocommerceFetch 와 동일 인증(consumer key/secret).
     *   표준 REST(simple product). 자격증명 미등록/실패 시 graceful 에러(상위 awaiting_credentials 보류). */
    private static function woocommerceWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $site = rtrim(trim((string)($creds['site_url'] ?? '')), '/');
        $ck = trim((string)($creds['consumer_key'] ?? '')); $cs = trim((string)($creds['consumer_secret'] ?? ''));
        if ($site === '' || $ck === '' || $cs === '') return ['ok' => false, 'error' => 'WooCommerce: site_url·consumer_key·consumer_secret 필요'];
        if (!str_starts_with($site, 'http')) $site = 'https://' . $site;
        $auth = 'consumer_key=' . rawurlencode($ck) . '&consumer_secret=' . rawurlencode($cs);
        $unreg = ($op === 'unregister' || ($p['action'] ?? '') === 'unregister');
        $prod = [
            'name' => (string)($p['name'] ?? $p['sku'] ?? ''), 'type' => 'simple',
            'regular_price' => (string)(float)($p['price'] ?? 0), 'description' => (string)($p['spec'] ?? ''),
            'sku' => (string)($p['sku'] ?? ''), 'manage_stock' => true, 'stock_quantity' => (int)($p['inventory'] ?? 0),
            'status' => $unreg ? 'draft' : 'publish',
        ];
        // [현 차수] 이미지 — WooCommerce 는 공개 URL 을 그대로 받아 자기 미디어 라이브러리로 사이드로드한다.
        //   첫 장이 대표 이미지. 종전엔 아예 보내지 않아 이미지 없는 상품이 등록됐다.
        $imgs = self::imageUrls($p, 10);
        if ($imgs) $prod['images'] = array_map(static fn($u) => ['src' => $u], $imgs);
        $payload = json_encode($prod, JSON_UNESCAPED_UNICODE);
        $hdr = ['Content-Type' => 'application/json'];
        if ($cpid !== null) { [$c, $b] = self::httpReq('PUT', "{$site}/wp-json/wc/v3/products/{$cpid}?{$auth}", $hdr, $payload); }
        else { [$c, $b] = self::httpPost("{$site}/wp-json/wc/v3/products?{$auth}", $hdr, $payload); }
        if ($c >= 200 && $c < 300 && isset($b['id'])) return ['ok' => true, 'channel_product_id' => (string)$b['id']];
        return ['ok' => false, 'error' => "WooCommerce HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [현 차수] Magento/Adobe Commerce REST V1 상품 등록/수정/삭제 — magentoFetch 와 동일 인증(Bearer integration token).
     *   SKU 키 멱등(POST=upsert). attribute_set_id 기본 4(Default). 자격증명/SKU 미비 시 graceful 에러. */
    private static function magentoWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $base = rtrim(trim((string)($creds['base_url'] ?? '')), '/'); $tok = trim((string)($creds['access_token'] ?? ''));
        if ($base === '' || $tok === '') return ['ok' => false, 'error' => 'Magento: base_url·access_token 필요'];
        if (!str_starts_with($base, 'http')) $base = 'https://' . $base;
        $sku = (string)($p['sku'] ?? '');
        if ($sku === '') return ['ok' => false, 'error' => 'Magento 등록은 SKU 가 필요합니다(상품 키)'];
        $hdr = ['Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/json', 'Accept' => 'application/json'];
        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            [$c] = self::httpReq('DELETE', "{$base}/rest/V1/products/" . rawurlencode($sku), $hdr, null);
            return ($c >= 200 && $c < 300) ? ['ok' => true, 'deleted' => $sku] : ['ok' => false, 'error' => "Magento DELETE HTTP {$c}"];
        }
        $prod = [
            'sku' => $sku, 'name' => (string)($p['name'] ?? $sku), 'price' => (float)($p['price'] ?? 0),
            'status' => 1, 'type_id' => 'simple', 'attribute_set_id' => (int)($p['attribute_set_id'] ?? 4), 'weight' => 1,
            'extension_attributes' => ['stock_item' => ['qty' => (int)($p['inventory'] ?? 0), 'is_in_stock' => true]],
        ];
        // [현 차수] 이미지 — Magento 는 URL 이 아니라 media_gallery_entries[].content.base64_encoded_data(파일 본문)를 받는다.
        //   첫 장만 image/small_image/thumbnail 역할(types)을 갖는다. 본문은 MediaHost 로컬 파일에서 읽는다(자기 HTTP 호출 회피).
        $gallery = [];
        foreach (self::imageUrls($p, 8) as $i => $u) {
            $img = self::imageBytes($u);
            if ($img === null) continue;
            $gallery[] = [
                'media_type' => 'image',
                'label' => (string)($p['name'] ?? $sku),
                'position' => $i + 1,
                'disabled' => false,
                'types' => $i === 0 ? ['image', 'small_image', 'thumbnail'] : [],
                'content' => [
                    'base64_encoded_data' => base64_encode($img['bin']),
                    'type' => $img['mime'],
                    'name' => $sku . '-' . ($i + 1) . '.' . $img['ext'],
                ],
            ];
        }
        if ($gallery) $prod['media_gallery_entries'] = $gallery;
        $payload = json_encode(['product' => $prod], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpPost("{$base}/rest/V1/products", $hdr, $payload); // SKU 키 upsert(POST)
        if ($c >= 200 && $c < 300 && isset($b['sku'])) return ['ok' => true, 'channel_product_id' => (string)($b['id'] ?? $b['sku'])];
        return ['ok' => false, 'error' => "Magento HTTP {$c}", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [237차/235백로그] Shopee Open Platform v2 상품 write — shopeeFetch 와 동일 서명
     *   (HMAC: partner_id+path+ts+access_token+shop_id, key=partner_key). 공통쿼리 partner_id/timestamp/
     *   access_token/shop_id/sign. unregister=unlist_item(item_id 필요), update=update_item(이름/설명),
     *   register=add_item(category_id 필수 honest 게이트, image_id_list/logistic_info 는 $p extras 통과).
     *   ★라이브검증 대기(셀러 계정 필요) — 미비 필드는 Shopee 실에러 반환(거짓 ok 금지). */
    private static function shopeeWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $pid = trim((string)($creds['partner_id'] ?? '')); $pkey = trim((string)($creds['partner_key'] ?? ''));
        $shop = trim((string)($creds['shop_id'] ?? '')); $tok = trim((string)($creds['access_token'] ?? ''));
        if ($pid === '' || $pkey === '' || $shop === '' || $tok === '') return ['ok' => false, 'error' => 'Shopee: partner_id·partner_key·shop_id·access_token 필요'];
        $host = 'https://partner.shopeemobile.com'; $ts = time();
        $hdr = ['Content-Type' => 'application/json'];
        $url = function (string $path) use ($host, $pid, $pkey, $shop, $tok, $ts): string {
            $sign = hash_hmac('sha256', $pid . $path . $ts . $tok . $shop, $pkey);
            $q = http_build_query(['partner_id' => $pid, 'timestamp' => $ts, 'access_token' => $tok, 'shop_id' => $shop, 'sign' => $sign]);
            return "{$host}{$path}?{$q}";
        };
        $fail = fn(int $c, array $b, string $tag) => ['ok' => false, 'error' => "Shopee {$tag} HTTP {$c}", 'detail' => mb_substr((string)($b['message'] ?? json_encode($b, JSON_UNESCAPED_UNICODE)), 0, 200)];

        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            if ($cpid === null || $cpid === '') return ['ok' => false, 'error' => 'Shopee unlist 는 item_id(channel_product_id) 필요'];
            $path = '/api/v2/product/unlist_item';
            [$c, $b] = self::httpPost($url($path), $hdr, json_encode(['item_list' => [['item_id' => (int)$cpid, 'unlist' => true]]]));
            return ($c >= 200 && $c < 300 && empty($b['error'])) ? ['ok' => true, 'unlisted' => $cpid] : $fail($c, $b, 'unlist');
        }
        if ($cpid !== null && $cpid !== '') {
            // [279차 감사 A-2] writeback 의 주용도는 가격/재고 push(리프라이서·재고동기화)인데, 종전엔 update_item 으로
            //   item_name/description 만 싣고 price·inventory 를 전송하지 않은 채 HTTP 성공이면 ok=true 반환 → 채널
            //   실가격 불변인데 UI/DB 는 "동기화 완료·신가격"으로 표기(거짓성공+가격불일치). Shopee 는 가격/재고가
            //   별도 엔드포인트(update_price/update_stock)라 각각 호출하고, 시도한 것 중 하나라도 실패면 ok=false.
            $itemId = (int)$cpid;
            $attempted = 0; $errs = [];
            // (a) 이름/설명 변경분(있을 때만)
            if (isset($p['name']) || isset($p['spec'])) {
                $upd = ['item_id' => $itemId];
                if (isset($p['name'])) $upd['item_name'] = (string)$p['name'];
                if (isset($p['spec'])) $upd['description'] = (string)$p['spec'];
                $attempted++;
                [$c, $b] = self::httpPost($url('/api/v2/product/update_item'), $hdr, json_encode($upd, JSON_UNESCAPED_UNICODE));
                if (!($c >= 200 && $c < 300 && empty($b['error']))) $errs[] = "item HTTP {$c}" . ($b['error'] ?? '');
            }
            // (b) 가격 push(리프라이서 핵심) — update_price
            $pxRaw = (float)($p['price'] ?? 0);
            if ($pxRaw > 0) {
                $px = self::channelPrice($pxRaw, (string)($creds['currency'] ?? ''));
                $attempted++;
                $body = json_encode(['item_id' => $itemId, 'price_list' => [['model_id' => 0, 'original_price' => $px]]], JSON_UNESCAPED_UNICODE);
                [$c, $b] = self::httpPost($url('/api/v2/product/update_price'), $hdr, $body);
                if (!($c >= 200 && $c < 300 && empty($b['error']))) $errs[] = "price HTTP {$c} " . mb_substr((string)($b['message'] ?? ''), 0, 80);
            }
            // (c) 재고 push — update_stock(inventory 명시 시)
            if (array_key_exists('inventory', $p)) {
                $attempted++;
                $body = json_encode(['item_id' => $itemId, 'stock_list' => [['model_id' => 0, 'seller_stock' => [['stock' => (int)($p['inventory'] ?? 0)]]]]], JSON_UNESCAPED_UNICODE);
                [$c, $b] = self::httpPost($url('/api/v2/product/update_stock'), $hdr, $body);
                if (!($c >= 200 && $c < 300 && empty($b['error']))) $errs[] = "stock HTTP {$c} " . mb_substr((string)($b['message'] ?? ''), 0, 80);
            }
            if ($attempted === 0) return ['ok' => false, 'error' => 'Shopee update: 변경할 항목(name/spec/price/inventory)이 없습니다'];
            return empty($errs)
                ? ['ok' => true, 'channel_product_id' => (string)$cpid]
                : ['ok' => false, 'channel_product_id' => (string)$cpid, 'error' => 'Shopee update 일부 실패: ' . implode('; ', $errs)];
        }
        // register = add_item — category_id 필수(honest 게이트). image/logistic 은 $p extras 가 있으면 통과.
        $cat = (int)($p['category_id'] ?? 0);
        if ($cat <= 0) return ['ok' => false, 'error' => 'Shopee 신규 등록은 category_id 필요(Shopee 카테고리 필수)'];
        $add = [
            'category_id' => $cat, 'item_name' => (string)($p['name'] ?? $p['sku'] ?? ''),
            'description' => (string)($p['spec'] ?? ($p['name'] ?? '')),
            'original_price' => self::channelPrice((float)($p['price'] ?? 0), (string)($creds['currency'] ?? '')), 'normal_stock' => (int)($p['inventory'] ?? 0),
            'weight' => (float)($p['weight'] ?? 0.5), 'item_status' => 'NORMAL',
        ];
        // [현 차수] 이미지 — Shopee 는 상품 API 가 URL 을 받지 않는다. media_space 에 파일 본문을 먼저 올려
        //   image_id 를 받아 image_id_list 로 넣어야 한다. 종전엔 호출부가 image_id_list 를 넣어준 적이 없어
        //   이미지가 영원히 누락됐다. 업로드 실패분은 건너뛴다(부분성공 우선).
        $imageIds = [];
        if (!empty($p['image_id_list']) && is_array($p['image_id_list'])) {
            $imageIds = array_values($p['image_id_list']);   // 호출부가 이미 id 를 준 경우 존중
        } else {
            foreach (ChannelImage::blobs('shopee', $p) as $img) {
                $up = self::uploadMultipart($url('/api/v2/media_space/upload_image'), [], 'image', $img);
                $iid = $up['body']['response']['image_info']['image_id'] ?? null;
                if ($iid) $imageIds[] = (string)$iid;
            }
        }
        if ($imageIds) $add['image'] = ['image_id_list' => $imageIds];
        if (!empty($p['logistic_info']) && is_array($p['logistic_info'])) $add['logistic_info'] = $p['logistic_info'];
        $path = '/api/v2/product/add_item';
        [$c, $b] = self::httpPost($url($path), $hdr, json_encode($add, JSON_UNESCAPED_UNICODE));
        $itemId = $b['response']['item_id'] ?? null;
        return ($c >= 200 && $c < 300 && $itemId) ? ['ok' => true, 'channel_product_id' => (string)$itemId] : $fail($c, $b, 'add');
    }

    /** [237차/235백로그] Lazada Open Platform 상품 write — lazadaFetch 와 동일 서명(GOP: apiPath + 정렬된
     *   전 파라미터 key.value, HMAC-SHA256 upper, key=app_secret). 시스템파라미터(app_key/access_token/
     *   timestamp/sign_method) + 비즈니스파라미터(payload XML / seller_sku_list JSON) 전부 서명 포함.
     *   unregister=/product/remove(seller_sku_list), register/update=/product/create(PrimaryCategory 필수
     *   honest 게이트). ★라이브검증 대기(셀러 계정 필요) — 미비 필드는 Lazada 실에러 반환. */
    private static function lazadaWrite(array $creds, array $p, string $op, ?string $cpid): array
    {
        $appKey = trim((string)($creds['app_key'] ?? '')); $appSecret = trim((string)($creds['app_secret'] ?? ''));
        $tok = trim((string)($creds['access_token'] ?? '')); $region = strtolower(trim((string)($creds['region'] ?? 'sg')));
        if ($appKey === '' || $appSecret === '' || $tok === '') return ['ok' => false, 'error' => 'Lazada: app_key·app_secret·access_token 필요'];
        $hostMap = ['sg' => 'api.lazada.sg', 'my' => 'api.lazada.com.my', 'th' => 'api.lazada.co.th', 'id' => 'api.lazada.co.id', 'ph' => 'api.lazada.com.ph', 'vn' => 'api.lazada.vn'];
        $host = 'https://' . ($hostMap[$region] ?? 'api.lazada.sg') . '/rest';
        $call = function (string $apiPath, array $biz) use ($appKey, $appSecret, $tok, $host): array {
            $params = array_merge(['app_key' => $appKey, 'access_token' => $tok, 'timestamp' => (string)(time() * 1000), 'sign_method' => 'sha256'], $biz);
            ksort($params);
            $base = $apiPath; foreach ($params as $k => $v) $base .= $k . $v; // 서명 base = 미인코딩 원본값
            $params['sign'] = strtoupper(hash_hmac('sha256', $base, $appSecret));
            return self::httpPost($host . $apiPath, ['Content-Type' => 'application/x-www-form-urlencoded'], http_build_query($params));
        };
        $ok = fn(int $c, array $b) => $c >= 200 && $c < 300 && (string)($b['code'] ?? '') === '0';
        $fail = fn(int $c, array $b, string $tag) => ['ok' => false, 'error' => "Lazada {$tag} HTTP {$c}", 'detail' => mb_substr((string)($b['message'] ?? json_encode($b, JSON_UNESCAPED_UNICODE)), 0, 200)];

        if ($op === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            $sku = (string)($p['sku'] ?? '');
            if ($sku === '') return ['ok' => false, 'error' => 'Lazada remove 는 seller_sku 필요'];
            [$c, $b] = $call('/product/remove', ['seller_sku_list' => json_encode([$sku])]);
            return $ok($c, $b) ? ['ok' => true, 'removed' => $sku] : $fail($c, $b, 'remove');
        }
        // create/update — PrimaryCategory 필수(honest 게이트). Lazada payload 는 XML.
        $cat = (string)($p['category_id'] ?? '');
        if ($cat === '') return ['ok' => false, 'error' => 'Lazada 등록은 category_id(PrimaryCategory) 필요'];
        $sku = htmlspecialchars((string)($p['sku'] ?? ''), ENT_XML1);
        $name = htmlspecialchars((string)($p['name'] ?? $p['sku'] ?? ''), ENT_XML1);
        $desc = htmlspecialchars((string)($p['spec'] ?? ($p['name'] ?? '')), ENT_XML1);
        // [279차 감사 A-1] KRW → Lazada 벤처 통화 환산(region 매핑). 미상 통화는 무변환(fail-safe).
        $lzCur = ['sg' => 'SGD', 'my' => 'MYR', 'th' => 'THB', 'id' => 'IDR', 'ph' => 'PHP', 'vn' => 'VND'][$region] ?? '';
        $price = self::channelPrice((float)($p['price'] ?? 0), $lzCur); $qty = (int)($p['inventory'] ?? 0);
        // [현 차수] 이미지 — Lazada 상품 XML 은 **Lazada 가 호스팅하는 URL** 만 받는다. 외부 URL 은 /image/migrate 로
        //   Lazada CDN 에 복사한 뒤 그 URL 을 써야 한다(외부 URL 을 그대로 넣으면 거부된다). 종전엔 미전송이었다.
        $lzImgs = [];
        $srcImgs = ChannelImage::urls('lazada', $p);
        if ($srcImgs) {
            [$mc, $mb] = $call('/image/migrate', ['payload' => json_encode(['images' => $srcImgs], JSON_UNESCAPED_SLASHES)]);
            if ($ok($mc, $mb)) {
                foreach ((array)($mb['data']['image'] ?? []) as $im) {
                    $u = is_array($im) ? (string)($im['url'] ?? '') : (string)$im;
                    if ($u !== '') $lzImgs[] = $u;
                }
            }
        }
        $imgXml = '';
        if ($lzImgs) {
            $imgXml = '<Images>';
            foreach ($lzImgs as $u) $imgXml .= '<Image>' . htmlspecialchars($u, ENT_XML1) . '</Image>';
            $imgXml .= '</Images>';
        }
        $xml = "<Request><Product><PrimaryCategory>" . htmlspecialchars($cat, ENT_XML1) . "</PrimaryCategory>"
            . $imgXml
            . "<Attributes><name>{$name}</name><short_description>{$desc}</short_description></Attributes>"
            . "<Skus><Sku><SellerSku>{$sku}</SellerSku><quantity>{$qty}</quantity><price>{$price}</price></Sku></Skus>"
            . "</Product></Request>";
        [$c, $b] = $call('/product/create', ['payload' => $xml]);
        return $ok($c, $b) ? ['ok' => true, 'channel_product_id' => (string)($b['data']['item_id'] ?? $p['sku'] ?? '')] : $fail($c, $b, 'create');
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
        $attrs = [
            'item_name'              => [['value' => $name, 'marketplace_id' => $marketplaceId]],
            'purchasable_offer'      => [['marketplace_id' => $marketplaceId, 'currency' => $cur, 'our_price' => [['schedule' => [['value_with_tax' => self::channelPrice($price, $cur)]]]]]],
            'fulfillment_availability' => [['fulfillment_channel_code' => 'DEFAULT', 'quantity' => (int)($p['inventory'] ?? 0)]],
        ];
        // [현 차수] 이미지 — Listings Items 는 이미지 '위치(공개 URL)'를 속성으로 받는다.
        //   대표 = main_product_image_locator, 추가 = other_product_image_locator_1..8. Amazon 이 URL 을 가져간다.
        $imgs = ChannelImage::urls('amazon', $p);
        if ($imgs) {
            $attrs['main_product_image_locator'] = [['marketplace_id' => $marketplaceId, 'media_location' => $imgs[0]]];
            foreach (array_slice($imgs, 1, 8) as $i => $u) {
                $attrs['other_product_image_locator_' . ($i + 1)] = [['marketplace_id' => $marketplaceId, 'media_location' => $u]];
            }
        }
        $body = json_encode([
            'productType'  => $productType,
            'requirements' => 'LISTING',
            'attributes'   => $attrs,
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

    /** [279차 감사 A-1] 글로벌 채널 writeback 가격 통화 변환 — 카탈로그 가격은 KRW SSOT(calcRecommendedPrice=원가×마진)라
     *   채널 판매통화로 환산해 싣지 않으면 KRW 숫자가 USD/JPY 등 라벨로 그대로 나가 수백~수천배 과대 등재된다.
     *   Connectors::krwToCurrency 재사용(미상/KRW 통화 → 무변환 fail-safe). 소수 없는 통화(JPY/VND/IDR/TWD 등)는 정수. */
    private static function channelPrice(float $krw, string $cur): float
    {
        $cur = strtoupper(trim($cur));
        $v = Connectors::krwToCurrency($krw, $cur);
        return in_array($cur, ['KRW', 'JPY', 'VND', 'IDR', 'TWD', 'HUF', 'CLP'], true) ? round($v) : round($v, 2);
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
                'price' => ['amount' => (string)self::channelPrice($price, (string)($creds['currency'] ?? 'USD')), 'currency' => (string)($creds['currency'] ?? 'USD')],
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
        // [현 차수] 이미지 — 11번가는 prdImage01~prdImage10 에 **공개 URL** 을 받는다(01=대표).
        //   종전엔 미전송이라 이미지 없는 상품이 등록됐다.
        $imgXml = '';
        foreach (self::imageUrls($p, 10) as $i => $u) {
            $imgXml .= '<prdImage' . str_pad((string)($i + 1), 2, '0', STR_PAD_LEFT) . '>'
                     . htmlspecialchars($u, ENT_XML1) . '</prdImage' . str_pad((string)($i + 1), 2, '0', STR_PAD_LEFT) . '>';
        }
        $xml = '<?xml version="1.0" encoding="EUC-KR"?>'
             . '<Product><dispCtgrNo>' . htmlspecialchars($cat, ENT_XML1) . '</dispCtgrNo>'
             . '<prdNm>' . $name . '</prdNm><sellPrc>' . $price . '</sellPrc>'
             . '<prdStockQty>' . $qty . '</prdStockQty><sellerPrdCd>' . $sku . '</sellerPrdCd>'
             . $imgXml
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
        // [277차] image_url·detail_html·images_json 저장 배선. 종전엔 INSERT 목록에 image_url 조차 없어
        //   Shopify/WooCommerce 가 읽어온 이미지도 raw_json 안에만 남고 버려졌다(네이버는 읽지도 않았음).
        //   이미지·상세는 목록수집/상세수집이 시점을 달리하므로 COALESCE 병합(새 값 NULL 이면 기존 보존).
        $stmt  = $pdo->prepare("INSERT INTO channel_products
            (tenant_id,channel,channel_product_id,sku,name,price,compare_price,inventory,status,category,weight,variants_json,raw_json,synced_at,image_url,detail_html,images_json,origin_product_id)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
            . self::upsertTail($pdo, 'tenant_id,channel,channel_product_id',
                ['name','price','inventory','status','category','synced_at'],
                ['image_url','detail_html','images_json','origin_product_id'], 'channel_products'));
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
                // 빈 문자열은 NULL 로 정규화해야 COALESCE 병합이 기존 값을 보존한다.
                (($p['image_url'] ?? '') !== '') ? $p['image_url'] : null,
                (($p['detail_html'] ?? '') !== '') ? $p['detail_html'] : null,
                !empty($p['images']) ? json_encode($p['images'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
                (($p['origin_product_no'] ?? '') !== '') ? (string)$p['origin_product_no'] : null,
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
        // [현 차수 감사 P1] 자동경로 크로스먼스 취소/반품 원월 정산 재롤업 정합 — 폴링/cron 은 caller 가 당월만 롤업하므로
        //   과거월 주문이 이번 배치에서 취소/반품 전이되면 그 달 정산(gross/returnFee/net_payout)이 stale 로 남았다.
        //   수동 setOrderStatus 와 동일하게 영향받은 과거월을 수집→배치 끝에서 원월 재롤업(당월은 caller 담당·중복제외).
        $curMonth       = gmdate('Y-m');
        $affectedMonths = [];
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
                $chk = $pdo->prepare("SELECT event_type, status, sku, qty, total_price, ordered_at FROM channel_orders WHERE tenant_id=? AND channel=? AND channel_order_id=? LIMIT 1");
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
                        // [현 차수] 배송지(addr) 전달 → 멀티창고 최적할당(재고 보유 + 배송지 근접 창고 선택).
                        // [283차 GAP-1] $channel 전달 → 초과판매 발생 시 어느 채널에서 났는지 원장(wms_oversell_alert)에
                        //   귀속 기록(종전 error_log 만으로는 사후 추적 불가). 기본값 '' 이라 타 호출부는 무영향.
                        Wms::reflectChannelSale($tenant, (string)$o['sku'], (string)($o['product_name'] ?? ''), (float)($o['qty'] ?? 1), 'CHS-' . $channel . '-' . (string)$o['channel_order_id'], (string)($o['addr'] ?? ''), $channel);
                    }
                    self::recordCrmPurchase($pdo, $tenant, $channel, $o['buyer_email'] ?? '', $o['buyer_name'] ?? '', (float)($o['total_price'] ?? 0), (string)($o['sku'] ?? ''), (int)($o['qty'] ?? 1), (string)$o['channel_order_id']);
                    self::recordAttributionTouch($pdo, $tenant, $channel, (string)$o['channel_order_id'], (float)($o['total_price'] ?? 0));
                    // [227차 P0] 커머스 주문 → 광고 채널 귀속 보강(외부몰 매출을 광고 ROAS 에 연결).
                    //   클릭ID(gclid/fbclid/ttclid) 또는 구매자 이메일↔픽셀 마케팅터치 매칭으로 광고 채널을 식별해
                    //   attribution_touch/result 에 적재 → markov 가 이 주문 매출을 광고에 귀속(커머스플랫폼명 귀속 한계 해소).
                    self::enrichOrderAttribution($pdo, $tenant, $channel, (string)$o['channel_order_id'], $o['buyer_email'] ?? null, (float)($o['total_price'] ?? 0), $o);
                    // [현 차수 P1-2] 오픈플랫폼 웹훅 — order.created(신규 정상주문 1회·멱등). 구독 0=no-op·비차단.
                    \Genie\Handlers\OpenPlatform::emit($tenant, 'order.created', ['order_id' => (string)$o['channel_order_id'], 'channel' => $channel, 'amount' => (float)($o['total_price'] ?? 0), 'currency' => 'KRW', 'qty' => (int)($o['qty'] ?? 1), 'sku' => (string)($o['sku'] ?? ''), 'occurred_at' => $now]);
                } else {
                    // 최초 수집부터 취소/반품 → 재고차감/구매기록 없이 claim 만 적재(정산 정합, 미판매분 재고 미차감).
                    self::recordClaim($pdo, $tenant, $channel, (string)$o['channel_order_id'], $incCR, (float)($o['total_price'] ?? 0), (string)($o['reason'] ?? ''), (string)($o['buyer_name'] ?? ''), $now);
                    $am = substr((string)($o['ordered_at'] ?? ''), 0, 7); // [P1] 영향 원주문 월
                    if (preg_match('/^\d{4}-\d{2}$/', $am) && $am !== $curMonth) $affectedMonths[$am] = true;
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
                $rOid = (string)($o['channel_order_id'] ?? $existing['channel_order_id'] ?? '');
                if ($rsku !== '' && $rqty > 0) self::incInventory($pdo, $tenant, $channel, $rsku, $rqty, $rOid !== '' ? ('inc-' . $channel . '-' . $rOid) : '');
                $am = substr((string)($existing['ordered_at'] ?? ''), 0, 7); // [P1] 활성→취소/반품 전이 원주문 월
                if (preg_match('/^\d{4}-\d{2}$/', $am) && $am !== $curMonth) $affectedMonths[$am] = true;
                $claimTotal = (float)($existing['total_price'] ?? 0);
                if ($claimTotal <= 0) $claimTotal = (float)($o['total_price'] ?? 0);
                self::recordClaim($pdo, $tenant, $channel, (string)$o['channel_order_id'], $incCR, $claimTotal, (string)($o['reason'] ?? ''), (string)($o['buyer_name'] ?? ''), $now);
                // [263차 HIGH] CRM LTV 역분개(활성→취소/반품 전이 1회·멱등) — LTV/RFM/AOV/예측CLV·VIP등급·타겟팅 과대매출 왜곡 해소.
                self::recordCrmRefund($pdo, $tenant, $channel, (string)($o['buyer_email'] ?? ''), (string)($o['buyer_name'] ?? ''), $claimTotal, (string)$o['channel_order_id']);
                // [현 차수 P1-2] 웹훅 — order.cancelled(활성→취소/반품 전이 1회·멱등). 취소·환불 공통.
                \Genie\Handlers\OpenPlatform::emit($tenant, 'order.cancelled', ['order_id' => (string)$o['channel_order_id'], 'channel' => $channel, 'amount' => $claimTotal, 'currency' => 'KRW', 'reason' => $incCR, 'occurred_at' => $now]);
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
        // [현 차수 감사 P1] 과거월 취소/반품 전이가 있었으면 그 원주문 월 정산을 재롤업(당월은 caller 가 담당).
        //   수동 setOrderStatus/setClaimStatus 와 동일 SSOT(rollupSettlementsCore). 멱등·비치명.
        if ($tenant !== '' && $tenant !== 'demo' && !str_starts_with($tenant, 'demo') && $affectedMonths) {
            foreach (array_keys($affectedMonths) as $rm) {
                try { \Genie\Handlers\OrderHub::rollupSettlementsCore($pdo, $tenant, $rm, null, gmdate('Y-m-d H:i:s')); } catch (\Throwable $e) {}
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
    private static function incInventory(PDO $pdo, string $tenant, string $channel, string $sku, int $qty, string $ref = ''): void
    {
        if ($sku === '' || $qty <= 0) return;
        try {
            // [현 차수 P2] ★멱등 가드 — force 활성복구 후 재취소 시 채널재고가 이중 복원되던 결함 차단
            //   (decInventory·reflectChannelRestock·recordCrmRefund 는 이미 dedup, incInventory만 무방비였다).
            if ($ref !== '') {
                try { $pdo->exec("CREATE TABLE IF NOT EXISTS channel_inv_restock_log (tenant_id VARCHAR(190), ref VARCHAR(190), sku VARCHAR(190), created_at VARCHAR(32), PRIMARY KEY(tenant_id, ref, sku))"); } catch (\Throwable $e) {}
                try { $pdo->prepare("INSERT INTO channel_inv_restock_log (tenant_id, ref, sku, created_at) VALUES (?,?,?,?)")->execute([$tenant, $ref, $sku, gmdate('c')]); }
                catch (\Throwable $e) { return; } // 중복 ref = 이미 복원됨 → skip
            }
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
    // [현 차수] public — LiveCommerce::placeOrder 가 라이브 주문 전환을 attribution_result 에 등록(폴링/웹훅 경로와 동등).
    public static function enrichOrderAttribution(PDO $pdo, string $tenant, string $channel, string $orderId, ?string $buyerEmail, float $total, array $raw): void
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
                    self::emitConversion($tenant, $orderId, strtolower($channel), 'commerce-last-touch', $total, 1.0, $now);
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
                self::emitConversion($tenant, $orderId, $adChannel, 'order-match', $total, 0.8, $now);
            }
        } catch (\Throwable $e) { /* attribution_result 미존재 등 best-effort */ }
    }

    /** [현 차수 P1-2] 전환 귀속 시 웹훅 발신 — conversion.recorded + attribution.computed(신규 attribution_result 1회·멱등). */
    private static function emitConversion(string $tenant, string $orderId, string $channel, string $model, float $revenue, float $confidence, string $now): void
    {
        \Genie\Handlers\OpenPlatform::emit($tenant, 'conversion.recorded', ['order_id' => $orderId, 'channel' => $channel, 'value' => $revenue, 'currency' => 'KRW', 'occurred_at' => $now]);
        \Genie\Handlers\OpenPlatform::emit($tenant, 'attribution.computed', ['order_id' => $orderId, 'attributed_channel' => $channel, 'model' => $model, 'confidence' => $confidence, 'revenue' => $revenue]);
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
            // [현 차수 P2] 등급 자동파생 — 채널동기화 고객이 영구 'normal'이라 grade 세그먼트가 0명 매칭이었다.
            //   파생기준=프론트 데모(CRM.jsx: >500k champions·>200k loyal·단일구매 new) 정합.
            try {
                $lg = $pdo->prepare("SELECT ltv,(SELECT COUNT(*) FROM crm_activities WHERE tenant_id=? AND customer_id=? AND type='purchase') pc FROM crm_customers WHERE id=?");
                $lg->execute([$tenant, (int)$cid, (int)$cid]);
                $lr = $lg->fetch(\PDO::FETCH_ASSOC) ?: [];
                $lv = (float)($lr['ltv'] ?? 0); $pc = (int)($lr['pc'] ?? 1);
                $grade = $lv > 500000 ? 'champions' : ($lv > 200000 ? 'loyal' : ($pc <= 1 ? 'new' : 'normal'));
                $pdo->prepare("UPDATE crm_customers SET grade=? WHERE id=?")->execute([$grade, (int)$cid]);
            } catch (\Throwable $e) {}
            // [현 차수] 구매 이벤트 → 'purchase' 트리거 여정 자동 진입(전환 귀속 revenue 포함). best-effort.
            try { JourneyBuilder::enrollByTrigger($pdo, $tenant, 'purchase', (int)$cid, ['revenue' => $total]); } catch (\Throwable $e) {}
            // [240차 약점②] 오운드채널 어트리뷰션 귀속 — 이 고객의 미귀속 이메일/저니 발송 터치(own:<emailHash>)에 order_id 백필
            //   → markov/linear 등 멀티터치 모델이 캠페인 매출 자동 크레딧. 실 email 기준(합성 noemail 은 hash null=무동작). 30일 윈도.
            if ($email !== '') { try { Attribution::backfillOwnedTouches($pdo, $tenant, $orderId !== '' ? $orderId : ('ORD-' . (int)$cid), $email, null, $now, 30); } catch (\Throwable $e) {} }
        } catch (\Throwable $e) { error_log('[ChannelSync.recordCrmPurchase] ' . $e->getMessage()); }
    }

    /** [263차 HIGH] 활성→취소/반품 전이 시 CRM LTV 역분개 — 기존엔 취소/반품이 crm_customers.ltv·crm_activities(구매)를
     *  절대 되돌리지 않아 LTV/RFM/AOV/예측CLV·VIP등급·타겟팅이 과대매출 위에서 결정(운영 전용 왜곡)됐다.
     *  recordCrmPurchase 대칭: 동일 matchEmail·order_id 멱등(refund 1회)·ltv 차감(0 floor)+crm_activities type='refund' 적재.
     *  소비 SUM 은 type IN('purchase','refund') 순액식으로 정합(CustomerAI/CRM). 신규 고객 생성 안 함(구매 없으면 무동작). */
    private static function recordCrmRefund(PDO $pdo, string $tenant, string $channel, ?string $email, ?string $name, float $refund, string $orderId): void
    {
        $email = trim((string)$email); $name = trim((string)$name);
        if ($tenant === 'demo' || $refund <= 0) return;
        $matchEmail = $email;
        if ($matchEmail === '') {
            if ($name === '') return;
            $matchEmail = strtolower(preg_replace('/[^\p{L}\p{N}]+/u', '', $name)) . '@' . $channel . '.noemail';
        }
        $now = gmdate('Y-m-d H:i:s');
        try {
            $sel = $pdo->prepare("SELECT id FROM crm_customers WHERE tenant_id=? AND email=? LIMIT 1");
            $sel->execute([$tenant, $matchEmail]);
            $cid = $sel->fetchColumn();
            if (!$cid) return; // 구매 이력 없는 고객은 되돌릴 것 없음
            // 멱등: 동일 주문 refund 활동 존재 시 skip. [현 차수 P2] dedup 키에서 가변 channel 제거 —
            //   같은 주문이 채널표기 상이(폴링 'coupang' vs CSV 'coupang_kr')로 유입되면 이중 역분개됐다.
            //   고객+order_id 만으로 판정(order_id 는 주문 고유키).
            if ($orderId !== '') {
                $dup = $pdo->prepare("SELECT 1 FROM crm_activities WHERE tenant_id=? AND customer_id=? AND type='refund' AND data LIKE ? LIMIT 1");
                $dup->execute([$tenant, (int)$cid, '%"order_id":"' . $orderId . '"%']);
                if ($dup->fetchColumn()) return;
            }
            // ltv 컬럼 차감(0 floor·recordCrmPurchase 증분 대칭). GREATEST 는 SQLite 미지원 → MAX() 드라이버 공통.
            $pdo->prepare("UPDATE crm_customers SET ltv=MAX(0, ltv-?), updated_at=? WHERE id=?")->execute([$refund, $now, (int)$cid]);
            $pdo->prepare("INSERT INTO crm_activities(tenant_id,customer_id,type,channel,amount,data,created_at) VALUES(?,?,'refund',?,?,?,?)")
                ->execute([$tenant, (int)$cid, $channel, $refund, json_encode(['order_id' => $orderId, 'refund' => $refund], JSON_UNESCAPED_UNICODE), $now]);
        } catch (\Throwable $e) { error_log('[ChannelSync.recordCrmRefund] ' . $e->getMessage()); }
    }

    /**
     * [현 차수 P1] 운영자 수동 취소/반품 전이 부수효과 — 자동 폴링/웹훅(saveOrders:2805-2829)과 1:1 대칭.
     *   OrderHub::setOrderStatus(주문 드롭다운)가 channel_orders.event_type 을 취소/반품으로 sticky 전이시키므로
     *   이후 채널 폴링은 $wasCR=true 로 재발화하지 않는다 → 여기서 전체 부수효과(재고복원·claim·CRM역분개·emit·
     *   물류복원·반품포탈)를 1회 수행해도 이중집계 없음. 전부 멱등(recordClaim=CLM-·recordCrmRefund=order_id·restock=CHR-).
     *   263/265차가 자동경로에서 근절한 'LTV/재고 과대잔존' 결함의 수동경로 잔존을 대칭 해소.
     */
    public static function applyManualCancelReturn(PDO $pdo, string $tenant, string $channel, string $orderId, string $type, ?string $email, ?string $name, float $total, string $sku, int $qty, string $productName): void
    {
        if ($tenant === 'demo' || !in_array($type, ['cancel', 'return'], true) || $orderId === '') return;
        $now = gmdate('Y-m-d H:i:s');
        try {
            // [282차 D-P2] 멱등 ref 부여 — force 활성복구 후 재취소 시 channel_inventory 이중복원(초과판매) 차단.
            //   자동 웹훅 경로(:3819)와 동일한 'inc-{ch}-{oid}' ref 로 incInventory 의 channel_inv_restock_log 멱등가드 활성.
            if ($sku !== '' && $qty > 0) self::incInventory($pdo, $tenant, $channel, $sku, $qty, 'inc-' . $channel . '-' . $orderId);
            self::recordClaim($pdo, $tenant, $channel, $orderId, $type, $total, '', (string)$name, $now);
            self::recordCrmRefund($pdo, $tenant, $channel, $email, $name, $total, $orderId);
            \Genie\Handlers\OpenPlatform::emit($tenant, 'order.cancelled', ['order_id' => $orderId, 'channel' => $channel, 'amount' => $total, 'currency' => 'KRW', 'reason' => $type, 'occurred_at' => $now]);
            if ($sku !== '' && $qty > 0) {
                Wms::reflectChannelRestock($tenant, $sku, (string)$productName, (float)$qty, 'CHS-' . $channel . '-' . $orderId, 'CHR-' . $channel . '-' . $orderId);
                if ($type === 'return') {
                    ReturnsPortal::ingestChannelReturn($tenant, ['order_id' => $orderId, 'channel' => $channel, 'sku' => $sku, 'name' => (string)$productName, 'qty' => $qty, 'reason' => '', 'refund_amt' => $total]);
                }
            }
        } catch (\Throwable $e) { error_log('[ChannelSync.applyManualCancelReturn] ' . $e->getMessage()); }
    }

    /**
     * [현 차수 P1] CRM LTV 역분개 공개 래퍼 — claim 등록 경로(OrderHub::ingestClaims)용.
     *   ingestClaims 는 자체 claim(clm_hash) 적재 + 정산 재롤업을 하나 event_type 을 바꾸지 않아 재고/claim 은
     *   이후 채널 폴링이 담당한다 → 여기선 CRM 역분개만 수행(재고 이중복원 방지). order_id 멱등이라 폴링과 중복돼도 안전.
     */
    public static function crmRefundForOrder(PDO $pdo, string $tenant, string $channel, ?string $email, ?string $name, float $refund, string $orderId): void
    {
        self::recordCrmRefund($pdo, $tenant, $channel, $email, $name, $refund, $orderId);
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
            ['id'=>'auction','name'=>'옥션','icon'=>'A','color'=>'#cd1c2a','type'=>'국내'],
            ['id'=>'godomall','name'=>'고도몰','icon'=>'🟦','color'=>'#1e88e5','type'=>'국내'],
            // [239차+ P2-1] 글로벌커머스 실 fetch 어댑터 보유 채널을 status 카드 목록에 포함(누락 시 '내 채널' 카드 미표시).
            ['id'=>'woocommerce','name'=>'WooCommerce','icon'=>'🛍️','color'=>'#96588a','type'=>'글로벌'],
            ['id'=>'magento','name'=>'Magento','icon'=>'🧱','color'=>'#ee672f','type'=>'글로벌'],
            ['id'=>'walmart','name'=>'Walmart','icon'=>'🏪','color'=>'#0071dc','type'=>'글로벌'],
            ['id'=>'etsy','name'=>'Etsy','icon'=>'🎨','color'=>'#f56400','type'=>'글로벌'],
            ['id'=>'shopee','name'=>'Shopee','icon'=>'🛒','color'=>'#ee4d2d','type'=>'동남아'],
            ['id'=>'lazada','name'=>'Lazada','icon'=>'🛍️','color'=>'#0f146d','type'=>'동남아'],
            ['id'=>'qoo10','name'=>'Qoo10','icon'=>'Q','color'=>'#ff5400','type'=>'글로벌'],
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

        // [239차+ P2-1] 방어적 보강 — 기본 목록에 없으나 자격증명이 등록된 채널은 절대 누락하지 않는다.
        //   (신규 채널 추가/별칭/레지스트리 확장 시 status 카드 자동 포함 → "설정한 채널이 안 보임" 회귀 차단.)
        $listedIds = [];
        foreach ($supportedChannels as $sc) { $listedIds[self::normalizeChannelKey($sc['id'])] = true; }
        foreach ($credMap as $cid => $crows) {
            if (isset($listedIds[$cid])) continue;
            $supportedChannels[] = [
                'id' => $cid, 'name' => ucfirst($cid), 'icon' => '🔌', 'color' => '#64748b', 'type' => '기타',
                'status'        => $crows[0]['test_status'] ?? 'untested',
                'creds'         => $crows,
                'product_count' => (int)($productCounts[$cid] ?? 0),
                'order_count'   => (int)($orderStats[$cid]['cnt'] ?? 0),
                'revenue'       => (float)($orderStats[$cid]['revenue'] ?? 0),
                'last_synced'   => $crows[0]['last_synced_at'] ?? null,
                'sync_status'   => $crows[0]['sync_status'] ?? 'none',
            ];
        }

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
        // [현 차수 P1] ★계약 정합 수정: 프론트(OmniChannel 연동탭)는 채널별 필수 부가필드를 top-level 로 보내는데
        //   기존엔 6키 화이트리스트만 수집해 coupang(access_key·vendor_id)·tiktok_shop(app_key·access_token)·
        //   rakuten·yahoo_jp·gmarket·cafe24 필수키가 즉시동기화·cron 양쪽에서 소실→영구 미연동이었다.
        //   → 예약키를 제외한 모든 스칼라 body 필드를 extra 로 편입한다.
        $reserved = ['channel','cred_type','label','key_name','key_value','extra_json'];
        $extra = [];
        foreach ($body as $k => $v) {
            if (in_array($k, $reserved, true)) continue;
            if (is_scalar($v) && trim((string)$v) !== '') $extra[$k] = (string)$v;
        }
        // 저장용 extra: 시크릿성 필드(secret/token/password/access_key/license 등) 은행급 암호화. 즉시 동기화는 평문 $extra.
        $extraStore = $extra;
        foreach ($extraStore as $k => $v) {
            if (preg_match('/secret|token|password|license|access_key|secret_key|private/i', (string)$k)) $extraStore[$k] = \Genie\Crypto::encrypt((string)$v);
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
        $testStatus = 'untested';
        if ($result['ok']) {
            $productCount = self::saveProducts($pdo, $tenant, $channel, $result['products'] ?? []);
            $orderCount   = self::saveOrders($pdo, $tenant, $channel, $result['orders'] ?? []);
            // [282차 A-P1 거짓연동 위장 차단] 커머스 어댑터는 자격증명 불완전/라이브 API 4xx 여도 graceful 하게
            //   ok=true + note('...입력 필요' / '실패(code=...)')를 반환한다. 종전엔 이때도 무조건 test_status='ok'
            //   로 스탬프해 OmniChannel 카드가 "✓ 연동완료" 녹색으로 위장됐다(수집 0인데). 실제 수집물이 있거나
            //   실패신호 note 가 없을 때만 'ok', 그 외엔 'error'(⚠ 빨강)로 정직 표기한다.
            $note = (string)($result['note'] ?? '');
            $hadData = ($productCount + $orderCount) > 0;
            $failSignal = $note !== '' && preg_match('/(입력\s*필요|필요합니다|필요$|required|실패|code=|invalid|unauthorized|권한|미설정|not\s*configured|오류|error)/iu', $note);
            if ($pending) {
                $testStatus = 'pending';
            } elseif ($failSignal && !$hadData) {
                $testStatus = 'error';   // 자격증명 불완전/ API 실패 — 거짓 'ok' 방지
            } else {
                $testStatus = 'ok';
            }
            $syncStatus = ($testStatus === 'ok') ? 'ok' : $testStatus;
            $pdo->prepare("UPDATE channel_credential SET last_synced_at=?,sync_status=?,test_status=? WHERE id=?")->execute([$now,$syncStatus,$testStatus,$credId]);
        }

        // [282차 R2 회귀수정] 즉시응답 synced 를 test_status 와 정합 — 종전엔 result.ok && !pending 이라
        //   graceful 실패(자격증명 불완전·API 4xx=ok true)에도 synced=true → 프론트가 새로고침 전까지 녹색 위장.
        //   test_status 강등 로직(ok/error/pending)과 동일 기준으로 통일(A-P1 즉시응답 경로 완결).
        $synced = ($testStatus === 'ok');
        Db::audit($pdo, $tenant, 'channel_sync.save_credential', ['cred_id'=>$credId, 'channel'=>$channel, 'synced'=>$synced]); // 감사: 자격증명 저장(보안)
        return TemplateResponder::respond($res, [
            'ok'            => true,
            'cred_id'       => $credId,
            'channel'       => $channel,
            'synced'        => $synced,
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

        // [현 차수 P2] ★거짓 '연결됨' 방지 — 실 API 핑으로 검증한 채널(shopify/ebay)만 'connected/ok'.
        //   나머지(amazon/coupang/naver/default)는 자격증명 저장만 확인했으므로 'stored'(대기)로 정직 표기.
        //   잘못된 자격증명에도 '정상'이라 stamp 하던 문제 해소(ChannelCreds hasRealAdapter 게이팅과 정합).
        $pingVerified = in_array($channel, ['shopify', 'ebay'], true);
        $statusVal  = $success ? ($pingVerified ? 'connected' : 'stored') : 'error';
        $testStatus = $success ? ($pingVerified ? 'ok' : 'stored') : 'error';
        if ($success && !$pingVerified) $message .= ' (실연결 검증은 첫 동기화 시 확인)';
        $now = gmdate('c');
        $pdo->prepare("UPDATE channel_credential SET last_tested_at=?,test_status=? WHERE tenant_id=? AND channel=?")
            ->execute([$now, $testStatus, $tenant, $channel]);

        return TemplateResponder::respond($res, [
            'ok'      => $success,
            'channel' => $channel,
            'status'  => $statusVal,
            'verified'=> $pingVerified && $success,
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
        if ($c !== $channel && in_array($c, self::COMMERCE_CHANNELS, true)) return true;
        // [정밀감사] admin 이 레지스트리(sync_kind='commerce')로 추가한 신규 커머스 채널도 인식.
        //   기존엔 cron(commerceTenantChannels)만 레지스트리를 병합하고 본 함수는 하드코딩 const 만 봐서
        //   "자격증명 저장 직후 즉시 sync"(ChannelCreds::upsert) 가 신규 커머스 채널을 누락(즉시성 비대칭).
        $reg = self::registryCommerceKeys();
        return in_array($channel, $reg, true) || ($c !== $channel && in_array($c, $reg, true));
    }

    /** 레지스트리의 sync_kind='commerce' 활성 채널키 — 요청 단위 1회 캐시(반복 DB조회 방지). commerceTenantChannels 와 동일 SSOT. */
    private static ?array $registryCommerceCache = null;
    private static function registryCommerceKeys(): array
    {
        if (self::$registryCommerceCache !== null) return self::$registryCommerceCache;
        $out = [];
        try {
            $rs = Db::pdo()->query("SELECT channel_key FROM channel_registry WHERE is_active=1 AND sync_kind='commerce'");
            foreach ($rs->fetchAll(PDO::FETCH_COLUMN) as $ck) { $ck = (string)$ck; if ($ck !== '') $out[] = $ck; }
        } catch (\Throwable $e) { /* 레지스트리 테이블 부재 시 빈 배열(하드코딩 폴백) */ }
        return self::$registryCommerceCache = $out;
    }

    /**
     * 재사용 동기화 코어 — HTTP 핸들러(syncChannel)와 CLI 폴링(commerce_sync_cron)이 공용.
     *   저장된 자격증명 로드(복호화) → fetchFromChannel → saveProducts/saveOrders → 상태갱신.
     *   데모 오염 차단은 saveProducts/saveOrders 의 단일 chokepoint(tenant!=='demo' 가드)가 처리.
     * @return array{ok:bool,product_count:int,order_count:int,synced_at:string,note:?string,error:?string}
     */
    public static function syncTenantChannel(string $tenant, string $channel, string $plan = 'pro', int $userId = 0): array
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

        // [276차] 대량 카탈로그 오버플로 → 백그라운드 잡 위임. fetchFromChannel 이 total_available/fetched_pages/
        //   total_pages 를 준 채널(현재 네이버)만. 즉시 반영분 이후 페이지를 commerce_sync_cron 이 나눠 수집·알림.
        $bgPending = false;
        $totalAvail = (int)($result['total_available'] ?? 0);
        $fetchedNow = count((array)($result['products'] ?? []));
        $totalPages = (int)($result['total_pages'] ?? 0);
        $fetchedPages = (int)($result['fetched_pages'] ?? 0);
        if ($tenant !== '' && $tenant !== 'demo' && !str_starts_with($tenant, 'demo')
            && $totalAvail > $fetchedNow && $totalPages > $fetchedPages) {
            self::enqueueCatalogJob($pdo, $tenant, $channel, $userId, $totalAvail, $fetchedNow,
                $fetchedPages + 1, (int)($result['page_size'] ?? 100));
            $bgPending = true;
            $result['note'] = "총 {$totalAvail}개 중 {$fetchedNow}개 즉시 반영 — 나머지는 백그라운드 수집 중(완료 시 알림).";
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
            'background'    => $bgPending,                        // [276차] 대량 백그라운드 수집 진행 여부
            'total_available' => $totalAvail ?: $pCount,          // 채널 전체 상품 수(있으면)
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
            // [240차 약점④] 채널별 실 정산 API 어댑터 — fetch 인증 재사용. ★자격증명 게이트 + 오류/빈/매핑불일치 시 pending
            //   (추정 롤업 폴백 = 안전, 날조 0). 실 셀러 자격증명 확보 후 즉시 라이브 동작.
            case 'coupang': return self::coupangSettlements($creds, $period);  // CEA HMAC 재사용
            case 'naver':   return self::naverSettlements($creds, $period);    // OAuth2 재사용
            case 'shopify': return self::shopifySettlements($creds, $period);  // [245차 P2-4] Shopify Payments payouts(shop+token 재사용)
            default:
                return ['ok' => true, 'settlements' => [], 'pending' => true,
                        'note' => $channel . ' 정산 자동풀 어댑터 미구현 — 추정 롤업/수동 ingest 사용(실 셀러 자격증명 확보 후 어댑터 추가)'];
        }
    }

    /** [240차 약점④] Coupang 정산 자동수집 — revenue-history(CEA HMAC). 게이트+오류/매핑불일치 시 pending(날조 0·추정롤업 폴백). */
    private static function coupangSettlements(array $creds, string $period): array
    {
        $accessKey = trim((string)($creds['access_key'] ?? ''));
        $secretKey = trim((string)($creds['secret_key'] ?? ''));
        $vendorId  = trim((string)($creds['vendor_id'] ?? ''));
        if ($accessKey === '' || $secretKey === '' || $vendorId === '')
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Coupang 정산: access_key·secret_key·vendor_id 필요'];
        $from = $period . '-01';
        $ts   = strtotime($from); if ($ts === false) return ['ok'=>true,'settlements'=>[],'pending'=>true,'note'=>'Coupang 정산: period 형식 오류'];
        $to   = gmdate('Y-m-t', $ts);
        $host = 'https://api-gateway.coupang.com';
        $path = '/v2/providers/openapi/apis/api/v1/revenue-history';
        $query = "vendorId={$vendorId}&recognitionDateFrom={$from}&recognitionDateTo={$to}&maxPerPage=100";
        $datetime  = gmdate('ymd\THis\Z');
        $signature = hash_hmac('sha256', $datetime . 'GET' . $path . $query, $secretKey);
        $auth = "CEA algorithm=HmacSHA256, access-key={$accessKey}, signed-date={$datetime}, signature={$signature}";
        [$code, $body] = self::httpGet($host . $path . '?' . $query, ['Authorization' => $auth, 'Content-Type' => 'application/json;charset=UTF-8']);
        if ($code !== 200 || !is_array($body))
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => "Coupang 정산 조회 실패(code={$code}) — 추정 롤업 폴백"];
        $data = $body['data'] ?? ($body['content'] ?? []);
        if (!is_array($data) || !$data)
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Coupang 정산 데이터 없음(기간) — 추정 롤업 폴백'];
        $gross = 0.0; $fee = 0.0; $net = 0.0;
        foreach ($data as $row) {
            if (!is_array($row)) continue;
            $gross += (float)($row['salesAmount'] ?? $row['saleAmount'] ?? 0);
            $fee   += (float)($row['serviceFee'] ?? $row['saleCommission'] ?? $row['commission'] ?? 0);
            $net   += (float)($row['settlementAmount'] ?? $row['amount'] ?? 0);
        }
        if ($gross <= 0 && $net <= 0)   // 핵심 필드 0 = 매핑 불일치 가능 → pending(날조 방지)
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Coupang 정산 필드 매핑 불일치 — 라이브 검증 필요(추정 롤업 폴백)'];
        if ($net <= 0) $net = $gross - $fee;
        return ['ok' => true, 'pending' => false, 'settlements' => [[
            'period' => $period, 'channel' => 'coupang', 'gross_sales' => round($gross),
            'platform_fee' => round($fee), 'net_payout' => round($net), 'source' => 'coupang_revenue_history',
        ]]];
    }

    /** [245차 P2-4] Shopify 정산 자동수집 — Shopify Payments payouts(shop_domain+access_token 재사용).
     *   payout.summary 에서 gross/fee 도출, amount=net_payout. 게이트+오류/빈/매핑불일치 시 pending(날조 0·추정롤업 폴백). */
    private static function shopifySettlements(array $creds, string $period): array
    {
        $token = trim((string)($creds['access_token'] ?? $creds['api_password'] ?? ''));
        $shop  = rtrim(trim((string)($creds['shop_domain'] ?? '')), '/');
        if ($token === '' || $shop === '')
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Shopify 정산: shop_domain·access_token 필요'];
        if (!str_contains($shop, '.')) $shop .= '.myshopify.com';
        $ts = strtotime($period . '-01'); if ($ts === false) return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Shopify 정산: period 형식 오류'];
        $from = gmdate('Y-m-d', $ts); $to = gmdate('Y-m-t', $ts);
        $url = "https://{$shop}/admin/api/2024-01/shopify_payments/payouts.json?date_min={$from}&date_max={$to}&limit=250";
        [$code, $body] = self::httpGet($url, ['X-Shopify-Access-Token' => $token, 'Content-Type' => 'application/json']);
        if ($code !== 200 || !is_array($body))
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => "Shopify 정산 조회 실패(code={$code}) — 추정 롤업 폴백(Shopify Payments 미사용 시 정상)"];
        $payouts = $body['payouts'] ?? [];
        if (!is_array($payouts) || !$payouts)
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Shopify 정산 데이터 없음(기간) — 추정 롤업 폴백'];
        $gross = 0.0; $fee = 0.0; $net = 0.0; $cur = 'USD';
        foreach ($payouts as $p) {
            if (!is_array($p)) continue;
            $net += (float)($p['amount'] ?? 0);
            $cur = (string)($p['currency'] ?? $cur);
            $s = is_array($p['summary'] ?? null) ? $p['summary'] : [];
            $gross += (float)($s['charges_gross_amount'] ?? 0) - (float)($s['refunds_gross_amount'] ?? 0);
            $fee   += (float)($s['charges_fee_amount'] ?? 0) + (float)($s['refunds_fee_amount'] ?? 0) + (float)($s['adjustments_fee_amount'] ?? 0);
        }
        if ($gross <= 0 && $net <= 0)
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Shopify 정산 필드 매핑 불일치 — 라이브 검증 필요(추정 롤업 폴백)'];
        if ($gross <= 0) $gross = $net + $fee; // summary 부재 시 net+fee 추정
        return ['ok' => true, 'pending' => false, 'settlements' => [[
            'period' => $period, 'channel' => 'shopify', 'gross_sales' => round($gross),
            'platform_fee' => round($fee), 'net_payout' => round($net), 'currency' => $cur, 'source' => 'shopify_payments_payouts',
        ]]];
    }

    /** [240차 약점④] Naver 정산 자동수집 — OAuth2(fetch 토큰 재사용) → 정산내역. 게이트+오류/매핑불일치 시 pending(날조 0). */
    private static function naverSettlements(array $creds, string $period): array
    {
        $clientId     = trim((string)($creds['client_id'] ?? ''));
        $clientSecret = trim((string)($creds['client_secret'] ?? ''));
        if ($clientId === '' || $clientSecret === '')
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Naver 정산: client_id·client_secret 필요'];
        $timestamp = (int)(microtime(true) * 1000);
        $sign = self::naverSign($clientId, $clientSecret, $timestamp);
        [$code, $body] = self::httpPost(
            'https://api.commerce.naver.com/external/v1/oauth2/token',
            ['Content-Type' => 'application/x-www-form-urlencoded'],
            "client_id={$clientId}&timestamp={$timestamp}&client_secret_sign={$sign}&grant_type=client_credentials&type=SELF"
        );
        if ($code !== 200 || empty($body['access_token']))
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => "Naver 정산: 토큰 발급 실패(code={$code}) — 추정 롤업 폴백"];
        $token = $body['access_token'];
        $from  = $period . '-01';
        $ts    = strtotime($from); if ($ts === false) return ['ok'=>true,'settlements'=>[],'pending'=>true,'note'=>'Naver 정산: period 형식 오류'];
        $to    = gmdate('Y-m-t', $ts);
        [$sCode, $sBody] = self::httpGet(
            "https://api.commerce.naver.com/external/v1/pay-settle/settle/daily?startDate={$from}&endDate={$to}",
            ['Authorization' => "Bearer {$token}"]
        );
        if ($sCode !== 200 || !is_array($sBody))
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => "Naver 정산 조회 실패(code={$sCode}) — 추정 롤업 폴백"];
        $data = $sBody['data'] ?? ($sBody['elements'] ?? ($sBody['content'] ?? []));
        if (!is_array($data) || !$data)
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Naver 정산 데이터 없음(기간) — 추정 롤업 폴백'];
        $gross = 0.0; $fee = 0.0; $net = 0.0;
        foreach ($data as $row) {
            if (!is_array($row)) continue;
            $gross += (float)($row['settleExpectAmount'] ?? $row['saleAmount'] ?? $row['paymentAmount'] ?? 0);
            $fee   += (float)($row['commissionAmount'] ?? $row['feeAmount'] ?? $row['commission'] ?? 0);
            $net   += (float)($row['settleAmount'] ?? $row['settlementAmount'] ?? 0);
        }
        if ($gross <= 0 && $net <= 0)
            return ['ok' => true, 'settlements' => [], 'pending' => true, 'note' => 'Naver 정산 필드 매핑 불일치 — 라이브 검증 필요(추정 롤업 폴백)'];
        if ($net <= 0) $net = $gross - $fee;
        return ['ok' => true, 'pending' => false, 'settlements' => [[
            'period' => $period, 'channel' => 'naver', 'gross_sales' => round($gross),
            'platform_fee' => round($fee), 'net_payout' => round($net), 'source' => 'naver_pay_settle',
        ]]];
    }

    /** 정산 자동 풀 → orderhub_settlements 실 적재(confirmed). cron/syncTenantChannel 공용. @return int 적재 수 */
    public static function syncSettlementsForTenant(\PDO $pdo, string $tenant, string $channel, array $creds, string $period): int
    {
        if ($tenant === 'demo') return 0;
        $r = self::fetchSettlements($channel, $creds, $tenant, $period);
        if (empty($r['ok']) || empty($r['settlements']) || !is_array($r['settlements'])) return 0;
        // [245차 P2-5] 다통화 정산 정규화 — 비-KRW 정산(Shopify USD 등)을 적재 전 fxToKrw로 KRW 통일(주문 chokepoint와 동일 정합).
        //   orderhub_settlements 는 KRW 집계가 SSOT이므로 통화 혼합 합산을 차단(글로벌 셀러 다통화 정합). 원통화는 orig_currency 보존.
        $moneyCols = ['gross_sales', 'net_payout', 'platform_fee', 'ad_fee', 'coupon_discount', 'return_fee'];
        foreach ($r['settlements'] as &$s) {
            $cur = strtoupper(trim((string)($s['currency'] ?? 'KRW')));
            if ($cur !== '' && $cur !== 'KRW') {
                foreach ($moneyCols as $c) { if (isset($s[$c]) && is_numeric($s[$c])) $s[$c] = round(\Genie\Handlers\Connectors::fxToKrw((float)$s[$c], $cur)); }
                $s['orig_currency'] = $cur; $s['currency'] = 'KRW';
            }
        }
        unset($s);
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

        // [276차] 대량 백그라운드 잡 완료 알림 수신자 = 동기화 트리거한 사용자.
        $au = \Genie\Handlers\UserAuth::authedUser($req);
        $userId = (int)($au['id'] ?? 0);

        $r = self::syncTenantChannel($tenant, $channel, $plan, $userId);

        return TemplateResponder::respond($res, [
            'ok'            => $r['ok'],
            'channel'       => $channel,
            'plan'          => $plan,
            'pending'       => $r['pending'] ?? false,
            'product_count' => $r['product_count'],
            'order_count'   => $r['order_count'],
            'synced_at'     => $r['synced_at'],
            'note'          => $r['note'] ?? null,
            'background'    => $r['background'] ?? false,        // [276차] 대량 백그라운드 수집 진행 표시
            'total_available' => $r['total_available'] ?? $r['product_count'],
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
        // [현 차수 감사 P1] 자동경로 크로스먼스 취소/반품 원월 재롤업 정합 — 기존주문 상태변경 웹훅은 body 에
        //   ordered_at 이 없어 원주문 월이 롤업 대상에서 누락됐다(과거월 정산 gross/returnFee stale). 아래 기존주문
        //   전이 블록에서 $existing.ordered_at 의 월을 잡아 rollMonths 에 편입한다(수동 setOrderStatus 와 동일 패턴).
        $affectedMonth = '';

        if ($eventType === 'inventory_update' && !empty($body['sku'])) {
            $pdo->prepare("UPDATE channel_inventory SET available=?,synced_at=? WHERE tenant_id=? AND channel=? AND sku=?")
                ->execute([(int)($body['quantity']??0), $now, $tenant, $channel, $body['sku']]);
        } elseif (in_array($eventType, ['order','order_update','cancel','return'], true) && !empty($body['order_id'])) {
            // MySQL/SQLite 호환 upsert (ON CONFLICT 미사용)
            $sel = $pdo->prepare("SELECT sku, qty, total_price, event_type, ordered_at FROM channel_orders WHERE tenant_id=? AND channel=? AND channel_order_id=? LIMIT 1");
            $sel->execute([$tenant, $channel, $body['order_id']]);
            $existing = $sel->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                $wasReturn = in_array((string)($existing['event_type'] ?? ''), ['cancel','return'], true);
                // [265차] 폴링(saveOrders)·웹훅 신규주문 경로와 대칭: status 토큰으로만 취소/반품을 신호하는 채널
                //   (event='order_update' + status='취소완료' 등)도 classifyCancelReturn 로 정규화해 전이 감지 + event_type 캐논 저장.
                //   (기존엔 raw $eventType 만 봐서 status-신호 취소가 전이 미감지 → claim/역분개 누락, event_type 비캐논으로 남아 하위 집계 오염)
                $incCR = self::classifyCancelReturn((string)($body['status'] ?? ''), (string)$eventType);
                $evtNorm = $incCR ?? $eventType;
                $pdo->prepare("UPDATE channel_orders SET status=?, event_type=?, synced_at=? WHERE tenant_id=? AND channel=? AND channel_order_id=?")
                    ->execute([$body['status']??'pending', $evtNorm, $now, $tenant, $channel, $body['order_id']]);
                // 208차 동기화 P0: 취소/반품 전이(최초 1회) → 재고 복원 + claim 적재(정산 returnFee 자동반영).
                if ($incCR !== null && !$wasReturn) {
                    $eventType = $incCR; // 이하 로직(OpenPlatform reason·return 분기)에 캐논 토큰 사용
                    $affectedMonth = substr((string)($existing['ordered_at'] ?? ''), 0, 7); // 원주문 월(정산 재롤업 대상)
                    $sku = (string)($existing['sku'] ?? ''); $qty = (int)($existing['qty'] ?? 0);
                    // [282차 D-P2] 멱등 ref — force 재활성 후 재취소 시 채널재고 이중복원 차단(전이가드+ref 이중방어).
                    if ($sku !== '' && $qty > 0) self::incInventory($pdo, $tenant, $channel, $sku, $qty, 'inc-' . $channel . '-' . (string)$body['order_id']);
                    self::recordClaim($pdo, $tenant, $channel, (string)$body['order_id'], $eventType, (float)($existing['total_price'] ?? 0), (string)($body['reason'] ?? ''), (string)($body['buyer_name'] ?? ''), $now);
                    // [265차 HIGH] CRM LTV 역분개(활성→취소/반품 전이 1회·멱등) — 폴링(saveOrders:2763)만 있던 것을 웹훅 전이에도 대칭 적용.
                    //   기존엔 웹훅 취소/반품 시 정산·재고는 되돌리면서 LTV/RFM/CLV/VIP등급/타겟팅 과대분개만 잔존. buyer 정보는 웹훅 body best-effort(멱등·미매칭 시 no-op).
                    self::recordCrmRefund($pdo, $tenant, $channel, (string)($body['buyer_email'] ?? ''), (string)($body['buyer_name'] ?? ''), (float)($existing['total_price'] ?? 0), (string)$body['order_id']);
                    // [현 차수 감사] 오픈플랫폼 order.cancelled — 폴링(saveOrders:2754)과 대칭(전이 1회·멱등·구독0=no-op).
                    \Genie\Handlers\OpenPlatform::emit($tenant, 'order.cancelled', ['order_id' => (string)$body['order_id'], 'channel' => $channel, 'amount' => (float)($existing['total_price'] ?? 0), 'currency' => 'KRW', 'reason' => $eventType, 'occurred_at' => $now]);
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
                $qtyW = (int)($body['qty'] ?? 1);
                // [현 차수 감사 P2] 웹훅 신규주문도 폴링(saveOrders)과 동일하게 fxToKrw 정규화 — 외화 웹훅 주문이
                //   KRW 무변환 적재(폴링 정규화 주문과 비대칭)되던 것 해소. KRW/빈/미상 통화는 무변환(동일 SSOT).
                $curW   = strtoupper((string)($body['currency'] ?? ''));
                $totalW = \Genie\Handlers\Connectors::fxToKrw((float)($body['total'] ?? 0), $curW);
                $unitW  = \Genie\Handlers\Connectors::fxToKrw((float)($body['price'] ?? 0), $curW);
                // [현 차수 감사 P1] ★웹훅 주문도 폴링(saveOrders:2562)과 동일하게 buyer_email·addr·raw_json 적재 —
                //   기존 누락으로 (1) CAPI 서버전환 업로드(AdAdapters:665 buyer_email 필터) (2) 고객매칭 오디언스
                //   (AdAdapters:1427 DISTINCT buyer_email) (3) 귀속 백필(ChannelSync:2855 raw_json gclid/fbclid 재귀속)이
                //   웹훅 주문을 영구 누락하던 폐루프 단절 해소. 원통화·원금은 raw_json 보존(KRW 무변환=동일).
                $rawW = $body;
                if ($curW !== '' && $curW !== 'KRW') { $rawW['orig_currency'] = $curW; $rawW['orig_total_price'] = (float)($body['total'] ?? 0); $rawW['orig_unit_price'] = (float)($body['price'] ?? 0); }
                $pdo->prepare("INSERT INTO channel_orders(tenant_id,channel,channel_order_id,buyer_name,buyer_email,product_name,sku,qty,unit_price,total_price,status,addr,ordered_at,event_type,raw_json,synced_at)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$tenant,$channel,$oidW,$body['buyer_name']??'',$body['buyer_email']??'',$body['product_name']??'',$skuW?:null,$qtyW,$unitW,$totalW,$body['status']??'pending',$body['addr']??($body['address']??''),$body['ordered_at']??$now,$evtNormW,json_encode($rawW, JSON_UNESCAPED_UNICODE),$now]);
                if ($incCRw === null) {
                    // 정상 신규 주문 → 실재고 차감 + CRM + 어트리뷰션(폴링 정합).
                    if ($skuW !== '') {
                        self::decInventory($pdo, $tenant, $channel, $skuW, $qtyW);
                        // [283차 GAP-1] 웹훅 경로도 폴링(saveOrders)과 동일하게 배송지·채널 전달 — 멀티창고 최적할당 + 초과판매 귀속.
                        Wms::reflectChannelSale($tenant, $skuW, (string)($body['product_name'] ?? ''), (float)$qtyW, 'CHS-' . $channel . '-' . $oidW, (string)($body['addr'] ?? ($body['address'] ?? '')), $channel);
                    }
                    self::recordCrmPurchase($pdo, $tenant, $channel, $body['buyer_email'] ?? '', $body['buyer_name'] ?? '', $totalW, $skuW, $qtyW, $oidW);
                    self::recordAttributionTouch($pdo, $tenant, $channel, $oidW, $totalW);
                    self::enrichOrderAttribution($pdo, $tenant, $channel, $oidW, $body['buyer_email'] ?? null, $totalW, $body);
                    // [현 차수 감사] 오픈플랫폼 order.created — 폴링(saveOrders:2730)과 대칭. 웹훅 유입 신규주문만 구독자에게
                    //   누락되던 비대칭 해소. 구독 0=no-op·비차단·멱등(신규주문 1회).
                    \Genie\Handlers\OpenPlatform::emit($tenant, 'order.created', ['order_id' => $oidW, 'channel' => $channel, 'amount' => $totalW, 'currency' => 'KRW', 'qty' => $qtyW, 'sku' => $skuW, 'occurred_at' => $now]);
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

        // [현 차수 S-1] 실시간 webhook 의 주문/취소/반품도 on-demand 동기화(syncTenantChannel 3004-3006)와
        //   동등하게 즉시 정산 재집계 — 누락 시 정산·P&L 의 returnFee/net_payout/netProfit 이 다음 cron(최대 5분)
        //   까지 '취소 전 gross' 로 stale(실시간 webhook 경로의 목적 자체가 무력화되던 동기화 갭). 멱등 upsert 라 안전.
        if (in_array($eventType, ['order','order_update','cancel','return'], true)
            && $tenant !== '' && $tenant !== 'demo' && !str_starts_with($tenant, 'demo')) {
            $rollMonths = [gmdate('Y-m')]; // 현재월(공통) + 영향 주문월(과거 주문 취소 정합)
            $omon = substr((string)($body['ordered_at'] ?? ''), 0, 7);
            if (preg_match('/^\d{4}-\d{2}$/', $omon) && !in_array($omon, $rollMonths, true)) $rollMonths[] = $omon;
            // [현 차수 감사 P1] 기존주문 취소/반품 전이 시 원주문 월(위 $affectedMonth)도 재롤업 — body ordered_at 부재 보완.
            if (preg_match('/^\d{4}-\d{2}$/', $affectedMonth) && !in_array($affectedMonth, $rollMonths, true)) $rollMonths[] = $affectedMonth;
            foreach ($rollMonths as $rm) {
                try { \Genie\Handlers\OrderHub::rollupSettlementsCore($pdo, $tenant, $rm, null, gmdate('Y-m-d H:i:s')); } catch (\Throwable $e) {}
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

    /* ═══════════════════════════════════════════════════════════════════════════
       [283차 GAP-2] 채널 발송처리(송장 전송) outbound 루프.

       배경(부재증명): 백엔드 전체에 waybill|shipping_label|발송처리|shipment_confirm 0건.
         WMS 피킹(Wms::savePicking status→shipped)·웨이브 확정으로 물리 출고가 끝나도 그 사실이
         채널로 돌아가지 않아, 구매자 화면의 주문은 영원히 "배송준비중"으로 남았다
         (커머스 outbound 루프의 두 번째 미폐쇄 구간. 첫 번째=재고 델타 = GAP-1).

       설계(신규 큐 신설이 아니라 기존 writeback 패턴을 미러):
         ① 생산자 — Wms::savePicking(송장 입력 후 shipped 전이) · Logistics::track(송장 등록)
            → ChannelSync::enqueueShipment(). channel_orders 로 order_ref → (channel, channel_order_id) 해석.
         ② 큐 — channel_shipment_job(테넌트 격리·UNIQUE(tenant,channel,order,tracking) 멱등).
         ③ 디스패처 — processShipmentQueue(): 자격증명 로드 → shipToChannel() → done/pending/failed.
            자격증명 없으면 awaiting_credentials 보류(등록 즉시 재개), 3회 실패 시 failed.
         ④ cron — bin/shipment_confirm_cron.php(install_crontab.sh 등재).

       ★정직성 원칙(가짜 성공 절대 금지):
         실 API 스펙을 확신할 수 있는 채널만 실전송한다 — shopify / woocommerce / magento / ebay.
         나머지(coupang·naver·cafe24·11st·gmarket·auction·lotteon·godomall·shopee·lazada·amazon·
         tiktok·rakuten·qoo10·yahoo_jp·etsy·walmart…)는 **추측으로 외부 API 를 지어내지 않고**
         'no-live-adapter' honest pending 을 반환한다(송장은 저장·큐 유지 → 어댑터 추가 시 자동 전송).
         pending 은 done 이 아니며 UI/큐에 '전송 대기'로 남는다.
       ═══════════════════════════════════════════════════════════════════════════ */

    /** [283차] 발송처리 실어댑터 보유 채널(실전송). 그 외 = honest pending. */
    private const SHIP_LIVE_CHANNELS = ['shopify', 'woocommerce', 'magento', 'ebay'];

    /** [283차] 채널별 발송처리 API 미확정 사유(정직 표기 — 사용자가 무엇이 막혔는지 알 수 있게). */
    private const SHIP_PENDING_NOTE = [
        'coupang'  => 'Coupang Wing 송장업로드(invoices) API 는 shipmentBoxId 단위 스펙 확정이 필요합니다 — 추측 전송 금지(송장 저장됨).',
        'naver'    => 'Naver Commerce 발송처리(dispatch) API 는 productOrderId 단위 스펙 확정이 필요합니다 — 추측 전송 금지(송장 저장됨).',
        'cafe24'   => 'Cafe24 배송처리(shipments) API 는 order_item_code 단위 스펙 확정이 필요합니다 — 추측 전송 금지(송장 저장됨).',
    ];

    private static function shipNow(): string { return gmdate('Y-m-d H:i:s'); }

    /** [283차] channel_shipment_job 스키마(멱등 DDL). MySQL TEXT DEFAULT 금지 트랩 회피 → 문자열 기본값은 VARCHAR 만. */
    public static function ensureShipmentTables(\PDO $pdo): void
    {
        static $done = [];
        $oid = spl_object_id($pdo);
        if (isset($done[$oid])) return;
        try {
            if ($pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql') {
                $pdo->exec("CREATE TABLE IF NOT EXISTS channel_shipment_job (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                    channel VARCHAR(100) NOT NULL,
                    channel_order_id VARCHAR(190) NOT NULL,
                    order_ref VARCHAR(190), sku VARCHAR(190),
                    carrier VARCHAR(120), carrier_code VARCHAR(60), tracking_no VARCHAR(120) NOT NULL,
                    status VARCHAR(30) NOT NULL DEFAULT 'queued',
                    attempt INT DEFAULT 0, result TEXT,
                    created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_csj (tenant_id, channel, channel_order_id, tracking_no),
                    KEY idx_csj_tenant (tenant_id), KEY idx_csj_status (tenant_id, status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS channel_shipment_job (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                    channel TEXT NOT NULL, channel_order_id TEXT NOT NULL, order_ref TEXT, sku TEXT,
                    carrier TEXT, carrier_code TEXT, tracking_no TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'queued', attempt INTEGER DEFAULT 0, result TEXT,
                    created_at TEXT, updated_at TEXT)");
                try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_csj ON channel_shipment_job(tenant_id, channel, channel_order_id, tracking_no)"); } catch (\Throwable $e) {}
            }
            $done[$oid] = true;
        } catch (\Throwable $e) { error_log('[ChannelSync.ensureShipmentTables] ' . $e->getMessage()); }
    }

    /**
     * [283차] order_ref → (channel, channel_order_id) 해석.
     *   WMS 피킹의 order_ref 는 채널 주문번호를 그대로 쓰는 것이 관례이나, 내부 주문번호(order_no)를 쓰는
     *   테넌트도 있으므로 두 컬럼을 모두 본다. 미해결이면 null(정직 — 큐에 넣지 않는다).
     */
    private static function resolveChannelOrder(\PDO $pdo, string $tenant, string $orderRef): ?array
    {
        $ref = trim($orderRef);
        if ($ref === '') return null;
        try {
            Db::ensureChannelOrders($pdo);
            $st = $pdo->prepare("SELECT channel, channel_order_id, sku FROM channel_orders
                                  WHERE tenant_id=? AND (channel_order_id=? OR order_no=?) ORDER BY id DESC LIMIT 1");
            $st->execute([$tenant, $ref, $ref]);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if ($r && (string)$r['channel'] !== '') {
                return ['channel' => (string)$r['channel'], 'channel_order_id' => (string)$r['channel_order_id'], 'sku' => (string)($r['sku'] ?? '')];
            }
        } catch (\Throwable $e) { error_log('[ChannelSync.resolveChannelOrder] ' . $e->getMessage()); }
        return null;
    }

    /**
     * [283차] 발송처리 큐 적재(멱등) — WMS 출고/송장등록이 호출하는 유일한 생산자 진입점.
     *   $d: [order_ref?, channel?, channel_order_id?, sku?, carrier, tracking_no]
     *   ★송장(tracking_no)이 없으면 적재하지 않는다 — 발송처리는 송장 없이는 성립하지 않으므로
     *     빈 잡을 만들어 "처리한 척"하지 않는다(정직). 데모 테넌트는 실 API 미호출 원칙에 따라 skip.
     *   ★channel_orders 에 carrier/tracking_no 를 동반 기록한다(주문 상세 화면 즉시 반영).
     *     status 는 건드리지 않는다 — 폴링이 채우는 채널 상태이며 여기서 덮으면 취소/반품 분류(classifyCancelReturn)와
     *     정산 롤업이 오작동할 수 있다(무회귀).
     * @return int 잡 id(미적재 시 0)
     */
    public static function enqueueShipment(string $tenant, array $d): int
    {
        $tenant = trim($tenant);
        $tracking = trim((string)($d['tracking_no'] ?? $d['trackingNo'] ?? ''));
        if ($tenant === '' || strtolower($tenant) === 'demo' || $tracking === '') return 0;
        try {
            $pdo = Db::pdo();
            self::ensureShipmentTables($pdo);
            $channel = strtolower(trim((string)($d['channel'] ?? '')));
            $oid     = trim((string)($d['channel_order_id'] ?? $d['order_id'] ?? ''));
            $ref     = trim((string)($d['order_ref'] ?? ''));
            $sku     = trim((string)($d['sku'] ?? ''));
            if ($channel === '' || $oid === '') {
                $res = self::resolveChannelOrder($pdo, $tenant, $ref !== '' ? $ref : $oid);
                if ($res === null) return 0; // 채널 주문 미해결 → 자체몰/오프라인 출고 → 발송처리 대상 아님(정직 skip)
                $channel = strtolower($res['channel']);
                $oid     = $res['channel_order_id'];
                if ($sku === '') $sku = $res['sku'];
            }
            if ($ref === '') $ref = $oid;
            $carrier = trim((string)($d['carrier'] ?? ''));
            $now = self::shipNow();
            // 멱등: 같은 (tenant,channel,order,tracking) 잡이 있으면 재적재하지 않는다.
            //   단, 이전 시도가 failed 였다면 queued 로 되돌려 재시도 기회를 준다(송장 재등록 = 재시도 의사).
            $ex = $pdo->prepare("SELECT id, status FROM channel_shipment_job WHERE tenant_id=? AND channel=? AND channel_order_id=? AND tracking_no=? LIMIT 1");
            $ex->execute([$tenant, $channel, $oid, $tracking]);
            $row = $ex->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $jid = (int)$row['id'];
                if ((string)$row['status'] === 'failed') {
                    $pdo->prepare("UPDATE channel_shipment_job SET status='queued', attempt=0, carrier=?, carrier_code=?, updated_at=? WHERE id=?")
                        ->execute([$carrier, self::carrierCode($carrier), $now, $jid]);
                }
                self::stampOrderTracking($pdo, $tenant, $channel, $oid, $carrier, $tracking);
                return $jid;
            }
            $pdo->prepare("INSERT INTO channel_shipment_job(tenant_id,channel,channel_order_id,order_ref,sku,carrier,carrier_code,tracking_no,status,attempt,created_at,updated_at)
                           VALUES(?,?,?,?,?,?,?,?,'queued',0,?,?)")
                ->execute([$tenant, $channel, $oid, $ref, $sku, $carrier, self::carrierCode($carrier), $tracking, $now, $now]);
            $jid = (int)$pdo->lastInsertId();
            self::stampOrderTracking($pdo, $tenant, $channel, $oid, $carrier, $tracking);
            Db::audit($pdo, $tenant, 'channel.shipment_enqueue', ['channel' => $channel, 'order_id' => $oid, 'tracking' => $tracking, 'job' => $jid]);
            return $jid;
        } catch (\Throwable $e) { error_log('[ChannelSync.enqueueShipment] ' . $e->getMessage()); return 0; }
    }

    /** [283차] channel_orders 에 택배사/송장 기록(status 는 불변 — 취소/반품 분류·정산 무회귀). */
    private static function stampOrderTracking(\PDO $pdo, string $tenant, string $channel, string $oid, string $carrier, string $tracking): void
    {
        try {
            $pdo->prepare("UPDATE channel_orders SET carrier=?, tracking_no=? WHERE tenant_id=? AND channel=? AND channel_order_id=?")
                ->execute([$carrier, $tracking, $tenant, $channel, $oid]);
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /** [283차] 우리 택배사명 → 표준 코드(어댑터가 채널 enum 으로 재매핑). 미상=OTHER. */
    private static function carrierCode(string $carrier): string
    {
        $c = strtolower(trim($carrier));
        if ($c === '') return '';
        $map = [
            'cj' => 'CJ', '대한통운' => 'CJ', 'cj대한통운' => 'CJ', 'cj gls' => 'CJ',
            '한진' => 'HANJIN', 'hanjin' => 'HANJIN',
            '롯데' => 'LOTTE', 'lotte' => 'LOTTE',
            '로젠' => 'LOGEN', 'logen' => 'LOGEN',
            '우체국' => 'EPOST', 'epost' => 'EPOST', 'korea post' => 'EPOST',
            'dhl' => 'DHL', 'fedex' => 'FEDEX', 'ups' => 'UPS', 'usps' => 'USPS', 'tnt' => 'TNT', 'ems' => 'EMS',
        ];
        foreach ($map as $k => $v) { if (strpos($c, $k) !== false) return $v; }
        return 'OTHER';
    }

    /** [283차] 발송처리용 자격증명 로드(복호화·별칭 그룹). syncTenantChannel 의 로더와 동일 규약. */
    private static function loadShipCreds(\PDO $pdo, string $tenant, string $channel): array
    {
        $aliases = [strtolower(trim($channel))];
        foreach ([['amazon', 'amazon_spapi'], ['tiktok_shop', 'tiktok'], ['naver', 'naver_smartstore'], ['11st', 'st11']] as $g) {
            if (in_array($aliases[0], $g, true)) { $aliases = $g; break; }
        }
        $creds = [];
        try {
            $ph = implode(',', array_fill(0, count($aliases), '?'));
            $st = $pdo->prepare("SELECT channel, key_name, key_value, extra_json FROM channel_credential WHERE tenant_id=? AND channel IN ($ph) AND is_active=1");
            $st->execute(array_merge([$tenant], $aliases));
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $kv = \Genie\Crypto::decrypt((string)($r['key_value'] ?? ''));
                $creds[(string)$r['key_name']] = $kv;
                if (!empty($r['extra_json'])) {
                    $ex = (array)json_decode((string)$r['extra_json'], true);
                    foreach ($ex as $ek => $ev) { if (is_string($ev)) $creds[$ek] = \Genie\Crypto::decrypt($ev); }
                }
            }
        } catch (\Throwable $e) { error_log('[ChannelSync.loadShipCreds] ' . $e->getMessage()); }
        return $creds;
    }

    /**
     * [283차] 발송처리 큐 소비 — queued/awaiting_credentials 잡을 채널로 전송.
     *   결과 규약(writeback 큐와 동일):
     *     ok=true            → done
     *     pending=true       → pending(어댑터 미보유 = honest, 재시도 카운트 소모 안 함)
     *     그 외              → attempt+1, 3회 초과 시 failed
     * @return array{processed:int,done:int,awaiting:int,pending:int,failed:int}
     */
    public static function processShipmentQueue(\PDO $pdo, ?string $tenant = null, ?string $channel = null, int $limit = 100): array
    {
        self::ensureShipmentTables($pdo);
        $sum = ['processed' => 0, 'done' => 0, 'awaiting' => 0, 'pending' => 0, 'failed' => 0];
        // ★'pending'(no-live-adapter) 도 매번 재평가한다 — 그래야 "어댑터가 추가되는 순간 자동 전송"이 실제로
        //   성립한다(큐에서 빠지면 영영 잠든다). 어댑터 미보유 채널의 재평가는 shipToChannel 의 switch default
        //   즉시 반환이라 외부 호출 0·비용 무시가능. 'done'/'failed' 는 제외(종결 상태).
        $where = "status IN ('queued','awaiting_credentials','pending')";
        $params = [];
        if ($tenant !== null)  { $where .= " AND tenant_id=?"; $params[] = $tenant; }
        if ($channel !== null) { $where .= " AND channel=?";   $params[] = $channel; }
        $now = self::shipNow();
        // [283차 R2 P1-4] 크래시한 워커가 남긴 'processing' 회수(10분 초과) — 영구 스턱 방지.
        try {
            $pdo->prepare("UPDATE channel_shipment_job SET status='queued', updated_at=? WHERE status='processing' AND updated_at < ?")
                ->execute([$now, gmdate('Y-m-d H:i:s', time() - 600)]);
        } catch (\Throwable $e) { /* best-effort */ }
        try {
            $st = $pdo->prepare("SELECT * FROM channel_shipment_job WHERE $where ORDER BY id ASC LIMIT " . (int)$limit);
            $st->execute($params);
            $jobs = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { return $sum; }

        $upd = $pdo->prepare("UPDATE channel_shipment_job SET status=?, result=?, attempt=?, updated_at=? WHERE id=?");
        // [283차 R2 P1-4] ★잡 선점(CAS) — 소비자가 3개(shipment_confirm_cron / OrderHub 발송처리 / 수동 플러시)라
        //   SELECT~UPDATE 사이가 무방비였다: 두 워커가 같은 잡을 집으면 **송장이 채널에 2회 POST** 된다.
        //   조건부 UPDATE 의 affected rows 로 소유권을 판정한다(FOR UPDATE 불필요·SQLite/MySQL 동일 동작).
        $claim = $pdo->prepare("UPDATE channel_shipment_job SET status='processing', updated_at=? WHERE id=? AND status IN ('queued','awaiting_credentials','pending')");
        $credCache = [];
        foreach ($jobs as $j) {
            try {
                $claim->execute([$now, (int)$j['id']]);
                if ($claim->rowCount() < 1) continue;   // 다른 워커가 선점 — 중복 전송 차단
            } catch (\Throwable $e) { continue; }
            $sum['processed']++;
            $t  = (string)$j['tenant_id'];
            $ch = strtolower((string)$j['channel']);
            $attempt = (int)($j['attempt'] ?? 0);
            $ck = $t . '|' . $ch;
            if (!array_key_exists($ck, $credCache)) $credCache[$ck] = self::loadShipCreds($pdo, $t, $ch);
            $creds = $credCache[$ck];
            if (!$creds) {
                $upd->execute(['awaiting_credentials', json_encode(['reason' => 'no_active_credentials'], JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                $sum['awaiting']++; continue;
            }
            $res = self::shipToChannel($ch, $creds, $j);
            if (!empty($res['ok'])) {
                $upd->execute(['done', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                Db::audit($pdo, $t, 'channel.shipment_done', ['channel' => $ch, 'order_id' => (string)$j['channel_order_id'], 'tracking' => (string)$j['tracking_no']]);
                $sum['done']++;
            } elseif (!empty($res['pending'])) {
                // honest pending — 어댑터 미보유. 재시도 카운트를 소모하지 않는다(어댑터 추가 시 자동 전송).
                $upd->execute(['pending', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                $sum['pending']++;
            } else {
                $failed = ($attempt + 1) >= 3;
                $upd->execute([$failed ? 'failed' : 'queued', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt + 1, $now, $j['id']]);
                $sum[$failed ? 'failed' : 'pending']++;
            }
        }
        return $sum;
    }

    /**
     * [283차] 채널 발송처리 디스패치.
     *   ★실구현 = shopify / woocommerce / magento / ebay (공개 문서로 스펙이 확정된 채널).
     *   ★그 외 = honest pending('no-live-adapter') — 추측 API 를 지어내 "성공"을 반환하지 않는다.
     */
    private static function shipToChannel(string $channel, array $creds, array $j): array
    {
        $ch = strtolower(trim($channel));
        switch ($ch) {
            case 'shopify':      return self::shopifyShip($creds, $j);
            case 'woocommerce':  return self::wooShip($creds, $j);
            case 'magento':      return self::magentoShip($creds, $j);
            case 'ebay':         return self::ebayShip($creds, $j);
            default:
                return [
                    'ok' => false, 'pending' => true, 'error' => 'no-live-adapter:' . $ch,
                    'note' => self::SHIP_PENDING_NOTE[$ch]
                        ?? "[{$ch}] 발송처리(송장전송) API 스펙이 확정되지 않아 전송하지 않았습니다 — 추측 전송 금지. 송장은 저장되어 어댑터 추가 시 자동 전송됩니다.",
                ];
        }
    }

    /**
     * [283차] Shopify 발송처리 — Fulfillment Orders API(2022-07+ 정본).
     *   ① GET /orders/{id}/fulfillment_orders.json → 미이행(open/in_progress/scheduled) fulfillment_order 수집
     *   ② POST /fulfillments.json  { line_items_by_fulfillment_order, tracking_info{number,company,url}, notify_customer }
     *   미이행 항목이 없으면 이미 발송처리된 것 → 멱등 성공(가짜 성공 아님: 채널 상태가 실제로 '발송됨').
     */
    private static function shopifyShip(array $creds, array $j): array
    {
        $token = trim((string)($creds['access_token'] ?? $creds['api_password'] ?? ''));
        $shop  = rtrim(trim((string)($creds['shop_domain'] ?? '')), '/');
        if ($shop === '' || $token === '') return ['ok' => false, 'error' => 'Shopify: shop_domain·access_token 필요'];
        if (!str_contains($shop, '.')) $shop .= '.myshopify.com';
        $oid = preg_replace('/\D/', '', (string)($j['channel_order_id'] ?? ''));
        if ($oid === '') return ['ok' => false, 'error' => 'Shopify 발송처리: 숫자 주문 id 가 필요합니다'];
        $h = ['X-Shopify-Access-Token' => $token, 'Content-Type' => 'application/json', 'Accept' => 'application/json'];

        [$c1, $b1] = self::httpReq('GET', "https://{$shop}/admin/api/2024-01/orders/{$oid}/fulfillment_orders.json", $h, null);
        if ($c1 < 200 || $c1 >= 300) return ['ok' => false, 'error' => "Shopify fulfillment_orders 조회 실패(HTTP {$c1})"];
        $fos = [];
        foreach ((array)($b1['fulfillment_orders'] ?? []) as $fo) {
            $st = strtolower((string)($fo['status'] ?? ''));
            if (in_array($st, ['open', 'in_progress', 'scheduled'], true)) $fos[] = ['fulfillment_order_id' => (int)($fo['id'] ?? 0)];
        }
        if (!$fos) return ['ok' => true, 'idempotent' => true, 'note' => '미이행 fulfillment_order 없음 — 이미 발송처리됨(멱등)'];

        $tracking = ['number' => (string)($j['tracking_no'] ?? '')];
        $carrier  = trim((string)($j['carrier'] ?? ''));
        if ($carrier !== '') $tracking['company'] = $carrier;   // Shopify 는 자유문자열 회사명을 수용(미상 시 미전송)
        $body = json_encode(['fulfillment' => [
            'line_items_by_fulfillment_order' => $fos,
            'tracking_info'    => $tracking,
            'notify_customer'  => true,
        ]], JSON_UNESCAPED_UNICODE);
        [$c2, $b2] = self::httpReq('POST', "https://{$shop}/admin/api/2024-01/fulfillments.json", $h, $body);
        if ($c2 >= 200 && $c2 < 300) return ['ok' => true, 'shipment_id' => (string)($b2['fulfillment']['id'] ?? ''), 'op' => 'fulfillment'];
        return ['ok' => false, 'error' => "Shopify 발송처리 실패(HTTP {$c2})", 'detail' => mb_substr(json_encode($b2['errors'] ?? $b2, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /**
     * [283차] WooCommerce 발송처리 — 코어 REST v3.
     *   ★정직 고지: WooCommerce **코어**에는 송장번호 필드가 없다(전용 배송추적 플러그인 영역).
     *     따라서 ①고객 노트(customer_note=true)로 택배사·송장을 구매자에게 전달하고
     *            ②주문 상태를 completed(배송완료 처리 = Woo 의 발송 확정 상태)로 전이한다.
     *     둘 다 코어 엔드포인트다(지어낸 API 없음). 플러그인 필드는 건드리지 않는다.
     */
    private static function wooShip(array $creds, array $j): array
    {
        $site = rtrim(trim((string)($creds['site_url'] ?? '')), '/');
        $ck = trim((string)($creds['consumer_key'] ?? '')); $cs = trim((string)($creds['consumer_secret'] ?? ''));
        if ($site === '' || $ck === '' || $cs === '') return ['ok' => false, 'error' => 'WooCommerce: site_url·consumer_key·consumer_secret 필요'];
        if (!str_starts_with($site, 'http')) $site = 'https://' . $site;
        $oid = preg_replace('/\D/', '', (string)($j['channel_order_id'] ?? ''));
        if ($oid === '') return ['ok' => false, 'error' => 'WooCommerce 발송처리: 숫자 주문 id 가 필요합니다'];
        $auth = 'consumer_key=' . rawurlencode($ck) . '&consumer_secret=' . rawurlencode($cs);
        $hdr  = ['Content-Type' => 'application/json'];
        $carrier = trim((string)($j['carrier'] ?? '')); $tn = (string)($j['tracking_no'] ?? '');

        $note = '발송 완료 — ' . ($carrier !== '' ? $carrier . ' ' : '') . '송장번호 ' . $tn;
        [$nc] = self::httpReq('POST', "{$site}/wp-json/wc/v3/orders/{$oid}/notes?{$auth}", $hdr,
            json_encode(['note' => $note, 'customer_note' => true], JSON_UNESCAPED_UNICODE));
        [$c, $b] = self::httpReq('PUT', "{$site}/wp-json/wc/v3/orders/{$oid}?{$auth}", $hdr,
            json_encode(['status' => 'completed'], JSON_UNESCAPED_UNICODE));
        if ($c >= 200 && $c < 300) {
            $r = ['ok' => true, 'shipment_id' => (string)($b['id'] ?? $oid), 'op' => 'order_completed'];
            if ($nc < 200 || $nc >= 300) $r['warning'] = "고객 노트(송장 안내) 전송 실패(HTTP {$nc}) — 주문 상태는 completed 로 전이됨";
            return $r;
        }
        return ['ok' => false, 'error' => "WooCommerce 발송처리 실패(HTTP {$c})", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /**
     * [283차] Magento 2 발송처리 — POST /rest/V1/order/{entityId}/ship (tracks[]).
     *   ★magentoFetch 는 channel_order_id 로 increment_id(예: 000000123)를 저장하는데, /ship 은 entity_id 를
     *     요구한다 → searchCriteria(increment_id eq) 로 entity_id 를 먼저 해석한다(숫자 폴백 유지).
     *   carrier_code='custom' + title=택배사명 — Magento 표준(사전 등록된 캐리어가 아닌 경우의 정식 경로).
     */
    private static function magentoShip(array $creds, array $j): array
    {
        $base = rtrim(trim((string)($creds['base_url'] ?? '')), '/'); $tok = trim((string)($creds['access_token'] ?? ''));
        if ($base === '' || $tok === '') return ['ok' => false, 'error' => 'Magento: base_url·access_token 필요'];
        if (!str_starts_with($base, 'http')) $base = 'https://' . $base;
        $inc = trim((string)($j['channel_order_id'] ?? ''));
        if ($inc === '') return ['ok' => false, 'error' => 'Magento 발송처리: 주문번호가 필요합니다'];
        $h = ['Authorization' => 'Bearer ' . $tok, 'Content-Type' => 'application/json', 'Accept' => 'application/json'];

        $entityId = '';
        $q = 'searchCriteria%5Bfilter_groups%5D%5B0%5D%5Bfilters%5D%5B0%5D%5Bfield%5D=increment_id'
           . '&searchCriteria%5Bfilter_groups%5D%5B0%5D%5Bfilters%5D%5B0%5D%5Bvalue%5D=' . rawurlencode($inc)
           . '&searchCriteria%5Bfilter_groups%5D%5B0%5D%5Bfilters%5D%5B0%5D%5Bcondition_type%5D=eq'
           . '&searchCriteria%5BpageSize%5D=1';
        [$sc, $sb] = self::httpReq('GET', "{$base}/rest/V1/orders?{$q}", $h, null);
        if ($sc >= 200 && $sc < 300 && !empty($sb['items'][0]['entity_id'])) $entityId = (string)$sb['items'][0]['entity_id'];
        if ($entityId === '' && ctype_digit($inc)) $entityId = $inc; // 폴백: 이미 entity_id 로 수집된 경우
        if ($entityId === '') return ['ok' => false, 'error' => "Magento 주문 조회 실패(increment_id={$inc}, HTTP {$sc}) — entity_id 미해결"];

        $carrier = trim((string)($j['carrier'] ?? ''));
        $body = json_encode(['tracks' => [[
            'track_number' => (string)($j['tracking_no'] ?? ''),
            'title'        => $carrier !== '' ? $carrier : 'Shipment',
            'carrier_code' => 'custom',
        ]]], JSON_UNESCAPED_UNICODE);
        [$c, $b] = self::httpReq('POST', "{$base}/rest/V1/order/{$entityId}/ship", $h, $body);
        if ($c >= 200 && $c < 300) return ['ok' => true, 'shipment_id' => is_scalar($b) ? (string)$b : (string)($b['entity_id'] ?? ''), 'op' => 'ship'];
        return ['ok' => false, 'error' => "Magento 발송처리 실패(HTTP {$c})", 'detail' => mb_substr(json_encode($b['message'] ?? $b, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [283차] eBay 캐리어 enum(shippingCarrierCode) — 미상은 OTHER(지어내지 않음). */
    private static function ebayCarrier(string $carrier): string
    {
        $code = self::carrierCode($carrier);
        return in_array($code, ['USPS', 'FEDEX', 'UPS', 'DHL'], true) ? $code : 'OTHER';
    }

    /**
     * [283차] eBay 발송처리 — Sell Fulfillment API.
     *   ① GET  /sell/fulfillment/v1/order/{orderId}       → lineItems[].lineItemId/quantity
     *   ② POST /sell/fulfillment/v1/order/{orderId}/shipping_fulfillment
     *      { lineItems:[{lineItemId,quantity}], shippedDate, shippingCarrierCode, trackingNumber }
     *   ebayFetch 가 저장하는 channel_order_id 가 그대로 orderId 다(형식 12-34567-89012).
     */
    private static function ebayShip(array $creds, array $j): array
    {
        $token = trim((string)($creds['oauth_token'] ?? $creds['access_token'] ?? ''));
        if ($token === '') return ['ok' => false, 'error' => 'eBay: oauth_token(access_token) 필요'];
        $oid = trim((string)($j['channel_order_id'] ?? ''));
        if ($oid === '') return ['ok' => false, 'error' => 'eBay 발송처리: orderId 가 필요합니다'];
        $h = ['Authorization' => "Bearer {$token}", 'Content-Type' => 'application/json', 'Accept' => 'application/json'];
        $base = 'https://api.ebay.com/sell/fulfillment/v1/order/' . rawurlencode($oid);

        [$c1, $b1] = self::httpReq('GET', $base, $h, null);
        if ($c1 < 200 || $c1 >= 300) return ['ok' => false, 'error' => "eBay 주문 조회 실패(HTTP {$c1})"];
        $lines = [];
        foreach ((array)($b1['lineItems'] ?? []) as $li) {
            $lid = (string)($li['lineItemId'] ?? '');
            if ($lid === '') continue;
            $lines[] = ['lineItemId' => $lid, 'quantity' => max(1, (int)($li['quantity'] ?? 1))];
        }
        if (!$lines) return ['ok' => false, 'error' => 'eBay 주문에 lineItem 이 없습니다 — 발송처리 불가'];

        $body = json_encode([
            'lineItems'           => $lines,
            'shippedDate'         => gmdate('Y-m-d\TH:i:s.000\Z'),
            'shippingCarrierCode' => self::ebayCarrier((string)($j['carrier'] ?? '')),
            'trackingNumber'      => (string)($j['tracking_no'] ?? ''),
        ], JSON_UNESCAPED_UNICODE);
        [$c2, $b2] = self::httpReq('POST', $base . '/shipping_fulfillment', $h, $body);
        if ($c2 >= 200 && $c2 < 300) return ['ok' => true, 'shipment_id' => (string)($b2['fulfillmentId'] ?? ''), 'op' => 'shipping_fulfillment'];
        return ['ok' => false, 'error' => "eBay 발송처리 실패(HTTP {$c2})", 'detail' => mb_substr(json_encode($b2['errors'] ?? $b2, JSON_UNESCAPED_UNICODE), 0, 200)];
    }

    /** [283차] 발송처리 큐 조회(테넌트 격리) — Wms::listShipmentJobs 가 위임. */
    public static function listShipmentJobs(\PDO $pdo, string $tenant, int $limit = 200): array
    {
        self::ensureShipmentTables($pdo);
        try {
            $st = $pdo->prepare("SELECT id,channel,channel_order_id,order_ref,sku,carrier,tracking_no,status,attempt,result,created_at,updated_at
                                 FROM channel_shipment_job WHERE tenant_id=? ORDER BY id DESC LIMIT " . max(1, min(500, $limit)));
            $st->execute([$tenant]);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$r) {
                $res = json_decode((string)($r['result'] ?? ''), true);
                $r['live_adapter'] = in_array(strtolower((string)$r['channel']), self::SHIP_LIVE_CHANNELS, true);
                $r['message'] = is_array($res) ? (string)($res['note'] ?? $res['error'] ?? '') : '';
                unset($r['result']);
            }
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    /** [283차] 발송처리 실어댑터 보유 채널 목록(정직 노출 — UI 가 "이 채널은 자동 발송처리됨"을 표기). */
    public static function shipLiveChannels(): array { return self::SHIP_LIVE_CHANNELS; }
}
