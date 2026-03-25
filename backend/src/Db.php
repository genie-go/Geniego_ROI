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
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) return self::$pdo;

        /* ── DB 연결: .env 파일 직접 파싱 → 환경변수 → 기본값 순서 ───────
         *  1) 백엔드 .env 파일 직접 로드 (PHP-FPM 환경변수 의존 제거)
         *  2) getenv() 환경변수 우선
         *  3) MySQL 연결 실패 시만 → SQLite 로컬 개발 폴백
         * ─────────────────────────────────────────────────────────── */
        // .env 파일 직접 파싱 (PHP-FPM이 env var를 전달하지 않아도 작동)
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
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

        $host = getenv('GENIE_DB_HOST') ?: '127.0.0.1';
        $port = getenv('GENIE_DB_PORT') ?: '3306';
        $name = getenv('GENIE_DB_NAME') ?: 'geniego_roi';
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
            // SQLSTATE[HY000][14] 방지: data/ 대신 시스템 tmp 사용
            $tmpDir  = sys_get_temp_dir(); // /tmp on Linux
            $dbPath  = $tmpDir . '/genie_roi.sqlite';

            // data/ 경로도 병행 시도 (권한 있는 경우 우선)
            $dataPath = __DIR__ . '/../../data/genie.sqlite';
            if (is_writable(dirname($dataPath)) || @mkdir(dirname($dataPath), 0775, true)) {
                $dbPath = $dataPath;
            }

            error_log('[Genie DB] MySQL connect failed (' . $e->getMessage() . '), fallback → SQLite: ' . $dbPath);

            $pdo = new PDO('sqlite:' . $dbPath, null, null, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
        }

        self::$pdo = $pdo;

        // ENTERPRISE OPTIMIZATION: Do not execute 100+ DDLs per request.
        // Check temp lock file to run migration only once per server startup/deployment.
        $migrationLock = sys_get_temp_dir() . '/genie_roi_v424_migrated.lock';
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

    private static function migrate(PDO $pdo): void
    {
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

        $pdo->exec(self::sql($pdo, "CREATE TABLE IF NOT EXISTS action_request (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            policy_id     INT,
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
            extra_json MEDIUMTEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
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
            expires_at   VARCHAR(32),
            created_at   VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"));
        self::idx($pdo,'CREATE INDEX idx_api_key_tenant ON api_key(tenant_id,is_active)');

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
                ->execute(['demo','genie_live_',$demoKeyHash,'Demo Admin Key','admin',json_encode(['read:*','write:*','admin:keys']),1,$now]);
            $pdo->prepare('INSERT INTO api_key(tenant_id,key_prefix,key_hash,name,role,scopes_json,is_active,created_at) VALUES(?,?,?,?,?,?,?,?)')
                ->execute(['demo','genie_read_',hash('sha256','genie_read_demo_key_11111111'),'Demo Analyst Key','analyst',json_encode(['read:*']),1,$now]);
        }

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

        // Toss 테스트 키를 기본으로 삽입 (pg_config 비어있을 때만)
        $pgCount = 0;
        try { $pgCount = (int)$pdo->query('SELECT COUNT(*) FROM pg_config')->fetchColumn(); } catch (\Throwable $e) {}
        if ($pgCount === 0) {
            $pgNow = gmdate('c');
            try {
                $pdo->prepare(
                    "INSERT INTO pg_config(provider, client_key, secret_key_enc, is_test, is_active, created_at) VALUES(?,?,?,1,1,?)"
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

        $userCount = (int)$pdo->query('SELECT COUNT(*) FROM app_user')->fetchColumn();
        if ($userCount === 0) {
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
    }
}

