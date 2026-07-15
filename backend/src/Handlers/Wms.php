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
        // [현 차수] 멀티창고 지리적 최적할당 — 창고 region(시/도)·좌표(lat/lng) 보강(멱등). 무해 실패 무시.
        //   SQLite 는 타입 무관(REAL affinity)·MySQL DOUBLE. region 미입력 시 area/location 에서 추정.
        foreach (['region VARCHAR(60)', 'country VARCHAR(60)', 'lat DOUBLE', 'lng DOUBLE'] as $col) {
            try { $pdo->exec("ALTER TABLE wms_warehouses ADD COLUMN {$col}"); } catch (\Throwable $e) {}
        }
        // [현 차수] FEFO 원가 기반 — wms_lots 에 cost(단위원가)·landed_cost(관세/운임 포함 도착원가) 보강(멱등).
        //   ★MySQL TEXT DEFAULT 거부 트랩 회피 — 숫자(DOUBLE) 컬럼만 DEFAULT 사용. 출고 시 소비된 lot 원가를
        //   wms_lot_consumptions 원장에 적재해 COGS 를 WAC 뿐 아니라 FEFO/lot-layer 로 소싱 가능(WAC 폴백 유지).
        foreach (['cost DOUBLE DEFAULT 0', 'landed_cost DOUBLE DEFAULT 0'] as $col) {
            try { $pdo->exec("ALTER TABLE wms_lots ADD COLUMN {$col}"); } catch (\Throwable $e) {}
        }
        self::ensurePhysicalTables($pdo, $mysql); // 바코드/빈/웨이브/lot 소비원장(멱등)
        self::ensureOutboundTables($pdo, $mysql); // [283차] 채널 재고 푸시 정책 · 초과판매 원장 · 피킹 송장(멱등)
    }

    /**
     * [283차 GAP-1] 커머스 outbound 루프 스키마(멱등 DDL).
     *
     *   ① wms_channel_stock_policy — 채널별 안전버퍼(초과판매 방지 유보재고) · 자동푸시 on/off.
     *      ★행이 없으면 buffer=0 · enabled=true 가 기본 → 기존 테넌트 전원 무회귀(종전과 동일한 전량 노출).
     *   ② wms_oversell_alert — 초과판매(재고<판매) 발생 원장. 종전엔 error_log 뿐이라 사후 추적·집계가 불가능했다.
     *      로깅을 '명시적 경고 상태'로 승격(요구 5) — 판매 반영 흐름 자체는 깨지 않는다(채널에서 이미 팔린 주문을
     *      우리가 되돌릴 수는 없다). 진짜 '차단'은 GAP-1 의 재고 델타 푸시(채널 가용재고를 실물에 맞춰 즉시 내림)와
     *      strict 출고(adjustStock: on_hand>=need 조건부 UPDATE → insufficient_stock 예외)가 담당한다.
     *   ③ wms_picking.tracking_no — 피킹 라인의 송장번호(발송처리 전송의 입력). 종전 컬럼 부재.
     *
     *   ★MySQL TEXT DEFAULT 거부 트랩 회피 — 문자열 기본값은 VARCHAR 만, 숫자는 DOUBLE/INT DEFAULT.
     */
    private static function ensureOutboundTables(\PDO $pdo, bool $mysql): void
    {
        if ($mysql) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_channel_stock_policy (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL, safety_buffer DOUBLE DEFAULT 0, enabled TINYINT(1) DEFAULT 1,
                updated_at VARCHAR(32),
                UNIQUE KEY uq_wcsp (tenant_id, channel), KEY idx_wcsp_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_oversell_alert (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100), sku VARCHAR(120) NOT NULL, name VARCHAR(255), ref VARCHAR(190),
                want DOUBLE DEFAULT 0, available DOUBLE DEFAULT 0, shortage DOUBLE DEFAULT 0,
                severity VARCHAR(20) DEFAULT 'partial', status VARCHAR(20) DEFAULT 'open',
                created_at VARCHAR(32),
                UNIQUE KEY uq_woa (tenant_id, ref, sku),
                KEY idx_woa_tenant (tenant_id), KEY idx_woa_sku (tenant_id, sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_channel_stock_policy (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', channel TEXT NOT NULL, safety_buffer REAL DEFAULT 0, enabled INTEGER DEFAULT 1, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_oversell_alert (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', channel TEXT, sku TEXT NOT NULL, name TEXT, ref TEXT, want REAL DEFAULT 0, available REAL DEFAULT 0, shortage REAL DEFAULT 0, severity TEXT DEFAULT 'partial', status TEXT DEFAULT 'open', created_at TEXT)");
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_wcsp ON wms_channel_stock_policy(tenant_id, channel)"); } catch (\Throwable $e) {}
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_woa ON wms_oversell_alert(tenant_id, ref, sku)"); } catch (\Throwable $e) {}
        }
        // 피킹 라인 송장번호 — 기 배포된 wms_picking 은 CREATE 를 건너뛰므로 ALTER 로 보강(멱등).
        try { $pdo->exec($mysql ? "ALTER TABLE wms_picking ADD COLUMN tracking_no VARCHAR(120)" : "ALTER TABLE wms_picking ADD COLUMN tracking_no TEXT"); } catch (\Throwable $e) {}
    }

    /**
     * [현 차수] 물리 실행 계층 테이블(멱등 DDL) — 바코드/시리얼 registry, 빈 로케이션·빈별 재고,
     *   웨이브/존 피킹, FEFO lot 소비원가 원장. wms_stock(창고단위 권위)·wms_lots(FEFO)·wms_picking 를
     *   교체하지 않고 확장한다(하위 원장·상위 배치). ★MySQL TEXT DEFAULT 금지 — 문자열 기본값은 VARCHAR 만.
     */
    private static function ensurePhysicalTables(\PDO $pdo, bool $mysql): void
    {
        if ($mysql) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_bins (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                wh_id VARCHAR(60) NOT NULL DEFAULT '', code VARCHAR(80) NOT NULL, zone VARCHAR(60),
                aisle VARCHAR(40), rack VARCHAR(40), level VARCHAR(40), slot VARCHAR(40), seq INT DEFAULT 0,
                barcode VARCHAR(120), capacity DOUBLE DEFAULT 0, active TINYINT(1) DEFAULT 1,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_wms_bin (tenant_id, wh_id, code), KEY idx_wms_bin_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_bin_stock (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                wh_id VARCHAR(60) NOT NULL DEFAULT '', bin_id INT NOT NULL DEFAULT 0, sku VARCHAR(120) NOT NULL,
                name VARCHAR(255), on_hand DOUBLE DEFAULT 0, updated_at VARCHAR(32),
                UNIQUE KEY uq_wms_bin_stock (tenant_id, wh_id, bin_id, sku), KEY idx_wms_bstk_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_barcodes (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                code VARCHAR(160) NOT NULL, sku VARCHAR(120) NOT NULL, name VARCHAR(255),
                kind VARCHAR(20) DEFAULT 'barcode', status VARCHAR(20) DEFAULT 'active', bin_id INT DEFAULT 0,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_wms_barcode (tenant_id, code), KEY idx_wms_bc_tenant (tenant_id), KEY idx_wms_bc_sku (tenant_id, sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_waves (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                code VARCHAR(80), wh_id VARCHAR(60), zone VARCHAR(60), status VARCHAR(30) DEFAULT 'created',
                order_count INT DEFAULT 0, item_count INT DEFAULT 0, note VARCHAR(255),
                created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_wms_wave_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_wave_items (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                wave_id INT NOT NULL DEFAULT 0, order_ref VARCHAR(120), sku VARCHAR(120), name VARCHAR(255),
                qty DOUBLE DEFAULT 0, picked_qty DOUBLE DEFAULT 0, wh_id VARCHAR(60), bin_id INT DEFAULT 0,
                bin_code VARCHAR(80), zone VARCHAR(60), seq INT DEFAULT 0, status VARCHAR(30) DEFAULT 'pending',
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_wms_wi_tenant (tenant_id), KEY idx_wms_wi_wave (tenant_id, wave_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_lot_consumptions (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                ref VARCHAR(120), sku VARCHAR(120), wh_id VARCHAR(60), lot_id INT DEFAULT 0, lot_no VARCHAR(120),
                qty DOUBLE DEFAULT 0, unit_cost DOUBLE DEFAULT 0, cost_total DOUBLE DEFAULT 0, created_at VARCHAR(32),
                KEY idx_wms_lc_tenant (tenant_id), KEY idx_wms_lc_ref (tenant_id, ref), KEY idx_wms_lc_sku (tenant_id, sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_bins (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', wh_id TEXT NOT NULL DEFAULT '', code TEXT NOT NULL, zone TEXT, aisle TEXT, rack TEXT, level TEXT, slot TEXT, seq INTEGER DEFAULT 0, barcode TEXT, capacity REAL DEFAULT 0, active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_bin_stock (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', wh_id TEXT NOT NULL DEFAULT '', bin_id INTEGER NOT NULL DEFAULT 0, sku TEXT NOT NULL, name TEXT, on_hand REAL DEFAULT 0, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_barcodes (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', code TEXT NOT NULL, sku TEXT NOT NULL, name TEXT, kind TEXT DEFAULT 'barcode', status TEXT DEFAULT 'active', bin_id INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_waves (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', code TEXT, wh_id TEXT, zone TEXT, status TEXT DEFAULT 'created', order_count INTEGER DEFAULT 0, item_count INTEGER DEFAULT 0, note TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_wave_items (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', wave_id INTEGER NOT NULL DEFAULT 0, order_ref TEXT, sku TEXT, name TEXT, qty REAL DEFAULT 0, picked_qty REAL DEFAULT 0, wh_id TEXT, bin_id INTEGER DEFAULT 0, bin_code TEXT, zone TEXT, seq INTEGER DEFAULT 0, status TEXT DEFAULT 'pending', created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS wms_lot_consumptions (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', ref TEXT, sku TEXT, wh_id TEXT, lot_id INTEGER DEFAULT 0, lot_no TEXT, qty REAL DEFAULT 0, unit_cost REAL DEFAULT 0, cost_total REAL DEFAULT 0, created_at TEXT)");
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_bin ON wms_bins(tenant_id, wh_id, code)"); } catch (\Throwable $e) {}
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_bin_stock ON wms_bin_stock(tenant_id, wh_id, bin_id, sku)"); } catch (\Throwable $e) {}
            try { $pdo->exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_wms_barcode ON wms_barcodes(tenant_id, code)"); } catch (\Throwable $e) {}
        }

        // [현 차수] 로케이션 4단계 명시화 — 창고/랙/단/'번(slot)'. 기 배포된 wms_bins 는 CREATE 가 건너뛰므로
        //   ALTER 로 보강해야 한다(멱등: 이미 있으면 예외 무시). ★MySQL TEXT DEFAULT 거부 트랩 회피 → VARCHAR·무DEFAULT.
        //   기존 행의 slot 은 NULL 로 남고, saveBin 이 빈 코드(A-01-01-1)의 마지막 마디에서 백필한다.
        try { $pdo->exec($mysql ? "ALTER TABLE wms_bins ADD COLUMN slot VARCHAR(40)" : "ALTER TABLE wms_bins ADD COLUMN slot TEXT"); } catch (\Throwable $e) {}
    }

    /* ════════════════ 창고(Warehouses) ════════════════ */

    public static function listWarehouses(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        self::consolidateOrphanStock($t); // [286차] 'default'/'' 고아 재고를 실 창고로 병합(창고별 재고 표시 정합)
        $st = self::db()->prepare("SELECT * FROM wms_warehouses WHERE tenant_id=:t ORDER BY id DESC");
        $st->execute([':t' => $t]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        // [286차] ★창고별 재고합(SUM on_hand) 첨부 — 종전엔 미첨부라 프론트가 ctxInventory 로 재구성하다
        //   'default' 버킷 재고를 창고 카드에서 0 으로 오표시했다. 서버가 창고 단위 SSOT 합을 직접 준다.
        $stockMap = [];
        try {
            $ss = self::db()->prepare("SELECT wh_id, SUM(on_hand) AS s FROM wms_stock WHERE tenant_id=? GROUP BY wh_id");
            $ss->execute([$t]);
            foreach ($ss->fetchAll(\PDO::FETCH_ASSOC) as $r) { $stockMap[(string)$r['wh_id']] = (float)$r['s']; }
        } catch (\Throwable $e) { /* 표시 보조값 — 실패 시 0 */ }
        foreach ($rows as &$r) {
            $r['active'] = (bool)(int)($r['active'] ?? 1);
            $r['stock']  = $stockMap[(string)$r['id']] ?? 0; // 창고별 실재고 합
        }
        return self::json($res, ['ok' => true, 'warehouses' => $rows]);
    }

    public static function saveWarehouse(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now();
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '창고명을 입력하세요.'], 422);
        $pdo = self::db();
        // [현 차수] 멀티창고 최적할당 — region(시/도) 미입력 시 area/location/name 에서 자동추정. 좌표는 숫자만 채택.
        $region = trim((string)($b['region'] ?? ''));
        if ($region === '') $region = self::regionOf(((string)($b['area'] ?? '')) . ' ' . ((string)($b['location'] ?? '')) . ' ' . $name);
        $f = [
            ':name' => $name, ':code' => (string)($b['code'] ?? ''), ':location' => (string)($b['location'] ?? ''),
            ':area' => (string)($b['area'] ?? ''), ':temp' => (string)($b['temp'] ?? 'Room Temp'),
            ':manager' => (string)($b['manager'] ?? ''), ':phone' => (string)($b['phone'] ?? ''),
            ':type' => (string)($b['type'] ?? 'Direct'), ':active' => !empty($b['active']) ? 1 : 0,
            ':region' => $region, ':country' => (string)($b['country'] ?? ''),
            ':lat' => is_numeric($b['lat'] ?? null) ? (float)$b['lat'] : null,
            ':lng' => is_numeric($b['lng'] ?? null) ? (float)$b['lng'] : null,
        ];
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $f[':id'] = $id; $f[':t'] = $t; $f[':ua'] = $now;
            $st = $pdo->prepare("UPDATE wms_warehouses SET name=:name,code=:code,location=:location,area=:area,temp=:temp,manager=:manager,phone=:phone,type=:type,active=:active,region=:region,country=:country,lat=:lat,lng=:lng,updated_at=:ua WHERE id=:id AND tenant_id=:t");
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
        $st = $pdo->prepare("INSERT INTO wms_warehouses (tenant_id,name,code,location,area,temp,manager,phone,type,active,region,country,lat,lng,created_at,updated_at) VALUES (:t,:name,:code,:location,:area,:temp,:manager,:phone,:type,:active,:region,:country,:lat,:lng,:ca,:ua)");
        $st->execute($f);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteWarehouse(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)$args['id'];
        $pdo = self::db();
        // [286차] ★재고 보유 창고 삭제 차단 — 하드삭제 시 wms_stock 이 존재하지 않는 wh_id 를 가리켜 재고가 유령화(창고별
        //   분포·총재고 SSOT 파괴)된다. 재고가 남아 있으면 삭제 거부하고, 이동/소진 또는 '비활성화'를 안내한다.
        $onHand = null;
        try {
            $sc = $pdo->prepare("SELECT COALESCE(SUM(on_hand),0) FROM wms_stock WHERE tenant_id=? AND wh_id=?");
            $sc->execute([$t, (string)$id]);
            $onHand = (float)$sc->fetchColumn();
        } catch (\Throwable $e) { $onHand = null; }
        if ($onHand === null) {
            return self::json($res, ['ok' => false, 'error' => '재고 확인에 실패했습니다. 잠시 후 다시 시도하세요.'], 500);
        }
        if ($onHand > 0) {
            return self::json($res, ['ok' => false,
                'error' => "재고가 남아 있어 창고를 삭제할 수 없습니다(현 재고 " . rtrim(rtrim(number_format($onHand, 2), '0'), '.') . "). 재고를 다른 창고로 이동하거나 소진한 뒤 삭제하세요. (임시 중단은 '비활성화'를 사용하세요.)",
                'on_hand' => $onHand], 409);
        }
        $del = $pdo->prepare("DELETE FROM wms_warehouses WHERE id=:id AND tenant_id=:t");
        $del->execute([':id' => $id, ':t' => $t]);
        if ($del->rowCount() > 0) {
            // 재고 0인 잔여 stock 행(0재고 SKU)도 함께 정리(무해·고아 방지).
            try { $pdo->prepare("DELETE FROM wms_stock WHERE tenant_id=? AND wh_id=? AND on_hand<=0")->execute([$t, (string)$id]); } catch (\Throwable $e) {}
        }
        return self::json($res, ['ok' => (bool)$del->rowCount(), 'deleted' => $del->rowCount()]);
    }

    /** POST /wms/allocate — {sku, qty, address} 최적 출고 창고 미리보기(재고 보유 + 배송지 근접). Pro+.
     *   채널 판매 자동 차감이 실제로 선택하는 창고를 사전 확인·시뮬레이션(분할출고 회피·후보 점수 투명 노출). */
    public static function allocate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $sku = trim((string)($b['sku'] ?? ''));
        $qty = max(1.0, (float)($b['qty'] ?? 1));
        // 배송지: 주소/지역 텍스트 + 국가(글로벌 지오코딩) · 명시 좌표(전세계 정밀, 선택).
        $ship = trim(((string)($b['address'] ?? $b['ship_address'] ?? $b['region'] ?? '')) . ' ' . (string)($b['country'] ?? ''));
        $slat = is_numeric($b['lat'] ?? $b['ship_lat'] ?? null) ? (float)($b['lat'] ?? $b['ship_lat']) : null;
        $slng = is_numeric($b['lng'] ?? $b['ship_lng'] ?? null) ? (float)($b['lng'] ?? $b['ship_lng']) : null;
        if ($sku === '') return self::json($res, ['ok' => false, 'error' => 'sku가 필요합니다.'], 422);
        return self::json($res, array_merge(['ok' => true], self::allocationPlan($t, $sku, $qty, $ship, $slat, $slng)));
    }

    /* ════════════════ 택배사(Carriers) ════════════════ */

    public static function listCarriers(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
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
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
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
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_carriers WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 매입처(Suppliers) — 212차 #3 ════════════════ */
    public static function listSuppliers(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_suppliers WHERE tenant_id=:t ORDER BY id DESC");
        $st->execute([':t' => self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['active'] = (bool)(int)($r['active'] ?? 1); }
        return self::json($res, ['ok' => true, 'suppliers' => $rows]);
    }

    public static function saveSupplier(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
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
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_suppliers WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 창고 권한(Permissions) ════════════════ */

    public static function listPermissions(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_permissions WHERE tenant_id=:t ORDER BY id DESC");
        $st->execute([':t' => self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) { $r['warehouses'] = json_decode($r['warehouses'] ?? '[]', true) ?: []; }
        return self::json($res, ['ok' => true, 'permissions' => $rows]);
    }

    public static function savePermission(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
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
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_permissions WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ 입출고 이력(Movements) ════════════════ */

    public static function listMovements(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $limit = max(1, min(1000, (int)($req->getQueryParams()['limit'] ?? 300)));
        $st = self::db()->prepare("SELECT * FROM wms_movements WHERE tenant_id=:t ORDER BY id DESC LIMIT {$limit}");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'movements' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /**
     * [현 차수] 창고 접근 강제 — FAIL-CLOSED 재설계(종전 219 P2 가드는 :420 catch 가 모든 예외를 null=허용으로
     *   흡수 + 세션 미해결을 허용해, 권한표가 있어도 가드를 우회할 수 있었다. 이제 권한표가 존재하면 명시적
     *   화이트리스트 통과만 허용하고, 모호/미해결/평가오류는 거부한다).
     *
     *   판정 로직(위→아래, 먼저 참인 규칙 적용):
     *   ① 팀 owner → 항상 허용(권한표 유무·평가오류 무관 최우선 bypass — 관리자 lockout 원천 차단).
     *      team_role 미상(솔로 계정 등)은 owner 로 간주(단일 사용자 정상 소유주).
     *   ② 테넌트에 wms_permissions 행 0개 → 허용(WMS RBAC 미설정 테넌트 = 명시적 opt-out, 기존 동작 보존).
     *   ③ 권한표 존재 + 세션 미해결(authedUser=null) → **거부**(fail-closed). 권한표를 만든 테넌트는 강제
     *      의도가 명확하므로 미해결 주체를 통과시키지 않는다(종전 fail-open 제거). api_key 경로는 index.php
     *      RBAC 로 이미 통제되고, WMS 세션 self-auth 는 여기서 화이트리스트가 필수.
     *   ④ WMS role='admin' → 전 창고 허용.  ⑤ 창고 미지정(whId='') 액션 → 통과(tenant 격리 read).
     *   ⑥ warehouses JSON 에 대상 창고 포함 → 허용. 미포함/권한행 없음/이메일 미상 → 거부.
     *   ⑦ 가드 평가 중 예외 → **거부**(fail-closed). owner 는 위 ①에서 이미 통과했으므로 정상 관리자 영향 없음.
     * @return ?Response 거부 시 403, 허용 시 null.
     */
    private static function guardWarehouse(Request $req, Response $res, string $whId): ?Response
    {
        $forbid = fn(string $msg, string $code) => self::json($res, ['ok'=>false, 'error'=>$msg, 'code'=>$code], 403);
        try {
            $t = self::tenant($req);
            $pdo = self::db();
            // ① 팀 owner = 전 창고(최우선 bypass — 평가오류/권한표 무관하게 lockout 방지).
            $u = UserAuth::authedUser($req);
            if ($u && (string)($u['team_role'] ?? 'owner') === 'owner') return null;
            // ② 권한 미설정 테넌트 → WMS RBAC opt-out(강제 안 함).
            $cnt = $pdo->prepare("SELECT COUNT(*) FROM wms_permissions WHERE tenant_id=?");
            $cnt->execute([$t]);
            if ((int)$cnt->fetchColumn() === 0) return null;
            // 여기부터: 권한표 존재 → 반드시 화이트리스트 통과(fail-closed).
            // ③ 세션 미해결 + 권한표 존재 → 거부(모호 우회 차단).
            if (!$u) return $forbid('WMS 접근 주체가 확인되지 않았습니다 — 세션 인증이 필요합니다.', 'WMS_UNRESOLVED');
            $email = strtolower(trim((string)($u['email'] ?? '')));
            if ($email === '') return $forbid('WMS 접근 계정(이메일)이 확인되지 않았습니다.', 'WMS_UNRESOLVED');
            $pr = $pdo->prepare("SELECT role, warehouses FROM wms_permissions WHERE tenant_id=? AND LOWER(user_email)=? LIMIT 1");
            $pr->execute([$t, $email]);
            $row = $pr->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return $forbid('WMS 접근 권한이 없습니다.', 'WMS_FORBIDDEN');
            if ((string)($row['role'] ?? '') === 'admin') return null;  // ④ WMS admin = 전 창고
            if ($whId === '') return null;                              // ⑤ 창고 미지정 액션은 통과(read=tenant 격리)
            $whs = json_decode((string)($row['warehouses'] ?? '[]'), true);
            if (!is_array($whs)) $whs = [];
            if (in_array($whId, $whs, true)) return null;               // ⑥ 화이트리스트 통과
            return $forbid('해당 창고 접근 권한이 없습니다.', 'WMS_WAREHOUSE_FORBIDDEN');
        } catch (\Throwable $e) {
            // ⑦ 평가오류 → FAIL-CLOSED(거부). owner 는 위 ①에서 이미 통과.
            error_log('[Wms.guardWarehouse] ' . $e->getMessage());
            return $forbid('WMS 권한 확인에 실패하여 접근이 거부되었습니다.', 'WMS_GUARD_ERROR');
        }
    }

    public static function createMovement(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $whId = (string)($b['whId'] ?? $b['wh_id'] ?? '');
        if ($err = self::guardWarehouse($req, $res, $whId)) return $err;   // [현 차수] 219 P2 창고 권한 강제
        // [281차 P2] ★창고이동은 도착창고도 검사해야 한다 — applyMovementToStock 이 dest_wh_id 로 재고를 가산하므로,
        //   출발창고만 검사하면 창고 A 만 허용된 사용자가 destWhId=B 로 B 의 on_hand/lot 을 조작할 수 있었다(ABAC 우회).
        $destWhId = (string)($b['destWhId'] ?? $b['dest_wh_id'] ?? '');
        if ($destWhId !== '' && $destWhId !== $whId) {
            if ($err = self::guardWarehouse($req, $res, $destWhId)) return $err;
        }
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
     * [286차] POST /wms/set-stock — 재고를 절대 목표값으로 설정(카탈로그 목록의 재고 직접 수정 경로).
     *   ★on_hand 는 입출고 원장(wms_movements)의 running balance 다. 정적 덮어쓰기 금지 원칙(reflectStockToWms 주석)에 따라
     *   현재 on_hand 와 목표의 **델타를 StockAdj 원장으로 기록**해 반영한다 → wms_stock.on_hand == 목표 == 원장 합계(정합 유지·이력 남음).
     *   신규 SKU(재고 0)면 delta=목표 → StockAdj 입고로 초기재고가 원장에 남는다. 채널 동기화 상품의 초기재고 설정에 사용.
     */
    public static function setSkuStock(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $sku = trim((string)($b['sku'] ?? ''));
        if ($sku === '') return self::json($res, ['ok' => false, 'error' => 'sku required'], 400);
        $target = max(0.0, (float)($b['qty'] ?? 0));
        $wh = self::resolvePrimaryWarehouse($t);
        if ($err = self::guardWarehouse($req, $res, $wh)) return $err;
        $pdo = self::db();
        $cur = 0.0;
        try {
            $st = $pdo->prepare("SELECT COALESCE(SUM(on_hand),0) FROM wms_stock WHERE tenant_id=? AND sku=? AND wh_id=?");
            $st->execute([$t, $sku, $wh]);
            $cur = (float)$st->fetchColumn();
        } catch (\Throwable $e) { /* 신규 sku — cur=0 */ }
        $delta = round($target - $cur, 4);
        if (abs($delta) > 0.00001) {
            self::recordMovement($t, [
                'type' => 'StockAdj', 'wh_id' => $wh, 'sku' => $sku,
                'name' => (string)($b['name'] ?? ''), 'qty' => $delta,
                'reason' => (string)($b['reason'] ?? '카탈로그 재고 직접 수정'),
            ]);
        }
        return self::json($res, ['ok' => true, 'sku' => $sku, 'wh_id' => $wh, 'on_hand' => $target, 'delta' => $delta]);
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
            self::applyMovementToStock($t, $type, $wh, $dwh, $sku, $name, $qty, $ref); // ref → FEFO lot 소비원가 원장 키
            if ($ownTxn) $pdo->commit();
        } catch (\Throwable $e) {
            if ($ownTxn && $pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
        // ── [283차 GAP-1] 재고 델타 → 채널 가용재고 자동 푸시(outbound 루프 폐쇄) ──────────────────
        //   ★근본결함: 종전 wms_stock 은 pull-at-push 였다 — Catalog::writeback 이 **사용자가 버튼을 누를 때만**
        //     on_hand 를 읽어갔다(Catalog.php:500-507). 입고·재고조정·오프라인 판매·피킹출고로 실물이 변해도
        //     채널 가용재고는 영영 그대로 → 초과판매. catalog_writeback_job 생산자 5곳이 전부 사용자 액션이었고
        //     bin/ 어디에도 wms_stock 을 읽는 러너가 없었다(부재증명).
        //   ★이제 재고가 변하는 **단일 chokepoint**(recordMovement — 입고/출고/조정/이동/취소복원/스캔/피킹/발주입고/
        //     채널판매/파트너/라이브커머스가 전부 여기를 지난다)에서 델타를 채널 writeback 큐에 자동 적재한다.
        //   ★트랜잭션 **커밋 후** 실행 — 큐 적재 실패가 재고 원장을 롤백시키지 않는다(무회귀·비throw).
        try { self::enqueueChannelStockSync($t, $sku, 'movement:' . $type); } catch (\Throwable $e) { error_log('[Wms.recordMovement.enqueue] ' . $e->getMessage()); }
        return $id;
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
            // [현 차수 감사 P1] ★멀티창고 정합 — 복원 창고는 primaryWarehouse 가 아니라 **원 판매출고의 wh_id**.
            //   reflectChannelSale 이 최적할당으로 창고 B에서 차감했는데 복원을 창고 A(primary)로 하면 노드별 재고가
            //   영구 왜곡(B 영구부족·A 유령재고)되던 비대칭 해소. 판매출고 행에 wh_id 이미 보존되어 그대로 사용.
            $saleChk = $pdo->prepare("SELECT qty, wh_id FROM wms_movements WHERE tenant_id=? AND ref=? AND type=? LIMIT 1");
            $saleChk->execute([$tenant, $saleRef, 'Outbound']);
            $saleRow = $saleChk->fetch(\PDO::FETCH_ASSOC);
            if ($saleRow === false) return false; // 판매 차감 이력 없음 → 복원 대상 아님
            $restoreQty = min((float)$qty, (float)($saleRow['qty'] ?? 0)); // 차감분 초과 복원 방지
            if ($restoreQty <= 0) return false;
            $wh = (string)($saleRow['wh_id'] ?? '');
            if ($wh === '') $wh = self::primaryWarehouse($tenant); // 구 이력(wh_id 빈값) 폴백
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
     *   ② 물리 추적 SKU 한정 — 해당 SKU 의 wms_stock 행이 최적할당 선택창고에 있을 때만 차감(미추적 SKU/무-WMS
     *      테넌트는 spurious 0행 생성 없이 skip → 수동 WMS 워크플로우/미사용 테넌트 무영향).
     *   ③ non-throw — 가용분(min(qty,on_hand))만 차감해 strict 출고 예외 회피.
     *   best-effort: 예외는 호출측(채널 동기화) 흐름을 깨지 않도록 흡수.
     *
     * [283차 GAP-1 요구5] ★초과판매를 '로깅'에서 '명시적 경고 상태'로 승격.
     *   종전엔 error_log 두 줄이 전부였다(:661,:669) — 아무도 읽지 않는 로그였고, 초과판매가 몇 건인지·어느
     *   채널에서 났는지 집계할 방법이 없었다. 이제 wms_oversell_alert 원장에 적재 + 감사로그 + **즉시 채널
     *   재고 재푸시**(가용재고를 실물에 맞춰 내려 추가 초과판매를 끊는다 = 실질적 차단)를 수행한다.
     *   ★판매 반영 자체는 차단하지 않는다 — 채널에서 이미 체결된 주문을 우리가 되돌릴 수 없고, 여기서
     *     throw 하면 CRM 구매기록·귀속·정산 롤업(saveOrders 후속 단계)이 통째로 깨진다(무회귀 원칙).
     *     사전 차단은 GAP-1 의 델타 푸시와 strict 출고(adjustStock 조건부 UPDATE)가 담당한다.
     *
     * @param string $channel 판매 채널(초과판매 귀속용). 기본 '' — 기존 호출부 무영향.
     * @return bool 신규 차감 시 true.
     */
    public static function reflectChannelSale(string $tenant, string $sku, string $name, float $qty, string $ref, string $shipText = '', string $channel = ''): bool
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
            // [현 차수] 멀티창고 최적할당 — 기본창고 단일 출고 대신 SKU 재고 보유 + 배송지($shipText) 근접 창고 선택.
            //   재고 보유 창고가 없으면 primaryWarehouse 폴백(아래 ② 체크에서 미추적 skip 동작 보존).
            $wh = self::selectWarehouseForSale($tenant, $sku, $qty, $shipText);
            // ② 물리 추적 SKU 한정: 선택 창고에 재고 행이 있을 때만 차감(없으면 미추적 → skip).
            $sel = $pdo->prepare("SELECT on_hand FROM wms_stock WHERE tenant_id=? AND sku=? AND wh_id=? LIMIT 1");
            $sel->execute([$tenant, $sku, $wh]);
            $row = $sel->fetch(\PDO::FETCH_ASSOC);
            if ($row === false) return false; // 미추적 SKU → 물리 차감 대상 아님(채널재고만 차감 유지)
            // ③ non-throw: 가용분만 차감(strict 출고 예외 회피). 오버셀은 원장 적재 + 채널 재고 재푸시.
            $onHand = (float)$row['on_hand'];
            $deduct = min($qty, $onHand);
            if ($deduct <= 0) {
                // 재고 0인데 채널에서 팔렸다 = 확정 초과판매(critical). 이력 미생성(차감할 재고 없음).
                self::recordOversell($tenant, $channel, $sku, $name, $ref, $qty, 0.0, 'critical');
                // recordMovement 를 타지 않으므로 델타 훅이 안 걸린다 → 여기서 직접 채널 가용재고를 0 으로 내린다.
                self::enqueueChannelStockSync($tenant, $sku, 'oversell_zero_stock');
                return false;
            }
            self::recordMovement($tenant, [
                'type' => 'Outbound', 'wh_id' => $wh, 'sku' => $sku, 'name' => $name,
                'qty' => $deduct, 'ref' => $ref, 'reason' => 'channel_sync_sale',
            ]); // ← recordMovement 가 커밋 후 enqueueChannelStockSync 로 잔여재고를 전 채널에 푸시
            if ($deduct < $qty) {
                // 부분 차감 = 재고보다 많이 팔렸다(부분 초과판매). 판매는 반영하되 경고를 원장에 남긴다.
                self::recordOversell($tenant, $channel, $sku, $name, $ref, $qty, $onHand, 'partial');
            }
            return true;
        } catch (\Throwable $e) {
            error_log('[Wms.reflectChannelSale] ' . $e->getMessage());
            return false;
        }
    }

    /**
     * [283차 GAP-1] 초과판매 경고 원장 적재(멱등: UNIQUE(tenant,ref,sku)) + 감사로그.
     *   severity: 'critical'(재고 0에서 판매) | 'partial'(재고보다 많이 판매).
     *   ★비throw — 경고 기록 실패가 판매 반영을 깨서는 안 된다.
     */
    private static function recordOversell(string $tenant, string $channel, string $sku, string $name, string $ref, float $want, float $avail, string $severity): void
    {
        $shortage = max(0.0, $want - $avail);
        error_log("[Wms.oversell] severity={$severity} tenant={$tenant} channel={$channel} sku={$sku} ref={$ref} want={$want} avail={$avail}");
        try {
            $pdo = self::db();
            $pdo->prepare("INSERT INTO wms_oversell_alert (tenant_id,channel,sku,name,ref,want,available,shortage,severity,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,'open',?)")
                ->execute([$tenant, $channel, $sku, $name, $ref, $want, $avail, $shortage, $severity, self::now()]);
        } catch (\Throwable $e) { /* UNIQUE 중복 = 이미 기록됨(멱등) */ }
        try {
            Db::audit(self::db(), $tenant, 'wms.oversell', [
                'channel' => $channel, 'sku' => $sku, 'ref' => $ref,
                'want' => $want, 'available' => $avail, 'shortage' => $shortage, 'severity' => $severity,
            ]);
        } catch (\Throwable $e) {}
    }

    /** 테넌트 기본(우선) 창고 wh_id. 활성 창고 중 최소 id, 없으면 'default'. */
    /**
     * [277차] 재고를 적재할 대상 창고 id — 외부(PriceOpt 상품등록)에서 재사용.
     *   종전 PriceOpt::reflectStockToWms 는 wh_id='' 로 적재했는데, 출고 할당(allocationPlan)은 활성 창고
     *   재고만 후보로 삼고(:825) 폴백도 primaryWarehouse 이므로 '' 행은 **영원히 선택되지 않아 판매 차감이
     *   일어나지 않았다**(유령 재고 → 자동발주 미실행·리프라이서 오판). 동일 해석기를 공유해 정합을 강제한다.
     */
    public static function resolvePrimaryWarehouse(string $tenant): string
    {
        return self::primaryWarehouse($tenant);
    }

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

    /**
     * [286차] ★고아 재고 병합 self-heal — wh_id IN ('', 'default', NULL) 로 적재된 재고를 실 창고(primary)로
     *   승격/합산한다. 근본원인: 상품/채널 등록 경로(PriceOpt::reflectStockToWms)가 활성창고 부재 시점에
     *   primaryWarehouse 폴백 'default' 로 적재 → 수동입고(선택 창고 id)와 창고 키가 갈려 (1)창고목록 재고 0
     *   (2)창고별 분포 은닉 (3)출고할당 누락(유령재고). 실 창고가 하나라도 있으면 'default'/'' 잔여를 그 창고로
     *   병합해 SSOT 를 창고 단위로 일원화한다. 멱등(고아 0개면 no-op)·비throw(조회 실패 시 표시만 영향).
     *   @return int 병합 처리한 고아 행 수.
     */
    private static function consolidateOrphanStock(string $tenant): int
    {
        $primary = self::primaryWarehouse($tenant);
        if ($primary === 'default' || $primary === '') return 0; // 실 창고 부재 → 병합 대상(목적지)이 없음(보류)
        try {
            $pdo = self::db(); $now = self::now();
            $sel = $pdo->prepare("SELECT id, sku, name, on_hand FROM wms_stock WHERE tenant_id=? AND (wh_id IS NULL OR wh_id='' OR wh_id='default')");
            $sel->execute([$tenant]);
            $orphans = $sel->fetchAll(\PDO::FETCH_ASSOC);
            if (!$orphans) return 0;
            $moved = 0;
            foreach ($orphans as $o) {
                $sku = (string)$o['sku']; if ($sku === '') continue;
                $qty = (float)$o['on_hand']; $nm = (string)$o['name'];
                // primary 창고에 동일 sku 행이 있으면 합산 후 고아 삭제, 없으면 고아를 primary 로 승격(UNIQUE(tenant,sku,wh) 보존).
                $pw = $pdo->prepare("SELECT id FROM wms_stock WHERE tenant_id=? AND sku=? AND wh_id=? LIMIT 1");
                $pw->execute([$tenant, $sku, $primary]);
                $pid = $pw->fetchColumn();
                if ($pid !== false && $pid !== null) {
                    $pdo->prepare("UPDATE wms_stock SET on_hand=on_hand+?, name=COALESCE(NULLIF(name,''),?), updated_at=? WHERE id=?")
                        ->execute([$qty, $nm, $now, (int)$pid]);
                    $pdo->prepare("DELETE FROM wms_stock WHERE id=?")->execute([(int)$o['id']]);
                } else {
                    $pdo->prepare("UPDATE wms_stock SET wh_id=?, updated_at=? WHERE id=?")
                        ->execute([$primary, $now, (int)$o['id']]);
                }
                $moved++;
            }
            return $moved;
        } catch (\Throwable $e) { return 0; }
    }

    /* ════════════════ [현 차수] 멀티창고 글로벌 지리적 최적할당 ════════════════
     *   기존: primaryWarehouse(최소 id 단일창고)에서만 출고 → 타 창고에 재고가 있어도 미추적 처리(분할/지역 무시).
     *   개선: 주문 SKU 재고 보유 + 배송지 근접 창고로 최적 배분. 외부 의존(3PL/배송사 API) 없이 내부 재고·지리만으로 동작.
     *   ★국내 한정이 아닌 글로벌: 한국 시/도(국내 세분) + 글로벌 국가/주요도시 centroid + 명시 좌표(lat/lng, 전세계 정밀)로
     *     배송지·창고 위치를 해석해 전세계 멀티노드 풀필먼트(예: 미국 캘리포니아 주문→미국 서부 창고)를 지원한다.
     *   점수: ① 전량 커버(on_hand>=qty) 우선 ② 배송지 근접(전세계 haversine·명시 좌표 우선) ③ 동점=재고 多. */

    /** 한국 시/도 centroid(위도,경도) — region 근접도 산출 기준. */
    private const KR_REGION_CENTROIDS = [
        '서울'=>[37.5665,126.9780],'인천'=>[37.4563,126.7052],'경기'=>[37.4138,127.5183],
        '강원'=>[37.8228,128.1555],'충북'=>[36.6357,127.4917],'충남'=>[36.5184,126.8000],
        '대전'=>[36.3504,127.3845],'세종'=>[36.4800,127.2890],'전북'=>[35.7175,127.1530],
        '전남'=>[34.8161,126.4630],'광주'=>[35.1595,126.8526],'경북'=>[36.4919,128.8889],
        '경남'=>[35.4606,128.2132],'대구'=>[35.8714,128.6014],'울산'=>[35.5384,129.3114],
        '부산'=>[35.1796,129.0756],'제주'=>[33.4996,126.5312],
    ];
    /** 주소 풀네임/별칭 → 캐논 시/도(긴 키 우선). */
    private const KR_REGION_ALIASES = [
        '서울특별시'=>'서울','인천광역시'=>'인천','경기도'=>'경기','강원특별자치도'=>'강원','강원도'=>'강원',
        '충청북도'=>'충북','충청남도'=>'충남','대전광역시'=>'대전','세종특별자치시'=>'세종',
        '전북특별자치도'=>'전북','전라북도'=>'전북','전라남도'=>'전남','광주광역시'=>'광주',
        '경상북도'=>'경북','경상남도'=>'경남','대구광역시'=>'대구','울산광역시'=>'울산',
        '부산광역시'=>'부산','제주특별자치도'=>'제주','제주도'=>'제주',
    ];

    /** 주소/지역 문자열 → 캐논 시/도. 미식별 시 ''. (UTF-8 byte-safe strpos.) */
    public static function regionOf(string $text): string
    {
        $s = trim($text);
        if ($s === '') return '';
        foreach (self::KR_REGION_ALIASES as $full => $canon) { if (strpos($s, $full) !== false) return $canon; }
        foreach (array_keys(self::KR_REGION_CENTROIDS) as $canon) { if (strpos($s, $canon) !== false) return $canon; }
        return '';
    }

    /** [현 차수] 글로벌 centroid — 국가/주요도시 키(소문자 영문·현지어) → [위도,경도]. 국내(KR)는 위 시/도가 우선 granularity.
     *   도시(더 구체)를 국가보다 앞에 배치(긴 키/구체 우선 매칭). 2글자 ISO 코드는 오매칭 위험으로 제외(명시 좌표로 정밀화). */
    private const WORLD_CENTROIDS = [
        // ── 주요 도시(구체 우선) ──
        'new york'=>[40.7128,-74.0060],'los angeles'=>[34.0522,-118.2437],'san francisco'=>[37.7749,-122.4194],
        'chicago'=>[41.8781,-87.6298],'dallas'=>[32.7767,-96.7970],'seattle'=>[47.6062,-122.3321],'atlanta'=>[33.7490,-84.3880],
        'miami'=>[25.7617,-80.1918],'london'=>[51.5074,-0.1278],'manchester'=>[53.4808,-2.2426],'paris'=>[48.8566,2.3522],
        'berlin'=>[52.5200,13.4050],'frankfurt'=>[50.1109,8.6821],'amsterdam'=>[52.3676,4.9041],'madrid'=>[40.4168,-3.7038],
        'milan'=>[45.4642,9.1900],'rome'=>[41.9028,12.4964],'tokyo'=>[35.6762,139.6503],'東京'=>[35.6762,139.6503],
        'osaka'=>[34.6937,135.5023],'大阪'=>[34.6937,135.5023],'shanghai'=>[31.2304,121.4737],'上海'=>[31.2304,121.4737],
        'beijing'=>[39.9042,116.4074],'北京'=>[39.9042,116.4074],'shenzhen'=>[22.5431,114.0579],'guangzhou'=>[23.1291,113.2644],
        'hong kong'=>[22.3193,114.1694],'香港'=>[22.3193,114.1694],'singapore'=>[1.3521,103.8198],'taipei'=>[25.0330,121.5654],
        'bangkok'=>[13.7563,100.5018],'jakarta'=>[-6.2088,106.8456],'hanoi'=>[21.0278,105.8342],'ho chi minh'=>[10.8231,106.6297],
        'manila'=>[14.5995,120.9842],'kuala lumpur'=>[3.1390,101.6869],'mumbai'=>[19.0760,72.8777],'delhi'=>[28.7041,77.1025],
        'seoul'=>[37.5665,126.9780],'busan'=>[35.1796,129.0756],'incheon'=>[37.4563,126.7052],'gyeonggi'=>[37.4138,127.5183], // 로마자 한국(국내 한글은 regionOf 우선)
        'dubai'=>[25.2048,55.2708],'sydney'=>[-33.8688,151.2093],'melbourne'=>[-37.8136,144.9631],'toronto'=>[43.6532,-79.3832],
        'vancouver'=>[49.2827,-123.1207],'sao paulo'=>[-23.5505,-46.6333],'mexico city'=>[19.4326,-99.1332],
        // ── 미국 주(중심) — 캘리포니아 등 광역 ──
        'california'=>[36.7783,-119.4179],'texas'=>[31.0000,-99.0000],'florida'=>[27.7663,-81.6868],
        'new jersey'=>[40.0583,-74.4057],'illinois'=>[40.0000,-89.0000],'washington'=>[47.7511,-120.7401],
        // ── 국가(EN·현지어) ──
        'united states'=>[39.8283,-98.5795],'usa'=>[39.8283,-98.5795],'america'=>[39.8283,-98.5795],'미국'=>[39.8283,-98.5795],
        'japan'=>[36.2048,138.2529],'일본'=>[36.2048,138.2529],'日本'=>[36.2048,138.2529],
        'china'=>[35.8617,104.1954],'중국'=>[35.8617,104.1954],'中国'=>[35.8617,104.1954],'中國'=>[35.8617,104.1954],
        'united kingdom'=>[55.3781,-3.4360],'england'=>[52.3555,-1.1743],'영국'=>[55.3781,-3.4360],
        'germany'=>[51.1657,10.4515],'독일'=>[51.1657,10.4515],'deutschland'=>[51.1657,10.4515],
        'france'=>[46.2276,2.2137],'프랑스'=>[46.2276,2.2137],'spain'=>[40.4637,-3.7492],'스페인'=>[40.4637,-3.7492],
        'italy'=>[41.8719,12.5674],'이탈리아'=>[41.8719,12.5674],'netherlands'=>[52.1326,5.2913],'네덜란드'=>[52.1326,5.2913],
        'canada'=>[56.1304,-106.3468],'캐나다'=>[56.1304,-106.3468],'australia'=>[-25.2744,133.7751],'호주'=>[-25.2744,133.7751],
        'india'=>[20.5937,78.9629],'인도'=>[20.5937,78.9629],'싱가포르'=>[1.3521,103.8198], // 'singapore'(영문)는 도시섹션에 기정의
        'south korea'=>[36.5,127.8],'korea'=>[36.5,127.8],'한국'=>[36.5,127.8],'대한민국'=>[36.5,127.8],
        'taiwan'=>[23.6978,120.9605],'대만'=>[23.6978,120.9605],'臺灣'=>[23.6978,120.9605],
        'thailand'=>[15.8700,100.9925],'태국'=>[15.8700,100.9925],'vietnam'=>[14.0583,108.2772],'베트남'=>[14.0583,108.2772],
        'indonesia'=>[-0.7893,113.9213],'인도네시아'=>[-0.7893,113.9213],'philippines'=>[12.8797,121.7740],'필리핀'=>[12.8797,121.7740],
        'malaysia'=>[4.2105,101.9758],'말레이시아'=>[4.2105,101.9758],'brazil'=>[-14.2350,-51.9253],'브라질'=>[-14.2350,-51.9253],
        'mexico'=>[23.6345,-102.5528],'멕시코'=>[23.6345,-102.5528],'russia'=>[61.5240,105.3188],'러시아'=>[61.5240,105.3188],
        'saudi'=>[23.8859,45.0792],'united arab emirates'=>[23.4241,53.8478],'uae'=>[23.4241,53.8478],
    ];

    /** [현 차수] 글로벌 통합 지오코더 — 주소/지역 문자열 → [위도,경도]. ① 한국 시/도(국내 granularity) ② 글로벌 국가/도시.
     *   미식별 시 null. 정밀도가 필요하면 창고/배송지에 명시 좌표(lat/lng)를 제공(haversine 정확 동작). */
    public static function geoCentroid(string $text): ?array
    {
        $s = trim($text);
        if ($s === '') return null;
        $kr = self::regionOf($s); // 한국 시/도 우선(국내 세분)
        if ($kr !== '' && isset(self::KR_REGION_CENTROIDS[$kr])) return self::KR_REGION_CENTROIDS[$kr];
        $low = strtolower($s);
        foreach (self::WORLD_CENTROIDS as $key => $c) { if (strpos($low, $key) !== false) return $c; } // 도시(구체)→국가 순
        return null;
    }

    /** haversine 거리(km). */
    private static function haversineKm(float $la1, float $lo1, float $la2, float $lo2): float
    {
        $R = 6371.0; $dLa = deg2rad($la2 - $la1); $dLo = deg2rad($lo2 - $lo1);
        $a = sin($dLa / 2) ** 2 + cos(deg2rad($la1)) * cos(deg2rad($la2)) * sin($dLo / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(max(0.0, 1 - $a)));
    }

    /** 창고 centroid(위도,경도) — ① 명시 좌표(lat/lng, 전세계 정밀) 우선 ② country/region/area/location/name 에서
     *   글로벌 지오코더(geoCentroid: 한국 시/도 + 글로벌 국가/도시) 추정. null=미상(→ 재고량 정렬 폴백). */
    private static function warehouseCentroid(array $wh): ?array
    {
        $lat = $wh['lat'] ?? null; $lng = $wh['lng'] ?? null;
        // [현 차수 감사 P2] 배송지측(allocationPlan)과 동일하게 ||(진짜 0,0 sentinel만 거부) — 본초자오선(lng=0,
        //   영국/프랑스 일부)·적도(lat=0) 창고의 명시좌표가 거부되어 텍스트 폴백되던 불일치 해소.
        if (is_numeric($lat) && is_numeric($lng) && ((float)$lat != 0.0 || (float)$lng != 0.0)) return [(float)$lat, (float)$lng];
        return self::geoCentroid(
            (string)($wh['country'] ?? '') . ' ' . (string)($wh['region'] ?? '') . ' ' .
            (string)($wh['area'] ?? '') . ' ' . (string)($wh['location'] ?? '') . ' ' . (string)($wh['name'] ?? '')
        );
    }

    /**
     * [현 차수] 멀티창고 글로벌 최적할당 계획 — SKU 재고 보유 + 배송지 근접 창고를 점수화하여 선정.
     *   ① 재고>0 활성 창고 후보 ② 전량 커버(on_hand>=qty) 우선(분할출고 회피) ③ 배송지 근접(haversine·전세계)
     *   ④ 동점 시 재고 많은 순. 좌표/지역 미상이면 재고량으로만 정렬. 후보 0 → primaryWarehouse 폴백.
     *   배송지 위치: 명시 좌표($shipLat/$shipLng, 전세계 정밀) 우선 → 없으면 글로벌 지오코더(geoCentroid: 한국 시/도 + 국가/도시).
     * @return array{selected:string, selected_name:string, ship_region:string, ship_geocoded:bool, covered:bool, candidates:array, reason:string}
     */
    public static function allocationPlan(string $tenant, string $sku, float $qty, string $shipText = '', ?float $shipLat = null, ?float $shipLng = null): array
    {
        $primary = self::primaryWarehouse($tenant);
        $out = ['selected' => $primary, 'selected_name' => '', 'ship_region' => '', 'ship_geocoded' => false, 'covered' => false, 'candidates' => [], 'reason' => ''];
        if ($sku === '' || $tenant === '') return $out;
        try {
            $pdo = self::db();
            $st = $pdo->prepare("SELECT wh_id, on_hand FROM wms_stock WHERE tenant_id=? AND sku=? AND on_hand > 0");
            $st->execute([$tenant, $sku]);
            $stock = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            if (!$stock) { $out['reason'] = '재고 보유 창고 없음 — 기본창고 폴백'; return $out; }
            $whq = $pdo->prepare("SELECT id, name, region, country, area, location, lat, lng FROM wms_warehouses WHERE tenant_id=? AND active=1");
            $whq->execute([$tenant]);
            $whMap = [];
            foreach ($whq->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $w) { $whMap[(string)$w['id']] = $w; }
            $shipRegion = self::regionOf($shipText); // 국내(KR) 라벨(가능 시)
            $out['ship_region'] = $shipRegion;
            // 배송지 centroid: ① 명시 좌표(전세계 정밀) ② 글로벌 지오코더(한국 시/도 + 글로벌 국가/도시)
            $shipC = (is_numeric($shipLat) && is_numeric($shipLng) && ((float)$shipLat != 0.0 || (float)$shipLng != 0.0))
                ? [(float)$shipLat, (float)$shipLng] : self::geoCentroid($shipText);
            $out['ship_geocoded'] = $shipC !== null;
            $cands = [];
            foreach ($stock as $s) {
                $wid = (string)$s['wh_id'];
                if (!isset($whMap[$wid])) continue; // 비활성/삭제 창고 재고는 출고 대상 제외
                $w = $whMap[$wid];
                $onHand = (float)$s['on_hand'];
                $wc = self::warehouseCentroid($w);
                $dist = ($shipC !== null && $wc !== null) ? self::haversineKm($shipC[0], $shipC[1], $wc[0], $wc[1]) : null;
                $cands[] = [
                    'wh_id' => $wid, 'name' => (string)$w['name'],
                    'region' => (string)($w['region'] ?: ($w['country'] ?: self::regionOf((string)($w['area'] ?? '') . ' ' . (string)($w['location'] ?? '')))),
                    'on_hand' => $onHand, 'covers' => ($onHand >= $qty),
                    'distance_km' => ($dist !== null ? round($dist, 1) : null),
                ];
            }
            if (!$cands) { $out['reason'] = '활성 창고 재고 없음 — 기본창고 폴백'; return $out; }
            $cmp = function ($a, $b) {
                $da = $a['distance_km'] ?? 1e9; $db = $b['distance_km'] ?? 1e9;
                if (abs($da - $db) > 0.01) return $da <=> $db;       // 근접 우선(미상=큰값 후순위)
                return $b['on_hand'] <=> $a['on_hand'];               // 동점=재고 多
            };
            usort($cands, $cmp);
            // 전량 커버 가능 후보가 있으면 그 중에서 선정(분할출고 회피). 없으면 전체 후보에서 최선.
            $covering = array_values(array_filter($cands, fn($c) => $c['covers']));
            $pool = $covering ?: $cands;
            usort($pool, $cmp);
            $best = $pool[0];
            $out['selected'] = $best['wh_id']; $out['selected_name'] = $best['name'];
            $out['covered'] = $best['covers']; $out['candidates'] = $cands; // 전체 후보(점수순) 투명 노출
            $why = [];
            $why[] = $best['covers'] ? '전량 출고 가능' : '부분 재고(분할 필요)';
            if (($best['distance_km'] ?? null) !== null) {
                $shipLabel = $shipRegion !== '' ? $shipRegion : '배송지';
                $why[] = "{$shipLabel} 최근접 {$best['distance_km']}km";
            } elseif ($shipC === null) {
                $why[] = '배송지 미상 — 재고량 우선';
            } else {
                $why[] = '창고 좌표/지역 미상 — 재고량 우선';
            }
            $why[] = '재고 ' . rtrim(rtrim(number_format($best['on_hand'], 1), '0'), '.');
            $out['reason'] = implode(' · ', $why);
            return $out;
        } catch (\Throwable $e) {
            error_log('[Wms.allocationPlan] ' . $e->getMessage());
            return $out;
        }
    }

    /** [현 차수] 채널 판매 출고용 최적 창고 wh_id — allocationPlan 선정값(재고+근접). 폴백=primaryWarehouse. */
    private static function selectWarehouseForSale(string $tenant, string $sku, float $qty, string $shipText = ''): string
    {
        $sel = self::allocationPlan($tenant, $sku, $qty, $shipText)['selected'] ?? '';
        return $sel !== '' ? $sel : self::primaryWarehouse($tenant);
    }

    /** 입출고 유형 → 물리재고 부호 적용(영문 IO_TYPES + 한글 데모 라벨 모두 지원). $ref = FEFO lot 소비원가 원장 키(출고). */
    private static function applyMovementToStock(string $t, string $type, string $wh, string $dwh, string $sku, string $name, float $qty, string $ref = ''): void
    {
        if ($sku === '' || $qty == 0.0) return;
        $tl = strtolower($type);
        $isIn  = in_array($type, ['Inbound','ReturnsInbound'], true) || str_contains($type, '입고');
        $isOut = in_array($type, ['Outbound','ReturnsOutbound','Disposal'], true) || (str_contains($type, '출고') && !str_contains($type, '입고')) || str_contains($type, '폐기');
        if ($type === 'WarehouseTransfer' || str_contains($type, '이고') || str_contains($type, '이동')) {
            // [현 차수 P3] ★창고이동 lot 이관 — 출발 leg 은 strict(재고부족 거부)하되 lot 소비원장은 만들지 않고
            //   (전송은 판매/COGS 아님), FEFO lot 자체를 도착 창고로 재생성(lot_no·유통기한·원가 보존).
            //   기존엔 출발 lot 만 줄고 도착엔 lot 미생성 → 도착 창고 FEFO/유통기한/원가 추적이 영구 소실됐다.
            $dstWh = $dwh !== '' ? $dwh : $wh;
            self::adjustStock($t, $sku, $wh, $name, -abs($qty), true, '', false); // strict, 소비원장·lot차감 skip
            self::adjustStock($t, $sku, $dstWh, $name, abs($qty));
            self::transferLotsFefo($t, $sku, $wh, $dstWh, abs($qty)); // FEFO lot 이관(출발 차감+도착 생성)
        } elseif ($type === 'StockAdj' || str_contains($type, '조정')) {
            self::adjustStock($t, $sku, $wh, $name, $qty); // 조정은 부호 그대로(증감, 음수=0클램프)
        } elseif ($isIn) {
            self::adjustStock($t, $sku, $wh, $name, abs($qty));
        } elseif ($isOut) {
            self::adjustStock($t, $sku, $wh, $name, -abs($qty), true, $ref); // 실출고=strict(오버셀 거부)
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
    private static function adjustStock(string $t, string $sku, string $wh, string $name, float $delta, bool $strictOut = false, string $ref = '', bool $consumeLots = true): void
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
            //   $ref 전달 시 소비된 lot 원가를 wms_lot_consumptions 원장에 적재(FEFO COGS 소싱 SSOT).
            //   [현 차수 P3] $consumeLots=false(창고이동 출발 leg)면 lot 소비 skip → transferLotsFefo 가 이관 전담.
            if ($consumeLots) self::consumeLotsFefo($pdo, $t, $sku, $wh, $need, $ref);
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
    private static function consumeLotsFefo(\PDO $pdo, string $t, string $sku, string $wh, float $qty, string $ref = ''): void
    {
        if ($qty <= 0 || $sku === '') return;
        try {
            // [현 차수] lot 원가(cost·landed_cost) 를 함께 조회 — 소비 시 FEFO COGS 원장(wms_lot_consumptions) 적재.
            //   landed_cost(도착원가) 우선, 없으면 cost. 컬럼 부재(구 스키마)면 0(무해 폴백).
            $sel = $pdo->prepare("SELECT id, qty, lot_no,
                                         COALESCE(NULLIF(landed_cost,0), NULLIF(cost,0), 0) AS unit_cost
                                  FROM wms_lots WHERE tenant_id=:t AND sku=:s AND qty>0 AND (wh_id=:w OR wh_id IS NULL OR wh_id='')
                                  ORDER BY (expiry_date IS NULL OR expiry_date=''), expiry_date ASC, id ASC");
            $sel->execute([':t' => $t, ':s' => $sku, ':w' => $wh]);
            $lots = $sel->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            if (!$lots) return; // lot 미추적 SKU → no-op
            $need = $qty;
            $dec = $pdo->prepare("UPDATE wms_lots SET qty = qty - :take WHERE id = :id");
            $now = self::now();
            $logC = $pdo->prepare("INSERT INTO wms_lot_consumptions (tenant_id,ref,sku,wh_id,lot_id,lot_no,qty,unit_cost,cost_total,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
            foreach ($lots as $lot) {
                if ($need <= 0) break;
                $take = min((float)$lot['qty'], $need);
                if ($take <= 0) continue;
                $dec->execute([':take' => $take, ':id' => (int)$lot['id']]);
                $uc = (float)($lot['unit_cost'] ?? 0);
                // FEFO 소비원가 원장 — Pnl 이 (tenant,ref) 로 합산해 COGS 를 lot-layer 로 소싱(WAC 폴백 유지).
                try { $logC->execute([$t, $ref, $sku, $wh, (int)$lot['id'], (string)($lot['lot_no'] ?? ''), $take, $uc, $take * $uc, $now]); } catch (\Throwable $e) {}
                $need -= $take;
            }
        } catch (\Throwable $e) { /* lot 소비 실패 = 정직 무시(wms_stock 권위) */ }
    }

    /**
     * [현 차수 P3] 창고 간 FEFO lot 이관 — 출발 창고의 임박 lot 부터 차감하며 동일 lot(lot_no·유통기한·원가)을
     *   도착 창고에 재생성. 판매/소비가 아니므로 wms_lot_consumptions(COGS 원장)에는 적재하지 않는다.
     *   lot 미추적 SKU(lot 0개)는 no-op. 전과정 비throw(보조 등록부·wms_stock 이 재고 권위).
     */
    private static function transferLotsFefo(string $t, string $sku, string $srcWh, string $dstWh, float $qty): void
    {
        if ($qty <= 0 || $sku === '' || $srcWh === $dstWh) return;
        try {
            $pdo = self::db(); $now = self::now();
            $sel = $pdo->prepare("SELECT id, qty, lot_no, mfg_date, expiry_date, name,
                                         COALESCE(NULLIF(cost,0),0) AS cost, COALESCE(NULLIF(landed_cost,0),0) AS landed_cost
                                  FROM wms_lots WHERE tenant_id=:t AND sku=:s AND qty>0 AND (wh_id=:w OR wh_id IS NULL OR wh_id='')
                                  ORDER BY (expiry_date IS NULL OR expiry_date=''), expiry_date ASC, id ASC");
            $sel->execute([':t' => $t, ':s' => $sku, ':w' => $srcWh]);
            $lots = $sel->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            if (!$lots) return; // lot 미추적 SKU → no-op
            $need = $qty;
            $dec = $pdo->prepare("UPDATE wms_lots SET qty = qty - :take WHERE id = :id");
            $ins = $pdo->prepare("INSERT INTO wms_lots (tenant_id, sku, name, lot_no, mfg_date, expiry_date, qty, wh_id, cost, landed_cost, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
            foreach ($lots as $lot) {
                if ($need <= 0) break;
                $take = min((float)$lot['qty'], $need);
                if ($take <= 0) continue;
                $dec->execute([':take' => $take, ':id' => (int)$lot['id']]);
                try {
                    $ins->execute([$t, $sku, (string)($lot['name'] ?? ''), (string)($lot['lot_no'] ?? ''), (string)($lot['mfg_date'] ?? ''), (string)($lot['expiry_date'] ?? ''), $take, $dstWh, (float)($lot['cost'] ?? 0), (float)($lot['landed_cost'] ?? 0), $now]);
                } catch (\Throwable $e) { /* cost/landed_cost 컬럼 부재 구스키마 폴백 */
                    try { $pdo->prepare("INSERT INTO wms_lots (tenant_id, sku, name, lot_no, mfg_date, expiry_date, qty, wh_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)")->execute([$t, $sku, (string)($lot['name'] ?? ''), (string)($lot['lot_no'] ?? ''), (string)($lot['mfg_date'] ?? ''), (string)($lot['expiry_date'] ?? ''), $take, $dstWh, $now]); } catch (\Throwable $e2) {}
                }
                $need -= $take;
            }
        } catch (\Throwable $e) { /* lot 이관 실패 = 정직 무시(wms_stock 권위) */ }
    }

    /**
     * [현 차수] FEFO COGS SSOT 노출 — 판매/출고 ref 별 FEFO 소비원가 합계를 읽는 클린 API.
     *   채널 판매 출고 ref 규약 = 'CHS-{channel}-{channel_order_id}' (ChannelSync::reflectChannelSale).
     *
     *   ★실 소비 경로(무음 write-only 아님): OrderHub::aggregateCogs(P&L COGS SSOT, Pnl.php 도 공용) 가
     *     주문 단위로 이 원장을 LEFT JOIN(ref='CHS-{channel}-{channel_order_id}') 하여
     *     COALESCE(FEFO cost_total, WAC(channel_inventory.cost)) 로 집계한다 — 즉 소비원장이 있으면 FEFO
     *     lot 실원가를, 없으면 기존 WAC 를 사용(원장 empty 시 WAC 와 byte-identical, 무회귀). 아래 fefoCogsForRef(s)
     *     는 Pnl 등이 핸들러 결합 없이 동일 원장을 조회하도록 노출하는 순수 API 다.
     *
     *   ★Pnl 이 직접 쓸 수 있는 순수 SQL(핸들러 결합 없이 재사용 가능):
     *     SELECT ref, SUM(cost_total) AS fefo_cogs FROM wms_lot_consumptions
     *      WHERE tenant_id = ? AND ref IN (…) GROUP BY ref
     *
     * @param string[] $refs
     * @return array<string,float> ref => FEFO COGS(원). 소비원장 없는 ref 는 결과에서 생략(호출측이 WAC 폴백).
     */
    public static function fefoCogsForRefs(string $tenant, array $refs): array
    {
        $refs = array_values(array_unique(array_filter(array_map('strval', $refs), fn($r) => $r !== '')));
        if ($tenant === '' || !$refs) return [];
        try {
            self::ensureTables();
            $in = implode(',', array_fill(0, count($refs), '?'));
            $st = self::db()->prepare("SELECT ref, SUM(cost_total) AS c FROM wms_lot_consumptions WHERE tenant_id=? AND ref IN ($in) GROUP BY ref");
            $st->execute(array_merge([$tenant], $refs));
            $out = [];
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) { $out[(string)$r['ref']] = (float)$r['c']; }
            return $out;
        } catch (\Throwable $e) { error_log('[Wms.fefoCogsForRefs] ' . $e->getMessage()); return []; }
    }

    /** 단일 ref FEFO 소비원가. 원장 없으면 null → 호출측(Pnl) 이 WAC 로 폴백. */
    public static function fefoCogsForRef(string $tenant, string $ref): ?float
    {
        $m = self::fefoCogsForRefs($tenant, [$ref]);
        return $m[$ref] ?? null;
    }

    /**
     * SKU 의 현 FEFO 최선(유통기한 임박) lot 단위원가 — 실시간 원가 견적/폴백(landed_cost 우선). lot·원가 없으면 null.
     *   출고 전 예상 COGS 견적, 또는 소비원장 부재 시 단위원가 폴백에 사용.
     */
    public static function fefoUnitCost(string $tenant, string $sku, string $wh = ''): ?float
    {
        if ($tenant === '' || $sku === '') return null;
        try {
            self::ensureTables();
            $st = self::db()->prepare("SELECT COALESCE(NULLIF(landed_cost,0), NULLIF(cost,0), 0) AS uc
                                       FROM wms_lots WHERE tenant_id=:t AND sku=:s AND qty>0 AND (wh_id=:w OR :w='' OR wh_id IS NULL OR wh_id='')
                                       ORDER BY (expiry_date IS NULL OR expiry_date=''), expiry_date ASC, id ASC LIMIT 1");
            $st->execute([':t' => $tenant, ':s' => $sku, ':w' => $wh]);
            $v = $st->fetchColumn();
            if ($v === false || $v === null) return null;
            $uc = (float)$v;
            return $uc > 0 ? $uc : null;
        } catch (\Throwable $e) { return null; }
    }

    /** GET /wms/stock — 물리 창고 재고(입출고 파생). by_sku=1 이면 SKU별 합산. */
    public static function listStock(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $q = $req->getQueryParams();
        self::consolidateOrphanStock($t); // [286차] 'default'/'' 고아 재고를 실 창고로 병합(재고현황 창고별 분포 정합)
        // [현 차수 P2-1] ABAC 강제 — warehouse 데이터범위 사용자는 허용 창고 재고만 조회(무제한=무필터·무회귀).
        [$scW, $scP] = \Genie\Handlers\TeamPermissions::scopeSql($req, 'warehouse', 'wh_id');
        $params = [$t]; foreach ($scP as $p) $params[] = $p;
        if (!empty($q['by_sku'])) {
            $st = self::db()->prepare("SELECT sku, MAX(name) name, SUM(on_hand) on_hand FROM wms_stock WHERE tenant_id=?{$scW} GROUP BY sku ORDER BY sku");
        } else {
            $st = self::db()->prepare("SELECT sku, wh_id, name, on_hand, updated_at FROM wms_stock WHERE tenant_id=?{$scW} ORDER BY sku, wh_id");
        }
        $st->execute($params);
        return self::json($res, ['ok' => true, 'stock' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /* ════════════════ 피킹 리스트(Picking) ════════════════ */

    public static function listPicking(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_picking WHERE tenant_id=:t ORDER BY id DESC LIMIT 500");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'picking' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function savePicking(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        // [283차 GAP-2] 송장번호 — 발송처리(채널 송장전송)의 입력값. 종전 wms_picking 에 컬럼조차 없었다.
        $trackingIn = trim((string)($b['trackingNo'] ?? $b['tracking_no'] ?? ''));
        if ($id > 0) {
            $newStatus = (string)($b['status'] ?? 'pending');
            // [현 차수] 219 P2: 피킹 status→shipped 전이 시 물리 재고 차감(기존엔 이력만 갱신, 재고 미차감 결함).
            //   PartnerPortal shipped 경로와 동일 패턴. 멱등(PICK-{id} ref)·재고부족 시 422(출고 거부).
            $sel = $pdo->prepare("SELECT order_ref, sku, name, qty, wh_id, carrier, tracking_no, status FROM wms_picking WHERE id=? AND tenant_id=? LIMIT 1");
            $sel->execute([$id, $t]);
            $row = $sel->fetch(\PDO::FETCH_ASSOC);
            $old = is_array($row) ? $row : [];   // 미존재 시 fetch()=false → 배열 오프셋 접근 경고 방지
            if ($old && ($err = self::guardWarehouse($req, $res, (string)($old['wh_id'] ?? '')))) return $err; // 219 P2 창고 권한
            $shipping = $old && (string)($old['status'] ?? '') !== 'shipped' && $newStatus === 'shipped';
            if ($shipping) {
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
            // 송장/택배사는 부분 갱신 — 요청에 없으면 기존값 보존(빈 문자열로 지워지지 않는다).
            $carrier  = array_key_exists('carrier', $b) ? (string)$b['carrier'] : (string)($old['carrier'] ?? '');
            $tracking = $trackingIn !== '' ? $trackingIn : (string)($old['tracking_no'] ?? '');
            $st = $pdo->prepare("UPDATE wms_picking SET status=:s,carrier=:c,tracking_no=:tn,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute([':s' => $newStatus, ':c' => $carrier, ':tn' => $tracking, ':ua' => $now, ':id' => $id, ':t' => $t]);
            if ($st->rowCount() === 0 && !self::exists('wms_picking', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);

            // ── [283차 GAP-2] 출고 완료 → 채널 발송처리(송장 전송) 큐 적재 ────────────────────────
            //   ★근본결함: WMS 피킹으로 출고가 끝나도 채널로 아무것도 돌아가지 않아 구매자 화면의 주문이
            //     영원히 "배송준비중"이었다(waybill|shipment_confirm 백엔드 0건 = 부재증명).
            //   ★송장이 없으면 적재하지 않는다 — 발송처리는 송장 없이 성립하지 않으므로 "처리한 척" 하지 않는다.
            //     (웨이브 확정 경로는 송장이 아직 없다 → 송장 등록 시점[본 API 재호출 또는 Logistics::track]에 적재된다.)
            //   ★order_ref 가 채널 주문으로 해석되지 않으면 skip(자체몰/오프라인 출고 = 발송처리 대상 아님).
            $shipJob = 0;
            if ($shipping && $tracking !== '') {
                try {
                    $shipJob = ChannelSync::enqueueShipment($t, [
                        'order_ref' => (string)($old['order_ref'] ?? ''), 'sku' => (string)($old['sku'] ?? ''),
                        'carrier' => $carrier, 'tracking_no' => $tracking,
                    ]);
                } catch (\Throwable $e) { error_log('[Wms.savePicking.enqueueShipment] ' . $e->getMessage()); }
            }
            return self::json($res, ['ok' => true, 'id' => $id, 'shipment_job' => $shipJob,
                'shipment_note' => ($shipping && $tracking === '') ? '송장번호가 없어 채널 발송처리를 보류했습니다 — 송장 등록 시 자동 전송됩니다.' : null]);
        }
        if ($err = self::guardWarehouse($req, $res, (string)($b['whId'] ?? $b['wh_id'] ?? ''))) return $err; // 219 P2 창고 권한
        $st = $pdo->prepare("INSERT INTO wms_picking (tenant_id,order_ref,sku,name,qty,wh_id,carrier,tracking_no,status,created_at,updated_at) VALUES (:t,:o,:sku,:name,:qty,:wh,:c,:tn,:s,:ca,:ua)");
        $st->execute([
            ':t' => $t, ':o' => (string)($b['orderRef'] ?? $b['order_ref'] ?? ''), ':sku' => (string)($b['sku'] ?? ''),
            ':name' => (string)($b['name'] ?? ''), ':qty' => (float)($b['qty'] ?? 0), ':wh' => (string)($b['whId'] ?? $b['wh_id'] ?? ''),
            ':c' => (string)($b['carrier'] ?? ''), ':tn' => $trackingIn, ':s' => (string)($b['status'] ?? 'pending'), ':ca' => $now, ':ua' => $now,
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ════════════════ 자동 발주(Supply Orders) ════════════════ */

    public static function listSupplyOrders(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM wms_supply_orders WHERE tenant_id=:t ORDER BY id DESC LIMIT 500");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'supplyOrders' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function saveSupplyOrder(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
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
                // [280차 P1] ★발주 입고확정이 재고에 절대 반영되지 않던 근본원인: 발주 생성 경로(자동발주
                //   DemandForecast·WmsManager/SupplyChain 폼)가 wh_id 를 빈 문자열로 넣어, 여기 $swh!=='' 가드에
                //   걸려 Inbound 원장 기록이 영구 skip → 입고 루프 전체가 재고에 미도달(오류도 없이). wh_id 가
                //   비면 주창고로 폴백해 반영한다(입고확정은 반드시 어딘가로 들어가야 한다).
                if ($swh === '') $swh = self::resolvePrimaryWarehouse($t);
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
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        // FEFO: 유통기한 임박순 정렬
        $st = self::db()->prepare("SELECT * FROM wms_lots WHERE tenant_id=:t ORDER BY (expiry_date IS NULL), expiry_date ASC, id DESC LIMIT 1000");
        $st->execute([':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'lots' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    public static function createLot(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $pdo = self::db();
        // [현 차수] FEFO 원가 기반 — lot 등록 시 cost(단위원가)·landed_cost(도착원가) 수집(출고 시 COGS 소싱).
        $st = $pdo->prepare("INSERT INTO wms_lots (tenant_id,sku,name,lot_no,mfg_date,expiry_date,qty,wh_id,cost,landed_cost,created_at) VALUES (:t,:sku,:name,:lot,:mfg,:exp,:qty,:wh,:cost,:landed,:ca)");
        $st->execute([
            ':t' => $t, ':sku' => (string)($b['sku'] ?? ''), ':name' => (string)($b['name'] ?? ''),
            ':lot' => (string)($b['lotNo'] ?? $b['lot_no'] ?? ''), ':mfg' => (string)($b['mfgDate'] ?? $b['mfg_date'] ?? ''),
            ':exp' => (string)($b['expiryDate'] ?? $b['expiry_date'] ?? ''), ':qty' => (float)($b['qty'] ?? 0),
            ':wh' => (string)($b['wh'] ?? $b['wh_id'] ?? ''),
            ':cost' => (float)($b['cost'] ?? $b['unit_cost'] ?? 0), ':landed' => (float)($b['landedCost'] ?? $b['landed_cost'] ?? 0),
            ':ca' => self::now(),
        ]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteLot(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_lots WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ════════════════ [현 차수] 바코드/시리얼 스캔 · 빈 로케이션 · 웨이브 피킹 ════════════════
     *   ★기존 흐름을 교체하지 않고 확장: recordMovement(원자·멱등)·wms_stock(창고단위 권위)·wms_lots(FEFO)·
     *     wms_picking 는 그대로 사용하고, 그 위에 바코드 해석·빈 로케이션 하위원장·웨이브 배치를 얹는다.
     *   ★빈별 재고(wms_bin_stock)는 창고단위 on_hand(wms_stock)의 하위 분할(informational + pick-from-bin)로,
     *     스캔입출고는 양측(창고+빈) 동시 반영, 창고내 이동(put-away)은 빈 원장만 이동(창고 on_hand 불변=무회귀). */

    /** 바코드/시리얼 → SKU 해석. 미등록이면 null(호출측이 코드=SKU 폴백 판단). */
    private static function resolveBarcode(string $t, string $code): ?array
    {
        if ($code === '') return null;
        try {
            $st = self::db()->prepare("SELECT sku, name, kind, status, bin_id FROM wms_barcodes WHERE tenant_id=? AND code=? LIMIT 1");
            $st->execute([$t, $code]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            return $r ?: null;
        } catch (\Throwable $e) { return null; }
    }

    /** bin 참조(id 정수 또는 code/barcode 문자) → [bin_id, bin_code]. 미해결 시 [0, 원문]. */
    private static function resolveBin(string $t, string $whId, $binRef): array
    {
        if ($binRef === null || $binRef === '' || $binRef === 0) return [0, ''];
        try {
            $pdo = self::db();
            if (is_numeric($binRef)) {
                $st = $pdo->prepare("SELECT id, code FROM wms_bins WHERE tenant_id=? AND id=? LIMIT 1");
                $st->execute([$t, (int)$binRef]);
            } else {
                $st = $pdo->prepare("SELECT id, code FROM wms_bins WHERE tenant_id=? AND (code=? OR barcode=?) AND (wh_id=? OR ?='') ORDER BY (wh_id=?) DESC LIMIT 1");
                $st->execute([$t, (string)$binRef, (string)$binRef, $whId, $whId, $whId]);
            }
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if ($r) return [(int)$r['id'], (string)$r['code']];
        } catch (\Throwable $e) {}
        return [0, is_numeric($binRef) ? '' : (string)$binRef];
    }

    /** 빈별 재고 하위원장 증감(0 클램프). 창고단위 wms_stock 은 recordMovement 가 별도로 권위 관리. */
    private static function adjustBinStock(string $t, string $whId, int $binId, string $sku, string $name, float $delta): void
    {
        if ($sku === '' || $binId <= 0 || $delta == 0.0) return;
        $pdo = self::db(); $now = self::now();
        $sel = $pdo->prepare("SELECT id, on_hand FROM wms_bin_stock WHERE tenant_id=? AND wh_id=? AND bin_id=? AND sku=? LIMIT 1");
        $sel->execute([$t, $whId, $binId, $sku]);
        $row = $sel->fetch(\PDO::FETCH_ASSOC);
        if ($row) {
            $newQty = max(0, (float)$row['on_hand'] + $delta);
            $pdo->prepare("UPDATE wms_bin_stock SET on_hand=?, name=COALESCE(NULLIF(name,''),?), updated_at=? WHERE id=?")
                ->execute([$newQty, $name, $now, (int)$row['id']]);
        } elseif ($delta > 0) {
            try {
                $pdo->prepare("INSERT INTO wms_bin_stock (tenant_id,wh_id,bin_id,sku,name,on_hand,updated_at) VALUES (?,?,?,?,?,?,?)")
                    ->execute([$t, $whId, $binId, $sku, $name, $delta, $now]);
            } catch (\Throwable $e) { /* UNIQUE 경합 → 재조정 */
                $pdo->prepare("UPDATE wms_bin_stock SET on_hand=on_hand+?, updated_at=? WHERE tenant_id=? AND wh_id=? AND bin_id=? AND sku=?")
                    ->execute([$delta, $now, $t, $whId, $binId, $sku]);
            }
        }
    }

    /**
     * pick-path 정렬 seq — aisle/rack/level 숫자부를 자릿수 결합(구역 내 순회 순서).
     *
     * ★slot(번)은 의도적으로 seq 에 넣지 않는다. 자릿수를 늘리면(예: aisle*1e6) 이미 저장된 행의
     *   seq(구 척도)와 신규 행의 seq(신 척도)가 한 테이블에서 섞여 피킹 동선 정렬이 깨진다.
     *   대신 slot 은 ORDER BY 의 2차 키(seq → slot)로 참여한다 — 기존 값 무변경, 회귀 0.
     */
    private static function binSeq(string $aisle, string $rack, string $level): int
    {
        $n = fn(string $s): int => (int)preg_replace('/\D+/', '', $s);
        return $n($aisle) * 10000 + $n($rack) * 100 + $n($level);
    }

    /** 빈 코드(A-01-01-1)의 마지막 마디를 '번'으로 해석 — slot 미입력 행 백필용. 4마디 미만이면 빈 값. */
    private static function slotFromCode(string $code): string
    {
        $parts = explode('-', $code);
        return count($parts) >= 4 ? trim(end($parts)) : '';
    }

    /* ── 빈 로케이션(Bins) ── */

    public static function listBins(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $q = $req->getQueryParams();
        $sql = "SELECT * FROM wms_bins WHERE tenant_id=:t"; $p = [':t' => $t];
        if (!empty($q['wh_id'])) { $sql .= " AND wh_id=:w"; $p[':w'] = (string)$q['wh_id']; }
        // slot 은 seq 다음 2차 정렬키(binSeq 주석 참조 — seq 척도 변경 없이 '번' 순서 반영).
        $sql .= " ORDER BY zone, seq, slot, code";
        $st = self::db()->prepare($sql); $st->execute($p);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['active'] = (bool)(int)($r['active'] ?? 1);
            if (($r['slot'] ?? '') === '' || $r['slot'] === null) $r['slot'] = self::slotFromCode((string)$r['code']);
        }
        return self::json($res, ['ok' => true, 'bins' => $rows]);
    }

    public static function saveBin(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $whId = (string)($b['whId'] ?? $b['wh_id'] ?? '');
        if ($err = self::guardWarehouse($req, $res, $whId)) return $err;
        $code = trim((string)($b['code'] ?? ''));
        if ($code === '') return self::json($res, ['ok' => false, 'error' => '로케이션 코드를 입력하세요.'], 422);
        $aisle = (string)($b['aisle'] ?? ''); $rack = (string)($b['rack'] ?? ''); $level = (string)($b['level'] ?? '');
        // 번(slot) 미입력 시 빈 코드 마지막 마디에서 백필 — 기존 코드 규약(A-01-01-1)을 그대로 승계.
        $slot = trim((string)($b['slot'] ?? ''));
        if ($slot === '') $slot = self::slotFromCode($code);
        $seq = (isset($b['seq']) && is_numeric($b['seq'])) ? (int)$b['seq'] : self::binSeq($aisle, $rack, $level);
        $f = [
            ':wh' => $whId, ':code' => $code, ':zone' => (string)($b['zone'] ?? ''), ':aisle' => $aisle,
            ':rack' => $rack, ':level' => $level, ':slot' => $slot, ':seq' => $seq, ':barcode' => (string)($b['barcode'] ?? ''),
            ':cap' => (float)($b['capacity'] ?? 0), ':active' => isset($b['active']) ? (!empty($b['active']) ? 1 : 0) : 1,
        ];
        $id = (int)($args['id'] ?? $b['id'] ?? 0);
        if ($id > 0) {
            $f[':id'] = $id; $f[':t'] = $t; $f[':ua'] = $now;
            $st = $pdo->prepare("UPDATE wms_bins SET wh_id=:wh,code=:code,zone=:zone,aisle=:aisle,rack=:rack,level=:level,slot=:slot,seq=:seq,barcode=:barcode,capacity=:cap,active=:active,updated_at=:ua WHERE id=:id AND tenant_id=:t");
            $st->execute($f);
            if ($st->rowCount() === 0 && !self::exists('wms_bins', $id, $t)) return self::json($res, ['ok' => false, 'error' => '없음'], 404);
            return self::json($res, ['ok' => true, 'id' => $id]);
        }
        $f[':t'] = $t; $f[':ca'] = $now; $f[':ua'] = $now;
        try {
            $st = $pdo->prepare("INSERT INTO wms_bins (tenant_id,wh_id,code,zone,aisle,rack,level,slot,seq,barcode,capacity,active,created_at,updated_at) VALUES (:t,:wh,:code,:zone,:aisle,:rack,:level,:slot,:seq,:barcode,:cap,:active,:ca,:ua)");
            $st->execute($f);
        } catch (\Throwable $e) { // UNIQUE(tenant,wh,code) 충돌 → 기존 반환(멱등)
            $ex = $pdo->prepare("SELECT id FROM wms_bins WHERE tenant_id=? AND wh_id=? AND code=? LIMIT 1");
            $ex->execute([$t, $whId, $code]);
            $eid = $ex->fetchColumn();
            if ($eid !== false) return self::json($res, ['ok' => true, 'id' => (int)$eid, 'existing' => true]);
            throw $e;
        }
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteBin(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_bins WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /** GET /wms/bin-stock — 빈별 재고(로케이션 조인). wh_id/sku 필터. */
    public static function listBinStock(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $q = $req->getQueryParams();
        // 상품이 '어느 창고 / 몇 번 랙 / 몇 단 / 몇 번'에 있는지 한 행으로 읽히도록 로케이션 전 마디를 조인한다.
        $sql = "SELECT bs.id, bs.wh_id, bs.bin_id, bs.sku, bs.name, bs.on_hand, bs.updated_at,
                       b.code AS bin_code, b.zone, b.aisle, b.rack, b.level, b.slot, b.seq
                FROM wms_bin_stock bs LEFT JOIN wms_bins b ON b.id=bs.bin_id AND b.tenant_id=bs.tenant_id
                WHERE bs.tenant_id=:t";
        $p = [':t' => $t];
        if (!empty($q['wh_id'])) { $sql .= " AND bs.wh_id=:w"; $p[':w'] = (string)$q['wh_id']; }
        if (!empty($q['sku']))   { $sql .= " AND bs.sku=:s"; $p[':s'] = (string)$q['sku']; }
        $sql .= " ORDER BY bs.sku, b.zone, b.seq, b.slot";
        $st = self::db()->prepare($sql); $st->execute($p);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            if (($r['slot'] ?? '') === '' || $r['slot'] === null) $r['slot'] = self::slotFromCode((string)($r['bin_code'] ?? ''));
        }
        return self::json($res, ['ok' => true, 'binStock' => $rows]);
    }

    /* ── 바코드/시리얼 registry ── */

    public static function listBarcodes(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $q = $req->getQueryParams();
        $sql = "SELECT * FROM wms_barcodes WHERE tenant_id=:t"; $p = [':t' => $t];
        if (!empty($q['sku'])) { $sql .= " AND sku=:s"; $p[':s'] = (string)$q['sku']; }
        $sql .= " ORDER BY id DESC LIMIT 1000";
        $st = self::db()->prepare($sql); $st->execute($p);
        return self::json($res, ['ok' => true, 'barcodes' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /wms/barcodes — 바코드/시리얼 → SKU 매핑 upsert(멱등, (tenant,code) 유니크). kind=barcode|serial. */
    public static function saveBarcode(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $code = trim((string)($b['code'] ?? $b['barcode'] ?? $b['serial'] ?? ''));
        $sku  = trim((string)($b['sku'] ?? ''));
        if ($code === '' || $sku === '') return self::json($res, ['ok' => false, 'error' => 'code(바코드/시리얼)와 sku가 필요합니다.'], 422);
        $kind = (string)($b['kind'] ?? (isset($b['serial']) ? 'serial' : 'barcode'));
        $sel = $pdo->prepare("SELECT id FROM wms_barcodes WHERE tenant_id=? AND code=? LIMIT 1");
        $sel->execute([$t, $code]); $eid = $sel->fetchColumn();
        if ($eid !== false) {
            $pdo->prepare("UPDATE wms_barcodes SET sku=?,name=?,kind=?,updated_at=? WHERE id=?")
                ->execute([$sku, (string)($b['name'] ?? ''), $kind, $now, (int)$eid]);
            return self::json($res, ['ok' => true, 'id' => (int)$eid]);
        }
        $pdo->prepare("INSERT INTO wms_barcodes (tenant_id,code,sku,name,kind,status,bin_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
            ->execute([$t, $code, $sku, (string)($b['name'] ?? ''), $kind, 'active', 0, $now, $now]);
        return self::json($res, ['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }

    public static function deleteBarcode(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM wms_barcodes WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => (int)$args['id'], ':t' => self::tenant($req)]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ── 스캔 입/출고 + put-away ── */

    /** POST /wms/scan-in — 바코드/시리얼/SKU 스캔 입고. recordMovement(Inbound) + 빈 put-away(선택). serial 은 멱등(qty=1). */
    public static function scanIn(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $code = trim((string)($b['barcode'] ?? $b['serial'] ?? $b['code'] ?? ''));
        $sku  = trim((string)($b['sku'] ?? ''));
        $name = (string)($b['name'] ?? '');
        $resolved = $code !== '' ? self::resolveBarcode($t, $code) : null;
        if ($resolved) { $sku = (string)$resolved['sku']; if ($name === '') $name = (string)($resolved['name'] ?? ''); }
        elseif ($sku === '' && $code !== '') { $sku = $code; } // 미등록 바코드 → 코드=SKU 폴백
        if ($sku === '') return self::json($res, ['ok' => false, 'error' => '바코드/시리얼 또는 SKU가 필요합니다.', 'code' => 'SCAN_UNRESOLVED'], 422);
        $whId = (string)($b['whId'] ?? $b['wh_id'] ?? '');
        if ($whId === '') $whId = self::primaryWarehouse($t);
        if ($err = self::guardWarehouse($req, $res, $whId)) return $err;
        $isSerial = $resolved && (string)($resolved['kind'] ?? '') === 'serial';
        $qty = $isSerial ? 1.0 : max(1.0, (float)($b['qty'] ?? 1));
        // serial 은 code 기반 멱등 ref(재스캔 무해), 일반 바코드는 요청 ref 또는 타임스탬프.
        $ref = trim((string)($b['ref'] ?? ''));
        if ($ref === '') $ref = $isSerial ? ('SERIN-' . $code) : ('SCANIN-' . ($code !== '' ? $code : $sku) . '-' . gmdate('YmdHis'));
        [$binId, $binCode] = self::resolveBin($t, $whId, $b['bin'] ?? $b['bin_id'] ?? $b['bin_code'] ?? '');
        $mid = self::recordMovement($t, ['type' => 'Inbound', 'wh_id' => $whId, 'sku' => $sku, 'name' => $name, 'qty' => $qty, 'ref' => $ref, 'reason' => '스캔입고']);
        if ($binId > 0) self::adjustBinStock($t, $whId, $binId, $sku, $name, $qty);
        if ($isSerial) { try { self::db()->prepare("UPDATE wms_barcodes SET status='in', bin_id=?, updated_at=? WHERE tenant_id=? AND code=?")->execute([$binId, self::now(), $t, $code]); } catch (\Throwable $e) {} }
        Db::audit(self::db(), $t, 'wms.scan_in', ['sku' => $sku, 'qty' => $qty, 'wh_id' => $whId, 'bin_id' => $binId, 'serial' => $isSerial]);
        return self::json($res, ['ok' => true, 'sku' => $sku, 'qty' => $qty, 'wh_id' => $whId, 'bin_id' => $binId, 'bin_code' => $binCode, 'movement_id' => $mid]);
    }

    /** POST /wms/scan-out — 바코드/시리얼/SKU 스캔 출고. recordMovement(Outbound·strict) + 빈 차감. 재고부족=422. */
    public static function scanOut(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $code = trim((string)($b['barcode'] ?? $b['serial'] ?? $b['code'] ?? ''));
        $sku  = trim((string)($b['sku'] ?? ''));
        $name = (string)($b['name'] ?? '');
        $resolved = $code !== '' ? self::resolveBarcode($t, $code) : null;
        if ($resolved) { $sku = (string)$resolved['sku']; if ($name === '') $name = (string)($resolved['name'] ?? ''); }
        elseif ($sku === '' && $code !== '') { $sku = $code; }
        if ($sku === '') return self::json($res, ['ok' => false, 'error' => '바코드/시리얼 또는 SKU가 필요합니다.', 'code' => 'SCAN_UNRESOLVED'], 422);
        $whId = (string)($b['whId'] ?? $b['wh_id'] ?? '');
        if ($whId === '') $whId = self::primaryWarehouse($t);
        if ($err = self::guardWarehouse($req, $res, $whId)) return $err;
        $isSerial = $resolved && (string)($resolved['kind'] ?? '') === 'serial';
        $qty = $isSerial ? 1.0 : max(1.0, (float)($b['qty'] ?? 1));
        $ref = trim((string)($b['ref'] ?? ''));
        if ($ref === '') $ref = $isSerial ? ('SEROUT-' . $code) : ('SCANOUT-' . ($code !== '' ? $code : $sku) . '-' . gmdate('YmdHis'));
        [$binId, $binCode] = self::resolveBin($t, $whId, $b['bin'] ?? $b['bin_id'] ?? $b['bin_code'] ?? '');
        try {
            $mid = self::recordMovement($t, ['type' => 'Outbound', 'wh_id' => $whId, 'sku' => $sku, 'name' => $name, 'qty' => $qty, 'ref' => $ref, 'reason' => '스캔출고']);
        } catch (\RuntimeException $e) {
            if (str_starts_with($e->getMessage(), 'insufficient_stock')) return self::json($res, ['ok' => false, 'error' => '재고 부족: 출고 수량이 가용 재고를 초과합니다.', 'code' => 'INSUFFICIENT_STOCK'], 422);
            throw $e;
        }
        if ($binId > 0) self::adjustBinStock($t, $whId, $binId, $sku, $name, -$qty);
        if ($isSerial) { try { self::db()->prepare("UPDATE wms_barcodes SET status='out', updated_at=? WHERE tenant_id=? AND code=?")->execute([self::now(), $t, $code]); } catch (\Throwable $e) {} }
        Db::audit(self::db(), $t, 'wms.scan_out', ['sku' => $sku, 'qty' => $qty, 'wh_id' => $whId, 'bin_id' => $binId, 'serial' => $isSerial]);
        return self::json($res, ['ok' => true, 'sku' => $sku, 'qty' => $qty, 'wh_id' => $whId, 'bin_id' => $binId, 'bin_code' => $binCode, 'movement_id' => $mid]);
    }

    /** POST /wms/putaway — 창고 내 재고를 특정 빈으로 배치/이동(빈 원장만; 창고단위 on_hand 불변 = 무회귀). */
    public static function putAway(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $sku = trim((string)($b['sku'] ?? ''));
        if ($sku === '') return self::json($res, ['ok' => false, 'error' => 'sku가 필요합니다.'], 422);
        $whId = (string)($b['whId'] ?? $b['wh_id'] ?? '');
        if ($whId === '') $whId = self::primaryWarehouse($t);
        if ($err = self::guardWarehouse($req, $res, $whId)) return $err;
        $qty = max(0.0, (float)($b['qty'] ?? 0));
        if ($qty <= 0) return self::json($res, ['ok' => false, 'error' => 'qty가 필요합니다.'], 422);
        $name = (string)($b['name'] ?? '');
        [$toBin, $toCode] = self::resolveBin($t, $whId, $b['bin'] ?? $b['to_bin'] ?? $b['bin_code'] ?? '');
        if ($toBin <= 0) return self::json($res, ['ok' => false, 'error' => '대상 로케이션을 찾을 수 없습니다.', 'code' => 'BIN_NOT_FOUND'], 422);
        [$fromBin] = self::resolveBin($t, $whId, $b['from_bin'] ?? $b['fromBin'] ?? '');
        if ($fromBin > 0) self::adjustBinStock($t, $whId, $fromBin, $sku, $name, -$qty); // 빈→빈 이동
        self::adjustBinStock($t, $whId, $toBin, $sku, $name, $qty);
        return self::json($res, ['ok' => true, 'sku' => $sku, 'qty' => $qty, 'wh_id' => $whId, 'to_bin' => $toBin, 'to_bin_code' => $toCode, 'from_bin' => $fromBin]);
    }

    /* ── 웨이브/존 피킹 ── */

    /** 특정 창고·SKU 의 pick-path 최우선 빈(zone·seq) — 없으면 [0,'','']. */
    private static function pickBinForSku(string $t, string $whId, string $sku): array
    {
        try {
            $st = self::db()->prepare("SELECT b.id, b.code, b.zone, b.seq FROM wms_bin_stock bs
                                       JOIN wms_bins b ON b.id=bs.bin_id AND b.tenant_id=bs.tenant_id
                                       WHERE bs.tenant_id=? AND bs.sku=? AND bs.on_hand>0 AND (bs.wh_id=? OR ?='')
                                       ORDER BY b.zone, b.seq, b.slot LIMIT 1");
            $st->execute([$t, $sku, $whId, $whId]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if ($r) return [(int)$r['id'], (string)$r['code'], (string)($r['zone'] ?? ''), (int)($r['seq'] ?? 0)];
        } catch (\Throwable $e) {}
        return [0, '', '', 0];
    }

    /** GET /wms/waves — 웨이브 목록 + 항목(pick-path 순). */
    public static function listWaves(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $pdo = self::db();
        $st = $pdo->prepare("SELECT * FROM wms_waves WHERE tenant_id=:t ORDER BY id DESC LIMIT 200");
        $st->execute([':t' => $t]);
        $waves = $st->fetchAll(\PDO::FETCH_ASSOC);
        $iq = $pdo->prepare("SELECT * FROM wms_wave_items WHERE tenant_id=:t AND wave_id=:w ORDER BY zone, seq, id");
        foreach ($waves as &$w) { $iq->execute([':t' => $t, ':w' => (int)$w['id']]); $w['items'] = $iq->fetchAll(\PDO::FETCH_ASSOC); }
        return self::json($res, ['ok' => true, 'waves' => $waves]);
    }

    /**
     * POST /wms/waves — 주문 배치로 웨이브 생성. order_refs[] 지정 시 그 피킹 행만, 미지정 시 창고의 pending 피킹 자동 수집.
     *   각 라인 → wave_item(빈 로케이션·zone·pick-path seq 매핑). 원 피킹 status→'waved'(중복 웨이브 방지). zone 그룹핑.
     */
    public static function createWave(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $now = self::now(); $pdo = self::db();
        $whId = (string)($b['whId'] ?? $b['wh_id'] ?? '');
        if ($err = self::guardWarehouse($req, $res, $whId)) return $err;
        $zoneFilter = trim((string)($b['zone'] ?? ''));
        $orderRefs = array_values(array_filter(array_map('strval', (array)($b['order_refs'] ?? $b['orderRefs'] ?? [])), fn($r) => $r !== ''));
        // 후보 피킹 수집(pending·미웨이브). order_refs 지정 시 그 주문만.
        $sql = "SELECT id, order_ref, sku, name, qty, wh_id FROM wms_picking WHERE tenant_id=? AND status='pending'";
        $p = [$t];
        if ($whId !== '') { $sql .= " AND wh_id=?"; $p[] = $whId; }
        if ($orderRefs) { $sql .= " AND order_ref IN (" . implode(',', array_fill(0, count($orderRefs), '?')) . ")"; foreach ($orderRefs as $r) $p[] = $r; }
        $sql .= " ORDER BY id ASC LIMIT 500";
        $st = $pdo->prepare($sql); $st->execute($p);
        $picks = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        if (!$picks) return self::json($res, ['ok' => false, 'error' => '웨이브에 담을 대기 피킹이 없습니다.', 'code' => 'NO_PENDING_PICKS'], 422);
        $ownTxn = !$pdo->inTransaction();
        if ($ownTxn) $pdo->beginTransaction();
        try {
            $code = 'WAVE-' . gmdate('YmdHis') . '-' . substr((string)mt_rand(1000, 9999), 0, 4);
            $pdo->prepare("INSERT INTO wms_waves (tenant_id,code,wh_id,zone,status,order_count,item_count,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
                ->execute([$t, $code, $whId, $zoneFilter, 'created', 0, 0, (string)($b['note'] ?? ''), $now, $now]);
            $waveId = (int)$pdo->lastInsertId();
            $ins = $pdo->prepare("INSERT INTO wms_wave_items (tenant_id,wave_id,order_ref,sku,name,qty,picked_qty,wh_id,bin_id,bin_code,zone,seq,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $mark = $pdo->prepare("UPDATE wms_picking SET status='waved', updated_at=? WHERE id=? AND tenant_id=?");
            $orders = []; $items = 0;
            foreach ($picks as $pk) {
                $psku = (string)($pk['sku'] ?? ''); $pwh = (string)($pk['wh_id'] ?? $whId);
                [$binId, $binCode, $zone, $seq] = $psku !== '' ? self::pickBinForSku($t, $pwh, $psku) : [0, '', '', 0];
                if ($zoneFilter !== '' && $zone !== '' && $zone !== $zoneFilter) continue; // zone 그룹핑
                $ins->execute([$t, $waveId, (string)($pk['order_ref'] ?? ''), $psku, (string)($pk['name'] ?? ''), (float)($pk['qty'] ?? 0), 0, $pwh, $binId, $binCode, $zone, $seq, 'pending', $now, $now]);
                $mark->execute([$now, (int)$pk['id'], $t]);
                $orders[(string)($pk['order_ref'] ?? '')] = true; $items++;
            }
            $pdo->prepare("UPDATE wms_waves SET order_count=?, item_count=?, updated_at=? WHERE id=? AND tenant_id=?")
                ->execute([count($orders), $items, $now, $waveId, $t]);
            if ($ownTxn) $pdo->commit();
            return self::json($res, ['ok' => true, 'id' => $waveId, 'code' => $code, 'order_count' => count($orders), 'item_count' => $items]);
        } catch (\Throwable $e) {
            if ($ownTxn && $pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * POST /wms/waves/{id}/confirm — 웨이브 피킹 확정. 각 pending 항목 → Outbound(strict·멱등 ref WAVE-{waveId}-{itemId})
     *   + 빈 재고 차감 + 원 피킹 status→shipped. 재고부족 항목은 status='short'(부분 확정, 나머지 진행). 전량 성공 시 wave='completed'.
     */
    public static function confirmWave(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $pdo = self::db(); $now = self::now();
        $waveId = (int)($args['id'] ?? 0);
        $wq = $pdo->prepare("SELECT id, wh_id, status FROM wms_waves WHERE id=? AND tenant_id=? LIMIT 1");
        $wq->execute([$waveId, $t]);
        $wave = $wq->fetch(\PDO::FETCH_ASSOC);
        if (!$wave) return self::json($res, ['ok' => false, 'error' => '웨이브 없음'], 404);
        if ($err = self::guardWarehouse($req, $res, (string)($wave['wh_id'] ?? ''))) return $err;
        // pending + short(직전 재고부족) 모두 처리 — 재입고 후 재확정 시 short 항목도 재시도(ref 멱등).
        $iq = $pdo->prepare("SELECT * FROM wms_wave_items WHERE wave_id=? AND tenant_id=? AND status IN ('pending','short') ORDER BY zone, seq, id");
        $iq->execute([$waveId, $t]);
        $items = $iq->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $picked = 0; $short = 0;
        $upItem = $pdo->prepare("UPDATE wms_wave_items SET status=?, picked_qty=?, updated_at=? WHERE id=? AND tenant_id=?");
        $upPick = $pdo->prepare("UPDATE wms_picking SET status='shipped', updated_at=? WHERE tenant_id=? AND order_ref=? AND sku=? AND status IN ('waved','pending')");
        // [283차 R2 P2 성능] 항목마다 재고 델타 훅이 발화하면 (항목수 × 채널수) 쿼리가 터진다(LIMIT 500).
        //   확정 구간 동안 SKU 만 모았다가 종료 시 SKU 당 1회만 적재한다 — 최종 on_hand 는 동일하므로 값 무회귀.
        self::beginStockSyncBatch();
        try {
            foreach ($items as $it) {
                $sku = (string)($it['sku'] ?? ''); $qty = (float)($it['qty'] ?? 0); $wh = (string)($it['wh_id'] ?? '');
                if ($sku === '' || $qty <= 0) { $upItem->execute(['picked', 0, $now, (int)$it['id'], $t]); continue; }
                $ref = 'WAVE-' . $waveId . '-' . (int)$it['id'];
                try {
                    self::recordMovement($t, ['type' => 'Outbound', 'wh_id' => $wh, 'sku' => $sku, 'name' => (string)($it['name'] ?? ''), 'qty' => $qty, 'ref' => $ref, 'reason' => '웨이브피킹']);
                    if ((int)($it['bin_id'] ?? 0) > 0) self::adjustBinStock($t, $wh, (int)$it['bin_id'], $sku, (string)($it['name'] ?? ''), -$qty);
                    $upItem->execute(['picked', $qty, $now, (int)$it['id'], $t]);
                    $upPick->execute([$now, $t, (string)($it['order_ref'] ?? ''), $sku]);
                    $picked++;
                } catch (\RuntimeException $e) {
                    if (str_starts_with($e->getMessage(), 'insufficient_stock')) { $upItem->execute(['short', 0, $now, (int)$it['id'], $t]); $short++; continue; }
                    throw $e;
                }
            }
        } finally {
            // 예외로 빠져나가도 배치는 반드시 닫는다(모아둔 SKU 유실·플래그 잔류 방지).
            self::flushStockSyncBatch($t, 'wave_confirm:' . $waveId);
        }
        // 잔여 pending/short 유무로 wave status 판정(멱등 재확정 가능).
        $rem = $pdo->prepare("SELECT COUNT(*) FROM wms_wave_items WHERE wave_id=? AND tenant_id=? AND status IN ('pending','short')");
        $rem->execute([$waveId, $t]);
        $status = ((int)$rem->fetchColumn() === 0) ? 'completed' : 'partial';
        $pdo->prepare("UPDATE wms_waves SET status=?, updated_at=? WHERE id=? AND tenant_id=?")->execute([$status, $now, $waveId, $t]);
        Db::audit($pdo, $t, 'wms.wave_confirm', ['wave_id' => $waveId, 'picked' => $picked, 'short' => $short, 'status' => $status]);
        return self::json($res, ['ok' => true, 'wave_id' => $waveId, 'picked' => $picked, 'short' => $short, 'status' => $status]);
    }

    public static function deleteWave(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $pdo = self::db(); $id = (int)$args['id'];
        // 미확정 웨이브 삭제 시 원 피킹을 pending 으로 복원(재웨이브 가능). 확정분(shipped)은 불변.
        try {
            $its = $pdo->prepare("SELECT order_ref, sku FROM wms_wave_items WHERE wave_id=? AND tenant_id=? AND status IN ('pending','short')");
            $its->execute([$id, $t]);
            $rev = $pdo->prepare("UPDATE wms_picking SET status='pending', updated_at=? WHERE tenant_id=? AND order_ref=? AND sku=? AND status='waved'");
            foreach ($its->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $it) { $rev->execute([self::now(), $t, (string)($it['order_ref'] ?? ''), (string)($it['sku'] ?? '')]); }
        } catch (\Throwable $e) {}
        $pdo->prepare("DELETE FROM wms_wave_items WHERE wave_id=? AND tenant_id=?")->execute([$id, $t]);
        $st = $pdo->prepare("DELETE FROM wms_waves WHERE id=? AND tenant_id=?");
        $st->execute([$id, $t]);
        return self::json($res, ['ok' => true, 'deleted' => $st->rowCount()]);
    }

    /* ═══════════════════════════════════════════════════════════════════════════
       [283차 GAP-1] 재고 델타 → 채널 가용재고 자동 푸시(outbound 루프 폐쇄).

       ★기존 인프라 재사용(신규 큐 신설 금지 원칙): catalog_writeback_job + Catalog::processWritebackQueue.
         operation='stock_sync' 잡을 적재하면 기존 큐 소비 워커(writeback_cron / ChannelCreds 등록훅 /
         수동 플러시)가 그대로 채널 어댑터로 push 한다 — 어댑터 21종을 한 줄도 고치지 않는다.
         ・큐 소비 시 Catalog::currentListing 이 catalog_listing 에서 product 를 복원하므로,
           **여기서 catalog_listing.inventory 를 실물(SSOT)로 갱신**해 두면 그 값이 그대로 전송된다.
         ・cpid(priorChannelProductId) 가 있을 때만 적재 → 어댑터가 '수정(update)' 경로를 타고,
           ChannelContract::preflight 도 update 규칙(sku 만 필수)으로 통과한다(신규등록 오시도 0).

       ★디바운스/합치기: (tenant,channel,sku,'stock_sync') 미완료 잡이 있으면 payload 만 갱신 →
         입고 100건이 연속으로 들어와도 채널당 잡은 최대 1행(큐 폭주 0·멱등).
       ★값 무변화(catalog_listing.inventory == 새 가용수량)면 잡을 만들지 않는다(무의미 전송 0).
       ═══════════════════════════════════════════════════════════════════════════ */

    /** [283차] 채널키 별칭 그룹 — Catalog::channelAliases 와 동일 규약(cred/job/리스팅 표기차 흡수). */
    private static function channelAliasGroup(string $channel): array
    {
        $ch = strtolower(trim($channel));
        foreach ([['amazon', 'amazon_spapi'], ['tiktok_shop', 'tiktok'], ['naver', 'naver_smartstore'], ['11st', 'st11']] as $g) {
            if (in_array($ch, $g, true)) return $g;
        }
        return [$ch];
    }

    /**
     * [283차] 해당 SKU 가 그 채널에 **실제로 등록되어 있는가**(= 채널 상품 id 보유).
     *   Catalog::priorChannelProductId 와 동일한 2개 소스를 본다:
     *     ① 우리 앱이 등록에 성공한 이력(catalog_writeback_job status='done')
     *     ② 채널 동기화로 수집된 상품(channel_products — 셀러가 채널에서 직접 만든 상품 포함)
     *   미등록이면 재고 잡을 만들지 않는다 — 만들면 어댑터가 **신규등록**을 시도해 'leafCategoryId 필요' 같은
     *   엉뚱한 오류를 남긴다(bulkPrice 가 이미 겪은 결함 클래스. 227/277차 주석 참조).
     */
    private static function channelListed(\PDO $pdo, string $tenant, string $channel, string $sku): bool
    {
        $aliases = self::channelAliasGroup($channel);
        $ph = implode(',', array_fill(0, count($aliases), '?'));
        try {
            $st = $pdo->prepare("SELECT 1 FROM catalog_writeback_job WHERE tenant_id=? AND channel IN ($ph) AND sku=? AND status='done' LIMIT 1");
            $st->execute(array_merge([$tenant], $aliases, [$sku]));
            if ($st->fetchColumn()) return true;
        } catch (\Throwable $e) { /* 테이블 부재 → 아래 소스 */ }
        try {
            $st = $pdo->prepare("SELECT 1 FROM channel_products WHERE tenant_id=? AND channel IN ($ph) AND (sku=? OR channel_product_id=?) LIMIT 1");
            $st->execute(array_merge([$tenant], $aliases, [$sku, $sku]));
            if ($st->fetchColumn()) return true;
        } catch (\Throwable $e) { /* 테이블 부재 */ }
        return false;
    }

    /** [283차] 채널별 재고 푸시 정책. 행 없음 = buffer 0 · enabled → 기존 테넌트 무회귀.
     *  ★프로세스 메모 — recordMovement 는 주문 동기화 루프에서 건당 호출되는 hot path 다. 정책은 저빈도 변경이므로
     *    요청/크론 1회 실행 동안만 캐시한다(saveStockPolicy 가 명시적으로 무효화). */
    private static array $policyMemo = [];

    private static function stockPolicies(\PDO $pdo, string $tenant): array
    {
        if (isset(self::$policyMemo[$tenant])) return self::$policyMemo[$tenant];
        $out = [];
        try {
            $st = $pdo->prepare("SELECT channel, safety_buffer, enabled FROM wms_channel_stock_policy WHERE tenant_id=?");
            $st->execute([$tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_ASSOC) ?: [] as $r) {
                $out[strtolower((string)$r['channel'])] = [
                    'buffer'  => max(0.0, (float)($r['safety_buffer'] ?? 0)),
                    'enabled' => ((int)($r['enabled'] ?? 1)) === 1,
                ];
            }
        } catch (\Throwable $e) { /* 정책 미설정 = 기본값 */ }
        self::$policyMemo[$tenant] = $out;
        return $out;
    }

    /**
     * [283차 GAP-1 요구3] 채널 전송용 가용재고 = 실물 on_hand − 채널 안전버퍼(0 하한).
     *   ★채널 전송 수량의 **단일 계산식(SSOT)**. 자동 델타 푸시(enqueueChannelStockSync)와
     *     수동 동기화(Catalog::writeback)가 같은 함수를 써야 두 경로가 서로 다른 재고를 보내지 않는다.
     *   ★정책 미설정 = 버퍼 0 → 종전과 완전히 동일한 수량(무회귀).
     */
    public static function channelAvailable(string $tenant, string $channel, float $onHand): int
    {
        // [283차 R2 P2] ★내림(floor) 단일화 — 종전 catch 폴백만 round() 라, 정책 조회가 실패하는 순간
        //   on_hand=9.6 → 정상경로 9 / 폴백경로 10 으로 **서로 다른 재고**가 채널에 나갔다(자기모순·초과판매 여지).
        //   재고는 항상 보수적으로 내림한다(있는 것보다 많이 팔지 않는다).
        try {
            $pol = self::stockPolicies(self::db(), $tenant);
            $buf = (float)($pol[strtolower(trim($channel))]['buffer'] ?? 0.0);
            return (int)max(0, (int)floor($onHand - $buf));
        } catch (\Throwable $e) { return (int)max(0, (int)floor($onHand)); }
    }

    /* ── [283차 R2 P2 성능] 재고 델타 훅 배치화 ───────────────────────────────────────────
       confirmWave 는 LIMIT 500 항목을 순회하며 항목마다 recordMovement → enqueueChannelStockSync 를 부른다.
       훅 1회당 (wms_stock 합계 + catalog_listing 조회 + 채널당 listing UPDATE·등록확인·잡조회) 쿼리가 붙어
       웨이브 확정 1요청이 수천 쿼리로 불어났다. 같은 SKU 가 여러 주문에 반복 등장하는 것이 웨이브의 본질이므로,
       배치 구간에서는 SKU 를 모아 두었다가 **마지막에 SKU 당 1회**만 적재한다(최종 on_hand 는 어차피 동일 = 값 동일).
       ★비배치 경로(단건 입출고 등)는 종전과 완전히 동일하게 즉시 적재된다(무회귀). */
    private static ?array $stockSyncBatch = null;

    /** 배치 시작 — 이 시점부터 enqueueChannelStockSync 는 SKU 만 모은다(즉시 전송 안 함). */
    public static function beginStockSyncBatch(): void
    {
        if (self::$stockSyncBatch === null) self::$stockSyncBatch = [];
    }

    /** 배치 종료 — 모아둔 SKU 를 중복 제거해 한 번씩 적재한다. @return int 적재 잡 수 */
    public static function flushStockSyncBatch(string $tenant, string $reason = 'batch'): int
    {
        $skus = self::$stockSyncBatch ?? [];
        self::$stockSyncBatch = null;   // 먼저 해제해야 아래 enqueue 가 실제로 동작한다
        $n = 0;
        foreach (array_unique($skus) as $sku) {
            try { $n += self::enqueueChannelStockSync($tenant, (string)$sku, $reason); }
            catch (\Throwable $e) { error_log('[Wms.flushStockSyncBatch] ' . $e->getMessage()); }
        }
        return $n;
    }

    /**
     * [283차 GAP-1 핵심] SKU 의 실물 재고 델타를 등록된 전 채널에 자동 푸시(큐 적재).
     *   recordMovement(단일 chokepoint) 커밋 직후 · 초과판매 감지 시 호출된다.
     *
     *   가용재고 = SUM(wms_stock.on_hand) − 채널 안전버퍼   (0 하한)
     *   ★안전버퍼(safety buffer): 여러 채널이 같은 물리재고를 공유할 때 동시주문으로 인한 초과판매를 막는
     *     유보분. 미설정 시 0 → 종전과 동일 수량이 나간다(무회귀).
     *
     * @return int 적재/갱신된 잡 수(비throw — 실패해도 0)
     */
    public static function enqueueChannelStockSync(string $tenant, string $sku, string $reason = ''): int
    {
        $tenant = trim($tenant); $sku = trim($sku);
        if ($tenant === '' || strtolower($tenant) === 'demo' || $sku === '') return 0;
        // [283차 R2 P2] 배치 구간(웨이브 확정 등)에서는 SKU 만 모으고, 종료 시 SKU 당 1회 적재한다(쿼리 폭주 완화).
        if (self::$stockSyncBatch !== null) { self::$stockSyncBatch[] = $sku; return 0; }
        try {
            $pdo = self::db(); $now = self::now();
            // 실물 SSOT — 전 창고 on_hand 합(창고별 분산은 출고 시 allocationPlan 이 해결).
            $s = $pdo->prepare("SELECT COALESCE(SUM(on_hand),0) FROM wms_stock WHERE tenant_id=? AND sku=?");
            $s->execute([$tenant, $sku]);
            $onHand = (float)$s->fetchColumn();

            // 이 SKU 가 실린 채널 리스팅. 0행 = 채널 미등록 상품 → 푸시 대상 없음(WMS 만 쓰는 테넌트 무영향).
            //   ★catalog_listing 이 존재한다는 것은 Catalog::ensureTables 가 돌았다는 뜻 = catalog_writeback_job 도 존재(불변식).
            $c = $pdo->prepare("SELECT channel, inventory, action FROM catalog_listing WHERE tenant_id=? AND sku=?");
            $c->execute([$tenant, $sku]);
            $rows = $c->fetchAll(\PDO::FETCH_ASSOC) ?: [];
            if (!$rows) return 0;

            $pol = self::stockPolicies($pdo, $tenant);
            $n = 0;
            foreach ($rows as $r) {
                $ch = strtolower(trim((string)($r['channel'] ?? '')));
                if ($ch === '') continue;
                if (in_array((string)($r['action'] ?? ''), ['unregister', 'disconnect'], true)) continue; // 해제된 리스팅
                $p = $pol[$ch] ?? ['buffer' => 0.0, 'enabled' => true];
                if (empty($p['enabled'])) continue;                                   // 채널별 자동푸시 off
                $avail = self::channelAvailable($tenant, $ch, $onHand);                // SSOT 계산식(수동 동기화와 동일)

                // catalog_listing.inventory 를 실물로 정합화 — 큐 소비(currentListing)가 이 값을 채널로 싣는다.
                //   ★Catalog::writeback(:500-507)이 이미 wms_stock 을 SSOT 로 덮어쓰므로 동일 규약(중복 아님·값 일체화).
                $pdo->prepare("UPDATE catalog_listing SET inventory=?, updated_at=? WHERE tenant_id=? AND channel=? AND sku=?")
                    ->execute([$avail, $now, $tenant, (string)$r['channel'], $sku]);

                if (!self::channelListed($pdo, $tenant, $ch, $sku)) continue;          // 채널 미등록 → 신규등록 오시도 방지

                $payload = json_encode([
                    'sku' => $sku, 'inventory' => $avail, 'on_hand' => $onHand,
                    'safety_buffer' => (float)$p['buffer'], 'reason' => $reason, 'source' => 'wms_stock_delta',
                ], JSON_UNESCAPED_UNICODE);

                // 이 (채널,SKU)의 최신 stock_sync 잡 1건으로 ①디바운스 ②중복전송 판정을 함께 내린다.
                $ex = $pdo->prepare("SELECT id, status, payload FROM catalog_writeback_job
                                      WHERE tenant_id=? AND channel=? AND sku=? AND operation='stock_sync'
                                      ORDER BY id DESC LIMIT 1");
                $ex->execute([$tenant, (string)$r['channel'], $sku]);
                $last = $ex->fetch(\PDO::FETCH_ASSOC) ?: null;
                $lastStatus = $last ? (string)($last['status'] ?? '') : '';

                // ① 디바운스/합치기 — 아직 전송되지 않은 잡이 있으면 payload 만 최신값으로 덮는다(1행 유지·멱등).
                //    입고 100건이 연속으로 들어와도 채널당 잡은 최대 1행(큐 폭주 0).
                //    ★[283차 R2] 'pending'(재고 어댑터 미보유로 보류된 잡) 포함 — 빼면 재고가 변할 때마다 **새 행이
                //      계속 INSERT** 되어 보류잡이 무한 증식한다. 여기서 최신 수량으로 덮고 'queued' 로 되살린다
                //      (어댑터가 그 사이 추가됐다면 다음 회차에 즉시 실전송된다).
                if (in_array($lastStatus, ['queued', 'awaiting_credentials', 'pending'], true)) {
                    $pdo->prepare("UPDATE catalog_writeback_job SET payload=?, status='queued', attempt=1, updated_at=? WHERE id=?")
                        ->execute([$payload, $now, (int)$last['id']]);
                    $n++; continue;
                }

                // ② 중복전송 방지 — 판정 기준은 **마지막으로 채널에 실제 전송 성공(done)한 수량**이다.
                //    ★catalog_listing.inventory 로 판정하면 안 된다: 그 값은 바로 위에서 우리가 쓴 로컬값이라,
                //      직전 잡이 failed(채널 미반영)인데도 "변화 없음"으로 오판해 채널이 **영구 stale** 이 된다.
                //      last 가 없거나(최초) failed/pending 이면 값이 같아도 다시 보낸다(자가치유).
                if ($lastStatus === 'done') {
                    $lp = json_decode((string)($last['payload'] ?? ''), true);
                    if (is_array($lp) && array_key_exists('inventory', $lp) && (int)$lp['inventory'] === $avail) continue;
                }

                $pdo->prepare("INSERT INTO catalog_writeback_job(tenant_id,channel,sku,operation,status,attempt,payload,created_at,updated_at)
                               VALUES(?,?,?,'stock_sync','queued',1,?,?,?)")
                    ->execute([$tenant, (string)$r['channel'], $sku, $payload, $now, $now]);
                $n++;
            }
            return $n;
        } catch (\Throwable $e) {
            error_log('[Wms.enqueueChannelStockSync] ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * [283차 GAP-1 요구4] 드리프트 보정 — wms_stock(실물) 과 catalog_listing(채널 가용재고)이 어긋난 SKU×채널을
     *   찾아 재푸시한다. cron(bin/stock_sync_cron.php) 백업 경로.
     *   ・델타 훅이 어떤 이유로든(프로세스 크래시·큐 잡 유실·수동 DB 조작) 누락된 건을 주기적으로 자가치유.
     *   ・enqueueChannelStockSync 를 그대로 재사용 → 정책/디바운스/미등록 가드가 동일하게 적용된다(SSOT).
     * @return array{scanned:int,enqueued:int}
     */
    public static function reconcileChannelStock(string $tenant, int $limit = 500): array
    {
        $out = ['scanned' => 0, 'enqueued' => 0];
        $tenant = trim($tenant);
        if ($tenant === '' || strtolower($tenant) === 'demo') return $out;
        try {
            self::ensureTables();
            $pdo = self::db();
            // 실물 합계 ≠ 채널 리스팅 재고인 SKU 만 추린다(전량 재푸시가 아니라 드리프트 후보만 — 큐/트래픽 절약).
            //   ★안전버퍼가 걸린 채널은 정상 상태에서도 값이 다르다(inventory = on_hand − buffer). 그래서 여기서는
            //     '후보'만 뽑고 최종 판정(버퍼 반영 후 값 동일 → 잡 미생성)은 enqueueChannelStockSync 에 위임한다(SSOT 단일화).
            //   ★수치 비교만 사용(CAST 등 MySQL 전용 함수 배제) → MySQL/SQLite 양쪽 동작.
            $st = $pdo->prepare("SELECT DISTINCT l.sku
                                   FROM catalog_listing l
                                   JOIN (SELECT sku, SUM(on_hand) oh FROM wms_stock WHERE tenant_id=:t1 GROUP BY sku) w
                                     ON w.sku = l.sku
                                  WHERE l.tenant_id=:t2 AND l.sku<>'' AND l.inventory <> w.oh
                                  LIMIT " . max(1, min(2000, $limit)));
            $st->execute([':t1' => $tenant, ':t2' => $tenant]);
            foreach ($st->fetchAll(\PDO::FETCH_COLUMN) ?: [] as $sku) {
                $out['scanned']++;
                $out['enqueued'] += self::enqueueChannelStockSync($tenant, (string)$sku, 'reconcile');
            }
        } catch (\Throwable $e) {
            error_log('[Wms.reconcileChannelStock] ' . $e->getMessage());
        }
        return $out;
    }

    /* ── [283차] 채널 재고정책(안전버퍼/자동푸시) ── */

    /** GET /wms/stock-policy — 채널별 안전버퍼·자동푸시 설정. 미설정 채널은 기본(buffer 0·enabled). */
    public static function listStockPolicy(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $st = self::db()->prepare("SELECT channel, safety_buffer, enabled, updated_at FROM wms_channel_stock_policy WHERE tenant_id=? ORDER BY channel");
        $st->execute([$t]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) {
            $r['safety_buffer'] = (float)$r['safety_buffer'];
            $r['enabled'] = ((int)$r['enabled']) === 1;
        }
        return self::json($res, ['ok' => true, 'policies' => $rows, 'default' => ['safety_buffer' => 0, 'enabled' => true]]);
    }

    /** POST /wms/stock-policy — {channel, safetyBuffer, enabled} upsert(멱등). buffer 0 = 무유보(기본). */
    public static function saveStockPolicy(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $pdo = self::db(); $now = self::now();
        $ch = strtolower(trim((string)($b['channel'] ?? '')));
        if ($ch === '') return self::json($res, ['ok' => false, 'error' => 'channel이 필요합니다.'], 422);
        $buf = max(0.0, (float)($b['safetyBuffer'] ?? $b['safety_buffer'] ?? 0));
        $en  = array_key_exists('enabled', $b) ? (!empty($b['enabled']) ? 1 : 0) : 1;
        $ex = $pdo->prepare("SELECT id FROM wms_channel_stock_policy WHERE tenant_id=? AND channel=? LIMIT 1");
        $ex->execute([$t, $ch]);
        $id = $ex->fetchColumn();
        if ($id !== false && $id !== null) {
            $pdo->prepare("UPDATE wms_channel_stock_policy SET safety_buffer=?, enabled=?, updated_at=? WHERE id=?")
                ->execute([$buf, $en, $now, (int)$id]);
        } else {
            $pdo->prepare("INSERT INTO wms_channel_stock_policy (tenant_id,channel,safety_buffer,enabled,updated_at) VALUES (?,?,?,?,?)")
                ->execute([$t, $ch, $buf, $en, $now]);
        }
        unset(self::$policyMemo[$t]); // 프로세스 메모 무효화 — 아래 재푸시가 방금 저장한 정책을 읽어야 한다.
        // 정책 변경은 곧 가용재고 변경 → 해당 채널 리스팅 SKU 를 즉시 재푸시(값 일체화).
        $enq = 0;
        try {
            $sk = $pdo->prepare("SELECT DISTINCT sku FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku<>'' LIMIT 500");
            $sk->execute([$t, $ch]);
            foreach ($sk->fetchAll(\PDO::FETCH_COLUMN) ?: [] as $sku) { $enq += self::enqueueChannelStockSync($t, (string)$sku, 'policy_change'); }
        } catch (\Throwable $e) {}
        Db::audit($pdo, $t, 'wms.stock_policy', ['channel' => $ch, 'safety_buffer' => $buf, 'enabled' => $en, 'requeued' => $enq]);
        return self::json($res, ['ok' => true, 'channel' => $ch, 'safety_buffer' => $buf, 'enabled' => (bool)$en, 'requeued' => $enq]);
    }

    /** GET /wms/oversell — 초과판매 경고 원장(신규순). 종전엔 error_log 뿐이라 집계 불가였다. */
    public static function listOversell(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $q = $req->getQueryParams();
        $sql = "SELECT * FROM wms_oversell_alert WHERE tenant_id=:t";
        $p = [':t' => $t];
        if (!empty($q['status'])) { $sql .= " AND status=:s"; $p[':s'] = (string)$q['status']; }
        $sql .= " ORDER BY id DESC LIMIT 300";
        $st = self::db()->prepare($sql); $st->execute($p);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $open = 0;
        foreach ($rows as $r) { if ((string)($r['status'] ?? '') === 'open') $open++; }
        return self::json($res, ['ok' => true, 'alerts' => $rows, 'summary' => ['total' => count($rows), 'open' => $open]]);
    }

    /* ── [283차 GAP-2] 채널 발송처리(송장 전송) 운영 API ── */

    /** GET /wms/shipments — 채널 발송처리 큐(전송 결과·honest pending 사유 포함). */
    public static function listShipmentJobs(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req);
        $jobs = ChannelSync::listShipmentJobs(self::db(), $t, (int)($req->getQueryParams()['limit'] ?? 200));
        $sum = ['queued' => 0, 'done' => 0, 'pending' => 0, 'failed' => 0, 'awaiting_credentials' => 0];
        foreach ($jobs as $j) { $k = (string)$j['status']; if (isset($sum[$k])) $sum[$k]++; }
        return self::json($res, ['ok' => true, 'shipments' => $jobs, 'summary' => $sum, 'live_channels' => ChannelSync::shipLiveChannels()]);
    }

    /**
     * POST /wms/shipments — 수동 발송처리(송장 전송) 등록 + 즉시 전송 시도.
     *   body: {orderRef | channel + orderId, carrier, trackingNo, sku?}
     *   ★채널 어댑터가 없는 채널은 honest pending 으로 남는다(가짜 성공 반환 금지).
     */
    public static function createShipment(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $tracking = trim((string)($b['trackingNo'] ?? $b['tracking_no'] ?? ''));
        if ($tracking === '') return self::json($res, ['ok' => false, 'error' => '송장번호(trackingNo)가 필요합니다.', 'code' => 'TRACKING_REQUIRED'], 422);
        $jid = ChannelSync::enqueueShipment($t, [
            'order_ref'        => (string)($b['orderRef'] ?? $b['order_ref'] ?? ''),
            'channel'          => (string)($b['channel'] ?? ''),
            'channel_order_id' => (string)($b['orderId'] ?? $b['order_id'] ?? $b['channel_order_id'] ?? ''),
            'sku'              => (string)($b['sku'] ?? ''),
            'carrier'          => (string)($b['carrier'] ?? ''),
            'tracking_no'      => $tracking,
        ]);
        if ($jid <= 0) {
            return self::json($res, ['ok' => false, 'code' => 'ORDER_NOT_RESOLVED',
                'error' => '채널 주문을 찾을 수 없습니다 — orderRef 가 채널 주문번호와 일치하는지 확인하세요(자체몰/오프라인 출고는 발송처리 대상이 아닙니다).'], 422);
        }
        $sum = ChannelSync::processShipmentQueue(self::db(), $t, null, 20); // 즉시 1회 소비 → 채널의 진짜 응답 반환
        $jobs = ChannelSync::listShipmentJobs(self::db(), $t, 50);
        $mine = null;
        foreach ($jobs as $j) { if ((int)$j['id'] === $jid) { $mine = $j; break; } }
        return self::json($res, ['ok' => true, 'id' => $jid, 'job' => $mine, 'summary' => $sum]);
    }

    /** POST /wms/shipments/process — 발송처리 큐 수동 플러시(cron 과 동일 코어). */
    public static function processShipments(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePlan($req, $res, 'pro')) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req);
        $ch = trim((string)($b['channel'] ?? ''));
        $sum = ChannelSync::processShipmentQueue(self::db(), $t, $ch !== '' ? strtolower($ch) : null, 100);
        return self::json($res, ['ok' => true, 'summary' => $sum]);
    }

    /* ── 공통 유틸 ── */
    private static function exists(string $tbl, int $id, string $tenant): bool
    {
        $st = self::db()->prepare("SELECT 1 FROM {$tbl} WHERE id=:id AND tenant_id=:t");
        $st->execute([':id' => $id, ':t' => $tenant]);
        return (bool)$st->fetchColumn();
    }
}
