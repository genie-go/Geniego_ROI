#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [267차] 디지털 셸프 라이브 순위/SoS 자동수집 독립 스케줄 러너.
 *
 * DigitalShelf::harvestAllForTenant 를 셸프 키워드 보유 전 테넌트에 주기 실행.
 * Naver 쇼핑/쿠팡 검색순위 API curl(자격 미등록·brand 미설정 시 graceful no-op, 무날조).
 * digital_shelf_keyword 의 our_sos/comp_sos/rank 갱신 → SoS 추적 신선도↑(수동입력→자동).
 * competitor_price_cron.php 와 동형(패턴 정합).
 *
 * Usage: php backend/bin/shelf_rank_cron.php [--tenant=<id>]
 * crontab(운영 매시/데모 2시간):
 *   35 * * * *    GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/shelf_rank_cron.php >> /var/log/genie_shelf_rank.log 2>&1
 *   45 *\/2 * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/shelf_rank_cron.php >> /var/log/genie_shelf_rank_demo.log 2>&1
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\DigitalShelf;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) { if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]); }

try {
    $env = Db::env();
    $tenants = DigitalShelf::tenantsWithShelfKeywords();
    if ($env === 'production') { $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo' && strncmp($t, 'demo', 4) !== 0)); }
    if ($onlyTenant !== null && $onlyTenant !== '') { $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant)); }
    $harvested = 0; $okT = 0;
    foreach ($tenants as $t) {
        try { $r = DigitalShelf::harvestAllForTenant((string)$t); $harvested += (int)($r['harvested'] ?? 0); $okT++; }
        catch (\Throwable $e) { fwrite(STDERR, "[shelf_rank_cron] tenant {$t}: " . $e->getMessage() . "\n"); }
    }
    fwrite(STDOUT, sprintf("[%s] shelf_rank env=%s tenants=%d harvested=%d\n", gmdate('Y-m-d H:i:s'), $env, $okT, $harvested));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[shelf_rank_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
