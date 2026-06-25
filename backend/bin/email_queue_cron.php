#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [현 차수] 이메일 STO 발송 큐 워커.
 *
 * EmailMarketing::runQueue 를 호출해 status='queued' 발송건을 처리한다.
 * STO(발송시간 최적화)로 야간 등 차단시간에 적재된 캠페인 발송을, 허용시각이 도래한
 * 테넌트에 한해 실발송(Mailer)한다. suppression 재확인·개인화 재렌더·List-Unsubscribe·
 * 실패 시 최대 3회 재시도를 모두 수행한다. 데이터정합은 commsSendAllowedNow(KST quiet-hours)로 게이트.
 *
 * Usage:
 *   php backend/bin/email_queue_cron.php [--tenant=<id>]
 *
 * crontab 예시(운영/데모 분리 — Db 가 GENIE_ENV 기반 env DB 사용):
 *   *\/15 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/email_queue_cron.php >> /var/log/genie_email_queue.log 2>&1
 *   *\/17 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/email_queue_cron.php >> /var/log/genie_email_queue_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\EmailMarketing;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $r = EmailMarketing::runQueue($onlyTenant);
    fwrite(STDOUT, sprintf("[%s] email_queue: sent=%d failed=%d tenants_deferred=%d\n",
        gmdate('Y-m-d H:i:s'), (int)($r['sent'] ?? 0), (int)($r['failed'] ?? 0), (int)($r['tenants_deferred'] ?? 0)));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[email_queue_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
