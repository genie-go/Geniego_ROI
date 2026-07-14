<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;
use Genie\Crypto;

/**
 * DataExport — [245차 P1-1] 데이터웨어하우스/BI 익스포트 (BigQuery·Snowflake·Google Sheets·범용 HTTP).
 *
 * GeniegoROI SSOT(주문·광고지표·정산·어트리뷰션·KPI)를 외부 DW/BI 도구로 자동 싱크한다.
 * 경쟁사(Funnel.io·Supermetrics) 영역. ★기존 자산 재사용(중복0):
 *   - per-tenant 설정 테이블 + AES-256-GCM 자격증명(Crypto) — ChannelCreds/live_media_config 패턴
 *   - frequency 기반 스케줄 + cron drain — Reports::report_schedule 패턴
 *   - SSRF 방어(공개 https만) — OpenPlatform::isPublicHttpsUrl 미러
 *   - SSOT 데이터셋 — performance_metrics/channel_orders/orderhub_settlements/attribution_result
 *
 * ★정직: 자격증명 미등록·미설정 대상은 실행 skip(configured=false). 등록 즉시 다음 실행(수동/스케줄)부터 자동 push.
 *
 * 라우팅: /v429/exports/* (api_key/세션 requirePro, 테넌트 격리). routes.php $custom+$register 이중등록.
 */
