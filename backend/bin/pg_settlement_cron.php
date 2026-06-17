#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * PG(결제 게이트웨이) 정산 자동수집 cron 러너 (229차, 228 잔여 #5).
 *
 * PgSettlement 에는 Stripe/토스페이먼츠/PayPal/Adyen 실 정산 수집 어댑터가 이미 있으나,
 * 그동안 자격증명 저장 직후 1회(ChannelCreds::upsert 훅)·관리자 수동 POST /v427/pg/sync 에만
 * 의존해 "주기적 자동 누적"이 없었다(228 인계서 잔여 #5: "PG cron 부재").
 *   → 본 cron 이 자격증명을 보유한 테넌트의 live PG provider 를 주기 수집해 P&L/정산에 누적한다.
 *
 * 동작 모델: 광고/커머스/Writeback cron 과 동일 — "자격증명을 등록하면 자동으로(주기적으로) 수집".
 *   • 등록 즉시 수집 = ChannelCreds::upsert 훅(PgSettlement::syncForTenant)
 *   • 주기 백업/누적 = 본 cron(신규 거래·정산 배치 전진 수집·등록 훅 실패/누락 재시도)
 *
 * 대상 선정: channel_credential(is_active=1) 의 채널을 PgSettlement::providerForChannel 로
 *   canonical PG provider 로 역매핑 → (tenant, provider) 중복제거. live=false provider 및
 *   미설정 자격증명은 syncForTenant 가 내부에서 self-guard(no-live-adapter / configured=false).
 *   ∴ cron 은 PG 후보만 추려 호출하고, 실제 수집 여부는 핸들러 코어가 정직하게 판정한다.
 *
 * 격리: Db::pdo() 가 GENIE_ENV(운영/데모) 별 물리 분리 DB 사용. 운영 환경에서는 'demo'
 *   테넌트 제외(운영 DB 가짜데이터 방지, writeback_cron 정합).
 *
 * Usage:
 *   php backend/bin/pg_settlement_cron.php [--tenant=<id>] [--provider=<key>]
 *
 * crontab 예시(운영/데모 분리 — Db::pdo() 가 GENIE_ENV 기반 env DB 사용):
 *   17 *\/2 * * * GENIE_ENV=production php /home/wwwroot/roi.geniego.com/backend/bin/pg_settlement_cron.php >> /var/log/genie_pg_settle.log 2>&1
 *   23 *\/2 * * * GENIE_ENV=demo       php /home/wwwroot/roidemo.geniego.com/backend/bin/pg_settlement_cron.php >> /var/log/genie_pg_settle_demo.log 2>&1
 *   (정산은 실시간성이 낮아 2시간 주기로 충분 — Adyen 배치 리포트·Stripe balance txn 따라잡기)
 *
 * Exit codes: 0=성공, 1=실패.
 */

require __DIR__ . '/../vendor/autoload.php';

use Genie\Db;
use Genie\Handlers\PgSettlement;

$onlyTenant   = null;
$onlyProvider = null;
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--tenant=(.+)$/', $a, $m))   $onlyTenant   = trim($m[1]);
    if (preg_match('/^--provider=(.+)$/', $a, $m)) $onlyProvider = strtolower(trim($m[1]));
}

try {
    $env = Db::env();
    $pdo = Db::pdo();

    // 자격증명 보유 (tenant, channel) → PG provider 역매핑 → (tenant, provider) 중복제거.
    // channel_credential 미존재(아직 자격증명 0건)·쿼리 실패 시 정상(처리할 것 없음).
    $pairs = []; // "tenant\0provider" => [tenant, provider]
    try {
        $rows = $pdo->query("SELECT DISTINCT tenant_id, channel FROM channel_credential WHERE is_active=1")->fetchAll(\PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $t  = (string)($r['tenant_id'] ?? '');
            $ch = (string)($r['channel'] ?? '');
            if ($t === '' || $ch === '') continue;
            $prov = PgSettlement::providerForChannel($ch); // 비-PG 채널 → null(자동 제외)
            if ($prov === null) continue;
            $pairs[$t . "\0" . $prov] = [$t, $prov];
        }
    } catch (\Throwable $e) {
        $pairs = [];
    }

    // 운영 환경에서는 'demo' 테넌트 제외 — 운영 DB 가짜데이터 방지(writeback_cron 정합).
    if ($env === 'production') {
        $pairs = array_filter($pairs, fn($p) => $p[0] !== 'demo');
    }
    if ($onlyTenant !== null && $onlyTenant !== '') {
        $pairs = array_filter($pairs, fn($p) => $p[0] === $onlyTenant);
    }
    if ($onlyProvider !== null && $onlyProvider !== '') {
        $pairs = array_filter($pairs, fn($p) => $p[1] === $onlyProvider);
    }
    $pairs = array_values($pairs);

    echo "=== pg_settlement env={$env} pairs=" . count($pairs) . "\n";

    $synced = 0;       // upsert 된 거래/정산 행 합
    $live   = 0;       // 실 수집 성공 (tenant,provider) 수
    $pending = 0;      // 미설정/미구현 (정직 pending)
    $errors = 0;
    foreach ($pairs as [$t, $prov]) {
        try {
            $s = PgSettlement::syncForTenant($pdo, $t, $prov);
            if (!empty($s['ok'])) {
                $n = (int)($s['synced'] ?? 0);
                $synced += $n; $live++;
                echo "  [{$t}] {$prov} OK synced={$n}\n";
            } else {
                $pending++;
                $note = (string)($s['note'] ?? ($s['configured'] ?? false ? 'configured-no-rows' : 'not-configured'));
                echo "  [{$t}] {$prov} skip: {$note}\n";
            }
        } catch (\Throwable $e) {
            $errors++;
            echo "  [{$t}] {$prov} EXCEPTION " . $e->getMessage() . "\n";
        }
    }
    echo "  → live={$live} synced={$synced} pending={$pending} errors={$errors}\n";
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "[pg_settlement_cron] FAILED: " . $e->getMessage() . "\n");
    exit(1);
}
