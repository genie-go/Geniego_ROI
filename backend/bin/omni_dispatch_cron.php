#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [255차 P1] 옴니채널 아웃박스 디스패치 워커.
 *
 * Omnichannel::runOutbox 를 호출해 status='queued' 아웃박스 건을 배치(OMNI_BATCH, 기본 500)로 드레인한다.
 * 수신자별 채널 워터폴(WhatsApp→Kakao→Email 등 캠페인 지정 순)로 도달가능+자격등록된 첫 채널 실발송,
 * 미설정/실패 시 다음 채널 폴백. quiet-hours·빈도캡·suppression 게이트 적용. register-then-execute:
 * 자격 미등록 채널은 graceful skip(에러 없음).
 *
 * Usage:
 *   php backend/bin/omni_dispatch_cron.php [--tenant=<id>]
 *
 * crontab 예시(운영/데모 분리 — Db 가 GENIE_ENV 기반 env DB 사용):
 *   *\/5  * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/omni_dispatch_cron.php >> /var/log/genie_omni_dispatch.log 2>&1
 *   *\/7  * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/omni_dispatch_cron.php >> /var/log/genie_omni_dispatch_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\Omnichannel;

$args = array_slice($argv, 1);
$onlyTenant = null;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $r = Omnichannel::runOutbox($onlyTenant);
    fwrite(STDOUT, sprintf("[%s] omni_dispatch: sent=%d failed=%d skipped=%d tenants_deferred=%d\n",
        gmdate('Y-m-d H:i:s'), (int)($r['sent'] ?? 0), (int)($r['failed'] ?? 0), (int)($r['skipped'] ?? 0), (int)($r['tenants_deferred'] ?? 0)));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[omni_dispatch_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
