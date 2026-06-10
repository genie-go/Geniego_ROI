<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Throwable;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

/**
 * [현 차수] 크리에이티브 자동 A/B 테스트 루프 — 경쟁사(PMax/Advantage+/AdEspresso) 핵심 차별점.
 *
 * 흐름(닫힌 루프):
 *   1) launch 시 캠페인 1건 하위에 크리에이티브 variant 2~N개를 동시 집행(AdAdapters::buildDelivery 반복).
 *      각 variant = 매체 ad 1개 → ad_ext_id 를 ab_variant 에 보존(성과 추적 키).
 *   2) performance_metrics 의 ad_ext_id 단위로 variant별 성과 집계(ad-level ingest, Meta 우선).
 *   3) optimizeCampaign(cron 매시) 시 evaluateAndSelect() 호출 → variant별 UCB 점수 →
 *      min_impressions 통계 게이트 통과 시 승자 선정 → 패자 ad 일시정지(예산 승자 집중).
 *   - 테넌트 격리(tenant_id 스코프), 집행은 AdAdapters 게이트·PAUSED 안전 정책을 그대로 따른다.
 *
 * 신규 핸들러로 격리 → 기존 AutoCampaign 단일-크리에이티브 흐름은 변경 없이 보존(ab_mode 일 때만 활성).
 */
final class AbTesting
{
    /** 승자 판정 최소 노출(통계 유의성 게이트). variant당 이만큼 노출 전엔 승자 미선정. */
    private const MIN_IMPRESSIONS = 1000;
    /** UCB 탐색 강도. */
    private const UCB_C = 0.5;