class DataExport
{
    private const TYPES = ['http', 'google_sheets', 'bigquery', 'snowflake', 's3'];
    private const DATASETS = ['orders', 'ad_metrics', 'settlements', 'attribution', 'kpi_summary', 'web_analytics'];
    private const SECRET_KEYS = ['secret', 'service_account_json', 'private_key']; // 마스킹·암호화 대상
    // [283차 P1] 종전 MAX_ROWS=5000 은 '실행당 전체 상한'이라 5,000행 초과분이 조용히 유실되면서도
    //   rows_exported=5000 / status=ok 로 기록됐다(무경고 절삭). 이제 PAGE_ROWS 는 '한 페이지 크기'이고
    //   runDestination 이 커서(OFFSET) 페이징으로 전량 내보낸다. MAX_EXPORT_ROWS 는 폭주 방지 안전 상한이며,
    //   여기에 걸리면 truncated=true + 실제 처리건수를 반드시 반환/로깅한다(무음 절삭 금지).
    private const PAGE_ROWS = 5000;         // 한 페이지(조회·전송 배치) 크기
    private const MAX_EXPORT_ROWS = 200000; // 실행당 안전 상한 — 초과 시 truncated 로 정직 보고
    private const BQ_BATCH = 500;      // BigQuery insertAll 배치
    private const SHEET_BATCH = 1000;  // Sheets append 배치

    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }
    private static function body(Request $req): array
    {
        $b = (array)($req->getParsedBody() ?? []);
        if (empty($b)) { $d = json_decode((string)$req->getBody(), true); if (is_array($d)) $b = $d; }
        return $b;
    }
    private static function json(Response $res, array $data, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $res->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS data_export_destination (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(160) NOT NULL, type VARCHAR(30) NOT NULL DEFAULT 'http',
                config_json TEXT, datasets_json TEXT, frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
                period_days INT NOT NULL DEFAULT 7, enabled TINYINT(1) DEFAULT 1,
                last_status VARCHAR(20), last_run_at VARCHAR(32), next_run_at VARCHAR(32),
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_dex_tenant (tenant_id), KEY idx_dex_next (next_run_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS data_export_run (
                id INT AUTO_INCREMENT PRIMARY KEY, tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                destination_id INT NOT NULL, dataset VARCHAR(40), rows_exported INT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'ok', http_code INT DEFAULT 0, error TEXT,
                started_at VARCHAR(32), finished_at VARCHAR(32),
                KEY idx_dexr_tenant (tenant_id, destination_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS data_export_destination (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'http', config_json TEXT, datasets_json TEXT, frequency TEXT NOT NULL DEFAULT 'daily', period_days INTEGER NOT NULL DEFAULT 7, enabled INTEGER DEFAULT 1, last_status TEXT, last_run_at TEXT, next_run_at TEXT, created_at TEXT, updated_at TEXT)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS data_export_run (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo', destination_id INTEGER NOT NULL, dataset TEXT, rows_exported INTEGER DEFAULT 0, status TEXT DEFAULT 'ok', http_code INTEGER DEFAULT 0, error TEXT, started_at TEXT, finished_at TEXT)");
        }
    }

    /* ════════════════ frequency → 다음 실행(UTC). Reports 패턴 정합. ════════════════ */
    private static function computeNextRun(string $freq): string
    {
        $add = match ($freq) { 'hourly' => 3600, 'daily' => 86400, 'weekly' => 7 * 86400, 'monthly' => 30 * 86400, default => 86400 };
        return gmdate('Y-m-d H:i:s', time() + $add);
    }

    /* ════════════════ 자격증명/설정 암호화 ════════════════ */
    private static function encryptConfig(array $cfg): array
    {
        foreach (self::SECRET_KEYS as $k) {
            if (isset($cfg[$k]) && $cfg[$k] !== '' && strpos((string)$cfg[$k], '•') === false) {
                $cfg[$k] = Crypto::encrypt((string)$cfg[$k]);
            }
        }
        return $cfg;
    }
    private static function decryptConfig(array $cfg): array
    {
        foreach (self::SECRET_KEYS as $k) {
            if (isset($cfg[$k]) && $cfg[$k] !== '') { try { $cfg[$k] = Crypto::decrypt((string)$cfg[$k]); } catch (\Throwable $e) {} }
        }
        return $cfg;
    }
    private static function maskConfig(array $cfg): array
    {
        foreach (self::SECRET_KEYS as $k) { if (!empty($cfg[$k])) $cfg[$k] = '••••••••'; }
        return $cfg;
    }
    /** 저장 시 마스킹(•) 값은 기존 보존, 신규 평문은 암호화. */
    private static function mergeSecrets(array $incoming, array $existing): array
    {
        foreach (self::SECRET_KEYS as $k) {
            $v = (string)($incoming[$k] ?? '');
            if ($v === '' || strpos($v, '•') !== false) { // 미입력/마스킹 → 기존 암호값 유지
                if (isset($existing[$k])) $incoming[$k] = $existing[$k]; else unset($incoming[$k]);
            } else { $incoming[$k] = Crypto::encrypt($v); }
        }
        return $incoming;
    }

    private static function isConfigured(string $type, array $cfg): bool
    {
        switch ($type) {
            case 'http':          return !empty($cfg['url']);
            case 'google_sheets': return !empty($cfg['spreadsheet_id']) && !empty($cfg['service_account_json']);
            case 'bigquery':      return !empty($cfg['project_id']) && !empty($cfg['dataset_id']) && !empty($cfg['service_account_json']);
            case 'snowflake':     return !empty($cfg['account']) && !empty($cfg['user']) && !empty($cfg['private_key']) && !empty($cfg['database']) && !empty($cfg['schema']);
            case 's3':            return !empty($cfg['bucket']) && !empty($cfg['region']) && !empty($cfg['access_key_id']) && !empty($cfg['secret_access_key']);
            default: return false;
        }
    }

    /* ════════════════ 엔드포인트 ════════════════ */

    /** GET /v429/exports/datasets — 익스포트 가능 데이터셋 카탈로그(공개 메타). */
    public static function datasets(Request $req, Response $res): Response
    {
        $cat = [
            ['key' => 'orders', 'label' => '주문(channel_orders)', 'desc' => '전 채널 주문 — 채널/SKU/수량/금액(KRW정규화)/상태/일시'],
            ['key' => 'ad_metrics', 'label' => '광고지표(performance_metrics)', 'desc' => '캠페인/소재 입도 노출·클릭·전환·광고비·매출'],
            ['key' => 'settlements', 'label' => '정산(orderhub_settlements)', 'desc' => '기간×채널 총매출·실수령·수수료·반품'],
            ['key' => 'attribution', 'label' => '어트리뷰션(attribution_result)', 'desc' => '주문별 기여 채널·모델·신뢰도'],
            ['key' => 'kpi_summary', 'label' => 'KPI 요약', 'desc' => 'ROAS/CTR/CVR/CPA 집계(단일 행)'],
            ['key' => 'web_analytics', 'label' => '웹 분석(web_analytics_metrics)', 'desc' => 'GA4·Adobe 인바운드 — 일자×채널그룹×소스미디엄 세션/사용자/페이지뷰/전환/매출'],
        ];
        $types = [
            ['key' => 'http', 'label' => '범용 HTTP/Webhook', 'fields' => ['url', 'secret', 'format'], 'note' => 'NDJSON/JSON POST + HMAC. 모든 웨어하우스 인제스트·Looker Studio·Zapier 호환'],
            ['key' => 'google_sheets', 'label' => 'Google Sheets', 'fields' => ['spreadsheet_id', 'sheet_prefix', 'service_account_json'], 'note' => '서비스계정 JWT → values.append'],
            ['key' => 'bigquery', 'label' => 'BigQuery', 'fields' => ['project_id', 'dataset_id', 'table_prefix', 'service_account_json'], 'note' => '서비스계정 JWT → tabledata.insertAll 스트리밍'],
            ['key' => 'snowflake', 'label' => 'Snowflake', 'fields' => ['account', 'user', 'role', 'warehouse', 'database', 'schema', 'table_prefix', 'private_key'], 'note' => '키페어 JWT → SQL API(VARIANT INSERT) · 테이블 autocreate'],
            ['key' => 's3', 'label' => 'Amazon S3 (데이터레이크)', 'fields' => ['bucket', 'region', 'access_key_id', 'secret_access_key', 'prefix'], 'note' => 'AWS SigV4 서명 → S3 PUT(NDJSON, 일자 파티션)'],
        ];
        return self::json($res, ['ok' => true, 'datasets' => $cat, 'types' => $types]);
    }

    /** GET /v429/exports/destinations */
    public static function listDestinations(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("SELECT * FROM data_export_destination WHERE tenant_id=? ORDER BY id DESC");
        $st->execute([self::tenant($req)]);
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $out = [];
        foreach ($rows as $r) {
            $cfg = json_decode((string)($r['config_json'] ?? '{}'), true) ?: [];
            $out[] = [
                'id' => (int)$r['id'], 'name' => $r['name'], 'type' => $r['type'],
                'config' => self::maskConfig($cfg), 'datasets' => json_decode((string)($r['datasets_json'] ?? '[]'), true) ?: [],
                'frequency' => $r['frequency'], 'period_days' => (int)$r['period_days'], 'enabled' => (int)$r['enabled'],
                'configured' => self::isConfigured((string)$r['type'], $cfg),
                'last_status' => $r['last_status'], 'last_run_at' => $r['last_run_at'], 'next_run_at' => $r['next_run_at'],
            ];
        }
        return self::json($res, ['ok' => true, 'destinations' => $out]);
    }

    /** POST /v429/exports/destinations  ·  PUT /v429/exports/destinations/{id} */
    public static function saveDestination(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $b = self::body($req); $pdo = self::db();
        $id = (int)($args['id'] ?? 0);
        $name = trim((string)($b['name'] ?? ''));
        $type = in_array(($b['type'] ?? ''), self::TYPES, true) ? (string)$b['type'] : 'http';
        if ($name === '') return self::json($res, ['ok' => false, 'error' => '이름을 입력하세요.'], 400);
        $freq = in_array(($b['frequency'] ?? ''), ['hourly', 'daily', 'weekly', 'monthly'], true) ? (string)$b['frequency'] : 'daily';
        $period = max(1, min(365, (int)($b['period_days'] ?? 7)));
        $enabled = !empty($b['enabled']) ? 1 : 0;
        $datasets = array_values(array_intersect((array)($b['datasets'] ?? []), self::DATASETS));
        if (!$datasets) $datasets = ['orders', 'ad_metrics'];
        $incoming = is_array($b['config'] ?? null) ? $b['config'] : [];
        // 기존 암호 보존 머지
        $existing = [];
        if ($id > 0) {
            $cur = $pdo->prepare("SELECT config_json FROM data_export_destination WHERE id=? AND tenant_id=?");
            $cur->execute([$id, $t]); $row = $cur->fetch(\PDO::FETCH_ASSOC);
            if (!$row) return self::json($res, ['ok' => false, 'error' => '대상을 찾을 수 없습니다.'], 404);
            $existing = json_decode((string)($row['config_json'] ?? '{}'), true) ?: [];
        }
        $cfg = self::mergeSecrets($incoming, $existing);
        // http 대상 SSRF 사전검증(등록 시점) — 공개 https 만.
        if ($type === 'http' && !empty($cfg['url']) && !self::isPublicHttpsUrl((string)$cfg['url'])) {
            return self::json($res, ['ok' => false, 'error' => 'URL은 공개 https 주소만 허용됩니다(사설/내부 차단).'], 422);
        }
        $cfgJson = json_encode($cfg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $dsJson = json_encode($datasets);
        if ($id > 0) {
            $pdo->prepare("UPDATE data_export_destination SET name=?,type=?,config_json=?,datasets_json=?,frequency=?,period_days=?,enabled=?,updated_at=? WHERE id=? AND tenant_id=?")
                ->execute([$name, $type, $cfgJson, $dsJson, $freq, $period, $enabled, self::now(), $id, $t]);
        } else {
            $pdo->prepare("INSERT INTO data_export_destination(tenant_id,name,type,config_json,datasets_json,frequency,period_days,enabled,next_run_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
                ->execute([$t, $name, $type, $cfgJson, $dsJson, $freq, $period, $enabled, self::computeNextRun($freq), self::now(), self::now()]);
            $id = (int)$pdo->lastInsertId();
        }
        return self::json($res, ['ok' => true, 'id' => $id, 'configured' => self::isConfigured($type, $cfg)]);
    }

    /** DELETE /v429/exports/destinations/{id} */
    public static function deleteDestination(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $st = self::db()->prepare("DELETE FROM data_export_destination WHERE id=? AND tenant_id=?");
        $st->execute([(int)($args['id'] ?? 0), self::tenant($req)]);
        if ($st->rowCount() === 0) return self::json($res, ['ok' => false, 'error' => '대상을 찾을 수 없습니다.'], 404);
        return self::json($res, ['ok' => true, 'deleted_id' => (int)$args['id']]);
    }

    /** GET /v429/exports/runs?destination_id= — 실행 이력. */
    public static function listRuns(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $q = $req->getQueryParams(); $t = self::tenant($req);
        $where = 'tenant_id=?'; $params = [$t];
        if (!empty($q['destination_id'])) { $where .= ' AND destination_id=?'; $params[] = (int)$q['destination_id']; }
        $st = self::db()->prepare("SELECT * FROM data_export_run WHERE {$where} ORDER BY id DESC LIMIT 100");
        $st->execute($params);
        return self::json($res, ['ok' => true, 'runs' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** POST /v429/exports/destinations/{id}/run — 즉시 실행(수동). */
    public static function runNow(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $t = self::tenant($req); $id = (int)($args['id'] ?? 0);
        $cur = self::db()->prepare("SELECT * FROM data_export_destination WHERE id=? AND tenant_id=?");
        $cur->execute([$id, $t]); $dest = $cur->fetch(\PDO::FETCH_ASSOC);
        if (!$dest) return self::json($res, ['ok' => false, 'error' => '대상을 찾을 수 없습니다.'], 404);
        if ($t === 'demo') return self::json($res, ['ok' => true, 'demo' => true, 'note' => '데모는 실제 외부 전송을 수행하지 않습니다(격리).']);
        $result = self::runDestination(self::db(), $t, $dest);
        return self::json($res, ['ok' => $result['ok'], 'result' => $result]);
    }

    /* ════════════════ 실행 엔진 ════════════════ */

    /** 한 대상에 대해 선택 데이터셋 전부 push + 실행로그 + 스케줄 갱신. */
    public static function runDestination(\PDO $pdo, string $tenant, array $dest): array
    {
        $type = (string)$dest['type'];
        $cfg = self::decryptConfig(json_decode((string)($dest['config_json'] ?? '{}'), true) ?: []);
        $datasets = json_decode((string)($dest['datasets_json'] ?? '[]'), true) ?: [];
        $period = max(1, (int)($dest['period_days'] ?? 7));
        $did = (int)$dest['id'];
        if (!self::isConfigured($type, $cfg)) {
            self::touchSchedule($pdo, $tenant, $did, 'unconfigured');
            return ['ok' => false, 'error' => 'unconfigured', 'note' => '자격증명/설정 미완 — 등록 시 자동 활성'];
        }
        $perDataset = []; $okAll = true;
        foreach ($datasets as $ds) {
            if (!in_array($ds, self::DATASETS, true)) continue;
            $start = self::now();
            try {
                // [283차 P1] 커서(OFFSET) 페이징 — 5,000행 하드캡 무음 절삭 제거. 페이지 단위로 조회→전송을 반복해 전량 내보낸다.
                $total = 0; $code = 0; $err = null; $truncated = false; $offset = 0;
                while (true) {
                    [$cols, $rows] = self::datasetRows($pdo, $tenant, $ds, $period, $offset, self::PAGE_ROWS);
                    $n = count($rows);
                    if ($n === 0) break;                       // 데이터 부재/마지막 페이지 — 정상 종료
                    $pushed = self::pushDataset($type, $cfg, $ds, $cols, $rows);
                    $code = (int)($pushed['code'] ?? 0);
                    if (empty($pushed['ok'])) { $err = $pushed['error'] ?? ('http ' . $code); break; }
                    $total += $n;
                    if ($n < self::PAGE_ROWS) break;           // 마지막 페이지
                    $offset += self::PAGE_ROWS;
                    if ($offset >= self::MAX_EXPORT_ROWS) { $truncated = true; break; } // ★안전상한 — 정직 보고
                }
                // 절삭은 'ok' 로 위장하지 않는다. 실패=failed / 절삭=partial(사유 명시) / 정상=ok.
                $status = $err !== null ? 'failed' : ($truncated ? 'partial' : 'ok');
                $note = $err ?? ($truncated ? ('truncated at ' . $total . ' rows (safety cap ' . self::MAX_EXPORT_ROWS . ') — 남은 행은 다음 실행/기간축소로 내보내세요') : null);
                self::logRun($pdo, $tenant, $did, $ds, $total, $status, $code, $note !== null ? substr($note, 0, 240) : null, $start);
                $perDataset[$ds] = ['rows' => $total, 'ok' => $err === null, 'code' => $code, 'error' => $err, 'truncated' => $truncated];
                if ($err !== null) $okAll = false;
            } catch (\Throwable $e) {
                // ★SQL 실패·스키마 드리프트가 여기로 전파된다(종전엔 datasetRows 가 삼켜 'ok(0행)'로 위장).
                self::logRun($pdo, $tenant, $did, $ds, 0, 'failed', 0, substr($e->getMessage(), 0, 240), $start);
                $perDataset[$ds] = ['rows' => 0, 'ok' => false, 'error' => substr($e->getMessage(), 0, 240), 'truncated' => false];
                $okAll = false;
            }
        }
        self::touchSchedule($pdo, $tenant, $did, $okAll ? 'ok' : 'partial');
        return ['ok' => $okAll, 'datasets' => $perDataset];
    }

    private static function touchSchedule(\PDO $pdo, string $tenant, int $did, string $status): void
    {
        $freq = 'daily';
        try { $f = $pdo->prepare("SELECT frequency FROM data_export_destination WHERE id=? AND tenant_id=?"); $f->execute([$did, $tenant]); $freq = (string)($f->fetchColumn() ?: 'daily'); } catch (\Throwable $e) {}
        $pdo->prepare("UPDATE data_export_destination SET last_status=?, last_run_at=?, next_run_at=? WHERE id=? AND tenant_id=?")
            ->execute([$status, self::now(), self::computeNextRun($freq), $did, $tenant]);
    }
    private static function logRun(\PDO $pdo, string $tenant, int $did, string $ds, int $rows, string $status, int $code, ?string $err, string $start): void
    {
        try {
            $pdo->prepare("INSERT INTO data_export_run(tenant_id,destination_id,dataset,rows_exported,status,http_code,error,started_at,finished_at) VALUES(?,?,?,?,?,?,?,?,?)")
                ->execute([$tenant, $did, $ds, $rows, $status, $code, $err, $start, self::now()]);
        } catch (\Throwable $e) {}
    }

    /**
     * SSOT 데이터셋 한 페이지 조회 → [columns[], rows(assoc)[]]. 테넌트 격리.
     *
     * [283차 P1] ★예외를 삼키지 않는다. 종전 `catch { return [[],[]]; }` 는 스키마 드리프트로 쿼리가 깨져도
     *   빈셋을 돌려줬고 → pushDataset 이 204 'no rows' ok → logRun('ok') 로 기록돼 파이프라인 사망이
     *   "정상(0행)"으로 위장됐다. 이제 예외는 상위(runDestination)로 전파되어 status='failed' 로 남는다.
     *   즉 "데이터 부재(0행)"와 "파이프라인 사망"이 로그에서 반드시 구분된다.
     */
    private static function datasetRows(\PDO $pdo, string $tenant, string $ds, int $periodDays, int $offset = 0, int $limit = self::PAGE_ROWS): array
    {
        $since = gmdate('Y-m-d', time() - $periodDays * 86400);
        $lim = max(1, (int)$limit);
        $off = max(0, (int)$offset);
        switch ($ds) {
            case 'orders':
                $cols = ['channel', 'order_no', 'sku', 'product_name', 'qty', 'total_price', 'status', 'event_type', 'ordered_at'];
                $st = $pdo->prepare("SELECT channel, COALESCE(order_no,channel_order_id) AS order_no, sku, product_name, qty, total_price, status, event_type, ordered_at FROM channel_orders WHERE tenant_id=? AND ordered_at>=? ORDER BY ordered_at DESC LIMIT {$lim} OFFSET {$off}");
                $st->execute([$tenant, $since]);
                return [$cols, $st->fetchAll(\PDO::FETCH_ASSOC) ?: []];
            case 'ad_metrics':
                $cols = ['channel', 'campaign_ext_id', 'ad_ext_id', 'date', 'impressions', 'clicks', 'conversions', 'spend', 'revenue'];
                $st = $pdo->prepare("SELECT channel, campaign_ext_id, ad_ext_id, date, impressions, clicks, conversions, spend, revenue FROM performance_metrics WHERE tenant_id=? AND date>=? ORDER BY date DESC LIMIT {$lim} OFFSET {$off}");
                $st->execute([$tenant, $since]);
                return [$cols, $st->fetchAll(\PDO::FETCH_ASSOC) ?: []];
            case 'settlements':
                $cols = ['period', 'channel', 'gross_sales', 'net_payout', 'platform_fee', 'ad_fee', 'coupon_discount', 'return_fee', 'orders_count', 'returns_count', 'updated_at'];
                $st = $pdo->prepare("SELECT period, channel, gross_sales, net_payout, platform_fee, ad_fee, coupon_discount, return_fee, orders_count, returns_count, updated_at FROM orderhub_settlements WHERE tenant_id=? ORDER BY period DESC LIMIT {$lim} OFFSET {$off}");
                $st->execute([$tenant]);
                return [$cols, $st->fetchAll(\PDO::FETCH_ASSOC) ?: []];
            case 'attribution':
                $st = $pdo->prepare("SELECT * FROM attribution_result WHERE tenant_id=? ORDER BY id DESC LIMIT {$lim} OFFSET {$off}");
                $st->execute([$tenant]);
                $rows = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
                $cols = $rows ? array_keys($rows[0]) : ['order_id', 'channel', 'model'];
                return [$cols, $rows];
            case 'kpi_summary':
                // 단일 행 데이터셋 — 2페이지 이후는 빈셋(페이징 루프 자연 종료).
                if ($off > 0) return [[], []];
                $s = Reports::generateKpiSummary($pdo, $tenant, $periodDays);
                return [array_keys($s), [$s]];
            case 'web_analytics':
                $cols = ['source', 'date', 'channel_group', 'source_medium', 'sessions', 'users', 'new_users', 'page_views', 'conversions', 'revenue', 'engaged_sessions', 'avg_session_sec', 'bounce_rate', 'currency'];
                $st = $pdo->prepare("SELECT source, date, channel_group, source_medium, sessions, users, new_users, page_views, conversions, revenue, engaged_sessions, avg_session_sec, bounce_rate, currency FROM web_analytics_metrics WHERE tenant_id=? AND date>=? ORDER BY date DESC LIMIT {$lim} OFFSET {$off}");
                $st->execute([$tenant, $since]);
                return [$cols, $st->fetchAll(\PDO::FETCH_ASSOC) ?: []];
        }
        throw new \InvalidArgumentException('unknown dataset: ' . $ds);
    }

    /** 대상 타입별 push 디스패치. */
    private static function pushDataset(string $type, array $cfg, string $ds, array $cols, array $rows): array
    {
        // [283차 P1] 방어적 가드. runDestination 은 빈 페이지에서 이미 루프를 끊으므로 여기 도달하지 않는다.
        //   (종전엔 datasetRows 가 SQL 실패를 빈셋으로 삼켜 이 경로가 '성공(0행)' 위장의 마지막 고리였다.)
        if (!$rows) return ['ok' => true, 'code' => 204, 'note' => 'no rows'];
        switch ($type) {
            case 'http':          return self::pushHttp($cfg, $ds, $cols, $rows);
            case 'google_sheets': return self::pushGoogleSheets($cfg, $ds, $cols, $rows);
            case 'bigquery':      return self::pushBigQuery($cfg, $ds, $rows);
            case 'snowflake':     return self::pushSnowflake($cfg, $ds, $rows);
            case 's3':            return self::pushS3($cfg, $ds, $rows);
        }
        return ['ok' => false, 'error' => 'unknown type'];
    }

    /* ─────────── [254차 초고도화 ⑩] Amazon S3 (AWS SigV4 서명 PUT, NDJSON 일자파티션) ─────────── */
    private static function pushS3(array $cfg, string $ds, array $rows): array
    {
        $bucket = (string)($cfg['bucket'] ?? ''); $region = (string)($cfg['region'] ?? 'us-east-1');
        $ak = (string)($cfg['access_key_id'] ?? ''); $sk = (string)($cfg['secret_access_key'] ?? '');
        if ($bucket === '' || $ak === '' || $sk === '') return ['ok' => false, 'error' => 's3 config incomplete'];
        $lines = []; foreach ($rows as $r) $lines[] = json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $payload = implode("\n", $lines);
        $prefix = trim((string)($cfg['prefix'] ?? 'genie'), '/');
        $key = ($prefix !== '' ? $prefix . '/' : '') . $ds . '/' . gmdate('Y/m/d') . '/' . gmdate('Ymd\THis\Z') . '_' . substr(hash('sha256', $payload), 0, 8) . '.ndjson';
        $host = "{$bucket}.s3.{$region}.amazonaws.com";
        $uriPath = '/' . implode('/', array_map('rawurlencode', explode('/', $key)));
        $now = gmdate('Ymd\THis\Z'); $date = gmdate('Ymd'); $payloadHash = hash('sha256', $payload);
        $canonicalHeaders = "host:{$host}\nx-amz-content-sha256:{$payloadHash}\nx-amz-date:{$now}\n";
        $signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
        $canonicalRequest = "PUT\n{$uriPath}\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        $scope = "{$date}/{$region}/s3/aws4_request";
        $stringToSign = "AWS4-HMAC-SHA256\n{$now}\n{$scope}\n" . hash('sha256', $canonicalRequest);
        $kDate = hash_hmac('sha256', $date, 'AWS4' . $sk, true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', 's3', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);
        $auth = "AWS4-HMAC-SHA256 Credential={$ak}/{$scope}, SignedHeaders={$signedHeaders}, Signature={$signature}";
        $headers = ["Host: {$host}", "x-amz-date: {$now}", "x-amz-content-sha256: {$payloadHash}", "Authorization: {$auth}", 'Content-Type: application/x-ndjson'];
        return self::httpSend('PUT', "https://{$host}{$uriPath}", $headers, $payload);
    }

    /* ─────────── 범용 HTTP/Webhook (NDJSON/JSON + HMAC) ─────────── */
    private static function pushHttp(array $cfg, string $ds, array $cols, array $rows): array
    {
        $url = (string)($cfg['url'] ?? '');
        if (!self::isPublicHttpsUrl($url)) return ['ok' => false, 'error' => 'url blocked (non-public)'];
        $format = ($cfg['format'] ?? 'json') === 'ndjson' ? 'ndjson' : 'json';
        if ($format === 'ndjson') {
            $lines = []; foreach ($rows as $r) $lines[] = json_encode($r, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $body = implode("\n", $lines); $ctype = 'application/x-ndjson';
        } else {
            $body = json_encode(['dataset' => $ds, 'columns' => $cols, 'rows' => $rows, 'count' => count($rows), 'exported_at' => self::now()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $ctype = 'application/json';
        }
        $headers = ['Content-Type: ' . $ctype, 'X-Genie-Dataset: ' . $ds];
        $secret = (string)($cfg['secret'] ?? '');
        if ($secret !== '') { $tsv = (string)time(); $headers[] = 'X-Genie-Signature: t=' . $tsv . ',v1=' . hash_hmac('sha256', $tsv . '.' . $body, $secret); }
        return self::httpSend('POST', $url, $headers, $body);
    }

    /* ─────────── Google Sheets (values.append, 서비스계정 JWT) ─────────── */
    private static function pushGoogleSheets(array $cfg, string $ds, array $cols, array $rows): array
    {
        $tok = self::googleAccessToken((string)$cfg['service_account_json'], 'https://www.googleapis.com/auth/spreadsheets');
        if (!$tok['ok']) return ['ok' => false, 'error' => 'google auth: ' . ($tok['error'] ?? '')];
        $sid = rawurlencode((string)$cfg['spreadsheet_id']);
        $sheet = (string)($cfg['sheet_prefix'] ?? 'genie_') . $ds;
        $range = rawurlencode($sheet . '!A1');
        $url = "https://sheets.googleapis.com/v4/spreadsheets/{$sid}/values/{$range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS";
        // 헤더행 + 값. (시트는 사용자가 사전 생성 권장 — 미존재 시 append가 범위오류 가능 → 본 구현은 첫 시트 기준 RAW append)
        $values = [$cols];
        foreach ($rows as $r) { $line = []; foreach ($cols as $c) $line[] = $r[$c] ?? ''; $values[] = $line; }
        // SHEET_BATCH 단위 청크
        $code = 0; $err = null;
        foreach (array_chunk($values, self::SHEET_BATCH) as $chunk) {
            $body = json_encode(['values' => $chunk], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $r = self::httpSend('POST', $url, ['Content-Type: application/json', 'Authorization: Bearer ' . $tok['token']], $body);
            $code = $r['code']; if (!$r['ok']) { $err = $r['error'] ?? ('http ' . $r['code']); break; }
        }
        return ['ok' => $err === null, 'code' => $code, 'error' => $err];
    }

    /* ─────────── BigQuery (tabledata.insertAll 스트리밍, 서비스계정 JWT) ─────────── */
    private static function pushBigQuery(array $cfg, string $ds, array $rows): array
    {
        $tok = self::googleAccessToken((string)$cfg['service_account_json'], 'https://www.googleapis.com/auth/bigquery.insertdata');
        if (!$tok['ok']) return ['ok' => false, 'error' => 'google auth: ' . ($tok['error'] ?? '')];
        $proj = rawurlencode((string)$cfg['project_id']);
        $dset = rawurlencode((string)$cfg['dataset_id']);
        $tableId = ((string)($cfg['table_prefix'] ?? 'genie_')) . $ds;
        $table = rawurlencode($tableId);
        // [254차 초고도화] 테이블 autocreate — 빈 데이터셋 첫 실행 실패 방지. 샘플행 타입추론(숫자→FLOAT64, 그 외 STRING).
        self::ensureBqTable($cfg, $tableId, $rows);
        $url = "https://bigquery.googleapis.com/bigquery/v2/projects/{$proj}/datasets/{$dset}/tables/{$table}/insertAll";
        $code = 0; $err = null;
        foreach (array_chunk($rows, self::BQ_BATCH) as $chunk) {
            $payloadRows = []; foreach ($chunk as $r) $payloadRows[] = ['json' => self::stringifyRow($r)];
            $body = json_encode(['skipInvalidRows' => false, 'ignoreUnknownValues' => true, 'rows' => $payloadRows], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $resp = self::httpSend('POST', $url, ['Content-Type: application/json', 'Authorization: Bearer ' . $tok['token']], $body);
            $code = $resp['code'];
            $j = json_decode((string)($resp['body'] ?? ''), true);
            if (!$resp['ok']) { $err = $resp['error'] ?? ('http ' . $resp['code']); break; }
            if (!empty($j['insertErrors'])) { $err = 'insertErrors: ' . substr(json_encode($j['insertErrors']), 0, 200); break; }
        }
        return ['ok' => $err === null, 'code' => $code, 'error' => $err];
    }

    /* ─────────── Snowflake (SQL API v2, 키페어 JWT, VARIANT INSERT) ─────────── */
    private static function pushSnowflake(array $cfg, string $ds, array $rows): array
    {
        $jwt = self::snowflakeJwt($cfg);
        if (!$jwt['ok']) return ['ok' => false, 'error' => 'snowflake jwt: ' . ($jwt['error'] ?? '')];
        $acct = strtolower((string)$cfg['account']);
        $host = str_replace('_', '-', $acct) . '.snowflakecomputing.com';
        $url = "https://{$host}/api/v2/statements";
        $db = (string)$cfg['database']; $schema = (string)$cfg['schema'];
        $table = ((string)($cfg['table_prefix'] ?? 'GENIE_')) . strtoupper($ds);
        $fq = "\"{$db}\".\"{$schema}\".\"{$table}\"";
        // [254차 초고도화] 테이블 autocreate — 빈 워크스페이스 첫 실행 실패 방지(VARIANT RECORD + LOADED_AT).
        $ddl = "CREATE TABLE IF NOT EXISTS {$fq} (RECORD VARIANT, LOADED_AT TIMESTAMP_NTZ)";
        self::httpSend('POST', $url, ['Content-Type: application/json', 'Authorization: Bearer ' . $jwt['token'], 'X-Snowflake-Authorization-Token-Type: KEYPAIR_JWT', 'Accept: application/json'],
            json_encode(['statement' => $ddl, 'timeout' => 60, 'database' => $db, 'schema' => $schema, 'warehouse' => (string)($cfg['warehouse'] ?? ''), 'role' => (string)($cfg['role'] ?? '')], JSON_UNESCAPED_UNICODE));
        $code = 0; $err = null;
        foreach (array_chunk($rows, 200) as $chunk) {
            $tuples = []; $binds = []; $i = 1;
            foreach ($chunk as $r) { $tuples[] = "(PARSE_JSON(:{$i}), CURRENT_TIMESTAMP())"; $binds[(string)$i] = ['type' => 'TEXT', 'value' => json_encode(self::stringifyRow($r), JSON_UNESCAPED_UNICODE)]; $i++; }
            $sql = "INSERT INTO {$fq} (RECORD, LOADED_AT) SELECT * FROM VALUES " . implode(',', $tuples);
            $payload = ['statement' => $sql, 'timeout' => 60, 'database' => $db, 'schema' => $schema, 'warehouse' => (string)($cfg['warehouse'] ?? ''), 'role' => (string)($cfg['role'] ?? ''), 'bindings' => $binds];
            $resp = self::httpSend('POST', $url, ['Content-Type: application/json', 'Authorization: Bearer ' . $jwt['token'], 'X-Snowflake-Authorization-Token-Type: KEYPAIR_JWT', 'Accept: application/json'], json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $code = $resp['code']; if (!$resp['ok']) { $err = $resp['error'] ?? ('http ' . $resp['code'] . ' ' . substr((string)($resp['body'] ?? ''), 0, 160)); break; }
        }
        return ['ok' => $err === null, 'code' => $code, 'error' => $err];
    }

    /** [254차] BigQuery 테이블 autocreate(타입추론). 이미 존재(409)면 무시. bigquery 스코프 별도 토큰. */
    private static function ensureBqTable(array $cfg, string $tableId, array $rows): void
    {
        if (!$rows) return;
        $tok = self::googleAccessToken((string)$cfg['service_account_json'], 'https://www.googleapis.com/auth/bigquery');
        if (!$tok['ok']) return;
        // 샘플(최대 50행) 타입추론: 한 컬럼이라도 비숫자면 STRING, 전부 숫자면 FLOAT64.
        $sample = array_slice($rows, 0, 50); $numeric = [];
        foreach ($sample as $r) foreach ($r as $k => $v) {
            $kk = preg_replace('/[^A-Za-z0-9_]/', '_', (string)$k);
            if (!isset($numeric[$kk])) $numeric[$kk] = true;
            if ($v !== null && $v !== '' && !is_numeric($v)) $numeric[$kk] = false;
        }
        $fields = [];
        foreach ($numeric as $kk => $isNum) $fields[] = ['name' => $kk, 'type' => $isNum ? 'FLOAT64' : 'STRING', 'mode' => 'NULLABLE'];
        if (!$fields) return;
        $proj = rawurlencode((string)$cfg['project_id']); $dset = rawurlencode((string)$cfg['dataset_id']);
        $body = json_encode(['tableReference' => ['projectId' => (string)$cfg['project_id'], 'datasetId' => (string)$cfg['dataset_id'], 'tableId' => $tableId], 'schema' => ['fields' => $fields]], JSON_UNESCAPED_UNICODE);
        self::httpSend('POST', "https://bigquery.googleapis.com/bigquery/v2/projects/{$proj}/datasets/{$dset}/tables", ['Content-Type: application/json', 'Authorization: Bearer ' . $tok['token']], $body);
    }

    /** 행 값 문자열 정규화(JSON 적재 안전 — null 보존, 스칼라 유지). */
    private static function stringifyRow(array $r): array
    {
        $o = [];
        foreach ($r as $k => $v) { $o[$k] = is_numeric($v) ? $v + 0 : $v; }
        return $o;
    }

    /* ════════════════ 인증 헬퍼 ════════════════ */

    /** Google 서비스계정 JSON → OAuth2 access_token(RS256 JWT grant). */
    private static function googleAccessToken(string $saJson, string $scope): array
    {
        $sa = json_decode($saJson, true);
        if (!is_array($sa) || empty($sa['client_email']) || empty($sa['private_key'])) return ['ok' => false, 'error' => 'invalid service account json'];
        $tokenUri = (string)($sa['token_uri'] ?? 'https://oauth2.googleapis.com/token');
        $now = time();
        $claim = ['iss' => $sa['client_email'], 'scope' => $scope, 'aud' => $tokenUri, 'iat' => $now, 'exp' => $now + 3600];
        $jwt = self::rs256(['alg' => 'RS256', 'typ' => 'JWT'], $claim, (string)$sa['private_key']);
        if (!$jwt) return ['ok' => false, 'error' => 'jwt sign failed'];
        $resp = self::httpSend('POST', $tokenUri, ['Content-Type: application/x-www-form-urlencoded'],
            http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt]));
        $j = json_decode((string)($resp['body'] ?? ''), true);
        if (!$resp['ok'] || empty($j['access_token'])) return ['ok' => false, 'error' => substr((string)($resp['body'] ?? $resp['error'] ?? 'token error'), 0, 160)];
        return ['ok' => true, 'token' => (string)$j['access_token']];
    }

    /** Snowflake 키페어 JWT(account/user/private_key). public key fingerprint(SHA256) 포함. */
    private static function snowflakeJwt(array $cfg): array
    {
        $pk = (string)$cfg['private_key'];
        $res = @openssl_pkey_get_private($pk);
        if (!$res) return ['ok' => false, 'error' => 'invalid private key'];
        $det = openssl_pkey_get_details($res);
        if (empty($det['key'])) return ['ok' => false, 'error' => 'pubkey extract failed'];
        // SPKI DER → SHA256 → base64 (Snowflake fingerprint 'SHA256:...')
        $pubPem = $det['key'];
        $der = self::pemToDer($pubPem);
        $fp = 'SHA256:' . base64_encode(hash('sha256', $der, true));
        $acct = strtoupper((string)$cfg['account']);
        $user = strtoupper((string)$cfg['user']);
        $qual = $acct . '.' . $user;
        $now = time();
        $claim = ['iss' => $qual . '.' . $fp, 'sub' => $qual, 'iat' => $now, 'exp' => $now + 3000];
        $jwt = self::rs256(['alg' => 'RS256', 'typ' => 'JWT'], $claim, $pk);
        if (!$jwt) return ['ok' => false, 'error' => 'jwt sign failed'];
        return ['ok' => true, 'token' => $jwt];
    }

    private static function pemToDer(string $pem): string
    {
        $pem = preg_replace('/-----BEGIN [^-]+-----|-----END [^-]+-----|\s/', '', $pem);
        return base64_decode((string)$pem) ?: '';
    }

    private static function rs256(array $header, array $claim, string $privateKey): ?string
    {
        $b64 = fn($d) => rtrim(strtr(base64_encode($d), '+/', '-_'), '=');
        $seg = $b64(json_encode($header, JSON_UNESCAPED_SLASHES)) . '.' . $b64(json_encode($claim, JSON_UNESCAPED_SLASHES));
        $key = @openssl_pkey_get_private($privateKey);
        if (!$key) return null;
        $sig = '';
        if (!openssl_sign($seg, $sig, $key, OPENSSL_ALGO_SHA256)) return null;
        return $seg . '.' . $b64($sig);
    }

    /* ════════════════ HTTP 클라이언트 + SSRF 방어 ════════════════ */
    private static function httpSend(string $method, string $url, array $headers, string $body): array
    {
        if (!function_exists('curl_init')) return ['ok' => false, 'code' => 0, 'error' => 'curl unavailable'];
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method, CURLOPT_POSTFIELDS => $body, CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30, CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);
        if ($resp === false) return ['ok' => false, 'code' => $code, 'error' => 'curl: ' . $cerr, 'body' => ''];
        return ['ok' => $code >= 200 && $code < 300, 'code' => $code, 'body' => (string)$resp, 'error' => ($code >= 300 ? ('http ' . $code) : null)];
    }

    /** OpenPlatform::isPublicHttpsUrl 미러 — 공개 https 호스트만(SSRF·메타데이터 차단). */
    private static function isPublicHttpsUrl(string $url): bool
    {
        $p = parse_url($url);
        if (!$p || (($p['scheme'] ?? '') !== 'https')) return false;
        $host = strtolower((string)($p['host'] ?? ''));
        if ($host === '' || in_array($host, ['localhost', 'metadata.google.internal'], true)) return false;
        if (substr($host, -6) === '.local' || substr($host, -9) === '.internal') return false;
        $ips = [];
        if (filter_var($host, FILTER_VALIDATE_IP)) $ips = [$host];
        else {
            $recs = @dns_get_record($host, DNS_A | DNS_AAAA);
            if (is_array($recs)) foreach ($recs as $r) { if (!empty($r['ip'])) $ips[] = $r['ip']; if (!empty($r['ipv6'])) $ips[] = $r['ipv6']; }
            if (!$ips) { $h = @gethostbyname($host); if ($h && $h !== $host) $ips[] = $h; }
        }
        if (!$ips) return false;
        foreach ($ips as $ip) { if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false; }
        return true;
    }

    /* ════════════════ cron 진입점 ════════════════ */
    /** 모든 due 대상 실행(테넌트 옵션). data_export_cron.php 호출. */
    public static function runDue(?string $onlyTenant = null): array
    {
        self::ensureTables();
        $pdo = self::db(); $now = self::now();
        $where = "enabled=1 AND (next_run_at IS NULL OR next_run_at<=?)"; $params = [$now];
        if ($onlyTenant !== null && $onlyTenant !== '') { $where .= " AND tenant_id=?"; $params[] = $onlyTenant; }
        $st = $pdo->prepare("SELECT * FROM data_export_destination WHERE {$where} ORDER BY id ASC LIMIT 200");
        $st->execute($params);
        $dests = $st->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        $ran = 0; $ok = 0;
        foreach ($dests as $d) {
            $t = (string)$d['tenant_id'];
            if ($t === 'demo') { self::touchSchedule($pdo, $t, (int)$d['id'], 'skipped_demo'); continue; }
            $r = self::runDestination($pdo, $t, $d); $ran++; if ($r['ok']) $ok++;
        }
        return ['processed' => $ran, 'ok' => $ok];
    }
}
