#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [245차 P1-1] DW/BI 데이터 익스포트 워커.
 *
 * DataExport::runDue 를 호출해 next_run_at 이 도래한 enabled 익스포트 대상을 실행한다.
 * 대상별 선택 데이터셋(orders/ad_metrics/settlements/attribution/kpi_summary)을 직렬화해
 * BigQuery/Snowflake/Google Sheets/범용 HTTP 로 push. 미설정 대상은 skip(정직). 데모는 외부전송 skip.
 *
 * Usage:
 *   php backend/bin/data_export_cron.php [tenant_id]
 *
 * crontab(운영/데모 분리 — Db 가 GENIE_ENV 기반 env DB 사용):
 *   15 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/data_export_cron.php >> /var/log/genie_export.log 2>&1
 *   20 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/data_export_cron.php >> /var/log/genie_export_demo.log 2>&1
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\DataExport;

$onlyTenant = isset($argv[1]) ? (string)$argv[1] : null;

try {
    $r = DataExport::runDue($onlyTenant);
    fwrite(STDOUT, sprintf("[%s] data_export: processed=%d ok=%d\n",
        gmdate('Y-m-d H:i:s'), (int)($r['processed'] ?? 0), (int)($r['ok'] ?? 0)));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[data_export_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
