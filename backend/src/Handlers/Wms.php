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
            Db::ensureWmsSupplyOrders($pdo); // SSOT: Db::ensureWmsSupplyOrders 일원화(종전 DemandForecast 와 중복 제거)
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_lots (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                sku VARCHAR(120), name VARCHAR(255), lot_no VARCHAR(120), mfg_date VARCHAR(32),
                expiry_date VARCHAR(32), qty DOUBLE DEFAULT 0, wh_id VARCHAR(60), created_at VARCHAR(32),
                KEY idx_wms_lot_tenant (tenant_id), KEY idx_wms_lot_exp (expiry_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 208차 WMS↔재고 통합: 입출고가 유지하는 물리 창고 재고 집계(창고별·채널무관).
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_stock (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                sku VARCHAR(120) NOT NULL, wh_id VARCHAR(60) NOT NULL DEFAULT '', name VARCHAR(255),
                on_hand DOUBLE DEFAULT 0, updated_at VARCHAR(32),
                UNIQUE KEY uq_wms_stock (tenant_id, sku, wh_id), KEY idx_wms_stock_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 212차 #3: 매입처(공급자) registry — 발주 대상·파트너 계정 연결.
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(200) NOT NULL, code VARCHAR(60), contact VARCHAR(120), phone VARCHAR(60),
                email VARCHAR(190), memo TEXT, active TINYINT(1) DEFAULT 1,
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_wms_sup_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_warehouses (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, code TEXT, location TEXT, area TEXT, temp TEXT, manager TEXT, phone TEXT, type TEXT DEFAULT 'Direct', active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_carriers (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, code TEXT, type TEXT DEFAULT 'Domestic', country TEXT, track_url TEXT, api_key TEXT, active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', user_email TEXT NOT NULL, role TEXT DEFAULT 'viewer', warehouses TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_movements (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', type TEXT NOT NULL DEFAULT 'Inbound', wh_id TEXT, dest_wh_id TEXT, sku TEXT, name TEXT, qty REAL DEFAULT 0, unit TEXT, memo TEXT, ref TEXT, reason TEXT, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_picking (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', order_ref TEXT, sku TEXT, name TEXT, qty REAL DEFAULT 0, wh_id TEXT, carrier TEXT, status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT)");
            Db::ensureWmsSupplyOrders($pdo); // SSOT: Db::ensureWmsSupplyOrders 일원화(종전 DemandForecast 와 중복 제거)
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_lots (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', sku TEXT, name TEXT, lot_no TEXT, mfg_date TEXT, expiry_date TEXT, qty REAL DEFAULT 0, wh_id TEXT, created_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_stock (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', sku TEXT NOT NULL, wh_id TEXT NOT NULL DEFAULT '', name TEXT, on_hand REAL DEFAULT 0, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, code TEXT, contact TEXT, phone TEXT, email TEXT, memo TEXT, active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)");
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_stock ON wms_stock(tenant_id, sku, wh_id)"); } catch (\Throwable $e) {}
        }
        // 기존 테이블 tenant_id 보강(무해 실패 무시)
        foreach (['wms_warehouses','wms_carriers','wms_permissions','wms_movements','wms_picking','wms_supply_orders','wms_lots','wms_stock'] as $tbl) {
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
        // 212차 #3: 창고 수 플랜 한도 강제(신규 생성만). 초과 시 402 업그레이드 유도.
        try {
            $wc = $pdo->prepare("SELECT COUNT(*) FROM wms_warehouses WHERE tenant_id=?"); $wc->execute([$t]);
            $plan = \Genie\PlanLimits::tenantPlan($pdo, $t);
            if ($lim = \Genie\PlanLimits::exceeded($pdo, $plan, 'warehouses', (int)$wc->fetchColumn())) {
                return self::json($res, $lim, 402);
            }
        } catch (\Throwable $e) { /* 카운트 실패 시 통과(가용성 우선) */ }
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
        // 212차 #3: 물류처(택배사) 수 플랜 한도(신규 생성). 초과 시 402 업그레이드 유도.
        try {
            $cc = $pdo->prepare("SELECT COUNT(*) FROM wms_carriers WHERE tenant_id=?"); $cc->execute([$t]);
            if ($lim = \Genie\PlanLimits::exceeded($pdo, \Genie\PlanLimits::tenantPlan($pdo, $t), 'logistics', (int)$cc->fetchColumn())) {
                return self::json($res, $lim, 402);
            }
        } catch (\Throwable $e) { /* 가용성 우선 */ }
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

    /* ════════════════ 매입처(Suppliers) — 212차 #3 ════════════════ */
    public static function listSuppliers(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_suppliers WHERE tenant_id=:t ORDER BY id DESC");
        $st->execute([':t' => self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['active'] = (bool)(int)($r['active'] ?? 1); }
        return self::json($res, ['ok' => true, 'suppliers' => $rows]);
    }

    public static function saveSupplier(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now();
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '매입처명을 입력하세요.'], 422);
        $pdo = self::db();
        $f = [
            ':name' => $name, ':code' => (string)($b['code'] ?? ''), ':contact' => (string)($b['contact'] ?? ''),
            ':phone' => (string)($b['phone'] ?? ''), ':email' => (string)($b['email'] ?? ''),
            ':memo' => (string)($b['memo'] ?? ''), ':active' => !empty($b['active']) ? 1 : 0,
        ];
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $f[':id'] = $id; $f[':t'] = $t; $f[':ua'] = $now;
            $st = $pdo->prepare("UPDATE wms_suppliers SET name=:name,code=:code,contact=:contact,phone=:phone,email=:email,memo=:memo,active=:active,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute($f);
            if ($st->rowCount() === 0 && !self::exists('wms_suppliers', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        // 212차 #3: 매입처 수 플랜 한도(신규 생성). 초과 시 402 업그레이드 유도.
        try {
            $sc = $pdo->prepare("SELECT COUNT(*) FROM wms_suppliers WHERE tenant_id=?"); $sc->execute([$t]);
            if ($lim = \Genie\PlanLimits::exceeded($pdo, \Genie\PlanLimits::tenantPlan($pdo, $t), 'suppliers', (int)$sc->fetchColumn())) {
                return self::json($res, $lim, 402);
            }
        } catch (\Throwable $e) { /* 가용성 우선 */ }
        $f[':t'] = $t; $f[':ca'] = $now; $f[':ua'] = $now;
        $st = $pdo->prepare("INSERT INTO wms_suppliers (tenant_id,name,code,contact,phone,email,memo,active,created_at,updated_at) VALUES (:t,:name,:code,:contact,:phone,:email,:memo,:active,:ca,:ua)");
        $st->execute($f);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteSupplier(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_suppliers WHERE id=:id AND tenant_id=:t");
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

    /**
     * [현 차수] 219 P2: wms_permissions 창고 접근 강제(백워드 호환). 그동안 권한표가 있어도 CRUD 가
     *   전혀 검사하지 않아, 같은 테넌트 내 임의 사용자가 모든 창고 재고를 변동할 수 있었다.
     *   ★안전 가드: ①테넌트에 권한행 0개 → 허용(미설정 보존) ②팀 owner → 전 창고 허용
     *   ③api_key/세션 미해결 → 허용(인증은 requirePro, 격리는 tenant) ④WMS role='admin' → 전 창고
     *   ⑤그 외: warehouses JSON 에 대상 창고 포함 시 허용, 미포함/권한행 없음 → 403. 가드 오류=비차단(가용성).
     * @return ?Response 거부 시 403, 허용 시 null.
     */
    private static function guardWarehouse(Request $req, Response $res, string $whId): ?Response
    {
        try {
            $t = self::tenant($req);
            $pdo = self::db();
            $cnt = $pdo->prepare("SELECT COUNT(*) FROM wms_permissions WHERE tenant_id=?");
            $cnt->execute([$t]);
            if ((int)$cnt->fetchColumn() === 0) return null;            // 권한 미설정 테넌트 → 강제 안 함
            $u = UserAuth::authedUser($req);
            if (!$u) return null;                                       // 세션 미해결(api_key 등)
            if ((string)($u['team_role'] ?? 'owner') === 'owner') return null; // 팀 owner = 전 창고
            $email = strtolower(trim((string)($u['email'] ?? '')));
            if ($email === '') return null;
            $pr = $pdo->prepare("SELECT role, warehouses FROM wms_permissions WHERE tenant_id=? AND LOWER(user_email)=? LIMIT 1");
            $pr->execute([$t, $email]);
            $row = $pr->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return self::json($res, ['ok'=>false, 'error'=>'WMS 접근 권한이 없습니다.', 'code'=>'WMS_FORBIDDEN'], 403);
            if ((string)($row['role'] ?? '') === 'admin') return null;  // WMS admin = 전 창고
            if ($whId === '') return null;                             // 창고 미지정 액션은 통과(read=tenant 격리)
            $whs = json_decode((string)($row['warehouses'] ?? '[]'), true);
            if (!is_array($whs)) $whs = [];
            if (in_array($whId, $whs, true)) return null;
            return self::json($res, ['ok'=>false, 'error'=>'해당 창고 접근 권한이 없습니다.', 'code'=>'WMS_WAREHOUSE_FORBIDDEN'], 403);
        } catch (\Throwable $e) { return null; }                       // 가드 오류 → 비차단(격리는 tenant 가 처리)
    }

    public static function createMovement(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $whId = (string)($b['whId'] ?? $b['wh_id'] ?? '');
        if ($err = self::guardWarehouse($req, $res, $whId)) return $err;   // [현 차수] 219 P2 창고 권한 강제
        try {
            $id = self::recordMovement($t, [
                'type' => (string)($b['type'] ?? 'Inbound'), 'wh_id' => (string)($b['whId'] ?? $b['wh_id'] ?? ''),
                'dest_wh_id' => (string)($b['destWhId'] ?? $b['dest_wh_id'] ?? ''), 'sku' => (string)($b['sku'] ?? ''),
                'name' => (string)($b['name'] ?? ''), 'qty' => (float)($b['qty'] ?? 0), 'unit' => (string)($b['unit'] ?? ''),
                'memo' => (string)($b['memo'] ?? ''), 'ref' => (string)($b['ref'] ?? ''), 'reason' => (string)($b['reason'] ?? ''),
            ]);
        } catch (\RuntimeException $e) {
            // [현 차수] 감사 P1: 출고 재고부족 → 422(오버셀 거부 명시). 무음 0클램프 제거.
            if (str_starts_with($e->getMessage(), 'insufficient_stock')) {
                return self::json($res, ['ok' => false, 'error' => '재고 부족: 출고 수량이 가용 재고를 초과합니다.', 'code' => 'INSUFFICIENT_STOCK'], 422);
            }
            throw $e;
        }
        Db::audit(self::db(), $t, 'wms.movement', ['id'=>$id, 'type'=>(string)($b['type'] ?? 'Inbound'), 'wh_id'=>$whId, 'sku'=>(string)($b['sku'] ?? ''), 'qty'=>(float)($b['qty'] ?? 0)]); // 감사: 입출고(재고 무결성)
        return self::json($res, ['ok' => true, 'id' => $id]);
    }

    /**
     * 212차 #3-B: 입출고 기록 단일 경로(본사 createMovement + 파트너 포털 창고/물류 공용).
     *   이력(wms_movements) INSERT + 물리재고(wms_stock) 동기화를 한 곳에서 보장 → 택배출고·반품입고·
     *   입출고 등 모든 행위가 본사 WMS·대시보드와 값 일체화. 반환: movement id.
     */
    public static function recordMovement(string $t, array $d): int
    {
        self::ensureTables();
        $pdo = self::db(); $now = self::now();
        $type = (string)($d['type'] ?? 'Inbound'); $wh = (string)($d['wh_id'] ?? '');
        $dwh = (string)($d['dest_wh_id'] ?? ''); $sku = (string)($d['sku'] ?? '');
        $name = (string)($d['name'] ?? ''); $qty = (float)($d['qty'] ?? 0);
        // [225차 P1-17] ref 멱등 가드 — ref 가 있는 행위(채널판매/PO입고/반품입고 등)는 (tenant,ref,type)
        //   중복이면 재적용 skip. 직접 호출자(PartnerPortal 입고/반품입고)가 재시도 시 재고가 이중 반영되던
        //   결함 차단. ref 가 빈 행위(수동 조정/이동)는 매번 distinct → 가드 미적용(오탐 방지).
        $ref = (string)($d['ref'] ?? '');
        if ($ref !== '') {
            $dup = $pdo->prepare("SELECT id FROM wms_movements WHERE tenant_id=? AND ref=? AND type=? LIMIT 1");
            $dup->execute([$t, $ref, $type]);
            $existing = $dup->fetchColumn();
            if ($existing !== false) return (int)$existing; // 이미 반영됨 → 멱등 반환
        }
        // [현 차수] 감사 P1: 이력 INSERT + 물리재고 적용을 트랜잭션으로 원자화. 출고 재고부족(strict) 시
        //   adjustStock 예외 → 롤백 → 이력만 남고 재고 미차감되는 불일치/오버셀 은폐 차단.
        $ownTxn = !$pdo->inTransaction();
        if ($ownTxn) $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO wms_movements (tenant_id,type,wh_id,dest_wh_id,sku,name,qty,unit,memo,ref,reason,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$t, $type, $wh, $dwh, $sku, $name, $qty, (string)($d['unit'] ?? ''), (string)($d['memo'] ?? ''), (string)($d['ref'] ?? ''), (string)($d['reason'] ?? ''), $now]);
            $id = (int)$pdo->lastInsertId();
            self::applyMovementToStock($t, $type, $wh, $dwh, $sku, $name, $qty);
            if ($ownTxn) $pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            if ($ownTxn && $pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * [현 차수] 보편 채널 동기화(단방향 자동진입): 채널 취소/반품 시 물리 창고 재고를 반품입고로 복원한다.
     *   ★판매-복원 대칭 가드(허위 재고값 방지):
     *   - restockRef 멱등: 같은 복원 ref 이미 있으면 skip(이중 입고 방지).
     *   - 대응 판매 출고(saleRef Outbound)가 실제 있었을 때만 복원 → reflectChannelSale 로 차감된 분만 복원
     *     (미추적 SKU/미차감 주문은 over-restock 안 함). 복원량=min(qty, 차감분).
     *   - 입고(가산)만 수행 → 오버셀/예외 없음. best-effort(예외 흡수). 데모/빈 SKU skip.
     * @return bool 신규 복원 시 true.
     */
    public static function reflectChannelRestock(string $tenant, string $sku, string $name, float $qty, string $saleRef, string $restockRef): bool
    {
        $tenant = trim($tenant);
        if ($tenant === '' || strtolower($tenant) === 'demo' || $sku === '' || $qty <= 0) return false;
        try {
            self::ensureTables();
            $pdo = self::db();
            // 멱등: 같은 restockRef 의 반품입고가 이미 있으면 skip.
            $chk = $pdo->prepare("SELECT 1 FROM wms_movements WHERE tenant_id=? AND ref=? AND type=? LIMIT 1");
            $chk->execute([$tenant, $restockRef, 'ReturnsInbound']);
            if ($chk->fetchColumn()) return false;
            // 대칭 가드: 대응 채널 판매 출고(saleRef)가 실제 있었을 때만 복원(미차감분 over-restock 방지).
            $saleChk = $pdo->prepare("SELECT qty FROM wms_movements WHERE tenant_id=? AND ref=? AND type=? LIMIT 1");
            $saleChk->execute([$tenant, $saleRef, 'Outbound']);
            $soldQty = $saleChk->fetchColumn();
            if ($soldQty === false) return false; // 판매 차감 이력 없음 → 복원 대상 아님
            $restoreQty = min((float)$qty, (float)$soldQty); // 차감분 초과 복원 방지
            if ($restoreQty <= 0) return false;
            $wh = self::primaryWarehouse($tenant);
            self::recordMovement($tenant, [
                'type' => 'ReturnsInbound', 'wh_id' => $wh, 'sku' => $sku, 'name' => $name,
                'qty' => $restoreQty, 'ref' => $restockRef, 'reason' => 'channel_sync_restock',
            ]);
            return true;
        } catch (\Throwable $e) {
            error_log('[Wms.reflectChannelRestock] ' . $e->getMessage());
            return false;
        }
    }

    /**
     * [현 차수] 보편 채널 동기화(단방향 자동진입): 채널 판매를 물리 창고 재고(wms_stock)에 출고로 반영한다.
     *   ★안전 3중 가드:
     *   ① ref(채널 주문 식별자) 멱등 — 재폴링/중복 호출 시 1회만 차감(이중 차감 방지).
     *   ② 물리 추적 SKU 한정 — 해당 SKU 의 wms_stock 행이 기본창고에 있을 때만 차감(미추적 SKU/무-WMS
     *      테넌트는 spurious 0행 생성 없이 skip → 수동 WMS 워크플로우/미사용 테넌트 무영향).
     *   ③ non-throw — 가용분(min(qty,on_hand))만 차감해 strict 출고 예외 회피, 오버셀은 로그(은폐 아님).
     *   best-effort: 예외는 호출측(채널 동기화) 흐름을 깨지 않도록 흡수.
     * @return bool 신규 차감 시 true.
     */
    public static function reflectChannelSale(string $tenant, string $sku, string $name, float $qty, string $ref): bool
    {
        $tenant = trim($tenant);
        if ($tenant === '' || strtolower($tenant) === 'demo' || $sku === '' || $qty <= 0) return false;
        try {
            self::ensureTables();
            $pdo = self::db();
            // ① 멱등: 같은 ref 의 채널판매 출고가 이미 있으면 skip.
            $chk = $pdo->prepare("SELECT 1 FROM wms_movements WHERE tenant_id=? AND ref=? AND type=? LIMIT 1");
            $chk->execute([$tenant, $ref, 'Outbound']);
            if ($chk->fetchColumn()) return false;
            $wh = self::primaryWarehouse($tenant);
            // ② 물리 추적 SKU 한정: 기본창고에 재고 행이 있을 때만 차감(없으면 미추적 → skip).
            $sel = $pdo->prepare("SELECT on_hand FROM wms_stock WHERE tenant_id=? AND sku=? AND wh_id=? LIMIT 1");
            $sel->execute([$tenant, $sku, $wh]);
            $row = $sel->fetch(\PDO::FETCH_ASSOC);
            if ($row === false) return false; // 미추적 SKU → 물리 차감 대상 아님(채널재고만 차감 유지)
            // ③ non-throw: 가용분만 차감(strict 출고 예외 회피). 오버셀은 경고 로그.
            $onHand = (float)$row['on_hand'];
            $deduct = min($qty, $onHand);
            if ($deduct <= 0) {
                error_log("[Wms.reflectChannelSale] oversell(stock 0) tenant=$tenant sku=$sku want=$qty");
                return false; // 재고 0 → 변동 없음(이력 미생성, 다음 입고 후 폴링 시 차감 기회)
            }
            self::recordMovement($tenant, [
                'type' => 'Outbound', 'wh_id' => $wh, 'sku' => $sku, 'name' => $name,
                'qty' => $deduct, 'ref' => $ref, 'reason' => 'channel_sync_sale',
            ]);
            if ($deduct < $qty) {
                error_log("[Wms.reflectChannelSale] partial(oversell) tenant=$tenant sku=$sku want=$qty avail=$onHand");
            }
            return true;
        } catch (\Throwable $e) {
            error_log('[Wms.reflectChannelSale] ' . $e->getMessage());
            return false;
        }
    }

    /** 테넌트 기본(우선) 창고 wh_id. 활성 창고 중 최소 id, 없으면 'default'. */
    private static function primaryWarehouse(string $tenant): string
    {
        try {
            $pdo = self::db();
            $st = $pdo->prepare("SELECT id FROM wms_warehouses WHERE tenant_id=? AND active=1 ORDER BY id ASC LIMIT 1");
            $st->execute([$tenant]);
            $id = $st->fetchColumn();
            if ($id !== false && $id !== null && (string)$id !== '') return (string)$id;
        } catch (\Throwable $e) { /* fallthrough */ }
        return 'default';
    }

    /** 입출고 유형 → 물리재고 부호 적용(영문 IO_TYPES + 한글 데모 라벨 모두 지원). */
    private static function applyMovementToStock(string $t, string $type, string $wh, string $dwh, string $sku, string $name, float $qty): void
    {
        if ($sku === '' || $qty == 0.0) return;
        $tl = strtolower($type);
        $isIn  = in_array($type, ['Inbound','ReturnsInbound'], true) || str_contains($type, '입고');
        $isOut = in_array($type, ['Outbound','ReturnsOutbound','Disposal'], true) || (str_contains($type, '출고') && !str_contains($type, '입고')) || str_contains($type, '폐기');
        if ($type === 'WarehouseTransfer' || str_contains($type, '이고') || str_contains($type, '이동')) {
            self::adjustStock($t, $sku, $wh, $name, -abs($qty), true); // 출고 leg=strict(재고부족 거부)
            self::adjustStock($t, $sku, $dwh !== '' ? $dwh : $wh, $name, abs($qty));
        } elseif ($type === 'StockAdj' || str_contains($type, '조정')) {
            self::adjustStock($t, $sku, $wh, $name, $qty); // 조정은 부호 그대로(증감, 음수=0클램프)
        } elseif ($isIn) {
            self::adjustStock($t, $sku, $wh, $name, abs($qty));
        } elseif ($isOut) {
            self::adjustStock($t, $sku, $wh, $name, -abs($qty), true); // 실출고=strict(오버셀 거부)
        }
    }

    /**
     * [현 차수] 감사 P1: wms_stock 증감.
     * - 실출고(strictOut=true, Outbound/이고-출/폐기): 원자적 조건부 차감(WHERE on_hand>=need).
     *   재고 부족 시 무음 0클램프 대신 예외 → 오버셀 차단 + 동시성 lost update 차단(조건부 1쿼리).
     * - 입고/조정(strictOut=false): upsert(조정 음수는 0 클램프 — 수동 보정 허용).
     * 예외는 호출측(recordMovement) 트랜잭션에서 롤백 → 이력/재고 원자성 보장.
     * @throws \RuntimeException 'insufficient_stock:...' 출고 재고부족
     */
    private static function adjustStock(string $t, string $sku, string $wh, string $name, float $delta, bool $strictOut = false): void
    {
        if ($sku === '' || $delta == 0.0) return;
        $pdo = self::db(); $now = self::now();
        if ($delta < 0 && $strictOut) {
            $need = -$delta;
            $upd = $pdo->prepare("UPDATE wms_stock SET on_hand = on_hand + ?, name=COALESCE(NULLIF(name,''),?), updated_at=? WHERE tenant_id=? AND sku=? AND wh_id=? AND on_hand >= ?");
            $upd->execute([$delta, $name, $now, $t, $sku, $wh, $need]);
            if ($upd->rowCount() === 0) {
                throw new \RuntimeException("insufficient_stock:{$sku}@{$wh}"); // 행없음 또는 재고부족 → 출고 거부
            }
            // [현 차수 P3-2] FEFO 실소비 — 출고 시 유통기한 임박 lot 부터 실차감(기존엔 wms_lots 미소비=등록부에 머묾).
            //   lot 미추적 SKU 는 no-op(전 SKU 가 lot 추적 대상은 아님). 비throw(재고는 wms_stock 권위).
            self::consumeLotsFefo($pdo, $t, $sku, $wh, $need);
            return;
        }
        // 입고/조정: read-modify-write(조정 음수는 0 클램프). recordMovement 트랜잭션 내 호출로 일관성 확보.
        $sel = $pdo->prepare("SELECT id, on_hand FROM wms_stock WHERE tenant_id=? AND sku=? AND wh_id=? LIMIT 1");
        $sel->execute([$t, $sku, $wh]);
        $row = $sel->fetch(\PDO::FETCH_ASSOC);
        if ($row) {
            $newQty = max(0, (float)$row['on_hand'] + $delta);
            $pdo->prepare("UPDATE wms_stock SET on_hand=?, name=COALESCE(NULLIF(name,''),?), updated_at=? WHERE id=?")
                ->execute([$newQty, $name, $now, (int)$row['id']]);
        } else {
            $pdo->prepare("INSERT INTO wms_stock (tenant_id,sku,wh_id,name,on_hand,updated_at) VALUES (?,?,?,?,?,?)")
                ->execute([$t, $sku, $wh, $name, max(0, $delta), $now]);
        }
    }

    /**
     * [현 차수 P3-2] FEFO(First-Expiry-First-Out) lot 실소비 — 출고 수량을 유통기한 임박 lot 부터 차감.
     *   wh 일치 lot 우선, 만료일 ASC(NULL/빈 만료는 후순위) → id ASC. lot 합이 부족하면 가능분만 차감(재고는
     *   wms_stock 이 권위·이미 검증). lot 미추적 SKU(=lot 0개)는 no-op. 전과정 비throw(보조 등록부).
     */
    private static function consumeLotsFefo(\PDO $pdo, string $t, string $sku, string $wh, float $qty): void
    {
        if ($qty <= 0 || $sku === '') return;
        try {
            $sel = $pdo->prepare("SELECT id, qty FROM wms_lots WHERE tenant_id=:t AND sku=:s AND qty>0 AND (wh_id=:w OR wh_id IS NULL OR wh_id='')
                                  ORDER BY (expiry_date IS NULL OR expiry_date=''), expiry_date ASC, id ASC");
            $sel->execute([':t' => $t, ':s' => $sku, ':w' => $wh]);
            $lots = $sel->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            if (!$lots) return; // lot 미추적 SKU → no-op
            $need = $qty;
            $dec = $pdo->prepare("UPDATE wms_lots SET qty = qty - :take WHERE id = :id");
            foreach ($lots as $lot) {
                if ($need <= 0) break;
                $take = min((float)$lot['qty'], $need);
                if ($take <= 0) continue;
                $dec->execute([':take' => $take, ':id' => (int)$lot['id']]);
                $need -= $take;
            }
        } catch (\Throwable $e) { /* lot 소비 실패 = 정직 무시(wms_stock 권위) */ }
    }

    /** GET /wms/stock — 물리 창고 재고(입출고 파생). by_sku=1 이면 SKU별 합산. */
    public static function listStock(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $q = $req->getQueryParams();
        if (!empty($q['by_sku'])) {
            $st = self::db()->prepare("SELECT sku, MAX(name) name, SUM(on_hand) on_hand FROM wms_stock WHERE tenant_id=:t GROUP BY sku ORDER BY sku");
        } else {
            $st = self::db()->prepare("SELECT sku, wh_id, name, on_hand, updated_at FROM wms_stock WHERE tenant_id=:t ORDER BY sku, wh_id");
        }
        $st->execute([':t' => $t]);
        return self::json($res, ['ok' => true, 'stock' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
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
            $newStatus = (string)($b['status'] ?? 'pending');
            // [현 차수] 219 P2: 피킹 status→shipped 전이 시 물리 재고 차감(기존엔 이력만 갱신, 재고 미차감 결함).
            //   PartnerPortal shipped 경로와 동일 패턴. 멱등(PICK-{id} ref)·재고부족 시 422(출고 거부).
            $sel = $pdo->prepare("SELECT sku, name, qty, wh_id, status FROM wms_picking WHERE id=? AND tenant_id=? LIMIT 1");
            $sel->execute([$id, $t]);
            $old = $sel->fetch(\PDO::FETCH_ASSOC);
            if ($old && ($err = self::guardWarehouse($req, $res, (string)($old['wh_id'] ?? '')))) return $err; // 219 P2 창고 권한
            if ($old && (string)($old['status'] ?? '') !== 'shipped' && $newStatus === 'shipped') {
                $psku = (string)($old['sku'] ?? ''); $pqty = (float)($old['qty'] ?? 0); $pwh = (string)($old['wh_id'] ?? '');
                if ($psku !== '' && $pqty > 0 && $pwh !== '') {
                    $ref = 'PICK-' . $id;
                    $dup = $pdo->prepare("SELECT 1 FROM wms_movements WHERE tenant_id=? AND ref=? AND type='Outbound' LIMIT 1");
                    $dup->execute([$t, $ref]);
                    if (!$dup->fetchColumn()) {
                        try {
                            self::recordMovement($t, ['type'=>'Outbound','wh_id'=>$pwh,'sku'=>$psku,'name'=>(string)($old['name'] ?? ''),'qty'=>$pqty,'ref'=>$ref,'reason'=>'피킹출고']);
                        } catch (\RuntimeException $e) {
                            if (str_starts_with($e->getMessage(), 'insufficient_stock')) {
                                return self::json($res, ['ok' => false, 'error' => '재고 부족으로 출고할 수 없습니다.', 'code' => 'INSUFFICIENT_STOCK'], 422);
                            }
                            throw $e;
                        }
                    }
                }
            }
            $st = $pdo->prepare("UPDATE wms_picking SET status=:s,carrier=:c,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute([':s' => $newStatus, ':c' => (string)($b['carrier'] ?? ''), ':ua' => $now, ':id' => $id, ':t' => $t]);
            if ($st->rowCount() === 0 && !self::exists('wms_picking', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        if ($err = self::guardWarehouse($req, $res, (string)($b['whId'] ?? $b['wh_id'] ?? ''))) return $err; // 219 P2 창고 권한
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
            $newStatus = (string)($b['status'] ?? 'pending');
            // [현 차수] P1: 발주 status→received(입고확정) 전이 시 물리 재고 입고(Inbound).
            //   기존엔 status만 갱신하고 재고 미반영 결함 → 발주가 재고로 이어지지 않음.
            //   savePicking shipped 출고 패턴 미러. 멱등(SUPPLY-{id} ref)·창고 권한 가드.
            $sel = $pdo->prepare("SELECT sku, name, qty, wh_id, status FROM wms_supply_orders WHERE id=? AND tenant_id=? LIMIT 1");
            $sel->execute([$id, $t]);
            $old = $sel->fetch(\PDO::FETCH_ASSOC);
            if ($old && ($err = self::guardWarehouse($req, $res, (string)($old['wh_id'] ?? '')))) return $err;
            if ($old && (string)($old['status'] ?? '') !== 'received' && $newStatus === 'received') {
                $ssku = (string)($old['sku'] ?? ''); $sqty = (float)($old['qty'] ?? 0); $swh = (string)($old['wh_id'] ?? '');
                if ($ssku !== '' && $sqty > 0 && $swh !== '') {
                    $ref = 'SUPPLY-' . $id;
                    $dup = $pdo->prepare("SELECT 1 FROM wms_movements WHERE tenant_id=? AND ref=? AND type='Inbound' LIMIT 1");
                    $dup->execute([$t, $ref]);
                    if (!$dup->fetchColumn()) {
                        self::recordMovement($t, ['type' => 'Inbound', 'wh_id' => $swh, 'sku' => $ssku, 'name' => (string)($old['name'] ?? ''), 'qty' => $sqty, 'ref' => $ref, 'reason' => '발주입고']);
                    }
                }
            }
            $st = $pdo->prepare("UPDATE wms_supply_orders SET status=:s,eta=:eta,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute([':s' => $newStatus, ':eta' => (string)($b['eta'] ?? ''), ':ua' => $now, ':id' => $id, ':t' => $t]);
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
