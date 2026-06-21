<?php
declare(strict_types=1);

namespace Genie;

use PDO;

/**
 * Db ??MySQL 5.x PDO singleton
 *
 * ?ê²½ ë³???(Linux ?ë² /etc/environment ?ë PHP-FPM pool config ???¤ì ):
 *   GENIE_DB_HOST   (ê¸°ë³¸: 127.0.0.1)
 *   GENIE_DB_PORT   (ê¸°ë³¸: 3306)
 *   GENIE_DB_NAME   (ê¸°ë³¸: genie_roi)
 *   GENIE_DB_USER   (ê¸°ë³¸: root)
 *   GENIE_DB_PASS   (ê¸°ë³¸: ë¹ì´?ì)
 */
final class Db
{
    private static ?PDO $pdoProd = null;
    private static ?PDO $pdoDemo = null;

    /**
     * 하위 호환 진입점 — GENIE_ENV 에 따라 운영/데모 PDO 반환.
     * 기존 호출처 (Db::pdo()) 비파괴: GENIE_ENV 미설정 시 production 기본 → 종전 동작 유지.
     */
    public static function pdo(): PDO
    {
        return self::env() === 'demo' ? self::pdoDemo() : self::pdoProd();
    }

    /**
     * 명시적 환경 지정 PDO. Handler 가 환경/tenant 종류 cross-check 후 호출.
     */
    public static function pdoFor(bool $isDemo): PDO
    {
        return $isDemo ? self::pdoDemo() : self::pdoProd();
    }

    /**
     * 환경 식별. 미설정 시 'production' (안전 측 기본).
     */
    public static function env(): string
    {
        self::loadEnvFile();
        $env = getenv('GENIE_ENV');
        return $env === 'demo' ? 'demo' : 'production';
    }

    private static function pdoProd(): PDO
    {
        if (self::$pdoProd instanceof PDO) return self::$pdoProd;
        $dbname = getenv('GENIE_DB_NAME') ?: 'geniego_roi';
        self::$pdoProd = self::buildPdo($dbname);
        return self::$pdoProd;
    }

    private static function pdoDemo(): PDO
    {
        if (self::$pdoDemo instanceof PDO) return self::$pdoDemo;
        $prodName = getenv('GENIE_DB_NAME') ?: 'geniego_roi';
        $explicit = (string)(getenv('GENIE_DEMO_DB_NAME') ?: '');
        $dbname = $explicit !== '' ? $explicit : $prodName;
        // [현 차수] ★P0 오염차단 코드 가드(방어선 4 강제): GENIE_DEMO_DB_NAME 미설정 시 운영 DB명으로
        //   폴백하면 데모 트래픽이 운영 DB(geniego_roi)를 직접 오염시킨다(환경변수 1줄 누락 = 운영 사고).
        //   데모 DB명이 운영 DB명과 동일하고 '_demo' 접미가 없으면, 코드 레벨에서 '_demo' 를 강제해
        //   물리 분리를 보장한다(운영명이 이미 '_demo'면 데모 백엔드이므로 그대로 사용).
        if ($dbname === $prodName && substr($prodName, -5) !== '_demo') {
            $dbname = $prodName . '_demo';
            error_log("[Db] demo DB name fell back to prod DB ($prodName); forcing '$dbname' to prevent contamination. Set GENIE_DEMO_DB_NAME explicitly.");
        }
        self::$pdoDemo = self::buildPdo($dbname);
        return self::$pdoDemo;
    }

