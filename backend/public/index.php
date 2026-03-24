<?php
declare(strict_types=1);

// ── 에러 출력 비활성화 (JSON 응답 보호) ─────────────────────────────────────
// display_errors=1이면 PHP 에러 HTML이 JSON 앞에 출력되어 파싱 실패 발생
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);  // 에러는 error_log에만 기록
ini_set('log_errors', '1');
// ─────────────────────────────────────────────────────────────────────────────

use Slim\Factory\AppFactory;
use Genie\Db;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

require __DIR__ . '/../vendor/autoload.php';

date_default_timezone_set('UTC');

// ─────────────────────────────────────────────────────────────────────────────

$app = AppFactory::create();
$app->addBodyParsingMiddleware();

// ── 로컬 개발 환경: htdocs/api Junction으로 서빙 시 basePath 자동 설정 ─────────
// Apache에서 /api/auth/login 요청 시 REQUEST_URI=/api/auth/login 으로 오므로
// Slim이 /api prefix를 제거하고 /auth/login으로 라우팅하도록 설정
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$requestUri  = $_SERVER['REQUEST_URI'] ?? '';
// /api/로 시작하는 경우에만 basePath 적용
if (strpos($requestUri, '/api/') === 0 || $requestUri === '/api') {
    $app->setBasePath('/api');
}

