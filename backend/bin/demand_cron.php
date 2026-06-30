#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [255차 심화] 수요예측 자동발주 스케줄 러너 — Inventory Planner 정합(버튼 전용→스케줄형).
 *
 * DemandForecast::autoReplenishForTenant 코어를 재고/주문 데이터 보유 전 테넌트에 주기 실행.
 * Holt-Winters 계절성 예측 + ABC 차등 안전재고 + 리오더포인트 → wms_supply_orders 'suggested' 멱등 생성.
 *
 * Usage: php backend/bin/demand_cron.php [--tenant=<id>]
 * crontab(일 1회 권장):
 *   20 6 * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/demand_cron.php >> /var/log/genie_demand.log 2>&1
 *   23 6 * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/demand_cron.php >> /var/log/genie_demand_demo.log 2>&1
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\DemandForecast;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) { if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]); }

try {
    $env = Db::env();
    $tenants = DemandForecast::tenantsForReplenish();
    if ($env === 'production') { $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo' && strncmp($t, 'demo', 4) !== 0)); }
    if ($onlyTenant !== null && $onlyTenant !== '') { $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant)); }
    $totalOrders = 0; $okT = 0;
    foreach ($tenants as $t) {
        try { $created = DemandForecast::autoReplenishForTenant((string)$t); $totalOrders += count($created); $okT++; }
        catch (\Throwable $e) { fwrite(STDERR, "[demand_cron] tenant {$t}: " . $e->getMessage() . "\n"); }
    }
    fwrite(STDOUT, sprintf("[%s] demand env=%s tenants=%d orders_suggested=%d\n", gmdate('Y-m-d H:i:s'), $env, $okT, $totalOrders));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[demand_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
