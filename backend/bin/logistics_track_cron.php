#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 배송추적 갱신 스케줄 러너 (현 차수, 전수감사 P1).
 *
 * 진행중(미배송) 송장을 주기 폴링해 캐리어 추적 API 로 상태를 자동 갱신한다.
 * Logistics::refreshTenant(코어, HTTP refresh 와 공용)를 활성 송장 보유 전 테넌트에 실행.
 * HTTP 핸들러(POST /v427/logistics/refresh)가 온디맨드라면, 본 CLI 는 cron 백업으로
 * "송장만 등록하면 추적 상태가 자동 갱신"되도록 한다(기존엔 러너 부재로 수동 [전체갱신] 필수였음).
 *
 * Usage:
 *   php backend/bin/logistics_track_cron.php [--tenant=<id>]
 *
 * crontab 예시(운영/데모 분리 — Db::pdo() 가 GENIE_ENV 기반 env DB 사용):
 *   *\/15 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/logistics_track_cron.php >> /var/log/genie_logistics.log 2>&1
 *   *\/18 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/logistics_track_cron.php >> /var/log/genie_logistics_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Logistics;

$onlyTenant = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $env = Db::env();
    $pdo = Db::pdo();

    // 활성(미배송) 송장 보유 테넌트만 폴링 — 빈 테넌트 불필요 호출 방지.
    $tenants = [];
    try {
        $rows = $pdo->query("SELECT DISTINCT tenant_id FROM shipment_tracking WHERE delivered=0")->fetchAll(\PDO::FETCH_COLUMN);
        $tenants = array_values(array_filter(array_map('strval', $rows), fn($t) => $t !== ''));
    } catch (\Throwable $e) {
        // shipment_tracking 미존재(아직 송장 0건) — 정상, 처리할 것 없음.
        $tenants = [];
    }

    // 운영 환경에서는 'demo' 테넌트 제외 — 운영 DB 가짜데이터 방지.
    if ($env === 'production') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo'));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant));
    }

    echo "=== logistics_track env={$env} tenants=" . count($tenants) . "\n";

    $total = 0;
    $errors = 0;
    foreach ($tenants as $t) {
        try {
            $n = Logistics::refreshTenant($pdo, $t);
            $total += $n;
            echo "  [{$t}] refreshed={$n}\n";
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → total refreshed={$total} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[logistics_track_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
