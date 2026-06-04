<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * Catalog — 상품 일괄 등록/가격 수정 writeback (192차 Sprint2 신규).
 *
 * 배경: CatalogSync 프론트가 호출하던 /v382/writeback/{ch}/{sku}/execute 는 191차에 제거되어
 *   404(dead-route)였고, 일괄 가격수정은 setTimeout 시뮬레이션으로 실제 반영이 전혀 없었다.
 *   → 세션 self-auth(requirePro) + 테넌트 격리(authedTenant)로 catalog_listing 에 실제 영속.
 *
 * 상태(status): 채널 자격증명(channel_credential) 존재 → 'queued'(채널 동기화 대기),
 *   없으면 'saved'(저장됨·연동대기), unregister → 'unregistered'.
 *   (실 채널 API push 는 채널별 write 어댑터로 후속 확장 — 본 핸들러는 테넌트격리 영속이 정본.)
 *
 * /api/catalog/* 는 index.php public bypass(세션 기반) → 핸들러 self-auth. (190차 CRM 패턴 정합)
 */
class Catalog
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function jsonRes(Response $res, array $payload, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_listing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL,
                sku VARCHAR(190) NOT NULL,
                name VARCHAR(500), category VARCHAR(255),
                price DOUBLE DEFAULT 0, inventory INT DEFAULT 0, spec TEXT,
                action VARCHAR(30) NOT NULL DEFAULT 'register',
                status VARCHAR(30) NOT NULL DEFAULT 'saved',
                channel_result TEXT,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_catalog_listing (tenant_id, channel, sku),
                KEY idx_catalog_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_listing (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, sku TEXT NOT NULL, name TEXT, category TEXT,
                price REAL DEFAULT 0, inventory INTEGER DEFAULT 0, spec TEXT,
                action TEXT NOT NULL DEFAULT 'register', status TEXT NOT NULL DEFAULT 'saved',
                channel_result TEXT, created_at TEXT, updated_at TEXT,
                UNIQUE (tenant_id, channel, sku)
            )");
        }
    }

    /** 채널 연결 여부 → 상태 결정 (테넌트 격리). */
    private static function channelStatus(\PDO $pdo, string $tenant, string $channel, string $action): string
    {
        if ($action === 'unregister' || $action === 'disconnect') return 'unregistered';
        try {
            $st = $pdo->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=:t AND channel=:c AND is_active=1 LIMIT 1");
            $st->execute([':t' => $tenant, ':c' => $channel]);
            return $st->fetchColumn() ? 'queued' : 'saved';
        } catch (\Throwable $e) { return 'saved'; }
    }

    private static function upsert(\PDO $pdo, string $tenant, string $channel, string $sku, array $f, string $status): void
    {
        $now = self::now();
        if (self::isMysql($pdo)) {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2)
                    ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),price=VALUES(price),
                      inventory=VALUES(inventory),spec=VALUES(spec),action=VALUES(action),status=VALUES(status),updated_at=VALUES(updated_at)";
        } else {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2)
                    ON CONFLICT(tenant_id,channel,sku) DO UPDATE SET name=excluded.name,category=excluded.category,
                      price=excluded.price,inventory=excluded.inventory,spec=excluded.spec,action=excluded.action,
                      status=excluded.status,updated_at=excluded.updated_at";
        }
        $st = $pdo->prepare($sql);
        $st->execute([
            ':t' => $tenant, ':c' => $channel, ':s' => $sku,
            ':n' => (string)($f['name'] ?? ''), ':cat' => (string)($f['category'] ?? ''),
            ':p' => (float)($f['price'] ?? 0), ':inv' => (int)($f['inventory'] ?? 0),
            ':spec' => (string)($f['spec'] ?? ''), ':act' => (string)($f['action'] ?? 'register'),
            ':st' => $status, ':now' => $now, ':now2' => $now,
        ]);
    }

    /* POST /catalog/writeback/{channel}/{sku} — 단일 상품×채널 등록/수정 */
    public static function writeback(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $channel = (string)($args['channel'] ?? '');
        $sku = rawurldecode((string)($args['sku'] ?? ''));
        if ($channel === '' || $sku === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel/sku required'], 400);
        $body = (array)($req->getParsedBody() ?? []);
        $action = (string)($body['action'] ?? 'register');
        $status = self::channelStatus($pdo, $tenant, $channel, $action);
        self::upsert($pdo, $tenant, $channel, $sku, $body, $status);
        return self::jsonRes($res, ['ok' => true, 'status' => $status, 'channel' => $channel, 'sku' => $sku]);
    }

    /* POST /catalog/bulk-price — body: {items:[{channel,sku,price}]} 일괄 가격 수정 */
    public static function bulkPrice(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $items = $body['items'] ?? [];
        if (!is_array($items) || !$items) return self::jsonRes($res, ['ok' => false, 'error' => 'items required'], 400);
        $now = self::now();
        $updated = 0;
        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("UPDATE catalog_listing SET price=:p, updated_at=:now WHERE tenant_id=:t AND channel=:c AND sku=:s");
            foreach ($items as $it) {
                if (!is_array($it)) continue;
                $ch = (string)($it['channel'] ?? '');
                $sk = (string)($it['sku'] ?? '');
                if ($ch === '' || $sk === '') continue;
                $upd->execute([':p' => (float)($it['price'] ?? 0), ':now' => $now, ':t' => $tenant, ':c' => $ch, ':s' => $sk]);
                $updated += $upd->rowCount();
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::jsonRes($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
        return self::jsonRes($res, ['ok' => true, 'updated' => $updated]);
    }

    /* GET /catalog/listings — 테넌트 등록 리스팅 조회 */
    public static function listings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT channel,sku,name,category,price,inventory,action,status,updated_at
                             FROM catalog_listing WHERE tenant_id=:t ORDER BY updated_at DESC LIMIT 1000");
        $st->execute([':t' => $tenant]);
        return self::jsonRes($res, ['ok' => true, 'listings' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }
}
