#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 과거 주문 어트리뷰션 소급(backfill) — 일회성 도구 (229차, 228 잔여 #4).
 *
 * S3(228차 bcc89c6) 이전 적재된 주문은 attribution_result 가 생성되지 않아 markov 가
 * 비전환 여정으로 로드(전환 과소 집계)했다. 본 도구는 각 테넌트의 attribution_result 누락
 * 주문에 라이브 신규주문과 동일한 귀속(commerce-last-touch / 광고 order-match)을 멱등 소급한다.
 *
 *   • attribution 전용: 재고/CRM/WMS 부수효과는 재생하지 않음(이중반영 방지). 귀속 신호만 보강.
 *   • 멱등: ChannelSync::backfillAttribution 내부 헬퍼가 존재체크 후 INSERT → 재실행 안전.
 *   • 취소/반품 주문 제외(라이브 경로 정합). 데모 테넌트 제외.
 *
 * Usage:
 *   php backend/bin/attribution_backfill.php [--tenant=<id>] [--limit=<n>] [--dry]
 *     --tenant : 특정 테넌트만(미지정 시 channel_orders 보유 전 테넌트).
 *     --limit  : 테넌트당 스캔 상한(기본 50000, 0=무제한).
 *     --dry    : 대상 테넌트/주문수만 보고하고 쓰지 않음.
 *
 * 실행 후: markov 모델 캐시는 attribution_cron.php(*\/30) 가 다음 주기에 재계산하거나,
 *   즉시 반영하려면 `GENIE_ENV=<env> php backend/bin/attribution_cron.php` 1회 실행.
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\ChannelSync;

$onlyTenant = null;
$limit      = 50000;
$dry        = false;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
    elseif (preg_match('/^--limit=(\d+)$/', $a, $m)) $limit = (int)$m[1];
    elseif ($a === '--dry') $dry = true;
}

try {
    $env = Db::env();
    $pdo = Db::pdo();

    // 대상 테넌트 — channel_orders 보유 테넌트(운영은 demo 제외).
    $tenants = [];
    try {
        $rows = $pdo->query("SELECT DISTINCT tenant_id FROM channel_orders")->fetchAll(\PDO::FETCH_COLUMN);
        $tenants = array_values(array_filter(array_map('strval', $rows), fn($t) => $t !== '' && $t !== 'demo'));
    } catch (\Throwable $e) {
        $tenants = [];
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant));
    }

    echo "=== attribution_backfill env={$env} tenants=" . count($tenants) . ($dry ? " [DRY]" : "") . "\n";

    $totalEnriched = 0; $totalSkipped = 0; $totalScanned = 0; $errors = 0;
    foreach ($tenants as $t) {
        if ($dry) {
            // 누락 주문수만 집계(쓰기 없음).
            try {
                $st = $pdo->prepare(
                    "SELECT COUNT(*) FROM channel_orders co WHERE co.tenant_id=? AND co.channel_order_id<>'' "
                  . "AND NOT EXISTS (SELECT 1 FROM attribution_result ar WHERE ar.tenant_id=co.tenant_id AND ar.order_id=co.channel_order_id)");
                $st->execute([$t]);
                $miss = (int)$st->fetchColumn();
            } catch (\Throwable $e) { $miss = -1; }
            echo "  [{$t}] missing_attribution≈{$miss}\n";
            continue;
        }
        try {
            $s = ChannelSync::backfillAttribution($pdo, $t, $limit);
            $totalEnriched += $s['enriched']; $totalSkipped += $s['skipped_cr']; $totalScanned += $s['scanned'];
            echo "  [{$t}] scanned={$s['scanned']} enriched={$s['enriched']} skipped_cr={$s['skipped_cr']}\n";
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    if (!$dry) echo "  → scanned={$totalScanned} enriched={$totalEnriched} skipped_cr={$totalSkipped} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[attribution_backfill] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
