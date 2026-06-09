#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 커머스 채널 동기화 스케줄 러너 (206차 #1).
 *
 * ChannelSync::syncTenantChannel 코어를 커머스 자격증명 보유 전 테넌트×채널에 대해 실행한다.
 * HTTP 핸들러(POST /api/channel-sync/{channel}/sync)가 온디맨드/저장직후 동기화이고,
 * webhook(POST /api/channel-sync/webhooks/{ch}) 가 실시간 푸시라면,
 * 본 CLI 는 cron 으로 주기 폴링하여 channel_orders / channel_products / channel_inventory 를
 * 최신 상태로 유지한다(webhook 미지원 채널·누락 이벤트 백업).
 *
 * 광고용 connectors_sync_cron.php 가 performance_metrics 전용이라면, 본 러너는 커머스 주문/재고 전용.
 *
 * Usage:
 *   php backend/bin/commerce_sync_cron.php [--channels=shopify,naver] [--tenant=<id>]
 *
 * 기본: 현재 GENIE_ENV 의 활성 커머스 자격증명 전 테넌트×채널.
 *   --channels  지정 시 해당 채널로 한정(커머스 화이트리스트 교집합).
 *   --tenant    지정 시 해당 테넌트로 한정.
 *
 * crontab 예시(운영/데모 분리 — Db::pdo() 가 GENIE_ENV 기반 env DB 사용):
 *   *\/5 * * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/commerce_sync_cron.php >> /var/log/genie_commerce_sync.log 2>&1
 *   *\/7 * * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/commerce_sync_cron.php >> /var/log/genie_commerce_sync_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\ChannelSync;

$args        = array_slice($argv, 1);
$onlyTenant  = null;
$onlyChannels = null;
foreach ($args as $a) {
    if (preg_match('/^--channels=(.+)$/', $a, $m)) {
        $ch = array_filter(array_map('trim', explode(',', strtolower($m[1]))));
        if ($ch) $onlyChannels = $ch;
    } elseif (preg_match('/^--tenant=(.+)$/', $a, $m)) {
        $onlyTenant = trim($m[1]);
    }
}

try {
    $env   = Db::env();
    $pairs = ChannelSync::commerceTenantChannels();

    // 운영 환경에서는 'demo' 테넌트(데모 시드)를 폴링 대상에서 제외 — 운영 DB 가짜데이터 생성 방지.
    if ($env === 'production') {
        $pairs = array_values(array_filter($pairs, fn($p) => ($p['tenant_id'] ?? '') !== 'demo'));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $pairs = array_values(array_filter($pairs, fn($p) => ($p['tenant_id'] ?? '') === $onlyTenant));
    }
    if ($onlyChannels !== null) {
        $pairs = array_values(array_filter($pairs, fn($p) => in_array(strtolower((string)($p['channel'] ?? '')), $onlyChannels, true)));
    }

    echo "=== commerce_sync env={$env} pairs=" . count($pairs)
        . " channels=" . ($onlyChannels ? implode(',', $onlyChannels) : 'all') . "\n";

    $totalProducts = 0;
    $totalOrders   = 0;
    $errors        = 0;
    foreach ($pairs as $p) {
        $tenant  = (string)($p['tenant_id'] ?? '');
        $channel = (string)($p['channel'] ?? '');
        if ($tenant === '' || $channel === '') continue;
        try {
            $r = ChannelSync::syncTenantChannel($tenant, $channel, 'pro');
            $pc = (int)($r['product_count'] ?? 0);
            $oc = (int)($r['order_count'] ?? 0);
            $totalProducts += $pc;
            $totalOrders   += $oc;
            $ok = ($r['ok'] ?? false) ? 'ok' : 'error';
            if (!($r['ok'] ?? false)) $errors++;
            $note = $r['error'] ?? $r['note'] ?? '';
            echo "  [{$tenant}] {$channel}: {$ok} products={$pc} orders={$oc}" . ($note ? " ({$note})" : '') . "\n";
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$tenant}] {$channel}: EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → total products={$totalProducts} orders={$totalOrders} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[commerce_sync_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
