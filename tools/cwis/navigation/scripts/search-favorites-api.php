<?php
declare(strict_types=1);

/**
 * CWIS-P004-U04-WS01-SP01-TK001-ST05 — Favorites Route & API Search.
 *
 * ★교차검증(명세 검색경로 vs 실측): 명세가 지정한 12개 경로 중 **10개가 부재**다.
 *   routes/ · routes/api.php · routes/web.php · app/Http/ · app/Controllers/ ·
 *   app/Http/Controllers/ · src/Controller/ · modules/ · packages/ · plugins/ ·
 *   docs/api/ · openapi/ · swagger/  →  전부 없음.
 *   실제 API 표면 = `backend/src/routes.php`(문자열 맵) + `backend/src/Handlers/**`(103 클래스) +
 *   `backend/public/index.php`(인라인 미들웨어).
 *
 * ★Laravel 개념 부재 실측: `Route::` 0건 · `extends FormRequest` 0건 · `JsonResource` 0건 ·
 *   `@OA\` 어노테이션 0건 · 활성 OpenAPI/Swagger 파일 0건(legacy_v338_pkg 아카이브에만 존재 = scope 제외).
 *   → Controller/Request/Response/OpenAPI 인벤토리는 **부재를 사유와 함께 기록**한다(빈 배열로 침묵하지 않음).
 *
 * ★부가가치(ST04 라우트 스캔과의 차이): 즐겨찾기 API 가 0건임을 재확인하는 데 그치지 않고,
 *   **신규 즐겨찾기 API 가 반드시 통과해야 하는 실제 미들웨어·인가·레이트리밋 계약**을 인벤토리화한다.
 *   이것이 Part004-04 구현의 통합 계약이 된다(ST10 입력).
 *
 * ★안전: 대상 실행 0(include/eval 없음) · DB/네트워크 0 · 출력은 output/ 하위 강제.
 *
 * 사용: php tools/cwis/navigation/scripts/search-favorites-api.php [--dry-run]
 * 종료코드: 0=정상, 2=설정 오류.
 */

const SPEC_ID = 'CWIS-P004-U04-WS01-SP01-TK001-ST05';
const MAX_TEXT = 300;

$argvv = $argv; array_shift($argvv);
$opt = static function (string $n, ?string $d = null) use ($argvv): ?string {
    foreach ($argvv as $a) {
        if ($a === "--$n") return '1';
        if (str_starts_with($a, "--$n=")) return substr($a, strlen($n) + 3);
    }
    return $d;
};
$ROOT = realpath(__DIR__ . '/../../../..');
if ($ROOT === false || !is_dir($ROOT . '/backend')) { fwrite(STDERR, "[ST05] 루트 탐지 실패\n"); exit(2); }

$O = 'tools/cwis/navigation/output/';
$out = [
    'raw'        => $O . 'favorites-api-raw-results.json',
    'route'      => $O . 'favorites-route-inventory.json',
    'controller' => $O . 'favorites-controller-inventory.json',
    'request'    => $O . 'favorites-request-inventory.json',
    'response'   => $O . 'favorites-response-inventory.json',
    'middleware' => $O . 'favorites-middleware-inventory.json',
    'openapi'    => $O . 'favorites-openapi-inventory.json',
];
$safeOut = static function (string $rel) use ($ROOT): string {
    $n = str_replace('\\', '/', $rel);
    if (!str_starts_with($n, 'tools/cwis/navigation/output/') || str_contains($n, '..')) {
        fwrite(STDERR, "[ST05] 허용되지 않는 출력 경로: $rel\n"); exit(2);
    }
    return $ROOT . '/' . $n;
};

/* ── 경로 실재 판정(명세 검색 대상) ────────────────────────────────────── */
$specPaths = ['routes', 'routes/api.php', 'routes/web.php', 'routes/admin.php', 'app/Http',
    'app/Controllers', 'app/Http/Controllers', 'src/Controller', 'modules', 'packages', 'plugins',
    'docs/api', 'openapi', 'swagger'];
$pathStatus = [];
foreach ($specPaths as $p) $pathStatus[$p] = file_exists($ROOT . '/' . $p) ? 'EXISTS' : 'ABSENT';

