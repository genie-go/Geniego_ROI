#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [286차] SMS 예약 발송 큐 워커.
 *
 * SmsMarketing::runScheduledQueue 를 호출해 status='scheduled' 이고 예약시각(scheduled_at)이 도래한
 * SMS 캠페인을 실발송한다. 종전엔 이 워커가 전무해 예약 SMS 가 시각이 와도 아무도 소비하지 않아
 * 영구 미발송(무음 유실)이던 근본결함을 종결한다(이메일 email_queue_cron.php 와 대칭 배선).
 *
 * 발송 로직은 요청 경로(campaignAction send/start)와 완전히 동일한 SmsMarketing::dispatchCampaignCore 를
 * 재사용하므로 게이트(옵트아웃·조용시간·빈도캡)·집계·과금 정책이 단일소스로 일치한다.
 *
 * Usage:
 *   php backend/bin/sms_queue_cron.php [--tenant=<id>]
 *
 * crontab 예시(운영/데모 분리 — Db 가 GENIE_ENV 기반 env DB 사용):
 *   *\/5 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/sms_queue_cron.php >> /var/log/genie_sms_queue.log 2>&1
 *   *\/6 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/sms_queue_cron.php >> /var/log/genie_sms_queue_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\SmsMarketing;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $r = SmsMarketing::runScheduledQueue($onlyTenant);
    fwrite(STDOUT, sprintf("[%s] sms_queue: due=%d dispatched=%d sent=%d failed_campaigns=%d\n",
        gmdate('Y-m-d H:i:s'), (int)($r['due'] ?? 0), (int)($r['dispatched'] ?? 0),
        (int)($r['sent'] ?? 0), (int)($r['failed_campaigns'] ?? 0)));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[sms_queue_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
