<?php
namespace Genie\Handlers;

use Genie\Db;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * 196차 Phase 2 — 광고 마케팅 자동 캠페인 엔진.
 *
 * 캠페인 설정(예산+카테고리+채널) + Phase1 AI 디자인 연결 → 자동 캠페인 생성·지속·실행상태 추적.
 * 실제 채널 광고 집행은 각 채널의 API 자격증명(channel_credential)이 연결돼 있어야 'active',
 * 미연결 채널은 'pending_connection'(연결 대기) 으로 정직하게 표기(가짜 집행 금지).
 * Phase 3(실시간 최적화)가 performance_metrics 를 읽어 본 엔진의 allocations 를 재배분한다.
 */
class AutoCampaign
{
    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        if ($t === null || $t === '') $t = (string)($req->getAttribute('auth_tenant') ?? '');
        return $t !== '' ? $t : 'unknown';
    }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b['data'] ?? $b;
    }

    private static function migrate(PDO $pdo): void
    {
        $isSqlite = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
        $auto = $isSqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
        $txt  = $isSqlite ? 'TEXT' : 'MEDIUMTEXT';
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS auto_campaign (
                id $auto,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown',
                name VARCHAR(200),
                category VARCHAR(120),
                budget BIGINT DEFAULT 0,
                period VARCHAR(20) DEFAULT 'monthly',
                channels $txt,
                allocations $txt,
                design_ids $txt,
                guardrails $txt,
                exec_status $txt,
                est_roas VARCHAR(16),
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32)
            )" . ($isSqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'));
        } catch (\Throwable $e) {}
        // 209차 P1: guardrails 컬럼 신설(기존 테이블 멱등 ALTER) — FE가 보내던 min_roas/max_share 가
        //   저장되지 않아 사용자 리스크설정이 매번 유실되던 버그(옵티마이저는 항상 기본값 사용).
        try { $pdo->exec("ALTER TABLE auto_campaign ADD COLUMN guardrails $txt"); } catch (\Throwable $e) {}
        // 196차 Phase3 — 실시간 최적화 결정 로그
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS optimization_log (
                id $auto,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'unknown',
                campaign_id INT,
                channel VARCHAR(40),
                action VARCHAR(20),
                old_alloc BIGINT DEFAULT 0,
                new_alloc BIGINT DEFAULT 0,
                roas VARCHAR(16),
                ctr VARCHAR(16),
                reason VARCHAR(255),
                created_at VARCHAR(32) NOT NULL
            )" . ($isSqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'));
        } catch (\Throwable $e) {}
    }

    /** ★ 201차 P0(마케팅): AutoMarketing 채널 id → channel_credential.channel(커넥터 키) 정규화.
     *  기존엔 'meta' 로 조회했으나 크레드 테이블은 'meta_ads' 로 저장 → 항상 미연결(pending_connection)
     *  오표기되던 버그 수정. (AutoMarketing.jsx connectorKey 와 일치) */
    private const CONNECTOR_KEY = [
        'meta' => 'meta_ads', 'tiktok' => 'tiktok_business', 'google' => 'google_ads',
        'naver' => 'naver_sa', 'kakao' => 'kakao_moment', 'coupang_ads' => 'coupang', 'coupang' => 'coupang',
    ];

    private static function connectorKey(string $channel): string
    {
        return self::CONNECTOR_KEY[$channel] ?? $channel;
    }

    /** 채널 API 자격증명 연결 여부(실제 집행 가능 판단). */
    private static function channelConnected(PDO $pdo, string $tenant, string $channel): bool
    {
        try {
            $ck = self::connectorKey($channel);
            $st = $pdo->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=? AND channel=? AND is_active=1 LIMIT 1");
            $st->execute([$tenant, $ck]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    /** POST /v423/auto-campaign/launch — 자동 캠페인 생성·실행. */
    public static function launch(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
            // 203차 ⓒ: 서버측 plan 게이트(심층방어) — 자동 캠페인은 starter 이상. fail-open(레거시 무중단).
            $gate = UserAuth::requireFeaturePlan($req, $res, 'auto_campaign');
            if ($gate !== null) return $gate;
            $d = self::body($req);

            $name     = trim((string)($d['name'] ?? '')) ?: '자동 캠페인';
            $category = trim((string)($d['category'] ?? ''));
            // [현 차수] 다중 카테고리 영속(선택 전체). category 컬럼에 콤마 결합(표시·참조용, 120자 절단).
            $categoriesArr = is_array($d['categories'] ?? null) ? array_values(array_filter(array_map('strval', $d['categories']))) : [];
            if (!empty($categoriesArr)) $category = implode(',', $categoriesArr);
            $budget   = (int)($d['budget'] ?? 0);
            $period   = trim((string)($d['period'] ?? 'monthly'));
            $channels = is_array($d['channels'] ?? null) ? array_values(array_filter(array_map('strval', $d['channels']))) : [];
            $allocations = is_array($d['allocations'] ?? null) ? $d['allocations'] : [];
            $designIds = is_array($d['design_ids'] ?? null) ? array_values(array_map('intval', $d['design_ids'])) : [];
            $estRoas  = (string)($d['est_roas'] ?? '');
            // 209차 P1: 사용자 가드레일(min_roas·max_share 등) 영속 — 옵티마이저가 실제 사용.
            $guardrails = is_array($d['guardrails'] ?? null) ? $d['guardrails'] : [];

            if ($budget <= 0) return self::json($res, ['ok' => false, 'error' => '예산을 입력하세요.'], 422);
            if (empty($channels)) return self::json($res, ['ok' => false, 'error' => '채널을 1개 이상 선택하세요.'], 422);

            $pdo = Db::pdo();
            self::migrate($pdo);

            // 채널별 실행 상태(정직). ★201차: 연결 채널은 AdAdapters 로 실제 캠페인을 PAUSED 생성.
            //   - 자격증명 미연결 → pending_connection
            //   - 연결됨 + 집행 게이트(AD_EXECUTION_ENABLED) OFF → ready(연결 완료, 집행 대기)
            //   - 연결됨 + 게이트 ON → 매체에 PAUSED 캠페인 생성 시도 → active(external_id 저장) / connect_error
            //   - Coupang 등 자동생성 미지원 → manual
            // 연결된 AI 디자인 검증(본 테넌트 소유 + 존재만 통과) — 딜리버리(ad) 크리에이티브 소스.
            $validDesigns = [];
            if (!empty($designIds)) {
                $in = implode(',', array_fill(0, count($designIds), '?'));
                try {
                    $st = $pdo->prepare("SELECT id FROM ad_design WHERE tenant_id=? AND id IN ($in)");
                    $st->execute(array_merge([$tenant], $designIds));
                    $validDesigns = array_map('intval', array_column($st->fetchAll(PDO::FETCH_ASSOC) ?: [], 'id'));
                } catch (\Throwable $e) { $validDesigns = []; }
            }
            $firstDesign = $validDesigns[0] ?? 0;
            $landing = (string)($d['landing_url'] ?? '');   // 광고 랜딩 URL(미설정 시 어댑터가 기본값)

            $exec = []; $activeCount = 0; $dispatch = []; $delivery = [];
            $allocByCh = [];
            foreach ($allocations as $a) { $allocByCh[(string)($a['channel'] ?? '')] = (int)($a['alloc'] ?? 0); }
            foreach ($channels as $ch) {
                if (!self::channelConnected($pdo, $tenant, $ch)) { $exec[$ch] = 'pending_connection'; continue; }
                $connKey = self::connectorKey($ch);
                $r = AdAdapters::createCampaign($pdo, $tenant, $connKey,
                    ['name' => $name . ' · ' . $ch, 'budget' => $allocByCh[$ch] ?? 0, 'period' => $period]);
                if (!empty($r['ok'])) {
                    $exec[$ch] = 'active'; $dispatch[$ch] = (string)$r['external_id']; $activeCount++;
                    // ★ 크리에이티브 레이어: 캠페인 하위 adset/adgroup + ad 생성(PAUSED).
                    $daily = (int)round(($allocByCh[$ch] ?? 0) / max(1, (['monthly'=>30,'quarter'=>90,'halfyear'=>180,'annual'=>365][$period] ?? 30)));
                    $dl = AdAdapters::buildDelivery($pdo, $tenant, $connKey, (string)$r['external_id'], $firstDesign, max(1000, $daily), $landing);
                    $delivery[$ch] = ['ok' => !empty($dl['ok']), 'status' => $dl['status'] ?? ($dl['ok'] ? 'full' : 'failed'), 'note' => $dl['note'] ?? ($dl['error'] ?? '')];
                }
                elseif (($r['status'] ?? '') === 'execution_disabled') { $exec[$ch] = 'ready'; }
                elseif (($r['status'] ?? '') === 'unsupported') { $exec[$ch] = 'manual'; }
                elseif (($r['status'] ?? '') === 'no_credentials') { $exec[$ch] = 'pending_connection'; }
                else { $exec[$ch] = 'connect_error'; }
            }
            // 생성된 캠페인 external_id 를 allocations 에 병합(최적화 액추에이터가 사용).
            foreach ($allocations as &$_a) { $cid = (string)($_a['channel'] ?? ''); if (isset($dispatch[$cid])) $_a['external_id'] = $dispatch[$cid]; }
            unset($_a);

            $now = gmdate('Y-m-d\TH:i:s\Z');
            $st = $pdo->prepare("INSERT INTO auto_campaign(tenant_id,name,category,budget,period,channels,allocations,design_ids,guardrails,exec_status,est_roas,status,created_at,updated_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
            $st->execute([
                $tenant, mb_substr($name, 0, 200), mb_substr($category, 0, 120), $budget, $period,
                json_encode($channels, JSON_UNESCAPED_UNICODE),
                json_encode($allocations, JSON_UNESCAPED_UNICODE),
                json_encode($validDesigns),
                json_encode($guardrails, JSON_UNESCAPED_UNICODE),
                json_encode($exec, JSON_UNESCAPED_UNICODE),
                $estRoas, 'active', $now, $now,
            ]);
            $id = (int)$pdo->lastInsertId();

            $pendingCount = count($channels) - $activeCount;
            $msg = $activeCount > 0
                ? "캠페인이 실행되었습니다. {$activeCount}개 채널 집행 시작" . ($pendingCount > 0 ? ", {$pendingCount}개 채널은 연결 대기" : "")
                : "캠페인이 생성·예약되었습니다. 채널 API 연결 후 자동 집행됩니다(연결 대기 {$pendingCount}개).";

            return self::json($res, [
                'ok' => true,
                'id' => $id,
                'exec_status' => $exec,
                'delivery' => $delivery,
                'active_channels' => $activeCount,
                'pending_channels' => $pendingCount,
                'linked_designs' => count($validDesigns),
                'message' => $msg,
            ]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** GET /v423/auto-campaign/list — 본 테넌트 자동 캠페인 목록(최신순). */
    public static function list(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            $pdo = Db::pdo();
            self::migrate($pdo);
            $rows = [];
            if ($tenant !== 'unknown') {
                $st = $pdo->prepare("SELECT * FROM auto_campaign WHERE tenant_id=? ORDER BY id DESC LIMIT 50");
                $st->execute([$tenant]);
                foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                    $r['channels']    = json_decode((string)($r['channels'] ?? '[]'), true) ?: [];
                    $r['allocations'] = json_decode((string)($r['allocations'] ?? '[]'), true) ?: [];
                    $r['design_ids']  = json_decode((string)($r['design_ids'] ?? '[]'), true) ?: [];
                    $r['exec_status'] = json_decode((string)($r['exec_status'] ?? '{}'), true) ?: new \stdClass();
                    $rows[] = $r;
                }
            }
            return self::json($res, ['ok' => true, 'campaigns' => $rows]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage(), 'campaigns' => []]);
        }
    }

    /** POST /v423/auto-campaign/status — {id, status: active|paused} 일시정지/재개. */
    public static function setStatus(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
            $d = self::body($req);
            $id = (int)($d['id'] ?? 0);
            $status = trim((string)($d['status'] ?? ''));
            if ($id <= 0 || !in_array($status, ['active', 'paused'], true)) {
                return self::json($res, ['ok' => false, 'error' => '잘못된 요청입니다.'], 422);
            }
            $pdo = Db::pdo();
            self::migrate($pdo);
            $st = $pdo->prepare("UPDATE auto_campaign SET status=?, updated_at=? WHERE id=? AND tenant_id=?");
            $st->execute([$status, gmdate('Y-m-d\TH:i:s\Z'), $id, $tenant]);
            return self::json($res, ['ok' => true, 'id' => $id, 'status' => $status]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Phase 3 — 실시간 효과 분석 기반 채널·예산 자동 최적화
    // ───────────────────────────────────────────────────────────────────────

    private const PAUSE_FLOOR = 1.0;   // ROAS < 1.0 (손해) → 예산 회수
    private const OPT_WINDOW_DAYS = 14; // 최근 14일 성과 분석

    /**
     * 채널별 최근 성과 집계(채널명 대소문자 무시).
     * ★ 202차 Phase3: $externalId(캠페인 external_id) 제공 시 campaign_ext_id 로 필터 →
     *   측정 입도를 액추에이션 입도(캠페인)와 일치(동일 채널 다중 캠페인 합산 오류 제거).
     *   구 스키마(campaign_ext_id 컬럼 부재)는 채널 단위로 자동 폴백.
     */
    private static function aggMetrics(PDO $pdo, string $tenant, string $channel, string $externalId = ''): array
    {
        $since = gmdate('Y-m-d', time() - self::OPT_WINDOW_DAYS * 86400);
        $cols = "COALESCE(SUM(impressions),0) imp, COALESCE(SUM(clicks),0) clk, COALESCE(SUM(spend),0) spend, COALESCE(SUM(conversions),0) conv, COALESCE(SUM(revenue),0) rev";
        $r = [];
        $fetched = false;
        if ($externalId !== '') {
            try {
                $st = $pdo->prepare("SELECT $cols FROM performance_metrics WHERE tenant_id=? AND LOWER(channel)=LOWER(?) AND date >= ? AND campaign_ext_id = ?");
                $st->execute([$tenant, $channel, $since, $externalId]);
                $r = $st->fetch(PDO::FETCH_ASSOC) ?: [];
                $fetched = true;
            } catch (\Throwable $e) { $fetched = false; } // 컬럼 부재 → 채널 폴백
        }
        if (!$fetched) {
            try {
                $st = $pdo->prepare("SELECT $cols FROM performance_metrics WHERE tenant_id=? AND LOWER(channel)=LOWER(?) AND date >= ?");
                $st->execute([$tenant, $channel, $since]);
                $r = $st->fetch(PDO::FETCH_ASSOC) ?: [];
            } catch (\Throwable $e) { $r = []; }
        }
        $spend = (float)($r['spend'] ?? 0); $rev = (float)($r['rev'] ?? 0);
        $imp = (int)($r['imp'] ?? 0); $clk = (int)($r['clk'] ?? 0);
        return [
            'spend' => round($spend), 'revenue' => round($rev), 'impressions' => $imp, 'clicks' => $clk,
            'conversions' => (int)($r['conv'] ?? 0),
            'roas' => $spend > 0 ? round($rev / $spend, 2) : 0,
            'ctr'  => $imp > 0 ? round($clk / $imp * 100, 2) : 0,
            'has_data' => ($spend > 0 || $imp > 0),
        ];
    }

    /** [현 차수] 당월(1일~오늘) 누적 지출 — 캠페인의 external_id 들 기준(테넌트 스코프). 월 예산 페이싱·cap 용. */
    private static function monthlySpentToDate(PDO $pdo, string $tenant, array $extIdMap): float
    {
        $extIds = array_values(array_filter(array_map('strval', $extIdMap)));
        if (empty($extIds)) return 0.0; // 아직 매체 집행 전 → 소진 0
        $monthStart = gmdate('Y-m-01');
        try {
            $in = implode(',', array_fill(0, count($extIds), '?'));
            $st = $pdo->prepare("SELECT COALESCE(SUM(spend),0) FROM performance_metrics WHERE tenant_id=? AND date >= ? AND campaign_ext_id IN ($in)");
            $st->execute(array_merge([$tenant, $monthStart], $extIds));
            return (float)$st->fetchColumn();
        } catch (\Throwable $e) { return 0.0; }
    }

    private const DRIFT_WINDOW_DAYS = 21;  // 드리프트 기준 기간(일)

    /** 채널 일별 ROAS 시계열(window일). campaign_ext_id 있으면 캠페인 입도, 컬럼 부재 시 채널 폴백. */
    private static function dailyRoas(PDO $pdo, string $tenant, string $channel, string $externalId, int $window): array
    {
        $since = gmdate('Y-m-d', time() - $window * 86400);
        $sql = "SELECT date, SUM(spend) s, SUM(revenue) r FROM performance_metrics WHERE tenant_id=? AND LOWER(channel)=LOWER(?) AND date >= ?";
        $params = [$tenant, $channel, $since];
        if ($externalId !== '') { $sql .= " AND campaign_ext_id = ?"; $params[] = $externalId; }
        $sql .= " GROUP BY date ORDER BY date";
        try {
            $st = $pdo->prepare($sql); $st->execute($params);
            $series = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $s = (float)$row['s'];
                if ($s > 0) $series[] = (float)$row['r'] / $s;
            }
            return $series;
        } catch (\Throwable $e) {
            return $externalId !== '' ? self::dailyRoas($pdo, $tenant, $channel, '', $window) : [];
        }
    }

    /** 통계적 성과 드리프트(다중 시그마): 최근 평균 ROAS 가 기준기간 대비 ≥2σ 하락 시 'degrading'.
     *  하드 정지는 하지 않고(기존 ROAS/zero-conv 규칙 유지), 소프트 가중·투명성 신호로만 사용. */
    public static function driftFromSeries(array $dailyRoas): array
    {
        $n = count($dailyRoas);
        if ($n < 7) return ['drift' => 'insufficient', 'z' => 0.0, 'recent' => 0.0, 'baseline' => 0.0, 'cov' => 0.0, 'days' => $n];
        $recentDays = max(1, min(3, intdiv($n, 3)));
        $baseline = array_slice($dailyRoas, 0, $n - $recentDays);
        $recent = array_slice($dailyRoas, $n - $recentDays);
        $mean = array_sum($baseline) / count($baseline);
        $var = 0.0; foreach ($baseline as $v) $var += ($v - $mean) ** 2;
        $std = sqrt($var / count($baseline));
        $recentMean = array_sum($recent) / count($recent);
        $z = $std > 1e-9 ? ($recentMean - $mean) / $std : 0.0;
        $cov = $mean > 1e-9 ? $std / $mean : 0.0;
        $drift = 'stable';
        if ($z <= -2.0) $drift = 'degrading';
        elseif ($z >= 2.0) $drift = 'improving';
        return ['drift' => $drift, 'z' => round($z, 2), 'recent' => round($recentMean, 2), 'baseline' => round($mean, 2), 'cov' => round($cov, 2), 'days' => $n];
    }

    /** 캠페인 1건 최적화: 성과 분석 → 예산 재배분 + 저성과 일시정지 + 결정 로그. 양 엔드포인트·cron 공용. */
    public static function optimizeCampaign(PDO $pdo, array $camp): array
    {
        $tenant = (string)$camp['tenant_id'];
        $channels = json_decode((string)($camp['channels'] ?? '[]'), true) ?: [];
        $budget = (int)($camp['budget'] ?? 0);
        $allocOld = json_decode((string)($camp['allocations'] ?? '[]'), true) ?: [];
        $oldMap = []; $extIdMap = [];
        foreach ($allocOld as $a) {
            $ck = strtolower((string)($a['channel'] ?? ''));
            $oldMap[$ck] = (float)($a['alloc'] ?? 0);
            if (!empty($a['external_id'])) $extIdMap[$ck] = (string)$a['external_id'];
        }
        $period = (string)($camp['period'] ?? 'monthly');
        $pdays = ['monthly' => 30, 'quarter' => 90, 'halfyear' => 180, 'annual' => 365][$period] ?? 30;

        $metrics = []; $anyData = false;
        foreach ($channels as $ch) {
            // Phase3: 이 캠페인의 채널별 external_id 로 측정 입도 일치(동일 채널 타 캠페인 성과 혼입 방지)
            $extId = $extIdMap[strtolower($ch)] ?? '';
            $m = self::aggMetrics($pdo, $tenant, $ch, $extId);
            // 203차 ⓑ: 통계적 성과 드리프트(다중 시그마) 신호 — 소프트 가중·투명성(하드정지 아님).
            $m['drift'] = self::driftFromSeries(self::dailyRoas($pdo, $tenant, $ch, $extId, self::DRIFT_WINDOW_DAYS));
            $metrics[$ch] = $m;
            if ($m['has_data']) $anyData = true;
        }
        if (!$anyData) {
            return ['optimized' => false, 'reason' => '성과 데이터가 아직 충분하지 않습니다. 채널 집행·데이터 수집 후 자동 최적화됩니다.', 'metrics' => $metrics];
        }

        // ── 가드레일(캠페인별 설정 override, 202차 초고도화) ──────────────────────
        //   min_roas: 이 미만이면 손실로 보고 회수(기본 1.0). zero_conv_spend_floor: 전환 0인데
        //   이만큼 이상 지출하면 낭비로 보고 자동 정지(이상감지). max_daily: 채널 일예산 상한(과지출 가드).
        $gr = json_decode((string)($camp['guardrails'] ?? '{}'), true) ?: [];
        $minRoas = isset($gr['min_roas']) ? (float)$gr['min_roas'] : self::PAUSE_FLOOR;
        $zeroConvFloor = isset($gr['zero_conv_spend_floor']) ? (float)$gr['zero_conv_spend_floor'] : 50000.0;
        $maxDaily = isset($gr['max_daily']) && $gr['max_daily'] !== null ? (int)$gr['max_daily'] : 0; // 0=미적용
        // 209차 P1: max_share(채널당 예산 비중 상한, 0~1) — FE가 보내나 리더 부재로 무시되던 가드 활성화.
        //   과집중 방지(한 채널에 예산 쏠림 차단). 0=미적용.
        $maxShare = isset($gr['max_share']) && (float)$gr['max_share'] > 0 ? min(1.0, (float)$gr['max_share']) : 0.0;

        // ── [현 차수] 1개월 예산 페이싱 + 전역 소진 cap (사용자 요구: 1개월 예산 내 지속 자동화) ──
        //   누적 지출(당월)을 추적해 ① 잔여 예산을 잔여일수로 페이싱(과/저지출 방지) ② 월 예산 소진 시
        //   전 채널 자동 정지(과지출 차단). monthly 외 기간은 비적용(0).
        $daysInMonth = (int)gmdate('t'); $dayOfMonth = (int)gmdate('j');
        $daysLeft = max(1, $daysInMonth - $dayOfMonth + 1);
        $spentMTD = ($period === 'monthly') ? self::monthlySpentToDate($pdo, $tenant, $extIdMap) : 0.0;
        $remaining = max(0, $budget - (int)round($spentMTD));
        $budgetCapHit = ($period === 'monthly' && $budget > 0 && $spentMTD >= $budget);

        // ROAS 기반 가중치 + 이상감지(zero-conv 낭비/손실 채널 자동 회수). 데이터 없으면 중립.
        $weights = []; $decisions = [];
        foreach ($channels as $ch) {
            $m = $metrics[$ch];
            if ($budgetCapHit) {  // 월 예산 전액 소진 → 전 채널 정지(과지출 차단)
                $weights[$ch] = 0.0;
                $decisions[] = ['channel' => $ch, 'action' => 'pause', 'old' => $oldMap[strtolower($ch)] ?? 0, 'new' => 0, 'roas' => $m['roas'], 'ctr' => $m['ctr'], 'reason' => "1개월 예산 소진(당월 지출 ₩" . number_format($spentMTD) . " / 예산 ₩" . number_format($budget) . ") → 전 채널 자동 정지"];
                continue;
            }
            if (!$m['has_data']) { $weights[$ch] = 0.5; continue; }
            // ① 이상감지: 지출은 있는데 전환 0 (낭비) → 즉시 회수(다채널 시).
            if ($m['conversions'] === 0 && $m['spend'] >= $zeroConvFloor && count($channels) > 1) {
                $weights[$ch] = 0.0;
                $decisions[] = ['channel' => $ch, 'action' => 'pause', 'old' => $oldMap[strtolower($ch)] ?? 0, 'new' => 0, 'roas' => $m['roas'], 'ctr' => $m['ctr'], 'reason' => "이상감지: 지출 ₩" . number_format($m['spend']) . " 대비 전환 0건 (낭비) → 자동 회수·정지"];
                continue;
            }
            // ② 손실 채널: ROAS < min_roas → 회수.
            if ($m['roas'] < $minRoas && count($channels) > 1) {
                $weights[$ch] = 0.0;
                $decisions[] = ['channel' => $ch, 'action' => 'pause', 'old' => $oldMap[strtolower($ch)] ?? 0, 'new' => 0, 'roas' => $m['roas'], 'ctr' => $m['ctr'], 'reason' => "ROAS {$m['roas']} < {$minRoas} (손실) → 예산 회수·일시정지"];
            } else {
                $w = max(0.05, (float)$m['roas']);
                // 203차 ⓑ: 드리프트 저하 채널은 소프트 패널티(하드정지 아님)로 비중 하향 + 투명 로그.
                $dr = $m['drift'] ?? [];
                if (($dr['drift'] ?? '') === 'degrading') {
                    $w *= 0.7;
                    $old0 = (int)($oldMap[strtolower($ch)] ?? 0);
                    $decisions[] = ['channel' => $ch, 'action' => 'drift_warning', 'old' => $old0, 'new' => $old0, 'roas' => $m['roas'], 'ctr' => $m['ctr'], 'reason' => "성과 드리프트 감지: 최근 ROAS {$dr['recent']} vs 기준 {$dr['baseline']} (z={$dr['z']}σ, {$dr['days']}일) → 예산 비중 30% 하향"];
                }
                $weights[$ch] = $w;
            }
        }
        $totalW = array_sum($weights) ?: 1;

        $newAlloc = [];
        foreach ($channels as $ch) {
            $a = (int)(round($budget * $weights[$ch] / $totalW / 10000) * 10000);
            // 209차 P1: max_share 상한 적용(채널당 예산 비중 캡). 초과분은 미배분(과집중 방지 가드의 보수적 해석).
            if ($maxShare > 0) { $cap = (int)(round($budget * $maxShare / 10000) * 10000); if ($a > $cap) $a = $cap; }
            $entry = ['channel' => $ch, 'alloc' => $a, 'roas' => $metrics[$ch]['roas'], 'ctr' => $metrics[$ch]['ctr']];
            $ckLow = strtolower($ch);
            if (isset($extIdMap[$ckLow])) $entry['external_id'] = $extIdMap[$ckLow]; // 액추에이터용 id 보존
            $newAlloc[] = $entry;
            $old = $oldMap[strtolower($ch)] ?? 0;
            if ($weights[$ch] > 0 && abs($a - $old) >= 10000) {
                $dir = $a > $old ? '증액' : '감액';
                $decisions[] = ['channel' => $ch, 'action' => 'realloc', 'old' => (int)$old, 'new' => $a, 'roas' => $metrics[$ch]['roas'], 'ctr' => $metrics[$ch]['ctr'], 'reason' => "ROAS {$metrics[$ch]['roas']} (최고 성과) → 예산 {$dir}"];
            }
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        try {
            $pdo->prepare("UPDATE auto_campaign SET allocations=?, updated_at=? WHERE id=?")
                ->execute([json_encode($newAlloc, JSON_UNESCAPED_UNICODE), $now, (int)$camp['id']]);
        } catch (\Throwable $e) {}
        // 결정 로그
        foreach ($decisions as $d) {
            try {
                $pdo->prepare("INSERT INTO optimization_log(tenant_id,campaign_id,channel,action,old_alloc,new_alloc,roas,ctr,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$tenant, (int)$camp['id'], $d['channel'], $d['action'], (int)($d['old'] ?? 0), (int)($d['new'] ?? 0), (string)($d['roas'] ?? ''), (string)($d['ctr'] ?? ''), mb_substr((string)$d['reason'], 0, 255), $now]);
            } catch (\Throwable $e) {}
        }
        // ★201차 액추에이터: external_id 보유 채널은 매체에 실제 예산변경/정지 push(AD_EXECUTION_ENABLED ON 시).
        //   게이트 OFF 또는 external_id 없으면 skip(DB 재배분만). 결과는 정직하게 actuated 표기.
        foreach ($decisions as &$d) {
            $ck = strtolower((string)($d['channel'] ?? ''));
            $extId = $extIdMap[$ck] ?? '';
            $act = (string)($d['action'] ?? '');
            // 203차 ⓑ: 실제 매체 액추에이션은 pause/realloc 에 한정(drift_warning 등 정보성 결정은 로그만).
            if ($extId === '' || !in_array($act, ['pause', 'realloc'], true)) { $d['actuated'] = false; continue; }
            $connKey = self::connectorKey((string)$d['channel']);
            if ($act === 'pause') {
                $rr = AdAdapters::pause($pdo, $tenant, $connKey, $extId);
            } else {
                $daily = max(1000, (int)round(((int)($d['new'] ?? 0)) / max(1, $pdays) / 100) * 100);
                // [현 차수] 월 예산 페이싱: 잔여 예산을 잔여일수로 균등 소진(과지출 방지).
                if ($period === 'monthly' && $remaining > 0) {
                    $pacedDaily = (int)round($remaining / $daysLeft / 100) * 100;
                    if ($pacedDaily > 0) $daily = min($daily, max(1000, $pacedDaily));
                }
                if ($maxDaily > 0) $daily = min($daily, $maxDaily); // 일예산 상한 가드(과지출 차단)
                $rr = AdAdapters::updateBudget($pdo, $tenant, $connKey, $extId, $daily);
            }
            $d['actuated'] = !empty($rr['ok']);
        }
        unset($d);

        return ['optimized' => true, 'allocations' => $newAlloc, 'decisions' => $decisions, 'metrics' => $metrics];
    }

    /** POST /v423/auto-campaign/optimize — {id} 본 테넌트 캠페인 즉시 최적화. */
    public static function optimize(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
            $d = self::body($req);
            $id = (int)($d['id'] ?? 0);
            if ($id <= 0) return self::json($res, ['ok' => false, 'error' => 'campaign id가 필요합니다.'], 422);
            $pdo = Db::pdo();
            self::migrate($pdo);
            $st = $pdo->prepare("SELECT * FROM auto_campaign WHERE id=? AND tenant_id=?");
            $st->execute([$id, $tenant]);
            $camp = $st->fetch(PDO::FETCH_ASSOC);
            if (!$camp) return self::json($res, ['ok' => false, 'error' => '캠페인을 찾을 수 없습니다.'], 404);
            $r = self::optimizeCampaign($pdo, $camp);
            return self::json($res, array_merge(['ok' => true, 'id' => $id], $r));
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** GET /v423/auto-campaign/optimize-history?id=X — 최적화 결정 이력(최신순). */
    public static function optimizeHistory(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            $id = (int)($req->getQueryParams()['id'] ?? 0);
            $pdo = Db::pdo();
            self::migrate($pdo);
            $rows = [];
            if ($tenant !== 'unknown' && $id > 0) {
                $st = $pdo->prepare("SELECT channel,action,old_alloc,new_alloc,roas,ctr,reason,created_at FROM optimization_log WHERE tenant_id=? AND campaign_id=? ORDER BY id DESC LIMIT 40");
                $st->execute([$tenant, $id]);
                $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            }
            return self::json($res, ['ok' => true, 'history' => $rows]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage(), 'history' => []]);
        }
    }

    /** CLI(cron) — 전체 테넌트 active 캠페인 자동 최적화. 반환: 최적화된 캠페인 수. */
    public static function optimizeAllCli(?PDO $pdo = null): int
    {
        if ($pdo === null) $pdo = Db::pdo();
        self::migrate($pdo);
        $n = 0;
        try {
            $rows = $pdo->query("SELECT * FROM auto_campaign WHERE status='active'")->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as $camp) {
                $r = self::optimizeCampaign($pdo, $camp);
                if (!empty($r['optimized'])) $n++;
            }
        } catch (\Throwable $e) {}
        return $n;
    }
}
