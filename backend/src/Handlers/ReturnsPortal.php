<?php
namespace Genie\Handlers;
use Psr\Http\Message\{ResponseInterface as Response, ServerRequestInterface as Request};

/**
 * ReturnsPortal — 반품 자동화 포탈 Backend API
 * - SQLite: returns, returns_settings, returns_automation
 */
class ReturnsPortal
{
    private static ?\PDO $db = null;

    private static function db(): \PDO
    {
        if (self::$db) return self::$db;
        $dir = __DIR__ . '/../../data';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $pdo = new \PDO('sqlite:' . $dir . '/returns.sqlite3');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        $pdo->exec("CREATE TABLE IF NOT EXISTS returns (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            return_id   TEXT UNIQUE NOT NULL,
            order_id    TEXT NOT NULL DEFAULT '',
            sku         TEXT NOT NULL DEFAULT '',
            name        TEXT NOT NULL DEFAULT '',
            channel     TEXT NOT NULL DEFAULT '',
            qty         INTEGER NOT NULL DEFAULT 1,
            reason      TEXT NOT NULL DEFAULT '',
            status      TEXT NOT NULL DEFAULT 'pending',
            req_date    TEXT NOT NULL DEFAULT '',
            track_no    TEXT NOT NULL DEFAULT '',
            refund_amt  REAL NOT NULL DEFAULT 0,
            defective   INTEGER NOT NULL DEFAULT 0,
            wms_linked  INTEGER NOT NULL DEFAULT 0,
            note        TEXT NOT NULL DEFAULT '',
            created_at  TEXT NOT NULL
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS returns_settings (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            key     TEXT UNIQUE NOT NULL,
            value   TEXT NOT NULL DEFAULT ''
        )");

        $pdo->exec("CREATE TABLE IF NOT EXISTS returns_automation (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            label   TEXT NOT NULL,
            enabled INTEGER NOT NULL DEFAULT 0
        )");

        // No seed data — real user data only

        self::$db = $pdo;
        return $pdo;
    }

    private static function json(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function body(Request $request): array
    {
        $parsed = $request->getParsedBody();
        if (is_array($parsed) && count($parsed)) return $parsed;
        $raw = (string)$request->getBody();
        if ($raw === '') return [];
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /** GET /v420/returns/list */
    public static function list(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $rows = $db->query("SELECT * FROM returns ORDER BY id DESC")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok' => true, 'returns' => $rows]);
    }

    /** POST /v420/returns — create */
    public static function create(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $b = self::body($request);
        $rid = 'RT-' . date('Y') . '-' . str_pad((int)$db->query("SELECT COUNT(*)+1 FROM returns")->fetchColumn(), 4, '0', STR_PAD_LEFT);
        $now = gmdate('c');
        $ins = $db->prepare("INSERT INTO returns (return_id, order_id, sku, name, channel, qty, reason, status, req_date, track_no, refund_amt, defective, wms_linked, note, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $ins->execute([
            $rid,
            $b['order_id'] ?? '', $b['sku'] ?? '', $b['name'] ?? '', $b['channel'] ?? '',
            (int)($b['qty'] ?? 1), $b['reason'] ?? '', 'pending',
            $b['req_date'] ?? date('Y-m-d'), $b['track_no'] ?? '',
            (float)($b['refund_amt'] ?? 0), (int)($b['defective'] ?? 0), 0,
            $b['note'] ?? '', $now
        ]);
        return self::json($response, ['ok' => true, 'return_id' => $rid]);
    }

    /** POST /v420/returns/{id}/status */
    public static function updateStatus(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $b = self::body($request);
        $id = $args['id'];
        $status = $b['status'] ?? 'pending';
        $allowed = ['pending','inspecting','approved','rejected','refunded','restocked'];
        if (!in_array($status, $allowed)) return self::json($response, ['ok' => false, 'error' => 'Invalid status'], 400);
        $db->prepare("UPDATE returns SET status=? WHERE id=?")->execute([$status, $id]);
        return self::json($response, ['ok' => true]);
    }

    /** POST /v420/returns/{id}/wms-link */
    public static function wmsLink(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $id = $args['id'];
        $db->prepare("UPDATE returns SET wms_linked=1 WHERE id=?")->execute([$id]);
        return self::json($response, ['ok' => true]);
    }

    /** DELETE /v420/returns/{id} */
    public static function delete(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $id = $args['id'];
        $db->prepare("DELETE FROM returns WHERE id=?")->execute([$id]);
        return self::json($response, ['ok' => true]);
    }

    /** GET /v420/returns/summary */
    public static function summary(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $total = (int)$db->query("SELECT COUNT(*) FROM returns")->fetchColumn();
        $pending = (int)$db->query("SELECT COUNT(*) FROM returns WHERE status='pending'")->fetchColumn();
        $defective = (int)$db->query("SELECT COUNT(*) FROM returns WHERE defective=1")->fetchColumn();
        $totalRefund = (float)$db->query("SELECT COALESCE(SUM(refund_amt),0) FROM returns")->fetchColumn();
        $wmsLinked = (int)$db->query("SELECT COUNT(*) FROM returns WHERE wms_linked=1")->fetchColumn();
        $processed = (int)$db->query("SELECT COUNT(*) FROM returns WHERE status IN ('refunded','restocked')")->fetchColumn();
        $refundRate = $total > 0 ? round($processed / $total * 100) : 0;

        return self::json($response, [
            'ok' => true,
            'total' => $total, 'pending' => $pending, 'defective' => $defective,
            'totalRefund' => $totalRefund, 'wmsLinked' => $wmsLinked, 'refundRate' => $refundRate
        ]);
    }

    /** GET /v420/returns/settings */
    public static function getSettings(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $rows = $db->query("SELECT key, value FROM returns_settings")->fetchAll(\PDO::FETCH_KEY_PAIR);
        $auto = $db->query("SELECT * FROM returns_automation ORDER BY id")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok' => true, 'settings' => $rows ?: new \stdClass(), 'automation' => $auto]);
    }

    /** POST /v420/returns/settings */
    public static function saveSettings(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $b = self::body($request);
        $ins = $db->prepare("INSERT OR REPLACE INTO returns_settings (key, value) VALUES (?,?)");
        foreach ($b as $k => $v) { $ins->execute([$k, (string)$v]); }
        return self::json($response, ['ok' => true]);
    }

    /** POST /v420/returns/automation/toggle */
    public static function toggleAutomation(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $b = self::body($request);
        $id = $b['id'] ?? 0;
        $db->exec("UPDATE returns_automation SET enabled = CASE WHEN enabled=1 THEN 0 ELSE 1 END WHERE id=$id");
        return self::json($response, ['ok' => true]);
    }
}
