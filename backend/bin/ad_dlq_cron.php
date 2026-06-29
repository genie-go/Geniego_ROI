#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 광고 딜리버리 재시도 큐(DLQ) 러너 [현 차수].
 *
 * buildDelivery 가 일시 장애(HTTP 5xx/timeout/빈응답)로 실패해 캠페인만 남고 광고가 미생성된 건을
 * 지수 백오프로 재시도한다. 성공 시 ad/adset ext 를 auto_campaign.allocations 에 영속(활성화 캐스케이드).
 * no_credentials/unsupported/by-design partial 은 큐에 적재되지 않음(외부 등록 대기·정직).
 *
 * Usage:  php backend/bin/ad_dlq_cron.php [both|production|demo|current]
 * crontab 예시(10분마다 운영+데모): 분 필드에 0,10,20,30,40,50 사용.
 *   0,10,20,30,40,50 * * * *  php /home/wwwroot/roi.geniego.com/backend/bin/ad_dlq_cron.php both >> /var/log/genie_ad_dlq.log 2>&1
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\AdAdapters;

$mode = $argv[1] ?? 'current';

function runDlq($pdo, string $label): void {
    $r = AdAdapters::retryDeliveryDlq($pdo);
    echo "=== {$label} === DLQ retried=" . (int)($r['retried'] ?? 0) . " done=" . (int)($r['done'] ?? 0) . " failed=" . (int)($r['failed'] ?? 0) . "\n";
}

try {
    if ($mode === 'both') {
        runDlq(Db::pdoFor(false), 'Production');
        runDlq(Db::pdoFor(true),  'Demo');
    } elseif ($mode === 'production') {
        runDlq(Db::pdoFor(false), 'Production');
    } elseif ($mode === 'demo') {
        runDlq(Db::pdoFor(true), 'Demo');
    } else {
        runDlq(Db::pdo(), 'Env=' . Db::env());
    }
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[ad_dlq_cron] ' . $e->getMessage() . "\n");
    exit(1);
}
