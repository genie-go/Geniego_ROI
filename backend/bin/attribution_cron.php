#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 마르코프 어트리뷰션 모델 선계산 러너 (228차 S2).
 *
 * AttributionEngine::models (GET /v424/attribution/models) 는 기존에 대시보드 히트마다
 * 동기로 markov-removal-effect 를 재계산했다(전환 order 최대 20000 스캔 → 대용량 테넌트 지연).
 * 본 cron 이 전환 데이터 보유 테넌트의 기본 윈도우 모델을 주기 선계산해
 * attribution_model_cache 에 저장 → models 는 신선 캐시(30분)면 즉시 반환한다.
 *
 * Usage:
 *   php backend/bin/attribution_cron.php [--tenant=<id>]
 *
 * crontab 예시(운영/데모 분리 — Db::pdo() 가 GENIE_ENV 기반 env DB 사용):
 *   *\/30 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/attribution_cron.php >> /var/log/genie_attribution.log 2>&1
 *   *\/33 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/attribution_cron.php >> /var/log/genie_attribution_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\AttributionEngine;

$onlyTenant = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $env = Db::env();
    $pdo = Db::pdo();

    // 전환(attribution_result) 데이터 보유 테넌트만 — 빈 테넌트 불필요 계산 방지.
    $tenants = [];
    try {
        $rows = $pdo->query("SELECT DISTINCT tenant_id FROM attribution_result WHERE tenant_id IS NOT NULL AND tenant_id <> ''")->fetchAll(\PDO::FETCH_COLUMN);
        $tenants = array_values(array_filter(array_map('strval', $rows), fn($t) => $t !== ''));
    } catch (\Throwable $e) {
        $tenants = []; // attribution_result 미존재 — 정상, 처리할 것 없음.
    }

    // 운영 환경에서는 'demo' 테넌트 제외(운영 DB 가짜데이터 방지).
    if ($env === 'production') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo' && strpos($t, 'demo') !== 0));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant));
    }

    echo "=== attribution markov precompute env={$env} tenants=" . count($tenants) . "\n";
    $done = 0; $errors = 0;
    foreach ($tenants as $t) {
        try {
            $r = AttributionEngine::precompute($pdo, $t); // 기본 윈도우(90)/halflife(7.0) 선계산+캐시
            echo "  [{$t}] converted={$r['converted']} journeys={$r['journeys']}\n";
            $done++;
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → precomputed={$done} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[attribution_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
