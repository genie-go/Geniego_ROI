#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 채널 리뷰 자동 수집 러너 (228차).
 *
 * 연동허브에 리뷰-수집 가능 채널(cafe24/naver/coupang/shopify)의 자격증명을 등록한
 * 테넌트를 순회하며 Reviews::collectForTenant 로 채널 리뷰 API를 실수집·멱등 적재한다.
 * (수동 'channel 수집' 버튼의 자동화 — 자격증명/파트너 게이트는 핸들러가 정직 no-op 처리.)
 *
 * Usage:
 *   php backend/bin/review_collect_cron.php [--tenant=<id>] [--channel=<ch>]
 *
 * crontab 예시(운영/데모 분리 — Db::pdo() 가 GENIE_ENV 기반 env DB 사용):
 *   17 *\/6 * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/review_collect_cron.php >> /var/log/genie_review_collect.log 2>&1
 *   23 *\/6 * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/review_collect_cron.php >> /var/log/genie_review_collect_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\Reviews;

const REVIEW_CHANNELS = Reviews::REVIEW_CHANNELS; // [239차+] SSOT — Reviews 핸들러 단일소스 재사용(중복 제거)

$onlyTenant = null; $onlyChannel = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
    if (preg_match('/^--channel=(.+)$/', $a, $m)) $onlyChannel = strtolower(trim($m[1]));
}

try {
    $env = Db::env();
    $pdo = Db::pdo();

    // 리뷰-수집 채널 자격증명 보유 (tenant, channel) 쌍만 — 불필요 호출 방지.
    $ph = implode(',', array_fill(0, count(REVIEW_CHANNELS), '?'));
    $pairs = [];
    try {
        $st = $pdo->prepare("SELECT DISTINCT tenant_id, channel FROM channel_credential WHERE channel IN ($ph) AND is_active=1");
        $st->execute(REVIEW_CHANNELS);
        $pairs = $st->fetchAll(\PDO::FETCH_ASSOC);
    } catch (\Throwable $e) {
        $pairs = []; // channel_credential 미존재 — 정상, 처리할 것 없음.
    }

    // 운영 환경에서는 'demo' 테넌트 제외(운영 DB 가짜데이터 방지).
    $tasks = [];
    foreach ($pairs as $p) {
        $t = trim((string)($p['tenant_id'] ?? '')); $c = strtolower(trim((string)($p['channel'] ?? '')));
        if ($t === '' || $c === '') continue;
        if ($env === 'production' && ($t === 'demo' || strpos($t, 'demo') === 0)) continue;
        if ($onlyTenant !== null && $onlyTenant !== '' && $t !== $onlyTenant) continue;
        if ($onlyChannel !== null && $onlyChannel !== '' && $c !== $onlyChannel) continue;
        $tasks[] = [$t, $c];
    }

    echo "=== review collect env={$env} tasks=" . count($tasks) . "\n";
    $saved = 0; $errors = 0;
    foreach ($tasks as [$t, $c]) {
        try {
            $r = Reviews::collectForTenant($pdo, $t, $c);
            echo "  [{$t}/{$c}] mode={$r['mode']} fetched={$r['fetched']} saved={$r['saved']}\n";
            $saved += (int)$r['saved'];
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}/{$c}] EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → total_saved={$saved} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[review_collect_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
