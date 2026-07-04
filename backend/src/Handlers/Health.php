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
 * Enterprise-grade health endpoint (167차 5순위, U-166-E 정합).
 *
 * spec:
 *  - 운영/데모 DB ping (connect + SELECT 1 round-trip ms)
 *  - PHP runtime metadata (version, memory current/peak/limit)
 *  - deploy marker (composer.lock mtime)
 *  - schema_migrations 최신 적용 record
 *  - HTTP 200 OK 정상 / 503 Service Unavailable DB fail
 *
 * 공개 endpoint — index.php public bypass 등록 필요.
 */
final class Health
{
    public static function check(Request $request, Response $response, array $args): Response
    {
        $start = microtime(true);
        $payload = [
            'status' => 'ok',
            'service' => 'geniego-roi-backend',
            'timestamp' => date('c'),
            'php_version' => PHP_VERSION,
            'memory' => self::memorySnapshot(),
            'deploy' => self::deployMarker(),
            'db' => self::dbProbe(),
        ];
        $payload['response_time_ms'] = round((microtime(true) - $start) * 1000, 2);

        $httpStatus = ($payload['db']['ok'] ?? false) ? 200 : 503;
        if ($httpStatus === 503) $payload['status'] = 'degraded';

        return TemplateResponder::respond($response->withStatus($httpStatus), $payload);
    }

    private static function memorySnapshot(): array
    {
        return [
            'usage_mb' => round(memory_get_usage(true) / 1048576, 2),
            'peak_mb' => round(memory_get_peak_usage(true) / 1048576, 2),
            'limit' => ini_get('memory_limit') ?: 'unknown',
        ];
    }

    private static function deployMarker(): array
    {
        $lockPath = __DIR__ . '/../../composer.lock';
        if (!is_file($lockPath)) {
            return ['composer_lock' => 'absent'];
        }
        $mtime = @filemtime($lockPath);
        if ($mtime === false) {
            return ['composer_lock' => 'unreadable'];
        }
        return [
            'last_deploy' => date('c', $mtime),
            'composer_lock_age_seconds' => max(0, time() - $mtime),
        ];
    }

    private static function dbProbe(): array
    {
        $t0 = microtime(true);
        try {
            $pdo = Db::pdo();
            $stmt = $pdo->query('SELECT 1');
            $ok = $stmt && (int)$stmt->fetchColumn() === 1;
            $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
            $serverVer = @$pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
            $env = Db::env();
            $latest = self::latestMigration($pdo);
            return [
                'ok' => (bool)$ok,
                'env' => $env,
                'driver' => (string)$driver,
                'server_version' => (string)$serverVer,
                'connect_ms' => round((microtime(true) - $t0) * 1000, 2),
                'latest_migration' => $latest,
            ];
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'connect_ms' => round((microtime(true) - $t0) * 1000, 2),
                'error' => $e->getMessage(),
            ];
        }
    }

    private static function latestMigration(PDO $pdo): ?array
    {
        try {
            // [265차 스키마드리프트] schema_migrations 라이브 컬럼=filename/applied_at/checksum(version 없음) → filename 을 version 으로 별칭(응답키 보존).
            $stmt = $pdo->query('SELECT filename AS version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 1');
            if (!$stmt) return null;
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (Throwable $e) {
            return null;
        }
    }
}
