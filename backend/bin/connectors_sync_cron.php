#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 광고 커넥터 동기화 스케줄 러너 (202차).
 *
 * Connectors::runSync 의 코어를 광고 자격증명 보유 전 테넌트에 대해 실행한다.
 * HTTP 핸들러(POST /v423/connectors/sync)가 온디맨드/저장직후 동기화라면,
 * 본 CLI 는 cron 으로 주기 동기화하여 performance_metrics 를 최신 상태로 유지한다.
 *
 * 성격: 자격증명만 등록하면 자동 연동되도록 하는 "마지막 1cm". 프론트 저장 직후
 *       1회 즉시 동기화(AdChannelConnect)와 본 cron 의 주기 동기화가 함께
 *       AdPerformance/Alerting/대시보드의 실데이터 적재를 보장한다.
 *
 * Usage:
 *   php backend/bin/connectors_sync_cron.php [--days=N] [--channels=meta,google,tiktok] [--tenant=<id>]
 *
 * 기본: 최근 7일, 채널 meta,google,tiktok, 현재 GENIE_ENV 테넌트 전체.
 *
 * crontab 예시(운영/데모 분리 — fetcher 가 GENIE_ENV 기반 Db::pdo() 사용):
 *   0 * * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/connectors_sync_cron.php --days=7 >> /var/log/genie_conn_sync.log 2>&1
 *   5 * * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/connectors_sync_cron.php --days=7 >> /var/log/genie_conn_sync_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Connectors;

$args       = array_slice($argv, 1);
$days       = 7;
$channels   = ['meta', 'google', 'tiktok'];
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--days=(\d+)$/', $a, $m)) {
        $days = max(1, min(90, (int)$m[1]));
    } elseif (preg_match('/^--channels=(.+)$/', $a, $m)) {
        $ch = array_filter(array_map('trim', explode(',', strtolower($m[1]))));
        if ($ch) $channels = $ch;
    } elseif (preg_match('/^--tenant=(.+)$/', $a, $m)) {
        $onlyTenant = $m[1];
    }
}

$end   = date('Y-m-d');
$start = date('Y-m-d', strtotime("-{$days} days"));

try {
    $tenants = ($onlyTenant !== null && $onlyTenant !== '')
        ? [$onlyTenant]
        : Connectors::tenantsWithAdCreds();

    echo "=== connectors_sync env=" . Db::env() . " tenants=" . count($tenants)
        . " window={$start}~{$end} channels=" . implode(',', $channels) . "\n";

    $totalPersisted = 0;
    foreach ($tenants as $tenant) {
        $r = Connectors::runSync($tenant, $start, $end, $channels);
        $p = (int)($r['persisted'] ?? 0);
        $totalPersisted += $p;
        $parts = [];
        foreach (($r['channels'] ?? []) as $ch => $info) {
            $parts[] = $ch . ':' . ($info['status'] ?? '?') . (isset($info['rows']) ? '(' . $info['rows'] . ')' : '');
        }
        if ($p > 0 || $parts) {
            echo "  [{$tenant}] persisted={$p} " . implode(' ', $parts) . "\n";
        }
    }
    echo "  → total persisted={$totalPersisted}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[connectors_sync_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
