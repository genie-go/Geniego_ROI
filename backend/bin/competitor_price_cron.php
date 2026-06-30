#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [255차 심화] 경쟁가 자동수집 독립 스케줄 러너 — Prisync/Feedvisor 정합.
 *
 * PriceOpt::harvestCompetitorsCli 를 상품 보유 전 테넌트(리프라이서 규칙 무관)에 주기 실행.
 * 기존엔 repricer_cron 이 '규칙 보유 테넌트'에만 편승 수집 → 규칙 없는 테넌트는 경쟁가 미수집이었음(델타 해소).
 * naver_shopping 최저가 API curl(자격 미등록 시 graceful no-op). po_competitors 갱신 → 리프라이싱·BuyBox 판단 신선도↑.
 *
 * Usage: php backend/bin/competitor_price_cron.php [--tenant=<id>]
 * crontab(경쟁가 변동 추적·운영 매시/데모 2시간):
 *   15 * * * *    GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/competitor_price_cron.php >> /var/log/genie_comp_price.log 2>&1
 *   25 *\/2 * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/competitor_price_cron.php >> /var/log/genie_comp_price_demo.log 2>&1
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\PriceOpt;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) { if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]); }

try {
    $env = Db::env();
    $tenants = PriceOpt::tenantsWithPriceProducts();
    if ($env === 'production') { $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo' && strncmp($t, 'demo', 4) !== 0)); }
    if ($onlyTenant !== null && $onlyTenant !== '') { $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant)); }
    $updated = 0; $okT = 0;
    foreach ($tenants as $t) {
        try { $r = PriceOpt::harvestCompetitorsCli((string)$t); $updated += (int)($r['updated'] ?? 0); $okT++; }
        catch (\Throwable $e) { fwrite(STDERR, "[competitor_price_cron] tenant {$t}: " . $e->getMessage() . "\n"); }
    }
    fwrite(STDOUT, sprintf("[%s] competitor_price env=%s tenants=%d updated=%d\n", gmdate('Y-m-d H:i:s'), $env, $okT, $updated));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[competitor_price_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
