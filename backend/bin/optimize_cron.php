#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 광고 자동 캠페인 실시간 최적화 러너 (196차 Phase3).
 *
 * AutoCampaign::optimizeCampaign 코어를 전 테넌트의 active 자동 캠페인에 대해 실행.
 * 최근 14일 performance_metrics 분석 → 채널별 ROAS 기반 예산 재배분 + 손해 채널 회수.
 * HTTP 핸들러(optimize)가 온디맨드라면, 본 CLI 는 cron 으로 주기 자동 최적화.
 *
 * Usage:
 *   php backend/bin/optimize_cron.php [both|production|demo|current]
 *
 * crontab 예시(매시 정각 운영+데모 자동 최적화):
 *   0 * * * *  php /home/wwwroot/roi.geniego.com/backend/bin/optimize_cron.php both >> /var/log/genie_optimize.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\AutoCampaign;

$mode = $argv[1] ?? 'current';

function runForDb($pdo, string $label): int {
    $n = AutoCampaign::optimizeAllCli($pdo);
    echo "=== {$label} === optimized campaigns = {$n}\n";
    return $n;
}

try {
    if ($mode === 'both') {
        runForDb(Db::pdoFor(false), 'Production');
        runForDb(Db::pdoFor(true),  'Demo');
    } elseif ($mode === 'production') {
        runForDb(Db::pdoFor(false), 'Production');
    } elseif ($mode === 'demo') {
        runForDb(Db::pdoFor(true), 'Demo');
    } else {
        runForDb(Db::pdo(), 'Env=' . Db::env());
    }
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[optimize_cron] ' . $e->getMessage() . "\n");
    exit(1);
}
