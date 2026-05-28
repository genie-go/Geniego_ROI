<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Throwable;

/**
 * 176차 enterprise system metrics — DashSystem 시스템 서브탭 실측 데이터 공급.
 *
 * 원칙 (사용자 명시):
 *   - 가상/목 데이터 절대 금지 — 측정 불가 값은 null 반환
 *   - 모든 모듈 status/latency 는 실측만
 *   - rpm/uptime/errorRate 미측정 인프라에서는 null
 *
 * 반환 schema:
 *   {
 *     timestamp, env, response_time_ms,
 *     modules: [
 *       { id, name, icon, col, status('ok'|'degraded'|'down'), latency_ms,
 *         rpm: null|int, uptime: null|number, error_rate: null|number, detail: ... },
 *       ...
 *     ],
 *     summary: { ok_count, total, avg_latency_ms, total_rpm, error_rate }
 *   }
 */
final class SystemMetrics
{
    public static function metrics(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);

        $modules = [
            self::probeDatabase(),
            self::probePhpRuntime(),
            self::probeOpcache(),
            self::probeApcu(),
            self::probeDisk(),
            self::probeTenants(),
            self::probeMigrations(),
            self::probeSelf(),
        ];

        // RPM/uptime/errorRate — APCu counter 기반 실측 (있을 때만)
        self::enrichWithCounters($modules);

        $okCount = 0; $latSum = 0; $latN = 0; $rpmSum = 0; $errAccum = 0; $errN = 0;
        foreach ($modules as $m) {
            if (($m['status'] ?? '') === 'ok') $okCount++;
            if (isset($m['latency_ms']) && is_numeric($m['latency_ms'])) { $latSum += (float)$m['latency_ms']; $latN++; }
            if (isset($m['rpm']) && is_numeric($m['rpm'])) $rpmSum += (int)$m['rpm'];
            if (isset($m['error_rate']) && is_numeric($m['error_rate'])) { $errAccum += (float)$m['error_rate']; $errN++; }
        }

        $payload = [
            'timestamp' => date('c'),
            'env' => Db::env(),
            'response_time_ms' => round((microtime(true) - $start) * 1000, 2),
            'modules' => $modules,
            'summary' => [
                'ok_count' => $okCount,
                'total' => count($modules),
                'avg_latency_ms' => $latN > 0 ? round($latSum / $latN, 1) : null,
                'total_rpm' => $rpmSum > 0 ? $rpmSum : null,
                'error_rate' => $errN > 0 ? round($errAccum / $errN, 3) : null,
            ],
        ];

        // record this request to APCu rolling counter (best-effort)
        self::recordRequest('system_metrics', (float)$payload['response_time_ms'], $payload['summary']['ok_count'] === count($modules));

