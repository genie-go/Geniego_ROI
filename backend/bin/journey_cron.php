#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * 고객 여정 실행 스케줄 러너 (206차 #2).
 *
 * JourneyBuilder::runDue 를 호출해 resume 시각이 도래한 'waiting' 등록건을
 * 다음 delay(중단) 또는 완료까지 진행한다. 각 노드는 실행 엔진이
 * email=Mailer / kakao=KakaoChannel / sms=NaverSms 로 실발송하고,
 * condition 은 고객 사실(grade/ltv/revenue) 기반으로 분기한다.
 *
 * 등록 즉시 첫 delay 까지는 enrollCustomer 가 동기 진행하므로, 본 cron 은
 * 대기(delay) 이후 재개를 담당한다.
 *
 * Usage:
 *   php backend/bin/journey_cron.php [--tenant=<id>] [--limit=N]
 *
 * crontab 예시(운영/데모 분리 — Db::pdo() 가 GENIE_ENV 기반 env DB 사용):
 *   *\/5 * * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/journey_cron.php >> /var/log/genie_journey.log 2>&1
 *   *\/9 * * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/journey_cron.php >> /var/log/genie_journey_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\JourneyBuilder;

$args       = array_slice($argv, 1);
$onlyTenant = null;
$limit      = 300;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) {
        $onlyTenant = trim($m[1]);
    } elseif (preg_match('/^--limit=(\d+)$/', $a, $m)) {
        $limit = max(1, min(2000, (int)$m[1]));
    }
}

try {
    // [현 차수] ① churn(휴면)·segment(세그먼트 진입) 트리거 detector — 상태기반 자동 진입.
    $d = JourneyBuilder::runTriggerDetectors($onlyTenant);
    // ② resume 도래 waiting 등록건 진행.
    $r = JourneyBuilder::runDue($onlyTenant, $limit);
    echo "=== journey_cron env=" . Db::env()
        . " detect_enrolled=" . (int)($d['enrolled'] ?? 0)
        . " scanned=" . (int)($r['scanned'] ?? 0)
        . " processed=" . (int)($r['processed'] ?? 0)
        . " completed=" . (int)($r['completed'] ?? 0)
        . " waiting=" . (int)($r['waiting'] ?? 0) . "\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[journey_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