// ── CORS ─────────────────────────────────────────────────────────────────────
$app->add(function (Request $request, $handler) {
    if ($request->getMethod() === 'OPTIONS') {
        $response = new \Slim\Psr7\Response();
        return $response
            ->withStatus(204)
            ->withHeader('Access-Control-Allow-Origin', '*')
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Id, Authorization')
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
            ->withHeader('Access-Control-Max-Age', '3600');
    }
    $response = $handler->handle($request);
    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-Id, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// ── v421 API Key Auth + RBAC (inlined for PHP compatibility) ─────────────────
$app->add(function (Request $request, $handler) {
    $path = $request->getUri()->getPath();

    // Public paths — no API key required
    // Note: when using Alias /api, REQUEST_URI is /api/auth/login (not /auth/login)
    if ($path === '/'
        || preg_match('#^/v\d+[\w.]*/health[z]?$#', $path)
        || strpos($path, '/auth/') === 0
        || $path === '/auth'
        || strpos($path, '/api/auth/') === 0
        || $path === '/api/auth'
        || strpos($path, '/v423/rollup/') === 0
        || strpos($path, '/v420/price/') === 0
        || strpos($path, '/v420/channel-mix/') === 0
        || strpos($path, '/v422/ai/') === 0
        // Paddle Billing v2 — public (webhook is self-signed via HMAC, others are product catalog)
        || $path === '/v423/paddle/webhook'
        || $path === '/v423/paddle/plans'
        || $path === '/v423/paddle/config'
        || $path === '/v423/paddle/migrate'
    ) {
        return $handler->handle($request);
    }

    // Extract Bearer token or ?api_key=
    $rawKey = '';
    $authHeader = $request->getHeaderLine('Authorization');
    if (strpos($authHeader, 'Bearer ') === 0) {
        $rawKey = trim(substr($authHeader, 7));
    }
    if ($rawKey === '') {
        $params = $request->getQueryParams();
        $rawKey = isset($params['api_key']) ? (string)$params['api_key'] : '';
    }

    $makeJson = function ($status, $data) {
        $body = json_encode($data, JSON_UNESCAPED_UNICODE);
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write($body);
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    };

    if ($rawKey === '') {
        return $makeJson(401, [
            'error'  => 'Unauthorized',
            'detail' => 'API key required. Pass Authorization: Bearer <key> or ?api_key=<key>',
        ]);
    }

    $keyHash = hash('sha256', $rawKey);
    $keyRow  = null;
    try {
        $pdo  = Db::pdo();
        $stmt = $pdo->prepare('SELECT * FROM api_key WHERE key_hash = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$keyHash]);
        $keyRow = $stmt->fetch(\PDO::FETCH_ASSOC);
    } catch (\Exception $ex) {
        return $makeJson(401, ['error' => 'Unauthorized', 'detail' => 'Auth backend error: ' . $ex->getMessage()]);
    }

    if (!$keyRow) {
        return $makeJson(401, ['error' => 'Unauthorized', 'detail' => 'Invalid or inactive API key']);
    }

    if (!empty($keyRow['expires_at']) && strtotime($keyRow['expires_at']) < time()) {
        return $makeJson(401, ['error' => 'Unauthorized', 'detail' => 'API key has expired']);
    }

    // best-effort update last_used_at
    try {
        $pdo->prepare('UPDATE api_key SET last_used_at=? WHERE id=?')->execute([gmdate('c'), $keyRow['id']]);
    } catch (\Exception $ex2) { /* non-fatal */ }

    // RBAC
    $roleRank = ['viewer' => 0, 'connector' => 1, 'analyst' => 2, 'admin' => 3];
    $method   = strtoupper($request->getMethod());
    $role     = isset($keyRow['role']) ? (string)$keyRow['role'] : 'viewer';
    $rank     = isset($roleRank[$role]) ? $roleRank[$role] : 0;
    $scopes   = json_decode(isset($keyRow['scopes_json']) ? (string)$keyRow['scopes_json'] : '[]', true);
    if (!is_array($scopes)) { $scopes = []; }

    // admin:keys routes need admin:keys scope
    if (strpos($path, '/v421/keys') === 0) {
        if (!in_array('admin:keys', $scopes, true) && $rank < 3) {
            return $makeJson(403, ['error' => 'Forbidden', 'detail' => 'Scope admin:keys required']);
        }
    } elseif (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        // Write access
        if (!in_array('write:*', $scopes, true)) {
            if (preg_match('#/ingest|/settle/ingest#', $path)) {
                if (!in_array('write:ingest', $scopes, true) && $rank < 1) {
                    return $makeJson(403, ['error' => 'Forbidden', 'detail' => 'write:ingest or connector+ required']);
                }
            } elseif ($rank < 2) {
                return $makeJson(403, ['error' => 'Forbidden', 'detail' => 'Write access requires analyst role or write:* scope']);
            }
        }
    }

    // Attach auth context to request
    $request = $request
        ->withAttribute('auth_key',    $keyRow)
        ->withAttribute('auth_role',   $role)
        ->withAttribute('auth_tenant', (string)$keyRow['tenant_id']);

    if ($request->getHeaderLine('X-Tenant-Id') === '') {
        $request = $request->withHeader('X-Tenant-Id', (string)$keyRow['tenant_id']);
    }

    return $handler->handle($request);
});

// Health root (public)
$app->get('/', function (Request $request, Response $response) {
    $payload = [
        'name'   => 'GENIE ROI PHP API',
        'status' => 'ok',
        'ts'     => gmdate('c'),
        'auth'   => 'API Key required for all routes (except / and /health)',
        'demo_keys' => [
            'admin'   => 'genie_live_demo_key_00000000',
            'analyst' => 'genie_read_demo_key_11111111',
        ],
    ];
    $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
    return $response->withHeader('Content-Type', 'application/json');
});

$routes = require __DIR__ . '/../src/routes.php';
$routes($app);

// ── Slim Error Middleware (JSON 형식으로 에러 반환) ────────────────────────────
$errorMiddleware = $app->addErrorMiddleware(false, true, true);
$errorMiddleware->setDefaultErrorHandler(function (
    \Psr\Http\Message\ServerRequestInterface $request,
    \Throwable $exception,
    bool $displayErrorDetails,
    bool $logErrors,
    bool $logErrorDetails
) use ($app) {
    $statusCode = 500;
    if ($exception instanceof \Slim\Exception\HttpException) {
        $statusCode = $exception->getCode();
    }
    if ($logErrors) {
        error_log('[Slim] ' . $exception->getMessage() . ' in ' . $exception->getFile() . ':' . $exception->getLine());
    }
    $payload = [
        'ok'    => false,
        'error' => '서버 오류가 발생했습니다.',
        'detail' => $exception->getMessage(),
        'trace' => $exception->getFile() . ':' . $exception->getLine(),
    ];
    $response = $app->getResponseFactory()->createResponse();
    $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
    return $response
        ->withStatus($statusCode)
        ->withHeader('Content-Type', 'application/json')
        ->withHeader('Access-Control-Allow-Origin', '*');
});

$app->run();
