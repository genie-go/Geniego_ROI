#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 웹 분석 인바운드 동기화 스케줄 러너 (P1 커넥터 폭).
 *
 * Connectors::runSync 코어를 웹 분석 자격증명(GA4·Adobe Analytics) 보유 전 테넌트에 대해 실행한다.
 * 광고 커넥터(connectors_sync_cron.php / AD_SHORT)와 분리된 별도 cron — 웹 분석 소스는
 * performance_metrics 가 아닌 web_analytics_metrics 로 적재되며(runSync 라우팅), ROAS 와 무관하다.
 *
 * "자격증명만 등록하면 자동 연동"의 마지막 1cm: 저장 직후 1회(ChannelCreds → syncAnalyticsOnSave)와
 * 본 cron 의 주기 동기화가 함께 web_analytics_metrics 를 최신 상태로 유지한다.
 *
 * Usage:
 *   php backend/bin/analytics_sync_cron.php [--days=N] [--sources=ga4,adobe_analytics] [--tenant=<id>]
 *
 * 기본: 최근 28일, 소스=analyticsSources() 전체, 현재 GENIE_ENV 테넌트 전체.
 *
 * crontab 예시(운영/데모 분리 — fetcher 가 GENIE_ENV 기반 Db::pdo() 사용):
 *   15 * * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/analytics_sync_cron.php --days=28 >> /var/log/genie_analytics_sync.log 2>&1
 *   20 * * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/analytics_sync_cron.php --days=28 >> /var/log/genie_analytics_sync_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Connectors;

$args       = array_slice($argv, 1);
$days       = 28;
$sources    = Connectors::analyticsSources();
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--days=(\d+)$/', $a, $m)) {
        $days = max(1, min(365, (int)$m[1]));
    } elseif (preg_match('/^--sources=(.+)$/', $a, $m)) {
        $s = array_filter(array_map('trim', explode(',', strtolower($m[1]))));
        if ($s) $sources = $s;
    } elseif (preg_match('/^--tenant=(.+)$/', $a, $m)) {
        $onlyTenant = $m[1];
    }
}

$end   = date('Y-m-d');
$start = date('Y-m-d', strtotime("-{$days} days"));

try {
    $tenants = ($onlyTenant !== null && $onlyTenant !== '')
        ? [$onlyTenant]
        : Connectors::tenantsWithAnalyticsCreds();

    echo "=== analytics_sync env=" . Db::env() . " tenants=" . count($tenants)
        . " window={$start}~{$end} sources=" . implode(',', $sources) . "\n";

    $totalPersisted = 0;
    foreach ($tenants as $tenant) {
        $r = Connectors::runSync($tenant, $start, $end, $sources);
        $p = (int)($r['persisted'] ?? 0);
        $totalPersisted += $p;
        $parts = [];
        foreach (($r['channels'] ?? []) as $ch => $info) {
            $st = $info['status'] ?? '';
            // [263차 관측성] 채널 동기화 상태 stamp(cron 반복 실패도 UI 연결상태에 반영). skipped 는 미stamp.
            if ($st === 'ok' || $st === 'error') { \Genie\Handlers\ChannelCreds::stampSyncStatus(Db::pdo(), $tenant, (string)$ch, $st === 'ok'); }
            $parts[] = $ch . ':' . ($st ?: '?') . (isset($info['rows']) ? '(' . $info['rows'] . ')' : '');
        }
        if ($p > 0 || $parts) {
            echo "  [{$tenant}] persisted={$p} " . implode(' ', $parts) . "\n";
        }
    }
    echo "  → total persisted={$totalPersisted}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[analytics_sync_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