        return TemplateResponder::respond($response->withStatus(200), $payload);
    }

    // ── module probes ─────────────────────────────────────────────────

    private static function probeDatabase(): array
    {
        $t0 = microtime(true);
        try {
            $pdo = Db::pdo();
            $stmt = $pdo->query('SELECT 1');
            $ok = $stmt && (int)$stmt->fetchColumn() === 1;
            $driver = (string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            $serverVer = (string)@$pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
            $lat = round((microtime(true) - $t0) * 1000, 1);
            return [
                'id' => 'db', 'name' => 'Database', 'icon' => '🗄️', 'col' => '#22c55e',
                'status' => $ok ? 'ok' : 'down',
                'latency_ms' => $lat,
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['driver' => $driver, 'server_version' => $serverVer],
            ];
        } catch (Throwable $e) {
            return [
                'id' => 'db', 'name' => 'Database', 'icon' => '🗄️', 'col' => '#ef4444',
                'status' => 'down',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 1),
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['error' => $e->getMessage()],
            ];
        }
    }

    private static function probePhpRuntime(): array
    {
        $t0 = microtime(true);
        $mem = memory_get_usage(true);
        $peak = memory_get_peak_usage(true);
        $limit = ini_get('memory_limit') ?: '-1';
        $lat = round((microtime(true) - $t0) * 1000, 2);
        return [
            'id' => 'php', 'name' => 'PHP Runtime', 'icon' => '🐘', 'col' => '#4f8ef7',
            'status' => 'ok',
            'latency_ms' => $lat,
            'rpm' => null, 'uptime' => null, 'error_rate' => null,
            'detail' => [
                'version' => PHP_VERSION,
                'sapi' => PHP_SAPI,
                'memory_usage_mb' => round($mem / 1048576, 2),
                'memory_peak_mb' => round($peak / 1048576, 2),
                'memory_limit' => $limit,
            ],
        ];
    }

    private static function probeOpcache(): array
    {
        $t0 = microtime(true);
        if (!function_exists('opcache_get_status')) {
            return [
                'id' => 'opcache', 'name' => 'OPcache', 'icon' => '⚡', 'col' => '#94a3b8',
                'status' => 'degraded',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 2),
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['enabled' => false, 'reason' => 'opcache extension not loaded'],
            ];
        }
        $s = @opcache_get_status(false);
        $lat = round((microtime(true) - $t0) * 1000, 2);
        if (!$s || empty($s['opcache_enabled'])) {
            return [
                'id' => 'opcache', 'name' => 'OPcache', 'icon' => '⚡', 'col' => '#94a3b8',
                'status' => 'degraded',
                'latency_ms' => $lat,
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['enabled' => false],
            ];
        }
        $hit = $s['opcache_statistics']['opcache_hit_rate'] ?? null;
        $mem = $s['memory_usage'] ?? [];
        return [
            'id' => 'opcache', 'name' => 'OPcache', 'icon' => '⚡', 'col' => '#a855f7',
            'status' => 'ok',
            'latency_ms' => $lat,
            'rpm' => null,
            'uptime' => null,
            'error_rate' => null,
            'detail' => [
                'enabled' => true,
                'hit_rate' => $hit !== null ? round((float)$hit, 2) : null,
                'used_mb' => isset($mem['used_memory']) ? round($mem['used_memory'] / 1048576, 1) : null,
                'free_mb' => isset($mem['free_memory']) ? round($mem['free_memory'] / 1048576, 1) : null,
                'num_cached_scripts' => $s['opcache_statistics']['num_cached_scripts'] ?? null,
            ],
        ];
    }

    private static function probeApcu(): array
    {
        $t0 = microtime(true);
        if (!function_exists('apcu_cache_info') || !function_exists('apcu_sma_info')) {
            return [
                'id' => 'apcu', 'name' => 'APCu Cache', 'icon' => '💾', 'col' => '#94a3b8',
                'status' => 'degraded',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 2),
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['enabled' => false, 'reason' => 'apcu extension not loaded'],
            ];
        }
        try {
            $info = @apcu_cache_info(true);
            $sma = @apcu_sma_info(true);
            $lat = round((microtime(true) - $t0) * 1000, 2);
            $hits = (int)($info['num_hits'] ?? 0);
            $misses = (int)($info['num_misses'] ?? 0);
            $hitRate = ($hits + $misses) > 0 ? round($hits * 100 / ($hits + $misses), 2) : null;
            return [
                'id' => 'apcu', 'name' => 'APCu Cache', 'icon' => '💾', 'col' => '#06b6d4',
                'status' => 'ok',
                'latency_ms' => $lat,
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => [
                    'enabled' => true,
                    'hit_rate' => $hitRate,
                    'num_entries' => (int)($info['num_entries'] ?? 0),
                    'avail_mem_mb' => isset($sma['avail_mem']) ? round($sma['avail_mem'] / 1048576, 1) : null,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'id' => 'apcu', 'name' => 'APCu Cache', 'icon' => '💾', 'col' => '#ef4444',
                'status' => 'degraded',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 2),
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['error' => $e->getMessage()],
            ];
        }
    }

    private static function probeDisk(): array
    {
        $t0 = microtime(true);
        $root = dirname(__DIR__, 2); // backend/
        $free = @disk_free_space($root);
        $total = @disk_total_space($root);
        $lat = round((microtime(true) - $t0) * 1000, 2);
        if ($free === false || $total === false || $total <= 0) {
            return [
                'id' => 'disk', 'name' => 'Disk Space', 'icon' => '💽', 'col' => '#94a3b8',
                'status' => 'degraded',
                'latency_ms' => $lat,
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['available' => false],
            ];
        }
        $usedPct = round(($total - $free) * 100 / $total, 1);
        $status = $usedPct < 85 ? 'ok' : ($usedPct < 95 ? 'degraded' : 'down');
        return [
            'id' => 'disk', 'name' => 'Disk Space', 'icon' => '💽', 'col' => $status === 'ok' ? '#14d9b0' : '#eab308',
            'status' => $status,
            'latency_ms' => $lat,
            'rpm' => null, 'uptime' => null, 'error_rate' => null,
            'detail' => [
                'used_percent' => $usedPct,
                'free_gb' => round($free / 1073741824, 2),
                'total_gb' => round($total / 1073741824, 2),
            ],
        ];
    }

    private static function probeTenants(): array
    {
        $t0 = microtime(true);
        try {
            $pdo = Db::pdo();
            $count = null;
            foreach (['tenants', 'tenant', 'app_user'] as $tbl) {
                try {
                    $stmt = $pdo->query("SELECT COUNT(*) FROM `{$tbl}`");
                    if ($stmt) { $count = (int)$stmt->fetchColumn(); break; }
                } catch (Throwable $e) { /* try next */ }
            }
            $lat = round((microtime(true) - $t0) * 1000, 1);
            return [
                'id' => 'tenants', 'name' => 'Tenants', 'icon' => '🏢', 'col' => '#f97316',
                'status' => $count !== null ? 'ok' : 'degraded',
                'latency_ms' => $lat,
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['count' => $count],
            ];
        } catch (Throwable $e) {
            return [
                'id' => 'tenants', 'name' => 'Tenants', 'icon' => '🏢', 'col' => '#ef4444',
                'status' => 'down',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 1),
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['error' => $e->getMessage()],
            ];
        }
    }

    private static function probeMigrations(): array
    {
        $t0 = microtime(true);
        try {
            $pdo = Db::pdo();
            $stmt = $pdo->query('SELECT COUNT(*) AS c, MAX(applied_at) AS last FROM schema_migrations');
            if (!$stmt) throw new \RuntimeException('schema_migrations query failed');
            $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['c' => 0, 'last' => null];
            $lat = round((microtime(true) - $t0) * 1000, 1);
            return [
                'id' => 'migrations', 'name' => 'Schema Migrations', 'icon' => '🛠️', 'col' => '#eab308',
                'status' => 'ok',
                'latency_ms' => $lat,
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => [
                    'applied_count' => (int)($row['c'] ?? 0),
                    'last_applied_at' => $row['last'] ?? null,
                ],
            ];
        } catch (Throwable $e) {
            return [
                'id' => 'migrations', 'name' => 'Schema Migrations', 'icon' => '🛠️', 'col' => '#94a3b8',
                'status' => 'degraded',
                'latency_ms' => round((microtime(true) - $t0) * 1000, 1),
                'rpm' => null, 'uptime' => null, 'error_rate' => null,
                'detail' => ['error' => $e->getMessage()],
            ];
        }
    }

    private static function probeSelf(): array
    {
        $t0 = microtime(true);
        $lat = round((microtime(true) - $t0) * 1000, 2);
        return [
            'id' => 'api', 'name' => 'API Self-check', 'icon' => '🌐', 'col' => '#22c55e',
            'status' => 'ok',
            'latency_ms' => $lat,
            'rpm' => null, 'uptime' => null, 'error_rate' => null,
            'detail' => ['request_time' => date('c')],
        ];
    }

    // ── APCu rolling-window counters (실측 RPM/error_rate) ─────────────

    private static function enrichWithCounters(array &$modules): void
    {
        if (!function_exists('apcu_fetch')) return;
        // window: 최근 60초간 모듈별 카운터 (best-effort)
        foreach ($modules as &$m) {
            $key = 'sysm:req:' . $m['id'] . ':1min';
            $errKey = 'sysm:err:' . $m['id'] . ':1min';
            $reqs = @apcu_fetch($key);
            $errs = @apcu_fetch($errKey);
            if (is_int($reqs)) {
                $m['rpm'] = $reqs; // 60초 윈도우 = 분당 요청수와 동일
                $m['error_rate'] = (is_int($errs) && $reqs > 0) ? round($errs * 100 / $reqs, 2) : 0.0;
            }
            // uptime 은 startup timestamp 기반 (있을 때만)
            $bootKey = 'sysm:boot:' . $m['id'];
            $boot = @apcu_fetch($bootKey);
            if (!is_int($boot)) { @apcu_store($bootKey, time(), 0); $boot = time(); }
            $up = time() - (int)$boot;
            if ($up > 0) $m['uptime_seconds'] = $up;
        }
        unset($m);
    }

    public static function recordRequest(string $moduleId, float $latencyMs, bool $ok): void
    {
        if (!function_exists('apcu_inc')) return;
        $key = 'sysm:req:' . $moduleId . ':1min';
        $errKey = 'sysm:err:' . $moduleId . ':1min';
        @apcu_inc($key, 1, $unused, 60);
        if (!$ok) @apcu_inc($errKey, 1, $unused2, 60);
    }
}
