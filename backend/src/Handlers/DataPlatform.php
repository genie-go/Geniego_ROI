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
