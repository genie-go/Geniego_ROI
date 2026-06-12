<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * OrderHub Aggregator v3 (165차, U-165-A 격리 + U-165-C L2 schema migration).
 *
 * spec: docs/spec/backend_orderhub_aggregator_165_v3.md
 * - middleware auth_tenant 신뢰 (handler fallback 제거)
 * - 환경 ↔ tenant 종류 cross-check (gate/guardEnv)
 * - Db::pdoFor(isDemo) 로 환경 분리 DB 사용
 * - schema 생성은 backend/migrations/ + Migrate runner 가 담당 (ensureSchema 제거)
 */
final class OrderHub
{
    /**
     * middleware 가 검증한 tenant 만 신뢰. fallback 없음.
     * 호출 전제: public/index.php 의 API-key middleware 가 auth_tenant 속성을 설정.
     */
    private static function tenantContext(Request $req): ?array
    {
        $tenant = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($tenant === '') return null;
        return [
            'tenant' => $tenant,
            'isDemo' => self::isDemoTenant($tenant),
        ];
    }

    /**
     * demo tenant 식별 규칙. 추후 api_key 테이블에 is_demo 컬럼 추가 후 DB 조회 방식으로 교체 권장.
     */
    private static function isDemoTenant(string $tenant): bool
    {
        return $tenant === 'demo' || str_starts_with($tenant, 'demo_');
    }

    /**
     * 환경 ↔ tenant 종류 cross-check. 누수/오라우팅 차단.
     */
    private static function guardEnv(bool $isDemo): ?array
    {
        $env = Db::env();
        if ($env === 'production' && $isDemo) {
            return ['ok' => false, 'error' => 'demo_blocked_in_production'];
        }
        if ($env === 'demo' && !$isDemo) {
            return ['ok' => false, 'error' => 'production_blocked_in_demo'];
        }
        return null;
    }

    private static function pdo(bool $isDemo): \PDO
    {
        return Db::pdoFor($isDemo);
    }

