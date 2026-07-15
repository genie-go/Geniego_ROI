#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [286차] 카카오 알림톡 예약 발송 큐 워커.
 *
 * KakaoChannel::runScheduledQueue 를 호출해 status='scheduled' 이고 예약시각(scheduled_at)이 도래한
 * 카카오 캠페인을 실발송한다. 종전엔 이 워커가 전무해 예약 카카오 캠페인이 시각이 와도 아무도 소비하지 않아
 * 영구 미발송(무음 유실) 잠재 트랩이었다(SMS·이메일·옴니와 대칭 배선으로 종결).
 *
 * 발송 로직은 요청 경로(sendCampaign)와 완전히 동일한 KakaoChannel::sendCampaignCore 를 재사용하므로
 * 게이트(옵트아웃·조용시간·빈도캡)·집계·과금 정책이 단일소스로 일치한다.
 *
 * Usage:
 *   php backend/bin/kakao_queue_cron.php [--tenant=<id>]
 *
 * crontab 예시(운영/데모 분리 — Db 가 GENIE_ENV 기반 env DB 사용):
 *   *\/5 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/kakao_queue_cron.php >> /var/log/genie_kakao_queue.log 2>&1
 *   *\/6 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/kakao_queue_cron.php >> /var/log/genie_kakao_queue_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\KakaoChannel;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $r = KakaoChannel::runScheduledQueue($onlyTenant);
    fwrite(STDOUT, sprintf("[%s] kakao_queue: due=%d dispatched=%d sent=%d failed_campaigns=%d\n",
        gmdate('Y-m-d H:i:s'), (int)($r['due'] ?? 0), (int)($r['dispatched'] ?? 0),
        (int)($r['sent'] ?? 0), (int)($r['failed_campaigns'] ?? 0)));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[kakao_queue_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
