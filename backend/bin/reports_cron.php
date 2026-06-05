#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 리포트 예약 발송 러너 (193차 Sprint4).
 *
 * report_schedule 중 due(enabled=1 AND next_run_at<=now)를 찾아 KPI 요약 생성 + 이메일 발송 + next_run 갱신.
 * Reports::runDue 코어를 HTTP runNow 와 공유.
 *
 * Usage:
 *   php backend/bin/reports_cron.php [--tenant=<id>]
 *
 * crontab 예시(매시 정각 체크 — frequency 별 next_run_at 으로 자체 게이팅):
 *   0 * * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/reports_cron.php >> /var/log/genie_reports.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\Reports;

$onlyTenant = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = $m[1];
}

try {
    $out = Reports::runDue($onlyTenant);
    $n = count($out);
    $sent = array_sum(array_map(fn($r) => (int)($r['sent'] ?? 0), $out));
    echo '[' . gmdate('Y-m-d H:i:s') . "] reports_cron: due={$n} sent={$sent}\n";
    foreach ($out as $r) {
        echo "  - schedule #{$r['id']} tenant={$r['tenant']} status={$r['status']} sent={$r['sent']}/{$r['recipients']}\n";
    }
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[reports_cron] ERROR: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine() . "\n");
    exit(1);
}
