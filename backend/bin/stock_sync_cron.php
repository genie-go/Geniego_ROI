#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [283차 GAP-1] 재고 드리프트 보정 러너 — wms_stock(실물) ↔ 채널 가용재고 정합.
 *
 * 배경(부재증명): `grep -l "wms_stock" backend/bin/` → 0건.
 *   재고는 pull-at-push 였다 — Catalog::writeback 이 **사용자가 버튼을 누를 때만** wms_stock.on_hand 를
 *   읽어갔고, 입고·재고조정·오프라인 판매로 실물이 변해도 채널 가용재고는 영영 그대로였다(초과판매의 근원).
 *
 * 283차부터 재고 변동의 단일 chokepoint(Wms::recordMovement)가 커밋 직후 채널 writeback 큐에 델타를
 * 자동 적재한다(실시간 경로). 본 러너는 그 **백업/자가치유** 경로다:
 *   ① Wms::reconcileChannelStock — 실물과 채널 리스팅 재고가 어긋난 SKU 를 찾아 재적재
 *      (프로세스 크래시·잡 유실·수동 DB 조작으로 델타 훅이 누락된 건을 주기적으로 복구).
 *   ② Catalog::processWritebackQueue — 적재된 stock_sync 잡을 실제 채널로 push
 *      (writeback_cron 과 동일 코어. 재고는 가격보다 시급하므로 별도 주기로 즉시 소비한다).
 *
 * 안전:
 *   - 데모 테넌트 skip(Wms 내부 가드) · 운영 env 에서 'demo' 테넌트 제외.
 *   - 채널에 **등록된 적 없는** SKU 는 잡을 만들지 않는다(신규등록 오시도 방지 — Wms::channelListed).
 *   - 자격증명 미등록 채널은 awaiting_credentials 보류(등록 즉시 자동 재개).
 *
 * Usage:
 *   php backend/bin/stock_sync_cron.php [--tenant=<id>] [--limit=500] [--no-push]
 *
 * crontab 예시:
 *   *\/10 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/stock_sync_cron.php >> /var/log/genie_stock_sync.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Wms;
use Genie\Handlers\Catalog;

$onlyTenant = null;
$limit      = 500;
$noPush     = false;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m))     $onlyTenant = trim($m[1]);
    elseif (preg_match('/^--limit=(\d+)$/', $a, $m)) $limit = max(1, min(2000, (int)$m[1]));
    elseif ($a === '--no-push')                      $noPush = true;
}

try {
    $env = Db::env();
    $pdo = Db::pdo();

    // 채널 리스팅을 보유한 테넌트만(= 푸시 대상이 있는 테넌트). 없으면 처리할 것 없음.
    $tenants = [];
    try {
        $rows = $pdo->query("SELECT DISTINCT tenant_id FROM catalog_listing WHERE sku <> ''")->fetchAll(\PDO::FETCH_COLUMN);
        $tenants = array_values(array_filter(array_map('strval', $rows), static fn($t) => $t !== ''));
    } catch (\Throwable $e) {
        $tenants = []; // catalog_listing 미존재(채널 등록 0건) — 정상
    }
    if ($env === 'production') {
        $tenants = array_values(array_filter($tenants, static fn($t) => $t !== 'demo'));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, static fn($t) => $t === $onlyTenant));
    }

    echo "=== stock_sync env={$env} tenants=" . count($tenants) . "\n";

    $agg = ['scanned' => 0, 'enqueued' => 0, 'done' => 0, 'awaiting' => 0, 'pending' => 0, 'failed' => 0];
    $errors = 0;
    foreach ($tenants as $t) {
        try {
            $rc = Wms::reconcileChannelStock($t, $limit);
            $agg['scanned']  += (int)$rc['scanned'];
            $agg['enqueued'] += (int)$rc['enqueued'];
            $line = "  [{$t}] drift_scanned={$rc['scanned']} enqueued={$rc['enqueued']}";
            if (!$noPush) {
                $s = Catalog::processWritebackQueue($pdo, $t, null, 200);
                foreach (['done', 'awaiting', 'pending', 'failed'] as $k) { $agg[$k] += (int)($s[$k] ?? 0); }
                $line .= " | push done={$s['done']} awaiting={$s['awaiting']} pending={$s['pending']} failed={$s['failed']}";
            }
            echo $line . "\n";
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → scanned={$agg['scanned']} enqueued={$agg['enqueued']} done={$agg['done']} awaiting={$agg['awaiting']} pending={$agg['pending']} failed={$agg['failed']} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[stock_sync_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
