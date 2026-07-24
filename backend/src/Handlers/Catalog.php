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
    /** [현 차수] 전 테넌트 공용 채널 카테고리 카탈로그의 소유 테넌트.
     *  11번가처럼 카테고리 조회 API 가 없는 채널은 공식 카테고리 파일을 적재해야 하는데, 그 트리는
     *  모든 판매자에게 동일하다 → 플랫폼 운영자가 여기에 한 번 시딩하면 전 테넌트가 즉시 사용한다.
     *  ★읽기 전용 폴백이다. HTTP 임포트는 언제나 요청 테넌트 범위로만 쓴다(공용 카탈로그 오염 차단). */
    private const SHARED_TENANT = '__shared__';

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
        //   [285차] brand: 상품별 브랜드. 11번가 상품등록 **필수**(브랜드코드 미보유 시 <brand> 명 필수).
        //     종전엔 writeback job payload(channel_meta)에만 실려 카탈로그에 영속되지 않아, 수집 상품은
        //     브랜드가 영원히 비어 등록이 거부됐다 → 리스팅의 1급 컬럼으로 승격한다.
        foreach (['detail_html TEXT', 'images_json TEXT', 'image_url TEXT', 'category_code TEXT', 'brand VARCHAR(190)'] as $col) {
            try { $pdo->exec("ALTER TABLE catalog_listing ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
        // [285차] 테넌트 브랜드 목록 — 상품정보에서 **선택**해 쓰도록 관리하는 정본(자유입력 오타·표기흔들림 방지).
        //   code = 채널 브랜드코드(11번가 apiPrdAttrBrandCd 등, 선택). 없으면 name 을 그대로 전송한다.
        if (self::isMysql($pdo)) {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_brand (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo',
                name VARCHAR(190) NOT NULL,
                code VARCHAR(190),
                created_at VARCHAR(32),
                updated_at VARCHAR(32),
                UNIQUE KEY uq_cb (tenant_id, name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        } else {
            $pdo->exec("CREATE TABLE IF NOT EXISTS catalog_brand (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id TEXT NOT NULL DEFAULT 'demo',
                name TEXT NOT NULL,
                code TEXT,
                created_at TEXT,
                updated_at TEXT,
                UNIQUE(tenant_id, name)
            )");
        }
        // [현 차수] 채널 카테고리 매핑에 '기본카테고리'(base_code/base_label) 추가 — 11번가처럼 한 상품에 채널 카테고리를
        //   기본카테고리 + 표시카테고리(channel_code=dispCtgrNo) 2개로 지정하는 요구. 멱등 ALTER(이미 존재 시 무시).
        foreach (['base_code VARCHAR(120)', 'base_label VARCHAR(255)'] as $col) {
            try { $pdo->exec("ALTER TABLE channel_category_map ADD COLUMN $col"); } catch (\Throwable $e) { /* 이미 존재 */ }
        }
        // [277차] ★TEXT(64KB) 초과로 500 — 상품등록 폼은 이미지를 base64 dataURL(장당 1~2MB)로 보관하므로
        //   images_json/image_url/detail_html 이 TEXT 한계를 즉시 넘겨 "Data too long" 예외 → HTTP 500.
        //   MySQL 만 LONGTEXT 로 승격(멱등·SQLite 는 타입 길이 제한 없음).
        if (self::isMysql($pdo)) {
            foreach ([
                'catalog_listing MODIFY COLUMN detail_html LONGTEXT',
                'catalog_listing MODIFY COLUMN images_json LONGTEXT',
                'catalog_listing MODIFY COLUMN image_url LONGTEXT',
                'catalog_writeback_job MODIFY COLUMN payload LONGTEXT',
                'catalog_writeback_job MODIFY COLUMN result LONGTEXT',
            ] as $mod) {
                try { $pdo->exec("ALTER TABLE $mod"); } catch (\Throwable $e) { /* 이미 승격됨 */ }
            }
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

        // [현 차수] 공용 카탈로그 읽기 폴백.
        //   11번가 카테고리 트리는 모든 판매자에게 동일하다 → 테넌트마다 같은 파일을 올리게 하는 건 낭비다.
        //   플랫폼 운영자가 시딩한 공용 카탈로그(tenant_id=self::SHARED_TENANT)가 있으면 그것을 읽는다.
        //   ★쓰기는 테넌트 범위로만 허용한다(공용 스코프에 HTTP 쓰기 경로를 두지 않는다) —
        //     한 테넌트가 공용 카테고리를 오염시켜 다른 고객사 상품이 엉뚱한 카테고리로 등록되는 사고 방지.
        $readTenant = $tenant;
        if ($cnt === 0 && !$refresh) {
            try {
                $st = $pdo->prepare("SELECT COUNT(*) FROM channel_category_catalog WHERE tenant_id=? AND channel=?");
                $st->execute([self::SHARED_TENANT, $channel]);
                $shared = (int)$st->fetchColumn();
                if ($shared > 0) { $readTenant = self::SHARED_TENANT; $cnt = $shared; }
            } catch (\Throwable $e) { /* 공용 카탈로그 없음 */ }
        }

        if ($refresh || $cnt === 0) {
            $synced = self::syncChannelCategories($pdo, $tenant, $channel);
            // 공용 채널(11번가)은 SHARED 스코프에 적재됐으므로 읽기 대상도 SHARED 로 맞춘다.
            if ($synced > 0 && self::isSharedCatalogChannel($channel)) $readTenant = self::SHARED_TENANT;
            // [286차] refresh 경로 공용 폴백 보정 — 위 초기 폴백(239-252)은 !$refresh 조건이라 refresh=1 요청에서는 건너뛴다.
            //   일시적 업스트림 0건(11번가 카테고리 API 순간 타임아웃)일 때 이미 시딩된 공용 카탈로그(15k행)를 무시하고
            //   'category_fetch_failed' 로 답하던 것 방지 — 공용 채널이면 공용 스코프로 재폴백해 기존 목록으로 degrade.
            if ($synced === 0 && $cnt === 0 && self::isSharedCatalogChannel($channel)) {
                try {
                    $st = $pdo->prepare("SELECT COUNT(*) FROM channel_category_catalog WHERE tenant_id=? AND channel=?");
                    $st->execute([self::SHARED_TENANT, $channel]);
                    $shared = (int)$st->fetchColumn();
                    if ($shared > 0) { $readTenant = self::SHARED_TENANT; $cnt = $shared; }
                } catch (\Throwable $e) { /* 공용 카탈로그 없음 */ }
            }
            if ($synced === 0 && $cnt === 0) {
                // [현 차수 P1] 실패 원인을 구분해 정직하게 안내한다.
                //   종전엔 원인 불문 "자격증명을 확인하세요"로 답해, 자격증명이 정상인데도(11번가 등)
                //   사용자가 인증 문제로 오인했다. 실제 원인은 "그 채널의 카테고리 자동조회 미구현"이다.
                if (!self::supportsCategoryCatalog($channel)) {
                    // [현 차수] 11번가처럼 카테고리 조회 API 가 아예 없는 채널 — 이제 "막다른 길"이 아니다.
                    //   채널이 제공하는 공식 카테고리 파일을 올리면(import) 전체 목록을 검색·선택할 수 있다.
                    return self::jsonRes($res, ['ok' => false, 'error' => 'category_catalog_unsupported',
                        'manual_entry' => true,    // 프론트: 카테고리 코드 직접 입력 경로를 연다
                        'import_supported' => true, // 프론트: 카테고리 파일 업로드 경로를 연다
                        'hint' => '이 채널은 카테고리 자동 조회 API 를 제공하지 않습니다(자격증명 문제 아님). '
                                . '채널이 제공하는 카테고리 파일을 올리면 전체 목록에서 코드를 확인·선택할 수 있고, '
                                . '판매자센터의 카테고리 코드를 직접 입력해도 등록이 진행됩니다.'], 200);
                }
                // 공용 채널(11번가)은 자격증명이 필요 없다 → 조회 실패는 일시오류. 파일 업로드/직접입력으로 폴백.
                if (!self::isSharedCatalogChannel($channel) && !self::loadChannelCreds($pdo, $tenant, $channel)) {
                    return self::jsonRes($res, ['ok' => false, 'error' => 'credentials_required',
                        'hint' => '채널 자격증명이 없습니다. 연동 허브에서 먼저 등록하세요.'], 200);
                }
                return self::jsonRes($res, ['ok' => false, 'error' => 'category_fetch_failed',
                    'manual_entry' => true, 'import_supported' => self::isSharedCatalogChannel($channel),
                    'hint' => '채널 카테고리 조회에 일시 실패했습니다. 잠시 후 다시 시도하거나, 카테고리 코드를 직접 입력할 수도 있습니다.'], 200);
            }
            $cnt = $synced ?: $cnt;
        }

        // 리프(등록 가능)만 노출 — 상위 카테고리는 상품등록에 사용할 수 없다.
        $sql = "SELECT code, name, whole_name FROM channel_category_catalog
                WHERE tenant_id=? AND channel=? AND is_leaf=1";
        $bind = [$readTenant, $channel];
        if ($term !== '') { $sql .= " AND (whole_name LIKE ? OR name LIKE ? OR code=?)"; $bind[] = "%{$term}%"; $bind[] = "%{$term}%"; $bind[] = $term; }
        $sql .= " ORDER BY whole_name LIMIT 50";
        $st = $pdo->prepare($sql);
        $st->execute($bind);
        return self::jsonRes($res, ['ok' => true, 'channel' => $channel, 'total_cached' => $cnt,
            'categories' => $st->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    /**
     * [277차] GET /catalog/pending-categories[?channel=]
     *   ★자동 매칭 임계에 못 미쳐 **카테고리가 확정되지 않은 리스팅**만 모아서 반환한다.
     *   자동 적용된 상품은 여기 나오지 않는다(확인할 필요가 없다). 각 상품에 대해 추천 후보를 함께 준다.
     *   → 사용자는 이 목록만 훑어 카테고리를 고르면 되고, 후보가 없으면 검색으로 지정한다.
     */
    public static function pendingCategories(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $q = $req->getQueryParams();
        $channel = strtolower(trim((string)($q['channel'] ?? '')));

        // [285차] 브랜드 미지정도 "확정 필요"다 — 11번가는 브랜드가 없으면 카테고리를 지정해도 등록이 거부된다.
        //   종전엔 카테고리만 봤기 때문에, 카테고리를 고른 뒤에야 브랜드 오류를 만나는 왕복이 발생했다.
        $brandCh = self::BRAND_REQUIRED_CHANNELS;
        $bph     = implode(',', array_fill(0, count($brandCh), '?'));
        $where = [
            "tenant_id = ?",
            "((category_code IS NULL OR category_code = '') OR ((brand IS NULL OR brand = '') AND channel IN ($bph)))",
            "action <> 'unregister'",
        ];
        $bind = array_merge([$tenant], $brandCh);
        if ($channel !== '') { $where[] = 'channel = ?'; $bind[] = $channel; }
        try {
            $st = $pdo->prepare("SELECT channel, sku, name, category, price, inventory, status, updated_at, category_code, brand
                                 FROM catalog_listing WHERE " . implode(' AND ', $where) . " ORDER BY updated_at DESC LIMIT 100");
            $st->execute($bind);
            $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { $rows = []; }

        $items = [];
        foreach ($rows as $r) {
            $needsCat   = trim((string)($r['category_code'] ?? '')) === '';
            $needsBrand = self::channelRequiresBrand((string)$r['channel']) && trim((string)($r['brand'] ?? '')) === '';
            $items[] = $r + [
                'needs_category' => $needsCat,
                'needs_brand'    => $needsBrand,
                'suggestions'    => $needsCat ? self::rankChannelCategories($pdo, $tenant, (string)$r['channel'], $r, 5) : [],
            ];
        }
        // 브랜드 선택지도 함께 내려 준다(패널에서 별도 호출 없이 즉시 지정 가능).
        $brands = [];
        try {
            $bs = $pdo->prepare("SELECT name FROM catalog_brand WHERE tenant_id=? ORDER BY name");
            $bs->execute([$tenant]);
            $brands = $bs->fetchAll(\PDO::FETCH_COLUMN) ?: [];
        } catch (\Throwable $e) { $brands = []; }

        return self::jsonRes($res, ['ok' => true, 'count' => count($items), 'items' => $items, 'brands' => $brands]);
    }

    /**
     * [277차] POST /catalog/assign-category — body:{channel,sku,category_code[,category_label][,publish]}
     *   선택한 카테고리를 리스팅에 확정 저장하고(+매핑 학습), publish=true 면 즉시 채널 전송까지 수행한다.
     */
    public static function assignCategory(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        $channel = strtolower(trim((string)($b['channel'] ?? '')));
        $sku     = trim((string)($b['sku'] ?? ''));
        $code    = trim((string)($b['category_code'] ?? ''));
        if ($channel === '' || $sku === '' || $code === '') {
            return self::jsonRes($res, ['ok' => false, 'error' => 'channel/sku/category_code required'], 400);
        }
        try {
            $pdo->prepare("UPDATE catalog_listing SET category_code=?, updated_at=? WHERE tenant_id=? AND channel=? AND sku=?")
                ->execute([$code, self::now(), $tenant, $channel, $sku]);
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok' => false, 'error' => 'listing update failed'], 500);
        }
        // 내 카테고리 → 채널코드 학습(같은 카테고리의 다음 상품은 자동 해석)
        try {
            $st = $pdo->prepare("SELECT category FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
            $st->execute([$tenant, $channel, $sku]);
            $src = (string)$st->fetchColumn();
            if ($src !== '') self::saveCategoryMap($pdo, $tenant, $channel, $src, $code, (string)($b['category_label'] ?? ''));
        } catch (\Throwable $e) { /* best-effort */ }

        if (empty($b['publish'])) return self::jsonRes($res, ['ok' => true, 'assigned' => $code]);

        // [289차] 고액(₩5M↑) 상품은 즉시 송출 대신 승인 대기로 보류(서버측 강제 — 프리뷰 우회 차단).
        if (self::requiresHighValueApproval($pdo, $tenant, $channel, $sku, [], 'register')) {
            self::logJob($pdo, $tenant, $channel, $sku, 'publish', 'pending_approval', ['sku' => $sku]);
            return self::jsonRes($res, ['ok' => true, 'assigned' => $code, 'status' => 'pending_approval', 'requires_approval' => true]);
        }
        // 즉시 전송 — logJob 이 기존 미완료 잡을 superseded 로 마감하고 새 대기 잡 1건만 남긴다.
        //   실패로 굳은 잡(failed)도 여기서 새 잡으로 대체되므로 재시도 카운터가 초기화된다.
        $st = self::channelStatus($pdo, $tenant, $channel, 'register');
        $jobId = self::logJob($pdo, $tenant, $channel, $sku, 'publish', $st === 'saved' ? 'awaiting_credentials' : $st, ['sku' => $sku]);

        $sum = $jobId > 0 ? self::processJobById($pdo, $jobId) : ['processed' => 0];
        $jr  = $jobId > 0 ? self::jobResultById($pdo, $jobId) : [];
        $done = ($jr['status'] ?? '') === 'done';
        return self::jsonRes($res, [
            'ok' => $done, 'assigned' => $code, 'status' => $jr['status'] ?? 'queued',
            'error' => $done ? null : ($jr['error'] ?? null), 'summary' => $sum,
        ]);
    }

    // ── [285차] 브랜드 관리 ────────────────────────────────────────────────────
    //   11번가 상품등록은 브랜드가 **필수**다(브랜드코드 미보유 시 <brand> 명 필수). 종전엔 브랜드가
    //   writeback payload 에만 잠깐 실려 카탈로그에 영속되지 않았고, 수집 상품(네이버 등)은 브랜드가
    //   비어 있어 11번가 등록이 영구 거부됐다. 브랜드를 테넌트 정본 목록 + 리스팅 컬럼으로 승격한다.
    //   ★자유입력만 두면 표기 흔들림(청정원/淸淨園/CJW)이 그대로 채널에 나가므로 **선택형**을 정본으로 한다.

    /** [285차] 상품등록에 브랜드가 **필수**인 채널(단일 소스 — 어댑터 게이트와 함께 갱신할 것). */
    private const BRAND_REQUIRED_CHANNELS = ['11st', 'st11'];

    /** [285차] 이 채널은 브랜드가 필수인가(별칭 포함). */
    public static function channelRequiresBrand(string $channel): bool
    {
        foreach (self::channelAliases($channel) as $a) {
            if (in_array($a, self::BRAND_REQUIRED_CHANNELS, true)) return true;
        }
        return false;
    }

    /** [285차] 브랜드명을 테넌트 목록에 멱등 등록(빈값은 무시). 상품 저장 경로에서 자동 호출. */
    private static function ensureBrand(\PDO $pdo, string $tenant, string $name): void
    {
        $name = trim($name);
        if ($name === '') return;
        $name = mb_substr($name, 0, 190);
        try {
            $now = self::now();
            $sql = self::isMysql($pdo)
                ? "INSERT INTO catalog_brand(tenant_id,name,code,created_at,updated_at) VALUES(?,?,'',?,?)
                   ON DUPLICATE KEY UPDATE updated_at=VALUES(updated_at)"
                : "INSERT INTO catalog_brand(tenant_id,name,code,created_at,updated_at) VALUES(?,?,'',?,?)
                   ON CONFLICT(tenant_id,name) DO UPDATE SET updated_at=excluded.updated_at";
            $pdo->prepare($sql)->execute([$tenant, $name, $now, $now]);
        } catch (\Throwable $e) { /* best-effort — 브랜드 목록 등록 실패가 상품 저장을 막지 않는다 */ }
    }

    /** [285차] GET /catalog/brands — 테넌트 브랜드 목록(사용 중인 상품 수 포함). */
    public static function brands(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $items = [];
        try {
            $st = $pdo->prepare(
                "SELECT b.id, b.name, b.code,
                        (SELECT COUNT(*) FROM catalog_listing l
                          WHERE l.tenant_id = b.tenant_id AND l.brand = b.name) AS used
                   FROM catalog_brand b WHERE b.tenant_id = ? ORDER BY b.name"
            );
            $st->execute([$tenant]);
            $items = $st->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { $items = []; }
        return self::jsonRes($res, ['ok' => true, 'count' => count($items), 'items' => $items]);
    }

    /** [285차] POST /catalog/brands — 브랜드 추가/수정. body:{name[,code][,id]} */
    public static function saveBrand(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        $name = trim((string)($b['name'] ?? ''));
        $code = trim((string)($b['code'] ?? ''));
        $id   = (int)($b['id'] ?? 0);
        if ($name === '') return self::jsonRes($res, ['ok' => false, 'error' => 'brand name required'], 400);
        if (mb_strlen($name) > 190) return self::jsonRes($res, ['ok' => false, 'error' => 'brand name too long'], 400);
        $now = self::now();
        try {
            if ($id > 0) {
                // 이름 변경 시 이 브랜드를 쓰던 리스팅도 함께 갱신한다(고아 브랜드 방지).
                $old = '';
                $q = $pdo->prepare("SELECT name FROM catalog_brand WHERE id=? AND tenant_id=? LIMIT 1");
                $q->execute([$id, $tenant]);
                $old = (string)$q->fetchColumn();
                if ($old === '') return self::jsonRes($res, ['ok' => false, 'error' => 'brand not found'], 404);
                $pdo->prepare("UPDATE catalog_brand SET name=?, code=?, updated_at=? WHERE id=? AND tenant_id=?")
                    ->execute([$name, $code, $now, $id, $tenant]);
                if ($old !== $name) {
                    $pdo->prepare("UPDATE catalog_listing SET brand=?, updated_at=? WHERE tenant_id=? AND brand=?")
                        ->execute([$name, $now, $tenant, $old]);
                }
                return self::jsonRes($res, ['ok' => true, 'id' => $id, 'name' => $name]);
            }
            $sql = self::isMysql($pdo)
                ? "INSERT INTO catalog_brand(tenant_id,name,code,created_at,updated_at) VALUES(?,?,?,?,?)
                   ON DUPLICATE KEY UPDATE code=VALUES(code), updated_at=VALUES(updated_at)"
                : "INSERT INTO catalog_brand(tenant_id,name,code,created_at,updated_at) VALUES(?,?,?,?,?)
                   ON CONFLICT(tenant_id,name) DO UPDATE SET code=excluded.code, updated_at=excluded.updated_at";
            $pdo->prepare($sql)->execute([$tenant, $name, $code, $now, $now]);
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok' => false, 'error' => 'brand save failed'], 500);
        }
        return self::jsonRes($res, ['ok' => true, 'name' => $name]);
    }

    /** [285차] DELETE /catalog/brands/{id} — 사용 중인 브랜드는 삭제 거부(리스팅 브랜드가 조용히 사라지는 것 방지). */
    public static function deleteBrand(Request $req, Response $res, array $args = []): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $id = (int)($args['id'] ?? 0);
        if ($id <= 0) return self::jsonRes($res, ['ok' => false, 'error' => 'id required'], 400);
        try {
            $q = $pdo->prepare("SELECT name FROM catalog_brand WHERE id=? AND tenant_id=? LIMIT 1");
            $q->execute([$id, $tenant]);
            $name = (string)$q->fetchColumn();
            if ($name === '') return self::jsonRes($res, ['ok' => false, 'error' => 'brand not found'], 404);

            $u = $pdo->prepare("SELECT COUNT(*) FROM catalog_listing WHERE tenant_id=? AND brand=?");
            $u->execute([$tenant, $name]);
            $used = (int)$u->fetchColumn();
            if ($used > 0) {
                return self::jsonRes($res, ['ok' => false,
                    'error' => "이 브랜드를 사용 중인 상품이 {$used}건 있습니다 — 먼저 해당 상품의 브랜드를 변경하세요",
                    'used' => $used], 409);
            }
            $pdo->prepare("DELETE FROM catalog_brand WHERE id=? AND tenant_id=?")->execute([$id, $tenant]);
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok' => false, 'error' => 'brand delete failed'], 500);
        }
        return self::jsonRes($res, ['ok' => true, 'deleted' => $id]);
    }

    /**
     * [285차] POST /catalog/assign-brand — 상품에 브랜드 지정. body:{channel,sku|skus[],brand[,publish]}
     *   브랜드는 테넌트 브랜드 목록에 있는 값만 허용한다(오타·표기흔들림이 실 리스팅에 나가는 것 차단).
     *   publish=true 면 즉시 채널 전송까지 수행(assignCategory 와 동일 흐름).
     */
    public static function assignBrand(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        $channel = strtolower(trim((string)($b['channel'] ?? '')));
        $brand   = trim((string)($b['brand'] ?? ''));
        $skus    = [];
        if (!empty($b['skus']) && is_array($b['skus'])) {
            foreach ($b['skus'] as $s) { $s = trim((string)$s); if ($s !== '') $skus[] = $s; }
        } elseif (trim((string)($b['sku'] ?? '')) !== '') {
            $skus[] = trim((string)$b['sku']);
        }
        // [285차] channel 생략 = 그 SKU 의 **전 채널 리스팅**에 적용(카탈로그 목록에서 상품 단위로 지정하는 경로).
        //   확정 패널은 채널별 리스팅을 다루므로 channel 을 명시한다.
        if ($brand === '' || !$skus) {
            return self::jsonRes($res, ['ok' => false, 'error' => 'sku(s)/brand required'], 400);
        }
        // ★정본 목록 검증 — 등록되지 않은 브랜드는 거부(자유입력 우회 차단).
        try {
            $q = $pdo->prepare("SELECT COUNT(*) FROM catalog_brand WHERE tenant_id=? AND name=?");
            $q->execute([$tenant, $brand]);
            if ((int)$q->fetchColumn() === 0) {
                return self::jsonRes($res, ['ok' => false,
                    'error' => '등록되지 않은 브랜드입니다 — 브랜드 관리에서 먼저 추가하세요'], 400);
            }
        } catch (\Throwable $e) { /* 조회 실패 시 아래 UPDATE 가 어차피 실패한다 */ }

        $now = self::now();
        $updated = 0;
        try {
            if ($channel !== '') {
                $up = $pdo->prepare("UPDATE catalog_listing SET brand=?, updated_at=? WHERE tenant_id=? AND channel=? AND sku=?");
                foreach ($skus as $sku) { $up->execute([$brand, $now, $tenant, $channel, $sku]); $updated += $up->rowCount(); }
            } else {
                $up = $pdo->prepare("UPDATE catalog_listing SET brand=?, updated_at=? WHERE tenant_id=? AND sku=?");
                foreach ($skus as $sku) { $up->execute([$brand, $now, $tenant, $sku]); $updated += $up->rowCount(); }
            }
        } catch (\Throwable $e) {
            return self::jsonRes($res, ['ok' => false, 'error' => 'listing update failed'], 500);
        }
        // 채널 미지정(상품 단위 지정)은 전송하지 않는다 — 전송은 채널이 특정된 경로에서만.
        if (empty($b['publish']) || $channel === '') {
            return self::jsonRes($res, ['ok' => true, 'brand' => $brand, 'updated' => $updated]);
        }
        // 즉시 전송 — assignCategory 와 동일(logJob 이 기존 미완료 잡을 superseded 로 마감).
        $results = [];
        foreach ($skus as $sku) {
            // [289차] 고액(₩5M↑) 상품은 승인 대기로 보류(서버측 강제 — assignCategory 와 동일).
            if (self::requiresHighValueApproval($pdo, $tenant, $channel, $sku, [], 'register')) {
                self::logJob($pdo, $tenant, $channel, $sku, 'publish', 'pending_approval', ['sku' => $sku]);
                $results[] = ['sku' => $sku, 'status' => 'pending_approval', 'requires_approval' => true, 'error' => null];
                continue;
            }
            $st    = self::channelStatus($pdo, $tenant, $channel, 'register');
            $jobId = self::logJob($pdo, $tenant, $channel, $sku, 'publish', $st === 'saved' ? 'awaiting_credentials' : $st, ['sku' => $sku]);
            if ($jobId > 0) self::processJobById($pdo, $jobId);
            $jr = $jobId > 0 ? self::jobResultById($pdo, $jobId) : [];
            $results[] = ['sku' => $sku, 'status' => $jr['status'] ?? 'queued', 'error' => $jr['error'] ?? null];
        }
        $allDone = $results && !array_filter($results, static fn($r) => ($r['status'] ?? '') !== 'done');
        return self::jsonRes($res, ['ok' => $allDone, 'brand' => $brand, 'updated' => $updated, 'results' => $results]);
    }

    /** [286차] GET /catalog/st11-notice-types — 11번가 상품정보제공고시 유형 정본(40종·유형코드+항목). 고시 편집 UI 소비. */
    public static function st11NoticeTypes(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        $f = __DIR__ . '/../../data/st11_notice_types.json';
        $types = [];
        try {
            if (is_file($f)) { $d = json_decode((string)file_get_contents($f), true); if (is_array($d)) $types = $d; }
        } catch (\Throwable $e) { /* 파일 없음 — 빈 목록 */ }
        return self::jsonRes($res, ['ok' => true, 'types' => $types]);
    }

    /** [277차] 채널에서 카테고리 카탈로그를 받아 캐시에 upsert. 반환=저장 건수(실패 0). */
    /**
     * [현 차수] 카테고리 자동조회(카탈로그 수집) 실어댑터를 보유한 채널인가.
     *   syncChannelCategories 의 분기와 단일 소스로 유지한다 — 미지원 채널을 "자격증명 오류"로
     *   오안내하던 결함(11번가 등)의 재발 방지. 신규 어댑터 추가 시 두 곳을 함께 갱신.
     */
    public static function supportsCategoryCatalog(string $channel): bool
    {
        foreach (self::channelAliases($channel) as $a) {
            if ($a === 'naver' || $a === 'naver_smartstore') return true;
            if ($a === '11st' || $a === 'st11') return true; // [현 차수] 11번가 공통 API(인증키 불필요) 자동조회
        }
        return false;
    }

    /** [현 차수] 카탈로그가 전 테넌트 공용(인증키 불필요·모든 판매자 동일 트리)인 채널인가.
     *  11번가는 공통 API 라 계정별로 다르지 않다 → 공용 스코프에 1회 적재해 전 테넌트가 공유한다. */
    public static function isSharedCatalogChannel(string $channel): bool
    {
        foreach (self::channelAliases($channel) as $a) {
            if ($a === '11st' || $a === 'st11') return true;
        }
        return false;
    }

    private static function syncChannelCategories(\PDO $pdo, string $tenant, string $channel): int
    {
        $rows = [];
        $shared = self::isSharedCatalogChannel($channel);
        foreach (self::channelAliases($channel) as $a) {
            if ($a === 'naver' || $a === 'naver_smartstore') {
                // 네이버는 계정별 카테고리(스마트스토어) → 자격증명 필요·테넌트 스코프 유지.
                $creds = self::loadChannelCreds($pdo, $tenant, $channel);
                if (!$creds) return 0;
                $rows = ChannelSync::naverCategoryCatalog($creds); break;
            }
            if ($a === '11st' || $a === 'st11') {
                // 11번가 공통 API — 인증키 불필요. 공용 트리라 자격증명 없이 조회 가능.
                $rows = ChannelSync::elevenStCategoryCatalog(); break;
            }
        }
        if (!$rows) return 0;   // 미지원 채널은 정직하게 0(가짜 카테고리 생성 금지)
        // 공용 채널(11번가)은 SHARED 스코프에 적재해 전 테넌트가 공유한다.
        $writeTenant = $shared ? self::SHARED_TENANT : $tenant;
        $tenant = $writeTenant;
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
        // [285차] brand 도 동일 보존 규칙 — 빈값이 기존 브랜드를 지우지 않는다(리프라이서 가격만 push 경로 방어).
        if (self::isMysql($pdo)) {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at,detail_html,images_json,image_url,category_code,brand)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2,:dh,:ij,:iu,:cc,:br)
                    ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),price=VALUES(price),
                      inventory=VALUES(inventory),spec=VALUES(spec),action=VALUES(action),status=VALUES(status),updated_at=VALUES(updated_at),
                      detail_html=COALESCE(NULLIF(VALUES(detail_html),''),detail_html),
                      images_json=COALESCE(NULLIF(VALUES(images_json),''),images_json),
                      image_url=COALESCE(NULLIF(VALUES(image_url),''),image_url),
                      category_code=COALESCE(NULLIF(VALUES(category_code),''),category_code),
                      brand=COALESCE(NULLIF(VALUES(brand),''),brand)";
        } else {
            $sql = "INSERT INTO catalog_listing (tenant_id,channel,sku,name,category,price,inventory,spec,action,status,created_at,updated_at,detail_html,images_json,image_url,category_code,brand)
                    VALUES (:t,:c,:s,:n,:cat,:p,:inv,:spec,:act,:st,:now,:now2,:dh,:ij,:iu,:cc,:br)
                    ON CONFLICT(tenant_id,channel,sku) DO UPDATE SET name=excluded.name,category=excluded.category,
                      price=excluded.price,inventory=excluded.inventory,spec=excluded.spec,action=excluded.action,
                      status=excluded.status,updated_at=excluded.updated_at,
                      detail_html=COALESCE(NULLIF(excluded.detail_html,''),catalog_listing.detail_html),
                      images_json=COALESCE(NULLIF(excluded.images_json,''),catalog_listing.images_json),
                      image_url=COALESCE(NULLIF(excluded.image_url,''),catalog_listing.image_url),
                      category_code=COALESCE(NULLIF(excluded.category_code,''),catalog_listing.category_code),
                      brand=COALESCE(NULLIF(excluded.brand,''),catalog_listing.brand)";
        }
        $oldPrice = self::currentPrice($pdo, $tenant, $channel, $sku); // 변경 전 등록가(없으면 null)
        $newPrice = (float)($f['price'] ?? 0);
        // [277차] MySQL max_allowed_packet(기본 1MB) 방어 — 이미지는 writeback 진입 시 URL 로 치환되지만,
        //   dataURL 이 남아 있거나 상세HTML 이 과대하면 쿼리 자체가 실패해 500 이 된다. 저장 대상만 안전하게 제한한다.
        //   (전송에는 원본이 이미 쓰였으므로 채널 등록 결과에는 영향 없다.)
        $imgs = array_values(array_filter(array_map('strval', (array)($f['images'] ?? [])),
            static fn($u) => $u !== '' && !str_starts_with($u, 'data:')));
        $st = $pdo->prepare($sql);
        $st->execute([
            ':t' => $tenant, ':c' => $channel, ':s' => $sku,
            ':n' => (string)($f['name'] ?? ''), ':cat' => (string)($f['category'] ?? ''),
            ':p' => $newPrice, ':inv' => (int)($f['inventory'] ?? 0),
            ':spec' => (string)($f['spec'] ?? ''), ':act' => (string)($f['action'] ?? 'register'),
            ':st' => $status, ':now' => $now, ':now2' => $now,
            ':dh' => mb_substr((string)($f['detail_html'] ?? ''), 0, 400000),   // 상세HTML 저장 상한(전송본은 원본)
            ':ij' => $imgs ? json_encode($imgs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '',
            ':iu' => str_starts_with((string)($f['image_url'] ?? ''), 'data:') ? '' : (string)($f['image_url'] ?? ''),
            ':cc' => (string)($f['category_code'] ?? ''),
            ':br' => mb_substr(trim((string)($f['brand'] ?? '')), 0, 190),   // [285차] 브랜드(11번가 필수)
        ]);
        // [285차] 상품에 새 브랜드가 입력되면 테넌트 브랜드 목록에 자동 등록 — 목록이 항상 실제 사용값의 정본이 된다
        //   (상품 폼에서 직접 타이핑한 브랜드도 다음 상품에서 그대로 선택 가능).
        self::ensureBrand($pdo, $tenant, (string)($f['brand'] ?? ''));
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
        // [277차] ★이미지 선업로드 — 상품등록 폼은 이미지를 base64 dataURL(장당 1~2MB)로 보관한다.
        //   그대로 catalog_listing 에 저장하면 MySQL max_allowed_packet(1MB)·TEXT 한계를 넘겨 HTTP 500 이 난다
        //   (사용자 신고: "채널 등록 최종 단계에서 500"). 저장 **전에** 채널에 업로드해 공개 URL 로 치환하면
        //   DB 에는 수백 바이트만 남고, 큐 재시도·수정(PUT)에서도 같은 URL 을 재사용한다.
        $imgNote = null;
        $rawImgs = array_values(array_filter(array_map('strval', (array)($body['images'] ?? [])), static fn($u) => $u !== ''));
        if (!$rawImgs && (string)($body['image_url'] ?? '') !== '') $rawImgs = [(string)$body['image_url']];
        if ($rawImgs && !in_array($action, ['unregister', 'disconnect'], true)) {
            // [현 차수] 자격증명이 없어도 이미지는 호스팅한다 — 종전엔 $creds 가 비면 dataURL 을 통째로 버렸다.
            //   MediaHost 공개 URL 발급은 채널 자격증명이 필요 없으므로, 자격증명 등록 전에 저장해 둔 상품도
            //   나중에 큐가 소비될 때 이미지를 그대로 실어 보낸다(awaiting_credentials 경로에서 이미지 유실 방지).
            $creds = self::loadChannelCreds($pdo, $tenant, $channel) ?: [];
            $up = ChannelSync::uploadImagesForChannel($channel, $creds, $rawImgs);
            $body['images']    = $up['urls'];
            $body['image_url'] = $up['urls'][0] ?? '';
            if (!empty($up['dropped'])) {
                $imgNote = "이미지 {$up['dropped']}장을 등록하지 못했습니다(파일이 유효한 이미지가 아니거나 8MB 를 초과했습니다).";
            }
        }

        // [282차 D-P1 초과판매 차단] 채널 전송 재고는 등록폼 정적값(po_products.initial_stock)이 아니라
        //   실물 재고(wms_stock.on_hand SSOT)여야 한다. 종전엔 프론트가 initial_stock 을 그대로 실어보내
        //   판매 차감(reflectChannelSale)이 wms_stock 만 줄인 뒤 재동기화하면 채널 가용재고가 실물보다 커져
        //   초과판매가 발생했다. 해당 SKU 가 WMS 원장에 존재하면 전 창고 on_hand 합계로 덮어쓴다(미존재=WMS
        //   미경유 상품이므로 제공값 유지). register/update 만 대상(unregister/disconnect 는 재고 무관).
        if (!in_array($action, ['unregister', 'disconnect'], true)) {
            try {
                $ws = $pdo->prepare("SELECT COALESCE(SUM(on_hand),0) AS oh, COUNT(*) AS n FROM wms_stock WHERE tenant_id=? AND sku=?");
                $ws->execute([$tenant, $sku]);
                $wr = $ws->fetch(\PDO::FETCH_ASSOC) ?: [];
                // [283차 GAP-1] 채널 안전버퍼(유보재고) 반영 — 자동 델타 푸시(Wms::enqueueChannelStockSync)와
                //   **동일한 SSOT 계산식**(Wms::channelAvailable)을 쓴다. 두 경로가 서로 다른 재고를 보내면 채널
                //   가용재고가 왕복 진동한다. 정책 미설정 시 버퍼 0 → 종전 (int)round(oh) 와 동일(무회귀).
                if ((int)($wr['n'] ?? 0) > 0) { $body['inventory'] = Wms::channelAvailable($tenant, $channel, (float)($wr['oh'] ?? 0)); }
            } catch (\Throwable $e) { /* wms_stock 미존재 환경 = 제공값 유지(회귀0) */ }
        }

        // 기존 리스팅과 병합(누락 필드는 기존값 보존 → execute 시 부분 payload 로 인한 데이터 손실 방지).
        $f = self::mergeWithExisting($pdo, $tenant, $channel, $sku, $body, $action);
        $status = self::channelStatus($pdo, $tenant, $channel, $action);
        self::upsert($pdo, $tenant, $channel, $sku, $f, $status);
        // [277차] ★큐 잡을 'saved' 로 기록하면 processWritebackQueue 가 영원히 소비하지 않는다
        //   (소비 조건 = status IN ('queued','awaiting_credentials')). 자격증명이 없어 대기하는 상태의 정본은
        //   'awaiting_credentials' 이며, ChannelCreds::upsert 가 자격증명 등록 즉시 큐를 플러시한다.
        //   catalog_listing.status 는 'saved'(리스팅 저장됨) 그대로 두고, 잡 상태만 정합화한다.
        // [289차] high_value(₩5M↑) 승인정책을 서버측에서 강제 — 승인 필요 시 즉시 송출 대신
        //   'pending_approval' 로 적재하고 여기서 반환(기존 approveQueue 인간 승인→queued→채널 push 재사용).
        //   CatalogSync 화면이 프리뷰(writebackPrepare) 없이 이 경로로 직접 publish 해 승인 게이트를 우회하던 갭 차단.
        $needsApproval = self::requiresHighValueApproval($pdo, $tenant, $channel, $sku, $f, $action);
        $jobStatus = $needsApproval ? 'pending_approval' : (($status === 'saved') ? 'awaiting_credentials' : $status);
        $jobId = self::logJob($pdo, $tenant, $channel, $sku, (string)($body['operation'] ?? 'publish'), $jobStatus, $f);
        Db::audit($pdo, $tenant, 'catalog.writeback', ['channel'=>$channel, 'sku'=>$sku, 'action'=>$action, 'status'=>$needsApproval ? 'pending_approval' : $status]); // 감사: 상품 writeback
        if ($needsApproval) {
            return self::jsonRes($res, ['ok' => true, 'status' => 'pending_approval', 'requires_approval' => true,
                'channel' => $channel, 'sku' => $sku,
                'hint' => '고액(₩5M↑) 상품은 승인 후 채널에 반영됩니다 — Writeback 콘솔에서 승인하세요.']);
        }

        // [277차] ★"동기화 성공"인데 채널에 등록되지 않는 문제의 근본 — 종전엔 큐에 넣고 'queued' 를 반환했고
        //   프론트가 이를 성공으로 표기했다. 실제 채널 push 는 10분 주기 크론이 나중에 시도하며, 거기서 실패해도
        //   사용자는 영원히 알 수 없었다(3회 후 조용히 failed). 이제 queued 면 그 자리에서 1건을 실제로 소비해
        //   **채널의 진짜 응답**을 반환한다. 실패 사유(예: leafCategoryId 필요)가 즉시 UI 에 뜬다.
        //   sync=false 로 명시하면 종전처럼 큐에만 넣는다(대량 전송용).
        $wantSync = !array_key_exists('sync', $body) || !empty($body['sync']);
        if ($wantSync && $status === 'queued' && $jobId > 0) {
            $sum = self::processJobById($pdo, $jobId);
            $jr = self::jobResultById($pdo, $jobId);
            $jobDone = ($jr['status'] ?? '') === 'done';
            $err = $jobDone ? null : ($jr['error'] ?? null);
            // [277차] 카테고리 때문에 실패했다면 후보를 함께 준다 — 사용자가 5,011개 리프 중 하나를
            //   손으로 찾는 것은 불가능하다. 자동매칭 상위 후보를 제시하고, 선택 시 category_code 로 재전송한다.
            $suggestions = [];
            if ($err !== null && preg_match('/leafCategoryId|카테고리|displayCategoryCode|category/iu', (string)$err)) {
                $suggestions = self::rankChannelCategories($pdo, $tenant, $channel, $f, 5);
            }
            // [현 차수] 경고는 두 군데서 난다: ①저장 시점 이미지 호스팅 실패($imgNote) ②채널 전송 시 어댑터 경고
            //   (이미지 규격 미확정 채널 · Etsy 부분 업로드). 둘 다 보여야 조용한 누락이 없다.
            $warnings = array_values(array_filter([$imgNote, $jr['warning'] ?? null]));
            return self::jsonRes($res, [
                'ok'      => $jobDone,
                'status'  => $jr['status'] ?? $status,   // done | failed | queued(재시도 대기) | awaiting_credentials
                'channel' => $channel, 'sku' => $sku,
                'error'   => $err,
                'warning' => $warnings ? implode(' ', $warnings) : null,
                'missing' => $jr['missing'] ?? null,      // 계약검사 누락 항목 — 한 번에 전부
                'images_uploaded' => $jr['images_uploaded'] ?? null,
                'category_suggestions' => $suggestions,  // [{code,label,score}]
                'attempt' => $jr['attempt'] ?? null,
                'summary' => $sum,
            ]);
        }
        // [286차] ★거짓 성공 차단 — 여기 도달 = (a) sync=false(대량 큐적재·정상) 또는 (b) sync 인데 status!='queued'
        //   (saved/awaiting_credentials 등 = **채널로 전송 안 됨**). 종전엔 무조건 ok:true 라 미연결 채널 "등록완료"로 표기됐다.
        if (!$wantSync) {
            return self::jsonRes($res, ['ok' => true, 'status' => $status, 'channel' => $channel, 'sku' => $sku]); // 대량 큐 적재(의도적 지연 전송)
        }
        $hint = in_array($status, ['saved', 'awaiting_credentials'], true)
            ? '채널 자격증명을 먼저 연결하세요 — 저장만 되고 채널로 전송되지 않았습니다.'
            : ('전송 대기 상태(' . $status . ') — 채널로 전송되지 않았습니다.');
        return self::jsonRes($res, ['ok' => false, 'status' => $status, 'channel' => $channel, 'sku' => $sku, 'error' => $hint, 'hint' => $hint]);
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
        $rejected = []; // [283차 R2 P0-3] 0원/음수로 거부된 항목(사용자에게 그대로 돌려준다 — 조용한 무시 금지).
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
                // [283차 R2 P0-3] ★0원 가드 — 일괄 가격 수정은 price<=0 검사가 **전무**했다. 0 이 들어오면
                //   catalog_listing.price 가 0 으로 영속되고(복구 불가) 그 값이 그대로 채널로 push 된다.
                if ($newP <= 0) { $rejected[] = ['channel' => $ch, 'sku' => $sk, 'price' => $newP, 'reason' => '판매가는 0보다 커야 합니다']; continue; }
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
        //   [277차] ★채널에 아직 등록되지 않은 상품은 price 잡을 만들지 않는다. 만들면 어댑터가 신규등록으로
        //   시도해 'leafCategoryId 필요' 같은 엉뚱한 오류를 남기고, 등록 잡과 뒤섞여 사용자를 혼란시킨다.
        //   (실측: 일괄등록 직후 price 잡이 publish 잡을 덮어써 화면에 사유 없는 queued 가 떴다.)
        $enqueued = 0; $skippedUnlisted = 0;
        foreach ($changed as $c) {
            if (self::channelStatus($pdo, $tenant, $c['channel'], 'register') !== 'queued') continue;
            if (self::priorChannelProductId($pdo, $tenant, (string)$c['channel'], (string)$c['sku']) === null) { $skippedUnlisted++; continue; }
            self::logJob($pdo, $tenant, $c['channel'], $c['sku'], 'price', 'queued', ['sku' => $c['sku'], 'price' => $c['price']]);
            $enqueued++;
        }
        $pushed = null;
        if ($enqueued > 0) {
            try { $pushed = self::processWritebackQueue($pdo, $tenant, null, 200); }
            catch (\Throwable $e) { /* 큐는 남아 cron/재호출로 재개 */ }
        }
        Db::audit($pdo, $tenant, 'catalog.bulk_price', ['updated'=>$updated, 'enqueued'=>$enqueued, 'changed'=>count($changed), 'rejected'=>count($rejected)]); // 감사: 일괄 가격변경
        return self::jsonRes($res, [
            'ok' => true, 'updated' => $updated, 'enqueued' => $enqueued, 'pushed' => $pushed,
            'rejected' => $rejected,   // [283차 R2 P0-3] 0원 이하로 거부된 항목
            'error' => $rejected ? (count($rejected) . '개 항목의 판매가가 0원 이하여서 적용하지 않았습니다(기존 가격 유지).') : null,
        ]);
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

    /**
     * [277차] 채널 카테고리 자동 적용 임계 점수.
     *   말단 카테고리명 정확일치(3.0) 또는 부분일치(1.8)+경로일치(1.0) 이상이어야 자동 적용한다.
     *   실측: 3.0 미만에서는 '수분크림'→화장품세트, '비타민C'→비타민A 같은 오매칭이 나온다.
     *   미달 시 자동 적용하지 않고 후보를 사용자에게 제시한다(잘못된 카테고리 등록 = 채널 페널티).
     */
    private const CATEGORY_AUTO_THRESHOLD = 3.0;

    /** 기존 catalog_listing 행과 병합(body 우선, 누락 필드는 기존값 보존). title→name 폴백. */
    private static function mergeWithExisting(\PDO $pdo, string $tenant, string $channel, string $sku, array $body, string $action): array
    {
        $existing = [];
        try {
            $st = $pdo->prepare("SELECT name,category,price,inventory,spec,detail_html,images_json,image_url,category_code,brand FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
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
        // [283차 R2 P0-3] ★0원 영속 파괴 차단 — 종전엔 body 의 price=0(빈 폼·부분 payload·리프라이서 버그)이
        //   기존 정상가를 그대로 덮어썼다(catalog_listing.price=0 → 이후 모든 writeback 이 채널에 0원을 push).
        //   채널 판매가 0 원은 대부분의 어댑터가 무방비로 통과시키고(11번가/쿠팡/ESM), 원래 가격은 복구 불가다.
        //   유효한 양수만 반영하고, 그 외에는 **기존값을 보존**한다(무회귀 — 정상 가격 변경은 그대로 동작).
        //   ※재고(inventory)는 0 이 정당한 값(품절)이므로 이 가드를 걸지 않는다.
        $priceIn = array_key_exists('price', $body) ? $body['price'] : null;
        $priceOk = ($priceIn !== null && $priceIn !== '' && is_numeric($priceIn) && (float)$priceIn > 0);
        return [
            'name'      => ($name !== null && $name !== '') ? (string)$name : (string)($existing['name'] ?? ''),
            'category'  => array_key_exists('category', $body) ? (string)$body['category'] : (string)($existing['category'] ?? ''),
            'price'     => $priceOk ? $priceIn : ($existing['price'] ?? 0),
            'inventory' => array_key_exists('inventory', $body) ? $body['inventory'] : ($existing['inventory'] ?? 0),
            'spec'      => array_key_exists('spec', $body) ? (string)$body['spec'] : (string)($existing['spec'] ?? ''),
            'detail_html' => array_key_exists('detail_html', $body) ? (string)$body['detail_html'] : (string)($existing['detail_html'] ?? ''),
            'image_url' => array_key_exists('image_url', $body) ? (string)$body['image_url'] : (string)($existing['image_url'] ?? ''),
            'images'    => $images,
            // [277차] 상품별 채널 카테고리 코드(네이버 leafCategoryId 등) — 신규등록 필수값.
            'category_code' => array_key_exists('category_code', $body) ? (string)$body['category_code'] : (string)($existing['category_code'] ?? ''),
            // [285차] 브랜드 — 11번가 상품등록 필수. 리스팅 컬럼으로 영속(빈값이면 기존값 보존).
            'brand' => array_key_exists('brand', $body) ? (string)$body['brand'] : (string)($existing['brand'] ?? ''),
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

    /**
     * [289차 실결함] high_value(₩5M↑) 승인정책을 **서버측**에서 판정(방어심층).
     *   기존엔 실행 경로(assignCategory/assignBrand/writeback)가 evaluatePolicy 를 우회해 승인은 프리뷰
     *   (writebackPrepare)에서만 물었고, CatalogSync 화면은 프리뷰 없이 직접 publish 해 ₩5M 상품이 승인 없이
     *   즉시 채널 송출됐다(클라이언트 게이트 Writeback.jsx 는 우회 가능 — 승인 강제는 서버가 SSOT).
     *   true 면 호출측은 즉시 송출(processJobById) 대신 잡을 'pending_approval' 로 적재(기존 approveQueue 소비).
     *   ★정확히 approval_type='high_value' 만 게이트한다 — unregister 승인은 즉시 채널해제 동작을 바꾸므로 범위 밖(별건).
     *   $product 에 price 가 없으면 catalog_listing 에서 보강한다(미조회 시 price=0 → 통과 = 무회귀).
     */
    private static function requiresHighValueApproval(\PDO $pdo, string $tenant, string $channel, string $sku, array $product, string $action): bool
    {
        if (!isset($product['price']) || (float)($product['price'] ?? 0) <= 0) {
            try {
                $st = $pdo->prepare("SELECT name AS title, category, price FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
                $st->execute([$tenant, $channel, $sku]);
                $row = $st->fetch(\PDO::FETCH_ASSOC);
                if ($row) $product = $row + $product;
            } catch (\Throwable $e) { /* best-effort — 미조회 시 정책이 price=0 으로 통과(무회귀) */ }
        }
        return (self::evaluatePolicy($pdo, $tenant, $channel, $product, $action)['approval_type'] ?? null) === 'high_value';
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
    /** @return int 생성된 잡 id(실패 시 0) — 호출부가 **자기 잡**의 결과만 읽을 수 있게 한다. */
    private static function logJob(\PDO $pdo, string $tenant, string $channel, string $sku, string $operation, string $status, array $payload): int
    {
        try {
            $now = self::now();
            // [277차] ★중복 대기 잡 제거 — 같은 (tenant,channel,sku,operation)에 미완료 잡이 쌓이면
            //   소비는 ORDER BY id ASC(가장 오래된 것), 결과 조회는 ORDER BY id DESC(가장 새 것)라
            //   서로 다른 잡을 보게 된다(카테고리를 고쳐도 옛 잡의 오류가 계속 표시됐다).
            //   ★operation 을 가려서 마감한다 — 등록(publish) 직후 가격(price) 잡이 생성되며
            //   **아직 처리되지 않은 등록 잡을 지워버리던** 회귀를 막는다(실측: #15 publish 가 #16 price 에 의해 superseded).
            $pdo->prepare("UPDATE catalog_writeback_job SET status='superseded', updated_at=?
                            WHERE tenant_id=? AND channel=? AND sku=? AND operation=? AND status IN ('queued','awaiting_credentials','pending_approval')")
                ->execute([$now, $tenant, $channel, $sku, $operation]);
            // [277차] 대용량 필드(base64 dataURL 이미지·상세HTML)는 catalog_listing 에 이미 저장되고
            //   큐 소비 시 currentListing 으로 복원된다. payload 에 중복 저장하면 잡 테이블이 수 MB 씩 비대해지고
            //   TEXT 한계를 넘겨 기록이 조용히 실패한다(logJob 은 best-effort catch). 참조용 요약만 남긴다.
            $payload['images'] = count((array)($payload['images'] ?? []));
            $payload['detail_html'] = strlen((string)($payload['detail_html'] ?? '')) . 'B';
            $payload['image_url'] = mb_substr((string)($payload['image_url'] ?? ''), 0, 120);
            $pdo->prepare("INSERT INTO catalog_writeback_job(tenant_id,channel,sku,operation,status,attempt,payload,created_at,updated_at)
                           VALUES(?,?,?,?,?,1,?,?,?)")
                ->execute([$tenant, $channel, $sku, $operation, $status, json_encode($payload, JSON_UNESCAPED_UNICODE), $now, $now]);
            return (int)$pdo->lastInsertId();
        } catch (\Throwable $e) { return 0; /* best-effort */ }
    }

    /**
     * [277차] 특정 잡 1건만 처리한다(동기 전송 전용).
     *   processWritebackQueue 는 tenant/channel 범위에서 가장 오래된 잡을 집으므로, 방금 만든 잡이 아닌
     *   **다른 상품의 잡**을 처리할 수 있다. 그러면 응답이 엉뚱한 상품의 결과를 말하게 된다.
     *   동기 경로는 항상 자기가 만든 잡만 처리하고 그 결과만 읽는다.
     */
    private static function processJobById(\PDO $pdo, int $jobId): array
    {
        $st = $pdo->prepare("SELECT tenant_id, channel, sku FROM catalog_writeback_job WHERE id=? AND status IN ('queued','awaiting_credentials')");
        $st->execute([$jobId]);
        $j = $st->fetch(\PDO::FETCH_ASSOC);
        if (!$j) return ['processed' => 0];
        return self::processWritebackQueue($pdo, (string)$j['tenant_id'], (string)$j['channel'], 1, $jobId);
    }

    /** [277차] 잡 id 로 결과를 읽는다 — 동기 전송이 **자기 잡**의 결과만 보게 한다. */
    private static function jobResultById(\PDO $pdo, int $jobId): array
    {
        try {
            $st = $pdo->prepare("SELECT status, attempt, result FROM catalog_writeback_job WHERE id=?");
            $st->execute([$jobId]);
            $r = $st->fetch(\PDO::FETCH_ASSOC);
            if (!$r) return [];
            $res = json_decode((string)($r['result'] ?? ''), true);
            $err = null;
            if (is_array($res) && empty($res['ok'])) {
                $err = (string)($res['error'] ?? '');
                if (!empty($res['detail'])) $err .= ' — ' . (is_string($res['detail']) ? $res['detail'] : json_encode($res['detail'], JSON_UNESCAPED_UNICODE));
                if ($err === '') $err = null;
            }
            // [현 차수] 어댑터 경고(이미지 미첨부·부분 업로드)와 계약검사 누락목록을 끌어올린다.
            //   종전엔 잡 결과 JSON 에만 남고 버려져, ok=true 로 보이는 등록의 이미지 누락이 사용자에게 보이지 않았다.
            return [
                'status'  => (string)$r['status'],
                'attempt' => (int)$r['attempt'],
                'error'   => $err,
                'warning' => (is_array($res) && !empty($res['warning'])) ? (string)$res['warning'] : null,
                'missing' => (is_array($res) && !empty($res['missing']) && is_array($res['missing'])) ? array_values($res['missing']) : null,
                'images_uploaded' => (is_array($res) && isset($res['images_uploaded'])) ? (int)$res['images_uploaded'] : null,
            ];
        } catch (\Throwable $e) { return []; }
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
        if (!\Genie\Ssrf::safeUrl($url)) return [0, '']; // [현 차수] SSRF — 쓰기 어댑터 대상(shop_domain 등 자격증명 유래) 내부IP 차단
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

    /** [283차 R2] Shopify Admin API base + 인증 헤더. 자격증명 미비 시 null. */
    private static function shopifyApi(array $creds): ?array
    {
        $token = (string)($creds['access_token'] ?? $creds['api_password'] ?? '');
        $shop  = rtrim((string)($creds['shop_domain'] ?? ''), '/');
        if ($shop === '' || $token === '') return null;
        if (!str_contains($shop, '.')) $shop .= '.myshopify.com';
        return ["https://{$shop}/admin/api/2024-01", ['X-Shopify-Access-Token' => $token, 'Content-Type' => 'application/json']];
    }

    /**
     * [283차 R2] 상품의 variant 목록에서 우리 SKU 에 해당하는 variant 를 찾는다.
     *   ★가격/재고를 쓰려면 variant **id**(및 inventory_item_id)가 필수다. 이걸 확보하지 못하면 쓰지 않는다
     *     — 추측으로 id 없는 variants 배열을 보내면 Shopify 가 기존 variant 를 대체·삭제한다(P0-2 의 근원).
     *   SKU 일치가 원칙. 일치가 없고 variant 가 정확히 1개면 그 하나(SKU 미기입 단일상품)를 쓴다.
     *   다중 variant 인데 SKU 일치가 없으면 **null** → 호출부가 정직하게 실패/경고 처리(임의 선택 금지).
     */
    private static function shopifyVariant(array $creds, string $productId, string $sku): ?array
    {
        $api = self::shopifyApi($creds);
        if ($api === null || $productId === '') return null;
        [$base, $headers] = $api;
        [$code, $resp] = self::httpReq('GET', "{$base}/products/" . rawurlencode($productId) . ".json?fields=id,variants", $headers, null);
        if ($code < 200 || $code >= 300) return null;
        $vs = json_decode((string)$resp, true)['product']['variants'] ?? [];
        if (!is_array($vs) || !$vs) return null;
        if ($sku !== '') {
            foreach ($vs as $v) { if ((string)($v['sku'] ?? '') === $sku) return (array)$v; }
        }
        return (count($vs) === 1) ? (array)$vs[0] : null;
    }

    /**
     * [283차 R2 P0-1] Shopify 재고 전용 푸시(실구현).
     *   ★Admin REST 2024-01 에서 `variants[].inventory_quantity` 는 **read-only** 다 — 상품 upsert 로는
     *     재고가 절대 바뀌지 않는다(그런데 200 이 온다 = 가짜 성공). 재고는 InventoryLevel 로만 쓴다:
     *       ① GET /products/{id}.json?fields=variants        → SKU 매칭 variant 의 inventory_item_id
     *       ② GET /inventory_levels.json?inventory_item_ids= → 그 아이템이 연결된 location_id
     *       ③ POST /inventory_levels/set.json {location_id, inventory_item_id, available}
     *   ★다중 location: 같은 수량을 여러 location 에 set 하면 총 가용재고가 배로 뻥튀기된다.
     *     자격증명 location_id 가 없고 location 이 2곳 이상이면 **정직하게 실패**시킨다(임의 선택 금지).
     *   ★가격을 전혀 보내지 않는다(P0-3 구조적 면역).
     */
    private static function shopifyStock(array $creds, string $sku, int $qty, ?string $channelProductId): array
    {
        $api = self::shopifyApi($creds);
        if ($api === null) return ['ok' => false, 'error' => 'Shopify: shop_domain/access_token 미설정'];
        if ($channelProductId === null || $channelProductId === '') {
            return ['ok' => false, 'pending' => true, 'status' => 'no-channel-product-id', 'error' => 'Shopify 재고: 채널 상품 id 없음 — 상품 등록 후 자동 동기화'];
        }
        [$base, $headers] = $api;
        $qty = max(0, $qty);

        $v = self::shopifyVariant($creds, $channelProductId, $sku);
        if ($v === null) {
            return ['ok' => false, 'error' => "Shopify 재고: 상품 {$channelProductId} 에서 SKU '{$sku}' 에 해당하는 variant 를 찾지 못했습니다(옵션 상품이면 Shopify 에서 variant SKU 를 우리 SKU 와 일치시켜 주세요)."];
        }
        $iid = (string)($v['inventory_item_id'] ?? '');
        if ($iid === '') return ['ok' => false, 'error' => 'Shopify 재고: inventory_item_id 를 확보하지 못했습니다'];
        if ((string)($v['inventory_management'] ?? '') !== 'shopify') {
            return ['ok' => false, 'error' => "Shopify 재고: 이 variant 는 재고 추적(inventory_management=shopify)이 꺼져 있어 재고를 쓸 수 없습니다. Shopify 관리자에서 '재고 추적'을 켜 주세요."];
        }

        [$lc, $lr] = self::httpReq('GET', "{$base}/inventory_levels.json?inventory_item_ids=" . rawurlencode($iid), $headers, null);
        if ($lc < 200 || $lc >= 300) return ['ok' => false, 'error' => "Shopify inventory_levels 조회 HTTP {$lc}", 'body' => mb_substr((string)$lr, 0, 200)];
        $levels = json_decode((string)$lr, true)['inventory_levels'] ?? [];
        if (!is_array($levels) || !$levels) return ['ok' => false, 'error' => 'Shopify 재고: 이 상품이 연결된 location 이 없습니다(Shopify 관리자에서 재고 위치를 연결하세요)'];

        $wantLoc = trim((string)($creds['location_id'] ?? ''));
        $loc = '';
        if ($wantLoc !== '') {
            foreach ($levels as $lv) { if ((string)($lv['location_id'] ?? '') === $wantLoc) { $loc = $wantLoc; break; } }
            if ($loc === '') return ['ok' => false, 'error' => "Shopify 재고: 자격증명의 location_id({$wantLoc}) 가 이 상품에 연결되어 있지 않습니다"];
        } elseif (count($levels) === 1) {
            $loc = (string)($levels[0]['location_id'] ?? '');
        } else {
            return ['ok' => false, 'error' => 'Shopify 재고: 재고 위치가 ' . count($levels) . '곳입니다 — 어느 위치에 반영할지 알 수 없어 전송하지 않았습니다. 채널 자격증명에 location_id 를 지정하세요(임의 위치에 쓰면 총 가용재고가 부풀려집니다).'];
        }
        if ($loc === '') return ['ok' => false, 'error' => 'Shopify 재고: location_id 확보 실패'];

        $body = json_encode(['location_id' => (int)$loc, 'inventory_item_id' => (int)$iid, 'available' => $qty]);
        [$sc, $sr] = self::httpReq('POST', "{$base}/inventory_levels/set.json", $headers, $body);
        if ($sc >= 200 && $sc < 300) {
            return ['ok' => true, 'op' => 'stock_sync', 'channel_product_id' => (string)$channelProductId, 'inventory' => $qty, 'location_id' => $loc];
        }
        return ['ok' => false, 'error' => "Shopify 재고 set HTTP {$sc}", 'body' => mb_substr((string)$sr, 0, 200)];
    }

    /**
     * [283차 R2 P0-2] Shopify 가격 전용 푸시 — variant **전용** 엔드포인트(PUT /variants/{id}.json).
     *   상품 PUT 의 variants 배열은 "대체(replace)" 시맨틱이라 절대 쓰지 않는다. 가격은 여기서만 바꾼다.
     *   0원 이하는 전송 자체를 거부한다(P0-3 — 기존 정상가 파괴 방지).
     */
    private static function shopifyVariantPrice(array $creds, string $productId, string $sku, float $price): array
    {
        if ($price <= 0) return ['ok' => false, 'error' => '0원 이하 판매가는 전송하지 않습니다'];
        $api = self::shopifyApi($creds);
        if ($api === null) return ['ok' => false, 'error' => 'Shopify 자격증명 미설정'];
        [$base, $headers] = $api;
        $v = self::shopifyVariant($creds, $productId, $sku);
        if ($v === null || empty($v['id'])) return ['ok' => false, 'error' => "SKU '{$sku}' variant 미발견(옵션 상품은 Shopify 에서 variant SKU 를 일치시켜 주세요)"];
        $vid = (string)$v['id'];
        $body = json_encode(['variant' => ['id' => (int)$vid, 'price' => (string)round($price, 2)]]);
        [$c, $r] = self::httpReq('PUT', "{$base}/variants/{$vid}.json", $headers, $body);
        if ($c >= 200 && $c < 300) return ['ok' => true, 'variant_id' => $vid, 'price' => $price];
        return ['ok' => false, 'error' => "HTTP {$c} " . mb_substr((string)$r, 0, 150)];
    }

    /** [현 차수] Shopify 푸시 HTTP 에러 포맷 — 401/403 은 재발급 경로 안내(고객 자가진단·shopifyFetch 와 일관).
     *   실측: acct_1 access_token 이 'https:...' URL(무효)이라 등록/동기화가 401. 원시 'Shopify HTTP 401'은
     *   원인을 못 알려줬다 → shpat_ 토큰·Shop 도메인 확인을 정직하게 안내한다. */
    private static function shopifyPushErr(int $code, string $resp): string
    {
        if ($code === 401 || $code === 403) {
            return "Shopify 인증 실패(HTTP {$code}) — Admin API 액세스 토큰(shpat_…)이 무효/만료이거나 Shop 도메인과 불일치합니다. 커스텀 앱 재설치 후 발급된 토큰을 [연동 허브]에서 재등록하세요.";
        }
        return "Shopify HTTP {$code}: " . mb_substr($resp, 0, 200);
    }

    private static function shopifyWrite(array $creds, array $p, string $operation, ?string $channelProductId): array
    {
        $api = self::shopifyApi($creds);
        if ($api === null) return ['ok' => false, 'error' => 'shop_domain/access_token 미설정'];
        [$base, $headers] = $api;
        $sku = (string)($p['sku'] ?? '');

        if ($operation === 'unregister' || ($p['action'] ?? '') === 'unregister') {
            if ($channelProductId === null) return ['ok' => true, 'note' => '미등록 상품 — 해제 불요'];
            [$code] = self::httpReq('DELETE', "{$base}/products/{$channelProductId}.json", $headers, null);
            return ($code >= 200 && $code < 300) ? ['ok' => true, 'deleted' => $channelProductId] : ['ok' => false, 'error' => "Shopify DELETE HTTP {$code}"];
        }

        // [283차 R2 P0-3] 0원 가드 — 판매가가 0/음수면 채널을 아예 부르지 않는다.
        $price = (float)($p['price'] ?? 0);
        if ($price <= 0) return ['ok' => false, 'error' => 'Shopify: 판매가는 0보다 커야 합니다(0원 전송 차단 — 채널의 기존 판매가를 파괴할 수 있습니다).'];

        // [277차] 종전엔 body_html 에 spec(규격 한 줄)만 넣고 이미지는 아예 보내지 않아, Shopify 에 등록된 상품이
        //   이미지 없는 빈 상세로 올라갔다(네이버와 동일 결함 클래스). 상세HTML 우선 + 이미지 전송.
        $bodyHtml = (string)($p['detail_html'] ?? '');
        if ($bodyHtml === '') $bodyHtml = (string)($p['spec'] ?? '');
        $product = [
            'title'        => (string)($p['name'] ?? $sku),
            'body_html'    => $bodyHtml,
            'product_type' => (string)($p['category'] ?? ''),
            'status'       => 'active',
        ];
        $imgs = self::shopifyImages($p);
        if ($imgs) $product['images'] = $imgs;

        if ($channelProductId !== null && $channelProductId !== '') {
            /* ═══ [283차 R2 P0-2] ★상품 수정(PUT)에는 variants 를 **절대** 싣지 않는다 ═══
               Shopify Admin REST 는 PUT /products/{id} 의 `variants` 배열을 기존 variant 집합의 **대체**로
               처리한다 — 배열에 없는 variant 는 삭제되고, id 가 없는 항목은 신규 variant 로 생성된다.
               종전 코드는 **id 없는 variant 1개**를 보냈다 → 사이즈/색상 옵션이 있는 상품이 단일 variant 로
               뭉개지며 기존 variant(및 그에 달린 재고·바코드·주문 연결)가 통째로 소멸할 수 있었다.
               ★폭발반경: priorChannelProductId 가 channel_products 로 폴백하므로 PUT 대상에는
                 **셀러가 Shopify 에서 직접 만든 상품**이 포함되고, 283차가 이 PUT 을 재고이동마다 자동 발화시켰다.
               ★복구 불가한 고객 데이터 손실이므로, 안전한 쪽(미전송)을 택한다.
                 가격 → PUT /variants/{variant_id}.json (전용·id 포함)
                 재고 → POST /inventory_levels/set.json (전용)                                        */
            $body = json_encode(['product' => array_merge(['id' => (int)$channelProductId], $product)], JSON_UNESCAPED_UNICODE);
            [$code, $resp] = self::httpReq('PUT', "{$base}/products/{$channelProductId}.json", $headers, $body);
            if ($code < 200 || $code >= 300) return ['ok' => false, 'error' => self::shopifyPushErr($code, (string)$resp)];
            $res = ['ok' => true, 'channel_product_id' => (string)$channelProductId];
            $warn = [];
            // 가격 — variant 전용 경로. 실패해도 상품 수정 자체는 성공이므로 경고로 노출(조용한 누락 금지).
            $pv = self::shopifyVariantPrice($creds, (string)$channelProductId, $sku, $price);
            if (!empty($pv['ok'])) $res['price_updated'] = true;
            else $warn[] = 'Shopify 가격 반영 실패: ' . (string)($pv['error'] ?? '');
            // 재고 — inventory_levels 전용 경로. 값이 실려 있을 때만.
            if (array_key_exists('inventory', $p) && $p['inventory'] !== null && $p['inventory'] !== '') {
                $sv = self::shopifyStock($creds, $sku, (int)$p['inventory'], (string)$channelProductId);
                if (!empty($sv['ok'])) $res['inventory_updated'] = true;
                else $warn[] = 'Shopify 재고 반영 실패: ' . (string)($sv['error'] ?? '');
            }
            if ($warn) $res['warning'] = implode(' / ', $warn);
            return $res;
        }

        // ── 신규 등록(POST) — 기존 variant 가 없으므로 variants 전송이 안전하다(파괴 위험 0).
        //   ★inventory_quantity 는 2019-10 이후 read-only(무시된다). 등록 직후 inventory_levels/set 으로 실제 수량을 쓴다.
        $product['variants'] = [[
            'price'                => (string)round($price, 2),
            'sku'                  => $sku,
            'inventory_management' => 'shopify',
        ]];
        [$code, $resp] = self::httpReq('POST', "{$base}/products.json", $headers, json_encode(['product' => $product], JSON_UNESCAPED_UNICODE));
        if ($code < 200 || $code >= 300) return ['ok' => false, 'error' => self::shopifyPushErr($code, (string)$resp)];
        $d = json_decode((string)$resp, true);
        $pid = isset($d['product']['id']) ? (string)$d['product']['id'] : null;
        $res = ['ok' => true, 'channel_product_id' => $pid];
        if ($pid !== null && array_key_exists('inventory', $p) && (int)$p['inventory'] > 0) {
            $sv = self::shopifyStock($creds, $sku, (int)$p['inventory'], $pid);
            if (!empty($sv['ok'])) $res['inventory_updated'] = true;
            else $res['warning'] = 'Shopify 초기 재고 반영 실패(상품은 등록됨): ' . (string)($sv['error'] ?? '');
        }
        return $res;
    }

    /** 채널 쓰기 어댑터 디스패치. 미구현 채널은 pending(큐 유지 → 어댑터 추가 시 자동 처리). */
    private static function pushToChannel(string $channel, array $creds, array $product, string $operation, ?string $channelProductId): array
    {
        switch (strtolower($channel)) {
            case 'shopify':
                // [283차 R2 P0-3] ★Shopify 는 ChannelSync::pushProduct 를 타지 않아 **전송 전 계약검사(preflight)가
                //   한 번도 걸리지 않았다** — 0원 판매가·필수항목 누락이 그대로 채널에 도달하던 유일한 구멍.
                //   다른 채널과 동일하게 계약검사를 통과해야만 어댑터를 부른다.
                $pre = ChannelContract::preflight($channel, $product, ($channelProductId === null || $channelProductId === '') ? 'register' : 'update');
                if (!$pre['ok']) return ['ok' => false, 'error' => $pre['error'], 'missing' => $pre['missing'], 'preflight' => true];
                return self::shopifyWrite($creds, $product, $operation, $channelProductId);
            // [227차] cafe24/coupang/naver 등은 ChannelSync 쓰기 어댑터로 위임(검증된 인증 재사용).
            //   ChannelSync 미지원 채널은 pending 반환 → 큐 유지(어댑터 추가 시 자동 소비).
            default:
                return ChannelSync::pushProduct($channel, $creds, $product, $operation, $channelProductId);
        }
    }

    /**
     * [283차 R2 P0-1] 재고 **전용** 디스패치 — 상품 전체 upsert 를 절대 타지 않는다.
     *   Shopify 만 Catalog 소관(자격증명 규약이 여기 있다), 나머지는 ChannelSync::pushStock.
     *   재고 전용 어댑터가 없는 채널은 honest pending → 호출부가 큐에 보존한다(done 마감 금지).
     *   @param array $p ['sku','inventory'] — 가격/상세/이미지는 **의도적으로** 실리지 않는다.
     */
    private static function pushStockToChannel(string $channel, array $creds, array $p, ?string $channelProductId): array
    {
        $ch = strtolower(trim($channel));
        if ($ch === 'shopify') return self::shopifyStock($creds, (string)($p['sku'] ?? ''), (int)($p['inventory'] ?? 0), $channelProductId);
        return ChannelSync::pushStock($ch, $creds, $p, $channelProductId);
    }

    /** [283차 R2] 재고 전용 실전송 경로를 보유한 채널 전체(Catalog 소관 + ChannelSync 소관). 보류잡 부활·크론 로그의 SSOT. */
    public static function stockAdapterChannels(): array
    {
        return array_values(array_unique(array_merge(['shopify'], ChannelSync::STOCK_ADAPTERS)));
    }

    /** [283차 R2] 이 채널이 재고 전용 실전송 경로를 갖고 있는가(크론 로그/보고용). */
    public static function hasStockAdapter(string $channel): bool
    {
        return in_array(strtolower(trim($channel)), self::stockAdapterChannels(), true);
    }

    /** 현재 catalog_listing 한 행을 product 배열로 로드(부분 payload 손실 방지). */
    private static function currentListing(\PDO $pdo, string $tenant, string $channel, string $sku): ?array
    {
        try {
            // [277차] detail_html·images 도 복원. 네이버 등은 update 가 originProduct 전체 교체(PUT)라
            //   상세·이미지를 빼고 push 하면 채널에 등록된 상세페이지가 지워진다(가격만 바꾸는 리프라이서 경로 포함).
            // [285차] brand 복원 — 11번가 상품등록 필수. 빠지면 큐 소비 시 브랜드가 사라져 등록이 거부된다.
            $st = $pdo->prepare("SELECT name,category,price,inventory,spec,action,detail_html,images_json,image_url,category_code,brand FROM catalog_listing WHERE tenant_id=? AND channel=? AND sku=? LIMIT 1");
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
            // [286차] ★brand 는 상품 단위(채널 무관)다. 이 채널 행의 brand 가 비어 있으면(다른 채널에서
            //   먼저 지정했거나 브랜드 지정 시점에 이 채널 리스팅이 아직 없던 경우) 동일 sku 의 타 채널 행에서
            //   brand 를 복원한다. 없이 큐를 소비하면 11번가가 "브랜드명 필요"로 거부한다(이미 queued 된 잡의 재시도 구제).
            if (trim((string)($r['brand'] ?? '')) === '') {
                try {
                    $bs = $pdo->prepare("SELECT brand FROM catalog_listing WHERE tenant_id=? AND sku=? AND brand IS NOT NULL AND TRIM(brand)<>'' ORDER BY updated_at DESC LIMIT 1");
                    $bs->execute([$tenant, $sku]);
                    $b = $bs->fetchColumn();
                    if ($b !== false && trim((string)$b) !== '') $r['brand'] = (string)$b;
                } catch (\Throwable $e) { /* 폴백 실패 시 원래대로(elevenStWrite 가 정직하게 거부) */ }
            }
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
            if ($r !== false) {
                $d = json_decode((string)$r, true);
                $pid = $d['channel_product_id'] ?? null;
                if ($pid !== null && $pid !== '') return (string)$pid;
            }
        } catch (\Throwable $e) { /* 아래 폴백 */ }

        // [277차] ★기존 등록상품 '정보 변경'이 불가하던 근본원인 — 우리 앱에서 등록한 이력(done 잡)이 없으면
        //   항상 null 을 반환해 **신규등록**으로 시도했다. 그러나 채널 동기화로 수집한 상품은
        //   channel_products.channel_product_id 를 이미 보유한다(셀러가 채널에서 직접 만든 상품 포함).
        //   그 id 를 찾아 PUT(수정) 경로로 보낸다 → 중복 등록·400 방지, 가격/재고/상세 변경이 실제로 반영된다.
        try {
            $aliases = self::channelAliases($channel);
            $ph = implode(',', array_fill(0, count($aliases), '?'));
            // ★네이버는 수정(PUT /origin-products/{no})에 originProductNo 를 요구한다. channel_product_id 는
            //   channelProductNo(다른 번호)이므로 그대로 쓰면 404/400 이다 → origin_product_id 우선.
            $isNaver = (bool)array_intersect($aliases, ['naver', 'naver_smartstore']);
            $idCol = $isNaver ? "COALESCE(NULLIF(origin_product_id,''), channel_product_id)" : "channel_product_id";
            // sku 우선(셀러관리코드), 없으면 channel_product_id 자체가 sku 로 쓰인 경우(수집분 폴백)
            $st = $pdo->prepare("SELECT {$idCol} AS pid FROM channel_products
                                  WHERE tenant_id=? AND channel IN ($ph) AND (sku=? OR channel_product_id=?)
                                  ORDER BY (sku=?) DESC LIMIT 1");
            $st->execute(array_merge([$tenant], $aliases, [$sku, $sku, $sku]));
            $pid = $st->fetchColumn();
            if ($pid !== false && $pid !== null && (string)$pid !== '') return (string)$pid;
        } catch (\Throwable $e) { /* 테이블 부재 등 */ }
        return null;
    }

    /**
     * Writeback 큐 소비 — status IN ('queued','awaiting_credentials') 작업을 채널로 push.
     *   자격증명 없으면 'awaiting_credentials' 보류(등록 시 자동 재개). 어댑터 미구현이면 'queued' 유지.
     *   반환: ['processed','done','awaiting','pending','failed'].
     */
    public static function processWritebackQueue(\PDO $pdo, ?string $tenant = null, ?string $channel = null, int $limit = 50, ?int $onlyJobId = null): array
    {
        self::ensureTables();
        $where = "status IN ('queued','awaiting_credentials')";
        $params = [];
        if ($tenant !== null)  { $where .= " AND tenant_id=?"; $params[] = $tenant; }
        if ($channel !== null) { $where .= " AND channel=?";   $params[] = $channel; }
        // [277차] 동기 전송은 자기가 만든 잡만 처리한다(다른 상품의 잡을 집어 엉뚱한 결과를 반환하던 문제).
        if ($onlyJobId !== null) { $where .= " AND id=?"; $params[] = $onlyJobId; }
        $sum = ['processed' => 0, 'done' => 0, 'awaiting' => 0, 'pending' => 0, 'failed' => 0];
        $now = self::now();
        // ── 큐 하우스키핑 — 배치/크론 모드에서만 돈다($onlyJobId 가 있는 동기 전송 경로는 사용자 응답 대기 중이라
        //    테이블 전체 UPDATE 를 태우지 않는다. 하우스키핑은 어차피 크론이 10분마다 수행한다).
        if ($onlyJobId === null) {
            // [283차 R2 P1-4] 크래시한 워커가 남긴 'processing' 잡 회수(10분 초과) — 영구 스턱 방지.
            try {
                $pdo->prepare("UPDATE catalog_writeback_job SET status='queued', updated_at=? WHERE status='processing' AND updated_at < ?")
                    ->execute([$now, gmdate('Y-m-d H:i:s', time() - 600)]);
            } catch (\Throwable $e) { /* best-effort */ }
            // [283차 R2 P0-1] ★재고 보류잡 자동 부활 — 재고 전용 어댑터를 **지금** 보유한 채널의 'pending' 잡을 되살린다.
            //   어댑터가 코드에 추가되는 순간(상수 목록 확장) 다음 회차에 큐로 복귀해 자동 전송된다 = 잡 유실 0.
            //   어댑터가 아직 없는 채널의 잡은 'pending' 에 머물러 큐 기아를 만들지 않는다(스캔 비용 0).
            try {
                $live = self::stockAdapterChannels();
                if ($live) {
                    $ph = implode(',', array_fill(0, count($live), '?'));
                    $pdo->prepare("UPDATE catalog_writeback_job SET status='queued', updated_at=? WHERE status='pending' AND operation='stock_sync' AND LOWER(channel) IN ($ph)")
                        ->execute(array_merge([$now], $live));
                }
            } catch (\Throwable $e) { /* best-effort */ }
        }
        try {
            $st = $pdo->prepare("SELECT id,tenant_id,channel,sku,operation,payload,attempt FROM catalog_writeback_job WHERE $where ORDER BY id ASC LIMIT " . (int)$limit);
            $st->execute($params);
            $jobs = $st->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) { return $sum; }

        $upd = $pdo->prepare("UPDATE catalog_writeback_job SET status=?, result=?, attempt=?, updated_at=? WHERE id=?");
        // [283차 R2 P1-4] ★잡 선점(CAS) — 이 큐의 소비자는 3개다(writeback_cron / stock_sync_cron / ChannelCreds
        //   등록훅·수동 플러시). SELECT~UPDATE 사이가 무방비라 두 워커가 같은 잡을 집으면 **채널에 같은 요청이
        //   2회** 나간다(재고 중복 push·중복 등록). 조건부 UPDATE 의 affected rows 로 소유권을 판정한다
        //   (FOR UPDATE/SKIP LOCKED 불필요 — SQLite 폴백 환경에서도 동일하게 동작한다).
        $claim = $pdo->prepare("UPDATE catalog_writeback_job SET status='processing', updated_at=? WHERE id=? AND status IN ('queued','awaiting_credentials')");
        foreach ($jobs as $j) {
            try {
                $claim->execute([$now, (int)$j['id']]);
                if ($claim->rowCount() < 1) continue;   // 다른 워커가 선점 — 중복 전송 차단
            } catch (\Throwable $e) { continue; }
            $sum['processed']++;
            $t = (string)$j['tenant_id']; $ch = (string)$j['channel']; $sku = (string)$j['sku'];
            $op = (string)($j['operation'] ?? 'publish'); $attempt = (int)($j['attempt'] ?? 1);
            $creds = self::loadChannelCreds($pdo, $t, $ch);
            if (!$creds) {
                $upd->execute(['awaiting_credentials', json_encode(['reason' => 'no_active_credentials'], JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                $sum['awaiting']++; continue;
            }

            /* ══ [283차 R2 P0-1] 재고 전용 경로 — "상품 전체 upsert 로 재고를 보내고 done 을 찍던" 가짜 성공 차단 ══
               ★결함: 큐가 operation='stock_sync' 를 넘겨도 어댑터에는 stock 전용 분기가 0건이었다.
                 잡은 pushProduct(상품 전체 upsert)로 흘러갔고 Shopify(inventory_quantity=read-only)·
                 Cafe24(payload 에 재고 필드 부재)에서 **재고가 전혀 바뀌지 않은 채 HTTP 200** → done 마감.
               ★이제 재고 잡은 pushStockToChannel 만 탄다:
                 ・가격/상세/이미지를 아예 싣지 않는다(0원 파괴·variant 파괴 구조적 면역).
                 ・채널 상품 id 가 없으면 신규등록으로 승격시키지 않고 pending(오등록 방지).
                 ・재고 전용 어댑터가 없는 채널은 pending → **큐 보존**(done 금지, 어댑터 추가 시 자동 전송).
               ★FeedTemplate/카테고리 해석/normalizeAdapterPayload 를 타지 않는다 — 상품 스펙 변환은 재고와 무관하고,
                 그 경로가 가격을 오버레이할 여지를 원천 차단한다.                                              */
            if ($op === 'stock_sync') {
                $pl  = json_decode((string)$j['payload'], true) ?: [];
                $qty = array_key_exists('inventory', $pl) ? max(0, (int)$pl['inventory']) : null;
                $priorId = self::priorChannelProductId($pdo, $t, $ch, $sku);
                if ($qty === null) {
                    $res = ['ok' => false, 'error' => 'stock_sync payload 에 inventory 가 없습니다'];
                } elseif ($priorId === null || $priorId === '') {
                    $res = ['ok' => false, 'pending' => true, 'status' => 'no-channel-product-id',
                            'error' => '채널 미등록 상품 — 상품이 채널에 등록되면 재고가 자동 동기화됩니다(신규등록으로 승격하지 않습니다).'];
                } else {
                    $res = self::pushStockToChannel($ch, $creds, ['sku' => $sku, 'inventory' => $qty], $priorId);
                }
                if (!empty($res['ok'])) {
                    $upd->execute(['done', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                    try {
                        $pdo->prepare("UPDATE catalog_listing SET inventory=?, status='synced', updated_at=? WHERE tenant_id=? AND channel=? AND sku=?")
                            ->execute([(int)$qty, $now, $t, $ch, $sku]);
                    } catch (\Throwable $e) {}
                    $sum['done']++;
                } elseif (!empty($res['pending'])) {
                    /* honest pending — 채널에 반영되지 않았으므로 **done 을 찍지 않는다**. attempt 도 소모하지 않는다.
                       ★상태를 'queued' 가 아니라 'pending' 으로 둔다(잡 유실 0, 큐 기아 0):
                         'queued' 로 두면 어댑터 없는 채널의 잡이 매 회차 ORDER BY id ASC 앞줄을 영구 점유해
                         LIMIT(200) 을 다 먹고 **뒤에 쌓인 실제 등록/가격 잡이 영영 처리되지 않는다**(기아).
                       ★부활 경로는 두 개다 — 둘 다 자동이다:
                         ① 이 함수 상단의 revive UPDATE: 그 채널에 재고 어댑터가 **추가되는 순간** 전부 'queued' 복귀.
                         ② Wms::enqueueChannelStockSync: 재고가 다시 변하면 payload 갱신 + 'queued' 복귀. */
                    $upd->execute(['pending', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt, $now, $j['id']]);
                    $sum['pending']++;
                } else {
                    $failed = $attempt >= 3;
                    $upd->execute([$failed ? 'failed' : 'queued', json_encode($res, JSON_UNESCAPED_UNICODE), $attempt + 1, $now, $j['id']]);
                    $sum[$failed ? 'failed' : 'pending']++;
                }
                continue;
            }

            $jobPayload = json_decode((string)$j['payload'], true) ?: [];
            $product = self::currentListing($pdo, $t, $ch, $sku) ?: $jobPayload;
            // [277차] payload 의 images/detail_html 은 용량 절감을 위한 **요약값**(개수·바이트수)이다.
            //   currentListing 폴백 시 그 요약이 실제 데이터로 오인되지 않도록 정규화한다.
            if (!is_array($product['images'] ?? null)) $product['images'] = [];
            if (isset($product['detail_html']) && preg_match('/^\d+B$/', (string)$product['detail_html'])) $product['detail_html'] = '';
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
                // [283차 R2 P0-3] 0/음수 오버레이 금지 — 리프라이서 payload 가 0 이면 기존 정상가를 0 으로 덮어
                //   채널에 0원 판매가가 도달한다(11번가 sellPrc·쿠팡 salePrice·ESM 은 무방비). 유효값만 반영.
                if (isset($pl['price']) && (float)$pl['price'] > 0) $product['price'] = (float)$pl['price'];
            }
            // [227차] 채널 카테고리 매핑 해석 — 내 카테고리→채널 카테고리코드(쿠팡/네이버 등 필수). 어댑터가 category_code 우선 사용.
            $product['category_code'] = self::resolveChannelCategory($pdo, $t, $ch, $product);
            // [현 차수] 기본카테고리(base_code) 해석 — 표시카테고리(category_code)와 별도. 매핑에 기본카테고리가 지정돼
            //   있으면 상품 payload 에 실어 어댑터(11번가 등)가 표시+기본 두 카테고리를 함께 전송하게 한다.
            $product['base_category_code'] = self::resolveBaseChannelCategory($pdo, $t, $ch, $product);
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
            // [282차 R3] ★피드 변환 실배선 — 발행된 FeedTemplate 스펙을 전송 직전 상품에 적용(canonical 오버레이=실전송 반영).
            //   무발행/오류 시 원본 그대로(회귀0). 신규 등록(register/publish)에서 필수필드 미충족 시 전송 차단(오피드 방지).
            $ft = FeedTemplate::transformProduct($pdo, $t, $ch, $product);
            $product = $ft['product'];
            $isRegister = in_array($pushOp, ['register', 'publish'], true) && ($priorId === null || $priorId === '');
            if ($ft['applied'] && $isRegister && !empty($ft['errors'])) {
                $res = ['ok' => false, 'error' => 'feed_validation', 'detail' => '피드 템플릿 필수필드 누락: ' . implode(', ', $ft['errors']), 'missing' => $ft['errors'], 'feed_template' => true];
            } else {
                $res = self::pushToChannel($ch, $creds, $product, $pushOp, $priorId);
                if (!empty($res['ok']) && !empty($ft['warnings'])) $res['feed_warning'] = implode('; ', $ft['warnings']);
            }
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
     * [277차] (은퇴) sku 기준 최신 잡 결과 — 같은 sku 에 operation 이 다른 잡(publish/price)이 공존하면
     *   엉뚱한 잡을 읽는다. 동기 전송은 jobResultById 로 **자기 잡**만 본다. 크론/디버그 용도로만 남긴다.
     */
    private static function latestJobResult(\PDO $pdo, string $tenant, string $channel, string $sku): array
    {
        try {
            // superseded(대체된 옛 잡)는 결과 판정에서 제외 — 그 결과를 읽으면 해결된 오류가 계속 표시된다.
            $st = $pdo->prepare("SELECT status, attempt, result FROM catalog_writeback_job
                                 WHERE tenant_id=? AND channel=? AND sku=? AND status <> 'superseded'
                                 ORDER BY id DESC LIMIT 1");
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

    /**
     * [227차] 채널 카테고리코드 해석: ①상품 명시 category_code ②채널 매핑(channel_category_map[category])
     * [277차] ③**자동 매칭** — 채널 카테고리 카탈로그(리프)에서 상품명/카테고리 텍스트와 가장 잘 맞는 리프를 고른다.
     *   사용자가 네이버 리프카테고리ID(5,011개)를 손으로 지정하는 것은 현실적으로 불가능하다.
     *   확신이 낮으면 **지어내지 않고 빈값을 반환**해 어댑터가 정직하게 거부하게 둔다.
     */
    private static function resolveChannelCategory(\PDO $pdo, string $tenant, string $channel, array $product): string
    {
        $explicit = trim((string)($product['category_code'] ?? ''));
        if ($explicit !== '') return $explicit;
        $cat = trim((string)($product['category'] ?? ''));
        try {
            // [228차] 별칭 정합 — 카테고리맵이 registry키(amazon_spapi)로 저장돼도 job채널(amazon)에서 찾도록.
            $aliases = self::channelAliases($channel);
            $ph = implode(',', array_fill(0, count($aliases), '?'));
            if ($cat !== '') {
                // [현 차수] ★TRIM/대소문자 정규화 비교 — 저장 시 표기(공백·대소문자) 차이로 매핑이 매칭 안 되던 것 완화.
                //   종전엔 src_category=? 등호라 '니트' vs '니트 ' vs 'Knit' 처럼 미세 차이로도 코드가 상품에 도달 못 했다.
                $st = $pdo->prepare("SELECT channel_code FROM channel_category_map WHERE tenant_id=? AND channel IN ($ph) AND LOWER(TRIM(src_category))=LOWER(TRIM(?)) AND channel_code<>'' LIMIT 1");
                $st->execute(array_merge([$tenant], $aliases, [$cat]));
                $code = $st->fetchColumn();
                if ($code !== false && (string)$code !== '') return (string)$code;
            }
            // [현 차수] ★상품별 개별 설정 원칙 — 표시카테고리(dispCtgrNo)는 상품마다 명시(category_code) 또는
            //   그 상품의 매핑카테고리(category)→표시카테고리 매핑으로만 해석한다. '전 상품 공통 기본값'·'단일매핑
            //   추측' 폴백은 사용자 요구(상품 하나당 표시카테고리 1개 개별 설정)에 따라 제거했다. 미설정 상품은
            //   아래에서 빈값을 반환해 어댑터가 정직하게 표시카테고리 요구(사용자가 그 상품에 직접 지정).
        } catch (\Throwable $e) { /* 아래 자동매칭 */ }

        // ③ 자동 매칭 — ★고확신일 때만 자동 적용한다. 애매한 매칭을 강행하면 엉뚱한 카테고리로 등록돼
        //   채널 페널티·노출 불이익이 발생한다(실측: '수분크림'→화장품세트, '비타민C'→비타민A 같은 오매칭).
        //   확신이 낮으면 빈값을 반환하고, 호출부(writeback)가 후보를 사용자에게 제시한다.
        $auto = self::autoMatchChannelCategory($pdo, $tenant, $channel, $product);
        if ($auto !== null && $auto['score'] >= self::CATEGORY_AUTO_THRESHOLD) {
            if ($cat !== '') { try { self::saveCategoryMap($pdo, $tenant, $channel, $cat, $auto['code'], $auto['label']); } catch (\Throwable $e) {} }
            return $auto['code'];
        }
        return '';
    }

    /**
     * [현 차수] 기본카테고리(base_code) 해석 — 표시카테고리(channel_code)와 별도로 채널 카테고리 매핑에 지정된 값.
     *   ①상품 명시 base_category_code 우선 ②상품의 매핑카테고리(category)→매핑의 base_code(정규화 매칭).
     *   기본카테고리는 선택값이므로 없으면 빈값(어댑터는 기본카테고리 없이 표시카테고리만 전송).
     */
    private static function resolveBaseChannelCategory(\PDO $pdo, string $tenant, string $channel, array $product): string
    {
        $explicit = trim((string)($product['base_category_code'] ?? ''));
        if ($explicit !== '') return $explicit;
        $cat = trim((string)($product['category'] ?? ''));
        if ($cat === '') return '';
        try {
            $aliases = self::channelAliases($channel);
            $ph = implode(',', array_fill(0, count($aliases), '?'));
            $st = $pdo->prepare("SELECT base_code FROM channel_category_map WHERE tenant_id=? AND channel IN ($ph) AND LOWER(TRIM(src_category))=LOWER(TRIM(?)) AND base_code<>'' LIMIT 1");
            $st->execute(array_merge([$tenant], $aliases, [$cat]));
            $code = $st->fetchColumn();
            if ($code !== false && (string)$code !== '') return (string)$code;
        } catch (\Throwable $e) { /* base_code 컬럼 부재 등 → 빈값 */ }
        return '';
    }

    /**
     * [277차] 채널 카테고리 자동 매칭.
     *   후보 = channel_category_catalog 의 리프(등록 가능 카테고리). 카탈로그가 비었으면 채널에서 1회 수집.
     *   점수 = 상품 텍스트(상품명·카테고리·규격)의 토큰이 카테고리 전체경로에 얼마나 나타나는가 +
     *          말단 카테고리명 일치 가중. 최고점이 임계값 미만이면 null(날조 금지).
     *   @return array{code:string,label:string,score:float}|null
     */
    private static function autoMatchChannelCategory(\PDO $pdo, string $tenant, string $channel, array $product): ?array
    {
        $top = self::rankChannelCategories($pdo, $tenant, $channel, $product, 1);
        return $top[0] ?? null;
    }

    /** [285차] 요청당 리프 카테고리 풀 메모(키: 읽기스코프|채널별칭). 루프 중 중복 조회·중복 수집 차단. */
    private static array $leafPoolMemo = [];

    /**
     * [285차] 채널 리프 카테고리 풀을 **요청당 1회만** 읽는다. (502 근본치료)
     *
     * ★종전 버그: rankChannelCategories 가 `tenant_id = <실테넌트>` 로 카탈로그를 읽었는데, 11번가 카탈로그는
     *   공용 채널이라 `__shared__` 스코프에 적재된다(syncChannelCategories: $writeTenant = SHARED_TENANT).
     *   → COUNT 가 항상 0 → 매 호출마다 syncChannelCategories() → **11번가 3MB XML 재수집 + 15,295행 upsert**
     *   → 재조회도 여전히 잘못된 스코프라 0건 → 추천은 늘 빈값.
     *   이게 pendingCategories(상품 100건 루프) 와 writeback(상품마다 autoMatch) 에서 반복되어
     *   `upstream timed out` · php-fpm 워커 고갈 · **HTTP 502** 의 근본원인이었다(284차는 max_children 을
     *   5→12 로 올려 증상만 완화했다).
     *
     * @return array<int,array{code:string,name:string,whole_name:string}>
     */
    private static function leafCategoryPool(\PDO $pdo, string $tenant, string $channel): array
    {
        $aliases = self::channelAliases($channel);
        // ★읽기 스코프 = 쓰기 스코프와 동일해야 한다(공용 채널은 __shared__).
        $scope   = self::isSharedCatalogChannel($channel) ? self::SHARED_TENANT : $tenant;
        $memoKey = $scope . '|' . implode(',', $aliases);
        if (isset(self::$leafPoolMemo[$memoKey])) return self::$leafPoolMemo[$memoKey];

        $ph  = implode(',', array_fill(0, count($aliases), '?'));
        $sql = "SELECT code, name, whole_name FROM channel_category_catalog
                 WHERE tenant_id=? AND channel IN ($ph) AND is_leaf=1";
        $st  = $pdo->prepare($sql);
        $st->execute(array_merge([$scope], $aliases));
        $rows = $st->fetchAll(\PDO::FETCH_ASSOC);

        if (!$rows) {
            // 카탈로그가 실제로 비었을 때만 1회 수집(루프 중 반복 수집 금지 — 메모가 빈 결과도 기억한다).
            if (self::syncChannelCategories($pdo, $tenant, $channel) > 0) {
                $st->execute(array_merge([$scope], $aliases));
                $rows = $st->fetchAll(\PDO::FETCH_ASSOC);
            }
        }
        return self::$leafPoolMemo[$memoKey] = ($rows ?: []);
    }

    /**
     * [277차] 상품 텍스트로 채널 리프 카테고리 후보를 점수순 반환(자동적용/후보제시 공용).
     *   @return array<int,array{code:string,label:string,score:float}>
     */
    public static function rankChannelCategories(\PDO $pdo, string $tenant, string $channel, array $product, int $limit = 5): array
    {
        $text = trim(((string)($product['name'] ?? '')) . ' ' . ((string)($product['category'] ?? '')) . ' ' . ((string)($product['spec'] ?? '')));
        if ($text === '') return [];

        try {
            $rows = self::leafCategoryPool($pdo, $tenant, $channel);
        } catch (\Throwable $e) { return []; }
        if (!$rows) return [];

        // 상품 텍스트 토큰(2글자 이상 한글/영문/숫자 덩어리)
        preg_match_all('/[가-힣]{2,}|[A-Za-z]{3,}|\d{2,}/u', $text, $m);
        $tokens = array_values(array_unique(array_map(static fn($s) => mb_strtolower($s), $m[0] ?? [])));
        if (!$tokens) return [];

        $scored = [];
        foreach ($rows as $r) {
            $whole = mb_strtolower((string)$r['whole_name']);
            $leaf  = mb_strtolower((string)$r['name']);
            $score = 0.0;
            foreach ($tokens as $tk) {
                if ($leaf !== '' && $leaf === $tk)                   { $score += 3.0; continue; }  // 말단 정확일치
                if ($leaf !== '' && mb_strpos($leaf, $tk) !== false) { $score += 1.8; continue; }
                if (mb_strpos($whole, $tk) !== false)                { $score += 1.0; }
            }
            if ($score <= 0) continue;
            $scored[] = ['code' => (string)$r['code'], 'label' => (string)$r['whole_name'], 'score' => $score, 'len' => mb_strlen($whole)];
        }
        if (!$scored) return [];
        usort($scored, static fn($a, $b) => ($b['score'] <=> $a['score']) ?: ($a['len'] <=> $b['len']));
        return array_map(
            static fn($s) => ['code' => $s['code'], 'label' => $s['label'], 'score' => round($s['score'], 1)],
            array_slice($scored, 0, max(1, $limit))
        );
    }

    /** 자동 매칭 결과를 채널 카테고리 매핑에 학습 저장(사용자가 나중에 수정 가능). 멱등. */
    private static function saveCategoryMap(\PDO $pdo, string $tenant, string $channel, string $srcCategory, string $code, string $label): void
    {
        $now = self::now();
        $sql = self::isMysql($pdo)
            ? "INSERT INTO channel_category_map(tenant_id,channel,src_category,channel_code,channel_label,created_at,updated_at)
               VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE channel_code=VALUES(channel_code),channel_label=VALUES(channel_label),updated_at=VALUES(updated_at)"
            : "INSERT INTO channel_category_map(tenant_id,channel,src_category,channel_code,channel_label,created_at,updated_at)
               VALUES(?,?,?,?,?,?,?) ON CONFLICT(tenant_id,channel,src_category) DO UPDATE SET channel_code=excluded.channel_code,channel_label=excluded.channel_label,updated_at=excluded.updated_at";
        $pdo->prepare($sql)->execute([$tenant, $channel, $srcCategory, $code, $label, $now, $now]);
    }

    /* GET /catalog/category-map[?channel=] — 채널 카테고리 매핑 목록. */
    public static function categoryMapList(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db(); $tenant = self::tenant($req);
        $ch = (string)($req->getQueryParams()['channel'] ?? '');
        try {
            if ($ch !== '') { $st = $pdo->prepare("SELECT id,channel,src_category,channel_code,channel_label,base_code,base_label,updated_at FROM channel_category_map WHERE tenant_id=? AND channel=? ORDER BY channel,src_category"); $st->execute([$tenant, $ch]); }
            else { $st = $pdo->prepare("SELECT id,channel,src_category,channel_code,channel_label,base_code,base_label,updated_at FROM channel_category_map WHERE tenant_id=? ORDER BY channel,src_category"); $st->execute([$tenant]); }
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
        // [현 차수] 기본카테고리(base) — 표시카테고리(channel_code)와 별도로 한 매핑에 함께 저장(11번가 등).
        $baseCode = trim((string)($b['base_code'] ?? '')); $baseLabel = trim((string)($b['base_label'] ?? ''));
        if ($ch === '' || $src === '' || $code === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel·src_category·channel_code 필수'], 400);
        $now = self::now();
        $sql = self::isMysql($pdo)
            ? "INSERT INTO channel_category_map (tenant_id,channel,src_category,channel_code,channel_label,base_code,base_label,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE channel_code=VALUES(channel_code),channel_label=VALUES(channel_label),base_code=VALUES(base_code),base_label=VALUES(base_label),updated_at=VALUES(updated_at)"
            : "INSERT INTO channel_category_map (tenant_id,channel,src_category,channel_code,channel_label,base_code,base_label,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id,channel,src_category) DO UPDATE SET channel_code=excluded.channel_code,channel_label=excluded.channel_label,base_code=excluded.base_code,base_label=excluded.base_label,updated_at=excluded.updated_at";
        try { $pdo->prepare($sql)->execute([$tenant, $ch, $src, $code, $label, $baseCode, $baseLabel, $now, $now]); return self::jsonRes($res, ['ok' => true]); }
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

    /**
     * [현 차수] POST /catalog/channel-categories/import
     *   body: { channel, rows:[{code,name,whole?,leaf?}], replace?:bool }
     *
     *   ★11번가처럼 "카테고리 목록 조회 API 자체가 없는" 채널을 위한 정본 적재 경로.
     *   11번가 셀러 API 에는 카테고리 조회 엔드포인트가 없고(공식 개발가이드 확인), API 서버는
     *   IP 화이트리스트로 외부 호출도 막는다 → 자동 수집이 원천 불가하다. 그렇다고 카테고리 코드를
     *   임의 생성하면 엉뚱한 카테고리로 상품이 등록되므로 절대 금지.
     *   → 채널(11번가)이 제공하는 공식 카테고리 파일을 그대로 적재해 진짜 코드만 보유한다.
     *   적재 후에는 기존 channelCategories() 가 캐시를 그대로 서빙하므로 조회·검색·선택 경로는
     *   네이버와 완전히 동일하게 동작한다(신규 조회 API 없음).
     */
    public static function importCategories(Request $req, Response $res): Response
    {
        if ($err = UserAuth::requirePro($req, $res)) return $err;
        self::ensureTables();
        $pdo = self::db();
        $tenant = self::tenant($req);
        $b = (array)($req->getParsedBody() ?? []);
        $channel = strtolower(trim((string)($b['channel'] ?? '')));
        $rows = $b['rows'] ?? null;
        if ($channel === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel required'], 400);
        if (!is_array($rows) || !$rows) return self::jsonRes($res, ['ok' => false, 'error' => 'rows required'], 400);
        if (count($rows) > 100000) return self::jsonRes($res, ['ok' => false, 'error' => 'too many rows (max 100000)'], 400);
        // ★공용 카탈로그는 HTTP 로 절대 쓰지 않는다. X-Tenant-Id 를 '__shared__' 로 위조해 전 테넌트의
        //   카테고리를 오염시키는 경로를 차단한다(공용 시딩은 서버 CLI 로만).
        if ($tenant === self::SHARED_TENANT) return self::jsonRes($res, ['ok' => false, 'error' => 'forbidden tenant scope'], 403);

        $now = self::now();
        $sql = self::isMysql($pdo)
            ? "INSERT INTO channel_category_catalog(tenant_id,channel,code,name,whole_name,is_leaf,synced_at) VALUES(?,?,?,?,?,?,?)
               ON DUPLICATE KEY UPDATE name=VALUES(name),whole_name=VALUES(whole_name),is_leaf=VALUES(is_leaf),synced_at=VALUES(synced_at)"
            : "INSERT INTO channel_category_catalog(tenant_id,channel,code,name,whole_name,is_leaf,synced_at) VALUES(?,?,?,?,?,?,?)
               ON CONFLICT(tenant_id,channel,code) DO UPDATE SET name=excluded.name,whole_name=excluded.whole_name,is_leaf=excluded.is_leaf,synced_at=excluded.synced_at";

        $n = 0; $skipped = 0;
        $pdo->beginTransaction();
        try {
            if (!empty($b['replace'])) {
                $pdo->prepare("DELETE FROM channel_category_catalog WHERE tenant_id=? AND channel=?")->execute([$tenant, $channel]);
            }
            $st = $pdo->prepare($sql);
            foreach ($rows as $r) {
                if (!is_array($r)) { $skipped++; continue; }
                $code  = trim((string)($r['code'] ?? ''));
                $name  = trim((string)($r['name'] ?? ''));
                $whole = trim((string)($r['whole'] ?? $r['whole_name'] ?? ''));
                if ($code === '' || $name === '') { $skipped++; continue; }  // 코드·이름 없는 행은 버린다(가짜 생성 금지)
                if ($whole === '') $whole = $name;
                // leaf 미지정이면 등록 가능한 말단으로 간주한다(상품등록은 리프만 노출되므로,
                // 파일에 계층정보가 없는 경우 전부 선택 가능해야 사용자가 코드를 고를 수 있다).
                $leaf = array_key_exists('leaf', $r) ? (int)!!$r['leaf'] : 1;
                $st->execute([$tenant, $channel, $code, mb_substr($name, 0, 255), mb_substr($whole, 0, 500), $leaf, $now]);
                $n++;
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            return self::jsonRes($res, ['ok' => false, 'error' => 'db_error'], 500);
        }

        $total = 0;
        try {
            $c = $pdo->prepare("SELECT COUNT(*) FROM channel_category_catalog WHERE tenant_id=? AND channel=?");
            $c->execute([$tenant, $channel]);
            $total = (int)$c->fetchColumn();
        } catch (\Throwable $e) { /* best-effort */ }

        return self::jsonRes($res, ['ok' => true, 'channel' => $channel, 'imported' => $n, 'skipped' => $skipped, 'total_cached' => $total]);
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
        $normalized = self::normalizePayload($channel, $sku, $product);
        // [282차 R3] 발행된 피드 템플릿 반영 — 미리보기가 실제 전송값과 일치하도록.
        $ft = FeedTemplate::transformProduct($pdo, $tenant, $channel, $normalized);
        return self::jsonRes($res, [
            'ok' => true,
            'validation' => ['ok' => $policy['ok'], 'findings' => $policy['findings']],
            'normalized_payload' => $ft['product'],
            'feed_template' => ['applied' => $ft['applied'], 'mapped' => $ft['mapped'], 'errors' => $ft['errors'], 'warnings' => $ft['warnings']],
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
        $payload = (array)($body['payload'] ?? []);
        // [282차 R2 MED] 승인 블랙홀 근본수정 — 종전엔 `catalog_writeback_approval` 테이블에만 기록했는데 이 테이블은
        //   어떤 SELECT/승인 코드도 읽지 않는 고아였다(실 승인 워크플로 SSOT = catalog_writeback_job status='pending_approval',
        //   목록 jobs()·승인 approveQueue()가 이걸 소비). 그래서 "승인 필요" writeback 이 성공표시+안내까지 나오나
        //   어느 화면에도 안 뜨고 승인·집행 영구 불가였다. SSOT 잡 테이블에 pending_approval 로 적재해 목록/승인 정상화.
        $operation = (string)($payload['operation'] ?? ($type === 'writeback' ? 'publish' : $type));
        if ($channel === '' || $sku === '') return self::jsonRes($res, ['ok' => false, 'error' => 'channel/sku required'], 400);
        $id = self::logJob($pdo, $tenant, $channel, $sku, $operation, 'pending_approval', $payload);
        if ($id <= 0) return self::jsonRes($res, ['ok' => false, 'error' => 'approval_enqueue_failed'], 500);
        return self::jsonRes($res, ['ok' => true, 'approval_id' => $id, 'job_id' => $id, 'status' => 'pending_approval', 'type' => $type]);
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
