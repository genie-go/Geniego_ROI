#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Alerting evaluate 스케줄 러너 (190차 Sprint3).
 *
 * Alerting::evaluate 의 코어(runEvaluation)를 전 테넌트 × 윈도우로 실행한다.
 * HTTP 핸들러가 온디맨드 평가라면, 본 CLI 는 cron 으로 주기 평가(임계 초과 시에만 alert 생성 + 통지).
 *
 * Usage:
 *   php backend/bin/alerts_cron.php [both|production|demo|current] [--window=daily|weekly|all] [--tenant=<id>]
 *
 * 기본: mode=current (GENIE_ENV), window=daily.
 *
 * crontab 예시(운영 daily 09:00 KST = 00:00 UTC, weekly 월요일):
 *   0 0 * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/alerts_cron.php production --window=daily  >> /var/log/genie_alerts.log 2>&1
 *   0 0 * * 1  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/alerts_cron.php production --window=weekly >> /var/log/genie_alerts.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패, 2=잘못된 인자.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Alerting;

$args     = array_slice($argv, 1);
$modeArgs = [];
$window   = 'daily';
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--window=(daily|weekly|monthly|all)$/', $a, $m)) {
        $window = $m[1];
    } elseif (preg_match('/^--tenant=(.+)$/', $a, $m)) {
        $onlyTenant = $m[1];
    } else {
        $modeArgs[] = $a;
    }
}
$mode = $modeArgs[0] ?? 'current';

/** alert_policy + performance_metrics 의 distinct 테넌트 수집(레거시 NULL 정책은 각 테넌트로 팬아웃). */
function collectTenants(PDO $pdo, ?string $only): array {
    if ($only !== null && $only !== '') return [$only];
    $set = [];
    foreach ([
        "SELECT DISTINCT tenant_id FROM alert_policy WHERE is_enabled=1 AND tenant_id IS NOT NULL AND tenant_id<>''",
        "SELECT DISTINCT tenant_id FROM performance_metrics WHERE tenant_id IS NOT NULL AND tenant_id<>''",
    ] as $sql) {
        try {
            foreach ($pdo->query($sql)->fetchAll(PDO::FETCH_COLUMN) as $t) {
                if ($t !== null && $t !== '') $set[(string)$t] = true;
            }
        } catch (\Throwable $e) { /* 테이블 부재 등 무시 */ }
    }
    // 활성 정책이 전부 레거시 NULL 이고 테넌트 데이터도 없으면 demo 1회 평가
    if (empty($set)) $set['demo'] = true;
    return array_keys($set);
}

function runForDb(PDO $pdo, string $label, string $window, ?string $only): int {
    $windows = $window === 'all' ? ['daily','weekly'] : [$window];
    $tenants = collectTenants($pdo, $only);
    $totalCreated = 0; $totalNotified = 0;
    echo "=== {$label} === tenants=" . count($tenants) . " windows=" . implode(',', $windows) . "\n";
    foreach ($tenants as $tenant) {
        foreach ($windows as $w) {
            $r = Alerting::runEvaluation($pdo, $tenant, $w);
            $c = count($r['created']); $n = (int)$r['notified'];
            $totalCreated += $c; $totalNotified += $n;
            if ($c > 0) {
                echo "  [{$tenant}/{$w}] created={$c} notified={$n} ({$r['window_from']}~{$r['window_to']})\n";
            }
        }
    }
    echo "  → total created={$totalCreated} notified={$totalNotified}\n";
    return $totalCreated;
}

try {
    if ($mode === 'both') {
        runForDb(Db::pdoFor(false), 'Production', $window, $onlyTenant);
        runForDb(Db::pdoFor(true),  'Demo',       $window, $onlyTenant);
    } elseif ($mode === 'production') {
        runForDb(Db::pdoFor(false), 'Production', $window, $onlyTenant);
    } elseif ($mode === 'demo') {
        runForDb(Db::pdoFor(true), 'Demo', $window, $onlyTenant);
    } elseif ($mode === 'current') {
        runForDb(Db::pdo(), 'Env=' . Db::env(), $window, $onlyTenant);
    } else {
        fwrite(STDERR, "Usage: alerts_cron.php [both|production|demo|current] [--window=daily|weekly|all] [--tenant=<id>]\n");
        exit(2);
    }
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[alerts_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
