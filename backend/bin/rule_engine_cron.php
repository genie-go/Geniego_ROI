#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [현 차수] AIRuleEngine 자동화 룰 평가 워커.
 *
 * RuleEngine::evaluateAll 로 전 테넌트 활성 IF-THEN 규칙을 실데이터로 평가하고 트리거 시 액션 실행
 * (alert/webhook/pause_channel/reorder)·rule_engine_log 기록. 데모 테넌트는 skip(오염 차단).
 *
 * crontab 예시(운영/데모 분리):
 *   *\/10 * * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/rule_engine_cron.php >> /var/log/genie_rules.log 2>&1
 *   *\/13 * * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/rule_engine_cron.php >> /var/log/genie_rules_demo.log 2>&1
 *
 * Exit: 0=성공, 1=실패.
 */
require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\RuleEngine;

try {
    $r = RuleEngine::evaluateAll(5000);
    fwrite(STDOUT, sprintf("[%s] rule_engine: evaluated=%d triggered=%d\n",
        gmdate('Y-m-d H:i:s'), (int)($r['evaluated'] ?? 0), (int)($r['triggered'] ?? 0)));
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, '[rule_engine_cron] ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}
