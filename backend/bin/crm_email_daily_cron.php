#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * [246차 P2] CRM·이메일 일별 유지보수 러너.
 *
 *  ① EmailMarketing::snapshotReputation — 테넌트별 7일 롤링 평판(repScore/바운스/컴플레인)을
 *     email_reputation_daily 에 당일자로 멱등 저장 → 딜리버러빌리티 시계열(EmailMarketing>Analytics).
 *  ② CRM::autoRefreshPredictiveSegments — 룰 보유 세그먼트 멤버십을 현재 예측스코어(churn/clv)로 재계산
 *     → 예측세그먼트 자동 편입/이탈(발송 직전만 갱신하던 갭 해소).
 *
 * ★중복 0: 계산은 기존 computeDeliverability/refreshSegmentMembers 재사용, 본 러너는 스케줄 팬아웃만.
 *
 * Usage: php backend/bin/crm_email_daily_cron.php [--tenant=<id>]
 * crontab(1일 1회 권장 — 평판은 일단위 추세):
 *   30 5 * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/crm_email_daily_cron.php >> /var/log/genie_crm_email.log 2>&1
 *   33 5 * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/crm_email_daily_cron.php >> /var/log/genie_crm_email_demo.log 2>&1
 * Exit: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\EmailMarketing;
use Genie\Handlers\CRM;

$onlyTenant = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m)) $onlyTenant = trim($m[1]);
}

try {
    $env = Db::env();

    // 대상 테넌트 = 이메일 발송 이력 ∪ CRM 고객 보유.
    $emailTenants = EmailMarketing::tenantsWithEmail();
    $crmTenants   = CRM::tenantsWithCustomers();
    $tenants = array_values(array_unique(array_merge($emailTenants, $crmTenants)));

    // 운영 환경: 'demo' 시드 테넌트 제외(운영 데이터 오염 방지).
    if ($env === 'production') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t !== 'demo' && strncmp((string)$t, 'demo', 4) !== 0));
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $tenants = array_values(array_filter($tenants, fn($t) => $t === $onlyTenant));
    }

    echo "=== crm_email_daily env={$env} tenants=" . count($tenants) . "\n";
    $repOk = 0; $segOk = 0; $errors = 0;
    foreach ($tenants as $t) {
        try {
            $r = EmailMarketing::snapshotReputation($t);
            if (!empty($r['ok'])) { $repOk++; echo "  [{$t}] rep score=" . ($r['rep_score'] ?? '-') . " grade=" . ($r['grade'] ?? '-') . "\n"; }
        } catch (\Throwable $e) { $errors++; echo "  [{$t}] REP EXC " . $e->getMessage() . "\n"; }
        try {
            $s = CRM::autoRefreshPredictiveSegments($t);
            if (!empty($s['ok'])) { $segOk++; echo "  [{$t}] segments=" . ($s['segments_refreshed'] ?? 0) . " members=" . ($s['total_members'] ?? 0) . "\n"; }
        } catch (\Throwable $e) { $errors++; echo "  [{$t}] SEG EXC " . $e->getMessage() . "\n"; }
    }
    echo "  → reputation={$repOk} segments={$segOk} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[crm_email_daily_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
