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
        'naver' => 'naver_sa', 'kakao' => 'kakao_moment', 'line' => 'line_ads', 'coupang_ads' => 'coupang', 'coupang' => 'coupang',
    ];

    private static function connectorKey(string $channel): string
    {
        return self::CONNECTOR_KEY[$channel] ?? $channel;
    }

    /**
     * [현 차수] 저장 광고물(ad_design.channel = AI광고디자인 플랫폼) → 광고 매체 채널(캠페인 channel) 매핑.
     *   채널별 광고물을 정확한 매체에만 배선하기 위함. 복수 매체 매핑 가능.
     *   popup/mobile_popup/landing_hero = 온사이트(웹) 소재로 광고 매체가 아님 → 빈 배열(매칭 제외).
     */
    private static function designChannelToMedia(string $platform): array
    {
        $p = strtolower(trim($platform));
        $map = [
            'meta_feed'        => ['meta_ads'],
            'instagram_feed'   => ['meta_ads', 'instagram'],
            'instagram_story'  => ['meta_ads', 'instagram'],
            'youtube_thumb'    => ['google_ads'],
            'youtube_short'    => ['google_ads'],
            'youtube_instream' => ['google_ads'],
            'youtube_bumper'   => ['google_ads'],
            'gdn'              => ['google_ads'],
            'display_banner'   => ['google_ads'],
            'tiktok'           => ['tiktok_business', 'tiktok_ads'],
            'kakao'            => ['kakao_moment', 'kakao'],
            // popup / mobile_popup / landing_hero = 온사이트(웹팝업/랜딩) → 광고 매체 아님
        ];
        return $map[$p] ?? [];
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
            $validDesigns = [];   // [id,...] 본 테넌트 소유 검증된 전체 디자인(저장용)
            $designCh = [];       // id => ad_design.channel(플랫폼) — 채널별 정확 배선용
            if (!empty($designIds)) {
                $in = implode(',', array_fill(0, count($designIds), '?'));
                try {
                    $st = $pdo->prepare("SELECT id, channel FROM ad_design WHERE tenant_id=? AND id IN ($in)");
                    $st->execute(array_merge([$tenant], $designIds));
                    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                        $rid = (int)$row['id']; $validDesigns[] = $rid; $designCh[$rid] = (string)($row['channel'] ?? '');
                    }
                } catch (\Throwable $e) { $validDesigns = []; $designCh = []; }
            }
            $firstDesign = $validDesigns[0] ?? 0;
            $landing = (string)($d['landing_url'] ?? '');   // 광고 랜딩 URL(미설정 시 어댑터가 기본값)
            // [현 차수] A/B 모드: 디자인(variant) 2+ 선택 시 같은 캠페인 하위에 동시 집행 → 승자 자동 선정.
            $abMode = !empty($d['ab_mode']) && count($validDesigns) >= 2;
            $abVariants = [];   // [channel => [variant,...]]

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
                    // [현 차수] ★채널별 광고물 정확 배선 — 캠페인 채널($ch)에 매칭되는 저장 광고물만 해당 채널에 사용.
                    //   (유튜브용 광고물이 메타 캠페인에 들어가던 채널-무관 배선 결함 수정.)
                    //   매칭 광고물이 없으면 일반(선택 전체)으로 폴백하되 정직 표기(채널 전용 광고물 저장 권장).
                    $chMatched = array_values(array_filter($validDesigns, function ($did) use ($designCh, $ch) {
                        return in_array($ch, self::designChannelToMedia($designCh[$did] ?? ''), true);
                    }));
                    $matchNote = '';
                    $chDesigns = $chMatched;
                    if (empty($chDesigns)) { $chDesigns = $validDesigns; $matchNote = ' · ⚠️ 채널 전용 광고물 없음(일반 광고물 사용 — 채널별 광고물 저장 권장)'; }
                    $chFirst = $chDesigns[0] ?? 0;
                    $chAb = !empty($d['ab_mode']) && count($chDesigns) >= 2;
                    if ($chAb) {
                        // ★ A/B: 채널 매칭 디자인(variant) 각각을 같은 캠페인 하위에 동시 집행 → ad_ext_id 수집.
                        $vlist = []; $okCnt = 0;
                        foreach ($chDesigns as $vi => $did) {
                            $dl = AdAdapters::buildDelivery($pdo, $tenant, $connKey, (string)$r['external_id'], (int)$did, max(1000, $daily), $landing);
                            if (!empty($dl['ok']) && ($dl['ad_id'] ?? '') !== '') {
                                $vlist[] = ['design_id' => (int)$did, 'frame_idx' => 0, 'ad_ext_id' => (string)$dl['ad_id'], 'adset_ext_id' => (string)($dl['adset_id'] ?? ($dl['adgroup_id'] ?? '')), 'label' => 'Variant ' . ($vi + 1)];
                                $okCnt++;
                            }
                        }
                        if (!empty($vlist)) $abVariants[$ch] = $vlist;
                        $delivery[$ch] = ['ok' => $okCnt > 0, 'status' => $okCnt >= 2 ? 'ab_running' : ($okCnt === 1 ? 'single' : 'failed'), 'matched' => count($chMatched), 'note' => "A/B variant {$okCnt}개 집행" . $matchNote];
                    } else {
                        // 단일 크리에이티브 — 채널 매칭 우선($chFirst).
                        $dl = AdAdapters::buildDelivery($pdo, $tenant, $connKey, (string)$r['external_id'], $chFirst, max(1000, $daily), $landing);
                        $delivery[$ch] = ['ok' => !empty($dl['ok']), 'status' => $dl['status'] ?? ($dl['ok'] ? 'full' : 'failed'), 'matched' => count($chMatched), 'note' => ($dl['note'] ?? ($dl['error'] ?? '')) . $matchNote];
                    }
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

            // [237차 Creative AI Studio] 소재(design_id)↔매체 ad_ext_id 매핑 영속화 → Creative Insights 성과 조인 키
            //   (creative_variant ← ad_insight_agg.ad_id). 채널을 각 variant 에 부여 후 적재(멱등).
            if (!empty($abVariants)) {
                $cvRows = [];
                foreach ($abVariants as $cvCh => $cvList) {
                    foreach ($cvList as $cvV) { $cvV['channel'] = (string)$cvCh; $cvRows[] = $cvV; }
                }
                try { CreativeStudio::recordVariants($pdo, $tenant, $id, $cvRows); } catch (\Throwable $e) {}
            }

            // ★ A/B 테스트 등록(variant 2+ 집행된 채널만). 승자선정은 optimizeCampaign(cron 매시)이 수행.
            $abTests = [];
            if ($abMode && !empty($abVariants)) {
                foreach ($abVariants as $ch => $vlist) {
                    try { $tid = AbTesting::createTest($pdo, $tenant, $id, $ch, $vlist); if ($tid > 0) $abTests[$ch] = $tid; }
                    catch (\Throwable $e) {}
                }
            }

            $pendingCount = count($channels) - $activeCount;
            $msg = $activeCount > 0
                ? "캠페인이 실행되었습니다. {$activeCount}개 채널 집행 시작" . ($pendingCount > 0 ? ", {$pendingCount}개 채널은 연결 대기" : "")
                : "캠페인이 생성·예약되었습니다. 채널 API 연결 후 자동 집행됩니다(연결 대기 {$pendingCount}개).";

            return self::json($res, [
                'ok' => true,
                'id' => $id,
                'exec_status' => $exec,
                'delivery' => $delivery,
                'ab_tests' => $abTests,
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
                    // [227차] 라이브 모니터링: 캠페인별 실 성과(performance_metrics, campaign_ext_id 입도) 집계.
                    $r['live'] = self::liveMetrics($pdo, $tenant, is_array($r['allocations']) ? $r['allocations'] : []);
                    $rows[] = $r;
                }
            }
            // 전역 킬스위치 상태 동봉(UI 토글 동기화).
            return self::json($res, ['ok' => true, 'campaigns' => $rows, 'execution_enabled' => AdAdapters::executionEnabled()]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage(), 'campaigns' => []]);
        }
    }

    /** [227차] 캠페인 allocations(채널×external_id) → 실 성과 합산(performance_metrics). 라이브 모니터링용. */
    private static function liveMetrics(PDO $pdo, string $tenant, array $allocations): array
    {
        $agg = ['spend' => 0.0, 'revenue' => 0.0, 'conversions' => 0, 'impressions' => 0, 'clicks' => 0];
        if ($tenant === 'unknown' || empty($allocations)) { $agg['roas'] = 0; return $agg; }
        foreach ($allocations as $a) {
            if (!is_array($a)) continue;
            $ch = (string)($a['channel'] ?? '');
            if ($ch === '') continue;
            $m = self::aggMetrics($pdo, $tenant, $ch, (string)($a['external_id'] ?? ''));
            $agg['spend']       += (float)($m['spend'] ?? 0);
            $agg['revenue']     += (float)($m['revenue'] ?? 0);
            $agg['conversions'] += (int)($m['conversions'] ?? 0);
            $agg['impressions'] += (int)($m['impressions'] ?? 0);
            $agg['clicks']      += (int)($m['clicks'] ?? 0);
        }
        $agg['spend']   = round($agg['spend'], 2);
        $agg['revenue'] = round($agg['revenue'], 2);
        $agg['roas']    = $agg['spend'] > 0 ? round($agg['revenue'] / $agg['spend'], 2) : 0;
        return $agg;
    }

    /** POST /v423/auto-campaign/pause-all — 본 테넌트 전 active 캠페인 긴급 일시정지(매체 push 포함). 사용자 킬스위치. */
    public static function pauseAll(Request $req, Response $res): Response
    {
        try {
            $tenant = self::tenant($req);
            if ($tenant === 'unknown') return self::json($res, ['ok' => false, 'error' => '로그인이 필요합니다.'], 401);
            $pdo = Db::pdo();
            self::migrate($pdo);
            $isReal = ($tenant !== 'demo' && strncmp($tenant, 'demo', 4) !== 0);
            $st = $pdo->prepare("SELECT id, allocations FROM auto_campaign WHERE tenant_id=? AND status='active'");
            $st->execute([$tenant]);
            $camps = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
            $paused = 0; $pushed = 0; $failed = [];
            $upd = $pdo->prepare("UPDATE auto_campaign SET status='paused', updated_at=? WHERE id=? AND tenant_id=?");
            $now = gmdate('Y-m-d\TH:i:s\Z');
            foreach ($camps as $c) {
                $allOk = true;
                if ($isReal) {
                    foreach (json_decode((string)($c['allocations'] ?? '[]'), true) ?: [] as $a) {
                        $ch = (string)($a['channel'] ?? ''); $ext = (string)($a['external_id'] ?? '');
                        if ($ch === '' || $ext === '') continue;
                        $r = AdAdapters::pause($pdo, $tenant, $ch, $ext);
                        if (!empty($r['ok'])) { $pushed++; } else { $allOk = false; }
                    }
                }
                // [233차 감사 P1] kill-switch 정직성 — 플랫폼 일시중지가 실패한 캠페인은 DB 를 'paused' 로 표기하지
                //   않는다(기존엔 무조건 paused → UI 는 정지인데 플랫폼은 계속 집행 = 실 광고비 누수). 실패분은 failed 로
                //   노출해 운영자가 플랫폼에서 직접 정지/재시도하게 한다.
                if ($allOk) {
                    $upd->execute([$now, (int)$c['id'], $tenant]);
                    $paused++;
                } else {
                    $failed[] = (int)$c['id'];
                }
            }
            return self::json($res, ['ok' => empty($failed), 'paused' => $paused, 'pushed' => $pushed, 'failed' => $failed,
                'note' => empty($failed) ? null : (count($failed) . '개 캠페인은 플랫폼 일시중지 실패 — 플랫폼 광고관리자에서 직접 정지/재시도가 필요합니다.')]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /** POST /v423/auto-campaign/status — {id, status: active|paused} 일시정지/재개.
     *  [227차 P0] 기존엔 내부 DB status 만 토글하고 매체엔 push 하지 않아 "재개"가 광고를 실제로 켜지
     *    못했다(자동 집행 SaaS 의 최종 1cm 단절). 이제 status 변경을 매체 캠페인에 실제 반영한다.
     *    ★활성화(active)는 실 광고비 지출 시작 → 인앱 버튼(명시적 사용자 승인)+결제수단 하드 게이트 후에만
     *      매체 ACTIVE 로 전환. 일시정지(paused)는 매체에도 즉시 정지 push(지출 즉시 차단). PAUSED 기본
     *      생성 안전정책·옵티마이저 자동 비활성화 유지(사람-인-루프). 데모는 매체 호출 skip(오염차단). */
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
            // 캠페인 로드(allocations 의 매체 external_id 필요).
            $cs = $pdo->prepare("SELECT id, allocations FROM auto_campaign WHERE id=? AND tenant_id=? LIMIT 1");
            $cs->execute([$id, $tenant]);
            $camp = $cs->fetch(PDO::FETCH_ASSOC);
            if (!$camp) return self::json($res, ['ok' => false, 'error' => '캠페인을 찾을 수 없습니다.'], 404);
            $allocs = json_decode((string)($camp['allocations'] ?? '[]'), true) ?: [];
            $isRealTenant = ($tenant !== 'demo' && strncmp($tenant, 'demo', 4) !== 0);

            // ★활성화 하드 게이트(운영 테넌트) — 실 광고비 지출 시작 직전.
            if ($status === 'active' && $isRealTenant) {
                if (!AdAdapters::executionEnabled()) {
                    return self::json($res, ['ok' => false, 'error' => 'execution_disabled',
                        'message' => '집행이 비활성화되어 있습니다(긴급 킬스위치). 관리자에게 문의하세요.'], 409);
                }
                if (!BillingMethod::hasActiveMethod($pdo, $tenant)) {
                    return self::json($res, ['ok' => false, 'error' => 'billing_required',
                        'message' => '광고를 활성화하려면 광고비 결제수단(카드)을 먼저 등록해야 합니다. [재무·정산 > 결제수단]에서 등록 후 다시 시도하세요.'], 402);
                }
            }

            // 매체 push(데모는 실 매체 호출 금지 — 가상/오염 차단). 캠페인이 매체에 생성돼 external_id 가 있을 때만.
            $pushed = [];
            if ($isRealTenant) {
                foreach ($allocs as $a) {
                    $ch  = (string)($a['channel'] ?? '');
                    $ext = (string)($a['external_id'] ?? '');
                    if ($ch === '' || $ext === '') continue;
                    $r = ($status === 'active')
                        ? AdAdapters::activate($pdo, $tenant, $ch, $ext)
                        : AdAdapters::pause($pdo, $tenant, $ch, $ext);
                    $pushed[] = ['channel' => $ch, 'external_id' => $ext, 'ok' => !empty($r['ok']), 'detail' => (string)($r['error'] ?? $r['status'] ?? '')];
                }
            }

            // [233차 감사 P1] kill-switch 정직성 — 실 테넌트에서 플랫폼 push(activate/pause)가 하나라도 실패하면
            //   DB 상태를 바꾸지 않는다. 기존엔 무조건 status 변경 → 'paused' 표기인데 플랫폼은 계속 집행(광고비 누수)
            //   하거나 'active' 표기인데 미집행하는 발산이 가능했다. 실패 상세를 502 로 반환해 직접 확인/재시도 유도.
            $allPushOk = true;
            foreach ($pushed as $p) { if (empty($p['ok'])) { $allPushOk = false; break; } }
            if ($isRealTenant && !$allPushOk) {
                return self::json($res, ['ok' => false, 'error' => 'platform_push_failed', 'id' => $id, 'status' => 'unchanged',
                    'pushed' => $pushed, 'message' => '플랫폼 반영 실패 — 상태를 변경하지 않았습니다. 플랫폼 광고관리자에서 직접 확인/재시도하세요.'], 502);
            }
            $st = $pdo->prepare("UPDATE auto_campaign SET status=?, updated_at=? WHERE id=? AND tenant_id=?");
            $st->execute([$status, gmdate('Y-m-d\TH:i:s\Z'), $id, $tenant]);
            return self::json($res, ['ok' => true, 'id' => $id, 'status' => $status, 'pushed' => $pushed]);
        } catch (\Throwable $e) {
            return self::json($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Phase 3 — 실시간 효과 분석 기반 채널·예산 자동 최적화
    // ───────────────────────────────────────────────────────────────────────

    private const PAUSE_FLOOR = 1.0;   // ROAS < 1.0 (손해) → 예산 회수
    private const OPT_WINDOW_DAYS = 14; // 최근 14일 성과 분석
    private const MIN_ATTR_CONV = 5;   // [현 차수 P1] 진실 ROAS 보정 적용 최소 귀속 전환수(이 미만이면 매체보고 그대로=회귀 없음)

    /** [현 차수 P1] 광고채널 패밀리 정규화(매체보고 채널명 ↔ 귀속채널명 정합용). meta/google/tiktok/naver/kakao. */
    private static function chFamily(string $ch): string
    {
        $c = strtolower(trim($ch));
        $map = [
            'meta' => 'meta', 'meta_ads' => 'meta', 'facebook' => 'meta', 'instagram' => 'meta',
            'google' => 'google', 'google_ads' => 'google', 'youtube' => 'google',
            'tiktok' => 'tiktok', 'tiktok_business' => 'tiktok',
            'naver' => 'naver', 'naver_sa' => 'naver', 'naver_searchad' => 'naver',
            'kakao' => 'kakao', 'kakao_moment' => 'kakao',
        ];
        return $map[$c] ?? $c;
    }

    /**
     * [현 차수 P1] 채널 패밀리별 실주문 귀속 매출/전환(window 내) — 매체 과대보고 보정의 진실 기준.
     *   attribution_result(model='order-match') ⨝ channel_orders(실 매출). order당 dedup(이중계산 방지).
     *   테이블/컬럼 부재 시 빈 맵 반환 → 호출부는 매체보고를 그대로 사용(회귀 없음). 요청당 (tenant,since) 캐시.
     */
    private static function realRevMap(PDO $pdo, string $tenant, string $since): array
    {
        static $cache = [];
        $ck = $tenant . '|' . $since;
        if (isset($cache[$ck])) return $cache[$ck];
        $map = [];
        try {
            $sql = "SELECT ch, COALESCE(SUM(rev),0) rev, COUNT(*) conv FROM (
                        SELECT LOWER(ar.attributed_channel) ch, ar.order_id, MAX(co.total_price) rev
                        FROM attribution_result ar
                        JOIN channel_orders co ON co.tenant_id=ar.tenant_id AND co.channel_order_id=ar.order_id
                        WHERE ar.tenant_id=? AND ar.model='order-match' AND co.ordered_at >= ?
                        GROUP BY ar.order_id, LOWER(ar.attributed_channel)
                    ) t GROUP BY ch";
            $st = $pdo->prepare($sql);
            $st->execute([$tenant, $since]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $fam = self::chFamily((string)$r['ch']);
                if (!isset($map[$fam])) $map[$fam] = ['rev' => 0.0, 'conv' => 0];
                $map[$fam]['rev']  += (float)$r['rev'];
                $map[$fam]['conv'] += (int)$r['conv'];
            }
        } catch (\Throwable $e) {
            $map = []; // 귀속 데이터 부재 → 매체보고 폴백
        }
        $cache[$ck] = $map;
        return $map;
    }

    /**
     * [239차+] 진실 ROAS 보정비율(매체 자가보고 → 실주문 귀속). 추천/자동화 두뇌 공용 SSOT —
     *   AutoRecommend 등이 재사용(중복 구현 금지). realRevMap(attribution_result order-match ⨝ channel_orders) 기준.
     *   귀속 전환 MIN_ATTR_CONV 미만이거나 mediaRevenue<=0 이면 null(호출부는 매체보고 그대로 사용=회귀 없음).
     *   반환 시 0.2~1.2 클램프(극단 변동 방어). $since 미지정 시 OPT_WINDOW_DAYS 윈도우.
     * @return float|null 보정비율(adjRev = mediaRevenue × ratio) 또는 null(보정 미적용)
     */
    public static function truthRatioForChannel(PDO $pdo, string $tenant, string $channel, float $mediaRevenue, string $since = ''): ?float
    {
        if ($tenant === '' || $mediaRevenue <= 0) return null;
        if ($since === '') $since = gmdate('Y-m-d', time() - self::OPT_WINDOW_DAYS * 86400);
        $map = self::realRevMap($pdo, $tenant, $since);
        $fam = self::chFamily($channel);
        if ((int)($map[$fam]['conv'] ?? 0) < self::MIN_ATTR_CONV) return null;
        return max(0.2, min(1.2, (float)($map[$fam]['rev'] ?? 0) / $mediaRevenue));
    }

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
        // [현 차수 P1] 진실 ROAS 보정 — 매체 자가보고 매출(rev)은 뷰스루·중복으로 체계적 과대.
        //   실주문 귀속 매출(order-match)로 산출한 truthRatio 로 보정한 adjRevenue/adjRoas 를 자동화 두뇌가 사용.
        //   귀속 전환이 MIN_ATTR_CONV 미만이면 보정 미적용(adjRoas=roas) → 데이터 부족 테넌트 회귀 0.
        $realMap = self::realRevMap($pdo, $tenant, $since);
        $fam = self::chFamily($channel);
        $realRev = (float)($realMap[$fam]['rev'] ?? 0);
        $realConv = (int)($realMap[$fam]['conv'] ?? 0);
        $adjRev = $rev; $truthRatio = null;
        if ($realConv >= self::MIN_ATTR_CONV && $rev > 0) {
            $truthRatio = max(0.2, min(1.2, $realRev / $rev)); // 극단 변동 클램프(0.2~1.2)
            $adjRev = $rev * $truthRatio;
        }
        return [
            'spend' => round($spend), 'revenue' => round($rev), 'impressions' => $imp, 'clicks' => $clk,
            'conversions' => (int)($r['conv'] ?? 0),
            'roas' => $spend > 0 ? round($rev / $spend, 2) : 0,
            'ctr'  => $imp > 0 ? round($clk / $imp * 100, 2) : 0,
            'has_data' => ($spend > 0 || $imp > 0),
            // 진실 ROAS 보정 필드(자동화 두뇌·투명성 로그용)
            'real_revenue' => round($realRev), 'real_conv' => $realConv,
            'truth_ratio'  => $truthRatio !== null ? round($truthRatio, 3) : null,
            'adj_revenue'  => round($adjRev),
            'adj_roas'     => $spend > 0 ? round($adjRev / $spend, 2) : 0,
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
    /** 테넌트 당월(1일~오늘) 전체 광고 지출 — 전 캠페인 합산(전역 spend cap 용). */
    private static function tenantMonthlySpend(PDO $pdo, string $tenant): float
    {
        try {
            $monthStart = gmdate('Y-m-01');
            $st = $pdo->prepare("SELECT COALESCE(SUM(spend),0) FROM performance_metrics WHERE tenant_id=? AND date >= ?");
            $st->execute([$tenant, $monthStart]);
            return (float)$st->fetchColumn();
        } catch (\Throwable $e) { return 0.0; }
    }

    /**
     * @param bool $allowActuate 매체 실제 집행(예산변경/정지 push) 허용 여부. 데모 DB/env 는 false 로
     *   호출해 실 광고비 변경을 절대 일으키지 않는다(DB 재배분 시뮬레이션만).
     */
    public static function optimizeCampaign(PDO $pdo, array $camp, bool $allowActuate = true): array
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
            // [현 차수 P1] 예산 결정은 진실 ROAS(adj_roas)로 — 매체 과대보고로 인한 예산 오배분 제거.
            //   귀속 데이터 부족 시 adj_roas==roas 라 회귀 없음. truthRatio 적용 시 결정 사유에 투명 표기.
            $decRoas = (float)($m['adj_roas'] ?? $m['roas']);
            $tr = $m['truth_ratio'] ?? null;
            $trNote = ($tr !== null && $tr < 0.98) ? " · 진실ROAS {$decRoas}(매체보고 {$m['roas']}×귀속 {$tr})" : '';
            // ① 이상감지: 지출은 있는데 전환 0 (낭비) → 즉시 회수(다채널 시).
            if ($m['conversions'] === 0 && $m['spend'] >= $zeroConvFloor && count($channels) > 1) {
                $weights[$ch] = 0.0;
                $decisions[] = ['channel' => $ch, 'action' => 'pause', 'old' => $oldMap[strtolower($ch)] ?? 0, 'new' => 0, 'roas' => $m['roas'], 'ctr' => $m['ctr'], 'reason' => "이상감지: 지출 ₩" . number_format($m['spend']) . " 대비 전환 0건 (낭비) → 자동 회수·정지"];
                continue;
            }
            // ② 손실 채널: 진실 ROAS < min_roas → 회수.
            if ($decRoas < $minRoas && count($channels) > 1) {
                $weights[$ch] = 0.0;
                $decisions[] = ['channel' => $ch, 'action' => 'pause', 'old' => $oldMap[strtolower($ch)] ?? 0, 'new' => 0, 'roas' => $m['roas'], 'ctr' => $m['ctr'], 'reason' => "ROAS {$decRoas} < {$minRoas} (손실) → 예산 회수·일시정지{$trNote}"];
            } else {
                $w = max(0.05, $decRoas);
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
                // [현 차수 P1] 재배분 근거 ROAS = 진실 ROAS(adj_roas). 매체보고 대비 보정됐으면 투명 병기.
                $mr = $metrics[$ch]; $dRoas = (float)($mr['adj_roas'] ?? $mr['roas']); $tRatio = $mr['truth_ratio'] ?? null;
                $tNote = ($tRatio !== null && $tRatio < 0.98) ? " (매체보고 {$mr['roas']}×귀속 {$tRatio} 보정)" : '';
                $decisions[] = ['channel' => $ch, 'action' => 'realloc', 'old' => (int)$old, 'new' => $a, 'roas' => $mr['roas'], 'ctr' => $mr['ctr'], 'reason' => "진실 ROAS {$dRoas}{$tNote} → 예산 {$dir}"];
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
        // 212차 #6(P2): 테넌트 전역 월 spend cap. env AD_TENANT_MONTHLY_CAP(KRW, 0=미적용) 이상이면
        //   당월 전 캠페인 누적 광고비가 상한 도달 → 예산 '증액(realloc)' 매체 push 차단(정지·감액은 허용=안전쪽).
        $tenantCap = (int)(getenv('AD_TENANT_MONTHLY_CAP') ?: 0);
        $tenantCapHit = $tenantCap > 0 && self::tenantMonthlySpend($pdo, $tenant) >= $tenantCap;
        // [현 차수] 관리형 지출 월렛: 실 매체 집행 전 광고비 결제수단(카드) 필수.
        //   미등록이면 실집행(매체 push) 보류 — 카드 없이 과금되는 일을 원천 차단. 데모/미연결 테넌트는 면제.
        $isRealTenant = $tenant !== '' && $tenant !== 'demo' && $tenant !== 'unknown' && strncmp($tenant, 'demo', 4) !== 0;
        if ($allowActuate && $isRealTenant && !BillingMethod::hasActiveMethod($pdo, $tenant)) {
            $allowActuate = false;
            $decisions[] = ['channel' => '—', 'action' => 'billing_required', 'old' => 0, 'new' => 0, 'roas' => '', 'ctr' => '',
                'reason' => '광고비 결제수단(카드) 미등록 → 실집행 보류. [재무·정산 > 결제수단]에서 카드를 등록하면 월 예산 한도 내에서 자동 집행됩니다.'];
            try {
                $pdo->prepare("INSERT INTO optimization_log(tenant_id,campaign_id,channel,action,old_alloc,new_alloc,roas,ctr,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
                    ->execute([$tenant, (int)$camp['id'], '—', 'billing_required', 0, 0, '', '', '광고비 결제수단 미등록 → 실집행 보류', $now]);
            } catch (\Throwable $e) {}
        }
        // ★201차 액추에이터: external_id 보유 채널은 매체에 실제 예산변경/정지 push(AD_EXECUTION_ENABLED ON 시).
        //   게이트 OFF/external_id 없음/allowActuate=false(데모) 면 skip(DB 재배분만). 결과는 정직하게 actuated 표기.
        foreach ($decisions as &$d) {
            $ck = strtolower((string)($d['channel'] ?? ''));
            $extId = $extIdMap[$ck] ?? '';
            $act = (string)($d['action'] ?? '');
            // 203차 ⓑ: 실제 매체 액추에이션은 pause/realloc 에 한정(drift_warning 등 정보성 결정은 로그만).
            //   212차: 데모(allowActuate=false)는 실집행 절대 금지.
            if (!$allowActuate || $extId === '' || !in_array($act, ['pause', 'realloc'], true)) { $d['actuated'] = false; continue; }
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
                // 212차 #6: 전역 cap 도달 시 증액 push 스킵(현 일예산 유지). 감액은 위 분기로 통과(안전쪽).
                $oldDaily = (int)round(((int)($d['old'] ?? 0)) / max(1, $pdays));
                if ($tenantCapHit && $daily > $oldDaily) { $d['actuated'] = false; $d['cap_blocked'] = true; continue; }
                $rr = AdAdapters::updateBudget($pdo, $tenant, $connKey, $extId, $daily);
            }
            $d['actuated'] = !empty($rr['ok']);
        }
        unset($d);

        // [현 차수] 관리형 지출 월렛 정산: 당월 실집행 광고비를 등록 카드로 청구하되, 누적 청구가
        //   월 예산을 절대 넘지 않도록 캡(min(spend,budget) - 기청구분 만 신규 청구). monthly + 실집행 가능 + 실테넌트만.
        //   Toss 빌링키 미설정 시 원장 pending(정직, 실청구 0). 절대 throw 안 함(집행 흐름 무중단).
        if ($period === 'monthly' && $allowActuate && $isRealTenant && $budget > 0) {
            $settle = BillingMethod::settleManagedSpend($pdo, $tenant, $spentMTD, $budget, (int)$camp['id']);
            if (!empty($settle['charged'])) {
                $decisions[] = ['channel' => '—', 'action' => 'charge', 'old' => 0, 'new' => (int)$settle['charged'], 'roas' => '', 'ctr' => '',
                    'reason' => '광고비 카드 청구 ₩' . number_format((int)$settle['charged']) . ' (당월 누적 한도 ₩' . number_format($budget) . ' 내)'];
            }
        }

        // ★ [현 차수] A/B: 캠페인 variant 승자선정·패자 자동정지(데이터 충분 시). 결정 로그 병합.
        try {
            $abDec = AbTesting::evaluateAndSelect($pdo, $tenant, (int)$camp['id']);
            foreach ($abDec as $ad) {
                $decisions[] = $ad;
                try {
                    $pdo->prepare("INSERT INTO optimization_log(tenant_id,campaign_id,channel,action,old_alloc,new_alloc,roas,ctr,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
                        ->execute([$tenant, (int)$camp['id'], (string)($ad['channel'] ?? ''), (string)($ad['action'] ?? 'ab'), 0, 0, (string)($ad['roas'] ?? ''), '', mb_substr((string)($ad['reason'] ?? ''), 0, 255), $now]);
                } catch (\Throwable $e) {}
            }
        } catch (\Throwable $e) {}

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
            // 212차 #6: 데모 env 는 실 매체 집행 금지(DB 재배분 시뮬레이션만).
            $r = self::optimizeCampaign($pdo, $camp, Db::env() !== 'demo');
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

    /** CLI(cron) — 전체 테넌트 active 캠페인 자동 최적화. 반환: 최적화된 캠페인 수.
     *  @param bool $allowActuate 데모 DB 는 false 로 호출(실 광고비 변경 금지, DB 재배분만). */
    public static function optimizeAllCli(?PDO $pdo = null, bool $allowActuate = true): int
    {
        if ($pdo === null) $pdo = Db::pdo();
        self::migrate($pdo);
        $n = 0;
        try {
            $rows = $pdo->query("SELECT * FROM auto_campaign WHERE status='active'")->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as $camp) {
                $r = self::optimizeCampaign($pdo, $camp, $allowActuate);
                if (!empty($r['optimized'])) $n++;
            }
        } catch (\Throwable $e) {}
        return $n;
    }
}
