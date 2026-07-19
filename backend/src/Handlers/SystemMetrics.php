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
    /** [259차 보안] 세션 인증 여부 — 무인증 공개 호출에 민감 플랫폼 정보(회원수·DB버전·cron·raw예외) 노출 차단용.
     *   엔드포인트는 index.php public bypass 라 미들웨어 auth 가 없으므로 핸들러가 직접 세션 토큰을 검증. */
    private static function isAuthed(Request $request): bool
    {
        try {
            $h = $request->getHeaderLine('Authorization');
            $token = preg_match('/^Bearer\s+(.+)$/i', $h, $m) ? trim($m[1]) : trim((string)($request->getQueryParams()['token'] ?? ''));
            if ($token === '') return false;
            $pdo = Db::pdo();
            $st = $pdo->prepare("SELECT 1 FROM user_session WHERE token=? AND expires_at>? LIMIT 1");
            $st->execute([$token, gmdate('Y-m-d\TH:i:s\Z')]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    /** [282차 F-P2] 관리자 세션 여부 — 플랫폼 인프라 정찰정보(테넌트 수·DB버전·cron·마이그레이션)는 admin 전용. */
    private static function isAdmin(Request $request): bool
    {
        // [289차후속 P4] Canonical 관리자 판정 SSOT(UserAuth::resolveAdminByToken)로 위임. 종전 로컬 쿼리는
        //   u.plan 만 보고 plans 컬럼·is_active 를 누락해, plans='admin' 관리자를 놓치고 비활성(is_active=0)
        //   관리자를 통과시키던 드리프트 결함이 있었다 → 표준 술어로 정정(fail-secure).
        $h = $request->getHeaderLine('Authorization');
        $token = preg_match('/^Bearer\s+(.+)$/i', $h, $m) ? trim($m[1]) : trim((string)($request->getQueryParams()['token'] ?? ''));
        return $token !== '' && \Genie\Handlers\UserAuth::resolveAdminByToken($token) !== null;
    }

    public static function metrics(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        // [282차 F-P2] 민감 인프라정보 노출은 admin 세션만. 종전엔 임의 인증 사용자(free 포함)에게 노출돼
        //   플랫폼 테넌트 수·DB버전·cron 파이프라인 정찰이 가능했다(259차가 무인증→세션까진 올렸으나 admin 미승격).
        $authed = self::isAdmin($request);

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
            'env' => method_exists(Db::class, 'env') ? Db::env() : 'unknown',
            'response_time_ms' => round((microtime(true) - $start) * 1000, 2),
            'modules' => $modules,
            // [Track B] cron 헬스 — 자동화 두뇌의 데이터 파이프라인(수집·갱신·최적화) 실행 가시화.
            'cron' => self::cronHealth(),
            'summary' => [
                'ok_count' => $okCount,
                'total' => count($modules),
                'avg_latency_ms' => $latN > 0 ? round($latSum / $latN, 1) : null,
                'total_rpm' => $rpmSum > 0 ? $rpmSum : null,
                'error_rate' => $errN > 0 ? round($errAccum / $errN, 3) : null,
            ],
        ];

        // [259차 보안] 무인증 공개 호출에는 민감 플랫폼/인프라 정보 편집(회원·테넌트 수·DB server_version·raw 예외·cron 상세).
        //   운영 상태(가동/지연/디스크%)는 그대로 노출. 인증(관리자 대시보드 getJsonAuth)은 전체.
        if (!$authed) {
            foreach ($payload['modules'] as &$mm) {
                $mid = $mm['id'] ?? '';
                if ($mid === 'db' && isset($mm['detail']) && is_array($mm['detail'])) {
                    unset($mm['detail']['server_version'], $mm['detail']['error']);
                }
                if ($mid === 'tenants') { $mm['detail'] = ['restricted' => true]; }
            }
            unset($mm);
            $payload['cron'] = ['restricted' => true];
        }

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

    /**
     * [Track B] cron 헬스 — /var/log/genie_*.log mtime 으로 각 러너의 마지막 실행 신선도 측정.
     *   www(php-fpm)가 644 로그를 읽을 수 있음(검증). 로그 내용은 노출하지 않고 last_run/age/status 만.
     *   env(production/demo)에 따라 prod 로그 vs *_demo.log 선택. 측정 불가(파일 없음)=missing 정직 표기.
     *   stale 판정: 마지막 실행이 예상 주기의 2.5배를 초과(한두 사이클 누락 허용).
     */
    private static function cronHealth(): array
    {
        $env = method_exists(Db::class, 'env') ? Db::env() : 'production';
        $suffix = ($env === 'demo') ? '_demo' : '';
        // [id, 로그 basename, 예상주기(분), 라벨, critical]
        $runners = [
            ['connectors_sync', 'genie_conn_sync',     60,  '광고 성과 수집',   true],
            ['oauth_refresh',   'genie_oauth_refresh', 60,  'OAuth 토큰 갱신',  true],
            ['optimize',        'genie_optimize',      60,  '자동 최적화',      true],
            ['commerce_sync',   'genie_commerce_sync', 5,   '커머스 동기화',    true],
            ['journey',         'genie_journey',       5,   '여정 러너',        false],
            ['reports',         'genie_reports',       60,  '리포트 생성',      false],
            ['attribution',     'genie_attribution',   30,  'Attribution',     false],
            ['logistics',       'genie_logistics',     15,  '물류 추적',        false],
            ['writeback',       'genie_writeback',     10,  'Writeback',       false],
            ['pg_settle',       'genie_pg_settle',     120, 'PG 정산 수집',     false],
            ['review_collect',  'genie_review_collect',360, '리뷰/UGC 수집',    false],
            ['alerts',          'genie_alerts',        1440,'알림(일/주)',      false],
        ];
        // ★거짓경보 방지: open_basedir 가 /var/log 를 제외하면 PHP 가 로그 mtime 을 읽지 못한다.
        //   이때 filemtime 실패를 'missing'(중단)으로 오판하면 실제로 도는 cron 을 "중단"으로 거짓경보한다.
        //   → 로그 접근 불가가 확인되면 'unknown'(확인불가)로 정직 표기하고 critical 집계에서 제외한다.
        $obd = (string) ini_get('open_basedir');
        $logAccessible = ($obd === '') || (strpos($obd, '/var/log') !== false);
        $now = time();
        $rows = []; $okc = 0; $stale = 0; $missing = 0; $unknown = 0; $criticalStale = 0;
        foreach ($runners as [$id, $base, $intervalMin, $label, $critical]) {
            $path = "/var/log/{$base}{$suffix}.log";
            $mtime = $logAccessible ? @filemtime($path) : false;
            if ($mtime === false) {
                $st = $logAccessible ? 'missing' : 'unknown';
                $rows[] = ['id' => $id, 'label' => $label, 'interval_min' => $intervalMin, 'status' => $st, 'last_run' => null, 'age_min' => null, 'critical' => $critical];
                if ($st === 'missing') { $missing++; if ($critical) $criticalStale++; } else { $unknown++; }
                continue;
            }
            $ageMin = (int) round(($now - $mtime) / 60);
            $status = $ageMin > (int) ceil($intervalMin * 2.5) ? 'stale' : 'ok';
            if ($status === 'ok') $okc++; else { $stale++; if ($critical) $criticalStale++; }
            $rows[] = ['id' => $id, 'label' => $label, 'interval_min' => $intervalMin, 'status' => $status, 'last_run' => date('c', $mtime), 'age_min' => $ageMin, 'critical' => $critical];
        }
        return [
            'env' => $env,
            'log_accessible' => $logAccessible,
            'note' => $logAccessible ? null : 'PHP open_basedir 가 /var/log 를 제외해 cron 로그를 읽지 못함 — cron 은 서버에서 실행 중일 수 있음(서버 로그로 확인). open_basedir 에 /var/log 추가 시 실시간 표시.',
            'runners' => $rows,
            'summary' => ['ok' => $okc, 'stale' => $stale, 'missing' => $missing, 'unknown' => $unknown, 'total' => count($runners), 'critical_stale' => $criticalStale],
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
