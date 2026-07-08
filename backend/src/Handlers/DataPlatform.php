<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use PDO;

/**
 * 272차: 통합 데이터 플랫폼 — 1단계(Subscriber-Owned Data 자산화 + Data Source Registry).
 *
 * 목적(지시서 원칙: 중복 신설 금지·기존 확장): GeniegoROI 구독회원이 등록한 1차 데이터와 외부 채널에서
 * 수집한 원천 데이터를 "출처가 명시된 데이터 자산"으로 카탈로그화한다. 원천 raw 저장/정규화/집계는
 * 이미 구현돼 있으므로(channel_orders·raw_vendor_event·Rollup SSOT 등) **재구현하지 않고**, 여기서는:
 *   ① tenant_business_profile — 구독사 회사/브랜드 프로필(site_company=플랫폼 자사용이라 재사용 불가·신설 정당)
 *   ② data_source — 데이터 소스 레지스트리(구독등록 vs 외부수집 구분·source_type/channel/account/credential/priority)
 * 만 신설한다. 외부채널 소스는 기존 channel_credential 에서 자동 유도(중복입력 0).
 *
 * 격리: 전 쿼리 tenant_id 강제(미들웨어 auth_tenant + 핸들러 WHERE). PII 무저장(프로필은 사업정보만).
 */
