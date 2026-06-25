#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [현 차수 P2] Google Ads 서버 전환 업로드 워커.
 *
 * 최근 주문 중 gclid 보유 건을 Google Ads Offline Conversion Import(uploadClickConversions)로
 * 업로드한다 — 쿠키리스·iOS 환경에서 클릭→전환 귀属 보강. 멱등(gads_conversion_log)·자격증명 게이트
 * (developer_token/access_token/customer_id/conversion_action 미설정 테넌트는 즉시 skip).
 *
 * Usage:  php backend/bin/gads_conversion_cron.php [--tenant=<id>] [--days=N]
 *
 * crontab(운영/데모 분리 — Db 가 GENIE_ENV 기반 env DB 사용):
 *   *\/30 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/gads_conversion_cron.php >> /var/log/genie_gads_conv.log 2>&1
 *   *\/37 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/gads_conversion_cron.php >> /var/log/genie_gads_conv_demo.log 2>&1
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\AdAdapters;

$args = array_slice($argv, 1);
$onlyTenant = null; $days = 7;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
    elseif (preg_match('/^--days=(\d+)$/', $a, $m)) $days = max(1, min(30, (int)$m[1]));
}

try {
    $pdo = Db::pdo();
    $cut = gmdate('Y-m-d H:i:s', time() - $days * 86400);
    if ($onlyTenant !== null) {
        $tenants = [$onlyTenant];
    } else {
        $tenants = [];
        try { $tenants = $pdo->query("SELECT DISTINCT tenant_id FROM channel_orders WHERE raw_json LIKE '%gclid%' AND ordered_at >= " . $pdo->quote($cut))->fetchAll(PDO::FETCH_COLUMN); } catch (\Throwable $e) {}
    }
    $up = 0; $fail = 0; $active = 0;
    foreach ($tenants as $t) {
        $r = AdAdapters::uploadPendingGoogleConversions($pdo, (string)$t, $days);
        if (($r['status'] ?? '') === 'no_credentials') continue; // 자격증명 미설정 테넌트
        $active++;
        $up += (int)($r['uploaded'] ?? 0);
        $fail += (int)($r['failed'] ?? 0);
    }
    fwrite(STDOUT, sprintf("[%s] gads_conversion: tenants=%d active=%d uploaded=%d failed=%d\n", gmdate('Y-m-d H:i:s'), count($tenants), $active, $up, $fail));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[gads_conversion_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