    /**
     * .env 파일 직접 파싱 — PHP-FPM 등이 환경변수 전달하지 않는 환경 대응.
     * 멱등 (이미 putenv 된 키는 덮어쓰지 않음).
     */
    private static function loadEnvFile(): void
    {
        static $loaded = false;
        if ($loaded) return;
        $loaded = true;
        $envFile = __DIR__ . '/../../.env';
        if (!file_exists($envFile)) return;
        foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#') continue;
            if (strpos($line, '=') === false) continue;
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k); $v = trim($v);
            if ($k !== '' && getenv($k) === false) {
                putenv("$k=$v");
            }
        }
    }

    /**
     * 실 PDO 생성 — dbname 만 인자로 받고 나머지 (host/port/user/pass) 는 기존 env 그대로.
     * 종전 pdo() 의 연결/SQLite 폴백/migration 로직을 그대로 보존.
     */
    private static function buildPdo(string $name): PDO
    {
        self::loadEnvFile();

        $host = getenv('GENIE_DB_HOST') ?: '127.0.0.1';
        $port = getenv('GENIE_DB_PORT') ?: '3306';
        $user = getenv('GENIE_DB_USER') ?: 'root';
        $pass = getenv('GENIE_DB_PASS') ?: '';

        try {
            $pdo = new PDO(
                "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
                $user, $pass,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND =>
                        "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+00:00'",
                ]
            );
        } catch (\PDOException $e) {
            // MySQL 연결 실패 → SQLite 폴백 (/tmp 디렉토리 사용 — 서버 쓰기 권한 보장)
            $tmpDir  = sys_get_temp_dir();
            // 환경별 분리된 SQLite 파일 (prod/demo 동시 사용 시 충돌 방지)
            $dbPath  = $tmpDir . '/genie_roi_' . $name . '.sqlite';

            $dataPath = __DIR__ . '/../../data/genie_' . $name . '.sqlite';
            if (is_writable(dirname($dataPath)) || @mkdir(dirname($dataPath), 0775, true)) {
                $dbPath = $dataPath;
            }

            error_log('[Genie DB] MySQL connect failed for db=' . $name . ' (' . $e->getMessage() . '), fallback → SQLite: ' . $dbPath);

            $pdo = new PDO('sqlite:' . $dbPath, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
        }

        // ENTERPRISE OPTIMIZATION: 100+ DDLs 매 요청 실행 회피, DB 이름별 lock 으로 분리.
        // [P0 멱등화] 스키마 변경(ingest dedup_key + UNIQUE) 강제 재실행 위해 락 버전 bump v424→v425.
        $migrationLock = sys_get_temp_dir() . '/genie_roi_v425_migrated_' . $name . '.lock';
        if (!file_exists($migrationLock)) {
            self::migrate($pdo);
            @file_put_contents($migrationLock, date('Y-m-d H:i:s'));
        }

        return $pdo;
    }

    private static function isMySQL(PDO $pdo): bool
    {
        return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
    }

    /**
     * MySQL DDL ??SQLite ?ë ë³????¬í¼
     * SQLite ëª¨ë?ì??MySQL ?ì© êµ¬ë¬¸???? ?ê³  ???ì ?ê·?í©?ë¤.
     */
    private static function sql(PDO $pdo, string $ddl): string
    {
        // MySQL/MariaDB 모드에서도 DDL 내 인라인 주석(-- ...) 제거
        // normalized_activity_event 등 DDL에 포함된 -- 주석이 MariaDB 파싱 오류 유발
        $ddl = preg_replace('/--[^\n]*\n/', "\n", $ddl);
        $ddl = preg_replace('/--[^\n]*$/', '', $ddl);
        // MySQL COMMENT 키워드 제거 (SQLite는 COMMENT 미지원)
        $ddl = preg_replace("/COMMENT\s+'[^']*'/i", '', $ddl);

        if (self::isMySQL($pdo)) return $ddl;

        // SQLite conversion: remove MySQL-specific keywords/types
        $ddl = preg_replace('/\bINT AUTO_INCREMENT PRIMARY KEY\b/', 'INTEGER PRIMARY KEY AUTOINCREMENT', $ddl);
        $ddl = preg_replace('/\bTINYINT\(\d+\)\b/', 'INTEGER', $ddl);
        $ddl = preg_replace('/\bDOUBLE\b/', 'REAL', $ddl);
        $ddl = preg_replace('/\bMEDIUMTEXT\b/', 'TEXT', $ddl);
        $ddl = preg_replace('/\bVARCHAR\(\d+\)\b/', 'TEXT', $ddl);
        $ddl = preg_replace('/\) ENGINE=InnoDB[^;]*/s', ')', $ddl);
        $ddl = preg_replace('/\bDEFAULT CHARSET=utf8mb4[^\s,)]*/', '', $ddl);
        $ddl = preg_replace('/\bCOLLATE=utf8mb4_unicode_ci\b/', '', $ddl);

        // Remove inline SQL comments (-- comment)
        $ddl = preg_replace('/--[^\n]*\n/', "\n", $ddl);

        // Remove UNIQUE KEY / KEY table-level declarations (support nested parens like raw_value(191))
        $ddl = preg_replace('/,\s*UNIQUE KEY\s+\w+\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/i', '', $ddl);
        $ddl = preg_replace('/,\s*KEY\s+\w+\s*\([^)]*(?:\([^)]*\)[^)]*)*\)/i', '', $ddl);

        // Remove CONSTRAINT ... FOREIGN KEY ... REFERENCES ... (line-by-line filter)
        $lines = explode("\n", $ddl);
        $filtered = [];
        $skipping = false;
        foreach ($lines as $line) {
            $trimmed = ltrim($line);
            // Remove leading comma for detection
            $noComma = ltrim($trimmed, ',');
            $noComma = ltrim($noComma);

            // Start skipping on CONSTRAINT or FOREIGN KEY line
            if (preg_match('/^CONSTRAINT\s+\w+/i', $noComma)
                || preg_match('/^FOREIGN\s+KEY/i', $noComma)) {
                $skipping = true;
                continue;
            }
            if ($skipping) {
                // ON DELETE CASCADE is the last line of most FK defs
                if (preg_match('/\bON\s+DELETE\b/i', $trimmed)
                    || preg_match('/\bON\s+UPDATE\b/i', $trimmed)
                    || preg_match('/^REFERENCES\s+/i', $noComma)) {
                    // stop skipping after this line
                    if (preg_match('/\bON\s+DELETE\b/i', $trimmed) || preg_match('/\bON\s+UPDATE\b/i', $trimmed)) {
                        $skipping = false;
                    }
                }
                continue;
            }
            // Skip bare REFERENCES lines
            if (preg_match('/^REFERENCES\s+\w+/i', $noComma)) {
                continue;
            }
            $filtered[] = $line;
        }
        $ddl = implode("\n", $filtered);



        // Remove partial index key lengths (e.g. email(191) -> email)
        $ddl = preg_replace('/(\w+)\(\d+\)/', '$1', $ddl);

        // Clean trailing comma before closing paren
        $ddl = preg_replace('/,\s*\)/', ')', $ddl);

        return $ddl;
    }

    /**
     * CREATE INDEX ??MySQL 5.x ?ë IF NOT EXISTS ê°? ?ì¼ë¯?ë¡?     * "Duplicate key name" ?¤ë¥(1061)ë¥?ë¬´ì?ì¬ ë§ì´ê·¸ë ?´ì ?¬ì¤??ì§???     * SQLite ?ì??IF NOT EXISTS ì§ì  ì§???
     */
    /**
     * [P0 멱등화] ingest 집계 테이블 중복적재 영구차단 — INSERT-only 재수집 시 광고비/매출/전환 중복합산 결함 수정.
     *   1) dedup_key(자연키 sha256) 컬럼 보강(additive)  2) 기존행 백필(포터블 PHP 해시)
     *   3) 동일 dedup_key 최신행만 보존(역사적 중복 제거)  4) UNIQUE 인덱스(향후 INSERT 차단, 앱 upsert 와 이중방어)
     *   MySQL/SQLite 공통. 전부 try/catch 흡수 — 부분 실패가 migrate() 전체를 깨지 않게 fail-soft.
     */
    private static function dedupAggTable(PDO $pdo, string $table, array $keyCols): void
    {
        try { $pdo->exec("ALTER TABLE {$table} ADD COLUMN dedup_key VARCHAR(64) NULL"); } catch (\Throwable $e) { /* 이미 존재 */ }
        try {
            $cols = implode(',', $keyCols);
            $rows = $pdo->query("SELECT id, {$cols} FROM {$table} WHERE dedup_key IS NULL")->fetchAll(PDO::FETCH_ASSOC);
            if ($rows) {
                $upd = $pdo->prepare("UPDATE {$table} SET dedup_key=? WHERE id=?");
                foreach ($rows as $row) {
                    $parts = [];
                    foreach ($keyCols as $c) $parts[] = (string)($row[$c] ?? '');
                    $dk = substr(hash('sha256', implode('|', $parts)), 0, 40);
                    $upd->execute([$dk, $row['id']]);
                }
            }
        } catch (\Throwable $e) { /* 백필 실패 시 다음 단계 스킵되도록 진행 */ }
        // 역사적 중복 제거: 동일 dedup_key 는 최신(MAX id) 1행만 보존(=upsert 의미와 정합).
        try {
            $pdo->exec("DELETE FROM {$table} WHERE dedup_key IS NOT NULL AND id NOT IN (SELECT keep FROM (SELECT MAX(id) AS keep FROM {$table} WHERE dedup_key IS NOT NULL GROUP BY dedup_key) t)");
        } catch (\Throwable $e) {}
        self::idx($pdo, "CREATE UNIQUE INDEX uq_{$table}_dedup ON {$table}(dedup_key)");
    }

    private static function idx(PDO $pdo, string $sql): void
    {
        if (!self::isMySQL($pdo)) {
            // SQLite: IF NOT EXISTS ì§???            $sql = preg_replace('/^CREATE INDEX\s/', 'CREATE INDEX IF NOT EXISTS ', $sql);
            $sql = preg_replace('/^CREATE UNIQUE INDEX\s/', 'CREATE UNIQUE INDEX IF NOT EXISTS ', $sql);
            try { $pdo->exec($sql); } catch (\PDOException $e) { /* ignore */ }
            return;
        }
        try {
            $pdo->exec($sql);
        } catch (\PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate key name') === false
                && $e->getCode() !== '42000') {
                throw $e;
            }
        }
    }

    /**
     * 전역 KV 스토어 app_setting 존재 보장 (SSOT, 단일 정의).
     * 락게이트 migrate() 를 우회해 어디서든 1회 호출로 존재 보장한다.
     * 종전 OAuth/UserAuth/GdprConsent 등에 분산되어 있던 동일 DDL 을 본 메서드로 일원화.
     * PDO(=DB)별 멱등 메모 → prod/demo 동일 워커에서도 각 DB 에 정확히 보장.
     */
    public static function ensureAppSetting(PDO $pdo): void
    {
        static $done = [];
        $oid = spl_object_id($pdo);
        if (isset($done[$oid])) return;
        try {
            if (self::isMySQL($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS app_setting (skey VARCHAR(64) PRIMARY KEY, svalue TEXT, updated_at VARCHAR(32))");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS app_setting (skey TEXT PRIMARY KEY, svalue TEXT, updated_at TEXT)");
            }
            $done[$oid] = true;
        } catch (\Throwable $e) { /* idempotent: 이미 존재 등 무시 */ }
    }

    /**
     * 쿠폰 코어 테이블 free_coupons / coupon_redemptions 존재 보장 (SSOT, 단일 정의).
     * 종전 CouponEngine / UserAdmin 에 분산되어 있던 동일 컬럼 DDL 을 본 메서드로 일원화.
     * 컬럼 집합은 양측 정의의 상위집합(인덱스 포함). plan 기본값은 'starter'(발급 시 항상 명시되어 무영향).
     * 락게이트 migrate() 를 우회해 어디서든 1회 호출로 존재 보장. PDO(=DB)별 멱등 메모.
     * 주: coupon_rules(+기본규칙 시드)는 CouponEngine 도메인 로직이라 본 메서드 범위 밖.
     */
    public static function ensureCouponTables(PDO $pdo): void
    {
        static $done = [];
        $oid = spl_object_id($pdo);
        if (isset($done[$oid])) return;
        try {
            if (self::isMySQL($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS free_coupons (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE, plan VARCHAR(30) NOT NULL DEFAULT 'starter', duration_days INT NOT NULL DEFAULT 30, max_uses INT NOT NULL DEFAULT 1, use_count INT NOT NULL DEFAULT 0, issued_to_user_id BIGINT UNSIGNED NULL, issued_to_email VARCHAR(255) NULL, issued_by BIGINT UNSIGNED NOT NULL DEFAULT 0, note TEXT NULL, is_revoked TINYINT(1) NOT NULL DEFAULT 0, redeemed_at DATETIME NULL, redeemed_by_user_id BIGINT UNSIGNED NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_code(code), INDEX idx_issued_to(issued_to_user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_redemptions (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, coupon_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL, plan VARCHAR(30) NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_coupon_user (coupon_id, user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS free_coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'starter', duration_days INTEGER NOT NULL DEFAULT 30, max_uses INTEGER NOT NULL DEFAULT 1, use_count INTEGER NOT NULL DEFAULT 0, issued_to_user_id INTEGER NULL, issued_to_email TEXT NULL, issued_by INTEGER NOT NULL DEFAULT 0, note TEXT NULL, is_revoked INTEGER NOT NULL DEFAULT 0, redeemed_at TEXT NULL, redeemed_by_user_id INTEGER NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))");
                $pdo->exec("CREATE TABLE IF NOT EXISTS coupon_redemptions (id INTEGER PRIMARY KEY AUTOINCREMENT, coupon_id INTEGER NOT NULL, user_id INTEGER NOT NULL, plan TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(coupon_id, user_id))");
            }
            $done[$oid] = true;
        } catch (\Throwable $e) { /* idempotent: 이미 존재 등 무시 */ }
    }

    /**
     * AI 설정 테이블 ai_settings 존재 보장 (SSOT, 단일 정의).
     * 종전 ClaudeAI / AiGenerate 에 분산되어 있던 동일 컬럼 DDL 을 본 메서드로 일원화.
     * 컬럼 집합 동일, 상위집합(model 기본값·tenant 유니크 포함). PDO 별 멱등.
     */
    public static function ensureAiSettings(PDO $pdo): void
    {
        static $done = [];
        $oid = spl_object_id($pdo);
        if (isset($done[$oid])) return;
        try {
            if (self::isMySQL($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS ai_settings (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL, provider VARCHAR(32) DEFAULT 'claude', api_key TEXT, model VARCHAR(64) DEFAULT 'claude-3-5-haiku-20241022', is_active TINYINT(1) DEFAULT 1, updated_at VARCHAR(40), UNIQUE KEY uq_ai_tenant (tenant_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS ai_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, provider TEXT DEFAULT 'claude', api_key TEXT, model TEXT DEFAULT 'claude-3-5-haiku-20241022', is_active INTEGER DEFAULT 1, updated_at TEXT, UNIQUE(tenant_id))");
            }
            $done[$oid] = true;
        } catch (\Throwable $e) { /* idempotent: 이미 존재 등 무시 */ }
    }

    /**
     * 발주 테이블 wms_supply_orders 존재 보장 (SSOT, 단일 정의).
     * 종전 Wms(소유) / DemandForecast 에 분산되어 있던 동일 컬럼 DDL 을 본 메서드로 일원화(Wms 정의 기준). PDO 별 멱등.
     */
    public static function ensureWmsSupplyOrders(PDO $pdo): void
    {
        static $done = [];
        $oid = spl_object_id($pdo);
        if (isset($done[$oid])) return;
        try {
            if (self::isMySQL($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS wms_supply_orders (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo', sku VARCHAR(120), name VARCHAR(255), qty DOUBLE DEFAULT 0, supplier VARCHAR(200), wh_id VARCHAR(60), status VARCHAR(40) DEFAULT 'pending', eta VARCHAR(32), created_at VARCHAR(32), updated_at VARCHAR(32), KEY idx_wms_so_tenant (tenant_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS wms_supply_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', sku TEXT, name TEXT, qty REAL DEFAULT 0, supplier TEXT, wh_id TEXT, status TEXT DEFAULT 'pending', eta TEXT, created_at TEXT, updated_at TEXT)");
            }
            $done[$oid] = true;
        } catch (\Throwable $e) { /* idempotent: 이미 존재 등 무시 */ }
    }

    /**
     * 채널 주문 테이블 channel_orders 존재 보장 (SSOT, 단일 정의).
     * 종전 ChannelSync(소유) / LiveCommerce 에 분산되어 있던 동일 컬럼 DDL 을 본 메서드로 일원화.
     * MySQL 은 키 컬럼만 VARCHAR(190)(유니크 제약 요건), 비키 텍스트는 TEXT(truncation 회피, ChannelSync 방식). PDO 별 멱등.
     */
    public static function ensureChannelOrders(PDO $pdo): void
    {
        static $done = [];
        $oid = spl_object_id($pdo);
        if (isset($done[$oid])) return;
        try {
            if (self::isMySQL($pdo)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS channel_orders (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(190) NOT NULL DEFAULT 'demo', channel VARCHAR(190) NOT NULL, channel_order_id VARCHAR(190), order_no TEXT, buyer_name TEXT, buyer_email TEXT, product_name TEXT, sku VARCHAR(190), qty INT DEFAULT 1, unit_price DOUBLE DEFAULT 0, total_price DOUBLE DEFAULT 0, status VARCHAR(40) DEFAULT 'pending', carrier TEXT, tracking_no TEXT, addr TEXT, ordered_at VARCHAR(32), event_type VARCHAR(40) DEFAULT 'order', raw_json TEXT, synced_at VARCHAR(32), UNIQUE KEY uq_co (tenant_id, channel, channel_order_id), KEY idx_co_tenant (tenant_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS channel_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', channel TEXT NOT NULL, channel_order_id TEXT, order_no TEXT, buyer_name TEXT, buyer_email TEXT, product_name TEXT, sku TEXT, qty INTEGER DEFAULT 1, unit_price REAL DEFAULT 0, total_price REAL DEFAULT 0, status TEXT DEFAULT 'pending', carrier TEXT, tracking_no TEXT, addr TEXT, ordered_at TEXT, event_type TEXT DEFAULT 'order', raw_json TEXT, synced_at TEXT, UNIQUE(tenant_id, channel, channel_order_id))");
            }
            $done[$oid] = true;
        } catch (\Throwable $e) { /* idempotent: 이미 존재 등 무시 */ }
    }

    /**
     * 감사 로그 1행 기록 (SSOT, best-effort·fail-safe).
     * 종전 핸들러별로 제각각 흩어진 audit_log INSERT 의 표준 진입점.
     * ★실패해도 호출측 작업에 절대 영향 없음(감사는 부가 기능). audit_log 는 core 테이블(migrate).
     */
    public static function audit(PDO $pdo, string $actor, string $action, array $details = []): void
    {
        try {
            $pdo->prepare("INSERT INTO audit_log(actor,action,details_json,created_at) VALUES(?,?,?,?)")
                ->execute([$actor, $action, json_encode($details, JSON_UNESCAPED_UNICODE), gmdate('c')]);
        } catch (\Throwable $e) { /* 감사 실패는 본 작업에 영향 없음 */ }
    }

    private static function migrate(PDO $pdo): void
    {
        // 신규 DB: 전역 KV 스토어를 중앙에서 보장 (락 보유 기존 DB 는 ensureAppSetting 호출자가 보장)
        self::ensureAppSetting($pdo);

        // ???? ê¸°ë³¸ ?ì¤???ì´ë¸???????????????????????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS risk_model_registry (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            model_name   VARCHAR(255) NOT NULL,
            model_version VARCHAR(100) NOT NULL,
            is_deployed  TINYINT(1) NOT NULL DEFAULT 0,
            metrics_json MEDIUMTEXT,
            training_range_json MEDIUMTEXT,
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS risk_prediction (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id    VARCHAR(100) NOT NULL,
            entity_type  VARCHAR(100) NOT NULL,
            entity_id    VARCHAR(255) NOT NULL,
            model_version VARCHAR(100) NOT NULL,
            probability  DOUBLE NOT NULL,
            drivers_json MEDIUMTEXT,
            predicted_at VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS connector_health (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id        VARCHAR(100) NOT NULL,
            connector        VARCHAR(100) NOT NULL,
            status           VARCHAR(50) NOT NULL,
            last_run_at      VARCHAR(32),
            failed_runs_24h  INT NOT NULL DEFAULT 0,
            details_json     MEDIUMTEXT,
            created_at       VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS ingestion_run_log (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id     VARCHAR(100) NOT NULL,
            connector     VARCHAR(100) NOT NULL,
            status        VARCHAR(50) NOT NULL,
            started_at    VARCHAR(32),
            ended_at      VARCHAR(32),
            rows_ingested INT DEFAULT 0,
            error         TEXT,
            created_at    VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS billing_plan (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            code        VARCHAR(100) NOT NULL,
            name        VARCHAR(255) NOT NULL,
            limits_json MEDIUMTEXT,
            is_active   TINYINT(1) NOT NULL DEFAULT 1,
            created_at  VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS tenant_subscription (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id  VARCHAR(100) NOT NULL,
            plan_code  VARCHAR(100) NOT NULL,
            status     VARCHAR(50) NOT NULL DEFAULT 'active',
            started_at VARCHAR(32) NOT NULL,
            ends_at    VARCHAR(32)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS connector_config (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id  VARCHAR(100) NOT NULL,
            connector  VARCHAR(100) NOT NULL,
            config_json MEDIUMTEXT,
            is_enabled TINYINT(1) NOT NULL DEFAULT 1,
            created_at VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS writeback_job (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id    VARCHAR(100) NOT NULL,
            job_type     VARCHAR(100) NOT NULL,
            status       VARCHAR(50) NOT NULL,
            payload_json MEDIUMTEXT,
            result_json  MEDIUMTEXT,
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS settlement (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id    VARCHAR(100) NOT NULL,
            source       VARCHAR(100) NOT NULL,
            period       VARCHAR(50) NOT NULL,
            amount       DOUBLE NOT NULL DEFAULT 0,
            currency     VARCHAR(10) NOT NULL DEFAULT 'USD',
            payload_json MEDIUMTEXT,
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS audit_log (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            actor        VARCHAR(255) NOT NULL,
            action       VARCHAR(255) NOT NULL,
            details_json MEDIUMTEXT,
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS ads_mapping (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            platform        VARCHAR(100) NOT NULL,
            field           VARCHAR(255) NOT NULL,
            raw_value       VARCHAR(500) NOT NULL,
            canonical_value VARCHAR(500) NOT NULL,
            note            TEXT,
            created_at      VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS alert_policy (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            name             VARCHAR(255) NOT NULL,
            is_enabled       TINYINT(1) NOT NULL DEFAULT 1,
            dimension        VARCHAR(100),
            severity         VARCHAR(50),
            metric           VARCHAR(100),
            operator         VARCHAR(20),
            threshold        DOUBLE,
            policy_json      MEDIUMTEXT,
            notify_slack     TINYINT(1) NOT NULL DEFAULT 0,
            slack_channel    VARCHAR(255),
            slack_webhook_url VARCHAR(500),
            created_at       VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS alert_instance (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            policy_id   INT NOT NULL,
            `window`      VARCHAR(100) NOT NULL,
            status      VARCHAR(50) NOT NULL,
            payload_json MEDIUMTEXT,
            created_at  VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        // 190차 Sprint3: Alerting evaluate 실구현 — 멀티테넌트 스코핑 + dedup 보조 컬럼
        //   (additive, 멱등: 이미 존재하면 try/catch 흡수. 레거시 NULL 행은 글로벌로 하위호환)
        foreach ([
            "ALTER TABLE alert_policy ADD COLUMN tenant_id VARCHAR(100) NULL",
            "ALTER TABLE alert_instance ADD COLUMN tenant_id VARCHAR(100) NULL",
            "ALTER TABLE alert_instance ADD COLUMN entity VARCHAR(255) NULL",
            "ALTER TABLE action_request ADD COLUMN tenant_id VARCHAR(100) NULL", // 208차 검수: 테넌트 격리 컬럼
        ] as $sql) { try { $pdo->exec($sql); } catch (\Throwable $e) {} }

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS action_request (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            policy_id     INT,
            tenant_id     VARCHAR(100) NULL,
            status        VARCHAR(50) NOT NULL,
            action_json   MEDIUMTEXT,
            approvals_json MEDIUMTEXT,
            created_at    VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS activity_rollup (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            `window`       VARCHAR(50) NOT NULL,
            dimension    VARCHAR(100) NOT NULL,
            `key`        VARCHAR(500) NOT NULL,
            metrics_json MEDIUMTEXT,
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        // ???? V418 ë§¤í ?ì??¤í¸ë¦?& ê±°ë²?ì¤ ??????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS mapping_entry (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            platform        VARCHAR(100) NOT NULL,
            field           VARCHAR(255) NOT NULL,
            raw_value       VARCHAR(500) NOT NULL,
            canonical_value VARCHAR(500) NOT NULL,
            note            TEXT,
            created_at      VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS mapping_change_request (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            platform          VARCHAR(100) NOT NULL,
            field             VARCHAR(255) NOT NULL,
            raw_value         VARCHAR(500) NOT NULL,
            canonical_value   VARCHAR(500) NOT NULL,
            note              TEXT,
            status            VARCHAR(50) NOT NULL DEFAULT 'pending',
            requested_by      VARCHAR(255) NOT NULL,
            approvals_json    MEDIUMTEXT,
            required_approvals INT NOT NULL DEFAULT 2,
            created_at        VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS mapping_validation_rule (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            field                VARCHAR(255) NOT NULL,
            rule_type            VARCHAR(100) NOT NULL,
            allowed_values_json  MEDIUMTEXT,
            regex_pattern        VARCHAR(500),
            description          TEXT,
            enabled              TINYINT(1) NOT NULL DEFAULT 1,
            created_at           VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        // Seed data
        $cnt = (int)$pdo->query('SELECT COUNT(*) FROM billing_plan')->fetchColumn();
        if ($cnt === 0) {
            $now  = gmdate('c');
            $stmt = $pdo->prepare(
                'INSERT INTO billing_plan(code,name,limits_json,is_active,created_at) VALUES(?,?,?,?,?)'
            );
            $stmt->execute(['demo','Demo Plan',json_encode(['users'=>5,'connectors'=>3,'reports'=>10],JSON_UNESCAPED_UNICODE),1,$now]);
            $stmt->execute(['pro','Pro Plan',json_encode(['users'=>50,'connectors'=>20,'reports'=>1000],JSON_UNESCAPED_UNICODE),1,$now]);
        }

        // ???? V418.1 ì§ê³ ?ì´ë¸?????????????????????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS ad_insight_agg (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id    VARCHAR(100) NOT NULL,
            platform     VARCHAR(100) NOT NULL,
            date         VARCHAR(10) NOT NULL,
            campaign_id  VARCHAR(255),
            adset_id     VARCHAR(255),
            ad_id        VARCHAR(255),
            sku          VARCHAR(255),
            gender       VARCHAR(20),
            age_range    VARCHAR(50),
            region       VARCHAR(50),
            impressions  INT NOT NULL DEFAULT 0,
            clicks       INT NOT NULL DEFAULT 0,
            spend        DOUBLE NOT NULL DEFAULT 0,
            conversions  INT NOT NULL DEFAULT 0,
            revenue      DOUBLE NOT NULL DEFAULT 0,
            extra_json   MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_ad_insight_agg_tenant_date ON ad_insight_agg(tenant_id,date)');
        self::idx($pdo,'CREATE INDEX idx_ad_insight_agg_segment ON ad_insight_agg(tenant_id,platform,gender,age_range,region)');
        // New tables for performance analysis
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS performance_metrics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id VARCHAR(100) NOT NULL,
            team VARCHAR(50) NOT NULL,
            channel VARCHAR(100) NOT NULL,
            account VARCHAR(255) NOT NULL,
            date VARCHAR(10) NOT NULL,
            impressions INT NOT NULL DEFAULT 0,
            clicks INT NOT NULL DEFAULT 0,
            spend DOUBLE NOT NULL DEFAULT 0,
            conversions INT NOT NULL DEFAULT 0,
            revenue DOUBLE NOT NULL DEFAULT 0,
            campaign_ext_id VARCHAR(255) DEFAULT NULL,
            extra_json MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        // 202차 Phase3: 캠페인 단위 측정 입도 — 기존 배포 테이블에 campaign_ext_id 보강(idempotent).
        try { $pdo->exec("ALTER TABLE performance_metrics ADD COLUMN campaign_ext_id VARCHAR(255) DEFAULT NULL"); } catch (\Throwable $e) { /* 이미 존재 */ }
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS team_channel_mapping (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id VARCHAR(100) NOT NULL,
            team VARCHAR(50) NOT NULL,
            channel VARCHAR(100) NOT NULL,
            account VARCHAR(255) NOT NULL,
            extra_json MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        // Indexes for new tables
        self::idx($pdo, 'CREATE INDEX idx_perf_metrics_tenant_team ON performance_metrics(tenant_id,team)');
        self::idx($pdo, 'CREATE INDEX idx_perf_metrics_tenant_channel ON performance_metrics(tenant_id,channel)');
        self::idx($pdo, 'CREATE INDEX idx_team_channel_mapping ON team_channel_mapping(tenant_id,team,channel)');

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS influencer_audience_agg (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id       VARCHAR(100) NOT NULL,
            platform        VARCHAR(100) NOT NULL,
            creator_id      VARCHAR(255) NOT NULL,
            gender          VARCHAR(20),
            age_range       VARCHAR(50),
            region          VARCHAR(50),
            followers       INT NOT NULL DEFAULT 0,
            engagement_rate DOUBLE,
            updated_at      VARCHAR(32) NOT NULL,
            extra_json      MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_influencer_audience_agg_tenant ON influencer_audience_agg(tenant_id,platform,creator_id)');
        self::idx($pdo,'CREATE INDEX idx_influencer_audience_agg_segment ON influencer_audience_agg(tenant_id,platform,gender,age_range,region)');

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS commerce_sku_day (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id  VARCHAR(100) NOT NULL,
            channel    VARCHAR(100) NOT NULL,
            date       VARCHAR(10) NOT NULL,
            sku        VARCHAR(255) NOT NULL,
            orders     INT NOT NULL DEFAULT 0,
            units      INT NOT NULL DEFAULT 0,
            revenue    DOUBLE NOT NULL DEFAULT 0,
            refunds    DOUBLE NOT NULL DEFAULT 0,
            extra_json MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_commerce_sku_day_tenant_date ON commerce_sku_day(tenant_id,date)');
        self::idx($pdo,'CREATE INDEX idx_commerce_sku_day_sku ON commerce_sku_day(tenant_id,sku)');

        // [P0 멱등화] Decisioning ingest 3종(ad/commerce/influencer) 중복적재 차단 — dedup_key+백필+제거+UNIQUE.
        //   기존 INSERT-only + UNIQUE 제약 부재로 동일기간 재수집 시 SUM 집계가 중복합산되던 머니경로 결함 수정.
        self::dedupAggTable($pdo, 'ad_insight_agg',         ['tenant_id','platform','date','campaign_id','adset_id','ad_id','sku','gender','age_range','region']);
        self::dedupAggTable($pdo, 'commerce_sku_day',       ['tenant_id','channel','date','sku']);
        self::dedupAggTable($pdo, 'influencer_audience_agg',['tenant_id','platform','creator_id']);

        // ???? V419 Semi-Attribution ??????????????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS attribution_coupon (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id     VARCHAR(100) NOT NULL,
            code          VARCHAR(255) NOT NULL,
            channel       VARCHAR(100) NOT NULL,
            campaign      VARCHAR(255),
            discount_type VARCHAR(50),
            note          TEXT,
            created_at    VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS attribution_deeplink (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id  VARCHAR(100) NOT NULL,
            template   VARCHAR(500) NOT NULL,
            channel    VARCHAR(100) NOT NULL,
            campaign   VARCHAR(255),
            note       TEXT,
            created_at VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS attribution_touch (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id    VARCHAR(100) NOT NULL,
            session_id   VARCHAR(255),
            order_id     VARCHAR(255),
            channel      VARCHAR(100),
            utm_source   VARCHAR(255),
            utm_medium   VARCHAR(100),
            utm_campaign VARCHAR(255),
            utm_content  VARCHAR(255),
            utm_term     VARCHAR(255),
            coupon_code  VARCHAR(255),
            deeplink     VARCHAR(500),
            touched_at   VARCHAR(32) NOT NULL,
            extra_json   MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_attr_touch_order ON attribution_touch(tenant_id,order_id)');
        self::idx($pdo,'CREATE INDEX idx_attr_touch_session ON attribution_touch(tenant_id,session_id)');

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS attribution_result (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id         VARCHAR(100) NOT NULL,
            order_id          VARCHAR(255) NOT NULL,
            attributed_channel VARCHAR(100),
            confidence_score  DOUBLE NOT NULL DEFAULT 0,
            evidence_json     MEDIUMTEXT,
            model             VARCHAR(100) NOT NULL DEFAULT 'semi_rule_v1',
            created_at        VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_attr_result_order ON attribution_result(tenant_id,order_id)');

        // ???? V419 Graph Scoring ????????????????????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS graph_node (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id  VARCHAR(100) NOT NULL,
            node_type  VARCHAR(100) NOT NULL,
            node_id    VARCHAR(255) NOT NULL,
            label      VARCHAR(500),
            meta_json  MEDIUMTEXT,
            created_at VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS graph_edge (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id   VARCHAR(100) NOT NULL,
            src_type    VARCHAR(100) NOT NULL,
            src_id      VARCHAR(255) NOT NULL,
            dst_type    VARCHAR(100) NOT NULL,
            dst_id      VARCHAR(255) NOT NULL,
            edge_weight DOUBLE NOT NULL DEFAULT 1.0,
            edge_label  VARCHAR(100),
            meta_json   MEDIUMTEXT,
            created_at  VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_graph_edge_src ON graph_edge(tenant_id,src_type,src_id)');
        self::idx($pdo,'CREATE INDEX idx_graph_edge_dst ON graph_edge(tenant_id,dst_type,dst_id)');

        // ???? V419 êµ?´ ì±ë ?¤í¤ë§???????????????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS kr_channel (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            channel_key     VARCHAR(100) NOT NULL,
            display_name    VARCHAR(255) NOT NULL,
            currency        VARCHAR(10) NOT NULL DEFAULT 'KRW',
            settlement_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
            fee_schema_json MEDIUMTEXT,
            vat_rate        DOUBLE NOT NULL DEFAULT 0.10,
            note            TEXT,
            created_at      VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS kr_settlement_line (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id         VARCHAR(100) NOT NULL,
            channel_key       VARCHAR(100) NOT NULL,
            settlement_id     VARCHAR(255),
            period_start      VARCHAR(10) NOT NULL,
            period_end        VARCHAR(10) NOT NULL,
            order_id          VARCHAR(255),
            product_id        VARCHAR(255),
            sku               VARCHAR(255),
            product_name      VARCHAR(500),
            qty               INT NOT NULL DEFAULT 1,
            sell_price        DOUBLE NOT NULL DEFAULT 0,
            gross_sales       DOUBLE NOT NULL DEFAULT 0,
            platform_fee      DOUBLE NOT NULL DEFAULT 0,
            ad_fee            DOUBLE NOT NULL DEFAULT 0,
            shipping_fee      DOUBLE NOT NULL DEFAULT 0,
            return_fee        DOUBLE NOT NULL DEFAULT 0,
            vat               DOUBLE NOT NULL DEFAULT 0,
            coupon_discount   DOUBLE NOT NULL DEFAULT 0,
            point_discount    DOUBLE NOT NULL DEFAULT 0,
            other_deductions  DOUBLE NOT NULL DEFAULT 0,
            net_payout        DOUBLE NOT NULL DEFAULT 0,
            currency          VARCHAR(10) NOT NULL DEFAULT 'KRW',
            status            VARCHAR(50) NOT NULL DEFAULT 'settled',
            raw_json          MEDIUMTEXT,
            ingested_at       VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_kr_settle_tenant ON kr_settlement_line(tenant_id,channel_key)');
        self::idx($pdo,'CREATE INDEX idx_kr_settle_period ON kr_settlement_line(tenant_id,channel_key,period_start)');
        self::idx($pdo,'CREATE INDEX idx_kr_settle_order ON kr_settlement_line(tenant_id,order_id)');

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS kr_fee_rule (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id            VARCHAR(100) NOT NULL,
            channel_key          VARCHAR(100) NOT NULL,
            category             VARCHAR(100) NOT NULL DEFAULT '*',
            platform_fee_rate    DOUBLE NOT NULL DEFAULT 0,
            ad_fee_rate          DOUBLE NOT NULL DEFAULT 0,
            shipping_standard    DOUBLE NOT NULL DEFAULT 0,
            free_ship_threshold  DOUBLE NOT NULL DEFAULT 0,
            return_fee_standard  DOUBLE NOT NULL DEFAULT 0,
            vat_rate             DOUBLE NOT NULL DEFAULT 0.10,
            note                 TEXT,
            effective_from       VARCHAR(32) NOT NULL,
            created_at           VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_kr_fee_rule ON kr_fee_rule(tenant_id,channel_key,category)');

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS kr_recon_report (
            id                 INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id          VARCHAR(100) NOT NULL,
            channel_key        VARCHAR(100) NOT NULL,
            period_start       VARCHAR(10) NOT NULL,
            period_end         VARCHAR(10) NOT NULL,
            status             VARCHAR(50) NOT NULL DEFAULT 'draft',
            total_orders       INT NOT NULL DEFAULT 0,
            matched            INT NOT NULL DEFAULT 0,
            mismatch           INT NOT NULL DEFAULT 0,
            missing_settlement INT NOT NULL DEFAULT 0,
            missing_order      INT NOT NULL DEFAULT 0,
            gross_diff         DOUBLE NOT NULL DEFAULT 0,
            fee_diff           DOUBLE NOT NULL DEFAULT 0,
            net_diff           DOUBLE NOT NULL DEFAULT 0,
            summary_json       MEDIUMTEXT,
            created_at         VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_kr_recon_report ON kr_recon_report(tenant_id,channel_key)');

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS kr_recon_ticket (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id   VARCHAR(100) NOT NULL,
            report_id   INT NOT NULL,
            order_id    VARCHAR(255),
            channel_key VARCHAR(100) NOT NULL,
            category    VARCHAR(100) NOT NULL DEFAULT 'variance',
            severity    VARCHAR(50) NOT NULL DEFAULT 'medium',
            status      VARCHAR(50) NOT NULL DEFAULT 'open',
            gross_diff  DOUBLE,
            fee_diff    DOUBLE,
            net_diff    DOUBLE,
            title       VARCHAR(500),
            note        TEXT,
            created_at  VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_kr_recon_ticket ON kr_recon_ticket(tenant_id,report_id)');

        // ???? V421 API Key Store ????????????????????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS api_key (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id    VARCHAR(100) NOT NULL,
            key_prefix   VARCHAR(50) NOT NULL,
            key_hash     VARCHAR(64) NOT NULL,
            name         VARCHAR(255) NOT NULL,
            role         VARCHAR(50) NOT NULL DEFAULT 'viewer',
            scopes_json  MEDIUMTEXT,
            is_active    TINYINT(1) NOT NULL DEFAULT 1,
            last_used_at VARCHAR(32),
            use_count    BIGINT NOT NULL DEFAULT 0,
            expires_at   VARCHAR(32),
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_api_key_tenant ON api_key(tenant_id,is_active)');
        // 194차 #4: API 호출량(use_count) 추적 — 레거시 테이블 멱등 ALTER(additive)
        try { $pdo->exec("ALTER TABLE api_key ADD COLUMN use_count BIGINT NOT NULL DEFAULT 0"); } catch (\Throwable $e) {}

        // ???? V421 Connector Token Store ????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS connector_token (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id     VARCHAR(100) NOT NULL,
            provider      VARCHAR(100) NOT NULL,
            access_token  TEXT,
            refresh_token TEXT,
            token_type    VARCHAR(50) NOT NULL DEFAULT 'Bearer',
            expires_at    VARCHAR(32),
            scopes        TEXT,
            meta_json     MEDIUMTEXT,
            updated_at    VARCHAR(32) NOT NULL,
            created_at    VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));

        // ── V423 Channel Credential Store ──────────────────────────────────────
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS channel_credential (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id    VARCHAR(100) NOT NULL,
            channel      VARCHAR(100) NOT NULL,
            cred_type    VARCHAR(50) NOT NULL DEFAULT 'api_key',
            label        VARCHAR(255) NOT NULL DEFAULT '',
            key_name     VARCHAR(100) NOT NULL,
            key_value    TEXT,
            is_active    TINYINT(1) NOT NULL DEFAULT 1,
            note         TEXT,
            last_tested_at VARCHAR(32),
            test_status  VARCHAR(20),
            updated_at   VARCHAR(32) NOT NULL,
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_cred_tenant_channel ON channel_credential(tenant_id,channel)');
        self::idx($pdo,'CREATE UNIQUE INDEX uq_cred_tenant_channel_key ON channel_credential(tenant_id,channel,key_name)');

        // ?°ëª¨ API Key ?ë
        $demoKeyHash  = hash('sha256', 'genie_live_demo_key_00000000');
        $demoKeyCount = (int)$pdo->query("SELECT COUNT(*) FROM api_key WHERE tenant_id='demo'")->fetchColumn();
        if ($demoKeyCount === 0) {
            $now = gmdate('c');
            $pdo->prepare('INSERT INTO api_key(tenant_id,key_prefix,key_hash,name,role,scopes_json,is_active,created_at) VALUES(?,?,?,?,?,?,?,?)')
                ->execute(['demo','genie_live_',$demoKeyHash,'Demo Key','analyst',json_encode(['read:*','write:*']),1,$now]);
            $pdo->prepare('INSERT INTO api_key(tenant_id,key_prefix,key_hash,name,role,scopes_json,is_active,created_at) VALUES(?,?,?,?,?,?,?,?)')
                ->execute(['demo','genie_read_',hash('sha256','genie_read_demo_key_11111111'),'Demo Analyst Key','analyst',json_encode(['read:*']),1,$now]);
        }
        // 192cha security P0: downgrade any pre-seeded demo admin key (admin/admin:keys -> analyst). idempotent.
        try {
            $pdo->prepare("UPDATE api_key SET role='analyst', scopes_json=?, name='Demo Key' WHERE tenant_id='demo' AND key_hash=? AND role='admin'")
                ->execute([json_encode(['read:*','write:*']), $demoKeyHash]);
        } catch (\Throwable $e) { /* ignore on older schema */ }

        // ???? V423 2???ì? ?´ë²¤???¤í¤ë§?????????????????????????????????????????????????????????????????????????????
        // Layer 1: RawVendorEvent
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS raw_vendor_event (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            tenant_id            VARCHAR(100) NOT NULL DEFAULT 'demo',
            vendor               VARCHAR(100) NOT NULL,
            source_system        VARCHAR(50) NOT NULL,
            event_type           VARCHAR(100) NOT NULL,
            dedup_key            VARCHAR(255),
            raw_payload          MEDIUMTEXT NOT NULL,
            received_at          VARCHAR(32) NOT NULL,
            status               VARCHAR(20) NOT NULL DEFAULT 'pending',
            error_msg            TEXT,
            normalized_event_id  INT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_rve_tenant_vendor ON raw_vendor_event(tenant_id,vendor)');
        self::idx($pdo,'CREATE INDEX idx_rve_tenant_status ON raw_vendor_event(tenant_id,status)');
        self::idx($pdo,'CREATE INDEX idx_rve_tenant_type ON raw_vendor_event(tenant_id,event_type)');
        // MySQL UNIQUE index ??NULL ê°ì ?ë¡ ?¤ë¥¸ ê²ì¼ë¡?ê°ì£¼ ??ë³µì NULL ?ì© (ë¶?ë¶??¸ë±??ë¶í??
        self::idx($pdo,'CREATE UNIQUE INDEX uq_rve_dedup ON raw_vendor_event(tenant_id,vendor,dedup_key)');

        // Layer 2: NormalizedActivityEvent
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS normalized_activity_event (
            id                           INT AUTO_INCREMENT PRIMARY KEY,
            raw_event_id                 INT,
            tenant_id                    VARCHAR(100) NOT NULL DEFAULT 'demo',
            event_date                   VARCHAR(10) NOT NULL,
            event_type                   VARCHAR(100) NOT NULL,
            domain                       VARCHAR(30) NOT NULL,
            -- ê´ê³  ?ë©??            vendor                       VARCHAR(100),
            account_id                   VARCHAR(255),
            campaign_id                  VARCHAR(255),
            campaign_name                VARCHAR(500),
            adset_id                     VARCHAR(255),
            adset_name                   VARCHAR(500),
            ad_id                        VARCHAR(255),
            creative_id                  VARCHAR(255),
            creative_type                VARCHAR(50),
            keyword                      VARCHAR(500),
            match_type                   VARCHAR(20),
            audience_segment             VARCHAR(255),
            impressions                  INT DEFAULT 0,
            clicks                       INT DEFAULT 0,
            spend                        DOUBLE DEFAULT 0,
            conversions                  INT DEFAULT 0,
            attributed_revenue           DOUBLE DEFAULT 0,
            -- ë§ì¼ ?ë©??            channel                      VARCHAR(100),
            order_id                     VARCHAR(255),
            sku                          VARCHAR(255),
            product_title                VARCHAR(500),
            qty                          INT DEFAULT 0,
            gross_sales                  DOUBLE DEFAULT 0,
            platform_fee                 DOUBLE DEFAULT 0,
            ad_fee                       DOUBLE DEFAULT 0,
            shipping_fee                 DOUBLE DEFAULT 0,
            return_fee                   DOUBLE DEFAULT 0,
            coupon_discount              DOUBLE DEFAULT 0,
            point_discount               DOUBLE DEFAULT 0,
            settlement_deduction_type    VARCHAR(100),
            settlement_deduction_amount  DOUBLE DEFAULT 0,
            net_payout                   DOUBLE DEFAULT 0,
            is_return                    TINYINT(1) DEFAULT 0,
            -- UGC / ?¸íë£¨ì¸???ë©??            creator_id                   VARCHAR(255),
            creator_handle               VARCHAR(255),
            ugc_content_id               VARCHAR(255),
            ugc_platform                 VARCHAR(50),
            ugc_rights_status            VARCHAR(50),
            ugc_whitelist_status         VARCHAR(50),
            ugc_branded_content          TINYINT(1) DEFAULT 0,
            -- ê³µíµ
            currency                     VARCHAR(10) NOT NULL DEFAULT 'KRW',
            region                       VARCHAR(10),
            normalized_at                VARCHAR(32) NOT NULL,
            normalizer_version           VARCHAR(50) DEFAULT 'v423_rule_v1',
            extra_json                   MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_nae_tenant_date ON normalized_activity_event(tenant_id,event_date)');
        self::idx($pdo,'CREATE INDEX idx_nae_tenant_domain ON normalized_activity_event(tenant_id,domain)');
        self::idx($pdo,'CREATE INDEX idx_nae_tenant_type ON normalized_activity_event(tenant_id,event_type)');
        self::idx($pdo,'CREATE INDEX idx_nae_tenant_sku ON normalized_activity_event(tenant_id,sku)');
        self::idx($pdo,'CREATE INDEX idx_nae_tenant_creator ON normalized_activity_event(tenant_id,creator_id)');
        self::idx($pdo,'CREATE INDEX idx_nae_raw_event ON normalized_activity_event(raw_event_id)');

        // ???? ?ìê°???/ ?¸ì¦ ????????????????????????????????????????????????????????????????????????????????????????????????????????
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS app_user (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            email         VARCHAR(191) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name          VARCHAR(255) NOT NULL,
            plan          VARCHAR(20) NOT NULL DEFAULT 'demo',
            company       VARCHAR(255),
            is_active     TINYINT(1) NOT NULL DEFAULT 1,
            created_at    VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_app_user_plan ON app_user(plan)');

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS user_session (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            token      VARCHAR(64) NOT NULL,
            expires_at VARCHAR(32) NOT NULL,
            created_at VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_user_session_user ON user_session(user_id)');
        self::idx($pdo,'CREATE UNIQUE INDEX idx_user_session_token ON user_session(token)');

        // ── app_user 구독 컬럼 (없으면 추가) ──────────────────────────────
        if (self::isMySQL($pdo)) {
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN subscription_expires_at VARCHAR(32) NULL"); } catch (\Throwable $e) {}
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN subscription_cycle VARCHAR(20) NULL"); } catch (\Throwable $e) {}
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN plans VARCHAR(20) NULL"); } catch (\Throwable $e) {}
            // ── password_hashs 컬럼 보장 (로그인 API 호환) ──────────────────
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN password_hashs VARCHAR(255) NULL"); } catch (\Throwable $e) {}
            // 기존 password_hash 값이 있으나 password_hashs가 NULL인 경우 복사
            try { $pdo->exec("UPDATE app_user SET password_hashs = password_hash WHERE password_hashs IS NULL AND password_hash IS NOT NULL AND password_hash != ''"); } catch (\Throwable $e) {}
        } else {
            // SQLite는 IF NOT EXISTS 없음 → catch 무시
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN subscription_expires_at TEXT"); } catch (\Throwable $e) {}
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN subscription_cycle TEXT"); } catch (\Throwable $e) {}
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN plans TEXT"); } catch (\Throwable $e) {}
            try { $pdo->exec("ALTER TABLE app_user ADD COLUMN password_hashs TEXT"); } catch (\Throwable $e) {}
            try { $pdo->exec("UPDATE app_user SET password_hashs = password_hash WHERE password_hashs IS NULL AND password_hash IS NOT NULL AND password_hash != ''"); } catch (\Throwable $e) {}
        }

        // ── 결제 내역 테이블 ─────────────────────────────────────────────
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS payment_history (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            payment_key VARCHAR(200) NOT NULL,
            order_id    VARCHAR(200) NOT NULL,
            amount      INT NOT NULL,
            plan        VARCHAR(50) NOT NULL DEFAULT 'pro',
            cycle       VARCHAR(20) NOT NULL DEFAULT 'monthly',
            status      VARCHAR(50) NOT NULL DEFAULT 'success',
            paid_at     VARCHAR(32) NOT NULL,
            expires_at  VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_payment_history_user ON payment_history(user_id)');
        self::idx($pdo,'CREATE INDEX idx_payment_history_order ON payment_history(order_id)');

        // ── PG 설정 테이블 ──────────────────────────────────────────────
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS pg_config (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            provider       VARCHAR(50) NOT NULL,
            client_key     VARCHAR(300) NOT NULL,
            secret_key_enc VARCHAR(300) NOT NULL DEFAULT '',
            is_test        TINYINT(1) NOT NULL DEFAULT 1,
            is_active      TINYINT(1) NOT NULL DEFAULT 0,
            created_at     VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE UNIQUE INDEX idx_pg_config_provider ON pg_config(provider)');

        // Toss 테스트 키 placeholder 삽입 (pg_config 비어있을 때만).
        // ★ 202차 보안(P1): is_active=0 으로 시드한다. 과거 is_active=1 은 운영 신규 배포 시
        //   샌드박스(test_*) 키로 실결제가 라우팅될 위험이 있었다. 결제는 admin 이 실 키를
        //   등록하고 명시적으로 활성화해야만 동작한다(자동 활성 금지 — 결제 공급자 원칙).
        $pgCount = 0;
        try { $pgCount = (int)$pdo->query('SELECT COUNT(*) FROM pg_config')->fetchColumn(); } catch (\Throwable $e) {}
        if ($pgCount === 0) {
            $pgNow = gmdate('c');
            try {
                $pdo->prepare(
                    "INSERT INTO pg_config(provider, client_key, secret_key_enc, is_test, is_active, created_at) VALUES(?,?,?,1,0,?)"
                )->execute([
                    'toss',
                    'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq',
                    'test_sk_zXLkKEypNArWmo50nX3lmeaxYZ2M',
                    $pgNow,
                ]);
            } catch (\Throwable $e) { /* 이미 있으면 무시 */ }
        }

        // ?°ëª¨/?ë¡ ?¬ì©???ë

        // plan_pricing 테이블 (구독료/할인율 관리)
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS plan_pricing (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            plan         VARCHAR(50) NOT NULL,
            cycle        VARCHAR(20) NOT NULL,
            base_price   INT NOT NULL DEFAULT 99000,
            discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
            is_active    TINYINT(1) NOT NULL DEFAULT 1,
            created_at   VARCHAR(32) NOT NULL,
            updated_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE UNIQUE INDEX idx_plan_pricing_pk ON plan_pricing(plan, cycle)');
        $pricingCount = 0;
        try { $pricingCount = (int)$pdo->query('SELECT COUNT(*) FROM plan_pricing')->fetchColumn(); } catch (\Throwable $e) {}
        if ($pricingCount === 0) {
            $pn = gmdate('c');
            $ps2 = $pdo->prepare("INSERT INTO plan_pricing(plan,cycle,base_price,discount_pct,is_active,created_at,updated_at) VALUES(?,?,?,?,1,?,?)");
            foreach ([['pro','monthly',99000,0],['pro','quarterly',99000,20],['pro','yearly',99000,40]] as [$pl,$cy,$bp,$dp]) {
                try { $ps2->execute([$pl,$cy,$bp,$dp,$pn,$pn]); } catch (\Throwable $e) {}
            }
        }

        // 데모(showcase) 전용 기본 계정. ★ 202차 보안(P1): 운영 env 에는 약한 기본 비밀번호
        //   계정(demo1234/pro1234)을 시드하지 않는다(운영 신규 배포 노출 차단). 데모에서만 시드.
        $userCount = (int)$pdo->query('SELECT COUNT(*) FROM app_user')->fetchColumn();
        if ($userCount === 0 && self::env() === 'demo') {
            $now  = gmdate('c');
            $stmt = $pdo->prepare(
                'INSERT INTO app_user(email,password_hash,name,plan,company,is_active,created_at) VALUES(?,?,?,?,?,?,?)'
            );
            $stmt->execute(['demo@genie.ai',password_hash('demo1234',PASSWORD_DEFAULT),'Demo User','demo','GENIE Demo',1,$now]);
            $stmt->execute(['pro@genie.ai', password_hash('pro1234', PASSWORD_DEFAULT),'Pro User', 'pro', 'GENIE Corp', 1,$now]);
        }

        // ── app_user 추가 컬럼 (회원관리용) ─────────────────────────────────
        $extraCols = [
            "ALTER TABLE app_user ADD COLUMN representative VARCHAR(255) NULL",
            "ALTER TABLE app_user ADD COLUMN phone VARCHAR(50) NULL",
            "ALTER TABLE app_user ADD COLUMN extra_data TEXT NULL",
            "ALTER TABLE app_user ADD COLUMN subscription_started_at VARCHAR(32) NULL",
            "ALTER TABLE app_user ADD COLUMN subscription_renewed_at VARCHAR(32) NULL",
        ];
        foreach ($extraCols as $sql) {
            try { $pdo->exec($sql); } catch (\Throwable $e) {}
        }

        // ── 무료 구독 이용권(쿠폰) 테이블 ────────────────────────────────────
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS subscription_coupon (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            code         VARCHAR(64) NOT NULL,
            user_id      INT NULL COMMENT 'NULL=전체 대상',
            months       INT NOT NULL DEFAULT 1 COMMENT '무료 제공 월수 (1~6)',
            reason       VARCHAR(500) NOT NULL DEFAULT '',
            trigger_type VARCHAR(30) NOT NULL DEFAULT 'manual'
                         COMMENT 'manual|new_paid|renew_3m|renew_6m|renew_1y',
            granted_by   VARCHAR(100) NOT NULL DEFAULT 'admin',
            granted_at   VARCHAR(32) NOT NULL,
            applied_at   VARCHAR(32) NULL COMMENT '실제 사용된 시각',
            expires_at   VARCHAR(32) NULL COMMENT '이용권 자체 유효기간',
            status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                         COMMENT 'pending|applied|expired|cancelled'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_coupon_user ON subscription_coupon(user_id)');
        self::idx($pdo,'CREATE INDEX idx_coupon_status ON subscription_coupon(status)');
        self::idx($pdo,'CREATE UNIQUE INDEX idx_coupon_code ON subscription_coupon(code)');

        // ── V424 AI Creative Asset Store (서버 저장 + 중복 방지) ────────────
        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS creative_asset (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            user_id       VARCHAR(100) NOT NULL DEFAULT 'default',
            title         VARCHAR(500) NOT NULL DEFAULT '',
            platform      VARCHAR(50) NOT NULL DEFAULT 'popup',
            category      VARCHAR(50) NOT NULL DEFAULT 'general',
            event_type    VARCHAR(50) NOT NULL DEFAULT 'sale',
            season        VARCHAR(30) NOT NULL DEFAULT 'spring',
            image_data    MEDIUMTEXT,
            link_url      VARCHAR(1000) NOT NULL DEFAULT '',
            source_page   VARCHAR(50) NOT NULL DEFAULT 'auto-marketing',
            content_hash  VARCHAR(64) NOT NULL,
            status        VARCHAR(30) NOT NULL DEFAULT 'ready',
            updated_at    VARCHAR(32),
            created_at    VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_creative_user ON creative_asset(user_id)');
        self::idx($pdo,'CREATE INDEX idx_creative_user_platform ON creative_asset(user_id,platform)');
        self::idx($pdo,'CREATE UNIQUE INDEX uq_creative_hash ON creative_asset(user_id,content_hash)');
    }
}