$actualPaths = ['backend/src/routes.php', 'backend/src/Handlers', 'backend/public/index.php', 'config'];
$actualStatus = [];
foreach ($actualPaths as $p) $actualStatus[$p] = file_exists($ROOT . '/' . $p) ? 'EXISTS' : 'ABSENT';

/** 즐겨찾기 관련 URI/식별자 패턴 — 짧은 어휘는 단어 경계 강제(ST02 교훈). */
$FAV_URI_RE = '#/(favou?rites?|bookmarks?|saved(?:[-_]items?)?|pinned[-_]?items?|pins?|star|unstar|unfavou?rite|unbookmark)(?:/|$|\{)#i';
$FAV_SYM_RE = '/(Favou?rite|Bookmark|PinnedItem|SavedItem)[A-Za-z0-9_]*(Controller|Handler|Request|Resource|Policy)?/';
$FAV_ACTION_RE = '/\b(toggleFavou?rite|unfavou?rite|favou?rite|unbookmark|bookmark|unpin|pinItem|bulkFavou?rite|bulkRemoveFavou?rite)\b/i';

/**
 * ★DIRECT vs RELATED 분리 — ST04↔ST05 불일치 정정.
 *
 * ST04 는 'saved[-_]items?'(접미사 필수)만 봐서 0건이었고, ST05 는 명세 §Route 검색 키워드가
 * 'saved' 를 **단독 등재**했으므로 넓게 잡아 `/reports/saved` 3건을 포착했다. 후자가 명세에 충실하다.
 * 다만 `/reports/saved` 는 **BI 리포트 정의 저장**이지 즐겨찾기가 아니므로 RELATED 로 분류한다
 * (그럼에도 ST04 가 지목한 선례 테이블 `saved_report` 의 CRUD 계약이라 재사용 분석 가치는 높다).
 */
$FAV_DIRECT_URI_RE = '#/(favou?rites?|bookmarks?|pinned[-_]?items?|saved[-_]items?|unfavou?rite|unbookmark|unstar)(?:/|$|\{)#i';

$clip = static fn(string $s): string =>
    (mb_strlen($t = str_replace(["\r", "\n", "\t"], ['\\r', '\\n', '\\t'], trim($s))) > MAX_TEXT)
        ? mb_substr($t, 0, MAX_TEXT) . '…' : $t;

$maskCount = 0;
$mask = static function (string $s) use (&$maskCount): string {
    $o = $s;
    foreach ([
        '/(Authorization\s*[:=]\s*)\S+/i', '/(Bearer\s+)[A-Za-z0-9._-]{8,}/i',
        '/(Cookie\s*[:=]\s*)\S+/i', '/(client_secret|api_secret|access_token|jwt)\s*[=:]\s*\S+/i',
        '/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/',
    ] as $re) { $n = preg_replace($re, '[REDACTED]', $o); if ($n !== null && $n !== $o) { $maskCount++; $o = $n; } }
    return $o;
};

$raw = []; $rawSeq = 0;
$addRaw = static function (array $r) use (&$raw, &$rawSeq): void {
    $raw[] = array_merge(['result_id' => sprintf('FAV-API-RAW-%06d', ++$rawSeq)], $r);
};

/* ══════════════════════════════════════════════════════════════════════════
 * 1. Route 인벤토리 — routes.php 의 $custom 문자열 맵이 정본
 * ══════════════════════════════════════════════════════════════════════════ */
$routes = []; $routeSeq = 0; $totalRoutes = 0; $registeredOnly = 0;
$routesFile = 'backend/src/routes.php';
$rc = is_file($ROOT . '/' . $routesFile) ? (string)file_get_contents($ROOT . '/' . $routesFile) : '';
$rcLines = $rc === '' ? [] : (preg_split('/\R/u', $rc) ?: []);

