#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [현 차수 P1] 아웃바운드 웹훅 전달 워커.
 *
 * OpenPlatform::drainPending 을 호출해 status='pending'/'retry' 이고 next_retry_at 이
 * 도래한 webhook_delivery 행을 등록 엔드포인트로 HMAC 서명 POST 한다. 실패 시 지수
 * 백오프(2^attempts 분, 최대 6회) 재시도. 6회 소진 시 status='failed'. 비활성/삭제
 * 엔드포인트 행은 status='dropped'.
 *
 * Usage:
 *   php backend/bin/webhook_dispatch_cron.php [--max=200]
 *
 * crontab 예시(운영/데모 분리 — Db 가 GENIE_ENV 기반 env DB 사용):
 *   * * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/webhook_dispatch_cron.php >> /var/log/genie_webhook.log 2>&1
 *   * * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/webhook_dispatch_cron.php >> /var/log/genie_webhook_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\OpenPlatform;

$args = array_slice($argv, 1);
$max = 200;
foreach ($args as $a) {
    if (preg_match('/^--max=(\d+)$/', $a, $m)) $max = (int)$m[1];
}

try {
    $r = OpenPlatform::drainPending($max);
    fwrite(STDOUT, sprintf("[%s] webhook_dispatch: processed=%d delivered=%d failed=%d\n",
        gmdate('Y-m-d H:i:s'), (int)($r['processed'] ?? 0), (int)($r['delivered'] ?? 0), (int)($r['failed'] ?? 0)));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[webhook_dispatch_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
