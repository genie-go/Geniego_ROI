<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * v420 — Supply Chain Visibility
 * In-memory SQLite — lines, suppliers, risk rules, stage tracking
 */
class SupplyChain
{
    private static ?\PDO $db = null;

    private static function db(): \PDO
    {
        if (self::$db !== null) return self::$db;
        $pdo = new \PDO('sqlite::memory:');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        $pdo->exec("PRAGMA journal_mode=WAL");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_lines (
            id INTEGER PRIMARY KEY AUTOINCREMENT, line_id TEXT UNIQUE, supplier TEXT,
            sku TEXT, name TEXT, leadTime INTEGER DEFAULT 14, risk TEXT DEFAULT 'low',
            delayRate REAL DEFAULT 0, totalCost REAL DEFAULT 0, created_at TEXT)");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_stages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, line_id TEXT NOT NULL, stage TEXT,
            stageDate TEXT, done INTEGER DEFAULT 0, note TEXT, sort_order INTEGER DEFAULT 0)");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT, sup_id TEXT UNIQUE, name TEXT,
            country TEXT, category TEXT, leadTime INTEGER, delayRate REAL,
            orderCount INTEGER DEFAULT 0, reliability REAL DEFAULT 95, contact TEXT, created_at TEXT)");

        $pdo->exec("CREATE TABLE IF NOT EXISTS sc_risk_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT, rule TEXT, action TEXT,
            active INTEGER DEFAULT 1, created_at TEXT)");

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

    // ── Supply Lines ─────────────────────────────────────────────────────────

    public static function listLines(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $lines = $db->query("SELECT * FROM sc_lines ORDER BY created_at DESC")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($lines as &$l) {
            $st = $db->prepare("SELECT * FROM sc_stages WHERE line_id=? ORDER BY sort_order");
            $st->execute([$l['line_id']]);
            $l['stages'] = $st->fetchAll(\PDO::FETCH_ASSOC);
        }
        return self::json($response, ['ok'=>true,'lines'=>$lines]);
    }

    public static function createLine(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $b = self::body($request);
        $lid = $b['line_id'] ?? ('SUP-' . str_pad((string)rand(1, 9999), 3, '0', STR_PAD_LEFT));
        $db->prepare("INSERT OR REPLACE INTO sc_lines (line_id,supplier,sku,name,leadTime,risk,delayRate,totalCost,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
            ->execute([$lid,$b['supplier']??'',$b['sku']??'',$b['name']??'',(int)($b['leadTime']??14),$b['risk']??'low',(float)($b['delayRate']??0),(float)($b['totalCost']??0),gmdate('c')]);
        // create default stages
        $stages = $b['stages'] ?? [
            ['stage'=>'Purchase Order','done'=>0],['stage'=>'생산','done'=>0],
            ['stage'=>'선적','done'=>0],['stage'=>'통관','done'=>0],
            ['stage'=>'입고','done'=>0],['stage'=>'출고준비','done'=>0]
        ];
        $ins = $db->prepare("INSERT INTO sc_stages (line_id,stage,stageDate,done,note,sort_order) VALUES (?,?,?,?,?,?)");
        foreach ($stages as $i => $s) {
            $ins->execute([$lid,$s['stage']??'',$s['stageDate']??$s['date']??'',(int)($s['done']??0),$s['note']??'',$i]);
        }
        return self::json($response, ['ok'=>true,'line_id'=>$lid]);
    }

    public static function updateLine(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $b = self::body($request); $id = (int)($args['id']??0);
        $sets = []; $params = [':id'=>$id];
        foreach (['supplier','sku','name','leadTime','risk','delayRate','totalCost'] as $f) {
            if (isset($b[$f])) { $sets[] = "$f=:$f"; $params[":$f"] = $b[$f]; }
        }
        if (count($sets)) $db->prepare("UPDATE sc_lines SET ".implode(',',$sets)." WHERE id=:id")->execute($params);
        return self::json($response, ['ok'=>true]);
    }

    public static function deleteLine(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $id = (int)($args['id']??0);
        $line = $db->prepare("SELECT line_id FROM sc_lines WHERE id=?"); $line->execute([$id]);
        $r = $line->fetch(\PDO::FETCH_ASSOC);
        if ($r) { $db->prepare("DELETE FROM sc_stages WHERE line_id=?")->execute([$r['line_id']]); }
        $db->prepare("DELETE FROM sc_lines WHERE id=?")->execute([$id]);
        return self::json($response, ['ok'=>true]);
    }

    public static function updateStage(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $b = self::body($request); $id = (int)($args['id']??0);
        $line = $db->prepare("SELECT line_id FROM sc_lines WHERE id=?"); $line->execute([$id]);
        $r = $line->fetch(\PDO::FETCH_ASSOC);
        if (!$r) return self::json($response, ['ok'=>false,'error'=>'line not found'], 404);
        $stage = $b['stage']??''; $done = (int)($b['done']??1);
        $db->prepare("UPDATE sc_stages SET done=?, note=?, stageDate=? WHERE line_id=? AND stage=?")
            ->execute([$done,$b['note']??'',gmdate('Y-m-d'),$r['line_id'],$stage]);
        return self::json($response, ['ok'=>true]);
    }

    // ── Suppliers ─────────────────────────────────────────────────────────────

    public static function listSuppliers(Request $request, Response $response, array $args): Response
    {
        $rows = self::db()->query("SELECT * FROM sc_suppliers ORDER BY name")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok'=>true,'suppliers'=>$rows]);
    }

    public static function createSupplier(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $b = self::body($request);
        $sid = $b['sup_id'] ?? ('SUPL-'.str_pad((string)rand(1,999),3,'0',STR_PAD_LEFT));
        $db->prepare("INSERT OR REPLACE INTO sc_suppliers (sup_id,name,country,category,leadTime,delayRate,orderCount,reliability,contact,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
            ->execute([$sid,$b['name']??'',$b['country']??'',$b['category']??'',(int)($b['leadTime']??14),(float)($b['delayRate']??0),(int)($b['orderCount']??0),(float)($b['reliability']??95),$b['contact']??'',gmdate('c')]);
        return self::json($response, ['ok'=>true,'sup_id'=>$sid]);
    }

    public static function updateSupplier(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $b = self::body($request); $id = (int)($args['id']??0);
        $sets = []; $params = [':id'=>$id];
        foreach (['name','country','category','leadTime','delayRate','orderCount','reliability','contact'] as $f) {
            if (isset($b[$f])) { $sets[] = "$f=:$f"; $params[":$f"] = $b[$f]; }
        }
        if (count($sets)) $db->prepare("UPDATE sc_suppliers SET ".implode(',',$sets)." WHERE id=:id")->execute($params);
        return self::json($response, ['ok'=>true]);
    }

    public static function deleteSupplier(Request $request, Response $response, array $args): Response
    {
        self::db()->prepare("DELETE FROM sc_suppliers WHERE id=?")->execute([(int)($args['id']??0)]);
        return self::json($response, ['ok'=>true]);
    }

    // ── Risk Rules ───────────────────────────────────────────────────────────

    public static function listRiskRules(Request $request, Response $response, array $args): Response
    {
        $rows = self::db()->query("SELECT * FROM sc_risk_rules ORDER BY id")->fetchAll(\PDO::FETCH_ASSOC);
        return self::json($response, ['ok'=>true,'rules'=>$rows]);
    }

    public static function createRiskRule(Request $request, Response $response, array $args): Response
    {
        $db = self::db(); $b = self::body($request);
        $db->prepare("INSERT INTO sc_risk_rules (rule,action,active,created_at) VALUES (?,?,1,?)")
            ->execute([$b['rule']??'',$b['action']??'',gmdate('c')]);
        return self::json($response, ['ok'=>true,'id'=>$db->lastInsertId()]);
    }

    public static function toggleRiskRule(Request $request, Response $response, array $args): Response
    {
        $id = (int)($args['id']??0);
        self::db()->prepare("UPDATE sc_risk_rules SET active = CASE WHEN active=1 THEN 0 ELSE 1 END WHERE id=?")->execute([$id]);
        return self::json($response, ['ok'=>true]);
    }

    // ── Summary ──────────────────────────────────────────────────────────────

    public static function summary(Request $request, Response $response, array $args): Response
    {
        $db = self::db();
        $lines = (int)$db->query("SELECT COUNT(*) FROM sc_lines")->fetchColumn();
        $suppliers = (int)$db->query("SELECT COUNT(*) FROM sc_suppliers")->fetchColumn();
        $highRisk = (int)$db->query("SELECT COUNT(*) FROM sc_lines WHERE risk='high'")->fetchColumn();
        $avgLead = $db->query("SELECT AVG(leadTime) FROM sc_lines")->fetchColumn();
        $totalCost = $db->query("SELECT SUM(totalCost) FROM sc_lines")->fetchColumn();
        return self::json($response, [
            'ok'=>true,'lines'=>$lines,'suppliers'=>$suppliers,'highRisk'=>$highRisk,
            'avgLeadTime'=>$avgLead!==false?round((float)$avgLead,1):0,
            'totalCost'=>(float)($totalCost??0)
        ]);
    }
}
