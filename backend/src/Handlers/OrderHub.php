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

        $items = array_map(fn($r) => [
            'id' => (string)($r['id'] ?? $r['order_id'] ?? ''),
            'buyer' => (string)($r['buyer'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'name' => (string)($r['name'] ?? $r['product_name'] ?? ''),
            'qty' => (int)($r['qty'] ?? $r['quantity'] ?? 0),
            'total' => (float)($r['total'] ?? $r['total_price'] ?? 0),
            'status' => (string)($r['status'] ?? ''),
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
}
