#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [237차] 다이내믹 리프라이서 스케줄 러너 — 닫힌 루프 자동화.
 *
 * PriceOpt::repriceForTenant 코어를 활성 리프라이서 규칙 보유 전 테넌트에 대해 실행한다.
 * HTTP 핸들러(POST /v420/price/repricer/run)가 온디맨드 실행이라면, 본 CLI 는 cron 으로 주기 실행해
 * 경쟁사 가격(po_competitors) 변동에 맞춰 자동 리프라이싱(이력 기록·가격 갱신)한다.
 * ★PriceOpt 는 backend/data/priceopt.sqlite 영속(운영/데모 backend 분리=파일 자동 분리).
 *
 * Usage:
 *   php backend/bin/repricer_cron.php [--tenant=<id>]
 *
 * crontab 예시(가격은 분단위로 안 바뀌므로 저빈도 — 운영 매 30분/데모 매시):
 *   *\/30 * * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/repricer_cron.php >> /var/log/genie_repricer.log 2>&1
 *   7 * * * *      GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/repricer_cron.php >> /var/log/genie_repricer_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\PriceOpt;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $env = Db::env();
    $tenants = PriceOpt::tenantsWithActiveRepricerRules();
    // 운영 환경: 'demo' 테넌트(데모 시드) 제외 — 운영 데이터 오염 방지.
    if ($env === 'production') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo' && strncmp($t, 'demo', 4) !== 0));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant));
    }

    echo "=== repricer env={$env} tenants=" . count($tenants) . "\n";
    $totalChanges = 0; $errors = 0;
    foreach ($tenants as $t) {
        try {
            $r = PriceOpt::repriceForTenant($t);
            $ch = (int)($r['changes_applied'] ?? 0);
            $totalChanges += $ch;
            echo "  [{$t}] rules={$r['rules_run']} evaluated={$r['skus_evaluated']} changes={$ch}\n";
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → total changes={$totalChanges} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[repricer_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
