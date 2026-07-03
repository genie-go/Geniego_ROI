#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * SNS 라이브 채널 통계 동기화 스케줄 러너 [현 차수].
 *
 * Connectors::syncSnsLiveForTenant 코어를 SNS 라이브 자격증명(YouTube/Instagram/Facebook/Twitch) 보유
 * 전 테넌트에 대해 실행한다. ad/commerce/pg/물류/리뷰/cs/esp 커넥터처럼 "저장 직후 1회(syncSnsLiveOnSave) +
 * 주기 cron" 이중 경로를 완성 — 저장 직후 트리거가 무음 실패해도 본 cron 이 sns_channel_stats 를 자가치유한다.
 *
 * Usage:  php backend/bin/sns_live_sync_cron.php [--tenant=<id>]
 * crontab(운영/데모 분리 · fetcher 가 GENIE_ENV 기반 Db::pdo() 사용):
 *   50 * * * *  GENIE_ENV=production php .../backend/bin/sns_live_sync_cron.php >> /var/log/genie_sns_live.log 2>&1
 *   53 * * * *  GENIE_ENV=demo       php .../backend/bin/sns_live_sync_cron.php >> /var/log/genie_sns_live_demo.log 2>&1
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Connectors;

$onlyTenant = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = $m[1];
}

try {
    $tenants = ($onlyTenant !== null && $onlyTenant !== '')
        ? [$onlyTenant]
        : Connectors::tenantsWithSnsLiveCreds();
    echo "=== sns_live_sync env=" . Db::env() . " tenants=" . count($tenants) . "\n";
    $synced = 0;
    foreach ($tenants as $tenant) {
        $r = Connectors::syncSnsLiveForTenant($tenant);
        foreach ($r as $ch => $info) {
            if (!empty($info['synced'])) { $synced++; echo "  [{$tenant}] {$ch}: synced followers=" . (int)($info['followers'] ?? 0) . "\n"; \Genie\Handlers\ChannelCreds::stampSyncStatus(Db::pdo(), $tenant, (string)$ch, true); } // [263차 관측성]
            elseif (!empty($info['error'])) { \Genie\Handlers\ChannelCreds::stampSyncStatus(Db::pdo(), $tenant, (string)$ch, false); }
        }
    }
    echo "  → total channels synced={$synced}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[sns_live_sync_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
