<?php
declare(strict_types=1);
namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

/**
 * Catalog — 상품 일괄 등록/가격 수정 writeback (192차 Sprint2 신규).
 *
 * 배경: CatalogSync 프론트가 호출하던 /v382/writeback/{ch}/{sku}/execute 는 191차에 제거되어
 *   404(dead-route)였고, 일괄 가격수정은 setTimeout 시뮬레이션으로 실제 반영이 전혀 없었다.
 *   → 세션 self-auth(requirePro) + 테넌트 격리(authedTenant)로 catalog_listing 에 실제 영속.
 *
 * 상태(status): 채널 자격증명(channel_credential) 존재 → 'queued'(채널 동기화 대기),
 *   없으면 'saved'(저장됨·연동대기), unregister → 'unregistered'.
 *   (실 채널 API push 는 채널별 write 어댑터로 후속 확장 — 본 핸들러는 테넌트격리 영속이 정본.)
 *
 * /api/catalog/* 는 index.php public bypass(세션 기반) → 핸들러 self-auth. (190차 CRM 패턴 정합)
 */
class Catalog
{
    private static function db(): \PDO { return Db::pdo(); }
    private static function isMysql(\PDO $pdo): bool { return $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME) === 'mysql'; }
    private static function now(): string { return gmdate('Y-m-d H:i:s'); }

    private static function tenant(Request $req): string
    {
        $t = UserAuth::authedTenant($req);
        return ($t !== null && $t !== '') ? $t : 'demo';
    }

    private static function jsonRes(Response $res, array $payload, int $status = 200): Response
    {
        $res->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $res->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private static function ensureTables(): void
    {
        $pdo = self::db();
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_listing (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL,
                sku VARCHAR(190) NOT NULL,
                name VARCHAR(500), category VARCHAR(255),
                price DOUBLE DEFAULT 0, inventory INT DEFAULT 0, spec TEXT,
                action VARCHAR(30) NOT NULL DEFAULT 'register',
                status VARCHAR(30) NOT NULL DEFAULT 'saved',
                channel_result TEXT,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_catalog_listing (tenant_id, channel, sku),
                KEY idx_catalog_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 193차 Sprint4 #6: 가격이력 — 채널×SKU 가격 변경(old→new) 기록(테넌트 격리).
            $pdo->exec("CREATE TABLE IF NOT EXISTS price_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL, sku VARCHAR(190) NOT NULL,
                old_price DOUBLE DEFAULT 0, new_price DOUBLE DEFAULT 0,
                source VARCHAR(30) NOT NULL DEFAULT 'writeback', created_at VARCHAR(32),
                KEY idx_ph_tenant (tenant_id), KEY idx_ph_sku (tenant_id, channel, sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // [현 차수] Writeback Console 실배선 — 송출 작업 이력(테넌트 격리).
            //   ★ 레거시 writeback_job(구 v382/v392 엔진, channel 컬럼 없음)과 충돌 회피 위해 catalog_ 접두.
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_job (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL, sku VARCHAR(190) NOT NULL,
                operation VARCHAR(40) NOT NULL DEFAULT 'publish',
                status VARCHAR(30) NOT NULL DEFAULT 'queued',
                attempt INT DEFAULT 1, payload TEXT, result TEXT,
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_wbjob_tenant (tenant_id), KEY idx_wbjob_sku (tenant_id, channel, sku)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // 고위험 송출(고액·등록해제) 승인 티켓(테넌트 격리).
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_approval (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                type VARCHAR(60) NOT NULL DEFAULT 'writeback',
                channel VARCHAR(100), sku VARCHAR(190), payload TEXT,
                status VARCHAR(30) NOT NULL DEFAULT 'pending',
                created_at VARCHAR(32), updated_at VARCHAR(32),
                KEY idx_wbappr_tenant (tenant_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            // [227차] 채널 카테고리 매핑 — 내 카테고리(src_category) → 채널 카테고리코드(channel_code).
            //   마켓플레이스(쿠팡 displayCategoryCode·네이버 leafCategoryId 등) 상품등록 필수 코드를 1회 매핑→재사용.
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_category_map (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL, src_category VARCHAR(255) NOT NULL,
                channel_code VARCHAR(120) NOT NULL, channel_label VARCHAR(255),
                created_at VARCHAR(32), updated_at VARCHAR(32),
                UNIQUE KEY uq_ccm (tenant_id, channel, src_category)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_listing (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, sku TEXT NOT NULL, name TEXT, category TEXT,
                price REAL DEFAULT 0, inventory INTEGER DEFAULT 0, spec TEXT,
                action TEXT NOT NULL DEFAULT 'register', status TEXT NOT NULL DEFAULT 'saved',
                channel_result TEXT, created_at TEXT, updated_at TEXT,
                UNIQUE (tenant_id, channel, sku)
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS price_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, sku TEXT NOT NULL,
                old_price REAL DEFAULT 0, new_price REAL DEFAULT 0,
                source TEXT NOT NULL DEFAULT 'writeback', created_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_job (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, sku TEXT NOT NULL, operation TEXT NOT NULL DEFAULT 'publish',
                status TEXT NOT NULL DEFAULT 'queued', attempt INTEGER DEFAULT 1,
                payload TEXT, result TEXT, created_at TEXT, updated_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_writeback_approval (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                type TEXT NOT NULL DEFAULT 'writeback', channel TEXT, sku TEXT, payload TEXT,
                status TEXT NOT NULL DEFAULT 'pending', created_at TEXT, updated_at TEXT
            )");
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_category_map (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, src_category TEXT NOT NULL,
                channel_code TEXT NOT NULL, channel_label TEXT, created_at TEXT, updated_at TEXT,
                UNIQUE (tenant_id, channel, src_category)
            )");
        }
        // [277차] 상품 상세페이지(HTML)·이미지가 writeback 페이로드에 실리지 않아 채널에 빈 상세로 등록됐다.
        //   catalog_listing 에 보관 컬럼 보강(MySQL·SQLite 공통 멱등 ALTER — 이미 존재 시 예외무시).
        //   category_code: 상품별 채널 카테고리 코드(네이버 leafCategoryId). 큐 소비는 catalog_listing 에서
        //   product 를 복원하므로 여기 보존하지 않으면 전송 시점에 코드가 사라져 신규등록이 거부된다.
        foreach (['detail_html TEXT', 'images_json TEXT', 'image_url TEXT', 'category_code TEXT'] as $col) {
            try { $pdo->exec("ALTER TABLE catalog_listing ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
        // [277차] 채널 카테고리 카탈로그 캐시 — 네이버 leafCategoryId(5,827건) 등 채널 필수 코드의 로컬 사본.
        //   종전엔 코드를 얻을 수단이 없어 신규 상품등록이 전부 거부됐다. 채널당 1회 수집 → 검색·매핑에 재사용.
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_category_catalog (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                channel VARCHAR(100) NOT NULL,
                code VARCHAR(190) NOT NULL,
                name VARCHAR(255),
                whole_name VARCHAR(500),
                is_leaf TINYINT(1) NOT NULL DEFAULT 0,
                synced_at VARCHAR(32),
                UNIQUE KEY uq_ccc (tenant_id, channel, code),
                KEY idx_ccc_leaf (tenant_id, channel, is_leaf)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS channel_category_catalog (
                id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'demo',
                channel TEXT NOT NULL, code TEXT NOT NULL, name TEXT, whole_name TEXT,
                is_leaf INTEGER NOT NULL DEFAULT 0, synced_at TEXT,
                UNIQUE (tenant_id, channel, code)
            )");
        }
    }

    /**
     * [277차] GET /catalog/channel-categories?channel=&q=&refresh=1
     *   채널의 카테고리 코드(네이버 leafCategoryId 등)를 검색한다. 캐시가 비었거나 refresh=1 이면 채널에서 1회 수집.
     *   신규 상품등록의 필수값을 UI 가 조회할 수 있는 유일한 경로(종전 부재 → 등록 전면 불가).
     */
    public static function channelCategories(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $q = $req->getQueryParams();
        $channel = strtolower(trim((string)($q['channel'] ?? '')));
        $term    = trim((string)($q['q'] ?? ''));
        $refresh = ((string)($q['refresh'] ?? '')) === '1';
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);

        $cnt = 0;
        try {
            $st = $pdo->prepare("SELECT COUNT(*) FROM channel_category_catalog WHERE tenant_id=? AND channel=?");
            $st->execute([$tenant, $channel]);
            $cnt = (int)$st->fetchColumn();
        } catch (\Throwable $e) { /* 최초 호출 */ }

        if ($refresh || $cnt === 0) {
            $synced = self::syncChannelCategories($pdo, $tenant, $channel);
            if ($synced === 0 && $cnt === 0) {
                return self::jsonRes($res, ['ok' => false, 'error' => 'category_fetch_failed',
                    'hint' => '채널 자격증명을 확인하세요. 카테고리 조회는 채널 인증이 필요합니다.'], 200);
            }
            $cnt = $synced ?: $cnt;
        }

        // 리프(등록 가능)만 노출 — 상위 카테고리는 상품등록에 사용할 수 없다.
        $sql = "SELECT code, name, whole_name FROM channel_category_catalog
                WHERE tenant_id=? AND channel=? AND is_leaf=1";
        $bind = [$tenant, $channel];
        if ($term !== '') { $sql .= " AND (whole_name LIKE ? OR name LIKE ? OR code=?)"; $bind[] = "%{$term}%"; $bind[] = "%{$term}%"; $bind[] = $term; }
        $sql .= " ORDER BY whole_name LIMIT 50";
        $st = $pdo->prepare($sql);
        $st->execute($bind);
        return self::jsonRes($res, ['ok' => true, 'channel' => $channel, 'total_cached' => $cnt,
            'categories' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /** [277차] 채널에서 카테고리 카탈로그를 받아 캐시에 upsert. 반환=저장 건수(실패 0). */
    private static function syncChannelCategories(\PDO $pdo, string $tenant, string $channel): int
    {
        $creds = self::loadChannelCreds($pdo, $tenant, $channel);
        if (!$creds) return 0;
        $rows = [];
        foreach (self::channelAliases($channel) as $a) {
            if ($a === 'naver' || $a === 'naver_smartstore') { $rows = ChannelSync::naverCategoryCatalog($creds); break; }
        }
        if (!$rows) return 0;   // 미지원 채널은 정직하게 0(가짜 카테고리 생성 금지)
        $now = self::now();
        $sql = self::isMysql($pdo)
            ? "INSERT INTO channel_category_catalog(tenant_id,channel,code,name,whole_name,is_leaf,synced_at) VALUES(?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE name=VALUES(name),whole_name=VALUES(whole_name),is_leaf=VALUES(is_leaf),synced_at=VALUES(synced_at)"
            : "INSERT INTO channel_category_catalog(tenant_id,channel,code,name,whole_name,is_leaf,synced_at) VALUES(?,?,?,?,?,?,?)
               ON CONFLICT(tenant_id,channel,code) DO UPDATE SET name=excluded.name,whole_name=excluded.whole_name,is_leaf=excluded.is_leaf,synced_at=excluded.synced_at";
        $st = $pdo->prepare($sql);
        $n = 0;
        $pdo->beginTransaction();
        try {
            foreach ($rows as $r) {
                $st->execute([$tenant, $channel, $r['code'], $r['name'], $r['whole'], $r['leaf'] ? 1 : 0, $now]);
                $n++;
            }
            $pdo->commit();
        } catch (\Throwable $e) { $pdo->rollBack(); return 0; }
        return $n;
    }

    /** 가격 변경(old≠new) 시에만 price_history 기록(테넌트 격리). best-effort. */
    private static function recordPriceChange(\PDO $pdo, string $tenant, string $channel, string $sku, $old, $new, string $source): void
    {
        $o = (float)$old; $n = (float)$new;
        if (abs($o - $n) < 0.000001) return; // 변경 없음
        try {
            $pdo->prepare("INSERT INTO price_history(tenant_id,channel,sku,old_price,new_price,source,created_at) VALUES(?,?,?,?,?,?,?)")
                ->execute([$tenant, $channel, $sku, $o, $n, $source, self::now()]);
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /** [251차] 테넌트에 해당 sku 가 이미 존재하는지(채널 무관) — 신규 상품 여부 판정(한도 카운트용). */
    private static function skuExists(\PDO $pdo, string $tenant, string $sku): bool
    {
        try {
            $st = $pdo->prepare("SELECT 1 FROM catalog_listing WHERE tenant_id=? AND sku=? LIMIT 1");
            $st->execute([$tenant, $sku]);
            return (bool)$st->fetchColumn();
        } catch (\Throwable $e) { return false; }
    }

    /** 현재 등록가 조회(없으면 null). */
    private static function currentPrice(\PDO $pdo, string $tenant, string $channel, string $sku): ?float
    {
        try {
            $st = $pdo->prepare("SELECT price FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $v = $st->fetchColumn();
            return $v === false ? null : (float)$v;
        } catch (\Throwable $e) { return null; }
    }

    /** 채널 연결 여부 → 상태 결정 (테넌트 격리). */
    private static function channelStatus(\PDO $pdo, string $tenant, string $channel, string $action): string
    {
        if ($action === 'unregister' || $action === 'disconnect') return 'unregistered';
        try {
            // [277차] ★별칭 해석 누락 — loadChannelCreds 는 channelAliases 로 naver↔naver_smartstore 를 풀지만
            //   여기선 raw 키로만 조회해, 짧은 키(naver·amazon·11st)로 전송하면 자격증명이 있어도 'saved'(전송 안 함)가 됐다.
            //   CatalogSync 가 DEFAULT_CHANNELS 의 짧은 키를 그대로 보내므로 실제로 도달하는 경로다.
            $aliases = self::channelAliases($channel);
            $in = implode(',', array_fill(0, count($aliases), '?'));
            $st = $pdo->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=? AND channel IN ($in) AND is_active=1 LIMIT 1");
            $st->execute(array_merge([$tenant], $aliases));
            return $st->fetchColumn() ? 'queued' : 'saved';
        } catch (\Throwable $e) { return 'saved'; }
    }

    private static function upsert(\PDO $pdo, string $tenant, string $channel, string $sku, array $f, string $status): void
    {
        $now = self::now();
        // [277차] detail_html·images_json·image_url 영속. 새 값이 빈 문자열이면 기존 값을 지우지 않는다
        //   (COALESCE/NULLIF — 가격만 바꾸는 repricer 경로가 상세·이미지를 날리는 회귀 방지).
        if (self::isMysql($pdo)) {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at,detail_html,images_json,image_url,category_code)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2,:dh,:ij,:iu,:cc)
                    ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),price=VALUES(price),
                      inventory=VALUES(inventory),spec=VALUES(spec),action=VALUES(action),status=VALUES(status),updated_at=VALUES(updated_at),
                      detail_html=COALESCE(NULLIF(VALUES(detail_html),''),detail_html),
                      images_json=COALESCE(NULLIF(VALUES(images_json),''),images_json),
                      image_url=COALESCE(NULLIF(VALUES(image_url),''),image_url),
                      category_code=COALESCE(NULLIF(VALUES(category_code),''),category_code)";
        } else {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at,detail_html,images_json,image_url,category_code)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2,:dh,:ij,:iu,:cc)
                    ON CONFLICT(tenant_id,channel,sku) DO UPDATE SET name=excluded.name,category=excluded.category,
                      price=excluded.price,inventory=excluded.inventory,spec=excluded.spec,action=excluded.action,
                      status=excluded.status,updated_at=excluded.updated_at,
                      detail_html=COALESCE(NULLIF(excluded.detail_html,''),catalog_listing.detail_html),
                      images_json=COALESCE(NULLIF(excluded.images_json,''),catalog_listing.images_json),
                      image_url=COALESCE(NULLIF(excluded.image_url,''),catalog_listing.image_url),
                      category_code=COALESCE(NULLIF(excluded.category_code,''),catalog_listing.category_code)";
        }
        $oldPrice = self::currentPrice($pdo, $tenant, $channel, $sku); // 변경 전 등록가(없으면 null)
        $newPrice = (float)($f['price'] ?? 0);
        $imgs = array_values(array_filter(array_map('strval', (array)($f['images'] ?? [])), static fn($u) => $u !== ''));
        $st = $pdo->prepare($sql);
        $st->execute([
            ':t' => $tenant, ':c' => $channel, ':s' => $sku,
            ':n' => (string)($f['name'] ?? ''), ':cat' => (string)($f['category'] ?? ''),
            ':p' => $newPrice, ':inv' => (int)($f['inventory'] ?? 0),
            ':spec' => (string)($f['spec'] ?? ''), ':act' => (string)($f['action'] ?? 'register'),
            ':st' => $status, ':now' => $now, ':now2' => $now,
            ':dh' => (string)($f['detail_html'] ?? ''),
            ':ij' => $imgs ? json_encode($imgs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '',
            ':iu' => (string)($f['image_url'] ?? ''),
            ':cc' => (string)($f['category_code'] ?? ''),
        ]);
        // 기존 리스팅의 실제 가격 변경만 이력화(신규 등록은 변경 아님 → 제외).
        if ($oldPrice !== null && array_key_exists('price', $f)) {
            self::recordPriceChange($pdo, $tenant, $channel, $sku, $oldPrice, $newPrice, 'writeback');
        }
    }

    /* POST /catalog/writeback/{channel}/{sku} — 단일 상품×채널 등록/수정 */
    public static function writeback(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $channel = (string)($args['channel'] ?? '');
        $sku = rawurldecode((string)($args['sku'] ?? ''));
        if ($channel === '' || $sku === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel/sku required'], 400);
        $body = (array)($req->getParsedBody() ?? []);
        $action = (string)($body['action'] ?? 'register');
        // [251차] ★상품등록 한도 강제(이미지 스토리지 적자 방어) — 신규 상품(미존재 sku) 등록 시 기본 제공 수 +
        //   구매 추가팩의 유효 한도를 초과하면 402(추가팩 구매/거부 선택 payload). 기존 sku(채널 추가·수정·해제)는
        //   상품 수 증가가 아니므로 통과. 기본 제공 수(plan_config)는 admin 설정값을 읽기만 함(불변).
        if (!in_array($action, ['unregister', 'disconnect'], true) && !self::skuExists($pdo, $tenant, $sku)) {
            $ov = \Genie\PlanLimits::productOverage($pdo, $tenant, \Genie\PlanLimits::productCount($pdo, $tenant));
            if ($ov !== null) return self::jsonRes($res, $ov, 402);
        }
        // 기존 리스팅과 병합(누락 필드는 기존값 보존 → execute 시 부분 payload 로 인한 데이터 손실 방지).
        $f = self::mergeWithExisting($pdo, $tenant, $channel, $sku, $body, $action);
        $status = self::channelStatus($pdo, $tenant, $channel, $action);
        self::upsert($pdo, $tenant, $channel, $sku, $f, $status);
        // [277차] ★큐 잡을 'saved' 로 기록하면 processWritebackQueue 가 영원히 소비하지 않는다
        //   (소비 조건 = status IN ('queued','awaiting_credentials')). 자격증명이 없어 대기하는 상태의 정본은
        //   'awaiting_credentials' 이며, ChannelCreds::upsert 가 자격증명 등록 즉시 큐를 플러시한다.
        //   catalog_listing.status 는 'saved'(리스팅 저장됨) 그대로 두고, 잡 상태만 정합화한다.
        $jobStatus = ($status === 'saved') ? 'awaiting_credentials' : $status;
        self::logJob($pdo, $tenant, $channel, $sku, (string)($body['operation'] ?? 'publish'), $jobStatus, $f);
        Db::audit($pdo, $tenant, 'catalog.writeback', ['channel'=>$channel, 'sku'=>$sku, 'action'=>$action, 'status'=>$status]); // 감사: 상품 writeback

        // [277차] ★"동기화 성공"인데 채널에 등록되지 않는 문제의 근본 — 종전엔 큐에 넣고 'queued' 를 반환했고
        //   프론트가 이를 성공으로 표기했다. 실제 채널 push 는 10분 주기 크론이 나중에 시도하며, 거기서 실패해도
        //   사용자는 영원히 알 수 없었다(3회 후 조용히 failed). 이제 queued 면 그 자리에서 1건을 실제로 소비해
        //   **채널의 진짜 응답**을 반환한다. 실패 사유(예: leafCategoryId 필요)가 즉시 UI 에 뜬다.
        //   sync=false 로 명시하면 종전처럼 큐에만 넣는다(대량 전송용).
        $wantSync = !array_key_exists('sync', $body) || !empty($body['sync']);
        if ($wantSync && $status === 'queued') {
            $sum = self::processWritebackQueue($pdo, $tenant, $channel, 1);
            $jr = self::latestJobResult($pdo, $tenant, $channel, $sku);
            $jobDone = ($jr['status'] ?? '') === 'done';
            return self::jsonRes($res, [
                'ok'      => $jobDone,
                'status'  => $jr['status'] ?? $status,   // done | failed | queued(재시도 대기) | awaiting_credentials
                'channel' => $channel, 'sku' => $sku,
                'error'   => $jobDone ? null : ($jr['error'] ?? null),
                'attempt' => $jr['attempt'] ?? null,
                'summary' => $sum,
            ]);
        }
        return self::jsonRes($res, ['ok' => true, 'status' => $status, 'channel' => $channel, 'sku' => $sku]);
    }

    /* POST /catalog/bulk-price — body: {items:[{channel,sku,price}]} 일괄 가격 수정 */
    public static function bulkPrice(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $items = $body['items'] ?? [];
        if (!is_array($items) || !$items) return self::jsonRes($res, ['ok' => false, 'error' => 'items required'], 400);
        $now = self::now();
        $updated = 0;
        $changed = []; // [227차 Tier2] 실제 갱신된 (channel,sku,price) — 커밋 후 채널 writeback enqueue 용.
        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("UPDATE catalog_listing SET price=:p, updated_at=:now WHERE tenant_id=:t AND channel=:c AND sku=:s");
            $lst = $pdo->prepare("SELECT DISTINCT channel FROM catalog_listing WHERE tenant_id=? AND sku=?");
            foreach ($items as $it) {
                if (!is_array($it)) continue;
                $ch = (string)($it['channel'] ?? '');
                $sk = (string)($it['sku'] ?? '');
                if ($sk === '') continue;
                $newP = (float)($it['price'] ?? 0);
                // [현 차수 P3] ★와일드카드 채널('*'/'all'/빈값) 팬아웃 — 기존엔 channel='all' 리터럴로 UPDATE 해
                //   실제 채널행(coupang/naver…)과 0행 매칭 = PriceOpt 전채널 최적가 적용이 완전 no-op 이었다.
                //   해당 SKU 의 전 채널 리스팅을 조회해 각각 갱신(writeback enqueue 도 채널별로 이어진다).
                $isWild = ($ch === '' || $ch === '*' || strtolower($ch) === 'all');
                $targets = [$ch];
                if ($isWild) { $lst->execute([$tenant, $sk]); $targets = $lst->fetchAll(\PDO::FETCH_COLUMN) ?: []; }
                foreach ($targets as $tc) {
                    if ((string)$tc === '') continue;
                    $oldP = self::currentPrice($pdo, $tenant, (string)$tc, $sk); // 변경 전 가격
                    $upd->execute([':p' => $newP, ':now' => $now, ':t' => $tenant, ':c' => (string)$tc, ':s' => $sk]);
                    $n = $upd->rowCount();
                    $updated += $n;
                    if ($n > 0) {
                        if ($oldP !== null) self::recordPriceChange($pdo, $tenant, (string)$tc, $sk, $oldP, $newP, 'bulk');
                        $changed[] = ['channel' => (string)$tc, 'sku' => $sk, 'price' => $newP];
                    }
                }
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            return self::jsonRes($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }

        // ── [227차 Tier2] 일괄 가격변경 → 채널 writeback 큐 적재 + 즉시 push ──────────────
        //   기존엔 bulkPrice 가 catalog_listing.price 만 갱신하고 writeback 큐에 안 넣어,
        //   변경된 가격이 실제 채널(쿠팡/네이버/카페24 등)로 영원히 push 되지 않았다(단일 writeback() 만 enqueue).
        //   이제 자격증명 활성 채널 항목을 'price' 작업으로 enqueue 하고 즉시 큐를 플러시한다.
        //   자격증명 미등록 채널은 enqueue 제외(saved 상태로 catalog_listing 만 갱신 — 등록 시 자동 재개).
        $enqueued = 0;
        foreach ($changed as $c) {
            if (self::channelStatus($pdo, $tenant, $c['channel'], 'register') === 'queued') {
                self::logJob($pdo, $tenant, $c['channel'], $c['sku'], 'price', 'queued', ['sku' => $c['sku'], 'price' => $c['price']]);
                $enqueued++;
            }
        }
        $pushed = null;
        if ($enqueued > 0) {
            try { $pushed = self::processWritebackQueue($pdo, $tenant, null, 200); }
            catch (\Throwable $e) { /* 큐는 남아 cron/재호출로 재개 */ }
        }
        Db::audit($pdo, $tenant, 'catalog.bulk_price', ['updated'=>$updated, 'enqueued'=>$enqueued, 'changed'=>count($changed)]); // 감사: 일괄 가격변경
        return self::jsonRes($res, ['ok' => true, 'updated' => $updated, 'enqueued' => $enqueued, 'pushed' => $pushed]);
    }

    /* GET /catalog/listings — 테넌트 등록 리스팅 조회 */
    public static function listings(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        // [현 차수 P2] ABAC 차원강제 — 채널/상품(브랜드=상품집합) 스코프 사용자는 허용 리스팅만(무제한=무필터·무회귀).
        [$scC, $pC] = TeamPermissions::scopeSqlNamed($req, 'channel', 'channel', 'abc');
        [$scP, $pP] = TeamPermissions::scopeSqlNamed($req, 'product', 'sku', 'abp');
        [$scB, $pB] = TeamPermissions::scopeSqlNamed($req, 'brand',   'sku', 'abb');
        $params = [':t' => $tenant] + $pC + $pP + $pB;
        $st = $pdo->prepare("SELECT channel,sku,name,category,price,inventory,action,status,updated_at
                             FROM catalog_listing WHERE tenant_id=:t{$scC}{$scP}{$scB} ORDER BY updated_at DESC LIMIT 1000");
        $st->execute($params);
        return self::jsonRes($res, ['ok' => true, 'listings' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /* GET /catalog/price-history?channel=&sku= — 테넌트 가격 변경 이력(최근순). 193차 Sprint4 #6 */
    public static function priceHistory(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $q = $req->getQueryParams();
        $where = ['tenant_id = :t']; $params = [':t' => $tenant];
        if (!empty($q['channel'])) { $where[] = 'channel = :c'; $params[':c'] = (string)$q['channel']; }
        if (!empty($q['sku']))     { $where[] = 'sku = :s';     $params[':s'] = (string)$q['sku']; }
        $sql = "SELECT channel,sku,old_price,new_price,source,created_at FROM price_history
                WHERE " . implode(' AND ', $where) . " ORDER BY id DESC LIMIT 500";
        $st = $pdo->prepare($sql);
        $st->execute($params);
        return self::jsonRes($res, ['ok' => true, 'history' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /* ════════════════════════════════════════════════════════════════════════
       Writeback Console 실배선 ([현 차수])
       프론트 Writeback.jsx 콘솔이 호출하던 /v382/* (404)·/v401·/v398 (api_key 401)
       을 세션 기반 /catalog/* 로 통합 재배선. 정책검증·카테고리추천·미리보기·prepare·
       approvals·jobs 전부 테넌트 격리 영속. (192차 CatalogSync 세션 패턴 동일.)
       ════════════════════════════════════════════════════════════════════════ */

    private const HIGH_VALUE_KRW = 5000000.0; // 고액 상품 → 승인 게이트 임계

    /** 기존 catalog_listing 행과 병합(body 우선, 누락 필드는 기존값 보존). title→name 폴백. */
    private static function mergeWithExisting(\PDO $pdo, string $tenant, string $channel, string $sku, array $body, string $action): array
    {
        $existing = [];
        try {
            $st = $pdo->prepare("SELECT name,category,price,inventory,spec,detail_html,images_json,image_url,category_code FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $existing = $st->fetch(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) { /* best-effort */ }
        $name = $body['name'] ?? $body['title'] ?? null;
        // [277차] 이미지 배열은 body(images) 우선, 없으면 기존 images_json 복원. 단일 image_url 은 폴백.
        $images = [];
        if (array_key_exists('images', $body) && is_array($body['images'])) {
            $images = array_values(array_filter(array_map('strval', $body['images']), static fn($u) => $u !== ''));
        } elseif (!empty($existing['images_json'])) {
            $dec = json_decode((string)$existing['images_json'], true);
            if (is_array($dec)) $images = array_values(array_filter(array_map('strval', $dec), static fn($u) => $u !== ''));
        }
        return [
            'name'      => ($name !== null && $name !== '') ? (string)$name : (string)($existing['name'] ?? ''),
            'category'  => array_key_exists('category', $body) ? (string)$body['category'] : (string)($existing['category'] ?? ''),
            'price'     => array_key_exists('price', $body) ? $body['price'] : ($existing['price'] ?? 0),
            'inventory' => array_key_exists('inventory', $body) ? $body['inventory'] : ($existing['inventory'] ?? 0),
            'spec'      => array_key_exists('spec', $body) ? (string)$body['spec'] : (string)($existing['spec'] ?? ''),
            'detail_html' => array_key_exists('detail_html', $body) ? (string)$body['detail_html'] : (string)($existing['detail_html'] ?? ''),
            'image_url' => array_key_exists('image_url', $body) ? (string)$body['image_url'] : (string)($existing['image_url'] ?? ''),
            'images'    => $images,
            // [277차] 상품별 채널 카테고리 코드(네이버 leafCategoryId 등) — 신규등록 필수값.
            'category_code' => array_key_exists('category_code', $body) ? (string)$body['category_code'] : (string)($existing['category_code'] ?? ''),
            // [277차] 채널 필수 메타(상품정보제공고시·배송/반품·AS·원산지·미성년자). catalog_listing 에 컬럼을 늘리지 않고
            //   writeback job payload 로 운반한다(큐 소비 시 currentListing 결과에 병합).
            //   네이버 신규등록은 이 값들이 없으면 400 이다(실 API 확정).
            'channel_meta' => self::pickChannelMeta($body),
            'action'    => $action,
        ];
    }

    /** [277차] 채널 필수 메타만 추려낸다(화이트리스트 — 임의 필드 유입 차단). */
    private static function pickChannelMeta(array $body): array
    {
        $keys = ['notice_category', 'notice_json', 'as_phone', 'as_guide', 'origin', 'minor_purchase',
                 'ship_fee_type', 'ship_fee', 'return_ship_fee', 'exchange_ship_fee', 'brand', 'manufacturer',
                 'model_name', 'barcode', 'naver_shopping', 'mfg_date', 'expiry_date', 'return_courier'];
        $out = [];
        foreach ($keys as $k) { if (array_key_exists($k, $body) && $body[$k] !== null && $body[$k] !== '') $out[$k] = $body[$k]; }
        return $out;
    }

    /** 결정적 정책 검증(랜덤 없음·테넌트 무관 규칙). findings + 승인필요 여부 산출. */
    private static function evaluatePolicy(\PDO $pdo, string $tenant, string $channel, array $product, string $action): array
    {
        $findings = [];
        $title = trim((string)($product['title'] ?? $product['name'] ?? ''));
        $price = (float)($product['price'] ?? 0);
        $category = trim((string)($product['category'] ?? ''));
        $requiresApproval = false; $approvalType = null;

        if ($action === 'unregister' || $action === 'disconnect') {
            $requiresApproval = true; $approvalType = 'unregister';
            $findings[] = ['level' => 'warn', 'code' => 'UNREGISTER', 'message' => '채널 등록 해제는 승인이 필요합니다.'];
        }
        if ($title === '') {
            $findings[] = ['level' => 'error', 'code' => 'MISSING_TITLE', 'message' => '상품명(title)이 필요합니다.'];
        } elseif (mb_strlen($title) > 100) {
            $findings[] = ['level' => 'warn', 'code' => 'TITLE_TOO_LONG', 'message' => '상품명이 100자를 초과합니다(채널에서 잘릴 수 있음).'];
        }
        if ($price <= 0) {
            $findings[] = ['level' => 'error', 'code' => 'INVALID_PRICE', 'message' => '판매가는 0보다 커야 합니다.'];
        } elseif ($price >= self::HIGH_VALUE_KRW) {
            $requiresApproval = true; $approvalType = $approvalType ?: 'high_value';
            $findings[] = ['level' => 'warn', 'code' => 'HIGH_VALUE', 'message' => '고액 상품(₩' . number_format($price) . ')은 승인이 필요합니다.'];
        }
        if ($category === '') {
            $findings[] = ['level' => 'info', 'code' => 'NO_CATEGORY', 'message' => '카테고리가 비어 있습니다(자동 추천을 사용하세요).'];
        }
        $connected = false;
        try {
            $st = $pdo->prepare("SELECT 1 FROM channel_credential WHERE tenant_id=:t AND channel=:c AND is_active=1 LIMIT 1");
            $st->execute([':t' => $tenant, ':c' => $channel]);
            $connected = (bool)$st->fetchColumn();
        } catch (\Throwable $e) { /* best-effort */ }
        if (!$connected) {
            $findings[] = ['level' => 'warn', 'code' => 'CHANNEL_NOT_CONNECTED', 'message' => '채널 자격증명이 없습니다. 저장은 되나 송출은 연동 후 진행됩니다.'];
        }
        $hasError = false;
        foreach ($findings as $fnd) { if ($fnd['level'] === 'error') { $hasError = true; break; } }
        return [
            'ok' => !$hasError,
            'findings' => $findings,
            'requires_approval' => $requiresApproval,
            'approval_type' => $approvalType,
            'connected' => $connected,
        ];
    }

    /** 결정적 카테고리 추천(키워드 사전 기반·랜덤 없음·공개 분류 체계라 테넌트 무관). */
    private static function suggestCategories(string $channel, array $product): array
    {
        $hay = mb_strtolower(trim(((string)($product['title'] ?? $product['name'] ?? '')) . ' '
            . ((string)($product['category'] ?? '')) . ' ' . ((string)($product['spec'] ?? ''))));
        $map = [
            'Electronics/Mobile'    => ['phone','smartphone','갤럭시','아이폰','iphone','galaxy','스마트폰','휴대폰'],
            'Electronics/Computers' => ['laptop','노트북','컴퓨터','pc','tablet','태블릿','맥북','macbook'],
            'Electronics/Audio'     => ['earbuds','이어폰','헤드폰','headphone','스피커','speaker','airpods'],
            'Fashion/Apparel'       => ['shirt','셔츠','티셔츠','의류','apparel','dress','원피스','바지','pants','자켓','jacket'],
            'Fashion/Shoes'         => ['shoes','신발','운동화','sneaker','구두','부츠','boots'],
            'Beauty/Skincare'       => ['skincare','스킨케어','크림','cream','세럼','serum','로션','lotion','화장품','cosmetic'],
            'Home/Kitchen'          => ['kitchen','주방','냄비','pan','그릇','텀블러','tumbler','조리'],
            'Food/Grocery'          => ['food','식품','간식','snack','커피','coffee','과자','음료','beverage'],
            'Sports/Outdoor'        => ['sports','스포츠','운동','fitness','캠핑','camping','outdoor','등산'],
            'Baby/Kids'             => ['baby','아기','유아','kids','어린이','장난감','toy'],
        ];
        $suggestions = [];
        foreach ($map as $path => $kw) {
            $hits = 0;
            foreach ($kw as $w) { if ($w !== '' && mb_strpos($hay, $w) !== false) $hits++; }
            if ($hits > 0) $suggestions[] = ['category_path' => $path, 'confidence' => round(min(0.95, 0.5 + 0.15 * $hits), 2), 'matched' => $hits];
        }
        usort($suggestions, fn($a, $b) => $b['confidence'] <=> $a['confidence']);
        if (!$suggestions) $suggestions[] = ['category_path' => 'General/Uncategorized', 'confidence' => 0.3, 'matched' => 0];
        return array_slice($suggestions, 0, 3);
    }

    /** 채널 송출용 정규화 payload. */
    private static function normalizePayload(string $channel, string $sku, array $product): array
    {
        return [
            'channel'   => $channel,
            'sku'       => $sku !== '' ? $sku : (string)($product['sku'] ?? ''),
            'title'     => (string)($product['title'] ?? $product['name'] ?? ''),
            'price'     => (float)($product['price'] ?? 0),
            'currency'  => (string)($product['currency'] ?? 'KRW'),
            'inventory' => (int)($product['inventory'] ?? 0),
            'category'  => (string)($product['category'] ?? ''),
            'spec'      => (string)($product['spec'] ?? ''),
            // [277차] 상세HTML·이미지 — writeback job payload 에 실어 어댑터(naverWrite 등)까지 전달.
            'detail_html' => (string)($product['detail_html'] ?? ''),
            'image_url'   => (string)($product['image_url'] ?? ''),
            'images'      => array_values((array)($product['images'] ?? [])),
        ];
    }

    /** writeback_job 기록(best-effort). */
    private static function logJob(\PDO $pdo, string $tenant, string $channel, string $sku, string $operation, string $status, array $payload): void
    {
        try {
            $now = self::now();
            $pdo->prepare("INSERT INTO catalog_writeback_job(tenant_id,channel,sku,operation,status,attempt,payload,created_at,updated_at)
                           VALUES(?,?,?,?,?,1,?,?,?)")
                ->execute([$tenant, $channel, $sku, $operation, $status, json_encode($payload, JSON_UNESCAPED_UNICODE), $now, $now]);
        } catch (\Throwable $e) { /* best-effort */ }
    }

    /* ═══════════════════════════════════════════════════════════════════
       [227차] Writeback 채널 push — 큐 소비 워커 + 채널 쓰기 어댑터.
         배경: writeback() 가 자격증명 존재 시 status='queued' 로 catalog_writeback_job 에 적재하나
           소비 워커가 없어 영원히 queued(로컬 catalog_listing 만 갱신, 실 채널 push 0).
         설계: ①큐 소비 워커 ②채널별 쓰기 어댑터(Shopify 실연동, 나머지 honest-pending)
           ③자격증명 등록 시 자동 실행(ChannelCreds::upsert 훅) ④cron(writeback_cron.php).
         ★자격증명 미등록 시 안전: 'awaiting_credentials' 보류, 등록되면 자동 재개(현 0-cred 운영=무영향).
       ═══════════════════════════════════════════════════════════════════ */

    /** 채널 활성 자격증명을 key_name→key_value 맵으로 로드(테넌트 격리). 없으면 빈 배열. */
    /** [228차] 채널 별칭 그룹 — registry(amazon_spapi)·job·매핑의 채널키 표기차를 흡수.
     *   cred/카테고리 조회가 정확매칭만 하면 별칭 채널(예: job=amazon, cred=amazon_spapi)에서 영영 못 찾는다. */
    private static function channelAliases(string $channel): array
    {
        $ch = strtolower(trim($channel));
        $groups = [
            ['amazon', 'amazon_spapi'],
            ['tiktok_shop', 'tiktok'],
            ['naver', 'naver_smartstore'],
            ['11st', 'st11'],
        ];
        foreach ($groups as $g) { if (in_array($ch, $g, true)) return $g; }
        return [$ch];
    }

    private static function loadChannelCreds(\PDO $pdo, string $tenant, string $channel): array
    {
        $exact   = strtolower(trim($channel));
        $aliases = self::channelAliases($channel);
        try {
            $ph = implode(',', array_fill(0, count($aliases), '?'));
            $st = $pdo->prepare("SELECT channel, key_name, key_value FROM channel_credential WHERE tenant_id=? AND channel IN ($ph) AND is_active=1");
            $st->execute(array_merge([$tenant], $aliases));
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
            // [228차] ★key_value 는 AES 암호화 저장본 → 복호화 필수(평문 passthrough 안전). 정확채널 우선, 없으면 별칭.
            //   기존엔 raw(암호화) 반환 + 정확매칭 → seller_id 등 모든 쓰기 자격증명이 어댑터에 미도달(잠복 버그).
            $creds = [];
            foreach ([true, false] as $exactFirst) {
                foreach ($rows as $r) {
                    $isExact = strtolower((string)$r['channel']) === $exact;
                    if ($exactFirst !== $isExact) continue;
                    $kn = (string)$r['key_name'];
                    if ($kn === '' || isset($creds[$kn])) continue;
                    $creds[$kn] = \Genie\Crypto::decrypt((string)$r['key_value']);
                }
            }
            return $creds;
        } catch (\Throwable $e) { return []; }
    }

    /** curl HTTP 요청(쓰기 어댑터용). 반환 [httpCode, body]. */
    private static function httpReq(string $method, string $url, array $headers, ?string $body): array
    {
        $ch = curl_init($url);
        $hdr = [];
        foreach ($headers as $k => $v) { $hdr[] = $k . ': ' . $v; }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $hdr, CURLOPT_TIMEOUT => 20, CURLOPT_CONNECTTIMEOUT => 10,
        ]);
        if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        $resp = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);
        if ($resp === false) return [0, json_encode(['error' => $err])];
        return [$code, (string)$resp];
    }

    /** Shopify Admin API 상품 등록/수정/해제(실연동). creds: shop_domain + access_token. */
    /**
     * [277차] Shopify 이미지 배열 — 공개 URL 은 `src`, base64 dataURL 은 `attachment`(헤더 제외 base64)로 보낸다.
     *   Shopify 가 attachment 를 받아 자체 CDN URL 을 발급하므로 별도 업로드 API 가 필요 없다(네이버와 다름).
     *   상품등록 폼은 dataURL 로 보관하므로 이 변환이 없으면 이미지가 전송되지 않는다. 상한 250장.
     */
    private static function shopifyImages(array $p): array
    {
        $src = array_values(array_filter(array_map('strval', (array)($p['images'] ?? [])), static fn($u) => $u !== ''));
        if (!$src && (string)($p['image_url'] ?? '') !== '') $src = [(string)$p['image_url']];
        $out = [];
        foreach (array_slice($src, 0, 250) as $i => $u) {
            if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) { $out[] = ['src' => $u]; continue; }
            if (preg_match('#^data:image/([a-zA-Z0-9.+-]+);base64,(.+)$#s', $u, $m)) {
                $ext = ['jpeg' => 'jpg', 'png' => 'png', 'gif' => 'gif', 'webp' => 'webp'][$m[1]] ?? 'jpg';
                $out[] = ['attachment' => $m[2], 'filename' => 'image-' . ($i + 1) . '.' . $ext];
            }
        }
        return $out;
    }

    private static function shopifyWrite(array $creds, array $p, string $operation, ?string $channelProductId): array
    {
        $token = $creds['access_token'] ?? $creds['api_password'] ?? '';
        $shop  = rtrim((string)($creds['shop_domain'] ?? ''), '/');
        if ($shop === '' || $token === '') return ['ok' => false, 'error' => 'shop_domain/access_token 미설정'];
        if (!str_contains($shop, '.')) $shop .= '.myshopify.com';
        $headers = ['X-Shopify-Access-Token' => $token, 'Content-Type' => 'application/json'];

        if ($operation === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            if ($channelProductId === null) return ['ok' => true, 'note' => '미등록 상품 — 해제 불요'];
            [$code] = self::httpReq('DELETE', "https://{$shop}/admin/api/2024-01/products/{$channelProductId}.json", $headers, null);
            return ($code >= 200 && $code < 300) ? ['ok' => true, 'deleted' => $channelProductId] : ['ok' => false, 'error' => "Shopify DELETE HTTP {$code}"];
        }

        // [277차] 종전엔 body_html 에 spec(규격 한 줄)만 넣고 이미지는 아예 보내지 않아, Shopify 에 등록된 상품이
        //   이미지 없는 빈 상세로 올라갔다(네이버와 동일 결함 클래스). 상세HTML 우선 + 이미지 전송.
        $bodyHtml = (string)($p['detail_html'] ?? '');
        if ($bodyHtml === '') $bodyHtml = (string)($p['spec'] ?? '');
        $product = [
            'title'        => (string)($p['name'] ?? $p['sku'] ?? ''),
            'body_html'    => $bodyHtml,
            'product_type' => (string)($p['category'] ?? ''),
            'status'       => 'active',
            'variants'     => [[
                'price'                => (string)(float)($p['price'] ?? 0),
                'sku'                  => (string)($p['sku'] ?? ''),
                'inventory_quantity'   => (int)($p['inventory'] ?? 0),
                'inventory_management' => 'shopify',
            ]],
        ];
        $imgs = self::shopifyImages($p);
        if ($imgs) $product['images'] = $imgs;
        if ($channelProductId !== null) {
            $body = json_encode(['product' => array_merge(['id' => (int)$channelProductId], $product)], JSON_UNESCAPED_UNICODE);
            [$code, $resp] = self::httpReq('PUT', "https://{$shop}/admin/api/2024-01/products/{$channelProductId}.json", $headers, $body);
        } else {
            [$code, $resp] = self::httpReq('POST', "https://{$shop}/admin/api/2024-01/products.json", $headers, json_encode(['product' => $product], JSON_UNESCAPED_UNICODE));
        }
        if ($code >= 200 && $code < 300) {
            $d = json_decode((string)$resp, true);
            $pid = isset($d['product']['id']) ? (string)$d['product']['id'] : $channelProductId;
            return ['ok' => true, 'channel_product_id' => $pid];
        }
        return ['ok' => false, 'error' => "Shopify HTTP {$code}", 'body' => mb_substr((string)$resp, 0, 300)];
    }

    /** 채널 쓰기 어댑터 디스패치. 미구현 채널은 pending(큐 유지 → 어댑터 추가 시 자동 처리). */
    private static function pushToChannel(string $channel, array $creds, array $product, string $operation, ?string $channelProductId): array
    {
        switch (strtolower($channel)) {
            case 'shopify':
                return self::shopifyWrite($creds, $product, $operation, $channelProductId);
            // [227차] cafe24/coupang/naver 등은 ChannelSync 쓰기 어댑터로 위임(검증된 인증 재사용).
            //   ChannelSync 미지원 채널은 pending 반환 → 큐 유지(어댑터 추가 시 자동 소비).
            default:
                return ChannelSync::pushProduct($channel, $creds, $product, $operation, $channelProductId);
        }
    }

    /** 현재 catalog_listing 한 행을 product 배열로 로드(부분 payload 손실 방지). */
    private static function currentListing(\PDO $pdo, string $tenant, string $channel, string $sku): ?array
    {
        try {
            // [277차] detail_html·images 도 복원. 네이버 등은 update 가 originProduct 전체 교체(PUT)라
            //   상세·이미지를 빼고 push 하면 채널에 등록된 상세페이지가 지워진다(가격만 바꾸는 리프라이서 경로 포함).
            $st = $pdo->prepare("SELECT name,category,price,inventory,spec,action,detail_html,images_json,image_url,category_code FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$r) return null;
            $imgs = [];
            if (!empty($r['images_json'])) {
                $dec = json_decode((string)$r['images_json'], true);
                if (is_array($dec)) $imgs = array_values(array_filter(array_map('strval', $dec), static fn($u) => $u !== ''));
            }
            $r['images'] = $imgs;
            unset($r['images_json']);
            return $r;
        } catch (\Throwable $e) { return null; }
    }

    /** 이전 성공 job 의 channel_product_id(업데이트 vs 신규 판정용). */
    private static function priorChannelProductId(\PDO $pdo, string $tenant, string $channel, string $sku): ?string
    {
        try {
            $st = $pdo->prepare("SELECT result FROM catalog_writeback_job WHERE tenant_id=? AND channel=? AND sku=? AND status='done' ORDER BY id DESC LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $r = $st->fetchColumn();
            if ($r === false) return null;
            $d = json_decode((string)$r, true);
            $pid = $d['channel_product_id'] ?? null;
            return ($pid !== null && $pid !== '') ? (string)$pid : null;
        } catch (\Throwable $e) { return null; }
    }

    /**
     * Writeback 큐 소비 — status IN ('queued','awaiting_credentials') 작업을 채널로 push.
     *   자격증명 없으면 'awaiting_credentials' 보류(등록 시 자동 재개). 어댑터 미구현이면 'queued' 유지.
     *   반환: ['processed','done','awaiting','pending','failed'].
     */
    public static function processWritebackQueue(\PDO $pdo, ?string $tenant = null, ?string $channel = null, int $limit = 50): array
    {
        self::ensureTables();
        $where = "status IN ('queued','awaiting_credentials')";
        $params = [];
        if ($tenant !== null)  { $where .= " AND tenant_id=?"; $params[] = $tenant; }
        if ($channel !== null) { $where .= " AND channel=?";   $params[] = $channel; }
        $sum = ['processed' => 0, 'done' => 0, 'awaiting' => 0, 'pending' => 0, 'failed' => 0];
        try {
            $st = $pdo->prepare("SELECT id,tenant_id,channel,sku,operation,payload,attempt FROM catalog_writeback_job WHERE $where ORDER BY id ASC LIMIT " . (int)$limit);
            $st->execute($params);
            $jobs = $st->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return $sum; }

        $now = self::now();
        $upd = $pdo->prepare("UPDATE catalog_writeback_job SET status=?, result=?, attempt=?, updated_at=? WHERE id=?");
        foreach ($jobs as $j) {
            $sum['processed']++;
            $t = (string)$j['tenant_id']; $ch = (string)$j['channel']; $sku = (string)$j['sku'];
            $op = (string)($j['operation'] ?? 'publish'); $attempt = (int)($j['attempt'] ?? 1);
            $creds = self::loadChannelCreds($pdo, $t, $ch);
            if (!$creds) {
                $upd->execute(['awaiting_credentials', json_encode(['reason' => 'no_active_credentials'], JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                $sum['awaiting']++; continue;
            }
            $jobPayload = json_decode((string)$j['payload'], true) ?: [];
            $product = self::currentListing($pdo, $t, $ch, $sku) ?: $jobPayload;
            $product['sku'] = $sku;
            // [277차] 채널 필수 메타(고시·배송/반품·AS·원산지) 복원 — catalog_listing 에 없는 필드라 payload 가 유일 출처.
            //   이게 빠지면 네이버 신규등록이 400(productInfoProvidedNotice NotEmpty 등)으로 영구 실패한다.
            foreach ((array)($jobPayload['channel_meta'] ?? []) as $mk => $mv) {
                if (!isset($product[$mk]) || $product[$mk] === '' || $product[$mk] === null) $product[$mk] = $mv;
            }
            // [239차] 리프라이서 price_update: payload 의 새 가격을 listing 위에 overlay.
            //   리프라이서는 priceopt.sqlite(po_products)만 갱신하므로 메인DB catalog_listing 가격은 stale →
            //   payload(source=repricer) 의 새 가격을 우선 반영해야 채널에 올바른 가격이 push 된다.
            if ($op === 'price_update') {
                $pl = json_decode((string)$j['payload'], true) ?: [];
                if (isset($pl['price'])) $product['price'] = (float)$pl['price'];
            }
            // [227차] 채널 카테고리 매핑 해석 — 내 카테고리→채널 카테고리코드(쿠팡/네이버 등 필수). 어댑터가 category_code 우선 사용.
            $product['category_code'] = self::resolveChannelCategory($pdo, $t, $ch, $product);
            // [277차] ★어댑터 간 payload 키 정규화 — 전수감사에서 확정된 클래스 결함 2종을 단일 지점에서 해소한다.
            //   ①카테고리 키 불일치: resolveChannelCategory 는 'category_code' 에만 쓰는데 shopee/lazada 는 'category_id',
            //     walmart/qoo10/yahoo_jp/godomall/esm 은 'channel_category' 를 읽는다 → 사용자가 매핑을 채워도
            //     코드가 어댑터에 도달하지 않아 등록이 거부됐다(shopee/lazada 는 게이트가 항상 발화).
            //   ②상세 미전송: 18개 어댑터가 detail_html 을 쓰지 않고 'spec'(규격 한 줄)만 description 에 넣어
            //     채널에 빈 상세로 등록됐다. spec 사용처는 전부 description 계열이므로 상세HTML 로 대체한다.
            //   어댑터 21개를 개별 수정하지 않고 여기서 정규화(회귀면 최소, 효과는 전 채널).
            $product = self::normalizeAdapterPayload($product);
            $priorId = self::priorChannelProductId($pdo, $t, $ch, $sku);
            // 신규 op('price_update')은 어댑터엔 알려진 upsert('publish')로 정규화 전달(가격 포함 listing 갱신).
            $pushOp = ($op === 'price_update') ? 'publish' : $op;
            $res = self::pushToChannel($ch, $creds, $product, $pushOp, $priorId);
            if (!empty($res['ok'])) {
                $upd->execute(['done', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                // [240차 동기화] price_update 성공 시 catalog_listing.price 도 동반 갱신(메인DB 가격 stale 해소).
                //   기존엔 status='synced'만 갱신 → listings()/Writeback 그리드가 옛 가격 표시 + 이후 수동 writeback이
                //   stale 가격을 재push(채널 가격 revert)하던 사일로 갭. 승인된 새 가격을 SSOT(catalog_listing)에 반영.
                try {
                    if ($op === 'price_update' && isset($product['price'])) {
                        $pdo->prepare("UPDATE catalog_listing SET price=?, status='synced', updated_at=? WHERE tenant_id=? AND channel=? AND sku=?")
                            ->execute([(float)$product['price'], $now, $t, $ch, $sku]);
                    } else {
                        $pdo->prepare("UPDATE catalog_listing SET status='synced', updated_at=? WHERE tenant_id=? AND channel=? AND sku=?")->execute([$now, $t, $ch, $sku]);
                    }
                } catch (\Throwable $e) {}
                $sum['done']++;
            } elseif (!empty($res['pending'])) {
                $upd->execute(['queued', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                $sum['pending']++;
            } else {
                $failed = $attempt >= 3;
                $upd->execute([$failed ? 'failed' : 'queued', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt + 1, $now, $j['id']]);
                $sum[$failed ? 'failed' : 'pending']++;
            }
        }
        return $sum;
    }

    /* POST /catalog/writeback/process — 큐 수동 플러시(analyst+). body:{channel?} */
    public static function processQueue(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $channel = (isset($body['channel']) && $body['channel'] !== '') ? (string)$body['channel'] : null;
        $sum = self::processWritebackQueue($pdo, $tenant, $channel, 100);
        return self::jsonRes($res, ['ok' => true, 'summary' => $sum]);
    }

    /**
     * [277차] 어댑터 payload 키 정규화 — 채널마다 다른 키 이름 때문에 값이 도달하지 못하던 문제를 한 곳에서 해소.
     *   ★값을 지어내지 않는다. 이미 해석된 값(category_code / detail_html)을 어댑터가 읽는 이름으로 복제할 뿐이다.
     */
    private static function normalizeAdapterPayload(array $product): array
    {
        // ① 카테고리 코드 별칭 — 빈 값이면 만들지 않는다(honest-gate 가 그대로 발화해야 한다).
        $code = trim((string)($product['category_code'] ?? ''));
        if ($code !== '') {
            foreach (['category_id', 'channel_category', 'taxonomy_id'] as $alias) {
                if (!isset($product[$alias]) || $product[$alias] === '' || $product[$alias] === null) $product[$alias] = $code;
            }
        }
        // ② 상세 설명 — detail_html 이 있으면 description/spec 계열에 주입(어댑터는 이 키들만 읽는다).
        $detail = (string)($product['detail_html'] ?? '');
        if ($detail !== '') {
            $product['spec'] = $detail;          // 18개 어댑터가 description 필드에 넣는 값
            $product['description'] = $detail;   // etsy 등 'description' 키를 읽는 어댑터
        } elseif (($product['spec'] ?? '') !== '' && !isset($product['description'])) {
            $product['description'] = (string)$product['spec'];
        }
        // ③ 단일 이미지 키('image') — godomall/qoo10 이 읽는다. ★공개 URL 일 때만 채운다.
        //   base64 dataURL 을 넘기면 채널이 거부하므로, 업로드 경로가 없는 채널엔 아예 보내지 않는다(빈 값 = 정직).
        if (!isset($product['image']) || $product['image'] === '') {
            $cands = array_merge([(string)($product['image_url'] ?? '')], array_map('strval', (array)($product['images'] ?? [])));
            foreach ($cands as $u) {
                if (str_starts_with($u, 'http://') || str_starts_with($u, 'https://')) { $product['image'] = $u; break; }
            }
        }
        return $product;
    }

    /**
     * [277차] 방금 처리된 잡의 실제 결과(채널 응답)를 꺼낸다 — 동기 전송 응답에 진짜 성공/실패를 싣기 위함.
     *   result 는 pushToChannel 반환 JSON(`{ok,error,detail,channel_product_id}`).
     */
    private static function latestJobResult(\PDO $pdo, string $tenant, string $channel, string $sku): array
    {
        try {
            $st = $pdo->prepare("SELECT status, attempt, result FROM catalog_writeback_job
                                 WHERE tenant_id=? AND channel=? AND sku=? ORDER BY id DESC LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$r) return [];
            $res = json_decode((string)($r['result'] ?? ''), true);
            $err = null;
            if (is_array($res) && empty($res['ok'])) {
                $err = (string)($res['error'] ?? '');
                if (!empty($res['detail'])) $err .= ' — ' . (is_string($res['detail']) ? $res['detail'] : json_encode($res['detail'], JSON_UNESCAPED_UNICODE));
                if ($err === '') $err = null;
            }
            return ['status' => (string)$r['status'], 'attempt' => (int)$r['attempt'], 'error' => $err];
        } catch (\Throwable $e) { return []; }
    }

    /** [227차] 채널 카테고리코드 해석: ①상품 명시 category_code ②채널 매핑(channel_category_map[category]) ③빈값. */
    private static function resolveChannelCategory(\PDO $pdo, string $tenant, string $channel, array $product): string
    {
        $explicit = trim((string)($product['category_code'] ?? ''));
        if ($explicit !== '') return $explicit;
        $cat = trim((string)($product['category'] ?? ''));
        if ($cat === '') return '';
        try {
            // [228차] 별칭 정합 — 카테고리맵이 registry키(amazon_spapi)로 저장돼도 job채널(amazon)에서 찾도록.
            $aliases = self::channelAliases($channel);
            $ph = implode(',', array_fill(0, count($aliases), '?'));
            $st = $pdo->prepare("SELECT channel_code FROM channel_category_map WHERE tenant_id=? AND channel IN ($ph) AND src_category=? LIMIT 1");
            $st->execute(array_merge([$tenant], $aliases, [$cat]));
            $code = $st->fetchColumn();
            return $code !== false ? (string)$code : '';
        } catch (\Throwable $e) { return ''; }
    }

    /* GET /catalog/category-map[?channel=] — 채널 카테고리 매핑 목록. */
    public static function categoryMapList(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $ch = (string)($req->getQueryParams()['channel'] ?? '');
        try {
            if ($ch !== '') { $st = $pdo->prepare("SELECT id,channel,src_category,channel_code,channel_label,updated_at FROM channel_category_map WHERE tenant_id=? AND channel=? ORDER BY channel,src_category"); $st->execute([$tenant, $ch]); }
            else { $st = $pdo->prepare("SELECT id,channel,src_category,channel_code,channel_label,updated_at FROM channel_category_map WHERE tenant_id=? ORDER BY channel,src_category"); $st->execute([$tenant]); }
            return self::jsonRes($res, ['ok' => true, 'mappings' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
        } catch (\Throwable $e) { return self::jsonRes($res, ['ok' => true, 'mappings' => []]); }
    }

    /* POST /catalog/category-map — body:{channel,src_category,channel_code,channel_label?} upsert. */
    public static function categoryMapSave(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $b = (array)($req->getParsedBody() ?? []);
        $ch = trim((string)($b['channel'] ?? '')); $src = trim((string)($b['src_category'] ?? ''));
        $code = trim((string)($b['channel_code'] ?? '')); $label = trim((string)($b['channel_label'] ?? ''));
        if ($ch === '' || $src === '' || $code === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel·src_category·channel_code 필수'], 400);
        $now = self::now();
        $sql = self::isMysql($pdo)
            ? "INSERT INTO channel_category_map (tenant_id,channel,src_category,channel_code,channel_label,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE channel_code=VALUES(channel_code),channel_label=VALUES(channel_label),updated_at=VALUES(updated_at)"
            : "INSERT INTO channel_category_map (tenant_id,channel,src_category,channel_code,channel_label,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(tenant_id,channel,src_category) DO UPDATE SET channel_code=excluded.channel_code,channel_label=excluded.channel_label,updated_at=excluded.updated_at";
        try { $pdo->prepare($sql)->execute([$tenant, $ch, $src, $code, $label, $now, $now]); return self::jsonRes($res, ['ok' => true]); }
        catch (\Throwable $e) { return self::jsonRes($res, ['ok' => false, 'error' => 'db_error'], 500); }
    }

    /* DELETE /catalog/category-map/{id} — 매핑 삭제. */
    public static function categoryMapDelete(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req); $id = (int)($args['id'] ?? 0);
        try { $pdo->prepare("DELETE FROM channel_category_map WHERE id=? AND tenant_id=?")->execute([$id, $tenant]); } catch (\Throwable $e) {}
        return self::jsonRes($res, ['ok' => true]);
    }

    /* POST /catalog/writeback/policy — body:{channel,product} 정책 검증 */
    public static function policyValidate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $channel = (string)($body['channel'] ?? '');
        $product = (array)($body['product'] ?? []);
        $action = (string)($product['action'] ?? $body['action'] ?? 'register');
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);
        return self::jsonRes($res, self::evaluatePolicy($pdo, $tenant, $channel, $product, $action));
    }

    /* POST /catalog/writeback/category — body:{channel,product} 카테고리 추천 */
    public static function categorySuggest(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $body = (array)($req->getParsedBody() ?? []);
        $channel = (string)($body['channel'] ?? '');
        $product = (array)($body['product'] ?? []);
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);
        return self::jsonRes($res, ['ok' => true, 'channel' => $channel, 'suggestions' => self::suggestCategories($channel, $product)]);
    }

    /* POST /catalog/writeback/preview — body:{channel,product} 송출 전 검증+정규화 미리보기 */
    public static function preview(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $channel = (string)($body['channel'] ?? '');
        $product = (array)($body['product'] ?? []);
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);
        $sku = (string)($product['sku'] ?? '');
        $action = (string)($product['action'] ?? 'register');
        $policy = self::evaluatePolicy($pdo, $tenant, $channel, $product, $action);
        return self::jsonRes($res, [
            'ok' => true,
            'validation' => ['ok' => $policy['ok'], 'findings' => $policy['findings']],
            'normalized_payload' => self::normalizePayload($channel, $sku, $product),
            'category' => self::suggestCategories($channel, $product),
        ]);
    }

    /* POST /catalog/writeback/{channel}/{sku}/prepare — 송출 준비(정책+승인판정+job 기록) */
    public static function prepare(Request $req, Response $res, array $args): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $channel = (string)($args['channel'] ?? '');
        $sku = rawurldecode((string)($args['sku'] ?? ''));
        if ($channel === '' || $sku === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel/sku required'], 400);
        $body = (array)($req->getParsedBody() ?? []);
        $operation = (string)($req->getQueryParams()['operation'] ?? $body['operation'] ?? 'publish');
        $action = $operation === 'unregister' ? 'unregister' : (string)($body['action'] ?? 'register');
        // 요청 body 의 product 우선, 없으면 기존 등록 리스팅을 기반으로 payload 구성.
        $product = $body['product'] ?? [];
        if (!is_array($product) || !$product) {
            try {
                $st = $pdo->prepare("SELECT name AS title, category, price, inventory, spec FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
                $st->execute([$tenant, $channel, $sku]);
                $row = $st->fetch(\PDO::FETCH_ASSOC);
                if ($row) $product = $row;
            } catch (\Throwable $e) { /* best-effort */ }
        }
        $product = (array)$product;
        $product['sku'] = $sku;
        $policy = self::evaluatePolicy($pdo, $tenant, $channel, $product, $action);
        $payload = self::normalizePayload($channel, $sku, $product);
        self::logJob($pdo, $tenant, $channel, $sku, $operation, $policy['requires_approval'] ? 'pending_approval' : 'prepared', $payload);
        return self::jsonRes($res, [
            'ok' => $policy['ok'],
            'channel' => $channel, 'sku' => $sku, 'operation' => $operation,
            'requires_approval' => $policy['requires_approval'],
            'approval_type' => $policy['approval_type'],
            'findings' => $policy['findings'],
            'payload' => $payload,
        ]);
    }

    /* POST /catalog/approvals — body:{type,channel,sku,payload} 승인 티켓 생성(테넌트 격리) */
    public static function approvalCreate(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $type = (string)($body['type'] ?? 'writeback');
        $channel = (string)($body['channel'] ?? '');
        $sku = (string)($body['sku'] ?? '');
        $payload = $body['payload'] ?? [];
        $now = self::now();
        try {
            $pdo->prepare("INSERT INTO catalog_writeback_approval(tenant_id,type,channel,sku,payload,status,created_at,updated_at)
                           VALUES(?,?,?,?,?,?,?,?)")
                ->execute([$tenant, $type, $channel, $sku, json_encode($payload, JSON_UNESCAPED_UNICODE), 'pending', $now, $now]);
            $id = (int)$pdo->lastInsertId();
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
        return self::jsonRes($res, ['ok' => true, 'approval_id' => $id, 'status' => 'pending', 'type' => $type]);
    }

    /* GET /catalog/writeback/jobs — 테넌트 writeback 작업 이력(최근순·바 배열 반환) */
    public static function jobs(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $st = $pdo->prepare("SELECT id,channel,sku,operation,status,attempt,result,updated_at FROM catalog_writeback_job WHERE tenant_id=:t ORDER BY id DESC LIMIT 200");
        $st->execute([':t' => $tenant]);
        return self::jsonRes($res, $st->fetchAll(\PDO::FETCH_ASSOC));
    }

    /** [239차] 리프라이서 → writeback 큐 enqueue(human-in-loop). 가격변경을 'pending_approval' 로 적재 →
     *   사용자 승인(approveQueue) 시에만 'queued'→채널 push. 실 마켓 가격 자동변경 방지(광고 PAUSED 정책과 일관).
     *   ★중복 없음: 기존 catalog_writeback_job + processWritebackQueue 재사용(가격 overlay는 위 큐 소비에서 처리).
     *   동일 (tenant,channel,sku) 대기건은 갱신(cron 반복 실행 시 누적 방지). PriceOpt::repriceForTenant 공용. */
    public static function enqueueRepricePending(string $tenant, string $channel, string $sku, float $price, float $prev): void
    {
        if ($tenant === '' || $sku === '') return;
        try {
            self::ensureTables();
            $pdo = self::db(); $now = self::now();
            // [240차 동기화] 와일드카드 채널('*'/'all'/빈값) 팬아웃: 기존엔 리터럴 'all' 단일 job 으로 적재했으나
            //   channel='all' 인 자격증명/어댑터가 없어 영구 'awaiting_credentials' 정체 → 기본 규칙(channel='*')의
            //   가격이 어떤 실 채널에도 도달하지 못하던 갭. 해당 SKU 가 실제 등록된 채널(catalog_listing)로 팬아웃해
            //   채널별 job 을 적재한다(bulkPrice 의 per-channel enqueue 패턴 정합). 미등록 SKU 는 단일 'all' 보류(가시성).
            $targets = [];
            if ($channel === '' || $channel === '*' || strtolower($channel) === 'all') {
                try {
                    $q = $pdo->prepare("SELECT DISTINCT channel FROM catalog_listing WHERE tenant_id=? AND sku=? AND channel IS NOT NULL AND channel<>''");
                    $q->execute([$tenant, $sku]);
                    foreach ($q->fetchAll(\PDO::FETCH_COLUMN) as $c) { $c = (string)$c; if ($c !== '') $targets[] = $c; }
                } catch (\Throwable $e) {}
                if (!$targets) $targets = ['all']; // 등록 채널 없음 → 단일 보류건(가시성, 채널 연동 시 재적재)
            } else {
                $targets = [$channel];
            }
            foreach (array_values(array_unique($targets)) as $ch) {
                self::enqueueRepriceOne($pdo, $tenant, $ch, $sku, $price, $prev, $now);
            }
        } catch (\Throwable $e) { /* best-effort: 큐 적재 실패해도 내부가격 갱신은 유지 */ }
    }

    /** [240차] 단일 채널 pending_approval 적재(동일 대기건 갱신·중복방지). enqueueRepricePending 팬아웃 공용. */
    private static function enqueueRepriceOne(\PDO $pdo, string $tenant, string $ch, string $sku, float $price, float $prev, string $now): void
    {
        $payload = json_encode(['sku' => $sku, 'channel' => $ch, 'price' => $price, 'prev' => $prev, 'source' => 'repricer'], JSON_UNESCAPED_UNICODE);
        $ex = $pdo->prepare("SELECT id FROM catalog_writeback_job WHERE tenant_id=? AND channel=? AND sku=? AND operation='price_update' AND status='pending_approval' ORDER BY id DESC LIMIT 1");
        $ex->execute([$tenant, $ch, $sku]);
        $id = $ex->fetchColumn();
        if ($id) {
            $pdo->prepare("UPDATE catalog_writeback_job SET payload=?, updated_at=? WHERE id=?")->execute([$payload, $now, $id]);
        } else {
            $pdo->prepare("INSERT INTO catalog_writeback_job(tenant_id,channel,sku,operation,status,attempt,payload,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?,?)")
                ->execute([$tenant, $ch, $sku, 'price_update', 'pending_approval', $payload, $now, $now]);
        }
    }

    /* [239차] POST /catalog/writeback/approve — pending_approval job 승인→queued→채널 push(human-in-loop 전이).
     *   body:{ids?:[int], operation?:string}. 미지정 시 테넌트 전체 pending_approval 승인. requirePro.
     *   ★기존 writeback 승인 흐름에 누락돼 있던 'pending_approval→queued' 전이 조각을 메움(리프라이서/일괄가격 공용).
     *   승인 즉시 큐 소비: 자격증명 있으면 채널 push, 없으면 'awaiting_credentials' 보류(등록 시 자동 재개). */
    public static function approveQueue(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $body = (array)($req->getParsedBody() ?? []);
        $ids = array_values(array_filter(array_map('intval', (array)($body['ids'] ?? [])), fn($x) => $x > 0));
        $operation = (isset($body['operation']) && $body['operation'] !== '') ? (string)$body['operation'] : null;
        $now = self::now();
        $where = "tenant_id=? AND status='pending_approval'"; $params = [$tenant];
        if ($operation !== null) { $where .= " AND operation=?"; $params[] = $operation; }
        if ($ids) { $where .= " AND id IN (" . implode(',', array_fill(0, count($ids), '?')) . ")"; foreach ($ids as $x) $params[] = $x; }
        $approved = 0;
        try {
            $st = $pdo->prepare("UPDATE catalog_writeback_job SET status='queued', updated_at=? WHERE $where");
            $st->execute(array_merge([$now], $params));
            $approved = $st->rowCount();
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok' => false, 'error' => $e->getMessage()], 500);
        }
        $summary = $approved > 0
            ? self::processWritebackQueue($pdo, $tenant, null, 200)
            : ['processed' => 0, 'done' => 0, 'awaiting' => 0, 'pending' => 0, 'failed' => 0];
        return self::jsonRes($res, ['ok' => true, 'approved' => $approved, 'summary' => $summary]);
    }
}
