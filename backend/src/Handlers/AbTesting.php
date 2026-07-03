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
    /** [232차 Sprint3] 베이지안 승자 확정 임계치 — P(해당 variant가 진짜 최고 전환율) ≥ 0.95 일 때만 승자 선정.
     *  기존엔 표본수 게이트 통과 후 UCB 점수 최고를 곧바로 승자로 정해(유의성 미검정) 우연한 차이로 패자를 정지하는 위험이 있었다. */
    private const WIN_CONFIDENCE = 0.95;

    /** 표준정규 누적분포 Φ(x) — erf 기반(Abramowitz-Stegun 7.1.26). 베이지안 A/B 정규근사용. */
    private static function normalCdf(float $x): float
    {
        // erf 근사
        $t = 1.0 / (1.0 + 0.3275911 * abs($x) / M_SQRT2);
        $y = 1.0 - (((((1.061405429 * $t - 1.453152027) * $t) + 1.421413741) * $t - 0.284496736) * $t + 0.254829592) * $t * exp(-($x * $x) / 2.0);
        return $x >= 0 ? 0.5 + 0.5 * $y : 0.5 - 0.5 * $y;
    }

    /**
     * [232차 Sprint3] 베이지안 A/B — 전환율 Beta-Binomial 사후분포 정규근사로 "각 variant가 최고일 확률" 산출.
     *   posterior: p~Beta(conv+1, imp-conv+1) → 평균 p̂=(conv+1)/(imp+2), 분산 v=p̂(1-p̂)/(imp+3).
     *   후보(최고 p̂)가 나머지 전부보다 클 확률 = Π Φ((p̂_c-p̂_j)/√(v_c+v_j)) (정규근사·결정적, 난수 없음).
     * @param array $rows [['v'=>variantRow,'m'=>metrics], ...]
     * @return array{winnerId:int, prob:float, rates:array<int,float>}
     */
    private static function bayesBestProb(array $rows): array
    {
        $stat = []; // vid => [pHat, var, rate]
        foreach ($rows as $r) {
            $imp = max(0, (int)$r['m']['impressions']);
            $conv = max(0, min($imp, (int)$r['m']['conversions']));
            $pHat = ($conv + 1) / ($imp + 2);
            $var  = $pHat * (1 - $pHat) / ($imp + 3);
            $stat[(int)$r['v']['id']] = ['p' => $pHat, 'v' => max($var, 1e-9), 'rate' => $imp > 0 ? $conv / $imp : 0.0];
        }
        // 후보 = 최고 사후평균 전환율
        $candId = 0; $candP = -1.0;
        foreach ($stat as $vid => $s) { if ($s['p'] > $candP) { $candP = $s['p']; $candId = $vid; } }
        // P(후보가 전부보다 큼) = 쌍별 정규근사 곱
        $prob = 1.0;
        foreach ($stat as $vid => $s) {
            if ($vid === $candId) continue;
            $den = sqrt($stat[$candId]['v'] + $s['v']);
            $z = $den > 0 ? ($stat[$candId]['p'] - $s['p']) / $den : 0.0;
            $prob *= self::normalCdf($z);
        }
        $rates = []; foreach ($stat as $vid => $s) $rates[$vid] = round($s['rate'] * 100, 3);
        return ['winnerId' => $candId, 'prob' => round($prob, 4), 'rates' => $rates];
    }

    /**
     * [현 차수] 외부 재사용 공개 헬퍼 — {id,impressions,conversions} 변형 배열로 베이지안 "최고 확률" 산출.
     *   ★중복 구현 금지: bayesBestProb 동일 코어 재사용(AdminGrowth 성장 메시지 A/B 등이 호출).
     *   @param array $variants [['id'=>int,'impressions'=>int,'conversions'=>int], ...]
     *   @return array{winnerId:int, prob:float, rates:array<int,float>}
     */
    public static function pickBest(array $variants): array
    {
        $rows = [];
        foreach ($variants as $v) {
            $rows[] = ['v' => ['id' => (int)($v['id'] ?? 0)],
                       'm' => ['impressions' => (int)($v['impressions'] ?? 0), 'conversions' => (int)($v['conversions'] ?? 0)]];
        }
        if (count($rows) < 2) return ['winnerId' => (int)($variants[0]['id'] ?? 0), 'prob' => 0.0, 'rates' => []];
        return self::bayesBestProb($rows);
    }

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
        // [현 차수 초고도화 DCO] 마지막 소재 리프레시 시각(피로도 로테이션 쿨다운). 멱등 ALTER.
        try { $pdo->exec("ALTER TABLE ab_test ADD COLUMN last_dco_at " . ($mysql ? "VARCHAR(32)" : "TEXT") . " DEFAULT NULL"); } catch (Throwable $e) {}
    }

    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }

    /* [현 차수 초고도화] DCO(Dynamic Creative Optimization) 피로도 루프 파라미터 */
    private const DCO_WINDOW_DAYS = 21;   // 피로도 관측 윈도
    private const DCO_MIN_DAYS    = 8;    // 최소 관측일(부족 시 비피로=회귀0)
    private const DCO_DECAY_PCT   = 0.25; // 최근 CTR이 기준 대비 25%+ 하락 시 피로
    private const DCO_COOLDOWN_DAYS = 5;  // 리프레시 쿨다운(과도 로테이션/churn 방지)

    /** 크리에이티브 피로도 — ad_ext_id 일별 CTR 시계열의 최근 절반 평균이 기준 절반 대비 유의 하락하면 피로.
     *  빈도 포화의 대리지표(노출 누적 + CTR 감쇠). 데이터 부족/상승은 비피로. */
    private static function creativeFatigue(PDO $pdo, string $tenant, string $adExtId): array
    {
        $out = ['fatigued' => false, 'recent' => 0.0, 'baseline' => 0.0, 'days' => 0];
        if ($adExtId === '') return $out;
        try {
            $st = $pdo->prepare("SELECT date, COALESCE(SUM(impressions),0) imp, COALESCE(SUM(clicks),0) clk
                FROM performance_metrics WHERE tenant_id=? AND ad_ext_id=? AND date >= ? GROUP BY date ORDER BY date");
            $st->execute([$tenant, $adExtId, gmdate('Y-m-d', time() - self::DCO_WINDOW_DAYS * 86400)]);
            $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) { return $out; }
        $ctr = [];
        foreach ($rows as $r) { $imp = (int)$r['imp']; if ($imp >= 100) $ctr[] = (int)$r['clk'] / $imp * 100; }
        $n = count($ctr); $out['days'] = $n;
        if ($n < self::DCO_MIN_DAYS) return $out;
        $half = (int)floor($n / 2);
        $base = array_slice($ctr, 0, $half); $rec = array_slice($ctr, $half);
        $bAvg = array_sum($base) / max(1, count($base));
        $rAvg = array_sum($rec) / max(1, count($rec));
        $out['baseline'] = round($bAvg, 3); $out['recent'] = round($rAvg, 3);
        if ($bAvg > 0.1 && $rAvg < $bAvg * (1 - self::DCO_DECAY_PCT)) $out['fatigued'] = true;
        return $out;
    }

    /**
     * [현 차수 초고도화] DCO 피로도 루프 — 승자 선정 후에도 끝나지 않고, 승자 소재의 피로도(CTR 감쇠·빈도 포화)를
     *   지속 감지해 신선한 소재로 자동 로테이션·A/B 재개(Smartly/Meta Andromeda 격차 해소).
     *   ★기존 ab_test/ab_variant/AdAdapters 재사용·신규 미디어생성 0(정지된 대체 variant 재활성화). 소재 소진 시
     *   신규 소재 생성 필요를 정직 신호. 쿨다운으로 churn 방지. optimizeCampaign(cron) 에서 evaluateAndSelect 후 호출.
     */
    public static function dcoEvaluate(PDO $pdo, string $tenant, int $campaignId, bool $allowActuate = true): array
    {
        $decisions = [];
        try { self::migrate($pdo); } catch (Throwable $e) { return $decisions; }
        $tests = [];
        try {
            $st = $pdo->prepare("SELECT * FROM ab_test WHERE tenant_id=? AND campaign_id=? AND status='winner_selected'");
            $st->execute([$tenant, $campaignId]);
            $tests = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) { return $decisions; }
        $now = self::now();
        foreach ($tests as $test) {
            $testId = (int)$test['id'];
            $channel = (string)($test['channel'] ?? '');
            $lastRefresh = (string)($test['last_dco_at'] ?? '');
            if ($lastRefresh !== '' && strtotime($lastRefresh) > time() - self::DCO_COOLDOWN_DAYS * 86400) continue;
            $wv = null;
            try {
                $q = $pdo->prepare("SELECT * FROM ab_variant WHERE tenant_id=? AND ab_test_id=? AND status='winner' LIMIT 1");
                $q->execute([$tenant, $testId]); $wv = $q->fetch(PDO::FETCH_ASSOC) ?: null;
            } catch (Throwable $e) {}
            if (!$wv) continue;
            $fat = self::creativeFatigue($pdo, $tenant, (string)$wv['ad_ext_id']);
            if (!$fat['fatigued']) continue;
            $connKey = self::connectorKey($channel);
            // 신선한 대체 소재(정지된 variant) 재활성화 → A/B 재개(미디어 신규생성 0).
            $alt = null;
            try {
                $a = $pdo->prepare("SELECT * FROM ab_variant WHERE tenant_id=? AND ab_test_id=? AND status='paused' AND ad_ext_id IS NOT NULL AND ad_ext_id<>'' ORDER BY updated_at ASC LIMIT 1");
                $a->execute([$tenant, $testId]); $alt = $a->fetch(PDO::FETCH_ASSOC) ?: null;
            } catch (Throwable $e) {}
            if ($alt) {
                $ok = false;
                if ($allowActuate) { $r = AdAdapters::activate($pdo, $tenant, $connKey, (string)$alt['ad_ext_id']); $ok = !empty($r['ok']); }
                // [254차 감사] 매체 actuate 실패 시 DB 전이 금지 — applyStatus(AutoCampaign) 안전패턴 정합.
                //   실패에도 DB를 active/running·last_dco_at 로 바꾸면 ① 플랫폼(alt=paused) vs DB(50/50) desync,
                //   ② last_dco_at 기록으로 DCO_COOLDOWN_DAYS(5일) 동안 재시도 차단(미복구). allowActuate=false(데모/드라이런)는
                //   매체 호출 자체가 없어 desync 불가 → DB 전이 허용(시뮬레이션). 실 actuate 실패 시 last_dco_at 미기록=다음 cron 재시도.
                if (!$allowActuate || $ok) {
                    try {
                        $pdo->prepare("UPDATE ab_variant SET status='active',alloc_share=0.5,updated_at=? WHERE id=?")->execute([$now, (int)$alt['id']]);
                        $pdo->prepare("UPDATE ab_variant SET status='active',alloc_share=0.5,updated_at=? WHERE id=?")->execute([$now, (int)$wv['id']]);
                        $pdo->prepare("UPDATE ab_test SET status='running',winner_variant_id=NULL,last_dco_at=?,updated_at=? WHERE id=?")->execute([$now, $now, $testId]);
                    } catch (Throwable $e) {}
                    $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'creative_refresh', 'variant' => (int)$alt['id'], 'actuated' => $ok,
                        'reason' => "소재 피로도 감지(승자 CTR {$fat['recent']}% vs 기준 {$fat['baseline']}%, {$fat['days']}일) → 신선 소재 로테이션·A/B 재개(DCO)"];
                } else {
                    $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'creative_refresh_failed', 'variant' => (int)$alt['id'], 'actuated' => false,
                        'reason' => "소재 피로도 감지 → 대체 소재 활성화 시도 실패(매체 응답 오류). DB 미변경·플랫폼 정합 유지·다음 주기 재시도."];
                }
            } else {
                try { $pdo->prepare("UPDATE ab_test SET last_dco_at=?,updated_at=? WHERE id=?")->execute([$now, $now, $testId]); } catch (Throwable $e) {}
                // [254차 초고도화 ⑥] 생성형 DCO — 대체 소재 소진 시 ClaudeAI로 신소재 자동생성(opt-in·기본off=회귀0).
                //   생성된 ad_design(active)은 다음 집행 주기에 A/B 변형으로 자동 편입(buildDelivery는 매체 자격증명 게이트).
                $newId = 0;
                if (self::dcoAutoGenEnabled($pdo, $tenant)) {
                    try { $newId = \Genie\Handlers\ClaudeAI::autoGenerateAdDesign($pdo, $tenant, $channel, '일반', ''); } catch (Throwable $e) {}
                }
                if ($newId > 0) {
                    $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'creative_auto_generated', 'variant' => (int)$wv['id'], 'design_id' => $newId, 'actuated' => true,
                        'reason' => "소재 피로도 감지(CTR {$fat['recent']}% vs {$fat['baseline']}%) → AI 신소재 자동 생성·등록(design #{$newId}). 다음 집행 주기에 A/B 챌린저로 자동 편입."];
                } else {
                    $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'creative_refresh_needed', 'variant' => (int)$wv['id'], 'actuated' => false,
                        'reason' => "소재 피로도 감지(CTR {$fat['recent']}% vs {$fat['baseline']}%, {$fat['days']}일 하락) — 대체 소재 소진. [크리에이티브 스튜디오]에서 신규 소재 등록 시 자동 A/B 재개"];
                }
            }
        }
        return $decisions;
    }

    /** [254차 ⑥] 생성형 DCO opt-in 게이트 — app_setting dco_auto_generate@tenant(기본 off=회귀0). */
    private static function dcoAutoGenEnabled(PDO $pdo, string $tenant): bool
    {
        try { $st = $pdo->prepare("SELECT svalue FROM app_setting WHERE skey=? LIMIT 1"); $st->execute(['dco_auto_generate@' . $tenant]); return ((string)($st->fetchColumn() ?: '0')) === '1'; }
        catch (\Throwable $e) { return false; }
    }

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

            // 3) [232차 Sprint3] 베이지안 유의성 검정 — 전환율 사후분포로 "최고 variant일 확률" 산출.
            //    P(best) < WIN_CONFIDENCE(0.95) 면 승자 미확정(우연한 차이로 패자 정지 방지) → 계속 수집.
            $bayes = self::bayesBestProb($rows);
            $winnerId = (int)$bayes['winnerId'];
            $probPct = round($bayes['prob'] * 100, 1);
            if ($winnerId === 0 || $bayes['prob'] < self::WIN_CONFIDENCE) {
                $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'ab_collecting',
                    'reason' => "통계 유의성 미달(최고 variant 우위확률 {$probPct}% < 95%) → 승자 미확정, 데이터 계속 수집"];
                continue;
            }
            // 투명성용 보조 점수(ROAS) — 결정은 베이지안, 로그엔 ROAS/우위확률 병기.
            $scores = [];
            foreach ($rows as $r) {
                $vid = (int)$r['v']['id'];
                $scores[$vid] = ['roas' => (float)$r['m']['roas'], 'conv_rate' => $bayes['rates'][$vid] ?? 0.0, 'win_prob' => $probPct];
            }

            // 4) 승자 확정 + 패자 ad 일시정지(예산 승자 집중). 게이트/자격증명은 AdAdapters 가 처리.
            $connKey = self::connectorKey($channel);
            foreach ($rows as $r) {
                $vid = (int)$r['v']['id'];
                $adExt = (string)$r['v']['ad_ext_id'];
                if ($vid === $winnerId) {
                    try { $pdo->prepare("UPDATE ab_variant SET status='winner',alloc_share=1.0,updated_at=? WHERE id=?")->execute([self::now(), $vid]); } catch (Throwable $e) {}
                    $decisions[] = ['ab_test' => $testId, 'channel' => $channel, 'action' => 'ab_winner', 'variant' => $vid, 'roas' => $r['m']['roas'], 'reason' => "A/B 승자 선정(전환율 {$scores[$vid]['conv_rate']}%, 베이지안 우위확률 {$probPct}% ≥ 95%, ROAS {$r['m']['roas']}) → 예산 집중"];
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

    // [263차] AutoCampaign/AdAdapters 정규화 맵과 정합(line/coupang 누락 → A/B 패자 매체정지 no-op 방지). SSOT 공유 리팩터는 별도.
    private const CONNECTOR_KEY = ['meta' => 'meta_ads', 'google' => 'google_ads', 'tiktok' => 'tiktok_business', 'naver' => 'naver_sa', 'kakao' => 'kakao_moment', 'line' => 'line_ads', 'coupang_ads' => 'coupang', 'coupang' => 'coupang'];
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
