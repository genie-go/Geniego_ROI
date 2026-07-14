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

/* [283차 R2 P1-4] ★단일 인스턴스 락 — 10분 주기 크론이 앞 회차가 끝나기 전에 겹쳐 뜨면(대량 드리프트 시 흔하다)
   같은 잡을 두 프로세스가 집어 채널에 재고를 **중복 push** 한다. 큐 소비 자체는 CAS(잡 선점)로도 막히지만,
   러너 레벨에서도 겹치지 않게 해 reconcile 스캔이 이중으로 도는 것까지 막는다. 획득 실패 = 조용히 정상 종료. */
$lockPath = sys_get_temp_dir() . '/genie_stock_sync_' . md5(__DIR__ . '|' . (string)$onlyTenant) . '.lock';
$lockFp = @fopen($lockPath, 'c');
if ($lockFp === false) { fwrite(STDERR, "[stock_sync_cron] lock 파일 생성 실패: {$lockPath}\n"); exit(1); }
if (!flock($lockFp, LOCK_EX | LOCK_NB)) {
    echo "=== stock_sync SKIP — 이전 회차가 아직 실행 중입니다(중복 전송 방지)\n";
    exit(0);
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

    /* [283차 R2 P0-1] ★재고 전용 어댑터 커버리지를 매 회차 명시한다.
       "재고가 done 인데 채널은 그대로"였던 가짜 성공을 없앤 대신, 어느 채널이 **실제로 전송되고** 어느 채널이
       **보류(honest pending)** 인지 운영자가 로그만 보고 알 수 있어야 한다. 보류 채널의 잡은 큐에 그대로 남아
       어댑터가 추가되는 순간 자동 전송된다(유실 0). */
    $listedChannels = [];
    try {
        $rows = $pdo->query("SELECT DISTINCT channel FROM catalog_listing WHERE channel <> ''")->fetchAll(\PDO::FETCH_COLUMN);
        $listedChannels = array_values(array_unique(array_map(static fn($c) => strtolower(trim((string)$c)), $rows)));
        sort($listedChannels);
    } catch (\Throwable $e) { /* 리스팅 0건 */ }
    $live = array_values(array_filter($listedChannels, static fn($c) => Catalog::hasStockAdapter($c)));
    $hold = array_values(array_filter($listedChannels, static fn($c) => !Catalog::hasStockAdapter($c)));
    echo "  재고 실전송 채널(live): " . ($live ? implode(', ', $live) : '(없음)') . "\n";
    echo "  재고 보류 채널(no-live-stock-adapter · 큐 보존 · done 마감 안 함): " . ($hold ? implode(', ', $hold) : '(없음)') . "\n";

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
    echo "  ※ done = 채널 재고 API 가 실제로 2xx 를 준 건수만(가짜 성공 0). pending = 어댑터 미보유/미등록 → 큐 보존.\n";
    flock($lockFp, LOCK_UN); fclose($lockFp);
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[stock_sync_cron] FAILED: " . $e->getMessage() . "\n");
    flock($lockFp, LOCK_UN); fclose($lockFp);
    exit(1);
}
