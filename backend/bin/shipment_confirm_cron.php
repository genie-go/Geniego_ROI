#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [283차 GAP-2] 채널 발송처리(송장 전송) 큐 러너.
 *
 * 배경(부재증명): 백엔드 전체에 waybill|shipping_label|발송처리|shipment_confirm 0건.
 *   WMS 피킹으로 물리 출고가 끝나도 그 사실이 판매 채널로 돌아가지 않아, 구매자 화면의 주문은
 *   영원히 "배송준비중"이었다(커머스 outbound 루프의 두 번째 미폐쇄 구간).
 *
 * 283차부터:
 *   생산자 = Wms::savePicking(송장 입력 후 shipped 전이) · Logistics::track(송장 등록) · POST /wms/shipments
 *   큐      = channel_shipment_job(테넌트 격리·멱등)
 *   소비    = ChannelSync::processShipmentQueue (본 러너 + POST /wms/shipments/process 수동 플러시)
 *
 * ★정직성: 실 API 스펙이 확정된 채널만 실전송한다 — shopify / woocommerce / magento / ebay.
 *   나머지는 'no-live-adapter' honest pending 으로 남는다(추측 API 를 지어내 "성공"을 반환하지 않는다).
 *   송장은 큐에 보존되므로 어댑터가 추가되는 순간 자동 전송된다.
 *
 * Usage:
 *   php backend/bin/shipment_confirm_cron.php [--tenant=<id>] [--channel=<ch>] [--limit=100]
 *
 * crontab 예시:
 *   *\/10 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/shipment_confirm_cron.php >> /var/log/genie_shipment.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\ChannelSync;

$onlyTenant  = null;
$onlyChannel = null;
$limit       = 100;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m))      $onlyTenant = trim($m[1]);
    elseif (preg_match('/^--channel=(.+)$/', $a, $m)) $onlyChannel = strtolower(trim($m[1]));
    elseif (preg_match('/^--limit=(\d+)$/', $a, $m))  $limit = max(1, min(500, (int)$m[1]));
}

try {
    $env = Db::env();
    $pdo = Db::pdo();
    ChannelSync::ensureShipmentTables($pdo);

    // 미종결(queued/awaiting_credentials/pending) 잡 보유 테넌트만 — 빈 테넌트 불필요 호출 방지.
    //   'pending' 포함 = 어댑터 미보유로 대기 중인 송장. 어댑터가 배포되는 순간 다음 틱에 자동 전송된다.
    $tenants = [];
    try {
        $rows = $pdo->query("SELECT DISTINCT tenant_id FROM channel_shipment_job WHERE status IN ('queued','awaiting_credentials','pending')")->fetchAll(\PDO::FETCH_COLUMN);
        $tenants = array_values(array_filter(array_map('strval', $rows), static fn($t) => $t !== ''));
    } catch (\Throwable $e) {
        $tenants = []; // 발송처리 잡 0건 — 정상
    }
    if ($env === 'production') {
        $tenants = array_values(array_filter($tenants, static fn($t) => $t !== 'demo'));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, static fn($t) => $t === $onlyTenant));
    }

    echo "=== shipment_confirm env={$env} tenants=" . count($tenants) . " live_adapters=" . implode(',', ChannelSync::shipLiveChannels()) . "\n";

    $agg = ['processed' => 0, 'done' => 0, 'awaiting' => 0, 'pending' => 0, 'failed' => 0];
    $errors = 0;
    foreach ($tenants as $t) {
        try {
            $s = ChannelSync::processShipmentQueue($pdo, $t, $onlyChannel, $limit);
            foreach (['processed', 'done', 'awaiting', 'pending', 'failed'] as $k) { $agg[$k] += (int)($s[$k] ?? 0); }
            echo "  [{$t}] processed={$s['processed']} done={$s['done']} awaiting={$s['awaiting']} pending={$s['pending']} failed={$s['failed']}\n";
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    // pending = 어댑터 미보유(honest). 실패가 아니며 재시도 카운트를 소모하지 않는다.
    echo "  → processed={$agg['processed']} done={$agg['done']} awaiting_creds={$agg['awaiting']} pending(no-live-adapter)={$agg['pending']} failed={$agg['failed']} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[shipment_confirm_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