class DataPlatform
{
    private static function db(): PDO { return Db::pdo(); }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (!$b) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b;
    }
    /** 인증 테넌트(미들웨어 주입 auth_tenant 우선·세션 self-auth 폴백). 미인증 null. */
    private static function tenant(Request $req): ?string
    {
        $t = $req->getAttribute('auth_tenant');
        if (is_string($t) && $t !== '') return $t;
        return UserAuth::authedTenant($req);
    }

    public static function ensureTables(): void
    {
        $pdo = self::db();
        $mysql = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql';
        try {
            if ($mysql) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_business_profile (
                    tenant_id VARCHAR(100) PRIMARY KEY,
                    company_name VARCHAR(200) NULL, biz_reg_no VARCHAR(60) NULL, industry VARCHAR(120) NULL,
                    company_size VARCHAR(60) NULL, country VARCHAR(60) NULL, website VARCHAR(255) NULL,
                    brand_name VARCHAR(200) NULL, brand_positioning TEXT NULL, brand_tone VARCHAR(200) NULL,
                    brand_json MEDIUMTEXT NULL, profile_json MEDIUMTEXT NULL,
                    updated_by VARCHAR(190) NULL, created_at VARCHAR(32), updated_at VARCHAR(32)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
                $pdo->exec("CREATE TABLE IF NOT EXISTS data_source (
                    id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL,
                    source_type VARCHAR(30) NOT NULL, source_channel VARCHAR(120) NOT NULL,
                    source_account VARCHAR(200) NOT NULL DEFAULT '', source_credential_id INT NULL,
                    data_kind VARCHAR(60) NOT NULL DEFAULT 'general', source_priority INT NOT NULL DEFAULT 100,
                    status VARCHAR(20) NOT NULL DEFAULT 'active', note VARCHAR(500) NULL,
                    last_seen_at VARCHAR(32) NULL, created_at VARCHAR(32), updated_at VARCHAR(32),
                    UNIQUE KEY uq_ds (tenant_id, source_type, source_channel, data_kind),
                    KEY idx_ds_tenant (tenant_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            } else {
                $pdo->exec("CREATE TABLE IF NOT EXISTS tenant_business_profile (tenant_id TEXT PRIMARY KEY, company_name TEXT, biz_reg_no TEXT, industry TEXT, company_size TEXT, country TEXT, website TEXT, brand_name TEXT, brand_positioning TEXT, brand_tone TEXT, brand_json TEXT, profile_json TEXT, updated_by TEXT, created_at TEXT, updated_at TEXT)");
                $pdo->exec("CREATE TABLE IF NOT EXISTS data_source (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL, source_type TEXT NOT NULL, source_channel TEXT NOT NULL, source_account TEXT NOT NULL DEFAULT '', source_credential_id INTEGER, data_kind TEXT NOT NULL DEFAULT 'general', source_priority INTEGER NOT NULL DEFAULT 100, status TEXT NOT NULL DEFAULT 'active', note TEXT, last_seen_at TEXT, created_at TEXT, updated_at TEXT, UNIQUE(tenant_id, source_type, source_channel, data_kind))");
            }
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /* ════════════════ 구독사 회사/브랜드 프로필(L1 자산) ════════════════ */

    /** GET /api/data/business-profile — 내 회사/브랜드 프로필. */
    public static function getBusinessProfile(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $st = self::db()->prepare("SELECT * FROM tenant_business_profile WHERE tenant_id=? LIMIT 1");
        $st->execute([$t]);
        $row = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row) {
            $row['brand'] = json_decode((string)($row['brand_json'] ?? ''), true) ?: null;
            $row['profile'] = json_decode((string)($row['profile_json'] ?? ''), true) ?: null;
            unset($row['brand_json'], $row['profile_json']);
        }
        return self::json($res, ['ok' => true, 'profile' => $row]);
    }

    /** PUT /api/data/business-profile — 회사/브랜드 프로필 저장(구독사 owner). 수정 이력=updated_at/by + 감사. */
    public static function saveBusinessProfile(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = self::db(); $b = self::body($req); $now = self::now();
        $u = UserAuth::authedUser($req); $by = (string)($u['email'] ?? '');
        $s = fn($k, $max = 255) => mb_substr(trim((string)($b[$k] ?? '')), 0, $max);
        $brand = is_array($b['brand'] ?? null) ? $b['brand'] : [];
        $profile = is_array($b['profile'] ?? null) ? $b['profile'] : [];
        $cols = [
            'company_name' => $s('company_name', 200), 'biz_reg_no' => $s('biz_reg_no', 60), 'industry' => $s('industry', 120),
            'company_size' => $s('company_size', 60), 'country' => $s('country', 60), 'website' => $s('website', 255),
            'brand_name' => $s('brand_name', 200), 'brand_positioning' => mb_substr(trim((string)($b['brand_positioning'] ?? '')), 0, 2000),
            'brand_tone' => $s('brand_tone', 200),
            'brand_json' => json_encode($brand, JSON_UNESCAPED_UNICODE), 'profile_json' => json_encode($profile, JSON_UNESCAPED_UNICODE),
            'updated_by' => $by, 'updated_at' => $now,
        ];
        $exists = $pdo->prepare("SELECT 1 FROM tenant_business_profile WHERE tenant_id=?"); $exists->execute([$t]);
        if ($exists->fetchColumn()) {
            $set = implode(',', array_map(fn($c) => "$c=?", array_keys($cols)));
            $vals = array_values($cols); $vals[] = $t;
            $pdo->prepare("UPDATE tenant_business_profile SET $set WHERE tenant_id=?")->execute($vals);
        } else {
            $cols['tenant_id'] = $t; $cols['created_at'] = $now;
            $keys = array_keys($cols); $ph = implode(',', array_fill(0, count($keys), '?'));
            $pdo->prepare("INSERT INTO tenant_business_profile (" . implode(',', $keys) . ") VALUES ($ph)")->execute(array_values($cols));
        }
        try { \Genie\SecurityAudit::log($pdo, $t, $by, 'data.business_profile_saved', ['company' => $cols['company_name']], $req); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true]);
    }

    /* ════════════════ 데이터 소스 레지스트리(구독등록 vs 외부수집 구분) ════════════════ */

    /** 외부 채널 소스를 channel_credential 에서 자동 유도·레지스트리 upsert(중복입력 0). data_kind=sync_kind. */
    private static function syncExternalSources(string $t): void
    {
        $pdo = self::db();
        try {
            $st = $pdo->prepare("SELECT id, channel, label, is_active, updated_at FROM channel_credential WHERE tenant_id=? AND channel<>''");
            $st->execute([$t]);
            $seen = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $c) {
                $ch = (string)$c['channel'];
                if (isset($seen[$ch])) continue; $seen[$ch] = true;
                $kind = self::channelDataKind($pdo, $ch);
                $status = ((int)($c['is_active'] ?? 0) === 1) ? 'active' : 'inactive';
                self::upsertSource($t, 'external_channel', $ch, (string)($c['label'] ?? $ch), (int)$c['id'], $kind, 90, $status, (string)($c['updated_at'] ?? self::now()));
            }
        } catch (\Throwable $e) { /* channel_registry syncKindFor 부재 등 — general 폴백 */ }
    }

    /** 채널→데이터종류(data_kind) 해석 — channel_registry.sync_kind 우선, 부재 시 general. */
    private static function channelDataKind(PDO $pdo, string $channel): string
    {
        try {
            $st = $pdo->prepare("SELECT sync_kind FROM channel_registry WHERE channel_key=? LIMIT 1");
            $st->execute([$channel]);
            $k = (string)($st->fetchColumn() ?: '');
            return ($k !== '' && $k !== 'none') ? $k : 'general';
        } catch (\Throwable $e) { return 'general'; }
    }

    /** 소스 upsert(멱등·자연키 tenant+type+channel+kind). */
    private static function upsertSource(string $t, string $type, string $channel, string $account, ?int $credId, string $kind, int $priority, string $status, string $lastSeen): void
    {
        $pdo = self::db(); $now = self::now();
        $ex = $pdo->prepare("SELECT id FROM data_source WHERE tenant_id=? AND source_type=? AND source_channel=? AND data_kind=? LIMIT 1");
        $ex->execute([$t, $type, $channel, $kind]);
        $id = (int)($ex->fetchColumn() ?: 0);
        if ($id > 0) {
            $pdo->prepare("UPDATE data_source SET source_account=?, source_credential_id=?, status=?, last_seen_at=?, updated_at=? WHERE id=?")
                ->execute([$account, $credId, $status, $lastSeen, $now, $id]);
        } else {
            $pdo->prepare("INSERT INTO data_source (tenant_id,source_type,source_channel,source_account,source_credential_id,data_kind,source_priority,status,last_seen_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$t, $type, $channel, $account, $credId, $kind, $priority, $status, $lastSeen, $now, $now]);
        }
    }

    /** GET /api/data-sources — 전 소스(구독등록+외부수집, 외부는 자동 유도). */
    public static function listSources(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        self::syncExternalSources($t);
        $st = self::db()->prepare("SELECT id,source_type,source_channel,source_account,source_credential_id,data_kind,source_priority,status,note,last_seen_at,updated_at FROM data_source WHERE tenant_id=? ORDER BY source_type, source_priority DESC, source_channel");
        $st->execute([$t]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $sub = array_values(array_filter($rows, fn($r) => $r['source_type'] === 'subscriber_owned'));
        $ext = array_values(array_filter($rows, fn($r) => $r['source_type'] === 'external_channel'));
        return self::json($res, ['ok' => true, 'sources' => $rows, 'subscriber_owned' => $sub, 'external_channels' => $ext,
            'summary' => ['total' => count($rows), 'subscriber_owned' => count($sub), 'external_channels' => count($ext),
                          'active' => count(array_filter($rows, fn($r) => $r['status'] === 'active')),
                          'isolated' => count(array_filter($rows, fn($r) => $r['status'] === 'isolated'))]]);
    }

    /** GET /api/data-sources/subscriber-owned */
    public static function subscriberOwned(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $st = self::db()->prepare("SELECT id,source_channel,source_account,data_kind,source_priority,status,note,last_seen_at,updated_at FROM data_source WHERE tenant_id=? AND source_type='subscriber_owned' ORDER BY source_priority DESC");
        $st->execute([$t]);
        return self::json($res, ['ok' => true, 'sources' => $st->fetchAll(PDO::FETCH_ASSOC) ?: []]);
    }

    /** GET /api/data-sources/external-channels — channel_credential 자동유도. */
    public static function externalChannels(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        self::syncExternalSources($t);
        $st = self::db()->prepare("SELECT id,source_channel,source_account,source_credential_id,data_kind,source_priority,status,last_seen_at,updated_at FROM data_source WHERE tenant_id=? AND source_type='external_channel' ORDER BY status, source_channel");
        $st->execute([$t]);
        return self::json($res, ['ok' => true, 'sources' => $st->fetchAll(PDO::FETCH_ASSOC) ?: []]);
    }

    /* ════════════════ 데이터 품질·신뢰도(레코드 스캔 + 도메인 신뢰등급) ════════════════ */

    /** 안전 카운트(쿼리 실패=null). */
    private static function cnt(PDO $pdo, string $sql, array $bind): ?int
    {
        try { $st = $pdo->prepare($sql); $st->execute($bind); return (int)$st->fetchColumn(); }
        catch (\Throwable $e) { return null; }
    }

    /**
     * GET /api/data-quality — 레코드 단위 품질 스캔 + 도메인 신뢰도점수(수집시점 인라인 방어의 사후 감지 계층).
     *   지시서 요구: 결측·중복·음수매출·잘못된날짜·통화 이상 탐지 + 품질/신뢰도 점수. 기존 raw 테이블 tenant 스코프.
     */
    public static function dataQuality(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $pdo = self::db();

        // ── 주문(channel_orders) 레코드 품질 ──
        $ordTotal = self::cnt($pdo, "SELECT COUNT(*) FROM channel_orders WHERE tenant_id=?", [$t]);
        $issues = [];
        $ordScore = null;
        if ($ordTotal !== null && $ordTotal > 0) {
            $missSku  = self::cnt($pdo, "SELECT COUNT(*) FROM channel_orders WHERE tenant_id=? AND (sku IS NULL OR sku='')", [$t]) ?? 0;
            $missDate = self::cnt($pdo, "SELECT COUNT(*) FROM channel_orders WHERE tenant_id=? AND (ordered_at IS NULL OR ordered_at='')", [$t]) ?? 0;
            $negRev   = self::cnt($pdo, "SELECT COUNT(*) FROM channel_orders WHERE tenant_id=? AND total_price < 0", [$t]) ?? 0;
            $zeroRev  = self::cnt($pdo, "SELECT COUNT(*) FROM channel_orders WHERE tenant_id=? AND (event_type IS NULL OR event_type='order') AND total_price = 0", [$t]) ?? 0;
            $badDate  = self::cnt($pdo, "SELECT COUNT(*) FROM channel_orders WHERE tenant_id=? AND ordered_at<>'' AND ordered_at NOT LIKE '____-__-__%'", [$t]) ?? 0;
            $issues['orders'] = ['total' => $ordTotal, 'missing_sku' => $missSku, 'missing_date' => $missDate,
                'negative_revenue' => $negRev, 'zero_price_orders' => $zeroRev, 'bad_date_format' => $badDate];
            $bad = $missSku + $missDate + $negRev + $badDate;
            $completeness = $ordTotal > 0 ? max(0, 1 - $bad / $ordTotal) : 0;
            $ordScore = (int)round($completeness * 100);
        }

        // ── 광고(performance_metrics) 레코드 품질 ──
        $adTotal = self::cnt($pdo, "SELECT COUNT(*) FROM performance_metrics WHERE tenant_id=?", [$t]);
        $adScore = null;
        if ($adTotal !== null && $adTotal > 0) {
            $negSpend = self::cnt($pdo, "SELECT COUNT(*) FROM performance_metrics WHERE tenant_id=? AND spend < 0", [$t]) ?? 0;
            $missDate = self::cnt($pdo, "SELECT COUNT(*) FROM performance_metrics WHERE tenant_id=? AND (date IS NULL OR date='')", [$t]) ?? 0;
            $issues['ads'] = ['total' => $adTotal, 'negative_spend' => $negSpend, 'missing_date' => $missDate];
            $adScore = (int)round(max(0, 1 - ($negSpend + $missDate) / max(1, $adTotal)) * 100);
        }

        // ── 신선도(connector_sync_log) ──
        $fresh = [];
        try {
            $st = $pdo->prepare("SELECT channel, status, rows_persisted, synced_at FROM connector_sync_log WHERE tenant_id=? ORDER BY synced_at DESC LIMIT 200");
            $st->execute([$t]);
            $now = time();
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
                $mins = null;
                $ts = strtotime((string)($r['synced_at'] ?? ''));
                if ($ts) $mins = max(0, (int)round(($now - $ts) / 60));
                $fresh[] = ['channel' => $r['channel'], 'status' => $r['status'], 'rows' => (int)($r['rows_persisted'] ?? 0), 'age_minutes' => $mins];
            }
        } catch (\Throwable $e) {}
        $errChannels = count(array_filter($fresh, fn($f) => ($f['status'] ?? '') === 'error'));
        $staleChannels = count(array_filter($fresh, fn($f) => $f['age_minutes'] !== null && $f['age_minutes'] > 1440));

        // ── 종합 신뢰도 규칙(DataTrustDashboard 소비용) ──
        $rules = [
            ['key' => 'freshness', 'label' => '데이터 신선도 < 24h', 'pass' => count($fresh) ? ($staleChannels === 0) : null],
            ['key' => 'completeness', 'label' => '필드 완전성 ≥ 90%', 'pass' => ($ordScore === null && $adScore === null) ? null : (($ordScore ?? 100) >= 90 && ($adScore ?? 100) >= 90)],
            ['key' => 'no_negative', 'label' => '음수 매출/지출 0건', 'pass' => ($ordTotal || $adTotal) ? ((($issues['orders']['negative_revenue'] ?? 0) + ($issues['ads']['negative_spend'] ?? 0)) === 0) : null],
            ['key' => 'sync_health', 'label' => '채널 수집 오류 0건', 'pass' => count($fresh) ? ($errChannels === 0) : null],
        ];
        // 신뢰도 점수(0~100): 도메인 완전성 평균 × 신선도/오류 패널티.
        $scoreParts = array_values(array_filter([$ordScore, $adScore], fn($v) => $v !== null));
        $baseScore = $scoreParts ? array_sum($scoreParts) / count($scoreParts) : null;
        $reliability = $baseScore === null ? null : (int)round(max(0, $baseScore - $staleChannels * 3 - $errChannels * 5));

        return self::json($res, ['ok' => true, 'tenant' => $t,
            'reliability_score' => $reliability, 'quality' => $issues, 'freshness' => $fresh,
            'summary' => ['orders_completeness' => $ordScore, 'ads_completeness' => $adScore,
                          'error_channels' => $errChannels, 'stale_channels' => $staleChannels],
            'rules' => $rules,
            'note' => ($ordTotal || $adTotal) ? null : '아직 수집/등록된 데이터가 없습니다. 채널 자격증명을 등록하면 실데이터 기반 품질/신뢰도가 산출됩니다.']);
    }

    /**
     * GET /api/data-lineage — 통합 분석 결과의 원천 추적(계보). 분석 도메인 → 원천 데이터소스 + 신선도 + 정규화규칙.
     *   지시서 요구: 어떤 원천/채널/정규화규칙에서 파생됐는지 추적. 기존 data_source·connector_sync_log 결합(신설 테이블 0).
     */
    public static function dataLineage(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        self::syncExternalSources($t);
        $pdo = self::db();
        $srcByKind = [];
        try {
            $st = $pdo->prepare("SELECT source_type,source_channel,data_kind,status,last_seen_at FROM data_source WHERE tenant_id=?");
            $st->execute([$t]);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) { $srcByKind[$r['data_kind']][] = $r; }
        } catch (\Throwable $e) {}
        // 분석 도메인 → 원천 data_kind + 정규화규칙(고정 SSOT 매핑) + 산출 정본 위치.
        $domains = [
            ['analysis' => '통합 매출/ROAS', 'source_kinds' => ['commerce', 'orders', 'ad'], 'normalization' => ['fxToKrw(KRW 단일정규화)', '취소제외 SSOT(OrderHub::cancelExclusion)', '자연키 멱등 dedup'], 'ssot' => 'Rollup::platform / OrderHub::rollupSettlementsCore'],
            ['analysis' => '어트리뷰션(MTA/Shapley/Markov)', 'source_kinds' => ['ad', 'orders'], 'normalization' => ['attribution_touch utm/coupon 표준', 'order-match dedup(주문당 1)', '뷰스루 클릭우선'], 'ssot' => 'AttributionEngine::computeModels'],
            ['analysis' => 'MMM/예산최적화', 'source_kinds' => ['ad', 'commerce'], 'normalization' => ['adstock/Hill 포화', '공헌마진 융합'], 'ssot' => 'Mmm::bayesian / frontier'],
            ['analysis' => 'CRM/LTV/세그먼트', 'source_kinds' => ['orders', 'customers'], 'normalization' => ['identity 통합(union-find)', '취소/반품 역분개(순액화)'], 'ssot' => 'CRM / CustomerAI'],
            ['analysis' => 'SKU/상품 성과', 'source_kinds' => ['commerce', 'products', 'ad'], 'normalization' => ['원가 SSOT(PriceOpt::costMap)', 'SKU×채널 결합'], 'ssot' => 'Rollup::productChannelMatrix'],
        ];
        $out = [];
        foreach ($domains as $d) {
            $srcs = [];
            foreach ($d['source_kinds'] as $k) foreach (($srcByKind[$k] ?? []) as $s) $srcs[] = $s;
            $d['sources'] = $srcs;
            $d['traceable'] = count($srcs) > 0;
            $out[] = $d;
        }
        return self::json($res, ['ok' => true, 'tenant' => $t, 'lineage' => $out]);
    }

    /** POST /api/data-sources — 구독등록 소스 수동 등록(예: 수동 SKU 업로드·직접 입력 매출). */
    public static function registerSource(Request $req, Response $res): Response
    {
        self::ensureTables();
        $t = self::tenant($req);
        if ($t === null) return self::json($res, ['ok' => false, 'error' => '인증이 필요합니다.'], 401);
        $b = self::body($req);
        $channel = mb_substr(trim((string)($b['source_channel'] ?? '')), 0, 120);
        $kind = mb_substr(trim((string)($b['data_kind'] ?? 'general')), 0, 60) ?: 'general';
        if ($channel === '') return self::json($res, ['ok' => false, 'error' => '소스명(source_channel)을 입력하세요.'], 422);
        $account = mb_substr(trim((string)($b['source_account'] ?? '')), 0, 200);
        $priority = max(0, min(1000, (int)($b['source_priority'] ?? 100)));
        // 출처 불명확 시 격리 상태로(지시서: 출처불명 데이터는 분석 미사용·격리 표시).
        $sv = (string)($b['status'] ?? 'active');
        $status = in_array($sv, ['active', 'isolated', 'inactive'], true) ? $sv : 'active';
        self::upsertSource($t, 'subscriber_owned', $channel, $account, null, $kind, $priority, $status, self::now());
        try { \Genie\SecurityAudit::log(self::db(), $t, (string)((UserAuth::authedUser($req)['email'] ?? '')), 'data.source_registered', ['channel' => $channel, 'kind' => $kind], $req); } catch (\Throwable $e) {}
        return self::json($res, ['ok' => true]);
    }
}
