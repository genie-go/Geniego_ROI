<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Crypto;

/**
 * 창고 관리(WMS) 영속화 핸들러 (205차 신설).
 *
 * 204차 전수감사 결론: WmsManager.jsx 가 useState 만 사용 → 새로고침 시 데이터 소실(P0).
 *   inventory 는 ChannelSync(/api/channel-sync/inventory)로 영속화되어 있으나,
 *   창고·택배사·권한·입출고이력·피킹리스트·자동발주·LOT 은 백엔드 전무였다.
 *
 * 본 핸들러가 7개 엔터티를 테넌트 격리로 영속화한다(CRM/Journey 4층 부활 패턴):
 *   wms_warehouses / wms_carriers / wms_permissions / wms_movements
 *   wms_picking / wms_supply_orders / wms_lots
 *
 * 라우팅: /api/wms/* (세션 self-auth, index.php bypass + no-/api 변형 등록).
 *   ★ basePath '/api' strip 트랩: routes.php 에 '/api' 없이 등록해야 매칭(204차 정본).
 * 인증: UserAuth::requirePro (pro+ 기능). 테넌트=authedTenant(위조 X-Tenant-Id 무시).
 * 택배사 api_key 는 AES-256-GCM 저장(smtp_pass/ai_key 패턴, decrypt 평문 passthrough).
 */
