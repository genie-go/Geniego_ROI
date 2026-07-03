#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 외부 ESP(이메일 발송 플랫폼) 인바운드 동기화 스케줄 러너 (P1 커넥터 폭).
 *
 * Connectors::runEspSync 코어를 ESP 자격증명(Mailchimp·Klaviyo·SendGrid) 보유 전 테넌트에 대해
 * 실행한다. ad/commerce/pg/물류/리뷰 커넥터처럼 "저장 직후 1회(syncEspOnSave) + 주기 cron"
 * 이중 경로를 완성 — 저장 직후 트리거가 무음 실패해도 본 cron 이 esp_metrics 를 자가치유한다.
 *
 * Usage:
 *   php backend/bin/esp_sync_cron.php [--days=N] [--sources=mailchimp,klaviyo] [--tenant=<id>]
 *
 * 기본: 최근 28일, 소스=espSources() 전체, 현재 GENIE_ENV 테넌트 전체.
 *
 * crontab(운영/데모 분리 — fetcher 가 GENIE_ENV 기반 Db::pdo() 사용):
 *   25 * * * *  GENIE_ENV=production php .../backend/bin/esp_sync_cron.php --days=28 >> /var/log/genie_esp_sync.log 2>&1
 *   28 * * * *  GENIE_ENV=demo       php .../backend/bin/esp_sync_cron.php --days=28 >> /var/log/genie_esp_sync_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Connectors;

$args       = array_slice($argv, 1);
$days       = 28;
$sources    = Connectors::espSources();
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
        : Connectors::tenantsWithEspCreds();

    echo "=== esp_sync env=" . Db::env() . " tenants=" . count($tenants)
        . " window={$start}~{$end} sources=" . implode(',', $sources) . "\n";

    $totalPersisted = 0;
    foreach ($tenants as $tenant) {
        $r = Connectors::runEspSync($tenant, $start, $end, $sources);
        $p = (int)($r['persisted'] ?? 0);
        $totalPersisted += $p;
        $parts = [];
        foreach (($r['channels'] ?? []) as $ch => $info) {
            $st = $info['status'] ?? '';
            if ($st === 'ok' || $st === 'error') { \Genie\Handlers\ChannelCreds::stampSyncStatus(Db::pdo(), $tenant, (string)$ch, $st === 'ok'); } // [263차 관측성]
            $parts[] = $ch . ':' . ($st ?: '?') . (isset($info['rows']) ? '(' . $info['rows'] . ')' : '');
        }
        if ($p > 0 || $parts) {
            echo "  [{$tenant}] persisted={$p} " . implode(' ', $parts) . "\n";
        }
    }
    echo "  → total persisted={$totalPersisted}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[esp_sync_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