    public static function migrate(PDO $pdo): void
    {
        $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        if ($mysql) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ab_test (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown',
                campaign_id INT NOT NULL,
                channel VARCHAR(40),
                status VARCHAR(20) NOT NULL DEFAULT 'running',
                strategy VARCHAR(20) NOT NULL DEFAULT 'bandit',
                winner_variant_id INT DEFAULT NULL,
                min_impressions INT DEFAULT 1000,
                created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32),
                KEY idx_abtest_tenant (tenant_id), KEY idx_abtest_camp (tenant_id, campaign_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS ab_variant (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown',
                ab_test_id INT NOT NULL, campaign_id INT NOT NULL,
                channel VARCHAR(40), label VARCHAR(120),
                design_id INT DEFAULT 0, frame_idx INT DEFAULT 0,
                ad_ext_id VARCHAR(255), adset_ext_id VARCHAR(255),
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                alloc_share DOUBLE DEFAULT 0,
                impressions INT DEFAULT 0, clicks INT DEFAULT 0,
                spend DOUBLE DEFAULT 0, conversions INT DEFAULT 0, revenue DOUBLE DEFAULT 0,
                created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32),
                KEY idx_abvar_tenant (tenant_id), KEY idx_abvar_test (tenant_id, ab_test_id),
                KEY idx_abvar_ad (tenant_id, ad_ext_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // ad-level 성과 추적용 컬럼(멱등 ALTER — 이미 있으면 무시).
            try { $pdo->exec("ALTER TABLE performance_metrics ADD COLUMN ad_ext_id VARCHAR(255) DEFAULT NULL"); } catch (Throwable $e) {}
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS ab_test (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'unknown',
                campaign_id INTEGER NOT NULL, channel TEXT, status TEXT NOT NULL DEFAULT 'running',
                strategy TEXT NOT NULL DEFAULT 'bandit', winner_variant_id INTEGER,
                min_impressions INTEGER DEFAULT 1000, created_at TEXT NOT NULL, updated_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS ab_variant (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'unknown',
                ab_test_id INTEGER NOT NULL, campaign_id INTEGER NOT NULL, channel TEXT, label TEXT,
                design_id INTEGER DEFAULT 0, frame_idx INTEGER DEFAULT 0,
                ad_ext_id TEXT, adset_ext_id TEXT, status TEXT NOT NULL DEFAULT 'active',
                alloc_share REAL DEFAULT 0, impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0,
                spend REAL DEFAULT 0, conversions INTEGER DEFAULT 0, revenue REAL DEFAULT 0,
                created_at TEXT NOT NULL, updated_at TEXT
            )");
            try { $pdo->exec("ALTER TABLE performance_metrics ADD COLUMN ad_ext_id TEXT DEFAULT NULL"); } catch (Throwable $e) {}
        }
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    /**
     * 캠페인 채널에 대한 A/B 테스트 + variant 묶음 생성(launch 에서 호출).
     * $variants: [['design_id'=>int,'frame_idx'=>int,'ad_ext_id'=>str,'adset_ext_id'=>str,'label'=>str], ...]
     * 반환: ab_test_id (variant<2 면 0 — A/B 불성립).
     */
    public static function createTest(PDO $pdo, string $tenant, int $campaignId, string $channel, array $variants): int
    {
        $variants = array_values(array_filter($variants, fn($v) => is_array($v) && ($v['ad_ext_id'] ?? '') !== ''));
        if (count($variants) < 2) return 0; // variant 2개 미만이면 A/B 아님(단일 크리에이티브)
        self::migrate($pdo);
        $now = self::now();
        $pdo->prepare("INSERT INTO ab_test(tenant_id,campaign_id,channel,status,strategy,min_impressions,created_at,updated_at)
                       VALUES(?,?,?,?,?,?,?,?)")
            ->execute([$tenant, $campaignId, $channel, 'running', 'bandit', self::MIN_IMPRESSIONS, $now, $now]);
        $testId = (int)$pdo->lastInsertId();
        $share = round(1.0 / count($variants), 4);
        $ins = $pdo->prepare("INSERT INTO ab_variant(tenant_id,ab_test_id,campaign_id,channel,label,design_id,frame_idx,ad_ext_id,adset_ext_id,status,alloc_share,created_at,updated_at)
                              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
        $i = 0;
        foreach ($variants as $v) {
            $i++;
            $ins->execute([
                $tenant, $testId, $campaignId, $channel,
                (string)($v['label'] ?? ('Variant ' . $i)),
                (int)($v['design_id'] ?? 0), (int)($v['frame_idx'] ?? 0),
                (string)($v['ad_ext_id'] ?? ''), (string)($v['adset_ext_id'] ?? ''),
                'active', $share, $now, $now,
            ]);
        }
        return $testId;
    }

    /** ad_ext_id 단위 성과 집계(window일·테넌트 스코프). 구 스키마(컬럼 부재) 시 0 폴백. */
    private static function variantMetrics(PDO $pdo, string $tenant, string $adExtId, int $window = 14): array
    {
        $zero = ['impressions' => 0, 'clicks' => 0, 'spend' => 0.0, 'conversions' => 0, 'revenue' => 0.0, 'roas' => 0.0, 'has_data' => false];
        if ($adExtId === '') return $zero;
        $since = gmdate('Y-m-d', time() - $window * 86400);
        try {
            $st = $pdo->prepare("SELECT COALESCE(SUM(impressions),0) imp, COALESCE(SUM(clicks),0) clk,
                COALESCE(SUM(spend),0) spend, COALESCE(SUM(conversions),0) conv, COALESCE(SUM(revenue),0) rev
                FROM performance_metrics WHERE tenant_id=? AND ad_ext_id=? AND date >= ?");
            $st->execute([$tenant, $adExtId, $since]);
            $r = $st->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) { return $zero; } // ad_ext_id 컬럼 부재 → 추적 불가
        $spend = (float)($r['spend'] ?? 0); $rev = (float)($r['rev'] ?? 0); $imp = (int)($r['imp'] ?? 0);
        return [
            'impressions' => $imp, 'clicks' => (int)($r['clk'] ?? 0), 'spend' => round($spend),
            'conversions' => (int)($r['conv'] ?? 0), 'revenue' => round($rev),
            'roas' => $spend > 0 ? round($rev / $spend, 2) : 0.0,
            'has_data' => ($spend > 0 || $imp > 0),
        ];
    }

    /**
     * 캠페인의 모든 running A/B 테스트 평가 + 승자 선정/패자 정지(optimizeCampaign 에서 호출).
     * variant별 성과 갱신 → UCB 점수 → min_impressions 게이트 → 승자 결정 시 패자 ad 일시정지.
     * 반환: 결정 로그 배열(투명성).
     */
    public static function evaluateAndSelect(PDO $pdo, string $tenant, int $campaignId): array
    {
        $decisions = [];
        try { self::migrate($pdo); } catch (Throwable $e) { return $decisions; }
        $tests = [];
        try {
            $st = $pdo->prepare("SELECT * FROM ab_test WHERE tenant_id=? AND campaign_id=? AND status='running'");
            $st->execute([$tenant, $campaignId]);
            $tests = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) { return $decisions; }

        foreach ($tests as $test) {
            $testId = (int)$test['id'];
            $channel = (string)($test['channel'] ?? '');
            $minImp = (int)($test['min_impressions'] ?? self::MIN_IMPRESSIONS);
            $vs = $pdo->prepare("SELECT * FROM ab_variant WHERE tenant_id=? AND ab_test_id=? AND status<>'paused'");
            $vs->execute([$tenant, $testId]);
            $variants = $vs->fetchAll(PDO::FETCH_ASSOC) ?: [];
            if (count($variants) < 2) continue;

            // 1) variant별 성과 갱신 + 총 노출/전환.
            $totalConv = 0; $rows = [];
            foreach ($variants as $v) {
                $m = self::variantMetrics($pdo, $tenant, (string)$v['ad_ext_id']);
                try {
                    $pdo->prepare("UPDATE ab_variant SET impressions=?,clicks=?,spend=?,conversions=?,revenue=?,updated_at=? WHERE id=?")
                        ->execute([$m['impressions'], $m['clicks'], $m['spend'], $m['conversions'], $m['revenue'], self::now(), (int)$v['id']]);
                } catch (Throwable $e) {}
                $totalConv += (int)$m['conversions'];
                $rows[] = ['v' => $v, 'm' => $m];
            }

            // 2) 통계 게이트: 모든 variant가 min_impressions 도달해야 승자 평가.
            $allReached = true; $anyData = false;
            foreach ($rows as $r) { if ($r['m']['impressions'] < $minImp) $allReached = false; if ($r['m']['has_data']) $anyData = true; }
            if (!$anyData) {
                $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'ab_collecting', 'reason' => 'A/B 성과 데이터 수집 중(ad-level ingest 대기)'];
                continue;
            }
            if (!$allReached) {
                $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'ab_collecting', 'reason' => "통계 유의성 대기(variant별 최소 {$minImp} 노출 필요)"];
                continue;
            }

            // 3) UCB 점수(ROAS 활용 + 저표본 탐색 보너스). 결정적(랜덤 없음).
            $best = null; $bestScore = -INF; $scores = [];
            foreach ($rows as $r) {
                $conv = max(0, (int)$r['m']['conversions']);
                $roas = (float)$r['m']['roas'];
                $ucb = self::UCB_C * sqrt(log($totalConv + 2.0) / ($conv + 1.0));
                $score = $roas + $ucb;
                $scores[(int)$r['v']['id']] = ['score' => round($score, 3), 'roas' => $roas, 'ucb' => round($ucb, 3)];
                if ($score > $bestScore) { $bestScore = $score; $best = $r['v']; }
            }
            if (!$best) continue;
            $winnerId = (int)$best['id'];

            // 4) 승자 확정 + 패자 ad 일시정지(예산 승자 집중). 게이트/자격증명은 AdAdapters 가 처리.
            $connKey = self::connectorKey($channel);
            foreach ($rows as $r) {
                $vid = (int)$r['v']['id'];
                $adExt = (string)$r['v']['ad_ext_id'];
                if ($vid === $winnerId) {
                    try { $pdo->prepare("UPDATE ab_variant SET status='winner',alloc_share=1.0,updated_at=? WHERE id=?")->execute([self::now(), $vid]); } catch (Throwable $e) {}
                    $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'ab_winner', 'variant' => $vid, 'roas' => $r['m']['roas'], 'reason' => "A/B 승자 선정(ROAS {$r['m']['roas']}, score {$scores[$vid]['score']}) → 예산 집중"];
                } else {
                    $pr = AdAdapters::pause($pdo, $tenant, $connKey, $adExt);
                    try { $pdo->prepare("UPDATE ab_variant SET status='paused',alloc_share=0,updated_at=? WHERE id=?")->execute([self::now(), $vid]); } catch (Throwable $e) {}
                    $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'ab_pause', 'variant' => $vid, 'roas' => $r['m']['roas'], 'actuated' => !empty($pr['ok']), 'reason' => "A/B 패자 자동 정지(ROAS {$r['m']['roas']} < 승자) → 예산 회수"];
                }
            }
            try { $pdo->prepare("UPDATE ab_test SET status='winner_selected',winner_variant_id=?,updated_at=? WHERE id=?")->execute([$winnerId, self::now(), $testId]); } catch (Throwable $e) {}
        }
        return $decisions;
    }

    private const CONNECTOR_KEY = ['meta' => 'meta_ads', 'google' => 'google_ads', 'tiktok' => 'tiktok_business', 'naver' => 'naver_sa', 'kakao' => 'kakao_moment', 'coupang_ads' => 'coupang'];
    private static function connectorKey(string $channel): string { return self::CONNECTOR_KEY[$channel] ?? $channel; }

    private static function jsonRes(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    /** GET /v423/auto-campaign/ab-status?campaign_id=X — 캠페인의 A/B 테스트·variant 성과 조회(테넌트 격리). */
    public static function status(Request $req, Response $res): Response
    {
        $tenant = UserAuth::authedTenant($req);
        if ($tenant === null || $tenant === '' || strtolower((string)$tenant) === 'unknown') {
            return self::jsonRes($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
        }
        $pdo = Db::pdo();
        try { self::migrate($pdo); } catch (Throwable $e) {}
        $campaignId = (int)($req->getQueryParams()['campaign_id'] ?? 0);
        try {
            if ($campaignId > 0) {
                $ts = $pdo->prepare("SELECT * FROM ab_test WHERE tenant_id=? AND campaign_id=? ORDER BY id DESC");
                $ts->execute([$tenant, $campaignId]);
            } else {
                $ts = $pdo->prepare("SELECT * FROM ab_test WHERE tenant_id=? ORDER BY id DESC LIMIT 50");
                $ts->execute([$tenant]);
            }
            $tests = $ts->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($tests as &$t) {
                $vs = $pdo->prepare("SELECT id,channel,label,design_id,ad_ext_id,status,alloc_share,impressions,clicks,spend,conversions,revenue,
                    CASE WHEN spend>0 THEN ROUND(revenue/spend,2) ELSE 0 END AS roas
                    FROM ab_variant WHERE tenant_id=? AND ab_test_id=? ORDER BY id");
                $vs->execute([$tenant, (int)$t['id']]);
                $t['variants'] = $vs->fetchAll(PDO::FETCH_ASSOC) ?: [];
            }
            unset($t);
            return self::jsonRes($res, ['ok' => true, 'tests' => $tests]);
        } catch (Throwable $e) {
            return self::jsonRes($res, ['ok' => true, 'tests' => []]); // 테이블 미생성 등 → 빈 결과(무중단)
        }
    }
}