class Wms
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) {
            $decoded = json_decode((string)$req->getBody(), true);
            if (is_array($decoded)) $b = $decoded;
        }
        return $b;
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        $mysql = self::isMysql($pdo);
        if ($mysql) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_warehouses (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(200) NOT NULL, code VARCHAR(60), location VARCHAR(255), area VARCHAR(80),
                temp VARCHAR(60), manager VARCHAR(120), phone VARCHAR(60), type VARCHAR(40) DEFAULT 'Direct',
                active TINYINT(1) DEFAULT 1, created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_wms_wh_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_carriers (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(200) NOT NULL, code VARCHAR(60), type VARCHAR(40) DEFAULT 'Domestic',
                country VARCHAR(8), track_url VARCHAR(255), api_key TEXT, active TINYINT(1) DEFAULT 1,
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_wms_carrier_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                user_email VARCHAR(190) NOT NULL, role VARCHAR(40) DEFAULT 'viewer', warehouses TEXT,
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_wms_perm_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_movements (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                type VARCHAR(40) NOT NULL DEFAULT 'Inbound', wh_id VARCHAR(60), dest_wh_id VARCHAR(60),
                sku VARCHAR(120), name VARCHAR(255), qty DOUBLE DEFAULT 0, unit VARCHAR(40),
                memo TEXT, ref VARCHAR(120), reason VARCHAR(120), created_at VARCHAR(32),
                KEY idx_wms_mv_tenant (tenant_id), KEY idx_wms_mv_sku (sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_picking (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                order_ref VARCHAR(120), sku VARCHAR(120), name VARCHAR(255), qty DOUBLE DEFAULT 0,
                wh_id VARCHAR(60), carrier VARCHAR(120), status VARCHAR(40) DEFAULT 'pending',
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_wms_pick_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_supply_orders (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                sku VARCHAR(120), name VARCHAR(255), qty DOUBLE DEFAULT 0, supplier VARCHAR(200),
                wh_id VARCHAR(60), status VARCHAR(40) DEFAULT 'pending', eta VARCHAR(32),
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_wms_so_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_lots (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                sku VARCHAR(120), name VARCHAR(255), lot_no VARCHAR(120), mfg_date VARCHAR(32),
                expiry_date VARCHAR(32), qty DOUBLE DEFAULT 0, wh_id VARCHAR(60), created_at VARCHAR(32),
                KEY idx_wms_lot_tenant (tenant_id), KEY idx_wms_lot_exp (expiry_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_warehouses (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, code TEXT, location TEXT, area TEXT, temp TEXT, manager TEXT, phone TEXT, type TEXT DEFAULT 'Direct', active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_carriers (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, code TEXT, type TEXT DEFAULT 'Domestic', country TEXT, track_url TEXT, api_key TEXT, active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', user_email TEXT NOT NULL, role TEXT DEFAULT 'viewer', warehouses TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_movements (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', type TEXT NOT NULL DEFAULT 'Inbound', wh_id TEXT, dest_wh_id TEXT, sku TEXT, name TEXT, qty REAL DEFAULT 0, unit TEXT, memo TEXT, ref TEXT, reason TEXT, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_picking (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', order_ref TEXT, sku TEXT, name TEXT, qty REAL DEFAULT 0, wh_id TEXT, carrier TEXT, status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_supply_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', sku TEXT, name TEXT, qty REAL DEFAULT 0, supplier TEXT, wh_id TEXT, status TEXT DEFAULT 'pending', eta TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_lots (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', sku TEXT, name TEXT, lot_no TEXT, mfg_date TEXT, expiry_date TEXT, qty REAL DEFAULT 0, wh_id TEXT, created_at TEXT)");
        }
        // 기존 테이블 tenant_id 보강(무해 실패 무시)
        foreach (['wms_warehouses','wms_carriers','wms_permissions','wms_movements','wms_picking','wms_supply_orders','wms_lots'] as $tbl) {
            try { $pdo->exec("ALTER TABLE {$tbl} ADD COLUMN tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'"); } catch (\Throwable $e) {}
        }
    }

    /* ════════════════ 창고(Warehouses) ════════════════ */

    public static function listWarehouses(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_warehouses WHERE tenant_id=:t ORDER BY id DESC");
        $st->execute([':t' => self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['active'] = (bool)(int)($r['active'] ?? 1); }
        return self::json($res, ['ok' => true, 'warehouses' => $rows]);
    }

    public static function saveWarehouse(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now();
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '창고명을 입력하세요.'], 422);
        $pdo = self::db();
        $f = [
            ':name' => $name, ':code' => (string)($b['code'] ?? ''), ':location' => (string)($b['location'] ?? ''),
            ':area' => (string)($b['area'] ?? ''), ':temp' => (string)($b['temp'] ?? 'Room Temp'),
            ':manager' => (string)($b['manager'] ?? ''), ':phone' => (string)($b['phone'] ?? ''),
            ':type' => (string)($b['type'] ?? 'Direct'), ':active' => !empty($b['active']) ? 1 : 0,
        ];
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $f[':id'] = $id; $f[':t'] = $t; $f[':ua'] = $now;
            $st = $pdo->prepare("UPDATE wms_warehouses SET name=:name,code=:code,location=:location,area=:area,temp=:temp,manager=:manager,phone=:phone,type=:type,active=:active,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute($f);
            if ($st->rowCount() === 0 && !self::exists('wms_warehouses', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $f[':t'] = $t; $f[':ca'] = $now; $f[':ua'] = $now;
        $st = $pdo->prepare("INSERT INTO wms_warehouses (tenant_id,name,code,location,area,temp,manager,phone,type,active,created_at,updated_at) VALUES (:t,:name,:code,:location,:area,:temp,:manager,:phone,:type,:active,:ca,:ua)");
        $st->execute($f);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteWarehouse(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_warehouses WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 택배사(Carriers) ════════════════ */

    public static function listCarriers(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_carriers WHERE tenant_id=:t ORDER BY id DESC");
        $st->execute([':t' => self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['active'] = (bool)(int)($r['active'] ?? 1);
            // api_key 는 복호화하되 마스킹하여 노출(평문 전송 회피)
            $plain = Crypto::decrypt((string)($r['api_key'] ?? ''));
            $r['hasKey'] = $plain !== '';
            $r['api_key'] = $plain !== '' ? (substr($plain, 0, 3) . str_repeat('•', max(0, strlen($plain) - 3))) : '';
            $r['trackUrl'] = $r['track_url'] ?? '';
        }
        return self::json($res, ['ok' => true, 'carriers' => $rows]);
    }

    public static function saveCarrier(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now();
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '택배사명을 입력하세요.'], 422);
        $pdo = self::db();
        $rawKey = (string)($b['apiKey'] ?? $b['api_key'] ?? '');
        $f = [
            ':name' => $name, ':code' => (string)($b['code'] ?? ''), ':type' => (string)($b['type'] ?? 'Domestic'),
            ':country' => (string)($b['country'] ?? 'KR'), ':track_url' => (string)($b['trackUrl'] ?? $b['track_url'] ?? ''),
            ':active' => !empty($b['active']) ? 1 : 0,
        ];
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $f[':id'] = $id; $f[':t'] = $t; $f[':ua'] = $now;
            // 키 입력이 있을 때만 갱신(마스킹값 재전송 시 기존 유지)
            if ($rawKey !== '' && strpos($rawKey, '•') === false) {
                $f[':api_key'] = Crypto::encrypt($rawKey);
                $st = $pdo->prepare("UPDATE wms_carriers SET name=:name,code=:code,type=:type,country=:country,track_url=:track_url,api_key=:api_key,active=:active,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            } else {
                $st = $pdo->prepare("UPDATE wms_carriers SET name=:name,code=:code,type=:type,country=:country,track_url=:track_url,active=:active,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            }
            $st->execute($f);
            if ($st->rowCount() === 0 && !self::exists('wms_carriers', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $f[':api_key'] = $rawKey !== '' ? Crypto::encrypt($rawKey) : '';
        $f[':t'] = $t; $f[':ca'] = $now; $f[':ua'] = $now;
        $st = $pdo->prepare("INSERT INTO wms_carriers (tenant_id,name,code,type,country,track_url,api_key,active,created_at,updated_at) VALUES (:t,:name,:code,:type,:country,:track_url,:api_key,:active,:ca,:ua)");
        $st->execute($f);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteCarrier(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_carriers WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 창고 권한(Permissions) ════════════════ */

    public static function listPermissions(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_permissions WHERE tenant_id=:t ORDER BY id DESC");
        $st->execute([':t' => self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['warehouses'] = json_decode($r['warehouses'] ?? '[]', true) ?: []; }
        return self::json($res, ['ok' => true, 'permissions' => $rows]);
    }

    public static function savePermission(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now();
        $user = trim((string)($b['user'] ?? $b['user_email'] ?? ''));
        if ($user === '') return self::json($res, ['ok' => false, 'error' => '사용자를 입력하세요.'], 422);
        $whs = json_encode(array_values((array)($b['warehouses'] ?? [])), JSON_UNESCAPED_UNICODE);
        $pdo = self::db();
        $st = $pdo->prepare("INSERT INTO wms_permissions (tenant_id,user_email,role,warehouses,created_at,updated_at) VALUES (:t,:u,:r,:w,:ca,:ua)");
        $st->execute([':t' => $t, ':u' => $user, ':r' => (string)($b['role'] ?? 'viewer'), ':w' => $whs, ':ca' => $now, ':ua' => $now]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deletePermission(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_permissions WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 입출고 이력(Movements) ════════════════ */

    public static function listMovements(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $limit = max(1, min(1000, (int)($req->getQueryParams()['limit'] ?? 300)));
        $st = self::db()->prepare("SELECT * FROM wms_movements WHERE tenant_id=:t ORDER BY id DESC LIMIT {$limit}");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'movements' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function createMovement(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $pdo = self::db();
        $st = $pdo->prepare("INSERT INTO wms_movements (tenant_id,type,wh_id,dest_wh_id,sku,name,qty,unit,memo,ref,reason,created_at) VALUES (:t,:type,:wh,:dwh,:sku,:name,:qty,:unit,:memo,:ref,:reason,:ca)");
        $st->execute([
            ':t' => $t, ':type' => (string)($b['type'] ?? 'Inbound'), ':wh' => (string)($b['whId'] ?? $b['wh_id'] ?? ''),
            ':dwh' => (string)($b['destWhId'] ?? $b['dest_wh_id'] ?? ''), ':sku' => (string)($b['sku'] ?? ''),
            ':name' => (string)($b['name'] ?? ''), ':qty' => (float)($b['qty'] ?? 0), ':unit' => (string)($b['unit'] ?? ''),
            ':memo' => (string)($b['memo'] ?? ''), ':ref' => (string)($b['ref'] ?? ''), ':reason' => (string)($b['reason'] ?? ''),
            ':ca' => self::now(),
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ════════════════ 피킹 리스트(Picking) ════════════════ */

    public static function listPicking(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_picking WHERE tenant_id=:t ORDER BY id DESC LIMIT 500");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'picking' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function savePicking(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $st = $pdo->prepare("UPDATE wms_picking SET status=:s,carrier=:c,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute([':s' => (string)($b['status'] ?? 'pending'), ':c' => (string)($b['carrier'] ?? ''), ':ua' => $now, ':id' => $id, ':t' => $t]);
            if ($st->rowCount() === 0 && !self::exists('wms_picking', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $st = $pdo->prepare("INSERT INTO wms_picking (tenant_id,order_ref,sku,name,qty,wh_id,carrier,status,created_at,updated_at) VALUES (:t,:o,:sku,:name,:qty,:wh,:c,:s,:ca,:ua)");
        $st->execute([
            ':t' => $t, ':o' => (string)($b['orderRef'] ?? $b['order_ref'] ?? ''), ':sku' => (string)($b['sku'] ?? ''),
            ':name' => (string)($b['name'] ?? ''), ':qty' => (float)($b['qty'] ?? 0), ':wh' => (string)($b['whId'] ?? $b['wh_id'] ?? ''),
            ':c' => (string)($b['carrier'] ?? ''), ':s' => (string)($b['status'] ?? 'pending'), ':ca' => $now, ':ua' => $now,
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ════════════════ 자동 발주(Supply Orders) ════════════════ */

    public static function listSupplyOrders(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_supply_orders WHERE tenant_id=:t ORDER BY id DESC LIMIT 500");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'supplyOrders' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function saveSupplyOrder(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $st = $pdo->prepare("UPDATE wms_supply_orders SET status=:s,eta=:eta,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute([':s' => (string)($b['status'] ?? 'pending'), ':eta' => (string)($b['eta'] ?? ''), ':ua' => $now, ':id' => $id, ':t' => $t]);
            if ($st->rowCount() === 0 && !self::exists('wms_supply_orders', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $st = $pdo->prepare("INSERT INTO wms_supply_orders (tenant_id,sku,name,qty,supplier,wh_id,status,eta,created_at,updated_at) VALUES (:t,:sku,:name,:qty,:sup,:wh,:s,:eta,:ca,:ua)");
        $st->execute([
            ':t' => $t, ':sku' => (string)($b['sku'] ?? ''), ':name' => (string)($b['name'] ?? ''),
            ':qty' => (float)($b['qty'] ?? 0), ':sup' => (string)($b['supplier'] ?? ''), ':wh' => (string)($b['whId'] ?? $b['wh_id'] ?? ''),
            ':s' => (string)($b['status'] ?? 'pending'), ':eta' => (string)($b['eta'] ?? ''), ':ca' => $now, ':ua' => $now,
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ════════════════ LOT/유통기한(Lots) ════════════════ */

    public static function listLots(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        // FEFO: 유통기한 임박순 정렬
        $st = self::db()->prepare("SELECT * FROM wms_lots WHERE tenant_id=:t ORDER BY (expiry_date IS NULL), expiry_date ASC, id DESC LIMIT 1000");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'lots' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function createLot(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $pdo = self::db();
        $st = $pdo->prepare("INSERT INTO wms_lots (tenant_id,sku,name,lot_no,mfg_date,expiry_date,qty,wh_id,created_at) VALUES (:t,:sku,:name,:lot,:mfg,:exp,:qty,:wh,:ca)");
        $st->execute([
            ':t' => $t, ':sku' => (string)($b['sku'] ?? ''), ':name' => (string)($b['name'] ?? ''),
            ':lot' => (string)($b['lotNo'] ?? $b['lot_no'] ?? ''), ':mfg' => (string)($b['mfgDate'] ?? $b['mfg_date'] ?? ''),
            ':exp' => (string)($b['expiryDate'] ?? $b['expiry_date'] ?? ''), ':qty' => (float)($b['qty'] ?? 0),
            ':wh' => (string)($b['wh'] ?? $b['wh_id'] ?? ''), ':ca' => self::now(),
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteLot(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_lots WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ── 공통 유틸 ── */
    private static function exists(string $tbl, int $id, string $tenant): bool
    {
        $st = self::db()->prepare("SELECT 1 FROM {$tbl} WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => $id, ':t' => $tenant]);
        return (bool)$st->fetchColumn();
    }
}