    private static function json(Response $resp, array $payload, int $status = 200): Response
    {
        $resp->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $resp->withStatus($status)
                    ->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    private static function clampLimit(Request $req): array
    {
        $q = $req->getQueryParams();
        $limit = max(1, min(1000, (int)($q['limit'] ?? 200)));
        $offset = max(0, (int)($q['offset'] ?? 0));
        return [$limit, $offset];
    }

    /**
     * 공통 진입 가드 — 모든 endpoint method 가 호출.
     * 반환: 정상 시 ['tenant','isDemo','pdo'], 실패 시 ['error' => Response].
     */
    private static function gate(Request $req, Response $resp): array
    {
        $ctx = self::tenantContext($req);
        if ($ctx === null) {
            return ['error' => self::json($resp, ['ok' => false, 'error' => 'no_tenant'], 401)];
        }
        $envCheck = self::guardEnv($ctx['isDemo']);
        if ($envCheck !== null) {
            return ['error' => self::json($resp, $envCheck, 403)];
        }
        $pdo = self::pdo($ctx['isDemo']);
        return ['tenant' => $ctx['tenant'], 'isDemo' => $ctx['isDemo'], 'pdo' => $pdo];
    }

    public static function orders(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $status = isset($q['status']) ? (string)$q['status'] : null;
        $channel = isset($q['channel']) ? (string)$q['channel'] : null;

        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($status !== null) { $where[] = 'status = ?'; $args[] = $status; }
        if ($channel !== null) { $where[] = 'channel = ?'; $args[] = $channel; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM channel_orders WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM channel_orders WHERE $whereSql ORDER BY id DESC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        // 189차+ 운영버그: 프론트(OrderHub.jsx)가 o.ch/sku/price/carrier/trackingNo/at/wh 를 읽으나
        //   기존 매핑이 이를 누락 → 운영 주문테이블 빈칸 + 검색 시 r.sku.includes TypeError. 필드 보강(안전 폴백).
        $items = array_map(fn($r) => [
            'id'         => (string)($r['id'] ?? $r['order_id'] ?? ''),
            'buyer'      => (string)($r['buyer'] ?? ''),
            'channel'    => (string)($r['channel'] ?? $r['ch'] ?? ''),
            'ch'         => (string)($r['channel'] ?? $r['ch'] ?? ''),
            'sku'        => (string)($r['sku'] ?? $r['product_sku'] ?? ''),
            'name'       => (string)($r['name'] ?? $r['product_name'] ?? ''),
            'qty'        => (int)($r['qty'] ?? $r['quantity'] ?? 0),
            'price'      => (float)($r['price'] ?? $r['unit_price'] ?? 0),
            'total'      => (float)($r['total'] ?? $r['total_price'] ?? 0),
            'status'     => (string)($r['status'] ?? ''),
            'carrier'    => (string)($r['carrier'] ?? ''),
            'trackingNo' => (string)($r['tracking_no'] ?? $r['trackingNo'] ?? ''),
            'at'         => (string)($r['ordered_at'] ?? $r['created_at'] ?? $r['at'] ?? ''),
            'wh'         => (string)($r['warehouse'] ?? $r['wh'] ?? ''),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            '_env' => Db::env(),
            '_isDemo' => $isDemo,
        ]);
    }

    public static function claims(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $type = isset($q['type']) ? (string)$q['type'] : null;

        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($type !== null) { $where[] = 'type = ?'; $args[] = $type; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM orderhub_claims WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM orderhub_claims WHERE $whereSql ORDER BY created_at DESC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $items = array_map(fn($r) => [
            'id' => (string)$r['id'],
            'orderId' => (string)($r['order_id'] ?? ''),
            'buyer' => (string)($r['buyer'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'type' => (string)($r['type'] ?? 'return'),
            'reason' => (string)($r['reason'] ?? ''),
            'status' => (string)($r['status'] ?? 'pending'),
            'amount' => (float)($r['amount'] ?? 0),
            'createdAt' => (string)($r['created_at'] ?? ''),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            '_env' => Db::env(),
            '_isDemo' => $isDemo,
        ]);
    }

    public static function settlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $period = isset($q['period']) ? (string)$q['period'] : null;

        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($period !== null) { $where[] = 'period = ?'; $args[] = $period; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM orderhub_settlements WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM orderhub_settlements WHERE $whereSql ORDER BY period DESC, channel ASC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $items = array_map(fn($r) => [
            'id' => (string)$r['id'],
            'period' => (string)($r['period'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'status' => (string)($r['status'] ?? 'pending'),
            'grossSales' => (float)($r['gross_sales'] ?? 0),
            'netPayout' => (float)($r['net_payout'] ?? 0),
            'platformFee' => (float)($r['platform_fee'] ?? 0),
            'adFee' => (float)($r['ad_fee'] ?? 0),
            'couponDiscount' => (float)($r['coupon_discount'] ?? 0),
            'returnFee' => (float)($r['return_fee'] ?? 0),
            'orders' => (int)($r['orders_count'] ?? 0),
            'returns' => (int)($r['returns_count'] ?? 0),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            '_env' => Db::env(),
            '_isDemo' => $isDemo,
        ]);
    }

    /* ════════════════════════════════════════════════════════════════════
     * 206차 #3 — claims/settlements 인제스트 라이터 (CSV/API)
     *   기존엔 읽기 전용(빈 테이블). 채널 정산 데이터를 적재한다.
     *   - POST orderhub/claims        : 반품/취소 클레임 인제스트(JSON 배열 또는 CSV)
     *   - POST orderhub/settlements   : 정산 레코드 인제스트(period+channel upsert)
     *   - POST orderhub/settlements/rollup : channel_orders 집계로 정산 파생
     * ════════════════════════════════════════════════════════════════════ */

    /** body 에서 레코드 배열 추출 — {items:[]} / 배열 / 단일객체 / {csv:"..."} 모두 수용. */
    private static function extractItems(Request $req): array
    {
        $body = $req->getParsedBody();
        if (is_array($body)) {
            if (isset($body['items']) && is_array($body['items'])) return array_values($body['items']);
            if (isset($body['csv']) && is_string($body['csv'])) return self::parseCsv($body['csv']);
            if (array_is_list($body)) return $body;
            if (!empty($body)) return [$body];
        }
        // raw CSV 본문(content-type: text/csv)
        $raw = (string)$req->getBody();
        if ($raw !== '' && str_contains($raw, ',')) {
            $maybe = json_decode($raw, true);
            if (is_array($maybe)) return array_is_list($maybe) ? $maybe : [$maybe];
            return self::parseCsv($raw);
        }
        return [];
    }

    /** 헤더 행 기반 CSV → 연관배열 목록. */
    private static function parseCsv(string $csv): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csv));
        if (!$lines || count($lines) < 2) return [];
        $header = array_map('trim', str_getcsv(array_shift($lines)));
        $out = [];
        foreach ($lines as $ln) {
            if (trim($ln) === '') continue;
            $cols = str_getcsv($ln);
            $row = [];
            foreach ($header as $i => $h) { $row[$h] = $cols[$i] ?? null; }
            $out[] = $row;
        }
        return $out;
    }

    private static function genId(string $prefix, string $tenant): string
    {
        return $prefix . '_' . substr(md5($tenant), 0, 6) . '_' . str_replace('.', '', uniqid('', true));
    }

    public static function ingestClaims(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $items = self::extractItems($req);
        $now = gmdate('Y-m-d H:i:s');
        $ingested = 0; $skipped = 0;
        try {
            $upd = $pdo->prepare("UPDATE orderhub_claims SET buyer=?,channel=?,type=?,reason=?,status=?,amount=?,updated_at=? WHERE id=? AND tenant_id=?");
            $ins = $pdo->prepare("INSERT INTO orderhub_claims (id,tenant_id,order_id,buyer,channel,type,reason,status,amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            foreach ($items as $it) {
                $orderId = (string)($it['order_id'] ?? $it['orderId'] ?? '');
                if ($orderId === '') { $skipped++; continue; }
                $type = (string)($it['type'] ?? 'return');
                if (!in_array($type, ['return','cancel','exchange'], true)) $type = 'return';
                $buyer   = isset($it['buyer']) ? (string)$it['buyer'] : null;
                $channel = isset($it['channel']) ? (string)$it['channel'] : null;
                $reason  = isset($it['reason']) ? (string)$it['reason'] : null;
                $status  = (string)($it['status'] ?? 'pending');
                $amount  = (float)($it['amount'] ?? 0);
                $id = (string)($it['id'] ?? '');
                if ($id !== '' && $upd->execute([$buyer,$channel,$type,$reason,$status,$amount,$now,$id,$tenant]) && $upd->rowCount() > 0) {
                    $ingested++; continue;
                }
                if ($id === '') $id = self::genId('clm', $tenant);
                $ins->execute([$id,$tenant,$orderId,$buyer,$channel,$type,$reason,$status,$amount,$now,$now]);
                $ingested++;
            }
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
        return self::json($resp, ['ok' => true, 'ingested' => $ingested, 'skipped' => $skipped, '_env' => Db::env(), '_isDemo' => $isDemo]);
    }

    public static function ingestSettlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $items = self::extractItems($req);
        $now = gmdate('Y-m-d H:i:s');
        $ingested = 0; $skipped = 0;
        try {
            foreach ($items as $it) {
                $period  = (string)($it['period'] ?? '');
                $channel = (string)($it['channel'] ?? '');
                if ($period === '' || $channel === '') { $skipped++; continue; }
                $ingested += self::upsertSettlement($pdo, $tenant, $period, $channel, [
                    'status'          => (string)($it['status'] ?? 'pending'),
                    'gross_sales'     => (float)($it['gross_sales'] ?? $it['grossSales'] ?? 0),
                    'net_payout'      => (float)($it['net_payout'] ?? $it['netPayout'] ?? 0),
                    'platform_fee'    => (float)($it['platform_fee'] ?? $it['platformFee'] ?? 0),
                    'ad_fee'          => (float)($it['ad_fee'] ?? $it['adFee'] ?? 0),
                    'coupon_discount' => (float)($it['coupon_discount'] ?? $it['couponDiscount'] ?? 0),
                    'return_fee'      => (float)($it['return_fee'] ?? $it['returnFee'] ?? 0),
                    'orders_count'    => (int)($it['orders_count'] ?? $it['orders'] ?? 0),
                    'returns_count'   => (int)($it['returns_count'] ?? $it['returns'] ?? 0),
                ], $now);
            }
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
        return self::json($resp, ['ok' => true, 'ingested' => $ingested, 'skipped' => $skipped, '_env' => Db::env(), '_isDemo' => $isDemo]);
    }

    /** channel_orders + orderhub_claims 집계로 정산 파생(plaform_fee 추정율 적용). */
    public static function rollupSettlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];

        $q = $req->getQueryParams();
        $body = (array)($req->getParsedBody() ?? []);
        $period = (string)($q['period'] ?? $body['period'] ?? gmdate('Y-m'));
        if (!preg_match('/^\d{4}-\d{2}$/', $period)) $period = gmdate('Y-m');
        // [현 차수] fee_rate 명시 전달 시 전 채널 일괄 override, 미지정이면 null→채널별 실수수료 스케줄.
        $feeRate = (isset($q['fee_rate']) || isset($body['fee_rate'])) ? (float)($q['fee_rate'] ?? $body['fee_rate']) : null;
        $now = gmdate('Y-m-d H:i:s');

        try {
            $rolled = self::rollupSettlementsCore($pdo, $tenant, $period, $feeRate, $now);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }
        return self::json($resp, ['ok' => true, 'period' => $period, 'fee_rate' => $feeRate ?? 'per-channel', 'rolled' => $rolled, '_env' => Db::env(), '_isDemo' => $isDemo]);
    }

    /**
     * 208차 동기화 P0: 정산 롤업 코어(핸들러+cron 공용). channel_orders/orderhub_claims → orderhub_settlements 집계.
     * commerce_sync_cron 이 주문 폴링 후 자동 호출 → 운영 정산이 수동 호출 없이 자동 채워짐.
     * @return int rolled count
     */
    /** [현 차수] 채널별 판매 수수료율 — 프론트 channelRates.js(CHANNEL_RATES) 미러(SSOT 정합).
     *   과거 전 채널 단일 10% 하드코딩 → 채널별 실수수료로 정산 추정 정확도 향상. 미등록=10% 폴백. */
    public static function channelFeeRate(string $channel): float
    {
        static $rates = [
            'coupang'=>0.11,'naver'=>0.05,'naver_smartstore'=>0.05,'11st'=>0.12,'gmarket'=>0.12,
            'auction'=>0.12,'kakao_commerce'=>0.10,'cafe24'=>0.03,'wemakeprice'=>0.11,'interpark'=>0.09,
            'lotteon'=>0.10,'own_mall'=>0.00,
            'shopify'=>0.02,'amazon'=>0.15,'amazon_spapi'=>0.15,'ebay'=>0.13,'tiktok'=>0.08,'tiktok_shop'=>0.08,
            'rakuten'=>0.08,'yahoo_jp'=>0.06,'line'=>0.05,
            'lazada'=>0.04,'shopee'=>0.10,'qoo10'=>0.10,'zalando'=>0.20,'woocommerce'=>0.02,
        ];
        return $rates[strtolower(trim($channel))] ?? 0.10;
    }

    /**
     * @param ?float $feeRate null=채널별 스케줄 적용(권장, cron), 값 전달 시 전 채널 일괄 override(HTTP fee_rate).
     */
    public static function rollupSettlementsCore(\PDO $pdo, string $tenant, string $period, ?float $feeRate, string $now): int
    {
        self::ensureSettlementTables($pdo); // 208차: cron/신규 테넌트 대비 테이블 보장(없으면 생성, 있으면 no-op)
        $os = $pdo->prepare("SELECT channel, COUNT(*) AS cnt, COALESCE(SUM(total_price),0) AS gross
            FROM channel_orders WHERE tenant_id=? AND SUBSTR(ordered_at,1,7)=? GROUP BY channel");
        $os->execute([$tenant, $period]);
        $orders = $os->fetchAll(\PDO::FETCH_ASSOC);

        $cs = $pdo->prepare("SELECT channel, COUNT(*) AS rcnt, COALESCE(SUM(amount),0) AS rfee
            FROM orderhub_claims WHERE tenant_id=? AND SUBSTR(created_at,1,7)=? AND type IN ('return','cancel') GROUP BY channel");
        $cs->execute([$tenant, $period]);
        $claimsBy = [];
        foreach ($cs->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $claimsBy[(string)$r['channel']] = ['rcnt' => (int)$r['rcnt'], 'rfee' => (float)$r['rfee']];
        }

        $rolled = 0;
        // [현 차수] 수동 ingest 된 실 정산은 추정으로 덮어쓰지 않도록 기존 status 사전조회.
        $exStmt = $pdo->prepare("SELECT status FROM orderhub_settlements WHERE tenant_id=? AND period=? AND channel=? LIMIT 1");
        foreach ($orders as $o) {
            $channel = (string)($o['channel'] ?? '');
            if ($channel === '') continue;
            // 실 정산(status!='estimated', 예: ingest 된 confirmed/pending)이 이미 있으면 추정 스킵(정합 보존).
            $exStmt->execute([$tenant, $period, $channel]);
            $exStatus = (string)($exStmt->fetchColumn() ?: '');
            if ($exStatus !== '' && $exStatus !== 'estimated') continue;
            $gross    = (float)$o['gross'];
            $cnt      = (int)$o['cnt'];
            // [현 차수] null=채널별 실수수료 스케줄, 값=일괄 override.
            $rate = ($feeRate !== null && $feeRate > 0) ? $feeRate : self::channelFeeRate($channel);
            $platform = round($gross * $rate, 2);
            $returnFee = $claimsBy[$channel]['rfee'] ?? 0.0;
            $returns   = $claimsBy[$channel]['rcnt'] ?? 0;
            $net = round($gross - $platform - $returnFee, 2);
            $rolled += self::upsertSettlement($pdo, $tenant, $period, $channel, [
                'status'          => 'estimated',
                'gross_sales'     => $gross,
                'net_payout'      => $net,
                'platform_fee'    => $platform,
                'ad_fee'          => 0.0,
                'coupon_discount' => 0.0,
                'return_fee'      => $returnFee,
                'orders_count'    => $cnt,
                'returns_count'   => $returns,
            ], $now);
        }
        return $rolled;
    }

    /** 208차: orderhub_settlements/claims 테이블 보장(cron 견고성). 이미 있으면 no-op. */
    private static function ensureSettlementTables(\PDO $pdo): void
    {
        $isMy = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($isMy) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (id VARCHAR(190) PRIMARY KEY, tenant_id VARCHAR(190), period VARCHAR(20), channel VARCHAR(190), status VARCHAR(50), gross_sales DOUBLE DEFAULT 0, net_payout DOUBLE DEFAULT 0, platform_fee DOUBLE DEFAULT 0, ad_fee DOUBLE DEFAULT 0, coupon_discount DOUBLE DEFAULT 0, return_fee DOUBLE DEFAULT 0, orders_count INT DEFAULT 0, returns_count INT DEFAULT 0, created_at VARCHAR(40), updated_at VARCHAR(40), KEY idx_stl (tenant_id, period, channel)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (id VARCHAR(190) PRIMARY KEY, tenant_id VARCHAR(190), order_id VARCHAR(190), buyer VARCHAR(190), channel VARCHAR(190), type VARCHAR(50), reason TEXT, status VARCHAR(50), amount DOUBLE DEFAULT 0, created_at VARCHAR(40), updated_at VARCHAR(40), KEY idx_clm (tenant_id, created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (id TEXT PRIMARY KEY, tenant_id TEXT, period TEXT, channel TEXT, status TEXT, gross_sales REAL DEFAULT 0, net_payout REAL DEFAULT 0, platform_fee REAL DEFAULT 0, ad_fee REAL DEFAULT 0, coupon_discount REAL DEFAULT 0, return_fee REAL DEFAULT 0, orders_count INTEGER DEFAULT 0, returns_count INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (id TEXT PRIMARY KEY, tenant_id TEXT, order_id TEXT, buyer TEXT, channel TEXT, type TEXT, reason TEXT, status TEXT, amount REAL DEFAULT 0, created_at TEXT, updated_at TEXT)");
            }
        } catch (\Throwable $e) {}
    }

    /** period+channel 유니크 기준 포터블 업서트(MySQL/SQLite 공용). @return int 1 */
    private static function upsertSettlement(\PDO $pdo, string $tenant, string $period, string $channel, array $v, string $now): int
    {
        $sel = $pdo->prepare("SELECT id FROM orderhub_settlements WHERE tenant_id=? AND period=? AND channel=? LIMIT 1");
        $sel->execute([$tenant, $period, $channel]);
        $id = $sel->fetchColumn();
        if ($id !== false && $id !== null) {
            $pdo->prepare("UPDATE orderhub_settlements SET status=?,gross_sales=?,net_payout=?,platform_fee=?,ad_fee=?,coupon_discount=?,return_fee=?,orders_count=?,returns_count=?,updated_at=? WHERE id=?")
                ->execute([$v['status'],$v['gross_sales'],$v['net_payout'],$v['platform_fee'],$v['ad_fee'],$v['coupon_discount'],$v['return_fee'],$v['orders_count'],$v['returns_count'],$now,$id]);
        } else {
            $newId = self::genId('stl', $tenant);
            $pdo->prepare("INSERT INTO orderhub_settlements (id,tenant_id,period,channel,status,gross_sales,net_payout,platform_fee,ad_fee,coupon_discount,return_fee,orders_count,returns_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$newId,$tenant,$period,$channel,$v['status'],$v['gross_sales'],$v['net_payout'],$v['platform_fee'],$v['ad_fee'],$v['coupon_discount'],$v['return_fee'],$v['orders_count'],$v['returns_count'],$now,$now]);
        }
        return 1;
    }
}
