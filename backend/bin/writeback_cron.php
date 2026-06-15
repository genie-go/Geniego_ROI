#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Writeback 채널 push 큐 러너 (227차, 226 잔여 P1 #1).
 *
 * 상품 일괄등록/가격수정(catalog_writeback_job)이 채널 자격증명 미등록으로 'queued'/
 * 'awaiting_credentials' 보류돼 있던 것을, 자격증명이 등록된 채널에 한해 실 채널로 push 한다.
 * Catalog::processWritebackQueue(코어, HTTP/등록훅 공용)를 보류 job 보유 전 테넌트에 실행.
 *
 * 동작 모델: "자격증명을 등록하면 자동으로 실행" — 등록 즉시는 ChannelCreds::upsert 훅이,
 *   주기 백업은 본 cron 이 담당(등록 훅 실패/누락·재시도·신규 어댑터 추가 시 자동 소비).
 *
 * Usage:
 *   php backend/bin/writeback_cron.php [--tenant=<id>]
 *
 * crontab 예시(운영/데모 분리 — Db::pdo() 가 GENIE_ENV 기반 env DB 사용):
 *   *\/10 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/writeback_cron.php >> /var/log/genie_writeback.log 2>&1
 *   *\/13 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/writeback_cron.php >> /var/log/genie_writeback_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Catalog;

$onlyTenant = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $env = Db::env();
    $pdo = Db::pdo();

    // 보류(queued/awaiting_credentials) job 보유 테넌트만 — 빈 테넌트 불필요 호출 방지.
    $tenants = [];
    try {
        $rows = $pdo->query("SELECT DISTINCT tenant_id FROM catalog_writeback_job WHERE status IN ('queued','awaiting_credentials')")->fetchAll(\PDO::FETCH_COLUMN);
        $tenants = array_values(array_filter(array_map('strval', $rows), fn($t) => $t !== ''));
    } catch (\Throwable $e) {
        // catalog_writeback_job 미존재(아직 송출 작업 0건) — 정상, 처리할 것 없음.
        $tenants = [];
    }

    // 운영 환경에서는 'demo' 테넌트 제외 — 운영 DB 가짜데이터 방지.
    if ($env === 'production') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo'));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant));
    }

    echo "=== writeback env={$env} tenants=" . count($tenants) . "\n";

    $agg = ['done' => 0, 'awaiting' => 0, 'pending' => 0, 'failed' => 0];
    $errors = 0;
    foreach ($tenants as $t) {
        try {
            $s = Catalog::processWritebackQueue($pdo, $t, null, 200);
            foreach (['done', 'awaiting', 'pending', 'failed'] as $k) { $agg[$k] += (int)($s[$k] ?? 0); }
            echo "  [{$t}] done={$s['done']} awaiting={$s['awaiting']} pending={$s['pending']} failed={$s['failed']}\n";
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → done={$agg['done']} awaiting={$agg['awaiting']} pending={$agg['pending']} failed={$agg['failed']} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[writeback_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
