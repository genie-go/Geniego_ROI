#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * OAuth 토큰 갱신 스케줄 러너 (215차).
 *
 * 광고 매체 OAuth access token 은 만료된다(Google ~1h·TikTok ~24h·Meta ~60d).
 * OAuth::refreshCore 를 OAuth 토큰 보유 전 (tenant, provider) 쌍에 대해 실행하여
 * access token 을 미리 갱신 → AdAdapters 자동집행(optimize_cron)이 만료로 401 실패하지 않게 한다.
 *
 * 성격: OAuth 연결의 "신선도 유지". Google(1h 만료)을 커버하려면 시간당 1회 권장.
 *
 * Usage: php backend/bin/oauth_refresh_cron.php [--tenant=<id>] [--provider=google]
 *
 * crontab 예시(운영/데모 분리 — GENIE_ENV 기반 Db::pdo()):
 *   10 * * * *  GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/oauth_refresh_cron.php  >> /var/log/genie_oauth_refresh.log 2>&1
 *   12 * * * *  GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/oauth_refresh_cron.php >> /var/log/genie_oauth_refresh_demo.log 2>&1
 *
 * Exit codes: 0=성공(부분 실패 허용), 1=치명 오류.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\OAuth;

$args = array_slice($argv, 1);
$onlyTenant = null; $onlyProvider = null;
foreach ($args as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m))   $onlyTenant = $m[1];
    elseif (preg_match('/^--provider=(.+)$/', $a, $m)) $onlyProvider = strtolower($m[1]);
}

$ts = gmdate('Y-m-d H:i:s');
echo "[oauth_refresh_cron] start {$ts} env=" . (getenv('GENIE_ENV') ?: 'default') . "\n";

try {
    $pairs = OAuth::connectedOAuthPairs();
    if ($onlyTenant !== null)   $pairs = array_values(array_filter($pairs, fn($p) => $p['tenant'] === $onlyTenant));
    if ($onlyProvider !== null) $pairs = array_values(array_filter($pairs, fn($p) => $p['provider'] === $onlyProvider));

    $ok = 0; $fail = 0;
    foreach ($pairs as $p) {
        try {
            $r = OAuth::refreshCore($p['tenant'], $p['provider']);
            if (!empty($r['ok'])) { $ok++; echo "  [refresh] {$p['tenant']}/{$p['provider']}: OK (expires_in=" . ($r['expires_in'] ?? 'n/a') . ")\n"; }
            else { $fail++; echo "  [refresh] {$p['tenant']}/{$p['provider']}: SKIP/FAIL ({$r['error']})\n"; }
        } catch (\Throwable $e) {
            $fail++; echo "  [refresh] {$p['tenant']}/{$p['provider']}: EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "[oauth_refresh_cron] done pairs=" . count($pairs) . " ok={$ok} fail={$fail}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[oauth_refresh_cron] FATAL " . $e->getMessage() . "\n");
    exit(1);
}