foreach ($rcLines as $i => $line) {
    if (preg_match("/'(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\S+?)'\s*=>\s*'([^']+)'/", $line, $m)) {
        $totalRoutes++;
        if (!preg_match($FAV_URI_RE, $m[2])) continue;
        [$cls, $act] = array_pad(explode('::', str_replace('\\\\', '\\', $m[3])), 2, null);
        $isDirect = (bool)preg_match($FAV_DIRECT_URI_RE, $m[2]);
        // Slim 버전 프리픽스(/vNNN) 와 /api 별칭 추출
        preg_match('#^(/api)?(/v\d+)?#', $m[2], $pm);
        $routes[] = [
            'route_id' => sprintf('FAV-API-%06d', ++$routeSeq),
            'method' => $m[1], 'uri' => $m[2], 'route_name' => null,
            'controller' => $cls, 'action' => $act,
            'prefix' => trim(($pm[1] ?? '') . ($pm[2] ?? '')) ?: null,
            'api_version' => $pm[2] ?? null,
            'namespace' => $cls !== null && str_contains($cls, '\\') ? substr($cls, 0, strrpos($cls, '\\')) : null,
            'middleware' => ['cors', 'api_key_auth_or_session_bypass', 'rbac', 'rate_limit'],
            'permission' => 'UNKNOWN',
            'relation' => $isDirect ? 'DIRECT_FAVORITES' : 'RELATED_INFRASTRUCTURE',
            'source_file' => $routesFile, 'line_number' => $i + 1, 'confidence' => 'HIGH',
        ];
        $addRaw(['keyword' => $m[2], 'matched_text' => $clip($mask($line)), 'file_path' => $routesFile,
            'line_number' => $i + 1, 'source_type' => 'ROUTE_MAP', 'classification' => $isDirect ? 'POTENTIAL_API_IMPLEMENTATION' : 'POTENTIAL_RELATED_INFRASTRUCTURE']);
    }
    if (preg_match("/\\\$register\(\s*'(GET|POST|PUT|PATCH|DELETE)'\s*,\s*'([^']+)'/", $line, $m2)) {
        $registeredOnly++;
        if (preg_match($FAV_URI_RE, $m2[2])) {
            $addRaw(['keyword' => $m2[2], 'matched_text' => $clip($line), 'file_path' => $routesFile,
                'line_number' => $i + 1, 'source_type' => 'ROUTE_REGISTER', 'classification' => 'POTENTIAL_API_IMPLEMENTATION']);
        }
    }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 2. Controller(= Handler) 인벤토리
 * ══════════════════════════════════════════════════════════════════════════ */
$controllers = []; $handlerFiles = 0; $handlerActionsScanned = 0;
$hDir = $ROOT . '/backend/src/Handlers';
if (is_dir($hDir)) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($hDir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $info) {
        if (!$info->isFile() || strtolower($info->getExtension()) !== 'php') continue;
        $handlerFiles++;
        $rel = str_replace('\\', '/', substr($info->getPathname(), strlen($ROOT) + 1));
        $src = (string)@file_get_contents($info->getPathname());
        if ($src === '') continue;

        // 공개 액션(= Controller Action 등가) 수집
        preg_match_all('/public\s+static\s+function\s+(\w+)\s*\(/', $src, $am);
        $handlerActionsScanned += count($am[1] ?? []);
        $favActions = array_values(array_filter($am[1] ?? [], static fn($a) => (bool)preg_match($FAV_ACTION_RE, $a)));
        $clsIsFav = (bool)preg_match($FAV_SYM_RE, basename($rel, '.php'));
        if ($favActions === [] && !$clsIsFav) continue;

        preg_match('/namespace\s+([^;]+);/', $src, $nm);
        $controllers[] = [
            'controller' => basename($rel, '.php'),
            'namespace' => trim($nm[1] ?? ''),
            'file_path' => $rel,
            'methods' => $favActions,
            'dependencies' => [], 'requests' => [], 'resources' => [],
            'confidence' => 'HIGH',
        ];
        foreach ($favActions as $a) {
            $addRaw(['keyword' => $a, 'matched_text' => $clip('public static function ' . $a . '('),
                'file_path' => $rel, 'line_number' => 0, 'source_type' => 'HANDLER_ACTION',
                'classification' => 'POTENTIAL_API_IMPLEMENTATION']);
        }
    }
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. Middleware 인벤토리 — ★실재하는 체인(신규 API 의 통합 계약)
 * ══════════════════════════════════════════════════════════════════════════ */
$mwFile = 'backend/public/index.php';
$mwSrc = is_file($ROOT . '/' . $mwFile) ? (string)file_get_contents($ROOT . '/' . $mwFile) : '';
$mwLine = static function (string $needle) use ($mwSrc): ?int {
    $p = strpos($mwSrc, $needle);
    if ($p === false) return null;
    return substr_count(substr($mwSrc, 0, $p), "\n") + 1;
};
$middleware = [
    [
        'middleware_name' => 'body_parsing', 'order' => 1, 'parameters' => [],
        'applies_to' => 'ALL', 'source_file' => $mwFile, 'line_number' => $mwLine('addBodyParsingMiddleware'),
        'implementation' => 'Slim addBodyParsingMiddleware()', 'detected' => str_contains($mwSrc, 'addBodyParsingMiddleware'),
    ],
    [
        'middleware_name' => 'cors', 'order' => 2, 'parameters' => ['GENIE_ALLOWED_ORIGINS'],
        'applies_to' => 'ALL', 'source_file' => $mwFile, 'line_number' => $mwLine('$GENIE_ALLOWED_ORIGINS'),
        'implementation' => '인라인 클로저(Laravel 미들웨어 클래스 아님)', 'detected' => str_contains($mwSrc, 'GENIE_ALLOWED_ORIGINS'),
    ],
    [
        'middleware_name' => 'api_key_auth', 'order' => 3,
        'parameters' => ['Authorization: Bearer <key>', '?api_key='],
        'applies_to' => 'public bypass 목록 외 전 라우트', 'source_file' => $mwFile, 'line_number' => $mwLine('api_key'),
        'implementation' => 'SHA-256 해시 조회 후 api_key 테이블 대조. 인라인 클로저',
        'detected' => str_contains($mwSrc, 'api_key'),
        'note' => '★PM 계열(/v425/pm/*)은 세션 토큰 bypass 경로를 사용한다 — 신규 즐겨찾기 API 가 세션 인증을 쓰려면 이 bypass 목록에 등재되어야 한다',
    ],
    [
        'middleware_name' => 'rbac', 'order' => 4,
        'parameters' => ['viewer<connector<analyst<admin', 'scopes: write:*, write:ingest, admin:keys'],
        'applies_to' => '인증된 전 라우트', 'source_file' => $mwFile, 'line_number' => $mwLine('$roleRank'),
        'implementation' => '역할 랭크 + 스코프 배열 검사. 쓰기(POST/PUT/PATCH/DELETE)는 analyst+ 또는 write:*',
        'detected' => str_contains($mwSrc, 'roleRank'),
        'note' => '★즐겨찾기 쓰기 API 는 기본적으로 analyst+ 를 요구하게 된다 — 일반 사용자가 자기 즐겨찾기를 못 만드는 문제가 발생할 수 있어 설계 시 확인 필요',
    ],
    [
        'middleware_name' => 'rate_limit', 'order' => 5,
        'parameters' => ['per api_key', 'per-minute window', 'X-RateLimit-Limit', 'Retry-After'],
        'applies_to' => 'api_key 인증 라우트', 'source_file' => $mwFile, 'line_number' => $mwLine('api_rate_limit'),
        'implementation' => 'api_rate_limit 테이블 upsert(자가치유) · 429 + Retry-After · ★fail-open(가용성 우선)',
        'detected' => str_contains($mwSrc, 'api_rate_limit'),
    ],
    [
        'middleware_name' => 'tenant_injection', 'order' => 6, 'parameters' => ['X-Tenant-Id'],
        'applies_to' => '인증 후 전 라우트', 'source_file' => $mwFile, 'line_number' => $mwLine('X-Tenant-Id'),
        'implementation' => 'auth_key/auth_role/auth_tenant 속성 주입 + X-Tenant-Id 헤더 보강',
        'detected' => str_contains($mwSrc, 'X-Tenant-Id'),
    ],
    [
        'middleware_name' => 'error_middleware', 'order' => 7, 'parameters' => ['displayErrorDetails=false'],
        'applies_to' => 'ALL', 'source_file' => $mwFile, 'line_number' => $mwLine('addErrorMiddleware'),
        'implementation' => 'Slim addErrorMiddleware(false, true, true)', 'detected' => str_contains($mwSrc, 'addErrorMiddleware'),
    ],
];

/* Authorization(도메인 게이트) — 미들웨어 이후 핸들러 레벨 */
$sharedFile = 'backend/src/Handlers/PM/Shared.php';
$sharedSrc = is_file($ROOT . '/' . $sharedFile) ? (string)file_get_contents($ROOT . '/' . $sharedFile) : '';
$authorization = [
    [
        'mechanism' => 'PM\\Shared::gate($req,$resp,$minRole)', 'type' => 'HANDLER_GATE',
        'source_file' => $sharedFile,
        'roles' => ['viewer', 'connector', 'analyst', 'admin'],
        'tenant_isolation' => str_contains($sharedSrc, 'auth_tenant'),
        'external_principal_deny' => str_contains($sharedSrc, 'external_no_resource_access'),
        'note' => '★CWIS Part003 이 guest/partner 를 PM 리소스 전면 Default Deny 로 봉쇄했다. 즐겨찾기 API 가 PM 계열이면 외부 협업자는 자동 차단된다',
    ],
    [
        'mechanism' => 'plan_menu_access + planMenuPolicy(MENU_MIN_PLAN)', 'type' => 'PLAN_GATE',
        'source_file' => 'backend/src/PlanPolicy.php',
        'roles' => ['free', 'starter', 'growth', 'pro', 'enterprise', 'admin'],
        'note' => '메뉴 단위 구독 등급 게이트. 즐겨찾기는 메뉴가 아니라 개인 설정이므로 적용 대상인지 판단 필요',
    ],
];

/* ══════════════════════════════════════════════════════════════════════════
 * 4. 부재 인벤토리 — 빈 배열로 침묵하지 않고 사유를 기록
 * ══════════════════════════════════════════════════════════════════════════ */
$absent = static fn(string $what, string $why, array $evidence): array => [
    'available' => false, 'reason' => 'CONSTRUCT_NOT_PRESENT_IN_STACK',
    'construct' => $what, 'explanation' => $why, 'evidence' => $evidence,
];

$requestInv = $absent(
    'FormRequest / Validation Rule 클래스',
    'Laravel FormRequest 를 사용하지 않는다. 검증은 각 핸들러 메서드 내부에서 수동으로 수행하고 422 를 반환한다.',
    ['grep "extends FormRequest" backend/src → 0건', '핸들러 예: PM\\Collaboration::createInvitation 이 인라인 검증 후 self::json(...,422)']
);
$responseInv = $absent(
    'API Resource / JsonResource',
    'JsonResource·ResourceCollection 을 사용하지 않는다. 응답은 핸들러가 연관배열을 만들어 Shared::json() 으로 직렬화한다(래퍼 봉투 없음).',
    ['grep "JsonResource" backend/src → 0건', 'PM\\Shared::json(Response,$payload,$status) — json_encode 후 Content-Type 지정']
);
$openapiInv = $absent(
    'OpenAPI / Swagger 명세',
    '활성 코드에 OpenAPI/Swagger 파일과 @OA 어노테이션이 없다. legacy_v338_pkg 아카이브에만 과거 openapi_v309.yaml 이 존재하나 scope 제외(읽기 전용 과거 미러)다.',
    ['find openapi*.yaml / swagger*.yaml (scope 내) → 0건', 'grep "@OA\\\\" backend/src → 0건']
);

/* ══════════════════════════════════════════════════════════════════════════
 * 5. Dry Run / 출력
 * ══════════════════════════════════════════════════════════════════════════ */
if ($opt('dry-run') === '1') {
    echo "[ST05 --dry-run]\n";
    echo "  명세 경로 실재 : " . json_encode(array_count_values($pathStatus), JSON_UNESCAPED_UNICODE) . "\n";
    echo "  실제 API 표면  : " . json_encode($actualStatus, JSON_UNESCAPED_UNICODE) . "\n";
    echo "  Route 총계     : $totalRoutes (\$custom 맵)\n";
    echo "  Handler 파일   : $handlerFiles\n";
    echo "  Request/Response/OpenAPI : 스택 부재(사유 기록 예정)\n";
    exit(0);
}

$revision = null;
if (is_file($ROOT . '/.git/HEAD')) {
    $h = trim((string)file_get_contents($ROOT . '/.git/HEAD'));
    if (str_starts_with($h, 'ref: ') && is_file($ROOT . '/.git/' . substr($h, 5))) {
        $revision = substr(trim((string)file_get_contents($ROOT . '/.git/' . substr($h, 5))), 0, 12);
    }
}
$meta = [
    'specification_id' => SPEC_ID,
    'source_revision' => $revision,
    'generated_at' => gmdate('c'),
    'spec_search_paths' => $pathStatus,
    'actual_api_surface' => $actualStatus,
    'stack_facts' => [
        'router' => "backend/src/routes.php — 'METHOD /path' => 'Class::method' 문자열 맵 + \$register() 2블록",
        'laravel_route_facade' => 'ABSENT (Route:: 0건)',
        'form_request' => 'ABSENT (extends FormRequest 0건)',
        'api_resource' => 'ABSENT (JsonResource 0건)',
        'openapi' => 'ABSENT (활성 코드 0건 · legacy 아카이브에만 존재)',
        'middleware_style' => 'index.php 인라인 클로저(미들웨어 클래스 아님)',
        'rate_limit' => 'PRESENT — api_rate_limit 테이블 · per api_key/분 · fail-open',
        'response_envelope' => 'NONE — 핸들러가 만든 배열을 그대로 json_encode',
    ],
    'total_routes_in_map' => $totalRoutes,
    'register_calls' => $registeredOnly,
    'handler_files_scanned' => $handlerFiles,
    'handler_actions_scanned' => $handlerActionsScanned,
    'favorites_routes' => count($routes),
    'favorites_controllers' => count($controllers),
    'matches_found' => count($raw),
    'sensitive_values_masked' => $maskCount,
];

$write = static function (string $rel, array $data) use ($safeOut): void {
    $abs = $safeOut($rel);
    if (!is_dir(dirname($abs))) mkdir(dirname($abs), 0775, true);
    file_put_contents($abs, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    echo "[ST05] 생성: $rel\n";
};

$write($out['raw'], $meta + ['results' => $raw]);
$write($out['route'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'total_routes_in_map' => $totalRoutes, 'route_count' => count($routes),
    'direct_favorites_routes' => count(array_filter($routes, static fn($r) => $r['relation'] === 'DIRECT_FAVORITES')),
    'related_infrastructure_routes' => count(array_filter($routes, static fn($r) => $r['relation'] === 'RELATED_INFRASTRUCTURE')),
    'note' => '라우트 정본은 routes.php 문자열 맵. 즐겨찾기 URI 패턴 매칭 결과.',
    'routes' => $routes]);
$write($out['controller'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'handler_files_scanned' => $handlerFiles, 'handler_actions_scanned' => $handlerActionsScanned,
    'controller_count' => count($controllers),
    'note' => 'Controller 등가물 = backend/src/Handlers/**. public static function 이 Action 에 해당.',
    'controllers' => $controllers]);
$write($out['request'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at']] + $requestInv + ['requests' => []]);
$write($out['response'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at']] + $responseInv + ['responses' => []]);
$write($out['middleware'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at'],
    'available' => true,
    'note' => '★즐겨찾기 API 는 0건이나, 신규 API 가 반드시 통과해야 하는 실제 체인을 기록한다(Part004-04 통합 계약).',
    'middleware_count' => count($middleware), 'middleware' => $middleware,
    'authorization_count' => count($authorization), 'authorization' => $authorization]);
$write($out['openapi'], ['specification_id' => SPEC_ID, 'generated_at' => $meta['generated_at']] + $openapiInv + ['operations' => []]);

printf("[ST05] 라우트맵 %d · 핸들러 %d(액션 %d) · 즐겨찾기 라우트 %d · 즐겨찾기 컨트롤러 %d · 미들웨어 %d · 인가 %d · 매치 %d · 마스킹 %d\n",
    $totalRoutes, $handlerFiles, $handlerActionsScanned, count($routes), count($controllers),
    count($middleware), count($authorization), count($raw), $maskCount);
exit(0);
